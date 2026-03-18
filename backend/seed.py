"""
Seed script — run once to populate MongoDB with demo documents, extracted payloads,
audit results, ground truth samples, and policy rules.

Usage:
    cd backend
    python seed.py
"""
import asyncio
import uuid
from datetime import datetime, date, timedelta, timezone

from motor.motor_asyncio import AsyncIOMotorClient
from config import settings


async def seed():
    client = AsyncIOMotorClient(settings.mongo_uri)
    db = client[settings.db_name]

    print(f"[Seed] Connected to MongoDB: {settings.db_name}")

    # ── Clear existing seed data ───────────────────────────────────────────────
    for col in ["documents", "extracted_payloads", "audit_results", "ground_truth_samples", "policy_rules", "processing_logs"]:
        await db[col].delete_many({})
    print("[Seed] Cleared existing collections.")

    today = date.today()
    yesterday = today - timedelta(days=1)
    last_saturday = today - timedelta(days=(today.weekday() + 2) % 7 or 7)
    next_month = today + timedelta(days=35)

    # ── Helper ─────────────────────────────────────────────────────────────────
    def doc_id(): return str(uuid.uuid4())

    def make_doc(doc_id, filename, status, vendor=None, amount=None, doc_type="invoice", date_=None):
        return {
            "id": doc_id,
            "filename": filename,
            "file_size_bytes": 102400,
            "mime_type": "application/pdf",
            "status": status,
            "document_type": doc_type,
            "vendor_name": vendor,
            "total_amount": amount,
            "currency": "USD",
            "invoice_date": str(date_ or yesterday),
            "created_at": datetime.now(timezone.utc),
            "updated_at": datetime.now(timezone.utc),
            "retry_count": 0,
            "error_message": None,
        }

    def make_extracted(doc_id, vendor, amount, inv_num=None, doc_type="invoice", date_=None, subtotal=None, tax=None, employee=None, currency="USD"):
        return {
            "document_id": doc_id,
            "document_type": doc_type,
            "vendor_name": vendor,
            "invoice_number": inv_num,
            "receipt_number": None,
            "invoice_date": str(date_ or yesterday),
            "due_date": None,
            "currency": currency,
            "subtotal": subtotal,
            "tax": tax,
            "total_amount": amount,
            "payment_method": "Credit Card",
            "line_items": None,
            "category": "Business Services",
            "employee_name": employee,
            "expense_date": str(date_ or yesterday),
            "raw_text_snippet": f"Invoice from {vendor}. Amount: ${amount}.",
            "extraction_confidence": 0.92,
            "retry_count": 0,
        }

    def make_finding(ftype, severity, source, explanation, field_ref=None):
        return {
            "finding_id": str(uuid.uuid4()),
            "finding_type": ftype,
            "severity": severity,
            "source": source,
            "explanation": explanation,
            "field_ref": field_ref,
            "metadata": None,
        }

    def make_audit(doc_id, status, confidence, findings, val_errors=None, llm_used=False):
        return {
            "document_id": doc_id,
            "overall_status": status,
            "confidence": confidence,
            "findings": findings,
            "extracted_snapshot": {},
            "validation_errors": val_errors or [],
            "llm_used": llm_used,
            "created_at": datetime.now(timezone.utc),
            "processing_time_ms": 340.5,
        }

    def make_log(doc_id, stage, status, message):
        return {
            "document_id": doc_id,
            "timestamp": datetime.now(timezone.utc),
            "stage": stage,
            "status": status,
            "message": message,
            "details": {},
        }

    # ─────────────────────────────────────────────────────────────────────────
    # 1. CLEAN APPROVED INVOICE
    # ─────────────────────────────────────────────────────────────────────────
    id1 = doc_id()
    await db["documents"].insert_one(make_doc(id1, "acme_invoice_001.pdf", "audited", "Acme Corp", 850.00, "invoice", yesterday))
    await db["extracted_payloads"].insert_one(make_extracted(id1, "Acme Corp", 850.00, "INV-2024-001", "invoice", yesterday, 750.00, 100.00))
    await db["audit_results"].insert_one(make_audit(id1, "approved", 0.95, []))
    await db["processing_logs"].insert_many([
        make_log(id1, "upload", "success", "File uploaded."),
        make_log(id1, "ocr", "success", "Extracted 1240 characters."),
        make_log(id1, "extraction", "success", "Extracted with confidence=0.95, retries=0"),
        make_log(id1, "validation", "success", "Validation passed."),
        make_log(id1, "audit", "done", "Audit complete: approved."),
    ])

    # ─────────────────────────────────────────────────────────────────────────
    # 2. DUPLICATE INVOICE
    # ─────────────────────────────────────────────────────────────────────────
    id2 = doc_id()
    await db["documents"].insert_one(make_doc(id2, "acme_invoice_dup.pdf", "needs_review", "Acme Corp", 850.00, "invoice", yesterday))
    await db["extracted_payloads"].insert_one(make_extracted(id2, "Acme Corp", 850.00, "INV-2024-001", "invoice", yesterday, 750.00, 100.00))
    await db["audit_results"].insert_one(make_audit(id2, "flagged", 0.90, [
        make_finding("exact_duplicate", "high", "deterministic",
                     f"Exact duplicate detected: invoice #INV-2024-001 from 'Acme Corp' already exists (document_id: {id1}).",
                     "invoice_number"),
    ]))
    await db["processing_logs"].insert_many([
        make_log(id2, "upload", "success", "File uploaded."),
        make_log(id2, "ocr", "success", "Extracted 1190 characters."),
        make_log(id2, "extraction", "success", "Extracted with confidence=0.92, retries=0"),
        make_log(id2, "validation", "success", "Validation passed."),
        make_log(id2, "audit", "done", "Audit complete: flagged."),
    ])

    # ─────────────────────────────────────────────────────────────────────────
    # 3. RECEIPT MISSING TOTAL
    # ─────────────────────────────────────────────────────────────────────────
    id3 = doc_id()
    await db["documents"].insert_one(make_doc(id3, "expense_receipt_missing.jpg", "validation_failed", "Coffee House", None, "receipt", yesterday))
    await db["processing_logs"].insert_many([
        make_log(id3, "upload", "success", "File uploaded."),
        make_log(id3, "ocr", "success", "Extracted 320 characters."),
        make_log(id3, "extraction", "failed", "Extraction attempt 1: Missing required fields: ['total_amount']."),
        make_log(id3, "extraction", "failed", "Extraction attempt 2: Missing required fields: ['total_amount']."),
        make_log(id3, "extraction", "failed", "Exhausted 3 retries. Field 'total_amount' could not be extracted."),
        make_log(id3, "validation", "failed", "Validation failed: Missing required field: 'total_amount'. Not recoverable."),
    ])

    # ─────────────────────────────────────────────────────────────────────────
    # 4. EXPENSE EXCEEDING POLICY THRESHOLD
    # ─────────────────────────────────────────────────────────────────────────
    id4 = doc_id()
    await db["documents"].insert_one(make_doc(id4, "highvalue_expense.pdf", "needs_review", "Global Consulting LLC", 3500.00, "invoice", yesterday))
    await db["extracted_payloads"].insert_one(make_extracted(id4, "Global Consulting LLC", 3500.00, "GCL-2024-789", "invoice", yesterday, 3000.00, 500.00))
    await db["audit_results"].insert_one(make_audit(id4, "flagged", 0.88, [
        make_finding("policy_amount_exceeded", "high", "deterministic",
                     "Total amount USD 3500.00 exceeds policy threshold of 1000.00.",
                     "total_amount"),
        make_finding("unusually_large_amount", "high", "deterministic",
                     "Total amount 3500.00 is unusually large (more than 2x the policy threshold of 1000.00). Requires manual review.",
                     "total_amount"),
    ]))
    await db["processing_logs"].insert_many([
        make_log(id4, "upload", "success", "File uploaded."),
        make_log(id4, "ocr", "success", "Extracted 980 characters."),
        make_log(id4, "extraction", "success", "Extracted with confidence=0.91, retries=0"),
        make_log(id4, "validation", "success", "Validation passed."),
        make_log(id4, "audit", "done", "Audit complete: flagged."),
    ])

    # ─────────────────────────────────────────────────────────────────────────
    # 5. SUSPICIOUS VENDOR MISMATCH
    # ─────────────────────────────────────────────────────────────────────────
    id5 = doc_id()
    await db["documents"].insert_one(make_doc(id5, "vendor_mismatch_invoice.pdf", "needs_review", "Acme Crp", 420.00, "invoice", yesterday))
    await db["extracted_payloads"].insert_one(make_extracted(id5, "Acme Crp", 420.00, "INV-2024-002", "invoice", yesterday, 380.00, 40.00))
    await db["audit_results"].insert_one(make_audit(id5, "needs_manual_review", 0.72, [
        make_finding("fuzzy_duplicate", "high", "deterministic",
                     f"Probable duplicate: vendor 'Acme Crp' (similarity=93%), amount 420.0 matches an existing document (document_id: {id1}).",
                     "vendor_name"),
        make_finding("suspicious_pattern", "medium", "llm_assisted",
                     "AI-Assisted: Vendor name 'Acme Crp' appears to be a misspelling of 'Acme Corp'. Possible fraudulent submission or data entry error.",
                     "vendor_name"),
    ], llm_used=True))
    await db["processing_logs"].insert_many([
        make_log(id5, "upload", "success", "File uploaded."),
        make_log(id5, "ocr", "success", "Extracted 760 characters."),
        make_log(id5, "extraction", "success", "Extracted with confidence=0.72, retries=1"),
        make_log(id5, "validation", "success", "Validation passed."),
        make_log(id5, "audit", "done", "Audit complete: needs_manual_review."),
        make_log(id5, "llm", "done", "2 LLM findings generated."),
    ])

    # ─────────────────────────────────────────────────────────────────────────
    # 6. MALFORMED OCR — RETRY RECOVERY CASE
    # ─────────────────────────────────────────────────────────────────────────
    id6 = doc_id()
    await db["documents"].insert_one(make_doc(id6, "blurry_receipt_scan.jpg", "audited", "Tech Supplies Inc", 210.00, "receipt", yesterday))
    await db["extracted_payloads"].insert_one(make_extracted(id6, "Tech Supplies Inc", 210.00, None, "receipt", yesterday, employee="Jane Smith"))
    await db["audit_results"].insert_one(make_audit(id6, "approved", 0.78, [
        make_finding("missing_invoice_number", "medium", "deterministic",
                     "Invoice number is missing for a receipt document.", "invoice_number"),
    ]))
    await db["processing_logs"].insert_many([
        make_log(id6, "upload", "success", "File uploaded."),
        make_log(id6, "ocr", "success", "Extracted 210 characters (low quality scan)."),
        make_log(id6, "extraction", "failed", "Extraction attempt 1: Missing required fields: ['vendor_name']. Retrying."),
        make_log(id6, "extraction", "success", "Extraction attempt 2: Extracted with confidence=0.78, retries=1"),
        make_log(id6, "validation", "success", "Validation passed."),
        make_log(id6, "audit", "done", "Audit complete: approved."),
    ])

    # ─────────────────────────────────────────────────────────────────────────
    # Ground Truth Samples (for eval harness)
    # ─────────────────────────────────────────────────────────────────────────
    ground_truth = [
        {
            "sample_id": str(uuid.uuid4()),
            "document_id": id1,
            "description": "Clean approved invoice – Acme Corp",
            "expected": {
                "vendor_name": "Acme Corp",
                "total_amount": 850.00,
                "currency": "USD",
                "invoice_number": "INV-2024-001",
                "invoice_date": str(yesterday),
                "document_type": "invoice",
                "subtotal": 750.00,
                "tax": 100.00,
            },
            "tags": ["clean", "approved"],
        },
        {
            "sample_id": str(uuid.uuid4()),
            "document_id": id4,
            "description": "High-value expense exceeding policy threshold",
            "expected": {
                "vendor_name": "Global Consulting LLC",
                "total_amount": 3500.00,
                "currency": "USD",
                "invoice_number": "GCL-2024-789",
                "invoice_date": str(yesterday),
                "document_type": "invoice",
                "subtotal": 3000.00,
                "tax": 500.00,
            },
            "tags": ["policy_violation", "high_value"],
        },
        {
            "sample_id": str(uuid.uuid4()),
            "document_id": id6,
            "description": "Malformed scan – retry recovery case",
            "expected": {
                "vendor_name": "Tech Supplies Inc",
                "total_amount": 210.00,
                "currency": "USD",
                "invoice_number": None,
                "invoice_date": str(yesterday),
                "document_type": "receipt",
                "subtotal": None,
                "tax": None,
            },
            "tags": ["ocr_failure", "retry"],
        },
    ]
    await db["ground_truth_samples"].insert_many(ground_truth)

    # ─────────────────────────────────────────────────────────────────────────
    # Default Policy Rules
    # ─────────────────────────────────────────────────────────────────────────
    policies = [
        {
            "rule_id": str(uuid.uuid4()),
            "name": "Amount Threshold",
            "description": "Flag any expense exceeding $1,000.",
            "rule_type": "amount_threshold",
            "enabled": True,
            "threshold": 1000.0,
            "currency_whitelist": None,
            "severity": "high",
            "created_at": datetime.now(timezone.utc),
            "updated_at": datetime.now(timezone.utc),
        },
        {
            "rule_id": str(uuid.uuid4()),
            "name": "Currency Whitelist",
            "description": "Only allow USD, EUR, GBP, and INR.",
            "rule_type": "currency_whitelist",
            "enabled": True,
            "threshold": None,
            "currency_whitelist": ["USD", "EUR", "GBP", "INR"],
            "severity": "medium",
            "created_at": datetime.now(timezone.utc),
            "updated_at": datetime.now(timezone.utc),
        },
        {
            "rule_id": str(uuid.uuid4()),
            "name": "No Weekend Expenses",
            "description": "Disallow expense submissions dated on Saturday or Sunday.",
            "rule_type": "weekend_expense",
            "enabled": True,
            "threshold": None,
            "currency_whitelist": None,
            "severity": "medium",
            "created_at": datetime.now(timezone.utc),
            "updated_at": datetime.now(timezone.utc),
        },
        {
            "rule_id": str(uuid.uuid4()),
            "name": "No Future-Dated Documents",
            "description": "Reject invoices or receipts dated in the future.",
            "rule_type": "future_date",
            "enabled": True,
            "threshold": None,
            "currency_whitelist": None,
            "severity": "high",
            "created_at": datetime.now(timezone.utc),
            "updated_at": datetime.now(timezone.utc),
        },
    ]
    await db["policy_rules"].insert_many(policies)

    print("[Seed] ✅ Inserted 6 demo documents, 3 ground truth samples, 4 policy rules.")
    client.close()


if __name__ == "__main__":
    asyncio.run(seed())
