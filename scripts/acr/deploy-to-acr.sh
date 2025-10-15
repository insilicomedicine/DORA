#!/usr/bin/env bash

# Parameterized Azure Container Registry deploy script
# This script is the main worker and accepts command-line args or env vars.
set -euo pipefail

# Default values (can be overridden by env or CLI args)
RESOURCE_GROUP_NAME="${RESOURCE_GROUP_NAME:-dora-rg}"
LOCATION="${LOCATION:-eastus}"
ACR_NAME="${ACR_NAME:-doraacr$RANDOM}"
SKU="${SKU:-Standard}"
TAG="${TAG:-latest}"

# Color output (safe fallbacks if not a TTY)
if [ -t 1 ]; then
	RED='\033[0;31m'
	GREEN='\033[0;32m'
	YELLOW='\033[1;33m'
	CYAN='\033[0;36m'
	NC='\033[0m'
else
	RED=''
	GREEN=''
	YELLOW=''
	CYAN=''
	NC=''
fi

print_info() { echo -e "${CYAN}$1${NC}"; }
print_success() { echo -e "${GREEN}$1${NC}"; }
print_warning() { echo -e "${YELLOW}$1${NC}"; }
print_error() { echo -e "${RED}$1${NC}"; }

show_help() {
	cat <<EOF
Usage: $0 [options]

Options:
	-g, --resource-group NAME   Resource group name (env: RESOURCE_GROUP_NAME)
	-l, --location LOCATION     Azure region (env: LOCATION)
	-n, --acr-name NAME         ACR name (env: ACR_NAME)
	-s, --sku SKU               ACR SKU (env: SKU)
	-t, --tag TAG               Image tag to use for pushed images (env: TAG, default: latest)
	-h, --help                  Show help

Environment variables are supported and take precedence over defaults.
EOF
	exit 0
}

# Parse args (simple loop, allows env override)
while [[ $# -gt 0 ]]; do
	case "$1" in
	-g | --resource-group)
		RESOURCE_GROUP_NAME="$2"
		shift 2
		;;
	-l | --location)
		LOCATION="$2"
		shift 2
		;;
	-n | --acr-name)
		ACR_NAME="$2"
		shift 2
		;;
	-s | --sku)
		SKU="$2"
		shift 2
		;;
	-t | --tag)
		TAG="$2"
		shift 2
		;;
	-h | --help)
		show_help
		;;
	*)
		print_error "Unknown arg: $1"
		show_help
		exit 1
		;;
	esac
done

main() {
	print_info "========================================"
	print_info "Azure Container Registry deployment start"
	print_info "========================================"

	print_warning "\n[1/8] Checking Azure CLI..."
	if ! command -v az &>/dev/null; then
		print_error "Azure CLI is not installed"
		exit 1
	fi
	print_success "✓ Azure CLI available"

	print_warning "\n[2/8] Checking Docker..."
	if ! command -v docker &>/dev/null; then
		print_error "Docker is not installed"
		exit 1
	fi
	if ! docker ps &>/dev/null; then
		print_error "Docker does not appear to be running"
		exit 1
	fi
	print_success "✓ Docker running"

	print_warning "\n[3/8] Checking Azure login..."
	if ! az account show &>/dev/null; then
		print_warning "Not logged in to Azure, launching 'az login'..."
		az login
	fi
	ACCOUNT_NAME=$(az account show --query name -o tsv)
	print_success "✓ Logged into subscription: $ACCOUNT_NAME"

	print_warning "\n[4/8] Ensure resource group exists..."
	if az group exists --name "$RESOURCE_GROUP_NAME" | grep -q "true"; then
		print_success "✓ Resource group '$RESOURCE_GROUP_NAME' exists"
	else
		az group create --name "$RESOURCE_GROUP_NAME" --location "$LOCATION" >/dev/null
		print_success "✓ Resource group '$RESOURCE_GROUP_NAME' created"
	fi

	print_warning "\n[5/8] Ensure Azure Container Registry exists..."
	print_info "ACR name: $ACR_NAME"
	if az acr show --name "$ACR_NAME" --resource-group "$RESOURCE_GROUP_NAME" &>/dev/null; then
		print_success "✓ ACR '$ACR_NAME' exists"
	else
		az acr create \
			--resource-group "$RESOURCE_GROUP_NAME" \
			--name "$ACR_NAME" \
			--sku "$SKU" \
			--admin-enabled false \
			--location "$LOCATION" >/dev/null
		print_success "✓ ACR '$ACR_NAME' created"
	fi

	print_warning "\n[6/8] Retrieve ACR login server..."
	LOGIN_SERVER=$(az acr show --name "$ACR_NAME" --resource-group "$RESOURCE_GROUP_NAME" --query loginServer -o tsv)
	print_success "✓ Login server: $LOGIN_SERVER"

	print_warning "\n[7/8] Login to ACR using AAD..."
	az acr login --name "$ACR_NAME"
	print_success "✓ Logged into ACR"

	print_warning "\n[8/9] Build Docker images..."
	SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
	PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
	print_info "Project root: $PROJECT_ROOT"

	# Build frontend
	print_info "\nBuilding frontend image..."
	docker build -t dora-frontend-local -f "$PROJECT_ROOT/frontend/Dockerfile" "$PROJECT_ROOT/frontend"
	print_success "✓ Frontend image built"

	# Build backend
	print_info "\nBuilding backend image..."
	docker build -t dora-backend-local -f "$PROJECT_ROOT/backend/Dockerfile" "$PROJECT_ROOT/backend"
	print_success "✓ Backend image built"

	print_warning "\n[9/9] Tagging and pushing images..."
	declare -A IMAGES=(["dora-frontend-local"]="dora-frontend" ["dora-backend-local"]="dora-backend")

	for LOCAL_IMAGE in "${!IMAGES[@]}"; do
		REMOTE_IMAGE="${IMAGES[$LOCAL_IMAGE]}"
		TAGGED_IMAGE="$LOGIN_SERVER/${REMOTE_IMAGE}:$TAG"
		print_info "  Tagging: $LOCAL_IMAGE -> $TAGGED_IMAGE"
		docker tag "$LOCAL_IMAGE" "$TAGGED_IMAGE"
	done
	print_success "✓ Images tagged"

	for LOCAL_IMAGE in "${!IMAGES[@]}"; do
		REMOTE_IMAGE="${IMAGES[$LOCAL_IMAGE]}"
		TAGGED_IMAGE="$LOGIN_SERVER/${REMOTE_IMAGE}:$TAG"
		print_info "  Pushing: $TAGGED_IMAGE"
		docker push "$TAGGED_IMAGE"
		print_success "  ✓ Pushed: $REMOTE_IMAGE"
	done

	print_info "\n========================================"
	print_success "Deployment finished!"
	print_info "========================================"

	print_warning "\nRepository info:"
	print_info "  Login server: $LOGIN_SERVER"
	print_info "  Resource group: $RESOURCE_GROUP_NAME"
	print_info "  Location: $LOCATION"
	print_info "  SKU: $SKU"

	print_warning "\nAvailable images:"
	az acr repository list --name "$ACR_NAME" --output table || true

	print_warning "\nNext steps:"
	print_info "1. Update docker-compose.yml image references to use:"
	print_info "   - $LOGIN_SERVER/dora-frontend:$TAG"
	print_info "   - $LOGIN_SERVER/dora-backend:$TAG"

	print_info "\n2. To pull images as an authorized user:"
	print_info "   az acr login --name $ACR_NAME"
	print_info "   docker pull $LOGIN_SERVER/dora-frontend:$TAG"
}

trap 'print_error "\n❌ Script failed"; exit 1' ERR

main

exit 0
