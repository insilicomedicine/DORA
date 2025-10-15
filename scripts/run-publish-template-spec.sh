#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Call the native bash version of publish-template-spec
"$SCRIPT_DIR/publish-template-spec.sh" \
	-g "RG-IT-DORA-NPD" \
	-n "doraVMPrebuilt" \
	-v "2.0.0" \
	-s "b3696a0f-d219-4418-8b63-58f61e2dc39f"
