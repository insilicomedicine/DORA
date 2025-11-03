#!/usr/bin/env bash

# DORA AKS One-Click Deployment Script
# This script deploys the DORA application to Azure Kubernetes Service (AKS)
# using Terraform for infrastructure and Helm for application deployment.

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TERRAFORM_DIR="${SCRIPT_DIR}/terraform"
HELM_DIR="${SCRIPT_DIR}/helm"

# Log functions
log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check prerequisites
check_prerequisites() {
    log_info "Checking prerequisites..."
    
    # Check if Azure CLI is installed
    if ! command -v az &> /dev/null; then
        log_error "Azure CLI is not installed. Please install it from: https://docs.microsoft.com/en-us/cli/azure/install-azure-cli"
        exit 1
    fi
    
    # Check if Terraform is installed
    if ! command -v terraform &> /dev/null; then
        log_error "Terraform is not installed. Please install it from: https://www.terraform.io/downloads"
        exit 1
    fi
    
    # Check if Helm is installed
    if ! command -v helm &> /dev/null; then
        log_error "Helm is not installed. Please install it from: https://helm.sh/docs/intro/install/"
        exit 1
    fi
    
    # Check if kubectl is installed
    if ! command -v kubectl &> /dev/null; then
        log_error "kubectl is not installed. Please install it from: https://kubernetes.io/docs/tasks/tools/"
        exit 1
    fi
    
    # Check if jq is installed
    if ! command -v jq &> /dev/null; then
        log_error "jq is not installed. Please install it from: https://stedolan.github.io/jq/download/ or use your package manager (e.g. 'sudo apt-get install jq' or 'choco install jq' on Windows)."
        exit 1
    fi
    
    # Check if Docker is installed (optional but recommended for troubleshooting)
    if command -v docker &> /dev/null; then
        # Docker is installed, check if it's running
        if docker info &> /dev/null; then
            log_info "Docker is running."
        else
            log_warn "Docker is installed but not running. This may limit troubleshooting capabilities."
            log_warn "To start Docker:"
            log_warn "  - Windows/Mac: Start Docker Desktop application"
            log_warn "  - Linux: sudo systemctl start docker"
        fi
    else
        log_warn "Docker is not installed. This is OK for public images, but you won't be able to test image pulls locally."
    fi

    # Check if logged in to Azure
    if ! az account show &> /dev/null; then
        log_error "Not logged in to Azure. Please run 'az login' first."
        exit 1
    fi

    log_info "All prerequisites met!"
}

# Ensure resource group exists
ensure_resource_group() {
    log_info "Checking if resource group exists..."
    
    cd "${TERRAFORM_DIR}"
    
    # Read resource group name and location from terraform.tfvars
    RESOURCE_GROUP=$(grep -E '^resource_group_name' terraform.tfvars | sed 's/.*= *"\(.*\)".*/\1/' | tr -d '"')
    LOCATION=$(grep -E '^location' terraform.tfvars | sed 's/.*= *"\(.*\)".*/\1/' | tr -d '"')
    
    if [ -z "$RESOURCE_GROUP" ] || [ -z "$LOCATION" ]; then
        log_error "Could not read resource_group_name or location from terraform.tfvars"
        exit 1
    fi
    
    # Check if resource group exists
    if az group show --name "${RESOURCE_GROUP}" &> /dev/null; then
        log_info "Resource group '${RESOURCE_GROUP}' already exists."
    else
        log_warn "Resource group '${RESOURCE_GROUP}' does not exist. Creating..."
        
        if az group create --name "${RESOURCE_GROUP}" --location "${LOCATION}"; then
            log_info "Resource group '${RESOURCE_GROUP}' created successfully in ${LOCATION}."
        else
            log_error "Failed to create resource group '${RESOURCE_GROUP}'."
            exit 1
        fi
    fi
}

# Deploy infrastructure with Terraform
deploy_infrastructure() {
    log_info "Deploying infrastructure with Terraform..."
    
    cd "${TERRAFORM_DIR}"
    
    # Initialize Terraform
    log_info "Initializing Terraform..."
    terraform init
    
    # Create execution plan
    log_info "Creating Terraform execution plan..."
    terraform plan -out=main.tfplan
    
    # Confirm deployment
    echo ""
    read -p "Do you want to proceed with the infrastructure deployment? (yes/no): " confirm
    if [ "$confirm" != "yes" ]; then
        log_warn "Deployment cancelled by user."
        exit 0
    fi
    
    # Apply Terraform configuration
    log_info "Applying Terraform configuration..."
    terraform apply main.tfplan
    
    log_info "Infrastructure deployment completed!"
}

# Configure kubectl
configure_kubectl() {
    log_info "Configuring kubectl to access AKS cluster..."
    
    cd "${TERRAFORM_DIR}"
    
    # Get cluster name and resource group from Terraform outputs
    CLUSTER_NAME=$(terraform output -raw aks_cluster_name)
    RESOURCE_GROUP=$(terraform output -raw resource_group_name)
    
    # Get AKS credentials
    az aks get-credentials --resource-group "${RESOURCE_GROUP}" --name "${CLUSTER_NAME}" --overwrite-existing
    
    # Verify connection
    kubectl get nodes
    
    log_info "kubectl configured successfully!"
}

# Install NGINX Ingress Controller
install_nginx_ingress() {
    log_info "Installing NGINX Ingress Controller..."
    
    cd "${TERRAFORM_DIR}"
    
    # Get the public IP from Terraform outputs
    INGRESS_IP=$(terraform output -raw ingress_public_ip)
    NODE_RESOURCE_GROUP=$(az aks show --resource-group $(terraform output -raw resource_group_name) --name $(terraform output -raw aks_cluster_name) --query nodeResourceGroup -o tsv)
    
    # Add NGINX Ingress Helm repository
    helm repo add ingress-nginx https://kubernetes.github.io/ingress-nginx
    helm repo update
    
    # Install NGINX Ingress Controller
    helm upgrade --install ingress-nginx ingress-nginx/ingress-nginx \
        --namespace ingress-nginx \
        --create-namespace \
        --set controller.service.loadBalancerIP="${INGRESS_IP}" \
        --set controller.service.annotations."service\.beta\.kubernetes\.io/azure-load-balancer-resource-group"="${NODE_RESOURCE_GROUP}" \
        --set controller.service.externalTrafficPolicy=Local \
        --set controller.config.proxy-body-size="0" \
        --set controller.config.proxy-read-timeout="3600" \
        --set controller.config.proxy-send-timeout="3600"
    
    # Wait for NGINX Ingress Controller to be ready
    log_info "Waiting for NGINX Ingress Controller to be ready..."
    kubectl wait --namespace ingress-nginx \
        --for=condition=ready pod \
        --selector=app.kubernetes.io/component=controller \
        --timeout=300s
    
    log_info "NGINX Ingress Controller installed successfully!"
}

# Generate Helm values from Terraform outputs
generate_helm_values() {
    log_info "Generating Helm values file from Terraform outputs..."
    
    cd "${TERRAFORM_DIR}"
    
    # Extract Terraform outputs
    POSTGRES_HOST=$(terraform output -raw postgres_fqdn)
    POSTGRES_USER=$(terraform output -raw postgres_admin_username)
    POSTGRES_PASSWORD=$(terraform output -raw postgres_admin_password)
    POSTGRES_DB=$(terraform output -raw postgres_database_name)
    POSTGRES_CONN_STR=$(terraform output -raw postgres_connection_string)
    
    REDIS_HOST=$(terraform output -raw redis_hostname)
    REDIS_PORT=$(terraform output -raw redis_port)
    REDIS_PASSWORD=$(terraform output -raw redis_primary_key)
    REDIS_CONN_STR=$(terraform output -raw redis_connection_string)
    REDIS_CACHE_DB=$(terraform output -raw redis_cache_db)
    REDIS_BROKER_DB=$(terraform output -raw redis_broker_db)
    REDIS_CHANNELS_DB=$(terraform output -raw redis_channels_db)
    REDIS_CHUNKS_DB=$(terraform output -raw redis_chunks_db)
    REDIS_WEBCHUNKS_DB=$(terraform output -raw redis_webchunks_db)
    
    INGRESS_FQDN=$(terraform output -raw ingress_fqdn)
    DJANGO_SECRET=$(terraform output -raw django_secret_key)
    
    # Storage Account (created by Terraform)
    STORAGE_CONN_STR=$(terraform output -raw storage_connection_string)
    STORAGE_CONTAINER=$(terraform output -raw storage_container_name)
    
    # OpenAI Configuration
    OPENAI_API_KEY=$(terraform output -raw openai_api_key)
    OPENAI_API_TYPE=$(terraform output -raw openai_api_type)
    OPENAI_API_BASE_URL=$(terraform output -raw openai_api_base_url)
    OPENAI_API_VERSION=$(terraform output -raw openai_api_version)
    OPENAI_DEPLOYMENT_NAME=$(terraform output -raw openai_deployment_name)
    EMBEDDING_OPENAI_API_CONFIGS=$(terraform output -raw embedding_openai_api_configs)
    
    # Create Helm values file
    cat > "${HELM_DIR}/generated-values.yaml" <<EOF
# Generated Helm values from Terraform outputs
# Generated at: $(date -u '+%Y-%m-%d %H:%M:%S UTC')

backend:
  env:
    # Database Configuration
    DB_HOST: "${POSTGRES_HOST}"
    DB_PORT: "5432"
    DB_NAME: "${POSTGRES_DB}"
    DB_USER: "${POSTGRES_USER}"
    DB_PASSWORD: "${POSTGRES_PASSWORD}"
    DATABASE_URL: "${POSTGRES_CONN_STR}"
    
    # Redis Configuration
    REDIS_CONN_STR: "${REDIS_CONN_STR}"
    REDIS_CACHE_DB: "${REDIS_CACHE_DB}"
    REDIS_BROKER_DB: "${REDIS_BROKER_DB}"
    REDIS_CHANNELS_DB: "${REDIS_CHANNELS_DB}"
    REDIS_CHUNKS_DB: "${REDIS_CHUNKS_DB}"
    REDIS_WEBCHUNKS_DB: "${REDIS_WEBCHUNKS_DB}"
    
    # Django Configuration
    SECRET_KEY: "${DJANGO_SECRET}"
    
    # Azure Storage Configuration
    AZURE_STORAGE_CONNECTION_STRING: "${STORAGE_CONN_STR}"
    AZURE_STORAGE_CONTAINER: "${STORAGE_CONTAINER}"
    
    # Application URLs
    DORA_PUBLIC_URL: "http://${INGRESS_FQDN}"
    DORA_STATIC_URL: "http://${INGRESS_FQDN}"
    CSRF_TRUSTED_ORIGINS: "http://${INGRESS_FQDN}"
    
    # OpenAI Configuration
    OPENAI_API_KEY: "${OPENAI_API_KEY}"
    OPENAI_API_TYPE: "${OPENAI_API_TYPE}"
    OPENAI_API_BASE_URL: "${OPENAI_API_BASE_URL}"
    OPENAI_API_VERSION: "${OPENAI_API_VERSION}"
    OPENAI_API_DEPLOYMENT_NAME: "${OPENAI_DEPLOYMENT_NAME}"
    
    # Embedding Configuration
    EMBEDDING_OPENAI_API_CONFIGS: '${EMBEDDING_OPENAI_API_CONFIGS}'

ingress:
  hosts:
    - host: "${INGRESS_FQDN}"
      paths:
        - path: /
          pathType: Prefix
EOF
    
    log_info "Helm values file generated at: ${HELM_DIR}/generated-values.yaml"
}

# Create Docker registry secret for private image registry
create_docker_secret() {
    log_info "Configuring Docker registry authentication (private images assumed)..."

    # Check if docker secret already exists
    if kubectl get secret regcred -n dora &> /dev/null; then
        log_info "Docker registry secret already exists, skipping creation."
        return 0
    fi

    # Ensure namespace exists before creating secret (avoid previous failure)
    if ! kubectl get namespace dora &> /dev/null; then
        log_info "Namespace 'dora' not found. Creating it before secret creation..."
        kubectl create namespace dora
    fi

    # Support non-interactive credentials via env vars
    DOCKER_USERNAME=${DOCKER_USERNAME:-}
    DOCKER_PASSWORD=${DOCKER_PASSWORD:-}

    if [ -z "$DOCKER_USERNAME" ]; then
        read -p "Docker Hub username (or set DOCKER_USERNAME env var): " DOCKER_USERNAME
    fi
    if [ -z "$DOCKER_PASSWORD" ]; then
        read -sp "Docker Hub password or access token (or set DOCKER_PASSWORD env var): " DOCKER_PASSWORD
        echo ""
    fi

    if [ -z "$DOCKER_USERNAME" ] || [ -z "$DOCKER_PASSWORD" ]; then
        log_error "Docker credentials are required for private registry access. Set DOCKER_USERNAME/DOCKER_PASSWORD or enter interactively."
        exit 1
    fi

    kubectl create secret docker-registry regcred \
        --docker-server=https://index.docker.io/v1/ \
        --docker-username="${DOCKER_USERNAME}" \
        --docker-password="${DOCKER_PASSWORD}" \
        --namespace=dora

    log_info "Docker registry secret created successfully (type: docker-registry)."
}

# Deploy application with Helm
deploy_application() {
    log_info "Deploying DORA application with Helm..."
    
    # Install/upgrade Helm chart
    helm upgrade --install dora "${HELM_DIR}/dora" \
        --namespace dora \
        --create-namespace \
        --values "${HELM_DIR}/dora/values.yaml" \
        --values "${HELM_DIR}/generated-values.yaml" \
        --wait \
        --timeout 10m
    
    log_info "Application deployed successfully!"
}

# Display deployment information
display_info() {
    log_info "=========================================="
    log_info "DORA Deployment Complete!"
    log_info "=========================================="
    
    cd "${TERRAFORM_DIR}"
    
    INGRESS_FQDN=$(terraform output -raw ingress_fqdn)
    INGRESS_IP=$(terraform output -raw ingress_public_ip)
    
    echo ""
    log_info "Application URL: http://${INGRESS_FQDN}"
    log_info "Ingress IP: ${INGRESS_IP}"
    echo ""
    log_info "To check application status:"
    echo "  kubectl get pods -n dora"
    echo ""
    log_info "To view logs:"
    echo "  kubectl logs -n dora -l app.kubernetes.io/component=backend"
    echo ""
    log_info "To access the application, navigate to: http://${INGRESS_FQDN}"
    echo ""
    log_warn "Note: It may take a few minutes for DNS to propagate."
    log_warn "You can also access the application via IP: http://${INGRESS_IP}"
    echo ""
}

# Main deployment flow
main() {
    echo "=========================================="
    echo "DORA AKS One-Click Deployment"
    echo "=========================================="
    echo ""
    
    check_prerequisites
    ensure_resource_group
    deploy_infrastructure
    configure_kubectl
    install_nginx_ingress
    generate_helm_values
    # Ensure namespace earlier if user wants private images (handled inside create_docker_secret)
    create_docker_secret
    deploy_application
    display_info
    
    log_info "Deployment complete! Enjoy using DORA on AKS!"
}

# Run main function
main "$@"
