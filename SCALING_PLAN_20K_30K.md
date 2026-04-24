# BetterDR Scaling Plan (20k to 30k Users)

## Objective
Scale the platform from current state to reliably support 20,000-30,000 active users with predictable latency, controlled error rate, and stable odds freshness.

## Non-Negotiable Targets (Production SLO)
- API p95 latency:
  - Public read endpoints: <= 400 ms
  - Authenticated user endpoints: <= 500 ms
- API error rate (5xx + timeout): <= 1%
- Odds freshness (scheduled/live): <= 120 seconds behind upstream
- Database CPU average: <= 65%, peak <= 80%
- Availability: >= 99.9%

## Current Constraints Observed
- Upstream Odds API returns frequent 429/422 under broad sport scope.
- Shared-host style environment is not suitable for stable 20k-30k scale without strict caching and service separation.
- Public matches path is still sensitive to cache miss storms without dedicated in-memory cache and edge caching.

## Capacity Model (Planning Baseline)
- 20k users assumption:
  - 5% concurrent peak = 1,000 concurrent sessions
  - 0.2 req/sec per active session burst = 200 req/sec peak
- 30k users assumption:
  - 5% concurrent peak = 1,500 concurrent sessions
  - 0.2 req/sec burst = 300 req/sec peak
- Design target:
  - Sustain 300 req/sec reads with p95 <= 400 ms
  - Sustain 30-50 req/sec writes/secure endpoints with p95 <= 500 ms

## Phase 0: Baseline and Guardrails (2-3 days)
Goal: Measure before changing architecture.

Tasks:
1. Add endpoint-level metrics for p50/p95/p99 latency, 4xx/5xx rate, and request volume.
2. Add odds worker metrics: calls, failedCalls, quotaRemaining, cycle duration.
3. Define production dashboards and alerts:
   - Alert if p95 > 700 ms for 10 min
   - Alert if 5xx > 2% for 5 min
   - Alert if odds freshness > 5 min
4. Finalize rollback checklist for every deploy.

Exit criteria:
- Dashboard visible for API, DB, worker, and cache hit ratio.
- Alerting verified with one synthetic failure drill.

## Phase 1: Read Path Hardening (3-5 days)
Goal: Remove expensive repeated reads and smooth traffic spikes.

Frontend:
1. Keep request dedupe and short client cache in useMatches.
2. Add route-level prefetch for high-traffic sportsbook tabs.
3. Add strict stale-while-revalidate UX for match lists.

Backend:
1. Keep shared cache fast path (APCu) and file fallback.
2. Add explicit cache hit/miss headers for all high-volume public endpoints.
3. Ensure public endpoints return minimal payload fields by default.

Edge/CDN:
1. Put Cloudflare (or equivalent) in front of static assets and public GET endpoints.
2. Cache static bundles aggressively (immutable fingerprinted assets).

Exit criteria:
- Public GET cache hit ratio >= 85%
- p95 for /api/matches <= 500 ms under 2x current peak traffic

## Phase 2: DB Optimization for Real Throughput (4-7 days)
Goal: Guarantee DB headroom at 300 req/sec read-heavy load.

Schema and indexes:
1. Verify generated columns + indexes used by EXPLAIN for:
   - matches by status/startTime
   - matches by sport/sportKey
   - bets by user/status
2. Add/adjust compound indexes only where EXPLAIN confirms scan reduction.
3. Remove unused or duplicate indexes causing write amplification.

Query hygiene:
1. Enforce pagination/limits for admin and historical lists.
2. Reduce wide projection responses for high-frequency endpoints.
3. Add query timeout protection and safe fallback responses where possible.

Exit criteria:
- DB slow query log: no recurring query > 300 ms on primary hot endpoints
- DB CPU <= 65% average in load test equivalent to 20k model

## Phase 3: Worker and Upstream Budget Control (3-5 days)
Goal: Keep odds fresh while staying within API credit and rate limits.

Worker strategy:
1. Segment sports into priority tiers:
   - Tier A: live + top leagues every cycle
   - Tier B: medium leagues every 2-3 cycles
   - Tier C: low demand every 5-10 cycles
2. Add adaptive backoff on 429/422 by sport key.
3. Add jitter to per-event chunks to avoid bursty upstream request walls.
4. Persist last-good extended markets and avoid destructive overwrite on partial failures.

Credit control:
1. Set per-hour credit budget and enforce hard cap with graceful degradation.
2. Log and monitor x-requests-used and x-requests-remaining for every cycle.

Exit criteria:
- failedCalls ratio under 25% sustained
- odds freshness <= 2 minutes for Tier A sports
- monthly projected credit usage within budget

## Phase 4: Infrastructure Split (1-2 weeks)
Goal: Move off single shared-host bottlenecks.

Required architecture:
1. Separate web/API from worker process.
2. Move DB to managed MySQL with better concurrency limits.
3. Add Redis for shared cache/session/rate-limit storage.
4. Run worker on persistent process platform (not fragile shared-host daemon behavior).

Suggested target shape:
- API: 2-3 instances behind load balancer
- Worker: 1-2 dedicated runners
- Redis: single primary with persistence
- MySQL: managed primary (optional read replica for analytics/admin)

Exit criteria:
- API remains healthy during worker spikes
- No dependency on local filesystem cache for multi-node coherence

## Phase 5: Reliability and Fault Isolation (4-6 days)
Goal: Prevent single failure from causing user-visible outages.

Tasks:
1. Circuit breaker for upstream odds API failures.
2. Fallback mode: serve cached odds with stale badge if upstream unavailable.
3. Protect admin and non-critical jobs with lower priority queues.
4. Add idempotency and retry policy review for write endpoints.

Exit criteria:
- Controlled degradation under simulated upstream outage
- No cascading failure from worker to public APIs

## Phase 6: 30k Readiness Certification (3-4 days)
Goal: Validate production readiness with evidence.

Load tests:
1. 20k model test (baseline pass)
2. 30k model test (stress pass)
3. 2-hour soak test at 60-70% peak

Must-pass gates:
- p95 latency within SLO
- error rate <= 1%
- odds freshness SLO met for Tier A sports
- no critical memory leaks or resource saturation

Deliverables:
- final benchmark report
- runbook for incident response
- rollback and feature-flag matrix

## Parallel Workstreams (Can run during phases)
- Security hardening:
  - Rotate exposed JWT and DB secrets
  - Validate env management and secret storage
- Cost optimization:
  - Tune sport tiers and market scope by user demand
  - Remove low-value high-cost calls
- Product resilience:
  - UX indicators for stale odds and degraded mode

## 30-Day Execution Schedule
- Week 1: Phase 0 + Phase 1
- Week 2: Phase 2
- Week 3: Phase 3 + start Phase 4
- Week 4: Finish Phase 4 + Phase 5 + Phase 6 validation

## Immediate Next Step (Start Today)
1. Execute Phase 0 metrics/alert setup.
2. Run baseline load test and capture p95/error/freshness.
3. Approve infra split plan (Phase 4) early, because this is the biggest 20k-30k blocker.

## Definition of Done
The plan is complete only when:
- 30k model load test passes SLO gates,
- odds worker remains within API budget with freshness targets,
- and production can tolerate upstream/API/DB partial failures without major user impact.
