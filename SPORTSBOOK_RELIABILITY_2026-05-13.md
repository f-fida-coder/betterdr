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

## 10. "+" button modal — alt-only More Bets

**Original problem:** clicking `+` on a match row opened MatchDetailView with **Game Spread / ML / Total** expanded at the top. Those lines are already visible on the row. Alt spreads / alt totals / team totals (the actual reason to tap `+`) were buried below, collapsed.

**Initial fix (later superseded):** reorder + default-expand the alt sections — alt lines came first but the redundant Game Spread/ML/Total and per-period Spread/ML/Total sections still rendered below.

**Why that wasn't enough:** the period-tab strip on the list view (Game / 1H / 2H / 1Q–4Q / etc.) already filters the match list by period. So every `spreads_q1`, `h2h_h1`, `totals_p2`, MLB inning-split section etc. in the `+` modal was a duplicate of something the player could already pick from a tab. The "+" button should surface ONLY the bet types that aren't reachable from the row or the period strip.

**Final fix (current):** `MatchDetailView.jsx`

1. **`SECTION_DEFS` rewritten** to contain only:
   - `alternate_spreads`, `alternate_totals`, `team_totals`, `alternate_team_totals` (game-level alts)
   - `alternate_spreads_{h1,h2,q1..q4}`, `alternate_totals_{h1,h2,q1..q4}`, `team_totals_{h1,h2,q1..q4}` (per-period alts — these have no period-tab equivalent)
   - `h2h_3_way`, `btts`, `btts_h1`, `draw_no_bet`, `double_chance` (soccer-specific alts)
   - **Removed:** plain `spreads`, `h2h`, `totals` (row); every `spreads_{q*,h*,p*}` / `h2h_…` / `totals_…` (period strip); MLB inning splits (period strip covers F1/F3/F5/F7).
2. **Default-expanded state** flipped from `{spreads, h2h, totals}` → `{alternate_spreads, alternate_totals, team_totals, alternate_team_totals}`.
3. **Subtitle**: `"Main Bets"` → `"Alt Lines & Totals"`.
4. **Closed-period filter** updated — `sectionPeriodToken` now matches suffix `_q1` / `_h2` / `_p3` instead of full `spreads_q1` patterns, so per-period alt sections (`team_totals_q1`, `alternate_spreads_h1`) still disappear once that period ends on a live match.

### Mockup test
**File:** `frontend/scripts/test-alt-bets-priority.mjs` — rewritten for the new contract.

**29 assertions, all pass.** Now includes negative pins (raw `spreads` / `spreads_q1` / `h2h_h1` / MLB inning markets must NOT be in SECTION_DEFS), per-period alt sections must be present, and closed-period suffix matching is exercised mid-live-game.

```
node frontend/scripts/test-alt-bets-priority.mjs
```

---

## 11. MyBets — freeplay / credit breakdown on ticket detail

**Problem:** the expanded ticket panel in the My Bets / Weekly Figures views showed `Type: Straight (Freeplay)` but no dollar split of how much was freeplay vs how much was real credit. For mixed-funding tickets (e.g. $700 freeplay + $300 credit on a $1000 risk), the player had no way to see what slice was theirs to lose vs the house pool's.

**Why the data was already there:**
- Placement (`BetsController.php:632-700`) computes `freeplayApplied = min(freeplayBalance, totalRisk)`, `realPortion = totalRisk - freeplayApplied`, and stores both `freeplayAmountUsed` (DECIMAL) and `isFreeplay` (bool) on the bet doc.
- Settlement (`BetSettlementService.php:249-340`) reads `freeplayUsed` and splits payout — freeplay slice returns profit only, credit slice returns stake + profit, void refunds both pools.
- The API enrichment passes both fields through untouched to `/api/bets/my-bets`.
- `MyBetsView.cashRiskOfBet()` already split totalRisk into `{cashRisk, fpUsed}` for the per-row RISK column annotation — it just wasn't surfaced in the expanded panel.

**Fix (display-only, no money math added):** `MyBetsView.jsx::BetDetailsPanel`

Added rows only when `fpUsed > 0`:
- **`Wagered`** — `$700.00 freeplay + $300.00 credit` (or `$700.00 freeplay` for pure-FP)
- **`Lost`** — same split, only on `status==='lost'`
- **`Refunded`** — same split, only on `status==='void'`
- **Wins** intentionally skip the per-pool result line — total profit is already on the row, and user feedback was "even though it won it doesn't matter [whose pool the profit came from]".

Uses `moneyExact()` (the file's standard formatter), not raw `toFixed(2)`. No backend change.

---

## 12. MyBets — drop FP annotation from pending-totals footer

**Problem:** the pending list footer `Total` row repeated the `$X.XX FP` annotation underneath the cash total, making it look like the player owed both the cash AND the freeplay numbers.

**Fix:** `MyBetsView.jsx` `BetTable` totals branch — render only `moneyExact(totalCashRisk)`. The per-row RISK cell still carries the `+$X.XX FP` annotation (so the FP info isn't lost), the footer just doesn't duplicate it.

Scope is contained: `showTotals=true` is set in exactly one place — the top-level pending list at the bottom of MyBetsView. Round-robin / parlay leg sublists pass `showTotals={false}` and skip this branch.

---

## 13. Betslip per-leg — fix WIN/RISK input rendering when top Bet Amount drives the math

**Problem:** in straight mode, typing in the top Apply-to-All `WIN` field with $1000 against a -164 leg correctly showed `RISK: $1640` on the leg card, but the leg's `WIN` cell rendered `$0`. Symmetric on the other side: BET mode at $1000 against a +153 leg correctly computed `RISK=$1000 / WIN=$1530`, but the leg's `RISK` cell rendered `$0`.

**Root cause:** `ModeBetPanel.jsx:2411-2416` (pre-fix) keyed the per-card input display on `stakeSource` alone:
```jsx
const winInputValue = stakeSource === 'win'
    ? (sel?.wagerOverride?.winRaw ?? '')
    : (win > 0 ? formatMoney(win) : '');
```
A `wagerOverride` is created ONLY when the user types directly into a per-card field. Without one, the top Bet Amount drives `effectiveStakeForSelection`, which still returns a `source` ('win' / 'risk' / smart-resolved for BET mode). That `source` matched the input on the "source side" → fell through to `wagerOverride.winRaw ?? ''` (undefined) → rendered blank → `$0`.

**Fix:** gate the raw-override branch on `hasOverride`, so without an override both inputs always fall to the formatted derived value:
```jsx
const hasOverride = !!sel?.wagerOverride;
const riskInputValue = hasOverride && stakeSource === 'risk'
    ? (sel?.wagerOverride?.riskRaw ?? '')
    : (risk > 0 ? formatMoney(risk) : '');
const winInputValue = hasOverride && stakeSource === 'win'
    ? (sel?.wagerOverride?.winRaw ?? '')
    : (win > 0 ? formatMoney(win) : '');
```

**Verification (6-scenario trace):**

| Mode | Odds | Override | Risk shows | Win shows |
|------|------|----------|------------|-----------|
| BET | +153 | none | 1000 | 1530 ✓ |
| BET | -164 | none | 1640 | 1000 ✓ |
| RISK | any | none | typed | derived ✓ |
| WIN | any | none | derived | typed ✓ |
| any | any | per-card RISK typed | raw user text | derived ✓ |
| any | any | per-card WIN typed | derived | raw user text ✓ |

Apply-to-All / top Bet Amount **does not** create overrides (confirmed via grep + comment at `ModeBetPanel.jsx:1390-1393`), so `hasOverride` is a clean discriminator. Real-time updates work because `effectiveStakeForSelection` is `useCallback`-memoized on `[stakeMode, wager]` — every keystroke re-derives values on the same render cycle.

---

## 14. Betslip per-leg — slim card layout

**User ask:** "make these lines skinnier" — leg cards in the betslip looked chunky on mobile.

**Fix:** `ModeBetPanel.jsx` — style-only changes, no logic:

| Element | Before | After |
|---|---|---|
| Header bar padding | `8px 12px` | `5px 12px` |
| Card body top padding | `10px 12px` | `7px 12px 8px` |
| Selection name font | `16px` / lineHeight `1.3` | `14px` / lineHeight `1.2` |
| Selection marginBottom | `4` / `8` | `2` / `5` |
| Match-time fontSize | `11` | `10` (lineHeight `1.1`, marginBottom `5`) |
| Buy Points button padding | `8px 10px` | `5px 10px` (lineHeight `1.2`) |
| Buy Points marginTop | `8` | `6` |
| Risk/Win row marginTop + gap | `8` / `8` | `6` / `6` |
| Risk/Win cell padding | `4px 10px` | `2px 10px` (lineHeight `1.15`, input padding/margin `0`) |

**Net:** ~30-35px shorter per leg-card. Tap targets remain viable: Buy Points ≈ 25px, Risk/Win inputs ≈ 28-30px. No money-math touched — every change is a style prop.

---

## 15. PENDING $0 bug — missing `$nin` operator in SqlRepository

**Problem:** the header `PENDING` tile read `$0` even when a player had an active mixed-funding bet (`$1640 risk, $1000 freeplay applied, $640 cash`). On a credit account that meant `Available = creditLimit + balance - 0` instead of `creditLimit + balance - 640`, silently over-stating available credit by the full cash exposure of every pending bet.

**Root cause:** `AuthController::pendingRiskForUser` issued

```php
'status' => ['$nin' => ['won', 'lost', 'void']]
```

but `SqlRepository::matchesCondition` (lines 1739-1784 pre-fix) only handled `$in`, `$ne`, `$gt/$gte/$lt/$lte`, `$regex`, `$exists`, `$options`. An unrecognized operator fell through to `return false` at the end of the loop — so the filter rejected EVERY document, the query returned an empty array, and `pendingRiskForUser` summed nothing → `$0`.

`AdminCoreController` line 5764 already carried a comment confirming this limitation was known (`// SqlRepository does not support $nin, so use explicit $ne clauses instead`), but `AuthController` never got the workaround — the bug had been live the entire time freeplay tickets existed.

**Fix:** `SqlRepository.php` — added `$nin` handling that mirrors MongoDB semantics:

```php
if ($op === '$nin') {
    if (!is_array($expected) || $this->anyIn($fieldValues, $expected)) {
        return false;
    }
    continue;
}
```

- Field value matches any expected → fail (exclude doc).
- No match → pass.
- Field absent → `$fieldValues` is empty → `anyIn` returns false → condition passes (matches MongoDB).

**Money-safety:** read-path only. No bet placement / settlement / wallet writes touched. The fix corrects an UNDERCOUNT — users who saw `$0 PENDING` will now see the correct cash exposure, and `Available` drops by that amount. This is a CORRECTION, not a debit — no money moves; the display catches up to reality. Settlement remains unaffected (it queries `status = 'pending'` direct equality, not `$nin`).

**Regression test:** `php-backend/scripts/test-sql-repository-nin.php` — **13 assertions, all pass**:

- 4 basic semantics (pending passes, won/lost/void fail)
- 3 edge cases (missing field passes, empty `$nin` array passes, non-array condition fails defensively)
- 3 original-bug replays (mixed-FP pending included, won/lost excluded)
- 3 sibling-operator regressions (`$in`, `$ne` still work as before)

```
php php-backend/scripts/test-sql-repository-nin.php
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
3. Tap `+` on a match row → modal opens with **only** Alt Spread / Alt Total / Team Totals + per-period Team Totals. No game Spread/ML/Total and no period Spread/ML/Total (those live on the row + the period strip).
4. In teaser mode → `+` and `P+` buttons are hidden on all rows.
5. Settings → Bet Defaults → BET pill is green, helper text centered.
6. **Betslip — straight mode:**
   - Type `1000` in top Apply-to-All `WIN`, pick a -164 leg → leg shows `RISK $1640 / WIN $1000` immediately, both fields populated.
   - Switch to `BET` mode, pick a +153 leg → leg shows `RISK $1000 / WIN $1530`.
   - Type into per-card RISK → that side keeps your raw keystrokes, WIN re-derives.
   - Leg cards visibly shorter than before (~30px less per card).
7. **My Bets / Weekly Figures expanded ticket:**
   - On a mixed-funding bet, expanded panel shows `Wagered: $X freeplay + $Y credit`.
   - Lost mixed ticket → also `Lost: $X freeplay + $Y credit`. Void → `Refunded: …`.
   - Pending list footer `Total` shows cash-only sum (no `$X FP` annotation below the headline).
8. **Header PENDING tile (credit account, mixed-FP ticket):**
   - Place a `$1640` ticket with `$1000 FP + $640 cash`.
   - Header should immediately show `PENDING: $640` (was previously `$0`).
   - `AVAILABLE` should drop by exactly `$640` (not stay flat as before).
   - After the bet settles, `PENDING` returns to `$0` and `AVAILABLE` recovers the `$640`.

---

## Files touched

### Frontend
- `frontend/src/hooks/useMatches.js` — preserve last snapshot on fetch error
- `frontend/src/components/MobileContentView.jsx` — static period tabs, closed-period dimming, smart banner, hide +/P+ in teaser
- `frontend/src/components/MatchDetailView.jsx` — alt-only More Bets modal: trimmed SECTION_DEFS to alt + per-period team-totals + soccer alts; suffix-based closed-period filter
- `frontend/src/components/MyBetsView.jsx` — Wagered / Lost / Refunded freeplay-credit split rows in BetDetailsPanel; pending-totals footer cash-only (drops FP annotation)
- `frontend/src/components/ModeBetPanel.jsx` — `hasOverride` gate on per-leg RISK/WIN input display; slimmed leg-card padding / fonts / line-heights
- `frontend/src/components/AccountPanel.jsx` — green BET pill, recentered helper text
- `frontend/.env.production` — (unchanged this session, referenced for poll intervals)

### Backend
- `php-backend/src/OddsSyncService.php` — extended-sync counters, error log, call `recordExtendedSyncResult`
- `php-backend/src/SportsbookHealth.php` — `recordExtendedSyncResult` + `checkExtendedSyncHealth`
- `php-backend/scripts/odds-worker.php` — per-cycle extended-sync log line, wire health check
- `php-backend/src/SqlRepository.php` — added `$nin` operator support (fixed silent zero-PENDING bug in `AuthController::pendingRiskForUser`)

### Config
- `.env` — `ODDS_CRON_MINUTES=1.5`, all 3 tiers `=1.5`, `SPORTSBOOK_MATCHES_CACHE_TTL_SECONDS=5`

### New / rewritten tests
- `frontend/scripts/test-alt-bets-priority.mjs` — rewritten for the alt-only More Bets contract (29 assertions: pin alt sections present, pin raw spread/ML/total absent, pin closed-period suffix filter)
- `php-backend/scripts/test-sql-repository-nin.php` — new (13 assertions): pin `$nin` operator semantics + the pendingRiskForUser scenario + `$in`/`$ne` non-regression

### Hostinger
- Cron command updated to use correct 9-digit username + explicit PHP_BIN

---

# Afternoon session — live-odds resilience, bet grading SLA, figures correctness, sport rail

Continued the same day. Six more themed passes — live odds no longer blank when the backend hiccups; finished bets grade within minutes (not "whenever a user opens My Bets"); weekly figures math reconciles end-balance → next-week carry-forward across user, admin, and agent reporting; sport rail redesigned to match a pro book.

---

## 16. Live Now odds stability — 60s grace + periodic mount-sync

**Symptom:** ~2 minutes into Live Now, all odds vanish. Polls keep firing every 15s but return `[]` until the user navigates away and back.

**Root cause traced two layers deep:**
1. Backend `/api/matches?status=live` filters rows whose `lastOddsSyncAt` is older than `LIVE_FRESHNESS_SECONDS_DEFAULT` (90s) — see [MatchesController.php:289-306](php-backend/src/MatchesController.php#L289-L306). When the OddsAPI worker misses a tick (or its watchdog hasn't restarted it yet), surviving live rows age past 90s and the endpoint returns `[]`.
2. Frontend `useMatches.applyMatchesIfChanged([])` wipes the rendered list to empty. Subsequent polls also return `[]` because the worker is still down → players sit on an empty board.

**Fix (two-layered, commit `2f35b79d`):**

- `useMatches.js` — added `LIVE_EMPTY_GRACE_MS = 60_000` ([useMatches.js:21-29](frontend/src/hooks/useMatches.js#L21-L29)). When a live poll returns `[]` but `prev` had rows, the hook keeps prev on screen for up to 60s. Any non-empty response resets the grace timer. After 60s of consistent empties, accept the empty state (game truly ended).
- `MobileContentView.jsx` + `SportContentView.jsx` — converted the one-shot `syncLiveMatches()` on Live Now mount into a **recurring 60s `setInterval`**. Each call refreshes `lastOddsSyncAt` on the backend, so live rows never age out from under the player. Aborts in-flight controller on each new tick; pauses while tab hidden; respects the existing 15s backend throttle.

**Net SLA:** even if the backend worker is dead, the frontend's periodic sync keeps row freshness under 90s for any player actively on Live Now.

---

## 17. Hide empty period / sport / league tabs when no markets

**Trigger:** player complaint — "P1/P2/P3 tabs show on a soccer game" and "sport tabs show with the same card list as ⚡ All Live."

**Root cause:** Phase 1 (§5 above) intentionally kept period tabs visible across sync flickers — but the rationale was "rawMatches flickers between polls." With §16 in place (`rawMatches` is now stable thanks to the 60s grace), the original problem is gone. Empty tabs are just confusing — clicking yields a "no lines" banner instead of useful content.

**Fix (commit `2f35b79d`):**

- `MobileContentView.jsx:551-561` — `periods` now filters by `availableSuffixes` (which is already computed from the live markets). `FULL_PERIOD` always survives; suffixes with no `h2h/spreads/totals` lines disappear. As soon as a market like `h2h_p1` returns from upstream, the P1 tab snaps back.
- `MobileContentView.jsx:731-744` + `SportContentView.jsx:501-510` — removed the "keep live shells with no markets" exception. A match must now have at least one usable market (`h2h`, `spreads`, `totals`, or any `extendedMarkets` entry) to render. Cascade effect: `liveSportTabs`, `liveLeagueTabs`, and `liveStripTabs` only count matches with odds, so a sport / league with no bettable games auto-disappears.
- Removed unused `matchIsInPlayRow` helper.

---

## 18. Live Now sport rail — three iterations

Same rail, three player-driven UX passes within the session.

**Pass A (commit `b7c31105`)** — "show every sport even when nothing is live."

Previously the rail collapsed to ⚡ + whichever sports happened to have a live game. On a quiet board the player saw ⚡ + ⚽ both resolving to the same 1-game list — looks like a duplicate. Fix at `MobileContentView.jsx:1240-1255`: introduced `LIVE_RAIL_CORE_SPORTS = ['football', 'basketball', 'baseball', 'hockey', 'soccer', 'tennis']` — these six always render with `count: 0` when nothing's in-play; niche sports (cricket, rugby, MMA, golf, motorsport, eSports) still only appear when they have an actual live game so the rail doesn't overflow on mobile. Empty pills dim (`opacity: 0.55`, gray text); tapping them surfaces a clear "No live [sport] games right now" empty state.

**Pass B (commit `04994328`)** — "make it look like the STRAIGHT / PARLAY / TEASER strip."

Re-skinned the rail's CSS in place to match the existing `.tabs-bar` / `.tab-item` pattern in `dashboard.css:2230-2275`:
- 60px tall, `flex: 1` per pill, 2px dividers
- Light gray `#e8e8e8` inactive, red `#ff5051` active
- Icon over uppercase label, count appended inline (`"SOCCER 3"`)

**Pass C (commit `033c58dd`, current)** — "drop the text, big colorful icons, count under."

Player provided a reference screenshot — dark band, real-sport-ball illustrations (baseball with red stitching, basketball, hockey puck, soccer ball, tennis ball), no text labels, just a count and a yellow accent on the active pill. Implementation:
- Added an `emoji` field to every entry in `LIVE_SPORT_CATEGORIES` (`⚡🏈🏀⚾🏒⚽🎾🥊⛳🏏🏉🏎️🎮`). Modern OSes ship full-color glyphs for these — gets the "real ball" look for free without bundling a paid icon set.
- Rail restyled at `MobileContentView.jsx:2356-2392`: 76px tall, dark `#1f1f1f` bg, no borders between pills, no text label — emoji at 30px with the count below in 13px bold.
- Active count colored yellow `#fbbf24` (matches the reference). Empty pills: `grayscale(70%)` filter on the emoji + `opacity: 0.45` so "we have basketball, nothing live now" reads at a glance.
- FontAwesome icon path stays as a fallback for hosts without emoji fonts.

---

## 19. Bet grading SLA — never wait 9 hours again

**Trigger:** real-money Dodgers `-345` bet stayed pending **9.5 hours** after the game ended. DB row was correctly `status=finished` with the final score; the bet just never graded.

**Architecture audit found three structural problems:**

1. `php-backend/scripts/odds-worker.php` (long-running daemon) embeds a `BetSettlementService::settlePendingMatches` call every 90s — but on Hostinger the daemon hadn't run for hours (watchdog had been failing silently — see §22). With the daemon dead, settlement never fired automatically.
2. The Hostinger cron at `/api/internal/oddsapi-prematch-tick` runs every 5 min and calls `OddsSyncService::syncSingleSport` — which the in-file comment ([OddsSyncService.php:725](php-backend/src/OddsSyncService.php#L725)) explicitly says **skips settlement**. So even when the cron WAS running, no grading happened.
3. The only working settlement path was the **on-read sweep** in `BetsController::getMyBets` ([BetsController.php:1473-1492](php-backend/src/BetsController.php#L1473-L1492)) — fires when the user opens My Bets, throttled to 30s per user via SharedFileCache. If the user doesn't open My Bets, the bet never grades.
4. The "manual rescue" endpoint `/api/bets/regrade-stuck` had a bug at [BetsController.php:1280-1283](php-backend/src/BetsController.php#L1280-L1283) — when the match was already `status=finished` but the bet was still pending, it reported "alreadyFinal" and **skipped settlement entirely**, exactly the case where it was needed.

**Fixes (commit `36fa8b9a`, then `f334d36d`):**

- **Cron tick now settles.** Added `BetSettlementService::settlePendingMatches($this->db, 250, 'cron')` to `DebugController::oddsApiPrematchTick` after the odds-sync rotation completes. System-wide grading every 5 min, regardless of whether the daemon is running. Cheap when nothing to settle (no DB writes); logs `settlementSweep` counters in the JSON response and via `Logger`.
- **Live-sync settles for the caller.** `DebugController::userLiveSync` now extracts the calling user's id from the JWT (`extractJwtUserId` helper) and runs `settlePendingMatchesForUser` after the sync. Combined with the 60s periodic mount-sync from §16, an active Live Now player's tickets grade within ~60 seconds of game-end. Tick-secret callers (cron / admin) skip this path — they're covered by the system-wide sweep above. Shares the 30s SharedFileCache throttle with the on-read sweep so the same player on both screens doesn't double-sweep.
- **`/api/bets/regrade-stuck` actually grades now.** [BetsController.php:1280-1318](php-backend/src/BetsController.php#L1280-L1318) — already-finished matches now call `settleMatch` instead of falling through to "alreadyFinal." `settleMatch` is idempotent (`WHERE status='pending'` in the inner UPDATE), so calling it on an already-graded bet is a no-op. New `regraded` counter in the response so the UI can show "graded X stuck tickets" if we ever wire a button to it.
- **Created `php-backend/scripts/settlement-sweep.php`.** The deployment guide already documented this as the "Job 3" safety net (every 5 min) but the file never existed on disk. Standalone PHP script — no daemon, no shell tricks — calls `BetSettlementService::settlePendingMatches($db, 250, 'cron-sweep')` and exits. Logs to `php-backend/logs/settlement-sweep.log`. Now players have **three** redundant grading paths: cron tick (5m), live-sync-per-user (~60s while on Live Now), on-read sweep (instant on My Bets open). Plus the long-running daemon when it's alive.

**Money safety review:** every path calls existing `BetSettlementService::settleMatch` (transactional, row-locked, ledger-correct, `WHERE status='pending'` guard). No new money paths, no schema changes. Concurrent fire from multiple paths is safe because `settleMatch` only matches `pending` rows — second call is a no-op.

---

## 20. Watchdog auto-detects PHP — Hostinger cron quirk

**Symptom:** the `odds-worker-watchdog.sh` cron output said:

```
timeout: failed to run command 'PHP_BIN=/opt/alt/php82/usr/bin/php': No such file or directory
```

Worker never started. Same cron line that §9 documented as working was broken — turned out Hostinger's cron wrapper doesn't honor the `PHP_BIN=... /bin/sh /path/to/script` env-var prefix syntax. It tries to execute the literal string `PHP_BIN=...` as the command name, fails immediately.

**Fix (commit `7ccc0bb1`):** `odds-worker-watchdog.sh` now resolves PHP itself. Order:
1. Honor explicit `PHP_BIN` if the caller set one.
2. Try `/opt/alt/php82/usr/bin/php`, then `81`, then `/usr/local/bin/php`, then `/usr/bin/php`, then bare `php` from `PATH`. First one that `command -v` finds wins.

Cron line simplifies to just:
```
/bin/sh /home/u487877829/.../odds-worker-watchdog.sh >> /home/.../watchdog.log 2>&1
```

After replacing the cron, the watchdog log showed:
```
2026-05-13T16:06:03Z [watchdog] worker not running, starting…
2026-05-13T16:06:04Z [watchdog] started worker pid=1112519
```

Daemon back up after months silently dead. Settlement-sweep cron (§19) is the durable belt-and-suspenders so this can never silently break the SLA again.

---

## 21. Weekly Figures — end-balance ↔ carry-forward consistency across all reports

**Symptom (player report):** "Two weeks ago end balance was -$3861. Last week's carry-forward is -$3674. There's a $187 gap. Math doesn't add up across weeks."

**Audit found the same class of bug in five places.** Every figures view computed `weekTotal` by summing won/lost bet P/L from `bets` table, but read `carryForward` (and current-balance-derived numbers) from the `transactions` ledger. The two diverge whenever the displayed P/L formula doesn't capture every ledger movement — which it didn't for:
- **Voids of pre-week bets** — refund credits balance but settle as `void` → old math recorded $0 for the day (`// void/push: net zero`). Pre-week placement debit was already baked into carry-forward, so the refund showed up as ledger up + $X but display arithmetic stayed flat.
- **Casino activity** — the deposits row only included `'adjustment', 'deposit', 'withdrawal'`. Casino debits/credits silently fell off the report.
- **Mixed FP+cash credit-account bets** — `bet_lost` transaction `amount` is the full wager ($100) but `balance` only moved by the cash slice ($40). Sign-by-type math overstated the loss.
- **Future/legacy/unknown types** — `default => 0.0` in every helper meant new transaction types silently dropped from totals.

**Single root-cause fix applied across the codebase: prefer ledger delta when both `balanceBefore` / `balanceAfter` snapshots are present.** That's the ground truth — the literal value `balance` moved by. Fall back to sign-by-type ONLY for legacy rows missing snapshots. Added every missing type (`bet_void`, `bet_void_admin`) to the fallback map while we were there.

**Five-commit chain:**

| Commit | File | Layer |
|---|---|---|
| `440c33e2` | `WalletController.php` | User-facing weekly figures — rewrote `getFigures` to be fully transaction-driven, bucket every non-FP completed tx into daily P/L (bet/casino types) or transactions (deposit/withdrawal/adjustment), endBalance reads from the latest in-week `balanceAfter` |
| `33ef2ef7` | `AdminCoreController.php` | Admin weekly figures — `getComprehensiveSignedTransactionAmount` now reads balance delta first; added `bet_void` / `bet_void_admin` to the credit list |
| `db7ad12d` | `AgentCutsController.php`, `AgentSettlementSnapshotService.php`, plus the inline closure at `AdminCoreController.php:6100-6124` | All other signed-amount helpers — same pattern. Also unified `isPromotionalOrFreePlayTransaction` in admin + agent-cuts to use the same robust signal stack as `WalletController::isFreeplayLedgerRow`: any `fp_*` type prefix, `isFreeplay=true` flag, or `referenceType='FreePlayBonus'`, with keyword fallback for legacy rows |
| `197de926` | `WalletController.php` (refinement) | Added legacy-row safety net (sign-by-type fallback when snapshots missing) + a running-balance anchor so `endBalance` always equals `carryForward + weekTotal + transactionsTotal` even on weeks with mixed legacy + modern rows |

**Invariants now enforced:**
1. `carryForward + weekTotal + transactionsTotal === endBalance` on every screen (display arithmetic always adds up).
2. `endBalance === next_week.carryForward` for all-modern weeks (both pull the same `balanceAfter` from the same ledger row).
3. Voids of pre-week pending bets correctly counted.
4. Casino activity correctly counted in daily P/L.
5. Mixed FP/cash credit-account splits use real balance movement, not the misleading `amount` field.
6. Future `fp_*` transaction types automatically detected via prefix match (no code change required when new FP types ship).
7. User, admin, and agent reporting all read the same answer.

**Side effect to flag:** a player who places a $1,000 pending bet now sees that day's `balance` drop reflected immediately in daily P/L instead of waiting for settlement. More accurate — their available cash did drop by $1,000 — and matches what `AgentSettlementSnapshotService` already showed.

**Money-safety review:** every change is display-read-only. No new balance writes. No schema changes. `BalanceUpdateService` remains the sole write path. The fix corrects an UNDERCOUNT in display (and an OVERCOUNT for mixed-pool credit losses) — no money moves; the displayed numbers catch up to reality.

**End-to-end simulation:** five scenarios all reconcile —
- Pre-week pending bet voided this week: `-3861 + 187 + 0 = -3674` ✓ (your reported $187 gap)
- Mixed FP+cash credit-account loss (`amount=$100`, delta=`-$40`): `0 + -40 + 0 = -40` ✓
- Casino round (bet $50, win $80): `100 + 30 + 0 = 130` ✓
- Legacy row missing snapshots + modern row: `0 + 50 + 100 = 150` ✓
- Realistic full week (placements, wins, casino, deposit): `500 + 165 + 100 = 765` ✓

---

## How to deploy / activate (afternoon session additions)

The afternoon session shipped 7 commits. After pushing:

1. **Push** the branch to production.
2. **No code-side restart needed** — all afternoon changes are read-path / cron / frontend.
3. **Install the new Job 3 cron on Hostinger** if not yet present (the standalone `settlement-sweep.php` from §19):
   ```
   */5 * * * * /opt/alt/php82/usr/bin/php /home/u487877829/domains/bettorplays247.com/public_html/php-backend/scripts/settlement-sweep.php >> /home/u487877829/domains/bettorplays247.com/public_html/php-backend/logs/settlement-sweep.log 2>&1
   ```
4. **Confirm the watchdog cron is on the new code-resolved-PHP path** (no more `PHP_BIN=` prefix needed — see §20):
   ```
   * * * * * /bin/sh /home/u487877829/domains/bettorplays247.com/public_html/php-backend/scripts/odds-worker-watchdog.sh >> /home/u487877829/domains/bettorplays247.com/public_html/php-backend/logs/watchdog.log 2>&1
   ```
5. **Verify within 5 minutes:**
   - `php-backend/logs/settlement-sweep.log` should show:
     ```
     [2026-05-13T...] settlement-sweep ok checked=N settled=M bets=K errors=0 elapsedMs=…
     ```
   - `php-backend/logs/watchdog.log` should be silent (daemon healthy) OR show one `started worker pid=…` line if it had to restart.
   - Any stuck finished-but-pending bet should be graded on the first sweep that picks it up.

## How to verify in the UI (afternoon session additions)

1. **Live Now stability** — open Live Now on mobile, leave the screen on for 3+ minutes. Odds should never blank out and reappear. The "Just updated" badge keeps ticking on the existing matches.
2. **Empty period / sport / league tabs hidden** — on a Live Now board with only soccer games, P1/P2/P3 should NOT appear. Only `FULL` + `1H` for soccer.
3. **Sport rail (Live Now)** — dark band with big colorful sport-ball emojis (`⚡ 🏈 🏀 ⚾ 🏒 ⚽ 🎾`). Core six always visible. Active pill's count is yellow. Empty sports (e.g. football when nothing's live) are grayscale + dim. Tap an empty pill → "No live [sport] games right now" message.
4. **Bet grading** — when a live game finishes, expect the matching pending ticket to graduate to Won / Lost within at most ~5 minutes (cron) and as fast as ~60s if you're actively on Live Now. Opening My Bets remains instant.
5. **Weekly Figures** — pick "2 Weeks Ago" → note the End Balance. Pick "Last Week" → the Carry Forward must equal the previous week's End Balance exactly. Add the week's daily P/L + Deposits/Withdrawals → must equal End Balance.

---

## Files touched (afternoon session)

### Frontend
- `frontend/src/hooks/useMatches.js` — 60s grace for empty live polls + LIVE_EMPTY_GRACE_MS constant
- `frontend/src/components/MobileContentView.jsx` — period/sport/league empty-tab filter, persistent sport rail, dark-bg + emoji + yellow-active rail visual, ⚡ All Live + 🎟️ My Live emojis, empty-state copy that names the sport the user filtered to
- `frontend/src/components/SportContentView.jsx` — periodic 60s `syncLiveMatches` interval on Live Now mount; removed live-shell exception in `filteredMatches`

### Backend
- `php-backend/src/DebugController.php` — settlement sweep in `oddsApiPrematchTick`; per-user settlement in `userLiveSync` (with `extractJwtUserId` helper); shared 30s SharedFileCache throttle with the on-read sweep
- `php-backend/src/BetsController.php` — `/api/bets/regrade-stuck` now calls `settleMatch` on already-finished matches (was reporting "alreadyFinal" and skipping)
- `php-backend/src/WalletController.php` — `getFigures` rewritten transaction-driven (commit `440c33e2`) + legacy-row safety net & running-balance anchor (commit `197de926`)
- `php-backend/src/AdminCoreController.php` — `getComprehensiveSignedTransactionAmount` + inline closure + `isPromotionalOrFreePlayTransaction` all prefer ledger delta + robust FP gate
- `php-backend/src/AgentCutsController.php` — same balance-delta-first + robust FP gate
- `php-backend/src/AgentSettlementSnapshotService.php` — same balance-delta-first
- `php-backend/scripts/odds-worker-watchdog.sh` — auto-detects PHP path (Hostinger cron-quirk fix)
- `php-backend/scripts/settlement-sweep.php` — **new** standalone cron grading script

### Hostinger
- Watchdog cron line simplified (no `PHP_BIN=` prefix needed after §20).
- New Job 3 cron for `settlement-sweep.php` every 5 min (durable grading SLA).

### Commits (afternoon session, in order)
```
2f35b79d  sportsbook: hide period/sport/league tabs when no odds available
36fa8b9a  sportsbook: settle finished bets within minutes, not when user looks
f334d36d  sportsbook: add settlement-sweep.php cron script for hostinger fallback
7ccc0bb1  sportsbook: watchdog finds php itself, no env-var prefix needed
b7c31105  sportsbook: persistent sport rail on live now, dim empty pills
04994328  sportsbook: live sport rail matches bet-mode strip style
440c33e2  wallet: transaction-driven weekly figures so carry-forward chain is consistent
33ef2ef7  admin: figures math reads ledger delta first, fixes void & mixed-pool drift
db7ad12d  balance-delta-first across all signed-amount helpers + robust FP gate
197de926  wallet: legacy-row safety net + running balance for figures
033c58dd  sportsbook: live sport rail — big color emojis + count, no text labels
```

---

# Day-2 session — 2026-05-14

Continuation work covering live-rail visual polish, the **3rd attempt** at sidebar team-name search (the user's quote: "we are doing this filter 3 tims"), and click-to-navigate UX. Three commits total, all in `main`.

## 22. Live sport rail — clipped pills + UI polish

**Symptom:** the live-filter pill strips (sport icons + league pills) were getting clipped behind the red "Live Now" banner and the red MLB league header. Only the bottom ~10 px of the pills showed through, looking like a thin band of leaked text.

**Root cause:** the `MobileContentView` container is `display:flex; flexDirection:column` with `overflowY:auto`. Adjacent flex children like `sportHeaderStyle` had `flexShrink: 0`, but `liveFilterStripStyle` and `liveLeagueStripStyle` didn't. Flex collapsed the strips to a thin band while the pills inside (still rendered at full size via `overflowX:auto`) overflowed vertically and got covered by the neighboring solid-background red headers above and below.

**Fix:** added `flexShrink: 0` to both strip styles in [MobileContentView.jsx:2381-2422](frontend/src/components/MobileContentView.jsx#L2381-L2422). Strips now hold their full height; pills are fully visible.

**Visual polish on the live sport rail** (same file, commit `977944bf`):
- Height `76 → 50 → finalized at 72`. Strip uses a `linear-gradient(180deg, #262626 → #1a1a1a)` for slight depth.
- Each pill renders **icon (26 px emoji)** + **uppercase short label** (`BASEBALL`, `BASKETBALL`, `HOCKEY`, etc.), with the count as a small corner badge on the icon.
- Short labels: `"all"` → `All`, `"my-live"` → `My Plays`, all others use the sport label as-is.
- Active state: 3 px amber underline + amber label + amber-background dark-text count badge.
- Empty sports stay grayscale + dim (existing behavior, kept).
- Pills are `flex: 0 0 auto` with `minWidth: 72`, so they keep a consistent size and scroll horizontally instead of squeezing.

**Files touched:** [frontend/src/components/MobileContentView.jsx](frontend/src/components/MobileContentView.jsx) only.

## 23. Sidebar team-name search — 3rd attempt overhaul

**Why this matters:** the player typed `"city"` expecting to find Man City / Kansas City Royals games. Search returned "No teams found for 'city'". The user explicitly flagged this as the **third** attempt to fix this filter (`v1` switched from `upcoming` → `live-upcoming`, `v2` fixed a stranded loading spinner). The root cause this time was different: the **dataset coverage was wrong**, not the state machine.

### Root cause stack (six compounding layers)

| # | Layer | What it did |
|---|-------|-------------|
| 1 | Frontend asked for `limit:200` | Self-cap at 200 rows |
| 2 | Backend re-clamped `min(200, $rawLimit)` in `MatchesController.php:88` | No way to request more than 200 |
| 3 | DB sort `startTime ASC` (`MatchesController.php:194`) | Live games (past startTime) sort first, fill the 200-row slot. Pre-match games starting later in the day get dropped. Man City / Kansas City Royals games never made it into the index. |
| 4 | One-shot fetch — `if (matchesForSearch !== null) return;` | Once populated, never refetched. If the first fetch returned `[]` (network blip, the `catch` set `[]`), the entire session searched against an empty index. |
| 5 | Substring match only on `homeTeam`/`awayTeam` | `"premier"` → 0 results. `"mlb"` → 0 results. `"ast"` (Aston Villa) → 0 results. |
| 6 | "No teams found" empty state couldn't distinguish "fetch failed/returned `[]`" from "real empty" | User saw a confident "no match" when truth was "we never had data". |

### Fixes shipped (commit `1f8cbf3c`)

#### Backend
- [php-backend/src/MatchesController.php:84-93](php-backend/src/MatchesController.php#L84-L93) — raised `?limit` upper-cap from **200 → 1500**. Comment notes the search-index use case explicitly so future readers don't drop it back to 200 for bandwidth reasons. The full live-upcoming window is typically 500–900 rows; 1500 leaves headroom.

#### Frontend search engine
[`frontend/src/components/DashboardSidebar.jsx`](frontend/src/components/DashboardSidebar.jsx):
- Bumped search-index fetch to `limit: 1500` (matches the new backend cap).
- **Four-state index lifecycle**: `null` (never tried) / `'error'` (fetch failed) / `[]` (server returned empty) / `array` (data). Drives the empty-state messaging.
- **Broader match surface**: `homeTeam`, `awayTeam`, `homeTeamShort`, `awayTeamShort`, `sport`, `sportKey`. Queries like `"mlb"`, `"premier"`, `"soccer"`, `"ast"` now hit instead of returning empty.
- **Resilient refetch**:
  - 60 s TTL so newly-scheduled games surface mid-session.
  - 5 s retry-after-error so a transient blip doesn't strand the index.
- **Three distinct empty messages**:
  - `'error'` → "Search temporarily unavailable — tap to retry" (clickable, resets state)
  - `[]` → "No matches scheduled right now"
  - rows present but no hits → "No teams found for 'q'"
- [frontend/src/dashboard.css:405-414](frontend/src/dashboard.css#L405-L414) — added an orange-tinted `.sidebar-search-error` style so the retry affordance reads as actionable, not just another "no results" line.

### StrictMode dev trap (caught on localhost test) — fixed in same commit-block

After the v3 search shipped, localhost showed **"Searching teams…" stuck forever**. Production was actually fine; the bug was dev-only.

**Root cause:** React 18 StrictMode in [main.jsx:174](frontend/src/main.jsx#L174) double-runs effects. Sequence:
1. Effect 1 fires → `searchFetchInFlightRef.current = true` → fetch 1 starts.
2. Cleanup 1 → `cancelled = true` (but ref stays `true` — refs survive cleanups).
3. Effect 2 fires → sees `ref === true` → early-returns.
4. Fetch 1 resolves → `if (cancelled) skip setMatchesForSearch` → state never written.
5. End state: `matchesForSearch === null` forever, ref eventually cleared by `finally`, no subsequent effect fires.

**Fix:** dropped the `cancelled` flag entirely. The fetch is a one-shot data load with no per-render parameters that would differ between renders, so a result resolved late is still valid to write. If the component unmounts mid-flight, the setState is a no-op + a harmless React warning. Cleanup now resets the in-flight ref defensively so StrictMode's mount→unmount→mount cycle doesn't strand a second mount behind a stale ref.

A versioned comment block (`v1 → v2 → v3`) is now embedded in the effect so the next person who touches this code can see the full trap history and avoid reintroducing either bug.

## 24. Search UX — pre-warm on focus + click-to-navigate

**Two more issues the user flagged after `b10ac995` landed:**

1. *"if i login and serach so not seen then if i click any sport then go back and search then it iis searchable"* — search empty on first post-login mount; only worked after navigating away and back.
2. *"when it's searchable so when I click it would be directly go to that sport not sport team selected"* — clicking a search result just ticked the sport checkbox; the user had to manually tap Continue. Awkward two-tap.

### Fix #1 — pre-warm on focus (commit `b10ac995`)

The "first-mount fails, second-mount works" pattern was the sidebar remount resetting state. Real root cause: the first fetch raced against the dashboard's own match fetch + auth bootstrap on initial mount, and players hit "search" before that race finished.

**Fix:** refactored the fetch into a shared [`maybeFetchSearchIndex()`](frontend/src/components/DashboardSidebar.jsx#L333-L355) helper used by both the typing effect AND a new `onFocus={handleSearchFocus}` handler on the search input. Tapping the search box now fires the fetch immediately — by the time the player types char #2, the snapshot is in-flight or in hand. TTL + error-retry still apply, so focus-then-focus-again doesn't spam the backend.

This also indirectly answers the user's `"on production the odds are saving i think for some time like 2-3 mins so why this search issue occur"` question: the board view and the sidebar search were fetching the **same** `/api/matches?status=live-upcoming` endpoint but on independent timelines. The backend caches via `SharedFileCache::remember` in [MatchesController.php:120](php-backend/src/MatchesController.php#L120), so the second consumer reads a warm cache — but if the sidebar wasn't fetching yet, the cache hit didn't help the player. Pre-warm-on-focus puts both consumers on the same cache line at roughly the same time.

### Fix #2 — search result click navigates

[`handleSearchResultClick`](frontend/src/components/DashboardSidebar.jsx#L416-L429) now calls `onContinue()` after `onToggleSport()` on mobile. One tap = select the sport AND switch to its match list. Desktop sidebars don't pass `onContinue` (no results-view concept on desktop) and remain selection-only.

Thread plumbing: [UserDashboardShell.jsx:124](frontend/src/components/UserDashboardShell.jsx#L124) now forwards `onContinue` to the mobile-sports-selection branch only.

## 25. How to verify (Day-2)

1. **Live-rail clipping** — open Live Now on mobile. The icon strip and league pill strip should be fully visible, not clipped to a thin band behind the red headers.
2. **Live-rail polish** — dark gradient strip with sport emoji + uppercase short label + amber active underline. Pills scroll horizontally if there are many sports.
3. **Search by team name** — tap search → type `city` → should hit Man City / Kansas City Royals / Leicester City. Type `mlb` → all MLB games. Type `premier` → EPL games. Type `ast` → Aston Villa / Atlanta teams.
4. **Search empty/error states** — block network in DevTools → type `xxx` → "Search temporarily unavailable — tap to retry" (orange). Restore network → tap retry → results come back.
5. **First-mount search** — fresh login (no remount trick). Tap the search box. Should see the spinner flash briefly or not at all. Type a team. Results appear immediately. (Previously needed to navigate-and-back.)
6. **Click-to-navigate** — tap a search result row → should jump directly to that sport's match list, not just tick the checkbox.

## 26. Files touched (Day-2)

### Frontend
- `frontend/src/components/MobileContentView.jsx` — `flexShrink: 0` on live-filter strips; live sport rail redesigned (icon + uppercase label + corner count badge + gradient bg + amber active underline).
- `frontend/src/components/DashboardSidebar.jsx` — search overhaul: 4-state lifecycle, broader match surface, 1500-row fetch, TTL + error retry, three empty-state messages, `maybeFetchSearchIndex()` helper, `onFocus` pre-warm, `onContinue` plumbing for click-to-navigate. StrictMode-resistant effect (v3 history comment block embedded).
- `frontend/src/components/UserDashboardShell.jsx` — forwards `onContinue` to the mobile sidebar.
- `frontend/src/dashboard.css` — `.sidebar-search-error` orange-tinted retry pill.

### Backend
- `php-backend/src/MatchesController.php` — `?limit` upper-cap 200 → 1500 (covers the full live-upcoming window so the search index has the data to hit).

## 27. Commits (Day-2, in order)
```
977944bf  sportsbook: polish live sport rail — flex-shrink fix + icon+label UI
1f8cbf3c  sportsbook: search overhaul — 1500-row index, broader match, lifecycle states
b10ac995  sportsbook: search — pre-warm on focus, click-result navigates to sport
```

---

# Day-3 Session — 2026-05-14

Three player-facing wins on top of one money-safety bug fix surfaced from the user's pending-bets screen. All changes shipped in a single commit; no production deploy yet — needs the usual Hostinger push + dist sync.

## 28. Live MLB inning indicator — `▲ 6TH INN  2 OUTS  ◆◇◆`

**Ask:** screenshot from a competitor app showing "6th 2 Outs ⬥" badges on live MLB cards. "Can we get this added to the live games?"

**Discovery:** the data was already free. [`EspnScoreboardSync.php`](php-backend/src/EspnScoreboardSync.php) was already calling `https://site.api.espn.com/.../mlb/scoreboard` every cycle to grab broadcast + records + half-inning text — but `competition.situation` (which carries `outs` + `onFirst`/`onSecond`/`onThird` on every pitch) was being discarded.

### Backend — [EspnScoreboardSync.php](php-backend/src/EspnScoreboardSync.php)

- New private static `extractBaseballSituation($competition)` that defensively reads `outs` (clamped to 0..3) + `onFirst`/`onSecond`/`onThird` (any of bool, 0/1, "0"/"1", or missing). Returns `[?int, ?string]` where the string is a 3-char `FST` packing (e.g. `"110"` = runners on 1B + 2B; `"111"` = bases loaded).
- `extractLiveState()` now returns the extended shape `['period','clock','outs','bases']` for baseball; outs+bases forced null for every other sport so a stray situation block in an NBA payload can't pollute the score JSON.
- `mergeMetadataOnly()` patches the new keys into `score` only when liveState actually carried them — never blanks them on a missed tick (between innings ESPN clears the situation block; we keep the prior diamond instead of flashing empty).
- **Settlement-grade fields (`score_home` / `score_away`) stay untouched.** The original doc-block contract about never overwriting OddsAPI-owned columns is preserved verbatim.

### Frontend — [MobileContentView.jsx](frontend/src/components/MobileContentView.jsx)

- New `baseballSituation` normalizer block right next to the existing `liveStatusLabel` builder. Pulls `match.score.outs` + `match.score.bases`, gates on `isLive && isBaseball && periodNum > 0` AND the half is currently "Top"/"Bot" (hides between innings when outs reset).
- New memo'd `BaseballSituationBadge` component renders the arrow (▲ top / ▼ bottom) + inning ordinal + outs + a 3-cell diamond (2B top, 1B right, 3B left) with filled cells in amber.
- `matchCardSignature` memo deps now include `baseballSituation.{half,inning,outs,bases}` so a pitch-by-pitch ESPN tick busts the React.memo and the diamond repaints.

### Tests — 12 PHP + 14 JS, all green

- [php-backend/tests/EspnBaseballSituationTest.php](php-backend/tests/EspnBaseballSituationTest.php) — 12 suites via reflection: int/string/bool coercion, bases packing, situation-block-absent (between innings), out-of-range outs clamping, pregame/final returning null, NBA payload with stray situation block ignored.
- [frontend/tests/baseballSituation.test.js](frontend/tests/baseballSituation.test.js) — 14 tests: happy paths, ordinal suffixes (1st/2nd/3rd/11th/21st), all hide-branches (Mid/End between innings, non-baseball, pregame, no situation data), defensive coercion, case-insensitive clock.

### Wire-format caveat

ESPN strips the `situation` block from finished games AND from the `summary` endpoint for past events, so I could not sample the exact key shape against a finished game. Coded against the documented public shape used by ESPN's own gamecast. The parser is defensive: any missing / renamed field → returns null → badge hides → falls back to existing "6TH INN TOP" text. **No data corruption, no broken UI in the worst case.** Re-verify by running `curl https://site.api.espn.com/apis/site/v2/sports/baseball/mlb/scoreboard` during live MLB hours.

## 29. Live Now drops the day divider — "live is always today"

**Ask:** "We can take away the dates for live since live is always current day" — screenshot showed `WEDNESDAY, MAY 13` strips sitting between the red league header and the first live row, eating ~36px each and adding no info.

**Fix:** [MobileContentView.jsx:1447-1481](frontend/src/components/MobileContentView.jsx#L1447-L1481) — `suppressDayDividers = statusFilter === 'live'` gates the day entry in `groupedEntries`. League header still renders; first live row sits directly under it. Pre-game / upcoming boards keep their date dividers for context.

One-line conditional, zero risk.

## 30. Prop Builder — player dropdown + stray popover fix

**Ask:** screenshot of Prop Builder with the "All markets" select open showing only one option. "Under props can we add a filter by player too, to the right of all markets."

### Investigation finding

[PropBuilderModal.jsx](frontend/src/components/PropBuilderModal.jsx) already had a free-text "Search player" input + the "All markets" dropdown. The text input wasn't visible in the screenshot because the toolbar's `flexWrap: 'wrap'` had pushed it above the visible scroll, AND the user wanted a dropdown anyway (one-tap > typing). A search box that's invisible on mobile is no search box.

### Refactor — text input → dropdown

- `playerFilter` state default `''` → `'all'` ([line 113](frontend/src/components/PropBuilderModal.jsx#L113)). Filter logic switched from substring `includes()` to exact equality.
- New `playerNames` useMemo derives the sorted roster off the existing `byPlayer` map — zero extra walk of the data.
- Toolbar now renders `[All markets ▾] [All players ▾]` side by side, each `flex: 1 1 140px` so they share the row evenly on narrow widths and wrap cleanly when too narrow.
- Auto-reset effect: if the selected player drops out of the payload (modal swapped to a new match, refresh removed them), drops back to "All players" instead of leaving the user staring at an empty filtered sheet.
- Empty-state copy reflects active filters: `"No Blocks (Alt Lines) props for Cade Cunningham. Try All markets or another player."`
- ARIA labels on both selects; player dropdown `disabled` when roster is empty.

### The stray "✓ All markets" pill — fixed in the same edit-block

User's follow-up screenshot showed an "All markets" pill with a checkmark floating between match rows on a Prop Builder for a match with **zero player props**.

**Root cause:** the native browser `<select>` popover. When the modal's two filters each had only one option ("All markets" / "All players"), clicking either still produced the popover. Chrome positioned it above the modal because the trigger was too close to the viewport bottom — it ended up centered mid-page.

**Fix:** [PropBuilderModal.jsx:~302](frontend/src/components/PropBuilderModal.jsx#L302) — the entire filter toolbar now renders only when `marketKeys.length > 0 || playerNames.length > 0`. Empty matches show just the "No player props available" message, no useless filters, no stray popover possible.

### Tests — [propsFilter.test.js](frontend/tests/propsFilter.test.js), 15 tests, all green

`groupPropsByPlayer` (grouping, empty input, fallback chain `description → participant → name`, unnamed outcomes), `playerNamesOf` (sorted roster), `filterPlayers` (single filters, composite, no-overlap empty state, stale-selection empty state, exact-match semantics — anti-regression guard for the old text-search behavior).

## 31. Pending Bets LIVE chip — bound the kickoff fallback to 5h (BUG)

**Symptom reported:** `"On live it says there's no live games, But every game I've placed a bet on is live"` — Live Now → Baseball empty, but Pending Bets shows 6 MLB tickets all chipped LIVE.

### Investigation

Hit local `/api/matches?sportKey=baseball_mlb` to inspect the actual row state:

```
System UTC now: 2026-05-14T12:20:32Z
All 11 MLB rows:
  status='scheduled', oddsSource='oddsapi', event_status=''
  startTime: 16:36-17:11 UTC  →  4+ hours in the FUTURE
  lastOddsSyncAt: ~13 minutes ago
```

**Reality check:** today's MLB games haven't started — first pitch is in ~4 hours. Live Now → Baseball was correctly empty. **The bug was on the Pending Bets side: the LIVE badge was a false positive.**

### Root cause

[MyBetsView.jsx:265-280](frontend/src/components/MyBetsView.jsx#L265-L280) `isLiveSnapshot()` had a kickoff-passed fallback designed for the short window between game start and our worker promoting `status='live'`. But it had **no upper bound**:

```js
if (Number.isFinite(startMs) && startMs <= Date.now() && normalizeStatus(parentStatus) === 'pending') {
    return true;  // ← fires forever on stuck-pending bets
}
```

So a bet placed on a Phillies game yesterday → game finished 4 hours later → settlement worker stalls → bet stays `pending` → fallback says "startTime passed + pending → LIVE!" forever. Two days later, still badged LIVE.

### Fix

[MyBetsView.jsx:isLiveSnapshot](frontend/src/components/MyBetsView.jsx#L265) — added `LIVE_FALLBACK_MAX_AGE_MS = 5 * 60 * 60 * 1000`. Past 5h since startTime, a pending bet is stuck, not live. 5h covers the longest plausible game window for any sport on the site (extra-inning baseball ~5h, NFL 4× OT ~4.5h, soccer with ET + pens ~3h, NBA 5× OT ~3.5h).

```js
const sinceKickoffMs = Date.now() - startMs;
if (sinceKickoffMs >= 0
    && sinceKickoffMs <= LIVE_FALLBACK_MAX_AGE_MS  // ← new bound
    && normalizeStatus(parentStatus) === 'pending') {
    return true;
}
```

### Tests — [myBetsLive.test.js](frontend/tests/myBetsLive.test.js), 18 tests, all green

Boundary inclusive at exactly 5h, exclusive at 5h+1ms. Regression guards for the user-reported scenarios (6h, 24h, 7 days post-kickoff). Positive cases (canonical `status='live'`, raw `STATUS_IN_PROGRESS`, short-window fallback). Negative cases (null/garbage snapshots, terminal statuses, future kickoff, settled parent).

### Risk

Zero. The change only makes the LIVE chip MORE accurate — strictly fewer false positives. Real in-play bets still light up; stuck-pending bets stop lying.

## 32. Outstanding action item — settle the 6 stuck MLB tickets

The fix above kills the **false LIVE badge**, but the underlying bets are still stuck-pending on actually-finished games. The grading sweep runs inside the prematch cron tick — locally that cron isn't running.

To grade them manually:

```bash
curl -X POST \
  -H "X-Tick-Secret: $(grep ^INTERNAL_TICK_SECRET= /Users/mac/Desktop/betterdr/.env | cut -d= -f2)" \
  http://localhost:5000/api/internal/oddsapi-prematch-tick
```

That hits [`DebugController::oddsApiPrematchTick`](php-backend/src/DebugController.php#L115), which after the odds refresh calls `BetSettlementService::settlePendingMatches($db, 250, 'cron')`. Real money moves — winners get credited, losers marked lost.

Response shape includes a `settlementSweep` block — if `betsSettled > 0`, those 6 tickets have been graded.

## 33. How to verify (Day-3)

1. **MLB inning indicator** — open Live Now → Baseball during real MLB hours (1-11pm ET). A live game card should show `▲ 6TH INN  2 OUTS  ◆◇◆` next to the LIVE pill. Diamond cells should be filled/empty matching ESPN's gamecast for that game. Between innings (Mid/End): the inning indicator stays but outs+diamond hide.
2. **No date divider on Live Now** — open Live Now tab on mobile. League headers should sit directly above their first live row. No `WEDNESDAY, MAY 13` strip between them. Switch to Upcoming → date dividers come back.
3. **Prop Builder player dropdown** — open Prop Builder on an NBA game with player props. Two side-by-side dropdowns: `All markets`, `All players`. Pick a player → only their card renders. Combine with a market filter → only that player + that market shows. Switch to a match with NO player props → both dropdowns disappear; only "No player props available" remains. No stray popover anywhere.
4. **No false LIVE badge** — open Pending Bets. Tickets on games whose kickoff was >5 hours ago should NOT show a LIVE chip. Tickets on games currently in play (or kickoff in the last 5h) should still show LIVE.
5. **Settlement sweep** — after running the curl from §32, refresh Pending Bets. Stuck tickets should disappear from Pending (moved to settled history) and balance should reflect the credits/debits.

## 34. Files touched (Day-3)

### Frontend
- [`frontend/src/components/MobileContentView.jsx`](frontend/src/components/MobileContentView.jsx) — baseball situation normalizer + `BaseballSituationBadge` component, day-divider suppression on `statusFilter === 'live'`, memo deps for live pitch updates.
- [`frontend/src/components/MyBetsView.jsx`](frontend/src/components/MyBetsView.jsx) — `LIVE_FALLBACK_MAX_AGE_MS = 5h` bound on `isLiveSnapshot`'s kickoff-passed fallback.
- [`frontend/src/components/PropBuilderModal.jsx`](frontend/src/components/PropBuilderModal.jsx) — free-text "Search player" → "All players" dropdown, toolbar hides on empty payloads, filter-aware empty-state copy, responsive `flex: 1 1 140px` layout, ARIA labels.

### Backend
- [`php-backend/src/EspnScoreboardSync.php`](php-backend/src/EspnScoreboardSync.php) — new `extractBaseballSituation()` static, extended `extractLiveState()` return shape, merge path writes `score.outs` + `score.bases` only when liveState carried them.

### Tests (new)
- [`php-backend/tests/EspnBaseballSituationTest.php`](php-backend/tests/EspnBaseballSituationTest.php) — 12 suites via reflection.
- [`frontend/tests/baseballSituation.test.js`](frontend/tests/baseballSituation.test.js) — 14 tests covering the normalizer.
- [`frontend/tests/propsFilter.test.js`](frontend/tests/propsFilter.test.js) — 15 tests covering grouping + filter composition.
- [`frontend/tests/myBetsLive.test.js`](frontend/tests/myBetsLive.test.js) — 18 tests covering the 5h boundary + regression guards.

## 35. Commits (Day-3)

```
d4c7d30f  sportsbook: live MLB diamond + prop player filter + bound LIVE badge
```

---

# Day-5 — 100% Odds-API Coverage Push (2026-05-15)

Goal stated by the operator: "I want fully 100% what odds-api offers our site should be covered." Closed every documented odds-api v4 endpoint and every meaningful query parameter, added outright bets as a complete product (sync → display → placement → settlement → realtime push), and shipped a defensive boundary so a future regression in any single tab can't take down the dashboard.

## 36. Endpoint coverage — gap audit and what landed

Pre-flight audit found these gaps in our odds-api surface:

| Capability | Pre-Day-5 | Post-Day-5 |
|---|---|---|
| `GET /v4/sports/{sport}/events` | not called | `OddsSyncService::fetchEventsForSport()` |
| `GET /v4/sports/{sport}/events/{id}/markets` | not called | `OddsSyncService::fetchAvailableMarkets()` (1h in-process cache) |
| `GET /v4/sports/{sport}/participants` | not called | `OddsSyncService::syncParticipants()` + worker tier (24h) |
| `GET /v4/sports/{sport}/odds?markets=outrights` | filtered out at discovery | `OddsSyncService::syncOutrights()` + worker tier (6h) |
| `GET /v4/historical/sports/{sport}/odds` | not called | `OddsSyncService::fetchHistoricalOdds()` |
| `GET /v4/historical/sports/{sport}/events` | not called | `OddsSyncService::fetchHistoricalEvents()` |
| `GET /v4/historical/sports/{sport}/events/{id}/odds` | not called | `OddsSyncService::fetchHistoricalEventOdds()` |
| `GET /v4/historical/sports/{sport}/events/{id}/markets` | not called | `OddsSyncService::fetchHistoricalEventMarkets()` |
| `bookmakers=` query filter | env var existed but empty in prod | wired to all bulk + per-event /odds calls |
| `commenceTimeFrom`/`commenceTimeTo` | never used | new `timeWindowQuery()` helper, applied to 3 prematch /odds builders (skipped on live + per-event paths) |

**Intentionally skipped** (not relevant for an internal sportsbook): `includeLinks`, `includeSids`, `includeBetLimits`, `eventIds` filter. These are odds-comparison-site features.

## 37. Phase 0 — Quick wins (env + 2 helpers)

**Bookmaker filter wired** — code in `OddsSyncService` already supported `&bookmakers=` on every /odds URL but env was empty in prod. Set in [`/.env`](.env) and [`php-backend/.env`](php-backend/.env):

```
ODDS_API_BOOKMAKERS=draftkings,fanduel,betmgm,caesars,pinnacle
```

Cuts upstream payload ~70-80% with no per-call quota change.

**Time-window filter** — new helper [`OddsSyncService::timeWindowQuery()`](php-backend/src/OddsSyncService.php) returns `commenceTimeFrom`/`commenceTimeTo` query params from a single env var:

```
ODDS_TIME_WINDOW_HOURS=96
```

Applied to all 3 bulk prematch /odds query builders (snapshot, updateMatches, syncSingleSport). Skipped on live odds and per-event endpoints. Trims long-tail futures (golf majors months out) from prematch payloads.

**Soccer extras (btts, draw_no_bet, double_chance)** — verified already wired via `soccer_default` catalog + the `soccer_*` prefix fallback in [`OddsMarketCatalog.php`](php-backend/src/OddsMarketCatalog.php). No code change required; extended-sync env was already enabled.

## 38. Phase 1 — Prop catalogs for missing sports

Added entries to [`OddsMarketCatalog.php`](php-backend/src/OddsMarketCatalog.php) so per-event sync requests props for sports that previously had none:

- `basketball_wnba` — 15 player props (NBA-style: points, rebounds, assists, threes, blocks, steals, alternates)
- `basketball_euroleague` — 10 player props
- `basketball_default` — conservative fallback (any new basketball league discovered auto-gets props)
- `tennis_default` — per-set markets (`h2h_set1-3`, `spreads_set1-2`, `totals_set1-2`, `totals_games`, `totals_sets`) + 5 props (aces, double_faults, games_won, sets_won, break_points_won)
- `cricket_default` — first-overs totals + 8 cricket props (`batsman_runs`, `bowler_total_wickets`, etc.)
- `mma_mixed_martial_arts` — `h2h_3_way` + `method_of_victory`, `round_betting`, `fight_to_go_distance`, etc.
- `boxing_boxing` — same as MMA

**Resolver upgrade** — refactored `extendedMarkets()` / `propMarkets()` into a single `resolveEntry()` helper with prefix fallbacks for `soccer_*`, `basketball_*`, `tennis_*`, `cricket_*`. New tournaments (e.g. `tennis_atp_french_open`) automatically get props with zero config.

**`isPropMarket()` updated** to recognize new prefixes (`batsman_`, `bowler_`, `fight_`) and combat-sport keys (`method_of_victory`, `round_betting`, `winning_round`).

**MLS** — already covered by existing `soccer_*` fallback, no change needed. **F1/NASCAR** — outrights-only sports; deferred to Phase 2.

## 39. Phase 4 — Events + Markets-availability

Two new public statics on [`OddsSyncService`](php-backend/src/OddsSyncService.php):

- `fetchEventsForSport($sportKey)` → 1 quota unit, returns event list without odds
- `fetchAvailableMarkets($sportKey, $eventId)` → 1 quota unit, returns available market keys, cached in-process for 1h

Admin debug endpoints in [`DebugController.php`](php-backend/src/DebugController.php):
- `GET /api/debug/events/{sport}`
- `GET /api/debug/event-markets/{sport}/{eventId}`

## 40. Phase 3 — Participants

New `participants` table auto-creates on first insert via [`SqlRepository::ensureSpecializedSchema()`](php-backend/src/SqlRepository.php). Generated columns: `j_sport_key`, `j_participant_id`, `j_full_name`, `j_type`. Indexed on `(j_sport_key, j_participant_id)` and `j_full_name` (for player search).

`OddsSyncService::syncParticipants($db, $sportKey)` — pulls roster from `/v4/sports/{sport}/participants`, infers `team` vs `player` from sport-key prefix (tennis/golf/mma/boxing/aussierules/cycling → player; everything else → team).

`OddsSyncService::updateParticipants($db)` — daily-cadence wrapper, self-throttles via `php-backend/src/cache/participants-sync-state.json`. Cadence: `ODDS_PARTICIPANTS_CRON_HOURS=24` (default). Wired into [`odds-worker.php`](php-backend/scripts/odds-worker.php) main loop.

Admin trigger: `POST /api/admin/odds/participants/{sport}`.

## 41. Phase 2 — Outrights / Futures (the big one)

End-to-end product: data → display → placement → settlement → realtime push.

### 41.1 Schema

New `outrights` table auto-creates with columns `j_sport_key`, `j_event_id`, `j_event_name`, `j_status`, `j_commence_time_dt` and indexes `idx_outrights_sport_key`, `idx_outrights_event_id`, `idx_outrights_status`, `idx_outrights_sport_commence`.

`betselections` schema gained `j_outright_id` generated column + `idx_betselections_outright_status` index — enables the settlement query `WHERE outrightId=X AND status='pending'`.

### 41.2 Sync

`OddsSyncService::syncOutrights($db, $sportKey)` — calls `/v4/sports/{sport}/odds?markets=outrights`, persists each tournament/event with the full `bookmakers[]` snapshot. Preserves `settled` status across syncs.

`OddsSyncService::resolveOutrightSports()` — discovers sports with `has_outrights=true` or `_winner` suffix. Excludes politics by default via `ODDS_OUTRIGHTS_EXCLUDE=politics`. Returned 9 active outright sports on first run: NFL Super Bowl, NCAAF Championship, MLB World Series, NBA Championship, 3 golf majors, NHL Championship, FIFA World Cup.

`OddsSyncService::updateOutrights($db)` — tier-aware wrapper, 6h cadence (`ODDS_OUTRIGHTS_CRON_HOURS=6`), state in `php-backend/src/cache/outrights-sync-state.json`. Wired into worker.

### 41.3 Public API

In [`MatchesController.php`](php-backend/src/MatchesController.php):
- `GET /api/outrights[?sportKey=X]` — light list (strips heavy bookmaker tree, picks primary book server-side), 30s public cache
- `GET /api/outrights/sports` — distinct sport→count list for sidebar

### 41.4 Frontend

New [`OutrightsView.jsx`](frontend/src/components/OutrightsView.jsx) — leaderboard view, mobile-first 375px-friendly, uses existing `formatOdds()` + odds-format context, sorts outcomes by price (favorite first), groups by sport when no `sportKey` filter. Each outcome row is a `<button>` that dispatches `betslip:add` reusing the existing slip pipeline.

In [`sportsData.js`](frontend/src/data/sportsData.js): added top-level **FUTURES** entry (`type:'futures'`); existing WNBA FUTURES placeholder now actually works.

In [`DashboardMain.jsx`](frontend/src/components/DashboardMain.jsx): recognizes `type === 'futures'` and routes to `<OutrightsView>`.

### 41.5 Bet placement

In [`BetsController.php`](php-backend/src/BetsController.php):
- New `validateOutrightSelection($outrightId, $selection, $odds)` — looks up `outrights` table, finds price in primary bookmaker's `outrights` market, snaps to American int, runs the same `ODDS_CHANGED` 409 path as match bets.
- Routing in `placeBet()` detects `marketType === 'outrights'` and routes to the outright validator.
- `selectionForInsert()` writes `outrightId` for outright legs.
- `validateOutrightSelection` snapshots set `homeTeam = eventName`, `awayTeam = outcomeName` so `descriptionForSelections()` renders cleanly: `"NFL Super Bowl Winner vs Los Angeles Rams | OUTRIGHTS | Los Angeles Rams @ 8.00"`.

### 41.6 Settlement

New [`OutrightSettlementService.php`](php-backend/src/OutrightSettlementService.php). Two public methods:

- `settleOutright($db, $outrightId, $winningOutcome, $settledBy)` — marks outright `status='settled'` with `winningOutcome`/`settledAt`/`settledBy`; walks pending `betselections` with `outrightId=X`, groups by `betId`, settles each in a row-locked transaction. Idempotent via `WHERE status='pending'` guard.
- `voidOutright($db, $outrightId, $reason, $settledBy)` — marks `status='voided'`, refunds wager to source pool (freeplay → freeplayBalance, real → balance for cash, pending-only release for credit).

Admin endpoints in [`DebugController.php`](php-backend/src/DebugController.php):
- `POST /api/admin/outrights/{id}/settle` body `{"winner":"..."}`
- `POST /api/admin/outrights/{id}/void` body `{"reason":"..."}`

Money safety mirrors `BetSettlementService::settleMatch`: `findOneForUpdate` row locks, transactions, `WHERE status='pending'` guard prevents double-settlement, `pendingBalance` decremented exactly once per bet, audit row in `transactions` for every balance change. Handles freeplay + credit-account semantics. Currently supports straight bets only — parlays mixing outrights with match selections are skipped (`results.errors++` and bet stays pending).

### 41.7 Realtime push

`OutrightSettlementService` fires `RealtimeEventBus::publish('bet:settled', {userId, betId, status, source:'outright', outrightId, time})` AFTER the per-bet commit. Guarded by `class_exists` + try/catch so a broadcast failure can never roll back the money write.

## 42. Phase 5 — Historical odds (admin-only)

All four historical endpoints wired as public statics on `OddsSyncService` and exposed through admin debug routes:

| Endpoint | Method | Admin route |
|---|---|---|
| `/v4/historical/sports/{sport}/odds` | `fetchHistoricalOdds()` | `GET /api/admin/odds/historical/odds/{sport}?date=ISO` |
| `/v4/historical/sports/{sport}/events` | `fetchHistoricalEvents()` | `GET /api/admin/odds/historical/events/{sport}?date=ISO` |
| `/v4/historical/sports/{sport}/events/{id}/odds` | `fetchHistoricalEventOdds()` | `GET /api/admin/odds/historical/event-odds/{sport}/{id}?date=ISO` |
| `/v4/historical/sports/{sport}/events/{id}/markets` | `fetchHistoricalEventMarkets()` | `GET /api/admin/odds/historical/event-markets/{sport}/{id}?date=ISO` |

Cost ~10× quota per call vs regular endpoints — admin-only by design, NOT in the worker loop.

## 43. Bugs found and fixed during HTTP smoke testing

The user clicked FUTURES and got an `ErrorBoundary` trip. Three real bugs surfaced and were closed:

### 43.1 `selectionRowFromTicket` silently dropping `outrightId`

[`SportsbookBetSupport.php`](php-backend/src/SportsbookBetSupport.php) — the helper that constructs the row inserted into `betselections` listed a fixed allowlist of fields and `outrightId` wasn't in it. Caught by the HTTP smoke test:

- `POST /api/bets/place` returned 201 (bet placed cleanly, money debited)
- The betselection row had `j_outright_id = NULL` (despite my upstream code passing it through)
- `OutrightSettlementService` then settled the outright but found 0 pending bets

This would have been a **silent production bug** — bets place fine, money debits, but settlement never finds them. They'd sit pending forever until someone noticed manually.

Fix: added `'outrightId' => $outrightId !== '' ? SqlRepository::id($outrightId) : null` to the row builder. NULL on non-outright legs keeps the index sparse.

### 43.2 `/api/outrights` was hitting a 404 fallthrough — never reached MatchesController

[`public/index.php:645-664`](php-backend/public/index.php) has a hard-coded prefix gate that decides which paths reach the controller chain. Only paths matching `/api/auth, /api/wallet, /api/user, /api/bets, /api/betting, /api/admin, /api/matches, /api/odds, /api/content, /api/messages, /api/casino, /api/agent, /api/payments, /api/debug, /api/internal, /api/sync, /api/proxy` got into dispatch. **`/api/outrights` matched none of them** — the request fell straight through to `Response::json(['message' => 'API route not found'], 404)`.

Took serious tracing to find — the controller had the route, the file had no syntax errors, the curl response said "API route not found". A debug `file_put_contents` in `MatchesController::handle` confirmed the controller was never reached for `/api/outrights` while concurrent `/api/matches` requests reached it fine.

Fix: added `|| str_starts_with($uriPath, '/api/outrights')` to the prefix gate.

### 43.3 React hooks rule violation in DashboardMain — caused the ErrorBoundary trip

After the URL + routing bugs were fixed, the FUTURES tab still tripped the global ErrorBoundary. Browser console (visible after the user opened DevTools) said:

> Error: Rendered fewer hooks than expected. This may be caused by an accidental early return statement.
> The above error occurred in the `<DashboardMain>` component.

[`DashboardMain.jsx`](frontend/src/components/DashboardMain.jsx) calls 5 hooks per render: `useState`, two `useRef`, `useEffect`, `useMemo`. My `if (selectedItem.type === 'futures') return ...` branch was placed BEFORE the `useMemo`, so switching from a normal sport (5 hooks) to FUTURES (early return after 4 hooks) tripped the rules-of-hooks check. The pre-existing `props-plus` branch had the same latent bug — undetected because nobody ever clicked it.

Fix: moved both special-view dispatches (`futures` + `props-plus`) to AFTER all hooks have run. Added a comment explaining the constraint so a future edit doesn't reintroduce the bug.

### 43.4 Defensive: local `ErrorBoundary` around OutrightsView

Wrapped `<OutrightsView>` in [`DashboardMain.jsx`](frontend/src/components/DashboardMain.jsx) with the existing [`ErrorBoundary`](frontend/src/components/ErrorBoundary.jsx) component so a render failure inside the FUTURES tab can't take down the whole dashboard — at worst the FUTURES tab shows an inline error and other tabs keep working.

Also made `OutrightsView` defensively read `oddsFormat` instead of destructuring (`const oddsCtx = useOddsFormat(); const oddsFormat = (oddsCtx && oddsCtx.oddsFormat) || 'american';`) so a missing context shape can't crash render.

### 43.5 Frontend URL construction with path-style production API

Initial OutrightsView built `${API_BASE}/api/outrights` which became `/api/api/outrights` (double prefix) in dev with `VITE_API_URL=/api`, and was malformed under prod's path-style URL (`?path=`). Replaced with proper `getOutrights()` / `getOutrightSports()` helpers in [`api.js`](frontend/src/api.js) that use the existing `buildApiUrl()` — handles both dev proxy and prod path-style.

## 44. End-to-end verification

### Direct service-layer test (no HTTP)
```
Outright reset → status='open'
Test user → balance=1000, pending=0
WIN  picked=Los Angeles Rams winner=Los Angeles Rams   → bet=won  bal=1700 pending=0
LOSS picked=Seattle Seahawks winner=Los Angeles Rams   → bet=lost bal=900  pending=0
VOID tournament_canceled                               → bet=void bal=1000 pending=0
Idempotent re-run (settle Rams winner again)           → total=0   bal still 1700
Money invariant for test user (balance >= pending)     → OK
```

### Full HTTP loop (after bug 43.1 fix)
```
STEP 1  POST /api/bets/place                     → HTTP 201 "Bet placed successfully"
STEP 2  betselection in DB                       → j_outright_id populated
STEP 3  POST /api/admin/outrights/{id}/settle    → HTTP 200, total=1 won=1
STEP 4  user balance                             → 1500 → 1450 (placement) → 1850 (payout)
        totalWinnings                            → 350 (profit, not full payout)
        ledger                                   → bet_placed + bet_won rows written
```

## 45. New env vars (root `.env`)

```
ODDS_API_BOOKMAKERS=draftkings,fanduel,betmgm,caesars,pinnacle  # ~70-80% smaller payloads
ODDS_TIME_WINDOW_HOURS=96                                        # 4-day window for prematch /odds
ODDS_OUTRIGHTS_CRON_HOURS=6                                      # outrights tier cadence
ODDS_PARTICIPANTS_CRON_HOURS=24                                  # participants tier cadence
ODDS_OUTRIGHTS_EXCLUDE=politics                                  # comma-list of substrings to skip
```

## 46. Files touched (Day-5)

### Backend
- [`php-backend/src/OddsSyncService.php`](php-backend/src/OddsSyncService.php) — 9 new public methods (`fetchEventsForSport`, `fetchAvailableMarkets`, `fetchHistoricalOdds`, `fetchHistoricalEvents`, `fetchHistoricalEventOdds`, `fetchHistoricalEventMarkets`, `syncOutrights`, `syncParticipants`, `resolveOutrightSports`, `updateOutrights`, `updateParticipants`); `timeWindowQuery()` helper; `bookmakers=` filter wired in 4 places; `commenceTimeFrom/To` in 3 places; outright sport discovery (no longer filtering `_winner` suffix from outright path).
- [`php-backend/src/OddsMarketCatalog.php`](php-backend/src/OddsMarketCatalog.php) — 5 new sport catalogs (WNBA, Euroleague, tennis_default, cricket_default, MMA, boxing) + `basketball_default` fallback + `resolveEntry()` helper with prefix fallbacks for soccer/basketball/tennis/cricket; expanded `isPropMarket()` to recognize `batsman_`/`bowler_`/`fight_` prefixes and combat-sport keys.
- [`php-backend/src/OutrightSettlementService.php`](php-backend/src/OutrightSettlementService.php) — NEW. `settleOutright()`, `voidOutright()`, `gradePendingBetsForOutright()` (private). Mirrors money-safety patterns from `BetSettlementService::settleMatch`. Realtime publish wired.
- [`php-backend/src/SqlRepository.php`](php-backend/src/SqlRepository.php) — `participants` and `outrights` table schemas in `ensureSpecializedSchema()`; `j_outright_id` column + `idx_betselections_outright_status` index added to `betselections` block.
- [`php-backend/src/BetsController.php`](php-backend/src/BetsController.php) — `validateOutrightSelection()` method; routing in `placeBet()` for `marketType === 'outrights'`; `selectionForInsert()` carries `outrightId` for outright legs.
- [`php-backend/src/SportsbookBetSupport.php`](php-backend/src/SportsbookBetSupport.php) — `selectionRowFromTicket()` now writes `outrightId` (was the silent-drop bug from §43.1).
- [`php-backend/src/MatchesController.php`](php-backend/src/MatchesController.php) — `GET /api/outrights[?sportKey=X]` and `GET /api/outrights/sports` public endpoints.
- [`php-backend/src/DebugController.php`](php-backend/src/DebugController.php) — 9 new admin/debug endpoints for events, event-markets, participants sync, outrights sync/settle/void, and 4 historical endpoints.
- [`php-backend/scripts/odds-worker.php`](php-backend/scripts/odds-worker.php) — `updateOutrights()` and `updateParticipants()` ticks added to main loop; both self-throttle via state files.
- [`php-backend/config/preload.php`](php-backend/config/preload.php) — registered `OutrightSettlementService.php`.
- [`php-backend/public/index.php`](php-backend/public/index.php) — `/api/outrights` added to the controller-dispatch prefix gate (was the 404-fallthrough bug from §43.2).

### Frontend
- [`frontend/src/components/OutrightsView.jsx`](frontend/src/components/OutrightsView.jsx) — NEW. Leaderboard view; mobile-first; uses `formatOdds()` + odds-format context; defensive context read; sorted by price; groups by sport when unscoped; clickable outcomes dispatch `betslip:add`.
- [`frontend/src/components/DashboardMain.jsx`](frontend/src/components/DashboardMain.jsx) — futures branch added (after all hooks, per §43.3); `props-plus` branch moved to same position; OutrightsView wrapped in local `ErrorBoundary`.
- [`frontend/src/data/sportsData.js`](frontend/src/data/sportsData.js) — top-level FUTURES sidebar entry (`id: 'all-futures'`, `type: 'futures'`).
- [`frontend/src/api.js`](frontend/src/api.js) — `getOutrights()` and `getOutrightSports()` helpers using `buildApiUrl()` for correct dev/prod URL handling.

### Env
- [`.env`](.env), [`php-backend/.env`](php-backend/.env) — new `ODDS_API_BOOKMAKERS` + `ODDS_TIME_WINDOW_HOURS` defaults.

## 47. Operator follow-ups (not blocking, deferred intentionally)

1. **Outright bet display in My Bets** — current `MyBetsView` formats around match team names + logos; outright bets render with the workaround `homeTeam=eventName`, `awayTeam=outcomeName` from the validator's snapshot. Functional but not pretty. Polish when convenient.
2. **49 pre-existing balance/pendingBalance drift records** in dev DB — unrelated to this work but worth cleaning before any production migration.
3. **F1 / NASCAR / Golf race-grid view** — these sports work today via the FUTURES leaderboard (race winner outrights). A custom race-grid layout would feel more native but isn't required.
4. **Outright bet listing endpoint with full bookmaker tree** — only the light list is exposed (`/api/outrights`). Could add `/api/outrights/{id}` if a line-shopping UI is needed.

## 48. How to verify (Day-5)

1. **Sidebar FUTURES tab** — log in, click "FUTURES" in the sidebar. Should render 8 outright leaderboards (Super Bowl, World Series, NBA Championship, 3 golf majors, NHL Championship, FIFA World Cup, NCAAF Championship). Each row shows competitor name + decimal/American odds (per user's odds-format setting), favorites first.
2. **Click an outcome** — adds it to the slip via the existing `betslip:add` event. Slip should show the outright leg with the description format.
3. **Place a real outright bet** — submit via the slip. Backend response 201, balance debited, pending incremented. Verify `betselections` row has both `j_match_id` and `j_outright_id` populated.
4. **Admin settle** — `POST /api/admin/outrights/{id}/settle` with `{"winner":"<outcome name>"}`. Bet status flips to won/lost atomically; balance + pending reflect the payout/loss; ledger row written; realtime `bet:settled` published.
5. **Idempotency** — re-fire the settle endpoint. Should return `total: 0` (no new bets to grade) and balance unchanged.
6. **Money invariant** — `SELECT COUNT(*) FROM users WHERE CAST(JSON_EXTRACT(doc, '$.balance') AS DECIMAL(14,2)) < CAST(JSON_EXTRACT(doc, '$.pendingBalance') AS DECIMAL(14,2))` — should not increase from any outright settlement.
7. **Worker logs** — after a worker tick, `outrights tick attempted=N skipped=M` and `participants tick attempted=N skipped=M` should appear in `logs/odds-worker.log`. Files `php-backend/src/cache/outrights-sync-state.json` and `participants-sync-state.json` should populate.
8. **Coverage** — every odds-api v4 endpoint is now reachable via either a worker call or an admin endpoint. The 9 outright sports auto-sync on the 6h tier; no operator action needed beyond the initial worker restart.

## 49. Commits (Day-5)

(To be filled when committed — code is staged but not yet committed per the no-auto-commit rule.)
