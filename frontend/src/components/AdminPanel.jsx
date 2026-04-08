import React, { useState, useEffect } from 'react';
import AdminDashboard from './AdminDashboard';
import AdminHeader from './AdminHeader';
import AdminSidebar from './AdminSidebar';
import WeeklyFiguresView from './admin-views/WeeklyFiguresView';
import PendingView from './admin-views/PendingView';
import MessagingView from './admin-views/MessagingView';
import GameAdminView from './admin-views/GameAdminView';
import CasinoBetsView from './admin-views/CasinoBetsView';
import CustomerAdminView from './admin-views/CustomerAdminView';
import CashierView from './admin-views/CashierView';
import AddCustomerView from './admin-views/AddCustomerView';
import ThirdPartyLimitsView from './admin-views/ThirdPartyLimitsView';
import PropsView from './admin-views/PropsView';
import AgentPerformanceView from './admin-views/AgentPerformanceView';
import AnalysisView from './admin-views/AnalysisView';
import IPTrackerView from './admin-views/IPTrackerView';
import TransactionsHistoryView from './admin-views/TransactionsHistoryView';
import DeletedWagersView from './admin-views/DeletedWagersView';
import GamesEventsView from './admin-views/GamesEventsView';
import SportsBookLinksView from './admin-views/SportsBookLinksView';
import BetTickerView from './admin-views/BetTickerView';
import TicketWriterView from './admin-views/TicketWriterView';
import ScoresView from './admin-views/ScoresView';
import AgentAdminView from './admin-views/AgentAdminView';
import MasterAgentManagerView from './admin-views/MasterAgentManagerView';
import BillingView from './admin-views/BillingView';
import SettingsView from './admin-views/SettingsView';
import RulesView from './admin-views/RulesAdminView';
import FeedbackView from './admin-views/FeedbackView';
import FAQView from './admin-views/FAQView';
import UserManualView from './admin-views/UserManualView';
import SystemMonitorView from './admin-views/SystemMonitorView';
import ProfileView from './admin-views/ProfileView';
import ScoreboardSidebar from './ScoreboardSidebar';
import '../admin.css';
import { canManageIpTracker, hasViewPermission } from '../utils/adminPermissions';

import CustomerDetailsView from './admin-views/CustomerDetailsView';
import ErrorBoundary from './ErrorBoundary';

import { getMe, impersonateUser } from '../api';

const FALLBACK_VIEW_ORDER = [
  'dashboard',
  'weekly-figures',
  'customer-admin',
  'add-customer',
  'cashier',
  'settings',
  'profile'
];

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

  const renderView = () => {
    switch (adminView) {
      case 'dashboard':
        return (
          <AdminDashboard
            onMenuClick={handleViewChange}
            onOpenScoreboard={() => setShowScoreboard(true)}
            onSwitchContext={handleSwitchContext}
            role={effectiveRole}
            layoutPref={layoutPref}
            isMobile={isMobile}
            permissions={permissions}
          />
        );
      case 'user-details':
        return (
          <CustomerDetailsView
            userId={selectedUserId}
            onBack={() => setAdminView('customer-admin')}
            onNavigateToUser={(nextUserId) => handleViewChange('user-details', nextUserId)}
            role={effectiveRole}
          />
        );
      case 'weekly-figures':
        return <WeeklyFiguresView onViewChange={handleViewChange} viewContext={viewContext} />;
      case 'pending':
        return <PendingView />;
      case 'messaging':
        return <MessagingView />;
      case 'game-admin':
        return <GameAdminView />;
      case 'casino-bets':
        return <CasinoBetsView />;
      case 'customer-admin':
        return <CustomerAdminView onViewChange={handleViewChange} />;
      case 'cashier':
        return <CashierView />;
      case 'add-customer':
        return <AddCustomerView onBack={() => setAdminView('customer-admin')} />;
      case 'third-party-limits':
        return <ThirdPartyLimitsView />;
      case 'props':
        return <PropsView />;
      case 'agent-performance':
        return <AgentPerformanceView />;
      case 'analysis':
        return <AnalysisView />;
      case 'ip-tracker':
        return <IPTrackerView canManage={canManageIpTracker(effectiveRole, permissions)} />;
      case 'transaction-history':
      case 'transactions-history':
        return <TransactionsHistoryView viewContext={viewContext} />;
      case 'deleted-wagers':
        return <DeletedWagersView />;
      case 'games-events':
        return <GamesEventsView />;
      case 'sportsbook-links':
        return <SportsBookLinksView />;
      case 'bet-ticker':
        return <BetTickerView />;
      case 'ticketwriter':
        return <TicketWriterView />;
      case 'scores':
        return <ScoresView />;
      case 'agent-admin':
        return <AgentAdminView />;
      case 'agent-manager':
        return <MasterAgentManagerView />;
      case 'master-agent-admin':
        return <AgentAdminView />;
      case 'billing':
        return <BillingView />;
      case 'settings':
        return <SettingsView />;
      case 'profile':
        return <ProfileView />;
      case 'rules':
        return <RulesView />;
      case 'feedback':
        return <FeedbackView />;
      case 'faq':
        return <FAQView />;
      case 'user-manual':
        return <UserManualView />;
      case 'monitor':
        return <SystemMonitorView />;
      default:
        return <AdminDashboard onMenuClick={handleViewChange} onOpenScoreboard={() => setShowScoreboard(true)} onSwitchContext={handleSwitchContext} role={effectiveRole} permissions={permissions} />;
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
      {showScoreboard && <ScoreboardSidebar onClose={() => setShowScoreboard(false)} />}
    </div>
  );
}

export default AdminPanel;
