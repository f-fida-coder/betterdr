<?php

declare(strict_types=1);


final class AgentController
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
        if ($method === 'POST' && $path === '/api/agent/create-user') {
            $this->createUser();
            return true;
        }
        if ($method === 'GET' && $path === '/api/agent/my-users') {
            $this->getMyUsers();
            return true;
        }
        if ($method === 'GET' && $path === '/api/agent/stats') {
            $this->getAgentStats();
            return true;
        }
        if ($method === 'POST' && $path === '/api/agent/update-balance-owed') {
            $this->updateUserBalanceOwed();
            return true;
        }
        if ($method === 'PUT' && preg_match('#^/api/agent/users/([a-fA-F0-9]{24})$#', $path, $m) === 1) {
            $this->updateCustomer($m[1]);
            return true;
        }
        if ($method === 'POST' && $path === '/api/agent/create-sub-agent') {
            $this->createSubAgent();
            return true;
        }
        if ($method === 'GET' && $path === '/api/agent/my-sub-agents') {
            $this->getMySubAgents();
            return true;
        }
        if ($method === 'PUT' && preg_match('#^/api/agent/permissions/([a-fA-F0-9]{24})$#', $path, $m) === 1) {
            $this->updateAgentPermissions($m[1]);
            return true;
        }

        return false;
    }

    private function createUser(): void
    {
        try {
            $actor = $this->protect(['agent', 'master_agent', 'admin', 'super_agent']);
            if ($actor === null) {
                return;
            }
            if (!$this->ensureAgentNotViewOnly($actor)) {
                return;
            }

            $body = Http::jsonBody();
            $username = trim((string) ($body['username'] ?? ''));
            $phoneNumber = trim((string) ($body['phoneNumber'] ?? ''));
            $password = (string) ($body['password'] ?? '');
            $firstName = trim((string) ($body['firstName'] ?? ''));
            $lastName = trim((string) ($body['lastName'] ?? ''));

            if ($username === '' || $phoneNumber === '' || $password === '') {
                Response::json(['message' => 'Username, phone number, and password are required'], 400);
                return;
            }
            if ($firstName === '' || $lastName === '') {
                Response::json(['message' => 'First name and last name are required'], 400);
                return;
            }

            $assignedAgentId = (string) $actor['_id'];
            if (($actor['role'] ?? '') === 'master_agent' && isset($body['agentId']) && is_string($body['agentId']) && preg_match('/^[a-f0-9]{24}$/i', $body['agentId']) === 1) {
                $target = $this->db->findOne('agents', [
                    '_id' => MongoRepository::id($body['agentId']),
                    'createdBy' => MongoRepository::id((string) $actor['_id']),
                ]);
                if ($target === null) {
                    Response::json(['message' => 'You can only create players for yourself or your direct sub-agents.'], 403);
                    return;
                }
                $assignedAgentId = (string) $body['agentId'];
            }

            if ($this->existsUsernameOrPhone($username, $phoneNumber)) {
                Response::json(['message' => 'Username or phone number already exists in the system'], 409);
                return;
            }

            $oneWeekAgo = MongoRepository::utcFromMillis((time() - 7 * 24 * 60 * 60) * 1000);
            $recentUsersCount = $this->db->countDocuments('users', [
                'agentId' => MongoRepository::id($assignedAgentId),
                'createdAt' => ['$gte' => $oneWeekAgo],
            ]);

            if ($recentUsersCount >= 10) {
                Response::json(['message' => 'Weekly limit reached. You can only create 10 new customers per week.'], 429);
                return;
            }

            if (isset($body['referredByUserId']) && is_string($body['referredByUserId']) && preg_match('/^[a-f0-9]{24}$/i', $body['referredByUserId']) === 1) {
                $ref = $this->db->findOne('users', [
                    '_id' => MongoRepository::id($body['referredByUserId']),
                    'role' => 'user',
                    'agentId' => MongoRepository::id($assignedAgentId),
                ], ['projection' => ['_id' => 1]]);
                if ($ref === null) {
                    Response::json(['message' => 'Referrer must be one of your own players'], 400);
                    return;
                }
            }

            $fullName = trim((string) ($body['fullName'] ?? ''));
            $generatedFullName = strtoupper($fullName !== '' ? $fullName : (($firstName . ' ' . $lastName) !== ' ' ? trim($firstName . ' ' . $lastName) : $username));

            $doc = [
                'username' => strtoupper($username),
                'phoneNumber' => $phoneNumber,
                'password' => password_hash($password, PASSWORD_BCRYPT),
                'rawPassword' => $password,
                'firstName' => strtoupper($firstName),
                'lastName' => strtoupper($lastName),
                'fullName' => $generatedFullName,
                'role' => 'user',
                'status' => 'active',
                'balance' => $this->safeNumber($body['balance'] ?? null, 1000),
                'minBet' => $this->safeNumber($body['minBet'] ?? null, $this->safeNumber($actor['defaultMinBet'] ?? null, 25)),
                'maxBet' => $this->safeNumber($body['maxBet'] ?? null, $this->safeNumber($actor['defaultMaxBet'] ?? null, 200)),
                'creditLimit' => $this->safeNumber($body['creditLimit'] ?? null, $this->safeNumber($actor['defaultCreditLimit'] ?? null, 1000)),
                'balanceOwed' => $this->safeNumber($body['balanceOwed'] ?? null, $this->safeNumber($actor['defaultSettleLimit'] ?? null, 0)),
                'freeplayBalance' => $this->safeNumber($body['freeplayBalance'] ?? null, 200),
                'pendingBalance' => 0,
                'agentId' => MongoRepository::id($assignedAgentId),
                'createdBy' => MongoRepository::id((string) $actor['_id']),
                'createdByModel' => 'Agent',
                'referredByUserId' => (isset($body['referredByUserId']) && is_string($body['referredByUserId']) && preg_match('/^[a-f0-9]{24}$/i', $body['referredByUserId']) === 1)
                    ? MongoRepository::id($body['referredByUserId'])
                    : null,
                'referralBonusGranted' => false,
                'referralBonusAmount' => 0,
                'apps' => is_array($body['apps'] ?? null) ? $body['apps'] : new stdClass(),
                'createdAt' => MongoRepository::nowUtc(),
                'updatedAt' => MongoRepository::nowUtc(),
            ];

            $id = $this->db->insertOne('users', $doc);
            Response::json([
                'message' => 'User created successfully',
                'user' => [
                    'id' => $id,
                    'username' => strtoupper($username),
                    'phoneNumber' => $phoneNumber,
                    'role' => 'user',
                    'agentId' => $assignedAgentId,
                ],
            ], 201);
        } catch (Throwable $e) {
            Response::json(['message' => 'Server error creating user'], 500);
        }
    }

    private function getMyUsers(): void
    {
        try {
            $actor = $this->protect(['agent', 'master_agent', 'admin', 'super_agent']);
            if ($actor === null) {
                return;
            }

            $users = $this->db->findMany('users', ['agentId' => MongoRepository::id((string) $actor['_id'])]);
            $userIds = [];
            foreach ($users as $u) {
                if (isset($u['_id']) && is_string($u['_id']) && preg_match('/^[a-f0-9]{24}$/i', $u['_id']) === 1) {
                    $userIds[] = MongoRepository::id($u['_id']);
                }
            }

            $oneWeekAgo = MongoRepository::utcFromMillis((time() - 7 * 24 * 60 * 60) * 1000);
            $bets = count($userIds) > 0
                ? $this->db->findMany('bets', ['userId' => ['$in' => $userIds], 'createdAt' => ['$gte' => $oneWeekAgo]])
                : [];

            $counts = [];
            foreach ($bets as $bet) {
                $uid = (string) ($bet['userId'] ?? '');
                if ($uid === '') {
                    continue;
                }
                $counts[$uid] = ($counts[$uid] ?? 0) + 1;
            }

            $formatted = [];
            foreach ($users as $user) {
                $balance = $this->num($user['balance'] ?? 0);
                $pendingBalance = $this->num($user['pendingBalance'] ?? 0);
                $uid = (string) ($user['_id'] ?? '');
                $formatted[] = [
                    'id' => $uid,
                    'username' => $user['username'] ?? null,
                    'phoneNumber' => $user['phoneNumber'] ?? null,
                    'firstName' => $user['firstName'] ?? null,
                    'lastName' => $user['lastName'] ?? null,
                    'fullName' => $user['fullName'] ?? null,
                    'minBet' => $this->safeNumber($user['minBet'] ?? null, 0),
                    'maxBet' => $this->safeNumber($user['maxBet'] ?? null, 0),
                    'creditLimit' => $this->num($user['creditLimit'] ?? 0),
                    'balanceOwed' => $this->num($user['balanceOwed'] ?? 0),
                    'freeplayBalance' => $this->num($user['freeplayBalance'] ?? 0),
                    'status' => $user['status'] ?? null,
                    'createdAt' => $user['createdAt'] ?? null,
                    'totalWinnings' => $user['totalWinnings'] ?? 0,
                    'balance' => $balance,
                    'pendingBalance' => $pendingBalance,
                    'availableBalance' => max(0, $balance - $pendingBalance),
                    'isActive' => ($counts[$uid] ?? 0) >= 2,
                    'rawPassword' => $user['rawPassword'] ?? null,
                    'referredByUserId' => isset($user['referredByUserId']) ? (string) $user['referredByUserId'] : null,
                    'referredByUsername' => null,
                    'referralBonusGranted' => (bool) ($user['referralBonusGranted'] ?? false),
                    'referralBonusAmount' => $this->safeNumber($user['referralBonusAmount'] ?? null, 0),
                ];
            }

            Response::json($formatted);
        } catch (Throwable $e) {
            Response::json(['message' => 'Server error fetching users'], 500);
        }
    }

    private function getAgentStats(): void
    {
        try {
            $actor = $this->protect(['agent', 'master_agent', 'admin', 'super_agent']);
            if ($actor === null) {
                return;
            }

            $agentId = MongoRepository::id((string) $actor['_id']);
            $totalUsers = $this->db->countDocuments('users', ['agentId' => $agentId]);
            $myUsers = $this->db->findMany('users', ['agentId' => $agentId], ['projection' => ['_id' => 1]]);

            $userIds = [];
            foreach ($myUsers as $u) {
                if (isset($u['_id']) && is_string($u['_id']) && preg_match('/^[a-f0-9]{24}$/i', $u['_id']) === 1) {
                    $userIds[] = MongoRepository::id($u['_id']);
                }
            }

            if (count($userIds) === 0) {
                Response::json(['totalUsers' => 0, 'totalBets' => 0, 'totalWagered' => 0, 'netProfit' => 0]);
                return;
            }

            $bets = $this->db->findMany('bets', ['userId' => ['$in' => $userIds]]);
            $totalWagered = 0.0;
            $totalPayouts = 0.0;
            $winCount = 0;

            foreach ($bets as $bet) {
                $totalWagered += $this->num($bet['amount'] ?? 0);
                if (($bet['status'] ?? '') === 'won') {
                    $totalPayouts += $this->num($bet['potentialPayout'] ?? 0);
                    $winCount++;
                }
            }

            $betCount = count($bets);
            $winRate = $betCount > 0 ? ($winCount / $betCount) * 100 : 0;

            Response::json([
                'totalUsers' => $totalUsers,
                'totalBets' => $betCount,
                'totalWagered' => $totalWagered,
                'netProfit' => $totalWagered - $totalPayouts,
                'winRate' => number_format($winRate, 2, '.', ''),
            ]);
        } catch (Throwable $e) {
            Response::json(['message' => 'Server error fetching stats'], 500);
        }
    }

    private function updateUserBalanceOwed(): void
    {
        try {
            $actor = $this->protect(['agent', 'master_agent', 'admin', 'super_agent']);
            if ($actor === null) {
                return;
            }
            if (!$this->ensureAgentNotViewOnly($actor)) {
                return;
            }

            $body = Http::jsonBody();
            $userId = (string) ($body['userId'] ?? '');
            $nextValue = array_key_exists('balance', $body) ? $body['balance'] : ($body['balanceOwed'] ?? null);

            if ($userId === '' || $nextValue === null || preg_match('/^[a-f0-9]{24}$/i', $userId) !== 1) {
                Response::json(['message' => 'User ID and balance are required'], 400);
                return;
            }

            $user = $this->db->findOne('users', ['_id' => MongoRepository::id($userId)]);
            if ($user === null || (($user['role'] ?? 'user') !== 'user')) {
                Response::json(['message' => 'Customer not found'], 404);
                return;
            }

            if (($actor['role'] ?? '') === 'agent' && (string) ($user['agentId'] ?? '') !== (string) ($actor['_id'] ?? '')) {
                Response::json(['message' => 'Not authorized to update this customer'], 403);
                return;
            }

            $balanceBefore = $this->num($user['balance'] ?? 0);
            $nextBalance = max(0, (float) $nextValue);

            $this->db->updateOne('users', ['_id' => MongoRepository::id($userId)], [
                'balance' => $nextBalance,
                'updatedAt' => MongoRepository::nowUtc(),
            ]);

            $this->db->insertOne('transactions', [
                'userId' => MongoRepository::id($userId),
                'agentId' => MongoRepository::id((string) $actor['_id']),
                'amount' => abs($nextBalance - $balanceBefore),
                'type' => 'adjustment',
                'status' => 'completed',
                'balanceBefore' => $balanceBefore,
                'balanceAfter' => $nextBalance,
                'referenceType' => 'Adjustment',
                'reason' => 'AGENT_BALANCE_ADJUSTMENT',
                'description' => 'Agent updated user balance',
                'createdAt' => MongoRepository::nowUtc(),
                'updatedAt' => MongoRepository::nowUtc(),
            ]);

            $pendingBalance = $this->num($user['pendingBalance'] ?? 0);
            Response::json([
                'message' => 'Balance updated',
                'user' => [
                    'id' => $userId,
                    'balance' => $nextBalance,
                    'pendingBalance' => $pendingBalance,
                    'availableBalance' => max(0, $nextBalance - $pendingBalance),
                ],
            ]);
        } catch (Throwable $e) {
            Response::json(['message' => 'Server error updating balance owed', 'details' => $e->getMessage()], 500);
        }
    }

    private function updateCustomer(string $id): void
    {
        try {
            $actor = $this->protect(['agent', 'master_agent', 'admin', 'super_agent']);
            if ($actor === null) {
                return;
            }
            if (!$this->ensureAgentNotViewOnly($actor)) {
                return;
            }

            $user = $this->db->findOne('users', ['_id' => MongoRepository::id($id)]);
            if ($user === null || (($user['role'] ?? 'user') !== 'user')) {
                Response::json(['message' => 'Customer not found'], 404);
                return;
            }

            if ((string) ($user['agentId'] ?? '') !== (string) ($actor['_id'] ?? '')) {
                Response::json(['message' => 'Not authorized to update this customer'], 403);
                return;
            }

            $body = Http::jsonBody();
            $updates = ['updatedAt' => MongoRepository::nowUtc()];

            if (isset($body['phoneNumber']) && is_string($body['phoneNumber']) && $body['phoneNumber'] !== ($user['phoneNumber'] ?? null)) {
                $existingPhone = $this->db->findOne('users', ['phoneNumber' => $body['phoneNumber']]);
                if ($existingPhone !== null && (string) ($existingPhone['_id'] ?? '') !== $id) {
                    Response::json(['message' => 'Phone number already exists'], 409);
                    return;
                }
                $updates['phoneNumber'] = $body['phoneNumber'];
            }

            if (isset($body['password']) && is_string($body['password']) && $body['password'] !== '') {
                $updates['password'] = password_hash($body['password'], PASSWORD_BCRYPT);
                $updates['rawPassword'] = $body['password'];
            }

            if (isset($body['firstName'])) {
                $updates['firstName'] = strtoupper((string) $body['firstName']);
            }
            if (isset($body['lastName'])) {
                $updates['lastName'] = strtoupper((string) $body['lastName']);
            }
            if (isset($body['fullName']) && trim((string) $body['fullName']) !== '') {
                $updates['fullName'] = strtoupper(trim((string) $body['fullName']));
            } elseif (isset($body['firstName']) || isset($body['lastName'])) {
                $fName = strtoupper((string) ($body['firstName'] ?? ($user['firstName'] ?? '')));
                $lName = strtoupper((string) ($body['lastName'] ?? ($user['lastName'] ?? '')));
                $updates['fullName'] = strtoupper(trim($fName . ' ' . $lName));
            }

            foreach (['minBet', 'maxBet', 'creditLimit', 'balanceOwed', 'freeplayBalance', 'status'] as $field) {
                if (array_key_exists($field, $body)) {
                    $updates[$field] = $body[$field];
                }
            }

            if (array_key_exists('apps', $body) && is_array($body['apps'])) {
                $existingApps = is_array($user['apps'] ?? null) ? $user['apps'] : [];
                $updates['apps'] = array_merge($existingApps, $body['apps']);
            }

            $this->db->updateOne('users', ['_id' => MongoRepository::id($id)], $updates);
            $updated = $this->db->findOne('users', ['_id' => MongoRepository::id($id)]);

            Response::json(['message' => 'Customer updated successfully', 'user' => $updated]);
        } catch (Throwable $e) {
            Response::json(['message' => 'Server error updating customer'], 500);
        }
    }

    private function getMySubAgents(): void
    {
        try {
            $actor = $this->protect(['master_agent', 'admin', 'super_agent']);
            if ($actor === null) {
                return;
            }

            $agents = $this->db->findMany('agents', [
                'createdBy' => MongoRepository::id((string) $actor['_id']),
                'createdByModel' => 'Agent',
            ], ['sort' => ['createdAt' => -1]]);

            Response::json($agents);
        } catch (Throwable $e) {
            Response::json(['message' => 'Server error fetching sub-agents'], 500);
        }
    }

    private function createSubAgent(): void
    {
        try {
            $actor = $this->protect(['master_agent', 'super_agent']);
            if ($actor === null) {
                return;
            }
            if (!$this->ensureAgentNotViewOnly($actor)) {
                return;
            }

            if (($actor['role'] ?? '') !== 'master_agent') {
                Response::json(['message' => 'Only Master Agents can create agents'], 403);
                return;
            }

            $body = Http::jsonBody();
            $username = trim((string) ($body['username'] ?? ''));
            $phoneNumber = trim((string) ($body['phoneNumber'] ?? ''));
            $password = (string) ($body['password'] ?? '');
            $referredByUserId = trim((string) ($body['referredByUserId'] ?? ''));
            if ($username === '' || $phoneNumber === '' || $password === '') {
                Response::json(['message' => 'Username, phone number, and password are required'], 400);
                return;
            }

            if ($this->existsUsernameOrPhone($username, $phoneNumber)) {
                Response::json(['message' => 'Username or Phone number already exists in the system'], 409);
                return;
            }

            $role = ((string) ($body['role'] ?? '') === 'master_agent') ? 'master_agent' : 'agent';
            $fullName = strtoupper(trim((string) ($body['fullName'] ?? $username)));
            $referrerObjectId = null;
            if ($referredByUserId !== '') {
                if (preg_match('/^[a-f0-9]{24}$/i', $referredByUserId) !== 1) {
                    Response::json(['message' => 'Invalid referredByUserId'], 400);
                    return;
                }
                $ref = $this->db->findOne('users', ['_id' => MongoRepository::id($referredByUserId), 'role' => 'user']);
                if ($ref === null) {
                    Response::json(['message' => 'Invalid referredByUserId'], 400);
                    return;
                }
                $referrerObjectId = MongoRepository::id($referredByUserId);
            }

            $doc = [
                'username' => strtoupper($username),
                'phoneNumber' => $phoneNumber,
                'password' => password_hash($password, PASSWORD_BCRYPT),
                'rawPassword' => $password,
                'fullName' => $fullName,
                'role' => $role,
                'status' => 'active',
                'balance' => 0,
                'agentBillingRate' => $this->safeNumber($actor['agentBillingRate'] ?? null, 0),
                'agentBillingStatus' => 'paid',
                'defaultMinBet' => $this->safeNumber($body['defaultMinBet'] ?? null, 25),
                'defaultMaxBet' => $this->safeNumber($body['defaultMaxBet'] ?? null, 200),
                'defaultCreditLimit' => $this->safeNumber($body['defaultCreditLimit'] ?? null, 1000),
                'defaultSettleLimit' => $this->safeNumber($body['defaultSettleLimit'] ?? null, 0),
                'createdBy' => MongoRepository::id((string) $actor['_id']),
                'createdByModel' => 'Agent',
                'referredByUserId' => $referrerObjectId,
                'createdAt' => MongoRepository::nowUtc(),
                'updatedAt' => MongoRepository::nowUtc(),
            ];

            $id = $this->db->insertOne('agents', $doc);
            if ($role === 'master_agent') {
                $this->syncMasterAgentCollection(array_merge($doc, ['_id' => $id]));
            }

            Response::json([
                'message' => 'Sub-Agent created successfully',
                'agent' => [
                    'id' => $id,
                    'username' => strtoupper($username),
                    'phoneNumber' => $phoneNumber,
                    'fullName' => $fullName,
                    'role' => $role,
                    'status' => 'active',
                    'createdAt' => gmdate(DATE_ATOM),
                ],
            ], 201);
        } catch (Throwable $e) {
            Response::json(['message' => 'Server error creating sub-agent'], 500);
        }
    }

    private function updateAgentPermissions(string $id): void
    {
        try {
            $actor = $this->protect(['admin', 'master_agent', 'super_agent']);
            if ($actor === null) {
                return;
            }

            $agent = $this->db->findOne('agents', ['_id' => MongoRepository::id($id)]);
            if ($agent === null) {
                Response::json(['message' => 'Agent not found'], 404);
                return;
            }

            $body = Http::jsonBody();
            $incomingPermissions = $body['permissions'] ?? null;
            if ($incomingPermissions !== null && !is_array($incomingPermissions)) {
                Response::json(['message' => 'permissions must be an object'], 400);
                return;
            }

            $updates = ['updatedAt' => MongoRepository::nowUtc()];
            if (is_array($incomingPermissions)) {
                $existingPermissions = is_array($agent['permissions'] ?? null) ? $agent['permissions'] : [];
                $updates['permissions'] = $this->mergeDeep($existingPermissions, $incomingPermissions);
            }

            $this->db->updateOne('agents', ['_id' => MongoRepository::id($id)], $updates);
            $updated = $this->db->findOne('agents', ['_id' => MongoRepository::id($id)]);

            Response::json([
                'message' => 'Agent permissions updated successfully',
                'agent' => $updated,
            ]);
        } catch (Throwable $e) {
            Response::json(['message' => 'Server error updating permissions', 'details' => $e->getMessage()], 500);
        }
    }

    private function syncMasterAgentCollection(array $agent): void
    {
        $id = (string) ($agent['_id'] ?? '');
        if ($id === '' || preg_match('/^[a-f0-9]{24}$/i', $id) !== 1) {
            return;
        }

        $payload = [
            'agentId' => MongoRepository::id($id),
            'username' => strtoupper((string) ($agent['username'] ?? '')),
            'fullName' => (string) ($agent['fullName'] ?? ''),
            'phoneNumber' => (string) ($agent['phoneNumber'] ?? ''),
            'rawPassword' => (string) ($agent['rawPassword'] ?? ''),
            'status' => (string) ($agent['status'] ?? 'active'),
            'balance' => $this->num($agent['balance'] ?? 0),
            'defaultMinBet' => $this->safeNumber($agent['defaultMinBet'] ?? null, 0),
            'defaultMaxBet' => $this->safeNumber($agent['defaultMaxBet'] ?? null, 0),
            'defaultCreditLimit' => $this->safeNumber($agent['defaultCreditLimit'] ?? null, 0),
            'defaultSettleLimit' => $this->safeNumber($agent['defaultSettleLimit'] ?? null, 0),
            'createdBy' => isset($agent['createdBy']) && preg_match('/^[a-f0-9]{24}$/i', (string) $agent['createdBy']) === 1
                ? MongoRepository::id((string) $agent['createdBy'])
                : null,
            'createdByModel' => (string) ($agent['createdByModel'] ?? ''),
            'referredByUserId' => isset($agent['referredByUserId']) && preg_match('/^[a-f0-9]{24}$/i', (string) $agent['referredByUserId']) === 1
                ? MongoRepository::id((string) $agent['referredByUserId'])
                : null,
            'syncedAt' => MongoRepository::nowUtc(),
        ];

        $this->db->updateOneUpsert(
            'master_agents',
            ['agentId' => MongoRepository::id($id)],
            $payload,
            ['createdAt' => MongoRepository::nowUtc()]
        );
    }

    private function protect(array $allowedRoles): ?array
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
        if (!in_array($role, $allowedRoles, true)) {
            Response::json(['message' => 'User role ' . $role . ' is not authorized to access this route'], 403);
            return null;
        }

        $id = (string) ($decoded['id'] ?? '');
        if ($id === '' || preg_match('/^[a-f0-9]{24}$/i', $id) !== 1) {
            Response::json(['message' => 'Not authorized, token failed: invalid user id'], 401);
            return null;
        }

        $collection = $this->collectionByRole($role);
        $actor = $this->db->findOne($collection, ['_id' => MongoRepository::id($id)]);
        if ($actor === null) {
            Response::json(['message' => 'Not authorized, user not found'], 403);
            return null;
        }
        if (($actor['status'] ?? '') === 'suspended') {
            Response::json(['message' => 'Not authorized, account suspended'], 403);
            return null;
        }

        return $actor;
    }

    private function ensureAgentNotViewOnly(array $actor): bool
    {
        $role = (string) ($actor['role'] ?? '');
        if (!in_array($role, ['agent', 'master_agent', 'super_agent'], true)) {
            return true;
        }
        if (($actor['viewOnly'] ?? false) || (($actor['agentBillingStatus'] ?? '') === 'unpaid')) {
            Response::json(['message' => 'Account is view-only due to unpaid platform balance.'], 403);
            return false;
        }
        return true;
    }

    private function existsUsernameOrPhone(string $username, string $phoneNumber): bool
    {
        $query = ['$or' => [['username' => $username], ['phoneNumber' => $phoneNumber]]];
        return $this->db->findOne('users', $query) !== null
            || $this->db->findOne('admins', $query) !== null
            || $this->db->findOne('agents', $query) !== null;
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

    private function safeNumber(mixed $value, float $fallback = 0): float
    {
        if (!is_numeric($value)) {
            return $fallback;
        }
        $parsed = (float) $value;
        return is_finite($parsed) ? $parsed : $fallback;
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

    private function mergeDeep(array $base, array $overlay): array
    {
        foreach ($overlay as $key => $value) {
            if (is_array($value) && is_array($base[$key] ?? null)) {
                $base[$key] = $this->mergeDeep($base[$key], $value);
                continue;
            }
            $base[$key] = $value;
        }
        return $base;
    }
}
