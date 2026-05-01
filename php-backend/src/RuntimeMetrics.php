<?php

declare(strict_types=1);

final class RuntimeMetrics
{
    private const MAX_ENDPOINTS = 200;
    private const MAX_MINUTES = 180;

    /** @var array<int, int> */
    private const HISTOGRAM_BOUNDS_MS = [50, 100, 200, 400, 800, 1200, 2000, 3000, 5000];

    public static function recordRequest(string $method, string $path, int $status, float $durationSec): void
    {
        $durationMs = max(0, (int) round($durationSec * 1000));
        $now = time();
        $minute = (int) (floor($now / 60) * 60);
        $bucket = self::histogramBucket($durationMs);
        $normalizedPath = self::normalizePath($path);

        self::withStore(static function (array $state) use ($method, $status, $durationMs, $minute, $bucket, $normalizedPath, $now): array {
            $state['updatedAt'] = gmdate(DATE_ATOM, $now);
            $state['totals']['requests'] = (int) ($state['totals']['requests'] ?? 0) + 1;
            $state['totals']['durationMs'] = (int) ($state['totals']['durationMs'] ?? 0) + $durationMs;
            $state['totals']['maxDurationMs'] = max((int) ($state['totals']['maxDurationMs'] ?? 0), $durationMs);
            $state['totals']['minDurationMs'] = self::minDuration((int) ($state['totals']['minDurationMs'] ?? 0), $durationMs);
            if ($status >= 500) {
                $state['totals']['errors5xx'] = (int) ($state['totals']['errors5xx'] ?? 0) + 1;
            } elseif ($status >= 400) {
                $state['totals']['errors4xx'] = (int) ($state['totals']['errors4xx'] ?? 0) + 1;
            }
            $state['totals']['histogram'][$bucket] = (int) ($state['totals']['histogram'][$bucket] ?? 0) + 1;

            $windowKey = (string) $minute;
            if (!isset($state['windows'][$windowKey]) || !is_array($state['windows'][$windowKey])) {
                $state['windows'][$windowKey] = self::newWindowBucket();
            }
            $state['windows'][$windowKey]['requests'] = (int) ($state['windows'][$windowKey]['requests'] ?? 0) + 1;
            $state['windows'][$windowKey]['durationMs'] = (int) ($state['windows'][$windowKey]['durationMs'] ?? 0) + $durationMs;
            if ($status >= 500) {
                $state['windows'][$windowKey]['errors5xx'] = (int) ($state['windows'][$windowKey]['errors5xx'] ?? 0) + 1;
            } elseif ($status >= 400) {
                $state['windows'][$windowKey]['errors4xx'] = (int) ($state['windows'][$windowKey]['errors4xx'] ?? 0) + 1;
            }
            $state['windows'][$windowKey]['histogram'][$bucket] = (int) ($state['windows'][$windowKey]['histogram'][$bucket] ?? 0) + 1;

            $endpointKey = strtoupper($method) . ' ' . $normalizedPath;
            if (!isset($state['endpoints'][$endpointKey]) || !is_array($state['endpoints'][$endpointKey])) {
                $state['endpoints'][$endpointKey] = [
                    'requests' => 0,
                    'errors4xx' => 0,
                    'errors5xx' => 0,
                    'durationMs' => 0,
                    'maxDurationMs' => 0,
                    'histogram' => [],
                    'lastSeenAt' => gmdate(DATE_ATOM, $now),
                ];
            }
            $state['endpoints'][$endpointKey]['requests'] = (int) ($state['endpoints'][$endpointKey]['requests'] ?? 0) + 1;
            $state['endpoints'][$endpointKey]['durationMs'] = (int) ($state['endpoints'][$endpointKey]['durationMs'] ?? 0) + $durationMs;
            $state['endpoints'][$endpointKey]['maxDurationMs'] = max((int) ($state['endpoints'][$endpointKey]['maxDurationMs'] ?? 0), $durationMs);
            $state['endpoints'][$endpointKey]['histogram'][$bucket] = (int) ($state['endpoints'][$endpointKey]['histogram'][$bucket] ?? 0) + 1;
            if ($status >= 500) {
                $state['endpoints'][$endpointKey]['errors5xx'] = (int) ($state['endpoints'][$endpointKey]['errors5xx'] ?? 0) + 1;
            } elseif ($status >= 400) {
                $state['endpoints'][$endpointKey]['errors4xx'] = (int) ($state['endpoints'][$endpointKey]['errors4xx'] ?? 0) + 1;
            }
            $state['endpoints'][$endpointKey]['lastSeenAt'] = gmdate(DATE_ATOM, $now);

            $state['windows'] = self::trimWindows($state['windows'], $now);
            $state['endpoints'] = self::trimEndpoints($state['endpoints']);

            return $state;
        });
    }

    /**
     * @return array<string, mixed>
     */
    public static function snapshot(): array
    {
        $state = self::readStore();
        $now = time();

        $totalRequests = max(1, (int) ($state['totals']['requests'] ?? 0));
        $totalDuration = (int) ($state['totals']['durationMs'] ?? 0);
        $totalAvg = (float) ($totalDuration / $totalRequests);
        $totalP95 = self::percentileFromHistogram($state['totals']['histogram'] ?? [], 95);

        $last5 = self::windowAggregate($state['windows'] ?? [], $now, 5);
        $last15 = self::windowAggregate($state['windows'] ?? [], $now, 15);

        return [
            'startedAt' => $state['startedAt'] ?? gmdate(DATE_ATOM),
            'updatedAt' => $state['updatedAt'] ?? gmdate(DATE_ATOM),
            'totals' => [
                'requests' => (int) ($state['totals']['requests'] ?? 0),
                'errors4xx' => (int) ($state['totals']['errors4xx'] ?? 0),
                'errors5xx' => (int) ($state['totals']['errors5xx'] ?? 0),
                'error5xxRatePercent' => self::ratePercent((int) ($state['totals']['errors5xx'] ?? 0), (int) ($state['totals']['requests'] ?? 0)),
                'avgDurationMs' => round($totalAvg, 2),
                'p95DurationMs' => $totalP95,
                'maxDurationMs' => (int) ($state['totals']['maxDurationMs'] ?? 0),
                'minDurationMs' => (int) ($state['totals']['minDurationMs'] ?? 0),
            ],
            'last5m' => $last5,
            'last15m' => $last15,
            'topEndpoints' => self::topEndpoints($state['endpoints'] ?? []),
            'matchesPayloadModes' => [
                'core' => self::routeSummary($state['endpoints'] ?? [], 'GET /api/matches;payload=core'),
                'full' => self::routeSummary($state['endpoints'] ?? [], 'GET /api/matches;payload=full'),
            ],
            'histogramBoundsMs' => self::HISTOGRAM_BOUNDS_MS,
        ];
    }

    /**
     * @return array<string, mixed>
     */
    private static function initialState(): array
    {
        return [
            'startedAt' => gmdate(DATE_ATOM),
            'updatedAt' => gmdate(DATE_ATOM),
            'totals' => [
                'requests' => 0,
                'errors4xx' => 0,
                'errors5xx' => 0,
                'durationMs' => 0,
                'minDurationMs' => 0,
                'maxDurationMs' => 0,
                'histogram' => [],
            ],
            'windows' => [],
            'endpoints' => [],
        ];
    }

    /**
     * @param callable(array<string, mixed>): array<string, mixed> $mutator
     */
    private static function withStore(callable $mutator): void
    {
        $file = self::storeFile();
        $dir = dirname($file);
        if (!is_dir($dir)) {
            @mkdir($dir, 0775, true);
        }

        $handle = @fopen($file, 'c+');
        if ($handle === false) {
            return;
        }

        try {
            // LOCK_NB: non-blocking — if another worker holds the lock, skip
            // this write rather than stalling the HTTP request. Under high
            // concurrency (20k+ users) a blocking lock here would queue every
            // single request behind one file write. Losing a few metric
            // samples is acceptable; adding 50-200ms latency to every request
            // is not.
            if (!@flock($handle, LOCK_EX | LOCK_NB)) {
                return;
            }

            $raw = stream_get_contents($handle);
            $decoded = is_string($raw) && $raw !== '' ? json_decode($raw, true) : null;
            $state = is_array($decoded) ? $decoded : self::initialState();
            $next = $mutator($state);

            $encoded = json_encode($next, JSON_UNESCAPED_SLASHES);
            if (!is_string($encoded)) {
                return;
            }
            ftruncate($handle, 0);
            rewind($handle);
            fwrite($handle, $encoded);
        } finally {
            @flock($handle, LOCK_UN);
            @fclose($handle);
        }
    }

    /**
     * @return array<string, mixed>
     */
    private static function readStore(): array
    {
        $file = self::storeFile();
        if (!is_file($file)) {
            return self::initialState();
        }

        $raw = @file_get_contents($file);
        if (!is_string($raw) || $raw === '') {
            return self::initialState();
        }

        $decoded = json_decode($raw, true);
        return is_array($decoded) ? $decoded : self::initialState();
    }

    private static function storeFile(): string
    {
        return dirname(__DIR__) . '/cache/runtime-metrics.json';
    }

    private static function histogramBucket(int $durationMs): string
    {
        foreach (self::HISTOGRAM_BOUNDS_MS as $bound) {
            if ($durationMs <= $bound) {
                return '<=' . $bound;
            }
        }
        return '>5000';
    }

    /**
     * @param array<string, int> $histogram
     */
    private static function percentileFromHistogram(array $histogram, int $percentile): int
    {
        $total = 0;
        foreach ($histogram as $count) {
            $total += (int) $count;
        }
        if ($total <= 0) {
            return 0;
        }

        $target = (int) ceil(($percentile / 100) * $total);
        $running = 0;
        foreach (self::HISTOGRAM_BOUNDS_MS as $bound) {
            $bucketKey = '<=' . $bound;
            $running += (int) ($histogram[$bucketKey] ?? 0);
            if ($running >= $target) {
                return $bound;
            }
        }

        return 5000;
    }

    /**
     * @param array<string, mixed> $windows
     * @return array<string, mixed>
     */
    private static function windowAggregate(array $windows, int $now, int $minutes): array
    {
        $thresholdMinute = (int) (floor(($now - ($minutes * 60)) / 60) * 60);
        $requests = 0;
        $errors4xx = 0;
        $errors5xx = 0;
        $durationMs = 0;
        $histogram = [];

        foreach ($windows as $minuteKey => $bucket) {
            $minute = (int) $minuteKey;
            if ($minute < $thresholdMinute || !is_array($bucket)) {
                continue;
            }
            $requests += (int) ($bucket['requests'] ?? 0);
            $errors4xx += (int) ($bucket['errors4xx'] ?? 0);
            $errors5xx += (int) ($bucket['errors5xx'] ?? 0);
            $durationMs += (int) ($bucket['durationMs'] ?? 0);
            if (is_array($bucket['histogram'] ?? null)) {
                foreach ($bucket['histogram'] as $k => $v) {
                    $histogram[(string) $k] = (int) ($histogram[(string) $k] ?? 0) + (int) $v;
                }
            }
        }

        $avg = $requests > 0 ? ($durationMs / $requests) : 0.0;

        return [
            'requests' => $requests,
            'errors4xx' => $errors4xx,
            'errors5xx' => $errors5xx,
            'error5xxRatePercent' => self::ratePercent($errors5xx, $requests),
            'avgDurationMs' => round($avg, 2),
            'p95DurationMs' => self::percentileFromHistogram($histogram, 95),
        ];
    }

    private static function ratePercent(int $errors, int $total): float
    {
        if ($total <= 0) {
            return 0.0;
        }
        return round(($errors / $total) * 100, 2);
    }

    /**
     * @param array<string, mixed> $windows
     * @return array<string, mixed>
     */
    private static function trimWindows(array $windows, int $now): array
    {
        $minMinute = (int) (floor(($now - (self::MAX_MINUTES * 60)) / 60) * 60);
        foreach ($windows as $minuteKey => $bucket) {
            if ((int) $minuteKey < $minMinute) {
                unset($windows[$minuteKey]);
            }
        }
        return $windows;
    }

    /**
     * @param array<string, mixed> $endpoints
     * @return array<string, mixed>
     */
    private static function trimEndpoints(array $endpoints): array
    {
        if (count($endpoints) <= self::MAX_ENDPOINTS) {
            return $endpoints;
        }

        uasort($endpoints, static function (array $a, array $b): int {
            return strcmp((string) ($a['lastSeenAt'] ?? ''), (string) ($b['lastSeenAt'] ?? ''));
        });

        $toDrop = count($endpoints) - self::MAX_ENDPOINTS;
        $i = 0;
        foreach ($endpoints as $key => $_item) {
            if ($i >= $toDrop) {
                break;
            }
            unset($endpoints[$key]);
            $i++;
        }

        return $endpoints;
    }

    /**
     * @param array<string, mixed> $endpoints
     * @return array<int, array<string, mixed>>
     */
    private static function topEndpoints(array $endpoints): array
    {
        $rows = [];
        foreach ($endpoints as $route => $stats) {
            if (!is_array($stats)) {
                continue;
            }
            $requests = (int) ($stats['requests'] ?? 0);
            $avg = $requests > 0 ? ((int) ($stats['durationMs'] ?? 0) / $requests) : 0.0;
            $rows[] = [
                'route' => (string) $route,
                'requests' => $requests,
                'errors4xx' => (int) ($stats['errors4xx'] ?? 0),
                'errors5xx' => (int) ($stats['errors5xx'] ?? 0),
                'avgDurationMs' => round($avg, 2),
                'p95DurationMs' => self::percentileFromHistogram(is_array($stats['histogram'] ?? null) ? $stats['histogram'] : [], 95),
                'maxDurationMs' => (int) ($stats['maxDurationMs'] ?? 0),
                'lastSeenAt' => (string) ($stats['lastSeenAt'] ?? ''),
            ];
        }

        usort($rows, static fn(array $a, array $b): int => ($b['requests'] <=> $a['requests']));
        return array_slice($rows, 0, 20);
    }

    /**
     * @param array<string, mixed> $endpoints
     * @return array<string, mixed>
     */
    private static function routeSummary(array $endpoints, string $route): array
    {
        $stats = $endpoints[$route] ?? null;
        if (!is_array($stats)) {
            return [
                'route' => $route,
                'requests' => 0,
                'errors4xx' => 0,
                'errors5xx' => 0,
                'avgDurationMs' => 0,
                'p95DurationMs' => 0,
                'maxDurationMs' => 0,
                'lastSeenAt' => null,
            ];
        }

        $requests = (int) ($stats['requests'] ?? 0);
        $avg = $requests > 0 ? ((int) ($stats['durationMs'] ?? 0) / $requests) : 0.0;

        return [
            'route' => $route,
            'requests' => $requests,
            'errors4xx' => (int) ($stats['errors4xx'] ?? 0),
            'errors5xx' => (int) ($stats['errors5xx'] ?? 0),
            'avgDurationMs' => round($avg, 2),
            'p95DurationMs' => self::percentileFromHistogram(is_array($stats['histogram'] ?? null) ? $stats['histogram'] : [], 95),
            'maxDurationMs' => (int) ($stats['maxDurationMs'] ?? 0),
            'lastSeenAt' => (string) ($stats['lastSeenAt'] ?? ''),
        ];
    }

    /**
     * @return array<string, mixed>
     */
    private static function newWindowBucket(): array
    {
        return [
            'requests' => 0,
            'errors4xx' => 0,
            'errors5xx' => 0,
            'durationMs' => 0,
            'histogram' => [],
        ];
    }

    private static function normalizePath(string $path): string
    {
        $normalized = preg_replace('/[A-Fa-f0-9]{24}/', ':id', $path) ?? $path;
        $normalized = preg_replace('/\b\d+\b/', ':n', $normalized) ?? $normalized;
        return $normalized;
    }

    private static function minDuration(int $current, int $candidate): int
    {
        if ($current <= 0) {
            return $candidate;
        }
        return min($current, $candidate);
    }
}
