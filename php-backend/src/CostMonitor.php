<?php

declare(strict_types=1);

final class CostMonitor
{
    private const MAX_DAYS = 35;

    /**
     * @param array<string,mixed> $meta
     */
    public static function recordRequest(string $method, string $path, int $status, float $durationSec, array $meta = []): void
    {
        $day = gmdate('Y-m-d');
        $endpointKey = strtoupper($method) . ' ' . self::normalizePath($path);
        $durationMs = max(0, (int) round($durationSec * 1000));

        $dbQueries = max(0, (int) ($meta['dbQueries'] ?? 0));
        $cacheHit = (bool) ($meta['cacheHit'] ?? false);
        $cacheMiss = (bool) ($meta['cacheMiss'] ?? false);

        $baseUnits = (float) Env::get('COST_BASE_REQUEST_UNITS', '1.0');
        $dbUnits = (float) Env::get('COST_DB_QUERY_UNITS', '0.5');
        $cacheMissUnits = (float) Env::get('COST_CACHE_MISS_UNITS', '0.35');
        $cacheHitSavingsUnits = (float) Env::get('COST_CACHE_HIT_SAVINGS_UNITS', '0.12');
        $durationMsPerUnit = max(50.0, (float) Env::get('COST_DURATION_MS_PER_UNIT', '250'));
        $unitDollars = max(0.0, (float) Env::get('COST_UNIT_DOLLARS', '0.00025'));

        $durationUnits = $durationMs / $durationMsPerUnit;
        $totalUnits = $baseUnits + ($dbQueries * $dbUnits) + $durationUnits;
        if ($cacheMiss) {
            $totalUnits += $cacheMissUnits;
        }
        if ($cacheHit) {
            $totalUnits = max(0.0, $totalUnits - $cacheHitSavingsUnits);
        }
        $costDollars = $totalUnits * $unitDollars;

        self::withStore(static function (array $state) use ($day, $endpointKey, $durationMs, $status, $costDollars, $totalUnits): array {
            if (!isset($state['days'][$day]) || !is_array($state['days'][$day])) {
                $state['days'][$day] = [
                    'requests' => 0,
                    'errors4xx' => 0,
                    'errors5xx' => 0,
                    'durationMs' => 0,
                    'costDollars' => 0.0,
                    'costUnits' => 0.0,
                    'endpoints' => [],
                ];
            }

            if (!isset($state['days'][$day]['endpoints'][$endpointKey]) || !is_array($state['days'][$day]['endpoints'][$endpointKey])) {
                $state['days'][$day]['endpoints'][$endpointKey] = [
                    'requests' => 0,
                    'errors4xx' => 0,
                    'errors5xx' => 0,
                    'durationMs' => 0,
                    'costDollars' => 0.0,
                    'costUnits' => 0.0,
                ];
            }

            $state['days'][$day]['requests'] = (int) ($state['days'][$day]['requests'] ?? 0) + 1;
            $state['days'][$day]['durationMs'] = (int) ($state['days'][$day]['durationMs'] ?? 0) + $durationMs;
            $state['days'][$day]['costDollars'] = (float) ($state['days'][$day]['costDollars'] ?? 0.0) + $costDollars;
            $state['days'][$day]['costUnits'] = (float) ($state['days'][$day]['costUnits'] ?? 0.0) + $totalUnits;

            $state['days'][$day]['endpoints'][$endpointKey]['requests'] = (int) ($state['days'][$day]['endpoints'][$endpointKey]['requests'] ?? 0) + 1;
            $state['days'][$day]['endpoints'][$endpointKey]['durationMs'] = (int) ($state['days'][$day]['endpoints'][$endpointKey]['durationMs'] ?? 0) + $durationMs;
            $state['days'][$day]['endpoints'][$endpointKey]['costDollars'] = (float) ($state['days'][$day]['endpoints'][$endpointKey]['costDollars'] ?? 0.0) + $costDollars;
            $state['days'][$day]['endpoints'][$endpointKey]['costUnits'] = (float) ($state['days'][$day]['endpoints'][$endpointKey]['costUnits'] ?? 0.0) + $totalUnits;

            if ($status >= 500) {
                $state['days'][$day]['errors5xx'] = (int) ($state['days'][$day]['errors5xx'] ?? 0) + 1;
                $state['days'][$day]['endpoints'][$endpointKey]['errors5xx'] = (int) ($state['days'][$day]['endpoints'][$endpointKey]['errors5xx'] ?? 0) + 1;
            } elseif ($status >= 400) {
                $state['days'][$day]['errors4xx'] = (int) ($state['days'][$day]['errors4xx'] ?? 0) + 1;
                $state['days'][$day]['endpoints'][$endpointKey]['errors4xx'] = (int) ($state['days'][$day]['endpoints'][$endpointKey]['errors4xx'] ?? 0) + 1;
            }

            $state['updatedAt'] = gmdate(DATE_ATOM);
            $state['days'] = self::trimDays($state['days']);
            return $state;
        });
    }

    /**
     * @return array<string,mixed>
     */
    /**
     * @param array<string,mixed> $thresholdOverrides
     * @return array<string,mixed>
     */
    public static function summary(?string $day = null, int $historyDays = 7, array $thresholdOverrides = []): array
    {
        $state = self::readStore();
        $targetDay = $day !== null && preg_match('/^\d{4}-\d{2}-\d{2}$/', $day) ? $day : gmdate('Y-m-d');
        $historyDays = max(1, min(30, $historyDays));

        $daily = is_array($state['days'][$targetDay] ?? null) ? $state['days'][$targetDay] : [
            'requests' => 0,
            'errors4xx' => 0,
            'errors5xx' => 0,
            'durationMs' => 0,
            'costDollars' => 0.0,
            'costUnits' => 0.0,
            'endpoints' => [],
        ];

        $requests = max(0, (int) ($daily['requests'] ?? 0));
        $avgDurationMs = $requests > 0 ? round(((int) ($daily['durationMs'] ?? 0)) / $requests, 2) : 0.0;
        $dailyCost = round((float) ($daily['costDollars'] ?? 0.0), 4);

        $topEndpoints = [];
        $endpoints = is_array($daily['endpoints'] ?? null) ? $daily['endpoints'] : [];
        foreach ($endpoints as $name => $row) {
            if (!is_array($row)) {
                continue;
            }
            $count = max(1, (int) ($row['requests'] ?? 0));
            $topEndpoints[] = [
                'endpoint' => (string) $name,
                'requests' => (int) ($row['requests'] ?? 0),
                'avgDurationMs' => round(((int) ($row['durationMs'] ?? 0)) / $count, 2),
                'costDollars' => round((float) ($row['costDollars'] ?? 0.0), 4),
                'error5xxRatePercent' => self::ratePercent((int) ($row['errors5xx'] ?? 0), (int) ($row['requests'] ?? 0)),
            ];
        }

        usort($topEndpoints, static function (array $a, array $b): int {
            return ($b['costDollars'] <=> $a['costDollars']);
        });
        $topEndpoints = array_slice($topEndpoints, 0, 10);

        $recommendations = [];
        foreach ($topEndpoints as $row) {
            if (($row['costDollars'] ?? 0.0) >= 1.0) {
                $recommendations[] = sprintf('Optimize %s (daily cost $%s)', $row['endpoint'], number_format((float) $row['costDollars'], 2));
            }
            if (($row['avgDurationMs'] ?? 0.0) >= 700.0) {
                $recommendations[] = sprintf('Reduce latency on %s (avg %sms)', $row['endpoint'], number_format((float) $row['avgDurationMs'], 0));
            }
        }

        $history = self::history($state, $historyDays, $targetDay);
        $projectedMonthly = round($dailyCost * 30, 2);
        $alerts = self::buildAlerts($history, $dailyCost, $requests, $thresholdOverrides);

        return [
            'day' => $targetDay,
            'requests' => $requests,
            'avgDurationMs' => $avgDurationMs,
            'errors4xx' => (int) ($daily['errors4xx'] ?? 0),
            'errors5xx' => (int) ($daily['errors5xx'] ?? 0),
            'error5xxRatePercent' => self::ratePercent((int) ($daily['errors5xx'] ?? 0), $requests),
            'costDollars' => $dailyCost,
            'projectedMonthlyDollars' => $projectedMonthly,
            'history' => $history,
            'alerts' => $alerts,
            'topEndpoints' => $topEndpoints,
            'recommendations' => array_values(array_unique($recommendations)),
            'updatedAt' => (string) ($state['updatedAt'] ?? gmdate(DATE_ATOM)),
        ];
    }

    /**
     * @param array<string,mixed> $state
     * @return array<int,array<string,mixed>>
     */
    private static function history(array $state, int $days, string $targetDay): array
    {
        $result = [];
        $anchor = strtotime($targetDay . ' 00:00:00 UTC');
        if ($anchor === false) {
            $anchor = time();
        }

        for ($i = $days - 1; $i >= 0; $i--) {
            $dayKey = gmdate('Y-m-d', $anchor - ($i * 86400));
            $row = is_array($state['days'][$dayKey] ?? null) ? $state['days'][$dayKey] : [];
            $requests = (int) ($row['requests'] ?? 0);
            $result[] = [
                'day' => $dayKey,
                'requests' => $requests,
                'costDollars' => round((float) ($row['costDollars'] ?? 0.0), 4),
                'avgDurationMs' => $requests > 0 ? round(((int) ($row['durationMs'] ?? 0)) / $requests, 2) : 0.0,
                'error5xxRatePercent' => self::ratePercent((int) ($row['errors5xx'] ?? 0), $requests),
            ];
        }

        return $result;
    }

    /**
     * @param array<int,array<string,mixed>> $history
     * @return array<int,array<string,mixed>>
     */
    /**
     * @param array<int,array<string,mixed>> $history
     * @param array<string,mixed> $thresholdOverrides
     * @return array<int,array<string,mixed>>
     */
    private static function buildAlerts(array $history, float $todayCost, int $todayRequests, array $thresholdOverrides = []): array
    {
        $alerts = [];
        if (count($history) < 2) {
            return $alerts;
        }

        $yesterday = $history[count($history) - 2] ?? null;
        if (is_array($yesterday)) {
            $yesterdayCost = (float) ($yesterday['costDollars'] ?? 0.0);
            if ($yesterdayCost > 0.0) {
                $increase = (($todayCost - $yesterdayCost) / $yesterdayCost) * 100;
                $threshold = self::thresholdFloat(
                    $thresholdOverrides,
                    'alertCostDailySpikePercent',
                    'ALERT_COST_DAILY_SPIKE_PERCENT',
                    35.0
                );
                if ($increase >= $threshold) {
                    $alerts[] = [
                        'code' => 'daily_cost_spike',
                        'severity' => $increase >= ($threshold * 1.8) ? 'critical' : 'warning',
                        'message' => 'Daily API cost spiked versus yesterday',
                        'valuePercent' => round($increase, 2),
                        'thresholdPercent' => $threshold,
                    ];
                }
            }
        }

        $recent = array_slice($history, -7);
        $sumCost = 0.0;
        $count = 0;
        foreach ($recent as $row) {
            $cost = (float) ($row['costDollars'] ?? 0.0);
            if ($cost <= 0.0) {
                continue;
            }
            $sumCost += $cost;
            $count++;
        }
        if ($count >= 3) {
            $avg = $sumCost / $count;
            $multiplierThreshold = max(
                1.1,
                self::thresholdFloat(
                    $thresholdOverrides,
                    'alertCostAboveAvgMultiplier',
                    'ALERT_COST_ABOVE_AVG_MULTIPLIER',
                    1.5
                )
            );
            if ($avg > 0.0 && $todayCost >= ($avg * $multiplierThreshold)) {
                $alerts[] = [
                    'code' => 'cost_above_recent_average',
                    'severity' => 'warning',
                    'message' => 'Today cost is significantly above 7-day average',
                    'valueDollars' => round($todayCost, 4),
                    'averageDollars' => round($avg, 4),
                    'thresholdMultiplier' => $multiplierThreshold,
                ];
            }
        }

        $minReqThreshold = self::thresholdInt(
            $thresholdOverrides,
            'alertMinRequestsForCostAlert',
            'ALERT_MIN_REQUESTS_FOR_COST_ALERT',
            150
        );
        if ($todayRequests >= $minReqThreshold) {
            $maxDaily = self::thresholdFloat(
                $thresholdOverrides,
                'alertCostDailyMaxDollars',
                'ALERT_COST_DAILY_MAX_DOLLARS',
                10.0
            );
            if ($todayCost >= $maxDaily) {
                $alerts[] = [
                    'code' => 'daily_cost_budget_exceeded',
                    'severity' => 'critical',
                    'message' => 'Daily API cost exceeded configured budget threshold',
                    'valueDollars' => round($todayCost, 4),
                    'thresholdDollars' => $maxDaily,
                ];
            }
        }

        return $alerts;
    }

    /**
     * @param array<string,mixed> $overrides
     */
    private static function thresholdFloat(array $overrides, string $overrideKey, string $envKey, float $default): float
    {
        $candidate = $overrides[$overrideKey] ?? null;
        if (is_numeric($candidate)) {
            return (float) $candidate;
        }
        $fromEnv = Env::get($envKey, (string) $default);
        return is_numeric($fromEnv) ? (float) $fromEnv : $default;
    }

    /**
     * @param array<string,mixed> $overrides
     */
    private static function thresholdInt(array $overrides, string $overrideKey, string $envKey, int $default): int
    {
        $candidate = $overrides[$overrideKey] ?? null;
        if (is_numeric($candidate)) {
            return (int) $candidate;
        }
        $fromEnv = Env::get($envKey, (string) $default);
        return is_numeric($fromEnv) ? (int) $fromEnv : $default;
    }

    /**
     * @return array<string,mixed>
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

    /**
     * @param callable(array<string,mixed>):array<string,mixed> $mutator
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
            if (!@flock($handle, LOCK_EX)) {
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
     * @param array<string,mixed> $days
     * @return array<string,mixed>
     */
    private static function trimDays(array $days): array
    {
        if (count($days) <= self::MAX_DAYS) {
            return $days;
        }

        ksort($days);
        while (count($days) > self::MAX_DAYS) {
            $firstKey = array_key_first($days);
            if ($firstKey === null) {
                break;
            }
            unset($days[$firstKey]);
        }

        return $days;
    }

    /**
     * @return array<string,mixed>
     */
    private static function initialState(): array
    {
        return [
            'updatedAt' => gmdate(DATE_ATOM),
            'days' => [],
        ];
    }

    private static function storeFile(): string
    {
        return dirname(__DIR__) . '/cache/cost-metrics.json';
    }

    private static function normalizePath(string $path): string
    {
        $trimmed = trim($path);
        if ($trimmed === '') {
            return '/';
        }
        return preg_replace('#/\d+#', '/:id', $trimmed) ?? $trimmed;
    }

    private static function ratePercent(int $errors, int $total): float
    {
        if ($total <= 0) {
            return 0.0;
        }
        return round(($errors / $total) * 100, 2);
    }
}
