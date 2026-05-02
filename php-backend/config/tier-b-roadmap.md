# Tier B — Deferred items roadmap

This file documents the two Tier B items that were intentionally NOT
implemented in this pass, with the reasoning and the plan for when each
should be done.

---

## 1. WebSocket for live odds + balance (deferred to Tier C)

### Why deferred
The existing polling architecture works:
- `MyBetsView` polls every 30s (with `document.hidden` gating).
- `BetTickerView` polls every 45s.
- `MatchesController` already has a `?since=...` watermark endpoint
  ([MatchesController.php:1321](../src/MatchesController.php#L1321)) that
  returns only matches updated since a timestamp — this is the foundation
  for either incremental polling OR a websocket push, and we should reuse
  it rather than rewrite.

A websocket migration touches: server (new long-lived process), nginx
(upgrade headers), the React app (subscribe/unsubscribe lifecycle), and
auth (JWT over WS). That's a Tier C scope item, not Tier B.

### When to do it
Trigger condition: when polling traffic to `/api/wallet/balance` or
`/api/matches?since=...` exceeds 5,000 req/min sustained. Until then, the
read-through SharedFileCache (TTL bumped to 15s in this pass) absorbs
spikes without operational complexity.

### Plan when triggered
1. Stand up `ws-server.php` (already scaffolded at
   [scripts/ws-server.php](../scripts/ws-server.php)) behind nginx
   proxy_pass with `Upgrade: websocket` header.
2. Frontend: add a single shared `WebSocketContext` that fans out
   `balance:update` and `match:update` events to subscribers.
3. Keep polling code as a fallback. Add `VITE_USE_WEBSOCKET=true` flag
   gating which transport is active. Roll out behind the flag, monitor
   for a week, then remove polling.
4. **Rollback path**: flip `VITE_USE_WEBSOCKET=false`, redeploy frontend.
   Polling resumes immediately. No backend rollback needed since the
   polling endpoints stay live throughout.

---

## 2. Dashboard response-shaping endpoint (deferred — needs measurement)

### Why deferred
The right way to consolidate endpoints is data-driven: see which routes
fan out to multiple API calls and consolidate the actual chatty ones.
Without the slow-query log + frontend network waterfall data (Tier A
just enabled the slow log; we need ~7 days of data first), any
consolidation we ship now is a guess.

### When to do it
After the Tier A slow-query log accumulates a week of data, look for:
- Frontend pages making 5+ API calls in their initial load.
- Pages where p95 page-ready time is dominated by serial waterfalls
  (one request waits for another).

The two most likely candidates today, based on file inspection:
- The agent dashboard load (AgentController exposes 4-5 endpoints
  consumed together: agent stats, downline users, recent bets, cuts).
- The casino dashboard load (multi-fetch: balance + games + state +
  recent rounds).

### Plan when triggered
1. Add a new GET endpoint per dashboard, e.g. `/api/agent/dashboard`,
   that returns the consolidated payload.
2. Frontend: add a new `getAgentDashboard()` API client; refactor the
   view's 4 `useEffect`-driven fetches into one `useQuery`.
3. Keep the original endpoints alive for 30 days minimum — they may be
   used by external tools or admin scripts. Only deprecate after audit.
4. **Rollback path**: revert the React component to the original 4
   `useEffect`s. Server endpoint stays — it's additive. Zero downtime.

### Risk
Medium. The combined endpoint has its own performance characteristics
(can't cache as easily as the per-resource endpoints, since invalidation
spans multiple entities). Make sure you've measured the win is real
(>100ms saved per dashboard load) before shipping.

---

## Status snapshot at end of Tier B

| Item | Status | Risk |
|------|--------|------|
| Sportsbook matches cache TTL 5s→15s | ✅ Applied | LOW — bounded drift, env-revert |
| Sports list cache TTL 30s→60s | ✅ Applied | LOW — sports rarely change |
| Index audit recommendations | ✅ Documented | NONE — read-only file |
| RedisCache wrapper + lazy connect | ✅ Added | NONE — disabled by default |
| BetTickerView memoization | ✅ Applied | NONE — pure render-time win |
| WebSocket for live odds/balance | ⏸ Deferred to Tier C | — |
| Dashboard response shaping | ⏸ Deferred (needs slow-log data) | — |

## What changes are LIVE on the next deploy

1. `.env.production` cache TTL bump — site keeps working, odds are 15s
   stale max.
2. `BetTickerView` memoization — pure perf, identical output.
3. `AdminLogin.jsx` / `AgentLogin.jsx` `<picture>` WebP fallback — pure
   perf, PNG fallback for old browsers.
4. New `RedisCache.php` available but inert (no caller uses it yet, and
   `REDIS_HOST` is empty in production by default).
5. New router `require_once` line for `RedisCache.php` — adds one file
   load per request, ~negligible cost (< 0.1ms).

## What changes are READY but waiting for ops

1. `php-backend/config/php-tier-a-tuning.ini` — opt-in, paste into
   php.ini and reload php-fpm.
2. `php-backend/config/preload.php` — opt-in, reference from
   `opcache.preload=` ini directive.
3. `php-backend/config/compression.tier-a.conf` — opt-in, paste into
   nginx/Apache config.
4. `php-backend/config/mysql-slow-query.tier-a.cnf` — opt-in, paste into
   `[mysqld]` section and restart MySQL during a maintenance window.
5. `php-backend/scripts/index-audit-tier-b.sql` — read-only doc;
   uncomment `CREATE INDEX` lines and apply manually after EXPLAIN
   verification.
