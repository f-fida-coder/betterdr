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
