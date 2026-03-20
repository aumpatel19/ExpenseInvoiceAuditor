from datetime import date, datetime
from decimal import Decimal
from enum import Enum
from typing import Optional, List, Any
from pydantic import BaseModel, Field, field_validator, model_validator
import uuid


class DocumentType(str, Enum):
    invoice = "invoice"
    receipt = "receipt"


class DocumentStatus(str, Enum):
    uploaded = "uploaded"
    processing = "processing"
    extracted = "extracted"
    validation_failed = "validation_failed"
    audited = "audited"
    needs_review = "needs_review"
    error = "error"


class LineItem(BaseModel):
    description: str
    quantity: Optional[float] = None
    unit_price: Optional[float] = None
    total: Optional[float] = None


class ExtractedDocument(BaseModel):
    document_type: DocumentType
    vendor_name: Optional[str] = None  # Optional — missing vendor caught by rule engine
    invoice_number: Optional[str] = None
    receipt_number: Optional[str] = None
    invoice_date: Optional[date] = None
    due_date: Optional[date] = None
    currency: str = "USD"
    subtotal: Optional[float] = None
    tax: Optional[float] = None
    total_amount: Optional[float] = None
    payment_method: Optional[str] = None
    line_items: Optional[List[LineItem]] = None
    category: Optional[str] = None
    employee_name: Optional[str] = None
    expense_date: Optional[date] = None
    raw_text_snippet: Optional[str] = None
    extraction_confidence: float = Field(default=0.0, ge=0.0, le=1.0)
    retry_count: int = 0

    @field_validator("currency")
    @classmethod
    def normalize_currency(cls, v: str) -> str:
        return v.strip().upper()

    @field_validator("total_amount", "subtotal", "tax", mode="before")
    @classmethod
    def coerce_numeric(cls, v: Any) -> Optional[float]:
        if v is None:
            return v
        try:
            return float(str(v).replace(",", "").replace("$", "").replace("€", "").strip())
        except (ValueError, TypeError):
            raise ValueError(f"Monetary field must be numeric, got: {v!r}")

    @model_validator(mode="after")
    def check_totals_consistency(self) -> "ExtractedDocument":
        if self.subtotal is not None and self.tax is not None and self.total_amount is not None:
            expected = round(self.subtotal + self.tax, 2)
            if abs(expected - self.total_amount) > 1.0:
                raise ValueError(
                    f"Total amount {self.total_amount} does not match subtotal+tax={expected}"
                )
        # If total_amount missing but subtotal+tax available, infer it
        if self.total_amount is None and self.subtotal is not None and self.tax is not None:
            self.total_amount = round(self.subtotal + self.tax, 2)
        elif self.total_amount is None and self.subtotal is not None:
            self.total_amount = self.subtotal
        return self


class DocumentRecord(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    filename: str
    file_size_bytes: int
    mime_type: str
    status: DocumentStatus = DocumentStatus.uploaded
    document_type: Optional[DocumentType] = None
    vendor_name: Optional[str] = None
    total_amount: Optional[float] = None
    currency: Optional[str] = None
    invoice_date: Optional[date] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    retry_count: int = 0
    error_message: Optional[str] = None


class UploadResponse(BaseModel):
    document_id: str
    filename: str
    status: DocumentStatus
    message: str


class DocumentListItem(BaseModel):
    id: str
    filename: str
    status: DocumentStatus
    document_type: Optional[DocumentType]
    vendor_name: Optional[str]
    total_amount: Optional[float]
    currency: Optional[str]
    invoice_date: Optional[date]
    created_at: datetime


class ValidationErrorReport(BaseModel):
    document_id: str
    errors: List[str]
    is_recoverable: bool
    partial_data: Optional[dict] = None
