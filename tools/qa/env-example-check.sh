#!/usr/bin/env bash
#
# env-example-check.sh — assert the committed .env.example documents every key
# that a real environment file actually sets.
#
# Why: .env / .env.production are gitignored (secrets) and absent in CI, so this
# CANNOT live in the GitHub workflow. It is a LOCAL pre-deploy guard: a key that
# production relies on but the template never mentions is an onboarding landmine
# — a fresh deploy from .env.example would silently run on defaults. This catches
# that drift before you ship.
#
# It compares ONLY key names (left of '='); it never reads or prints any value,
# so no secret is ever echoed.
#
# Usage:
#   bash tools/qa/env-example-check.sh                 # checks .env.production
#   bash tools/qa/env-example-check.sh .env            # check a different file
#
# Exit 0 = every key in the target file is present in .env.example.
# Exit 1 = at least one key is undocumented (listed below).

set -uo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/../.." && pwd)"
EXAMPLE="$ROOT_DIR/.env.example"
TARGET="${1:-$ROOT_DIR/.env.production}"

if [[ ! -f "$EXAMPLE" ]]; then
  echo "ERROR: .env.example not found at $EXAMPLE" >&2
  exit 1
fi
if [[ ! -f "$TARGET" ]]; then
  echo "WARN env-example-check: target '$TARGET' not found — skipping (nothing to compare)."
  exit 0
fi

# Extract assigned key names (uppercase KEY=...), ignore comments/blank lines.
keys() { grep -oE '^[A-Z_][A-Z0-9_]*=' "$1" | sed 's/=$//' | sort -u; }

MISSING=()
while IFS= read -r k; do
  [[ -n "$k" ]] && MISSING+=("$k")
done < <(comm -23 <(keys "$TARGET") <(keys "$EXAMPLE"))

if [[ "${#MISSING[@]}" -eq 0 ]]; then
  echo "PASS env-example-check: .env.example documents all $(keys "$TARGET" | wc -l | tr -d ' ') keys in $(basename "$TARGET")."
  exit 0
fi

echo "FAIL env-example-check: ${#MISSING[@]} key(s) set in $(basename "$TARGET") but NOT documented in .env.example:" >&2
for k in "${MISSING[@]}"; do
  echo "       - $k" >&2
done
echo "       Add each (with a comment + safe placeholder, no real value) to .env.example." >&2
exit 1
