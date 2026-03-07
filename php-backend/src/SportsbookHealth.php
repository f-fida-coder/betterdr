<?php

declare(strict_types=1);

final class SportsbookHealth
{
    private const HEALTH_COLLECTION = 'sportsbookhealth';
    private const AUDIT_COLLECTION = 'sportsbookauditlogs';
    private const SYNC_DOC_ID = 'sportsbook_odds_sync';
    private const SETTLEMENT_DOC_ID = 'sportsbook_settlement';

    /**
     * @param array<string, mixed> $context
     */
    public static function recordSyncStart(MongoRepository $db, string $source, array $context = []): string
    {
        $now = MongoRepository::nowUtc();
        $existing = self::healthDoc($db, self::SYNC_DOC_ID);
        $runId = self::newRunId('sync');

        $db->updateOneUpsert(self::HEALTH_COLLECTION, ['_id' => self::SYNC_DOC_ID], [
            '_id' => self::SYNC_DOC_ID,
            'component' => 'odds_sync',
            'lastRunId' => $runId,
            'lastRunStatus' => 'running',
            'lastSource' => $source,
            'lastStartedAt' => $now,
            'lastFinishedAt' => null,
            'lastError' => null,
            'lastContext' => $context,
            'staleAfterSeconds' => self::staleAfterSeconds(),
            'consecutiveFailures' => (int) ($existing['consecutiveFailures'] ?? 0),
            'consecutiveOddsFailures' => (int) ($existing['consecutiveOddsFailures'] ?? 0),
            'runCount' => (int) ($existing['runCount'] ?? 0),
            'updatedAt' => $now,
        ], [
            '_id' => self::SYNC_DOC_ID,
            'component' => 'odds_sync',
            'createdAt' => $now,
            'runCount' => 0,
            'consecutiveFailures' => 0,
            'consecutiveOddsFailures' => 0,
        ]);

        self::appendAudit($db, 'odds_sync_started', [
            'runId' => $runId,
            'source' => $source,
            'context' => $context,
        ]);

        return $runId;
    }

    /**
     * @param array<string, mixed> $result
     */
    public static function recordSyncSuccess(MongoRepository $db, string $runId, string $source, array $result): void
    {
        $now = MongoRepository::nowUtc();
        $existing = self::healthDoc($db, self::SYNC_DOC_ID);
        $runCount = ((int) ($existing['runCount'] ?? 0)) + 1;
        $oddsCallsOk = (int) ($result['oddsCallsOk'] ?? 0);
        $scoresCallsOk = (int) ($result['scoresCallsOk'] ?? 0);
        $status = ((int) ($result['failedCalls'] ?? 0)) > 0 ? 'partial' : 'success';
        $lastOddsSuccessAt = $existing['lastOddsSuccessAt'] ?? null;
        $lastScoresSuccessAt = $existing['lastScoresSuccessAt'] ?? null;

        if ($oddsCallsOk > 0) {
            $lastOddsSuccessAt = $now;
        }
        if ($scoresCallsOk > 0) {
            $lastScoresSuccessAt = $now;
        }

        $db->updateOneUpsert(self::HEALTH_COLLECTION, ['_id' => self::SYNC_DOC_ID], [
            '_id' => self::SYNC_DOC_ID,
            'component' => 'odds_sync',
            'lastRunId' => $runId,
            'lastRunStatus' => $status,
            'lastSource' => $source,
            'lastSuccessAt' => $now,
            'lastFinishedAt' => $now,
            'lastOddsSuccessAt' => $lastOddsSuccessAt,
            'lastScoresSuccessAt' => $lastScoresSuccessAt,
            'lastDbWriteAt' => ((int) ($result['created'] ?? 0) + (int) ($result['updated'] ?? 0)) > 0 ? $now : ($existing['lastDbWriteAt'] ?? null),
            'lastError' => null,
            'lastResult' => $result,
            'staleAfterSeconds' => self::staleAfterSeconds(),
            'consecutiveFailures' => 0,
            'consecutiveOddsFailures' => $oddsCallsOk > 0 ? 0 : (((int) ($existing['consecutiveOddsFailures'] ?? 0)) + 1),
            'runCount' => $runCount,
            'updatedAt' => $now,
        ], [
            '_id' => self::SYNC_DOC_ID,
            'component' => 'odds_sync',
            'createdAt' => $now,
            'runCount' => $runCount,
            'consecutiveFailures' => 0,
            'consecutiveOddsFailures' => $oddsCallsOk > 0 ? 0 : 1,
        ]);

        self::appendAudit($db, 'odds_sync_' . $status, [
            'runId' => $runId,
            'source' => $source,
            'result' => $result,
        ]);
    }

    /**
     * @param array<string, mixed> $partialResult
     */
    public static function recordSyncFailure(MongoRepository $db, string $runId, string $source, Throwable $error, array $partialResult = []): void
    {
        $now = MongoRepository::nowUtc();
        $existing = self::healthDoc($db, self::SYNC_DOC_ID);
        $runCount = ((int) ($existing['runCount'] ?? 0)) + 1;

        $db->updateOneUpsert(self::HEALTH_COLLECTION, ['_id' => self::SYNC_DOC_ID], [
            '_id' => self::SYNC_DOC_ID,
            'component' => 'odds_sync',
            'lastRunId' => $runId,
            'lastRunStatus' => 'failed',
            'lastSource' => $source,
            'lastFinishedAt' => $now,
            'lastFailureAt' => $now,
            'lastError' => $error->getMessage(),
            'lastResult' => $partialResult,
            'staleAfterSeconds' => self::staleAfterSeconds(),
            'consecutiveFailures' => ((int) ($existing['consecutiveFailures'] ?? 0)) + 1,
            'consecutiveOddsFailures' => ((int) ($existing['consecutiveOddsFailures'] ?? 0)) + 1,
            'runCount' => $runCount,
            'updatedAt' => $now,
        ], [
            '_id' => self::SYNC_DOC_ID,
            'component' => 'odds_sync',
            'createdAt' => $now,
            'runCount' => $runCount,
            'consecutiveFailures' => 1,
            'consecutiveOddsFailures' => 1,
        ]);

        self::appendAudit($db, 'odds_sync_failed', [
            'runId' => $runId,
            'source' => $source,
            'error' => $error->getMessage(),
            'partialResult' => $partialResult,
        ], 'error');
    }

    /**
     * @param array<string, mixed> $result
     */
    public static function recordSettlementSuccess(MongoRepository $db, string $matchId, string $settledBy, array $result): void
    {
        $now = MongoRepository::nowUtc();
        $existing = self::healthDoc($db, self::SETTLEMENT_DOC_ID);
        $runCount = ((int) ($existing['runCount'] ?? 0)) + 1;

        $db->updateOneUpsert(self::HEALTH_COLLECTION, ['_id' => self::SETTLEMENT_DOC_ID], [
            '_id' => self::SETTLEMENT_DOC_ID,
            'component' => 'settlement',
            'lastRunStatus' => 'success',
            'lastSuccessAt' => $now,
            'lastFinishedAt' => $now,
            'lastMatchId' => $matchId,
            'lastSettledBy' => $settledBy,
            'lastError' => null,
            'lastResult' => $result,
            'consecutiveFailures' => 0,
            'runCount' => $runCount,
            'updatedAt' => $now,
        ], [
            '_id' => self::SETTLEMENT_DOC_ID,
            'component' => 'settlement',
            'createdAt' => $now,
            'runCount' => $runCount,
            'consecutiveFailures' => 0,
        ]);

        self::appendAudit($db, 'settlement_success', [
            'matchId' => $matchId,
            'settledBy' => $settledBy,
            'result' => $result,
        ]);
    }

    public static function recordSettlementFailure(MongoRepository $db, string $matchId, string $settledBy, Throwable $error): void
    {
        $now = MongoRepository::nowUtc();
        $existing = self::healthDoc($db, self::SETTLEMENT_DOC_ID);
        $runCount = ((int) ($existing['runCount'] ?? 0)) + 1;

        $db->updateOneUpsert(self::HEALTH_COLLECTION, ['_id' => self::SETTLEMENT_DOC_ID], [
            '_id' => self::SETTLEMENT_DOC_ID,
            'component' => 'settlement',
            'lastRunStatus' => 'failed',
            'lastFinishedAt' => $now,
            'lastFailureAt' => $now,
            'lastMatchId' => $matchId,
            'lastSettledBy' => $settledBy,
            'lastError' => $error->getMessage(),
            'consecutiveFailures' => ((int) ($existing['consecutiveFailures'] ?? 0)) + 1,
            'runCount' => $runCount,
            'updatedAt' => $now,
        ], [
            '_id' => self::SETTLEMENT_DOC_ID,
            'component' => 'settlement',
            'createdAt' => $now,
            'runCount' => $runCount,
            'consecutiveFailures' => 1,
        ]);

        self::appendAudit($db, 'settlement_failed', [
            'matchId' => $matchId,
            'settledBy' => $settledBy,
            'error' => $error->getMessage(),
        ], 'error');
    }

    /**
     * @return array<string, mixed>
     */
    public static function sportsbookSnapshot(MongoRepository $db): array
    {
        $sync = self::healthDoc($db, self::SYNC_DOC_ID);
        $settlement = self::healthDoc($db, self::SETTLEMENT_DOC_ID);
        $staleAfterSeconds = self::staleAfterSeconds();
        $lastOddsSuccessAt = self::firstTimestamp($sync['lastOddsSuccessAt'] ?? null, self::fallbackLatestMatchTimestamp($db, 'lastOddsSyncAt'), self::fallbackLatestMatchTimestamp($db, 'lastUpdated'));
        $lastScoresSuccessAt = self::firstTimestamp($sync['lastScoresSuccessAt'] ?? null, self::fallbackLatestMatchTimestamp($db, 'lastScoreSyncAt'), self::fallbackLatestMatchTimestamp($db, 'updatedAt'));
        $oddsAgeSeconds = self::ageSeconds($lastOddsSuccessAt);
        $scoresAgeSeconds = self::ageSeconds($lastScoresSuccessAt);
        $oddsFeedStale = $oddsAgeSeconds === null || $oddsAgeSeconds > $staleAfterSeconds;

        return [
            'oddsSync' => [
                'lastStartedAt' => $sync['lastStartedAt'] ?? null,
                'lastFinishedAt' => $sync['lastFinishedAt'] ?? null,
                'lastSuccessAt' => $sync['lastSuccessAt'] ?? null,
                'lastOddsSuccessAt' => $lastOddsSuccessAt,
                'lastScoresSuccessAt' => $lastScoresSuccessAt,
                'lastFailureAt' => $sync['lastFailureAt'] ?? null,
                'lastRunStatus' => $sync['lastRunStatus'] ?? 'unknown',
                'lastSource' => $sync['lastSource'] ?? null,
                'lastError' => $sync['lastError'] ?? null,
                'lastResult' => is_array($sync['lastResult'] ?? null) ? $sync['lastResult'] : new stdClass(),
                'runCount' => (int) ($sync['runCount'] ?? 0),
                'consecutiveFailures' => (int) ($sync['consecutiveFailures'] ?? 0),
                'consecutiveOddsFailures' => (int) ($sync['consecutiveOddsFailures'] ?? 0),
                'syncAgeSeconds' => $oddsAgeSeconds,
                'scoresAgeSeconds' => $scoresAgeSeconds,
                'staleAfterSeconds' => $staleAfterSeconds,
                'isStale' => $oddsFeedStale,
                'bettingSuspended' => $oddsFeedStale,
            ],
            'settlement' => [
                'lastFinishedAt' => $settlement['lastFinishedAt'] ?? null,
                'lastSuccessAt' => $settlement['lastSuccessAt'] ?? null,
                'lastFailureAt' => $settlement['lastFailureAt'] ?? null,
                'lastRunStatus' => $settlement['lastRunStatus'] ?? 'unknown',
                'lastMatchId' => $settlement['lastMatchId'] ?? null,
                'lastSettledBy' => $settlement['lastSettledBy'] ?? null,
                'lastError' => $settlement['lastError'] ?? null,
                'lastResult' => is_array($settlement['lastResult'] ?? null) ? $settlement['lastResult'] : new stdClass(),
                'runCount' => (int) ($settlement['runCount'] ?? 0),
                'consecutiveFailures' => (int) ($settlement['consecutiveFailures'] ?? 0),
            ],
        ];
    }

    /**
     * @param array<string, mixed> $match
     * @return array<string, mixed>
     */
    public static function applyBettingAvailability(MongoRepository $db, array $match): array
    {
        $annotated = SportsMatchStatus::annotate($match);
        $statusReason = SportsMatchStatus::placementBlockReason($annotated);
        $staleState = self::bettingAvailability($db, $annotated);

        if ($statusReason !== null) {
            $annotated['bettingBlockedReason'] = $statusReason;
        }

        $annotated['syncAgeSeconds'] = $staleState['syncAgeSeconds'];
        $annotated['oddsAgeSeconds'] = $staleState['oddsAgeSeconds'];
        $annotated['oddsFeedStale'] = $staleState['oddsFeedStale'];

        if (($annotated['isBettable'] ?? false) === true && ($staleState['allowed'] ?? false) !== true) {
            $annotated['isBettable'] = false;
            $annotated['isStale'] = true;
            $annotated['bettingBlockedReason'] = $staleState['reason'];
        }

        return $annotated;
    }

    /**
     * @param array<string, mixed> $match
     * @return array{allowed: bool, reason: ?string, syncAgeSeconds: ?int, oddsAgeSeconds: ?int, oddsFeedStale: bool}
     */
    public static function bettingAvailability(MongoRepository $db, array $match): array
    {
        $snapshot = self::sportsbookSnapshot($db);
        $syncAgeSeconds = self::safeInt($snapshot['oddsSync']['syncAgeSeconds'] ?? null);
        $threshold = self::staleAfterSeconds();
        $oddsFeedStale = (bool) ($snapshot['oddsSync']['isStale'] ?? true);
        $matchOddsAt = self::firstTimestamp(
            $match['lastOddsSyncAt'] ?? null,
            $match['lastUpdated'] ?? null,
            $match['updatedAt'] ?? null
        );
        $matchOddsAge = self::ageSeconds($matchOddsAt);

        if ($oddsFeedStale) {
            $ageLabel = $syncAgeSeconds === null ? 'unknown age' : ($syncAgeSeconds . 's old');
            return [
                'allowed' => false,
                'reason' => 'Sportsbook odds feed is stale (' . $ageLabel . '). Betting is temporarily suspended.',
                'syncAgeSeconds' => $syncAgeSeconds,
                'oddsAgeSeconds' => $matchOddsAge,
                'oddsFeedStale' => true,
            ];
        }

        if ($matchOddsAge === null || $matchOddsAge > $threshold) {
            $label = trim((string) (($match['homeTeam'] ?? 'Match') . ' vs ' . ($match['awayTeam'] ?? '')));
            $ageLabel = $matchOddsAge === null ? 'unknown age' : ($matchOddsAge . 's old');
            return [
                'allowed' => false,
                'reason' => 'Odds are stale for ' . $label . ' (' . $ageLabel . '). Betting is temporarily suspended.',
                'syncAgeSeconds' => $syncAgeSeconds,
                'oddsAgeSeconds' => $matchOddsAge,
                'oddsFeedStale' => false,
            ];
        }

        return [
            'allowed' => true,
            'reason' => null,
            'syncAgeSeconds' => $syncAgeSeconds,
            'oddsAgeSeconds' => $matchOddsAge,
            'oddsFeedStale' => false,
        ];
    }

    public static function staleAfterSeconds(): int
    {
        $raw = Env::get('SPORTSBOOK_MAX_SYNC_AGE_SECONDS', '600');
        return is_numeric($raw) ? max(60, (int) $raw) : 600;
    }

    /**
     * @param array<string, mixed> $payload
     */
    private static function appendAudit(MongoRepository $db, string $event, array $payload, string $severity = 'info'): void
    {
        $now = MongoRepository::nowUtc();
        $entry = [
            'event' => $event,
            'severity' => $severity,
            'payload' => $payload,
            'createdAt' => $now,
            'updatedAt' => $now,
        ];
        $db->insertOne(self::AUDIT_COLLECTION, $entry);
        self::writeFileLog($event, $severity, $payload);
    }

    /**
     * @return array<string, mixed>
     */
    private static function healthDoc(MongoRepository $db, string $id): array
    {
        $doc = $db->findOne(self::HEALTH_COLLECTION, ['_id' => MongoRepository::id($id)]);
        return is_array($doc) ? $doc : [];
    }

    private static function fallbackLatestMatchTimestamp(MongoRepository $db, string $field): ?string
    {
        $matches = $db->findMany('matches', [], ['sort' => [$field => -1, 'updatedAt' => -1], 'limit' => 1]);
        $row = $matches[0] ?? null;
        if (!is_array($row)) {
            return null;
        }
        $value = $row[$field] ?? null;
        return is_string($value) && trim($value) !== '' ? $value : null;
    }

    private static function ageSeconds(?string $timestamp): ?int
    {
        if (!is_string($timestamp) || trim($timestamp) === '') {
            return null;
        }
        $parsed = strtotime($timestamp);
        if ($parsed === false) {
            return null;
        }
        return max(0, time() - $parsed);
    }

    private static function firstTimestamp(mixed ...$values): ?string
    {
        foreach ($values as $value) {
            if (is_string($value) && trim($value) !== '') {
                return $value;
            }
        }
        return null;
    }

    private static function safeInt(mixed $value): ?int
    {
        return is_numeric($value) ? (int) $value : null;
    }

    /**
     * @param array<string, mixed> $payload
     */
    private static function writeFileLog(string $event, string $severity, array $payload): void
    {
        $logDir = dirname(__DIR__) . '/logs';
        if (!is_dir($logDir)) {
            @mkdir($logDir, 0775, true);
        }
        $line = json_encode([
            'time' => gmdate(DATE_ATOM),
            'event' => $event,
            'severity' => $severity,
            'payload' => $payload,
        ], JSON_UNESCAPED_SLASHES);
        if (!is_string($line)) {
            return;
        }
        @file_put_contents($logDir . '/sportsbook-ops.log', $line . PHP_EOL, FILE_APPEND);
    }

    private static function newRunId(string $prefix): string
    {
        try {
            return $prefix . '_' . bin2hex(random_bytes(8));
        } catch (Throwable $e) {
            return $prefix . '_' . substr(hash('sha256', uniqid($prefix, true)), 0, 16);
        }
    }
}
