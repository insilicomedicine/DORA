import logging
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, List, Union

from azure.core.exceptions import AzureError, ResourceExistsError, ResourceNotFoundError
from azure.storage.blob import BlobServiceClient, ExponentialRetry
from django.conf import settings

from base.storage.defs import AllowedBlobPresignedMethods

logger = logging.getLogger(__name__)


class BlobStorage:
    BLOB_CONNECT_TIMEOUT = 30
    BLOB_MAX_RETRIES = 2

    def __init__(self, container_name: Union[str, None] = None) -> None:
        self.container_name = settings.AZURE_STORAGE_CONTAINER if container_name is None else container_name

        retry_policy = ExponentialRetry(
            initial_backoff=1,  # initial backoff 1 second
            increment_base=2,   # exponential backoff multiplier
            retry_total=self.BLOB_MAX_RETRIES,
            retry_to_secondary=False,
        )

        # Authentication choice: connection string OR explicit account credentials
        if (
            hasattr(settings, 'AZURE_STORAGE_CONNECTION_STRING')
            and settings.AZURE_STORAGE_CONNECTION_STRING
        ):
            conn_str = settings.AZURE_STORAGE_CONNECTION_STRING
            self.account_name = self._extract_account_name_from_connection_string(conn_str)
            self.account_key = self._extract_account_key_from_connection_string(conn_str)
            self.blob_service_client = BlobServiceClient.from_connection_string(
                conn_str,
                connection_timeout=self.BLOB_CONNECT_TIMEOUT,
                retry_policy=retry_policy,
            )
        else:
            self.account_name = settings.AZURE_STORAGE_ACCOUNT_NAME
            self.account_key = settings.AZURE_STORAGE_ACCOUNT_KEY
            suffix = getattr(
                settings,
                'AZURE_STORAGE_DOMAIN_SUFFIX',
                'blob.core.windows.net',
            )
            normalized_suffix = suffix.strip()
            account_url = f"https://{self.account_name}.{normalized_suffix}"
            self.blob_service_client = BlobServiceClient(
                account_url=account_url,
                credential=self.account_key,
                connection_timeout=self.BLOB_CONNECT_TIMEOUT,
                retry_policy=retry_policy,
            )

        self.container_client = self.blob_service_client.get_container_client(
            self.container_name
        )
        self._ensure_container_exists()

    def _extract_account_name_from_connection_string(self, conn_str: str) -> str:
        """Extract account name from Azure connection string."""
        for part in conn_str.split(';'):
            if part.startswith('AccountName='):
                return part.split('=', 1)[1]
        raise ValueError("AccountName not found in connection string")

    def _extract_account_key_from_connection_string(self, conn_str: str) -> str:
        """Extract account key from Azure connection string."""
        for part in conn_str.split(';'):
            if part.startswith('AccountKey='):
                return part.split('=', 1)[1]
        raise ValueError("AccountKey not found in connection string")

    def _ensure_container_exists(self):
        # Similar to S3's bucket creation logic - only create if needed
        # For production Azure Blob Storage, containers should be pre-created
        # This is mainly for development/testing environments
        auto_create = getattr(settings, 'AZURE_STORAGE_AUTO_CREATE_CONTAINER', False)
        if not auto_create:
            return

        try:
            self.container_client.get_container_properties()
        except ResourceNotFoundError:
            try:
                self.container_client.create_container()
                logger.info(f"Created container: {self.container_name}")
            except ResourceExistsError:
                # Container was created by another process
                pass

    def key_exists(self, key: str) -> bool:
        """Check whether a blob exists.

        Uses BlobClient.exists() to avoid raising exceptions that create noisy logs
        and to properly handle 404 responses. Also catches AzureError to provide
        diagnostic logging for network/authentication failures.
        """
        try:
            blob_client = self.container_client.get_blob_client(key)
            return blob_client.exists()
        except ResourceNotFoundError:
            return False
        except AzureError as exc:  # Azure SDK layer errors (authentication / network / quota, etc.)
            logger.warning(f"blob.key_exists azure error key={key}: {exc}", exc_info=True)
            return False
        except Exception as exc:  # catch-all unexpected errors (e.g., third-party monkey patches)
            logger.error(f"blob.key_exists unexpected error key={key}: {exc}", exc_info=True)
            return False

    def put_file(self, key: str, content: bytes, overwrite=False) -> Any:
        if not overwrite and self.key_exists(key):
            logger.info(f"Key {key} already in blob storage")
            return key

        blob_client = self.container_client.get_blob_client(key)
        return blob_client.upload_blob(content, overwrite=True)

    def get_file_object(self, key: str) -> Dict[str, Any]:
        blob_client = self.container_client.get_blob_client(key)
        blob_properties = blob_client.get_blob_properties()
        blob_data = blob_client.download_blob()

        return {
            "Body": blob_data,
            "ContentLength": blob_properties.size,
            "ContentType": blob_properties.content_settings.content_type or "application/octet-stream",
            "LastModified": blob_properties.last_modified,
            "ETag": blob_properties.etag
        }

    def get_file_contents(self, key: str) -> bytes:
        blob_client = self.container_client.get_blob_client(key)
        blob_data = blob_client.download_blob()
        return blob_data.readall()

    def remove(self, key: str) -> Dict[str, Any]:
        blob_client = self.container_client.get_blob_client(key)
        blob_client.delete_blob()
        return {"Deleted": True}

    def find_keys(self, prefix: str) -> List[str]:
        blobs = self.container_client.list_blobs(name_starts_with=prefix)
        keys = [blob.name for blob in blobs]
        return keys

    def generate_presigned_blob_url(
        self,
        client_method: str,
        file_key: str,
        expires_in: int = 3600,
    ) -> str:
        if client_method not in AllowedBlobPresignedMethods.METHODS:
            raise ValueError(f"{client_method=} is not allowed for blob's presigned URLs")

        # Ensure we have the necessary credentials for SAS generation
        if not self.account_name or not self.account_key:
            raise ValueError(
                "Account name and key are required for generating presigned URLs. "
                "Ensure AZURE_STORAGE_ACCOUNT_NAME and AZURE_STORAGE_ACCOUNT_KEY are set."
            )

        try:
            from azure.storage.blob import BlobSasPermissions, generate_blob_sas

            blob_client = self.container_client.get_blob_client(file_key)

            # Set permissions based on method
            if client_method == AllowedBlobPresignedMethods.GET_BLOB:
                permissions = BlobSasPermissions(read=True)
            elif client_method == AllowedBlobPresignedMethods.PUT_BLOB:
                permissions = BlobSasPermissions(write=True, create=True)
            else:
                raise ValueError(f"Unsupported client method: {client_method}")

            # Generate SAS token
            sas_token = generate_blob_sas(
                account_name=self.account_name,
                container_name=self.container_name,
                blob_name=file_key,
                account_key=self.account_key,
                permission=permissions,
                expiry=datetime.now(timezone.utc) + timedelta(seconds=expires_in)
            )

            # Construct the full URL (blob_client.url already has correct cloud suffix / sovereign domain)
            url = f"{blob_client.url}?{sas_token}"

            return url

        except (AzureError, ValueError) as error:
            raise ValueError(
                f"Couldn't get a presigned URL for {client_method=} and {file_key=}. Error: {error}"
            ) from error
