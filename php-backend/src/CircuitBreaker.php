<?php

declare(strict_types=1);

/**
 * Request timeout and circuit breaker handler.
 * Prevents cascading failures when database/external services are slow or down.
 * 
 * Circuit breaker states:
 * - CLOSED: All requests pass through
 * - OPEN: Requests fail immediately after threshold exceeded
 * - HALF_OPEN: Limited requests allowed to test if service recovered
 */
final class CircuitBreaker
{
    private static ?self $instance = null;
    
    private const STATE_CLOSED = 'closed';
    private const STATE_OPEN = 'open';
    private const STATE_HALF_OPEN = 'half_open';
    
    private const FAILURE_THRESHOLD = 5;      // Failures before opening
    private const TIMEOUT_SECONDS = 30;       // How long circuit stays open
    private const HALF_OPEN_ATTEMPTS = 3;     // Requests to allow in HALF_OPEN state
    
    /** @var array<string, array{state: string, failures: int, last_failure: int, half_open_attempts: int}> */
    private array $circuits = [];
    
    private function __construct() {}

    public static function getInstance(): self
    {
        if (self::$instance === null) {
            self::$instance = new self();
        }
        return self::$instance;
    }

    /**
     * Execute a request with circuit breaker protection.
     * 
     * @template T
     * @param string $key Service identifier (e.g., 'database:matches')
     * @param callable(): T $callback Function to execute
     * @param int $timeoutMs Timeout in milliseconds
     * @return T Result from callback
     * @throws Exception If circuit is open or request times out
     */
    public function execute(string $key, callable $callback, int $timeoutMs = 5000): mixed
    {
        // Check circuit state
        $state = $this->getState($key);
        
        if ($state === self::STATE_OPEN) {
            throw new Exception('Circuit breaker OPEN for: ' . $key);
        }

        try {
            // Execute with timeout (approximate using usleep check)
            $start = microtime(true);
            $result = $callback();
            
            // Check if execution exceeded timeout
            $elapsed = (microtime(true) - $start) * 1000;
            if ($elapsed > $timeoutMs) {
                $this->recordFailure($key);
                throw new Exception('Request timeout after ' . (int)$elapsed . 'ms');
            }
            
            // Success - reset failures
            $this->recordSuccess($key);
            return $result;
        } catch (Throwable $e) {
            $this->recordFailure($key);
            
            // If we hit threshold, open the circuit
            if ($this->getFailureCount($key) >= self::FAILURE_THRESHOLD) {
                $this->openCircuit($key);
            }
            
            throw $e;
        }
    }

    /**
     * Get current state of circuit.
     */
    public function getState(string $key): string
    {
        $this->initCircuit($key);
        $circuit = &$this->circuits[$key];
        
        // Check if should transition from OPEN to HALF_OPEN
        if ($circuit['state'] === self::STATE_OPEN) {
            $timeSinceFailure = time() - $circuit['last_failure'];
            if ($timeSinceFailure >= self::TIMEOUT_SECONDS) {
                $circuit['state'] = self::STATE_HALF_OPEN;
                $circuit['half_open_attempts'] = 0;
            }
        }
        
        // Check if HALF_OPEN should close
        if ($circuit['state'] === self::STATE_HALF_OPEN && $circuit['failures'] === 0) {
            if ($circuit['half_open_attempts'] >= self::HALF_OPEN_ATTEMPTS) {
                $circuit['state'] = self::STATE_CLOSED;
                $circuit['failures'] = 0;
            }
        }
        
        return $circuit['state'];
    }

    /**
     * Record successful execution.
     */
    private function recordSuccess(string $key): void
    {
        $this->initCircuit($key);
        $circuit = &$this->circuits[$key];
        
        $circuit['failures'] = 0;
        
        if ($circuit['state'] === self::STATE_HALF_OPEN) {
            $circuit['half_open_attempts']++;
        }
    }

    /**
     * Record failed execution.
     */
    private function recordFailure(string $key): void
    {
        $this->initCircuit($key);
        $circuit = &$this->circuits[$key];
        
        $circuit['failures']++;
        $circuit['last_failure'] = time();
        
        if ($circuit['state'] === self::STATE_HALF_OPEN) {
            $circuit['state'] = self::STATE_OPEN;
        }
    }

    /**
     * Manually open circuit.
     */
    private function openCircuit(string $key): void
    {
        $this->initCircuit($key);
        $this->circuits[$key]['state'] = self::STATE_OPEN;
        $this->circuits[$key]['last_failure'] = time();
    }

    /**
     * Get failure count.
     */
    private function getFailureCount(string $key): int
    {
        $this->initCircuit($key);
        return $this->circuits[$key]['failures'];
    }

    /**
     * Initialize circuit if not exists.
     */
    private function initCircuit(string $key): void
    {
        if (!isset($this->circuits[$key])) {
            $this->circuits[$key] = [
                'state' => self::STATE_CLOSED,
                'failures' => 0,
                'last_failure' => 0,
                'half_open_attempts' => 0,
            ];
        }
    }

    /**
     * Get stats for all circuits.
     */
    public function stats(): array
    {
        $stats = [];
        foreach ($this->circuits as $key => $circuit) {
            $stats[$key] = [
                'state' => $circuit['state'],
                'failures' => $circuit['failures'],
                'last_failure' => $circuit['last_failure'],
            ];
        }
        return $stats;
    }

    /**
     * Reset all circuits.
     */
    public function reset(): void
    {
        $this->circuits = [];
    }
}
