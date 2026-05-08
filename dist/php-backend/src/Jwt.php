<?php

declare(strict_types=1);

final class Jwt
{
    public static function encode(array $payload, string $secret, int $ttlSeconds): string
    {
        $now = time();
        $payload['iat'] = $now;
        $payload['exp'] = $now + $ttlSeconds;

        $header = ['alg' => 'HS256', 'typ' => 'JWT'];

        $headerEncoded = self::base64UrlEncode((string) json_encode($header));
        $payloadEncoded = self::base64UrlEncode((string) json_encode($payload));

        $signature = hash_hmac('sha256', $headerEncoded . '.' . $payloadEncoded, $secret, true);
        $signatureEncoded = self::base64UrlEncode($signature);

        return $headerEncoded . '.' . $payloadEncoded . '.' . $signatureEncoded;
    }

    public static function decode(string $token, string $secret): array
    {
        $parts = explode('.', $token);
        if (count($parts) !== 3) {
            throw new RuntimeException('Invalid token format');
        }

        [$headerEncoded, $payloadEncoded, $signatureEncoded] = $parts;
        $expected = self::base64UrlEncode(hash_hmac('sha256', $headerEncoded . '.' . $payloadEncoded, $secret, true));

        if (!hash_equals($expected, $signatureEncoded)) {
            throw new RuntimeException('Invalid token signature');
        }

        $payloadJson = self::base64UrlDecode($payloadEncoded);
        $payload = json_decode($payloadJson, true);
        if (!is_array($payload)) {
            throw new RuntimeException('Invalid token payload');
        }

        if (isset($payload['exp']) && time() >= (int) $payload['exp']) {
            throw new RuntimeException('Token expired');
        }

        return $payload;
    }

    private static function base64UrlEncode(string $data): string
    {
        return rtrim(strtr(base64_encode($data), '+/', '-_'), '=');
    }

    private static function base64UrlDecode(string $data): string
    {
        $remainder = strlen($data) % 4;
        if ($remainder > 0) {
            $data .= str_repeat('=', 4 - $remainder);
        }
        $decoded = base64_decode(strtr($data, '-_', '+/'), true);
        if ($decoded === false) {
            throw new RuntimeException('Invalid base64 token');
        }
        return $decoded;
    }

    /**
     * Fetch a user record by collection + id, using APCu as a per-worker
     * 15-second cache to avoid a DB round-trip on every authenticated request.
     *
     * The short TTL ensures that suspension/status changes propagate within
     * 15 s — acceptable for all current access-control paths. The cache is
     * stored in-process (APCu), so there is no cross-worker broadcast needed.
     */
    public static function cachedUser(SqlRepository $db, string $collection, string $id): ?array
    {
        $cacheKey = 'ua:' . $collection . ':' . $id;

        if (function_exists('apcu_fetch')) {
            $cached = apcu_fetch($cacheKey, $found);
            if ($found) {
                return is_array($cached) ? $cached : null;
            }
        }

        $user = $db->findOne($collection, ['id' => SqlRepository::id($id)]);

        if ($user !== null && function_exists('apcu_store')) {
            apcu_store($cacheKey, $user, 15);
        }

        return $user;
    }
}
