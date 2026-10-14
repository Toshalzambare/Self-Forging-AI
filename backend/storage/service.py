"""
MinIO/S3-compatible object storage service wrapper.
Uses boto3 with the S3 API — works identically against AWS S3 if endpoint is changed.
"""
import boto3
from botocore.client import Config as BotoConfig
from config import config


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
