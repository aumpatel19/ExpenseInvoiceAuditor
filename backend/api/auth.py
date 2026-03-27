from datetime import datetime
import uuid

from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel, field_validator

from auth import create_access_token, hash_password, verify_password
from db.mongo import users_col, policy_rules_col
from config import settings

router = APIRouter()


def _default_policies(username: str) -> list:
    now = datetime.utcnow()
    return [
        {
            "rule_id": str(uuid.uuid4()), "username": username,
            "name": "Amount Threshold",
            "description": f"Flag any document whose total exceeds {settings.policy_amount_threshold:.0f}.",
            "rule_type": "amount_threshold", "enabled": True,
            "threshold": settings.policy_amount_threshold,
            "currency_whitelist": None, "severity": "high",
            "created_at": now, "updated_at": now,
        },
        {
            "rule_id": str(uuid.uuid4()), "username": username,
            "name": "Unusually Large Amount",
            "description": f"Flag amounts greater than 2× the threshold ({settings.policy_amount_threshold * 2:.0f}).",
            "rule_type": "amount_threshold", "enabled": True,
            "threshold": settings.policy_amount_threshold * 2,
            "currency_whitelist": None, "severity": "high",
            "created_at": now, "updated_at": now,
        },
        {
            "rule_id": str(uuid.uuid4()), "username": username,
            "name": "Currency Whitelist",
            "description": f"Only allow: {settings.policy_allowed_currencies}.",
            "rule_type": "currency_whitelist", "enabled": True,
            "threshold": None,
            "currency_whitelist": settings.allowed_currencies_list,
            "severity": "medium",
            "created_at": now, "updated_at": now,
        },
        {
            "rule_id": str(uuid.uuid4()), "username": username,
            "name": "No Weekend Expenses",
            "description": "Flag expenses dated on a Saturday or Sunday.",
            "rule_type": "weekend_expense", "enabled": True,
            "threshold": None, "currency_whitelist": None, "severity": "medium",
            "created_at": now, "updated_at": now,
        },
        {
            "rule_id": str(uuid.uuid4()), "username": username,
            "name": "Future-Dated Documents",
            "description": "Flag any document with a date set in the future.",
            "rule_type": "future_date", "enabled": True,
            "threshold": None, "currency_whitelist": None, "severity": "high",
            "created_at": now, "updated_at": now,
        },
        {
            "rule_id": str(uuid.uuid4()), "username": username,
            "name": "Missing Critical Fields",
            "description": "Flag documents missing vendor name, total amount, or invoice date.",
            "rule_type": "missing_field", "enabled": True,
            "threshold": None, "currency_whitelist": None, "severity": "high",
            "created_at": now, "updated_at": now,
        },
        {
            "rule_id": str(uuid.uuid4()), "username": username,
            "name": "Duplicate Detection",
            "description": "Flag exact or fuzzy duplicate invoices from the same vendor.",
            "rule_type": "duplicate_detection", "enabled": True,
            "threshold": None, "currency_whitelist": None, "severity": "high",
            "created_at": now, "updated_at": now,
        },
        {
            "rule_id": str(uuid.uuid4()), "username": username,
            "name": "Missing Tax on Subtotal",
            "description": "Flag documents that have a subtotal but no tax amount.",
            "rule_type": "missing_field", "enabled": True,
            "threshold": None, "currency_whitelist": None, "severity": "low",
            "created_at": now, "updated_at": now,
        },
    ]


class SignupRequest(BaseModel):
    username: str
    password: str

    @field_validator("username")
    @classmethod
    def username_valid(cls, v: str) -> str:
        v = v.strip()
        if len(v) < 3:
            raise ValueError("Username must be at least 3 characters.")
        if not v.replace("_", "").replace("-", "").isalnum():
            raise ValueError("Username may only contain letters, numbers, hyphens, underscores.")
        return v.lower()

    @field_validator("password")
    @classmethod
    def password_valid(cls, v: str) -> str:
        if len(v) < 8:
            raise ValueError("Password must be at least 8 characters.")
        return v


class LoginRequest(BaseModel):
    username: str
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    username: str


@router.post("/auth/signup", response_model=TokenResponse, status_code=201)
async def signup(body: SignupRequest):
    existing = await users_col().find_one({"username": body.username})
    if existing:
        raise HTTPException(status_code=409, detail="Username already taken.")

    await users_col().insert_one({
        "username": body.username,
        "password_hash": hash_password(body.password),
    })

    # Seed default policies for the new user
    await policy_rules_col().insert_many(_default_policies(body.username))

    token = create_access_token(username=body.username)
    return TokenResponse(access_token=token, username=body.username)


@router.post("/auth/login", response_model=TokenResponse)
async def login(body: LoginRequest):
    user = await users_col().find_one({"username": body.username.strip().lower()})
    if not user or not verify_password(body.password, user["password_hash"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password.",
        )
    token = create_access_token(username=user["username"])
    return TokenResponse(access_token=token, username=user["username"])
