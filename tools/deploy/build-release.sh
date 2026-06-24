#!/usr/bin/env bash
#
# build-release.sh — build, lint, and snapshot an immutable, versioned
# production bundle so every ship is reproducible and rollback is one upload away.
#
# It does NOT touch the server. It produces a local, hashed snapshot of the exact
# dist/ bundle you upload, kept under releases/<id>/. To roll back, re-upload the
# bundle from a previous release id (see releases/PREVIOUS and DEPLOY.md).
#
# Pipeline:
#   1. Build frontend (vite) -> root dist/
#   2. Package backend into dist/ via scripts/package-prod.sh
#   3. php -l lint every backend PHP file (deploy gate)
#   4. Snapshot dist/ (minus secrets) into releases/<id>/bundle/ + MANIFEST.sha256
#   5. Advance releases/CURRENT and releases/PREVIOUS pointers
#   6. Prune to the newest $KEEP releases
#
# Secrets (.env / env.runtime) are intentionally EXCLUDED from the snapshot —
# env is managed separately on the server and never archived locally.

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/../.." && pwd)"
FRONTEND_DIR="$ROOT_DIR/frontend"
DIST_DIR="$ROOT_DIR/dist"
RELEASES_DIR="$ROOT_DIR/releases"
KEEP="${KEEP_RELEASES:-5}"

cd "$ROOT_DIR"

echo "==> build-release: repo $ROOT_DIR"

# --- 0. Secret-leak gate (hard) ---------------------------------------------
# Refuse to cut a release if a real .env or a secret signature was committed.
# Read-only; scans only git-tracked files. Aborts before any build work.
if [[ -f "$ROOT_DIR/tools/qa/secret-scan.mjs" ]] && command -v node >/dev/null 2>&1; then
  echo "==> [0] Secret scan (git-tracked files)..."
  node "$ROOT_DIR/tools/qa/secret-scan.mjs"
fi

# --- 1. Build frontend -------------------------------------------------------
echo "==> [1/6] Building frontend (vite)..."
( cd "$FRONTEND_DIR" && npx vite build >/dev/null )
[[ -d "$DIST_DIR" ]] || { echo "ERROR: dist/ not produced by build"; exit 1; }
[[ -f "$DIST_DIR/index.html" ]] || { echo "ERROR: dist/index.html missing"; exit 1; }
echo "    frontend built -> dist/"

# --- 2. Package backend into the bundle -------------------------------------
echo "==> [2/6] Packaging backend (scripts/package-prod.sh)..."
bash "$ROOT_DIR/scripts/package-prod.sh" >/dev/null
echo "    api/ + php-backend/ injected into dist/"

# Non-blocking onboarding guard: warn (never abort) if .env.production sets a key
# the committed .env.example doesn't document. Keeps the template honest without
# gating a ship. Key names only — no values are read or printed.
if [[ -f "$ROOT_DIR/tools/qa/env-example-check.sh" ]]; then
  bash "$ROOT_DIR/tools/qa/env-example-check.sh" || \
    echo "    (warning only — build continues)"
fi

# --- 3. PHP syntax gate ------------------------------------------------------
echo "==> [3/6] Linting backend PHP (php -l)..."
lint_fail=0
while IFS= read -r -d '' f; do
  if ! php -l "$f" >/dev/null 2>&1; then
    echo "    SYNTAX ERROR: $f"
    lint_fail=1
  fi
done < <(find "$ROOT_DIR/php-backend/src" -name '*.php' -print0)
if [[ "$lint_fail" -ne 0 ]]; then
  echo "ERROR: PHP lint failed — aborting, no release snapshot taken."
  exit 1
fi
echo "    all PHP files valid"

# --- 4. Snapshot the bundle --------------------------------------------------
GIT_SHA="$(git rev-parse --short HEAD 2>/dev/null || echo nogit)"
GIT_BRANCH="$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo '?')"
GIT_DIRTY="clean"
git diff --quiet 2>/dev/null && git diff --cached --quiet 2>/dev/null || GIT_DIRTY="DIRTY"
ID="$(date -u +%Y%m%dT%H%M%SZ)__${GIT_SHA}"
REL_DIR="$RELEASES_DIR/$ID"

echo "==> [4/6] Snapshotting bundle -> releases/$ID/ ..."
mkdir -p "$REL_DIR/bundle"
# Copy the full upload bundle but exclude secrets and VCS noise.
rsync -a \
  --exclude '.env' \
  --exclude '.env.*' \
  --exclude 'env.runtime' \
  --exclude '.git' \
  "$DIST_DIR"/ "$REL_DIR/bundle"/

# Hash manifest of everything in the snapshot (sorted, relative paths).
( cd "$REL_DIR/bundle" && find . -type f -print0 \
    | LC_ALL=C sort -z \
    | xargs -0 shasum -a 256 ) > "$REL_DIR/MANIFEST.sha256"

MAIN_BUNDLE="$(grep -oE '/assets/index-[A-Za-z0-9_-]+\.js' "$DIST_DIR/index.html" | head -1 || true)"
FILE_COUNT="$(grep -c '' "$REL_DIR/MANIFEST.sha256" || echo 0)"
BUNDLE_SIZE="$(du -sh "$REL_DIR/bundle" | awk '{print $1}')"

cat > "$REL_DIR/RELEASE.txt" <<EOF
release_id   $ID
built_utc    $(date -u +%Y-%m-%dT%H:%M:%SZ)
git_sha      $GIT_SHA
git_branch   $GIT_BRANCH
git_state    $GIT_DIRTY
main_bundle  ${MAIN_BUNDLE:-unknown}
file_count   $FILE_COUNT
bundle_size  $BUNDLE_SIZE
EOF
echo "    snapshot: $FILE_COUNT files, $BUNDLE_SIZE, main bundle ${MAIN_BUNDLE:-?}"
[[ "$GIT_DIRTY" == "DIRTY" ]] && echo "    NOTE: working tree was DIRTY at build time."

# --- 5. Advance CURRENT / PREVIOUS pointers ---------------------------------
echo "==> [5/6] Updating release pointers..."
if [[ -f "$RELEASES_DIR/CURRENT" ]]; then
  cp "$RELEASES_DIR/CURRENT" "$RELEASES_DIR/PREVIOUS"
fi
echo "$ID" > "$RELEASES_DIR/CURRENT"
echo "    CURRENT  = $ID"
[[ -f "$RELEASES_DIR/PREVIOUS" ]] && echo "    PREVIOUS = $(cat "$RELEASES_DIR/PREVIOUS")"

# --- 6. Prune old releases ---------------------------------------------------
echo "==> [6/6] Pruning to newest $KEEP releases..."
CUR="$(cat "$RELEASES_DIR/CURRENT" 2>/dev/null || echo '')"
PREV="$(cat "$RELEASES_DIR/PREVIOUS" 2>/dev/null || echo '')"
ALL=()
while IFS= read -r line; do
  [[ -n "$line" ]] && ALL+=("$line")
done < <(find "$RELEASES_DIR" -maxdepth 1 -mindepth 1 -type d -name '20*' -exec basename {} \; | sort -r)
idx=0
for rid in "${ALL[@]}"; do
  idx=$((idx+1))
  if [[ "$idx" -le "$KEEP" || "$rid" == "$CUR" || "$rid" == "$PREV" ]]; then
    continue
  fi
  echo "    pruning old release: $rid"
  rm -rf "${RELEASES_DIR:?}/$rid"
done

echo ""
echo "==> DONE. Bundle ready in: dist/  (and snapshotted to releases/$ID/)"
echo "    Upload dist/ to production, then verify:"
echo "      bash tools/deploy/verify-live.sh $ID"
if [[ -s "$RELEASES_DIR/PREVIOUS" ]]; then
  echo "    Rollback target (previous good): releases/$(cat "$RELEASES_DIR/PREVIOUS")/bundle/"
else
  echo "    Rollback target: none yet (this is the first snapshot)."
fi
