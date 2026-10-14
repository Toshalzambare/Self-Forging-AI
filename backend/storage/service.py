"""
MinIO/S3-compatible object storage service wrapper.
Uses boto3 with the S3 API — works identically against AWS S3 if endpoint is changed.
"""
import io
import logging
import uuid
import boto3
from botocore.client import Config as BotoConfig
from config import config
from storage.extractor import extract_text_from_document

logger = logging.getLogger(__name__)


def _get_client():
    protocol = "https" if config.MINIO_USE_SSL else "http"
    endpoint = f"{protocol}://{config.MINIO_ENDPOINT}"
    return boto3.client(
        "s3",
        endpoint_url=endpoint,
        aws_access_key_id=config.MINIO_ACCESS_KEY,
        aws_secret_access_key=config.MINIO_SECRET_KEY,
        config=BotoConfig(
            signature_version="s3v4",
            connect_timeout=3,
            read_timeout=10,
            retries={"max_attempts": 1},
        ),
        region_name="us-east-1",  # MinIO doesn't enforce region; required by boto3
    )


def check_storage_connection() -> bool:
    """Health check — returns True if MinIO is reachable."""
    try:
        client = _get_client()
        client.list_buckets()
        return True
    except Exception:
        return False


def ensure_bucket_exists(bucket: str) -> None:
    """Verify or auto-create an S3 bucket in MinIO."""
    try:
        client = _get_client()
        try:
            client.head_bucket(Bucket=bucket)
        except Exception:
            client.create_bucket(Bucket=bucket)
            logger.info("Created S3 bucket '%s'", bucket)
    except Exception as exc:
        logger.warning("Could not verify/create bucket '%s': %s", bucket, str(exc))


def upload_file(bucket: str, key: str, data: bytes, content_type: str = "application/octet-stream") -> str:
    """Upload bytes to MinIO. Returns the object key."""
    client = _get_client()
    client.put_object(Bucket=bucket, Key=key, Body=data, ContentType=content_type)
    return key


def download_file(bucket: str, key: str) -> bytes:
    """Download object from MinIO. Returns raw bytes."""
    client = _get_client()
    response = client.get_object(Bucket=bucket, Key=key)
    return response["Body"].read()


def delete_file(bucket: str, key: str) -> None:
    """Delete object from MinIO."""
    client = _get_client()
    client.delete_object(Bucket=bucket, Key=key)


def upload_document(
    user_id: str,
    conversation_id: str,
    filename: str,
    data: bytes,
    content_type: str = "application/octet-stream"
) -> tuple[str, str]:
    """
    Extracts text from document, uploads bytes to MinIO S3 bucket,
    and returns tuple of (s3_key, extracted_text).
    """
    bucket = config.MINIO_BUCKET_DOCS
    ensure_bucket_exists(bucket)

    doc_id = uuid.uuid4().hex[:12]
    safe_filename = filename.replace("/", "_").replace("\\", "_")
    s3_key = f"{user_id}/{conversation_id}/{doc_id}_{safe_filename}"

    # Extract text from content
    extracted_text = extract_text_from_document(filename, data, content_type)

    # Upload to MinIO
    upload_file(bucket=bucket, key=s3_key, data=data, content_type=content_type)
    logger.info("Uploaded document '%s' to S3 key '%s' (%d bytes)", filename, s3_key, len(data))

    return s3_key, extracted_text
