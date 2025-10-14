# 使用预构建镜像的 Azure VM 部署方案说明

## 1. 部署架构概述

### 1.1 范围与约束
- 将 DORA 的全部服务部署到一台 Azure Linux 虚拟机上，使用预先构建好的容器镜像。
- 前端、后端镜像存放在 Azure Container Registry (ACR)；第三方基础镜像（nginx、PostgreSQL、Redis 等）来自 Docker Hub。
- 需要创建Azure 侧的资源：虚拟机、虚拟网络（VNet、子网、NSG、公共 IP、NIC）、数据盘（存放数据库/Redis/静态资源）及 Storage Account。
- GitHub 仓库保持私有，部署模板通过 Azure Template Spec 发布并用 RBAC 控制访问。
- 使用 ACR Token 进行身份验证，无需托管身份或角色分配，ACR 可位于不同资源组。

### 1.2 部署流程
1. **生成Image并推送到ACR**: 将生成的前后端镜像推送到Azure Container Registry镜像库中。
2. **发布 Template Spec**：将 Bicep 模板发布为 Azure Template Spec
3. **执行部署**：通过 Template Spec 创建 Azure 资源
4. **VM 自动初始化**：cloud-init 自动安装 Docker、挂载数据盘、配置环境、拉取镜像并启动服务
5. **验证部署**：SSH 登录验证服务状态

## 2. 仓库内的部署资产

### 2.1 核心文件
- **`infra/azure/vm-prebuilt/deploy.bicep`**：Bicep 基础设施模板
  - 创建网络资源（VNet、Subnet、NSG、Public IP、NIC）
  - 创建 Ubuntu 22.04 VM 和 Premium SSD 数据盘
  - 创建 Storage Account 和 Blob 容器
  - 将 cloud-init 配置注入 VM

- **`infra/azure/vm-prebuilt/cloud-init.yaml`**：VM 初始化配置
  - 安装 Docker 和 Docker Compose
  - 挂载并格式化数据盘
  - 生成 `.env` 和 `docker-compose.yml` 配置文件
  - 使用 ACR Token 登录 ACR
  - 拉取镜像并启动 DORA 服务栈
  - 自动加载初始数据（创建默认用户等）

- **`infra/azure/vm-prebuilt/parameters.example.json`**：部署参数文件示例
  - 包含所有必需和可选的部署参数的示例
  - 部署钱需要将此文件拷贝为parameters.json, 并设置正确的参数。

### 2.2 辅助脚本
- **`scripts/acr/deploy-to-acr.sh`**：创建ACR并发布镜像
- **`scripts/publish-template-spec.sh`**：将 Bicep 模板发布为 Template Spec
- **`scripts/deploy-dora-template.sh`**：使用 Template Spec 执行部署

## 3. 前置条件

### 3.1 Azure 环境
- 已安装 Azure CLI 2.53+ (`az --version` 检查版本)
- 拥有目标订阅的 Contributor 角色或等效权限
- 已运行deploy-to-acr.sh推送镜像到ACR

### 3.2 ACR 访问凭据
- 已创建 ACR Token（具有 `content/read` 权限）
- 获取 Token 用户名和密码
- 创建方法：
  ```bash
  # 在 Azure Portal 中：ACR → Tokens → Create
  # 或使用 Azure CLI：
  az acr token create --name doradevuser --registry doradev \
    --scope-map _repositories_pull
  az acr token credential generate --name doradevuser --registry doradev
  ```

### 3.3 SSH 密钥对
- 准备 SSH 公钥用于 VM 访问
- 生成方法：
  ```bash
  ssh-keygen -t ed25519 -C "dora-vm"
  # 公钥位置：~/.ssh/id_ed25519.pub
  ```

### 3.4 Django SECRET_KEY
- 生成随机密钥（用于会话加密、CSRF 保护等）
- 生成方法：
  ```bash
  python -c "import secrets; print(secrets.token_urlsafe(48))"
  ```

## 4. 准备部署参数

### 4.1 配置参数文件
编辑 `infra/azure/vm-prebuilt/parameters.json`（从示例文件复制后修改）：

> **安全提醒**：此文件包含敏感信息（ACR Token、API 密钥等），不应提交到版本控制系统。

### 4.2 参数说明

| 参数名称 | 类型 | 说明 | 默认值 | 示例 |
|---------|------|------|--------|------|
| `location` | 必填 | Azure 区域 | `resourceGroup().location` | `GermanyWestCentral` |
| `vmName` | 可选 | 虚拟机名称 | `dora-vm` | `dora-vm` |
| `vmSize` | 可选 | VM 规格 | `Standard_D8s_v5` | `Standard_D8s_v5` |
| `dnsLabelPrefix` | 可选 | DNS 前缀 | `dora` | `dora` → `dora.<region>.cloudapp.azure.com` |
| `adminUsername` | 必填 | VM SSH 用户名 | `azureuser` |`azureuser`
| `adminSshPublicKey` | 必填 | SSH 公钥 |  | `cat ~/.ssh/id_ed25519.pub`
| `acrLoginServer` | 必填 | ACR 服务器 |  | `doraacr.azurecr.io`
| `acrTokenUsername` | 必填 | ACR Token 用户名 |  | Azure Portal → ACR → Tokens
| `acrTokenPassword` | 必填 | ACR Token 密码 |  | 创建 Token 时生成
| `dataDiskSizeGB` | 可选 | 数据盘大小 (GB) | `128` | `128` |
| `secretKey` | 必填 | Django SECRET_KEY |  | `python -c "import secrets; print(secrets.token_urlsafe(48))"`
| `storageContainerName` | 可选 | Blob 容器名称 |  | `media`
| `openAiApiKey` | 可选 | Azure OpenAI API 密钥 |  | 从Azure AI Foundry获取
| `openAiApiType` | 可选 | API 类型 |  `azure` |  `azure` / `openai` / `custom`
| `openAiApiBaseUrl` | 可选 | API 端点 | `https://xxx.cognitiveservices.azure.com` |
| `openAiApiVersion` | 可选 | API 版本 |  | `2025-01-01-preview`
| `openAiDeploymentName` | 可选 | 部署名称 |  | `gpt-5`
| `embeddingOpenAiApiConfigs` | 可选 | 嵌入模型配置（JSON 数组） |  | 见下方示例

#### Embedding 模型配置示例
```json
"embeddingOpenAiApiConfigs": {
  "value": "[{\"model\":\"text-embedding-3-small\",\"api_key\":\"<your-key>\",\"base_url\":\"https://<your-endpoint-url>/\",\"version\":\"2024-12-01-preview\",\"deployment_name\":\"text-embedding-3-small\"}]"
}
```


## 5. 发布 Template Spec

### 5.1 使用 sh 脚本

#### Linux / macOS / WSL / Git Bash
```bash
./scripts/run-publish-template-spec.sh
```

> **说明**：`run-publish-template-spec.sh` 会自动调用 publish-template-spec.sh 脚本，参数已在脚本中预配置。

### 5.2 脚本参数说明
- `-ResourceGroupName`：Template Spec 存储的资源组
- `-TemplateSpecName`：Template Spec 名称
- `-TemplateSpecVersion`：版本号（语义化版本，如 `1.0.0`）
- `-SubscriptionId`：（可选）订阅 ID
- `-Location`：（可选）区域，默认使用资源组的区域

### 5.3 验证发布结果
Azure portal上会像是对应的Template spec资源或者用CLI命令：
```bash
az ts show \
  --resource-group "RG-IT-DORA-NPD" \
  --name "doraVMPrebuilt" \
  --version "1.0.0"
```

成功后会输出 Template Spec 的详细信息，包括 `id` 字段（Template Spec 版本 ID）。

## 6. 执行部署

### 6.1 使用部署脚本

#### Linux / macOS / WSL / Git Bash
```bash
./scripts/deploy-dora-template.sh
```

此脚本会：
1. 设置正确的订阅
2. 解析 Template Spec ID
3. 使用 `parameters.json` 执行部署

### 6.2 使用 Azure Portal

1. 访问 Azure Portal 部署页面：
   ```
   https://portal.azure.com/#create/Microsoft.Template
   ```
2. 选择需要部署的模版名称

3. 填写部署参数

4. 点击 "Review + create" → "Create"


## 7. VM 自动初始化过程

部署完成后，cloud-init 会自动执行以下步骤：

### 7.1 初始化阶段
1. **安装系统软件**
   - 更新系统包
   - 安装 Docker、curl、jq 等工具

2. **配置数据盘**
   - 格式化附加的数据盘为 ext4
   - 挂载到 `/mnt/dora-data`
   - 创建 postgres、redis、logs、static 目录
   - 添加到 `/etc/fstab` 实现开机自动挂载

3. **生成配置文件**
   - 在 `/opt/dora` 目录创建：
     - `docker-compose.yml`：容器编排配置
     - `.env`：环境变量（包含所有密钥和配置）
     - `nginx.conf`：反向代理配置
     - `bootstrap.sh`：启动脚本

4. **启动服务**
   - 使用 ACR Token 登录 ACR
   - 从ACR和Docker中拉取所有容器镜像
   - 启动容器栈：
     - `dora_db`：PostgreSQL 数据库
     - `dora_redis`：Redis 缓存
     - `dora_backend`：Django 应用
     - `dora_worker`：Celery 任务队列
     - `dora_backend_ws`：WebSocket 服务
     - `frontend`：前端应用
     - `nginx`：反向代理

5. **加载初始数据**
   - 等待数据库就绪
   - 执行数据库迁移
   - 加载 `initial_data.json`（创建默认用户 `dora@test.com`）

### 7.2 查看初始化日志

```bash
# SSH 登录 VM
ssh azureuser@<public-ip>

# 查看 cloud-init 总体日志
sudo cat /var/log/cloud-init-output.log

# 查看 DORA bootstrap 日志
sudo cat /var/log/dora-bootstrap.log

# 查看容器状态
docker ps

# 查看特定容器日志
docker logs dora_backend
docker logs dora_backend_worker
```

## 8. 部署验证

### 8.1 基础连接检查

```bash
# 1. SSH 连接测试
ssh azureuser@<public-ip>
# 或使用 DNS 名称
ssh azureuser@dora-demo.germanywestcentral.cloudapp.azure.com

# 2. 检查容器状态（应显示 7 个运行中的容器）
docker ps

# 3. 检查服务健康状态
docker ps --format 'table {{.Names}}\t{{.Status}}\t{{.Ports}}'
```

### 8.2 日志检查

```bash
# 查看 bootstrap 日志
sudo cat /var/log/dora-bootstrap.log | tail -50

# 查看后端日志
docker logs dora_backend --tail 50

# 查看数据库日志
docker logs dora_db --tail 50

# 实时跟踪日志
docker logs -f dora_backend
```

### 8.3 Web 访问测试

1. **访问前端**：
   ```
   http://<public-ip>
   或
   http://dora.germanywestcentral.cloudapp.azure.com
   ```

2. **登录测试**：
   - 用户名：`dora@test.com`
   - 密码：`dora`

3. **访问管理后台**：
   ```
   http://<public-ip>/admin
   ```

## 9. 常见问题 (FAQ)

**Q: 如何保证仓库私有性？**  
A: 模板以 Template Spec 形式存储在 Azure，使用 RBAC 控制访问，无需公开 GitHub 仓库。

**Q: ACR 是否必须与 VM 在同一资源组？**  
A: 不需要。当前方案使用 ACR Token 认证，ACR 可位于任何资源组或订阅。

**Q: 如何扩展模板参数？**  
A: 在 `deploy.bicep` 中添加参数，在 `cloud-init.yaml` 中使用 `__PLACEHOLDER__`，通过 Bicep 的 `replace()` 函数注入。

**Q: 如何在多个 Azure 主权云（中国、政府云）中部署？**  
A: 模板使用 `environment().suffixes.storage` 和公共 IP 的 FQDN，自动适配不同云环境。只需确保 `az login` 登录到正确的云。

