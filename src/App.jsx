import React, { useState, useEffect } from 'react';
import { loginUser, getBalance } from './api';
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
import MobileContentView from './components/MobileContentView';
import PromoCard from './components/PromoCard';
import TutorialsView from './components/TutorialsView';
import SupportView from './components/SupportView';
import ChatWidget from './components/ChatWidget';
import MyBetsView from './components/MyBetsView';
import AdminPanel from './components/AdminPanel'; // Import AdminPanel
import LandingPage from './components/LandingPage';
import './index.css';
import './dashboard.css';

function App() {
  const [token, setToken] = useState(localStorage.getItem('token') || null);
  const [isLoggedIn, setIsLoggedIn] = useState(Boolean(token));
  const [activeLeague, setActiveLeague] = useState('all');
  const [dashboardView, setDashboardView] = useState('dashboard');
  const [selectedSports, setSelectedSports] = useState([]);
  const [betMode, setBetMode] = useState('straight');
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [showPromo, setShowPromo] = useState(false);
  const [isMobileSportsSelectionMode, setIsMobileSportsSelectionMode] = useState(false);
  const isMobileViewport = typeof window !== 'undefined'
    && window.matchMedia
    && window.matchMedia('(max-width: 768px)').matches;

  const [user, setUser] = useState(null); // Store full user object

  // Initial Load - Check for token (simplified)
  useEffect(() => {
    window.dispatchEvent(new CustomEvent('matches:refresh'));

    if (token) {
      setIsLoggedIn(true);
      document.body.classList.add('dashboard-mode');
      fetchUserData(token);
    } else {
      setIsLoggedIn(false);
      document.body.classList.remove('dashboard-mode');
    }
  }, [token]);

  // Listen for user refresh events (e.g., after placing a bet)
  useEffect(() => {
    const handleUserRefresh = () => {
      if (token) {
        fetchUserData(token);
      }
    };

    window.addEventListener('user:refresh', handleUserRefresh);

    return () => {
      window.removeEventListener('user:refresh', handleUserRefresh);
    };
  }, [token]);

  const fetchUserData = async (authToken) => {
    try {
      const balanceData = await getBalance(authToken);
      // Assuming we decode token for username or fetch /me endpoint. 
      // For now, let's use the one from login response or a placeholder if just token exists
      // Ideally we need a /api/auth/me endpoint.
      setUser(prev => ({ ...prev, ...balanceData, username: prev?.username || 'User' }));
    } catch (e) {
      console.error('Failed to fetch user data', e);
    }
  };

  const handleLogin = async (username, password) => {
    try {
      // Call real backend authentication
      const result = await loginUser(username, password);

      // Store the token from the real backend
      setToken(result.token);
      localStorage.setItem('token', result.token);

      // Store user data from the backend response
      setUser({
        username: result.username,
        email: result.email,
        balance: result.balance,
        pendingBalance: result.pendingBalance,
        availableBalance: result.availableBalance,
        id: result.id,
        role: result.role,
        unlimitedBalance: result.unlimitedBalance // Store this
      });

      setIsLoggedIn(true);
      document.body.classList.add('dashboard-mode');
    } catch (err) {
      throw err;
    }
  };

  const handleLogout = () => {
    setToken(null);
    setUser(null);
    setIsLoggedIn(false);
    localStorage.removeItem('token');
    document.body.classList.remove('dashboard-mode');
    handleHomeClick();
  };

  const handleViewChange = (view) => {
    setDashboardView(view);
    setMobileSidebarOpen(false);
    setShowPromo(false);
  };

  const handleHomeClick = () => {
    // Reset to default dashboard view with no selected sports
    setDashboardView('dashboard');
    setSelectedSports([]);
    setMobileSidebarOpen(false);
    setShowPromo(false);
    setIsMobileSportsSelectionMode(false);
  };

  const handleSportToggle = (id) => {
    setSelectedSports(prev => {
      const next = prev.includes(id) ? [] : [id];
      if (isMobileViewport) {
        setIsMobileSportsSelectionMode(next.length > 0);
      }
      return next;
    });
    setShowPromo(false);
  };

  const handleContinue = () => {
    setShowPromo(false);
    setMobileSidebarOpen(false);
    // Exit mobile sports selection mode and show content
    setIsMobileSportsSelectionMode(false);
  };

  useEffect(() => {
    return () => {
      document.body.classList.remove('dashboard-mode');
    };
  }, []);

  return (
    <div className="app-container">
      {/* If logged in as admin or agent, show Admin Panel */}
      {isLoggedIn && user && (user.role === 'admin' || user.role === 'agent') ? (
        <AdminPanel
          onExit={handleLogout}
          role={user.role}
        />
      ) : (
        /* Standard User Interface */
        !isLoggedIn ? (
          <LandingPage onLogin={handleLogin} isLoggedIn={isLoggedIn} />
        ) : (
          <div className="dashboard-layout">
            <DashboardHeader
              username={user?.username || 'Guest'}
              balance={user?.balance ?? null}
              pendingBalance={user?.pendingBalance ?? null}
              availableBalance={user?.availableBalance ?? user?.balance ?? null}
              role={user?.role} // Pass role
              unlimitedBalance={user?.unlimitedBalance} // Pass unlimitedBalance
              onLogout={handleLogout}
              onViewChange={handleViewChange}
              activeBetMode={betMode}
              onBetModeChange={setBetMode}
              currentView={dashboardView}
              onToggleSidebar={() => setMobileSidebarOpen(!mobileSidebarOpen)}
              selectedSports={selectedSports}
              onContinue={handleContinue}
              isMobileSportsSelectionMode={isMobileSportsSelectionMode}
              onHomeClick={handleHomeClick}
            />

            <div className={`dashboard-content-area ${isMobileSportsSelectionMode ? 'mobile-sports-mode' : ''}`} style={{ position: 'relative', marginTop: '0' }}>
              {mobileSidebarOpen && (
                <MobileGridMenu
                  onClose={() => setMobileSidebarOpen(false)}
                  onViewChange={handleViewChange}
                />
              )}

              {dashboardView === 'dashboard' && (
                <>
                  {isMobileViewport && isMobileSportsSelectionMode ? (
                    // Mobile: Show only sidebar for sports selection
                    <DashboardSidebar
                      selectedSports={selectedSports}
                      onToggleSport={handleSportToggle}
                      betMode={betMode}
                      isOpen={true}
                      onCloseSidebar={() => setMobileSidebarOpen(false)}
                      isMobileSportsSelectionMode={isMobileSportsSelectionMode}
                    />
                  ) : isMobileViewport && selectedSports && selectedSports.length > 0 ? (
                    // Mobile: Show content after Continue
                    <MobileContentView selectedSports={selectedSports} />
                  ) : (
                    // Desktop or default view
                    <>
                      <DashboardSidebar
                        selectedSports={selectedSports}
                        onToggleSport={handleSportToggle}
                        betMode={betMode}
                        isOpen={mobileSidebarOpen}
                        onCloseSidebar={() => setMobileSidebarOpen(false)}
                        isMobileSportsSelectionMode={isMobileSportsSelectionMode}
                      />
                      <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
                        {showPromo && <PromoCard />}
                        <div style={{ flex: 1 }}>
                          <DashboardMain selectedSports={selectedSports} />
                        </div>
                      </div>
                    </>
                  )}
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

              {dashboardView === 'tutorials' && <TutorialsView />}

              {dashboardView === 'support' && <SupportView />}

              {dashboardView === 'my-bets' && <MyBetsView />}
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
          </div>
        ))}
    </div>
  );
}

export default App;
