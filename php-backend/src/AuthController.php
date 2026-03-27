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
        if ($path === '/api/auth/refresh' && $method === 'POST') {
            $this->refreshToken();
            return true;
        }
        if ($path === '/api/auth/session' && $method === 'GET') {
            $this->getSession();
            return true;
        }
        if ($path === '/api/auth/logout' && $method === 'POST') {
            $this->logoutUser();
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
                $agent = $this->db->findOne('agents', ['id' => MongoRepository::id($agentId)]);
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
            $user = $this->db->findOne('users', ['id' => MongoRepository::id($userId)]);
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
            if (RateLimiter::enforce($this->db, 'login', 3, 60)) {
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

            // Account lockout: block login if too many recent failures
            if ($user !== null) {
                $lockoutWindow = 1800; // 30 minutes
                $maxFailures = 10;
                $userId = (string) ($user['id'] ?? '');
                $failedAttempts = $this->db->findMany('login_failures', [
                    'userId' => $userId,
                ], ['limit' => $maxFailures + 1]);
                $recentFailures = 0;
                $cutoff = time() - $lockoutWindow;
                foreach ($failedAttempts as $attempt) {
                    if (($attempt['timestamp'] ?? 0) >= $cutoff) {
                        $recentFailures++;
                    }
                }
                if ($recentFailures >= $maxFailures) {
                    Logger::info('Account locked out due to failed login attempts', ['userId' => $userId, 'username' => $username]);
                    Response::json(['message' => 'Account temporarily locked due to too many failed login attempts. Please try again in 30 minutes.'], 429);
                    return;
                }
            }

            $passwordValid = $user !== null
                ? $this->verifyPasswordInsensitive($password, $user, $userCollection)
                : false;

            if ($user === null || !$passwordValid) {
                // Record failed attempt for lockout tracking
                if ($user !== null) {
                    $this->db->insertOne('login_failures', [
                        'userId' => (string) ($user['id'] ?? ''),
                        'ip' => IpUtils::clientIp(),
                        'timestamp' => time(),
                    ]);
                }
                Response::json(['message' => 'Invalid credentials'], 401);
                return;
            }

            // Clear failed attempts on successful login
            $this->db->deleteMany('login_failures', ['userId' => (string) ($user['id'] ?? '')]);

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
            Logger::info('User login success', ['userId' => (string) ($user['id'] ?? ''), 'username' => (string) ($user['username'] ?? '')]);
            Response::json($this->buildAuthPayload($user));
        } catch (Throwable $e) {
            Logger::exception($e, 'User login error');
            Response::json(['message' => 'Server error', 'error' => $e->getMessage()], 500);
        }
    }

    private function loginAdmin(): void
    {
        try {
            if (RateLimiter::enforce($this->db, 'admin_login', 3, 60)) {
                return;
            }

            $body = Http::jsonBody();
            $usernameRaw = trim((string) ($body['username'] ?? ''));
            $password = (string) ($body['password'] ?? '');

            $user = $this->findByUsername('admins', $usernameRaw, true);

            if ($user !== null) {
                $lockoutWindow = 1800;
                $maxFailures = 10;
                $userId = (string) ($user['id'] ?? '');
                $failedAttempts = $this->db->findMany('login_failures', ['userId' => $userId], ['limit' => $maxFailures + 1]);
                $recentFailures = 0;
                $cutoff = time() - $lockoutWindow;
                foreach ($failedAttempts as $attempt) {
                    if (($attempt['timestamp'] ?? 0) >= $cutoff) {
                        $recentFailures++;
                    }
                }
                if ($recentFailures >= $maxFailures) {
                    Logger::info('Admin account locked out', ['userId' => $userId, 'username' => $usernameRaw]);
                    Response::json(['message' => 'Account temporarily locked due to too many failed login attempts. Please try again in 30 minutes.'], 429);
                    return;
                }
            }

            if ($user === null || !$this->verifyPasswordInsensitive($password, $user, 'admins')) {
                if ($user !== null) {
                    $this->db->insertOne('login_failures', [
                        'userId' => (string) ($user['id'] ?? ''),
                        'ip' => IpUtils::clientIp(),
                        'timestamp' => time(),
                    ]);
                }
                Response::json(['message' => 'Invalid admin credentials'], 401);
                return;
            }

            $this->db->deleteMany('login_failures', ['userId' => (string) ($user['id'] ?? '')]);

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
            Logger::info('Admin login success', ['userId' => (string) ($user['id'] ?? ''), 'username' => (string) ($user['username'] ?? '')]);
            Response::json($this->buildAuthPayload($user));
        } catch (Throwable $e) {
            Logger::exception($e, 'Admin login error');
            Response::json(['message' => 'Server error', 'error' => $e->getMessage()], 500);
        }
    }

    private function loginAgent(): void
    {
        try {
            if (RateLimiter::enforce($this->db, 'agent_login', 3, 60)) {
                return;
            }

            $body = Http::jsonBody();
            $username = trim((string) ($body['username'] ?? ''));
            $password = (string) ($body['password'] ?? '');

            $user = $this->findByUsername('agents', $username, true);

            if ($user !== null) {
                $lockoutWindow = 1800;
                $maxFailures = 10;
                $userId = (string) ($user['id'] ?? '');
                $failedAttempts = $this->db->findMany('login_failures', ['userId' => $userId], ['limit' => $maxFailures + 1]);
                $recentFailures = 0;
                $cutoff = time() - $lockoutWindow;
                foreach ($failedAttempts as $attempt) {
                    if (($attempt['timestamp'] ?? 0) >= $cutoff) {
                        $recentFailures++;
                    }
                }
                if ($recentFailures >= $maxFailures) {
                    Logger::info('Agent account locked out', ['userId' => $userId, 'username' => $username]);
                    Response::json(['message' => 'Account temporarily locked due to too many failed login attempts. Please try again in 30 minutes.'], 429);
                    return;
                }
            }

            if ($user === null || !$this->verifyPasswordInsensitive($password, $user, 'agents')) {
                if ($user !== null) {
                    $this->db->insertOne('login_failures', [
                        'userId' => (string) ($user['id'] ?? ''),
                        'ip' => IpUtils::clientIp(),
                        'timestamp' => time(),
                    ]);
                }
                Response::json(['message' => 'Invalid agent credentials'], 401);
                return;
            }

            $this->db->deleteMany('login_failures', ['userId' => (string) ($user['id'] ?? '')]);

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
            Logger::info('Agent login success', ['userId' => (string) ($user['id'] ?? ''), 'username' => (string) ($user['username'] ?? '')]);
            Response::json($this->buildAuthPayload($user));
        } catch (Throwable $e) {
            Logger::exception($e, 'Agent login error');
            Response::json(['message' => 'Server error', 'error' => $e->getMessage()], 500);
        }
    }

    private function refreshToken(): void
    {
        try {
            // Validate the current token (protect() already re-fetches the user from DB).
            // Also accepts a cookie-based token when no Authorization header is present.
            $user = $this->protectOrCookie();
            if ($user === null) {
                return;
            }

            $ttl = 8 * 3600;
            $newToken = Jwt::encode([
                'id'      => (string) $user['id'],
                'role'    => (string) ($user['role'] ?? 'user'),
                'agentId' => $user['agentId'] ?? null,
            ], $this->jwtSecret, $ttl);

            // Rotate the httpOnly cookie and CSRF cookie together
            $isHttps = !empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off';
            $cookieOptions = ['expires' => time() + $ttl, 'path' => '/', 'httponly' => true, 'samesite' => 'Lax'];
            if ($isHttps) {
                $cookieOptions['secure'] = true;
            }
            setcookie('auth_token', $newToken, $cookieOptions);
            $this->issueCsrfCookie($ttl, $isHttps);

            Response::json(['token' => $newToken]);
        } catch (Throwable $e) {
            Response::json(['message' => 'Token refresh failed: ' . $e->getMessage()], 401);
        }
    }

    private function getSession(): void
    {
        try {
            // Restore session purely from the httpOnly cookie (called on page reload).
            $cookieToken = $_COOKIE['auth_token'] ?? '';
            if ($cookieToken === '') {
                Response::json(['message' => 'No session cookie'], 401);
                return;
            }

            try {
                $decoded = Jwt::decode($cookieToken, $this->jwtSecret);
            } catch (Throwable $e) {
                // Cookie token is expired/invalid — clear it
                setcookie('auth_token', '', ['expires' => time() - 3600, 'path' => '/', 'httponly' => true, 'samesite' => 'Lax']);
                Response::json(['message' => 'Session expired'], 401);
                return;
            }

            $role = (string) ($decoded['role'] ?? 'user');
            $id   = (string) ($decoded['id'] ?? '');
            if ($id === '' || preg_match('/^[a-f0-9]{24}$/i', $id) !== 1) {
                Response::json(['message' => 'Invalid session token'], 401);
                return;
            }

            $collection = $this->collectionByRole($role);
            $user = $this->db->findOne($collection, ['id' => MongoRepository::id($id)]);
            if ($user === null) {
                Response::json(['message' => 'User not found'], 401);
                return;
            }

            if ($this->isSuspended($user)) {
                Response::json(['message' => 'Account suspended'], 403);
                return;
            }

            // Return the full auth payload (with a freshly-signed token in body)
            Response::json($this->buildAuthPayload($user));
        } catch (Throwable $e) {
            Response::json(['message' => 'Session check failed'], 500);
        }
    }

    private function logoutUser(): void
    {
        $isHttps = !empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off';
        // Clear the httpOnly auth cookie
        $expiredOptions = ['expires' => time() - 3600, 'path' => '/', 'httponly' => true, 'samesite' => 'Lax'];
        if ($isHttps) {
            $expiredOptions['secure'] = true;
        }
        setcookie('auth_token', '', $expiredOptions);
        // Clear the CSRF cookie (not httpOnly)
        $csrfExpired = ['expires' => time() - 3600, 'path' => '/', 'httponly' => false, 'samesite' => 'Lax'];
        if ($isHttps) {
            $csrfExpired['secure'] = true;
        }
        setcookie('csrf_token', '', $csrfExpired);
        Response::json(['message' => 'Logged out successfully']);
    }

    // Like protect() but also accepts the httpOnly cookie as a fallback (used by refresh).
    // When using cookie auth, requires X-CSRF-Token header to match csrf_token cookie
    // (Double Submit Cookie pattern — prevents CSRF attacks on cookie-auth endpoints).
    private function protectOrCookie(): ?array
    {
        $auth = Http::header('authorization');
        if (str_starts_with($auth, 'Bearer ')) {
            // Bearer header path — CSRF-safe by nature (custom headers can't be forged cross-site)
            return $this->protect();
        }

        // Cookie path — enforce CSRF double-submit check before any DB lookup
        $csrfHeader = Http::header('x-csrf-token');
        $csrfCookie = $_COOKIE['csrf_token'] ?? '';
        if ($csrfHeader === '' || $csrfCookie === '' || !hash_equals($csrfCookie, $csrfHeader)) {
            Response::json(['message' => 'CSRF validation failed'], 403);
            return null;
        }

        // Fall back to cookie
        $cookieToken = $_COOKIE['auth_token'] ?? '';
        if ($cookieToken === '') {
            Response::json(['message' => 'Not authorized, no token'], 401);
            return null;
        }

        try {
            $decoded = Jwt::decode($cookieToken, $this->jwtSecret);
        } catch (Throwable $e) {
            Response::json(['message' => 'Not authorized, token failed: ' . $e->getMessage()], 401);
            return null;
        }

        $role = (string) ($decoded['role'] ?? 'user');
        $id   = (string) ($decoded['id'] ?? '');
        if ($id === '' || preg_match('/^[a-f0-9]{24}$/i', $id) !== 1) {
            Response::json(['message' => 'Not authorized, invalid user id'], 401);
            return null;
        }

        $collection = $this->collectionByRole($role);
        $user = $this->db->findOne($collection, ['id' => MongoRepository::id($id)]);
        if ($user === null) {
            Response::json(['message' => 'Not authorized, user not found'], 403);
            return null;
        }

        if ($this->isSuspended($user)) {
            Response::json(['message' => 'Not authorized, account suspended'], 403);
            return null;
        }

        return $user;
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
                $this->db->updateOne($collection, ['id' => MongoRepository::id((string) $user['id'])], $updates);
            }

            Response::json([
                'message' => 'Profile updated successfully',
                'user' => [
                    'id' => (string) $user['id'],
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
        $user = $this->db->findOne($collection, ['id' => MongoRepository::id($id)]);
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

    private function buildAuthPayload(array $user, ?int $ttlOverride = null): array
    {
        $balance = $this->num($user['balance'] ?? 0);
        $pendingBalance = $this->num($user['pendingBalance'] ?? 0);
        $availableBalance = max(0, $balance - $pendingBalance);
        $balanceOwed = $this->num($user['balanceOwed'] ?? 0);
        $creditLimit = $this->num($user['creditLimit'] ?? 0);

        $ttl = $ttlOverride ?? 8 * 3600;
        $token = Jwt::encode([
            'id'      => (string) $user['id'],
            'role'    => (string) ($user['role'] ?? 'user'),
            'agentId' => $user['agentId'] ?? null,
        ], $this->jwtSecret, $ttl);

        // Set httpOnly cookie so JS cannot read the token directly (prevents XSS theft).
        // SameSite=Lax allows normal navigation; use SameSite=None + Secure only if frontend
        // and backend are on different origins (cross-site). The cookie mirrors the JWT TTL.
        $isHttps = !empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off';
        $cookieOptions = [
            'expires'  => time() + $ttl,
            'path'     => '/',
            'httponly' => true,
            'samesite' => 'Lax',
        ];
        if ($isHttps) {
            $cookieOptions['secure'] = true;
        }
        setcookie('auth_token', $token, $cookieOptions);

        // CSRF double-submit cookie: readable by JS (no httponly) so the frontend can echo
        // it back in the X-CSRF-Token header. A cross-origin attacker cannot read it.
        $this->issueCsrfCookie($ttl, $isHttps);

        $freeplayBalance = $this->num($user['freeplayBalance'] ?? 0);
        $freeplayExpiresAt = $user['freeplayExpiresAt'] ?? null;
        // Auto-expire: if expiry passed, report freeplay as 0 in the payload (background
        // zeroing happens on next bet attempt; this prevents UI from showing stale balance)
        if ($freeplayBalance > 0 && $freeplayExpiresAt !== null) {
            $expTs = is_numeric($freeplayExpiresAt) ? (int) $freeplayExpiresAt : strtotime((string) $freeplayExpiresAt);
            if ($expTs !== false && $expTs > 0 && $expTs < time()) {
                $freeplayBalance = 0.0;
                $freeplayExpiresAt = null;
            }
        }

        return [
            'id' => (string) $user['id'],
            'username' => $user['username'] ?? null,
            'phoneNumber' => $user['phoneNumber'] ?? null,
            'balance' => $balance,
            'pendingBalance' => $pendingBalance,
            'availableBalance' => $availableBalance,
            'balanceOwed' => $balanceOwed,
            'creditLimit' => $creditLimit,
            'freeplayBalance' => $freeplayBalance,
            'freeplayExpiresAt' => $freeplayExpiresAt,
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
            'token' => $token, // also returned in body so frontend can hold it in memory
        ];
    }

    private function buildMePayload(array $user): array
    {
        $balance = $this->num($user['balance'] ?? 0);
        $pendingBalance = $this->num($user['pendingBalance'] ?? 0);
        $availableBalance = max(0, $balance - $pendingBalance);
        $balanceOwed = $this->num($user['balanceOwed'] ?? 0);
        $creditLimit = $this->num($user['creditLimit'] ?? 0);
        $freeplayBalance = $this->num($user['freeplayBalance'] ?? 0);
        $freeplayExpiresAt = $user['freeplayExpiresAt'] ?? null;
        if ($freeplayBalance > 0 && $freeplayExpiresAt !== null) {
            $expTs = is_numeric($freeplayExpiresAt) ? (int) $freeplayExpiresAt : strtotime((string) $freeplayExpiresAt);
            if ($expTs !== false && $expTs > 0 && $expTs < time()) {
                $freeplayBalance = 0.0;
                $freeplayExpiresAt = null;
            }
        }

        return [
            'id' => (string) $user['id'],
            'username' => $user['username'] ?? null,
            'phoneNumber' => $user['phoneNumber'] ?? null,
            'balance' => $balance,
            'pendingBalance' => $pendingBalance,
            'availableBalance' => $availableBalance,
            'balanceOwed' => $balanceOwed,
            'creditLimit' => $creditLimit,
            'freeplayBalance' => $freeplayBalance,
            'freeplayExpiresAt' => $freeplayExpiresAt,
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

        $globallyWhitelisted = $this->db->findOne('iplogs', ['ip' => $ip, 'status' => 'whitelisted'], ['projection' => ['id' => 1]]);
        if ($globallyWhitelisted !== null) {
            return ['allowed' => true];
        }

        $blocked = $this->db->findOne('iplogs', array_merge($this->ownerFilter($user, $ip), ['status' => 'blocked']), ['projection' => ['id' => 1]]);
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
                    'userId' => MongoRepository::id((string) $user['id']),
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
            Logger::exception($e, 'IP allowlist check failed', ['userId' => (string) ($user['id'] ?? '')], 'error');
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
            'userId' => MongoRepository::id((string) $user['id']),
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
            $this->db->updateOne($collection, ['id' => MongoRepository::id((string) $user['id'])], [
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
            $this->db->updateOne($collection, ['id' => MongoRepository::id((string) $user['id'])], [
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
            $this->db->updateOne($collection, ['id' => MongoRepository::id((string) $user['id'])], [
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
            $algoRaw = $hashInfo['algo'] ?? null;
            $algoName = strtolower((string) ($hashInfo['algoName'] ?? 'unknown'));
            $legacyLooksHashed = (
                (is_int($algoRaw) && $algoRaw !== 0)
                || (is_string($algoRaw) && trim($algoRaw) !== '' && trim($algoRaw) !== '0')
                || ($algoName !== '' && $algoName !== 'unknown')
                || preg_match('/^\$(2[aby]|argon2i|argon2id)\$/', $legacyHash) === 1
            );

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
            $id = (string) ($user['id'] ?? '');
            if ($id === '' || preg_match('/^[a-f0-9]{24}$/i', $id) !== 1) {
                return;
            }

            $hash = password_hash($normalizedPassword, PASSWORD_BCRYPT);
            if (!is_string($hash) || $hash === '') {
                return;
            }

            $this->db->updateOne($collection, ['id' => MongoRepository::id($id)], [
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
            $id = (string) ($user['id'] ?? '');
            if ($id === '' || preg_match('/^[a-f0-9]{24}$/i', $id) !== 1) {
                return;
            }

            $hash = password_hash($plainPassword, PASSWORD_BCRYPT);
            if (!is_string($hash) || $hash === '') {
                return;
            }

            $this->db->updateOne($collection, ['id' => MongoRepository::id($id)], [
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

    // Issues a readable (non-httpOnly) CSRF cookie with a fresh random value.
    // The frontend reads this cookie and echoes it back as X-CSRF-Token on
    // state-changing cookie-auth requests (Double Submit Cookie pattern).
    private function issueCsrfCookie(int $ttl, bool $secure): void
    {
        $csrfToken = bin2hex(random_bytes(32)); // 64-char hex, cryptographically random
        $opts = ['expires' => time() + $ttl, 'path' => '/', 'httponly' => false, 'samesite' => 'Lax'];
        if ($secure) {
            $opts['secure'] = true;
        }
        setcookie('csrf_token', $csrfToken, $opts);
    }
}
