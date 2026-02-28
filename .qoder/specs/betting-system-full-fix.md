# Betting System Full Fix - Implementation Plan

## Scope
Fix all issues across frontend and backend to make BettorPlays247 a professional, worldwide betting system. Excludes .gitignore/.env exposure fixes and admin plaintext password display (per user request).

---

## Phase 1: Backend Foundation & Security (Do First)

### 1.1 Add Transaction Support to MongoRepository
**File:** `php-backend/src/MongoRepository.php`
- Add `beginTransaction()`, `commit()`, `rollback()` methods wrapping PDO
- Add `findOneForUpdate($collection, $filter)` using `SELECT ... FOR UPDATE`
- These are prerequisites for race condition and atomicity fixes

### 1.2 Fix Race Condition in Bet Placement
**File:** `php-backend/src/BetsController.php`
- Wrap `placeBet()` (lines 128-232) in transaction
- Use `findOneForUpdate` when fetching user balance
- `BEGIN` -> `SELECT user FOR UPDATE` -> check balance -> `UPDATE` -> `INSERT bet` -> `COMMIT`
- try/catch with `rollback()` on failure

### 1.3 Fix Bet Settlement Atomicity
**File:** `php-backend/src/BetSettlementService.php`
- Wrap each bet settlement in a transaction
- Add LOST transaction audit record (currently only WON/VOID create records)
- Rollback on partial failure, continue to next bet

### 1.4 Add Security Headers
**File:** `php-backend/public/index.php` (after line ~47)
- Add: `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`
- Add `Strict-Transport-Security` only when HTTPS detected

### 1.5 Remove Stack Trace Exposure
**File:** `php-backend/public/index.php` (lines 191-196)
- Check `APP_ENV` env var; only include trace in development
- Production: return generic "An internal error occurred"
- Always log full trace to file (already done)

### 1.6 Fix IP Blocking Silent Bypass
**File:** `php-backend/src/AuthController.php` (lines 486-491)
- Change `ensureIpAllowedSafely()`: on exception, return `['allowed' => false]` (deny by default)
- Log the error to `logs/security-errors.log`

### 1.7 Remove Plaintext Password Fallback
**File:** `php-backend/src/AuthController.php` (line ~521)
- Remove `hash_equals($hashed, $plain)` fallback
- If password doesn't start with `$2`, return `false`
- Create `scripts/migrate-plaintext-passwords.php` to bcrypt all legacy passwords

### 1.8 Fix CORS Configuration
**File:** `php-backend/public/index.php` (lines 32-40)
- Remove `CORS_ALLOW_ALL` logic entirely
- Only allow origins explicitly listed in `CORS_ORIGIN` env
- Never allow wildcard `*` when credentials are used

### 1.9 Add Rate Limiting
**New file:** `php-backend/src/RateLimiter.php`
- Database-backed rate limiter using `rate_limits` table (ip, endpoint, count, window_start)
- Apply to: login (5/min), bet placement (10/min), deposit/withdrawal (3/min)
- Check in each controller before processing

### 1.10 Add Stripe Webhook Idempotency
**File:** `php-backend/src/PaymentsController.php`
- Before crediting deposit, check if `payment_intent.id` already processed
- Store processed event IDs in `webhook_events` collection
- Skip duplicate webhooks silently

---

## Phase 2: Backend - Responsible Gambling & Bulk Upload

### 2.1 Responsible Gambling Endpoints
**File:** `php-backend/src/AuthController.php` (add new routes)

**New endpoints:**
- `PUT /api/auth/gambling-limits` - Set deposit/loss/session limits
- `GET /api/auth/gambling-limits` - Get current limits + remaining amounts
- `POST /api/auth/self-exclude` - Self-exclude for duration (24h to permanent)
- `POST /api/auth/cooling-off` - Set cooling-off period (24h to 6 weeks)

**User document fields to add:**
```
gamblingLimits.depositDaily/Weekly/Monthly
gamblingLimits.lossDaily/Weekly/Monthly
gamblingLimits.sessionTimeMinutes
selfExcludedUntil (ISO datetime)
coolingOffUntil (ISO datetime)
realityCheckIntervalMinutes
```

**Enforcement points:**
- `AuthController::protect()` - check self-exclusion/cooling-off, return 403 if active
- `WalletController::requestDeposit()` - check deposit limits against sum of recent deposits
- `BetsController::placeBet()` - check loss limits against recent net losses
- `WalletController::getBalance()` - return remaining limits in response

### 2.2 Bulk User Creation Endpoint
**File:** `php-backend/src/AdminCoreController.php`

**New endpoint:** `POST /api/admin/bulk-create-users`
- Accept JSON array of user objects
- Validate each row (required fields, uniqueness, format)
- Hash passwords with bcrypt
- Insert in transaction (all-or-nothing)
- Return `{ total, created, failed, errors: [{row, username, error}] }`
- Limit: 500 users per request
- Require admin/super_agent role

---

## Phase 3: Frontend Foundation Components

### 3.1 Toast Notification System
**New files:**
- `frontend/src/contexts/ToastContext.jsx` - Provider with `showToast(message, type)` 
- `frontend/src/components/ToastNotification.jsx` - Positioned fixed top-right, auto-dismiss 4s, types: success/error/warning/info

**Wire into App:** Wrap app in `<ToastProvider>` in main.jsx

### 3.2 Loading Spinner Component
**New file:** `frontend/src/components/LoadingSpinner.jsx`
- Variants: inline (button), overlay (full-screen), section (card area)
- Match dark glassmorphism theme

### 3.3 Bet Confirmation Modal
**New file:** `frontend/src/components/BetConfirmationModal.jsx`
- Shows all selections, bet type, wager amount, potential payout
- For if-bet: shows sequential flow (Selection 1 -> Selection 2)
- For reverse: shows two if-bet paths + total risk (2x)
- "Confirm" and "Cancel" buttons
- Glassmorphism styling

### 3.4 Fix Auth Security in Protected Routes
**File:** `frontend/src/main.jsx`
- Replace `sessionStorage.getItem('adminAuthenticated')` checks with actual JWT validation
- Each ProtectedRoute: call `getMe(token)` to validate, check role matches
- Show LoadingSpinner while validating
- Redirect to `/` if token invalid

**File:** `frontend/src/App.jsx`
- Remove `sessionStorage.setItem(${roleKey}Authenticated, 'true')` from login handler
- Keep only `localStorage.setItem('token', result.token)`

---

## Phase 4: Fix Betting System (Frontend)

### 4.1 Fix BetSlip.jsx Calculations
**File:** `frontend/src/components/BetSlip.jsx`

**Straight bet fix (line 51):**
- Current: `selections.reduce((sum, s) => sum + (s.odds * amount), 0)` (wrong - cumulative)
- Fix: For straight, each selection is an individual bet. Display per-selection payout and total risk = `amount * selections.length`

**Teaser fix (line 60):**
- Replace hardcoded multipliers with `betModeRules` from App.jsx (passed as prop)
- Fallback to current values if rules unavailable

**If-bet display (line 64-67):**
- Show sequential logic: "If [Sel1] wins -> $X risked on [Sel2]. Max payout: $Y"

**Reverse display:**
- Show: "Two if-bets: A->B and B->A. Total risk: 2x wager"

**Add balance validation** before `handlePlaceBet`:
```js
const totalRisk = betType === 'reverse' ? amount * 2 : 
                  betType === 'straight' ? amount * selections.length : amount;
if (totalRisk > balance) { showToast('Insufficient balance', 'error'); return; }
```

**Replace all alert()** with toast notifications (lines 75, 78, 112, 117, 163)

**Add confirmation modal** - on "PLACE BET" click, show BetConfirmationModal instead of placing directly

### 4.2 Fix ModeBetPanel.jsx
**File:** `frontend/src/components/ModeBetPanel.jsx`
- Apply same calculation fixes as BetSlip
- Add balance validation
- Add confirmation modal
- Already has better error display (uses message state) - ensure consistency

### 4.3 Improve MyBetsView.jsx
**File:** `frontend/src/components/MyBetsView.jsx`

Add:
- Status filter dropdown (All / Pending / Won / Lost / Void)
- Date range picker (from/to)
- Client-side pagination (20 per page)
- CSV export button (export filtered bets)
- Bet type column
- Better mobile responsive layout

---

## Phase 5: Policy & Responsible Gambling Pages (Frontend)

### 5.1 Create Policy Pages
**New files:**
- `frontend/src/components/policies/TermsAndConditions.jsx` - Full modal with scrollable legal text covering: account terms, betting rules, prohibited activities, liability, disputes
- `frontend/src/components/policies/PrivacyPolicy.jsx` - Full modal covering: data collection, usage, cookies, third-party sharing, user rights (GDPR/CCPA)
- `frontend/src/components/policies/ResponsibleGambling.jsx` - Info page + interactive tools

### 5.2 Responsible Gambling Tools
**In ResponsibleGambling.jsx, add interactive sections:**

- **Self-Exclusion form**: Duration selector (24h, 7d, 30d, 6mo, 1yr, permanent) + confirmation
- **Deposit Limits**: Daily/Weekly/Monthly inputs, shows current limits, calls `PUT /api/auth/gambling-limits`
- **Loss Limits**: Daily/Weekly/Monthly inputs
- **Session Time Limit**: Dropdown (30min, 1hr, 2hr, 4hr, unlimited)
- **Problem Gambling Resources**: Helpline numbers (1-800-522-4700 NCPG, Gamblers Anonymous), links to external orgs

### 5.3 Wire Footer Links
**File:** `frontend/src/components/LandingPage.jsx`
- Add state for `activePolicy` (null, 'terms', 'privacy', 'rg')
- Make footer spans clickable with `onClick` handlers
- Render policy modals conditionally
- Also add footer links in the logged-in dashboard view

### 5.4 Session Timer & Reality Check
**File:** `frontend/src/App.jsx`
- Track session start time and duration
- Track total wagered and initial balance during session
- Show RealityCheckModal every N minutes (from user's `realityCheckIntervalMinutes` setting, default 60)

**New file:** `frontend/src/components/RealityCheckModal.jsx`
- Display: time played, amount wagered, net win/loss, current balance
- Buttons: "Continue", "Set Limits" (opens RG page), "Self-Exclude", "Logout"
- Cannot be dismissed without selecting an action
- High-contrast overlay

---

## Phase 6: CSV Bulk Customer Upload (Frontend)

### 6.1 CSVUploadModal Component
**New file:** `frontend/src/components/admin-views/CSVUploadModal.jsx`

Features:
- File input accepting `.csv`
- "Download Template" button generating CSV with headers: `username,phoneNumber,password,firstName,lastName,agentId,balance,minBet,maxBet,creditLimit`
- Parse CSV client-side (native JS, split by comma)
- Preview table with validation per row (green=valid, red=invalid)
- Validation: required fields present, numeric values valid, phone format
- "Upload X Valid Rows" button
- Progress bar during upload
- Calls `POST /api/admin/bulk-create-users` with validated rows
- Summary: "Created: 95, Failed: 5" with error details
- Option to download failed rows as CSV for retry

### 6.2 Integrate into CustomerAdminView
**File:** `frontend/src/components/admin-views/CustomerAdminView.jsx`
- Add "Bulk Upload (CSV)" button next to existing "Add Customer" button
- Opens CSVUploadModal
- On successful upload, refresh customer list

---

## Phase 7: Professional Polish

### 7.1 Replace ALL alert() Calls Across Codebase
Search all components for `alert(` and replace with toast:
- BetSlip.jsx (5 occurrences)
- ModeBetPanel.jsx 
- CasinoView.jsx
- LiveCasinoView.jsx
- AdminPanel.jsx
- Any others found via grep

### 7.2 Add Error Boundaries
**File:** `frontend/src/main.jsx`
- Wrap each route in ErrorBoundary
- One crash in admin view shouldn't take down the entire app

### 7.3 Console Log Cleanup
**File:** `frontend/src/api.js` (lines ~870-884)
- Remove `console.log` calls that expose tokens and user data
- Keep only error-level logging

### 7.4 Add Loading States to Admin Views
Ensure all admin views show loading spinner while fetching data and error state on failure.

---

## Files Summary

### New Files to Create (Frontend):
```
frontend/src/contexts/ToastContext.jsx
frontend/src/components/ToastNotification.jsx
frontend/src/components/LoadingSpinner.jsx
frontend/src/components/BetConfirmationModal.jsx
frontend/src/components/RealityCheckModal.jsx
frontend/src/components/policies/TermsAndConditions.jsx
frontend/src/components/policies/PrivacyPolicy.jsx
frontend/src/components/policies/ResponsibleGambling.jsx
frontend/src/components/admin-views/CSVUploadModal.jsx
```

### New Files to Create (Backend):
```
php-backend/src/RateLimiter.php
php-backend/scripts/migrate-plaintext-passwords.php
```

### Files to Modify (Backend - in order):
1. `php-backend/src/MongoRepository.php` - Add transaction methods
2. `php-backend/src/BetsController.php` - Transaction wrapping, gambling limit checks
3. `php-backend/src/BetSettlementService.php` - Transaction wrapping, LOST records
4. `php-backend/public/index.php` - Security headers, remove traces, fix CORS
5. `php-backend/src/AuthController.php` - Fix IP bypass, remove plaintext passwords, add RG endpoints
6. `php-backend/src/WalletController.php` - Deposit limit enforcement
7. `php-backend/src/PaymentsController.php` - Webhook idempotency
8. `php-backend/src/AdminCoreController.php` - Bulk create users endpoint

### Files to Modify (Frontend - in order):
1. `frontend/src/main.jsx` - Fix auth security, add ErrorBoundary
2. `frontend/src/App.jsx` - Remove sessionStorage auth, add session timer, add ToastProvider
3. `frontend/src/components/BetSlip.jsx` - Fix all calculations, add confirmation, replace alerts
4. `frontend/src/components/ModeBetPanel.jsx` - Same fixes as BetSlip
5. `frontend/src/components/MyBetsView.jsx` - Filters, pagination, export
6. `frontend/src/components/LandingPage.jsx` - Wire policy links
7. `frontend/src/api.js` - Add new RG endpoints, bulk upload endpoint, remove console.logs
8. `frontend/src/components/admin-views/CustomerAdminView.jsx` - Add CSV upload button

---

## Verification Plan

### Backend Testing:
1. **Race condition**: Open two browser tabs, place bets simultaneously with balance that covers only one -- second should fail
2. **Rate limiting**: Hit login endpoint 6+ times in 60s -- 6th should return 429
3. **Security headers**: Check response headers in browser DevTools Network tab
4. **Gambling limits**: Set $100 daily deposit limit, try depositing $150 -- should reject
5. **Self-exclusion**: Self-exclude, try logging in -- should get 403
6. **Bulk upload**: Upload CSV with 10 users (2 invalid) -- should create 8, report 2 errors
7. **Settlement**: Settle a match, verify LOST bets now have transaction records

### Frontend Testing:
1. **Bet placement**: Place straight bet with 2 selections -- should show individual payouts and total risk
2. **Parlay**: Add 3 selections, switch to parlay -- combined odds should multiply
3. **Teaser**: Select teaser with 2 legs -- multiplier should come from backend rules
4. **Balance check**: Try betting more than available balance -- should show error toast
5. **Confirmation modal**: Click "Place Bet" -- modal should appear with bet review before placement
6. **Policy pages**: Click footer links -- Terms, Privacy, RG modals should open with content
7. **Reality check**: Wait for configured interval -- popup should appear with session stats
8. **CSV upload**: Upload template CSV in admin -- preview, validate, upload, see results
9. **My Bets**: Filter by status, paginate, export to CSV
10. **Auth security**: Clear sessionStorage, navigate to /admin/dashboard -- should redirect (token validation, not sessionStorage flag)
11. **Run `npm run build`** in frontend to verify no build errors
