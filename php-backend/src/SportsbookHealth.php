<?php

declare(strict_types=1);

final class SportsbookHealth
{
    private const HEALTH_COLLECTION = 'sportsbookhealth';
    private const AUDIT_COLLECTION = 'sportsbookauditlogs';
    private const SYNC_DOC_ID = 'sportsbook_odds_sync';
    private const SETTLEMENT_DOC_ID = 'sportsbook_settlement';
    private const DEFAULT_SNAPSHOT_CACHE_TTL_SECONDS = 10;

    /**
     * @param array<string, mixed> $context
     */
    public static function recordSyncStart(SqlRepository $db, string $source, array $context = []): string
    {
        $now = SqlRepository::nowUtc();
        $existing = self::healthDoc($db, self::SYNC_DOC_ID);
        $runId = self::newRunId('sync');

        $db->updateOneUpsert(self::HEALTH_COLLECTION, ['id' => self::SYNC_DOC_ID], [
            'id' => self::SYNC_DOC_ID,
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
            'id' => self::SYNC_DOC_ID,
            'component' => 'odds_sync',
            'createdAt' => $now,
            'runCount' => 0,
            'consecutiveFailures' => 0,
            'consecutiveOddsFailures' => 0,
        ]);
        self::invalidateSnapshotCache();

        // File-log only — no DB row. This event fires every 2 minutes and
        // generated 29,500+ rows in 41 days. The health doc already records
        // lastStartedAt / lastRunStatus for operational visibility.
        self::writeFileLog('odds_sync_started', 'info', [
            'runId' => $runId,
            'source' => $source,
            'context' => $context,
        ]);

        return $runId;
    }

    /**
     * @param array<string, mixed> $result
     */
    public static function recordSyncSuccess(SqlRepository $db, string $runId, string $source, array $result): void
    {
        $now = SqlRepository::nowUtc();
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

        $db->updateOneUpsert(self::HEALTH_COLLECTION, ['id' => self::SYNC_DOC_ID], [
            'id' => self::SYNC_DOC_ID,
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
            'id' => self::SYNC_DOC_ID,
            'component' => 'odds_sync',
            'createdAt' => $now,
            'runCount' => $runCount,
            'consecutiveFailures' => 0,
            'consecutiveOddsFailures' => $oddsCallsOk > 0 ? 0 : 1,
        ]);
        self::invalidateSnapshotCache();

        self::appendAudit($db, 'odds_sync_' . $status, [
            'runId' => $runId,
            'source' => $source,
            'result' => $result,
        ]);
    }

    /**
     * Lightweight health bump for the on-demand single-sport refresh path.
     * The worker's full refresh goes through recordSyncSuccess() and owns
     * runId/source/runCount; this helper only refreshes the success
     * timestamps and clears the snapshot cache so the public staleness gate
     * stops blocking betting after a successful user-triggered refresh.
     * Worker run metadata (lastFinishedAt, lastSource, runCount) is
     * intentionally untouched so dashboards can still tell that the worker
     * hasn't run.
     */
    public static function recordOddsSourceSuccess(SqlRepository $db, bool $scoresAlsoOk = false): void
    {
        $now = SqlRepository::nowUtc();
        $existing = self::healthDoc($db, self::SYNC_DOC_ID);
        $update = [
            'id' => self::SYNC_DOC_ID,
            'component' => 'odds_sync',
            'lastOddsSuccessAt' => $now,
            'consecutiveOddsFailures' => 0,
            'updatedAt' => $now,
        ];
        if ($scoresAlsoOk) {
            $update['lastScoresSuccessAt'] = $now;
        }
        $db->updateOneUpsert(self::HEALTH_COLLECTION, ['id' => self::SYNC_DOC_ID], $update, [
            'id' => self::SYNC_DOC_ID,
            'component' => 'odds_sync',
            'createdAt' => $now,
            'runCount' => 0,
            'consecutiveFailures' => 0,
            'consecutiveOddsFailures' => 0,
        ]);
        self::invalidateSnapshotCache();
    }

    /**
     * Record one cycle's extended-sync (alt/period markets + player props)
     * outcome on the existing sync health doc. Tracked separately from the
     * main `lastOddsSuccessAt` because main and extended use different API
     * endpoints — main can succeed while extended quietly returns empty for
     * cycles in a row, which is exactly what made period tabs feel "random"
     * before Phase 3. `freshMatches` advances `lastExtendedSuccessAt`;
     * cycles with zero fresh matches advance `consecutiveExtendedEmptyCycles`
     * so a watchdog can alert.
     *
     * @param array{
     *     freshMatches?: int,
     *     preservedMatches?: int,
     *     errors?: int,
     *     freshBySport?: array<string, int>,
     *     preservedBySport?: array<string, int>
     * } $result
     */
    public static function recordExtendedSyncResult(SqlRepository $db, array $result): void
    {
        $now = SqlRepository::nowUtc();
        $existing = self::healthDoc($db, self::SYNC_DOC_ID);
        $fresh = (int) ($result['freshMatches'] ?? 0);
        $preserved = (int) ($result['preservedMatches'] ?? 0);
        $errors = (int) ($result['errors'] ?? 0);

        $update = [
            'id' => self::SYNC_DOC_ID,
            'component' => 'odds_sync',
            'lastExtendedAttemptAt' => $now,
            'lastExtendedFreshMatches' => $fresh,
            'lastExtendedPreservedMatches' => $preserved,
            'lastExtendedErrors' => $errors,
            'lastExtendedFreshBySport' => is_array($result['freshBySport'] ?? null) ? $result['freshBySport'] : [],
            'lastExtendedPreservedBySport' => is_array($result['preservedBySport'] ?? null) ? $result['preservedBySport'] : [],
            'updatedAt' => $now,
        ];

        if ($fresh > 0) {
            $update['lastExtendedSuccessAt'] = $now;
            $update['consecutiveExtendedEmptyCycles'] = 0;
        } else {
            $prev = (int) ($existing['consecutiveExtendedEmptyCycles'] ?? 0);
            $update['consecutiveExtendedEmptyCycles'] = $prev + 1;
        }

        $db->updateOneUpsert(self::HEALTH_COLLECTION, ['id' => self::SYNC_DOC_ID], $update, [
            'id' => self::SYNC_DOC_ID,
            'component' => 'odds_sync',
            'createdAt' => $now,
            'runCount' => 0,
            'consecutiveFailures' => 0,
            'consecutiveOddsFailures' => 0,
            'consecutiveExtendedEmptyCycles' => 0,
        ]);
        self::invalidateSnapshotCache();
    }

    /**
     * Extended-sync watchdog. Fires once when `consecutiveExtendedEmptyCycles`
     * crosses the threshold (default 6 cycles ≈ 9 min at 90 s cadence) and
     * stays quiet until the next crossing. Distinct from `checkWorkerHealth`,
     * which alerts on the main odds feed — extended sync can be silently
     * dead while the main feed looks fine, since the two use separate
     * upstream endpoints.
     *
     * Returns true if an alert fired this call.
     */
    public static function checkExtendedSyncHealth(SqlRepository $db, ?int $thresholdCycles = null): bool
    {
        $threshold = $thresholdCycles !== null
            ? max(1, (int) $thresholdCycles)
            : max(1, (int) Env::get('EXTENDED_SYNC_ALERT_CYCLES', '6'));
        $existing = self::healthDoc($db, self::SYNC_DOC_ID);
        if (!is_array($existing) || $existing === []) {
            return false;
        }
        $empty = (int) ($existing['consecutiveExtendedEmptyCycles'] ?? 0);
        if ($empty < $threshold) {
            // Reset the alert anchor when recovery happens so the next bad
            // streak fires its own alert. Without this, the debounce below
            // would suppress alerts forever after the first one.
            if ($empty === 0 && !empty($existing['lastExtendedAlertAt'])) {
                $db->updateOneUpsert(self::HEALTH_COLLECTION, ['id' => self::SYNC_DOC_ID], [
                    'id' => self::SYNC_DOC_ID,
                    'lastExtendedAlertAt' => null,
                    'updatedAt' => SqlRepository::nowUtc(),
                ], [
                    'id' => self::SYNC_DOC_ID,
                    'component' => 'odds_sync',
                    'createdAt' => SqlRepository::nowUtc(),
                ]);
            }
            return false;
        }
        $lastAlertAt = $existing['lastExtendedAlertAt'] ?? null;
        if ($lastAlertAt !== null && $lastAlertAt !== '') {
            // Debounce: one alert per "streak" — i.e. don't re-fire while
            // the cycle counter only grows. checkExtendedSyncHealth fires
            // again once the streak breaks (lastExtendedAlertAt cleared
            // above on a successful cycle).
            return false;
        }
        $payload = [
            'consecutiveExtendedEmptyCycles' => $empty,
            'thresholdCycles' => $threshold,
            'lastExtendedSuccessAt' => $existing['lastExtendedSuccessAt'] ?? null,
            'lastExtendedPreservedBySport' => $existing['lastExtendedPreservedBySport'] ?? [],
        ];
        $db->updateOneUpsert(self::HEALTH_COLLECTION, ['id' => self::SYNC_DOC_ID], [
            'id' => self::SYNC_DOC_ID,
            'lastExtendedAlertAt' => SqlRepository::nowUtc(),
            'updatedAt' => SqlRepository::nowUtc(),
        ], [
            'id' => self::SYNC_DOC_ID,
            'component' => 'odds_sync',
            'createdAt' => SqlRepository::nowUtc(),
        ]);
        self::appendAudit($db, 'odds_extended_sync_unhealthy', $payload, 'warning');
        self::writeFileLog('odds_extended_sync_unhealthy', 'warn', $payload);
        return true;
    }

    /**
     * Worker health alert. Called from the odds-worker tick after each
     * iteration. If the gap between now and `lastOddsSuccessAt` exceeds the
     * threshold (default 10 min), emit a critical audit + file-log row so
     * monitoring can pick it up. Debounced via `lastHealthAlertAt` so a
     * stuck worker logs once per detection cycle, not every tick.
     *
     * Returns true if an alert fired this call (useful for the worker to
     * also escalate to STDERR), false otherwise.
     */
    public static function checkWorkerHealth(SqlRepository $db, ?int $thresholdSeconds = null): bool
    {
        $threshold = $thresholdSeconds !== null
            ? max(60, (int) $thresholdSeconds)
            : max(60, (int) Env::get('WORKER_HEALTH_ALERT_SECONDS', '600'));
        $existing = self::healthDoc($db, self::SYNC_DOC_ID);
        if (!is_array($existing) || $existing === []) {
            return false;
        }
        $lastSuccessAt = $existing['lastOddsSuccessAt'] ?? ($existing['lastSuccessAt'] ?? null);
        if ($lastSuccessAt === null || $lastSuccessAt === '') {
            return false;
        }
        $lastTs = strtotime((string) $lastSuccessAt);
        if ($lastTs === false) {
            return false;
        }
        $now = time();
        $ageSeconds = $now - $lastTs;
        if ($ageSeconds <= $threshold) {
            return false;
        }
        // Debounce: don't re-fire the alert until the threshold elapses again
        // since the previous alert. Stuck worker → one alert per ~threshold.
        $lastAlertAt = $existing['lastHealthAlertAt'] ?? null;
        if ($lastAlertAt !== null && $lastAlertAt !== '') {
            $lastAlertTs = strtotime((string) $lastAlertAt);
            if ($lastAlertTs !== false && ($now - $lastAlertTs) < $threshold) {
                return false;
            }
        }
        $payload = [
            'lastOddsSuccessAt' => (string) $lastSuccessAt,
            'ageSeconds' => $ageSeconds,
            'thresholdSeconds' => $threshold,
            'consecutiveFailures' => (int) ($existing['consecutiveFailures'] ?? 0),
            'consecutiveOddsFailures' => (int) ($existing['consecutiveOddsFailures'] ?? 0),
            'lastError' => $existing['lastError'] ?? null,
        ];
        $db->updateOneUpsert(self::HEALTH_COLLECTION, ['id' => self::SYNC_DOC_ID], [
            'id' => self::SYNC_DOC_ID,
            'lastHealthAlertAt' => SqlRepository::nowUtc(),
            'updatedAt' => SqlRepository::nowUtc(),
        ], [
            'id' => self::SYNC_DOC_ID,
            'component' => 'odds_sync',
            'createdAt' => SqlRepository::nowUtc(),
        ]);
        self::appendAudit($db, 'odds_worker_unhealthy', $payload, 'critical');
        self::writeFileLog('odds_worker_unhealthy', 'error', $payload);
        return true;
    }

    /**
     * @param array<string, mixed> $partialResult
     */
    public static function recordSyncFailure(SqlRepository $db, string $runId, string $source, Throwable $error, array $partialResult = []): void
    {
        $now = SqlRepository::nowUtc();
        $existing = self::healthDoc($db, self::SYNC_DOC_ID);
        $runCount = ((int) ($existing['runCount'] ?? 0)) + 1;

        $db->updateOneUpsert(self::HEALTH_COLLECTION, ['id' => self::SYNC_DOC_ID], [
            'id' => self::SYNC_DOC_ID,
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
            'id' => self::SYNC_DOC_ID,
            'component' => 'odds_sync',
            'createdAt' => $now,
            'runCount' => $runCount,
            'consecutiveFailures' => 1,
            'consecutiveOddsFailures' => 1,
        ]);
        self::invalidateSnapshotCache();

        // Rate-limit DB audit rows: log only the first failure in a streak
        // and every 15th consecutive failure. The health doc tracks every
        // failure regardless. File log always fires for local debugging.
        $consecutiveFailures = ((int) ($existing['consecutiveFailures'] ?? 0)) + 1;
        $failPayload = [
            'runId' => $runId,
            'source' => $source,
            'error' => $error->getMessage(),
            'partialResult' => $partialResult,
            'consecutiveFailures' => $consecutiveFailures,
        ];
        if ($consecutiveFailures === 1 || $consecutiveFailures % 15 === 0) {
            self::appendAudit($db, 'odds_sync_failed', $failPayload, 'error');
        } else {
            self::writeFileLog('odds_sync_failed', 'error', $failPayload);
        }
    }

    /**
     * @param array<string, mixed> $result
     */
    public static function recordSettlementSuccess(SqlRepository $db, string $matchId, string $settledBy, array $result): void
    {
        $now = SqlRepository::nowUtc();
        $existing = self::healthDoc($db, self::SETTLEMENT_DOC_ID);
        $runCount = ((int) ($existing['runCount'] ?? 0)) + 1;

        $db->updateOneUpsert(self::HEALTH_COLLECTION, ['id' => self::SETTLEMENT_DOC_ID], [
            'id' => self::SETTLEMENT_DOC_ID,
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
            'id' => self::SETTLEMENT_DOC_ID,
            'component' => 'settlement',
            'createdAt' => $now,
            'runCount' => $runCount,
            'consecutiveFailures' => 0,
        ]);
        self::invalidateSnapshotCache();

        self::appendAudit($db, 'settlement_success', [
            'matchId' => $matchId,
            'settledBy' => $settledBy,
            'result' => $result,
        ]);
    }

    public static function recordSettlementFailure(SqlRepository $db, string $matchId, string $settledBy, Throwable $error): void
    {
        $now = SqlRepository::nowUtc();
        $existing = self::healthDoc($db, self::SETTLEMENT_DOC_ID);
        $runCount = ((int) ($existing['runCount'] ?? 0)) + 1;

        $db->updateOneUpsert(self::HEALTH_COLLECTION, ['id' => self::SETTLEMENT_DOC_ID], [
            'id' => self::SETTLEMENT_DOC_ID,
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
            'id' => self::SETTLEMENT_DOC_ID,
            'component' => 'settlement',
            'createdAt' => $now,
            'runCount' => $runCount,
            'consecutiveFailures' => 1,
        ]);
        self::invalidateSnapshotCache();

        self::appendAudit($db, 'settlement_failed', [
            'matchId' => $matchId,
            'settledBy' => $settledBy,
            'error' => $error->getMessage(),
        ], 'error');
    }

    /**
     * @return array<string, mixed>
     */
    public static function sportsbookSnapshot(SqlRepository $db): array
    {
        return SharedFileCache::remember(
            SportsbookCache::healthSnapshotNamespace(),
            SportsbookCache::healthSnapshotKey(),
            self::snapshotCacheTtlSeconds(),
            static fn(): array => self::buildSportsbookSnapshot($db)
        );
    }

    public static function invalidateSnapshotCache(): void
    {
        SportsbookCache::invalidateHealthSnapshotCache();
    }

    /**
     * @return array<string, mixed>
     */
    private static function buildSportsbookSnapshot(SqlRepository $db): array
    {
        $sync = self::healthDoc($db, self::SYNC_DOC_ID);
        $settlement = self::healthDoc($db, self::SETTLEMENT_DOC_ID);
        $staleAfterSeconds = self::staleAfterSeconds();
        // LAZY fallbacks — PHP evaluates call arguments eagerly, so the old
        // one-liner firstTimestamp($sync[...], fallback(), fallback()) ran the
        // fallback queries on EVERY snapshot rebuild even though the health
        // doc timestamp is present in steady state. Each fallback sorts the
        // whole matches table by a JSON-extracted field (no generated column)
        // — ~1.5s apiece, four of them per rebuild = the perpetual
        // database:query:matches breaker warnings and much of every worker
        // tick that crossed the snapshot TTL. Only reach for the table scan
        // when the health doc really has no timestamp (fresh install / doc
        // wiped).
        $lastOddsSuccessAt = self::firstTimestamp($sync['lastOddsSuccessAt'] ?? null);
        if ($lastOddsSuccessAt === null) {
            $lastOddsSuccessAt = self::firstTimestamp(
                self::fallbackLatestMatchTimestamp($db, 'lastOddsSyncAt'),
                self::fallbackLatestMatchTimestamp($db, 'lastUpdated')
            );
        }
        $lastScoresSuccessAt = self::firstTimestamp($sync['lastScoresSuccessAt'] ?? null);
        if ($lastScoresSuccessAt === null) {
            $lastScoresSuccessAt = self::firstTimestamp(
                self::fallbackLatestMatchTimestamp($db, 'lastScoreSyncAt'),
                self::fallbackLatestMatchTimestamp($db, 'updatedAt')
            );
        }
        $oddsAgeSeconds = self::ageSeconds($lastOddsSuccessAt);
        $scoresAgeSeconds = self::ageSeconds($lastScoresSuccessAt);
        $oddsFeedStale = $oddsAgeSeconds === null || $oddsAgeSeconds > $staleAfterSeconds;
        // Trip the suspend gate the moment the plan runs out of datapoints —
        // don't wait out the age timer. Once credits expire the feed only
        // returns frozen/empty data, so anything still "fresh" by timestamp is
        // a stale snapshot we must stop offering for betting. Conservative:
        // quotaExhausted() is true only when the API reported a real limit at
        // zero remaining (see RundownClient::quotaExhausted).
        $quotaExhausted = class_exists('RundownClient') && RundownClient::quotaExhausted();
        // feedLimitReached is broader than quotaExhausted: it also trips on a
        // hard-budget / spend-cap 403 (where datapoints remain but the API
        // blocks data calls). When set, the feed cannot return fresh odds, so
        // we suspend betting AND strip stale prices (see applyBettingAvailability).
        $feedLimitReached = class_exists('RundownClient') && RundownClient::feedLimitReached();
        if ($quotaExhausted || $feedLimitReached) {
            $oddsFeedStale = true;
        }
        $lastResult = is_array($sync['lastResult'] ?? null) ? $sync['lastResult'] : [];
        $circuit = is_array($lastResult['circuitBreaker'] ?? null) ? $lastResult['circuitBreaker'] : [
            'state' => 'unknown',
            'failureCount' => 0,
            'threshold' => 0,
            'openUntil' => null,
        ];

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
                'lastResult' => $lastResult !== [] ? $lastResult : new stdClass(),
                'runCount' => (int) ($sync['runCount'] ?? 0),
                'consecutiveFailures' => (int) ($sync['consecutiveFailures'] ?? 0),
                'consecutiveOddsFailures' => (int) ($sync['consecutiveOddsFailures'] ?? 0),
                'syncAgeSeconds' => $oddsAgeSeconds,
                'scoresAgeSeconds' => $scoresAgeSeconds,
                'staleAfterSeconds' => $staleAfterSeconds,
                'isStale' => $oddsFeedStale,
                'bettingSuspended' => $oddsFeedStale,
                'quotaExhausted' => $quotaExhausted,
                'feedLimitReached' => $feedLimitReached,
                'circuitBreaker' => $circuit,
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
    public static function applyBettingAvailability(SqlRepository $db, array $match, ?array $snapshot = null): array
    {
        $snapshot = $snapshot ?? self::sportsbookSnapshot($db);
        $annotated = SportsMatchStatus::annotate($match);
        $statusReason = SportsMatchStatus::placementBlockReason($annotated);
        $staleState = self::bettingAvailability($db, $annotated, $snapshot);

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

        // Hard feed limit (datapoint quota exhausted OR account hard-budget /
        // spend-cap 403): the feed cannot return fresh odds, so we must NOT
        // serve the last-known (stale) prices. Strip the odds entirely — the
        // board then renders "Unavailable" cells (off the board) with a clear
        // message and betting suspended, instead of showing old prices. The
        // game stays listed; only its prices are withheld. Display-only:
        // settlement reads the stored DB doc, not this projection.
        if (($snapshot['oddsSync']['feedLimitReached'] ?? false) === true) {
            $annotated['odds'] = [];
            $annotated['bookmakers'] = [];
            $annotated['isBettable'] = false;
            $annotated['isStale'] = true;
            $annotated['oddsUnavailable'] = true;
            $annotated['bettingBlockedReason'] = 'Live odds are temporarily unavailable. Please check back shortly.';
        }

        // MMA/UFC is view-only until settlement is implemented: a placed fight
        // bet cannot be graded correctly yet (moneyline grades by
        // score_home/away = 0/0, round-totals are ungradeable), so it must
        // never be placeable. Force it unbettable here — this annotation feeds
        // both the board projection (so the UI hides/disables + / P+ / odds
        // cells while still showing the card) and the placement availability
        // check. The dedicated gate in BetsController::assertMmaBettingClosed
        // is the hard server-side stop; this is the matching display state.
        if (RundownSportMap::canonicalSportKey((string) ($annotated['sportKey'] ?? '')) === 'mma_mixed_martial_arts') {
            $annotated['isBettable'] = false;
            $annotated['bettingBlockedReason'] = 'MMA/UFC betting is currently unavailable.';
        }

        // The Odds API supplemental rows are PREMATCH-ONLY: that feed has no
        // live status/score signal and polls on a minutes cadence, so once
        // kickoff passes the stored price is a blind in-play line. Hard-
        // suspend at commence time — an ACTIVE close (staleness ageout alone
        // would leave a post-kickoff window at the last prematch price).
        // isPastKickoff() is provider-gated: always false for Rundown rows,
        // which flip to a real live status with live prices. Only ever flips
        // isBettable true→false, never the reverse.
        if (OddsApiEventMapper::isPastKickoff($annotated)) {
            $annotated['isBettable'] = false;
            $annotated['isStale'] = true;
            $annotated['bettingBlockedReason'] = 'This match has started. In-play betting is not available for this competition.';
        }

        // PROVIDER MASTER SWITCH: ODDS_API_MASTER_ENABLED=false turns the
        // whole The Odds API supplemental provider off. Its board rows are
        // hidden from every public listing (isPublicVisible) AND rejected at
        // placement (isBettable) in this single chokepoint — both surfaces
        // read this annotation, so hidden and unplaceable flip together.
        // Only ever flips true→false; Rundown rows are never touched.
        if (!OddsApiEventMapper::masterEnabled()
            && strtolower(trim((string) ($annotated['oddsSource'] ?? ''))) === OddsApiEventMapper::ODDS_SOURCE_TAG) {
            $annotated['isPublicVisible'] = false;
            $annotated['isBettable'] = false;
            $annotated['bettingBlockedReason'] = 'This market is temporarily unavailable.';
        }

        return $annotated;
    }

    /**
     * @param array<string, mixed> $match
     * @return array{allowed: bool, reason: ?string, syncAgeSeconds: ?int, oddsAgeSeconds: ?int, oddsFeedStale: bool}
     */
    public static function bettingAvailability(SqlRepository $db, array $match, ?array $snapshot = null): array
    {
        $snapshot = $snapshot ?? self::sportsbookSnapshot($db);
        $syncAgeSeconds = self::safeInt($snapshot['oddsSync']['syncAgeSeconds'] ?? null);
        $matchThreshold = self::matchStaleAfterSeconds();
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

        if ($matchOddsAge === null || $matchOddsAge > $matchThreshold) {
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
     * Per-match staleness threshold. Higher than the global feed-health
     * threshold so individual matches aren't blocked just because their
     * sport's tier hasn't ticked recently. Worker tier cadence is 5/7/10
     * minutes (tiers 1/2/3); a 25-minute default tolerates a missed worker
     * run for tier 3 sports without flipping the whole list to "stale".
     * The global feed-health gate (above) still fires when the worker is
     * actually dead, so this doesn't paper over a real outage.
     */
    public static function matchStaleAfterSeconds(): int
    {
        $raw = Env::get('SPORTSBOOK_MATCH_STALE_AGE_SECONDS', '');
        if (is_numeric($raw)) {
            return max(60, (int) $raw);
        }
        // Fall back to 2.5x the global threshold, floor at 1500s (25 min).
        $global = self::staleAfterSeconds();
        return max(1500, (int) round($global * 2.5));
    }

    private static function snapshotCacheTtlSeconds(): int
    {
        $raw = Env::get('SPORTSBOOK_HEALTH_CACHE_TTL_SECONDS', (string) self::DEFAULT_SNAPSHOT_CACHE_TTL_SECONDS);
        return is_numeric($raw) ? max(1, (int) $raw) : self::DEFAULT_SNAPSHOT_CACHE_TTL_SECONDS;
    }

    /**
     * @param array<string, mixed> $payload
     */
    private static function appendAudit(SqlRepository $db, string $event, array $payload, string $severity = 'info'): void
    {
        $now = SqlRepository::nowUtc();
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
    private static function healthDoc(SqlRepository $db, string $id): array
    {
        $doc = $db->findOne(self::HEALTH_COLLECTION, ['id' => SqlRepository::id($id)]);
        return is_array($doc) ? $doc : [];
    }

    private static function fallbackLatestMatchTimestamp(SqlRepository $db, string $field): ?string
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
        $level = match (strtolower($severity)) {
            'error', 'critical' => 'error',
            'warning', 'warn'   => 'warning',
            default             => 'info',
        };
        $method = match ($level) {
            'error'   => [Logger::class, 'error'],
            'warning' => [Logger::class, 'warning'],
            default   => [Logger::class, 'info'],
        };
        ($method)($event, $payload, 'sportsbook');
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
