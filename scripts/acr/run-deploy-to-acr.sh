#!/usr/bin/env bash
# Wrapper script: set local fixed parameters and call the main deploy script
set -euo pipefail

# ---- Configuration (edit these values for your environment) ----
export RESOURCE_GROUP_NAME="RG-IT-DORA-NPD"
export LOCATION="GermanyWestCentral"
export ACR_NAME="doradev"
export SKU="Standard"
export TAG="s3proxy"
# ----------------------------------------------------------------

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
MAIN_SCRIPT="$SCRIPT_DIR/deploy-to-acr.sh"

if [ ! -x "$MAIN_SCRIPT" ] && [ -f "$MAIN_SCRIPT" ]; then
	# try to make it executable, if possible
	chmod +x "$MAIN_SCRIPT" || true
fi

echo "Calling main deploy script: $MAIN_SCRIPT"
echo "  RESOURCE_GROUP_NAME=$RESOURCE_GROUP_NAME"
echo "  LOCATION=$LOCATION"
echo "  ACR_NAME=$ACR_NAME"
echo "  SKU=$SKU"
echo "  TAG=$TAG"

"$MAIN_SCRIPT"

exit $?
