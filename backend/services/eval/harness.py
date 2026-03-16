import logging
import uuid
from datetime import datetime
from typing import List, Optional

from schemas.eval import EvalRun, EvalRunResult, FieldAccuracyResult, GroundTruthSample
from db.mongo import ground_truth_col, evaluation_runs_col, extracted_payloads_col

logger = logging.getLogger(__name__)

# Fields to compare in field-level accuracy
EVAL_FIELDS = [
    "vendor_name",
    "total_amount",
    "currency",
    "invoice_number",
    "invoice_date",
    "document_type",
    "subtotal",
    "tax",
]


def _compare_field(field: str, expected, actual) -> FieldAccuracyResult:
    """Compare a single field. Handles fuzzy numeric and string comparison."""
    if expected is None and actual is None:
        return FieldAccuracyResult(field_name=field, expected=expected, actual=actual, match=True)

    if expected is None or actual is None:
        return FieldAccuracyResult(
            field_name=field, expected=expected, actual=actual, match=False,
            note="One side is null"
        )

    # Numeric comparison with tolerance
    if isinstance(expected, (int, float)) and isinstance(actual, (int, float)):
        match = abs(float(expected) - float(actual)) < 0.01
        return FieldAccuracyResult(field_name=field, expected=expected, actual=actual, match=match)

    # String comparison (case-insensitive strip)
    match = str(expected).strip().lower() == str(actual).strip().lower()
    return FieldAccuracyResult(field_name=field, expected=expected, actual=actual, match=match)


async def run_eval(sample_ids: Optional[List[str]] = None) -> EvalRun:
    """
    Run the evaluation harness.
    Compares extracted payloads in MongoDB against ground truth samples.
    """
    start_time = datetime.utcnow()

    # Load ground truth samples
    query = {}
    if sample_ids:
        query = {"sample_id": {"$in": sample_ids}}
    cursor = ground_truth_col().find(query, {"_id": 0})
    samples_raw = await cursor.to_list(length=500)
    samples = [GroundTruthSample(**s) for s in samples_raw]

    if not samples:
        logger.warning("[Eval] No ground truth samples found.")
        return _empty_run(start_time)

    results: List[EvalRunResult] = []
    edge_cases: List[str] = []
    total_validation_pass = 0

    for sample in samples:
        # Find extracted payload for this document_id
        extracted_raw = None
        if sample.document_id:
            extracted_raw = await extracted_payloads_col().find_one(
                {"document_id": sample.document_id}, {"_id": 0}
            )

        if not extracted_raw:
            results.append(EvalRunResult(
                sample_id=sample.sample_id,
                description=sample.description,
                field_results=[],
                field_accuracy=0.0,
                passed=False,
                failure_reason="No extracted payload found for this sample.",
            ))
            edge_cases.append(f"{sample.description}: No extracted payload found")
            continue

        field_results = []
        for field in EVAL_FIELDS:
            expected_val = sample.expected.get(field)
            actual_val = extracted_raw.get(field)
            field_results.append(_compare_field(field, expected_val, actual_val))

        # Field-level accuracy for this sample
        matched = sum(1 for fr in field_results if fr.match)
        accuracy = round(matched / len(field_results), 3) if field_results else 0.0
        passed = accuracy >= 0.75

        if passed:
            total_validation_pass += 1
        else:
            edge_cases.append(
                f"{sample.description}: accuracy={accuracy:.0%}, "
                f"missing: {[fr.field_name for fr in field_results if not fr.match]}"
            )

        results.append(EvalRunResult(
            sample_id=sample.sample_id,
            description=sample.description,
            field_results=field_results,
            field_accuracy=accuracy,
            passed=passed,
        ))

    total = len(results)
    passed_count = sum(1 for r in results if r.passed)
    overall_accuracy = round(sum(r.field_accuracy for r in results) / total, 3) if total else 0.0
    validation_pass_rate = round(total_validation_pass / total, 3) if total else 0.0

    elapsed_ms = (datetime.utcnow() - start_time).total_seconds() * 1000

    run = EvalRun(
        run_id=str(uuid.uuid4()),
        total_samples=total,
        passed=passed_count,
        failed=total - passed_count,
        overall_accuracy=overall_accuracy,
        validation_pass_rate=validation_pass_rate,
        avg_processing_time_ms=round(elapsed_ms / total, 1) if total else None,
        results=results,
        edge_cases=edge_cases,
    )

    # Persist
    await evaluation_runs_col().insert_one(run.model_dump())
    logger.info(f"[Eval] Run complete: accuracy={overall_accuracy:.0%}, pass_rate={validation_pass_rate:.0%}")
    return run


def _empty_run(start_time: datetime) -> EvalRun:
    return EvalRun(
        run_id=str(uuid.uuid4()),
        total_samples=0,
        passed=0,
        failed=0,
        overall_accuracy=0.0,
        validation_pass_rate=0.0,
        results=[],
        edge_cases=["No ground truth samples found in database."],
        notes="Run seed.py first to populate ground truth samples.",
    )
