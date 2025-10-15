#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
PARAM_FILE="$REPO_ROOT/infra/azure/vm-prebuilt/parameters.json"
SUBSCRIPTION_ID="b3696a0f-d219-4418-8b63-58f61e2dc39f"
TARGET_RG="RG-IT-DORA-NPD"
TEMPLATE_SPEC_NAME="doraVMPrebuilt"
TEMPLATE_SPEC_VERSION="2.0.0"

# Prevent MSYS from rewriting resource IDs that start with /
PARAM_ARG="@${PARAM_FILE}"

if [[ "${OSTYPE:-}" == msys* || "${OSTYPE:-}" == mingw* ]]; then
	export MSYS2_ARG_CONV_EXCL="*"
	if command -v cygpath >/dev/null 2>&1; then
		PARAM_ARG="@$(cygpath -aw "$PARAM_FILE")"
	else
		# best-effort conversion from /mnt/c or /c prefix to Windows path
		PARAM_ARG="@$(printf '%s' "$PARAM_FILE" | sed -e 's#^/mnt/\([a-zA-Z]\)/#\1:/#' -e 's#^/\([a-zA-Z]\)/#\1:/#')"
	fi
fi

if ! command -v az >/dev/null 2>&1; then
	echo "Azure CLI (az) is required." >&2
	exit 1
fi

if [[ ! -f "$PARAM_FILE" ]]; then
	echo "Parameter file not found: $PARAM_FILE" >&2
	exit 1
fi

az account set --subscription "$SUBSCRIPTION_ID" >/dev/null

TEMPLATE_SPEC_ID=$(az ts show \
	--resource-group "$TARGET_RG" \
	--name "$TEMPLATE_SPEC_NAME" \
	--version "$TEMPLATE_SPEC_VERSION" \
	--query id -o tsv 2>/dev/null || true)

# Remove any Windows carriage returns to avoid invalid resource ID errors
TEMPLATE_SPEC_ID=${TEMPLATE_SPEC_ID//$'\r'/}
TEMPLATE_SPEC_ID=${TEMPLATE_SPEC_ID//$'\n'/}

if [[ -z "$TEMPLATE_SPEC_ID" ]]; then
	echo "Failed to resolve Template Spec ID. Ensure version $TEMPLATE_SPEC_VERSION exists in $TARGET_RG." >&2
	exit 1
fi

az deployment group create \
	--resource-group "$TARGET_RG" \
	--template-spec "$TEMPLATE_SPEC_ID" \
	--parameters "$PARAM_ARG"
