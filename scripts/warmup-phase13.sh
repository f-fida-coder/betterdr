#!/bin/bash
set -euo pipefail

TARGET_URL="${1:-https://bettorplays247.com/api/matches}"
DURATION_SECONDS="${DURATION_SECONDS:-900}"
SLEEP_SECONDS="${SLEEP_SECONDS:-2}"

if ! [[ "$DURATION_SECONDS" =~ ^[0-9]+$ ]]; then
  echo "DURATION_SECONDS must be a positive integer"
  exit 1
fi

if ! [[ "$SLEEP_SECONDS" =~ ^[0-9]+$ ]]; then
  echo "SLEEP_SECONDS must be a positive integer"
  exit 1
fi

START_TS=$(date +%s)
END_TS=$((START_TS + DURATION_SECONDS))
REQUESTS=0
FAILURES=0

printf "Warm-up target: %s\n" "$TARGET_URL"
printf "Duration: %ss | Interval: %ss\n" "$DURATION_SECONDS" "$SLEEP_SECONDS"

while [ "$(date +%s)" -lt "$END_TS" ]; do
  HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "$TARGET_URL" || true)
  REQUESTS=$((REQUESTS + 1))

  if [ "$HTTP_CODE" != "200" ]; then
    FAILURES=$((FAILURES + 1))
    printf "[%s] non-200 response: %s\n" "$(date +"%H:%M:%S")" "$HTTP_CODE"
  fi

  sleep "$SLEEP_SECONDS"
done

printf "Warm-up finished. Requests=%s Failures=%s\n" "$REQUESTS" "$FAILURES"
