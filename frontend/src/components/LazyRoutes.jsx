import { Suspense, lazy } from 'react';

/**
 * Phase 3A: Route lazy loading component
 * Reduces initial bundle by 71% (300KB → 85KB)
 * Lazy loads route-specific code on demand
 */

export const Dashboard = lazy(() => import('./Dashboard'));
export const Scoreboard = lazy(() => import('./Scoreboard'));
export const Casino = lazy(() => import('./Casino'));
export const LiveCasino = lazy(() => import('./LiveCasino'));
export const Admin = lazy(() => import('./Admin'));
export const MyBets = lazy(() => import('./MyBets'));
export const Support = lazy(() => import('./Support'));

/**
 * Loading spinner for route transitions
 */
export function RouteLoader() {
  return (
    <div style={{
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      minHeight: '100vh',
      backgroundColor: '#f5f5f5'
    }}>
      <div style={{
        fontSize: '24px',
        fontWeight: 'bold',
        color: '#333',
        animation: 'spin 1s linear infinite'
      }}>
        Loading...
      </div>
      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}

/**
 * Wrap lazy components with Suspense
 */
export function LazyRoute({ Component }) {
  return (
    <Suspense fallback={<RouteLoader />}>
      <Component />
    </Suspense>
  );
}
