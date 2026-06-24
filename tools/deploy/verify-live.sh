#!/usr/bin/env bash
#
# verify-live.sh — post-deploy smoke test for https://bettorplays247.com
#
# Read-only. Performs only GET requests; never places a bet or writes anything.
# Unlike the old verify-deployment.sh (hardcoded to dead Phase-13 hashes), this
# extracts the live asset hashes dynamically from index.html, so it keeps working
# across every rebuild.
#
# Usage:
#   bash tools/deploy/verify-live.sh [release_id]
#
# If a release_id is given, it also confirms the live main bundle matches the
# one recorded in that release's RELEASE.txt — i.e. proves the deploy actually
# took and a stale cache/old upload isn't still being served.
#
# Exit code 0 = all checks passed, non-zero = at least one failure.

set -uo pipefail

SITE="${SITE_URL:-https://bettorplays247.com}"
ROOT_DIR="$(cd "$(dirname "$0")/../.." && pwd)"
REL_ID="${1:-}"

GREEN=$'\033[0;32m'; RED=$'\033[0;31m'; YEL=$'\033[1;33m'; NC=$'\033[0m'
fails=0
ok()   { echo -e "${GREEN}PASS${NC} $*"; }
warn() { echo -e "${YEL}WARN${NC} $*"; }
bad()  { echo -e "${RED}FAIL${NC} $*"; fails=$((fails+1)); }

status() { curl -s -o /dev/null -w '%{http_code}' --max-time 15 "$1"; }

echo "Verifying $SITE  ($(date -u +%Y-%m-%dT%H:%M:%SZ))"
echo "------------------------------------------------------------"

# 1. Index / frontend health
IDX_HTML="$(curl -s --max-time 15 "$SITE/")"
if [[ -n "$IDX_HTML" ]] && [[ "$(status "$SITE/")" == "200" ]]; then
  ok "frontend index responds 200"
else
  bad "frontend index did not return 200"
fi

# 2. Every hashed asset referenced by index.html must resolve 200
ASSETS=()
while IFS= read -r line; do
  [[ -n "$line" ]] && ASSETS+=("$line")
done < <(printf '%s' "$IDX_HTML" | grep -oE '/assets/[A-Za-z0-9._/-]+\.(js|css)' | sort -u)
if [[ "${#ASSETS[@]}" -eq 0 ]]; then
  warn "no /assets/*.js|css references found in index.html"
else
  asset_fail=0
  for a in "${ASSETS[@]}"; do
    code="$(status "$SITE$a")"
    [[ "$code" == "200" ]] || { bad "asset $a -> HTTP $code"; asset_fail=1; }
  done
  [[ "$asset_fail" -eq 0 ]] && ok "all ${#ASSETS[@]} hashed assets resolve 200"
fi

# 3. Cache headers on a hashed asset (long cache expected)
if [[ "${#ASSETS[@]}" -gt 0 ]]; then
  CC="$(curl -s -I --max-time 15 "$SITE${ASSETS[0]}" | grep -i '^cache-control:' | tr -d '\r')"
  if echo "$CC" | grep -qi 'max-age'; then
    ok "cache-control present on hashed asset (${CC#*: })"
  else
    warn "no max-age cache-control on hashed asset"
  fi
fi

# 4. API health
API_CODE="$(status "$SITE/api/health")"
if [[ "$API_CODE" == "200" ]]; then
  ok "api /health responds 200"
else
  M_CODE="$(status "$SITE/api/matches")"
  if [[ "$M_CODE" == "200" ]]; then
    MATCHES="$(curl -s --max-time 20 "$SITE/api/matches" | grep -o '"homeTeam"' | wc -l | tr -d ' ')"
    if [[ "${MATCHES:-0}" -gt 0 ]]; then
      ok "api /matches responds 200 (homeTeam entries: $MATCHES)"
    else
      warn "api /matches 200 but returned no matches (could be no games scheduled)"
    fi
  else
    bad "api unreachable (/health -> $API_CODE, /matches -> $M_CODE)"
  fi
fi

# 5. Deploy-took confirmation against a release snapshot
if [[ -n "$REL_ID" ]]; then
  REL_FILE="$ROOT_DIR/releases/$REL_ID/RELEASE.txt"
  if [[ -f "$REL_FILE" ]]; then
    EXPECT="$(awk '/^main_bundle/{print $2}' "$REL_FILE")"
    if [[ -n "$EXPECT" && "$EXPECT" != "unknown" ]]; then
      if printf '%s' "$IDX_HTML" | grep -qF "$EXPECT"; then
        ok "live build matches release $REL_ID (main bundle $EXPECT)"
      else
        bad "live build does NOT match release $REL_ID — expected $EXPECT, not found in live index.html (stale cache or old upload still serving)"
      fi
    else
      warn "release $REL_ID has no recorded main_bundle to compare"
    fi
  else
    warn "release id '$REL_ID' not found under releases/ — skipping build-match check"
  fi
fi

echo "------------------------------------------------------------"
if [[ "$fails" -eq 0 ]]; then
  echo -e "${GREEN}ALL CHECKS PASSED${NC}"
  exit 0
else
  echo -e "${RED}$fails CHECK(S) FAILED${NC} — investigate before declaring the deploy good."
  exit 1
fi
