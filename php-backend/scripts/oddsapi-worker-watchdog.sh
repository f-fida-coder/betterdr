#!/bin/sh
# Watchdog for The Odds API supplemental worker (oddsapi-worker.php).
# Run from cron every minute; does nothing if it's alive, (re)starts it if not.
# Silent on healthy ticks to keep the log clean.
#
# CRON ENTRY (every 1 minute) — adjust the absolute path to your server:
#   * * * * * /path/to/php-backend/scripts/oddsapi-worker-watchdog.sh >> /path/to/php-backend/logs/oddsapi-worker-watchdog.log 2>&1
#
# After uploading: chmod +x oddsapi-worker-watchdog.sh
#
# NOTE: the worker is inert (idle loop, zero upstream calls) until
# ODDS_API_SYNC_ENABLED=true AND ODDS_API_KEY are set in the env files —
# wiring this cron before the flag flips is safe.

set -eu

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
DAEMON_PATH="${SCRIPT_DIR}/oddsapi-worker.php"

# PHP binary resolution (same priority list as the other watchdogs).
if [ -z "${PHP_BIN:-}" ]; then
    for candidate in \
        /opt/alt/php82/usr/bin/php \
        /opt/alt/php81/usr/bin/php \
        /usr/local/bin/php \
        /usr/bin/php \
        php; do
        if command -v "$candidate" >/dev/null 2>&1; then
            PHP_BIN="$candidate"
            break
        fi
    done
fi
PHP_BIN="${PHP_BIN:-php}"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
LOG_DIR="${PROJECT_ROOT}/logs"
STDOUT_LOG="${LOG_DIR}/oddsapi-worker.stdout.log"

if [ ! -f "$DAEMON_PATH" ]; then
    echo "$(date -u +%Y-%m-%dT%H:%M:%SZ) [oddsapi-watchdog] ERROR: worker script not found at $DAEMON_PATH" >&2
    exit 1
fi

if pgrep -f "scripts/oddsapi-worker.php" > /dev/null 2>&1; then
    exit 0
fi

mkdir -p "$LOG_DIR" 2>/dev/null || true

echo "$(date -u +%Y-%m-%dT%H:%M:%SZ) [oddsapi-watchdog] worker not running, starting…"

if command -v setsid >/dev/null 2>&1; then
    setsid nohup "$PHP_BIN" "$DAEMON_PATH" >> "$STDOUT_LOG" 2>&1 &
else
    nohup "$PHP_BIN" "$DAEMON_PATH" >> "$STDOUT_LOG" 2>&1 &
fi

sleep 1
NEW_PID=$(pgrep -f "scripts/oddsapi-worker.php" | head -n 1 || true)
if [ -n "$NEW_PID" ]; then
    echo "$(date -u +%Y-%m-%dT%H:%M:%SZ) [oddsapi-watchdog] started worker pid=$NEW_PID"
else
    echo "$(date -u +%Y-%m-%dT%H:%M:%SZ) [oddsapi-watchdog] FAILED to start worker — check $STDOUT_LOG"
    exit 1
fi
