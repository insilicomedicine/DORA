# Deploy DORA to Azure

[![Deploy to Azure](https://aka.ms/deploytoazurebutton)]({{DEPLOY_URL}})

---

## 🚀 一键部署 DORA 到 Azure 虚拟机

点击上方的 **Deploy to Azure** 按钮,在 10-15 分钟内完成 DORA 应用的完整部署。

### ✨ 部署内容

此部署将自动创建和配置:

- ✅ **Ubuntu 22.04 虚拟机** (Standard_D8s_v5: 8核16GB)
- ✅ **PostgreSQL 数据库** (Docker容器)
- ✅ **Redis 缓存** (Docker容器)
- ✅ **Nginx 反向代理**
- ✅ **DORA 前后端应用**
- ✅ **Azure Blob Storage** (用于文件存储)
- ✅ **128GB Premium SSD 数据磁盘**
- ✅ **虚拟网络和安全组**
- ✅ **公共 IP 地址** (可选配置 DNS)

### 📋 准备工作

在点击部署按钮之前,请确保已准备:

#### 1️⃣ 容器镜像源配置

**选择镜像源**：

- **Docker Hub (insilicomed)** - 推荐，公共镜像仓库
  - 镜像: `insilicomed/dora-backend:blob` 和 `insilicomed/dora-frontend:blob`
  - 需要 Docker Hub 账户凭据（当前需要认证，未来可能支持匿名访问）
  
- **Azure Container Registry (Your Own)** - 使用你自己的 ACR
  - 需要提前推送镜像到你的 ACR
  - 镜像: `<your-acr>.azurecr.io/dora-backend:latest` 和 `<your-acr>.azurecr.io/dora-frontend:latest`

**Docker Hub 用户**：

你需要已经将 DORA Docker 镜像推送到 Azure Container Registry:

- `<your-acr>.azurecr.io/dora-backend:latest`
- `<your-acr>.azurecr.io/dora-frontend:latest`

并创建具有拉取权限的 ACR Token:

```bash
az acr token create \
    --name dora-deploy-token \
    --registry <YOUR_ACR_NAME> \
    --scope-map _repositories_pull \
    --status enabled

az acr token credential generate \
    --name dora-deploy-token \
    --registry <YOUR_ACR_NAME> \
    --password1
```

**ACR 用户**：

需要：
1. ACR 登录服务器地址（例如 `myregistry.azurecr.io`）
2. ACR Token 用户名和密码（具有拉取权限）
3. 已推送的镜像：`dora-backend:latest` 和 `dora-frontend:latest`

创建 ACR Token:

```bash
az acr token create \
    --name dora-deploy-token \
    --registry <YOUR_ACR_NAME> \
    --scope-map _repositories_pull \
    --status enabled

az acr token credential generate \
    --name dora-deploy-token \
    --registry <YOUR_ACR_NAME> \
    --password1
```

#### 2️⃣ SSH 公钥

生成或准备 SSH 公钥用于 VM 访问:

```bash
# 生成新的 SSH 密钥对
ssh-keygen -t ed25519 -C "dora-azure-vm"

# 查看公钥
cat ~/.ssh/id_ed25519.pub
```

#### 3️⃣ OpenAI API 配置

准备以下其中之一:

- **OpenAI API Key** (从 platform.openai.com 获取)
- **Azure OpenAI Service** 端点、API Key 和部署名称

#### 4️⃣ Django Secret Key

生成一个至少 50 字符的随机密钥:

```bash
# 使用 OpenSSL 生成
openssl rand -base64 64 | tr -d '\n' | cut -c1-64

# 或使用 Python
python3 -c "import secrets; print(secrets.token_urlsafe(64)[:64])"
```

---

## 📝 部署步骤

### 步骤 1: 点击部署按钮

点击页面顶部的 **Deploy to Azure** 按钮,将打开 Azure Portal 部署向导。

### 步骤 2: 填写基本配置

- **订阅**: 选择你的 Azure 订阅
- **资源组**: 创建新的或选择现有资源组
- **区域**: 选择部署区域 (例如: East US, West Europe)
- **VM 名称**: 虚拟机名称 (例如: `dora-vm`)
- **管理员用户名**: SSH 登录用户名 (例如: `azureuser`)
- **SSH 公钥**: 粘贴你的 SSH 公钥

### 步骤 3: 配置 VM 规格

- **VM 大小**: 推荐 `Standard_D8s_v5` (8核16GB)
- **数据磁盘大小**: 128 GB (可根据需要调整)
- **DNS 标签前缀**: (可选) 自定义域名前缀,例如 `dora-demo`
- **公共基础 URL**: (可选) 留空则自动生成

### 步骤 4: 配置容器注册表

- **镜像源**: 选择 `Docker Hub (insilicomed)` 或 `Azure Container Registry (Your Own)`
- **Registry Username**: 
  - Docker Hub: 你的 Docker Hub 用户名
  - ACR: ACR Token 用户名
- **Registry Password**: 
  - Docker Hub: 你的 Docker Hub 密码或 Access Token
  - ACR: ACR Token 密码

**如果选择 ACR**:
- **ACR 登录服务器**: 你的 ACR 地址,例如 `myregistry.azurecr.io`

### 步骤 5: 配置应用设置

- **Secret Key**: Django 应用密钥 (至少 50 字符)
- **存储容器名称**: Blob 容器名称,默认 `media`

### 步骤 6: 配置 AI 功能

- **OpenAI API 类型**: 选择 `openai`, `azure` 或 `custom`
- **OpenAI API Key**: 你的 API 密钥

**如果使用 Azure OpenAI**:

- **API Base URL**: Azure OpenAI 端点,例如 `https://myopenai.openai.azure.com`
- **API Version**: 例如 `2025-01-01-preview`
- **Deployment Name**: 部署名称,例如 `gpt-5`

**Embedding 模型配置** (JSON 格式):

```json
[
  {
    "model": "text-embedding-3-small",
    "api_key": "<your-api-key>",
    "base_url": "https://api.openai.com/v1",
    "version": "",
    "deployment_name": ""
  }
]
```

### 步骤 7: 审核并创建

- 检查所有参数
- 勾选"我同意上述条款和条件"
- 点击 **创建** 开始部署

---

## ⏱️ 部署进度

部署通常需要 **10-15 分钟**,包括:

1. ✅ 创建虚拟网络和安全组 (1-2分钟)
2. ✅ 创建存储账户和容器 (1-2分钟)
3. ✅ 创建和配置虚拟机 (3-5分钟)
4. ✅ 运行 cloud-init 初始化 (5-8分钟)
   - 安装 Docker
   - 拉取 DORA 镜像
   - 启动所有容器
   - 初始化数据库

你可以在 Azure Portal 的"部署"页面查看实时进度。

---

## 🎉 部署完成

### 获取访问信息

部署完成后,在输出 (Outputs) 标签中找到:

- **公共 IP 地址**: `publicIPAddress`
- **FQDN** (如果配置了 DNS): `fqdn`
- **SSH 命令**: `sshCommand`
- **应用 URL**: `applicationUrl`

### 访问应用

在浏览器中打开应用 URL:

```text
http://<PUBLIC_IP>
或
http://<DNS_LABEL>.<REGION>.cloudapp.azure.com
```

### 默认登录凭据

```text
Email: dora@test.com
Password: dora
```

**⚠️ 重要安全提示**: 首次登录后**立即更改默认密码**!

### SSH 访问 VM

```bash
ssh azureuser@<PUBLIC_IP>

# 或使用 FQDN
ssh azureuser@<FQDN>
```

---

## 🔍 验证部署

登录到 VM 后,检查服务状态:

```bash
# 查看所有运行的容器
sudo docker ps

# 预期输出:
# - dora_nginx
# - dora_frontend
# - dora_backend
# - dora_celery_worker
# - dora_celery_beat
# - dora_db (PostgreSQL)
# - dora_redis

# 查看应用日志
sudo docker logs dora_backend --tail 50
sudo docker logs dora_frontend --tail 50

# 检查 bootstrap 日志
sudo cat /var/log/dora-bootstrap.log

# 检查数据磁盘挂载
df -h /mnt/dora-data
```

---

## 🛠️ 故障排查

### 应用无法访问?

1. **检查 NSG 规则**:

   ```bash
   az network nsg rule list \
       --resource-group <YOUR_RG> \
       --nsg-name dora-vm-nsg \
       --output table
   ```

2. **检查 Nginx 状态**:

   ```bash
   sudo docker logs dora_nginx
   ```

3. **验证后端健康**:

   ```bash
   curl http://localhost/api/health/
   ```

### 容器未启动?

```bash
# 查看 Docker Compose 配置
cat /opt/dora/docker-compose.yml

# 查看环境变量
sudo cat /opt/dora/.env

# 手动重启服务
cd /opt/dora
sudo docker compose down
sudo docker compose up -d
```

### ACR 认证失败?

```bash
# 验证 ACR Token
sudo docker login <ACR_SERVER> \
    -u <TOKEN_USERNAME> \
    -p <TOKEN_PASSWORD>

# 手动拉取镜像
sudo docker pull <ACR_SERVER>/dora-backend:latest
sudo docker pull <ACR_SERVER>/dora-frontend:latest
```

### 需要重新运行初始化?

```bash
# 重新执行 bootstrap 脚本
sudo /opt/dora/bin/bootstrap.sh
```

---

## 💰 成本估算

### 按小时计费资源

| 资源 | 规格 | 每小时成本 (USD) | 每月成本 (USD) |
|------|------|------------------|----------------|
| 虚拟机 | Standard_D8s_v5 | ~$0.38 | ~$280 |
| Premium SSD | 128 GB | ~$0.03 | ~$20 |
| 公共 IP | 静态 | ~$0.004 | ~$3 |
| Blob Storage | 10GB + 操作 | - | ~$1 |
| 出站流量 | 100GB | - | ~$9 |
| **总计** | | | **~$313/月** |

### 节省成本

- **按需停止 VM**: 不使用时停止 VM 以节省计算费用

  ```bash
  az vm deallocate --resource-group <RG> --name dora-vm
  az vm start --resource-group <RG> --name dora-vm
  ```

- **Azure 预留实例**: 承诺 1-3 年使用可节省 40-60%
- **调整 VM 大小**: 开发环境可使用更小规格

---

## 📚 后续步骤

### 配置 HTTPS (推荐)

1. 获取域名并配置 DNS 指向 VM 公共 IP
2. 使用 Let's Encrypt 配置免费 SSL 证书:

   ```bash
   sudo apt-get update
   sudo apt-get install certbot python3-certbot-nginx
   sudo certbot --nginx -d yourdomain.com
   ```

### 配置自动备份

```bash
# 启用 VM 备份
az backup protection enable-for-vm \
    --resource-group <RG> \
    --vault-name <VAULT_NAME> \
    --vm dora-vm \
    --policy-name DefaultPolicy
```

### 监控和告警

在 Azure Portal 中配置:

- CPU 使用率告警
- 磁盘空间告警
- 应用健康检查

### 更新 DORA 应用

```bash
# SSH 到 VM
ssh azureuser@<PUBLIC_IP>

# 拉取最新镜像
cd /opt/dora
sudo docker compose pull

# 重启服务
sudo docker compose up -d
```

---

## 📖 完整文档

需要更详细的配置说明、原理解释或高级定制?

👉 查看 [完整部署指南 (README.md)](./README.md)

内容包括:

- Deploy to Azure Button 工作原理
- 详细参数说明
- 高级故障排查
- 成本优化策略
- 安全最佳实践

---

## 🔗 相关链接

- **Azure 文档**: [docs.microsoft.com/azure](https://docs.microsoft.com/azure)
- **Bicep 文档**: [docs.microsoft.com/azure/azure-resource-manager/bicep](https://docs.microsoft.com/azure/azure-resource-manager/bicep)
- **Docker 文档**: [docs.docker.com](https://docs.docker.com)

---

## ❓ 获取帮助

遇到问题或需要帮助?

- 查看 [故障排查](#-故障排查) 部分
- 查看 [完整文档](./README.md)
- 提交 GitHub Issue

---

## 📅 模板信息

- **最后更新**: {{GENERATION_DATE}}
- **SAS Token 过期**: {{SAS_EXPIRY_UTC}}
- **存储账户**: {{STORAGE_ACCOUNT_NAME}}
- **容器名称**: {{CONTAINER_NAME}}
- **资源组**: {{RESOURCE_GROUP}}

---

**准备好了吗? 点击页面顶部的 Deploy to Azure 按钮开始部署! 🚀**
