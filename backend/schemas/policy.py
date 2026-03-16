from enum import Enum
from typing import Optional, List
from pydantic import BaseModel, Field
from datetime import datetime
import uuid


class PolicyRuleType(str, Enum):
    amount_threshold = "amount_threshold"
    currency_whitelist = "currency_whitelist"
    weekend_expense = "weekend_expense"
    future_date = "future_date"
    missing_field = "missing_field"
    duplicate_detection = "duplicate_detection"
    vendor_mismatch = "vendor_mismatch"
    custom = "custom"


class PolicyRule(BaseModel):
    rule_id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    description: str
    rule_type: PolicyRuleType
    enabled: bool = True
    threshold: Optional[float] = None           # for amount_threshold
    currency_whitelist: Optional[List[str]] = None   # for currency_whitelist
    severity: str = "medium"                    # low | medium | high
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)


class PolicyRuleCreate(BaseModel):
    name: str
    description: str
    rule_type: PolicyRuleType
    enabled: bool = True
    threshold: Optional[float] = None
    currency_whitelist: Optional[List[str]] = None
    severity: str = "medium"
