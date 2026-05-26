# BettorPlays247 — Full Platform Audit Report
**Date**: 2026-05-26
**Target**: 20,000+ concurrent users
**Scope**: Backend, Frontend, Infrastructure, Security
**Excluded**: Password hashing, .env config, business logic correctness

---

## EXECUTIVE SUMMARY

| Category | Critical | High | Medium | Low | Total |
|---|---|---|---|---|---|
| Infrastructure & Scalability | 6 | 8 | 7 | 2 | 23 |
| Security | 0 | 5 | 7 | 4 | 16 |
| Frontend | 1 | 4 | 13 | 12 | 30 |
| **TOTAL** | **7** | **17** | **27** | **18** | **69** |

**Verdict**: The platform has solid business logic and good foundational architecture, but several critical infrastructure gaps will prevent it from handling 20k concurrent users. The most urgent fixes are around the WebSocket server, rate limiting, caching layer, and a handful of security vulnerabilities involving unauthenticated endpoints and IP spoofing.

---

# CRITICAL ISSUES (Fix Immediately)

---

### 1. WebSocket Server Cannot Scale Past ~1,024 Connections
**File**: `php-backend/scripts/ws-server.php:42-155`
**Category**: Infrastructure

The WS server is a single PHP process using `stream_select`, limited by `FD_SETSIZE` (typically 1024). Every broadcast iterates all clients synchronously with `fwrite` — at 10k clients, a single odds update blocks the event loop entirely.

**Fix**: Replace with Swoole, ReactPHP, or a dedicated Node.js/Go WebSocket service. For 20k connections, use Redis Pub/Sub fan-out with multiple WS worker processes behind a load balancer.

---

### 2. Rate Limiter Is Per-Process, Not Per-Server (APCu)
**File**: `php-backend/src/RateLimiter.php:128-158`
**Category**: Infrastructure / Security

APCu counters are per-FPM-worker. With 50 workers, a single IP can make `limit * 50` requests (e.g., 1,000 instead of 20). Rate limiting provides zero protection at scale.

**Fix**: Use Redis `INCR` + `EXPIRE` for all rate limiting. Distributed and correct across all workers.

---

### 3. No Shared State Across Servers — Cannot Scale Horizontally
**File**: Multiple (SharedFileCache, RateLimiter, RuntimeMetrics, RealtimeEventBus)
**Category**: Infrastructure

`SharedFileCache`, `RateLimiter` (file path), `RuntimeMetrics`, `CostMonitor`, `RealtimeEventBus`, and `ApiQuotaGuard` all write to local disk. With multiple app servers behind a load balancer (required for 20k users), each server has independent state. Rate limits, caches, events, and metrics are all siloed.

**Fix**: Replace ALL file-based shared state with Redis. This is the prerequisite for horizontal scaling.

---

### 4. ConnectionPool Is Fake — Per-Process Singleton, Not a Real Pool
**File**: `php-backend/src/ConnectionPool.php:15-17`
**Category**: Infrastructure

The "pool" stores a single PDO connection per PHP process and resets on every request. `ConnectionPoolMonitor` calls methods (`getIdleCount`, `getWaitQueueSize`, `getP95AcquireTimeMs`) that don't exist — will throw fatal errors.

**Fix**: Remove the fictional pool. Use PHP-FPM `pm.max_children` to control parallelism. Add ProxySQL in front of MySQL for real connection pooling.

---

### 5. QueryCache Dies Every Request (In-Memory, Shared-Nothing PHP)
**File**: `php-backend/src/QueryCache.php:14-17`
**Category**: Infrastructure

In-memory `$store` array is born and dies with each HTTP request. Provides zero caching across requests. Every request hits the database cold at 20k users.

**Fix**: Replace with APCu for in-process shared memory or promote to Redis via `RedisCache`.

---

### 6. Queue System Is Inert — All Jobs Commented Out
**File**: `php-backend/scripts/queue-worker.php:88-91`
**Category**: Infrastructure

Only `noop.ping` handler is registered. Email, audit, ledger fan-out all run synchronously inline, blocking every request they touch.

**Fix**: Wire high-latency operations into `Queue::push()` and register their handlers in the queue worker.

---

### 7. SportGenericView Renders Mock/Fake Odds as Live Data
**File**: `frontend/src/components/SportGenericView.jsx`
**Category**: Frontend (Critical)

Uses hardcoded mock data from `data/mockMatches`. If this component is routed to for any sport, users see fake odds they might bet on.

**Fix**: Confirm this is dead code and remove it, or wire to real API.

---

# HIGH SEVERITY ISSUES

---

## Security — High

### 8. IP Spoofing via X-Forwarded-For
**File**: `php-backend/src/IpUtils.php:42`

`X-Forwarded-For` is read directly from user input with no trusted-proxy check. All IP-based security (duplicate IP blocking, rate limiting, IP allowlisting) can be bypassed by setting a header.

**Fix**: Only read `X-Forwarded-For` if `REMOTE_ADDR` is a known proxy IP. Otherwise use `REMOTE_ADDR` exclusively.

---

### 9. Stripe Webhook Missing Timestamp Replay Protection
**File**: `php-backend/src/PaymentsController.php:214-241`

Custom HMAC verification never checks the timestamp window. An intercepted webhook can be replayed hours later. Combined with the 10-second dedup window (issue #20), this could duplicate balance credits.

**Fix**: Validate `abs(time() - timestamp) <= 300` matching Stripe's reference implementation.

---

### 10. Unauthenticated Debug/Sync Endpoints Expose Internal State
**Files**: `php-backend/public/index.php:520-572`, `php-backend/src/DebugController.php`

- `/api/sync/recent` — completely unauthenticated, streams the realtime event log
- `/api/_php/worker-health` — fully public, exposes circuit breaker state, failure counts, sync ages
- `/api/realtime/health` — public, leaks WS host/port and filesystem paths
- `/api/_php/metrics` and `/api/_php/costs` — open when `METRICS_API_KEY` is blank

**Fix**: Gate all behind admin auth or `METRICS_API_KEY`. Require key unconditionally.

---

### 11. Exception Messages Leaked to Clients
**File**: `php-backend/src/AuthController.php:229`

`'Server error: ' . $e->getMessage()` returns SQL errors, file paths, and schema info to the HTTP client on registration/login failures.

**Fix**: Log full exception server-side, return generic message to client.

---

### 12. `/api/bets/regrade-stuck` Accessible to Any Authenticated User
**File**: `php-backend/src/BetsController.php`

Any logged-in user can force-settle matches via this endpoint, not just admins. Potential timing attack vector.

**Fix**: Restrict to admin-only.

---

## Frontend — High

### 13. Token Read from localStorage Contradicts XSS Protection Model
**Files**: `frontend/src/components/MyBetsView.jsx:1165`, `BonusView.jsx:40`

Multiple components read `localStorage.getItem('token')` directly, contradicting App.jsx's design that "token lives in React memory only." Creates XSS attack surface.

**Fix**: Pass `token` as a prop from the authenticated dashboard shell.

---

### 14. ErrorBoundary Exposes Stack Traces in Production
**File**: `frontend/src/components/ErrorBoundary.jsx`

Full component stack traces rendered to end users, revealing internal structure.

**Fix**: In production, show generic message only. Log details to Sentry or equivalent.

---

### 15. RegExp.$1 Usage Is Deprecated and Unreliable
**File**: `frontend/src/components/MatchDetailView.jsx:186-190`

`RegExp.$1` is a global that can be stomped by concurrent operations. Can cause wrong period/market filtering.

**Fix**: Use `.exec()` and capture groups: `const m = /_(q[1-4])$/.exec(k); if (m) return m[1];`

---

### 16. Avatar Always Shows "U" Instead of Username
**File**: `frontend/src/components/Header.jsx:168`

Uses login form field state (cleared after login) instead of authenticated user's name.

**Fix**: Pass authenticated user's username from `App.jsx` as a prop.

---

## Infrastructure — High

### 17. Redis Cache Stampede — No Distributed Mutex
**File**: `php-backend/src/RedisCache.php:43-46`

`RedisCache::remember()` has no lock. If 500 workers miss the same key, all 500 call the callback concurrently (thundering herd).

**Fix**: Add Redis-based mutex (`SET ... NX EX`) before the callback.

---

### 18. File-Based Cache Degrades at Scale
**File**: `php-backend/src/SharedFileCache.php:201-208`

Individual JSON files with `flock` for each cache entry. At 20k users, filesystem I/O becomes a bottleneck.

**Fix**: Redis as primary cache. File cache as cold-fallback only.

---

### 19. Circuit Breaker State Is Per-Process
**File**: `php-backend/src/CircuitBreaker.php:14-17`

In-memory array resets every request. Each of 200 FPM workers must independently accumulate 10 failures before opening circuit. No shared protection.

**Fix**: Store circuit state in APCu (per-server) or Redis (cross-server).

---

### 20. WriteBuffer Can Lose Financial Data
**File**: `php-backend/src/WriteBuffer.php:105-111`

Destructor flush silently loses data on fatal errors. No write-ahead log. Plain INSERT fails on duplicates and buffer isn't cleared in `finally` block, causing infinite retry of bad rows.

**Fix**: For financial data, flush synchronously. Move `$this->buffer = []` to a `finally` block. Add `INSERT IGNORE` or conflict handling. Register `shutdown_function` as safety net.

---

### 21. RealtimeEventBus Drops Events Under Write Contention
**File**: `php-backend/src/RealtimeEventBus.php:51-62`

Non-blocking `LOCK_NB` means events are silently dropped when another worker holds the lock. At 20k users with frequent odds updates, many events will be lost.

**Fix**: Use Redis Pub/Sub for event delivery instead of file-based IPC.

---

### 22. File-Based Rate Limiter Causes Lock Convoy
**File**: `php-backend/src/RateLimiter.php:160-218`

`LOCK_EX` (blocking) on every rate-limit check. At 20k users, 199 workers block waiting for 1 file lock — serial queue on every rate-limited endpoint.

**Fix**: Switch to Redis rate limiting. If keeping file fallback, use `LOCK_NB` and fail open.

---

### 23. Probabilistic Cache Warm-Up Runs In-Request
**File**: `php-backend/public/index.php:721-741`

2% of requests trigger ~21 DB queries for cache warming, holding FPM workers busy. At 20k users = 400 extra query batches/second.

**Fix**: Move cache warming to a dedicated cron/worker. Remove from in-request path.

---

### 24. All Controllers Instantiated Every Request
**File**: `php-backend/public/index.php:665-749`

13+ controller objects created regardless of which one handles the route.

**Fix**: Lazy instantiation — only construct the controller for the matched route.

---

# MEDIUM SEVERITY ISSUES

---

## Security — Medium

### 25. Balance Dedup Key Is Time-Window-Based (10s Replay Window)
**File**: `php-backend/src/BalanceUpdateService.php:48-51`

Same reason string submitted 11 seconds apart generates different dedup keys — balance update applied twice. On a $1,000 bet win = $2,000 payout.

**Fix**: Use stable event-specific keys (bet ID, Stripe payment intent ID) instead of time-window hash.

---

### 26. Agent Can Approve Any User's Transactions (Cross-Scope)
**File**: `php-backend/src/AdminCoreController.php:4291`

`master_agent` and `super_agent` roles skip the agent-scope check. Can approve transactions for any player on the platform.

**Fix**: Apply downline-scoped auth check for all non-admin agent roles.

---

### 27. Unmanaged Account Registration with $1,000 Credit
**File**: `php-backend/src/AuthController.php:204`

Users can register with empty `agentId`, getting $1,000 credit with no agent oversight. Attackers could register thousands of accounts.

**Fix**: Require valid `agentId` or disable self-registration. Apply aggressive rate limiting on registration.

---

### 28. APCu JWT Cache Delays Account Suspension by 15 Seconds
**File**: `php-backend/src/Jwt.php:77-95`

Suspended accounts remain authenticated for up to 15 seconds per worker. Enough time to place bets.

**Fix**: Check `suspendedAt` timestamp against JWT `iat` claim, bypassing cache for this check.

---

### 29. Agent Impersonation ID Comparison May Fail
**File**: `php-backend/src/AdminCoreController.php:1782`

String comparison of IDs that may be stored as different types (binary vs string) could silently allow cross-agent impersonation.

**Fix**: Use `SqlRepository::id()` for normalization on both sides.

---

### 30. Username Enumeration + Potential ReDoS
**File**: `php-backend/src/AdminCoreController.php:111-113`

`/api/admin/next-username/{prefix}` allows username enumeration. Raw user input used in regex without `preg_quote()`.

**Fix**: Restrict to admin-only. Use `preg_quote()` on user-supplied prefix.

---

### 31. `?path=` Query Parameter Bypasses WAF Path Rules
**File**: `php-backend/public/index.php:306-315`

`?path=/admin/users` routes the same as `/api/admin/users` but WAFs inspecting URL path won't see it.

**Fix**: Ensure WAF rules also inspect the `path` query parameter.

---

## Frontend — Medium

### 32. Desktop Login Button Not Disabled During Login
**File**: `frontend/src/components/Header.jsx:116-121`

Only dims via opacity, no `disabled` attribute. Double-tap fires duplicate login requests.

**Fix**: Add `disabled={isLoggingIn}`.

---

### 33. Dead Tab Bar in Header (STRAIGHT/PARLAY/TEASER)
**File**: `frontend/src/components/Header.jsx:174-197`

Static, unconnected tab bar — clicking does nothing. Confusing UX.

**Fix**: Remove or wire to `onBetModeChange`.

---

### 34. 20-Second Empty State Guard (Blank Scoreboard)
**File**: `frontend/src/components/ScoreboardSidebar.jsx:82-84`

Users see blank scoreboard for up to 20 seconds. API timeout is only 5 seconds.

**Fix**: Reduce to 6-7 seconds.

---

### 35. No Request Cancellation on Navigation
**File**: `frontend/src/api.js` + multiple components

Raw `fetch()` without `AbortController`. Navigating away wastes bandwidth completing old requests.

**Fix**: Pass `AbortController.signal` into every `fetch()`, abort in `useEffect` cleanup.

---

### 36. BonusView Hardcoded `limit: 100` — No Pagination
**File**: `frontend/src/components/BonusView.jsx:64`

Heavy bettors silently lose transaction history beyond 100 entries.

**Fix**: Implement "Load More" pattern like `TransactionsTab`.

---

### 37. ChatWidget Has No Live Updates
**File**: `frontend/src/components/ChatWidget.jsx`

Messages only load on open. Agent replies never appear without closing and reopening.

**Fix**: Add 30-second polling while widget is open.

---

### 38. MyBets 30-Second Polling Even With 0 Pending Bets
**File**: `frontend/src/components/MyBetsView.jsx:1220`

Fetches full bets payload every 30s regardless of pending count.

**Fix**: Skip poll when `pendingBets.length === 0`.

---

### 39. ScoreboardSidebar Fetches Both Public + Admin Matches
**File**: `frontend/src/components/ScoreboardSidebar.jsx:49-55`

Doubles API load for admin/agent users on every odds update refresh.

**Fix**: Only fetch one based on user role.

---

### 40. BetTable Not Memoized — Re-renders on Every Logo Load
**File**: `frontend/src/components/MyBetsView.jsx:727`

Each team logo load triggers full `BetTable` re-render.

**Fix**: Wrap with `React.memo`, stabilize `teamLogos` prop reference.

---

### 41. Prefetch URLs Use Literal `[hash]` Placeholder
**File**: `frontend/src/utils/performanceOptimization.js`

`/assets/chunks/${route}-views-[hash].js` — the `[hash]` is a literal string. All prefetch links 404 in production.

**Fix**: Remove or use Vite's `import()` preloading.

---

### 42. `will-change: transform` on Static Elements
**File**: `frontend/src/index.css`

`.glass-panel`, `.main-header`, `.league-nav` have permanent GPU layers despite never animating. Wastes VRAM on mobile.

**Fix**: Remove `will-change: transform` from static elements.

---

### 43. iOS Safari Scroll Jank on body::before
**File**: `frontend/src/index.css`

`background-attachment: scroll` on a `position: fixed` pseudo-element causes repaints on every scroll frame.

**Fix**: Use `background-attachment: fixed` or remove the fixed pseudo-element.

---

### 44. `registerUser` Bypasses `parseJsonResponse`
**File**: `frontend/src/api.js:357-405`

Raw `response.json()` throws `SyntaxError` on non-JSON error responses (PHP fatals, WAF blocks).

**Fix**: Use `parseJsonResponse(response, 'Registration failed')`.

---

## Infrastructure — Medium

### 45. WS Frame Decoder Handles Only Single Frames Per Read
**File**: `php-backend/scripts/ws-server.php:190-230`

Split/merged TCP frames cause silent data loss under high throughput.

**Fix**: Implement proper per-connection frame accumulator with byte buffer.

---

### 46. Multiple SqlRepository Instances Per Worker Tick
**File**: `php-backend/scripts/odds-worker.php:77-365`

5-8 separate MySQL connections created per tick cycle in the odds worker.

**Fix**: Create a single `SqlRepository` at the top and reuse it.

---

### 47. ApiQuotaGuard Race Condition on Concurrent Writes
**File**: `php-backend/src/ApiQuotaGuard.php:35-54`

Read-modify-write without lock. Multiple workers can all pass the quota check simultaneously.

**Fix**: Use Redis `INCR` + `EXPIRE` for atomic quota reservation.

---

### 48. Revalidation Queue Never Consumed — Redis Memory Growth
**File**: `php-backend/src/CacheWithStaleRevalidate.php:56-63`

Stale keys pushed to Redis queue but no worker processes them. Queue grows unboundedly.

**Fix**: Wire into queue-worker or remove the push.

---

### 49. RuntimeMetrics + CostMonitor Per-Request File I/O
**File**: `php-backend/src/RuntimeMetrics.php`, `CostMonitor.php`

Both lock, read, mutate, and rewrite a JSON file on every request. Unreliable under contention.

**Fix**: Use Redis counters. Aggregate to file on 60-second interval.

---

### 50. MYSQL_OPTIMIZATION_PHASE13.sql Conflicting Buffer Pool Sizes
**File**: `MYSQL_OPTIMIZATION_PHASE13.sql:20+88`

`innodb_buffer_pool_size` set to 3GB in one place and 25GB in another. Not persisted to `my.cnf`.

**Fix**: Consolidate to single value. Persist to `my.cnf`.

---

### 51. Redundant Settlement Sweeps From 3 Different Processes
**Files**: `odds-worker.php`, `prematch-tick.php`, `settlement-sweep.php`

Three processes may run settlement simultaneously. Correct due to row locking but wasteful.

**Fix**: Designate one authoritative path (the long-running worker).

---

# LOW SEVERITY ISSUES (18 total)

| # | File | Issue |
|---|---|---|
| 52 | `RateLimiter.php:248` | User-agent fingerprint fallback trivially bypassable |
| 53 | `AdaptiveCacheTTL.php:43` | `recordRequest()` never called; always returns low-traffic TTL |
| 54 | `AuthController.php:1283` | `strcasecmp` on plaintext passwords not timing-safe |
| 55 | `PaymentsController.php:55` | Inverted Stripe role check (user blocked, admin allowed) |
| 56 | `index.php:306` | `?path=` WAF bypass potential |
| 57 | Multiple | CSRF depends on CORS config remaining tight |
| 58 | `AdminPanel.jsx:65` | `window.innerWidth` without SSR guard |
| 59 | `performanceOptimization.js:264` | `visibilitychange` listener never removed |
| 60 | `performanceOptimization.js:225` | `requestCache` Map grows unbounded |
| 61 | `index.css` | Duplicate `:root` blocks and `.main-content` rules |
| 62 | `LazyRoutes.jsx` | `<style>` re-injected on every render |
| 63 | `ToastContext.jsx:24` | `window.alert` monkey-patch fragile on HMR |
| 64 | `api.js` | `_meCache` Map grows unbounded across impersonation |
| 65 | `api.js:239` | Token refresh retry not cancelled on abort |
| 66 | `LoadingSpinner.jsx:12` | `injectKeyframes()` DOM query on every render |
| 67 | `App.jsx:306` | Token in query key causes unnecessary refetch |
| 68 | `ScoreboardSidebar` | No retry button on fetch failure |
| 69 | `MatchDetailView.jsx:525` | No swipe-to-dismiss on mobile bottom sheet |

---

# RECOMMENDED ACTION PLAN (Priority Order)

## Phase 1: Immediate (Before 20k users)
1. **Replace WebSocket server** with Node.js/Swoole + Redis Pub/Sub
2. **Move rate limiting to Redis** (replace APCu per-process counters)
3. **Move all shared state to Redis** (cache, events, metrics, circuit breaker)
4. **Add ProxySQL** for real MySQL connection pooling
5. **Fix unauthenticated endpoints** (sync/recent, worker-health, realtime/health, metrics)
6. **Fix IP spoofing** (trusted proxy check on X-Forwarded-For)
7. **Add Stripe webhook timestamp validation**
8. **Remove/replace SportGenericView** mock data

## Phase 2: High Priority
9. Activate queue worker handlers (email, audit, ledger)
10. Fix balance deduplication to use stable event keys
11. Fix localStorage token reads in frontend (XSS surface)
12. Add Redis stampede protection (SETNX mutex)
13. Remove stack traces from ErrorBoundary in production
14. Remove exception messages from client responses
15. Restrict `/api/bets/regrade-stuck` to admin-only
16. Fix WriteBuffer data loss (finally block, conflict handling)
17. Lazy controller instantiation in index.php
18. Move cache warming to background worker

## Phase 3: Medium Priority
19. Fix agent cross-scope transaction approval
20. Add request cancellation (AbortController) in frontend
21. Fix ChatWidget live updates
22. Add pagination to BonusView
23. Reduce scoreboard empty-state guard to 6-7s
24. Memoize BetTable component
25. Fix CSS performance (will-change, scroll jank)
26. Fix odds worker connection reuse

## Phase 4: Polish
27. Fix avatar initials bug
28. Remove dead tab bar from Header
29. Clean up duplicate CSS rules
30. Fix prefetch URL hash placeholders
