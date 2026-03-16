from typing import Optional, Dict, List, Any
from pydantic import BaseModel, Field
from datetime import datetime
import uuid


class GroundTruthSample(BaseModel):
    sample_id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    document_id: Optional[str] = None
    description: str
    expected: Dict[str, Any]  # expected extracted fields
    tags: List[str] = []


class FieldAccuracyResult(BaseModel):
    field_name: str
    expected: Any
    actual: Any
    match: bool
    note: Optional[str] = None


class EvalRunResult(BaseModel):
    sample_id: str
    description: str
    field_results: List[FieldAccuracyResult]
    field_accuracy: float
    passed: bool
    failure_reason: Optional[str] = None


class EvalRun(BaseModel):
    run_id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    created_at: datetime = Field(default_factory=datetime.utcnow)
    total_samples: int
    passed: int
    failed: int
    overall_accuracy: float
    validation_pass_rate: float
    avg_processing_time_ms: Optional[float] = None
    results: List[EvalRunResult]
    edge_cases: List[str] = []
    notes: Optional[str] = None


class EvalRunRequest(BaseModel):
    sample_ids: Optional[List[str]] = None  # None = run all ground truth samples
