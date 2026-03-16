import logging
import uuid
from typing import List

from schemas.document import ExtractedDocument
from schemas.audit import AuditFinding, FindingSeverity, FindingSource
from config import settings

logger = logging.getLogger(__name__)


def _llm_finding(
    finding_type: str,
    severity: FindingSeverity,
    explanation: str,
    field_ref: str = None,
    metadata: dict = None,
) -> AuditFinding:
    return AuditFinding(
        finding_id=str(uuid.uuid4()),
        finding_type=finding_type,
        severity=severity,
        source=FindingSource.llm_assisted,
        explanation=explanation,
        field_ref=field_ref,
        metadata=metadata,
    )


async def run_llm_checks(
    document_id: str,
    doc: ExtractedDocument,
    raw_text: str,
) -> List[AuditFinding]:
    """
    Run LLM-assisted audit checks using LangChain.
    Only called if LLM_ENABLED=true in config.
    Falls back gracefully if LLM call fails — does NOT break the main pipeline.
    """
    if not settings.llm_enabled:
        logger.info("[LLM] LLM checks disabled. Skipping.")
        return []

    try:
        return await _invoke_llm(document_id, doc, raw_text)
    except Exception as e:
        logger.warning(f"[LLM] LLM audit check failed (non-fatal): {e}")
        return [
            _llm_finding(
                finding_type="llm_unavailable",
                severity=FindingSeverity.low,
                explanation=f"LLM-assisted checks could not be completed: {str(e)[:120]}",
                metadata={"error": str(e)},
            )
        ]


async def _invoke_llm(
    document_id: str,
    doc: ExtractedDocument,
    raw_text: str,
) -> List[AuditFinding]:
    from langchain_openai import ChatOpenAI
    from langchain_core.prompts import ChatPromptTemplate
    from langchain_core.output_parsers import JsonOutputParser

    llm = ChatOpenAI(
        model="gpt-4o-mini",
        temperature=0,
        api_key=settings.openai_api_key,
    )

    prompt = ChatPromptTemplate.from_messages([
        ("system", """You are an expert financial auditor. Given a document's extracted fields and raw text, identify:
1. Ambiguous expense category (infer if not set)
2. Any suspicious patterns in the description or vendor name not caught by rule-based checks
3. A brief, human-readable overall audit explanation

Respond ONLY with valid JSON in this exact format:
{{
  "category": "<inferred category or null>",
  "suspicious_patterns": ["<pattern1>", "<pattern2>"],
  "audit_explanation": "<1-2 sentence summary>",
  "severity": "low|medium|high"
}}"""),
        ("human", """Document type: {doc_type}
Vendor: {vendor}
Amount: {currency} {amount}
Date: {date}
Category: {category}
Raw text snippet (first 600 chars):
{raw_text}"""),
    ])

    chain = prompt | llm | JsonOutputParser()

    result = await chain.ainvoke({
        "doc_type": doc.document_type.value,
        "vendor": doc.vendor_name or "Unknown",
        "currency": doc.currency,
        "amount": doc.total_amount,
        "date": str(doc.invoice_date or doc.expense_date or "Unknown"),
        "category": doc.category or "Not set",
        "raw_text": (raw_text or "")[:600],
    })

    findings = []

    if result.get("suspicious_patterns"):
        severity_map = {"low": FindingSeverity.low, "medium": FindingSeverity.medium, "high": FindingSeverity.high}
        sev = severity_map.get(result.get("severity", "medium"), FindingSeverity.medium)
        for pattern in result["suspicious_patterns"]:
            findings.append(_llm_finding(
                finding_type="suspicious_pattern",
                severity=sev,
                explanation=f"AI-Assisted: {pattern}",
                field_ref="description",
                metadata={"pattern": pattern},
            ))

    if result.get("audit_explanation"):
        findings.append(_llm_finding(
            finding_type="llm_audit_summary",
            severity=FindingSeverity.low,
            explanation=f"AI Summary: {result['audit_explanation']}",
            metadata={"inferred_category": result.get("category")},
        ))

    return findings
