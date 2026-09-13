#!/usr/bin/env bash
set -e
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
if ! command -v node >/dev/null 2>&1; then
  echo "Node.js نصب نیست. ابتدا Node.js 20 LTS را نصب کنید: https://nodejs.org"
  exit 1
fi
node "$SCRIPT_DIR/demo-server.cjs"
