<?php

declare(strict_types=1);


final class DebugController
{
    private SqlRepository $db;
    private string $jwtSecret;

    public function __construct(SqlRepository $db, string $jwtSecret)
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
        if ($method === 'GET' && $path === '/api/debug/sports-api-smoke-test') {
            $this->sportsApiSmokeTest();
            return true;
        }
        if ($method === 'GET' && $path === '/api/debug/live-status') {
            $this->liveStatus();
            return true;
        }
        if ($method === 'POST' && $path === '/api/internal/prematch-tick') {
            $this->prematchTick();
            return true;
        }
        if ($method === 'POST' && $path === '/api/sync/live') {
            $this->userLiveSync();
            return true;
        }
        if ($method === 'POST' && preg_match('#^/api/sync/prematch/([a-z][a-z0-9_]{1,79})$#', $path, $m) === 1) {
            $this->userPrematchSync((string) $m[1]);
            return true;
        }
        if ($method === 'GET' && $path === '/api/sync/recent') {
            $this->syncRecentEvents();
            return true;
        }
        if ($method === 'GET' && preg_match('#^/api/debug/events/([a-z][a-z0-9_]{1,79})$#', $path, $m) === 1) {
            $this->debugEventsForSport((string) $m[1]);
            return true;
        }
        if ($method === 'GET' && preg_match('#^/api/debug/event-markets/([a-z][a-z0-9_]{1,79})/([A-Za-z0-9._-]{1,128})$#', $path, $m) === 1) {
            $this->debugEventMarkets((string) $m[1], (string) $m[2]);
            return true;
        }
        if ($method === 'POST' && preg_match('#^/api/admin/odds/participants/([a-z][a-z0-9_]{1,79})$#', $path, $m) === 1) {
            $this->syncParticipants((string) $m[1]);
            return true;
        }
        // NOTE: the Rundown outrights sync endpoints (/api/admin/odds/outrights/
        // {sportKey} + /api/admin/odds/outright-sports) were retired 2026-07-05
        // with the rest of the Rundown futures pipeline — The Odds API is the
        // sole futures source (OddsApiSyncService::syncOutrights). The
        // provider-agnostic settle/void routes below are unchanged.
        if ($method === 'GET' && $path === '/api/admin/rundown-catalog-audit') {
            $this->rundownCatalogAudit();
            return true;
        }
        if ($method === 'GET' && preg_match('#^/api/admin/odds/historical/odds/([a-z][a-z0-9_]{1,79})$#', $path, $m) === 1) {
            $this->historicalOdds((string) $m[1]);
            return true;
        }
        if ($method === 'GET' && preg_match('#^/api/admin/odds/historical/events/([a-z][a-z0-9_]{1,79})$#', $path, $m) === 1) {
            $this->historicalEvents((string) $m[1]);
            return true;
        }
        if ($method === 'GET' && preg_match('#^/api/admin/odds/historical/event-odds/([a-z][a-z0-9_]{1,79})/([A-Za-z0-9._-]{1,128})$#', $path, $m) === 1) {
            $this->historicalEventOdds((string) $m[1], (string) $m[2]);
            return true;
        }
        if ($method === 'GET' && preg_match('#^/api/admin/odds/historical/event-markets/([a-z][a-z0-9_]{1,79})/([A-Za-z0-9._-]{1,128})$#', $path, $m) === 1) {
            $this->historicalEventMarkets((string) $m[1], (string) $m[2]);
            return true;
        }
        if ($method === 'GET' && $path === '/api/admin/outrights') {
            $this->listAdminOutrights();
            return true;
        }
        if ($method === 'POST' && preg_match('#^/api/admin/outrights/([a-f0-9]{24})/settle$#', $path, $m) === 1) {
            $this->settleOutright((string) $m[1]);
            return true;
        }
        if ($method === 'POST' && preg_match('#^/api/admin/outrights/([a-f0-9]{24})/void$#', $path, $m) === 1) {
            $this->voidOutright((string) $m[1]);
            return true;
        }
        if ($method === 'GET' && preg_match('#^/api/admin/matches/([a-f0-9]{24})/lines$#', $path, $m) === 1) {
            $this->getMatchLines((string) $m[1]);
            return true;
        }
        if ($method === 'POST' && preg_match('#^/api/admin/matches/([a-f0-9]{24})/line-override$#', $path, $m) === 1) {
            $this->setLineOverride((string) $m[1]);
            return true;
        }
        if ($method === 'POST' && preg_match('#^/api/admin/matches/([a-f0-9]{24})/line-override/release$#', $path, $m) === 1) {
            $this->releaseLineOverride((string) $m[1]);
            return true;
        }
        if ($method === 'GET' && $path === '/api/admin/card-bets') {
            $this->listAdminCardBets();
            return true;
        }
        if ($method === 'POST' && preg_match('#^/api/admin/card-bets/([a-f0-9]{24})/grade$#', $path, $m) === 1) {
            $this->gradeAdminCardBet((string) $m[1]);
            return true;
        }
        if ($method === 'POST' && $path === '/api/admin/manual-bets') {
            $this->placeAdminManualBet();
            return true;
        }
        if ($method === 'GET' && $path === '/api/admin/manual-bets') {
            $this->listAdminManualBets();
            return true;
        }
        if ($method === 'POST' && preg_match('#^/api/admin/manual-bets/([a-f0-9]{24})/grade$#', $path, $m) === 1) {
            $this->gradeAdminManualBet((string) $m[1]);
            return true;
        }
        if ($method === 'GET' && $path === '/api/admin/bet-approvals') {
            $this->listAdminBetApprovals();
            return true;
        }
        if ($method === 'POST' && preg_match('#^/api/admin/bet-approvals/([a-f0-9]{24})/approve$#', $path, $m) === 1) {
            $this->approveAdminBet((string) $m[1]);
            return true;
        }
        if ($method === 'POST' && preg_match('#^/api/admin/bet-approvals/([a-f0-9]{24})/reject$#', $path, $m) === 1) {
            $this->rejectAdminBet((string) $m[1]);
            return true;
        }
        return false;
    }

    /**
     * Admin list of outright boards — ALL statuses (open/settled/voided),
     * independent of the public betting flag, so the operator can grade
     * while player-facing futures are dark. Includes each board's outcomes
     * (RAW AMERICAN prices — the UI converts at display) and its pending-bet
     * count so the operator sees the blast radius before settling. Read-only;
     * the default gate applies (agents may view — the settle/void triggers
     * below are strict-admin).
     */
    private function listAdminOutrights(): void
    {
        try {
            if ($this->protectAdminOnly() === null) return;
            $rows = $this->db->findMany('outrights', [], ['limit' => 300]);

            // One query for all pending-bet counts (never per-row).
            $ids = [];
            foreach (is_array($rows) ? $rows : [] as $r) {
                if (is_array($r) && ($r['id'] ?? '') !== '') {
                    $ids[] = (string) $r['id'];
                }
            }
            $pendingByOutright = [];
            if ($ids !== []) {
                $sels = $this->db->findMany('betselections', [
                    'outrightId' => ['$in' => $ids],
                    'status'     => 'pending',
                ], ['projection' => ['outrightId' => 1], 'limit' => 5000]);
                foreach (is_array($sels) ? $sels : [] as $s) {
                    $oid = is_array($s) ? (string) ($s['outrightId'] ?? '') : '';
                    if ($oid !== '') {
                        $pendingByOutright[$oid] = ($pendingByOutright[$oid] ?? 0) + 1;
                    }
                }
            }

            $out = [];
            foreach (is_array($rows) ? $rows : [] as $row) {
                if (!is_array($row)) continue;
                $outcomes = [];
                foreach ((is_array($row['bookmakers'] ?? null) ? $row['bookmakers'] : []) as $bm) {
                    if (!is_array($bm)) continue;
                    foreach ((is_array($bm['markets'] ?? null) ? $bm['markets'] : []) as $m) {
                        if (is_array($m) && ($m['key'] ?? '') === 'outrights' && is_array($m['outcomes'] ?? null)) {
                            $outcomes = $m['outcomes'];
                            break 2;
                        }
                    }
                }
                $id = (string) ($row['id'] ?? '');
                $out[] = [
                    'id'              => $id,
                    'sportKey'        => (string) ($row['sportKey'] ?? ''),
                    'eventName'       => (string) ($row['eventName'] ?? ''),
                    'commenceTime'    => (string) ($row['commenceTime'] ?? ''),
                    'status'          => (string) ($row['status'] ?? 'open'),
                    'oddsSource'      => (string) ($row['oddsSource'] ?? ''),
                    'winningOutcome'  => (string) ($row['winningOutcome'] ?? ''),
                    'voidReason'      => (string) ($row['voidReason'] ?? ''),
                    'settledAt'       => (string) ($row['settledAt'] ?? ''),
                    'outcomes'        => $outcomes, // [{name, price RAW AMERICAN}]
                    'pendingBetCount' => (int) ($pendingByOutright[$id] ?? 0),
                ];
            }
            usort($out, static fn (array $a, array $b): int =>
                ($a['status'] === 'open' ? 0 : 1) <=> ($b['status'] === 'open' ? 0 : 1)
                ?: strcmp($a['commenceTime'], $b['commenceTime']));
            Response::json(['ok' => true, 'outrights' => $out]);
        } catch (Throwable $e) {
            Response::json(['ok' => false, 'error' => $e->getMessage()], 500);
        }
    }

    /**
     * Pending card bets grouped by match — the operator's grading inbox.
     * Card bets NEVER auto-grade (no card data in any results feed), so
     * this list is the only route to settlement. Read-only; default gate
     * (agents may view — the grade trigger below is strict-admin).
     */
    private function listAdminCardBets(): void
    {
        try {
            if ($this->protectAdminOnly() === null) return;
            Response::json(['ok' => true] + CardBetGradingService::listPendingCardBets($this->db));
        } catch (Throwable $e) {
            Response::json(['ok' => false, 'error' => $e->getMessage()], 500);
        }
    }

    private function gradeAdminCardBet(string $betId): void
    {
        try {
            // Strict: grading a card bet moves money — full admin role only,
            // never an agent token (same rule as outright settle/void).
            $actor = $this->protectAdminOnly(true);
            if ($actor === null) return;
            $body = Http::jsonBody();
            $decision = is_array($body) ? strtolower(trim((string) ($body['decision'] ?? ''))) : '';
            if (!in_array($decision, ['won', 'lost', 'void'], true)) {
                Response::json(['ok' => false, 'error' => 'missing_or_invalid_decision'], 400);
                return;
            }
            $gradedBy = (string) ($actor['id'] ?? 'admin');
            Response::json(CardBetGradingService::gradeBet($this->db, $betId, $decision, $gradedBy));
        } catch (RuntimeException $e) {
            Response::json(['ok' => false, 'error' => $e->getMessage()], 400);
        } catch (Throwable $e) {
            Logger::exception($e, 'gradeAdminCardBet failed');
            Response::json(['ok' => false, 'error' => $e->getMessage()], 500);
        }
    }

    /**
     * Book a manual/write-in bet on a player's account (ManualBetService).
     * Strict admin only — this both writes a bet AND moves the player's money
     * (pending hold), so agents can never reach it, same rule as card grading
     * and outright settle/void. The service enforces requestId idempotency;
     * clients must send a fresh requestId per confirmed placement.
     */
    private function placeAdminManualBet(): void
    {
        try {
            $actor = $this->protectAdminOnly(true);
            if ($actor === null) return;
            $body = Http::jsonBody();
            if (!is_array($body)) {
                Response::json(['ok' => false, 'error' => 'invalid_body'], 400);
                return;
            }
            $result = ManualBetService::placeBet($this->db, [
                'id' => (string) ($actor['id'] ?? 'admin'),
                'role' => (string) ($actor['role'] ?? 'admin'),
                'username' => (string) ($actor['username'] ?? ''),
            ], $body, [
                'ipAddress' => IpUtils::clientIp(),
                'userAgent' => Http::header('user-agent'),
            ]);
            $status = (int) ($result['status'] ?? (!empty($result['ok']) ? 201 : 400));
            unset($result['status']);
            Response::json($result, $status);
        } catch (Throwable $e) {
            Logger::exception($e, 'placeAdminManualBet failed');
            Response::json(['ok' => false, 'error' => $e->getMessage()], 500);
        }
    }

    /**
     * Pending write-in bets — the operator's grading inbox. Manual bets NEVER
     * auto-grade (no matchId, no feed market), so this list is the only route
     * to settlement. UNLIKE the card-bets list, this one is STRICT admin —
     * the whole manual-bets feature is invisible to agent tokens by ruling
     * (2026-07-06), viewing included.
     */
    private function listAdminManualBets(): void
    {
        try {
            if ($this->protectAdminOnly(true) === null) return;
            Response::json(['ok' => true] + ManualBetGradingService::listPendingManualBets($this->db));
        } catch (Throwable $e) {
            Response::json(['ok' => false, 'error' => $e->getMessage()], 500);
        }
    }

    private function gradeAdminManualBet(string $betId): void
    {
        try {
            // Strict: grading a write-in moves money — full admin role only,
            // never an agent token (same rule as card grading).
            $actor = $this->protectAdminOnly(true);
            if ($actor === null) return;
            $body = Http::jsonBody();
            $decision = is_array($body) ? strtolower(trim((string) ($body['decision'] ?? ''))) : '';
            if (!in_array($decision, ['won', 'lost', 'void'], true)) {
                Response::json(['ok' => false, 'error' => 'missing_or_invalid_decision'], 400);
                return;
            }
            $gradedBy = (string) ($actor['id'] ?? 'admin');
            Response::json(ManualBetGradingService::gradeBet($this->db, $betId, $decision, $gradedBy));
        } catch (RuntimeException $e) {
            Response::json(['ok' => false, 'error' => $e->getMessage()], 400);
        } catch (Throwable $e) {
            Logger::exception($e, 'gradeAdminManualBet failed');
            Response::json(['ok' => false, 'error' => $e->getMessage()], 500);
        }
    }

    /** Scoped approval inbox. Admin + super/master agent may view (agents see only their downline). */
    private function listAdminBetApprovals(): void
    {
        try {
            $actor = $this->protectBetApprovalActor();
            if ($actor === null) return;
            // Read-only current-odds repricer (same pricing as /api/bets/quote,
            // zero side effects). Advisory delta for the inbox only.
            $pricer = new BetsController($this->db, $this->jwtSecret);
            $priceCurrent = static fn (array $bet): array => $pricer->quoteStoredBetCurrentOdds($bet);
            Response::json(['ok' => true] + BetApprovalService::listPendingApprovals($this->db, $actor, $priceCurrent));
        } catch (Throwable $e) {
            Response::json(['ok' => false, 'error' => $e->getMessage()], 500);
        }
    }

    private function approveAdminBet(string $betId): void
    {
        try {
            // Admin OR super/master/plain agent. The service scope-checks the
            // bet's owner against the actor's downline (agents can only approve
            // their own players; admin approves any).
            $actor = $this->protectBetApprovalActor();
            if ($actor === null) return;
            $result = BetApprovalService::approve($this->db, $betId, $actor);
            $status = (int) ($result['status'] ?? (!empty($result['ok']) ? 200 : 400));
            unset($result['status']);
            Response::json($result, $status);
        } catch (Throwable $e) {
            Logger::exception($e, 'approveAdminBet failed');
            Response::json(['ok' => false, 'error' => $e->getMessage()], 500);
        }
    }

    private function rejectAdminBet(string $betId): void
    {
        try {
            $actor = $this->protectBetApprovalActor();
            if ($actor === null) return;
            $body = Http::jsonBody();
            $reason = is_array($body) ? trim((string) ($body['reason'] ?? '')) : '';
            $result = BetApprovalService::reject($this->db, $betId, $actor, $reason);
            $status = (int) ($result['status'] ?? (!empty($result['ok']) ? 200 : 400));
            unset($result['status']);
            Response::json($result, $status);
        } catch (Throwable $e) {
            Logger::exception($e, 'rejectAdminBet failed');
            Response::json(['ok' => false, 'error' => $e->getMessage()], 500);
        }
    }

    private function settleOutright(string $outrightId): void
    {
        try {
            // Strict: settling a futures board grades every pending bet and
            // moves money — full admin role only, never an agent token.
            $actor = $this->protectAdminOnly(true);
            if ($actor === null) return;
            $body = Http::jsonBody();
            $winner = is_array($body) ? trim((string) ($body['winner'] ?? $body['winningOutcome'] ?? '')) : '';
            if ($winner === '') {
                Response::json(['ok' => false, 'error' => 'missing_winner'], 400);
                return;
            }
            $settledBy = (string) ($actor['id'] ?? 'admin');
            Response::json(OutrightSettlementService::settleOutright($this->db, $outrightId, $winner, $settledBy));
        } catch (RuntimeException $e) {
            Response::json(['ok' => false, 'error' => $e->getMessage()], 400);
        } catch (Throwable $e) {
            Logger::exception($e, 'settleOutright failed');
            Response::json(['ok' => false, 'error' => $e->getMessage()], 500);
        }
    }

    private function voidOutright(string $outrightId): void
    {
        try {
            // Strict: voiding refunds every pending bet — full admin role only.
            $actor = $this->protectAdminOnly(true);
            if ($actor === null) return;
            $body = Http::jsonBody();
            $reason = is_array($body) ? trim((string) ($body['reason'] ?? '')) : '';
            $settledBy = (string) ($actor['id'] ?? 'admin');
            Response::json(OutrightSettlementService::voidOutright($this->db, $outrightId, $reason, $settledBy));
        } catch (RuntimeException $e) {
            Response::json(['ok' => false, 'error' => $e->getMessage()], 400);
        } catch (Throwable $e) {
            Logger::exception($e, 'voidOutright failed');
            Response::json(['ok' => false, 'error' => $e->getMessage()], 500);
        }
    }

    /**
     * GET /api/admin/matches/{id}/lines — the overridable markets for a match
     * (moneyline / spread / total) with the CURRENT feed value and any active
     * manual override + its lock info, so the admin sees what they're changing
     * from. Strict admin only. Prices are AMERICAN (the pricing unit).
     */
    private function getMatchLines(string $matchId): void
    {
        try {
            $actor = $this->protectAdminOnly(true);
            if ($actor === null) return;

            $match = $this->db->findOne('matches', ['id' => $matchId]);
            if ($match === null) {
                Response::json(['ok' => false, 'error' => 'match_not_found'], 404);
                return;
            }
            $home = (string) ($match['homeTeam'] ?? '');
            $away = (string) ($match['awayTeam'] ?? '');
            $overrides = is_array($match['manualOdds'] ?? null) ? $match['manualOdds'] : [];

            // Index overrides by (market|name) for a quick per-outcome lookup.
            $ovByKey = [];
            foreach ($overrides as $e) {
                if (!is_array($e)) continue;
                $ovByKey[strtolower((string) ($e['market'] ?? '')) . '|' . (string) ($e['name'] ?? '')] = $e;
            }

            $labels = ['h2h' => 'Moneyline', 'spreads' => 'Spread', 'totals' => 'Total'];
            $markets = [];
            foreach (ManualOddsOverlay::OVERRIDABLE_MARKETS as $mkey) {
                // Representative current feed outcomes from the first book that
                // carries this market (the main line is consistent across books;
                // an override is stamped on all of them anyway).
                $feedOutcomes = $this->firstBookMarketOutcomes($match, $mkey);
                if ($feedOutcomes === []) continue;

                $rows = [];
                foreach ($feedOutcomes as $o) {
                    if (!is_array($o)) continue;
                    $name = (string) ($o['name'] ?? '');
                    if ($name === '') continue;
                    $side = $mkey === 'totals'
                        ? (stripos($name, 'under') !== false ? 'under' : 'over')
                        : ($name === $home ? 'home' : ($name === $away ? 'away' : ''));
                    $ov = $ovByKey[$mkey . '|' . $name] ?? null;

                    $feedPrice = isset($o['price']) && is_numeric($o['price']) ? (float) $o['price'] : null;
                    $rows[] = [
                        'name'             => $name,
                        'side'             => $side,
                        'feedPoint'        => $ov !== null ? ($ov['feedPoint'] ?? null) : (isset($o['point']) && is_numeric($o['point']) ? (float) $o['point'] : null),
                        'feedAmerican'     => $ov !== null
                            ? (isset($ov['feedPrice']) && is_numeric($ov['feedPrice']) ? SportsbookBetSupport::decimalToAmericanInt((float) $ov['feedPrice']) : null)
                            : ($feedPrice !== null ? SportsbookBetSupport::decimalToAmericanInt($feedPrice) : null),
                        'overridden'       => $ov !== null,
                        'overridePoint'    => $ov !== null ? ($ov['point'] ?? null) : null,
                        'overrideAmerican' => ($ov !== null && isset($ov['price']) && is_numeric($ov['price']))
                            ? SportsbookBetSupport::decimalToAmericanInt((float) $ov['price']) : null,
                        'lockedBy'         => $ov['lockedByName'] ?? ($ov['lockedBy'] ?? null),
                        'lockedAt'         => $ov['lockedAt'] ?? null,
                    ];
                }
                if ($rows !== []) {
                    $markets[] = ['market' => $mkey, 'label' => $labels[$mkey], 'outcomes' => $rows];
                }
            }

            Response::json([
                'ok'    => true,
                'match' => [
                    'id' => $matchId, 'homeTeam' => $home, 'awayTeam' => $away,
                    'sportKey' => $match['sportKey'] ?? null, 'status' => $match['status'] ?? null,
                    'startTime' => $match['startTime'] ?? null,
                ],
                'markets' => $markets,
            ]);
        } catch (Throwable $e) {
            Logger::exception($e, 'getMatchLines failed');
            Response::json(['ok' => false, 'error' => $e->getMessage()], 500);
        }
    }

    /**
     * Outcomes of a market from the first book that carries it.
     *
     * @param array<string,mixed> $match
     * @return list<array<string,mixed>>
     */
    private function firstBookMarketOutcomes(array $match, string $marketKey): array
    {
        foreach (($match['odds']['bookmakers'] ?? []) as $book) {
            if (!is_array($book)) continue;
            foreach (($book['markets'] ?? []) as $mk) {
                if (is_array($mk) && strtolower((string) ($mk['key'] ?? '')) === $marketKey
                    && is_array($mk['outcomes'] ?? null) && $mk['outcomes'] !== []) {
                    return $mk['outcomes'];
                }
            }
        }
        return [];
    }

    /**
     * POST /api/admin/matches/{id}/line-override — set a manual line on a
     * match's moneyline / spread / total (money-affecting: it changes what
     * players can bet and win). Strict admin only. Body:
     *   { market: 'h2h'|'spreads'|'totals',
     *     entries: [ { name, side, point?, price } ] }   // price = AMERICAN
     * Spread/total callers send BOTH sides (no implicit mirroring). The value
     * is stored VERBATIM (never juice-rounded — the admin is the pricer),
     * materialized onto every book via the overlay gate, and survives feed
     * refreshes via carryForwardManualOdds. Every override is audit-logged.
     */
    private function setLineOverride(string $matchId): void
    {
        try {
            $actor = $this->protectAdminOnly(true);
            if ($actor === null) return;

            $body   = Http::jsonBody();
            $market = strtolower(trim((string) ($body['market'] ?? '')));
            $rows   = is_array($body['entries'] ?? null) ? $body['entries'] : [];
            if (!in_array($market, ManualOddsOverlay::OVERRIDABLE_MARKETS, true)) {
                Response::json(['ok' => false, 'error' => 'unsupported_market'], 400);
                return;
            }
            if ($rows === []) {
                Response::json(['ok' => false, 'error' => 'no_entries'], 400);
                return;
            }

            $match = $this->db->findOne('matches', ['id' => $matchId]);
            if ($match === null) {
                Response::json(['ok' => false, 'error' => 'match_not_found'], 404);
                return;
            }

            $now      = SqlRepository::nowUtc();
            $actorId  = (string) ($actor['id'] ?? '');
            $actorU   = (string) ($actor['username'] ?? '');
            $newEntries = [];
            $auditNew   = [];
            $auditOld   = [];

            foreach ($rows as $row) {
                if (!is_array($row)) continue;
                $name = trim((string) ($row['name'] ?? ''));
                if ($name === '' || !isset($row['price']) || !is_numeric($row['price'])) {
                    Response::json(['ok' => false, 'error' => 'invalid_entry'], 400);
                    return;
                }
                // Snapshot the current feed value for this outcome (audit +
                // release restore) and confirm the outcome actually exists.
                $feed = $this->findOutcomeInOdds($match, $market, $name);
                if ($feed === null) {
                    Response::json(['ok' => false, 'error' => 'outcome_not_on_board:' . $name], 400);
                    return;
                }
                $american = (int) round((float) $row['price']);
                $priceDec = SportsbookBetSupport::americanToDecimalExact($american);
                $point    = ($market === 'h2h' || !isset($row['point']) || !is_numeric($row['point']))
                    ? null : (float) $row['point'];

                $newEntries[] = [
                    'market'    => $market,
                    'name'      => $name,
                    'side'      => (string) ($row['side'] ?? ''),
                    'pid'       => $feed['pid'] ?? null,
                    'point'     => $point,
                    'price'     => $priceDec,
                    'feedPoint' => $feed['point'],
                    'feedPrice' => $feed['price'],
                    'lockedBy'  => $actorId,
                    'lockedByName' => $actorU,
                    'lockedAt'  => $now,
                ];
                $auditNew[] = ['name' => $name, 'point' => $point, 'american' => $american];
                $auditOld[] = ['name' => $name, 'point' => $feed['point'], 'price' => $feed['price']];
            }

            // Merge: replace any existing entries for the same (market, name),
            // keep overrides on other markets/outcomes.
            $existing = is_array($match['manualOdds'] ?? null) ? $match['manualOdds'] : [];
            $replacedKeys = [];
            foreach ($newEntries as $e) {
                $replacedKeys[$e['market'] . '|' . $e['name']] = true;
            }
            $merged = [];
            foreach ($existing as $e) {
                if (!is_array($e)) continue;
                $key = strtolower((string) ($e['market'] ?? '')) . '|' . (string) ($e['name'] ?? '');
                if (!isset($replacedKeys[$key])) $merged[] = $e;
            }
            foreach ($newEntries as $e) $merged[] = $e;

            // Materialize onto the stored odds via the single overlay gate.
            $match['manualOdds'] = $merged;
            $match = ManualOddsOverlay::apply($match);
            $this->db->updateOne('matches', ['id' => $matchId], [
                'manualOdds' => $merged,
                'odds'       => $match['odds'],
            ]);

            $this->logLineOverride('line_override', $actor, $matchId, $market, $auditOld, $auditNew);
            Response::json(['ok' => true, 'matchId' => $matchId, 'market' => $market, 'entries' => $newEntries]);
        } catch (RuntimeException $e) {
            Response::json(['ok' => false, 'error' => $e->getMessage()], 400);
        } catch (Throwable $e) {
            Logger::exception($e, 'setLineOverride failed');
            Response::json(['ok' => false, 'error' => $e->getMessage()], 500);
        }
    }

    /**
     * POST /api/admin/matches/{id}/line-override/release — clear the manual
     * override on a market and restore the feed value immediately (not waiting
     * for the next worker sync). Strict admin only; audit-logged. Body:
     *   { market: 'h2h'|'spreads'|'totals' }
     */
    private function releaseLineOverride(string $matchId): void
    {
        try {
            $actor = $this->protectAdminOnly(true);
            if ($actor === null) return;

            $body   = Http::jsonBody();
            $market = strtolower(trim((string) ($body['market'] ?? '')));
            if (!in_array($market, ManualOddsOverlay::OVERRIDABLE_MARKETS, true)) {
                Response::json(['ok' => false, 'error' => 'unsupported_market'], 400);
                return;
            }
            $match = $this->db->findOne('matches', ['id' => $matchId]);
            if ($match === null) {
                Response::json(['ok' => false, 'error' => 'match_not_found'], 404);
                return;
            }
            $existing = is_array($match['manualOdds'] ?? null) ? $match['manualOdds'] : [];
            $released = [];
            $kept     = [];
            foreach ($existing as $e) {
                if (is_array($e) && strtolower((string) ($e['market'] ?? '')) === $market) {
                    $released[] = $e;
                } else {
                    $kept[] = $e;
                }
            }
            if ($released === []) {
                Response::json(['ok' => false, 'error' => 'no_override_for_market'], 400);
                return;
            }
            // Restore feed values on the released outcomes immediately.
            $match['manualOdds'] = $kept;
            $match = ManualOddsOverlay::restoreFeed($match, $released);
            $this->db->updateOne('matches', ['id' => $matchId], [
                'manualOdds' => $kept,
                'odds'       => $match['odds'],
            ]);

            $auditOld = array_map(static fn (array $e): array => [
                'name' => $e['name'] ?? '', 'point' => $e['point'] ?? null, 'price' => $e['price'] ?? null,
            ], $released);
            $this->logLineOverride('line_override_release', $actor, $matchId, $market, $auditOld, []);
            Response::json(['ok' => true, 'matchId' => $matchId, 'market' => $market, 'released' => count($released)]);
        } catch (RuntimeException $e) {
            Response::json(['ok' => false, 'error' => $e->getMessage()], 400);
        } catch (Throwable $e) {
            Logger::exception($e, 'releaseLineOverride failed');
            Response::json(['ok' => false, 'error' => $e->getMessage()], 500);
        }
    }

    /**
     * Locate an outcome in a match's stored odds by (market key, outcome name)
     * across all books; returns its current feed point/price/pid for the audit
     * snapshot, or null when the outcome isn't on the board.
     *
     * @param array<string,mixed> $match
     * @return array{point:?float,price:?float,pid:mixed}|null
     */
    private function findOutcomeInOdds(array $match, string $market, string $name): ?array
    {
        $books = $match['odds']['bookmakers'] ?? null;
        if (!is_array($books)) return null;
        foreach ($books as $book) {
            if (!is_array($book) || !is_array($book['markets'] ?? null)) continue;
            foreach ($book['markets'] as $mk) {
                if (!is_array($mk) || strtolower((string) ($mk['key'] ?? '')) !== $market) continue;
                foreach (($mk['outcomes'] ?? []) as $o) {
                    if (is_array($o) && (string) ($o['name'] ?? '') === $name) {
                        return [
                            'point' => isset($o['point']) && is_numeric($o['point']) ? (float) $o['point'] : null,
                            'price' => isset($o['price']) && is_numeric($o['price']) ? (float) $o['price'] : null,
                            'pid'   => $o['pid'] ?? null,
                        ];
                    }
                }
            }
        }
        return null;
    }

    /**
     * Audit every line override + release (money-affecting manual action):
     * who, when, market, old feed value(s), new value(s).
     *
     * @param array<string,mixed>       $actor
     * @param list<array<string,mixed>> $oldValues
     * @param list<array<string,mixed>> $newValues
     */
    private function logLineOverride(string $action, array $actor, string $matchId, string $market, array $oldValues, array $newValues): void
    {
        try {
            $this->db->insertOne('admin_audit_log', [
                'action'        => $action,
                'actorId'       => (string) ($actor['id'] ?? ''),
                'actorUsername' => (string) ($actor['username'] ?? ''),
                'actorRole'     => (string) ($actor['role'] ?? ''),
                'targetId'      => $matchId,
                'market'        => $market,
                'oldValue'      => $oldValues,
                'newValue'      => $newValues,
                'ip'            => IpUtils::clientIp(),
                'timestamp'     => time(),
                'createdAt'     => SqlRepository::nowUtc(),
            ]);
        } catch (Throwable $e) {
            // Never let an audit-write failure abort the override response, but
            // do surface it in the logs — a missing audit row on a money action
            // is itself an incident to investigate.
            Logger::exception($e, 'logLineOverride failed');
        }
    }

    /**
     * Historical odds for a sport on a given date — re-pulls the
     * /sports/{id}/events/{date} snapshot (returns events with markets
     * as Rundown saw them on that date). Rundown bills historical
     * snapshots as data points; admin-only.
     */
    private function historicalOdds(string $sportKey): void
    {
        try {
            if ($this->protectAdminOnly() === null) return;
            $date = (string) ($_GET['date'] ?? '');
            if ($date === '') { Response::json(['ok' => false, 'error' => 'missing_date'], 400); return; }
            $sportId = RundownSportMap::sportKeyToSportId($sportKey);
            if ($sportId === null) {
                Response::json(['ok' => false, 'error' => 'unmapped_sport_key'], 400);
                return;
            }
            $markets = isset($_GET['markets']) ? (string) $_GET['markets'] : RundownMarketMap::csvForCore();
            $params  = ['market_ids' => $markets, 'main_line' => 'true'];
            $resp = RundownClient::getEventsForSport($sportId, $date, $params);
            Response::json([
                'ok' => true,
                'sportKey' => $sportKey,
                'sportId'  => $sportId,
                'date'     => $date,
                'events'   => is_array($resp['events'] ?? null) ? $resp['events'] : [],
                'meta'     => is_array($resp['meta'] ?? null) ? $resp['meta'] : new stdClass(),
            ]);
        } catch (Throwable $e) {
            Response::json(['ok' => false, 'error' => $e->getMessage()], 500);
        }
    }

    /**
     * Historical event listing for a sport on a given date. Uses the
     * same /sports/{id}/events/{date} endpoint but projects events
     * without market detail for a lighter payload.
     */
    private function historicalEvents(string $sportKey): void
    {
        try {
            if ($this->protectAdminOnly() === null) return;
            $date = (string) ($_GET['date'] ?? '');
            if ($date === '') { Response::json(['ok' => false, 'error' => 'missing_date'], 400); return; }
            $sportId = RundownSportMap::sportKeyToSportId($sportKey);
            if ($sportId === null) {
                Response::json(['ok' => false, 'error' => 'unmapped_sport_key'], 400);
                return;
            }
            // hide_no_markets=false so historical events without books posted
            // still appear (admin retrospection may want events with empty markets).
            $resp = RundownClient::getEventsForSport($sportId, $date, ['hide_no_markets' => 'false']);
            $events = is_array($resp['events'] ?? null) ? $resp['events'] : [];
            $projected = array_map(static function ($e) {
                if (!is_array($e)) return null;
                $score = is_array($e['score'] ?? null) ? $e['score'] : [];
                $teams = is_array($e['teams'] ?? null) ? $e['teams'] : [];
                return [
                    'event_id'   => (string) ($e['event_id'] ?? ''),
                    'event_date' => (string) ($e['event_date'] ?? ''),
                    'status'     => (string) ($score['event_status'] ?? ''),
                    'teams'      => array_map(static fn ($t) => is_array($t) ? [
                        'name'         => (string) ($t['name'] ?? ''),
                        'abbreviation' => (string) ($t['abbreviation'] ?? ''),
                        'is_home'      => (bool)   ($t['is_home'] ?? false),
                    ] : null, $teams),
                ];
            }, $events);
            Response::json([
                'ok' => true,
                'sportKey' => $sportKey,
                'sportId'  => $sportId,
                'date'     => $date,
                'events'   => array_values(array_filter($projected, static fn ($v) => $v !== null)),
            ]);
        } catch (Throwable $e) {
            Response::json(['ok' => false, 'error' => $e->getMessage()], 500);
        }
    }

    /**
     * Price history for one event (line-movement analysis).
     * Uses /events/{id}/markets/history with optional from/to RFC3339 range.
     */
    private function historicalEventOdds(string $sportKey, string $eventId): void
    {
        try {
            if ($this->protectAdminOnly() === null) return;
            $date = (string) ($_GET['date'] ?? '');
            if ($date === '') { Response::json(['ok' => false, 'error' => 'missing_date'], 400); return; }
            $params = ['market_ids' => isset($_GET['markets']) ? (string) $_GET['markets'] : RundownMarketMap::csvForCore()];
            if (isset($_GET['from'])) $params['from'] = (string) $_GET['from'];
            if (isset($_GET['to']))   $params['to']   = (string) $_GET['to'];
            $params['limit'] = max(1, min(5000, (int) ($_GET['limit'] ?? 1000)));
            $resp = RundownClient::getEventMarketHistory($eventId, $params);
            Response::json([
                'ok' => true,
                'sportKey' => $sportKey,
                'eventId'  => $eventId,
                'meta'     => is_array($resp['meta'] ?? null) ? $resp['meta'] : new stdClass(),
                'history'  => is_array($resp['history'] ?? null) ? $resp['history'] : [],
            ]);
        } catch (Throwable $e) {
            Response::json(['ok' => false, 'error' => $e->getMessage()], 500);
        }
    }

    /**
     * Per-event market catalog — same /events/{id}/markets/history endpoint,
     * grouped by (market_id, affiliate_id) for the admin "which books
     * actually moved this line?" view.
     */
    private function historicalEventMarkets(string $sportKey, string $eventId): void
    {
        try {
            if ($this->protectAdminOnly() === null) return;
            $date = (string) ($_GET['date'] ?? '');
            if ($date === '') { Response::json(['ok' => false, 'error' => 'missing_date'], 400); return; }
            $params = ['limit' => max(1, min(5000, (int) ($_GET['limit'] ?? 5000)))];
            if (isset($_GET['from'])) $params['from'] = (string) $_GET['from'];
            if (isset($_GET['to']))   $params['to']   = (string) $_GET['to'];
            $resp = RundownClient::getEventMarketHistory($eventId, $params);
            $history = is_array($resp['history'] ?? null) ? $resp['history'] : [];
            $byMarket = [];
            foreach ($history as $row) {
                if (!is_array($row)) continue;
                $mid = (int) ($row['market_id'] ?? 0);
                $aid = (int) ($row['affiliate_id'] ?? 0);
                $byMarket[$mid][$aid][] = $row;
            }
            Response::json([
                'ok' => true,
                'sportKey' => $sportKey,
                'eventId'  => $eventId,
                'byMarket' => $byMarket,
                'meta'     => is_array($resp['meta'] ?? null) ? $resp['meta'] : new stdClass(),
            ]);
        } catch (Throwable $e) {
            Response::json(['ok' => false, 'error' => $e->getMessage()], 500);
        }
    }

    private function syncParticipants(string $sportKey): void
    {
        try {
            if ($this->protectAdminOnly() === null) return;
            $sportId = RundownSportMap::sportKeyToSportId($sportKey);
            if ($sportId === null) {
                Response::json(['ok' => false, 'error' => 'unmapped_sport_key'], 400);
                return;
            }
            $resp = RundownClient::getTeamsForSport($sportId);
            if (!is_array($resp)) {
                Response::json(['ok' => false, 'error' => 'rundown_not_configured'], 503);
                return;
            }
            $teams = is_array($resp['teams'] ?? null) ? $resp['teams'] : [];
            Response::json([
                'ok' => true,
                'sportKey' => $sportKey,
                'sportId'  => $sportId,
                'teamCount' => count($teams),
            ]);
        } catch (Throwable $e) {
            Response::json(['ok' => false, 'error' => $e->getMessage()], 500);
        }
    }

    private function debugEventsForSport(string $sportKey): void
    {
        try {
            if ($this->protectAdminOnly() === null) return;
            $sportId = RundownSportMap::sportKeyToSportId($sportKey);
            if ($sportId === null) {
                Response::json(['ok' => false, 'error' => 'unmapped_sport_key'], 400);
                return;
            }
            $offsetMin = (int) Env::get('RUNDOWN_DATE_OFFSET_MINUTES', '300');
            $date = (string) ($_GET['date'] ?? gmdate('Y-m-d', time() - $offsetMin * 60));
            $resp = RundownClient::getEventsForSport($sportId, $date, [
                'market_ids' => RundownMarketMap::csvForCore(),
                'main_line'  => 'true',
                'offset'     => $offsetMin,
            ]);
            Response::json([
                'ok' => true,
                'sportKey' => $sportKey,
                'sportId' => $sportId,
                'date' => $date,
                'eventCount' => is_array($resp['events'] ?? null) ? count($resp['events']) : 0,
                'deltaLastId' => $resp['meta']['delta_last_id'] ?? null,
            ]);
        } catch (Throwable $e) {
            Response::json(['ok' => false, 'error' => $e->getMessage()], 500);
        }
    }

    private function debugEventMarkets(string $sportKey, string $eventId): void
    {
        try {
            if ($this->protectAdminOnly() === null) return;
            $resp = RundownClient::getEvent($eventId, ['market_ids' => RundownMarketMap::csvForCore(), 'main_line' => 'true']);
            if (!is_array($resp)) {
                Response::json(['ok' => false, 'error' => 'rundown_not_configured'], 503);
                return;
            }
            $events = is_array($resp['events'] ?? null) ? $resp['events'] : [];
            $event  = $events[0] ?? null;
            $markets = is_array($event['markets'] ?? null) ? $event['markets'] : [];
            $summary = [];
            foreach ($markets as $m) {
                if (!is_array($m)) continue;
                $summary[] = [
                    'market_id' => (int) ($m['market_id'] ?? 0),
                    'period_id' => (int) ($m['period_id'] ?? 0),
                    'name'      => (string) ($m['name'] ?? ''),
                    'participants' => count(is_array($m['participants'] ?? null) ? $m['participants'] : []),
                ];
            }
            Response::json(['ok' => true, 'eventId' => $eventId, 'markets' => $summary]);
        } catch (Throwable $e) {
            Response::json(['ok' => false, 'error' => $e->getMessage()], 500);
        }
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

    private function sportsApiSmokeTest(): void
    {
        try {
            $actor = $this->protectAdminOnly();
            if ($actor === null) {
                return;
            }

            if (!RundownClient::isConfigured()) {
                Response::json([
                    'ok' => false,
                    'configured' => false,
                    'error' => 'RUNDOWN_API_KEY is not set',
                ], 503);
                return;
            }
            try {
                $sports = RundownClient::getSports();
                $count  = is_array($sports['sports'] ?? null) ? count($sports['sports']) : 0;
                Response::json([
                    'ok'         => true,
                    'configured' => true,
                    'sportsListed' => $count,
                    'quota'      => RundownClient::latestQuotaSnapshot(),
                ]);
            } catch (Throwable $e) {
                Response::json([
                    'ok' => false,
                    'configured' => true,
                    'error' => $e->getMessage(),
                ], 502);
            }
        } catch (Throwable $e) {
            Logger::exception($e, 'Sports API smoke test error');
            Response::json(['ok' => false, 'error' => $e->getMessage()], 500);
        }
    }

    /**
     * GET /api/admin/rundown-catalog-audit
     *
     * One-shot diagnostic to catch drift between Rundown's current sport
     * catalog and what we have hard-coded in RundownSportMap. Run it
     * after Rundown announces a new sport or when the sidebar feels
     * thin and we want to confirm we're not silently missing coverage.
     *
     * Returns three buckets keyed by sport_id:
     *   mapped            — present upstream AND in our forward map
     *   unmapped_upstream — present upstream but missing from the map
     *                       (would need a row added to RundownSportMap
     *                       + a child in frontend/src/data/sportsData.js)
     *   unused_in_map     — in our map but NOT returned by upstream
     *                       (likely retired or seasonal — informational,
     *                       removing risks losing playoff/preseason coverage)
     *
     * Admin-only. Idempotent. ~1 Rundown credit per call.
     */
    private function rundownCatalogAudit(): void
    {
        try {
            $actor = $this->protectAdminOnly();
            if ($actor === null) return;

            if (!RundownClient::isConfigured()) {
                Response::json([
                    'ok' => false,
                    'configured' => false,
                    'error' => 'RUNDOWN_API_KEY is not set',
                ], 503);
                return;
            }

            $resp = RundownClient::getSports();
            $upstream = is_array($resp['sports'] ?? null) ? $resp['sports'] : [];

            // Normalize upstream into sport_id => sport_name.
            $upstreamById = [];
            foreach ($upstream as $entry) {
                if (!is_array($entry)) continue;
                $sid = $entry['sport_id'] ?? null;
                if (!is_numeric($sid)) continue;
                $upstreamById[(int) $sid] = (string) ($entry['sport_name'] ?? '');
            }

            $mappedIds = RundownSportMap::allSupportedSportIds();
            $mappedSet = array_flip($mappedIds);

            $mapped = [];
            $unmappedUpstream = [];
            foreach ($upstreamById as $sid => $name) {
                $row = [
                    'sport_id'       => $sid,
                    'upstream_name'  => $name,
                ];
                if (isset($mappedSet[$sid])) {
                    $row['sport_key'] = RundownSportMap::sportIdToSportKey($sid);
                    $row['display_name'] = RundownSportMap::displayName($sid);
                    $mapped[] = $row;
                } else {
                    $unmappedUpstream[] = $row;
                }
            }

            $unusedInMap = [];
            foreach ($mappedIds as $sid) {
                if (!isset($upstreamById[$sid])) {
                    $unusedInMap[] = [
                        'sport_id'    => $sid,
                        'sport_key'   => RundownSportMap::sportIdToSportKey($sid),
                        'display_name'=> RundownSportMap::displayName($sid),
                    ];
                }
            }

            Response::json([
                'ok'                => true,
                'configured'        => true,
                'upstream_count'    => count($upstreamById),
                'mapped_count'      => count($mapped),
                'unmapped_upstream' => $unmappedUpstream,
                'unused_in_map'     => $unusedInMap,
                'mapped'            => $mapped,
                'quota'             => RundownClient::latestQuotaSnapshot(),
            ]);
        } catch (Throwable $e) {
            Logger::exception($e, 'rundownCatalogAudit failed');
            Response::json(['ok' => false, 'error' => $e->getMessage()], 502);
        }
    }

    /**
     * Cron-callable pre-match sync. Hostinger cron line:
     *   *\/5 * * * * curl -fsS -X POST -H "X-Tick-Secret: $SECRET" \
     *     https://bettorplays247.com/api/internal/prematch-tick \
     *     > /dev/null 2>&1
     *
     * Rotates through configured sports (PREMATCH_MAX_SPORTS_PER_TICK at a
     * time) so all are covered within a few ticks regardless of how many
     * sports are configured. Cursor stored in SharedFileCache.
     */
    private function prematchTick(): void
    {
        $gate = $this->authorizeAndGuardTick('prematch');
        if ($gate !== null) {
            return;
        }
        $tickLogId = $this->logTickStart('prematch');
        try {
            $start = microtime(true);
            $sports = self::resolveAllConfiguredSports();
            $maxPerTick = max(1, (int) Env::get('PREMATCH_MAX_SPORTS_PER_TICK', '8'));
            $batch = self::nextRotationBatch($sports, $maxPerTick);

            $perSport = [];
            $totalUpdated = 0;
            $errors = 0;
            $apiCalls = 0;
            foreach ($batch as $sportKey) {
                $sportId = RundownSportMap::sportKeyToSportId($sportKey);
                if ($sportId === null) {
                    $perSport[$sportKey] = ['updated' => 0, 'skipped' => 'unmapped_sport'];
                    continue;
                }
                $result = RundownSyncService::syncSportPrematch($this->db, $sportKey, $sportId);
                $apiCalls += (int) ($result['daysCovered'] ?? 0);
                $totalUpdated += (int) ($result['created'] ?? 0) + (int) ($result['updated'] ?? 0);
                $errors += (int) ($result['errors'] ?? 0);
                $perSport[$sportKey] = [
                    'updated'    => (int) ($result['created'] ?? 0) + (int) ($result['updated'] ?? 0),
                    'eventsSeen' => (int) ($result['eventsSeen'] ?? 0),
                    'created'    => (int) ($result['created'] ?? 0),
                    'errors'     => (int) ($result['errors'] ?? 0),
                ];
                if (isset($result['skipped'])) {
                    $perSport[$sportKey]['skipped'] = (string) $result['skipped'];
                }
            }

            // Bump cursor so the next tick picks up where we left off.
            self::advanceRotationCursor($sports, count($batch));

            // Extended sync — pull props + period + alt markets for the
            // same rotation batch. Default-on via ODDS_EXTENDED_SYNC_ENABLED.
            // Heavier on data points than core sync; opt out by setting
            // ODDS_EXTENDED_SYNC_ENABLED=false in env.
            $extended = null;
            $extendedEnabled = strtolower((string) Env::get('ODDS_EXTENDED_SYNC_ENABLED', 'true')) !== 'false';
            if ($extendedEnabled) {
                $extended = [
                    'sportsTried'    => 0,
                    'eventsSeen'     => 0,
                    'updated'        => 0,
                    'propsTotal'     => 0,
                    'errors'         => 0,
                    'perSport'       => [],
                ];
                foreach ($batch as $sportKey) {
                    $sportId = RundownSportMap::sportKeyToSportId($sportKey);
                    if ($sportId === null) continue;
                    $r = RundownSyncService::syncSportFull($this->db, $sportKey, $sportId);
                    $extended['sportsTried']++;
                    $extended['eventsSeen']  += (int) ($r['eventsSeen'] ?? 0);
                    $extended['updated']     += (int) ($r['created'] ?? 0) + (int) ($r['updated'] ?? 0);
                    $extended['propsTotal']  += (int) ($r['propsTotal'] ?? 0);
                    $extended['errors']      += (int) ($r['errors'] ?? 0);
                    $extended['perSport'][$sportKey] = [
                        'eventsSeen' => (int) ($r['eventsSeen'] ?? 0),
                        'propsTotal' => (int) ($r['propsTotal'] ?? 0),
                        'errors'     => (int) ($r['errors'] ?? 0),
                    ];
                }
                SportsbookHealth::recordExtendedSyncResult($this->db, [
                    'freshMatches'    => $extended['updated'],
                    'preservedMatches' => 0,
                    'errors'          => $extended['errors'],
                    'freshBySport'    => array_map(static fn ($v) => (int) ($v['eventsSeen'] ?? 0), $extended['perSport']),
                ]);
            }

            // Settlement sweep — grade any matches that flipped to
            // `finished`/`canceled` since the last cron run. On Hostinger
            // the long-running odds-worker doesn't run, and syncSingleSport
            // above intentionally skips settlement, so this is the system
            // -wide grading cadence. Cheap when no pending bets are on
            // finished matches (no DB writes). Failures are non-fatal —
            // the tick's primary job is odds sync, and getMyBets still
            // has the on-read fallback for any user who happens to look.
            $sweep = [
                'matchesChecked' => 0,
                'matchesSettled' => 0,
                'betsSettled' => 0,
                'errors' => 0,
            ];
            try {
                $sweepResult = BetSettlementService::settlePendingMatches($this->db, 250, 'cron');
                $sweep['matchesChecked'] = (int) ($sweepResult['matchesChecked'] ?? 0);
                $sweep['matchesSettled'] = (int) ($sweepResult['matchesSettled'] ?? 0);
                $sweep['betsSettled']    = (int) ($sweepResult['betsSettled'] ?? 0);
                $sweep['errors']         = (int) ($sweepResult['errors'] ?? 0);
            } catch (Throwable $sweepErr) {
                Logger::warning('prematch-tick settlement sweep failed', [
                    'error' => $sweepErr->getMessage(),
                ], 'sportsbook');
                $sweep['errors']++;
            }

            $result = [
                'sportsTried' => count($batch),
                'totalUpdated' => $totalUpdated,
                'apiCalls' => $apiCalls,
                'errors' => $errors,
                'rotation' => ['totalConfigured' => count($sports), 'cursor' => self::peekRotationCursor()],
                'perSport' => $perSport,
                'extended' => $extended,
                'settlementSweep' => $sweep,
                'elapsedMs' => (int) round((microtime(true) - $start) * 1000),
            ];
            $this->markTickRan('prematch');
            // Map shape into tick_log columns where it overlaps.
            $logResult = ['sportsTried' => $result['sportsTried'], 'updated' => $totalUpdated];
            $this->logTickFinish($tickLogId, 'ok', $logResult, null);
            Response::json(['ok' => true] + $result);
        } catch (Throwable $e) {
            Logger::exception($e, 'prematch-tick http trigger error');
            $this->logTickFinish($tickLogId, 'failed', null, $e->getMessage());
            Response::json(['ok' => false, 'error' => $e->getMessage()], 500);
        } finally {
            $this->releaseTickLock('prematch');
        }
    }

    /**
     * User-triggered Live Now refresh. Auth: either valid JWT (any role)
     * OR shared X-Tick-Secret. Refreshes live odds and returns the same
     * shape as GET /api/matches?status=live so the frontend can swap one
     * for the other transparently.
     */
    private function userLiveSync(): void
    {
        if (!$this->authorizeUserOrTickSecret()) {
            Response::json(['message' => 'Not authorized'], 401);
            return;
        }
        // Pull the calling user's id from the JWT (if present) so we can
        // also drain their pending tickets after the live sync. Tick-secret
        // callers won't have a user id — they just get the odds refresh,
        // and the cron-level settlement sweep covers system-wide grading.
        $callerUserId = self::extractJwtUserId($this->jwtSecret);
        $userMin = max(0, (int) Env::get('USER_LIVE_SYNC_MIN_INTERVAL_SECONDS', '15'));
        $throttleKey = self::clientThrottleKey('live');
        $throttled = false;

        if ($userMin > 0) {
            $entry = SharedFileCache::peek('user-sync-last', $throttleKey);
            $lastTs = is_array($entry) && isset($entry['ts']) ? (int) $entry['ts'] : 0;
            if ($lastTs > 0 && (time() - $lastTs) < $userMin) {
                $throttled = true;
            }
        }

        if (!$throttled) {
            $tickLogId = $this->logTickStart('user_live');
            $lockOk = $this->db->acquireNamedLock('live_tick_odds', 0);
            if (!$lockOk) {
                // Concurrent live tick is already running — caller still
                // gets current data, so don't fail.
                $this->logTickFinish($tickLogId, 'skipped_concurrent', null, null);
                $throttled = true;
            } else {
                try {
                    // Walk every sport that currently has at least one
                    // live or imminently-live row in the DB and refresh
                    // it from Rundown. Cheap when nothing is live (zero
                    // sports → zero upstream calls); scales with how
                    // many sports are actively in-progress.
                    $liveSports = self::distinctLiveOrSoonSportKeys($this->db);
                    $sportsTried = 0;
                    $eventsSeen  = 0;
                    $updated     = 0;
                    foreach ($liveSports as $sportKey) {
                        $sportId = RundownSportMap::sportKeyToSportId($sportKey);
                        if ($sportId === null) continue;
                        $result = RundownSyncService::syncSportLive($this->db, $sportKey, $sportId);
                        $sportsTried++;
                        $eventsSeen += (int) ($result['eventsSeen'] ?? 0);
                        $updated    += (int) ($result['created'] ?? 0) + (int) ($result['updated'] ?? 0);
                    }
                    $this->markUserSyncRan($throttleKey);
                    $this->markTickRan('live');
                    $this->logTickFinish($tickLogId, 'ok', [
                        'sportsTried' => $sportsTried,
                        'eventsSeen'  => $eventsSeen,
                        'updated'     => $updated,
                    ], null);
                } catch (Throwable $e) {
                    Logger::exception($e, 'user-live-sync error');
                    $this->logTickFinish($tickLogId, 'failed', null, $e->getMessage());
                } finally {
                    try { $this->db->releaseNamedLock('live_tick_odds'); } catch (Throwable $_) {}
                }
            }
        }

        // Per-user settlement: grade any of the caller's pending tickets
        // whose match has flipped to finished/canceled since their last
        // sweep. Runs even when the live sync above was throttled — the
        // sync's throttle is about upstream API cost, not DB writes, and
        // settlement is the time-sensitive bit for the player. Shares
        // the same 30s per-user throttle as the on-read sweep in
        // getMyBets() so the two paths don't double-sweep when both
        // fire in the same window. Fail-open: settlement issues here
        // mustn't break the live-sync response.
        if ($callerUserId !== '') {
            try {
                $sweepNs = SportsbookCache::userBetSweepNamespace();
                $sweepKey = 'sweep:' . $callerUserId;
                $recent = SharedFileCache::get($sweepNs, $sweepKey, 30);
                if ($recent === null) {
                    BetSettlementService::settlePendingMatchesForUser($this->db, $callerUserId, 'live-sync');
                    SharedFileCache::put($sweepNs, $sweepKey, ['at' => time()]);
                }
            } catch (Throwable $settleErr) {
                Logger::warning('user-live-sync settlement sweep failed', [
                    'userId' => $callerUserId,
                    'error' => $settleErr->getMessage(),
                ], 'bets');
            }
        }

        if ($throttled) {
            header('X-Sync-Throttled: 1');
        }
        // Always 200 with current live rows — UX guarantee: the user never
        // sees an error from clicking Refresh.
        Response::json(self::currentLiveRows($this->db));
    }

    /**
     * Decode the Bearer JWT (if any) and return the user id, or '' when
     * the request lacks a valid JWT (e.g. tick-secret caller). Returns
     * only after sanity-checking the id shape — settlement helpers reject
     * non-24-hex inputs anyway, so a bad token never produces DB writes.
     */
    private static function extractJwtUserId(string $jwtSecret): string
    {
        $auth = (string) Http::header('authorization');
        if (!str_starts_with($auth, 'Bearer ')) return '';
        try {
            $claims = Jwt::decode(trim(substr($auth, 7)), $jwtSecret);
        } catch (Throwable $_) {
            return '';
        }
        $sub = '';
        if (is_array($claims)) {
            $sub = (string) ($claims['id'] ?? $claims['userId'] ?? $claims['sub'] ?? '');
        }
        return preg_match('/^[a-f0-9]{24}$/i', $sub) === 1 ? $sub : '';
    }

    /**
     * User-triggered pre-match refresh for one sport. Auth: JWT (any role).
     * Per-IP per-sport 30s rate guard. Returns the freshly-synced matches
     * for that sportKey, scheduled-only.
     */
    private function userPrematchSync(string $sportKey): void
    {
        $sportKey = strtolower(trim($sportKey));
        if ($sportKey === '') {
            Response::json(['message' => 'invalid sport key'], 400);
            return;
        }
        if (!$this->authorizeUserOrTickSecret()) {
            Response::json(['message' => 'Not authorized'], 401);
            return;
        }
        $userMin = max(0, (int) Env::get('USER_PREMATCH_SYNC_MIN_INTERVAL_SECONDS', '30'));
        $throttleKey = self::clientThrottleKey('prematch:' . $sportKey);
        $throttled = false;

        if ($userMin > 0) {
            $entry = SharedFileCache::peek('user-sync-last', $throttleKey);
            $lastTs = is_array($entry) && isset($entry['ts']) ? (int) $entry['ts'] : 0;
            if ($lastTs > 0 && (time() - $lastTs) < $userMin) {
                $throttled = true;
            }
        }

        if (!$throttled) {
            $tickLogId = $this->logTickStart('user_prematch:' . $sportKey);
            try {
                $sportId = RundownSportMap::sportKeyToSportId($sportKey);
                if ($sportId === null) {
                    $this->logTickFinish($tickLogId, 'ok', ['updated' => 0, 'skipped' => 'unmapped_sport'], null);
                } else {
                    $result = RundownSyncService::syncSportPrematch($this->db, $sportKey, $sportId);
                    $this->markUserSyncRan($throttleKey);
                    $updated = (int) ($result['created'] ?? 0) + (int) ($result['updated'] ?? 0);
                    $this->logTickFinish($tickLogId, 'ok', ['updated' => $updated, 'eventsSeen' => (int) ($result['eventsSeen'] ?? 0)], null);
                }
            } catch (Throwable $e) {
                Logger::exception($e, 'user-prematch-sync error');
                $this->logTickFinish($tickLogId, 'failed', null, $e->getMessage());
            }
        }

        // Period-market seed. syncSportPrematch above only carries the
        // full-game (core) markets, so a freshly-selected sport would show
        // no per-period chips (H1/H2, Q1-Q4, P1-P3, innings, tennis sets)
        // until the slow background full-coverage rotation eventually reaches
        // it. Seed them here, on demand, so the chips appear immediately for
        // exactly the sport the user picked. Gated by a SPORT-GLOBAL throttle
        // (not per-IP) so at most one heavy 75-market fetch fires per sport
        // per interval no matter how many players select it at once. The
        // core sync keeps its own faster per-IP cadence above for fresh odds.
        $fullMin = max(0, (int) Env::get('USER_PREMATCH_FULL_MIN_INTERVAL_SECONDS', '60'));
        if ($fullMin > 0) {
            $fullKey = 'prematch-full:' . $sportKey;
            $fullEntry = SharedFileCache::peek('user-sync-last', $fullKey);
            $fullLastTs = is_array($fullEntry) && isset($fullEntry['ts']) ? (int) $fullEntry['ts'] : 0;
            if ($fullLastTs === 0 || (time() - $fullLastTs) >= $fullMin) {
                $sportId = RundownSportMap::sportKeyToSportId($sportKey);
                if ($sportId !== null) {
                    // Mark before the call so concurrent requests don't all
                    // race into the same upstream fetch.
                    $this->markUserSyncRan($fullKey);
                    $fullLogId = $this->logTickStart('user_prematch_full:' . $sportKey);
                    try {
                        $fr = RundownSyncService::syncSportFull($this->db, $sportKey, $sportId);
                        $this->logTickFinish($fullLogId, 'ok', [
                            'updated'    => (int) ($fr['created'] ?? 0) + (int) ($fr['updated'] ?? 0),
                            'eventsSeen' => (int) ($fr['eventsSeen'] ?? 0),
                            'propsTotal' => (int) ($fr['propsTotal'] ?? 0),
                        ], null);
                    } catch (Throwable $e) {
                        Logger::exception($e, 'user-prematch-full-sync error');
                        $this->logTickFinish($fullLogId, 'failed', null, $e->getMessage());
                    }
                }
            }
        }

        if ($throttled) {
            header('X-Sync-Throttled: 1');
        }
        Response::json(self::currentPrematchRows($this->db, $sportKey));
    }

    /**
     * Lightweight events tail — returns recent entries from the
     * RealtimeEventBus log file so a polling client can detect "the
     * worker wrote new data" within a couple of seconds without doing
     * the heavy /api/matches refetch on every poll.
     *
     * Designed for sub-3s polling: each request is a small file read
     * (no DB, no upstream calls) and returns immediately — there is
     * NO long-polling here, since shared PHP-FPM hosts can't tolerate
     * many held connections. Clients sit on a normal short-poll loop
     * and use the events returned to decide when to refetch /api/matches.
     *
     * Query params:
     *   * since: byte offset cursor from a previous response (default 0
     *     for first call → starts from current EOF so we don't replay
     *     the whole log on every fresh mount). The very first response
     *     advertises the current EOF as `cursor` so the next call
     *     starts from there.
     *   * channels: comma-separated channels to filter on (default:
     *     odds:sport:sync,odds:sport:score). Empty = no filter.
     *   * sports: comma-separated sport keys to filter on. Empty = no
     *     filter.
     *   * limit: cap on events returned per response (default 25, max
     *     100). Prevents a slow client from receiving a huge backlog
     *     after a long disconnect.
     *
     * Response:
     *   {
     *     "cursor": "1234567",             // byte offset for next call
     *     "events": [
     *       { "channel": "...", "payload": {...}, "timestamp": "..." }
     *     ]
     *   }
     *
     * Auth: open (same as /api/matches — anonymous-bettable views are
     * publicly readable). Cheap enough that no rate limiting is
     * strictly required, but we cap response size to bound abuse.
     */
    private function syncRecentEvents(): void
    {
        $sinceRaw = (string) Http::query('since', '');
        $channelsRaw = (string) Http::query('channels', 'odds:sport:sync,odds:sport:score');
        $sportsRaw = (string) Http::query('sports', '');
        $limit = max(1, min(100, (int) Http::query('limit', '25')));

        $channelFilter = [];
        foreach (explode(',', $channelsRaw) as $c) {
            $c = trim($c);
            if ($c !== '') {
                $channelFilter[$c] = true;
            }
        }
        $sportFilter = [];
        foreach (explode(',', $sportsRaw) as $s) {
            $s = strtolower(trim($s));
            if ($s !== '') {
                $sportFilter[$s] = true;
            }
        }

        $path = RealtimeEventBus::eventLogPath();
        if (!is_file($path)) {
            Response::json(['cursor' => '0', 'events' => []]);
            return;
        }

        $size = @filesize($path);
        if (!is_int($size)) {
            Response::json(['cursor' => '0', 'events' => []]);
            return;
        }

        // First call (`since` blank): start from current EOF so the
        // client doesn't replay the entire backlog. Subsequent calls
        // pass the cursor we returned last time.
        $sinceOffset = is_numeric($sinceRaw) ? max(0, (int) $sinceRaw) : -1;
        if ($sinceOffset === -1) {
            Response::json(['cursor' => (string) $size, 'events' => []]);
            return;
        }

        // File rotated since the client last polled (the log shrunk).
        // Reset to start so we don't skip events at the tail of the
        // new file. Worst case the client sees the first events twice
        // — they're idempotent refetch triggers, not commands.
        if ($sinceOffset > $size) {
            $sinceOffset = 0;
        }

        if ($sinceOffset >= $size) {
            // No new bytes since last poll.
            Response::json(['cursor' => (string) $size, 'events' => []]);
            return;
        }

        $handle = @fopen($path, 'rb');
        if ($handle === false) {
            Response::json(['cursor' => (string) $size, 'events' => []]);
            return;
        }

        $events = [];
        $newCursor = $sinceOffset;
        try {
            @fseek($handle, $sinceOffset);
            // Cap how much we read in one response so a long-disconnected
            // client can't flood us with megabytes of backlog. 256KB is
            // ~1000 typical events — plenty for a normal catch-up.
            $maxReadBytes = 262144;
            $buf = @fread($handle, $maxReadBytes);
            if (!is_string($buf) || $buf === '') {
                Response::json(['cursor' => (string) $size, 'events' => []]);
                return;
            }
            // Track the byte position of each line so cursor can advance
            // EXACTLY past whichever lines we processed — never past
            // lines we skipped due to the limit cap, which would lose
            // events on the next poll.
            $bytesProcessed = 0;
            $lines = explode("\n", $buf);
            $lineCount = count($lines);
            foreach ($lines as $i => $line) {
                // Last entry of explode() is the trailing partial line
                // (if any) or '' (if buf ends in \n). Either way, don't
                // count it toward processed bytes — wait for next poll
                // to read it completely.
                $isTrailing = ($i === $lineCount - 1);
                if ($isTrailing) {
                    break;
                }
                $bytesProcessed += strlen($line) + 1; // +1 for the \n
                if ($line === '') continue;
                $row = json_decode($line, true);
                if (!is_array($row)) continue;
                $channel = (string) ($row['channel'] ?? '');
                if ($channelFilter !== [] && !isset($channelFilter[$channel])) continue;
                $payload = is_array($row['payload'] ?? null) ? $row['payload'] : [];
                if ($sportFilter !== []) {
                    $sk = strtolower((string) ($payload['sport_key'] ?? ''));
                    if ($sk === '' || !isset($sportFilter[$sk])) continue;
                }
                $events[] = [
                    'channel' => $channel,
                    'payload' => $payload,
                    'timestamp' => (string) ($row['timestamp'] ?? ''),
                ];
                if (count($events) >= $limit) {
                    // Advance cursor only past this line; the rest of
                    // the buffer is left for the next poll.
                    $newCursor = $sinceOffset + $bytesProcessed;
                    break;
                }
            }
            // Didn't hit the limit — cursor advances past every complete
            // line we read.
            if (count($events) < $limit) {
                $newCursor = $sinceOffset + $bytesProcessed;
            }
        } finally {
            @fclose($handle);
        }

        Response::json([
            'cursor' => (string) $newCursor,
            'events' => $events,
        ]);
    }

    /**
     * Auth = either valid JWT (any role) OR matching X-Tick-Secret header.
     * Used by /api/sync/* endpoints which can be called by either a logged-in
     * player from the browser or by an internal cron / admin.
     */
    private function authorizeUserOrTickSecret(): bool
    {
        // Try X-Tick-Secret first (cheap, no DB hit).
        $expected = trim((string) Env::get('INTERNAL_TICK_SECRET', ''));
        $provided = trim((string) Http::header('x-tick-secret'));
        if ($expected !== '' && $provided !== '' && hash_equals($expected, $provided)) {
            return true;
        }
        // Fall back to JWT — any decoded token is enough; we don't require
        // a specific role because Live Now and pre-match listings are
        // public reads, and the throttle is enforced per-IP regardless.
        $auth = (string) Http::header('authorization');
        if (!str_starts_with($auth, 'Bearer ')) return false;
        try {
            Jwt::decode(trim(substr($auth, 7)), $this->jwtSecret);
            return true;
        } catch (Throwable $_) {
            return false;
        }
    }

    /**
     * Per-IP throttle key for user-triggered sync endpoints. Falls back to
     * a generic key if REMOTE_ADDR is missing — better than no throttle.
     */
    private static function clientThrottleKey(string $bucket): string
    {
        $ip = (string) ($_SERVER['REMOTE_ADDR'] ?? '');
        if ($ip === '') $ip = 'unknown';
        return $bucket . ':' . preg_replace('/[^a-zA-Z0-9.:_-]+/', '_', $ip);
    }

    private function markUserSyncRan(string $throttleKey): void
    {
        $payload = ['ts' => time()];
        SharedFileCache::forget('user-sync-last', $throttleKey);
        SharedFileCache::remember('user-sync-last', $throttleKey, 600, fn() => $payload);
    }

    /** Current live rows shape, mirrors /api/matches?status=live. */
    private static function currentLiveRows(SqlRepository $db): array
    {
        $rows = $db->findMany('matches', ['status' => 'live'], ['limit' => 200]);
        if (!is_array($rows)) return [];
        $now = time();
        return array_values(array_filter($rows, static function ($m) use ($now) {
            if (!is_array($m)) return false;
            $sportKey = strtolower((string) ($m['sportKey'] ?? ''));
            if ($sportKey === '') return false;
            // Hide rows from any upstream we've stopped writing to —
            // prevents stale odds-api leftovers from polluting Live Now
            // after a source switch.
            $source = strtolower((string) ($m['oddsSource'] ?? ''));
            if ($source !== '' && $source !== RundownEventMapper::ODDS_SOURCE_TAG) return false;
            $last = (string) ($m['lastOddsSyncAt'] ?? '');
            $lastTs = $last !== '' ? strtotime($last) : false;
            if ($lastTs === false) return false;
            return ($now - $lastTs) <= MatchesController::liveFreshnessSecondsForSport($sportKey);
        }));
    }

    /**
     * Sport keys with at least one row that's live OR scheduled within
     * the active polling window (default 24 h). Used by userLiveSync to
     * scope the Rundown refresh — same predicate as the daemon's delta
     * poll target so a user's manual refresh hits the same sports the
     * background worker is already tracking.
     *
     * @return list<string>
     */
    private static function distinctLiveOrSoonSportKeys(SqlRepository $db): array
    {
        $windowHours = max(1, (int) Env::get('RUNDOWN_ACTIVE_WINDOW_HOURS', '24'));
        $now = gmdate(DATE_ATOM);
        $soon = gmdate(DATE_ATOM, time() + ($windowHours * 3600));
        $live = $db->findMany('matches', ['status' => 'live'], ['projection' => ['sportKey' => 1], 'limit' => 1000]);
        $soonRows = $db->findMany('matches', [
            'status'    => 'scheduled',
            'startTime' => ['$gte' => $now, '$lte' => $soon],
        ], ['projection' => ['sportKey' => 1], 'limit' => 1000]);
        $keys = [];
        foreach (array_merge(is_array($live) ? $live : [], is_array($soonRows) ? $soonRows : []) as $row) {
            $k = strtolower((string) ($row['sportKey'] ?? ''));
            if ($k !== '') $keys[$k] = true;
        }
        return array_keys($keys);
    }

    /** Pre-match rows for one sport, mirrors /api/matches?status=upcoming&sportKey=... */
    private static function currentPrematchRows(SqlRepository $db, string $sportKey): array
    {
        $rows = $db->findMany('matches', [
            'sportKey' => $sportKey,
            'status' => 'scheduled',
        ], ['limit' => 200, 'sort' => ['startTime' => 1]]);
        return is_array($rows) ? array_values($rows) : [];
    }

    /**
     * Sport keys for the prematch rotation tick.
     *
     * If RUNDOWN_SYNC_ALL_SPORTS=true (default) we use the FULL Rundown
     * catalog — every sport_id RundownSportMap knows. Optional exclusions
     * via RUNDOWN_SYNC_EXCLUDE_SPORT_IDS (comma-separated ids).
     *
     * If RUNDOWN_SYNC_ALL_SPORTS=false we fall back to the legacy
     * tier-list union (ODDS_TIER1_SPORTS + ODDS_TIER2_SPORTS + ODDS_ALLOWED_SPORTS),
     * which lets an operator restrict the rotation to a hand-picked list.
     *
     * Stable order in both branches so the rotation cursor refers to the
     * same slots across calls.
     *
     * @return list<string>
     */
    private static function resolveAllConfiguredSports(): array
    {
        $syncAll = strtolower((string) Env::get('RUNDOWN_SYNC_ALL_SPORTS', 'true')) !== 'false';
        if ($syncAll) {
            $excludeRaw = (string) Env::get('RUNDOWN_SYNC_EXCLUDE_SPORT_IDS', '');
            $exclude = array_values(array_filter(array_map('intval', explode(',', $excludeRaw)), static fn ($v) => $v > 0));
            return RundownSportMap::canonicalSportKeys($exclude);
        }
        $tier1 = (string) Env::get('ODDS_TIER1_SPORTS', '');
        $tier2 = (string) Env::get('ODDS_TIER2_SPORTS', '');
        $allowed = (string) Env::get('ODDS_ALLOWED_SPORTS', 'basketball_nba,americanfootball_nfl,soccer_epl,baseball_mlb,icehockey_nhl');
        $merged = $tier1 . ',' . $tier2 . ',' . $allowed;
        $list = array_values(array_unique(array_filter(array_map('trim', explode(',', $merged)), static fn($v) => $v !== '')));
        sort($list);
        return $list;
    }

    /**
     * Pick the next $maxPerTick sports from the rotation, advancing
     * implicitly via cursor. Wraps at end-of-list.
     *
     * @param list<string> $sports
     * @return list<string>
     */
    private static function nextRotationBatch(array $sports, int $maxPerTick): array
    {
        if ($sports === []) return [];
        $cursor = self::peekRotationCursor();
        $cursor = $cursor % count($sports);
        $batch = [];
        $n = min($maxPerTick, count($sports));
        for ($i = 0; $i < $n; $i++) {
            $batch[] = $sports[($cursor + $i) % count($sports)];
        }
        return $batch;
    }

    private static function peekRotationCursor(): int
    {
        $entry = SharedFileCache::peek('prematch-rotation', 'cursor');
        return is_array($entry) && isset($entry['n']) ? (int) $entry['n'] : 0;
    }

    /** @param list<string> $sports */
    private static function advanceRotationCursor(array $sports, int $by): void
    {
        if ($sports === []) return;
        $next = (self::peekRotationCursor() + max(0, $by)) % count($sports);
        $payload = ['n' => $next];
        SharedFileCache::forget('prematch-rotation', 'cursor');
        SharedFileCache::remember('prematch-rotation', 'cursor', 86400, fn() => $payload);
    }

    /**
     * Shared auth + concurrency + rate-guard for the cron-callable tick
     * endpoints. Returns null on success (caller may proceed) or a string
     * describing the gate failure (response already sent — caller returns).
     *
     * Auth: timing-safe hash_equals() of X-Tick-Secret against
     * <UPPER(TYPE)>_TICK_SECRET (with TICK_SECRET as a shared fallback).
     *
     * Concurrency: MySQL GET_LOCK named "live_tick_<type>" with timeout 0.
     * If another tick of the same type is already running, returns 200 with
     * skipped=true so cron logs success without overlap.
     *
     * Rate guard: skip if a successful tick of the same type ran within
     * LIVE_TICK_MIN_INTERVAL_SECONDS (default 30). Prevents accidental
     * double-cron and admin-during-cron races from doubling upstream spend.
     */
    private function authorizeAndGuardTick(string $type): ?string
    {
        $expected = trim((string) Env::get('INTERNAL_TICK_SECRET', ''));
        $provided = trim((string) Http::header('x-tick-secret'));
        if ($expected === '' || $provided === '' || !hash_equals($expected, $provided)) {
            Response::json(['ok' => false, 'error' => 'unauthorized'], 401);
            return 'unauthorized';
        }

        $minInterval = max(0, (int) Env::get('LIVE_TICK_MIN_INTERVAL_SECONDS', '30'));
        if ($minInterval > 0) {
            $last = SharedFileCache::peek('live-tick-last', $type);
            $lastTs = is_array($last) && isset($last['ts']) ? (int) $last['ts'] : 0;
            if ($lastTs > 0 && (time() - $lastTs) < $minInterval) {
                $this->logTick($type, 'skipped_rate_limited', null, null);
                Response::json([
                    'ok' => true,
                    'skipped' => true,
                    'reason' => 'rate_limited',
                    'lastRunAgeSeconds' => time() - $lastTs,
                ]);
                return 'rate_limited';
            }
        }

        $lockName = 'live_tick_' . $type;
        if (!$this->db->acquireNamedLock($lockName, 0)) {
            $this->logTick($type, 'skipped_concurrent', null, null);
            Response::json([
                'ok' => true,
                'skipped' => true,
                'reason' => 'concurrent',
            ]);
            return 'concurrent';
        }
        return null;
    }

    private function releaseTickLock(string $type): void
    {
        try {
            $this->db->releaseNamedLock('live_tick_' . $type);
        } catch (Throwable $_) {
            // best-effort — lock auto-releases on connection close
        }
    }

    private function markTickRan(string $type): void
    {
        // SharedFileCache uses get-with-callback semantics; we don't want to
        // pre-load on miss, so write directly via a long-TTL get() that
        // memoizes our payload. The TTL is generous (1h) — what we actually
        // care about is the timestamp, which we set manually.
        $payload = ['ts' => time()];
        // forget+remember pattern keeps the file fresh.
        SharedFileCache::forget('live-tick-last', $type);
        SharedFileCache::remember('live-tick-last', $type, 3600, fn() => $payload);
    }

    /**
     * Auto-create the tick_log table if missing. Idempotent — IF NOT EXISTS
     * is cheap. We could move this to a one-shot migration but that adds
     * deploy steps; for an ops-only diagnostic table the runtime ensure is
     * fine. Failures are swallowed because the tick must succeed even if
     * logging breaks.
     */
    private function ensureTickLogTable(): void
    {
        try {
            $pdo = $this->db->getRawPdoForOps();
            $table = $this->db->rawTableName('tick_log');
            $pdo->exec("CREATE TABLE IF NOT EXISTS `{$table}` (
                id INT AUTO_INCREMENT PRIMARY KEY,
                tick_type VARCHAR(32) NOT NULL,
                started_at DATETIME NOT NULL,
                finished_at DATETIME NULL,
                status VARCHAR(32) NOT NULL,
                sports_tried INT NULL,
                events_seen INT NULL,
                matched INT NULL,
                updated INT NULL,
                finished INT NULL,
                error_message TEXT NULL,
                INDEX idx_type_started (tick_type, started_at)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");
        } catch (Throwable $_) {
            // ignore — logging is best-effort
        }
    }

    /**
     * Log the start of a tick (status='ok' as a placeholder; later overwritten
     * by logTickFinish). Returns the row id so the finisher can UPDATE in
     * place. Returns 0 if logging failed — callers must accept "no log row"
     * and continue without persisting metrics.
     */
    private function logTickStart(string $type): int
    {
        $this->ensureTickLogTable();
        try {
            $pdo = $this->db->getRawPdoForOps();
            $table = $this->db->rawTableName('tick_log');
            $stmt = $pdo->prepare("INSERT INTO `{$table}` (tick_type, started_at, status) VALUES (:t, UTC_TIMESTAMP(), 'running')");
            $stmt->execute([':t' => $type]);
            return (int) $pdo->lastInsertId();
        } catch (Throwable $_) {
            return 0;
        }
    }

    /**
     * Update an in-flight tick row with terminal status + counters.
     *
     * @param array<string,mixed>|null $result Tick result keyed by sportsTried/eventsSeen/matched/updated/finished
     */
    private function logTickFinish(int $tickLogId, string $status, ?array $result, ?string $error): void
    {
        if ($tickLogId <= 0) return;
        try {
            $pdo = $this->db->getRawPdoForOps();
            $table = $this->db->rawTableName('tick_log');
            $stmt = $pdo->prepare("UPDATE `{$table}` SET finished_at = UTC_TIMESTAMP(), status = :s, sports_tried = :sp, events_seen = :ev, matched = :m, updated = :u, finished = :f, error_message = :err WHERE id = :id");
            $stmt->execute([
                ':s'   => $status,
                ':sp'  => isset($result['sportsTried']) ? (int) $result['sportsTried'] : null,
                ':ev'  => isset($result['eventsSeen']) ? (int) $result['eventsSeen'] : null,
                ':m'   => isset($result['matched']) ? (int) $result['matched'] : null,
                ':u'   => isset($result['updated']) ? (int) $result['updated'] : null,
                ':f'   => isset($result['finished']) ? (int) $result['finished'] : null,
                ':err' => $error,
                ':id'  => $tickLogId,
            ]);
        } catch (Throwable $_) {
            // ignore
        }
    }

    /**
     * Single-shot log row for skipped paths (rate-limited, concurrent) and
     * for failures discovered before logTickStart could run.
     */
    private function logTick(string $type, string $status, ?array $result, ?string $error): void
    {
        $id = $this->logTickStart($type);
        $this->logTickFinish($id, $status, $result, $error);
    }

    /**
     * Most recent N tick_log rows, newest first. Used by /api/debug/live-status.
     *
     * @return list<array<string,mixed>>
     */
    private function recentTickLogs(int $limit = 10): array
    {
        try {
            $pdo = $this->db->getRawPdoForOps();
            $table = $this->db->rawTableName('tick_log');
            $stmt = $pdo->prepare("SELECT id, tick_type, started_at, finished_at, status, sports_tried, events_seen, matched, updated, finished, error_message FROM `{$table}` ORDER BY id DESC LIMIT :lim");
            $stmt->bindValue(':lim', max(1, $limit), PDO::PARAM_INT);
            $stmt->execute();
            $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
            return is_array($rows) ? $rows : [];
        } catch (Throwable $_) {
            return [];
        }
    }

    /**
     * Diagnostic snapshot of why Live Now is or isn't populating. Designed
     * to be the first place to look when the production "Live Now" tab is
     * empty: shows server time, count of rows in each filter bucket the
     * live API filter walks through, plus a sample row so the team-name
     * fuzzy-match path is inspectable. Admin-only.
     */
    private function liveStatus(): void
    {
        try {
            $actor = $this->protectAdminOnly();
            if ($actor === null) {
                return;
            }

            $now = time();

            // We can't read MySQL @@time_zone / NOW() through SqlRepository's
            // public API, so we infer drift from a sample row's startTime
            // (stored as ISO-8601 UTC) vs PHP's gmdate. If they're far apart
            // the issue is data freshness, not a tz mismatch — startTime is
            // a string, not a TIMESTAMP column.

            $allLive = $this->db->findMany('matches', ['status' => 'live'], [
                'projection' => ['id' => 1, 'sportKey' => 1, 'homeTeam' => 1, 'awayTeam' => 1, 'oddsSource' => 1, 'lastOddsSyncAt' => 1, 'startTime' => 1],
                'limit' => 200,
            ]);
            $liveTotal = is_array($allLive) ? count($allLive) : 0;

            // Per-source totals plus a per-sport breakdown — the per-sport
            // section is the diagnostic the on-call engineer actually needs:
            // it spotlights coverage gaps (sport with N live rows but oldest
            // age > freshness window → no tick is touching it) at a glance.
            $liveBySource = [];
            $liveFreshOverall = 0;
            $liveBySport = [];
            $sample = null;
            foreach ($allLive ?: [] as $row) {
                $src = strtolower((string) ($row['oddsSource'] ?? ''));
                $bucket = $src === '' ? '(none)' : $src;
                $liveBySource[$bucket] = ($liveBySource[$bucket] ?? 0) + 1;

                $sportKey = (string) ($row['sportKey'] ?? '');
                $sportFreshness = MatchesController::liveFreshnessSecondsForSport($sportKey);
                $last = (string) ($row['lastOddsSyncAt'] ?? '');
                $lastTs = $last !== '' ? strtotime($last) : false;
                $age = $lastTs !== false ? ($now - $lastTs) : null;
                $isFresh = $age !== null && $age <= $sportFreshness;
                if ($isFresh) {
                    $liveFreshOverall++;
                }

                $sportBucket = $sportKey === '' ? '(no_sport_key)' : $sportKey;
                if (!isset($liveBySport[$sportBucket])) {
                    $liveBySport[$sportBucket] = [
                        'count' => 0,
                        'fresh' => 0,
                        'oldestAgeSec' => null,
                        'newestAgeSec' => null,
                        'sources' => [],
                        'freshnessWindowSec' => $sportFreshness,
                    ];
                }
                $liveBySport[$sportBucket]['count']++;
                if ($isFresh) $liveBySport[$sportBucket]['fresh']++;
                if ($age !== null) {
                    $cur = $liveBySport[$sportBucket]['oldestAgeSec'];
                    if ($cur === null || $age > $cur) $liveBySport[$sportBucket]['oldestAgeSec'] = $age;
                    $cur = $liveBySport[$sportBucket]['newestAgeSec'];
                    if ($cur === null || $age < $cur) $liveBySport[$sportBucket]['newestAgeSec'] = $age;
                }
                $sBucket = $src === '' ? 'none' : $src;
                $liveBySport[$sportBucket]['sources'][$sBucket] = ($liveBySport[$sportBucket]['sources'][$sBucket] ?? 0) + 1;

                if ($sample === null) {
                    $sample = [
                        'sportKey' => $sportKey,
                        'home' => (string) ($row['homeTeam'] ?? ''),
                        'away' => (string) ($row['awayTeam'] ?? ''),
                        'oddsSource' => $row['oddsSource'] ?? null,
                        'lastOddsSyncAt' => $last,
                        'ageSeconds' => $age,
                        'freshnessWindowSec' => $sportFreshness,
                    ];
                }
            }
            // Sort sports by oldest-age desc so coverage gaps surface first.
            uasort($liveBySport, static fn($a, $b) => ($b['oldestAgeSec'] ?? 0) <=> ($a['oldestAgeSec'] ?? 0));

            // Best-effort worker liveness: read the tail of the worker log if
            // we can find it on disk. Doesn't tell us whether the daemon is
            // running, but tells us when it last logged anything.
            $workerLog = dirname(__DIR__) . '/logs/odds-worker.log';
            $lastWorkerLine = null;
            $lastWorkerLineAge = null;
            if (is_file($workerLog) && is_readable($workerLog)) {
                $size = (int) @filesize($workerLog);
                $lastWorkerLineAge = $size > 0 ? ($now - (int) @filemtime($workerLog)) : null;
                $tail = @shell_exec('tail -n 1 ' . escapeshellarg($workerLog));
                if (is_string($tail)) {
                    $lastWorkerLine = trim($tail);
                }
            }

            // Quick-glance: last successful tick of each type. Detailed history
            // (ok/failed/skipped, counters, errors) lives in `lastTicks`
            // below, sourced from the tick_log table.
            $tickLast = [];
            foreach (['live', 'prematch'] as $tickType) {
                $entry = SharedFileCache::peek('live-tick-last', $tickType);
                $ts = is_array($entry) && isset($entry['ts']) ? (int) $entry['ts'] : 0;
                $tickLast[$tickType] = [
                    'lastSuccessUtc' => $ts > 0 ? gmdate(DATE_ATOM, $ts) : null,
                    'ageSeconds' => $ts > 0 ? ($now - $ts) : null,
                ];
            }

            // Pre-match scheduled freshness breakdown — same shape
            // as live.bySport but for status='scheduled' rows that need to
            // stay fresh per the 5-min business rule.
            $prematchFreshDefault = max(60, (int) Env::get('PREMATCH_FRESHNESS_SECONDS_DEFAULT', '300'));
            $prematchRows = $this->db->findMany('matches', ['status' => 'scheduled'], [
                'projection' => ['sportKey' => 1, 'lastOddsSyncAt' => 1, 'startTime' => 1],
                'limit' => 2000,
            ]);
            $prematchBySport = [];
            $prematchFresh = 0;
            foreach (is_array($prematchRows) ? $prematchRows : [] as $row) {
                if (!is_array($row)) continue;
                $sportKey = (string) ($row['sportKey'] ?? '');
                $sportBucket = $sportKey === '' ? '(no_sport_key)' : $sportKey;
                $last = (string) ($row['lastOddsSyncAt'] ?? '');
                $lastTs = $last !== '' ? strtotime($last) : false;
                $age = $lastTs !== false ? ($now - $lastTs) : null;
                $isFresh = $age !== null && $age <= $prematchFreshDefault;
                if ($isFresh) $prematchFresh++;
                if (!isset($prematchBySport[$sportBucket])) {
                    $prematchBySport[$sportBucket] = ['count' => 0, 'fresh' => 0, 'oldestAgeSec' => null, 'newestAgeSec' => null];
                }
                $prematchBySport[$sportBucket]['count']++;
                if ($isFresh) $prematchBySport[$sportBucket]['fresh']++;
                if ($age !== null) {
                    $cur = $prematchBySport[$sportBucket]['oldestAgeSec'];
                    if ($cur === null || $age > $cur) $prematchBySport[$sportBucket]['oldestAgeSec'] = $age;
                    $cur = $prematchBySport[$sportBucket]['newestAgeSec'];
                    if ($cur === null || $age < $cur) $prematchBySport[$sportBucket]['newestAgeSec'] = $age;
                }
            }
            uasort($prematchBySport, static fn($a, $b) => ($b['oldestAgeSec'] ?? 0) <=> ($a['oldestAgeSec'] ?? 0));

            Response::json([
                'server' => [
                    'phpNowUtc' => gmdate(DATE_ATOM, $now),
                    'phpTimezone' => date_default_timezone_get(),
                    'appEnv' => Env::get('APP_ENV', 'unknown'),
                    'host' => (string) ($_SERVER['HTTP_HOST'] ?? ''),
                ],
                'liveFreshness' => [
                    'defaultSeconds' => MatchesController::liveFreshnessSecondsForSport(''),
                    'note' => 'Per-sport overrides via LIVE_FRESHNESS_SECONDS_<SPORT_KEY>',
                ],
                'ticks' => $tickLast,
                'lastTicks' => $this->recentTickLogs(10),
                'live' => [
                    'totalRows' => $liveTotal,
                    'bySource' => $liveBySource,
                    'freshOverall' => $liveFreshOverall,
                    'liveNowFilterWouldReturn' => $liveFreshOverall,
                    'bySport' => $liveBySport,
                    'sampleRow' => $sample,
                ],
                'prematch' => [
                    'totalScheduled' => is_array($prematchRows) ? count($prematchRows) : 0,
                    'freshOverall' => $prematchFresh,
                    'freshnessWindowSec' => $prematchFreshDefault,
                    'bySport' => $prematchBySport,
                ],
                'quotaCounts' => [
                    'rundown' => RundownClient::latestQuotaSnapshot(),
                ],
                'worker' => [
                    'logExists' => is_file($workerLog),
                    'logLastModifiedAgeSeconds' => $lastWorkerLineAge,
                    'lastLogLine' => $lastWorkerLine,
                ],
            ]);
        } catch (Throwable $e) {
            Logger::exception($e, 'live-status debug error');
            Response::json(['ok' => false, 'error' => $e->getMessage()], 500);
        }
    }

    /**
     * @param bool $requireAdminRole true = full 'admin' role ONLY (agents
     *   rejected). Used by money-moving actions (outright settle/void) where
     *   an agent-level token must not be able to trigger settlement.
     */
    private function protectAdminOnly(bool $requireAdminRole = false): ?array
    {
        $allowedRoles = $requireAdminRole ? ['admin'] : ['admin', 'super_agent', 'master_agent'];
        $denyMessage = $requireAdminRole
            ? 'Not authorized: admin role required'
            : 'Not authorized as admin or master agent';
        return $this->protectRoles($allowedRoles, $denyMessage);
    }

    /**
     * Bet-approval gate — widens protectAdminOnly() to ALSO admit the plain
     * 'agent' role, FOR THE THREE BET-APPROVAL ENDPOINTS ONLY (2026-07-09
     * ruling: plain agents manage real downlines and must action their own
     * players' flagged bets). Every other admin endpoint stays strict via
     * protectAdminOnly(). The widening is safe because BetApprovalService
     * still runs the per-bet downline scope check (scopeDenial), so a plain
     * agent can only ever approve/reject a bet owned by one of THEIR
     * customers — never another agent's.
     */
    private function protectBetApprovalActor(): ?array
    {
        return $this->protectRoles(
            ['admin', 'super_agent', 'master_agent', 'agent'],
            'Not authorized to action bet approvals'
        );
    }

    /**
     * Shared bearer-token → role-gate → actor-lookup flow. Extracted so
     * protectAdminOnly() and protectBetApprovalActor() share ONE auth
     * implementation (no drift). Behavior for existing callers is unchanged:
     * protectAdminOnly passes the exact same role lists + deny messages.
     */
    private function protectRoles(array $allowedRoles, string $denyMessage): ?array
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
            Response::json(['message' => 'Not authorized'], 401);
            return null;
        }

        $role = (string) ($decoded['role'] ?? 'user');
        if (!in_array($role, $allowedRoles, true)) {
            Response::json(['message' => $denyMessage], 403);
            return null;
        }

        $id = (string) ($decoded['id'] ?? '');
        if ($id === '' || preg_match('/^[a-f0-9]{24}$/i', $id) !== 1) {
            Response::json(['message' => 'Not authorized, token failed: invalid user id'], 401);
            return null;
        }

        $collection = ($role === 'admin') ? 'admins' : 'agents';
        $actor = Jwt::cachedUser($this->db, $collection, $id);
        if ($actor === null) {
            Response::json(['message' => 'Not authorized, user not found'], 403);
            return null;
        }

        return $actor;
    }
}
