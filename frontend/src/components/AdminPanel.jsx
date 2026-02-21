import React, { useState, useEffect } from 'react';
import AdminDashboard from './AdminDashboard';
import AdminHeader from './AdminHeader';
import AdminSidebar from './AdminSidebar';
import WeeklyFiguresView from './admin-views/WeeklyFiguresView';
import PendingView from './admin-views/PendingView';
import MessagingView from './admin-views/MessagingView';
import GameAdminView from './admin-views/GameAdminView';
import CustomerAdminView from './admin-views/CustomerAdminView';
import CashierView from './admin-views/CashierView';
import AddCustomerView from './admin-views/AddCustomerView';
import ThirdPartyLimitsView from './admin-views/ThirdPartyLimitsView';
import PropsView from './admin-views/PropsView';
import AgentPerformanceView from './admin-views/AgentPerformanceView';
import AnalysisView from './admin-views/AnalysisView';
import IPTrackerView from './admin-views/IPTrackerView';
import TransactionsHistoryView from './admin-views/TransactionsHistoryView';
import CollectionsView from './admin-views/CollectionsView';
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

import { getMe } from '../api';

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
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState(null);
  const [layoutPref, setLayoutPref] = useState('tiles');
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  const [permissions, setPermissions] = useState(null);
  const [showScoreboard, setShowScoreboard] = useState(false);

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

  const handleViewChange = (view, userId = null) => {
    if (!hasViewPermission(role, permissions, view)) {
      return;
    }
    setAdminView(view);
    if (userId) {
      setSelectedUserId(userId);
    }
    setMobileSidebarOpen(false);
  };

  useEffect(() => {
    if (!hasViewPermission(role, permissions, adminView)) {
      const nextView = FALLBACK_VIEW_ORDER.find((viewId) => hasViewPermission(role, permissions, viewId)) || 'dashboard';
      setAdminView(nextView);
    }
  }, [adminView, permissions, role]);

  const handleLogout = () => {
    onExit();
  };

  const renderView = () => {
    switch (adminView) {
      case 'dashboard':
        return (
          <AdminDashboard
            onMenuClick={handleViewChange}
            onOpenScoreboard={() => setShowScoreboard(true)}
            role={role}
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
            role={role}
          />
        );
      case 'weekly-figures':
        return <WeeklyFiguresView />;
      case 'pending':
        return <PendingView />;
      case 'messaging':
        return <MessagingView />;
      case 'game-admin':
        return <GameAdminView />;
      case 'customer-admin':
        return <CustomerAdminView onViewChange={handleViewChange} />;
      case 'cashier':
        return <CashierView />;
      case 'add-customer':
        return <AddCustomerView />;
      case 'third-party-limits':
        return <ThirdPartyLimitsView />;
      case 'props':
        return <PropsView />;
      case 'agent-performance':
        return <AgentPerformanceView />;
      case 'analysis':
        return <AnalysisView />;
      case 'ip-tracker':
        return <IPTrackerView canManage={canManageIpTracker(role, permissions)} />;
      case 'transactions-history':
        return <TransactionsHistoryView />;
      case 'collections':
        return <CollectionsView />;
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
        return <AdminDashboard onMenuClick={handleViewChange} onOpenScoreboard={() => setShowScoreboard(true)} role={role} permissions={permissions} />;
    }
  };

  return (
    <div className="admin-panel">
      <AdminHeader
        onMenuToggle={() => setMobileSidebarOpen(!mobileSidebarOpen)}
        onLogout={handleLogout}
        onViewChange={handleViewChange}
      />
      <div className="admin-container">
        <AdminSidebar
          activeView={adminView}
          onViewChange={handleViewChange}
          onOpenScoreboard={() => setShowScoreboard(true)}
          isOpen={mobileSidebarOpen}
          role={role}
          permissions={permissions}
        />
        <div className="admin-content">
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
