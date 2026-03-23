from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel

from auth import create_access_token
from config import settings

router = APIRouter()


class LoginRequest(BaseModel):
    username: str
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    username: str


@router.post("/auth/login", response_model=TokenResponse)
async def login(body: LoginRequest):
    if body.username != settings.auth_username or body.password != settings.auth_password:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password.",
        )
    token = create_access_token(username=body.username)
    return TokenResponse(access_token=token, username=body.username)


@router.get("/auth/me")
async def me_public():
    """Public endpoint — actual user info is decoded client-side from the JWT."""
    return {"service": "expense-auditor", "auth": "jwt"}
