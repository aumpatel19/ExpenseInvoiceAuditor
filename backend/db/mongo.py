from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase
from config import settings

_client: AsyncIOMotorClient = None
_db: AsyncIOMotorDatabase = None


async def connect_db():
    global _client, _db
    _client = AsyncIOMotorClient(settings.mongo_uri)
    _db = _client[settings.db_name]
    # Create indexes
    await _db["documents"].create_index("id", unique=True)
    await _db["documents"].create_index("status")
    await _db["documents"].create_index("vendor_name")
    await _db["documents"].create_index("created_at")
    await _db["extracted_payloads"].create_index("document_id", unique=True)
    await _db["audit_results"].create_index("document_id", unique=True)
    await _db["audit_results"].create_index("overall_status")
    await _db["evaluation_runs"].create_index("created_at")
    await _db["policy_rules"].create_index("rule_id", unique=True)
    await _db["processing_logs"].create_index("document_id")
    await _db["file_storage"].create_index("document_id", unique=True)
    print(f"[DB] Connected to MongoDB: {settings.db_name}")


async def close_db():
    global _client
    if _client:
        _client.close()
        print("[DB] MongoDB connection closed.")


def get_db() -> AsyncIOMotorDatabase:
    return _db


# Collection accessors
def documents_col():
    return _db["documents"]


def extracted_payloads_col():
    return _db["extracted_payloads"]


def audit_results_col():
    return _db["audit_results"]


def evaluation_runs_col():
    return _db["evaluation_runs"]


def policy_rules_col():
    return _db["policy_rules"]


def processing_logs_col():
    return _db["processing_logs"]


def ground_truth_col():
    return _db["ground_truth_samples"]


def file_storage_col():
    return _db["file_storage"]
