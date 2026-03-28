# AuditFlow — Expense & Invoice Auditor

> Upload invoices and expense documents, extract data automatically with OCR, and catch policy violations before they cost you.

**Live Demo → [expense-invoice-auditor.vercel.app](https://expense-invoice-auditor.vercel.app)**

---

## What it does

AuditFlow is a full-stack web app that helps individuals and teams audit their expense documents and invoices. Upload a PDF or image, and the app automatically:

- Extracts key fields (vendor, amount, date, currency, tax) using OCR
- Runs the document against your custom policy rules
- Flags violations like excessive amounts, weekend expenses, future dates, duplicates, and missing fields
- Keeps a full audit trail with a processing timeline

Every account is isolated — your documents and policies are private to you.

---

## Features

- **OCR Extraction** — Tesseract-powered text extraction from PDFs and images
- **Smart Auditing** — 8 built-in policy rules out of the box, fully customizable
- **Per-User Isolation** — Each account has its own data, documents, and policies
- **Dashboard** — Visual summary of flagged vs approved documents
- **Document Search** — Full-text search across all your uploaded documents
- **Evaluation Harness** — Test OCR accuracy against ground truth samples
- **Dark / Light Mode** — Theme toggle built in
- **Secure Auth** — JWT-based authentication with bcrypt password hashing

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 16, TypeScript, Framer Motion |
| Backend | FastAPI (Python), Motor (async MongoDB) |
| Database | MongoDB Atlas |
| OCR | Tesseract + Poppler |
| Auth | JWT + bcrypt |
| Hosting | Vercel (frontend) · Railway (backend) |

---

## Policy Rules (Default)

Every new account starts with these rules enabled:

| Rule | Description | Severity |
|---|---|---|
| Amount Threshold | Flag documents exceeding a set amount | High |
| Unusually Large Amount | Flag amounts 2× over threshold | High |
| Currency Whitelist | Only allow approved currencies | Medium |
| No Weekend Expenses | Flag expenses on Saturday/Sunday | Medium |
| Future-Dated Documents | Flag documents dated in the future | High |
| Missing Critical Fields | Flag missing vendor, total, or date | High |
| Duplicate Detection | Flag exact or fuzzy duplicate invoices | High |
| Missing Tax on Subtotal | Flag subtotal without a tax amount | Low |

All rules can be toggled, edited, or deleted from the Policies page.

---

## Pages

| Route | Description |
|---|---|
| `/` | Dashboard — metrics and recent documents |
| `/upload` | Drag-and-drop file upload with pipeline stepper |
| `/documents` | Full document list with filters |
| `/documents/[id]` | Detail view — extracted JSON, audit findings, timeline |
| `/eval` | Evaluation harness — OCR field accuracy |
| `/policies` | Policy rules — create, edit, toggle, delete |

---

## Running Locally

### Prerequisites
- Python 3.11+
- Node.js 18+
- MongoDB (local or Atlas)
- [Tesseract OCR](https://github.com/UB-Mannheim/tesseract/wiki)
- [Poppler](https://github.com/oschwartz10612/poppler-windows/releases) (for PDF support)

### Backend

```bash
cd backend
pip install -r requirements.txt
```

Create a `.env` file in `backend/`:
```
MONGO_URI=your_mongodb_connection_string
JWT_SECRET=your_secret_key
CORS_ORIGINS=http://localhost:3000
APP_ENV=development
```

```bash
uvicorn main:app --reload --port 8080
```

### Frontend

```bash
cd frontend
npm install
```

Create a `.env.local` file in `frontend/`:
```
NEXT_PUBLIC_API_URL=/api/v1
```

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000), create an account, and start uploading.

---

## Project Structure

```
ExpenseInvoiceAuditor/
├── backend/
│   ├── api/           # Route handlers (auth, documents, policies, metrics, eval)
│   ├── db/            # MongoDB connection and collections
│   ├── auth.py        # JWT + bcrypt authentication
│   ├── config.py      # Environment config
│   ├── main.py        # FastAPI app entry point
│   └── Dockerfile     # Production container
└── frontend/
    ├── app/           # Next.js App Router pages
    ├── app/components # UI components
    └── lib/api.ts     # API client
```

---

## License

MIT
