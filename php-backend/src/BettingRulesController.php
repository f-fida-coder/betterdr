<?php

declare(strict_types=1);

use MongoDB\BSON\ObjectId;

final class BettingRulesController
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
        if ($path === '/api/betting/rules' && $method === 'GET') {
            $this->getPublicBetModeRules();
            return true;
        }

        if ($path === '/api/admin/bet-mode-rules' && $method === 'GET') {
            $this->getAdminBetModeRules();
            return true;
        }

        if ($method === 'PUT' && preg_match('#^/api/admin/bet-mode-rules/([^/]+)$#', $path, $matches) === 1) {
            $this->updateBetModeRule($matches[1]);
            return true;
        }

        return false;
    }

    private function getPublicBetModeRules(): void
    {
        try {
            $actor = $this->protect();
            if ($actor === null) {
                return;
            }

            $this->ensureSeeded();
            $rules = $this->db->findMany('betmoderules', ['isActive' => true], ['sort' => ['mode' => 1]]);
            Response::json(['rules' => $rules]);
        } catch (Throwable $e) {
            Response::json(['message' => 'Server error fetching bet mode rules'], 500);
        }
    }

    private function getAdminBetModeRules(): void
    {
        try {
            $actor = $this->protect();
            if ($actor === null) {
                return;
            }
            if (!$this->isAdminLike($actor)) {
                Response::json(['message' => 'Not authorized as admin or master agent'], 403);
                return;
            }

            $this->ensureSeeded();
            $rules = $this->db->findMany('betmoderules', [], ['sort' => ['mode' => 1]]);
            Response::json(['rules' => $rules]);
        } catch (Throwable $e) {
            Response::json(['message' => 'Server error fetching bet mode rules'], 500);
        }
    }

    private function updateBetModeRule(string $modePath): void
    {
        try {
            $actor = $this->protect();
            if ($actor === null) {
                return;
            }
            if (!$this->isAdminLike($actor)) {
                Response::json(['message' => 'Not authorized as admin or master agent'], 403);
                return;
            }

            $mode = BetModeRules::normalize($modePath);
            $default = BetModeRules::getDefault($mode);
            if ($default === null) {
                Response::json(['message' => 'Invalid bet mode'], 400);
                return;
            }

            $this->ensureSeeded();
            $rule = $this->db->findOne('betmoderules', ['mode' => $mode]);
            if ($rule === null) {
                Response::json(['message' => 'Bet mode rule not found'], 404);
                return;
            }

            $body = Http::jsonBody();

            $minLegs = array_key_exists('minLegs', $body) ? (int) $body['minLegs'] : (int) ($rule['minLegs'] ?? 1);
            $maxLegs = array_key_exists('maxLegs', $body) ? (int) $body['maxLegs'] : (int) ($rule['maxLegs'] ?? 1);
            $teaserPointOptions = $rule['teaserPointOptions'] ?? [];
            if (array_key_exists('teaserPointOptions', $body) && is_array($body['teaserPointOptions'])) {
                $teaserPointOptions = array_values(array_filter(array_map(function ($v) {
                    return is_numeric($v) ? (float) $v : null;
                }, $body['teaserPointOptions']), static fn ($v) => is_float($v) || is_int($v)));
            }

            $payoutProfile = $rule['payoutProfile'] ?? [];
            if (array_key_exists('payoutProfile', $body) && is_array($body['payoutProfile'])) {
                $payoutProfile = $body['payoutProfile'];
            }

            $isActive = array_key_exists('isActive', $body) ? (bool) $body['isActive'] : (bool) ($rule['isActive'] ?? true);

            if (!is_finite((float) $minLegs) || !is_finite((float) $maxLegs) || $minLegs < 1 || $maxLegs < $minLegs) {
                Response::json(['message' => 'Invalid leg limits'], 400);
                return;
            }

            $this->db->updateOne('betmoderules', ['_id' => new ObjectId((string) $rule['_id'])], [
                'minLegs' => $minLegs,
                'maxLegs' => $maxLegs,
                'teaserPointOptions' => $teaserPointOptions,
                'payoutProfile' => $payoutProfile,
                'isActive' => $isActive,
                'updatedAt' => MongoRepository::nowUtc(),
            ]);

            $updated = $this->db->findOne('betmoderules', ['_id' => new ObjectId((string) $rule['_id'])]);
            Response::json([
                'message' => 'Bet mode rule updated',
                'rule' => $updated,
            ]);
        } catch (Throwable $e) {
            Response::json(['message' => 'Server error updating bet mode rule'], 500);
        }
    }

    private function ensureSeeded(): void
    {
        $modes = ['straight', 'parlay', 'teaser', 'if_bet', 'reverse'];
        foreach ($modes as $mode) {
            $rule = BetModeRules::getDefault($mode);
            if ($rule === null) {
                continue;
            }

            $now = MongoRepository::nowUtc();
            $this->db->updateOneUpsert(
                'betmoderules',
                ['mode' => $rule['mode']],
                ['updatedAt' => $now],
                array_merge($rule, ['createdAt' => $now, 'updatedAt' => $now])
            );
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
        $actor = $this->db->findOne($collection, ['_id' => new ObjectId($id)]);
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

    private function isAdminLike(array $actor): bool
    {
        $role = (string) ($actor['role'] ?? '');
        return in_array($role, ['admin', 'master_agent', 'super_agent'], true);
    }
}
