from contextlib import asynccontextmanager
from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
from slowapi.middleware import SlowAPIMiddleware

from db.mongo import connect_db, close_db
from auth import get_current_user
from config import settings
from api import documents, metrics, eval as eval_router, policies
from api.auth import router as auth_router

limiter = Limiter(key_func=get_remote_address, default_limits=["200/minute"])
_auth = [Depends(get_current_user)]


@asynccontextmanager
async def lifespan(app: FastAPI):
    await connect_db()
    yield
    await close_db()


app = FastAPI(
    title="Expense & Invoice Auditor",
    description="OCR-to-JSON audit pipeline for invoices and expense receipts.",
    version="1.0.0",
    lifespan=lifespan,
)

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)
app.add_middleware(SlowAPIMiddleware)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Auth — public (signup + login)
app.include_router(auth_router,        prefix="/api/v1", tags=["auth"])

# All other routes require a valid JWT
app.include_router(documents.router,   prefix="/api/v1", tags=["documents"], dependencies=_auth)
app.include_router(metrics.router,     prefix="/api/v1", tags=["metrics"],   dependencies=_auth)
app.include_router(eval_router.router, prefix="/api/v1", tags=["eval"],      dependencies=_auth)
app.include_router(policies.router,    prefix="/api/v1", tags=["policies"],  dependencies=_auth)


@app.get("/healthz", tags=["health"])
async def health():
    return {"status": "ok", "service": "expense-auditor"}
