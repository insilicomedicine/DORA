#!/usr/bin/env bash
set -euo pipefail

# Publish a Bicep file as an Azure Template Spec (POSIX sh version)
# Usage:
#   ./scripts/publish-template-spec.sh -g <resource-group> -n <templateSpecName> [-v <version>] [-l <location>] [-s <subscription>] [-t <templateFile>]

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

RESOURCE_GROUP=""
TEMPLATE_NAME=""
TEMPLATE_VERSION="1.0.0"
LOCATION=""
SUBSCRIPTION_ID=""
TEMPLATE_FILE="infra/azure/vm-prebuilt/deploy.bicep"

show_usage() {
	cat <<EOF
Usage: $0 -g <resource-group> -n <templateSpecName> [-v <version>] [-l <location>] [-s <subscriptionId>] [-t <templateFile>]

Options:
  -g  Resource group that will hold the Template Spec (required)
  -n  Template Spec name (required)
  -v  Template Spec version (default: 1.0.0)
  -l  Azure location (if omitted, resolved from the resource group)
  -s  Subscription ID to set (optional)
  -t  Path to Bicep template file relative to repo root (default: infra/azure/vm-prebuilt/deploy.bicep)
  -h  Show this help

Example:
  $0 -g RG-IT-DORA-NPD -n doraVMPrebuilt -v 1.0.0 -s b3696a0f-d219-4418-8b63-58f61e2dc39f
EOF
}

while getopts ":g:n:v:l:s:t:h" opt; do
	case "$opt" in
	g) RESOURCE_GROUP="$OPTARG" ;;
	n) TEMPLATE_NAME="$OPTARG" ;;
	v) TEMPLATE_VERSION="$OPTARG" ;;
	l) LOCATION="$OPTARG" ;;
	s) SUBSCRIPTION_ID="$OPTARG" ;;
	t) TEMPLATE_FILE="$OPTARG" ;;
	h)
		show_usage
		exit 0
		;;
	:)
		echo "Missing argument for -$OPTARG" >&2
		show_usage
		exit 2
		;;
	\?)
		echo "Invalid option: -$OPTARG" >&2
		show_usage
		exit 2
		;;
	esac
done

if [ -z "$RESOURCE_GROUP" ] || [ -z "$TEMPLATE_NAME" ]; then
	echo "Error: -g and -n are required." >&2
	show_usage
	exit 2
fi

if ! command -v az >/dev/null 2>&1; then
	echo "Azure CLI (az) is required. Install from https://learn.microsoft.com/cli/azure/install-azure-cli." >&2
	exit 3
fi

# Use UTF-8 locale for subprocesses to avoid encoding warnings
export LANG=C.UTF-8
export LC_ALL=C.UTF-8
# Force Azure CLI (Python-based) to use UTF-8 encoding on Windows
export PYTHONIOENCODING=utf-8

if [ -n "$SUBSCRIPTION_ID" ]; then
	echo "Setting subscription: $SUBSCRIPTION_ID"
	az account set --subscription "$SUBSCRIPTION_ID"
fi

if [ -z "$LOCATION" ]; then
	echo "Resolving location from resource group: $RESOURCE_GROUP"
	LOCATION=$(az group show --name "$RESOURCE_GROUP" --query location -o tsv 2>/dev/null || true)
	if [ -z "$LOCATION" ]; then
		echo "Unable to resolve location for resource group '$RESOURCE_GROUP'. Specify -l explicitly." >&2
		exit 4
	fi
fi

# Resolve template path
TEMPLATE_PATH="$REPO_ROOT/$TEMPLATE_FILE"
if [ ! -f "$TEMPLATE_PATH" ]; then
	echo "Template file not found: $TEMPLATE_PATH" >&2
	exit 5
fi

echo "Publishing Template Spec '$TEMPLATE_NAME' version '$TEMPLATE_VERSION' to resource group '$RESOURCE_GROUP' in location '$LOCATION'..."

# Create Template Spec (az ts create will fail if the same version already exists)
az ts create \
	--resource-group "$RESOURCE_GROUP" \
	--name "$TEMPLATE_NAME" \
	--version "$TEMPLATE_VERSION" \
	--location "$LOCATION" \
	--template-file "$TEMPLATE_PATH" \
	--description "DORA prebuilt Azure VM deployment" >/dev/null

if [ $? -ne 0 ]; then
	echo "az ts create failed. Check that the Template Spec name and version are valid, or bump the version." >&2
	exit 6
fi

echo "Template Spec '$TEMPLATE_NAME' version '$TEMPLATE_VERSION' published in resource group '$RESOURCE_GROUP'."

exit 0
