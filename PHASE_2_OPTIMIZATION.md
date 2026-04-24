# Phase 2: Write Path Hardening & Database Schema Optimization

## Overview
Phase 2 focuses on hardening the write path, optimizing database schema operations, and controlling worker resource budgets for 20k-30k user scaling. Builds on Phase 1 Read Path Hardening (avg 118ms, p95 800ms for core payload).

**Primary Goals:**
- Reduce write latency (bets, settlements, user balance updates)
- Eliminate schema check overhead on hot paths
- Implement rate limiting for background sync workers
- Cache TTL tuning for optimal freshness vs cache hit ratio

---

## Phase 2A: Database Schema Metadata Caching

### 1. **Problem Statement**
- `SqlRepository::ensureTable()` calls query `information_schema.tables` on every connection
- `columnExists()` and `indexExists()` methods check `information_schema` on hot paths
- At 20k-30k users, these meta-queries create contention in MySQL metadata lock queue
- Currently no cross-request caching of schema state

### 2. **Solution: Multi-Tier Schema Metadata Cache**

**File:** `php-backend/src/SqlRepository.php`

**Implementation:**

```php
// Static cache (in-process, lifetime of PHP process)
private static array $schemaMetadataCache = [];
private static int $schemaCacheTTL = 3600; // 1 hour

private function getSchemaMetadata(string $key): ?array {
    // Tier 1: In-process static cache
    if (isset(self::$schemaMetadataCache[$key])) {
        $cached = self::$schemaMetadataCache[$key];
        if (time() - $cached['timestamp'] < self::$schemaCacheTTL) {
            return $cached['data'];
        }
        unset(self::$schemaMetadataCache[$key]);
    }
    
    // Tier 2: APCu (if available)
    if (extension_loaded('apcu')) {
        $apcKey = "schema_meta_{$key}";
        $data = apcu_fetch($apcKey);
        if ($data !== false) {
            self::$schemaMetadataCache[$key] = [
                'timestamp' => time(),
                'data' => $data
            ];
            return $data;
        }
    }
    
    return null;
}

private function setSchemaMetadata(string $key, array $data): void {
    self::$schemaMetadataCache[$key] = [
        'timestamp' => time(),
        'data' => $data
    ];
    
    if (extension_loaded('apcu')) {
        apcu_store("schema_meta_{$key}", $data, self::$schemaCacheTTL);
    }
}

// Rewrite tableExists() to use cache
public function tableExists(string $table): bool {
    $cacheKey = "table_exists_{$table}";
    $cached = $this->getSchemaMetadata($cacheKey);
    if ($cached !== null) {
        return $cached;
    }
    
    try {
        $stmt = $this->pdo->prepare(
            "SELECT 1 FROM information_schema.tables 
             WHERE table_schema = DATABASE() AND table_name = :table LIMIT 1"
        );
        $stmt->execute([':table' => $table]);
        $exists = (bool)$stmt->fetchColumn();
        $this->setSchemaMetadata($cacheKey, $exists);
        return $exists;
    } catch (Exception $e) {
        return false;
    }
}

// Similar rewrites for columnExists() and indexExists()
```

**Expected Impact:**
- Eliminates 95% of information_schema queries
- Reduces MySQL metadata lock contention
- Single-digit ms schema checks instead of 5-50ms

---

## Phase 2B: Write Path Optimization (Bets, Settlements)

### 1. **Batch Insert Optimization**

**Problem:** Each bet placed executes separate INSERT; at high concurrency (20k users), this creates lock escalation.

**Solution: Buffer Writes with Micro-Batching**

**File:** `php-backend/src/BetsController.php`

**Implementation:**

```php
class WriteBuffer {
    private array $buffer = [];
    private int $batchSize = 50;
    private string $table;
    private PDO $pdo;
    
    public function __construct(PDO $pdo, string $table, int $batchSize = 50) {
        $this->pdo = $pdo;
        $this->table = $table;
        $this->batchSize = $batchSize;
    }
    
    public function add(array $record): void {
        $this->buffer[] = $record;
        if (count($this->buffer) >= $this->batchSize) {
            $this->flush();
        }
    }
    
    public function flush(): void {
        if (empty($this->buffer)) {
            return;
        }
        
        $columns = array_keys($this->buffer[0]);
        $columnStr = '`' . implode('`, `', $columns) . '`';
        $placeholders = [];
        $values = [];
        
        foreach ($this->buffer as $idx => $record) {
            $placeholders[] = '(' . implode(',', 
                array_fill(0, count($columns), '?')
            ) . ')';
            $values = array_merge($values, array_values($record));
        }
        
        $sql = "INSERT INTO `{$this->table}` ({$columnStr}) VALUES " . 
               implode(',', $placeholders);
        
        $stmt = $this->pdo->prepare($sql);
        $stmt->execute($values);
        
        $this->buffer = [];
    }
}

// Usage in BetsController
$writeBuffer = new WriteBuffer($pdo, 'bets', 50);
foreach ($userBets as $bet) {
    $writeBuffer->add([
        'user_id' => $bet['userId'],
        'match_id' => $bet['matchId'],
        'odds' => $bet['odds'],
        'stake' => $bet['stake'],
        'status' => 'pending',
        'created_at' => date('Y-m-d H:i:s')
    ]);
}
$writeBuffer->flush();
```

**Expected Impact:**
- 70% reduction in lock contention for bet inserts
- Batch inserts 50x faster than individual inserts
- P95 write latency: 45-100ms (was 200-500ms)

### 2. **Update Deduplication (Balance, Settlement Updates)**

**Problem:** Multiple concurrent balance updates cause row-level locks to queue; settlement logic re-checks bet status redundantly.

**Solution: Write-Ahead Logging with Dedup**

**File:** `php-backend/src/BalanceUpdateService.php`

```php
class BalanceUpdateService {
    private PDO $pdo;
    private string $dedupeTable = 'balance_update_dedup';
    
    public function updateBalance(string $userId, float $amount, string $reason): bool {
        // Generate idempotency key
        $idempotencyKey = hash('sha256', $userId . $reason . time() / 10); // 10sec window
        
        // Check if already processed
        $stmt = $this->pdo->prepare(
            "SELECT id FROM {$this->dedupeTable} WHERE idempotency_key = ? LIMIT 1"
        );
        $stmt->execute([$idempotencyKey]);
        
        if ($stmt->fetchColumn()) {
            return true; // Already processed
        }
        
        // Atomic: log dedup + update balance
        $this->pdo->beginTransaction();
        try {
            $stmt = $this->pdo->prepare(
                "INSERT INTO {$this->dedupeTable} (idempotency_key, user_id, reason) 
                 VALUES (?, ?, ?)"
            );
            $stmt->execute([$idempotencyKey, $userId, $reason]);
            
            $stmt = $this->pdo->prepare(
                "UPDATE users SET balance = balance + ?, updated_at = NOW() 
                 WHERE id = ?"
            );
            $stmt->execute([$amount, $userId]);
            
            $this->pdo->commit();
            return true;
        } catch (Exception $e) {
            $this->pdo->rollBack();
            throw $e;
        }
    }
}
```

**Expected Impact:**
- Eliminates duplicate balance updates
- Reduces settlement retry overhead
- P95 settlement latency: 80-150ms (was 300-800ms)

---

## Phase 2C: Worker Rate Limiting & Budget Control

### 1. **OddsSyncService Rate Limiter**

**Problem:** Odds sync worker can spike CPU/DB when processing all sports + all markets + extended periods; at 20k users with refresh rates, background worker starves API requests.

**File:** `php-backend/src/OddsSyncService.php`

**Implementation:**

```php
class OddsSyncRateLimiter {
    private string $key;
    private int $maxCallsPerWindow;
    private int $windowSeconds;
    private Redis $redis;
    
    public function __construct(Redis $redis, string $key, int $maxCalls, int $window) {
        $this->redis = $redis;
        $this->key = $key;
        $this->maxCallsPerWindow = $maxCalls;
        $this->windowSeconds = $window;
    }
    
    public function allow(): bool {
        $now = time();
        $windowStart = $now - $this->windowSeconds;
        
        // Clean old entries
        $this->redis->zremrangebyscore($this->key, 0, $windowStart);
        
        // Count requests in window
        $count = $this->redis->zcard($this->key);
        
        if ($count < $this->maxCallsPerWindow) {
            $this->redis->zadd($this->key, $now, uniqid());
            return true;
        }
        
        return false;
    }
}

// In OddsSyncService::updateMatches()
$limiter = new OddsSyncRateLimiter($redis, 'odds_sync_rate', 
    maxCalls: 3,      // 3 syncs
    window: 60        // per 60 seconds
);

if (!$limiter->allow()) {
    return [
        'status' => 'skipped',
        'reason' => 'rate_limited',
        'message' => 'Odds sync already running, will retry in 10 seconds'
    ];
}

// Proceed with sync...
```

**Configuration:** Add to `.env`

```
# Worker rate limits
ODDS_SYNC_MAX_CALLS_PER_MINUTE=3
ODDS_SYNC_BATCH_SIZE=500
ODDS_SYNC_MAX_DURATION_SECONDS=30
SETTLEMENT_WORKER_MAX_CALLS_PER_MINUTE=5
SETTLEMENT_WORKER_BATCH_SIZE=100
```

**Expected Impact:**
- Prevents worker from consuming 100% CPU during load spikes
- API requests maintain p95 < 500ms even during sync
- Worker restarts are predictable and scheduled

### 2. **Settlement Worker Batch Processing**

**Problem:** Settlement loop processes one settlement at a time; at high volume, this causes lock timeouts.

**File:** `php-backend/src/SettlementWorker.php`

```php
class SettlementWorker {
    private const BATCH_SIZE = 100;
    private const MAX_DURATION_MS = 30000;
    
    public function processPending(): array {
        $startMs = microtime(true) * 1000;
        $result = ['processed' => 0, 'failed' => 0, 'duration_ms' => 0];
        
        while (true) {
            $elapsed = (microtime(true) * 1000) - $startMs;
            if ($elapsed > self::MAX_DURATION_MS) {
                break;
            }
            
            // Fetch batch of ready-to-settle bets
            $bets = $this->db->query(
                "SELECT id, user_id, amount FROM pending_settlements 
                 WHERE status = 'ready' 
                 ORDER BY created_at ASC 
                 LIMIT ?",
                [self::BATCH_SIZE]
            )->fetchAll();
            
            if (empty($bets)) {
                break;
            }
            
            $settled = $this->settleInBatch($bets);
            $result['processed'] += count($settled);
            $result['failed'] += count($bets) - count($settled);
        }
        
        $result['duration_ms'] = (microtime(true) * 1000) - $startMs;
        return $result;
    }
    
    private function settleInBatch(array $bets): array {
        $settled = [];
        $this->pdo->beginTransaction();
        
        try {
            foreach ($bets as $bet) {
                if ($this->settleBet($bet)) {
                    $settled[] = $bet['id'];
                }
            }
            $this->pdo->commit();
        } catch (Exception $e) {
            $this->pdo->rollBack();
            error_log("Settlement batch failed: " . $e->getMessage());
        }
        
        return $settled;
    }
}
```

**Expected Impact:**
- Settlement throughput: 100 bets/sec (was 5-10 bets/sec)
- Reduces lock contention from sequential processing
- P95 settlement time: < 2 seconds (was 30-60 seconds)

---

## Phase 2D: Cache TTL Optimization

### 1. **Adaptive Cache TTL Based on Traffic**

**Problem:** Fixed TTLs don't adapt to traffic patterns; high-traffic periods benefit from longer TTLs, off-peak periods waste cache slots.

**File:** `php-backend/src/AdaptiveCacheTTL.php`

```php
class AdaptiveCacheTTL {
    private $redis;
    private $metricsKey;
    
    public function getTTL(string $cacheKey, int $baselineTTL): int {
        // Read request count from last 5 minutes
        $requestCount = $this->redis->get("{$cacheKey}:requests_5m") ?? 0;
        
        // Scale TTL based on traffic
        $ttl = $baselineTTL;
        if ($requestCount > 1000) {
            $ttl = (int)($baselineTTL * 1.5); // High traffic: +50%
        } elseif ($requestCount < 100) {
            $ttl = (int)($baselineTTL * 0.5); // Low traffic: -50%
        }
        
        return max(60, min(3600, $ttl)); // Clamp between 1m and 1h
    }
}

// Usage
$ttl = $adaptiveTTL->getTTL('matches_by_sport', 300);
$cache->set($key, $value, $ttl);
```

**Baseline TTLs for Sports Matchups (in seconds):**

```
matches (by sport):           300  (5 min) → adaptive 150-450
teams (stats/roster):         600  (10 min)
odds:                         30   (30 sec - high volatility)
user_balance:                 10   (10 sec - frequent updates)
agent_commission_rates:       3600 (1 hour - low change rate)
settlement_state:             5    (5 sec - time-critical)
```

**Expected Impact:**
- Cache hit ratio improves from 72% to 84% (12pp)
- Cold-start latency reduced 35% through smart prefetch
- Memory utilization decreases 15% due to better eviction

### 2. **Stale-While-Revalidate for Background Updates**

**File:** `php-backend/src/CacheWithStaleRevalidate.php`

```php
class CacheWithStaleRevalidate {
    private $cache;
    private $db;
    private $redis;
    
    public function get(string $key, callable $loader, int $ttl = 300): mixed {
        // Tier 1: Fresh cache
        $cached = $this->cache->get($key);
        if ($cached && !$this->isStale($key)) {
            return json_decode($cached, true);
        }
        
        // Tier 2: Stale cache (serve immediately, revalidate in background)
        if ($cached) {
            // Queue background revalidation
            $this->redis->lpush("cache_revalidate_queue", $key);
            return json_decode($cached, true);
        }
        
        // Tier 3: Cache miss (synchronous load)
        $value = $loader();
        $this->cache->set($key, json_encode($value), $ttl);
        $this->setFreshTimestamp($key);
        return $value;
    }
    
    private function isStale(string $key): bool {
        $freshTs = $this->redis->get("{$key}:fresh_at") ?? 0;
        return time() > ($freshTs + 300); // 5-min grace period
    }
    
    private function setFreshTimestamp(string $key): void {
        $this->redis->set("{$key}:fresh_at", time());
    }
}

// Worker: Background revalidation
$worker = new CacheRevalidationWorker($cache, $db, $redis);
while (true) {
    $key = $redis->rpop("cache_revalidate_queue");
    if (!$key) {
        sleep(1);
        continue;
    }
    
    $value = $db->fetch($key);
    $cache->set($key, json_encode($value), 300);
}
```

**Expected Impact:**
- P99 latency reduced 40% (no synchronous cache misses)
- Backend freshness maintained within 5 seconds
- User experience: instant response + background update

---

## Phase 2E: Database Connection Pool Tuning

### 1. **Connection Pool Configuration**

**File:** `php-backend/.env`

```
# Connection pool settings (for 20k-30k users)
DB_POOL_MIN_CONNECTIONS=10
DB_POOL_MAX_CONNECTIONS=50
DB_POOL_MAX_IDLE_SECONDS=30
DB_POOL_ACQUIRE_TIMEOUT_MS=2000
DB_POOL_WAIT_QUEUE_SIZE=100

# Per-request settings
DB_QUERY_TIMEOUT_MS=5000
DB_TRANSACTION_TIMEOUT_MS=10000
```

### 2. **Connection Pool Monitoring**

**File:** `php-backend/src/ConnectionPoolMonitor.php`

```php
class ConnectionPoolMonitor {
    public function getPoolHealth(): array {
        return [
            'active_connections' => $this->pool->getActiveCount(),
            'idle_connections' => $this->pool->getIdleCount(),
            'waiting_requests' => $this->pool->getWaitQueueSize(),
            'p95_acquire_time_ms' => $this->pool->getP95AcquireTimeMs(),
            'connection_errors_5m' => $this->getErrorCount('last_5m'),
            'health_status' => $this->determineHealth()
        ];
    }
    
    private function determineHealth(): string {
        $active = $this->pool->getActiveCount();
        $max = $this->pool->getMaxConnections();
        
        if ($active / $max > 0.9) return 'critical';
        if ($active / $max > 0.7) return 'warning';
        return 'healthy';
    }
}

// Add to health endpoint
$poolHealth = $poolMonitor->getPoolHealth();
$health['database']['connectionPool'] = $poolHealth;
```

**Exposed in health endpoint:**
```json
{
  "database": {
    "connectionPool": {
      "activeConnections": 32,
      "idleConnections": 8,
      "waitingRequests": 2,
      "p95AcquireTimeMs": 45,
      "connectionErrors5m": 0,
      "healthStatus": "healthy"
    }
  }
}
```

**Expected Impact:**
- Connection timeout errors near 0
- P95 acquire time: 40-50ms (was 100-300ms under load)
- Enables safe handling of 20k-30k concurrent users

---

## Phase 2 Implementation Checklist

### Week 1: Schema & Metadata Caching
- [ ] Implement `SqlRepository::getSchemaMetadata()` and APCu tier
- [ ] Rewrite `tableExists()`, `columnExists()`, `indexExists()` with caching
- [ ] Add schema cache invalidation logic (ALTER TABLE events)
- [ ] Load tests: Verify metadata query count drops 95%
- [ ] Metrics: Track information_schema query latency

### Week 2: Write Path Optimization
- [ ] Implement `WriteBuffer` class for batch inserts
- [ ] Refactor `BetsController` to use write buffering
- [ ] Implement `BalanceUpdateService` with dedup logic
- [ ] Create `balance_update_dedup` table and cleanup job
- [ ] Load tests: Verify 70% reduction in lock contention

### Week 3: Worker Rate Limiting
- [ ] Implement `OddsSyncRateLimiter` with Redis
- [ ] Add rate limit thresholds to `.env`
- [ ] Implement `SettlementWorker::processPending()` batch logic
- [ ] Add worker metrics to observability endpoint
- [ ] Load tests: Verify API p95 stays < 500ms during worker spike

### Week 4: Cache TTL & Connection Pool
- [ ] Implement `AdaptiveCacheTTL` with traffic-based scaling
- [ ] Implement `CacheWithStaleRevalidate` and background worker
- [ ] Tune connection pool settings in `.env`
- [ ] Add `ConnectionPoolMonitor` metrics to health endpoint
- [ ] Full load test at 20k concurrent users

---

## Success Metrics (End of Phase 2)

### Latency Targets (20k-30k concurrent users)
| Endpoint | P50 | P95 | P99 |
|----------|-----|-----|-----|
| GET /api/matches (core) | 80ms | 300ms | 600ms |
| POST /api/bets | 45ms | 120ms | 250ms |
| GET /api/settlements | 50ms | 200ms | 400ms |
| Odds sync (background) | - | - | 30s duration max |

### Database Metrics
| Metric | Target |
|--------|--------|
| Information_schema queries/min | < 10 |
| Lock wait average | < 5ms |
| Connection pool p95 acquire | < 50ms |
| Transaction abort rate | < 0.1% |

### Cache Metrics
| Metric | Target |
|--------|--------|
| Matches cache hit ratio | 84%+ |
| Odds cache hit ratio | 78%+ |
| Stale-while-revalidate usage | 15-20% of reads |

### Resource Utilization
| Resource | Target |
|----------|--------|
| MySQL CPU | < 45% |
| PHP-FPM memory | < 2.5GB (50 workers × 50MB) |
| Redis memory | < 500MB |
| API error rate | < 0.5% (5xx + 4xx) |

---

## Risk Mitigation

### Rollback Strategy
- All schema changes are additive (ALTER TABLE ADD COLUMN/INDEX)
- Worker rate limits have configuration escape hatches
- Cache TTL changes can be reverted within 60 seconds
- Batch insert can fall back to sequential if issues occur

### Monitoring During Rollout
- Deploy schema changes in off-peak windows
- Enable new features via feature flags (gradual rollout)
- Alert on schema metadata cache hit/miss ratio
- Monitor database lock wait times in real-time
- Test with simulated 20k-30k concurrent user load before prod

---

## Continuation: Phase 3 (After Phase 2 Validation)

**Phase 3A: Frontend Bundle & Asset Optimization**
- Lazy-load route components (reduce initial bundle 45%)
- Image optimization (WebP, progressive JPEG)
- Code-split by route/feature

**Phase 3B: Search & Aggregation Optimization**
- Full-text search indexes for match search
- Materialized views for leaderboards/stats
- Read replicas for analytics queries

**Phase 3C: Real-time Messaging & Pub/Sub**
- WebSocket server for live odds/settlement updates
- Message queue (Redis Streams) for event processing
- Push notifications for bet settlements

**Phase 3D: Cost Optimization**
- Downsize infrastructure post-optimization
- Reserved capacity planning
- CDN for static assets

---

## Document History
- **v1.0** - 2026-04-24: Initial Phase 2 plan (Schema caching, Write optimization, Worker rate limiting, Cache TTL, Connection pooling)
