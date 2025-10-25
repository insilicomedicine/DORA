#!/bin/bash

# DORA Deploy to Azure - Template Upload Script
# This script uploads deployment templates to Azure Blob Storage and generates Deploy to Azure button

set -euo pipefail
STORAGE_ACCOUNT_KEY=""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Print functions
print_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}


compute_sas_expiry() {
    # Try common GNU date syntax
    if date -u -d "+1825 days" +"%Y-%m-%dT%H:%M:%SZ" >/dev/null 2>&1; then
        date -u -d "+1825 days" +"%Y-%m-%dT%H:%M:%SZ"
        return 0
    fi
    # Try BSD date syntax (macOS / *BSD)
    if date -u -v+1825d +"%Y-%m-%dT%H:%M:%SZ" >/dev/null 2>&1; then
        date -u -v+1825d +"%Y-%m-%dT%H:%M:%SZ"
        return 0
    fi
    # Epoch arithmetic fallback
    local now_ts
    if ! now_ts=$(date -u +%s 2>/dev/null); then
        return 1
    fi
    local expiry_ts=$((now_ts + 1825*24*3600))
    if date -u -d "@$expiry_ts" +"%Y-%m-%dT%H:%M:%SZ" >/dev/null 2>&1; then
        date -u -d "@$expiry_ts" +"%Y-%m-%dT%H:%M:%SZ"
        return 0
    fi
    if date -u -r "$expiry_ts" +"%Y-%m-%dT%H:%M:%SZ" >/dev/null 2>&1; then
        date -u -r "$expiry_ts" +"%Y-%m-%dT%H:%M:%SZ"
        return 0
    fi
    return 1
}

url_encode() {
    local value="$1"
    local length=${#value}
    local encoded=""
    local i char hex
    for ((i=0; i<length; i++)); do
        char=${value:i:1}
        case "$char" in
            [a-zA-Z0-9.~_-])
                encoded+="$char" ;;
            *)
                if ! hex=$(printf '%s' "$char" | LC_ALL=C od -An -tx1 | tr -d ' \n'); then
                    return 1
                fi
                encoded+="%${hex^^}" ;;
        esac
    done
    printf '%s' "$encoded"
    return 0
}

# Check prerequisites
check_prerequisites() {
    print_info "Checking prerequisites..."

    if ! command -v az &> /dev/null; then
        print_error "未检测到 Azure CLI。安装参考: https://docs.microsoft.com/cli/azure/install-azure-cli"
        exit 1
    fi

    if ! date -u "+%Y-%m-%dT%H:%M:%SZ" >/dev/null 2>&1; then
        print_error "本机 date 命令不支持 UTC 输出格式。"
        exit 1
    fi

	az login
	
    # 显示当前订阅信息
    if az account show >/dev/null 2>&1; then
        local sub_id sub_name tenant_id
        sub_id=$(az account show --query id -o tsv 2>/dev/null || echo "")
        sub_name=$(az account show --query name -o tsv 2>/dev/null || echo "")
        tenant_id=$(az account show --query tenantId -o tsv 2>/dev/null || echo "")
        print_info "当前订阅: $sub_name ($sub_id) | 租户: $tenant_id"
    else
        print_error "无法获取订阅信息，登录可能未成功。"
        exit 1
    fi

    print_success "CLI 基础检查通过。"
}

# Get configuration from user
get_configuration() {
    print_info "Please provide the following information:"
    
    # Storage Account Name
    if [ -z "${STORAGE_ACCOUNT_NAME:-}" ]; then
        read -p "Storage Account Name (leave empty to create new): " STORAGE_ACCOUNT_NAME
        if [ -z "$STORAGE_ACCOUNT_NAME" ]; then
            STORAGE_ACCOUNT_NAME="doradeploy$(date +%s)"
            print_info "Generated storage account name: $STORAGE_ACCOUNT_NAME"
        fi
    fi
    
    # Container Name
    if [ -z "${CONTAINER_NAME:-}" ]; then
        read -p "Container Name [templates]: " CONTAINER_NAME
        CONTAINER_NAME=${CONTAINER_NAME:-templates}
    fi
    
    # Resource Group
    if [ -z "${RESOURCE_GROUP:-}" ]; then
        read -p "Resource Group (leave empty to create new): " RESOURCE_GROUP
        if [ -z "$RESOURCE_GROUP" ]; then
            RESOURCE_GROUP="dora-deploy-rg"
            print_info "Using resource group: $RESOURCE_GROUP"
        fi
    fi
    
    # Location
    if [ -z "${LOCATION:-}" ]; then
        read -p "Azure Location [GermanyWestCentral]: " LOCATION
        LOCATION=${LOCATION:-GermanyWestCentral}
    fi
    
    echo ""
    print_info "Configuration:"
    echo "  Storage Account: $STORAGE_ACCOUNT_NAME"
    echo "  Container: $CONTAINER_NAME"
    echo "  Resource Group: $RESOURCE_GROUP"
    echo "  Location: $LOCATION"
    echo ""
}

# Create or verify storage account and retrieve key
setup_storage() {
    print_info "Setting up storage resources..."

    # Step 1: 先确保资源组存在（不做额外判断）
    if ! az group show --name "$RESOURCE_GROUP" >/dev/null 2>&1; then
        print_info "资源组 $RESOURCE_GROUP 不存在，正在创建..."
        az group create --name "$RESOURCE_GROUP" --location "$LOCATION" --output none || { print_error "创建资源组失败"; exit 1; }
    else
        print_info "资源组 $RESOURCE_GROUP 已存在。"
    fi

    # Step 2: 直接尝试在指定资源组中获取该存储账户（最准确的复用判断）
    if az storage account show --name "$STORAGE_ACCOUNT_NAME" --resource-group "$RESOURCE_GROUP" >/dev/null 2>&1; then
        print_success "检测到存储账户 $STORAGE_ACCOUNT_NAME 已存在于资源组 $RESOURCE_GROUP，直接复用。"
    else
        # 未在当前资源组发现该名称，检查该名称的全局占用情况
        local name_available
        name_available=$(az storage account check-name --name "$STORAGE_ACCOUNT_NAME" --query nameAvailable -o tsv 2>/dev/null || echo "true")

        if [ "$name_available" = "false" ]; then
            # 名称已被占用但不在当前资源组 → 明确报错
            print_error "存储账户名 $STORAGE_ACCOUNT_NAME 已被占用，但不在资源组 $RESOURCE_GROUP。\n可能原因：\n  1) 该账户在其它资源组/订阅中\n  2) 当前 az 订阅上下文不正确 (az account show)\n  3) 没有列出其所在资源组的权限\n解决方式：\n  - 使用正确的资源组重新运行脚本\n  - 更换一个新的存储账户名称"
            exit 1
        fi

        # 名称可用 → 创建新存储账户
        print_info "存储账户名 $STORAGE_ACCOUNT_NAME 在当前订阅中可用，开始创建..."
        az storage account create \
            --name "$STORAGE_ACCOUNT_NAME" \
            --resource-group "$RESOURCE_GROUP" \
            --location "$LOCATION" \
            --sku Standard_LRS \
            --kind StorageV2 \
            --allow-blob-public-access false \
            --https-only true \
            --output none || { print_error "创建存储账户失败"; exit 1; }
        print_success "存储账户创建完成。"
    fi

    # Final validation that storage account now resolvable in chosen resource group
    if ! az storage account show --name "$STORAGE_ACCOUNT_NAME" --resource-group "$RESOURCE_GROUP" >/dev/null 2>&1; then
        print_error "Failed to access storage account $STORAGE_ACCOUNT_NAME in resource group $RESOURCE_GROUP after setup."
        exit 1
    fi

    # Retrieve account key
    STORAGE_ACCOUNT_KEY=$(az storage account keys list \
        --account-name "$STORAGE_ACCOUNT_NAME" \
        --resource-group "$RESOURCE_GROUP" \
        --query [0].value -o tsv)
    if [ -z "$STORAGE_ACCOUNT_KEY" ]; then
        print_error "Failed to retrieve storage account key."
        exit 1
    fi

    # Create container if missing (private)
    if ! az storage container show \
        --name "$CONTAINER_NAME" \
        --account-name "$STORAGE_ACCOUNT_NAME" \
        --account-key "$STORAGE_ACCOUNT_KEY" >/dev/null 2>&1; then
        print_info "Creating private blob container $CONTAINER_NAME..."
        az storage container create \
            --name "$CONTAINER_NAME" \
            --account-name "$STORAGE_ACCOUNT_NAME" \
            --account-key "$STORAGE_ACCOUNT_KEY" \
            --public-access off \
            --output none
    else
        print_info "Container $CONTAINER_NAME exists (private)."
    fi

    print_success "Storage setup complete."
}

# Build Bicep to ARM JSON
build_bicep() {
    print_info "Building Bicep template to ARM JSON..."
    local script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
    local bicep_file="$script_dir/deploy.bicep"
    local json_file="$script_dir/azuredeploy.json"
    if [ ! -f "$bicep_file" ]; then
        print_error "Bicep file not found: $bicep_file"
        exit 1
    fi
    if ! az bicep build --file "$bicep_file" --outfile "$json_file" >/dev/null 2>&1; then
        print_error "Failed to build Bicep file into JSON. Check az CLI version (need >= 2.20)."
        exit 1
    fi
    if [ ! -f "$json_file" ]; then
        print_error "Compiled JSON not found after build: $json_file"
        exit 1
    fi
    print_success "Bicep compiled to $json_file"
}

# Upload files to blob storage
upload_files() {
    print_info "Uploading deployment files..."

    if [ -z "$STORAGE_ACCOUNT_KEY" ]; then
        print_error "Storage account key is missing. Run the storage setup step first."
        exit 1
    fi
    
    local script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
    local files=("azuredeploy.json" "cloud-init.yaml" "createUiDefinition.json" "deploy.bicep")
    
    for file in "${files[@]}"; do
        local file_path="$script_dir/$file"
        if [ ! -f "$file_path" ]; then
            print_error "File not found: $file_path"
            exit 1
        fi
        
        print_info "Uploading $file..."
        local output
        if ! output=$(az storage blob upload \
            --account-name "$STORAGE_ACCOUNT_NAME" \
            --account-key "$STORAGE_ACCOUNT_KEY" \
            --container-name "$CONTAINER_NAME" \
            --name "$file" \
            --file "$file_path" \
            --overwrite \
            --output none 2>&1); then
            print_error "Failed to upload $file: $output"
            exit 1
        fi
    done
    
    print_success "All files uploaded successfully."
}

# Generate Deploy to Azure button from template
generate_deploy_button() {
    print_info "Generating DEPLOY.md from template..."
    
    if [ -z "$STORAGE_ACCOUNT_KEY" ]; then
        print_error "Storage account key is missing. Run the storage setup step first."
        exit 1
    fi

    local sas_expiry
    if ! sas_expiry=$(compute_sas_expiry); then
        print_error "Failed to compute SAS expiry (date command unsupported)."
        exit 1
    fi

    local output
    if ! output=$(az storage blob generate-sas \
        --account-name "$STORAGE_ACCOUNT_NAME" \
        --account-key "$STORAGE_ACCOUNT_KEY" \
        --container-name "$CONTAINER_NAME" \
        --name azuredeploy.json \
        --permissions r \
        --expiry "$sas_expiry" \
        --https-only \
        --output tsv 2>&1); then
        print_error "Failed to generate SAS for azuredeploy.json: $output"
        exit 1
    fi
    local template_sas="$(echo "$output" | tr -d '\r\n')"

    if ! output=$(az storage blob generate-sas \
        --account-name "$STORAGE_ACCOUNT_NAME" \
        --account-key "$STORAGE_ACCOUNT_KEY" \
        --container-name "$CONTAINER_NAME" \
        --name createUiDefinition.json \
        --permissions r \
        --expiry "$sas_expiry" \
        --https-only \
        --output tsv 2>&1); then
        print_error "Failed to generate SAS for createUiDefinition.json: $output"
        exit 1
    fi
    local ui_def_sas="$(echo "$output" | tr -d '\r\n')"

    if [ -z "$template_sas" ] || [ -z "$ui_def_sas" ]; then
        print_error "SAS generation returned empty values."
        exit 1
    fi

    local template_url_with_sas="https://${STORAGE_ACCOUNT_NAME}.blob.core.windows.net/${CONTAINER_NAME}/azuredeploy.json?${template_sas}"
    local ui_def_url_with_sas="https://${STORAGE_ACCOUNT_NAME}.blob.core.windows.net/${CONTAINER_NAME}/createUiDefinition.json?${ui_def_sas}"

    local encoded_template_url
    if ! encoded_template_url=$(url_encode "$template_url_with_sas"); then
        print_error "Failed to encode template JSON URL."
        exit 1
    fi

    local encoded_ui_def_url
    if ! encoded_ui_def_url=$(url_encode "$ui_def_url_with_sas"); then
        print_error "Failed to encode UI definition URL."
        exit 1
    fi

    local deploy_url="https://portal.azure.com/#create/Microsoft.Template/uri/${encoded_template_url}/createUIDefinitionUri/${encoded_ui_def_url}"
    
    # Get script directory
    local script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
    local template_file="${script_dir}/DEPLOY.template.md"
    local output_file="${script_dir}/DEPLOY.md"
    
    # Check if template exists
    if [ ! -f "$template_file" ]; then
        print_error "Template file not found: $template_file"
        exit 1
    fi
    
    # Generate current date
    local generation_date="$(date '+%Y-%m-%d')"
    
    # Replace placeholders in template using sed
    # Escape special characters in URLs for sed
    local deploy_url_escaped="${deploy_url//&/\\&}"
    local template_url_escaped="${template_url_with_sas//&/\\&}"
    local ui_def_url_escaped="${ui_def_url_with_sas//&/\\&}"
    
    sed -e "s|{{DEPLOY_URL}}|${deploy_url_escaped}|g" \
        -e "s|{{GENERATION_DATE}}|${generation_date}|g" \
        -e "s|{{SAS_EXPIRY_UTC}}|${sas_expiry}|g" \
        -e "s|{{STORAGE_ACCOUNT_NAME}}|${STORAGE_ACCOUNT_NAME}|g" \
        -e "s|{{CONTAINER_NAME}}|${CONTAINER_NAME}|g" \
        -e "s|{{RESOURCE_GROUP}}|${RESOURCE_GROUP}|g" \
        "$template_file" > "$output_file"
    
    if [ $? -ne 0 ]; then
        print_error "Failed to generate DEPLOY.md from template"
        exit 1
    fi
    
    print_success "DEPLOY.md generated from template: $output_file"
    echo ""
    print_info "Template placeholders replaced:"
    echo "  - DEPLOY_URL: ${deploy_url:0:80}..."
    echo "  - SAS_EXPIRY_UTC: $sas_expiry"
    echo "  - STORAGE_ACCOUNT_NAME: $STORAGE_ACCOUNT_NAME"
    echo "  - CONTAINER_NAME: $CONTAINER_NAME"
    echo "  - RESOURCE_GROUP: $RESOURCE_GROUP"
    echo ""
    print_info "You can now use DEPLOY.md for one-click deployment documentation."
    echo ""
}

# Main execution
main() {
    echo ""
    echo "======================================"
    echo "  DORA Deploy to Azure Setup Script  "
    echo "======================================"
    echo ""
    
    check_prerequisites
    get_configuration
    setup_storage
    build_bicep
    upload_files
    generate_deploy_button
    
    print_success "Setup completed successfully!"
    echo ""
    print_info "Next steps:"
    echo "  1. Copy the Deploy to Azure button markdown from deploy-button.md"
    echo "  2. Add it to your README.md or documentation"
    echo "  3. Test the deployment by clicking the button"
    echo ""
}

# Run main function
main
