# VPS Quick Commands — bettorplays247

> Personal cheat-sheet. Poora detail `RUNBOOK.md` mein hai. Yahan sirf exact,
> copy-paste-ready commands hain + comments. `<...>` wali jagah apni value daalo.

---

## 0. Project root (pehle hamesha yahan jao)

```bash
# Sab commands isi folder se chalti hain
cd /home/bettorplays247/htdocs/www.bettorplays247.com/betterdr
```

---

## 1. Env file (zaroori baatein)

```bash
# Prod env file YEH hai (.env NAHI). Web + workers dono yahi parhte hain.
# Edit karna ho to seedha VPS pe (git se nahi aati — gitignored):
nano .env.production

# Kaunse vars set hain (sirf naam, value bhi dikhegi — dhyan se):
grep -E '^(MYSQL_|RUNDOWN_|SPORTSBOOK_)' .env.production
```

> ⚠️ Env change karne ke baad **worker restart zaroori** (section 4) — workers
> startup pe env cache karte hain. Web ke liye `reload php8.5-fpm` (section 2).

> 📌 **Precedence (Env.php, verified 2026-07-08):** production mode (hostname
> hstgr match) mein sirf `.env.production` parhi jaati hai — root wali
> authoritative, `php-backend/.env.production` fallback. **Root `.env` prod pe
> IGNORED hai** (sirf dev mode mein primary). Isi drift ne
> `RUNDOWN_PREMATCH_DAYS_AHEAD` (2 vs 4) confusion banaya — ab sab files 4 pe
> aligned (2026-07-08). Naya var set karo to CHARON files mein same value
> rakho (root + php-backend × .env + .env.production) taake drift kabhi na ho.

> 🔮 **Advance/7-day bump (pending PO):** `RUNDOWN_PREMATCH_DAYS_AHEAD=7`
> dono `.env.production` files mein + odds/prematch worker respawn + fpm
> reload (props-backfill bhi yehi var parhta hai). Phir 24h X-Datapoints
> headers watch karo (250M/mo pace) — budget ura de to days 3-7 ke liye slow
> tier design karna hai, tab tak revert.

---

## 2. Deploy — naya code laana

```bash
# (Mac pe pehle: git push origin main)

# 1) latest code kheencho
git fetch origin
git reset --hard origin/main

# 2) web reload (env/php/backend change ke liye)
sudo systemctl reload php8.5-fpm

# 3) worker restart (env ya worker code change ho to) — watchdog 60s me wapas laata hai
pkill -f scripts/odds-worker.php

# 4) confirm: latest commit aa gaya?
git log --oneline -1
```

> Sirf frontend (dist/) change hua → bas step 1 kaafi + browser hard-refresh
> (Cmd+Shift+R). Service worker hata diya gaya hai, ab purana cache khud clear hota hai.

---

## 3. Database (MySQL) mein jana

```bash
# 1) creds dekho (host/port/user/db + password screen pe aayega)
grep -E '^MYSQL_(HOST|PORT|USER|PASSWORD|DB)=' .env.production

# 2) connect karo — upar wale MYSQL_USER aur MYSQL_DB use karo,
#    -p ke baad ENTER, phir MYSQL_PASSWORD type karo
mysql -h 127.0.0.1 -P 3306 -u <MYSQL_USER> -p <MYSQL_DB>
```

Tables pe prefix nahi hai — seedhe naam: `users`, `betselections`, `matches`,
`transactions`, `casino_bets`.

```sql
-- mysql prompt ke andar — pehle hamesha SELECT se check karo

-- pending bets kitni hain
SELECT COUNT(*) FROM betselections WHERE status='pending';

-- ek match dhoondo (team naam se)
SELECT id, j_away_team, j_home_team, j_status, j_start_time_dt
FROM matches WHERE j_home_team LIKE '%Yankees%'
ORDER BY j_start_time_dt DESC LIMIT 5;

-- stuck player props (grade nahi ho rahe)
SELECT id, marketType, selectionPid, status FROM betselections
WHERE marketType LIKE 'batter_%' AND status='pending' LIMIT 20;

-- ek user ka balance
SELECT id, username, balance, pendingBalance FROM users WHERE username='<USERNAME>';
```

> ⚠️ UPDATE/DELETE sirf 100% sure hone pe. `users` / `transactions` /
> `betselections` / `casino_bets` pe galat query = balance bigar jata hai.
> mysql se nikalne ke liye: `exit`

---

## 4. Workers (chal rahe hain?)

```bash
# chal raha hai? (PID dikhega to chal raha hai)
pgrep -af scripts/odds-worker.php        # odds + settlement engine (sabse zaroori)
pgrep -af scripts/prematch-worker.php    # prematch odds
pgrep -af scripts/ws-server.php          # live websocket

# restart (watchdog cron har minute respawn karta hai)
pkill -f scripts/odds-worker.php
sleep 75 && pgrep -af scripts/odds-worker.php   # NAYA pid aana chahiye

# watchdog crons dekho
crontab -l | grep -i watchdog
```

---

## 5. Rundown feed kill-switch (datapoints bachane ko)

```bash
php php-backend/scripts/feed-switch.php status   # abhi kya state
php php-backend/scripts/feed-switch.php off       # band: 0 datapoints, odds "unavailable"
php php-backend/scripts/feed-switch.php on         # wapas normal
```

> OFF turant lagta hai (no restart) + reboot ke baad bhi OFF rehta hai jab tak `on` na karo.

---

## 6. Logs (`php-backend/logs/`)

```bash
tail -n 50 php-backend/logs/odds-worker.stdout.log   # worker ka kaam (sweeps, settle)
tail -n 50 php-backend/logs/api-errors.log           # errors / exceptions
tail -n 50 php-backend/logs/sportsbook-ops.log       # sportsbook warnings
tail -f  php-backend/logs/watchdog.log               # watchdog live (Ctrl+C band karne ko)

# kaam ke greps
grep -i "circuit breaker open"      php-backend/logs/api-access.log | tail   # Rundown HTTP trip
grep -i "player-stats fetch failed" php-backend/logs/api-access.log | tail   # box-score errors
```

---

## 7. Feature flags (`.env.production` — sab default ON)

```bash
# add/change karo, phir worker restart (section 4)
SPORTSBOOK_PROP_SETTLEMENT_ENABLED=true     # prop auto-grading (PROD pe confirm karlo!)
SPORTSBOOK_PROP_TEAM_LOGO_ENABLED=true      # pending bet pe single-team logo
SPORTSBOOK_PROP_TEAM_FILTER_ENABLED=true    # prop builder team filter
```

> Kisi ko `false` karke feature band kar sakte ho bina naye deploy ke (worker restart zaroori).

---

## 8. API status (Rundown se data aa raha?)

```bash
# key valid + datapoints bache? (free call) — HTTP 200 = theek, 401 = key galat, 403 = plan block
php -r '$b="'"$PWD"'/php-backend";require "$b/src/Autoloader.php";Autoloader::register();require "$b/src/Env.php";Env::load(dirname($b),$b);$k=(string)Env::get("RUNDOWN_API_KEY","");$ch=curl_init("https://therundown.io/api/v2/sports");curl_setopt_array($ch,[CURLOPT_RETURNTRANSFER=>1,CURLOPT_HEADER=>1,CURLOPT_NOBODY=>1,CURLOPT_HTTPHEADER=>["X-TheRundown-Key: $k"]]);$r=curl_exec($ch);echo "HTTP ".curl_getinfo($ch,CURLINFO_HTTP_CODE)."\n";preg_match_all("/x-datapoints-[a-z]*:[^\r\n]*/i",$r,$m);echo implode("\n",$m[0])."\n";'
```

---

### Quick reference

| Kaam | Command |
|---|---|
| Project root | `cd /home/bettorplays247/htdocs/www.bettorplays247.com/betterdr` |
| Deploy | `git fetch origin && git reset --hard origin/main` |
| Web reload | `sudo systemctl reload php8.5-fpm` |
| Worker restart | `pkill -f scripts/odds-worker.php` |
| Worker chal raha? | `pgrep -af scripts/odds-worker.php` |
| DB creds | `grep -E '^MYSQL_' .env.production` |
| DB connect | `mysql -h 127.0.0.1 -P 3306 -u <USER> -p <DB>` |
| Feed off/on | `php php-backend/scripts/feed-switch.php off` / `on` / `status` |
| Worker log | `tail -n 50 php-backend/logs/odds-worker.stdout.log` |
Off krne ke liye odds 
`php php-backend/scripts/feed-switch.php on`
`php php-backend/scripts/feed-switch.php off`
Check krne ke liye kiya status hai on ya off    `
`php php-backend/scripts/feed-switch.php status`
database mein jane ke liye 
`/Users/mac/Desktop/ngames`
odds api ko OFF ke liye (idempotent — purani line delete kar ke EK nayi likhta hai, chaaron env files me; audit 2026-07-16)
`cd ~/htdocs/www.bettorplays247.com/betterdr && for f in .env .env.production php-backend/.env php-backend/.env.production; do sed -i '/^ODDS_API_MASTER_ENABLED=/d' "$f"; printf 'ODDS_API_MASTER_ENABLED=false\n' >> "$f"; done && grep -c 'ODDS_API_MASTER_ENABLED=false' .env .env.production php-backend/.env php-backend/.env.production && pkill -f oddsapi-worker.php`
aur ON ke liye
`cd ~/htdocs/www.bettorplays247.com/betterdr && for f in .env .env.production php-backend/.env php-backend/.env.production; do sed -i '/^ODDS_API_MASTER_ENABLED=/d' "$f"; printf 'ODDS_API_MASTER_ENABLED=true\n' >> "$f"; done && grep -c 'ODDS_API_MASTER_ENABLED=true' .env .env.production php-backend/.env php-backend/.env.production && pkill -f oddsapi-worker.php`
verify (75s baad — watchdog respawn + flag effect):
`cd ~/htdocs/www.bettorplays247.com/betterdr && pgrep -af oddsapi-worker.php && tail -1 php-backend/logs/oddsapi-worker.stdout.log`

> ⚠️ **env.runtime kabhi delete mat karna** (project root ki 19-byte file, `APP_ENV=production`).
> PHP `gethostname()` ab bare `srv1713630` deta hai (hstgr detection dead) — CLI workers
> production mode me SIRF is file ki wajah se hain. Delete hui to sab workers silently
> dev mode (root `.env` primary) me chale jayenge. (Verified 2026-07-16)