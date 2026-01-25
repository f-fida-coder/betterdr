# Sports Betting Backend - Database Setup & Verification Guide

## Overview

This guide helps you set up and verify the PostgreSQL database for the sports betting application.

**Current Setup:**
- **Backend**: Node.js/Express on port 5000
- **Database**: PostgreSQL
- **ORM**: Sequelize
- **Tables**: Users, Matches, Bets, Transactions

---

## Prerequisites

### 1. PostgreSQL Installation

#### macOS with Homebrew:
```bash
# Install PostgreSQL
brew install postgresql@15

# Start PostgreSQL service
brew services start postgresql@15

# Verify installation
psql --version
```

#### Verify PostgreSQL is running:
```bash
# Check if PostgreSQL service is running
brew services list | grep postgresql

# Expected output: postgresql@15 ... started
```

---

## Database Setup

### Step 1: Create the Database

The backend will automatically create tables when you run the server, but we provide a setup script for explicit verification:

```bash
cd backend

# Run the automatic setup script
npm run setup-db
```

**Expected Output:**
```
╔════════════════════════════════════════════════════════╗
║       Sports Betting Database Setup & Verification      ║
╚════════════════════════════════════════════════════════╝

🔧 Configuration:
   Host: localhost
   Database: sports_betting
   User: postgres

📦 STEP 1: Checking if database exists...
✅ Database 'sports_betting' already exists

📋 STEP 2: Syncing Sequelize models...
✅ Connected to sports_betting database
✅ All models synced successfully

🔍 STEP 3: Verifying tables were created...
✅ Found 4 table(s):
   ✅ Users
   ✅ Matches
   ✅ Bets
   ✅ Transactions

📋 Users columns:
   • id: integer (not null)
   • username: character varying (not null)
   • email: character varying (not null)
   • password: character varying (not null)
   ...

✅ DATABASE SETUP SUCCESSFUL!
```

### Step 2: Start the Backend Server

```bash
cd backend
npm run dev
```

**Expected Output:**
```
📦 Starting Sports Betting Backend...

🔗 Connecting to database...
✅ Database connected successfully.
   Database: sports_betting
   Host: localhost
   User: postgres

📋 Syncing database models...
✅ Database synced successfully.

📊 Tables in database (4):
   • Bets
   • Matches
   • Transactions
   • Users

⚡ Initializing Socket.io...
✅ Socket.io initialized.

⏰ Starting background jobs...
✅ Cron jobs started.

╔════════════════════════════════════════════════════════╗
║    ✅ SERVER READY FOR CONNECTIONS!                    ║
║    Port: 5000                                           ║
╚════════════════════════════════════════════════════════╝
```

---

## Verification

### Verify Database Setup

```bash
npm run verify-db
```

This script checks:
- ✅ Database connection
- ✅ All tables exist
- ✅ Table schemas and columns
- ✅ Row counts in each table
- ✅ Model relationships

### Using pgAdmin (Graphical Interface)

1. **Install pgAdmin:**
   ```bash
   brew install --cask pgadmin4
   ```

2. **Open pgAdmin** and create a connection:
   - **Host name/address:** localhost
   - **Port:** 5432
   - **Username:** postgres
   - **Password:** postgres (default, set in .env if different)

3. **View the database:**
   - Left sidebar → Servers → PostgreSQL 15 → Databases → sports_betting
   - Tables → See Users, Matches, Bets, Transactions

### Using PostgreSQL Command Line

```bash
# Connect to the database
psql -U postgres -d sports_betting

# List all tables
\dt

# View table structure
\d "Users"
\d "Matches"
\d "Bets"
\d "Transactions"

# Count rows
SELECT COUNT(*) FROM "Users";
SELECT COUNT(*) FROM "Matches";
SELECT COUNT(*) FROM "Bets";
SELECT COUNT(*) FROM "Transactions";

# View all users
SELECT id, username, email, balance FROM "Users";

# Exit
\q
```

---

## Database Schema

### Users Table
```sql
CREATE TABLE "Users" (
    id SERIAL PRIMARY KEY,
    username VARCHAR UNIQUE NOT NULL,
    email VARCHAR UNIQUE NOT NULL,
    password VARCHAR NOT NULL,
    balance DECIMAL(10,2) DEFAULT 0.00,
    pendingBalance DECIMAL(10,2) DEFAULT 0.00,
    totalWinnings DECIMAL(10,2) DEFAULT 0.00,
    role ENUM('user', 'admin') DEFAULT 'user',
    status ENUM('active', 'suspended') DEFAULT 'active',
    createdAt TIMESTAMP,
    updatedAt TIMESTAMP
);
```

### Matches Table
```sql
CREATE TABLE "Matches" (
    id SERIAL PRIMARY KEY,
    externalId VARCHAR UNIQUE,
    homeTeam VARCHAR NOT NULL,
    awayTeam VARCHAR NOT NULL,
    startTime TIMESTAMP NOT NULL,
    status ENUM('scheduled', 'live', 'finished', 'cancelled') DEFAULT 'scheduled',
    sport VARCHAR NOT NULL,
    odds JSONB DEFAULT '{}',
    score JSONB DEFAULT '{}',
    lastUpdated TIMESTAMP,
    createdAt TIMESTAMP,
    updatedAt TIMESTAMP
);
```

### Bets Table
```sql
CREATE TABLE "Bets" (
    id SERIAL PRIMARY KEY,
    userId INTEGER NOT NULL REFERENCES "Users"(id),
    matchId INTEGER NOT NULL REFERENCES "Matches"(id),
    amount DECIMAL(10,2) NOT NULL,
    odds DECIMAL(10,2) NOT NULL,
    type VARCHAR NOT NULL,
    selection VARCHAR NOT NULL,
    potentialPayout DECIMAL(10,2) NOT NULL,
    status ENUM('pending', 'won', 'lost', 'void') DEFAULT 'pending',
    createdAt TIMESTAMP,
    updatedAt TIMESTAMP
);
```

### Transactions Table
```sql
CREATE TABLE "Transactions" (
    id SERIAL PRIMARY KEY,
    userId INTEGER NOT NULL REFERENCES "Users"(id),
    amount DECIMAL(10,2) NOT NULL,
    type ENUM('deposit', 'withdrawal', 'bet_placed', 'bet_won', 'bet_refund') NOT NULL,
    status ENUM('pending', 'completed', 'failed') DEFAULT 'completed',
    stripePaymentId VARCHAR,
    description VARCHAR,
    createdAt TIMESTAMP,
    updatedAt TIMESTAMP
);
```

---

## Troubleshooting

### Issue: "ECONNREFUSED - Connection refused"

**Solution:**
```bash
# Start PostgreSQL
brew services start postgresql@15

# Verify it's running
brew services list | grep postgresql
```

### Issue: "Database does not exist"

**Solution:**
```bash
# Run the setup script
npm run setup-db

# Or manually create it
createdb sports_betting
```

### Issue: "Permission denied for user postgres"

**Solution:**
```bash
# Check if postgres user exists
psql -U postgres -c "SELECT 1"

# If not, create it
createuser postgres -s

# Set password if needed
psql -U postgres -c "ALTER USER postgres PASSWORD 'postgres';"
```

### Issue: "Port 5432 already in use"

**Solution:**
```bash
# Find process using port 5432
lsof -i :5432

# Kill it
kill -9 <PID>

# Or change PostgreSQL port in .env
DB_PORT=5433
```

### Issue: "Tables not created after running server"

**Solution:**
```bash
# Run explicit setup
npm run setup-db

# Then verify
npm run verify-db

# Check models/index.js is exporting all models correctly
```

---

## Environment Variables (.env)

```env
PORT=5000
DB_NAME=sports_betting
DB_USER=postgres
DB_PASSWORD=postgres
DB_HOST=localhost
JWT_SECRET=your-secret-key-here
STRIPE_SECRET_KEY=sk_test_PLACEHOLDER
STRIPE_WEBHOOK_SECRET=whsec_PLACEHOLDER
```

---

## API Endpoints

Once the database is set up and server is running:

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `POST /api/auth/logout` - Logout user

### Wallet/Balance
- `GET /api/wallet/balance` - Get user balance
- `POST /api/wallet/deposit` - Deposit funds
- `POST /api/wallet/withdraw` - Withdraw funds

### Matches
- `GET /api/matches` - Get all matches
- `GET /api/matches/:id` - Get match details

### Bets
- `POST /api/bets` - Place a bet
- `GET /api/bets` - Get user bets
- `GET /api/bets/:id` - Get bet details

### Admin
- `GET /api/admin/users` - List all users
- `GET /api/admin/bets` - List all bets
- `POST /api/admin/odds` - Update odds

---

## Quick Start (Summary)

```bash
# 1. Start PostgreSQL
brew services start postgresql@15

# 2. Navigate to backend
cd backend

# 3. Install dependencies (if not already done)
npm install

# 4. Setup database
npm run setup-db

# 5. Verify setup
npm run verify-db

# 6. Start backend server
npm run dev

# 7. In another terminal, start frontend
cd ..
npm run dev
```

---

## Support

For issues or questions:
1. Check troubleshooting section above
2. Review server logs for error messages
3. Run `npm run verify-db` to diagnose database issues
4. Check [PostgreSQL Documentation](https://www.postgresql.org/docs/)
5. Check [Sequelize Documentation](https://sequelize.org/)
