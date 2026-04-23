import React, { Suspense } from 'react';
import DashboardHeader from './DashboardHeader';
import DashboardSidebar from './DashboardSidebar';
import DashboardMain from './DashboardMain';
import MobileGridMenu from './MobileGridMenu';
import MobileContentView from './MobileContentView';
import PromoCard from './PromoCard';
import ChatWidget from './ChatWidget';
import ModeBetPanel from './ModeBetPanel';
import LoadingSpinner from './LoadingSpinner';

const PrimeLiveView = React.lazy(() => import('./PrimeLiveView'));
const UltraLiveView = React.lazy(() => import('./UltraLiveView'));
const CasinoView = React.lazy(() => import('./CasinoView'));
const LiveCasinoView = React.lazy(() => import('./LiveCasinoView'));
const PropsView = React.lazy(() => import('./PropsView'));
const RulesView = React.lazy(() => import('./RulesView'));
const BonusView = React.lazy(() => import('./BonusView'));
const TutorialsView = React.lazy(() => import('./TutorialsView'));
const SupportView = React.lazy(() => import('./SupportView'));
const MyBetsView = React.lazy(() => import('./MyBetsView'));

function UserDashboardShell({
  user,
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
  onBetPlaced,
}) {
  return (
    <div className={`dashboard-layout ${mobileViewState === 'browsing' ? 'no-bet-tabs' : ''}`}>
      <DashboardHeader
        username={user?.username || 'Guest'}
        balance={user?.balance ?? null}
        pendingBalance={user?.pendingBalance ?? null}
        availableBalance={user?.availableBalance ?? user?.balance ?? null}
        freeplayBalance={user?.freeplayBalance ?? 0}
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

      <div className="dashboard-content-area" style={{ position: 'relative', marginTop: '0' }}>
        {mobileSidebarOpen && (
          <MobileGridMenu
            onClose={onCloseSidebar}
            onViewChange={onViewChange}
          />
        )}

        {dashboardView === 'dashboard' && (
          <>
            {isMobileViewport && mobileViewState === 'results' ? (
              <MobileContentView
                selectedSports={selectedSports}
                activeBetMode={betMode}
                slipSelections={slipSelections}
              />
            ) : isMobileViewport ? (
              <DashboardSidebar
                selectedSports={selectedSports}
                onToggleSport={onSportToggle}
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
                <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
                  {showPromo && <PromoCard />}
                  <div style={{ flex: 1 }}>
                    <DashboardMain selectedSports={selectedSports} activeBetMode={betMode} />
                  </div>
                </div>
              </>
            )}
          </>
        )}

        <Suspense fallback={<LoadingSpinner variant="inline" label="Loading..." />}>
          {dashboardView === 'prime-live' && <PrimeLiveView />}
          {dashboardView === 'ultra-live' && <UltraLiveView />}

          {dashboardView === 'casino' && (
            <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
              <CasinoView />
            </div>
          )}

          {dashboardView === 'live-casino' && (
            <div style={{ flex: 1, backgroundColor: '#505050', minHeight: 0, overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
              <LiveCasinoView />
            </div>
          )}

          {dashboardView === 'props' && <PropsView />}
          {dashboardView === 'rules' && <RulesView />}
          {dashboardView === 'bonus' && <BonusView />}
          {dashboardView === 'tutorials' && <TutorialsView />}
          {dashboardView === 'support' && <SupportView />}
          {dashboardView === 'my-bets' && <MyBetsView />}
        </Suspense>
      </div>

      <ChatWidget />

      <div className="desktop-feedback-trigger" style={{
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
        zIndex: 100
      }}>
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
          rulesByMode={betModeRules}
          onBetPlaced={onBetPlaced}
        />
      )}
    </div>
  );
}

export default React.memo(UserDashboardShell);
