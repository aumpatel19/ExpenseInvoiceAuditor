import logging
from typing import Tuple, List

from pydantic import ValidationError

from schemas.document import ExtractedDocument, ValidationErrorReport

logger = logging.getLogger(__name__)

REQUIRED_FIELDS = ["total_amount"]  # vendor_name is Optional — caught as audit finding instead


def validate_document(
    document_id: str,
    raw_fields: dict,
) -> Tuple[bool, ValidationErrorReport]:
    """
    Validate raw extracted fields against the ExtractedDocument Pydantic schema.

    Returns:
        (is_valid, ValidationErrorReport)
    """
    errors: List[str] = []
    is_recoverable = True

    # 1. Check required fields explicitly before Pydantic
    for field in REQUIRED_FIELDS:
        if not raw_fields.get(field):
            errors.append(f"Missing required field: '{field}'")

    # 2. Try Pydantic validation
    try:
        doc = ExtractedDocument(**raw_fields)
    except ValidationError as ve:
        for err in ve.errors():
            loc = " → ".join(str(l) for l in err["loc"])
            errors.append(f"Field '{loc}': {err['msg']}")
        # If total_amount is missing entirely, not recoverable
        if any("total_amount" in e for e in errors):
            is_recoverable = False

    report = ValidationErrorReport(
        document_id=document_id,
        errors=errors,
        is_recoverable=is_recoverable,
        partial_data=raw_fields if errors else None,
    )

    if errors:
        logger.warning(f"[Validate] document_id={document_id} failed: {errors}")
        return False, report

    logger.info(f"[Validate] document_id={document_id} passed validation.")
    return True, report
