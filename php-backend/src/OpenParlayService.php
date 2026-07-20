<?php

declare(strict_types=1);

/**
 * Open Parlay ("open play") support — DECLARED-LEG-COUNT model.
 *
 * An open parlay is a plain `type='parlay'` ticket. At placement the player
 * declares how many legs it will ultimately have (`targetLegs`, 2..MAX_LEGS)
 * and commits the FULL stake up front (reserved in `pendingBalance` exactly
 * like a normal parlay — no new money path). The ticket sits in
 * `status='open'` and the player fills the remaining slots over time, one leg
 * per add. Adding a leg moves no money.
 *
 * There is NO kickoff lock and NO expiry. A ticket stays open until every
 * declared slot is filled. A never-completed ticket simply stays open forever
 * (no auto-void, no refund); an operator removes it manually if needed.
 *
 * Money + integrity rules enforced here (see also BetsController create /
 * add-leg endpoints and BetSettlementService, which call these helpers):
 *
 *   - Anti-past-posting (M1): a leg may only be added while its own event
 *     start (`matchSnapshot.startTime`) is strictly in the future. HARD
 *     server-side check, independent of the `isBettable` flag.
 *     assertLegStartsInFuture is the single gate; the controller calls it for
 *     every initial and added leg.
 *
 *   - Cap enforcement: a ticket can never hold more than `targetLegs` legs
 *     (and never more than MAX_LEGS). Enforced server-side in addOpenParlayLeg.
 *
 *   - Settlement (per-leg, as games finish — implemented in
 *     BetSettlementService::settleMatch):
 *       * any leg LOSES  → the whole ticket is graded a loss immediately, even
 *         if still incomplete (no waiting for the remaining legs);
 *       * a leg WINS     → it banks; the ticket stays open (no payout);
 *       * a leg PUSHES   (postponed/cancelled → 'void') → it drops from the
 *         parlay math but does NOT lose the ticket; the slot still counts as
 *         filled (the player adds no replacement);
 *       * PAYOUT fires ONLY when every declared slot is filled
 *         (filledLegs >= targetLegs) AND no leg lost AND none still pending —
 *         the surviving won legs re-price through the normal parlay roll-up
 *         (evaluateTicket: product of won-leg odds + SGP haircut; a void leg
 *         already drops out of that product correctly). NOTE: evaluateTicket
 *         itself applies NO payout cap — the 3xmaxBet cap is applied by
 *         recomputePayout() at create/add-leg (booking time). Settlement-side
 *         cap enforcement lives in BetSettlementService via the
 *         `payoutCapAmount` snapshot (applyPayoutCapSnapshot), which is
 *         present only on docs whose placement clamp actually fired.
 *     shouldSettleNow() encodes when the grader settles vs leaves a ticket
 *     open. isGradableOpenTicket() gates which open tickets the grader may
 *     touch — new-model tickets carrying a valid `targetLegs` only; legacy
 *     open tickets without it are left untouched, exactly as before.
 *
 *   - Payout recompute + cap (M3/M4): payout is recomputed authoritatively
 *     from the locked legs on every add (under the caller's FOR UPDATE lock)
 *     and the 3xmaxBet parlay payout cap is re-applied each time — at BOOKING
 *     time only (create/add-leg); it caps the STORED potentialPayout, not the
 *     settlement recompute (that ceiling is BetSettlementService's
 *     payoutCapAmount-snapshot check). Risk is fixed at OPEN and never
 *     changes.
 *
 *   - Freeplay is disallowed on open parlays (Addition 1).
 *   - Only plain parlays are eligible — RR/teaser/if_bet/reverse rejected (M7).
 */
final class OpenParlayService
{
    /** Declared leg count floor — an open parlay must target at least this many legs. */
    public const MIN_TARGET_LEGS = 2;

    /** Hard ceiling on declared / added legs for an open parlay. */
    public const MAX_LEGS = 8;

    private const DEFAULT_MAX_OPEN_PER_USER = 3;

    public static function isEnabled(): bool
    {
        return (string) Env::get('OPEN_PARLAY_ENABLED', '1') !== '0';
    }

    /** Per-player cap on simultaneously-open parlays (M6). */
    public static function maxOpenPerUser(): int
    {
        $raw = (int) Env::get('OPEN_PARLAY_MAX_OPEN_PER_USER', (string) self::DEFAULT_MAX_OPEN_PER_USER);
        return $raw > 0 ? $raw : self::DEFAULT_MAX_OPEN_PER_USER;
    }

    /**
     * An open parlay must be created with at least one OPEN slot: startLegs
     * strictly fewer than the declared targetLegs. With every declared slot
     * already filled at creation it's just a regular parlay wearing the OP
     * flow (prices identically — recomputePayout delegates to the same
     * parlay payout math — but forfeits parlay-path options like freeplay
     * and clutters the open-parlay tracking UI with never-open tickets).
     * The composer converts that case to a regular parlay placement or
     * bumps the declared count; this guard stops a stale client or direct
     * API call from booking another zero-slot ticket. Existing zero-slot
     * tickets are unaffected (create-time check only; they settle fine).
     *
     * The caller has already validated startLegs <= targetLegs, so this
     * only ever fires on exact equality.
     */
    public static function assertHasOpenSlot(int $startLegs, int $targetLegs): void
    {
        if ($startLegs < $targetLegs) {
            return;
        }
        throw new ApiException(
            'All ' . $targetLegs . ' declared legs are already filled — there is no open slot. Raise the leg count to keep it open, or place it as a regular parlay.',
            400,
            ['code' => 'OPEN_PARLAY_NO_OPEN_SLOTS', 'targetLegs' => $targetLegs, 'startLegs' => $startLegs]
        );
    }

    /**
     * HARD anti-past-posting gate. A leg may only join an open parlay while
     * its own event start is strictly in the future. Independent of
     * isBettable so a fail-open status-sync gap can't let a player add a leg
     * to a game already in progress.
     *
     * @param array<string, mixed> $matchSnapshot the leg's matchSnapshot
     *                                             (validateSelection returns
     *                                             the full match doc, which
     *                                             carries `startTime`)
     */
    public static function assertLegStartsInFuture(array $matchSnapshot, ?int $nowTs = null): void
    {
        $now = $nowTs ?? time();
        $startRaw = (string) ($matchSnapshot['startTime'] ?? '');
        $startTs = $startRaw !== '' ? strtotime($startRaw) : false;
        if ($startTs === false || $startTs <= 0) {
            throw new ApiException('Cannot determine this game\'s start time, so it can\'t be added to an open parlay.', 409, [
                'code' => 'OPEN_PARLAY_NO_START_TIME',
            ]);
        }
        if ($startTs <= $now) {
            throw new ApiException('This game has already started and cannot be added to an open parlay.', 409, [
                'code' => 'OPEN_PARLAY_LEG_STARTED',
            ]);
        }
    }

    /**
     * Authoritatively recompute an open parlay's payout from its locked legs
     * and re-apply the 3xmaxBet parlay payout cap — a BOOKING-time clamp on
     * the stored potentialPayout (create/add-leg). It does NOT protect the
     * settlement recompute: that ceiling is BetSettlementService's
     * `payoutCapAmount`-snapshot check (applyPayoutCapSnapshot). Risk is
     * fixed; only the payout side moves as legs are added.
     *
     * @param array<int, array<string, mixed>> $legs locked legs (selectionForInsert shape)
     * @param array<string, mixed>             $modeRule the parlay mode rule
     * @return array{potentialPayout: float, combinedOdds: float, winAmount: float, capped: bool, capAmount: float|null}
     */
    public static function recomputePayout(float $unitStake, array $legs, array $modeRule, float $maxBet): array
    {
        $risk = $unitStake; // a parlay risks exactly its unit stake
        $payout = SportsbookBetSupport::calculatePotentialPayout('parlay', $unitStake, $legs, $modeRule);
        $winAmount = max(0.0, $payout - $risk);
        $capped = false;
        $capAmount = null;
        if ($maxBet > 0) {
            $cap = $maxBet * 3.0;
            if ($winAmount > $cap) {
                $payout = $risk + $cap;
                $winAmount = $cap;
                $capped = true;
                // Snapshot value for the bet doc's `payoutCapAmount`
                // (win-amount dollars). Returned from HERE — the single
                // place the clamp is derived — so the stored snapshot can
                // never diverge from the cap that was actually applied.
                $capAmount = (float) $cap;
            }
        }
        // House $5k max-win TRUNCATION (Nicky 2026-07-20 — replaces the old
        // assertWinWithinCap REJECT at create/add-leg): the win tops out at
        // the absolute cap, composed via min() with the 3×maxBet clamp
        // above. Derived HERE — the single OP pricing source — so create,
        // add-leg, and the settlement snapshot refresh all agree.
        $houseCap = SportsbookBetSupport::truncateWinToCap((float) $winAmount);
        if ($houseCap['capped']) {
            $winAmount = (float) $houseCap['win'];
            $payout = $risk + $winAmount;
            $capped = true;
            $capAmount = $capAmount !== null
                ? (float) min($capAmount, $houseCap['cap'])
                : (float) $houseCap['cap'];
        }
        return [
            'potentialPayout' => (float) $payout,
            'combinedOdds' => SportsbookBetSupport::combinedOdds($risk, $payout),
            'winAmount' => (float) $winAmount,
            'capped' => $capped,
            'capAmount' => $capAmount,
        ];
    }

    /**
     * May the settlement grader touch this ticket while it is still `open`?
     * Only NEW-MODEL open parlays — `isOpenParlay` true, status 'open', and a
     * valid declared `targetLegs` (>= MIN_TARGET_LEGS) — are graded per-leg as
     * their games finish. Legacy open tickets that predate the declared-count
     * model carry no `targetLegs`; this returns false for them so the grader
     * skips them exactly as it did before (no auto-settle, no payout — they
     * are handled manually).
     *
     * @param array<string, mixed> $bet the locked bet row
     */
    public static function isGradableOpenTicket(array $bet): bool
    {
        if ((string) ($bet['status'] ?? '') !== 'open') {
            return false;
        }
        if (!(bool) ($bet['isOpenParlay'] ?? false)) {
            return false;
        }
        return (int) ($bet['targetLegs'] ?? 0) >= self::MIN_TARGET_LEGS;
    }

    /**
     * Decide whether an open parlay should SETTLE now, or bank the just-graded
     * leg and stay open. Pure — drives the gating in settleMatch.
     *
     *   - any leg a DECISIVE (full) loss     → settle now (the whole ticket
     *                                          loses immediately, even if
     *                                          incomplete or other legs pend);
     *   - all declared slots filled AND no
     *     leg still 'pending'                → settle now (win, or all-push
     *                                          void — evaluateTicket decides);
     *   - otherwise                          → stay open (no money moves).
     *
     * A 'void' (push) leg never forces a settle and never blocks one: it just
     * occupies a filled slot and drops from the odds math at payout time.
     *
     * A soccer Asian QUARTER HALF-LOSS leg (status 'lost' with settleFraction
     * < 1.0) is a PARTIAL REFUND, not a dead leg — its parlay multiplier is
     * 0.5, not 0, so the ticket can still pay. It therefore banks its slot like
     * a win/push and does NOT settle an incomplete open parlay early; the
     * player keeps filling their remaining declared legs. Only a FULL loss
     * (settleFraction >= 1.0) short-circuits. $settleFractions is parallel to
     * $rowStatuses; when omitted every leg is treated as full (binary), so
     * existing callers behave exactly as before.
     *
     * @param array<int, string> $rowStatuses leg statuses ('won'|'lost'|'void'|'pending')
     * @param array<int, float>  $settleFractions parallel fractions (default 1.0 = full)
     */
    public static function shouldSettleNow(array $rowStatuses, int $targetLegs, int $filledLegs, array $settleFractions = []): bool
    {
        foreach ($rowStatuses as $i => $status) {
            if ($status === 'lost') {
                $fraction = isset($settleFractions[$i]) && is_numeric($settleFractions[$i])
                    ? (float) $settleFractions[$i]
                    : 1.0;
                if ($fraction >= 1.0 - 1e-9) {
                    return true; // a decisive (full) loss loses the whole parlay, now
                }
                // half-loss: partial refund, banks its slot — fall through.
            }
        }
        if ($targetLegs < self::MIN_TARGET_LEGS || $filledLegs < $targetLegs) {
            return false; // not all declared slots filled yet → stay open
        }
        foreach ($rowStatuses as $status) {
            if ($status === 'pending') {
                return false; // a filled slot's game hasn't resolved yet → wait
            }
        }
        return true; // every slot filled and resolved, no full loss → settle (pay)
    }
}
