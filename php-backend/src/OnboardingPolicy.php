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
 * VERSION BUMP SEMANTICS (product decision 2026-07-22): bumping a set's
 * version must NOT interrupt an in-progress session (no mid-bet-slip 403).
 * A stale-version stamp therefore only re-gates once the `rulesReAckPending`
 * latch is set — AuthController stamps that latch at the player's next
 * LOGIN (the session boundary) and clears it when every set is current
 * again. A player who NEVER accepted a set is always gated, latch or not —
 * that's first-time onboarding, not a re-acceptance.
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

    /** The next-login latch AuthController stamps when any set went stale. */
    public const REACK_FLAG = 'rulesReAckPending';

    /**
     * Payment-apps onboarding step (2026-07-22). The six payout handles a
     * player must provide (or explicitly mark "N/A") before betting. Keys
     * MATCH the pre-existing `user.apps` schema that agents already read
     * and write via CustomerDetailsView — never rename them. `other` stays
     * optional and does not count toward completeness.
     */
    public const PAYMENT_APPS_KEYS = ['venmo', 'cashapp', 'applePay', 'zelle', 'paypal', 'btc'];

    /**
     * Registration-time flag: ONLY accounts created after this feature
     * shipped carry it, so the step can never gate the pre-existing player
     * base (they get a dismissible banner instead, frontend-only). No date
     * cutoff to guess — the flag travels with the doc.
     */
    public const PAYMENT_APPS_FLAG = 'paymentAppsRequired';

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
        // Blocking ONLY for accounts registered with the flag (new signups);
        // existing players see a dismissible banner driven by
        // paymentAppsComplete, never a gate.
        $needsPaymentApps = !$exempt && self::paymentAppsRequired($user) && !$appsComplete;

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
     * Does this set gate the player right now?
     *  - never accepted           → yes, always (first-time onboarding)
     *  - accepted, stale version  → only once the next-login latch is set
     *  - accepted, current        → no
     */
    public static function setNeedsAcceptance(array $user, string $set): bool
    {
        if (!self::everAccepted($user, $set)) {
            return true;
        }
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
