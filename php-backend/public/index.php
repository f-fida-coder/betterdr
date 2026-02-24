<?php

declare(strict_types=1);

require_once __DIR__ . '/../src/Env.php';
require_once __DIR__ . '/../src/Http.php';
require_once __DIR__ . '/../src/IpUtils.php';
require_once __DIR__ . '/../src/Jwt.php';
require_once __DIR__ . '/../src/MongoRepository.php';
require_once __DIR__ . '/../src/BetModeRules.php';
require_once __DIR__ . '/../src/BetSettlementService.php';
require_once __DIR__ . '/../src/OddsSyncService.php';
require_once __DIR__ . '/../src/AuthController.php';
require_once __DIR__ . '/../src/WalletController.php';
require_once __DIR__ . '/../src/BetsController.php';
require_once __DIR__ . '/../src/BettingRulesController.php';
require_once __DIR__ . '/../src/MatchesController.php';
require_once __DIR__ . '/../src/ContentController.php';
require_once __DIR__ . '/../src/MessagesController.php';
require_once __DIR__ . '/../src/CasinoController.php';
require_once __DIR__ . '/../src/AgentController.php';
require_once __DIR__ . '/../src/PaymentsController.php';
require_once __DIR__ . '/../src/AdminCoreController.php';
require_once __DIR__ . '/../src/DebugController.php';
require_once __DIR__ . '/../src/Response.php';

$projectRoot = dirname(__DIR__, 2);
$phpBackendDir = dirname(__DIR__);
Env::load($projectRoot, $phpBackendDir);

$origin = $_SERVER['HTTP_ORIGIN'] ?? '';
$allowedOrigins = array_values(array_filter(array_map('trim', explode(',', Env::get('CORS_ORIGIN', '')))));
if ($origin !== '' && (count($allowedOrigins) === 0 || in_array($origin, $allowedOrigins, true))) {
    header('Access-Control-Allow-Origin: ' . $origin);
    header('Access-Control-Allow-Credentials: true');
}
header('Vary: Origin');
header('Access-Control-Allow-Headers: Content-Type, Authorization, Bypass-Tunnel-Remainder');
header('Access-Control-Allow-Methods: GET, POST, PUT, PATCH, DELETE, OPTIONS');

if (($_SERVER['REQUEST_METHOD'] ?? 'GET') === 'OPTIONS') {
    http_response_code(204);
    exit;
}

$uriPath = Http::path();
$method = Http::method();

$mongoUri = 'mysql-native';
$dbName = (string) Env::get('MYSQL_DB', Env::get('DB_NAME', 'sports_betting'));
if ($dbName === '') {
    $dbName = 'sports_betting';
}

$authNativeEnabled = MongoRepository::isAvailable();

if ($uriPath === '/api/_php/health') {
    Response::json([
        'ok' => true,
        'mode' => 'core-php-gateway',
        'authNativeEnabled' => $authNativeEnabled,
        'databaseName' => $dbName,
        'databaseEngine' => 'mysql',
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

if (
    str_starts_with($uriPath, '/api/auth')
    || str_starts_with($uriPath, '/api/wallet')
    || str_starts_with($uriPath, '/api/bets')
    || str_starts_with($uriPath, '/api/betting')
    || str_starts_with($uriPath, '/api/admin/bet-mode-rules')
    || str_starts_with($uriPath, '/api/matches')
    || str_starts_with($uriPath, '/api/content')
    || str_starts_with($uriPath, '/api/messages')
    || str_starts_with($uriPath, '/api/casino')
    || str_starts_with($uriPath, '/api/agent')
    || str_starts_with($uriPath, '/api/payments')
    || str_starts_with($uriPath, '/api/admin')
    || str_starts_with($uriPath, '/api/debug')
) {
    if ($authNativeEnabled) {
        try {
            $repo = new MongoRepository($mongoUri, $dbName);
            $jwtSecret = Env::get('JWT_SECRET', 'secret');
            $authController = new AuthController($repo, $jwtSecret);
            $walletController = new WalletController($repo, $jwtSecret);
            $betsController = new BetsController($repo, $jwtSecret);
            $bettingRulesController = new BettingRulesController($repo, $jwtSecret);
            $matchesController = new MatchesController($repo);
            $contentController = new ContentController($repo, $jwtSecret);
            $messagesController = new MessagesController($repo, $jwtSecret);
            $casinoController = new CasinoController($repo, $jwtSecret);
            $agentController = new AgentController($repo, $jwtSecret);
            $paymentsController = new PaymentsController($repo, $jwtSecret);
            $adminCoreController = new AdminCoreController($repo, $jwtSecret);
            $debugController = new DebugController($repo, $jwtSecret);

            $handled = $authController->handle($method, $uriPath)
                || $walletController->handle($method, $uriPath)
                || $betsController->handle($method, $uriPath)
                || $bettingRulesController->handle($method, $uriPath)
                || $matchesController->handle($method, $uriPath)
                || $contentController->handle($method, $uriPath)
                || $messagesController->handle($method, $uriPath)
                || $casinoController->handle($method, $uriPath)
                || $agentController->handle($method, $uriPath)
                || $paymentsController->handle($method, $uriPath)
                || $adminCoreController->handle($method, $uriPath)
                || $debugController->handle($method, $uriPath);

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
    Response::json(['message' => 'Core PHP request handling failed'], 500);
    exit;
}

Response::json(['message' => 'API route not found'], 404);
