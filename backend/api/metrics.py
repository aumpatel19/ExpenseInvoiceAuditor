from fastapi import APIRouter
from db.mongo import documents_col, audit_results_col

router = APIRouter()


@router.get("/metrics/summary")
async def get_metrics_summary():
    # Document status counts
    pipeline = [
        {"$group": {"_id": "$status", "count": {"$sum": 1}}}
    ]
    status_cursor = documents_col().aggregate(pipeline)
    status_results = await status_cursor.to_list(length=20)
    status_map = {item["_id"]: item["count"] for item in status_results}

    total = sum(status_map.values())

    # Audit outcome counts
    audit_pipeline = [
        {"$group": {"_id": "$overall_status", "count": {"$sum": 1}}}
    ]
    audit_cursor = audit_results_col().aggregate(audit_pipeline)
    audit_results = await audit_cursor.to_list(length=20)
    audit_map = {item["_id"]: item["count"] for item in audit_results}

    # Duplicate and policy violation findings count
    dup_pipeline = [
        {"$unwind": "$findings"},
        {"$match": {"findings.finding_type": {"$in": ["exact_duplicate", "fuzzy_duplicate"]}}},
        {"$count": "count"},
    ]
    dup_cursor = audit_results_col().aggregate(dup_pipeline)
    dup_result = await dup_cursor.to_list(length=1)
    duplicate_count = dup_result[0]["count"] if dup_result else 0

    policy_pipeline = [
        {"$unwind": "$findings"},
        {
            "$match": {
                "findings.finding_type": {
                    "$in": [
                        "policy_amount_exceeded",
                        "weekend_expense",
                        "future_dated",
                        "unsupported_currency",
                        "unusually_large_amount",
                        "missing_tax",
                    ]
                }
            }
        },
        {"$count": "count"},
    ]
    policy_cursor = audit_results_col().aggregate(policy_pipeline)
    policy_result = await policy_cursor.to_list(length=1)
    policy_violation_count = policy_result[0]["count"] if policy_result else 0

    return {
        "total_documents": total,
        "by_status": status_map,
        "approved": audit_map.get("approved", 0),
        "flagged": audit_map.get("flagged", 0),
        "needs_manual_review": audit_map.get("needs_manual_review", 0),
        "rejected": audit_map.get("rejected", 0),
        "validation_failed": status_map.get("validation_failed", 0),
        "duplicate_count": duplicate_count,
        "policy_violation_count": policy_violation_count,
    }
