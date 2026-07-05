<?php

declare(strict_types=1);

/**
 * Locks OutrightSettlementService::resolveWinningOutcome — the guard that
 * stops a typo'd/unknown winner from settling a futures board and grading
 * every pending bet as lost (bet grading compares selection ===
 * winningOutcome, exact string).
 */

if (!class_exists('ApiException')) {
    class ApiException extends RuntimeException
    {
        public function __construct(string $message, int $code = 0, private array $extra = [])
        {
            parent::__construct($message, $code);
        }
    }
}
if (!class_exists('Env')) {
    class Env
    {
        public static function get(string $key, ?string $default = null): ?string
        {
            if (array_key_exists($key, $_ENV)) {
                return $_ENV[$key];
            }
            $v = getenv($key);
            return $v === false ? $default : $v;
        }
    }
}
if (!class_exists('SqlRepository')) {
    class SqlRepository
    {
        public static function nowUtc(): string { return '2026-07-05T12:00:00+00:00'; }
        public static function id(string $id): string { return $id; }
    }
}
if (!class_exists('Logger')) {
    class Logger
    {
        public static function info(string $m, array $c = [], string $ch = 'api'): void {}
        public static function warning(string $m, array $c = [], string $ch = 'api'): void {}
        public static function error(string $m, array $c = [], string $ch = 'error'): void {}
        public static function exception(Throwable $e, string $m = '', array $c = [], string $ch = 'error'): void {}
    }
}
if (!class_exists('BalanceUpdateService')) {
    class BalanceUpdateService
    {
        public static function apply(...$args): array { return ['ok' => true]; }
    }
}

require_once dirname(__DIR__) . '/src/OutrightSettlementService.php';

/** An outrights row with the standard single synthetic book. */
function owvBoard(array $names): array
{
    $outcomes = [];
    foreach ($names as $n) {
        $outcomes[] = ['name' => $n, 'price' => 450];
    }
    return [
        'id'         => 'a1b2c3d4e5f6a7b8c9d0e1f2',
        'status'     => 'open',
        'bookmakers' => [[
            'key'     => 'theoddsapi',
            'name'    => 'The Odds API',
            'markets' => [['key' => 'outrights', 'outcomes' => $outcomes]],
        ]],
    ];
}

TestRunner::run('winner validation: exact board outcome accepted, canonical case returned', function (): void {
    $board = owvBoard(['Scottie Scheffler', 'Rory McIlroy']);
    TestRunner::assertEquals(
        'Scottie Scheffler',
        OutrightSettlementService::resolveWinningOutcome($board, [], 'Scottie Scheffler'),
        'exact name accepted'
    );
    TestRunner::assertEquals(
        'Scottie Scheffler',
        OutrightSettlementService::resolveWinningOutcome($board, [], 'sCOTTIE sCHEFFLER'),
        'case-insensitive input canonicalizes to the stored case'
    );
});

TestRunner::run('winner validation: typo / partial / unknown names refused', function (): void {
    $board = owvBoard(['Scottie Scheffler', 'Rory McIlroy']);
    TestRunner::assertEquals(null, OutrightSettlementService::resolveWinningOutcome($board, [], 'Scheffler'), 'partial name refused');
    TestRunner::assertEquals(null, OutrightSettlementService::resolveWinningOutcome($board, [], 'Tiger Woods'), 'unknown name refused');
    TestRunner::assertEquals(null, OutrightSettlementService::resolveWinningOutcome($board, [], ''), 'empty refused');
    TestRunner::assertEquals(null, OutrightSettlementService::resolveWinningOutcome($board, [], '   '), 'whitespace refused');
});

TestRunner::run('winner validation: feed-dropped winner still settleable via pending bets', function (): void {
    // The eventual winner was dropped from the board after bets were placed —
    // a pending bet's selection name is the second valid source.
    $board = owvBoard(['Rory McIlroy', 'Jon Rahm']);
    TestRunner::assertEquals(
        'Scottie Scheffler',
        OutrightSettlementService::resolveWinningOutcome($board, ['Scottie Scheffler'], 'scottie scheffler'),
        'winner known only to a pending bet is accepted, bet-exact case returned'
    );
    // Board name wins over bet-selection name when both match.
    $board2 = owvBoard(['Scottie Scheffler']);
    TestRunner::assertEquals(
        'Scottie Scheffler',
        OutrightSettlementService::resolveWinningOutcome($board2, ['SCOTTIE SCHEFFLER'], 'scottie scheffler'),
        'board canonical case preferred over bet-carried case'
    );
});

TestRunner::run('winner validation: malformed board shapes never match', function (): void {
    TestRunner::assertEquals(null, OutrightSettlementService::resolveWinningOutcome([], [], 'Anyone'), 'empty row refused');
    $noMarket = ['bookmakers' => [['key' => 'theoddsapi', 'markets' => [['key' => 'h2h', 'outcomes' => [['name' => 'Anyone', 'price' => 450]]]]]]];
    TestRunner::assertEquals(null, OutrightSettlementService::resolveWinningOutcome($noMarket, [], 'Anyone'), "non-'outrights' market ignored");
});
