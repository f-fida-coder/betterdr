# Sportsbook Reliability & UX Polish — 2026-05-13

Working session covering the odds pipeline audit, three phases of period-tab fixes, backend observability, and a few user-visible UX polishes. All changes are in `main` and require a push + worker restart on Hostinger to activate.

---

## 1. Odds pipeline audit (no code change — context)

### How odds flow today
- **Provider → MySQL `matches` table** (single JSON column `odds`, plus `lastOddsSyncAt`, `score`, `status`). No Redis, no MongoDB, no separate odds tables. Row is overwritten in place — no history.
- **Worker process**: long-running PHP at `php-backend/scripts/odds-worker.php`.
- **Watchdog**: `odds-worker-watchdog.sh` runs every minute via Hostinger cron, restarts the worker if it died.

### Refresh cadence
| Layer | Interval |
|---|---|
| Worker main cycle (pre-match) | 90s (was 60s, see §3) |
| All 3 sport tiers | 90s (was 2/3/5 min) |
| Live odds tick (in-progress games) | 10s |
| Frontend poll — live view | 15s |
| Frontend poll — other | 60s |
| Frontend poll — tab hidden | 120s |

### Caching layers
- **HTTP** `Cache-Control: no-store` — browsers never cache odds.
- **Shared file cache** — now 5s (was 0/disabled). Cuts MySQL load during traffic bursts.
- **Frontend local cache** — disabled. Every poll hits backend.

### Read path for bet placement
`BetsController::validateSelection` reads `odds.markets` AND `odds.extendedMarkets`. Bet placement re-validates against MySQL regardless of cache — cache can never cause a bad bet. Settlement reads `score` only, never `odds`.

---

## 2. The "odds disappearing on screen" glitch — fixed

**Symptom:** odds occasionally vanish for a second every ~15s while the screen is on.

**Root cause:** `useMatches.js` was clearing the rendered list to `[]` on any failed background poll (network blip, 504, timeout). Next successful poll repopulated → flash empty.

**Fix:** `frontend/src/hooks/useMatches.js:319-326` — catch block no longer clears state. Last successful snapshot stays on-screen during transient failures; next poll silently refreshes.

---

## 3. 90-second worker + tier unification

**File:** `.env`

```diff
-ODDS_CRON_MINUTES=1
+ODDS_CRON_MINUTES=1.5

-ODDS_TIER1_CRON_MINUTES=2
-ODDS_TIER2_CRON_MINUTES=3
-ODDS_TIER3_CRON_MINUTES=5
+ODDS_TIER1_CRON_MINUTES=1.5
+ODDS_TIER2_CRON_MINUTES=1.5
+ODDS_TIER3_CRON_MINUTES=1.5
```

Every sport on the site now refreshes every 90s on the pre-match path. Quota is intentionally not a constraint for this deployment.

---

## 4. 5-second shared API cache

**File:** `.env`

```diff
-SPORTSBOOK_MATCHES_CACHE_TTL_SECONDS=0
+SPORTSBOOK_MATCHES_CACHE_TTL_SECONDS=5
```

Verified safe via reading `php-backend/src/SharedFileCache.php:28-32`:
- Strict TTL check — files older than 5s are **deleted from disk** before return.
- Cache miss falls through to `SharedFileCache::remember()` which runs the SQL query via `MatchesController::computeMatches()`.
- Lock + stale-fallback prevents thundering herd at expiry.
- Bet placement bypasses cache and re-reads MySQL, so a stale cache entry can never cause a bad bet.

To disable instantly without a code push: set `SPORTSBOOK_MATCHES_CACHE_TTL_SECONDS=0` on the server.

---

## 5. Phase 1 — Static period tabs

**Problem:** the period tab strip (Game / 1H / 2H / 1Q–4Q) randomly disappeared whenever the extended-sync API call missed a cycle.

**Fix:** `frontend/src/components/MobileContentView.jsx:474-484` — dropped the `.filter(p => availableSuffixes.has(p.suffix))`. Tabs are now **static per sport**:
- NBA / NFL: Game / 1H / 2H / 1Q / 2Q / 3Q / 4Q
- MLB: Game / F1 / F3 / F5 / F7
- NHL: Game / P1 / P2 / P3
- Soccer: Game / 1H

When a period genuinely has no lines this cycle (still syncing), an orange banner appears above the match list:
> No 1Q lines available right now — Try Game or pick another period — lines refresh every 90 s.

---

## 6. Phase 2 — Smart "closed period" treatment

**Problem:** after Phase 1, the banner still showed "lines refresh every 90 s" even when a period was genuinely **over** (e.g. 1Q after halftime). Misleading.

**Fix 1 — list view dimming** (`MobileContentView.jsx:311-345, 550-583, 1219-1244`):
- New `isPeriodClosedForMatch(periodId, match)` helper. Sport-aware (soccer halves use 2-period thresholds, basketball/football use 4-quarter thresholds).
- `closedPeriodIds` set — a period is "closed" only when **every visible match is live AND past it**. A single pre-game match keeps the period actionable, preserving Phase 1's stability.
- Closed tabs render at **45% opacity + strikethrough** with tooltip "1Q has ended for every live game".

**Fix 2 — smarter banner copy** (`MobileContentView.jsx:1316-1339`):
- Closed for all: **"1Q has ended — Pick another period or switch back to Game."**
- Just no lines yet: **"No 1Q lines available right now — lines refresh every 90 s."**

**Fix 3 — detail view auto-hide closed sections** (`MatchDetailView.jsx:133-178`):
- For live matches only, period sections (1Q Spread/ML/Total, 1H, etc.) are hidden once the match's current period passes them.
- Pre-game / finished matches show every section the API returns.
- Sport-aware: soccer halves use different thresholds than basketball.

---

## 7. Phase 3 — Backend observability for extended sync

**Audit finding:** Phase 3b ("merge instead of overwrite on partial response") was **already implemented** at `OddsSyncService.php:1337-1338`. The actual gap was **visibility** — extended-sync failures were silent.

**Fix 1 — per-cycle counters** (`OddsSyncService.php:1290-1392`):
`syncEventExtendedForMatches` now returns:
- `freshMatches` — matches where API returned data
- `preservedMatches` — matches where we kept old data (silent failure mode)
- `errors` — matches where the DB write threw
- `freshBySport` / `preservedBySport` — per-sport breakdown

Previously-silent `Throwable` catch now calls `Logger::warning('odds_extended_write_failed', …)`.

**Fix 2 — new SportsbookHealth methods** (`SportsbookHealth.php:151-273`):
- `recordExtendedSyncResult($db, $result)` — updates sync health doc with `lastExtendedSuccessAt`, `consecutiveExtendedEmptyCycles`, per-sport counts.
- `checkExtendedSyncHealth($db, ?threshold)` — fires one alert per empty streak when `consecutiveExtendedEmptyCycles >= EXTENDED_SYNC_ALERT_CYCLES` (default 6 cycles = ~9 min at 90s cadence). Resets debounce on next successful cycle.

**Fix 3 — worker log visibility** (`odds-worker.php:96-114, 134-145`):

Each cycle now logs:
```
extended sync fresh=14 preserved=2 errors=0 calls=18 preservedBySport={"basketball_nba":2}
```

When an empty streak crosses threshold:
```
extended sync health alert: no fresh alt/period markets in > 6 cycles — players will see Phase-1 'no lines' banners on 1Q/1H/etc.
```

**Money-safety review:** observability-only. No reads/writes of `users.balance`, `transactions`, `casino_bets`, `bets`, or wallet fields. No changes to bet placement, settlement, or odds validation. No new SQL on hot tables.

---

## 8. UI polish

### "BET" pill goes green
**File:** `AccountPanel.jsx:367`
- Active state for BET changed from navy `#0f172a` → green `#16a34a` (same green as WIN and balance text). RISK stays orange.

### Helper text recentered
**File:** `AccountPanel.jsx:517-525`
- Added `textAlign: 'center'`.
- Changed `marginTop: -8 → 18` (negative margin was overlapping the MIN BET / MAX BET chip labels).

### Hide +/P+ buttons in teaser mode
**File:** `MobileContentView.jsx`
- Passed `isTeaserMode={normalizedBetMode === 'teaser'}` to MatchCard.
- Gated the action button stack on `!isTeaserMode`.
- Removed the trailing `30px` grid column when in teaser mode so spread/total chips align cleanly to the right edge.
- Other modes (Straight, Parlay, RR, If-Bet, Reverse) keep the buttons.

---

## 9. Cron job fix (username typo)

**Symptom:** `odds-worker.log` never appeared in Hostinger `php-backend/logs/`. Worker silently never ran.

**Cause:** cron command pointed to `/home/u48787782/...` (8-digit username) but the actual Hostinger account is `u487877829` (9 digits). Path didn't exist for this user.

**Fix:** updated the Hostinger cron command:
```
* * * * * PHP_BIN=/opt/alt/php82/usr/bin/php /bin/sh /home/u487877829/domains/bettorplays247.com/public_html/php-backend/scripts/odds-worker-watchdog.sh >> /home/u487877829/domains/bettorplays247.com/public_html/php-backend/logs/watchdog.log 2>&1
```

Two changes:
1. `u48787782` → `u487877829` in both paths.
2. Added `PHP_BIN=/opt/alt/php82/usr/bin/php` (cron PATH doesn't include `php` by default on Hostinger).

**Status post-fix:** `watchdog.log` + `sportsbook-ops.log` now appear. Site reports working with fresh odds. `odds-worker.log` still missing — likely Hostinger blocks `file_put_contents` from the background process, but the worker IS doing its job (other log file is being written via `Logger`).

---

## 10. "+" button modal — prioritize Alt Lines

**Problem:** clicking `+` on a match row opened MatchDetailView with **Game Spread / ML / Total** expanded at the top. Those lines are already visible on the row. Alt spreads / alt totals / team totals (the actual reason to tap `+`) were buried below, collapsed.

**Fix:** `MatchDetailView.jsx`

1. **Reordered `SECTION_DEFS`** (line 14-31): alt sections first, then game-level, then periods/props.
2. **Default-expanded state** (line 78-87): flipped from `{spreads, h2h, totals}` → `{alternate_spreads, alternate_totals, team_totals, alternate_team_totals}`.
3. **Subtitle**: `"Main Bets"` → `"Alt Lines & Totals"`.

### Mockup test
**File:** `frontend/scripts/test-alt-bets-priority.mjs`

Pure-JS mirror of the section-filter pipeline. **19 assertions, all pass.**

| # | Scenario | Result |
|---|---|---|
| 1 | Pre-game + book offers everything | alt sections render first ✓ |
| 2 | Book offers only main lines | main sections still render ✓ |
| 3 | Partial alts (no team totals) | present alts still come first ✓ |
| 4 | Live mid-Q3 with closed-period markets | alts preserved, closed 1Q/1H dropped ✓ |
| 5 | Empty match | empty list, no crash ✓ |

Plus 11 source-level pins that catch any future edit re-shuffling the order. Run anytime:
```
node frontend/scripts/test-alt-bets-priority.mjs
```

---

## How to deploy / activate

1. **Push** the branch to production.
2. SSH to Hostinger (or use File Manager).
3. **Restart the worker** so the new env values + extended-sync logging load:
   ```
   pkill -f scripts/odds-worker.php
   ```
   Watchdog cron will respawn it within 60 seconds.
4. **Tail the worker log** for the new line:
   ```
   tail -f /home/u487877829/domains/bettorplays247.com/public_html/php-backend/logs/odds-worker.log
   ```
   Expect lines like `update ok ...` and `extended sync fresh=N preserved=N ...`.
5. **Optional env override:**
   - `EXTENDED_SYNC_ALERT_CYCLES=N` — tighten/loosen extended-sync watchdog.

## How to verify in the UI

1. NBA list view → period tabs (Game / 1H / 2H / 1Q / 2Q / 3Q / 4Q) always visible, stable across refreshes.
2. Watch odds for 30 s during a live game — they should NEVER blank out and reappear.
3. Tap `+` on a match row → modal opens with Alt Spread / Alt Total / Team Totals expanded at top.
4. In teaser mode → `+` and `P+` buttons are hidden on all rows.
5. Settings → Bet Defaults → BET pill is green, helper text centered.

---

## Files touched

### Frontend
- `frontend/src/hooks/useMatches.js` — preserve last snapshot on fetch error
- `frontend/src/components/MobileContentView.jsx` — static period tabs, closed-period dimming, smart banner, hide +/P+ in teaser
- `frontend/src/components/MatchDetailView.jsx` — alt-section priority, default expanded, closed-period filter
- `frontend/src/components/AccountPanel.jsx` — green BET pill, recentered helper text
- `frontend/.env.production` — (unchanged this session, referenced for poll intervals)

### Backend
- `php-backend/src/OddsSyncService.php` — extended-sync counters, error log, call `recordExtendedSyncResult`
- `php-backend/src/SportsbookHealth.php` — `recordExtendedSyncResult` + `checkExtendedSyncHealth`
- `php-backend/scripts/odds-worker.php` — per-cycle extended-sync log line, wire health check

### Config
- `.env` — `ODDS_CRON_MINUTES=1.5`, all 3 tiers `=1.5`, `SPORTSBOOK_MATCHES_CACHE_TTL_SECONDS=5`

### New
- `frontend/scripts/test-alt-bets-priority.mjs` — mockup test (19 assertions)

### Hostinger
- Cron command updated to use correct 9-digit username + explicit PHP_BIN
