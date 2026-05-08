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
        $stake          = self::num($bet['amount'] ?? 0);
        $balanceBefore  = self::num($user['balance'] ?? 0);
        $pendingBefore  = self::num($user['pendingBalance'] ?? 0);
        $freeplayBefore = self::num($user['freeplayBalance'] ?? 0);
        $creditLimit    = self::num($user['creditLimit'] ?? 0);
        $role           = strtolower((string) ($user['role'] ?? 'user'));
        $isFreeplay     = (bool) ($bet['isFreeplay'] ?? false);
        $isCreditAccount = !$isFreeplay && $role === 'user' && $creditLimit > 0;

        $balanceAfter  = $balanceBefore;
        $pendingAfter  = $pendingBefore;
        $freeplayAfter = $freeplayBefore;
        $userUpdate    = [];

        if ($isFreeplay) {
            $freeplayAfter = $freeplayBefore + $stake;
            $userUpdate['freeplayBalance'] = $freeplayAfter;
        } elseif ($isCreditAccount) {
            $pendingAfter = max(0.0, $pendingBefore - $stake);
            $userUpdate['pendingBalance'] = $pendingAfter;
        } else {
            $balanceAfter = $balanceBefore + $stake;
            $pendingAfter = max(0.0, $pendingBefore - $stake);
            $userUpdate['balance']        = $balanceAfter;
            $userUpdate['pendingBalance'] = $pendingAfter;
        }

        $availableAfter = $isCreditAccount
            ? max(0.0, $creditLimit + $balanceAfter - $pendingAfter)
            : max(0.0, $balanceAfter - $pendingAfter);

        return [
            'isFreeplay'             => $isFreeplay,
            'isCreditAccount'        => $isCreditAccount,
            'stake'                  => $stake,
            'balanceBefore'          => $balanceBefore,
            'pendingBefore'          => $pendingBefore,
            'freeplayBefore'         => $freeplayBefore,
            'balanceAfter'           => $balanceAfter,
            'pendingAfter'           => $pendingAfter,
            'freeplayAfter'          => $freeplayAfter,
            'availableAfter'         => $availableAfter,
            'transactionType'        => $isFreeplay ? 'fp_bet_void_admin' : 'bet_void_admin',
            'transactionReason'      => $isFreeplay ? 'FP_BET_VOID_ADMIN' : 'BET_VOID_ADMIN',
            'transactionDescription' => 'Admin/TicketWriter voided pending ' . ($isFreeplay ? 'freeplay ' : '') . 'bet',
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
