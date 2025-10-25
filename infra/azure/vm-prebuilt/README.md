# DORA Deploy to Azure - 完整部署指南

## 📖 目录

- [简介](#简介)
- [Deploy to Azure Button 原理](#deploy-to-azure-button-原理)
- [前置条件](#前置条件)
- [快速开始](#快速开始)
- [详细操作步骤](#详细操作步骤)
- [部署参数说明](#部署参数说明)
- [更新模板](#更新模板)
- [故障排查](#故障排查)
- [成本估算](#成本估算)

---

## 简介

本指南将帮助你配置和使用 **Deploy to Azure Button**，实现 DORA 应用的一键部署到 Azure 虚拟机。

### 什么是 Deploy to Azure Button?

Deploy to Azure Button 是微软提供的一键部署解决方案，允许用户通过点击按钮直接在 Azure Portal 中部署资源，无需手动配置复杂的基础设施。

**一键部署效果**: 参见 [DEPLOY.md](./DEPLOY.md)

---

## Deploy to Azure Button 原理

### 工作流程

```
用户点击按钮
    ↓
Azure Portal 打开自定义部署界面
    ↓
从 Blob Storage 下载 ARM 模板和 UI 定义
    ↓
用户填写部署参数
    ↓
Azure 执行资源部署
    ↓
部署完成，返回资源信息
```

### 核心组件

1. **ARM 模板 (azuredeploy.json)**
   - 从 Bicep 文件编译而来
   - 定义所有 Azure 资源(VM、网络、存储等)
   - 包含 cloud-init 配置用于 VM 初始化

2. **UI 定义 (createUiDefinition.json)**
   - 定义 Azure Portal 中的部署向导界面
   - 提供参数验证和帮助提示
   - 支持多步骤配置流程

3. **Blob Storage**
   - 托管模板文件，提供公共访问
   - 使用 SAS Token 实现有限期访问控制
   - 支持模板版本管理

4. **Deploy URL 结构**
   ```
   https://portal.azure.com/#create/Microsoft.Template/
   uri/<ENCODED_ARM_TEMPLATE_URL>/
   createUIDefinitionUri/<ENCODED_UI_DEFINITION_URL>
   ```

### 为什么选择这种方案?

✅ **用户友好** - 无需技术背景即可部署  
✅ **可重复** - 确保每次部署的一致性  
✅ **可维护** - 更新模板即可影响所有新部署  
✅ **安全** - 敏感参数在 Portal 中加密输入  
✅ **合规** - 符合企业 Azure 治理策略

---

## 前置条件

在开始之前，请确保:

### 必需项

1. **Azure 订阅**
   - 具有创建资源的权限
   - 配额足够创建 VM 和相关资源

2. **Azure CLI**
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

3. **DORA Docker 镜像**
   - `dora-backend:blob` 已推送到 Azure Container Registry
   - `dora-frontend:blob` 已推送到 Azure Container Registry

4. **ACR Token**
   ```bash
   # 创建 ACR Token (具有 pull 权限)
   az acr token create \
       --name dora-deploy-token \
       --registry <YOUR_ACR_NAME> \
       --scope-map _repositories_pull \
       --status enabled
   
   # 生成密码
   az acr token credential generate \
       --name dora-deploy-token \
       --registry <YOUR_ACR_NAME> \
       --password1
   ```

5. **OpenAI API 访问**
   - OpenAI API Key 或
   - Azure OpenAI Service 端点和密钥

### 可选项

- SSH 密钥对 (用于 VM 访问)
- 自定义域名

---

## 快速开始

### 3 分钟配置 

```bash
cd /path/to/DORA/infra/azure/vm-prebuilt
chmod +x upload-template.sh
./upload-template.sh
```
在 Windows 下请使用 Git Bash、WSL、MSYS2 或任何提供 POSIX Shell 的环境运行上述脚本。

脚本会自动:

- ✅ 创建/验证 Storage Account
- ✅ 创建 Blob Container
- ✅ 编译 Bicep 到 ARM JSON
- ✅ 上传所有部署文件
- ✅ 生成 SAS Token (5年有效期)
- ✅ 从 `DEPLOY.template.md` 生成 `DEPLOY.md`
- ✅ 替换模板中的占位符 (URL、过期时间、账户信息等)

**完成后**: 查看 `DEPLOY.md` 文件获取部署按钮和说明。

> **模板机制**: 脚本使用 `DEPLOY.template.md` 作为基础模板，仅替换其中的动态占位符 (`{{DEPLOY_URL}}`、`{{SAS_EXPIRY_UTC}}` 等)，而非覆盖整个文件。这样你可以自由编辑模板内容（如添加说明、调整格式），每次运行脚本时仅刷新动态数据。

---

### 脚本内部做了什么？

执行期间脚本会顺序完成以下流程：

1. 环境检查
   - 检测 `az` CLI 是否可用并已登录 (`az account show`)
   - 检测系统 `date` 命令是否支持 UTC 输出（用于计算长期有效的 SAS 过期时间）
2. 交互式收集配置（或使用现有环境变量）
   - `STORAGE_ACCOUNT_NAME`（如留空自动生成唯一名称）
   - `CONTAINER_NAME`（默认 `templates`）
   - `RESOURCE_GROUP`（存在则复用，不存在则创建）
   - `LOCATION`（默认 `eastus`）
3. 创建 / 复用资源
   - 如果资源组不存在则创建
   - 检查存储账户是否已存在，存在则直接获取 key，不存在则创建（启用 Blob 公共读取访问）
   - 创建或确保目标容器存在（Blob 级公共访问）
4. 编译 Bicep 模板
   - 使用 `az bicep build` 将 `deploy.bicep` 编译为 `azuredeploy.json`
   - 编译后生成的 ARM JSON用于 Portal 直接部署（避免 Portal 在线编译失败风险）
5. 生成长期有效期 SAS Token（默认 5 年，可在脚本中调整）
   - 对 `azuredeploy.json` 和 `createUiDefinition.json` 各生成只读 SAS
   - 支持多种 `date` 语法（GNU / BSD / epoch 回退）保证跨平台兼容
6. 上传部署文件
   - 上传/覆盖：`azuredeploy.json`、`createUiDefinition.json`、`cloud-init.yaml`、`deploy.bicep`
   - 再次上传确保 ARM 模板与 UI 定义与 SAS 生效时间一致
7. 构建 Deploy to Azure 按钮 URL
   - 对 ARM 模板 SAS URL 和 UI 定义 SAS URL 做 URL 编码
   - 拼接 Portal 部署入口：`https://portal.azure.com/#create/Microsoft.Template/uri/<...>/createUIDefinitionUri/<...>`
8. 生成输出文档
   - 从 `DEPLOY.template.md` 读取模板
   - 使用 `sed` 替换占位符：`{{DEPLOY_URL}}`、`{{SAS_EXPIRY_UTC}}`、`{{STORAGE_ACCOUNT_NAME}}` 等
   - 写入最终的 `DEPLOY.md`（保留模板中的所有静态内容，仅更新动态数据）
   - 便于复制到主项目 README 或其他文档站点

---

## 部署参数说明

### 基本配置

| 参数 | 说明 | 示例值 |
|------|------|--------|
| `vmName` | 虚拟机名称 | `dora-vm` |
| `adminUsername` | 管理员用户名 | `azureuser` |
| `adminSshPublicKey` | SSH 公钥 | `ssh-ed25519 AAAA...` |
| `location` | Azure 区域 | `eastus`, `westeurope` |

### VM 配置

| 参数 | 说明 | 推荐值 |
|------|------|--------|
| `vmSize` | VM 规格 | `Standard_D8s_v5` (8核16GB) |
| `dataDiskSizeGB` | 数据磁盘大小 | `128` GB |
| `dnsLabelPrefix` | DNS 前缀 | `dora-demo` (可选) |

### 容器注册表

| 参数 | 说明 | 示例值 |
|------|------|--------|
| `acrLoginServer` | ACR 服务器 | `myregistry.azurecr.io` |
| `acrTokenUsername` | Token 用户名 | `dora-deploy-token` |
| `acrTokenPassword` | Token 密码 | `***` (安全参数) |

### 应用配置

| 参数 | 说明 | 要求 |
|------|------|------|
| `secretKey` | Django 密钥 | 至少 50 个字符 |
| `storageContainerName` | Blob 容器名 | `media` (默认) |

### AI 配置

| 参数 | 说明 | 示例值 |
|------|------|--------|
| `openAiApiType` | API 类型 | `openai`, `azure`, `custom` |
| `openAiApiKey` | API 密钥 | `sk-...` 或 Azure Key |
| `openAiApiBaseUrl` | API 端点 | Azure OpenAI 端点 |
| `openAiApiVersion` | API 版本 | `2025-01-01-preview` |
| `openAiDeploymentName` | 部署名称 | `gpt-5` (Azure) |
| `embeddingOpenAiApiConfigs` | Embedding 配置 | JSON 数组字符串 |

**Embedding 配置格式示例**:
```json
[
  {
    "model": "text-embedding-3-small",
    "api_key": "sk-...",
    "base_url": "https://api.openai.com/v1",
    "version": "",
    "deployment_name": ""
  }
]
```

---

## 更新模板

### 更新已部署的模板

当你修改了 Bicep 模板或其他文件:

```bash
# 方式 1: 重新运行脚本
./upload-template.sh

# 方式 2: 手动更新特定文件
az bicep build --file deploy.bicep --outfile azuredeploy.json

az storage blob upload \
    --account-name $STORAGE_ACCOUNT_NAME \
    --account-key "$STORAGE_KEY" \
    --container-name $CONTAINER_NAME \
    --name azuredeploy.json \
    --file azuredeploy.json \
    --overwrite
```

**重要**: Deploy URL 保持不变,用户会自动获取最新版本的模板。

### 更新 SAS Token (到期前)

```bash
# 生成新的 SAS Token
NEW_EXPIRY=$(date -u -d "+1825 days" '+%Y-%m-%dT%H:%M:%SZ')

# 重新生成 SAS 并更新 Deploy URL
# 运行 upload-template.sh 脚本会自动完成
```

---

## 文件说明

### 核心文件

- **`deploy.bicep`** - Bicep 基础设施即代码模板
- **`azuredeploy.json`** - 编译后的 ARM 模板
- **`createUiDefinition.json`** - Azure Portal 部署 UI 定义
- **`cloud-init.yaml`** - VM 初始化配置
- **`upload-template.sh`** - 模板上传与按钮生成脚本 (跨平台: Linux / macOS / Windows Git Bash/WSL)
- **`parameters.example.json`** - 参数示例文件
- **`DEPLOY.template.md`** - 部署页面模板（包含占位符）

### 文档文件

- **`README.md`** - 本文件,完整部署指南
- **`DEPLOY.md`** - 从模板生成的一键部署页面（由脚本自动生成，不要手动编辑）

### 模板占位符说明

`DEPLOY.template.md` 中使用以下占位符，运行脚本时自动替换：

- `{{DEPLOY_URL}}` - 完整的 Azure Portal 部署链接
- `{{GENERATION_DATE}}` - 生成日期
- `{{SAS_EXPIRY_UTC}}` - SAS Token 过期时间 (UTC)
- `{{STORAGE_ACCOUNT_NAME}}` - Azure 存储账户名称
- `{{CONTAINER_NAME}}` - Blob 容器名称
- `{{RESOURCE_GROUP}}` - Azure 资源组名称

---
