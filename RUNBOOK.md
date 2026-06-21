# RUNBOOK — bettorplays247 ops cheat-sheet

VPS pe sab kuch ek hi project root se chalta hai. Pehle hamesha yahan jao:

```bash
cd /home/bettorplays247/htdocs/www.bettorplays247.com/betterdr
```

> Note: prod env file **`.env.production`** hai (NOT `.env`). Web (php8.5-fpm) aur
> CLI workers dono yahi parhte hain. `.env` sirf local/dev ke liye — prod pe inert.

---

## 1. Deploy — naya code laana

Pehle apne **Mac** pe push: `git push origin main`. Phir VPS pe (ek-ek line):

```bash
cd /home/bettorplays247/htdocs/www.bettorplays247.com/betterdr
git fetch origin
git reset --hard origin/main
sudo systemctl reload php8.5-fpm        # web (env/php changes ke liye)
pkill -f scripts/odds-worker.php        # worker restart (watchdog 60s me wapas)
git log --oneline -1                    # confirm: latest commit
```

> Long-running workers env startup pe cache karte hain — **env ya worker code
> change** ho to worker restart zaroori (`pkill`, watchdog respawn kar deta hai).
> Frontend change (dist/) sirf reset chahiye + browser hard-refresh (Cmd+Shift+R).

---

## 2. Rundown feed kill-switch (datapoints bachane ke liye)

```bash
php php-backend/scripts/feed-switch.php off      # feed band: 0 datapoints, odds "unavailable" + suspend
php php-backend/scripts/feed-switch.php on        # wapas normal
php php-backend/scripts/feed-switch.php status    # abhi kya state
```

OFF = saari sports ki odds band (props bhi). File-based, turant lagta hai, no restart.
Reboot ke baad bhi OFF rehta hai jab tak khud `on` na karo.

---

## 3. API status — Rundown se data aa raha ya nahi?

**(a) Key valid + Rundown reachable + datapoints bache hain? (free /sports call):**
```bash
php -r '$b="'"$PWD"'/php-backend";require "$b/src/Autoloader.php";Autoloader::register();require "$b/src/Env.php";Env::load(dirname($b),$b);$k=(string)Env::get("RUNDOWN_API_KEY","");$ch=curl_init("https://therundown.io/api/v2/sports");curl_setopt_array($ch,[CURLOPT_RETURNTRANSFER=>1,CURLOPT_HEADER=>1,CURLOPT_NOBODY=>1,CURLOPT_HTTPHEADER=>["X-TheRundown-Key: $k"]]);$r=curl_exec($ch);echo "HTTP ".curl_getinfo($ch,CURLINFO_HTTP_CODE)."\n";preg_match_all("/x-datapoints-[a-z]*:[^\r\n]*/i",$r,$m);echo implode("\n",$m[0])."\n";'
```
- `HTTP 200` + `x-datapoints-remaining` > 0 → key/plan theek.
- `HTTP 401` → key galat (.env.production mein RUNDOWN_API_KEY).
- `HTTP 403` → plan/budget block (paid endpoints band).

**(b) Paid endpoint (player stats) test — 403 fix hua ya nahi (renewal ke baad):**
```bash
php -r '$b="'"$PWD"'/php-backend";require "$b/src/Autoloader.php";Autoloader::register();require "$b/src/Env.php";Env::load(dirname($b),$b);$k=(string)Env::get("RUNDOWN_API_KEY","");$ch=curl_init("https://therundown.io/api/v2/events/cb1f102090a126d01f24d44f91a04e3c/players/stats");curl_setopt_array($ch,[CURLOPT_RETURNTRANSFER=>1,CURLOPT_HTTPHEADER=>["X-TheRundown-Key: $k"],CURLOPT_TIMEOUT=>15]);echo "HTTP ".curl_getinfo($ch,CURLINFO_HTTP_CODE)."\n".substr(curl_exec($ch),0,300)."\n";'
```
- `HTTP 200` → player stats access mil gaya → prop auto-grading chal jayega.
- `HTTP 403` → plan mein abhi bhi nahi → Rundown support se enable karwao.

**(c) Datapoints kitne use ho rahe** — (a) wala command 2-3 min ke gap se 2 baar
chalao; `x-datapoints-used` barh raha = feed live, flat = band.

---

## 4. Workers — chal rahe hain?

```bash
pgrep -af scripts/odds-worker.php       # odds + settlement engine (PID dikhega)
pgrep -af scripts/prematch-worker.php   # prematch odds
pgrep -af scripts/ws-server.php         # live websocket
```
Restart (watchdog cron har minute respawn karta hai):
```bash
pkill -f scripts/odds-worker.php
sleep 75 && pgrep -af scripts/odds-worker.php   # NAYA pid aana chahiye
```
Watchdog crons dekho:
```bash
crontab -l | grep -i watchdog
```

---

## 5. Logs (`php-backend/logs/`)

```bash
tail -n 50 php-backend/logs/odds-worker.stdout.log     # worker ka kaam (sweeps, settle)
tail -n 50 php-backend/logs/api-access.log              # har request + settlement channel
tail -n 50 php-backend/logs/sportsbook-ops.log          # sportsbook ops warnings
tail -n 50 php-backend/logs/api-errors.log              # errors/exceptions
tail -f  php-backend/logs/watchdog.log                  # watchdog live (Ctrl+C to stop)
```
Useful greps:
```bash
grep -i "circuit breaker open" php-backend/logs/api-access.log | tail        # Rundown HTTP trip
grep -i "player prop stuck pending" php-backend/logs/api-access.log | tail    # prop grading issues
grep -i "player-stats fetch failed" php-backend/logs/api-access.log | tail    # box-score fetch errors
```

---

## 6. Database (MySQL)

Creds dekho (NO secrets yahan likhe — env se):
```bash
grep -E '^MYSQL_(HOST|PORT|USER|PASSWORD|DB)=' .env.production
```
Connect (password prompt aayega — upar wale USER/DB use karo):
```bash
mysql -h 127.0.0.1 -P 3306 -u <MYSQL_USER> -p <MYSQL_DB>
```
Kaam ke queries (mysql prompt ke andar):
```sql
-- pending bets count
SELECT COUNT(*) FROM betselections WHERE status='pending';

-- ek match dhoondo (team naam se)
SELECT id, j_away_team, j_home_team, j_status, j_start_time_dt
FROM matches WHERE j_home_team LIKE '%Yankees%' ORDER BY j_start_time_dt DESC LIMIT 5;

-- stuck player props (jo grade nahi ho rahe)
SELECT id, marketType, selectionPid, status FROM betselections
WHERE marketType LIKE 'batter_%' AND status='pending' LIMIT 20;
```
> ⚠️ Write (UPDATE/DELETE) sirf soch-samajh ke — money tables (users, transactions,
> betselections, casino_bets) pe galat query se balance bigar sakta hai.

---

## 7. Player-prop auto-settlement

- Flag: `SPORTSBOOK_PROP_SETTLEMENT_ENABLED=true` `.env.production` mein.
- Engine: odds-worker daemon (har ~60s settle pass). Flag change → worker restart.
- **Block abhi:** Rundown plan mein player-stats endpoint nahi (403) → renewal ke
  baad section 3(b) test se confirm karo.
- Purane (legacy) prop bets jinme `selectionPid` khaali hai → kabhi auto-grade nahi
  honge, manual settle karna padega.

---

## 8. Tests (deploy se pehle, Mac/local pe)

```bash
cd php-backend && php tests/run.php            # poora suite
php tests/runone.php tests/AltLineCapTest.php   # ek suite
```

---

### Quick reference
| Kaam | Command |
|---|---|
| Project | `cd /home/bettorplays247/htdocs/www.bettorplays247.com/betterdr` |
| Deploy | `git fetch origin && git reset --hard origin/main` |
| Feed off/on | `php php-backend/scripts/feed-switch.php off` / `on` / `status` |
| Worker chal raha? | `pgrep -af scripts/odds-worker.php` |
| Worker restart | `pkill -f scripts/odds-worker.php` |
| Worker log | `tail -n 50 php-backend/logs/odds-worker.stdout.log` |
| DB creds | `grep -E '^MYSQL_' .env.production` |
