<?php

declare(strict_types=1);


final class CasinoController
{
    private MongoRepository $db;
    private string $jwtSecret;

    private const CASINO_CATEGORIES = ['lobby', 'table_games', 'slots', 'video_poker', 'specialty_games'];
    private const BACCARAT_GAME_SLUG = 'baccarat';
    private const BLACKJACK_GAME_SLUG = 'blackjack';
    private const ROULETTE_GAME_SLUG = 'roulette';
    private const STUD_POKER_GAME_SLUG = 'stud-poker';
    private const REMOVED_GAME_SLUGS = [
        self::ROULETTE_GAME_SLUG,
        self::STUD_POKER_GAME_SLUG,
    ];
    private const BACCARAT_SOURCE_TYPE = 'casino_baccarat';
    private const BLACKJACK_SOURCE_TYPE = 'casino_blackjack';
    private const ROULETTE_SOURCE_TYPE = 'casino_roulette';
    private const STUD_POKER_SOURCE_TYPE = 'casino_stud_poker';
    private const BACCARAT_RNG_VERSION = 'csprng-v1';
    private const BLACKJACK_RNG_VERSION = 'native-client-v1';
    private const ROULETTE_RNG_VERSION = 'csprng-wheel-v2';
    private const STUD_POKER_RNG_VERSION = 'stud-house-v1';
    private const IN_HOUSE_OVERLAY_ONLY_GAME_MESSAGES = [
        self::BACCARAT_GAME_SLUG => 'Baccarat is available only from the in-house casino table.',
        self::BLACKJACK_GAME_SLUG => 'Blackjack is available only from the in-house casino table.',
    ];
    private const REQUEST_ID_PATTERN = '/^[A-Za-z0-9_-]{8,128}$/';
    private const ROULETTE_RED_NUMBERS = [1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36];
    private const STUD_POKER_PAYOUTS = [
        'ROYAL_FLUSH' => 100,
        'STRAIGHT_FLUSH' => 50,
        'FOUR_OF_A_KIND' => 20,
        'FULL_HOUSE' => 7,
        'FLUSH' => 5,
        'STRAIGHT' => 4,
        'THREE_OF_A_KIND' => 3,
        'TWO_PAIR' => 2,
        'ONE_PAIR' => 1,
        'HIGH_CARD' => 1,
    ];

    private const DEFAULT_CASINO_GAMES = [
        ['provider' => 'internal', 'name' => 'Single Hand ($1-$100)', 'slug' => 'single-hand-1-100', 'category' => 'table_games', 'minBet' => 1, 'maxBet' => 100, 'themeColor' => '#115e59', 'icon' => 'fa-solid fa-diamond', 'isFeatured' => true],
        ['provider' => 'internal', 'name' => 'Baccarat', 'slug' => 'baccarat', 'category' => 'table_games', 'minBet' => 1, 'maxBet' => 100, 'themeColor' => '#9f1239', 'icon' => 'fa-solid fa-gem', 'imageUrl' => '/games/baccarat/assets/menuscreen.webp', 'tags' => ['table games', 'baccarat', 'in-house', 'live casino'], 'isFeatured' => true],
        ['provider' => 'internal', 'name' => 'Blackjack', 'slug' => 'blackjack', 'category' => 'table_games', 'minBet' => 1, 'maxBet' => 10000, 'themeColor' => '#0b5563', 'icon' => 'fa-solid fa-club', 'imageUrl' => '/games/blackjack/src/images/misc/table.png', 'tags' => ['table games', 'blackjack', 'in-house', 'live casino'], 'isFeatured' => true],
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
            $games = array_values(array_filter(
                self::fallbackGames(),
                static fn(array $game): bool => !in_array(strtolower((string) ($game['slug'] ?? '')), self::REMOVED_GAME_SLUGS, true)
            ));
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

            $games = array_values(array_filter(
                self::fallbackGames(),
                static fn(array $game): bool => !in_array(strtolower((string) ($game['slug'] ?? '')), self::REMOVED_GAME_SLUGS, true)
            ));
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

            $fallbackGameSlug = strtolower((string) ($game['slug'] ?? ''));
            if (in_array($fallbackGameSlug, self::REMOVED_GAME_SLUGS, true)) {
                Response::json(['message' => 'Game has been removed'], 410);
                return true;
            }
            if (isset(self::IN_HOUSE_OVERLAY_ONLY_GAME_MESSAGES[$fallbackGameSlug])) {
                Response::json(['message' => self::IN_HOUSE_OVERLAY_ONLY_GAME_MESSAGES[$fallbackGameSlug]], 409);
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
        if ($method === 'POST' && $path === '/api/casino/stud-poker/rounds') {
            Response::json(['message' => 'Stud Poker has been removed'], 410);
            return true;
        }
        if ($method === 'POST' && preg_match('#^/api/casino/stud-poker/rounds/([a-fA-F0-9]{24})/action$#', $path, $m) === 1) {
            Response::json(['message' => 'Stud Poker has been removed'], 410);
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
            $allGames = $this->db->findMany('casinogames', $query, [
                'sort' => ['sortOrder' => 1, 'name' => 1],
            ]);
            $games = array_values(array_filter(
                $allGames,
                fn(array $game): bool => !in_array(strtolower((string) ($game['slug'] ?? '')), self::REMOVED_GAME_SLUGS, true)
            ));
            $total = count($games);
            $games = array_slice($games, $skip, $limit);

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
            $activeGames = $this->db->findMany('casinogames', [
                'status' => 'active',
            ]);
            $activeGames = array_values(array_filter(
                $activeGames,
                fn(array $game): bool => !in_array(strtolower((string) ($game['slug'] ?? '')), self::REMOVED_GAME_SLUGS, true)
            ));

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

            $gameSlug = strtolower((string) ($game['slug'] ?? ''));
            if (in_array($gameSlug, self::REMOVED_GAME_SLUGS, true)) {
                Response::json(['message' => 'Game has been removed'], 410);
                return;
            }
            if (isset(self::IN_HOUSE_OVERLAY_ONLY_GAME_MESSAGES[$gameSlug])) {
                Response::json(['message' => self::IN_HOUSE_OVERLAY_ONLY_GAME_MESSAGES[$gameSlug]], 409);
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
                if (in_array($slug, self::REMOVED_GAME_SLUGS, true)) {
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
        $now = MongoRepository::nowUtc();
        foreach (self::DEFAULT_CASINO_GAMES as $idx => $game) {
            $slug = (string) ($game['slug'] ?? ('game-' . ($idx + 1)));
            $existing = $this->db->findOne('casinogames', ['slug' => $slug]);
            if ($existing !== null) {
                continue;
            }

            $this->db->insertOne('casinogames', [
                'externalGameId' => null,
                'provider' => (string) ($game['provider'] ?? 'internal'),
                'name' => (string) ($game['name'] ?? ('Game ' . ($idx + 1))),
                'slug' => $slug,
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

        foreach (self::REMOVED_GAME_SLUGS as $removedSlug) {
            $existingRemoved = $this->db->findOne('casinogames', ['slug' => $removedSlug]);
            if ($existingRemoved === null) {
                continue;
            }
            $this->db->updateOne(
                'casinogames',
                ['_id' => MongoRepository::id((string) $existingRemoved['_id'])],
                [
                    'status' => 'disabled',
                    'isFeatured' => false,
                    'updatedAt' => $now,
                ]
            );
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
            if (RateLimiter::enforce($this->db, 'casino_inhouse_bet', 30, 60)) {
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

            $this->ensureCasinoSeeded();

            $body = Http::jsonBody();
            $requestId = trim((string) ($body['requestId'] ?? ''));
            if (preg_match(self::REQUEST_ID_PATTERN, $requestId) !== 1) {
                Response::json(['message' => 'requestId is required and must be 8-128 characters (letters, numbers, "_" or "-")'], 400);
                return;
            }

            $game = strtolower(trim((string) ($body['game'] ?? '')));
            if ($game === self::BLACKJACK_GAME_SLUG) {
                $this->placeBlackjackBet($actor, $body, $requestId, $startedAt);
                return;
            }
            if (in_array($game, self::REMOVED_GAME_SLUGS, true)) {
                Response::json(['message' => 'Game has been removed: ' . $game], 410);
                return;
            }
            if ($game !== self::BACCARAT_GAME_SLUG) {
                Response::json(['message' => 'Unsupported game: ' . $game], 400);
                return;
            }

            $gameConfig = $this->db->findOne('casinogames', ['slug' => self::BACCARAT_GAME_SLUG]);
            if ($gameConfig !== null) {
                $gameStatus = strtolower(trim((string) ($gameConfig['status'] ?? 'active')));
                if ($gameStatus !== '' && $gameStatus !== 'active') {
                    Response::json(['message' => 'Game is currently ' . ($gameConfig['status'] ?? 'disabled')], 400);
                    return;
                }
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
                    'game' => self::BACCARAT_GAME_SLUG,
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
                $this->assertCasinoLossLimits($lockedUser, $totalWager);

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

    private function placeRouletteBet(array $actor, array $body, string $requestId, float $startedAt): void
    {
        $userId = (string) ($actor['_id'] ?? '');

        try {
            $this->requireActiveCasinoGame(self::ROULETTE_GAME_SLUG);
            $parsedBets = $this->parseRouletteBets(is_array($body['bets'] ?? null) ? $body['bets'] : []);
            $totalWager = $parsedBets['totalWager'];

            if ($totalWager <= 0) {
                Response::json(['message' => 'No bets placed'], 400);
                return;
            }

            [$gameMinBet, $gameMaxBet] = $this->resolveGameBetLimits(self::ROULETTE_GAME_SLUG, 1.0, 5000.0);
            if ($totalWager < $gameMinBet) {
                Response::json(['message' => 'Minimum roulette wager is $' . number_format($gameMinBet, 2)], 400);
                return;
            }
            if ($totalWager > $gameMaxBet) {
                Response::json(['message' => 'Maximum roulette wager is $' . number_format($gameMaxBet, 2)], 400);
                return;
            }

            $this->db->beginTransaction();
            try {
                $lockedUser = $this->loadLockedCasinoUser($userId);

                $existingRound = $this->db->findOne('casino_bets', [
                    'userId' => $userId,
                    'requestId' => $requestId,
                    'game' => self::ROULETTE_GAME_SLUG,
                ]);
                if ($existingRound !== null) {
                    $roundId = (string) ($existingRound['roundId'] ?? $existingRound['_id'] ?? '');
                    $ledgerEntries = $this->findRoundLedgerEntries($roundId);
                    $this->writeCasinoAuditLog('roulette_round_idempotent', [
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

                $this->assertUserWagerWithinLimits($lockedUser, $totalWager);
                $this->assertCasinoLossLimits($lockedUser, $totalWager);
                $balanceSnapshot = $this->getUserBalanceSnapshot($lockedUser);
                if ($totalWager > $balanceSnapshot['availableBalance']) {
                    $this->db->rollback();
                    Response::json(['message' => 'Insufficient balance. Available: $' . number_format($balanceSnapshot['availableBalance'], 2)], 400);
                    return;
                }

                $roundId = $this->newRoundId();
                $outcomeSource = 'server_rng';
                $outcome = $this->pickRouletteOutcome($parsedBets['entries']);

                $totalReturn = $outcome['totalReturn'];
                $profit = round(max(0, $totalReturn - $totalWager), 2);
                $netResult = round($totalReturn - $totalWager, 2);
                $balanceAfterDebit = round($balanceSnapshot['balanceBefore'] - $totalWager, 2);
                $balanceAfter = round($balanceAfterDebit + $totalReturn, 2);

                $now = MongoRepository::nowUtc();
                $ipAddress = IpUtils::clientIp();
                $userAgent = Http::header('user-agent') !== '' ? Http::header('user-agent') : null;

                $debitEntry = $this->buildCasinoTransactionEntry(
                    $userId,
                    $totalWager,
                    $roundId,
                    self::ROULETTE_SOURCE_TYPE,
                    'DEBIT',
                    'casino_bet_debit',
                    $balanceSnapshot['balanceBefore'],
                    $balanceAfterDebit,
                    'CASINO_ROULETTE_WAGER',
                    'Roulette wager charged',
                    $now,
                    $ipAddress,
                    $userAgent
                );
                $debitEntryId = $this->db->insertOne('transactions', $debitEntry);

                $creditEntry = $this->buildCasinoTransactionEntry(
                    $userId,
                    $totalReturn,
                    $roundId,
                    self::ROULETTE_SOURCE_TYPE,
                    'CREDIT',
                    'casino_bet_credit',
                    $balanceAfterDebit,
                    $balanceAfter,
                    'CASINO_ROULETTE_PAYOUT',
                    'Roulette payout/refund credited',
                    $now,
                    $ipAddress,
                    $userAgent
                );
                $creditEntryId = $this->db->insertOne('transactions', $creditEntry);

                $this->db->updateOne('users', ['_id' => MongoRepository::id($userId)], [
                    'balance' => $balanceAfter,
                    'updatedAt' => $now,
                ]);

                $serverDecisionAt = MongoRepository::nowUtc();
                $latencyMs = max(0, (int) round((microtime(true) - $startedAt) * 1000));
                $integrityHash = $this->buildIntegrityHash([
                    'roundId' => $roundId,
                    'requestId' => $requestId,
                    'userId' => $userId,
                    'game' => self::ROULETTE_GAME_SLUG,
                    'bets' => $parsedBets['normalizedBets'],
                    'outcome' => $outcome['outcome'],
                    'totalWager' => $totalWager,
                    'totalReturn' => $totalReturn,
                    'balanceBefore' => $balanceSnapshot['balanceBefore'],
                    'balanceAfter' => $balanceAfter,
                    'serverDecisionAt' => $serverDecisionAt,
                ]);

                $betRecord = [
                    '_id' => $roundId,
                    'roundId' => $roundId,
                    'requestId' => $requestId,
                    'userId' => $userId,
                    'username' => (string) ($lockedUser['username'] ?? $actor['username'] ?? ''),
                    'game' => self::ROULETTE_GAME_SLUG,
                    'bets' => $parsedBets['normalizedBets'],
                    'result' => (string) $outcome['outcome']['number'],
                    'rouletteOutcome' => $outcome['outcome'],
                    'winningBetKeys' => $outcome['winningBetKeys'],
                    'totalWager' => $totalWager,
                    'totalReturn' => $totalReturn,
                    'profit' => $profit,
                    'netResult' => $netResult,
                    'balanceBefore' => $balanceSnapshot['balanceBefore'],
                    'balanceAfter' => $balanceAfter,
                    'ledgerEntries' => ['debit' => $debitEntryId, 'credit' => $creditEntryId],
                    'rngVersion' => self::ROULETTE_RNG_VERSION,
                    'outcomeSource' => $outcomeSource,
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
                    'game' => self::ROULETTE_GAME_SLUG,
                    'rngVersion' => self::ROULETTE_RNG_VERSION,
                    'bets' => $parsedBets['normalizedBets'],
                    'outcomeSource' => $outcomeSource,
                    'rouletteOutcome' => $outcome['outcome'],
                    'winningBetKeys' => $outcome['winningBetKeys'],
                    'integrityHash' => $integrityHash,
                    'createdAt' => $now,
                    'updatedAt' => $now,
                ]);

                $this->db->commit();

                $ledgerEntries = [
                    array_merge($debitEntry, ['_id' => $debitEntryId]),
                    array_merge($creditEntry, ['_id' => $creditEntryId]),
                ];
                $this->writeCasinoAuditLog('roulette_round_settled', [
                    'requestId' => $requestId,
                    'roundId' => $roundId,
                    'userId' => $userId,
                    'username' => (string) ($lockedUser['username'] ?? ''),
                    'wager' => $totalWager,
                    'totalReturn' => $totalReturn,
                    'netResult' => $netResult,
                    'outcomeNumber' => $outcome['outcome']['number'],
                    'outcomeSource' => $outcomeSource,
                ]);
                Response::json($this->formatCasinoBetResponse($betRecord, $ledgerEntries, false));
            } catch (Throwable $txErr) {
                $this->db->rollback();
                throw $txErr;
            }
        } catch (InvalidArgumentException $e) {
            $this->writeCasinoAuditLog('roulette_round_validation_error', [
                'requestId' => $requestId,
                'userId' => $userId,
                'error' => $e->getMessage(),
            ]);
            Response::json(['message' => $e->getMessage()], 400);
        } catch (Throwable $e) {
            $this->writeCasinoAuditLog('roulette_round_server_error', [
                'requestId' => $requestId,
                'userId' => $userId,
                'error' => $e->getMessage(),
            ]);
            Response::json(['message' => 'Server error placing roulette bet'], 500);
        }
    }

    private function placeBlackjackBet(array $actor, array $body, string $requestId, float $startedAt): void
    {
        $userId = (string) ($actor['_id'] ?? '');

        try {
            $this->requireActiveCasinoGame(self::BLACKJACK_GAME_SLUG);

            $clientPayload = is_array($body['bets'] ?? null) ? $body['bets'] : [];
            $totalWager = $this->parseMoneyValue($clientPayload['totalWager'] ?? 0, 'bets.totalWager');
            $totalReturn = $this->parseMoneyValue($clientPayload['totalReturn'] ?? 0, 'bets.totalReturn');

            if ($totalWager <= 0) {
                Response::json(['message' => 'Blackjack wager must be greater than zero'], 400);
                return;
            }

            [$gameMinBet, $gameMaxBet] = $this->resolveGameBetLimits(self::BLACKJACK_GAME_SLUG, 1.0, 10000.0);
            if ($totalWager < $gameMinBet) {
                Response::json(['message' => 'Minimum blackjack wager is $' . number_format($gameMinBet, 2)], 400);
                return;
            }
            if ($totalWager > $gameMaxBet) {
                Response::json(['message' => 'Maximum blackjack wager is $' . number_format($gameMaxBet, 2)], 400);
                return;
            }

            $netResult = round($totalReturn - $totalWager, 2);
            $profit = round(max(0, $netResult), 2);

            $result = trim((string) ($clientPayload['result'] ?? ''));
            if ($result === '') {
                $result = $netResult > 0 ? 'Win' : ($netResult < 0 ? 'Lose' : 'Push');
            }
            if (strlen($result) > 64) {
                $result = substr($result, 0, 64);
            }

            $betBreakdown = is_array($clientPayload['betBreakdown'] ?? null) ? $clientPayload['betBreakdown'] : [];
            if (array_is_list($betBreakdown) && count($betBreakdown) > 24) {
                $betBreakdown = array_slice($betBreakdown, 0, 24);
            }

            $roundMeta = is_array($clientPayload['roundMeta'] ?? null) ? $clientPayload['roundMeta'] : [];
            if (count($roundMeta) > 48) {
                $roundMeta = array_slice($roundMeta, 0, 48, true);
            }

            $playerCards = is_array($clientPayload['playerCards'] ?? null)
                ? array_values(array_map(static fn($card): string => (string) $card, $clientPayload['playerCards']))
                : [];
            if (count($playerCards) > 20) {
                $playerCards = array_slice($playerCards, 0, 20);
            }

            $dealerCards = is_array($clientPayload['dealerCards'] ?? null)
                ? array_values(array_map(static fn($card): string => (string) $card, $clientPayload['dealerCards']))
                : [];
            if (count($dealerCards) > 20) {
                $dealerCards = array_slice($dealerCards, 0, 20);
            }

            $this->db->beginTransaction();
            try {
                $lockedUser = $this->loadLockedCasinoUser($userId);

                $existingRound = $this->db->findOne('casino_bets', [
                    'userId' => $userId,
                    'requestId' => $requestId,
                    'game' => self::BLACKJACK_GAME_SLUG,
                ]);
                if ($existingRound !== null) {
                    $roundId = (string) ($existingRound['roundId'] ?? $existingRound['_id'] ?? '');
                    $ledgerEntries = $this->findRoundLedgerEntries($roundId);
                    $this->writeCasinoAuditLog('blackjack_round_idempotent', [
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

                $this->assertUserWagerWithinLimits($lockedUser, $totalWager);
                $this->assertCasinoLossLimits($lockedUser, $totalWager);
                $balanceSnapshot = $this->getUserBalanceSnapshot($lockedUser);
                if ($totalWager > $balanceSnapshot['availableBalance']) {
                    $this->db->rollback();
                    Response::json(['message' => 'Insufficient balance. Available: $' . number_format($balanceSnapshot['availableBalance'], 2)], 400);
                    return;
                }

                $roundId = $this->newRoundId();
                $now = MongoRepository::nowUtc();
                $ipAddress = IpUtils::clientIp();
                $userAgent = Http::header('user-agent') !== '' ? Http::header('user-agent') : null;

                $balanceAfterDebit = round($balanceSnapshot['balanceBefore'] - $totalWager, 2);
                $balanceAfter = round($balanceAfterDebit + $totalReturn, 2);

                $debitEntry = $this->buildCasinoTransactionEntry(
                    $userId,
                    $totalWager,
                    $roundId,
                    self::BLACKJACK_SOURCE_TYPE,
                    'DEBIT',
                    'casino_bet_debit',
                    $balanceSnapshot['balanceBefore'],
                    $balanceAfterDebit,
                    'CASINO_BLACKJACK_WAGER',
                    'Blackjack wager charged',
                    $now,
                    $ipAddress,
                    $userAgent
                );
                $debitEntryId = $this->db->insertOne('transactions', $debitEntry);

                $creditEntry = $this->buildCasinoTransactionEntry(
                    $userId,
                    $totalReturn,
                    $roundId,
                    self::BLACKJACK_SOURCE_TYPE,
                    'CREDIT',
                    'casino_bet_credit',
                    $balanceAfterDebit,
                    $balanceAfter,
                    'CASINO_BLACKJACK_PAYOUT',
                    'Blackjack payout/refund credited',
                    $now,
                    $ipAddress,
                    $userAgent
                );
                $creditEntryId = $this->db->insertOne('transactions', $creditEntry);

                $this->db->updateOne('users', ['_id' => MongoRepository::id($userId)], [
                    'balance' => $balanceAfter,
                    'updatedAt' => $now,
                ]);

                $serverDecisionAt = MongoRepository::nowUtc();
                $latencyMs = max(0, (int) round((microtime(true) - $startedAt) * 1000));
                $integrityHash = $this->buildIntegrityHash([
                    'roundId' => $roundId,
                    'requestId' => $requestId,
                    'userId' => $userId,
                    'game' => self::BLACKJACK_GAME_SLUG,
                    'result' => $result,
                    'totalWager' => $totalWager,
                    'totalReturn' => $totalReturn,
                    'netResult' => $netResult,
                    'balanceBefore' => $balanceSnapshot['balanceBefore'],
                    'balanceAfter' => $balanceAfter,
                    'playerCards' => $playerCards,
                    'dealerCards' => $dealerCards,
                    'betBreakdown' => $betBreakdown,
                    'roundMeta' => $roundMeta,
                    'serverDecisionAt' => $serverDecisionAt,
                ]);

                $betRecord = [
                    '_id' => $roundId,
                    'roundId' => $roundId,
                    'requestId' => $requestId,
                    'userId' => $userId,
                    'username' => (string) ($lockedUser['username'] ?? $actor['username'] ?? ''),
                    'game' => self::BLACKJACK_GAME_SLUG,
                    'bets' => [
                        'totalWager' => $totalWager,
                        'totalReturn' => $totalReturn,
                        'betBreakdown' => $betBreakdown,
                    ],
                    'playerCards' => $playerCards,
                    'dealerCards' => $dealerCards,
                    'result' => $result,
                    'totalWager' => $totalWager,
                    'totalReturn' => $totalReturn,
                    'profit' => $profit,
                    'netResult' => $netResult,
                    'balanceBefore' => $balanceSnapshot['balanceBefore'],
                    'balanceAfter' => $balanceAfter,
                    'ledgerEntries' => ['debit' => $debitEntryId, 'credit' => $creditEntryId],
                    'rngVersion' => self::BLACKJACK_RNG_VERSION,
                    'outcomeSource' => 'native_client_round',
                    'blackjackRoundMeta' => $roundMeta,
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
                    'game' => self::BLACKJACK_GAME_SLUG,
                    'rngVersion' => self::BLACKJACK_RNG_VERSION,
                    'outcomeSource' => 'native_client_round',
                    'bets' => $betRecord['bets'],
                    'result' => $result,
                    'playerCards' => $playerCards,
                    'dealerCards' => $dealerCards,
                    'blackjackRoundMeta' => $roundMeta,
                    'integrityHash' => $integrityHash,
                    'createdAt' => $now,
                    'updatedAt' => $now,
                ]);

                $this->db->commit();

                $ledgerEntries = [
                    array_merge($debitEntry, ['_id' => $debitEntryId]),
                    array_merge($creditEntry, ['_id' => $creditEntryId]),
                ];
                $this->writeCasinoAuditLog('blackjack_round_settled', [
                    'requestId' => $requestId,
                    'roundId' => $roundId,
                    'userId' => $userId,
                    'username' => (string) ($lockedUser['username'] ?? ''),
                    'wager' => $totalWager,
                    'totalReturn' => $totalReturn,
                    'netResult' => $netResult,
                    'outcomeSource' => 'native_client_round',
                ]);
                Response::json($this->formatCasinoBetResponse($betRecord, $ledgerEntries, false));
            } catch (Throwable $txErr) {
                $this->db->rollback();
                throw $txErr;
            }
        } catch (InvalidArgumentException $e) {
            $this->writeCasinoAuditLog('blackjack_round_validation_error', [
                'requestId' => $requestId,
                'userId' => $userId,
                'error' => $e->getMessage(),
            ]);
            Response::json(['message' => $e->getMessage()], 400);
        } catch (Throwable $e) {
            $this->writeCasinoAuditLog('blackjack_round_server_error', [
                'requestId' => $requestId,
                'userId' => $userId,
                'error' => $e->getMessage(),
            ]);
            Response::json(['message' => 'Server error placing blackjack bet'], 500);
        }
    }

    private function startStudPokerRound(): void
    {
        $requestId = '';
        $userId = '';

        try {
            if (RateLimiter::enforce($this->db, 'casino_stud_poker_start', 30, 60)) {
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

            $this->ensureCasinoSeeded();
            $this->requireActiveCasinoGame(self::STUD_POKER_GAME_SLUG);

            $body = Http::jsonBody();
            $requestId = trim((string) ($body['requestId'] ?? ''));
            if (preg_match(self::REQUEST_ID_PATTERN, $requestId) !== 1) {
                Response::json(['message' => 'requestId is required and must be 8-128 characters (letters, numbers, "_" or "-")'], 400);
                return;
            }

            $anteBet = $this->parseMoneyValue($body['anteBet'] ?? ($body['bets']['Ante'] ?? 0), 'anteBet');
            if ($anteBet <= 0) {
                Response::json(['message' => 'Ante bet is required'], 400);
                return;
            }

            [$gameMinBet, $gameMaxBet] = $this->resolveGameBetLimits(self::STUD_POKER_GAME_SLUG, 1.0, 100.0);
            if ($anteBet < $gameMinBet) {
                Response::json(['message' => 'Minimum stud poker ante is $' . number_format($gameMinBet, 2)], 400);
                return;
            }
            if ($anteBet > $gameMaxBet) {
                Response::json(['message' => 'Maximum stud poker ante is $' . number_format($gameMaxBet, 2)], 400);
                return;
            }

            $userId = (string) ($actor['_id'] ?? '');
            $this->db->beginTransaction();
            try {
                $lockedUser = $this->loadLockedCasinoUser($userId);

                $existingRound = $this->db->findOne('casino_bets', [
                    'userId' => $userId,
                    'requestId' => $requestId,
                    'game' => self::STUD_POKER_GAME_SLUG,
                ]);
                if ($existingRound !== null) {
                    $roundId = (string) ($existingRound['roundId'] ?? $existingRound['_id'] ?? '');
                    $ledgerEntries = $this->findRoundLedgerEntries($roundId);
                    $this->db->commit();
                    Response::json($this->formatStudPokerStartResponse($existingRound, $ledgerEntries, true));
                    return;
                }

                $roundExposure = round($anteBet * 3, 2);
                $this->assertUserWagerWithinLimits($lockedUser, $roundExposure);
                $this->assertCasinoLossLimits($lockedUser, $anteBet);

                $balanceSnapshot = $this->getUserBalanceSnapshot($lockedUser);
                if ($roundExposure > $balanceSnapshot['availableBalance']) {
                    $this->db->rollback();
                    Response::json(['message' => 'Insufficient balance to cover ante and raise. Available: $' . number_format($balanceSnapshot['availableBalance'], 2)], 400);
                    return;
                }

                $roundId = $this->newRoundId();
                $openingRound = $this->dealStudPokerOpeningRound();
                $balanceAfterAnte = round($balanceSnapshot['balanceBefore'] - $anteBet, 2);
                $now = MongoRepository::nowUtc();
                $ipAddress = IpUtils::clientIp();
                $userAgent = Http::header('user-agent') !== '' ? Http::header('user-agent') : null;

                $debitEntry = $this->buildCasinoTransactionEntry(
                    $userId,
                    $anteBet,
                    $roundId,
                    self::STUD_POKER_SOURCE_TYPE,
                    'DEBIT',
                    'casino_bet_debit',
                    $balanceSnapshot['balanceBefore'],
                    $balanceAfterAnte,
                    'CASINO_STUD_POKER_ANTE',
                    'Stud poker ante charged',
                    $now,
                    $ipAddress,
                    $userAgent
                );
                $debitEntryId = $this->db->insertOne('transactions', $debitEntry);

                $this->db->updateOne('users', ['_id' => MongoRepository::id($userId)], [
                    'balance' => $balanceAfterAnte,
                    'updatedAt' => $now,
                ]);

                $integrityHash = $this->buildIntegrityHash([
                    'roundId' => $roundId,
                    'requestId' => $requestId,
                    'userId' => $userId,
                    'game' => self::STUD_POKER_GAME_SLUG,
                    'anteBet' => $anteBet,
                    'playerCards' => $openingRound['playerCards'],
                    'dealerUpCard' => $openingRound['dealerUpCard'],
                    'createdAt' => $now,
                ]);

                $betRecord = [
                    '_id' => $roundId,
                    'roundId' => $roundId,
                    'requestId' => $requestId,
                    'userId' => $userId,
                    'username' => (string) ($lockedUser['username'] ?? $actor['username'] ?? ''),
                    'game' => self::STUD_POKER_GAME_SLUG,
                    'bets' => ['Ante' => $anteBet],
                    'anteBet' => $anteBet,
                    'raiseBet' => 0.0,
                    'totalWager' => $anteBet,
                    'totalReturn' => 0.0,
                    'profit' => 0.0,
                    'netResult' => 0.0,
                    'balanceBefore' => $balanceSnapshot['balanceBefore'],
                    'balanceAfter' => $balanceAfterAnte,
                    'playerCards' => $openingRound['playerCards'],
                    'dealerUpCard' => $openingRound['dealerUpCard'],
                    'dealerCards' => [],
                    'usedCards' => $openingRound['usedCards'],
                    'playerHand' => null,
                    'dealerHand' => null,
                    'dealerQualifies' => null,
                    'playerAction' => null,
                    'result' => 'Pending',
                    'ledgerEntries' => ['anteDebit' => $debitEntryId],
                    'rngVersion' => self::STUD_POKER_RNG_VERSION,
                    'integrityHash' => $integrityHash,
                    'serverDecisionAt' => $now,
                    'latencyMs' => 0,
                    'roundStatus' => 'awaiting_action',
                    'createdAt' => $now,
                    'updatedAt' => $now,
                ];
                $this->db->insertOne('casino_bets', $betRecord);

                $this->db->insertOne('casino_round_audit', [
                    '_id' => $roundId,
                    'roundId' => $roundId,
                    'requestId' => $requestId,
                    'userId' => $userId,
                    'game' => self::STUD_POKER_GAME_SLUG,
                    'rngVersion' => self::STUD_POKER_RNG_VERSION,
                    'stage' => 'started',
                    'playerCards' => $openingRound['playerCards'],
                    'dealerUpCard' => $openingRound['dealerUpCard'],
                    'usedCards' => $openingRound['usedCards'],
                    'integrityHash' => $integrityHash,
                    'createdAt' => $now,
                    'updatedAt' => $now,
                ]);

                $this->db->commit();

                $ledgerEntries = [
                    array_merge($debitEntry, ['_id' => $debitEntryId]),
                ];
                Response::json($this->formatStudPokerStartResponse($betRecord, $ledgerEntries, false));
            } catch (Throwable $txErr) {
                $this->db->rollback();
                throw $txErr;
            }
        } catch (InvalidArgumentException $e) {
            $this->writeCasinoAuditLog('stud_poker_start_validation_error', [
                'requestId' => $requestId,
                'userId' => $userId,
                'error' => $e->getMessage(),
            ]);
            Response::json(['message' => $e->getMessage()], 400);
        } catch (Throwable $e) {
            $this->writeCasinoAuditLog('stud_poker_start_server_error', [
                'requestId' => $requestId,
                'userId' => $userId,
                'error' => $e->getMessage(),
            ]);
            Response::json(['message' => 'Server error starting stud poker round', 'error' => $e->getMessage()], 500);
        }
    }

    private function resolveStudPokerRound(string $roundId): void
    {
        $requestId = '';
        $userId = '';

        try {
            if (RateLimiter::enforce($this->db, 'casino_stud_poker_resolve', 30, 60)) {
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

            $this->ensureCasinoSeeded();
            $gameConfig = $this->requireActiveCasinoGame(self::STUD_POKER_GAME_SLUG);

            $body = Http::jsonBody();
            $requestId = trim((string) ($body['requestId'] ?? ''));
            if (preg_match(self::REQUEST_ID_PATTERN, $requestId) !== 1) {
                Response::json(['message' => 'requestId is required and must be 8-128 characters (letters, numbers, "_" or "-")'], 400);
                return;
            }

            $action = strtolower(trim((string) ($body['action'] ?? '')));
            if (!in_array($action, ['raise', 'fold'], true)) {
                Response::json(['message' => 'action must be "raise" or "fold"'], 400);
                return;
            }

            $userId = (string) ($actor['_id'] ?? '');
            $this->db->beginTransaction();
            try {
                $lockedUser = $this->loadLockedCasinoUser($userId);
                $round = $this->db->findOneForUpdate('casino_bets', [
                    'roundId' => $roundId,
                    'userId' => $userId,
                    'game' => self::STUD_POKER_GAME_SLUG,
                ]);
                if ($round === null) {
                    $this->db->rollback();
                    Response::json(['message' => 'Stud poker round not found'], 404);
                    return;
                }

                if ((string) ($round['roundStatus'] ?? '') === 'settled') {
                    $existingActionRequestId = (string) ($round['actionRequestId'] ?? '');
                    $ledgerEntries = $this->findRoundLedgerEntries($roundId);
                    $this->db->commit();

                    if ($existingActionRequestId !== '' && $existingActionRequestId === $requestId) {
                        Response::json($this->formatCasinoBetResponse($round, $ledgerEntries, true));
                        return;
                    }

                    Response::json(['message' => 'Stud poker round is already settled'], 409);
                    return;
                }

                if ((string) ($round['roundStatus'] ?? '') !== 'awaiting_action') {
                    $this->db->rollback();
                    Response::json(['message' => 'Stud poker round cannot be resolved in its current state'], 409);
                    return;
                }

                $anteBet = $this->parseMoneyValue($round['anteBet'] ?? 0, 'anteBet');
                $raiseBet = $action === 'raise' ? round($anteBet * 2, 2) : 0.0;
                $balanceSnapshot = $this->getUserBalanceSnapshot($lockedUser);

                $ledgerEntries = $this->findRoundLedgerEntries($roundId);
                $additionalLedgerEntries = [];
                $now = MongoRepository::nowUtc();
                $ipAddress = IpUtils::clientIp();
                $userAgent = Http::header('user-agent') !== '' ? Http::header('user-agent') : null;
                $balanceAfterWagers = $balanceSnapshot['balanceBefore'];

                if ($action === 'raise') {
                    $this->assertCasinoLossLimits($lockedUser, $raiseBet);
                    if ($raiseBet > $balanceSnapshot['availableBalance']) {
                        $this->db->rollback();
                        Response::json(['message' => 'Insufficient balance to raise. Available: $' . number_format($balanceSnapshot['availableBalance'], 2)], 400);
                        return;
                    }

                    $raiseDebitEntry = $this->buildCasinoTransactionEntry(
                        $userId,
                        $raiseBet,
                        $roundId,
                        self::STUD_POKER_SOURCE_TYPE,
                        'DEBIT',
                        'casino_bet_debit',
                        $balanceSnapshot['balanceBefore'],
                        round($balanceSnapshot['balanceBefore'] - $raiseBet, 2),
                        'CASINO_STUD_POKER_RAISE',
                        'Stud poker raise charged',
                        $now,
                        $ipAddress,
                        $userAgent
                    );
                    $raiseDebitEntryId = $this->db->insertOne('transactions', $raiseDebitEntry);
                    $additionalLedgerEntries[] = array_merge($raiseDebitEntry, ['_id' => $raiseDebitEntryId]);
                    $balanceAfterWagers = round($balanceSnapshot['balanceBefore'] - $raiseBet, 2);
                }

                $resolution = $this->buildStudPokerResolution(
                    is_array($round['playerCards'] ?? null) ? $round['playerCards'] : [],
                    (string) ($round['dealerUpCard'] ?? ''),
                    $action,
                    $anteBet,
                    $this->safeNumber($gameConfig['rtp'] ?? null, null)
                );

                $totalWager = $action === 'raise' ? round($anteBet + $raiseBet, 2) : $anteBet;
                $totalReturn = $resolution['totalReturn'];
                $profit = round(max(0, $totalReturn - $totalWager), 2);
                $netResult = round($totalReturn - $totalWager, 2);
                $balanceAfter = round($balanceAfterWagers + $totalReturn, 2);

                $creditEntryId = null;
                if ($totalReturn > 0) {
                    $creditEntry = $this->buildCasinoTransactionEntry(
                        $userId,
                        $totalReturn,
                        $roundId,
                        self::STUD_POKER_SOURCE_TYPE,
                        'CREDIT',
                        'casino_bet_credit',
                        $balanceAfterWagers,
                        $balanceAfter,
                        'CASINO_STUD_POKER_PAYOUT',
                        'Stud poker payout/refund credited',
                        $now,
                        $ipAddress,
                        $userAgent
                    );
                    $creditEntryId = $this->db->insertOne('transactions', $creditEntry);
                    $additionalLedgerEntries[] = array_merge($creditEntry, ['_id' => $creditEntryId]);
                }

                $this->db->updateOne('users', ['_id' => MongoRepository::id($userId)], [
                    'balance' => $balanceAfter,
                    'updatedAt' => $now,
                ]);

                $serverDecisionAt = MongoRepository::nowUtc();
                $integrityHash = $this->buildIntegrityHash([
                    'roundId' => $roundId,
                    'requestId' => $round['requestId'] ?? '',
                    'actionRequestId' => $requestId,
                    'userId' => $userId,
                    'game' => self::STUD_POKER_GAME_SLUG,
                    'playerCards' => $round['playerCards'] ?? [],
                    'dealerCards' => $resolution['dealerCards'],
                    'action' => $action,
                    'result' => $resolution['result'],
                    'totalWager' => $totalWager,
                    'totalReturn' => $totalReturn,
                    'balanceAfter' => $balanceAfter,
                    'serverDecisionAt' => $serverDecisionAt,
                ]);

                $updates = [
                    'actionRequestId' => $requestId,
                    'bets' => ['Ante' => $anteBet, 'Raise' => $raiseBet],
                    'raiseBet' => $raiseBet,
                    'ledgerEntries' => array_merge(
                        is_array($round['ledgerEntries'] ?? null) ? $round['ledgerEntries'] : [],
                        $creditEntryId !== null ? ['credit' => $creditEntryId] : []
                    ),
                    'totalWager' => $totalWager,
                    'totalReturn' => $totalReturn,
                    'profit' => $profit,
                    'netResult' => $netResult,
                    'balanceAfter' => $balanceAfter,
                    'dealerCards' => $resolution['dealerCards'],
                    'playerHand' => $resolution['playerHand'],
                    'dealerHand' => $resolution['dealerHand'],
                    'dealerQualifies' => $resolution['dealerQualifies'],
                    'playerAction' => $action,
                    'result' => $resolution['result'],
                    'roundStatus' => 'settled',
                    'integrityHash' => $integrityHash,
                    'serverDecisionAt' => $serverDecisionAt,
                    'updatedAt' => $now,
                ];
                $this->db->updateOne('casino_bets', ['_id' => MongoRepository::id($roundId)], $updates);
                $this->updateStudPokerAuditRecord($roundId, [
                    'stage' => 'settled',
                    'playerAction' => $action,
                    'dealerCards' => $resolution['dealerCards'],
                    'playerHand' => $resolution['playerHand'],
                    'dealerHand' => $resolution['dealerHand'],
                    'dealerQualifies' => $resolution['dealerQualifies'],
                    'result' => $resolution['result'],
                    'integrityHash' => $integrityHash,
                    'updatedAt' => $now,
                ]);

                $updatedRound = array_merge($round, $updates);
                $this->db->commit();

                $allLedgerEntries = array_merge($ledgerEntries, $additionalLedgerEntries);
                Response::json($this->formatCasinoBetResponse($updatedRound, $allLedgerEntries, false));
            } catch (Throwable $txErr) {
                $this->db->rollback();
                throw $txErr;
            }
        } catch (InvalidArgumentException $e) {
            $this->writeCasinoAuditLog('stud_poker_resolve_validation_error', [
                'requestId' => $requestId,
                'userId' => $userId,
                'roundId' => $roundId,
                'error' => $e->getMessage(),
            ]);
            Response::json(['message' => $e->getMessage()], 400);
        } catch (Throwable $e) {
            $this->writeCasinoAuditLog('stud_poker_resolve_server_error', [
                'requestId' => $requestId,
                'userId' => $userId,
                'roundId' => $roundId,
                'error' => $e->getMessage(),
            ]);
            Response::json(['message' => 'Server error resolving stud poker round', 'error' => $e->getMessage()], 500);
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
            $game = strtolower(trim((string) ($_GET['game'] ?? '')));
            $result = trim((string) ($_GET['result'] ?? ''));
            $fromRaw = trim((string) ($_GET['from'] ?? ''));
            $toRaw = trim((string) ($_GET['to'] ?? ''));
            $minWagerRaw = $_GET['minWager'] ?? null;
            $maxWagerRaw = $_GET['maxWager'] ?? null;

            $query = ['userId' => (string) ($actor['_id'] ?? '')];
            if ($game !== '') {
                $query['game'] = $game;
            }
            if ($result !== '') {
                $this->applyCasinoResultFilter($query, $result);
            }

            if ($fromRaw !== '') {
                try {
                    $query['createdAt']['$gte'] = $this->normalizeDateFilter($fromRaw, false);
                } catch (InvalidArgumentException $e) {
                    Response::json(['message' => 'Invalid from date'], 400);
                    return;
                }
            }
            if ($toRaw !== '') {
                try {
                    $query['createdAt']['$lte'] = $this->normalizeDateFilter($toRaw, true);
                } catch (InvalidArgumentException $e) {
                    Response::json(['message' => 'Invalid to date'], 400);
                    return;
                }
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
            $game = strtolower(trim((string) ($_GET['game'] ?? '')));
            $result = trim((string) ($_GET['result'] ?? ''));
            $fromRaw = trim((string) ($_GET['from'] ?? ''));
            $toRaw = trim((string) ($_GET['to'] ?? ''));
            $username = trim((string) ($_GET['username'] ?? ''));
            $userId = trim((string) ($_GET['userId'] ?? ''));
            $minWagerRaw = $_GET['minWager'] ?? null;
            $maxWagerRaw = $_GET['maxWager'] ?? null;
            $format = strtolower(trim((string) ($_GET['format'] ?? 'json')));

            $query = [];
            if ($game !== '') {
                $query['game'] = $game;
            }
            if ($result !== '') {
                $this->applyCasinoResultFilter($query, $result);
            }
            if ($fromRaw !== '') {
                try {
                    $query['createdAt']['$gte'] = $this->normalizeDateFilter($fromRaw, false);
                } catch (InvalidArgumentException $e) {
                    Response::json(['message' => 'Invalid from date'], 400);
                    return;
                }
            }
            if ($toRaw !== '') {
                try {
                    $query['createdAt']['$lte'] = $this->normalizeDateFilter($toRaw, true);
                } catch (InvalidArgumentException $e) {
                    Response::json(['message' => 'Invalid to date'], 400);
                    return;
                }
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
            $game = strtolower(trim((string) ($_GET['game'] ?? '')));

            $query = [];
            if ($game !== '') {
                $query['game'] = $game;
            }
            if ($fromRaw !== '') {
                try {
                    $query['createdAt']['$gte'] = $this->normalizeDateFilter($fromRaw, false);
                } catch (InvalidArgumentException $e) {
                    Response::json(['message' => 'Invalid from date'], 400);
                    return;
                }
            }
            if ($toRaw !== '') {
                try {
                    $query['createdAt']['$lte'] = $this->normalizeDateFilter($toRaw, true);
                } catch (InvalidArgumentException $e) {
                    Response::json(['message' => 'Invalid to date'], 400);
                    return;
                }
            }

            $rows = $this->db->findMany('casino_bets', $query, [
                'sort' => ['createdAt' => -1],
            ]);

            $totalWager = 0.0;
            $totalReturn = 0.0;
            $totalProfit = 0.0;
            $errors = 0;
            $netByUser = [];
            $byGame = [];

            foreach ($rows as $row) {
                $wager = $this->num($row['totalWager'] ?? 0);
                $return = $this->num($row['totalReturn'] ?? 0);
                $profit = $this->num($row['profit'] ?? 0);
                $totalWager += $wager;
                $totalReturn += $return;
                $totalProfit += $profit;

                if ((string) ($row['roundStatus'] ?? 'settled') !== 'settled') {
                    $errors++;
                }

                $username = (string) ($row['username'] ?? 'unknown');
                $netByUser[$username] = ($netByUser[$username] ?? 0.0) + $this->num($row['netResult'] ?? 0);

                $gameKey = (string) ($row['game'] ?? 'unknown');
                if (!isset($byGame[$gameKey])) {
                    $byGame[$gameKey] = [
                        'game' => $gameKey,
                        'rounds' => 0,
                        'totalWager' => 0.0,
                        'totalReturn' => 0.0,
                        'profit' => 0.0,
                    ];
                }
                $byGame[$gameKey]['rounds']++;
                $byGame[$gameKey]['totalWager'] += $wager;
                $byGame[$gameKey]['totalReturn'] += $return;
                $byGame[$gameKey]['profit'] += $profit;
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
                    'errorRate' => $errorRate,
                ],
                'byGame' => array_values(array_map(static fn(array $item): array => [
                    'game' => $item['game'],
                    'rounds' => $item['rounds'],
                    'totalWager' => round((float) $item['totalWager'], 2),
                    'totalReturn' => round((float) $item['totalReturn'], 2),
                    'profit' => round((float) $item['profit'], 2),
                ], $byGame)),
                'topWinners' => $topWinners,
                'topLosers' => $topLosers,
                'window' => [
                    'from' => $fromRaw !== '' ? $fromRaw : null,
                    'to' => $toRaw !== '' ? $toRaw : null,
                    'game' => $game !== '' ? $game : null,
                    'sampleSize' => count($rows),
                    'sampled' => false,
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
            'game',
            'roundStatus',
            'playerOutcome',
            'result',
            'outcomeSource',
            'rouletteOutcomeJson',
            'winningBetKeysJson',
            'betsJson',
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
            $rouletteOutcome = is_array($row['rouletteOutcome'] ?? null) ? $row['rouletteOutcome'] : null;
            $winningBetKeys = is_array($row['winningBetKeys'] ?? null) ? $row['winningBetKeys'] : [];
            fputcsv($stream, [
                (string) ($row['roundId'] ?? $row['_id'] ?? ''),
                (string) ($row['requestId'] ?? ''),
                (string) ($row['userId'] ?? ''),
                (string) ($row['username'] ?? ''),
                (string) ($row['game'] ?? ''),
                (string) ($row['roundStatus'] ?? 'settled'),
                $this->deriveCasinoPlayerOutcome($row),
                (string) ($row['result'] ?? ''),
                (string) ($row['outcomeSource'] ?? ''),
                $rouletteOutcome !== null ? json_encode($rouletteOutcome, JSON_UNESCAPED_SLASHES) : '',
                json_encode($winningBetKeys, JSON_UNESCAPED_SLASHES),
                json_encode($bets, JSON_UNESCAPED_SLASHES),
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

    private function requireActiveCasinoGame(string $slug): array
    {
        $game = $this->db->findOne('casinogames', ['slug' => $slug]);
        if ($game === null) {
            throw new InvalidArgumentException('Casino game configuration not found for ' . $slug);
        }

        $status = strtolower(trim((string) ($game['status'] ?? 'active')));
        if ($status !== '' && $status !== 'active') {
            throw new InvalidArgumentException('Game is currently ' . ($game['status'] ?? 'disabled'));
        }

        return $game;
    }

    private function loadLockedCasinoUser(string $userId): array
    {
        $lockedUser = $this->db->findOneForUpdate('users', ['_id' => MongoRepository::id($userId)]);
        if ($lockedUser === null) {
            throw new InvalidArgumentException('User not found');
        }

        $lockedAccessError = $this->casinoAccessError($lockedUser, true);
        if ($lockedAccessError !== null) {
            throw new InvalidArgumentException($lockedAccessError);
        }

        return $lockedUser;
    }

    private function assertUserWagerWithinLimits(array $lockedUser, float $totalWager): void
    {
        $userMinBet = $this->safeNumber($lockedUser['minBet'] ?? null, null);
        $userMaxBet = $this->safeNumber($lockedUser['maxBet'] ?? null, null);

        if ($userMinBet !== null && $userMinBet > 0 && $totalWager < $userMinBet) {
            throw new InvalidArgumentException('Minimum bet for your account is $' . number_format($userMinBet, 2));
        }
        if ($userMaxBet !== null && $userMaxBet > 0 && $totalWager > $userMaxBet) {
            throw new InvalidArgumentException('Maximum bet for your account is $' . number_format($userMaxBet, 2));
        }
    }

    private function assertCasinoLossLimits(array $lockedUser, float $wagerAmount): void
    {
        if ($wagerAmount <= 0) {
            return;
        }

        $limits = is_array($lockedUser['gamblingLimits'] ?? null) ? $lockedUser['gamblingLimits'] : [];
        $limitError = $this->checkLossLimits($lockedUser, $limits, $wagerAmount);
        if ($limitError !== null) {
            throw new InvalidArgumentException($limitError);
        }
    }

    private function checkLossLimits(array $user, array $limits, float $wagerAmount): ?string
    {
        $checks = [
            ['lossDaily', 'daily', '-1 day'],
            ['lossWeekly', 'weekly', '-7 days'],
            ['lossMonthly', 'monthly', '-30 days'],
        ];

        $userId = MongoRepository::id((string) ($user['_id'] ?? ''));
        if ($userId === '') {
            return null;
        }

        foreach ($checks as [$key, $label, $interval]) {
            $limit = isset($limits[$key]) && is_numeric($limits[$key]) ? (float) $limits[$key] : 0.0;
            if ($limit <= 0) {
                continue;
            }

            $since = gmdate(DATE_ATOM, strtotime($interval));
            $sportsbookBets = $this->db->findMany('bets', [
                'userId' => $userId,
                'createdAt' => ['$gte' => $since],
            ]);
            $casinoBets = $this->db->findMany('casino_bets', [
                'userId' => $userId,
                'createdAt' => ['$gte' => $since],
            ]);

            $totalWagered = 0.0;
            $totalWon = 0.0;

            foreach ($sportsbookBets as $bet) {
                $totalWagered += $this->num($bet['amount'] ?? 0);
                if (strtolower((string) ($bet['status'] ?? '')) === 'won') {
                    $totalWon += $this->num($bet['potentialPayout'] ?? 0);
                }
            }

            foreach ($casinoBets as $casinoBet) {
                $roundStatus = strtolower((string) ($casinoBet['roundStatus'] ?? 'settled'));
                if (in_array($roundStatus, ['cancelled', 'void'], true)) {
                    continue;
                }

                $totalWagered += $this->num($casinoBet['totalWager'] ?? 0);
                $totalWon += $this->num($casinoBet['totalReturn'] ?? 0);
            }

            $netLoss = round($totalWagered - $totalWon, 2);
            if (($netLoss + $wagerAmount) > $limit) {
                return 'This wager would exceed your '
                    . $label
                    . ' loss limit of $'
                    . number_format($limit, 2)
                    . '. Current net loss: $'
                    . number_format($netLoss, 2)
                    . '.';
            }
        }

        return null;
    }

    private function getUserBalanceSnapshot(array $lockedUser): array
    {
        $balanceBefore = round($this->num($lockedUser['balance'] ?? 0), 2);
        $pendingBalance = round($this->num($lockedUser['pendingBalance'] ?? 0), 2);
        $availableBalance = round(max(0, $balanceBefore - $pendingBalance), 2);

        return [
            'balanceBefore' => $balanceBefore,
            'pendingBalance' => $pendingBalance,
            'availableBalance' => $availableBalance,
        ];
    }

    private function buildCasinoTransactionEntry(
        string $userId,
        float $amount,
        string $roundId,
        string $sourceType,
        string $entrySide,
        string $type,
        float $balanceBefore,
        float $balanceAfter,
        string $reason,
        string $description,
        string $now,
        ?string $ipAddress,
        ?string $userAgent
    ): array {
        return [
            'userId' => $userId,
            'amount' => round($amount, 2),
            'type' => $type,
            'entrySide' => $entrySide,
            'entryGroupId' => $roundId,
            'sourceType' => $sourceType,
            'sourceId' => $roundId,
            'status' => 'completed',
            'balanceBefore' => round($balanceBefore, 2),
            'balanceAfter' => round($balanceAfter, 2),
            'referenceType' => 'CasinoRound',
            'referenceId' => $roundId,
            'reason' => $reason,
            'description' => $description,
            'ipAddress' => $ipAddress,
            'userAgent' => $userAgent,
            'createdAt' => $now,
            'updatedAt' => $now,
        ];
    }

    private function parseRouletteBets(array $rawBets): array
    {
        $entries = [];
        $normalizedBets = [];
        $totalWager = 0.0;

        if (!array_is_list($rawBets)) {
            $normalizedInput = [];
            foreach ($rawBets as $key => $amount) {
                $parts = explode(':', (string) $key, 2);
                $normalizedInput[] = [
                    'type' => $parts[0] ?? '',
                    'value' => $parts[1] ?? '',
                    'amount' => $amount,
                ];
            }
            $rawBets = $normalizedInput;
        }

        foreach ($rawBets as $rawBet) {
            if (!is_array($rawBet)) {
                continue;
            }

            $amount = $this->parseMoneyValue($rawBet['amount'] ?? 0, 'bets.amount');
            if ($amount <= 0) {
                continue;
            }

            $type = strtolower(trim((string) ($rawBet['type'] ?? '')));
            $value = strtolower(trim((string) ($rawBet['value'] ?? '')));
            $normalized = $this->normalizeRouletteBet($type, $value);
            $entry = [
                'key' => $normalized['key'],
                'type' => $normalized['type'],
                'value' => $normalized['value'],
                'label' => $normalized['label'],
                'returnMultiplier' => $normalized['returnMultiplier'],
                'amount' => $amount,
            ];
            $entries[] = $entry;
            $normalizedBets[] = [
                'key' => $entry['key'],
                'type' => $entry['type'],
                'value' => $entry['value'],
                'label' => $entry['label'],
                'amount' => $amount,
            ];
            $totalWager += $amount;
        }

        return [
            'entries' => $entries,
            'normalizedBets' => $normalizedBets,
            'totalWager' => round($totalWager, 2),
        ];
    }

    private function normalizeRouletteBet(string $type, string $value): array
    {
        if ($type === 'straight') {
            if ($value === '' || ctype_digit($value) === false) {
                throw new InvalidArgumentException('Roulette straight bets require a number between 0 and 36');
            }
            $number = (int) $value;
            if ($number < 0 || $number > 36) {
                throw new InvalidArgumentException('Roulette straight bets require a number between 0 and 36');
            }

            return [
                'key' => 'straight:' . $number,
                'type' => 'straight',
                'value' => (string) $number,
                'label' => 'Straight ' . $number,
                'returnMultiplier' => 36.0,
            ];
        }

        if ($type === 'dozen') {
            if (!in_array($value, ['first', 'second', 'third'], true)) {
                throw new InvalidArgumentException('Invalid roulette dozen bet');
            }

            return [
                'key' => 'dozen:' . $value,
                'type' => 'dozen',
                'value' => $value,
                'label' => ucfirst($value) . ' 12',
                'returnMultiplier' => 3.0,
            ];
        }

        if ($type === 'column') {
            if (!in_array($value, ['first', 'second', 'third'], true)) {
                throw new InvalidArgumentException('Invalid roulette column bet');
            }

            return [
                'key' => 'column:' . $value,
                'type' => 'column',
                'value' => $value,
                'label' => ucfirst($value) . ' Column',
                'returnMultiplier' => 3.0,
            ];
        }

        if ($type === 'color') {
            if (!in_array($value, ['red', 'black'], true)) {
                throw new InvalidArgumentException('Invalid roulette color bet');
            }

            return [
                'key' => 'color:' . $value,
                'type' => 'color',
                'value' => $value,
                'label' => ucfirst($value),
                'returnMultiplier' => 2.0,
            ];
        }

        if ($type === 'parity') {
            if (!in_array($value, ['even', 'odd'], true)) {
                throw new InvalidArgumentException('Invalid roulette parity bet');
            }

            return [
                'key' => 'parity:' . $value,
                'type' => 'parity',
                'value' => $value,
                'label' => ucfirst($value),
                'returnMultiplier' => 2.0,
            ];
        }

        if ($type === 'range') {
            if (!in_array($value, ['low', 'high'], true)) {
                throw new InvalidArgumentException('Invalid roulette range bet');
            }

            return [
                'key' => 'range:' . $value,
                'type' => 'range',
                'value' => $value,
                'label' => $value === 'low' ? '1-18' : '19-36',
                'returnMultiplier' => 2.0,
            ];
        }

        throw new InvalidArgumentException('Unsupported roulette bet type: ' . $type);
    }

    private function pickRouletteOutcome(array $entries): array
    {
        $pickedNumber = random_int(0, 36);
        $picked = $this->calculateRouletteOutcomeReturn($entries, $pickedNumber);
        return [
            'outcome' => $this->rouletteOutcomeDetails($pickedNumber),
            'totalReturn' => $picked['totalReturn'],
            'winningBetKeys' => $picked['winningBetKeys'],
        ];
    }

    private function calculateRouletteOutcomeReturn(array $entries, int $number): array
    {
        $totalReturn = 0.0;
        $winningBetKeys = [];
        $outcome = $this->rouletteOutcomeDetails($number);

        foreach ($entries as $entry) {
            if ($this->rouletteBetWins($entry, $outcome)) {
                $totalReturn += round($entry['amount'] * $entry['returnMultiplier'], 2);
                $winningBetKeys[] = (string) $entry['key'];
            }
        }

        return [
            'totalReturn' => round($totalReturn, 2),
            'winningBetKeys' => $winningBetKeys,
        ];
    }

    private function rouletteOutcomeDetails(int $number): array
    {
        $color = 'green';
        if ($number !== 0) {
            $color = in_array($number, self::ROULETTE_RED_NUMBERS, true) ? 'red' : 'black';
        }

        $parity = $number === 0 ? null : ($number % 2 === 0 ? 'even' : 'odd');
        $range = null;
        $dozen = null;
        $column = null;
        if ($number >= 1 && $number <= 18) {
            $range = 'low';
        } elseif ($number >= 19 && $number <= 36) {
            $range = 'high';
        }
        if ($number >= 1 && $number <= 12) {
            $dozen = 'first';
        } elseif ($number >= 13 && $number <= 24) {
            $dozen = 'second';
        } elseif ($number >= 25 && $number <= 36) {
            $dozen = 'third';
        }
        if ($number !== 0) {
            $mod = $number % 3;
            $column = $mod === 1 ? 'first' : ($mod === 2 ? 'second' : 'third');
        }

        return [
            'number' => $number,
            'color' => $color,
            'parity' => $parity,
            'range' => $range,
            'dozen' => $dozen,
            'column' => $column,
        ];
    }

    private function rouletteBetWins(array $entry, array $outcome): bool
    {
        return match ((string) ($entry['type'] ?? '')) {
            'straight' => (int) ($entry['value'] ?? -1) === (int) ($outcome['number'] ?? -999),
            'dozen' => (string) ($entry['value'] ?? '') !== '' && (string) ($entry['value'] ?? '') === (string) ($outcome['dozen'] ?? ''),
            'column' => (string) ($entry['value'] ?? '') !== '' && (string) ($entry['value'] ?? '') === (string) ($outcome['column'] ?? ''),
            'color' => (string) ($entry['value'] ?? '') === (string) ($outcome['color'] ?? ''),
            'parity' => (string) ($entry['value'] ?? '') === (string) ($outcome['parity'] ?? ''),
            'range' => (string) ($entry['value'] ?? '') === (string) ($outcome['range'] ?? ''),
            default => false,
        };
    }

    private function formatStudPokerStartResponse(array $betRecord, array $ledgerEntries, bool $idempotent): array
    {
        return [
            'roundId' => (string) ($betRecord['roundId'] ?? $betRecord['_id'] ?? ''),
            'requestId' => (string) ($betRecord['requestId'] ?? ''),
            'game' => self::STUD_POKER_GAME_SLUG,
            'roundStatus' => (string) ($betRecord['roundStatus'] ?? 'awaiting_action'),
            'anteBet' => $this->num($betRecord['anteBet'] ?? 0),
            'playerCards' => is_array($betRecord['playerCards'] ?? null) ? $betRecord['playerCards'] : [],
            'dealerUpCard' => (string) ($betRecord['dealerUpCard'] ?? ''),
            'balanceBefore' => $this->num($betRecord['balanceBefore'] ?? 0),
            'balanceAfter' => $this->num($betRecord['balanceAfter'] ?? 0),
            'newBalance' => $this->num($betRecord['balanceAfter'] ?? 0),
            'ledgerEntries' => array_map(fn (array $entry): array => $this->mapLedgerEntry($entry), $ledgerEntries),
            'idempotent' => $idempotent,
        ];
    }

    private function dealStudPokerOpeningRound(): array
    {
        $deck = $this->buildShuffledDeck();
        $playerCards = [];
        for ($i = 0; $i < 5; $i++) {
            $playerCards[] = array_pop($deck);
        }
        $dealerUpCard = array_pop($deck);

        $playerCodes = array_values(array_map(static fn(array $card): string => (string) ($card['code'] ?? ''), $playerCards));
        $dealerUpCode = (string) ($dealerUpCard['code'] ?? '');

        return [
            'playerCards' => $playerCodes,
            'dealerUpCard' => $dealerUpCode,
            'usedCards' => array_values(array_merge($playerCodes, [$dealerUpCode])),
        ];
    }

    private function buildStudPokerResolution(array $playerCardCodes, string $dealerUpCard, string $action, float $anteBet, ?float $configuredRtp): array
    {
        if (count($playerCardCodes) !== 5 || $dealerUpCard === '') {
            throw new InvalidArgumentException('Stud poker round data is incomplete');
        }

        $playerCards = array_map(fn (string $code): array => $this->cardCodeToData($code), $playerCardCodes);
        $playerEval = $this->evaluateStudPokerHand($playerCards, false);

        $targetReturn = null;
        if ($action === 'raise' && $configuredRtp !== null && $configuredRtp >= 0 && $configuredRtp <= 100) {
            $targetReturn = round(($anteBet * 3) * ($configuredRtp / 100), 2);
        }

        $dealerCards = $this->pickStudPokerDealerHand($playerCardCodes, $dealerUpCard, $action, $anteBet, $targetReturn);
        $dealerEval = $this->evaluateStudPokerHand(array_map(fn (string $code): array => $this->cardCodeToData($code), $dealerCards), true);
        $result = $action === 'fold' ? 'Dealer' : $this->compareStudPokerHands($playerEval, $dealerEval);
        $totalReturn = $action === 'raise'
            ? $this->calculateStudPokerRaiseReturn($anteBet, $playerEval, $dealerEval, $result)
            : 0.0;

        return [
            'dealerCards' => $dealerCards,
            'playerHand' => $playerEval['displayName'],
            'dealerHand' => $dealerEval['displayName'],
            'dealerQualifies' => $dealerEval['qualifies'],
            'result' => $result,
            'totalReturn' => round($totalReturn, 2),
        ];
    }

    private function pickStudPokerDealerHand(
        array $playerCardCodes,
        string $dealerUpCard,
        string $action,
        float $anteBet,
        ?float $targetReturn
    ): array {
        $used = array_values(array_unique(array_merge($playerCardCodes, [$dealerUpCard])));
        $remaining = array_values(array_filter(
            array_map(static fn(array $card): string => (string) ($card['code'] ?? ''), $this->buildShuffledDeck()),
            static fn(string $code): bool => !in_array($code, $used, true)
        ));
        $playerEval = $this->evaluateStudPokerHand(array_map(fn (string $code): array => $this->cardCodeToData($code), $playerCardCodes), false);

        $best = null;
        $bestScore = INF;
        for ($i = 0; $i < 600; $i++) {
            $sample = $this->pickRandomCards($remaining, 4);
            $dealerCards = array_values(array_merge([$dealerUpCard], $sample));
            $dealerEval = $this->evaluateStudPokerHand(array_map(fn (string $code): array => $this->cardCodeToData($code), $dealerCards), true);
            $result = $action === 'fold' ? 'Dealer' : $this->compareStudPokerHands($playerEval, $dealerEval);

            if ($action === 'fold') {
                if ($result !== 'Dealer') {
                    continue;
                }
                return $dealerCards;
            }

            $totalReturn = $this->calculateStudPokerRaiseReturn($anteBet, $playerEval, $dealerEval, $result);
            if ($targetReturn === null) {
                return $dealerCards;
            }

            $score = abs($totalReturn - $targetReturn);
            if ($score < $bestScore) {
                $bestScore = $score;
                $best = $dealerCards;
                if ($score < 0.01) {
                    break;
                }
            }
        }

        if ($best !== null) {
            return $best;
        }

        return array_values(array_merge([$dealerUpCard], $this->pickRandomCards($remaining, 4)));
    }

    private function pickRandomCards(array $deckCodes, int $count): array
    {
        if ($count <= 0) {
            return [];
        }
        if (count($deckCodes) < $count) {
            throw new InvalidArgumentException('Not enough cards remaining to complete the stud poker hand');
        }

        $keys = array_rand($deckCodes, $count);
        if (!is_array($keys)) {
            $keys = [$keys];
        }

        $picked = [];
        foreach ($keys as $key) {
            $picked[] = (string) $deckCodes[$key];
        }

        return array_values($picked);
    }

    private function calculateStudPokerRaiseReturn(float $anteBet, array $playerEval, array $dealerEval, string $result): float
    {
        if ($result === 'Dealer') {
            return 0.0;
        }

        if (!$dealerEval['qualifies'] && $result !== 'Dealer') {
            return round(($anteBet * 2) + ($anteBet * 2), 2);
        }

        if ($result === 'Player') {
            $raiseBet = $anteBet * 2;
            $multiplier = self::STUD_POKER_PAYOUTS[$playerEval['name']] ?? 1;
            return round($raiseBet + ($raiseBet * $multiplier) + $raiseBet, 2);
        }

        return round($anteBet + ($anteBet * 2), 2);
    }

    private function compareStudPokerHands(array $playerEval, array $dealerEval): string
    {
        if ($playerEval['rankValue'] > $dealerEval['rankValue']) {
            return 'Player';
        }
        if ($dealerEval['rankValue'] > $playerEval['rankValue']) {
            return 'Dealer';
        }

        $length = max(count($playerEval['tiebreak']), count($dealerEval['tiebreak']));
        for ($i = 0; $i < $length; $i++) {
            $playerValue = (int) ($playerEval['tiebreak'][$i] ?? 0);
            $dealerValue = (int) ($dealerEval['tiebreak'][$i] ?? 0);
            if ($playerValue > $dealerValue) {
                return 'Player';
            }
            if ($dealerValue > $playerValue) {
                return 'Dealer';
            }
        }

        return 'Standoff';
    }

    private function evaluateStudPokerHand(array $cards, bool $dealer): array
    {
        if (count($cards) !== 5) {
            throw new InvalidArgumentException('Stud poker hands must contain exactly 5 cards');
        }

        usort($cards, static fn(array $a, array $b): int => ((int) $a['rank']) <=> ((int) $b['rank']));
        $ranksAsc = array_values(array_map(static fn(array $card): int => (int) $card['rank'], $cards));
        $ranksDesc = array_reverse($ranksAsc);
        $suits = array_values(array_map(static fn(array $card): string => (string) $card['suit'], $cards));
        $rankCounts = array_count_values($ranksAsc);
        arsort($rankCounts);

        $isFlush = count(array_unique($suits)) === 1;
        $isStraight = false;
        $straightHigh = max($ranksAsc);
        if ($ranksAsc === [2, 3, 4, 5, 14]) {
            $isStraight = true;
            $straightHigh = 5;
        } elseif (
            $ranksAsc[0] + 1 === $ranksAsc[1]
            && $ranksAsc[1] + 1 === $ranksAsc[2]
            && $ranksAsc[2] + 1 === $ranksAsc[3]
            && $ranksAsc[3] + 1 === $ranksAsc[4]
        ) {
            $isStraight = true;
        }

        $hasAce = in_array(14, $ranksAsc, true);
        $hasKing = in_array(13, $ranksAsc, true);

        $name = 'NO_HAND';
        $displayName = 'No Hand';
        $rankValue = 0;
        $tiebreak = $ranksDesc;

        if ($isFlush && $ranksAsc === [10, 11, 12, 13, 14]) {
            $name = 'ROYAL_FLUSH';
            $displayName = 'Royal Flush';
            $rankValue = 10;
            $tiebreak = [14];
        } elseif ($isFlush && $isStraight) {
            $name = 'STRAIGHT_FLUSH';
            $displayName = 'Straight Flush';
            $rankValue = 9;
            $tiebreak = [$straightHigh];
        } elseif (max($rankCounts) === 4) {
            $quadRank = (int) array_search(4, $rankCounts, true);
            $kicker = (int) array_search(1, $rankCounts, true);
            $name = 'FOUR_OF_A_KIND';
            $displayName = 'Four of a Kind';
            $rankValue = 8;
            $tiebreak = [$quadRank, $kicker];
        } elseif (count($rankCounts) === 2 && in_array(3, $rankCounts, true) && in_array(2, $rankCounts, true)) {
            $tripRank = (int) array_search(3, $rankCounts, true);
            $pairRank = (int) array_search(2, $rankCounts, true);
            $name = 'FULL_HOUSE';
            $displayName = 'Full House';
            $rankValue = 7;
            $tiebreak = [$tripRank, $pairRank];
        } elseif ($isFlush) {
            $name = 'FLUSH';
            $displayName = 'Flush';
            $rankValue = 6;
            $tiebreak = $ranksDesc;
        } elseif ($isStraight) {
            $name = 'STRAIGHT';
            $displayName = 'Straight';
            $rankValue = 5;
            $tiebreak = [$straightHigh];
        } elseif (in_array(3, $rankCounts, true)) {
            $tripRank = (int) array_search(3, $rankCounts, true);
            $kickers = [];
            foreach ($ranksDesc as $rank) {
                if ($rank !== $tripRank) {
                    $kickers[] = $rank;
                }
            }
            $name = 'THREE_OF_A_KIND';
            $displayName = 'Three of a Kind';
            $rankValue = 4;
            $tiebreak = array_merge([$tripRank], $kickers);
        } elseif (count(array_filter($rankCounts, static fn(int $count): bool => $count === 2)) === 2) {
            $pairRanks = [];
            $kicker = 0;
            foreach ($rankCounts as $rank => $count) {
                if ($count === 2) {
                    $pairRanks[] = (int) $rank;
                } else {
                    $kicker = (int) $rank;
                }
            }
            rsort($pairRanks);
            $name = 'TWO_PAIR';
            $displayName = 'Two Pair';
            $rankValue = 3;
            $tiebreak = array_merge($pairRanks, [$kicker]);
        } elseif (in_array(2, $rankCounts, true)) {
            $pairRank = (int) array_search(2, $rankCounts, true);
            $kickers = [];
            foreach ($ranksDesc as $rank) {
                if ($rank !== $pairRank) {
                    $kickers[] = $rank;
                }
            }
            $name = 'ONE_PAIR';
            $displayName = 'One Pair';
            $rankValue = 2;
            $tiebreak = array_merge([$pairRank], $kickers);
        } else {
            $qualifiesHighCard = $dealer ? ($hasAce && $hasKing) : ($hasAce || $hasKing);
            if ($qualifiesHighCard) {
                $name = 'HIGH_CARD';
                $displayName = 'High Card';
                $rankValue = 1;
                $tiebreak = $ranksDesc;
            }
        }

        $qualifies = $name !== 'NO_HAND';
        if ($dealer && $name === 'HIGH_CARD') {
            $qualifies = $hasAce && $hasKing;
        }

        return [
            'name' => $name,
            'displayName' => $displayName,
            'rankValue' => $rankValue,
            'qualifies' => $qualifies,
            'tiebreak' => $tiebreak,
        ];
    }

    private function cardCodeToData(string $code): array
    {
        $trimmed = strtoupper(trim($code));
        if ($trimmed === '' || strlen($trimmed) < 2) {
            throw new InvalidArgumentException('Invalid card code');
        }

        $suit = substr($trimmed, -1);
        $rankCode = substr($trimmed, 0, -1);
        $rank = match ($rankCode) {
            'A' => 14,
            'K' => 13,
            'Q' => 12,
            'J' => 11,
            default => (int) $rankCode,
        };

        if ($rank < 2 || $rank > 14) {
            throw new InvalidArgumentException('Invalid card rank');
        }
        if (!in_array($suit, ['H', 'D', 'C', 'S'], true)) {
            throw new InvalidArgumentException('Invalid card suit');
        }

        return [
            'code' => $trimmed,
            'rank' => $rank,
            'suit' => $suit,
        ];
    }

    private function updateStudPokerAuditRecord(string $roundId, array $updates): void
    {
        $existing = $this->db->findOne('casino_round_audit', ['roundId' => $roundId]);
        if ($existing === null) {
            $payload = array_merge([
                '_id' => $roundId,
                'roundId' => $roundId,
                'game' => self::STUD_POKER_GAME_SLUG,
                'rngVersion' => self::STUD_POKER_RNG_VERSION,
                'createdAt' => MongoRepository::nowUtc(),
            ], $updates);
            $this->db->insertOne('casino_round_audit', $payload);
            return;
        }

        $this->db->updateOne('casino_round_audit', ['_id' => MongoRepository::id($roundId)], $updates);
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

    private function applyCasinoResultFilter(array &$query, string $result): void
    {
        $normalized = strtolower(trim($result));
        if ($normalized === '') {
            return;
        }

        if ($normalized === 'win') {
            $query['roundStatus'] = 'settled';
            $query['netResult']['$gt'] = 0;
            return;
        }

        if (in_array($normalized, ['lose', 'loss'], true)) {
            $query['roundStatus'] = 'settled';
            $query['netResult']['$lt'] = 0;
            return;
        }

        if (in_array($normalized, ['push', 'draw', 'refund'], true)) {
            $query['roundStatus'] = 'settled';
            $query['netResult'] = 0.0;
            return;
        }

        if ($normalized === 'pending') {
            $query['roundStatus'] = ['$ne' => 'settled'];
            return;
        }

        $query['result'] = ['$regex' => '^' . preg_quote($result, '/') . '$', '$options' => 'i'];
    }

    private function deriveCasinoPlayerOutcome(array $bet): string
    {
        $roundStatus = strtolower(trim((string) ($bet['roundStatus'] ?? 'settled')));
        if ($roundStatus !== 'settled') {
            return 'Pending';
        }

        $netResult = $this->num($bet['netResult'] ?? 0);
        if ($netResult > 0) {
            return 'Win';
        }
        if ($netResult < 0) {
            return 'Lose';
        }

        return 'Push';
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
            'playerAction' => $bet['playerAction'] ?? null,
            'playerHand' => $bet['playerHand'] ?? null,
            'dealerHand' => $bet['dealerHand'] ?? null,
            'dealerUpCard' => $bet['dealerUpCard'] ?? null,
            'dealerQualifies' => $bet['dealerQualifies'] ?? null,
            'rouletteOutcome' => is_array($bet['rouletteOutcome'] ?? null) ? $bet['rouletteOutcome'] : null,
            'winningBetKeys' => is_array($bet['winningBetKeys'] ?? null) ? array_values(array_map('strval', $bet['winningBetKeys'])) : [],
            'blackjackRoundMeta' => is_array($bet['blackjackRoundMeta'] ?? null) ? $bet['blackjackRoundMeta'] : null,
            'outcomeSource' => (string) ($bet['outcomeSource'] ?? ''),
            'playerOutcome' => $this->deriveCasinoPlayerOutcome($bet),
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
            'roundStatus' => (string) ($bet['roundStatus'] ?? 'settled'),
            'createdAt' => $bet['createdAt'] ?? null,
        ];
    }

    private function mapCasinoBetDetail(array $bet, array $ledgerEntries, ?array $audit): array
    {
        $row = $this->mapCasinoBetRow($bet);
        $row['playerCards'] = is_array($bet['playerCards'] ?? null) ? $bet['playerCards'] : [];
        $row['bankerCards'] = is_array($bet['bankerCards'] ?? null) ? $bet['bankerCards'] : [];
        $row['dealerCards'] = is_array($bet['dealerCards'] ?? null) ? $bet['dealerCards'] : [];
        $row['roundStatus'] = (string) ($bet['roundStatus'] ?? 'settled');
        $row['ledgerEntries'] = array_map(fn (array $entry): array => $this->mapLedgerEntry($entry), $ledgerEntries);
        $row['audit'] = $audit !== null ? [
            'deckHash' => (string) ($audit['deckHash'] ?? ''),
            'integrityHash' => (string) ($audit['integrityHash'] ?? ''),
            'rngVersion' => (string) ($audit['rngVersion'] ?? ''),
            'outcomeSource' => (string) ($audit['outcomeSource'] ?? ''),
            'bets' => is_array($audit['bets'] ?? null) ? $audit['bets'] : [],
            'rouletteOutcome' => is_array($audit['rouletteOutcome'] ?? null) ? $audit['rouletteOutcome'] : null,
            'winningBetKeys' => is_array($audit['winningBetKeys'] ?? null) ? array_values(array_map('strval', $audit['winningBetKeys'])) : [],
            'blackjackRoundMeta' => is_array($audit['blackjackRoundMeta'] ?? null) ? $audit['blackjackRoundMeta'] : null,
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
            'game' => (string) ($betRecord['game'] ?? ''),
            'roundStatus' => (string) ($betRecord['roundStatus'] ?? 'settled'),
            'result' => (string) ($betRecord['result'] ?? ''),
            'playerCards' => is_array($betRecord['playerCards'] ?? null) ? $betRecord['playerCards'] : [],
            'bankerCards' => is_array($betRecord['bankerCards'] ?? null) ? $betRecord['bankerCards'] : [],
            'dealerCards' => is_array($betRecord['dealerCards'] ?? null) ? $betRecord['dealerCards'] : [],
            'dealerUpCard' => $betRecord['dealerUpCard'] ?? null,
            'playerTotal' => (int) ($betRecord['playerTotal'] ?? 0),
            'bankerTotal' => (int) ($betRecord['bankerTotal'] ?? 0),
            'playerAction' => $betRecord['playerAction'] ?? null,
            'playerHand' => $betRecord['playerHand'] ?? null,
            'dealerHand' => $betRecord['dealerHand'] ?? null,
            'dealerQualifies' => $betRecord['dealerQualifies'] ?? null,
            'rouletteOutcome' => is_array($betRecord['rouletteOutcome'] ?? null) ? $betRecord['rouletteOutcome'] : null,
            'winningBetKeys' => is_array($betRecord['winningBetKeys'] ?? null) ? array_values(array_map('strval', $betRecord['winningBetKeys'])) : [],
            'blackjackRoundMeta' => is_array($betRecord['blackjackRoundMeta'] ?? null) ? $betRecord['blackjackRoundMeta'] : null,
            'outcomeSource' => (string) ($betRecord['outcomeSource'] ?? ''),
            'playerOutcome' => $this->deriveCasinoPlayerOutcome($betRecord),
            'bets' => is_array($betRecord['bets'] ?? null) ? $betRecord['bets'] : [],
            'totalWager' => $this->num($betRecord['totalWager'] ?? 0),
            'totalReturn' => $this->num($betRecord['totalReturn'] ?? 0),
            'profit' => $this->num($betRecord['profit'] ?? 0),
            'netResult' => $this->num($betRecord['netResult'] ?? 0),
            'balanceBefore' => $this->num($betRecord['balanceBefore'] ?? 0),
            'balanceAfter' => $balanceAfter,
            'newBalance' => $balanceAfter,
            'userId' => (string) ($betRecord['userId'] ?? ''),
            'username' => (string) ($betRecord['username'] ?? ''),
            'rngVersion' => (string) ($betRecord['rngVersion'] ?? ''),
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

        $selfExcludedUntil = $this->activeRestrictionUntil($user['selfExcludedUntil'] ?? null);
        if ($selfExcludedUntil !== null) {
            return 'Account is self-excluded until ' . $selfExcludedUntil . '. Please contact support if you need assistance.';
        }

        $coolingOffUntil = $this->activeRestrictionUntil($user['coolingOffUntil'] ?? null);
        if ($coolingOffUntil !== null) {
            return 'Account is in cooling-off period until ' . $coolingOffUntil;
        }

        if (!$this->isCasinoEnabled($user)) {
            return 'Casino access is disabled for this account';
        }

        return null;
    }

    private function activeRestrictionUntil(mixed $rawValue): ?string
    {
        if (!is_string($rawValue)) {
            return null;
        }

        $value = trim($rawValue);
        if ($value === '') {
            return null;
        }

        $timestamp = strtotime($value);
        if ($timestamp === false || $timestamp <= time()) {
            return null;
        }

        return $value;
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

    private function normalizeDateFilter(string $raw, bool $endOfDay): string
    {
        $value = trim($raw);
        if ($value === '') {
            throw new InvalidArgumentException('Date filter cannot be empty');
        }

        $utc = new DateTimeZone('UTC');
        if (preg_match('/^\d{4}-\d{2}-\d{2}$/', $value) === 1) {
            $dt = DateTimeImmutable::createFromFormat('!Y-m-d', $value, $utc);
            if ($dt === false) {
                throw new InvalidArgumentException('Invalid date filter');
            }
            if ($endOfDay) {
                $dt = $dt->setTime(23, 59, 59);
            }
            return $dt->format(DATE_ATOM);
        }

        try {
            $dt = new DateTimeImmutable($value);
        } catch (Throwable $e) {
            throw new InvalidArgumentException('Invalid date filter', 0, $e);
        }

        return $dt->setTimezone($utc)->format(DATE_ATOM);
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
