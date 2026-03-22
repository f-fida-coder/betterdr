<?php

declare(strict_types=1);


final class MessagesController
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
        if ($method === 'POST' && $path === '/api/messages') {
            $this->createMessage();
            return true;
        }
        if ($method === 'GET' && $path === '/api/messages/me') {
            $this->getMyMessages();
            return true;
        }
        return false;
    }

    private function createMessage(): void
    {
        try {
            $actor = $this->protect();
            if ($actor === null) {
                return;
            }

            $bodyPayload = Http::jsonBody();
            $subject = trim((string) ($bodyPayload['subject'] ?? ''));
            $body = trim((string) ($bodyPayload['body'] ?? ''));

            if ($body === '') {
                Response::json(['message' => 'Message body is required'], 400);
                return;
            }

            if ($subject === '') {
                $parts = preg_split('/\s+/', $body) ?: [];
                $subject = trim(implode(' ', array_slice($parts, 0, 6)));
            }

            $doc = [
                'fromUserId' => MongoRepository::id((string) $actor['_id']),
                'fromName' => (string) ($actor['username'] ?? 'User'),
                'subject' => $subject,
                'body' => $body,
                'read' => false,
                'status' => 'open',
                'replies' => [],
                'createdAt' => MongoRepository::nowUtc(),
                'updatedAt' => MongoRepository::nowUtc(),
            ];

            $id = $this->db->insertOne('messages', $doc);
            $message = $this->db->findOne('messages', ['_id' => MongoRepository::id($id)]);
            Response::json($message ?? ['_id' => $id], 201);
        } catch (Throwable $e) {
            Response::json(['message' => 'Server error creating message'], 500);
        }
    }

    private function getMyMessages(): void
    {
        try {
            $actor = $this->protect();
            if ($actor === null) {
                return;
            }

            $messages = $this->db->findMany('messages', ['fromUserId' => MongoRepository::id((string) $actor['_id'])], ['sort' => ['createdAt' => -1]]);
            Response::json($messages);
        } catch (Throwable $e) {
            Response::json(['message' => 'Server error fetching messages'], 500);
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
        $actor = $this->db->findOne($collection, ['_id' => MongoRepository::id($id)]);
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
}
