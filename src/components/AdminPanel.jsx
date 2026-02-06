import React, { useState } from 'react';
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
import BillingView from './admin-views/BillingView';
import SettingsView from './admin-views/SettingsView';
import RulesView from './admin-views/RulesAdminView';
import FeedbackView from './admin-views/FeedbackView';
import FAQView from './admin-views/FAQView';
import UserManualView from './admin-views/UserManualView';
import SystemMonitorView from './admin-views/SystemMonitorView';
import ProfileView from './admin-views/ProfileView';
import '../admin.css';

function AdminPanel({ onExit, role = 'admin' }) {
  const [adminView, setAdminView] = useState('dashboard');
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  const handleViewChange = (view) => {
    console.log('AdminPanel: switching to view', view);
    setAdminView(view);
    setMobileSidebarOpen(false);
  };

  const handleLogout = () => {
    if (onExit) {
      onExit();
    }
  };

  const renderView = () => {
    switch (adminView) {
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
        return <IPTrackerView />;
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
        return <AdminDashboard onMenuClick={handleViewChange} role={role} />;
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
          isOpen={mobileSidebarOpen}
          role={role}
        />
        <div className="admin-content">
          {renderView()}
        </div>
      </div>
    </div>
  );
}

export default AdminPanel;
