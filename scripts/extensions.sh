#!/usr/bin/env bash
set -e
# 用于启用或禁用 tenant/device 扩展模块
# Usage:
#   ./scripts/extensions.sh enable tenant tenantA
#   ./scripts/extensions.sh disable device deviceTypeX
MODE=$1
SCOPE=$2
NAME=$3
TARGET="backend/src/extensions/${SCOPE}s/${NAME}.extension.ts"
if [[ "$MODE" == "enable" && -f "$TARGET" ]]; then
  echo "✅ Enabling $SCOPE extension: $NAME"
  touch "$TARGET.enabled"
elif [[ "$MODE" == "disable" && -f "$TARGET" ]]; then
  echo "🚫 Disabling $SCOPE extension: $NAME"
  rm -f "$TARGET.enabled"
else
  echo "⚠️  Invalid usage or extension not found"
fi
