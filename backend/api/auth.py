from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel, field_validator

from auth import create_access_token, hash_password, verify_password
from db.mongo import users_col

router = APIRouter()


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
        if len(v) < 6:
            raise ValueError("Password must be at least 6 characters.")
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
