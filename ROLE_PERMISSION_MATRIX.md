# ROLE-PERMISSION MATRIX
## Sports Gaming Platform - Comprehensive Access Control

---

## 1. PERMISSION MATRIX OVERVIEW

| # | Permission | Category | ADMIN | AGENT | USER | Description |
|----|-----------|----------|:-----:|:-----:|:----:|-------------|
| **USER MANAGEMENT** |
| 1 | admin.create_agent | User Mgmt | ✅ | ❌ | ❌ | Create new agent accounts |
| 2 | admin.create_user | User Mgmt | ✅ | ✅* | ❌ | Create new user accounts |
| 3 | admin.view_all_users | User Mgmt | ✅ | ❌ | ❌ | View all users in platform |
| 4 | admin.view_all_agents | User Mgmt | ✅ | ❌ | ❌ | View all agents in platform |
| 5 | admin.edit_user | User Mgmt | ✅ | ✅* | ❌ | Edit user profiles |
| 6 | admin.suspend_user | User Mgmt | ✅ | ✅* | ❌ | Suspend/ban users |
| 7 | admin.delete_user | User Mgmt | ✅ | ❌ | ❌ | Permanently delete users |
| 8 | user.edit_profile | User Mgmt | ✅ | ✅ | ✅ | Edit own profile |
| 9 | user.change_password | User Mgmt | ✅ | ✅ | ✅ | Change own password |
| **FINANCIAL MANAGEMENT** |
| 10 | financial.deposit | Financial | ✅ | ✅* | ✅ | Deposit funds to account |
| 11 | financial.withdraw | Financial | ✅ | ✅* | ✅ | Withdraw funds from account |
| 12 | financial.approve_withdrawal | Financial | ✅ | ✅* | ❌ | Approve withdrawal requests |
| 13 | financial.view_balance | Financial | ✅ | ✅* | ✅ | View account balance |
| 14 | financial.view_transactions | Financial | ✅ | ✅* | ✅ | View transaction history |
| 15 | financial.view_all_transactions | Financial | ✅ | ❌ | ❌ | View all platform transactions |
| 16 | financial.refund_bet | Financial | ✅ | ❌ | ❌ | Manually refund bets |
| **BETTING & GAMING** |
| 17 | betting.place_bet | Betting | ✅ | ✅ | ✅ | Place bets on events |
| 18 | betting.view_bets | Betting | ✅ | ✅* | ✅ | View own/user bets |
| 19 | betting.view_all_bets | Betting | ✅ | ❌ | ❌ | View all platform bets |
| 20 | betting.settle_bets | Betting | ✅ | ❌ | ❌ | Settle/finalize bets |
| 21 | betting.manage_odds | Betting | ✅ | ❌ | ❌ | Manage sports odds |
| **COMMISSION & AGENT MANAGEMENT** |
| 22 | commission.view_own | Commission | ✅ | ✅ | ❌ | View own commission balance |
| 23 | commission.calculate | Commission | ✅ | ❌ | ❌ | Calculate monthly commissions |
| 24 | commission.approve | Commission | ✅ | ❌ | ❌ | Approve commission payouts |
| 25 | commission.view_all | Commission | ✅ | ❌ | ❌ | View all agent commissions |
| 26 | agent.view_users | Agent Mgmt | ✅ | ✅ | ❌ | View own users |
| 27 | agent.view_hierarchy | Agent Mgmt | ✅ | ✅ | ❌ | View own agency hierarchy |
| **REPORTING & ANALYTICS** |
| 28 | reporting.view_analytics | Reporting | ✅ | ❌ | ❌ | View platform analytics |
| 29 | reporting.generate_reports | Reporting | ✅ | ✅ | ❌ | Generate reports |
| 30 | reporting.view_audit_logs | Reporting | ✅ | ❌ | ❌ | View audit logs |
| **SYSTEM MANAGEMENT** |
| 31 | system.configure | System | ✅ | ❌ | ❌ | Configure system settings |
| 32 | system.manage_matches | System | ✅ | ❌ | ❌ | Create/manage sports events |
| 33 | system.manage_leagues | System | ✅ | ❌ | ❌ | Create/manage leagues |

**Legend**: ✅ = Full Access | ✅* = Scoped Access (see conditions below) | ❌ = No Access

---

## 2. SCOPED PERMISSION DETAILS (✅*)

### 2.1 Agent-Scoped Permissions

Agents can only perform actions on their own users and data:

#### `admin.create_user` (Agent Scope)
```
Condition: Agent can only create USER role
Restriction: parent_id must be the agent's own ID
Example:
  - Agent-1 can create users under Agent-1
  - Agent-1 CANNOT create agents
  - Agent-1 CANNOT create users under Agent-2
```

#### `admin.edit_user` (Agent Scope)
```
Condition: Agent can only edit direct user profiles
Restriction: User must have parent_id = agent's ID
Fields allowed: full_name, phone, timezone, notifications_enabled
Fields BLOCKED: balance, role, parent_id, status (except SUSPEND)
```

#### `admin.suspend_user` (Agent Scope)
```
Condition: Agent can only suspend/ban own users
Cannot unsuspend or change status except to SUSPENDED/BANNED
Cannot delete users
```

#### `financial.deposit` (Agent Scope)
```
Condition: Agent can deposit to own users' accounts
Cannot withdraw from user accounts
Cannot modify other agents' users
Amount restrictions configurable per agent
```

#### `financial.withdraw` (Agent Scope)
```
Condition: User can withdraw own funds only
Agent can approve own user withdrawals
Cannot withdraw for other users
Must verify agent commission balance before payout
```

#### `financial.approve_withdrawal` (Agent Scope)
```
Condition: Agent can approve own user withdrawals
Cannot approve other agents' withdrawals
Requires verification: User balance >= withdrawal amount
Generates audit log automatically
```

#### `betting.view_bets` (Agent Scope)
```
Condition: Agent can view all bets from own users
Cannot view other agents' users' bets
Can filter by: status, bet_type, date_range, amount
```

---

## 3. DETAILED PERMISSION DESCRIPTIONS

### 3.1 User Management Permissions

#### `admin.create_agent` (Admin Only)
- **Role Required**: ADMIN
- **Purpose**: Create new agent accounts
- **Parameters**: 
  - username (unique)
  - email (unique)
  - password (hashed)
  - full_name
  - phone
  - commission_rate (%)
- **Result**: New AGENT user with parent_id = ADMIN
- **Audit**: Logged with agent creation details

#### `admin.create_user` (Admin + Agent)
- **Role Required**: ADMIN or AGENT
- **Purpose**: Create new player/user accounts
- **Parameters**:
  - username (unique)
  - email (unique)
  - password
  - full_name, phone
  - [role = 'USER' always]
- **ADMIN Scope**: Can create under any agent
- **AGENT Scope**: Can only create under self
- **Result**: New USER account linked to parent agent
- **Audit**: Logged with creator and parent info

#### `admin.view_all_users` (Admin Only)
- **Role Required**: ADMIN
- **Purpose**: View all platform users
- **Restrictions**: None
- **Output Fields**:
  - id, username, email, full_name, role, status
  - balance, total_wagered, lifetime_winnings
  - parent_id, created_at, last_login
- **Filters Available**:
  - role (ADMIN, AGENT, USER)
  - status (ACTIVE, INACTIVE, SUSPENDED, BANNED)
  - parent_id
  - kyc_status
  - date_range (created_at)

#### `admin.view_all_agents` (Admin Only)
- **Role Required**: ADMIN
- **Purpose**: View all agent accounts
- **Output Includes**: User counts, commission rates, revenue
- **Additional Info**:
  - Total users (from agent_hierarchy.total_users)
  - Total sub-agents (from agent_hierarchy.total_sub_agents)
  - Total revenue (monthly)
  - Agent level (depth in hierarchy)

#### `admin.edit_user` (Admin + Agent*)
- **Role Required**: ADMIN or AGENT
- **Purpose**: Modify user profile information
- **ADMIN Allowed Fields**: All user fields
- **AGENT Allowed Fields**: 
  - full_name
  - phone
  - timezone
  - preferred_language
  - notifications_enabled
- **AGENT Restrictions**: Cannot edit own users' financial data
- **Audit**: Old & new values logged

#### `admin.suspend_user` (Admin + Agent*)
- **Role Required**: ADMIN or AGENT
- **Purpose**: Suspend or ban user accounts
- **Status Changes**:
  - ACTIVE → SUSPENDED
  - ACTIVE → BANNED
  - SUSPENDED → ACTIVE (admin only)
- **Effects**:
  - User cannot login
  - User cannot place bets
  - User can view history but not transact
- **AGENT Scope**: Can suspend own users only
- **Audit**: Suspension reason logged

#### `admin.delete_user` (Admin Only)
- **Role Required**: ADMIN
- **Purpose**: Permanently delete user account
- **Method**: Soft delete (deleted_at timestamp)
- **Preservation**: All historical data retained for audit
- **Cannot Delete**: Users with pending bets
- **Audit**: Deletion timestamp and reason logged

#### `user.edit_profile` (All Roles)
- **Role Required**: ADMIN, AGENT, or USER
- **Purpose**: Edit own profile information
- **Allowed Fields**:
  - full_name
  - phone
  - timezone
  - preferred_language
  - notifications_enabled
  - two_factor_enabled
- **Restricted Fields**:
  - username (immutable)
  - email (immutable after verification)
  - role (immutable)
  - balance (immutable)

#### `user.change_password` (All Roles)
- **Role Required**: Any authenticated user
- **Purpose**: Change own password
- **Verification**: Current password required
- **Policy**: 
  - Minimum 8 characters
  - Must contain uppercase, lowercase, number, special char
  - Cannot reuse last 5 passwords
- **Result**: Password hash updated in database
- **Audit**: Password change logged (password value not logged)

---

### 3.2 Financial Management Permissions

#### `financial.deposit` (All Roles)
- **Role Required**: ADMIN, AGENT, USER
- **Purpose**: Add funds to account
- **USER Context**: Deposit own funds
- **AGENT Context**: Deposit to own user accounts
- **ADMIN Context**: Deposit to any account
- **Process**:
  1. Create DEPOSIT transaction
  2. Update user.balance
  3. Log transaction
  4. Send confirmation notification
- **Maximum Daily Deposit**: Configurable per jurisdiction
- **Payment Methods**: External payment gateway integration

#### `financial.withdraw` (Admin + Agent + User)
- **USER Context**: Withdraw own funds
  - Requires: balance >= withdrawal_amount
  - Minimum: Configurable
  - Maximum daily: Configurable
- **AGENT Context**: Can withdraw own commission balance
  - Requires: Commission status = APPROVED
  - Restricted: Cannot withdraw if negative balance
- **ADMIN Context**: Can approve withdrawals system-wide
- **Audit**: Withdrawal request logged

#### `financial.approve_withdrawal` (Admin + Agent*)
- **Role Required**: ADMIN or AGENT
- **Purpose**: Approve pending withdrawal requests
- **ADMIN**: Approve any withdrawal
- **AGENT**: Approve own user withdrawals only
- **Conditions**:
  - User balance must cover amount
  - No pending chargebacks
  - KYC status must be VERIFIED (for amounts > threshold)
  - Account not suspended
- **Approval Flow**:
  - Mark transaction status = COMPLETED
  - Generate payout instruction
  - Notify user
  - Audit log created

#### `financial.view_balance` (All Roles)
- **USER Context**: View own balance
- **AGENT Context**: View own balance + own users' balances
- **ADMIN Context**: View any balance
- **Output**:
  - Current balance
  - Last 10 transactions
  - Pending transactions
  - Account status

#### `financial.view_transactions` (All Roles)
- **USER Context**: View own transaction history
  - Can filter: type, status, date_range
  - Default: Last 30 days
- **AGENT Context**: View own user transactions
  - Can filter: user_id, type, status, date_range
  - Cannot view transaction details (amounts hidden)
- **ADMIN Context**: View all transactions
  - Full access to all fields
  - Can export reports

#### `financial.view_all_transactions` (Admin Only)
- **Role Required**: ADMIN
- **Purpose**: View all platform transactions
- **Includes**: Cross-user analytics
- **Filters**:
  - User/Agent ID
  - Transaction type
  - Status (PENDING, COMPLETED, FAILED, REVERSED)
  - Date range
  - Amount range
- **Export Options**: CSV, Excel, PDF

#### `financial.refund_bet` (Admin Only)
- **Role Required**: ADMIN
- **Purpose**: Manually refund bet amounts
- **Conditions**:
  - Bet must exist
  - Can only refund if status in (PENDING, WON, LOST)
  - Reason required
- **Process**:
  1. Create refund transaction
  2. Update user balance (+stake)
  3. Update bet status = REFUNDED
  4. Log refund details
- **Audit**: Refund reason and approver logged

---

### 3.3 Betting & Gaming Permissions

#### `betting.place_bet` (All Roles)
- **Role Required**: ADMIN, AGENT, USER
- **Who Can Place**:
  - USER: Can place own bets
  - AGENT: Can place bets (for testing/support)
  - ADMIN: Can place bets (for testing)
- **Validations**:
  - User status = ACTIVE
  - User balance >= stake
  - Match exists and is not closed
  - Odds are current
  - Bet amount within limits
- **Process**:
  1. Create BET record
  2. Deduct stake from balance
  3. Create BET_STAKE transaction
  4. Generate bet confirmation
- **Audit**: Bet creation logged (without odds manipulation risk)

#### `betting.view_bets` (All Roles)
- **USER Context**: View own bets
  - All statuses visible
  - Full bet details
  - Bet settlement details
- **AGENT Context**: View own users' bets
  - Aggregated summaries
  - User-level filtering
  - Status breakdown
  - Cannot see individual bet stakes (privacy)
- **ADMIN Context**: View all bets
  - Full access
  - All details visible
  - Can filter by any field

#### `betting.view_all_bets` (Admin Only)
- **Role Required**: ADMIN
- **Purpose**: System-wide bet analytics
- **Includes**:
  - Total bets placed (count & amount)
  - Win/loss ratio
  - Most popular bets
  - Suspicious patterns
- **Filters Available**:
  - User/Agent/League
  - Bet type (WIN, DRAW, LOSE, OVER, UNDER, etc.)
  - Status (PENDING, WON, LOST, REFUNDED)
  - Odds range
  - Date range
  - Amount range

#### `betting.settle_bets` (Admin Only)
- **Role Required**: ADMIN
- **Purpose**: Finalize bet outcomes
- **Process**:
  1. Verify match result data
  2. Determine winning bets
  3. Update BET status → WON/LOST
  4. For winning bets:
     - Calculate payout = stake × odds
     - Add to user balance
     - Create BET_WINNINGS transaction
  5. Update agent commission tracking
  6. Archive completed bets
- **Audit**: Settlement logged with match result proof

#### `betting.manage_odds` (Admin Only)
- **Role Required**: ADMIN
- **Purpose**: Update sports event odds
- **Allowed Actions**:
  - Set initial odds for new events
  - Update live odds during match
  - Close betting (lock odds)
  - Adjust odds if data error detected
  - Open/close specific bet types
- **Restrictions**:
  - Cannot adjust odds after match start
  - Cannot adjust odds retroactively
  - Changes logged for audit
- **Integrations**: Can import odds from external sources

---

### 3.4 Commission & Agent Management Permissions

#### `commission.view_own` (Admin + Agent)
- **Role Required**: ADMIN or AGENT
- **ADMIN**: View own system commission (if applicable)
- **AGENT**: View own commission balance
- **Output**:
  - Current month commission
  - Previous month commission
  - Pending payout balance
  - Commission rate
  - YTD total commission
- **Details Shown**:
  - Total users wagered amount
  - House profit generated
  - Commission percentage applied
  - Commission calculation breakdown

#### `commission.calculate` (Admin Only)
- **Role Required**: ADMIN
- **Purpose**: Calculate monthly commissions
- **Process**:
  1. For each AGENT:
     - Sum all user bets for period: `users_wagered`
     - Calculate house profit: `users_wagered × house_margin`
     - Calculate commission: `house_profit × agent_rate`
  2. Create agent_commissions record
  3. Update agent_hierarchy.total_revenue cache
- **Formula**:
  ```
  agent_commission = SUM(user_bets) × house_margin_% × agent_rate_%
  Example: $100,000 wagered × 5% margin × 15% rate = $750
  ```
- **Frequency**: Monthly (usually 1st day of month)
- **Audit**: All calculations logged

#### `commission.approve` (Admin Only)
- **Role Required**: ADMIN
- **Purpose**: Approve agent commission payouts
- **Process**:
  1. Review commission calculation
  2. Mark status = APPROVED
  3. Generate payout instruction
  4. Create COMMISSION transaction
  5. Update agent balance (+commission)
- **Validation**:
  - Agent status = ACTIVE
  - Commission amount > 0
  - No pending disputes
- **Audit**: Approval logged with approver ID

#### `commission.view_all` (Admin Only)
- **Role Required**: ADMIN
- **Purpose**: View all agent commissions
- **Access**:
  - All agents' commission records
  - Historical commissions
  - Status (PENDING, APPROVED, PAID)
  - Payout dates
- **Reports Available**:
  - Total commission paid (period)
  - Top earning agents
  - Commission trends
  - Pending payouts

#### `agent.view_users` (Admin + Agent)
- **Role Required**: ADMIN or AGENT
- **ADMIN Context**: View any agent's users
- **AGENT Context**: View own users
- **Output Per User**:
  - id, username, email, status
  - balance, total_wagered, lifetime_winnings
  - created_at, last_login
  - KYC status
- **Sorting/Filtering**:
  - By status
  - By join date
  - By activity
  - By balance

#### `agent.view_hierarchy` (Admin + Agent)
- **Role Required**: ADMIN or AGENT
- **ADMIN Context**: View complete platform hierarchy
- **AGENT Context**: View own hierarchy
  - Direct users
  - Direct sub-agents (if applicable)
  - Tree structure visualization
- **Information**:
  - Each agent's user count
  - Each agent's commission rate
  - Revenue by level
  - Performance metrics

---

### 3.5 Reporting & Analytics Permissions

#### `reporting.view_analytics` (Admin Only)
- **Role Required**: ADMIN
- **Platform-wide Metrics**:
  - Total users (active/inactive/suspended)
  - Total bets (volume, value)
  - Total wagered (per day/week/month)
  - Win rate percentage
  - Revenue breakdown
  - Agent performance comparison
- **Dashboards Available**:
  - Platform overview
  - User growth trends
  - Betting patterns
  - Revenue trends
  - Compliance metrics

#### `reporting.generate_reports` (Admin + Agent)
- **Role Required**: ADMIN or AGENT
- **ADMIN Available Reports**:
  - Platform financial summary
  - Agent performance report
  - User acquisition report
  - Betting activity report
  - Compliance report
  - Fraud detection report
- **AGENT Available Reports**:
  - Agent-specific summary
  - User activity report
  - Commission report
  - Revenue breakdown
- **Export Formats**: PDF, Excel, CSV
- **Scheduling**: Can schedule periodic reports

#### `reporting.view_audit_logs` (Admin Only)
- **Role Required**: ADMIN
- **Purpose**: View system audit trail
- **Includes**:
  - All user modifications
  - All permission-gated actions
  - Financial transactions
  - Bet settlements
  - Admin actions
- **Fields Visible**:
  - Who: user_id, username
  - What: action, entity_type, entity_id
  - When: timestamp
  - Changes: old_values, new_values
  - Where: ip_address, user_agent
- **Filters Available**:
  - User ID
  - Action type
  - Entity type
  - Date range
  - IP address

---

### 3.6 System Management Permissions

#### `system.configure` (Admin Only)
- **Role Required**: ADMIN
- **Configurable Settings**:
  - Min/max bet amounts
  - Min/max deposit/withdrawal
  - Commission rates per agent
  - KYC thresholds
  - Betting hours
  - Odds update frequency
  - Fraud detection rules
  - Email/SMS templates
  - Currency settings
- **Audit**: All configuration changes logged

#### `system.manage_matches` (Admin Only)
- **Role Required**: ADMIN
- **Actions**:
  - Create new sports event/match
  - Set initial odds
  - Update match details
  - Close match (no new bets)
  - Cancel match (refund all bets)
  - Reopen match (if cancelled)
- **Fields**:
  - Event name, league, teams/competitors
  - Start time
  - Event type
  - Available bet types
  - Initial odds
  - Status (OPEN, CLOSED, CANCELLED)

#### `system.manage_leagues` (Admin Only)
- **Role Required**: ADMIN
- **Actions**:
  - Create new league
  - Edit league details
  - Activate/deactivate league
  - Set league-specific odds rules
- **Information**:
  - League name
  - Sport type
  - Country/Region
  - Season dates
  - Status

---

## 4. PERMISSION DEPENDENCY MAP

```
┌─────────────────────────────────────────────────┐
│  ADMIN PERMISSIONS (All-Access)                 │
└─────────────────────────────────────────────────┘
         │
         ├──► SYSTEM SETUP CHAIN
         │    ├── system.configure
         │    ├── system.manage_matches
         │    └── system.manage_leagues
         │
         ├──► USER MANAGEMENT CHAIN
         │    ├── admin.create_agent
         │    ├── admin.create_user ──► user.edit_profile
         │    ├── admin.edit_user
         │    ├── admin.suspend_user
         │    ├── admin.delete_user
         │    └── admin.view_all_users
         │
         ├──► FINANCIAL CHAIN
         │    ├── financial.deposit
         │    ├── financial.withdraw
         │    ├── financial.approve_withdrawal
         │    ├── financial.view_all_transactions ──► financial.refund_bet
         │    └── commission.approve ──► commission.view_all
         │
         ├──► BETTING CHAIN
         │    ├── betting.manage_odds
         │    ├── betting.settle_bets
         │    ├── betting.view_all_bets
         │    └── betting.place_bet
         │
         └──► REPORTING & AUDIT
              ├── reporting.view_audit_logs
              ├── reporting.view_analytics
              └── reporting.generate_reports


┌─────────────────────────────────────────────────┐
│  AGENT PERMISSIONS (Scoped Access)              │
└─────────────────────────────────────────────────┘
         │
         ├──► USER MANAGEMENT (Own Users Only)
         │    ├── admin.create_user (own agency)
         │    ├── admin.edit_user (own users)
         │    ├── admin.suspend_user (own users)
         │    ├── agent.view_users
         │    └── agent.view_hierarchy
         │
         ├──► FINANCIAL (Own Agency)
         │    ├── financial.deposit (own users)
         │    ├── financial.approve_withdrawal (own users)
         │    ├── financial.view_balance (own + users)
         │    ├── financial.view_transactions (own + users)
         │    ├── commission.view_own
         │    └── financial.withdraw (own commission)
         │
         ├──► BETTING (Own Users)
         │    ├── betting.place_bet
         │    └── betting.view_bets (own users)
         │
         └──► REPORTING
              ├── reporting.generate_reports (own data)
              └── user.edit_profile (own profile)


┌─────────────────────────────────────────────────┐
│  USER PERMISSIONS (Self-Access)                 │
└─────────────────────────────────────────────────┘
         │
         ├──► ACCOUNT MANAGEMENT
         │    ├── user.edit_profile (own)
         │    └── user.change_password
         │
         ├──► FINANCIAL
         │    ├── financial.deposit (own)
         │    ├── financial.withdraw (own)
         │    ├── financial.view_balance (own)
         │    └── financial.view_transactions (own)
         │
         └──► BETTING
              ├── betting.place_bet
              └── betting.view_bets (own)
```

---

## 5. DATA ACCESS PATTERNS

### 5.1 What Data Can Be Accessed

```javascript
// ADMIN can access
{
  users: "ALL users in system",
  bets: "ALL bets in system",
  transactions: "ALL transactions",
  agents: "ALL agents + hierarchies",
  commissions: "ALL commissions",
  auditLogs: "ALL audit logs",
  system: "ALL configuration"
}

// AGENT can access
{
  users: "Own users only (where parent_id = agent.id)",
  bets: "Own users' bets only",
  transactions: "Own users' transactions only",
  balance: "Own balance + own users' balances",
  commissions: "Own commission only",
  auditLogs: "NONE",
  system: "NONE"
}

// USER can access
{
  users: "Own profile only",
  bets: "Own bets only",
  transactions: "Own transactions only",
  balance: "Own balance only",
  commissions: "NONE",
  auditLogs: "NONE",
  system: "NONE"
}
```

---

## 6. IMPLEMENTATION CHECKLIST

- [ ] Create roles_permissions seed table with all permissions
- [ ] Implement PermissionMiddleware.require() for route protection
- [ ] Implement scoped access checks in controllers
- [ ] Add permission caching with Redis
- [ ] Implement audit logging for all permission-gated actions
- [ ] Create admin dashboard showing all users/agents
- [ ] Create agent dashboard showing own users
- [ ] Create user profile page (self-access only)
- [ ] Test permission denials
- [ ] Test permission grants
- [ ] Load test with concurrent permission checks
- [ ] Document all permission codes

---

## 7. SECURITY CONSIDERATIONS

1. **Always check scopes**: Not just permission, but also data ownership
2. **Log all denials**: For security monitoring
3. **Cache carefully**: Refresh permission cache on user role changes
4. **Validate inputs**: Don't trust client-side permission displays
5. **Use transactions**: Ensure atomicity of multi-step operations
6. **Audit trail**: All administrative actions must be logged
7. **Rate limiting**: Prevent brute-force permission attacks

---

## CONCLUSION

This permission matrix provides:
✅ Clear role hierarchies  
✅ Scoped agent access  
✅ Comprehensive user audit trail  
✅ Scalable permission system  
✅ Easy to extend for new features  

