# Entity Relationship Diagram (ERD) & Analysis
## Role-Based Access Control System

---

## 1. COMPLETE ERD (Text & ASCII Representation)

### 1.1 Logical Diagram

```
┌──────────────────────────────────────────────────────────────┐
│                    HIERARCHICAL STRUCTURE                     │
└──────────────────────────────────────────────────────────────┘

                      [ADMIN]
                       │(id=1)
            ┌──────────┼──────────┐
            │          │          │
         [AGENT-1]  [AGENT-2]  [AGENT-3]
         (id=2)     (id=3)     (id=4)
          │          │          │
       ┌──┴──┐    ┌──┴──┐    ┌──┴──┐
    [USER] [USER] [USER] [USER] [USER] [USER]
    (2.1) (2.2)   (3.1) (3.2)   (4.1) (4.2)


┌────────────────────────────────────────────────────────────────┐
│                    CORE ENTITY DIAGRAM                          │
└────────────────────────────────────────────────────────────────┘

    ┌─────────────────────────┐
    │        USERS            │
    ├─────────────────────────┤
    │ PK: id                  │
    │ ----                    │
    │ username (UNIQUE)       │
    │ email (UNIQUE)          │
    │ password_hash           │
    │ full_name               │
    │ phone                   │
    │ role (ENUM)             │◄─── FK: parent_id
    │ parent_id (FK) ◄────────┼─────────┐
    │ status (ENUM)           │         │
    │ balance                 │         │
    │ total_wagered           │         │
    │ lifetime_winnings       │         │
    │ preferred_language      │         │
    │ timezone                │         │
    │ notifications_enabled   │         │
    │ kyc_status              │         │
    │ kyc_verified_at         │         │
    │ two_factor_enabled      │         │
    │ created_at              │         │
    │ updated_at              │         │
    │ last_login              │         │
    │ deleted_at              │         │
    └─────────────────────────┘         │
            │        ▲                  │
            │        │                  │
            │        │ Self-Reference   │
            │        └──────────────────┘
            │
            │
            ├──────────────────────────────┐
            │                              │
            │                              │
    ┌───────▼──────────┐      ┌──────────▼──────────┐
    │ROLES_PERMISSIONS │      │  AGENT_HIERARCHY    │
    ├──────────────────┤      ├─────────────────────┤
    │ PK: id           │      │ PK: id              │
    │ role (ENUM)      │      │ agent_id (FK,UNQ)   │
    │ permission (UK)  │      │ parent_agent_id(FK) │
    │ description      │      │ agent_level         │
    │ category         │      │ total_users (cached)│
    │ created_at       │      │ total_sub_agents    │
    └──────────────────┘      │ total_revenue       │
                              │ created_at          │
                              │ updated_at          │
                              └─────────────────────┘
            │
            │
            │ (Logged by)
            │
    ┌───────▼──────────────────┐
    │    AUDIT_LOGS            │
    ├──────────────────────────┤
    │ PK: id (BIGINT)          │
    │ user_id (FK) ◄───────────┼─── Admin action
    │ action                   │
    │ entity_type              │
    │ entity_id                │
    │ old_values (JSON)        │
    │ new_values (JSON)        │
    │ ip_address               │
    │ user_agent               │
    │ created_at (PARTITIONED) │
    └──────────────────────────┘


┌────────────────────────────────────────────────────────────────┐
│                    FINANCIAL & GAMING TABLES                    │
└────────────────────────────────────────────────────────────────┘

    ┌──────────────────────┐
    │       USERS          │
    │                      │
    │ (Central Hub)        │
    └──────────┬───────────┘
               │
        ┌──────┼──────┐
        │      │      │
        │      │      │
    ┌───▼──┐ │   ┌───▼──────────────┐
    │ BETS │ │   │ TRANSACTIONS     │
    └──────┘ │   └──────────────────┘
        (HIGH-VOLUME)│ (HIGH-VOLUME)
                │
    ┌───────────▼──────────────┐
    │ AGENT_COMMISSIONS        │
    └──────────────────────────┘


┌────────────────────────────────────────────────────────────────┐
│                  DETAILED RELATIONSHIP MATRIX                   │
└────────────────────────────────────────────────────────────────┘

TABLE: USERS (1,M)──────┐
                        │
      ┌─────────────────┼─────────────────┐
      │                 │                 │
  BETS(M,1)      TRANSACTIONS(M,1)   AUDIT_LOGS(M,1)
  (user_id FK)   (user_id FK)        (user_id FK)
  
AGENT_HIERARCHY: 1:1 relationship with USERS where role='AGENT'
AGENT_COMMISSIONS: M:1 with USERS where role='AGENT'

ROLES_PERMISSIONS: Reference table (no FK relationships)
                   Defines permissions per role


    Users (N) ◄─────parent_id─────┐
                                   │
                          Users (1)
                        parent_id is FK


┌────────────────────────────────────────────────────────────────┐
│                      CARDINALITY SUMMARY                        │
└────────────────────────────────────────────────────────────────┘

Relationship                          Cardinality    Explanation
────────────────────────────────────────────────────────────────
USERS ──parent_id──> USERS            (N:1)          Many users per parent
USERS ──1:1──> AGENT_HIERARCHY        (1:1)          One agent = one record
USERS ──1:M──> BETS                   (1:M)          One user can have many bets
USERS ──1:M──> TRANSACTIONS           (1:M)          One user can have many transactions
USERS ──1:M──> AUDIT_LOGS             (1:M)          One admin logs many actions
USERS(AGENT) ──1:M──> AGENT_COMMISSIONS (1:M)       One agent has many commission periods
ROLES_PERMISSIONS ──role──> USERS     (Reference)    Defines role capabilities
```

---

## 2. DETAILED TABLE RELATIONSHIPS

### 2.1 USERS ↔ USERS (Self-Reference: parent_id)

**Purpose**: Creates hierarchical relationships between ADMIN → AGENT → USER

**Relationship Type**: Adjacency List (Adjacency List model)

```
ADMIN (id=1)
├── parent_id = NULL
└── role = 'ADMIN'

AGENT-1 (id=2)
├── parent_id = 1 (ADMIN)
└── role = 'AGENT'

AGENT-2 (id=3)
├── parent_id = 1 (ADMIN)
└── role = 'AGENT'

USER-1 (id=10)
├── parent_id = 2 (AGENT-1)
└── role = 'USER'

USER-2 (id=11)
├── parent_id = 2 (AGENT-1)
└── role = 'USER'
```

**Query Example**: Get all users under AGENT-1
```sql
SELECT * FROM users 
WHERE parent_id = 2 AND role = 'USER';
```

**Query Example**: Get full hierarchy path (recursive)
```sql
WITH RECURSIVE user_path AS (
  SELECT id, username, parent_id, 0 as level
  FROM users
  WHERE id = 10  -- USER-1
  
  UNION ALL
  
  SELECT u.id, u.username, u.parent_id, up.level + 1
  FROM users u
  JOIN user_path up ON u.id = up.parent_id
)
SELECT * FROM user_path;
-- Returns: USER-1 → AGENT-1 → ADMIN
```

---

### 2.2 USERS ↔ BETS (One-to-Many)

**Purpose**: Track all bets placed by users

**Relationship Type**: One-to-Many (1:M)

```
USER (id=100)
├── username = 'john_smith'
├── balance = 1000.00
└── Created on: 2026-01-20
    │
    └──► BET (id=1001)
    │    ├── user_id = 100
    │    ├── stake = 50.00
    │    ├── odds = 2.5
    │    └── status = 'PENDING'
    │
    ├──► BET (id=1002)
    │    ├── user_id = 100
    │    ├── stake = 100.00
    │    ├── odds = 1.8
    │    └── status = 'WON'
    │
    └──► BET (id=1003)
         ├── user_id = 100
         ├── stake = 75.00
         ├── odds = 3.2
         └── status = 'LOST'
```

**Key Features**:
- Denormalized `agent_id` in BETS for fast agent reporting
- Foreign key constraints ensure referential integrity
- Status tracking (PENDING, WON, LOST, REFUNDED, CANCELLED)

**High-Volume Optimization**:
- Partitioned by year for faster queries
- Indexes on (user_id, created_at) and (agent_id, status, created_at)
- Archive old bets after 1+ years to archive table

---

### 2.3 USERS ↔ TRANSACTIONS (One-to-Many)

**Purpose**: Immutable ledger of all financial transactions

**Relationship Type**: One-to-Many (1:M)

```
USER (id=100)
│
└──► TRANSACTION (id=T001)
│    ├── user_id = 100
│    ├── type = 'DEPOSIT'
│    ├── amount = 500.00
│    ├── balance_before = 0.00
│    ├── balance_after = 500.00
│    └── created_at = 2026-01-20 10:00:00
│
├──► TRANSACTION (id=T002)
│    ├── user_id = 100
│    ├── type = 'BET_STAKE'
│    ├── amount = -50.00
│    ├── balance_before = 500.00
│    ├── balance_after = 450.00
│    ├── reference_type = 'BET'
│    ├── reference_id = '1001'
│    └── created_at = 2026-01-20 10:05:00
│
└──► TRANSACTION (id=T003)
     ├── user_id = 100
     ├── type = 'BET_WINNINGS'
     ├── amount = +90.00
     ├── balance_before = 450.00
     ├── balance_after = 540.00
     ├── reference_type = 'BET'
     ├── reference_id = '1002'
     └── created_at = 2026-01-20 15:30:00
```

**Transaction Types**:
- DEPOSIT: Money into account
- WITHDRAWAL: Money out of account
- BET_STAKE: Bet placed (debit)
- BET_WINNINGS: Bet won (credit)
- BONUS: Promotional bonus
- COMMISSION: Agent commission payout
- REFUND: Refund of bet
- CHARGEBACK: Payment reversal

**Immutability**:
- No UPDATE allowed on completed transactions
- No DELETE allowed (soft deletes only)
- Append-only ledger for audit compliance

---

### 2.4 USERS (ADMIN) ↔ AUDIT_LOGS (One-to-Many)

**Purpose**: Track all administrative actions

**Relationship Type**: One-to-Many (1:M)

```
ADMIN (id=1, username='admin')
│
└──► AUDIT_LOG (id=AL001)
│    ├── user_id = 1 (ADMIN)
│    ├── action = 'create_agent'
│    ├── entity_type = 'users'
│    ├── entity_id = 2 (AGENT-1)
│    ├── new_values = {"role":"AGENT","username":"agent1"}
│    ├── ip_address = '192.168.1.100'
│    └── created_at = 2026-01-20 09:00:00
│
├──► AUDIT_LOG (id=AL002)
│    ├── user_id = 1
│    ├── action = 'create_user'
│    ├── entity_type = 'users'
│    ├── entity_id = 10
│    ├── new_values = {"role":"USER","username":"john_smith"}
│    └── created_at = 2026-01-20 10:00:00
│
└──► AUDIT_LOG (id=AL003)
     ├── user_id = 1
     ├── action = 'suspend_user'
     ├── entity_type = 'users'
     ├── entity_id = 10
     ├── old_values = {"status":"ACTIVE"}
     ├── new_values = {"status":"SUSPENDED"}
     └── created_at = 2026-01-20 14:00:00
```

**Audit Capabilities**:
- Who did it (user_id)
- What action (action)
- What changed (old_values, new_values)
- When (created_at)
- From where (ip_address)
- Partitioned for performance (yearly partitions)

---

### 2.5 USERS (AGENT) ↔ AGENT_HIERARCHY (One-to-One)

**Purpose**: Optimized agent metadata and denormalized counts

**Relationship Type**: One-to-One (1:1)

```
USER (id=2, username='agent1', role='AGENT')
│
└──► AGENT_HIERARCHY (agent_id=2)
     ├── parent_agent_id = 1 (ADMIN)
     ├── agent_level = 1 (Direct under ADMIN)
     ├── total_users = 5 (Cached count)
     ├── total_sub_agents = 0
     └── total_revenue = 2500.00 (Cached)
```

**Why Denormalization**:
- ✅ Fast lookups: `SELECT total_users FROM agent_hierarchy WHERE agent_id = 2`
- ✅ No expensive JOIN needed
- ✅ Simplified commission calculations
- ✅ Quick hierarchy depth queries

**Trade-off**: Must maintain consistency via triggers
```sql
-- Trigger maintains cache when new user created
CREATE TRIGGER tr_user_insert AFTER INSERT ON users
FOR EACH ROW
BEGIN
  IF NEW.role = 'USER' AND NEW.parent_id IS NOT NULL THEN
    UPDATE agent_hierarchy
    SET total_users = total_users + 1
    WHERE agent_id = NEW.parent_id;
  END IF;
END;
```

---

### 2.6 USERS (AGENT) ↔ AGENT_COMMISSIONS (One-to-Many)

**Purpose**: Commission tracking per agent per period

**Relationship Type**: One-to-Many (1:M)

```
USER (id=2, username='agent1', role='AGENT')
│
├──► AGENT_COMMISSION (period_start='2026-01-01', period_end='2026-01-31')
│    ├── agent_id = 2
│    ├── users_wagered = 50000.00
│    ├── house_profit = 2500.00 (5% margin)
│    ├── agent_commission = 375.00 (15% of profit)
│    ├── commission_rate = 15.00
│    ├── status = 'PENDING'
│    └── created_at = 2026-02-01 00:00:00
│
└──► AGENT_COMMISSION (period_start='2025-12-01', period_end='2025-12-31')
     ├── agent_id = 2
     ├── users_wagered = 45000.00
     ├── house_profit = 2250.00
     ├── agent_commission = 337.50
     ├── commission_rate = 15.00
     ├── status = 'PAID'
     ├── paid_at = 2026-01-05 14:30:00
     └── created_at = 2026-01-01 00:00:00
```

**Commission Calculation Flow**:
1. Agent creates/manages users who place bets
2. Monthly: Calculate total wagered by agent's users
3. Calculate house profit (platform profit)
4. Apply commission rate to profit
5. Status workflow: PENDING → APPROVED → PAID

---

## 3. INDEX STRATEGY FOR PERFORMANCE

### 3.1 Index Design per Table

```
TABLE: USERS (Primary Index Strategy)
├── PRIMARY KEY: id
├── UNIQUE: username, email
├── COMPOSITE INDEXES:
│   ├── (role, status) - Role-based dashboards
│   ├── (role, created_at) - Recent user queries
│   ├── (parent_id, status) - Agent user lists
│   ├── (parent_id, role) - User count by agent
│   └── (email) - Login queries
└── SORT/RANGE:
    └── created_at - Recently created users

TABLE: BETS (High-Volume Index Strategy)
├── PRIMARY KEY: id (BIGINT)
├── COMPOSITE INDEXES:
│   ├── (user_id, created_at) - User bet history
│   ├── (agent_id, status, created_at) - Agent reporting
│   ├── (match_id, status) - Match settlement
│   ├── (status, created_at) - Pending bets
│   └── (created_at) - Partition pruning
└── PARTITIONED BY: YEAR(created_at)

TABLE: TRANSACTIONS (High-Volume Index Strategy)
├── PRIMARY KEY: id (BIGINT)
├── COMPOSITE INDEXES:
│   ├── (user_id, transaction_type) - User statements
│   ├── (user_id, created_at) - Balance reconciliation
│   ├── (agent_id, transaction_type) - Agent commissions
│   ├── (reference_type, reference_id) - Cross-table links
│   └── (status, created_at) - Pending transactions
└── PARTITIONED BY: YEAR(created_at)

TABLE: AGENT_HIERARCHY
├── PRIMARY KEY: id
├── UNIQUE: agent_id
├── INDEXES:
│   ├── (parent_agent_id) - Sub-agent queries
│   ├── (agent_level) - Level-based queries
│   └── (total_users) - Sorting by size
└── No partitioning (small table)

TABLE: AUDIT_LOGS (Compliance Index Strategy)
├── PRIMARY KEY: id (BIGINT)
├── INDEXES:
│   ├── (user_id, action) - Admin activity tracking
│   ├── (action, created_at) - Action type queries
│   ├── (entity_type, entity_id) - Entity audit trail
│   └── (created_at) - Time-range queries
└── PARTITIONED BY: YEAR(created_at)
```

### 3.2 Query Examples with Indexes

```sql
-- Query 1: Get all active users under AGENT-1
-- Uses: idx_parent_status (parent_id, status)
SELECT id, username FROM users 
WHERE parent_id = 2 AND status = 'ACTIVE'
ORDER BY created_at DESC;

-- Query 2: Agent revenue report (month)
-- Uses: idx_agent_status (agent_id, status, created_at)
SELECT SUM(stake * odds) as potential_revenue
FROM bets
WHERE agent_id = 2 
  AND status = 'WON'
  AND MONTH(created_at) = 1
  AND YEAR(created_at) = 2026;

-- Query 3: User transaction history
-- Uses: idx_user_type (user_id, transaction_type)
SELECT * FROM transactions
WHERE user_id = 100 AND transaction_type IN ('DEPOSIT', 'WITHDRAWAL')
ORDER BY created_at DESC
LIMIT 50;

-- Query 4: Find commission for AGENT-1, Jan 2026
-- Uses: idx_agent_period (agent_id, period_start)
SELECT * FROM agent_commissions
WHERE agent_id = 2 AND period_start = '2026-01-01';

-- Query 5: Audit trail for user creation
-- Uses: idx_action (action, created_at)
SELECT * FROM audit_logs
WHERE action = 'create_user' AND entity_id = 10;
```

---

## 4. DATA INTEGRITY CONSTRAINTS

### 4.1 Foreign Key Relationships

| Relationship | From Table | To Table | ON DELETE | Reason |
|--------------|-----------|----------|-----------|--------|
| users.parent_id → users.id | USERS | USERS | SET NULL | Keep user record when parent changes |
| bets.user_id → users.id | BETS | USERS | RESTRICT | Prevent user deletion with active bets |
| bets.agent_id → users.id | BETS | USERS | RESTRICT | Maintain agent tracking |
| transactions.user_id → users.id | TRANSACTIONS | USERS | RESTRICT | Preserve financial history |
| transactions.agent_id → users.id | TRANSACTIONS | USERS | NO ACTION | Preserve agent reference |
| audit_logs.user_id → users.id | AUDIT_LOGS | USERS | No Constraint | Keep audit trail |
| agent_hierarchy.agent_id → users.id | AGENT_HIERARCHY | USERS | CASCADE | Delete hierarchy with agent |
| agent_hierarchy.parent_agent_id → users.id | AGENT_HIERARCHY | USERS | SET NULL | Handle agent parent removal |
| agent_commissions.agent_id → users.id | AGENT_COMMISSIONS | USERS | CASCADE | Clean up commissions on agent delete |

### 4.2 Check Constraints

```sql
-- ADMIN must not have a parent
CONSTRAINT chk_admin_no_parent 
  CHECK (role != 'ADMIN' OR parent_id IS NULL)

-- USER cannot have children
CONSTRAINT chk_user_no_children
  CHECK (role != 'USER' OR id NOT IN (SELECT parent_id FROM users WHERE parent_id IS NOT NULL))

-- Balance must be non-negative (application level also enforced)
CONSTRAINT chk_balance_non_negative
  CHECK (balance >= 0)

-- Agent level must be positive
CONSTRAINT chk_agent_level_positive
  CHECK (agent_level > 0)
```

---

## 5. EXAMPLE DATA FLOW

### 5.1 Creating a User Hierarchy

```
STEP 1: Create ADMIN
├── INSERT INTO users (username='admin', role='ADMIN', parent_id=NULL)
└── user_id = 1

STEP 2: Create AGENT-1 under ADMIN
├── INSERT INTO users (username='agent1', role='AGENT', parent_id=1)
├── user_id = 2
├── TRIGGER: INSERT INTO agent_hierarchy (agent_id=2, parent_agent_id=1, agent_level=1)
└── Result: AGENT-1 is a direct agent of ADMIN

STEP 3: Create USER-1 under AGENT-1
├── INSERT INTO users (username='john_smith', role='USER', parent_id=2)
├── user_id = 10
├── TRIGGER: UPDATE agent_hierarchy SET total_users = 1 WHERE agent_id = 2
└── Result: AGENT-1 now shows 1 user

STEP 4: USER-1 places a bet
├── INSERT INTO bets (user_id=10, agent_id=2, stake=50.00, odds=2.5)
├── TRIGGER: INSERT INTO transactions (user_id=10, type='BET_STAKE', amount=-50.00)
├── UPDATE users SET balance = balance - 50.00 WHERE id = 10
└── Result: Bet created, balance updated, transaction logged
```

### 5.2 Commission Calculation Flow

```
STEP 1: Calculate monthly commission for AGENT-1
├── CALL sp_calculate_commission(agent_id=2, period_start='2026-01-01', period_end='2026-01-31', rate=15)
├── SELECT SUM(stake) FROM bets WHERE agent_id=2 AND created_at BETWEEN dates
│  └── Result: users_wagered = 50,000.00
├── Calculate: house_profit = 50,000 * 0.05 = 2,500.00
├── Calculate: agent_commission = 2,500 * 0.15 = 375.00
└── INSERT INTO agent_commissions (...) VALUES (...)

STEP 2: Admin approves commission
├── UPDATE agent_commissions SET status='APPROVED' WHERE agent_id=2 AND period_start='2026-01-01'
└── TRIGGER: INSERT INTO audit_logs (action='approve_commission', entity_id=2)

STEP 3: Payout commission
├── INSERT INTO transactions (user_id=2, type='COMMISSION', amount=375.00)
├── UPDATE users SET balance=balance+375.00 WHERE id=2
├── UPDATE agent_commissions SET status='PAID', paid_at=NOW()
└── TRIGGER: INSERT INTO audit_logs (action='pay_commission')
```

---

## 6. SCHEMA EVOLUTION & SCALABILITY

### 6.1 Adding New Roles

**Current**: ADMIN, AGENT, USER

**Future Scalability**:
```sql
-- Add new role type (e.g., MODERATOR)
ALTER TABLE users MODIFY COLUMN role ENUM('ADMIN', 'AGENT', 'USER', 'MODERATOR') DEFAULT 'USER';

-- Add moderator permissions
INSERT INTO roles_permissions (role, permission, description, category)
VALUES ('MODERATOR', 'moderation.view_reports', 'View betting reports', 'moderation');

-- No schema changes needed - ENUM expansion is backward compatible
```

### 6.2 Adding Multi-Currency Support

```sql
-- Add currency field to transactions
ALTER TABLE transactions ADD COLUMN currency VARCHAR(3) DEFAULT 'USD';

-- Create currency conversion table
CREATE TABLE currency_rates (
  id INT PRIMARY KEY AUTO_INCREMENT,
  from_currency VARCHAR(3),
  to_currency VARCHAR(3),
  rate DECIMAL(10, 6),
  effective_date DATE,
  UNIQUE (from_currency, to_currency, effective_date)
);

-- Convert user balance tracking per currency
ALTER TABLE users ADD COLUMN currency VARCHAR(3) DEFAULT 'USD';
```

### 6.3 Adding Team/League Support

```sql
-- Add teams table
CREATE TABLE teams (
  id INT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(100) UNIQUE,
  league_id INT,
  -- ... other fields
);

-- Add league_id to bets
ALTER TABLE bets ADD COLUMN league_id INT;

-- Create new bet type for team bets
-- (Application level: update bet_type ENUM)
```

---

## 7. PERFORMANCE BENCHMARKS & TARGETS

| Operation | Target | Index/Strategy |
|-----------|--------|-----------------|
| Get user by ID | < 1ms | PRIMARY KEY (id) |
| Get all users by role | < 50ms | idx_role (role, status) |
| Get agent's users | < 100ms | idx_parent_status (parent_id, status) |
| Get user's bets (30 days) | < 200ms | idx_user_created (user_id, created_at) |
| Agent revenue report | < 500ms | idx_agent_status + Partitioning |
| Monthly commission calc | < 1s | Views + Stored procedure |
| Audit query (30 days) | < 100ms | Partitioned idx_created_at |
| Create user | < 50ms | PRIMARY KEY insert + triggers |

---

## 8. DIAGRAM LEGEND

| Symbol | Meaning |
|--------|---------|
| ──► | One-to-Many relationship |
| ◄── | Many-to-One relationship |
| ──○ | Optional relationship |
| ──| | Required relationship |
| FK | Foreign Key |
| PK | Primary Key |
| UK | Unique Key |
| (N,1) | Cardinality: N relates to 1 |
| (1,M) | Cardinality: 1 relates to Many |

---

## 9. CONSISTENCY & VALIDATION RULES

### 9.1 Application-Level Validation

```javascript
// Validate user creation
async function createUser(userData) {
  // 1. Check parent exists and is AGENT or ADMIN
  const parent = await User.findById(userData.parent_id);
  if (!parent || parent.role === 'USER') {
    throw new Error('Invalid parent');
  }
  
  // 2. Check parent has permission
  if (parent.role === 'AGENT') {
    // AGENT can only create users, not other agents
    if (userData.role === 'AGENT') throw new Error('Agents cannot create agents');
  }
  
  // 3. Create user with proper hierarchy
  const user = new User({
    ...userData,
    parent_id: parent.id,
    balance: 0,
    status: 'ACTIVE'
  });
  
  await user.save();
  return user;
}
```

### 9.2 Database-Level Enforcement

- Check constraints prevent invalid role combinations
- Foreign keys prevent orphaned references
- Triggers maintain denormalized counts
- Unique constraints prevent duplicate accounts

---

## 10. ARCHIVAL & RETENTION POLICY

```sql
-- Archive bets older than 1 year
CREATE TABLE bets_archive LIKE bets;

INSERT INTO bets_archive
SELECT * FROM bets
WHERE YEAR(created_at) < YEAR(NOW()) - 1;

DELETE FROM bets
WHERE YEAR(created_at) < YEAR(NOW()) - 1;

-- Keep audit logs for 7 years (regulatory requirement)
-- Keep transactions for 7 years
-- Keep users soft-deleted for audit trail
```

---

## CONCLUSION

The ERD design prioritizes:
- ✅ **Hierarchical flexibility** through self-referencing parent_id
- ✅ **Performance** through strategic denormalization and indexing
- ✅ **Audit compliance** via comprehensive audit_logs
- ✅ **Scalability** via partitioning high-volume tables
- ✅ **Data integrity** via foreign keys and constraints
- ✅ **Operational simplicity** with single users table

This architecture scales from thousands to millions of users and bets efficiently.

