import { useEffect, useRef } from 'react';

// Shared dismiss behavior for every transient bet-placement surface — the
// player-props panel, matchup detail sheet, search popup, teaser-points
// picker, buy-points dropdown, confirmation sheet, etc. One implementation
// so every surface behaves identically instead of each re-inventing it:
//
//   • Browser BACK closes the topmost surface and returns to the board —
//     it never leaves the site. Each open surface owns exactly one pushed
//     history entry, so Back unwinds one layer at a time.
//   • ESC closes the topmost surface (desktop).
//   • Only the TOPMOST surface responds to a dismiss; nested surfaces
//     (e.g. a buy-points dropdown inside the betslip) close in order.
//
// Outside-tap is handled by each surface's own backdrop (onClick={onClose}),
// which captures the event so it can't pass through to the board. The top
// nav bet-mode tabs sit ABOVE that backdrop, so DashboardHeader calls
// dismissTopSurface() on a tab tap — closing the surface instead of
// switching the bet mode.

// Stack of currently-open surfaces (topmost = last). Each entry:
//   { onClose, viaPopstate, dismissOnNavTab }
const stack = [];
// Number of upcoming popstate events to ignore because WE triggered them
// (via history.back() when closing a surface by means other than Back).
let suppressPop = 0;
let listenersBound = false;

const topEntry = () => (stack.length > 0 ? stack[stack.length - 1] : null);

const bindGlobalListeners = () => {
    if (listenersBound || typeof window === 'undefined') return;
    listenersBound = true;

    window.addEventListener('popstate', () => {
        if (suppressPop > 0) {
            suppressPop -= 1;
            return;
        }
        const top = topEntry();
        if (top) {
            // The browser already popped the state this surface pushed, so the
            // effect cleanup must NOT call history.back() again. Flag it, then
            // close the surface (flips its `isOpen` → cleanup runs).
            top.viaPopstate = true;
            top.onClose();
        }
    });

    window.addEventListener('keydown', (e) => {
        if (e.key !== 'Escape' && e.key !== 'Esc') return;
        const top = topEntry();
        if (top) top.onClose();
    });
};

// Close the topmost surface programmatically (used by the header bet-mode
// tabs). Returns true if a surface was open AND eligible — eligible meaning
// it opts into nav-tab dismissal (the persistent betslip opts out so its
// tabs keep switching modes). When this returns false the caller proceeds
// with its normal action.
export const dismissTopSurface = () => {
    const top = topEntry();
    if (!top || !top.dismissOnNavTab) return false;
    top.onClose();
    return true;
};

export const hasOpenSurface = () => stack.length > 0;

/**
 * Register a transient surface for shared dismissal while it is open.
 *
 * @param {boolean} isOpen   whether the surface is currently shown
 * @param {Function} onClose called to close the surface (must flip isOpen)
 * @param {{ dismissOnNavTab?: boolean }} [options]
 *        dismissOnNavTab — whether a top nav-tab tap should close it
 *        (default true; pass false for the betslip).
 */
export const useDismissableSurface = (isOpen, onClose, options = {}) => {
    const { dismissOnNavTab = true } = options;
    const onCloseRef = useRef(onClose);
    onCloseRef.current = onClose;

    useEffect(() => {
        if (!isOpen || typeof window === 'undefined') return undefined;
        bindGlobalListeners();

        const entry = {
            viaPopstate: false,
            dismissOnNavTab,
            onClose: () => onCloseRef.current && onCloseRef.current(),
        };
        stack.push(entry);
        // One history entry per open surface so BACK pops exactly this layer.
        // No URL change — the router sees the same path and stays put.
        window.history.pushState({ __surface: true }, '');

        return () => {
            const i = stack.lastIndexOf(entry);
            if (i !== -1) stack.splice(i, 1);
            // Closed by something OTHER than browser Back (outside-tap, X,
            // Escape, a selection, nav-tab) — remove the state we pushed so
            // history depth stays balanced. The resulting popstate is ours,
            // so suppress it.
            if (!entry.viaPopstate) {
                suppressPop += 1;
                window.history.back();
            }
        };
    }, [isOpen, dismissOnNavTab]);
};
