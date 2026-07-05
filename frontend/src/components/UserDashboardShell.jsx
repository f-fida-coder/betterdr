import React, { Suspense, useEffect, useState } from 'react';
import DashboardHeader from './DashboardHeader';
import DashboardSidebar from './DashboardSidebar';
import DashboardMain from './DashboardMain';
import MobileGridMenu from './MobileGridMenu';
import MobileContentView from './MobileContentView';
import SearchMatchPopup from './SearchMatchPopup';
import OutrightsView from './OutrightsView';
import ErrorBoundary from './ErrorBoundary';
import PromoCard from './PromoCard';
import ChatWidget from './ChatWidget';
import ModeBetPanel from './ModeBetPanel';
import LoadingSpinner from './LoadingSpinner';
import { resolveFuturesSelection } from '../utils/futuresSelection';

// Hoisted static style objects — avoids creating new objects on every render.
const STYLE_CONTENT_AREA = { position: 'relative', marginTop: '0' };
const STYLE_FLEX_SCROLL = { flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column' };
const STYLE_FLEX_INNER = { flex: 1 };
const STYLE_FLEX_SCROLL_TOUCH = { flex: 1, minHeight: 0, overflowY: 'auto', WebkitOverflowScrolling: 'touch', display: 'flex', flexDirection: 'column' };
const STYLE_CASINO_WRAP = { flex: 1, minHeight: 0, overflowY: 'auto', display: 'flex', flexDirection: 'column' };
const STYLE_LIVE_CASINO_WRAP = { flex: 1, backgroundColor: '#505050', minHeight: 0, overflowY: 'auto', display: 'flex', flexDirection: 'column' };
const STYLE_FUTURES_WRAP = { flex: 1, overflowY: 'auto' };
const STYLE_FEEDBACK = {
  position: 'fixed',
  bottom: '0',
  left: '0',
  width: '260px',
  background: '#004d26',
  color: 'white',
  padding: '10px',
  textAlign: 'center',
  fontWeight: 'bold',
  fontSize: '12px',
  zIndex: 100,
};

const CasinoView = React.lazy(() => import('./CasinoView'));
const LiveCasinoView = React.lazy(() => import('./LiveCasinoView'));
const PropsView = React.lazy(() => import('./PropsView'));
const PropBuilderView = React.lazy(() => import('./PropBuilderView'));
const RulesView = React.lazy(() => import('./RulesView'));
const BonusView = React.lazy(() => import('./BonusView'));
const TutorialsView = React.lazy(() => import('./TutorialsView'));
const SupportView = React.lazy(() => import('./SupportView'));
const MyBetsView = React.lazy(() => import('./MyBetsView'));

function UserDashboardShell({
  user,
  realtimeConnectionState,
  lastRealtimeEventAt,
  dashboardView,
  selectedSports,
  betMode,
  mobileSidebarOpen,
  showPromo,
  mobileViewState,
  isMobileViewport,
  slipSelections,
  wager,
  teaserPoints,
  selectedTeaserTypeId,
  betModeRules,
  onLogout,
  onViewChange,
  onToggleSidebar,
  onContinue,
  onMobileBack,
  onHomeClick,
  onSportToggle,
  onBetModeChange,
  onCloseSidebar,
  onSelectionsChange,
  onWagerChange,
  onTeaserPointsChange,
  onTeaserTypeChange,
  onBetPlaced,
  onResumeOpenParlay,
}) {
  // Mirror DashboardHeader's tabs-bar visibility check so the
  // dashboard-content-area's padding-top can collapse from 124px →
  // 64px whenever the STRAIGHT/PARLAY/... tabs row isn't rendering.
  // The header now renders the tabs-bar whenever the dashboard view
  // is active (including the front sports page browsing state) or
  // the betslip overlay is open from any view, so the 124px
  // reservation must hold for those same conditions.
  const [betslipOpen, setBetslipOpen] = useState(false);
  useEffect(() => {
    const handleState = (e) => setBetslipOpen(Boolean(e?.detail?.open));
    window.addEventListener('betslip:state', handleState);
    return () => window.removeEventListener('betslip:state', handleState);
  }, []);
  const tabsBarHidden = dashboardView !== 'dashboard' && !betslipOpen;

  // Search-result → single-match popup. Sidebar's handleSearchResultClick
  // fires `search:open-match` instead of navigating to the league; we
  // render MatchDetailView directly over the current view so the player
  // sees only the game they searched for.
  const [searchOpenMatch, setSearchOpenMatch] = useState(null);
  useEffect(() => {
    const handleOpen = (e) => {
      const m = e?.detail?.match;
      if (m) setSearchOpenMatch(m);
    };
    window.addEventListener('search:open-match', handleOpen);
    return () => window.removeEventListener('search:open-match', handleOpen);
  }, []);

  // Mobile parity with DashboardMain: when the selection contains a futures
  // entry, render OutrightsView instead of the regular match-list
  // (MobileContentView), which only knows about live/upcoming h2h/spread/
  // total markets and shows an empty state for futures. The scoping props
  // come from the SAME resolver as desktop (utils/futuresSelection.js) —
  // this used to be a hand-copied block that only looked at
  // selectedSports[0] and passed no family/board scope, so tapping "Golf
  // Futures" on mobile rendered every sport's boards under a golf header.
  const futuresSelection = resolveFuturesSelection(selectedSports);

  return (
    <div className={`dashboard-layout ${tabsBarHidden ? 'no-bet-tabs' : ''}`}>
      <DashboardHeader
        username={user?.username || 'Guest'}
        realtimeConnectionState={realtimeConnectionState}
        lastRealtimeEventAt={lastRealtimeEventAt}
        userId={user?.id ?? null}
        balance={user?.balance ?? null}
        pendingBalance={user?.pendingBalance ?? null}
        availableBalance={user?.availableBalance ?? user?.balance ?? null}
        freeplayBalance={user?.freeplayBalance ?? 0}
        freeplayExpiresAt={user?.freeplayExpiresAt ?? null}
        creditLimit={user?.creditLimit ?? 0}
        creditAvailable={user?.creditAvailable ?? user?.creditLimit ?? 0}
        balanceOwed={user?.balanceOwed ?? 0}
        nonPostedCasino={user?.nonPostedCasino ?? 0}
        minBet={user?.minBet ?? null}
        maxBet={user?.maxBet ?? null}
        userSettings={user?.settings ?? null}
        role={user?.role}
        unlimitedBalance={user?.unlimitedBalance}
        onLogout={onLogout}
        onViewChange={onViewChange}
        activeBetMode={betMode}
        onBetModeChange={onBetModeChange}
        currentView={dashboardView}
        onToggleSidebar={onToggleSidebar}
        selectedSports={selectedSports}
        mobileViewState={mobileViewState}
        onContinue={onContinue}
        onMobileBack={onMobileBack}
        onHomeClick={onHomeClick}
        slipCount={Array.isArray(slipSelections) ? slipSelections.length : 0}
      />

      <div className="dashboard-content-area" style={STYLE_CONTENT_AREA}>
        {mobileSidebarOpen && (
          <MobileGridMenu
            onClose={onCloseSidebar}
            onViewChange={onViewChange}
          />
        )}

        {dashboardView === 'dashboard' && (
          <>
            {isMobileViewport && mobileViewState === 'results' && futuresSelection ? (
              <div style={STYLE_FUTURES_WRAP}>
                <ErrorBoundary>
                  <OutrightsView
                    sportKey={futuresSelection.sportKey}
                    families={futuresSelection.families}
                    boardKeys={futuresSelection.boardKeys}
                    title={futuresSelection.title}
                  />
                </ErrorBoundary>
              </div>
            ) : isMobileViewport && mobileViewState === 'results' ? (
              <MobileContentView
                selectedSports={selectedSports}
                activeBetMode={betMode}
                slipSelections={slipSelections}
                teaserTypeId={selectedTeaserTypeId}
                teaserRule={betModeRules?.teaser ?? null}
                onTeaserTypeChange={onTeaserTypeChange}
              />
            ) : isMobileViewport ? (
              <DashboardSidebar
                selectedSports={selectedSports}
                onToggleSport={onSportToggle}
                onContinue={onContinue}
                betMode={betMode}
                isOpen={true}
                onCloseSidebar={onCloseSidebar}
                isMobileSportsSelectionMode={true}
              />
            ) : (
              <>
                <DashboardSidebar
                  selectedSports={selectedSports}
                  onToggleSport={onSportToggle}
                  betMode={betMode}
                  isOpen={mobileSidebarOpen}
                  onCloseSidebar={onCloseSidebar}
                  isMobileSportsSelectionMode={false}
                />
                <div style={STYLE_FLEX_SCROLL}>
                  {showPromo && <PromoCard />}
                  <div style={STYLE_FLEX_INNER}>
                    <DashboardMain selectedSports={selectedSports} activeBetMode={betMode} />
                  </div>
                </div>
              </>
            )}
          </>
        )}

        <Suspense fallback={<LoadingSpinner variant="inline" label="Loading..." />}>
          {dashboardView === 'casino' && (
            <div style={STYLE_CASINO_WRAP}>
              <CasinoView />
            </div>
          )}

          {dashboardView === 'live-casino' && (
            <div style={STYLE_LIVE_CASINO_WRAP}>
              <LiveCasinoView />
            </div>
          )}

          {dashboardView === 'props' && <PropsView />}
          {dashboardView === 'prop-builder' && (
            <div style={STYLE_FLEX_SCROLL_TOUCH}>
              <PropBuilderView />
            </div>
          )}
          {dashboardView === 'rules' && <RulesView />}
          {dashboardView === 'bonus' && <BonusView />}
          {dashboardView === 'tutorials' && <TutorialsView />}
          {dashboardView === 'support' && <SupportView />}
          {dashboardView === 'my-bets' && (
            <div style={STYLE_FLEX_SCROLL_TOUCH}>
              <MyBetsView onResumeOpenParlay={onResumeOpenParlay} maxBet={user?.maxBet ?? null} />
            </div>
          )}
        </Suspense>
      </div>

      <ChatWidget />

      {/* Bottom-right Continue FAB removed — the action lives in the
          top-right of the header now (replaces the Account button while
          one or more sport checkboxes are selected). Removing it here
          deletes the duplicate prompt and frees that screen corner up. */}

      <div className="desktop-feedback-trigger" style={STYLE_FEEDBACK}>
        FEEDBACK
      </div>

      {user?.role === 'user' && (
        <ModeBetPanel
          user={user}
          balance={user.balance}
          availableBalance={user.availableBalance ?? user.balance}
          freeplayBalance={user.freeplayBalance ?? 0}
          freeplayExpiresAt={user.freeplayExpiresAt ?? null}
          mode={betMode}
          onModeChange={onBetModeChange}
          selections={slipSelections}
          onSelectionsChange={onSelectionsChange}
          wager={wager}
          onWagerChange={onWagerChange}
          teaserPoints={teaserPoints}
          onTeaserPointsChange={onTeaserPointsChange}
          selectedTeaserTypeId={selectedTeaserTypeId}
          onTeaserTypeChange={onTeaserTypeChange}
          rulesByMode={betModeRules}
          onBetPlaced={onBetPlaced}
        />
      )}
      {searchOpenMatch && (
        <SearchMatchPopup
          match={searchOpenMatch}
          onClose={() => setSearchOpenMatch(null)}
        />
      )}
    </div>
  );
}

export default React.memo(UserDashboardShell);
