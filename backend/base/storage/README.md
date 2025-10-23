# Storage Backend Configuration

## Overview

The DORA backend supports two storage backends:
- **Azure Blob Storage** (default)
- **AWS S3**

You can switch between them using the `STORAGE_BACKEND` environment variable.

## Configuration

### Environment Variable

Set `STORAGE_BACKEND` in your `.env` file:

```bash
# Use Azure Blob Storage (default)
STORAGE_BACKEND=blob

# Or use AWS S3
STORAGE_BACKEND=s3
```

### Azure Blob Storage Configuration

When using `STORAGE_BACKEND=blob`, configure the following variables:

```bash
# Required: Either use connection string
AZURE_STORAGE_CONNECTION_STRING=DefaultEndpointsProtocol=https;AccountName=...;AccountKey=...;EndpointSuffix=core.windows.net

# Or use explicit credentials
AZURE_STORAGE_ACCOUNT_NAME=your_account_name
AZURE_STORAGE_ACCOUNT_KEY=your_account_key

# Required
AZURE_STORAGE_CONTAINER=your_container_name

# Optional: Auto-create container if it doesn't exist (useful for development)
AZURE_STORAGE_AUTO_CREATE_CONTAINER=False

# Optional: For sovereign clouds (Azure China, Government, etc.)
AZURE_STORAGE_DOMAIN_SUFFIX=blob.core.windows.net  # Default
# AZURE_STORAGE_DOMAIN_SUFFIX=blob.core.chinacloudapi.cn  # For Azure China
```

### AWS S3 Configuration

When using `STORAGE_BACKEND=s3`, configure the following variables:

```bash
AWS_ACCESS_KEY_ID=your_access_key
AWS_SECRET_ACCESS_KEY=your_secret_key
AWS_STORAGE_BUCKET=your_bucket_name
AWS_STORAGE_REGION=your_region  # e.g., us-east-1

# Optional: For self-hosted S3-compatible services
S3_ENDPOINT_URL=http://localhost:9000  # Leave empty for AWS S3
```

## Usage in Code

### Using the Storage Factory

The recommended way to access storage is through the factory function:

```python
from base.storage.factory import get_storage

# Get storage instance (automatically uses configured backend)
storage = get_storage()

# Common operations
storage.put_file(key="path/to/file.txt", content=b"Hello World", overwrite=True)
storage.get_file_contents(key="path/to/file.txt")
storage.key_exists(key="path/to/file.txt")
storage.remove(key="path/to/file.txt")
storage.find_keys(prefix="path/to/")

# Generate presigned URLs (unified method names)
from base.storage.defs import AllowedStoragePresignedMethods

download_url = storage.generate_presigned_url(
    client_method=AllowedStoragePresignedMethods.GET,
    file_key="path/to/file.txt",
    expires_in=3600
)

upload_url = storage.generate_presigned_url(
    client_method=AllowedStoragePresignedMethods.PUT,
    file_key="path/to/file.txt",
    expires_in=3600
)
```

### Mermaid Diagram Storage

For Mermaid diagrams, use the unified `MermaidStorage` class:

```python
from kernel.diagrams.storage import MermaidStorage

storage = MermaidStorage()
storage.put_png(mermaid_diagram_pk=123, content=png_bytes)
png_data = storage.get_png(mermaid_diagram_pk=123)
```

## Migration from Direct Usage

If you have code that directly uses `BlobStorage()` or `S3Storage()`, migrate to the factory:

**Before:**
```python
from base.storage.blob import BlobStorage

storage = BlobStorage()
```

**After:**
```python
from base.storage.factory import get_storage

storage = get_storage()
```

**Before (Mermaid):**
```python
from kernel.diagrams.blob import MermaidBlob

storage = MermaidBlob()
```

**After (Mermaid):**
```python
from kernel.diagrams.storage import MermaidStorage

storage = MermaidStorage()
```

## Architecture

The storage system consists of:

1. **Base Storage Classes** (`base/storage/`)
   - `s3.py` - S3Storage class for AWS S3
   - `blob.py` - BlobStorage class for Azure Blob Storage
   - `defs.py` - Constants and method definitions
   - `factory.py` - Factory function and UnifiedStorage wrapper

2. **Unified Interface**
   - Both storage backends implement the same interface
   - Method names are normalized through `UnifiedStorage` wrapper
   - Presigned URL methods are unified via `AllowedStoragePresignedMethods`

3. **Specialized Storage** (`kernel/diagrams/`)
   - `storage.py` - MermaidStorage for diagram-specific operations
   - `s3.py` - Legacy MermaidS3 (still available but not recommended)
   - `blob.py` - Legacy MermaidBlob (still available but not recommended)

## Testing

To test with different backends:

1. **Test with Azure Blob Storage:**
   ```bash
   export STORAGE_BACKEND=blob
   export AZURE_STORAGE_CONNECTION_STRING="..."
   export AZURE_STORAGE_CONTAINER="test-container"
   ```

2. **Test with S3:**
   ```bash
   export STORAGE_BACKEND=s3
   export AWS_ACCESS_KEY_ID="..."
   export AWS_SECRET_ACCESS_KEY="..."
   export AWS_STORAGE_BUCKET="test-bucket"
   export AWS_STORAGE_REGION="us-east-1"
   ```

3. **Test with local S3 emulator (like MinIO):**
   ```bash
   export STORAGE_BACKEND=s3
   export S3_ENDPOINT_URL="http://localhost:9000"
   export AWS_ACCESS_KEY_ID="minioadmin"
   export AWS_SECRET_ACCESS_KEY="minioadmin"
   export AWS_STORAGE_BUCKET="test-bucket"
   export AWS_STORAGE_REGION="us-east-1"
   ```
