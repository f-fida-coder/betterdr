<?php

declare(strict_types=1);

/**
 * Pure validation + normalization for a player's settings.betDefaults payload
 * (PUT /api/auth/profile). Extracted from AuthController so the rules — the
 * Straight/Parlay mode split, the whole-dollar amount clamp, and the fixed
 * 5-chip quick-stakes shape — are unit-testable without an HTTP/DB round-trip.
 *
 * No money movement here: betDefaults only seeds the betslip stake UI; the
 * actual per-leg Risk/Win math and placement are unaffected.
 */
final class BetDefaultsNormalizer
{
    private const VALID_MODES = ['risk', 'win', 'bet'];
    private const MAX_AMOUNT = 1000000;
    private const QUICK_STAKE_FALLBACK = [10, 25, 50, 75, 100];

    /**
     * @param mixed $bd The raw betDefaults value from the request.
     * @return array{ok:bool, value?:array, error?:string} `ok=false` carries a
     *               client-facing `error` message (HTTP 400); `ok=true` carries
     *               the normalized `value` ready to store on the user.
     */
    public static function normalize($bd): array
    {
        $bd = is_array($bd) ? $bd : [];

        // Straight default mode. Accept bet|risk|win; reject anything else so a
        // typo / stale-client future-mode can't quietly persist.
        $mode = strtolower(trim((string) ($bd['mode'] ?? 'risk')));
        if (!in_array($mode, self::VALID_MODES, true)) {
            return ['ok' => false, 'error' => 'betDefaults.mode must be bet, risk, or win'];
        }

        // Independent parlay-bucket default mode (PO 2026-07-19) covering every
        // parlay-like tab. Falls back to `mode` when omitted so pre-split
        // accounts and old clients round-trip with identical behavior.
        $parlayMode = strtolower(trim((string) ($bd['parlayMode'] ?? $mode)));
        if (!in_array($parlayMode, self::VALID_MODES, true)) {
            return ['ok' => false, 'error' => 'betDefaults.parlayMode must be bet, risk, or win'];
        }

        // Split unit sizes (PO 2026-07-13): straight vs parlay, each falling
        // back to the legacy single `amount` so an old client round-trips.
        $amountRaw = $bd['amount'] ?? 0;
        $legacyAmount = is_numeric($amountRaw) ? (float) $amountRaw : 0.0;
        $straightRaw = $bd['straightDefault'] ?? $legacyAmount;
        $parlayRaw = $bd['parlayDefault'] ?? $legacyAmount;
        $straightDefault = is_numeric($straightRaw) ? (float) $straightRaw : 0.0;
        $parlayDefault = is_numeric($parlayRaw) ? (float) $parlayRaw : 0.0;
        foreach ([
            'betDefaults.amount' => $legacyAmount,
            'betDefaults.straightDefault' => $straightDefault,
            'betDefaults.parlayDefault' => $parlayDefault,
        ] as $label => $val) {
            if ($val < 0 || $val > self::MAX_AMOUNT) {
                return ['ok' => false, 'error' => $label . ' must be between 0 and 1,000,000'];
            }
        }

        // PPH whole-dollar policy: bet defaults stored as integers. Legacy
        // `amount` tracks the straight default for any pre-split reader.
        $straightDefault = (float) round($straightDefault);
        $parlayDefault = (float) round($parlayDefault);
        $amount = $straightDefault;

        // Normalize quick stakes to exactly 5 positive integers so the betslip
        // can rely on a fixed-width row. Drop non-numeric/non-positive; pad
        // from the fallback set.
        $quickStakesRaw = is_array($bd['quickStakes'] ?? null) ? $bd['quickStakes'] : self::QUICK_STAKE_FALLBACK;
        $quickStakes = [];
        foreach ($quickStakesRaw as $v) {
            if (!is_numeric($v)) {
                continue;
            }
            $n = (int) $v;
            if ($n > 0 && $n <= self::MAX_AMOUNT) {
                $quickStakes[] = $n;
            }
            if (count($quickStakes) >= 5) {
                break;
            }
        }
        while (count($quickStakes) < 5) {
            $quickStakes[] = self::QUICK_STAKE_FALLBACK[count($quickStakes)];
        }

        return ['ok' => true, 'value' => [
            'mode' => $mode,                    // Straight default mode
            'parlayMode' => $parlayMode,        // parlay-bucket default mode
            'amount' => $amount,                // legacy = straightDefault
            'straightDefault' => $straightDefault,
            'parlayDefault' => $parlayDefault,
            'quickStakes' => array_values($quickStakes),
        ]];
    }
}
