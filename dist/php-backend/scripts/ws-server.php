<?php

declare(strict_types=1);

require_once __DIR__ . '/../src/Env.php';
require_once __DIR__ . '/../src/RealtimeEventBus.php';

$projectRoot = dirname(__DIR__, 2);
$phpBackendDir = dirname(__DIR__);
Env::load($projectRoot, $phpBackendDir);

$enabled = strtolower((string) Env::get('WS_ENABLED', 'true')) === 'true';
if (!$enabled) {
    fwrite(STDOUT, "[ws] WS_ENABLED=false, websocket server not started\n");
    exit(0);
}

$host = (string) Env::get('WS_HOST', '0.0.0.0');
$port = max(1, (int) Env::get('WS_PORT', '5001'));
$eventLogPath = RealtimeEventBus::eventLogPath();

$server = @stream_socket_server("tcp://{$host}:{$port}", $errno, $errstr);
if ($server === false) {
    fwrite(STDERR, "[ws] failed to bind {$host}:{$port} - {$errstr} ({$errno})\n");
    exit(1);
}

stream_set_blocking($server, false);

/** @var array<int, resource> $clients */
$clients = [];
/** @var array<int, bool> $handshakes */
$handshakes = [];
/** @var array<int, array<string,bool>> $subscriptions */
$subscriptions = [];

$cursor = is_file($eventLogPath) ? (int) filesize($eventLogPath) : 0;
$lastHeartbeat = microtime(true);

fwrite(STDOUT, sprintf("[ws] listening on ws://%s:%d\n", $host, $port));

while (true) {
    $readSockets = [$server];
    foreach ($clients as $client) {
        $readSockets[] = $client;
    }

    $write = null;
    $except = null;
    @stream_select($readSockets, $write, $except, 0, 200000);

    foreach ($readSockets as $socket) {
        if ($socket === $server) {
            $conn = @stream_socket_accept($server, 0);
            if ($conn !== false) {
                stream_set_blocking($conn, false);
                $id = (int) $conn;
                $clients[$id] = $conn;
                $handshakes[$id] = false;
                $subscriptions[$id] = [];
            }
            continue;
        }

        $id = (int) $socket;
        $buffer = @fread($socket, 8192);
        if ($buffer === '' || $buffer === false) {
            if (feof($socket)) {
                closeClient($id, $clients, $handshakes, $subscriptions);
            }
            continue;
        }

        if (($handshakes[$id] ?? false) === false) {
            if (performHandshake($socket, $buffer)) {
                $handshakes[$id] = true;
                sendJson($socket, ['type' => 'connected', 'clientId' => (string) $id]);
            } else {
                closeClient($id, $clients, $handshakes, $subscriptions);
            }
            continue;
        }

        $message = decodeWsFrame($buffer);
        if ($message === null) {
            continue;
        }

        $data = json_decode($message, true);
        if (!is_array($data)) {
            sendJson($socket, ['type' => 'error', 'message' => 'invalid_json']);
            continue;
        }

        $type = strtolower((string) ($data['type'] ?? ''));
        $channel = trim((string) ($data['channel'] ?? ''));

        if ($type === 'ping') {
            sendJson($socket, ['type' => 'pong', 'ts' => gmdate(DATE_ATOM)]);
            continue;
        }

        if ($type === 'subscribe' && $channel !== '') {
            $subscriptions[$id][$channel] = true;
            sendJson($socket, ['type' => 'subscribed', 'channel' => $channel]);
            continue;
        }

        if ($type === 'unsubscribe' && $channel !== '') {
            unset($subscriptions[$id][$channel]);
            sendJson($socket, ['type' => 'unsubscribed', 'channel' => $channel]);
            continue;
        }

        sendJson($socket, ['type' => 'error', 'message' => 'unsupported_message_type']);
    }

    if (is_file($eventLogPath)) {
        $size = (int) filesize($eventLogPath);
        if ($size < $cursor) {
            $cursor = 0;
        }
        if ($size > $cursor) {
            $fp = @fopen($eventLogPath, 'rb');
            if ($fp !== false) {
                @fseek($fp, $cursor);
                while (($line = fgets($fp)) !== false) {
                    $cursor += strlen($line);
                    $evt = json_decode(trim($line), true);
                    if (!is_array($evt)) {
                        continue;
                    }
                    $evtChannel = trim((string) ($evt['channel'] ?? ''));
                    if ($evtChannel === '') {
                        continue;
                    }
                    $payload = is_array($evt['payload'] ?? null) ? $evt['payload'] : ['value' => $evt['payload'] ?? null];
                    broadcast($clients, $handshakes, $subscriptions, $evtChannel, $payload);
                }
                @fclose($fp);
            }
        }
    }

    $now = microtime(true);
    if (($now - $lastHeartbeat) >= 25.0) {
        foreach ($clients as $id => $client) {
            if (($handshakes[$id] ?? false) !== true) {
                continue;
            }
            sendJson($client, ['type' => 'heartbeat', 'ts' => gmdate(DATE_ATOM)]);
        }
        $lastHeartbeat = $now;
    }
}

/**
 * @param array<int, resource> $clients
 * @param array<int, bool> $handshakes
 * @param array<int, array<string, bool>> $subscriptions
 */
function closeClient(int $id, array &$clients, array &$handshakes, array &$subscriptions): void
{
    if (isset($clients[$id]) && is_resource($clients[$id])) {
        @fclose($clients[$id]);
    }
    unset($clients[$id], $handshakes[$id], $subscriptions[$id]);
}

/**
 * @param resource $socket
 */
function performHandshake($socket, string $httpRequest): bool
{
    if (!preg_match('/Sec-WebSocket-Key:\s*(.+)\r\n/i', $httpRequest, $matches)) {
        return false;
    }

    $secKey = trim($matches[1]);
    $accept = base64_encode(pack('H*', sha1($secKey . '258EAFA5-E914-47DA-95CA-C5AB0DC85B11')));

    $upgrade = "HTTP/1.1 101 Switching Protocols\r\n"
        . "Upgrade: websocket\r\n"
        . "Connection: Upgrade\r\n"
        . "Sec-WebSocket-Accept: {$accept}\r\n\r\n";

    return @fwrite($socket, $upgrade) !== false;
}

function decodeWsFrame(string $data): ?string
{
    $length = strlen($data);
    if ($length < 2) {
        return null;
    }

    $secondByte = ord($data[1]);
    $masked = ($secondByte & 0x80) === 0x80;
    $payloadLen = $secondByte & 0x7F;
    $offset = 2;

    if ($payloadLen === 126) {
        if ($length < 4) {
            return null;
        }
        $payloadLen = unpack('n', substr($data, 2, 2))[1];
        $offset = 4;
    } elseif ($payloadLen === 127) {
        if ($length < 10) {
            return null;
        }
        $parts = unpack('N2', substr($data, 2, 8));
        $payloadLen = ($parts[1] << 32) + $parts[2];
        $offset = 10;
    }

    if (!$masked) {
        return substr($data, $offset, $payloadLen);
    }

    $mask = substr($data, $offset, 4);
    $offset += 4;
    $payload = substr($data, $offset, $payloadLen);

    $decoded = '';
    for ($i = 0; $i < $payloadLen; $i++) {
        $decoded .= $payload[$i] ^ $mask[$i % 4];
    }

    return $decoded;
}

/**
 * @param resource $socket
 * @param array<string,mixed> $message
 */
function sendJson($socket, array $message): void
{
    $payload = json_encode($message, JSON_UNESCAPED_SLASHES);
    if (!is_string($payload)) {
        return;
    }
    @fwrite($socket, encodeWsFrame($payload));
}

function encodeWsFrame(string $payload): string
{
    $len = strlen($payload);
    $frame = chr(0x81);

    if ($len <= 125) {
        $frame .= chr($len);
    } elseif ($len <= 65535) {
        $frame .= chr(126) . pack('n', $len);
    } else {
        $frame .= chr(127) . pack('NN', 0, $len);
    }

    return $frame . $payload;
}

/**
 * @param array<int, resource> $clients
 * @param array<int, bool> $handshakes
 * @param array<int, array<string,bool>> $subscriptions
 * @param array<string,mixed> $payload
 */
function broadcast(array $clients, array $handshakes, array $subscriptions, string $channel, array $payload): void
{
    $message = [
        'type' => 'update',
        'channel' => $channel,
        'data' => $payload,
        'ts' => gmdate(DATE_ATOM),
    ];

    foreach ($clients as $id => $client) {
        if (($handshakes[$id] ?? false) !== true) {
            continue;
        }
        if (!(($subscriptions[$id][$channel] ?? false) === true || ($subscriptions[$id]['*'] ?? false) === true)) {
            continue;
        }
        sendJson($client, $message);
    }
}
