"""
File storage abstraction.
Uses S3/R2 when S3_BUCKET_NAME is configured, falls back to MongoDB otherwise.
This means local dev works with zero extra setup.
"""
import asyncio
import io
import logging
from typing import Optional

from config import settings
from db.mongo import file_storage_col

logger = logging.getLogger(__name__)


async def save_file(document_id: str, username: str, file_bytes: bytes, mime_type: str) -> None:
    if settings.s3_bucket_name:
        try:
            await _save_to_s3(document_id, file_bytes, mime_type)
            return
        except Exception as e:
            logger.error(f"[Storage] S3 save failed for {document_id}, falling back to MongoDB: {e}")

    await _save_to_mongo(document_id, username, file_bytes, mime_type)


async def load_file(document_id: str) -> tuple[Optional[bytes], Optional[str]]:
    if settings.s3_bucket_name:
        try:
            result = await _load_from_s3(document_id)
            if result[0] is not None:
                return result
        except Exception as e:
            logger.error(f"[Storage] S3 load failed for {document_id}, falling back to MongoDB: {e}")

    return await _load_from_mongo(document_id)


async def _save_to_s3(document_id: str, file_bytes: bytes, mime_type: str) -> None:
    import boto3

    s3 = boto3.client(
        "s3",
        aws_access_key_id=settings.aws_access_key_id or None,
        aws_secret_access_key=settings.aws_secret_access_key or None,
        region_name=settings.aws_region,
        endpoint_url=settings.s3_endpoint_url or None,
    )
    key = f"documents/{document_id}"
    loop = asyncio.get_event_loop()
    await loop.run_in_executor(
        None,
        lambda: s3.upload_fileobj(
            io.BytesIO(file_bytes),
            settings.s3_bucket_name,
            key,
            ExtraArgs={"ContentType": mime_type},
        ),
    )
    logger.info(f"[Storage] Saved {document_id} to S3 ({len(file_bytes)} bytes)")


async def _load_from_s3(document_id: str) -> tuple[Optional[bytes], Optional[str]]:
    import boto3

    s3 = boto3.client(
        "s3",
        aws_access_key_id=settings.aws_access_key_id or None,
        aws_secret_access_key=settings.aws_secret_access_key or None,
        region_name=settings.aws_region,
        endpoint_url=settings.s3_endpoint_url or None,
    )
    key = f"documents/{document_id}"
    buf = io.BytesIO()
    loop = asyncio.get_event_loop()
    try:
        head = await loop.run_in_executor(
            None,
            lambda: s3.head_object(Bucket=settings.s3_bucket_name, Key=key),
        )
        mime_type: str = head.get("ContentType", "application/octet-stream")
        await loop.run_in_executor(
            None,
            lambda: s3.download_fileobj(settings.s3_bucket_name, key, buf),
        )
        return buf.getvalue(), mime_type
    except Exception as e:
        logger.warning(f"[Storage] S3 object not found for {document_id}: {e}")
        return None, None


async def _save_to_mongo(document_id: str, username: str, file_bytes: bytes, mime_type: str) -> None:
    await file_storage_col().replace_one(
        {"document_id": document_id},
        {"document_id": document_id, "username": username,
         "file_bytes": file_bytes, "mime_type": mime_type},
        upsert=True,
    )


async def _load_from_mongo(document_id: str) -> tuple[Optional[bytes], Optional[str]]:
    stored = await file_storage_col().find_one({"document_id": document_id})
    if not stored:
        return None, None
    return stored["file_bytes"], stored["mime_type"]
