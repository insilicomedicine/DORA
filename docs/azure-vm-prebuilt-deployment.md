```markdown
# Azure VM deployment using prebuilt container images

## 1. Architecture overview

### 1.1 Scope and constraints
- Deploy all DORA services on a single Azure Linux virtual machine using prebuilt container images.
- Frontend and backend images are stored in Azure Container Registry (ACR). Third-party base images (nginx, PostgreSQL, Redis, etc.) are pulled from Docker Hub.
- Azure resources to create: virtual machine, virtual network (VNet, subnet, NSG, public IP, NIC), a data disk to store database/Redis/static files, and a Storage Account (for blobs).
- The GitHub repository stays private. The deployment template is published as an Azure Template Spec and access is controlled with RBAC.
- Authentication to ACR uses an ACR token (login/password). Managed identity or role assignment is not required. ACR may live in a different resource group or subscription.

### 1.2 Deployment flow
1. Build and push frontend/backend images to ACR.
2. Publish the Bicep template as an Azure Template Spec.
3. Create Azure resources from the Template Spec.
4. VM auto-initializes using cloud-init: installs Docker, mounts data disk, writes configuration, pulls images and starts services.
5. Verify the deployment by SSHing into the VM and inspecting services.

## 2. Deployment assets in this repository

### 2.1 Main files
- `infra/azure/vm-prebuilt/deploy.bicep`: Bicep infrastructure template
  - Creates network resources (VNet, Subnet, NSG, Public IP, NIC)
  - Creates an Ubuntu 22.04 VM and a Premium SSD data disk
  - Creates a Storage Account and a Blob container
  - Injects a cloud-init configuration into the VM

- `infra/azure/vm-prebuilt/cloud-init.yaml`: VM initialization script/configuration
  - Installs Docker and Docker Compose
  - Formats and mounts the data disk
  - Generates `.env` and `docker-compose.yml` files
  - Logs into ACR using the provided ACR token credentials
  - Pulls images and starts the DORA service stack
  - Loads initial data (creates default user, etc.)

- `infra/azure/vm-prebuilt/parameters.example.json`: example parameters file
  - Contains all required and optional deployment parameters
  - Copy this to `parameters.json` and fill in real values before deploying

### 2.2 Helper scripts
- `scripts/acr/deploy-to-acr.sh`: create ACR and push images
- `scripts/publish-template-spec.sh`: publish the Bicep template as a Template Spec
- `scripts/deploy-dora-template.sh`: deploy using a Template Spec

## 3. Prerequisites

### 3.1 Azure environment
- Azure CLI 2.53+ installed (check with `az --version`).
- You need Contributor (or equivalent) permissions on the target subscription/resource group.
- Images must be pushed to ACR before running the deployment. You can run deploy-to-acr.sh to crate ACR and push images. 

### 3.2 ACR access credentials
- Create an ACR token that has repository/pull scope (for example, a scope map that allows read/pull).
- Obtain the token username and password (token password) and keep them secure.
- Example using Azure CLI:
```bash
az acr token create --name doradevuser --registry doradev --scope-map _repositories_pull
az acr token credential generate --name doradevuser --registry doradev
```

Note: You can also create tokens via the Azure Portal (ACR → Tokens → Create).

### 3.3 SSH key pair
- Prepare an SSH public key for VM access.
- Example generation:
```bash
ssh-keygen -t ed25519 -C "dora-vm"
# public key: ~/.ssh/id_ed25519.pub
```

### 3.4 Django SECRET_KEY
- Generate a random Django SECRET_KEY for use by the application (used for session signing, CSRF, etc.).
- Example:
```bash
python -c "import secrets; print(secrets.token_urlsafe(48))"
```

## 4. Deployment parameters

### 4.1 Parameters file
Edit `infra/azure/vm-prebuilt/parameters.json` (copy from `parameters.example.json` and update values).

Security note: this file contains sensitive information (ACR token credentials, API keys). Do not commit it to version control.

### 4.2 Parameter descriptions

| Name | Required | Description | Default | Example |
|------|----------|-------------|---------|--------|
| `location` | required | Azure region | `resourceGroup().location` | `GermanyWestCentral` |
| `vmName` | optional | Virtual machine name | `dora-vm` | `dora-vm` |
| `vmSize` | optional | VM size | `Standard_D8s_v5` | `Standard_D8s_v5` |
| `dnsLabelPrefix` | optional | DNS label for the public IP FQDN | `dora` | `dora` → `dora.<region>.cloudapp.azure.com` |
| `adminUsername` | required | SSH admin username for the VM | `azureuser` | `azureuser` |
| `adminSshPublicKey` | required | SSH public key content | | `cat ~/.ssh/id_ed25519.pub` |
| `acrLoginServer` | required | ACR login server (registry endpoint) | | `doraacr.azurecr.io` |
| `acrTokenUsername` | required | ACR token username | | Created in Azure Portal or CLI |
| `acrTokenPassword` | required | ACR token password/value | | Generated with the token creation |
| `dataDiskSizeGB` | optional | Size of the attached data disk in GB | `128` | `128` |
| `secretKey` | required | Django SECRET_KEY value | | See section 3.4 |
| `storageContainerName` | optional | Blob container name in the Storage Account | | `media` |
| `openAiApiKey` | optional | Azure OpenAI (or other) API key | | From Azure AI service or other provider |
| `openAiApiType` | optional | API type for LLM calls | `azure` | `azure` / `openai` / `custom` |
| `openAiApiBaseUrl` | optional | Base URL for the API endpoint | | `https://<your-endpoint>.cognitiveservices.azure.com/` |
| `openAiApiVersion` | optional | API version | | `2025-01-01-preview` |
| `openAiDeploymentName` | optional | Model deployment name | | `gpt-5` |
| `embeddingOpenAiApiConfigs` | optional | JSON array of embedding model configurations | | see example below |

Embedding configuration example (stored as a JSON string in the parameters file):
```json
"embeddingOpenAiApiConfigs": {
  "value": "[{\"model\":\"text-embedding-3-small\",\"api_key\":\"<your-key>\",\"base_url\":\"https://<your-endpoint>/\",\"version\":\"2024-12-01-preview\",\"deployment_name\":\"text-embedding-3-small\"}]"
}
```

## 5. Publish the Template Spec

### 5.1 Using the included script (Linux / macOS / WSL / Git Bash)
```bash
./scripts/run-publish-template-spec.sh
```

This helper script calls `publish-template-spec.sh` with pre-configured parameters.

### 5.2 Script arguments
- `-ResourceGroupName`: resource group that will contain the Template Spec
- `-TemplateSpecName`: name of the Template Spec
- `-TemplateSpecVersion`: version (semantic versioning, e.g. `1.0.0`)
- `-SubscriptionId`: (optional) subscription ID
- `-Location`: (optional) region; defaults to the resource group's region

### 5.3 Verify the published Template Spec
Use the Azure CLI to inspect the published Template Spec:
```bash
az ts show \
  --resource-group "RG-IT-DORA-NPD" \
  --name "doraVMPrebuilt" \
  --version "1.0.0"
```

On success the command returns the Template Spec details, including the `id` of the Template Spec version.

## 6. Run the deployment

### 6.1 Using the deployment script (Linux / macOS / WSL / Git Bash)
```bash
./scripts/deploy-dora-template.sh
```

The script will:
1. Set the target subscription
2. Resolve the Template Spec ID
3. Deploy the resources using `parameters.json`

### 6.2 Using Azure Portal
1. Open the Template deployment page:
```
https://portal.azure.com/#create/Microsoft.Template
```
2. Select the Template Spec to deploy
3. Fill in the deployment parameters
4. Review + Create

## 7. VM auto-initialization (cloud-init)

After the VM is provisioned, cloud-init performs the following steps:

### 7.1 Initialization steps
1. System packages are updated and essential utilities are installed (Docker, curl, jq, etc.).
2. The attached data disk is formatted (ext4) and mounted at `/mnt/dora-data`.
   - Directories created: `postgres`, `redis`, `logs`, `static`.
   - The mount is added to `/etc/fstab` for automatic mounting on boot.
3. Application configuration files are created under `/opt/dora`:
   - `docker-compose.yml` — container composition for the DORA stack
   - `.env` — environment variables (contains secrets and config)
   - `nginx.conf` — reverse proxy configuration
   - `bootstrap.sh` — startup helper script used by cloud-init
4. The VM logs into ACR with the provided token, pulls images from ACR/Docker Hub and starts containers:
   - `dora_db` (PostgreSQL)
   - `dora_redis` (Redis)
   - `dora_backend` (Django app)
   - `dora_worker` (Celery worker)
   - `dora_backend_ws` (WebSocket service)
   - `frontend` (frontend app)
   - `nginx` (reverse proxy)
5. Initial data is loaded after the database is ready: migrations are run and `initial_data.json` is imported (creates default user `dora@test.com`).

### 7.2 Logs and troubleshooting
SSH into the VM:
```bash
ssh azureuser@<public-ip>
```

Check cloud-init and bootstrap logs:
```bash
sudo cat /var/log/cloud-init-output.log
sudo cat /var/log/dora-bootstrap.log
```

Check containers and container logs:
```bash
docker ps
docker logs dora_backend
docker logs dora_worker
```

## 8. Verify the deployment

### 8.1 Basic connectivity checks
```bash
# 1. SSH connectivity
ssh azureuser@<public-ip>

# 2. List running containers (should show the DORA containers)
docker ps

# 3. Inspect service status with ports
docker ps --format 'table {{.Names}}\t{{.Status}}\t{{.Ports}}'
```

### 8.2 Logs
```bash
# View recent bootstrap output
sudo tail -n 50 /var/log/dora-bootstrap.log

# View backend logs
docker logs dora_backend --tail 50

# Tail backend logs in real time
docker logs -f dora_backend
```

### 8.3 Web access
1. Open a browser to the VM public IP or DNS name:
```
http://<public-ip>
or
http://dora.<region>.cloudapp.azure.com
```

2. Login credentials (default initial user created by initial_data.json):
- Username: `dora@test.com`
- Password: `dora`

3. Admin UI:
```
http://<public-ip>/admin
```

## 9. FAQ

Q: How is the repository kept private?

A: The Bicep template is published as an Azure Template Spec and access is controlled with RBAC; the GitHub repository itself can remain private.

Q: Does ACR need to be in the same resource group as the VM?

A: No. When using ACR tokens for authentication, the registry can reside in any resource group or subscription.

Q: How can I extend the template parameters?

A: Add a parameter to `deploy.bicep`, add a placeholder in `cloud-init.yaml` and use Bicep functions (for example `replace()`) to inject it into cloud-init.

Q: Can I deploy to Azure sovereign clouds (China / Government)?

A: The template uses `environment().suffixes.storage` and the public IP FQDN format, so it should adapt to different clouds. Make sure to `az login --tenant <...>` into the correct cloud environment before publishing/deploying.

```
