"""Cloudflare R2 storage service for video files.

This module provides functions for uploading and downloading files
to/from Cloudflare R2 using boto3 S3-compatible API.
"""

import os
from typing import BinaryIO, Optional

import boto3
from botocore.exceptions import ClientError

from app.config import settings
from app.core.exceptions import CrewgoException
from app.core.logging import get_logger

logger = get_logger(__name__)


class StorageServiceException(CrewgoException):
    """Exception raised by storage service."""

    def __init__(self, message: str):
        super().__init__(
            message=message,
            code="STORAGE_ERROR",
            status_code=500,
        )


# Initialize S3 client for R2
s3_client = boto3.client(
    "s3",
    endpoint_url=f"https://{settings.r2_account_id}.r2.cloudflarestorage.com",
    aws_access_key_id=settings.r2_access_key_id,
    aws_secret_access_key=settings.r2_secret_access_key,
    region_name="auto",
)


def upload_file(
    file_path: str,
    object_key: str,
    content_type: str = "video/mp4",
) -> str:
    """Upload a file to R2 storage.

    Args:
        file_path: Local file path to upload
        object_key: S3 object key (path in bucket)
        content_type: MIME type of the file

    Returns:
        Public URL of uploaded file

    Raises:
        StorageServiceException: If upload fails
    """
    try:
        if not os.path.exists(file_path):
            raise StorageServiceException(f"File not found: {file_path}")

        with open(file_path, "rb") as file:
            s3_client.upload_fileobj(
                file,
                settings.r2_bucket_name,
                object_key,
                ExtraArgs={"ContentType": content_type},
            )

        # Construct public URL
        public_url = f"{settings.r2_public_url}/{object_key}"
        logger.info(f"Uploaded file to R2: {object_key}")
        return public_url

    except ClientError as e:
        logger.error(f"R2 upload error: {str(e)}")
        raise StorageServiceException(f"Failed to upload file: {str(e)}")
    except Exception as e:
        logger.error(f"Unexpected error uploading file: {str(e)}")
        raise StorageServiceException(f"Failed to upload file: {str(e)}")


def upload_file_obj(
    file_obj: BinaryIO,
    object_key: str,
    content_type: str = "video/mp4",
) -> str:
    """Upload a file-like object to R2 storage.

    Args:
        file_obj: File-like object to upload
        object_key: S3 object key (path in bucket)
        content_type: MIME type of the file

    Returns:
        Public URL of uploaded file

    Raises:
        StorageServiceException: If upload fails
    """
    try:
        file_obj.seek(0)
        s3_client.upload_fileobj(
            file_obj,
            settings.r2_bucket_name,
            object_key,
            ExtraArgs={"ContentType": content_type},
        )

        public_url = f"{settings.r2_public_url}/{object_key}"
        logger.info(f"Uploaded file object to R2: {object_key}")
        return public_url

    except ClientError as e:
        logger.error(f"R2 upload error: {str(e)}")
        raise StorageServiceException(f"Failed to upload file: {str(e)}")
    except Exception as e:
        logger.error(f"Unexpected error uploading file: {str(e)}")
        raise StorageServiceException(f"Failed to upload file: {str(e)}")


def delete_file(object_key: str) -> bool:
    """Delete a file from R2 storage.

    Args:
        object_key: S3 object key (path in bucket)

    Returns:
        True if deletion successful, False otherwise
    """
    try:
        s3_client.delete_object(Bucket=settings.r2_bucket_name, Key=object_key)
        logger.info(f"Deleted file from R2: {object_key}")
        return True
    except ClientError as e:
        logger.error(f"R2 delete error: {str(e)}")
        return False
    except Exception as e:
        logger.error(f"Unexpected error deleting file: {str(e)}")
        return False


def get_file_url(object_key: str) -> str:
    """Get public URL for a file in R2.

    Args:
        object_key: S3 object key (path in bucket)

    Returns:
        Public URL
    """
    return f"{settings.r2_public_url}/{object_key}"
