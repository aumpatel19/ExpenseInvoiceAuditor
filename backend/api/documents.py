import time
import logging
import uuid
from datetime import datetime
from typing import Optional, List

from fastapi import APIRouter, UploadFile, File, HTTPException, BackgroundTasks, Query
from fastapi.responses import JSONResponse

from config import settings
from db.mongo import documents_col, extracted_payloads_col, audit_results_col
from schemas.document import (
    DocumentRecord, DocumentStatus, UploadResponse, DocumentListItem
)
from schemas.audit import AuditResult, AuditStatus, ProcessingLogEntry
from services.ocr.factory import get_ocr_provider
from services.ocr.base import OCRExtractionError
from services.extraction.extractor import extract_from_text
from services.validation.validator import validate_document
from services.audit.rule_engine import run_rule_checks
from services.llm.llm_audit import run_llm_checks
from utils.logger import log_stage

logger = logging.getLogger(__name__)
router = APIRouter()

ALLOWED_MIME_TYPES = {"application/pdf", "image/png", "image/jpeg", "image/jpg"}


async def _set_status(document_id: str, status: DocumentStatus, error: str = None):
    update = {"status": status.value, "updated_at": datetime.utcnow()}
    if error:
        update["error_message"] = error
    await documents_col().update_one({"id": document_id}, {"$set": update})


async def process_document_pipeline(document_id: str, file_bytes: bytes, mime_type: str):
    """
    Full async pipeline: OCR → Extract → Validate → Audit.
    Runs in background after upload.
    """
    start_time = time.time()

    try:
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
            return

        # ── Extraction ───────────────────────────────────────────────────────
        result = await extract_from_text(raw_text, document_id, max_retries=3)

        if result.document is None:
            await _set_status(document_id, DocumentStatus.validation_failed, "Extraction failed after retries.")
            await log_stage(document_id, "extraction", "failed", "Extraction exhausted retries.", {"errors": result.errors})
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
                "updated_at": datetime.utcnow(),
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

    except Exception as e:
        logger.exception(f"[Pipeline] Unexpected error for document {document_id}: {e}")
        await _set_status(document_id, DocumentStatus.error, str(e))
        await log_stage(document_id, "pipeline", "error", str(e))


# ─── Endpoints ──────────────────────────────────────────────────────────────────

@router.post("/documents/upload", response_model=UploadResponse)
async def upload_document(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
):
    # Validate MIME type
    if file.content_type not in ALLOWED_MIME_TYPES:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported file type: {file.content_type}. Allowed: PDF, PNG, JPG."
        )

    file_bytes = await file.read()

    # Validate file size
    if len(file_bytes) > settings.max_upload_bytes:
        raise HTTPException(
            status_code=413,
            detail=f"File too large. Maximum allowed: {settings.max_upload_mb}MB."
        )

    document_id = str(uuid.uuid4())
    record = DocumentRecord(
        id=document_id,
        filename=file.filename,
        file_size_bytes=len(file_bytes),
        mime_type=file.content_type,
    )
    await documents_col().insert_one(record.model_dump(mode="json"))
    await log_stage(document_id, "upload", "success", f"File '{file.filename}' uploaded ({len(file_bytes)} bytes).")

    # Start pipeline in background
    background_tasks.add_task(process_document_pipeline, document_id, file_bytes, file.content_type)

    return UploadResponse(
        document_id=document_id,
        filename=file.filename,
        status=DocumentStatus.uploaded,
        message="File uploaded successfully. Processing started.",
    )


@router.get("/documents", response_model=List[DocumentListItem])
async def list_documents(
    status: Optional[str] = Query(None),
    vendor: Optional[str] = Query(None),
    document_type: Optional[str] = Query(None),
    limit: int = Query(50, le=200),
    skip: int = Query(0, ge=0),
):
    query = {}
    if status:
        query["status"] = status
    if vendor:
        query["vendor_name"] = {"$regex": vendor, "$options": "i"}
    if document_type:
        query["document_type"] = document_type

    cursor = documents_col().find(query, {"_id": 0}).sort("created_at", -1).skip(skip).limit(limit)
    docs = await cursor.to_list(length=limit)
    return [DocumentListItem(**d) for d in docs]


@router.get("/documents/{document_id}")
async def get_document(document_id: str):
    doc = await documents_col().find_one({"id": document_id}, {"_id": 0})
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
async def reprocess_document(document_id: str, background_tasks: BackgroundTasks):
    doc = await documents_col().find_one({"id": document_id}, {"_id": 0})
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found.")

    # We don't store file bytes in mongo — this endpoint is a status reset trigger
    # In a production system, file bytes would be stored in S3 or similar
    await _set_status(document_id, DocumentStatus.processing)
    await log_stage(document_id, "reprocess", "queued", "Manual reprocess triggered.")
    return {"message": "Reprocessing queued.", "document_id": document_id}


@router.get("/documents/{document_id}/audit")
async def get_audit_result(document_id: str):
    audit = await audit_results_col().find_one({"document_id": document_id}, {"_id": 0})
    if not audit:
        raise HTTPException(status_code=404, detail="Audit result not found.")
    return audit
