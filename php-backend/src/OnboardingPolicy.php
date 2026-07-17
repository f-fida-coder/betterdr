<?php

declare(strict_types=1);

/**
 * First-login onboarding policy — pure, static, no I/O.
 *
 * A PLAYER account must (1) set bet defaults (straight + parlay unit sizes)
 * and (2) acknowledge the platform rules before it may place sportsbook
 * bets. State is DERIVED from the user doc on every read — there is no
 * separate "onboarding complete" flag to drift out of sync:
 *   - defaults done  = settings.betDefaults carries positive straight AND
 *     parlay unit sizes (legacy `amount` accepted for either, mirroring the
 *     betslip's own fallback chain in ModeBetPanel).
 *   - rules acked    = rulesAck.acknowledgedAt set at version >= RULES_VERSION.
 *     Bumping RULES_VERSION re-gates every player on their next login.
 *
 * Applies to role 'user' only (admins/agents/viewOnly accounts are exempt).
 * Both AuthController (/auth/me `onboarding` block) and BetsController (the
 * ONBOARDING_REQUIRED placement gate) read the SAME functions, so the UI
 * gate and the money gate can never disagree.
 */
final class OnboardingPolicy
{
    /** Bump when the house rules change materially — players re-acknowledge. */
    public const RULES_VERSION = 1;

    /**
     * @return array{required:bool,needsDefaults:bool,needsRulesAck:bool,rulesVersion:int,rulesAcknowledgedAt:?string}
     */
    public static function state(array $user): array
    {
        $exempt = !self::isPlayer($user);
        $needsDefaults = !$exempt && !self::defaultsSet($user);
        $needsRulesAck = !$exempt && !self::rulesAckSatisfied($user);
        $ack = is_array($user['rulesAck'] ?? null) ? $user['rulesAck'] : [];

        return [
            'required' => $needsDefaults || $needsRulesAck,
            'needsDefaults' => $needsDefaults,
            'needsRulesAck' => $needsRulesAck,
            'rulesVersion' => self::RULES_VERSION,
            'rulesAcknowledgedAt' => isset($ack['acknowledgedAt']) && is_string($ack['acknowledgedAt']) && $ack['acknowledgedAt'] !== ''
                ? $ack['acknowledgedAt']
                : null,
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

    /** True when the stored ack covers the CURRENT rules version. */
    public static function rulesAckSatisfied(array $user): bool
    {
        $ack = is_array($user['rulesAck'] ?? null) ? $user['rulesAck'] : null;
        if ($ack === null) {
            return false;
        }
        $at = $ack['acknowledgedAt'] ?? null;
        if (!is_string($at) || trim($at) === '') {
            return false;
        }
        $version = is_numeric($ack['version'] ?? null) ? (int) $ack['version'] : 0;
        return $version >= self::RULES_VERSION;
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
