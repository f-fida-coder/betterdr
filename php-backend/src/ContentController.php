<?php

declare(strict_types=1);


final class ContentController
{
    private SqlRepository $db;
    private string $jwtSecret;

    /**
     * PLATFORM RULES v1 (pre-split "House Rules") — player-facing terms
     * copy approved 2026-07-17: wagers, settlement, parlays, live betting.
     * Every item states behavior the platform actually ENFORCES (settlement
     * engine, acceptance policy, teaser/parlay gates, freeplay math); when
     * enforced behavior changes, update the matching item AND bump
     * OnboardingPolicy::RULES_VERSIONS['platform_rules'] so players
     * re-accept at next login. Seeded into the same `rules` collection the
     * admin Rules panel manages, so copy edits after seeding are admin-UI
     * work, not deploys. Shape matches the admin CRUD: { title, items[],
     * status, ruleSet } (+ order for display). Docs WITHOUT a ruleSet field
     * (everything seeded before the 2026-07-22 two-set split) are
     * platform_rules by definition — normalized on read, never migrated.
     */
    private const DEFAULT_PLATFORM_RULES = [
        [
            'title' => 'General',
            'order' => 1,
            'status' => 'active',
            'items' => [
                'All wagers are final once confirmed. Tickets cannot be changed or cancelled by the player after acceptance.',
                'Minimum and maximum wager amounts are set per account and shown on your bet slip.',
                'If a game is cancelled, or postponed and not completed, wagers on it are void and stakes are refunded.',
                'Management reserves the right to void any wager accepted at an obviously incorrect price or line (palpable error), with the stake refunded.',
                'Odds are displayed in American format by default; you can change the format in Account, under Preferences.',
            ],
        ],
        [
            'title' => 'Prices and Line Changes',
            'order' => 2,
            'status' => 'active',
            'items' => [
                'Prices may move between the time a line is displayed and the time your bet is submitted.',
                'If the price moves in your favor, your bet is accepted at the better price automatically.',
                'If the price moves against you, acceptance is governed by your Odds Acceptance preference (Account, under Odds Acceptance); otherwise you will be asked to re-confirm at the new price.',
                'If the line itself (the points, for example a total moving from 8.5 to 9) changes before your bet reaches us, the bet is rejected and must be re-placed at the current line. A wager is never booked at a different line than the one you clicked.',
            ],
        ],
        [
            'title' => 'Settlement',
            'order' => 3,
            'status' => 'active',
            'items' => [
                'Wagers are graded on official final results from our data provider. Settlement is automatic and normally completes within minutes of the final.',
                'A spread or total landing exactly on the line is a push: the wager is void and the stake refunded.',
                'Winnings are credited in whole dollars.',
                'Any settlement dispute should be raised through Support with your ticket number.',
            ],
        ],
        [
            'title' => 'Period, Half, Quarter and Inning Markets',
            'order' => 4,
            'status' => 'active',
            'items' => [
                'Segment markets (1st Quarter, 1st Half, First 5 Innings, periods, sets) are graded only on the score of that segment. The final score of the game is not relevant.',
                'The full segment must be completed for the wager to have action.',
                'A moneyline tie within a segment (for example, tied after 5 innings on a First 5 Innings moneyline) is a push: void and refunded.',
                'If official segment scoring never becomes available for a completed game, the wager is voided and the stake refunded.',
            ],
        ],
        [
            'title' => 'Baseball',
            'order' => 5,
            'status' => 'active',
            'items' => [
                'Listed pitchers: by default your wager is conditional on both listed starting pitchers. If a listed starter is changed, the wager is void, unless you selected Action on that pitcher, in which case the bet stands regardless.',
                'Official game: full-game moneyline, run line and total wagers have action once the game is official (9 innings, or 8 and a half with the home team ahead). A game called before becoming official is void and refunded.',
                'First 5 Innings (F5) markets are graded on the score after 5 complete innings and require 5 full innings to be played.',
            ],
        ],
        [
            'title' => 'Soccer',
            'order' => 6,
            'status' => 'active',
            'items' => [
                'All soccer wagers are for regulation time plus added (injury) time only, unless the market states otherwise. Extra time and penalty shootouts do not count.',
            ],
        ],
        [
            'title' => 'Parlays and Round Robins',
            'order' => 7,
            'status' => 'active',
            'items' => [
                'Parlays may combine 2 to 8 selections.',
                'If a parlay leg is void or pushes, the parlay reduces to the remaining legs and the payout is recalculated at the remaining odds.',
                'Combinations from the same game are accepted where offered; same-game parlays are priced with a correlation adjustment reflected in your quoted payout.',
                'The maximum payout on a parlay-type ticket is $5,000 unless otherwise agreed on your account.',
                'In a Round Robin, every combination is a separate parlay, graded and payout-capped independently.',
            ],
        ],
        [
            'title' => 'Teasers',
            'order' => 8,
            'status' => 'active',
            'items' => [
                'Teasers are available on football and basketball only, and may include spreads and totals only, on full-game lines only (no segment markets).',
                'Tie handling on a teaser leg follows the ties rule of the teaser type shown at placement.',
            ],
        ],
        [
            'title' => 'Live Betting',
            'order' => 9,
            'status' => 'active',
            'items' => [
                'Live prices and lines change continuously; live wagers are subject to the same price and line-change rules as pre-game wagers.',
                'Betting may be suspended on any market at any time without notice.',
                'A wager accepted on a game that had in fact already finished is void and refunded.',
            ],
        ],
        [
            'title' => 'Player Props',
            'order' => 10,
            'status' => 'active',
            'items' => [
                'Player prop wagers are graded on official league statistics for the named player.',
                'Props that cannot settle automatically are graded manually against the official box score.',
            ],
        ],
        [
            'title' => 'Freeplay',
            'order' => 11,
            'status' => 'active',
            'items' => [
                'Freeplay stakes are not returned with winnings: a winning freeplay wager pays profit only.',
                'Freeplay balances cannot be withdrawn and may carry an expiry date shown in your account.',
            ],
        ],
        [
            'title' => 'Responsible Gaming',
            'order' => 12,
            'status' => 'active',
            'items' => [
                'Deposit and wagering limits, cooling-off periods and self-exclusion are available; contact Support or use your account settings.',
                'If gambling stops being fun, stop. Help is available.',
            ],
        ],
    ];

    /**
     * HOUSE RULES v1 — the second acceptance set. Copy provided verbatim by
     * management (Fida) 2026-07-22; edits after seeding are admin-panel
     * work. When this copy changes materially, update here AND bump
     * OnboardingPolicy::RULES_VERSIONS['house_rules'] so players re-accept
     * at their next login.
     */
    private const DEFAULT_HOUSE_RULES = [
        [
            'title' => 'Payouts',
            'order' => 1,
            'status' => 'active',
            'ruleSet' => OnboardingPolicy::SET_HOUSE,
            'items' => [
                'Pay-ins are due Tuesday.',
                'Payouts are Tuesday/Wednesday by end of day.',
                'Week runs Tuesday to Monday night.',
                'Settle-ups are +/-$200; anything under $200 pushes to the following week.',
                "If your account is inactive for 2 weeks, you'll be required to settle your balance even if it's under $200.",
                'Players must wager $500 of their own money (or go through one settle-up) to collect their first payout. Freeplay and Casino wagers do not count toward this.',
                'Max weekly payouts are $5,000 or 2–3x your credit limit, depending on account size. Any remaining balance rolls to the following week.',
                'Players must have multiple payment apps available to make payouts easier for everyone.',
                'If you pay late or not in full, we reserve the right to do the same when you win.',
                'Please be quick and responsive on payday so everyone can be paid out in full and on time.',
                'If you cannot pay, let your agent know so a payment plan can be set up.',
            ],
        ],
        [
            'title' => 'Freeplay',
            'order' => 2,
            'status' => 'active',
            'ruleSet' => OnboardingPolicy::SET_HOUSE,
            'items' => [
                'Players receive 20% freeplay when their balance is paid in full and on time.',
                'Freeplay is limited to straight bets only.',
                'Freeplay stakes are not returned on a push — only on a canceled bet.',
            ],
        ],
        [
            'title' => 'Referrals',
            'order' => 3,
            'status' => 'active',
            'ruleSet' => OnboardingPolicy::SET_HOUSE,
            'items' => [
                '$200 freeplay bonus for active, trustworthy referrals.',
                "You are responsible for your referral's debt if they don't pay, and vice versa.",
                'To receive your freeplay bonus, your referral must complete one settle-up of at least $200.',
            ],
        ],
        [
            'title' => 'Rules',
            'order' => 4,
            'status' => 'active',
            'ruleSet' => OnboardingPolicy::SET_HOUSE,
            'items' => [
                'No bots, VPNs, or sharp play — no exceptions.',
                'IT monitoring is in place to detect cheating.',
                'Multiple people logging into the same account, multiple accounts on the same IP, or automated bet-placement systems will result in removal from the platform without payout.',
            ],
        ],
    ];

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

    public function __construct(SqlRepository $db, string $jwtSecret)
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
        if ($method === 'GET' && $path === '/api/content/rules') {
            $this->getRules();
            return true;
        }
        return false;
    }

    /**
     * Player-facing rules, BOTH sets — read by the onboarding gate's
     * acceptance steps and by the always-available Rules reference page.
     * Serves the SAME `rules` collection the admin Rules panel manages
     * (active docs only), self-seeding each set independently when absent —
     * the same pattern tutorials/FAQs use, so no migration script is needed
     * on deploy. Docs without a ruleSet field predate the two-set split and
     * are normalized to platform_rules on the way out.
     */
    private function getRules(): void
    {
        try {
            $actor = $this->protect();
            if ($actor === null) {
                return;
            }

            $this->ensureRulesSeeded();
            $rules = $this->db->findMany('rules', ['status' => 'active'], ['sort' => ['order' => 1, 'createdAt' => 1]]);
            foreach ($rules as &$rule) {
                $set = (string) ($rule['ruleSet'] ?? '');
                if (!OnboardingPolicy::isKnownSet($set)) {
                    $rule['ruleSet'] = OnboardingPolicy::SET_PLATFORM;
                }
            }
            unset($rule);
            Response::json([
                'rules' => $rules,
                'version' => OnboardingPolicy::RULES_VERSION,
                'versions' => OnboardingPolicy::RULES_VERSIONS,
            ], 200, 'private, max-age=300, stale-while-revalidate=600');
        } catch (Throwable $e) {
            Response::json(['message' => 'Server error fetching rules'], 500);
        }
    }

    private function ensureRulesSeeded(): void
    {
        // Platform set: any doc without ruleSet counts (pre-split rows),
        // so the guard is "collection has any non-house doc" ≈ total minus
        // house. Seeding runs once per set, independently.
        $total = $this->db->countDocuments('rules', []);
        $house = $this->db->countDocuments('rules', ['ruleSet' => OnboardingPolicy::SET_HOUSE]);

        if ($total - $house <= 0) {
            foreach (self::DEFAULT_PLATFORM_RULES as $item) {
                $this->db->insertOne('rules', array_merge($item, [
                    'ruleSet' => OnboardingPolicy::SET_PLATFORM,
                    'createdAt' => SqlRepository::nowUtc(),
                    'updatedAt' => SqlRepository::nowUtc(),
                ]));
            }
        }

        if ($house <= 0) {
            foreach (self::DEFAULT_HOUSE_RULES as $item) {
                $this->db->insertOne('rules', array_merge($item, [
                    'createdAt' => SqlRepository::nowUtc(),
                    'updatedAt' => SqlRepository::nowUtc(),
                ]));
            }
        }
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
            // Tutorials are admin-managed text content that changes rarely.
            // private = per-user (auth-gated), browser-only — no shared CDN cache.
            // ETag in Response::json gives 304 short-circuit when content unchanged.
            Response::json(['tutorials' => $tutorials], 200, 'private, max-age=300, stale-while-revalidate=600');
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
            // FAQs are admin-managed support content that changes rarely.
            // Same caching strategy as tutorials.
            Response::json(['faqs' => $faqs], 200, 'private, max-age=300, stale-while-revalidate=600');
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
                'createdAt' => SqlRepository::nowUtc(),
                'updatedAt' => SqlRepository::nowUtc(),
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
                'createdAt' => SqlRepository::nowUtc(),
                'updatedAt' => SqlRepository::nowUtc(),
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
        $actor = Jwt::cachedUser($this->db, $collection, $id);
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
