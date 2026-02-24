<?php

declare(strict_types=1);


final class DebugController
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
        if ($method === 'POST' && $path === '/api/debug/emit-match') {
            $this->emitMatch();
            return true;
        }
        return false;
    }

    private function emitMatch(): void
    {
        try {
            $actor = $this->protectAdminOnly();
            if ($actor === null) {
                return;
            }

            $body = Http::jsonBody();
            $payload = (is_array($body) && count($body) > 0)
                ? $body
                : [
                    'id' => 'debug-' . time(),
                    'homeTeam' => 'Debug Home',
                    'awayTeam' => 'Debug Away',
                    'startTime' => gmdate(DATE_ATOM),
                    'sport' => 'debug',
                    'status' => 'live',
                    'score' => ['score_home' => 1, 'score_away' => 2, 'period' => 'Q2', 'event_status' => 'STATUS_IN_PROGRESS'],
                    'odds' => new stdClass(),
                ];

            // Socket emission is still handled by the legacy Node service.
            Response::json(['ok' => true, 'emitted' => $payload]);
        } catch (Throwable $e) {
            Response::json(['ok' => false, 'error' => $e->getMessage()], 500);
        }
    }

    private function protectAdminOnly(): ?array
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
        if (!in_array($role, ['admin', 'super_agent', 'master_agent'], true)) {
            Response::json(['message' => 'Not authorized as admin or master agent'], 403);
            return null;
        }

        $id = (string) ($decoded['id'] ?? '');
        if ($id === '' || preg_match('/^[a-f0-9]{24}$/i', $id) !== 1) {
            Response::json(['message' => 'Not authorized, token failed: invalid user id'], 401);
            return null;
        }

        $collection = ($role === 'admin') ? 'admins' : 'agents';
        $actor = $this->db->findOne($collection, ['_id' => MongoRepository::id($id)]);
        if ($actor === null) {
            Response::json(['message' => 'Not authorized, user not found'], 403);
            return null;
        }

        return $actor;
    }
}
