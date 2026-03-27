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
            $password = strtoupper(trim((string) ($body['password'] ?? '')));
            $firstName = trim((string) ($body['firstName'] ?? ''));
            $lastName = trim((string) ($body['lastName'] ?? ''));
            $fullName = trim((string) ($body['fullName'] ?? ''));
            $email = trim((string) ($body['email'] ?? ''));
            $generatedPassword = $this->generateIdentityPassword($firstName, $lastName, $phoneNumber, $username);
            if ($generatedPassword !== '') {
                $password = $generatedPassword;
            }
            $grantStartingFreeplay = false;
            if (array_key_exists('grantStartingFreeplay', $body)) {
                $rawGrantStartingFreeplay = $body['grantStartingFreeplay'];
                if (is_bool($rawGrantStartingFreeplay)) {
                    $grantStartingFreeplay = $rawGrantStartingFreeplay;
                } else {
                    $parsedGrantStartingFreeplay = filter_var(
                        (string) $rawGrantStartingFreeplay,
                        FILTER_VALIDATE_BOOLEAN,
                        FILTER_NULL_ON_FAILURE
                    );
                    if ($parsedGrantStartingFreeplay !== null) {
                        $grantStartingFreeplay = $parsedGrantStartingFreeplay;
                    }
                }
            }

            if ($username === '' || $phoneNumber === '' || $password === '') {
                Response::json(['message' => 'Username, phone number, and password are required'], 400);
                return;
            }
            if ($firstName === '' || $lastName === '') {
                Response::json(['message' => 'First name and last name are required'], 400);
                return;
            }

            $duplicateMatches = $this->findLikelyDuplicatePlayers([
                'firstName' => $firstName,
                'lastName' => $lastName,
                'fullName' => $fullName,
                'phoneNumber' => $phoneNumber,
                'email' => $email,
                'password' => $password,
            ]);
            if (count($duplicateMatches) > 0) {
                Response::json($this->buildDuplicatePlayerResponse($firstName, $lastName, $fullName, $phoneNumber, $email, $duplicateMatches), 409);
                return;
            }

            $actorRole = (string) ($actor['role'] ?? '');
            $assignedAgentId = (string) $actor['id'];
            if ($actorRole === 'admin') {
                $requested = trim((string) ($body['agentId'] ?? ''));
                if ($requested === '' || preg_match('/^[a-f0-9]{24}$/i', $requested) !== 1) {
                    Response::json(['message' => 'agentId is required for admin-created players.'], 400);
                    return;
                }
                $target = $this->db->findOne('agents', ['id' => MongoRepository::id($requested), 'role' => 'agent'], ['projection' => ['id' => 1]]);
                if ($target === null) {
                    Response::json(['message' => 'Players can only be assigned to regular Agents.'], 400);
                    return;
                }
                $assignedAgentId = $requested;
            } elseif (in_array($actorRole, ['master_agent', 'super_agent'], true)) {
                $requested = trim((string) ($body['agentId'] ?? ''));
                $assignableAgents = $this->listManagedPlayerAssignableAgentIds((string) ($actor['id'] ?? ''));
                if ($requested === '') {
                    $assignedAgentId = $assignableAgents[0] ?? '';
                    if ($assignedAgentId === '') {
                        Response::json(['message' => 'Create or select an Agent in your hierarchy before creating players.'], 400);
                        return;
                    }
                } else {
                    if (preg_match('/^[a-f0-9]{24}$/i', $requested) !== 1 || !in_array($requested, $assignableAgents, true)) {
                        Response::json(['message' => 'You can only create players for Agents in your hierarchy.'], 403);
                        return;
                    }
                    $assignedAgentId = $requested;
                }
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
                    'id' => MongoRepository::id($body['referredByUserId']),
                    'agentId' => MongoRepository::id($assignedAgentId),
                ], ['projection' => ['id' => 1, 'role' => 1]]);
                $refRole = strtolower(trim((string) ($ref['role'] ?? '')));
                if (
                    $ref === null
                    || in_array($refRole, ['admin', 'agent', 'master_agent', 'super_agent'], true)
                ) {
                    Response::json(['message' => 'Referrer must be one of your own players'], 400);
                    return;
                }
            }

            $generatedFullName = strtoupper($fullName !== '' ? $fullName : (($firstName . ' ' . $lastName) !== ' ' ? trim($firstName . ' ' . $lastName) : $username));
            $passwordFields = $this->passwordFields($password);
            $startingFreeplayAmount = $grantStartingFreeplay ? 200.0 : 0.0;
            $startingFreeplayExpiresAt = $startingFreeplayAmount > 0 ? time() + (30 * 24 * 3600) : null;
            $now = MongoRepository::nowUtc();

            $doc = [
                'username' => strtoupper($username),
                'phoneNumber' => $phoneNumber,
                'password' => $passwordFields['password'],
                'passwordCaseInsensitiveHash' => $passwordFields['passwordCaseInsensitiveHash'],
                'displayPassword' => $password,
                'firstName' => strtoupper($firstName),
                'lastName' => strtoupper($lastName),
                'fullName' => $generatedFullName,
                'role' => 'user',
                'status' => 'active',
                'balance' => 0.0,
                'minBet' => $this->safeNumber($body['minBet'] ?? null, $this->safeNumber($actor['defaultMinBet'] ?? null, 25)),
                'maxBet' => $this->safeNumber($body['maxBet'] ?? null, $this->safeNumber($actor['defaultMaxBet'] ?? null, 200)),
                'creditLimit' => $this->safeNumber($body['creditLimit'] ?? null, $this->safeNumber($actor['defaultCreditLimit'] ?? null, 1000)),
                'balanceOwed' => $this->safeNumber($body['balanceOwed'] ?? null, $this->safeNumber($actor['defaultSettleLimit'] ?? null, 0)),
                'freeplayBalance' => $startingFreeplayAmount,
                'freeplayExpiresAt' => $startingFreeplayExpiresAt,
                'maxFpCredit' => $this->safeNumber($body['maxFpCredit'] ?? null, 0), // 0 = uncapped
                'pendingBalance' => 0,
                'agentId' => MongoRepository::id($assignedAgentId),
                'createdBy' => MongoRepository::id((string) $actor['id']),
                'createdByModel' => 'Agent',
                'referredByUserId' => (isset($body['referredByUserId']) && is_string($body['referredByUserId']) && preg_match('/^[a-f0-9]{24}$/i', $body['referredByUserId']) === 1)
                    ? MongoRepository::id($body['referredByUserId'])
                    : null,
                'referralBonusGranted' => false,
                'referralBonusAmount' => 0,
                'apps' => is_array($body['apps'] ?? null) ? $body['apps'] : new stdClass(),
                'createdAt' => $now,
                'updatedAt' => $now,
            ];

            $this->db->beginTransaction();
            try {
                $id = $this->db->insertOne('users', $doc);
                if ($startingFreeplayAmount > 0) {
                    $this->db->insertOne('transactions', [
                        'userId' => MongoRepository::id($id),
                        'agentId' => MongoRepository::id($assignedAgentId),
                        'adminId' => (($actor['role'] ?? '') === 'admin' && isset($actor['id']))
                            ? MongoRepository::id((string) $actor['id'])
                            : null,
                        'amount' => $startingFreeplayAmount,
                        'type' => 'fp_deposit',
                        'status' => 'completed',
                        'isFreeplay' => true,
                        'balanceBefore' => 0.0,
                        'balanceAfter' => $startingFreeplayAmount,
                        'referenceType' => 'FreePlayBonus',
                        'reason' => 'NEW_PLAYER_FREEPLAY_BONUS',
                        'description' => 'Starting freeplay granted on player creation',
                        'createdAt' => $now,
                        'updatedAt' => $now,
                    ]);
                }
                $this->db->commit();
            } catch (Throwable $txErr) {
                $this->db->rollback();
                throw $txErr;
            }

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

            $users = $this->db->findMany('users', ['agentId' => MongoRepository::id((string) $actor['id'])]);
            $userIds = [];
            foreach ($users as $u) {
                if (isset($u['id']) && is_string($u['id']) && preg_match('/^[a-f0-9]{24}$/i', $u['id']) === 1) {
                    $userIds[] = MongoRepository::id($u['id']);
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

            // Build referrer map for referredBy display
            $referrerMap = [];
            $referrerIdSet = [];
            foreach ($users as $u) {
                $rid = (string) ($u['referredByUserId'] ?? '');
                if ($rid !== '' && preg_match('/^[a-f0-9]{24}$/i', $rid) === 1) {
                    $referrerIdSet[$rid] = true;
                }
            }
            if (count($referrerIdSet) > 0) {
                $referrerObjectIds = array_map(static fn (string $id): string => MongoRepository::id($id), array_keys($referrerIdSet));
                $referrers = $this->db->findMany('users', ['id' => ['$in' => $referrerObjectIds]], ['projection' => ['username' => 1, 'fullName' => 1, 'firstName' => 1, 'lastName' => 1]]);
                foreach ($referrers as $doc) {
                    $id = (string) ($doc['id'] ?? '');
                    if ($id !== '') {
                        $referrerMap[$id] = $doc;
                    }
                }
            }

            $formatted = [];
            foreach ($users as $user) {
                $balance = $this->num($user['balance'] ?? 0);
                $pendingBalance = $this->num($user['pendingBalance'] ?? 0);
                $uid = (string) ($user['id'] ?? '');
                $rid = isset($user['referredByUserId']) ? (string) $user['referredByUserId'] : '';
                $formatted[] = [
                    'id' => $uid,
                    'username' => $user['username'] ?? null,
                    'phoneNumber' => $user['phoneNumber'] ?? null,
                    'firstName' => $user['firstName'] ?? null,
                    'lastName' => $user['lastName'] ?? null,
                    'fullName' => $user['fullName'] ?? null,
                    'role' => $user['role'] ?? 'user',
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
                    'displayPassword' => (($user['displayPassword'] ?? '') !== '' ? $user['displayPassword'] : ($user['rawPassword'] ?? null)),
                    'referredByUserId' => isset($user['referredByUserId']) ? (string) $user['referredByUserId'] : null,
                    'referredByUsername' => $rid !== '' ? ($referrerMap[$rid]['username'] ?? null) : null,
                    'referredByFirstName' => $rid !== '' ? ($referrerMap[$rid]['firstName'] ?? null) : null,
                    'referredByLastName' => $rid !== '' ? ($referrerMap[$rid]['lastName'] ?? null) : null,
                    'referralBonusGranted' => (bool) ($user['referralBonusGranted'] ?? false),
                    'referralBonusAmount' => $this->safeNumber($user['referralBonusAmount'] ?? null, 0),
                    'settings' => $user['settings'] ?? null,
                    'agentId' => $user['agentId'] ?? null,
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

            $agentId = MongoRepository::id((string) $actor['id']);
            $totalUsers = $this->db->countDocuments('users', ['agentId' => $agentId]);
            $myUsers = $this->db->findMany('users', ['agentId' => $agentId], ['projection' => ['id' => 1]]);

            $userIds = [];
            foreach ($myUsers as $u) {
                if (isset($u['id']) && is_string($u['id']) && preg_match('/^[a-f0-9]{24}$/i', $u['id']) === 1) {
                    $userIds[] = MongoRepository::id($u['id']);
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

            $nextBalance = max(0, (float) $nextValue);
            $pendingBalance = 0.0;
            $this->db->beginTransaction();
            try {
                $user = $this->db->findOneForUpdate('users', ['id' => MongoRepository::id($userId)]);
                if ($user === null || (($user['role'] ?? 'user') !== 'user')) {
                    $this->db->rollback();
                    Response::json(['message' => 'Customer not found'], 404);
                    return;
                }

                if (($actor['role'] ?? '') === 'agent' && (string) ($user['agentId'] ?? '') !== (string) ($actor['id'] ?? '')) {
                    $this->db->rollback();
                    Response::json(['message' => 'Not authorized to update this customer'], 403);
                    return;
                }

                $now = MongoRepository::nowUtc();
                $balanceBefore = $this->num($user['balance'] ?? 0);
                $pendingBalance = $this->num($user['pendingBalance'] ?? 0);

                $this->db->updateOne('users', ['id' => MongoRepository::id($userId)], [
                    'balance' => $nextBalance,
                    'updatedAt' => $now,
                ]);

                $this->db->insertOne('transactions', [
                    'userId' => MongoRepository::id($userId),
                    'agentId' => MongoRepository::id((string) $actor['id']),
                    'amount' => abs($nextBalance - $balanceBefore),
                    'type' => 'adjustment',
                    'status' => 'completed',
                    'balanceBefore' => $balanceBefore,
                    'balanceAfter' => $nextBalance,
                    'referenceType' => 'Adjustment',
                    'reason' => 'AGENT_BALANCE_ADJUSTMENT',
                    'description' => 'Agent updated user balance',
                    'createdAt' => $now,
                    'updatedAt' => $now,
                ]);

                $this->db->commit();
            } catch (Throwable $txErr) {
                $this->db->rollback();
                throw $txErr;
            }

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

            $user = $this->db->findOne('users', ['id' => MongoRepository::id($id)]);
            if ($user === null || (($user['role'] ?? 'user') !== 'user')) {
                Response::json(['message' => 'Customer not found'], 404);
                return;
            }

            if ((string) ($user['agentId'] ?? '') !== (string) ($actor['id'] ?? '')) {
                Response::json(['message' => 'Not authorized to update this customer'], 403);
                return;
            }

            $body = Http::jsonBody();
            $updates = ['updatedAt' => MongoRepository::nowUtc()];
            $allowDuplicateRaw = $body['allowDuplicateSave'] ?? ($body['allowDuplicate'] ?? false);
            $allowDuplicateSave = is_bool($allowDuplicateRaw)
                ? $allowDuplicateRaw
                : filter_var((string) $allowDuplicateRaw, FILTER_VALIDATE_BOOLEAN);
            $duplicateWarningPayload = null;
            $incomingFirstName = array_key_exists('firstName', $body) ? strtoupper(trim((string) $body['firstName'])) : strtoupper(trim((string) ($user['firstName'] ?? '')));
            $incomingLastName = array_key_exists('lastName', $body) ? strtoupper(trim((string) $body['lastName'])) : strtoupper(trim((string) ($user['lastName'] ?? '')));
            $incomingPhoneNumber = array_key_exists('phoneNumber', $body) ? trim((string) $body['phoneNumber']) : trim((string) ($user['phoneNumber'] ?? ''));
            $incomingEmail = array_key_exists('email', $body) ? trim((string) $body['email']) : trim((string) ($user['email'] ?? ''));

            $providedFullName = array_key_exists('fullName', $body) ? trim((string) $body['fullName']) : '';
            if ($providedFullName !== '') {
                $incomingFullName = strtoupper($providedFullName);
            } elseif (array_key_exists('firstName', $body) || array_key_exists('lastName', $body)) {
                $incomingFullName = strtoupper(trim($incomingFirstName . ' ' . $incomingLastName));
            } else {
                $incomingFullName = strtoupper(trim((string) ($user['fullName'] ?? '')));
                if ($incomingFullName === '') {
                    $incomingFullName = strtoupper(trim($incomingFirstName . ' ' . $incomingLastName));
                }
            }

            $identityTouched = array_key_exists('firstName', $body)
                || array_key_exists('lastName', $body)
                || array_key_exists('phoneNumber', $body)
                || array_key_exists('fullName', $body);
            $generatedIdentityPassword = $this->generateIdentityPassword(
                $incomingFirstName,
                $incomingLastName,
                $incomingPhoneNumber,
                (string) ($user['username'] ?? '')
            );
            $manualPassword = isset($body['password']) && is_string($body['password']) && trim((string) $body['password']) !== ''
                ? strtoupper(trim((string) $body['password']))
                : '';
            $duplicatePasswordProbe = $generatedIdentityPassword !== '' ? $generatedIdentityPassword : $manualPassword;

            if ($identityTouched || $duplicatePasswordProbe !== '') {
                $duplicatePayload = $identityTouched
                    ? [
                        'firstName' => $incomingFirstName,
                        'lastName' => $incomingLastName,
                        'fullName' => $incomingFullName,
                        'phoneNumber' => $incomingPhoneNumber,
                        'email' => $incomingEmail,
                        'password' => $duplicatePasswordProbe,
                    ]
                    : [
                        'password' => $duplicatePasswordProbe,
                    ];
                $duplicateMatches = $this->findLikelyDuplicatePlayers($duplicatePayload);
                $duplicateMatches = array_values(array_filter($duplicateMatches, static function (array $match) use ($id): bool {
                    return (string) ($match['id'] ?? '') !== $id;
                }));
                if (count($duplicateMatches) > 0) {
                    $duplicateWarningPayload = $this->buildDuplicatePlayerResponse(
                        $incomingFirstName,
                        $incomingLastName,
                        $incomingFullName,
                        $incomingPhoneNumber,
                        $incomingEmail,
                        $duplicateMatches
                    );
                    if (!$allowDuplicateSave) {
                        Response::json($duplicateWarningPayload, 409);
                        return;
                    }
                }
            }

            if (isset($body['phoneNumber']) && is_string($body['phoneNumber']) && $body['phoneNumber'] !== ($user['phoneNumber'] ?? null)) {
                $existingPhone = $this->db->findOne('users', ['phoneNumber' => $body['phoneNumber']]);
                if ($existingPhone !== null && (string) ($existingPhone['id'] ?? '') !== $id) {
                    if (!$allowDuplicateSave) {
                        Response::json(['message' => 'Phone number already exists'], 409);
                        return;
                    }
                }
                $updates['phoneNumber'] = $body['phoneNumber'];
            }

            if ($identityTouched && $generatedIdentityPassword !== '') {
                $nextPassword = $generatedIdentityPassword;
                $passwordFields = $this->passwordFields($nextPassword);
                $updates['password'] = $passwordFields['password'];
                $updates['passwordCaseInsensitiveHash'] = $passwordFields['passwordCaseInsensitiveHash'];
                $updates['displayPassword'] = $nextPassword;
            } elseif (isset($body['password']) && is_string($body['password']) && $body['password'] !== '') {
                $nextPassword = strtoupper(trim((string) $body['password']));
                $passwordFields = $this->passwordFields($nextPassword);
                $updates['password'] = $passwordFields['password'];
                $updates['passwordCaseInsensitiveHash'] = $passwordFields['passwordCaseInsensitiveHash'];
                $updates['displayPassword'] = $nextPassword;
            }

            if (isset($body['firstName'])) {
                $updates['firstName'] = strtoupper(trim((string) $body['firstName']));
            }
            if (isset($body['lastName'])) {
                $updates['lastName'] = strtoupper(trim((string) $body['lastName']));
            }
            if (isset($body['fullName']) && trim((string) $body['fullName']) !== '') {
                $updates['fullName'] = strtoupper(trim((string) $body['fullName']));
            } elseif (isset($body['firstName']) || isset($body['lastName'])) {
                $fName = strtoupper((string) ($body['firstName'] ?? ($user['firstName'] ?? '')));
                $lName = strtoupper((string) ($body['lastName'] ?? ($user['lastName'] ?? '')));
                $updates['fullName'] = strtoupper(trim($fName . ' ' . $lName));
            }

            foreach (['minBet', 'maxBet', 'creditLimit', 'balanceOwed', 'status'] as $field) {
                if (array_key_exists($field, $body)) {
                    $updates[$field] = $body[$field];
                }
            }
            // freeplayBalance update: also set/reset expiry (default 30 days)
            if (array_key_exists('freeplayBalance', $body)) {
                $newFp = max(0.0, (float) $body['freeplayBalance']);
                $updates['freeplayBalance'] = $newFp;
                if ($newFp > 0) {
                    $expiresAtRaw = $body['freeplayExpiresAt'] ?? null;
                    if ($expiresAtRaw !== null) {
                        $parsed = is_numeric($expiresAtRaw) ? (int) $expiresAtRaw : strtotime((string) $expiresAtRaw);
                        $updates['freeplayExpiresAt'] = ($parsed !== false && $parsed > time()) ? $parsed : time() + (30 * 24 * 3600);
                    } else {
                        $updates['freeplayExpiresAt'] = time() + (30 * 24 * 3600);
                    }
                } else {
                    $updates['freeplayExpiresAt'] = null;
                }
            }

            if (array_key_exists('apps', $body) && is_array($body['apps'])) {
                $existingApps = is_array($user['apps'] ?? null) ? $user['apps'] : [];
                $updates['apps'] = array_merge($existingApps, $body['apps']);
            }

            $this->db->updateOne('users', ['id' => MongoRepository::id($id)], $updates);
            $updated = $this->db->findOne('users', ['id' => MongoRepository::id($id)]);

            $response = ['message' => 'Customer updated successfully', 'user' => $updated];
            if (is_array($duplicateWarningPayload)) {
                $response['duplicateWarning'] = $duplicateWarningPayload;
                $response['savedWithDuplicateWarning'] = true;
            }
            Response::json($response);
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

            $rawAgents = $this->db->findMany('agents', [
                'createdBy' => MongoRepository::id((string) $actor['id']),
                'createdByModel' => 'Agent',
            ], ['sort' => ['createdAt' => -1]]);

            $agents = [];
            foreach ($rawAgents as $a) {
                $agents[] = [
                    'id'            => (string) ($a['id'] ?? ''),
                    'username'      => $a['username'] ?? null,
                    'phoneNumber'   => $a['phoneNumber'] ?? null,
                    'fullName'      => $a['fullName'] ?? null,
                    'role'          => $a['role'] ?? null,
                    'status'        => $a['status'] ?? null,
                    'balance'       => $this->num($a['balance'] ?? 0),
                    'agentPercent'  => isset($a['agentPercent']) ? (float) $a['agentPercent'] : null,
                    'playerRate'    => isset($a['playerRate']) ? (float) $a['playerRate'] : null,
                    'parentAgentId' => isset($a['createdBy']) ? (string) $a['createdBy'] : null,
                    'createdAt'     => $a['createdAt'] ?? null,
                ];
            }

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
            $password = strtoupper(trim((string) ($body['password'] ?? '')));
            $firstName = trim((string) ($body['firstName'] ?? ''));
            $lastName = trim((string) ($body['lastName'] ?? ''));
            $parentAgentId = trim((string) ($body['parentAgentId'] ?? $body['agentId'] ?? ''));
            $referredByUserId = trim((string) ($body['referredByUserId'] ?? ''));
            if ($username === '' || $phoneNumber === '' || $password === '') {
                Response::json(['message' => 'Username, phone number, and password are required'], 400);
                return;
            }

            $resolvedParentAgentId = (string) ($actor['id'] ?? '');
            if ($parentAgentId !== '') {
                if (preg_match('/^[a-f0-9]{24}$/i', $parentAgentId) !== 1) {
                    Response::json(['message' => 'Invalid parentAgentId'], 400);
                    return;
                }

                $managedAgentIds = $this->listManagedAgentIds((string) ($actor['id'] ?? ''));
                if (!in_array($parentAgentId, $managedAgentIds, true)) {
                    Response::json(['message' => 'You can only create sub-agents under master agents in your hierarchy'], 403);
                    return;
                }

                $parentAgent = $this->db->findOne('agents', ['id' => MongoRepository::id($parentAgentId)], ['projection' => ['role' => 1]]);
                if ($parentAgent === null || !in_array((string) ($parentAgent['role'] ?? ''), ['master_agent', 'super_agent'], true)) {
                    Response::json(['message' => 'parentAgentId must reference a valid Master Agent'], 400);
                    return;
                }

                $resolvedParentAgentId = $parentAgentId;
            }

            $requestedRole = ((string) ($body['role'] ?? '') === 'master_agent') ? 'master_agent' : 'agent';

            // All master agents get MA suffix on their username
            if ($requestedRole === 'master_agent') {
                $upperUsername = strtoupper($username);
                if (!str_ends_with($upperUsername, 'MA')) {
                    $username = $upperUsername . 'MA';
                }
            }

            // Check for existing agent with same identity AND same role — reassign if found.
            $existing = $this->findExistingAgentByIdentity($username, $phoneNumber, $requestedRole);
            if ($existing !== null) {
                $existingId = (string) $existing['id'];
                $this->db->updateOne('agents', ['id' => MongoRepository::id($existingId)], [
                    'createdBy'      => MongoRepository::id($resolvedParentAgentId),
                    'createdByModel' => 'Agent',
                    'updatedAt'      => MongoRepository::nowUtc(),
                ]);
                if ($requestedRole === 'master_agent') {
                    $updated = $this->db->findOne('agents', ['id' => MongoRepository::id($existingId)]);
                    if ($updated !== null) {
                        $this->syncMasterAgentCollection($updated);
                    }
                }
                Response::json([
                    'message'  => 'Agent assigned successfully',
                    'assigned' => true,
                    'agent'    => [
                        'id'          => $existingId,
                        'username'    => (string) ($existing['username'] ?? ''),
                        'phoneNumber' => (string) ($existing['phoneNumber'] ?? ''),
                        'fullName'    => (string) ($existing['fullName'] ?? ''),
                        'role'        => $requestedRole,
                        'status'      => (string) ($existing['status'] ?? 'active'),
                        'createdAt'   => gmdate(DATE_ATOM),
                    ],
                ], 200);
                return;
            }

            $role = $requestedRole;
            $fullName = trim((string) ($body['fullName'] ?? ''));
            if ($fullName === '' && ($firstName !== '' || $lastName !== '')) {
                $fullName = trim($firstName . ' ' . $lastName);
            }
            $fullName = strtoupper($fullName !== '' ? $fullName : $username);

            // Commission fields (optional, validated 0-100)
            $agentPercent = null;
            if (isset($body['agentPercent']) && is_numeric($body['agentPercent'])) {
                $pct = (float) $body['agentPercent'];
                if ($pct < 0 || $pct > 100) {
                    Response::json(['message' => 'agentPercent must be between 0 and 100'], 400);
                    return;
                }
                $agentPercent = round($pct, 4);
            }
            $playerRate = null;
            if (isset($body['playerRate']) && is_numeric($body['playerRate'])) {
                $rate = (float) $body['playerRate'];
                if ($rate < 0) {
                    Response::json(['message' => 'playerRate cannot be negative'], 400);
                    return;
                }
                $playerRate = round($rate, 2);
            }

            $referrerObjectId = null;
            if ($referredByUserId !== '') {
                if (preg_match('/^[a-f0-9]{24}$/i', $referredByUserId) !== 1) {
                    Response::json(['message' => 'Invalid referredByUserId'], 400);
                    return;
                }
                $ref = $this->db->findOne('users', ['id' => MongoRepository::id($referredByUserId)]);
                $refRole = strtolower(trim((string) ($ref['role'] ?? '')));
                if (
                    $ref === null
                    || in_array($refRole, ['admin', 'agent', 'master_agent', 'super_agent'], true)
                ) {
                    Response::json(['message' => 'Invalid referredByUserId'], 400);
                    return;
                }
                $referrerObjectId = MongoRepository::id($referredByUserId);
            }

            $passwordFields = $this->passwordFields($password);
            $doc = [
                'username' => strtoupper($username),
                'phoneNumber' => $phoneNumber,
                'password' => $passwordFields['password'],
                'passwordCaseInsensitiveHash' => $passwordFields['passwordCaseInsensitiveHash'],
                'displayPassword' => $password,
                'firstName' => strtoupper($firstName),
                'lastName' => strtoupper($lastName),
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
                'createdBy' => MongoRepository::id($resolvedParentAgentId),
                'createdByModel' => 'Agent',
                'referredByUserId' => $referrerObjectId,
                'agentPercent' => $agentPercent,
                'playerRate' => $playerRate,
                'createdAt' => MongoRepository::nowUtc(),
                'updatedAt' => MongoRepository::nowUtc(),
            ];

            $id = $this->db->insertOne('agents', $doc);
            if ($role === 'master_agent') {
                $this->syncMasterAgentCollection(array_merge($doc, ['id' => $id]));
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

            $agent = $this->db->findOne('agents', ['id' => MongoRepository::id($id)]);
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

            $this->db->updateOne('agents', ['id' => MongoRepository::id($id)], $updates);
            $updated = $this->db->findOne('agents', ['id' => MongoRepository::id($id)]);

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
        $id = (string) ($agent['id'] ?? '');
        if ($id === '' || preg_match('/^[a-f0-9]{24}$/i', $id) !== 1) {
            return;
        }

        $payload = [
            'agentId' => MongoRepository::id($id),
            'username' => strtoupper((string) ($agent['username'] ?? '')),
            'fullName' => (string) ($agent['fullName'] ?? ''),
            'phoneNumber' => (string) ($agent['phoneNumber'] ?? ''),
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
        $actor = $this->db->findOne($collection, ['id' => MongoRepository::id($id)]);
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

    /**
     * @return array<int,string>
     */
    private function listManagedAgentIds(string $rootAgentId): array
    {
        if ($rootAgentId === '' || preg_match('/^[a-f0-9]{24}$/i', $rootAgentId) !== 1) {
            return [];
        }

        $seen = [];
        $queue = [$rootAgentId];

        while (count($queue) > 0) {
            $currentId = array_shift($queue);
            if (!is_string($currentId) || $currentId === '' || isset($seen[$currentId])) {
                continue;
            }

            $seen[$currentId] = true;
            $children = $this->db->findMany('agents', [
                'createdBy' => MongoRepository::id($currentId),
                'createdByModel' => 'Agent',
            ], ['projection' => ['id' => 1]]);

            foreach ($children as $child) {
                $childId = (string) ($child['id'] ?? '');
                if ($childId !== '' && !isset($seen[$childId])) {
                    $queue[] = $childId;
                }
            }
        }

        return array_keys($seen);
    }

    /**
     * @return array<int,string>
     */
    private function listManagedPlayerAssignableAgentIds(string $masterAgentId): array
    {
        if ($masterAgentId === '' || preg_match('/^[a-f0-9]{24}$/i', $masterAgentId) !== 1) {
            return [];
        }

        $managedAgentIds = $this->listManagedAgentIds($masterAgentId);
        if (count($managedAgentIds) === 0) {
            return [];
        }

        $managedObjectIds = array_map(static fn (string $id): string => MongoRepository::id($id), $managedAgentIds);
        $agents = $this->db->findMany('agents', [
            'id' => ['$in' => $managedObjectIds],
            'role' => 'agent',
        ], ['projection' => ['id' => 1], 'sort' => ['username' => 1]]);

        $ids = [];
        foreach ($agents as $agent) {
            $id = (string) ($agent['id'] ?? '');
            if ($id !== '' && preg_match('/^[a-f0-9]{24}$/i', $id) === 1) {
                $ids[] = $id;
            }
        }

        return $ids;
    }

    private function normalizeDuplicateText(string $value): string
    {
        $trimmed = trim($value);
        if ($trimmed === '') {
            return '';
        }
        $collapsed = preg_replace('/\s+/', ' ', $trimmed);
        if (!is_string($collapsed)) {
            $collapsed = $trimmed;
        }
        return strtolower(trim($collapsed));
    }

    private function normalizeDuplicatePhone(string $value): string
    {
        $digits = preg_replace('/\D+/', '', $value);
        if (!is_string($digits) || $digits === '') {
            return '';
        }
        if (strlen($digits) > 10) {
            return substr($digits, -10);
        }
        return $digits;
    }

    private function normalizeDuplicateEmail(string $value): string
    {
        return $this->normalizeDuplicateText($value);
    }

    private function normalizeDuplicatePassword(string $value): string
    {
        return strtoupper(trim($value));
    }

    private function normalizedFullNameForDuplicate(array $payload): string
    {
        $fullName = $this->normalizeDuplicateText((string) ($payload['fullName'] ?? ''));
        if ($fullName !== '') {
            return $fullName;
        }

        $first = $this->normalizeDuplicateText((string) ($payload['firstName'] ?? ''));
        $last = $this->normalizeDuplicateText((string) ($payload['lastName'] ?? ''));
        return $this->normalizeDuplicateText(trim($first . ' ' . $last));
    }

    /**
     * @return array<int,array<string,mixed>>
     */
    private function findLikelyDuplicatePlayers(array $payload): array
    {
        $normalizedName = $this->normalizedFullNameForDuplicate($payload);
        $normalizedPhone = $this->normalizeDuplicatePhone((string) ($payload['phoneNumber'] ?? ''));
        $normalizedEmail = $this->normalizeDuplicateEmail((string) ($payload['email'] ?? ''));
        $normalizedPassword = $this->normalizeDuplicatePassword((string) ($payload['password'] ?? ''));

        if ($normalizedName === '' && $normalizedPhone === '' && $normalizedEmail === '' && $normalizedPassword === '') {
            return [];
        }

        $candidateQuery = ['role' => 'user'];
        $or = [];
        if ($normalizedPhone !== '') {
            $digits = preg_split('//', $normalizedPhone, -1, PREG_SPLIT_NO_EMPTY);
            $digitPattern = implode('\D*', $digits ?: []);
            if ($digitPattern !== '') {
                $or[] = ['phoneNumber' => ['$regex' => $digitPattern, '$options' => 'i']];
            }
        }
        if ($normalizedEmail !== '') {
            $or[] = ['email' => ['$regex' => '^' . preg_quote($normalizedEmail, '/') . '$', '$options' => 'i']];
        }
        if ($normalizedName !== '') {
            $namePattern = '^' . str_replace('\ ', '\s+', preg_quote($normalizedName, '/')) . '$';
            $or[] = ['fullName' => ['$regex' => $namePattern, '$options' => 'i']];
        }
        if ($normalizedPassword !== '') {
            $or[] = ['displayPassword' => ['$regex' => '^' . preg_quote($normalizedPassword, '/') . '$', '$options' => 'i']];
        }
        if (count($or) > 0) {
            $candidateQuery['$or'] = $or;
        }

        $candidates = $this->db->findMany('users', $candidateQuery, [
            'projection' => [
                'id' => 1,
                'username' => 1,
                'firstName' => 1,
                'lastName' => 1,
                'fullName' => 1,
                'phoneNumber' => 1,
                'email' => 1,
                'displayPassword' => 1,
                'agentId' => 1,
                'status' => 1,
            ],
            'sort' => ['createdAt' => -1],
        ]);

        if (count($candidates) === 0) {
            return [];
        }

        $agentIds = [];
        foreach ($candidates as $candidate) {
            $agentId = (string) ($candidate['agentId'] ?? '');
            if ($agentId !== '' && preg_match('/^[a-f0-9]{24}$/i', $agentId) === 1) {
                $agentIds[$agentId] = true;
            }
        }
        $agentMap = [];
        if (count($agentIds) > 0) {
            $agentDocs = $this->db->findMany('agents', [
                'id' => ['$in' => array_map(static fn (string $id): string => MongoRepository::id($id), array_keys($agentIds))],
            ], ['projection' => ['id' => 1, 'username' => 1]]);
            foreach ($agentDocs as $agentDoc) {
                $agentDocId = (string) ($agentDoc['id'] ?? '');
                if ($agentDocId !== '') {
                    $agentMap[$agentDocId] = strtoupper(trim((string) ($agentDoc['username'] ?? '')));
                }
            }
        }

        $matches = [];
        foreach ($candidates as $candidate) {
            $existingName = $this->normalizedFullNameForDuplicate($candidate);
            $existingPhone = $this->normalizeDuplicatePhone((string) ($candidate['phoneNumber'] ?? ''));
            $existingEmail = $this->normalizeDuplicateEmail((string) ($candidate['email'] ?? ''));
            $existingPassword = $this->normalizeDuplicatePassword((string) ($candidate['displayPassword'] ?? ''));

            $matchedByPhone = $normalizedPhone !== '' && $existingPhone !== '' && $normalizedPhone === $existingPhone;
            $matchedByEmail = $normalizedEmail !== '' && $existingEmail !== '' && $normalizedEmail === $existingEmail;
            $matchedByName = $normalizedName !== '' && $existingName !== '' && $normalizedName === $existingName;
            $matchedByPassword = $normalizedPassword !== '' && $existingPassword !== '' && $normalizedPassword === $existingPassword;

            if (!$matchedByPhone && !$matchedByEmail && !$matchedByName && !$matchedByPassword) {
                continue;
            }

            $inputHasContact = $normalizedPhone !== '' || $normalizedEmail !== '';
            $existingHasContact = $existingPhone !== '' || $existingEmail !== '';
            if (!$matchedByPhone && !$matchedByEmail && !$matchedByPassword && $matchedByName && $inputHasContact && $existingHasContact) {
                continue;
            }

            $reasonList = [];
            if ($matchedByPhone) {
                $reasonList[] = 'phone';
            }
            if ($matchedByEmail) {
                $reasonList[] = 'email';
            }
            if ($matchedByName) {
                $reasonList[] = 'name';
            }
            if ($matchedByPassword) {
                $reasonList[] = 'password';
            }

            $groupKeySource = $matchedByPhone
                ? 'phone:' . $existingPhone
                : ($matchedByEmail ? 'email:' . $existingEmail : ($matchedByPassword ? 'password' : 'name:' . $existingName));

            $candidateId = (string) ($candidate['id'] ?? '');
            $displayFullName = trim((string) ($candidate['fullName'] ?? ''));
            if ($displayFullName === '') {
                $displayFullName = trim((string) ($candidate['firstName'] ?? '') . ' ' . (string) ($candidate['lastName'] ?? ''));
            }
            $agentId = (string) ($candidate['agentId'] ?? '');
            if ($agentId === '' || preg_match('/^[a-f0-9]{24}$/i', $agentId) !== 1) {
                $agentId = '';
            }

            $matches[] = [
                'id' => $candidateId,
                'username' => strtoupper(trim((string) ($candidate['username'] ?? ''))),
                'fullName' => $displayFullName !== '' ? strtoupper($displayFullName) : null,
                'phoneNumber' => trim((string) ($candidate['phoneNumber'] ?? '')) ?: null,
                'email' => trim((string) ($candidate['email'] ?? '')) ?: null,
                'status' => (string) ($candidate['status'] ?? ''),
                'agentId' => $agentId !== '' ? $agentId : null,
                'agentUsername' => $agentId !== '' ? ($agentMap[$agentId] ?? null) : null,
                'matchReasons' => $reasonList,
                'duplicateGroupKey' => $groupKeySource,
            ];
        }

        usort($matches, static function (array $a, array $b): int {
            return strcasecmp((string) ($a['username'] ?? ''), (string) ($b['username'] ?? ''));
        });

        return $matches;
    }

    /**
     * @param array<int,array<string,mixed>> $matches
     */
    private function buildDuplicatePlayerResponse(string $firstName, string $lastName, string $fullName, string $phoneNumber, string $email, array $matches): array
    {
        $normalizedName = $this->normalizeDuplicateText($fullName);
        if ($normalizedName === '') {
            $normalizedName = $this->normalizeDuplicateText(trim($firstName . ' ' . $lastName));
        }
        $normalizedPhone = $this->normalizeDuplicatePhone($phoneNumber);
        $normalizedEmail = $this->normalizeDuplicateEmail($email);

        return [
            'duplicate' => true,
            'code' => 'DUPLICATE_PLAYER',
            'message' => 'Likely duplicate player detected. Review existing accounts before creating a new one.',
            'matchCount' => count($matches),
            'normalized' => [
                'name' => $normalizedName !== '' ? $normalizedName : null,
                'phone' => $normalizedPhone !== '' ? $normalizedPhone : null,
                'email' => $normalizedEmail !== '' ? $normalizedEmail : null,
            ],
            'matches' => $matches,
        ];
    }

    private function existsUsernameOrPhone(string $username, string $phoneNumber): bool
    {
        $normalizedUsername = trim($username);
        $or = [['phoneNumber' => $phoneNumber]];
        if ($normalizedUsername !== '') {
            $or[] = ['username' => strtoupper($normalizedUsername)];
            $or[] = ['username' => strtolower($normalizedUsername)];
            $or[] = ['username' => ['$regex' => '^' . preg_quote($normalizedUsername, '/') . '$', '$options' => 'i']];
        }
        $query = ['$or' => $or];
        return $this->db->findOne('users', $query) !== null
            || $this->db->findOne('admins', $query) !== null
            || $this->db->findOne('agents', $query) !== null;
    }

    private function findExistingAgentByIdentity(string $username, string $phoneNumber, string $role = ''): ?array
    {
        $normalizedUsername = trim($username);
        $or = [];

        if ($phoneNumber !== '') {
            $or[] = ['phoneNumber' => $phoneNumber];
        }
        if ($normalizedUsername !== '') {
            $or[] = ['username' => strtoupper($normalizedUsername)];
            $or[] = ['username' => strtolower($normalizedUsername)];
            $or[] = ['username' => ['$regex' => '^' . preg_quote($normalizedUsername, '/') . '$', '$options' => 'i']];
        }
        if (count($or) === 0) {
            return null;
        }

        $query = ['$or' => $or];
        if ($role !== '') {
            $query['role'] = $role;
        }

        return $this->db->findOne('agents', $query);
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

    private function generateIdentityPassword(string $firstName, string $lastName, string $phoneNumber, string $fallbackUsername = ''): string
    {
        $cleanFirst = preg_replace('/[^A-Z0-9]/', '', strtoupper(trim($firstName)));
        $cleanLast = preg_replace('/[^A-Z0-9]/', '', strtoupper(trim($lastName)));
        $digits = preg_replace('/\D+/', '', $phoneNumber);

        if (!is_string($digits) || $digits === '') {
            return '';
        }

        $last4 = substr($digits, -4);
        if ($last4 === '') {
            return '';
        }

        if (is_string($cleanFirst) && $cleanFirst !== '' && is_string($cleanLast) && $cleanLast !== '') {
            return strtoupper(substr($cleanFirst, 0, 3) . substr($cleanLast, 0, 3) . $last4);
        }

        $fallback = preg_replace('/[^A-Z0-9]/', '', strtoupper(trim($fallbackUsername)));
        if (is_string($fallback) && $fallback !== '') {
            return strtoupper(substr($fallback, 0, 6) . $last4);
        }

        return '';
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
