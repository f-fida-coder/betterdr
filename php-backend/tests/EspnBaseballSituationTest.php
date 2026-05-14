<?php

declare(strict_types=1);

/**
 * Unit test for EspnScoreboardSync's baseball live-situation extraction.
 *
 * Targets two private statics via reflection:
 *   - extractBaseballSituation(array): [outs, bases]
 *   - extractLiveState(array, sportKey): full live-state payload
 *
 * Covers the shape variations ESPN actually ships in the wild:
 *   - outs as int / string / out of range
 *   - onFirst/Second/Third as bool / int / string / missing
 *   - situation block entirely absent (between-innings)
 *   - status.type.state != 'in' (pre / post / postponed)
 *   - non-baseball sport (situation block should be ignored)
 */

require_once __DIR__ . '/../src/EspnScoreboardSync.php';

// EspnScoreboardSync references Logger + SqlRepository + TeamNormalizer
// at class-load time only through method bodies we don't hit here, so
// stubbing isn't strictly required — but PHP will lazy-resolve when the
// reflection calls run. Provide tiny stubs to keep this test
// self-contained (no DB / no logger output).
if (!class_exists('Logger')) {
    final class Logger {
        public static function warn(string $msg, array $ctx = [], string $cat = ''): void {}
        public static function info(string $msg, array $ctx = [], string $cat = ''): void {}
    }
}

/**
 * Invoke a private static for white-box testing.
 *
 * `setAccessible(true)` was a no-op as of PHP 8.1 (private static
 * methods are accessible via reflection without it) and emits a
 * deprecation in 8.5; we just skip it.
 */
function callPrivateStatic(string $class, string $method, array $args): mixed {
    $r = new ReflectionMethod($class, $method);
    return $r->invokeArgs(null, $args);
}

TestRunner::run('extractBaseballSituation — happy path (ints + bools)', function () {
    $competition = [
        'situation' => [
            'outs' => 2,
            'onFirst' => true,
            'onSecond' => false,
            'onThird' => true,
        ],
    ];
    [$outs, $bases] = callPrivateStatic('EspnScoreboardSync', 'extractBaseballSituation', [$competition]);
    TestRunner::assertEquals(2, $outs, 'outs read as int');
    TestRunner::assertEquals('101', $bases, 'bases packed as FST string (1B + 3B)');
});

TestRunner::run('extractBaseballSituation — outs as string, runners as 0/1 ints', function () {
    $competition = [
        'situation' => [
            'outs' => '1',
            'onFirst' => 1,
            'onSecond' => 1,
            'onThird' => 1,
        ],
    ];
    [$outs, $bases] = callPrivateStatic('EspnScoreboardSync', 'extractBaseballSituation', [$competition]);
    TestRunner::assertEquals(1, $outs, 'numeric-string outs coerced to int');
    TestRunner::assertEquals('111', $bases, 'bases loaded — int 1 treated as runner-on');
});

TestRunner::run('extractBaseballSituation — empty bases (no runners)', function () {
    $competition = [
        'situation' => [
            'outs' => 0,
            'onFirst' => false,
            'onSecond' => false,
            'onThird' => false,
        ],
    ];
    [$outs, $bases] = callPrivateStatic('EspnScoreboardSync', 'extractBaseballSituation', [$competition]);
    TestRunner::assertEquals(0, $outs, '0 outs read correctly');
    TestRunner::assertEquals('000', $bases, 'empty diamond — all zeros');
});

TestRunner::run('extractBaseballSituation — out-of-range outs clamps to null', function () {
    $competition = ['situation' => ['outs' => 7]];
    [$outs, $bases] = callPrivateStatic('EspnScoreboardSync', 'extractBaseballSituation', [$competition]);
    TestRunner::assertNull($outs, 'outs=7 rejected as nonsense (UI never renders "7 Outs")');
    TestRunner::assertNull($bases, 'no runner keys present — bases null');
});

TestRunner::run('extractBaseballSituation — situation block absent (between innings)', function () {
    [$outs, $bases] = callPrivateStatic('EspnScoreboardSync', 'extractBaseballSituation', [['status' => ['period' => 7]]]);
    TestRunner::assertNull($outs, 'no situation → outs null');
    TestRunner::assertNull($bases, 'no situation → bases null');
});

TestRunner::run('extractBaseballSituation — situation present but no runner keys', function () {
    $competition = ['situation' => ['outs' => 2, 'balls' => 1, 'strikes' => 2]];
    [$outs, $bases] = callPrivateStatic('EspnScoreboardSync', 'extractBaseballSituation', [$competition]);
    TestRunner::assertEquals(2, $outs, 'outs still read when no runner keys');
    TestRunner::assertNull($bases, 'bases null when ESPN omits onFirst/etc');
});

TestRunner::run('extractLiveState — live MLB top of 6th, 2 outs, 1B + 2B', function () {
    $competition = [
        'status' => [
            'period' => 6,
            'displayClock' => '0:00',
            'type' => ['state' => 'in', 'shortDetail' => 'Top 6th 0:00'],
        ],
        'situation' => [
            'outs' => 2,
            'onFirst' => true,
            'onSecond' => true,
            'onThird' => false,
        ],
    ];
    $state = callPrivateStatic('EspnScoreboardSync', 'extractLiveState', [$competition, 'baseball_mlb']);
    TestRunner::assertNotNull($state, 'live state returned for in-progress MLB');
    TestRunner::assertEquals(6, $state['period'], 'period = 6th inning');
    TestRunner::assertEquals('Top', $state['clock'], 'half-inning text = Top');
    TestRunner::assertEquals(2, $state['outs'], 'outs = 2');
    TestRunner::assertEquals('110', $state['bases'], 'bases = 1B + 2B occupied');
});

TestRunner::run('extractLiveState — between-innings (Mid/End): no situation block', function () {
    $competition = [
        'status' => [
            'period' => 7,
            'type' => ['state' => 'in', 'shortDetail' => 'Mid 7th'],
        ],
        // No `situation` key at all — ESPN clears it between half-innings.
    ];
    $state = callPrivateStatic('EspnScoreboardSync', 'extractLiveState', [$competition, 'baseball_mlb']);
    TestRunner::assertNotNull($state, 'still returns period when between innings');
    TestRunner::assertEquals('Mid', $state['clock'], 'half-text = Mid');
    TestRunner::assertNull($state['outs'], 'outs null between innings (UI hides badge)');
    TestRunner::assertNull($state['bases'], 'bases null between innings (UI hides badge)');
});

TestRunner::run('extractLiveState — pregame returns null entirely', function () {
    $competition = [
        'status' => [
            'period' => 0,
            'type' => ['state' => 'pre', 'shortDetail' => 'Scheduled'],
        ],
        'situation' => ['outs' => 0, 'onFirst' => false, 'onSecond' => false, 'onThird' => false],
    ];
    $state = callPrivateStatic('EspnScoreboardSync', 'extractLiveState', [$competition, 'baseball_mlb']);
    TestRunner::assertNull($state, 'pre-game → null live state (no overwrite of score)');
});

TestRunner::run('extractLiveState — final returns null entirely', function () {
    $competition = [
        'status' => [
            'period' => 9,
            'type' => ['state' => 'post', 'shortDetail' => 'Final'],
        ],
    ];
    $state = callPrivateStatic('EspnScoreboardSync', 'extractLiveState', [$competition, 'baseball_mlb']);
    TestRunner::assertNull($state, 'final → null (settlement-grade fields untouched)');
});

TestRunner::run('extractLiveState — non-baseball sport ignores situation block', function () {
    // NBA payload — even if a stray "situation" snuck in, we must not
    // emit outs/bases (they'd pollute a basketball row's score JSON).
    $competition = [
        'status' => [
            'period' => 3,
            'displayClock' => '7:21',
            'type' => ['state' => 'in', 'shortDetail' => '3rd Quarter'],
        ],
        'situation' => ['outs' => 2, 'onFirst' => true],
    ];
    $state = callPrivateStatic('EspnScoreboardSync', 'extractLiveState', [$competition, 'basketball_nba']);
    TestRunner::assertNotNull($state, 'NBA live state still returned');
    TestRunner::assertEquals('7:21', $state['clock'], 'NBA clock passed through');
    TestRunner::assertNull($state['outs'], 'NBA outs forced null (baseball-only field)');
    TestRunner::assertNull($state['bases'], 'NBA bases forced null (baseball-only field)');
});

TestRunner::run('extractLiveState — between-half display "0:00" → empty clock', function () {
    // Regression guard: non-baseball "0:00" displayClock must collapse
    // to empty so the board doesn't show "Q3 0:00" mid-quarter swap.
    $competition = [
        'status' => [
            'period' => 3,
            'displayClock' => '0:00',
            'type' => ['state' => 'in', 'shortDetail' => 'End of Q3'],
        ],
    ];
    $state = callPrivateStatic('EspnScoreboardSync', 'extractLiveState', [$competition, 'basketball_nba']);
    TestRunner::assertEquals('', $state['clock'], '"0:00" collapsed to empty for time-based sport');
});
