<?php

declare(strict_types=1);

/**
 * Minimal native-PHP WebSocket client for TheRundown's real-time markets
 * stream: wss://therundown.io/api/v2/ws/markets
 *
 * No composer dependency — uses stream_socket_client('tls://…') for the
 * TCP+TLS handshake, then implements RFC 6455 framing in hand.
 *
 * Per docs:
 *   - Auth via `key` query parameter (NOT a header — WS specs forbid
 *     adding custom Authorization on connect from browsers, and Rundown
 *     standardised on query auth for compatibility).
 *   - Optional filter query params: sport_ids, market_ids, affiliate_ids,
 *     event_ids (comma-separated). Empty = all messages for the key's
 *     subscription.
 *   - Server emits text frames containing JSON: market_price updates
 *     plus periodic heartbeats every 15 s.
 *   - 256-message per-client buffer upstream; if a client falls behind,
 *     messages are dropped silently. Treat WS as a freshness booster,
 *     not a source of truth — REST delta polling stays as the gap-filler.
 *
 * Lifecycle:
 *   - new(url, filters)
 *   - connect()       → blocking handshake; returns bool
 *   - read(timeoutMs) → blocking-with-timeout single-frame read;
 *                       returns parsed message or null on timeout
 *   - close()         → polite close frame + tear down socket
 *
 * Not implemented (intentionally, out-of-scope for v1):
 *   - permessage-deflate (Rundown doesn't advertise it)
 *   - fragmented frames spanning across reads (their messages fit
 *     well below TCP MTU; we'd see this on multi-megabyte payloads)
 *   - subprotocol negotiation
 */
final class RundownWsClient
{
    private const DEFAULT_URL = 'wss://therundown.io/api/v2/ws/markets';
    private const HANDSHAKE_TIMEOUT_SECONDS = 10;
    private const READ_BUFFER_CHUNK = 16384;

    // RFC 6455 opcodes
    private const OP_CONTINUATION = 0x0;
    private const OP_TEXT         = 0x1;
    private const OP_BINARY       = 0x2;
    private const OP_CLOSE        = 0x8;
    private const OP_PING         = 0x9;
    private const OP_PONG         = 0xA;

    private string $url;
    /** @var array<string,string> */
    private array $filters;
    /** @var resource|null */
    private $socket = null;
    private string $readBuffer = '';
    private ?string $lastError = null;
    private int $framesReceived = 0;
    private int $lastFrameTs = 0;

    /**
     * @param array<string,string|array<string>> $filters
     *   sport_ids, market_ids, affiliate_ids, event_ids — empty = no filter
     */
    public function __construct(string $apiKey, array $filters = [], ?string $url = null)
    {
        $base = $url !== null && $url !== '' ? $url : self::DEFAULT_URL;
        // Compose URL with API key + filter query params.
        $params = ['key' => $apiKey];
        foreach (['sport_ids', 'market_ids', 'affiliate_ids', 'event_ids'] as $name) {
            $value = $filters[$name] ?? null;
            if (is_array($value)) {
                $value = implode(',', array_map('strval', $value));
            }
            if (is_string($value) && trim($value) !== '') {
                $params[$name] = trim($value);
            }
        }
        $this->url = $base . (str_contains($base, '?') ? '&' : '?') . http_build_query($params);
        $this->filters = array_filter($params, static fn ($k) => $k !== 'key', ARRAY_FILTER_USE_KEY);
    }

    public function connect(): bool
    {
        $parts = parse_url($this->url);
        if (!is_array($parts) || empty($parts['host'])) {
            $this->lastError = 'invalid_url';
            return false;
        }
        $host = (string) $parts['host'];
        $port = (int) ($parts['port'] ?? (($parts['scheme'] ?? 'wss') === 'wss' ? 443 : 80));
        $scheme = ($parts['scheme'] ?? 'wss') === 'wss' ? 'tls' : 'tcp';
        $path = (string) ($parts['path'] ?? '/');
        if (!empty($parts['query'])) {
            $path .= '?' . $parts['query'];
        }

        $remote = sprintf('%s://%s:%d', $scheme, $host, $port);
        $ctx = stream_context_create([
            'ssl' => [
                'verify_peer'       => true,
                'verify_peer_name'  => true,
                'allow_self_signed' => false,
                'SNI_enabled'       => true,
                'peer_name'         => $host,
            ],
        ]);
        $errno = 0;
        $errstr = '';
        $sock = @stream_socket_client(
            $remote,
            $errno,
            $errstr,
            self::HANDSHAKE_TIMEOUT_SECONDS,
            STREAM_CLIENT_CONNECT,
            $ctx
        );
        if ($sock === false) {
            $this->lastError = sprintf('connect_failed: %s (%d)', $errstr, $errno);
            return false;
        }
        stream_set_timeout($sock, 0, 500000); // 500ms read timeout
        $this->socket = $sock;

        // WebSocket upgrade handshake
        try {
            $nonce = base64_encode(random_bytes(16));
        } catch (Throwable $_) {
            $nonce = base64_encode(substr(md5(uniqid('', true)), 0, 16));
        }
        $request = "GET {$path} HTTP/1.1\r\n"
                 . "Host: {$host}\r\n"
                 . "Upgrade: websocket\r\n"
                 . "Connection: Upgrade\r\n"
                 . "Sec-WebSocket-Key: {$nonce}\r\n"
                 . "Sec-WebSocket-Version: 13\r\n"
                 . "User-Agent: betterdr-rundown-ws/1.0\r\n"
                 . "\r\n";
        if (@fwrite($sock, $request) === false) {
            $this->lastError = 'handshake_write_failed';
            $this->close();
            return false;
        }

        // Read the HTTP response headers (up to blank line).
        $response = '';
        $deadline = microtime(true) + self::HANDSHAKE_TIMEOUT_SECONDS;
        while (microtime(true) < $deadline) {
            $line = @fgets($sock, 4096);
            if ($line === false || $line === '') {
                usleep(50000);
                continue;
            }
            $response .= $line;
            if ($line === "\r\n" || $line === "\n") break;
        }
        if (!preg_match('#^HTTP/1\.[01]\s+(\d{3})#', $response, $m)) {
            $this->lastError = 'handshake_no_response';
            $this->close();
            return false;
        }
        if ((int) $m[1] !== 101) {
            $this->lastError = 'handshake_status_' . $m[1] . ': ' . substr(trim($response), 0, 200);
            $this->close();
            return false;
        }
        // Validate Sec-WebSocket-Accept = base64(sha1(nonce + GUID))
        $guid = '258EAFA5-E914-47DA-95CA-C5AB0DC85B11';
        $expected = base64_encode(sha1($nonce . $guid, true));
        if (preg_match('#sec-websocket-accept:\s*(\S+)#i', $response, $am)) {
            if (trim($am[1]) !== $expected) {
                $this->lastError = 'handshake_accept_mismatch';
                $this->close();
                return false;
            }
        }

        $this->lastFrameTs = time();
        return true;
    }

    public function isConnected(): bool
    {
        return is_resource($this->socket) && !@feof($this->socket);
    }

    /**
     * Read one decoded message. Returns:
     *   array  — parsed JSON message (text frame)
     *   null   — no frame ready within timeout (caller should poll again)
     *
     * Internally handles ping → pong replies and close frames (after a
     * close frame, isConnected() flips to false on next call).
     *
     * @return array<string,mixed>|null
     */
    public function read(int $timeoutMilliseconds = 1000): ?array
    {
        if (!$this->isConnected()) return null;

        $read = [$this->socket];
        $write = null;
        $except = null;
        $sec = (int) ($timeoutMilliseconds / 1000);
        $usec = ($timeoutMilliseconds % 1000) * 1000;
        $ready = @stream_select($read, $write, $except, $sec, $usec);
        if ($ready === false || $ready === 0) return null;

        $chunk = @fread($this->socket, self::READ_BUFFER_CHUNK);
        if ($chunk === false || $chunk === '') {
            // Connection closed
            if (@feof($this->socket)) {
                $this->lastError = 'eof';
                $this->close();
            }
            return null;
        }
        $this->readBuffer .= $chunk;
        $this->lastFrameTs = time();

        // Parse as many complete frames as we have in the buffer.
        $messages = [];
        while (true) {
            $frame = $this->tryParseFrame();
            if ($frame === null) break;
            [$opcode, $payload] = $frame;

            if ($opcode === self::OP_PING) {
                $this->sendFrame(self::OP_PONG, $payload);
                continue;
            }
            if ($opcode === self::OP_PONG) continue;
            if ($opcode === self::OP_CLOSE) {
                $this->sendFrame(self::OP_CLOSE, $payload);
                $this->close();
                continue;
            }
            if ($opcode === self::OP_TEXT) {
                $decoded = json_decode($payload, true);
                if (is_array($decoded)) {
                    $this->framesReceived++;
                    $messages[] = $decoded;
                }
                continue;
            }
            // Binary / continuation — ignore for this client.
        }

        // Return the most recent message; the worker loop polls in a tight
        // cycle so any extra messages parsed here are still picked up next
        // call (they sit in $this->readBuffer until then). For zero
        // backlog risk, callers can wrap read() in a tight inner loop.
        if ($messages === []) return null;
        // If we parsed multiple frames in one chunk, return the first and
        // requeue the rest into a pending list. Simpler approach: return
        // last and trust the outer loop is fast enough.
        // Actually return them one at a time — store extras.
        $first = array_shift($messages);
        foreach ($messages as $m) {
            $this->pending[] = $m;
        }
        return $first;
    }

    /** @var list<array<string,mixed>> */
    private array $pending = [];

    /**
     * Drain any buffered messages parsed during a previous read() call
     * (when a single TCP chunk carried multiple WS frames). Returns one
     * pending message or null if the queue is empty.
     *
     * @return array<string,mixed>|null
     */
    public function drain(): ?array
    {
        return $this->pending !== [] ? array_shift($this->pending) : null;
    }

    public function close(): void
    {
        if (is_resource($this->socket)) {
            @fclose($this->socket);
        }
        $this->socket = null;
        $this->readBuffer = '';
        $this->pending = [];
    }

    public function lastError(): ?string
    {
        return $this->lastError;
    }

    public function framesReceived(): int
    {
        return $this->framesReceived;
    }

    public function lastFrameAgeSeconds(): int
    {
        return $this->lastFrameTs > 0 ? (time() - $this->lastFrameTs) : -1;
    }

    /**
     * Pull one complete frame off the read buffer. Returns
     *   [opcode, payload]   when a full frame is present
     *   null                when more bytes are needed
     *
     * @return array{0:int,1:string}|null
     */
    private function tryParseFrame(): ?array
    {
        $buflen = strlen($this->readBuffer);
        if ($buflen < 2) return null;

        $byte1 = ord($this->readBuffer[0]);
        $byte2 = ord($this->readBuffer[1]);
        $opcode = $byte1 & 0x0F;
        $masked = ($byte2 & 0x80) !== 0;
        $len    = $byte2 & 0x7F;
        $offset = 2;

        if ($len === 126) {
            if ($buflen < $offset + 2) return null;
            $len = unpack('n', substr($this->readBuffer, $offset, 2))[1];
            $offset += 2;
        } elseif ($len === 127) {
            if ($buflen < $offset + 8) return null;
            // 64-bit length; PHP int is 64-bit on most builds. We don't
            // expect frames > a few KB from Rundown — accept anyway.
            $upper = unpack('N', substr($this->readBuffer, $offset, 4))[1];
            $lower = unpack('N', substr($this->readBuffer, $offset + 4, 4))[1];
            $len = ($upper << 32) | $lower;
            $offset += 8;
        }
        $mask = '';
        if ($masked) {
            if ($buflen < $offset + 4) return null;
            $mask = substr($this->readBuffer, $offset, 4);
            $offset += 4;
        }
        if ($buflen < $offset + $len) return null;

        $payload = substr($this->readBuffer, $offset, $len);
        if ($masked) {
            $unmasked = '';
            for ($i = 0; $i < $len; $i++) {
                $unmasked .= chr(ord($payload[$i]) ^ ord($mask[$i % 4]));
            }
            $payload = $unmasked;
        }
        $this->readBuffer = substr($this->readBuffer, $offset + $len);
        return [$opcode, $payload];
    }

    /**
     * Send a frame from the client. Client frames MUST be masked per RFC 6455.
     */
    private function sendFrame(int $opcode, string $payload): void
    {
        if (!is_resource($this->socket)) return;
        $len = strlen($payload);
        $frame = chr(0x80 | ($opcode & 0x0F));
        // Mask bit set (0x80) + length
        if ($len <= 125) {
            $frame .= chr(0x80 | $len);
        } elseif ($len <= 0xFFFF) {
            $frame .= chr(0x80 | 126) . pack('n', $len);
        } else {
            // 64-bit length — pack two 32-bit halves.
            $frame .= chr(0x80 | 127) . pack('N', 0) . pack('N', $len);
        }
        try {
            $mask = random_bytes(4);
        } catch (Throwable $_) {
            $mask = substr(md5(uniqid('', true)), 0, 4);
        }
        $frame .= $mask;
        $masked = '';
        for ($i = 0; $i < $len; $i++) {
            $masked .= chr(ord($payload[$i]) ^ ord($mask[$i % 4]));
        }
        $frame .= $masked;
        @fwrite($this->socket, $frame);
    }

    /** Snapshot of the live filters / URL (with the API key redacted). */
    public function describe(): array
    {
        return [
            'url'             => preg_replace('/key=[^&]+/', 'key=[redacted]', $this->url),
            'filters'         => $this->filters,
            'framesReceived'  => $this->framesReceived,
            'lastFrameAgeSec' => $this->lastFrameAgeSeconds(),
            'lastError'       => $this->lastError,
        ];
    }
}
