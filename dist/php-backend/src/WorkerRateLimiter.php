<?php

declare(strict_types=1);

/**
 * Phase 2C: Worker Rate Limiter
 * 
 * Prevents background workers (odds sync, settlement, etc.) from consuming
 * 100% CPU/DB during load spikes, which would starve API requests.
 * 
 * Uses Redis-backed sliding window counter for distributed rate limiting.
 * If Redis unavailable, falls back to in-process rate limiting.
 * 
 * Benefits:
 *  - API requests maintain p95 < 500ms even during sync storms
 *  - Workers are predictable and scheduled, not chaotic
 *  - Easy to tune per environment (dev/staging/prod)
 */
final class WorkerRateLimiter
{
    private $redis;
    private string $key;
    private int $maxCallsPerWindow;
    private int $windowSeconds;
    private array $inProcessCounter = [];
    private bool $useRedis;
    
    /**
     * @param mixed $redis Redis instance (null if not available)
     * @param string $key Rate limiter key (e.g., "odds_sync_rate", "settlement_worker_rate")
     * @param int $maxCalls Maximum calls allowed per window
     * @param int $window Window in seconds
     */
    public function __construct($redis, string $key, int $maxCalls, int $window)
    {
        $this->redis = $redis;
        $this->key = $key;
        $this->maxCallsPerWindow = max(1, $maxCalls);
        $this->windowSeconds = max(1, $window);
        $this->useRedis = $redis !== null;
    }
    
    /**
     * Check if a call is allowed under rate limit. Safe to call repeatedly.
     * 
     * @return bool true if call is allowed, false if rate limit exceeded
     */
    public function allow(): bool
    {
        if ($this->useRedis) {
            return $this->checkRedis();
        } else {
            return $this->checkInProcess();
        }
    }
    
    /**
     * Redis-based sliding window counter.
     */
    private function checkRedis(): bool
    {
        try {
            $now = time();
            $windowStart = $now - $this->windowSeconds;
            
            // Clean old entries outside the window
            $this->redis->zremrangebyscore($this->key, 0, $windowStart);
            
            // Count requests in current window
            $count = (int)$this->redis->zcard($this->key);
            
            if ($count < $this->maxCallsPerWindow) {
                // Record this call
                $this->redis->zadd($this->key, $now, uniqid('call_', true));
                // Set key to expire after window + 60s buffer
                $this->redis->expire($this->key, $this->windowSeconds + 60);
                return true;
            }
            
            return false;
        } catch (Exception $e) {
            error_log("WorkerRateLimiter Redis error, falling back to in-process: " . $e->getMessage());
            $this->useRedis = false;
            return $this->checkInProcess();
        }
    }
    
    /**
     * In-process rate limiting (no Redis). Resets on PHP process restart.
     */
    private function checkInProcess(): bool
    {
        $now = time();
        $windowStart = $now - $this->windowSeconds;
        
        // Initialize counter for this key if needed
        if (!isset($this->inProcessCounter[$this->key])) {
            $this->inProcessCounter[$this->key] = [];
        }
        
        // Remove old entries outside window
        $this->inProcessCounter[$this->key] = array_filter(
            $this->inProcessCounter[$this->key],
            fn($timestamp) => $timestamp > $windowStart
        );
        
        // Check if we can make another call
        if (count($this->inProcessCounter[$this->key]) < $this->maxCallsPerWindow) {
            $this->inProcessCounter[$this->key][] = $now;
            return true;
        }
        
        return false;
    }
    
    /**
     * Get current rate limiter status (for monitoring).
     */
    public function getStatus(): array
    {
        $now = time();
        $windowStart = $now - $this->windowSeconds;
        
        if ($this->useRedis) {
            try {
                $count = (int)$this->redis->zcard($this->key);
                $oldest = $this->redis->zrange($this->key, 0, 0, ['withscores' => true]);
                $oldestTime = !empty($oldest) ? (int)$oldest[0][1] : null;
                
                return [
                    'backend' => 'redis',
                    'current_count' => $count,
                    'max_allowed' => $this->maxCallsPerWindow,
                    'window_seconds' => $this->windowSeconds,
                    'utilization_percent' => $this->maxCallsPerWindow > 0 ? round(($count / $this->maxCallsPerWindow) * 100, 1) : 0,
                    'oldest_call_age_seconds' => $oldestTime ? ($now - $oldestTime) : null
                ];
            } catch (Exception $e) {
                error_log("Error getting Redis rate limiter status: " . $e->getMessage());
            }
        }
        
        // Fall back to in-process stats
        $count = isset($this->inProcessCounter[$this->key]) ? 
                 count($this->inProcessCounter[$this->key]) : 0;
        
        return [
            'backend' => 'in-process',
            'current_count' => $count,
            'max_allowed' => $this->maxCallsPerWindow,
            'window_seconds' => $this->windowSeconds,
            'utilization_percent' => $this->maxCallsPerWindow > 0 ? round(($count / $this->maxCallsPerWindow) * 100, 1) : 0,
            'oldest_call_age_seconds' => null
        ];
    }
}
