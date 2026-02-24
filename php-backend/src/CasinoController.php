<?php

declare(strict_types=1);


final class CasinoController
{
    private MongoRepository $db;
    private string $jwtSecret;

    private const CASINO_CATEGORIES = ['lobby', 'table_games', 'slots', 'video_poker', 'specialty_games'];

    private const DEFAULT_CASINO_GAMES = [
        ['provider' => 'internal', 'name' => 'Single Hand ($1-$100)', 'slug' => 'single-hand-1-100', 'category' => 'table_games', 'minBet' => 1, 'maxBet' => 100, 'themeColor' => '#115e59', 'icon' => 'fa-solid fa-diamond', 'isFeatured' => true],
        ['provider' => 'internal', 'name' => 'Baccarat', 'slug' => 'baccarat', 'category' => 'table_games', 'minBet' => 1, 'maxBet' => 100, 'themeColor' => '#9f1239', 'icon' => 'fa-solid fa-gem', 'isFeatured' => true],
        ['provider' => 'internal', 'name' => 'Arabian Treasure', 'slug' => 'arabian-treasure', 'category' => 'slots', 'minBet' => 0.3, 'maxBet' => 30, 'themeColor' => '#7e22ce', 'icon' => 'fa-solid fa-scroll', 'isFeatured' => true],
        ['provider' => 'internal', 'name' => 'Jacks or Better', 'slug' => 'jacks-or-better', 'category' => 'video_poker', 'minBet' => 1, 'maxBet' => 100, 'themeColor' => '#be123c', 'icon' => 'fa-solid fa-cards'],
        ['provider' => 'internal', 'name' => 'Video Keno', 'slug' => 'video-keno', 'category' => 'specialty_games', 'minBet' => 1, 'maxBet' => 100, 'themeColor' => '#0ea5e9', 'icon' => 'fa-solid fa-table-cells-large'],
    ];

    public function __construct(MongoRepository $db, string $jwtSecret)
    {
        $this->db = $db;
        $this->jwtSecret = $jwtSecret;
    }

    public function handle(string $method, string $path): bool
    {
        if ($method === 'GET' && $path === '/api/casino/games') {
            $this->getCasinoGames();
            return true;
        }
        if ($method === 'GET' && $path === '/api/casino/categories') {
            $this->getCasinoCategories();
            return true;
        }
        if ($method === 'POST' && preg_match('#^/api/casino/games/([a-fA-F0-9]{24})/launch$#', $path, $m) === 1) {
            $this->launchCasinoGame($m[1]);
            return true;
        }

        if ($method === 'POST' && $path === '/api/casino/admin/games') {
            $this->createCasinoGame();
            return true;
        }
        if ($method === 'PUT' && preg_match('#^/api/casino/admin/games/([a-fA-F0-9]{24})$#', $path, $m) === 1) {
            $this->updateCasinoGame($m[1]);
            return true;
        }
        if ($method === 'POST' && $path === '/api/casino/admin/sync') {
            $this->syncCasinoGamesFromProvider();
            return true;
        }

        return false;
    }

    private function getCasinoGames(): void
    {
        try {
            $actor = $this->protect();
            if ($actor === null) {
                return;
            }

            $this->ensureCasinoSeeded();

            $category = strtolower(trim((string) ($_GET['category'] ?? 'lobby')));
            $search = trim((string) ($_GET['search'] ?? ''));
            $featured = strtolower((string) ($_GET['featured'] ?? '')) === 'true';
            $includeAll = strtolower((string) ($_GET['all'] ?? '')) === 'true' && (($actor['role'] ?? 'user') !== 'user');
            $page = max(1, (int) ($_GET['page'] ?? 1));
            $limit = min(100, max(1, (int) ($_GET['limit'] ?? 48)));
            $skip = ($page - 1) * $limit;

            $query = [];
            if (!$includeAll) {
                $query['status'] = 'active';
            }
            if ($category !== '' && $category !== 'lobby') {
                $query['category'] = $this->normalizeCategory($category);
            }
            if ($search !== '') {
                $query['$or'] = [
                    ['name' => ['$regex' => $search, '$options' => 'i']],
                    ['tags' => ['$regex' => $search, '$options' => 'i']],
                    ['provider' => ['$regex' => $search, '$options' => 'i']],
                ];
            }
            if ($featured) {
                $query['isFeatured'] = true;
            }

            $games = $this->db->findMany('casinogames', $query, [
                'sort' => ['sortOrder' => 1, 'name' => 1],
                'skip' => $skip,
                'limit' => $limit,
            ]);
            $total = $this->db->countDocuments('casinogames', $query);

            $publicGames = array_map(fn ($g) => $this->toPublicGame($g), $games);

            Response::json([
                'games' => $publicGames,
                'pagination' => [
                    'page' => $page,
                    'limit' => $limit,
                    'total' => $total,
                    'pages' => max(1, (int) ceil($total / max(1, $limit))),
                ],
            ]);
        } catch (Throwable $e) {
            Response::json(['message' => 'Server error fetching casino games'], 500);
        }
    }

    private function getCasinoCategories(): void
    {
        try {
            $actor = $this->protect();
            if ($actor === null) {
                return;
            }

            $this->ensureCasinoSeeded();
            $activeGames = $this->db->findMany('casinogames', ['status' => 'active']);

            $counts = [
                'table_games' => 0,
                'slots' => 0,
                'video_poker' => 0,
                'specialty_games' => 0,
            ];
            foreach ($activeGames as $game) {
                $cat = (string) ($game['category'] ?? 'lobby');
                if (isset($counts[$cat])) {
                    $counts[$cat]++;
                }
            }

            $total = array_sum($counts);
            Response::json([
                'categories' => [
                    ['id' => 'lobby', 'label' => 'Lobby', 'count' => $total],
                    ['id' => 'table_games', 'label' => 'Table Games', 'count' => $counts['table_games']],
                    ['id' => 'slots', 'label' => 'Slots', 'count' => $counts['slots']],
                    ['id' => 'video_poker', 'label' => 'Video Poker', 'count' => $counts['video_poker']],
                    ['id' => 'specialty_games', 'label' => 'Specialty Games', 'count' => $counts['specialty_games']],
                ],
            ]);
        } catch (Throwable $e) {
            Response::json(['message' => 'Server error fetching casino categories'], 500);
        }
    }

    private function launchCasinoGame(string $id): void
    {
        try {
            $actor = $this->protect();
            if ($actor === null) {
                return;
            }

            $game = $this->db->findOne('casinogames', ['_id' => MongoRepository::id($id)]);
            if ($game === null) {
                Response::json(['message' => 'Casino game not found'], 404);
                return;
            }
            if ((string) ($game['status'] ?? '') !== 'active') {
                Response::json(['message' => 'Game is currently ' . ($game['status'] ?? 'disabled')], 400);
                return;
            }

            $fallbackLaunch = rtrim((string) Env::get('CASINO_FALLBACK_URL', 'https://example.com/casino'), '/') . '/' . ($game['slug'] ?? 'game');
            $baseLaunchUrl = (is_string($game['launchUrl'] ?? null) && trim((string) $game['launchUrl']) !== '')
                ? trim((string) $game['launchUrl'])
                : $fallbackLaunch;

            $launchUrl = $baseLaunchUrl
                . (str_contains($baseLaunchUrl, '?') ? '&' : '?')
                . 'user=' . rawurlencode((string) ($actor['username'] ?? 'user'))
                . '&gameId=' . rawurlencode((string) ($game['_id'] ?? ''))
                . '&ts=' . time();

            Response::json([
                'game' => $this->toPublicGame($game),
                'launchUrl' => $launchUrl,
            ]);
        } catch (Throwable $e) {
            Response::json(['message' => 'Server error launching casino game'], 500);
        }
    }

    private function createCasinoGame(): void
    {
        try {
            $actor = $this->protect();
            if ($actor === null) {
                return;
            }
            if (!$this->canManageCasino($actor)) {
                Response::json(['message' => 'User role ' . ($actor['role'] ?? 'unknown') . ' is not authorized to access this route'], 403);
                return;
            }

            $body = Http::jsonBody();
            $name = trim((string) ($body['name'] ?? ''));
            $slug = trim((string) ($body['slug'] ?? ''));
            if ($name === '' || $slug === '') {
                Response::json(['message' => 'name and slug are required'], 400);
                return;
            }

            $existing = $this->db->findOne('casinogames', ['slug' => $slug]);
            if ($existing !== null) {
                Response::json(['message' => 'Game slug already exists'], 409);
                return;
            }

            $doc = [
                'provider' => (string) ($body['provider'] ?? 'internal'),
                'externalGameId' => $body['externalGameId'] ?? null,
                'name' => $name,
                'slug' => $slug,
                'category' => $this->normalizeCategory((string) ($body['category'] ?? 'lobby')),
                'icon' => (string) ($body['icon'] ?? 'fa-solid fa-dice'),
                'themeColor' => (string) ($body['themeColor'] ?? '#0f5db3'),
                'imageUrl' => (string) ($body['imageUrl'] ?? ''),
                'launchUrl' => (string) ($body['launchUrl'] ?? ''),
                'minBet' => $this->safeNumber($body['minBet'] ?? null, 1),
                'maxBet' => $this->safeNumber($body['maxBet'] ?? null, 100),
                'rtp' => array_key_exists('rtp', $body) ? ($body['rtp'] === null ? null : $this->safeNumber($body['rtp'], null)) : null,
                'volatility' => $body['volatility'] ?? null,
                'tags' => is_array($body['tags'] ?? null) ? $body['tags'] : [],
                'isFeatured' => (bool) ($body['isFeatured'] ?? false),
                'status' => (string) ($body['status'] ?? 'active'),
                'supportsDemo' => (bool) ($body['supportsDemo'] ?? false),
                'sortOrder' => $this->safeNumber($body['sortOrder'] ?? null, 100),
                'metadata' => is_array($body['metadata'] ?? null) ? $body['metadata'] : new stdClass(),
                'createdAt' => MongoRepository::nowUtc(),
                'updatedAt' => MongoRepository::nowUtc(),
            ];

            $id = $this->db->insertOne('casinogames', $doc);
            $created = $this->db->findOne('casinogames', ['_id' => MongoRepository::id($id)]);
            Response::json($this->toPublicGame($created ?? array_merge($doc, ['_id' => $id])), 201);
        } catch (Throwable $e) {
            Response::json(['message' => 'Server error creating casino game'], 500);
        }
    }

    private function updateCasinoGame(string $id): void
    {
        try {
            $actor = $this->protect();
            if ($actor === null) {
                return;
            }
            if (!$this->canManageCasino($actor)) {
                Response::json(['message' => 'User role ' . ($actor['role'] ?? 'unknown') . ' is not authorized to access this route'], 403);
                return;
            }

            $existing = $this->db->findOne('casinogames', ['_id' => MongoRepository::id($id)]);
            if ($existing === null) {
                Response::json(['message' => 'Casino game not found'], 404);
                return;
            }

            $body = Http::jsonBody();
            $updates = [];
            $fields = ['provider', 'externalGameId', 'name', 'slug', 'icon', 'themeColor', 'imageUrl', 'launchUrl', 'volatility', 'tags', 'isFeatured', 'status', 'supportsDemo', 'metadata'];
            foreach ($fields as $field) {
                if (array_key_exists($field, $body)) {
                    $updates[$field] = $body[$field];
                }
            }

            if (array_key_exists('category', $body)) {
                $updates['category'] = $this->normalizeCategory((string) $body['category']);
            }
            if (array_key_exists('minBet', $body)) {
                $updates['minBet'] = $this->safeNumber($body['minBet'], 1);
            }
            if (array_key_exists('maxBet', $body)) {
                $updates['maxBet'] = $this->safeNumber($body['maxBet'], 100);
            }
            if (array_key_exists('sortOrder', $body)) {
                $updates['sortOrder'] = $this->safeNumber($body['sortOrder'], 100);
            }
            if (array_key_exists('rtp', $body)) {
                $updates['rtp'] = $body['rtp'] === null ? null : $this->safeNumber($body['rtp'], null);
            }
            $updates['updatedAt'] = MongoRepository::nowUtc();

            if (isset($updates['slug']) && $updates['slug'] !== ($existing['slug'] ?? null)) {
                $slugConflict = $this->db->findOne('casinogames', ['slug' => $updates['slug']]);
                if ($slugConflict !== null && (string) $slugConflict['_id'] !== (string) $existing['_id']) {
                    Response::json(['message' => 'Game slug already exists'], 409);
                    return;
                }
            }

            $this->db->updateOne('casinogames', ['_id' => MongoRepository::id($id)], $updates);
            $updated = $this->db->findOne('casinogames', ['_id' => MongoRepository::id($id)]);
            Response::json($this->toPublicGame($updated ?? array_merge($existing, $updates)));
        } catch (Throwable $e) {
            Response::json(['message' => 'Server error updating casino game'], 500);
        }
    }

    private function syncCasinoGamesFromProvider(): void
    {
        try {
            $actor = $this->protect();
            if ($actor === null) {
                return;
            }
            if (!$this->canManageCasino($actor)) {
                Response::json(['message' => 'User role ' . ($actor['role'] ?? 'unknown') . ' is not authorized to access this route'], 403);
                return;
            }

            $providerApiUrl = Env::get('CASINO_PROVIDER_API_URL', '');
            if ($providerApiUrl === '') {
                Response::json(['message' => 'CASINO_PROVIDER_API_URL is not configured'], 400);
                return;
            }

            $token = Env::get('CASINO_PROVIDER_API_TOKEN', '');
            $headers = [
                'Accept: application/json',
            ];
            if ($token !== '') {
                $headers[] = 'Authorization: Bearer ' . $token;
            }

            $ch = curl_init($providerApiUrl);
            if ($ch === false) {
                Response::json(['message' => 'Server error syncing casino games'], 500);
                return;
            }
            curl_setopt_array($ch, [
                CURLOPT_RETURNTRANSFER => true,
                CURLOPT_HTTPHEADER => $headers,
                CURLOPT_TIMEOUT => 20,
                CURLOPT_CONNECTTIMEOUT => 5,
            ]);
            $body = curl_exec($ch);
            $statusCode = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);
            $error = curl_error($ch);

            if ($body === false || $statusCode >= 400) {
                Response::json(['message' => 'Server error syncing casino games'], 500);
                return;
            }

            $decoded = json_decode((string) $body, true);
            $rawGames = [];
            if (is_array($decoded) && array_is_list($decoded)) {
                $rawGames = $decoded;
            } elseif (is_array($decoded) && is_array($decoded['games'] ?? null)) {
                $rawGames = $decoded['games'];
            }

            if (count($rawGames) === 0) {
                Response::json(['message' => 'Provider response contained no games'], 400);
                return;
            }

            $matched = 0;
            $modified = 0;
            $inserted = 0;

            foreach ($rawGames as $idx => $game) {
                if (!is_array($game)) {
                    continue;
                }
                if (!(isset($game['id']) || isset($game['externalGameId']) || isset($game['slug']) || isset($game['name']))) {
                    continue;
                }

                $provider = (string) ($game['provider'] ?? 'provider_api');
                $rawSlug = (string) ($game['slug'] ?? ($game['name'] ?? ($game['id'] ?? '')));
                $slug = strtolower(trim(preg_replace('/[^a-z0-9]+/i', '-', $rawSlug) ?? $rawSlug));
                $slug = trim($slug, '-');
                if ($slug === '') {
                    continue;
                }
                $externalGameId = $game['externalGameId'] ?? ($game['id'] ?? null);

                $existing = null;
                if ($externalGameId !== null) {
                    $existing = $this->db->findOne('casinogames', ['provider' => $provider, 'externalGameId' => (string) $externalGameId]);
                }
                if ($existing === null) {
                    $existing = $this->db->findOne('casinogames', ['slug' => $slug]);
                }

                $mapped = [
                    'provider' => $provider,
                    'externalGameId' => $externalGameId !== null ? (string) $externalGameId : null,
                    'name' => (string) ($game['name'] ?? $slug),
                    'slug' => $slug,
                    'category' => $this->normalizeCategory((string) ($game['category'] ?? 'lobby')),
                    'icon' => (string) ($game['icon'] ?? 'fa-solid fa-dice'),
                    'themeColor' => (string) ($game['themeColor'] ?? '#0f5db3'),
                    'imageUrl' => (string) ($game['imageUrl'] ?? ''),
                    'launchUrl' => (string) ($game['launchUrl'] ?? ''),
                    'minBet' => $this->safeNumber($game['minBet'] ?? null, 1),
                    'maxBet' => $this->safeNumber($game['maxBet'] ?? null, 100),
                    'rtp' => array_key_exists('rtp', $game) ? ($game['rtp'] === null ? null : $this->safeNumber($game['rtp'], null)) : null,
                    'volatility' => $game['volatility'] ?? null,
                    'tags' => is_array($game['tags'] ?? null) ? $game['tags'] : [],
                    'isFeatured' => (bool) ($game['isFeatured'] ?? false),
                    'status' => (string) ($game['status'] ?? 'active'),
                    'supportsDemo' => (bool) ($game['supportsDemo'] ?? false),
                    'sortOrder' => $this->safeNumber($game['sortOrder'] ?? null, $idx + 1),
                    'metadata' => is_array($game['metadata'] ?? null) ? $game['metadata'] : new stdClass(),
                    'updatedAt' => MongoRepository::nowUtc(),
                ];

                if ($existing === null) {
                    $mapped['createdAt'] = MongoRepository::nowUtc();
                    $this->db->insertOne('casinogames', $mapped);
                    $inserted++;
                } else {
                    $this->db->updateOne('casinogames', ['_id' => MongoRepository::id((string) $existing['_id'])], $mapped);
                    $matched++;
                    $modified++;
                }
            }

            Response::json([
                'message' => 'Casino games synced',
                'matched' => $matched,
                'modified' => $modified,
                'inserted' => $inserted,
            ]);
        } catch (Throwable $e) {
            Response::json(['message' => 'Server error syncing casino games'], 500);
        }
    }

    private function ensureCasinoSeeded(): void
    {
        if ($this->db->countDocuments('casinogames', []) > 0) {
            return;
        }

        $now = MongoRepository::nowUtc();
        foreach (self::DEFAULT_CASINO_GAMES as $idx => $game) {
            $this->db->insertOne('casinogames', [
                'externalGameId' => null,
                'provider' => (string) ($game['provider'] ?? 'internal'),
                'name' => (string) ($game['name'] ?? ('Game ' . ($idx + 1))),
                'slug' => (string) ($game['slug'] ?? ('game-' . ($idx + 1))),
                'category' => $this->normalizeCategory((string) ($game['category'] ?? 'lobby')),
                'icon' => (string) ($game['icon'] ?? 'fa-solid fa-dice'),
                'themeColor' => (string) ($game['themeColor'] ?? '#0f5db3'),
                'imageUrl' => (string) ($game['imageUrl'] ?? ''),
                'launchUrl' => (string) ($game['launchUrl'] ?? ''),
                'minBet' => $this->safeNumber($game['minBet'] ?? null, 1),
                'maxBet' => $this->safeNumber($game['maxBet'] ?? null, 100),
                'rtp' => isset($game['rtp']) ? $this->safeNumber($game['rtp'], null) : null,
                'volatility' => $game['volatility'] ?? null,
                'tags' => is_array($game['tags'] ?? null) ? $game['tags'] : [str_replace('_', ' ', (string) ($game['category'] ?? 'lobby')), 'live casino'],
                'isFeatured' => (bool) ($game['isFeatured'] ?? false),
                'sortOrder' => $idx + 1,
                'status' => 'active',
                'supportsDemo' => true,
                'metadata' => new stdClass(),
                'createdAt' => $now,
                'updatedAt' => $now,
            ]);
        }
    }

    private function toPublicGame(array $game): array
    {
        return [
            'id' => $game['_id'] ?? null,
            'externalGameId' => $game['externalGameId'] ?? null,
            'provider' => $game['provider'] ?? null,
            'name' => $game['name'] ?? null,
            'slug' => $game['slug'] ?? null,
            'category' => $game['category'] ?? null,
            'icon' => $game['icon'] ?? null,
            'themeColor' => $game['themeColor'] ?? null,
            'imageUrl' => $game['imageUrl'] ?? null,
            'minBet' => $game['minBet'] ?? null,
            'maxBet' => $game['maxBet'] ?? null,
            'rtp' => $game['rtp'] ?? null,
            'volatility' => $game['volatility'] ?? null,
            'tags' => is_array($game['tags'] ?? null) ? $game['tags'] : [],
            'isFeatured' => (bool) ($game['isFeatured'] ?? false),
            'status' => $game['status'] ?? null,
            'supportsDemo' => (bool) ($game['supportsDemo'] ?? false),
            'launchUrl' => (string) ($game['launchUrl'] ?? ''),
            'createdAt' => $game['createdAt'] ?? null,
            'updatedAt' => $game['updatedAt'] ?? null,
        ];
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

    private function canManageCasino(array $actor): bool
    {
        $role = (string) ($actor['role'] ?? '');
        return in_array($role, ['admin', 'agent', 'master_agent', 'super_agent'], true);
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

    private function normalizeCategory(string $value): string
    {
        $normalized = strtolower(trim($value === '' ? 'lobby' : $value));
        return in_array($normalized, self::CASINO_CATEGORIES, true) ? $normalized : 'lobby';
    }

    private function safeNumber(mixed $value, ?float $fallback = 0): ?float
    {
        if ($value === null && $fallback === null) {
            return null;
        }
        if (!is_numeric($value)) {
            return $fallback;
        }
        $parsed = (float) $value;
        if (!is_finite($parsed)) {
            return $fallback;
        }
        return $parsed;
    }
}
