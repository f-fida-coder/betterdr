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

if ! command -v curl >/dev/null 2>&1; then
  echo "ERROR: curl is required."
  exit 1
fi

cd "$ROOT_DIR"

route_file="$(mktemp)"
body_file=""

cleanup() {
  if [[ -n "${body_file}" && -f "${body_file}" ]]; then
    rm -f "${body_file}"
  fi
  rm -f "${route_file}"
  stop_server
}
trap cleanup EXIT

start_server() {
  php -S "${HOST}:${PORT}" -t php-backend/public php-backend/public/router.php >/tmp/php_route_parity.log 2>&1 &
  PHP_PID=$!
  sleep 1
}

stop_server() {
  if [[ -n "${PHP_PID:-}" ]]; then
    kill "${PHP_PID}" >/dev/null 2>&1 || true
    wait "${PHP_PID}" >/dev/null 2>&1 || true
    PHP_PID=""
  fi
}

restart_server() {
  stop_server
  start_server
}

php -- "$ROOT_DIR" > "$route_file" <<'PHP_ROUTES'
<?php
$root = $argv[1];
$files = glob($root . "/php-backend/src/*Controller.php");
sort($files);
$routes = [];

function sample_path(string $pattern): string
{
    $path = preg_replace("/\\(\\[a-fA-F0-9\\]\\{24\\}\\)/", "507f1f77bcf86cd799439011", $pattern);
    $path = preg_replace("/\\(\\[\\^\\/\\]\\+\\)/", "test", $path);
    $path = preg_replace("/\\([^)]*\\)/", "test", $path);
    $path = str_replace(["\\\\/", "\\\\-"], ["/", "-"], $path);
    return $path;
}

foreach ($files as $file) {
    $insideHandle = false;
    $braceDepth = 0;
    foreach (file($file) as $line) {
        if (!$insideHandle && preg_match('/public function handle\(string \$method, string \$path\): bool/', $line) === 1) {
            $insideHandle = true;
            $braceDepth = 0;
            continue;
        }
        if (!$insideHandle) {
            continue;
        }

        $lineBraceDelta = substr_count($line, "{") - substr_count($line, "}");

        if ($braceDepth === 0) {
            $braceDepth += $lineBraceDelta;
            if ($braceDepth <= 0) {
                continue;
            }
            if (trim($line) === "{") {
                continue;
            }
        } else {
            $braceDepth += $lineBraceDelta;
        }

        if (preg_match('/\$method\s*===\s*\'([A-Z]+)\'/', $line, $methodMatch) !== 1) {
            if ($braceDepth <= 0) {
                $insideHandle = false;
            }
            continue;
        }

        $method = $methodMatch[1];

        if (preg_match('/preg_match\(\'#\^([^\']+)\$#\',\s*\$path/', $line, $pathMatch) === 1) {
            $route = sample_path($pathMatch[1]);
            if ($route !== "") {
                $routes[$method . " " . $route] = true;
            }
        } elseif (preg_match_all('/\$path\s*===\s*\'([^\']+)\'/', $line, $pathMatches) > 0) {
            foreach ($pathMatches[1] as $route) {
                if ($route !== "") {
                    $routes[$method . " " . $route] = true;
                }
            }
        }

        if ($braceDepth <= 0) {
            $insideHandle = false;
        }
    }
}

$out = array_keys($routes);
sort($out);
foreach ($out as $route) {
    echo $route, PHP_EOL;
}
PHP_ROUTES

route_count="$(wc -l < "$route_file" | tr -d ' ')"
if [[ "${route_count}" == "0" ]]; then
  echo "ERROR: no PHP controller routes were discovered."
  exit 1
fi

start_server

tested=0
missing=0
timed_out=0

while IFS=' ' read -r method path; do
  [[ -n "${method}" && -n "${path}" ]] || continue

  tested=$((tested + 1))
  body_file="$(mktemp)"
  method_upper="$(echo "$method" | tr '[:lower:]' '[:upper:]')"

  set +e
  if [[ "$method_upper" == "GET" ]]; then
    code="$(curl -sS --max-time 3 -o "$body_file" -w "%{http_code}" -X "${method_upper}" "${BASE_URL}${path}" -H 'Content-Type: application/json' 2>/dev/null)"
  else
    code="$(curl -sS --max-time 3 -o "$body_file" -w "%{http_code}" -X "${method_upper}" "${BASE_URL}${path}" -H 'Content-Type: application/json' --data '{}' 2>/dev/null)"
  fi
  curl_exit=$?
  set -e

  body="$(cat "$body_file")"
  rm -f "$body_file"
  body_file=""

  if [[ "$curl_exit" -eq 28 ]]; then
    timed_out=$((timed_out + 1))
    echo "TIMEOUT ${method} ${path} -> ${code}"
    restart_server
    continue
  fi

  if [[ "$code" == "000" || "$code" == "502" ]] || ([[ "$code" == "404" ]] && [[ "$body" == *"API route not found"* ]]); then
    missing=$((missing + 1))
    echo "MISS ${method} ${path} -> ${code}"
  fi
done < "$route_file"

echo "Discovered routes: ${route_count}"
echo "Tested routes: ${tested}"
echo "Missing routes: ${missing}"
echo "Timed out routes: ${timed_out}"

if [[ "$missing" -gt 0 ]]; then
  exit 1
fi

echo "Route parity check passed."
