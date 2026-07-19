// Pure helpers for the split Straight / Parlay bet-default stake mode
// (PO 2026-07-19). Shared by ModeBetPanel (betslip seeding) and AccountPanel
// (settings form) so the fallback + bucket rules live in ONE tested place.
//
// Data model: settings.betDefaults.mode is the STRAIGHT default stake mode;
// settings.betDefaults.parlayMode is the INDEPENDENT default for every
// parlay-like tab (parlay/teaser/round_robin/if_bet/reverse/open). When
// parlayMode is absent (pre-split accounts / old clients) it falls back to the
// Straight mode, so existing users behave exactly as before.

export const VALID_STAKE_MODES = ['bet', 'risk', 'win'];

// Normalize a saved mode string to one of bet|risk|win, else `fallback`.
export const normalizeStakeMode = (raw, fallback = 'risk') => {
    const v = String(raw || '').toLowerCase();
    return v === 'win' ? 'win' : v === 'bet' ? 'bet' : v === 'risk' ? 'risk' : fallback;
};

// Straight default mode from a betDefaults object (fallback 'risk').
export const straightDefaultMode = (betDefaults) => normalizeStakeMode(betDefaults?.mode, 'risk');

// Parlay-bucket default mode: independent parlayMode, falling back to the
// Straight mode when absent (pre-split accounts / old clients).
export const parlayDefaultMode = (betDefaults) => normalizeStakeMode(betDefaults?.parlayMode, straightDefaultMode(betDefaults));

// Resolve the default mode for a bucket. `bucket` is the active tab's mode key
// ('straight' or any parlay-like key); anything other than 'straight' uses the
// parlay default. Mirrors defaultAmountForMode's straight-vs-parlay split.
export const defaultModeForBucket = (betDefaults, bucket) => (bucket === 'straight'
    ? straightDefaultMode(betDefaults)
    : parlayDefaultMode(betDefaults));

// Decide the stake mode + seed-tracker after a straight↔parlay bucket switch.
// Re-seeds to `bucketMode` ONLY while the current mode still equals the last
// auto-seeded value (i.e. the user hasn't manually clicked a pill — a manual
// pick nulls `lastSeeded`). Returns { mode, seeded, changed }:
//   mode    – the stake mode to apply,
//   seeded  – the value to store back in the seed ref,
//   changed – whether setStakeMode actually needs to run.
export const reseedModeForBucket = ({ stakeMode, lastSeeded, bucketMode }) => {
    const untouched = lastSeeded !== null && stakeMode === lastSeeded;
    if (untouched) {
        return { mode: bucketMode, seeded: bucketMode, changed: stakeMode !== bucketMode };
    }
    // User manually chose a mode — leave it, and keep the seed ref as-is.
    return { mode: stakeMode, seeded: lastSeeded, changed: false };
};
