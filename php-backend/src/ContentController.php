<?php

declare(strict_types=1);

use MongoDB\BSON\ObjectId;

final class ContentController
{
    private MongoRepository $db;
    private string $jwtSecret;

    private const DEFAULT_TUTORIALS = [
        [
            'title' => 'Understanding Moneyline Bets',
            'content' => 'Moneyline is the simplest market. Pick the team/player to win outright. Favorites pay less, underdogs pay more.',
            'order' => 1,
            'status' => 'active',
        ],
        [
            'title' => 'Spread Betting Fundamentals',
            'content' => 'Spread balances teams with handicap points. You win if your selection covers the line after handicap is applied.',
            'order' => 2,
            'status' => 'active',
        ],
        [
            'title' => 'Totals (Over/Under) Strategy',
            'content' => 'Totals bet on combined score, not winner. Use pace, weather, injuries, and line movement to shape decisions.',
            'order' => 3,
            'status' => 'active',
        ],
        [
            'title' => 'Parlay Risk and Reward',
            'content' => 'Parlays combine multiple legs for higher payout. All legs must win. Correlation and overexposure are key risks.',
            'order' => 4,
            'status' => 'active',
        ],
        [
            'title' => 'Live Betting Execution',
            'content' => 'Live markets move fast. Track momentum, timeout windows, and implied probability shifts before placing bets.',
            'order' => 5,
            'status' => 'active',
        ],
        [
            'title' => 'Responsible Bankroll Management',
            'content' => 'Use unit sizing and strict limits. Never chase losses. Build consistency with pre-defined staking rules.',
            'order' => 6,
            'status' => 'active',
        ],
    ];

    private const DEFAULT_FAQS = [
        [
            'question' => 'How quickly are deposits reflected?',
            'answer' => 'Card and wallet deposits are usually instant after approval. Bank and blockchain methods depend on provider processing.',
            'status' => 'active',
            'order' => 1,
        ],
        [
            'question' => 'How long do withdrawals take?',
            'answer' => 'Withdrawal requests are queued for review. Typical timeline is same day to 3 business days, based on method and verification.',
            'status' => 'active',
            'order' => 2,
        ],
        [
            'question' => 'Why was my wager rejected?',
            'answer' => 'Wagers may be rejected due to odds changes, market closure, insufficient balance, or bet-type validation rules.',
            'status' => 'active',
            'order' => 3,
        ],
        [
            'question' => 'Can I edit or cancel an open support ticket?',
            'answer' => 'You can submit a follow-up message in the same support thread. Agent/Admin can update ticket status after review.',
            'status' => 'active',
            'order' => 4,
        ],
    ];

    public function __construct(MongoRepository $db, string $jwtSecret)
    {
        $this->db = $db;
        $this->jwtSecret = $jwtSecret;
    }

    public function handle(string $method, string $path): bool
    {
        if ($method === 'GET' && $path === '/api/content/tutorials') {
            $this->getTutorials();
            return true;
        }
        if ($method === 'GET' && $path === '/api/content/faqs') {
            $this->getFaqs();
            return true;
        }
        return false;
    }

    private function getTutorials(): void
    {
        try {
            $actor = $this->protect();
            if ($actor === null) {
                return;
            }

            $this->ensureTutorialSeeded();
            $tutorials = $this->db->findMany('manualsections', ['status' => 'active'], ['sort' => ['order' => 1, 'createdAt' => -1]]);
            Response::json(['tutorials' => $tutorials]);
        } catch (Throwable $e) {
            Response::json(['message' => 'Server error fetching tutorials'], 500);
        }
    }

    private function getFaqs(): void
    {
        try {
            $actor = $this->protect();
            if ($actor === null) {
                return;
            }

            $this->ensureFaqSeeded();
            $faqs = $this->db->findMany('faqs', ['status' => 'active'], ['sort' => ['order' => 1, 'createdAt' => -1]]);
            Response::json(['faqs' => $faqs]);
        } catch (Throwable $e) {
            Response::json(['message' => 'Server error fetching support FAQs'], 500);
        }
    }

    private function ensureTutorialSeeded(): void
    {
        if ($this->db->countDocuments('manualsections', []) > 0) {
            return;
        }

        foreach (self::DEFAULT_TUTORIALS as $item) {
            $this->db->insertOne('manualsections', array_merge($item, [
                'createdAt' => MongoRepository::nowUtc(),
                'updatedAt' => MongoRepository::nowUtc(),
            ]));
        }
    }

    private function ensureFaqSeeded(): void
    {
        if ($this->db->countDocuments('faqs', []) > 0) {
            return;
        }

        foreach (self::DEFAULT_FAQS as $item) {
            $this->db->insertOne('faqs', array_merge($item, [
                'createdAt' => MongoRepository::nowUtc(),
                'updatedAt' => MongoRepository::nowUtc(),
            ]));
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
}
