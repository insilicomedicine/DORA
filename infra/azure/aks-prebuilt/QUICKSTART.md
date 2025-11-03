# DORA AKS Quick Start Guide | DORA AKS 快速开始指南

This guide will help you quickly deploy DORA to Azure Kubernetes Service.

本指南将帮助您快速部署 DORA 到 Azure Kubernetes Service。

## Prerequisites | 前置条件

Before you begin, ensure you have:

部署前请确保已安装:

- Azure CLI installed and logged in (`az login`) | Azure CLI 并已登录
- Terraform >= 1.0
- Helm >= 3.0
- kubectl
- Bash shell (Git Bash on Windows, or WSL) | Bash 终端（Windows 上使用 Git Bash 或 WSL）

### Check Your Azure Permissions | 检查 Azure 权限

Verify you have the necessary permissions:

验证您拥有必要的权限：

```bash
# Check current account
az account show

# List resource groups you can access
az group list --query "[].name" -o table

# Verify permissions on a specific resource group
az role assignment list \
  --scope "/subscriptions/<subscription-id>/resourceGroups/<your-rg-name>" \
  --assignee <your-email> \
  --query "[].roleDefinitionName" -o table
```

**Required Permissions: | 所需权限：**

- Contributor access to the main resource group (e.g., `RG-IT-DORA-NPD`) | 主资源组的 Contributor 权限
- Contributor access to the node resource group (e.g., `RG-IT-DORA-NPD-NODES`) | 节点资源组的 Contributor 权限

If you don't have permission to create resource groups, ask your Azure administrator to:

如果您没有创建资源组的权限，请联系 Azure 管理员：

1. Pre-create both resource groups | 预先创建两个资源组
2. Grant you Contributor access to both | 授予您对两个资源组的 Contributor 权限

See README.md for detailed permission configuration.

详细的权限配置请参考 README.md。

## Quick Deployment (3 Steps) | 快速部署（3 步）

### Step 1: Clone the Repository | 步骤 1：克隆代码仓库

```bash
git clone https://github.com/insilicomedicine/DORA.git
cd DORA/infra/azure/aks-prebuilt
```

### Step 2: Configure Deployment | 步骤 2：配置部署

Create your configuration file:

创建配置文件：

```bash
cd terraform
cp terraform.tfvars.example terraform.tfvars
# Edit terraform.tfvars with your settings
# 编辑 terraform.tfvars 进行配置
```

**Required Configuration | 必需配置**:

```hcl
# Azure Subscription ID (Required)
# Azure 订阅 ID（必需）
subscription_id = "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"

# Resource Group and Location (Required)
# 资源组和区域（必需）
resource_group_name = "dora-aks-rg"           # Your resource group name | 资源组名称
location            = "eastus"                # Azure region | Azure 区域
cluster_name        = "dora-aks"              # AKS cluster name | AKS 集群名称
```

**Required: OpenAI Configuration (Choose One) | 必需：OpenAI 配置（二选一）**:

Option 1: Standard OpenAI | 选项 1：标准 OpenAI:

```hcl
openai_api_key           = "sk-..."
openai_api_type          = "openai"
# openai_api_base_url is not needed for standard OpenAI
# 标准 OpenAI 不需要 openai_api_base_url
```

Option 2: Azure OpenAI | 选项 2：Azure OpenAI:

```hcl
openai_api_key           = "your-azure-openai-key"
openai_api_type          = "azure"
openai_api_base_url      = "https://your-instance.openai.azure.com"
openai_api_version       = "2025-01-01-preview"
openai_deployment_name   = "gpt-4"

# Embedding Configuration (Required for document processing)
# 嵌入模型配置（文档处理必需）
embedding_openai_api_configs = "[{\"model\":\"text-embedding-3-small\",\"api_key\":\"your-key\",\"base_url\":\"https://your-instance.openai.azure.com\",\"version\":\"2024-12-01-preview\",\"deployment_name\":\"text-embedding-3-small\"}]"
```

**Default Configuration (Optional to Change) | 默认配置（可选修改）**:

These have sensible defaults but can be customized:

这些配置有合理的默认值,但可以自定义：

```hcl
# AKS Configuration | AKS 配置
kubernetes_version = "1.31"                   # Kubernetes version | Kubernetes 版本
node_count         = 3                        # Number of nodes (default: 3) | 节点数量（默认：3）
node_vm_size       = "Standard_D4s_v5"        # VM size (default: Standard_D4s_v5) | 虚拟机大小

# PostgreSQL Configuration | PostgreSQL 配置
postgres_sku_name       = "GP_Standard_D4s_v3"  # Default SKU | 默认 SKU
postgres_storage_mb     = 131072                # 128GB (default) | 128GB（默认）
postgres_admin_username = "doraadmin"           # Default admin username | 默认管理员用户名

# Redis Configuration | Redis 配置
redis_sku_name  = "Standard"                  # Default: Standard | 默认：Standard
redis_family    = "C"                         # Default: C | 默认：C
redis_capacity  = 1                           # Default: 1 | 默认：1

# Docker Images | Docker 镜像
backend_image    = "insilicomed/dora-backend:blob"   # Default | 默认
frontend_image   = "insilicomed/dora-frontend:blob"  # Default | 默认

# DNS Configuration | DNS 配置
dns_label_prefix = "dora-demo"                # Custom DNS prefix (optional) | 自定义 DNS 前缀（可选）

# Storage Configuration | 存储配置
storage_account_tier        = "Standard"      # Default: Standard | 默认：Standard
storage_account_replication = "LRS"           # Default: LRS | 默认：LRS
storage_container_name      = "media"         # Default: media | 默认：media
```

**Advanced: Limited Permissions Scenario | 高级：权限受限场景**:

Only needed if you cannot create resource groups:

仅在无法创建资源组时需要：

```hcl
# Pre-created node resource group (only if required)
# 预创建的节点资源组（仅在必要时）
node_resource_group_name = "dora-aks-nodes-rg"
```

**Auto-generated Values | 自动生成的值**:

These values are automatically generated if not provided:

以下值如果未提供将自动生成：

- `postgres_admin_password`: PostgreSQL admin password | PostgreSQL 管理员密码
- `django_secret_key`: Django SECRET_KEY | Django 密钥

### Step 3: Deploy Everything | 步骤 3：一键部署

```bash
cd ..  # Back to aks-prebuilt directory | 返回 aks-prebuilt 目录
chmod +x deploy.sh
./deploy.sh
```

The script will:

部署脚本会自动：

1. Check prerequisites | 检查所有前置条件
2. Deploy Azure infrastructure (15-20 minutes) | 部署 Azure 基础设施（15-20 分钟）
3. Configure AKS cluster access | 配置 kubectl 访问 AKS 集群
4. Install NGINX Ingress Controller | 安装 NGINX Ingress Controller
5. Deploy DORA application | 使用 Helm 部署 DORA 应用

## Access Your Application | 访问您的应用

After deployment completes, the script will display:

部署完成后，脚本会显示：

```text
Application URL: http://dora-aks-xxxxx.eastus.cloudapp.azure.com
Ingress IP: xx.xx.xx.xx
```

Navigate to the URL to access your DORA application!

访问该 URL 即可使用您的 DORA 应用！

## Verify Deployment | 验证部署

```bash
# Check all pods are running | 检查所有 Pods 是否运行
kubectl get pods -n dora

# View backend logs | 查看后端日志
kubectl logs -n dora -l app.kubernetes.io/component=backend --tail=50

# Check ingress | 检查 Ingress
kubectl get ingress -n dora
```

## What Gets Deployed? | 部署了什么？

- **AKS Cluster**: 3-node Kubernetes cluster | 3 节点 Kubernetes 集群
- **PostgreSQL**: Managed PostgreSQL Flexible Server with pgvector | 托管的 PostgreSQL（含 pgvector 扩展）
- **Redis**: Azure Cache for Redis (Standard SKU, non-SSL) | Azure Cache for Redis（标准版，非 SSL）
- **Application** | **应用组件**:
  - **Nginx (独立 Pod)**: Application gateway handling all routing | 应用网关，处理所有路由
    - Frontend traffic → Frontend Pod | 前端流量 → Frontend Pod
    - API traffic (`/api`, `/admin`) → Backend Pod (uwsgi socket) | API 流量 → Backend Pod (uwsgi 套接字)
    - WebSocket (`/ws/`) → WebSocket Pod | WebSocket 流量 → WebSocket Pod
    - Static files (`/static/`) → Local serving | 静态文件 → 本地提供
  - **Backend**: Django + uWSGI (uwsgi socket :8080) | 后端（Django + uWSGI，uwsgi 套接字 :8080）
  - **Frontend**: React + Nginx (:8000) | 前端（React + Nginx :8000）
  - **Worker**: Celery tasks | Worker（Celery 任务队列）
  - **WebSocket**: Daphne ASGI (:8081) | WebSocket（Daphne ASGI :8081）
- **Ingress**: NGINX Ingress Controller with public IP | NGINX Ingress Controller（公网 IP）
- **Storage**: Azure Blob Storage for media files | Azure Blob Storage（媒体文件存储）

## Cost Estimate | 成本估算

Approximate monthly cost: **~$1,312/month** (US East region)

预估月度成本：**约 $1,312/月**（美国东部区域）

Breakdown | 明细:

- AKS: ~$730
- PostgreSQL: ~$320
- Redis: ~$250
- Other | 其他: ~$12

## Clean Up | 清理资源

To delete all resources:

删除所有资源：

```bash
# Delete Helm releases | 删除 Helm Release
helm uninstall dora -n dora
helm uninstall ingress-nginx -n ingress-nginx

# Delete Azure resources | 删除 Azure 资源
cd terraform
terraform destroy
```

## Troubleshooting | 故障排查

### Pods not starting? | Pods 无法启动？

```bash
kubectl describe pod <pod-name> -n dora
kubectl logs <pod-name> -n dora
```

### File upload returns 500 error? | 文件上传返回 500 错误？

This is usually related to Celery worker issues. Check:

这通常与 Celery Worker 相关。检查：

```bash
# Check worker pod logs | 查看 Worker Pod 日志
kubectl logs -n dora -l app=dora-worker --tail=100

# Verify Redis connection (should be redis:// not rediss://)
# 验证 Redis 连接（应该是 redis:// 而非 rediss://）
kubectl exec -n dora deployment/dora-backend -- env | grep REDIS
```

The deployment uses non-SSL Redis connection (port 6379) for Celery compatibility.

部署使用非 SSL Redis 连接（端口 6379）以兼容 Celery。

### Can't access the application? | 无法访问应用？

- Wait a few minutes for DNS to propagate | 等待几分钟让 DNS 传播生效
- Try accessing via IP address directly | 尝试直接使用 IP 地址访问
- Check NGINX Ingress Controller | 检查 NGINX Ingress Controller: `kubectl get pods -n ingress-nginx`

### Database or Redis connection issues? | 数据库或 Redis 连接问题？

Test connectivity from within the cluster:

从集群内部测试连接：

```bash
# Test PostgreSQL connection (should work from within VNet)
# 测试 PostgreSQL 连接（应该能从 VNet 内部连接）
kubectl run test-pg --image=postgres:16 -it --rm -n dora -- \
  psql -h <postgres-hostname> -U <username> -d dora

# Test Redis connection (should work through Private Endpoint)
# 测试 Redis 连接（应该能通过 Private Endpoint 连接）
kubectl run test-redis --image=redis:7 -it --rm -n dora -- \
  redis-cli -h <redis-hostname> -p 6379 -a <password> ping

# From outside the VNet (should fail - this is expected)
# 从 VNet 外部访问（应该失败 - 这是预期行为）
psql -h <postgres-hostname> -U <username> -d dora  # Should timeout | 应该超时
redis-cli -h <redis-hostname> -p 6379 ping         # Should timeout | 应该超时
```

**Network Security Note | 网络安全说明**: PostgreSQL and Redis are only accessible from within the Azure VNet. This is by design for security. External access attempts will timeout.

PostgreSQL 和 Redis 只能从 Azure VNet 内部访问。这是安全设计的一部分，外部访问尝试会超时。

### Need help? | 需要帮助？

See the full [README.md](./README.md) for detailed documentation and troubleshooting.

查看完整的 [README.md](./README.md) 获取详细文档和故障排查指南。

## Next Steps | 后续步骤

- Configure HTTPS/TLS for secure access | 配置 HTTPS/TLS 实现安全访问
- Set up CI/CD for automated deployments | 设置 CI/CD 实现自动化部署
- Configure Azure Monitor for observability | 配置 Azure Monitor 实现可观测性
- Enable autoscaling for production workloads | 为生产环境启用自动扩展

For detailed information, see the complete [README.md](./README.md).

详细信息请参考完整的 [README.md](./README.md)。

---

## Manual Deployment Steps (Advanced) | 手动部署步骤（高级）

If you want to manually control each step or customize the deployment:

如果您想手动控制每个步骤或自定义部署：

### Step 1: Configure Terraform Variables | 步骤 1：配置 Terraform 变量

```bash
cd terraform
cp terraform.tfvars.example terraform.tfvars
# Edit terraform.tfvars with your configuration
# 编辑 terraform.tfvars 进行配置
```

**Minimum Required Configuration | 最小必需配置**:

```hcl
# Azure Subscription (Required) | Azure 订阅（必需）
subscription_id = "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"

# Basic Configuration | 基础配置
resource_group_name = "dora-aks-rg"
location            = "eastus"              # Or your preferred region | 或您选择的区域
cluster_name        = "dora-aks"
```

**Required: AI Configuration (Choose One) | 必需：AI 配置（二选一）**:

```hcl
# Option 1: Standard OpenAI | 选项 1：标准 OpenAI
openai_api_key  = "sk-..."
openai_api_type = "openai"

# Option 2: Azure OpenAI | 选项 2：Azure OpenAI
openai_api_key         = "your-api-key"
openai_api_type        = "azure"
openai_api_base_url    = "https://your-instance.openai.azure.com"
openai_api_version     = "2025-01-01-preview"
openai_deployment_name = "gpt-4"

# Embedding Model (required for document processing)
# 嵌入模型（文档处理必需）
embedding_openai_api_configs = "[{\"model\":\"text-embedding-3-small\",\"api_key\":\"your-key\",\"base_url\":\"https://your-instance.openai.azure.com\",\"version\":\"2024-12-01-preview\",\"deployment_name\":\"text-embedding-3-small\"}]"
```

**Optional Customization | 可选自定义** (all have defaults | 都有默认值):

```hcl
# Custom DNS prefix | 自定义 DNS 前缀
dns_label_prefix = "dora-demo"

# Cluster size | 集群大小
node_count   = 3                    # Default: 3 | 默认：3
node_vm_size = "Standard_D4s_v5"    # Default | 默认

# Custom images | 自定义镜像
backend_image  = "insilicomed/dora-backend:latest"
frontend_image = "insilicomed/dora-frontend:latest"
```

See `terraform.tfvars.example` for all available options.

查看 `terraform.tfvars.example` 了解所有可用选项。

### Step 2: Deploy Infrastructure | 步骤 2：部署基础设施

```bash
cd terraform

# Initialize Terraform | 初始化 Terraform
terraform init

# Preview resources | 预览资源
terraform plan

# Deploy infrastructure | 部署基础设施
terraform apply
```

Deployment time | 部署时间: ~15-20 minutes | 约 15-20 分钟

### Step 3: Configure kubectl | 步骤 3：配置 kubectl

```bash
# Get AKS cluster credentials | 获取 AKS 集群凭据
CLUSTER_NAME=$(terraform output -raw aks_cluster_name)
RESOURCE_GROUP=$(terraform output -raw resource_group_name)

az aks get-credentials --resource-group $RESOURCE_GROUP --name $CLUSTER_NAME --overwrite-existing

# Verify connection | 验证连接
kubectl get nodes
```

### Step 4: Install NGINX Ingress | 步骤 4：安装 NGINX Ingress

```bash
# Add Helm repository | 添加 Helm 仓库
helm repo add ingress-nginx https://kubernetes.github.io/ingress-nginx
helm repo update

# Get public IP | 获取公网 IP
INGRESS_IP=$(terraform output -raw ingress_public_ip)
NODE_RG=$(az aks show --resource-group $RESOURCE_GROUP --name $CLUSTER_NAME --query nodeResourceGroup -o tsv)

# Install NGINX Ingress Controller | 安装 NGINX Ingress Controller
helm upgrade --install ingress-nginx ingress-nginx/ingress-nginx \
    --namespace ingress-nginx \
    --create-namespace \
    --set controller.service.loadBalancerIP=$INGRESS_IP \
    --set controller.service.annotations."service\.beta\.kubernetes\.io/azure-load-balancer-resource-group"=$NODE_RG \
    --set controller.service.externalTrafficPolicy=Local
```

### Step 5: Generate Helm Values | 步骤 5：生成 Helm Values

```bash
cd ../helm

# Extract Terraform outputs | 提取 Terraform 输出
POSTGRES_CONN_STR=$(cd ../terraform && terraform output -raw postgres_connection_string)
REDIS_CONN_STR=$(cd ../terraform && terraform output -raw redis_connection_string)
INGRESS_FQDN=$(cd ../terraform && terraform output -raw ingress_fqdn)
DJANGO_SECRET=$(cd ../terraform && terraform output -raw django_secret_key)

# Create values file | 创建 values 文件
cat > generated-values.yaml <<EOF
backend:
  env:
    DATABASE_URL: "$POSTGRES_CONN_STR"
    REDIS_CONN_STR: "$REDIS_CONN_STR"
    SECRET_KEY: "$DJANGO_SECRET"
    DORA_PUBLIC_URL: "http://$INGRESS_FQDN"
    DORA_STATIC_URL: "http://$INGRESS_FQDN"
    CSRF_TRUSTED_ORIGINS: "http://$INGRESS_FQDN"

ingress:
  hosts:
    - host: "$INGRESS_FQDN"
      paths:
        - path: /
          pathType: Prefix
EOF
```

### Step 6: Deploy Application | 步骤 6：部署应用

```bash
helm upgrade --install dora ./dora \
    --namespace dora \
    --create-namespace \
    --values ./dora/values.yaml \
    --values ./generated-values.yaml \
    --wait \
    --timeout 10m
```

**Note | 说明**: The deployment includes a standalone Nginx Pod that handles all application routing via `uwsgi_pass` to the backend uWSGI socket. No modifications to `uwsgi.ini` are needed.

部署包含独立的 Nginx Pod，通过 `uwsgi_pass` 处理所有应用路由到后端 uWSGI 套接字。无需修改 `uwsgi.ini`。

### Step 7: Verify Deployment | 步骤 7：验证部署

```bash
# Check all pods | 检查所有 Pods
kubectl get pods -n dora

# Check ingress | 检查 Ingress
kubectl get ingress -n dora

# View backend logs | 查看后端日志
kubectl logs -n dora -l app.kubernetes.io/component=backend --tail=50
```
