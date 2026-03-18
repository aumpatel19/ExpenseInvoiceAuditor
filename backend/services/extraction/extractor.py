import re
import logging
from datetime import date
from typing import Optional, Dict, Any, Tuple

from schemas.document import ExtractedDocument, DocumentType, LineItem
from services.ocr.base import OCRExtractionError

logger = logging.getLogger(__name__)

# ─── Regex patterns ────────────────────────────────────────────────────────────

DATE_PATTERNS = [
    r"\b(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4})\b",
    r"\b(\d{4}[\/\-\.]\d{1,2}[\/\-\.]\d{1,2})\b",
    r"\b(\w{3,9}\s+\d{1,2},?\s+\d{4})\b",
    r"\b(\d{1,2}\s+\w{3,9}\s+\d{4})\b",
]
AMOUNT_PATTERNS = [
    r"(?:total|amount due|grand total|balance due|total due|net amount|payable|pay this amount)[:\s]*[\$€£₹Rs.]*\s*([\d,]+\.?\d*)",
    r"[\$€£₹]\s*([\d,]+\.?\d*)\b",
    r"\b([\d,]+\.\d{2})\s*(?:USD|EUR|GBP|INR|CAD|AUD)\b",
    r"(?:Rs\.?|INR)\s*([\d,]+\.?\d*)",
    r"(?:total|amount)[:\s]+([\d,]+\.?\d*)",
    r"^\s*([\d,]+\.\d{2})\s*$",  # bare decimal amount on its own line
]
VENDOR_PATTERNS = [
    r"(?:from|vendor|supplier|company|invoice from|bill from|billed by)[:\s]+([A-Za-z0-9 &.,'-]+)",
    r"^([A-Z][A-Za-z0-9 &.,'-]{2,50})\s*$",
]
INVOICE_NUM_PATTERNS = [
    r"(?:invoice\s*(?:no\.?|number|#)|inv\.?\s*(?:no\.?|#))[:\s#]*([A-Z0-9\-/]+)",
    r"(?:receipt\s*(?:no\.?|number|#))[:\s#]*([A-Z0-9\-/]+)",
]
CURRENCY_PATTERN = r"\b(USD|EUR|GBP|INR|CAD|AUD|JPY|CHF)\b"
TAX_PATTERN = r"(?:tax|vat|gst|hst)[:\s]*[\$€£₹]?\s*([\d,]+\.?\d*)"
SUBTOTAL_PATTERN = r"(?:subtotal|sub total|sub-total)[:\s]*[\$€£₹]?\s*([\d,]+\.?\d*)"
EMPLOYEE_PATTERN = r"(?:employee|submitted by|claimed by|name)[:\s]+([A-Za-z\s'-]{2,50})"
PAYMENT_PATTERN = r"(?:payment method|paid via|payment)[:\s]+(cash|credit|debit|card|wire|check|cheque|bank transfer)"


def _parse_amount(text: str) -> Optional[float]:
    for pattern in AMOUNT_PATTERNS:
        m = re.search(pattern, text, re.IGNORECASE)
        if m:
            try:
                return float(m.group(1).replace(",", ""))
            except ValueError:
                continue
    return None


def _parse_date(text: str) -> Optional[date]:
    from dateutil import parser as dateparser
    for pattern in DATE_PATTERNS:
        matches = re.findall(pattern, text, re.IGNORECASE)
        for match in matches:
            try:
                return dateparser.parse(match, fuzzy=True).date()
            except Exception:
                continue
    return None


def _parse_vendor(text: str) -> Optional[str]:
    for pattern in VENDOR_PATTERNS:
        m = re.search(pattern, text[:500], re.IGNORECASE | re.MULTILINE)
        if m:
            vendor = m.group(1).strip().title()
            if 2 < len(vendor) < 80:
                return vendor
    lines = [l.strip() for l in text.splitlines() if l.strip()]
    if lines:
        first = lines[0]
        if 2 < len(first) < 80 and not any(kw in first.lower() for kw in ["invoice", "receipt", "date", "page"]):
            return first.title()
    return None


def _parse_invoice_number(text: str) -> Tuple[Optional[str], Optional[str]]:
    """Returns (invoice_number, receipt_number)."""
    for pattern in INVOICE_NUM_PATTERNS:
        m = re.search(pattern, text, re.IGNORECASE)
        if m:
            num = m.group(1).strip()
            if "receipt" in pattern:
                return None, num
            return num, None
    return None, None


def _parse_currency(text: str) -> str:
    m = re.search(CURRENCY_PATTERN, text, re.IGNORECASE)
    if m:
        return m.group(1).upper()
    if "$" in text:
        return "USD"
    if "€" in text:
        return "EUR"
    if "£" in text:
        return "GBP"
    if "₹" in text:
        return "INR"
    return "USD"


def _parse_tax(text: str) -> Optional[float]:
    m = re.search(TAX_PATTERN, text, re.IGNORECASE)
    if m:
        try:
            return float(m.group(1).replace(",", ""))
        except ValueError:
            return None
    return None


def _parse_subtotal(text: str) -> Optional[float]:
    m = re.search(SUBTOTAL_PATTERN, text, re.IGNORECASE)
    if m:
        try:
            return float(m.group(1).replace(",", ""))
        except ValueError:
            return None
    return None


def _detect_doc_type(text: str) -> DocumentType:
    lower = text.lower()
    if "invoice" in lower:
        return DocumentType.invoice
    if "receipt" in lower or "expense" in lower:
        return DocumentType.receipt
    return DocumentType.invoice


def _parse_employee(text: str) -> Optional[str]:
    m = re.search(EMPLOYEE_PATTERN, text, re.IGNORECASE)
    return m.group(1).strip().title() if m else None


def _parse_payment_method(text: str) -> Optional[str]:
    m = re.search(PAYMENT_PATTERN, text, re.IGNORECASE)
    return m.group(1).strip().title() if m else None


def _calculate_confidence(doc: dict) -> float:
    required_fields = ["vendor_name", "total_amount", "invoice_date"]
    optional_fields = ["invoice_number", "currency", "subtotal", "tax"]
    score = sum(1 for f in required_fields if doc.get(f) is not None) / len(required_fields)
    bonus = sum(0.05 for f in optional_fields if doc.get(f) is not None)
    return min(round(score * 0.85 + bonus, 2), 1.0)


class ExtractionResult:
    def __init__(
        self,
        document: Optional[ExtractedDocument],
        raw_fields: Dict[str, Any],
        confidence: float,
        errors: list,
        retry_count: int = 0,
    ):
        self.document = document
        self.raw_fields = raw_fields
        self.confidence = confidence
        self.errors = errors
        self.retry_count = retry_count


async def extract_from_text(
    raw_text: str,
    document_id: str,
    max_retries: int = 3,
) -> ExtractionResult:
    """
    Extract structured fields from raw OCR text.
    Retries up to max_retries times if required fields are missing.
    """
    from utils.logger import log_stage

    retry_count = 0
    last_errors = []

    while retry_count < max_retries:
        await log_stage(document_id, "extraction", "running", f"Attempt {retry_count + 1}")

        raw_fields: Dict[str, Any] = {}
        errors: list = []

        try:
            raw_fields["document_type"] = _detect_doc_type(raw_text)
            raw_fields["vendor_name"] = _parse_vendor(raw_text)
            raw_fields["total_amount"] = _parse_amount(raw_text)
            raw_fields["currency"] = _parse_currency(raw_text)
            raw_fields["invoice_date"] = _parse_date(raw_text)
            raw_fields["subtotal"] = _parse_subtotal(raw_text)
            raw_fields["tax"] = _parse_tax(raw_text)
            raw_fields["payment_method"] = _parse_payment_method(raw_text)
            raw_fields["employee_name"] = _parse_employee(raw_text)
            inv_num, rec_num = _parse_invoice_number(raw_text)
            raw_fields["invoice_number"] = inv_num
            raw_fields["receipt_number"] = rec_num
            raw_fields["raw_text_snippet"] = raw_text[:500]

            # Check minimum required fields — if missing, log warning and proceed at low confidence
            # (retrying the same regex on the same text will never help)
            missing = [
                f for f in ["vendor_name", "total_amount"]
                if raw_fields.get(f) is None
            ]
            if missing:
                logger.warning(f"[Extract] Missing fields after regex pass: {missing}. Proceeding with low confidence.")

            confidence = _calculate_confidence(raw_fields)
            raw_fields["extraction_confidence"] = confidence
            raw_fields["retry_count"] = retry_count

            try:
                doc = ExtractedDocument(**raw_fields)
                await log_stage(
                    document_id, "extraction", "success",
                    f"Extracted with confidence={confidence:.2f}, retries={retry_count}"
                )
                return ExtractionResult(doc, raw_fields, confidence, [], retry_count)
            except Exception as ve:
                error_msg = str(ve)
                errors.append(error_msg)
                logger.warning(f"[Extract] Schema validation error: {error_msg}")
                retry_count += 1
                last_errors = errors

        except Exception as e:
            logger.error(f"[Extract] Unexpected error: {e}")
            errors.append(str(e))
            retry_count += 1
            last_errors = errors

    await log_stage(
        document_id, "extraction", "failed",
        f"Exhausted {max_retries} retries",
        {"errors": last_errors},
    )
    return ExtractionResult(None, raw_fields, 0.0, last_errors, retry_count)
