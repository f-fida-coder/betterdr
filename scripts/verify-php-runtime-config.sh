#!/usr/bin/env bash
set -euo pipefail

# Verifies effective OPcache and (when accessible) PHP-FPM pool settings on a remote host.
# Usage:
#   ./scripts/verify-php-runtime-config.sh user@host [ssh_port]
# Example:
#   ./scripts/verify-php-runtime-config.sh u487877829@srv2052.hstgr.io

REMOTE="${1:-}"
SSH_PORT="${2:-22}"

if [[ -z "$REMOTE" ]]; then
  echo "Usage: $0 user@host [ssh_port]"
  exit 1
fi

SSH_OPTS=(
  -p "$SSH_PORT"
  -o BatchMode=yes
  -o ConnectTimeout=8
  -o StrictHostKeyChecking=accept-new
)

print_header() {
  echo ""
  echo "$1"
  echo "$(printf '%.0s-' {1..72})"
}

check_equals() {
  local label="$1"
  local actual="$2"
  local expected="$3"
  if [[ "$actual" == "$expected" ]]; then
    printf "PASS %-35s actual=%-12s expected=%s\n" "$label" "$actual" "$expected"
  else
    printf "WARN %-35s actual=%-12s expected=%s\n" "$label" "$actual" "$expected"
  fi
}

run_remote_php_ini_get() {
  local key="$1"
  ssh "${SSH_OPTS[@]}" "$REMOTE" \
    "php -r 'echo (string) ini_get(\"$key\");'" 2>/dev/null || true
}

print_header "Remote Target"
echo "Host: $REMOTE"
echo "Port: $SSH_PORT"

print_header "OPcache Runtime Values (php -i / ini_get)"
OPCACHE_MEMORY="$(run_remote_php_ini_get opcache.memory_consumption)"
OPCACHE_FILES="$(run_remote_php_ini_get opcache.max_accelerated_files)"
OPCACHE_JIT_BUFFER="$(run_remote_php_ini_get opcache.jit_buffer_size)"

if [[ -z "$OPCACHE_MEMORY" && -z "$OPCACHE_FILES" && -z "$OPCACHE_JIT_BUFFER" ]]; then
  echo "ERROR Could not query remote PHP ini values."
  echo "Check SSH access and whether the remote host has php in PATH."
  exit 1
fi

check_equals "opcache.memory_consumption" "$OPCACHE_MEMORY" "256"
check_equals "opcache.max_accelerated_files" "$OPCACHE_FILES" "20000"
check_equals "opcache.jit_buffer_size" "$OPCACHE_JIT_BUFFER" "64M"

print_header "PHP-FPM Pool Values (best effort)"
FPM_OUTPUT="$({
  ssh "${SSH_OPTS[@]}" "$REMOTE" '
    set -e
    FPM_BIN=""
    for c in php-fpm php-fpm8.4 php-fpm8.3 php-fpm8.2 php-fpm8.1 php-fpm8.0; do
      if command -v "$c" >/dev/null 2>&1; then
        FPM_BIN="$c"
        break
      fi
    done

    if [[ -z "$FPM_BIN" ]]; then
      echo "FPM_BIN_NOT_FOUND"
      exit 0
    fi

    "$FPM_BIN" -tt 2>&1 \
      | grep -E "pm\s*=|pm.max_children\s*=|pm.start_servers\s*=|pm.min_spare_servers\s*=|pm.max_spare_servers\s*=" \
      | sed -E "s/^[[:space:]]+//"
  '
} || true)"

if [[ -z "$FPM_OUTPUT" ]]; then
  echo "WARN Could not read PHP-FPM values (permission/path restriction)."
  echo "Run manually on server as root: php-fpm -tt"
  exit 0
fi

if echo "$FPM_OUTPUT" | grep -q "FPM_BIN_NOT_FOUND"; then
  echo "WARN PHP-FPM binary not found in PATH on remote host."
  echo "Try running the script as a user with php-fpm available."
  exit 0
fi

echo "$FPM_OUTPUT"

PM_VALUE="$(echo "$FPM_OUTPUT" | grep -E "pm\s*=" | head -1 | awk -F= '{gsub(/ /, "", $2); print $2}')"
MAX_CHILDREN_VALUE="$(echo "$FPM_OUTPUT" | grep -E "pm.max_children\s*=" | head -1 | awk -F= '{gsub(/ /, "", $2); print $2}')"
START_SERVERS_VALUE="$(echo "$FPM_OUTPUT" | grep -E "pm.start_servers\s*=" | head -1 | awk -F= '{gsub(/ /, "", $2); print $2}')"

if [[ -n "$PM_VALUE" ]]; then
  check_equals "pm" "$PM_VALUE" "dynamic"
fi
if [[ -n "$MAX_CHILDREN_VALUE" ]]; then
  check_equals "pm.max_children" "$MAX_CHILDREN_VALUE" "50"
fi
if [[ -n "$START_SERVERS_VALUE" ]]; then
  check_equals "pm.start_servers" "$START_SERVERS_VALUE" "10"
fi

print_header "Done"
echo "Verification completed. WARN lines indicate drift from baseline or inaccessible values."
