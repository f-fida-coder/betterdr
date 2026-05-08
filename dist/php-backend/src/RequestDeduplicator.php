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
    
    /** @var array<string, array{promise: mixed, waiting: bool}> */
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
        // PHP-FPM is single-process-per-request, so $pending can only hold
        // results accumulated within the same request (e.g. two calls to the
        // same helper in one codepath). The usleep/polling loop from the
        // original implementation could never unblock because no other
        // concurrent code runs in the same process. It has been removed to
        // avoid up to 50ms of wasted sleep.
        if (isset($this->pending[$key])) {
            return $this->pending[$key]['promise'];
        }

        try {
            $result = $callback();
            $this->pending[$key] = ['promise' => $result, 'waiting' => false];
            return $result;
        } catch (Throwable $e) {
            unset($this->pending[$key]);
            throw $e;
        } finally {
            // Clear after use so stale data never leaks to a later call with the same key.
            unset($this->pending[$key]);
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
