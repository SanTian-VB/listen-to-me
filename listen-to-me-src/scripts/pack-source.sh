#!/usr/bin/env bash
# 仅打包源码（不含 node_modules / dist），zip 体积通常 < 1MB
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
OUT="${1:-${ROOT}/../listen-to-me-src.zip}"
cd "$ROOT"
zip -r "$OUT" . \
  -x 'node_modules/*' \
  -x 'dist/*' \
  -x '.git/*' \
  -x '*.zip' \
  -x '.DS_Store' \
  -x '*/.DS_Store'
echo "已生成: $OUT"
