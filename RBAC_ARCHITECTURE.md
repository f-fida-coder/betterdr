# Role-Based Access Control (RBAC) Architecture
## Sports Gaming Platform Backend Design

**Date**: January 26, 2026  
**Status**: Complete Architecture Design  
**Database**: MySQL/PostgreSQL (Relational)

---

## 1. EXECUTIVE SUMMARY

This document outlines a scalable, hierarchical RBAC system for a sports gaming platform with three role tiers:
- **ADMIN**: Platform administrator with full system access
- **AGENT**: Intermediary who manages users and sub-agents
- **USER**: End player who places bets and participates in games

**Key Design Principle**: Single `users` table with `role` and `parent_id` hierarchy for flexibility and scalability.

---

## 2. DATABASE SCHEMA

### 2.1 Core Tables

#### `users` Table
```sql
CREATE TABLE users (
  id INT PRIMARY KEY AUTO_INCREMENT,
  username VARCHAR(50) UNIQUE NOT NULL,
  email VARCHAR(100) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  full_name VARCHAR(100),
  phone VARCHAR(20),
  
  -- Role and Hierarchy
  role ENUM('ADMIN', 'AGENT', 'USER') NOT NULL DEFAULT 'USER',
  parent_id INT COMMENT 'References parent agent (NULL for ADMIN)',
  
  -- Account Status
  status ENUM('ACTIVE', 'INACTIVE', 'SUSPENDED', 'BANNED') DEFAULT 'ACTIVE',
  
  -- Financial & Limits
  balance DECIMAL(12, 2) DEFAULT 0.00,
  total_wagered DECIMAL(15, 2) DEFAULT 0.00,
  lifetime_winnings DECIMAL(15, 2) DEFAULT 0.00,
  
  -- Preferences & Settings
  preferred_language VARCHAR(10) DEFAULT 'en',
  timezone VARCHAR(50),
  notifications_enabled BOOLEAN DEFAULT TRUE,
  
  -- KYC & Verification
  kyc_status ENUM('PENDING', 'VERIFIED', 'REJECTED') DEFAULT 'PENDING',
  kyc_verified_at TIMESTAMP NULL,
  two_factor_enabled BOOLEAN DEFAULT FALSE,
  
  -- Metadata
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  last_login TIMESTAMP NULL,
  deleted_at TIMESTAMP NULL COMMENT 'Soft delete support',
  
  -- Indexes for Performance
  KEY idx_role (role),
  KEY idx_parent_id (parent_id),
  KEY idx_email (email),
  KEY idx_created_at (created_at),
  FOREIGN KEY (parent_id) REFERENCES users(id) ON DELETE SET NULL
);
```

#### `roles_permissions` Table
```sql
CREATE TABLE roles_permissions (
  id INT PRIMARY KEY AUTO_INCREMENT,
  role ENUM('ADMIN', 'AGENT', 'USER') NOT NULL,
  permission VARCHAR(100) NOT NULL,
  description TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  UNIQUE KEY unique_role_permission (role, permission),
  KEY idx_role (role)
);
```

#### `audit_logs` Table
```sql
CREATE TABLE audit_logs (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  user_id INT NOT NULL,
  action VARCHAR(100) NOT NULL,
  entity_type VARCHAR(50),
  entity_id INT,
  old_values JSON COMMENT 'Previous values',
  new_values JSON COMMENT 'Updated values',
  ip_address VARCHAR(45),
  user_agent TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  KEY idx_user_id (user_id),
  KEY idx_action (action),
  KEY idx_created_at (created_at),
  FOREIGN KEY (user_id) REFERENCES users(id)
);
```

#### `agent_hierarchy` Table (Denormalized for Performance)
```sql
CREATE TABLE agent_hierarchy (
  id INT PRIMARY KEY AUTO_INCREMENT,
  agent_id INT NOT NULL UNIQUE,
  parent_agent_id INT COMMENT 'Direct parent (NULL if reporting to ADMIN)',
  agent_level INT COMMENT 'Depth: 1=Direct under ADMIN, 2+=Sub-agents',
  total_users INT DEFAULT 0 COMMENT 'Cached count of direct users',
  total_sub_agents INT DEFAULT 0 COMMENT 'Cached count of sub-agents',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  KEY idx_parent_agent_id (parent_agent_id),
  KEY idx_agent_level (agent_level),
  FOREIGN KEY (agent_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (parent_agent_id) REFERENCES users(id) ON DELETE SET NULL
);
```

#### `agent_commissions` Table (Scalability for Gaming Revenue)
```sql
CREATE TABLE agent_commissions (
  id INT PRIMARY KEY AUTO_INCREMENT,
  agent_id INT NOT NULL,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  
  users_wagered DECIMAL(15, 2) DEFAULT 0.00,
  house_profit DECIMAL(15, 2) DEFAULT 0.00,
  agent_commission DECIMAL(15, 2) DEFAULT 0.00,
  commission_rate DECIMAL(5, 2) COMMENT 'Percentage',
  
  status ENUM('PENDING', 'APPROVED', 'PAID') DEFAULT 'PENDING',
  paid_at TIMESTAMP NULL,
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  KEY idx_agent_id (agent_id),
  KEY idx_period (period_start, period_end),
  KEY idx_status (status),
  FOREIGN KEY (agent_id) REFERENCES users(id) ON DELETE CASCADE
);
```

#### `bets` Table (Gaming & Betting Core)
```sql
CREATE TABLE bets (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  user_id INT NOT NULL,
  agent_id INT NOT NULL COMMENT 'Denormalized for query efficiency',
  
  match_id INT NOT NULL,
  bet_type VARCHAR(50) NOT NULL COMMENT 'WIN, DRAW, LOSE, OVER, UNDER, etc',
  
  stake DECIMAL(12, 2) NOT NULL,
  odds DECIMAL(10, 4) NOT NULL,
  potential_winnings DECIMAL(12, 2),
  
  status ENUM('PENDING', 'WON', 'LOST', 'REFUNDED', 'CANCELLED') DEFAULT 'PENDING',
  settled_at TIMESTAMP NULL,
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  KEY idx_user_id (user_id),
  KEY idx_agent_id (agent_id),
  KEY idx_match_id (match_id),
  KEY idx_status (status),
  KEY idx_created_at (created_at),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE RESTRICT,
  FOREIGN KEY (agent_id) REFERENCES users(id) ON DELETE RESTRICT
);
```

#### `transactions` Table
```sql
CREATE TABLE transactions (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  user_id INT NOT NULL,
  agent_id INT COMMENT 'For commission tracking',
  
  transaction_type ENUM('DEPOSIT', 'WITHDRAWAL', 'BET_STAKE', 'BET_WINNINGS', 'BONUS', 'COMMISSION', 'REFUND') NOT NULL,
  amount DECIMAL(12, 2) NOT NULL,
  balance_before DECIMAL(12, 2),
  balance_after DECIMAL(12, 2),
  
  reference_id VARCHAR(100) COMMENT 'Links to bets, commissions, etc',
  reference_type VARCHAR(50),
  
  status ENUM('PENDING', 'COMPLETED', 'FAILED', 'REVERSED') DEFAULT 'PENDING',
  description TEXT,
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  KEY idx_user_id (user_id),
  KEY idx_agent_id (agent_id),
  KEY idx_type (transaction_type),
  KEY idx_status (status),
  KEY idx_created_at (created_at),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE RESTRICT,
  FOREIGN KEY (agent_id) REFERENCES users(id)
);
```

---

## 3. ENTITY RELATIONSHIP DIAGRAM (ERD)

### 3.1 ERD Explanation

```
┌─────────────────────────────────────────────────────────────┐
│                      CORE HIERARCHY                          │
└─────────────────────────────────────────────────────────────┘

                    ADMIN
                      │
        ┌─────────────┼─────────────┐
        │             │             │
    AGENT-1       AGENT-2       AGENT-3
        │             │             │
    ┌───┴───┐     ┌───┴───┐     ┌───┴───┐
   USER   USER   USER   USER   USER   USER
```

### 3.2 Key Relationships

1. **Hierarchical Self-Reference**: `users.parent_id` creates parent-child relationships
   - ADMIN has `parent_id = NULL`
   - AGENT has `parent_id` pointing to ADMIN or parent AGENT
   - USER has `parent_id` pointing to their managing AGENT

2. **Role-Permission Mapping**: `roles_permissions` defines capabilities per role

3. **Denormalization for Performance**:
   - `agent_hierarchy`: Pre-computed depth and user counts (reduces expensive recursive queries)
   - `bets.agent_id`: Denormalized to avoid JOIN for agent metrics

4. **Audit Trail**: `audit_logs` tracks all sensitive operations

5. **Commission Tracking**: `agent_commissions` and `transactions` enable revenue sharing

---

## 4. ROLE-PERMISSION MATRIX

| Permission | ADMIN | AGENT | USER |
|-----------|:-----:|:-----:|:----:|
| **User Management** |
| Create User | ✅ | ✅* | ❌ |
| Create Agent | ✅ | ❌ | ❌ |
| Edit Own Profile | ✅ | ✅ | ✅ |
| Edit Others' Profile | ✅ | ✅* | ❌ |
| View All Users | ✅ | ✅* | ❌ |
| Suspend/Ban User | ✅ | ✅* | ❌ |
| Delete User | ✅ | ❌ | ❌ |
| **Financial Management** |
| Deposit | ✅ | ✅* | ✅ |
| Withdraw | ✅ | ✅* | ✅ |
| View Balance | ✅ | ✅* | ✅ |
| View Transactions | ✅ | ✅* | ✅ |
| Approve Withdrawal | ✅ | ✅* | ❌ |
| **Betting & Gaming** |
| Place Bet | ✅ | ✅ | ✅ |
| View Own Bets | ✅ | ✅* | ✅ |
| View All Bets | ✅ | ✅* | ❌ |
| Settle Bets | ✅ | ❌ | ❌ |
| **Reporting & Analytics** |
| View Platform Analytics | ✅ | ❌ | ❌ |
| View Agent Analytics | ✅ | ✅ | ❌ |
| Generate Reports | ✅ | ✅ | ❌ |
| View Audit Logs | ✅ | ❌ | ❌ |
| **Commission Management** |
| View Own Commission | ✅ | ✅ | ❌ |
| Calculate Commission | ✅ | ❌ | ❌ |
| Approve Commission Payout | ✅ | ❌ | ❌ |
| **System Management** |
| Manage Odds | ✅ | ❌ | ❌ |
| Manage Matches | ✅ | ❌ | ❌ |
| Configure System | ✅ | ❌ | ❌ |

**Legend**: ✅ = Full Access | ✅* = Scoped (only own users/data) | ❌ = No Access

---

## 5. DESIGN CHOICES & JUSTIFICATIONS

### 5.1 Single `users` Table vs Multiple Tables

**Decision: Single `users` table with role-based filtering**

#### Advantages:
1. **Simplicity**: One schema to maintain, easier migrations
2. **Flexibility**: Easy to promote USER → AGENT → ADMIN or change roles
3. **Query Efficiency**: Single SELECT for any user type with role-based filtering
4. **Reduced Redundancy**: No duplicate columns across multiple tables
5. **Scalability**: New user types added via ENUM extension (not schema change)
6. **Audit Trail**: Single audit table captures all user changes

#### Alternative (Not Chosen): Multiple Tables
```sql
-- Anti-pattern: Separate tables
CREATE TABLE admins (id, ...);
CREATE TABLE agents (id, agent_code, ...);
CREATE TABLE players (id, agent_id, ...);
```

**Why Rejected**:
- ❌ Requires JOINs to get user info
- ❌ Makes role transitions complex (requires data migration)
- ❌ Duplicate columns (username, email, password across tables)
- ❌ Harder to enforce global uniqueness constraints
- ❌ Worse performance for cross-role queries

---

### 5.2 Denormalization Strategy

#### `agent_hierarchy` Table
**Why**: Agent-specific queries are frequent (commission calculations, reporting)
- **Benefit**: O(1) lookup of agent level vs recursive CTE
- **Trade-off**: Requires triggers to keep `total_users` and `total_sub_agents` synced
- **Alternative Rejected**: Always calculate from `users` table (expensive for reporting)

#### `bets.agent_id` Denormalization
**Why**: Bet aggregation by agent is frequent
- **Benefit**: Faster GROUP BY without JOIN to users
- **Trade-off**: Must update on user transfer
- **Use Case**: Daily agent revenue reports, commission calculations

---

### 5.3 Hierarchical Structure

**Choice**: Tree structure with `parent_id` (not nested sets)

| Aspect | parent_id (Chosen) | Nested Sets | Closure Table |
|--------|:--:|:--:|:--:|
| Insert Performance | ⭐⭐⭐⭐⭐ | ⭐⭐ | ⭐⭐⭐ |
| Query Path | ⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ |
| Delete Subtree | ⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐⭐ |
| Code Complexity | ⭐⭐⭐⭐⭐ | ⭐⭐ | ⭐⭐⭐ |

**Rationale**: 
- Frequent inserts (new users/agents)
- Occasional path queries (use recursive CTEs)
- Simpler application logic

---

### 5.4 Financial Data Separation

**Choice**: Separate `transactions` and `bets` tables

**Why Not Single Table**?
- ❌ Bets need gaming-specific fields (odds, match_id, bet_type)
- ❌ Transactions cover non-gaming operations (deposits, withdrawals)
- ❌ Different aggregation needs and retention policies
- ❌ Bets are high-volume; transaction volume lower

**Relationship**:
```
transactions.reference_type = 'BET'
transactions.reference_id = bets.id
```

---

## 6. SCALABILITY CONSIDERATIONS

### 6.1 For Gaming & Betting Growth

1. **Partitioning Strategy** (for high-volume tables)
```sql
-- Bets table: Partition by month
PARTITION BY RANGE (MONTH(created_at)) (
  PARTITION p_jan VALUES LESS THAN (2),
  PARTITION p_feb VALUES LESS THAN (3),
  ...
);

-- Transactions table: Partition by date
PARTITION BY RANGE (TO_DAYS(created_at)) (
  PARTITION p_2026_01 VALUES LESS THAN (TO_DAYS('2026-02-01')),
  ...
);
```

2. **Read Replicas** for reporting queries
```
Master DB (writes): users, bets, transactions
Replica DB (reads): Analytics, Reports, Agent dashboards
```

3. **Caching Layer** (Redis)
```
Keys:
- user:{user_id}:balance → Updates on every transaction
- agent:{agent_id}:commission:2026-01 → Cached for period
- user:{user_id}:bets:month:2026-01 → Cached daily
```

4. **Archival Strategy**
```sql
-- Move old bets to archive table after 1 year
archive_bets (same schema, indexed on user_id + created_at)
-- Keep references for audit purposes
```

### 6.2 Connection Pool Configuration

```javascript
// Node.js with mysql2/promise
const pool = mysql.createPool({
  connectionLimit: 20,      // Adjust based on concurrency
  waitForConnections: true,
  queueLimit: 0,
  enableKeepAlive: true,
  keepAliveInitialDelayMs: 0
});
```

### 6.3 Query Optimization Index Strategy

| Table | Index | Use Case |
|-------|-------|----------|
| users | (role, created_at) | Role-based dashboards |
| users | (parent_id, status) | Agent user lists |
| bets | (user_id, created_at) | User bet history |
| bets | (agent_id, status, created_at) | Agent reporting |
| transactions | (user_id, type, created_at) | Transaction queries |
| audit_logs | (user_id, action, created_at) | Compliance audits |

---

## 7. IMPLEMENTATION ROADMAP

### Phase 1: Core Schema (Current)
- [x] Users table with role hierarchy
- [x] Roles & permissions tables
- [x] Basic audit logging
- [x] Bets & transactions

### Phase 2: Optimization (Month 2)
- [ ] Agent hierarchy denormalization
- [ ] Commission tracking tables
- [ ] Read replicas setup
- [ ] Caching strategy implementation

### Phase 3: Advanced Features (Month 3+)
- [ ] Multi-currency support
- [ ] Advanced analytics tables
- [ ] Machine learning fraud detection
- [ ] Third-party API integrations

---

## 8. SECURITY CONSIDERATIONS

### 8.1 Access Control Implementation

```javascript
// Middleware example
async function checkPermission(user, permission, targetUser) {
  // ADMIN: Always allowed
  if (user.role === 'ADMIN') return true;
  
  // AGENT: Can only access own users
  if (user.role === 'AGENT' && permission === 'view_user') {
    return targetUser.parent_id === user.id;
  }
  
  // USER: Can only access own data
  if (user.role === 'USER') {
    return targetUser.id === user.id;
  }
  
  return false;
}
```

### 8.2 Data Protection

- Password hashing: bcrypt with salt rounds 12
- Soft deletes: All user data retained for audit
- PII encryption: email, phone encrypted at rest
- Audit logs: Immutable, signed records

---

## 9. DEPLOYMENT CONSIDERATIONS

### 9.1 Database Migration Strategy

```bash
# Initial setup
npm run db:migrate:init

# Add new permissions
npm run db:migrate:add-permissions

# Add indices for performance
npm run db:migrate:add-indices

# Archive old data
npm run db:archive:monthly
```

### 9.2 Monitoring & Alerts

- Query performance: > 1000ms alerts
- Connection pool exhaustion: Monitor active connections
- Slow log: Track queries > 500ms
- Replication lag: Monitor replica lag < 100ms

---

## 10. COMPLIANCE & AUDIT

### 10.1 Regulatory Requirements

- **KYC/AML**: kyc_status field in users table
- **Responsible Gaming**: Tracking limits (future feature)
- **Audit Trail**: All administrative actions logged
- **Data Retention**: 7-year retention policy

### 10.2 Example Audit Log Entry

```json
{
  "user_id": 5,
  "action": "suspend_user",
  "entity_type": "users",
  "entity_id": 42,
  "old_values": {"status": "ACTIVE"},
  "new_values": {"status": "SUSPENDED"},
  "ip_address": "192.168.1.1",
  "created_at": "2026-01-26T10:30:00Z"
}
```

---

## 11. TESTING STRATEGY

### 11.1 Unit Tests

```javascript
// Example: Permission checking
test('AGENT can only view own users', async () => {
  const agent = { id: 5, role: 'AGENT' };
  const ownUser = { parent_id: 5 };
  const otherUser = { parent_id: 10 };
  
  expect(await checkPermission(agent, 'view', ownUser)).toBe(true);
  expect(await checkPermission(agent, 'view', otherUser)).toBe(false);
});
```

### 11.2 Integration Tests

- Test role transitions
- Test cascade deletions
- Test commission calculations
- Test concurrent transactions

### 11.3 Load Tests

- 1000 concurrent bets per second
- 10,000 concurrent users
- Agent commission calculations for 10k+ agents

---

## 12. CONCLUSION

This architecture provides:
✅ Clear separation of concerns  
✅ Scalable hierarchy management  
✅ Comprehensive audit trail  
✅ Flexible permission system  
✅ Foundation for gaming/betting features  

**Next Steps**: Implement Phase 1 schema, create migration scripts, set up replication monitoring.

