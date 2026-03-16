from enum import Enum
from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field
from datetime import datetime


class FindingSeverity(str, Enum):
    low = "low"
    medium = "medium"
    high = "high"


class FindingSource(str, Enum):
    deterministic = "deterministic"
    llm_assisted = "llm_assisted"


class AuditFinding(BaseModel):
    finding_id: str
    finding_type: str
    severity: FindingSeverity
    source: FindingSource
    explanation: str
    field_ref: Optional[str] = None  # which field triggered it
    metadata: Optional[Dict[str, Any]] = None


class AuditStatus(str, Enum):
    approved = "approved"
    flagged = "flagged"
    needs_manual_review = "needs_manual_review"
    rejected = "rejected"


class ProcessingLogEntry(BaseModel):
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    stage: str
    status: str
    message: str
    details: Optional[Dict[str, Any]] = None


class AuditResult(BaseModel):
    document_id: str
    overall_status: AuditStatus
    confidence: float = Field(ge=0.0, le=1.0)
    findings: List[AuditFinding]
    extracted_snapshot: Optional[Dict[str, Any]] = None
    validation_errors: List[str] = []
    processing_logs: List[ProcessingLogEntry] = []
    llm_used: bool = False
    created_at: datetime = Field(default_factory=datetime.utcnow)
    processing_time_ms: Optional[float] = None
