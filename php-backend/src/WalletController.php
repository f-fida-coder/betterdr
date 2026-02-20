<?php

declare(strict_types=1);

use MongoDB\BSON\ObjectId;

final class WalletController
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
        if (($path === '/api/wallet/balance' || $path === '/api/wallet') && $method === 'GET') {
            $this->getBalance();
            return true;
        }
        if ($path === '/api/wallet/transactions' && $method === 'GET') {
            $this->getTransactions();
            return true;
        }
        if ($path === '/api/wallet/request-deposit' && $method === 'POST') {
            $this->requestDeposit();
            return true;
        }
        if ($path === '/api/wallet/request-withdrawal' && $method === 'POST') {
            $this->requestWithdrawal();
            return true;
        }
        if ($path === '/api/wallet/deposit' && $method === 'POST') {
            $this->depositDisabled();
            return true;
        }

        return false;
    }

    private function getBalance(): void
    {
        try {
            $actor = $this->protect();
            if ($actor === null) {
                return;
            }

            $user = $this->db->findOne('users', ['_id' => new ObjectId((string) $actor['_id'])]);
            if ($user === null) {
                Response::json(['message' => 'User not found'], 404);
                return;
            }

            $balance = $this->num($user['balance'] ?? 0);
            $pendingBalance = $this->num($user['pendingBalance'] ?? 0);
            $availableBalance = max(0, $balance - $pendingBalance);

            Response::json([
                'balance' => $balance,
                'pendingBalance' => $pendingBalance,
                'availableBalance' => $availableBalance,
                'totalWinnings' => $user['totalWinnings'] ?? 0,
            ]);
        } catch (Throwable $e) {
            Response::json(['message' => 'Server error', 'error' => $e->getMessage()], 500);
        }
    }

    private function getTransactions(): void
    {
        try {
            $actor = $this->protect();
            if ($actor === null) {
                return;
            }

            $limitRaw = isset($_GET['limit']) ? (int) $_GET['limit'] : 50;
            $limit = min(200, max(1, $limitRaw > 0 ? $limitRaw : 50));
            $type = isset($_GET['type']) ? strtolower(trim((string) $_GET['type'])) : '';
            $status = isset($_GET['status']) ? strtolower(trim((string) $_GET['status'])) : '';

            $query = ['userId' => new ObjectId((string) $actor['_id'])];
            if ($type !== '') {
                $query['type'] = $type;
            }
            if ($status !== '') {
                $query['status'] = $status;
            }

            $transactions = $this->db->findMany('transactions', $query, [
                'sort' => ['createdAt' => -1],
                'limit' => $limit,
            ]);

            $formatted = array_map(function (array $tx): array {
                return [
                    'id' => $tx['_id'] ?? null,
                    'amount' => $this->num($tx['amount'] ?? 0),
                    'type' => $tx['type'] ?? null,
                    'status' => $tx['status'] ?? null,
                    'description' => $tx['description'] ?? null,
                    'reason' => $tx['reason'] ?? null,
                    'balanceBefore' => array_key_exists('balanceBefore', $tx) && $tx['balanceBefore'] !== null ? $this->num($tx['balanceBefore']) : null,
                    'balanceAfter' => array_key_exists('balanceAfter', $tx) && $tx['balanceAfter'] !== null ? $this->num($tx['balanceAfter']) : null,
                    'createdAt' => $tx['createdAt'] ?? null,
                ];
            }, $transactions);

            Response::json(['transactions' => $formatted]);
        } catch (Throwable $e) {
            Response::json(['message' => 'Server error', 'error' => $e->getMessage()], 500);
        }
    }

    private function requestDeposit(): void
    {
        try {
            $actor = $this->protect();
            if ($actor === null) {
                return;
            }

            $body = Http::jsonBody();
            $amount = $this->parseAmount($body['amount'] ?? 0);
            $method = strtolower(trim((string) ($body['method'] ?? 'manual')));

            if ($amount < 10 || $amount > 100000) {
                Response::json(['message' => 'Deposit amount must be between $10 and $100,000'], 400);
                return;
            }

            $now = MongoRepository::nowUtc();
            $doc = [
                'userId' => new ObjectId((string) $actor['_id']),
                'agentId' => $this->toOptionalObjectId($actor['agentId'] ?? null),
                'amount' => $amount,
                'type' => 'deposit',
                'status' => 'pending',
                'reason' => 'USER_DEPOSIT_REQUEST',
                'referenceType' => 'Adjustment',
                'description' => 'Deposit request via ' . $method,
                'createdAt' => $now,
                'updatedAt' => $now,
            ];

            $transactionId = $this->db->insertOne('transactions', $doc);
            Response::json([
                'message' => 'Deposit request submitted successfully. Your agent/admin will review it.',
                'transactionId' => $transactionId,
            ], 201);
        } catch (Throwable $e) {
            Response::json(['message' => 'Server error', 'error' => $e->getMessage()], 500);
        }
    }

    private function requestWithdrawal(): void
    {
        try {
            $actor = $this->protect();
            if ($actor === null) {
                return;
            }

            $body = Http::jsonBody();
            $amount = $this->parseAmount($body['amount'] ?? 0);
            $method = strtolower(trim((string) ($body['method'] ?? 'manual')));

            $user = $this->db->findOne('users', ['_id' => new ObjectId((string) $actor['_id'])]);
            if ($user === null) {
                Response::json(['message' => 'User not found'], 404);
                return;
            }

            if ($amount < 20 || $amount > 100000) {
                Response::json(['message' => 'Withdrawal amount must be between $20 and $100,000'], 400);
                return;
            }

            $balance = $this->num($user['balance'] ?? 0);
            if ($balance < $amount) {
                Response::json(['message' => 'Insufficient balance for withdrawal request'], 400);
                return;
            }

            $now = MongoRepository::nowUtc();
            $doc = [
                'userId' => new ObjectId((string) $actor['_id']),
                'agentId' => $this->toOptionalObjectId($actor['agentId'] ?? null),
                'amount' => $amount,
                'type' => 'withdrawal',
                'status' => 'pending',
                'reason' => 'USER_WITHDRAWAL_REQUEST',
                'referenceType' => 'Adjustment',
                'description' => 'Withdrawal request via ' . $method,
                'createdAt' => $now,
                'updatedAt' => $now,
            ];

            $transactionId = $this->db->insertOne('transactions', $doc);
            Response::json([
                'message' => 'Withdrawal request submitted successfully. Processing is pending approval.',
                'transactionId' => $transactionId,
            ], 201);
        } catch (Throwable $e) {
            Response::json(['message' => 'Server error', 'error' => $e->getMessage()], 500);
        }
    }

    private function depositDisabled(): void
    {
        Response::json(['message' => 'Deposits are disabled. Customers use credit only.'], 403);
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
        $actor = $this->db->findOne($collection, ['_id' => new ObjectId($id)]);
        if ($actor === null) {
            Response::json(['message' => 'Not authorized, user not found'], 403);
            return null;
        }

        if (($actor['status'] ?? '') === 'suspended') {
            Response::json(['message' => 'Not authorized, account suspended'], 403);
            return null;
        }

        $ipBlockingEnabled = strtolower((string) Env::get('IP_BLOCKING_ENABLED', 'true')) === 'true';
        $allowlist = IpUtils::parseAllowlist((string) Env::get('IP_ALLOWLIST', ''));
        $ip = IpUtils::clientIp();
        if ($ip !== 'unknown' && $ipBlockingEnabled && !isset($allowlist[$ip])) {
            $whitelist = $this->db->findOne('iplogs', ['ip' => $ip, 'status' => 'whitelisted']);
            if ($whitelist === null) {
                $owner = $this->ownerFilter($actor, $ip);
                $existingIp = $this->db->findOne('iplogs', $owner, ['projection' => ['status' => 1]]);
                if ($existingIp !== null && ($existingIp['status'] ?? '') === 'blocked') {
                    Response::json(['message' => 'Access blocked for this IP address'], 403);
                    return null;
                }
            }
        }

        if ($ip !== 'unknown') {
            $ownerModel = IpUtils::ownerModelForRole((string) ($actor['role'] ?? 'user'));
            $this->db->updateOneUpsert('iplogs', $this->ownerFilter($actor, $ip), [
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

        return $actor;
    }

    private function ownerFilter(array $actor, string $ip): array
    {
        $ownerModel = IpUtils::ownerModelForRole((string) ($actor['role'] ?? 'user'));

        return [
            'userId' => new ObjectId((string) $actor['_id']),
            'ip' => $ip,
            '$or' => [['userModel' => $ownerModel], ['userModel' => ['$exists' => false]]],
        ];
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

    private function parseAmount(mixed $value): float
    {
        $amount = is_numeric($value) ? (float) $value : 0.0;
        return (float) number_format($amount, 2, '.', '');
    }

    private function toOptionalObjectId(mixed $value): mixed
    {
        if (!is_string($value)) {
            return null;
        }
        if (preg_match('/^[a-f0-9]{24}$/i', $value) !== 1) {
            return null;
        }
        return new ObjectId($value);
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
