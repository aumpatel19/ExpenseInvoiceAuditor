# Expense & Invoice Auditor

A production-style full-stack audit system for invoices and expense receipts.

## Stack
- **Backend**: FastAPI · Pydantic v2 · MongoDB (Motor async) · LangChain
- **Frontend**: Next.js 16 · TypeScript · Tailwind CSS · Framer Motion
- **OCR**: Tesseract (abstracted, swappable) + pdf2image

---

## Quick Start

### 1. Prerequisites

| Dependency | Download |
|---|---|
| Python 3.11+ | https://python.org |
| Node.js 18+ | https://nodejs.org |
| MongoDB Community | https://www.mongodb.com/try/download/community |
| Tesseract OCR | https://github.com/UB-Mannheim/tesseract/wiki |
| Poppler (for PDF support) | https://github.com/oschwartz10612/poppler-windows/releases |

> **Windows Notes:**
> - **Tesseract**: Run the bundled `tesseract-installer.exe` in the repo root. The backend auto-detects the binary at `C:\Program Files\Tesseract-OCR\tesseract.exe` — no PATH setup needed.  
> - **Poppler**: Download the latest `poppler-xx.xx.x_x86.7z` from the releases link above, extract it, and add the `Library/bin` folder to your system PATH (e.g. `C:\poppler\Library\bin`). Required for PDF → image conversion.

---

### 2. Backend Setup

```bash
cd backend

# Copy environment config
copy .env.example .env
# (Optional) Edit .env to set OPENAI_API_KEY if you want LLM checks

# Create and activate virtual environment
python -m venv ..\.venv
..\.venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Seed demo documents and ground truth samples into MongoDB
python seed.py

# Start the API server
uvicorn main:app --reload --host 127.0.0.1 --port 8000
```

API docs available at: http://localhost:8000/docs

to run 

C:\Users\Aum\OneDrive\Desktop\ExpenseInvoiceAuditor\.venv\Scripts\uvicorn.exe main:app --reload --host 127.0.0.1 --port 8000
---

### 3. Frontend Setup

```bash
cd frontend
npm install
npm run dev    # → http://localhost:3000
```

---

### 4. Run Tests

```bash
cd backend
pytest tests/ -v
```

---

## Pages

| Route | Description |
|---|---|
| `/` | Dashboard — metrics, recent documents table |
| `/upload` | Drag-and-drop file upload with pipeline stepper |
| `/documents` | Full document list with filters |
| `/documents/[id]` | Detail — extracted JSON, audit findings, timeline |
| `/eval` | Evaluation harness — field accuracy, run history |
| `/policies` | Policy rules CRUD |

---

## Features

- **OCR pipeline** — Tesseract (PDF + image) with retry on partial extraction
- **Pydantic v2 validation** — strict schema, monetary coercion, total consistency check
- **Deterministic audit rules** — duplicate detection (exact + fuzzy), amount threshold, weekend/future-date, currency whitelist
- **LLM-assisted checks** — LangChain + GPT-4o-mini for semantic anomalies (optional, gated by `LLM_ENABLED=true`)
- **Eval harness** — field-level accuracy vs ground truth, edge case documentation
- **6 demo documents** — clean, duplicate, missing field, policy violation, vendor mismatch, OCR retry

---

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
| `POLICY_ALLOWED_CURRENCIES` | `USD,EUR,GBP,INR` | Comma-separated allowed currencies |
| `POLICY_ALLOW_WEEKEND_EXPENSES` | `false` | Allow weekend-dated expenses |
