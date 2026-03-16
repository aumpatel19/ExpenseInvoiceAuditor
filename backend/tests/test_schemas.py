"""
Pytest tests for Pydantic schemas — validates models reject invalid payloads
and accept valid ones correctly.
"""
import pytest
from datetime import date
from pydantic import ValidationError

from schemas.document import ExtractedDocument, DocumentType, DocumentStatus, LineItem
from schemas.audit import AuditFinding, FindingSeverity, FindingSource, AuditResult, AuditStatus
from schemas.policy import PolicyRule, PolicyRuleType
import uuid


# ─── ExtractedDocument ────────────────────────────────────────────────────────

def test_extracted_document_valid():
    doc = ExtractedDocument(
        document_type=DocumentType.invoice,
        vendor_name="Acme Corp",
        total_amount=850.00,
        currency="USD",
        invoice_date=date(2024, 1, 15),
        subtotal=750.00,
        tax=100.00,
    )
    assert doc.vendor_name == "Acme Corp"
    assert doc.total_amount == 850.00
    assert doc.currency == "USD"


def test_extracted_document_missing_vendor_fails():
    with pytest.raises(ValidationError):
        ExtractedDocument(
            document_type=DocumentType.invoice,
            vendor_name=None,
            total_amount=500.00,
            currency="USD",
        )


def test_extracted_document_monetary_coercion():
    doc = ExtractedDocument(
        document_type=DocumentType.receipt,
        vendor_name="Coffee House",
        total_amount="$12.50",  # string with $ sign — should coerce
        currency="USD",
    )
    assert doc.total_amount == 12.50


def test_extracted_document_currency_normalized():
    doc = ExtractedDocument(
        document_type=DocumentType.invoice,
        vendor_name="OverseasVendor",
        total_amount=200.00,
        currency="eur ",  # lowercase with space — should normalize
    )
    assert doc.currency == "EUR"


def test_extracted_document_total_inconsistency_raises():
    with pytest.raises(ValidationError):
        ExtractedDocument(
            document_type=DocumentType.invoice,
            vendor_name="Test Vendor",
            total_amount=200.00,   # inconsistent
            subtotal=100.00,
            tax=50.00,             # 100+50=150 ≠ 200 (delta > 1.0)
            currency="USD",
        )


def test_extracted_document_total_within_tolerance():
    # delta = 0.01 which is within 1.0 tolerance
    doc = ExtractedDocument(
        document_type=DocumentType.invoice,
        vendor_name="Test Vendor",
        total_amount=150.01,
        subtotal=100.00,
        tax=50.00,
        currency="USD",
    )
    assert doc.total_amount == 150.01


# ─── AuditFinding ─────────────────────────────────────────────────────────────

def test_audit_finding_valid():
    finding = AuditFinding(
        finding_id=str(uuid.uuid4()),
        finding_type="policy_amount_exceeded",
        severity=FindingSeverity.high,
        source=FindingSource.deterministic,
        explanation="Amount exceeds $1000 threshold.",
    )
    assert finding.severity == FindingSeverity.high
    assert finding.source == FindingSource.deterministic


# ─── AuditResult ─────────────────────────────────────────────────────────────

def test_audit_result_valid():
    result = AuditResult(
        document_id="test-doc-123",
        overall_status=AuditStatus.approved,
        confidence=0.95,
        findings=[],
    )
    assert result.overall_status == AuditStatus.approved
    assert result.confidence == 0.95


def test_audit_result_invalid_confidence():
    with pytest.raises(ValidationError):
        AuditResult(
            document_id="test-doc",
            overall_status=AuditStatus.flagged,
            confidence=1.5,  # > 1.0, invalid
            findings=[],
        )
