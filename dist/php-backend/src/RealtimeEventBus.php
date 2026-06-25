<?php

declare(strict_types=1);

final class RealtimeEventBus
{
    private const DEFAULT_MAX_LOG_BYTES = 5242880; // 5 MB

    public static function eventLogPath(): string
    {
        $custom = trim((string) Env::get('WS_EVENT_LOG_PATH', ''));
        if ($custom !== '') {
            return $custom;
        }

        return dirname(__DIR__) . '/cache/ws-events.log';
    }

    /**
     * @param array<string,mixed> $payload
     */
    public static function publish(string $channel, array $payload): bool
    {
        $channel = trim($channel);
        if ($channel === '') {
            return false;
        }

        $path = self::eventLogPath();
        $dir = dirname($path);
        if (!is_dir($dir) && !@mkdir($dir, 0775, true) && !is_dir($dir)) {
            return false;
        }

        self::rotateIfNeeded($path);

        $line = json_encode([
            'channel' => $channel,
            'payload' => $payload,
            'timestamp' => gmdate(DATE_ATOM),
        ], JSON_UNESCAPED_SLASHES);

        if (!is_string($line) || $line === '') {
            return false;
        }

        // Use non-blocking exclusive lock so a slow/busy writer never stalls
        // a bet-placement or live-sync request. If the log file is locked by
        // another FPM worker, we skip this event — the WebSocket tail reader
        // tolerates occasional gaps without breaking clients.
        $handle = @fopen($path, 'a');
        if ($handle === false) {
            return false;
        }
        if (!@flock($handle, LOCK_EX | LOCK_NB)) {
            @fclose($handle);
            return false; // Another worker is writing; skip rather than block.
        }
        $written = @fwrite($handle, $line . "\n");
        @flock($handle, LOCK_UN);
        @fclose($handle);
        return $written !== false;
    }

    private static function rotateIfNeeded(string $path): void
    {
        if (!is_file($path)) {
            return;
        }

        $maxBytes = max(262144, (int) Env::get('WS_EVENT_LOG_MAX_BYTES', (string) self::DEFAULT_MAX_LOG_BYTES));
        $size = @filesize($path);
        if (!is_int($size) || $size < $maxBytes) {
            return;
        }

        $archivePath = $path . '.1';
        @unlink($archivePath);
        @rename($path, $archivePath);
    }
}
