#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
DIST_DIR="$ROOT_DIR/dist"

if [[ ! -d "$DIST_DIR" ]]; then
  echo "dist directory not found. Run frontend build first."
  exit 1
fi

# Ensure production deploy bundle contains both static frontend and PHP backend.
rm -rf "$DIST_DIR/api" "$DIST_DIR/php-backend"
cp -R "$ROOT_DIR/api" "$DIST_DIR/api"
cp -R "$ROOT_DIR/php-backend" "$DIST_DIR/php-backend"

echo "Packaged production bundle with api/ and php-backend/ in $DIST_DIR"
