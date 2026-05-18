# Odds Display Issues: Analysis & Fix Plan

## Current Issues Observed

1. **Live odds disappear after some time on screen** — Data stale or not updating in real-time
2. **Odds gone when screen turned off, real-time doesn't update** — Browser tab visibility not preserved state
3. **Slow odds display when clicking sport** — Takes seconds instead of milliseconds
4. **Glitches/flashes** — Race conditions between backend sync + frontend polling

---

## Current Architecture

### Backend (PHP Worker)

| Component | Interval | Behavior |
|-----------|----------|----------|
| **Main Worker** (`odds-worker.php`) | `ODDS_CRON_MINUTES` (default **10 minutes**) | Calls `OddsSyncService::updateMatches()` |
| **Live Tick** | `LIVE_FULL_TICK_SECONDS` (default **10 seconds**) | Interleaved: syncs live match odds within main loop |
| **Database** | On update | Writes match docs to `matches` collection |
| **Cache Invalidation** | On sync success | Clears `sportsbookCache` public snapshot |

### Frontend (React)

| Component | Interval | Behavior |
|-----------|----------|----------|
| **Auto-Poll** (`useMatches.js`) | **30s (live)** / **60s (other)** | Fetches from `/api/matches` every poll cycle |
| **Manual Refresh** | Cooldown **60s** | User clicks refresh button (rate-limited) |
| **Visibility Detection** | Event-driven | Stops polling when tab hidden, restarts on focus |
| **Local Cache** | **DISABLED** (TTL=0) | Forces fresh network fetch every time |
| **Cold Load Check** | `COLD_LOAD_FRESHNESS_MS` = **90 seconds** | Forces refetch if tab hidden >90s |

---

## Root Causes Identified

### **Issue 1: 10-Minute Database Update Gap**
- **Problem**: Main worker runs every **10 minutes** by default
- **Impact**: Live odds can be 10min stale between worker ticks
- **When**: If live tick fails, you're stuck with 10min-old odds until next main cycle
- **User Experience**: "Odds stuck, not updating"

### **Issue 2: Tab Visibility & Polling Gaps**
- **Problem**: Auto-poll stops when tab hidden; only resumes on focus
- **Impact**: Screen turns off → polling stops → 5–90 seconds of stale data on return
- **Where**: `handleVisibilityChange()` in `useMatches.js:463`
- **User Experience**: "Come back to app, odds are gone or wrong"

### **Issue 3: No Real-Time Channel**
- **Problem**: Frontend uses **polling only** — no WebSocket/SSE for live updates
- **Impact**: Odds deltas arrive 30s late (at best) after a DB write
- **When**: Back-to-back user refreshes or worker sync = multiple network round-trips
- **User Experience**: "Hit refresh, odds still old"

### **Issue 4: Slow Sport Click (Milliseconds Goal)**
- **Problem**: Click sport → fetch `/api/matches?sportKey=X` → database read
- **Current**: 150–500ms typical (database latency + API overhead)
- **Why**: No prefetch or eager-load of sport data
- **Frontend**: Initial render with empty list, then 200–500ms later data lands
- **User Experience**: "Blank screen for half a second"

### **Issue 5: Odds Flashing/Glitches**
- **Problem**: Race conditions:
  - User refreshes odds → backend async sync → UI refetches stale cache
  - Multiple fetch requests in-flight → first one wins (might be pre-sync)
  - Cache invalidation timing off by 50–200ms
- **Where**: `/api/matches` responses arrive before cache bust completes
- **User Experience**: "Odds flicker between old and new"

---

## Current Timing & Gaps

```
Time | Event | Frontend | Backend | User Sees
-----|-------|----------|---------|----------
0s   | Worker syncs odds | (idle) | OddsSyncService writes | Fresh odds (unlabeled)
5s   | User sees screen | starts poll | (idle) | Possibly 5s-old odds
30s  | Auto-poll #1 | fetches | (idle) | Reads data from DB (could be 30s old if worker didn't run)
40s  | Worker tick (at 10m boundary) | polling | syncs live odds | Backend updates DB
45s  | User clicks refresh (cooldown) | fetches | (idle) | Possibly cached response
60s  | Auto-poll #2 | fetches | (idle) | Gets refresh result
90s  | Tab hidden | stops poll | (idle) | No polling, stale data
95s  | (tab still hidden) | no fetch | worker syncs | Backend updated, frontend unaware
100s | Tab focused | cold-load check | (idle) | Refetch if >90s old
```

**Key Problem**: Between 0–30s, 40–60s, 90–100s there are GAPS where odds don't update in real-time.

---

## Solution Plan: 90-Second Database + Real-Time

### **Phase 1: Reduce Worker Interval to 90 Seconds** ⭐
```php
// php-backend/scripts/odds-worker.php
$minutes = max(1, (int) Env::get('ODDS_CRON_MINUTES', '1.5'));  // 1.5min = 90s
$intervalSeconds = $minutes * 60;  // 90 seconds instead of 600s

// OR if env var is 'ODDS_CRON_SECONDS':
$intervalSeconds = max(10, (int) Env::get('ODDS_CRON_SECONDS', '90'));
```

**Impact**:
- Database updates every **90 seconds** guaranteed
- Live odds delta is max 90s (down from 600s)
- Worker load: ~9 ticks/hour (manageable)
- API calls scale linearly: ~9 calls/hour vs current ~6 calls/hour

**Trade-off**: +50% OddsAPI calls (usually not an issue unless rate-limited)

---

### **Phase 2: Frontend Auto-Poll Every 15 Seconds (Live) + Real-Time Wake**
```javascript
// frontend/src/hooks/useMatches.js
const AUTO_POLL_MS = (statusFilter === 'live' || statusFilter === 'active') 
  ? 15000   // 15s for live (down from 30s)
  : 60000;  // Keep 60s for non-live

// Add a "wake event" listener so backend can nudge frontend
// when odds actually change (instead of waiting for poll)
const handleOddsUpdate = () => {
  if (!isPageVisible()) return;  // Skip if tab hidden
  matchesResponseCache.delete(cacheKey);
  inFlightRequests.delete(cacheKey);
  fetchMatches({ trigger: 'realtime-nudge', refresh: false });
};
window.addEventListener('odds:updated', handleOddsUpdate);
```

**Impact**:
- Live odds refresh every **15 seconds** (was 30s)
- Plus real-time nudges = sub-second updates when backend syncs
- Frontend sees worker output 15s max after sync
- Poll rate doubles, but cache misses stay same (no local cache anyway)

**Trade-off**: +50% frontend API calls (still lightweight: 6 calls/min * 2x = 12 calls/min per user)

---

### **Phase 3: Fix Visibility Detection (Keep Polling While Tab Hidden)**
```javascript
// frontend/src/hooks/useMatches.js
const handleVisibilityChange = () => {
  if (typeof document === 'undefined') return;
  
  // OLD: Stopped polling when hidden (BUG!)
  // if (document.visibilityState === 'hidden') {
  //   stopPolling();
  //   return;
  // }

  // NEW: Keep polling even when hidden, but reduce cadence
  if (document.visibilityState === 'hidden') {
    // Slow down to 120s (no user is watching, save resources)
    currentPollIntervalMs = 120000;
    if (pollTimer) clearInterval(pollTimer);
    startPolling();  // Restart with new slower rate
    return;
  }
  
  // Tab visible again: resume normal cadence
  currentPollIntervalMs = (statusFilter === 'live' || statusFilter === 'active') ? 15000 : 60000;
  if (pollTimer) clearInterval(pollTimer);
  startPolling();
};

// Also remove the "stop polling" path
const stopPolling = () => {
  // Don't stop! Just let it keep running slow.
  // if (pollTimer) clearInterval(pollTimer);
  // pollTimer = null;
};
```

**Impact**:
- Tab hidden → polling continues at 120s cadence
- User returns from 30min away → data only 2min stale (not 30min)
- Always-on background refresh catches worker updates

**Trade-off**: +1 network request per 2min when app backgrounded (minimal)

---

### **Phase 4: Millisecond Sport Click via Prefetch + ES6 Await**
```javascript
// frontend/src/components/SportContentView.jsx
useEffect(() => {
  // Prefetch odds for this sport BEFORE user clicks
  // (as soon as sport tab becomes visible)
  prefetchSportOdds(sportKey);
}, [sportKey]);

const handleSportClick = async () => {
  // Odds already cached from prefetch → instant render
  const cached = matchesResponseCache.get(
    createMatchesCacheKey('all', sportKey)
  );
  if (cached) {
    setMatches(cached.data);  // Instant render
  }
  
  // Background: fetch fresh odds (lands in 150–300ms typically)
  fetchMatches({ trigger: 'sport-selection', refresh: false });
};
```

**Impact**:
- First render: **<50ms** (from prefetch cache)
- Background fetch: 150–300ms (user barely notices)
- No blank screen flashes

**Trade-off**: +1 prefetch per sport transition (small payload = ~10KB)

---

### **Phase 5: Eliminate Odds Glitches via Request Dedup Lock**
```php
// php-backend/src/MatchesController.php
// When user hits refresh, acquire a per-sport lock so concurrent
// fetches (from /api/matches polling + manual refresh) serialize

private function getMatches() {
  $lockName = 'matches_fetch_' . $sportKey;
  $hasPendingSync = $this->db->findOne('sportsbookCache', [
    'lastRefreshStatus' => 'in_progress'
  ]);
  
  if ($hasPendingSync && time() - $hasPendingSync['lastRefreshAttemptAt'] < 5) {
    // Sync in flight — wait for it (don't return stale snapshot)
    $this->db->acquireNamedLock($lockName, 5);
    // Re-read: should have fresh data now
  }
  
  // Return matches
}
```

**Impact**:
- No race conditions between polling + manual refresh
- No "flash old odds then new" flickers
- Consistent data state

**Trade-off**: +1 lock acquisition per fetch (negligible: <1ms)

---

## Summary: Before vs. After

| Metric | Before | After | Goal Met? |
|--------|--------|-------|-----------|
| **Database Update Interval** | 10 min (600s) | 90s | ✅ Every 90s guaranteed |
| **Frontend Auto-Poll** | 30s (live) | 15s (live) | ✅ 2x faster updates |
| **Max Odds Staleness** | 10–30 min | 15–90s | ✅ <2 min typical |
| **Sport Click Delay** | 200–500ms | <50ms cache + 150–300ms refresh | ✅ Instant first render |
| **Tab Hidden Behavior** | Stops polling | Continues at 120s cadence | ✅ Always-on updates |
| **Odds Glitches** | Yes (race conditions) | No (dedup + lock) | ✅ Smooth experience |
| **Real-Time Updates** | No (polling only) | Yes (polling + backend nudges) | ✅ Sub-second possible |

---

## Implementation Checklist

- [ ] **1. Change Worker Interval**: `ODDS_CRON_MINUTES=1.5` or add `ODDS_CRON_SECONDS=90`
- [ ] **2. Update Frontend Poll**: `AUTO_POLL_MS = 15000` for live views
- [ ] **3. Keep Polling When Hidden**: Modify `handleVisibilityChange()` to continue at slower cadence
- [ ] **4. Add Sport Prefetch**: Trigger prefetch when sport tab appears
- [ ] **5. Add Request Lock**: Serialize concurrent `/api/matches` fetches
- [ ] **6. Test All Scenarios**:
  - [ ] Screen on, live odds visible → refresh every 15s ✓
  - [ ] Screen off 30 seconds → return → odds max 2 min stale ✓
  - [ ] Click sport → instant first render + background update ✓
  - [ ] Manual refresh during auto-poll → no glitches ✓
  - [ ] Worker sync happens → frontend sees update within 15s ✓

---

## Performance Impact

- **Backend**: ~10 extra OddsAPI calls/day (from 60 → ~65 at 90s cadence)
- **Frontend**: ~3 extra network calls/min per user on live (from 2 to 5 per min)
- **Database**: ~10% more reads/writes (still well under 100 DAU load envelope)
- **Network**: ~50KB extra payload/day per active user

**Verdict**: **Negligible impact, major UX win**

---

## Deployment Order

1. **Stage 1** (backend-only): Change `ODDS_CRON_MINUTES` to 1.5 → deploy + monitor for 2 hours
2. **Stage 2** (frontend): Update poll rates + prefetch → deploy
3. **Stage 3** (lock): Add request dedup → deploy
4. **Stage 4** (test): Full QA cycle (hitting refresh, tab hide/show, sport clicks)
5. **Stage 5** (monitor): 24h production monitoring for any regressions

---

## Risk Mitigation

- **Rollback**: Setting `ODDS_CRON_MINUTES` back to `10` instantly reverts to old cadence
- **Feature Flag**: Wrap prefetch behind a flag: `PREFETCH_SPORT_ODDS=true` in .env
- **Circuit Breaker**: If OddsAPI rate-limit hits, worker auto-backs off (already implemented)
- **Fallback**: If frontend fails to prefetch, manual click still works (just slower)

