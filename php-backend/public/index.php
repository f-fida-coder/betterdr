<?php

declare(strict_types=1);

// Lazy class loading — previously the top-of-file require_once loaded all 30+
// files (~1.5MB of source: AdminCoreController alone is 628KB) on every request.
// With this autoloader only the classes actually referenced for the current
// request get parsed, which on shared hosting with 60 PHP workers means each
// worker serves many more requests per second.
spl_autoload_register(static function (string $class): void {
    if (strpos($class, '\\') !== false) {
        return; // namespaced class — not ours
    }
    $file = __DIR__ . '/../src/' . $class . '.php';
    if (is_file($file)) {
        require_once $file;
    }
});

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
    // Skip OPTIONS preflights from access log to reduce noise
    if (($_SERVER['REQUEST_METHOD'] ?? '') === 'OPTIONS') {
        return;
    }
    Logger::request(
        (string) ($_SERVER['REQUEST_METHOD'] ?? 'GET'),
        Http::path(),
        $status,
        microtime(true) - $_requestStartTime
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

$dbUri = 'mysql-native';
$dbName = (string) Env::get('MYSQL_DB', Env::get('DB_NAME', 'sports_betting'));
if ($dbName === '') {
    $dbName = 'sports_betting';
}

$authNativeEnabled = SqlRepository::isAvailable();

if ($uriPath === '/api/_php/health') {
    $sportsbookHealth = null;
    if ($authNativeEnabled) {
        try {
            $repo = new SqlRepository($dbUri, $dbName);
            $sportsbookHealth = SportsbookHealth::sportsbookSnapshot($repo);
        } catch (Throwable $e) {
            $sportsbookHealth = ['error' => $e->getMessage()];
        }
    }
    Response::json([
        'ok' => true,
        'mode' => 'core-php-gateway',
        'authNativeEnabled' => $authNativeEnabled,
        'databaseName' => $dbName,
        'databaseEngine' => 'mysql',
        'sportsbook' => $sportsbookHealth,
        'time' => gmdate(DATE_ATOM),
    ]);
    exit;
}

if (!str_starts_with($uriPath, '/api')) {
    Response::json(['message' => 'Not Found'], 404);
    exit;
}

$handled = false;
$nativeError = null;

// Prefix → controller map. Longest-prefix-match wins so more specific admin
// subpaths route to their dedicated controller instead of AdminCoreController.
// Only the matching controller's class file is autoloaded — AdminCoreController
// (~628KB) and CasinoController (~397KB) are skipped entirely for unrelated routes.
$routeTable = [
    '/api/admin/agent-cuts'     => 'AgentCutsController',
    '/api/admin/bet-mode-rules' => 'BettingRulesController',
    '/api/auth'                 => 'AuthController',
    '/api/wallet'               => 'WalletController',
    '/api/bets'                 => 'BetsController',
    '/api/betting'              => 'BettingRulesController',
    '/api/matches'              => 'MatchesController',
    '/api/content'              => 'ContentController',
    '/api/messages'             => 'MessagesController',
    '/api/casino'               => 'CasinoController',
    '/api/agent'                => 'AgentController',
    '/api/payments'             => 'PaymentsController',
    '/api/admin'                => 'AdminCoreController',
    '/api/debug'                => 'DebugController',
];

$controllerClass = null;
foreach ($routeTable as $prefix => $class) {
    if (str_starts_with($uriPath, $prefix)) {
        $controllerClass = $class;
        break;
    }
}

if ($controllerClass !== null) {
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

            $controller = new $controllerClass($repo, $jwtSecret);
            $handled = $controller->handle($method, $uriPath);

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
