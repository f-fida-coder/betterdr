<?php

declare(strict_types=1);

/**
 * Bias-gate deck generator. Emits N seeded 52-card decks — one per line, 52
 * space-separated engine codes (1..52) — produced by the REAL production
 * shuffle (CasinoController::acesAndEightsSeededDeck, i.e. the same
 * seededShuffleShoe primitive the deal uses). Feed the file to the C
 * Monte-Carlo (aces-and-eights-rtp-solver --simfile) to confirm realized
 * optimal-play RTP matches the exhaustive 96.247% / 96.796% — i.e. the seeded
 * shuffle introduces NO bias vs a CSPRNG shuffle.
 *
 * Each deck uses a fresh random serverSeed + clientSeed + nonce, exactly as
 * the rotating chain would across many rounds/players.
 *
 * Usage: php aces-and-eights-gen-seeded-decks.php <count> > decks.txt
 */

require_once __DIR__ . '/../src/CasinoController.php';

$count = max(1, (int) ($argv[1] ?? 1000000));

// The real production shuffle, reached without a DB (no constructor deps).
$ref = new ReflectionClass(CasinoController::class);
$controller = $ref->newInstanceWithoutConstructor();
$seededDeck = new ReflectionMethod(CasinoController::class, 'acesAndEightsSeededDeck');

$out = fopen('php://stdout', 'w');
$buf = '';
for ($k = 0; $k < $count; $k++) {
    $serverSeed = bin2hex(random_bytes(32));
    $clientSeed = bin2hex(random_bytes(8));
    $nonce = random_int(0, 1_000_000);
    $deck = $seededDeck->invoke($controller, $serverSeed, $clientSeed, $nonce);
    $buf .= implode(' ', $deck) . "\n";
    if (($k & 0x3FFF) === 0x3FFF) { // flush every 16k lines
        fwrite($out, $buf);
        $buf = '';
    }
}
fwrite($out, $buf);
fclose($out);
