#!/bin/sh
# Prematch-tick cron wrapper.
#
# Why this exists: Hostinger's cron command field is capped at 255 chars,
# and the full curl command (URL + 64-char secret + log redirect) is over
# the limit. This wrapper reads INTERNAL_TICK_SECRET out of the project's
# root .env, then POSTs to /api/internal/oddsapi-prematch-tick which runs:
#   1. Base-odds sync for the next rotation batch of sports.
#   2. Extended-market sync (h2h_q1 / spreads_h1 / totals_p2 / props).
#   3. Settlement sweep for any games that flipped to finished.
#
# Hostinger cron line (every 5 min):
#   */5 * * * * /bin/sh /home/USER/domains/SITE/public_html/php-backend/scripts/prematch-tick.sh >> /home/USER/domains/SITE/public_html/php-backend/logs/prematch-tick.log 2>&1
set -eu

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT_DIR="$(cd "${SCRIPT_DIR}/../.." && pwd)"

# Pull the tick secret out of the root .env. Falls back to php-backend/.env
# if the root copy isn't present (env-file overlay precedence is the same
# as Env::load() — root wins when both exist).
ENV_FILE=""
if [ -f "${ROOT_DIR}/.env" ]; then
    ENV_FILE="${ROOT_DIR}/.env"
elif [ -f "${ROOT_DIR}/php-backend/.env" ]; then
    ENV_FILE="${ROOT_DIR}/php-backend/.env"
fi

if [ -z "${ENV_FILE}" ]; then
    echo "[$(date -u +%Y-%m-%dT%H:%M:%SZ)] prematch-tick: no .env file found" >&2
    exit 1
fi

SECRET=$(grep -E '^INTERNAL_TICK_SECRET=' "${ENV_FILE}" | head -n 1 | cut -d'=' -f2- | tr -d '"' | tr -d "'" | tr -d '\r')

if [ -z "${SECRET}" ]; then
    echo "[$(date -u +%Y-%m-%dT%H:%M:%SZ)] prematch-tick: INTERNAL_TICK_SECRET missing in ${ENV_FILE}" >&2
    exit 1
fi

URL="${PREMATCH_TICK_URL:-https://bettorplays247.com/api/internal/oddsapi-prematch-tick}"

START_TS=$(date -u +%Y-%m-%dT%H:%M:%SZ)
RESPONSE=$(curl -sS -m 60 -X POST -H "X-Tick-Secret: ${SECRET}" "${URL}" || echo '{"ok":false,"error":"curl_failed"}')
echo "[${START_TS}] prematch-tick ${RESPONSE}"
