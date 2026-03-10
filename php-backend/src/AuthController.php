<?php

declare(strict_types=1);


final class AuthController
{
    private MongoRepository $db;
    private string $jwtSecret;

    public function __construct(MongoRepository $db, string $jwtSecret)
    {
        $this->db = $db;
        $this->jwtSecret = $jwtSecret;
    }

    public function handle(string $method, string $path): bool
    {
        if ($path === '/api/auth/register' && $method === 'POST') {
            $this->registerUser();
            return true;
        }
        if ($path === '/api/auth/login' && $method === 'POST') {
            $this->loginUser();
            return true;
        }
        if ($path === '/api/auth/admin/login' && $method === 'POST') {
            $this->loginAdmin();
            return true;
        }
        if ($path === '/api/auth/agent/login' && $method === 'POST') {
            $this->loginAgent();
            return true;
        }
        if ($path === '/api/auth/me' && $method === 'GET') {
            $this->getMe();
            return true;
        }
        if ($path === '/api/auth/profile' && $method === 'PUT') {
            $this->updateProfile();
            return true;
        }
        if ($path === '/api/auth/gambling-limits' && $method === 'GET') {
            $this->getGamblingLimits();
            return true;
        }
        if ($path === '/api/auth/gambling-limits' && $method === 'PUT') {
            $this->setGamblingLimits();
            return true;
        }
        if ($path === '/api/auth/self-exclude' && $method === 'POST') {
            $this->selfExclude();
            return true;
        }
        if ($path === '/api/auth/cooling-off' && $method === 'POST') {
            $this->coolingOff();
            return true;
        }

        return false;
    }

    private function registerUser(): void
    {
        try {
            if (RateLimiter::enforce($this->db, 'register', 3, 60)) {
                return;
            }

            $body = Http::jsonBody();
            $username = trim((string) ($body['username'] ?? ''));
            $phoneNumber = trim((string) ($body['phoneNumber'] ?? ''));
            $password = (string) ($body['password'] ?? '');
            $agentId = trim((string) ($body['agentId'] ?? ''));

            if ($username === '' || $phoneNumber === '' || $password === '') {
                Response::json(['message' => 'Username, phone number, and password are required'], 400);
                return;
            }

            $phoneExists = $this->db->findOne('users', ['phoneNumber' => $phoneNumber]);
            if ($phoneExists !== null) {
                Response::json(['message' => 'Phone number already registered'], 400);
                return;
            }

            $usernameExists = $this->findByUsername('users', $username, true)
                ?? $this->findByUsername('agents', $username, true)
                ?? $this->findByUsername('admins', $username, true);
            if ($usernameExists !== null) {
                Response::json(['message' => 'Username already taken'], 400);
                return;
            }

            $validAgentId = null;
            if ($agentId !== '' && preg_match('/^[a-f0-9]{24}$/i', $agentId) === 1) {
                $agent = $this->db->findOne('agents', ['_id' => MongoRepository::id($agentId)]);
                if ($agent !== null) {
                    $validAgentId = MongoRepository::id($agentId);
                }
            }

            $now = MongoRepository::nowUtc();
            $passwordFields = $this->passwordFields($password);
            $insert = [
                'username' => $username,
                'phoneNumber' => $phoneNumber,
                'password' => $passwordFields['password'],
                'passwordCaseInsensitiveHash' => $passwordFields['passwordCaseInsensitiveHash'],
                'role' => 'user',
                'agentId' => $validAgentId,
                'status' => 'active',
                'accountStatus' => 'active',
                'balance' => 1000.0,
                'pendingBalance' => 0.0,
                'balanceOwed' => 0.0,
                'creditLimit' => 1000.0,
                'totalWinnings' => 0.0,
                'viewOnly' => false,
                'unlimitedBalance' => false,
                'dashboardLayout' => 'tiles',
                'settings' => ['oddsFormat' => 'decimal'],
                'agentBillingStatus' => 'paid',
                'createdAt' => $now,
                'updatedAt' => $now,
            ];

            $userId = $this->db->insertOne('users', $insert);
            $user = $this->db->findOne('users', ['_id' => MongoRepository::id($userId)]);
            if ($user === null) {
                Response::json(['message' => 'Server error'], 500);
                return;
            }

            $payload = $this->buildAuthPayload($user);
            $payload['message'] = 'Registration successful';
            Response::json($payload, 201);
        } catch (Throwable $e) {
            Response::json(['message' => 'Server error: ' . $e->getMessage()], 500);
        }
    }

    private function loginUser(): void
    {
        try {
            if (RateLimiter::enforce($this->db, 'login', 5, 60)) {
                return;
            }

            $body = Http::jsonBody();
            $username = trim((string) ($body['username'] ?? ''));
            $password = (string) ($body['password'] ?? '');

            $user = $this->findByUsername('users', $username, true);
            $userCollection = 'users';
            if ($user === null) {
                $user = $this->findByUsername('agents', $username, true);
                $userCollection = 'agents';
            }
            if ($user === null) {
                $user = $this->findByUsername('admins', $username, true);
                $userCollection = 'admins';
            }

            $passwordValid = $user !== null
                ? $this->verifyPasswordInsensitive($password, $user, $userCollection)
                : false;

            if ($user === null || !$passwordValid) {
                Response::json(['message' => 'Invalid credentials'], 401);
                return;
            }

            if ($this->isSuspended($user)) {
                Response::json(['message' => 'Account suspended or disabled.'], 403);
                return;
            }

            $ipCheck = $this->ensureIpAllowedSafely($user);
            if ($ipCheck['allowed'] !== true) {
                Response::json(['message' => $ipCheck['message']], 403);
                return;
            }

            $this->trackLoginIpSafely($user);
            Response::json($this->buildAuthPayload($user));
        } catch (Throwable $e) {
            Response::json(['message' => 'Server error', 'error' => $e->getMessage()], 500);
        }
    }

    private function loginAdmin(): void
    {
        try {
            if (RateLimiter::enforce($this->db, 'admin_login', 5, 60)) {
                return;
            }

            $body = Http::jsonBody();
            $usernameRaw = trim((string) ($body['username'] ?? ''));
            $password = (string) ($body['password'] ?? '');

            $user = $this->findByUsername('admins', $usernameRaw, true);
            if ($user === null || !$this->verifyPasswordInsensitive($password, $user, 'admins')) {
                Response::json(['message' => 'Invalid admin credentials'], 401);
                return;
            }

            if (($user['status'] ?? '') === 'suspended') {
                Response::json(['message' => 'Account suspended.'], 403);
                return;
            }

            $ipCheck = $this->ensureIpAllowedSafely($user);
            if ($ipCheck['allowed'] !== true) {
                Response::json(['message' => $ipCheck['message']], 403);
                return;
            }

            $this->trackLoginIpSafely($user);
            Response::json($this->buildAuthPayload($user));
        } catch (Throwable $e) {
            Response::json(['message' => 'Server error', 'error' => $e->getMessage()], 500);
        }
    }

    private function loginAgent(): void
    {
        try {
            if (RateLimiter::enforce($this->db, 'agent_login', 5, 60)) {
                return;
            }

            $body = Http::jsonBody();
            $username = trim((string) ($body['username'] ?? ''));
            $password = (string) ($body['password'] ?? '');

            $user = $this->findByUsername('agents', $username, true);
            if ($user === null || !$this->verifyPasswordInsensitive($password, $user, 'agents')) {
                Response::json(['message' => 'Invalid agent credentials'], 401);
                return;
            }

            if (($user['status'] ?? '') === 'suspended') {
                Response::json(['message' => 'Account suspended.'], 403);
                return;
            }

            $ipCheck = $this->ensureIpAllowedSafely($user);
            if ($ipCheck['allowed'] !== true) {
                Response::json(['message' => $ipCheck['message']], 403);
                return;
            }

            $this->trackLoginIpSafely($user);
            Response::json($this->buildAuthPayload($user));
        } catch (Throwable $e) {
            Response::json(['message' => 'Server error', 'error' => $e->getMessage()], 500);
        }
    }

    private function getMe(): void
    {
        try {
            $user = $this->protect();
            if ($user === null) {
                return;
            }

            Response::json($this->buildMePayload($user));
        } catch (Throwable $e) {
            Response::json(['message' => 'Server error', 'error' => $e->getMessage()], 500);
        }
    }

    private function updateProfile(): void
    {
        try {
            $user = $this->protect();
            if ($user === null) {
                return;
            }

            $body = Http::jsonBody();
            $updates = [
                'updatedAt' => MongoRepository::nowUtc(),
            ];
            $dashboardLayout = $body['dashboardLayout'] ?? null;
            if (is_string($dashboardLayout) && $dashboardLayout !== '') {
                $user['dashboardLayout'] = $dashboardLayout;
                $updates['dashboardLayout'] = $dashboardLayout;
            }

            $incomingSettings = is_array($body['settings'] ?? null) ? $body['settings'] : [];
            if (array_key_exists('oddsFormat', $incomingSettings)) {
                $oddsFormat = strtolower(trim((string) $incomingSettings['oddsFormat']));
                if (!in_array($oddsFormat, ['american', 'decimal'], true)) {
                    Response::json(['message' => 'oddsFormat must be either american or decimal'], 400);
                    return;
                }
                $existingSettings = is_array($user['settings'] ?? null) ? $user['settings'] : [];
                $existingSettings['oddsFormat'] = $oddsFormat;
                $user['settings'] = $existingSettings;
                $updates['settings'] = $existingSettings;
            }

            if (count($updates) > 1) {
                $collection = $this->collectionByRole((string) ($user['role'] ?? 'user'));
                $this->db->updateOne($collection, ['_id' => MongoRepository::id((string) $user['_id'])], $updates);
            }

            Response::json([
                'message' => 'Profile updated successfully',
                'user' => [
                    'id' => (string) $user['_id'],
                    'username' => $user['username'] ?? null,
                    'role' => $user['role'] ?? null,
                    'dashboardLayout' => $user['dashboardLayout'] ?? null,
                    'settings' => is_array($user['settings'] ?? null) ? $user['settings'] : null,
                ],
            ]);
        } catch (Throwable $e) {
            Response::json(['message' => 'Server error updating profile'], 500);
        }
    }

    private function protect(): ?array
    {
        $auth = Http::header('authorization');
        if (!str_starts_with($auth, 'Bearer ')) {
            Response::json(['message' => 'Not authorized, no token'], 401);
            return null;
        }

        $token = trim(substr($auth, 7));
        try {
            $decoded = Jwt::decode($token, $this->jwtSecret);
        } catch (Throwable $e) {
            Response::json(['message' => 'Not authorized, token failed: ' . $e->getMessage()], 401);
            return null;
        }

        $role = (string) ($decoded['role'] ?? 'user');
        $id = (string) ($decoded['id'] ?? '');
        if ($id === '' || preg_match('/^[a-f0-9]{24}$/i', $id) !== 1) {
            Response::json(['message' => 'Not authorized, token failed: invalid user id'], 401);
            return null;
        }

        $collection = $this->collectionByRole($role);
        $user = $this->db->findOne($collection, ['_id' => MongoRepository::id($id)]);
        if ($user === null) {
            Response::json(['message' => 'Not authorized, user not found'], 403);
            return null;
        }

        if (($user['status'] ?? '') === 'suspended') {
            Response::json(['message' => 'Not authorized, account suspended'], 403);
            return null;
        }

        $selfExcludedUntil = $user['selfExcludedUntil'] ?? null;
        if (is_string($selfExcludedUntil) && $selfExcludedUntil !== '') {
            $excludedTs = strtotime($selfExcludedUntil);
            if ($excludedTs !== false && $excludedTs > time()) {
                Response::json(['message' => 'Account is self-excluded until ' . $selfExcludedUntil . '. Please contact support if you need assistance.'], 403);
                return null;
            }
        }

        $coolingOffUntil = $user['coolingOffUntil'] ?? null;
        if (is_string($coolingOffUntil) && $coolingOffUntil !== '') {
            $coolingTs = strtotime($coolingOffUntil);
            if ($coolingTs !== false && $coolingTs > time()) {
                Response::json(['message' => 'Account is in cooling-off period until ' . $coolingOffUntil], 403);
                return null;
            }
        }

        $ipBlockingEnabled = strtolower((string) Env::get('IP_BLOCKING_ENABLED', 'true')) === 'true';
        $allowlist = IpUtils::parseAllowlist((string) Env::get('IP_ALLOWLIST', ''));
        $ip = IpUtils::clientIp();
        if ($ip !== 'unknown' && $ipBlockingEnabled && !isset($allowlist[$ip])) {
            $whitelist = $this->db->findOne('iplogs', ['ip' => $ip, 'status' => 'whitelisted']);
            if ($whitelist === null) {
                $owner = $this->ownerFilter($user, $ip);
                $existingIp = $this->db->findOne('iplogs', $owner, ['projection' => ['status' => 1]]);
                if ($existingIp !== null && ($existingIp['status'] ?? '') === 'blocked') {
                    Response::json(['message' => 'Access blocked for this IP address'], 403);
                    return null;
                }
            }
        }

        if ($ip !== 'unknown') {
            $ownerModel = IpUtils::ownerModelForRole((string) ($user['role'] ?? 'user'));
            $this->db->updateOneUpsert('iplogs', $this->ownerFilter($user, $ip), [
                'userAgent' => Http::header('user-agent') !== '' ? Http::header('user-agent') : null,
                'lastActive' => MongoRepository::nowUtc(),
                'userModel' => $ownerModel,
            ], [
                'country' => 'Unknown',
                'city' => 'Unknown',
                'status' => 'active',
                'createdAt' => MongoRepository::nowUtc(),
            ]);
        }

        return $user;
    }

    private function buildAuthPayload(array $user): array
    {
        $balance = $this->num($user['balance'] ?? 0);
        $pendingBalance = $this->num($user['pendingBalance'] ?? 0);
        $availableBalance = max(0, $balance - $pendingBalance);
        $balanceOwed = $this->num($user['balanceOwed'] ?? 0);
        $creditLimit = $this->num($user['creditLimit'] ?? 0);

        return [
            'id' => (string) $user['_id'],
            'username' => $user['username'] ?? null,
            'phoneNumber' => $user['phoneNumber'] ?? null,
            'balance' => $balance,
            'pendingBalance' => $pendingBalance,
            'availableBalance' => $availableBalance,
            'balanceOwed' => $balanceOwed,
            'creditLimit' => $creditLimit,
            'unlimitedBalance' => (bool) ($user['unlimitedBalance'] ?? false),
            'isSuperAdmin' => (bool) ($user['isSuperAdmin'] ?? false),
            'totalWinnings' => $user['totalWinnings'] ?? 0,
            'role' => $user['role'] ?? 'user',
            'viewOnly' => $user['viewOnly'] ?? null,
            'agentBillingStatus' => $user['agentBillingStatus'] ?? null,
            'dashboardLayout' => $user['dashboardLayout'] ?? null,
            'settings' => is_array($user['settings'] ?? null) ? $user['settings'] : null,
            'permissions' => $user['permissions'] ?? null,
            'gamblingLimits' => is_array($user['gamblingLimits'] ?? null) ? $user['gamblingLimits'] : null,
            'selfExcludedUntil' => $user['selfExcludedUntil'] ?? null,
            'coolingOffUntil' => $user['coolingOffUntil'] ?? null,
            'realityCheckIntervalMinutes' => $user['realityCheckIntervalMinutes'] ?? 60,
            'token' => Jwt::encode([
                'id' => (string) $user['_id'],
                'role' => (string) ($user['role'] ?? 'user'),
                'agentId' => $user['agentId'] ?? null,
            ], $this->jwtSecret, 8 * 3600),
        ];
    }

    private function buildMePayload(array $user): array
    {
        $balance = $this->num($user['balance'] ?? 0);
        $pendingBalance = $this->num($user['pendingBalance'] ?? 0);
        $availableBalance = max(0, $balance - $pendingBalance);
        $balanceOwed = $this->num($user['balanceOwed'] ?? 0);
        $creditLimit = $this->num($user['creditLimit'] ?? 0);

        return [
            'id' => (string) $user['_id'],
            'username' => $user['username'] ?? null,
            'phoneNumber' => $user['phoneNumber'] ?? null,
            'balance' => $balance,
            'pendingBalance' => $pendingBalance,
            'availableBalance' => $availableBalance,
            'balanceOwed' => $balanceOwed,
            'creditLimit' => $creditLimit,
            'unlimitedBalance' => (bool) ($user['unlimitedBalance'] ?? false),
            'isSuperAdmin' => (bool) ($user['isSuperAdmin'] ?? false),
            'totalWinnings' => $user['totalWinnings'] ?? 0,
            'role' => $user['role'] ?? 'user',
            'viewOnly' => $user['viewOnly'] ?? null,
            'agentBillingStatus' => $user['agentBillingStatus'] ?? null,
            'dashboardLayout' => $user['dashboardLayout'] ?? null,
            'settings' => is_array($user['settings'] ?? null) ? $user['settings'] : null,
            'permissions' => $user['permissions'] ?? null,
            'gamblingLimits' => is_array($user['gamblingLimits'] ?? null) ? $user['gamblingLimits'] : null,
            'selfExcludedUntil' => $user['selfExcludedUntil'] ?? null,
            'coolingOffUntil' => $user['coolingOffUntil'] ?? null,
            'realityCheckIntervalMinutes' => $user['realityCheckIntervalMinutes'] ?? 60,
        ];
    }

    private function ensureIpAllowed(array $user): array
    {
        $ipBlockingEnabled = strtolower((string) Env::get('IP_BLOCKING_ENABLED', 'true')) === 'true';
        if (!$ipBlockingEnabled) {
            return ['allowed' => true];
        }

        $ip = IpUtils::clientIp();
        if ($ip === 'unknown') {
            return ['allowed' => true];
        }

        $allowlist = IpUtils::parseAllowlist((string) Env::get('IP_ALLOWLIST', ''));
        if (isset($allowlist[$ip])) {
            return ['allowed' => true];
        }

        $globallyWhitelisted = $this->db->findOne('iplogs', ['ip' => $ip, 'status' => 'whitelisted'], ['projection' => ['_id' => 1]]);
        if ($globallyWhitelisted !== null) {
            return ['allowed' => true];
        }

        $blocked = $this->db->findOne('iplogs', array_merge($this->ownerFilter($user, $ip), ['status' => 'blocked']), ['projection' => ['_id' => 1]]);
        if ($blocked !== null) {
            return ['allowed' => false, 'message' => 'Access blocked for this IP address'];
        }

        $duplicateIpBlockEnabled = strtolower((string) Env::get('DUPLICATE_IP_BLOCK_ENABLED', 'false')) === 'true';
        if ($duplicateIpBlockEnabled) {
            $ownerModel = IpUtils::ownerModelForRole((string) ($user['role'] ?? 'user'));
            $conflict = $this->db->findOne('iplogs', [
                'ip' => $ip,
                'status' => ['$in' => ['active', 'whitelisted']],
                '$nor' => [[
                    'userId' => MongoRepository::id((string) $user['_id']),
                    '$or' => [['userModel' => $ownerModel], ['userModel' => ['$exists' => false]]],
                ]],
            ]);

            if ($conflict !== null) {
                $this->db->updateOneUpsert('iplogs', $this->ownerFilter($user, $ip), [
                    'userModel' => $ownerModel,
                    'status' => 'blocked',
                    'blockReason' => 'DUPLICATE_IP',
                    'blockedAt' => MongoRepository::nowUtc(),
                    'blockedBy' => null,
                    'blockedByModel' => null,
                    'updatedAt' => MongoRepository::nowUtc(),
                ], [
                    'country' => 'Unknown',
                    'city' => 'Unknown',
                    'createdAt' => MongoRepository::nowUtc(),
                ]);

                return ['allowed' => false, 'message' => 'Security Alert: IP linked to another account.'];
            }
        }

        return ['allowed' => true];
    }

    private function trackLoginIp(array $user): void
    {
        $ip = IpUtils::clientIp();
        if ($ip === 'unknown') {
            return;
        }
        $ownerModel = IpUtils::ownerModelForRole((string) ($user['role'] ?? 'user'));

        $this->db->updateOneUpsert('iplogs', $this->ownerFilter($user, $ip), [
            'userAgent' => Http::header('user-agent') !== '' ? Http::header('user-agent') : null,
            'lastActive' => MongoRepository::nowUtc(),
            'userModel' => $ownerModel,
            'updatedAt' => MongoRepository::nowUtc(),
        ], [
            'country' => 'Unknown',
            'city' => 'Unknown',
            'status' => 'active',
            'createdAt' => MongoRepository::nowUtc(),
        ]);
    }

    private function ensureIpAllowedSafely(array $user): array
    {
        try {
            return $this->ensureIpAllowed($user);
        } catch (Throwable $e) {
            $logFile = __DIR__ . '/../logs/security-errors.log';
            $logDir = dirname($logFile);
            if (!is_dir($logDir)) {
                @mkdir($logDir, 0775, true);
            }
            @file_put_contents($logFile, date('Y-m-d H:i:s') . ' IP check failed: ' . $e->getMessage() . "\n", FILE_APPEND);
            return ['allowed' => false, 'message' => 'Security check failed. Please contact support.'];
        }
    }

    private function trackLoginIpSafely(array $user): void
    {
        try {
            $this->trackLoginIp($user);
        } catch (Throwable $e) {
            // Ignore IP tracking failures to avoid blocking authentication.
        }
    }

    private function ownerFilter(array $user, string $ip): array
    {
        $ownerModel = IpUtils::ownerModelForRole((string) ($user['role'] ?? 'user'));

        return [
            'userId' => MongoRepository::id((string) $user['_id']),
            'ip' => $ip,
            '$or' => [['userModel' => $ownerModel], ['userModel' => ['$exists' => false]]],
        ];
    }

    private function getGamblingLimits(): void
    {
        try {
            $user = $this->protect();
            if ($user === null) return;

            $limits = is_array($user['gamblingLimits'] ?? null) ? $user['gamblingLimits'] : [];
            
            Response::json([
                'gamblingLimits' => [
                    'depositDaily' => $limits['depositDaily'] ?? null,
                    'depositWeekly' => $limits['depositWeekly'] ?? null,
                    'depositMonthly' => $limits['depositMonthly'] ?? null,
                    'lossDaily' => $limits['lossDaily'] ?? null,
                    'lossWeekly' => $limits['lossWeekly'] ?? null,
                    'lossMonthly' => $limits['lossMonthly'] ?? null,
                    'sessionTimeMinutes' => $limits['sessionTimeMinutes'] ?? null,
                ],
                'selfExcludedUntil' => $user['selfExcludedUntil'] ?? null,
                'coolingOffUntil' => $user['coolingOffUntil'] ?? null,
                'realityCheckIntervalMinutes' => $user['realityCheckIntervalMinutes'] ?? 60,
            ]);
        } catch (Throwable $e) {
            Response::json(['message' => 'Server error'], 500);
        }
    }

    private function setGamblingLimits(): void
    {
        try {
            $user = $this->protect();
            if ($user === null) return;

            $body = Http::jsonBody();
            $currentLimits = is_array($user['gamblingLimits'] ?? null) ? $user['gamblingLimits'] : [];
            $newLimits = [];

            $fields = ['depositDaily', 'depositWeekly', 'depositMonthly', 'lossDaily', 'lossWeekly', 'lossMonthly', 'sessionTimeMinutes'];
            foreach ($fields as $field) {
                if (isset($body[$field]) && is_numeric($body[$field])) {
                    $val = (float) $body[$field];
                    if ($val > 0) {
                        $newLimits[$field] = $val;
                    }
                } elseif (isset($currentLimits[$field])) {
                    $newLimits[$field] = $currentLimits[$field];
                }
            }

            $collection = $this->collectionByRole((string) ($user['role'] ?? 'user'));
            $this->db->updateOne($collection, ['_id' => MongoRepository::id((string) $user['_id'])], [
                'gamblingLimits' => $newLimits,
                'realityCheckIntervalMinutes' => isset($body['realityCheckIntervalMinutes']) && is_numeric($body['realityCheckIntervalMinutes']) ? (int) $body['realityCheckIntervalMinutes'] : ($user['realityCheckIntervalMinutes'] ?? 60),
                'updatedAt' => MongoRepository::nowUtc(),
            ]);

            Response::json(['message' => 'Gambling limits updated successfully', 'gamblingLimits' => $newLimits]);
        } catch (Throwable $e) {
            Response::json(['message' => 'Server error'], 500);
        }
    }

    private function selfExclude(): void
    {
        try {
            $user = $this->protect();
            if ($user === null) return;

            $body = Http::jsonBody();
            $duration = trim((string) ($body['duration'] ?? ''));
            
            $durations = [
                '24h' => '+1 day',
                '7d' => '+7 days',
                '30d' => '+30 days',
                '6m' => '+6 months',
                '1y' => '+1 year',
                'permanent' => '+100 years',
            ];
            
            if (!isset($durations[$duration])) {
                Response::json(['message' => 'Invalid duration. Options: 24h, 7d, 30d, 6m, 1y, permanent'], 400);
                return;
            }

            $until = gmdate(DATE_ATOM, strtotime($durations[$duration]));
            $collection = $this->collectionByRole((string) ($user['role'] ?? 'user'));
            $this->db->updateOne($collection, ['_id' => MongoRepository::id((string) $user['_id'])], [
                'selfExcludedUntil' => $until,
                'updatedAt' => MongoRepository::nowUtc(),
            ]);

            Response::json(['message' => 'Self-exclusion activated until ' . $until, 'selfExcludedUntil' => $until]);
        } catch (Throwable $e) {
            Response::json(['message' => 'Server error'], 500);
        }
    }

    private function coolingOff(): void
    {
        try {
            $user = $this->protect();
            if ($user === null) return;

            $body = Http::jsonBody();
            $duration = trim((string) ($body['duration'] ?? ''));
            
            $durations = [
                '24h' => '+1 day',
                '48h' => '+2 days',
                '7d' => '+7 days',
                '14d' => '+14 days',
                '30d' => '+30 days',
                '6w' => '+42 days',
            ];
            
            if (!isset($durations[$duration])) {
                Response::json(['message' => 'Invalid duration. Options: 24h, 48h, 7d, 14d, 30d, 6w'], 400);
                return;
            }

            $until = gmdate(DATE_ATOM, strtotime($durations[$duration]));
            $collection = $this->collectionByRole((string) ($user['role'] ?? 'user'));
            $this->db->updateOne($collection, ['_id' => MongoRepository::id((string) $user['_id'])], [
                'coolingOffUntil' => $until,
                'updatedAt' => MongoRepository::nowUtc(),
            ]);

            Response::json(['message' => 'Cooling-off period activated until ' . $until, 'coolingOffUntil' => $until]);
        } catch (Throwable $e) {
            Response::json(['message' => 'Server error'], 500);
        }
    }

    private function passwordFields(string $plain): array
    {
        $legacyHash = password_hash($plain, PASSWORD_BCRYPT);
        $caseInsensitiveHash = password_hash(strtolower($plain), PASSWORD_BCRYPT);

        return [
            'password' => is_string($legacyHash) ? $legacyHash : '',
            'passwordCaseInsensitiveHash' => is_string($caseInsensitiveHash) ? $caseInsensitiveHash : '',
        ];
    }

    private function verifyPasswordInsensitive(string $plain, array $user, string $collection): bool
    {
        $normalized = strtolower($plain);
        $ciHash = (string) ($user['passwordCaseInsensitiveHash'] ?? '');
        if ($ciHash !== '' && password_verify($normalized, $ciHash)) {
            return true;
        }

        $legacyHash = (string) ($user['password'] ?? '');
        $displayPassword = trim((string) ($user['displayPassword'] ?? ''));
        $candidates = [$plain];
        $upper = strtoupper($plain);
        $lower = strtolower($plain);
        if ($upper !== $plain) {
            $candidates[] = $upper;
        }
        if ($lower !== $plain && $lower !== $upper) {
            $candidates[] = $lower;
        }

        $legacyMatched = false;
        $matchedSourcePassword = '';
        $legacyLooksHashed = false;

        if ($legacyHash !== '') {
            $hashInfo = password_get_info($legacyHash);
            $legacyLooksHashed = (int) ($hashInfo['algo'] ?? 0) !== 0;

            if ($legacyLooksHashed) {
                foreach ($candidates as $candidate) {
                    if (password_verify($candidate, $legacyHash)) {
                        $legacyMatched = true;
                        $matchedSourcePassword = $candidate;
                        break;
                    }
                }
            } else {
                foreach ($candidates as $candidate) {
                    if (strcasecmp($candidate, $legacyHash) === 0) {
                        $legacyMatched = true;
                        $matchedSourcePassword = $legacyHash;
                        $this->promoteLegacyPasswordHash($user, $collection, $legacyHash);
                        break;
                    }
                }
            }
        }

        if (!$legacyMatched && $displayPassword !== '' && strcasecmp($plain, $displayPassword) === 0) {
            $legacyMatched = true;
            $matchedSourcePassword = $displayPassword;
            if (!$legacyLooksHashed || $legacyHash === '' || !password_verify($displayPassword, $legacyHash)) {
                $this->promoteLegacyPasswordHash($user, $collection, $displayPassword);
            }
        }

        if (!$legacyMatched) {
            return false;
        }

        $sourceForCaseInsensitiveHash = $matchedSourcePassword !== '' ? strtolower($matchedSourcePassword) : $normalized;
        // Promote to canonical lowercase hash to support case-insensitive login going forward.
        $this->promoteCaseInsensitiveHash($user, $collection, $sourceForCaseInsensitiveHash);
        return true;
    }

    private function promoteCaseInsensitiveHash(array $user, string $collection, string $normalizedPassword): void
    {
        try {
            $id = (string) ($user['_id'] ?? '');
            if ($id === '' || preg_match('/^[a-f0-9]{24}$/i', $id) !== 1) {
                return;
            }

            $hash = password_hash($normalizedPassword, PASSWORD_BCRYPT);
            if (!is_string($hash) || $hash === '') {
                return;
            }

            $this->db->updateOne($collection, ['_id' => MongoRepository::id($id)], [
                'passwordCaseInsensitiveHash' => $hash,
                'updatedAt' => MongoRepository::nowUtc(),
            ]);
        } catch (Throwable $e) {
            // Never block a successful login due to hash-upgrade persistence failures.
        }
    }

    private function promoteLegacyPasswordHash(array $user, string $collection, string $plainPassword): void
    {
        try {
            $id = (string) ($user['_id'] ?? '');
            if ($id === '' || preg_match('/^[a-f0-9]{24}$/i', $id) !== 1) {
                return;
            }

            $hash = password_hash($plainPassword, PASSWORD_BCRYPT);
            if (!is_string($hash) || $hash === '') {
                return;
            }

            $this->db->updateOne($collection, ['_id' => MongoRepository::id($id)], [
                'password' => $hash,
                'updatedAt' => MongoRepository::nowUtc(),
            ]);
        } catch (Throwable $e) {
            // Never block a successful login due to hash-upgrade persistence failures.
        }
    }

    private function findByUsername(string $collection, string $usernameRaw, bool $allowCaseVariants = false): ?array
    {
        $username = trim($usernameRaw);
        if ($username === '') {
            return null;
        }

        $candidateUsernames = [$username];
        if ($allowCaseVariants) {
            $upper = strtoupper($username);
            $lower = strtolower($username);
            if ($upper !== $username) {
                $candidateUsernames[] = $upper;
            }
            if ($lower !== $username && $lower !== $upper) {
                $candidateUsernames[] = $lower;
            }
        }

        foreach ($candidateUsernames as $candidate) {
            $doc = $this->db->findOne($collection, ['username' => $candidate]);
            if ($doc !== null) {
                return $doc;
            }
        }

        if ($allowCaseVariants) {
            $escaped = preg_quote($username, '/');
            $regexDoc = $this->db->findOne($collection, ['username' => ['$regex' => '^' . $escaped . '$', '$options' => 'i']]);
            if ($regexDoc !== null) {
                return $regexDoc;
            }
        }

        return null;
    }

    private function isSuspended(array $user): bool
    {
        $accountStatus = (string) ($user['accountStatus'] ?? '');
        $status = (string) ($user['status'] ?? '');
        return in_array($accountStatus, ['suspended', 'closed', 'disabled'], true)
            || in_array($status, ['suspended', 'disabled'], true);
    }

    private function collectionByRole(string $role): string
    {
        if ($role === 'admin') {
            return 'admins';
        }
        if ($role === 'agent' || $role === 'master_agent' || $role === 'super_agent') {
            return 'agents';
        }
        return 'users';
    }

    private function num(mixed $value): float
    {
        if (is_int($value) || is_float($value)) {
            return (float) $value;
        }

        if (is_string($value)) {
            return (float) $value;
        }

        if (is_array($value)) {
            if (isset($value['$numberDecimal'])) {
                return (float) $value['$numberDecimal'];
            }
            if (isset($value['value'])) {
                return (float) $value['value'];
            }
        }

        if (is_object($value) && method_exists($value, '__toString')) {
            return (float) $value->__toString();
        }

        return 0.0;
    }
}
