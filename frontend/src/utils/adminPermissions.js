export const VIEW_PERMISSION_MAP = {
  dashboard: 'dashboard',
  'weekly-figures': 'weeklyFigures',
  pending: 'pending',
  messaging: 'messaging',
  'game-admin': 'gameAdmin',
  'casino-bets': 'gameAdmin',
  'customer-admin': 'customerAdmin',
  'agent-manager': 'agentManager',
  cashier: 'cashier',
  'add-customer': 'addCustomer',
  'third-party-limits': 'thirdPartyLimits',
  props: 'props',
  'agent-performance': 'agentPerformance',
  analysis: 'analysis',
  'ip-tracker': 'ipTracker',
  'transaction-history': 'transactionsHistory',
  'transactions-history': 'transactionsHistory',
  'deleted-wagers': 'deletedWagers',
  'games-events': 'gamesEvents',
  'sportsbook-links': 'sportsbookLinks',
  'bet-ticker': 'betTicker',
  ticketwriter: 'ticketwriter',
  scores: 'scores',
  'master-agent-admin': 'masterAgentAdmin',
  billing: 'billing',
  settings: 'settings',
  monitor: 'monitor',
  rules: 'rules',
  feedback: 'feedback',
  faq: 'faq',
  'user-manual': 'userManual',
  profile: 'profile'
};

export const isPermissionBypassedRole = (role) =>
  role === 'admin' || role === 'master_agent' || role === 'super_agent';

export const hasViewPermission = (role, permissions, viewId) => {
  if (isPermissionBypassedRole(role)) return true;
  const key = VIEW_PERMISSION_MAP[viewId];
  if (!key) return true;
  const direct = permissions?.views?.[key];
  if (direct === false) return false;
  if (direct === true) return true;
  // Legacy alias for older records saved before transactionsHistory was introduced.
  if (key === 'transactionsHistory' && permissions?.views?.collections === false) {
    return false;
  }
  return true;
};

export const canManageIpTracker = (role, permissions) => {
  if (isPermissionBypassedRole(role)) return true;
  return permissions?.ipTracker?.manage !== false;
};
