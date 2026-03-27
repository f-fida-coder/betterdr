import React, { useEffect, useMemo, useState } from 'react';
import {
  createAgent,
  createPlayerByAgent,
  createSubAgent,
  getAgentTree,
  createUserByAdmin,
  getAgents,
  getMe,
  getMyPlayers,
  getNextUsername,
  getUsersAdmin,
  importUsersSpreadsheet
} from '../../api';
import { formatUsPhone, generateIdentityPassword, normalizeIdentityName } from '../../utils/identityPassword';

const derivePlayerPrefix = (value) => {
  const normalized = String(value || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
  if (!normalized) return '';
  const alphaLead = normalized.match(/^[A-Z]+/);
  if (alphaLead && alphaLead[0]) {
    return alphaLead[0];
  }
  const withoutTrailingDigits = normalized.replace(/\d+$/, '');
  return withoutTrailingDigits || normalized;
};
const buildPlayerFreeplayCopy = (grantStartingFreeplay) => (
  grantStartingFreeplay
    ? `FREEPLAY
This account starts with $200 in freeplay. In order to collect your winnings you have to place $500 of bets with your own money. When you place a bet you have to click "Use your freeplay balance $". Freeplay is limited to straight bets only and no parlays.`
    : `FREEPLAY
This account starts with $0 in freeplay. If freeplay is added later, you must click "Use your freeplay balance $" when placing a bet. Freeplay is limited to straight bets only and no parlays.`
);
const MANAGER_ROLES = new Set(['admin', 'agent', 'master_agent', 'super_agent']);
const isPlayerLikeCustomer = (customer) => !MANAGER_ROLES.has(String(customer?.role || '').trim().toLowerCase());

const normalizeAgentRole = (value) => String(value || '').trim().toLowerCase();
const normalizeHierarchyId = (value) => String(value || '').trim();
const MANAGER_TREE_ROLES = new Set(['admin', 'agent', 'master_agent', 'super_agent']);
const isManagerTreeNode = (node) => {
  const nodeType = String(node?.nodeType || '').trim().toLowerCase();
  if (nodeType === 'player') return false;
  return MANAGER_TREE_ROLES.has(normalizeAgentRole(node?.role));
};
const isMasterTreeNode = (node) => {
  const role = normalizeAgentRole(node?.role);
  return role === 'master_agent' || role === 'super_agent';
};
const isRegularAgentTreeNode = (node) => normalizeAgentRole(node?.role) === 'agent';
const pruneAssignmentTree = (node) => {
  if (!isManagerTreeNode(node)) return null;

  const children = Array.isArray(node.children)
    ? node.children.map((child) => pruneAssignmentTree(child)).filter(Boolean)
    : [];

  return {
    ...node,
    id: normalizeHierarchyId(node.id),
    children,
  };
};
const findAssignmentTreeNode = (node, targetId) => {
  const normalizedTargetId = normalizeHierarchyId(targetId);
  if (!normalizedTargetId || !node) return null;

  if (normalizeHierarchyId(node.id) === normalizedTargetId) {
    return node;
  }

  const children = Array.isArray(node.children) ? node.children : [];
  for (const child of children) {
    const match = findAssignmentTreeNode(child, normalizedTargetId);
    if (match) {
      return match;
    }
  }

  return null;
};
const findAssignmentTreePath = (node, targetId) => {
  const normalizedTargetId = normalizeHierarchyId(targetId);
  if (!normalizedTargetId || !node) return [];

  const nodeId = normalizeHierarchyId(node.id);
  if (nodeId === normalizedTargetId) {
    return [nodeId];
  }

  const children = Array.isArray(node.children) ? node.children : [];
  for (const child of children) {
    const childPath = findAssignmentTreePath(child, normalizedTargetId);
    if (childPath.length > 0) {
      return [nodeId, ...childPath];
    }
  }

  return [];
};
const flattenAssignmentTree = (node, predicate, includeRoot = true, depth = 0, acc = []) => {
  if (!node) return acc;

  if ((includeRoot || depth > 0) && predicate(node, depth)) {
    acc.push(node);
  }

  const children = Array.isArray(node.children) ? node.children : [];
  children.forEach((child) => flattenAssignmentTree(child, predicate, true, depth + 1, acc));
  return acc;
};
const assignmentRoleLabel = (node) => {
  const role = normalizeAgentRole(node?.role);
  if (role === 'master_agent') return 'MASTER';
  if (role === 'super_agent') return 'SUPER';
  if (role === 'agent') return 'AGENT';
  if (role === 'admin') return 'ADMIN';
  return role ? role.replace(/_/g, ' ').toUpperCase() : 'ACCOUNT';
};
const assignmentRoleClass = (node) => normalizeAgentRole(node?.role).replace(/_/g, '-') || 'account';
const assignmentSearchText = (node) => {
  const username = String(node?.username || '').toLowerCase();
  const role = normalizeAgentRole(node?.role);
  const roleText = role.replace(/_/g, ' ');
  return `${username} ${roleText}`.trim();
};
const assignmentBranchMatchesQuery = (node, rawQuery) => {
  const query = String(rawQuery || '').trim().toLowerCase();
  if (!query) return true;
  if (assignmentSearchText(node).includes(query)) return true;
  return (Array.isArray(node?.children) ? node.children : []).some((child) => assignmentBranchMatchesQuery(child, query));
};

function AssignmentHierarchyPicker({
  rootNode,
  loading = false,
  error = '',
  searchQuery = '',
  onSearchQueryChange,
  expandedNodes,
  onToggleNode,
  onSelectNode,
  onSelectDirect,
  selectedNodeId = '',
  directSelected = false,
  selectionMode = 'player',
  searchPlaceholder = 'Search accounts...',
  emptyLabel = 'No matching accounts',
}) {
  const normalizedQuery = String(searchQuery || '').trim().toLowerCase();
  const shouldShowResults = normalizedQuery !== '' || loading || error;

  const renderNode = (node, depth = 0, isRoot = false) => {
    if (!node || !isManagerTreeNode(node)) return null;
    if (selectionMode === 'master' && !isRoot && !isMasterTreeNode(node)) return null;
    if (normalizedQuery && !assignmentBranchMatchesQuery(node, normalizedQuery)) {
      return null;
    }

    // In player mode, skip master agent / admin nodes but render their agent children flat
    if (selectionMode === 'player' && !isRegularAgentTreeNode(node)) {
      const allChildren = (Array.isArray(node.children) ? node.children : []).filter(isManagerTreeNode);
      const childRendered = allChildren.map((child) => renderNode(child, depth, false));
      return childRendered.some(Boolean) ? <>{childRendered}</> : null;
    }

    const nodeId = normalizeHierarchyId(node.id);
    const managerChildren = (Array.isArray(node.children) ? node.children : [])
      .filter((c) => isManagerTreeNode(c) && (selectionMode !== 'master' || isMasterTreeNode(c)));
    const canExpand = managerChildren.length > 0 && (isRoot || isMasterTreeNode(node));
    const isExpanded = normalizedQuery ? true : expandedNodes.has(nodeId);
    const isSelectable = selectionMode === 'player'
      ? isRegularAgentTreeNode(node)
      : (isRoot ? typeof onSelectDirect === 'function' : isMasterTreeNode(node));
    const isSelected = isRoot
      ? directSelected
      : (selectedNodeId !== '' && selectedNodeId === nodeId);

    return (
      <div key={`${nodeId || 'root'}-${depth}`} className="assignment-tree-branch">
        <div
          className={`tree-node ${isRoot ? 'root-node' : ''} assignment-tree-row ${isSelected ? 'selected' : ''} ${isSelectable ? 'selectable' : ''}`}
          style={isRoot ? undefined : { paddingLeft: `${16 + depth * 20}px` }}
        >
          <button
            type="button"
            className={`assignment-tree-toggle-btn ${canExpand ? '' : 'is-spacer'}`}
            onClick={() => {
              if (canExpand) {
                onToggleNode?.(nodeId);
              }
            }}
            aria-label={canExpand ? (isExpanded ? 'Collapse branch' : 'Expand branch') : 'No child accounts'}
            disabled={!canExpand}
          >
            {canExpand ? (isExpanded ? '−' : '+') : ''}
          </button>
          <button
            type="button"
            className="assignment-tree-node-btn"
            onClick={() => {
              if (isSelectable) {
                if (isRoot && typeof onSelectDirect === 'function') {
                  onSelectDirect(node);
                  return;
                }
                onSelectNode?.(node);
                return;
              }
              if (canExpand) {
                onToggleNode?.(nodeId);
              }
            }}
          >
            <span className="node-name">{String(node.username || '').toUpperCase()}</span>
            <span className={`node-role-badge role-${assignmentRoleClass(node)}`}>
              {assignmentRoleLabel(node)}
            </span>
          </button>
        </div>
        {canExpand && isExpanded && managerChildren.length > 0 && (
          <div className="node-children assignment-tree-children">
            {managerChildren.map((child) => renderNode(child, depth + 1, false))}
          </div>
        )}
      </div>
    );
  };

  const hasVisibleTree = Boolean(rootNode) && assignmentBranchMatchesQuery(rootNode, normalizedQuery);

  return (
    <div className="assignment-tree-picker">
      <div className="search-pill assignment-tree-search-pill">
        <span className="pill-label">Tree</span>
        <input
          type="text"
          placeholder={searchPlaceholder}
          value={searchQuery}
          onChange={(event) => onSearchQueryChange?.(event.target.value)}
        />
      </div>

      {shouldShowResults && (
        <div className="assignment-tree-results-dropdown">
          <div className="tree-scroll-area assignment-tree-scroll-area">
            {loading ? (
              <div className="tree-loading">Loading hierarchy...</div>
            ) : error ? (
              <div className="tree-error">{error}</div>
            ) : hasVisibleTree ? (
              renderNode(rootNode, 0, true)
            ) : (
              <div className="tree-loading">{emptyLabel}</div>
            )}
          </div>
        </div>
      )}

      <style>{`
        .assignment-tree-picker {
          position: relative;
          min-width: 0;
          z-index: 20;
        }

        .assignment-tree-picker:focus-within {
          z-index: 160;
        }

        .assignment-tree-search-pill {
          min-height: 48px;
          border-radius: 12px;
          background: #ffffff;
          border-color: #d7dee8;
          box-shadow: 0 1px 2px rgba(15, 23, 42, 0.04);
        }

        .assignment-tree-search-pill .pill-label {
          display: inline-flex;
          align-items: center;
          padding: 0 16px;
          background: #f3f6fb;
          font-size: 14px;
        }

        .assignment-tree-search-pill input {
          min-height: 46px;
          padding: 0 14px;
          font-size: 14px;
        }

        .assignment-tree-results-dropdown {
          position: absolute;
          top: calc(100% + 8px);
          left: 0;
          right: 0;
          border: 1px solid #dbe4ee;
          border-radius: 14px;
          background: #ffffff;
          box-shadow: 0 18px 34px rgba(15, 23, 42, 0.16);
          overflow: hidden;
        }

        .assignment-tree-scroll-area {
          max-height: 300px;
          min-height: 0;
          padding: 8px 0 10px;
          background: transparent;
          border-top: none;
        }

        .assignment-tree-row {
          gap: 8px;
          min-height: 42px;
          transition: background 0.2s ease;
        }

        .assignment-tree-row:hover {
          background: #f8fbff;
        }

        .assignment-tree-row.selected {
          background: linear-gradient(90deg, rgba(191, 219, 254, 0.78), rgba(239, 246, 255, 0.9));
        }

        .assignment-tree-row.selectable .assignment-tree-node-btn {
          cursor: pointer;
        }

        .assignment-tree-toggle-btn {
          width: 22px;
          height: 22px;
          border: none;
          background: transparent;
          color: #475569;
          font-size: 24px;
          line-height: 1;
          padding: 0;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          flex: 0 0 22px;
        }

        .assignment-tree-toggle-btn:disabled {
          cursor: default;
        }

        .assignment-tree-toggle-btn.is-spacer {
          visibility: hidden;
        }

        .assignment-tree-node-btn {
          flex: 1;
          min-width: 0;
          border: none;
          background: transparent;
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 0;
          text-align: left;
        }

        .assignment-tree-node-btn .node-name {
          flex: 1;
          min-width: 0;
          font-weight: 600;
        }

        .assignment-tree-children {
          margin-left: 18px;
        }
      `}</style>
    </div>
  );
}

const buildCopyInfo = (creationType, customer) => {
  const pass = customer.password || 'N/A';

  if (creationType === 'player') {
    return `Here’s your account info. PLEASE READ ALL RULES THOROUGHLY.

Login: ${customer.username}
Password: ${pass}
Min bet: $${customer.minBet || 25}
Max bet: $${customer.maxBet || 200}
Credit: $${customer.creditLimit || 1000}


PAYOUTS
PAY-INS are Tuesday and PAY-OUTS are Tuesday/Wednesday by end of day. Week starts Tuesday and ends Monday night. Settle up’s are +/-$200 so anything under $200 will push to the following week. You must bet $500 of your own money to collect your FIRST payout. If your account is inactive for 2 weeks you’ll be required to settle your balance even if it’s under $200. Max weekly payouts are 2-3x your credit limit depending on size. Balance will still be paid out but will roll to the following week.

All we ask for is communication when it comes to payouts so we can get everyone paid quickly and as smoothly as possible. If you can’t pay right away let us know and we can set up a payment schedule. We accept Venmo, Cashapp and Apple Pay. You are REQUIRED to have multiple apps to send or receive payment on. PLEASE DO NOT SEND MONEY without asking where to send first and DO NOT LABEL anything to do with sports or gambling. We will let you know Tuesday where to send. 

We kick back 20% freeplay of all losses if you pay ON TIME and in FULL and 30% if you pay in CASH. If you are a hassle to collect from and don’t respond or don’t pay on time or in full then you will be shown the same reciprocation when it comes to payouts. 

REFFERALS
$200 freeplay bonuses for any ACTIVE and TRUSTWORTHY referrals. YOU are responsible for your referrals debt if they DO NOT PAY and vice versa. Once your referral makes their first deposit, your $200 freeplay bonus is added automatically.

RULES
NO BOTS OR SHARP PLAY. We have IT monitoring to make sure there is no cheating. If we find out you are using a VPN and there are multiple people using your IP address or someone is logging into the same account, or you are using a system to place bets for you, you will be automatically kicked off and we reserve the right to not pay. No excuses. We’ve heard them all so don’t waste your time. 

${buildPlayerFreeplayCopy(Boolean(customer.grantStartingFreeplay))}

I need active players so if you could do me a solid and place a bet today even if it’s with freeplay. Good luck! Lmk that you’ve read all the rules and or if you have any questions and need me to adjust anything!
`;
  }

  const typeLabel = creationType === 'agent' ? 'Agent' : 'Master Agent';
  const limitsBlock = creationType === 'agent'
    ? `
Standard Min bet: $${customer.defaultMinBet || 25}
Standard Max bet: $${customer.defaultMaxBet || 200}
Standard Credit: $${customer.defaultCreditLimit || 1000}
`
    : '';

  return `Welcome to the team! Here’s your ${typeLabel} administrative account info.

Login: ${customer.username}
Password: ${pass}
${limitsBlock}
Please ensure you manage your sectors responsibly and maintain clear communication with your assigned accounts. Good luck!
`;
};

function CustomerCreationWorkspace({ initialType = 'player' }) {
  const withTimeout = (promise, timeoutMs, message) => {
    let timeoutId;
    const timeoutPromise = new Promise((_, reject) => {
      timeoutId = setTimeout(() => reject(new Error(message)), Math.max(1000, timeoutMs));
    });
    return Promise.race([promise, timeoutPromise]).finally(() => clearTimeout(timeoutId));
  };

  const [customers, setCustomers] = useState([]);
  const [agents, setAgents] = useState([]);
  const [loadingContext, setLoadingContext] = useState(true);
  const [error, setError] = useState('');
  const [duplicateWarning, setDuplicateWarning] = useState(null);
  const [createLoading, setCreateLoading] = useState(false);
  const [importLoading, setImportLoading] = useState(false);
  const [importFile, setImportFile] = useState(null);
  const [selectedImportFileName, setSelectedImportFileName] = useState('');
  const [importSummary, setImportSummary] = useState('');
  const [importedUsernames, setImportedUsernames] = useState([]);
  const [importForceAgentAssignment, setImportForceAgentAssignment] = useState(true);
  const [importAgentId, setImportAgentId] = useState('');
  const [importErrors, setImportErrors] = useState([]);
  const [newCustomer, setNewCustomer] = useState({
    username: '',
    phoneNumber: '',
    password: '',
    firstName: '',
    lastName: '',
    fullName: '',
    agentId: '',
    referredByUserId: '',
    grantStartingFreeplay: true,
    balance: '',
    minBet: '25',
    maxBet: '200',
    creditLimit: '1000',
    balanceOwed: '200',
    defaultMinBet: '25',
    defaultMaxBet: '200',
    defaultCreditLimit: '1000',
    defaultSettleLimit: '200',
    agentPrefix: '',
    parentAgentId: '',
    agentPercent: '',
    playerRate: ''
  });
  const [newApps, setNewApps] = useState({ venmo: '', cashapp: '', applePay: '', zelle: '', paypal: '', btc: '', other: '' });
  const [hiringAgentPercent, setHiringAgentPercent] = useState('');
  const [subAgentPercent, setSubAgentPercent] = useState('');
  const [extraSubAgents, setExtraSubAgents] = useState([]);
  const [prefixError, setPrefixError] = useState('');
  const [creationType, setCreationType] = useState(initialType || 'player');
  const [currentRole, setCurrentRole] = useState('admin');
  const [viewOnly, setViewOnly] = useState(false);
  const [agentSearchQuery, setAgentSearchQuery] = useState('');
  const [referralSearchQuery, setReferralSearchQuery] = useState('');
  const [referralSearchOpen, setReferralSearchOpen] = useState(false);
  const [adminUsername, setAdminUsername] = useState('');
  const [currentUserId, setCurrentUserId] = useState('');
  const [assignmentTreeRoot, setAssignmentTreeRoot] = useState(null);
  const [assignmentTreeLoading, setAssignmentTreeLoading] = useState(false);
  const [assignmentTreeError, setAssignmentTreeError] = useState('');
  const [assignmentExpandedNodes, setAssignmentExpandedNodes] = useState(() => new Set());

  const loadAssignmentTree = async (token, role) => {
    const normalizedRole = normalizeAgentRole(role);
    if (normalizedRole === 'agent') {
      setAssignmentTreeRoot(null);
      setAssignmentTreeError('');
      setAssignmentExpandedNodes(new Set());
      setAssignmentTreeLoading(false);
      return null;
    }

    try {
      setAssignmentTreeLoading(true);
      const payload = await getAgentTree(token);
      const rootNode = payload?.root
        ? pruneAssignmentTree({
          ...payload.root,
          children: Array.isArray(payload.tree) ? payload.tree : [],
        })
        : null;

      setAssignmentTreeRoot(rootNode);
      setAssignmentTreeError('');
      setAssignmentExpandedNodes(new Set());
      return rootNode;
    } catch (treeError) {
      console.error('Failed to load assignment hierarchy:', treeError);
      setAssignmentTreeRoot(null);
      setAssignmentTreeError(treeError?.message || 'Failed to load hierarchy');
      setAssignmentExpandedNodes(new Set());
      return null;
    } finally {
      setAssignmentTreeLoading(false);
    }
  };

  useEffect(() => {
    const fetchContext = async () => {
      try {
        setLoadingContext(true);
        const token = localStorage.getItem('token') || sessionStorage.getItem('token');
        if (!token) {
          setCustomers([]);
          setAgents([]);
          setAssignmentTreeRoot(null);
          setAssignmentTreeError('');
          setAssignmentExpandedNodes(new Set());
          setError('Please login to load users.');
          return;
        }

        const storedRole = String(localStorage.getItem('userRole') || '').toLowerCase();
        let me = null;

        try {
          me = await getMe(token, { timeoutMs: 30000 });
        } catch (meError) {
          console.warn('CustomerCreationWorkspace: getMe failed, falling back to stored role.', meError);
        }

        const resolvedRole = String(me?.role || storedRole || 'admin').toLowerCase();
        setCurrentRole(resolvedRole);
        setAdminUsername(me?.username || '');
        setCurrentUserId(me?.id || '');
        setViewOnly(Boolean(me?.viewOnly));

        if (resolvedRole === 'agent') {
          const data = await getMyPlayers(token);
          setCustomers(data || []);
          setAgents([]);
          await loadAssignmentTree(token, resolvedRole);
        } else {
          const [usersData, agentsData] = await Promise.all([
            getUsersAdmin(token),
            getAgents(token)
          ]);
          setCustomers(usersData || []);
          setAgents(agentsData || []);
          await loadAssignmentTree(token, resolvedRole);
        }
        setError('');

        if (me?.username) {
          try {
            const playerPrefix = derivePlayerPrefix(me.username);
            if (!playerPrefix) return;
            const { nextUsername } = await getNextUsername(playerPrefix, token, { type: 'player' });
            setNewCustomer((prev) => ({ ...prev, username: nextUsername }));
          } catch (usernameErr) {
            console.error('Failed to prefetch next username:', usernameErr);
          }
        }
      } catch (err) {
        console.error('Error fetching add-customer context:', err);
        setError('Failed to load users: ' + err.message);
      } finally {
        setLoadingContext(false);
      }
    };

    fetchContext();
  }, []);

  useEffect(() => {
    if (!initialType || initialType === creationType) return;
    const run = async () => {
      await handleCreationTypeChange(initialType);
    };
    run();
  }, [initialType]);

  const handleCreateCustomer = async () => {
    try {
      setCreateLoading(true);
      setDuplicateWarning(null);
      setError('');
      const token = localStorage.getItem('token') || sessionStorage.getItem('token');
      if (!token) {
        setError('Please login to create users.');
        return;
      }
      const requiredIdentityMissing =
        !String(newCustomer.username || '').trim() ||
        !String(newCustomer.firstName || '').trim() ||
        !String(newCustomer.lastName || '').trim() ||
        !String(newCustomer.phoneNumber || '').trim() ||
        !String(newCustomer.password || '').trim();

      if (requiredIdentityMissing) {
        setError('Username, first name, last name, phone number, and password are required.');
        return;
      }

      if (creationType === 'player') {
        const requiredLimitsMissing =
          String(newCustomer.minBet ?? '').trim() === '' ||
          String(newCustomer.maxBet ?? '').trim() === '' ||
          String(newCustomer.creditLimit ?? '').trim() === '' ||
          String(newCustomer.balanceOwed ?? '').trim() === '';
        if (requiredLimitsMissing) {
          setError('Min bet, max bet, credit limit, and settle limit are required for players.');
          return;
        }
        if (currentRole !== 'agent' && !String(newCustomer.agentId || '').trim()) {
          setError('Please assign this player to a regular Agent.');
          return;
        }
      }

      const payload = { ...newCustomer, apps: newApps };
      if (payload.balance === '') delete payload.balance;
      if (creationType !== 'player') {
        delete payload.referredByUserId;
        delete payload.grantStartingFreeplay;
        delete payload.minBet;
        delete payload.maxBet;
        delete payload.creditLimit;
        delete payload.balanceOwed;
        if (creationType === 'super_agent') {
          delete payload.defaultMinBet;
          delete payload.defaultMaxBet;
          delete payload.defaultCreditLimit;
          delete payload.defaultSettleLimit;
        }
      } else if (!payload.referredByUserId) {
        delete payload.referredByUserId;
      }
      if ((creationType === 'agent' || creationType === 'super_agent') && payload.agentId) {
        payload.parentAgentId = payload.agentId;
      }

      // Include commission split fields for agent/super_agent creation
      if (creationType === 'agent' || creationType === 'super_agent') {
        if (payload.agentPercent !== '') payload.agentPercent = parseFloat(payload.agentPercent);
        else delete payload.agentPercent;
        if (payload.playerRate !== '') payload.playerRate = parseFloat(payload.playerRate);
        else delete payload.playerRate;
        if (hiringAgentPercent !== '') payload.hiringAgentPercent = parseFloat(hiringAgentPercent);
        if (subAgentPercent !== '') payload.subAgentPercent = parseFloat(subAgentPercent);
        if (extraSubAgents.length > 0) {
          payload.extraSubAgents = extraSubAgents
            .filter((sa) => sa.name.trim() !== '' || sa.percent !== '')
            .map((sa) => ({ name: sa.name.trim(), percent: parseFloat(sa.percent) || 0 }));
        }
      } else {
        delete payload.agentPercent;
        delete payload.playerRate;
      }

      let result = null;
      if (creationType === 'player') {
        if (currentRole === 'agent' || currentRole === 'super_agent' || currentRole === 'master_agent') {
          result = await createPlayerByAgent(payload, token);
        } else {
          result = await createUserByAdmin(payload, token);
        }
      } else if (creationType === 'agent') {
        if (currentRole === 'admin') {
          result = await createAgent({ ...payload, role: 'agent' }, token);
        } else {
          result = await createSubAgent({ ...payload, role: 'agent' }, token);
        }
      } else if (creationType === 'super_agent') {
        if (currentRole === 'admin') {
          result = await createAgent({ ...payload, role: 'master_agent' }, token);
        } else {
          result = await createSubAgent({ ...payload, role: 'master_agent' }, token);
        }
      }

      const createdType = creationType;
      setError('');
      setDuplicateWarning(null);
      setImportSummary('');
      setImportedUsernames([]);

      setNewApps({ venmo: '', cashapp: '', applePay: '', zelle: '', paypal: '', btc: '', other: '' });
      const cleanState = {
        username: '',
        phoneNumber: '',
        password: '',
        firstName: '',
        lastName: '',
        fullName: '',
        agentId: '',
        referredByUserId: '',
        grantStartingFreeplay: true,
        balance: '',
        minBet: '',
        maxBet: '',
        creditLimit: '',
        balanceOwed: '',
        defaultMinBet: '',
        defaultMaxBet: '',
        defaultCreditLimit: '',
        defaultSettleLimit: '',
        agentPrefix: '',
        parentAgentId: '',
        agentPercent: '',
        playerRate: ''
      };

      setNewCustomer(cleanState);
      setCreationType(createdType);
      setAgentSearchQuery('');
      setHiringAgentPercent('');
      setSubAgentPercent('');
      setExtraSubAgents([]);
      setReferralSearchOpen(false);
      setImportFile(null);
      setSelectedImportFileName('');
      setImportAgentId('');
      setImportErrors([]);
      setImportForceAgentAssignment(true);
      const createdLabel = createdType === 'player' ? 'Player' : createdType === 'agent' ? 'Agent' : 'Master Agent';
      setImportSummary(result?.assigned ? `${createdLabel} assigned successfully.` : `${createdLabel} created successfully.`);

      if (currentRole === 'agent') {
        const data = await getMyPlayers(token);
        setCustomers(data || []);
      } else {
        const [usersData, agentsData] = await Promise.all([
          getUsersAdmin(token),
          getAgents(token)
        ]);
        setCustomers(usersData || []);
        setAgents(agentsData || []);
        await loadAssignmentTree(token, currentRole);
      }
    } catch (err) {
      console.error('Create user failed:', err);
      const duplicateMatches = Array.isArray(err?.duplicateMatches)
        ? err.duplicateMatches
        : (Array.isArray(err?.details?.matches) ? err.details.matches : []);
      const isDuplicateError = err?.isDuplicate === true
        || err?.duplicate === true
        || err?.code === 'DUPLICATE_PLAYER'
        || err?.details?.duplicate === true;
      if (isDuplicateError) {
        setDuplicateWarning({
          message: err?.message || 'Likely duplicate player detected.',
          matches: duplicateMatches,
        });
      } else {
        setDuplicateWarning(null);
      }
      setError(err.message || 'Failed to create user');
    } finally {
      setCreateLoading(false);
    }
  };

  const handleImportCustomers = async () => {
    try {
      setImportLoading(true);
      setError('');
      setImportSummary('');
      setImportedUsernames([]);
      setImportErrors([]);

      const token = localStorage.getItem('token') || sessionStorage.getItem('token');
      if (!token) {
        setError('Please login to import users.');
        return;
      }
      if (!importFile) {
        setError('Please choose an Excel/CSV file first.');
        return;
      }
      if (importForceAgentAssignment && (currentRole === 'admin' || currentRole === 'master_agent' || currentRole === 'super_agent') && !importAgentId) {
        setError('Select an agent to assign imported players to, or uncheck the assignment option.');
        return;
      }

      const result = await withTimeout(
        importUsersSpreadsheet(importFile, token, {
          defaultAgentId: importAgentId || '',
          timeoutMs: 45000,
          forceAgentAssignment: importForceAgentAssignment
        }),
        50000,
        'Import request timed out. Please try again.'
      );

      const createdRowsCount = Array.isArray(result?.createdRows) ? result.createdRows.length : 0;
      const createdFromPayload = Number(result?.created);
      const failedFromPayload = Number(result?.failed);
      const created = Number.isFinite(createdFromPayload) ? createdFromPayload : createdRowsCount;
      const failed = Number.isFinite(failedFromPayload) ? failedFromPayload : 0;
      const serverMessage = String(result?.message || '').trim();

      if (!Number.isFinite(createdFromPayload) && !Number.isFinite(failedFromPayload)) {
        setImportSummary(serverMessage || `Import complete: ${created} created, ${failed} failed.`);
      } else {
        setImportSummary(`Import complete: ${created} created, ${failed} failed.${serverMessage ? ` ${serverMessage}` : ''}`);
      }

      const createdUsernames = Array.isArray(result?.createdRows)
        ? result.createdRows
          .map((row) => String(row?.username || '').toUpperCase())
          .filter(Boolean)
        : [];
      setImportedUsernames(createdUsernames);
      setImportErrors(Array.isArray(result?.errors) ? result.errors : []);
      setImportFile(null);
      setSelectedImportFileName('');
      setImportAgentId('');

      try {
        if (currentRole === 'agent') {
          const data = await withTimeout(getMyPlayers(token), 15000, 'Players refresh timed out');
          setCustomers(data || []);
        } else {
          const [usersData, agentsData] = await Promise.all([
            withTimeout(getUsersAdmin(token), 15000, 'Users refresh timed out'),
            withTimeout(getAgents(token), 15000, 'Agents refresh timed out')
          ]);
          setCustomers(usersData || []);
          setAgents(agentsData || []);
        }
      } catch (refreshErr) {
        console.warn('Post-import refresh failed:', refreshErr);
        setImportSummary((prev) => `${prev} Imported, but refresh failed: ${refreshErr.message || 'please reload page.'}`);
      }
    } catch (err) {
      console.error('Import users failed:', err);
      setError(err.message || 'Failed to import users');
    } finally {
      setImportLoading(false);
    }
  };

  const handlePrefixChange = async (prefix) => {
    const formatted = prefix.toUpperCase().replace(/[^A-Z0-9]/g, '');
    setNewCustomer((prev) => ({ ...prev, agentPrefix: formatted }));
    setPrefixError('');

    if (formatted.length >= 2) {
      const isMasterCreation = creationType === 'super_agent';
      const taken = agents.some((a) => {
        const r = String(a.role || '').toLowerCase();
        const isMasterAgent = r === 'master_agent' || r === 'super_agent';
        if (isMasterCreation !== isMasterAgent) return false;
        const uname = String(a.username || '').toUpperCase().replace(/MA$/, '').replace(/\d+$/, '');
        return uname === formatted;
      });
      if (taken) {
        setPrefixError(`Prefix "${formatted}" is already taken`);
        return;
      }
      const token = localStorage.getItem('token') || sessionStorage.getItem('token');
      const suffix = creationType === 'super_agent' ? 'MA' : '';
      const usernameScopeAgentId = (
        creationType === 'agent'
          ? (newCustomer.agentId || ((currentRole === 'master_agent' || currentRole === 'super_agent') ? currentUserId : ''))
          : ''
      );
      try {
        const query = { suffix, type: 'agent' };
        if (usernameScopeAgentId) {
          query.agentId = usernameScopeAgentId;
        }
        const { nextUsername } = await getNextUsername(formatted, token, query);
        setNewCustomer((prev) => ({ ...prev, username: nextUsername }));
      } catch (err) {
        console.error('Failed to get next username from prefix:', err);
      }
    } else {
      setNewCustomer((prev) => ({ ...prev, username: '' }));
    }
  };

  const handleAgentChange = async (agentId, selectedAgentOverride = null) => {
    const token = localStorage.getItem('token') || sessionStorage.getItem('token');
    if (!token) return;

    setNewCustomer((prev) => ({ ...prev, agentId, referredByUserId: '' }));
    setAgentSearchQuery('');
    const sequenceType = creationType === 'player' ? 'player' : 'agent';
    const suffix = creationType === 'super_agent' ? 'MA' : '';
    // For agent/super_agent creation the user types their own prefix — never overwrite it
    const isAgentCreation = creationType === 'agent' || creationType === 'super_agent';

    if (agentId) {
      const selectedAgent = selectedAgentOverride || agents.find((a) => a.id === agentId);
      if (selectedAgent) {
        try {
          // Use the user's typed prefix for agent creation; derive from selected agent for player creation
          const playerPrefix = (isAgentCreation && newCustomer.agentPrefix)
            ? newCustomer.agentPrefix
            : derivePlayerPrefix(selectedAgent.username);
          if (!playerPrefix) {
            setNewCustomer((prev) => ({ ...prev, username: '' }));
            return;
          }
          const query = sequenceType === 'player'
            ? { suffix, type: sequenceType, agentId }
            : { suffix, type: sequenceType, ...(creationType === 'agent' ? { agentId } : {}) };
          const { nextUsername } = await getNextUsername(playerPrefix, token, query);
          setNewCustomer((prev) => ({
            ...prev,
            username: nextUsername,
            // Preserve user's typed prefix for agent/super_agent creation
            agentPrefix: (isAgentCreation && prev.agentPrefix) ? prev.agentPrefix : playerPrefix,
          }));
        } catch (err) {
          console.error('Failed to get next username:', err);
        }
      }
    } else {
      if (creationType === 'player' && (currentRole === 'admin' || isMasterContext)) {
        setNewCustomer((prev) => ({ ...prev, username: '' }));
        return;
      }
      // For agent/super_agent creation use typed prefix; for player creation derive from admin username
      const prefixToUse = (isAgentCreation && newCustomer.agentPrefix)
        ? newCustomer.agentPrefix
        : (adminUsername ? derivePlayerPrefix(adminUsername) : '');
      if (prefixToUse) {
        try {
          const query = { suffix, type: sequenceType };
          if (sequenceType === 'agent' && creationType === 'agent' && (currentRole === 'master_agent' || currentRole === 'super_agent') && currentUserId) {
            query.agentId = currentUserId;
          }
          const { nextUsername } = await getNextUsername(prefixToUse, token, query);
          setNewCustomer((prev) => ({
            ...prev,
            username: nextUsername,
            agentPrefix: (isAgentCreation && prev.agentPrefix) ? prev.agentPrefix : prefixToUse,
          }));
        } catch (err) {
          console.error('Failed to fetch username for admin:', err);
          setNewCustomer((prev) => ({ ...prev, username: '' }));
        }
      } else {
        setNewCustomer((prev) => ({ ...prev, username: '' }));
      }
    }
  };

  const handleCreationTypeChange = async (type) => {
    setCreationType(type);
    setPrefixError('');
    setAgentSearchQuery('');
    setHiringAgentPercent('');
    setSubAgentPercent('');
    setExtraSubAgents([]);
    setNewCustomer((prev) => ({ ...prev, agentPercent: '', playerRate: '' }));
    const token = localStorage.getItem('token') || sessionStorage.getItem('token');
    if (!token) return;

    if (type === 'super_agent' || type === 'agent') {
      const selectedAgentId = String(newCustomer.agentId || '').trim();
      const selectedAgent = selectedAgentId
        ? findAssignmentTreeNode(assignmentTreeRoot, selectedAgentId)
        : null;
      const hasValidMasterAssignment = Boolean(selectedAgent && isMasterTreeNode(selectedAgent));
      const nextParentAgentId = hasValidMasterAssignment ? selectedAgentId : '';
      if (!hasValidMasterAssignment) {
        setNewCustomer((prev) => ({ ...prev, agentId: '', parentAgentId: '' }));
      }

      setReferralSearchQuery('');
      setReferralSearchOpen(false);
      setNewCustomer((prev) => ({ ...prev, referredByUserId: '' }));
      const suffix = type === 'super_agent' ? 'MA' : '';
      const prefixToUse = newCustomer.agentPrefix;
      const sequenceType = 'agent';

      if (prefixToUse) {
        try {
          const query = { suffix, type: sequenceType };
          if (type === 'agent' && nextParentAgentId) {
            query.agentId = nextParentAgentId;
          } else if (type === 'agent' && (currentRole === 'master_agent' || currentRole === 'super_agent') && currentUserId) {
            query.agentId = currentUserId;
          }
          const { nextUsername } = await getNextUsername(prefixToUse, token, query);
          setNewCustomer((prev) => ({ ...prev, username: nextUsername, agentPrefix: prefixToUse }));
        } catch (e) {
          console.error('Failed to re-fetch username on type change', e);
        }
      } else {
        setNewCustomer((prev) => ({ ...prev, username: '' }));
      }
    } else {
      await handleAgentChange('');
      setReferralSearchOpen(false);
      setNewCustomer((prev) => ({ ...prev, referredByUserId: '' }));
    }
  };

  const updateAutoPassword = (firstName, lastName, phoneNumber) => {
    const autoPass = generateIdentityPassword(firstName, lastName, phoneNumber, newCustomer.username);
    setNewCustomer((prev) => ({ ...prev, password: autoPass }));
  };

  const handleFirstNameChange = (val) => {
    const formatted = normalizeIdentityName(val);
    setNewCustomer((prev) => {
      const updated = { ...prev, firstName: formatted };
      updateAutoPassword(formatted, updated.lastName, updated.phoneNumber);
      return updated;
    });
  };

  const handleLastNameChange = (val) => {
    const formatted = normalizeIdentityName(val);
    setNewCustomer((prev) => {
      const updated = { ...prev, lastName: formatted };
      updateAutoPassword(updated.firstName, formatted, updated.phoneNumber);
      return updated;
    });
  };

  const handlePhoneChange = (val) => {
    const formatted = formatUsPhone(val);

    setNewCustomer((prev) => {
      const updated = { ...prev, phoneNumber: formatted };
      updateAutoPassword(updated.firstName, updated.lastName, formatted);
      return updated;
    });
  };

  const canCreateCustomer = !viewOnly
    && !createLoading
    && !!String(newCustomer.username || '').trim()
    && !!String(newCustomer.firstName || '').trim()
    && !!String(newCustomer.lastName || '').trim()
    && !!String(newCustomer.phoneNumber || '').trim()
    && !!String(newCustomer.password || '').trim()
    && (creationType !== 'player' || currentRole === 'agent' || !!String(newCustomer.agentId || '').trim())
    && (creationType !== 'player' || (
      String(newCustomer.minBet ?? '').trim() !== ''
      && String(newCustomer.maxBet ?? '').trim() !== ''
      && String(newCustomer.creditLimit ?? '').trim() !== ''
      && String(newCustomer.balanceOwed ?? '').trim() !== ''
    ))
    && !prefixError;

  const isMasterContext = currentRole === 'master_agent' || currentRole === 'super_agent';
  const isMasterAssignmentMode = creationType === 'agent' || creationType === 'super_agent';
  const requiresPlayerAgentSelection = creationType === 'player' && (currentRole === 'admin' || isMasterContext);

  const selectableAssignmentNodes = useMemo(() => {
    if (!assignmentTreeRoot) return [];

    if (creationType === 'player') {
      return flattenAssignmentTree(
        assignmentTreeRoot,
        (node, depth) => depth > 0 && isRegularAgentTreeNode(node),
        false
      );
    }

    return flattenAssignmentTree(
      assignmentTreeRoot,
      (node, depth) => depth > 0 && isMasterTreeNode(node),
      false
    );
  }, [assignmentTreeRoot, creationType]);

  const selectedAssignmentNode = useMemo(() => {
    if (!assignmentTreeRoot) return null;

    const selectedId = String(newCustomer.agentId || '').trim();
    if (!selectedId) {
      return isMasterAssignmentMode ? assignmentTreeRoot : null;
    }

    return findAssignmentTreeNode(assignmentTreeRoot, selectedId);
  }, [assignmentTreeRoot, newCustomer.agentId, isMasterAssignmentMode]);

  const selectedAssignmentLabel = useMemo(() => {
    if (creationType === 'player') {
      return selectedAssignmentNode ? String(selectedAssignmentNode.username || '').toUpperCase() : 'Select an agent';
    }

    if (!String(newCustomer.agentId || '').trim()) {
      const rootName = String(assignmentTreeRoot?.username || adminUsername || '').trim().toUpperCase();
      return rootName ? `${rootName} (ME)` : 'DIRECT (CREATED BY ME)';
    }

    return selectedAssignmentNode
      ? String(selectedAssignmentNode.username || '').toUpperCase()
      : 'Select a master agent';
  }, [creationType, selectedAssignmentNode, newCustomer.agentId, assignmentTreeRoot, adminUsername]);

  const assignmentSearchPlaceholder = isMasterAssignmentMode
    ? 'Search master agents or agents...'
    : 'Search agents...';

  const assignmentEmptyLabel = isMasterAssignmentMode
    ? 'No matching master-agent branches'
    : 'No matching agents';

  const toggleAssignmentNode = (nodeId) => {
    const normalizedId = normalizeHierarchyId(nodeId);
    if (!normalizedId) return;

    setAssignmentExpandedNodes((prev) => {
      const next = new Set(prev);
      if (next.has(normalizedId)) {
        next.delete(normalizedId);
      } else {
        next.add(normalizedId);
      }
      return next;
    });
  };

  const expandAssignmentPath = (nodeId) => {
    const normalizedId = normalizeHierarchyId(nodeId);
    if (!normalizedId || !assignmentTreeRoot) return;

    setAssignmentExpandedNodes((prev) => {
      const next = new Set(prev);
      const path = findAssignmentTreePath(assignmentTreeRoot, normalizedId);
      path.forEach((id) => next.add(id));
      return next;
    });
  };

  const handleAssignmentNodeSelect = async (node) => {
    const selectedId = normalizeHierarchyId(node?.id);
    if (!selectedId) return;

    expandAssignmentPath(selectedId);
    await handleAgentChange(selectedId, node);
  };

  const handleDirectAssignmentSelect = async (node) => {
    await handleAgentChange('', node);
  };

  useEffect(() => {
    const selectedId = String(newCustomer.agentId || '').trim();
    if (!selectedId) return;

    const selectedNode = findAssignmentTreeNode(assignmentTreeRoot, selectedId);
    const hasValidSelection = creationType === 'player'
      ? Boolean(selectedNode && isRegularAgentTreeNode(selectedNode))
      : Boolean(selectedNode && isMasterTreeNode(selectedNode));
    if (hasValidSelection) return;

    setNewCustomer((prev) => {
      if (!String(prev.agentId || '').trim()) return prev;
      return {
        ...prev,
        agentId: '',
        parentAgentId: '',
      };
    });
    setAgentSearchQuery('');
  }, [assignmentTreeRoot, creationType, newCustomer.agentId]);

  // No auto-select: user must explicitly choose an agent from the tree/search.

  const referralOptions = (() => {
    const playersOnly = customers.filter(isPlayerLikeCustomer);
    if (creationType !== 'player' && creationType !== 'agent' && creationType !== 'super_agent') return [];

    if (currentRole === 'agent') {
      return playersOnly;
    }

    if (newCustomer.agentId) {
      return playersOnly.filter((p) => String(p.agentId?.id || p.agentId || '') === String(newCustomer.agentId));
    }

    return playersOnly;
  })();

  const referralSearchOptions = useMemo(() => (
    referralOptions
      .map((player) => {
        const id = String(player.id || '').trim();
        const username = String(player.username || '').trim();
        const fullName = String(player.fullName || '').trim();
        if (!id || !username) return null;
        const label = `${username.toUpperCase()}${fullName ? ` - ${fullName}` : ''}`;
        return {
          id,
          label,
          labelLower: label.toLowerCase(),
          usernameLower: username.toLowerCase(),
        };
      })
      .filter(Boolean)
  ), [referralOptions]);

  const filteredReferralOptions = useMemo(() => {
    const typed = String(referralSearchQuery || '').trim().toLowerCase();
    if (!typed) {
      return referralSearchOptions.slice(0, 20);
    }
    return referralSearchOptions
      .filter((option) => option.labelLower.includes(typed) || option.usernameLower.includes(typed))
      .slice(0, 20);
  }, [referralSearchOptions, referralSearchQuery]);

  const selectedReferralOption = useMemo(() => {
    const selectedId = String(newCustomer.referredByUserId || '').trim();
    if (!selectedId) return null;
    return referralSearchOptions.find((option) => option.id === selectedId) || null;
  }, [newCustomer.referredByUserId, referralSearchOptions]);

  useEffect(() => {
    if (selectedReferralOption) {
      setReferralSearchQuery(selectedReferralOption.label);
      return;
    }
    if (!String(newCustomer.referredByUserId || '').trim()) {
      setReferralSearchQuery('');
    }
  }, [selectedReferralOption, newCustomer.referredByUserId]);

  const handleReferralSearchChange = (value) => {
    setReferralSearchQuery(value);
    const typed = String(value || '').trim().toLowerCase();
    if (!typed) {
      setNewCustomer((prev) => ({ ...prev, referredByUserId: '' }));
      return;
    }

    const exactMatch = referralSearchOptions.find(
      (option) => option.labelLower === typed || option.usernameLower === typed
    );

    setNewCustomer((prev) => ({
      ...prev,
      referredByUserId: exactMatch ? exactMatch.id : '',
    }));
  };

  const handleReferralSearchBlur = () => {
    const typed = String(referralSearchQuery || '').trim().toLowerCase();
    if (!typed) {
      setNewCustomer((prev) => ({ ...prev, referredByUserId: '' }));
      return;
    }

    const exactMatch = referralSearchOptions.find(
      (option) => option.labelLower === typed || option.usernameLower === typed
    );
    if (exactMatch) {
      setReferralSearchQuery(exactMatch.label);
      setNewCustomer((prev) => ({ ...prev, referredByUserId: exactMatch.id }));
      return;
    }

    const partialMatches = referralSearchOptions.filter(
      (option) => option.labelLower.includes(typed) || option.usernameLower.includes(typed)
    );
    if (partialMatches.length === 1) {
      setReferralSearchQuery(partialMatches[0].label);
      setNewCustomer((prev) => ({ ...prev, referredByUserId: partialMatches[0].id }));
      return;
    }

    setNewCustomer((prev) => ({ ...prev, referredByUserId: '' }));
  };

  const handleReferralSelect = (option) => {
    if (!option) {
      setReferralSearchQuery('');
      setNewCustomer((prev) => ({ ...prev, referredByUserId: '' }));
      setReferralSearchOpen(false);
      return;
    }
    setReferralSearchQuery(option.label);
    setNewCustomer((prev) => ({ ...prev, referredByUserId: option.id }));
    setReferralSearchOpen(false);
  };

  return (
    <>
      {loadingContext && (
        <div className="loading-state">
          <div className="spinner"></div>
          <span>Loading setup...</span>
        </div>
      )}
      {!loadingContext && (
        <>
          {error && <div className="error-state">{error}</div>}
          {duplicateWarning && (
            <div className="duplicate-warning-state">
              <div className="duplicate-warning-title">Duplicate Player</div>
              <div className="duplicate-warning-message">{duplicateWarning.message}</div>
              {duplicateWarning.matches.length > 0 && (
                <div className="duplicate-warning-list">
                  {duplicateWarning.matches.map((match, idx) => (
                    <div
                      key={`${match.id || match.username || 'duplicate'}-${idx}`}
                      className="duplicate-warning-item"
                    >
                      <strong>{String(match.username || 'UNKNOWN')}</strong>
                      <span>{String(match.fullName || 'No name')}</span>
                      <span>{String(match.phoneNumber || 'No phone')}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
          {importSummary && <div className="success-state">{importSummary}</div>}
          {importedUsernames.length > 0 && (
            <div className="success-state" style={{ marginTop: '8px' }}>
              Imported usernames: {importedUsernames.slice(0, 20).join(', ')}{importedUsernames.length > 20 ? ` (+${importedUsernames.length - 20} more)` : ''}
            </div>
          )}
          {importErrors.length > 0 && (
            <div style={{ marginTop: '8px', background: '#fff5f5', border: '1px solid #feb2b2', borderRadius: '6px', padding: '10px 14px' }}>
              <strong style={{ color: '#c53030', fontSize: '13px' }}>Failed rows ({importErrors.length}) — re-importing will retry these safely:</strong>
              <ul style={{ margin: '6px 0 0 0', padding: '0 0 0 16px', fontSize: '12px', color: '#742a2a', maxHeight: '160px', overflowY: 'auto' }}>
                {importErrors.map((e, i) => (
                  <li key={i}>
                    Row {e.row}{e.username ? ` (${String(e.username).toUpperCase()})` : ''}: {e.error || e.reason || 'Unknown error'}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="customer-create-shell">
            <div className="customer-create-main">
              <div className="customer-create-top-row">
                <div className="filter-group customer-top-field customer-top-field-type">
                  <label>Type</label>
                  <div className="s-wrapper">
                    <select
                      value={creationType}
                      onChange={(e) => handleCreationTypeChange(e.target.value)}
                    >
                      <option value="player">Player</option>
                      {(currentRole === 'admin' || currentRole === 'super_agent' || currentRole === 'master_agent') && (
                        <>
                          <option value="agent">Agent</option>
                          <option value="super_agent">Master Agent</option>
                        </>
                      )}
                    </select>
                  </div>
                </div>

                {(creationType === 'agent' || creationType === 'super_agent') && (
                  <div className="filter-group customer-top-field customer-top-field-prefix">
                    <label>Prefix</label>
                    <input
                      type="text"
                      value={newCustomer.agentPrefix}
                      onChange={(e) => handlePrefixChange(e.target.value)}
                      placeholder="Enter prefix"
                      maxLength={5}
                      style={prefixError ? { borderColor: '#ef4444', boxShadow: '0 0 0 2px rgba(239,68,68,0.15)' } : undefined}
                    />
                    {prefixError && <span style={{ color: '#ef4444', fontSize: 12, fontWeight: 600, marginTop: 4 }}>{prefixError}</span>}
                  </div>
                )}

                {(creationType === 'player' || creationType === 'agent' || creationType === 'super_agent')
                  && (currentRole === 'admin' || currentRole === 'super_agent' || currentRole === 'master_agent') && (
                    <div className="filter-group assignment-tree-filter-group customer-top-field customer-top-field-assignment">
                      <label className="assignment-field-label">
                        <span>{creationType === 'player' ? 'Assign to Agent' : 'Assign to Master Agent'}</span>
                        <span className="assignment-selected-chip">{selectedAssignmentLabel}</span>
                      </label>
                      <AssignmentHierarchyPicker
                        rootNode={assignmentTreeRoot}
                        loading={assignmentTreeLoading}
                        error={assignmentTreeError}
                        searchQuery={agentSearchQuery}
                        onSearchQueryChange={setAgentSearchQuery}
                        expandedNodes={assignmentExpandedNodes}
                        onToggleNode={toggleAssignmentNode}
                        onSelectNode={handleAssignmentNodeSelect}
                        onSelectDirect={isMasterAssignmentMode ? handleDirectAssignmentSelect : null}
                        selectedNodeId={String(newCustomer.agentId || '')}
                        directSelected={isMasterAssignmentMode && !String(newCustomer.agentId || '').trim()}
                        selectionMode={isMasterAssignmentMode ? 'master' : 'player'}
                        searchPlaceholder={assignmentSearchPlaceholder}
                        emptyLabel={assignmentEmptyLabel}
                      />
                    </div>
                  )}

                <div className="filter-group customer-top-field customer-top-field-username">
                  <label>Username</label>
                  <input
                    type="text"
                    value={newCustomer.username}
                    placeholder="Auto-generated"
                    readOnly
                    className="readonly-input"
                  />
                </div>
              </div>

              <div className="customer-create-row">
                <div className="filter-group customer-field-span-3">
                  <label>First Name</label>
                  <input
                    type="text"
                    value={newCustomer.firstName}
                    onChange={(e) => handleFirstNameChange(e.target.value)}
                    placeholder="Enter first name"
                  />
                </div>
                <div className="filter-group customer-field-span-3">
                  <label>Last Name</label>
                  <input
                    type="text"
                    value={newCustomer.lastName}
                    onChange={(e) => handleLastNameChange(e.target.value)}
                    placeholder="Enter last name"
                  />
                </div>
                <div className="filter-group customer-field-span-3">
                  <label>Phone Number</label>
                  <input
                    type="tel"
                    value={newCustomer.phoneNumber}
                    onChange={(e) => handlePhoneChange(e.target.value)}
                    placeholder="User contact"
                  />
                </div>
                <div className="filter-group customer-field-span-3">
                  <label>Password <span className="locked-chip">Locked</span></label>
                  <input
                    type="text"
                    value={newCustomer.password.toUpperCase()}
                    readOnly
                    className="readonly-input"
                    placeholder="Auto-generated from name + phone"
                  />
                </div>
              </div>

              {creationType === 'player' && (
                <div className="customer-create-row">
                  <div className="filter-group customer-field-span-3">
                    <label>Min bet:</label>
                    <input
                      type="number"
                      value={newCustomer.minBet}
                      onChange={(e) => setNewCustomer((prev) => ({ ...prev, minBet: e.target.value }))}
                    />
                  </div>
                  <div className="filter-group customer-field-span-3">
                    <label>Max bet:</label>
                    <input
                      type="number"
                      value={newCustomer.maxBet}
                      onChange={(e) => setNewCustomer((prev) => ({ ...prev, maxBet: e.target.value }))}
                    />
                  </div>
                  <div className="filter-group customer-field-span-3">
                    <label>Credit limit:</label>
                    <input
                      type="number"
                      value={newCustomer.creditLimit}
                      onChange={(e) => setNewCustomer((prev) => ({ ...prev, creditLimit: e.target.value }))}
                    />
                  </div>
                  <div className="filter-group customer-field-span-3">
                    <label>Settle limit:</label>
                    <input
                      type="number"
                      value={newCustomer.balanceOwed}
                      onChange={(e) => setNewCustomer((prev) => ({ ...prev, balanceOwed: e.target.value }))}
                    />
                  </div>
                  <div className="filter-group customer-field-span-12">
                    <label>Referred By Player</label>
                    <div
                      className="agent-search-picker referral-search-picker"
                      onFocus={() => setReferralSearchOpen(true)}
                      onBlur={() => {
                        setTimeout(() => {
                          handleReferralSearchBlur();
                          setReferralSearchOpen(false);
                        }, 120);
                      }}
                      tabIndex={0}
                    >
                      <div className="referral-search-head">
                        <input
                          type="text"
                          value={referralSearchQuery}
                          onChange={(e) => {
                            handleReferralSearchChange(e.target.value);
                            setReferralSearchOpen(true);
                          }}
                          onFocus={() => setReferralSearchOpen(true)}
                          placeholder="Search player (leave blank for no referral)"
                          autoComplete="off"
                        />
                      </div>
                      {referralSearchOpen && (
                        <div className="agent-search-list">
                          <button
                            type="button"
                            className={`agent-search-item ${newCustomer.referredByUserId ? '' : 'selected'}`}
                            onMouseDown={(event) => {
                              event.preventDefault();
                              handleReferralSelect(null);
                            }}
                          >
                            <span>No referral</span>
                          </button>
                          {filteredReferralOptions.map((option) => (
                            <button
                              key={option.id}
                              type="button"
                              className={`agent-search-item ${String(newCustomer.referredByUserId || '') === String(option.id) ? 'selected' : ''}`}
                              onMouseDown={(event) => {
                                event.preventDefault();
                                handleReferralSelect(option);
                              }}
                            >
                              <span>{option.label}</span>
                            </button>
                          ))}
                          {filteredReferralOptions.length === 0 && (
                            <div className="agent-search-empty">No matching players</div>
                          )}
                        </div>
                      )}
                    </div>
                    <div className="player-referral-settings">
                      <div className={`player-freeplay-toggle ${newCustomer.grantStartingFreeplay ? 'is-selected' : 'is-unselected'}`}>
                        <label className="player-freeplay-toggle-row">
                          <input
                            type="checkbox"
                            checked={!!newCustomer.grantStartingFreeplay}
                            onChange={(e) => setNewCustomer((prev) => ({ ...prev, grantStartingFreeplay: e.target.checked }))}
                          />
                          <span className="player-freeplay-toggle-copy">
                            <span className="player-freeplay-toggle-title">$200 new player freeplay bonus</span>
                          </span>
                        </label>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {creationType === 'agent' && (
                <div className="customer-create-row">
                  <div className="filter-group customer-field-span-3">
                    <label>Min bet: (Standard)</label>
                    <input
                      type="number"
                      value={newCustomer.defaultMinBet}
                      onChange={(e) => setNewCustomer((prev) => ({ ...prev, defaultMinBet: e.target.value }))}
                    />
                  </div>
                  <div className="filter-group customer-field-span-3">
                    <label>Max bet: (Standard)</label>
                    <input
                      type="number"
                      value={newCustomer.defaultMaxBet}
                      onChange={(e) => setNewCustomer((prev) => ({ ...prev, defaultMaxBet: e.target.value }))}
                    />
                  </div>
                  <div className="filter-group customer-field-span-3">
                    <label>Credit limit: (Standard)</label>
                    <input
                      type="number"
                      value={newCustomer.defaultCreditLimit}
                      onChange={(e) => setNewCustomer((prev) => ({ ...prev, defaultCreditLimit: e.target.value }))}
                    />
                  </div>
                  <div className="filter-group customer-field-span-3">
                    <label>Settle limit: (Standard)</label>
                    <input
                      type="number"
                      value={newCustomer.defaultSettleLimit}
                      onChange={(e) => setNewCustomer((prev) => ({ ...prev, defaultSettleLimit: e.target.value }))}
                    />
                  </div>
                </div>
              )}

              {(creationType === 'agent' || creationType === 'super_agent') && (() => {
                const agentPct = parseFloat(newCustomer.agentPercent) || 0;
                const hiringPct = parseFloat(hiringAgentPercent) || 0;
                const firstTwoPct = agentPct + hiringPct;
                const selectedMaHasParentMa = (() => {
                  const selId = String(newCustomer.agentId || '').trim();
                  if (!assignmentTreeRoot) return false;
                  if (!selId) {
                    // Assigned directly to root (ME) — check if root itself is under a MA
                    // Root is the logged-in user; if they're a MA, they are the top — no parent MA
                    return false;
                  }
                  const path = findAssignmentTreePath(assignmentTreeRoot, selId);
                  if (path.length < 2) return false;
                  // Check every node between root and selected (exclusive) for master agents
                  // Also: if root itself is a master agent, then the selected node is under a MA
                  const rootRole = normalizeAgentRole(assignmentTreeRoot?.role);
                  if (rootRole === 'master_agent' || rootRole === 'super_agent') return true;
                  for (let i = 1; i < path.length - 1; i++) {
                    const mid = findAssignmentTreeNode(assignmentTreeRoot, path[i]);
                    if (mid && isMasterTreeNode(mid)) return true;
                  }
                  return false;
                })();
                const showSubAgent = firstTwoPct !== 100 && selectedMaHasParentMa;
                const subPct = showSubAgent ? (parseFloat(subAgentPercent) || 0) : 0;
                const extraPcts = extraSubAgents.reduce((sum, sa) => sum + (parseFloat(sa.percent) || 0), 0);
                const totalPct = agentPct + hiringPct + subPct + extraPcts;
                const remaining = 100 - totalPct;
                const totalColor = totalPct === 100 ? '#16a34a' : totalPct > 100 ? '#ef4444' : '#f59e0b';

                const hiringAgentName = (() => {
                  const selId = String(newCustomer.agentId || '').trim();
                  if (selId && selectedAssignmentNode) return String(selectedAssignmentNode.username || '').toUpperCase();
                  return String(adminUsername || '').toUpperCase() || 'HIRING AGENT';
                })();

                const adminName = (() => {
                  if (!assignmentTreeRoot) return 'ADMIN';
                  return String(assignmentTreeRoot.username || '').toUpperCase() || 'ADMIN';
                })();

                return (
                  <>
                    <div className="commission-split-header">
                      <span className="commission-split-title">Commission Split</span>
                      <span className="commission-split-total" style={{ color: totalColor }}>
                        {totalPct.toFixed(2)}%
                        {totalPct === 100 ? ' ✓' : totalPct > 100 ? ' over' : ` / 100%`}
                      </span>
                    </div>

                    <div className="customer-create-row">
                      <div className="filter-group customer-field-span-3">
                        <label>Agent % <span className="commission-name-tag">{String(newCustomer.username || '').toUpperCase() || 'NEW AGENT'}</span></label>
                        <input
                          type="number"
                          min="0"
                          max="100"
                          step="0.01"
                          placeholder="e.g. 90"
                          value={newCustomer.agentPercent}
                          onChange={(e) => setNewCustomer((prev) => ({ ...prev, agentPercent: e.target.value }))}
                        />
                      </div>
                      <div className="filter-group customer-field-span-3">
                        <label>Hiring Agent % <span className="commission-name-tag">{hiringAgentName}</span></label>
                        <input
                          type="number"
                          min="0"
                          max="100"
                          step="0.01"
                          placeholder="e.g. 5"
                          value={hiringAgentPercent}
                          onChange={(e) => setHiringAgentPercent(e.target.value)}
                        />
                      </div>
                      {showSubAgent && (
                        <div className="filter-group customer-field-span-3">
                          <label>Sub Agent % <span className="commission-name-tag">{adminName}</span></label>
                          <input
                            type="number"
                            min="0"
                            max="100"
                            step="0.01"
                            placeholder="e.g. 5"
                            value={subAgentPercent}
                            onChange={(e) => setSubAgentPercent(e.target.value)}
                          />
                        </div>
                      )}
                      <div className="filter-group customer-field-span-3">
                        <label>Player Rate ($)</label>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          placeholder="e.g. 25"
                          value={newCustomer.playerRate}
                          onChange={(e) => setNewCustomer((prev) => ({ ...prev, playerRate: e.target.value }))}
                        />
                      </div>
                    </div>

                    {showSubAgent && (() => {
                      // Build display list: all existing + one empty row if total < 100%
                      const needsNewRow = totalPct < 100 && extraSubAgents.every((sa) => sa.percent !== '');
                      const displayList = needsNewRow
                        ? [...extraSubAgents, { id: `new-${Date.now()}`, name: '', percent: '', isNew: true }]
                        : extraSubAgents;

                      return displayList.map((sa, idx) => (
                        <div className="customer-create-row commission-extra-row" key={sa.id}>
                          <div className="filter-group customer-field-span-4">
                            <label>Sub Agent {idx + 1} Name</label>
                            <input
                              type="text"
                              placeholder="Username"
                              value={sa.name}
                              onChange={(e) => {
                                if (sa.isNew) {
                                  setExtraSubAgents((prev) => [...prev, { id: Date.now(), name: e.target.value, percent: '' }]);
                                } else {
                                  const updated = [...extraSubAgents];
                                  updated[idx] = { ...updated[idx], name: e.target.value };
                                  setExtraSubAgents(updated);
                                }
                              }}
                            />
                          </div>
                          <div className="filter-group customer-field-span-3">
                            <label>Sub Agent {idx + 1} %</label>
                            <input
                              type="number"
                              min="0"
                              max="100"
                              step="0.01"
                              placeholder="%"
                              value={sa.percent}
                              onChange={(e) => {
                                if (sa.isNew) {
                                  setExtraSubAgents((prev) => [...prev, { id: Date.now(), name: '', percent: e.target.value }]);
                                } else {
                                  const updated = [...extraSubAgents];
                                  updated[idx] = { ...updated[idx], percent: e.target.value };
                                  setExtraSubAgents(updated);
                                }
                              }}
                            />
                          </div>
                          <div className="filter-group customer-field-span-2 commission-remove-cell">
                            {!sa.isNew && (
                              <button
                                type="button"
                                className="commission-remove-btn"
                                onClick={() => setExtraSubAgents((prev) => prev.filter((_, i) => i !== idx))}
                              >
                                Remove
                              </button>
                            )}
                          </div>
                        </div>
                      ));
                    })()}

                    {showSubAgent && totalPct < 100 && (
                      <div className="commission-add-row">
                        <span className="commission-remaining" style={{ color: totalColor }}>
                          {remaining.toFixed(2)}% remaining
                        </span>
                      </div>
                    )}
                  </>
                );
              })()}

            </div>

            <aside className="customer-create-sidebar">
              <div className="customer-create-side-card customer-create-actions">
                <button
                  className="btn-primary"
                  onClick={handleCreateCustomer}
                  disabled={!canCreateCustomer}
                >
                  {createLoading ? 'Deploying...' : `Create ${creationType === 'player' ? 'Player' : creationType === 'agent' ? 'Agent' : 'Master Agent'}`}
                </button>
                <button
                  type="button"
                  className="btn-secondary customer-copy-button"
                  onClick={() => {
                    navigator.clipboard.writeText(buildCopyInfo(creationType, newCustomer)).then(() => alert('Copied to clipboard!'));
                  }}
                >
                  Copy Info
                </button>
              </div>

              {(currentRole === 'admin' || currentRole === 'master_agent' || currentRole === 'super_agent' || currentRole === 'agent') && (
                <div className="customer-create-side-card customer-create-import-panel">
                  <label>Import Players (.xlsx / .csv)</label>
                  <input
                    type="file"
                    accept=".xlsx,.csv"
                    onChange={(e) => {
                      const file = e.target.files?.[0] || null;
                      setImportFile(file);
                      setSelectedImportFileName(file?.name || '');
                    }}
                  />
                  {selectedImportFileName && (
                    <small className="customer-import-file-name">
                      Selected file: {selectedImportFileName}
                    </small>
                  )}
                  <label className="customer-import-toggle">
                    <input
                      type="checkbox"
                      checked={importForceAgentAssignment}
                      onChange={(e) => setImportForceAgentAssignment(e.target.checked)}
                    />
                    <span>
                      {currentRole === 'agent'
                        ? 'Assign all imported players to me'
                        : 'Assign all imported players to selected agent'}
                    </span>
                  </label>
                  {importForceAgentAssignment && currentRole !== 'agent' && (
                    <select
                      value={importAgentId}
                      onChange={(e) => setImportAgentId(e.target.value)}
                      style={{ width: '100%', padding: '6px 8px', border: '1px solid #d1d5db', borderRadius: '4px', fontSize: '13px', marginTop: '4px' }}
                    >
                      <option value="">— Select agent —</option>
                      {agents
                        .filter((a) => {
                          const r = String(a.role || '').toLowerCase();
                          return r === 'agent' || r === 'master_agent' || r === 'super_agent';
                        })
                        .sort((a, b) => String(a.username || '').localeCompare(String(b.username || '')))
                        .map((a) => {
                          const id = String(a.id || '');
                          const roleLabel = String(a.role || '').toLowerCase() === 'agent' ? 'Agent' : 'Master Agent';
                          return (
                            <option key={id} value={id}>
                              {String(a.username || id).toUpperCase()} ({roleLabel})
                            </option>
                          );
                        })
                      }
                    </select>
                  )}
                  <button
                    type="button"
                    className="btn-primary"
                    onClick={handleImportCustomers}
                    disabled={!importFile || importLoading}
                  >
                    {importLoading ? 'Importing...' : 'Import File'}
                  </button>
                </div>
              )}
            </aside>
          </div>

          <style>{`
            .apps-card { background:#fff; border:1px solid #d1d5db; padding:16px; border-radius:4px; }
            .apps-title { font-size:15px; font-weight:700; color:#1e3a5f; margin:0 0 12px 0; }
            .apps-grid { display:grid; grid-template-columns:1fr 1fr; gap:10px 20px; }
            .apps-field { display:flex; flex-direction:column; }
            .apps-field label { color:#4b5563; font-size:11px; margin-bottom:3px; font-weight:600; }
            .apps-field input { width:100%; border:none; border-bottom:1px solid #6b7280; background:transparent; font-size:14px; padding:3px 0; color:#111827; outline:none; }
            .apps-field input:focus { border-bottom-color:#1e40af; }
            .apps-field-full { grid-column:1/-1; }
            .customer-create-shell {
              display: grid;
              grid-template-columns: minmax(0, 1fr) minmax(280px, 340px);
              gap: 24px;
              align-items: start;
            }
            .customer-create-main {
              display: flex;
              flex-direction: column;
              gap: 18px;
              min-width: 0;
            }
            .customer-create-top-row {
              display: flex;
              flex-wrap: wrap;
              gap: 18px 20px;
              align-items: flex-start;
            }
            .customer-top-field {
              min-width: 0;
            }
            .customer-top-field-type {
              flex: 0 0 180px;
            }
            .customer-top-field-prefix {
              flex: 0 0 180px;
            }
            .customer-top-field-assignment {
              flex: 1.4 1 320px;
            }
            .customer-top-field-username {
              flex: 1 1 240px;
            }
            .customer-create-row {
              display: grid;
              grid-template-columns: repeat(12, minmax(0, 1fr));
              gap: 18px 20px;
              align-items: start;
            }
            .customer-field-span-2 {
              grid-column: span 2;
            }
            .customer-field-span-3 {
              grid-column: span 3;
            }
            .customer-field-span-4 {
              grid-column: span 4;
            }
            .customer-field-span-12 {
              grid-column: 1 / -1;
            }

            /* ── Commission Split ─────────────────── */
            .commission-split-header {
              display: flex;
              align-items: center;
              justify-content: space-between;
              padding: 10px 0 4px;
              border-top: 1px solid #e2e8f0;
              margin-top: 6px;
            }
            .commission-split-title {
              font-size: 13px;
              font-weight: 700;
              color: #334155;
            }
            .commission-split-total {
              font-size: 13px;
              font-weight: 700;
            }
            .commission-name-tag {
              display: inline-block;
              font-weight: 500;
              font-size: 10px;
              color: #64748b;
              background: #f1f5f9;
              border-radius: 4px;
              padding: 1px 5px;
              margin-left: 4px;
              vertical-align: middle;
            }
            .commission-extra-row {
              margin-top: -8px;
            }
            .commission-remove-cell {
              display: flex;
              align-items: flex-end;
              padding-bottom: 2px;
            }
            .commission-remove-btn {
              padding: 7px 16px;
              font-size: 12px;
              font-weight: 600;
              background: #fee2e2;
              color: #dc2626;
              border: 1px solid #fca5a5;
              border-radius: 8px;
              cursor: pointer;
              transition: background 0.15s;
            }
            .commission-remove-btn:hover {
              background: #fecaca;
            }
            .commission-add-row {
              display: flex;
              align-items: center;
              gap: 14px;
              padding: 2px 0 4px;
            }
            .commission-add-btn {
              padding: 7px 18px;
              font-size: 12px;
              font-weight: 600;
              background: #eff6ff;
              color: #2563eb;
              border: 1px solid #bfdbfe;
              border-radius: 8px;
              cursor: pointer;
              transition: background 0.15s;
            }
            .commission-add-btn:hover {
              background: #dbeafe;
            }
            .commission-remaining {
              font-size: 12px;
              font-weight: 600;
            }

            .assignment-tree-filter-group {
              min-width: 0;
            }
            .assignment-field-label {
              display: flex;
              align-items: center;
              justify-content: space-between;
              gap: 10px;
              flex-wrap: wrap;
            }
            .assignment-selected-chip {
              display: inline-flex;
              align-items: center;
              padding: 4px 10px;
              border-radius: 999px;
              background: #eff6ff;
              color: #1d4ed8;
              border: 1px solid #bfdbfe;
              font-size: 11px;
              font-weight: 700;
              letter-spacing: 0.02em;
              text-transform: uppercase;
            }
            .customer-create-sidebar {
              display: flex;
              flex-direction: column;
              gap: 16px;
            }
            .customer-create-side-card {
              display: flex;
              flex-direction: column;
              gap: 12px;
              padding: 18px;
              border: 1px solid #e2e8f0;
              border-radius: 16px;
              background: linear-gradient(180deg, #ffffff 0%, #f8fbff 100%);
              box-shadow: 0 10px 26px rgba(15, 23, 42, 0.06);
            }
            .customer-create-actions .btn-primary,
            .customer-create-actions .btn-secondary,
            .customer-create-import-panel .btn-primary {
              width: 100%;
              min-height: 48px;
            }
            .customer-copy-button {
              background: #17a2b8 !important;
              color: #ffffff !important;
            }
            .customer-create-import-panel label {
              font-size: 13px;
              font-weight: 700;
              color: #334155;
            }
            .customer-create-import-panel input[type="file"] {
              width: 100%;
            }
            .customer-import-file-name {
              display: block;
              color: #64748b;
              line-height: 1.35;
            }
            .customer-import-toggle {
              display: flex;
              align-items: flex-start;
              gap: 10px;
              color: #64748b !important;
              font-size: 12px !important;
              font-weight: 600 !important;
              line-height: 1.4;
            }
            .customer-import-toggle input {
              margin-top: 2px;
            }
            .customer-import-warning {
              display: block;
              color: #ef4444;
              line-height: 1.4;
            }
            .agent-search-picker {
              position: relative;
              border: 1px solid #cbd5e1;
              border-radius: 10px;
              background: #f8fafc;
              z-index: 20;
            }
            .agent-search-picker:focus-within {
              z-index: 120;
            }
            .referral-search-picker {
              z-index: 24;
            }
            .referral-search-picker:focus-within {
              z-index: 160;
            }
            .agent-search-head {
              display: grid;
              grid-template-columns: auto 1fr;
              align-items: center;
            }
            .referral-search-head {
              display: block;
            }
            .agent-search-label {
              padding: 10px 12px;
              border-right: 1px solid #cbd5e1;
              color: #334155;
              font-size: 13px;
              font-weight: 600;
              white-space: nowrap;
            }
            .agent-search-head input {
              border: none !important;
              background: transparent !important;
              padding: 10px 12px !important;
              outline: none;
              width: 100%;
              min-height: 42px;
            }
            .referral-search-head input {
              border: none !important;
              background: transparent !important;
              padding: 10px 12px !important;
              outline: none;
              width: 100%;
              min-height: 42px;
            }
            .agent-search-list {
              position: absolute;
              z-index: 180;
              left: 0;
              right: 0;
              top: calc(100% + 6px);
              max-height: 240px;
              overflow-y: auto;
              border: 1px solid #cbd5e1;
              border-radius: 10px;
              background: #ffffff;
              box-shadow: 0 12px 24px rgba(15, 23, 42, 0.16);
            }
            .agent-search-item {
              width: 100%;
              border: none;
              background: #fff;
              padding: 10px 12px;
              display: flex;
              justify-content: space-between;
              align-items: center;
              cursor: pointer;
              font-size: 13px;
              color: #1e293b;
              border-bottom: 1px solid #e2e8f0;
              text-align: left;
            }
            .agent-search-item:last-child {
              border-bottom: none;
            }
            .agent-search-item:hover,
            .agent-search-item.selected {
              background: #e2f2ff;
            }
            .agent-type-badge {
              font-weight: 800;
              font-size: 12px;
              line-height: 1;
              letter-spacing: 0.03em;
            }
            .agent-type-badge.master { color: #0f8a0f; }
            .agent-type-badge.agent { color: #dc2626; }
            .agent-type-badge.super { color: #5b21b6; }
            .agent-type-badge.admin { color: #1d4ed8; }
            .agent-search-empty {
              padding: 10px 12px;
              color: #64748b;
              font-size: 12px;
            }
            .locked-chip {
              display: inline-flex;
              align-items: center;
              margin-left: 6px;
              padding: 1px 6px;
              border-radius: 999px;
              border: 1px solid #d1d5db;
              background: #f8fafc;
              color: #334155;
              font-size: 10px;
              font-weight: 700;
              letter-spacing: 0.02em;
              text-transform: uppercase;
            }
            .duplicate-warning-state {
              border: 1px solid #f1d178;
              border-radius: 10px;
              background: #fff8dd;
              color: #6b4e00;
              padding: 12px;
              margin-top: 10px;
            }
            .duplicate-warning-title {
              font-size: 13px;
              font-weight: 800;
              text-transform: uppercase;
              letter-spacing: 0.3px;
              margin-bottom: 4px;
            }
            .duplicate-warning-message {
              font-size: 13px;
              line-height: 1.4;
              margin-bottom: 8px;
            }
            .duplicate-warning-list {
              display: flex;
              flex-direction: column;
              gap: 6px;
            }
            .duplicate-warning-item {
              display: grid;
              grid-template-columns: minmax(78px, auto) 1fr;
              gap: 2px 10px;
              border: 1px solid #ecd28b;
              border-radius: 8px;
              background: #fffdf2;
              padding: 8px 10px;
              font-size: 12px;
              line-height: 1.25;
            }
            .duplicate-warning-item strong {
              color: #4f3200;
            }
            .duplicate-warning-item span:last-child {
              color: #6f5400;
            }
            @media (max-width: 600px) {
              .duplicate-warning-item {
                grid-template-columns: 1fr;
                gap: 3px;
              }
            }
            @media (max-width: 1280px) {
              .customer-create-shell {
                grid-template-columns: minmax(0, 1fr);
              }
              .customer-create-sidebar {
                display: grid;
                grid-template-columns: repeat(2, minmax(0, 1fr));
              }
            }
            @media (max-width: 900px) {
              .customer-create-top-row {
                gap: 14px;
              }
              .customer-top-field-type,
              .customer-top-field-prefix {
                flex-basis: 160px;
              }
              .customer-top-field-assignment,
              .customer-top-field-username {
                flex-basis: 220px;
              }
              .customer-create-row {
                grid-template-columns: repeat(6, minmax(0, 1fr));
              }
              .customer-field-span-2,
              .customer-field-span-3,
              .customer-field-span-4 {
                grid-column: span 3;
              }
              .customer-field-span-12 {
                grid-column: 1 / -1;
              }
              .assignment-tree-filter-group {
                grid-column: span 6;
              }
            }
            @media (max-width: 720px) {
              .customer-create-sidebar {
                grid-template-columns: 1fr;
              }
            }
            @media (max-width: 640px) {
              .customer-create-top-row {
                display: grid;
                grid-template-columns: 1fr;
                gap: 14px;
              }
              .customer-top-field-type,
              .customer-top-field-prefix,
              .customer-top-field-assignment,
              .customer-top-field-username {
                flex: none;
              }
              .customer-create-row {
                grid-template-columns: 1fr;
                gap: 14px;
              }
              .customer-field-span-2,
              .customer-field-span-3,
              .customer-field-span-4,
              .customer-field-span-12,
              .assignment-tree-filter-group {
                grid-column: 1 / -1;
              }
              .assignment-field-label {
                align-items: flex-start;
                flex-direction: column;
                gap: 6px;
              }
              .customer-create-side-card {
                padding: 16px;
              }
              .commission-remove-cell {
                grid-column: 1 / -1;
              }
              .commission-extra-row {
                margin-top: 0;
              }
            }
          `}</style>
        </>
      )}
    </>
  );
}

export default CustomerCreationWorkspace;
