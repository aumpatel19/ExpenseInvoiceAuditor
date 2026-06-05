import csv
import io
import time
import logging
import uuid
from datetime import datetime, timezone
from typing import Optional, List

from fastapi import APIRouter, UploadFile, File, HTTPException, BackgroundTasks, Query, Depends
from fastapi.responses import StreamingResponse

from auth import get_current_user
from config import settings
from db.mongo import documents_col, extracted_payloads_col, audit_results_col, users_col
from schemas.document import (
    DocumentRecord, DocumentStatus, UploadResponse, DocumentListItem
)
from schemas.audit import AuditResult, AuditStatus
from services.ocr.factory import get_ocr_provider
from services.ocr.base import OCRExtractionError
from services.extraction.extractor import extract_from_text
from services.validation.validator import validate_document
from services.audit.rule_engine import run_rule_checks
from services.llm.llm_audit import run_llm_checks
from services.storage.file_store import save_file, load_file
from services.email.sender import send_audit_complete
from utils.logger import log_stage

logger = logging.getLogger(__name__)
router = APIRouter()

ALLOWED_MIME_TYPES = {"application/pdf", "image/png", "image/jpeg", "image/jpg"}
MAX_BATCH_FILES = 10


def _now() -> datetime:
    return datetime.now(timezone.utc)


async def _set_status(document_id: str, status: DocumentStatus, error: Optional[str] = None) -> None:
    update = {"status": status.value, "updated_at": _now()}
    if error:
        update["error_message"] = error
    await documents_col().update_one({"id": document_id}, {"$set": update})


async def _get_user_email(username: str) -> Optional[str]:
    user = await users_col().find_one({"username": username}, {"_id": 0, "email": 1})
    return user.get("email") if user else None


async def process_document_pipeline(
    document_id: str, file_bytes: bytes, mime_type: str, username: str
) -> None:
    start_time = time.time()
    filename = document_id

    try:
        doc_record = await documents_col().find_one({"id": document_id}, {"filename": 1})
        if doc_record:
            filename = doc_record.get("filename", document_id)

        # ── OCR ──────────────────────────────────────────────────────────────
        await _set_status(document_id, DocumentStatus.processing)
        await log_stage(document_id, "ocr", "running", "Starting OCR extraction.")

        try:
            ocr = get_ocr_provider()
            raw_text = ocr.extract_text(file_bytes, mime_type)
            await log_stage(document_id, "ocr", "success", f"Extracted {len(raw_text)} characters.")
        except OCRExtractionError as e:
            await _set_status(document_id, DocumentStatus.error, str(e))
            await log_stage(document_id, "ocr", "error", str(e))
            email = await _get_user_email(username)
            if email:
                await send_audit_complete(email, document_id, filename, "error")
            return

        # ── Extraction ───────────────────────────────────────────────────────
        result = await extract_from_text(raw_text, document_id, max_retries=3)

        if result.document is None:
            await _set_status(document_id, DocumentStatus.validation_failed, "Extraction failed after retries.")
            await log_stage(document_id, "extraction", "failed", "Extraction exhausted retries.", {"errors": result.errors})
            email = await _get_user_email(username)
            if email:
                await send_audit_complete(email, document_id, filename, "validation_failed")
            return

        doc = result.document
        await documents_col().update_one(
            {"id": document_id},
            {"$set": {
                "status": DocumentStatus.extracted.value,
                "document_type": doc.document_type.value,
                "vendor_name": doc.vendor_name,
                "total_amount": doc.total_amount,
                "currency": doc.currency,
                "invoice_date": str(doc.invoice_date) if doc.invoice_date else None,
                "updated_at": _now(),
            }}
        )
        await extracted_payloads_col().replace_one(
            {"document_id": document_id},
            {**doc.model_dump(mode="json"), "document_id": document_id},
            upsert=True,
        )

        # ── Validation ───────────────────────────────────────────────────────
        is_valid, val_report = validate_document(document_id, doc.model_dump(mode="json"))
        await log_stage(
            document_id, "validation",
            "success" if is_valid else "failed",
            f"Validation {'passed' if is_valid else 'failed'}.",
            {"errors": val_report.errors},
        )

        if not is_valid and not val_report.is_recoverable:
            await _set_status(document_id, DocumentStatus.validation_failed, "; ".join(val_report.errors))
            email = await _get_user_email(username)
            if email:
                await send_audit_complete(email, document_id, filename, "validation_failed")
            return

        # ── Deterministic Audit Rules ─────────────────────────────────────────
        await log_stage(document_id, "audit", "running", "Running deterministic rule checks.")
        rule_findings = await run_rule_checks(document_id, doc)

        # ── LLM Audit ────────────────────────────────────────────────────────
        llm_findings = []
        llm_used = False
        if settings.llm_enabled:
            await log_stage(document_id, "llm", "running", "Running LLM-assisted checks.")
            llm_findings = await run_llm_checks(document_id, doc, raw_text)
            llm_used = True
            await log_stage(document_id, "llm", "done", f"{len(llm_findings)} LLM findings.")

        # ── Compute Audit Status ──────────────────────────────────────────────
        all_findings = rule_findings + llm_findings
        high_count = sum(1 for f in all_findings if f.severity.value == "high")
        medium_count = sum(1 for f in all_findings if f.severity.value == "medium")

        if high_count > 0:
            overall_status = AuditStatus.flagged
            doc_status = DocumentStatus.needs_review
        elif medium_count > 1:
            overall_status = AuditStatus.needs_manual_review
            doc_status = DocumentStatus.needs_review
        elif all_findings:
            overall_status = AuditStatus.needs_manual_review
            doc_status = DocumentStatus.needs_review
        else:
            overall_status = AuditStatus.approved
            doc_status = DocumentStatus.audited

        confidence = min(1.0, doc.extraction_confidence + (0.1 if not all_findings else 0.0))
        elapsed_ms = (time.time() - start_time) * 1000

        audit = AuditResult(
            document_id=document_id,
            overall_status=overall_status,
            confidence=confidence,
            findings=all_findings,
            extracted_snapshot=doc.model_dump(mode="json"),
            validation_errors=val_report.errors,
            llm_used=llm_used,
            processing_time_ms=round(elapsed_ms, 1),
        )
        await audit_results_col().replace_one(
            {"document_id": document_id},
            audit.model_dump(mode="json"),
            upsert=True,
        )
        await _set_status(document_id, doc_status)
        await log_stage(document_id, "audit", "done", f"Audit complete: {overall_status.value}.")

        # ── Email Notification ────────────────────────────────────────────────
        email = await _get_user_email(username)
        if email:
            await send_audit_complete(email, document_id, filename, doc_status.value, len(all_findings))

    except Exception as e:
        logger.exception(f"[Pipeline] Unexpected error for document {document_id}: {e}")
        await _set_status(document_id, DocumentStatus.error, str(e))
        await log_stage(document_id, "pipeline", "error", str(e))


# ─── Endpoints ──────────────────────────────────────────────────────────────────

@router.post("/documents/upload", response_model=UploadResponse)
async def upload_document(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    current_user: dict = Depends(get_current_user),
):
    content_type: str = file.content_type or "application/octet-stream"
    filename: str = file.filename or "upload"

    if content_type not in ALLOWED_MIME_TYPES:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported file type: {content_type}. Allowed: PDF, PNG, JPG."
        )

    file_bytes = await file.read()
    if len(file_bytes) > settings.max_upload_bytes:
        raise HTTPException(
            status_code=413,
            detail=f"File too large. Maximum allowed: {settings.max_upload_mb}MB."
        )

    document_id = str(uuid.uuid4())
    record = DocumentRecord(
        id=document_id,
        filename=filename,
        file_size_bytes=len(file_bytes),
        mime_type=content_type,
    )
    doc_dict = record.model_dump(mode="json")
    doc_dict["username"] = current_user["username"]

    await documents_col().insert_one(doc_dict)
    await save_file(document_id, current_user["username"], file_bytes, content_type)
    await log_stage(document_id, "upload", "success", f"File '{filename}' uploaded ({len(file_bytes)} bytes).")

    background_tasks.add_task(
        process_document_pipeline, document_id, file_bytes, content_type, current_user["username"]
    )

    return UploadResponse(
        document_id=document_id,
        filename=filename,
        status=DocumentStatus.uploaded,
        message="File uploaded successfully. Processing started.",
    )


@router.post("/documents/upload-batch")
async def upload_documents_batch(
    background_tasks: BackgroundTasks,
    files: List[UploadFile] = File(...),
    current_user: dict = Depends(get_current_user),
):
    if len(files) > MAX_BATCH_FILES:
        raise HTTPException(status_code=400, detail=f"Maximum {MAX_BATCH_FILES} files per batch upload.")

    results = []
    for file in files:
        content_type: str = file.content_type or "application/octet-stream"
        filename: str = file.filename or "upload"

        if content_type not in ALLOWED_MIME_TYPES:
            results.append({
                "filename": filename,
                "document_id": None,
                "status": "error",
                "error": f"Unsupported type: {content_type}. Use PDF, PNG, or JPG.",
            })
            continue

        file_bytes = await file.read()
        if len(file_bytes) > settings.max_upload_bytes:
            results.append({
                "filename": filename,
                "document_id": None,
                "status": "error",
                "error": f"File too large (max {settings.max_upload_mb}MB).",
            })
            continue

        document_id = str(uuid.uuid4())
        record = DocumentRecord(
            id=document_id,
            filename=filename,
            file_size_bytes=len(file_bytes),
            mime_type=content_type,
        )
        doc_dict = record.model_dump(mode="json")
        doc_dict["username"] = current_user["username"]

        await documents_col().insert_one(doc_dict)
        await save_file(document_id, current_user["username"], file_bytes, content_type)
        await log_stage(document_id, "upload", "success", f"File '{filename}' uploaded ({len(file_bytes)} bytes).")

        background_tasks.add_task(
            process_document_pipeline, document_id, file_bytes, content_type, current_user["username"]
        )
        results.append({
            "filename": filename,
            "document_id": document_id,
            "status": "uploaded",
            "error": None,
        })

    return {"documents": results}


@router.get("/documents/export")
async def export_documents_csv(
    status: Optional[str] = Query(None),
    current_user: dict = Depends(get_current_user),
):
    query: dict = {"username": current_user["username"]}
    if status:
        query["status"] = status

    cursor = documents_col().find(query, {"_id": 0}).sort("created_at", -1).limit(5000)
    docs = await cursor.to_list(length=5000)

    doc_ids = [d["id"] for d in docs]
    audits: dict = {}
    if doc_ids:
        audit_cursor = audit_results_col().find(
            {"document_id": {"$in": doc_ids}},
            {"_id": 0, "document_id": 1, "overall_status": 1, "confidence": 1, "findings": 1},
        )
        async for a in audit_cursor:
            audits[a["document_id"]] = a

    output = io.StringIO()
    writer = csv.DictWriter(output, fieldnames=[
        "document_id", "filename", "status", "document_type", "vendor_name",
        "total_amount", "currency", "invoice_date", "audit_status", "confidence",
        "findings_count", "uploaded_at",
    ])
    writer.writeheader()

    for doc in docs:
        audit = audits.get(doc["id"], {})
        conf = audit.get("confidence")
        writer.writerow({
            "document_id": doc["id"],
            "filename": doc.get("filename", ""),
            "status": doc.get("status", ""),
            "document_type": doc.get("document_type", ""),
            "vendor_name": doc.get("vendor_name", ""),
            "total_amount": doc.get("total_amount", ""),
            "currency": doc.get("currency", ""),
            "invoice_date": doc.get("invoice_date", ""),
            "audit_status": audit.get("overall_status", ""),
            "confidence": f"{conf:.2f}" if conf is not None else "",
            "findings_count": len(audit.get("findings", [])),
            "uploaded_at": doc.get("created_at", ""),
        })

    output.seek(0)
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=documents_export.csv"},
    )


@router.get("/documents", response_model=List[DocumentListItem])
async def list_documents(
    status: Optional[str] = Query(None),
    vendor: Optional[str] = Query(None),
    document_type: Optional[str] = Query(None),
    limit: int = Query(20, le=200),
    skip: int = Query(0, ge=0),
    current_user: dict = Depends(get_current_user),
):
    query: dict = {"username": current_user["username"]}
    if status:
        query["status"] = status
    if vendor:
        query["vendor_name"] = {"$regex": vendor, "$options": "i"}
    if document_type:
        query["document_type"] = document_type

    cursor = documents_col().find(query, {"_id": 0}).sort("created_at", -1).skip(skip).limit(limit)
    docs = await cursor.to_list(length=limit)
    return [DocumentListItem(**d) for d in docs]


@router.get("/documents/{document_id}/status")
async def get_document_status(document_id: str, current_user: dict = Depends(get_current_user)):
    doc = await documents_col().find_one(
        {"id": document_id, "username": current_user["username"]},
        {"_id": 0, "status": 1, "updated_at": 1},
    )
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found.")
    return {"status": doc["status"], "updated_at": doc.get("updated_at")}


@router.get("/documents/{document_id}")
async def get_document(document_id: str, current_user: dict = Depends(get_current_user)):
    doc = await documents_col().find_one(
        {"id": document_id, "username": current_user["username"]}, {"_id": 0}
    )
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found.")

    extracted = await extracted_payloads_col().find_one({"document_id": document_id}, {"_id": 0})
    audit = await audit_results_col().find_one({"document_id": document_id}, {"_id": 0})

    from utils.logger import get_logs
    logs = await get_logs(document_id)

    return {
        "document": doc,
        "extracted_payload": extracted,
        "audit_result": audit,
        "processing_logs": logs,
    }


@router.post("/documents/{document_id}/process")
async def reprocess_document(
    document_id: str,
    background_tasks: BackgroundTasks,
    current_user: dict = Depends(get_current_user),
):
    doc = await documents_col().find_one(
        {"id": document_id, "username": current_user["username"]}, {"_id": 0}
    )
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found.")

    file_bytes, mime_type = await load_file(document_id)
    if file_bytes is None or mime_type is None:
        raise HTTPException(status_code=422, detail="Original file not found. Cannot reprocess.")

    await _set_status(document_id, DocumentStatus.uploaded)
    await log_stage(document_id, "reprocess", "queued", "Manual reprocess triggered.")
    background_tasks.add_task(
        process_document_pipeline, document_id, file_bytes, mime_type, current_user["username"]
    )
    return {"message": "Reprocessing started.", "document_id": document_id}


@router.get("/documents/{document_id}/audit")
async def get_audit_result(document_id: str, current_user: dict = Depends(get_current_user)):
    doc = await documents_col().find_one(
        {"id": document_id, "username": current_user["username"]}, {"_id": 0}
    )
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found.")

    audit = await audit_results_col().find_one({"document_id": document_id}, {"_id": 0})
    if not audit:
        raise HTTPException(status_code=404, detail="Audit result not found.")
    return audit
