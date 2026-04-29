#!/bin/sh
# Watchdog for the odds worker.
# Run this from cron every minute; it does nothing if the worker is alive
# and (re)starts it if not. Idempotent — safe to invoke any number of times.
#
# CRON ENTRY (cPanel/Linux crontab — every 1 minute):
#   * * * * * /home/USER/path/to/php-backend/scripts/odds-worker-watchdog.sh >> /home/USER/path/to/php-backend/logs/watchdog.log 2>&1
#
# Adjust the path to match the absolute location on your server.
# After uploading: chmod +x odds-worker-watchdog.sh
#
# Logs go to php-backend/logs/watchdog.log so you can tail it to confirm
# the watchdog is firing each minute and to see when it had to restart.
#
# NOTE: when the worker is healthy, output is silent (no log noise).
# Restart events emit one line each.

set -eu

# Resolve the worker dir relative to this script — works regardless of
# where the script is invoked from.
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
WORKER_PATH="${SCRIPT_DIR}/odds-worker.php"
PHP_BIN="${PHP_BIN:-php}"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
LOG_DIR="${PROJECT_ROOT}/logs"
STDOUT_LOG="${LOG_DIR}/odds-worker.stdout.log"

if [ ! -f "$WORKER_PATH" ]; then
    echo "$(date -u +%Y-%m-%dT%H:%M:%SZ) [watchdog] ERROR: worker script not found at $WORKER_PATH" >&2
    exit 1
fi

# pgrep -f matches the full command line. -x would require an exact match
# (we want substring on the script path), so we use -f without -x.
if pgrep -f "scripts/odds-worker.php" > /dev/null 2>&1; then
    # Healthy. Silent exit to keep the log clean.
    exit 0
fi

mkdir -p "$LOG_DIR" 2>/dev/null || true

echo "$(date -u +%Y-%m-%dT%H:%M:%SZ) [watchdog] worker not running, starting…"

# nohup detaches the worker from the cron-driven shell so it survives
# the cron job exit. setsid (when available) gives it its own session
# group so a hangup signal won't kill it.
if command -v setsid >/dev/null 2>&1; then
    setsid nohup "$PHP_BIN" "$WORKER_PATH" >> "$STDOUT_LOG" 2>&1 &
else
    nohup "$PHP_BIN" "$WORKER_PATH" >> "$STDOUT_LOG" 2>&1 &
fi

# Give it a moment to actually launch before logging the new PID.
sleep 1
NEW_PID=$(pgrep -f "scripts/odds-worker.php" | head -n 1 || true)
if [ -n "$NEW_PID" ]; then
    echo "$(date -u +%Y-%m-%dT%H:%M:%SZ) [watchdog] started worker pid=$NEW_PID"
else
    echo "$(date -u +%Y-%m-%dT%H:%M:%SZ) [watchdog] FAILED to start worker — check $STDOUT_LOG"
    exit 1
fi
