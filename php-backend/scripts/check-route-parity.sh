#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
PORT="${PORT:-5050}"
HOST="${HOST:-127.0.0.1}"
BASE_URL="http://${HOST}:${PORT}"

if ! command -v php >/dev/null 2>&1; then
  echo "ERROR: php is not installed or not in PATH."
  exit 1
fi

if ! command -v rg >/dev/null 2>&1; then
  echo "ERROR: rg (ripgrep) is required."
  exit 1
fi

cd "$ROOT_DIR"

php -S "${HOST}:${PORT}" -t php-backend/public php-backend/public/router.php >/tmp/php_route_parity.log 2>&1 &
PHP_PID=$!
cleanup() {
  kill "$PHP_PID" >/dev/null 2>&1 || true
}
trap cleanup EXIT
sleep 1

tested=0
missing=0

while IFS=' ' read -r file method path; do
  case "$file" in
    authRoutes.js) base="/api/auth" ;;
    walletRoutes.js) base="/api/wallet" ;;
    betRoutes.js) base="/api/bets" ;;
    adminRoutes.js) base="/api/admin" ;;
    agentRoutes.js) base="/api/agent" ;;
    paymentRoutes.js) base="/api/payments" ;;
    matchRoutes.js) base="/api/matches" ;;
    bettingRoutes.js) base="/api/betting" ;;
    debugRoutes.js) base="/api/debug" ;;
    messageRoutes.js) base="/api/messages" ;;
    casinoRoutes.js) base="/api/casino" ;;
    contentRoutes.js) base="/api/content" ;;
    *) continue ;;
  esac

  full_path="${base}${path}"
  full_path="${full_path%/}"
  if [[ -z "$full_path" ]]; then
    full_path="$base"
  fi

  full_path="$(echo "$full_path" | /usr/bin/sed -E 's#:[A-Za-z_]+#507f1f77bcf86cd799439011#g')"
  full_path="$(echo "$full_path" | /usr/bin/sed 's#/next-username/507f1f77bcf86cd799439011#/next-username/TEST#')"

  tested=$((tested + 1))
  body_file="$(mktemp)"
  method_upper="$(echo "$method" | tr '[:lower:]' '[:upper:]')"
  code="$(/usr/bin/curl -sS -o "$body_file" -w "%{http_code}" -X "${method_upper}" "${BASE_URL}${full_path}" -H 'Content-Type: application/json' --data '{}' || echo "000")"
  body="$(cat "$body_file")"
  rm -f "$body_file"

  if [[ "$code" == "000" || "$code" == "502" ]] || ([[ "$code" == "404" ]] && [[ "$body" == *"API route not found"* ]]); then
    missing=$((missing + 1))
    echo "MISS ${method} ${full_path} -> ${code}"
  fi
done < <(
  rg -n "router\.(get|post|put|delete)\('" backend/routes -S \
    | /usr/bin/sed -E "s#^backend/routes/([^:]+):[0-9]+:router\.(get|post|put|delete)\('([^']+)'.*#\1 \2 \3#"
)

echo "Tested routes: ${tested}"
echo "Missing routes: ${missing}"

if [[ "$missing" -gt 0 ]]; then
  exit 1
fi

echo "Route parity check passed."
