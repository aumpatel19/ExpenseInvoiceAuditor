# Expense & Invoice Auditor

A production-style full-stack audit system for invoices and expense receipts.

## Stack
- **Backend**: FastAPI · Pydantic v2 · MongoDB (Motor async) · LangChain
- **Frontend**: Next.js 16 · TypeScript · Tailwind CSS · Framer Motion
- **OCR**: Tesseract (abstracted, swappable) + pdf2image

## Quick Start

### 1. Prerequisites
- Python 3.11+
- Node.js 18+
- MongoDB running locally (`mongodb://localhost:27017`)
- Tesseract OCR installed ([download](https://github.com/UB-Mannheim/tesseract/wiki))
- Poppler for pdf2image ([download](https://github.com/oschwartz10612/poppler-windows/releases))

### 2. Backend Setup
```bash
cd backend
cp .env.example .env        # fill in MONGO_URI, optionally OPENAI_API_KEY
pip install -r requirements.txt
python seed.py              # populate demo documents & ground truth samples
uvicorn main:app --reload --port 8000
```

API docs available at: http://localhost:8000/docs

### 3. Frontend Setup
```bash
# Run from parent Desktop directory (avoids & in path issue with npm)
cd "C:\Users\<you>\OneDrive\Desktop"
npm install --prefix .\Expense&InvoiceAuditor\frontend
cd Expense&InvoiceAuditor\frontend
npm run dev                 # http://localhost:3000
```

### 4. Run Tests
```bash
cd backend
pytest tests/ -v
```

## Pages
| Route | Description |
|---|---|
| `/` | Dashboard — metrics, recent documents table |
| `/upload` | Drag-and-drop file upload with pipeline stepper |
| `/documents` | Full document list with filters |
| `/documents/[id]` | Detail — extracted JSON, audit findings, timeline |
| `/eval` | Evaluation harness — field accuracy, run history |
| `/policies` | Policy rules CRUD |

## Features
- **OCR pipeline** — Tesseract (PDF + image) with retry on partial extraction
- **Pydantic v2 validation** — strict schema, monetary coercion, total consistency check
- **Deterministic audit rules** — duplicate detection (exact + fuzzy), amount threshold, weekend/future-date, currency whitelist
- **LLM-assisted checks** — LangChain + GPT-4o-mini for semantic anomalies (optional, gated by `LLM_ENABLED=true`)
- **Eval harness** — field-level accuracy vs ground truth, edge case documentation
- **6 demo documents** — clean, duplicate, missing field, policy violation, vendor mismatch, OCR retry

## Environment Variables (backend)
| Variable | Default | Description |
|---|---|---|
| `MONGO_URI` | `mongodb://localhost:27017` | MongoDB connection |
| `DB_NAME` | `expense_auditor` | Database name |
| `OCR_PROVIDER` | `tesseract` | OCR implementation |
| `LLM_ENABLED` | `false` | Enable LangChain LLM checks |
| `OPENAI_API_KEY` | — | Required if LLM_ENABLED=true |
| `POLICY_AMOUNT_THRESHOLD` | `1000.0` | Default $ flagging threshold |
| `MAX_UPLOAD_MB` | `20` | Max file upload size |
