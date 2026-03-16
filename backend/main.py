from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from db.mongo import connect_db, close_db
from api import documents, metrics, eval as eval_router, policies


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

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(documents.router, prefix="/api/v1", tags=["documents"])
app.include_router(metrics.router, prefix="/api/v1", tags=["metrics"])
app.include_router(eval_router.router, prefix="/api/v1", tags=["eval"])
app.include_router(policies.router, prefix="/api/v1", tags=["policies"])


@app.get("/healthz", tags=["health"])
async def health():
    return {"status": "ok", "service": "expense-auditor"}
