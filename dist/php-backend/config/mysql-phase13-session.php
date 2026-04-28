<?php
/**
 * Phase 13: Session-Level MySQL Optimization (For Shared Hosting)
 * Works around SUPER privilege limitations using per-connection settings
 */

return [
    'session_init_commands' => [
        // Session-level optimizations (don't require SUPER privilege)
        
        // Optimize query execution
        "SET SESSION sql_mode = 'STRICT_TRANS_TABLES,NO_ZERO_DATE,NO_ZERO_IN_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION'",
        
        // Increase query timeout for long-running operations
        "SET SESSION max_execution_time = 30000",        // 30 seconds for SELECT
        "SET SESSION net_read_timeout = 120",            // 2 minutes for reading
        "SET SESSION net_write_timeout = 120",           // 2 minutes for writing
        
        // Use prepared statement caching
        "SET SESSION query_cache_wlock_invalidate = OFF",
        
        // Enable optimization hints
        "SET SESSION optimizer_switch = 'index_merge=on,index_merge_union=on,index_merge_sort_union=on,index_merge_intersection=on'",
    ],
    
    'connection_pool_config' => [
        'max_connections' => 100,              // PHP pool limit (Phase 13)
        'persistent' => true,                  // Use persistent connections
        'retry_attempts' => 3,                 // Retry on connection failure
        'wait_timeout_ms' => 5000,            // 5 second timeout
    ],
    
    'query_optimization_tips' => [
        'use_indexes' => true,
        'batch_queries' => true,
        'use_connection_pool' => true,
        'cache_query_results' => true,          // Implemented in Phase 10
        'deduplicate_requests' => true,         // Implemented in Phase 11
    ],
];
?>
