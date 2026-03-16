"""
Pytest tests for the deterministic audit rule engine.
Uses in-memory mock data to verify each check fires correctly.
"""
import pytest
from datetime import date, timedelta
from unittest.mock import AsyncMock, patch

from schemas.document import ExtractedDocument, DocumentType
from schemas.audit import FindingSeverity, FindingSource
from services.audit.rule_engine import _check_missing_fields, run_rule_checks


def make_doc(**kwargs):
    defaults = {
        "document_type": DocumentType.invoice,
        "vendor_name": "Test Vendor",
        "total_amount": 500.00,
        "currency": "USD",
        "invoice_date": date.today() - timedelta(days=1),
        "invoice_number": "INV-001",
    }
    defaults.update(kwargs)
    return ExtractedDocument(**defaults)


# ─── Missing field checks ─────────────────────────────────────────────────────

def test_no_findings_for_clean_doc():
    doc = make_doc()
    findings = _check_missing_fields(doc)
    assert len(findings) == 0


def test_missing_vendor_detected():
    doc = make_doc(vendor_name=None)
    findings = _check_missing_fields(doc)
    types = [f.finding_type for f in findings]
    assert "missing_vendor_name" in types


def test_missing_amount_detected():
    # total_amount is required, so use a partial approach
    doc = make_doc()
    object.__setattr__(doc, "total_amount", None)
    findings = _check_missing_fields(doc)
    types = [f.finding_type for f in findings]
    assert "missing_total_amount" in types


# ─── Rule engine full checks (mock DB) ────────────────────────────────────────

@pytest.mark.asyncio
async def test_amount_threshold_flagged():
    doc = make_doc(total_amount=1500.00)
    with patch("services.audit.rule_engine.extracted_payloads_col") as mock_col:
        mock_col.return_value.find_one = AsyncMock(return_value=None)
        mock_col.return_value.find = AsyncMock(return_value=AsyncMock(to_list=AsyncMock(return_value=[])))
        findings = await run_rule_checks("doc-001", doc, {"amount_threshold": 1000.0})
    types = [f.finding_type for f in findings]
    assert "policy_amount_exceeded" in types
    assert any(f.severity == FindingSeverity.high for f in findings)


@pytest.mark.asyncio
async def test_future_date_flagged():
    doc = make_doc(invoice_date=date.today() + timedelta(days=30))
    with patch("services.audit.rule_engine.extracted_payloads_col") as mock_col:
        mock_col.return_value.find_one = AsyncMock(return_value=None)
        mock_col.return_value.find = AsyncMock(return_value=AsyncMock(to_list=AsyncMock(return_value=[])))
        findings = await run_rule_checks("doc-002", doc)
    types = [f.finding_type for f in findings]
    assert "future_dated" in types


@pytest.mark.asyncio
async def test_weekend_expense_flagged():
    # Find next Saturday
    today = date.today()
    days_until_sat = (5 - today.weekday()) % 7 or 7
    last_sat = today - timedelta(days=(today.weekday() + 2) % 7 or 7)
    doc = make_doc(invoice_date=last_sat)
    with patch("services.audit.rule_engine.extracted_payloads_col") as mock_col:
        mock_col.return_value.find_one = AsyncMock(return_value=None)
        mock_col.return_value.find = AsyncMock(return_value=AsyncMock(to_list=AsyncMock(return_value=[])))
        findings = await run_rule_checks("doc-003", doc, {"allow_weekend_expenses": False})
    types = [f.finding_type for f in findings]
    assert "weekend_expense" in types


@pytest.mark.asyncio
async def test_clean_doc_no_findings():
    doc = make_doc(total_amount=200.00)
    with patch("services.audit.rule_engine.extracted_payloads_col") as mock_col:
        mock_col.return_value.find_one = AsyncMock(return_value=None)
        mock_col.return_value.find = AsyncMock(return_value=AsyncMock(to_list=AsyncMock(return_value=[])))
        findings = await run_rule_checks("doc-004", doc)
    assert len(findings) == 0
