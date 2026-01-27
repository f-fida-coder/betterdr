# Agent & User Creation Implementation Guide

## Summary of Changes

✅ **Updated Files:**
1. `/backend/models/User.js` - Added 'agent' role to enum, added fullName field
2. `/backend/controllers/adminController.js` - Added createAgent() and createUser() functions
3. `/backend/routes/adminRoutes.js` - Added POST /create-agent and POST /create-user routes

✅ **New Migration:**
- `/backend/migrations/add_fullname_to_users.js` - Adds fullName column to Users table

---

## API Endpoints

### 1. Create Agent (Admin Only)
**Endpoint:** `POST /api/admin/create-agent`

**Headers:**
```
Authorization: Bearer <admin_token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "username": "agent1",
  "email": "agent1@test.com",
  "password": "agent123",
  "fullName": "Agent One"
}
```

**Success Response (201):**
```json
{
  "message": "Agent created successfully",
  "agent": {
    "id": 5,
    "username": "agent1",
    "email": "agent1@test.com",
    "fullName": "Agent One",
    "role": "agent",
    "status": "active",
    "createdAt": "2024-01-15T10:30:00.000Z"
  }
}
```

**Error Responses:**
- `400` - Missing required fields (username, email, password)
- `409` - Username or email already exists
- `401` - Unauthorized (not logged in)
- `403` - Forbidden (not an admin)
- `500` - Server error

---

### 2. Create User (Admin Only)
**Endpoint:** `POST /api/admin/create-user`

**Headers:**
```
Authorization: Bearer <admin_token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "username": "player1",
  "email": "player1@test.com",
  "password": "user123",
  "fullName": "Player One"
}
```

**Success Response (201):**
```json
{
  "message": "User created successfully",
  "user": {
    "id": 6,
    "username": "player1",
    "email": "player1@test.com",
    "fullName": "Player One",
    "role": "user",
    "status": "active",
    "balance": "0.00",
    "createdAt": "2024-01-15T10:35:00.000Z"
  }
}
```

**Error Responses:** Same as create-agent

---

## Frontend Integration Examples

### React Component Example

```jsx
import axios from 'axios';

const AdminPanel = () => {
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    fullName: ''
  });

  const token = localStorage.getItem('authToken');

  const createAgent = async (e) => {
    e.preventDefault();
    try {
      const response = await axios.post('/api/admin/create-agent', formData, {
        headers: { Authorization: `Bearer ${token}` }
      });
      alert(`Agent created: ${response.data.agent.username}`);
      setFormData({ username: '', email: '', password: '', fullName: '' });
      // Refresh user list
      fetchUsers();
    } catch (error) {
      alert(error.response?.data?.message || 'Error creating agent');
    }
  };

  const createUser = async (e) => {
    e.preventDefault();
    try {
      const response = await axios.post('/api/admin/create-user', formData, {
        headers: { Authorization: `Bearer ${token}` }
      });
      alert(`User created: ${response.data.user.username}`);
      setFormData({ username: '', email: '', password: '', fullName: '' });
      // Refresh user list
      fetchUsers();
    } catch (error) {
      alert(error.response?.data?.message || 'Error creating user');
    }
  };

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  return (
    <div className="admin-panel">
      <div className="create-agent-section">
        <h2>Create New Agent</h2>
        <form onSubmit={createAgent}>
          <input
            type="text"
            name="username"
            placeholder="Username"
            value={formData.username}
            onChange={handleChange}
            required
          />
          <input
            type="email"
            name="email"
            placeholder="Email"
            value={formData.email}
            onChange={handleChange}
            required
          />
          <input
            type="password"
            name="password"
            placeholder="Password"
            value={formData.password}
            onChange={handleChange}
            required
          />
          <input
            type="text"
            name="fullName"
            placeholder="Full Name"
            value={formData.fullName}
            onChange={handleChange}
          />
          <button type="submit">Create Agent</button>
        </form>
      </div>

      <div className="create-user-section">
        <h2>Create New User</h2>
        <form onSubmit={createUser}>
          <input
            type="text"
            name="username"
            placeholder="Username"
            value={formData.username}
            onChange={handleChange}
            required
          />
          <input
            type="email"
            name="email"
            placeholder="Email"
            value={formData.email}
            onChange={handleChange}
            required
          />
          <input
            type="password"
            name="password"
            placeholder="Password"
            value={formData.password}
            onChange={handleChange}
            required
          />
          <input
            type="text"
            name="fullName"
            placeholder="Full Name"
            value={formData.fullName}
            onChange={handleChange}
          />
          <button type="submit">Create User</button>
        </form>
      </div>
    </div>
  );
};

export default AdminPanel;
```

---

## Testing the Implementation

### Using cURL

**Create Agent:**
```bash
curl -X POST http://localhost:5000/api/admin/create-agent \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "username": "agent1",
    "email": "agent1@test.com",
    "password": "agent123",
    "fullName": "Agent One"
  }'
```

**Create User:**
```bash
curl -X POST http://localhost:5000/api/admin/create-user \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "username": "player1",
    "email": "player1@test.com",
    "password": "user123",
    "fullName": "Player One"
  }'
```

### Using Postman

1. Create a new POST request
2. URL: `http://localhost:5000/api/admin/create-agent`
3. Go to "Headers" tab, add:
   - Key: `Authorization`
   - Value: `Bearer YOUR_ADMIN_TOKEN`
4. Go to "Body" tab, select "raw" → "JSON"
5. Paste the request body above
6. Click "Send"

---

## User Roles & Permissions

After these changes, your system now supports 3 roles:

| Role | Can Create | Restrictions |
|------|-----------|--------------|
| **admin** | agents, users | Full access |
| **agent** | users | Limited access (future: can create users for their team) |
| **user** | none | Regular betting access |

---

## Database Changes

The User table now has these fields:

```sql
id (INTEGER, PRIMARY KEY)
username (VARCHAR, UNIQUE)
email (VARCHAR, UNIQUE)
password (VARCHAR, hashed with bcrypt)
fullName (VARCHAR, new field)
balance (DECIMAL)
pendingBalance (DECIMAL)
totalWinnings (DECIMAL)
role (ENUM: 'user', 'agent', 'admin')
status (ENUM: 'active', 'suspended')
createdAt (TIMESTAMP)
updatedAt (TIMESTAMP)
```

---

## Security Notes

✅ **Password Security:**
- Passwords are hashed with bcrypt before storing (handled in model hooks)
- Never returned in API responses

✅ **Input Validation:**
- Username and email uniqueness checked before creation
- All required fields validated
- Email format validated

✅ **Authentication:**
- All creation endpoints require JWT token (`protect` middleware)
- All creation endpoints require admin role (`admin` middleware)

⚠️ **Future Enhancements:**
- Add password strength validation (min 8 chars, special chars, etc.)
- Add audit logging (track who created which user)
- Add email verification
- Implement rate limiting on creation endpoints
- Add role-based creation permissions (agents creating users)

---

## Troubleshooting

### "401 Unauthorized"
- Check that token is included in Authorization header
- Token format should be: `Bearer <token_value>`
- Verify token hasn't expired

### "403 Forbidden"
- Verify logged-in user has 'admin' role
- Check that middleware chain is: `protect` → `admin` → controller

### "409 Conflict"
- Username or email already exists in database
- Try with different username/email values

### "500 Server Error"
- Check server logs for detailed error message
- Verify database connection is active
- Ensure User model is properly migrated

---

## Next Steps

1. ✅ Update User model with agent role
2. ✅ Implement createAgent & createUser endpoints
3. ✅ Add routes for new endpoints
4. ⏳ Update frontend to call these endpoints
5. ⏳ Test full workflow: Create agent → Create user → Login as user
6. ⏳ (Optional) Implement agent hierarchy (parent_id field)
7. ⏳ (Optional) Add audit logging for agent/user creation
8. ⏳ (Optional) Add email verification workflow
