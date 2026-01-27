# ✅ REGISTRATION & LOGIN - Complete Testing Guide

## 📋 What Gets Saved When You Register

When you fill out the registration form and submit:

1. **Data Saved to Database:**
   - Username
   - Email
   - Password (hashed with bcrypt for security)
   - Role: automatically set to `'user'`
   - Status: automatically set to `'active'`
   - Balance: set to `0.00`

2. **Response You Get:**
   - User ID (auto-generated)
   - Token (JWT for login)
   - User details (username, email, balance, role)

## 🧪 Testing Registration

### Via Frontend (Your App)

**Step 1: Go to the homepage**
- Navigate to `http://localhost:5173`

**Step 2: Click "REGISTER" or "JOIN NOW" button**

**Step 3: Fill in the form:**
```
Username: testuser123
Email: testuser@example.com
Password: password123
Confirm Password: password123
```

**Step 4: Click "REGISTER"**

**Step 5: Check browser console (F12):**
- Look for: `Calling registerUser API with: testuser123`
- Look for: `Registration successful: {...}`

**Step 6: You should see:**
- Alert: "Registration successful! Please login with your credentials."
- Modal closes automatically
- You're back to login screen

**Step 7: Login with your new account:**
- Username: `testuser123`
- Password: `password123`
- Click "SIGN IN"

---

### Via Command Line (Testing)

**Test registration with curl:**
```bash
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "username":"quicktest1",
    "email":"quick@test.com",
    "password":"pass123"
  }'
```

**Expected Response:**
```json
{
  "id": 17,
  "username": "quicktest1",
  "email": "quick@test.com",
  "balance": "0.00",
  "role": "user",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "message": "Registration successful"
}
```

---

## 🔐 Registration Validation

The following validations happen:

### Frontend Checks:
- ✅ All fields filled (username, email, password)
- ✅ Passwords match

### Backend Checks:
- ✅ Email not already registered
- ✅ Username not already taken
- ✅ Valid email format
- ✅ Password requirements

### Error Messages:

| Condition | Error Message |
|-----------|---------------|
| Missing fields | "Please fill all required fields" |
| Passwords don't match | "Passwords do not match" |
| Email already registered | "Email already registered" |
| Username already taken | "Username already taken" |
| Network error | "Network error - Unable to reach server" |

---

## 📊 Registered User Data

After registration, your account has:

```json
{
  "id": (auto-generated),
  "username": "your_username",
  "email": "your_email",
  "password": "(hashed)",
  "role": "user",
  "status": "active",
  "balance": 0.00,
  "pendingBalance": 0.00,
  "totalWinnings": 0.00,
  "createdAt": "2026-01-26T...",
  "updatedAt": "2026-01-26T..."
}
```

---

## 🔄 After Registration: Login

**After you register, login like this:**

1. Username: (the username you registered with)
2. Password: (the password you registered with)
3. Click "SIGN IN"

You'll receive a JWT token that lets you:
- Place bets
- Create users/agents (if admin)
- Manage your account
- Access all features

---

## 🔍 Verify Data in Database

To verify your registered user exists in the database:

```bash
# Connect to database
psql -U postgres -d sports_betting

# List all users
\d "Users"

# See your registered user
SELECT id, username, email, role, status, balance FROM "Users" WHERE username = 'testuser123';
```

---

## ✅ Complete Testing Checklist

- [ ] **Frontend registration works**
  - [ ] Can fill out form
  - [ ] Submit button works
  - [ ] Get success alert
  - [ ] Modal closes

- [ ] **Data is saved correctly**
  - [ ] User appears in database
  - [ ] All fields are correct
  - [ ] Password is hashed

- [ ] **Can login with new account**
  - [ ] Login succeeds
  - [ ] Receive JWT token
  - [ ] Token starts with `eyJ...`

- [ ] **Error handling works**
  - [ ] Duplicate email shows error
  - [ ] Duplicate username shows error
  - [ ] Missing fields shows error

---

## 🚀 Quick Start

**Ready to test? Do this:**

```bash
# 1. Make sure backend is running
curl http://localhost:5000/

# 2. Make sure frontend is running (npm run dev in another terminal)

# 3. Go to http://localhost:5173

# 4. Click REGISTER

# 5. Fill in form with:
Username: myuser123
Email: myuser@test.com
Password: mypass123
Confirm: mypass123

# 6. Click REGISTER button

# 7. Check console for success messages

# 8. Login with same credentials

# 9. Should see admin dashboard
```

---

## 📝 Backend Logs to Look For

When you register, check backend terminal for:

```
📝 Register request: { username: 'testuser', email: 'test@example.com' }
✅ User registered successfully: testuser (ID: 16)
```

If there's an error:
```
❌ User already exists: test@example.com
❌ Username already exists: testuser
❌ Registration error: [error details]
```

---

## 🎯 Summary

✅ **Registration creates a real user account**
✅ **Data is saved to PostgreSQL database**
✅ **You get a JWT token for future requests**
✅ **You can login immediately after registering**
✅ **Full validation on both frontend and backend**
✅ **Detailed error messages for debugging**

**Everything is now ready for full testing!**
