import logging
import uuid
from datetime import date, datetime
from typing import List, Optional

from fuzzywuzzy import fuzz

from schemas.document import ExtractedDocument, DocumentType
from schemas.audit import AuditFinding, FindingSeverity, FindingSource
from config import settings
from db.mongo import documents_col, extracted_payloads_col

logger = logging.getLogger(__name__)


def _finding(
    finding_type: str,
    severity: FindingSeverity,
    explanation: str,
    field_ref: Optional[str] = None,
    metadata: Optional[dict] = None,
) -> AuditFinding:
    return AuditFinding(
        finding_id=str(uuid.uuid4()),
        finding_type=finding_type,
        severity=severity,
        source=FindingSource.deterministic,
        explanation=explanation,
        field_ref=field_ref,
        metadata=metadata,
    )


async def run_rule_checks(
    document_id: str,
    doc: ExtractedDocument,
    policy_overrides: Optional[dict] = None,
) -> List[AuditFinding]:
    """
    Run all deterministic audit checks against the extracted document.
    Returns a list of AuditFindings — empty list means all checks passed.
    """
    findings: List[AuditFinding] = []
    policy = policy_overrides or {}

    amount_threshold = policy.get("amount_threshold", settings.policy_amount_threshold)
    allowed_currencies = policy.get(
        "allowed_currencies", settings.allowed_currencies_list
    )
    allow_weekends = policy.get("allow_weekend_expenses", settings.policy_allow_weekend_expenses)

    # 1. Missing critical fields
    findings.extend(_check_missing_fields(doc))

    # 2. Duplicate detection
    dup_findings = await _check_duplicates(document_id, doc)
    findings.extend(dup_findings)

    # 3. Amount threshold
    if doc.total_amount and doc.total_amount > amount_threshold:
        findings.append(_finding(
            finding_type="policy_amount_exceeded",
            severity=FindingSeverity.high,
            explanation=(
                f"Total amount {doc.currency} {doc.total_amount:.2f} exceeds "
                f"policy threshold of {amount_threshold:.2f}."
            ),
            field_ref="total_amount",
            metadata={"amount": doc.total_amount, "threshold": amount_threshold},
        ))

    # 4. Weekend expense
    if not allow_weekends:
        expense_date = doc.expense_date or doc.invoice_date
        if expense_date:
            weekday = expense_date.weekday()  # Monday=0, Sunday=6
            if weekday >= 5:
                findings.append(_finding(
                    finding_type="weekend_expense",
                    severity=FindingSeverity.medium,
                    explanation=(
                        f"Expense dated {expense_date} falls on a "
                        f"{'Saturday' if weekday == 5 else 'Sunday'}, "
                        "which violates the weekend expense policy."
                    ),
                    field_ref="invoice_date",
                    metadata={"date": str(expense_date), "weekday": weekday},
                ))

    # 5. Future-dated document
    ref_date = doc.invoice_date or doc.expense_date
    if ref_date and ref_date > date.today():
        findings.append(_finding(
            finding_type="future_dated",
            severity=FindingSeverity.high,
            explanation=(
                f"Document date {ref_date} is in the future. "
                "This may indicate a fraudulent or erroneous submission."
            ),
            field_ref="invoice_date",
            metadata={"date": str(ref_date)},
        ))

    # 6. Unsupported currency
    if doc.currency and doc.currency not in allowed_currencies:
        findings.append(_finding(
            finding_type="unsupported_currency",
            severity=FindingSeverity.medium,
            explanation=(
                f"Currency '{doc.currency}' is not in the approved list: "
                f"{', '.join(allowed_currencies)}."
            ),
            field_ref="currency",
            metadata={"currency": doc.currency, "allowed": allowed_currencies},
        ))

    # 7. Missing tax / inconsistent total
    if doc.subtotal is not None and doc.tax is None:
        findings.append(_finding(
            finding_type="missing_tax",
            severity=FindingSeverity.low,
            explanation=(
                "Subtotal is present but tax amount is missing. "
                "Expected tax field for consistency verification."
            ),
            field_ref="tax",
        ))

    # 8. Suspiciously large amount (2x threshold)
    if doc.total_amount and doc.total_amount > amount_threshold * 2:
        findings.append(_finding(
            finding_type="unusually_large_amount",
            severity=FindingSeverity.high,
            explanation=(
                f"Total amount {doc.total_amount:.2f} is unusually large "
                f"(more than 2x the policy threshold of {amount_threshold:.2f}). "
                "Requires manual review."
            ),
            field_ref="total_amount",
            metadata={"amount": doc.total_amount, "threshold": amount_threshold},
        ))

    return findings


def _check_missing_fields(doc: ExtractedDocument) -> List[AuditFinding]:
    findings = []
    critical_fields = {
        "vendor_name": "Vendor name is missing.",
        "total_amount": "Total amount is missing.",
        "invoice_date": "Invoice/expense date is missing.",
    }
    if doc.document_type == DocumentType.invoice and doc.invoice_number is None:
        findings.append(_finding(
            finding_type="missing_invoice_number",
            severity=FindingSeverity.medium,
            explanation="Invoice number is missing for an invoice document.",
            field_ref="invoice_number",
        ))

    for field, msg in critical_fields.items():
        val = getattr(doc, field, None)
        if val is None:
            findings.append(_finding(
                finding_type=f"missing_{field}",
                severity=FindingSeverity.high,
                explanation=msg,
                field_ref=field,
            ))

    return findings


async def _check_duplicates(
    current_doc_id: str,
    doc: ExtractedDocument,
) -> List[AuditFinding]:
    """
    Check for duplicate invoices/receipts using:
    1. Exact match: same invoice_number + vendor_name
    2. Fuzzy match: similar amount + date + vendor name
    """
    findings = []
    col = extracted_payloads_col()

    # 1. Exact duplicate: same invoice_number + same vendor
    if doc.invoice_number and doc.vendor_name:
        exact_query = {
            "document_id": {"$ne": current_doc_id},
            "invoice_number": doc.invoice_number,
            "vendor_name": doc.vendor_name,
        }
        existing = await col.find_one(exact_query)
        if existing:
            findings.append(_finding(
                finding_type="exact_duplicate",
                severity=FindingSeverity.high,
                explanation=(
                    f"Exact duplicate detected: invoice #{doc.invoice_number} "
                    f"from '{doc.vendor_name}' already exists "
                    f"(document_id: {existing.get('document_id')})."
                ),
                field_ref="invoice_number",
                metadata={"duplicate_document_id": existing.get("document_id")},
            ))

    # 2. Fuzzy duplicate: same vendor (fuzzy) + same date + similar amount
    if doc.vendor_name and doc.invoice_date and doc.total_amount:
        date_query = {
            "document_id": {"$ne": current_doc_id},
            "invoice_date": str(doc.invoice_date),
        }
        cursor = col.find(date_query)
        candidates = await cursor.to_list(length=50)
        for candidate in candidates:
            vendor_score = fuzz.token_sort_ratio(
                doc.vendor_name.lower(),
                (candidate.get("vendor_name") or "").lower(),
            )
            amount_match = (
                candidate.get("total_amount") is not None
                and abs(candidate["total_amount"] - doc.total_amount) < 1.0
            )
            if vendor_score >= 85 and amount_match:
                findings.append(_finding(
                    finding_type="fuzzy_duplicate",
                    severity=FindingSeverity.high,
                    explanation=(
                        f"Probable duplicate: vendor '{doc.vendor_name}' (similarity={vendor_score}%), "
                        f"amount {doc.total_amount}, date {doc.invoice_date} matches an existing document "
                        f"(document_id: {candidate.get('document_id')})."
                    ),
                    field_ref="vendor_name",
                    metadata={
                        "duplicate_document_id": candidate.get("document_id"),
                        "vendor_similarity": vendor_score,
                    },
                ))
                break  # One fuzzy duplicate finding is enough

    return findings
