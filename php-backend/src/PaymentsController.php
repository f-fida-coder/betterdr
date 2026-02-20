<?php

declare(strict_types=1);

use MongoDB\BSON\ObjectId;

final class PaymentsController
{
    private MongoRepository $db;
    private string $jwtSecret;

    public function __construct(MongoRepository $db, string $jwtSecret)
    {
        $this->db = $db;
        $this->jwtSecret = $jwtSecret;
    }

    public function handle(string $method, string $path): bool
    {
        if ($method === 'POST' && $path === '/api/payments/create-deposit-intent') {
            $this->createDepositIntent();
            return true;
        }
        if ($method === 'POST' && $path === '/api/payments/webhook') {
            $this->handleWebhook();
            return true;
        }
        return false;
    }

    private function createDepositIntent(): void
    {
        try {
            $actor = $this->protect();
            if ($actor === null) {
                return;
            }

            $stripeKey = (string) Env::get('STRIPE_SECRET_KEY', '');
            if ($stripeKey === '' || str_contains($stripeKey, 'PLACEHOLDER')) {
                Response::json(['message' => 'Payment service is currently unavailable. Please contact support.'], 503);
                return;
            }

            $body = Http::jsonBody();
            $amount = is_numeric($body['amount'] ?? null) ? (float) $body['amount'] : 0;
            if ($amount <= 0) {
                Response::json(['message' => 'Invalid amount'], 400);
                return;
            }

            if (($actor['role'] ?? '') === 'user') {
                Response::json(['message' => 'Deposits are disabled. Please contact your agent to add funds.'], 403);
                return;
            }

            $payload = [
                'amount' => (string) ((int) round($amount * 100)),
                'currency' => 'usd',
                'metadata[userId]' => (string) $actor['_id'],
                'metadata[type]' => 'deposit',
                'automatic_payment_methods[enabled]' => 'true',
            ];

            $ch = curl_init('https://api.stripe.com/v1/payment_intents');
            if ($ch === false) {
                Response::json(['message' => 'Error creating payment intent'], 500);
                return;
            }

            curl_setopt_array($ch, [
                CURLOPT_POST => true,
                CURLOPT_POSTFIELDS => http_build_query($payload),
                CURLOPT_RETURNTRANSFER => true,
                CURLOPT_HTTPHEADER => [
                    'Authorization: Bearer ' . $stripeKey,
                    'Content-Type: application/x-www-form-urlencoded',
                ],
                CURLOPT_TIMEOUT => 20,
                CURLOPT_CONNECTTIMEOUT => 5,
            ]);

            $raw = curl_exec($ch);
            $status = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);

            if ($raw === false || $status >= 400) {
                $err = curl_error($ch);
                Response::json(['message' => 'Error creating payment intent', 'error' => $err !== '' ? $err : 'Stripe API error'], 500);
                return;
            }

            $data = json_decode((string) $raw, true);
            if (!is_array($data) || !isset($data['client_secret'])) {
                Response::json(['message' => 'Error creating payment intent', 'error' => 'Invalid Stripe response'], 500);
                return;
            }

            Response::json(['clientSecret' => $data['client_secret']]);
        } catch (Throwable $e) {
            Response::json(['message' => 'Error creating payment intent', 'error' => $e->getMessage()], 500);
        }
    }

    private function protect(): ?array
    {
        $auth = Http::header('authorization');
        if (!str_starts_with($auth, 'Bearer ')) {
            Response::json(['message' => 'Not authorized, no token'], 401);
            return null;
        }

        $token = trim(substr($auth, 7));
        try {
            $decoded = Jwt::decode($token, $this->jwtSecret);
        } catch (Throwable $e) {
            Response::json(['message' => 'Not authorized, token failed: ' . $e->getMessage()], 401);
            return null;
        }

        $role = (string) ($decoded['role'] ?? 'user');
        $id = (string) ($decoded['id'] ?? '');
        if ($id === '' || preg_match('/^[a-f0-9]{24}$/i', $id) !== 1) {
            Response::json(['message' => 'Not authorized, token failed: invalid user id'], 401);
            return null;
        }

        $collection = $this->collectionByRole($role);
        $actor = $this->db->findOne($collection, ['_id' => new ObjectId($id)]);
        if ($actor === null) {
            Response::json(['message' => 'Not authorized, user not found'], 403);
            return null;
        }

        if (($actor['status'] ?? '') === 'suspended') {
            Response::json(['message' => 'Not authorized, account suspended'], 403);
            return null;
        }

        return $actor;
    }

    private function collectionByRole(string $role): string
    {
        if ($role === 'admin') {
            return 'admins';
        }
        if ($role === 'agent' || $role === 'master_agent' || $role === 'super_agent') {
            return 'agents';
        }
        return 'users';
    }

    private function handleWebhook(): void
    {
        try {
            $webhookSecret = (string) Env::get('STRIPE_WEBHOOK_SECRET', '');
            if ($webhookSecret === '') {
                http_response_code(503);
                header('Content-Type: text/plain');
                echo 'Stripe not initialized';
                return;
            }

            $sigHeader = Http::header('stripe-signature');
            $payload = file_get_contents('php://input');
            if (!is_string($payload)) {
                $payload = '';
            }

            if (!$this->verifyStripeSignature($payload, $sigHeader, $webhookSecret)) {
                http_response_code(400);
                header('Content-Type: text/plain');
                echo 'Webhook Error: Invalid signature';
                return;
            }

            $event = json_decode($payload, true);
            if (!is_array($event)) {
                http_response_code(400);
                header('Content-Type: text/plain');
                echo 'Webhook Error: Invalid payload';
                return;
            }

            if (($event['type'] ?? '') === 'payment_intent.succeeded' && is_array($event['data']['object'] ?? null)) {
                $this->handleSuccessfulDeposit($event['data']['object']);
            }

            Response::json(['received' => true]);
        } catch (Throwable $e) {
            http_response_code(400);
            header('Content-Type: text/plain');
            echo 'Webhook Error: ' . $e->getMessage();
        }
    }

    private function verifyStripeSignature(string $payload, string $sigHeader, string $secret): bool
    {
        if ($sigHeader === '' || $secret === '') {
            return false;
        }
        $parts = array_map('trim', explode(',', $sigHeader));
        $timestamp = null;
        $signatures = [];
        foreach ($parts as $part) {
            if (str_starts_with($part, 't=')) {
                $timestamp = substr($part, 2);
            } elseif (str_starts_with($part, 'v1=')) {
                $signatures[] = substr($part, 3);
            }
        }
        if ($timestamp === null || count($signatures) === 0) {
            return false;
        }

        $signedPayload = $timestamp . '.' . $payload;
        $expected = hash_hmac('sha256', $signedPayload, $secret);
        foreach ($signatures as $sig) {
            if (hash_equals($expected, $sig)) {
                return true;
            }
        }
        return false;
    }

    private function handleSuccessfulDeposit(array $paymentIntent): void
    {
        $meta = is_array($paymentIntent['metadata'] ?? null) ? $paymentIntent['metadata'] : [];
        $userId = (string) ($meta['userId'] ?? '');
        $type = (string) ($meta['type'] ?? '');
        if ($type !== 'deposit' || $userId === '' || preg_match('/^[a-f0-9]{24}$/i', $userId) !== 1) {
            return;
        }

        $amountCents = is_numeric($paymentIntent['amount'] ?? null) ? (float) $paymentIntent['amount'] : 0.0;
        $amount = $amountCents / 100;

        $user = $this->db->findOne('users', ['_id' => new ObjectId($userId)]);
        if ($user === null) {
            return;
        }

        $newBalance = $this->num($user['balance'] ?? 0) + $amount;
        $this->db->updateOne('users', ['_id' => new ObjectId($userId)], [
            'balance' => $newBalance,
            'updatedAt' => MongoRepository::nowUtc(),
        ]);

        $this->db->insertOne('transactions', [
            'userId' => new ObjectId($userId),
            'amount' => $amount,
            'type' => 'deposit',
            'status' => 'completed',
            'stripePaymentId' => (string) ($paymentIntent['id'] ?? ''),
            'description' => 'Stripe Deposit',
            'createdAt' => MongoRepository::nowUtc(),
            'updatedAt' => MongoRepository::nowUtc(),
        ]);
    }

    private function num(mixed $value): float
    {
        if (is_int($value) || is_float($value)) {
            return (float) $value;
        }
        if (is_string($value)) {
            return (float) $value;
        }
        if (is_array($value)) {
            if (isset($value['$numberDecimal'])) {
                return (float) $value['$numberDecimal'];
            }
            if (isset($value['value'])) {
                return (float) $value['value'];
            }
        }
        if (is_object($value) && method_exists($value, '__toString')) {
            return (float) $value->__toString();
        }
        return 0.0;
    }
}
