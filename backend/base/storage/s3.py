import logging
from typing import Any, Dict, List, Union

import boto3
from botocore.client import Config
from botocore.exceptions import ClientError
from django.conf import settings

from base.storage.defs import AllowedBucketPresignedMethods

logger = logging.getLogger(__name__)


class S3Storage:
    S3_CONNECT_TIMEOUT = 30
    S3_CONNECT_MAX_RETRIES = 2

    def __init__(self, bucket_name: Union[str, None] = None, region_name: Union[str, None] = None) -> None:
        self.bucket_name = settings.AWS_STORAGE_BUCKET if bucket_name is None else bucket_name
        self.region_name = settings.AWS_STORAGE_REGION if region_name is None else region_name

        # Defensive check: boto3 will raise an opaque ValueError if bucket name is None/empty.
        # Give a clearer message to help operators configure the environment correctly.
        if not self.bucket_name:
            raise ValueError(
                "S3 bucket name is not configured. Please set `settings.AWS_STORAGE_BUCKET` "
                "or pass `bucket_name` to S3Storage()."
            )

        config = Config(
            connect_timeout=self.S3_CONNECT_TIMEOUT,
            retries={"max_attempts": self.S3_CONNECT_MAX_RETRIES},
            s3={"addressing_style": "virtual" if not settings.S3_ENDPOINT_URL else "path"},
        )

        session_params = {
            "region_name": self.region_name,
            "aws_access_key_id": settings.AWS_ACCESS_KEY_ID,
            "aws_secret_access_key": settings.AWS_SECRET_ACCESS_KEY,
        }

        self.session = boto3.session.Session(**session_params)
        self.s3 = self.session.resource("s3", config=config, endpoint_url=settings.S3_ENDPOINT_URL)
        self.bucket = self.s3.Bucket(self.bucket_name)

        self._ensure_bucket_exists()

    def _ensure_bucket_exists(self):
        # only for self-hosted S3
        if not settings.S3_ENDPOINT_URL:
            return

        try:
            self.s3.meta.client.head_bucket(Bucket=self.bucket_name)
        except ClientError:
            self.s3.meta.client.create_bucket(Bucket=self.bucket_name)

    def key_exists(self, key: str) -> bool:
        try:
            self.s3.Object(self.bucket_name, key).load()
            return True
        except ClientError as exc:
            logger.info(f"{key}: {exc}")
            return False

    def put_file(self, key: str, content: bytes, overwrite=False):
        if not overwrite and self.key_exists(key):
            logger.info(f"Key {key} already in s3")
            return key
        return self.bucket.put_object(Key=key, Body=content)

    def get_file_object(self, key: str) -> Dict[str, Any]:
        return self.bucket.Object(key).get()

    def get_file_contents(self, key: str) -> bytes:
        return self.get_file_object(key)["Body"].read()

    def remove(self, key: str) -> Dict[str, Any]:
        return self.bucket.Object(key).delete()

    def find_keys(self, prefix: str) -> List[str]:
        keys = [obj.key for obj in self.bucket.objects.filter(Prefix=prefix)]
        return keys

    def generate_presigned_bucket_url(
        self,
        client_method: str,
        file_key: str,
        expires_in: int = 3600,
    ) -> str:
        if client_method not in AllowedBucketPresignedMethods.METHODS:
            raise ValueError(f"{client_method=} is not allowed for bucket's presigned URLs")

        try:
            url = self.s3.meta.client.generate_presigned_url(
                ClientMethod=client_method,
                Params={"Bucket": self.bucket_name, "Key": file_key},
                ExpiresIn=expires_in,
            )

            # with this and the nginx config to bypass the signature mismatch error
            if settings.S3_ENDPOINT_URL:
                url = url.replace(settings.S3_ENDPOINT_URL, f"{settings.DORA_PUBLIC_URL}/s3")

            return url
        except ClientError as error:
            raise ValueError(
                f"Couldn't get a presigned URL for {client_method=} and {file_key=}. Error: {error}"
            )

    def generate_presigned_url(
        self,
        client_method: str,
        file_key: str,
        expires_in: int = 3600,
    ) -> str:
        """Unified method name for compatibility with BlobStorage."""
        return self.generate_presigned_bucket_url(client_method, file_key, expires_in)
