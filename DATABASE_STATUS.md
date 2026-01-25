# Database Status Report - January 21, 2026

## ✅ Database Status: ACTIVE

### Connection Details
- **Host:** localhost
- **Database:** sports_betting
- **Port:** 5432
- **User:** postgres
- **Status:** ✅ Connected

---

## 📊 Database Contents

### Users (4 records)
```
id | username | email | balance | role | status
---+----------+-------+---------+------+---------
1  | admin    | admin@test.com | 10000.00 | admin | active
2  | user1    | user1@test.com | 500.00 | user | active
3  | user2    | user2@test.com | 1000.00 | user | active
4  | player3  | player3@test.com | 200.00 | user | active
```

**Columns:** id, username, email, password, balance, pendingBalance, totalWinnings, role, status, createdAt, updatedAt

### Matches (3 records)
```
id | homeTeam | awayTeam | sport | status
---+----------+---------+-------+---------
1  | Team A | Team B | soccer | scheduled
2  | Team C | Team D | basketball | scheduled
3  | Team E | Team F | soccer | live
```

**Columns:** id, externalId, homeTeam, awayTeam, startTime, status, sport, odds (JSONB), score (JSONB), lastUpdated, createdAt, updatedAt

### Bets (1 record)
```
id | userId | matchId | amount | odds | type | selection | status
---+--------+---------+--------+------+------+-----------+--------
1  | 1 | 1 | 50.00 | 1.50 | moneyline | Home | pending
```

**Columns:** id, userId (FK→Users), matchId (FK→Matches), amount, odds, type, selection, potentialPayout, status, createdAt, updatedAt

### Transactions (1 record)
```
id | userId | amount | type | status
---+--------+--------+------+---------
1  | 1 | 50.00 | bet_placed | completed
```

**Columns:** id, userId (FK→Users), amount, type, status, stripePaymentId, description, createdAt, updatedAt

---

## 🔗 Relationships Verified
- ✅ User → Bets (one-to-many)
- ✅ User → Transactions (one-to-many)
- ✅ Match → Bets (one-to-many)

---

## 🛠️ Database Management Commands

### View all users
```bash
psql -U postgres -d sports_betting -c "SELECT id, username, email, balance, role FROM \"Users\" ORDER BY id;"
```

### View all matches
```bash
psql -U postgres -d sports_betting -c "SELECT id, homeTeam, awayTeam, sport, status FROM \"Matches\" ORDER BY id;"
```

### View all bets
```bash
psql -U postgres -d sports_betting -c "SELECT id, userId, matchId, amount, odds, type, status FROM \"Bets\" ORDER BY id;"
```

### View all transactions
```bash
psql -U postgres -d sports_betting -c "SELECT id, userId, amount, type, status FROM \"Transactions\" ORDER BY id;"
```

### Count records in each table
```bash
psql -U postgres -d sports_betting -c "
SELECT 
    'Users' as table_name, COUNT(*) as count FROM \"Users\"
UNION ALL
SELECT 'Matches' as table_name, COUNT(*) as count FROM \"Matches\"
UNION ALL
SELECT 'Bets' as table_name, COUNT(*) as count FROM \"Bets\"
UNION ALL
SELECT 'Transactions' as table_name, COUNT(*) as count FROM \"Transactions\";"
```

### Add sample user
```sql
INSERT INTO "Users" (username, email, password, balance, role) 
VALUES ('testuser', 'test@example.com', 'hashedpassword', 1000.00, 'user');
```

### Add sample match
```sql
INSERT INTO "Matches" (homeTeam, awayTeam, sport, startTime, status)
VALUES ('Team X', 'Team Y', 'soccer', NOW() + INTERVAL '2 hours', 'scheduled');
```

---

## 📝 Notes

- Database is properly created and synced
- All 4 required tables exist with correct schemas
- Sample data is already seeded
- All relationships and constraints are in place
- Ready for API testing

---

## 🚀 Next Steps

1. **Start the backend server:**
   ```bash
   cd backend
   npm run dev
   ```

2. **Test API endpoints:**
   ```bash
   # Register a new user
   curl -X POST http://localhost:5000/api/auth/register \
     -H "Content-Type: application/json" \
     -d '{"username":"newuser","email":"new@test.com","password":"password123"}'

   # Login
   curl -X POST http://localhost:5000/api/auth/login \
     -H "Content-Type: application/json" \
     -d '{"email":"new@test.com","password":"password123"}'

   # Get all matches
   curl http://localhost:5000/api/matches
   ```

3. **Verify with frontend:**
   ```bash
   npm run dev
   ```
   Open http://localhost:5173 in browser

---

## 📚 Database Setup Scripts

Available npm commands in backend:

```bash
npm run dev           # Start backend with hot reload
npm run start         # Start backend (production)
npm run setup-db      # Initialize database (creates tables if needed)
npm run verify-db     # Verify database status and contents
```
