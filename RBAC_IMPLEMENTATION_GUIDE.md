# RBAC Implementation Guide
## Sports Gaming Platform - Backend Implementation

---

## TABLE OF CONTENTS
1. Database Setup
2. User Service Implementation
3. Permission Middleware
4. API Endpoints & Controllers
5. Testing Strategy
6. Deployment Checklist

---

## 1. DATABASE SETUP

### 1.1 Initialize Database Schema

```bash
# Connect to MySQL/PostgreSQL
mysql -u root -p < backend/config/rbac_schema.sql

# OR manually in MySQL client
mysql> USE sports_gaming_db;
mysql> SOURCE /path/to/backend/config/rbac_schema.sql;
mysql> SHOW TABLES; -- Verify all tables created
```

### 1.2 Verify Tables

```bash
# Run verification script
node backend/scripts/verify-rbac-schema.js
```

**Expected Output**:
```
✓ users table created
✓ roles_permissions table created
✓ audit_logs table created
✓ agent_hierarchy table created
✓ agent_commissions table created
✓ bets table created
✓ transactions table created
✓ All views created
✓ All stored procedures created
✓ Schema validation passed
```

---

## 2. USER SERVICE IMPLEMENTATION

### 2.1 User Model (`backend/models/User.js`)

```javascript
const db = require('../config/database');
const bcrypt = require('bcryptjs');

class User {
  // Create new user with role validation
  static async create(userData) {
    const {
      username,
      email,
      password,
      full_name,
      phone,
      role = 'USER',
      parent_id = null,
      kyc_status = 'PENDING'
    } = userData;

    // Validate role
    const validRoles = ['ADMIN', 'AGENT', 'USER'];
    if (!validRoles.includes(role)) {
      throw new Error('Invalid role');
    }

    // Validate parent-child relationships
    if (role === 'USER' && !parent_id) {
      throw new Error('USER must have a parent AGENT');
    }

    if (role === 'ADMIN' && parent_id) {
      throw new Error('ADMIN cannot have a parent');
    }

    // Check parent exists and has valid role
    if (parent_id) {
      const parent = await User.findById(parent_id);
      if (!parent) {
        throw new Error('Parent user does not exist');
      }

      // AGENT can only create USERs, not other AGENTs
      if (parent.role === 'AGENT' && role === 'AGENT') {
        throw new Error('AGENTs cannot create other AGENTs');
      }

      // Only ADMIN and AGENT can have children
      if (parent.role === 'USER') {
        throw new Error('USERs cannot have children');
      }
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 12);

    // Insert user
    const sql = `
      INSERT INTO users 
      (username, email, password_hash, full_name, phone, role, parent_id, kyc_status, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'ACTIVE')
    `;

    const result = await db.query(sql, [
      username,
      email,
      passwordHash,
      full_name,
      phone,
      role,
      parent_id,
      kyc_status
    ]);

    return {
      id: result.insertId,
      username,
      email,
      role,
      parent_id,
      created_at: new Date()
    };
  }

  // Find user by ID
  static async findById(id) {
    const sql = 'SELECT * FROM users WHERE id = ? AND deleted_at IS NULL';
    const [rows] = await db.query(sql, [id]);
    return rows[0] || null;
  }

  // Find user by username
  static async findByUsername(username) {
    const sql = 'SELECT * FROM users WHERE username = ? AND deleted_at IS NULL';
    const [rows] = await db.query(sql, [username]);
    return rows[0] || null;
  }

  // Find user by email
  static async findByEmail(email) {
    const sql = 'SELECT * FROM users WHERE email = ? AND deleted_at IS NULL';
    const [rows] = await db.query(sql, [email]);
    return rows[0] || null;
  }

  // Get all users under an agent (direct)
  static async getUsersByAgent(agentId) {
    const sql = `
      SELECT id, username, email, full_name, status, balance, created_at
      FROM users
      WHERE parent_id = ? AND role = 'USER' AND deleted_at IS NULL
      ORDER BY created_at DESC
    `;
    const [rows] = await db.query(sql, [agentId]);
    return rows;
  }

  // Get recursive user hierarchy (all users under agent tree)
  static async getUsersUnderAgentRecursive(agentId) {
    const sql = `
      WITH RECURSIVE agent_tree AS (
        -- Direct users
        SELECT id, username, email, parent_id, 0 as depth
        FROM users
        WHERE parent_id = ? AND role = 'USER' AND deleted_at IS NULL
        
        UNION ALL
        
        -- Sub-agents and their users (if multi-level agents exist)
        SELECT u.id, u.username, u.email, u.parent_id, at.depth + 1
        FROM users u
        INNER JOIN agent_tree at ON u.parent_id = at.id
        WHERE u.deleted_at IS NULL
      )
      SELECT * FROM agent_tree
      ORDER BY depth, username
    `;
    const [rows] = await db.query(sql, [agentId]);
    return rows;
  }

  // Get all agents
  static async getAllAgents(parentId = null) {
    let sql = `
      SELECT u.id, u.username, u.email, u.full_name, u.status, 
             ah.total_users, ah.total_sub_agents, ah.agent_level,
             u.created_at
      FROM users u
      LEFT JOIN agent_hierarchy ah ON u.id = ah.agent_id
      WHERE u.role = 'AGENT' AND u.deleted_at IS NULL
    `;
    const params = [];

    if (parentId !== null) {
      sql += ' AND u.parent_id = ?';
      params.push(parentId);
    }

    sql += ' ORDER BY u.created_at DESC';
    const [rows] = await db.query(sql, params);
    return rows;
  }

  // Update user profile
  static async update(userId, updateData) {
    const allowedFields = ['full_name', 'phone', 'timezone', 'preferred_language', 'notifications_enabled'];
    
    const updates = [];
    const values = [];

    for (const [key, value] of Object.entries(updateData)) {
      if (allowedFields.includes(key)) {
        updates.push(`${key} = ?`);
        values.push(value);
      }
    }

    if (updates.length === 0) {
      return { message: 'No updates provided' };
    }

    updates.push('updated_at = CURRENT_TIMESTAMP');
    values.push(userId);

    const sql = `UPDATE users SET ${updates.join(', ')} WHERE id = ?`;
    await db.query(sql, values);

    return await User.findById(userId);
  }

  // Suspend/Ban user
  static async changeStatus(userId, newStatus, reason = '') {
    const validStatuses = ['ACTIVE', 'INACTIVE', 'SUSPENDED', 'BANNED'];
    
    if (!validStatuses.includes(newStatus)) {
      throw new Error('Invalid status');
    }

    const sql = `UPDATE users SET status = ? WHERE id = ?`;
    await db.query(sql, [newStatus, userId]);

    return await User.findById(userId);
  }

  // Soft delete user (audit compliance)
  static async softDelete(userId) {
    const sql = `UPDATE users SET deleted_at = CURRENT_TIMESTAMP WHERE id = ?`;
    await db.query(sql, [userId]);
    return { message: 'User deleted successfully' };
  }

  // Get user's balance
  static async getBalance(userId) {
    const sql = 'SELECT id, username, balance FROM users WHERE id = ?';
    const [rows] = await db.query(sql, [userId]);
    return rows[0] || null;
  }

  // Update balance (for transactions)
  static async updateBalance(userId, amount) {
    const sql = `UPDATE users SET balance = balance + ? WHERE id = ?`;
    await db.query(sql, [amount, userId]);
    return await User.getBalance(userId);
  }

  // Verify password
  static async verifyPassword(userId, password) {
    const user = await User.findById(userId);
    if (!user) return false;

    return await bcrypt.compare(password, user.password_hash);
  }

  // Update password
  static async updatePassword(userId, newPassword) {
    const passwordHash = await bcrypt.hash(newPassword, 12);
    const sql = `UPDATE users SET password_hash = ? WHERE id = ?`;
    await db.query(sql, [passwordHash, userId]);
    return { message: 'Password updated successfully' };
  }

  // Get user hierarchy info (parents)
  static async getHierarchyPath(userId) {
    const sql = `
      WITH RECURSIVE user_path AS (
        SELECT id, username, parent_id, role, 0 as level
        FROM users
        WHERE id = ?
        
        UNION ALL
        
        SELECT u.id, u.username, u.parent_id, u.role, up.level + 1
        FROM users u
        INNER JOIN user_path up ON u.id = up.parent_id
      )
      SELECT * FROM user_path
      ORDER BY level ASC
    `;
    const [rows] = await db.query(sql, [userId]);
    return rows;
  }
}

module.exports = User;
```

---

## 3. PERMISSION MIDDLEWARE

### 3.1 Permission Middleware (`backend/middleware/permissionMiddleware.js`)

```javascript
const db = require('../config/database');

class PermissionMiddleware {
  // Load user permissions from database
  static async loadPermissions(role) {
    const sql = `
      SELECT permission FROM roles_permissions 
      WHERE role = ?
    `;
    const [rows] = await db.query(sql, [role]);
    return rows.map(r => r.permission);
  }

  // Cache permissions in memory (reload every 1 hour)
  static permissionCache = {};
  static cacheExpiry = {};

  static async getPermissions(role) {
    const cacheKey = role;
    const now = Date.now();

    // Check if cache is valid (1 hour)
    if (this.permissionCache[cacheKey] && this.cacheExpiry[cacheKey] > now) {
      return this.permissionCache[cacheKey];
    }

    const permissions = await this.loadPermissions(role);
    this.permissionCache[cacheKey] = permissions;
    this.cacheExpiry[cacheKey] = now + 3600000; // 1 hour

    return permissions;
  }

  // Middleware: Require permission
  static require = (requiredPermission) => {
    return async (req, res, next) => {
      try {
        const user = req.user;
        if (!user) {
          return res.status(401).json({ error: 'Unauthorized' });
        }

        const userPermissions = await PermissionMiddleware.getPermissions(user.role);

        if (!userPermissions.includes(requiredPermission)) {
          return res.status(403).json({
            error: 'Forbidden',
            message: `Permission "${requiredPermission}" required`
          });
        }

        next();
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    };
  };

  // Check if user can view/modify target user
  static async canViewUser(adminUser, targetUserId) {
    // ADMIN can view all
    if (adminUser.role === 'ADMIN') return true;

    // AGENT can view own users
    if (adminUser.role === 'AGENT') {
      const targetUser = await db.query(
        'SELECT parent_id FROM users WHERE id = ?',
        [targetUserId]
      );
      return targetUser[0]?.[0]?.parent_id === adminUser.id;
    }

    // USER can only view self
    return adminUser.id === targetUserId;
  }

  // Check if user can modify target user
  static async canModifyUser(adminUser, targetUserId) {
    return await PermissionMiddleware.canViewUser(adminUser, targetUserId);
  }

  // Middleware: Verify resource access
  static resourceAccess = (resourceType) => {
    return async (req, res, next) => {
      try {
        const userId = parseInt(req.params.id);
        const user = req.user;

        const canAccess = await PermissionMiddleware.canViewUser(user, userId);

        if (!canAccess) {
          return res.status(403).json({
            error: 'Forbidden',
            message: 'Cannot access this resource'
          });
        }

        next();
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    };
  };

  // Logging utility: Log permission check
  static async logPermissionCheck(userId, permission, granted, ip) {
    // Optional: Log permission checks for security
    console.log(
      `[PERMISSION] User ${userId}: ${permission} - ${granted ? 'GRANTED' : 'DENIED'} (${ip})`
    );
  }
}

module.exports = PermissionMiddleware;
```

### 3.2 Audit Logging Middleware (`backend/middleware/auditMiddleware.js`)

```javascript
const db = require('../config/database');

class AuditMiddleware {
  // Log administrative action
  static async logAction(userId, action, entityType, entityId, oldValues = null, newValues = null, req) {
    try {
      const ip = req.ip || req.connection.remoteAddress;
      const userAgent = req.get('user-agent') || '';

      const sql = `
        INSERT INTO audit_logs 
        (user_id, action, entity_type, entity_id, old_values, new_values, ip_address, user_agent)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `;

      await db.query(sql, [
        userId,
        action,
        entityType,
        entityId,
        oldValues ? JSON.stringify(oldValues) : null,
        newValues ? JSON.stringify(newValues) : null,
        ip,
        userAgent
      ]);
    } catch (error) {
      console.error('Audit logging failed:', error);
      // Don't throw - audit failure shouldn't break operation
    }
  }

  // Get audit logs for entity
  static async getEntityAuditLog(entityType, entityId, limit = 50) {
    const sql = `
      SELECT * FROM audit_logs
      WHERE entity_type = ? AND entity_id = ?
      ORDER BY created_at DESC
      LIMIT ?
    `;
    const [rows] = await db.query(sql, [entityType, entityId, limit]);
    return rows;
  }

  // Get user activity log
  static async getUserActivityLog(userId, days = 30, limit = 100) {
    const sql = `
      SELECT * FROM audit_logs
      WHERE user_id = ? AND created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
      ORDER BY created_at DESC
      LIMIT ?
    `;
    const [rows] = await db.query(sql, [userId, days, limit]);
    return rows;
  }

  // Middleware for auto-logging
  static track = (action, entityType) => {
    return async (req, res, next) => {
      // Store info for later logging
      res.locals.auditAction = action;
      res.locals.auditEntityType = entityType;

      // Capture original response
      const originalJson = res.json;
      res.json = function(data) {
        // Log after successful response
        if (res.statusCode < 400) {
          const entityId = req.params.id || data?.id;
          AuditMiddleware.logAction(
            req.user.id,
            action,
            entityType,
            entityId,
            null,
            data,
            req
          ).catch(err => console.error('Audit log failed:', err));
        }
        return originalJson.call(this, data);
      };

      next();
    };
  };
}

module.exports = AuditMiddleware;
```

---

## 4. API ENDPOINTS & CONTROLLERS

### 4.1 User Controller (`backend/controllers/userController.js`)

```javascript
const User = require('../models/User');
const AuditMiddleware = require('../middleware/auditMiddleware');

class UserController {
  // Create new user (ADMIN or AGENT)
  static async createUser(req, res) {
    try {
      const { username, email, password, full_name, phone, role = 'USER' } = req.body;
      const adminUser = req.user;

      // Validation
      if (!username || !email || !password) {
        return res.status(400).json({ error: 'Missing required fields' });
      }

      // Check permissions
      if (adminUser.role === 'AGENT' && role === 'AGENT') {
        return res.status(403).json({ error: 'Agents cannot create agents' });
      }

      // AGENT can only create users under themselves
      let parentId = req.body.parent_id;
      if (adminUser.role === 'AGENT') {
        parentId = adminUser.id;
      }

      // Create user
      const newUser = await User.create({
        username,
        email,
        password,
        full_name,
        phone,
        role,
        parent_id: parentId
      });

      // Audit log
      await AuditMiddleware.logAction(
        adminUser.id,
        'create_user',
        'users',
        newUser.id,
        null,
        { username, email, role, parent_id: parentId },
        req
      );

      res.status(201).json({
        success: true,
        data: newUser
      });
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  }

  // Get user by ID
  static async getUser(req, res) {
    try {
      const userId = parseInt(req.params.id);
      const user = req.user;

      // Check access
      if (user.role !== 'ADMIN' && user.role !== 'AGENT') {
        if (user.id !== userId) {
          return res.status(403).json({ error: 'Cannot view this user' });
        }
      }

      const targetUser = await User.findById(userId);
      if (!targetUser) {
        return res.status(404).json({ error: 'User not found' });
      }

      res.json({ success: true, data: targetUser });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

  // Get all agents (ADMIN only)
  static async getAllAgents(req, res) {
    try {
      const agents = await User.getAllAgents();
      res.json({
        success: true,
        data: agents,
        count: agents.length
      });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

  // Get agent's users
  static async getAgentUsers(req, res) {
    try {
      const agentId = parseInt(req.params.id);
      const user = req.user;

      // Check access
      if (user.role === 'AGENT' && user.id !== agentId) {
        return res.status(403).json({ error: 'Cannot view other agents\' users' });
      }

      const users = await User.getUsersByAgent(agentId);
      res.json({
        success: true,
        data: users,
        count: users.length
      });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

  // Update user profile
  static async updateUser(req, res) {
    try {
      const userId = parseInt(req.params.id);
      const user = req.user;

      // Check access
      const canAccess = await User.canViewUser(user, userId);
      if (!canAccess) {
        return res.status(403).json({ error: 'Cannot modify this user' });
      }

      // Get old values for audit
      const oldUser = await User.findById(userId);

      // Update
      const updatedUser = await User.update(userId, req.body);

      // Audit log
      await AuditMiddleware.logAction(
        user.id,
        'update_user',
        'users',
        userId,
        oldUser,
        req.body,
        req
      );

      res.json({ success: true, data: updatedUser });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

  // Suspend user
  static async suspendUser(req, res) {
    try {
      const userId = parseInt(req.params.id);
      const { reason } = req.body;
      const admin = req.user;

      const oldUser = await User.findById(userId);
      const suspendedUser = await User.changeStatus(userId, 'SUSPENDED', reason);

      await AuditMiddleware.logAction(
        admin.id,
        'suspend_user',
        'users',
        userId,
        { status: oldUser.status },
        { status: 'SUSPENDED', reason },
        req
      );

      res.json({ success: true, data: suspendedUser });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

  // Delete user (soft delete)
  static async deleteUser(req, res) {
    try {
      const userId = parseInt(req.params.id);
      const admin = req.user;

      await User.softDelete(userId);

      await AuditMiddleware.logAction(
        admin.id,
        'delete_user',
        'users',
        userId,
        null,
        { deleted_at: new Date() },
        req
      );

      res.json({ success: true, message: 'User deleted' });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

  // Get user's balance
  static async getBalance(req, res) {
    try {
      const userId = parseInt(req.params.id);
      const user = req.user;

      // Check access
      if (user.role === 'USER' && user.id !== userId) {
        return res.status(403).json({ error: 'Cannot view other users\' balance' });
      }

      const balance = await User.getBalance(userId);
      if (!balance) {
        return res.status(404).json({ error: 'User not found' });
      }

      res.json({ success: true, data: balance });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
}

module.exports = UserController;
```

### 4.2 User Routes (`backend/routes/userRoutes.js`)

```javascript
const express = require('express');
const UserController = require('../controllers/userController');
const authMiddleware = require('../middleware/authMiddleware');
const PermissionMiddleware = require('../middleware/permissionMiddleware');

const router = express.Router();

// All routes require authentication
router.use(authMiddleware.authenticate);

// ADMIN/AGENT: Create user
router.post('/',
  PermissionMiddleware.require('admin.create_user'),
  UserController.createUser
);

// ADMIN: Get all agents
router.get('/agents/all',
  PermissionMiddleware.require('admin.view_all_agents'),
  UserController.getAllAgents
);

// AGENT/ADMIN: Get agent's users
router.get('/agents/:id/users',
  PermissionMiddleware.resourceAccess('agent'),
  UserController.getAgentUsers
);

// Get specific user
router.get('/:id',
  PermissionMiddleware.resourceAccess('user'),
  UserController.getUser
);

// Update user profile
router.put('/:id',
  PermissionMiddleware.resourceAccess('user'),
  UserController.updateUser
);

// ADMIN/AGENT: Suspend user
router.post('/:id/suspend',
  PermissionMiddleware.require('admin.suspend_user'),
  UserController.suspendUser
);

// ADMIN: Delete user (soft delete)
router.delete('/:id',
  PermissionMiddleware.require('admin.delete_user'),
  UserController.deleteUser
);

// Get user balance
router.get('/:id/balance',
  PermissionMiddleware.resourceAccess('user'),
  UserController.getBalance
);

module.exports = router;
```

---

## 5. TESTING STRATEGY

### 5.1 Unit Tests (`backend/tests/rbac.test.js`)

```javascript
const User = require('../models/User');
const PermissionMiddleware = require('../middleware/permissionMiddleware');

describe('RBAC System', () => {
  describe('User Creation & Hierarchy', () => {
    test('ADMIN can create AGENT', async () => {
      const admin = { id: 1, role: 'ADMIN' };
      const agent = await User.create({
        username: 'agent1',
        email: 'agent1@test.com',
        password: 'password',
        role: 'AGENT',
        parent_id: null
      });
      expect(agent.role).toBe('AGENT');
      expect(agent.parent_id).toBeNull();
    });

    test('AGENT can create USER', async () => {
      const agent = { id: 2, role: 'AGENT' };
      const user = await User.create({
        username: 'user1',
        email: 'user1@test.com',
        password: 'password',
        role: 'USER',
        parent_id: 2
      });
      expect(user.parent_id).toBe(2);
    });

    test('AGENT cannot create AGENT', async () => {
      expect(async () => {
        await User.create({
          username: 'agent2',
          email: 'agent2@test.com',
          password: 'password',
          role: 'AGENT',
          parent_id: 2
        });
      }).rejects.toThrow();
    });

    test('USER must have parent AGENT', async () => {
      expect(async () => {
        await User.create({
          username: 'user2',
          email: 'user2@test.com',
          password: 'password',
          role: 'USER',
          parent_id: null
        });
      }).rejects.toThrow();
    });
  });

  describe('Permissions', () => {
    test('ADMIN has all permissions', async () => {
      const adminPerms = await PermissionMiddleware.getPermissions('ADMIN');
      expect(adminPerms.length).toBeGreaterThan(20);
      expect(adminPerms).toContain('admin.create_agent');
    });

    test('AGENT has limited permissions', async () => {
      const agentPerms = await PermissionMiddleware.getPermissions('AGENT');
      expect(agentPerms).toContain('agent.create_user');
      expect(agentPerms).not.toContain('admin.create_agent');
    });

    test('USER has minimal permissions', async () => {
      const userPerms = await PermissionMiddleware.getPermissions('USER');
      expect(userPerms).toContain('user.edit_profile');
      expect(userPerms).toContain('betting.place_bet');
    });
  });

  describe('Access Control', () => {
    test('AGENT can view own users only', async () => {
      const agent = { id: 2, role: 'AGENT' };
      const ownUser = { parent_id: 2 };
      const otherUser = { parent_id: 3 };

      const canAccessOwn = await PermissionMiddleware.canViewUser(agent, ownUser.parent_id);
      const canAccessOther = await PermissionMiddleware.canViewUser(agent, otherUser.parent_id);

      expect(canAccessOwn).toBe(true);
      expect(canAccessOther).toBe(false);
    });

    test('USER can only view own data', async () => {
      const user = { id: 10, role: 'USER' };
      expect(await PermissionMiddleware.canViewUser(user, 10)).toBe(true);
      expect(await PermissionMiddleware.canViewUser(user, 11)).toBe(false);
    });
  });
});
```

### 5.2 Integration Tests

```javascript
describe('API Integration Tests', () => {
  test('POST /users - Create user as ADMIN', async () => {
    const response = await request(app)
      .post('/api/users')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        username: 'john',
        email: 'john@test.com',
        password: 'secure123',
        role: 'USER',
        parent_id: 2
      });

    expect(response.status).toBe(201);
    expect(response.body.data.role).toBe('USER');
  });

  test('GET /users/:id - Unauthorized access denied', async () => {
    const response = await request(app)
      .get('/api/users/10')
      .set('Authorization', `Bearer ${userToken2}`);

    expect(response.status).toBe(403);
  });
});
```

---

## 6. DEPLOYMENT CHECKLIST

### 6.1 Pre-Deployment

- [ ] Database schema created and verified
- [ ] Permissions seed data loaded
- [ ] Connection pooling configured
- [ ] Password hashing verified (bcrypt 12 rounds)
- [ ] Audit logging tested
- [ ] All indices created
- [ ] Backup strategy defined

### 6.2 Environment Configuration

```env
# .env
DATABASE_HOST=localhost
DATABASE_PORT=3306
DATABASE_NAME=sports_gaming_db
DATABASE_USER=root
DATABASE_PASSWORD=secure_password

# Connection Pool
DB_POOL_SIZE=20
DB_CONNECTION_TIMEOUT=5000

# Redis (for permission caching)
REDIS_URL=redis://localhost:6379

# Logging
LOG_LEVEL=info
AUDIT_LOG_LEVEL=debug
```

### 6.3 Monitoring & Alerts

```javascript
// Setup performance monitoring
const monitoring = {
  queries: {
    slowLog: 1000,  // Alert on queries > 1s
    criticalLog: 5000  // Alert on queries > 5s
  },
  database: {
    connectionPoolUsage: 0.8,  // Alert at 80%
    replicationLag: 100  // Alert if > 100ms
  }
};
```

---

## 7. QUICK START SUMMARY

```bash
# 1. Initialize database
mysql -u root -p < backend/config/rbac_schema.sql

# 2. Create admin user (hash password first)
npm run seed:admin

# 3. Run tests
npm test -- rbac.test.js

# 4. Start server
npm start

# 5. Test endpoints
curl -H "Authorization: Bearer $TOKEN" http://localhost:3000/api/users
```

---

## CONCLUSION

This implementation provides:
✅ Secure role-based access control  
✅ Comprehensive audit logging  
✅ Scalable hierarchy management  
✅ Permission caching for performance  
✅ Data integrity through constraints  
✅ Easy integration with existing system

