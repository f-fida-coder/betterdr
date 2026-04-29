<?php

declare(strict_types=1);

final class Response
{
    /**
     * Send a JSON response with optional cache headers.
     * 
     * @param array $payload Response data
     * @param int $status HTTP status code
     * @param string $cacheControl Cache-Control header value (e.g., 'public, max-age=300')
     */
    public static function json(array $payload, int $status = 200, string $cacheControl = ''): void
    {
        http_response_code($status);
        header('Content-Type: application/json');
        
        // Add cache headers for successful responses
        if ($status >= 200 && $status < 300) {
            if ($cacheControl !== '') {
                header('Cache-Control: ' . $cacheControl);
            } else {
                // Default: no cache for authenticated endpoints
                header('Cache-Control: private, no-cache, no-store, must-revalidate');
            }
        } else {
            // Never cache error responses
            header('Cache-Control: no-cache, no-store, must-revalidate');
        }
        
        // Add ETag for cacheable responses
        if ($status >= 200 && $status < 300 && $cacheControl !== '') {
            $etag = '"' . hash('crc32b', json_encode($payload, JSON_UNESCAPED_SLASHES)) . '"';
            header('ETag: ' . $etag);
            
            // If client sends If-None-Match, check if ETag matches
            if (isset($_SERVER['HTTP_IF_NONE_MATCH']) && $_SERVER['HTTP_IF_NONE_MATCH'] === $etag) {
                http_response_code(304);
                return;
            }
        }
        
        echo json_encode($payload, JSON_UNESCAPED_SLASHES);
        
        // Log errors for debugging if status is 500 or 4xx
        if ($status >= 400) {
            $logFile = __DIR__ . '/../logs/api-errors.log';
            $logDir = dirname($logFile);
            if (!is_dir($logDir)) {
                @mkdir($logDir, 0775, true);
            }
            $logMsg = date('Y-m-d H:i:s') . " [{$status}] " . json_encode($payload) . "\n";
            @file_put_contents($logFile, $logMsg, FILE_APPEND);
        }
    }
}
