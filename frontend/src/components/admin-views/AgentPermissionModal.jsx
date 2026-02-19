import React, { useState, useEffect } from 'react';
import { updateAgentPermissions } from '../../api';
import { VIEW_PERMISSION_MAP } from '../../utils/adminPermissions';

const DEFAULT_PERMISSIONS = {
    // General
    updateInfo: true,
    suspendWagering: true,
    enterDepositsWithdrawals: true,
    deleteTransactions: true,
    enterBettingAdjustments: true,
    moveAccounts: true,
    addAccounts: true,

    // Limit and Sport Setup
    changeCreditLimit: true,
    setMinBet: true,
    changeWagerLimit: true,
    adjustParlayTeaser: true,
    setGlobalTeamLimit: true,
    maxWagerSetup: true,
    allowDeny: true,
    juiceSetup: true,
    changeTempCredit: true,
    changeSettleFigure: true,

    views: Object.values(VIEW_PERMISSION_MAP).reduce((acc, key) => {
        acc[key] = true;
        return acc;
    }, {}),
    ipTracker: {
        manage: true
    }
};

const VIEW_LABELS = {
    dashboard: 'Dashboard',
    weeklyFigures: 'Weekly Figures',
    pending: 'Pending',
    messaging: 'Messaging',
    gameAdmin: 'Game Admin',
    customerAdmin: 'Customer Admin',
    agentManager: 'Agent Management',
    cashier: 'Cashier',
    addCustomer: 'Add Customer',
    thirdPartyLimits: '3rd Party Limits',
    props: 'Props / Betting',
    agentPerformance: 'Agent Performance',
    analysis: 'Analysis',
    ipTracker: 'IP Tracker',
    transactionsHistory: 'Transactions History',
    collections: 'Collections',
    deletedWagers: 'Deleted Wagers',
    gamesEvents: 'Games & Events',
    sportsbookLinks: 'Sportsbook Links',
    betTicker: 'Bet Ticker',
    ticketwriter: 'TicketWriter',
    scores: 'Scores',
    masterAgentAdmin: 'Master Agent Admin',
    billing: 'Billing',
    settings: 'Settings',
    monitor: 'System Monitor',
    rules: 'Rules',
    feedback: 'Feedback',
    faq: 'FAQ',
    userManual: 'User Manual',
    profile: 'Profile'
};

const mergeDeep = (base, incoming) => {
    if (!incoming || typeof incoming !== 'object') return base;
    const merged = { ...base };
    Object.keys(incoming).forEach((key) => {
        const nextVal = incoming[key];
        if (nextVal && typeof nextVal === 'object' && !Array.isArray(nextVal)) {
            merged[key] = mergeDeep(base[key] || {}, nextVal);
        } else {
            merged[key] = nextVal;
        }
    });
    return merged;
};

function AgentPermissionModal({ agent, onClose, onUpdate }) {
    const [permissions, setPermissions] = useState(DEFAULT_PERMISSIONS);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (agent) {
            setPermissions(mergeDeep(DEFAULT_PERMISSIONS, agent.permissions || {}));
        }
    }, [agent]);

    const handleToggle = (key) => {
        setPermissions(prev => ({ ...prev, [key]: !prev[key] }));
    };

    const handleNestedToggle = (group, key) => {
        setPermissions(prev => ({
            ...prev,
            [group]: {
                ...(prev[group] || {}),
                [key]: !prev?.[group]?.[key]
            }
        }));
    };

    const handleSave = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            // Call the separate API function for permissions
            await updateAgentPermissions(agent.id || agent._id, permissions, token);

            alert('Permissions updated successfully');
            if (onUpdate) onUpdate();
            onClose();
        } catch (error) {
            console.error('Error updating permissions:', error);
            alert('Failed to update permissions: ' + error.message);
        } finally {
            setLoading(false);
        }
    };

    const renderCheckbox = (key, label) => (
        <div key={key} className="permission-item">
            <label className="checkbox-container">
                <input
                    type="checkbox"
                    checked={permissions[key]}
                    onChange={() => handleToggle(key)}
                />
                <span className="checkmark"></span>
                {label}
            </label>
        </div>
    );

    const renderNestedCheckbox = (group, key, label) => (
        <div key={`${group}.${key}`} className="permission-item">
            <label className="checkbox-container">
                <input
                    type="checkbox"
                    checked={Boolean(permissions?.[group]?.[key])}
                    onChange={() => handleNestedToggle(group, key)}
                />
                <span className="checkmark"></span>
                {label}
            </label>
        </div>
    );

    return (
        <div className="modal-overlay">
            <div className="modal-content permission-modal">
                <div className="modal-header">
                    <h3>Permissions: {agent.username}</h3>
                    <button className="close-btn" onClick={onClose}>&times;</button>
                </div>

                <div className="scrollable-content">
                    <div className="section">
                        <h4>General Account Setup</h4>
                        {renderCheckbox('updateInfo', 'Update Info')}
                        {renderCheckbox('suspendWagering', 'Suspend Wagering')}
                        {renderCheckbox('enterDepositsWithdrawals', 'Enter Deposits / Withdrawals')}
                        {renderCheckbox('deleteTransactions', 'Delete Transactions')}
                        {renderCheckbox('enterBettingAdjustments', 'Enter Betting Adjustments')}
                        {renderCheckbox('moveAccounts', 'Move Accounts')}
                        {renderCheckbox('addAccounts', 'Add Accounts')}
                    </div>

                    <div className="section">
                        <h4>Limit And Sport Setup</h4>
                        {renderCheckbox('changeCreditLimit', 'Change Credit Limit')}
                        {renderCheckbox('setMinBet', 'Set Minimum Bet Amount')}
                        {renderCheckbox('changeWagerLimit', 'Change Wager Limit')}
                        {renderCheckbox('adjustParlayTeaser', 'Adjust Parlay/Teaser Setup')}
                        {renderCheckbox('setGlobalTeamLimit', 'Set Global Team Limit')}
                        {renderCheckbox('maxWagerSetup', 'Max Wager Setup')}
                        {renderCheckbox('allowDeny', 'Allow / Deny')}
                        {renderCheckbox('juiceSetup', 'Juice Setup')}
                        {renderCheckbox('changeTempCredit', 'Change Temp Credit')}
                        {renderCheckbox('changeSettleFigure', 'Change Settle Figure')}
                    </div>

                    <div className="section">
                        <h4>Dashboard Access</h4>
                        {Object.keys(VIEW_LABELS).map((key) => renderNestedCheckbox('views', key, VIEW_LABELS[key]))}
                    </div>

                    <div className="section">
                        <h4>IP Tracker Actions</h4>
                        {renderNestedCheckbox('ipTracker', 'manage', 'Allow Block / Unblock / Whitelist')}
                    </div>
                </div>

                <div className="modal-footer">
                    <button className="btn-secondary" onClick={onClose} disabled={loading}>Cancel</button>
                    <button className="btn-primary" onClick={handleSave} disabled={loading}>
                        {loading ? 'Saving...' : 'Save'}
                    </button>
                </div>
            </div>
            <style>{`
        .permission-modal {
            width: 500px;
            max-width: 90vw;
            display: flex;
            flex-direction: column;
            max-height: 80vh;
        }
        .modal-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            border-bottom: 1px solid #333;
            padding-bottom: 1rem;
            margin-bottom: 1rem;
        }
        .close-btn {
            background: none;
            border: none;
            color: #fff;
            font-size: 1.5rem;
            cursor: pointer;
        }
        .scrollable-content {
            overflow-y: auto;
            flex: 1;
            padding-right: 0.5rem;
        }
        .section {
            margin-bottom: 1.5rem;
        }
        .section h4 {
            color: #ccc;
            border-bottom: 1px solid #444;
            padding-bottom: 0.5rem;
            margin-bottom: 0.5rem;
            font-size: 1rem;
        }
        .permission-item {
            margin-bottom: 0.5rem;
        }
        .checkbox-container {
            display: block;
            position: relative;
            padding-left: 30px;
            margin-bottom: 5px;
            cursor: pointer;
            font-size: 0.9rem;
            user-select: none;
            color: #eee;
        }
        .checkbox-container input {
            position: absolute;
            opacity: 0;
            cursor: pointer;
            height: 0;
            width: 0;
        }
        .checkmark {
            position: absolute;
            top: 2px;
            left: 0;
            height: 18px;
            width: 18px;
            background-color: #eee;
            border-radius: 3px;
        }
        .checkbox-container:hover input ~ .checkmark {
            background-color: #ccc;
        }
        .checkbox-container input:checked ~ .checkmark {
            background-color: #e67e22; /* Warning/Orange color often used in betting apps */
        }
        .checkmark:after {
            content: "";
            position: absolute;
            display: none;
        }
        .checkbox-container input:checked ~ .checkmark:after {
            display: block;
        }
        .checkbox-container .checkmark:after {
            left: 6px;
            top: 2px;
            width: 4px;
            height: 9px;
            border: solid white;
            border-width: 0 2px 2px 0;
            transform: rotate(45deg);
        }
        .modal-footer {
            border-top: 1px solid #333;
            padding-top: 1rem;
            margin-top: 1rem;
            display: flex;
            justify-content: flex-end;
            gap: 1rem;
        }
      `}</style>
        </div>
    );
}

export default AgentPermissionModal;
