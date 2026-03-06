<?php

declare(strict_types=1);


final class CasinoController
{
    private MongoRepository $db;
    private string $jwtSecret;

    private const CASINO_CATEGORIES = ['lobby', 'table_games', 'slots', 'video_poker', 'specialty_games'];
    private const BACCARAT_GAME_SLUG = 'baccarat';
    private const BACCARAT_SOURCE_TYPE = 'casino_baccarat';
    private const BACCARAT_RNG_VERSION = 'csprng-v1';
    private const REQUEST_ID_PATTERN = '/^[A-Za-z0-9_-]{8,128}$/';

    private const DEFAULT_CASINO_GAMES = [
        ['provider' => 'internal', 'name' => 'Single Hand ($1-$100)', 'slug' => 'single-hand-1-100', 'category' => 'table_games', 'minBet' => 1, 'maxBet' => 100, 'themeColor' => '#115e59', 'icon' => 'fa-solid fa-diamond', 'isFeatured' => true],
        ['provider' => 'internal', 'name' => 'Baccarat', 'slug' => 'baccarat', 'category' => 'table_games', 'minBet' => 1, 'maxBet' => 100, 'themeColor' => '#9f1239', 'icon' => 'fa-solid fa-gem', 'isFeatured' => true],
        ['provider' => 'internal', 'name' => 'Arabian Treasure', 'slug' => 'arabian-treasure', 'category' => 'slots', 'minBet' => 0.3, 'maxBet' => 30, 'themeColor' => '#7e22ce', 'icon' => 'fa-solid fa-scroll', 'isFeatured' => true],
        ['provider' => 'internal', 'name' => 'Jacks or Better', 'slug' => 'jacks-or-better', 'category' => 'video_poker', 'minBet' => 1, 'maxBet' => 100, 'themeColor' => '#be123c', 'icon' => 'fa-solid fa-cards'],
        ['provider' => 'internal', 'name' => 'Video Keno', 'slug' => 'video-keno', 'category' => 'specialty_games', 'minBet' => 1, 'maxBet' => 100, 'themeColor' => '#0ea5e9', 'icon' => 'fa-solid fa-table-cells-large'],
    ];

    public static function handleFallbackRoute(string $method, string $path, string $jwtSecret): bool
    {
        $actor = self::protectFallback($jwtSecret);
        if ($actor === null) {
            return true;
        }

        if ($method === 'GET' && $path === '/api/casino/categories') {
            $games = self::fallbackGames();
            $counts = [
                'table_games' => 0,
                'slots' => 0,
                'video_poker' => 0,
                'specialty_games' => 0,
            ];
            foreach ($games as $game) {
                if (($game['status'] ?? '') !== 'active') {
                    continue;
                }
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
                'fallback' => true,
            ]);
            return true;
        }

        if ($method === 'GET' && $path === '/api/casino/games') {
            $category = strtolower(trim((string) ($_GET['category'] ?? 'lobby')));
            $search = trim((string) ($_GET['search'] ?? ''));
            $featured = strtolower((string) ($_GET['featured'] ?? '')) === 'true';
            $page = max(1, (int) ($_GET['page'] ?? 1));
            $limit = min(100, max(1, (int) ($_GET['limit'] ?? 48)));
            $skip = ($page - 1) * $limit;

            $games = self::fallbackGames();
            if ($category !== '' && $category !== 'lobby') {
                $games = array_values(array_filter($games, static fn(array $g): bool => strtolower((string) ($g['category'] ?? '')) === $category));
            }
            if ($search !== '') {
                $needle = strtolower($search);
                $games = array_values(array_filter($games, static function (array $g) use ($needle): bool {
                    return str_contains(strtolower((string) ($g['name'] ?? '')), $needle)
                        || str_contains(strtolower((string) ($g['provider'] ?? '')), $needle)
                        || str_contains(strtolower((string) implode(' ', is_array($g['tags'] ?? null) ? $g['tags'] : [])), $needle);
                }));
            }
            if ($featured) {
                $games = array_values(array_filter($games, static fn(array $g): bool => (bool) ($g['isFeatured'] ?? false)));
            }

            $total = count($games);
            $paged = array_slice($games, $skip, $limit);

            Response::json([
                'games' => array_map([self::class, 'toPublicGameStatic'], $paged),
                'pagination' => [
                    'page' => $page,
                    'limit' => $limit,
                    'total' => $total,
                    'pages' => max(1, (int) ceil($total / max(1, $limit))),
                ],
                'fallback' => true,
            ]);
            return true;
        }

        if ($method === 'POST' && preg_match('#^/api/casino/games/([a-fA-F0-9]{24})/launch$#', $path, $m) === 1) {
            $id = strtolower($m[1]);
            $games = self::fallbackGames();
            $game = null;
            foreach ($games as $candidate) {
                if (strtolower((string) ($candidate['_id'] ?? '')) === $id) {
                    $game = $candidate;
                    break;
                }
            }

            if ($game === null) {
                Response::json(['message' => 'Casino game not found'], 404);
                return true;
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
                'game' => self::toPublicGameStatic($game),
                'launchUrl' => $launchUrl,
                'fallback' => true,
            ]);
            return true;
        }

        return false;
    }

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

        // ── In-house game betting ──────────────────────────
        if ($method === 'POST' && $path === '/api/casino/bet') {
            $this->placeCasinoBet();
            return true;
        }
        if ($method === 'GET' && preg_match('#^/api/casino/bet/([a-fA-F0-9]{24})$#', $path, $m) === 1) {
            $this->getCasinoBetByRoundId(strtolower($m[1]));
            return true;
        }
        if ($method === 'GET' && $path === '/api/casino/bet/history') {
            $this->getCasinoBetHistory();
            return true;
        }
        if ($method === 'GET' && $path === '/api/admin/casino/bets') {
            $this->getAdminCasinoBets();
            return true;
        }
        if ($method === 'GET' && preg_match('#^/api/admin/casino/bets/([a-fA-F0-9]{24})$#', $path, $m) === 1) {
            $this->getAdminCasinoBetByRoundId(strtolower($m[1]));
            return true;
        }
        if ($method === 'GET' && $path === '/api/admin/casino/summary') {
            $this->getAdminCasinoSummary();
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

    // ════════════════════════════════════════════════════════
    //  IN-HOUSE BACCARAT BETTING
    // ════════════════════════════════════════════════════════

    private function placeCasinoBet(): void
    {
        $startedAt = microtime(true);
        $requestId = '';
        $userId = '';

        try {
            if (RateLimiter::enforce($this->db, 'casino_baccarat_bet', 30, 60)) {
                return;
            }

            $actor = $this->protect();
            if ($actor === null) {
                return;
            }

            $accessError = $this->casinoAccessError($actor, true);
            if ($accessError !== null) {
                Response::json(['message' => $accessError], 403);
                return;
            }

            $body = Http::jsonBody();
            $requestId = trim((string) ($body['requestId'] ?? ''));
            if (preg_match(self::REQUEST_ID_PATTERN, $requestId) !== 1) {
                Response::json(['message' => 'requestId is required and must be 8-128 characters (letters, numbers, "_" or "-")'], 400);
                return;
            }

            $game = strtolower(trim((string) ($body['game'] ?? '')));
            if ($game !== self::BACCARAT_GAME_SLUG) {
                Response::json(['message' => 'Unsupported game: ' . $game], 400);
                return;
            }

            $bets = is_array($body['bets'] ?? null) ? $body['bets'] : [];
            $playerBet = $this->parseMoneyValue($bets['Player'] ?? 0, 'bets.Player');
            $bankerBet = $this->parseMoneyValue($bets['Banker'] ?? 0, 'bets.Banker');
            $tieBet = $this->parseMoneyValue($bets['Tie'] ?? 0, 'bets.Tie');
            $totalWager = round($playerBet + $bankerBet + $tieBet, 2);

            if ($totalWager <= 0) {
                Response::json(['message' => 'No bets placed'], 400);
                return;
            }

            [$gameMinBet, $gameMaxBet] = $this->resolveGameBetLimits(self::BACCARAT_GAME_SLUG, 1.0, 100.0);
            if ($totalWager < $gameMinBet) {
                Response::json(['message' => 'Minimum baccarat wager is $' . number_format($gameMinBet, 2)], 400);
                return;
            }
            if ($totalWager > $gameMaxBet) {
                Response::json(['message' => 'Maximum baccarat wager is $' . number_format($gameMaxBet, 2)], 400);
                return;
            }

            $userId = (string) ($actor['_id'] ?? '');
            $this->db->beginTransaction();
            try {
                $lockedUser = $this->db->findOneForUpdate('users', ['_id' => MongoRepository::id($userId)]);
                if ($lockedUser === null) {
                    $this->db->rollback();
                    Response::json(['message' => 'User not found'], 404);
                    return;
                }

                $lockedAccessError = $this->casinoAccessError($lockedUser, true);
                if ($lockedAccessError !== null) {
                    $this->db->rollback();
                    Response::json(['message' => $lockedAccessError], 403);
                    return;
                }

                $existingRound = $this->db->findOne('casino_bets', [
                    'userId' => $userId,
                    'requestId' => $requestId,
                ]);
                if ($existingRound !== null) {
                    $roundId = (string) ($existingRound['roundId'] ?? $existingRound['_id'] ?? '');
                    $ledgerEntries = $this->findRoundLedgerEntries($roundId);
                    $this->writeCasinoAuditLog('baccarat_round_idempotent', [
                        'requestId' => $requestId,
                        'roundId' => $roundId,
                        'userId' => $userId,
                        'username' => (string) ($lockedUser['username'] ?? ''),
                        'idempotent' => true,
                    ]);
                    $this->db->commit();
                    Response::json($this->formatCasinoBetResponse($existingRound, $ledgerEntries, true));
                    return;
                }

                $userMinBet = $this->safeNumber($lockedUser['minBet'] ?? null, null);
                $userMaxBet = $this->safeNumber($lockedUser['maxBet'] ?? null, null);
                if ($userMinBet !== null && $userMinBet > 0 && $totalWager < $userMinBet) {
                    $this->db->rollback();
                    Response::json(['message' => 'Minimum bet for your account is $' . number_format($userMinBet, 2)], 400);
                    return;
                }
                if ($userMaxBet !== null && $userMaxBet > 0 && $totalWager > $userMaxBet) {
                    $this->db->rollback();
                    Response::json(['message' => 'Maximum bet for your account is $' . number_format($userMaxBet, 2)], 400);
                    return;
                }

                $balanceBefore = round($this->num($lockedUser['balance'] ?? 0), 2);
                $pendingBalance = round($this->num($lockedUser['pendingBalance'] ?? 0), 2);
                $availableBalance = round(max(0, $balanceBefore - $pendingBalance), 2);
                if ($totalWager > $availableBalance) {
                    $this->db->rollback();
                    Response::json(['message' => 'Insufficient balance. Available: $' . number_format($availableBalance, 2)], 400);
                    return;
                }

                $roundId = $this->newRoundId();
                $roundData = $this->dealBaccaratRound();
                $result = (string) ($roundData['result'] ?? 'Tie');
                $payout = $this->calculateBaccaratPayout($playerBet, $bankerBet, $tieBet, $result);

                $totalReturn = $payout['totalReturn'];
                $profit = $payout['profit'];
                $netResult = $payout['netResult'];

                $balanceAfterDebit = round($balanceBefore - $totalWager, 2);
                $balanceAfter = round($balanceAfterDebit + $totalReturn, 2);

                $now = MongoRepository::nowUtc();
                $ipAddress = IpUtils::clientIp();
                $userAgent = Http::header('user-agent') !== '' ? Http::header('user-agent') : null;

                $debitEntry = [
                    'userId' => $userId,
                    'amount' => $totalWager,
                    'type' => 'casino_bet_debit',
                    'entrySide' => 'DEBIT',
                    'entryGroupId' => $roundId,
                    'sourceType' => self::BACCARAT_SOURCE_TYPE,
                    'sourceId' => $roundId,
                    'status' => 'completed',
                    'balanceBefore' => $balanceBefore,
                    'balanceAfter' => $balanceAfterDebit,
                    'referenceType' => 'CasinoRound',
                    'referenceId' => $roundId,
                    'reason' => 'CASINO_BACCARAT_WAGER',
                    'description' => 'Baccarat wager charged',
                    'ipAddress' => $ipAddress,
                    'userAgent' => $userAgent,
                    'createdAt' => $now,
                    'updatedAt' => $now,
                ];
                $debitEntryId = $this->db->insertOne('transactions', $debitEntry);

                $creditEntry = [
                    'userId' => $userId,
                    'amount' => $totalReturn,
                    'type' => 'casino_bet_credit',
                    'entrySide' => 'CREDIT',
                    'entryGroupId' => $roundId,
                    'sourceType' => self::BACCARAT_SOURCE_TYPE,
                    'sourceId' => $roundId,
                    'status' => 'completed',
                    'balanceBefore' => $balanceAfterDebit,
                    'balanceAfter' => $balanceAfter,
                    'referenceType' => 'CasinoRound',
                    'referenceId' => $roundId,
                    'reason' => 'CASINO_BACCARAT_PAYOUT',
                    'description' => 'Baccarat payout/refund credited',
                    'ipAddress' => $ipAddress,
                    'userAgent' => $userAgent,
                    'createdAt' => $now,
                    'updatedAt' => $now,
                ];
                $creditEntryId = $this->db->insertOne('transactions', $creditEntry);

                $this->db->updateOne('users', ['_id' => MongoRepository::id($userId)], [
                    'balance' => $balanceAfter,
                    'updatedAt' => $now,
                ]);

                $deckCodes = is_array($roundData['deckCodes'] ?? null) ? $roundData['deckCodes'] : [];
                $deckHash = hash('sha256', implode(',', $deckCodes));
                $serverDecisionAt = MongoRepository::nowUtc();
                $latencyMs = max(0, (int) round((microtime(true) - $startedAt) * 1000));
                $integrityHash = $this->buildIntegrityHash([
                    'roundId' => $roundId,
                    'requestId' => $requestId,
                    'userId' => $userId,
                    'game' => self::BACCARAT_GAME_SLUG,
                    'bets' => ['Player' => $playerBet, 'Banker' => $bankerBet, 'Tie' => $tieBet],
                    'playerCards' => $roundData['playerCards'] ?? [],
                    'bankerCards' => $roundData['bankerCards'] ?? [],
                    'playerTotal' => $roundData['playerTotal'] ?? 0,
                    'bankerTotal' => $roundData['bankerTotal'] ?? 0,
                    'result' => $result,
                    'totalWager' => $totalWager,
                    'totalReturn' => $totalReturn,
                    'balanceBefore' => $balanceBefore,
                    'balanceAfter' => $balanceAfter,
                    'deckHash' => $deckHash,
                    'serverDecisionAt' => $serverDecisionAt,
                ]);

                $betRecord = [
                    '_id' => $roundId,
                    'roundId' => $roundId,
                    'requestId' => $requestId,
                    'userId' => $userId,
                    'username' => (string) ($lockedUser['username'] ?? $actor['username'] ?? ''),
                    'game' => self::BACCARAT_GAME_SLUG,
                    'bets' => ['Player' => $playerBet, 'Banker' => $bankerBet, 'Tie' => $tieBet],
                    'totalWager' => $totalWager,
                    'playerCards' => $roundData['playerCards'] ?? [],
                    'bankerCards' => $roundData['bankerCards'] ?? [],
                    'playerTotal' => (int) ($roundData['playerTotal'] ?? 0),
                    'bankerTotal' => (int) ($roundData['bankerTotal'] ?? 0),
                    'result' => $result,
                    'totalReturn' => $totalReturn,
                    'profit' => $profit,
                    'netResult' => $netResult,
                    'balanceBefore' => $balanceBefore,
                    'balanceAfter' => $balanceAfter,
                    'ledgerEntries' => ['debit' => $debitEntryId, 'credit' => $creditEntryId],
                    'rngVersion' => self::BACCARAT_RNG_VERSION,
                    'deckHash' => $deckHash,
                    'integrityHash' => $integrityHash,
                    'serverDecisionAt' => $serverDecisionAt,
                    'latencyMs' => $latencyMs,
                    'roundStatus' => 'settled',
                    'createdAt' => $now,
                    'updatedAt' => $now,
                ];
                $this->db->insertOne('casino_bets', $betRecord);

                $this->db->insertOne('casino_round_audit', [
                    '_id' => $roundId,
                    'roundId' => $roundId,
                    'requestId' => $requestId,
                    'userId' => $userId,
                    'game' => self::BACCARAT_GAME_SLUG,
                    'rngVersion' => self::BACCARAT_RNG_VERSION,
                    'deckCodes' => $deckCodes,
                    'deckHash' => $deckHash,
                    'integrityHash' => $integrityHash,
                    'playerCards' => $roundData['playerCards'] ?? [],
                    'bankerCards' => $roundData['bankerCards'] ?? [],
                    'result' => $result,
                    'createdAt' => $now,
                    'updatedAt' => $now,
                ]);

                $this->db->commit();

                $ledgerEntries = [
                    array_merge($debitEntry, ['_id' => $debitEntryId]),
                    array_merge($creditEntry, ['_id' => $creditEntryId]),
                ];
                $this->writeCasinoAuditLog('baccarat_round_settled', [
                    'requestId' => $requestId,
                    'roundId' => $roundId,
                    'userId' => $userId,
                    'username' => (string) ($lockedUser['username'] ?? ''),
                    'wager' => $totalWager,
                    'totalReturn' => $totalReturn,
                    'netResult' => $netResult,
                    'balanceBefore' => $balanceBefore,
                    'balanceAfter' => $balanceAfter,
                    'result' => $result,
                ]);
                Response::json($this->formatCasinoBetResponse($betRecord, $ledgerEntries, false));
            } catch (Throwable $txErr) {
                $this->db->rollback();
                throw $txErr;
            }
        } catch (InvalidArgumentException $e) {
            $this->writeCasinoAuditLog('baccarat_round_validation_error', [
                'requestId' => $requestId !== '' ? $requestId : null,
                'userId' => $userId !== '' ? $userId : null,
                'error' => $e->getMessage(),
            ]);
            Response::json(['message' => $e->getMessage()], 400);
        } catch (Throwable $e) {
            $this->writeCasinoAuditLog('baccarat_round_server_error', [
                'requestId' => $requestId !== '' ? $requestId : null,
                'userId' => $userId !== '' ? $userId : null,
                'error' => $e->getMessage(),
            ]);
            Response::json(['message' => 'Server error placing casino bet', 'error' => $e->getMessage()], 500);
        }
    }

    private function getCasinoBetHistory(): void
    {
        try {
            $actor = $this->protect();
            if ($actor === null) {
                return;
            }

            $page = max(1, (int) ($_GET['page'] ?? 1));
            $limit = min(100, max(1, (int) ($_GET['limit'] ?? 20)));
            $skip = ($page - 1) * $limit;
            $result = trim((string) ($_GET['result'] ?? ''));
            $fromRaw = trim((string) ($_GET['from'] ?? ''));
            $toRaw = trim((string) ($_GET['to'] ?? ''));
            $minWagerRaw = $_GET['minWager'] ?? null;
            $maxWagerRaw = $_GET['maxWager'] ?? null;

            $query = ['userId' => (string) ($actor['_id'] ?? '')];
            if ($result !== '') {
                $normalizedResult = ucfirst(strtolower($result));
                if (!in_array($normalizedResult, ['Player', 'Banker', 'Tie'], true)) {
                    Response::json(['message' => 'Invalid result filter'], 400);
                    return;
                }
                $query['result'] = $normalizedResult;
            }

            if ($fromRaw !== '') {
                $fromDt = date_create_immutable($fromRaw);
                if ($fromDt === false) {
                    Response::json(['message' => 'Invalid from date'], 400);
                    return;
                }
                $query['createdAt']['$gte'] = $fromDt->format(DATE_ATOM);
            }
            if ($toRaw !== '') {
                $toDt = date_create_immutable($toRaw);
                if ($toDt === false) {
                    Response::json(['message' => 'Invalid to date'], 400);
                    return;
                }
                $query['createdAt']['$lte'] = $toDt->format(DATE_ATOM);
            }

            $minWager = $this->parseOptionalMoneyFilter($minWagerRaw, 'minWager');
            $maxWager = $this->parseOptionalMoneyFilter($maxWagerRaw, 'maxWager');
            if ($minWager !== null) {
                $query['totalWager']['$gte'] = $minWager;
            }
            if ($maxWager !== null) {
                $query['totalWager']['$lte'] = $maxWager;
            }

            $total = $this->db->countDocuments('casino_bets', $query);
            $bets = $this->db->findMany('casino_bets', $query, [
                'sort' => ['createdAt' => -1],
                'skip' => $skip,
                'limit' => $limit,
            ]);

            $mapped = array_map(fn (array $bet): array => $this->mapCasinoBetRow($bet), $bets);

            Response::json([
                'bets' => $mapped,
                'pagination' => [
                    'page' => $page,
                    'limit' => $limit,
                    'total' => $total,
                    'pages' => max(1, (int) ceil($total / max(1, $limit))),
                ],
            ]);
        } catch (InvalidArgumentException $e) {
            Response::json(['message' => $e->getMessage()], 400);
        } catch (Throwable $e) {
            Response::json(['message' => 'Server error fetching casino bet history'], 500);
        }
    }

    private function getCasinoBetByRoundId(string $roundId): void
    {
        try {
            $actor = $this->protect();
            if ($actor === null) {
                return;
            }

            $bet = $this->db->findOne('casino_bets', [
                'roundId' => $roundId,
                'userId' => (string) ($actor['_id'] ?? ''),
            ]);
            if ($bet === null) {
                $bet = $this->db->findOne('casino_bets', [
                    '_id' => $roundId,
                    'userId' => (string) ($actor['_id'] ?? ''),
                ]);
            }
            if ($bet === null) {
                Response::json(['message' => 'Casino round not found'], 404);
                return;
            }

            $resolvedRoundId = (string) ($bet['roundId'] ?? $bet['_id'] ?? $roundId);
            $audit = $this->db->findOne('casino_round_audit', ['roundId' => $resolvedRoundId]);
            $ledgerEntries = $this->findRoundLedgerEntries($resolvedRoundId);

            Response::json([
                'bet' => $this->mapCasinoBetDetail($bet, $ledgerEntries, $audit),
            ]);
        } catch (Throwable $e) {
            Response::json(['message' => 'Server error fetching casino round details'], 500);
        }
    }

    private function getAdminCasinoBets(): void
    {
        try {
            $actor = $this->protect();
            if ($actor === null) {
                return;
            }
            if (!$this->canManageCasino($actor)) {
                Response::json(['message' => 'Not authorized'], 403);
                return;
            }

            $page = max(1, (int) ($_GET['page'] ?? 1));
            $limit = min(250, max(1, (int) ($_GET['limit'] ?? 50)));
            $skip = ($page - 1) * $limit;
            $result = trim((string) ($_GET['result'] ?? ''));
            $fromRaw = trim((string) ($_GET['from'] ?? ''));
            $toRaw = trim((string) ($_GET['to'] ?? ''));
            $username = trim((string) ($_GET['username'] ?? ''));
            $userId = trim((string) ($_GET['userId'] ?? ''));
            $minWagerRaw = $_GET['minWager'] ?? null;
            $maxWagerRaw = $_GET['maxWager'] ?? null;
            $format = strtolower(trim((string) ($_GET['format'] ?? 'json')));

            $query = [];
            if ($result !== '') {
                $normalizedResult = ucfirst(strtolower($result));
                if (!in_array($normalizedResult, ['Player', 'Banker', 'Tie'], true)) {
                    Response::json(['message' => 'Invalid result filter'], 400);
                    return;
                }
                $query['result'] = $normalizedResult;
            }
            if ($fromRaw !== '') {
                $fromDt = date_create_immutable($fromRaw);
                if ($fromDt === false) {
                    Response::json(['message' => 'Invalid from date'], 400);
                    return;
                }
                $query['createdAt']['$gte'] = $fromDt->format(DATE_ATOM);
            }
            if ($toRaw !== '') {
                $toDt = date_create_immutable($toRaw);
                if ($toDt === false) {
                    Response::json(['message' => 'Invalid to date'], 400);
                    return;
                }
                $query['createdAt']['$lte'] = $toDt->format(DATE_ATOM);
            }
            if ($username !== '') {
                $query['username'] = ['$regex' => $username, '$options' => 'i'];
            }
            if ($userId !== '') {
                $query['userId'] = $userId;
            }
            $minWager = $this->parseOptionalMoneyFilter($minWagerRaw, 'minWager');
            $maxWager = $this->parseOptionalMoneyFilter($maxWagerRaw, 'maxWager');
            if ($minWager !== null) {
                $query['totalWager']['$gte'] = $minWager;
            }
            if ($maxWager !== null) {
                $query['totalWager']['$lte'] = $maxWager;
            }

            if ($format === 'csv') {
                $csvRows = $this->db->findMany('casino_bets', $query, [
                    'sort' => ['createdAt' => -1],
                    'limit' => min(5000, max(1, (int) ($_GET['csvLimit'] ?? 2000))),
                ]);
                $this->outputCasinoBetsCsv($csvRows);
                return;
            }

            $total = $this->db->countDocuments('casino_bets', $query);
            $rows = $this->db->findMany('casino_bets', $query, [
                'sort' => ['createdAt' => -1],
                'skip' => $skip,
                'limit' => $limit,
            ]);
            $mapped = array_map(fn (array $row): array => $this->mapCasinoBetRow($row), $rows);

            Response::json([
                'bets' => $mapped,
                'pagination' => [
                    'page' => $page,
                    'limit' => $limit,
                    'total' => $total,
                    'pages' => max(1, (int) ceil($total / max(1, $limit))),
                ],
            ]);
        } catch (InvalidArgumentException $e) {
            Response::json(['message' => $e->getMessage()], 400);
        } catch (Throwable $e) {
            Response::json(['message' => 'Server error fetching admin casino bets'], 500);
        }
    }

    private function getAdminCasinoBetByRoundId(string $roundId): void
    {
        try {
            $actor = $this->protect();
            if ($actor === null) {
                return;
            }
            if (!$this->canManageCasino($actor)) {
                Response::json(['message' => 'Not authorized'], 403);
                return;
            }

            $bet = $this->db->findOne('casino_bets', ['roundId' => $roundId]);
            if ($bet === null) {
                $bet = $this->db->findOne('casino_bets', ['_id' => $roundId]);
            }
            if ($bet === null) {
                Response::json(['message' => 'Casino round not found'], 404);
                return;
            }

            $resolvedRoundId = (string) ($bet['roundId'] ?? $bet['_id'] ?? $roundId);
            $audit = $this->db->findOne('casino_round_audit', ['roundId' => $resolvedRoundId]);
            $ledgerEntries = $this->findRoundLedgerEntries($resolvedRoundId);

            Response::json([
                'bet' => $this->mapCasinoBetDetail($bet, $ledgerEntries, $audit),
            ]);
        } catch (Throwable $e) {
            Response::json(['message' => 'Server error fetching admin casino bet detail'], 500);
        }
    }

    private function getAdminCasinoSummary(): void
    {
        try {
            $actor = $this->protect();
            if ($actor === null) {
                return;
            }
            if (!$this->canManageCasino($actor)) {
                Response::json(['message' => 'Not authorized'], 403);
                return;
            }

            $fromRaw = trim((string) ($_GET['from'] ?? ''));
            $toRaw = trim((string) ($_GET['to'] ?? ''));
            $sampleLimit = min(20000, max(1, (int) ($_GET['limit'] ?? 5000)));

            $query = [];
            if ($fromRaw !== '') {
                $fromDt = date_create_immutable($fromRaw);
                if ($fromDt === false) {
                    Response::json(['message' => 'Invalid from date'], 400);
                    return;
                }
                $query['createdAt']['$gte'] = $fromDt->format(DATE_ATOM);
            }
            if ($toRaw !== '') {
                $toDt = date_create_immutable($toRaw);
                if ($toDt === false) {
                    Response::json(['message' => 'Invalid to date'], 400);
                    return;
                }
                $query['createdAt']['$lte'] = $toDt->format(DATE_ATOM);
            }

            $rows = $this->db->findMany('casino_bets', $query, [
                'sort' => ['createdAt' => -1],
                'limit' => $sampleLimit,
            ]);

            $totalWager = 0.0;
            $totalReturn = 0.0;
            $totalProfit = 0.0;
            $playerWins = 0;
            $bankerWins = 0;
            $ties = 0;
            $errors = 0;
            $netByUser = [];

            foreach ($rows as $row) {
                $totalWager += $this->num($row['totalWager'] ?? 0);
                $totalReturn += $this->num($row['totalReturn'] ?? 0);
                $totalProfit += $this->num($row['profit'] ?? 0);

                $result = (string) ($row['result'] ?? '');
                if ($result === 'Player') {
                    $playerWins++;
                } elseif ($result === 'Banker') {
                    $bankerWins++;
                } elseif ($result === 'Tie') {
                    $ties++;
                }

                if ((string) ($row['roundStatus'] ?? 'settled') !== 'settled') {
                    $errors++;
                }

                $username = (string) ($row['username'] ?? 'unknown');
                $netByUser[$username] = ($netByUser[$username] ?? 0.0) + $this->num($row['netResult'] ?? 0);
            }

            arsort($netByUser);
            $topWinners = [];
            foreach (array_slice($netByUser, 0, 5, true) as $username => $net) {
                $topWinners[] = ['username' => $username, 'netResult' => round((float) $net, 2)];
            }

            asort($netByUser);
            $topLosers = [];
            foreach (array_slice($netByUser, 0, 5, true) as $username => $net) {
                $topLosers[] = ['username' => $username, 'netResult' => round((float) $net, 2)];
            }

            $rounds = count($rows);
            $grossGamingRevenue = round($totalWager - $totalReturn, 2);
            $payoutRatio = $totalWager > 0 ? round(($totalReturn / $totalWager) * 100, 2) : 0.0;
            $errorRate = $rounds > 0 ? round(($errors / $rounds) * 100, 4) : 0.0;

            Response::json([
                'summary' => [
                    'rounds' => $rounds,
                    'totalWager' => round($totalWager, 2),
                    'totalReturn' => round($totalReturn, 2),
                    'playerProfit' => round($totalProfit, 2),
                    'grossGamingRevenue' => $grossGamingRevenue,
                    'payoutRatio' => $payoutRatio,
                    'houseEdgePercent' => round(100 - $payoutRatio, 2),
                    'playerWins' => $playerWins,
                    'bankerWins' => $bankerWins,
                    'ties' => $ties,
                    'errorRate' => $errorRate,
                ],
                'topWinners' => $topWinners,
                'topLosers' => $topLosers,
                'window' => [
                    'from' => $fromRaw !== '' ? $fromRaw : null,
                    'to' => $toRaw !== '' ? $toRaw : null,
                    'sampleSize' => $sampleLimit,
                ],
            ]);
        } catch (Throwable $e) {
            Response::json(['message' => 'Server error fetching casino summary'], 500);
        }
    }

    private function outputCasinoBetsCsv(array $rows): void
    {
        http_response_code(200);
        header('Content-Type: text/csv; charset=utf-8');
        header('Content-Disposition: attachment; filename="casino-bets-' . gmdate('Ymd-His') . '.csv"');

        $stream = fopen('php://output', 'w');
        if ($stream === false) {
            return;
        }

        fputcsv($stream, [
            'roundId',
            'requestId',
            'userId',
            'username',
            'result',
            'playerBet',
            'bankerBet',
            'tieBet',
            'totalWager',
            'totalReturn',
            'profit',
            'netResult',
            'balanceBefore',
            'balanceAfter',
            'createdAt',
            'integrityHash',
        ]);

        foreach ($rows as $row) {
            $bets = is_array($row['bets'] ?? null) ? $row['bets'] : [];
            fputcsv($stream, [
                (string) ($row['roundId'] ?? $row['_id'] ?? ''),
                (string) ($row['requestId'] ?? ''),
                (string) ($row['userId'] ?? ''),
                (string) ($row['username'] ?? ''),
                (string) ($row['result'] ?? ''),
                $this->num($bets['Player'] ?? 0),
                $this->num($bets['Banker'] ?? 0),
                $this->num($bets['Tie'] ?? 0),
                $this->num($row['totalWager'] ?? 0),
                $this->num($row['totalReturn'] ?? 0),
                $this->num($row['profit'] ?? 0),
                $this->num($row['netResult'] ?? 0),
                $this->num($row['balanceBefore'] ?? 0),
                $this->num($row['balanceAfter'] ?? 0),
                (string) ($row['createdAt'] ?? ''),
                (string) ($row['integrityHash'] ?? ''),
            ]);
        }

        fclose($stream);
    }

    // ── Baccarat helpers ──────────────────────────────────

    /** @return array<int, array{r: string, s: string, code: string}> */
    private function buildShuffledDeck(): array
    {
        $suits = ['H', 'D', 'C', 'S'];
        $ranks = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
        $deck = [];
        foreach ($suits as $s) {
            foreach ($ranks as $r) {
                $deck[] = ['r' => $r, 's' => $s, 'code' => $r . $s];
            }
        }

        // Fisher-Yates shuffle backed by CSPRNG.
        for ($i = count($deck) - 1; $i > 0; $i--) {
            $j = random_int(0, $i);
            [$deck[$i], $deck[$j]] = [$deck[$j], $deck[$i]];
        }

        return $deck;
    }

    /**
     * @return array{
     *   deckCodes: array<int, string>,
     *   playerCards: array<int, string>,
     *   bankerCards: array<int, string>,
     *   playerTotal: int,
     *   bankerTotal: int,
     *   result: string
     * }
     */
    private function dealBaccaratRound(): array
    {
        $deck = $this->buildShuffledDeck();
        $deckCodes = array_map(static fn(array $card): string => (string) ($card['code'] ?? ''), $deck);

        $playerCards = [];
        $bankerCards = [];

        // Initial 4-card deal: P B P B
        $playerCards[] = array_pop($deck);
        $bankerCards[] = array_pop($deck);
        $playerCards[] = array_pop($deck);
        $bankerCards[] = array_pop($deck);

        $pTotal = $this->baccaratHandValue($playerCards);
        $bTotal = $this->baccaratHandValue($bankerCards);

        $playerDrew = false;
        $playerThirdValue = null;

        if ($pTotal < 8 && $bTotal < 8) {
            if ($pTotal <= 5) {
                $pThird = array_pop($deck);
                $playerCards[] = $pThird;
                $playerDrew = true;
                $playerThirdValue = $this->baccaratCardPoint($pThird);
            }

            $bTotalNow = $this->baccaratHandValue($bankerCards);
            if (!$playerDrew) {
                if ($bTotalNow <= 5) {
                    $bankerCards[] = array_pop($deck);
                }
            } else {
                $p3 = (int) $playerThirdValue;
                if ($bTotalNow <= 2) {
                    $bankerCards[] = array_pop($deck);
                } elseif ($bTotalNow === 3 && $p3 !== 8) {
                    $bankerCards[] = array_pop($deck);
                } elseif ($bTotalNow === 4 && $p3 >= 2 && $p3 <= 7) {
                    $bankerCards[] = array_pop($deck);
                } elseif ($bTotalNow === 5 && $p3 >= 4 && $p3 <= 7) {
                    $bankerCards[] = array_pop($deck);
                } elseif ($bTotalNow === 6 && ($p3 === 6 || $p3 === 7)) {
                    $bankerCards[] = array_pop($deck);
                }
            }
        }

        $pFinal = $this->baccaratHandValue($playerCards);
        $bFinal = $this->baccaratHandValue($bankerCards);
        $result = 'Tie';
        if ($pFinal > $bFinal) {
            $result = 'Player';
        } elseif ($bFinal > $pFinal) {
            $result = 'Banker';
        }

        return [
            'deckCodes' => $deckCodes,
            'playerCards' => array_values(array_map(static fn(array $c): string => (string) ($c['code'] ?? ''), $playerCards)),
            'bankerCards' => array_values(array_map(static fn(array $c): string => (string) ($c['code'] ?? ''), $bankerCards)),
            'playerTotal' => $pFinal,
            'bankerTotal' => $bFinal,
            'result' => $result,
        ];
    }

    private function calculateBaccaratPayout(float $playerBet, float $bankerBet, float $tieBet, string $result): array
    {
        $totalWager = round($playerBet + $bankerBet + $tieBet, 2);
        $totalReturn = 0.0;
        $profit = 0.0;

        if ($result === 'Player') {
            if ($playerBet > 0) {
                $totalReturn += $playerBet * 2;
                $profit += $playerBet;
            }
        } elseif ($result === 'Banker') {
            if ($bankerBet > 0) {
                $totalReturn += $bankerBet * 1.95;
                $profit += $bankerBet * 0.95;
            }
        } else {
            if ($tieBet > 0) {
                $totalReturn += $tieBet * 9;
                $profit += $tieBet * 8;
            }
            if ($playerBet > 0) {
                $totalReturn += $playerBet;
            }
            if ($bankerBet > 0) {
                $totalReturn += $bankerBet;
            }
        }

        $totalReturn = round($totalReturn, 2);
        $profit = round($profit, 2);
        $netResult = round($totalReturn - $totalWager, 2);

        return [
            'totalReturn' => $totalReturn,
            'profit' => $profit,
            'netResult' => $netResult,
        ];
    }

    private function findRoundLedgerEntries(string $roundId): array
    {
        if ($roundId === '') {
            return [];
        }

        $entries = $this->db->findMany('transactions', [
            'entryGroupId' => $roundId,
        ], [
            'sort' => ['createdAt' => 1],
            'limit' => 50,
        ]);

        usort($entries, static function (array $a, array $b): int {
            $sideA = strtoupper((string) ($a['entrySide'] ?? ''));
            $sideB = strtoupper((string) ($b['entrySide'] ?? ''));
            $priority = ['DEBIT' => 1, 'CREDIT' => 2];
            $sideCmp = ($priority[$sideA] ?? 99) <=> ($priority[$sideB] ?? 99);
            if ($sideCmp !== 0) {
                return $sideCmp;
            }

            $tsA = (string) ($a['createdAt'] ?? '');
            $tsB = (string) ($b['createdAt'] ?? '');
            $tsCmp = strcmp($tsA, $tsB);
            if ($tsCmp !== 0) {
                return $tsCmp;
            }

            return strcmp((string) ($a['_id'] ?? ''), (string) ($b['_id'] ?? ''));
        });

        return $entries;
    }

    private function mapLedgerEntry(array $entry): array
    {
        return [
            'id' => (string) ($entry['_id'] ?? ''),
            'entrySide' => (string) ($entry['entrySide'] ?? ''),
            'type' => (string) ($entry['type'] ?? ''),
            'status' => (string) ($entry['status'] ?? ''),
            'amount' => $this->num($entry['amount'] ?? 0),
            'balanceBefore' => $this->num($entry['balanceBefore'] ?? 0),
            'balanceAfter' => $this->num($entry['balanceAfter'] ?? 0),
            'reason' => $entry['reason'] ?? null,
            'description' => $entry['description'] ?? null,
            'createdAt' => $entry['createdAt'] ?? null,
        ];
    }

    private function mapCasinoBetRow(array $bet): array
    {
        return [
            'id' => (string) ($bet['_id'] ?? ''),
            'roundId' => (string) ($bet['roundId'] ?? $bet['_id'] ?? ''),
            'requestId' => (string) ($bet['requestId'] ?? ''),
            'userId' => (string) ($bet['userId'] ?? ''),
            'username' => (string) ($bet['username'] ?? ''),
            'game' => (string) ($bet['game'] ?? ''),
            'bets' => is_array($bet['bets'] ?? null) ? $bet['bets'] : [],
            'playerTotal' => (int) ($bet['playerTotal'] ?? 0),
            'bankerTotal' => (int) ($bet['bankerTotal'] ?? 0),
            'result' => (string) ($bet['result'] ?? ''),
            'totalWager' => $this->num($bet['totalWager'] ?? 0),
            'totalReturn' => $this->num($bet['totalReturn'] ?? 0),
            'profit' => $this->num($bet['profit'] ?? 0),
            'netResult' => $this->num($bet['netResult'] ?? 0),
            'balanceBefore' => $this->num($bet['balanceBefore'] ?? 0),
            'balanceAfter' => $this->num($bet['balanceAfter'] ?? 0),
            'rngVersion' => (string) ($bet['rngVersion'] ?? ''),
            'deckHash' => (string) ($bet['deckHash'] ?? ''),
            'integrityHash' => (string) ($bet['integrityHash'] ?? ''),
            'serverDecisionAt' => $bet['serverDecisionAt'] ?? null,
            'latencyMs' => (int) ($bet['latencyMs'] ?? 0),
            'createdAt' => $bet['createdAt'] ?? null,
        ];
    }

    private function mapCasinoBetDetail(array $bet, array $ledgerEntries, ?array $audit): array
    {
        $row = $this->mapCasinoBetRow($bet);
        $row['playerCards'] = is_array($bet['playerCards'] ?? null) ? $bet['playerCards'] : [];
        $row['bankerCards'] = is_array($bet['bankerCards'] ?? null) ? $bet['bankerCards'] : [];
        $row['roundStatus'] = (string) ($bet['roundStatus'] ?? 'settled');
        $row['ledgerEntries'] = array_map(fn (array $entry): array => $this->mapLedgerEntry($entry), $ledgerEntries);
        $row['audit'] = $audit !== null ? [
            'deckHash' => (string) ($audit['deckHash'] ?? ''),
            'integrityHash' => (string) ($audit['integrityHash'] ?? ''),
            'rngVersion' => (string) ($audit['rngVersion'] ?? ''),
            'createdAt' => $audit['createdAt'] ?? null,
        ] : null;

        return $row;
    }

    private function formatCasinoBetResponse(array $betRecord, array $ledgerEntries, bool $idempotent): array
    {
        $mappedLedger = array_map(fn (array $entry): array => $this->mapLedgerEntry($entry), $ledgerEntries);
        $roundId = (string) ($betRecord['roundId'] ?? $betRecord['_id'] ?? '');
        $balanceAfter = $this->num($betRecord['balanceAfter'] ?? 0);

        return [
            'roundId' => $roundId,
            'requestId' => (string) ($betRecord['requestId'] ?? ''),
            'result' => (string) ($betRecord['result'] ?? ''),
            'playerCards' => is_array($betRecord['playerCards'] ?? null) ? $betRecord['playerCards'] : [],
            'bankerCards' => is_array($betRecord['bankerCards'] ?? null) ? $betRecord['bankerCards'] : [],
            'playerTotal' => (int) ($betRecord['playerTotal'] ?? 0),
            'bankerTotal' => (int) ($betRecord['bankerTotal'] ?? 0),
            'bets' => is_array($betRecord['bets'] ?? null) ? $betRecord['bets'] : [],
            'totalWager' => $this->num($betRecord['totalWager'] ?? 0),
            'totalReturn' => $this->num($betRecord['totalReturn'] ?? 0),
            'profit' => $this->num($betRecord['profit'] ?? 0),
            'netResult' => $this->num($betRecord['netResult'] ?? 0),
            'balanceBefore' => $this->num($betRecord['balanceBefore'] ?? 0),
            'balanceAfter' => $balanceAfter,
            'newBalance' => $balanceAfter,
            'ledgerEntries' => $mappedLedger,
            'integrityHash' => (string) ($betRecord['integrityHash'] ?? ''),
            'serverDecisionAt' => $betRecord['serverDecisionAt'] ?? null,
            'latencyMs' => (int) ($betRecord['latencyMs'] ?? 0),
            'idempotent' => $idempotent,
        ];
    }

    private function buildIntegrityHash(array $payload): string
    {
        $json = json_encode($payload, JSON_UNESCAPED_SLASHES);
        if (!is_string($json)) {
            $json = '';
        }
        $secret = (string) Env::get('CASINO_INTEGRITY_SECRET', $this->jwtSecret);
        return hash_hmac('sha256', $json, $secret);
    }

    private function writeCasinoAuditLog(string $event, array $payload): void
    {
        try {
            $record = [
                'event' => $event,
                'timestamp' => gmdate(DATE_ATOM),
                'payload' => $payload,
            ];
            $line = json_encode($record, JSON_UNESCAPED_SLASHES);
            if (!is_string($line)) {
                return;
            }
            $logFile = __DIR__ . '/../logs/casino-audit.log';
            $logDir = dirname($logFile);
            if (!is_dir($logDir)) {
                @mkdir($logDir, 0775, true);
            }
            @file_put_contents($logFile, $line . PHP_EOL, FILE_APPEND);
        } catch (Throwable $_e) {
            // Never fail request flow due to logging.
        }
    }

    private function casinoAccessError(array $user, bool $requireUserRole): ?string
    {
        if ($requireUserRole && (string) ($user['role'] ?? 'user') !== 'user') {
            return 'Only players can place casino bets';
        }

        $status = strtolower(trim((string) ($user['status'] ?? 'active')));
        if (in_array($status, ['suspended', 'disabled', 'read only'], true)) {
            return 'Account is suspended, disabled, or read-only';
        }

        if ((bool) ($user['viewOnly'] ?? false)) {
            return 'Account is view-only';
        }

        if (!$this->isCasinoEnabled($user)) {
            return 'Casino access is disabled for this account';
        }

        return null;
    }

    private function isCasinoEnabled(array $user): bool
    {
        if (!is_array($user['settings'] ?? null)) {
            return true;
        }
        if (!array_key_exists('casino', $user['settings'])) {
            return true;
        }
        return (bool) $user['settings']['casino'];
    }

    private function resolveGameBetLimits(string $slug, float $fallbackMin, float $fallbackMax): array
    {
        $game = $this->db->findOne('casinogames', ['slug' => $slug]);
        $min = $this->safeNumber($game['minBet'] ?? null, $fallbackMin);
        $max = $this->safeNumber($game['maxBet'] ?? null, $fallbackMax);

        $resolvedMin = $min !== null && $min > 0 ? round($min, 2) : round($fallbackMin, 2);
        $resolvedMax = $max !== null && $max > 0 ? round($max, 2) : round($fallbackMax, 2);
        if ($resolvedMax < $resolvedMin) {
            $resolvedMax = $resolvedMin;
        }

        return [$resolvedMin, $resolvedMax];
    }

    private function parseMoneyValue(mixed $value, string $fieldName): float
    {
        if ($value === null || $value === '') {
            return 0.0;
        }
        if (!is_numeric($value)) {
            throw new InvalidArgumentException($fieldName . ' must be numeric');
        }
        $amount = (float) $value;
        if (!is_finite($amount) || $amount < 0) {
            throw new InvalidArgumentException($fieldName . ' must be a valid non-negative amount');
        }
        $rounded = round($amount, 2);
        if (abs($amount - $rounded) > 0.00001) {
            throw new InvalidArgumentException($fieldName . ' must have at most 2 decimal places');
        }
        return $rounded;
    }

    private function parseOptionalMoneyFilter(mixed $value, string $fieldName): ?float
    {
        if ($value === null) {
            return null;
        }
        if (is_string($value) && trim($value) === '') {
            return null;
        }
        return $this->parseMoneyValue($value, $fieldName);
    }

    private function newRoundId(): string
    {
        return bin2hex(random_bytes(12));
    }

    private function num(mixed $value): float
    {
        if (!is_numeric($value)) {
            return 0.0;
        }
        $parsed = (float) $value;
        if (!is_finite($parsed)) {
            return 0.0;
        }
        return $parsed;
    }

    private function baccaratCardPoint(array $card): int
    {
        $r = $card['r'] ?? '';
        if ($r === 'A') {
            return 1;
        }
        if (in_array($r, ['10', 'J', 'Q', 'K'], true)) {
            return 0;
        }
        return (int) $r;
    }

    /** @param array<int, array{r: string, s: string, code: string}> $hand */
    private function baccaratHandValue(array $hand): int
    {
        $total = 0;
        foreach ($hand as $card) {
            $total += $this->baccaratCardPoint($card);
        }
        return $total % 10;
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

    private static function protectFallback(string $jwtSecret): ?array
    {
        $auth = Http::header('authorization');
        if (!str_starts_with($auth, 'Bearer ')) {
            Response::json(['message' => 'Not authorized, no token'], 401);
            return null;
        }

        $token = trim(substr($auth, 7));
        try {
            $decoded = Jwt::decode($token, $jwtSecret);
        } catch (Throwable $e) {
            Response::json(['message' => 'Not authorized, token failed: ' . $e->getMessage()], 401);
            return null;
        }

        return [
            'id' => (string) ($decoded['id'] ?? ''),
            'username' => (string) ($decoded['username'] ?? 'user'),
            'role' => (string) ($decoded['role'] ?? 'user'),
        ];
    }

    /**
     * @return array<int, array<string, mixed>>
     */
    private static function fallbackGames(): array
    {
        $now = gmdate(DATE_ATOM);
        $games = [];

        foreach (self::DEFAULT_CASINO_GAMES as $idx => $game) {
            $slug = (string) ($game['slug'] ?? ('game-' . ($idx + 1)));
            $id = substr(sha1('casino-fallback-' . $slug), 0, 24);
            $games[] = [
                '_id' => $id,
                'externalGameId' => null,
                'provider' => (string) ($game['provider'] ?? 'internal'),
                'name' => (string) ($game['name'] ?? ('Game ' . ($idx + 1))),
                'slug' => $slug,
                'category' => in_array((string) ($game['category'] ?? 'lobby'), self::CASINO_CATEGORIES, true) ? (string) $game['category'] : 'lobby',
                'icon' => (string) ($game['icon'] ?? 'fa-solid fa-dice'),
                'themeColor' => (string) ($game['themeColor'] ?? '#0f5db3'),
                'imageUrl' => (string) ($game['imageUrl'] ?? ''),
                'launchUrl' => (string) ($game['launchUrl'] ?? ''),
                'minBet' => is_numeric($game['minBet'] ?? null) ? (float) $game['minBet'] : 1.0,
                'maxBet' => is_numeric($game['maxBet'] ?? null) ? (float) $game['maxBet'] : 100.0,
                'rtp' => isset($game['rtp']) && is_numeric($game['rtp']) ? (float) $game['rtp'] : null,
                'volatility' => $game['volatility'] ?? null,
                'tags' => is_array($game['tags'] ?? null) ? $game['tags'] : [str_replace('_', ' ', (string) ($game['category'] ?? 'lobby')), 'live casino'],
                'isFeatured' => (bool) ($game['isFeatured'] ?? false),
                'status' => 'active',
                'supportsDemo' => true,
                'createdAt' => $now,
                'updatedAt' => $now,
            ];
        }

        return $games;
    }

    private static function toPublicGameStatic(array $game): array
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
}
