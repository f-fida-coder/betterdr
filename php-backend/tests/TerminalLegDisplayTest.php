<?php

declare(strict_types=1);

/**
 * BetSettlementService::backfillTerminalLegDisplay — the DISPLAY-ONLY per-leg
 * W/L backfill for already-terminal parlays (PO 2026-07-19).
 *
 * ISOLATED SUITE (in-memory mock SqlRepository, no DB) driving the REAL
 * BetSettlementService method + the REAL SportsbookBetSupport grader.
 *
 * Locks the contract:
 *  - orphaned 'closed'/'ticket_terminal' legs on a FINISHED match get their
 *    real W/L written to BOTH the betselections row AND the bet-doc selection;
 *  - the ticket's terminal status + payout are NEVER changed;
 *  - ZERO writes to `users` or `transactions` (no money contact);
 *  - a leg whose match is not final stays 'closed' (retried later);
 *  - idempotent — a graded leg leaves the candidate set;
 *  - a non-terminal (pending) bet is skipped entirely.
 */

error_reporting(E_ALL & ~E_DEPRECATED);

// ── In-memory mock repo (also THE SqlRepository the code type-hints on) ──────
if (!class_exists('SqlRepository')) {
    class SqlRepository
    {
        /** @var array<string, list<array<string,mixed>>> */
        public array $data = [];
        /** @var list<array{op:string, collection:string, keys:list<string>}> */
        public array $writeLog = [];

        public static function nowUtc(): string { return gmdate('c'); }
        public static function id(string $id): string { return $id; }

        public function __construct(array $seed = []) { $this->data = $seed; }

        public function beginTransaction(): void {}
        public function commit(): void {}
        public function rollback(): void {}

        public function findMany(string $collection, array $query = [], array $options = []): array
        {
            $rows = $this->data[$collection] ?? [];
            $out = [];
            foreach ($rows as $row) {
                if ($this->matches($row, $query)) {
                    $out[] = $row;
                }
            }
            return $out;
        }

        public function findOne(string $collection, array $query = [], array $options = []): ?array
        {
            foreach ($this->data[$collection] ?? [] as $row) {
                if ($this->matches($row, $query)) {
                    return $row;
                }
            }
            return null;
        }

        public function findOneForUpdate(string $collection, array $query = []): ?array
        {
            return $this->findOne($collection, $query);
        }

        public function updateOne(string $collection, array $query, array $updates): void
        {
            $this->writeLog[] = ['op' => 'update', 'collection' => $collection, 'keys' => array_keys($updates)];
            foreach ($this->data[$collection] ?? [] as $i => $row) {
                if ($this->matches($row, $query)) {
                    $this->data[$collection][$i] = array_merge($row, $updates);
                    return;
                }
            }
        }

        public function insertOne(string $collection, array $document): string
        {
            $this->writeLog[] = ['op' => 'insert', 'collection' => $collection, 'keys' => array_keys($document)];
            $this->data[$collection][] = $document;
            return (string) ($document['id'] ?? 'x');
        }

        private function matches(array $doc, array $query): bool
        {
            foreach ($query as $field => $cond) {
                $val = $doc[$field] ?? null;
                if (is_array($cond) && isset($cond['$gte'])) {
                    if ($val === null || (string) $val < (string) $cond['$gte']) {
                        return false;
                    }
                    continue;
                }
                if ($val !== $cond) {
                    return false;
                }
            }
            return true;
        }
    }
}

if (!class_exists('Logger')) {
    class Logger
    {
        public static function warning(string $m, array $c = [], string $ch = ''): void {}
        public static function info(string $m, array $c = [], string $ch = ''): void {}
        public static function warn(string $m, array $c = [], string $ch = ''): void {}
        public static function error(string $m, array $c = [], string $ch = ''): void {}
        public static function flush(): void {}
    }
}

if (!class_exists('Env')) {
    // Grading reads MLB_LISTED_PITCHER_VOID_ENABLED etc. — defaults are fine.
    class Env
    {
        public static function get(string $key, mixed $default = null): mixed { return $default; }
    }
}

if (!class_exists('PlayerPropSettlement')) {
    // The grader asks whether a leg is a player prop. Our fixture legs are team
    // markets (h2h / totals), so this is always false here.
    class PlayerPropSettlement
    {
        public static function isGradableProp(string $marketType): bool
        {
            foreach (['batter_', 'pitcher_', 'player_'] as $p) {
                if (str_starts_with(strtolower($marketType), $p)) { return true; }
            }
            return false;
        }
        public static function grade(array $selection, array $stats): string { return 'pending'; }
    }
}

require_once __DIR__ . '/../src/OddsMarketCatalog.php';
require_once __DIR__ . '/../src/SportsbookBetSupport.php';
require_once __DIR__ . '/../src/SportsMatchStatus.php';
require_once __DIR__ . '/../src/BetSettlementService.php';

// ── Fixture: the exact prod shape — a lost 4-leg parlay whose Nationals@
//    Athletics legs were closed unrgraded when the Tigers@Angels game lost it.
$recent = gmdate('c', time() - 3600);
/** @return SqlRepository */
function seedTerminalParlay(string $betStatus, string $naMatchStatus, float $h = 15, float $a = 1): SqlRepository
{
    $recent = gmdate('c', time() - 3600);
    // Nationals @ Athletics (home Oakland, away Washington) — the closed legs.
    $na = ['id' => 'aaaaaaaaaaaaaaaaaaaaaaaa', 'homeTeam' => 'Oakland', 'awayTeam' => 'Washington',
           'status' => $naMatchStatus, 'score' => ['score_home' => $h, 'score_away' => $a]];
    // Tigers @ Angels (home LA Angels, away Detroit) — already-graded legs.
    $ta = ['id' => 'bbbbbbbbbbbbbbbbbbbbbbbb', 'homeTeam' => 'LA Angels', 'awayTeam' => 'Detroit',
           'status' => 'finished', 'score' => ['score_home' => 0, 'score_away' => 7]];

    $betId = 'cccccccccccccccccccccccc';
    $mk = static fn (string $id, int $order, string $matchId, string $market, string $sel, ?float $pt, string $status, ?string $gr): array => array_filter([
        'id' => $id, 'betId' => $betId, 'selectionOrder' => $order, 'matchId' => $matchId,
        'marketType' => $market, 'selection' => $sel, 'point' => $pt, 'status' => $status,
        'gradeReason' => $gr, 'updatedAt' => $recent,
    ], static fn ($v) => $v !== null);

    $rows = [
        // Closed (orphaned) legs on the Nationals@Athletics game.
        $mk('11111111111111111111111a', 0, $na['id'], 'h2h', 'Washington', null, 'closed', 'ticket_terminal'),   // → lost (1 < 15)
        $mk('11111111111111111111111b', 1, $na['id'], 'totals', 'Over', 11.5, 'closed', 'ticket_terminal'),      // → won (16 > 11.5)
        // Already-graded legs on the Tigers@Angels game.
        $mk('22222222222222222222222a', 2, $ta['id'], 'h2h', 'Detroit', null, 'won', null),
        $mk('22222222222222222222222b', 3, $ta['id'], 'totals', 'Over', 8.0, 'lost', null),
    ];
    // Bet doc: the display source. Closed legs still read 'pending' here (the
    // terminal-close only touched the betselections table, never the bet doc).
    $betSelections = [
        ['matchId' => $na['id'], 'marketType' => 'h2h', 'selection' => 'Washington', 'status' => 'pending', 'odds' => 1.87],
        ['matchId' => $na['id'], 'marketType' => 'totals', 'selection' => 'Over', 'point' => 11.5, 'status' => 'pending', 'odds' => 1.95],
        ['matchId' => $ta['id'], 'marketType' => 'h2h', 'selection' => 'Detroit', 'status' => 'won', 'odds' => 1.5],
        ['matchId' => $ta['id'], 'marketType' => 'totals', 'selection' => 'Over', 'point' => 8.0, 'status' => 'lost', 'odds' => 1.87],
    ];
    $bet = ['id' => $betId, 'userId' => 'dddddddddddddddddddddddd', 'ticketId' => 'T1', 'type' => 'parlay',
            'status' => $betStatus, 'riskAmount' => 100, 'amount' => 100, 'potentialPayout' => 0,
            'selections' => $betSelections, 'createdAt' => $recent, 'updatedAt' => $recent];

    return new SqlRepository([
        'betselections' => $rows,
        'bets' => [$bet],
        'matches' => [$na, $ta],
        'users' => [['id' => 'dddddddddddddddddddddddd', 'balance' => -100, 'pendingBalance' => 0]],
        'transactions' => [],
    ]);
}

/** @param SqlRepository $db */
function legRow(SqlRepository $db, string $id): ?array
{
    foreach ($db->data['betselections'] as $r) { if (($r['id'] ?? '') === $id) return $r; }
    return null;
}
function betDoc(SqlRepository $db): array { return $db->data['bets'][0]; }

// ── Tests ────────────────────────────────────────────────────────────────────

TestRunner::run('backfill grades orphaned legs on a finished match (row + bet doc)', function (): void {
    $db = seedTerminalParlay('lost', 'finished');
    $summary = BetSettlementService::backfillTerminalLegDisplay($db, 45, 200);

    TestRunner::assertEquals(2, $summary['legsGraded'], 'both closed legs graded');
    TestRunner::assertEquals(1, $summary['betsTouched'], 'one bet touched');

    // betselections rows flipped to real W/L.
    TestRunner::assertEquals('lost', (string) legRow($db, '11111111111111111111111a')['status'], 'Washington ML → lost (1 < 15)');
    TestRunner::assertEquals('won',  (string) legRow($db, '11111111111111111111111b')['status'], 'Over 11.5 → won (16 > 11.5)');

    // bet-doc selections (the display source) updated too.
    $sel = betDoc($db)['selections'];
    $byKey = [];
    foreach ($sel as $s) { $byKey[$s['selection'] . '|' . ($s['point'] ?? '')] = (string) $s['status']; }
    TestRunner::assertEquals('lost', $byKey['Washington|'], 'bet-doc Nationals ML → lost');
    TestRunner::assertEquals('won',  $byKey['Over|11.5'],   'bet-doc Over 11.5 → won');
});

TestRunner::run('MONEY-SAFETY: ticket status/payout frozen; ZERO writes to users/transactions', function (): void {
    $db = seedTerminalParlay('lost', 'finished');
    BetSettlementService::backfillTerminalLegDisplay($db, 45, 200);

    // Ticket outcome untouched.
    TestRunner::assertEquals('lost', (string) betDoc($db)['status'], 'bet stays lost');
    TestRunner::assertEquals(0.0, (float) betDoc($db)['potentialPayout'], 'payout stays 0');
    TestRunner::assertEquals(100.0, (float) betDoc($db)['riskAmount'], 'risk untouched');

    // No money collection was EVER written.
    $touched = array_map(static fn ($w) => $w['collection'], $db->writeLog);
    TestRunner::assertTrue(!in_array('users', $touched, true), 'never writes users');
    TestRunner::assertTrue(!in_array('transactions', $touched, true), 'never writes transactions (no ledger)');

    // Every `bets` write touched ONLY the display fields (selections + updatedAt).
    foreach ($db->writeLog as $w) {
        if ($w['collection'] === 'bets') {
            $extra = array_diff($w['keys'], ['selections', 'updatedAt']);
            TestRunner::assertTrue($extra === [], 'bets write limited to selections/updatedAt (no status/payout): ' . implode(',', $extra));
        }
    }
});

TestRunner::run('leg on a NOT-final match stays closed (retried later)', function (): void {
    $db = seedTerminalParlay('lost', 'live');
    $summary = BetSettlementService::backfillTerminalLegDisplay($db, 45, 200);
    TestRunner::assertEquals(0, $summary['legsGraded'], 'nothing graded while game live');
    TestRunner::assertEquals('closed', (string) legRow($db, '11111111111111111111111a')['status'], 'leg stays closed');
});

TestRunner::run('idempotent: second run grades nothing (legs left the candidate set)', function (): void {
    $db = seedTerminalParlay('lost', 'finished');
    BetSettlementService::backfillTerminalLegDisplay($db, 45, 200);
    $second = BetSettlementService::backfillTerminalLegDisplay($db, 45, 200);
    TestRunner::assertEquals(0, $second['legsGraded'], 'no re-grade on second pass');
    TestRunner::assertEquals(0, $second['betsTouched'], 'no bet re-touched');
});

TestRunner::run('GUARD: a non-terminal (pending) bet is skipped entirely', function (): void {
    $db = seedTerminalParlay('pending', 'finished');
    $summary = BetSettlementService::backfillTerminalLegDisplay($db, 45, 200);
    TestRunner::assertEquals(0, $summary['legsGraded'], 'pending bet never touched by the display pass');
    TestRunner::assertEquals('closed', (string) legRow($db, '11111111111111111111111a')['status'], 'leg untouched');
    $touched = array_map(static fn ($w) => $w['collection'], $db->writeLog);
    TestRunner::assertTrue(!in_array('bets', $touched, true), 'no bet write for a pending ticket');
});

TestRunner::run('void/push leg gets a gradeReason', function (): void {
    // Total lands exactly on the line → push (void). Over 11.5 with 6+5.5? use a
    // canceled game so both closed legs void.
    $db = seedTerminalParlay('lost', 'canceled');
    $summary = BetSettlementService::backfillTerminalLegDisplay($db, 45, 200);
    TestRunner::assertEquals(2, $summary['legsGraded'], 'both legs void on a canceled game');
    TestRunner::assertEquals('void', (string) legRow($db, '11111111111111111111111a')['status'], 'canceled → void');
    TestRunner::assertNotNull(legRow($db, '11111111111111111111111a')['gradeReason'] ?? null, 'void leg carries a gradeReason');
});
