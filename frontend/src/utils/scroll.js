// Scroll-to-bottom acceptance gating (Nicky 2026-07-22): the onboarding
// gate's rules steps unlock their checkbox + Accept only after the player
// has scrolled the full text to the bottom. Pure predicates so the rule is
// unit-testable without a DOM (frontend/tests/scrollGate.test.js).

// Tolerance for fractional device pixels / momentum-scroll overshoot — iOS
// reports scrollTop values that can sit a few px shy of the exact bottom.
export const SCROLL_BOTTOM_EPSILON_PX = 24;

// True once the visible window (scrollTop + clientHeight) reaches the
// content height, within the epsilon.
export const hasReachedScrollBottom = (scrollTop, clientHeight, scrollHeight, epsilon = SCROLL_BOTTOM_EPSILON_PX) => {
    // Guard the raw values: Number(null) coerces to 0, which would read a
    // missing measurement as "at the top of empty content" and unlock.
    if (scrollTop == null || clientHeight == null || scrollHeight == null) return false;
    const top = Number(scrollTop);
    const client = Number(clientHeight);
    const full = Number(scrollHeight);
    if (!Number.isFinite(top) || !Number.isFinite(client) || !Number.isFinite(full)) return false;
    return top + client >= full - epsilon;
};

// Content that fits the container without any scrollbar counts as read —
// otherwise a short rules set could never unlock Accept.
export const contentFitsWithoutScroll = (clientHeight, scrollHeight, epsilon = SCROLL_BOTTOM_EPSILON_PX) =>
    hasReachedScrollBottom(0, clientHeight, scrollHeight, epsilon);
