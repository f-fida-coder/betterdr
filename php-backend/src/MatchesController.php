<?php

declare(strict_types=1);

use MongoDB\BSON\ObjectId;

final class MatchesController
{
    private MongoRepository $db;

    public function __construct(MongoRepository $db)
    {
        $this->db = $db;
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
            $match = $this->db->findOne('matches', ['_id' => new ObjectId($id)]);
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
            $allowPublicRefresh = strtolower((string) Env::get('PUBLIC_ODDS_REFRESH', 'true')) === 'true';
            if (!$allowPublicRefresh) {
                Response::json(['message' => 'Public odds refresh is disabled'], 403);
                return;
            }

            $results = OddsSyncService::updateMatches($this->db);
            Response::json(['message' => 'Manual odds fetch completed', 'results' => $results]);
        } catch (Throwable $e) {
            Response::json(['message' => 'Server error manual odds fetch'], 500);
        }
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
