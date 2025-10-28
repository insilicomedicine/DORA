"""
Storage factory module for creating appropriate storage instances based on configuration.
"""

from typing import Union

from django.conf import settings

from base.storage.blob import BlobStorage
from base.storage.defs import (
    AllowedBlobPresignedMethods,
    AllowedBucketPresignedMethods,
    AllowedStoragePresignedMethods,
)
from base.storage.s3 import S3Storage


class UnifiedStorage:
    """
    Wrapper class that provides a unified interface for both S3 and Blob Storage.
    """

    def __init__(self, storage):
        self._storage = storage
        self._is_s3 = isinstance(storage, S3Storage)

    def __getattr__(self, name):
        """Delegate all other method calls to the underlying storage."""
        return getattr(self._storage, name)

    def generate_presigned_url(
        self,
        client_method: str,
        file_key: str,
        expires_in: int = 3600,
    ) -> str:
        """
        Generate presigned URL with unified method names.

        Args:
            client_method: Unified method name ('get' or 'put')
            file_key: Key/path of the file
            expires_in: URL expiration time in seconds

        Returns:
            Presigned URL string
        """
        # Map unified method names to backend-specific names
        if client_method == AllowedStoragePresignedMethods.GET:
            backend_method = (
                AllowedBucketPresignedMethods.GET_OBJECT
                if self._is_s3
                else AllowedBlobPresignedMethods.GET_BLOB
            )
        elif client_method == AllowedStoragePresignedMethods.PUT:
            backend_method = (
                AllowedBucketPresignedMethods.PUT_OBJECT
                if self._is_s3
                else AllowedBlobPresignedMethods.PUT_BLOB
            )
        else:
            # If it's already a backend-specific method, pass it through
            backend_method = client_method

        return self._storage.generate_presigned_url(backend_method, file_key, expires_in)


def get_storage(
    container_name: Union[str, None] = None,
    bucket_name: Union[str, None] = None,
    region_name: Union[str, None] = None,
):
    """
    Factory function to return the appropriate storage backend based on STORAGE_BACKEND setting.

    Args:
        container_name: Azure Blob Storage container name (used when STORAGE_BACKEND='blob')
        bucket_name: S3 bucket name (used when STORAGE_BACKEND='s3')
        region_name: S3 region name (used when STORAGE_BACKEND='s3')

    Returns:
        UnifiedStorage instance wrapping either BlobStorage or S3Storage
    """
    storage_backend = getattr(settings, "STORAGE_BACKEND", "blob").lower()

    if storage_backend == "s3":
        storage = S3Storage(bucket_name=bucket_name, region_name=region_name)
    elif storage_backend == "blob":
        storage = BlobStorage(container_name=container_name)
    else:
        raise ValueError(f"Unsupported STORAGE_BACKEND: {storage_backend}. Must be 's3' or 'blob'.")

    return UnifiedStorage(storage)
