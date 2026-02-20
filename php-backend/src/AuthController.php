<?php

declare(strict_types=1);

use MongoDB\BSON\ObjectId;

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

        return false;
    }

    private function registerUser(): void
    {
        try {
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

            $usernameExists = $this->db->findOne('users', ['username' => $username]);
            if ($usernameExists !== null) {
                Response::json(['message' => 'Username already taken'], 400);
                return;
            }

            $validAgentId = null;
            if ($agentId !== '' && preg_match('/^[a-f0-9]{24}$/i', $agentId) === 1) {
                $agent = $this->db->findOne('agents', ['_id' => new ObjectId($agentId)]);
                if ($agent !== null) {
                    $validAgentId = new ObjectId($agentId);
                }
            }

            $now = MongoRepository::nowUtc();
            $insert = [
                'username' => $username,
                'phoneNumber' => $phoneNumber,
                'password' => password_hash($password, PASSWORD_BCRYPT),
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
                'agentBillingStatus' => 'paid',
                'createdAt' => $now,
                'updatedAt' => $now,
            ];

            $userId = $this->db->insertOne('users', $insert);
            $user = $this->db->findOne('users', ['_id' => new ObjectId($userId)]);
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
            $body = Http::jsonBody();
            $username = strtoupper(trim((string) ($body['username'] ?? '')));
            $password = (string) ($body['password'] ?? '');

            $user = $this->db->findOne('users', ['username' => $username]);
            if ($user === null) {
                $user = $this->db->findOne('agents', ['username' => $username]);
            }
            if ($user === null) {
                $user = $this->db->findOne('admins', ['username' => $username]);
            }

            if ($user === null || !$this->verifyPassword($password, (string) ($user['password'] ?? ''))) {
                Response::json(['message' => 'Invalid credentials'], 401);
                return;
            }

            if ($this->isSuspended($user)) {
                Response::json(['message' => 'Account suspended or disabled.'], 403);
                return;
            }

            $ipCheck = $this->ensureIpAllowed($user);
            if ($ipCheck['allowed'] !== true) {
                Response::json(['message' => $ipCheck['message']], 403);
                return;
            }

            $this->trackLoginIp($user);
            Response::json($this->buildAuthPayload($user));
        } catch (Throwable $e) {
            Response::json(['message' => 'Server error', 'error' => $e->getMessage()], 500);
        }
    }

    private function loginAdmin(): void
    {
        try {
            $body = Http::jsonBody();
            $username = trim((string) ($body['username'] ?? ''));
            $password = (string) ($body['password'] ?? '');

            $user = $this->db->findOne('admins', ['username' => $username]);
            if ($user === null || !$this->verifyPassword($password, (string) ($user['password'] ?? ''))) {
                Response::json(['message' => 'Invalid admin credentials'], 401);
                return;
            }

            if (($user['status'] ?? '') === 'suspended') {
                Response::json(['message' => 'Account suspended.'], 403);
                return;
            }

            $ipCheck = $this->ensureIpAllowed($user);
            if ($ipCheck['allowed'] !== true) {
                Response::json(['message' => $ipCheck['message']], 403);
                return;
            }

            $this->trackLoginIp($user);
            Response::json($this->buildAuthPayload($user));
        } catch (Throwable $e) {
            Response::json(['message' => 'Server error', 'error' => $e->getMessage()], 500);
        }
    }

    private function loginAgent(): void
    {
        try {
            $body = Http::jsonBody();
            $username = strtoupper(trim((string) ($body['username'] ?? '')));
            $password = (string) ($body['password'] ?? '');

            $user = $this->db->findOne('agents', ['username' => $username]);
            if ($user === null || !$this->verifyPassword($password, (string) ($user['password'] ?? ''))) {
                Response::json(['message' => 'Invalid agent credentials'], 401);
                return;
            }

            if (($user['status'] ?? '') === 'suspended') {
                Response::json(['message' => 'Account suspended.'], 403);
                return;
            }

            $ipCheck = $this->ensureIpAllowed($user);
            if ($ipCheck['allowed'] !== true) {
                Response::json(['message' => $ipCheck['message']], 403);
                return;
            }

            $this->trackLoginIp($user);
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
            $dashboardLayout = $body['dashboardLayout'] ?? null;
            if (is_string($dashboardLayout) && $dashboardLayout !== '') {
                $collection = $this->collectionByRole((string) ($user['role'] ?? 'user'));
                $this->db->updateOne($collection, ['_id' => new ObjectId((string) $user['_id'])], [
                    'dashboardLayout' => $dashboardLayout,
                    'updatedAt' => MongoRepository::nowUtc(),
                ]);
                $user['dashboardLayout'] = $dashboardLayout;
            }

            Response::json([
                'message' => 'Profile updated successfully',
                'user' => [
                    'id' => (string) $user['_id'],
                    'username' => $user['username'] ?? null,
                    'role' => $user['role'] ?? null,
                    'dashboardLayout' => $user['dashboardLayout'] ?? null,
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
        $user = $this->db->findOne($collection, ['_id' => new ObjectId($id)]);
        if ($user === null) {
            Response::json(['message' => 'Not authorized, user not found'], 403);
            return null;
        }

        if (($user['status'] ?? '') === 'suspended') {
            Response::json(['message' => 'Not authorized, account suspended'], 403);
            return null;
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
            'permissions' => $user['permissions'] ?? null,
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
            'permissions' => $user['permissions'] ?? null,
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
                    'userId' => new ObjectId((string) $user['_id']),
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

    private function ownerFilter(array $user, string $ip): array
    {
        $ownerModel = IpUtils::ownerModelForRole((string) ($user['role'] ?? 'user'));

        return [
            'userId' => new ObjectId((string) $user['_id']),
            'ip' => $ip,
            '$or' => [['userModel' => $ownerModel], ['userModel' => ['$exists' => false]]],
        ];
    }

    private function verifyPassword(string $plain, string $hashed): bool
    {
        if ($hashed === '') {
            return false;
        }
        if (str_starts_with($hashed, '$2')) {
            return password_verify($plain, $hashed);
        }
        return hash_equals($hashed, $plain);
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
