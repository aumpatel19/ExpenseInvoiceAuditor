import logging
from datetime import datetime
from typing import Optional, Dict, Any

from db.mongo import processing_logs_col

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)


def get_logger(name: str) -> logging.Logger:
    return logging.getLogger(name)


async def log_stage(
    document_id: str,
    stage: str,
    status: str,
    message: str,
    details: Optional[Dict[str, Any]] = None,
):
    """Append a structured log entry to processing_logs for a given document."""
    entry = {
        "document_id": document_id,
        "timestamp": datetime.utcnow(),
        "stage": stage,
        "status": status,
        "message": message,
        "details": details or {},
    }
    try:
        await processing_logs_col().insert_one(entry)
    except Exception as e:
        logging.getLogger(__name__).error(f"Failed to write processing log: {e}")


async def get_logs(document_id: str):
    """Retrieve all processing log entries for a document, ordered by time."""
    cursor = processing_logs_col().find(
        {"document_id": document_id}, {"_id": 0}
    ).sort("timestamp", 1)
    return await cursor.to_list(length=200)
