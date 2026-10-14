"""Storage package — MinIO/S3 object storage wrapper."""
from storage.service import (
    upload_file,
    download_file,
    delete_file,
    check_storage_connection,
)

__all__ = [
    "upload_file",
    "download_file",
    "delete_file",
    "check_storage_connection",
]
