# DORA Deploy to Azure Kubernetes Service (AKS) - 一键部署指南

## 📖 目录

- [简介](#简介)
- [架构概览](#架构概览)
- [前置条件](#前置条件)
- [配置说明](#配置说明)
- [架构设计决策](#架构设计决策)
- [故障排查](#故障排查)
- [清理资源](#清理资源)

**部署步骤**: 请参考 [QUICKSTART.md](./QUICKSTART.md) 获取详细的部署操作指南。

---

## 简介

本指南将帮助你一键部署 DORA 应用到 Azure Kubernetes Service (AKS)。与 VM 部署方案不同,本方案使用:

- **AKS**: 托管的 Kubernetes 集群,提供高可用性和自动扩展
- **Azure PostgreSQL Flexible Server**: 完全托管的 PostgreSQL 数据库,支持 pgvector 扩展
- **Azure Cache for Redis**: 托管的 Redis 服务,使用非SSL连接以简化配置
- **NGINX Ingress Controller**: 处理外部流量路由和负载均衡
- **Terraform**: 基础设施即代码,用于自动化 Azure 资源部署
- **Helm**: Kubernetes 应用包管理器,用于部署和管理 DORA 应用

### 一键部署效果

运行单个脚本即可完成所有部署:
```bash
./deploy.sh
```

---

## 架构概览

### 部署架构图

```
┌─────────────────────────────────────────────────────────────┐
│                      Azure Cloud                            │
│                                                             │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  AKS Cluster                                           │ │
│  │                                                        │ │
│  │  ┌──────────────────────────────────────────────────┐  │ │
│  │  │  NGINX Ingress Controller (Public IP)            │  │ │
│  │  └──────────────────────────────────────────────────┘  │ │
│  │           │                                            │ │
│  │           ▼                                            │ │
│  │  ┌──────────────────────────────────────────────────┐  │ │
│  │  │  Nginx Pod (Application Gateway)                 │  │ │
│  │  │  - Routes all traffic                            │  │ │
│  │  │  - uwsgi_pass to Backend                         │  │ │
│  │  │  - Serves static files                           │  │ │
│  │  └──────────────────────────────────────────────────┘  │ │
│  │      │         │            │            │             │ │
│  │      ▼         ▼            ▼            ▼             │ │
│  │  Frontend  Backend     WebSocket     /static/          │ │
│  │  (React)   (uWSGI)     (Daphne)      (local)           │ │
│  │   :8000     :8080       :8081                          │ │
│  │                                                        │ │
│  │  Worker Pod (Celery)                                   │ │
│  │                                                        │ │
│  │  Static Files: emptyDir volume in Nginx Pod            │ │
│  │  (collected from Backend image via initContainer)      │ │
│  └────────────────────────────────────────────────────────┘ │
│           │                    │                            │
│           ▼                    ▼                            │
│  ┌─────────────────┐  ┌──────────────────┐                  │
│  │ Azure Cache for │  │ PostgreSQL       │                  │
│  │ Redis (Standard)│  │ Flexible Server  │                  │
│  │ Non-SSL         │  │ (with pgvector)  │                  │
│  └─────────────────┘  └──────────────────┘                  │
│                                                             │
│  ┌──────────────────────────────────────────────────────┐   │
│  │ Virtual Network (10.0.0.0/16)                        │   │
│  │  - AKS Subnet (10.0.1.0/24)                          │   │
│  │  - PostgreSQL Subnet (10.0.2.0/24)                   │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

### 核心组件

1. **AKS Cluster**
   - 托管 Kubernetes 服务
   - 默认配置: 3 个 Standard_D4s_v5 节点
   - 支持自动扩展

2. **Azure PostgreSQL Flexible Server**
   - 完全托管的 PostgreSQL 16
   - 支持 pgvector 扩展(用于向量搜索)
   - VNet 集成,提供私有访问
   - 使用 Delegated Subnet,禁用公网访问

3. **Azure Cache for Redis**
   - 托管的 Redis Standard SKU
   - 使用非SSL连接 (端口6379) 简化Celery配置
   - 通过Private Endpoint在VNet内安全访问
   - 启用非SSL端口用于Celery兼容性

4. **NGINX Ingress Controller**
   - 统一入口点
   - 处理 HTTP/HTTPS 流量
   - 支持 WebSocket

5. **Application Pods**
   - **Nginx (独立 Pod)**: 应用层反向代理，统一处理所有路由
     - 前端流量 → Frontend Pod (React/Nginx on :8000)
     - API 流量 (`/api`, `/admin`, `/users`) → Backend Pod (uWSGI socket :8080, 通过 `uwsgi_pass` 协议)
     - WebSocket 流量 (`/ws/`) → WebSocket Pod (Daphne :8081)
     - 静态文件 (`/static/`) → 从 Backend 镜像收集后本地提供
   - **Backend**: Django + uWSGI (uwsgi 协议 socket :8080)
   - **Frontend**: React + Nginx (:8000)
   - **Worker**: Celery 任务队列处理器
   - **WebSocket**: Daphne ASGI 服务器 (:8081)

### 网络架构

本部署使用 Azure 私有网络功能,确保数据库和缓存服务只能从 AKS 集群内部访问。

**网络拓扑**:

```
Internet
    |
    v
[NGINX Ingress] (Public IP)
    |
    v
[AKS Cluster] (10.0.1.0/24)
    |
    +---> [PostgreSQL Flexible Server] (Private - 10.0.2.0/24)
    |         - 使用 Delegated Subnet
    |         - Public Network Access = Disabled
    |
    +---> [Azure Cache for Redis] (Private - 10.0.3.0/24)
              - 通过 Private Endpoint 连接
              - 只能通过 VNet 访问
```

**Virtual Network (10.0.0.0/16)** 包含:
- **AKS Subnet (10.0.1.0/24)**: AKS 节点和 Pod
- **PostgreSQL Subnet (10.0.2.0/24)**: PostgreSQL Flexible Server 专用子网
- **Redis Subnet (10.0.3.0/24)**: Redis Private Endpoint

**安全特性**:
- ✅ PostgreSQL 和 Redis 只能从 VNet 内部访问
- ✅ 使用私有 DNS 解析
- ✅ 流量不经过公网
- ❌ 无法从互联网直接访问数据库和缓存

### 后端架构 (独立 Nginx Pod + uWSGI)

当前部署采用 **独立 Nginx Pod** 作为应用层统一网关，这是生产环境推荐的架构模式。

**架构优势**:

1. **统一流量入口**: 单一 Nginx Pod 处理所有应用流量（前端、API、WebSocket），简化路由管理
2. **协议转换**: Nginx 通过 `uwsgi_pass` 与后端 uWSGI socket (端口 8080) 通信，无需后端暴露 HTTP
3. **静态文件优化**: 静态资源由 Nginx 直接提供，减轻后端负担
4. **连接管理**: Nginx 提供连接池、缓冲、超时控制，保护后端服务
5. **灵活扩展**: 便于添加缓存、限流、安全头部等功能

**流量路由** (参见 `nginx-configmap.yaml`):

```
Internet → NGINX Ingress Controller → Nginx Pod (独立) → 后端服务
                                            |
                                            ├─> Frontend Pod (:8000) - React 静态资源
                                            ├─> Backend Pod (:8080) - uWSGI socket (uwsgi 协议)
                                            ├─> WebSocket Pod (:8081) - Daphne ASGI
                                            └─> /static/ - 本地静态文件 (从 Backend 镜像收集)
```

**部署组件**:

- `nginx-deployment.yaml`: 独立 Nginx Pod，包含 initContainer 从 Backend 镜像收集静态文件
- `nginx-configmap.yaml`: Nginx 配置，定义路由规则和 uwsgi_pass 转发
- `backend-deployment.yaml`: Django + uWSGI，通过 socket :8080 暴露 uwsgi 协议
- `backend-service.yaml`: Backend Service (ClusterIP)，仅集群内访问

这个架构无需在后端 Pod 中添加 sidecar，也无需修改 `uwsgi.ini` 为 `http-socket`。保持 uWSGI 使用原生 socket 协议可获得最佳性能。

---

## 前置条件

### 必需项

1. **Azure 订阅**
   - 具有创建资源的权限
   - 足够的配额创建 AKS、PostgreSQL 和 Redis

2. **权限要求**
   
   Azure Kubernetes Service (AKS) 默认会创建两个资源组:
   - **主资源组**: 存放 AKS 控制平面和其他服务(PostgreSQL、Redis 等)
   - **节点资源组**: AKS 自动创建,存放节点、负载均衡器等资源(例如 `MC_<主资源组名>_<集群名>_<区域>`)
   
   **默认行为(推荐)**:
   - `deploy.sh` 脚本会自动创建主资源组(如果不存在)
   - AKS 会自动创建节点资源组,**无需手动创建**
   - 只需确保您的账户有创建资源组和资源的权限
   
   **受限权限场景**(仅在无法创建资源组时):
   
   如果您的账户权限受限,无法创建新资源组,需要管理员预先创建:
   
   ```bash
   # 管理员预先创建主资源组(必须)
   az group create --name "RG-IT-DORA-NPD" --location germanywestcentral
   
   # 可选: 预先创建节点资源组(仅在受限权限时需要)
   az group create --name "RG-IT-DORA-NPD-NODES" --location germanywestcentral
   
   # 授予您对资源组的权限
   az role assignment create \
     --assignee <your-user-id> \
     --role "Contributor" \
     --scope "/subscriptions/<subscription-id>/resourceGroups/RG-IT-DORA-NPD"
   
   # 如果创建了节点资源组,也需要授权
   az role assignment create \
     --assignee <your-user-id> \
     --role "Contributor" \
     --scope "/subscriptions/<subscription-id>/resourceGroups/RG-IT-DORA-NPD-NODES"
   ```
   
   然后在 `terraform.tfvars` 中配置:
   ```hcl
   resource_group_name      = "RG-IT-DORA-NPD"
   node_resource_group_name = "RG-IT-DORA-NPD-NODES"  # 仅在预创建时配置
   ```
   
   **验证权限**:
   ```bash
   # 列出您有权访问的资源组
   az group list --query "[].name" -o table
   
   # 验证特定资源组的权限
   az role assignment list \
     --scope "/subscriptions/<subscription-id>/resourceGroups/RG-IT-DORA-NPD" \
     --query "[?principalName=='<your-email>'].roleDefinitionName" -o table
   ```

3. **Azure CLI**
   ```bash
   # 安装 (Windows)
   winget install Microsoft.AzureCLI
   
   # 安装 (macOS)
   brew install azure-cli
   
   # 安装 (Linux)
   curl -sL https://aka.ms/InstallAzureCLIDeb | sudo bash
   
   # 登录
   az login
   ```

3. **Terraform**
   ```bash
   # 安装 (Windows)
   choco install terraform
   
   # 安装 (macOS)
   brew tap hashicorp/tap
   brew install hashicorp/tap/terraform
   
   # 安装 (Linux)
   wget -O- https://apt.releases.hashicorp.com/gpg | sudo gpg --dearmor -o /usr/share/keyrings/hashicorp-archive-keyring.gpg
   echo "deb [signed-by=/usr/share/keyrings/hashicorp-archive-keyring.gpg] https://apt.releases.hashicorp.com $(lsb_release -cs) main" | sudo tee /etc/apt/sources.list.d/hashicorp.list
   sudo apt update && sudo apt install terraform
   
   # 验证安装
   terraform --version
   ```

4. **Helm**
   ```bash
   # 安装 (Windows)
   choco install kubernetes-helm
   
   # 安装 (macOS)
   brew install helm
   
   # 安装 (Linux)
   curl https://raw.githubusercontent.com/helm/helm/main/scripts/get-helm-3 | bash
   
   # 验证安装
   helm version
   ```


6. **jq (JSON 处理工具)**
   ```bash
   # 安装 (Windows)
   choco install jq

   # 安装 (macOS)
   brew install jq

   # 安装 (Linux)
   sudo apt-get update && sudo apt-get install -y jq

   # 验证安装
   jq --version
   ```

7. **Docker Hub 或 ACR 中的镜像**
   - `insilicomed/dora-backend:blob`
   - `insilicomed/dora-frontend:blob`

### 可选项

- OpenAI API 密钥(用于 AI 功能)
- Azure Storage Account(用于媒体文件存储)
- 自定义域名

---

## 配置说明

详细的部署步骤请参考 [QUICKSTART.md](./QUICKSTART.md)。

### Terraform 变量

详细的变量说明请参考 `terraform/variables.tf` 文件。主要变量包括:

| 变量 | 说明 | 默认值 |
|------|------|--------|
| `resource_group_name` | 资源组名称 | `dora-aks-rg` |
| `location` | Azure 区域 | `eastus` |
| `cluster_name` | AKS 集群名称 | `dora-aks` |
| `node_count` | 节点数量 | `3` |
| `node_vm_size` | 节点 VM 大小 | `Standard_D4s_v5` |
| `postgres_sku_name` | PostgreSQL SKU | `GP_Standard_D4s_v3` |
| `redis_sku_name` | Redis SKU (Standard 版本) | `Standard_C1` |

### Helm 配置

详细的配置说明请参考 `helm/dora/values.yaml` 文件。主要配置包括:

| 配置 | 说明 | 默认值 |
|------|------|--------|
| `backend.replicaCount` | 后端副本数 | `1` |
| `backend.resources` | 后端资源限制 | CPU: 1-2核, 内存: 2-4Gi |
| `frontend.replicaCount` | 前端副本数 | `1` |
| `worker.replicaCount` | Worker 副本数 | `1` |
| `websocket.replicaCount` | WebSocket 副本数 | `1` |
| `nginx.replicaCount` | Nginx 网关副本数 | `1` |


---

## 架构设计决策

### 1. 静态文件处理

**问题**: Docker Compose 中静态文件通过 Named Volume 在容器间共享,Kubernetes 中没有等价物。

**解决方案**: 使用 **emptyDir** 卷 + **initContainer** 模式

- **initContainer**: 在 Backend Pod 启动前运行 `collectstatic`,收集所有静态文件到 emptyDir 卷
- **emptyDir 卷**: 在 Backend Pod 的所有容器间共享
- **Backend 容器**: 直接提供静态文件服务(通过 Django/uWSGI)

**优点**:
- ✅ 不需要持久化存储(静态文件在镜像中)
- ✅ 简化部署,减少外部依赖
- ✅ 性能好,无网络 I/O
- ✅ 符合 Kubernetes 最佳实践



### 2. PostgreSQL 使用 Azure Flexible Server

**原因**:
- ✅ 完全托管,无需维护
- ✅ 自动备份和恢复
- ✅ 高可用性和自动故障转移
- ✅ 支持 pgvector 扩展
- ✅ VNet 集成,安全性高

### 3. Redis 使用 Azure Cache for Redis

**原因**:
- ✅ 企业级性能和可靠性
- ✅ 完全托管,无需维护
- ✅ 自动备份
- ✅ 成本效益更高
- ✅ VNet集成,支持私有端点

**配置特点**:
- 使用 Standard SKU (非Cluster模式)
- 启用非SSL端口 (6379) 用于Celery兼容性
- SSL端口 (6380) 也可用,但应用当前使用非SSL连接
- 连接通过Private Endpoint,在VNet内部安全传输

**注意**: 
- Celery在使用SSL连接时需要额外的证书配置
- 当前配置使用非SSL连接简化部署,连接仍在私有网络内安全

### 4. Ingress 使用 NGINX

**原因**:
- ✅ 成熟稳定,社区支持好
- ✅ 配置灵活,功能丰富
- ✅ 支持 WebSocket
- ✅ 性能优秀

### 5. 使用 Terraform 而非 Bicep

**原因**:
- ✅ 跨云平台支持(未来可能迁移)
- ✅ 更成熟的生态系统
- ✅ 更好的模块化和复用
- ✅ 状态管理更灵活

### 6. 使用 Helm 而非 kubectl apply

**原因**:
- ✅ 简化部署和升级
- ✅ 版本管理和回滚
- ✅ 模板化和参数化
- ✅ 依赖管理

---

## 故障排查

### 常见问题

#### 1. Pods 无法启动

```bash
# 查看 Pod 状态
kubectl get pods -n dora

# 查看 Pod 详细信息
kubectl describe pod <pod-name> -n dora

# 查看容器日志
kubectl logs <pod-name> -n dora
kubectl logs <pod-name> -c <container-name> -n dora
```

**常见原因**:
- 数据库连接失败: 检查 PostgreSQL 配置
- Redis 连接失败: 检查 Redis 配置
- 镜像拉取失败: 检查镜像名称和访问权限

#### 2. 无法访问应用

```bash
# 检查 Ingress
kubectl get ingress -n dora
kubectl describe ingress <ingress-name> -n dora

# 检查 NGINX Ingress Controller
kubectl get pods -n ingress-nginx
kubectl logs -n ingress-nginx <nginx-pod>

# 检查服务
kubectl get svc -n dora
```

**常见原因**:
- DNS 未生效: 等待 DNS 传播,或直接使用 IP 访问
- Ingress Controller 未就绪: 检查 NGINX Pod 状态
- Service 端点未就绪: 检查 Backend/Frontend Pods 是否运行

#### 3. 数据库连接问题

```bash
# 测试数据库连接
kubectl run -it --rm debug --image=postgres:16 --restart=Never -n dora -- \
    psql "$(cd terraform && terraform output -raw postgres_connection_string)"
```

#### 4. Redis 连接问题

```bash
# 测试 Redis 连接
kubectl run -it --rm debug --image=redis:7 --restart=Never -n dora -- \
    redis-cli -h <redis-host> -p <redis-port> -a <redis-password> ping
```

### 查看 Terraform 状态

```bash
cd terraform

# 查看当前状态
terraform show

# 查看输出
terraform output

# 刷新状态
terraform refresh
```

### 查看 Helm Release

```bash
# 列出所有 Release
helm list -n dora

# 查看 Release 详情
helm get all dora -n dora

# 查看 Release 历史
helm history dora -n dora

# 回滚到上一个版本
helm rollback dora -n dora
```

---

## 清理资源

### 删除 Helm Release

```bash
helm uninstall dora -n dora
helm uninstall ingress-nginx -n ingress-nginx
```

### 删除 Kubernetes 命名空间

```bash
kubectl delete namespace dora
kubectl delete namespace ingress-nginx
```

### 删除 Azure 基础设施

```bash
cd terraform

# 预览将要删除的资源
terraform plan -destroy

# 删除所有资源
terraform destroy
```

**注意**: 删除操作不可逆,请确保已备份重要数据。

---

## 文件说明

### 核心文件

**部署脚本:**
- `deploy.sh` - 一键部署脚本,自动化整个部署流程
- `QUICKSTART.md` - 快速开始指南

**Terraform 配置** (`terraform/`):
- `providers.tf` - Terraform provider 配置 (Azure、Random)
- `variables.tf` - 变量定义和说明
- `main.tf` - 主配置文件 (VNet、AKS、PostgreSQL、Redis、Storage)
- `outputs.tf` - 输出定义 (连接字符串、FQDN 等)
- `terraform.tfvars.example` - 变量配置示例文件
- `.terraform.lock.hcl` - Provider 版本锁定文件

**Helm Chart** (`helm/dora/`):
- `Chart.yaml` - Helm Chart 元数据
- `values.yaml` - 默认配置值
- `templates/` - Kubernetes 资源模板目录
  - `_helpers.tpl` - Helm 模板辅助函数
  - `serviceaccount.yaml` - ServiceAccount (Pod 身份标识)
  - `backend-deployment.yaml` - Backend Deployment (Django + uWSGI)
  - `backend-service.yaml` - Backend Service (ClusterIP)
  - `frontend.yaml` - Frontend Deployment 和 Service (React + Nginx)
  - `worker.yaml` - Worker Deployment (Celery)
  - `websocket.yaml` - WebSocket Deployment 和 Service (Daphne)
  - `nginx-deployment.yaml` - Nginx 网关 Deployment (应用层反向代理)
  - `nginx-configmap.yaml` - Nginx 配置 (路由规则、uwsgi_pass)
  - `ingress.yaml` - Ingress 配置 (NGINX Ingress Controller)
  - `init-data-job.yaml` - 初始数据加载 Job (可选)

### 生成文件

部署过程中自动生成的文件:

- `helm/generated-values.yaml` - 从 Terraform 输出生成的 Helm 值
- `terraform/main.tfplan` - Terraform 执行计划
- `terraform/terraform.tfstate` - Terraform 状态文件 (包含敏感信息)
- `terraform/.terraform/` - Terraform provider 插件目录

---

## 其他资源

- [Azure Kubernetes Service 文档](https://docs.microsoft.com/en-us/azure/aks/)
- [Azure PostgreSQL Flexible Server 文档](https://docs.microsoft.com/en-us/azure/postgresql/flexible-server/)
- [Azure Cache for Redis 文档](https://docs.microsoft.com/en-us/azure/azure-cache-for-redis/)
- [Terraform AzureRM Provider 文档](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs)
- [Helm 文档](https://helm.sh/docs/)
- [Kubernetes 文档](https://kubernetes.io/docs/)

---

## 支持

如有问题或建议,请:
- 提交 GitHub Issue
- 联系 DORA 团队

