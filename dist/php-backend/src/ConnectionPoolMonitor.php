<?php

declare(strict_types=1);

/**
 * Phase 2E: Database Connection Pool Monitoring
 * 
 * Tracks connection pool health and exposes metrics for alerting:
 *  - Active vs idle connections
 *  - Connection acquisition latency (p95)
 *  - Connection errors (rate of failures)
 *  - Overall pool health status
 * 
 * Enables detection of:
 *  - Pool exhaustion (active near max)
 *  - Slow acquisition (p95 > 100ms indicates contention)
 *  - Connection leaks (steady growth of active connections)
 */
final class ConnectionPoolMonitor
{
    private ConnectionPool $pool;
    private RuntimeMetrics $metrics;
    
    public function __construct(ConnectionPool $pool, RuntimeMetrics $metrics)
    {
        $this->pool = $pool;
        $this->metrics = $metrics;
    }
    
    /**
     * Get comprehensive pool health report.
     */
    public function getPoolHealth(): array
    {
        $activeCount = $this->pool->getActiveCount();
        $maxConnections = $this->pool->getMaxConnections();
        $utilization = $maxConnections > 0 ? ($activeCount / $maxConnections) : 0;
        
        return [
            'active_connections' => $activeCount,
            'idle_connections' => $this->pool->getIdleCount(),
            'max_connections' => $maxConnections,
            'utilization_percent' => round($utilization * 100, 1),
            'waiting_requests' => $this->pool->getWaitQueueSize(),
            'p95_acquire_time_ms' => $this->pool->getP95AcquireTimeMs(),
            'p99_acquire_time_ms' => $this->pool->getP99AcquireTimeMs(),
            'connection_errors_5m' => $this->getErrorCount('last_5m'),
            'connection_errors_total' => $this->getErrorCount('total'),
            'health_status' => $this->determineHealth($utilization),
            'health_score' => $this->calculateHealthScore($utilization, $activeCount),
            'recommendations' => $this->getRecommendations($utilization, $activeCount)
        ];
    }
    
    /**
     * Determine health status based on metrics.
     */
    private function determineHealth(float $utilization): string
    {
        if ($utilization > 0.95) {
            return 'critical'; // Pool nearly exhausted
        } elseif ($utilization > 0.80) {
            return 'warning'; // High utilization
        } elseif ($utilization > 0.50) {
            return 'healthy'; // Good utilization
        } else {
            return 'underutilized'; // Pool could be sized down
        }
    }
    
    /**
     * Calculate health score (0-100).
     */
    private function calculateHealthScore(float $utilization, int $activeCount): int
    {
        $score = 100;
        
        // Penalize high utilization
        if ($utilization > 0.9) {
            $score -= 30;
        } elseif ($utilization > 0.7) {
            $score -= 15;
        } elseif ($utilization > 0.5) {
            $score -= 5;
        }
        
        // Penalize if many connections active (possible leak)
        if ($activeCount > 40) {
            $score -= 10;
        }
        
        // Penalize recent errors
        $errors5m = $this->getErrorCount('last_5m');
        if ($errors5m > 5) {
            $score -= 20;
        } elseif ($errors5m > 0) {
            $score -= 5;
        }
        
        return max(0, min(100, $score));
    }
    
    /**
     * Get recommendations for pool tuning.
     */
    private function getRecommendations(float $utilization, int $activeCount): array
    {
        $recommendations = [];
        
        if ($utilization > 0.95) {
            $recommendations[] = "CRITICAL: Increase DB_POOL_MAX_CONNECTIONS (current {$activeCount} active)";
        } elseif ($utilization > 0.80) {
            $recommendations[] = "Monitor closely: utilization at " . round($utilization * 100, 1) . "%";
        }
        
        if ($activeCount > 40 && $utilization < 0.3) {
            $recommendations[] = "Possible connection leak: high active count but low utilization";
        }
        
        $errors = $this->getErrorCount('last_5m');
        if ($errors > 5) {
            $recommendations[] = "High connection errors in last 5min: $errors. Check database availability.";
        }
        
        if (empty($recommendations)) {
            $recommendations[] = "Pool health is good";
        }
        
        return $recommendations;
    }
    
    /**
     * Get connection error count from metrics.
     */
    private function getErrorCount(string $period): int
    {
        try {
            if ($period === 'last_5m') {
                $stats = $this->metrics->getWindowStats(300); // 5 minutes
            } else {
                $stats = $this->metrics->getTotalStats();
            }
            return (int)($stats['connection_errors'] ?? 0);
        } catch (Exception $e) {
            return 0;
        }
    }
}
