<?php

/**
 * Read-only sanity test for the figures + transactions timezone
 * resolution. The reported bug: a Sunday-evening bet showed up under
 * Monday because the user's saved settings.timezone defaulted to ET
 * while they're actually in CT. Fix: prefer the client-supplied `tz`
 * query param (browser-detected zone) over saved settings.
 *
 * Mirror of WalletController::resolveReportTimezone so the test is
 * hermetic. Two must stay in lockstep.
 *
 * Usage:
 *   php php-backend/scripts/test-report-tz-resolution.php
 */

declare(strict_types=1);

$passes = 0;
$failures = [];
function expect(string $label, $expected, $actual): void
{
    global $passes, $failures;
    $ok = $expected === $actual;
    if ($ok) { $passes++; echo "  ✓ {$label}\n"; return; }
    $failures[] = $label;
    echo "  ✗ {$label}\n";
    echo "      expected: " . var_export($expected, true) . "\n";
    echo "      actual:   " . var_export($actual, true) . "\n";
}

/**
 * Mirror of WalletController::resolveReportTimezone.
 *
 * @param array<string, mixed> $actor
 * @param array<string, mixed> $get   Simulated $_GET
 */
function resolve_report_tz(array $actor, array $get): string
{
    $allowed = [
        'America/New_York', 'America/Chicago', 'America/Denver',
        'America/Phoenix', 'America/Los_Angeles', 'America/Anchorage',
        'Pacific/Honolulu', 'UTC',
    ];
    $candidates = [];
    $queryTz = isset($get['tz']) ? trim((string) $get['tz']) : '';
    if ($queryTz !== '') $candidates[] = $queryTz;
    $settingsTz = is_array($actor['settings'] ?? null)
        && is_string($actor['settings']['timezone'] ?? null)
        ? trim((string) $actor['settings']['timezone'])
        : '';
    if ($settingsTz !== '') $candidates[] = $settingsTz;
    $candidates[] = 'America/New_York';

    foreach ($candidates as $name) {
        if (!in_array($name, $allowed, true)) continue;
        try {
            (new DateTimeZone($name));
            return $name;
        } catch (Throwable) {
            continue;
        }
    }
    return 'America/New_York';
}

echo "Query param wins when browser sends one\n";
{
    $actor = ['settings' => ['timezone' => 'America/New_York']];
    expect(
        'CT browser + ET saved → CT (browser wins, fixes the reported bug)',
        'America/Chicago',
        resolve_report_tz($actor, ['tz' => 'America/Chicago']),
    );
    expect(
        'PT browser + UTC saved → PT (browser wins)',
        'America/Los_Angeles',
        resolve_report_tz(['settings' => ['timezone' => 'UTC']], ['tz' => 'America/Los_Angeles']),
    );
}

echo "Settings tz used when no query param\n";
{
    expect(
        'No tz param + saved CT → CT',
        'America/Chicago',
        resolve_report_tz(['settings' => ['timezone' => 'America/Chicago']], []),
    );
    expect(
        'Empty tz param + saved PT → PT (empty doesn\'t override)',
        'America/Los_Angeles',
        resolve_report_tz(['settings' => ['timezone' => 'America/Los_Angeles']], ['tz' => '']),
    );
}

echo "Default falls through when nothing is set\n";
{
    expect('No settings, no query → America/New_York', 'America/New_York', resolve_report_tz([], []));
    expect('Empty settings, no query → America/New_York', 'America/New_York', resolve_report_tz(['settings' => []], []));
    expect(
        'Null timezone in settings → ET fallback',
        'America/New_York',
        resolve_report_tz(['settings' => ['timezone' => null]], []),
    );
}

echo "Non-allowlisted candidates rejected, fall through\n";
{
    // Browser sends some real-but-not-allowlisted zone (Europe/London).
    // We must not honor it (the rest of the backend doesn't know about
    // it). Falls through to settings, then ET default.
    expect(
        'Disallowed tz query + saved CT → CT (saved wins)',
        'America/Chicago',
        resolve_report_tz(
            ['settings' => ['timezone' => 'America/Chicago']],
            ['tz' => 'Europe/London'],
        ),
    );
    expect(
        'Disallowed tz everywhere → ET default',
        'America/New_York',
        resolve_report_tz(
            ['settings' => ['timezone' => 'Asia/Tokyo']],
            ['tz' => 'Europe/Berlin'],
        ),
    );
}

echo "Tampered / garbage inputs can\'t crash or smuggle a bad zone\n";
{
    expect(
        'Garbage query string → falls through',
        'America/Chicago',
        resolve_report_tz(
            ['settings' => ['timezone' => 'America/Chicago']],
            ['tz' => 'not-a-zone'],
        ),
    );
    expect(
        'SQL-injection-flavored tz → rejected, falls through',
        'America/New_York',
        resolve_report_tz([], ['tz' => "'; DROP TABLE users; --"]),
    );
    expect(
        'Whitespace-only tz → treated as missing',
        'America/Chicago',
        resolve_report_tz(['settings' => ['timezone' => 'America/Chicago']], ['tz' => '   ']),
    );
}

echo "End-to-end replay of the reported scenario\n";
{
    // User is actually in CT, browser reports America/Chicago via the
    // new tz query param. Their saved settings.timezone defaults to ET
    // (they never picked CT explicitly). Old code used ET for buckets,
    // so a Sun 9:30 PM CT bet (02:30 UTC Mon, = 10:30 PM Sun ET... wait
    // that's still Sun). Let's use the actual reported instant:
    // a Sun 11:30 PM CT bet (04:30 UTC Mon).
    //
    // Old: ET interpretation → 12:30 AM Mon ET → Mon row.
    // New (with tz=America/Chicago): 11:30 PM Sun CT → Sun row.
    $tz = resolve_report_tz(
        ['settings' => ['timezone' => 'America/New_York']],
        ['tz' => 'America/Chicago'],
    );
    expect('Picked CT for the bucket calculation', 'America/Chicago', $tz);
    $zone = new DateTimeZone($tz);
    $instant = new DateTimeImmutable('2026-05-11T04:30:00Z');
    $local = $instant->setTimezone($zone);
    expect('Local day for the reported bet is Sun', 'Sun', $local->format('D'));
    expect('Date is 5/10, not 5/11', '5/10', $local->format('n/j'));
}

echo "\n";
if (count($failures) > 0) {
    echo "FAIL: " . count($failures) . " assertion(s) failed ({$passes} passed)\n";
    foreach ($failures as $f) echo "  - {$f}\n";
    exit(1);
}
echo "PASS: {$passes} assertions, 0 failures\n";
exit(0);
