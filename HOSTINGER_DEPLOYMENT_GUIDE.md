# Hostinger Configuration Guide for betterdr Sportsbook

## Overview
Hostinger (shared hosting) has specific setup requirements for running a Node.js/PHP full-stack sportsbook with cron workers and real-time odds updates.

---

## 1. REQUIRED SETUP ON HOSTINGER

### A. PHP Version & Extensions
- **Minimum**: PHP 8.1
- **Required Extensions**: (all typically pre-installed)
  - `pdo_mysql` or `mysqli` — database connection
  - `json` — API responses
  - `fileinfo` — file operations
  - `openssl` — JWT + HTTPS
  - `curl` — upstream odds source + external requests
  - `redis` — optional, for cache layer (Redis add-on)

**Check in Hostinger Control Panel**:
```
Home > PHP Settings > PHP Version & Extensions → Select PHP 8.1+
→ Ensure all above are enabled (usually green checkmark)
```

### B. MySQL Database
- Create database via Hostinger > Databases > MySQL
- Note: `DB_HOST`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`
- Run: `php-backend/scripts/init-schema.php` once to create tables

### C. Node.js (for Frontend Build)
- Hostinger may not have Node.js in production environment
- **Solution**: Build frontend locally or in CI/CD, commit `dist/` folder
- Frontend is **static files only** once built (no Node runtime needed)

### D. File Permissions
```bash
# After uploading files via FTP/Git
chmod 755 php-backend/scripts/*.sh
chmod 755 php-backend/logs/
chmod 755 frontend/dist/
chmod 644 .env  # DO NOT make executable
```

---

## 2. CRON JOBS (Critical for Live Odds)

The **worker schedule** keeps odds fresh and settlements up-to-date. On shared hosting, use Hostinger's Cron Jobs panel:

**Location**: Hostinger Control Panel > Advanced > Cron Jobs > Add Job

### Job 1: Main Worker (90-second interval)
```
Command: /usr/bin/php /home/USERNAME/public_html/php-backend/scripts/odds-worker.php
Interval: Every minute (will internally skip to 90s)
Minute: */1
Email: your-email@domain.com (errors only)
```

**Why**: The main worker fetches fresh odds from the upstream source and writes them to MySQL. Every 90 seconds it syncs odds, settles matches, and updates balances. (TODO: Rundown — wire the new sync command path here.)

### Job 2: Watchdog (Monitor worker health)
```
Command: /usr/bin/php /home/USERNAME/public_html/php-backend/scripts/odds-worker-watchdog.sh
Interval: Every minute
Minute: */1
Email: your-email@domain.com
```

**Why**: Ensures the worker hasn't crashed. Restarts it if dead (safe: idempotent).

### Job 3: Settlement Sweep (Backup bet settlement)
```
Command: /usr/bin/php /home/USERNAME/public_html/php-backend/scripts/settlement-sweep.php
Interval: Every 5 minutes
Minute: */5
Email: your-email@domain.com
```

**Why**: If main worker fails, this still settles finished matches so bets don't hang "Pending" forever.

---

## 3. ENVIRONMENT CONFIGURATION

### A. Backend .env (php-backend/.env)

```bash
# ═══════════════════════════════════════════════════════════════════════════
# ODDS REFRESH OPTIMIZATION (New in May 2026)
# ═══════════════════════════════════════════════════════════════════════════

# Worker updates database every 90 seconds (was 10 min)
ODDS_CRON_MINUTES=1.5

# Live odds sync: optimized for sub-20s updates
USER_LIVE_SYNC_MIN_INTERVAL_SECONDS=15
LIVE_TICK_MIN_INTERVAL_SECONDS=5
# TODO: Rundown — primary live + prematch odds source toggle.

# Hostinger Cron Tick Secret (used for internal tick endpoints if needed)
# Generate: openssl rand -hex 32
INTERNAL_TICK_SECRET=GENERATE_AND_SET_THIS

# Database
MYSQL_HOST=localhost
MYSQL_PORT=3306
MYSQL_DB=sports_betting
MYSQL_USER=sports_user
MYSQL_PASSWORD=SECURE_PASSWORD_HERE

# Security
JWT_SECRET=GENERATE_WITH_openssl_rand_hex_32
CORS_ORIGIN=https://yourdomain.com

# TODO: Rundown — add the new odds-source env block here.
ODDS_ALLOWED_SPORTS=basketball_nba,americanfootball_nfl,soccer_epl,baseball_mlb,icehockey_nhl
SPORTS_API_ENABLED=true
ODDS_SCORES_ENABLED=true

# Cache (optional Redis on Hostinger add-on)
REDIS_HOST=  # Leave empty if not using Redis
REDIS_PORT=6379
REDIS_PASSWORD=
REDIS_DATABASE=0

# Logging
APP_ENV=production
APP_LOG_LEVEL=warning  # Reduce noise on shared hosting
```

### B. Frontend .env.production (frontend/.env.production)

```bash
# ═══════════════════════════════════════════════════════════════════════════
# FRONTEND ODDS REFRESH (New in May 2026)
# ═══════════════════════════════════════════════════════════════════════════

# Auto-poll intervals (milliseconds)
VITE_MATCHES_POLL_LIVE_MS=15000      # Live view: 15s (was 30s)
VITE_MATCHES_POLL_OTHER_MS=60000     # Other views: 60s
VITE_MATCHES_POLL_HIDDEN_MS=120000   # Hidden tab: 2min (new!)

# Backend API URL
VITE_API_URL=https://yourdomain.com/api

# Enable features
VITE_ENABLE_MATCH_STREAM=true
```

### C. Create .env Files from Templates

**On Hostinger (via SSH or File Manager)**:
```bash
cd ~/public_html
cp php-backend/.env.example php-backend/.env
cp frontend/.env.production.example frontend/.env.production

# Edit .env with your Hostinger MySQL credentials
nano php-backend/.env
# Fill in: MYSQL_HOST, DB_NAME, DB_USER, DB_PASSWORD, JWT_SECRET, Rundown creds, etc.

nano frontend/.env.production
# Fill in: VITE_API_URL (your domain), VITE_MATCHES_POLL_LIVE_MS, etc.
```

---

## 4. DEPLOYMENT TO HOSTINGER

### Option A: Git-based Deployment (Recommended)
```bash
# Locally
git add -A
git commit -m "Odds refresh optimization: 90s worker + 15s frontend poll"
git push origin main

# On Hostinger (via Git integration or SSH)
git pull origin main
npm run build  # Build frontend (if Node available)
# Or upload pre-built dist/ folder via FTP
```

### Option B: FTP Upload
```bash
# Build locally
npm run build
php-backend/scripts/build.sh  # If applicable

# Upload to Hostinger:
ftp -u ftp://USERNAME:PASSWORD@yourdomain.com:21 \
  php-backend/ \
  frontend/dist/ \
  .env

# Then set permissions
chmod 755 php-backend/scripts/*.sh
chmod 755 php-backend/logs/
```

---

## 5. HOSTINGER-SPECIFIC TWEAKS

### A. Disable OPcache for Development (if debugging)
```php
// php-backend/src/OddsWorker.php (or add to config)
ini_set('opcache.enable', '0');  // Only during debugging!
```

### B. Increase PHP Timeout (for long-running scripts)
Via Hostinger Control Panel > PHP Settings > Max Execution Time:
- Set to **300 seconds** (5 minutes) for worker scripts

### C. Memory Limit for Worker
Via Hostinger Control Panel > PHP Settings > Memory Limit:
- Set to **512 MB** (worker memory + cache)

### D. Optimize MySQL Connections
On Hostinger, connection pool is limited. Add to `php-backend/.env`:
```bash
DB_CONNECTION_POOL_MAX=5
DB_IDLE_TIMEOUT_SECONDS=60
```

---

## 6. VERIFICATION CHECKLIST

- [ ] **PHP 8.1+ installed** and all extensions enabled
- [ ] **MySQL database created** and test connection succeeds
- [ ] **.env files created** with all REQUIRED fields filled
- [ ] **Cron jobs added** (Main Worker, Watchdog, Settlement Sweep)
- [ ] **Frontend dist/ uploaded** (built locally if Node not available)
- [ ] **File permissions correct** (755 for scripts, 644 for .env)
- [ ] **Test manual sync**: `php php-backend/scripts/odds-worker.php --once`
- [ ] **Test API endpoint**: `curl https://yourdomain.com/api/matches`
- [ ] **Check logs**: `tail php-backend/logs/worker.log`

---

## 7. WHAT CHANGED (May 2026 Odds Improvement)

| Component | Before | After | Impact |
|-----------|--------|-------|--------|
| **Worker Interval** | 10 min | 90 sec | 6.7x faster DB updates |
| **Frontend Poll (Live)** | 30 sec | 15 sec | 2x faster UI refresh |
| **Tab Hidden Polling** | Stops | 120 sec | Always-on background updates |
| **Live Now Sync** | 3 sec timeout | 20 sec timeout | Sub-20s odds visible |
| **Prefetch** | None | On sport tab | Instant (<50ms) sport click |
| **Max Staleness** | 10–30 min | 15–90 sec | 10x fresher |

---

## 8. TROUBLESHOOTING

### Odds Not Updating?
1. Check cron logs: Hostinger > Cron Jobs > View Logs
2. Verify Rundown credentials are correct and the account has quota left
3. Check MySQL: `php php-backend/scripts/verify-schema.php`
4. Review: `php-backend/logs/worker.log`

### Live Odds Showing "Stale"?
1. Check worker is running: `ps aux | grep odds-worker`
2. Increase `LIVE_FRESHNESS_SECONDS_DEFAULT` in .env (e.g., 120)
3. Restart worker: `php php-backend/scripts/odds-worker.php --once`

### Frontend Not Refreshing?
1. Check browser console for errors (F12)
2. Verify `VITE_API_URL` matches your Hostinger domain
3. Hard refresh: Ctrl+Shift+Delete (clear cache)
4. Check CORS: `CORS_ORIGIN` should match your frontend domain

### High Hostinger Bandwidth / Slow?
- Reduce `VITE_MATCHES_POLL_LIVE_MS` to 30000 (30s) if 15s causes issues
- Enable Redis caching: Add Hostinger Redis add-on + set `REDIS_HOST`
- Use Cloudflare CDN (free tier) in front of Hostinger

---

## 9. SECURITY CHECKLIST

- [ ] Change `JWT_SECRET` to a strong random value
- [ ] Change `INTERNAL_TICK_SECRET` for cron endpoints
- [ ] Set `CORS_ORIGIN` to your exact domain (not `*`)
- [ ] **Never** commit `.env` to Git (use `.env.example`)
- [ ] Enable **HTTPS only** in Hostinger SSL settings
- [ ] Disable **FTP**, use **SFTP** only
- [ ] Set MySQL user to **minimal required permissions** (SELECT, INSERT, UPDATE, DELETE)

---

## 10. PERFORMANCE TARGETS

After deployment, monitor:

- **Worker Duration**: Should complete in <10s per cycle (check logs)
- **API Response Time**: /api/matches should return in <500ms
- **Odds Freshness**: Latest odds <90s old (visible in UI "Updated X min ago")
- **Hostinger CPU**: Should stay <30% during peak (cron + API requests)
- **Bandwidth**: ~50MB/day for 100 users (mostly API responses)

---

## Questions?

See `ODDS_DISPLAY_ISSUES_ANALYSIS.md` for the full technical deep-dive.
