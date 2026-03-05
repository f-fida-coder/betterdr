<?php

declare(strict_types=1);


final class MatchesController
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
        if ($method === 'GET' && $path === '/api/matches') {
            $this->getMatches();
            return true;
        }

        if ($method === 'GET' && preg_match('#^/api/matches/([a-fA-F0-9]{24})$#', $path, $m) === 1) {
            $this->getMatchById($m[1]);
            return true;
        }

        if ($method === 'POST' && $path === '/api/matches/fetch-odds') {
            $this->fetchOddsPublic();
            return true;
        }

        if ($method === 'GET' && $path === '/api/matches/stream') {
            $this->streamMatches();
            return true;
        }

        return false;
    }

    private function getMatches(): void
    {
        try {
            $status = isset($_GET['status']) ? strtolower(trim((string) $_GET['status'])) : '';
            $active = isset($_GET['active']) ? strtolower(trim((string) $_GET['active'])) : '';
            $filter = [];

            if ($status !== '') {
                $filter['status'] = $status === 'active' ? 'live' : $status;
            } elseif ($active === 'true') {
                $filter['status'] = 'live';
            }

            $matches = $this->db->findMany('matches', $filter, ['sort' => ['startTime' => 1]]);
            Response::json($matches);
        } catch (Throwable $e) {
            Response::json(['message' => 'Server Error fetching matches'], 500);
        }
    }

    private function getMatchById(string $id): void
    {
        try {
            $match = $this->db->findOne('matches', ['_id' => MongoRepository::id($id)]);
            if ($match === null) {
                Response::json(['message' => 'Match not found'], 404);
                return;
            }
            Response::json($match);
        } catch (Throwable $e) {
            Response::json(['message' => 'Server Error fetching match'], 500);
        }
    }

    private function fetchOddsPublic(): void
    {
        try {
            $admin = $this->protectAdmin();
            if ($admin === null) {
                return;
            }
            if (RateLimiter::enforce($this->db, 'matches_fetch_odds_admin', 3, 60)) {
                return;
            }

            $allowPublicRefresh = strtolower((string) Env::get('PUBLIC_ODDS_REFRESH', 'false')) === 'true';
            if (!$allowPublicRefresh) {
                Response::json(['message' => 'Public odds refresh route is disabled. Use admin refresh endpoint.'], 403);
                return;
            }

            $results = OddsSyncService::updateMatches($this->db);
            Response::json(['message' => 'Manual odds fetch completed', 'results' => $results]);
        } catch (Throwable $e) {
            Response::json(['message' => 'Server error manual odds fetch'], 500);
        }
    }

    private function protectAdmin(): ?array
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

        if ((string) ($decoded['role'] ?? '') !== 'admin') {
            Response::json(['message' => 'Only admin can refresh odds from this route'], 403);
            return null;
        }

        $id = (string) ($decoded['id'] ?? '');
        if ($id === '' || preg_match('/^[a-f0-9]{24}$/i', $id) !== 1) {
            Response::json(['message' => 'Not authorized, token failed: invalid user id'], 401);
            return null;
        }

        $admin = $this->db->findOne('admins', ['_id' => MongoRepository::id($id)]);
        if ($admin === null) {
            Response::json(['message' => 'Not authorized, user not found'], 403);
            return null;
        }

        if (($admin['status'] ?? '') === 'suspended') {
            Response::json(['message' => 'Not authorized, account suspended'], 403);
            return null;
        }

        return $admin;
    }

    private function streamMatches(): void
    {
        header('Content-Type: text/event-stream');
        header('Cache-Control: no-cache');
        header('Connection: keep-alive');

        $maxRuntime = 55;
        $pollSeconds = 2;
        $startedAt = time();
        $lastSeen = MongoRepository::nowUtc();

        echo ": stream-open\n\n";
        @ob_flush();
        @flush();

        while ((time() - $startedAt) < $maxRuntime) {
            try {
                $updated = $this->db->findMany('matches', ['updatedAt' => ['$gte' => $lastSeen]], ['sort' => ['updatedAt' => 1]]);
                foreach ($updated as $match) {
                    echo "event: matchUpdate\n";
                    echo 'data: ' . json_encode($match, JSON_UNESCAPED_SLASHES) . "\n\n";
                }
            } catch (Throwable $e) {
                // Keep stream alive even if one poll fails.
            }

            $lastSeen = MongoRepository::nowUtc();
            echo ": ping\n\n";
            @ob_flush();
            @flush();
            sleep($pollSeconds);
        }
    }
}
