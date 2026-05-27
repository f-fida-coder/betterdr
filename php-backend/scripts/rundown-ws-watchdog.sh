#!/bin/sh
# Watchdog for the Rundown WebSocket daemon (rundown-ws-daemon.php).
# Run from cron every minute; does nothing if the daemon is alive,
# (re)starts it if not. Silent on healthy ticks to keep the log clean.
#
# CRON ENTRY (cPanel/Linux crontab — every 1 minute):
#   * * * * * /home/USER/path/to/php-backend/scripts/rundown-ws-watchdog.sh >> /home/USER/path/to/php-backend/logs/rundown-ws-watchdog.log 2>&1
#
# Adjust path to match the absolute location on your server.
# After uploading: chmod +x rundown-ws-watchdog.sh
#
# If RUNDOWN_WS_ENABLED=false in .env the daemon exits immediately on
# startup; the watchdog won't loop-restart it because it stays exited.

set -eu

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
DAEMON_PATH="${SCRIPT_DIR}/rundown-ws-daemon.php"

# PHP binary resolution (same priority list as odds-worker-watchdog.sh).
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
STDOUT_LOG="${LOG_DIR}/rundown-ws-daemon.stdout.log"

if [ ! -f "$DAEMON_PATH" ]; then
    echo "$(date -u +%Y-%m-%dT%H:%M:%SZ) [ws-watchdog] ERROR: daemon script not found at $DAEMON_PATH" >&2
    exit 1
fi

if pgrep -f "scripts/rundown-ws-daemon.php" > /dev/null 2>&1; then
    exit 0
fi

mkdir -p "$LOG_DIR" 2>/dev/null || true

echo "$(date -u +%Y-%m-%dT%H:%M:%SZ) [ws-watchdog] daemon not running, starting…"

if command -v setsid >/dev/null 2>&1; then
    setsid nohup "$PHP_BIN" "$DAEMON_PATH" >> "$STDOUT_LOG" 2>&1 &
else
    nohup "$PHP_BIN" "$DAEMON_PATH" >> "$STDOUT_LOG" 2>&1 &
fi

sleep 1
NEW_PID=$(pgrep -f "scripts/rundown-ws-daemon.php" | head -n 1 || true)
if [ -n "$NEW_PID" ]; then
    echo "$(date -u +%Y-%m-%dT%H:%M:%SZ) [ws-watchdog] started daemon pid=$NEW_PID"
else
    echo "$(date -u +%Y-%m-%dT%H:%M:%SZ) [ws-watchdog] FAILED to start daemon — check $STDOUT_LOG"
    exit 1
fi
