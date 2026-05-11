#!/usr/bin/env bash
set -euo pipefail

version=$(node -p "require('./package.json').version")
cat > src/version.ts <<EOF
// Auto-generated from package.json by scripts/sync-version.sh. Do not edit.
export const VERSION = "${version}";
EOF
