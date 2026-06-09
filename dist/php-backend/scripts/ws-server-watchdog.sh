#!/bin/sh
# Watchdog for the downstream browser WebSocket server (ws-server.php).
# This is the server→browser push path: ws-server.php tails the
# RealtimeEventBus log and broadcasts odds:sync / bet:settled events to
# subscribed browsers. nginx proxies wss://<host>/ws → 127.0.0.1:5001.
#
# Run from cron every minute; does nothing if the server is alive,
# (re)starts it if not. Silent on healthy ticks to keep the log clean.
#
# CRON ENTRY (every 1 minute) — adjust the absolute path to your server:
#   * * * * * /path/to/php-backend/scripts/ws-server-watchdog.sh >> /path/to/php-backend/logs/ws-server-watchdog.log 2>&1
#
# After uploading: chmod +x ws-server-watchdog.sh
#
# If WS_ENABLED=false in .env the server exits immediately on startup; the
# watchdog won't loop-restart it because it stays exited.

set -eu

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
DAEMON_PATH="${SCRIPT_DIR}/ws-server.php"

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
STDOUT_LOG="${LOG_DIR}/ws-server.stdout.log"

if [ ! -f "$DAEMON_PATH" ]; then
    echo "$(date -u +%Y-%m-%dT%H:%M:%SZ) [ws-server-watchdog] ERROR: server script not found at $DAEMON_PATH" >&2
    exit 1
fi

if pgrep -f "scripts/ws-server.php" > /dev/null 2>&1; then
    exit 0
fi

mkdir -p "$LOG_DIR" 2>/dev/null || true

echo "$(date -u +%Y-%m-%dT%H:%M:%SZ) [ws-server-watchdog] server not running, starting…"

if command -v setsid >/dev/null 2>&1; then
    setsid nohup "$PHP_BIN" "$DAEMON_PATH" >> "$STDOUT_LOG" 2>&1 &
else
    nohup "$PHP_BIN" "$DAEMON_PATH" >> "$STDOUT_LOG" 2>&1 &
fi

sleep 1
NEW_PID=$(pgrep -f "scripts/ws-server.php" | head -n 1 || true)
if [ -n "$NEW_PID" ]; then
    echo "$(date -u +%Y-%m-%dT%H:%M:%SZ) [ws-server-watchdog] started server pid=$NEW_PID"
else
    echo "$(date -u +%Y-%m-%dT%H:%M:%SZ) [ws-server-watchdog] FAILED to start server — check $STDOUT_LOG"
    exit 1
fi
