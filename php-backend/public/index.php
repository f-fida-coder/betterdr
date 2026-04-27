<?php

declare(strict_types=1);

require_once __DIR__ . '/../src/Env.php';
require_once __DIR__ . '/../src/Logger.php';
require_once __DIR__ . '/../src/Http.php';
require_once __DIR__ . '/../src/IpUtils.php';
require_once __DIR__ . '/../src/Jwt.php';
require_once __DIR__ . '/../src/ApiException.php';
require_once __DIR__ . '/../src/SportsMatchStatus.php';
require_once __DIR__ . '/../src/SharedFileCache.php';
require_once __DIR__ . '/../src/SportsbookCache.php';
require_once __DIR__ . '/../src/SportsbookHealth.php';
require_once __DIR__ . '/../src/SportsbookBetSupport.php';
require_once __DIR__ . '/../src/SqlRepository.php';
require_once __DIR__ . '/../src/QueryCache.php';
require_once __DIR__ . '/../src/RequestDeduplicator.php';
require_once __DIR__ . '/../src/ConnectionPool.php';
require_once __DIR__ . '/../src/CircuitBreaker.php';
require_once __DIR__ . '/../src/BetModeRules.php';
require_once __DIR__ . '/../src/AgentSettlementRules.php';
require_once __DIR__ . '/../src/AgentSettlementSnapshotService.php';
require_once __DIR__ . '/../src/BetSettlementService.php';
require_once __DIR__ . '/../src/OddsMarketCatalog.php';
require_once __DIR__ . '/../src/ApiQuotaGuard.php';
require_once __DIR__ . '/../src/OddsSyncService.php';
require_once __DIR__ . '/../src/RundownService.php';
require_once __DIR__ . '/../src/RundownLiveSync.php';
require_once __DIR__ . '/../src/AuthController.php';
require_once __DIR__ . '/../src/WalletController.php';
require_once __DIR__ . '/../src/BetsController.php';
require_once __DIR__ . '/../src/BettingRulesController.php';
require_once __DIR__ . '/../src/MatchesController.php';
require_once __DIR__ . '/../src/ContentController.php';
require_once __DIR__ . '/../src/MessagesController.php';
require_once __DIR__ . '/../src/CasinoController.php';
require_once __DIR__ . '/../src/AgentController.php';
require_once __DIR__ . '/../src/AgentCutsController.php';
require_once __DIR__ . '/../src/PaymentsController.php';
require_once __DIR__ . '/../src/AdminCoreController.php';
require_once __DIR__ . '/../src/ThesportsdbProxyController.php';
require_once __DIR__ . '/../src/AdminEntityCatalog.php';
require_once __DIR__ . '/../src/DebugController.php';
require_once __DIR__ . '/../src/RateLimiter.php';
require_once __DIR__ . '/../src/Response.php';
require_once __DIR__ . '/../src/RuntimeMetrics.php';
require_once __DIR__ . '/../src/RealtimeEventBus.php';
require_once __DIR__ . '/../src/CostMonitor.php';

$projectRoot = dirname(__DIR__, 2);
$phpBackendDir = dirname(__DIR__);
Env::load($projectRoot, $phpBackendDir);

// ─── Logging init ─────────────────────────────────────────────────────────────
Logger::init($phpBackendDir . '/logs');
$_requestStartTime = microtime(true);
// Emit X-Request-Id so clients can correlate logs with API responses
header('X-Request-Id: ' . Logger::getRequestId());
// Log every completed request (including fatal shutdown) at the end
register_shutdown_function(static function () use (&$_requestStartTime): void {
    $status = http_response_code();
    $status = is_int($status) ? $status : 200;
    $method = (string) ($_SERVER['REQUEST_METHOD'] ?? 'GET');
    $path = Http::path();
    $metricsPath = $path;
    if ($path === '/api/matches') {
        $payloadMode = strtolower(trim((string) ($_GET['payload'] ?? '')));
        if ($payloadMode === 'core' || $payloadMode === 'full') {
            $metricsPath .= ';payload=' . $payloadMode;
        }
    }
    $duration = microtime(true) - $_requestStartTime;
    $headers = function_exists('headers_list') ? headers_list() : [];

    $cacheHit = false;
    $cacheMiss = false;
    foreach ($headers as $headerLine) {
        $line = strtolower((string) $headerLine);
        if (!str_starts_with($line, 'x-cache:')) {
            continue;
        }
        if (str_contains($line, 'hit')) {
            $cacheHit = true;
        }
        if (str_contains($line, 'miss')) {
            $cacheMiss = true;
        }
    }

    RuntimeMetrics::recordRequest($method, $metricsPath, $status, $duration);
    CostMonitor::recordRequest($method, $metricsPath, $status, $duration, [
        'cacheHit' => $cacheHit,
        'cacheMiss' => $cacheMiss,
    ]);

    // Skip OPTIONS preflights from access log to reduce noise
    if ($method === 'OPTIONS') {
        return;
    }
    Logger::request(
        $method,
        $path,
        $status,
        $duration
    );
});
// ─────────────────────────────────────────────────────────────────────────────

// ─── Gzip compression ────────────────────────────────────────────────────────
if (isset($_SERVER['HTTP_ACCEPT_ENCODING']) &&
    str_contains($_SERVER['HTTP_ACCEPT_ENCODING'], 'gzip') &&
    !headers_sent() &&
    extension_loaded('zlib')) {
    ob_start('ob_gzhandler');
}
// ─────────────────────────────────────────────────────────────────────────────

// ─── CORS ─────────────────────────────────────────────────────────────────────
$origin  = $_SERVER['HTTP_ORIGIN'] ?? '';
$appEnvForCors = strtolower((string) Env::get('APP_ENV', 'production'));
$isProductionCors = $appEnvForCors === 'production';

// Parse and sanitise the allowed-origins list.
$rawAllowedOrigins = array_values(array_filter(array_map('trim', explode(',', Env::get('CORS_ORIGIN', '')))));

$allowedOrigins = [];
foreach ($rawAllowedOrigins as $candidate) {
    // Reject bare wildcards — browsers refuse credentials with Access-Control-Allow-Origin: *
    if ($candidate === '*') {
        continue;
    }
    // Must look like a URL with a scheme (http/https)
    if (!preg_match('#^https?://#i', $candidate)) {
        continue;
    }
    // Strip localhost/127.x/::1 origins in production to prevent local-machine attacks
    if ($isProductionCors && preg_match('#^https?://(localhost|127\.\d+\.\d+\.\d+|\[?::1\]?)#i', $candidate)) {
        continue;
    }
    $allowedOrigins[] = rtrim($candidate, '/'); // normalise: no trailing slash
}

$originAllowed = $origin !== '' && in_array(rtrim($origin, '/'), $allowedOrigins, true);

if ($originAllowed) {
    header('Access-Control-Allow-Origin: ' . $origin);
    header('Access-Control-Allow-Credentials: true');
}
header('Vary: Origin');

// Security headers (always emitted)
header('X-Frame-Options: DENY');
header('X-Content-Type-Options: nosniff');
header('Referrer-Policy: strict-origin-when-cross-origin');
if (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') {
    header('Strict-Transport-Security: max-age=31536000; includeSubDomains');
}

// Preflight — emit method/header hints only here, then exit
if (($_SERVER['REQUEST_METHOD'] ?? 'GET') === 'OPTIONS') {
    if ($originAllowed) {
        header('Access-Control-Allow-Headers: Content-Type, Authorization, Bypass-Tunnel-Remainder, X-CSRF-Token');
        header('Access-Control-Allow-Methods: GET, POST, PUT, PATCH, DELETE, OPTIONS');
        header('Access-Control-Max-Age: 86400'); // cache preflight for 24 h
    }
    http_response_code(204);
    exit;
}
// ─────────────────────────────────────────────────────────────────────────────

// ─── Request body size limit (1 MB) ──────────────────────────────────────────
$contentLength = (int) ($_SERVER['CONTENT_LENGTH'] ?? 0);
if ($contentLength > 1_048_576) {
    http_response_code(413);
    header('Content-Type: application/json');
    echo json_encode(['message' => 'Request body too large']);
    exit;
}
// ─────────────────────────────────────────────────────────────────────────────

// ─── Startup env validation ───────────────────────────────────────────────────
// In production: hard-fail with HTTP 500 listing every misconfigured var.
// In development: emit X-Config-Warning headers so issues show in devtools.
(static function (): void {
    $appEnv  = strtolower((string) Env::get('APP_ENV', 'production'));
    $isProd  = $appEnv === 'production';

    // Skip for health-check so ops tooling can still reach it.
    $path = Http::path();
    if ($path === '/api/_php/health') {
        return;
    }

    $knownPlaceholders = [
        'sk_test_placeholder', 'whsec_placeholder',
        'your_rapidapi_key_here', 'your_key_here', 'placeholder',
        'changeme', 'replace_with',
    ];
    $isPlaceholder = static function (string $v) use ($knownPlaceholders): bool {
        $lower = strtolower($v);
        foreach ($knownPlaceholders as $ph) {
            if (str_contains($lower, $ph)) {
                return true;
            }
        }
        return false;
    };

    $errors   = []; // block startup in production
    $warnings = []; // surface in dev headers only

    // Database — always required
    foreach (['MYSQL_HOST', 'MYSQL_DB', 'MYSQL_USER'] as $key) {
        $val = (string) Env::get($key, '');
        if ($val === '') {
            $errors[] = "{$key} is missing";
        }
    }

    // CORS — required in production (empty = all cross-origin requests blocked/uncredentialled)
    $corsOrigin = (string) Env::get('CORS_ORIGIN', '');
    if ($corsOrigin === '') {
        if ($isProd) {
            $errors[] = 'CORS_ORIGIN is missing — cross-origin requests will be rejected';
        } else {
            $warnings[] = 'CORS_ORIGIN not set';
        }
    }

    // Sports API — warn if enabled but key is absent/placeholder
    $sportsEnabled = strtolower((string) Env::get('SPORTS_API_ENABLED', 'true')) === 'true';
    if ($sportsEnabled) {
        $oddsKey = (string) Env::get('ODDS_API_KEY', '');
        if ($oddsKey === '' || $isPlaceholder($oddsKey)) {
            if ($isProd) {
                $errors[] = 'ODDS_API_KEY is missing or placeholder — sports data will not sync';
            } else {
                $warnings[] = 'ODDS_API_KEY not configured';
            }
        }
    }

    // Stripe — warn if placeholders (don't hard-fail; operator may use manual cashier)
    $stripeKey     = (string) Env::get('STRIPE_SECRET_KEY', '');
    $stripeWebhook = (string) Env::get('STRIPE_WEBHOOK_SECRET', '');
    if ($stripeKey === '' || $isPlaceholder($stripeKey)) {
        $warnings[] = 'STRIPE_SECRET_KEY is missing or placeholder — card deposits disabled';
    }
    if ($stripeWebhook === '' || $isPlaceholder($stripeWebhook)) {
        $warnings[] = 'STRIPE_WEBHOOK_SECRET is missing or placeholder — deposit webhooks disabled';
    }

    if ($isProd && count($errors) > 0) {
        Logger::error('Server startup config errors', ['errors' => $errors], 'error');

        Response::json([
            'message' => 'Server configuration error. Contact the system administrator.',
            'errors'  => $errors,
        ], 500);
        exit;
    }

    // Development: surface warnings as response headers (visible in browser devtools)
    foreach ($warnings as $i => $w) {
        header("X-Config-Warning-{$i}: {$w}");
        Logger::warning($w, [], 'error');
    }
})();
// ─────────────────────────────────────────────────────────────────────────────

$uriPath = Http::path();
$method = Http::method();

// Rewrite-independent route mode: /api/index.php?path=/auth/login
$queryPath = trim((string) ($_GET['path'] ?? ''));
if ($queryPath !== '') {
    if (str_starts_with($queryPath, '/api/')) {
        $uriPath = $queryPath;
    } elseif ($queryPath === '/api') {
        $uriPath = '/api';
    } else {
        $uriPath = '/api/' . ltrim($queryPath, '/');
    }
}

// Support hosts where rewrite rules are skipped and requests come as /api/index.php/*
if (str_starts_with($uriPath, '/api/index.php/')) {
    $uriPath = '/api' . substr($uriPath, strlen('/api/index.php'));
} elseif ($uriPath === '/api/index.php') {
    $uriPath = '/api';
}

// Zero-cost liveness probe for uptime monitors (UptimeRobot, etc).
// Must stay above any DB connect / SqlRepository::isAvailable() call so the
// response time reflects only PHP boot + TLS, not database latency.
if ($uriPath === '/api/ping') {
    header('Cache-Control: no-store');
    Response::json(['ok' => true, 'ts' => time()]);
    exit;
}

$dbUri = 'mysql-native';
$dbName = (string) Env::get('MYSQL_DB', Env::get('DB_NAME', 'sports_betting'));
if ($dbName === '') {
    $dbName = 'sports_betting';
}

$authNativeEnabled = SqlRepository::isAvailable();

$resolveCostAlertThresholds = static function () use ($authNativeEnabled, $dbUri, $dbName): array {
    if (!$authNativeEnabled) {
        return [];
    }
    try {
        $repo = new SqlRepository($dbUri, $dbName);
        $settings = $repo->findOne('platformsettings', []);
        if (!is_array($settings)) {
            return [];
        }
        $keys = [
            'alertCostDailySpikePercent',
            'alertCostAboveAvgMultiplier',
            'alertCostDailyMaxDollars',
            'alertMinRequestsForCostAlert',
        ];
        $result = [];
        foreach ($keys as $key) {
            if (array_key_exists($key, $settings) && is_numeric($settings[$key])) {
                $result[$key] = $settings[$key] + 0;
            }
        }
        return $result;
    } catch (Throwable $e) {
        return [];
    }
};

if ($uriPath === '/api/_php/health') {
    $runtimeMetrics = RuntimeMetrics::snapshot();
    $thresholds = [
        'apiP95Ms' => (int) Env::get('ALERT_API_P95_MS', '700'),
        'api5xxRatePercent' => (float) Env::get('ALERT_API_5XX_RATE_PERCENT', '2'),
        'oddsSyncAgeSeconds' => (int) Env::get('ALERT_ODDS_SYNC_AGE_SECONDS', '300'),
        'workerFailRatePercent' => (float) Env::get('ALERT_WORKER_FAIL_RATE_PERCENT', '40'),
    ];

    $sportsbookHealth = null;
    if ($authNativeEnabled) {
        try {
            $repo = new SqlRepository($dbUri, $dbName);
            $sportsbookHealth = SportsbookHealth::sportsbookSnapshot($repo);
        } catch (Throwable $e) {
            $sportsbookHealth = ['error' => $e->getMessage()];
        }
    }

    $alerts = [];
    $apiP95 = (int) ($runtimeMetrics['last5m']['p95DurationMs'] ?? 0);
    if ($apiP95 > $thresholds['apiP95Ms']) {
        $alerts[] = [
            'code' => 'api_p95_high',
            'severity' => 'warning',
            'message' => 'API p95 latency over threshold',
            'value' => $apiP95,
            'threshold' => $thresholds['apiP95Ms'],
        ];
    }

    $api5xxRate = (float) ($runtimeMetrics['last5m']['error5xxRatePercent'] ?? 0.0);
    if ($api5xxRate > $thresholds['api5xxRatePercent']) {
        $alerts[] = [
            'code' => 'api_5xx_rate_high',
            'severity' => 'critical',
            'message' => 'API 5xx rate over threshold',
            'value' => $api5xxRate,
            'threshold' => $thresholds['api5xxRatePercent'],
        ];
    }

    $syncAge = (int) (($sportsbookHealth['oddsSync']['syncAgeSeconds'] ?? 0) ?: 0);
    if ($syncAge > $thresholds['oddsSyncAgeSeconds']) {
        $alerts[] = [
            'code' => 'odds_sync_stale',
            'severity' => 'critical',
            'message' => 'Odds sync age over threshold',
            'value' => $syncAge,
            'threshold' => $thresholds['oddsSyncAgeSeconds'],
        ];
    }

    $lastResult = is_array($sportsbookHealth['oddsSync']['lastResult'] ?? null)
        ? $sportsbookHealth['oddsSync']['lastResult']
        : [];
    $failedCalls = (int) ($lastResult['failedCalls'] ?? 0);
    $apiCalls = max(1, (int) ($lastResult['apiCalls'] ?? 0));
    $workerFailRate = round(($failedCalls / $apiCalls) * 100, 2);
    if ($workerFailRate > $thresholds['workerFailRatePercent']) {
        $alerts[] = [
            'code' => 'worker_fail_rate_high',
            'severity' => 'warning',
            'message' => 'Worker upstream fail ratio over threshold',
            'value' => $workerFailRate,
            'threshold' => $thresholds['workerFailRatePercent'],
        ];
    }

    $circuitState = (string) ($sportsbookHealth['oddsSync']['circuitBreaker']['state'] ?? '');
    if ($circuitState === 'open') {
        $alerts[] = [
            'code' => 'odds_upstream_circuit_open',
            'severity' => 'critical',
            'message' => 'Odds upstream circuit breaker is open',
            'value' => $sportsbookHealth['oddsSync']['circuitBreaker'] ?? new stdClass(),
            'threshold' => 'closed',
        ];
    }

    $costThresholds = $resolveCostAlertThresholds();
    $costSummary = CostMonitor::summary(null, 7, $costThresholds);
    $costAlerts = is_array($costSummary['alerts'] ?? null) ? $costSummary['alerts'] : [];
    foreach ($costAlerts as $costAlert) {
        if (!is_array($costAlert)) {
            continue;
        }
        $alerts[] = $costAlert;
    }

    Response::json([
        'ok' => true,
        'mode' => 'core-php-gateway',
        'authNativeEnabled' => $authNativeEnabled,
        'databaseName' => $dbName,
        'databaseEngine' => 'mysql',
        'sportsbook' => $sportsbookHealth,
        'observability' => [
            'runtime' => [
                'last5m' => $runtimeMetrics['last5m'] ?? new stdClass(),
                'last15m' => $runtimeMetrics['last15m'] ?? new stdClass(),
                'totals' => $runtimeMetrics['totals'] ?? new stdClass(),
                'matchesPayloadModes' => $runtimeMetrics['matchesPayloadModes'] ?? new stdClass(),
            ],
            'thresholds' => $thresholds,
            'alerts' => $alerts,
        ],
        'time' => gmdate(DATE_ATOM),
    ], 200, 'no-store');
    exit;
}

if ($uriPath === '/api/_php/metrics') {
    $metricsKey = (string) Env::get('METRICS_API_KEY', '');
    $presentedKey = (string) ($_SERVER['HTTP_X_METRICS_KEY'] ?? ($_GET['key'] ?? ''));
    $isProd = strtolower((string) Env::get('APP_ENV', 'production')) === 'production';

    if ($isProd && $metricsKey !== '' && !hash_equals($metricsKey, $presentedKey)) {
        Response::json(['message' => 'Forbidden'], 403, 'no-store');
        exit;
    }

    Response::json([
        'ok' => true,
        'metrics' => RuntimeMetrics::snapshot(),
        'time' => gmdate(DATE_ATOM),
    ], 200, 'no-store');
    exit;
}

if ($uriPath === '/api/_php/costs') {
    $metricsKey = (string) Env::get('METRICS_API_KEY', '');
    $presentedKey = (string) ($_SERVER['HTTP_X_METRICS_KEY'] ?? ($_GET['key'] ?? ''));
    $isProd = strtolower((string) Env::get('APP_ENV', 'production')) === 'production';

    if ($isProd && $metricsKey !== '' && !hash_equals($metricsKey, $presentedKey)) {
        Response::json(['message' => 'Forbidden'], 403, 'no-store');
        exit;
    }

    $day = isset($_GET['day']) ? (string) $_GET['day'] : null;
    $days = isset($_GET['days']) ? (int) $_GET['days'] : 7;
    $costThresholds = $resolveCostAlertThresholds();
    Response::json([
        'ok' => true,
        'costs' => CostMonitor::summary($day, $days, $costThresholds),
        'time' => gmdate(DATE_ATOM),
    ], 200, 'no-store');
    exit;
}

if ($uriPath === '/api/_php/worker-health') {
    // Public, lightweight worker-health probe for Phase-0 diagnostics.
    // Safe to share publicly — returns only timing + counts, no credentials,
    // no cost data, no upstream-API keys. Cached for 5s to prevent abuse;
    // a casual hit is cheap, a flood collapses to one DB read per 5s window.
    header('Cache-Control: public, max-age=5');
    $payload = [];
    if ($authNativeEnabled) {
        try {
            $repo = new SqlRepository($dbUri, $dbName);
            $snapshot = SportsbookHealth::sportsbookSnapshot($repo);
            $oddsSync = is_array($snapshot['oddsSync'] ?? null) ? $snapshot['oddsSync'] : [];
            $tierStatePath = dirname(__DIR__) . '/cache/odds-tier-sync-state.json';
            $tierState = [];
            if (is_file($tierStatePath)) {
                $rawTier = @file_get_contents($tierStatePath);
                if (is_string($rawTier) && $rawTier !== '') {
                    $decoded = json_decode($rawTier, true);
                    if (is_array($decoded)) $tierState = $decoded;
                }
            }
            $perSportAge = [];
            $now = time();
            foreach ($tierState as $sportKey => $iso) {
                if (!is_string($iso) || $iso === '') continue;
                $ts = (int) strtotime($iso);
                if ($ts <= 0) continue;
                $perSportAge[$sportKey] = max(0, $now - $ts);
            }
            asort($perSportAge);
            $payload = [
                'ok' => true,
                'workerLastSuccessAt' => $oddsSync['lastOddsSuccessAt'] ?? null,
                'workerSyncAgeSeconds' => $oddsSync['syncAgeSeconds'] ?? null,
                'workerStaleThresholdSeconds' => $oddsSync['staleAfterSeconds'] ?? null,
                'workerIsStale' => (bool) ($oddsSync['isStale'] ?? false),
                'lastRunStatus' => $oddsSync['lastRunStatus'] ?? null,
                'lastSource' => $oddsSync['lastSource'] ?? null,
                'consecutiveFailures' => (int) ($oddsSync['consecutiveFailures'] ?? 0),
                'consecutiveOddsFailures' => (int) ($oddsSync['consecutiveOddsFailures'] ?? 0),
                'circuitBreakerState' => (string) ($oddsSync['circuitBreaker']['state'] ?? 'unknown'),
                'perSportAgeSeconds' => $perSportAge,
                'time' => gmdate(DATE_ATOM),
            ];
        } catch (Throwable $e) {
            $payload = ['ok' => false, 'error' => 'snapshot_failed', 'time' => gmdate(DATE_ATOM)];
        }
    } else {
        $payload = ['ok' => false, 'error' => 'auth_native_disabled', 'time' => gmdate(DATE_ATOM)];
    }
    Response::json($payload, 200, 'public, max-age=5');
    exit;
}

if ($uriPath === '/api/realtime/health') {
    Response::json([
        'ok' => true,
        'realtime' => [
            'enabled' => strtolower((string) Env::get('WS_ENABLED', 'true')) === 'true',
            'host' => (string) Env::get('WS_HOST', '0.0.0.0'),
            'port' => (int) Env::get('WS_PORT', '5001'),
            'eventLogPath' => RealtimeEventBus::eventLogPath(),
        ],
        'time' => gmdate(DATE_ATOM),
    ], 200, 'no-store');
    exit;
}

if ($uriPath === '/api/realtime/publish' && $method === 'POST') {
    $isEnabled = strtolower((string) Env::get('WS_ENABLED', 'true')) === 'true';
    if (!$isEnabled) {
        Response::json(['message' => 'Realtime service disabled'], 503, 'no-store');
        exit;
    }

    $rawBody = file_get_contents('php://input');
    $data = is_string($rawBody) && $rawBody !== '' ? json_decode($rawBody, true) : null;
    if (!is_array($data)) {
        Response::json(['message' => 'Invalid JSON body'], 400, 'no-store');
        exit;
    }

    $channel = trim((string) ($data['channel'] ?? ''));
    if ($channel === '') {
        Response::json(['message' => 'channel is required'], 422, 'no-store');
        exit;
    }

    $payload = is_array($data['data'] ?? null) ? $data['data'] : ['value' => $data['data'] ?? null];

    $publishKey = (string) Env::get('WS_PUBLISH_KEY', '');
    $presentedKey = (string) ($_SERVER['HTTP_X_REALTIME_KEY'] ?? '');
    $isDev = strtolower((string) Env::get('APP_ENV', 'production')) === 'development';
    if ($publishKey !== '' && !hash_equals($publishKey, $presentedKey)) {
        Response::json(['message' => 'Forbidden'], 403, 'no-store');
        exit;
    }
    if ($publishKey === '' && !$isDev) {
        Response::json(['message' => 'WS_PUBLISH_KEY must be set in production'], 500, 'no-store');
        exit;
    }

    $ok = RealtimeEventBus::publish($channel, $payload);
    if (!$ok) {
        Response::json(['message' => 'Failed to enqueue realtime message'], 500, 'no-store');
        exit;
    }

    Response::json([
        'ok' => true,
        'channel' => $channel,
        'queuedAt' => gmdate(DATE_ATOM),
    ], 202, 'no-store');
    exit;
}

if (!str_starts_with($uriPath, '/api')) {
    Response::json(['message' => 'Not Found'], 404);
    exit;
}

$handled = false;
$nativeError = null;

if (
    str_starts_with($uriPath, '/api/auth')
    || str_starts_with($uriPath, '/api/wallet')
    || str_starts_with($uriPath, '/api/bets')
    || str_starts_with($uriPath, '/api/betting')
    || str_starts_with($uriPath, '/api/admin/bet-mode-rules')
    || str_starts_with($uriPath, '/api/matches')
    || str_starts_with($uriPath, '/api/odds')
    || str_starts_with($uriPath, '/api/content')
    || str_starts_with($uriPath, '/api/messages')
    || str_starts_with($uriPath, '/api/casino')
    || str_starts_with($uriPath, '/api/agent')
    || str_starts_with($uriPath, '/api/payments')
    || str_starts_with($uriPath, '/api/admin')
    || str_starts_with($uriPath, '/api/debug')
    || str_starts_with($uriPath, '/api/internal')
    || str_starts_with($uriPath, '/api/sync')
    || str_starts_with($uriPath, '/api/proxy')
) {
    if ($authNativeEnabled) {
        try {
            $repo = new SqlRepository($dbUri, $dbName);
            $jwtSecret = (string) Env::get('JWT_SECRET', '');

            // Fail-fast: refuse to start with a missing or weak JWT_SECRET.
            // An attacker who knows the secret can forge tokens for any user/admin.
            $knownWeakSecrets = ['secret', 'your_secure_secret', 'changeme', 'password', 'jwt_secret', 'mysecret', '12345678'];
            if (
                $jwtSecret === ''
                || strlen($jwtSecret) < 32
                || in_array(strtolower($jwtSecret), $knownWeakSecrets, true)
            ) {
                $appEnv = strtolower((string) Env::get('APP_ENV', 'production'));
                if ($appEnv === 'production') {
                    Response::json([
                        'message' => 'Server configuration error: JWT_SECRET is missing or insecure. Set a random string of at least 32 characters in your .env file.',
                    ], 500);
                    exit;
                }
                // In development: warn loudly in every response header but don't block.
                header('X-Security-Warning: JWT_SECRET is weak or missing — do not use in production');
            }
            $authController = new AuthController($repo, $jwtSecret);
            $walletController = new WalletController($repo, $jwtSecret);
            $betsController = new BetsController($repo, $jwtSecret);
            $bettingRulesController = new BettingRulesController($repo, $jwtSecret);
            $matchesController = new MatchesController($repo, $jwtSecret);
            $contentController = new ContentController($repo, $jwtSecret);
            $messagesController = new MessagesController($repo, $jwtSecret);
            $casinoController = new CasinoController($repo, $jwtSecret);
            $agentController = new AgentController($repo, $jwtSecret);
            $agentCutsController = new AgentCutsController($repo, $jwtSecret);
            $paymentsController = new PaymentsController($repo, $jwtSecret);
            $adminCoreController = new AdminCoreController($repo, $jwtSecret);
            $debugController = new DebugController($repo, $jwtSecret);
            $thesportsdbProxyController = new ThesportsdbProxyController($repo, $jwtSecret);

            $handled = $authController->handle($method, $uriPath)
                || $walletController->handle($method, $uriPath)
                || $betsController->handle($method, $uriPath)
                || $bettingRulesController->handle($method, $uriPath)
                || $matchesController->handle($method, $uriPath)
                || $contentController->handle($method, $uriPath)
                || $messagesController->handle($method, $uriPath)
                || $casinoController->handle($method, $uriPath)
                || $agentCutsController->handle($method, $uriPath)
                || $agentController->handle($method, $uriPath)
                || $paymentsController->handle($method, $uriPath)
                || $adminCoreController->handle($method, $uriPath)
                || $thesportsdbProxyController->handle($method, $uriPath)
                || $debugController->handle($method, $uriPath);

            // Probabilistic query-cache warm-up: on ~2% of requests (non-warmup, non-admin)
            // trigger a background warm-up after the response is sent so the next cold-start
            // caller hits cache instead of the database.
            if ($handled && !str_starts_with($uriPath, '/api/admin') && random_int(1, 50) === 1) {
                register_shutdown_function(static function () use ($repo): void {
                    try {
                        if (function_exists('fastcgi_finish_request')) {
                            fastcgi_finish_request(); // flush response to client first
                        }
                        // Re-fill the matches query cache for the most common sports
                        $sports = $repo->findMany('sports', ['isActive' => true], ['limit' => 20, 'projection' => ['key' => 1]]);
                        foreach ($sports as $sport) {
                            $sportKey = (string) ($sport['key'] ?? '');
                            if ($sportKey === '') continue;
                            $repo->findMany('matches', ['sport' => $sportKey, 'status' => 'active'], [
                                'limit' => 200,
                                'projection' => ['id' => 1, 'sport' => 1, 'homeTeam' => 1, 'awayTeam' => 1, 'commenceTime' => 1],
                            ]);
                        }
                    } catch (Throwable) {
                        // Warm-up is best-effort — never log or rethrow
                    }
                });
            }

            if ($handled) {
                exit;
            }
        } catch (Throwable $e) {
            $nativeError = $e;
        }
    }
}

if (!$authNativeEnabled) {
    Response::json(['message' => 'Core PHP backend requires the pdo_mysql extension'], 503);
    exit;
}


if ($nativeError !== null) {
    if (str_starts_with($uriPath, '/api/matches')) {
        try {
            if (OddsSyncService::handleMatchesFallbackRoute($method, $uriPath)) {
                exit;
            }
        } catch (Throwable $fallbackError) {
            // Keep original error handling path below if fallback fails.
        }
    }

    if (str_starts_with($uriPath, '/api/casino')) {
        try {
            if (CasinoController::handleFallbackRoute($method, $uriPath, (string) Env::get('JWT_SECRET', ''))) {
                exit;
            }
        } catch (Throwable $fallbackError) {
            // Keep original error handling path below if fallback fails.
        }
    }

    $errorMessage = $nativeError->getMessage();
    $isDbConnectionError = $nativeError instanceof PDOException
        || str_contains(strtolower($errorMessage), 'sqlstate')
        || str_contains(strtolower($errorMessage), 'pdo')
        || str_contains(strtolower($errorMessage), 'php_network_getaddresses')
        || str_contains(strtolower($errorMessage), 'getaddrinfo')
        || str_contains(strtolower($errorMessage), 'connection refused');

    $status = $isDbConnectionError ? 503 : 500;
    Logger::exception($nativeError, 'Unhandled exception on ' . $method . ' ' . $uriPath, [
        'method' => $method,
        'path'   => $uriPath,
        'status' => $status,
        'dbError' => $isDbConnectionError,
    ]);

    $isDev = strtolower((string) Env::get('APP_ENV', 'production')) === 'development';

    if ($isDbConnectionError) {
        $response = ['message' => 'Database connection failed. Please try again later.'];
        if ($isDev) {
            $response['error'] = $errorMessage;
        }
        Response::json($response, 503);
        exit;
    }

    $response = ['message' => 'An internal error occurred. Please try again later.'];
    if ($isDev) {
        $response['error'] = $errorMessage;
        $response['trace'] = $nativeError->getTraceAsString();
    }
    Response::json($response, 500);
    exit;
}

Response::json(['message' => 'API route not found'], 404);
