<?php

declare(strict_types=1);

/**
 * Pure refund-math for cancelling a pending sportsbook bet.
 *
 * The three branches mirror BetsController placement (cash / credit-account /
 * freeplay). Keeping the logic in a static helper makes it unit-testable
 * without a database and prevents the void path from drifting away from the
 * placement path — a regression that previously caused freeplay cancels to
 * gift real cash and credit-account cancels to double-credit.
 */
final class BetVoidRefund
{
    /**
     * Compute the refund effect of voiding a single pending bet.
     *
     * @param array $bet  Must include `amount` and may include `isFreeplay`.
     * @param array $user Must include `balance`, `pendingBalance`,
     *                    `freeplayBalance`, `creditLimit`, and `role`.
     *
     * @return array{
     *   isFreeplay: bool,
     *   isCreditAccount: bool,
     *   stake: float,
     *   balanceBefore: float,
     *   pendingBefore: float,
     *   freeplayBefore: float,
     *   balanceAfter: float,
     *   pendingAfter: float,
     *   freeplayAfter: float,
     *   availableAfter: float,
     *   transactionType: string,
     *   transactionReason: string,
     *   transactionDescription: string,
     *   userUpdate: array<string,float>
     * }
     */
    public static function compute(array $bet, array $user): array
    {
        $stake          = self::num($bet['riskAmount'] ?? $bet['amount'] ?? 0);
        $balanceBefore  = self::num($user['balance'] ?? 0);
        $pendingBefore  = self::num($user['pendingBalance'] ?? 0);
        $freeplayBefore = self::num($user['freeplayBalance'] ?? 0);
        $creditLimit    = self::num($user['creditLimit'] ?? 0);
        $role           = strtolower((string) ($user['role'] ?? 'user'));
        $isFreeplay     = (bool) ($bet['isFreeplay'] ?? false);

        // Split the stake into FP slice vs cash slice. Mirrors the
        // placement-time split + every other reader in the codebase
        // (BetsController, BetSettlementService, AuthController,
        // MyBetsView). Legacy bets with `isFreeplay=true` but no
        // `freeplayAmountUsed` field assume the whole stake was FP,
        // matching the conservative fallback elsewhere.
        $fpUsedRaw = $bet['freeplayAmountUsed'] ?? null;
        if (is_numeric($fpUsedRaw) && (float) $fpUsedRaw > 0) {
            $freeplayUsed = (float) $fpUsedRaw;
        } elseif ($isFreeplay) {
            $freeplayUsed = $stake;
        } else {
            $freeplayUsed = 0.0;
        }
        $freeplayUsed = max(0.0, min($freeplayUsed, $stake));
        $realPortion  = max(0.0, $stake - $freeplayUsed);

        // The bet "is freeplay" in the sense that any FP returned to
        // the pool — the boolean drives the transaction type below
        // and matches the original placement semantics. A partial-FP
        // bet still records as `bet_void_admin` (cash transaction)
        // because the dominant pool is real money; pure-FP records as
        // `fp_bet_void_admin`. Tweak only if accounting needs change.
        $isPureFreeplay = $freeplayUsed > 0 && $realPortion <= 0;
        $isCreditAccount = !$isPureFreeplay && $role === 'user' && $creditLimit > 0;

        $balanceAfter  = $balanceBefore;
        $pendingAfter  = $pendingBefore;
        $freeplayAfter = $freeplayBefore;
        $userUpdate    = [];

        // FP slice always returns to the freeplay pool, regardless of
        // account type. Old code only refunded FP for pure-FP bets,
        // so a partial-FP void was silently losing the freeplay
        // portion (player paid back FP and got nothing back to it).
        if ($freeplayUsed > 0) {
            $freeplayAfter = $freeplayBefore + $freeplayUsed;
            $userUpdate['freeplayBalance'] = $freeplayAfter;
        }
        if ($realPortion > 0) {
            if ($isCreditAccount) {
                // Credit account: nothing hit `balance` at placement,
                // so nothing to refund there. Just release the cash
                // portion from `pendingBalance` so available credit
                // recovers correctly.
                $pendingAfter = max(0.0, $pendingBefore - $realPortion);
                $userUpdate['pendingBalance'] = $pendingAfter;
            } else {
                // Cash account: refund the cash portion to balance
                // and release the same amount from pending.
                $balanceAfter = $balanceBefore + $realPortion;
                $pendingAfter = max(0.0, $pendingBefore - $realPortion);
                $userUpdate['balance']        = $balanceAfter;
                $userUpdate['pendingBalance'] = $pendingAfter;
            }
        }

        $availableAfter = $isCreditAccount
            ? max(0.0, $creditLimit + $balanceAfter - $pendingAfter)
            : max(0.0, $balanceAfter - $pendingAfter);

        // Transaction label uses pure-FP as the discriminator —
        // partial-FP voids hit BOTH pools but the dominant accounting
        // event is the cash refund, so we tag it as a cash-side
        // transaction. (If reporting later needs partial voids broken
        // out as their own type, this is the single edit site.)
        $isFreeplayTransaction = $isPureFreeplay;
        $descSuffix = '';
        if ($freeplayUsed > 0 && $realPortion > 0) {
            $descSuffix = ' ($' . number_format($realPortion, 0)
                . ' bal + $' . number_format($freeplayUsed, 0) . ' fp)';
        } elseif ($isPureFreeplay) {
            $descSuffix = '';
        }

        return [
            // `isFreeplay` here means "this was a pure-FP void" so
            // downstream callers selecting on it (e.g. ledger
            // labelling) only flip when no real money moved. Original
            // boolean from the bet doc is preserved as `wasFreeplay`.
            'isFreeplay'             => $isPureFreeplay,
            'wasFreeplay'            => $isFreeplay,
            'isCreditAccount'        => $isCreditAccount,
            'stake'                  => $stake,
            'freeplayUsed'           => $freeplayUsed,
            'realPortion'            => $realPortion,
            'balanceBefore'          => $balanceBefore,
            'pendingBefore'          => $pendingBefore,
            'freeplayBefore'         => $freeplayBefore,
            'balanceAfter'           => $balanceAfter,
            'pendingAfter'           => $pendingAfter,
            'freeplayAfter'          => $freeplayAfter,
            'availableAfter'         => $availableAfter,
            'transactionType'        => $isFreeplayTransaction ? 'fp_bet_void_admin' : 'bet_void_admin',
            'transactionReason'      => $isFreeplayTransaction ? 'FP_BET_VOID_ADMIN' : 'BET_VOID_ADMIN',
            'transactionDescription' => 'Admin/TicketWriter voided pending '
                . ($isPureFreeplay ? 'freeplay ' : '')
                . 'bet' . $descSuffix,
            'userUpdate'             => $userUpdate,
        ];
    }

    private static function num(mixed $value): float
    {
        if (is_int($value) || is_float($value)) {
            return (float) $value;
        }
        if (is_string($value) && is_numeric($value)) {
            return (float) $value;
        }
        return 0.0;
    }
}
