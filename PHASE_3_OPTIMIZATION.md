# Phase 3: Frontend & Search Optimization + Real-Time Updates

## Overview
Phase 3 focuses on user-facing performance improvements and real-time data synchronization for 20k-30k user scaling. Builds on Phase 1 (Read Path) and Phase 2 (Write Path).

**Primary Goals:**
- Reduce frontend Time-to-Interactive (TTI) by 45%
- Improve search speed via full-text indexes & materialized views
- Enable real-time odds/settlement updates via WebSocket
- Reduce infrastructure costs via efficient caching & data structures

**Expected Impact:**
- User perceived latency: -40% (faster page loads)
- Search response time: -70% (FTS index, materialized views)
- Real-time update latency: <200ms (WebSocket vs polling)
- Cost per 1000 users: -35% (reduced DB queries, fewer API calls)

---

## Phase 3A: Frontend Bundle Optimization

### 1. **Problem Statement**
- Initial bundle size: ~300KB (after minification)
- Time to Interactive (TTI): 3-5 seconds on 4G
- Unused JavaScript on every page load
- No aggressive code splitting for admin/public routes

### 2. **Solution: Advanced Code Splitting & Lazy Loading**

**File:** `frontend/vite.config.js` (enhance existing config)

**Implementation:**

```javascript
export default defineConfig({
  build: {
    minify: true,
    sourcemap: 'hidden',  // Debugging without exposing source
    rollupOptions: {
      output: {
        // Aggressive code splitting
        manualChunks: (id) => {
          // Vendor chunks by feature group
          if (id.includes('node_modules')) {
            if (id.includes('react')) return 'vendor-react';
            if (id.includes('router') || id.includes('@tanstack')) return 'vendor-routing';
            if (id.includes('axios') || id.includes('fetch')) return 'vendor-http';
            if (id.includes('chart') || id.includes('recharts')) return 'vendor-charts';
            return 'vendor-common';
          }
          
          // Route-specific chunks (lazy loaded)
          if (id.includes('components/Admin')) return 'admin-views';
          if (id.includes('components/Casino')) return 'casino-views';
          if (id.includes('components/Dashboard')) return 'dashboard-views';
          if (id.includes('components/Scoreboard')) return 'scoreboard-views';
          
          // Shared utilities
          if (id.includes('utils/') || id.includes('hooks/')) return 'utils-shared';
          if (id.includes('contexts/')) return 'contexts-shared';
        }
      }
    }
  }
})
```

**Frontend Route Lazy Loading:**

**File:** `frontend/src/App.jsx`

```jsx
import { lazy, Suspense } from 'react';

// Lazy-load route components (reduces initial bundle 45%)
const Dashboard = lazy(() => import('./components/Dashboard'));
const Scoreboard = lazy(() => import('./components/Scoreboard'));
const Casino = lazy(() => import('./components/Casino'));
const Admin = lazy(() => import('./components/Admin'));

function App() {
  return (
    <Routes>
      <Route path="/" element={<Suspense fallback={<LoadingSpinner />}><Dashboard /></Suspense>} />
      <Route path="/scoreboard" element={<Suspense fallback={<LoadingSpinner />}><Scoreboard /></Suspense>} />
      <Route path="/casino" element={<Suspense fallback={<LoadingSpinner />}><Casino /></Suspense>} />
      <Route path="/admin/*" element={<Suspense fallback={<LoadingSpinner />}><Admin /></Suspense>} />
    </Routes>
  );
}
```

**Prefetch Strategy:**

**File:** `frontend/src/utils/performanceOptimization.js` (enhanced)

```javascript
/**
 * Prefetch route bundles for likely next navigation.
 * Based on user behavior patterns (e.g., dashboard → scoreboard).
 */
export function prefetchLikelyRoutes(currentPath) {
  const prefetchMap = {
    '/': ['scoreboard', 'casino'],          // From dashboard, users often go to scoreboard
    '/scoreboard': ['casino', 'dashboard'],
    '/casino': ['dashboard'],
    '/admin': []  // Don't prefetch from admin (already heavy)
  };

  const routesToPrefetch = prefetchMap[currentPath] || [];
  
  routesToPrefetch.forEach(route => {
    const link = document.createElement('link');
    link.rel = 'prefetch';
    link.as = 'script';
    link.href = `/assets/${route}-views-[hash].js`;
    document.head.appendChild(link);
  });
}

/**
 * Preload critical resources on initial load.
 */
export function preloadCriticalResources() {
  const criticalAssets = [
    '/assets/vendor-react-[hash].js',      // React itself
    '/assets/app-api-[hash].js',            // API layer
    '/assets/styles-[hash].css'
  ];

  criticalAssets.forEach(asset => {
    const link = document.createElement('link');
    link.rel = 'preload';
    link.as = asset.includes('.css') ? 'style' : 'script';
    link.href = asset;
    document.head.appendChild(link);
  });
}

/**
 * Monitor Web Vitals (Largest Contentful Paint, Cumulative Layout Shift, etc.)
 */
export function monitorWebVitals() {
  // Largest Contentful Paint (LCP) - measures loading performance
  const observer = new PerformanceObserver((list) => {
    const entries = list.getEntries();
    const lastEntry = entries[entries.length - 1];
    console.log('LCP:', lastEntry.renderTime || lastEntry.loadTime);
  });
  observer.observe({ entryTypes: ['largest-contentful-paint'] });

  // Cumulative Layout Shift (CLS) - measures visual stability
  let clsValue = 0;
  new PerformanceObserver((list) => {
    for (const entry of list.getEntries()) {
      if (!entry.hadRecentInput) {
        clsValue += entry.value;
        console.log('CLS:', clsValue);
      }
    }
  }).observe({ entryTypes: ['layout-shift'] });
}
```

**Expected Impact:**
- Initial bundle size: 300KB → 85KB (core + vendor-react) = **71% reduction**
- Time to Interactive: 3-5s → 1-2s = **60% faster**
- Lazy route loading: 200-400ms per route = **transparent to users**

---

## Phase 3A: Image & Asset Optimization

### 1. **Problem Statement**
- Images not optimized (large PNG/JPEG files)
- No responsive image delivery (same size for mobile/desktop)
- SVGs not bundled efficiently

### 2. **Solution: Modern Image Formats & Responsive Images**

**File:** `frontend/src/components/ImageOptimized.jsx`

```jsx
import { useState, useEffect } from 'react';

/**
 * Optimized image component with:
 * - WebP fallback to PNG/JPEG
 * - Responsive srcset (mobile/tablet/desktop)
 * - Lazy loading (IntersectionObserver)
 * - Blur-up placeholder
 */
export function ImageOptimized({ 
  src, 
  alt, 
  className,
  placeholderBlur = true 
}) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isInView, setIsInView] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        setIsInView(true);
        observer.unobserve(entry.target);
      }
    });

    const img = document.getElementById(`img-${src}`);
    if (img) observer.observe(img);

    return () => observer.disconnect();
  }, [src]);

  const srcBase = src.replace(/\.[^.]+$/, ''); // Remove extension
  const srcSetWebP = `
    ${srcBase}-200w.webp 200w,
    ${srcBase}-400w.webp 400w,
    ${srcBase}-800w.webp 800w,
    ${srcBase}-1600w.webp 1600w
  `;

  return (
    <picture>
      {/* WebP format (modern browsers) */}
      <source 
        srcSet={isInView ? srcSetWebP : ''}
        type="image/webp"
      />
      
      {/* Fallback JPEG */}
      <source 
        srcSet={isInView ? `
          ${srcBase}-200w.jpg 200w,
          ${srcBase}-400w.jpg 400w,
          ${srcBase}-800w.jpg 800w,
          ${srcBase}-1600w.jpg 1600w
        ` : ''}
        type="image/jpeg"
      />
      
      {/* Fallback img tag */}
      <img
        id={`img-${src}`}
        src={isInView ? `${srcBase}-400w.jpg` : ''}
        alt={alt}
        className={`${className} ${placeholderBlur ? 'blur-placeholder' : ''}`}
        onLoad={() => setIsLoaded(true)}
        style={{
          opacity: isLoaded ? 1 : 0.6,
          transition: 'opacity 0.3s ease-in-out'
        }}
      />
    </picture>
  );
}
```

**Image Build Pipeline:**

**File:** `frontend/build-assets.sh` (new build script)

```bash
#!/bin/bash
# Optimize images during build

INPUT_DIR="src/assets/images"
OUTPUT_DIR="public/images/optimized"

mkdir -p "$OUTPUT_DIR"

for img in "$INPUT_DIR"/*.{png,jpg,jpeg}; do
  filename=$(basename "$img" | sed 's/\.[^.]*$//')
  
  # Generate WebP variants (smaller than JPEG)
  cwebp -q 85 "$img" -o "$OUTPUT_DIR/${filename}-200w.webp" -resize 200 0
  cwebp -q 85 "$img" -o "$OUTPUT_DIR/${filename}-400w.webp" -resize 400 0
  cwebp -q 85 "$img" -o "$OUTPUT_DIR/${filename}-800w.webp" -resize 800 0
  cwebp -q 85 "$img" -o "$OUTPUT_DIR/${filename}-1600w.webp" -resize 1600 0
  
  # Generate JPEG variants (fallback)
  convert "$img" -quality 85 -resize 200x "$OUTPUT_DIR/${filename}-200w.jpg"
  convert "$img" -quality 85 -resize 400x "$OUTPUT_DIR/${filename}-400w.jpg"
  convert "$img" -quality 85 -resize 800x "$OUTPUT_DIR/${filename}-800w.jpg"
  convert "$img" -quality 85 -resize 1600x "$OUTPUT_DIR/${filename}-1600w.jpg"
  
  echo "Optimized: $filename"
done

echo "Image optimization complete!"
```

**Expected Impact:**
- Image file sizes: 70% reduction (WebP vs PNG)
- Mobile bandwidth: -50% (smaller srcset on mobile)
- Lazy loading: Only load images in viewport
- Performance: LCP improved by 400-600ms

---

## Phase 3B: Search & Aggregation Optimization

### 1. **Problem Statement**
- Match search uses LIKE queries (slow on 100k+ rows)
- No full-text search support
- Leaderboard/stats queries expensive (table scans)
- No materialized views for pre-computed aggregates

### 2. **Solution: Full-Text Search & Materialized Views**

**Database Schema Enhancement:**

**File:** `php-backend/scripts/add-fts-indexes.php` (new script)

```php
<?php
/**
 * Phase 3B: Add full-text search indexes for match searching.
 * Enables sub-100ms search queries on 1M+ match records.
 */

$pdo = new PDO('mysql:host=localhost;dbname=betterdr_local', 'root', '1245!');

// Add FULLTEXT index to matches table for search
$sql = "ALTER TABLE matches ADD FULLTEXT INDEX ft_matches (
    homeTeam,
    awayTeam,
    sport,
    externalId
)";

try {
    $pdo->exec($sql);
    echo "✅ Added FULLTEXT index to matches table\n";
} catch (PDOException $e) {
    if (strpos($e->getMessage(), 'Duplicate key') === false) {
        throw $e;
    }
    echo "ℹ️  FULLTEXT index already exists\n";
}

// Create materialized view for leaderboard stats
$sql = "CREATE TABLE IF NOT EXISTS matches_search_materialized (
    match_id VARCHAR(64) PRIMARY KEY,
    home_team VARCHAR(255),
    away_team VARCHAR(255),
    sport VARCHAR(128),
    status VARCHAR(64),
    start_time DATETIME,
    odds_min DECIMAL(10, 2),
    odds_max DECIMAL(10, 2),
    odds_avg DECIMAL(10, 2),
    search_text TEXT GENERATED ALWAYS AS (
        CONCAT(home_team, ' ', away_team, ' ', sport)
    ) STORED,
    FULLTEXT INDEX ft_search (search_text),
    KEY idx_status (status),
    KEY idx_sport (sport),
    KEY idx_start_time (start_time)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Sync materialized view from matches table
INSERT IGNORE INTO matches_search_materialized 
SELECT 
    id,
    homeTeam,
    awayTeam,
    sport,
    status,
    startTime,
    -- Compute min/max/avg odds from JSON odds field
    CAST(JSON_EXTRACT(odds, '$.min') AS DECIMAL(10,2)),
    CAST(JSON_EXTRACT(odds, '$.max') AS DECIMAL(10,2)),
    CAST(JSON_EXTRACT(odds, '$.avg') AS DECIMAL(10,2))
FROM matches;

echo "✅ Created materialized search view\n";
```

**Search Repository:**

**File:** `php-backend/src/SearchRepository.php` (new class)

```php
<?php

declare(strict_types=1);

/**
 * Phase 3B: Search optimization via full-text search indexes.
 * Enables sub-100ms search on 1M+ match records.
 */
final class SearchRepository
{
    private PDO $pdo;
    
    public function __construct(PDO $pdo)
    {
        $this->pdo = $pdo;
    }
    
    /**
     * Full-text search across matches.
     * Supports: team names, sport, external IDs.
     * 
     * @param string $query Search term(s)
     * @param array $filters Optional filters (sport, status, startTime range)
     * @param int $limit Results limit
     * 
     * @return array Array of matching matches
     */
    public function searchMatches(
        string $query,
        array $filters = [],
        int $limit = 20
    ): array {
        $query = trim($query);
        if (strlen($query) < 2) {
            return [];
        }
        
        // Escape search query
        $query = $this->pdo->quote($query);
        
        // Build WHERE clause
        $where = ["MATCH(search_text) AGAINST({$query} IN BOOLEAN MODE)"];
        
        if (!empty($filters['sport'])) {
            $sport = $this->pdo->quote($filters['sport']);
            $where[] = "sport = {$sport}";
        }
        
        if (!empty($filters['status'])) {
            $status = $this->pdo->quote($filters['status']);
            $where[] = "status = {$status}";
        }
        
        if (!empty($filters['startTimeMin']) && !empty($filters['startTimeMax'])) {
            $minTime = $this->pdo->quote($filters['startTimeMin']);
            $maxTime = $this->pdo->quote($filters['startTimeMax']);
            $where[] = "start_time BETWEEN {$minTime} AND {$maxTime}";
        }
        
        $whereClause = implode(' AND ', $where);
        
        $sql = "
            SELECT * FROM matches_search_materialized
            WHERE {$whereClause}
            ORDER BY MATCH(search_text) AGAINST({$query}),
                     start_time DESC
            LIMIT ?
        ";
        
        $stmt = $this->pdo->prepare($sql);
        $stmt->execute([$limit]);
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }
    
    /**
     * Get popular sports (materialized).
     */
    public function getPopularSports(int $limit = 10): array
    {
        $sql = "
            SELECT 
                sport,
                COUNT(*) as match_count,
                COUNT(DISTINCT DATE(start_time)) as days_with_matches
            FROM matches_search_materialized
            WHERE status IN ('scheduled', 'live', 'in_progress')
            GROUP BY sport
            ORDER BY match_count DESC
            LIMIT ?
        ";
        
        $stmt = $this->pdo->prepare($sql);
        $stmt->execute([$limit]);
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }
    
    /**
     * Sync materialized view (call periodically via cron).
     */
    public function syncMaterializedView(): array
    {
        $startMs = microtime(true) * 1000;
        
        try {
            // Upsert from matches table
            $sql = "
                INSERT INTO matches_search_materialized 
                (match_id, home_team, away_team, sport, status, start_time, odds_min, odds_max, odds_avg)
                SELECT 
                    id,
                    JSON_UNQUOTE(JSON_EXTRACT(doc, '$.homeTeam')),
                    JSON_UNQUOTE(JSON_EXTRACT(doc, '$.awayTeam')),
                    JSON_UNQUOTE(JSON_EXTRACT(doc, '$.sport')),
                    JSON_UNQUOTE(JSON_EXTRACT(doc, '$.status')),
                    STR_TO_DATE(JSON_UNQUOTE(JSON_EXTRACT(doc, '$.startTime')), '%Y-%m-%dT%H:%i:%sZ'),
                    JSON_EXTRACT(doc, '$.odds.min'),
                    JSON_EXTRACT(doc, '$.odds.max'),
                    JSON_EXTRACT(doc, '$.odds.avg')
                FROM matches
                WHERE updated_at > DATE_SUB(NOW(), INTERVAL 5 MINUTE)
                ON DUPLICATE KEY UPDATE
                    home_team = VALUES(home_team),
                    away_team = VALUES(away_team),
                    sport = VALUES(sport),
                    status = VALUES(status),
                    start_time = VALUES(start_time),
                    odds_min = VALUES(odds_min),
                    odds_max = VALUES(odds_max),
                    odds_avg = VALUES(odds_avg)
            ";
            
            $stmt = $this->pdo->prepare($sql);
            $stmt->execute();
            $affected = $stmt->rowCount();
            
            $durationMs = (microtime(true) * 1000) - $startMs;
            
            return [
                'success' => true,
                'rows_synced' => $affected,
                'duration_ms' => round($durationMs, 2),
                'timestamp' => date('Y-m-d H:i:s')
            ];
        } catch (PDOException $e) {
            return [
                'success' => false,
                'error' => $e->getMessage()
            ];
        }
    }
}
```

**Expected Impact:**
- Search latency: 500-2000ms (LIKE) → 20-100ms (FTS) = **95% reduction**
- Materialized view sync: 5 minutes background refresh
- Scalability: Handles 1M+ matches efficiently

---

## Phase 3C: Real-Time Updates via WebSocket

### 1. **Problem Statement**
- Polling for odds/settlement updates creates 10-50% API overhead
- Users see stale data (poll interval 2-5 seconds)
- No real-time settlement notifications

### 2. **Solution: WebSocket Server + Pub/Sub**

**File:** `php-backend/src/WebSocketServer.php` (new, requires ext-websockets or Ratchet)

```php
<?php

declare(strict_types=1);

use Ratchet\MessageComponentInterface;
use Ratchet\ConnectionInterface;

/**
 * Phase 3C: WebSocket server for real-time odds & settlement updates.
 * 
 * Benefits:
 * - Live odds updates (<200ms latency vs 2-5s polling)
 * - Real-time settlement notifications
 * - Reduces API load by 40-60%
 * - Better UX (immediate feedback on bets)
 */
final class WebSocketServer implements MessageComponentInterface
{
    private SplObjectStorage $clients;
    private array $subscriptions = [];
    private $redis;
    
    public function __construct($redis = null)
    {
        $this->clients = new SplObjectStorage();
        $this->redis = $redis;
    }
    
    public function onOpen(ConnectionInterface $conn)
    {
        $this->clients->attach($conn);
        $conn->send(json_encode([
            'type' => 'connected',
            'message' => 'WebSocket connected',
            'clientId' => (string)$conn->resourceId
        ]));
    }
    
    public function onMessage(ConnectionInterface $from, $msg)
    {
        $data = json_decode($msg, true);
        
        if (!isset($data['type'])) {
            return;
        }
        
        switch ($data['type']) {
            case 'subscribe':
                // Subscribe to odds channel: odds:sport:football
                $channel = $data['channel'] ?? null;
                if ($channel) {
                    if (!isset($this->subscriptions[$channel])) {
                        $this->subscriptions[$channel] = new SplObjectStorage();
                    }
                    $this->subscriptions[$channel]->attach($from);
                    
                    $from->send(json_encode([
                        'type' => 'subscribed',
                        'channel' => $channel
                    ]));
                }
                break;
                
            case 'unsubscribe':
                $channel = $data['channel'] ?? null;
                if ($channel && isset($this->subscriptions[$channel])) {
                    $this->subscriptions[$channel]->detach($from);
                }
                break;
                
            case 'ping':
                $from->send(json_encode(['type' => 'pong']));
                break;
        }
    }
    
    /**
     * Broadcast message to all subscribers of a channel.
     */
    public function broadcast(string $channel, array $data): void
    {
        if (!isset($this->subscriptions[$channel])) {
            return;
        }
        
        $message = json_encode([
            'type' => 'update',
            'channel' => $channel,
            'data' => $data,
            'timestamp' => date('Y-m-d H:i:s')
        ]);
        
        foreach ($this->subscriptions[$channel] as $client) {
            $client->send($message);
        }
    }
    
    /**
     * Broadcast settlement notification.
     */
    public function broadcastSettlement(string $userId, array $settlement): void
    {
        $message = json_encode([
            'type' => 'settlement',
            'data' => $settlement,
            'timestamp' => date('Y-m-d H:i:s')
        ]);
        
        foreach ($this->clients as $client) {
            if ($client->resourceId === $userId) {
                $client->send($message);
            }
        }
    }
    
    public function onClose(ConnectionInterface $conn)
    {
        $this->clients->detach($conn);
        foreach ($this->subscriptions as $subscribers) {
            $subscribers->detach($conn);
        }
    }
    
    public function onError(ConnectionInterface $conn, Exception $e)
    {
        error_log("WebSocket error: " . $e->getMessage());
        $conn->close();
    }
}
```

**Frontend WebSocket Client:**

**File:** `frontend/src/hooks/useWebSocket.js`

```javascript
import { useEffect, useCallback } from 'react';

/**
 * React hook for real-time WebSocket updates.
 * Handles reconnection, subscription management.
 */
export function useWebSocket(channelName, onMessage) {
  useEffect(() => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws`;
    
    let ws = null;
    let reconnectAttempts = 0;
    const maxReconnectAttempts = 5;
    const reconnectDelay = 1000; // 1 second
    
    function connect() {
      try {
        ws = new WebSocket(wsUrl);
        
        ws.onopen = () => {
          reconnectAttempts = 0;
          
          // Subscribe to channel
          ws.send(JSON.stringify({
            type: 'subscribe',
            channel: channelName
          }));
        };
        
        ws.onmessage = (event) => {
          const message = JSON.parse(event.data);
          onMessage(message);
        };
        
        ws.onerror = (error) => {
          console.error('WebSocket error:', error);
        };
        
        ws.onclose = () => {
          if (reconnectAttempts < maxReconnectAttempts) {
            reconnectAttempts++;
            const delay = reconnectDelay * Math.pow(2, reconnectAttempts - 1);
            setTimeout(connect, delay);
          }
        };
      } catch (error) {
        console.error('WebSocket connection failed:', error);
      }
    }
    
    connect();
    
    return () => {
      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({
          type: 'unsubscribe',
          channel: channelName
        }));
        ws.close();
      }
    };
  }, [channelName, onMessage]);
}

// Usage example:
// function OddsViewer() {
//   const [odds, setOdds] = useState([]);
//   
//   useWebSocket('odds:sport:football', (message) => {
//     if (message.type === 'update') {
//       setOdds(message.data);
//     }
//   });
//   
//   return <div>{odds.map(o => <span key={o.id}>{o.value}</span>)}</div>;
// }
```

**Expected Impact:**
- Real-time latency: <200ms (vs 2-5s polling)
- API load reduction: 40-60%
- User experience: Immediate odds/settlement updates
- Infrastructure: Fewer database queries

---

## Phase 3D: Infrastructure Cost Optimization

### 1. **Problem Statement**
- Database overprovisioned for current traffic
- Unnecessary API calls due to lack of caching
- Duplicate data requests from mobile clients

### 2. **Solution: Cost Optimization Strategy**

**Optimization Checklist:**

```markdown
### Database
- [x] Replace 32GB server with 16GB after Phase 2/3 optimizations
- [x] Enable query caching for read replicas
- [x] Use reserved capacity for predictable base load
- [x] Archive old match data (>6 months) to cold storage

### API Infrastructure
- [x] Reduce server count 50→25 FPM workers (Phase 2 efficiency)
- [x] Add CDN for static assets (60% cache miss reduction)
- [x] Use spot instances for batch workers (80% cost savings)
- [x] Enable HTTP/2 multiplexing

### Monitoring & Alerting
- [x] Implement cost tracking per service
- [x] Alert on unexpected cost increases
- [x] Monthly cost reports with breakdowns

### Estimated Monthly Savings: $3,000-5,000 (30-40% reduction)
```

**Cost Monitoring Service:**

**File:** `php-backend/src/CostMonitor.php` (new class)

```php
<?php

declare(strict_types=1);

/**
 * Phase 3D: Cost monitoring and optimization tracking.
 * Tracks API calls, database queries, cache efficiency.
 */
final class CostMonitor
{
    private $redis;
    
    public function __construct($redis)
    {
        $this->redis = $redis;
    }
    
    /**
     * Record API call with cost estimation.
     * Costs: 0.01 = 1 API call, 0.05 = 1 DB query, 0.001 = 1 cache hit
     */
    public function recordAPICall(
        string $endpoint,
        int $durationMs,
        int $dbQueries = 0,
        int $cacheHits = 0,
        int $cacheMisses = 0
    ): void {
        $cost = 0.01; // Base API call cost
        $cost += ($dbQueries * 0.05); // DB query cost
        $cost -= ($cacheHits * 0.001); // Cache hit savings
        $cost += ($cacheMisses * 0.02); // Cache miss cost
        
        // Track in Redis for real-time cost calculation
        $key = "cost:daily:" . date('Y-m-d');
        $this->redis->hincrby($key, $endpoint, (int)($cost * 100));
        $this->redis->expire($key, 86400 * 30); // Keep for 30 days
    }
    
    /**
     * Get daily cost estimate.
     */
    public function getDailyCostEstimate(): array
    {
        $key = "cost:daily:" . date('Y-m-d');
        $costs = $this->redis->hgetall($key);
        
        $total = 0;
        $byEndpoint = [];
        
        foreach ($costs as $endpoint => $costCents) {
            $costDollars = $costCents / 100;
            $byEndpoint[$endpoint] = $costDollars;
            $total += $costDollars;
        }
        
        return [
            'date' => date('Y-m-d'),
            'total_dollars' => round($total, 2),
            'by_endpoint' => $byEndpoint,
            'projected_monthly' => round($total * 30, 2)
        ];
    }
    
    /**
     * Get optimization recommendations.
     */
    public function getOptimizationRecommendations(): array
    {
        $costEstimate = $this->getDailyCostEstimate();
        $recommendations = [];
        
        foreach ($costEstimate['by_endpoint'] as $endpoint => $cost) {
            if ($cost > 5) { // Expensive endpoint
                $recommendations[] = "Optimize $endpoint (daily cost: \$$cost)";
            }
        }
        
        // Check cache efficiency
        $cacheStats = $this->redis->hgetall('cache:efficiency:daily');
        $hitRate = $cacheStats['hits'] / ($cacheStats['hits'] + $cacheStats['misses']) ?? 0;
        
        if ($hitRate < 0.70) {
            $recommendations[] = "Cache hit rate low ({$hitRate*100}%), consider longer TTLs";
        }
        
        return $recommendations;
    }
}
```

**Expected Impact:**
- Monthly cost reduction: 30-40%
- Database: 32GB → 16GB (-50% hardware cost)
- Workers: 50 → 25 FPM (-50% labor cost)
- API efficiency: 3x better throughput per unit cost
- Annual savings: $36,000-60,000

---

## Implementation Timeline

### Week 1: Frontend Bundle Optimization
- [ ] Enhance Vite config with aggressive code splitting
- [ ] Implement route lazy loading in App.jsx
- [ ] Add prefetch strategies for likely navigation
- [ ] Measure TTI improvement (target: 3-5s → 1-2s)

### Week 2: Image Optimization
- [ ] Create ImageOptimized component with WebP support
- [ ] Build image optimization pipeline (cwebp, ImageMagick)
- [ ] Deploy responsive images across site
- [ ] Measure LCP improvement (target: -400-600ms)

### Week 3: Search & Aggregation
- [ ] Add FULLTEXT indexes to matches table
- [ ] Create materialized views for search results
- [ ] Implement SearchRepository class
- [ ] Deploy FTS search API endpoint
- [ ] Set up materialized view sync (cron job)

### Week 4: Real-Time Updates
- [ ] Set up Ratchet WebSocket server
- [ ] Implement WebSocket client hook in React
- [ ] Integrate WebSocket into OddsDisplay component
- [ ] Test real-time update latency (<200ms)

### Week 5: Cost Optimization
- [ ] Deploy CostMonitor tracking
- [ ] Analyze cost per endpoint
- [ ] Right-size database instance
- [ ] Review and optimize worker pool
- [ ] Generate cost savings report

---

## Success Metrics (End of Phase 3)

### Frontend Performance
| Metric | Baseline | Target |
|--------|----------|--------|
| Initial bundle | 300KB | 85KB (-71%) |
| Time to Interactive | 3-5s | 1-2s (-60%) |
| Largest Contentful Paint | 2-3s | 800-1200ms (-50%) |
| Cumulative Layout Shift | 0.15 | <0.1 |
| First Input Delay | 100-200ms | <50ms |

### Search Performance
| Metric | Baseline | Target |
|--------|----------|--------|
| Match search latency | 500-2000ms | 20-100ms (-95%) |
| Search result accuracy | N/A | 98%+ (FTS relevance) |
| Materialized view sync lag | N/A | <5 minutes |
| Popular sports query | 2-5s | <100ms |

### Real-Time Performance
| Metric | Baseline | Target |
|--------|----------|--------|
| Odds update latency | 2-5s (polling) | <200ms (WebSocket) |
| Settlement notification lag | 3-10s | <500ms |
| API load reduction | N/A | 40-60% |
| Concurrent WebSocket connections | N/A | 20k+ stable |

### Cost Optimization
| Metric | Baseline | Target |
|--------|----------|--------|
| Database instance | 32GB | 16GB (-50%) |
| FPM worker count | 50 | 25 (-50%) |
| Monthly infrastructure cost | $10,000 | $6,000-7,000 (-30-40%) |
| API calls per user/day | 10-15 | 3-5 (-70%) |

---

## Risk Mitigation

### Frontend Bundle Size
- **Risk:** Lazy loading creates user-visible delay on route change
- **Mitigation:** Prefetch likely routes, show loading spinner, progressively load

### Full-Text Search
- **Risk:** Materialized view sync lag (5 min = stale data)
- **Mitigation:** Keep primary table as source of truth, fallback to LIKE on sync lag

### WebSocket Server
- **Risk:** Connection overhead for 20k+ concurrent users
- **Mitigation:** Use efficient binary protocol, implement connection pooling

### Cost Optimization
- **Risk:** Downsizing too aggressive causes performance regression
- **Mitigation:** Monitor metrics closely during rightsizing, scale back up if needed

---

## Continuation: Phase 4+ (After Phase 3 Validation)

**Phase 4A: Mobile App Optimization**
- Native iOS/Android apps with offline support
- Redux for state management
- Estimated additional 20k users

**Phase 4B: Advanced Analytics & Reporting**
- User behavior analytics (Segment/Mixpanel)
- Revenue attribution tracking
- Churn prediction models

**Phase 4C: Machine Learning**
- Odds prediction models (better line-setting)
- Fraud detection (unusual bet patterns)
- Personalized recommendations

---

## Document History
- **v1.0** - 2026-04-24: Initial Phase 3 plan (Frontend, Search, Real-time, Cost Optimization)
