<?php

declare(strict_types=1);

final class IpUtils
{
    public static function normalize(string $input): string
    {
        $value = trim($input);
        if ($value === '') {
            return '';
        }

        if (str_contains($value, ',')) {
            $parts = explode(',', $value);
            $value = trim((string) ($parts[0] ?? ''));
        }

        if (str_starts_with($value, '[') && str_contains($value, ']')) {
            $endPos = strpos($value, ']');
            if ($endPos !== false) {
                $value = substr($value, 1, $endPos - 1);
            }
        }

        $value = preg_replace('/%[0-9A-Za-z._-]+$/', '', $value) ?? $value;
        $value = strtolower($value);

        if (str_starts_with($value, '::ffff:')) {
            $value = substr($value, 7);
        }

        if (preg_match('/^(\d{1,3}(?:\.\d{1,3}){3}):(\d{1,5})$/', $value, $matches)) {
            $value = $matches[1];
        }

        return $value;
    }

    public static function clientIp(): string
    {
        $candidate = Http::header('x-forwarded-for');
        if ($candidate === '') {
            $candidate = (string) ($_SERVER['REMOTE_ADDR'] ?? '');
        }

        $normalized = self::normalize($candidate);
        return $normalized === '' ? 'unknown' : $normalized;
    }

    public static function parseAllowlist(string $raw): array
    {
        $set = [];
        foreach (explode(',', $raw) as $entry) {
            $ip = self::normalize((string) $entry);
            if ($ip !== '') {
                $set[$ip] = true;
            }
        }

        if (isset($set['127.0.0.1']) || isset($set['::1'])) {
            $set['127.0.0.1'] = true;
            $set['::1'] = true;
        }

        return $set;
    }

    public static function ownerModelForRole(string $role): string
    {
        if ($role === 'admin') {
            return 'Admin';
        }
        if ($role === 'agent' || $role === 'master_agent' || $role === 'super_agent') {
            return 'Agent';
        }
        return 'User';
    }
}
