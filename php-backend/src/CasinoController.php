<?php

declare(strict_types=1);


final class CasinoController
{
    private SqlRepository $db;
    private string $jwtSecret;

    private const CASINO_CATEGORIES = ['lobby', 'table_games', 'slots', 'video_poker', 'specialty_games'];
    private const BACCARAT_GAME_SLUG = 'baccarat';
    private const BLACKJACK_GAME_SLUG = 'blackjack';
    private const CRAPS_GAME_SLUG = 'craps';
    private const ARABIAN_GAME_SLUG = 'arabian';
    private const JURASSIC_RUN_GAME_SLUG = 'jurassic-run';
    private const THREE_CARD_POKER_GAME_SLUG = '3card-poker';
    private const LEGACY_ARABIAN_TREASURE_GAME_SLUG = 'arabian-treasure';
    private const ROULETTE_GAME_SLUG = 'roulette';
    private const STUD_POKER_GAME_SLUG = 'stud-poker';
    private const REMOVED_GAME_SLUGS = [
        self::LEGACY_ARABIAN_TREASURE_GAME_SLUG,
        self::ROULETTE_GAME_SLUG,
        self::STUD_POKER_GAME_SLUG,
    ];
    private const BACCARAT_SOURCE_TYPE = 'casino_baccarat';
    private const BLACKJACK_SOURCE_TYPE = 'casino_blackjack';
    private const CRAPS_SOURCE_TYPE = 'casino_craps';
    private const ARABIAN_SOURCE_TYPE = 'casino_arabian';
    private const JURASSIC_RUN_SOURCE_TYPE = 'casino_jurassic_run';
    private const THREE_CARD_POKER_SOURCE_TYPE = 'casino_3card_poker';
    private const ROULETTE_SOURCE_TYPE = 'casino_roulette';
    private const STUD_POKER_SOURCE_TYPE = 'casino_stud_poker';
    private const BACCARAT_RNG_VERSION = 'csprng-v1';
    private const BLACKJACK_RNG_VERSION = 'server-sim-v3';
    private const BLACKJACK_DEFAULT_DECK_COUNT = 6;
    private const BLACKJACK_MIN_DECK_COUNT = 2;
    private const BLACKJACK_MAX_DECK_COUNT = 8;
    private const CRAPS_RNG_VERSION = 'server-rules-v1';
    private const ARABIAN_RNG_VERSION = 'server-slot-v1';
    private const JURASSIC_RUN_RNG_VERSION = 'jurassic-slot-v1';
    private const THREE_CARD_POKER_RNG_VERSION = 'client-cards-server-rules-v2';
    private const ROULETTE_RNG_VERSION = 'csprng-wheel-v2';
    private const STUD_POKER_RNG_VERSION = 'stud-house-v1';
    private const IN_HOUSE_OVERLAY_ONLY_GAME_MESSAGES = [
        self::BACCARAT_GAME_SLUG => 'Baccarat is available only from the in-house casino table.',
        self::BLACKJACK_GAME_SLUG => 'Blackjack is available only from the in-house casino table.',
        self::CRAPS_GAME_SLUG => 'Craps is available only from the in-house casino table.',
        self::ARABIAN_GAME_SLUG => 'Arabian Game is available only from the in-house casino table.',
        self::JURASSIC_RUN_GAME_SLUG => 'Jurassic Run is available only from the in-house casino table.',
        self::THREE_CARD_POKER_GAME_SLUG => '3-Card Poker is available only from the in-house casino table.',
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
    private const ARABIAN_REELS = 5;
    private const ARABIAN_ROWS = 3;
    private const ARABIAN_WILD_SYMBOL = 8;
    private const ARABIAN_BONUS_SYMBOL = 9;
    private const ARABIAN_FREESPIN_SYMBOL = 10;
    private const ARABIAN_MAX_LINES = 20;
    private const ARABIAN_COIN_STEP = 0.05;
    private const ARABIAN_LINE_PATTERNS = [
        [1, 1, 1, 1, 1],
        [0, 0, 0, 0, 0],
        [2, 2, 2, 2, 2],
        [0, 1, 2, 1, 0],
        [2, 1, 0, 1, 2],
        [1, 0, 0, 0, 1],
        [1, 2, 2, 2, 1],
        [0, 0, 1, 2, 2],
        [2, 2, 1, 0, 0],
        [1, 2, 1, 0, 1],
        [2, 0, 1, 2, 1],
        [0, 1, 1, 1, 0],
        [2, 1, 1, 1, 2],
        [0, 1, 0, 1, 0],
        [2, 1, 2, 1, 2],
        [1, 1, 0, 1, 1],
        [1, 1, 2, 1, 1],
        [0, 0, 2, 0, 0],
        [2, 2, 0, 2, 2],
        [0, 2, 2, 2, 0],
    ];
    private const ARABIAN_PAYTABLE = [
        1 => [0, 0, 90, 150, 200],
        2 => [0, 0, 80, 110, 160],
        3 => [0, 0, 70, 100, 150],
        4 => [0, 0, 50, 80, 110],
        5 => [0, 0, 40, 60, 80],
        6 => [0, 0, 30, 50, 70],
        7 => [0, 0, 20, 30, 50],
    ];
    private const ARABIAN_SYMBOL_WEIGHTS = [
        1 => 1,
        2 => 2,
        3 => 3,
        4 => 4,
        5 => 5,
        6 => 6,
        7 => 7,
        8 => 1,
        9 => 2,
        10 => 2,
    ];
    private const ARABIAN_BONUS_PRIZES = [10, 30, 60, 90, 0, 20, 60, 120, 200, 0, 40, 30, 20, 10, 0, 80, 60, 40, 1000, 0];
    private const ARABIAN_BONUS_PRIZE_WEIGHTS = [6, 6, 6, 5, 6, 5, 4, 3, 1, 5, 5, 6, 7, 5, 4, 4, 5, 5, 1, 4];
    private const ARABIAN_FREESPIN_AWARDS = [
        3 => 4,
        4 => 6,
        5 => 8,
    ];
    private const JURASSIC_RUN_ALLOWED_BETS = [1, 5, 10, 50, 100, 200, 400, 500, 1000, 2000, 5000];
    private const JURASSIC_RUN_DEFAULT_BET_ID = 0;
    private const JURASSIC_RUN_DEFAULT_JACKPOT = 10000;
    private const JURASSIC_RUN_DISCLOSED_RTP = 95.0;
    private const JURASSIC_RUN_FIXED_PAYLINES = 10;
    private const JURASSIC_RUN_VOLATILITY = 'medium';
    private const JURASSIC_RUN_MAX_FREE_SPINS = 500;
    private const JURASSIC_RUN_JACKPOT_FEE_PERCENT = 5;
    private const JURASSIC_RUN_PAYOUT_SCALE = 0.47;
    private const JURASSIC_RUN_SYMBOLS = ['1', '2', '3', '4', '5', '6', '7', '8', 'FreeSpin', 'Wild', 'JP'];
    private const JURASSIC_RUN_SYMBOL_WEIGHTS = [16, 16, 15, 14, 14, 14, 13, 12, 15, 5, 1];
    private const JURASSIC_RUN_PAYOUT_MULTIPLIERS = [
        '1' => [3 => 1.0, 4 => 2.0, 5 => 4.0],
        '2' => [3 => 2.0, 4 => 4.0, 5 => 8.0],
        '3' => [3 => 3.0, 4 => 6.0, 5 => 10.0],
        '4' => [3 => 4.0, 4 => 9.0, 5 => 15.0],
        '5' => [3 => 5.0, 4 => 15.0, 5 => 30.0],
        '6' => [3 => 10.0, 4 => 30.0, 5 => 50.0],
        '7' => [3 => 15.0, 4 => 45.0, 5 => 75.0],
        '8' => [3 => 20.0, 4 => 60.0, 5 => 100.0],
    ];
    private const JURASSIC_RUN_FREE_SPIN_AWARDS = [
        3 => 2,
        4 => 3,
        5 => 4,
    ];
    private const JURASSIC_RUN_LINE_PATTERNS = [
        [0, 0, 0, 0, 0],
        [1, 1, 1, 1, 1],
        [2, 2, 2, 2, 2],
        [0, 1, 2, 1, 0],
        [2, 1, 0, 1, 2],
        [0, 0, 1, 2, 2],
        [2, 2, 1, 0, 0],
        [1, 0, 0, 0, 1],
        [1, 2, 2, 2, 1],
        [0, 2, 0, 2, 0],
    ];

    private const DEFAULT_CASINO_GAMES = [
        ['provider' => 'internal', 'name' => 'Single Hand ($1-$100)', 'slug' => 'single-hand-1-100', 'category' => 'table_games', 'minBet' => 1, 'maxBet' => 100, 'themeColor' => '#115e59', 'icon' => 'fa-solid fa-diamond', 'isFeatured' => true],
        ['provider' => 'internal', 'name' => 'Baccarat', 'slug' => 'baccarat', 'category' => 'table_games', 'minBet' => 1, 'maxBet' => 100, 'themeColor' => '#9f1239', 'icon' => 'fa-solid fa-gem', 'imageUrl' => '/games/baccarat/assets/menuscreen.webp', 'tags' => ['table games', 'baccarat', 'in-house', 'live casino'], 'isFeatured' => true],
        ['provider' => 'internal', 'name' => 'Blackjack', 'slug' => 'blackjack', 'category' => 'table_games', 'minBet' => 1, 'maxBet' => 10000, 'themeColor' => '#0b5563', 'icon' => 'fa-solid fa-club', 'imageUrl' => '/games/blackjack/src/images/misc/table.png', 'tags' => ['table games', 'blackjack', 'in-house', 'live casino'], 'isFeatured' => true],
        ['provider' => 'internal', 'name' => 'Craps', 'slug' => 'craps', 'category' => 'table_games', 'minBet' => 1, 'maxBet' => 10000, 'themeColor' => '#0a4f3a', 'icon' => 'fa-solid fa-dice-six', 'imageUrl' => '/games/craps/sprites/board_table.jpg', 'tags' => ['table games', 'craps', 'in-house', 'live casino'], 'isFeatured' => true],
        ['provider' => 'internal', 'name' => 'Arabian Game', 'slug' => 'arabian', 'category' => 'slots', 'minBet' => 0.3, 'maxBet' => 30, 'themeColor' => '#7e22ce', 'icon' => 'fa-solid fa-scroll', 'imageUrl' => '/games/arabian/sprites/200x200.jpg', 'tags' => ['slots', 'arabian', 'in-house', 'server settled'], 'isFeatured' => true],
        ['provider' => 'internal', 'name' => 'Jurassic Run', 'slug' => 'jurassic-run', 'category' => 'slots', 'minBet' => 1, 'maxBet' => 5000, 'rtp' => 95.0, 'volatility' => 'medium', 'themeColor' => '#166534', 'icon' => 'fa-solid fa-dragon', 'imageUrl' => '/games/jurassic-run/assets/images/background_middle.webp', 'tags' => ['slots', 'jurassic', 'in-house', 'server settled', 'progressive jackpot'], 'isFeatured' => true, 'metadata' => ['paylines' => 10, 'reels' => 5, 'rows' => 3, 'jackpotType' => 'progressive', 'jackpotContributionPercent' => 5, 'freeSpinAwards' => [3 => 2, 4 => 3, 5 => 4], 'rngVersion' => 'jurassic-slot-v1', 'fairness' => ['outcomeSource' => 'server_rng', 'spinIndependence' => true], 'features' => ['wild', 'free_spins', 'progressive_jackpot']]],
        ['provider' => 'internal', 'name' => '3-Card Poker', 'slug' => '3card-poker', 'category' => 'table_games', 'minBet' => 1, 'maxBet' => 300, 'themeColor' => '#1a3a5c', 'icon' => 'fa-solid fa-cards', 'imageUrl' => '/games/3-card-poker/sprites/200x200.jpg', 'tags' => ['table games', 'poker', '3-card poker', 'in-house'], 'isFeatured' => true],
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
                if (strtolower((string) ($candidate['id'] ?? '')) === $id) {
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
                . '&gameId=' . rawurlencode((string) ($game['id'] ?? ''))
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

    public function __construct(SqlRepository $db, string $jwtSecret)
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
        if ($method === 'GET' && preg_match('#^/api/casino/games/([a-z0-9-]+)/state$#', $path, $m) === 1) {
            $this->getCasinoGameState(strtolower($m[1]));
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

    private function getCasinoGameState(string $slug): void
    {
        try {
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
            $this->requireActiveCasinoGame($slug);

            if ($slug === self::JURASSIC_RUN_GAME_SLUG) {
                $state = $this->getUserJurassicRunState($actor);
                $progressiveState = $this->getJurassicRunProgressiveState();
                Response::json([
                    'game' => $slug,
                    'state' => [
                        'freeSpinsRemaining' => (int) ($state['freeSpinsRemaining'] ?? 0),
                        'lockedBetId' => $state['lockedBetId'] ?? null,
                        'activePaylines' => (int) ($state['activePaylines'] ?? self::JURASSIC_RUN_FIXED_PAYLINES),
                        'lastBetId' => $state['lastBetId'] ?? null,
                        'lastBet' => round($this->num($state['lastBet'] ?? 0)),
                        'lastLineBet' => round($this->num($state['lastLineBet'] ?? 0)),
                        'bonusRoundActive' => !empty($state['bonusRoundActive']),
                        'activeMultiplier' => round($this->num($state['activeMultiplier'] ?? 1)),
                        'totalRounds' => (int) ($state['totalRounds'] ?? 0),
                        'paidRounds' => (int) ($state['paidRounds'] ?? 0),
                        'freeSpinRounds' => (int) ($state['freeSpinRounds'] ?? 0),
                        'totalWagered' => round($this->num($state['totalWagered'] ?? 0)),
                        'totalPaidOut' => round($this->num($state['totalPaidOut'] ?? 0)),
                        'totalFreeSpinsAwarded' => (int) ($state['totalFreeSpinsAwarded'] ?? 0),
                        'jackpotsWon' => (int) ($state['jackpotsWon'] ?? 0),
                        'lastTotalWager' => round($this->num($state['lastTotalWager'] ?? 0)),
                        'lastTotalReturn' => round($this->num($state['lastTotalReturn'] ?? 0)),
                        'lastNetResult' => round($this->num($state['lastNetResult'] ?? 0)),
                        'lastResultType' => (string) ($state['lastResultType'] ?? ''),
                        'jackpotPool' => round($this->num($progressiveState['jackpotPool'] ?? self::JURASSIC_RUN_DEFAULT_JACKPOT)),
                        'progressive' => [
                            'jackpotContributionPercent' => self::JURASSIC_RUN_JACKPOT_FEE_PERCENT,
                            'totalRounds' => (int) ($progressiveState['totalRounds'] ?? 0),
                            'paidRounds' => (int) ($progressiveState['paidRounds'] ?? 0),
                            'freeSpinRounds' => (int) ($progressiveState['freeSpinRounds'] ?? 0),
                            'totalWagered' => round($this->num($progressiveState['totalWagered'] ?? 0)),
                            'totalPaidOut' => round($this->num($progressiveState['totalPaidOut'] ?? 0)),
                            'totalFreeSpinsAwarded' => (int) ($progressiveState['totalFreeSpinsAwarded'] ?? 0),
                            'totalJackpotsHit' => (int) ($progressiveState['totalJackpotsHit'] ?? 0),
                        ],
                        'gameConfig' => self::jurassicRunPublicMetadata(),
                    ],
                ]);
                return;
            }

            Response::json(['message' => 'Unsupported game state request: ' . $slug], 400);
        } catch (InvalidArgumentException $e) {
            Response::json(['message' => $e->getMessage()], 400);
        } catch (Throwable $e) {
            Response::json(['message' => 'Server error fetching casino game state'], 500);
        }
    }

    private function launchCasinoGame(string $id): void
    {
        try {
            $actor = $this->protect();
            if ($actor === null) {
                return;
            }

            $game = $this->db->findOne('casinogames', ['id' => SqlRepository::id($id)]);
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
                . '&gameId=' . rawurlencode((string) ($game['id'] ?? ''))
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
                'createdAt' => SqlRepository::nowUtc(),
                'updatedAt' => SqlRepository::nowUtc(),
            ];

            $id = $this->db->insertOne('casinogames', $doc);
            $created = $this->db->findOne('casinogames', ['id' => SqlRepository::id($id)]);
            Response::json($this->toPublicGame($created ?? array_merge($doc, ['id' => $id])), 201);
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

            $existing = $this->db->findOne('casinogames', ['id' => SqlRepository::id($id)]);
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
            $updates['updatedAt'] = SqlRepository::nowUtc();

            if (isset($updates['slug']) && $updates['slug'] !== ($existing['slug'] ?? null)) {
                $slugConflict = $this->db->findOne('casinogames', ['slug' => $updates['slug']]);
                if ($slugConflict !== null && (string) $slugConflict['id'] !== (string) $existing['id']) {
                    Response::json(['message' => 'Game slug already exists'], 409);
                    return;
                }
            }

            $this->db->updateOne('casinogames', ['id' => SqlRepository::id($id)], $updates);
            $updated = $this->db->findOne('casinogames', ['id' => SqlRepository::id($id)]);
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
                    'updatedAt' => SqlRepository::nowUtc(),
                ];

                if ($existing === null) {
                    $mapped['createdAt'] = SqlRepository::nowUtc();
                    $this->db->insertOne('casinogames', $mapped);
                    $inserted++;
                } else {
                    $this->db->updateOne('casinogames', ['id' => SqlRepository::id((string) $existing['id'])], $mapped);
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
        $now = SqlRepository::nowUtc();
        // One-time patch: fix stale imageUrl for 3card-poker if it has the old /game/ subpath
        $stale3cp = $this->db->findOne('casinogames', [
            'slug' => self::THREE_CARD_POKER_GAME_SLUG,
            'imageUrl' => '/games/3-card-poker/game/sprites/200x200.jpg',
        ]);
        if ($stale3cp !== null) {
            $this->db->updateOne(
                'casinogames',
                ['id' => SqlRepository::id((string) $stale3cp['id'])],
                ['imageUrl' => '/games/3-card-poker/sprites/200x200.jpg', 'updatedAt' => $now]
            );
        }

        $jurassicGame = $this->db->findOne('casinogames', ['slug' => self::JURASSIC_RUN_GAME_SLUG]);
        if ($jurassicGame !== null) {
            $existingMetadata = is_array($jurassicGame['metadata'] ?? null) ? $jurassicGame['metadata'] : [];
            $nextMetadata = array_replace_recursive($existingMetadata, self::jurassicRunPublicMetadata());
            $jurassicUpdates = [
                'updatedAt' => $now,
            ];
            if (!is_numeric($jurassicGame['rtp'] ?? null)) {
                $jurassicUpdates['rtp'] = self::JURASSIC_RUN_DISCLOSED_RTP;
            }
            if (!is_string($jurassicGame['volatility'] ?? null) || trim((string) ($jurassicGame['volatility'] ?? '')) === '') {
                $jurassicUpdates['volatility'] = self::JURASSIC_RUN_VOLATILITY;
            }
            if ($nextMetadata !== $existingMetadata) {
                $jurassicUpdates['metadata'] = $nextMetadata;
            }
            if (count($jurassicUpdates) > 1) {
                $this->db->updateOne(
                    'casinogames',
                    ['id' => SqlRepository::id((string) $jurassicGame['id'])],
                    $jurassicUpdates
                );
            }
        }

        foreach (self::DEFAULT_CASINO_GAMES as $idx => $game) {
            $slug = (string) ($game['slug'] ?? ('game-' . ($idx + 1)));
            $existing = $this->db->findOne('casinogames', ['slug' => $slug]);
            if ($existing !== null) {
                // Sync minBet/maxBet from defaults if they changed
                $defaultMin = $this->safeNumber($game['minBet'] ?? null, 1);
                $defaultMax = $this->safeNumber($game['maxBet'] ?? null, 100);
                $existingMin = $this->safeNumber($existing['minBet'] ?? null, 1);
                $existingMax = $this->safeNumber($existing['maxBet'] ?? null, 100);
                if ($defaultMin !== $existingMin || $defaultMax !== $existingMax) {
                    $this->db->updateOne('casinogames', ['slug' => $slug], [
                        'minBet' => $defaultMin,
                        'maxBet' => $defaultMax,
                        'updatedAt' => $now,
                    ]);
                }
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
                'metadata' => is_array($game['metadata'] ?? null) ? $game['metadata'] : new stdClass(),
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
                ['id' => SqlRepository::id((string) $existingRemoved['id'])],
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
            'id' => $game['id'] ?? null,
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
            'metadata' => is_array($game['metadata'] ?? null) ? $game['metadata'] : new stdClass(),
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
            if ($game === self::CRAPS_GAME_SLUG) {
                $this->placeCrapsBet($actor, $body, $requestId, $startedAt);
                return;
            }
            if ($game === self::ARABIAN_GAME_SLUG) {
                $this->placeArabianBet($actor, $body, $requestId, $startedAt);
                return;
            }
            if ($game === self::JURASSIC_RUN_GAME_SLUG) {
                $this->placeJurassicRunBet($actor, $body, $requestId, $startedAt);
                return;
            }
            if ($game === self::THREE_CARD_POKER_GAME_SLUG) {
                $this->place3CardPokerBet($actor, $body, $requestId, $startedAt);
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
            $totalWager = round($playerBet + $bankerBet + $tieBet);

            if ($totalWager <= 0) {
                Response::json(['message' => 'No bets placed'], 400);
                return;
            }

            [$gameMinBet, $gameMaxBet] = $this->resolveGameBetLimits(self::BACCARAT_GAME_SLUG, 1.0, 100.0);
            if ($totalWager < $gameMinBet) {
                Response::json(['message' => 'Minimum baccarat wager is $' . round($gameMinBet)], 400);
                return;
            }
            if ($totalWager > $gameMaxBet) {
                Response::json(['message' => 'Maximum baccarat wager is $' . round($gameMaxBet)], 400);
                return;
            }

            $userId = (string) ($actor['id'] ?? '');
            $this->db->beginTransaction();
            try {
                $lockedUser = $this->db->findOneForUpdate('users', ['id' => SqlRepository::id($userId)]);
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
                    $roundId = (string) ($existingRound['roundId'] ?? $existingRound['id'] ?? '');
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
                    Response::json(['message' => 'Minimum bet for your account is $' . round($userMinBet)], 400);
                    return;
                }
                if ($userMaxBet !== null && $userMaxBet > 0 && $totalWager > $userMaxBet) {
                    $this->db->rollback();
                    Response::json(['message' => 'Maximum bet for your account is $' . round($userMaxBet)], 400);
                    return;
                }
                $this->assertCasinoLossLimits($lockedUser, $totalWager);

                $balanceBefore = round($this->num($lockedUser['balance'] ?? 0));
                $pendingBalance = round($this->num($lockedUser['pendingBalance'] ?? 0));
                $availableBalance = round(max(0, $balanceBefore - $pendingBalance));
                if ($totalWager > $availableBalance) {
                    $this->db->rollback();
                    Response::json(['message' => 'Insufficient balance. Available: $' . round($availableBalance)], 400);
                    return;
                }

                $roundId = $this->newRoundId();
                $roundData = $this->dealBaccaratRound();
                $result = (string) ($roundData['result'] ?? 'Tie');
                $payout = $this->calculateBaccaratPayout($playerBet, $bankerBet, $tieBet, $result);

                $totalReturn = $payout['totalReturn'];
                $profit = $payout['profit'];
                $netResult = $payout['netResult'];

                $balanceAfterDebit = round($balanceBefore - $totalWager);
                $balanceAfter = round($balanceAfterDebit + $totalReturn);
                $availableBalanceAfter = round(max(0, $balanceAfter - $pendingBalance));

                $now = SqlRepository::nowUtc();
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

                $this->db->updateOne('users', ['id' => SqlRepository::id($userId)], [
                    'balance' => $balanceAfter,
                    'updatedAt' => $now,
                ]);

                $deckCodes = is_array($roundData['deckCodes'] ?? null) ? $roundData['deckCodes'] : [];
                $deckHash = hash('sha256', implode(',', $deckCodes));
                $serverDecisionAt = SqlRepository::nowUtc();
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
                    'id' => $roundId,
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
                    'availableBalanceBefore' => $availableBalance,
                    'availableBalanceAfter' => $availableBalanceAfter,
                    'pendingBalanceSnapshot' => $pendingBalance,
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
                    'id' => $roundId,
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
                    array_merge($debitEntry, ['id' => $debitEntryId]),
                    array_merge($creditEntry, ['id' => $creditEntryId]),
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
        $userId = (string) ($actor['id'] ?? '');

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
                Response::json(['message' => 'Minimum roulette wager is $' . round($gameMinBet)], 400);
                return;
            }
            if ($totalWager > $gameMaxBet) {
                Response::json(['message' => 'Maximum roulette wager is $' . round($gameMaxBet)], 400);
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
                    $roundId = (string) ($existingRound['roundId'] ?? $existingRound['id'] ?? '');
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
                    Response::json(['message' => 'Insufficient balance. Available: $' . round($balanceSnapshot['availableBalance'])], 400);
                    return;
                }

                $roundId = $this->newRoundId();
                $outcomeSource = 'server_rng';
                $outcome = $this->pickRouletteOutcome($parsedBets['entries']);

                $totalReturn = $outcome['totalReturn'];
                $profit = round(max(0, $totalReturn - $totalWager));
                $netResult = round($totalReturn - $totalWager);
                $balanceAfterDebit = round($balanceSnapshot['balanceBefore'] - $totalWager);
                $balanceAfter = round($balanceAfterDebit + $totalReturn);
                $availableBalanceAfter = round(max(0, $balanceAfter - $balanceSnapshot['pendingBalance']));

                $now = SqlRepository::nowUtc();
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

                $this->db->updateOne('users', ['id' => SqlRepository::id($userId)], [
                    'balance' => $balanceAfter,
                    'updatedAt' => $now,
                ]);

                $serverDecisionAt = SqlRepository::nowUtc();
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
                    'id' => $roundId,
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
                    'id' => $roundId,
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
                    array_merge($debitEntry, ['id' => $debitEntryId]),
                    array_merge($creditEntry, ['id' => $creditEntryId]),
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

    // ════════════════════════════════════════════════════════
    //  IN-HOUSE 3-CARD POKER BETTING
    // ════════════════════════════════════════════════════════

    private function place3CardPokerBet(array $actor, array $body, string $requestId, float $startedAt): void
    {
        $userId = (string) ($actor['id'] ?? '');

        try {
            $this->requireActiveCasinoGame(self::THREE_CARD_POKER_GAME_SLUG);

            $bets = is_array($body['bets'] ?? null) ? $body['bets'] : [];
            $payload = is_array($body['payload'] ?? null) ? $body['payload'] : [];
            if ($payload === []) {
                foreach ([
                    'folded',
                    'netResult',
                    'newCredit',
                    'prevCredit',
                    'handResult',
                    'playerAction',
                    'dealerQualified',
                    'playerCards',
                    'dealerCards',
                    'playerHand',
                    'dealerHand',
                    'totalWager',
                    'totalReturn',
                    'payoutBreakdown',
                    'roundData',
                ] as $fallbackField) {
                    if (array_key_exists($fallbackField, $body)) {
                        $payload[$fallbackField] = $body[$fallbackField];
                    }
                }
            }
            $folded = (int) ($bets['folded'] ?? ($payload['folded'] ?? 0)) === 1;
            $anteBet = $this->parseMoneyValue($bets['Ante'] ?? 0, 'bets.Ante');
            $pairPlusBet = $this->parseMoneyValue($bets['PairPlus'] ?? 0, 'bets.PairPlus');
            $playBet = $this->parseMoneyValue($bets['Play'] ?? ($folded ? 0 : $anteBet), 'bets.Play');

            if ($anteBet <= 0) {
                Response::json(['message' => 'Ante bet is required for 3-Card Poker'], 400);
                return;
            }

            if ($folded && $playBet > 0) {
                Response::json(['message' => 'Play bet cannot be set when the player folds'], 400);
                return;
            }

            if (!$folded && round(abs($playBet - $anteBet)) > 0) {
                Response::json(['message' => 'Play bet must match the Ante amount exactly'], 400);
                return;
            }

            [$gameMinBet, $gameMaxBet] = $this->resolveGameBetLimits(self::THREE_CARD_POKER_GAME_SLUG, 1.0, 300.0);
            if ($anteBet < $gameMinBet) {
                Response::json(['message' => 'Minimum ante bet is $' . round($gameMinBet)], 400);
                return;
            }
            if ($anteBet > $gameMaxBet) {
                Response::json(['message' => 'Maximum ante bet is $' . round($gameMaxBet)], 400);
                return;
            }
            if ($pairPlusBet > $gameMaxBet) {
                Response::json(['message' => 'Maximum Pair Plus bet is $' . round($gameMaxBet)], 400);
                return;
            }

            $playerCards = $this->normalize3CardPokerCards($payload['playerCards'] ?? [], 'payload.playerCards');
            $dealerCards = $this->normalize3CardPokerCards($payload['dealerCards'] ?? [], 'payload.dealerCards');
            $allCodes = array_values(array_merge(
                array_map(static fn(array $card): string => (string) ($card['code'] ?? ''), $playerCards),
                array_map(static fn(array $card): string => (string) ($card['code'] ?? ''), $dealerCards)
            ));
            if (count(array_unique($allCodes)) !== 6) {
                Response::json(['message' => 'Player and dealer cards must be unique'], 400);
                return;
            }

            $settlement = $this->resolve3CardPokerSettlement(
                $anteBet,
                $pairPlusBet,
                $playBet,
                $folded,
                $playerCards,
                $dealerCards
            );

            $totalWager = (float) $settlement['totalWager'];
            $totalReturn = (float) $settlement['totalReturn'];
            $netResult = (float) $settlement['netResult'];
            $playerOutcome = (string) $settlement['playerOutcome'];
            $resultLabel = (string) $settlement['mainResultLabel'];
            $resultType = (string) $settlement['mainResultKey'];
            $playerHand = (string) $settlement['playerHand'];
            $dealerHand = (string) $settlement['dealerHand'];
            $dealerQualifies = (bool) $settlement['dealerQualifies'];
            $payoutBreakdown = is_array($settlement['payoutBreakdown'] ?? null) ? $settlement['payoutBreakdown'] : [];

            $this->db->beginTransaction();
            try {
                $lockedUser = $this->loadLockedCasinoUser($userId);

                $existingRound = $this->db->findOne('casino_bets', [
                    'userId' => $userId,
                    'requestId' => $requestId,
                    'game' => self::THREE_CARD_POKER_GAME_SLUG,
                ]);
                if ($existingRound !== null) {
                    $roundId = (string) ($existingRound['roundId'] ?? $existingRound['id'] ?? '');
                    $ledgerEntries = $this->findRoundLedgerEntries($roundId);
                    $this->writeCasinoAuditLog('3card_poker_round_idempotent', [
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
                    Response::json(['message' => 'Insufficient balance. Available: $' . round($balanceSnapshot['availableBalance'])], 400);
                    return;
                }

                $roundId = $this->deterministicRoundId(self::THREE_CARD_POKER_GAME_SLUG, $userId, $requestId);
                $now = SqlRepository::nowUtc();
                $ipAddress = IpUtils::clientIp();
                $userAgent = Http::header('user-agent') !== '' ? Http::header('user-agent') : null;

                $balanceAfterDebit = round($balanceSnapshot['balanceBefore'] - $totalWager);
                $balanceAfter = round($balanceAfterDebit + $totalReturn);
                $availableBalanceAfter = round(max(0, $balanceAfter - $balanceSnapshot['pendingBalance']));

                $debitEntry = $this->buildCasinoTransactionEntry(
                    $userId,
                    $totalWager,
                    $roundId,
                    self::THREE_CARD_POKER_SOURCE_TYPE,
                    'DEBIT',
                    'casino_bet_debit',
                    $balanceSnapshot['balanceBefore'],
                    $balanceAfterDebit,
                    'CASINO_3CARD_POKER_WAGER',
                    '3-Card Poker wager charged',
                    $now,
                    $ipAddress,
                    $userAgent
                );
                $debitEntryId = $this->db->insertOne('transactions', $debitEntry);

                $creditEntry = $this->buildCasinoTransactionEntry(
                    $userId,
                    $totalReturn,
                    $roundId,
                    self::THREE_CARD_POKER_SOURCE_TYPE,
                    'CREDIT',
                    'casino_bet_credit',
                    $balanceAfterDebit,
                    $balanceAfter,
                    'CASINO_3CARD_POKER_PAYOUT',
                    '3-Card Poker payout/refund credited',
                    $now,
                    $ipAddress,
                    $userAgent
                );
                $creditEntryId = $this->db->insertOne('transactions', $creditEntry);

                $this->db->updateOne('users', ['id' => SqlRepository::id($userId)], [
                    'balance' => $balanceAfter,
                    'updatedAt' => $now,
                ]);

                $serverDecisionAt = SqlRepository::nowUtc();
                $latencyMs = max(0, (int) round((microtime(true) - $startedAt) * 1000));
                $clientNetResult = $this->safeNumber($payload['netResult'] ?? null, null);
                $clientTotalReturn = $this->safeNumber($payload['totalReturn'] ?? null, null);
                $clientNewCredit = $this->safeNumber($payload['newCredit'] ?? null, null);
                $clientPrevCredit = $this->safeNumber($payload['prevCredit'] ?? null, null);
                $clientReportedResult = trim((string) ($payload['handResult'] ?? ''));
                $clientReportedBreakdown = is_array($payload['payoutBreakdown'] ?? null) ? $payload['payoutBreakdown'] : [];
                $clientRoundData = is_array($payload['roundData'] ?? null) ? $payload['roundData'] : [];

                $roundData = [
                    'playerAction' => $folded ? 'fold' : 'play',
                    'mainResultKey' => $resultType,
                    'mainResultLabel' => $resultLabel,
                    'playerCards' => $settlement['playerCards'],
                    'dealerCards' => $settlement['dealerCards'],
                    'playerHand' => $playerHand,
                    'dealerHand' => $dealerHand,
                    'dealerQualifies' => $dealerQualifies,
                    'payoutBreakdown' => $payoutBreakdown,
                    'totalWager' => $totalWager,
                    'totalReturn' => $totalReturn,
                    'netResult' => $netResult,
                    'balanceBefore' => $balanceSnapshot['balanceBefore'],
                    'balanceAfterWagers' => $balanceAfterDebit,
                    'finalBalance' => $balanceAfter,
                    'resolvedAt' => $clientRoundData['resolvedAt'] ?? null,
                    'clientReported' => [
                        'handResult' => $clientReportedResult !== '' ? $clientReportedResult : null,
                        'netResult' => $clientNetResult,
                        'totalReturn' => $clientTotalReturn,
                        'prevCredit' => $clientPrevCredit,
                        'newCredit' => $clientNewCredit,
                        'payoutBreakdown' => $clientReportedBreakdown,
                    ],
                ];

                $integrityHash = $this->buildIntegrityHash([
                    'roundId' => $roundId,
                    'requestId' => $requestId,
                    'userId' => $userId,
                    'game' => self::THREE_CARD_POKER_GAME_SLUG,
                    'bets' => [
                        'Ante' => $anteBet,
                        'Play' => $playBet,
                        'PairPlus' => $pairPlusBet,
                        'folded' => $folded ? 1 : 0,
                    ],
                    'playerCards' => $settlement['playerCards'],
                    'dealerCards' => $settlement['dealerCards'],
                    'playerHand' => $playerHand,
                    'dealerHand' => $dealerHand,
                    'dealerQualifies' => $dealerQualifies,
                    'result' => $resultLabel,
                    'resultType' => $resultType,
                    'payoutBreakdown' => $payoutBreakdown,
                    'totalWager' => $totalWager,
                    'totalReturn' => $totalReturn,
                    'netResult' => $netResult,
                    'balanceBefore' => $balanceSnapshot['balanceBefore'],
                    'balanceAfter' => $balanceAfter,
                    'serverDecisionAt' => $serverDecisionAt,
                ]);

                $betRecord = [
                    'id' => $roundId,
                    'roundId' => $roundId,
                    'requestId' => $requestId,
                    'userId' => $userId,
                    'username' => (string) ($lockedUser['username'] ?? $actor['username'] ?? ''),
                    'game' => self::THREE_CARD_POKER_GAME_SLUG,
                    'bets' => [
                        'Ante' => $anteBet,
                        'Play' => $playBet,
                        'PairPlus' => $pairPlusBet,
                        'folded' => $folded ? 1 : 0,
                    ],
                    'playerAction' => $folded ? 'Fold' : 'Play',
                    'playerCards' => $settlement['playerCards'],
                    'dealerCards' => $settlement['dealerCards'],
                    'playerHand' => $playerHand,
                    'dealerHand' => $dealerHand,
                    'dealerQualifies' => $dealerQualifies,
                    'result' => $resultLabel,
                    'resultType' => $resultType,
                    'totalWager' => $totalWager,
                    'totalReturn' => $totalReturn,
                    'profit' => $netResult,
                    'netResult' => $netResult,
                    'playerOutcome' => $playerOutcome,
                    'balanceBefore' => $balanceSnapshot['balanceBefore'],
                    'balanceAfter' => $balanceAfter,
                    'availableBalanceBefore' => $balanceSnapshot['availableBalance'],
                    'availableBalanceAfter' => $availableBalanceAfter,
                    'pendingBalanceSnapshot' => $balanceSnapshot['pendingBalance'],
                    'ledgerEntries' => ['debit' => $debitEntryId, 'credit' => $creditEntryId],
                    'rngVersion' => self::THREE_CARD_POKER_RNG_VERSION,
                    'outcomeSource' => 'client_actions_server_rules',
                    'betDetails' => ['payoutBreakdown' => $payoutBreakdown],
                    'roundData' => $roundData,
                    'integrityHash' => $integrityHash,
                    'serverDecisionAt' => $serverDecisionAt,
                    'latencyMs' => $latencyMs,
                    'roundStatus' => 'settled',
                    'createdAt' => $now,
                    'updatedAt' => $now,
                ];
                $this->db->insertOne('casino_bets', $betRecord);

                $this->db->insertOne('casino_round_audit', [
                    'id' => $roundId,
                    'roundId' => $roundId,
                    'requestId' => $requestId,
                    'userId' => $userId,
                    'game' => self::THREE_CARD_POKER_GAME_SLUG,
                    'rngVersion' => self::THREE_CARD_POKER_RNG_VERSION,
                    'outcomeSource' => 'client_actions_server_rules',
                    'bets' => $betRecord['bets'],
                    'result' => $resultLabel,
                    'resultType' => $resultType,
                    'playerCards' => $settlement['playerCards'],
                    'dealerCards' => $settlement['dealerCards'],
                    'playerHand' => $playerHand,
                    'dealerHand' => $dealerHand,
                    'dealerQualifies' => $dealerQualifies,
                    'betDetails' => $betRecord['betDetails'],
                    'roundData' => $roundData,
                    'integrityHash' => $integrityHash,
                    'createdAt' => $now,
                    'updatedAt' => $now,
                ]);

                $this->db->commit();

                $ledgerEntries = $this->findRoundLedgerEntries($roundId);
                $this->writeCasinoAuditLog('3card_poker_round_settled', [
                    'requestId' => $requestId,
                    'roundId' => $roundId,
                    'userId' => $userId,
                    'username' => (string) ($lockedUser['username'] ?? ''),
                    'anteBet' => $anteBet,
                    'playBet' => $playBet,
                    'pairPlusBet' => $pairPlusBet,
                    'folded' => $folded,
                    'dealerQualifies' => $dealerQualifies,
                    'playerHand' => $playerHand,
                    'dealerHand' => $dealerHand,
                    'resultType' => $resultType,
                    'netResult' => $netResult,
                    'totalWager' => $totalWager,
                    'totalReturn' => $totalReturn,
                    'playerOutcome' => $playerOutcome,
                    'balanceBefore' => $balanceSnapshot['balanceBefore'],
                    'balanceAfter' => $balanceAfter,
                ]);

                Response::json($this->formatCasinoBetResponse($betRecord, $ledgerEntries, false));
            } catch (Throwable $inner) {
                $this->db->rollback();
                throw $inner;
            }
        } catch (InvalidArgumentException $e) {
            $this->writeCasinoAuditLog('3card_poker_validation_error', [
                'requestId' => $requestId,
                'userId' => $userId,
                'error' => $e->getMessage(),
            ]);
            Response::json(['message' => $e->getMessage()], 400);
        } catch (Throwable $e) {
            $this->writeCasinoAuditLog('3card_poker_server_error', [
                'requestId' => $requestId,
                'userId' => $userId,
                'error' => $e->getMessage(),
            ]);
            Response::json(['message' => 'Server error placing 3-Card Poker bet', 'error' => $e->getMessage()], 500);
        }
    }

    private function normalize3CardPokerCards(array $cards, string $fieldName): array
    {
        if (count($cards) !== 3) {
            throw new InvalidArgumentException($fieldName . ' must contain exactly 3 cards');
        }

        $normalized = [];
        foreach (array_values($cards) as $index => $card) {
            $code = '';
            if (is_string($card)) {
                $code = $card;
            } elseif (is_array($card)) {
                $code = (string) ($card['code'] ?? '');
            }

            $code = strtoupper(trim($code));
            if ($code === '') {
                throw new InvalidArgumentException($fieldName . '[' . $index . '] is invalid');
            }

            $normalized[] = $this->cardCodeToData($code);
        }

        return $normalized;
    }

    private function resolve3CardPokerSettlement(
        float $anteBet,
        float $pairPlusBet,
        float $playBet,
        bool $folded,
        array $playerCards,
        array $dealerCards
    ): array {
        $playerEval = $this->evaluate3CardPokerHand($playerCards);
        $dealerEval = $this->evaluate3CardPokerHand($dealerCards);
        $dealerQualifies = $this->dealerQualifies3CardPoker($dealerEval);
        $pairPlusMultiplier = $this->threeCardPokerPairPlusMultiplier($playerEval['key']);
        $anteBonusMultiplier = $folded ? 0.0 : $this->threeCardPokerAnteBonusMultiplier($playerEval['key']);
        $pairPlusReturn = ($pairPlusBet > 0 && $pairPlusMultiplier > 0)
            ? round(($pairPlusBet * $pairPlusMultiplier) + $pairPlusBet)
            : 0.0;
        $anteBonusReturn = $anteBonusMultiplier > 0
            ? round($anteBet * $anteBonusMultiplier)
            : 0.0;

        $mainResultKey = 'fold';
        $mainResultLabel = 'Fold';
        $anteReturn = 0.0;
        $playReturn = 0.0;

        if (!$folded) {
            if (!$dealerQualifies) {
                $mainResultKey = 'dealer_not_qualified';
                $mainResultLabel = 'Dealer Not Qualified';
                $anteReturn = round($anteBet * 2);
                $playReturn = round($playBet);
            } else {
                $comparison = $this->compare3CardPokerHands($playerEval, $dealerEval);
                if ($comparison === 'player') {
                    $mainResultKey = 'player';
                    $mainResultLabel = 'Player';
                    $anteReturn = round($anteBet * 2);
                    $playReturn = round($playBet * 2);
                } elseif ($comparison === 'dealer') {
                    $mainResultKey = 'dealer';
                    $mainResultLabel = 'Dealer';
                } else {
                    $mainResultKey = 'tie';
                    $mainResultLabel = 'Tie';
                    $anteReturn = round($anteBet);
                    $playReturn = round($playBet);
                }
            }
        } else {
            $anteBonusReturn = 0.0;
        }

        $totalWager = round($anteBet + $pairPlusBet + $playBet);
        $totalReturn = round($anteReturn + $playReturn + $pairPlusReturn + $anteBonusReturn);
        $netResult = round($totalReturn - $totalWager);

        return [
            'playerCards' => array_values(array_map(static fn(array $card): string => (string) ($card['code'] ?? ''), $playerCards)),
            'dealerCards' => array_values(array_map(static fn(array $card): string => (string) ($card['code'] ?? ''), $dealerCards)),
            'playerHand' => (string) $playerEval['name'],
            'dealerHand' => (string) $dealerEval['name'],
            'dealerQualifies' => $dealerQualifies,
            'mainResultKey' => $mainResultKey,
            'mainResultLabel' => $mainResultLabel,
            'payoutBreakdown' => [
                'ante' => [
                    'bet' => round($anteBet),
                    'action' => $folded ? 'lose' : (!$dealerQualifies || $mainResultKey === 'player' ? 'win' : ($mainResultKey === 'tie' ? 'push' : 'lose')),
                    'returnAmount' => $anteReturn,
                    'payout' => $anteReturn > $anteBet ? round($anteReturn - $anteBet) : 0.0,
                ],
                'play' => [
                    'bet' => round($playBet),
                    'action' => $folded ? 'not_placed' : (!$dealerQualifies ? 'push' : ($mainResultKey === 'player' ? 'win' : ($mainResultKey === 'tie' ? 'push' : 'lose'))),
                    'returnAmount' => $playReturn,
                    'payout' => $playBet > 0 && $playReturn > $playBet ? round($playReturn - $playBet) : 0.0,
                ],
                'pairPlus' => [
                    'bet' => round($pairPlusBet),
                    'hand' => (string) $playerEval['name'],
                    'multiplier' => $pairPlusMultiplier,
                    'action' => $pairPlusBet <= 0 ? 'not_placed' : ($pairPlusReturn > 0 ? 'win' : 'lose'),
                    'returnAmount' => $pairPlusReturn,
                    'payout' => $pairPlusReturn > 0 ? round($pairPlusReturn - $pairPlusBet) : 0.0,
                ],
                'anteBonus' => [
                    'betBase' => round($anteBet),
                    'hand' => (string) $playerEval['name'],
                    'multiplier' => $anteBonusMultiplier,
                    'action' => $anteBonusReturn > 0 ? 'win' : ($folded ? 'forfeit' : 'lose'),
                    'returnAmount' => $anteBonusReturn,
                    'payout' => $anteBonusReturn,
                ],
            ],
            'totalWager' => $totalWager,
            'totalReturn' => $totalReturn,
            'netResult' => $netResult,
            'playerOutcome' => $netResult > 0 ? 'Win' : ($netResult < 0 ? 'Lose' : 'Push'),
        ];
    }

    private function evaluate3CardPokerHand(array $cards): array
    {
        if (count($cards) !== 3) {
            throw new InvalidArgumentException('Three Card Poker hands must contain exactly 3 cards');
        }

        usort($cards, static fn(array $a, array $b): int => ((int) $a['rank']) <=> ((int) $b['rank']));
        $ranksAsc = array_values(array_map(static fn(array $card): int => (int) $card['rank'], $cards));
        $ranksDesc = array_reverse($ranksAsc);
        $suits = array_values(array_map(static fn(array $card): string => (string) $card['suit'], $cards));
        $rankCounts = array_count_values($ranksAsc);

        $isFlush = count(array_unique($suits)) === 1;
        $isStraight = false;
        $straightHigh = max($ranksAsc);
        if ($ranksAsc === [2, 3, 14]) {
            $isStraight = true;
            $straightHigh = 3;
        } elseif (
            $ranksAsc[0] + 1 === $ranksAsc[1]
            && $ranksAsc[1] + 1 === $ranksAsc[2]
        ) {
            $isStraight = true;
        }

        if ($isFlush && $isStraight) {
            return [
                'key' => 'straight_flush',
                'name' => 'Straight Flush',
                'rankValue' => 6,
                'tiebreak' => [$straightHigh],
            ];
        }

        if (count($rankCounts) === 1) {
            return [
                'key' => 'three_of_a_kind',
                'name' => 'Three of a Kind',
                'rankValue' => 5,
                'tiebreak' => [$ranksAsc[2]],
            ];
        }

        if ($isStraight) {
            return [
                'key' => 'straight',
                'name' => 'Straight',
                'rankValue' => 4,
                'tiebreak' => [$straightHigh],
            ];
        }

        if ($isFlush) {
            return [
                'key' => 'flush',
                'name' => 'Flush',
                'rankValue' => 3,
                'tiebreak' => $ranksDesc,
            ];
        }

        if (in_array(2, $rankCounts, true)) {
            $pairRank = 0;
            $kicker = 0;
            foreach ($rankCounts as $rank => $count) {
                if ($count === 2) {
                    $pairRank = (int) $rank;
                } else {
                    $kicker = (int) $rank;
                }
            }

            return [
                'key' => 'one_pair',
                'name' => 'One Pair',
                'rankValue' => 2,
                'tiebreak' => [$pairRank, $kicker],
            ];
        }

        return [
            'key' => 'high_card',
            'name' => 'High Card',
            'rankValue' => 1,
            'tiebreak' => $ranksDesc,
        ];
    }

    private function dealerQualifies3CardPoker(array $evaluation): bool
    {
        $rankValue = (int) ($evaluation['rankValue'] ?? 0);
        if ($rankValue > 1) {
            return true;
        }

        $tiebreak = is_array($evaluation['tiebreak'] ?? null) ? $evaluation['tiebreak'] : [];
        return ((int) ($tiebreak[0] ?? 0)) >= 12;
    }

    private function compare3CardPokerHands(array $playerEval, array $dealerEval): string
    {
        $playerRankValue = (int) ($playerEval['rankValue'] ?? 0);
        $dealerRankValue = (int) ($dealerEval['rankValue'] ?? 0);

        if ($playerRankValue > $dealerRankValue) {
            return 'player';
        }
        if ($dealerRankValue > $playerRankValue) {
            return 'dealer';
        }

        $playerTiebreak = is_array($playerEval['tiebreak'] ?? null) ? $playerEval['tiebreak'] : [];
        $dealerTiebreak = is_array($dealerEval['tiebreak'] ?? null) ? $dealerEval['tiebreak'] : [];
        $length = max(count($playerTiebreak), count($dealerTiebreak));

        for ($i = 0; $i < $length; $i++) {
            $playerValue = (int) ($playerTiebreak[$i] ?? 0);
            $dealerValue = (int) ($dealerTiebreak[$i] ?? 0);
            if ($playerValue > $dealerValue) {
                return 'player';
            }
            if ($dealerValue > $playerValue) {
                return 'dealer';
            }
        }

        return 'tie';
    }

    private function threeCardPokerPairPlusMultiplier(string $handKey): float
    {
        return match ($handKey) {
            'straight_flush' => 40.0,
            'three_of_a_kind' => 30.0,
            'straight' => 6.0,
            'flush' => 4.0,
            'one_pair' => 1.0,
            default => 0.0,
        };
    }

    private function threeCardPokerAnteBonusMultiplier(string $handKey): float
    {
        return match ($handKey) {
            'straight_flush' => 5.0,
            'three_of_a_kind' => 4.0,
            'straight' => 1.0,
            default => 0.0,
        };
    }

    private function placeBlackjackBet(array $actor, array $body, string $requestId, float $startedAt): void
    {
        $userId = (string) ($actor['id'] ?? '');

        try {
            $this->requireActiveCasinoGame(self::BLACKJACK_GAME_SLUG);

            $clientPayload = is_array($body['bets'] ?? null) ? $body['bets'] : [];
            $normalizedPayload = $this->normalizeBlackjackRoundPayload($clientPayload);
            $settlement = $this->evaluateBlackjackRoundSettlement($normalizedPayload, $userId, $requestId);

            $totalWager = $settlement['totalWager'];
            $totalReturn = $settlement['totalReturn'];
            $netResult = $settlement['netResult'];
            $profit = $settlement['profit'];
            $result = (string) $settlement['result'];
            $resultType = (string) $settlement['resultType'];
            $betBreakdown = is_array($settlement['betBreakdown'] ?? null) ? $settlement['betBreakdown'] : [];
            $roundMeta = is_array($settlement['roundMeta'] ?? null) ? $settlement['roundMeta'] : [];
            $betDetails = is_array($settlement['betDetails'] ?? null) ? $settlement['betDetails'] : [];
            $playerCards = is_array($settlement['playerCards'] ?? null) ? $settlement['playerCards'] : [];
            $dealerCards = is_array($settlement['dealerCards'] ?? null) ? $settlement['dealerCards'] : [];

            if ($totalWager <= 0) {
                Response::json(['message' => 'Blackjack wager must be greater than zero'], 400);
                return;
            }

            [$gameMinBet, $gameMaxBet] = $this->resolveGameBetLimits(self::BLACKJACK_GAME_SLUG, 1.0, 10000.0);
            if ($totalWager < $gameMinBet) {
                Response::json(['message' => 'Minimum blackjack wager is $' . round($gameMinBet)], 400);
                return;
            }
            if ($totalWager > $gameMaxBet) {
                Response::json(['message' => 'Maximum blackjack wager is $' . round($gameMaxBet)], 400);
                return;
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
                    $roundId = (string) ($existingRound['roundId'] ?? $existingRound['id'] ?? '');
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
                    Response::json(['message' => 'Insufficient balance. Available: $' . round($balanceSnapshot['availableBalance'])], 400);
                    return;
                }

                $roundId = $this->deterministicRoundId(self::BLACKJACK_GAME_SLUG, $userId, $requestId);
                $now = SqlRepository::nowUtc();
                $ipAddress = IpUtils::clientIp();
                $userAgent = Http::header('user-agent') !== '' ? Http::header('user-agent') : null;

                $balanceAfterDebit = round($balanceSnapshot['balanceBefore'] - $totalWager);
                $balanceAfter = round($balanceAfterDebit + $totalReturn);
                $availableBalanceAfter = round(max(0, $balanceAfter - $balanceSnapshot['pendingBalance']));

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

                $this->db->updateOne('users', ['id' => SqlRepository::id($userId)], [
                    'balance' => $balanceAfter,
                    'updatedAt' => $now,
                ]);

                $serverDecisionAt = SqlRepository::nowUtc();
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
                    'id' => $roundId,
                    'roundId' => $roundId,
                    'requestId' => $requestId,
                    'userId' => $userId,
                    'username' => (string) ($lockedUser['username'] ?? $actor['username'] ?? ''),
                    'game' => self::BLACKJACK_GAME_SLUG,
                    'bets' => [
                        'totalWager' => $totalWager,
                        'totalReturn' => $totalReturn,
                        'zones' => $betBreakdown,
                    ],
                    'playerCards' => $playerCards,
                    'dealerCards' => $dealerCards,
                    'result' => $result,
                    'resultType' => $resultType,
                    'totalWager' => $totalWager,
                    'totalReturn' => $totalReturn,
                    'profit' => $profit,
                    'netResult' => $netResult,
                    'balanceBefore' => $balanceSnapshot['balanceBefore'],
                    'balanceAfter' => $balanceAfter,
                    'availableBalanceBefore' => $balanceSnapshot['availableBalance'],
                    'availableBalanceAfter' => $availableBalanceAfter,
                    'pendingBalanceSnapshot' => $balanceSnapshot['pendingBalance'],
                    'ledgerEntries' => ['debit' => $debitEntryId, 'credit' => $creditEntryId],
                    'rngVersion' => self::BLACKJACK_RNG_VERSION,
                    'outcomeSource' => 'server_simulated_actions',
                    'blackjackRoundMeta' => $roundMeta,
                    'betDetails' => $betDetails,
                    'roundData' => $roundMeta,
                    'integrityHash' => $integrityHash,
                    'serverDecisionAt' => $serverDecisionAt,
                    'latencyMs' => $latencyMs,
                    'roundStatus' => 'settled',
                    'createdAt' => $now,
                    'updatedAt' => $now,
                ];
                $this->db->insertOne('casino_bets', $betRecord);

                $this->db->insertOne('casino_round_audit', [
                    'id' => $roundId,
                    'roundId' => $roundId,
                    'requestId' => $requestId,
                    'userId' => $userId,
                    'game' => self::BLACKJACK_GAME_SLUG,
                    'rngVersion' => self::BLACKJACK_RNG_VERSION,
                    'outcomeSource' => 'server_simulated_actions',
                    'bets' => $betRecord['bets'],
                    'result' => $result,
                    'resultType' => $resultType,
                    'playerCards' => $playerCards,
                    'dealerCards' => $dealerCards,
                    'blackjackRoundMeta' => $roundMeta,
                    'betDetails' => $betDetails,
                    'integrityHash' => $integrityHash,
                    'createdAt' => $now,
                    'updatedAt' => $now,
                ]);

                $this->db->commit();

                $ledgerEntries = [
                    array_merge($debitEntry, ['id' => $debitEntryId]),
                    array_merge($creditEntry, ['id' => $creditEntryId]),
                ];
                $this->writeCasinoAuditLog('blackjack_round_settled', [
                    'requestId' => $requestId,
                    'roundId' => $roundId,
                    'userId' => $userId,
                    'username' => (string) ($lockedUser['username'] ?? ''),
                    'wager' => $totalWager,
                    'totalReturn' => $totalReturn,
                    'netResult' => $netResult,
                    'balanceBefore' => $balanceSnapshot['balanceBefore'],
                    'balanceAfter' => $balanceAfter,
                    'outcomeSource' => 'server_simulated_actions',
                    'resultType' => $resultType,
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

    private function placeCrapsBet(array $actor, array $body, string $requestId, float $startedAt): void
    {
        $userId = (string) ($actor['id'] ?? '');

        try {
            $this->requireActiveCasinoGame(self::CRAPS_GAME_SLUG);

            $mode = strtolower(trim((string) ($body['mode'] ?? 'roll')));
            if ($mode === 'sync' || $mode === 'snapshot') {
                $this->syncCrapsState($actor, $body, $requestId, $mode);
                return;
            }
            if ($mode !== 'roll') {
                Response::json(['message' => 'Unsupported craps mode'], 400);
                return;
            }

            $currentBets = $this->normalizeCrapsBets($body['bets'] ?? null);
            $currentExposure = $this->sumCrapsBets($currentBets);
            if ($currentExposure <= 0) {
                Response::json(['message' => 'No craps bets placed'], 400);
                return;
            }

            [$gameMinBet, $gameMaxBet] = $this->resolveGameBetLimits(self::CRAPS_GAME_SLUG, 1.0, 10000.0);
            if ($currentExposure < $gameMinBet) {
                Response::json(['message' => 'Minimum craps wager is $' . round($gameMinBet)], 400);
                return;
            }
            if ($currentExposure > $gameMaxBet) {
                Response::json(['message' => 'Maximum craps wager is $' . round($gameMaxBet)], 400);
                return;
            }

            $this->db->beginTransaction();
            try {
                $lockedUser = $this->loadLockedCasinoUser($userId);

                $existingRound = $this->db->findOne('casino_bets', [
                    'userId' => $userId,
                    'requestId' => $requestId,
                    'game' => self::CRAPS_GAME_SLUG,
                ]);
                if ($existingRound !== null) {
                    $roundId = (string) ($existingRound['roundId'] ?? $existingRound['id'] ?? '');
                    $ledgerEntries = $this->findRoundLedgerEntries($roundId);
                    $this->writeCasinoAuditLog('craps_round_idempotent', [
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

                $stateSnapshot = $this->getUserCrapsState($lockedUser);
                $activeBetsBefore = $stateSnapshot['activeBets'];
                if ($stateSnapshot['phase'] === 'come_point') {
                    $this->assertCrapsComePointLockedBets($activeBetsBefore, $currentBets);
                }

                $addedStake = 0.0;
                $releasedStake = 0.0;
                $allBetKeys = array_unique(array_merge(array_keys($activeBetsBefore), array_keys($currentBets)));
                foreach ($allBetKeys as $betKey) {
                    $prev = $activeBetsBefore[$betKey] ?? 0.0;
                    $curr = $currentBets[$betKey] ?? 0.0;
                    if ($curr > $prev) {
                        $addedStake += ($curr - $prev);
                    } elseif ($prev > $curr) {
                        $releasedStake += ($prev - $curr);
                    }
                }
                $addedStake = round($addedStake);
                $releasedStake = round($releasedStake);

                if ($addedStake > 0) {
                    $this->assertUserWagerWithinLimits($lockedUser, $addedStake);
                    $this->assertCasinoLossLimits($lockedUser, $addedStake);
                }

                $balanceSnapshot = $this->getUserBalanceSnapshot($lockedUser);
                if ($addedStake > $balanceSnapshot['availableBalance']) {
                    $this->db->rollback();
                    Response::json(['message' => 'Insufficient balance. Available: $' . round($balanceSnapshot['availableBalance'])], 400);
                    return;
                }

                $phaseBefore = $stateSnapshot['phase'] === 'come_point' ? 'come_point' : 'come_out';
                $pointBefore = $phaseBefore === 'come_point' ? $stateSnapshot['pointNumber'] : null;

                $die1 = random_int(1, 6);
                $die2 = random_int(1, 6);
                $settlement = $this->settleCrapsRoll($currentBets, $phaseBefore, $pointBefore, $die1, $die2);

                $activeBetsAfter = $settlement['activeBetsAfter'];
                $phaseAfter = $settlement['stateAfter'];
                $pointAfter = $settlement['pointNumberAfter'];
                $resolvedBets = $settlement['resolvedBets'];
                $settledReturn = $settlement['totalReturn'];
                $dice = $settlement['dice'];

                $totalWager = $addedStake;
                $totalReturn = round($releasedStake + $settledReturn);
                $netResult = round($totalReturn - $totalWager);
                $profit = round(max(0, $netResult));

                $balanceAfterDebit = round($balanceSnapshot['balanceBefore'] - $totalWager);
                $balanceAfter = round($balanceAfterDebit + $totalReturn);
                $availableBalanceAfter = round(max(0, $balanceAfter - $balanceSnapshot['pendingBalance']));

                $roundId = $this->newRoundId();
                $now = SqlRepository::nowUtc();
                $ipAddress = IpUtils::clientIp();
                $userAgent = Http::header('user-agent') !== '' ? Http::header('user-agent') : null;

                $debitEntry = null;
                $debitEntryId = null;
                if ($totalWager > 0) {
                    $debitEntry = $this->buildCasinoTransactionEntry(
                        $userId,
                        $totalWager,
                        $roundId,
                        self::CRAPS_SOURCE_TYPE,
                        'DEBIT',
                        'casino_bet_debit',
                        $balanceSnapshot['balanceBefore'],
                        $balanceAfterDebit,
                        'CASINO_CRAPS_WAGER',
                        'Craps wager charged',
                        $now,
                        $ipAddress,
                        $userAgent
                    );
                    $debitEntryId = $this->db->insertOne('transactions', $debitEntry);
                }

                $creditEntry = null;
                $creditEntryId = null;
                if ($totalReturn > 0) {
                    $creditEntry = $this->buildCasinoTransactionEntry(
                        $userId,
                        $totalReturn,
                        $roundId,
                        self::CRAPS_SOURCE_TYPE,
                        'CREDIT',
                        'casino_bet_credit',
                        $balanceAfterDebit,
                        $balanceAfter,
                        'CASINO_CRAPS_PAYOUT',
                        'Craps payout/refund credited',
                        $now,
                        $ipAddress,
                        $userAgent
                    );
                    $creditEntryId = $this->db->insertOne('transactions', $creditEntry);
                }

                $nextUserState = [
                    'phase' => $phaseAfter,
                    'pointNumber' => $pointAfter,
                    'activeBets' => $activeBetsAfter,
                    'updatedAt' => $now,
                ];
                $this->db->updateOne('users', ['id' => SqlRepository::id($userId)], [
                    'balance' => $balanceAfter,
                    'casinoCrapsState' => $nextUserState,
                    'updatedAt' => $now,
                ]);

                $serverDecisionAt = SqlRepository::nowUtc();
                $latencyMs = max(0, (int) round((microtime(true) - $startedAt) * 1000));
                $roundData = [
                    'dice' => $dice,
                    'stateBefore' => $phaseBefore,
                    'stateAfter' => $phaseAfter,
                    'pointNumberBefore' => $pointBefore,
                    'pointNumberAfter' => $pointAfter,
                    'activeBetsBefore' => $activeBetsBefore,
                    'activeBetsAfter' => $activeBetsAfter,
                    'addedStake' => $totalWager,
                    'releasedStake' => $releasedStake,
                    'settledReturn' => $settledReturn,
                    'resolvedBets' => $resolvedBets,
                ];
                $integrityHash = $this->buildIntegrityHash([
                    'roundId' => $roundId,
                    'requestId' => $requestId,
                    'userId' => $userId,
                    'game' => self::CRAPS_GAME_SLUG,
                    'bets' => $currentBets,
                    'dice' => $dice,
                    'stateBefore' => $phaseBefore,
                    'stateAfter' => $phaseAfter,
                    'pointBefore' => $pointBefore,
                    'pointAfter' => $pointAfter,
                    'totalWager' => $totalWager,
                    'totalReturn' => $totalReturn,
                    'balanceBefore' => $balanceSnapshot['balanceBefore'],
                    'balanceAfter' => $balanceAfter,
                    'serverDecisionAt' => $serverDecisionAt,
                ]);

                $ledgerRefs = [];
                if ($debitEntryId !== null) {
                    $ledgerRefs['debit'] = $debitEntryId;
                }
                if ($creditEntryId !== null) {
                    $ledgerRefs['credit'] = $creditEntryId;
                }

                $betRecord = [
                    'id' => $roundId,
                    'roundId' => $roundId,
                    'requestId' => $requestId,
                    'userId' => $userId,
                    'username' => (string) ($lockedUser['username'] ?? $actor['username'] ?? ''),
                    'game' => self::CRAPS_GAME_SLUG,
                    'bets' => $currentBets,
                    'result' => (string) ($dice['sum'] ?? ''),
                    'resultType' => 'dice_roll',
                    'totalWager' => $totalWager,
                    'totalReturn' => $totalReturn,
                    'profit' => $profit,
                    'netResult' => $netResult,
                    'balanceBefore' => $balanceSnapshot['balanceBefore'],
                    'balanceAfter' => $balanceAfter,
                    'availableBalanceBefore' => $balanceSnapshot['availableBalance'],
                    'availableBalanceAfter' => $availableBalanceAfter,
                    'pendingBalanceSnapshot' => $balanceSnapshot['pendingBalance'],
                    'ledgerEntries' => $ledgerRefs,
                    'rngVersion' => self::CRAPS_RNG_VERSION,
                    'outcomeSource' => 'server_rng',
                    'betDetails' => $resolvedBets,
                    'roundData' => $roundData,
                    'integrityHash' => $integrityHash,
                    'serverDecisionAt' => $serverDecisionAt,
                    'latencyMs' => $latencyMs,
                    'roundStatus' => 'settled',
                    'createdAt' => $now,
                    'updatedAt' => $now,
                ];
                $this->db->insertOne('casino_bets', $betRecord);

                $this->db->insertOne('casino_round_audit', [
                    'id' => $roundId,
                    'roundId' => $roundId,
                    'requestId' => $requestId,
                    'userId' => $userId,
                    'game' => self::CRAPS_GAME_SLUG,
                    'rngVersion' => self::CRAPS_RNG_VERSION,
                    'outcomeSource' => 'server_rng',
                    'bets' => $currentBets,
                    'result' => (string) ($dice['sum'] ?? ''),
                    'betDetails' => $resolvedBets,
                    'roundData' => $roundData,
                    'integrityHash' => $integrityHash,
                    'createdAt' => $now,
                    'updatedAt' => $now,
                ]);

                $this->db->commit();

                $ledgerEntries = [];
                if (is_array($debitEntry) && $debitEntryId !== null) {
                    $ledgerEntries[] = array_merge($debitEntry, ['id' => $debitEntryId]);
                }
                if (is_array($creditEntry) && $creditEntryId !== null) {
                    $ledgerEntries[] = array_merge($creditEntry, ['id' => $creditEntryId]);
                }
                $this->writeCasinoAuditLog('craps_round_settled', [
                    'requestId' => $requestId,
                    'roundId' => $roundId,
                    'userId' => $userId,
                    'username' => (string) ($lockedUser['username'] ?? ''),
                    'wager' => $totalWager,
                    'totalReturn' => $totalReturn,
                    'netResult' => $netResult,
                    'balanceBefore' => $balanceSnapshot['balanceBefore'],
                    'balanceAfter' => $balanceAfter,
                    'dice' => $dice,
                    'stateBefore' => $phaseBefore,
                    'stateAfter' => $phaseAfter,
                    'pointBefore' => $pointBefore,
                    'pointAfter' => $pointAfter,
                ]);
                Response::json($this->formatCasinoBetResponse($betRecord, $ledgerEntries, false));
            } catch (Throwable $txErr) {
                $this->db->rollback();
                throw $txErr;
            }
        } catch (InvalidArgumentException $e) {
            $this->writeCasinoAuditLog('craps_round_validation_error', [
                'requestId' => $requestId,
                'userId' => $userId,
                'error' => $e->getMessage(),
            ]);
            Response::json(['message' => $e->getMessage()], 400);
        } catch (Throwable $e) {
            $this->writeCasinoAuditLog('craps_round_server_error', [
                'requestId' => $requestId,
                'userId' => $userId,
                'error' => $e->getMessage(),
            ]);
            Response::json(['message' => 'Server error placing craps bet'], 500);
        }
    }

    private function placeArabianBet(array $actor, array $body, string $requestId, float $startedAt): void
    {
        $userId = (string) ($actor['id'] ?? '');

        try {
            $this->requireActiveCasinoGame(self::ARABIAN_GAME_SLUG);

            $clientBets = is_array($body['bets'] ?? null) ? $body['bets'] : [];
            $payloadMeta = is_array($body['payload'] ?? null) ? $body['payload'] : [];
            $requestedLineCount = $this->parseArabianLineCount(
                $clientBets['lines']
                    ?? $clientBets['lineCount']
                    ?? $payloadMeta['lines']
                    ?? $payloadMeta['lineCount']
                    ?? null
            );
            $requestedCoinBet = $this->parseArabianCoinBet(
                $clientBets['coinBet']
                    ?? $clientBets['coin']
                    ?? $clientBets['betPerLine']
                    ?? $payloadMeta['coinBet']
                    ?? $payloadMeta['coin']
                    ?? null
            );
            $declaredTotalBet = $this->parseMoneyValue(
                $clientBets['totalBet']
                    ?? $clientBets['bet']
                    ?? $payloadMeta['totalBet']
                    ?? 0,
                'bets.totalBet'
            );
            $requestedTotalBet = round($requestedCoinBet * $requestedLineCount);

            if ($requestedTotalBet <= 0) {
                Response::json(['message' => 'Arabian spin bet must be greater than zero'], 400);
                return;
            }

            [$gameMinBet, $gameMaxBet] = $this->resolveGameBetLimits(self::ARABIAN_GAME_SLUG, 0.3, 30.0);
            $this->db->beginTransaction();
            try {
                $lockedUser = $this->loadLockedCasinoUser($userId);
                $betLimits = $this->buildArabianBetLimits($lockedUser, $gameMinBet, $gameMaxBet);

                $existingRound = $this->db->findOne('casino_bets', [
                    'userId' => $userId,
                    'requestId' => $requestId,
                    'game' => self::ARABIAN_GAME_SLUG,
                ]);
                if ($existingRound !== null) {
                    $roundId = (string) ($existingRound['roundId'] ?? $existingRound['id'] ?? '');
                    $ledgerEntries = $this->findRoundLedgerEntries($roundId);
                    if (!is_array($existingRound['betLimits'] ?? null)) {
                        $existingRound['betLimits'] = $betLimits;
                    }
                    $this->writeCasinoAuditLog('arabian_round_idempotent', [
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

                $stateBefore = $this->getUserArabianState($lockedUser);
                $isFreeSpinRound = ($stateBefore['freeSpinsRemaining'] ?? 0) > 0;
                $lineCount = $requestedLineCount;
                $coinBet = $requestedCoinBet;
                $lockedFreeSpinLineCount = $stateBefore['freeSpinLineCount'] ?? null;
                $lockedFreeSpinCoinBet = $stateBefore['freeSpinCoinBet'] ?? null;
                if (
                    $isFreeSpinRound
                    && is_int($lockedFreeSpinLineCount)
                    && is_numeric($lockedFreeSpinCoinBet)
                    && $lockedFreeSpinLineCount >= 1
                    && $lockedFreeSpinLineCount <= self::ARABIAN_MAX_LINES
                    && $this->num($lockedFreeSpinCoinBet) > 0
                ) {
                    $lineCount = $lockedFreeSpinLineCount;
                    $coinBet = round($this->num($lockedFreeSpinCoinBet));
                }

                $baseTotalBet = round($coinBet * $lineCount);
                $totalWager = $isFreeSpinRound ? 0.0 : $baseTotalBet;
                if ($isFreeSpinRound && ($lineCount !== $requestedLineCount || abs($coinBet - $requestedCoinBet) > 0.00001)) {
                    $this->writeCasinoAuditLog('arabian_freespin_bet_locked', [
                        'requestId' => $requestId,
                        'userId' => $userId,
                        'username' => (string) ($lockedUser['username'] ?? ''),
                        'requestedLines' => $requestedLineCount,
                        'requestedCoinBet' => $requestedCoinBet,
                        'lockedLines' => $lineCount,
                        'lockedCoinBet' => $coinBet,
                    ]);
                }

                if ($baseTotalBet > $gameMaxBet) {
                    $this->db->rollback();
                    Response::json(['message' => 'Maximum Arabian wager is $' . round($gameMaxBet)], 400);
                    return;
                }

                if (!$isFreeSpinRound) {
                    if ($totalWager < $gameMinBet) {
                        $this->db->rollback();
                        Response::json(['message' => 'Minimum Arabian wager is $' . round($gameMinBet)], 400);
                        return;
                    }
                    if ($totalWager > $gameMaxBet) {
                        $this->db->rollback();
                        Response::json(['message' => 'Maximum Arabian wager is $' . round($gameMaxBet)], 400);
                        return;
                    }

                    $this->assertUserWagerWithinLimits($lockedUser, $totalWager);
                    $this->assertCasinoLossLimits($lockedUser, $totalWager);
                }

                $balanceSnapshot = $this->getUserBalanceSnapshot($lockedUser);
                if ($totalWager > $balanceSnapshot['availableBalance']) {
                    $this->db->rollback();
                    Response::json(['message' => 'Insufficient balance. Available: $' . round($balanceSnapshot['availableBalance'])], 400);
                    return;
                }

                $roundId = $this->deterministicRoundId(self::ARABIAN_GAME_SLUG, $userId, $requestId);
                $settlement = $this->settleArabianSpin($coinBet, $lineCount, $stateBefore);
                $totalReturn = round($this->num($settlement['totalReturn'] ?? 0));
                $netResult = round($totalReturn - $totalWager);
                $profit = round(max(0, $netResult));
                $result = (string) ($settlement['result'] ?? ($totalReturn > 0 ? 'Win' : 'Lose'));
                $resultType = (string) ($settlement['resultType'] ?? '');
                $roundData = is_array($settlement['roundData'] ?? null) ? $settlement['roundData'] : [];
                $stateAfter = is_array($settlement['stateAfter'] ?? null) ? $settlement['stateAfter'] : ['freeSpinsRemaining' => 0];

                $now = SqlRepository::nowUtc();
                $ipAddress = IpUtils::clientIp();
                $userAgent = Http::header('user-agent') !== '' ? Http::header('user-agent') : null;
                $balanceAfterDebit = round($balanceSnapshot['balanceBefore'] - $totalWager);
                $balanceAfter = round($balanceAfterDebit + $totalReturn);
                $availableBalanceAfter = round(max(0, $balanceAfter - $balanceSnapshot['pendingBalance']));

                $debitEntry = null;
                $debitEntryId = null;
                if ($totalWager > 0) {
                    $debitEntry = $this->buildCasinoTransactionEntry(
                        $userId,
                        $totalWager,
                        $roundId,
                        self::ARABIAN_SOURCE_TYPE,
                        'DEBIT',
                        'casino_bet_debit',
                        $balanceSnapshot['balanceBefore'],
                        $balanceAfterDebit,
                        'CASINO_ARABIAN_WAGER',
                        'Arabian spin wager charged',
                        $now,
                        $ipAddress,
                        $userAgent
                    );
                    $debitEntryId = $this->db->insertOne('transactions', $debitEntry);
                }

                $creditEntry = null;
                $creditEntryId = null;
                if ($totalReturn > 0) {
                    $creditEntry = $this->buildCasinoTransactionEntry(
                        $userId,
                        $totalReturn,
                        $roundId,
                        self::ARABIAN_SOURCE_TYPE,
                        'CREDIT',
                        'casino_bet_credit',
                        $balanceAfterDebit,
                        $balanceAfter,
                        'CASINO_ARABIAN_PAYOUT',
                        'Arabian spin payout credited',
                        $now,
                        $ipAddress,
                        $userAgent
                    );
                    $creditEntryId = $this->db->insertOne('transactions', $creditEntry);
                }

                $stateAfter['updatedAt'] = $now;
                $stateAfter['lastRoundId'] = $roundId;
                $stateAfter['lastSpinAt'] = $now;

                $this->db->updateOne('users', ['id' => SqlRepository::id($userId)], [
                    'balance' => $balanceAfter,
                    'casinoArabianState' => $stateAfter,
                    'updatedAt' => $now,
                ]);

                $serverDecisionAt = SqlRepository::nowUtc();
                $latencyMs = max(0, (int) round((microtime(true) - $startedAt) * 1000));
                $integrityHash = $this->buildIntegrityHash([
                    'roundId' => $roundId,
                    'requestId' => $requestId,
                    'userId' => $userId,
                    'game' => self::ARABIAN_GAME_SLUG,
                    'coinBet' => $coinBet,
                    'lineCount' => $lineCount,
                    'requestedCoinBet' => $requestedCoinBet,
                    'requestedLineCount' => $requestedLineCount,
                    'isFreeSpinRound' => $isFreeSpinRound,
                    'declaredTotalBet' => $declaredTotalBet,
                    'totalWager' => $totalWager,
                    'totalReturn' => $totalReturn,
                    'netResult' => $netResult,
                    'pattern' => $roundData['pattern'] ?? [],
                    'winningLines' => $roundData['winningLines'] ?? [],
                    'freeSpinsBefore' => $roundData['freeSpinsBefore'] ?? 0,
                    'freeSpinsAfter' => $roundData['freeSpinsAfter'] ?? 0,
                    'bonusWin' => $roundData['bonusWin'] ?? 0,
                    'balanceBefore' => $balanceSnapshot['balanceBefore'],
                    'balanceAfter' => $balanceAfter,
                    'serverDecisionAt' => $serverDecisionAt,
                ]);

                $ledgerRefs = [];
                if ($debitEntryId !== null) {
                    $ledgerRefs['debit'] = $debitEntryId;
                }
                if ($creditEntryId !== null) {
                    $ledgerRefs['credit'] = $creditEntryId;
                }

                $betDetails = [
                    'winningLines' => is_array($roundData['winningLines'] ?? null) ? $roundData['winningLines'] : [],
                    'lineWin' => round($this->num($roundData['lineWin'] ?? 0)),
                    'bonusWin' => round($this->num($roundData['bonusWin'] ?? 0)),
                    'bonusTriggered' => (bool) ($roundData['bonusTriggered'] ?? false),
                    'bonusPrizeIndex' => (int) ($roundData['bonusPrizeIndex'] ?? -1),
                    'bonusSymbolCount' => (int) ($roundData['bonusSymbolCount'] ?? 0),
                    'freeSpinSymbolCount' => (int) ($roundData['freeSpinSymbolCount'] ?? 0),
                    'freeSpinsBefore' => (int) ($roundData['freeSpinsBefore'] ?? 0),
                    'freeSpinsAwarded' => (int) ($roundData['freeSpinsAwarded'] ?? 0),
                    'freeSpinsAfter' => (int) ($roundData['freeSpinsAfter'] ?? 0),
                    'isFreeSpinRound' => (bool) ($roundData['isFreeSpinRound'] ?? false),
                ];

                $betRecord = [
                    'id' => $roundId,
                    'roundId' => $roundId,
                    'requestId' => $requestId,
                    'userId' => $userId,
                    'username' => (string) ($lockedUser['username'] ?? $actor['username'] ?? ''),
                    'game' => self::ARABIAN_GAME_SLUG,
                    'bets' => [
                        'lines' => $lineCount,
                        'coinBet' => $coinBet,
                        'totalBet' => $baseTotalBet,
                        'clientRequestedLines' => $requestedLineCount,
                        'clientRequestedCoinBet' => $requestedCoinBet,
                        'clientDeclaredTotalBet' => $declaredTotalBet,
                        'isFreeSpinRound' => $isFreeSpinRound,
                    ],
                    'result' => $result,
                    'resultType' => $resultType,
                    'totalWager' => $totalWager,
                    'totalReturn' => $totalReturn,
                    'profit' => $profit,
                    'netResult' => $netResult,
                    'balanceBefore' => $balanceSnapshot['balanceBefore'],
                    'balanceAfter' => $balanceAfter,
                    'availableBalanceBefore' => $balanceSnapshot['availableBalance'],
                    'availableBalanceAfter' => $availableBalanceAfter,
                    'pendingBalanceSnapshot' => $balanceSnapshot['pendingBalance'],
                    'ledgerEntries' => $ledgerRefs,
                    'rngVersion' => self::ARABIAN_RNG_VERSION,
                    'outcomeSource' => 'server_rng',
                    'betLimits' => $betLimits,
                    'betDetails' => $betDetails,
                    'roundData' => $roundData,
                    'integrityHash' => $integrityHash,
                    'serverDecisionAt' => $serverDecisionAt,
                    'latencyMs' => $latencyMs,
                    'roundStatus' => 'settled',
                    'createdAt' => $now,
                    'updatedAt' => $now,
                ];
                $this->db->insertOne('casino_bets', $betRecord);

                $this->db->insertOne('casino_round_audit', [
                    'id' => $roundId,
                    'roundId' => $roundId,
                    'requestId' => $requestId,
                    'userId' => $userId,
                    'game' => self::ARABIAN_GAME_SLUG,
                    'rngVersion' => self::ARABIAN_RNG_VERSION,
                    'outcomeSource' => 'server_rng',
                    'bets' => $betRecord['bets'],
                    'result' => $result,
                    'resultType' => $resultType,
                    'betDetails' => $betDetails,
                    'roundData' => $roundData,
                    'integrityHash' => $integrityHash,
                    'createdAt' => $now,
                    'updatedAt' => $now,
                ]);

                $this->db->commit();

                $ledgerEntries = [];
                if (is_array($debitEntry) && $debitEntryId !== null) {
                    $ledgerEntries[] = array_merge($debitEntry, ['id' => $debitEntryId]);
                }
                if (is_array($creditEntry) && $creditEntryId !== null) {
                    $ledgerEntries[] = array_merge($creditEntry, ['id' => $creditEntryId]);
                }

                $this->writeCasinoAuditLog('arabian_round_settled', [
                    'requestId' => $requestId,
                    'roundId' => $roundId,
                    'userId' => $userId,
                    'username' => (string) ($lockedUser['username'] ?? ''),
                    'coinBet' => $coinBet,
                    'lines' => $lineCount,
                    'isFreeSpinRound' => $isFreeSpinRound,
                    'wager' => $totalWager,
                    'totalReturn' => $totalReturn,
                    'netResult' => $netResult,
                    'balanceBefore' => $balanceSnapshot['balanceBefore'],
                    'balanceAfter' => $balanceAfter,
                    'freeSpinsBefore' => (int) ($roundData['freeSpinsBefore'] ?? 0),
                    'freeSpinsAfter' => (int) ($roundData['freeSpinsAfter'] ?? 0),
                    'bonusWin' => round($this->num($roundData['bonusWin'] ?? 0)),
                ]);
                Response::json($this->formatCasinoBetResponse($betRecord, $ledgerEntries, false));
            } catch (Throwable $txErr) {
                $this->db->rollback();
                throw $txErr;
            }
        } catch (InvalidArgumentException $e) {
            $this->writeCasinoAuditLog('arabian_round_validation_error', [
                'requestId' => $requestId,
                'userId' => $userId,
                'error' => $e->getMessage(),
            ]);
            Response::json(['message' => $e->getMessage()], 400);
        } catch (Throwable $e) {
            $this->writeCasinoAuditLog('arabian_round_server_error', [
                'requestId' => $requestId,
                'userId' => $userId,
                'error' => $e->getMessage(),
            ]);
            Response::json(['message' => 'Server error placing arabian bet'], 500);
        }
    }

    /**
     * @return array{freeSpinsRemaining:int,freeSpinLineCount:?int,freeSpinCoinBet:?float}
     */
    private function getUserArabianState(array $user): array
    {
        $raw = is_array($user['casinoArabianState'] ?? null) ? $user['casinoArabianState'] : [];
        $freeSpinsRaw = $this->safeNumber($raw['freeSpinsRemaining'] ?? null, 0);
        $freeSpins = max(0, min(500, (int) round($freeSpinsRaw ?? 0)));
        $lineCountRaw = $this->safeNumber($raw['freeSpinLineCount'] ?? null, null);
        $freeSpinLineCount = null;
        if ($lineCountRaw !== null) {
            $candidateLineCount = (int) round($lineCountRaw);
            if (abs($lineCountRaw - $candidateLineCount) <= 0.00001 && $candidateLineCount >= 1 && $candidateLineCount <= self::ARABIAN_MAX_LINES) {
                $freeSpinLineCount = $candidateLineCount;
            }
        }
        $coinBetRaw = $this->safeNumber($raw['freeSpinCoinBet'] ?? null, null);
        $freeSpinCoinBet = null;
        if ($coinBetRaw !== null && $coinBetRaw > 0 && $coinBetRaw <= 1000) {
            $freeSpinCoinBet = round($coinBetRaw);
        }

        return [
            'freeSpinsRemaining' => $freeSpins,
            'freeSpinLineCount' => $freeSpinLineCount,
            'freeSpinCoinBet' => $freeSpinCoinBet,
        ];
    }

    private function parseArabianLineCount(mixed $value): int
    {
        if ($value === null || $value === '') {
            throw new InvalidArgumentException('bets.lines is required');
        }
        if (!is_numeric($value)) {
            throw new InvalidArgumentException('bets.lines must be numeric');
        }

        $raw = (float) $value;
        $lineCount = (int) round($raw);
        if (abs($raw - $lineCount) > 0.00001) {
            throw new InvalidArgumentException('bets.lines must be an integer');
        }
        if ($lineCount < 1 || $lineCount > self::ARABIAN_MAX_LINES) {
            throw new InvalidArgumentException('bets.lines must be between 1 and ' . self::ARABIAN_MAX_LINES);
        }

        return $lineCount;
    }

    private function parseArabianCoinBet(mixed $value): float
    {
        $coinBet = $this->parseMoneyValue($value, 'bets.coinBet');
        if ($coinBet <= 0) {
            throw new InvalidArgumentException('bets.coinBet must be greater than zero');
        }
        if ($coinBet > 1000) {
            throw new InvalidArgumentException('bets.coinBet is too large');
        }
        $coinStepCents = (int) round(self::ARABIAN_COIN_STEP * 100);
        $coinBetCents = (int) round($coinBet * 100);
        if ($coinStepCents <= 0 || ($coinBetCents % $coinStepCents) !== 0) {
            throw new InvalidArgumentException('bets.coinBet must use ' . round(self::ARABIAN_COIN_STEP) . ' increments');
        }

        return $coinBet;
    }

    /**
     * @return array{
     *   accountMinBet:?float,
     *   accountMaxBet:?float,
     *   gameMinBet:float,
     *   gameMaxBet:float,
     *   effectiveMinBet:float,
     *   effectiveMaxBet:float,
     *   lineMin:int,
     *   lineMax:int,
     *   coinStep:float
     * }
     */
    private function buildArabianBetLimits(array $lockedUser, float $gameMinBet, float $gameMaxBet): array
    {
        $accountMinRaw = $this->safeNumber($lockedUser['minBet'] ?? null, null);
        $accountMaxRaw = $this->safeNumber($lockedUser['maxBet'] ?? null, null);
        $accountMinBet = ($accountMinRaw !== null && $accountMinRaw > 0) ? round($accountMinRaw) : null;
        $accountMaxBet = ($accountMaxRaw !== null && $accountMaxRaw > 0) ? round($accountMaxRaw) : null;

        $effectiveMinBet = $accountMinBet !== null ? max($gameMinBet, $accountMinBet) : $gameMinBet;
        $effectiveMaxBet = $accountMaxBet !== null ? min($gameMaxBet, $accountMaxBet) : $gameMaxBet;
        if ($effectiveMaxBet < $effectiveMinBet) {
            $effectiveMaxBet = $effectiveMinBet;
        }

        return [
            'accountMinBet' => $accountMinBet,
            'accountMaxBet' => $accountMaxBet,
            'gameMinBet' => round($gameMinBet),
            'gameMaxBet' => round($gameMaxBet),
            'effectiveMinBet' => round($effectiveMinBet),
            'effectiveMaxBet' => round($effectiveMaxBet),
            'lineMin' => 1,
            'lineMax' => self::ARABIAN_MAX_LINES,
            'coinStep' => self::ARABIAN_COIN_STEP,
        ];
    }

    /**
     * @param array{freeSpinsRemaining:int,freeSpinLineCount:?int,freeSpinCoinBet:?float} $stateBefore
     * @return array{
     *   totalReturn: float,
     *   result: string,
     *   resultType: string,
     *   roundData: array<string, mixed>,
     *   stateAfter: array<string, mixed>
     * }
     */
    private function settleArabianSpin(float $coinBet, int $lineCount, array $stateBefore): array
    {
        $freeSpinsBefore = max(0, (int) ($stateBefore['freeSpinsRemaining'] ?? 0));
        $isFreeSpinRound = $freeSpinsBefore > 0;
        $freeSpinsAfter = $isFreeSpinRound ? ($freeSpinsBefore - 1) : $freeSpinsBefore;
        $lockedLineCountBefore = is_int($stateBefore['freeSpinLineCount'] ?? null) ? (int) $stateBefore['freeSpinLineCount'] : null;
        $lockedCoinBetBefore = is_numeric($stateBefore['freeSpinCoinBet'] ?? null) ? round($this->num($stateBefore['freeSpinCoinBet'])) : null;

        $pattern = $this->generateArabianPattern();
        $winningLines = $this->evaluateArabianWinningLines($pattern, $lineCount, $coinBet);
        $lineWin = 0.0;
        foreach ($winningLines as $lineWinEntry) {
            $lineWin += $this->num($lineWinEntry['amount'] ?? 0);
        }
        $lineWin = round($lineWin);

        $bonusSymbolCount = $this->countArabianSymbol($pattern, self::ARABIAN_BONUS_SYMBOL);
        $bonusTriggered = $bonusSymbolCount >= 3;
        $bonusPrizeIndex = -1;
        $bonusWin = 0.0;
        if ($bonusTriggered) {
            [$bonusPrizeIndex, $bonusMultiplier] = $this->pickArabianBonusPrize();
            $bonusWin = round($bonusMultiplier * $coinBet);
        }

        $freeSpinSymbolCount = $this->countArabianSymbol($pattern, self::ARABIAN_FREESPIN_SYMBOL);
        $awardKey = min(5, $freeSpinSymbolCount);
        $freeSpinsAwarded = (int) (self::ARABIAN_FREESPIN_AWARDS[$awardKey] ?? 0);
        $freeSpinsAfter = max(0, min(500, $freeSpinsAfter + $freeSpinsAwarded));
        $nextLockedLineCount = null;
        $nextLockedCoinBet = null;
        if ($freeSpinsAfter > 0) {
            if ($isFreeSpinRound) {
                $nextLockedLineCount = $lockedLineCountBefore !== null ? $lockedLineCountBefore : $lineCount;
                $nextLockedCoinBet = $lockedCoinBetBefore !== null ? $lockedCoinBetBefore : $coinBet;
            } else {
                $nextLockedLineCount = $lineCount;
                $nextLockedCoinBet = $coinBet;
            }
        }

        $totalReturn = round($lineWin + $bonusWin);
        $result = $totalReturn > 0 ? 'Win' : ($isFreeSpinRound ? 'Free Spin' : 'Lose');
        $resultType = $totalReturn > 0
            ? ($bonusTriggered ? 'bonus_win' : 'spin_win')
            : ($isFreeSpinRound ? 'freespin_no_win' : 'spin_loss');

        $roundData = [
            'lineCount' => $lineCount,
            'coinBet' => $coinBet,
            'totalBet' => round($coinBet * $lineCount),
            'isFreeSpinRound' => $isFreeSpinRound,
            'freeSpinsBefore' => $freeSpinsBefore,
            'freeSpinsAwarded' => $freeSpinsAwarded,
            'freeSpinsAfter' => $freeSpinsAfter,
            'freeSpinLockedLineCount' => $nextLockedLineCount,
            'freeSpinLockedCoinBet' => $nextLockedCoinBet,
            'freeSpinSymbolCount' => $freeSpinSymbolCount,
            'bonusTriggered' => $bonusTriggered,
            'bonusSymbolCount' => $bonusSymbolCount,
            'bonusPrizeIndex' => $bonusPrizeIndex,
            'bonusWin' => $bonusWin,
            'lineWin' => $lineWin,
            'totalWin' => $totalReturn,
            'pattern' => $pattern,
            'winningLines' => $winningLines,
            // Keep vendor-compatible aliases for iframe adapters.
            'win_lines' => $winningLines,
        ];

        $stateAfter = [
            'freeSpinsRemaining' => $freeSpinsAfter,
        ];
        if ($nextLockedLineCount !== null && $nextLockedCoinBet !== null) {
            $stateAfter['freeSpinLineCount'] = $nextLockedLineCount;
            $stateAfter['freeSpinCoinBet'] = $nextLockedCoinBet;
        }

        return [
            'totalReturn' => $totalReturn,
            'result' => $result,
            'resultType' => $resultType,
            'roundData' => $roundData,
            'stateAfter' => $stateAfter,
        ];
    }

    /**
     * @return array<int, array<int, int>>
     */
    private function generateArabianPattern(): array
    {
        $pattern = [];
        for ($row = 0; $row < self::ARABIAN_ROWS; $row++) {
            $pattern[$row] = [];
            for ($col = 0; $col < self::ARABIAN_REELS; $col++) {
                $pattern[$row][$col] = $this->pickArabianSymbol();
            }
        }
        return $pattern;
    }

    private function pickArabianSymbol(): int
    {
        $totalWeight = 0;
        foreach (self::ARABIAN_SYMBOL_WEIGHTS as $weight) {
            $totalWeight += max(0, (int) $weight);
        }
        if ($totalWeight <= 0) {
            return 1;
        }

        $roll = random_int(1, $totalWeight);
        $cursor = 0;
        foreach (self::ARABIAN_SYMBOL_WEIGHTS as $symbol => $weight) {
            $cursor += max(0, (int) $weight);
            if ($roll <= $cursor) {
                return (int) $symbol;
            }
        }

        return 1;
    }

    /**
     * @param array<int, array<int, int>> $pattern
     * @return array<int, array<string, mixed>>
     */
    private function evaluateArabianWinningLines(array $pattern, int $lineCount, float $coinBet): array
    {
        $winningLines = [];
        $maxLines = min($lineCount, count(self::ARABIAN_LINE_PATTERNS));

        for ($lineIndex = 0; $lineIndex < $maxLines; $lineIndex++) {
            $rows = self::ARABIAN_LINE_PATTERNS[$lineIndex];
            $cells = [];

            for ($col = 0; $col < self::ARABIAN_REELS; $col++) {
                $row = (int) ($rows[$col] ?? 0);
                $value = (int) ($pattern[$row][$col] ?? 0);
                $cells[] = ['row' => $row, 'col' => $col, 'value' => $value];
            }

            if ($cells === []) {
                continue;
            }

            $symbol = (int) ($cells[0]['value'] ?? 0);
            $matched = [$cells[0]];
            $numEqualSymbols = 1;
            $startIndex = 1;

            while ($symbol === self::ARABIAN_WILD_SYMBOL && $startIndex < self::ARABIAN_REELS) {
                $symbol = (int) ($cells[$startIndex]['value'] ?? 0);
                $matched[] = $cells[$startIndex];
                $numEqualSymbols++;
                $startIndex++;
            }

            for ($idx = $startIndex; $idx < self::ARABIAN_REELS; $idx++) {
                $cellValue = (int) ($cells[$idx]['value'] ?? 0);
                if ($cellValue === $symbol || $cellValue === self::ARABIAN_WILD_SYMBOL) {
                    $numEqualSymbols++;
                    $matched[] = $cells[$idx];
                    continue;
                }
                break;
            }

            $symbolPaytable = self::ARABIAN_PAYTABLE[$symbol] ?? null;
            if (!is_array($symbolPaytable)) {
                continue;
            }

            $multiplier = (float) ($symbolPaytable[$numEqualSymbols - 1] ?? 0);
            if ($multiplier <= 0) {
                continue;
            }

            $amount = round($multiplier * $coinBet);
            if ($amount <= 0) {
                continue;
            }

            $winningLines[] = [
                'line' => $lineIndex + 1,
                'amount' => $amount,
                'num_win' => $numEqualSymbols,
                'value' => $symbol,
                'list' => $matched,
            ];
        }

        return $winningLines;
    }

    /**
     * @param array<int, array<int, int>> $pattern
     */
    private function countArabianSymbol(array $pattern, int $symbol): int
    {
        $count = 0;
        foreach ($pattern as $row) {
            if (!is_array($row)) {
                continue;
            }
            foreach ($row as $value) {
                if ((int) $value === $symbol) {
                    $count++;
                }
            }
        }
        return $count;
    }

    /**
     * @return array{0:int,1:float}
     */
    private function pickArabianBonusPrize(): array
    {
        $totalWeight = 0;
        foreach (self::ARABIAN_BONUS_PRIZE_WEIGHTS as $weight) {
            $totalWeight += max(0, (int) $weight);
        }
        if ($totalWeight <= 0) {
            return [-1, 0.0];
        }

        $roll = random_int(1, $totalWeight);
        $cursor = 0;
        foreach (self::ARABIAN_BONUS_PRIZE_WEIGHTS as $idx => $weight) {
            $cursor += max(0, (int) $weight);
            if ($roll <= $cursor) {
                return [(int) $idx, round($this->num(self::ARABIAN_BONUS_PRIZES[$idx] ?? 0))];
            }
        }

        return [-1, 0.0];
    }

    private function placeJurassicRunBet(array $actor, array $body, string $requestId, float $startedAt): void
    {
        $userId = (string) ($actor['id'] ?? '');

        try {
            $this->requireActiveCasinoGame(self::JURASSIC_RUN_GAME_SLUG);

            $bets = is_array($body['bets'] ?? null) ? $body['bets'] : [];
            $requestedBetId = $this->parseJurassicRunBetId(
                $bets['betId'] ?? ($body['betId'] ?? self::JURASSIC_RUN_DEFAULT_BET_ID)
            );
            $declaredBet = array_key_exists('bet', $bets)
                ? $this->parseMoneyValue($bets['bet'], 'bets.bet')
                : null;

            [$gameMinBet, $gameMaxBet] = $this->resolveGameBetLimits(self::JURASSIC_RUN_GAME_SLUG, 1.0, 5000.0);

            $this->db->beginTransaction();
            try {
                $lockedUser = $this->loadLockedCasinoUser($userId);
                $betLimits = $this->buildJurassicRunBetLimits($lockedUser, $gameMinBet, $gameMaxBet);

                $existingRound = $this->db->findOne('casino_bets', [
                    'userId' => $userId,
                    'requestId' => $requestId,
                    'game' => self::JURASSIC_RUN_GAME_SLUG,
                ]);
                if ($existingRound !== null) {
                    $roundId = (string) ($existingRound['roundId'] ?? $existingRound['id'] ?? '');
                    $ledgerEntries = $this->findRoundLedgerEntries($roundId);
                    if (!is_array($existingRound['betLimits'] ?? null)) {
                        $existingRound['betLimits'] = $betLimits;
                    }
                    $this->writeCasinoAuditLog('jurassic_run_round_idempotent', [
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

                $progressiveStateBefore = $this->loadJurassicRunProgressiveStateForUpdate();
                $stateBefore = $this->getUserJurassicRunState($lockedUser);
                $isFreeSpinRound = ($stateBefore['freeSpinsRemaining'] ?? 0) > 0;
                $betId = $isFreeSpinRound && is_int($stateBefore['lockedBetId'] ?? null)
                    ? (int) $stateBefore['lockedBetId']
                    : $requestedBetId;
                $bet = $this->jurassicRunBetAmountForId($betId);
                $lineBet = round($bet / self::JURASSIC_RUN_FIXED_PAYLINES);
                $totalWager = $isFreeSpinRound ? 0.0 : $bet;

                if (!$isFreeSpinRound) {
                    if ($bet < $gameMinBet) {
                        $this->db->rollback();
                        Response::json(['message' => 'Minimum Jurassic Run wager is $' . round($gameMinBet)], 400);
                        return;
                    }
                    if ($bet > $gameMaxBet) {
                        $this->db->rollback();
                        Response::json(['message' => 'Maximum Jurassic Run wager is $' . round($gameMaxBet)], 400);
                        return;
                    }

                    // Jurassic Run uses its own fixed in-game chip ladder. Do not
                    // apply sportsbook account min/max wager limits here.
                    $this->assertCasinoLossLimits($lockedUser, $totalWager);
                }

                $balanceSnapshot = $this->getUserBalanceSnapshot($lockedUser);
                if ($totalWager > $balanceSnapshot['availableBalance']) {
                    $this->db->rollback();
                    Response::json(['message' => 'Insufficient balance. Available: $' . round($balanceSnapshot['availableBalance'])], 400);
                    return;
                }

                $roundId = $this->deterministicRoundId(self::JURASSIC_RUN_GAME_SLUG, $userId, $requestId);
                $settlement = $this->settleJurassicRunSpin($bet, $betId, $stateBefore, $progressiveStateBefore);
                $totalReturn = round($this->num($settlement['totalReturn'] ?? 0));
                $netResult = round($totalReturn - $totalWager);
                $profit = round(max(0, $netResult));
                $result = (string) ($settlement['result'] ?? ($totalReturn > 0 ? 'Win' : 'Lose'));
                $resultType = (string) ($settlement['resultType'] ?? '');
                $roundData = is_array($settlement['roundData'] ?? null) ? $settlement['roundData'] : [];
                $stateAfter = is_array($settlement['stateAfter'] ?? null) ? $settlement['stateAfter'] : [];
                $progressiveStateAfter = is_array($settlement['progressiveStateAfter'] ?? null) ? $settlement['progressiveStateAfter'] : $progressiveStateBefore;

                $now = SqlRepository::nowUtc();
                $ipAddress = IpUtils::clientIp();
                $userAgent = Http::header('user-agent') !== '' ? Http::header('user-agent') : null;
                $balanceAfterDebit = round($balanceSnapshot['balanceBefore'] - $totalWager);
                $balanceAfter = round($balanceAfterDebit + $totalReturn);
                $availableBalanceAfter = round(max(0, $balanceAfter - $balanceSnapshot['pendingBalance']));

                $debitEntry = null;
                $debitEntryId = null;
                if ($totalWager > 0) {
                    $debitEntry = $this->buildCasinoTransactionEntry(
                        $userId,
                        $totalWager,
                        $roundId,
                        self::JURASSIC_RUN_SOURCE_TYPE,
                        'DEBIT',
                        'casino_bet_debit',
                        $balanceSnapshot['balanceBefore'],
                        $balanceAfterDebit,
                        'CASINO_JURASSIC_RUN_WAGER',
                        'Jurassic Run spin wager charged',
                        $now,
                        $ipAddress,
                        $userAgent
                    );
                    $debitEntryId = $this->db->insertOne('transactions', $debitEntry);
                }

                $creditEntry = null;
                $creditEntryId = null;
                if ($totalReturn > 0) {
                    $creditEntry = $this->buildCasinoTransactionEntry(
                        $userId,
                        $totalReturn,
                        $roundId,
                        self::JURASSIC_RUN_SOURCE_TYPE,
                        'CREDIT',
                        'casino_bet_credit',
                        $balanceAfterDebit,
                        $balanceAfter,
                        'CASINO_JURASSIC_RUN_PAYOUT',
                        'Jurassic Run spin payout credited',
                        $now,
                        $ipAddress,
                        $userAgent
                    );
                    $creditEntryId = $this->db->insertOne('transactions', $creditEntry);
                }

                $stateAfter['updatedAt'] = $now;
                $stateAfter['lastRoundId'] = $roundId;
                $stateAfter['lastSpinAt'] = $now;
                $stateAfter = $this->buildJurassicRunUserStateAfter(
                    $stateBefore,
                    $stateAfter,
                    $betId,
                    $bet,
                    $totalWager,
                    $totalReturn,
                    $resultType,
                    (bool) ($roundData['jackpotWon'] ?? false),
                    (int) ($roundData['freeSpinsAwarded'] ?? 0)
                );
                $progressiveStateAfter['updatedAt'] = $now;

                $this->db->updateOne('users', ['id' => SqlRepository::id($userId)], [
                    'balance' => $balanceAfter,
                    'casinoJurassicRunState' => $stateAfter,
                    'updatedAt' => $now,
                ]);
                $this->db->updateOne('casino_game_state', ['id' => self::JURASSIC_RUN_GAME_SLUG], $progressiveStateAfter);

                $serverDecisionAt = SqlRepository::nowUtc();
                $latencyMs = max(0, (int) round((microtime(true) - $startedAt) * 1000));
                $integrityHash = $this->buildIntegrityHash([
                    'roundId' => $roundId,
                    'requestId' => $requestId,
                    'userId' => $userId,
                    'game' => self::JURASSIC_RUN_GAME_SLUG,
                    'betId' => $betId,
                    'bet' => $bet,
                    'clientRequestedBetId' => $requestedBetId,
                    'clientDeclaredBet' => $declaredBet,
                    'isFreeSpinRound' => $isFreeSpinRound,
                    'totalWager' => $totalWager,
                    'totalReturn' => $totalReturn,
                    'netResult' => $netResult,
                    'symbols' => $roundData['symbols'] ?? [],
                    'winningLines' => $roundData['winningLines'] ?? [],
                    'freeSpinsBefore' => $roundData['freeSpinsBefore'] ?? 0,
                    'freeSpinsAfter' => $roundData['freeSpinsAfter'] ?? 0,
                    'activePaylines' => $roundData['activePaylines'] ?? self::JURASSIC_RUN_FIXED_PAYLINES,
                    'lineBet' => $roundData['lineBet'] ?? $lineBet,
                    'jackpotBefore' => $roundData['jackpotBefore'] ?? 0,
                    'jackpotAfter' => $roundData['jackpotAfter'] ?? 0,
                    'jackpotPayout' => $roundData['jackpotPayout'] ?? 0,
                    'balanceBefore' => $balanceSnapshot['balanceBefore'],
                    'balanceAfter' => $balanceAfter,
                    'serverDecisionAt' => $serverDecisionAt,
                ]);

                $ledgerRefs = [];
                if ($debitEntryId !== null) {
                    $ledgerRefs['debit'] = $debitEntryId;
                }
                if ($creditEntryId !== null) {
                    $ledgerRefs['credit'] = $creditEntryId;
                }

                $betDetails = [
                    'winningLines' => is_array($roundData['winningLines'] ?? null) ? $roundData['winningLines'] : [],
                    'slotWin' => round($this->num($roundData['slotWin'] ?? 0)),
                    'lineWin' => round($this->num($roundData['lineWin'] ?? 0)),
                    'activePaylines' => (int) ($roundData['activePaylines'] ?? self::JURASSIC_RUN_FIXED_PAYLINES),
                    'lineBet' => round($this->num($roundData['lineBet'] ?? $lineBet)),
                    'jackpotWon' => (bool) ($roundData['jackpotWon'] ?? false),
                    'jackpotPayout' => round($this->num($roundData['jackpotPayout'] ?? 0)),
                    'freeSpinsBefore' => (int) ($roundData['freeSpinsBefore'] ?? 0),
                    'freeSpinsAwarded' => (int) ($roundData['freeSpinsAwarded'] ?? 0),
                    'freeSpinsAfter' => (int) ($roundData['freeSpinsAfter'] ?? 0),
                    'isFreeSpinRound' => (bool) ($roundData['isFreeSpinRound'] ?? false),
                    'symbols' => is_array($roundData['symbols'] ?? null) ? $roundData['symbols'] : [],
                ];

                $betRecord = [
                    'id' => $roundId,
                    'roundId' => $roundId,
                    'requestId' => $requestId,
                    'userId' => $userId,
                    'username' => (string) ($lockedUser['username'] ?? $actor['username'] ?? ''),
                    'game' => self::JURASSIC_RUN_GAME_SLUG,
                    'bets' => [
                        'betId' => $betId,
                        'bet' => $bet,
                        'lineBet' => $lineBet,
                        'paylines' => self::JURASSIC_RUN_FIXED_PAYLINES,
                        'clientRequestedBetId' => $requestedBetId,
                        'clientDeclaredBet' => $declaredBet,
                        'isFreeSpinRound' => $isFreeSpinRound,
                    ],
                    'result' => $result,
                    'resultType' => $resultType,
                    'totalWager' => $totalWager,
                    'totalReturn' => $totalReturn,
                    'profit' => $profit,
                    'netResult' => $netResult,
                    'balanceBefore' => $balanceSnapshot['balanceBefore'],
                    'balanceAfter' => $balanceAfter,
                    'availableBalanceBefore' => $balanceSnapshot['availableBalance'],
                    'availableBalanceAfter' => $availableBalanceAfter,
                    'pendingBalanceSnapshot' => $balanceSnapshot['pendingBalance'],
                    'ledgerEntries' => $ledgerRefs,
                    'rngVersion' => self::JURASSIC_RUN_RNG_VERSION,
                    'outcomeSource' => 'server_rng',
                    'betLimits' => $betLimits,
                    'betDetails' => $betDetails,
                    'roundData' => $roundData,
                    'integrityHash' => $integrityHash,
                    'serverDecisionAt' => $serverDecisionAt,
                    'latencyMs' => $latencyMs,
                    'roundStatus' => 'settled',
                    'createdAt' => $now,
                    'updatedAt' => $now,
                ];
                $this->db->insertOne('casino_bets', $betRecord);

                $this->db->insertOne('casino_round_audit', [
                    'id' => $roundId,
                    'roundId' => $roundId,
                    'requestId' => $requestId,
                    'userId' => $userId,
                    'game' => self::JURASSIC_RUN_GAME_SLUG,
                    'rngVersion' => self::JURASSIC_RUN_RNG_VERSION,
                    'outcomeSource' => 'server_rng',
                    'bets' => $betRecord['bets'],
                    'result' => $result,
                    'resultType' => $resultType,
                    'betDetails' => $betDetails,
                    'roundData' => $roundData,
                    'integrityHash' => $integrityHash,
                    'createdAt' => $now,
                    'updatedAt' => $now,
                ]);

                $this->db->commit();

                $ledgerEntries = [];
                if (is_array($debitEntry) && $debitEntryId !== null) {
                    $ledgerEntries[] = array_merge($debitEntry, ['id' => $debitEntryId]);
                }
                if (is_array($creditEntry) && $creditEntryId !== null) {
                    $ledgerEntries[] = array_merge($creditEntry, ['id' => $creditEntryId]);
                }

                $this->writeCasinoAuditLog('jurassic_run_round_settled', [
                    'requestId' => $requestId,
                    'roundId' => $roundId,
                    'userId' => $userId,
                    'username' => (string) ($lockedUser['username'] ?? ''),
                    'betId' => $betId,
                    'bet' => $bet,
                    'lineBet' => $lineBet,
                    'isFreeSpinRound' => $isFreeSpinRound,
                    'wager' => $totalWager,
                    'totalReturn' => $totalReturn,
                    'netResult' => $netResult,
                    'balanceBefore' => $balanceSnapshot['balanceBefore'],
                    'balanceAfter' => $balanceAfter,
                    'activePaylines' => self::JURASSIC_RUN_FIXED_PAYLINES,
                    'freeSpinsBefore' => (int) ($roundData['freeSpinsBefore'] ?? 0),
                    'freeSpinsAfter' => (int) ($roundData['freeSpinsAfter'] ?? 0),
                    'jackpotWon' => (bool) ($roundData['jackpotWon'] ?? false),
                    'jackpotPayout' => round($this->num($roundData['jackpotPayout'] ?? 0)),
                    'progressiveJackpotAfter' => round($this->num($progressiveStateAfter['jackpotPool'] ?? 0)),
                ]);
                Response::json($this->formatCasinoBetResponse($betRecord, $ledgerEntries, false));
            } catch (Throwable $txErr) {
                $this->db->rollback();
                throw $txErr;
            }
        } catch (InvalidArgumentException $e) {
            $this->writeCasinoAuditLog('jurassic_run_round_validation_error', [
                'requestId' => $requestId,
                'userId' => $userId,
                'error' => $e->getMessage(),
            ]);
            Response::json(['message' => $e->getMessage()], 400);
        } catch (Throwable $e) {
            $this->writeCasinoAuditLog('jurassic_run_round_server_error', [
                'requestId' => $requestId,
                'userId' => $userId,
                'error' => $e->getMessage(),
            ]);
            Response::json(['message' => 'Server error placing Jurassic Run bet'], 500);
        }
    }

    /**
     * @return array{
     *   freeSpinsRemaining:int,
     *   lockedBetId:?int,
     *   activePaylines:int,
     *   lastBetId:?int,
     *   lastBet:float,
     *   lastLineBet:float,
     *   totalRounds:int,
     *   paidRounds:int,
     *   freeSpinRounds:int,
     *   totalWagered:float,
     *   totalPaidOut:float,
     *   totalFreeSpinsAwarded:int,
     *   jackpotsWon:int,
     *   lastTotalWager:float,
     *   lastTotalReturn:float,
     *   lastNetResult:float,
     *   lastResultType:string,
     *   activeMultiplier:float,
     *   bonusRoundActive:bool
     * }
     */
    private function getUserJurassicRunState(array $user): array
    {
        $raw = is_array($user['casinoJurassicRunState'] ?? null) ? $user['casinoJurassicRunState'] : [];
        $freeSpinsRaw = $this->safeNumber($raw['freeSpinsRemaining'] ?? null, 0);
        $freeSpinsRemaining = max(0, min(self::JURASSIC_RUN_MAX_FREE_SPINS, (int) round($freeSpinsRaw ?? 0)));

        $lockedBetId = null;
        $lockedBetIdRaw = $this->safeNumber($raw['lockedBetId'] ?? null, null);
        if ($lockedBetIdRaw !== null) {
            $candidateBetId = (int) round($lockedBetIdRaw);
            if (
                abs($lockedBetIdRaw - $candidateBetId) <= 0.00001
                && $candidateBetId >= 0
                && $candidateBetId < count(self::JURASSIC_RUN_ALLOWED_BETS)
            ) {
                $lockedBetId = $candidateBetId;
            }
        }
        if ($freeSpinsRemaining <= 0) {
            $lockedBetId = null;
        }

        $lastBetId = null;
        $lastBetIdRaw = $this->safeNumber($raw['lastBetId'] ?? null, null);
        if ($lastBetIdRaw !== null) {
            $candidateBetId = (int) round($lastBetIdRaw);
            if (
                abs($lastBetIdRaw - $candidateBetId) <= 0.00001
                && $candidateBetId >= 0
                && $candidateBetId < count(self::JURASSIC_RUN_ALLOWED_BETS)
            ) {
                $lastBetId = $candidateBetId;
            }
        }

        return [
            'freeSpinsRemaining' => $freeSpinsRemaining,
            'lockedBetId' => $lockedBetId,
            'activePaylines' => self::JURASSIC_RUN_FIXED_PAYLINES,
            'lastBetId' => $lastBetId,
            'lastBet' => round(max(0, $this->num($raw['lastBet'] ?? 0))),
            'lastLineBet' => round(max(0, $this->num($raw['lastLineBet'] ?? 0))),
            'totalRounds' => max(0, (int) round($this->num($raw['totalRounds'] ?? 0))),
            'paidRounds' => max(0, (int) round($this->num($raw['paidRounds'] ?? 0))),
            'freeSpinRounds' => max(0, (int) round($this->num($raw['freeSpinRounds'] ?? 0))),
            'totalWagered' => round(max(0, $this->num($raw['totalWagered'] ?? 0))),
            'totalPaidOut' => round(max(0, $this->num($raw['totalPaidOut'] ?? 0))),
            'totalFreeSpinsAwarded' => max(0, (int) round($this->num($raw['totalFreeSpinsAwarded'] ?? 0))),
            'jackpotsWon' => max(0, (int) round($this->num($raw['jackpotsWon'] ?? 0))),
            'lastTotalWager' => round(max(0, $this->num($raw['lastTotalWager'] ?? 0))),
            'lastTotalReturn' => round(max(0, $this->num($raw['lastTotalReturn'] ?? 0))),
            'lastNetResult' => round($this->num($raw['lastNetResult'] ?? 0)),
            'lastResultType' => trim((string) ($raw['lastResultType'] ?? '')),
            'activeMultiplier' => 1.0,
            'bonusRoundActive' => $freeSpinsRemaining > 0,
        ];
    }

    /**
     * @return array{
     *   jackpotPool:float,
     *   totalRounds:int,
     *   paidRounds:int,
     *   freeSpinRounds:int,
     *   totalWagered:float,
     *   totalPaidOut:float,
     *   totalFreeSpinsAwarded:int,
     *   totalJackpotsHit:int
     * }
     */
    private function getJurassicRunProgressiveState(): array
    {
        $doc = $this->db->findOne('casino_game_state', ['id' => self::JURASSIC_RUN_GAME_SLUG]);
        return $this->normalizeJurassicRunProgressiveState($doc);
    }

    /**
     * @return array{
     *   jackpotPool:float,
     *   totalRounds:int,
     *   paidRounds:int,
     *   freeSpinRounds:int,
     *   totalWagered:float,
     *   totalPaidOut:float,
     *   totalFreeSpinsAwarded:int,
     *   totalJackpotsHit:int
     * }
     */
    private function loadJurassicRunProgressiveStateForUpdate(): array
    {
        $doc = $this->db->findOneForUpdate('casino_game_state', ['id' => self::JURASSIC_RUN_GAME_SLUG]);
        if ($doc === null) {
            $now = SqlRepository::nowUtc();
            $this->db->insertOne('casino_game_state', [
                'id' => self::JURASSIC_RUN_GAME_SLUG,
                'game' => self::JURASSIC_RUN_GAME_SLUG,
                'jackpotPool' => self::JURASSIC_RUN_DEFAULT_JACKPOT,
                'totalRounds' => 0,
                'paidRounds' => 0,
                'freeSpinRounds' => 0,
                'totalWagered' => 0,
                'totalPaidOut' => 0,
                'totalFreeSpinsAwarded' => 0,
                'totalJackpotsHit' => 0,
                'createdAt' => $now,
                'updatedAt' => $now,
            ]);
            $doc = $this->db->findOneForUpdate('casino_game_state', ['id' => self::JURASSIC_RUN_GAME_SLUG]);
        }

        return $this->normalizeJurassicRunProgressiveState($doc);
    }

    /**
     * @param ?array<string, mixed> $doc
     * @return array{
     *   jackpotPool:float,
     *   totalRounds:int,
     *   paidRounds:int,
     *   freeSpinRounds:int,
     *   totalWagered:float,
     *   totalPaidOut:float,
     *   totalFreeSpinsAwarded:int,
     *   totalJackpotsHit:int
     * }
     */
    private function normalizeJurassicRunProgressiveState(?array $doc): array
    {
        $raw = is_array($doc) ? $doc : [];

        return [
            'jackpotPool' => round(max(0, $this->num($raw['jackpotPool'] ?? self::JURASSIC_RUN_DEFAULT_JACKPOT))),
            'totalRounds' => max(0, (int) round($this->num($raw['totalRounds'] ?? 0))),
            'paidRounds' => max(0, (int) round($this->num($raw['paidRounds'] ?? 0))),
            'freeSpinRounds' => max(0, (int) round($this->num($raw['freeSpinRounds'] ?? 0))),
            'totalWagered' => round(max(0, $this->num($raw['totalWagered'] ?? 0))),
            'totalPaidOut' => round(max(0, $this->num($raw['totalPaidOut'] ?? 0))),
            'totalFreeSpinsAwarded' => max(0, (int) round($this->num($raw['totalFreeSpinsAwarded'] ?? 0))),
            'totalJackpotsHit' => max(0, (int) round($this->num($raw['totalJackpotsHit'] ?? 0))),
        ];
    }

    /**
     * @param array<string, mixed> $stateBefore
     * @param array<string, mixed> $stateAfter
     * @return array<string, mixed>
     */
    private function buildJurassicRunUserStateAfter(
        array $stateBefore,
        array $stateAfter,
        int $betId,
        float $bet,
        float $totalWager,
        float $totalReturn,
        string $resultType,
        bool $jackpotWon,
        int $freeSpinsAwarded
    ): array {
        $nextState = $stateAfter;
        $nextState['activePaylines'] = self::JURASSIC_RUN_FIXED_PAYLINES;
        $nextState['lastBetId'] = $betId;
        $nextState['lastBet'] = round($bet);
        $nextState['lastLineBet'] = round($bet / self::JURASSIC_RUN_FIXED_PAYLINES);
        $nextState['totalRounds'] = max(0, (int) ($stateBefore['totalRounds'] ?? 0)) + 1;
        $nextState['paidRounds'] = max(0, (int) ($stateBefore['paidRounds'] ?? 0)) + ($totalWager > 0 ? 1 : 0);
        $nextState['freeSpinRounds'] = max(0, (int) ($stateBefore['freeSpinRounds'] ?? 0)) + ($totalWager <= 0 ? 1 : 0);
        $nextState['totalWagered'] = round($this->num($stateBefore['totalWagered'] ?? 0) + $totalWager);
        $nextState['totalPaidOut'] = round($this->num($stateBefore['totalPaidOut'] ?? 0) + $totalReturn);
        $nextState['totalFreeSpinsAwarded'] = max(0, (int) ($stateBefore['totalFreeSpinsAwarded'] ?? 0)) + max(0, $freeSpinsAwarded);
        $nextState['jackpotsWon'] = max(0, (int) ($stateBefore['jackpotsWon'] ?? 0)) + ($jackpotWon ? 1 : 0);
        $nextState['lastTotalWager'] = round($totalWager);
        $nextState['lastTotalReturn'] = round($totalReturn);
        $nextState['lastNetResult'] = round($totalReturn - $totalWager);
        $nextState['lastResultType'] = $resultType;
        $nextState['activeMultiplier'] = 1;
        $nextState['bonusRoundActive'] = ((int) ($nextState['freeSpinsRemaining'] ?? 0)) > 0;

        return $nextState;
    }

    private function parseJurassicRunBetId(mixed $value): int
    {
        if ($value === null || $value === '') {
            return self::JURASSIC_RUN_DEFAULT_BET_ID;
        }
        if (!is_numeric($value)) {
            throw new InvalidArgumentException('bets.betId must be numeric');
        }

        $raw = (float) $value;
        $betId = (int) round($raw);
        if (abs($raw - $betId) > 0.00001) {
            throw new InvalidArgumentException('bets.betId must be an integer');
        }
        if ($betId < 0 || $betId >= count(self::JURASSIC_RUN_ALLOWED_BETS)) {
            throw new InvalidArgumentException('bets.betId is out of range');
        }

        return $betId;
    }

    /**
     * @return array{
     *   accountMinBet:?float,
     *   accountMaxBet:?float,
     *   gameMinBet:float,
     *   gameMaxBet:float,
     *   effectiveMinBet:float,
     *   effectiveMaxBet:float,
     *   paylines:int,
     *   allowedBetIds: array<int, int>,
     *   allowedBets: array<int, float>
     * }
     */
    private function buildJurassicRunBetLimits(array $lockedUser, float $gameMinBet, float $gameMaxBet): array
    {
        // Account-level minBet/maxBet is for sportsbook — casino games use only
        // the game-level limits configured in the casinogames collection.
        $accountMinBet = null;
        $accountMaxBet = null;

        $effectiveMinBet = $gameMinBet;
        $effectiveMaxBet = $gameMaxBet;
        if ($effectiveMaxBet < $effectiveMinBet) {
            $effectiveMaxBet = $effectiveMinBet;
        }

        $allowedBetIds = $this->jurassicRunAllowedBetIdsForRange($effectiveMinBet, $effectiveMaxBet);
        $allowedBets = [];
        foreach ($allowedBetIds as $allowedBetId) {
            $allowedBets[] = $this->jurassicRunBetAmountForId($allowedBetId);
        }

        return [
            'accountMinBet' => $accountMinBet,
            'accountMaxBet' => $accountMaxBet,
            'gameMinBet' => round($gameMinBet),
            'gameMaxBet' => round($gameMaxBet),
            'effectiveMinBet' => round($effectiveMinBet),
            'effectiveMaxBet' => round($effectiveMaxBet),
            'paylines' => self::JURASSIC_RUN_FIXED_PAYLINES,
            'allowedBetIds' => $allowedBetIds,
            'allowedBets' => $allowedBets,
        ];
    }

    /**
     * @param array{
     *   freeSpinsRemaining:int,
     *   lockedBetId:?int
     * } $stateBefore
     * @param array{
     *   jackpotPool:float,
     *   totalRounds:int,
     *   paidRounds:int,
     *   freeSpinRounds:int,
     *   totalWagered:float,
     *   totalPaidOut:float,
     *   totalFreeSpinsAwarded:int,
     *   totalJackpotsHit:int
     * } $progressiveStateBefore
     * @return array{
     *   totalReturn: float,
     *   result: string,
     *   resultType: string,
     *   roundData: array<string, mixed>,
     *   stateAfter: array<string, mixed>,
     *   progressiveStateAfter: array<string, mixed>
     * }
     */
    private function settleJurassicRunSpin(float $bet, int $betId, array $stateBefore, array $progressiveStateBefore): array
    {
        $freeSpinsBefore = max(0, (int) ($stateBefore['freeSpinsRemaining'] ?? 0));
        $isFreeSpinRound = $freeSpinsBefore > 0;
        $freeSpinsAfter = $isFreeSpinRound ? ($freeSpinsBefore - 1) : $freeSpinsBefore;

        $jackpotStartingPool = round(max(0, $this->num($progressiveStateBefore['jackpotPool'] ?? self::JURASSIC_RUN_DEFAULT_JACKPOT)));
        $jackpotContribution = $isFreeSpinRound ? 0.0 : round(($bet * self::JURASSIC_RUN_JACKPOT_FEE_PERCENT) / 100);
        $jackpotBefore = round($jackpotStartingPool + $jackpotContribution);

        $symbols = $this->generateJurassicRunSymbols();
        $winningData = $this->calculateJurassicRunWinningData($symbols, $bet);
        $slotWin = round($this->num($winningData['winnings'] ?? 0));
        $freeSpinsWon = max(0, (int) ($winningData['freeSpinsWon'] ?? 0));
        $jackpotWon = !empty($winningData['jackpotWon']);
        $jackpotPayout = $jackpotWon ? $jackpotBefore : 0.0;
        $jackpotAfter = $jackpotWon ? 0.0 : $jackpotBefore;
        $freeSpinsAfter = max(0, min(self::JURASSIC_RUN_MAX_FREE_SPINS, $freeSpinsAfter + $freeSpinsWon));
        $totalReturn = round($slotWin + $jackpotPayout);

        $result = $jackpotWon
            ? 'Jackpot'
            : ($totalReturn > 0 ? 'Win' : ($isFreeSpinRound ? 'Free Spin' : 'Lose'));
        $resultType = $jackpotWon
            ? 'jackpot'
            : ($slotWin > 0
                ? 'spin_win'
                : ($freeSpinsWon > 0
                    ? 'freespin_award'
                    : ($isFreeSpinRound ? 'freespin_no_win' : 'spin_loss')));

        $roundData = [
            'betId' => $betId,
            'bet' => $bet,
            'totalBet' => $bet,
            'activePaylines' => self::JURASSIC_RUN_FIXED_PAYLINES,
            'lineBet' => round($bet / self::JURASSIC_RUN_FIXED_PAYLINES),
            'isFreeSpinRound' => $isFreeSpinRound,
            'freeSpinsBefore' => $freeSpinsBefore,
            'freeSpinsWon' => $freeSpinsWon,
            'freeSpinsAwarded' => $freeSpinsWon,
            'freeSpinsAfter' => $freeSpinsAfter,
            'jackpotContribution' => $jackpotContribution,
            'jackpotBefore' => $jackpotBefore,
            'jackpotAfter' => $jackpotAfter,
            'jackpotWon' => $jackpotWon ? 1 : 0,
            'jackpotPayout' => $jackpotPayout,
            'slotWin' => $slotWin,
            'lineWin' => $slotWin,
            'totalWin' => $totalReturn,
            'paytableMultiplierScale' => self::JURASSIC_RUN_PAYOUT_SCALE,
            'symbols' => $symbols,
            'winningLines' => is_array($winningData['winningLines'] ?? null) ? $winningData['winningLines'] : [],
            'win_lines' => is_array($winningData['winningLines'] ?? null) ? $winningData['winningLines'] : [],
            'stateBefore' => json_encode([
                'freeSpinsRemaining' => $freeSpinsBefore,
                'lockedBetId' => $stateBefore['lockedBetId'] ?? null,
                'jackpotPool' => $jackpotStartingPool,
            ], JSON_UNESCAPED_SLASHES) ?: '',
            'stateAfter' => json_encode([
                'freeSpinsRemaining' => $freeSpinsAfter,
                'lockedBetId' => $freeSpinsAfter > 0 ? $betId : null,
                'jackpotPool' => $jackpotAfter,
            ], JSON_UNESCAPED_SLASHES) ?: '',
        ];

        $stateAfter = [
            'freeSpinsRemaining' => $freeSpinsAfter,
            'lockedBetId' => $freeSpinsAfter > 0 ? $betId : null,
        ];

        $progressiveStateAfter = [
            'jackpotPool' => $jackpotAfter,
            'totalRounds' => max(0, (int) ($progressiveStateBefore['totalRounds'] ?? 0)) + 1,
            'paidRounds' => max(0, (int) ($progressiveStateBefore['paidRounds'] ?? 0)) + ($isFreeSpinRound ? 0 : 1),
            'freeSpinRounds' => max(0, (int) ($progressiveStateBefore['freeSpinRounds'] ?? 0)) + ($isFreeSpinRound ? 1 : 0),
            'totalWagered' => round($this->num($progressiveStateBefore['totalWagered'] ?? 0) + ($isFreeSpinRound ? 0 : $bet)),
            'totalPaidOut' => round($this->num($progressiveStateBefore['totalPaidOut'] ?? 0) + $totalReturn),
            'totalFreeSpinsAwarded' => max(0, (int) ($progressiveStateBefore['totalFreeSpinsAwarded'] ?? 0)) + $freeSpinsWon,
            'totalJackpotsHit' => max(0, (int) ($progressiveStateBefore['totalJackpotsHit'] ?? 0)) + ($jackpotWon ? 1 : 0),
        ];

        return [
            'totalReturn' => $totalReturn,
            'result' => $result,
            'resultType' => $resultType,
            'roundData' => $roundData,
            'stateAfter' => $stateAfter,
            'progressiveStateAfter' => $progressiveStateAfter,
        ];
    }

    /**
     * @return array<int, array<int, string>>
     */
    private function generateJurassicRunSymbols(): array
    {
        $result = [];
        for ($col = 0; $col < 5; $col++) {
            $column = [];
            for ($row = 0; $row < 3; $row++) {
                do {
                    $randomSymbol = $this->pickJurassicRunWeightedSymbol();
                } while (
                    $row === 2
                    && count(array_filter($column, static fn(string $symbol): bool => $symbol === 'Wild' || $symbol === 'FreeSpin')) === 2
                    && ($randomSymbol === 'Wild' || $randomSymbol === 'FreeSpin')
                );
                $column[] = $randomSymbol;
            }
            $result[] = $column;
        }
        return $result;
    }

    private function pickJurassicRunWeightedSymbol(): string
    {
        $totalWeight = array_sum(self::JURASSIC_RUN_SYMBOL_WEIGHTS);
        if ($totalWeight <= 0) {
            return self::JURASSIC_RUN_SYMBOLS[0];
        }

        $roll = random_int(1, $totalWeight);
        $cursor = 0;
        foreach (self::JURASSIC_RUN_SYMBOL_WEIGHTS as $idx => $weight) {
            $cursor += max(0, (int) $weight);
            if ($roll <= $cursor) {
                return (string) (self::JURASSIC_RUN_SYMBOLS[$idx] ?? self::JURASSIC_RUN_SYMBOLS[0]);
            }
        }

        return self::JURASSIC_RUN_SYMBOLS[0];
    }

    /**
     * @param array<int, array<int, string>> $result
     * @return array{winnings:float,winningLines:array<int, array<string, mixed>>,freeSpinsWon:int,jackpotWon:int}
     */
    private function calculateJurassicRunWinningData(array $result, float $bet): array
    {
        $winnings = 0.0;
        $winningLines = [];
        $freeSpinsWon = 0;
        $jackpotWon = 0;

        foreach (self::JURASSIC_RUN_LINE_PATTERNS as $lineIndex => $winline) {
            $symbols = [];
            for ($col = 0; $col < 5; $col++) {
                $row = (int) ($winline[$col] ?? 0);
                $symbols[] = (string) ($result[$col][$row] ?? '');
            }

            $allWilds = true;
            foreach ($symbols as $symbol) {
                if ($symbol !== 'Wild') {
                    $allWilds = false;
                    break;
                }
            }
            if ($allWilds) {
                continue;
            }

            $baseSymbol = null;
            foreach ($symbols as $symbol) {
                if (!in_array($symbol, ['Wild', 'FreeSpin', 'JP'], true)) {
                    $baseSymbol = $symbol;
                    break;
                }
            }

            $wildUsed = false;
            $evaluated = [];
            foreach ($symbols as $symbol) {
                $evaluated[] = ($symbol === 'Wild') ? $baseSymbol : $symbol;
                if ($symbol === 'Wild') {
                    $wildUsed = true;
                }
            }

            $firstSymbol = $evaluated[0] ?? null;
            if (!is_string($firstSymbol) || $firstSymbol === '') {
                continue;
            }

            $count = 1;
            for ($idx = 1; $idx < 5; $idx++) {
                if (($evaluated[$idx] ?? null) === $firstSymbol) {
                    $count++;
                } else {
                    break;
                }
            }

            if ($count < 3) {
                continue;
            }

            if ($firstSymbol === 'JP') {
                if ($count === 5) {
                    $jackpotWon = 1;
                    $winningLines[] = [
                        'line' => $lineIndex,
                        'symbol' => $firstSymbol,
                        'count' => $count,
                        'wild_used' => 0,
                    ];
                }
                continue;
            }

            if ($firstSymbol === 'FreeSpin') {
                $freeSpinAward = (int) (self::JURASSIC_RUN_FREE_SPIN_AWARDS[$count] ?? 0);
                $freeSpinsWon += $freeSpinAward;
                $winningLines[] = [
                    'line' => $lineIndex,
                    'symbol' => $firstSymbol,
                    'count' => $count,
                    'win' => $freeSpinAward,
                    'wild_used' => 0,
                ];
                continue;
            }

            $symbolMultipliers = self::JURASSIC_RUN_PAYOUT_MULTIPLIERS[$firstSymbol] ?? null;
            if (!is_array($symbolMultipliers)) {
                continue;
            }

            $win = round(($this->jurassicRunScaledPayoutMultiplier($firstSymbol, $count) ?? 0) * $bet);
            if ($win <= 0) {
                continue;
            }

            $winnings += $win;
            $winningLines[] = [
                'line' => $lineIndex,
                'symbol' => $firstSymbol,
                'count' => $count,
                'win' => $win,
                'wild_used' => $wildUsed ? 1 : 0,
            ];
        }

        return [
            'winnings' => round($winnings),
            'winningLines' => $winningLines,
            'freeSpinsWon' => $freeSpinsWon,
            'jackpotWon' => $jackpotWon,
        ];
    }

    private function jurassicRunScaledPayoutMultiplier(string $symbol, int $count): float
    {
        $baseMultipliers = self::JURASSIC_RUN_PAYOUT_MULTIPLIERS[$symbol] ?? null;
        if (!is_array($baseMultipliers)) {
            return 0.0;
        }

        return $this->num($baseMultipliers[$count] ?? 0) * self::JURASSIC_RUN_PAYOUT_SCALE;
    }

    /**
     * @return array<string, mixed>
     */
    private static function jurassicRunPublicMetadata(): array
    {
        return [
            'paylines' => self::JURASSIC_RUN_FIXED_PAYLINES,
            'reels' => 5,
            'rows' => 3,
            'rtp' => self::JURASSIC_RUN_DISCLOSED_RTP,
            'volatility' => self::JURASSIC_RUN_VOLATILITY,
            'jackpotType' => 'progressive',
            'jackpotContributionPercent' => self::JURASSIC_RUN_JACKPOT_FEE_PERCENT,
            'freeSpinAwards' => self::JURASSIC_RUN_FREE_SPIN_AWARDS,
            'outcomeSource' => 'server_rng',
            'rngVersion' => self::JURASSIC_RUN_RNG_VERSION,
            'payoutScale' => self::JURASSIC_RUN_PAYOUT_SCALE,
            'spinIndependence' => true,
            'features' => ['wild', 'free_spins', 'progressive_jackpot'],
        ];
    }

    private function jurassicRunBetAmountForId(int $betId): float
    {
        if (!array_key_exists($betId, self::JURASSIC_RUN_ALLOWED_BETS)) {
            throw new InvalidArgumentException('Invalid Jurassic Run bet id');
        }
        return round($this->num(self::JURASSIC_RUN_ALLOWED_BETS[$betId]));
    }

    /**
     * @return array<int, int>
     */
    private function jurassicRunAllowedBetIdsForRange(float $effectiveMinBet, float $effectiveMaxBet): array
    {
        $allowedBetIds = [];
        foreach (self::JURASSIC_RUN_ALLOWED_BETS as $betId => $bet) {
            $normalizedBet = round($this->num($bet));
            if ($normalizedBet < $effectiveMinBet || $normalizedBet > $effectiveMaxBet) {
                continue;
            }
            $allowedBetIds[] = $betId;
        }

        if ($allowedBetIds !== []) {
            return array_values(array_map('intval', $allowedBetIds));
        }

        $nearestBetId = self::JURASSIC_RUN_DEFAULT_BET_ID;
        $nearestDistance = PHP_FLOAT_MAX;
        foreach (self::JURASSIC_RUN_ALLOWED_BETS as $betId => $bet) {
            $normalizedBet = round($this->num($bet));
            $distance = 0.0;
            if ($normalizedBet < $effectiveMinBet) {
                $distance = $effectiveMinBet - $normalizedBet;
            } elseif ($normalizedBet > $effectiveMaxBet) {
                $distance = $normalizedBet - $effectiveMaxBet;
            }
            if ($distance < $nearestDistance) {
                $nearestBetId = (int) $betId;
                $nearestDistance = $distance;
            }
        }

        return [$nearestBetId];
    }

    private function resolveJurassicRunBetId(int $requestedBetId, array $betLimits): int
    {
        $allowedBetIds = array_values(array_map('intval', is_array($betLimits['allowedBetIds'] ?? null) ? $betLimits['allowedBetIds'] : []));
        if ($allowedBetIds === []) {
            return self::JURASSIC_RUN_DEFAULT_BET_ID;
        }
        if (in_array($requestedBetId, $allowedBetIds, true)) {
            return $requestedBetId;
        }

        $nearestBetId = $allowedBetIds[0];
        $nearestDistance = abs($nearestBetId - $requestedBetId);
        foreach ($allowedBetIds as $candidateBetId) {
            $distance = abs($candidateBetId - $requestedBetId);
            if ($distance < $nearestDistance) {
                $nearestBetId = $candidateBetId;
                $nearestDistance = $distance;
            }
        }

        return $nearestBetId;
    }

    private function syncCrapsState(array $actor, array $body, string $requestId, string $mode): void
    {
        $userId = (string) ($actor['id'] ?? '');

        try {
            $this->db->beginTransaction();
            try {
                $lockedUser = $this->loadLockedCasinoUser($userId);
                $stateSnapshot = $this->getUserCrapsState($lockedUser);
                $activeBetsBefore = $stateSnapshot['activeBets'];

                if ($mode === 'snapshot') {
                    $this->db->commit();
                    $availableBalance = round(max(0, $this->num($lockedUser['balance'] ?? 0) - $this->num($lockedUser['pendingBalance'] ?? 0)));
                    $this->writeCasinoAuditLog('craps_state_snapshot', [
                        'requestId' => $requestId,
                        'mode' => $mode,
                        'userId' => $userId,
                        'username' => (string) ($lockedUser['username'] ?? ''),
                        'phase' => $stateSnapshot['phase'],
                        'pointNumber' => $stateSnapshot['pointNumber'],
                        'activeBets' => $activeBetsBefore,
                        'availableBalance' => $availableBalance,
                    ]);

                    Response::json([
                        'requestId' => $requestId,
                        'game' => self::CRAPS_GAME_SLUG,
                        'mode' => $mode,
                        'roundStatus' => 'snapshot',
                        'totalWager' => 0.0,
                        'totalReturn' => 0.0,
                        'netResult' => 0.0,
                        'balanceBefore' => $this->num($lockedUser['balance'] ?? 0),
                        'balanceAfter' => $this->num($lockedUser['balance'] ?? 0),
                        'availableBalanceBefore' => $availableBalance,
                        'availableBalanceAfter' => $availableBalance,
                        'availableBalance' => $availableBalance,
                        'walletBalance' => $availableBalance,
                        'playableBalance' => $availableBalance,
                        'newBalance' => $availableBalance,
                        'balanceSource' => 'availableBalance',
                        'roundData' => [
                            'stateBefore' => $stateSnapshot['phase'],
                            'stateAfter' => $stateSnapshot['phase'],
                            'pointNumberBefore' => $stateSnapshot['pointNumber'],
                            'pointNumberAfter' => $stateSnapshot['pointNumber'],
                            'activeBetsBefore' => $activeBetsBefore,
                            'activeBetsAfter' => $activeBetsBefore,
                        ],
                    ]);
                    return;
                }

                $nextBets = $this->normalizeCrapsBets($body['bets'] ?? null);
                $nextPhase = $stateSnapshot['phase'];
                $nextPoint = $stateSnapshot['pointNumber'];
                if ($stateSnapshot['phase'] === 'come_point') {
                    $this->assertCrapsComePointLockedBets($activeBetsBefore, $nextBets);
                }
                $nextExposure = $this->sumCrapsBets($nextBets);
                [$gameMinBet, $gameMaxBet] = $this->resolveGameBetLimits(self::CRAPS_GAME_SLUG, 1.0, 10000.0);
                if ($nextExposure > 0 && $nextExposure < $gameMinBet) {
                    $this->db->rollback();
                    Response::json(['message' => 'Minimum craps wager is $' . round($gameMinBet)], 400);
                    return;
                }
                if ($nextExposure > $gameMaxBet) {
                    $this->db->rollback();
                    Response::json(['message' => 'Maximum craps wager is $' . round($gameMaxBet)], 400);
                    return;
                }

                $addedStake = 0.0;
                $releasedStake = 0.0;
                $allBetKeys = array_unique(array_merge(array_keys($activeBetsBefore), array_keys($nextBets)));
                foreach ($allBetKeys as $betKey) {
                    $prev = $activeBetsBefore[$betKey] ?? 0.0;
                    $curr = $nextBets[$betKey] ?? 0.0;
                    if ($curr > $prev) {
                        $addedStake += ($curr - $prev);
                    } elseif ($prev > $curr) {
                        $releasedStake += ($prev - $curr);
                    }
                }
                $addedStake = round($addedStake);
                $releasedStake = round($releasedStake);

                if ($addedStake > 0) {
                    $this->assertUserWagerWithinLimits($lockedUser, $addedStake);
                    $this->assertCasinoLossLimits($lockedUser, $addedStake);
                }

                $balanceSnapshot = $this->getUserBalanceSnapshot($lockedUser);
                if ($addedStake > $balanceSnapshot['availableBalance']) {
                    $this->db->rollback();
                    Response::json(['message' => 'Insufficient balance. Available: $' . round($balanceSnapshot['availableBalance'])], 400);
                    return;
                }

                $totalWager = $addedStake;
                $totalReturn = $releasedStake;
                $balanceAfterDebit = round($balanceSnapshot['balanceBefore'] - $totalWager);
                $balanceAfter = round($balanceAfterDebit + $totalReturn);
                $availableBalanceAfter = round(max(0, $balanceAfter - $balanceSnapshot['pendingBalance']));

                $now = SqlRepository::nowUtc();
                $roundId = $this->newRoundId();
                $ipAddress = IpUtils::clientIp();
                $userAgent = Http::header('user-agent') !== '' ? Http::header('user-agent') : null;

                $debitEntryId = null;
                if ($totalWager > 0) {
                    $debitEntry = $this->buildCasinoTransactionEntry(
                        $userId,
                        $totalWager,
                        $roundId,
                        self::CRAPS_SOURCE_TYPE,
                        'DEBIT',
                        'casino_bet_debit',
                        $balanceSnapshot['balanceBefore'],
                        $balanceAfterDebit,
                        'CASINO_CRAPS_SYNC_WAGER',
                        'Craps table sync wager charge',
                        $now,
                        $ipAddress,
                        $userAgent
                    );
                    $debitEntryId = $this->db->insertOne('transactions', $debitEntry);
                }

                $creditEntryId = null;
                if ($totalReturn > 0) {
                    $creditEntry = $this->buildCasinoTransactionEntry(
                        $userId,
                        $totalReturn,
                        $roundId,
                        self::CRAPS_SOURCE_TYPE,
                        'CREDIT',
                        'casino_bet_credit',
                        $balanceAfterDebit,
                        $balanceAfter,
                        'CASINO_CRAPS_SYNC_REFUND',
                        'Craps table sync refund',
                        $now,
                        $ipAddress,
                        $userAgent
                    );
                    $creditEntryId = $this->db->insertOne('transactions', $creditEntry);
                }

                $this->db->updateOne('users', ['id' => SqlRepository::id($userId)], [
                    'balance' => $balanceAfter,
                    'casinoCrapsState' => [
                        'phase' => $nextPhase,
                        'pointNumber' => $nextPoint,
                        'activeBets' => $nextBets,
                        'updatedAt' => $now,
                    ],
                    'updatedAt' => $now,
                ]);

                $this->db->commit();

                $this->writeCasinoAuditLog('craps_state_sync', [
                    'requestId' => $requestId,
                    'mode' => $mode,
                    'userId' => $userId,
                    'username' => (string) ($lockedUser['username'] ?? ''),
                    'addedStake' => $totalWager,
                    'releasedStake' => $totalReturn,
                    'balanceBefore' => $balanceSnapshot['balanceBefore'],
                    'balanceAfter' => $balanceAfter,
                    'phaseBefore' => $stateSnapshot['phase'],
                    'phaseAfter' => $nextPhase,
                    'pointBefore' => $stateSnapshot['pointNumber'],
                    'pointAfter' => $nextPoint,
                    'activeBetsBefore' => $activeBetsBefore,
                    'activeBetsAfter' => $nextBets,
                    'debitEntryId' => $debitEntryId,
                    'creditEntryId' => $creditEntryId,
                ]);

                Response::json([
                    'requestId' => $requestId,
                    'game' => self::CRAPS_GAME_SLUG,
                    'mode' => $mode,
                    'roundStatus' => 'synced',
                    'totalWager' => $totalWager,
                    'totalReturn' => $totalReturn,
                    'netResult' => round($totalReturn - $totalWager),
                    'balanceBefore' => $balanceSnapshot['balanceBefore'],
                    'balanceAfter' => $balanceAfter,
                    'availableBalanceBefore' => $balanceSnapshot['availableBalance'],
                    'availableBalanceAfter' => $availableBalanceAfter,
                    'availableBalance' => $availableBalanceAfter,
                    'walletBalance' => $availableBalanceAfter,
                    'playableBalance' => $availableBalanceAfter,
                    'newBalance' => $availableBalanceAfter,
                    'balanceSource' => 'availableBalance',
                    'roundData' => [
                        'stateBefore' => $stateSnapshot['phase'],
                        'stateAfter' => $nextPhase,
                        'pointNumberBefore' => $stateSnapshot['pointNumber'],
                        'pointNumberAfter' => $nextPoint,
                        'activeBetsBefore' => $activeBetsBefore,
                        'activeBetsAfter' => $nextBets,
                    ],
                ]);
            } catch (Throwable $txErr) {
                $this->db->rollback();
                throw $txErr;
            }
        } catch (InvalidArgumentException $e) {
            $this->writeCasinoAuditLog('craps_state_sync_validation_error', [
                'requestId' => $requestId,
                'mode' => $mode,
                'userId' => $userId,
                'error' => $e->getMessage(),
            ]);
            Response::json(['message' => $e->getMessage()], 400);
        } catch (Throwable $e) {
            $this->writeCasinoAuditLog('craps_state_sync_server_error', [
                'requestId' => $requestId,
                'mode' => $mode,
                'userId' => $userId,
                'error' => $e->getMessage(),
            ]);
            Response::json(['message' => 'Server error syncing craps state'], 500);
        }
    }

    /**
     * @return array{phase: string, pointNumber: ?int, activeBets: array<string, float>}
     */
    private function getUserCrapsState(array $user): array
    {
        $raw = is_array($user['casinoCrapsState'] ?? null) ? $user['casinoCrapsState'] : [];
        $phase = $this->normalizeCrapsPhase((string) ($raw['phase'] ?? 'waiting'));
        $pointNumber = $this->normalizeCrapsPointNumber($raw['pointNumber'] ?? null);
        $activeBets = $this->normalizeCrapsBets($raw['activeBets'] ?? []);

        if ($phase !== 'come_point') {
            $pointNumber = null;
        }

        return [
            'phase' => $phase,
            'pointNumber' => $pointNumber,
            'activeBets' => $activeBets,
        ];
    }

    private function normalizeCrapsPhase(string $raw): string
    {
        $phase = strtolower(trim($raw));
        if ($phase === 'come_out' || $phase === 'come-point') {
            return 'come_out';
        }
        if ($phase === 'come_point' || $phase === 'point') {
            return 'come_point';
        }
        return 'waiting';
    }

    private function normalizeCrapsPointNumber(mixed $raw): ?int
    {
        if (!is_numeric($raw)) {
            return null;
        }
        $value = (int) $raw;
        if (!in_array($value, [4, 5, 6, 8, 9, 10], true)) {
            return null;
        }
        return $value;
    }

    /**
     * @return array<string, float>
     */
    private function normalizeCrapsBets(mixed $rawBets): array
    {
        if ($rawBets === null) {
            return [];
        }
        if (!is_array($rawBets)) {
            throw new InvalidArgumentException('bets must be an object');
        }

        $bets = [];
        foreach ($rawBets as $rawKey => $rawAmount) {
            if (!is_string($rawKey)) {
                continue;
            }

            $betKey = $this->normalizeCrapsBetKey($rawKey);
            if ($betKey === '') {
                throw new InvalidArgumentException('Unsupported craps bet: ' . $rawKey);
            }

            $amount = $this->parseMoneyValue($rawAmount, 'bets.' . $rawKey);
            if ($amount <= 0) {
                continue;
            }
            if (abs($amount - round($amount, 0)) > 0.00001) {
                throw new InvalidArgumentException('Craps bets must be whole-dollar amounts');
            }

            $bets[$betKey] = round(($bets[$betKey] ?? 0.0) + $amount);
        }

        ksort($bets);
        return $bets;
    }

    private function normalizeCrapsBetKey(string $raw): string
    {
        $key = strtolower(trim($raw));
        if ($key === '') {
            return '';
        }

        if (str_starts_with($key, 'any11_')) {
            return 'any11_7';
        }
        if (str_starts_with($key, 'any_craps_')) {
            return 'any_craps_7';
        }

        static $allowed = null;
        if (!is_array($allowed)) {
            $allowed = $this->crapsAllowedBetKeys();
        }

        return in_array($key, $allowed, true) ? $key : '';
    }

    /**
     * @return array<int, string>
     */
    private function crapsAllowedBetKeys(): array
    {
        return [
            'pass_line',
            'dont_pass1',
            'dont_pass2',
            'dont_come',
            'come',
            'field',
            'big_6',
            'big_8',
            'lay_bet4',
            'lay_bet5',
            'lay_bet6',
            'lay_bet8',
            'lay_bet9',
            'lay_bet10',
            'lose_bet4',
            'lose_bet5',
            'lose_bet6',
            'lose_bet8',
            'lose_bet9',
            'lose_bet10',
            'number4',
            'number5',
            'number6',
            'number8',
            'number9',
            'number10',
            'win_bet4',
            'win_bet5',
            'win_bet6',
            'win_bet8',
            'win_bet9',
            'win_bet10',
            'any11_7',
            'any_craps_7',
            'seven_bet',
            'hardway6',
            'hardway10',
            'hardway8',
            'hardway4',
            'horn3',
            'horn2',
            'horn12',
        ];
    }

    private function sumCrapsBets(array $bets): float
    {
        $total = 0.0;
        foreach ($bets as $amount) {
            $total += $this->num($amount);
        }
        return round($total);
    }

    /**
     * During come-point, pass-line and don't-pass base stakes are locked and cannot be reduced.
     *
     * @param array<string, float> $activeBefore
     * @param array<string, float> $nextBets
     */
    private function assertCrapsComePointLockedBets(array $activeBefore, array $nextBets): void
    {
        foreach (['pass_line', 'dont_pass1', 'dont_pass2'] as $lockedBet) {
            $previous = round(max(0, $this->num($activeBefore[$lockedBet] ?? 0)));
            if ($previous <= 0) {
                continue;
            }

            $next = round(max(0, $this->num($nextBets[$lockedBet] ?? 0)));
            if ($next + 0.0001 < $previous) {
                throw new InvalidArgumentException(str_replace('_', ' ', $lockedBet) . ' cannot be reduced while point is active');
            }
        }
    }

    private function crapsBetMultiplier(string $bet): float
    {
        static $multipliers = [
            'pass_line' => 1.0,
            'dont_pass1' => 1.0,
            'dont_pass2' => 1.0,
            'dont_come' => 1.0,
            'come' => 1.0,
            'field' => 1.0,
            'big_6' => 1.0,
            'big_8' => 1.0,
            'lay_bet4' => 0.5,
            'lay_bet5' => 0.66,
            'lay_bet6' => 0.83,
            'lay_bet8' => 0.83,
            'lay_bet9' => 0.66,
            'lay_bet10' => 0.5,
            'lose_bet4' => 0.45,
            'lose_bet5' => 0.62,
            'lose_bet6' => 0.8,
            'lose_bet8' => 0.8,
            'lose_bet9' => 0.62,
            'lose_bet10' => 0.45,
            'number4' => 2.0,
            'number5' => 1.5,
            'number6' => 1.2,
            'number8' => 1.2,
            'number9' => 1.5,
            'number10' => 2.0,
            'win_bet4' => 1.8,
            'win_bet5' => 1.4,
            'win_bet6' => 1.17,
            'win_bet8' => 1.17,
            'win_bet9' => 1.4,
            'win_bet10' => 1.8,
            'any11_7' => 15.0,
            'any_craps_7' => 7.0,
            'seven_bet' => 4.0,
            'hardway6' => 9.0,
            'hardway10' => 7.0,
            'hardway8' => 9.0,
            'hardway4' => 7.0,
            'horn3' => 15.0,
            'horn2' => 30.0,
            'horn12' => 30.0,
        ];

        return $multipliers[$bet] ?? 0.0;
    }

    /**
     * @param array<string, float> $bets
     * @return array{
     *   dice: array{die1: int, die2: int, sum: int},
     *   stateAfter: string,
     *   pointNumberAfter: ?int,
     *   activeBetsAfter: array<string, float>,
     *   resolvedBets: array<int, array<string, mixed>>,
     *   totalReturn: float
     * }
     */
    private function settleCrapsRoll(array $bets, string $stateBefore, ?int $pointBefore, int $die1, int $die2): array
    {
        $sum = $die1 + $die2;
        $phase = $stateBefore === 'come_point' ? 'come_point' : 'come_out';
        $point = $phase === 'come_point' ? $pointBefore : null;

        $activeAfter = [];
        $resolved = [];
        $totalReturn = 0.0;

        foreach ($bets as $bet => $amountRaw) {
            $amount = round(max(0.0, $this->num($amountRaw)));
            if ($amount <= 0) {
                continue;
            }

            $outcome = '';
            $profit = 0.0;
            $moveTo = null;
            $multiplier = $this->crapsBetMultiplier($bet);

            switch ($bet) {
                case 'pass_line':
                    if ($phase === 'come_out') {
                        if (in_array($sum, [2, 3, 12], true)) {
                            $outcome = 'lose';
                        } elseif (in_array($sum, [7, 11], true)) {
                            $outcome = 'win';
                            $profit = round($amount * $multiplier);
                        }
                    } else {
                        if ($sum === 7) {
                            $outcome = 'lose';
                        } elseif ($point !== null && $sum === $point) {
                            $outcome = 'win';
                            $profit = round($amount * $multiplier);
                        }
                    }
                    break;

                case 'come':
                    if (in_array($sum, [7, 11], true)) {
                        $outcome = 'win';
                        $profit = round($amount * $multiplier);
                    } elseif (in_array($sum, [2, 3, 12], true)) {
                        $outcome = 'lose';
                    } else {
                        $moveTo = 'number' . $sum;
                    }
                    break;

                case 'dont_pass1':
                case 'dont_pass2':
                    if ($phase === 'come_out') {
                        if (in_array($sum, [2, 3], true)) {
                            $outcome = 'win';
                            $profit = round($amount * $multiplier);
                        } elseif (in_array($sum, [7, 11], true)) {
                            $outcome = 'lose';
                        } elseif ($sum === 12) {
                            $outcome = 'win';
                            $profit = round($amount);
                        }
                    } else {
                        if ($sum === 7) {
                            $outcome = 'win';
                            $profit = round($amount * $multiplier);
                        } elseif ($point !== null && $sum === $point) {
                            $outcome = 'lose';
                        }
                    }
                    break;

                case 'dont_come':
                    if (in_array($sum, [2, 7], true)) {
                        $outcome = 'win';
                        $profit = round($amount * $multiplier);
                    } elseif (in_array($sum, [7, 11], true)) {
                        $outcome = 'lose';
                    } else {
                        $moveTo = 'lay_bet' . $sum;
                    }
                    break;

                case 'field':
                    if (in_array($sum, [5, 6, 7, 8], true)) {
                        $outcome = 'lose';
                    } else {
                        $outcome = 'win';
                        $profit = round($amount * $multiplier);
                        if (in_array($sum, [2, 12], true)) {
                            $profit = round($profit * 2);
                        }
                    }
                    break;

                case 'big_6':
                    if ($sum === 6) {
                        $outcome = 'win';
                        $profit = round($amount * $multiplier);
                    } elseif ($sum === 7) {
                        $outcome = 'lose';
                    }
                    break;

                case 'big_8':
                    if ($sum === 8) {
                        $outcome = 'win';
                        $profit = round($amount * $multiplier);
                    } elseif ($sum === 7) {
                        $outcome = 'lose';
                    }
                    break;

                case 'lay_bet4':
                case 'lose_bet4':
                    if ($sum === 7) {
                        $outcome = 'win';
                        $profit = round($amount * $multiplier);
                        if ($bet === 'lay_bet4') {
                            $profit = round($profit * 0.05);
                        }
                    } elseif ($sum === 4) {
                        $outcome = 'lose';
                    }
                    break;

                case 'lay_bet5':
                case 'lose_bet5':
                    if ($sum === 7) {
                        $outcome = 'win';
                        $profit = round($amount * $multiplier);
                        if ($bet === 'lay_bet5') {
                            $profit = round($profit * 0.05);
                        }
                    } elseif ($sum === 5) {
                        $outcome = 'lose';
                    }
                    break;

                case 'lay_bet6':
                case 'lose_bet6':
                    if ($sum === 7) {
                        $outcome = 'win';
                        $profit = round($amount * $multiplier);
                        if ($bet === 'lay_bet6') {
                            $profit = round($profit * 0.05);
                        }
                    } elseif ($sum === 6) {
                        $outcome = 'lose';
                    }
                    break;

                case 'lay_bet8':
                case 'lose_bet8':
                    if ($sum === 7) {
                        $outcome = 'win';
                        $profit = round($amount * $multiplier);
                        if ($bet === 'lay_bet8') {
                            $profit = round($profit * 0.05);
                        }
                    } elseif ($sum === 8) {
                        $outcome = 'lose';
                    }
                    break;

                case 'lay_bet9':
                case 'lose_bet9':
                    if ($sum === 7) {
                        $outcome = 'win';
                        $profit = round($amount * $multiplier);
                        if ($bet === 'lay_bet9') {
                            $profit = round($profit * 0.05);
                        }
                    } elseif ($sum === 9) {
                        $outcome = 'lose';
                    }
                    break;

                case 'lay_bet10':
                case 'lose_bet10':
                    if ($sum === 7) {
                        $outcome = 'win';
                        $profit = round($amount * $multiplier);
                        if ($bet === 'lay_bet10') {
                            $profit = round($profit * 0.05);
                        }
                    } elseif ($sum === 10) {
                        $outcome = 'lose';
                    }
                    break;

                case 'number4':
                case 'win_bet4':
                    if ($phase === 'come_point') {
                        if ($sum === 4) {
                            $outcome = 'win';
                            $profit = round($amount * $multiplier);
                            if ($bet === 'number4') {
                                $profit = round($amount * 0.05);
                            }
                        } elseif ($sum === 7) {
                            $outcome = 'lose';
                        }
                    }
                    break;

                case 'number5':
                case 'win_bet5':
                    if ($phase === 'come_point') {
                        if ($sum === 5) {
                            $outcome = 'win';
                            $profit = round($amount * $multiplier);
                            if ($bet === 'number5') {
                                $profit = round($amount * 0.05);
                            }
                        } elseif ($sum === 7) {
                            $outcome = 'lose';
                        }
                    }
                    break;

                case 'number6':
                case 'win_bet6':
                    if ($phase === 'come_point') {
                        if ($sum === 6) {
                            $outcome = 'win';
                            $profit = round($amount * $multiplier);
                            if ($bet === 'number6') {
                                $profit = round($amount * 0.05);
                            }
                        } elseif ($sum === 7) {
                            $outcome = 'lose';
                        }
                    }
                    break;

                case 'number8':
                case 'win_bet8':
                    if ($phase === 'come_point') {
                        if ($sum === 8) {
                            $outcome = 'win';
                            $profit = round($amount * $multiplier);
                            if ($bet === 'number8') {
                                $profit = round($amount * 0.05);
                            }
                        } elseif ($sum === 7) {
                            $outcome = 'lose';
                        }
                    }
                    break;

                case 'number9':
                case 'win_bet9':
                    if ($phase === 'come_point') {
                        if ($sum === 9) {
                            $outcome = 'win';
                            $profit = round($amount * $multiplier);
                            if ($bet === 'number9') {
                                $profit = round($amount * 0.05);
                            }
                        } elseif ($sum === 7) {
                            $outcome = 'lose';
                        }
                    }
                    break;

                case 'number10':
                case 'win_bet10':
                    if ($phase === 'come_point') {
                        if ($sum === 10) {
                            $outcome = 'win';
                            $profit = round($amount * $multiplier);
                            if ($bet === 'number10') {
                                $profit = round($amount * 0.05);
                            }
                        } elseif ($sum === 7) {
                            $outcome = 'lose';
                        }
                    }
                    break;

                case 'any11_7':
                    if ($sum === 11) {
                        $outcome = 'win';
                        $profit = round($amount * $multiplier);
                    } else {
                        $outcome = 'lose';
                    }
                    break;

                case 'any_craps_7':
                    if (in_array($sum, [2, 3, 12], true)) {
                        $outcome = 'win';
                        $profit = round($amount * $multiplier);
                    } else {
                        $outcome = 'lose';
                    }
                    break;

                case 'seven_bet':
                    if ($sum === 7) {
                        $outcome = 'win';
                        $profit = round($amount * $multiplier);
                    } else {
                        $outcome = 'lose';
                    }
                    break;

                case 'hardway6':
                    if ($die1 === 3 && $die2 === 3) {
                        $outcome = 'win';
                        $profit = round($amount * $multiplier);
                    } else {
                        $outcome = 'lose';
                    }
                    break;

                case 'hardway10':
                    if ($die1 === 5 && $die2 === 5) {
                        $outcome = 'win';
                        $profit = round($amount * $multiplier);
                    } else {
                        $outcome = 'lose';
                    }
                    break;

                case 'hardway8':
                    if ($die1 === 4 && $die2 === 4) {
                        $outcome = 'win';
                        $profit = round($amount * $multiplier);
                    } else {
                        $outcome = 'lose';
                    }
                    break;

                case 'hardway4':
                    if ($die1 === 2 && $die2 === 2) {
                        $outcome = 'win';
                        $profit = round($amount * $multiplier);
                    } else {
                        $outcome = 'lose';
                    }
                    break;

                case 'horn3':
                    if ($sum === 3) {
                        $outcome = 'win';
                        $profit = round($amount * $multiplier);
                    } else {
                        $outcome = 'lose';
                    }
                    break;

                case 'horn2':
                    if ($sum === 2) {
                        $outcome = 'win';
                        $profit = round($amount * $multiplier);
                    } else {
                        $outcome = 'lose';
                    }
                    break;

                case 'horn12':
                    if ($sum === 12) {
                        $outcome = 'win';
                        $profit = round($amount * $multiplier);
                    } else {
                        $outcome = 'lose';
                    }
                    break;
            }

            if ($moveTo !== null) {
                $activeAfter[$moveTo] = round(($activeAfter[$moveTo] ?? 0.0) + $amount);
                $resolved[] = [
                    'bet' => $bet,
                    'wager' => $amount,
                    'outcome' => 'moved',
                    'profit' => 0.0,
                    'return' => 0.0,
                    'moveTo' => $moveTo,
                ];
                continue;
            }

            if ($outcome === '') {
                $activeAfter[$bet] = round(($activeAfter[$bet] ?? 0.0) + $amount);
                continue;
            }

            $returnAmount = 0.0;
            if ($outcome === 'win') {
                $returnAmount = round($amount + $profit);
            }
            $totalReturn = round($totalReturn + $returnAmount);

            $resolved[] = [
                'bet' => $bet,
                'wager' => $amount,
                'outcome' => $outcome,
                'profit' => round($profit),
                'return' => $returnAmount,
                'moveTo' => null,
            ];
        }

        $stateAfter = $phase;
        $pointAfter = $point;
        if ($phase === 'come_out') {
            if (!in_array($sum, [2, 3, 7, 11, 12], true)) {
                $stateAfter = 'come_point';
                $pointAfter = $sum;
            } else {
                $stateAfter = 'waiting';
                $pointAfter = null;
            }
        } elseif ($phase === 'come_point') {
            if ($point === null || $sum === 7 || $sum === $point) {
                $stateAfter = 'waiting';
                $pointAfter = null;
            } else {
                $stateAfter = 'come_point';
                $pointAfter = $point;
            }
        }

        ksort($activeAfter);
        return [
            'dice' => ['die1' => $die1, 'die2' => $die2, 'sum' => $sum],
            'stateAfter' => $stateAfter,
            'pointNumberAfter' => $pointAfter,
            'activeBetsAfter' => $activeAfter,
            'resolvedBets' => $resolved,
            'totalReturn' => round($totalReturn),
        ];
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
                Response::json(['message' => 'Minimum stud poker ante is $' . round($gameMinBet)], 400);
                return;
            }
            if ($anteBet > $gameMaxBet) {
                Response::json(['message' => 'Maximum stud poker ante is $' . round($gameMaxBet)], 400);
                return;
            }

            $userId = (string) ($actor['id'] ?? '');
            $this->db->beginTransaction();
            try {
                $lockedUser = $this->loadLockedCasinoUser($userId);

                $existingRound = $this->db->findOne('casino_bets', [
                    'userId' => $userId,
                    'requestId' => $requestId,
                    'game' => self::STUD_POKER_GAME_SLUG,
                ]);
                if ($existingRound !== null) {
                    $roundId = (string) ($existingRound['roundId'] ?? $existingRound['id'] ?? '');
                    $ledgerEntries = $this->findRoundLedgerEntries($roundId);
                    $this->db->commit();
                    Response::json($this->formatStudPokerStartResponse($existingRound, $ledgerEntries, true));
                    return;
                }

                $roundExposure = round($anteBet * 3);
                $this->assertUserWagerWithinLimits($lockedUser, $roundExposure);
                $this->assertCasinoLossLimits($lockedUser, $anteBet);

                $balanceSnapshot = $this->getUserBalanceSnapshot($lockedUser);
                if ($roundExposure > $balanceSnapshot['availableBalance']) {
                    $this->db->rollback();
                    Response::json(['message' => 'Insufficient balance to cover ante and raise. Available: $' . round($balanceSnapshot['availableBalance'])], 400);
                    return;
                }

                $roundId = $this->newRoundId();
                $openingRound = $this->dealStudPokerOpeningRound();
                $balanceAfterAnte = round($balanceSnapshot['balanceBefore'] - $anteBet);
                $now = SqlRepository::nowUtc();
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

                $this->db->updateOne('users', ['id' => SqlRepository::id($userId)], [
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
                    'id' => $roundId,
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
                    'id' => $roundId,
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
                    array_merge($debitEntry, ['id' => $debitEntryId]),
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

            $userId = (string) ($actor['id'] ?? '');
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
                $raiseBet = $action === 'raise' ? round($anteBet * 2) : 0.0;
                $balanceSnapshot = $this->getUserBalanceSnapshot($lockedUser);

                $ledgerEntries = $this->findRoundLedgerEntries($roundId);
                $additionalLedgerEntries = [];
                $now = SqlRepository::nowUtc();
                $ipAddress = IpUtils::clientIp();
                $userAgent = Http::header('user-agent') !== '' ? Http::header('user-agent') : null;
                $balanceAfterWagers = $balanceSnapshot['balanceBefore'];

                if ($action === 'raise') {
                    $this->assertCasinoLossLimits($lockedUser, $raiseBet);
                    if ($raiseBet > $balanceSnapshot['availableBalance']) {
                        $this->db->rollback();
                        Response::json(['message' => 'Insufficient balance to raise. Available: $' . round($balanceSnapshot['availableBalance'])], 400);
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
                        round($balanceSnapshot['balanceBefore'] - $raiseBet),
                        'CASINO_STUD_POKER_RAISE',
                        'Stud poker raise charged',
                        $now,
                        $ipAddress,
                        $userAgent
                    );
                    $raiseDebitEntryId = $this->db->insertOne('transactions', $raiseDebitEntry);
                    $additionalLedgerEntries[] = array_merge($raiseDebitEntry, ['id' => $raiseDebitEntryId]);
                    $balanceAfterWagers = round($balanceSnapshot['balanceBefore'] - $raiseBet);
                }

                $resolution = $this->buildStudPokerResolution(
                    is_array($round['playerCards'] ?? null) ? $round['playerCards'] : [],
                    (string) ($round['dealerUpCard'] ?? ''),
                    $action,
                    $anteBet,
                    $this->safeNumber($gameConfig['rtp'] ?? null, null)
                );

                $totalWager = $action === 'raise' ? round($anteBet + $raiseBet) : $anteBet;
                $totalReturn = $resolution['totalReturn'];
                $profit = round(max(0, $totalReturn - $totalWager));
                $netResult = round($totalReturn - $totalWager);
                $balanceAfter = round($balanceAfterWagers + $totalReturn);

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
                    $additionalLedgerEntries[] = array_merge($creditEntry, ['id' => $creditEntryId]);
                }

                $this->db->updateOne('users', ['id' => SqlRepository::id($userId)], [
                    'balance' => $balanceAfter,
                    'updatedAt' => $now,
                ]);

                $serverDecisionAt = SqlRepository::nowUtc();
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
                $this->db->updateOne('casino_bets', ['id' => SqlRepository::id($roundId)], $updates);
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

            $query = ['userId' => (string) ($actor['id'] ?? '')];
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
                'userId' => (string) ($actor['id'] ?? ''),
            ]);
            if ($bet === null) {
                $bet = $this->db->findOne('casino_bets', [
                    'id' => $roundId,
                    'userId' => (string) ($actor['id'] ?? ''),
                ]);
            }
            if ($bet === null) {
                Response::json(['message' => 'Casino round not found'], 404);
                return;
            }

            $resolvedRoundId = (string) ($bet['roundId'] ?? $bet['id'] ?? $roundId);
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
                $bet = $this->db->findOne('casino_bets', ['id' => $roundId]);
            }
            if ($bet === null) {
                Response::json(['message' => 'Casino round not found'], 404);
                return;
            }

            $resolvedRoundId = (string) ($bet['roundId'] ?? $bet['id'] ?? $roundId);
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
            $userId = trim((string) ($_GET['userId'] ?? ''));
            $username = trim((string) ($_GET['username'] ?? ''));
            $result = trim((string) ($_GET['result'] ?? ''));

            $query = [];
            if ($game !== '') {
                $query['game'] = $game;
            }
            if ($userId !== '') {
                $query['userId'] = $userId;
            }
            if ($username !== '') {
                $query['username'] = ['$regex' => $username, '$options' => 'i'];
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

            $rows = $this->db->findMany('casino_bets', $query, [
                'sort' => ['createdAt' => -1],
            ]);

            $totalWager = 0.0;
            $totalReturn = 0.0;
            $totalProfit = 0.0;
            $totalNet = 0.0;
            $errorCount = 0;
            $anomalyCount = 0;
            $netByUser = [];
            $byUser = [];
            $byGame = [];
            $biggestWin = null;
            $biggestLoss = null;
            $anomalies = [];

            foreach ($rows as $row) {
                $wager = $this->num($row['totalWager'] ?? 0);
                $return = $this->num($row['totalReturn'] ?? 0);
                $profit = $this->num($row['profit'] ?? 0);
                $netResult = $this->num($row['netResult'] ?? 0);
                $balanceBefore = $this->num($row['balanceBefore'] ?? 0);
                $balanceAfter = $this->num($row['balanceAfter'] ?? 0);
                $roundStatus = (string) ($row['roundStatus'] ?? 'settled');
                $roundId = (string) ($row['roundId'] ?? $row['id'] ?? '');
                $rowGame = (string) ($row['game'] ?? 'unknown');
                $rowUsername = (string) ($row['username'] ?? 'unknown');

                $totalWager += $wager;
                $totalReturn += $return;
                $totalProfit += $profit;
                $totalNet += $netResult;

                if ($roundStatus !== 'settled') {
                    $errorCount++;
                }

                $netByUser[$rowUsername] = ($netByUser[$rowUsername] ?? 0.0) + $netResult;
                if (!isset($byUser[$rowUsername])) {
                    $byUser[$rowUsername] = [
                        'username' => $rowUsername,
                        'userId' => (string) ($row['userId'] ?? ''),
                        'rounds' => 0,
                        'totalWager' => 0.0,
                        'totalReturn' => 0.0,
                        'netResult' => 0.0,
                        'biggestWin' => null,
                        'biggestLoss' => null,
                    ];
                }
                $byUser[$rowUsername]['rounds']++;
                $byUser[$rowUsername]['totalWager'] += $wager;
                $byUser[$rowUsername]['totalReturn'] += $return;
                $byUser[$rowUsername]['netResult'] += $netResult;
                if ($netResult > 0 && ($byUser[$rowUsername]['biggestWin'] === null || $netResult > (float) $byUser[$rowUsername]['biggestWin'])) {
                    $byUser[$rowUsername]['biggestWin'] = $netResult;
                }
                if ($netResult < 0 && ($byUser[$rowUsername]['biggestLoss'] === null || $netResult < (float) $byUser[$rowUsername]['biggestLoss'])) {
                    $byUser[$rowUsername]['biggestLoss'] = $netResult;
                }

                $gameKey = $rowGame;
                if (!isset($byGame[$gameKey])) {
                    $byGame[$gameKey] = [
                        'game' => $gameKey,
                        'rounds' => 0,
                        'totalWager' => 0.0,
                        'totalReturn' => 0.0,
                        'profit' => 0.0,
                        'netResult' => 0.0,
                        'biggestWin' => null,
                        'biggestLoss' => null,
                    ];
                }
                $byGame[$gameKey]['rounds']++;
                $byGame[$gameKey]['totalWager'] += $wager;
                $byGame[$gameKey]['totalReturn'] += $return;
                $byGame[$gameKey]['profit'] += $profit;
                $byGame[$gameKey]['netResult'] += $netResult;
                if ($netResult > 0 && ($byGame[$gameKey]['biggestWin'] === null || $netResult > (float) $byGame[$gameKey]['biggestWin'])) {
                    $byGame[$gameKey]['biggestWin'] = $netResult;
                }
                if ($netResult < 0 && ($byGame[$gameKey]['biggestLoss'] === null || $netResult < (float) $byGame[$gameKey]['biggestLoss'])) {
                    $byGame[$gameKey]['biggestLoss'] = $netResult;
                }

                if ($netResult > 0 && ($biggestWin === null || $netResult > (float) ($biggestWin['netResult'] ?? 0))) {
                    $biggestWin = [
                        'roundId' => $roundId,
                        'game' => $rowGame,
                        'username' => $rowUsername,
                        'netResult' => round($netResult),
                        'totalWager' => round($wager),
                        'totalReturn' => round($return),
                        'createdAt' => $row['createdAt'] ?? null,
                    ];
                }
                if ($netResult < 0 && ($biggestLoss === null || $netResult < (float) ($biggestLoss['netResult'] ?? 0))) {
                    $biggestLoss = [
                        'roundId' => $roundId,
                        'game' => $rowGame,
                        'username' => $rowUsername,
                        'netResult' => round($netResult),
                        'totalWager' => round($wager),
                        'totalReturn' => round($return),
                        'createdAt' => $row['createdAt'] ?? null,
                    ];
                }

                $anomalyReasons = [];
                if ($roundStatus !== 'settled') {
                    $anomalyReasons[] = 'round_not_settled';
                }
                if ($wager < 0 || $return < 0) {
                    $anomalyReasons[] = 'negative_amounts';
                }
                if (abs(round(($return - $wager) - $netResult)) > 0.01) {
                    $anomalyReasons[] = 'net_mismatch';
                }
                if (abs(round(($balanceAfter - $balanceBefore) - $netResult)) > 0.01) {
                    $anomalyReasons[] = 'balance_delta_mismatch';
                }
                if ($anomalyReasons !== []) {
                    $anomalyCount++;
                    if (count($anomalies) < 50) {
                        $anomalies[] = [
                            'roundId' => $roundId,
                            'game' => $rowGame,
                            'username' => $rowUsername,
                            'reasons' => $anomalyReasons,
                            'totalWager' => round($wager),
                            'totalReturn' => round($return),
                            'netResult' => round($netResult),
                            'balanceBefore' => round($balanceBefore),
                            'balanceAfter' => round($balanceAfter),
                            'createdAt' => $row['createdAt'] ?? null,
                        ];
                    }
                }
            }

            arsort($netByUser);
            $topWinners = [];
            foreach (array_slice($netByUser, 0, 5, true) as $username => $net) {
                $topWinners[] = ['username' => $username, 'netResult' => round((float) $net)];
            }

            asort($netByUser);
            $topLosers = [];
            foreach (array_slice($netByUser, 0, 5, true) as $username => $net) {
                $topLosers[] = ['username' => $username, 'netResult' => round((float) $net)];
            }

            $rounds = count($rows);
            $grossGamingRevenue = round($totalWager - $totalReturn);
            $payoutRatio = $totalWager > 0 ? round(($totalReturn / $totalWager) * 100) : 0.0;
            $errorRate = $rounds > 0 ? round(($errorCount / $rounds) * 100, 4) : 0.0;
            $averageBet = $rounds > 0 ? round($totalWager / $rounds) : 0.0;
            $rtpEstimate = $payoutRatio;

            uasort($byGame, static function (array $a, array $b): int {
                return ($b['rounds'] ?? 0) <=> ($a['rounds'] ?? 0);
            });

            uasort($byUser, static function (array $a, array $b): int {
                $wagerCmp = ($b['totalWager'] ?? 0) <=> ($a['totalWager'] ?? 0);
                if ($wagerCmp !== 0) {
                    return $wagerCmp;
                }
                return ($b['rounds'] ?? 0) <=> ($a['rounds'] ?? 0);
            });

            $recentRounds = array_slice(
                array_map(fn (array $row): array => $this->mapCasinoBetRow($row), $rows),
                0,
                25
            );

            Response::json([
                'summary' => [
                    'rounds' => $rounds,
                    'totalWager' => round($totalWager),
                    'totalReturn' => round($totalReturn),
                    'playerProfit' => round($totalProfit),
                    'totalNet' => round($totalNet),
                    'grossGamingRevenue' => $grossGamingRevenue,
                    'payoutRatio' => $payoutRatio,
                    'rtpEstimate' => $rtpEstimate,
                    'houseEdgePercent' => round(100 - $payoutRatio),
                    'averageBet' => $averageBet,
                    'biggestWin' => $biggestWin,
                    'biggestLoss' => $biggestLoss,
                    'anomalyCount' => $anomalyCount,
                    'errorRate' => $errorRate,
                ],
                'byGame' => array_values(array_map(static fn(array $item): array => [
                    'game' => $item['game'],
                    'rounds' => $item['rounds'],
                    'totalWager' => round((float) $item['totalWager']),
                    'totalReturn' => round((float) $item['totalReturn']),
                    'profit' => round((float) $item['profit']),
                    'netResult' => round((float) $item['netResult']),
                    'averageBet' => $item['rounds'] > 0 ? round(((float) $item['totalWager']) / (float) $item['rounds']) : 0.0,
                    'grossGamingRevenue' => round((float) $item['totalWager'] - (float) $item['totalReturn']),
                    'payoutRatio' => ((float) $item['totalWager']) > 0
                        ? round((((float) $item['totalReturn']) / ((float) $item['totalWager'])) * 100)
                        : 0.0,
                    'biggestWin' => $item['biggestWin'] !== null ? round((float) $item['biggestWin']) : null,
                    'biggestLoss' => $item['biggestLoss'] !== null ? round((float) $item['biggestLoss']) : null,
                ], $byGame)),
                'byUser' => array_values(array_map(static fn(array $item): array => [
                    'username' => (string) ($item['username'] ?? ''),
                    'userId' => (string) ($item['userId'] ?? ''),
                    'rounds' => (int) ($item['rounds'] ?? 0),
                    'totalWager' => round((float) ($item['totalWager'] ?? 0)),
                    'totalReturn' => round((float) ($item['totalReturn'] ?? 0)),
                    'netResult' => round((float) ($item['netResult'] ?? 0)),
                    'averageBet' => (int) ($item['rounds'] ?? 0) > 0
                        ? round(((float) ($item['totalWager'] ?? 0)) / (float) ($item['rounds'] ?? 1))
                        : 0.0,
                    'biggestWin' => $item['biggestWin'] !== null ? round((float) $item['biggestWin']) : null,
                    'biggestLoss' => $item['biggestLoss'] !== null ? round((float) $item['biggestLoss']) : null,
                ], array_slice(array_values($byUser), 0, 100))),
                'topWinners' => $topWinners,
                'topLosers' => $topLosers,
                'recentRounds' => $recentRounds,
                'anomalies' => [
                    'count' => $anomalyCount,
                    'sample' => $anomalies,
                ],
                'window' => [
                    'from' => $fromRaw !== '' ? $fromRaw : null,
                    'to' => $toRaw !== '' ? $toRaw : null,
                    'game' => $game !== '' ? $game : null,
                    'result' => $result !== '' ? $result : null,
                    'userId' => $userId !== '' ? $userId : null,
                    'username' => $username !== '' ? $username : null,
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
            'resultType',
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
                (string) ($row['roundId'] ?? $row['id'] ?? ''),
                (string) ($row['requestId'] ?? ''),
                (string) ($row['userId'] ?? ''),
                (string) ($row['username'] ?? ''),
                (string) ($row['game'] ?? ''),
                (string) ($row['roundStatus'] ?? 'settled'),
                $this->deriveCasinoPlayerOutcome($row),
                (string) ($row['result'] ?? ''),
                (string) ($row['resultType'] ?? ''),
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
        $totalWager = round($playerBet + $bankerBet + $tieBet);
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

        $totalReturn = round($totalReturn);
        $profit = round($profit);
        $netResult = round($totalReturn - $totalWager);

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
        $lockedUser = $this->db->findOneForUpdate('users', ['id' => SqlRepository::id($userId)]);
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
        $normalizedMinBet = ($userMinBet !== null && $userMinBet > 0) ? round($userMinBet) : null;
        $normalizedMaxBet = ($userMaxBet !== null && $userMaxBet > 0) ? round($userMaxBet) : null;
        if ($normalizedMinBet !== null && $normalizedMaxBet !== null && $normalizedMaxBet < $normalizedMinBet) {
            $normalizedMaxBet = $normalizedMinBet;
        }

        if ($normalizedMinBet !== null && $totalWager < $normalizedMinBet) {
            throw new InvalidArgumentException('Minimum bet for your account is $' . round($normalizedMinBet));
        }
        if ($normalizedMaxBet !== null && $totalWager > $normalizedMaxBet) {
            throw new InvalidArgumentException('Maximum bet for your account is $' . round($normalizedMaxBet));
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

        $userId = SqlRepository::id((string) ($user['id'] ?? ''));
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

            $netLoss = round($totalWagered - $totalWon);
            if (($netLoss + $wagerAmount) > $limit) {
                return 'This wager would exceed your '
                    . $label
                    . ' loss limit of $'
                    . round($limit)
                    . '. Current net loss: $'
                    . round($netLoss)
                    . '.';
            }
        }

        return null;
    }

    private function getUserBalanceSnapshot(array $lockedUser): array
    {
        $balanceBefore = round($this->num($lockedUser['balance'] ?? 0));
        $pendingBalance = round($this->num($lockedUser['pendingBalance'] ?? 0));
        $availableBalance = round(max(0, $balanceBefore - $pendingBalance));

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
            'amount' => round($amount),
            'type' => $type,
            'entrySide' => $entrySide,
            'entryGroupId' => $roundId,
            'sourceType' => $sourceType,
            'sourceId' => $roundId,
            'status' => 'completed',
            'balanceBefore' => round($balanceBefore),
            'balanceAfter' => round($balanceAfter),
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

    private function blackjackNormalizeBaseZone(string $raw): string
    {
        $value = strtolower(trim($raw));
        if ($value === '') {
            return '';
        }
        if (preg_match('/^betzone([1-3])$/', $value, $m) === 1) {
            return 'betZone' . $m[1];
        }
        if (preg_match('/^[1-3]$/', $value) === 1) {
            return 'betZone' . $value;
        }

        return '';
    }

    private function blackjackNormalizeHandZone(string $raw): string
    {
        $value = strtolower(trim($raw));
        if ($value === '') {
            return '';
        }
        if (preg_match('/^betzone([1-3])$/', $value, $m) === 1) {
            return 'betZone' . $m[1];
        }
        if (preg_match('/^splitzone([1-6])$/', $value, $m) === 1) {
            return 'splitZone' . $m[1];
        }
        if (preg_match('/^[1-3]$/', $value) === 1) {
            return 'betZone' . $value;
        }

        return '';
    }

    private function blackjackBaseZoneForHand(string $handZone): string
    {
        if ($handZone === '') {
            return '';
        }
        if (str_starts_with($handZone, 'betZone')) {
            return $handZone;
        }
        if (preg_match('/^splitZone([1-6])$/', $handZone, $m) === 1) {
            $splitNum = (int) $m[1];
            return 'betZone' . (string) max(1, min(3, (int) ceil($splitNum / 2)));
        }

        return '';
    }

    private function blackjackNormalizeRankToken(string $raw): ?string
    {
        $token = strtoupper(trim($raw));
        if ($token === '') {
            return null;
        }

        if ($token === '1') {
            return 'A';
        }
        if ($token === '11') {
            return 'J';
        }
        if ($token === '12') {
            return 'Q';
        }
        if ($token === '13') {
            return 'K';
        }

        if ($token === 'A' || $token === 'J' || $token === 'Q' || $token === 'K') {
            return $token;
        }

        if (preg_match('/^(10|[2-9])$/', $token) === 1) {
            return $token;
        }

        return null;
    }

    private function blackjackNormalizeSuitToken(string $raw): ?string
    {
        $token = strtoupper(trim($raw));
        if ($token === '') {
            return null;
        }
        $token = str_replace([' ', '-', '_'], '', $token);

        if (preg_match('/^S([1-4])$/', $token, $m) === 1) {
            return 's' . $m[1];
        }
        if (preg_match('/^[1-4]$/', $token) === 1) {
            return 's' . $token;
        }

        return match ($token) {
            'H', 'HEART', 'HEARTS' => 's1',
            'D', 'DIAMOND', 'DIAMONDS' => 's4',
            'C', 'CLUB', 'CLUBS' => 's2',
            'S', 'SPADE', 'SPADES' => 's3',
            default => null,
        };
    }

    private function normalizeBlackjackCard(mixed $rawCard): ?array
    {
        $rankToken = null;
        $suitToken = null;

        if (is_array($rawCard)) {
            $rankToken = isset($rawCard['rank']) ? (string) $rawCard['rank'] : '';
            $suitToken = isset($rawCard['suit']) ? (string) $rawCard['suit'] : '';

            if ($rankToken === '' && isset($rawCard['r'])) {
                $rankToken = (string) $rawCard['r'];
            }
            if ($suitToken === '' && isset($rawCard['s'])) {
                $suitToken = (string) $rawCard['s'];
            }

            if (($rankToken === '' || $suitToken === '') && isset($rawCard['code']) && is_string($rawCard['code'])) {
                $rawCard = $rawCard['code'];
            }
        }

        if (!is_string($rawCard) && !is_array($rawCard)) {
            return null;
        }

        if (!is_array($rawCard)) {
            $value = strtoupper(trim((string) $rawCard));
            if ($value === '') {
                return null;
            }

            if (strpos($value, ':') !== false) {
                [$first, $second] = array_pad(explode(':', $value, 2), 2, '');
                $firstRank = $this->blackjackNormalizeRankToken($first);
                $secondRank = $this->blackjackNormalizeRankToken($second);
                $firstSuit = $this->blackjackNormalizeSuitToken($first);
                $secondSuit = $this->blackjackNormalizeSuitToken($second);
                if ($firstRank !== null && $secondSuit !== null) {
                    $rankToken = $firstRank;
                    $suitToken = $secondSuit;
                } elseif ($secondRank !== null && $firstSuit !== null) {
                    $rankToken = $secondRank;
                    $suitToken = $firstSuit;
                }
            }

            if (($rankToken === null || $suitToken === null) && preg_match('/^(10|[2-9AJQK])([HDCS])$/', $value, $m) === 1) {
                $rankToken = $m[1];
                $suitToken = $m[2];
            }
            if (($rankToken === null || $suitToken === null) && preg_match('/^(10|[2-9AJQK])([1-4])$/', $value, $m) === 1) {
                $rankToken = $m[1];
                $suitToken = $m[2];
            }
        }

        if ($rankToken === null || $suitToken === null) {
            return null;
        }

        $rank = $this->blackjackNormalizeRankToken((string) $rankToken);
        $suit = $this->blackjackNormalizeSuitToken((string) $suitToken);
        if ($rank === null || $suit === null) {
            return null;
        }

        return [
            'rank' => $rank,
            'suit' => $suit,
            'code' => $rank . ':' . $suit,
        ];
    }

    private function normalizeBlackjackCardList(mixed $rawCards, int $max = 64): array
    {
        if (!is_array($rawCards)) {
            return [];
        }

        $cards = [];
        foreach ($rawCards as $rawCard) {
            $parsed = $this->normalizeBlackjackCard($rawCard);
            if ($parsed === null) {
                continue;
            }
            $cards[] = $parsed;
            if (count($cards) >= $max) {
                break;
            }
        }

        return $cards;
    }

    private function blackjackHandScore(array $cards): int
    {
        $total = 0;
        $aces = 0;
        foreach ($cards as $card) {
            $rank = strtoupper((string) ($card['rank'] ?? ''));
            if ($rank === 'A') {
                $total += 11;
                $aces++;
                continue;
            }
            if ($rank === 'J' || $rank === 'Q' || $rank === 'K') {
                $total += 10;
                continue;
            }
            $total += (int) $rank;
        }

        while ($total > 21 && $aces > 0) {
            $total -= 10;
            $aces--;
        }

        return $total;
    }

    private function blackjackIsNatural(array $cards, bool $isSplit): bool
    {
        if ($isSplit || count($cards) !== 2) {
            return false;
        }
        return $this->blackjackHandScore($cards) === 21;
    }

    private function blackjackCardColor(array $card): string
    {
        $suit = strtolower((string) ($card['suit'] ?? ''));
        if ($suit === 's1' || $suit === 's4') {
            return 'red';
        }
        return 'black';
    }

    private function blackjackIsThreeCardStraight(array $cards): bool
    {
        if (count($cards) !== 3) {
            return false;
        }

        $options = [];
        foreach ($cards as $card) {
            $rank = strtoupper((string) ($card['rank'] ?? ''));
            if ($rank === 'A') {
                $options[] = [1, 14];
            } elseif ($rank === 'J') {
                $options[] = [11];
            } elseif ($rank === 'Q') {
                $options[] = [12];
            } elseif ($rank === 'K') {
                $options[] = [13];
            } else {
                $options[] = [(int) $rank];
            }
        }

        $combos = [[]];
        foreach ($options as $set) {
            $next = [];
            foreach ($combos as $combo) {
                foreach ($set as $value) {
                    $candidate = $combo;
                    $candidate[] = $value;
                    $next[] = $candidate;
                }
            }
            $combos = $next;
        }

        foreach ($combos as $combo) {
            sort($combo);
            if (($combo[0] + 1) === $combo[1] && ($combo[1] + 1) === $combo[2]) {
                return true;
            }
        }

        return false;
    }

    private function blackjackSplitZonesForBase(string $baseZone): array
    {
        return match ($baseZone) {
            'betZone1' => ['splitZone1', 'splitZone2'],
            'betZone2' => ['splitZone3', 'splitZone4'],
            'betZone3' => ['splitZone5', 'splitZone6'],
            default => [],
        };
    }

    private function blackjackHandOrderIndex(string $zone): int
    {
        return match ($zone) {
            'betZone1' => 10,
            'splitZone1' => 11,
            'splitZone2' => 12,
            'betZone2' => 20,
            'splitZone3' => 21,
            'splitZone4' => 22,
            'betZone3' => 30,
            'splitZone5' => 31,
            'splitZone6' => 32,
            default => 99,
        };
    }

    private function blackjackAdvanceToNextOpenHand(array $playOrder, array $handsByZone, int $currentIndex): int
    {
        $idx = max(0, $currentIndex);
        while ($idx < count($playOrder)) {
            $zone = (string) ($playOrder[$idx] ?? '');
            if ($zone === '' || !isset($handsByZone[$zone])) {
                $idx++;
                continue;
            }
            $hand = is_array($handsByZone[$zone] ?? null) ? $handsByZone[$zone] : [];
            if (!(bool) ($hand['completed'] ?? false)) {
                break;
            }
            $idx++;
        }

        return $idx;
    }

    private function blackjackBuildDeck(int $deckCount): array
    {
        $resolvedDeckCount = max(self::BLACKJACK_MIN_DECK_COUNT, min(self::BLACKJACK_MAX_DECK_COUNT, $deckCount));
        $suits = ['s1', 's2', 's3', 's4'];
        $ranks = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];

        $deck = [];
        for ($i = 0; $i < $resolvedDeckCount; $i++) {
            foreach ($suits as $suit) {
                foreach ($ranks as $rank) {
                    $deck[] = [
                        'rank' => $rank,
                        'suit' => $suit,
                        'code' => $rank . ':' . $suit,
                    ];
                }
            }
        }

        return $deck;
    }

    private function blackjackDeterministicInt(string $seed, int $counter, int $mod): int
    {
        if ($mod <= 1) {
            return 0;
        }

        $digest = hash('sha256', $seed . '|' . $counter);
        $value = hexdec(substr($digest, 0, 8));
        return (int) ($value % $mod);
    }

    private function blackjackShuffleDeck(array $deck, string $seed): array
    {
        $counter = 0;
        for ($i = count($deck) - 1; $i > 0; $i--) {
            $j = $this->blackjackDeterministicInt($seed, $counter, $i + 1);
            $tmp = $deck[$i];
            $deck[$i] = $deck[$j];
            $deck[$j] = $tmp;
            $counter++;
        }

        return $deck;
    }

    private function blackjackDrawDeckCard(array &$deck): array
    {
        if ($deck === []) {
            throw new InvalidArgumentException('Blackjack deck exhausted while replaying action flow');
        }

        $card = array_shift($deck);
        if (!is_array($card)) {
            throw new InvalidArgumentException('Invalid blackjack deck card encountered');
        }

        return $card;
    }

    private function simulateBlackjackRound(array $zones, array $actions, string $userId, string $requestId, int $deckCount): array
    {
        $mainStakes = [];
        foreach (['betZone1', 'betZone2', 'betZone3'] as $zoneName) {
            $zoneData = is_array($zones[$zoneName] ?? null) ? $zones[$zoneName] : [];
            $mainStake = $this->parseMoneyValue($zoneData['main'] ?? 0, 'bets.zones.' . $zoneName . '.main');
            if ($mainStake > 0) {
                $mainStakes[$zoneName] = $mainStake;
            }
        }

        if ($mainStakes === []) {
            throw new InvalidArgumentException('At least one blackjack main bet is required');
        }

        if ($actions === []) {
            throw new InvalidArgumentException('Blackjack deal action is required');
        }

        $dealCount = 0;
        foreach ($actions as $entry) {
            $action = strtolower(trim((string) ($entry['action'] ?? '')));
            if ($action === 'deal') {
                $dealCount++;
            }
        }
        if ($dealCount !== 1 || strtolower(trim((string) ($actions[0]['action'] ?? ''))) !== 'deal') {
            throw new InvalidArgumentException('Blackjack action log must begin with exactly one deal action');
        }

        $allowedActions = [
            'deal',
            'hit',
            'stand',
            'double',
            'split',
            'surrender',
            'insurance',
            'decline_insurance',
            'even_money',
            'decline_even_money',
        ];

        $secret = (string) Env::get('CASINO_BLACKJACK_ROUND_SECRET', Env::get('CASINO_INTEGRITY_SECRET', $this->jwtSecret));
        $seed = hash_hmac('sha256', 'blackjack_round|' . $userId . '|' . $requestId, $secret);
        $deck = $this->blackjackShuffleDeck($this->blackjackBuildDeck($deckCount), $seed);

        $handsByZone = [];
        foreach ($mainStakes as $zoneName => $mainStake) {
            $handsByZone[$zoneName] = [
                'zone' => $zoneName,
                'baseZone' => $zoneName,
                'cards' => [],
                'bet' => $mainStake,
                'isSplit' => false,
                'surrendered' => false,
                'evenMoney' => false,
                'doubled' => false,
                'completed' => false,
                'standingReason' => null,
            ];
        }

        $dealerCards = [];
        for ($round = 0; $round < 2; $round++) {
            foreach (array_keys($mainStakes) as $zoneName) {
                $handsByZone[$zoneName]['cards'][] = $this->blackjackDrawDeckCard($deck);
            }
            $dealerCards[] = $this->blackjackDrawDeckCard($deck);
        }

        $playOrder = array_values(array_keys($mainStakes));
        $currentIndex = 0;
        $insuranceTaken = ['betZone1' => false, 'betZone2' => false, 'betZone3' => false];
        $splitUsed = ['betZone1' => false, 'betZone2' => false, 'betZone3' => false];

        $resolvedActions = [[
            'action' => 'deal',
            'zone' => null,
            'at' => trim((string) ($actions[0]['at'] ?? '')),
        ]];

        for ($i = 1; $i < count($actions); $i++) {
            $entry = is_array($actions[$i] ?? null) ? $actions[$i] : [];
            $action = strtolower(trim((string) ($entry['action'] ?? '')));
            if ($action === '') {
                continue;
            }
            if (!in_array($action, $allowedActions, true)) {
                throw new InvalidArgumentException('Unsupported blackjack action: ' . $action);
            }
            if ($action === 'deal') {
                throw new InvalidArgumentException('Duplicate blackjack deal action is not allowed');
            }

            $currentIndex = $this->blackjackAdvanceToNextOpenHand($playOrder, $handsByZone, $currentIndex);
            $currentZone = $currentIndex < count($playOrder) ? (string) $playOrder[$currentIndex] : null;

            $requestedZone = null;
            if (array_key_exists('zone', $entry) && is_string($entry['zone']) && trim($entry['zone']) !== '') {
                $requestedZone = trim((string) $entry['zone']);
            }
            $targetZone = $requestedZone !== null ? $requestedZone : $currentZone;
            if ($targetZone === null || !isset($handsByZone[$targetZone])) {
                throw new InvalidArgumentException('Blackjack action references an unknown or inactive hand');
            }

            $targetCompleted = (bool) ($handsByZone[$targetZone]['completed'] ?? false);
            if ($action === 'stand' && $targetCompleted) {
                $resolvedActions[] = [
                    'action' => $action,
                    'zone' => $targetZone,
                    'at' => trim((string) ($entry['at'] ?? '')),
                    'noop' => true,
                ];
                continue;
            }

            if ($currentZone === null || $targetZone !== $currentZone) {
                throw new InvalidArgumentException('Blackjack action order is invalid for hand sequencing');
            }

            $dealerUpRank = strtoupper((string) ($dealerCards[0]['rank'] ?? ''));
            $hand = is_array($handsByZone[$targetZone] ?? null) ? $handsByZone[$targetZone] : [];
            $cards = is_array($hand['cards'] ?? null) ? $hand['cards'] : [];
            $isSplitHand = (bool) ($hand['isSplit'] ?? false);
            $baseZone = (string) ($hand['baseZone'] ?? '');

            switch ($action) {
                case 'insurance':
                    if ($baseZone !== $targetZone) {
                        throw new InvalidArgumentException('Insurance is allowed only on base blackjack hands');
                    }
                    if ($dealerUpRank !== 'A') {
                        throw new InvalidArgumentException('Insurance is allowed only when dealer up card is an Ace');
                    }
                    if ($this->blackjackIsNatural($cards, $isSplitHand)) {
                        throw new InvalidArgumentException('Insurance is not allowed when player has natural blackjack');
                    }
                    if (($insuranceTaken[$baseZone] ?? false) === true) {
                        throw new InvalidArgumentException('Insurance action can only be taken once per zone');
                    }
                    $insuranceTaken[$baseZone] = true;
                    break;

                case 'decline_insurance':
                    if ($baseZone !== $targetZone) {
                        throw new InvalidArgumentException('Insurance decline is allowed only on base blackjack hands');
                    }
                    if ($dealerUpRank !== 'A') {
                        throw new InvalidArgumentException('Insurance decline requires dealer up card Ace');
                    }
                    if ($this->blackjackIsNatural($cards, $isSplitHand)) {
                        throw new InvalidArgumentException('Use even money decision when player has natural blackjack');
                    }
                    break;

                case 'even_money':
                    if ($baseZone !== $targetZone) {
                        throw new InvalidArgumentException('Even money is allowed only on base blackjack hands');
                    }
                    if ($dealerUpRank !== 'A') {
                        throw new InvalidArgumentException('Even money requires dealer up card Ace');
                    }
                    if (!$this->blackjackIsNatural($cards, $isSplitHand)) {
                        throw new InvalidArgumentException('Even money requires player natural blackjack');
                    }
                    $hand['evenMoney'] = true;
                    $hand['completed'] = true;
                    $hand['standingReason'] = 'even_money';
                    $handsByZone[$targetZone] = $hand;
                    $currentIndex++;
                    break;

                case 'decline_even_money':
                    if ($baseZone !== $targetZone) {
                        throw new InvalidArgumentException('Even money decline is allowed only on base blackjack hands');
                    }
                    if ($dealerUpRank !== 'A') {
                        throw new InvalidArgumentException('Even money decline requires dealer up card Ace');
                    }
                    if (!$this->blackjackIsNatural($cards, $isSplitHand)) {
                        throw new InvalidArgumentException('Even money decline requires player natural blackjack');
                    }
                    break;

                case 'split':
                    if ($isSplitHand || !str_starts_with($targetZone, 'betZone')) {
                        throw new InvalidArgumentException('Split action is allowed only on base blackjack hands');
                    }
                    if (($splitUsed[$targetZone] ?? false) === true) {
                        throw new InvalidArgumentException('Each blackjack base hand can be split only once');
                    }
                    if (count($cards) !== 2) {
                        throw new InvalidArgumentException('Split requires exactly two cards');
                    }
                    $rankA = strtoupper((string) ($cards[0]['rank'] ?? ''));
                    $rankB = strtoupper((string) ($cards[1]['rank'] ?? ''));
                    if ($rankA === '' || $rankA !== $rankB) {
                        throw new InvalidArgumentException('Split requires a pair of equal-ranked cards');
                    }
                    $splitZones = $this->blackjackSplitZonesForBase($targetZone);
                    if ($splitZones === []) {
                        throw new InvalidArgumentException('Invalid split zone mapping');
                    }
                    $stake = $this->parseMoneyValue($hand['bet'] ?? 0, 'bets.hands.' . $targetZone . '.bet');
                    if ($stake <= 0) {
                        throw new InvalidArgumentException('Split requires a positive hand stake');
                    }

                    $first = [
                        'zone' => $splitZones[0],
                        'baseZone' => $targetZone,
                        'cards' => [$cards[0], $this->blackjackDrawDeckCard($deck)],
                        'bet' => $stake,
                        'isSplit' => true,
                        'surrendered' => false,
                        'evenMoney' => false,
                        'doubled' => false,
                        'completed' => false,
                        'standingReason' => null,
                    ];
                    $second = [
                        'zone' => $splitZones[1],
                        'baseZone' => $targetZone,
                        'cards' => [$cards[1], $this->blackjackDrawDeckCard($deck)],
                        'bet' => $stake,
                        'isSplit' => true,
                        'surrendered' => false,
                        'evenMoney' => false,
                        'doubled' => false,
                        'completed' => false,
                        'standingReason' => null,
                    ];

                    $splitUsed[$targetZone] = true;
                    $isAceSplit = $rankA === 'A';
                    if ($isAceSplit) {
                        $first['completed'] = true;
                        $first['standingReason'] = 'split_aces_auto_stand';
                        $second['completed'] = true;
                        $second['standingReason'] = 'split_aces_auto_stand';
                    }

                    unset($handsByZone[$targetZone]);
                    array_splice($playOrder, $currentIndex, 1, [$splitZones[0], $splitZones[1]]);
                    $handsByZone[$splitZones[0]] = $first;
                    $handsByZone[$splitZones[1]] = $second;

                    if ($isAceSplit) {
                        $currentIndex += 2;
                    }
                    break;

                case 'double':
                    if ((bool) ($hand['completed'] ?? false)) {
                        throw new InvalidArgumentException('Cannot double a completed blackjack hand');
                    }
                    if ((bool) ($hand['surrendered'] ?? false)) {
                        throw new InvalidArgumentException('Cannot double a surrendered blackjack hand');
                    }
                    if ((bool) ($hand['evenMoney'] ?? false)) {
                        throw new InvalidArgumentException('Cannot double an even-money blackjack hand');
                    }
                    if (count($cards) !== 2) {
                        throw new InvalidArgumentException('Double down requires exactly two cards');
                    }
                    if ((bool) ($hand['doubled'] ?? false)) {
                        throw new InvalidArgumentException('Blackjack hand has already been doubled');
                    }
                    $hand['doubled'] = true;
                    $hand['bet'] = round($this->parseMoneyValue($hand['bet'] ?? 0, 'bets.hands.' . $targetZone . '.bet') * 2);
                    $hand['cards'][] = $this->blackjackDrawDeckCard($deck);
                    $hand['completed'] = true;
                    $hand['standingReason'] = 'double_down';
                    $handsByZone[$targetZone] = $hand;
                    $currentIndex++;
                    break;

                case 'hit':
                    if ((bool) ($hand['completed'] ?? false)) {
                        throw new InvalidArgumentException('Cannot hit a completed blackjack hand');
                    }
                    if ((bool) ($hand['surrendered'] ?? false)) {
                        throw new InvalidArgumentException('Cannot hit a surrendered blackjack hand');
                    }
                    if ((bool) ($hand['evenMoney'] ?? false)) {
                        throw new InvalidArgumentException('Cannot hit an even-money blackjack hand');
                    }
                    $hand['cards'][] = $this->blackjackDrawDeckCard($deck);
                    $scoreAfterHit = $this->blackjackHandScore($hand['cards']);
                    if ($scoreAfterHit >= 21) {
                        $hand['completed'] = true;
                        $hand['standingReason'] = $scoreAfterHit > 21 ? 'bust' : 'twenty_one';
                        $currentIndex++;
                    }
                    $handsByZone[$targetZone] = $hand;
                    break;

                case 'surrender':
                    if ((bool) ($hand['completed'] ?? false)) {
                        throw new InvalidArgumentException('Cannot surrender a completed blackjack hand');
                    }
                    if (count($cards) !== 2) {
                        throw new InvalidArgumentException('Surrender requires exactly two cards');
                    }
                    if ((bool) ($hand['doubled'] ?? false)) {
                        throw new InvalidArgumentException('Cannot surrender after double down');
                    }
                    $hand['surrendered'] = true;
                    $hand['completed'] = true;
                    $hand['standingReason'] = 'surrender';
                    $handsByZone[$targetZone] = $hand;
                    $currentIndex++;
                    break;

                case 'stand':
                    if (!(bool) ($hand['completed'] ?? false)) {
                        $hand['completed'] = true;
                        $hand['standingReason'] = 'stand';
                        $handsByZone[$targetZone] = $hand;
                        $currentIndex++;
                    }
                    break;
            }

            $resolvedActions[] = [
                'action' => $action,
                'zone' => $targetZone,
                'at' => trim((string) ($entry['at'] ?? '')),
            ];
        }

        $currentIndex = $this->blackjackAdvanceToNextOpenHand($playOrder, $handsByZone, $currentIndex);
        for ($i = $currentIndex; $i < count($playOrder); $i++) {
            $zone = (string) ($playOrder[$i] ?? '');
            if ($zone === '' || !isset($handsByZone[$zone])) {
                continue;
            }
            if (!(bool) ($handsByZone[$zone]['completed'] ?? false)) {
                $handsByZone[$zone]['completed'] = true;
                $handsByZone[$zone]['standingReason'] = 'auto_stand';
            }
        }

        $allBust = true;
        $allBlackjackOrBust = true;
        foreach ($playOrder as $zone) {
            $hand = is_array($handsByZone[$zone] ?? null) ? $handsByZone[$zone] : [];
            if ($hand === []) {
                continue;
            }
            if ((bool) ($hand['surrendered'] ?? false) || (bool) ($hand['evenMoney'] ?? false)) {
                continue;
            }
            $score = $this->blackjackHandScore(is_array($hand['cards'] ?? null) ? $hand['cards'] : []);
            $isNatural = $this->blackjackIsNatural(
                is_array($hand['cards'] ?? null) ? $hand['cards'] : [],
                (bool) ($hand['isSplit'] ?? false)
            );
            if ($score <= 21) {
                $allBust = false;
            }
            if (!($score > 21 || $isNatural)) {
                $allBlackjackOrBust = false;
            }
        }

        if (!$allBust && !$allBlackjackOrBust) {
            while ($this->blackjackHandScore($dealerCards) < 17) {
                $dealerCards[] = $this->blackjackDrawDeckCard($deck);
            }
        }

        $resolvedHands = [];
        foreach ($playOrder as $zone) {
            $hand = is_array($handsByZone[$zone] ?? null) ? $handsByZone[$zone] : [];
            if ($hand === []) {
                continue;
            }
            $resolvedHands[] = [
                'zone' => (string) ($hand['zone'] ?? $zone),
                'baseZone' => (string) ($hand['baseZone'] ?? ''),
                'cards' => is_array($hand['cards'] ?? null) ? $hand['cards'] : [],
                'bet' => $this->parseMoneyValue($hand['bet'] ?? 0, 'bets.hands.' . $zone . '.bet'),
                'isSplit' => (bool) ($hand['isSplit'] ?? false),
                'surrendered' => (bool) ($hand['surrendered'] ?? false),
                'evenMoney' => (bool) ($hand['evenMoney'] ?? false),
                'doubled' => (bool) ($hand['doubled'] ?? false),
                'standingReason' => $hand['standingReason'] ?? null,
            ];
        }

        usort($resolvedHands, function (array $a, array $b): int {
            $orderA = $this->blackjackHandOrderIndex((string) ($a['zone'] ?? ''));
            $orderB = $this->blackjackHandOrderIndex((string) ($b['zone'] ?? ''));
            if ($orderA !== $orderB) {
                return $orderA <=> $orderB;
            }
            return strcmp((string) ($a['zone'] ?? ''), (string) ($b['zone'] ?? ''));
        });

        return [
            'hands' => $resolvedHands,
            'dealerCards' => $dealerCards,
            'actions' => $resolvedActions,
            'insuranceTaken' => $insuranceTaken,
            'simulationMeta' => [
                'deckCount' => $deckCount,
                'seedHash' => hash('sha256', $seed),
                'cardsUsed' => ($deckCount * 52) - count($deck),
                'cardsRemaining' => count($deck),
            ],
        ];
    }

    private function normalizeBlackjackRoundPayload(array $clientPayload): array
    {
        $zones = [
            'betZone1' => ['zone' => 'betZone1', 'main' => 0.0, 'pairs' => 0.0, 'plus21' => 0.0, 'royal' => 0.0, 'superSeven' => 0.0, 'insurance' => 0.0],
            'betZone2' => ['zone' => 'betZone2', 'main' => 0.0, 'pairs' => 0.0, 'plus21' => 0.0, 'royal' => 0.0, 'superSeven' => 0.0, 'insurance' => 0.0],
            'betZone3' => ['zone' => 'betZone3', 'main' => 0.0, 'pairs' => 0.0, 'plus21' => 0.0, 'royal' => 0.0, 'superSeven' => 0.0, 'insurance' => 0.0],
        ];

        $betBreakdown = is_array($clientPayload['betBreakdown'] ?? null) ? $clientPayload['betBreakdown'] : [];
        foreach ($betBreakdown as $idx => $entry) {
            if (!is_array($entry)) {
                continue;
            }

            $zoneName = $this->blackjackNormalizeBaseZone((string) ($entry['zone'] ?? ''));
            if ($zoneName === '') {
                continue;
            }

            $zones[$zoneName]['main'] = $this->parseMoneyValue($entry['main'] ?? ($entry['bet'] ?? 0), 'bets.betBreakdown[' . $idx . '].main');
            $zones[$zoneName]['pairs'] = $this->parseMoneyValue($entry['pairs'] ?? 0, 'bets.betBreakdown[' . $idx . '].pairs');
            $zones[$zoneName]['plus21'] = $this->parseMoneyValue($entry['plus21'] ?? 0, 'bets.betBreakdown[' . $idx . '].plus21');
            $zones[$zoneName]['royal'] = $this->parseMoneyValue($entry['royal'] ?? 0, 'bets.betBreakdown[' . $idx . '].royal');
            $zones[$zoneName]['superSeven'] = $this->parseMoneyValue($entry['superSeven'] ?? 0, 'bets.betBreakdown[' . $idx . '].superSeven');
            $zones[$zoneName]['insurance'] = $this->parseMoneyValue($entry['insurance'] ?? 0, 'bets.betBreakdown[' . $idx . '].insurance');
        }

        $actions = [];
        $rawActions = is_array($clientPayload['actions'] ?? null) ? $clientPayload['actions'] : [];
        foreach ($rawActions as $entry) {
            if (!is_array($entry)) {
                continue;
            }
            $action = strtolower(trim((string) ($entry['action'] ?? ($entry['type'] ?? ''))));
            if ($action === '') {
                continue;
            }
            $zone = $this->blackjackNormalizeHandZone((string) ($entry['zone'] ?? ($entry['hand'] ?? '')));
            $actions[] = [
                'action' => $action,
                'zone' => $zone !== '' ? $zone : null,
                'at' => trim((string) ($entry['at'] ?? ($entry['ts'] ?? ''))),
            ];
            if (count($actions) >= 256) {
                break;
            }
        }

        $rawMeta = is_array($clientPayload['roundMeta'] ?? null) ? $clientPayload['roundMeta'] : [];
        $deckCount = $this->safeNumber($rawMeta['deckCount'] ?? ($clientPayload['deckCount'] ?? null), null);
        $resolvedDeckCount = $deckCount !== null
            ? max(self::BLACKJACK_MIN_DECK_COUNT, min(self::BLACKJACK_MAX_DECK_COUNT, (int) round($deckCount)))
            : self::BLACKJACK_DEFAULT_DECK_COUNT;

        return [
            'zones' => $zones,
            'actions' => $actions,
            'clientMeta' => [
                'deckCount' => $resolvedDeckCount,
                'clientResult' => trim((string) ($clientPayload['result'] ?? '')),
                'clientNetResult' => $this->safeNumber($clientPayload['netResult'] ?? null, null),
                'submittedAt' => SqlRepository::nowUtc(),
            ],
            'rawMeta' => $rawMeta,
        ];
    }

    private function evaluateBlackjackRoundSettlement(array $normalizedPayload, string $userId, string $requestId): array
    {
        $zones = is_array($normalizedPayload['zones'] ?? null) ? $normalizedPayload['zones'] : [];
        $actions = is_array($normalizedPayload['actions'] ?? null) ? $normalizedPayload['actions'] : [];
        $clientMeta = is_array($normalizedPayload['clientMeta'] ?? null) ? $normalizedPayload['clientMeta'] : [];

        $deckCount = (int) ($clientMeta['deckCount'] ?? self::BLACKJACK_DEFAULT_DECK_COUNT);
        if ($deckCount < self::BLACKJACK_MIN_DECK_COUNT || $deckCount > self::BLACKJACK_MAX_DECK_COUNT) {
            $deckCount = self::BLACKJACK_DEFAULT_DECK_COUNT;
        }

        $simulation = $this->simulateBlackjackRound($zones, $actions, $userId, $requestId, $deckCount);
        $hands = is_array($simulation['hands'] ?? null) ? $simulation['hands'] : [];
        $dealerCards = is_array($simulation['dealerCards'] ?? null) ? $simulation['dealerCards'] : [];
        $resolvedActions = is_array($simulation['actions'] ?? null) ? $simulation['actions'] : [];
        $insuranceTaken = is_array($simulation['insuranceTaken'] ?? null) ? $simulation['insuranceTaken'] : [];
        $simulationMeta = is_array($simulation['simulationMeta'] ?? null) ? $simulation['simulationMeta'] : [];

        if ($hands === []) {
            throw new InvalidArgumentException('Blackjack hand data is required');
        }
        if ($dealerCards === []) {
            throw new InvalidArgumentException('Dealer cards are required to settle blackjack');
        }

        $dealerScore = $this->blackjackHandScore($dealerCards);
        $dealerBlackjack = count($dealerCards) === 2 && $dealerScore === 21;
        $dealerBust = $dealerScore > 21;

        $mainWager = 0.0;
        $mainReturn = 0.0;
        $handResults = [];
        $handsByBaseZone = ['betZone1' => [], 'betZone2' => [], 'betZone3' => []];

        foreach ($hands as $idx => $hand) {
            if (!is_array($hand)) {
                continue;
            }

            $zone = (string) ($hand['zone'] ?? '');
            $baseZone = (string) ($hand['baseZone'] ?? '');
            if ($zone === '' || $baseZone === '') {
                throw new InvalidArgumentException('Invalid blackjack hand zone data');
            }

            $cards = is_array($hand['cards'] ?? null) ? $hand['cards'] : [];
            if (count($cards) < 2 || count($cards) > 12) {
                throw new InvalidArgumentException('Blackjack hands must contain between 2 and 12 cards');
            }

            $bet = $this->parseMoneyValue($hand['bet'] ?? 0, 'bets.hands[' . $idx . '].bet');
            if ($bet <= 0) {
                continue;
            }

            $isSplit = (bool) ($hand['isSplit'] ?? false);
            $isSurrendered = (bool) ($hand['surrendered'] ?? false);
            $isEvenMoney = (bool) ($hand['evenMoney'] ?? false);

            $playerScore = $this->blackjackHandScore($cards);
            $playerBust = $playerScore > 21;
            $playerBlackjack = $this->blackjackIsNatural($cards, $isSplit);

            $handReturn = 0.0;
            $resultType = 'lose';

            if ($isSurrendered) {
                $handReturn = round($bet * 0.5);
                $resultType = 'surrender';
            } elseif ($isEvenMoney && $playerBlackjack) {
                $handReturn = round($bet * 2);
                $resultType = 'even_money';
            } elseif ($playerBust) {
                $handReturn = 0.0;
                $resultType = 'bust';
            } elseif ($dealerBlackjack) {
                if ($playerBlackjack) {
                    $handReturn = $bet;
                    $resultType = 'push';
                } else {
                    $handReturn = 0.0;
                    $resultType = 'dealer_blackjack';
                }
            } elseif ($playerBlackjack) {
                $handReturn = round($bet * 2.5);
                $resultType = 'blackjack';
            } elseif ($dealerBust || $playerScore > $dealerScore) {
                $handReturn = round($bet * 2);
                $resultType = 'win';
            } elseif ($playerScore === $dealerScore) {
                $handReturn = $bet;
                $resultType = 'push';
            } else {
                $handReturn = 0.0;
                $resultType = 'lose';
            }

            $mainWager = round($mainWager + $bet);
            $mainReturn = round($mainReturn + $handReturn);
            $handResult = [
                'zone' => $zone,
                'baseZone' => $baseZone,
                'cards' => array_values(array_map(static fn(array $card): string => (string) ($card['code'] ?? ''), $cards)),
                'score' => $playerScore,
                'bet' => $bet,
                'return' => $handReturn,
                'net' => round($handReturn - $bet),
                'isSplit' => $isSplit,
                'resultType' => $resultType,
            ];
            $handResults[] = $handResult;
            $handsByBaseZone[$baseZone][] = array_merge($hand, ['resultType' => $resultType, 'score' => $playerScore]);
        }

        if ($mainWager <= 0) {
            throw new InvalidArgumentException('Blackjack wager must be greater than zero');
        }

        $sideWager = 0.0;
        $sideReturn = 0.0;
        $sideBetResults = [];
        $betBreakdown = [];

        foreach (['betZone1', 'betZone2', 'betZone3'] as $zoneName) {
            $zoneBets = is_array($zones[$zoneName] ?? null) ? $zones[$zoneName] : [
                'zone' => $zoneName,
                'main' => 0.0,
                'pairs' => 0.0,
                'plus21' => 0.0,
                'royal' => 0.0,
                'superSeven' => 0.0,
                'insurance' => 0.0,
            ];

            $zoneHands = is_array($handsByBaseZone[$zoneName] ?? null) ? $handsByBaseZone[$zoneName] : [];
            $fallbackMainStake = 0.0;
            if ($zoneHands !== []) {
                foreach ($zoneHands as $zoneHand) {
                    if ((bool) ($zoneHand['isSplit'] ?? false)) {
                        continue;
                    }
                    $fallbackMainStake = $this->parseMoneyValue($zoneHand['bet'] ?? 0, 'bets.hands.mainFallback');
                    break;
                }
                if ($fallbackMainStake <= 0) {
                    $fallbackMainStake = $this->parseMoneyValue($zoneHands[0]['bet'] ?? 0, 'bets.hands.mainFallback');
                }
            }

            $mainStake = $this->parseMoneyValue($zoneBets['main'] ?? $fallbackMainStake, 'bets.zones.' . $zoneName . '.main');
            if ($mainStake <= 0 && $fallbackMainStake > 0) {
                $mainStake = $fallbackMainStake;
            }
            $pairsStake = $this->parseMoneyValue($zoneBets['pairs'] ?? 0, 'bets.zones.' . $zoneName . '.pairs');
            $plusStake = $this->parseMoneyValue($zoneBets['plus21'] ?? 0, 'bets.zones.' . $zoneName . '.plus21');
            $royalStake = $this->parseMoneyValue($zoneBets['royal'] ?? 0, 'bets.zones.' . $zoneName . '.royal');
            $superStake = $this->parseMoneyValue($zoneBets['superSeven'] ?? 0, 'bets.zones.' . $zoneName . '.superSeven');
            $insuranceStake = $this->parseMoneyValue($zoneBets['insurance'] ?? 0, 'bets.zones.' . $zoneName . '.insurance');

            foreach ([$pairsStake, $plusStake, $royalStake, $superStake] as $stake) {
                if ($stake > 100.0) {
                    throw new InvalidArgumentException('Side bets cannot exceed $100.00 per zone');
                }
            }
            if ($insuranceStake > 0 && $insuranceStake > round($mainStake / 2)) {
                throw new InvalidArgumentException('Insurance bet cannot exceed half of the main bet');
            }

            $insuranceAccepted = (bool) ($insuranceTaken[$zoneName] ?? false);
            if ($insuranceStake > 0 && !$insuranceAccepted) {
                throw new InvalidArgumentException('Insurance wager requires a matching insurance action');
            }
            if ($insuranceAccepted && $insuranceStake <= 0) {
                throw new InvalidArgumentException('Insurance action requires an insurance stake');
            }

            if ($mainStake <= 0 && ($pairsStake > 0 || $plusStake > 0 || $royalStake > 0 || $superStake > 0 || $insuranceStake > 0)) {
                throw new InvalidArgumentException('Side bets require a main bet in the same zone');
            }

            $referenceHand = null;
            foreach ($zoneHands as $zoneHand) {
                if (!(bool) ($zoneHand['isSplit'] ?? false)) {
                    $referenceHand = $zoneHand;
                    break;
                }
            }
            if ($referenceHand === null && $zoneHands !== []) {
                $referenceHand = $zoneHands[0];
            }

            $referenceCards = is_array($referenceHand['cards'] ?? null) ? $referenceHand['cards'] : [];
            $firstTwo = array_slice($referenceCards, 0, 2);
            $dealerUpCard = $dealerCards[0] ?? null;
            $baseNatural = $referenceHand !== null
                ? $this->blackjackIsNatural(
                    is_array($referenceHand['cards'] ?? null) ? $referenceHand['cards'] : [],
                    (bool) ($referenceHand['isSplit'] ?? false)
                )
                : false;

            $zoneCombinedCards = [];
            foreach ($zoneHands as $zoneHand) {
                $zoneCombinedCards = array_merge(
                    $zoneCombinedCards,
                    is_array($zoneHand['cards'] ?? null) ? $zoneHand['cards'] : []
                );
            }

            $zoneSideReturn = 0.0;
            $zoneSideWager = 0.0;

            if ($pairsStake > 0) {
                $zoneSideWager += $pairsStake;
                $pairReturn = 0.0;
                $pairOutcome = 'lose';
                if (count($firstTwo) === 2) {
                    $rankA = strtoupper((string) ($firstTwo[0]['rank'] ?? ''));
                    $rankB = strtoupper((string) ($firstTwo[1]['rank'] ?? ''));
                    if ($rankA !== '' && $rankA === $rankB) {
                        $suitA = (string) ($firstTwo[0]['suit'] ?? '');
                        $suitB = (string) ($firstTwo[1]['suit'] ?? '');
                        if ($suitA !== '' && $suitA === $suitB) {
                            $pairReturn = round($pairsStake * 26);
                            $pairOutcome = 'perfect_pair';
                        } elseif ($this->blackjackCardColor($firstTwo[0]) === $this->blackjackCardColor($firstTwo[1])) {
                            $pairReturn = round($pairsStake * 13);
                            $pairOutcome = 'colored_pair';
                        } else {
                            $pairReturn = round($pairsStake * 6);
                            $pairOutcome = 'mixed_pair';
                        }
                    }
                }
                $zoneSideReturn += $pairReturn;
                $sideBetResults[] = [
                    'zone' => $zoneName,
                    'type' => 'pairs',
                    'stake' => $pairsStake,
                    'return' => $pairReturn,
                    'net' => round($pairReturn - $pairsStake),
                    'outcome' => $pairOutcome,
                ];
            }

            if ($plusStake > 0) {
                $zoneSideWager += $plusStake;
                $plusReturn = 0.0;
                $plusOutcome = 'lose';
                if (count($firstTwo) === 2 && $dealerUpCard !== null) {
                    $three = [$firstTwo[0], $firstTwo[1], $dealerUpCard];
                    $ranks = array_map(static fn(array $card): string => strtoupper((string) ($card['rank'] ?? '')), $three);
                    $suits = array_map(static fn(array $card): string => (string) ($card['suit'] ?? ''), $three);
                    $isTrips = count(array_unique($ranks)) === 1;
                    $isFlush = count(array_unique($suits)) === 1;
                    $isStraight = $this->blackjackIsThreeCardStraight($three);

                    if ($isTrips && $isFlush) {
                        $plusReturn = round($plusStake * 101);
                        $plusOutcome = 'suited_trips';
                    } elseif ($isTrips) {
                        $plusReturn = round($plusStake * 31);
                        $plusOutcome = 'trips';
                    } elseif ($isStraight && $isFlush) {
                        $plusReturn = round($plusStake * 41);
                        $plusOutcome = 'straight_flush';
                    } elseif ($isStraight) {
                        $plusReturn = round($plusStake * 11);
                        $plusOutcome = 'straight';
                    } elseif ($isFlush) {
                        $plusReturn = round($plusStake * 6);
                        $plusOutcome = 'flush';
                    }
                }
                $zoneSideReturn += $plusReturn;
                $sideBetResults[] = [
                    'zone' => $zoneName,
                    'type' => 'plus21',
                    'stake' => $plusStake,
                    'return' => $plusReturn,
                    'net' => round($plusReturn - $plusStake),
                    'outcome' => $plusOutcome,
                ];
            }

            if ($royalStake > 0) {
                $zoneSideWager += $royalStake;
                $royalReturn = 0.0;
                $royalOutcome = 'lose';
                if (count($firstTwo) === 2) {
                    $ranks = [
                        strtoupper((string) ($firstTwo[0]['rank'] ?? '')),
                        strtoupper((string) ($firstTwo[1]['rank'] ?? '')),
                    ];
                    $isSuited = (string) ($firstTwo[0]['suit'] ?? '') !== ''
                        && (string) ($firstTwo[0]['suit'] ?? '') === (string) ($firstTwo[1]['suit'] ?? '');
                    $hasKQ = in_array('K', $ranks, true) && in_array('Q', $ranks, true);
                    if ($hasKQ && $isSuited) {
                        $royalReturn = round($royalStake * 26);
                        $royalOutcome = 'royal_match';
                    } elseif ($isSuited) {
                        $royalReturn = round($royalStake * 6);
                        $royalOutcome = 'suited';
                    }
                }
                $zoneSideReturn += $royalReturn;
                $sideBetResults[] = [
                    'zone' => $zoneName,
                    'type' => 'royal',
                    'stake' => $royalStake,
                    'return' => $royalReturn,
                    'net' => round($royalReturn - $royalStake),
                    'outcome' => $royalOutcome,
                ];
            }

            if ($superStake > 0) {
                $zoneSideWager += $superStake;
                $superReturn = 0.0;
                $superOutcome = 'lose';
                $cardsForSuper = $zoneCombinedCards;
                if ($dealerUpCard !== null) {
                    $cardsForSuper[] = $dealerUpCard;
                }
                $sevens = array_values(array_filter(
                    $cardsForSuper,
                    static fn(array $card): bool => strtoupper((string) ($card['rank'] ?? '')) === '7'
                ));
                $sevenCount = count($sevens);
                if ($sevenCount === 1) {
                    $superReturn = round($superStake * 4);
                    $superOutcome = 'one_seven';
                } elseif ($sevenCount === 2) {
                    $sameSuit = (string) ($sevens[0]['suit'] ?? '') !== ''
                        && (string) ($sevens[0]['suit'] ?? '') === (string) ($sevens[1]['suit'] ?? '');
                    if ($sameSuit) {
                        $superReturn = round($superStake * 101);
                        $superOutcome = 'two_sevens_suited';
                    } else {
                        $superReturn = round($superStake * 51);
                        $superOutcome = 'two_sevens_unsuited';
                    }
                } elseif ($sevenCount >= 3) {
                    $suits = array_values(array_map(static fn(array $card): string => (string) ($card['suit'] ?? ''), $sevens));
                    $allSameSuit = count(array_unique($suits)) === 1;
                    if ($allSameSuit) {
                        $superReturn = round($superStake * 5001);
                        $superOutcome = 'three_sevens_suited';
                    } else {
                        $superReturn = round($superStake * 501);
                        $superOutcome = 'three_sevens_unsuited';
                    }
                }
                $zoneSideReturn += $superReturn;
                $sideBetResults[] = [
                    'zone' => $zoneName,
                    'type' => 'superSeven',
                    'stake' => $superStake,
                    'return' => $superReturn,
                    'net' => round($superReturn - $superStake),
                    'outcome' => $superOutcome,
                ];
            }

            if ($insuranceStake > 0) {
                $zoneSideWager += $insuranceStake;
                $insuranceReturn = 0.0;
                $insuranceOutcome = 'lose';
                if ($dealerBlackjack && !$baseNatural) {
                    $insuranceReturn = round($insuranceStake * 3);
                    $insuranceOutcome = 'win';
                }
                $zoneSideReturn += $insuranceReturn;
                $sideBetResults[] = [
                    'zone' => $zoneName,
                    'type' => 'insurance',
                    'stake' => $insuranceStake,
                    'return' => $insuranceReturn,
                    'net' => round($insuranceReturn - $insuranceStake),
                    'outcome' => $insuranceOutcome,
                ];
            }

            $sideWager = round($sideWager + $zoneSideWager);
            $sideReturn = round($sideReturn + $zoneSideReturn);

            $betBreakdown[] = [
                'zone' => $zoneName,
                'main' => $mainStake,
                'pairs' => $pairsStake,
                'plus21' => $plusStake,
                'royal' => $royalStake,
                'superSeven' => $superStake,
                'insurance' => $insuranceStake,
                'hands' => count($zoneHands),
            ];
        }

        $totalWager = round($mainWager + $sideWager);
        $totalReturn = round($mainReturn + $sideReturn);
        $netResult = round($totalReturn - $totalWager);
        $profit = round(max(0, $netResult));

        $result = $netResult > 0 ? 'Win' : ($netResult < 0 ? 'Lose' : 'Push');
        $resultType = 'standard';
        $handResultTypes = array_values(array_map(static fn(array $hand): string => (string) ($hand['resultType'] ?? ''), $handResults));
        if ($result === 'Push') {
            $resultType = 'push';
        } elseif ($result === 'Win' && in_array('blackjack', $handResultTypes, true)) {
            $resultType = 'blackjack';
        } elseif (in_array('surrender', $handResultTypes, true) && $result === 'Lose') {
            $resultType = 'surrender';
        } elseif ($result === 'Lose' && $handResultTypes !== [] && count(array_unique($handResultTypes)) === 1 && $handResultTypes[0] === 'bust') {
            $resultType = 'bust';
        }

        $playerCards = [];
        foreach ($handResults as $handResult) {
            foreach ($handResult['cards'] as $cardCode) {
                $playerCards[] = (string) $cardCode;
            }
        }

        $dealerCardCodes = array_values(array_map(static fn(array $card): string => (string) ($card['code'] ?? ''), $dealerCards));
        $betDetails = [
            'hands' => $handResults,
            'sideBets' => $sideBetResults,
            'dealer' => [
                'cards' => $dealerCardCodes,
                'score' => $dealerScore,
                'blackjack' => $dealerBlackjack,
                'bust' => $dealerBust,
            ],
            'actions' => $resolvedActions,
        ];

        $roundMeta = [
            'version' => 'blackjack_settlement_v3',
            'dealer' => $betDetails['dealer'],
            'hands' => $handResults,
            'sideBets' => $sideBetResults,
            'actions' => $resolvedActions,
            'simulation' => $simulationMeta,
            'clientMeta' => $clientMeta,
        ];

        return [
            'totalWager' => $totalWager,
            'totalReturn' => $totalReturn,
            'netResult' => $netResult,
            'profit' => $profit,
            'result' => $result,
            'resultType' => $resultType,
            'betBreakdown' => $betBreakdown,
            'betDetails' => $betDetails,
            'roundMeta' => $roundMeta,
            'playerCards' => $playerCards,
            'dealerCards' => $dealerCardCodes,
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
            'totalWager' => round($totalWager),
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
                $totalReturn += round($entry['amount'] * $entry['returnMultiplier']);
                $winningBetKeys[] = (string) $entry['key'];
            }
        }

        return [
            'totalReturn' => round($totalReturn),
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
            'roundId' => (string) ($betRecord['roundId'] ?? $betRecord['id'] ?? ''),
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
            $targetReturn = round(($anteBet * 3) * ($configuredRtp / 100));
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
            'totalReturn' => round($totalReturn),
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
            return round(($anteBet * 2) + ($anteBet * 2));
        }

        if ($result === 'Player') {
            $raiseBet = $anteBet * 2;
            $multiplier = self::STUD_POKER_PAYOUTS[$playerEval['name']] ?? 1;
            return round($raiseBet + ($raiseBet * $multiplier) + $raiseBet);
        }

        return round($anteBet + ($anteBet * 2));
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
                'id' => $roundId,
                'roundId' => $roundId,
                'game' => self::STUD_POKER_GAME_SLUG,
                'rngVersion' => self::STUD_POKER_RNG_VERSION,
                'createdAt' => SqlRepository::nowUtc(),
            ], $updates);
            $this->db->insertOne('casino_round_audit', $payload);
            return;
        }

        $this->db->updateOne('casino_round_audit', ['id' => SqlRepository::id($roundId)], $updates);
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

            return strcmp((string) ($a['id'] ?? ''), (string) ($b['id'] ?? ''));
        });

        return $entries;
    }

    private function mapLedgerEntry(array $entry): array
    {
        return [
            'id' => (string) ($entry['id'] ?? ''),
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
        $balanceBefore = $this->num($bet['balanceBefore'] ?? 0);
        $balanceAfter = $this->num($bet['balanceAfter'] ?? 0);
        $pendingBalanceSnapshot = $this->safeNumber($bet['pendingBalanceSnapshot'] ?? null, null);
        $availableBalanceBefore = $this->safeNumber($bet['availableBalanceBefore'] ?? null, null);
        $availableBalanceAfter = $this->safeNumber($bet['availableBalanceAfter'] ?? null, null);

        if ($availableBalanceBefore === null && $pendingBalanceSnapshot !== null) {
            $availableBalanceBefore = round(max(0, $balanceBefore - $pendingBalanceSnapshot));
        }
        if ($availableBalanceAfter === null && $pendingBalanceSnapshot !== null) {
            $availableBalanceAfter = round(max(0, $balanceAfter - $pendingBalanceSnapshot));
        }
        if ($availableBalanceBefore === null) {
            $availableBalanceBefore = $balanceBefore;
        }
        if ($availableBalanceAfter === null) {
            $availableBalanceAfter = $balanceAfter;
        }

        return [
            'id' => (string) ($bet['id'] ?? ''),
            'roundId' => (string) ($bet['roundId'] ?? $bet['id'] ?? ''),
            'requestId' => (string) ($bet['requestId'] ?? ''),
            'userId' => (string) ($bet['userId'] ?? ''),
            'username' => (string) ($bet['username'] ?? ''),
            'game' => (string) ($bet['game'] ?? ''),
            'bets' => is_array($bet['bets'] ?? null) ? $bet['bets'] : [],
            'playerCards' => is_array($bet['playerCards'] ?? null) ? $bet['playerCards'] : [],
            'dealerCards' => is_array($bet['dealerCards'] ?? null) ? $bet['dealerCards'] : [],
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
            'betLimits' => is_array($bet['betLimits'] ?? null) ? $bet['betLimits'] : null,
            'betDetails' => is_array($bet['betDetails'] ?? null) ? $bet['betDetails'] : null,
            'roundData' => is_array($bet['roundData'] ?? null) ? $bet['roundData'] : null,
            'outcomeSource' => (string) ($bet['outcomeSource'] ?? ''),
            'playerOutcome' => $this->deriveCasinoPlayerOutcome($bet),
            'result' => (string) ($bet['result'] ?? ''),
            'resultType' => (string) ($bet['resultType'] ?? ''),
            'totalWager' => $this->num($bet['totalWager'] ?? 0),
            'totalReturn' => $this->num($bet['totalReturn'] ?? 0),
            'profit' => $this->num($bet['profit'] ?? 0),
            'netResult' => $this->num($bet['netResult'] ?? 0),
            'balanceBefore' => $balanceBefore,
            'balanceAfter' => $balanceAfter,
            'availableBalanceBefore' => round(max(0, $availableBalanceBefore)),
            'availableBalanceAfter' => round(max(0, $availableBalanceAfter)),
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
            'betDetails' => is_array($audit['betDetails'] ?? null) ? $audit['betDetails'] : null,
            'createdAt' => $audit['createdAt'] ?? null,
        ] : null;

        return $row;
    }

    private function formatCasinoBetResponse(array $betRecord, array $ledgerEntries, bool $idempotent): array
    {
        $mappedLedger = array_map(fn (array $entry): array => $this->mapLedgerEntry($entry), $ledgerEntries);
        $roundId = (string) ($betRecord['roundId'] ?? $betRecord['id'] ?? '');
        $balanceBefore = $this->num($betRecord['balanceBefore'] ?? 0);
        $balanceAfter = $this->num($betRecord['balanceAfter'] ?? 0);
        $pendingBalanceSnapshot = $this->safeNumber($betRecord['pendingBalanceSnapshot'] ?? null, null);
        $availableBalanceBefore = $this->safeNumber($betRecord['availableBalanceBefore'] ?? null, null);
        $availableBalanceAfter = $this->safeNumber($betRecord['availableBalanceAfter'] ?? null, null);
        if ($availableBalanceBefore === null && $pendingBalanceSnapshot !== null) {
            $availableBalanceBefore = round(max(0, $balanceBefore - $pendingBalanceSnapshot));
        }
        if ($availableBalanceBefore === null) {
            $availableBalanceBefore = $balanceBefore;
        }
        if ($availableBalanceAfter === null) {
            if ($pendingBalanceSnapshot !== null) {
                $availableBalanceAfter = round(max(0, $balanceAfter - $pendingBalanceSnapshot));
            }
        }
        if ($availableBalanceAfter === null) {
            $availableBalanceAfter = $balanceAfter;
        }
        $availableBalanceBefore = round(max(0, $availableBalanceBefore));
        $availableBalanceAfter = round(max(0, $availableBalanceAfter));

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
            'betLimits' => is_array($betRecord['betLimits'] ?? null) ? $betRecord['betLimits'] : null,
            'betDetails' => is_array($betRecord['betDetails'] ?? null) ? $betRecord['betDetails'] : null,
            'roundData' => is_array($betRecord['roundData'] ?? null) ? $betRecord['roundData'] : null,
            'outcomeSource' => (string) ($betRecord['outcomeSource'] ?? ''),
            'playerOutcome' => $this->deriveCasinoPlayerOutcome($betRecord),
            'bets' => is_array($betRecord['bets'] ?? null) ? $betRecord['bets'] : [],
            'totalWager' => $this->num($betRecord['totalWager'] ?? 0),
            'totalReturn' => $this->num($betRecord['totalReturn'] ?? 0),
            'profit' => $this->num($betRecord['profit'] ?? 0),
            'netResult' => $this->num($betRecord['netResult'] ?? 0),
            'resultType' => (string) ($betRecord['resultType'] ?? ''),
            'balanceBefore' => $balanceBefore,
            'balanceAfter' => $balanceAfter,
            'availableBalanceBefore' => $availableBalanceBefore,
            'availableBalanceAfter' => $availableBalanceAfter,
            'availableBalance' => $availableBalanceAfter,
            'walletBalance' => $availableBalanceAfter,
            'playableBalance' => $availableBalanceAfter,
            'newBalance' => $availableBalanceAfter,
            'balanceSource' => 'availableBalance',
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
        if ($slug === self::JURASSIC_RUN_GAME_SLUG) {
            return [1.0, 5000.0];
        }
        
        $game = $this->db->findOne('casinogames', ['slug' => $slug]);
        $min = $this->safeNumber($game['minBet'] ?? null, $fallbackMin);
        $max = $this->safeNumber($game['maxBet'] ?? null, $fallbackMax);

        $resolvedMin = $min !== null && $min > 0 ? round($min) : round($fallbackMin);
        $resolvedMax = $max !== null && $max > 0 ? round($max) : round($fallbackMax);
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
        $rounded = round($amount);
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

    private function deterministicRoundId(string $scope, string $ownerId, string $requestId): string
    {
        $normalizedScope = strtolower(trim($scope));
        return substr(hash('sha256', $normalizedScope . '|' . $ownerId . '|' . $requestId), 0, 24);
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
            Response::json(['message' => 'Not authorized'], 401);
            return null;
        }

        $role = (string) ($decoded['role'] ?? 'user');
        $id = (string) ($decoded['id'] ?? '');
        if ($id === '' || preg_match('/^[a-f0-9]{24}$/i', $id) !== 1) {
            Response::json(['message' => 'Not authorized, token failed: invalid user id'], 401);
            return null;
        }

        $collection = $this->collectionByRole($role);
        $actor = $this->db->findOne($collection, ['id' => SqlRepository::id($id)]);
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
            Response::json(['message' => 'Not authorized'], 401);
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
                'id' => $id,
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
                'metadata' => is_array($game['metadata'] ?? null) ? $game['metadata'] : new stdClass(),
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
            'id' => $game['id'] ?? null,
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
            'metadata' => is_array($game['metadata'] ?? null) ? $game['metadata'] : new stdClass(),
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
