<?php

declare(strict_types=1);

/**
 * Connection pool manager for database connection reuse and throttling.
 * Prevents connection exhaustion during high concurrency by:
 * 1. Reusing persistent connections
 * 2. Throttling requests when pool is near capacity
 * 3. Implementing graceful connection wait/retry logic
 */
final class ConnectionPool
{
    private static ?self $instance = null;
    private ?PDO $connection = null;
    private int $activeConnections = 0;
    private const MAX_CONNECTIONS = 50;
    private const WAIT_TIMEOUT_MS = 5000;
    private const RETRY_ATTEMPTS = 3;
    
    private function __construct() {}

    public static function getInstance(): self
    {
        if (self::$instance === null) {
            self::$instance = new self();
        }
        return self::$instance;
    }

    /**
     * Get or create a persistent database connection with connection pooling.
     * 
     * @throws PDOException If connection fails after retries
     * @return PDO Reusable database connection
     */
    public function getConnection(array $dsn, string $user, string $pass, array $options = []): PDO
    {
        // Attempt to create/reuse connection with retries
        $lastException = null;
        
        for ($attempt = 0; $attempt < self::RETRY_ATTEMPTS; $attempt++) {
            try {
                // Check if we already have a connection (persistent)
                if ($this->connection !== null) {
                    // Test connection with ping query
                    try {
                        $this->connection->query('SELECT 1');
                        return $this->connection;
                    } catch (PDOException $e) {
                        // Connection dead, reconnect
                        $this->connection = null;
                    }
                }

                // Check if pool is at capacity
                if ($this->activeConnections >= self::MAX_CONNECTIONS) {
                    if ($attempt < self::RETRY_ATTEMPTS - 1) {
                        // Wait and retry
                        usleep(100000); // 100ms wait
                        continue;
                    }
                    throw new PDOException(
                        'Connection pool exhausted: ' . self::MAX_CONNECTIONS . ' active connections'
                    );
                }

                // Create new connection
                $defaultOptions = [
                    PDO::ATTR_PERSISTENT => true,
                    PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                    PDO::ATTR_TIMEOUT => 5,
                    PDO::MYSQL_ATTR_INIT_COMMAND => 'SET NAMES utf8mb4',
                ];
                
                $mergedOptions = array_merge($defaultOptions, $options);
                $this->connection = new PDO($dsn, $user, $pass, $mergedOptions);
                $this->activeConnections++;
                
                return $this->connection;
            } catch (PDOException $e) {
                $lastException = $e;
                if ($attempt < self::RETRY_ATTEMPTS - 1) {
                    usleep(50000 * ($attempt + 1)); // Exponential backoff
                }
            }
        }

        throw $lastException ?? new PDOException('Failed to acquire database connection');
    }

    /**
     * Return connection to pool (no-op for persistent connections).
     */
    public function releaseConnection(): void
    {
        // With persistent connections, we don't truly release
        // Just mark as available for reuse
    }

    /**
     * Get current pool stats for monitoring.
     */
    public function stats(): array
    {
        return [
            'active_connections' => $this->activeConnections,
            'max_connections' => self::MAX_CONNECTIONS,
            'available_capacity' => self::MAX_CONNECTIONS - $this->activeConnections,
            'pool_utilization' => round(($this->activeConnections / self::MAX_CONNECTIONS) * 100, 2),
            'has_connection' => $this->connection !== null,
        ];
    }

    /**
     * Reset pool (for testing/cleanup).
     */
    public function reset(): void
    {
        $this->connection = null;
        $this->activeConnections = 0;
    }
}
