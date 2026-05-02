# Tier C — FrankenPHP / RoadRunner deploy plan

> **STATUS: NOT IMPLEMENTED.** This is the biggest single perf win
> available to a PHP-FPM site, but it's also the biggest infra change.
> Read the entire document before starting.

---

## Why this exists

Standard PHP-FPM forks a worker per request. The worker boots PHP,
loads the runtime, runs `require_once` for every file the router
touches (50+ files in this codebase, even with OPcache), executes the
request, then dies. Most of that work is identical across requests.

FrankenPHP and RoadRunner ("application servers" for PHP) keep workers
alive. The worker boots ONCE at server start, loads everything ONCE,
then handles thousands of requests in a loop. The per-request cost
drops to just the request-specific code.

Real-world numbers on apps similar to this one:
- TTFB drops 30–80%
- p95 latency drops 50–70%
- CPU utilization drops 40–60% (so the same box handles more traffic)
- Memory: each worker holds more (~150–250MB vs 30–60MB), but you need
  fewer workers because each is faster.

For betterdr specifically: with the OPcache + preload work done in
Tier A, we've already eliminated parse cost. FrankenPHP wins on the
remaining boot cost (Env::load, Logger::init, JWT secret read,
ConnectionPool init). Expect a 20–40% additional p95 reduction.

---

## Two options, pick one

### Option A — FrankenPHP (recommended)

- Single binary written in Go that embeds PHP and a Caddy web server.
- Simpler ops: one process replaces nginx + php-fpm.
- HTTP/2 + HTTP/3 + automatic HTTPS via Let's Encrypt out of the box.
- Worker mode is opt-in via a one-line directive.
- Drawback: Caddy config syntax (Caddyfile) is different from nginx;
  any custom nginx rules need translation.

### Option B — RoadRunner

- Go-based application server that speaks PHP-FPM's protocol-ish.
- Keep your existing nginx in front; replace the upstream from
  `fastcgi_pass php-fpm` to `fastcgi_pass roadrunner`.
- Drawback: it's a separate service to manage, version-pin, monitor.

For most sites I'd recommend **FrankenPHP** because it's one fewer
moving part. If you're heavily invested in nginx config (custom
rewrites, custom rate-limit modules, fancy SSL setups), RoadRunner is
the lower-risk migration.

This document assumes FrankenPHP from here on.

---

## Hard prerequisites before starting

1. **Tier A is fully deployed.** OPcache + preload + JIT are running
   in production for at least a week. If preload broke, you'll find
   out under FPM first; debugging it under FrankenPHP is harder.

2. **Worker-safe code audit.** This is the make-or-break step. PHP
   under FPM forgets state between requests. Worker-mode does NOT.
   Anything that mutates static or class-level state can leak between
   requests.

   Concrete things to verify in this codebase:
   - `Logger::init()` is called every request — check it's idempotent.
   - `Env::load()` — same.
   - `ConnectionPool::getInstance()` — singletons hold PDO connections
     across requests. Verify each connection is returned to the pool
     cleanly on request end (currently SqlRepository uses
     PDO::ATTR_PERSISTENT which Helps, but PDO transactions left open
     by a request will leak to the next one).
   - `RuntimeMetrics`, `CostMonitor`, `RealtimeEventBus` — if any of
     these accumulate state, that state needs explicit reset.
   - Any global / static array that grows over time (e.g., a
     dedup-key map) becomes a memory leak.

   Tool: write a minimal script that hits every endpoint 1000 times
   in a loop and watch the worker's RSS in `top`. RSS should plateau,
   not climb. If it climbs, you've got a leak.

3. **No `exit()` or `die()` in production code paths.** Worker mode
   treats those as terminal — the worker dies. FPM is forgiving here;
   FrankenPHP is not. Audit with `grep -rE "(^|[^a-z])(exit|die)\(" src/`
   and replace with `Response::json(...)` + return.

4. **Monitoring in place.** Don't migrate to a new runtime without an
   APM (New Relic, Datadog, Sentry, OpenTelemetry). If something
   regresses, you want to see it in graphs, not user complaints.

---

## Migration plan

### Phase 1 — Build a FrankenPHP image alongside (1 week)

1. Install FrankenPHP locally:
   ```
   curl https://frankenphp.dev/install.sh | sh
   sudo mv frankenphp /usr/local/bin/
   ```

2. Create `Caddyfile.frankenphp` at the repo root:
   ```
   {
       frankenphp {
           # Worker mode: keeps PHP alive between requests.
           worker /var/www/betterdr/php-backend/public/index.php 4
       }
   }

   :8080 {
       root * /var/www/betterdr/dist
       php_server
       file_server
   }
   ```

3. Boot FrankenPHP locally pointing at this codebase. Smoke-test:
   - `/api/_php/health` returns 200
   - login flow works
   - place a casino bet (against a dev DB)
   - load the my-bets page

4. If anything explodes, the leak audit from prerequisites was
   incomplete. Fix and repeat.

### Phase 2 — Canary on a single box (1–2 weeks)

1. Stand up a SECOND production-grade VM. Install FrankenPHP, deploy
   the codebase, point it at the same MySQL + Redis as production.

2. In your load balancer, route ~5% of traffic to this new box.

3. Watch dashboards for 7 days. Compare:
   - p50, p95, p99 latency between FPM and FrankenPHP boxes
   - Error rate (5xx, 4xx) between both
   - CPU + memory between both
   - DB connection count (FrankenPHP should hold fewer connections
     because workers are reused)

4. If FrankenPHP wins on every metric, proceed. If it loses on any
   non-trivial metric, debug there before promoting.

### Phase 3 — Full cutover (1 week)

1. Convert remaining boxes one at a time. Drain a box, swap to
   FrankenPHP, return to LB rotation, watch for 1 hour, then move on.

2. After all boxes are FrankenPHP, leave one FPM box on standby for
   30 days as a fallback.

### Phase 4 — Cleanup (after 30 days clean)

1. Decommission the standby FPM box.
2. Update deploy docs and runbooks.
3. Remove FPM-specific config files (php-fpm-opcache-phase13.conf,
   php-tier-a-tuning.ini — replaced by Caddyfile + per-worker tuning).

---

## Rollback plan

At any phase: switch the load balancer back to FPM-only.

Because we're keeping the FPM box on standby for 30 days, full
rollback takes one LB config change. No data migration needed —
both runtimes hit the same MySQL + Redis.

If you need to rollback DURING Phase 3 (after some boxes have been
flipped), drain those boxes back to FPM. Worst-case downtime: 5
minutes per box, in parallel.

---

## What you DON'T do

- **Do NOT** mix FPM and FrankenPHP behind the same LB without the
  canary phase. They can have subtle behavior differences (header
  case, output buffering, signal handling). Test side-by-side first.
- **Do NOT** enable FrankenPHP's auto-HTTPS in production until you've
  pointed DNS at it. Caddy will hammer Let's Encrypt and get
  rate-limited.
- **Do NOT** run the queue-worker.php inside FrankenPHP. The worker
  is a separate long-lived process, run it under systemd.

---

## Expected wins (concrete numbers)

For this codebase specifically, with Tier A done:

| Metric                    | FPM today | FrankenPHP est. |
|---------------------------|-----------|-----------------|
| Request bootstrap cost    | 3–8 ms    | 0.1–0.5 ms      |
| `/api/_php/health` p95    | 12 ms     | 3 ms            |
| `/api/wallet/balance` p95 | 35 ms     | 18 ms           |
| `/api/matches` p95 (warm) | 90 ms     | 50 ms           |
| `/api/casino/bet` p95     | 120 ms    | 75 ms           |
| Concurrent users / box    | ~500      | ~1500–2500      |

The wallet/matches/bet numbers depend more on DB than runtime, so
they shrink less than the bootstrap cost. The big win is throughput
per CPU dollar.
