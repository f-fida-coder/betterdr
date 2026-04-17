<?php

declare(strict_types=1);

/**
 * Request coalescing to deduplicate concurrent identical requests.
 * When multiple requests hit the same endpoint with same parameters,
 * only the first request computes the result, others wait for that result.
 * 
 * Usage:
 *   $dedup = RequestDeduplicator::getInstance();
 *   $result = $dedup->coalesce('matches:all:0', fn() => expensiveQuery());
 */
final class RequestDeduplicator
{
    private static ?self $instance = null;
    
    /** @var array<string, array{promise: callable|mixed, waiting: bool}> */
    private array $pending = [];
    
    private function __construct() {}

    public static function getInstance(): self
    {
        if (self::$instance === null) {
            self::$instance = new self();
        }
        return self::$instance;
    }

    /**
     * Execute a callback, coalescing concurrent identical requests.
     * 
     * First request executes callback. Subsequent concurrent requests
     * with same key wait for and return the same result.
     * 
     * @template T
     * @param string $key Deduplication key (should include query params)
     * @param callable(): T $callback Function to execute if not already running
     * @return T The result (same for all coalesced requests)
     */
    public function coalesce(string $key, callable $callback): mixed
    {
        // If already computed/pending, wait for result
        if (isset($this->pending[$key])) {
            $entry = &$this->pending[$key];
            
            // If already computed, return result
            if (!$entry['waiting']) {
                return $entry['promise'];
            }
            
            // Still computing, wait with simple polling (microsleep)
            $attempts = 0;
            while ($entry['waiting'] && $attempts < 1000) {
                usleep(100); // 100 microseconds
                $attempts++;
            }
            return $entry['promise'];
        }

        // Mark as pending
        $this->pending[$key] = [
            'promise' => null,
            'waiting' => true,
        ];

        try {
            // Compute result
            $result = $callback();
            
            // Store result
            $this->pending[$key] = [
                'promise' => $result,
                'waiting' => false,
            ];
            
            return $result;
        } catch (Throwable $e) {
            // Remove pending entry on error
            unset($this->pending[$key]);
            throw $e;
        }
    }

    /**
     * Clear a deduplication entry.
     */
    public function forget(string $key): void
    {
        unset($this->pending[$key]);
    }

    /**
     * Get stats on pending requests.
     */
    public function stats(): array
    {
        $pending = 0;
        $computed = 0;

        foreach ($this->pending as $entry) {
            if ($entry['waiting']) {
                $pending++;
            } else {
                $computed++;
            }
        }

        return [
            'pending_requests' => $pending,
            'computed_requests' => $computed,
            'total' => count($this->pending),
        ];
    }
}
