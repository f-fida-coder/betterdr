# Bet Settlement Architecture - betterdr

## Overview
The betterdr platform settles bets through a multi-layered system combining backend settlement services, frontend polling, odds synchronization, and cron-based cleanup tasks. Pending bets transition to final states (won/lost/void) when their underlying matches reach terminal states.

---

## 1. Backend Bet Settlement Logic

### Primary Settlement Service: `BetSettlementService.php`

**Location:** [php-backend/src/BetSettlementService.php](php-backend/src/BetSettlementService.php)

**Main Methods:**
- `settleMatch()` - Grade all bets on a single finished match
- `settlePendingMatches()` - System-wide settlement sweep (cron-triggered)
- `settlePendingMatchesForUser()` - Per-user settlement (triggered on bet read)

#### Settlement Flow for a Single Match

When `BetSettlementService::settleMatch($db, $matchId, $manualWinner, $settledBy)` is called:

1. **Fetch Match & Pending Selections**
   - Query `matches` table for the match record
   - Query `betselections` for all pending selections on that match
   - Group selections by bet ID

2. **Grade Each Bet**
   - For each bet with pending selections on this match:
     - Lock the bet and user record (SELECT FOR UPDATE)
     - Evaluate each selection based on match outcome (final score)
     - Determine if each selection: won / lost / void (push)
     - Calculate ticket final status (won / lost / void)

3. **Update User Balance**
   - **Won**: Credit profit to `users.balance` (or partial for freeplay tickets)
   - **Lost**: Debit real stake from balance (credit accounts only)
   - **Void**: Refund stake to balance
   - Update `users.totalWinnings` on wins
   - Decrement `users.pendingBalance` by the risk amount

4. **Insert Transaction Records**
   - Record each settlement in `transactions` table with type:
     - `bet_won` / `fp_bet_won`
     - `bet_lost` / `fp_bet_lost`
     - `bet_void` / `fp_bet_void`
   - Include balance before/after, freeplay split
   - Log via `SportsbookHealth::recordSettlementSuccess()`

5. **Update Bet Status**
   - Set `bets.status` = 'won' | 'lost' | 'void'
   - Set `bets.settledAt` = current UTC timestamp
   - Update `bets.updatedAt`
   - Update each `betselections` row with final status and grade reason

6. **Handle Round Robin Groups**
   - If the bet is a child of a round_robin_group:
   - Call `RoundRobinService::recomputeGroupStatus()` to aggregate child states
   - Group row shows combined status: pending / partial / won / lost / void

#### Selection Grading Logic

**File:** [php-backend/src/SportsbookBetSupport.php](php-backend/src/SportsbookBetSupport.php)

Function: `SportsbookBetSupport::selectionResult($match, $selection, $manualWinner)`

Grades based on market type:

| Market Type | Logic |
|-------------|-------|
| **H2H/Moneyline** | Compare final scores: homeTeam wins = home selection wins, etc. Draw if equal. |
| **Spreads** | Apply point adjustment to score, compare winner. Equal adjusted score = void (push) |
| **Totals** | Compare total combined score to line. Over/Under. Equal = void (push) |

**Grade Reasons** (stored in `betselections.gradeReason`):
- `null` - Regular win/loss
- `push_tie` - Exact tie on adjusted line (spread/total)
- `match_canceled` - Match was canceled or expired

---

## 2. Settlement Triggers

### A. Cron-Based Settlement (System-Wide)

**File:** [php-backend/src/DebugController.php](php-backend/src/DebugController.php), `handlePrematchCron()`

**Cadence:** Typically every 15-30 minutes (configurable via env vars)

```
ODDS_TIER1_CRON_MINUTES=15    # Tier 1 sports (live/active)
ODDS_TIER2_CRON_MINUTES=15    # Tier 2 sports
ODDS_TIER3_CRON_MINUTES=30    # Tier 3 sports (slower updates)
```

**Flow:**
1. Sync latest odds/scores from API
2. Detect matches that transitioned to `finished`/`canceled`/`expired`
3. Call `BetSettlementService::settlePendingMatches($db, 250, 'cron')`
4. Return settlement summary (matchesSettled, betsSettled, errors)

### B. Odds Sync Settlement

**File:** [php-backend/src/OddsSyncService.php](php-backend/src/OddsSyncService.php), `updateMatches()`

**Trigger:** After updating odds from API
```
Line ~664: $sweep = BetSettlementService::settlePendingMatches($db, 250, 'system');
```

Checks if any match flipped to `finished` status after an odds update, then runs settlement.

### C. Per-User On-Read Settlement

**File:** [php-backend/src/BetsController.php](php-backend/src/BetsController.php), `getMyBets()`

**Trigger:** When user views their My Bets page

```php
// Line ~1530
BetSettlementService::settlePendingMatchesForUser($db, $userId, 'on-read');
```

**Purpose:** Self-healing fallback for stuck-pending bets
- User has pending bets on matches that have finished (in database)
- Settlement sweep may have missed them (throttle, race, error)
- Calling getMyBets() triggers opportunistic per-user settlement
- Finds all matchIds in user's pending bets
- For each match, checks if finished/canceled/expired
- If yes, calls `settleMatch()` to grade the bet
- **Scoped to user:** Only settles bets belonging to the calling user

### D. Manual Regrade Endpoint (Player-Accessible)

**File:** [php-backend/src/BetsController.php](php-backend/src/BetsController.php), `regradeStuckBets()`

**Endpoint:** POST `/api/bets/regrade-stuck`

**Purpose:** Player can manually trigger stuck-pending bet healing

**Flow:**
1. Scan caller's pending bets (limit 200)
2. Collect all match IDs from bet + parlay legs
3. For each match:
   - If `status='finished'` or `'canceled'`: run `settleMatch()` (idempotent)
   - If looks provably finished (score posted, 90+ min elapsed, 30+ min since last sync):
     - Force `status='finished'`
     - Run settlement
   - Otherwise: mark as not yet done
4. Return report of forced/regraded/already_final/still_pending

---

## 3. Frontend Pending Bets Display

### Primary Component: `MyBetsView.jsx`

**Location:** [frontend/src/components/MyBetsView.jsx](frontend/src/components/MyBetsView.jsx)

#### Initial Data Fetch

```javascript
// Line ~854 (api.js)
export const getMyBets = async (token) => {
    const response = await fetch(buildApiUrl('/bets/my-bets'), {
        headers: getHeaders(token)
    });
    if (!response.ok) throw new Error('Failed to fetch my bets');
    return response.json();
};
```

**Backend Endpoint:** `BetsController::getMyBets()`

**Returns:**
- Array of bets with status: 'pending' | 'won' | 'lost' | 'void'
- Each bet includes selections with status + gradeReason
- Current match snapshot (homeTeam, awayTeam, status, score, startTime)
- For multi-leg: leg array with matchSnapshot for each leg

#### Polling Mechanism

**File:** [frontend/src/components/MyBetsView.jsx](frontend/src/components/MyBetsView.jsx), useEffect hooks

**Polling Interval:**
```javascript
// Line ~1197
const interval = window.setInterval(() => {
    // Trigger refetch of bets
}, 5000); // Poll every 5 seconds
```

**Stops When:**
```javascript
// Line ~1205
window.clearInterval(interval);
```

When:
- User navigates away from My Bets
- All bets reach terminal state (no more pending)
- Component unmounts

#### Status Display Logic

**Terminal Status Check:**
```javascript
// Line 263-264
const TERMINAL_MATCH_STATUSES = new Set([
    'finished', 'canceled', 'cancelled', 'expired', 'void', 'abandoned', 'closed', 'settled'
]);
```

**Pending Bet Detection:**
```javascript
// Line 382-385
// If match is in terminal state but bet still pending → stuck-pending
// Awaiting settlement pipeline to grade it
const isStraightBetLive = (bet) => {
    const currentMatchStatus = String(bet?.match?.status || '').toLowerCase();
    if (currentMatchStatus && TERMINAL_MATCH_STATUSES.has(currentMatchStatus)) 
        return false; // Match is over, bet not live
};
```

#### Ticket Status Display

**Collapsed Row Display:**
- Status badge: W (won) | L (lost) | P (push/void) | PENDING
- Theme color: green (won), red (lost), gray (void), neutral (pending)
- Amount: +profit (won) | -risk (lost) | refund (void) | potential (pending)

**Expanded Row Display (Line ~647-685):**
```javascript
const settledAt = ['won', 'lost', 'void'].includes(normalizeStatus(bet?.status))
    ? formatTimestamp(settledTimestamp(bet))  // Show settlement time
    : null;
```

**Settled Timestamp Resolution (Line 526):**
```javascript
const settledTimestamp = (bet) => bet?.settledAt || bet?.updatedAt || bet?.createdAt;
```

---

## 4. Match Finish Detection

### How Matches Transition to Finished

1. **Odds API Sync** → Posts final score → `status` flips to 'finished'
2. **Manual Admin Override** → Can manually set `status='finished'`
3. **Stuck-Pending Heal** → Force-finish if all signals agree game is over

### Stuck-Pending Detection Criteria

**File:** [php-backend/src/BetSettlementService.php](php-backend/src/BetSettlementService.php), `looksProvablyFinished()`

All three conditions must be true:
- ✅ Score posted (homeScore + awayScore > 0)
- ✅ Started 90+ minutes ago
- ✅ Last sync ≥ 30 minutes ago (no recent API touch)

This prevents false-positives on live games with interim scores.

---

## 5. Freeplay Settlement Specifics

### Freeplay Balance Split

**File:** [php-backend/src/BetsController.php](php-backend/src/BetsController.php), placeBet()

**At Placement:**
- User stakes $100, freeplay balance = $60
- Freeplay applies: min(60, 100) = $60
- Real portion: 100 - 60 = $40
- Stores: `bets.freeplayAmountUsed = 60`

**At Settlement (Won):**
- Potential payout: $200 (including original stake)
- Profit: 200 - 100 = $100
- Freeplay portion stake: $60
- Real portion stake: $40
- **Credit to balance:**
  - Freeplay profit: 100 × (60/100) = $60 → back to freeplay pool
  - Real profit: 100 × (40/100) = $40 → to real balance

**At Settlement (Lost):**
- Cash account: stake already deducted at placement, no-op
- Credit account: debit pendingBalance from real portion ($40)
- Freeplay already gone from pool at placement

**At Settlement (Void/Push):**
- Refund real portion ($40) to balance
- Refund freeplay portion ($60) to freeplay pool

---

## 6. Transaction Ledger

**Table:** `transactions`

**Fields for Bets:**
- `type`: 'bet_placed' | 'bet_won' | 'bet_lost' | 'bet_void' | 'bet_refund' | 'fp_bet_*'
- `amount`: Stake (placed) or Payout (won) or Refund (void) or Profit (won, on freeplay)
- `balanceBefore` / `balanceAfter`: Snapshot before/after
- `isFreeplay`: Boolean flag
- `freeplayAmountUsed`: Exact $ from freeplay
- `referenceType`: 'Bet' | 'RoundRobinGroup'
- `referenceId`: Bet doc ID or group doc ID
- `createdAt`: UTC timestamp

**Bucketing Rule (WalletController):**
- Settlement transactions (bet_won/lost/void) bucket by **GAME-TIME** (match start time)
- Placement/refund transactions bucket by **PLACEMENT-TIME**
- This means a Wed game finished Thu morning shows under Wed's figures

---

## 7. Round Robin Group Settlement

**File:** [php-backend/src/RoundRobinService.php](php-backend/src/RoundRobinService.php)

**Structure:**
- Round Robin placement creates:
  - 1 `round_robin_groups` row (display metadata only)
  - N `bets` rows (type='parlay', children, each grades independently)

**Settlement:**
- Each child parlay settles individually via `BetSettlementService::settleMatch()`
- After each child settlement:
  - Call `RoundRobinService::recomputeGroupStatus($db, $groupId)`
  - Recompute group aggregate status: pending / partial / won / lost / void
  - Update `round_robin_groups.status` and `totalPayout`

**Group Status Logic:**
- pending: All children still pending
- partial: Some won, some lost/void
- won: All children won
- lost: All children lost
- void: All children void or only one child losing = whole group lost

---

## 8. Error Handling & Resilience

### Stuck-Pending Detection

**Problem:** Odds feed posts score but never flips match `status` to 'finished'

**Solutions:**

1. **On-Read Sweep** (BetsController::getMyBets)
   - When user views My Bets, scans their pending bets
   - For each match that's provably finished → force settle
   - Fast, per-user, scoped

2. **Manual Regrade** (BetsController::regradeStuckBets)
   - Player endpoint: POST /api/bets/regrade-stuck
   - Scan all their pending bets
   - If match finished or provably over → force-finish + settle
   - Returns detailed report

3. **Idempotency**
   - Settlement always queries `WHERE status='pending'`
   - Already-settled bets skipped
   - Safe to retry or call multiple times

### Match Status Annotations

**File:** [php-backend/src/SportsMatchStatus.php](php-backend/src/SportsMatchStatus.php)

- `annotate($match)` - Add computed status fields
- `effectiveStatus($match, $now)` - Resolve status to terminal state
- Handles API inconsistencies (different fields for different sports)

---

## 9. Admin Manual Settlement

**Endpoint:** POST `/api/bets/settle`

**File:** [php-backend/src/BetsController.php](php-backend/src/BetsController.php), `settleMatch()`

**Request:**
```json
{
  "matchId": "507f1f77bcf86cd799439011",
  "winner": "Optional Home Team Name (for H2H override)"
}
```

**Response:**
```json
{
  "matchId": "...",
  "matchStatus": "finished",
  "total": 10,
  "won": 6,
  "lost": 3,
  "voided": 1,
  "errors": 0,
  "settledBetIds": ["...", "...", "..."],
  "betIds": ["...", "..."]
}
```

**Eligibility Check:** `GET /api/bets/settle-eligibility?matchId=...`

Returns:
- `manualWinnerAllowed`: true if H2H legs only (no spread/total), or match finished
- `isFinished`: Whether match status is 'finished'
- `blockedLegCount`: How many non-H2H legs are still pending

---

## 10. Cache Invalidation

**Cache Key Pattern:** `bets:{userId}:*`

**Cleared On:**
- Bet placement (line BetsController ~2100)
- Round Robin placement
- Settlement via on-read sweep

**Cache Layer:** `QueryCache::getInstance()->forgetPattern('bets:' . $userId . ':*')`

---

## Database Schema Summary

### Relevant Tables

| Table | Key Columns | Settlement-Related |
|-------|-------------|-------------------|
| `bets` | id, userId, status, matchId, selections, potentialPayout, riskAmount, settledAt, updatedAt | ✅ Core |
| `betselections` | id, betId, matchId, status, selection, gradeReason, marketType | ✅ Leg-level |
| `matches` | id, status, score, startTime, lastUpdated, lastOddsSyncAt | ✅ Terminal state check |
| `users` | id, balance, pendingBalance, freeplayBalance, totalWinnings, updatedAt | ✅ Balance updates |
| `transactions` | userId, type, amount, referenceId, balanceBefore, balanceAfter, settledAt, isFreeplay | ✅ Ledger |
| `round_robin_groups` | id, status, totalPayout, parlayCount, createdAt | ✅ RR metadata |

---

## Settlement Timeline Example

### Example: NFL Game Finish → Settlement

**T+0 (Game starts):**
- Player places $100 parlay: Game A (ML) + Game B (Spread)
- Bets inserted with status='pending'
- User pendingBalance += $100

**T+3h45m (Game A finishes with final score):**
- Odds API sync detects score change
- Updates Match A with status='finished', final score
- `OddsSyncService::updateMatches()` → `BetSettlementService::settlePendingMatches()`
- Settlement finds all pending bets on Match A
- For each:
  - Lock bet + user
  - Grade: Game A leg → won/lost/void
  - Parlay still pending (awaiting Game B)
  - Release lock
- Bets remain status='pending' (multi-leg)

**T+4h (Game B finishes):**
- Odds API sync detects Match B score
- `BetSettlementService::settlePendingMatches()` called
- Settlement finds parlay with both legs now graded:
  - Game A: won
  - Game B: lost
  - Parlay outcome: lost (any lost leg = lost parlay)
- Update parlay: status='lost', settledAt='2026-05-15T04:00:00Z'
- Update legs: both status matched from won/lost
- Debit $100 from user balance (already pending, now confirmed lost)
- Insert transaction: type='bet_lost', amount=$100, balanceAfter=$previous-100
- User sees in My Bets: LOST badge with -$100, settled time

**T+4h05m (User checks My Bets):**
- Frontend calls `getMyBets()`
- Backend returns updated bet: status='lost', settledAt visible
- Polling stops (all bets terminal)
- Frontend re-renders: shows LOST badge, settled timestamp

---

## Key Integration Points

1. **Bet Placement** → Stake held in pendingBalance
2. **Match Finishes** → Settlement triggered (cron, sync, on-read)
3. **Legs Grade** → Parlay/ticket final status determined
4. **Balance Updated** → pendingBalance released, balance updated
5. **Transaction Recorded** → Ledger entry with before/after
6. **Frontend Polls** → User sees updated status
7. **Round Robin** → Group status recomputed after children settle

