<?php

declare(strict_types=1);

final class SportsbookBetSupport
{
    /**
     * @param array<string, mixed> $payload
     */
    public static function payloadHash(array $payload): string
    {
        return hash('sha256', json_encode(self::sortRecursively($payload), JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE) ?: '{}');
    }

    public static function normalizeRequestId(string $raw): string
    {
        $requestId = trim($raw);
        if ($requestId === '') {
            return '';
        }
        if (preg_match('/^[A-Za-z0-9._:-]{8,128}$/', $requestId) !== 1) {
            throw new ApiException('requestId must be 8-128 characters using letters, numbers, ".", "_", ":", or "-"', 400);
        }
        return $requestId;
    }

    public static function idempotencyDocumentId(string $scope, string $ownerId, string $requestId): string
    {
        return substr(hash('sha256', $scope . '|' . $ownerId . '|' . $requestId), 0, 24);
    }

    public static function ticketRiskAmount(string $betType, float $unitStake): float
    {
        return $betType === 'reverse' ? ($unitStake * 2.0) : $unitStake;
    }

    /**
     * True when a spread/total line is an Asian "quarter" (split) handicap —
     * a point ending in .25 or .75 (e.g. -0.25, +0.75, 1.25, -2.25). These
     * settle as HALF the stake on each adjacent half/whole line and CANNOT be
     * graded by the single-line gradeAgainstScore path. Sign-agnostic.
     */
    public static function isQuarterPoint(?float $point): bool
    {
        if ($point === null || !is_finite($point)) {
            return false;
        }
        $frac = fmod(abs($point), 1.0);
        return abs($frac - 0.25) < 1e-6 || abs($frac - 0.75) < 1e-6;
    }

    /**
     * @param array<string, mixed> $rule
     * @param array<int, array<string, mixed>> $validatedSelections
     */
    /**
     * Derive exact decimal odds from a selection document.
     * Prefers the stored oddsAmerican integer (source of truth) when present;
     * falls back to the decimal odds field for legacy records.
     *
     * @param array<string, mixed> $selection
     */
    private static function exactDecimalForSelection(array $selection): float
    {
        $american = isset($selection['oddsAmerican']) && is_int($selection['oddsAmerican'])
            ? $selection['oddsAmerican']
            : (isset($selection['oddsAmerican']) && is_numeric($selection['oddsAmerican']) ? (int) $selection['oddsAmerican'] : 0);
        if ($american !== 0) {
            return self::americanToDecimalExact($american);
        }
        return self::num($selection['odds'] ?? 0);
    }

    public static function calculatePotentialPayout(string $betType, float $unitStake, array $validatedSelections, array $rule, float $sgpHaircutPct = 0.0, float $sgpPropHaircutPct = 0.0): float
    {
        if ($unitStake <= 0 || $validatedSelections === []) {
            return 0.0;
        }

        if ($betType === 'straight') {
            return round($unitStake * self::exactDecimalForSelection($validatedSelections[0]));
        }

        if ($betType === 'parlay' || $betType === 'if_bet') {
            $combined = 1.0;
            foreach ($validatedSelections as $selection) {
                $combined *= self::exactDecimalForSelection($selection);
            }
            // SGP correlation haircut (profit-only). Returns the input unchanged
            // for cross-game tickets (fraction 0), so non-SGP parlays are
            // untouched. IDENTICAL helper runs in evaluateTicket at settlement.
            $combined = self::applyProfitHaircut(
                $combined,
                self::sameGameHaircutFraction($validatedSelections, $sgpHaircutPct, $sgpPropHaircutPct)
            );
            // PARLAY ONLY: lock the combined to the rounded American line so the
            // stored potentialPayout matches the slip's displayed To-Win and the
            // win paid at settlement (single source of truth). if_bet is excluded
            // — it settles via a sequential roll (evaluateIfBet), so rounding the
            // combined here would diverge placement from settlement.
            if ($betType === 'parlay') {
                $combined = self::roundCombinedToAmericanDecimal($combined);
            }
            return round($unitStake * $combined);
        }

        if ($betType === 'teaser') {
            return round($unitStake * self::teaserMultiplier($rule, count($validatedSelections)));
        }

        if ($betType === 'reverse') {
            $combined = 1.0;
            foreach ($validatedSelections as $selection) {
                $combined *= self::exactDecimalForSelection($selection);
            }
            return round($unitStake * $combined * 2.0);
        }

        return 0.0;
    }

    public static function combinedOdds(float $riskAmount, float $potentialPayout): float
    {
        if ($riskAmount <= 0) {
            return 0.0;
        }
        return round($potentialPayout / $riskAmount, 4);
    }

    /**
     * Canonical ticket pricing — the SINGLE source of a ticket's risk /
     * potentialPayout / combined odds, shared by real placement (BetsController
     * ::placeBet) AND the pre-submit quote (::quoteBet) so the review modal can
     * never show a number the book won't honor. Pure: no I/O, no side effects.
     *
     * Wraps ticketRiskAmount + calculatePotentialPayout + the Win-mode pin
     * (typed Win locks potentialPayout = risk + requestedWin within ±$2 of the
     * computed payout) + combinedOdds. If this math ever changes, BOTH the quote
     * and the book move together — that's the whole point of routing them here.
     *
     * @param array<int, array<string, mixed>> $validatedSelections
     * @param array<string, mixed>             $rule
     * @return array{totalRisk: float, potentialPayout: float, combinedOdds: float}
     */
    public static function pricedTicket(
        string $type,
        float $unitStake,
        array $validatedSelections,
        array $rule,
        float $sgpHaircutPct = 0.0,
        float $sgpPropHaircutPct = 0.0,
        mixed $requestedWinRaw = null
    ): array {
        $totalRisk = self::ticketRiskAmount($type, $unitStake);
        $potentialPayout = self::calculatePotentialPayout(
            $type,
            $unitStake,
            $validatedSelections,
            $rule,
            $sgpHaircutPct,
            $sgpPropHaircutPct
        );
        if (is_numeric($requestedWinRaw)) {
            $requestedWin = (float) round((float) $requestedWinRaw);
            $pinnedPayout = $totalRisk + $requestedWin;
            if ($requestedWin > 0 && abs($pinnedPayout - $potentialPayout) <= 2.0) {
                $potentialPayout = $pinnedPayout;
            }
        }
        return [
            'totalRisk' => $totalRisk,
            'potentialPayout' => $potentialPayout,
            'combinedOdds' => self::combinedOdds($totalRisk, $potentialPayout),
        ];
    }

    /**
     * Convert a decimal odds value to a rounded American integer.
     * decimal ≥ 2.0 → american = round((decimal − 1) × 100)
     * decimal < 2.0 → american = round(−100 / (decimal − 1))
     * Returns 0 for invalid input (decimal ≤ 1).
     */
    public static function decimalToAmericanInt(float $decimal): int
    {
        if (!is_finite($decimal) || $decimal <= 1.0) {
            return 0;
        }
        if ($decimal >= 2.0) {
            return (int) round(($decimal - 1.0) * 100.0);
        }
        $raw = -100.0 / ($decimal - 1.0);
        if (!is_finite($raw)) {
            return 0;
        }
        return (int) round($raw);
    }

    /**
     * Derive the exact decimal odds from a signed American integer.
     * american > 0 → decimal = 1 + (american / 100)
     * american < 0 → decimal = 1 + (100 / |american|)
     * Returns 0.0 for invalid input (zero).
     */
    public static function americanToDecimalExact(int $american): float
    {
        if ($american === 0) {
            return 0.0;
        }
        if ($american > 0) {
            return 1.0 + ($american / 100.0);
        }
        return 1.0 + (100.0 / (float) abs($american));
    }

    /**
     * Lock a combined PARLAY decimal to its rounded American line: snap the
     * exact combined to the nearest whole American number, then convert back to
     * decimal. This is the SINGLE payout basis the slip's To-Win, the stored
     * potentialPayout, and settlement all share (Nicky's convention: Phillies
     * -175 + Pirates -190 → 2.398496 → +140 → 2.40 → $1,400 on $1,000, not
     * $1,398.50). A combined <= 1 (push/loss basis) is returned untouched. The
     * JS twin is utils/odds.js::roundCombinedToAmericanDecimal.
     */
    public static function roundCombinedToAmericanDecimal(float $combined): float
    {
        if (!is_finite($combined) || $combined <= 1.0) {
            return $combined;
        }
        $american = self::decimalToAmericanInt($combined);
        if ($american === 0) {
            return $combined;
        }
        return self::americanToDecimalExact($american);
    }

    /**
     * Convert an `outrights` table price into the canonical
     * {american:int, decimal:float} pair a bet leg stores.
     *
     * CONTRACT: the `outrights` table's `price` field holds the feed's AMERICAN
     * odds (e.g. 450 = +450), NOT decimal like the matches board. Running the
     * decimal pipeline on it — snapDecimalOdds() then decimalToAmericanInt() —
     * treats the American number as decimal and inflates it ~100x:
     * decimalToAmericanInt(450) = 44900, americanToDecimalExact(44900) = 450.0,
     * so a $100 ticket would pay ~$45,000. That was the live bug. Take `price`
     * as the canonical American integer and derive the exact decimal from it.
     *
     * If a writer is ever changed to store DECIMAL in `price`, this helper AND
     * the frontend americanToDecimal() conversions must be reverted together —
     * never keep both, or the double-conversion bug returns. The
     * OutrightOddsConversionTest locks this interpretation.
     *
     * @return array{american:int, decimal:float}
     */
    public static function outrightPriceToOdds(mixed $price): array
    {
        $american = (int) round((float) $price);
        return [
            'american' => $american,
            'decimal' => $american === 0 ? 0.0 : self::americanToDecimalExact($american),
        ];
    }

    /**
     * Odds-acceptance policy — default + bounds in one place so the place-bet
     * validators, the settings endpoint, and the tests share a single source
     * of truth. 'band' is the recommended default (real sportsbooks auto-
     * accept small moves rather than re-prompting on every ~5s live refresh).
     */
    public const ODDS_ACCEPT_POLICIES = ['any', 'higher', 'band'];
    public const ODDS_ACCEPT_DEFAULT_POLICY = 'band';
    public const ODDS_ACCEPT_DEFAULT_BAND_CENTS = 10;
    public const ODDS_ACCEPT_MAX_BAND_CENTS = 100;

    /**
     * Bet-approval-queue statuses. A queued bet holds its stake in
     * pendingBalance (like a normal pending bet) but is NOT live and NOT
     * gradable until an admin/agent approves it. 'rejected' is the terminal
     * refunded state (never went live) — distinct from 'void' (was live,
     * then cancelled) so history/agent-figures can tell them apart.
     */
    public const STATUS_PENDING_APPROVAL = 'pending_approval';
    public const STATUS_REJECTED = 'rejected';

    /** Approval-queue threshold ($). 0 = disabled. Env fallback below player/agent. */
    public const DEFAULT_BET_APPROVAL_THRESHOLD = 0.0;

    public static function betApprovalEnvThreshold(): float
    {
        $raw = Env::get('BET_APPROVAL_THRESHOLD', (string) self::DEFAULT_BET_APPROVAL_THRESHOLD);
        $v = is_numeric($raw) ? (float) $raw : self::DEFAULT_BET_APPROVAL_THRESHOLD;
        return $v > 0 ? $v : 0.0;
    }

    /** Approval-queue timeout ($minutes). 0 = never expire. */
    public const DEFAULT_BET_APPROVAL_TIMEOUT_MINUTES = 10;          // live / near-game
    public const DEFAULT_BET_APPROVAL_TIMEOUT_MINUTES_FUTURES = 1440; // futures ~24h

    public static function betApprovalTimeoutMinutes(): int
    {
        $raw = Env::get('BET_APPROVAL_TIMEOUT_MINUTES', (string) self::DEFAULT_BET_APPROVAL_TIMEOUT_MINUTES);
        return is_numeric($raw) ? max(0, (int) $raw) : self::DEFAULT_BET_APPROVAL_TIMEOUT_MINUTES;
    }

    public static function betApprovalTimeoutMinutesFutures(): int
    {
        $raw = Env::get('BET_APPROVAL_TIMEOUT_MINUTES_FUTURES', (string) self::DEFAULT_BET_APPROVAL_TIMEOUT_MINUTES_FUTURES);
        return is_numeric($raw) ? max(0, (int) $raw) : self::DEFAULT_BET_APPROVAL_TIMEOUT_MINUTES_FUTURES;
    }

    /**
     * Pure gate: force-flag (per-player) OR stake/payout >= effective threshold.
     * Threshold precedence: player override -> agent -> env. No DB, unit-testable.
     */
    public static function approvalDecision(
        bool $playerForceFlag, ?float $playerThreshold, ?float $agentThreshold,
        float $envThreshold, float $stake, float $payout
    ): array {
        $threshold = null;
        foreach ([$playerThreshold, $agentThreshold, $envThreshold] as $t) {
            if ($t !== null && $t > 0) { $threshold = $t; break; }
        }
        $byStake  = $threshold !== null && $stake  >= $threshold;
        $byPayout = $threshold !== null && $payout >= $threshold;
        $requires = $playerForceFlag || $byStake || $byPayout;
        $reason = $playerForceFlag ? 'player_flag'
            : ($byStake ? 'stake_threshold' : ($byPayout ? 'payout_threshold' : null));
        return ['requiresApproval' => $requires, 'reason' => $reason, 'threshold' => $threshold];
    }

    /**
     * Decide whether a client's accepted odds may be auto-placed at the
     * CURRENT official odds under the user's acceptance policy. Pure +
     * canonical: both inputs are signed American integers (the same form the
     * ODDS_CHANGED comparison already uses). Returns true to ACCEPT (place at
     * the official price), false to PROMPT (return ODDS_CHANGED).
     *
     * Direction is judged on decimal payout (monotonic): a move is favorable
     * when the official decimal >= the client's decimal — the user gets the
     * same-or-better payout, so it is always safe to auto-accept. Only adverse
     * moves are ever gated:
     *   - 'any'    → accept everything (never prompt).
     *   - 'higher' → accept favorable moves; prompt on any adverse move.
     *   - 'band'   → accept favorable moves AND adverse moves within bandCents
     *                American on the same side of even money. A sign flip
     *                (favorite↔underdog) is a large move, so we prompt.
     * Unknown policies fall back to exact-match (prompt on any change),
     * preserving pre-policy behavior. The bet always places at the official
     * current odds, so accepting never pays out at a stale price.
     */
    public static function oddsAcceptable(int $clientAmerican, int $officialAmerican, string $policy, int $bandCents): bool
    {
        // No usable client odds, or no movement → nothing to gate.
        if ($clientAmerican === 0 || $clientAmerican === $officialAmerican) {
            return true;
        }
        if ($policy === 'any') {
            return true;
        }

        $clientDecimal = self::americanToDecimalExact($clientAmerican);
        $officialDecimal = self::americanToDecimalExact($officialAmerican);
        // Favorable (or equal) payout — always safe to auto-accept.
        if ($officialDecimal >= $clientDecimal) {
            return true;
        }

        // Adverse move from here.
        if ($policy === 'higher') {
            return false;
        }
        if ($policy === 'band') {
            $band = max(0, min(self::ODDS_ACCEPT_MAX_BAND_CENTS, $bandCents));
            // American "cents" are only well-defined within one side of even
            // money; a sign flip is a big move, so never silently accept it.
            $sameSide = ($clientAmerican > 0) === ($officialAmerican > 0);
            return $sameSide && abs($officialAmerican - $clientAmerican) <= $band;
        }
        // Unknown / 'exact' → preserve legacy: prompt on any change.
        return false;
    }

    /**
     * Resolve the effective odds-acceptance policy for a user: saved settings
     * (settings.oddsAcceptance) override env defaults
     * (SPORTSBOOK_ODDS_ACCEPTANCE_POLICY / _BAND_CENTS), which override the
     * code defaults. Returned values are validated + clamped so callers can
     * trust them directly.
     *
     * @param array<string, mixed>|null $userSettings the user doc's `settings`
     * @return array{policy: string, bandCents: int}
     */
    public static function resolveOddsAcceptance(?array $userSettings): array
    {
        $envPolicy = strtolower(trim((string) Env::get('SPORTSBOOK_ODDS_ACCEPTANCE_POLICY', self::ODDS_ACCEPT_DEFAULT_POLICY)));
        $policy = in_array($envPolicy, self::ODDS_ACCEPT_POLICIES, true) ? $envPolicy : self::ODDS_ACCEPT_DEFAULT_POLICY;
        $envBand = (int) Env::get('SPORTSBOOK_ODDS_ACCEPTANCE_BAND_CENTS', (string) self::ODDS_ACCEPT_DEFAULT_BAND_CENTS);
        $bandCents = max(0, min(self::ODDS_ACCEPT_MAX_BAND_CENTS, $envBand));

        $oa = is_array($userSettings['oddsAcceptance'] ?? null) ? $userSettings['oddsAcceptance'] : null;
        if ($oa !== null) {
            $userPolicy = strtolower(trim((string) ($oa['policy'] ?? '')));
            if (in_array($userPolicy, self::ODDS_ACCEPT_POLICIES, true)) {
                $policy = $userPolicy;
            }
            if (isset($oa['bandCents']) && is_numeric($oa['bandCents'])) {
                $bandCents = max(0, min(self::ODDS_ACCEPT_MAX_BAND_CENTS, (int) $oa['bandCents']));
            }
        }
        return ['policy' => $policy, 'bandCents' => $bandCents];
    }

    // ── Same-Game Parlay (SGP) — correlation rules + haircut ────────────────
    // Defaults used when platformsettings doesn't override. sgpEnabled DEFAULTS
    // OFF so the fail-safe is the full historical hard block (any shared event
    // in a multi-leg ticket is rejected). The prop rate is larger than the base
    // rate because player props inside a game are the most correlated of all.
    public const SGP_DEFAULT_HAIRCUT_PCT = 0.20;
    public const SGP_DEFAULT_PROP_HAIRCUT_PCT = 0.35;
    public const SGP_DEFAULT_MAX_LEGS = 6;
    public const SGP_DEFAULT_MAX_PAYOUT_MULTIPLIER = 3.0;
    // v1 mitigation for nested PLAYER props (same player+stat+side, different
    // point) — which can't be rule-detected because the player lives only in
    // the selection string. Cap player props to 1 per same-game cluster so two
    // can't nest. Default 1; an operator can raise it once a structured
    // player id lands on the leg (then a precise nested-prop rule replaces it).
    public const SGP_DEFAULT_MAX_PLAYER_PROPS_PER_GAME = 1;

    // ── House max-win ceiling (all standard placement paths) ──────────────
    // The operator's exposure on any single ticket is capped at $5,000 of
    // WIN (profit). Configured via MAX_PARLAY_PAYOUT (dollars, default
    // 5000; <= 0 disables).
    //
    // RULE HISTORY: PO 2026-07-07 introduced the cap as a REJECT with a
    // "reduce your stake to $X" suggestion; 2026-07-09 extended it to all
    // ticket types and let the capped stake drop below the player's min bet
    // (cap-overrides-min). Nicky 2026-07-20 REVERSED that: min bet is a
    // hard floor the cap can never undercut — the cap now TRUNCATES the
    // ticket's WIN (truncateWinToCap) and never touches the stake. A capped
    // ticket carries the ceiling in payoutCapAmount so settlement's
    // recompute path re-applies it (applyPayoutCapSnapshot).
    // Runs AFTER the per-player 3×maxBet clamp, so whatever survives that
    // reduction must still fit under the absolute ceiling.
    // Manual/admin-entered bets never pass through these placement paths,
    // so they bypass the cap by construction (PO exemption).
    public const DEFAULT_MAX_TICKET_WIN_CAP = 5000.0;

    /** The live cap in dollars, or 0.0 when disabled. */
    public static function maxTicketWinCap(): float
    {
        $raw = Env::get('MAX_PARLAY_PAYOUT', (string) self::DEFAULT_MAX_TICKET_WIN_CAP);
        $cap = is_numeric($raw) ? (float) $raw : self::DEFAULT_MAX_TICKET_WIN_CAP;
        return $cap > 0 ? $cap : 0.0;
    }

    /**
     * Largest whole-dollar stake whose win fits under the cap at the given
     * combined DECIMAL odds: floor(cap / (decimal - 1)). floor() guarantees
     * the suggestion can never bust the cap through rounding —
     * X <= cap/(d-1) ⇒ X*(d-1) <= cap, exactly. Returns 0 when even a $1
     * stake would exceed the cap (caller words the message accordingly).
     */
    public static function allowedStakeForWinCap(float $cap, float $combinedDecimal): float
    {
        if ($cap <= 0 || !is_finite($combinedDecimal) || $combinedDecimal <= 1.0) {
            return 0.0;
        }
        return floor($cap / ($combinedDecimal - 1.0));
    }

    /**
     * Freeplay-on-parlay rule (Nicky 2026-07-20, mirrors the old platform):
     * a player may fund a parlay/round-robin with freeplay ONLY when their
     * admin-set settings.allowFreeplayParlay is true (absent = OFF — same
     * absent-is-off semantics as settings.requiresBetApproval, so shipping
     * needed no migration), and even then the ticket must have at most 3
     * legs with at least one plus-money leg (decimal >= 2.0, i.e. +100 or
     * longer — even money counts). Round robin is checked at GROUP level
     * (the group's legs are what the player picked; children are subsets).
     * Applies whenever useFreeplay=true, regardless of the FP/real split.
     * The betslip mirrors this UX-side; this is the authoritative guard.
     *
     * @param array<string,mixed> $user
     * @param array<int,array<string,mixed>> $validatedSelections
     */
    public static function assertFreeplayParlayAllowed(array $user, array $validatedSelections): void
    {
        $settings = is_array($user['settings'] ?? null) ? $user['settings'] : [];
        if (empty($settings['allowFreeplayParlay'])) {
            throw new ApiException(
                'Freeplay is not available on parlays for this account.',
                400,
                ['code' => 'FREEPLAY_PARLAY_NOT_ALLOWED']
            );
        }
        $legCount = count($validatedSelections);
        $hasPlusMoney = false;
        foreach ($validatedSelections as $sel) {
            if ((float) ($sel['odds'] ?? 0) >= 2.0) {
                $hasPlusMoney = true;
                break;
            }
        }
        if ($legCount > 3 || !$hasPlusMoney) {
            throw new ApiException(
                'Freeplay parlays are limited to 3 legs with at least one plus-money leg.',
                400,
                [
                    'code' => 'FREEPLAY_PARLAY_RULE',
                    'maxLegs' => 3,
                    'legs' => $legCount,
                    'hasPlusMoney' => $hasPlusMoney,
                ]
            );
        }
    }

    /**
     * NEW RULE (Nicky 2026-07-20 — reverses the 2026-07-09 stake-cap PO):
     * the house absolute win ceiling TRUNCATES the ticket's WIN; the stake
     * is NEVER shrunk or rejected by the cap. Min bet is a hard floor
     * enforced by the caller's ordinary min-bet check — a player can always
     * put at least the minimum on any offered selection, and when the odds
     * are extreme the payout simply tops out at the cap ($25 @ +100000 →
     * stake stays $25, win pays $5,000, not $25,000).
     *
     * Replaces assertWinWithinCap (which REJECTED with a reduce-your-stake
     * suggestion — that behavior and its MAX_WIN_EXCEEDED error are retired
     * for standard placement paths).
     *
     * MONEY-CRITICAL CONTRACT: whenever `capped` comes back true, the caller
     * MUST persist the cap onto the bet doc as `payoutCapAmount` (min'd with
     * any existing 3×maxBet / SGP snapshot). Match-bet settlement RECOMPUTES
     * payout from raw leg odds (evaluateTicket) and re-applies the ceiling
     * ONLY via applyPayoutCapSnapshot — an unpersisted cap would settle
     * uncapped ($25 @ +100000 paying $25,025). Outright settlement pays the
     * stored potentialPayout, which the caller must also store capped.
     *
     * @return array{win: float, capped: bool, cap: float}
     */
    public static function truncateWinToCap(float $winAmount): array
    {
        $cap = self::maxTicketWinCap();
        if ($cap <= 0 || $winAmount <= $cap) {
            return ['win' => $winAmount, 'capped' => false, 'cap' => $cap];
        }
        return ['win' => $cap, 'capped' => true, 'cap' => $cap];
    }

    // ── Minimum-win floor (all standard placement paths) ──────────────────
    // NEW RULE (Nicky 2026-07-20): every ticket must be able to WIN at least
    // $25 — "the only way you can bet $25 is if it's +100 or higher". When a
    // stake's win prices under the floor (any sub-+100 price, including the
    // standard -110 juice), the stake AUTO-BUMPS UP to the smallest whole
    // dollar whose win clears the floor ($25 @ -130 books as $33). The stake
    // moves UP, never the win down — the mirror of the max-win cap, which
    // truncates the WIN and never touches the stake. If the required stake
    // would exceed the player's max bet, the ticket is REJECTED
    // (MIN_WIN_UNREACHABLE) — never silently booked under the floor.
    // Configured via MIN_WIN_FLOOR (dollars, default 25; <= 0 disables);
    // never allowed above the max-win cap (a floor the cap forbids would
    // reject every ticket).
    public const DEFAULT_MIN_TICKET_WIN_FLOOR = 25.0;

    // Reference unit stake for deriving a ticket's EXACT per-dollar win rate.
    // The priced win at the player's own stake is whole-dollar rounded, so
    // win/stake at small stakes is too noisy to back-solve from (off-by-one
    // bumps that land UNDER the floor after re-pricing). At $1,000,000 the
    // rounding error is <= $0.50 on a >= $1M-scale payout — the ratio is
    // exact to ~5e-7, and the 4dp round in bumpedUnitStakeForMinWin absorbs
    // it. Pricing is pure math (no caps inside pricedTicket), so the big
    // reference stake never touches limits.
    public const MIN_WIN_REFERENCE_STAKE = 1000000.0;

    /** The live floor in dollars, or 0.0 when disabled. */
    public static function minTicketWinFloor(): float
    {
        $raw = Env::get('MIN_WIN_FLOOR', (string) self::DEFAULT_MIN_TICKET_WIN_FLOOR);
        $floor = is_numeric($raw) ? (float) $raw : self::DEFAULT_MIN_TICKET_WIN_FLOOR;
        if ($floor <= 0) {
            return 0.0;
        }
        $cap = self::maxTicketWinCap();
        return $cap > 0 ? min($floor, $cap) : $floor;
    }

    /**
     * Smallest whole-dollar UNIT stake whose win clears the floor, given the
     * ticket's per-unit-stake win rate (winPerUnitStake = win at
     * MIN_WIN_REFERENCE_STAKE / MIN_WIN_REFERENCE_STAKE — stake-independent
     * for every standard type: single/combined decimals, teaser multipliers
     * and the reverse ×2 structure all scale linearly in the unit stake).
     * ceil() guarantees stake × rate >= floor(−ε), so the whole-dollar payout
     * round at booking can never land under the floor. The 4dp pre-round
     * kills float dust so an exact boundary (32.5 @ -130) ceils to 33, not 34.
     * Returns 0.0 on degenerate input (caller must treat as unpriceable).
     */
    public static function bumpedUnitStakeForMinWin(float $winPerUnitStake, float $floor): float
    {
        if ($floor <= 0 || !is_finite($winPerUnitStake) || $winPerUnitStake <= 0) {
            return 0.0;
        }
        return (float) ceil(round($floor / $winPerUnitStake, 4));
    }

    /**
     * The ticket's exact win per $1 of unit stake, via a reference-stake
     * pricing pass through the SAME canonical pricer placement uses (pin
     * dropped — the floor overrides any requested-win pin by rule).
     *
     * @param array<int, array<string, mixed>> $validatedSelections
     * @param array<string, mixed>             $rule
     */
    public static function winRatePerUnitStake(
        string $type,
        array $validatedSelections,
        array $rule,
        float $sgpHaircutPct = 0.0,
        float $sgpPropHaircutPct = 0.0
    ): float {
        $ref = self::pricedTicket(
            $type,
            self::MIN_WIN_REFERENCE_STAKE,
            $validatedSelections,
            $rule,
            $sgpHaircutPct,
            $sgpPropHaircutPct,
            null
        );
        $refWin = max(0.0, (float) $ref['potentialPayout'] - (float) $ref['totalRisk']);
        return $refWin / self::MIN_WIN_REFERENCE_STAKE;
    }

    /**
     * Re-apply the placement-time payout-cap snapshot as a settlement CEILING.
     *
     * `payoutCapAmount` (win-amount dollars) is written onto the bet doc by
     * placement when a clamp actually reduced the ticket — the combined-mode
     * 3×maxBet / SGP-multiplier clamp, and since 2026-07-20 the house $5k
     * max-win truncation (truncateWinToCap) on every ticket type (the two
     * compose via min()). evaluateTicket recomputes the payout from
     * raw leg odds and knows nothing of per-player limits, so without this
     * ceiling a clamped ticket would settle at the UNCAPPED recompute (the
     * ±$2 acceptedPayout pin is skipped — the diff far exceeds tolerance).
     *
     * Semantics:
     *   • ceiling, not a pin — a void-reduced recompute BELOW the cap passes
     *     through untouched (min keeps the smaller value);
     *   • absent / null / non-numeric / <=0 snapshot → input returned
     *     byte-identical, so every existing (legacy) doc settles exactly as
     *     before;
     *   • payout <= 0 (lost tickets) untouched;
     *   • whole-dollar convention preserved: the ceiling is round(risk + cap),
     *     matching the round() placement stored in potentialPayout.
     */
    public static function applyPayoutCapSnapshot(array $bet, float $ticketPayout): float
    {
        $capWin = $bet['payoutCapAmount'] ?? null;
        if (!is_numeric($capWin) || (float) $capWin <= 0 || $ticketPayout <= 0) {
            return $ticketPayout;
        }
        $capPayout = (float) round(self::riskAmount($bet) + (float) $capWin);
        return min($ticketPayout, $capPayout);
    }

    /**
     * Resolve the live SGP config from the platformsettings doc, clamped so
     * callers can trust it. Single source for placement gating, caps, and the
     * haircut %s snapshotted onto the bet. Absent/garbage → safe defaults
     * (sgpEnabled=false ⇒ the full hard same-game block stays in force).
     *
     * @param array<string,mixed>|null $platformSettings the `platformsettings` doc
     * @return array{enabled:bool,haircutPct:float,propHaircutPct:float,maxLegs:int,maxPayoutMultiplier:float}
     */
    public static function sgpConfig(?array $platformSettings): array
    {
        $ps = is_array($platformSettings) ? $platformSettings : [];
        $clampPct = static fn (mixed $v, float $def): float =>
            is_numeric($v) ? max(0.0, min(0.95, (float) $v)) : $def;

        return [
            'enabled' => (bool) ($ps['sgpEnabled'] ?? false),
            'haircutPct' => $clampPct($ps['sgpHaircutPct'] ?? null, self::SGP_DEFAULT_HAIRCUT_PCT),
            'propHaircutPct' => $clampPct($ps['sgpPlayerPropHaircutPct'] ?? null, self::SGP_DEFAULT_PROP_HAIRCUT_PCT),
            'maxLegs' => isset($ps['sgpMaxLegs']) && is_numeric($ps['sgpMaxLegs'])
                ? max(2, min(12, (int) $ps['sgpMaxLegs']))
                : self::SGP_DEFAULT_MAX_LEGS,
            'maxPayoutMultiplier' => isset($ps['sgpMaxPayoutMultiplier']) && is_numeric($ps['sgpMaxPayoutMultiplier'])
                ? max(0.1, min(100.0, (float) $ps['sgpMaxPayoutMultiplier']))
                : self::SGP_DEFAULT_MAX_PAYOUT_MULTIPLIER,
            'maxPlayerPropsPerGame' => isset($ps['sgpMaxPlayerPropsPerGame']) && is_numeric($ps['sgpMaxPlayerPropsPerGame'])
                ? max(1, min(12, (int) $ps['sgpMaxPlayerPropsPerGame']))
                : self::SGP_DEFAULT_MAX_PLAYER_PROPS_PER_GAME,
        ];
    }

    /**
     * Whether a set of legs forms a same-game ticket: ≥2 legs share a matchId.
     * Deterministic from the legs alone, so placement and settlement agree.
     *
     * @param array<int,array<string,mixed>> $legs
     */
    public static function isSameGameTicket(array $legs): bool
    {
        $counts = [];
        foreach ($legs as $leg) {
            $mid = (string) ($leg['matchId'] ?? '');
            if ($mid === '') {
                continue;
            }
            $counts[$mid] = ($counts[$mid] ?? 0) + 1;
            if ($counts[$mid] >= 2) {
                return true;
            }
        }
        return false;
    }

    /**
     * The LARGEST same-game cluster in a ticket: the event (matchId) shared by
     * the most legs. Correlation risk lives WITHIN a single game, so the SGP leg
     * cap bounds the biggest cluster — independent cross-game legs (and separate
     * clusters on other games) never add to it. That's why a ticket's largest
     * cluster ≤ sgpMaxLegs is the right gate: capping the largest also caps every
     * other (smaller) cluster, and each game's correlation stays independently
     * bounded (a 2-leg cluster on game A + a 3-leg cluster on game B → largest 3,
     * NOT a combined 5).
     *
     * Returns ['size'=>int, 'matchId'=>string, 'labels'=>list<string>,
     * 'matchup'=>string]. size 0/1 ⇒ no cluster (no two legs share an event).
     *
     * @param array<int,array<string,mixed>> $legs
     * @return array{size:int, matchId:string, labels:list<string>, matchup:string}
     */
    public static function largestSameGameCluster(array $legs): array
    {
        $byMatch = [];
        foreach ($legs as $leg) {
            $mid = (string) ($leg['matchId'] ?? '');
            if ($mid === '') {
                continue;
            }
            $byMatch[$mid][] = $leg;
        }
        $best = ['size' => 0, 'matchId' => '', 'labels' => [], 'matchup' => ''];
        foreach ($byMatch as $mid => $group) {
            if (count($group) <= $best['size']) {
                continue;
            }
            $snap = is_array($group[0]['matchSnapshot'] ?? null) ? $group[0]['matchSnapshot'] : [];
            $away = trim((string) ($snap['awayTeam'] ?? ''));
            $home = trim((string) ($snap['homeTeam'] ?? ''));
            $best = [
                'size' => count($group),
                'matchId' => (string) $mid,
                'labels' => array_map(static fn (array $l): string => self::sgpLegLabel($l), $group),
                'matchup' => ($away !== '' && $home !== '') ? ($away . ' @ ' . $home) : '',
            ];
        }
        return $best;
    }

    /**
     * Normalized market key for SGP rule matching: strips the `alternate_`
     * prefix (so `alternate_totals` ≡ `totals`) but KEEPS any period suffix, so
     * a full-game total and a `totals_1st_5_innings` stay distinct and never
     * collide in the nested-market check.
     */
    private static function sgpBaseFamily(string $marketType): string
    {
        $m = strtolower(trim($marketType));
        if (str_starts_with($m, 'alternate_')) {
            $m = substr($m, strlen('alternate_'));
        }
        return $m;
    }

    /** Line-market family of a normalized market key (for the nested check): totals | team_totals | spreads | ''. */
    private static function sgpLineFamily(string $normKey): string
    {
        if (str_starts_with($normKey, 'team_totals')) {
            return 'team_totals';
        }
        if (str_starts_with($normKey, 'totals')) {
            return 'totals';
        }
        if (str_starts_with($normKey, 'spreads')) {
            return 'spreads';
        }
        return '';
    }

    /** Over/Under side for a leg — explicit `side` first, else parsed from the selection text. '' when neither. */
    private static function sgpSide(array $leg): string
    {
        $side = strtolower(trim((string) ($leg['side'] ?? '')));
        if ($side === 'over' || $side === 'under') {
            return $side;
        }
        $sel = strtolower((string) ($leg['selection'] ?? ''));
        if (str_contains($sel, 'over')) {
            return 'over';
        }
        if (str_contains($sel, 'under')) {
            return 'under';
        }
        return '';
    }

    /**
     * TIER-1 same-game conflict between two legs ON THE SAME MATCH. Returns a
     * machine code when the pair is mutually exclusive / redundant /
     * deterministically correlated (must be rejected even with SGP on), else
     * null. Only meaningful for two legs that already share a matchId.
     *
     * @param array<string,mixed> $a
     * @param array<string,mixed> $b
     */
    public static function sameGameConflict(array $a, array $b): ?string
    {
        $fa = self::sgpBaseFamily((string) ($a['marketType'] ?? ''));
        $fb = self::sgpBaseFamily((string) ($b['marketType'] ?? ''));
        $pidA = isset($a['selectionPid']) && $a['selectionPid'] !== null ? (string) $a['selectionPid'] : null;
        $pidB = isset($b['selectionPid']) && $b['selectionPid'] !== null ? (string) $b['selectionPid'] : null;
        $sideA = self::sgpSide($a);
        $sideB = self::sgpSide($b);
        $tsA = strtolower((string) ($a['teamSide'] ?? ''));
        $tsB = strtolower((string) ($b['teamSide'] ?? ''));
        $pA = isset($a['point']) && is_numeric($a['point']) ? (float) $a['point'] : null;
        $pB = isset($b['point']) && is_numeric($b['point']) ? (float) $b['point'] : null;
        $fam = [$fa, $fb];
        sort($fam);

        // (0) NESTED same-market — one outcome ⊂ the other, priced as a product
        //     but really a single (near-deterministic) outcome. SAME normalized
        //     market key (so a period market never collides with full-game) +
        //     SAME direction + SAME team, at DIFFERENT points. The haircut does
        //     NOT cover this, so it is a TIER-1 hard block. Examples: Over 8.5 +
        //     Over 9.5; Boston -1.5 + Boston -2.5; Boston TT Over 4.5 + Over 5.5.
        //     OPPOSITE sides at different points (Over 8.5 + Under 9.5) are a
        //     legitimate, house-favorable MIDDLE — explicitly NOT blocked.
        if ($fa === $fb && $fa !== '' && $pA !== null && $pB !== null && abs($pA - $pB) > 1e-9) {
            switch (self::sgpLineFamily($fa)) {
                case 'totals': // game total — no team dimension
                    if ($sideA !== '' && $sideA === $sideB) {
                        return 'NESTED_SAME_MARKET';
                    }
                    break;
                case 'team_totals': // same team's total, same direction
                    $sameTeam = ($tsA !== '' && $tsA === $tsB)
                        || ($pidA !== null && $pidB !== null && $pidA === $pidB);
                    if ($sideA !== '' && $sideA === $sideB && $sameTeam) {
                        return 'NESTED_SAME_MARKET';
                    }
                    break;
                case 'spreads': // same team's spread (side is implicit in the team)
                    if ($pidA !== null && $pidB !== null && $pidA === $pidB) {
                        return 'NESTED_SAME_MARKET';
                    }
                    break;
            }
        }

        // (1a) Mutually exclusive — Over + Under on the SAME total line (game
        //      total, or the same team's team total). Can't both happen.
        if (($fa === 'totals' && $fb === 'totals') || ($fa === 'team_totals' && $fb === 'team_totals')) {
            $samePoint = $pA !== null && $pB !== null && abs($pA - $pB) < 1e-9;
            $oppSide = $sideA !== '' && $sideB !== '' && $sideA !== $sideB;
            $sameScope = $fa === 'totals' ? true : ($tsA !== '' && $tsA === $tsB);
            if ($samePoint && $oppSide && $sameScope) {
                return 'MUTUALLY_EXCLUSIVE_TOTAL';
            }
        }

        // (1b) Mutually exclusive — two moneylines on the same game (each side,
        //      or a degenerate duplicate of one side). One must lose.
        if ($fa === 'h2h' && $fb === 'h2h') {
            return 'BOTH_MONEYLINES';
        }

        // (1c) Mutually exclusive — both sides of the spread (different team, or
        //      complementary points like -1.5 / +1.5).
        if ($fa === 'spreads' && $fb === 'spreads') {
            $diffPid = $pidA !== null && $pidB !== null && $pidA !== $pidB;
            $complementary = $pA !== null && $pB !== null && abs($pA + $pB) < 1e-9 && abs($pA) > 1e-9;
            if ($diffPid || $complementary) {
                return 'BOTH_SPREAD_SIDES';
            }
        }

        // (2) Redundant — a team's moneyline + that same team's spread (same
        //     participant): heavily positively correlated, near-duplicate.
        if ($fam === ['h2h', 'spreads'] && $pidA !== null && $pidB !== null && $pidA === $pidB) {
            return 'REDUNDANT_ML_SPREAD';
        }

        // (3) Deterministic component — the game total + a team total in the
        //     SAME direction (both Over or both Under): the team's runs are a
        //     component of the game total, so they move together.
        if ($fam === ['team_totals', 'totals'] && $sideA !== '' && $sideA === $sideB) {
            return 'DETERMINISTIC_TOTAL_TT';
        }

        return null;
    }

    /**
     * Correlation haircut FRACTION for a set of legs (0.0 when not same-game).
     * Same-game ⇔ ≥2 legs share a matchId; the larger player-prop rate applies
     * when ANY leg is a player-prop market. Pure + deterministic from the legs
     * and the two rates, so placement (live rates) and settlement (the rates
     * snapshotted onto the bet) compute the IDENTICAL fraction for the same
     * legs — the core money-safety guarantee for SGP.
     *
     * @param array<int,array<string,mixed>> $legs
     */
    public static function sameGameHaircutFraction(array $legs, float $haircutPct, float $propHaircutPct): float
    {
        if (!self::isSameGameTicket($legs)) {
            return 0.0;
        }
        $hasProp = false;
        foreach ($legs as $leg) {
            if (OddsMarketCatalog::isPropMarket(strtolower((string) ($leg['marketType'] ?? '')))) {
                $hasProp = true;
                break;
            }
        }
        $pct = $hasProp ? $propHaircutPct : $haircutPct;
        return max(0.0, min(0.95, $pct));
    }

    /**
     * Apply a PROFIT-ONLY haircut to a combined decimal: the stake is never
     * touched, only the winnings shrink. new = 1 + (combined − 1)·(1 − f).
     */
    public static function applyProfitHaircut(float $combinedDecimal, float $haircutFraction): float
    {
        if ($haircutFraction <= 0.0 || $combinedDecimal <= 1.0) {
            return $combinedDecimal;
        }
        return 1.0 + ($combinedDecimal - 1.0) * (1.0 - $haircutFraction);
    }

    /**
     * Human label for a leg in the named-pair TIER-1 conflict error. The
     * selection string usually already carries the line ("Over 9.5"); when it
     * doesn't and the leg has a numeric point, append it so "Boston" -1.5 vs
     * "Boston" -2.5 read as distinct picks.
     *
     * @param array<string,mixed> $leg
     */
    private static function sgpLegLabel(array $leg): string
    {
        $sel = trim((string) ($leg['selection'] ?? ''));
        if ($sel === '') {
            $sel = trim((string) ($leg['marketType'] ?? 'selection'));
        }
        $point = $leg['point'] ?? null;
        if (is_numeric($point)) {
            $pointText = rtrim(rtrim(number_format((float) $point, 2, '.', ''), '0'), '.');
            if ($pointText !== '' && !str_contains($sel, $pointText)) {
                $sel .= ' ' . $pointText; // signed already for negative spreads
            }
        }
        return $sel;
    }

    /**
     * Price ONE Round Robin child parlay — the single source for the RR
     * child-pricing loop (BetsController::placeRoundRobin) and its unit tests.
     *
     * Cross-game children (no two legs share a matchId) keep the historical
     * math BYTE-IDENTICAL: payout = round(stake × product(leg odds), 2), 3×maxBet
     * win clamp, no snapshots — zero change to non-SGP round robin behavior.
     *
     * Same-game children (2026-07-17, PO-approved) price EXACTLY like the
     * standalone same-game parlay of the same legs, via the SAME shared pricer
     * placement/quote/settlement already agree on (calculatePotentialPayout:
     * product → profit-only haircut → American-line lock → whole-dollar round).
     * Settlement parity is automatic: the child row is type='parlay' carrying
     * the sgpHaircutPct/sgpPropHaircutPct snapshot, and evaluateTicket re-runs
     * the identical transform from those rates. The 3× ceiling tightens to
     * sgpMaxPayoutMultiplier when stricter (mirrors placeBet), and EVERY
     * clamped child — same-game or cross-game — snapshots the cap
     * (payoutCapAmount) so applyPayoutCapSnapshot re-applies it at settlement
     * (cross-game added 2026-07-17, closing the historical evaporating-clamp
     * gap); the absolute MAX_PARLAY_PAYOUT cap TRUNCATES each child's win in
     * here too (Nicky 2026-07-20 — no group-level reject), composing with
     * the multiplier clamp via min() on the snapshot.
     *
     * rawDecimal is the UNCLAMPED, un-haircut leg-odds product — still
     * returned for callers that need the child's raw price (display,
     * validation of positive odds).
     *
     * @param array<int,array<string,mixed>> $combo validated selections of this child
     * @param array{enabled?:bool,haircutPct?:float,propHaircutPct?:float,maxLegs?:int,maxPayoutMultiplier?:float} $sgpCfg
     * @return array{potentialPayout: float, rawDecimal: float, isSameGame: bool, payoutCapAmount: float|null, winAmount: float}
     */
    public static function priceRoundRobinChild(array $combo, float $stakePerParlay, float $maxBetLimit, array $sgpCfg): array
    {
        $rawDecimal = 1.0;
        foreach ($combo as $sel) {
            $rawDecimal *= (float) ($sel['odds'] ?? 0);
        }

        $isSameGame = self::isSameGameTicket($combo);
        if ($isSameGame) {
            $childPayout = self::calculatePotentialPayout(
                'parlay',
                $stakePerParlay,
                $combo,
                [],
                (float) ($sgpCfg['haircutPct'] ?? 0.0),
                (float) ($sgpCfg['propHaircutPct'] ?? 0.0)
            );
        } else {
            $childPayout = round($stakePerParlay * $rawDecimal, 2);
        }

        $childWin = max(0.0, $childPayout - $stakePerParlay);
        $payoutCapAmount = null;
        if ($maxBetLimit > 0) {
            $payoutMultiplier = $isSameGame
                ? min(3.0, (float) ($sgpCfg['maxPayoutMultiplier'] ?? 3.0))
                : 3.0;
            $cap = $maxBetLimit * $payoutMultiplier;
            if ($childWin > $cap) {
                $childPayout = $stakePerParlay + $cap;
                $childWin = $cap;
                // Settlement ceiling snapshot for EVERY clamped child —
                // same-game and cross-game alike (PO 2026-07-17, closing the
                // historical gap where a cross-game child's 3× clamp silently
                // evaporated at settlement and the child settled at the
                // UNCAPPED recompute). applyPayoutCapSnapshot re-applies it
                // as a ceiling; unclamped children stay null → settlement
                // byte-identical to legacy rows.
                $payoutCapAmount = (float) $cap;
            }
        }

        // House $5k max-win TRUNCATION per RR child (Nicky 2026-07-20 —
        // replaces the group-level assertWinWithinCap REJECT on the worst
        // child): each child's win tops out at the absolute cap, composed
        // via min() with the 3×/SGP clamp above. Derived HERE — the single
        // child pricing source — so placement's child docs and settlement's
        // per-child snapshot ceiling can never diverge.
        $houseCap = self::truncateWinToCap((float) $childWin);
        if ($houseCap['capped']) {
            $childWin = (float) $houseCap['win'];
            $childPayout = $stakePerParlay + $childWin;
            $payoutCapAmount = $payoutCapAmount !== null
                ? (float) min($payoutCapAmount, $houseCap['cap'])
                : (float) $houseCap['cap'];
        }

        return [
            'potentialPayout' => $childPayout,
            'rawDecimal' => $rawDecimal,
            'isSameGame' => $isSameGame,
            'payoutCapAmount' => $payoutCapAmount,
            'winAmount' => $childWin,
        ];
    }

    /**
     * @param array<int, array<string, mixed>> $validatedSelections
     * @param array{enabled?:bool}|array<string,mixed> $sgpConfig live SGP config; empty/disabled ⇒ full hard block
     */
    public static function validateTicketComposition(string $betType, array $validatedSelections, array $sgpConfig = []): void
    {
        // Manual (write-in) legs are ADMIN-CREATED ONLY (ManualBetService) and
        // never valid on a player ticket of ANY type — validateSelection can't
        // produce one (there is no matches row behind them), so seeing one
        // here means a crafted payload. Checked BEFORE the straight
        // early-return: a player-placed "straight" manual leg is just as
        // forged as a parlay one. Literal on purpose (like the '_cards'
        // suffix rule) so this file has no ManualBetService load-order
        // dependency; keep in sync with ManualBetService::MARKET_TYPE.
        foreach ($validatedSelections as $selection) {
            if (strtolower((string) ($selection['marketType'] ?? '')) === 'manual') {
                throw new ApiException('Manual bets can only be written by an operator.', 400, [
                    'code' => 'MANUAL_ADMIN_ONLY',
                ]);
            }
        }

        if ($betType === 'straight') {
            return;
        }

        // Card markets are STRAIGHT-ONLY (ruling 2026-07-05): they grade
        // manually (no card data exists in any results feed), and a combined
        // ticket blocked pending on a manual card leg would hold every other
        // leg's payout hostage. Rejected at composition time — before any
        // stake math or money movement. Suffix match so any future *_cards
        // market inherits the rule. NOTE: the open-parlay ADD-LEG path
        // enforces composition inline (BetsController) and carries a mirror
        // of this check — keep the two in sync.
        foreach ($validatedSelections as $selection) {
            $mt = strtolower((string) ($selection['marketType'] ?? ''));
            // '_corners' added 2026-07-06 — corners ride the cards pipeline
            // and inherit the same manual-grading/straight-only rationale.
            if (str_ends_with($mt, '_cards') || str_ends_with($mt, '_corners')) {
                throw new ApiException('Card and corner markets are available as straight bets only.', 400, [
                    'code' => 'CARDS_STRAIGHT_ONLY',
                ]);
            }
        }

        // SGP relaxes PARLAY tickets and — since 2026-07-17 (PO approval) —
        // ROUND ROBIN groups, and only when explicitly enabled. Round robin is
        // validated at the GROUP level here (whole-group rejection on any
        // TIER-1 pair — never a silently filtered child subset), and each
        // same-game CHILD is then priced with the identical haircut machinery
        // (priceRoundRobinChild). Every other combined type (teaser/if_bet/
        // reverse) — and open parlays, whose create/add-leg paths pass no
        // config — keeps the full hard block: any shared event is rejected.
        // This is the fail-safe gate (§4).
        $sgpOn = in_array($betType, ['parlay', 'round_robin'], true) && !empty($sgpConfig['enabled']);

        // Group legs by event so we can inspect same-game clusters.
        $byMatch = [];
        foreach ($validatedSelections as $selection) {
            $matchId = (string) ($selection['matchId'] ?? '');
            if ($matchId === '') {
                continue;
            }
            $byMatch[$matchId][] = $selection;
        }

        foreach ($byMatch as $legs) {
            if (count($legs) < 2) {
                continue; // not a same-game cluster
            }
            if (!$sgpOn) {
                // Historical behavior: no two legs may share an event.
                throw new ApiException('Unsupported same-game combination. Select different events.', 400, [
                    'code' => 'INVALID_COMBINATION',
                ]);
            }
            // SGP on: allow the cluster UNLESS a TIER-1 pair conflicts. The
            // error NAMES the conflicting pair (PO decision 2026-07-17) so the
            // player knows exactly which two picks to change — for a round
            // robin this rejects the WHOLE group, never a filtered subset
            // (a displayed parlay count that isn't nCr is dispute bait).
            $n = count($legs);
            for ($i = 0; $i < $n; $i++) {
                for ($j = $i + 1; $j < $n; $j++) {
                    $conflict = self::sameGameConflict($legs[$i], $legs[$j]);
                    if ($conflict !== null) {
                        $labelA = self::sgpLegLabel($legs[$i]);
                        $labelB = self::sgpLegLabel($legs[$j]);
                        throw new ApiException(
                            'These picks can\'t be combined from the same game: "' . $labelA . '" + "' . $labelB . '". Change one of them.',
                            400,
                            [
                                'code' => 'INVALID_COMBINATION',
                                'reason' => $conflict,
                                'legA' => $labelA,
                                'legB' => $labelB,
                            ]
                        );
                    }
                }
            }

            // Nested PLAYER props can't be rule-detected (the player is only in
            // the selection string), so cap player props per same-game cluster
            // — two can't nest if only one is allowed. Config-tunable.
            $propCap = isset($sgpConfig['maxPlayerPropsPerGame']) && is_numeric($sgpConfig['maxPlayerPropsPerGame'])
                ? max(1, (int) $sgpConfig['maxPlayerPropsPerGame'])
                : self::SGP_DEFAULT_MAX_PLAYER_PROPS_PER_GAME;
            $propCount = 0;
            foreach ($legs as $leg) {
                if (OddsMarketCatalog::isPropMarket(strtolower((string) ($leg['marketType'] ?? '')))) {
                    $propCount++;
                }
            }
            if ($propCount > $propCap) {
                throw new ApiException('Unsupported same-game combination. Select different events.', 400, [
                    'code' => 'INVALID_COMBINATION',
                    'reason' => 'PLAYER_PROP_LIMIT',
                ]);
            }
        }

        if ($betType === 'teaser') {
            foreach ($validatedSelections as $selection) {
                $marketType = strtolower((string) ($selection['marketType'] ?? ''));
                if (!in_array($marketType, ['spreads', 'totals'], true)) {
                    throw new ApiException('Teasers only support spread and total markets.', 400, [
                        'code' => 'INVALID_TEASER_MARKET',
                    ]);
                }
            }
        }
    }

    /**
     * Snap a decimal odds value to the cleanest American line that's within
     * tolerance, so what the player sees on the ticket actually matches the
     * Risk/Win math. Upstream feeds frequently store -120 as 1.8333 (4dp
     * truncation) or 1.83000 (3dp); we promote those back to the exact
     * 1 + 100/120 = 1.83333... so 1000-win → 1200-risk to the penny. If the
     * value is genuinely between integer American lines (e.g. real -120.5 →
     * 1.829876…) we leave it alone so the half-point survives end-to-end.
     *
     * Rule: convert decimal → exact American (no rounding); compute the
     * decimal of the *rounded* American integer; if that decimal is within
     * 0.001 of the input, snap. Otherwise keep the input unchanged.
     */
    public static function snapDecimalOdds(mixed $value): float
    {
        $decimal = is_numeric($value) ? (float) $value : 0.0;
        if (!is_finite($decimal) || $decimal <= 1.0) {
            return $decimal;
        }

        $american = $decimal >= 2.0
            ? ($decimal - 1.0) * 100.0
            : -100.0 / ($decimal - 1.0);
        if (!is_finite($american) || $american === 0.0) {
            return $decimal;
        }

        $rounded = (float) round($american);
        if ($rounded === 0.0) {
            return $decimal;
        }
        $integerDecimal = $rounded > 0
            ? 1.0 + ($rounded / 100.0)
            : 1.0 + (100.0 / abs($rounded));

        return abs($decimal - $integerDecimal) < 0.001 ? $integerDecimal : $decimal;
    }

    /**
     * @param array<string, mixed> $validatedSelection
     * @return array<string, mixed>
     */
    public static function applyTeaserAdjustment(array $validatedSelection, float $teaserPoints): array
    {
        if ($teaserPoints <= 0) {
            return $validatedSelection;
        }

        $marketType = strtolower((string) ($validatedSelection['marketType'] ?? ''));
        $point = array_key_exists('point', $validatedSelection) ? $validatedSelection['point'] : null;
        if ($point === null || !is_numeric($point)) {
            throw new ApiException('Teaser requires selections with a valid point spread or total.', 400, [
                'code' => 'INVALID_TEASER_SELECTION',
            ]);
        }

        $originalPoint = (float) $point;
        $adjustedPoint = $originalPoint;
        if ($marketType === 'spreads') {
            $adjustedPoint = $originalPoint + $teaserPoints;
        } elseif ($marketType === 'totals') {
            $selection = strtolower((string) ($validatedSelection['selection'] ?? ''));
            $adjustedPoint = str_contains($selection, 'over')
                ? $originalPoint - $teaserPoints
                : $originalPoint + $teaserPoints;
        } else {
            throw new ApiException('Teaser requires spread or total selections.', 400, [
                'code' => 'INVALID_TEASER_SELECTION',
            ]);
        }

        $validatedSelection['basePoint'] = $originalPoint;
        $validatedSelection['point'] = round($adjustedPoint, 2);
        $validatedSelection['teaserAdjustment'] = round($adjustedPoint - $originalPoint, 2);
        return $validatedSelection;
    }

    /**
     * @param array<string, mixed> $bet
     * @return array<int, array<string, mixed>>
     */
    public static function ensureSelectionRowsForBet(SqlRepository $db, array $bet): array
    {
        $betId = (string) ($bet['id'] ?? '');
        if ($betId === '') {
            return [];
        }

        $rows = $db->findMany('betselections', ['betId' => $betId], ['sort' => ['selectionOrder' => 1]]);
        if ($rows !== []) {
            return $rows;
        }

        $legacySelections = is_array($bet['selections'] ?? null) ? $bet['selections'] : [];
        if ($legacySelections === []) {
            $legacySelections = [[
                'matchId' => $bet['matchId'] ?? null,
                'selection' => $bet['selection'] ?? null,
                'odds' => $bet['odds'] ?? null,
                'marketType' => $bet['type'] ?? 'straight',
                'point' => null,
                'status' => $bet['status'] ?? 'pending',
                'matchSnapshot' => $bet['matchSnapshot'] ?? new stdClass(),
            ]];
        }

        $ticketId = (string) ($bet['ticketId'] ?? $betId);
        $userId = (string) ($bet['userId'] ?? '');
        $betType = (string) ($bet['type'] ?? 'straight');
        $createdAt = (string) ($bet['createdAt'] ?? SqlRepository::nowUtc());
        $updatedAt = (string) ($bet['updatedAt'] ?? $createdAt);
        foreach (array_values($legacySelections) as $index => $selection) {
            if (!is_array($selection)) {
                continue;
            }
            $row = self::selectionRowFromTicket($betId, $ticketId, $userId, $betType, $selection, $index, $createdAt, $updatedAt);
            $db->insertOne('betselections', $row);
        }

        return $db->findMany('betselections', ['betId' => $betId], ['sort' => ['selectionOrder' => 1]]);
    }

    /**
     * @param array<int, array<string, mixed>> $bets
     */
    public static function backfillSelectionRowsForBets(SqlRepository $db, array $bets): void
    {
        foreach ($bets as $bet) {
            if (is_array($bet)) {
                self::ensureSelectionRowsForBet($db, $bet);
            }
        }
    }

    /**
     * @param array<string, mixed> $bet
     * @param array<int, array<string, mixed>> $selectionDocs
     */
    public static function upsertSelectionRowsForBet(SqlRepository $db, array $bet, array $selectionDocs): void
    {
        $betId = (string) ($bet['id'] ?? '');
        if ($betId === '') {
            return;
        }

        $ticketId = (string) ($bet['ticketId'] ?? $betId);
        $userId = (string) ($bet['userId'] ?? '');
        $betType = (string) ($bet['type'] ?? 'straight');
        $createdAt = (string) ($bet['createdAt'] ?? SqlRepository::nowUtc());
        $updatedAt = (string) ($bet['updatedAt'] ?? SqlRepository::nowUtc());
        foreach (array_values($selectionDocs) as $index => $selection) {
            if (!is_array($selection)) {
                continue;
            }
            $db->insertOne('betselections', self::selectionRowFromTicket(
                $betId,
                $ticketId,
                $userId,
                $betType,
                $selection,
                $index,
                $createdAt,
                $updatedAt
            ));
        }
    }

    /**
     * Slim a match doc down to the fields a stored bet-leg matchSnapshot
     * actually needs. The snapshot used to be the ENTIRE match doc — up to
     * 233KB per leg (playerProps ~182KB + odds ~29KB + extendedMarkets
     * ~21KB), stored twice per leg (bets.selections[] AND betselections),
     * which made 125 bets weigh 53MB and would grow ~200MB/day at real
     * volume.
     *
     * Drop-list, verified against every reader (2026-07-21):
     *   - odds / extendedMarkets / playerProps are read by NO live code
     *     path on a STORED snapshot. Settlement grades against the live
     *     match doc (BetSettlementService fetches it fresh); the leg row
     *     itself carries the booked line (odds/point/side/teamSide).
     *     The only code that read snapshot.odds.markets was
     *     BetsController::getLegResult — dead code, zero callers.
     *   - Everything else stays, notably: homePitcher/awayPitcher +
     *     sportKey/startTime (listedPitcherVoid — a VOID money path),
     *     homeTeamId/awayTeamId (PlayerPropTeam), status/score/startTime
     *     (My Bets live badge), team name variants + sport/eventName
     *     (display labels, outrightLabel).
     * Keep this a BLACKLIST: unknown small fields flow through, so a new
     * display field on the match doc never silently vanishes from slips.
     *
     * @param array<string, mixed> $match
     * @return array<string, mixed>
     */
    public static function slimMatchSnapshot(array $match): array
    {
        unset($match['odds'], $match['extendedMarkets'], $match['playerProps']);
        return $match;
    }

    /**
     * Append ONE new leg row to an existing ticket at $index (the current
     * leg count, 0-based). upsertSelectionRowsForBet inserts the WHOLE set
     * by array index and would duplicate the legs already stored, so the
     * open-parlay add-leg path uses this to insert just the new row at the
     * correct selectionOrder. The row id hash keys off betId|index, matching
     * selectionRowFromTicket, so it stays stable and collision-free.
     *
     * @param array<string, mixed> $bet
     * @param array<string, mixed> $selection a selectionForInsert-shaped leg
     */
    public static function appendSelectionRowForBet(SqlRepository $db, array $bet, array $selection, int $index): void
    {
        $betId = (string) ($bet['id'] ?? '');
        if ($betId === '') {
            return;
        }
        $ticketId = (string) ($bet['ticketId'] ?? $betId);
        $userId = (string) ($bet['userId'] ?? '');
        $betType = (string) ($bet['type'] ?? 'parlay');
        $createdAt = (string) ($bet['createdAt'] ?? SqlRepository::nowUtc());
        $updatedAt = SqlRepository::nowUtc();
        $db->insertOne('betselections', self::selectionRowFromTicket(
            $betId,
            $ticketId,
            $userId,
            $betType,
            $selection,
            $index,
            $createdAt,
            $updatedAt
        ));
    }

    /**
     * @param array<string, mixed> $bet
     * @param array<int, array<string, mixed>> $selectionRows
     * @return array<string, mixed>
     */
    public static function enrichBetForResponse(array $bet, array $selectionRows): array
    {
        $sorted = self::sortSelectionRows($selectionRows);
        $bet['ticketId'] = (string) ($bet['ticketId'] ?? ($bet['id'] ?? ''));
        // Ticket money fields preserve 2dp precision — these are
        // exact stored values (DECIMAL(14,2)). ceil() previously
        // rounded a Win-mode parlay's $169.49 risk up to $170 in the
        // response, hiding the actual stake. Settlement reads the
        // stored value directly, so display-side ceil was decorative
        // and broke parity with the bet-review modal.
        $bet['riskAmount'] = (float) round(self::riskAmount($bet), 2);
        $bet['unitStake'] = (float) round(self::unitStake($bet), 2);
        $bet['amount'] = (float) round(self::num($bet['amount'] ?? 0), 2);
        $bet['potentialPayout'] = (float) round(self::num($bet['potentialPayout'] ?? 0), 2);
        if (isset($bet['payout']) && is_numeric($bet['payout'])) {
            $bet['payout'] = (float) round(self::num($bet['payout']), 2);
        }
        if (isset($bet['profit']) && is_numeric($bet['profit'])) {
            $bet['profit'] = (float) round(self::num($bet['profit']), 2);
        }
        // Balance snapshots keep ceil — they follow the PPH whole-dollar
        // policy (player should never see a balance lower than what's stored).
        if (isset($bet['balanceBefore']) && is_numeric($bet['balanceBefore'])) {
            $bet['balanceBefore'] = (float) ceil(self::num($bet['balanceBefore']));
        }
        if (isset($bet['balanceAfter']) && is_numeric($bet['balanceAfter'])) {
            $bet['balanceAfter'] = (float) ceil(self::num($bet['balanceAfter']));
        }
        $bet['combinedOdds'] = self::combinedOdds(self::num($bet['riskAmount']), self::num($bet['potentialPayout']));
        $bet['odds'] = self::combinedOdds(self::num($bet['riskAmount']), self::num($bet['potentialPayout']));
        $bet['selections'] = array_map(static fn (array $row): array => self::selectionRowForBetDoc($row), $sorted);
        $bet['description'] = self::descriptionForSelections($sorted);
        return $bet;
    }

    /**
     * @param array<string, mixed> $match
     * @param array<string, mixed> $selection
     */
    /**
     * MLB "listed pitcher" void test for a single leg.
     *
     * Returns true when this baseball team-vs-team leg should be voided (and
     * the stake refunded) because a listed starting pitcher was changed and
     * the player did not take Action on that side. The listed pitchers come
     * from the leg's own placement snapshot (who was posted when the bet was
     * accepted); the actual starters come from the match doc at settlement.
     *
     * Money-safe by construction:
     *  - Disabled wholesale via MLB_LISTED_PITCHER_VOID_ENABLED=0 (kill switch
     *    so prod can turn it off without a deploy).
     *  - Only baseball, only non-prop markets (props have their own grading).
     *  - Voids ONLY on a positively-confirmed different pitcher id on a side
     *    the player didn't waive. Any missing id (no pitcher listed at
     *    placement, or none recorded at settlement) is treated as "no change"
     *    and never voids — we never refund on a guess.
     *
     * @param array<string,mixed> $match
     * @param array<string,mixed> $selection  betselections row / bet selection
     */
    public static function listedPitcherVoid(array $match, array $selection): bool
    {
        $flag = strtolower(trim((string) Env::get('MLB_LISTED_PITCHER_VOID_ENABLED', '1')));
        if ($flag === '0' || $flag === 'false' || $flag === 'off') {
            return false;
        }

        $snapshot = is_array($selection['matchSnapshot'] ?? null) ? $selection['matchSnapshot'] : [];
        $sportKey = strtolower((string) ($match['sportKey'] ?? ($snapshot['sportKey'] ?? '')));
        if (!str_starts_with($sportKey, 'baseball')) {
            return false;
        }

        // Player props are not the team-vs-team listed-pitcher markets the
        // rule applies to (a pitcher-strikeouts prop voids under its own rule).
        $marketType = strtolower((string) ($selection['marketType'] ?? ''));
        foreach (['pitcher_', 'batter_', 'player_'] as $propPrefix) {
            if (str_starts_with($marketType, $propPrefix)) {
                return false;
            }
        }

        // Void hardening: only act on a CONFIRMED actual starter, never a
        // pre-game probable. The settlement match doc's homePitcher/awayPitcher
        // are rewritten only by a FULL event sync (RundownEventMapper::toMatchDoc,
        // which stamps pitchersSyncedAt); the live score tick refreshes the
        // score and bumps lastUpdated WITHOUT touching pitchers. So a pitcher id
        // here can still be the probable listed days out. Require that the
        // pitcher data was synced at/after first pitch before we ever void —
        // otherwise we would refund off a stale guess. A clean final that the
        // live sweep flipped to 'finished' carries pre-game pitchersSyncedAt and
        // is intentionally NOT voidable here (the settlement final-refetch path
        // re-syncs the full event, stamping a post-start pitchersSyncedAt, when
        // a stuck game is healed). Missing/earlier stamp → never void.
        $pitchersSyncedAt = strtotime((string) ($match['pitchersSyncedAt'] ?? ''));
        $gameStart        = strtotime((string) ($match['startTime'] ?? ($snapshot['startTime'] ?? '')));
        if ($pitchersSyncedAt === false || $gameStart === false || $pitchersSyncedAt < $gameStart) {
            return false;
        }

        $action = is_array($selection['pitcherAction'] ?? null) ? $selection['pitcherAction'] : [];
        foreach (['home' => 'homePitcher', 'away' => 'awayPitcher'] as $side => $field) {
            if (!empty($action[$side])) {
                continue; // player took Action on this side → it never voids
            }
            $listedId  = (int) ($snapshot[$field]['id'] ?? 0);
            $currentId = (int) ($match[$field]['id'] ?? 0);
            if ($listedId > 0 && $currentId > 0 && $listedId !== $currentId) {
                return true;
            }
        }
        return false;
    }

    /**
     * MLB "official game" status for full-game (ML / run line / total) grading.
     *
     * Books require a baseball game to reach official length before full-game
     * wagers have action: a full 9 innings, OR 8½ innings when the home team is
     * ahead after the top of the 9th (the home half is not played). Extra-inning
     * games (>9) are always official. A game called or suspended before that is
     * "no action" → the wager voids and the stake is refunded. This matches the
     * policy banner shown to players, which MUST stay in lockstep with this
     * code — a banner/behavior mismatch is a dispute.
     *
     * Returns:
     *   'official' — confirmed ≥ 9 innings, or rule N/A (non-baseball / disabled)
     *   'short'    — feed POSITIVELY reports < 9 innings → caller voids
     *   'unknown'  — no inning signal at all → caller keeps the leg pending for
     *                manual review (never auto-voids, never grades on a guess)
     *
     * Money-safe: 'short' fires only on a positive sub-9 inning count; when the
     * feed carries no inning signal we return 'unknown' so we neither refund
     * (leak) nor grade a possibly-shortened game (wrong grade).
     *
     * @param array<string,mixed> $match
     */
    public static function baseballOfficialGameStatus(array $match): string
    {
        $sportKey = strtolower((string) ($match['sportKey'] ?? ''));
        if (!str_starts_with($sportKey, 'baseball')) {
            return 'official'; // rule applies to baseball only
        }
        $flag = strtolower(trim((string) Env::get('MLB_OFFICIAL_GAME_RULE_ENABLED', '1')));
        if ($flag === '0' || $flag === 'false' || $flag === 'off') {
            return 'official'; // kill switch → grade exactly as before
        }

        $score  = is_array($match['score'] ?? null) ? $match['score'] : [];
        $homeBy = is_array($score['score_home_by_period'] ?? null) ? $score['score_home_by_period'] : [];
        $awayBy = is_array($score['score_away_by_period'] ?? null) ? $score['score_away_by_period'] : [];
        $gamePeriod = (int) ($score['game_period'] ?? 0);

        // Innings on record = the longest signal available. by_period is the
        // per-inning line score; game_period is the final inning number. The
        // 8½ case (home ahead, bottom 9th not batted) still reports game_period
        // 9 and an away line score of 9 innings, so max(...) lands on 9.
        $innings = max($gamePeriod, count($homeBy), count($awayBy));

        if ($innings <= 0) {
            return 'unknown'; // no inning signal → manual review, never auto-void
        }
        if ($innings >= 9) {
            return 'official'; // 9, 8½-with-home-lead, or extra innings
        }
        return 'short'; // positively fewer than 9 innings → no action
    }

    public static function selectionResult(array $match, array $selection, ?string $manualWinner = null, ?array $playerStats = null): string
    {
        return self::selectionResultDetailed($match, $selection, $manualWinner, $playerStats)['status'];
    }

    /**
     * Fraction-aware sibling of selectionResult(). Returns the SAME binary leg
     * status (won/lost/void/pending) — so every existing status consumer keeps
     * working unchanged — PLUS a settleFraction in (0,1].
     *
     * settleFraction is 1.0 for every normal half/whole-line leg, so the pair
     * (status, settleFraction) reproduces the old binary disposition exactly. A
     * soccer Asian QUARTER line (.25/.75) that lands on its boundary integer
     * splits the stake across the two adjacent half/whole lines: such a leg
     * reports status 'won' + settleFraction 0.5 (half win) or status 'lost' +
     * settleFraction 0.5 (half loss). The settlement payout reads
     * (status, settleFraction) via legMultiplier() to pay/refund the correct
     * partial; the transactions ledger, agent 95/5 commission and summary
     * totals stay correct because they read the resulting DOLLAR payout, never
     * the fraction.
     *
     * @return array{status:string, settleFraction:float}
     */
    public static function selectionResultDetailed(array $match, array $selection, ?string $manualWinner = null, ?array $playerStats = null): array
    {
        $effectiveStatus = SportsMatchStatus::effectiveStatus($match);
        if ($manualWinner !== null) {
            $selectionName = (string) ($selection['selection'] ?? '');
            return self::detailedBinary($selectionName === $manualWinner ? 'won' : 'lost');
        }

        // Only an explicit cancel signal (operator action OR upstream
        // feed flagging the match as canceled/postponed/abandoned)
        // auto-voids open bets. 'expired' — the catch-all for matches
        // whose feed went quiet past the grace window — used to void
        // here too, but that silently refunded bets we couldn't grade
        // even though the game may have actually been played. Now an
        // expired match stays pending so a human reviews it before
        // money moves. See SportsMatchStatus::effectiveStatus for how
        // 'expired' is produced.
        if ($effectiveStatus === 'canceled') {
            return self::detailedBinary('void');
        }

        if ($effectiveStatus !== 'finished') {
            return self::detailedBinary('pending');
        }

        // MLB listed-pitcher rule: a team-vs-team baseball leg (moneyline,
        // run line, total, team total, 1st-5-innings, NRFI) voids if a listed
        // starting pitcher was scratched and the player didn't take Action on
        // that side. Checked before grading so a pitcher change wins over the
        // score result — the player gets their stake back regardless of how
        // the game finished. Money-safe: only voids on a positively-confirmed
        // different starter (see listedPitcherVoid).
        if (self::listedPitcherVoid($match, $selection)) {
            return self::detailedBinary('void');
        }

        $marketType = strtolower((string) ($selection['marketType'] ?? ''));

        // Player props grade off the player's box-score stats, matched by stable
        // player id (selectionPid). The settlement sweep supplies $playerStats
        // ONLY when prop settlement is enabled and the box score is available;
        // without it (flag off, no stats, or a pre-player-id leg) the prop stays
        // 'pending' — never a guessed grade.
        if (PlayerPropSettlement::isGradableProp($marketType)) {
            return self::detailedBinary($playerStats !== null
                ? PlayerPropSettlement::grade($selection, $playerStats)
                : 'pending');
        }

        $selectionName = (string) ($selection['selection'] ?? '');
        $point = array_key_exists('point', $selection) && is_numeric($selection['point']) ? (float) $selection['point'] : null;
        $homeTeam = (string) ($match['homeTeam'] ?? '');
        $awayTeam = (string) ($match['awayTeam'] ?? '');
        // Team totals grade off these STRUCTURED fields, never the display
        // name. Null/garbage on a team-total leg → gradeAgainstScore returns
        // 'pending' (never a guessed grade). Ignored by every other market.
        $teamSide = isset($selection['teamSide']) ? strtolower((string) $selection['teamSide']) : null;
        $side = isset($selection['side']) ? strtolower((string) $selection['side']) : null;

        // Resolve the stored marketType (e.g. 'spreads', 'alternate_totals',
        // 'h2h_q1', 'totals_1st_5_innings') into a gradeable base market and
        // an optional period suffix. Returns null for market families we do
        // NOT auto-grade (3-way ML, team totals, BTTS, draw-no-bet, double-
        // chance, player props) — those stay 'pending' for an operator
        // rather than ever risk a wrong auto-grade. Alternate lines collapse
        // to their base (alternate_spreads → spreads); the bet carries its
        // own `point`, so alt grading is identical to the base market.
        $parsed = self::parseGradableMarket($marketType);
        if ($parsed === null) {
            return self::detailedBinary('pending');
        }
        $baseMarket = $parsed['base'];     // 'h2h' | 'spreads' | 'totals'
        $periodSuffix = $parsed['suffix']; // null (full game) or 'q1','h1','p2','1st_5_innings', ...

        if ($periodSuffix === null) {
            // MLB official-game rule (full-game ML / run line / total only):
            // a baseball game must reach official length (9 innings, or 8½ with
            // the home team ahead) for the wager to have action. A game called
            // short is no action → void; if the feed carries no inning signal we
            // keep the leg pending for manual review rather than refund on a
            // guess or grade a possibly-shortened game. No-op for every other
            // sport (returns 'official') and when the kill switch is off. Period
            // markets (1st-5-innings, etc.) are graded below and carry their own
            // sufficiency check via periodScorePair.
            $officialGame = self::baseballOfficialGameStatus($match);
            if ($officialGame === 'short') {
                return self::detailedBinary('void');
            }
            if ($officialGame === 'unknown') {
                return self::detailedBinary('pending');
            }

            // Full-game grading. Moneyline uses score_home/score_away as-is
            // (for tennis that is SETS — more sets wins, correct). Spreads/
            // totals use spreadTotalScores() (games for tennis, raw score
            // elsewhere).
            if ($baseMarket === 'h2h') {
                $scoreHome = self::num($match['score']['score_home'] ?? 0);
                $scoreAway = self::num($match['score']['score_away'] ?? 0);
            } else {
                $st = self::spreadTotalScores($match);
                if ($st === null) {
                    return self::detailedBinary('pending');
                }
                [$scoreHome, $scoreAway] = $st;
            }
        } else {
            // Period / half / quarter / inning grading. Sum the per-period
            // slice from score_*_by_period. Money-safe: periodScorePair
            // returns null (→ 'pending') whenever the league's period
            // structure is unknown OR the by_period data is too short to
            // cover the requested slice, so a wrong slice can never be
            // graded. Tennis set markets (_set_N) also route here: by_period
            // holds per-set games, so set grading sums games in that set
            // (correct for h2h/spreads/totals at set level).
            $ps = self::periodScorePair($match, $periodSuffix);
            if ($ps === null) {
                // The feed never supplied a gradeable per-period score for this
                // finished match. Keep the leg pending so the feed or an
                // operator can still grade it — UNTIL the scheduled-start grace
                // window elapses, after which we treat the period market as
                // un-gradeable and auto-void it (stake refunded via the standard
                // void path) rather than tying up player money indefinitely.
                // effectiveStatus is already 'finished' here (checked above).
                return self::detailedBinary(self::periodGraceExpired($match) ? 'void' : 'pending');
            }
            [$scoreHome, $scoreAway] = $ps;
        }

        return self::detailedFromGrade($baseMarket, $selectionName, $point, $scoreHome, $scoreAway, $homeTeam, $awayTeam, $teamSide, $side);
    }

    /**
     * Wrap a binary grade as a fraction-aware result (settleFraction 1.0).
     *
     * @return array{status:string, settleFraction:float}
     */
    private static function detailedBinary(string $status): array
    {
        return ['status' => $status, 'settleFraction' => 1.0];
    }

    /**
     * Final grading step shared by full-game and period legs. Routes soccer
     * Asian QUARTER lines (.25/.75 on spreads/totals/team_totals) through the
     * split-stake grader and maps the disposition to (status, settleFraction);
     * everything else grades single-line exactly as before (settleFraction
     * 1.0). When the quarter grader returns null (e.g. a half graded pending,
     * or a non-quarter point) we fall back to the single-line grade so a leg
     * is never lost.
     *
     * @return array{status:string, settleFraction:float}
     */
    private static function detailedFromGrade(
        string $baseMarket,
        string $selectionName,
        ?float $point,
        float $scoreHome,
        float $scoreAway,
        string $homeTeam,
        string $awayTeam,
        ?string $teamSide = null,
        ?string $side = null
    ): array {
        if (self::isQuarterPoint($point)
            && in_array($baseMarket, ['spreads', 'totals', 'team_totals'], true)) {
            $q = self::gradeQuarterAware($baseMarket, $selectionName, $point, $scoreHome, $scoreAway, $homeTeam, $awayTeam, $teamSide, $side);
            if ($q !== null) {
                return match ($q['label']) {
                    'win'       => ['status' => 'won',  'settleFraction' => 1.0],
                    'half_win'  => ['status' => 'won',  'settleFraction' => 0.5],
                    'half_loss' => ['status' => 'lost', 'settleFraction' => 0.5],
                    'loss'      => ['status' => 'lost', 'settleFraction' => 1.0],
                    default     => self::detailedBinary(self::gradeAgainstScore($baseMarket, $selectionName, $point, $scoreHome, $scoreAway, $homeTeam, $awayTeam, $teamSide, $side)),
                };
            }
        }
        return self::detailedBinary(self::gradeAgainstScore($baseMarket, $selectionName, $point, $scoreHome, $scoreAway, $homeTeam, $awayTeam, $teamSide, $side));
    }

    /**
     * Grade a single h2h/spreads/totals selection against a resolved score
     * pair. Shared by full-game and period grading so the win/lose/push
     * rules are byte-identical for both. `$point` is the bet's stored line
     * (already buy-points/teaser adjusted upstream).
     */
    private static function gradeAgainstScore(
        string $baseMarket,
        string $selectionName,
        ?float $point,
        float $scoreHome,
        float $scoreAway,
        string $homeTeam,
        string $awayTeam,
        ?string $teamSide = null,
        ?string $side = null
    ): string {
        // Full-game team totals: grade the PICKED team's score against the
        // line. We use the structured teamSide ('home'|'away') and side
        // ('over'|'under') stored on the leg — never the display name. Any
        // missing/invalid structured field → 'pending' (an operator settles
        // it) rather than a guessed grade. Push (team score == line) → 'void'
        // → stake refunded via the standard total void/refund path.
        if ($baseMarket === 'team_totals') {
            if ($point === null) return 'pending';
            if ($teamSide !== 'home' && $teamSide !== 'away') return 'pending';
            if ($side !== 'over' && $side !== 'under') return 'pending';
            $teamScore = $teamSide === 'home' ? $scoreHome : $scoreAway;
            if ($side === 'over') {
                if ($teamScore > $point) return 'won';
                if ($teamScore === $point) return 'void';
                return 'lost';
            }
            if ($teamScore < $point) return 'won';
            if ($teamScore === $point) return 'void';
            return 'lost';
        }

        if ($baseMarket === 'h2h') {
            $side = self::resolveSelectionSide($selectionName, $homeTeam, $awayTeam);
            if ($scoreHome > $scoreAway) {
                if ($side === 'home') return 'won';
                if ($side === 'away') return 'lost';
                // Decisive result but the pick is neither side: a Draw bet
                // loses; anything else we can't tie to a side stays pending
                // for an operator rather than a wrong auto-loss.
                return strcasecmp($selectionName, 'Draw') === 0 ? 'lost' : 'pending';
            }
            if ($scoreAway > $scoreHome) {
                if ($side === 'away') return 'won';
                if ($side === 'home') return 'lost';
                return strcasecmp($selectionName, 'Draw') === 0 ? 'lost' : 'pending';
            }
            return strcasecmp($selectionName, 'Draw') === 0 ? 'won' : 'void';
        }

        if ($baseMarket === 'spreads' && $point !== null) {
            $side = self::resolveSelectionSide($selectionName, $homeTeam, $awayTeam);
            if ($side === 'home') {
                $adjusted = $scoreHome + $point;
                if ($adjusted > $scoreAway) return 'won';
                if ($adjusted === $scoreAway) return 'void';
                return 'lost';
            }
            if ($side === 'away') {
                $adjusted = $scoreAway + $point;
                if ($adjusted > $scoreHome) return 'won';
                if ($adjusted === $scoreHome) return 'void';
                return 'lost';
            }
            return 'pending'; // couldn't tie the pick to a side
        }

        if ($baseMarket === 'totals' && $point !== null) {
            $total = $scoreHome + $scoreAway;
            $isOver = str_contains(strtolower($selectionName), 'over');
            if ($isOver) {
                if ($total > $point) return 'won';
                if ($total === $point) return 'void';
                return 'lost';
            }
            if ($total < $point) return 'won';
            if ($total === $point) return 'void';
            return 'lost';
        }

        return 'pending';
    }

    /**
     * ── PHASE 2 (NOT WIRED LIVE) ──────────────────────────────────────────
     * Quarter-aware (Asian split handicap) grading. A quarter line (.25/.75)
     * settles as HALF the stake on each adjacent half/whole line, graded
     * independently, results summed. This function is built + unit-tested in
     * isolation and is NOT called by the live settlement path. Do not wire it
     * into gradeAgainstScore / payout / parlay roll-up until reviewed.
     *
     * Mechanism: for a quarter point P, the lower line is P-0.25 and the upper
     * line is P+0.25 (both land on .0/.5). Half the stake grades at each via
     * the existing single-line gradeAgainstScore rules. Because the two lines
     * are exactly 0.5 apart and scores are integers, the only reachable combos
     * are: (won,won)=full win, (won,void)/(void,won)=half win, (lost,void)/
     * (void,lost)=half loss, (lost,lost)=full loss. (won,lost) and (void,void)
     * are mathematically unreachable for a quarter line.
     *
     * Returns fractions of the stake by disposition (won/push/lost), which sum
     * to 1.0, plus a human label. Returns null when $point is NOT a quarter
     * line (caller keeps the existing single-line path) or when either half
     * grades 'pending' (ambiguous → operator settles, never a guessed grade).
     *
     * @return array{label:string, wonFraction:float, pushFraction:float, lostFraction:float}|null
     */
    public static function gradeQuarterAware(
        string $baseMarket,
        string $selectionName,
        ?float $point,
        float $scoreHome,
        float $scoreAway,
        string $homeTeam,
        string $awayTeam,
        ?string $teamSide = null,
        ?string $side = null
    ): ?array {
        if (!self::isQuarterPoint($point)) {
            return null;
        }
        // $point is non-null here (isQuarterPoint rejects null).
        $lowerLine = $point - 0.25; // e.g. -0.25 -> -0.50 ; +0.25 -> 0.00
        $upperLine = $point + 0.25; // e.g. -0.25 ->  0.00 ; +0.25 -> 0.50

        $gLower = self::gradeAgainstScore($baseMarket, $selectionName, $lowerLine, $scoreHome, $scoreAway, $homeTeam, $awayTeam, $teamSide, $side);
        $gUpper = self::gradeAgainstScore($baseMarket, $selectionName, $upperLine, $scoreHome, $scoreAway, $homeTeam, $awayTeam, $teamSide, $side);

        // Any non-gradeable half → don't guess; let an operator settle.
        $allowed = ['won', 'lost', 'void'];
        if (!in_array($gLower, $allowed, true) || !in_array($gUpper, $allowed, true)) {
            return null;
        }

        $frac = static function (string $g): array {
            // [won, push, lost] for a single 0.5-stake half.
            if ($g === 'won') return [0.5, 0.0, 0.0];
            if ($g === 'void') return [0.0, 0.5, 0.0];
            return [0.0, 0.0, 0.5]; // lost
        };
        [$wL, $pL, $lL] = $frac($gLower);
        [$wU, $pU, $lU] = $frac($gUpper);
        $won = $wL + $wU;
        $push = $pL + $pU;
        $lost = $lL + $lU;

        if ($won >= 1.0 - 1e-9) {
            $label = 'win';
        } elseif ($lost >= 1.0 - 1e-9) {
            $label = 'loss';
        } elseif ($won > 1e-9 && $push > 1e-9) {
            $label = 'half_win';
        } else { // lost + push
            $label = 'half_loss';
        }

        return [
            'label' => $label,
            'wonFraction' => $won,
            'pushFraction' => $push,
            'lostFraction' => $lost,
        ];
    }

    /**
     * PHASE 2 (NOT WIRED LIVE) — total amount returned to the bettor for a
     * graded quarter result. Won fraction pays at decimal odds (stake + profit
     * on that fraction); push fraction is refunded; lost fraction returns 0.
     * Return = stake*wonFraction*decimalOdds + stake*pushFraction.
     * Parlay effective decimal multiplier for the leg = return / stake
     * (i.e. wonFraction*decimalOdds + pushFraction), which composes
     * multiplicatively in a parlay roll-up exactly like a normal leg's odds.
     *
     * @param array{wonFraction:float, pushFraction:float, lostFraction:float} $fractions
     */
    public static function quarterReturn(float $stake, float $decimalOdds, array $fractions): float
    {
        $won = (float) ($fractions['wonFraction'] ?? 0.0);
        $push = (float) ($fractions['pushFraction'] ?? 0.0);
        return $stake * $won * $decimalOdds + $stake * $push;
    }

    /**
     * Split a stored marketType into the gradeable base market + optional
     * period suffix, or null when the market family is not auto-gradeable.
     *
     * Supported (auto-graded): h2h / spreads / totals, their `alternate_`
     * forms, and their period variants (_q1.._q4, _h1/_h2, _p1.._p3,
     * _1st_{1,3,5,7}_innings); plus FULL-GAME team_totals (graded on the
     * picked team's score via the leg's stored teamSide+side, not the name).
     *
     * NOT auto-graded (→ null → stays pending for an operator): 3-way ML
     * (h2h_3_way*), PERIOD team totals (team_totals_q1, etc.), BTTS,
     * draw-no-bet, double-chance, corners/cards, and every player prop.
     * These either need a result dimension the score doc doesn't carry
     * (props, corners, period TT — no per-period team split graded yet) or
     * have house-rule nuances (3-way regulation/OT) we will not guess at.
     *
     * @return array{base:string, suffix:?string}|null
     */
    private static function parseGradableMarket(string $marketType): ?array
    {
        $mt = trim(strtolower($marketType));
        if ($mt === '') {
            return null;
        }
        // Alternate lines grade exactly like their base — the differing line
        // is already stored on the bet as `point`.
        if (str_starts_with($mt, 'alternate_')) {
            $mt = substr($mt, strlen('alternate_'));
        }
        // Full-game base markets.
        if (in_array($mt, ['h2h', 'moneyline', 'ml', 'straight'], true)) {
            return ['base' => 'h2h', 'suffix' => null];
        }
        if ($mt === 'spreads') {
            return ['base' => 'spreads', 'suffix' => null];
        }
        if ($mt === 'totals') {
            return ['base' => 'totals', 'suffix' => null];
        }
        // Full-game team totals only. Period TT (team_totals_q1, ...) is NOT
        // matched here — it has no 'team_totals' exact form and won't match the
        // h2h/spreads/totals period loop below, so it falls through to null and
        // stays pending (no per-period team split is graded yet).
        if ($mt === 'team_totals') {
            return ['base' => 'team_totals', 'suffix' => null];
        }
        // Period variants: base_<suffix>, base ∈ {h2h,spreads,totals} and the
        // suffix is one we know how to map to by_period indices. Anything
        // else under those prefixes (e.g. h2h_3_way, totals_corners) is
        // intentionally rejected.
        $knownSuffixes = [
            'q1', 'q2', 'q3', 'q4',
            'h1', 'h2',
            'p1', 'p2', 'p3',
            '1st_1_innings', '1st_3_innings', '1st_5_innings', '1st_7_innings',
            'set_1', 'set_2', 'set_3',
        ];
        foreach (['h2h', 'spreads', 'totals'] as $base) {
            $prefix = $base . '_';
            if (str_starts_with($mt, $prefix)) {
                $suffix = substr($mt, strlen($prefix));
                if (in_array($suffix, $knownSuffixes, true)) {
                    return ['base' => $base, 'suffix' => $suffix];
                }
                return null; // unsupported variant under a known base
            }
        }
        return null;
    }

    /**
     * Resolve the (home, away) score for a period market by summing the
     * appropriate per-period slice of score_*_by_period.
     *
     * Money-safe by construction: returns null (caller leaves the leg
     * pending) whenever
     *   - by_period data is missing/empty,
     *   - the league's period structure for this suffix is unknown, or
     *   - the by_period array is shorter than the period structure requires
     *     (e.g. a halves-only league's 2-element array can never be graded
     *     as quarters — that guard prevents summing the whole game into an
     *     "H1" bet and mis-paying it).
     *
     * @param array<string,mixed> $match
     * @return array{0:float,1:float}|null
     */
    private static function periodScorePair(array $match, string $suffix): ?array
    {
        $score = is_array($match['score'] ?? null) ? $match['score'] : [];
        $homeBy = is_array($score['score_home_by_period'] ?? null) ? array_values($score['score_home_by_period']) : [];
        $awayBy = is_array($score['score_away_by_period'] ?? null) ? array_values($score['score_away_by_period']) : [];
        if ($homeBy === [] || $awayBy === []) {
            return null;
        }
        $plan = self::periodIndices(strtolower((string) ($match['sportKey'] ?? '')), $suffix);
        if ($plan === null) {
            return null;
        }
        [$indices, $minPeriods] = $plan;
        if (count($homeBy) < $minPeriods || count($awayBy) < $minPeriods) {
            return null;
        }
        $home = 0.0;
        $away = 0.0;
        foreach ($indices as $i) {
            if (!array_key_exists($i, $homeBy) || !array_key_exists($i, $awayBy)) {
                return null;
            }
            if (!is_numeric($homeBy[$i]) || !is_numeric($awayBy[$i])) {
                return null;
            }
            $home += (float) $homeBy[$i];
            $away += (float) $awayBy[$i];
        }
        return [$home, $away];
    }

    /**
     * Map a (sportKey, period suffix) to the by_period indices to sum and
     * the minimum array length that proves the league actually uses that
     * period structure. Returns null when we can't be certain.
     *
     * by_period is per-period scoring (points/goals/runs in THAT period,
     * not cumulative) — the same convention the tennis spread/total grading
     * already relies on in production. Period markets exclude overtime by
     * construction: they only sum specific regulation-period indices, while
     * full-game markets use score_home/away (which include OT).
     *
     * @return array{0:int[],1:int}|null  [indices, minPeriods]
     */
    private static function periodIndices(string $sportKey, string $suffix): ?array
    {
        // Hockey periods (NHL plays three 20-min periods).
        $hockey = ['p1' => [0], 'p2' => [1], 'p3' => [2]];
        if (isset($hockey[$suffix])) {
            return [$hockey[$suffix], 3];
        }
        // Quarters (basketball/football leagues that play four quarters).
        $quarters = ['q1' => [0], 'q2' => [1], 'q3' => [2], 'q4' => [3]];
        if (isset($quarters[$suffix])) {
            return [$quarters[$suffix], 4];
        }
        // Baseball inning splits — sum per-inning runs for the first N innings.
        $innings = ['1st_1_innings' => 1, '1st_3_innings' => 3, '1st_5_innings' => 5, '1st_7_innings' => 7];
        if (isset($innings[$suffix])) {
            $n = $innings[$suffix];
            return [range(0, $n - 1), $n];
        }
        // Halves — structure depends on the league's period layout:
        //   • soccer: by_period is two halves           → H1=[0], H2=[1]
        //   • NCAAB: genuinely two 20-min halves         → H1=[0], H2=[1]
        //   • other basketball + football: four quarters → H1=[0,1], H2=[2,3]
        // Unknown sports return null (stay pending) rather than guess. The
        // minPeriods guard (2 for true halves, 4 for quarter-leagues) stops
        // a halves-only array from being graded as quarters.
        if ($suffix === 'h1' || $suffix === 'h2') {
            if (str_starts_with($sportKey, 'soccer') || $sportKey === 'basketball_ncaab') {
                return $suffix === 'h1' ? [[0], 2] : [[1], 2];
            }
            if (str_starts_with($sportKey, 'basketball') || str_starts_with($sportKey, 'americanfootball')) {
                return $suffix === 'h1' ? [[0, 1], 4] : [[2, 3], 4];
            }
            return null;
        }
        // Tennis set markets. For tennis, score_*_by_period holds per-set GAMES
        // (the same convention spreadTotalScores() relies on), so set N is index
        // N-1: h2h_set_N grades on more games in that set (a finished set always
        // has a games winner), spreads/totals_set_N on the games in that set.
        // Only tennis carries _set_N markets — gate on the sportKey so a stray
        // colliding suffix from another sport can never grade against the wrong
        // structure (returns null → stays pending). minPeriods = N proves the
        // match actually reached that set before we grade it.
        if (preg_match('/^set_(\d+)$/', $suffix, $m)) {
            if (!str_starts_with($sportKey, 'tennis')) {
                return null;
            }
            $n = (int) $m[1];
            if ($n < 1) {
                return null;
            }
            return [[$n - 1], $n];
        }
        return null;
    }

    // Generous grace window (seconds past the scheduled start) before an
    // un-gradeable period leg on a FINISHED match is auto-voided. Anchored on
    // startTime because it is always present and immutable; 24h is far longer
    // than any game runs, so the backstop only ever fires well after a real
    // final — never mid-game.
    private const PERIOD_UNGRADEABLE_GRACE_SECONDS = 86400;

    /**
     * Whether the scheduled-start grace window has elapsed for this match.
     * Money-safe: a missing/unparseable startTime returns false, so the leg
     * stays pending for manual grading rather than auto-voiding on a guess.
     *
     * @param array<string,mixed> $match
     */
    private static function periodGraceExpired(array $match): bool
    {
        $startTime = (string) ($match['startTime'] ?? '');
        if ($startTime === '') {
            return false;
        }
        $startTs = strtotime($startTime);
        if ($startTs === false) {
            return false;
        }
        return (time() - $startTs) >= self::PERIOD_UNGRADEABLE_GRACE_SECONDS;
    }

    /**
     * True when this leg is a period market on a FINISHED match whose
     * per-period score the feed never supplied (periodScorePair → null), so it
     * cannot be auto-graded. Drives both the auto-void backstop and the
     * operator-facing signal. Returns false for non-period legs, gradeable
     * periods, and matches that are not finished.
     *
     * @param array<string,mixed> $match
     * @param array<string,mixed> $selection
     */
    public static function isUngradeablePeriodLeg(array $match, array $selection): bool
    {
        if (SportsMatchStatus::effectiveStatus($match) !== 'finished') {
            return false;
        }
        $parsed = self::parseGradableMarket(strtolower((string) ($selection['marketType'] ?? '')));
        if ($parsed === null || $parsed['suffix'] === null) {
            return false;
        }
        return self::periodScorePair($match, $parsed['suffix']) === null;
    }

    /**
     * Display (home, away) score for a settled leg. PERIOD legs show the
     * per-period slice they were graded on (e.g. a 1H bet shows the
     * first-half score, not the full-game final); everything else shows the
     * full-game score. Purely cosmetic — NEVER used for grading, so a missing
     * per-period slice safely falls back to the full-game score for display.
     *
     * @param array<string,mixed> $match
     * @param array<string,mixed> $selection
     * @return array{0:float,1:float}
     */
    public static function settledScorePair(array $match, array $selection): array
    {
        $parsed = self::parseGradableMarket(strtolower((string) ($selection['marketType'] ?? '')));
        if ($parsed !== null && $parsed['suffix'] !== null) {
            $ps = self::periodScorePair($match, $parsed['suffix']);
            if ($ps !== null) {
                return $ps;
            }
        }
        return [
            self::num($match['score']['score_home'] ?? 0),
            self::num($match['score']['score_away'] ?? 0),
        ];
    }

    /**
     * Home/away scores in the units that SPREAD and TOTAL markets are priced
     * in. Most sports: score_home/score_away (points / runs / goals). Tennis:
     * the board spread (e.g. -3.5) and total (e.g. 22.5) are GAMES, but
     * score_home/score_away are SETS — so sum the per-set games from
     * score_*_by_period. Moneyline still uses the set score (more sets wins),
     * so this is ONLY for spreads/totals.
     *
     * Returns null when a games-based sport has no per-period data to sum, so
     * the caller leaves the bet PENDING rather than grading it against the
     * wrong unit. Money-safe: never invent a number.
     *
     * @param array<string,mixed> $match
     * @return array{0:float,1:float}|null
     */
    private static function spreadTotalScores(array $match): ?array
    {
        $score = is_array($match['score'] ?? null) ? $match['score'] : [];
        $sportKey = strtolower((string) ($match['sportKey'] ?? ''));

        if (str_starts_with($sportKey, 'tennis')) {
            $homeBy = is_array($score['score_home_by_period'] ?? null) ? $score['score_home_by_period'] : [];
            $awayBy = is_array($score['score_away_by_period'] ?? null) ? $score['score_away_by_period'] : [];
            if ($homeBy === [] && $awayBy === []) {
                return null;
            }
            $homeGames = 0.0;
            foreach ($homeBy as $g) {
                if (is_numeric($g)) $homeGames += (float) $g;
            }
            $awayGames = 0.0;
            foreach ($awayBy as $g) {
                if (is_numeric($g)) $awayGames += (float) $g;
            }
            return [$homeGames, $awayGames];
        }

        return [self::num($score['score_home'] ?? 0), self::num($score['score_away'] ?? 0)];
    }

    /**
     * Tie a selection name to the home or away side, tolerant to short vs full
     * forms ("Huesler" ↔ "M. Huesler"). Returns 'home', 'away', or null.
     * null whenever resolution is AMBIGUOUS (matches both) or matches neither,
     * so settlement can never grade against the wrong side — a null lands the
     * leg in 'pending' for an operator. Mirrors BetsController::resolveTeamSide.
     */
    private static function resolveSelectionSide(string $selection, string $home, string $away): ?string
    {
        $s = strtolower(trim($selection));
        $h = strtolower(trim($home));
        $a = strtolower(trim($away));
        if ($s === '') {
            return null;
        }
        $matchesHome = $h !== '' && ($s === $h || str_contains($s, $h) || str_contains($h, $s));
        $matchesAway = $a !== '' && ($s === $a || str_contains($s, $a) || str_contains($a, $s));
        if ($matchesHome && !$matchesAway) {
            return 'home';
        }
        if ($matchesAway && !$matchesHome) {
            return 'away';
        }
        return null;
    }

    /**
     * @param array<string, mixed> $bet
     * @param array<int, array<string, mixed>> $selectionRows
     * @param array<string, mixed> $teaserRule
     * @return array{status: string, payout: float}
     */
    public static function evaluateTicket(array $bet, array $selectionRows, array $teaserRule = []): array
    {
        $type = strtolower((string) ($bet['type'] ?? 'straight'));
        $riskAmount = self::riskAmount($bet);
        $unitStake = self::unitStake($bet);
        $rows = self::sortSelectionRows($selectionRows);

        if ($rows === []) {
            return ['status' => 'pending', 'payout' => self::num($bet['potentialPayout'] ?? 0)];
        }

        if ($type === 'straight') {
            $straight = self::settleStraightLeg($rows[0], $riskAmount);
            return ['status' => $straight['status'], 'payout' => round($straight['payout'])];
        }

        if ($type === 'parlay') {
            // Decisive-loss short-circuit (mirrors the teaser branch ordering
            // and OpenParlayService::shouldSettleNow): a single FULL loss kills
            // the whole parlay immediately — settle 'lost' now, without waiting
            // for the remaining legs to resolve. CRITICAL: this is gated on a
            // DECISIVE loss only (status 'lost' AND settleFraction >= 1.0). A
            // soccer Asian quarter HALF-loss (settleFraction 0.5) is a partial
            // refund that banks its slot (legMultiplier 0.5) and must NOT
            // short-circuit — it falls through to the unified roll-up below,
            // exactly as shouldSettleNow already encodes. Without this, the
            // pending check below returned 'pending' for a dead ticket holding
            // a lost leg + an unresolved leg, leaving it (and its reserved
            // risk) stuck for both closed and open parlays.
            foreach ($rows as $row) {
                if (self::isDecisiveLoss($row)) {
                    return ['status' => 'lost', 'payout' => 0.0];
                }
            }

            $statuses = array_map(static fn (array $row): string => (string) ($row['status'] ?? 'pending'), $rows);
            if (in_array('pending', $statuses, true)) {
                return ['status' => 'pending', 'payout' => self::num($bet['potentialPayout'] ?? 0)];
            }

            // Unified roll-up: multiply every leg's effective multiplier. For
            // binary legs this is identical to the old "any loss ⇒ 0, else
            // product of WON odds (voids drop to ×1)" behaviour, because a
            // normal won→odds, void→1, lost→0. A soccer quarter half-win leg
            // multiplies by f·odds+(1−f) and a half-loss leg by (1−f)=0.5 —
            // neither is dropped (risk #5) and neither short-circuits the
            // parlay to zero the way a FULL loss (×0) does (risk #4).
            $combined = 1.0;
            foreach ($rows as $row) {
                $combined *= self::legMultiplier($row);
            }
            if ($combined <= 1e-9) {
                // A fully-lost leg zeroed the product → no payout.
                return ['status' => 'lost', 'payout' => 0.0];
            }

            // SGP correlation haircut detection stays keyed off the binary WON
            // legs so every existing parlay haircuts byte-identically. A
            // quarter half-win leg (status 'won') participates; a half-loss
            // (status 'lost') or push (void) leg does not. When no leg won
            // outright the surviving legs are all pushes/half-loss refunds,
            // sameGameHaircutFraction([]) returns 0 (no haircut) and the
            // combined refund multiplier flows through unchanged.
            $wonRows = array_values(array_filter($rows, static fn (array $row): bool => (string) ($row['status'] ?? '') === 'won'));
            // SGP correlation haircut — IDENTICAL detection + math as placement
            // (calculatePotentialPayout). Re-runs same-game detection on the
            // REMAINING WON legs: if a void dropped a leg so the survivors no
            // longer share an event, the fraction is 0 and the parlay re-prices
            // clean. The two rates are the placement SNAPSHOT off the bet doc
            // (sgpHaircutPct/sgpPropHaircutPct) so an operator changing the live
            // platformsettings after placement can never alter a settled ticket.
            $combined = self::applyProfitHaircut(
                $combined,
                self::sameGameHaircutFraction(
                    $wonRows,
                    self::num($bet['sgpHaircutPct'] ?? 0),
                    self::num($bet['sgpPropHaircutPct'] ?? 0)
                )
            );
            // Lock the WIN payout to the rounded American line so settlement pays
            // exactly the To-Win shown on the slip and stored at placement (single
            // source of truth). GATED to all-binary parlays: if ANY leg settled
            // fractionally (soccer Asian quarter half-win/half-loss), the exact
            // per-leg split-stake product is preserved untouched — American
            // rounding only applies to the whole-line combined.
            if (!self::hasFractionalLeg($rows)) {
                $combined = self::roundCombinedToAmericanDecimal($combined);
            }
            // Net classification on the whole-dollar payout: combined>1 ⇒ won,
            // ==1 (all-push refund) ⇒ void, <1 (half-loss legs dragged the
            // product below stake) ⇒ lost. Binary parlays only ever land on
            // combined>1 (a win) or ==1 (all-void refund) — a loss already
            // returned above — so this reproduces the old result exactly.
            return self::classifyByNet(round($riskAmount * $combined), $riskAmount);
        }

        if ($type === 'teaser') {
            // Snapshot ties rule from bet doc (set at placement time so
            // an operator who changes type config later can't retroact-
            // ively flip a placed ticket's push semantics). Default to
            // 'push' for legacy bets without a snapshot — matches the
            // historical behavior where a tie-on-line graded as void
            // and reduced the effective leg count.
            $tiesRule = strtolower((string) ($bet['teaserTiesRule'] ?? 'push'));
            if ($tiesRule === 'lose') {
                // Re-classify void legs as lost in-memory only — the
                // betselections row stays 'void' (the leg WAS a tie),
                // but for grading the WHOLE TICKET we treat it as a
                // loss per the type's rule. The next branch's
                // in_array('lost', ...) shortcut then takes effect.
                $rows = array_map(static function (array $row): array {
                    if ((string) ($row['status'] ?? '') === 'void') {
                        $row['status'] = 'lost';
                    }
                    return $row;
                }, $rows);
            }

            $statuses = array_map(static fn (array $row): string => (string) ($row['status'] ?? 'pending'), $rows);
            if (in_array('lost', $statuses, true)) {
                return ['status' => 'lost', 'payout' => 0.0];
            }
            if (in_array('pending', $statuses, true)) {
                return ['status' => 'pending', 'payout' => self::num($bet['potentialPayout'] ?? 0)];
            }

            $wonCount = count(array_filter($rows, static fn (array $row): bool => (string) ($row['status'] ?? '') === 'won'));
            if ($wonCount === 0) {
                return ['status' => 'void', 'payout' => $riskAmount];
            }
            // Pushes reduce the effective leg count. Below the 2-team
            // minimum a teaser is non-product — refund the stake. Books
            // diverge here (some grade as a single straight at -110);
            // we follow the more conservative refund convention so the
            // player isn't surprised by a tiny payout on a "wreckage"
            // ticket. Matches the spec: "If reduced leg count < 2,
            // void the entire teaser."
            if ($wonCount < 2) {
                return ['status' => 'void', 'payout' => $riskAmount];
            }

            // Type-specific multipliers when the bet snapshotted a
            // teaserTypeId at placement. The fallback rule's
            // payoutProfile only applies to legacy placements that
            // didn't pick a type. Falls through transparently if the
            // type id is unknown (e.g. type was deleted from DB
            // post-placement).
            $effectivePayoutProfile = self::resolveTeaserPayoutProfile($bet, $teaserRule);
            $effectiveRule = is_array($effectivePayoutProfile) && $effectivePayoutProfile !== []
                ? array_merge($teaserRule, ['payoutProfile' => $effectivePayoutProfile])
                : $teaserRule;

            return [
                'status' => 'won',
                'payout' => round($riskAmount * self::teaserMultiplier($effectiveRule, $wonCount)),
            ];
        }

        if ($type === 'if_bet') {
            $result = self::evaluateIfBet($rows, $unitStake);
            return ['status' => $result['status'], 'payout' => round($result['payout'])];
        }

        if ($type === 'reverse') {
            $resultA = self::evaluateIfBet([$rows[0] ?? [], $rows[1] ?? []], $unitStake);
            $resultB = self::evaluateIfBet([$rows[1] ?? [], $rows[0] ?? []], $unitStake);

            if ($resultA['status'] === 'pending' || $resultB['status'] === 'pending') {
                return ['status' => 'pending', 'payout' => self::num($bet['potentialPayout'] ?? 0)];
            }

            $totalPayout = round($resultA['payout'] + $resultB['payout']);
            if ($resultA['status'] === 'void' && $resultB['status'] === 'void') {
                return ['status' => 'void', 'payout' => $riskAmount];
            }
            if ($totalPayout > 0) {
                return ['status' => 'won', 'payout' => $totalPayout];
            }
            return ['status' => 'lost', 'payout' => 0.0];
        }

        return ['status' => 'pending', 'payout' => self::num($bet['potentialPayout'] ?? 0)];
    }

    /**
     * @param array<int, array<string, mixed>> $selectionRows
     */
    public static function descriptionForSelections(array $selectionRows): string
    {
        $sorted = self::sortSelectionRows($selectionRows);
        $lines = [];
        foreach ($sorted as $selection) {
            $snapshot = is_array($selection['matchSnapshot'] ?? null) ? $selection['matchSnapshot'] : [];
            $marketType = strtoupper((string) ($selection['marketType'] ?? ''));
            $selectionName = (string) ($selection['selection'] ?? 'Selection');
            // Outright/futures: "Minnesota Vikings to win NFL Super Bowl @ 51.00".
            // The matchup grammar below would render the placement snapshot's
            // event-name-as-homeTeam shim as "NFL Super Bowl Winner vs Minnesota
            // Vikings | OUTRIGHTS | …", which reads like a malformed matchup.
            // Full team name on purpose — this string is admin/audit-facing; the
            // player-facing nickname form ("Vikings to win Super Bowl") is built
            // client-side in utils/outrightLabel.js. Recomputed per response by
            // enrichBetForResponse, so existing pending futures rows pick this
            // up with no backfill.
            if ($marketType === 'OUTRIGHTS' || !empty($selection['isOutright'])) {
                $event = trim((string) ($snapshot['eventName'] ?? ($snapshot['homeTeam'] ?? '')));
                $competition = trim((string) preg_replace('/\s+winner\s*$/i', '', $event));
                $lines[] = trim((string) ($selection['selectionFull'] ?? $selectionName)
                    . ($competition !== '' ? ' to win ' . $competition : '')
                    . ' @ ' . number_format(self::num($selection['odds'] ?? 0), 2));
                continue;
            }
            $matchLabel = trim((string) (($snapshot['homeTeam'] ?? 'Match') . ' vs ' . ($snapshot['awayTeam'] ?? '')));
            $pointLabel = self::lineLabel($selection);
            $lines[] = trim($matchLabel . ' | ' . $marketType . ' | ' . $selectionName . ($pointLabel !== '' ? ' ' . $pointLabel : '') . ' @ ' . number_format(self::num($selection['odds'] ?? 0), 2));
        }
        return implode("\n", $lines);
    }

    /**
     * @param array<string, mixed> $bet
     */
    public static function riskAmount(array $bet): float
    {
        $risk = self::num($bet['riskAmount'] ?? 0);
        if ($risk > 0) {
            return $risk;
        }
        $amount = self::num($bet['amount'] ?? 0);
        return $amount > 0 ? $amount : 0.0;
    }

    /**
     * @param array<string, mixed> $bet
     */
    public static function unitStake(array $bet): float
    {
        $unitStake = self::num($bet['unitStake'] ?? 0);
        if ($unitStake > 0) {
            return $unitStake;
        }

        $type = strtolower((string) ($bet['type'] ?? 'straight'));
        $amount = self::num($bet['amount'] ?? 0);
        if ($type === 'reverse') {
            return $amount > 0 ? round($amount / 2.0) : 0.0;
        }
        return $amount;
    }

    /**
     * @param array<string, mixed> $selection
     * @return array<string, mixed>
     */
    public static function selectionRowForBetDoc(array $selection): array
    {
        $americanOdds = isset($selection['oddsAmerican']) && is_numeric($selection['oddsAmerican'])
            ? (int) $selection['oddsAmerican']
            : null;
        return [
            'matchId' => $selection['matchId'] ?? null,
            'selection' => $selection['selection'] ?? null,
            // Full display label ("Amed Rosario Over 1.5" for props, "City
            // Mascot" for team markets). The pending-bets UI renders this so a
            // prop row reads the player's name, not the bare "Over". Falls back
            // to `selection` for legacy rows that never stored it.
            'selectionFull' => (string) ($selection['selectionFull'] ?? $selection['selection'] ?? ''),
            // Stable outcome id (player id for props) — display/audit only.
            'selectionPid' => $selection['selectionPid'] ?? null,
            // Player-prop only: matchup side the player is on ('home'/'away'),
            // so the row shows a single team crest. Null on non-props / legacy
            // rows (UI then shows both crests). Display-only.
            'playerTeamSide' => $selection['playerTeamSide'] ?? null,
            // Team totals canonical grading fields; null on every other
            // market. Settlement write-back rebuilds the bet doc's selections
            // through THIS serializer, so omitting them here erased the doc's
            // copy whenever a mixed ticket partially settled.
            'teamSide' => $selection['teamSide'] ?? null,
            'side' => $selection['side'] ?? null,
            'odds' => self::num($selection['odds'] ?? 0),
            'oddsAmerican' => $americanOdds,
            // Slip price at submit when booking repriced the leg (favorable
            // or in-band adverse auto-accept), else null. Audit/display only
            // — the receipt and Pending render "line moved -210 → -220" off
            // it; no payout or settlement math ever reads it.
            'clientOddsAmerican' => isset($selection['clientOddsAmerican']) && is_numeric($selection['clientOddsAmerican'])
                ? (int) $selection['clientOddsAmerican']
                : null,
            'marketType' => $selection['marketType'] ?? null,
            'point' => isset($selection['point']) && is_numeric($selection['point']) ? (float) $selection['point'] : null,
            'basePoint' => isset($selection['basePoint']) && is_numeric($selection['basePoint']) ? (float) $selection['basePoint'] : null,
            'teaserAdjustment' => isset($selection['teaserAdjustment']) && is_numeric($selection['teaserAdjustment']) ? (float) $selection['teaserAdjustment'] : null,
            'status' => $selection['status'] ?? 'pending',
            // Soccer Asian quarter split: 1.0 for a normal leg, 0.5 for a
            // half-win/half-loss. Display/payout audit only — the binary
            // `status` above still drives every existing consumer; this lets
            // My Bets show a "half stake" note and the payout math reproduce
            // the correct partial on re-grade.
            'settleFraction' => isset($selection['settleFraction']) && is_numeric($selection['settleFraction'])
                ? (float) $selection['settleFraction']
                : 1.0,
            'matchSnapshot' => $selection['matchSnapshot'] ?? new stdClass(),
            // Final scores (populated by BetSettlementService when the match
            // finishes) so the per-leg drill-down can render "Lost (99 — 105)"
            // without a separate match lookup. Null on pending legs.
            'finalHomeScore' => isset($selection['finalHomeScore']) && is_numeric($selection['finalHomeScore'])
                ? (float) $selection['finalHomeScore']
                : null,
            'finalAwayScore' => isset($selection['finalAwayScore']) && is_numeric($selection['finalAwayScore'])
                ? (float) $selection['finalAwayScore']
                : null,
            'settledAt' => $selection['settledAt'] ?? null,
            'note' => isset($selection['note']) ? (string) $selection['note'] : null,
            // Surfacing 'push_tie' here lets the My Bets view render a
            // PUSH badge on tied teaser legs without re-deriving the
            // result from match scores client-side. Null when the leg
            // didn't grade as void or when the void was for an
            // unrelated reason (e.g. early-resolved h2h).
            'gradeReason' => isset($selection['gradeReason']) && is_string($selection['gradeReason'])
                ? $selection['gradeReason']
                : null,
        ];
    }

    /**
     * @param array<int, array<string, mixed>> $rows
     * @return array<int, array<string, mixed>>
     */
    public static function sortSelectionRows(array $rows): array
    {
        usort($rows, static function (array $a, array $b): int {
            return ((int) ($a['selectionOrder'] ?? 0)) <=> ((int) ($b['selectionOrder'] ?? 0));
        });
        return $rows;
    }

    /**
     * @param array<string, mixed> $bet
     * @param array<int, array<string, mixed>> $selectionRows
     */
    public static function selectionRowsToBetSelections(array $bet, array $selectionRows): array
    {
        $sorted = self::sortSelectionRows($selectionRows);
        return array_map(static fn (array $row): array => self::selectionRowForBetDoc($row), $sorted);
    }

    /**
     * @param array<string, mixed> $selection
     */
    private static function lineLabel(array $selection): string
    {
        if (!isset($selection['point']) || !is_numeric($selection['point'])) {
            return '';
        }
        $marketType = strtolower((string) ($selection['marketType'] ?? ''));
        $point = (float) $selection['point'];
        // Totals lines (game or team, any period suffix) are unsigned — a
        // "+3.50" reads like a spread on an audit row.
        if (str_starts_with($marketType, 'totals') || str_starts_with($marketType, 'team_totals')) {
            return '(' . number_format($point, 2) . ')';
        }
        return '(' . ($point > 0 ? '+' : '') . number_format($point, 2) . ')';
    }

    /**
     * @param array<string, mixed> $selection
     * @return array{status: string, payout: float}
     */
    private static function settleStraightLeg(array $selection, float $stake): array
    {
        $status = (string) ($selection['status'] ?? 'pending');
        if ($status === 'pending') {
            return ['status' => 'pending', 'payout' => 0.0];
        }
        // Unified return: stake × legMultiplier reproduces the old binary
        // payouts exactly (won→stake·odds, void→stake, lost→0, since a normal
        // leg's settleFraction is 1.0) and additionally pays the partial on a
        // soccer quarter half-win / half-loss leg. Ticket status follows the
        // approved net rule (payout>stake won / ==stake void/push / <stake lost).
        return self::classifyByNet($stake * self::legMultiplier($selection), $stake);
    }

    /**
     * Is this leg a DECISIVE (full) loss — the disposition that kills an entire
     * parlay immediately? True iff status is 'lost' AND settleFraction >= 1.0.
     * A soccer Asian quarter HALF-loss (status 'lost', settleFraction 0.5) is a
     * partial refund, NOT decisive, so this returns false for it. The numeric
     * test (default 1.0, >= 1.0 - 1e-9) is identical to
     * OpenParlayService::shouldSettleNow so the parlay roll-up and the
     * open-parlay settle-timing gate always agree.
     *
     * @param array<string, mixed> $row
     */
    public static function isDecisiveLoss(array $row): bool
    {
        if ((string) ($row['status'] ?? '') !== 'lost') {
            return false;
        }
        $rawFraction = $row['settleFraction'] ?? null;
        $fraction = is_numeric($rawFraction) ? (float) $rawFraction : 1.0;
        return $fraction >= 1.0 - 1e-9;
    }

    /**
     * Does any leg carry a FRACTIONAL settlement (settleFraction strictly
     * between 0 and 1)? True only for soccer Asian quarter half-win/half-loss
     * legs. When true, evaluateTicket keeps the exact per-leg split-stake
     * product and does NOT American-round the combined — the rounded-line
     * convention is for whole-line parlays only.
     *
     * @param array<int, array<string, mixed>> $rows
     */
    private static function hasFractionalLeg(array $rows): bool
    {
        foreach ($rows as $row) {
            $raw = is_array($row) ? ($row['settleFraction'] ?? null) : null;
            if (is_numeric($raw)) {
                $f = (float) $raw;
                if ($f > 1e-9 && $f < 1.0 - 1e-9) {
                    return true;
                }
            }
        }
        return false;
    }

    /**
     * Effective decimal multiplier of a settled leg, derived from its binary
     * status and settleFraction. Stake × multiplier = the dollars returned for
     * that leg; the multiplier also composes multiplicatively in a parlay
     * roll-up exactly like a normal leg's odds.
     *
     *   void        → 1.0                     (full stake refunded)
     *   won  (f)    → f·odds + (1−f)          (f=1 ⇒ odds; f=0.5 ⇒ half-win)
     *   lost (f)    → (1−f)                    (f=1 ⇒ 0; f=0.5 ⇒ half-loss refund)
     *
     * f (settleFraction) defaults to 1.0 for every normal leg, so binary legs
     * reduce to won→odds, void→1, lost→0. A 'pending' leg has no defined
     * multiplier; callers gate pending before reaching here (it returns 0.0
     * defensively, never silently paying).
     *
     * @param array<string, mixed> $row
     */
    private static function legMultiplier(array $row): float
    {
        $status = (string) ($row['status'] ?? 'pending');
        $odds = self::num($row['odds'] ?? 0);
        $rawFraction = $row['settleFraction'] ?? null;
        $f = is_numeric($rawFraction) ? (float) $rawFraction : 1.0;
        if ($f <= 0.0 || $f > 1.0) {
            $f = 1.0; // guard legacy/garbage → treat as a full (binary) leg
        }
        if ($status === 'void') {
            return 1.0;
        }
        if ($status === 'won') {
            return $f * $odds + (1.0 - $f);
        }
        if ($status === 'lost') {
            return 1.0 - $f; // 0 for a full loss; 0.5 refund for a half-loss
        }
        return 0.0; // pending — unreachable in practice
    }

    /**
     * Classify a settled wager by NET return (approved rule, shared by straight
     * and if-bet/reverse legs): payout > stake ⇒ won, payout == stake ⇒ void
     * (push/refund), payout < stake ⇒ lost — including a partial 0 < payout <
     * stake (a quarter half-loss returns money but is a net loss). Dollars are
     * correct regardless of this label; the label is the My Bets headline only.
     *
     * @return array{status:string, payout:float}
     */
    private static function classifyByNet(float $payout, float $stake): array
    {
        if (abs($payout - $stake) <= 1e-9) {
            return ['status' => 'void', 'payout' => $payout];
        }
        if ($payout > $stake) {
            return ['status' => 'won', 'payout' => $payout];
        }
        return ['status' => 'lost', 'payout' => $payout];
    }

    /**
     * @param array<int, array<string, mixed>> $legs
     * @return array{status: string, payout: float}
     */
    private static function evaluateIfBet(array $legs, float $stake): array
    {
        $first = $legs[0] ?? null;
        $second = $legs[1] ?? null;
        if (!is_array($first) || !is_array($second)) {
            return ['status' => 'pending', 'payout' => 0.0];
        }

        $firstStatus = (string) ($first['status'] ?? 'pending');
        if ($firstStatus === 'pending') {
            return ['status' => 'pending', 'payout' => 0.0];
        }
        if ($firstStatus === 'lost') {
            // First leg lost → the action never reaches the second leg.
            return ['status' => 'lost', 'payout' => 0.0];
        }
        if ($firstStatus === 'void') {
            // First leg pushed → the full stake rolls to the second leg alone.
            return self::settleStraightLeg($second, $stake);
        }

        // First leg won (or quarter half-win) → the rolled action plays on the
        // second leg.
        $secondStatus = (string) ($second['status'] ?? 'pending');
        if ($secondStatus === 'pending') {
            return ['status' => 'pending', 'payout' => 0.0];
        }
        if ($secondStatus === 'lost') {
            // Second leg lost → the rolled action loses; nothing is returned.
            return ['status' => 'lost', 'payout' => 0.0];
        }
        // stake × M(first) × M(second): a second-leg push (M=1) collapses to
        // just the first leg's return, a second-leg win compounds. Reproduces
        // the old binary amounts exactly (won→odds, void→1) and additionally
        // pays a quarter half-win leg its correct partial multiplier.
        $payout = $stake * self::legMultiplier($first) * self::legMultiplier($second);
        return self::classifyByNet($payout, $stake);
    }

    /**
     * @param array<string, mixed> $rule
     */
    private static function teaserMultiplier(array $rule, int $legCount): float
    {
        $multipliers = is_array($rule['payoutProfile']['multipliers'] ?? null) ? $rule['payoutProfile']['multipliers'] : [];
        $raw = $multipliers[(string) $legCount] ?? null;
        $value = is_numeric($raw) ? (float) $raw : 1.0;
        return $value > 0 ? $value : 1.0;
    }

    /**
     * Resolve the payoutProfile to use for a teaser bet. Priority:
     *   1. `bet.teaserPayoutSnapshot` — multipliers frozen at placement
     *      so a rule/type edit can never re-price an in-flight bet
     *      (the bettor was promised these odds; we honor them).
     *   2. The matching `teaserTypeId`'s payoutProfile from the live
     *      rule — used for legacy bets placed before the snapshot
     *      field shipped (no `teaserPayoutSnapshot` on the doc).
     *   3. The rule-level payoutProfile fallback — covers bets placed
     *      with no type id at all.
     *
     * @param array<string, mixed> $bet
     * @param array<string, mixed> $teaserRule
     * @return array<string, mixed>
     */
    private static function resolveTeaserPayoutProfile(array $bet, array $teaserRule): array
    {
        $snapshot = $bet['teaserPayoutSnapshot'] ?? null;
        if (is_array($snapshot)
            && isset($snapshot['multipliers'])
            && is_array($snapshot['multipliers'])
            && $snapshot['multipliers'] !== []) {
            return $snapshot;
        }
        $typeId = trim((string) ($bet['teaserTypeId'] ?? ''));
        if ($typeId !== '' && isset($teaserRule['teaserTypes']) && is_array($teaserRule['teaserTypes'])) {
            foreach ($teaserRule['teaserTypes'] as $type) {
                if (!is_array($type)) {
                    continue;
                }
                if ((string) ($type['id'] ?? '') === $typeId
                    && isset($type['payoutProfile'])
                    && is_array($type['payoutProfile'])) {
                    return $type['payoutProfile'];
                }
            }
        }
        return is_array($teaserRule['payoutProfile'] ?? null) ? $teaserRule['payoutProfile'] : [];
    }

    /**
     * For a leg that just graded as 'void', infer the grade reason
     * (`push_tie` for an exact tie on the adjusted line on a finished
     * match, `match_canceled` for a canceled/expired match, null when
     * neither applies). Used by the settlement service to persist a
     * machine-readable reason on the betselections row so the My Bets
     * view can render a "PUSH" badge for tied teaser legs without
     * inferring it from match status at render time.
     *
     * @param array<string, mixed> $match
     * @param array<string, mixed> $leg
     */
    public static function gradeReasonForVoidLeg(array $match, array $leg): ?string
    {
        // Mirrors the cancel-only void policy in selectionResult: only
        // an explicit cancel becomes a void with a 'match_canceled'
        // reason. An expired match shouldn't have graded as void in
        // the first place, but if a legacy void slipped through with
        // effectiveStatus='expired', we still surface a reason rather
        // than leaving the chip without a tooltip.
        $effective = SportsMatchStatus::effectiveStatus($match);
        if ($effective === 'canceled' || $effective === 'expired') {
            return 'match_canceled';
        }
        if ($effective !== 'finished') {
            return null;
        }
        // Period leg that auto-voided because the feed never supplied a
        // gradeable per-period score within the grace window. Surface a
        // distinct refund reason so the My Bets chip reads "Refund — period
        // result unavailable" rather than an empty void tooltip.
        if (self::isUngradeablePeriodLeg($match, $leg)) {
            return 'period_unavailable';
        }
        // A listed-pitcher change is the reason this leg voided, regardless of
        // market — surface it before the push-on-tie checks so the My Bets
        // chip reads "Pitcher changed" instead of an empty void.
        if (self::listedPitcherVoid($match, $leg)) {
            return 'pitcher_changed';
        }
        $marketType = strtolower((string) ($leg['marketType'] ?? ''));
        if ($marketType !== 'spreads' && $marketType !== 'totals' && $marketType !== 'team_totals') {
            return null;
        }
        $point = isset($leg['point']) && is_numeric($leg['point']) ? (float) $leg['point'] : null;
        if ($point === null) {
            return null;
        }
        // Same unit-correct scores as selectionResult (games for tennis).
        $st = self::spreadTotalScores($match);
        if ($st === null) {
            return null;
        }
        [$scoreHome, $scoreAway] = $st;
        if ($marketType === 'team_totals') {
            // Push iff the picked team's score equals the line. Read the same
            // structured teamSide selectionResult grades on — never the name.
            $teamSide = strtolower((string) ($leg['teamSide'] ?? ''));
            if ($teamSide !== 'home' && $teamSide !== 'away') {
                return null;
            }
            $teamScore = $teamSide === 'home' ? $scoreHome : $scoreAway;
            return $teamScore === $point ? 'push_tie' : null;
        }
        if ($marketType === 'spreads') {
            $side = self::resolveSelectionSide(
                (string) ($leg['selection'] ?? ''),
                (string) ($match['homeTeam'] ?? ''),
                (string) ($match['awayTeam'] ?? '')
            );
            if ($side === 'home' && ($scoreHome + $point) === $scoreAway) {
                return 'push_tie';
            }
            if ($side === 'away' && ($scoreAway + $point) === $scoreHome) {
                return 'push_tie';
            }
            return null;
        }
        // totals
        if (($scoreHome + $scoreAway) === $point) {
            return 'push_tie';
        }
        return null;
    }

    /**
     * @param array<string, mixed> $selection
     * @return array<string, mixed>
     */
    private static function selectionRowFromTicket(
        string $betId,
        string $ticketId,
        string $userId,
        string $betType,
        array $selection,
        int $index,
        string $createdAt,
        string $updatedAt
    ): array {
        $rowId = substr(hash('sha256', $betId . '|' . $index), 0, 24);
        $point = isset($selection['point']) && is_numeric($selection['point']) ? (float) $selection['point'] : null;
        $basePoint = isset($selection['basePoint']) && is_numeric($selection['basePoint']) ? (float) $selection['basePoint'] : $point;
        $americanOdds = isset($selection['oddsAmerican']) && is_numeric($selection['oddsAmerican'])
            ? (int) $selection['oddsAmerican']
            : null;
        // Outright bets carry an outrightId pointing at the outrights row.
        // OutrightSettlementService finds pending legs via the
        // idx_betselections_outright_status index on j_outright_id; if we
        // drop the field here, settlement would never find them.
        $outrightId = (string) ($selection['outrightId'] ?? '');
        return [
            'id' => $rowId,
            'betId' => $betId,
            'ticketId' => $ticketId,
            'userId' => $userId,
            'betType' => $betType,
            'selectionOrder' => $index,
            'matchId' => SqlRepository::id((string) ($selection['matchId'] ?? '')),
            'outrightId' => $outrightId !== '' ? SqlRepository::id($outrightId) : null,
            'selection' => (string) ($selection['selection'] ?? ''),
            // Full display name + stable outcome id (display/audit only; grading
            // runs off `selection` + matchSnapshot, never these).
            'selectionFull' => (string) ($selection['selectionFull'] ?? $selection['selection'] ?? ''),
            'selectionPid' => $selection['selectionPid'] ?? null,
            // Player-prop single-crest logo hint ('home'/'away'); null elsewhere.
            'playerTeamSide' => $selection['playerTeamSide'] ?? null,
            // Team totals canonical grading fields ('home'/'away' +
            // 'over'/'under'); null on every other market. Settlement grades
            // team-total legs from THESE rows, and a leg with a missing
            // teamSide/side fail-safes to PERMANENT 'pending' — so dropping
            // them here would strand every team-total ticket.
            'teamSide' => $selection['teamSide'] ?? null,
            'side' => $selection['side'] ?? null,
            'odds' => self::num($selection['odds'] ?? 0),
            'oddsAmerican' => $americanOdds,
            // Slip price at submit when booking repriced the leg, else null.
            // Audit/display only (receipt + Pending "line moved" note) — the
            // response legs are rebuilt from THESE rows via
            // selectionRowForBetDoc, so dropping it here is what silenced the
            // disclosure for every bet type. Settlement never reads it.
            'clientOddsAmerican' => isset($selection['clientOddsAmerican']) && is_numeric($selection['clientOddsAmerican'])
                ? (int) $selection['clientOddsAmerican']
                : null,
            'marketType' => (string) ($selection['marketType'] ?? ''),
            'point' => $point,
            'basePoint' => $basePoint,
            'teaserAdjustment' => isset($selection['teaserAdjustment']) && is_numeric($selection['teaserAdjustment']) ? (float) $selection['teaserAdjustment'] : 0.0,
            'status' => (string) ($selection['status'] ?? 'pending'),
            // MLB listed-pitcher Action waiver, carried onto the settlement row
            // so listedPitcherVoid() can read it without re-opening the bet doc.
            'pitcherAction' => is_array($selection['pitcherAction'] ?? null)
                ? ['home' => !empty($selection['pitcherAction']['home']), 'away' => !empty($selection['pitcherAction']['away'])]
                : ['home' => false, 'away' => false],
            'matchSnapshot' => $selection['matchSnapshot'] ?? new stdClass(),
            'createdAt' => $createdAt,
            'updatedAt' => $updatedAt,
        ];
    }

    /**
     * @param array<string, mixed> $value
     * @return array<string, mixed>
     */
    private static function sortRecursively(array $value): array
    {
        ksort($value);
        foreach ($value as $key => $item) {
            if (is_array($item)) {
                if (array_is_list($item)) {
                    $value[$key] = array_map(static function ($entry) {
                        return is_array($entry) ? self::sortRecursively($entry) : $entry;
                    }, $item);
                } else {
                    $value[$key] = self::sortRecursively($item);
                }
            }
        }
        return $value;
    }

    private static function num(mixed $value): float
    {
        if (is_int($value) || is_float($value)) {
            return (float) $value;
        }
        if (is_string($value) && $value !== '') {
            return (float) $value;
        }
        if (is_array($value)) {
            if (isset($value['$numberDecimal'])) {
                return (float) $value['$numberDecimal'];
            }
            if (isset($value['value'])) {
                return (float) $value['value'];
            }
        }
        return 0.0;
    }
}
