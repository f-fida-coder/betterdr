import React, { Suspense, lazy, useEffect, useState } from 'react';
import AdminDashboard from './AdminDashboard';
import AdminHeader from './AdminHeader';
import AdminSidebar from './AdminSidebar';
import '../admin.css';
import { canManageIpTracker, hasViewPermission } from '../utils/adminPermissions';
import ErrorBoundary from './ErrorBoundary';
import LoadingSpinner from './LoadingSpinner';

import { getMe, impersonateUser } from '../api';

const WeeklyFiguresView = lazy(() => import('./admin-views/WeeklyFiguresView'));
const PendingView = lazy(() => import('./admin-views/PendingView'));
const MessagingView = lazy(() => import('./admin-views/MessagingView'));
const GameAdminView = lazy(() => import('./admin-views/GameAdminView'));
const CasinoBetsView = lazy(() => import('./admin-views/CasinoBetsView'));
const CustomerAdminView = lazy(() => import('./admin-views/CustomerAdminView'));
const CashierView = lazy(() => import('./admin-views/CashierView'));
const AddCustomerView = lazy(() => import('./admin-views/AddCustomerView'));
const ThirdPartyLimitsView = lazy(() => import('./admin-views/ThirdPartyLimitsView'));
const PropsView = lazy(() => import('./admin-views/PropsView'));
const AgentPerformanceView = lazy(() => import('./admin-views/AgentPerformanceView'));
const AnalysisView = lazy(() => import('./admin-views/AnalysisView'));
const IPTrackerView = lazy(() => import('./admin-views/IPTrackerView'));
const TransactionsHistoryView = lazy(() => import('./admin-views/TransactionsHistoryView'));
const DeletedWagersView = lazy(() => import('./admin-views/DeletedWagersView'));
const GamesEventsView = lazy(() => import('./admin-views/GamesEventsView'));
const SportsBookLinksView = lazy(() => import('./admin-views/SportsBookLinksView'));
const BetTickerView = lazy(() => import('./admin-views/BetTickerView'));
const TicketWriterView = lazy(() => import('./admin-views/TicketWriterView'));
const ScoresView = lazy(() => import('./admin-views/ScoresView'));
const AgentAdminView = lazy(() => import('./admin-views/AgentAdminView'));
const MasterAgentManagerView = lazy(() => import('./admin-views/MasterAgentManagerView'));
const BillingView = lazy(() => import('./admin-views/BillingView'));
const SettingsView = lazy(() => import('./admin-views/SettingsView'));
const RulesView = lazy(() => import('./admin-views/RulesAdminView'));
const FeedbackView = lazy(() => import('./admin-views/FeedbackView'));
const FAQView = lazy(() => import('./admin-views/FAQView'));
const UserManualView = lazy(() => import('./admin-views/UserManualView'));
const SystemMonitorView = lazy(() => import('./admin-views/SystemMonitorView'));
const ProfileView = lazy(() => import('./admin-views/ProfileView'));
const CustomerDetailsView = lazy(() => import('./admin-views/CustomerDetailsView'));
const ScoreboardSidebar = lazy(() => import('./ScoreboardSidebar'));

const FALLBACK_VIEW_ORDER = [
  'dashboard',
  'weekly-figures',
  'customer-admin',
  'add-customer',
  'cashier',
  'settings',
  'profile'
];

const ViewLoadingFallback = ({ label = 'Loading admin view...' }) => (
  <LoadingSpinner variant="section" label={label} />
);

function AdminPanel({ onExit, role = 'admin' }) {
  const [adminView, setAdminView] = useState('dashboard');
  const [selectedUserId, setSelectedUserId] = useState(null);
  const [viewContext, setViewContext] = useState(null);
  const [layoutPref, setLayoutPref] = useState('tiles');
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  const [permissions, setPermissions] = useState(null);
  const [effectiveRole, setEffectiveRole] = useState(role);
  const [showScoreboard, setShowScoreboard] = useState(false);
  const [baseContextLabel, setBaseContextLabel] = useState('Admin');

  useEffect(() => {
    const fetchPref = async () => {
      try {
        const token = localStorage.getItem('token');
        if (token) {
          const me = await getMe(token);
          if (me) {
            if (me.dashboardLayout) {
              setLayoutPref(me.dashboardLayout);
            }
            setPermissions(me.permissions || null);
            if (me.role) {
              setEffectiveRole(me.role);
            }
          }
        }
      } catch (e) {
        console.error("Failed to fetch layout pref", e);
      }
    };
    fetchPref();
  }, []);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleViewChange = (view, userIdOrContext = null, nextViewContext = null) => {
    const normalizedView = (view === 'transactions-history')
      ? 'transaction-history'
      : view;
    if (!hasViewPermission(effectiveRole, permissions, normalizedView)) {
      return;
    }

    const resolvedUserId = (
      typeof userIdOrContext === 'string' || typeof userIdOrContext === 'number'
    ) ? String(userIdOrContext) : null;
    const resolvedViewContext = (
      nextViewContext && typeof nextViewContext === 'object'
    )
      ? nextViewContext
      : (
        userIdOrContext && typeof userIdOrContext === 'object' && !Array.isArray(userIdOrContext)
          ? userIdOrContext
          : null
      );

    setAdminView(normalizedView);
    setViewContext(resolvedViewContext);
    if (resolvedUserId) {
      setSelectedUserId(resolvedUserId);
    } else if (normalizedView !== 'user-details') {
      setSelectedUserId(null);
    }
  };

  useEffect(() => {
    if (!hasViewPermission(effectiveRole, permissions, adminView)) {
      const nextView = FALLBACK_VIEW_ORDER.find((viewId) => hasViewPermission(effectiveRole, permissions, viewId)) || 'dashboard';
      setAdminView(nextView);
    }
  }, [adminView, permissions, effectiveRole]);

  const handleLogout = () => {
    onExit();
  };

  const handleSwitchContext = async (targetId) => {
    try {
      const token = localStorage.getItem('token') || sessionStorage.getItem('token');
      if (!token || !targetId) return;

      const baseToken = sessionStorage.getItem('impersonationBaseToken');
      const actorToken = baseToken || token;
      if (!baseToken) {
        const me = await getMe(token);
        const baseRole = String(me?.role || role || 'admin').toLowerCase();
        const roleLabel = baseRole === 'master_agent' ? 'Master Agent' : baseRole === 'super_agent' ? 'Super Agent' : baseRole === 'agent' ? 'Agent' : 'Admin';
        sessionStorage.setItem('impersonationBaseToken', token);
        sessionStorage.setItem('impersonationBaseRole', baseRole);
        sessionStorage.setItem('impersonationBaseUsername', String(me?.username || roleLabel));
        sessionStorage.setItem('impersonationBaseId', String(me?.id || ''));
      }

      const data = await impersonateUser(targetId, actorToken);
      if (!data?.token) return;

      localStorage.setItem('token', data.token);
      sessionStorage.setItem('token', data.token);
      if (data.role) {
        localStorage.setItem('userRole', data.role);
      }
      if (data.username && data.role) {
        const roleKey = data.role === 'admin' ? 'admin' : (data.role === 'super_agent' || data.role === 'master_agent' ? 'super_agent' : 'agent');
        sessionStorage.setItem(`${roleKey}Username`, data.username);
      }

      sessionStorage.removeItem('postSwitchAdminView');
      const nextRoleKey = data.role === 'admin'
        ? 'admin'
        : ((data.role === 'super_agent' || data.role === 'master_agent') ? 'super_agent' : 'agent');
      window.location.href = `/${nextRoleKey}/dashboard`;
    } catch (e) {
      console.error('Context switch failed:', e);
      alert(e.message || 'Failed to switch context');
    }
  };

  const handleRestoreBaseContext = () => {
    const baseToken = sessionStorage.getItem('impersonationBaseToken');
    if (!baseToken) return;

    localStorage.setItem('token', baseToken);
    sessionStorage.setItem('token', baseToken);

    const baseRole = sessionStorage.getItem('impersonationBaseRole');
    if (baseRole) {
      localStorage.setItem('userRole', baseRole);
    }

    sessionStorage.removeItem('impersonationBaseToken');
    sessionStorage.removeItem('impersonationBaseRole');
    sessionStorage.removeItem('impersonationBaseUsername');
    sessionStorage.removeItem('impersonationBaseId');
    sessionStorage.removeItem('postSwitchAdminView');
    const nextRoleKey = baseRole === 'admin'
      ? 'admin'
      : ((baseRole === 'super_agent' || baseRole === 'master_agent') ? 'super_agent' : 'agent');
    window.location.href = `/${nextRoleKey}/dashboard`;
  };

  useEffect(() => {
    const baseRole = sessionStorage.getItem('impersonationBaseRole');
    const baseUsername = sessionStorage.getItem('impersonationBaseUsername');
    if (!baseRole) {
      setBaseContextLabel('Admin');
      return;
    }
    const roleLabel = baseRole === 'master_agent' ? 'Master Agent' : baseRole === 'super_agent' ? 'Super Agent' : baseRole === 'agent' ? 'Agent' : 'Admin';
    setBaseContextLabel(baseUsername ? `${roleLabel} (${String(baseUsername).toUpperCase()})` : roleLabel);
  }, []);

  const renderLazyView = (element, label = 'Loading admin view...') => (
    <Suspense fallback={<ViewLoadingFallback label={label} />}>
      {element}
    </Suspense>
  );

  const renderView = () => {
    const dashboardProps = {
      onMenuClick: handleViewChange,
      onOpenScoreboard: () => setShowScoreboard(true),
      onSwitchContext: handleSwitchContext,
      role: effectiveRole,
      layoutPref,
      isMobile,
      permissions,
    };

    switch (adminView) {
      case 'dashboard':
        return <AdminDashboard {...dashboardProps} />;
      case 'user-details':
        return renderLazyView(
          <CustomerDetailsView
            userId={selectedUserId}
            onBack={() => setAdminView('customer-admin')}
            onNavigateToUser={(nextUserId) => handleViewChange('user-details', nextUserId)}
            role={effectiveRole}
            viewContext={viewContext}
          />,
          'Loading customer details...'
        );
      case 'weekly-figures':
        return renderLazyView(
          <WeeklyFiguresView onViewChange={handleViewChange} viewContext={viewContext} />,
          'Loading weekly figures...'
        );
      case 'pending':
        return renderLazyView(<PendingView />, 'Loading pending transactions...');
      case 'messaging':
        return renderLazyView(<MessagingView />, 'Loading messaging...');
      case 'game-admin':
        return renderLazyView(<GameAdminView />, 'Loading game admin...');
      case 'casino-bets':
        return renderLazyView(<CasinoBetsView />, 'Loading casino bets...');
      case 'customer-admin':
        return renderLazyView(
          <CustomerAdminView onViewChange={handleViewChange} />,
          'Loading customer admin...'
        );
      case 'cashier':
        return renderLazyView(<CashierView />, 'Loading cashier...');
      case 'add-customer':
        return renderLazyView(
          <AddCustomerView onBack={() => setAdminView('customer-admin')} />,
          'Loading add customer...'
        );
      case 'third-party-limits':
        return renderLazyView(<ThirdPartyLimitsView />, 'Loading limits...');
      case 'props':
        return renderLazyView(<PropsView />, 'Loading props...');
      case 'agent-performance':
        return renderLazyView(<AgentPerformanceView />, 'Loading agent performance...');
      case 'analysis':
        return renderLazyView(<AnalysisView />, 'Loading analysis...');
      case 'ip-tracker':
        return renderLazyView(
          <IPTrackerView canManage={canManageIpTracker(effectiveRole, permissions)} />,
          'Loading IP tracker...'
        );
      case 'transaction-history':
      case 'transactions-history':
        return renderLazyView(
          <TransactionsHistoryView viewContext={viewContext} />,
          'Loading transaction history...'
        );
      case 'deleted-wagers':
        return renderLazyView(<DeletedWagersView />, 'Loading deleted wagers...');
      case 'games-events':
        return renderLazyView(<GamesEventsView />, 'Loading games and events...');
      case 'sportsbook-links':
        return renderLazyView(<SportsBookLinksView />, 'Loading sportsbook links...');
      case 'bet-ticker':
        return renderLazyView(<BetTickerView />, 'Loading bet ticker...');
      case 'ticketwriter':
        return renderLazyView(<TicketWriterView />, 'Loading ticket writer...');
      case 'scores':
        return renderLazyView(<ScoresView />, 'Loading scores...');
      case 'agent-admin':
        return renderLazyView(<AgentAdminView />, 'Loading agent admin...');
      case 'agent-manager':
        return renderLazyView(<MasterAgentManagerView />, 'Loading agent manager...');
      case 'master-agent-admin':
        return renderLazyView(<AgentAdminView />, 'Loading agent admin...');
      case 'billing':
        return renderLazyView(<BillingView />, 'Loading billing...');
      case 'settings':
        return renderLazyView(<SettingsView />, 'Loading settings...');
      case 'profile':
        return renderLazyView(<ProfileView />, 'Loading profile...');
      case 'rules':
        return renderLazyView(<RulesView />, 'Loading rules...');
      case 'feedback':
        return renderLazyView(<FeedbackView />, 'Loading feedback...');
      case 'faq':
        return renderLazyView(<FAQView />, 'Loading FAQs...');
      case 'user-manual':
        return renderLazyView(<UserManualView />, 'Loading user manual...');
      case 'monitor':
        return renderLazyView(<SystemMonitorView />, 'Loading monitor...');
      default:
        return <AdminDashboard {...dashboardProps} />;
    }
  };

  return (
    <div className={`admin-panel ${adminView === 'dashboard' ? 'dashboard-home-active' : ''}`}>
      <AdminHeader
        onLogout={handleLogout}
        onViewChange={handleViewChange}
        onSwitchContext={handleSwitchContext}
        onRestoreBaseContext={handleRestoreBaseContext}
        canRestoreBaseContext={Boolean(sessionStorage.getItem('impersonationBaseToken'))}
        baseContextLabel={baseContextLabel}
        role={effectiveRole}
        showStats={adminView === 'dashboard'}
      />
      <div className="admin-container">
        {!isMobile && (
          <AdminSidebar
            activeView={adminView}
            onViewChange={handleViewChange}
            onOpenScoreboard={() => setShowScoreboard(true)}
            isOpen={false}
            onRequestClose={() => {}}
            role={effectiveRole}
            permissions={permissions}
          />
        )}
        <div className={`admin-content ${adminView === 'dashboard' ? 'dashboard-view' : ''}`}>
          <ErrorBoundary>
            {renderView()}
          </ErrorBoundary>
        </div>
      </div>
      {showScoreboard && (
        <Suspense fallback={<LoadingSpinner variant="overlay" label="Loading scoreboard..." />}>
          <ScoreboardSidebar onClose={() => setShowScoreboard(false)} />
        </Suspense>
      )}
    </div>
  );
}

export default AdminPanel;
