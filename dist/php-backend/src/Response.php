<?php

declare(strict_types=1);

final class Response
{
    public static function json(array $payload, int $status = 200): void
    {
        http_response_code($status);
        header('Content-Type: application/json');
        echo json_encode($payload, JSON_UNESCAPED_SLASHES);
        // Log errors for debugging if status is 500 or 4xx
        if ($status >= 400) {
            $logFile = __DIR__ . '/../logs/api-errors.log';
            $logMsg = date('Y-m-d H:i:s') . " [{$status}] " . json_encode($payload) . "\n";
            @file_put_contents($logFile, $logMsg, FILE_APPEND);
        }
    }
}
