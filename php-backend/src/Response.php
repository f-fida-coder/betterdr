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
        
        // Encode ONCE — this body feeds both the ETag hash and the echo below.
        // (It used to be encoded twice, which doubled CPU on the ~500KB board
        // payloads for nothing.)
        $body = json_encode($payload, JSON_UNESCAPED_SLASHES);

        // Conditional-GET support for revalidatable responses. Skipped when
        // the caller sends no-store — the browser never stores those bodies,
        // so it can never send If-None-Match back and the hash would be
        // wasted work.
        if ($status >= 200 && $status < 300 && $cacheControl !== '' && !str_contains($cacheControl, 'no-store')) {
            $etag = '"' . hash('crc32b', (string) $body) . '"';
            header('ETag: ' . $etag);

            // nginx's gzip filter downgrades our strong ETag to a weak one
            // (W/"...") on the wire, and that weak form is what the browser
            // echoes back — a strict === here would never match and 304s
            // would silently never fire. Compare with the W/ prefix (and any
            // comma-separated list) stripped.
            $inm = (string) ($_SERVER['HTTP_IF_NONE_MATCH'] ?? '');
            if ($inm !== '') {
                foreach (explode(',', $inm) as $candidate) {
                    $candidate = trim($candidate);
                    if (str_starts_with($candidate, 'W/')) {
                        $candidate = substr($candidate, 2);
                    }
                    if ($candidate === $etag) {
                        http_response_code(304);
                        return;
                    }
                }
            }
        }

        echo $body;
        // Error logging is handled by Logger via the shutdown function in
        // index.php. The duplicate file_put_contents here was a blocking
        // write on every 4xx/5xx and is no longer needed.
    }

    /**
     * Send a safe error JSON response that never leaks internal details
     * in production. In development mode (APP_ENV=development), the
     * exception message is included for debugging.
     */
    public static function serverError(string $userMessage = 'Server error', ?Throwable $e = null, int $status = 500): void
    {
        $payload = ['message' => $userMessage];
        if ($e !== null) {
            error_log("[{$status}] {$userMessage}: " . $e->getMessage());
            if (strtolower((string) Env::get('APP_ENV', 'production')) === 'development') {
                $payload['error'] = $e->getMessage();
            }
        }
        self::json($payload, $status);
    }
}
