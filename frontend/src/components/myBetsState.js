// Cross-render handoff state for MyBetsView initial tab selection.
// AccountPanel and DashboardHeader set this before navigating to /my-bets
// so the view mounts with the requested tab active. Kept in its own module
// so that eager components (DashboardHeader, AccountPanel) do not pull in
// the full MyBetsView module -- and its mybets.css import -- at startup.
let pendingInitialFilter = null;

export const setMyBetsInitialFilter = (filter) => {
    if (['pending', 'figures', 'transactions', 'graded', 'won', 'lost', 'void', 'all'].includes(filter)) {
        pendingInitialFilter = filter;
    }
};

export const consumeMyBetsInitialFilter = () => {
    const value = pendingInitialFilter;
    pendingInitialFilter = null;
    return value;
};
