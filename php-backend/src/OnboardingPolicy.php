<?php

declare(strict_types=1);

/**
 * First-login onboarding policy — pure, static, no I/O.
 *
 * A PLAYER account must (1) set bet defaults (straight + parlay unit sizes)
 * and (2) accept BOTH rule sets — House Rules and Platform Rules — before it
 * may place sportsbook bets. State is DERIVED from the user doc on every
 * read — there is no separate "onboarding complete" flag to drift out of
 * sync:
 *   - defaults done  = settings.betDefaults carries positive straight AND
 *     parlay unit sizes (legacy `amount` accepted for either, mirroring the
 *     betslip's own fallback chain in ModeBetPanel).
 *   - rules accepted = a per-set stamp (houseRulesAck / rulesAck) at the
 *     set's current version. The platform stamp keeps the pre-split field
 *     name `rulesAck` so acceptances recorded before the two-set split stay
 *     valid without migration.
 *
 * SESSION-BOUNDARY SEMANTICS (Nicky-confirmed 2026-07-22): rules
 * enforcement must NEVER interrupt an in-progress session (no mid-bet-slip
 * 403) — at initial launch AND on every future version bump, uniformly.
 * A set gates ONLY once the `rulesReAckPending` latch is set, regardless
 * of whether the player never accepted (launch) or accepted an older
 * version (bump). The latch is stamped at every session boundary:
 * registration seeds it (new signups are gated from session one) and
 * AuthController stamps it at LOGIN whenever any set isn't current.
 * acknowledgeRules clears it when every set is current again.
 *
 * Applies to role 'user' only (admins/agents/viewOnly accounts are exempt).
 * Both AuthController (/auth/me `onboarding` block) and BetsController (the
 * ONBOARDING_REQUIRED placement gate) read the SAME state() so the UI gate
 * and the money gate can never disagree — the latch flips both together.
 */
final class OnboardingPolicy
{
    public const SET_HOUSE = 'house_rules';
    public const SET_PLATFORM = 'platform_rules';

    /**
     * Bump a set's version when its copy changes materially — players
     * re-accept that set at their next login. platform_rules MUST stay >= 1
     * and existing stamps (version 1, pre-split) MUST remain valid.
     */
    public const RULES_VERSIONS = [
        self::SET_HOUSE => 1,
        self::SET_PLATFORM => 1,
    ];

    /** Legacy single-version alias (pre-split clients read this). */
    public const RULES_VERSION = self::RULES_VERSIONS[self::SET_PLATFORM];

    /**
     * User-doc stamp field per set. platform_rules keeps the pre-split
     * `rulesAck` field name — NEVER rename it, existing acceptances live
     * there (history archives to `<field>History`).
     */
    public const ACK_FIELDS = [
        self::SET_HOUSE => 'houseRulesAck',
        self::SET_PLATFORM => 'rulesAck',
    ];

    /**
     * The rules-gate latch — THE only trigger for rules enforcement.
     * Seeded at registration (new signups) and stamped at login whenever
     * any set isn't current (never-accepted at launch, or stale after a
     * version bump — same mechanism, Nicky 2026-07-22). Cleared by
     * acknowledgeRules once every set is current.
     */
    public const REACK_FLAG = 'rulesReAckPending';

    /**
     * Minimum seconds a rules step must be on screen before its acceptance
     * is accepted (Fida 2026-07-23) — in ADDITION to the scroll-to-bottom
     * rule, per SET (House and Platform each run their own clock). MIRRORS
     * RULES_MIN_DWELL_SECONDS in OnboardingGate.jsx — keep in lockstep.
     */
    public const RULES_MIN_DWELL_SECONDS = 40;

    /**
     * User-doc field: map of ruleSet => server timestamp the step was shown
     * (stamped by /auth/rules-step-shown when the gate renders the step).
     * acknowledge-rules refuses the acceptance until the dwell window has
     * passed since this stamp — server clock on both ends, so a client
     * with a skewed (or scripted) clock can't shorten the read window.
     */
    public const RULES_SHOWN_FIELD = 'rulesStepShownAt';

    /**
     * Payment-apps onboarding step (2026-07-22). The six payout handles a
     * player must provide (or explicitly mark "N/A") before betting. Keys
     * MATCH the pre-existing `user.apps` schema that agents already read
     * and write via CustomerDetailsView — never rename them. `other` stays
     * optional and does not count toward completeness.
     */
    public const PAYMENT_APPS_KEYS = ['venmo', 'cashapp', 'applePay', 'zelle', 'paypal', 'btc'];

    /**
     * Registration-time flag: accounts created after the payment-apps step
     * shipped carry it and are gated from their first session.
     */
    public const PAYMENT_APPS_FLAG = 'paymentAppsRequired';

    /**
     * Next-login latch for EXISTING players (Nicky decision 2026-07-22:
     * payment apps mandatory for everyone). Same session-boundary pattern
     * as REACK_FLAG: AuthController stamps this at login when the player's
     * apps are incomplete, so the rollout never 403s a bet mid-session —
     * the gate (modal + placement block together) engages at the player's
     * NEXT login. Inert once apps are complete (completeness short-circuits
     * before the latch is read), so it never needs clearing.
     */
    public const PAYMENT_APPS_LATCH = 'paymentAppsGatePending';

    /**
     * @return array{required:bool,needsDefaults:bool,needsRulesAck:bool,needsHouseRulesAck:bool,needsPlatformRulesAck:bool,needsPaymentApps:bool,paymentAppsComplete:bool,rulesVersion:int,rulesVersions:array<string,int>,rulesAcknowledgedAt:?string,houseRulesAcceptedAt:?string,platformRulesAcceptedAt:?string}
     */
    public static function state(array $user): array
    {
        $exempt = !self::isPlayer($user);
        $needsDefaults = !$exempt && !self::defaultsSet($user);
        $needsHouse = !$exempt && self::setNeedsAcceptance($user, self::SET_HOUSE);
        $needsPlatform = !$exempt && self::setNeedsAcceptance($user, self::SET_PLATFORM);
        $appsComplete = self::paymentAppsComplete($user);
        // Mandatory for EVERYONE (Nicky 2026-07-22): new signups gate off
        // the registration flag from session one; existing players gate off
        // the login-stamped latch — so the rollout engages at each player's
        // next login, never mid-session/mid-bet-slip. The transitional
        // banner (incomplete && !gated) self-retires as latches stamp.
        $needsPaymentApps = !$exempt && !$appsComplete
            && (self::paymentAppsRequired($user) || self::paymentAppsLatched($user));

        return [
            'required' => $needsDefaults || $needsHouse || $needsPlatform || $needsPaymentApps,
            'needsDefaults' => $needsDefaults,
            // Legacy aggregate — pre-split bundles show their single rules
            // step off this flag. True whenever ANY set still needs a tap.
            'needsRulesAck' => $needsHouse || $needsPlatform,
            'needsHouseRulesAck' => $needsHouse,
            'needsPlatformRulesAck' => $needsPlatform,
            'needsPaymentApps' => $needsPaymentApps,
            'paymentAppsComplete' => $appsComplete,
            'rulesVersion' => self::RULES_VERSION,
            'rulesVersions' => self::RULES_VERSIONS,
            'rulesAcknowledgedAt' => self::acceptedAt($user, self::SET_PLATFORM),
            'houseRulesAcceptedAt' => self::acceptedAt($user, self::SET_HOUSE),
            'platformRulesAcceptedAt' => self::acceptedAt($user, self::SET_PLATFORM),
        ];
    }

    /** The server-side money gate: true = reject placement with ONBOARDING_REQUIRED. */
    public static function placementBlocked(array $user): bool
    {
        return self::state($user)['required'];
    }

    /** Player accounts only; view-only accounts cannot bet and are exempt. */
    public static function isPlayer(array $user): bool
    {
        $role = strtolower(trim((string) ($user['role'] ?? 'user')));
        if ($role !== 'user') {
            return false;
        }
        return ($user['viewOnly'] ?? false) !== true;
    }

    /**
     * Defaults are "set" when both unit sizes resolve to a positive number —
     * the same resolution order the betslip uses (straightDefault/
     * parlayDefault, each falling back to the legacy `amount`).
     */
    public static function defaultsSet(array $user): bool
    {
        $settings = is_array($user['settings'] ?? null) ? $user['settings'] : [];
        $bd = is_array($settings['betDefaults'] ?? null) ? $settings['betDefaults'] : null;
        if ($bd === null) {
            return false;
        }
        $legacy = self::positive($bd['amount'] ?? null);
        $straight = self::positive($bd['straightDefault'] ?? null) ?? $legacy;
        $parlay = self::positive($bd['parlayDefault'] ?? null) ?? $legacy;
        return $straight !== null && $parlay !== null;
    }

    /**
     * Does this set gate the player right now? Uniform rule (Nicky
     * 2026-07-22 — launch and version bumps behave identically):
     *  - accepted at current version → no
     *  - otherwise (never accepted OR stale) → only once the
     *    session-boundary latch is set. Registration seeds the latch, so a
     *    brand-new signup is gated from its first session; an existing
     *    player is gated from their next login — never mid-session.
     */
    public static function setNeedsAcceptance(array $user, string $set): bool
    {
        if (self::acceptanceCurrent($user, $set)) {
            return false;
        }
        return self::reAckPending($user);
    }

    /** True when the stored stamp covers the set's CURRENT version. */
    public static function acceptanceCurrent(array $user, string $set): bool
    {
        $ack = self::ackOf($user, $set);
        if ($ack === null || self::acceptedAt($user, $set) === null) {
            return false;
        }
        $version = is_numeric($ack['version'] ?? null) ? (int) $ack['version'] : 0;
        return $version >= (self::RULES_VERSIONS[$set] ?? PHP_INT_MAX);
    }

    /** True when the player accepted this set at ANY version, ever. */
    public static function everAccepted(array $user, string $set): bool
    {
        return self::acceptedAt($user, $set) !== null;
    }

    /** True when at least one set has an accepted-but-stale stamp. */
    public static function anySetStale(array $user): bool
    {
        foreach (array_keys(self::RULES_VERSIONS) as $set) {
            if (self::everAccepted($user, $set) && !self::acceptanceCurrent($user, $set)) {
                return true;
            }
        }
        return false;
    }

    /** True when every set is accepted at its current version. */
    public static function allSetsCurrent(array $user): bool
    {
        foreach (array_keys(self::RULES_VERSIONS) as $set) {
            if (!self::acceptanceCurrent($user, $set)) {
                return false;
            }
        }
        return true;
    }

    /** The next-login re-acceptance latch (stamped by AuthController). */
    public static function reAckPending(array $user): bool
    {
        return ($user[self::REACK_FLAG] ?? false) === true;
    }

    public static function isKnownSet(string $set): bool
    {
        return array_key_exists($set, self::RULES_VERSIONS);
    }

    /**
     * Seconds still owed on a set's dwell clock (0 = acceptance allowed).
     * Missing, malformed, or FUTURE stamps (clock skew) all count as
     * "never shown" and owe the full window — acknowledgeRules plants a
     * fresh stamp in that case, so a lost /rules-step-shown call costs the
     * player one wait, never a lockout. Pure so it's unit-testable.
     */
    public static function rulesDwellRemaining(array $user, string $set, int $nowTs): int
    {
        $map = is_array($user[self::RULES_SHOWN_FIELD] ?? null) ? $user[self::RULES_SHOWN_FIELD] : [];
        $raw = $map[$set] ?? null;
        $shownTs = is_string($raw) ? strtotime($raw) : false;
        if ($shownTs === false || $shownTs > $nowTs) {
            return self::RULES_MIN_DWELL_SECONDS;
        }
        return max(0, self::RULES_MIN_DWELL_SECONDS - ($nowTs - $shownTs));
    }

    /**
     * All six payout handles present (a literal "N/A" counts — the point is
     * an explicit answer per app, not necessarily a handle). `other` and
     * `updatedAt` never affect completeness.
     */
    public static function paymentAppsComplete(array $user): bool
    {
        $apps = is_array($user['apps'] ?? null) ? $user['apps'] : null;
        if ($apps === null) {
            return false;
        }
        foreach (self::PAYMENT_APPS_KEYS as $key) {
            $v = $apps[$key] ?? null;
            if (!is_string($v) || trim($v) === '') {
                return false;
            }
        }
        return true;
    }

    /**
     * True only for accounts registered after the payment-apps step shipped
     * (registration seeds the flag). Anything else — absent, false,
     * malformed — fails OPEN: the pre-existing player base must never be
     * blocked by this step.
     */
    public static function paymentAppsRequired(array $user): bool
    {
        return ($user[self::PAYMENT_APPS_FLAG] ?? false) === true;
    }

    /**
     * The next-login latch for existing players. Strict === true: absent or
     * malformed fails OPEN (not gated) — the latch only ever means "this
     * player has logged in since payment apps became mandatory."
     */
    public static function paymentAppsLatched(array $user): bool
    {
        return ($user[self::PAYMENT_APPS_LATCH] ?? false) === true;
    }

    /**
     * Per-app handle normalization — MIRRORS utils/paymentApps.js
     * formatHandleForKey (keep in lockstep). Shapes, never rejects:
     *   venmo    → '@' + [A-Za-z0-9_-]{1,30}
     *   cashapp  → '$' + [A-Za-z0-9]{1,20}
     *   applePay → PHONE ONLY (Fida 2026-07-23): digits formatted 3-3-4
     *              with dashes, 11-digit leading 1 dropped. An email (or
     *              any letters) normalizes to '' = unanswered, so the
     *              completeness/filled checks reject it without this
     *              normalizer ever throwing.
     *   zelle    → letters/@ = email (as-is); pure digits = US phone
     *              formatted 3-3-4 with dashes, 11-digit leading 1 dropped
     *   others   → whitespace-stripped as-is
     * 'N/A' passes through untouched everywhere.
     */
    public static function normalizePaymentHandle(string $key, string $value): string
    {
        $v = (string) preg_replace('/\s+/u', '', trim($value));
        if ($v === '' || strtoupper($v) === 'N/A') {
            return $v === '' ? '' : 'N/A';
        }
        if ($key === 'venmo') {
            $core = (string) preg_replace('/[^A-Za-z0-9_-]/', '', (string) preg_replace('/^@+/', '', $v));
            $core = mb_substr($core, 0, 30);
            return $core === '' ? '' : '@' . $core;
        }
        if ($key === 'cashapp') {
            $core = (string) preg_replace('/[^A-Za-z0-9]/', '', (string) preg_replace('/^\$+/', '', $v));
            $core = mb_substr($core, 0, 20);
            return $core === '' ? '' : '$' . $core;
        }
        if ($key === 'applePay' || $key === 'zelle') {
            if ($key === 'zelle' && preg_match('/[A-Za-z@]/', $v) === 1) {
                return $v; // email mode (Zelle only) — leave as typed
            }
            $d = (string) preg_replace('/\D/', '', $v);
            if (strlen($d) === 11 && str_starts_with($d, '1')) {
                $d = substr($d, 1);
            }
            $d = substr($d, 0, 10);
            if (strlen($d) <= 3) {
                return $d;
            }
            if (strlen($d) <= 6) {
                return substr($d, 0, 3) . '-' . substr($d, 3);
            }
            return substr($d, 0, 3) . '-' . substr($d, 3, 3) . '-' . substr($d, 6);
        }
        return $v;
    }

    /** A real payout handle — non-blank and not the explicit N/A opt-out. */
    public static function paymentHandleFilled(mixed $value): bool
    {
        if (!is_string($value)) {
            return false;
        }
        $v = trim($value);
        return $v !== '' && strtoupper($v) !== 'N/A';
    }

    /**
     * Payout-preference sync rule — MIRRORS utils/paymentApps.js
     * normalizePreferenceOrder (keep in lockstep): the saved/incoming order
     * minus unknown, unfilled, and duplicate keys, then any newly-filled
     * apps appended in canonical PAYMENT_APPS_KEYS order. The result always
     * lists exactly the currently-filled apps, position 1..N with no gaps —
     * N/A'd apps drop out, new handles join at the end, and a player who
     * never touched the ranking widget gets the canonical default. Never
     * blocks a save; this is a normalization, not a validation.
     */
    public static function normalizePaymentPreferenceOrder(array $order, array $apps): array
    {
        $filled = [];
        foreach (self::PAYMENT_APPS_KEYS as $key) {
            if (self::paymentHandleFilled($apps[$key] ?? null)) {
                $filled[] = $key;
            }
        }
        $kept = [];
        foreach ($order as $key) {
            if (is_string($key) && in_array($key, $filled, true) && !in_array($key, $kept, true)) {
                $kept[] = $key;
            }
        }
        foreach ($filled as $key) {
            if (!in_array($key, $kept, true)) {
                $kept[] = $key;
            }
        }
        return $kept;
    }

    /**
     * Legacy predicate (pre-split name) — true when the PLATFORM set is
     * current. Kept because the pre-split meaning was exactly this stamp.
     */
    public static function rulesAckSatisfied(array $user): bool
    {
        return self::acceptanceCurrent($user, self::SET_PLATFORM);
    }

    private static function acceptedAt(array $user, string $set): ?string
    {
        $ack = self::ackOf($user, $set);
        $at = $ack['acknowledgedAt'] ?? null;
        return (is_string($at) && trim($at) !== '') ? $at : null;
    }

    private static function ackOf(array $user, string $set): ?array
    {
        $field = self::ACK_FIELDS[$set] ?? null;
        if ($field === null) {
            return null;
        }
        return is_array($user[$field] ?? null) ? $user[$field] : null;
    }

    private static function positive(mixed $value): ?float
    {
        if (!is_numeric($value)) {
            return null;
        }
        $n = (float) $value;
        return (is_finite($n) && $n > 0) ? $n : null;
    }
}
