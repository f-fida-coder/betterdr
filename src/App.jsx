import React, { useState, useEffect } from 'react';
import Header from './components/Header';
import LeagueNav from './components/LeagueNav';
import Hero from './components/Hero';
import DashboardHeader from './components/DashboardHeader';
import DashboardSidebar from './components/DashboardSidebar';
import DashboardMain from './components/DashboardMain';
import PrimeLiveView from './components/PrimeLiveView';
import UltraLiveView from './components/UltraLiveView';
import CasinoView from './components/CasinoView';
import LiveCasinoView from './components/LiveCasinoView';
import PropsView from './components/PropsView';
import RulesView from './components/RulesView';
import BonusView from './components/BonusView';
import MobileGridMenu from './components/MobileGridMenu';
import PromoCard from './components/PromoCard';
import AdminPanel from './components/AdminPanel';
import './index.css';
import './dashboard.css';

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [activeLeague, setActiveLeague] = useState('all');
  const [dashboardView, setDashboardView] = useState('dashboard');
  const [selectedSports, setSelectedSports] = useState([]);
  const [betMode, setBetMode] = useState('straight');
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [showPromo, setShowPromo] = useState(false);
  const [isAdminMode, setIsAdminMode] = useState(false);

  const handleLogin = (user) => {
    setIsLoggedIn(true);
    document.body.classList.add('dashboard-mode');
  };

  const handleViewChange = (view) => {
    setDashboardView(view);
    setMobileSidebarOpen(false);
    setShowPromo(false);
  };

  const handleSportToggle = (id) => {
    setSelectedSports(prev => {
      if (prev.includes(id)) {
        return [];
      } else {
        return [id];
      }
    });
    setShowPromo(false);
  };

  const handleContinue = () => {
    setShowPromo(false);
    setMobileSidebarOpen(false);
  };

  useEffect(() => {
    return () => {
      document.body.classList.remove('dashboard-mode');
    };
  }, []);

  return (
    <div className="app-container">
      {isAdminMode ? (
        <AdminPanel 
          onExit={() => setIsAdminMode(false)}
        />
      ) : !isLoggedIn ? (
        <>
          <Header onLogin={handleLogin} isLoggedIn={isLoggedIn} />
          <LeagueNav activeLeague={activeLeague} onSelectLeague={setActiveLeague} />

          <Hero />

          <div className="bottom-banner">
            <div className="banner-overlay">
              <div className="banner-content-centered">
                <img src="/bgremlogo.png" alt="betterbet365" style={{ height: '70px', marginBottom: '20px', filter: 'drop-shadow(0 0 20px rgba(255,255,255,0.4)) brightness(1.1)' }} />
                <div style={{ width: '100%', height: '1px', background: 'rgba(255,255,255,0.2)', marginBottom: '20px' }}></div>
                <p style={{ color: 'white', fontSize: '14px', fontWeight: 700, letterSpacing: '4px', textShadow: '0 2px 10px rgba(0,0,0,0.5)' }}>THE PREMIUM CHOICE FOR WINNERS</p>
              </div>
            </div>
          </div>

          <footer className="main-footer">
            <div className="footer-content">
              <p>© 2026 betterbet365 | RESPONSIBLE GAMING</p>
            </div>
          </footer>
        </>
      ) : (
        <div className="dashboard-layout">
          <DashboardHeader
            username="WGT73476"
            onViewChange={handleViewChange}
            activeBetMode={betMode}
            onBetModeChange={setBetMode}
            currentView={dashboardView}
            onToggleSidebar={() => setMobileSidebarOpen(!mobileSidebarOpen)}
            selectedSports={selectedSports}
            onContinue={handleContinue}
          />

          <div className="dashboard-content-area" style={{ position: 'relative', marginTop: '0' }}>
            {mobileSidebarOpen && (
              <MobileGridMenu
                onClose={() => setMobileSidebarOpen(false)}
                onViewChange={handleViewChange}
              />
            )}

            {dashboardView === 'dashboard' && (
              <>
                <DashboardSidebar
                  selectedSports={selectedSports}
                  onToggleSport={handleSportToggle}
                  betMode={betMode}
                  isOpen={mobileSidebarOpen}
                  onCloseSidebar={() => setMobileSidebarOpen(false)}
                />
                <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
                  {showPromo && <PromoCard />}
                  <div style={{ flex: 1 }}>
                    <DashboardMain selectedSports={selectedSports} />
                  </div>
                </div>
              </>
            )}

            {dashboardView === 'prime-live' && <PrimeLiveView />}

            {dashboardView === 'ultra-live' && <UltraLiveView />}

            {dashboardView === 'casino' && <CasinoView />}

            {dashboardView === 'live-casino' && (
              <div style={{ flex: 1, backgroundColor: '#505050', minHeight: 'calc(100vh - 125px)' }}>
                <LiveCasinoView />
              </div>
            )}

            {dashboardView === 'props' && <PropsView />}

            {dashboardView === 'rules' && <RulesView />}

            {dashboardView === 'bonus' && <BonusView />}
          </div>

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

          <div style={{
            position: 'fixed',
            bottom: '40px',
            left: '20px',
            width: '50px',
            height: '50px',
            background: '#a30000',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white',
            zIndex: 21,
            boxShadow: '0 2px 5px rgba(0,0,0,0.3)',
            border: '2px solid white'
          }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
              <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z" />
            </svg>
          </div>
          
          <button
            onClick={() => setIsAdminMode(true)}
            style={{
              position: 'fixed',
              top: '20px',
              right: '20px',
              padding: '8px 16px',
              background: '#0d3b5c',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '12px',
              fontWeight: 'bold',
              zIndex: 100
            }}
          >
            Admin Panel
          </button>
        </div>
      )}
    </div>
  );
}

export default App;
