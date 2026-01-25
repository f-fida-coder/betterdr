# Quick Reference - Database Commands

## 🚀 Start Everything (Fastest Way)

```bash
# Terminal 1: Start Backend
cd backend && npm run dev

# Terminal 2: Start Frontend  
npm run dev
```

Then open http://localhost:5173

---

## ✅ Check Database Health

```bash
npm run verify-db
```

Expected output shows all 4 tables with row counts.

---

## 🔧 Database Management

### View Data
```bash
# All users
psql -U postgres -d sports_betting -c "SELECT * FROM \"Users\";"

# All matches
psql -U postgres -d sports_betting -c "SELECT * FROM \"Matches\";"

# All bets
psql -U postgres -d sports_betting -c "SELECT * FROM \"Bets\";"

# All transactions
psql -U postgres -d sports_betting -c "SELECT * FROM \"Transactions\";"

# Count all
psql -U postgres -d sports_betting -c "SELECT COUNT(*) FROM \"Users\"; SELECT COUNT(*) FROM \"Matches\";"
```

### Manage Database
```bash
# Initialize/reset database
npm run setup-db

# Drop and recreate
dropdb sports_betting && npm run setup-db

# Interactive database access
psql -U postgres -d sports_betting
# Then use SQL commands like: SELECT * FROM "Users"; \dt
```

---

## 🔗 API Testing (with backend running)

### Users
```bash
# Register
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"username":"test","email":"test@example.com","password":"pass123"}'

# Login
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"pass123"}'
```

### Matches
```bash
# Get all matches
curl http://localhost:5000/api/matches

# Get match by ID
curl http://localhost:5000/api/matches/1
```

### Bets
```bash
# Get user bets
curl http://localhost:5000/api/bets

# Place a bet
curl -X POST http://localhost:5000/api/bets \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{"matchId":1,"amount":50,"odds":1.5,"type":"moneyline","selection":"Home"}'
```

### Wallet
```bash
# Check balance
curl http://localhost:5000/api/wallet/balance \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

## 📊 Database Info

| Table | Purpose | Records |
|-------|---------|---------|
| Users | Player accounts | 4 |
| Matches | Sports matches | 3 |
| Bets | Player bets | 1 |
| Transactions | Financial transactions | 1 |

---

## 🐛 Troubleshooting

| Problem | Solution |
|---------|----------|
| "Connection refused" | `brew services start postgresql@15` |
| "Database does not exist" | `npm run setup-db` |
| "No tables in pgAdmin" | `npm run verify-db` and check output |
| "Port 5000 in use" | Kill process: `lsof -i :5000 \| grep LISTEN \| awk '{print $2}' \| xargs kill -9` |
| "PostgreSQL not found" | `brew install postgresql@15` |

---

## 📚 Documentation

- `DATABASE_SETUP_GUIDE.md` - Complete setup guide
- `DATABASE_STATUS.md` - Current status and SQL queries
- `DATABASE_SETUP_COMPLETE.md` - Summary of what was done

---

## ⚡ Environment Variables (.env)

```env
PORT=5000
DB_NAME=sports_betting
DB_USER=postgres
DB_PASSWORD=postgres
DB_HOST=localhost
JWT_SECRET=secret
```

---

## 📝 Notes

- Backend runs on **port 5000**
- Frontend runs on **port 5173** (Vite)
- PostgreSQL runs on **port 5432**
- Cron job updates odds automatically
- Socket.io for real-time updates
- Stripe integration for payments

---

**Database is ready!** ✅
