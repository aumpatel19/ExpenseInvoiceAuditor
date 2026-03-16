# guidelines.md

## Purpose
This repository must build only one product:
**Expense & Invoice Auditor**

It is an OCR-to-JSON audit system for invoices and receipts using:
- Python
- FastAPI
- LangChain
- JSON Schema / Pydantic
- MongoDB

Do not expand beyond this scope.

---

## Core Build Rules

### 1. Stay inside scope
Only implement features directly tied to:
- upload
- OCR extraction
- JSON normalization
- schema validation
- retries
- error handling
- duplicate detection
- missing field detection
- policy violation detection
- LLM-assisted audit checks
- evaluation harness
- dashboard/history/detail views

Do NOT add:
- generic chatbot pages
- unrelated AI features
- social features
- billing/subscriptions
- ERP/payment integrations
- mobile app
- CRM
- vendor portals
- unnecessary authentication complexity
- landing page marketing sections unrelated to the product

---

## 2. Backend is the source of truth
This project is backend-heavy.

Prioritize:
1. FastAPI architecture
2. Pydantic models
3. validation logic
4. audit rule engine
5. persistence in MongoDB
6. stable API contracts
7. frontend consumption

The frontend must reflect real backend outputs, not mocked fantasy logic.

---

## 3. Deterministic first, LLM second
Use deterministic code for:
- required field checks
- amount/date checks
- duplicate checks
- policy threshold checks
- validation failures
- consistency checks

Use LangChain/LLM only for:
- ambiguous semantic classification
- fuzzy reasoning when rules are inconclusive
- human-readable explanations
- optional soft anomaly interpretation

Never use the LLM as the only validation layer.
Never let the LLM override hard validation rules.

---

## 4. Strict schema discipline
All extracted data must pass through strict Pydantic models.

Requirements:
- explicit field typing
- normalized date handling
- numeric validation for money
- optional vs required fields clearly defined
- structured error reporting
- invalid payloads must not silently pass

No loose dictionaries in core business logic unless at ingestion boundaries.

---

## 5. Modular service architecture
Keep the code modular.

Recommended modules:
- `api/`
- `schemas/`
- `services/ocr/`
- `services/extraction/`
- `services/validation/`
- `services/audit/`
- `services/llm/`
- `services/eval/`
- `db/`
- `models/`
- `utils/`

Separate concerns cleanly.

---

## 6. OCR provider abstraction
OCR must be abstracted behind an interface/service layer.

Reason:
- provider may change later
- extraction pipeline should not depend on one vendor implementation

Avoid hard-coding OCR behavior across the app.

---

## 7. Traceability and debugging
Every processed document should retain:
- raw file metadata
- extraction result
- validation result
- audit findings
- processing status
- structured logs
- retry attempts
- error messages

This project should feel debuggable and audit-friendly.

---

## 8. Real statuses only
Use meaningful states such as:
- uploaded
- processing
- extracted
- validation_failed
- audited
- needs_review
- error

Do not use vague states.

---

## 9. Audit explainability
Every audit finding must include:
- finding type
- severity
- explanation
- whether it came from deterministic logic or LLM assistance

The user should always understand why a document was flagged.

---

## 10. UI principles
The UI should be:
- clean
- modern
- minimal
- enterprise-like
- trustworthy
- easy to scan

Prefer:
- clear tables
- status chips
- expandable findings
- JSON viewer
- processing timeline
- filter/search controls

Avoid:
- flashy gradients everywhere
- gimmicky animations
- consumer-social design
- cluttered dashboards

---

## 11. Demo-friendly but realistic
This should be a polished portfolio project, not a toy.

It must look and behave like a real internal audit tool.
Use seeded demo data that showcases:
- successful processing
- duplicates
- missing fields
- policy violations
- OCR failures
- retry recovery
- manual review cases

---

## 12. Evaluation harness is required
Include an evaluation feature for extraction/validation quality.

It should support:
- sample ground truth comparison
- field accuracy tracking
- pass/fail stats
- documented edge cases
- debugging visibility

Do not skip this.

---

## 13. MongoDB usage
Persist useful, queryable objects such as:
- documents
- extracted payloads
- audit results
- eval runs
- logs
- policy configs

Do not use MongoDB as a dumping ground for random unstructured data without model intent.

---

## 14. API design rules
FastAPI endpoints must be:
- clear
- typed
- versionable if needed
- documented through schema
- aligned to product workflow

Use clean request/response models.
Do not mix presentation concerns into backend schemas.

---

## 15. Frontend rules
Frontend should:
- consume real API responses
- show upload and processing flow clearly
- expose extracted JSON and findings cleanly
- include filters and history
- support easy demo walkthrough

Do not overbuild frontend complexity before backend logic works.

---

## 16. Error handling rules
The app must gracefully handle:
- unsupported file types
- OCR failure
- partial extraction
- schema validation failure
- DB write failure
- duplicate detection ambiguity
- LLM timeout or failure

LLM failure must not break the full audit pipeline.
Fallbacks must exist.

---

## 17. Performance mindset
Keep the app practical:
- async or background-friendly architecture for processing
- avoid blocking UX where possible
- show processing states clearly
- optimize for understandable flow, not premature scale theater

---

## 18. Code quality rules
Require:
- typed code
- clean naming
- small focused functions
- minimal duplication
- comments only where useful
- no dead files
- no placeholder junk
- no fake implementations hidden as complete work

---

## 19. Portfolio outcome
The final app should make it obvious that the builder can:
- design document-processing backends
- enforce schemas with Pydantic
- combine deterministic checks with LLM support responsibly
- persist audit results cleanly
- build evaluation workflows
- ship a real product-style internal tool

---

## 20. Absolute constraint
Do not do anything else.
Do not pivot product direction.
Do not add unrelated features.
Do not simplify away the core pipeline.
Build the Expense & Invoice Auditor exactly as defined.