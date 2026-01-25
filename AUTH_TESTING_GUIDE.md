# Authentication & Data Flow Guide

## ✅ What's Already Set Up

### Backend Authentication
- ✅ **Register endpoint:** `POST /api/auth/register`
  - Creates new users in database
  - Hashes passwords with bcrypt
  - Returns JWT token
  
- ✅ **Login endpoint:** `POST /api/auth/login`
  - Validates credentials
  - Returns JWT token
  - Supports test accounts (admin/admin123, test/test123, etc.)
  
- ✅ **User model with all required fields:**
  - username, email, password (hashed)
  - balance, pendingBalance, totalWinnings
  - role (admin/user), status (active/suspended)

### Frontend UI
- ✅ **RegisterModal component** - Beautiful registration form
- ✅ **Header with Login/Register buttons** - Easy access
- ✅ **Token storage in localStorage** - Persistent login

### Database Integration
- ✅ **Users table** - Stores all registered users
- ✅ **Automatic data sync** - New registrations saved immediately

---

## 🚀 How to Test Registration & Login

### Step 1: Start the Application

**Terminal 1 - Backend:**
```bash
cd backend
npm run dev
```

**Terminal 2 - Frontend:**
```bash
npm run dev
```

**Open:** http://localhost:5173

### Step 2: Test Registration

1. Click **"REGISTER"** button in header
2. Fill in:
   - Username: `testuser123`
   - Email: `testuser@example.com`
   - Password: `password123`
   - Confirm Password: `password123`
3. Click **"SIGN UP"**
4. Success message: "Registration successful! Please login."

### Step 3: Test Login

1. Click **"LOGIN"** button in header
2. Fill in:
   - Username: `testuser123`
   - Password: `password123`
3. Click **"SIGN IN"**
4. You're logged in! ✅

### Step 4: Verify Data in Database

**Option A - Using pgAdmin:**
1. Open pgAdmin → sports_betting → Tables → Users
2. Click **Data** tab
3. You'll see your new user with:
   - ✅ username: `testuser123`
   - ✅ email: `testuser@example.com`
   - ✅ balance: 0.00 (default)
   - ✅ role: `user`
   - ✅ status: `active`

**Option B - Using Terminal:**
```bash
psql -U postgres -d sports_betting -c "SELECT id, username, email, balance, role, status FROM \"Users\" ORDER BY id DESC LIMIT 5;"
```

**Option C - Using Admin Panel:**
1. Login as admin (username: `admin`, password: `admin123`)
2. Click **Admin Panel**
3. Go to **Users** section
4. You'll see your new user listed with all details

---

## 📊 Data Flow Diagram

```
User Registration
├── Frontend (RegisterModal.jsx)
│   └── User fills form
│       └── Submits to backend
│
├── Backend (authController.js)
│   └── Validates data
│   └── Checks if email exists
│   └── Hashes password with bcrypt
│   └── Creates user in database
│   └── Returns JWT token
│
└── Database (Users table)
    └── User saved with:
        • username (unique)
        • email (unique)
        • password (hashed)
        • balance: 0.00
        • role: 'user'
        • status: 'active'
        • createdAt, updatedAt timestamps
```

---

## 🔐 Test Credentials (Pre-seeded)

These users are already in the database:

| Username | Password | Balance | Role |
|----------|----------|---------|------|
| admin | admin123 | 10000.00 | admin |
| user1 | user1123 | 500.00 | user |
| user2 | user2123 | 1000.00 | user |
| player3 | player3123 | 200.00 | user |

---

## 📋 API Endpoints

### Register
```bash
POST http://localhost:5000/api/auth/register
Content-Type: application/json

{
  "username": "newuser",
  "email": "newuser@example.com",
  "password": "password123"
}
```

**Response:**
```json
{
  "id": 5,
  "username": "newuser",
  "email": "newuser@example.com",
  "balance": 0,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

### Login
```bash
POST http://localhost:5000/api/auth/login
Content-Type: application/json

{
  "username": "newuser",
  "password": "password123"
}
```

**Response:**
```json
{
  "id": 5,
  "username": "newuser",
  "email": "newuser@example.com",
  "balance": 0,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

---

## 🔍 Admin Panel - View All Users

1. **Login as admin:**
   - Username: `admin`
   - Password: `admin123`

2. **Click Admin Panel** (appears after login)

3. **View Users section shows:**
   - All registered users
   - Usernames and emails
   - Account balances
   - Account status (active/suspended)
   - Ability to suspend/unsuspend users

---

## ✅ Verification Checklist

- [ ] Backend running on port 5000
- [ ] Frontend running on port 5173
- [ ] Can see Register button in header
- [ ] Can fill and submit registration form
- [ ] New user appears in database (pgAdmin or terminal)
- [ ] Can login with registered credentials
- [ ] Can see user in Admin Panel
- [ ] User balance shows 0.00 by default
- [ ] User status is "active"

---

## 🐛 Troubleshooting

**Issue:** Registration fails with "User already exists"
- **Solution:** Use a unique username/email, or register with a different email

**Issue:** Login fails with "Invalid username or password"
- **Solution:** Check that username and password are correct (case-sensitive)

**Issue:** New user doesn't appear in database
- **Solution:** 
  - Check backend logs for errors
  - Verify database connection is active
  - Run: `npm run verify-db` in backend folder

**Issue:** Can't see users in Admin Panel
- **Solution:**
  - You must be logged in as admin
  - Test with: username `admin`, password `admin123`

---

## 📝 Database Schema - Users Table

```sql
CREATE TABLE "Users" (
    id SERIAL PRIMARY KEY,
    username VARCHAR UNIQUE NOT NULL,
    email VARCHAR UNIQUE NOT NULL,
    password VARCHAR NOT NULL,  -- Hashed with bcrypt
    balance DECIMAL(10,2) DEFAULT 0.00,
    pendingBalance DECIMAL(10,2) DEFAULT 0.00,
    totalWinnings DECIMAL(10,2) DEFAULT 0.00,
    role ENUM('user', 'admin') DEFAULT 'user',
    status ENUM('active', 'suspended') DEFAULT 'active',
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

---

## 🎯 Next Steps

1. ✅ Test registration with a new user
2. ✅ Verify user appears in database
3. ✅ View user in Admin Panel
4. ✅ Test login with registered user
5. ✅ Make bets and track transactions
6. ✅ View bets in Admin Panel

Everything is ready to use! 🎉
