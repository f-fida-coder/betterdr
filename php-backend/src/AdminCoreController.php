<?php

declare(strict_types=1);


final class AdminCoreController
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
        if ($method === 'GET' && $path === '/api/admin/users') {
            $this->getUsers();
            return true;
        }
        if ($method === 'GET' && $path === '/api/admin/agents') {
            $this->getAgents();
            return true;
        }
        if ($method === 'GET' && $path === '/api/admin/stats') {
            $this->getStats();
            return true;
        }
        if ($method === 'GET' && $path === '/api/admin/system-stats') {
            $this->getSystemStats();
            return true;
        }
        if ($method === 'GET' && $path === '/api/admin/entity-catalog') {
            $this->getEntityCatalog();
            return true;
        }
        if ($method === 'GET' && $path === '/api/admin/header-summary') {
            $this->getHeaderSummary();
            return true;
        }
        if ($method === 'GET' && preg_match('#^/api/admin/next-username/([^/]+)$#', $path, $m) === 1) {
            $this->getNextUsername(rawurldecode($m[1]));
            return true;
        }
        if ($method === 'POST' && preg_match('#^/api/admin/impersonate-user/([a-fA-F0-9]{24})$#', $path, $m) === 1) {
            $this->impersonateUser($m[1]);
            return true;
        }
        if ($method === 'GET' && $path === '/api/admin/agent-tree') {
            $this->getAgentTree();
            return true;
        }
        if ($method === 'PUT' && preg_match('#^/api/admin/users/([a-fA-F0-9]{24})/freeplay$#', $path, $m) === 1) {
            $this->updateUserFreeplay($m[1]);
            return true;
        }
        if ($method === 'POST' && preg_match('#^/api/admin/users/([a-fA-F0-9]{24})/reset-password$#', $path, $m) === 1) {
            $this->resetUserPassword($m[1]);
            return true;
        }
        if ($method === 'POST' && preg_match('#^/api/admin/agents/([a-fA-F0-9]{24})/reset-password$#', $path, $m) === 1) {
            $this->resetAgentPassword($m[1]);
            return true;
        }
        if ($method === 'GET' && $path === '/api/admin/messages') {
            $this->getMessages();
            return true;
        }
        if ($method === 'POST' && preg_match('#^/api/admin/messages/([a-fA-F0-9]{24})/read$#', $path, $m) === 1) {
            $this->markMessageRead($m[1]);
            return true;
        }
        if ($method === 'POST' && preg_match('#^/api/admin/messages/([a-fA-F0-9]{24})/reply$#', $path, $m) === 1) {
            $this->replyToMessage($m[1]);
            return true;
        }
        if ($method === 'DELETE' && preg_match('#^/api/admin/messages/([a-fA-F0-9]{24})$#', $path, $m) === 1) {
            $this->deleteMessage($m[1]);
            return true;
        }
        if ($method === 'GET' && $path === '/api/admin/faqs') {
            $this->getFaqs();
            return true;
        }
        if ($method === 'POST' && $path === '/api/admin/faqs') {
            $this->createFaq();
            return true;
        }
        if ($method === 'PUT' && preg_match('#^/api/admin/faqs/([a-fA-F0-9]{24})$#', $path, $m) === 1) {
            $this->updateFaq($m[1]);
            return true;
        }
        if ($method === 'DELETE' && preg_match('#^/api/admin/faqs/([a-fA-F0-9]{24})$#', $path, $m) === 1) {
            $this->deleteFaq($m[1]);
            return true;
        }
        if ($method === 'GET' && $path === '/api/admin/manual') {
            $this->getManualSections();
            return true;
        }
        if ($method === 'POST' && $path === '/api/admin/manual') {
            $this->createManualSection();
            return true;
        }
        if ($method === 'PUT' && preg_match('#^/api/admin/manual/([a-fA-F0-9]{24})$#', $path, $m) === 1) {
            $this->updateManualSection($m[1]);
            return true;
        }
        if ($method === 'DELETE' && preg_match('#^/api/admin/manual/([a-fA-F0-9]{24})$#', $path, $m) === 1) {
            $this->deleteManualSection($m[1]);
            return true;
        }
        if ($method === 'GET' && $path === '/api/admin/settings') {
            $this->getSettings();
            return true;
        }
        if ($method === 'PUT' && $path === '/api/admin/settings') {
            $this->updateSettings();
            return true;
        }
        if ($method === 'GET' && $path === '/api/admin/rules') {
            $this->getRules();
            return true;
        }
        if ($method === 'POST' && $path === '/api/admin/rules') {
            $this->createRule();
            return true;
        }
        if ($method === 'PUT' && preg_match('#^/api/admin/rules/([a-fA-F0-9]{24})$#', $path, $m) === 1) {
            $this->updateRule($m[1]);
            return true;
        }
        if ($method === 'DELETE' && preg_match('#^/api/admin/rules/([a-fA-F0-9]{24})$#', $path, $m) === 1) {
            $this->deleteRule($m[1]);
            return true;
        }
        if ($method === 'GET' && $path === '/api/admin/feedback') {
            $this->getFeedback();
            return true;
        }
        if ($method === 'POST' && preg_match('#^/api/admin/feedback/([a-fA-F0-9]{24})/reply$#', $path, $m) === 1) {
            $this->replyFeedback($m[1]);
            return true;
        }
        if ($method === 'POST' && preg_match('#^/api/admin/feedback/([a-fA-F0-9]{24})/reviewed$#', $path, $m) === 1) {
            $this->markFeedbackReviewed($m[1]);
            return true;
        }
        if ($method === 'DELETE' && preg_match('#^/api/admin/feedback/([a-fA-F0-9]{24})$#', $path, $m) === 1) {
            $this->deleteFeedback($m[1]);
            return true;
        }
        if ($method === 'GET' && $path === '/api/admin/weekly-figures') {
            $this->getWeeklyFigures();
            return true;
        }
        if ($method === 'GET' && $path === '/api/admin/pending') {
            $this->getPendingTransactions();
            return true;
        }
        if ($method === 'POST' && $path === '/api/admin/pending/approve') {
            $this->approvePendingTransaction();
            return true;
        }
        if ($method === 'POST' && $path === '/api/admin/pending/decline') {
            $this->declinePendingTransaction();
            return true;
        }
        if ($method === 'GET' && $path === '/api/admin/cashier/summary') {
            $this->getCashierSummary();
            return true;
        }
        if ($method === 'GET' && $path === '/api/admin/cashier/transactions') {
            $this->getCashierTransactions();
            return true;
        }
        if ($method === 'GET' && $path === '/api/admin/matches') {
            $this->getAdminMatches();
            return true;
        }
        if ($method === 'POST' && $path === '/api/admin/matches') {
            $this->createMatch();
            return true;
        }
        if ($method === 'PUT' && preg_match('#^/api/admin/matches/([a-fA-F0-9]{24})$#', $path, $m) === 1) {
            $this->updateMatch($m[1]);
            return true;
        }
        if ($method === 'GET' && $path === '/api/admin/third-party-limits') {
            $this->getThirdPartyLimits();
            return true;
        }
        if ($method === 'POST' && $path === '/api/admin/third-party-limits') {
            $this->createThirdPartyLimit();
            return true;
        }
        if ($method === 'PUT' && preg_match('#^/api/admin/third-party-limits/([a-fA-F0-9]{24})$#', $path, $m) === 1) {
            $this->updateThirdPartyLimit($m[1]);
            return true;
        }
        if ($method === 'POST' && $path === '/api/admin/suspend') {
            $this->suspendUser();
            return true;
        }
        if ($method === 'POST' && $path === '/api/admin/unsuspend') {
            $this->unsuspendUser();
            return true;
        }
        if ($method === 'GET' && ($path === '/api/admin/transactions' || $path === '/api/admin/transaction-history')) {
            $this->getTransactionsHistory();
            return true;
        }
        if ($method === 'DELETE' && ($path === '/api/admin/transactions' || $path === '/api/admin/transaction-history')) {
            $this->deleteTransactionsHistory();
            return true;
        }
        if ($method === 'GET' && $path === '/api/admin/deleted-wagers') {
            $this->getDeletedWagers();
            return true;
        }
        if ($method === 'POST' && preg_match('#^/api/admin/deleted-wagers/([a-fA-F0-9]{24})/restore$#', $path, $m) === 1) {
            $this->restoreDeletedWager($m[1]);
            return true;
        }
        if ($method === 'GET' && $path === '/api/admin/sportsbook-links') {
            $this->getSportsbookLinks();
            return true;
        }
        if ($method === 'POST' && $path === '/api/admin/sportsbook-links') {
            $this->createSportsbookLink();
            return true;
        }
        if ($method === 'DELETE' && preg_match('#^/api/admin/sportsbook-links/([a-fA-F0-9]{24})$#', $path, $m) === 1) {
            $this->deleteSportsbookLink($m[1]);
            return true;
        }
        if ($method === 'PUT' && preg_match('#^/api/admin/sportsbook-links/([a-fA-F0-9]{24})$#', $path, $m) === 1) {
            $this->updateSportsbookLink($m[1]);
            return true;
        }
        if ($method === 'POST' && preg_match('#^/api/admin/sportsbook-links/([a-fA-F0-9]{24})/test$#', $path, $m) === 1) {
            $this->testSportsbookLink($m[1]);
            return true;
        }
        if ($method === 'GET' && $path === '/api/admin/billing/summary') {
            $this->getBillingSummary();
            return true;
        }
        if ($method === 'GET' && $path === '/api/admin/billing/invoices') {
            $this->getBillingInvoices();
            return true;
        }
        if ($method === 'POST' && $path === '/api/admin/billing/invoices') {
            $this->createBillingInvoice();
            return true;
        }
        if ($method === 'PUT' && preg_match('#^/api/admin/billing/invoices/([a-fA-F0-9]{24})$#', $path, $m) === 1) {
            $this->updateBillingInvoice($m[1]);
            return true;
        }
        if ($method === 'GET' && preg_match('#^/api/admin/billing/invoices/([a-fA-F0-9]{24})$#', $path, $m) === 1) {
            $this->getBillingInvoiceById($m[1]);
            return true;
        }
        if ($method === 'DELETE' && preg_match('#^/api/admin/users/([a-fA-F0-9]{24})$#', $path, $m) === 1) {
            $this->deleteUser($m[1]);
            return true;
        }
        if ($method === 'DELETE' && preg_match('#^/api/admin/agents/([a-fA-F0-9]{24})$#', $path, $m) === 1) {
            $this->deleteAgent($m[1]);
            return true;
        }
        if ($method === 'POST' && $path === '/api/admin/create-agent') {
            $this->createAgent();
            return true;
        }
        if ($method === 'POST' && $path === '/api/admin/seed-workflow-hierarchy') {
            $this->seedWorkflowHierarchy();
            return true;
        }
        if ($method === 'POST' && $path === '/api/admin/cleanup-workflow-seed') {
            $this->cleanupWorkflowSeed();
            return true;
        }
        if ($method === 'PUT' && preg_match('#^/api/admin/agent/([a-fA-F0-9]{24})$#', $path, $m) === 1) {
            $this->updateAgent($m[1]);
            return true;
        }
        // Commission chain: full upline + downlines for a given agent
        if ($method === 'GET' && preg_match('#^/api/admin/agent/([a-fA-F0-9]{24})/commission-chain$#', $path, $m) === 1) {
            $this->getAgentCommissionChain($m[1]);
            return true;
        }
        // Calculate commission distribution for a given amount
        if ($method === 'POST' && $path === '/api/admin/commission/calculate') {
            $this->calculateCommissionDistribution();
            return true;
        }
        // Bulk-validate a chain's percentages before saving
        if ($method === 'POST' && $path === '/api/admin/commission/validate') {
            $this->validateCommissionChain();
            return true;
        }
        if ($method === 'POST' && $path === '/api/admin/create-user') {
            $this->createUserByAdmin();
            return true;
        }
        if ($method === 'PUT' && preg_match('#^/api/admin/users/([a-fA-F0-9]{24})$#', $path, $m) === 1) {
            $this->updateUserByAdmin($m[1]);
            return true;
        }
        if ($method === 'PUT' && preg_match('#^/api/admin/users/([a-fA-F0-9]{24})/credit$#', $path, $m) === 1) {
            $this->updateUserCredit($m[1]);
            return true;
        }
        if ($method === 'GET' && preg_match('#^/api/admin/users/([a-fA-F0-9]{24})/stats$#', $path, $m) === 1) {
            $this->getUserStats($m[1]);
            return true;
        }
        if ($method === 'GET' && $path === '/api/admin/ip-tracker') {
            $this->getIpTracker();
            return true;
        }
        if ($method === 'POST' && preg_match('#^/api/admin/ip-tracker/([a-fA-F0-9]{24})/block$#', $path, $m) === 1) {
            $this->blockIp($m[1]);
            return true;
        }
        if ($method === 'POST' && preg_match('#^/api/admin/ip-tracker/([a-fA-F0-9]{24})/unblock$#', $path, $m) === 1) {
            $this->unblockIp($m[1]);
            return true;
        }
        if ($method === 'POST' && preg_match('#^/api/admin/ip-tracker/([a-fA-F0-9]{24})/whitelist$#', $path, $m) === 1) {
            $this->whitelistIp($m[1]);
            return true;
        }
        if ($method === 'GET' && $path === '/api/admin/bets') {
            $this->getAdminBets();
            return true;
        }
        if ($method === 'POST' && $path === '/api/admin/bets') {
            $this->createAdminBet();
            return true;
        }
        if ($method === 'DELETE' && preg_match('#^/api/admin/bets/([a-fA-F0-9]{24})$#', $path, $m) === 1) {
            $this->deleteAdminBet($m[1]);
            return true;
        }
        if ($method === 'GET' && $path === '/api/admin/agent-performance') {
            $this->getAgentPerformance();
            return true;
        }
        if ($method === 'GET' && preg_match('#^/api/admin/agent-performance/([a-fA-F0-9]{24})/details$#', $path, $m) === 1) {
            $this->getAgentPerformanceDetails($m[1]);
            return true;
        }
        if ($method === 'POST' && $path === '/api/admin/refresh-odds') {
            $this->refreshOdds();
            return true;
        }
        if ($method === 'POST' && $path === '/api/admin/fetch-odds') {
            $this->fetchOddsManual();
            return true;
        }
        if ($method === 'POST' && $path === '/api/admin/clear-cache') {
            $this->clearCache();
            return true;
        }
        if ($method === 'POST' && $path === '/api/admin/bulk-create-users') {
            $this->bulkCreateUsers();
            return true;
        }
        if ($method === 'POST' && $path === '/api/admin/import-users-spreadsheet') {
            $this->importUsersSpreadsheet();
            return true;
        }

        return false;
    }

    private function playerOnlyQuery(): array
    {
        return [
            '$and' => [
                ['role' => ['$ne' => 'admin']],
                ['role' => ['$ne' => 'agent']],
                ['role' => ['$ne' => 'master_agent']],
                ['role' => ['$ne' => 'super_agent']],
            ],
        ];
    }

    private function isPlayerLikeUserDocument(?array $doc): bool
    {
        if ($doc === null) {
            return false;
        }

        $role = strtolower(trim((string) ($doc['role'] ?? '')));
        return !in_array($role, ['admin', 'agent', 'master_agent', 'super_agent'], true);
    }

    private function getUsers(): void
    {
        try {
            $actor = $this->protect(['admin', 'agent', 'master_agent', 'super_agent']);
            if ($actor === null) {
                return;
            }

            // Keep player scope resilient across legacy imports where role may be missing or use an older value.
            $query = $this->playerOnlyQuery();
            if (($actor['role'] ?? '') === 'agent') {
                $query['agentId'] = MongoRepository::id((string) $actor['_id']);
            }
            // admin, master_agent, super_agent — no agentId filter, see all players

            $searchQ = trim((string) ($_GET['q'] ?? ''));
            if ($searchQ !== '') {
                $safe = preg_quote($searchQ, '/');
                $searchOr = [
                    ['username' => ['$regex' => $safe, '$options' => 'i']],
                    ['phoneNumber' => ['$regex' => $safe, '$options' => 'i']],
                    ['firstName' => ['$regex' => $safe, '$options' => 'i']],
                    ['lastName' => ['$regex' => $safe, '$options' => 'i']],
                    ['fullName' => ['$regex' => $safe, '$options' => 'i']],
                ];
                $phoneDigits = preg_replace('/\D+/', '', $searchQ);
                if ($phoneDigits !== '') {
                    $digitParts = preg_split('//', $phoneDigits, -1, PREG_SPLIT_NO_EMPTY);
                    $digitPattern = implode('\D*', $digitParts ?: []);
                    if ($digitPattern !== '') {
                        $searchOr[] = ['phoneNumber' => ['$regex' => $digitPattern, '$options' => 'i']];
                    }
                }
                $query['$or'] = $searchOr;
            }

            $users = $this->db->findMany('users', $query, ['sort' => ['createdAt' => -1]]);

            $oneWeekAgo = MongoRepository::utcFromMillis((time() - 7 * 24 * 60 * 60) * 1000);
            $userIds = [];
            $agentIdSet = [];
            $creatorAdminIdSet = [];
            $creatorAgentIdSet = [];
            $referrerIdSet = [];
            foreach ($users as $u) {
                if (isset($u['_id']) && is_string($u['_id'])) {
                    $userIds[] = MongoRepository::id($u['_id']);
                }
                $aid = (string) ($u['agentId'] ?? '');
                if ($aid !== '' && preg_match('/^[a-f0-9]{24}$/i', $aid) === 1) {
                    $agentIdSet[$aid] = true;
                }
                $cid = (string) ($u['createdBy'] ?? '');
                $cbm = (string) ($u['createdByModel'] ?? '');
                if ($cid !== '' && preg_match('/^[a-f0-9]{24}$/i', $cid) === 1) {
                    if ($cbm === 'Admin') {
                        $creatorAdminIdSet[$cid] = true;
                    } else {
                        $creatorAgentIdSet[$cid] = true;
                    }
                }
                $rid = (string) ($u['referredByUserId'] ?? '');
                if ($rid !== '' && preg_match('/^[a-f0-9]{24}$/i', $rid) === 1) {
                    $referrerIdSet[$rid] = true;
                }
            }

            $bets = count($userIds) > 0
                ? $this->db->findMany('bets', ['userId' => ['$in' => $userIds], 'createdAt' => ['$gte' => $oneWeekAgo]], ['projection' => ['userId' => 1]])
                : [];

            $betCounts = [];
            foreach ($bets as $bet) {
                $uid = (string) ($bet['userId'] ?? '');
                if ($uid !== '') {
                    $betCounts[$uid] = ($betCounts[$uid] ?? 0) + 1;
                }
            }

            $agentMap = [];
            $agentObjectIds = array_map(static fn (string $id): string => MongoRepository::id($id), array_keys($agentIdSet));
            if (count($agentObjectIds) > 0) {
                $agentDocs = $this->db->findMany('agents', ['_id' => ['$in' => $agentObjectIds]], ['projection' => ['username' => 1]]);
                foreach ($agentDocs as $agent) {
                    $id = (string) ($agent['_id'] ?? '');
                    if ($id !== '') {
                        $agentMap[$id] = $agent;
                    }
                }
            }

            $creatorUserMap = [];
            $creatorAdminObjectIds = array_map(static fn (string $id): string => MongoRepository::id($id), array_keys($creatorAdminIdSet));
            if (count($creatorAdminObjectIds) > 0) {
                $admins = $this->db->findMany('admins', ['_id' => ['$in' => $creatorAdminObjectIds]], ['projection' => ['username' => 1, 'role' => 1]]);
                foreach ($admins as $doc) {
                    $id = (string) ($doc['_id'] ?? '');
                    if ($id !== '') {
                        $creatorUserMap[$id] = $doc;
                    }
                }
            }

            $creatorAgentObjectIds = array_map(static fn (string $id): string => MongoRepository::id($id), array_keys($creatorAgentIdSet));
            if (count($creatorAgentObjectIds) > 0) {
                $creatorAgents = $this->db->findMany('agents', ['_id' => ['$in' => $creatorAgentObjectIds]], ['projection' => ['username' => 1, 'role' => 1]]);
                foreach ($creatorAgents as $doc) {
                    $id = (string) ($doc['_id'] ?? '');
                    if ($id !== '') {
                        $creatorUserMap[$id] = $doc;
                    }
                }
            }

            $referrerMap = [];
            $referrerObjectIds = array_map(static fn (string $id): string => MongoRepository::id($id), array_keys($referrerIdSet));
            if (count($referrerObjectIds) > 0) {
                $referrers = $this->db->findMany('users', ['_id' => ['$in' => $referrerObjectIds]], ['projection' => ['username' => 1, 'fullName' => 1, 'firstName' => 1, 'lastName' => 1]]);
                foreach ($referrers as $doc) {
                    $id = (string) ($doc['_id'] ?? '');
                    if ($id !== '') {
                        $referrerMap[$id] = $doc;
                    }
                }
            }

            $formatted = [];
            foreach ($users as $user) {
                $balance = $this->num($user['balance'] ?? 0);
                $pending = $this->num($user['pendingBalance'] ?? 0);
                $uid = (string) ($user['_id'] ?? '');
                $aid = isset($user['agentId']) ? (string) $user['agentId'] : '';
                $cid = isset($user['createdBy']) ? (string) $user['createdBy'] : '';
                $rid = isset($user['referredByUserId']) ? (string) $user['referredByUserId'] : '';

                $formatted[] = [
                    'id' => $uid,
                    'username' => $user['username'] ?? null,
                    'phoneNumber' => $user['phoneNumber'] ?? null,
                    'firstName' => $user['firstName'] ?? null,
                    'lastName' => $user['lastName'] ?? null,
                    'fullName' => $user['fullName'] ?? null,
                    'minBet' => $user['minBet'] ?? null,
                    'maxBet' => $user['maxBet'] ?? null,
                    'creditLimit' => $this->num($user['creditLimit'] ?? 0),
                    'role' => $user['role'] ?? 'user',
                    'status' => $user['status'] ?? null,
                    'createdAt' => $user['createdAt'] ?? null,
                    'agentId' => $aid !== '' ? ['_id' => $aid, 'username' => $agentMap[$aid]['username'] ?? null] : null,
                    'balance' => $balance,
                    'pendingBalance' => $pending,
                    'balanceOwed' => $this->num($user['balanceOwed'] ?? 0),
                    'freeplayBalance' => $this->num($user['freeplayBalance'] ?? 0),
                    'lifetime' => $this->num($user['lifetime'] ?? 0),
                    'playerNotes' => (string) ($user['playerNotes'] ?? ''),
                    'availableBalance' => max(0, $balance - $pending),
                    'isActive' => ($betCounts[$uid] ?? 0) >= 2,
                    'createdBy' => $cid !== '' && isset($creatorUserMap[$cid])
                        ? ['username' => $creatorUserMap[$cid]['username'] ?? null, 'role' => $creatorUserMap[$cid]['role'] ?? null]
                        : null,
                    'createdByModel' => $user['createdByModel'] ?? null,
                    'referredByUserId' => $rid !== '' ? $rid : null,
                    'referredByUsername' => $rid !== '' ? ($referrerMap[$rid]['username'] ?? null) : null,
                    'referredByFirstName' => $rid !== '' ? ($referrerMap[$rid]['firstName'] ?? null) : null,
                    'referredByLastName' => $rid !== '' ? ($referrerMap[$rid]['lastName'] ?? null) : null,
                    'referralBonusGranted' => (bool) ($user['referralBonusGranted'] ?? false),
                    'referralBonusAmount' => (float) ($user['referralBonusAmount'] ?? 0),
                    'settings' => $user['settings'] ?? null,
                    'displayPassword' => (($user['displayPassword'] ?? '') !== '' ? $user['displayPassword'] : ($user['rawPassword'] ?? null)),
                ];
            }

            Response::json($formatted);
        } catch (Throwable $e) {
            Response::json(['message' => 'Server error'], 500);
        }
    }

    private function getAgents(): void
    {
        try {
            $actor = $this->protect(['admin', 'master_agent', 'super_agent']);
            if ($actor === null) {
                return;
            }

            $query = [];
            if (in_array((string) ($actor['role'] ?? ''), ['master_agent', 'super_agent'], true)) {
                $query = ['createdBy' => MongoRepository::id((string) $actor['_id']), 'createdByModel' => 'Agent'];
            }

            $agents = $this->db->findMany('agents', $query, ['sort' => ['createdAt' => -1]]);

            if (count($agents) === 0) {
                Response::json([]);
                return;
            }

            $activeSince = MongoRepository::utcFromMillis((time() - 7 * 24 * 60 * 60) * 1000);
            $agentIds = [];
            foreach ($agents as $agent) {
                $aid = (string) ($agent['_id'] ?? '');
                if ($aid !== '' && preg_match('/^[a-f0-9]{24}$/i', $aid) === 1) {
                    $agentIds[] = $aid;
                }
            }
            $agentObjectIds = array_map(static fn (string $id): string => MongoRepository::id($id), $agentIds);

            $usersByAgent = [];
            $userCountByAgent = [];
            $activeCustomerCountByAgent = [];
            $allUserObjectIds = [];
            if (count($agentObjectIds) > 0) {
                $users = $this->db->findMany('users', ['agentId' => ['$in' => $agentObjectIds]], ['projection' => ['_id' => 1, 'agentId' => 1, 'status' => 1]]);
                foreach ($users as $u) {
                    $uid = (string) ($u['_id'] ?? '');
                    $aid = (string) ($u['agentId'] ?? '');
                    if ($uid === '' || $aid === '') {
                        continue;
                    }
                    $usersByAgent[$aid][] = $u;
                    $userCountByAgent[$aid] = ($userCountByAgent[$aid] ?? 0) + 1;
                    $allUserObjectIds[] = MongoRepository::id($uid);
                }
            }

            $betCountsByUser = [];
            if (count($allUserObjectIds) > 0) {
                $recentBets = $this->db->findMany(
                    'bets',
                    ['createdAt' => ['$gte' => $activeSince], 'userId' => ['$in' => $allUserObjectIds]],
                    ['projection' => ['userId' => 1]]
                );
                foreach ($recentBets as $bet) {
                    $uid = (string) ($bet['userId'] ?? '');
                    if ($uid !== '') {
                        $betCountsByUser[$uid] = ($betCountsByUser[$uid] ?? 0) + 1;
                    }
                }
            }

            foreach ($usersByAgent as $aid => $users) {
                $activeCount = 0;
                foreach ($users as $u) {
                    $uid = (string) ($u['_id'] ?? '');
                    if (($u['status'] ?? '') === 'active' && (($betCountsByUser[$uid] ?? 0) >= 2)) {
                        $activeCount++;
                    }
                }
                $activeCustomerCountByAgent[$aid] = $activeCount;
            }

            $subAgentCountByMaster = [];
            $usersInHierarchyByMaster = [];
            $masterIds = [];
            foreach ($agents as $agent) {
                if (($agent['role'] ?? '') === 'master_agent') {
                    $aid = (string) ($agent['_id'] ?? '');
                    if ($aid !== '' && preg_match('/^[a-f0-9]{24}$/i', $aid) === 1) {
                        $masterIds[] = $aid;
                    }
                }
            }

            if (count($masterIds) > 0) {
                $masterObjectIds = array_map(static fn (string $id): string => MongoRepository::id($id), $masterIds);
                $subAgents = $this->db->findMany(
                    'agents',
                    ['createdBy' => ['$in' => $masterObjectIds], 'createdByModel' => 'Agent'],
                    ['projection' => ['_id' => 1, 'createdBy' => 1]]
                );

                $subAgentOwner = [];
                $subAgentObjectIds = [];
                foreach ($subAgents as $sa) {
                    $sid = (string) ($sa['_id'] ?? '');
                    $mid = (string) ($sa['createdBy'] ?? '');
                    if ($sid === '' || $mid === '') {
                        continue;
                    }
                    $subAgentOwner[$sid] = $mid;
                    $subAgentCountByMaster[$mid] = ($subAgentCountByMaster[$mid] ?? 0) + 1;
                    $subAgentObjectIds[] = MongoRepository::id($sid);
                }

                if (count($subAgentObjectIds) > 0) {
                    $subUsers = $this->db->findMany('users', ['agentId' => ['$in' => $subAgentObjectIds]], ['projection' => ['agentId' => 1]]);
                    foreach ($subUsers as $su) {
                        $subAid = (string) ($su['agentId'] ?? '');
                        if ($subAid === '' || !isset($subAgentOwner[$subAid])) {
                            continue;
                        }
                        $masterId = $subAgentOwner[$subAid];
                        $usersInHierarchyByMaster[$masterId] = ($usersInHierarchyByMaster[$masterId] ?? 0) + 1;
                    }
                }
            }

            $referrerMap = [];
            $referrerIds = [];
            foreach ($agents as $agent) {
                $rid = (string) ($agent['referredByUserId'] ?? '');
                if ($rid !== '' && preg_match('/^[a-f0-9]{24}$/i', $rid) === 1) {
                    $referrerIds[$rid] = true;
                }
            }
            if (count($referrerIds) > 0) {
                $referrerObjectIds = array_map(static fn (string $id): string => MongoRepository::id($id), array_keys($referrerIds));
                $referrers = $this->db->findMany('users', ['_id' => ['$in' => $referrerObjectIds]], ['projection' => ['username' => 1, 'fullName' => 1, 'firstName' => 1, 'lastName' => 1]]);
                foreach ($referrers as $r) {
                    $rid = (string) ($r['_id'] ?? '');
                    if ($rid !== '') {
                        $referrerMap[$rid] = $r;
                    }
                }
            }

            $result = [];
            foreach ($agents as $agent) {
                $aid = (string) ($agent['_id'] ?? '');
                $userCount = $userCountByAgent[$aid] ?? 0;
                $activeCustomerCount = $activeCustomerCountByAgent[$aid] ?? 0;
                $subAgentCount = $subAgentCountByMaster[$aid] ?? 0;
                $totalUsersInHierarchy = $usersInHierarchyByMaster[$aid] ?? 0;

                $billingRate = $this->num($agent['agentBillingRate'] ?? 0);
                $result[] = [
                    'id' => $aid,
                    'username' => $agent['username'] ?? null,
                    'phoneNumber' => $agent['phoneNumber'] ?? null,
                    'balance' => $this->num($agent['balance'] ?? 0),
                    'balanceOwed' => $this->num($agent['balanceOwed'] ?? 0),
                    'role' => $agent['role'] ?? null,
                    'status' => $agent['status'] ?? null,
                    'createdAt' => $agent['createdAt'] ?? null,
                    'createdBy' => $agent['createdBy'] ?? null,
                    'createdByModel' => $agent['createdByModel'] ?? null,
                    'referredByUserId' => $agent['referredByUserId'] ?? null,
                    'referredByUsername' => isset($agent['referredByUserId']) ? ($referrerMap[(string) $agent['referredByUserId']]['username'] ?? null) : null,
                    'referredByFirstName' => isset($agent['referredByUserId']) ? ($referrerMap[(string) $agent['referredByUserId']]['firstName'] ?? null) : null,
                    'referredByLastName' => isset($agent['referredByUserId']) ? ($referrerMap[(string) $agent['referredByUserId']]['lastName'] ?? null) : null,
                    'agentBillingRate' => $billingRate,
                    'agentBillingStatus' => $agent['agentBillingStatus'] ?? null,
                    'viewOnly' => (bool) ($agent['viewOnly'] ?? false) || (($agent['agentBillingStatus'] ?? '') === 'unpaid'),
                    'permissions' => $agent['permissions'] ?? null,
                    'userCount' => $userCount,
                    'subAgentCount' => $subAgentCount,
                    'totalUsersInHierarchy' => $totalUsersInHierarchy,
                    'activeCustomerCount' => $activeCustomerCount,
                    'weeklyCharge' => $billingRate * $activeCustomerCount,
                    // Commission fields
                    'agentPercent' => isset($agent['agentPercent']) ? (float) $agent['agentPercent'] : null,
                    'playerRate' => isset($agent['playerRate']) ? (float) $agent['playerRate'] : null,
                    'hiringAgentPercent' => isset($agent['hiringAgentPercent']) ? (float) $agent['hiringAgentPercent'] : null,
                    'subAgentPercent' => isset($agent['subAgentPercent']) ? (float) $agent['subAgentPercent'] : null,
                    'extraSubAgents' => isset($agent['extraSubAgents']) && is_array($agent['extraSubAgents']) ? $agent['extraSubAgents'] : [],
                    'parentAgentId' => isset($agent['createdBy']) ? (string) $agent['createdBy'] : null,
                    'parentAgentModel' => $agent['createdByModel'] ?? null,
                ];
            }

            Response::json($result);
        } catch (Throwable $e) {
            Response::json(['message' => 'Server error fetching agents'], 500);
        }
    }

    private function getStats(): void
    {
        try {
            $actor = $this->protect(['admin', 'agent', 'master_agent', 'super_agent']);
            if ($actor === null) {
                return;
            }

            $oneWeekAgo = MongoRepository::utcFromMillis((time() - 7 * 24 * 60 * 60) * 1000);
            $betQuery = [
                'createdAt' => ['$gte' => $oneWeekAgo],
                'status' => ['$in' => ['won', 'lost']],
            ];

            if (($actor['role'] ?? '') === 'agent') {
                $myUsers = $this->db->findMany('users', ['agentId' => MongoRepository::id((string) $actor['_id'])], ['projection' => ['_id' => 1]]);
                $ids = [];
                foreach ($myUsers as $u) {
                    $ids[] = MongoRepository::id((string) $u['_id']);
                }
                $betQuery['userId'] = ['$in' => $ids];
            }

            $bets = $this->db->findMany('bets', $betQuery, ['projection' => ['amount' => 1, 'status' => 1, 'potentialPayout' => 1]]);
            $totalWagered = 0.0;
            $totalPayouts = 0.0;
            foreach ($bets as $bet) {
                $totalWagered += $this->num($bet['amount'] ?? 0);
                if (($bet['status'] ?? '') === 'won') {
                    $totalPayouts += $this->num($bet['potentialPayout'] ?? 0);
                }
            }

            Response::json([
                'totalWagered' => $totalWagered,
                'totalPayouts' => $totalPayouts,
                'houseProfit' => $totalWagered - $totalPayouts,
            ]);
        } catch (Throwable $e) {
            Response::json(['message' => 'Server error with stats'], 500);
        }
    }

    private function getSystemStats(): void
    {
        try {
            $actor = $this->protect(['admin', 'agent', 'master_agent', 'super_agent']);
            if ($actor === null) {
                return;
            }
            $actorId = (string) ($actor['_id'] ?? '');
            $actorRole = (string) ($actor['role'] ?? '');
            $this->respondJsonWithCache('system-stats-' . $actorRole, $actorId, 20, function () use ($actor): array {
                $queryUsers = ['role' => 'user'];
                $betQuery = [];

                if (($actor['role'] ?? '') === 'agent') {
                    $queryUsers['agentId'] = MongoRepository::id((string) $actor['_id']);
                    $myUsers = $this->db->findMany('users', ['agentId' => MongoRepository::id((string) $actor['_id'])], ['projection' => ['_id' => 1]]);
                    $ids = [];
                    foreach ($myUsers as $u) {
                        $ids[] = MongoRepository::id((string) $u['_id']);
                    }
                    $betQuery['userId'] = ['$in' => $ids];
                }

                $userCount = $this->db->countDocuments('users', $queryUsers);
                $betCount = $this->db->countDocuments('bets', $betQuery);
                $matchCount = $this->db->countDocuments('matches', []);

                $liveMatches = $this->db->findMany('matches', [
                    '$or' => [
                        ['status' => 'live'],
                        ['score.score_home' => ['$gt' => 0]],
                        ['score.score_away' => ['$gt' => 0]],
                    ],
                ], ['sort' => ['lastUpdated' => -1], 'limit' => 20]);
                $liveMatches = array_map(fn (array $match): array => SportsbookHealth::applyBettingAvailability($this->db, $match), array_values(array_filter($liveMatches, 'is_array')));

                return [
                    'counts' => [
                        'users' => $userCount,
                        'bets' => $betCount,
                        'matches' => $matchCount,
                    ],
                    'sportsbookHealth' => SportsbookHealth::sportsbookSnapshot($this->db),
                    'liveMatches' => $liveMatches,
                    'timestamp' => gmdate(DATE_ATOM),
                ];
            });
        } catch (Throwable $e) {
            Response::json(['message' => 'Server error with system stats'], 500);
        }
    }

    private function getEntityCatalog(): void
    {
        try {
            $actor = $this->protect(['admin', 'agent', 'master_agent', 'super_agent']);
            if ($actor === null) {
                return;
            }

            $items = AdminEntityCatalog::definitions();
            $countCache = [];
            $tableCache = [];

            foreach ($items as &$item) {
                $collections = array_values(array_unique(array_filter(
                    array_map(static fn ($v): string => trim((string) $v), (array) ($item['collections'] ?? [])),
                    static fn (string $v): bool => $v !== ''
                )));

                $resolved = [];
                foreach ($collections as $collection) {
                    if (!array_key_exists($collection, $countCache)) {
                        $countCache[$collection] = $this->db->countDocuments($collection, []);
                    }
                    if (!array_key_exists($collection, $tableCache)) {
                        $table = $this->db->tableNameForCollection($collection);
                        $tableCache[$collection] = [
                            'table' => $table,
                            'exists' => $this->db->tableExists($table),
                            'entityView' => $table . '_entity_v',
                            'flatTable' => $table . '_table',
                        ];
                    }

                    $resolved[] = array_merge(
                        ['collection' => $collection, 'rows' => (int) $countCache[$collection]],
                        $tableCache[$collection]
                    );
                }

                $item['collections'] = $resolved;
            }
            unset($item);

            Response::json([
                'items' => $items,
                'summary' => [
                    'links' => count($items),
                    'collections' => count(array_keys($countCache)),
                    'rows' => array_sum(array_map(static fn ($v): int => (int) $v, $countCache)),
                ],
            ]);
        } catch (Throwable $e) {
            Response::json(['message' => 'Server error with entity catalog'], 500);
        }
    }

    private function getHeaderSummary(): void
    {
        try {
            $actor = $this->protect(['admin', 'agent', 'master_agent', 'super_agent']);
            if ($actor === null) {
                return;
            }
            $actorId = (string) ($actor['_id'] ?? '');
            $actorRole = (string) ($actor['role'] ?? '');
            $this->respondJsonWithCache('header-summary-' . $actorRole, $actorId, 15, function () use ($actor): array {
                $startOfToday = new DateTimeImmutable('today');
                $startOfWeek = $this->startOfWeek(new DateTimeImmutable('now'));

                $matchUser = ['role' => 'user'];
                $actorRole = (string) ($actor['role'] ?? '');
                if ($actorRole === 'agent') {
                    $matchUser['agentId'] = MongoRepository::id((string) $actor['_id']);
                } elseif (in_array($actorRole, ['master_agent', 'super_agent'], true)) {
                    $managedAgentIds = $this->listManagedAgentIds((string) ($actor['_id'] ?? ''));
                    $managedAgentObjectIds = [];
                    foreach ($managedAgentIds as $managedAgentId) {
                        if (preg_match('/^[a-f0-9]{24}$/i', $managedAgentId) === 1) {
                            $managedAgentObjectIds[] = MongoRepository::id($managedAgentId);
                        }
                    }

                    if (count($managedAgentObjectIds) === 0) {
                        return [
                            'totalBalance' => 0.0,
                            'totalOutstanding' => 0.0,
                            'todayNet' => 0.0,
                            'weekNet' => 0.0,
                            'activeAccounts' => 0,
                            'sportsbookHealth' => SportsbookHealth::sportsbookSnapshot($this->db),
                        ];
                    }

                    $matchUser['$or'] = [
                        ['agentId' => ['$in' => $managedAgentObjectIds]],
                        ['createdBy' => ['$in' => $managedAgentObjectIds], 'createdByModel' => 'Agent'],
                    ];
                }

                $usersForBalance = $this->db->findMany('users', $matchUser, ['projection' => ['_id' => 1, 'balance' => 1, 'balanceOwed' => 1]]);
                $totalBalance = 0.0;
                $userOutstanding = 0.0;
                $scopedUserIds = [];
                foreach ($usersForBalance as $u) {
                    $totalBalance += $this->num($u['balance'] ?? 0);
                    $userOutstanding += $this->num($u['balanceOwed'] ?? 0);
                    $uid = (string) ($u['_id'] ?? '');
                    if ($uid !== '' && preg_match('/^[a-f0-9]{24}$/i', $uid) === 1) {
                        $scopedUserIds[] = MongoRepository::id($uid);
                    }
                }

                $agentOutstanding = 0.0;
                if (($actor['role'] ?? '') === 'admin') {
                    $agents = $this->db->findMany('agents', [], ['projection' => ['balanceOwed' => 1]]);
                    foreach ($agents as $a) {
                        $agentOutstanding += $this->num($a['balanceOwed'] ?? 0);
                    }
                }

                $txQueryToday = [
                    'status' => 'completed',
                    'createdAt' => ['$gte' => MongoRepository::utcFromMillis($startOfToday->getTimestamp() * 1000)],
                ];
                $txQueryWeek = [
                    'status' => 'completed',
                    'createdAt' => ['$gte' => MongoRepository::utcFromMillis($startOfWeek->getTimestamp() * 1000)],
                ];

                $todayTx = [];
                $weekTx = [];
                if (($actor['role'] ?? '') !== 'admin') {
                    if (count($scopedUserIds) > 0) {
                        $txQueryToday['userId'] = ['$in' => $scopedUserIds];
                        $txQueryWeek['userId'] = ['$in' => $scopedUserIds];
                        $todayTx = $this->db->findMany('transactions', $txQueryToday, ['projection' => ['userId' => 1, 'amount' => 1, 'type' => 1, 'entrySide' => 1, 'reason' => 1, 'description' => 1, 'balanceBefore' => 1, 'balanceAfter' => 1]]);
                        $weekTx = $this->db->findMany('transactions', $txQueryWeek, ['projection' => ['userId' => 1, 'amount' => 1, 'type' => 1, 'entrySide' => 1, 'reason' => 1, 'description' => 1, 'balanceBefore' => 1, 'balanceAfter' => 1]]);
                    }
                } else {
                    $todayTx = $this->db->findMany('transactions', $txQueryToday, ['projection' => ['userId' => 1, 'amount' => 1, 'type' => 1, 'entrySide' => 1, 'reason' => 1, 'description' => 1, 'balanceBefore' => 1, 'balanceAfter' => 1]]);
                    $weekTx = $this->db->findMany('transactions', $txQueryWeek, ['projection' => ['userId' => 1, 'amount' => 1, 'type' => 1, 'entrySide' => 1, 'reason' => 1, 'description' => 1, 'balanceBefore' => 1, 'balanceAfter' => 1]]);
                }

                $todayNetRows = array_values(array_filter($todayTx, fn (array $tx): bool => !$this->shouldExcludeFromNetSummaries($tx)));
                $weekNetRows = array_values(array_filter($weekTx, fn (array $tx): bool => !$this->shouldExcludeFromNetSummaries($tx)));
                $todayNetUser = $this->sumComprehensiveSignedTransactions($todayNetRows);
                $weekNetUser = $this->sumComprehensiveSignedTransactions($weekNetRows);
                $activeUserIds = [];
                foreach ($weekTx as $tx) {
                    $txUserId = (string) ($tx['userId'] ?? '');
                    if ($txUserId !== '' && $this->isWeeklyActiveTransaction($tx)) {
                        $activeUserIds[$txUserId] = true;
                    }
                }
                $activeAccounts = count($activeUserIds);

                return [
                    'totalBalance' => $totalBalance,
                    'totalOutstanding' => $userOutstanding + $agentOutstanding,
                    'todayNet' => $todayNetUser,
                    'weekNet' => $weekNetUser,
                    'activeAccounts' => $activeAccounts,
                    'sportsbookHealth' => SportsbookHealth::sportsbookSnapshot($this->db),
                ];
            });
        } catch (Throwable $e) {
            Response::json(['message' => 'Server error getting header summary'], 500);
        }
    }

    /**
     * @param callable():array<string,mixed> $builder
     */
    private function respondJsonWithCache(string $namespace, string $actorId, int $ttlSeconds, callable $builder): void
    {
        $safeNamespace = preg_replace('/[^a-zA-Z0-9._-]+/', '-', $namespace) ?: 'cache';
        $safeActor = preg_replace('/[^a-zA-Z0-9._-]+/', '-', $actorId) ?: 'anonymous';
        $cacheDir = dirname(__DIR__) . '/cache';
        $cacheFile = $cacheDir . '/' . $safeNamespace . '__' . $safeActor . '.json';

        if ($ttlSeconds > 0 && is_file($cacheFile)) {
            $ageSeconds = time() - (int) @filemtime($cacheFile);
            if ($ageSeconds >= 0 && $ageSeconds <= $ttlSeconds) {
                $raw = @file_get_contents($cacheFile);
                if (is_string($raw) && $raw !== '') {
                    $cached = json_decode($raw, true);
                    if (is_array($cached)) {
                        Response::json($cached);
                        return;
                    }
                }
            }
        }

        $payload = $builder();
        if (!is_array($payload)) {
            $payload = [];
        }

        if (!is_dir($cacheDir)) {
            @mkdir($cacheDir, 0775, true);
        }
        @file_put_contents($cacheFile, json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES));

        Response::json($payload);
    }

    private function invalidateHeaderSummaryCache(): void
    {
        $cacheDir = dirname(__DIR__) . '/cache';
        if (!is_dir($cacheDir)) {
            return;
        }

        $patterns = [
            $cacheDir . '/header-summary-admin__*.json',
            $cacheDir . '/header-summary-agent__*.json',
            $cacheDir . '/header-summary-master_agent__*.json',
            $cacheDir . '/header-summary-super_agent__*.json',
        ];
        foreach ($patterns as $pattern) {
            $matches = glob($pattern);
            if (!is_array($matches)) {
                continue;
            }
            foreach ($matches as $path) {
                if (is_string($path) && $path !== '') {
                    @unlink($path);
                }
            }
        }
    }

    private function getNextUsername(string $prefix): void
    {
        try {
            $actor = $this->protect(['admin', 'agent', 'master_agent', 'super_agent']);
            if ($actor === null) {
                return;
            }

            $prefix = strtoupper(trim($prefix));
            if ($prefix === '') {
                Response::json(['message' => 'Prefix is required'], 400);
                return;
            }

            if (preg_match('/^[A-Z0-9]+$/', $prefix) !== 1) {
                Response::json(['message' => 'Prefix may only contain letters and numbers'], 400);
                return;
            }

            $suffix = strtoupper(trim((string) ($_GET['suffix'] ?? '')));
            $type = strtolower(trim((string) ($_GET['type'] ?? 'player')));
            $agentId = trim((string) ($_GET['agentId'] ?? ''));
            if ($suffix !== '' && preg_match('/^[A-Z0-9]+$/', $suffix) !== 1) {
                Response::json(['message' => 'Suffix may only contain letters and numbers'], 400);
                return;
            }
            if (!in_array($type, ['player', 'agent'], true)) {
                Response::json(['message' => 'Invalid type'], 400);
                return;
            }
            if ($agentId !== '' && preg_match('/^[a-f0-9]{24}$/i', $agentId) !== 1) {
                Response::json(['message' => 'Invalid agentId'], 400);
                return;
            }

            $safePrefix = preg_quote($prefix, '/');
            $safeSuffix = preg_quote($suffix, '/');
            $pattern = '/^' . $safePrefix . '(\d+)' . $safeSuffix . '$/i';

            $allDocs = [];
            $scope = 'global';
            $seedMaxNum = null;
            if ($type === 'player' && $agentId !== '') {
                $actorRole = (string) ($actor['role'] ?? '');
                $actorId = (string) ($actor['_id'] ?? '');
                $targetAgent = $this->db->findOne(
                    'agents',
                    ['_id' => MongoRepository::id($agentId)],
                    ['projection' => ['role' => 1, 'createdBy' => 1, 'createdByModel' => 1]]
                );
                if ($targetAgent === null) {
                    Response::json(['message' => 'Invalid agentId'], 400);
                    return;
                }
                if ((string) ($targetAgent['role'] ?? '') !== 'agent') {
                    Response::json(['message' => 'agentId must reference a regular Agent'], 400);
                    return;
                }

                $allowed = false;
                if ($actorRole === 'admin') {
                    $allowed = true;
                } elseif ($actorRole === 'agent') {
                    $allowed = $actorId !== '' && $actorId === $agentId;
                } elseif (in_array($actorRole, ['master_agent', 'super_agent'], true)) {
                    $allowed = $actorId !== ''
                        && in_array($agentId, $this->listManagedAgentIds($actorId), true);
                }
                if (!$allowed) {
                    Response::json(['message' => 'Not authorized for this agent scope'], 403);
                    return;
                }

                $scope = 'agent-player';
                $agentObjectId = MongoRepository::id($agentId);
                $allDocs = $this->db->findMany('users', [
                    'role' => 'user',
                    'agentId' => $agentObjectId,
                ], ['projection' => ['username' => 1]]);
            } elseif ($type === 'agent' && $agentId !== '') {
                $actorRole = (string) ($actor['role'] ?? '');
                $actorId = (string) ($actor['_id'] ?? '');
                $allowed = false;
                if ($actorRole === 'admin') {
                    $allowed = true;
                } elseif (in_array($actorRole, ['master_agent', 'super_agent'], true)) {
                    $allowed = in_array($agentId, $this->listManagedAgentIds($actorId), true);
                }
                if (!$allowed) {
                    Response::json(['message' => 'Not authorized for this master-agent scope'], 403);
                    return;
                }

                $parentAgent = $this->db->findOne(
                    'agents',
                    ['_id' => MongoRepository::id($agentId)],
                    ['projection' => ['username' => 1, 'role' => 1]]
                );
                if (
                    $parentAgent === null
                    || !in_array((string) ($parentAgent['role'] ?? ''), ['master_agent', 'super_agent'], true)
                ) {
                    Response::json(['message' => 'agentId must reference a valid Master Agent'], 400);
                    return;
                }

                $scope = 'master-agent';
                $allDocs = $this->db->findMany('agents', [
                    'createdBy' => MongoRepository::id($agentId),
                    'createdByModel' => 'Agent',
                ], ['projection' => ['username' => 1]]);

                $parentUsername = strtoupper((string) ($parentAgent['username'] ?? ''));
                if (preg_match('/(\d+)(?:MA)?$/i', $parentUsername, $parentMatch) === 1) {
                    $parentNumeric = (int) ($parentMatch[1] ?? 0);
                    if ($parentNumeric > 0) {
                        $seedMaxNum = max(0, $parentNumeric - 1);
                    }
                }
            } else {
                $allDocs = array_merge(
                    $this->db->findMany('users', [], ['projection' => ['username' => 1]]),
                    $this->db->findMany('agents', [], ['projection' => ['username' => 1]]),
                    $this->db->findMany('admins', [], ['projection' => ['username' => 1]])
                );
            }

            $maxNum = ($type === 'agent') ? 364 : 100;
            if (is_int($seedMaxNum) && $seedMaxNum > $maxNum) {
                $maxNum = $seedMaxNum;
            }
            $matchedCount = 0;
            $agentTrailingMax = 0;
            foreach ($allDocs as $doc) {
                $username = (string) ($doc['username'] ?? '');
                if ($username === '') {
                    continue;
                }

                if ($scope === 'agent-player' && preg_match('/(\d+)$/', $username, $tail) === 1) {
                    $tailNum = (int) ($tail[1] ?? 0);
                    if ($tailNum > $agentTrailingMax) {
                        $agentTrailingMax = $tailNum;
                    }
                }

                if (preg_match($pattern, $username, $matches) === 1) {
                    $matchedCount++;
                    $num = (int) ($matches[1] ?? 0);
                    if ($num > $maxNum) {
                        $maxNum = $num;
                    }
                }
            }

            $usedTrailingFallback = false;
            if ($scope === 'agent-player' && $agentTrailingMax > $maxNum) {
                $maxNum = $agentTrailingMax;
                $usedTrailingFallback = true;
            }

            $nextUsername = strtoupper($prefix . ($maxNum + 1) . $suffix);
            Response::json([
                'nextUsername' => $nextUsername,
                'currentMax' => $maxNum,
                'matchedCount' => $matchedCount,
                'scope' => $scope,
                'agentTrailingMax' => $agentTrailingMax,
                'usedTrailingFallback' => $usedTrailingFallback,
            ]);
        } catch (Throwable $e) {
            Response::json(['message' => 'Server error: ' . $e->getMessage()], 500);
        }
    }

    private function impersonateUser(string $userId): void
    {
        try {
            $actor = $this->protect(['admin', 'agent', 'master_agent', 'super_agent']);
            if ($actor === null) {
                return;
            }

            $target = $this->resolveImpersonationTarget($userId);
            if ($target === null) {
                Logger::info('Impersonation failed: target not found', [
                    'actorId' => (string) ($actor['_id'] ?? ''),
                    'actorUsername' => (string) ($actor['username'] ?? ''),
                    'actorRole' => (string) ($actor['role'] ?? ''),
                    'targetId' => $userId,
                    'ip' => IpUtils::clientIp(),
                ]);
                Response::json(['message' => 'User not found'], 404);
                return;
            }

            if (!$this->canImpersonateTarget($actor, $target)) {
                Logger::info('Impersonation denied: unauthorized', [
                    'actorId' => (string) ($actor['_id'] ?? ''),
                    'actorUsername' => (string) ($actor['username'] ?? ''),
                    'actorRole' => (string) ($actor['role'] ?? ''),
                    'targetId' => $userId,
                    'targetUsername' => (string) ($target['doc']['username'] ?? ''),
                    'targetRole' => (string) ($target['doc']['role'] ?? ''),
                    'ip' => IpUtils::clientIp(),
                ]);
                Response::json(['message' => 'Unauthorized to impersonate this user'], 403);
                return;
            }

            // Impersonation sessions limited to 1 hour (vs 8 hours for normal login)
            $ttl = 3600;
            $payload = $this->buildAuthPayload($target['doc'], $ttl);

            // For regular users the frontend redirects to '/' which restores the session
            // exclusively from the httpOnly cookie (via getSession()). Without setting the
            // cookie here the old admin cookie is still active, causing an infinite redirect
            // loop between '/' and '/admin/dashboard'. Set the cookie so getSession() returns
            // the impersonated user's data after the redirect.
            $targetRole = (string) ($target['doc']['role'] ?? 'user');
            if ($targetRole === 'user') {
                $isHttps = !empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off';
                $cookieOptions = ['expires' => time() + $ttl, 'path' => '/', 'httponly' => true, 'samesite' => 'Lax'];
                if ($isHttps) {
                    $cookieOptions['secure'] = true;
                }
                setcookie('auth_token', $payload['token'], $cookieOptions);
                // Issue CSRF cookie so the impersonated user's subsequent state-changing
                // requests (bets, profile updates, etc.) pass the double-submit CSRF check.
                $csrfToken = bin2hex(random_bytes(32));
                $csrfOpts = ['expires' => time() + $ttl, 'path' => '/', 'httponly' => false, 'samesite' => 'Lax'];
                if ($isHttps) {
                    $csrfOpts['secure'] = true;
                }
                setcookie('csrf_token', $csrfToken, $csrfOpts);
            }

            // Audit log: record every impersonation event
            Logger::info('Impersonation granted', [
                'actorId' => (string) ($actor['_id'] ?? ''),
                'actorUsername' => (string) ($actor['username'] ?? ''),
                'actorRole' => (string) ($actor['role'] ?? ''),
                'targetId' => $userId,
                'targetUsername' => (string) ($target['doc']['username'] ?? ''),
                'targetRole' => $targetRole,
                'targetCollection' => (string) ($target['collection'] ?? ''),
                'sessionTtlSeconds' => $ttl,
                'ip' => IpUtils::clientIp(),
            ]);

            // Persist audit record in database for compliance
            $this->db->insertOne('admin_audit_log', [
                'action' => 'impersonate_user',
                'actorId' => (string) ($actor['_id'] ?? ''),
                'actorUsername' => (string) ($actor['username'] ?? ''),
                'actorRole' => (string) ($actor['role'] ?? ''),
                'targetId' => $userId,
                'targetUsername' => (string) ($target['doc']['username'] ?? ''),
                'targetRole' => $targetRole,
                'ip' => IpUtils::clientIp(),
                'userAgent' => (string) ($_SERVER['HTTP_USER_AGENT'] ?? ''),
                'timestamp' => time(),
                'createdAt' => MongoRepository::nowUtc(),
            ]);

            Response::json(array_merge($payload, ['message' => 'Logged in as ' . (string) ($target['doc']['username'] ?? 'user')]));
        } catch (Throwable $e) {
            Response::json(['message' => 'Server error'], 500);
        }
    }

    private function resolveImpersonationTarget(string $id): ?array
    {
        $normalizedId = MongoRepository::id($id);
        $user = $this->db->findOne('users', ['_id' => $normalizedId]);
        if (is_array($user)) {
            return ['doc' => $user, 'collection' => 'users'];
        }

        $agent = $this->db->findOne('agents', ['_id' => $normalizedId]);
        if (is_array($agent)) {
            return ['doc' => $agent, 'collection' => 'agents'];
        }

        $admin = $this->db->findOne('admins', ['_id' => $normalizedId]);
        if (is_array($admin)) {
            return ['doc' => $admin, 'collection' => 'admins'];
        }

        return null;
    }

    private function canImpersonateTarget(array $actor, array $target): bool
    {
        $actorRole = (string) ($actor['role'] ?? '');
        $actorId = (string) ($actor['_id'] ?? '');
        $targetDoc = (array) ($target['doc'] ?? []);
        $targetCollection = (string) ($target['collection'] ?? '');
        $targetId = (string) ($targetDoc['_id'] ?? '');

        if ($actorRole === 'admin') {
            return true;
        }

        if (!in_array($actorRole, ['agent', 'master_agent', 'super_agent'], true)) {
            return false;
        }

        if ($targetCollection === 'admins') {
            return false;
        }

        if ($actorRole === 'agent') {
            if ($targetCollection === 'agents') {
                return $targetId !== '' && $targetId === $actorId;
            }
            if ($targetCollection === 'users') {
                return (string) ($targetDoc['agentId'] ?? '') === $actorId;
            }
            return false;
        }

        $visibleAgentIds = $this->listManagedAgentIds($actorId);
        if ($targetCollection === 'agents') {
            return in_array($targetId, $visibleAgentIds, true);
        }
        if ($targetCollection === 'users') {
            $agentId = (string) ($targetDoc['agentId'] ?? '');
            return $agentId !== '' && in_array($agentId, $visibleAgentIds, true);
        }

        return false;
    }

    /**
     * @return array<int,string>
     */
    private function listManagedAgentIds(string $rootAgentId): array
    {
        $seen = [];
        $queue = [$rootAgentId];

        while (count($queue) > 0) {
            $currentId = array_shift($queue);
            if (!is_string($currentId) || $currentId === '' || isset($seen[$currentId])) {
                continue;
            }

            $seen[$currentId] = true;
            $children = $this->db->findMany(
                'agents',
                ['createdBy' => MongoRepository::id($currentId), 'createdByModel' => 'Agent'],
                ['projection' => ['_id' => 1]]
            );
            foreach ($children as $child) {
                $childId = (string) ($child['_id'] ?? '');
                if ($childId !== '' && !isset($seen[$childId])) {
                    $queue[] = $childId;
                }
            }
        }

        return array_keys($seen);
    }

    /**
     * @return array<int,string>
     */
    private function listDirectAssignableAgentIds(string $masterAgentId): array
    {
        if ($masterAgentId === '' || preg_match('/^[a-f0-9]{24}$/i', $masterAgentId) !== 1) {
            return [];
        }

        $subAgents = $this->db->findMany('agents', [
            'createdBy' => MongoRepository::id($masterAgentId),
            'createdByModel' => 'Agent',
            'role' => 'agent',
        ], ['projection' => ['_id' => 1], 'sort' => ['username' => 1]]);

        $ids = [];
        foreach ($subAgents as $sub) {
            $sid = (string) ($sub['_id'] ?? '');
            if ($sid !== '' && preg_match('/^[a-f0-9]{24}$/i', $sid) === 1) {
                $ids[] = $sid;
            }
        }

        return $ids;
    }

    private function pickDefaultDirectAssignableAgentId(string $masterAgentId): ?string
    {
        $ids = $this->listDirectAssignableAgentIds($masterAgentId);
        return $ids[0] ?? null;
    }

    private function getAgentTree(): void
    {
        try {
            $actor = $this->protect(['admin', 'agent', 'master_agent', 'super_agent']);
            if ($actor === null) {
                return;
            }

            $tree = $this->buildAgentTree((string) $actor['_id'], (($actor['role'] ?? '') === 'admin') ? 'Admin' : 'Agent');
            if (($actor['role'] ?? '') === 'admin') {
                $usernameLinkedNode = $this->buildUsernameLinkedAgentTreeNode((string) ($actor['username'] ?? ''), $tree);
                if ($usernameLinkedNode !== null) {
                    array_unshift($tree, $usernameLinkedNode);
                }
            }
            Response::json([
                'root' => [
                    'username' => $actor['username'] ?? null,
                    'role' => $actor['role'] ?? null,
                    'id' => (string) ($actor['_id'] ?? ''),
                    'nodeType' => 'agent',
                ],
                'tree' => $tree,
            ]);
        } catch (Throwable $e) {
            Response::json(['message' => 'Server error fetching agent tree'], 500);
        }
    }

    private function updateUserFreeplay(string $userId): void
    {
        try {
            $actor = $this->protect(['admin', 'agent', 'master_agent', 'super_agent']);
            if ($actor === null) {
                return;
            }

            $user = $this->db->findOne('users', ['_id' => MongoRepository::id($userId)]);
            if ($user === null || (($user['role'] ?? 'user') !== 'user')) {
                Response::json(['message' => 'User not found'], 404);
                return;
            }

            if (($actor['role'] ?? '') === 'agent' && (string) ($user['agentId'] ?? '') !== (string) ($actor['_id'] ?? '')) {
                Response::json(['message' => 'Not authorized to update this user'], 403);
                return;
            }

            $body = Http::jsonBody();
            $note = trim((string) ($body['description'] ?? ''));
            $operationMode = strtolower(trim((string) ($body['operationMode'] ?? 'exact')));
            $expiresAtRaw = $body['expiresAt'] ?? null;
            $requestedAmount = null;
            $requestedDirection = null;
            $nextFreeplayTarget = null;

            if ($operationMode === 'transaction') {
                if (!array_key_exists('amount', $body) || !is_numeric($body['amount'])) {
                    Response::json(['message' => 'Amount is required'], 400);
                    return;
                }
                $requestedAmount = round((float) $body['amount'], 2);
                if ($requestedAmount <= 0) {
                    Response::json(['message' => 'Amount must be greater than 0'], 400);
                    return;
                }
                $requestedDirection = strtolower(trim((string) ($body['direction'] ?? '')));
                if (!in_array($requestedDirection, ['credit', 'debit'], true)) {
                    Response::json(['message' => 'direction must be either credit or debit'], 400);
                    return;
                }
            } else {
                $freeplayBalance = $body['freeplayBalance'] ?? null;
                if ($freeplayBalance === null || !is_numeric($freeplayBalance)) {
                    Response::json(['message' => 'Freeplay balance is required'], 400);
                    return;
                }
                $nextFreeplayTarget = max(0.0, (float) $freeplayBalance);
            }

            $this->db->beginTransaction();
            try {
                $lockedUser = $this->db->findOneForUpdate('users', ['_id' => MongoRepository::id($userId)]);
                if ($lockedUser === null || (($lockedUser['role'] ?? 'user') !== 'user')) {
                    $this->db->rollback();
                    Response::json(['message' => 'User not found'], 404);
                    return;
                }
                if (($actor['role'] ?? '') === 'agent' && (string) ($lockedUser['agentId'] ?? '') !== (string) ($actor['_id'] ?? '')) {
                    $this->db->rollback();
                    Response::json(['message' => 'Not authorized to update this user'], 403);
                    return;
                }

                $freeplayBefore = $this->num($lockedUser['freeplayBalance'] ?? 0);
                $now = MongoRepository::nowUtc();
                $nextFreeplay = $nextFreeplayTarget;

                if ($operationMode === 'transaction') {
                    $delta = $requestedDirection === 'credit' ? $requestedAmount : -$requestedAmount;
                    $nextFreeplay = round($freeplayBefore + $delta, 2);
                }

                $fpExpiresAt = null;
                $existingExpiry = $lockedUser['freeplayExpiresAt'] ?? null;
                $parsedExistingExpiry = null;
                if ($existingExpiry !== null) {
                    $parsedExistingExpiry = is_numeric($existingExpiry)
                        ? (int) $existingExpiry
                        : strtotime((string) $existingExpiry);
                    if ($parsedExistingExpiry === false || $parsedExistingExpiry <= time()) {
                        $parsedExistingExpiry = null;
                    }
                }
                if ($nextFreeplay > 0) {
                    if ($expiresAtRaw !== null) {
                        $parsed = is_numeric($expiresAtRaw) ? (int) $expiresAtRaw : strtotime((string) $expiresAtRaw);
                        if ($parsed === false || $parsed <= time()) {
                            $this->db->rollback();
                            Response::json(['message' => 'expiresAt must be a future date/time'], 400);
                            return;
                        }
                        $fpExpiresAt = $parsed;
                    } elseif ($operationMode !== 'transaction') {
                        $fpExpiresAt = time() + (30 * 24 * 3600);
                    } elseif ($parsedExistingExpiry !== null) {
                        $fpExpiresAt = $parsedExistingExpiry;
                    } else {
                        $fpExpiresAt = time() + (30 * 24 * 3600);
                    }
                }

                $this->db->updateOne('users', ['_id' => MongoRepository::id($userId)], [
                    'freeplayBalance' => $nextFreeplay,
                    'freeplayExpiresAt' => $fpExpiresAt,
                    'updatedAt' => $now,
                ]);

                $this->db->insertOne('transactions', [
                    'userId' => MongoRepository::id($userId),
                    'adminId' => isset($actor['_id']) ? MongoRepository::id((string) $actor['_id']) : null,
                    'amount' => abs($nextFreeplay - $freeplayBefore),
                    'type' => 'adjustment',
                    'status' => 'completed',
                    'isFreeplay' => true,
                    'balanceBefore' => $freeplayBefore,
                    'balanceAfter' => $nextFreeplay,
                    'referenceType' => 'Adjustment',
                    'reason' => 'FREEPLAY_ADJUSTMENT',
                    'description' => $note !== '' ? $note : ((($actor['role'] ?? '') === 'agent')
                        ? ('Agent ' . (string) ($actor['username'] ?? '') . ' updated freeplay balance')
                        : 'Admin updated freeplay balance'),
                    'createdAt' => $now,
                    'updatedAt' => $now,
                ]);
                $this->db->commit();
            } catch (Throwable $txErr) {
                $this->db->rollback();
                throw $txErr;
            }

            Response::json([
                'message' => 'Freeplay balance updated',
                'user' => [
                    'id' => $userId,
                    'freeplayBalance' => $nextFreeplay,
                    'freeplayExpiresAt' => $fpExpiresAt,
                ],
            ]);
        } catch (Throwable $e) {
            Response::json(['message' => 'Server error updating freeplay balance'], 500);
        }
    }

    private function resetUserPassword(string $userId): void
    {
        try {
            $actor = $this->protect(['admin', 'agent', 'master_agent', 'super_agent']);
            if ($actor === null) {
                return;
            }

            $body = Http::jsonBody();
            $newPassword = strtoupper(trim((string) ($body['newPassword'] ?? '')));
            if ($newPassword === '' || strlen($newPassword) < 6) {
                Response::json(['message' => 'Password must be at least 6 characters long'], 400);
                return;
            }

            $user = $this->db->findOne('users', ['_id' => MongoRepository::id($userId)]);
            if ($user === null || (($user['role'] ?? 'user') !== 'user')) {
                Response::json(['message' => 'User not found'], 404);
                return;
            }

            if (($actor['role'] ?? '') === 'agent' && (string) ($user['agentId'] ?? '') !== (string) ($actor['_id'] ?? '')) {
                Response::json(['message' => 'Not authorized to reset password for this user'], 403);
                return;
            }

            $passwordFields = $this->passwordFields($newPassword);
            $this->db->updateOne('users', ['_id' => MongoRepository::id($userId)], [
                'password' => $passwordFields['password'],
                'passwordCaseInsensitiveHash' => $passwordFields['passwordCaseInsensitiveHash'],
                // WARNING: displayPassword is for admin convenience only.
                // It stores the last set password in plain text.
                'displayPassword' => $newPassword,
                'updatedAt' => MongoRepository::nowUtc(),
            ]);

            // Invalidate user's existing sessions by clearing their login_failures
            // (future: implement token blacklist for immediate revocation)
            $this->db->deleteMany('login_failures', ['userId' => $userId]);

            Logger::info('Password reset by admin', [
                'actorId' => (string) ($actor['_id'] ?? ''),
                'actorUsername' => (string) ($actor['username'] ?? ''),
                'actorRole' => (string) ($actor['role'] ?? ''),
                'targetId' => $userId,
                'targetUsername' => (string) ($user['username'] ?? ''),
                'ip' => IpUtils::clientIp(),
            ]);

            $this->db->insertOne('admin_audit_log', [
                'action' => 'reset_user_password',
                'actorId' => (string) ($actor['_id'] ?? ''),
                'actorUsername' => (string) ($actor['username'] ?? ''),
                'actorRole' => (string) ($actor['role'] ?? ''),
                'targetId' => $userId,
                'targetUsername' => (string) ($user['username'] ?? ''),
                'ip' => IpUtils::clientIp(),
                'timestamp' => time(),
                'createdAt' => MongoRepository::nowUtc(),
            ]);

            Response::json(['message' => 'Password for user ' . (string) ($user['username'] ?? '') . ' has been reset successfully']);
        } catch (Throwable $e) {
            Response::json(['message' => 'Server error resetting user password'], 500);
        }
    }

    private function resetAgentPassword(string $agentId): void
    {
        try {
            $actor = $this->protect(['admin', 'agent', 'master_agent', 'super_agent']);
            if ($actor === null) {
                return;
            }
            $actorRole = strtolower(trim((string) ($actor['role'] ?? '')));
            $actorId = (string) ($actor['_id'] ?? '');
            $managedAgentSet = [];
            if (in_array($actorRole, ['master_agent', 'super_agent'], true)) {
                $managedAgentIds = $this->listManagedAgentIds($actorId);
                foreach ($managedAgentIds as $managedAgentId) {
                    $managedAgentId = trim((string) $managedAgentId);
                    if ($managedAgentId !== '' && preg_match('/^[a-f0-9]{24}$/i', $managedAgentId) === 1) {
                        $managedAgentSet[$managedAgentId] = true;
                    }
                }
            }

            $body = Http::jsonBody();
            $newPassword = strtoupper(trim((string) ($body['newPassword'] ?? '')));
            if ($newPassword === '' || strlen($newPassword) < 6) {
                Response::json(['message' => 'Password must be at least 6 characters long'], 400);
                return;
            }

            $agent = $this->db->findOne('agents', ['_id' => MongoRepository::id($agentId)]);
            if ($agent === null || (($agent['role'] ?? '') !== 'agent')) {
                Response::json(['message' => 'Agent not found'], 404);
                return;
            }

            $passwordFields = $this->passwordFields($newPassword);
            $this->db->updateOne('agents', ['_id' => MongoRepository::id($agentId)], [
                'password' => $passwordFields['password'],
                'passwordCaseInsensitiveHash' => $passwordFields['passwordCaseInsensitiveHash'],
                'displayPassword' => $newPassword,
                'updatedAt' => MongoRepository::nowUtc(),
            ]);

            Response::json(['message' => 'Password for agent ' . (string) ($agent['username'] ?? '') . ' has been reset successfully']);
        } catch (Throwable $e) {
            Response::json(['message' => 'Server error resetting agent password'], 500);
        }
    }

    private function getMessages(): void
    {
        try {
            $actor = $this->protect(['admin']);
            if ($actor === null) {
                return;
            }

            $status = isset($_GET['status']) ? trim((string) $_GET['status']) : '';
            $filter = $status !== '' ? ['status' => $status] : [];
            $messages = $this->db->findMany('messages', $filter, ['sort' => ['createdAt' => -1]]);
            Response::json($messages);
        } catch (Throwable $e) {
            Response::json(['message' => 'Server error fetching messages'], 500);
        }
    }

    private function markMessageRead(string $id): void
    {
        try {
            $actor = $this->protect(['admin']);
            if ($actor === null) {
                return;
            }

            $message = $this->db->findOne('messages', ['_id' => MongoRepository::id($id)]);
            if ($message === null) {
                Response::json(['message' => 'Message not found'], 404);
                return;
            }

            $this->db->updateOne('messages', ['_id' => MongoRepository::id($id)], [
                'read' => true,
                'updatedAt' => MongoRepository::nowUtc(),
            ]);
            Response::json(['message' => 'Message marked as read']);
        } catch (Throwable $e) {
            Response::json(['message' => 'Server error updating message'], 500);
        }
    }

    private function replyToMessage(string $id): void
    {
        try {
            $actor = $this->protect(['admin']);
            if ($actor === null) {
                return;
            }

            $body = Http::jsonBody();
            $reply = trim((string) ($body['reply'] ?? ''));
            if ($reply === '') {
                Response::json(['message' => 'Reply is required'], 400);
                return;
            }

            $message = $this->db->findOne('messages', ['_id' => MongoRepository::id($id)]);
            if ($message === null) {
                Response::json(['message' => 'Message not found'], 404);
                return;
            }

            $replies = is_array($message['replies'] ?? null) ? $message['replies'] : [];
            $replies[] = [
                'adminId' => MongoRepository::id((string) ($actor['_id'] ?? '')),
                'message' => $reply,
                'createdAt' => MongoRepository::nowUtc(),
                'updatedAt' => MongoRepository::nowUtc(),
            ];

            $this->db->updateOne('messages', ['_id' => MongoRepository::id($id)], [
                'replies' => $replies,
                'read' => true,
                'updatedAt' => MongoRepository::nowUtc(),
            ]);

            Response::json(['message' => 'Reply sent', 'id' => $id]);
        } catch (Throwable $e) {
            Response::json(['message' => 'Server error sending reply'], 500);
        }
    }

    private function deleteMessage(string $id): void
    {
        try {
            $actor = $this->protect(['admin']);
            if ($actor === null) {
                return;
            }

            $deleted = $this->db->deleteOne('messages', ['_id' => MongoRepository::id($id)]);
            if ($deleted < 1) {
                Response::json(['message' => 'Message not found'], 404);
                return;
            }
            Response::json(['message' => 'Message deleted']);
        } catch (Throwable $e) {
            Response::json(['message' => 'Server error deleting message'], 500);
        }
    }

    private function getFaqs(): void
    {
        try {
            $actor = $this->protect(['admin']);
            if ($actor === null) {
                return;
            }

            $faqs = $this->db->findMany('faqs', [], ['sort' => ['order' => 1, 'createdAt' => -1]]);
            Response::json(['faqs' => $faqs]);
        } catch (Throwable $e) {
            Response::json(['message' => 'Server error fetching FAQs'], 500);
        }
    }

    private function createFaq(): void
    {
        try {
            $actor = $this->protect(['admin']);
            if ($actor === null) {
                return;
            }

            $body = Http::jsonBody();
            $question = trim((string) ($body['question'] ?? ''));
            $answer = trim((string) ($body['answer'] ?? ''));
            if ($question === '' || $answer === '') {
                Response::json(['message' => 'question and answer are required'], 400);
                return;
            }

            $doc = [
                'question' => $question,
                'answer' => $answer,
                'status' => (string) ($body['status'] ?? 'active'),
                'order' => isset($body['order']) && is_numeric($body['order']) ? (int) $body['order'] : 0,
                'createdAt' => MongoRepository::nowUtc(),
                'updatedAt' => MongoRepository::nowUtc(),
            ];
            $id = $this->db->insertOne('faqs', $doc);
            $faq = $this->db->findOne('faqs', ['_id' => MongoRepository::id($id)]) ?? array_merge($doc, ['_id' => $id]);

            Response::json(['message' => 'FAQ created', 'faq' => $faq], 201);
        } catch (Throwable $e) {
            Response::json(['message' => 'Server error creating FAQ'], 500);
        }
    }

    private function updateFaq(string $id): void
    {
        try {
            $actor = $this->protect(['admin']);
            if ($actor === null) {
                return;
            }

            $faq = $this->db->findOne('faqs', ['_id' => MongoRepository::id($id)]);
            if ($faq === null) {
                Response::json(['message' => 'FAQ not found'], 404);
                return;
            }

            $body = Http::jsonBody();
            $updates = ['updatedAt' => MongoRepository::nowUtc()];
            if (isset($body['question']) && trim((string) $body['question']) !== '') {
                $updates['question'] = trim((string) $body['question']);
            }
            if (isset($body['answer']) && trim((string) $body['answer']) !== '') {
                $updates['answer'] = trim((string) $body['answer']);
            }
            if (isset($body['status']) && trim((string) $body['status']) !== '') {
                $updates['status'] = trim((string) $body['status']);
            }
            if (array_key_exists('order', $body) && is_numeric($body['order'])) {
                $updates['order'] = (int) $body['order'];
            }

            $this->db->updateOne('faqs', ['_id' => MongoRepository::id($id)], $updates);
            Response::json(['message' => 'FAQ updated', 'id' => $id]);
        } catch (Throwable $e) {
            Response::json(['message' => 'Server error updating FAQ'], 500);
        }
    }

    private function deleteFaq(string $id): void
    {
        try {
            $actor = $this->protect(['admin']);
            if ($actor === null) {
                return;
            }

            $deleted = $this->db->deleteOne('faqs', ['_id' => MongoRepository::id($id)]);
            if ($deleted < 1) {
                Response::json(['message' => 'FAQ not found'], 404);
                return;
            }
            Response::json(['message' => 'FAQ deleted', 'id' => $id]);
        } catch (Throwable $e) {
            Response::json(['message' => 'Server error deleting FAQ'], 500);
        }
    }

    private function getManualSections(): void
    {
        try {
            $actor = $this->protect(['admin']);
            if ($actor === null) {
                return;
            }

            $sections = $this->db->findMany('manualsections', ['status' => 'active'], ['sort' => ['order' => 1, 'createdAt' => -1]]);
            Response::json(['sections' => $sections]);
        } catch (Throwable $e) {
            Response::json(['message' => 'Server error fetching manual sections'], 500);
        }
    }

    private function createManualSection(): void
    {
        try {
            $actor = $this->protect(['admin']);
            if ($actor === null) {
                return;
            }

            $body = Http::jsonBody();
            $title = trim((string) ($body['title'] ?? ''));
            $content = trim((string) ($body['content'] ?? ''));
            if ($title === '' || $content === '') {
                Response::json(['message' => 'title and content are required'], 400);
                return;
            }

            $doc = [
                'title' => $title,
                'content' => $content,
                'order' => isset($body['order']) && is_numeric($body['order']) ? (int) $body['order'] : 0,
                'status' => (string) ($body['status'] ?? 'active'),
                'createdAt' => MongoRepository::nowUtc(),
                'updatedAt' => MongoRepository::nowUtc(),
            ];
            $id = $this->db->insertOne('manualsections', $doc);
            $section = $this->db->findOne('manualsections', ['_id' => MongoRepository::id($id)]) ?? array_merge($doc, ['_id' => $id]);

            Response::json(['message' => 'Section created', 'section' => $section], 201);
        } catch (Throwable $e) {
            Response::json(['message' => 'Server error creating manual section'], 500);
        }
    }

    private function updateManualSection(string $id): void
    {
        try {
            $actor = $this->protect(['admin']);
            if ($actor === null) {
                return;
            }

            $section = $this->db->findOne('manualsections', ['_id' => MongoRepository::id($id)]);
            if ($section === null) {
                Response::json(['message' => 'Section not found'], 404);
                return;
            }

            $body = Http::jsonBody();
            $updates = ['updatedAt' => MongoRepository::nowUtc()];
            if (isset($body['title']) && trim((string) $body['title']) !== '') {
                $updates['title'] = trim((string) $body['title']);
            }
            if (isset($body['content']) && trim((string) $body['content']) !== '') {
                $updates['content'] = trim((string) $body['content']);
            }
            if (array_key_exists('order', $body) && is_numeric($body['order'])) {
                $updates['order'] = (int) $body['order'];
            }
            if (isset($body['status']) && trim((string) $body['status']) !== '') {
                $updates['status'] = trim((string) $body['status']);
            }

            $this->db->updateOne('manualsections', ['_id' => MongoRepository::id($id)], $updates);
            Response::json(['message' => 'Section updated', 'id' => $id]);
        } catch (Throwable $e) {
            Response::json(['message' => 'Server error updating manual section'], 500);
        }
    }

    private function deleteManualSection(string $id): void
    {
        try {
            $actor = $this->protect(['admin']);
            if ($actor === null) {
                return;
            }

            $deleted = $this->db->deleteOne('manualsections', ['_id' => MongoRepository::id($id)]);
            if ($deleted < 1) {
                Response::json(['message' => 'Section not found'], 404);
                return;
            }
            Response::json(['message' => 'Section deleted', 'id' => $id]);
        } catch (Throwable $e) {
            Response::json(['message' => 'Server error deleting manual section'], 500);
        }
    }

    private function getSettings(): void
    {
        try {
            $actor = $this->protect(['admin']);
            if ($actor === null) {
                return;
            }

            $settings = $this->db->findOne('platformsettings', []);
            if ($settings === null) {
                $defaults = [
                    'platformName' => 'Sports Betting Platform',
                    'dailyBetLimit' => 10000,
                    'weeklyBetLimit' => 50000,
                    'maxOdds' => 100,
                    'minBet' => 1,
                    'maxBet' => 5000,
                    'maintenanceMode' => false,
                    'smsNotifications' => true,
                    'twoFactor' => true,
                    'createdAt' => MongoRepository::nowUtc(),
                    'updatedAt' => MongoRepository::nowUtc(),
                ];
                $id = $this->db->insertOne('platformsettings', $defaults);
                $settings = $this->db->findOne('platformsettings', ['_id' => MongoRepository::id($id)]) ?? array_merge($defaults, ['_id' => $id]);
            }

            Response::json($settings);
        } catch (Throwable $e) {
            Response::json(['message' => 'Server error fetching settings'], 500);
        }
    }

    private function updateSettings(): void
    {
        try {
            $actor = $this->protect(['admin']);
            if ($actor === null) {
                return;
            }

            $settings = $this->db->findOne('platformsettings', []);
            if ($settings === null) {
                $defaults = [
                    'platformName' => 'Sports Betting Platform',
                    'dailyBetLimit' => 10000,
                    'weeklyBetLimit' => 50000,
                    'maxOdds' => 100,
                    'minBet' => 1,
                    'maxBet' => 5000,
                    'maintenanceMode' => false,
                    'smsNotifications' => true,
                    'twoFactor' => true,
                    'createdAt' => MongoRepository::nowUtc(),
                    'updatedAt' => MongoRepository::nowUtc(),
                ];
                $id = $this->db->insertOne('platformsettings', $defaults);
                $settings = $this->db->findOne('platformsettings', ['_id' => MongoRepository::id($id)]) ?? array_merge($defaults, ['_id' => $id]);
            }

            $body = Http::jsonBody();
            $fields = [
                'platformName',
                'dailyBetLimit',
                'weeklyBetLimit',
                'maxOdds',
                'minBet',
                'maxBet',
                'maintenanceMode',
                'smsNotifications',
                'twoFactor',
            ];

            $updates = ['updatedAt' => MongoRepository::nowUtc()];
            foreach ($fields as $field) {
                if (!array_key_exists($field, $body)) {
                    continue;
                }
                $value = $body[$field];
                if (in_array($field, ['dailyBetLimit', 'weeklyBetLimit', 'maxOdds', 'minBet', 'maxBet'], true) && is_numeric($value)) {
                    $updates[$field] = (float) $value;
                    continue;
                }
                if (in_array($field, ['maintenanceMode', 'smsNotifications', 'twoFactor'], true)) {
                    $updates[$field] = (bool) $value;
                    continue;
                }
                $updates[$field] = $value;
            }

            $settingsId = (string) ($settings['_id'] ?? '');
            if ($settingsId === '' || preg_match('/^[a-f0-9]{24}$/i', $settingsId) !== 1) {
                Response::json(['message' => 'Server error updating settings'], 500);
                return;
            }

            $this->db->updateOne('platformsettings', ['_id' => MongoRepository::id($settingsId)], $updates);
            $updated = $this->db->findOne('platformsettings', ['_id' => MongoRepository::id($settingsId)]);
            Response::json(['message' => 'Settings updated', 'settings' => $updated]);
        } catch (Throwable $e) {
            Response::json(['message' => 'Server error updating settings'], 500);
        }
    }

    private function getRules(): void
    {
        try {
            $actor = $this->protect(['admin']);
            if ($actor === null) {
                return;
            }

            $rules = $this->db->findMany('rules', [], ['sort' => ['createdAt' => -1]]);
            Response::json(['rules' => $rules]);
        } catch (Throwable $e) {
            Response::json(['message' => 'Server error fetching rules'], 500);
        }
    }

    private function createRule(): void
    {
        try {
            $actor = $this->protect(['admin']);
            if ($actor === null) {
                return;
            }

            $body = Http::jsonBody();
            $title = trim((string) ($body['title'] ?? ''));
            if ($title === '') {
                Response::json(['message' => 'title is required'], 400);
                return;
            }

            $items = [];
            if (is_array($body['items'] ?? null)) {
                foreach ($body['items'] as $item) {
                    if (is_string($item)) {
                        $items[] = $item;
                    }
                }
            }

            $rule = [
                'title' => $title,
                'items' => $items,
                'status' => (string) ($body['status'] ?? 'active'),
                'createdAt' => MongoRepository::nowUtc(),
                'updatedAt' => MongoRepository::nowUtc(),
            ];
            $id = $this->db->insertOne('rules', $rule);
            $saved = $this->db->findOne('rules', ['_id' => MongoRepository::id($id)]) ?? array_merge($rule, ['_id' => $id]);

            Response::json(['message' => 'Rule created', 'rule' => $saved], 201);
        } catch (Throwable $e) {
            Response::json(['message' => 'Server error creating rule'], 500);
        }
    }

    private function updateRule(string $id): void
    {
        try {
            $actor = $this->protect(['admin']);
            if ($actor === null) {
                return;
            }

            $rule = $this->db->findOne('rules', ['_id' => MongoRepository::id($id)]);
            if ($rule === null) {
                Response::json(['message' => 'Rule not found'], 404);
                return;
            }

            $body = Http::jsonBody();
            $updates = ['updatedAt' => MongoRepository::nowUtc()];
            if (isset($body['title']) && trim((string) $body['title']) !== '') {
                $updates['title'] = trim((string) $body['title']);
            }
            if (array_key_exists('items', $body) && is_array($body['items'])) {
                $items = [];
                foreach ($body['items'] as $item) {
                    if (is_string($item)) {
                        $items[] = $item;
                    }
                }
                $updates['items'] = $items;
            }
            if (isset($body['status']) && trim((string) $body['status']) !== '') {
                $updates['status'] = trim((string) $body['status']);
            }

            $this->db->updateOne('rules', ['_id' => MongoRepository::id($id)], $updates);
            Response::json(['message' => 'Rule updated', 'id' => $id]);
        } catch (Throwable $e) {
            Response::json(['message' => 'Server error updating rule'], 500);
        }
    }

    private function deleteRule(string $id): void
    {
        try {
            $actor = $this->protect(['admin']);
            if ($actor === null) {
                return;
            }

            $deleted = $this->db->deleteOne('rules', ['_id' => MongoRepository::id($id)]);
            if ($deleted < 1) {
                Response::json(['message' => 'Rule not found'], 404);
                return;
            }
            Response::json(['message' => 'Rule deleted', 'id' => $id]);
        } catch (Throwable $e) {
            Response::json(['message' => 'Server error deleting rule'], 500);
        }
    }

    private function getFeedback(): void
    {
        try {
            $actor = $this->protect(['admin']);
            if ($actor === null) {
                return;
            }

            $status = isset($_GET['status']) ? trim((string) $_GET['status']) : '';
            $query = [];
            if ($status !== '' && $status !== 'all') {
                $query['status'] = $status;
            }

            $feedbacks = $this->db->findMany('feedbacks', $query, ['sort' => ['createdAt' => -1]]);
            $userMap = [];
            foreach ($feedbacks as $item) {
                $userId = (string) ($item['userId'] ?? '');
                if ($userId !== '' && !isset($userMap[$userId]) && preg_match('/^[a-f0-9]{24}$/i', $userId) === 1) {
                    $user = $this->db->findOne('users', ['_id' => MongoRepository::id($userId)], ['projection' => ['username' => 1, 'phoneNumber' => 1]]);
                    if ($user !== null) {
                        $userMap[$userId] = $user;
                    }
                }
            }

            $formatted = [];
            foreach ($feedbacks as $item) {
                $uid = (string) ($item['userId'] ?? '');
                $formatted[] = [
                    'id' => (string) ($item['_id'] ?? ''),
                    'user' => $userMap[$uid]['username'] ?? ($item['userLabel'] ?? 'Anonymous'),
                    'message' => $item['message'] ?? null,
                    'rating' => $item['rating'] ?? null,
                    'status' => $item['status'] ?? null,
                    'adminReply' => $item['adminReply'] ?? null,
                    'repliedAt' => $item['repliedAt'] ?? null,
                    'date' => $item['createdAt'] ?? null,
                ];
            }

            Response::json(['feedbacks' => $formatted]);
        } catch (Throwable $e) {
            Response::json(['message' => 'Server error fetching feedback'], 500);
        }
    }

    private function replyFeedback(string $id): void
    {
        try {
            $actor = $this->protect(['admin']);
            if ($actor === null) {
                return;
            }

            $body = Http::jsonBody();
            $reply = trim((string) ($body['reply'] ?? ''));
            if ($reply === '') {
                Response::json(['message' => 'reply is required'], 400);
                return;
            }

            $feedback = $this->db->findOne('feedbacks', ['_id' => MongoRepository::id($id)]);
            if ($feedback === null) {
                Response::json(['message' => 'Feedback not found'], 404);
                return;
            }

            $this->db->updateOne('feedbacks', ['_id' => MongoRepository::id($id)], [
                'adminReply' => $reply,
                'repliedAt' => MongoRepository::nowUtc(),
                'updatedAt' => MongoRepository::nowUtc(),
            ]);

            Response::json(['message' => 'Reply saved', 'id' => $id]);
        } catch (Throwable $e) {
            Response::json(['message' => 'Server error replying feedback'], 500);
        }
    }

    private function markFeedbackReviewed(string $id): void
    {
        try {
            $actor = $this->protect(['admin']);
            if ($actor === null) {
                return;
            }

            $feedback = $this->db->findOne('feedbacks', ['_id' => MongoRepository::id($id)]);
            if ($feedback === null) {
                Response::json(['message' => 'Feedback not found'], 404);
                return;
            }

            $this->db->updateOne('feedbacks', ['_id' => MongoRepository::id($id)], [
                'status' => 'reviewed',
                'updatedAt' => MongoRepository::nowUtc(),
            ]);

            Response::json(['message' => 'Feedback reviewed', 'id' => $id]);
        } catch (Throwable $e) {
            Response::json(['message' => 'Server error updating feedback'], 500);
        }
    }

    private function deleteFeedback(string $id): void
    {
        try {
            $actor = $this->protect(['admin']);
            if ($actor === null) {
                return;
            }

            $deleted = $this->db->deleteOne('feedbacks', ['_id' => MongoRepository::id($id)]);
            if ($deleted < 1) {
                Response::json(['message' => 'Feedback not found'], 404);
                return;
            }
            Response::json(['message' => 'Feedback deleted', 'id' => $id]);
        } catch (Throwable $e) {
            Response::json(['message' => 'Server error deleting feedback'], 500);
        }
    }

    private function getWeeklyFigures(): void
    {
        try {
            $actor = $this->protect(['admin', 'agent', 'master_agent', 'super_agent']);
            if ($actor === null) {
                return;
            }

            $period = (string) ($_GET['period'] ?? 'this-week');
            $now = new DateTimeImmutable('now');
            $start = $this->startOfWeek($now);
            if ($period === 'last-week') {
                $start = $start->modify('-7 days');
            } elseif ($period === 'previous') {
                $start = $start->modify('-14 days');
            } elseif (preg_match('/^weeks-ago-(\d+)$/', $period, $matches) === 1) {
                $weeksAgo = max(0, (int) ($matches[1] ?? 0));
                $start = $start->modify('-' . ($weeksAgo * 7) . ' days');
            }
            $end = $start->modify('+7 days');

            $query = ['role' => ['$in' => ['user', 'agent', 'master_agent', 'super_agent']]];
            if (($actor['role'] ?? '') === 'agent') {
                $actorId = MongoRepository::id((string) ($actor['_id'] ?? ''));
                $query['$or'] = [
                    ['agentId' => $actorId],
                    ['createdBy' => $actorId, 'createdByModel' => 'Agent'],
                    ['_id' => $actorId],
                ];
            } elseif (in_array((string) ($actor['role'] ?? ''), ['master_agent', 'super_agent'], true)) {
                $managedAgentIds = $this->listManagedAgentIds((string) ($actor['_id'] ?? ''));
                $managedAgentObjectIds = [];
                foreach ($managedAgentIds as $managedAgentId) {
                    if (preg_match('/^[a-f0-9]{24}$/i', $managedAgentId) === 1) {
                        $managedAgentObjectIds[] = MongoRepository::id($managedAgentId);
                    }
                }

                if (count($managedAgentObjectIds) === 0) {
                    Response::json([
                        'period' => $period,
                        'startDate' => $start->format(DATE_ATOM),
                        'endDate' => $end->format(DATE_ATOM),
                        'summary' => [
                            'totalPlayers' => 0,
                            'activePlayers' => 0,
                            'deadAccounts' => 0,
                            'agentsManagers' => 0,
                            'days' => [],
                            'weekTotal' => 0,
                            'balanceTotal' => 0,
                            'pendingTotal' => 0,
                        ],
                        'customers' => [],
                    ]);
                    return;
                }

                $query['$or'] = [
                    ['agentId' => ['$in' => $managedAgentObjectIds]],
                    ['createdBy' => ['$in' => $managedAgentObjectIds], 'createdByModel' => 'Agent'],
                    ['_id' => ['$in' => $managedAgentObjectIds]],
                ];
            }

            $users = $this->db->findMany('users', $query, [
                'projection' => [
                    'username' => 1,
                    'phoneNumber' => 1,
                    'fullName' => 1,
                    'balance' => 1,
                    'pendingBalance' => 1,
                    'balanceOwed' => 1,
                    'lifetime' => 1,
                    'lifetimePlusMinus' => 1,
                    'status' => 1,
                    'createdAt' => 1,
                    'lastActive' => 1,
                    'agentId' => 1,
                ],
            ]);
            $agentsManagersCount = $this->db->countDocuments('users', ['role' => ['$in' => ['agent', 'admin']]]);

            $agentSeedIds = [];
            foreach ($users as $u) {
                $aid = (string) ($u['agentId'] ?? '');
                if ($aid !== '' && preg_match('/^[a-f0-9]{24}$/i', $aid) === 1) {
                    $agentSeedIds[$aid] = true;
                }
            }

            $agentMap = [];
            $queue = array_keys($agentSeedIds);
            while (count($queue) > 0) {
                $batch = [];
                foreach ($queue as $candidateId) {
                    if ($candidateId !== '' && !isset($agentMap[$candidateId])) {
                        $batch[] = $candidateId;
                    }
                }
                if (count($batch) === 0) {
                    break;
                }
                $queue = [];

                $batchOids = array_map(static fn (string $id): string => MongoRepository::id($id), $batch);
                $agentDocs = $this->db->findMany('agents', ['_id' => ['$in' => $batchOids]], [
                    'projection' => ['_id' => 1, 'username' => 1, 'createdBy' => 1, 'createdByModel' => 1, 'role' => 1],
                ]);

                foreach ($agentDocs as $doc) {
                    $docId = (string) ($doc['_id'] ?? '');
                    if ($docId !== '') {
                        $agentMap[$docId] = $doc;
                    }
                }
                foreach ($batch as $batchId) {
                    if (!isset($agentMap[$batchId])) {
                        $agentMap[$batchId] = ['_missing' => true];
                    }
                }

                foreach ($batch as $batchId) {
                    $doc = $agentMap[$batchId] ?? null;
                    if (!is_array($doc) || (($doc['_missing'] ?? false) === true)) {
                        continue;
                    }
                    if ((string) ($doc['createdByModel'] ?? '') !== 'Agent') {
                        continue;
                    }
                    $parentId = (string) ($doc['createdBy'] ?? '');
                    if ($parentId !== '' && preg_match('/^[a-f0-9]{24}$/i', $parentId) === 1 && !isset($agentMap[$parentId])) {
                        $queue[] = $parentId;
                    }
                }
            }

            $agentHierarchyPathByUserId = [];
            $agentChainByUserId = [];
            $directAgentByUserId = [];
            foreach ($users as $u) {
                $uid = (string) ($u['_id'] ?? '');
                if ($uid === '') {
                    continue;
                }

                $aid = (string) ($u['agentId'] ?? '');
                $chainBottomUp = [];
                $cursor = $aid;
                $visited = [];
                while ($cursor !== '' && preg_match('/^[a-f0-9]{24}$/i', $cursor) === 1 && !isset($visited[$cursor])) {
                    $visited[$cursor] = true;
                    $doc = $agentMap[$cursor] ?? null;
                    if (!is_array($doc) || (($doc['_missing'] ?? false) === true)) {
                        break;
                    }

                    $username = strtoupper(trim((string) ($doc['username'] ?? '')));
                    if ($username !== '') {
                        $chainBottomUp[] = $username;
                    }

                    if ((string) ($doc['createdByModel'] ?? '') !== 'Agent') {
                        break;
                    }
                    $parent = (string) ($doc['createdBy'] ?? '');
                    if ($parent === '' || preg_match('/^[a-f0-9]{24}$/i', $parent) !== 1) {
                        break;
                    }
                    $cursor = $parent;
                }

                $chainTopDown = array_reverse($chainBottomUp);
                $directAgent = count($chainTopDown) > 0 ? (string) $chainTopDown[count($chainTopDown) - 1] : '';
                $path = count($chainTopDown) > 0 ? implode(' / ', $chainTopDown) : 'UNASSIGNED';

                $agentHierarchyPathByUserId[$uid] = $path;
                $agentChainByUserId[$uid] = $chainTopDown;
                $directAgentByUserId[$uid] = $directAgent;
            }

            $userIds = [];
            $userMap = [];
            foreach ($users as $user) {
                $uid = (string) ($user['_id'] ?? '');
                if ($uid !== '' && preg_match('/^[a-f0-9]{24}$/i', $uid) === 1) {
                    $userIds[] = MongoRepository::id($uid);
                    $userMap[$uid] = [
                        'user' => $user,
                        'daily' => [0, 0, 0, 0, 0, 0, 0],
                        'lastCreditDayIndex' => null,
                        'lastCreditTimestamp' => null,
                    ];
                }
            }

            $transactions = count($userIds) > 0
                ? $this->db->findMany('transactions', [
                    'userId' => ['$in' => $userIds],
                    'status' => 'completed',
                    'createdAt' => [
                        '$gte' => MongoRepository::utcFromMillis($start->getTimestamp() * 1000),
                        '$lt' => MongoRepository::utcFromMillis($end->getTimestamp() * 1000),
                    ],
                ], ['projection' => ['userId' => 1, 'amount' => 1, 'type' => 1, 'entrySide' => 1, 'reason' => 1, 'description' => 1, 'balanceBefore' => 1, 'balanceAfter' => 1, 'createdAt' => 1, 'status' => 1]])
                : [];

            $activeWindowStart = (new DateTimeImmutable('now'))->modify('-14 days');
            $recentWindowStart = MongoRepository::utcFromMillis($activeWindowStart->getTimestamp() * 1000);
            $userIdStrings = array_keys($userMap);
            $activeRecentUserIds = [];

            if (count($userIds) > 0) {
                $recentSportsBets = $this->db->findMany('bets', [
                    'userId' => ['$in' => $userIds],
                    'createdAt' => ['$gte' => $recentWindowStart],
                ], ['projection' => ['userId' => 1]]);

                foreach ($recentSportsBets as $bet) {
                    $uid = (string) ($bet['userId'] ?? '');
                    if ($uid !== '') {
                        $activeRecentUserIds[$uid] = true;
                    }
                }

                $recentCasinoBets = $this->db->findMany('casino_bets', [
                    '$or' => [
                        ['userId' => ['$in' => $userIds]],
                        ['userId' => ['$in' => $userIdStrings]],
                    ],
                    'createdAt' => ['$gte' => $recentWindowStart],
                ], ['projection' => ['userId' => 1]]);

                foreach ($recentCasinoBets as $bet) {
                    $uid = (string) ($bet['userId'] ?? '');
                    if ($uid !== '') {
                        $activeRecentUserIds[$uid] = true;
                    }
                }
            }

            $summaryDaily = [0, 0, 0, 0, 0, 0, 0];
            $activeWeeklyUserIds = [];
            foreach ($transactions as $tx) {
                $uid = (string) ($tx['userId'] ?? '');
                if ($uid !== '' && isset($userMap[$uid]) && $this->isWeeklyActiveTransaction($tx)) {
                    $activeWeeklyUserIds[$uid] = true;
                }

                $created = $this->toTimestampSeconds($tx['createdAt'] ?? null);
                if ($created === null) {
                    continue;
                }
                $dayIndex = (int) floor(($created - $start->getTimestamp()) / 86400);
                if ($dayIndex < 0 || $dayIndex > 6) {
                    continue;
                }
                $signed = $this->shouldExcludeFromNetSummaries($tx)
                    ? 0.0
                    : $this->getComprehensiveSignedTransactionAmount($tx);
                $summaryDaily[$dayIndex] += $signed;
                if (isset($userMap[$uid])) {
                    $userMap[$uid]['daily'][$dayIndex] += $signed;
                    if ($signed > 0.00001) {
                        $lastCreditTimestamp = $userMap[$uid]['lastCreditTimestamp'];
                        if ($lastCreditTimestamp === null || $created >= (int) $lastCreditTimestamp) {
                            $userMap[$uid]['lastCreditTimestamp'] = $created;
                            $userMap[$uid]['lastCreditDayIndex'] = $dayIndex;
                        }
                    }
                }
            }

            $dayLabels = [];
            for ($i = 0; $i < 7; $i++) {
                $d = $start->modify('+' . $i . ' days');
                $dayLabels[] = $d->format('D') . ' (' . $d->format('n/j') . ')';
            }

            $customers = [];
            foreach ($userMap as $uid => $row) {
                $user = $row['user'];
                $daily = $row['daily'];
                $weekTotal = array_sum($daily);
                $balance = $this->num($user['balance'] ?? 0);
                $pending = $this->num($user['pendingBalance'] ?? 0);
                $settleLimit = $this->num($user['balanceOwed'] ?? 0);
                $lifetime = $this->num($user['lifetime'] ?? 0);
                $lifetimePerformance = $this->num($user['lifetimePlusMinus'] ?? ($user['lifetime'] ?? 0));
                $carry = $balance - $weekTotal;
                $inactive14Days = !isset($activeRecentUserIds[$uid]);
                $activeForWeek = isset($activeWeeklyUserIds[$uid]);
                $receivedDayIndexRaw = $row['lastCreditDayIndex'] ?? null;
                $receivedDayIndex = is_int($receivedDayIndexRaw) ? $receivedDayIndexRaw : null;
                $receivedDayLabel = ($receivedDayIndex !== null && isset($dayLabels[$receivedDayIndex]))
                    ? $dayLabels[$receivedDayIndex]
                    : null;

                $customers[] = [
                    'id' => $uid,
                    'username' => $user['username'] ?? null,
                    'name' => (($user['fullName'] ?? '') !== '') ? $user['fullName'] : ($user['username'] ?? null),
                    'phoneNumber' => $user['phoneNumber'] ?? null,
                    'agentId' => (string) ($user['agentId'] ?? '') !== '' ? (string) ($user['agentId'] ?? '') : null,
                    'agentUsername' => $directAgentByUserId[$uid] ?? null,
                    'agentHierarchy' => $agentChainByUserId[$uid] ?? [],
                    'agentHierarchyPath' => $agentHierarchyPathByUserId[$uid] ?? 'UNASSIGNED',
                    'daily' => $daily,
                    'week' => $weekTotal,
                    'carry' => $carry,
                    'balance' => $balance,
                    'pending' => $pending,
                    'settleLimit' => $settleLimit,
                    'lifetime' => $lifetime,
                    'lifetimePlusMinus' => $lifetimePerformance,
                    'lifetimePerformance' => $lifetimePerformance,
                    'inactive14Days' => $inactive14Days,
                    'activeForWeek' => $activeForWeek,
                    'receivedDayIndex' => $receivedDayIndex,
                    'receivedDayLabel' => $receivedDayLabel,
                    'lastActive' => $user['lastActive'] ?? null,
                    'status' => $user['status'] ?? null,
                ];
            }

            $totalPlayers = count($users);
            $activePlayers = count($activeWeeklyUserIds);
            $deadAccounts = 0;
            $balanceTotal = 0.0;
            $pendingTotal = 0.0;
            foreach ($users as $u) {
                if (($u['status'] ?? '') === 'suspended') {
                    $deadAccounts++;
                }
                $balanceTotal += $this->num($u['balance'] ?? 0);
                $pendingTotal += $this->num($u['pendingBalance'] ?? 0);
            }
            $weekTotal = array_sum($summaryDaily);

            $days = [];
            foreach ($dayLabels as $i => $label) {
                $days[] = ['day' => $label, 'amount' => $summaryDaily[$i]];
            }

            Response::json([
                'period' => $period,
                'startDate' => $start->format(DATE_ATOM),
                'endDate' => $end->format(DATE_ATOM),
                'summary' => [
                    'totalPlayers' => $totalPlayers,
                    'activePlayers' => $activePlayers,
                    'deadAccounts' => $deadAccounts,
                    'agentsManagers' => $agentsManagersCount,
                    'days' => $days,
                    'weekTotal' => $weekTotal,
                    'balanceTotal' => $balanceTotal,
                    'pendingTotal' => $pendingTotal,
                ],
                'customers' => $customers,
            ]);
        } catch (Throwable $e) {
            Response::json(['message' => 'Server error fetching weekly figures'], 500);
        }
    }

    private function getPendingTransactions(): void
    {
        try {
            $actor = $this->protect(['admin', 'agent', 'master_agent', 'super_agent']);
            if ($actor === null) {
                return;
            }

            $query = ['status' => 'pending'];
            if (($actor['role'] ?? '') === 'agent') {
                $myUsers = $this->db->findMany('users', ['agentId' => MongoRepository::id((string) $actor['_id'])], ['projection' => ['_id' => 1]]);
                $ids = [];
                foreach ($myUsers as $u) {
                    $ids[] = MongoRepository::id((string) $u['_id']);
                }
                $query['userId'] = ['$in' => $ids];
            }

            $pending = $this->db->findMany('transactions', $query, ['sort' => ['createdAt' => -1]]);
            $userMap = [];
            foreach ($pending as $tx) {
                $uid = (string) ($tx['userId'] ?? '');
                if ($uid !== '' && !isset($userMap[$uid]) && preg_match('/^[a-f0-9]{24}$/i', $uid) === 1) {
                    $user = $this->db->findOne('users', ['_id' => MongoRepository::id($uid)], ['projection' => ['username' => 1, 'phoneNumber' => 1]]);
                    if ($user !== null) {
                        $userMap[$uid] = $user;
                    }
                }
            }

            $out = [];
            foreach ($pending as $tx) {
                $uid = (string) ($tx['userId'] ?? '');
                $out[] = [
                    'id' => (string) ($tx['_id'] ?? ''),
                    'type' => $tx['type'] ?? null,
                    'amount' => $this->num($tx['amount'] ?? 0),
                    'user' => $userMap[$uid]['username'] ?? 'Unknown',
                    'userId' => $uid !== '' ? $uid : null,
                    'date' => $tx['createdAt'] ?? null,
                    'status' => $tx['status'] ?? null,
                ];
            }
            Response::json($out);
        } catch (Throwable $e) {
            Response::json(['message' => 'Server error fetching pending items'], 500);
        }
    }

    private function approvePendingTransaction(): void
    {
        try {
            $actor = $this->protect(['admin', 'agent', 'master_agent', 'super_agent']);
            if ($actor === null) {
                return;
            }

            $body = Http::jsonBody();
            $transactionId = (string) ($body['transactionId'] ?? '');
            if ($transactionId === '' || preg_match('/^[a-f0-9]{24}$/i', $transactionId) !== 1) {
                Response::json(['message' => 'Pending transaction not found'], 404);
                return;
            }

            $this->db->beginTransaction();
            try {
                $transaction = $this->db->findOneForUpdate('transactions', ['_id' => MongoRepository::id($transactionId)]);
                if ($transaction === null || (($transaction['status'] ?? '') !== 'pending')) {
                    $this->db->rollback();
                    Response::json(['message' => 'Pending transaction not found'], 404);
                    return;
                }

                $userId = (string) ($transaction['userId'] ?? '');
                if ($userId === '' || preg_match('/^[a-f0-9]{24}$/i', $userId) !== 1) {
                    $this->db->rollback();
                    Response::json(['message' => 'User not found'], 404);
                    return;
                }
                $user = $this->db->findOneForUpdate('users', ['_id' => MongoRepository::id($userId)]);
                if ($user === null) {
                    $this->db->rollback();
                    Response::json(['message' => 'User not found'], 404);
                    return;
                }

                if (($actor['role'] ?? '') === 'agent' && (string) ($user['agentId'] ?? '') !== (string) ($actor['_id'] ?? '')) {
                    $this->db->rollback();
                    Response::json(['message' => 'Not authorized for this transaction'], 403);
                    return;
                }

                $amount = $this->num($transaction['amount'] ?? 0);
                $now = MongoRepository::nowUtc();
                $userUpdates = ['updatedAt' => $now];
                $balanceBefore = null;
                $balanceAfter = null;
                $freePlayBonusAmount = 0.0;
                $freePlayBonusPercent = 0.0;
                $freePlayBonusCap = 0.0;
                $freePlayBalanceBefore = $this->num($user['freeplayBalance'] ?? 0);
                $freePlayBalanceAfter = $freePlayBalanceBefore;
                $referralBonusAward = null;

                if (($transaction['type'] ?? '') === 'deposit') {
                    $balanceBefore = $this->num($user['balance'] ?? 0);
                    $balanceAfter = $balanceBefore + $amount;
                    $userUpdates['balance'] = $balanceAfter;

                    $bonusConfig = $this->resolveDepositFreePlayBonus($user, $amount);
                    $freePlayBonusAmount = $bonusConfig['bonusAmount'];
                    $freePlayBonusPercent = $bonusConfig['percent'];
                    $freePlayBonusCap = $bonusConfig['cap'];
                    if ($freePlayBonusAmount > 0) {
                        $freePlayBalanceAfter = $freePlayBalanceBefore + $freePlayBonusAmount;
                        $userUpdates['freeplayBalance'] = $freePlayBalanceAfter;
                    }

                } elseif (($transaction['type'] ?? '') === 'withdrawal') {
                    $balanceBefore = $this->num($user['balance'] ?? 0);
                    $balanceAfter = $balanceBefore - $amount;
                    if ($balanceAfter < 0) {
                        $this->db->rollback();
                        Response::json(['message' => 'Insufficient balance for withdrawal approval'], 400);
                        return;
                    }
                    $userUpdates['balance'] = $balanceAfter;
                }

                $this->db->updateOne('users', ['_id' => MongoRepository::id($userId)], $userUpdates);

                $txUpdates = [
                    'status' => 'completed',
                    'approvedById' => isset($actor['_id']) ? MongoRepository::id((string) $actor['_id']) : null,
                    'approvedByRole' => (string) ($actor['role'] ?? ''),
                    'approvedByUsername' => (string) ($actor['username'] ?? ''),
                    'updatedAt' => $now,
                ];
                if ($balanceBefore !== null && $balanceAfter !== null) {
                    $txUpdates['balanceBefore'] = $balanceBefore;
                    $txUpdates['balanceAfter'] = $balanceAfter;
                }
                $this->db->updateOne('transactions', ['_id' => MongoRepository::id($transactionId)], $txUpdates);
                if (($transaction['type'] ?? '') === 'deposit') {
                    $referralBonusAward = $this->grantReferralBonusForFirstCompletedDeposit(
                        $user,
                        $transactionId,
                        $amount,
                        $actor,
                        $now
                    );
                }

                if (($transaction['type'] ?? '') === 'deposit' && $freePlayBonusAmount > 0) {
                    $fpBonusDesc2 = 'Auto free play bonus ' . rtrim(rtrim(number_format($freePlayBonusPercent, 2, '.', ''), '0'), '.') . '% on deposit $' . number_format(abs($amount), 2, '.', '');
                    $referrerIdForDesc2 = trim((string) ($user['referredByUserId'] ?? ''));
                    if ($referrerIdForDesc2 !== '' && preg_match('/^[a-f0-9]{24}$/i', $referrerIdForDesc2) === 1) {
                        $referrerDoc2 = $this->db->findOne('users', ['_id' => MongoRepository::id($referrerIdForDesc2)], ['projection' => ['username' => 1]]);
                        if ($referrerDoc2 !== null && isset($referrerDoc2['username'])) {
                            $fpBonusDesc2 = 'Auto Freeplay bonus for referral ' . (string) $referrerDoc2['username'];
                        }
                    }
                    $this->db->insertOne('transactions', [
                        'userId' => MongoRepository::id($userId),
                        'agentId' => isset($user['agentId']) && preg_match('/^[a-f0-9]{24}$/i', (string) $user['agentId']) === 1
                            ? MongoRepository::id((string) $user['agentId'])
                            : null,
                        'adminId' => isset($actor['_id']) ? MongoRepository::id((string) $actor['_id']) : null,
                        'amount' => $freePlayBonusAmount,
                        'type' => 'adjustment',
                        'status' => 'completed',
                        'balanceBefore' => $freePlayBalanceBefore,
                        'balanceAfter' => $freePlayBalanceAfter,
                        'referenceType' => 'FreePlayBonus',
                        'referenceId' => MongoRepository::id($transactionId),
                        'reason' => 'DEPOSIT_FREEPLAY_BONUS',
                        'description' => $fpBonusDesc2,
                        'metadata' => [
                            'depositAmount' => round(abs($amount), 2),
                            'freePlayPercent' => $freePlayBonusPercent,
                            'maxFpCredit' => $freePlayBonusCap,
                            'approvedDepositTransactionId' => $transactionId,
                        ],
                        'createdAt' => $now,
                        'updatedAt' => $now,
                    ]);
                }
                $this->db->commit();
            } catch (Throwable $txErr) {
                $this->db->rollback();
                throw $txErr;
            }

            $response = ['message' => 'Transaction approved', 'transactionId' => $transactionId];
            if (is_array($referralBonusAward) && !empty($referralBonusAward['granted'])) {
                $response['referralBonus'] = $referralBonusAward;
            }
            Response::json($response);
        } catch (Throwable $e) {
            Response::json(['message' => 'Server error approving transaction'], 500);
        }
    }

    private function declinePendingTransaction(): void
    {
        try {
            $actor = $this->protect(['admin', 'agent', 'master_agent', 'super_agent']);
            if ($actor === null) {
                return;
            }

            $body = Http::jsonBody();
            $transactionId = (string) ($body['transactionId'] ?? '');
            if ($transactionId === '' || preg_match('/^[a-f0-9]{24}$/i', $transactionId) !== 1) {
                Response::json(['message' => 'Pending transaction not found'], 404);
                return;
            }

            $transaction = $this->db->findOne('transactions', ['_id' => MongoRepository::id($transactionId)]);
            if ($transaction === null || (($transaction['status'] ?? '') !== 'pending')) {
                Response::json(['message' => 'Pending transaction not found'], 404);
                return;
            }

            $this->db->updateOne('transactions', ['_id' => MongoRepository::id($transactionId)], [
                'status' => 'failed',
                'updatedAt' => MongoRepository::nowUtc(),
            ]);
            Response::json(['message' => 'Transaction declined', 'transactionId' => $transactionId]);
        } catch (Throwable $e) {
            Response::json(['message' => 'Server error declining transaction'], 500);
        }
    }

    private function getCashierSummary(): void
    {
        try {
            $actor = $this->protect(['admin']);
            if ($actor === null) {
                return;
            }

            $startOfDay = new DateTimeImmutable('today');
            $today = MongoRepository::utcFromMillis($startOfDay->getTimestamp() * 1000);
            $deposits = $this->db->findMany('transactions', [
                'type' => 'deposit',
                'status' => 'completed',
                'createdAt' => ['$gte' => $today],
            ], ['projection' => ['amount' => 1]]);
            $withdrawals = $this->db->findMany('transactions', [
                'type' => 'withdrawal',
                'status' => 'completed',
                'createdAt' => ['$gte' => $today],
            ], ['projection' => ['amount' => 1]]);
            $pendingCount = $this->db->countDocuments('transactions', ['status' => 'pending']);

            $totalDeposits = 0.0;
            foreach ($deposits as $d) {
                $totalDeposits += $this->num($d['amount'] ?? 0);
            }
            $totalWithdrawals = 0.0;
            foreach ($withdrawals as $w) {
                $totalWithdrawals += $this->num($w['amount'] ?? 0);
            }

            Response::json([
                'totalDeposits' => $totalDeposits,
                'totalWithdrawals' => $totalWithdrawals,
                'pendingCount' => $pendingCount,
            ]);
        } catch (Throwable $e) {
            Response::json(['message' => 'Server error fetching cashier summary'], 500);
        }
    }

    private function getCashierTransactions(): void
    {
        try {
            $actor = $this->protect(['admin']);
            if ($actor === null) {
                return;
            }

            $limit = isset($_GET['limit']) && is_numeric($_GET['limit']) ? (int) $_GET['limit'] : 50;
            $limit = min($limit, 200);
            if ($limit < 1) {
                $limit = 50;
            }

            $transactions = $this->db->findMany('transactions', [], [
                'sort' => ['createdAt' => -1],
                'limit' => $limit,
            ]);

            $userMap = [];
            foreach ($transactions as $tx) {
                $uid = (string) ($tx['userId'] ?? '');
                if ($uid !== '' && !isset($userMap[$uid]) && preg_match('/^[a-f0-9]{24}$/i', $uid) === 1) {
                    $user = $this->db->findOne('users', ['_id' => MongoRepository::id($uid)], ['projection' => ['username' => 1, 'phoneNumber' => 1]]);
                    if ($user !== null) {
                        $userMap[$uid] = $user;
                    }
                }
            }

            $formatted = [];
            foreach ($transactions as $tx) {
                $uid = (string) ($tx['userId'] ?? '');
                $formatted[] = [
                    'id' => (string) ($tx['_id'] ?? ''),
                    'type' => $tx['type'] ?? null,
                    'user' => $userMap[$uid]['username'] ?? 'Unknown',
                    'amount' => $this->num($tx['amount'] ?? 0),
                    'date' => $tx['createdAt'] ?? null,
                    'status' => $tx['status'] ?? null,
                ];
            }
            Response::json($formatted);
        } catch (Throwable $e) {
            Response::json(['message' => 'Server error fetching cashier transactions'], 500);
        }
    }

    private function getAdminMatches(): void
    {
        try {
            $actor = $this->protect(['admin']);
            if ($actor === null) {
                return;
            }

            $matches = $this->db->findMany('matches', [], ['sort' => ['startTime' => 1]]);
            $bets = $this->db->findMany('bets', [], ['sort' => ['createdAt' => -1]]);
            $selectionRowsByBetId = $this->loadSelectionRowsByBetId($bets);

            $stats = [];
            foreach ($bets as $bet) {
                $betId = (string) ($bet['_id'] ?? '');
                if ($betId === '') {
                    continue;
                }

                $matchIds = $this->matchIdsForBet($bet, $selectionRowsByBetId[$betId] ?? []);
                if ($matchIds === []) {
                    continue;
                }

                $risk = SportsbookBetSupport::riskAmount($bet);
                $payout = $this->num($bet['potentialPayout'] ?? 0);
                $status = (string) ($bet['status'] ?? '');

                foreach ($matchIds as $matchId) {
                    if (!isset($stats[$matchId])) {
                        $stats[$matchId] = [
                            'totalWagered' => 0.0,
                            'totalPayouts' => 0.0,
                            'activeBets' => 0,
                            'pendingExposure' => 0.0,
                            'pendingToWin' => 0.0,
                        ];
                    }

                    $stats[$matchId]['totalWagered'] += $risk;
                    if ($status === 'won' || $status === 'void') {
                        $stats[$matchId]['totalPayouts'] += $payout;
                    }
                    if ($status === 'pending') {
                        $stats[$matchId]['activeBets'] += 1;
                        $stats[$matchId]['pendingExposure'] += $risk;
                        $stats[$matchId]['pendingToWin'] += $payout;
                    }
                }
            }

            $response = [];
            foreach ($matches as $match) {
                $id = (string) ($match['_id'] ?? '');
                $annotated = SportsMatchStatus::annotate($match);
                $stat = $stats[$id] ?? ['totalWagered' => 0.0, 'totalPayouts' => 0.0, 'activeBets' => 0, 'pendingExposure' => 0.0, 'pendingToWin' => 0.0];
                $response[] = [
                    'id' => $id,
                    'homeTeam' => $annotated['homeTeam'] ?? null,
                    'awayTeam' => $annotated['awayTeam'] ?? null,
                    'startTime' => $annotated['startTime'] ?? null,
                    'status' => $annotated['status'] ?? null,
                    'sport' => $annotated['sport'] ?? null,
                    'activeBets' => $stat['activeBets'],
                    'pendingExposure' => $stat['pendingExposure'],
                    'pendingToWin' => $stat['pendingToWin'],
                    'totalWagered' => $stat['totalWagered'],
                    'totalPayouts' => $stat['totalPayouts'],
                    'revenue' => $stat['totalWagered'] - $stat['totalPayouts'],
                ];
            }
            Response::json($response);
        } catch (Throwable $e) {
            Response::json(['message' => 'Server error fetching matches'], 500);
        }
    }

    private function createMatch(): void
    {
        try {
            $actor = $this->protect(['admin']);
            if ($actor === null) {
                return;
            }

            $body = Http::jsonBody();
            $homeTeam = trim((string) ($body['homeTeam'] ?? ''));
            $awayTeam = trim((string) ($body['awayTeam'] ?? ''));
            $startTime = $body['startTime'] ?? null;
            $sport = trim((string) ($body['sport'] ?? ''));
            $status = trim((string) ($body['status'] ?? 'scheduled'));

            if ($homeTeam === '' || $awayTeam === '' || $startTime === null || $sport === '') {
                Response::json(['message' => 'homeTeam, awayTeam, startTime, and sport are required'], 400);
                return;
            }

            $doc = [
                'homeTeam' => $homeTeam,
                'awayTeam' => $awayTeam,
                'startTime' => $startTime,
                'sport' => $sport,
                'status' => $status === '' ? 'scheduled' : $status,
                'createdAt' => MongoRepository::nowUtc(),
                'updatedAt' => MongoRepository::nowUtc(),
            ];
            $id = $this->db->insertOne('matches', $doc);
            $created = $this->db->findOne('matches', ['_id' => MongoRepository::id($id)]) ?? array_merge($doc, ['_id' => $id]);
            Response::json($created, 201);
        } catch (Throwable $e) {
            Response::json(['message' => 'Server error creating match'], 500);
        }
    }

    private function updateMatch(string $id): void
    {
        try {
            $actor = $this->protect(['admin']);
            if ($actor === null) {
                return;
            }

            $existing = $this->db->findOne('matches', ['_id' => MongoRepository::id($id)]);
            if ($existing === null) {
                Response::json(['message' => 'Match not found'], 404);
                return;
            }

            $body = Http::jsonBody();
            $updates = ['updatedAt' => MongoRepository::nowUtc()];
            foreach (['homeTeam', 'awayTeam', 'startTime', 'sport', 'status', 'score', 'odds', 'lastUpdated'] as $field) {
                if (array_key_exists($field, $body)) {
                    $updates[$field] = $body[$field];
                }
            }

            $this->db->updateOne('matches', ['_id' => MongoRepository::id($id)], $updates);
            $updated = $this->db->findOne('matches', ['_id' => MongoRepository::id($id)]);
            Response::json($updated ?? array_merge($existing, $updates));
        } catch (Throwable $e) {
            Response::json(['message' => 'Server error updating match'], 500);
        }
    }

    private function getThirdPartyLimits(): void
    {
        try {
            $actor = $this->protect(['admin']);
            if ($actor === null) {
                return;
            }

            $limits = $this->db->findMany('thirdpartylimits', [], ['sort' => ['provider' => 1]]);
            $formatted = [];
            foreach ($limits as $limit) {
                $formatted[] = [
                    'id' => (string) ($limit['_id'] ?? ''),
                    'provider' => $limit['provider'] ?? null,
                    'dailyLimit' => $this->num($limit['dailyLimit'] ?? 0),
                    'monthlyLimit' => $this->num($limit['monthlyLimit'] ?? 0),
                    'used' => $this->num($limit['used'] ?? 0),
                    'status' => $limit['status'] ?? null,
                    'lastSync' => $limit['lastSync'] ?? null,
                ];
            }
            Response::json($formatted);
        } catch (Throwable $e) {
            Response::json(['message' => 'Server error fetching third party limits'], 500);
        }
    }

    private function updateThirdPartyLimit(string $id): void
    {
        try {
            $actor = $this->protect(['admin']);
            if ($actor === null) {
                return;
            }

            $limit = $this->db->findOne('thirdpartylimits', ['_id' => MongoRepository::id($id)]);
            if ($limit === null) {
                Response::json(['message' => 'Limit record not found'], 404);
                return;
            }

            $body = Http::jsonBody();
            $updates = ['updatedAt' => MongoRepository::nowUtc(), 'lastSync' => MongoRepository::nowUtc()];
            if (isset($body['provider']) && trim((string) $body['provider']) !== '') {
                $updates['provider'] = trim((string) $body['provider']);
            }
            if (array_key_exists('dailyLimit', $body) && is_numeric($body['dailyLimit'])) {
                $updates['dailyLimit'] = (float) $body['dailyLimit'];
            }
            if (array_key_exists('monthlyLimit', $body) && is_numeric($body['monthlyLimit'])) {
                $updates['monthlyLimit'] = (float) $body['monthlyLimit'];
            }
            if (array_key_exists('used', $body) && is_numeric($body['used'])) {
                $updates['used'] = (float) $body['used'];
            }
            if (isset($body['status']) && trim((string) $body['status']) !== '') {
                $updates['status'] = trim((string) $body['status']);
            }

            $this->db->updateOne('thirdpartylimits', ['_id' => MongoRepository::id($id)], $updates);
            $saved = $this->db->findOne('thirdpartylimits', ['_id' => MongoRepository::id($id)]) ?? array_merge($limit, $updates);
            Response::json([
                'message' => 'Limit updated',
                'limit' => [
                    'id' => (string) ($saved['_id'] ?? $id),
                    'provider' => $saved['provider'] ?? null,
                    'dailyLimit' => $this->num($saved['dailyLimit'] ?? 0),
                    'monthlyLimit' => $this->num($saved['monthlyLimit'] ?? 0),
                    'used' => $this->num($saved['used'] ?? 0),
                    'status' => $saved['status'] ?? null,
                    'lastSync' => $saved['lastSync'] ?? null,
                ],
            ]);
        } catch (Throwable $e) {
            Response::json(['message' => 'Server error updating third party limit'], 500);
        }
    }

    private function createThirdPartyLimit(): void
    {
        try {
            $actor = $this->protect(['admin']);
            if ($actor === null) {
                return;
            }

            $body = Http::jsonBody();
            $provider = trim((string) ($body['provider'] ?? ''));
            if ($provider === '') {
                Response::json(['message' => 'Provider is required'], 400);
                return;
            }

            $existing = $this->db->findOne('thirdpartylimits', ['provider' => $provider]);
            if ($existing !== null) {
                Response::json(['message' => 'Provider already exists'], 409);
                return;
            }

            $doc = [
                'provider' => $provider,
                'dailyLimit' => (array_key_exists('dailyLimit', $body) && is_numeric($body['dailyLimit'])) ? (float) $body['dailyLimit'] : 0,
                'monthlyLimit' => (array_key_exists('monthlyLimit', $body) && is_numeric($body['monthlyLimit'])) ? (float) $body['monthlyLimit'] : 0,
                'used' => (array_key_exists('used', $body) && is_numeric($body['used'])) ? (float) $body['used'] : 0,
                'status' => (isset($body['status']) && trim((string) $body['status']) !== '') ? trim((string) $body['status']) : 'active',
                'lastSync' => MongoRepository::nowUtc(),
                'createdAt' => MongoRepository::nowUtc(),
                'updatedAt' => MongoRepository::nowUtc(),
            ];
            $id = $this->db->insertOne('thirdpartylimits', $doc);
            $saved = $this->db->findOne('thirdpartylimits', ['_id' => MongoRepository::id($id)]) ?? array_merge($doc, ['_id' => $id]);

            Response::json([
                'message' => 'Limit created',
                'limit' => [
                    'id' => (string) ($saved['_id'] ?? $id),
                    'provider' => $saved['provider'] ?? null,
                    'dailyLimit' => $this->num($saved['dailyLimit'] ?? 0),
                    'monthlyLimit' => $this->num($saved['monthlyLimit'] ?? 0),
                    'used' => $this->num($saved['used'] ?? 0),
                    'status' => $saved['status'] ?? null,
                    'lastSync' => $saved['lastSync'] ?? null,
                ],
            ], 201);
        } catch (Throwable $e) {
            Response::json(['message' => 'Server error creating third party limit'], 500);
        }
    }

    private function suspendUser(): void
    {
        try {
            $actor = $this->protect(['admin', 'agent', 'master_agent', 'super_agent']);
            if ($actor === null) {
                return;
            }

            $body = Http::jsonBody();
            $userId = (string) ($body['userId'] ?? '');
            if ($userId === '' || preg_match('/^[a-f0-9]{24}$/i', $userId) !== 1) {
                Response::json(['message' => 'User not found'], 404);
                return;
            }

            $user = $this->db->findOne('users', ['_id' => MongoRepository::id($userId)]);
            if ($user === null) {
                Response::json(['message' => 'User not found'], 404);
                return;
            }

            if (($actor['role'] ?? '') === 'agent' && (string) ($user['agentId'] ?? '') !== (string) ($actor['_id'] ?? '')) {
                Response::json(['message' => 'Not authorized to suspend this user'], 403);
                return;
            }

            $this->db->updateOne('users', ['_id' => MongoRepository::id($userId)], [
                'status' => 'suspended',
                'updatedAt' => MongoRepository::nowUtc(),
            ]);

            Response::json(['message' => 'User ' . (string) ($user['username'] ?? '') . ' suspended']);
        } catch (Throwable $e) {
            Response::json(['message' => 'Server error'], 500);
        }
    }

    private function unsuspendUser(): void
    {
        try {
            $actor = $this->protect(['admin', 'agent', 'master_agent', 'super_agent']);
            if ($actor === null) {
                return;
            }

            $body = Http::jsonBody();
            $userId = (string) ($body['userId'] ?? '');
            if ($userId === '' || preg_match('/^[a-f0-9]{24}$/i', $userId) !== 1) {
                Response::json(['message' => 'User not found'], 404);
                return;
            }

            $user = $this->db->findOne('users', ['_id' => MongoRepository::id($userId)]);
            if ($user === null) {
                Response::json(['message' => 'User not found'], 404);
                return;
            }

            if (($actor['role'] ?? '') === 'agent' && (string) ($user['agentId'] ?? '') !== (string) ($actor['_id'] ?? '')) {
                Response::json(['message' => 'Not authorized to unsuspend this user'], 403);
                return;
            }

            $this->db->updateOne('users', ['_id' => MongoRepository::id($userId)], [
                'status' => 'active',
                'updatedAt' => MongoRepository::nowUtc(),
            ]);

            Response::json(['message' => 'User ' . (string) ($user['username'] ?? '') . ' unsuspended']);
        } catch (Throwable $e) {
            Response::json(['message' => 'Server error'], 500);
        }
    }

    private function getTransactionsHistory(): void
    {
        try {
            $actor = $this->protect(['admin', 'agent', 'master_agent', 'super_agent']);
            if ($actor === null) {
                return;
            }

            $modeRaw = strtolower(trim((string) ($_GET['mode'] ?? 'player-transactions')));
            $mode = match ($modeRaw) {
                'player', 'players', 'player_transactions', 'player-transactions' => 'player-transactions',
                'agent', 'agents', 'agent_transactions', 'agent-transactions' => 'agent-transactions',
                'deleted', 'deleted_transactions', 'deleted-transactions' => 'deleted-transactions',
                'freeplay', 'free_play', 'freeplay_transactions', 'free-play-transactions' => 'free-play-transactions',
                'freeplay_analysis', 'free-play-analysis' => 'free-play-analysis',
                'player_summary', 'player-summary' => 'player-summary',
                default => 'player-transactions',
            };

            $playersSearch = trim((string) ($_GET['players'] ?? $_GET['player'] ?? $_GET['user'] ?? ''));
            $agentsSearch = trim((string) ($_GET['agents'] ?? $_GET['agent'] ?? ''));
            $playersSearchLc = strtolower($playersSearch);
            $agentsSearchLc = strtolower($agentsSearch);
            $transactionType = strtolower(trim((string) ($_GET['transactionType'] ?? $_GET['type'] ?? 'all-types')));
            $status = strtolower(trim((string) ($_GET['status'] ?? 'all')));
            $time = strtolower(trim((string) ($_GET['time'] ?? '')));
            $startDateRaw = trim((string) ($_GET['startDate'] ?? $_GET['from'] ?? ''));
            $endDateRaw = trim((string) ($_GET['endDate'] ?? $_GET['to'] ?? ''));
            $limit = isset($_GET['limit']) && is_numeric($_GET['limit']) ? (int) $_GET['limit'] : 200;
            $limit = max(1, min($limit, 1000));

            $actorRole = (string) ($actor['role'] ?? '');
            $actorId = (string) ($actor['_id'] ?? '');

            $parseDateStart = static function (string $raw): ?DateTimeImmutable {
                if ($raw === '') {
                    return null;
                }
                if (preg_match('/^\d{4}-\d{2}-\d{2}$/', $raw) !== 1) {
                    return null;
                }
                try {
                    return new DateTimeImmutable($raw . ' 00:00:00');
                } catch (Throwable) {
                    return null;
                }
            };

            $startDate = null;
            if ($startDateRaw !== '') {
                $startDate = $parseDateStart($startDateRaw);
                if ($startDate === null) {
                    Response::json(['message' => 'Invalid startDate format. Use YYYY-MM-DD'], 400);
                    return;
                }
            }

            $endDateExclusive = null;
            if ($endDateRaw !== '') {
                $endDate = $parseDateStart($endDateRaw);
                if ($endDate === null) {
                    Response::json(['message' => 'Invalid endDate format. Use YYYY-MM-DD'], 400);
                    return;
                }
                $endDateExclusive = $endDate->modify('+1 day');
            }

            if ($startDate === null && $endDateExclusive === null && $time !== '') {
                $startDate = $this->getStartDateFromPeriod($time);
            }

            $toObjectIds = static function (array $ids): array {
                $out = [];
                foreach ($ids as $id) {
                    $sid = trim((string) $id);
                    if ($sid !== '' && preg_match('/^[a-f0-9]{24}$/i', $sid) === 1) {
                        $out[] = MongoRepository::id($sid);
                    }
                }
                return $out;
            };

            $scopedAgentIds = [];
            if ($actorRole === 'agent') {
                if ($actorId !== '' && preg_match('/^[a-f0-9]{24}$/i', $actorId) === 1) {
                    $scopedAgentIds[] = $actorId;
                }
            } elseif (in_array($actorRole, ['master_agent', 'super_agent'], true)) {
                $scopedAgentIds = $this->listManagedAgentIds($actorId);
            }
            $scopedAgentIds = array_values(array_unique(array_filter(
                array_map(static fn ($id): string => trim((string) $id), $scopedAgentIds),
                static fn (string $id): bool => $id !== '' && preg_match('/^[a-f0-9]{24}$/i', $id) === 1
            )));
            $scopedAgentIdSet = [];
            foreach ($scopedAgentIds as $id) {
                $scopedAgentIdSet[$id] = true;
            }

            $matchedAgentIds = null;
            if ($agentsSearch !== '') {
                $agentQuery = [
                    'username' => ['$regex' => preg_quote($agentsSearch, '/'), '$options' => 'i'],
                ];
                if ($actorRole !== 'admin') {
                    if ($scopedAgentIds === []) {
                        Response::json([
                            'mode' => $mode,
                            'transactions' => [],
                            'rows' => [],
                            'summary' => ['count' => 0, 'grossAmount' => 0, 'netAmount' => 0, 'creditAmount' => 0, 'debitAmount' => 0],
                            'meta' => ['transactionTypes' => []],
                        ]);
                        return;
                    }
                    $agentQuery['_id'] = ['$in' => $toObjectIds($scopedAgentIds)];
                }

                $matchedAgents = $this->db->findMany('agents', $agentQuery, ['projection' => ['_id' => 1], 'limit' => 5000]);
                $matchedAgentRootIds = [];
                foreach ($matchedAgents as $agentDoc) {
                    $id = (string) ($agentDoc['_id'] ?? '');
                    if ($id !== '' && preg_match('/^[a-f0-9]{24}$/i', $id) === 1) {
                        $matchedAgentRootIds[$id] = true;
                    }
                }
                $matchedAgentIds = [];
                foreach (array_keys($matchedAgentRootIds) as $matchedAgentId) {
                    foreach ($this->listManagedAgentIds($matchedAgentId) as $managedAgentId) {
                        $managedAgentId = trim((string) $managedAgentId);
                        if ($managedAgentId === '' || preg_match('/^[a-f0-9]{24}$/i', $managedAgentId) !== 1) {
                            continue;
                        }
                        if ($actorRole !== 'admin' && !isset($scopedAgentIdSet[$managedAgentId])) {
                            continue;
                        }
                        $matchedAgentIds[$managedAgentId] = true;
                    }
                }
                $matchedAgentIds = array_keys($matchedAgentIds);
                if ($matchedAgentIds === []) {
                    Response::json([
                        'mode' => $mode,
                        'transactions' => [],
                        'rows' => [],
                        'summary' => ['count' => 0, 'grossAmount' => 0, 'netAmount' => 0, 'creditAmount' => 0, 'debitAmount' => 0],
                        'meta' => ['transactionTypes' => []],
                    ]);
                    return;
                }
            }

            $needsPlayerScope = $actorRole !== 'admin' || $playersSearch !== '' || $matchedAgentIds !== null;
            $playerDocs = [];
            $playerDocsById = [];
            $playerIds = [];
            if ($needsPlayerScope) {
                // Keep player search resilient across legacy imports where role may be missing or set to custom values.
                // MongoRepository does not support $nin, so use explicit $ne clauses instead.
                $playerQuery = [
                    '$and' => [
                        ['role' => ['$ne' => 'admin']],
                        ['role' => ['$ne' => 'agent']],
                        ['role' => ['$ne' => 'master_agent']],
                        ['role' => ['$ne' => 'super_agent']],
                    ],
                ];
                if ($actorRole === 'agent') {
                    $playerQuery['agentId'] = MongoRepository::id($actorId);
                } elseif (in_array($actorRole, ['master_agent', 'super_agent'], true)) {
                    if ($scopedAgentIds === []) {
                        Response::json([
                            'mode' => $mode,
                            'transactions' => [],
                            'rows' => [],
                            'summary' => ['count' => 0, 'grossAmount' => 0, 'netAmount' => 0, 'creditAmount' => 0, 'debitAmount' => 0],
                            'meta' => ['transactionTypes' => []],
                        ]);
                        return;
                    }
                    $playerQuery['agentId'] = ['$in' => $toObjectIds($scopedAgentIds)];
                }

                if ($matchedAgentIds !== null) {
                    $playerQuery['agentId'] = ['$in' => $toObjectIds($matchedAgentIds)];
                }

                if ($playersSearch !== '') {
                    $safe = preg_quote($playersSearch, '/');
                    $playerQuery['$or'] = [
                        ['username' => ['$regex' => $safe, '$options' => 'i']],
                        ['fullName' => ['$regex' => $safe, '$options' => 'i']],
                        ['firstName' => ['$regex' => $safe, '$options' => 'i']],
                        ['lastName' => ['$regex' => $safe, '$options' => 'i']],
                        ['phoneNumber' => ['$regex' => $safe, '$options' => 'i']],
                    ];
                }

                $playerDocs = $this->db->findMany('users', $playerQuery, [
                    'projection' => ['_id' => 1, 'username' => 1, 'fullName' => 1, 'agentId' => 1, 'balance' => 1, 'freeplayBalance' => 1],
                    'limit' => 50000,
                ]);
                foreach ($playerDocs as $userDoc) {
                    $id = (string) ($userDoc['_id'] ?? '');
                    if ($id === '' || preg_match('/^[a-f0-9]{24}$/i', $id) !== 1) {
                        continue;
                    }
                    $playerIds[$id] = true;
                    $playerDocsById[$id] = $userDoc;
                }
                $playerIds = array_keys($playerIds);
                if ($playerIds === []) {
                    Response::json([
                        'mode' => $mode,
                        'transactions' => [],
                        'rows' => [],
                        'summary' => ['count' => 0, 'grossAmount' => 0, 'netAmount' => 0, 'creditAmount' => 0, 'debitAmount' => 0],
                        'meta' => ['transactionTypes' => []],
                    ]);
                    return;
                }
            }

            $collection = $mode === 'deleted-transactions' ? 'deleted_transactions' : 'transactions';
            $dateField = $mode === 'deleted-transactions' ? 'deletedAt' : 'createdAt';
            $query = [];
            if ($needsPlayerScope) {
                $query['userId'] = ['$in' => $toObjectIds($playerIds)];
            }

            if ($status !== '' && $status !== 'all') {
                $query['status'] = $status;
            }

            if ($transactionType !== '' && $transactionType !== 'all' && $transactionType !== 'all-types') {
                if ($transactionType === 'casino') {
                    $query['type'] = ['$in' => ['casino_bet_debit', 'casino_bet_credit']];
                } elseif ($transactionType === 'wager') {
                    $query['type'] = ['$in' => ['bet_placed', 'casino_bet_debit']];
                } elseif ($transactionType === 'payout') {
                    $query['type'] = ['$in' => ['bet_won', 'bet_refund', 'casino_bet_credit']];
                } else {
                    $query['type'] = $transactionType;
                }
            }

            $isFreePlayMode = in_array($mode, ['free-play-transactions', 'free-play-analysis'], true);
            $isFreePlayType = in_array($transactionType, ['freeplay', 'free-play', 'fp', 'fp_deposit'], true);
            if ($isFreePlayMode || $isFreePlayType) {
                $query['$or'] = [
                    ['reason' => 'FREEPLAY_ADJUSTMENT'],
                    ['reason' => 'DEPOSIT_FREEPLAY_BONUS'],
                    ['reason' => 'REFERRAL_FREEPLAY_BONUS'],
                    ['reason' => 'NEW_PLAYER_FREEPLAY_BONUS'],
                    ['type' => 'fp_deposit'],
                    ['description' => ['$regex' => 'free\\s*play', '$options' => 'i']],
                ];
            }

            $dateQuery = [];
            if ($startDate !== null) {
                $dateQuery['$gte'] = MongoRepository::utcFromMillis($startDate->getTimestamp() * 1000);
            }
            if ($endDateExclusive !== null) {
                $dateQuery['$lt'] = MongoRepository::utcFromMillis($endDateExclusive->getTimestamp() * 1000);
            }
            if ($dateQuery !== []) {
                $query[$dateField] = $dateQuery;
            }

            $fetchLimit = $limit;
            if (in_array($mode, ['agent-transactions', 'free-play-analysis', 'player-summary'], true)) {
                $fetchLimit = min(5000, max($limit * 5, 500));
            }

            $rawRows = $this->db->findMany($collection, $query, ['sort' => [$dateField => -1], 'limit' => $fetchLimit]);
            $rows = [];
            foreach ($rawRows as $row) {
                if ($mode === 'deleted-transactions' && is_array($row['transaction'] ?? null)) {
                    $tx = (array) $row['transaction'];
                    if (!isset($tx['userId']) && isset($row['userId'])) {
                        $tx['userId'] = $row['userId'];
                    }
                    $tx['_deletedAt'] = $row['deletedAt'] ?? null;
                    $tx['_deletedById'] = $row['deletedById'] ?? null;
                    $tx['_deletedByRole'] = $row['deletedByRole'] ?? null;
                    $tx['_deletedByUsername'] = $row['deletedByUsername'] ?? null;
                    $tx['_deletedTxId'] = (string) ($row['_id'] ?? '');
                    $rows[] = $tx;
                    continue;
                }
                $rows[] = $row;
            }

            $actorIdSet = [];
            foreach ($rows as $tx) {
                $aid = (string) ($tx['agentId'] ?? '');
                if ($aid !== '' && preg_match('/^[a-f0-9]{24}$/i', $aid) === 1) {
                    $actorIdSet[$aid] = true;
                }
                $adminId = (string) ($tx['adminId'] ?? '');
                if ($adminId !== '' && preg_match('/^[a-f0-9]{24}$/i', $adminId) === 1) {
                    $actorIdSet[$adminId] = true;
                }
                $deletedById = (string) ($tx['_deletedById'] ?? '');
                if ($deletedById !== '' && preg_match('/^[a-f0-9]{24}$/i', $deletedById) === 1) {
                    $actorIdSet[$deletedById] = true;
                }
            }
            $actorIds = array_keys($actorIdSet);

            $actorAgents = [];
            $actorAdmins = [];
            if ($actorIds !== []) {
                $actorOids = $toObjectIds($actorIds);
                if ($actorOids !== []) {
                    $agentRows = $this->db->findMany('agents', ['_id' => ['$in' => $actorOids]], ['projection' => ['_id' => 1, 'username' => 1, 'role' => 1]]);
                    foreach ($agentRows as $doc) {
                        $id = (string) ($doc['_id'] ?? '');
                        if ($id !== '') {
                            $actorAgents[$id] = $doc;
                        }
                    }
                    $adminRows = $this->db->findMany('admins', ['_id' => ['$in' => $actorOids]], ['projection' => ['_id' => 1, 'username' => 1, 'role' => 1]]);
                    foreach ($adminRows as $doc) {
                        $id = (string) ($doc['_id'] ?? '');
                        if ($id !== '') {
                            $actorAdmins[$id] = $doc;
                        }
                    }
                }
            }

            if ($mode === 'agent-transactions') {
                $allowedAgentActorSet = null;
                if ($actorRole === 'agent') {
                    $allowedAgentActorSet = [$actorId => true];
                } elseif (in_array($actorRole, ['master_agent', 'super_agent'], true)) {
                    $allowedAgentActorSet = $scopedAgentIdSet;
                } elseif ($matchedAgentIds !== null) {
                    $allowedAgentActorSet = [];
                    foreach ($matchedAgentIds as $id) {
                        $allowedAgentActorSet[$id] = true;
                    }
                }

                $agentRows = [];
                foreach ($rows as $tx) {
                    $candidateActorId = (string) ($tx['agentId'] ?? '');
                    if ($candidateActorId === '') {
                        $candidateActorId = (string) ($tx['adminId'] ?? '');
                    }
                    $reason = strtoupper(trim((string) ($tx['reason'] ?? '')));
                    $description = strtolower((string) ($tx['description'] ?? ''));
                    $isAgentDriven = ($candidateActorId !== '' && isset($actorAgents[$candidateActorId]))
                        || ((string) ($tx['agentId'] ?? '') !== '')
                        || str_starts_with($reason, 'AGENT_')
                        || str_contains($description, 'agent ');
                    if (!$isAgentDriven) {
                        continue;
                    }

                    if (is_array($allowedAgentActorSet)) {
                        if ($candidateActorId === '' || !isset($allowedAgentActorSet[$candidateActorId])) {
                            continue;
                        }
                    }
                    $agentRows[] = $tx;
                }
                $rows = $agentRows;
            }

            $referencedPlayerIds = [];
            foreach ($rows as $tx) {
                $uid = (string) ($tx['userId'] ?? '');
                if ($uid !== '' && preg_match('/^[a-f0-9]{24}$/i', $uid) === 1) {
                    $referencedPlayerIds[$uid] = true;
                }
            }
            $missingPlayerIds = [];
            foreach (array_keys($referencedPlayerIds) as $pid) {
                if (!isset($playerDocsById[$pid])) {
                    $missingPlayerIds[] = $pid;
                }
            }
            if ($missingPlayerIds !== []) {
                $missingUsers = $this->db->findMany('users', ['_id' => ['$in' => $toObjectIds($missingPlayerIds)]], [
                    'projection' => ['_id' => 1, 'username' => 1, 'fullName' => 1, 'agentId' => 1, 'balance' => 1, 'freeplayBalance' => 1],
                ]);
                foreach ($missingUsers as $doc) {
                    $id = (string) ($doc['_id'] ?? '');
                    if ($id !== '') {
                        $playerDocsById[$id] = $doc;
                    }
                }
            }

            $agentIdSet = [];
            foreach ($playerDocsById as $userDoc) {
                $aid = (string) ($userDoc['agentId'] ?? '');
                if ($aid !== '' && preg_match('/^[a-f0-9]{24}$/i', $aid) === 1) {
                    $agentIdSet[$aid] = true;
                }
            }
            foreach ($actorIds as $id) {
                if ($id !== '' && preg_match('/^[a-f0-9]{24}$/i', $id) === 1) {
                    $agentIdSet[$id] = true;
                }
            }
            if ($matchedAgentIds !== null) {
                foreach ($matchedAgentIds as $id) {
                    if ($id !== '' && preg_match('/^[a-f0-9]{24}$/i', $id) === 1) {
                        $agentIdSet[$id] = true;
                    }
                }
            }

            $agentDocsById = [];
            $agentLookupIds = array_keys($agentIdSet);
            if ($agentLookupIds !== []) {
                $agents = $this->db->findMany('agents', ['_id' => ['$in' => $toObjectIds($agentLookupIds)]], ['projection' => ['_id' => 1, 'username' => 1, 'role' => 1]]);
                foreach ($agents as $doc) {
                    $id = (string) ($doc['_id'] ?? '');
                    if ($id !== '') {
                        $agentDocsById[$id] = $doc;
                    }
                }
            }

            $computeSignedAmount = function (array $tx): float {
                $amount = $this->num($tx['amount'] ?? 0);
                $entrySide = strtoupper(trim((string) ($tx['entrySide'] ?? '')));
                if ($entrySide === 'DEBIT') {
                    return -$amount;
                }
                if ($entrySide === 'CREDIT') {
                    return $amount;
                }

                $type = strtolower(trim((string) ($tx['type'] ?? '')));
                if ($type === 'adjustment') {
                    $beforeRaw = $tx['balanceBefore'] ?? null;
                    $afterRaw = $tx['balanceAfter'] ?? null;
                    if ($beforeRaw !== null && $afterRaw !== null && is_numeric($beforeRaw) && is_numeric($afterRaw)) {
                        return ((float) $afterRaw) - ((float) $beforeRaw);
                    }
                }

                return match ($type) {
                    'deposit', 'bet_won', 'bet_refund', 'casino_bet_credit', 'fp_deposit' => $amount,
                    'withdrawal', 'bet_placed', 'casino_bet_debit', 'bet_lost' => -$amount,
                    default => 0.0,
                };
            };

            $formatted = [];
            foreach ($rows as $tx) {
                $uid = (string) ($tx['userId'] ?? '');
                $playerDoc = $uid !== '' ? ($playerDocsById[$uid] ?? null) : null;
                $assignedAgentId = is_array($playerDoc) ? (string) ($playerDoc['agentId'] ?? '') : '';
                $assignedAgentUsername = ($assignedAgentId !== '' && isset($agentDocsById[$assignedAgentId]))
                    ? (string) ($agentDocsById[$assignedAgentId]['username'] ?? '')
                    : null;

                $actorRefId = (string) ($tx['agentId'] ?? '');
                if ($actorRefId === '') {
                    $actorRefId = (string) ($tx['adminId'] ?? '');
                }
                if ($actorRefId === '') {
                    $actorRefId = (string) ($tx['_deletedById'] ?? '');
                }

                $actorUsername = null;
                $actorRoleResolved = null;
                if ($actorRefId !== '' && isset($agentDocsById[$actorRefId])) {
                    $actorUsername = $agentDocsById[$actorRefId]['username'] ?? null;
                    $actorRoleResolved = $agentDocsById[$actorRefId]['role'] ?? 'agent';
                } elseif ($actorRefId !== '' && isset($actorAdmins[$actorRefId])) {
                    $actorUsername = $actorAdmins[$actorRefId]['username'] ?? null;
                    $actorRoleResolved = $actorAdmins[$actorRefId]['role'] ?? 'admin';
                } elseif (($tx['_deletedByUsername'] ?? null) !== null) {
                    $actorUsername = $tx['_deletedByUsername'];
                    $actorRoleResolved = $tx['_deletedByRole'] ?? null;
                }

                $reason = (string) ($tx['reason'] ?? '');
                $description = (string) ($tx['description'] ?? '');
                $isFreePlay = strtoupper($reason) === 'FREEPLAY_ADJUSTMENT'
                    || strtoupper($reason) === 'DEPOSIT_FREEPLAY_BONUS'
                    || strtoupper($reason) === 'REFERRAL_FREEPLAY_BONUS'
                    || strtoupper($reason) === 'NEW_PLAYER_FREEPLAY_BONUS'
                    || strtolower((string) ($tx['type'] ?? '')) === 'fp_deposit'
                    || str_contains(strtolower($description), 'freeplay')
                    || str_contains(strtolower($description), 'free play');

                $amount = $this->num($tx['amount'] ?? 0);
                $signedAmount = $computeSignedAmount($tx);
                $balanceBefore = array_key_exists('balanceBefore', $tx) && $tx['balanceBefore'] !== null ? $this->num($tx['balanceBefore']) : null;
                $balanceAfter = array_key_exists('balanceAfter', $tx) && $tx['balanceAfter'] !== null ? $this->num($tx['balanceAfter']) : null;

                $formatted[] = [
                    'id' => (string) ($tx['_deletedTxId'] ?? ($tx['_id'] ?? '')),
                    'transactionId' => (string) ($tx['_id'] ?? ''),
                    'type' => $tx['type'] ?? null,
                    'entrySide' => $tx['entrySide'] ?? null,
                    'sourceType' => $tx['sourceType'] ?? null,
                    'referenceType' => $tx['referenceType'] ?? null,
                    'referenceId' => $tx['referenceId'] ?? null,
                    'status' => $tx['status'] ?? null,
                    'amount' => $amount,
                    'signedAmount' => $signedAmount,
                    'balanceBefore' => $balanceBefore,
                    'balanceAfter' => $balanceAfter,
                    'reason' => $reason !== '' ? $reason : null,
                    'description' => $description !== '' ? $description : null,
                    'date' => $tx['_deletedAt'] ?? ($tx['createdAt'] ?? null),
                    'createdAt' => $tx['createdAt'] ?? null,
                    'deletedAt' => $tx['_deletedAt'] ?? null,
                    'deletedById' => $tx['_deletedById'] ?? null,
                    'deletedByRole' => $tx['_deletedByRole'] ?? null,
                    'deletedByUsername' => $tx['_deletedByUsername'] ?? null,
                    'userId' => $uid !== '' ? $uid : null,
                    'user' => is_array($playerDoc) ? ($playerDoc['username'] ?? null) : null,
                    'playerId' => $uid !== '' ? $uid : null,
                    'playerUsername' => is_array($playerDoc) ? ($playerDoc['username'] ?? null) : null,
                    'playerName' => is_array($playerDoc) ? (($playerDoc['fullName'] ?? '') !== '' ? $playerDoc['fullName'] : ($playerDoc['username'] ?? null)) : null,
                    'agentId' => $assignedAgentId !== '' ? $assignedAgentId : null,
                    'agentUsername' => $assignedAgentUsername,
                    'actorId' => $actorRefId !== '' ? $actorRefId : null,
                    'actorUsername' => $actorUsername,
                    'actorRole' => $actorRoleResolved,
                    'isFreePlay' => $isFreePlay,
                ];
            }

            $containsNeedle = static function (?string $haystack, string $needleLc): bool {
                if ($needleLc === '') {
                    return true;
                }
                if ($haystack === null) {
                    return false;
                }
                return str_contains(strtolower($haystack), $needleLc);
            };

            $applyAgentTextFilter = $agentsSearchLc !== '' && $matchedAgentIds === null;
            if ($playersSearchLc !== '' || $applyAgentTextFilter) {
                $formatted = array_values(array_filter($formatted, static function (array $row) use ($playersSearchLc, $agentsSearchLc, $applyAgentTextFilter, $containsNeedle): bool {
                    if ($playersSearchLc !== '') {
                        $playerMatch = $containsNeedle((string) ($row['playerUsername'] ?? ''), $playersSearchLc)
                            || $containsNeedle((string) ($row['playerName'] ?? ''), $playersSearchLc)
                            || $containsNeedle((string) ($row['description'] ?? ''), $playersSearchLc)
                            || $containsNeedle((string) ($row['reason'] ?? ''), $playersSearchLc);
                        if (!$playerMatch) {
                            return false;
                        }
                    }

                    if ($applyAgentTextFilter) {
                        $agentMatch = $containsNeedle((string) ($row['agentUsername'] ?? ''), $agentsSearchLc)
                            || $containsNeedle((string) ($row['actorUsername'] ?? ''), $agentsSearchLc)
                            || $containsNeedle((string) ($row['description'] ?? ''), $agentsSearchLc);
                        if (!$agentMatch) {
                            return false;
                        }
                    }

                    return true;
                }));
            }

            $grossAmount = 0.0;
            $netAmount = 0.0;
            $creditAmount = 0.0;
            $debitAmount = 0.0;
            foreach ($formatted as $row) {
                $amt = $this->num($row['amount'] ?? 0);
                $signed = $this->num($row['signedAmount'] ?? 0);
                $grossAmount += abs($amt);
                $netAmount += $signed;
                if ($signed >= 0) {
                    $creditAmount += $signed;
                } else {
                    $debitAmount += abs($signed);
                }
            }

            $resultType = 'transactions';
            $rowsOut = $formatted;
            if ($mode === 'free-play-analysis') {
                $resultType = 'analysis';
                $analysisByPlayer = [];
                foreach ($formatted as $row) {
                    $pid = (string) ($row['playerId'] ?? '');
                    if ($pid === '') {
                        continue;
                    }
                    if (!isset($analysisByPlayer[$pid])) {
                        $analysisByPlayer[$pid] = [
                            'playerId' => $pid,
                            'playerUsername' => $row['playerUsername'] ?? null,
                            'playerName' => $row['playerName'] ?? null,
                            'agentId' => $row['agentId'] ?? null,
                            'agentUsername' => $row['agentUsername'] ?? null,
                            'transactionCount' => 0,
                            'creditAmount' => 0.0,
                            'debitAmount' => 0.0,
                            'netAmount' => 0.0,
                            'grossAmount' => 0.0,
                            'lastTransactionAt' => null,
                            'currentFreeplayBalance' => $this->num($playerDocsById[$pid]['freeplayBalance'] ?? 0),
                        ];
                    }
                    $signed = $this->num($row['signedAmount'] ?? 0);
                    $amount = abs($this->num($row['amount'] ?? 0));
                    $analysisByPlayer[$pid]['transactionCount']++;
                    $analysisByPlayer[$pid]['grossAmount'] += $amount;
                    $analysisByPlayer[$pid]['netAmount'] += $signed;
                    if ($signed >= 0) {
                        $analysisByPlayer[$pid]['creditAmount'] += $signed;
                    } else {
                        $analysisByPlayer[$pid]['debitAmount'] += abs($signed);
                    }
                    $prevTs = $this->toTimestampSeconds($analysisByPlayer[$pid]['lastTransactionAt'] ?? null) ?? 0;
                    $currTs = $this->toTimestampSeconds($row['date'] ?? null) ?? 0;
                    if ($currTs > $prevTs) {
                        $analysisByPlayer[$pid]['lastTransactionAt'] = $row['date'] ?? null;
                    }
                }
                $rowsOut = array_values($analysisByPlayer);
                usort($rowsOut, static function (array $a, array $b): int {
                    $diff = abs((float) ($b['netAmount'] ?? 0)) <=> abs((float) ($a['netAmount'] ?? 0));
                    if ($diff !== 0) {
                        return $diff;
                    }
                    return strcmp((string) ($a['playerUsername'] ?? ''), (string) ($b['playerUsername'] ?? ''));
                });
                $rowsOut = array_slice($rowsOut, 0, $limit);
            } elseif ($mode === 'player-summary') {
                $resultType = 'summary';
                $summaryByPlayer = [];
                foreach ($formatted as $row) {
                    $pid = (string) ($row['playerId'] ?? '');
                    if ($pid === '') {
                        continue;
                    }
                    if (!isset($summaryByPlayer[$pid])) {
                        $summaryByPlayer[$pid] = [
                            'playerId' => $pid,
                            'playerUsername' => $row['playerUsername'] ?? null,
                            'playerName' => $row['playerName'] ?? null,
                            'agentId' => $row['agentId'] ?? null,
                            'agentUsername' => $row['agentUsername'] ?? null,
                            'transactionCount' => 0,
                            'creditAmount' => 0.0,
                            'debitAmount' => 0.0,
                            'netAmount' => 0.0,
                            'wagerAmount' => 0.0,
                            'payoutAmount' => 0.0,
                            'depositAmount' => 0.0,
                            'withdrawalAmount' => 0.0,
                            'adjustmentAmount' => 0.0,
                            'lastTransactionAt' => null,
                            'currentBalance' => $this->num($playerDocsById[$pid]['balance'] ?? 0),
                            'currentFreeplayBalance' => $this->num($playerDocsById[$pid]['freeplayBalance'] ?? 0),
                        ];
                    }
                    $signed = $this->num($row['signedAmount'] ?? 0);
                    $amountAbs = abs($this->num($row['amount'] ?? 0));
                    $typeVal = strtolower(trim((string) ($row['type'] ?? '')));
                    $summaryByPlayer[$pid]['transactionCount']++;
                    $summaryByPlayer[$pid]['netAmount'] += $signed;
                    if ($signed >= 0) {
                        $summaryByPlayer[$pid]['creditAmount'] += $signed;
                    } else {
                        $summaryByPlayer[$pid]['debitAmount'] += abs($signed);
                    }

                    if (in_array($typeVal, ['bet_placed', 'casino_bet_debit'], true)) {
                        $summaryByPlayer[$pid]['wagerAmount'] += $amountAbs;
                    }
                    if (in_array($typeVal, ['bet_won', 'bet_refund', 'casino_bet_credit'], true)) {
                        $summaryByPlayer[$pid]['payoutAmount'] += $amountAbs;
                    }
                    if ($typeVal === 'deposit') {
                        $summaryByPlayer[$pid]['depositAmount'] += $amountAbs;
                    }
                    if ($typeVal === 'withdrawal') {
                        $summaryByPlayer[$pid]['withdrawalAmount'] += $amountAbs;
                    }
                    if ($typeVal === 'adjustment' || $typeVal === 'fp_deposit') {
                        $summaryByPlayer[$pid]['adjustmentAmount'] += $amountAbs;
                    }

                    $prevTs = $this->toTimestampSeconds($summaryByPlayer[$pid]['lastTransactionAt'] ?? null) ?? 0;
                    $currTs = $this->toTimestampSeconds($row['date'] ?? null) ?? 0;
                    if ($currTs > $prevTs) {
                        $summaryByPlayer[$pid]['lastTransactionAt'] = $row['date'] ?? null;
                    }
                }
                $rowsOut = array_values($summaryByPlayer);
                usort($rowsOut, static function (array $a, array $b): int {
                    $diff = abs((float) ($b['netAmount'] ?? 0)) <=> abs((float) ($a['netAmount'] ?? 0));
                    if ($diff !== 0) {
                        return $diff;
                    }
                    return strcmp((string) ($a['playerUsername'] ?? ''), (string) ($b['playerUsername'] ?? ''));
                });
                $rowsOut = array_slice($rowsOut, 0, $limit);
            } else {
                $rowsOut = array_slice($rowsOut, 0, $limit);
            }

            $transactionTypeOptions = [
                ['value' => 'all-types', 'label' => 'Transactions Type'],
                ['value' => 'deposit', 'label' => 'Deposit'],
                ['value' => 'withdrawal', 'label' => 'Withdrawal'],
                ['value' => 'adjustment', 'label' => 'Adjustment'],
                ['value' => 'wager', 'label' => 'Wager'],
                ['value' => 'payout', 'label' => 'Payout'],
                ['value' => 'casino', 'label' => 'Casino'],
                ['value' => 'fp_deposit', 'label' => 'Free Play'],
            ];

            Response::json([
                'mode' => $mode,
                'resultType' => $resultType,
                'transactions' => $rowsOut,
                'rows' => $rowsOut,
                'summary' => [
                    'count' => count($formatted),
                    'grossAmount' => $grossAmount,
                    'netAmount' => $netAmount,
                    'creditAmount' => $creditAmount,
                    'debitAmount' => $debitAmount,
                ],
                'filters' => [
                    'agents' => $agentsSearch,
                    'players' => $playersSearch,
                    'transactionType' => $transactionType,
                    'status' => $status,
                    'startDate' => $startDateRaw !== '' ? $startDateRaw : null,
                    'endDate' => $endDateRaw !== '' ? $endDateRaw : null,
                    'time' => $time !== '' ? $time : null,
                ],
                'meta' => [
                    'transactionTypes' => $transactionTypeOptions,
                    'viewModes' => [
                        ['value' => 'player-transactions', 'label' => 'Player Transactions'],
                        ['value' => 'agent-transactions', 'label' => 'Agent Transactions'],
                        ['value' => 'deleted-transactions', 'label' => 'Deleted Transactions'],
                        ['value' => 'free-play-transactions', 'label' => 'Free Play Transactions'],
                        ['value' => 'free-play-analysis', 'label' => 'Free Play Analysis'],
                        ['value' => 'player-summary', 'label' => 'Player Summary'],
                    ],
                ],
            ]);
        } catch (Throwable $e) {
            Response::json(['message' => 'Server error fetching transaction history'], 500);
        }
    }

    private function deleteTransactionsHistory(): void
    {
        try {
            $actor = $this->protect(['admin', 'agent', 'master_agent', 'super_agent']);
            if ($actor === null) {
                return;
            }
            $actorRole = strtolower(trim((string) ($actor['role'] ?? '')));
            $actorId = (string) ($actor['_id'] ?? '');
            $managedAgentSet = [];
            if (in_array($actorRole, ['master_agent', 'super_agent'], true)) {
                $managedAgentIds = $this->listManagedAgentIds($actorId);
                foreach ($managedAgentIds as $managedAgentId) {
                    $managedAgentId = trim((string) $managedAgentId);
                    if ($managedAgentId !== '' && preg_match('/^[a-f0-9]{24}$/i', $managedAgentId) === 1) {
                        $managedAgentSet[$managedAgentId] = true;
                    }
                }
            }

            $body = Http::jsonBody();
            $ids = is_array($body['ids'] ?? null) ? $body['ids'] : [];
            if (count($ids) === 0) {
                Response::json(['message' => 'Transaction ids are required'], 400);
                return;
            }

            $requestedIds = [];
            foreach ($ids as $idRaw) {
                $id = is_string($idRaw) ? trim($idRaw) : '';
                if ($id === '' || preg_match('/^[a-f0-9]{24}$/i', $id) !== 1) {
                    continue;
                }
                $requestedIds[$id] = true;
            }
            $requestedIds = array_keys($requestedIds);
            if ($requestedIds === []) {
                Response::json(['message' => 'No valid transaction ids were provided'], 400);
                return;
            }

            $deleted = 0;
            $skipped = 0;
            $cascadeDeleted = 0;
            $processedIds = [];
            $warnings = [];
            foreach ($requestedIds as $id) {
                if (isset($processedIds[$id])) {
                    continue;
                }

                $this->db->beginTransaction();
                try {
                    $rootTx = $this->db->findOneForUpdate('transactions', ['_id' => MongoRepository::id($id)]);
                    if ($rootTx === null) {
                        $this->db->rollback();
                        $skipped++;
                        $warnings[] = ['id' => $id, 'message' => 'Transaction not found'];
                        continue;
                    }

                    $userId = (string) ($rootTx['userId'] ?? '');
                    if ($userId === '' || preg_match('/^[a-f0-9]{24}$/i', $userId) !== 1) {
                        $this->db->rollback();
                        $skipped++;
                        $warnings[] = ['id' => $id, 'message' => 'Transaction has invalid user context'];
                        continue;
                    }
                    $user = $this->db->findOneForUpdate('users', ['_id' => MongoRepository::id($userId)]);
                    if (!is_array($user)) {
                        $this->db->rollback();
                        $skipped++;
                        $warnings[] = ['id' => $id, 'message' => 'Associated user record was not found for reversal.'];
                        continue;
                    }
                    if (!$this->canActorDeleteUserTransaction($actorRole, $actorId, $managedAgentSet, $user)) {
                        $this->db->rollback();
                        $skipped++;
                        $warnings[] = ['id' => $id, 'message' => 'Not authorized to delete this transaction'];
                        continue;
                    }

                    $txDocsById = [$id => $rootTx];
                    if ($this->isDepositTransaction($rootTx)) {
                        $linkedBonusTx = $this->findLinkedFreePlayBonusTransactionsForDeposit($id, $rootTx);
                        foreach ($linkedBonusTx as $bonusTx) {
                            $bonusId = (string) ($bonusTx['_id'] ?? '');
                            if ($bonusId === '' || preg_match('/^[a-f0-9]{24}$/i', $bonusId) !== 1 || isset($txDocsById[$bonusId])) {
                                continue;
                            }
                            $lockedBonusTx = $this->db->findOneForUpdate('transactions', ['_id' => MongoRepository::id($bonusId)]);
                            if ($lockedBonusTx !== null) {
                                $txDocsById[$bonusId] = $lockedBonusTx;
                            }
                        }
                    }

                    $lockedUsersById = [$userId => $user];
                    foreach ($txDocsById as $txDoc) {
                        $txUserId = trim((string) ($txDoc['userId'] ?? ''));
                        if ($txUserId === '' || preg_match('/^[a-f0-9]{24}$/i', $txUserId) !== 1) {
                            throw new RuntimeException('Linked transaction has invalid user context');
                        }
                        if (isset($lockedUsersById[$txUserId])) {
                            continue;
                        }

                        $linkedUser = $this->db->findOneForUpdate('users', ['_id' => MongoRepository::id($txUserId)]);
                        if (!is_array($linkedUser)) {
                            throw new RuntimeException('Associated user record was not found for reversal.');
                        }
                        if (!$this->canActorDeleteUserTransaction($actorRole, $actorId, $managedAgentSet, $linkedUser)) {
                            throw new RuntimeException('Not authorized to delete linked transaction');
                        }

                        $lockedUsersById[$txUserId] = $linkedUser;
                    }

                    $mainBalanceDeltaByUserId = [];
                    $freeplayBalanceDeltaByUserId = [];
                    $lifetimeDeltaByUserId = [];
                    $resetReferralBonusByUserId = [];
                    foreach ($txDocsById as $txDoc) {
                        $status = strtolower(trim((string) ($txDoc['status'] ?? '')));
                        if ($status !== 'completed') {
                            continue;
                        }

                        $txUserId = trim((string) ($txDoc['userId'] ?? ''));
                        if ($txUserId === '' || preg_match('/^[a-f0-9]{24}$/i', $txUserId) !== 1) {
                            throw new RuntimeException('Linked transaction has invalid user context');
                        }

                        $signed = $this->getComprehensiveSignedTransactionAmount($txDoc);
                        if ($this->isFreePlayBalanceTransaction($txDoc)) {
                            $freeplayBalanceDeltaByUserId[$txUserId] = ($freeplayBalanceDeltaByUserId[$txUserId] ?? 0.0) + $signed;
                        } else {
                            $mainBalanceDeltaByUserId[$txUserId] = ($mainBalanceDeltaByUserId[$txUserId] ?? 0.0) + $signed;
                            $lifetimeDeltaByUserId[$txUserId] = ($lifetimeDeltaByUserId[$txUserId] ?? 0.0) + $this->getLifetimeAdjustmentDelta($txDoc);
                        }

                        $reason = strtoupper(trim((string) ($txDoc['reason'] ?? '')));
                        if ($reason === 'REFERRAL_FREEPLAY_BONUS') {
                            $metadata = is_array($txDoc['metadata'] ?? null) ? $txDoc['metadata'] : [];
                            $referredUserId = trim((string) ($metadata['referredUserId'] ?? ''));
                            if ($referredUserId !== '' && preg_match('/^[a-f0-9]{24}$/i', $referredUserId) === 1) {
                                $resetReferralBonusByUserId[$referredUserId] = true;
                            }
                        }
                    }

                    $now = MongoRepository::nowUtc();
                    foreach ($lockedUsersById as $lockedUserId => $lockedUser) {
                        $mainBalanceDelta = $mainBalanceDeltaByUserId[$lockedUserId] ?? 0.0;
                        $freeplayBalanceDelta = $freeplayBalanceDeltaByUserId[$lockedUserId] ?? 0.0;
                        $lifetimeDelta = $lifetimeDeltaByUserId[$lockedUserId] ?? 0.0;
                        $shouldResetReferralBonus = !empty($resetReferralBonusByUserId[$lockedUserId]);

                        $balanceNeedsUpdate = abs($mainBalanceDelta) > 0.00001;
                        $freeplayNeedsUpdate = abs($freeplayBalanceDelta) > 0.00001;
                        $lifetimeNeedsUpdate = abs($lifetimeDelta) > 0.00001;
                        if (!$balanceNeedsUpdate && !$freeplayNeedsUpdate && !$lifetimeNeedsUpdate && !$shouldResetReferralBonus) {
                            continue;
                        }

                        $userUpdates = ['updatedAt' => $now];

                        if ($balanceNeedsUpdate) {
                            $currentBalance = $this->num($lockedUser['balance'] ?? 0);
                            $nextBalanceRaw = $currentBalance - $mainBalanceDelta;
                            $userUpdates['balance'] = round($nextBalanceRaw, 2);
                        }

                        if ($freeplayNeedsUpdate) {
                            $currentFreeplay = $this->num($lockedUser['freeplayBalance'] ?? 0);
                            $nextFreeplayRaw = $currentFreeplay - $freeplayBalanceDelta;
                            if ($nextFreeplayRaw < -0.00001) {
                                throw new RuntimeException('Cannot delete transaction because linked free play bonus has already been used.');
                            }
                            $userUpdates['freeplayBalance'] = max(0.0, round($nextFreeplayRaw, 2));
                        }

                        if ($lifetimeNeedsUpdate) {
                            $currentLifetime = $this->num($lockedUser['lifetime'] ?? 0);
                            $userUpdates['lifetime'] = round($currentLifetime - $lifetimeDelta, 2);
                        }

                        if ($shouldResetReferralBonus) {
                            $userUpdates['referralBonusGranted'] = false;
                            $userUpdates['referralBonusGrantedAt'] = null;
                            $userUpdates['referralQualifiedDepositAt'] = null;
                            $userUpdates['referralBonusAmount'] = 0.0;
                            $userUpdates['referralBonusSourceDepositId'] = null;
                        }

                        $this->db->updateOne('users', ['_id' => MongoRepository::id($lockedUserId)], $userUpdates);
                    }

                    $deletedThisRoot = 0;
                    $cascadeDeletedThisRoot = 0;
                    foreach ($txDocsById as $txId => $txDoc) {
                        $deletedCount = $this->db->deleteOne('transactions', ['_id' => MongoRepository::id($txId)]);
                        if ($deletedCount <= 0) {
                            continue;
                        }

                        $this->db->insertOne('deleted_transactions', [
                            'transactionId' => $txId,
                            'userId' => $txDoc['userId'] ?? null,
                            'type' => $txDoc['type'] ?? null,
                            'status' => $txDoc['status'] ?? null,
                            'amount' => $this->num($txDoc['amount'] ?? 0),
                            'createdAt' => $txDoc['createdAt'] ?? null,
                            'transaction' => $txDoc,
                            'deletedById' => (string) ($actor['_id'] ?? ''),
                            'deletedByRole' => (string) ($actor['role'] ?? ''),
                            'deletedByUsername' => (string) ($actor['username'] ?? ''),
                            'deletedAt' => $now,
                            'updatedAt' => $now,
                            'cascadeRootTransactionId' => $id,
                            'cascadeDeleted' => $txId !== $id,
                        ]);

                        $processedIds[$txId] = true;
                        $deleted++;
                        $deletedThisRoot++;
                        if ($txId !== $id) {
                            $cascadeDeleted++;
                            $cascadeDeletedThisRoot++;
                        }
                    }

                    if ($deletedThisRoot === 0) {
                        $this->db->rollback();
                        $skipped++;
                        $warnings[] = ['id' => $id, 'message' => 'Transaction could not be deleted'];
                        continue;
                    }

                    $this->db->commit();
                    if ($cascadeDeletedThisRoot > 0) {
                        $warnings[] = [
                            'id' => $id,
                            'message' => 'Deleted linked free play transactions: ' . $cascadeDeletedThisRoot,
                        ];
                    }
                } catch (Throwable $txError) {
                    $this->db->rollback();
                    $skipped++;
                    $warnings[] = ['id' => $id, 'message' => $txError->getMessage()];
                }
            }
            if ($deleted > 0) {
                $this->invalidateHeaderSummaryCache();
            }

            Response::json([
                'message' => 'Transactions delete completed',
                'deleted' => $deleted,
                'skipped' => $skipped,
                'cascadeDeleted' => $cascadeDeleted,
                'warnings' => $warnings,
            ]);
        } catch (Throwable $e) {
            Response::json(['message' => 'Server error deleting transactions'], 500);
        }
    }

    private function isFreePlayBalanceTransaction(array $transaction): bool
    {
        $reason = strtoupper(trim((string) ($transaction['reason'] ?? '')));
        if (in_array($reason, ['FREEPLAY_ADJUSTMENT', 'DEPOSIT_FREEPLAY_BONUS', 'REFERRAL_FREEPLAY_BONUS', 'NEW_PLAYER_FREEPLAY_BONUS'], true)) {
            return true;
        }

        $referenceType = strtoupper(trim((string) ($transaction['referenceType'] ?? '')));
        if ($referenceType === 'FREEPLAYBONUS') {
            return true;
        }

        $type = strtolower(trim((string) ($transaction['type'] ?? '')));
        return $type === 'fp_deposit';
    }

    /**
     * @param array<string, bool> $managedAgentSet
     * @param array<string, mixed> $user
     */
    private function canActorDeleteUserTransaction(string $actorRole, string $actorId, array $managedAgentSet, array $user): bool
    {
        if ($actorRole === 'admin') {
            return true;
        }

        $userAgentId = trim((string) ($user['agentId'] ?? ''));
        if ($userAgentId === '' || preg_match('/^[a-f0-9]{24}$/i', $userAgentId) !== 1) {
            return false;
        }

        if ($actorRole === 'agent') {
            return $actorId !== '' && $userAgentId === $actorId;
        }

        if (in_array($actorRole, ['master_agent', 'super_agent'], true)) {
            return isset($managedAgentSet[$userAgentId]);
        }

        return false;
    }

    private function isDepositTransaction(array $transaction): bool
    {
        $type = strtolower(trim((string) ($transaction['type'] ?? '')));
        if ($type !== 'deposit') {
            return false;
        }

        $status = strtolower(trim((string) ($transaction['status'] ?? '')));
        return $status === '' || $status === 'completed';
    }

    private function isFundingTransaction(array $transaction): bool
    {
        $type = strtolower(trim((string) ($transaction['type'] ?? '')));
        return $type === 'deposit' || $type === 'withdrawal';
    }

    private function shouldExcludeFromNetSummaries(array $transaction): bool
    {
        return $this->isFundingTransaction($transaction) || $this->isPromotionalOrFreePlayTransaction($transaction);
    }

    private function getLifetimeAdjustmentDelta(array $transaction): float
    {
        $type = strtolower(trim((string) ($transaction['type'] ?? '')));
        if ($type !== 'adjustment') {
            return 0.0;
        }

        $reason = strtoupper(trim((string) ($transaction['reason'] ?? '')));
        $lifetimeAdjustmentReasons = [
            'ADMIN_CREDIT_ADJUSTMENT',
            'ADMIN_DEBIT_ADJUSTMENT',
            'CASHIER_CREDIT_ADJUSTMENT',
            'CASHIER_DEBIT_ADJUSTMENT',
        ];
        if (!in_array($reason, $lifetimeAdjustmentReasons, true)) {
            return 0.0;
        }

        return $this->getComprehensiveSignedTransactionAmount($transaction);
    }

    /**
     * @return array<int, array<string, mixed>>
     */
    private function findLinkedFreePlayBonusTransactionsForDeposit(string $depositTransactionId, array $depositTransaction): array
    {
        $matches = [];
        if (preg_match('/^[a-f0-9]{24}$/i', $depositTransactionId) === 1) {
            $linkedCandidates = $this->db->findMany('transactions', [
                'status' => 'completed',
                '$or' => [
                    ['referenceId' => MongoRepository::id($depositTransactionId)],
                    ['metadata.sourceTransactionId' => $depositTransactionId],
                    ['metadata.sourceDepositTransactionId' => $depositTransactionId],
                    ['metadata.approvedDepositTransactionId' => $depositTransactionId],
                    ['metadata.depositTransactionId' => $depositTransactionId],
                ],
            ], [
                'sort' => ['createdAt' => -1],
                'limit' => 120,
            ]);

            foreach ($linkedCandidates as $candidate) {
                $candidateId = (string) ($candidate['_id'] ?? '');
                if (
                    $candidateId === ''
                    || $candidateId === $depositTransactionId
                    || !$this->isFreePlayBalanceTransaction($candidate)
                ) {
                    continue;
                }
                $matches[$candidateId] = $candidate;
            }
        }

        $userId = (string) ($depositTransaction['userId'] ?? '');
        if ($userId === '' || preg_match('/^[a-f0-9]{24}$/i', $userId) !== 1) {
            return array_values($matches);
        }

        $depositAmount = abs($this->num($depositTransaction['amount'] ?? 0));
        $depositCreatedTs = $this->toTimestampSeconds($depositTransaction['createdAt'] ?? null);
        $candidates = $this->db->findMany('transactions', [
            'userId' => MongoRepository::id($userId),
            'status' => 'completed',
            'type' => 'adjustment',
            'reason' => 'DEPOSIT_FREEPLAY_BONUS',
        ], [
            'sort' => ['createdAt' => -1],
            'limit' => 120,
        ]);

        foreach ($candidates as $candidate) {
            $candidateId = (string) ($candidate['_id'] ?? '');
            if ($candidateId === '' || $candidateId === $depositTransactionId) {
                continue;
            }

            $referenceId = (string) ($candidate['referenceId'] ?? '');
            if ($referenceId !== '' && $referenceId === $depositTransactionId) {
                $matches[] = $candidate;
                continue;
            }

            $metadata = is_array($candidate['metadata'] ?? null) ? $candidate['metadata'] : [];
            $metadataSourceId = (string) (
                $metadata['sourceTransactionId']
                ?? $metadata['approvedDepositTransactionId']
                ?? $metadata['depositTransactionId']
                ?? ''
            );
            if ($metadataSourceId !== '' && $metadataSourceId === $depositTransactionId) {
                $matches[] = $candidate;
                continue;
            }

            // Backward compatibility for legacy rows without explicit linkage ids.
            $candidateDepositAmount = abs($this->num($metadata['depositAmount'] ?? 0));
            if ($depositAmount > 0.00001 && $candidateDepositAmount > 0.00001 && abs($candidateDepositAmount - $depositAmount) > 0.01) {
                continue;
            }
            $candidateCreatedTs = $this->toTimestampSeconds($candidate['createdAt'] ?? null);
            if ($depositCreatedTs !== null && $candidateCreatedTs !== null && abs($candidateCreatedTs - $depositCreatedTs) <= 5) {
                $matches[$candidateId] = $candidate;
            }
        }

        return array_values($matches);
    }

    private function getDeletedWagers(): void
    {
        try {
            $actor = $this->protect(['admin']);
            if ($actor === null) {
                return;
            }

            $user = (string) ($_GET['user'] ?? '');
            $sport = (string) ($_GET['sport'] ?? '');
            $status = (string) ($_GET['status'] ?? '');
            $time = (string) ($_GET['time'] ?? '');
            $limit = isset($_GET['limit']) && is_numeric($_GET['limit']) ? (int) $_GET['limit'] : 200;
            $limit = min($limit, 500);

            $query = [];
            if ($status !== '' && $status !== 'all') {
                $query['status'] = $status;
            }
            if ($sport !== '' && $sport !== 'all') {
                $query['sport'] = $sport;
            }
            $startDate = $this->getStartDateFromPeriod($time);
            if ($startDate !== null) {
                $query['deletedAt'] = ['$gte' => MongoRepository::utcFromMillis($startDate->getTimestamp() * 1000)];
            }

            if ($user !== '') {
                $users = $this->db->findMany('users', ['username' => ['$regex' => $user, '$options' => 'i']], ['projection' => ['_id' => 1]]);
                $userIds = [];
                foreach ($users as $u) {
                    $uid = (string) ($u['_id'] ?? '');
                    if ($uid !== '' && preg_match('/^[a-f0-9]{24}$/i', $uid) === 1) {
                        $userIds[] = MongoRepository::id($uid);
                    }
                }
                $query['userId'] = ['$in' => $userIds];
            }

            $wagers = $this->db->findMany('deletedwagers', $query, ['sort' => ['deletedAt' => -1], 'limit' => $limit]);
            $userMap = [];
            foreach ($wagers as $wager) {
                $uid = (string) ($wager['userId'] ?? '');
                if ($uid !== '' && !isset($userMap[$uid]) && preg_match('/^[a-f0-9]{24}$/i', $uid) === 1) {
                    $u = $this->db->findOne('users', ['_id' => MongoRepository::id($uid)], ['projection' => ['username' => 1, 'phoneNumber' => 1]]);
                    if ($u !== null) {
                        $userMap[$uid] = $u;
                    }
                }
            }

            $formatted = [];
            foreach ($wagers as $wager) {
                $uid = (string) ($wager['userId'] ?? '');
                $formatted[] = [
                    'id' => (string) ($wager['_id'] ?? ''),
                    'user' => $userMap[$uid]['username'] ?? 'Unknown',
                    'userId' => $uid !== '' ? $uid : null,
                    'amount' => $this->num($wager['amount'] ?? 0),
                    'sport' => $wager['sport'] ?? null,
                    'reason' => $wager['reason'] ?? null,
                    'status' => $wager['status'] ?? null,
                    'deletedAt' => $wager['deletedAt'] ?? null,
                    'restoredAt' => $wager['restoredAt'] ?? null,
                ];
            }

            Response::json(['wagers' => $formatted]);
        } catch (Throwable $e) {
            Response::json(['message' => 'Server error fetching deleted wagers'], 500);
        }
    }

    private function restoreDeletedWager(string $id): void
    {
        try {
            $actor = $this->protect(['admin']);
            if ($actor === null) {
                return;
            }

            $wager = $this->db->findOne('deletedwagers', ['_id' => MongoRepository::id($id)]);
            if ($wager === null) {
                Response::json(['message' => 'Deleted wager not found'], 404);
                return;
            }

            $this->db->updateOne('deletedwagers', ['_id' => MongoRepository::id($id)], [
                'status' => 'restored',
                'restoredAt' => MongoRepository::nowUtc(),
                'restoredBy' => MongoRepository::id((string) ($actor['_id'] ?? '')),
                'updatedAt' => MongoRepository::nowUtc(),
            ]);

            Response::json(['message' => 'Wager restored', 'id' => $id]);
        } catch (Throwable $e) {
            Response::json(['message' => 'Server error restoring wager'], 500);
        }
    }

    private function getSportsbookLinks(): void
    {
        try {
            $actor = $this->protect(['admin']);
            if ($actor === null) {
                return;
            }

            $links = $this->db->findMany('sportsbooklinks', [], ['sort' => ['name' => 1]]);
            $formatted = [];
            foreach ($links as $link) {
                $formatted[] = [
                    'id' => (string) ($link['_id'] ?? ''),
                    'name' => $link['name'] ?? null,
                    'url' => $link['url'] ?? null,
                    'status' => $link['status'] ?? null,
                    'lastSync' => $link['lastSync'] ?? null,
                    'notes' => $link['notes'] ?? null,
                ];
            }
            Response::json(['links' => $formatted]);
        } catch (Throwable $e) {
            Response::json(['message' => 'Server error fetching sportsbook links'], 500);
        }
    }

    private function createSportsbookLink(): void
    {
        try {
            $actor = $this->protect(['admin']);
            if ($actor === null) {
                return;
            }

            $body = Http::jsonBody();
            $name = trim((string) ($body['name'] ?? ''));
            $url = trim((string) ($body['url'] ?? ''));
            if ($name === '' || $url === '') {
                Response::json(['message' => 'name and url are required'], 400);
                return;
            }

            $existing = $this->db->findOne('sportsbooklinks', ['name' => $name]);
            if ($existing !== null) {
                Response::json(['message' => 'Provider already exists'], 409);
                return;
            }

            $doc = [
                'name' => $name,
                'url' => $url,
                'status' => (isset($body['status']) && trim((string) $body['status']) !== '') ? trim((string) $body['status']) : 'active',
                'notes' => (array_key_exists('notes', $body)) ? $body['notes'] : null,
                'createdBy' => MongoRepository::id((string) ($actor['_id'] ?? '')),
                'lastSync' => null,
                'createdAt' => MongoRepository::nowUtc(),
                'updatedAt' => MongoRepository::nowUtc(),
            ];
            $id = $this->db->insertOne('sportsbooklinks', $doc);
            $saved = $this->db->findOne('sportsbooklinks', ['_id' => MongoRepository::id($id)]) ?? array_merge($doc, ['_id' => $id]);

            Response::json([
                'message' => 'Link created',
                'link' => [
                    'id' => (string) ($saved['_id'] ?? $id),
                    'name' => $saved['name'] ?? $name,
                    'url' => $saved['url'] ?? $url,
                    'status' => $saved['status'] ?? 'active',
                    'lastSync' => $saved['lastSync'] ?? null,
                    'notes' => $saved['notes'] ?? null,
                ],
            ], 201);
        } catch (Throwable $e) {
            Response::json(['message' => 'Server error creating sportsbook link'], 500);
        }
    }

    private function updateSportsbookLink(string $id): void
    {
        try {
            $actor = $this->protect(['admin']);
            if ($actor === null) {
                return;
            }

            $link = $this->db->findOne('sportsbooklinks', ['_id' => MongoRepository::id($id)]);
            if ($link === null) {
                Response::json(['message' => 'Link not found'], 404);
                return;
            }

            $body = Http::jsonBody();
            $updates = ['updatedAt' => MongoRepository::nowUtc()];
            if (isset($body['name']) && trim((string) $body['name']) !== '') {
                $updates['name'] = trim((string) $body['name']);
            }
            if (isset($body['url']) && trim((string) $body['url']) !== '') {
                $updates['url'] = trim((string) $body['url']);
            }
            if (isset($body['status']) && trim((string) $body['status']) !== '') {
                $updates['status'] = trim((string) $body['status']);
            }
            if (array_key_exists('notes', $body)) {
                $updates['notes'] = $body['notes'];
            }

            $this->db->updateOne('sportsbooklinks', ['_id' => MongoRepository::id($id)], $updates);
            Response::json(['message' => 'Link updated', 'id' => $id]);
        } catch (Throwable $e) {
            Response::json(['message' => 'Server error updating sportsbook link'], 500);
        }
    }

    private function deleteSportsbookLink(string $id): void
    {
        try {
            $actor = $this->protect(['admin']);
            if ($actor === null) {
                return;
            }

            $link = $this->db->findOne('sportsbooklinks', ['_id' => MongoRepository::id($id)]);
            if ($link === null) {
                Response::json(['message' => 'Link not found'], 404);
                return;
            }

            $this->db->deleteOne('sportsbooklinks', ['_id' => MongoRepository::id($id)]);
            Response::json(['message' => 'Link deleted', 'id' => $id]);
        } catch (Throwable $e) {
            Response::json(['message' => 'Server error deleting sportsbook link'], 500);
        }
    }

    private function testSportsbookLink(string $id): void
    {
        try {
            $actor = $this->protect(['admin']);
            if ($actor === null) {
                return;
            }

            $link = $this->db->findOne('sportsbooklinks', ['_id' => MongoRepository::id($id)]);
            if ($link === null) {
                Response::json(['message' => 'Link not found'], 404);
                return;
            }

            $now = MongoRepository::nowUtc();
            $this->db->updateOne('sportsbooklinks', ['_id' => MongoRepository::id($id)], [
                'lastSync' => $now,
                'updatedAt' => $now,
            ]);
            $saved = $this->db->findOne('sportsbooklinks', ['_id' => MongoRepository::id($id)]);
            Response::json([
                'message' => 'Link tested',
                'id' => $id,
                'lastSync' => $saved['lastSync'] ?? null,
            ]);
        } catch (Throwable $e) {
            Response::json(['message' => 'Server error testing link'], 500);
        }
    }

    private function getBillingSummary(): void
    {
        try {
            $actor = $this->protect(['admin']);
            if ($actor === null) {
                return;
            }

            $invoices = $this->db->findMany('billinginvoices', []);
            $totals = ['paid' => 0.0, 'outstanding' => 0.0, 'total' => 0.0];
            foreach ($invoices as $invoice) {
                $amount = $this->num($invoice['amount'] ?? 0);
                if (($invoice['status'] ?? '') === 'paid') {
                    $totals['paid'] += $amount;
                }
                if (in_array((string) ($invoice['status'] ?? ''), ['pending', 'overdue'], true)) {
                    $totals['outstanding'] += $amount;
                }
                $totals['total'] += $amount;
            }
            Response::json($totals);
        } catch (Throwable $e) {
            Response::json(['message' => 'Server error fetching billing summary'], 500);
        }
    }

    private function getBillingInvoices(): void
    {
        try {
            $actor = $this->protect(['admin']);
            if ($actor === null) {
                return;
            }

            $status = (string) ($_GET['status'] ?? '');
            $limit = isset($_GET['limit']) && is_numeric($_GET['limit']) ? (int) $_GET['limit'] : 200;
            $limit = min($limit, 500);

            $query = [];
            if ($status !== '' && $status !== 'all') {
                $query['status'] = $status;
            }

            $invoices = $this->db->findMany('billinginvoices', $query, ['sort' => ['createdAt' => -1], 'limit' => $limit]);
            $formatted = [];
            foreach ($invoices as $inv) {
                $formatted[] = [
                    'id' => (string) ($inv['_id'] ?? ''),
                    'invoice' => $inv['invoiceNumber'] ?? null,
                    'amount' => $this->num($inv['amount'] ?? 0),
                    'status' => $inv['status'] ?? null,
                    'date' => $inv['createdAt'] ?? null,
                    'dueDate' => $inv['dueDate'] ?? null,
                    'paidAt' => $inv['paidAt'] ?? null,
                    'notes' => $inv['notes'] ?? null,
                ];
            }
            Response::json(['invoices' => $formatted]);
        } catch (Throwable $e) {
            Response::json(['message' => 'Server error fetching billing invoices'], 500);
        }
    }

    private function createBillingInvoice(): void
    {
        try {
            $actor = $this->protect(['admin']);
            if ($actor === null) {
                return;
            }

            $body = Http::jsonBody();
            $invoiceNumber = trim((string) ($body['invoiceNumber'] ?? ''));
            if ($invoiceNumber === '' || !array_key_exists('amount', $body)) {
                Response::json(['message' => 'invoiceNumber and amount are required'], 400);
                return;
            }

            $existing = $this->db->findOne('billinginvoices', ['invoiceNumber' => $invoiceNumber]);
            if ($existing !== null) {
                Response::json(['message' => 'Invoice already exists'], 409);
                return;
            }

            $status = (isset($body['status']) && trim((string) $body['status']) !== '') ? trim((string) $body['status']) : 'pending';
            $dueDate = null;
            if (isset($body['dueDate']) && is_string($body['dueDate']) && $body['dueDate'] !== '') {
                $ts = strtotime($body['dueDate']);
                if ($ts !== false) {
                    $dueDate = MongoRepository::utcFromMillis($ts * 1000);
                }
            }
            $paidAt = null;
            if ($status === 'paid') {
                $paidAt = MongoRepository::nowUtc();
            }

            $doc = [
                'invoiceNumber' => $invoiceNumber,
                'amount' => $this->num($body['amount']),
                'status' => $status,
                'dueDate' => $dueDate,
                'notes' => (array_key_exists('notes', $body)) ? $body['notes'] : null,
                'createdBy' => MongoRepository::id((string) ($actor['_id'] ?? '')),
                'paidAt' => $paidAt,
                'createdAt' => MongoRepository::nowUtc(),
                'updatedAt' => MongoRepository::nowUtc(),
            ];
            $id = $this->db->insertOne('billinginvoices', $doc);
            $invoice = $this->db->findOne('billinginvoices', ['_id' => MongoRepository::id($id)]) ?? array_merge($doc, ['_id' => $id]);

            Response::json([
                'message' => 'Invoice created',
                'invoice' => [
                    'id' => (string) ($invoice['_id'] ?? $id),
                    'invoice' => $invoice['invoiceNumber'] ?? $invoiceNumber,
                    'amount' => $this->num($invoice['amount'] ?? 0),
                    'status' => $invoice['status'] ?? $status,
                    'date' => $invoice['createdAt'] ?? null,
                    'dueDate' => $invoice['dueDate'] ?? null,
                    'paidAt' => $invoice['paidAt'] ?? null,
                    'notes' => $invoice['notes'] ?? null,
                ],
            ], 201);
        } catch (Throwable $e) {
            Response::json(['message' => 'Server error creating invoice'], 500);
        }
    }

    private function updateBillingInvoice(string $id): void
    {
        try {
            $actor = $this->protect(['admin']);
            if ($actor === null) {
                return;
            }

            $invoice = $this->db->findOne('billinginvoices', ['_id' => MongoRepository::id($id)]);
            if ($invoice === null) {
                Response::json(['message' => 'Invoice not found'], 404);
                return;
            }

            $body = Http::jsonBody();
            $updates = ['updatedAt' => MongoRepository::nowUtc()];
            if (array_key_exists('amount', $body)) {
                $updates['amount'] = $this->num($body['amount']);
            }
            if (isset($body['status']) && trim((string) $body['status']) !== '') {
                $updates['status'] = trim((string) $body['status']);
                if ($updates['status'] === 'paid') {
                    $updates['paidAt'] = MongoRepository::nowUtc();
                }
            }
            if (array_key_exists('dueDate', $body)) {
                if (is_string($body['dueDate']) && $body['dueDate'] !== '') {
                    $ts = strtotime($body['dueDate']);
                    $updates['dueDate'] = $ts === false ? null : MongoRepository::utcFromMillis($ts * 1000);
                } else {
                    $updates['dueDate'] = null;
                }
            }
            if (array_key_exists('notes', $body)) {
                $updates['notes'] = $body['notes'];
            }

            $this->db->updateOne('billinginvoices', ['_id' => MongoRepository::id($id)], $updates);
            Response::json(['message' => 'Invoice updated', 'id' => $id]);
        } catch (Throwable $e) {
            Response::json(['message' => 'Server error updating invoice'], 500);
        }
    }

    private function getBillingInvoiceById(string $id): void
    {
        try {
            $actor = $this->protect(['admin']);
            if ($actor === null) {
                return;
            }

            $invoice = $this->db->findOne('billinginvoices', ['_id' => MongoRepository::id($id)]);
            if ($invoice === null) {
                Response::json(['message' => 'Invoice not found'], 404);
                return;
            }

            Response::json([
                'id' => (string) ($invoice['_id'] ?? $id),
                'invoice' => $invoice['invoiceNumber'] ?? null,
                'amount' => $this->num($invoice['amount'] ?? 0),
                'status' => $invoice['status'] ?? null,
                'date' => $invoice['createdAt'] ?? null,
                'dueDate' => $invoice['dueDate'] ?? null,
                'paidAt' => $invoice['paidAt'] ?? null,
                'notes' => $invoice['notes'] ?? null,
            ]);
        } catch (Throwable $e) {
            Response::json(['message' => 'Server error fetching invoice'], 500);
        }
    }

    private function deleteUser(string $id): void
    {
        try {
            $actor = $this->protect(['admin']);
            if ($actor === null) {
                return;
            }

            $user = $this->db->findOne('users', ['_id' => MongoRepository::id($id)]);
            if ($user === null) {
                Response::json(['message' => 'User not found'], 404);
                return;
            }

            $balance = $this->num($user['balance'] ?? 0);
            $pending = $this->num($user['pendingBalance'] ?? 0);

            if (abs($balance) > 0.01) {
                Response::json(['message' => 'Cannot delete user with non-zero balance ($' . round($balance) . '). Please settle first.'], 400);
                return;
            }
            if ($pending > 0) {
                Response::json(['message' => 'Cannot delete user with pending bets ($' . round($pending) . ').'], 400);
                return;
            }

            $this->db->deleteOne('users', ['_id' => MongoRepository::id($id)]);
            Response::json(['message' => 'User ' . (string) ($user['username'] ?? '') . ' successfully deleted.']);
        } catch (Throwable $e) {
            Response::json(['message' => 'Server error deleting user'], 500);
        }
    }

    private function deleteAgent(string $id): void
    {
        try {
            $actor = $this->protect(['admin']);
            if ($actor === null) {
                return;
            }

            $agent = $this->db->findOne('agents', ['_id' => MongoRepository::id($id)]);
            if ($agent === null) {
                Response::json(['message' => 'Agent not found'], 404);
                return;
            }

            $balance = $this->num($agent['balance'] ?? 0);
            if (abs($balance) > 0.01) {
                Response::json(['message' => 'Cannot delete agent with non-zero balance ($' . round($balance) . '). Settle first.'], 400);
                return;
            }

            $activeUsers = $this->db->countDocuments('users', ['agentId' => MongoRepository::id($id)]);
            if ($activeUsers > 0) {
                Response::json(['message' => 'Cannot delete agent. They have ' . $activeUsers . ' assigned users. Reassign or delete users first.'], 400);
                return;
            }

            if (($agent['role'] ?? '') === 'master_agent') {
                $subAgents = $this->db->countDocuments('agents', ['createdBy' => MongoRepository::id($id), 'createdByModel' => 'Agent']);
                if ($subAgents > 0) {
                    Response::json(['message' => 'Cannot delete Master Agent. They have ' . $subAgents . ' sub-agents. Reassign or delete sub-agents first.'], 400);
                    return;
                }
                $this->db->deleteOne('master_agents', ['agentId' => MongoRepository::id($id)]);
            }

            $this->db->deleteOne('agents', ['_id' => MongoRepository::id($id)]);
            Response::json(['message' => 'Agent ' . (string) ($agent['username'] ?? '') . ' successfully deleted.']);
        } catch (Throwable $e) {
            Response::json(['message' => 'Server error deleting agent'], 500);
        }
    }

    private function createAgent(): void
    {
        try {
            $actor = $this->protect(['admin', 'master_agent', 'super_agent']);
            if ($actor === null) {
                return;
            }

            $body = Http::jsonBody();
            $username = trim((string) ($body['username'] ?? ''));
            $phoneNumber = trim((string) ($body['phoneNumber'] ?? ''));
            $password = strtoupper(trim((string) ($body['password'] ?? '')));
            $fullName = trim((string) ($body['fullName'] ?? ''));
            $role = (string) ($body['role'] ?? '');
            $parentAgentId = trim((string) ($body['parentAgentId'] ?? $body['agentId'] ?? ''));
            $referredByUserId = trim((string) ($body['referredByUserId'] ?? ''));

            if ($username === '' || $phoneNumber === '' || $password === '') {
                Response::json(['message' => 'Username, phone number, and password are required'], 400);
                return;
            }
            $agentRole = ($role === 'agent' || $role === 'master_agent') ? $role : 'master_agent';
            $createdById = MongoRepository::id((string) ($actor['_id'] ?? ''));
            $createdByModel = (($actor['role'] ?? '') === 'admin') ? 'Admin' : 'Agent';
            if (($actor['role'] ?? '') === 'admin' && $parentAgentId !== '' && preg_match('/^[a-f0-9]{24}$/i', $parentAgentId) === 1) {
                $parentAgent = $this->db->findOne('agents', ['_id' => MongoRepository::id($parentAgentId)]);
                if ($parentAgent === null || !in_array((string) ($parentAgent['role'] ?? ''), ['master_agent', 'super_agent'], true)) {
                    Response::json(['message' => 'parentAgentId must be a valid Master Agent'], 400);
                    return;
                }
                $createdById = MongoRepository::id($parentAgentId);
                $createdByModel = 'Agent';
            }

            $existing = $this->findExistingAgentByIdentity($username, $phoneNumber);
            if ($existing !== null) {
                $existingRole = (string) ($existing['role'] ?? '');
                if (!in_array($existingRole, ['agent', 'master_agent'], true)) {
                    Response::json(['message' => 'Username or Phone number already exists in the system'], 409);
                    return;
                }
                // Reassign the existing agent under the resolved parent
                $existingId = (string) $existing['_id'];
                $this->db->updateOne('agents', ['_id' => MongoRepository::id($existingId)], [
                    '$set' => [
                        'createdBy'      => $createdById,
                        'createdByModel' => $createdByModel,
                        'updatedAt'      => MongoRepository::nowUtc(),
                    ],
                ]);
                if ($existingRole === 'master_agent') {
                    $updated = $this->db->findOne('agents', ['_id' => MongoRepository::id($existingId)]);
                    if ($updated !== null) {
                        $this->syncMasterAgentCollection($updated);
                    }
                }
                Response::json([
                    'message'  => 'Agent assigned successfully',
                    'assigned' => true,
                    'agent'    => [
                        'id'          => $existingId,
                        'username'    => (string) ($existing['username'] ?? ''),
                        'phoneNumber' => (string) ($existing['phoneNumber'] ?? ''),
                        'fullName'    => (string) ($existing['fullName'] ?? ''),
                        'role'        => $existingRole,
                        'status'      => (string) ($existing['status'] ?? 'active'),
                        'createdAt'   => gmdate(DATE_ATOM),
                    ],
                ], 200);
                return;
            }

            $referrerObjectId = null;
            if ($referredByUserId !== '') {
                if (preg_match('/^[a-f0-9]{24}$/i', $referredByUserId) !== 1) {
                    Response::json(['message' => 'Invalid referredByUserId'], 400);
                    return;
                }
                $ref = $this->db->findOne('users', ['_id' => MongoRepository::id($referredByUserId)]);
                if (!$this->isPlayerLikeUserDocument($ref)) {
                    Response::json(['message' => 'Invalid referredByUserId'], 400);
                    return;
                }
                $referrerObjectId = MongoRepository::id($referredByUserId);
            }

            $passwordFields = $this->passwordFields($password);
            $doc = [
                'username' => strtoupper($username),
                'phoneNumber' => $phoneNumber,
                'password' => $passwordFields['password'],
                'passwordCaseInsensitiveHash' => $passwordFields['passwordCaseInsensitiveHash'],
                'displayPassword' => $password,
                'fullName' => strtoupper($fullName !== '' ? $fullName : $username),
                'role' => $agentRole,
                'status' => 'active',
                'balance' => 0.0,
                'agentBillingRate' => 0.0,
                'agentBillingStatus' => 'paid',
                'viewOnly' => false,
                'defaultMinBet' => $this->numOr($body['defaultMinBet'] ?? null, 25),
                'defaultMaxBet' => $this->numOr($body['defaultMaxBet'] ?? null, 200),
                'defaultCreditLimit' => $this->numOr($body['defaultCreditLimit'] ?? null, 1000),
                'defaultSettleLimit' => $this->numOr($body['defaultSettleLimit'] ?? null, 0),
                'createdBy' => $createdById,
                'createdByModel' => $createdByModel,
                'referredByUserId' => $referrerObjectId,
                'createdAt' => MongoRepository::nowUtc(),
                'updatedAt' => MongoRepository::nowUtc(),
            ];

            // Commission split fields
            if (isset($body['agentPercent']) && is_numeric($body['agentPercent'])) {
                $pct = (float) $body['agentPercent'];
                if ($pct >= 0 && $pct <= 100) {
                    $doc['agentPercent'] = round($pct, 4);
                }
            }
            if (isset($body['playerRate']) && is_numeric($body['playerRate'])) {
                $rate = (float) $body['playerRate'];
                if ($rate >= 0) {
                    $doc['playerRate'] = round($rate, 2);
                }
            }
            if (isset($body['hiringAgentPercent']) && is_numeric($body['hiringAgentPercent'])) {
                $hPct = (float) $body['hiringAgentPercent'];
                if ($hPct >= 0 && $hPct <= 100) {
                    $doc['hiringAgentPercent'] = round($hPct, 4);
                }
            }
            if (isset($body['subAgentPercent']) && is_numeric($body['subAgentPercent'])) {
                $sPct = (float) $body['subAgentPercent'];
                if ($sPct >= 0 && $sPct <= 100) {
                    $doc['subAgentPercent'] = round($sPct, 4);
                }
            }
            if (isset($body['extraSubAgents']) && is_array($body['extraSubAgents'])) {
                $extras = [];
                foreach ($body['extraSubAgents'] as $sub) {
                    $subName = trim((string) ($sub['name'] ?? ''));
                    $subPct = is_numeric($sub['percent'] ?? null) ? round((float) $sub['percent'], 4) : 0;
                    if ($subName !== '' || $subPct > 0) {
                        $extras[] = ['name' => strtoupper($subName), 'percent' => $subPct];
                    }
                }
                if (count($extras) > 0) {
                    $doc['extraSubAgents'] = $extras;
                }
            }
            $id = $this->db->insertOne('agents', $doc);
            if ($agentRole === 'master_agent') {
                $this->syncMasterAgentCollection(array_merge($doc, ['_id' => $id]));
            }

            Response::json([
                'message' => 'Agent created successfully',
                'agent' => [
                    'id' => $id,
                    'username' => strtoupper($username),
                    'phoneNumber' => $phoneNumber,
                    'fullName' => strtoupper($fullName !== '' ? $fullName : $username),
                    'role' => $agentRole,
                    'status' => 'active',
                    'createdAt' => gmdate(DATE_ATOM),
                ],
            ], 201);
        } catch (Throwable $e) {
            Response::json(['message' => 'Server error creating agent: ' . $e->getMessage()], 500);
        }
    }

    private function updateAgent(string $id): void
    {
        try {
            $actor = $this->protect(['admin']);
            if ($actor === null) {
                return;
            }

            $agent = $this->db->findOne('agents', ['_id' => MongoRepository::id($id)]);
            if ($agent === null) {
                Response::json(['message' => 'Agent not found'], 404);
                return;
            }

            $body = Http::jsonBody();
            $updates = ['updatedAt' => MongoRepository::nowUtc()];

            if (isset($body['phoneNumber']) && trim((string) $body['phoneNumber']) !== '') {
                $updates['phoneNumber'] = trim((string) $body['phoneNumber']);
            }
            if (isset($body['password']) && (string) $body['password'] !== '') {
                $nextPassword = strtoupper(trim((string) $body['password']));
                $passwordFields = $this->passwordFields($nextPassword);
                $updates['password'] = $passwordFields['password'];
                $updates['passwordCaseInsensitiveHash'] = $passwordFields['passwordCaseInsensitiveHash'];
                $updates['displayPassword'] = $nextPassword;
            }
            if (array_key_exists('agentBillingRate', $body) && is_numeric($body['agentBillingRate'])) {
                $updates['agentBillingRate'] = (float) $body['agentBillingRate'];
            }
            // Commission percentage this agent receives in the hierarchy chain
            if (array_key_exists('agentPercent', $body) && is_numeric($body['agentPercent'])) {
                $pct = (float) $body['agentPercent'];
                if ($pct < 0 || $pct > 100) {
                    Response::json(['message' => 'agentPercent must be between 0 and 100'], 400);
                    return;
                }
                $updates['agentPercent'] = round($pct, 4);
            }
            // Dollar rate applied to players under this agent (no upper cap — it's a $ value)
            if (array_key_exists('playerRate', $body) && is_numeric($body['playerRate'])) {
                $rate = (float) $body['playerRate'];
                if ($rate < 0) {
                    Response::json(['message' => 'playerRate cannot be negative'], 400);
                    return;
                }
                $updates['playerRate'] = round($rate, 2);
            }
            if (array_key_exists('hiringAgentPercent', $body) && is_numeric($body['hiringAgentPercent'])) {
                $hPct = (float) $body['hiringAgentPercent'];
                if ($hPct >= 0 && $hPct <= 100) {
                    $updates['hiringAgentPercent'] = round($hPct, 4);
                }
            }
            if (array_key_exists('subAgentPercent', $body) && is_numeric($body['subAgentPercent'])) {
                $sPct = (float) $body['subAgentPercent'];
                if ($sPct >= 0 && $sPct <= 100) {
                    $updates['subAgentPercent'] = round($sPct, 4);
                }
            }
            if (array_key_exists('extraSubAgents', $body) && is_array($body['extraSubAgents'])) {
                $extras = [];
                foreach ($body['extraSubAgents'] as $sub) {
                    $subName = trim((string) ($sub['name'] ?? ''));
                    $subPct = is_numeric($sub['percent'] ?? null) ? round((float) $sub['percent'], 4) : 0;
                    if ($subName !== '' || $subPct > 0) {
                        $extras[] = ['name' => strtoupper($subName), 'percent' => $subPct];
                    }
                }
                $updates['extraSubAgents'] = $extras;
            }

            $balanceBefore = null;
            if (array_key_exists('balance', $body) && is_numeric($body['balance'])) {
                $balanceBefore = $this->num($agent['balance'] ?? 0);
                $updates['balance'] = max(0, (float) $body['balance']);
            }

            if (isset($body['agentBillingStatus']) && trim((string) $body['agentBillingStatus']) !== '') {
                $status = trim((string) $body['agentBillingStatus']);
                $updates['agentBillingStatus'] = $status;
                $updates['viewOnly'] = ($status === 'unpaid');
                if ($status === 'paid') {
                    $updates['agentBillingLastPaidAt'] = MongoRepository::nowUtc();
                }
            }
            foreach (['defaultMinBet', 'defaultMaxBet', 'defaultCreditLimit', 'defaultSettleLimit'] as $field) {
                if (array_key_exists($field, $body) && is_numeric($body[$field])) {
                    $updates[$field] = (float) $body[$field];
                }
            }
            if (isset($body['dashboardLayout']) && $body['dashboardLayout'] !== '') {
                $updates['dashboardLayout'] = $body['dashboardLayout'];
            }

            $this->db->beginTransaction();
            try {
                $this->db->updateOne('agents', ['_id' => MongoRepository::id($id)], $updates);
                $updated = $this->db->findOne('agents', ['_id' => MongoRepository::id($id)]);
                if (is_array($updated) && (($updated['role'] ?? '') === 'master_agent')) {
                    $this->syncMasterAgentCollection($updated);
                } else {
                    $this->db->deleteOne('master_agents', ['agentId' => MongoRepository::id($id)]);
                }

                if ($balanceBefore !== null) {
                    $balanceAfter = $this->num($updated['balance'] ?? ($updates['balance'] ?? $balanceBefore));
                    $this->db->insertOne('transactions', [
                        'agentId' => MongoRepository::id($id),
                        'adminId' => MongoRepository::id((string) ($actor['_id'] ?? '')),
                        'amount' => abs($balanceAfter - $balanceBefore),
                        'type' => 'adjustment',
                        'status' => 'completed',
                        'balanceBefore' => $balanceBefore,
                        'balanceAfter' => $balanceAfter,
                        'referenceType' => 'Adjustment',
                        'reason' => 'ADMIN_AGENT_BALANCE_ADJUSTMENT',
                        'description' => 'Admin updated agent balance',
                        'createdAt' => MongoRepository::nowUtc(),
                        'updatedAt' => MongoRepository::nowUtc(),
                    ]);
                }
                $this->db->commit();
            } catch (Throwable $txErr) {
                $this->db->rollback();
                throw $txErr;
            }

            Response::json(['message' => 'Agent updated successfully', 'agent' => $updated]);
        } catch (Throwable $e) {
            Response::json(['message' => 'Server error updating agent', 'details' => $e->getMessage()], 500);
        }
    }

    private function createUserByAdmin(): void
    {
        try {
            $actor = $this->protect(['admin', 'agent', 'master_agent', 'super_agent']);
            if ($actor === null) {
                return;
            }

            $body = Http::jsonBody();
            $username = trim((string) ($body['username'] ?? ''));
            $phoneNumber = trim((string) ($body['phoneNumber'] ?? ''));
            $password = strtoupper(trim((string) ($body['password'] ?? '')));
            $firstNameRaw = trim((string) ($body['firstName'] ?? ''));
            $lastNameRaw = trim((string) ($body['lastName'] ?? ''));
            $fullNameRaw = trim((string) ($body['fullName'] ?? ''));
            $emailRaw = trim((string) ($body['email'] ?? ''));
            $generatedPassword = $this->generateIdentityPassword($firstNameRaw, $lastNameRaw, $phoneNumber, $username);
            if ($generatedPassword !== '') {
                $password = $generatedPassword;
            }
            $grantStartingFreeplay = false;
            if (array_key_exists('grantStartingFreeplay', $body)) {
                $rawGrantStartingFreeplay = $body['grantStartingFreeplay'];
                if (is_bool($rawGrantStartingFreeplay)) {
                    $grantStartingFreeplay = $rawGrantStartingFreeplay;
                } else {
                    $parsedGrantStartingFreeplay = filter_var(
                        (string) $rawGrantStartingFreeplay,
                        FILTER_VALIDATE_BOOLEAN,
                        FILTER_NULL_ON_FAILURE
                    );
                    if ($parsedGrantStartingFreeplay !== null) {
                        $grantStartingFreeplay = $parsedGrantStartingFreeplay;
                    }
                }
            }

            if ($username === '' || $phoneNumber === '' || $password === '') {
                Response::json(['message' => 'Username, phone number, and password are required'], 400);
                return;
            }
            if ($firstNameRaw === '' || $lastNameRaw === '') {
                Response::json(['message' => 'First name and last name are required'], 400);
                return;
            }

            $duplicateMatches = $this->findLikelyDuplicatePlayers([
                'firstName' => $firstNameRaw,
                'lastName' => $lastNameRaw,
                'fullName' => $fullNameRaw,
                'phoneNumber' => $phoneNumber,
                'email' => $emailRaw,
                'password' => $password,
            ]);
            if (count($duplicateMatches) > 0) {
                Response::json($this->buildDuplicatePlayerResponse($firstNameRaw, $lastNameRaw, $fullNameRaw, $phoneNumber, $emailRaw, $duplicateMatches), 409);
                return;
            }

            if ($this->existsUsernameOrPhone($username, $phoneNumber)) {
                Response::json(['message' => 'Username or phone number already exists in the system'], 409);
                return;
            }

            $actorRole = (string) ($actor['role'] ?? '');
            $assignedAgentId = null;
            if ($actorRole === 'agent') {
                $assignedAgentId = (string) $actor['_id'];
            } elseif (in_array($actorRole, ['master_agent', 'super_agent'], true)) {
                $requested = trim((string) ($body['agentId'] ?? ''));
                $managedAgentIds = $this->listDirectAssignableAgentIds((string) ($actor['_id'] ?? ''));

                if ($requested === '') {
                    $assignedAgentId = $managedAgentIds[0] ?? null;
                    if ($assignedAgentId === null) {
                        Response::json(['message' => 'Create or select a direct Agent before creating players'], 400);
                        return;
                    }
                } else {
                    if (preg_match('/^[a-f0-9]{24}$/i', $requested) !== 1 || !in_array($requested, $managedAgentIds, true)) {
                        Response::json(['message' => 'You can only assign players to your direct Agents'], 403);
                        return;
                    }
                    $assignedAgentId = $requested;
                }

                $sub = $this->db->findOne('agents', [
                    '_id' => MongoRepository::id((string) $assignedAgentId),
                ], ['projection' => ['defaultMinBet' => 1, 'defaultMaxBet' => 1, 'defaultCreditLimit' => 1, 'defaultSettleLimit' => 1]]);
                if ($sub !== null) {
                    $body['minBet'] = $body['minBet'] ?? ($sub['defaultMinBet'] ?? 25);
                    $body['maxBet'] = $body['maxBet'] ?? ($sub['defaultMaxBet'] ?? 200);
                    $body['creditLimit'] = $body['creditLimit'] ?? ($sub['defaultCreditLimit'] ?? 1000);
                    $body['balanceOwed'] = $body['balanceOwed'] ?? ($sub['defaultSettleLimit'] ?? 0);
                }
            } else {
                $requested = trim((string) ($body['agentId'] ?? ''));
                if ($requested !== '' && preg_match('/^[a-f0-9]{24}$/i', $requested) !== 1) {
                    Response::json(['message' => 'Invalid agentId'], 400);
                    return;
                }
                if ($requested !== '') {
                    $agent = $this->db->findOne('agents', ['_id' => MongoRepository::id($requested), 'role' => 'agent']);
                    if ($agent === null) {
                        Response::json(['message' => 'Invalid Agent ID. Players must be assigned to a regular Agent'], 400);
                        return;
                    }
                    $assignedAgentId = $requested;
                    $body['minBet'] = $body['minBet'] ?? ($agent['defaultMinBet'] ?? 25);
                    $body['maxBet'] = $body['maxBet'] ?? ($agent['defaultMaxBet'] ?? 200);
                    $body['creditLimit'] = $body['creditLimit'] ?? ($agent['defaultCreditLimit'] ?? 1000);
                    $body['balanceOwed'] = $body['balanceOwed'] ?? ($agent['defaultSettleLimit'] ?? 0);
                }
            }

            $referredByUserId = (string) ($body['referredByUserId'] ?? '');
            if ($referredByUserId !== '' && preg_match('/^[a-f0-9]{24}$/i', $referredByUserId) === 1) {
                $refQuery = ['_id' => MongoRepository::id($referredByUserId)];
                if ($assignedAgentId !== null && preg_match('/^[a-f0-9]{24}$/i', $assignedAgentId) === 1) {
                    $refQuery['agentId'] = MongoRepository::id($assignedAgentId);
                }
                $ref = $this->db->findOne('users', $refQuery);
                if (!$this->isPlayerLikeUserDocument($ref)) {
                    Response::json(['message' => 'Invalid referredByUserId'], 400);
                    return;
                }
            }

            $firstName = strtoupper($firstNameRaw);
            $lastName = strtoupper($lastNameRaw);
            $fullName = strtoupper($fullNameRaw);
            if ($fullName === '') {
                $fullName = strtoupper(trim(($firstName . ' ' . $lastName)) !== '' ? trim($firstName . ' ' . $lastName) : $username);
            }

            $passwordFields = $this->passwordFields($password);
            $startingFreeplayAmount = $grantStartingFreeplay ? 200.0 : 0.0;
            $startingFreeplayExpiresAt = $startingFreeplayAmount > 0 ? time() + (30 * 24 * 3600) : null;
            $now = MongoRepository::nowUtc();
            $doc = [
                'username' => strtoupper($username),
                'phoneNumber' => $phoneNumber,
                'password' => $passwordFields['password'],
                'passwordCaseInsensitiveHash' => $passwordFields['passwordCaseInsensitiveHash'],
                'displayPassword' => $password,
                'firstName' => $firstName,
                'lastName' => $lastName,
                'fullName' => $fullName,
                'role' => 'user',
                'status' => 'active',
                'balance' => 0.0,
                'minBet' => $this->numOr($body['minBet'] ?? null, 1),
                'maxBet' => $this->numOr($body['maxBet'] ?? null, 5000),
                'creditLimit' => $this->numOr($body['creditLimit'] ?? null, 1000),
                'balanceOwed' => $this->numOr($body['balanceOwed'] ?? null, 0),
                'freeplayBalance' => $startingFreeplayAmount,
                'freeplayExpiresAt' => $startingFreeplayExpiresAt,
                'maxFpCredit' => $this->numOr($body['maxFpCredit'] ?? null, 0), // 0 = uncapped
                'pendingBalance' => 0,
                'agentId' => ($assignedAgentId !== null && preg_match('/^[a-f0-9]{24}$/i', $assignedAgentId) === 1) ? MongoRepository::id($assignedAgentId) : null,
                'createdBy' => MongoRepository::id((string) ($actor['_id'] ?? '')),
                'createdByModel' => (($actor['role'] ?? '') === 'admin') ? 'Admin' : 'Agent',
                'referredByUserId' => ($referredByUserId !== '' && preg_match('/^[a-f0-9]{24}$/i', $referredByUserId) === 1) ? MongoRepository::id($referredByUserId) : null,
                'referralBonusGranted' => false,
                'referralBonusAmount' => 0,
                'apps' => is_array($body['apps'] ?? null) ? $body['apps'] : new stdClass(),
                'createdAt' => $now,
                'updatedAt' => $now,
            ];
            $this->db->beginTransaction();
            try {
                $id = $this->db->insertOne('users', $doc);
                if ($startingFreeplayAmount > 0) {
                    $this->db->insertOne('transactions', [
                        'userId' => MongoRepository::id($id),
                        'agentId' => ($assignedAgentId !== null && preg_match('/^[a-f0-9]{24}$/i', $assignedAgentId) === 1)
                            ? MongoRepository::id($assignedAgentId)
                            : null,
                        'adminId' => isset($actor['_id']) ? MongoRepository::id((string) $actor['_id']) : null,
                        'amount' => $startingFreeplayAmount,
                        'type' => 'fp_deposit',
                        'status' => 'completed',
                        'isFreeplay' => true,
                        'balanceBefore' => 0.0,
                        'balanceAfter' => $startingFreeplayAmount,
                        'referenceType' => 'FreePlayBonus',
                        'reason' => 'NEW_PLAYER_FREEPLAY_BONUS',
                        'description' => 'Starting freeplay granted on player creation',
                        'createdAt' => $now,
                        'updatedAt' => $now,
                    ]);
                }
                $this->db->commit();
            } catch (Throwable $txErr) {
                $this->db->rollback();
                throw $txErr;
            }

            Response::json([
                'message' => 'User created successfully',
                'user' => [
                    'id' => $id,
                    'username' => strtoupper($username),
                    'phoneNumber' => $phoneNumber,
                    'fullName' => $fullName,
                    'role' => 'user',
                    'status' => 'active',
                    'balance' => $this->num($doc['balance']),
                    'agentId' => $assignedAgentId,
                    'createdAt' => gmdate(DATE_ATOM),
                ],
            ], 201);
        } catch (Throwable $e) {
            Response::json(['message' => 'Server error creating user: ' . $e->getMessage()], 500);
        }
    }

    private function bulkCreateUsers(): void
    {
        try {
            $actor = $this->protect(['admin', 'agent', 'master_agent', 'super_agent']);
            if ($actor === null) {
                return;
            }

            $body = Http::jsonBody();
            $rows = is_array($body['users'] ?? null) ? $body['users'] : [];
            [$status, $payload] = $this->executeBulkUserCreate($rows, $actor);
            Response::json($payload, $status);
        } catch (Throwable $e) {
            Response::json(['message' => 'Server error during bulk creation: ' . $e->getMessage()], 500);
        }
    }

    private function importUsersSpreadsheet(): void
    {
        try {
            $this->refreshExecutionDeadline(300);
            $actor = $this->protect(['admin', 'agent', 'master_agent', 'super_agent']);
            if ($actor === null) {
                return;
            }

            $file = $_FILES['file'] ?? null;
            if (!is_array($file)) {
                Response::json(['message' => 'Spreadsheet file is required under "file" field'], 400);
                return;
            }
            if (($file['error'] ?? UPLOAD_ERR_NO_FILE) !== UPLOAD_ERR_OK) {
                Response::json(['message' => 'Failed to upload spreadsheet'], 400);
                return;
            }

            $tmpPath = (string) ($file['tmp_name'] ?? '');
            $originalName = (string) ($file['name'] ?? '');
            $extension = strtolower(pathinfo($originalName, PATHINFO_EXTENSION));

            if (!in_array($extension, ['xlsx', 'csv'], true)) {
                Response::json(['message' => 'Only .xlsx or .csv files are supported'], 400);
                return;
            }

            $rawRows = ($extension === 'xlsx')
                ? $this->parseXlsxRows($tmpPath)
                : $this->parseCsvRows($tmpPath);
            $this->refreshExecutionDeadline(300);

            if (count($rawRows) < 2) {
                Response::json(['message' => 'Spreadsheet must include a header row and at least one data row'], 400);
                return;
            }

            $defaultAgentId = trim((string) ($_POST['defaultAgentId'] ?? ''));
            $forceAgentAssignment = filter_var((string) ($_POST['forceAgentAssignment'] ?? 'false'), FILTER_VALIDATE_BOOLEAN);
            $actorRole = (string) ($actor['role'] ?? '');
            $actorId = (string) ($actor['_id'] ?? '');

            if ($actorRole === 'agent') {
                $defaultAgentId = $actorId;
                $forceAgentAssignment = true;
            } elseif (in_array($actorRole, ['master_agent', 'super_agent'], true) && $forceAgentAssignment && $defaultAgentId === '') {
                $defaultAgentId = (string) ($this->pickDefaultDirectAssignableAgentId($actorId) ?? '');
                if ($defaultAgentId === '') {
                    Response::json(['message' => 'Create or select a direct Agent before importing players'], 400);
                    return;
                }
            }

            if ($forceAgentAssignment) {
                if (preg_match('/^[a-f0-9]{24}$/i', $defaultAgentId) !== 1) {
                    Response::json(['message' => 'Select a valid agent before importing with forced assignment'], 400);
                    return;
                }
                if (!$this->canActorAssignImportsToAgent($actor, $defaultAgentId)) {
                    Response::json(['message' => 'Not authorized to assign imports to this agent'], 403);
                    return;
                }
                // If selected agent is a master/super agent, resolve to their first direct sub-agent
                $targetDoc = $this->db->findOne('agents', ['_id' => MongoRepository::id($defaultAgentId)], ['projection' => ['role' => 1]]);
                if ($targetDoc !== null && in_array((string) ($targetDoc['role'] ?? ''), ['master_agent', 'super_agent'], true)) {
                    $resolvedSubAgentId = $this->pickDefaultDirectAssignableAgentId($defaultAgentId);
                    if ($resolvedSubAgentId === null) {
                        Response::json(['message' => 'Selected master agent has no sub-agents. Create an agent under them first before importing players.'], 400);
                        return;
                    }
                    $defaultAgentId = $resolvedSubAgentId;
                }
            }

            $mappedRows = $this->mapSpreadsheetRowsToUsers($rawRows, $defaultAgentId);
            if ($forceAgentAssignment && $mappedRows['rows'] !== []) {
                foreach ($mappedRows['rows'] as &$mappedRow) {
                    $mappedRow['agentId'] = $defaultAgentId;
                }
                unset($mappedRow);
            }
            if ($mappedRows['rows'] !== []) {
                usort($mappedRows['rows'], static function (array $a, array $b): int {
                    $userA = strtoupper(trim((string) ($a['username'] ?? '')));
                    $userB = strtoupper(trim((string) ($b['username'] ?? '')));
                    if ($userA !== '' && $userB !== '') {
                        return strnatcasecmp($userA, $userB);
                    }
                    if ($userA !== '' || $userB !== '') {
                        return $userA !== '' ? -1 : 1;
                    }

                    $nameA = strtoupper(trim(((string) ($a['firstName'] ?? '')) . ' ' . ((string) ($a['lastName'] ?? ''))));
                    $nameB = strtoupper(trim(((string) ($b['firstName'] ?? '')) . ' ' . ((string) ($b['lastName'] ?? ''))));
                    return strnatcasecmp($nameA, $nameB);
                });
            }
            if ($mappedRows['rows'] === [] && $mappedRows['errors'] !== []) {
                Response::json([
                    'message' => 'Spreadsheet validation failed',
                    'total' => (int) $mappedRows['total'],
                    'created' => 0,
                    'failed' => count($mappedRows['errors']),
                    'errors' => $mappedRows['errors'],
                ], 400);
                return;
            }

            [$status, $payload] = $this->executeBulkUserCreate($mappedRows['rows'], $actor, [
                'strict' => false,
                'skipExisting' => true,
                'autoCreateAgents' => false,
            ]);
            if ($mappedRows['errors'] !== []) {
                $existingErrors = is_array($payload['errors'] ?? null) ? $payload['errors'] : [];
                $payload['errors'] = array_values(array_merge($existingErrors, $mappedRows['errors']));
                $payload['failed'] = count($payload['errors']);
                if (($payload['message'] ?? '') === 'Users created successfully') {
                    $payload['message'] = 'Users imported with some skipped rows';
                }
            }
            Response::json($payload, $status);
        } catch (Throwable $e) {
            Response::json(['message' => 'Failed to import spreadsheet: ' . $e->getMessage()], 500);
        }
    }

    private function canActorAssignImportsToAgent(array $actor, string $agentId): bool
    {
        if (preg_match('/^[a-f0-9]{24}$/i', $agentId) !== 1) {
            return false;
        }

        $role = strtolower((string) ($actor['role'] ?? ''));
        $actorId = (string) ($actor['_id'] ?? '');
        $target = $this->db->findOne(
            'agents',
            ['_id' => MongoRepository::id($agentId)],
            ['projection' => ['createdBy' => 1, 'createdByModel' => 1, 'role' => 1]]
        );
        if ($target === null) {
            return false;
        }
        if ($role === 'admin') {
            return true;
        }
        if ($role === 'agent') {
            return $actorId !== '' && $actorId === $agentId;
        }
        if ($role === 'master_agent' || $role === 'super_agent') {
            $createdBy = (string) ($target['createdBy'] ?? '');
            $createdByModel = (string) ($target['createdByModel'] ?? '');
            return $actorId !== '' && $createdBy === $actorId && $createdByModel === 'Agent';
        }

        return false;
    }

    /**
     * @return array{0:int,1:array<string,mixed>}
     */
    private function executeBulkUserCreate(array $rows, array $actor, array $options = []): array
    {
        $this->refreshExecutionDeadline(300);
        $strict = array_key_exists('strict', $options) ? (bool) $options['strict'] : true;
        $skipExisting = array_key_exists('skipExisting', $options) ? (bool) $options['skipExisting'] : false;
        $autoCreateAgents = array_key_exists('autoCreateAgents', $options) ? (bool) $options['autoCreateAgents'] : true;

        if (count($rows) === 0) {
            return [400, ['message' => 'No users provided']];
        }
        if (count($rows) > 500) {
            return [400, ['message' => 'Maximum 500 users per batch']];
        }

        $actorRole = (string) ($actor['role'] ?? '');
        $actorId = (string) ($actor['_id'] ?? '');
        $createdByModel = ($actorRole === 'admin') ? 'Admin' : 'Agent';
        $now = MongoRepository::nowUtc();
        $masterAssignableIdSet = [];
        $defaultMasterAssignableAgentId = null;
        if (in_array($actorRole, ['master_agent', 'super_agent'], true)) {
            $masterAssignableAgentIds = $this->listDirectAssignableAgentIds($actorId);
            foreach ($masterAssignableAgentIds as $managedId) {
                $masterAssignableIdSet[$managedId] = true;
            }
            $defaultMasterAssignableAgentId = $masterAssignableAgentIds[0] ?? null;
        }

        $candidateUsernames = [];
        $candidatePhones = [];
        $candidateAgentLabels = [];
        foreach ($rows as $idx => $row) {
            if ($idx % 25 === 0) {
                $this->refreshExecutionDeadline(300);
            }
            $u = strtoupper(trim((string) ($row['username'] ?? '')));
            $p = trim((string) ($row['phoneNumber'] ?? ''));
            if ($u !== '') {
                $candidateUsernames[$u] = true;
            }
            if ($p !== '') {
                $candidatePhones[$p] = true;
            }
            $aid = trim((string) ($row['agentId'] ?? ''));
            $agentLabel = trim((string) ($row['agent'] ?? ''));
            $agentToken = $aid !== '' ? $aid : $agentLabel;
            if ($agentToken !== '' && preg_match('/^[a-f0-9]{24}$/i', $agentToken) !== 1) {
                $candidateAgentLabels[strtoupper($agentToken)] = true;
            }
        }

        $existingUsernames = [];
        $existingPhones = [];
        $existingUserByUsername = [];
        $existingUserByPhone = [];
        $usernameList = array_keys($candidateUsernames);
        $phoneList = array_keys($candidatePhones);
        if (count($usernameList) > 0 || count($phoneList) > 0) {
            $existQuery = [];
            if (count($usernameList) > 0 && count($phoneList) > 0) {
                $existQuery = ['$or' => [
                    ['username' => ['$in' => $usernameList]],
                    ['phoneNumber' => ['$in' => $phoneList]],
                ]];
            } elseif (count($usernameList) > 0) {
                $existQuery = ['username' => ['$in' => $usernameList]];
            } else {
                $existQuery = ['phoneNumber' => ['$in' => $phoneList]];
            }

            foreach (['users', 'admins', 'agents'] as $collection) {
                $projection = ['username' => 1, 'phoneNumber' => 1];
                if ($collection === 'users') {
                    $projection['_id'] = 1;
                    $projection['maxBet'] = 1;
                    $projection['lifetime'] = 1;
                }
                $docs = $this->db->findMany($collection, $existQuery, ['projection' => $projection]);
                foreach ($docs as $doc) {
                    $u = strtoupper(trim((string) ($doc['username'] ?? '')));
                    $p = trim((string) ($doc['phoneNumber'] ?? ''));
                    if ($u !== '') {
                        $existingUsernames[$u] = true;
                    }
                    if ($p !== '') {
                        $existingPhones[$p] = true;
                    }
                    if ($collection === 'users') {
                        if ($u !== '') {
                            $existingUserByUsername[$u] = $doc;
                        }
                        if ($p !== '') {
                            $existingUserByPhone[$p] = $doc;
                        }
                    }
                }
            }
        }

        $agentIdByUsername = [];
        $agentLabels = array_keys($candidateAgentLabels);
        if (count($agentLabels) > 0) {
            $agentsByUsername = $this->db->findMany('agents', ['username' => ['$in' => $agentLabels]], ['projection' => ['_id' => 1, 'username' => 1]]);
            foreach ($agentsByUsername as $doc) {
                $u = strtoupper(trim((string) ($doc['username'] ?? '')));
                $id = (string) ($doc['_id'] ?? '');
                if ($u !== '' && $id !== '') {
                    $agentIdByUsername[$u] = $id;
                }
            }

            // Auto-create agents that don't exist yet (only when autoCreateAgents is enabled)
            if ($autoCreateAgents) {
            $now = MongoRepository::nowUtc();
            foreach ($agentLabels as $label) {
                if (isset($agentIdByUsername[$label])) {
                    continue;
                }
                $agentUsername = strtoupper($label);
                $agentPhone = '000-000-' . str_pad((string) (crc32($agentUsername) % 10000), 4, '0', STR_PAD_LEFT);
                $agentPass = strtoupper(substr($agentUsername, 0, 6)) . '1234';
                $agentPasswordFields = $this->passwordFields($agentPass);
                $agentDoc = [
                    'username' => $agentUsername,
                    'phoneNumber' => $agentPhone,
                    'password' => $agentPasswordFields['password'],
                    'passwordCaseInsensitiveHash' => $agentPasswordFields['passwordCaseInsensitiveHash'],
                    'displayPassword' => $agentPass,
                    'fullName' => $agentUsername,
                    'role' => 'agent',
                    'status' => 'active',
                    'balance' => 0.0,
                    'agentBillingRate' => 0.0,
                    'agentBillingStatus' => 'paid',
                    'viewOnly' => false,
                    'defaultMinBet' => 25,
                    'defaultMaxBet' => 200,
                    'defaultCreditLimit' => 1000,
                    'defaultSettleLimit' => 200,
                    'createdBy' => MongoRepository::id($actorId),
                    'createdByModel' => $createdByModel,
                    'referredByUserId' => null,
                    'createdAt' => $now,
                    'updatedAt' => $now,
                ];
                $newAgentId = $this->db->insertOne('agents', $agentDoc);
                $agentIdByUsername[$agentUsername] = $newAgentId;
            }
            } // end autoCreateAgents
        }
        $agentUsernameById = [];
        foreach ($agentIdByUsername as $agentUsername => $agentId) {
            if ($agentId !== '') {
                $agentUsernameById[$agentId] = $agentUsername;
            }
        }

        $usernameSequenceMax = [];
        $generatedUsernames = [];
        $nextSequentialUsername = function (string $prefix) use (&$usernameSequenceMax, &$existingUsernames, &$generatedUsernames): string {
            $normalizedPrefix = strtoupper(preg_replace('/[^A-Z0-9]/', '', $prefix) ?? '');
            if ($normalizedPrefix === '') {
                $normalizedPrefix = 'USR';
            }

            if (!array_key_exists($normalizedPrefix, $usernameSequenceMax)) {
                $maxNum = 0;
                $pattern = '/^' . preg_quote($normalizedPrefix, '/') . '([0-9]+)$/i';
                foreach (['users', 'admins', 'agents'] as $collection) {
                    $docs = $this->db->findMany($collection, ['username' => ['$regex' => '^' . preg_quote($normalizedPrefix, '/') . '[0-9]+$', '$options' => 'i']], ['projection' => ['username' => 1]]);
                    foreach ($docs as $doc) {
                        $existing = strtoupper(trim((string) ($doc['username'] ?? '')));
                        if ($existing === '') {
                            continue;
                        }
                        if (preg_match($pattern, $existing, $matches) === 1) {
                            $num = (int) ($matches[1] ?? 0);
                            if ($num > $maxNum) {
                                $maxNum = $num;
                            }
                        }
                    }
                }
                $usernameSequenceMax[$normalizedPrefix] = $maxNum;
            }

            do {
                $usernameSequenceMax[$normalizedPrefix]++;
                $candidate = $normalizedPrefix . $usernameSequenceMax[$normalizedPrefix];
            } while (isset($existingUsernames[$candidate]) || isset($generatedUsernames[$candidate]));

            $generatedUsernames[$candidate] = true;
            return $candidate;
        };

        $errors = [];
        $skipped = [];
        $updatedRows = [];
        $pendingDocs = [];
        $seenUsernames = [];
        $seenPhones = [];
        $applyExistingBackfill = function (array $row, int $rowNum, string $username, string $phoneNumber) use (&$existingUserByUsername, &$existingUserByPhone, &$updatedRows, &$skipped, $now): bool {
            $existingUser = null;
            if ($username !== '' && isset($existingUserByUsername[$username])) {
                $existingUser = $existingUserByUsername[$username];
            } elseif ($phoneNumber !== '' && isset($existingUserByPhone[$phoneNumber])) {
                $existingUser = $existingUserByPhone[$phoneNumber];
            }

            if (!is_array($existingUser) || !isset($existingUser['_id'])) {
                return false;
            }

            $hasMaxBet = array_key_exists('maxBet', $row) && trim((string) ($row['maxBet'] ?? '')) !== '';
            $hasLifetime = array_key_exists('lifetime', $row) && trim((string) ($row['lifetime'] ?? '')) !== '';
            $updates = ['updatedAt' => $now];
            $currentMaxBet = $this->num($existingUser['maxBet'] ?? 0);
            $currentLifetime = $this->num($existingUser['lifetime'] ?? 0);
            if ($hasMaxBet) {
                $parsedMaxBet = $this->parseImportNumberOrNull($row['maxBet'] ?? null);
                if ($parsedMaxBet !== null && abs($parsedMaxBet - $currentMaxBet) > 0.0001) {
                    $updates['maxBet'] = $parsedMaxBet;
                }
            }
            if ($hasLifetime) {
                $parsedLifetime = $this->parseImportNumberOrNull($row['lifetime'] ?? null);
                if ($parsedLifetime !== null && abs($parsedLifetime - $currentLifetime) > 0.0001) {
                    $updates['lifetime'] = $parsedLifetime;
                }
            }

            if (count($updates) > 1) {
                $existingUserId = (string) ($existingUser['_id'] ?? '');
                $this->db->updateOne('users', ['_id' => MongoRepository::id($existingUserId)], $updates);
                $updatedRows[] = [
                    'row' => $rowNum,
                    'id' => $existingUserId,
                    'username' => $username,
                    'updatedFields' => array_values(array_diff(array_keys($updates), ['updatedAt'])),
                    'maxBet' => array_key_exists('maxBet', $updates) ? $this->num($updates['maxBet']) : $currentMaxBet,
                    'lifetime' => array_key_exists('lifetime', $updates) ? $this->num($updates['lifetime']) : $currentLifetime,
                ];
                $patched = $existingUser;
                if (array_key_exists('maxBet', $updates)) {
                    $patched['maxBet'] = $updates['maxBet'];
                }
                if (array_key_exists('lifetime', $updates)) {
                    $patched['lifetime'] = $updates['lifetime'];
                }
                if ($username !== '') {
                    $existingUserByUsername[$username] = $patched;
                }
                if ($phoneNumber !== '') {
                    $existingUserByPhone[$phoneNumber] = $patched;
                }
            } else {
                $skipped[] = ['row' => $rowNum, 'username' => $username, 'reason' => 'already-exists-no-change'];
            }

            return true;
        };

        foreach ($rows as $idx => $row) {
            if ($idx % 25 === 0) {
                $this->refreshExecutionDeadline(300);
            }
            $rowNum = (int) ($row['__sourceRow'] ?? ($idx + 1));
            $phoneRaw = preg_replace('/\D/', '', trim((string) ($row['phoneNumber'] ?? '')));
            // Format phone as XXX-XXX-XXXX (matches frontend handlePhoneChange)
            if (strlen($phoneRaw) >= 10) {
                $phoneNumber = substr($phoneRaw, 0, 3) . '-' . substr($phoneRaw, 3, 3) . '-' . substr($phoneRaw, 6, 4);
            } elseif (strlen($phoneRaw) >= 7) {
                $phoneNumber = substr($phoneRaw, 0, 3) . '-' . substr($phoneRaw, 3, 3) . '-' . substr($phoneRaw, 6);
            } elseif (strlen($phoneRaw) >= 4) {
                $phoneNumber = substr($phoneRaw, 0, 3) . '-' . substr($phoneRaw, 3);
            } else {
                $phoneNumber = $phoneRaw;
            }
            $firstName = strtoupper(trim((string) ($row['firstName'] ?? '')));
            $lastName = strtoupper(trim((string) ($row['lastName'] ?? '')));

            // Auto-generate password: FIRST3 + LAST3 + LAST4PHONE (matches frontend updateAutoPassword)
            $password = strtoupper(trim((string) ($row['password'] ?? '')));
            if ($password === '') {
                $last4 = strlen($phoneRaw) >= 4 ? substr($phoneRaw, -4) : $phoneRaw;
                if ($firstName !== '' && $lastName !== '') {
                    $password = strtoupper(substr($firstName, 0, 3) . substr($lastName, 0, 3)) . $last4;
                } else {
                    $fallbackUsername = strtoupper(trim((string) ($row['username'] ?? '')));
                    if ($fallbackUsername === '') {
                        $fallbackUsername = 'USER';
                    }
                    $password = $fallbackUsername . $last4;
                }
            }

            $assignedAgentId = null;
            if ($actorRole === 'agent') {
                $assignedAgentId = $actorId;
            } elseif (in_array($actorRole, ['master_agent', 'super_agent'], true)) {
                $reqAgent = trim((string) ($row['agentId'] ?? ''));
                if ($reqAgent === '' && isset($row['agent']) && trim((string) $row['agent']) !== '') {
                    $reqAgent = trim((string) $row['agent']);
                }
                if ($reqAgent !== '' && preg_match('/^[a-f0-9]{24}$/i', $reqAgent) !== 1) {
                    $reqAgent = (string) ($agentIdByUsername[strtoupper($reqAgent)] ?? '');
                }
                if ($reqAgent !== '' && preg_match('/^[a-f0-9]{24}$/i', $reqAgent) === 1) {
                    if (!isset($masterAssignableIdSet[$reqAgent])) {
                        $usernameForError = strtoupper(trim((string) ($row['username'] ?? '')));
                        if ($strict) {
                            $errors[] = ['row' => $rowNum, 'username' => $usernameForError, 'error' => 'Agent must be one of your direct Agents'];
                        } else {
                            $skipped[] = ['row' => $rowNum, 'username' => $usernameForError, 'reason' => 'invalid-agent-assignment'];
                        }
                        continue;
                    }
                    $assignedAgentId = $reqAgent;
                } else {
                    if ($defaultMasterAssignableAgentId === null) {
                        $usernameForError = strtoupper(trim((string) ($row['username'] ?? '')));
                        if ($strict) {
                            $errors[] = ['row' => $rowNum, 'username' => $usernameForError, 'error' => 'No direct Agent available under this master account'];
                        } else {
                            $skipped[] = ['row' => $rowNum, 'username' => $usernameForError, 'reason' => 'missing-default-agent'];
                        }
                        continue;
                    }
                    $assignedAgentId = $defaultMasterAssignableAgentId;
                }
            } else {
                $reqAgent = trim((string) ($row['agentId'] ?? ''));
                if ($reqAgent === '' && isset($row['agent']) && trim((string) $row['agent']) !== '') {
                    $reqAgent = trim((string) $row['agent']);
                }
                if ($reqAgent !== '' && preg_match('/^[a-f0-9]{24}$/i', $reqAgent) !== 1) {
                    $reqAgent = (string) ($agentIdByUsername[strtoupper($reqAgent)] ?? '');
                }
                if ($reqAgent !== '' && preg_match('/^[a-f0-9]{24}$/i', $reqAgent) === 1) {
                    $agentDoc = $this->db->findOne('agents', ['_id' => MongoRepository::id($reqAgent)], ['projection' => ['role' => 1]]);
                    $agentRole = (string) ($agentDoc['role'] ?? '');
                    if ($agentRole === 'agent') {
                        $assignedAgentId = $reqAgent;
                    } elseif ($agentRole === 'master_agent' || $agentRole === 'super_agent') {
                        // Resolve master/super agent to their first direct sub-agent
                        $resolvedId = $this->pickDefaultDirectAssignableAgentId($reqAgent);
                        if ($resolvedId !== null) {
                            $assignedAgentId = $resolvedId;
                        } else {
                            $usernameForError = strtoupper(trim((string) ($row['username'] ?? '')));
                            if ($strict) {
                                $errors[] = ['row' => $rowNum, 'username' => $usernameForError, 'error' => 'Selected master agent has no sub-agents to assign this player to'];
                            } else {
                                $skipped[] = ['row' => $rowNum, 'username' => $usernameForError, 'reason' => 'master-agent-no-sub-agents'];
                            }
                            continue;
                        }
                    } else {
                        $usernameForError = strtoupper(trim((string) ($row['username'] ?? '')));
                        if ($strict) {
                            $errors[] = ['row' => $rowNum, 'username' => $usernameForError, 'error' => 'Players can only be assigned to regular Agents'];
                        } else {
                            $skipped[] = ['row' => $rowNum, 'username' => $usernameForError, 'reason' => 'invalid-agent-assignment'];
                        }
                        continue;
                    }
                }
            }

            $username = strtoupper(trim((string) ($row['username'] ?? '')));
            if ($username === '') {
                $generatedPrefix = '';
                if ($assignedAgentId !== null && preg_match('/^[a-f0-9]{24}$/i', $assignedAgentId) === 1) {
                    $generatedPrefix = (string) ($agentUsernameById[$assignedAgentId] ?? '');
                    if ($generatedPrefix === '') {
                        $agentDoc = $this->db->findOne('agents', ['_id' => MongoRepository::id($assignedAgentId)], ['projection' => ['username' => 1]]);
                        $generatedPrefix = strtoupper(trim((string) ($agentDoc['username'] ?? '')));
                        if ($generatedPrefix !== '') {
                            $agentUsernameById[$assignedAgentId] = $generatedPrefix;
                        }
                    }
                }
                if ($generatedPrefix === '' && $actorRole !== 'admin') {
                    $generatedPrefix = strtoupper(trim((string) ($actor['username'] ?? '')));
                }
                if ($generatedPrefix === '') {
                    $generatedPrefix = strtoupper(substr($firstName, 0, 2) . substr($lastName, 0, 2));
                }
                $username = $nextSequentialUsername($generatedPrefix);
            }

            if ($phoneNumber === '') {
                if (($skipExisting || !$strict) && $username !== '' && $applyExistingBackfill($row, $rowNum, $username, '')) {
                    continue;
                }
                $errors[] = ['row' => $rowNum, 'username' => $username, 'error' => 'Phone number is required'];
                continue;
            }

            if (isset($seenUsernames[$username]) || isset($seenPhones[$phoneNumber])) {
                if ($strict) {
                    $errors[] = ['row' => $rowNum, 'username' => $username, 'error' => 'Duplicate username or phone number in uploaded file'];
                } else {
                    $skipped[] = ['row' => $rowNum, 'username' => $username, 'reason' => 'duplicate-in-file'];
                }
                continue;
            }
            $seenUsernames[$username] = true;
            $seenPhones[$phoneNumber] = true;

            if (isset($existingUsernames[$username]) || isset($existingPhones[$phoneNumber])) {
                if ($skipExisting || !$strict) {
                    if (!$applyExistingBackfill($row, $rowNum, $username, $phoneNumber)) {
                        $skipped[] = ['row' => $rowNum, 'username' => $username, 'reason' => 'already-exists'];
                    }
                } else {
                    $errors[] = ['row' => $rowNum, 'username' => $username, 'error' => 'Username or phone number already exists'];
                }
                continue;
            }
            $existingUsernames[$username] = true;
            $existingPhones[$phoneNumber] = true;

            $fullName = strtoupper(trim((string) ($row['fullName'] ?? '')));
            if ($fullName === '') {
                $fullName = trim($firstName . ' ' . $lastName);
                if ($fullName === '') {
                    $fullName = $username;
                }
            }

            $playerNotes = trim((string) ($row['playerNotes'] ?? ''));

            $passwordFields = $this->passwordFields($password);
            $pendingDocs[] = [
                'row' => $rowNum,
                'username' => $username,
                'doc' => [
                    'username' => $username,
                    'phoneNumber' => $phoneNumber,
                    'password' => $passwordFields['password'],
                    'passwordCaseInsensitiveHash' => $passwordFields['passwordCaseInsensitiveHash'],
                    'displayPassword' => $password,
                    'firstName' => $firstName,
                    'lastName' => $lastName,
                    'fullName' => $fullName,
                    'role' => 'user',
                    'status' => 'active',
                    'balance' => $this->numOr($row['balance'] ?? null, 1000),
                    'minBet' => $this->numOr($row['minBet'] ?? null, 25),
                    'maxBet' => $this->numOr($row['maxBet'] ?? null, 200),
                    'creditLimit' => $this->numOr($row['creditLimit'] ?? null, 1000),
                    'balanceOwed' => $this->numOr($row['balanceOwed'] ?? null, 0),
                    'freeplayBalance' => $this->numOr($row['freeplayBalance'] ?? null, 200),
                    'freeplayExpiresAt' => time() + (30 * 24 * 3600),
                    'maxFpCredit' => $this->numOr($row['maxFpCredit'] ?? null, 0),
                    'lifetime' => $this->numOr($row['lifetime'] ?? null, 0),
                    'playerNotes' => $playerNotes,
                    'pendingBalance' => 0,
                    'agentId' => ($assignedAgentId !== null && preg_match('/^[a-f0-9]{24}$/i', $assignedAgentId) === 1) ? MongoRepository::id($assignedAgentId) : null,
                    'createdBy' => MongoRepository::id($actorId),
                    'createdByModel' => $createdByModel,
                    'referralBonusGranted' => false,
                    'referralBonusAmount' => 0,
                    'createdAt' => $now,
                    'updatedAt' => $now,
                ],
            ];
        }

        $totalSubmitted = count($rows);
        if ($strict && $errors !== []) {
            return [400, [
                'message' => 'Bulk create validation failed',
                'total' => $totalSubmitted,
                'created' => 0,
                'failed' => count($errors) + count($skipped),
                'errors' => $errors,
                'skipped' => $skipped,
            ]];
        }

        $createdRows = [];
        $this->db->beginTransaction();
        try {
            foreach ($pendingDocs as $idx => $entry) {
                if ($idx % 25 === 0) {
                    $this->refreshExecutionDeadline(300);
                }
                $id = $this->db->insertOne('users', $entry['doc']);
                $doc = $entry['doc'];
                $agentIdRaw = isset($doc['agentId']) ? (string) $doc['agentId'] : '';
                $agentUsername = null;
                if ($agentIdRaw !== '') {
                    foreach ($agentIdByUsername as $aUser => $aId) {
                        if ($aId === $agentIdRaw) {
                            $agentUsername = $aUser;
                            break;
                        }
                    }
                }
                $createdRows[] = [
                    'row' => (int) ($entry['row'] ?? 0),
                    'id' => $id,
                    'username' => (string) ($entry['username'] ?? ''),
                    'phoneNumber' => $doc['phoneNumber'] ?? '',
                    'firstName' => $doc['firstName'] ?? '',
                    'lastName' => $doc['lastName'] ?? '',
                    'fullName' => $doc['fullName'] ?? '',
                    'displayPassword' => $doc['displayPassword'] ?? '',
                    'balance' => $this->num($doc['balance'] ?? 0),
                    'minBet' => $this->num($doc['minBet'] ?? 0),
                    'maxBet' => $this->num($doc['maxBet'] ?? 0),
                    'creditLimit' => $this->num($doc['creditLimit'] ?? 0),
                    'balanceOwed' => $this->num($doc['balanceOwed'] ?? 0),
                    'freeplayBalance' => $this->num($doc['freeplayBalance'] ?? 0),
                    'lifetime' => $this->num($doc['lifetime'] ?? 0),
                    'playerNotes' => $doc['playerNotes'] ?? '',
                    'agentId' => $agentIdRaw !== '' ? ['_id' => $agentIdRaw, 'username' => $agentUsername] : null,
                    'role' => 'user',
                    'status' => 'active',
                ];
            }
            $this->db->commit();
        } catch (Throwable $rowErr) {
            $this->db->rollback();
            return [500, [
                'message' => 'Bulk create failed and was rolled back',
                'total' => $totalSubmitted,
                'created' => 0,
                'failed' => $totalSubmitted,
                'errors' => [[
                    'row' => null,
                    'username' => null,
                    'error' => $rowErr->getMessage(),
                ]],
            ]];
        }

        $updatedCount = count($updatedRows);
        $createdCount = count($createdRows);
        $message = $createdCount . ' user(s) created';
        if ($updatedCount > 0) {
            $message .= ', ' . $updatedCount . ' existing user(s) updated';
        }

        return [201, [
            'message' => $message,
            'total' => $totalSubmitted,
            'created' => $createdCount,
            'updated' => $updatedCount,
            'failed' => count($errors) + count($skipped),
            'errors' => [],
            'skipped' => $skipped,
            'createdRows' => $createdRows,
            'updatedRows' => $updatedRows,
        ]];
    }

    /**
     * @return list<list<string>>
     */
    private function parseCsvRows(string $path): array
    {
        $this->refreshExecutionDeadline(300);
        $rows = [];
        $handle = fopen($path, 'rb');
        if ($handle === false) {
            throw new RuntimeException('Unable to read CSV file');
        }
        $line = 0;
        while (($cols = fgetcsv($handle)) !== false) {
            if ($line % 100 === 0) {
                $this->refreshExecutionDeadline(300);
            }
            $rows[] = array_map(static fn($v) => trim((string) $v), $cols);
            $line++;
        }
        fclose($handle);
        return $rows;
    }

    /**
     * @return list<list<string>>
     */
    private function parseXlsxRows(string $path): array
    {
        $this->refreshExecutionDeadline(300);
        if (!class_exists('ZipArchive')) {
            throw new RuntimeException('ZipArchive extension is not available');
        }

        $zip = new ZipArchive();
        if ($zip->open($path) !== true) {
            throw new RuntimeException('Unable to open XLSX file');
        }

        $shared = [];
        $sharedXml = $zip->getFromName('xl/sharedStrings.xml');
        if (is_string($sharedXml) && $sharedXml !== '') {
            $dom = new DOMDocument();
            if (@$dom->loadXML($sharedXml)) {
                $xpath = new DOMXPath($dom);
                $xpath->registerNamespace('x', 'http://schemas.openxmlformats.org/spreadsheetml/2006/main');
                $siNodes = $xpath->query('//x:si');
                if ($siNodes !== false) {
                    foreach ($siNodes as $idx => $siNode) {
                        if ($idx % 100 === 0) {
                            $this->refreshExecutionDeadline(300);
                        }
                        $shared[] = trim((string) ($siNode->textContent ?? ''));
                    }
                }
            }
        }

        $sheetXml = null;
        $sheetPath = null;
        if ($zip->locateName('xl/worksheets/sheet1.xml') !== false) {
            $sheetPath = 'xl/worksheets/sheet1.xml';
        } else {
            for ($i = 0; $i < $zip->numFiles; $i++) {
                $name = (string) $zip->getNameIndex($i);
                if (str_starts_with($name, 'xl/worksheets/sheet') && str_ends_with($name, '.xml')) {
                    $sheetPath = $name;
                    break;
                }
            }
        }
        if ($sheetPath !== null) {
            $sheetXml = $zip->getFromName($sheetPath);
        }
        $zip->close();

        if (!is_string($sheetXml) || $sheetXml === '') {
            throw new RuntimeException('Could not find worksheet in XLSX file');
        }

        $sheet = simplexml_load_string($sheetXml);
        if (!$sheet instanceof SimpleXMLElement || !isset($sheet->sheetData->row)) {
            throw new RuntimeException('Invalid worksheet data');
        }

        $rows = [];
        $rowIndex = 0;
        foreach ($sheet->sheetData->row as $rowNode) {
            if ($rowIndex % 100 === 0) {
                $this->refreshExecutionDeadline(300);
            }
            $cells = [];
            $maxCol = -1;
            foreach ($rowNode->c as $cell) {
                $ref = strtoupper((string) ($cell['r'] ?? ''));
                $colIndex = count($cells);
                if ($ref !== '' && preg_match('/^([A-Z]+)\d+$/', $ref, $m) === 1) {
                    $colIndex = $this->xlsxColumnToIndex($m[1]);
                }
                $maxCol = max($maxCol, $colIndex);

                $type = (string) ($cell['t'] ?? '');
                $value = '';
                if ($type === 's') {
                    $sharedIdx = (int) ((string) ($cell->v ?? '0'));
                    $value = (string) ($shared[$sharedIdx] ?? '');
                } elseif ($type === 'inlineStr') {
                    $value = trim((string) ($cell->is->t ?? ''));
                } else {
                    $value = trim((string) ($cell->v ?? ''));
                }
                $cells[$colIndex] = $value;
            }

            if ($maxCol < 0) {
                continue;
            }
            $line = [];
            for ($i = 0; $i <= $maxCol; $i++) {
                $line[] = (string) ($cells[$i] ?? '');
            }
            $rows[] = $line;
            $rowIndex++;
        }

        return $rows;
    }

    private function refreshExecutionDeadline(int $seconds = 300): void
    {
        $seconds = max(30, $seconds);
        if (function_exists('set_time_limit')) {
            @set_time_limit($seconds);
        }
        @ini_set('max_execution_time', (string) $seconds);
    }

    private function xlsxColumnToIndex(string $letters): int
    {
        $index = 0;
        $chars = str_split($letters);
        foreach ($chars as $ch) {
            $index = ($index * 26) + (ord($ch) - 64);
        }
        return max(0, $index - 1);
    }

    /**
     * @param list<list<string>> $rawRows
     * @return array{rows:list<array<string,mixed>>,errors:list<array<string,mixed>>,total:int}
     */
    private function mapSpreadsheetRowsToUsers(array $rawRows, string $defaultAgentId = ''): array
    {
        $rows = [];
        $errors = [];

        $headerRow = $rawRows[0] ?? [];
        $headerMap = [];
        foreach ($headerRow as $idx => $name) {
            $canonical = $this->canonicalImportField((string) $name);
            if ($canonical !== null) {
                $headerMap[(int) $idx] = $canonical;
            }
        }

        if ($headerMap === []) {
            return [
                'rows' => [],
                'errors' => [[
                    'row' => 1,
                    'username' => null,
                    'error' => 'Could not map spreadsheet headers. Include columns like username, phoneNumber, password.',
                ]],
                'total' => max(0, count($rawRows) - 1),
            ];
        }

        for ($i = 1; $i < count($rawRows); $i++) {
            $sourceRow = $rawRows[$i] ?? [];
            $mapped = [];
            foreach ($headerMap as $col => $field) {
                $mapped[$field] = trim((string) ($sourceRow[$col] ?? ''));
            }

            $isEmpty = true;
            foreach ($mapped as $value) {
                if ($value !== '') {
                    $isEmpty = false;
                    break;
                }
            }
            if ($isEmpty) {
                continue;
            }

            if (($mapped['firstName'] ?? '') === '' && ($mapped['lastName'] ?? '') === '' && ($mapped['fullName'] ?? '') !== '') {
                $parts = preg_split('/\s+/', trim((string) $mapped['fullName'])) ?: [];
                if (count($parts) > 0) {
                    $mapped['firstName'] = (string) $parts[0];
                    $mapped['lastName'] = (string) ($parts[count($parts) - 1] ?? '');
                }
            }

            // Auto-generate password if not provided: FIRST3 + LAST3 + LAST4_PHONE (matches frontend pattern)
            if (($mapped['password'] ?? '') === '') {
                $fn = strtoupper(trim((string) ($mapped['firstName'] ?? '')));
                $ln = strtoupper(trim((string) ($mapped['lastName'] ?? '')));
                $ph = preg_replace('/\D/', '', trim((string) ($mapped['phoneNumber'] ?? '')));
                $last4 = strlen($ph) >= 4 ? substr($ph, -4) : $ph;
                if ($fn !== '' && $ln !== '') {
                    $mapped['password'] = strtoupper(substr($fn, 0, 3) . substr($ln, 0, 3)) . $last4;
                } else {
                    // Fallback: username + last 4 of phone
                    $mapped['password'] = strtoupper(trim((string) ($mapped['username'] ?? 'USER'))) . $last4;
                }
            } else {
                $mapped['password'] = strtoupper(trim((string) $mapped['password']));
            }

            if (($mapped['phoneNumber'] ?? '') === '') {
                $errors[] = [
                    'row' => $i + 1,
                    'username' => $mapped['username'] ?? '',
                    'error' => 'phoneNumber is required',
                ];
                continue;
            }

            if (($mapped['agentId'] ?? '') === '' && $defaultAgentId !== '' && preg_match('/^[a-f0-9]{24}$/i', $defaultAgentId) === 1) {
                $mapped['agentId'] = $defaultAgentId;
            }

            $mapped['__sourceRow'] = $i + 1;
            $rows[] = $mapped;
        }

        return [
            'rows' => $rows,
            'errors' => $errors,
            'total' => max(0, count($rawRows) - 1),
        ];
    }

    private function canonicalImportField(string $header): ?string
    {
        $normalized = preg_replace('/[^a-z0-9]+/', '', strtolower($header)) ?? '';
        return match ($normalized) {
            'username', 'user', 'login', 'customer' => 'username',
            'phonenumber', 'phone', 'mobile', 'contact' => 'phoneNumber',
            'password', 'pass', 'pwd', 'pin' => 'password',
            'agent' => 'agent',
            'firstname', 'first' => 'firstName',
            'lastname', 'last' => 'lastName',
            'fullname', 'name', 'playername' => 'fullName',
            'agentid' => 'agentId',
            'balance' => 'balance',
            'minbet' => 'minBet',
            'maxbet', 'maxwager', 'wagerlimit', 'maxwagerlimit' => 'maxBet',
            'creditlimit', 'credit' => 'creditLimit',
            'balanceowed', 'settlelimit' => 'balanceOwed',
            'freeplaybalance', 'freeplay', 'fpbalance' => 'freeplayBalance',
            'lifetime', 'lifetimeplusminus', 'lifeline', 'lifelineplusminus' => 'lifetime',
            'playernotes', 'notes', 'note' => 'playerNotes',
            default => null,
        };
    }

    private function seedWorkflowHierarchy(): void
    {
        try {
            $actor = $this->protect(['admin']);
            if ($actor === null) {
                return;
            }

            $body = Http::jsonBody();
            $confirm = (bool) ($body['confirm'] ?? false);
            if (!$confirm) {
                Response::json(['message' => 'Set confirm=true to run workflow seed'], 400);
                return;
            }

            $topMasterCount = 10;
            $referredMasterCount = 5;
            $agentsPerMaster = 10;
            $playersPerAgent = 10;

            $baseMinBet = $this->numOr($body['defaultMinBet'] ?? null, 25);
            $baseMaxBet = $this->numOr($body['defaultMaxBet'] ?? null, 200);
            $baseCreditLimit = $this->numOr($body['defaultCreditLimit'] ?? null, 1000);
            $baseSettleLimit = $this->numOr($body['defaultSettleLimit'] ?? null, 200);
            $basePlayerBalance = $this->numOr($body['defaultPlayerBalance'] ?? null, 1000);
            $basePlayerFreeplay = $this->numOr($body['defaultPlayerFreeplay'] ?? null, 200);
            $replacePreviousSeed = !array_key_exists('replacePreviousSeed', $body) || (bool) $body['replacePreviousSeed'];

            $batchTag = 'WF_POLICY_' . gmdate('Ymd_His');
            $adminObjectId = MongoRepository::id((string) ($actor['_id'] ?? ''));
            if ($replacePreviousSeed) {
                $this->cleanupWorkflowSeedData();
            }

            $usernameDocs = array_merge(
                $this->db->findMany('users', [], ['projection' => ['username' => 1]]),
                $this->db->findMany('agents', [], ['projection' => ['username' => 1]]),
                $this->db->findMany('admins', [], ['projection' => ['username' => 1]])
            );
            $existingUsernames = [];
            foreach ($usernameDocs as $doc) {
                $u = strtoupper((string) ($doc['username'] ?? ''));
                if ($u !== '') {
                    $existingUsernames[] = $u;
                }
            }
            $reservedUsernames = [];

            $phoneDocs = array_merge(
                $this->db->findMany('users', [], ['projection' => ['phoneNumber' => 1]]),
                $this->db->findMany('agents', [], ['projection' => ['phoneNumber' => 1]]),
                $this->db->findMany('admins', [], ['projection' => ['phoneNumber' => 1]])
            );
            $usedPhones = [];
            foreach ($phoneDocs as $doc) {
                $phone = trim((string) ($doc['phoneNumber'] ?? ''));
                if ($phone !== '') {
                    $usedPhones[$phone] = true;
                }
            }

            $phoneSuffixCounter = (int) (time() % 10000);
            $areaCodes = ['201', '212', '213', '305', '312', '404', '470', '512', '602', '646', '702', '713', '718', '786', '818', '832', '914', '917', '929', '954'];

            $firstNames = [
                'James', 'John', 'Michael', 'David', 'Robert', 'Daniel', 'William', 'Christopher', 'Anthony', 'Joseph',
                'Matthew', 'Andrew', 'Joshua', 'Ryan', 'Brandon', 'Kevin', 'Jason', 'Justin', 'Benjamin', 'Nicholas',
                'Alexander', 'Tyler', 'Jonathan', 'Christian', 'Aaron', 'Noah', 'Liam', 'Ethan', 'Lucas', 'Mason',
            ];
            $lastNames = [
                'Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Miller', 'Davis', 'Garcia', 'Rodriguez', 'Wilson',
                'Martinez', 'Anderson', 'Taylor', 'Thomas', 'Hernandez', 'Moore', 'Martin', 'Jackson', 'Thompson', 'White',
                'Lopez', 'Lee', 'Gonzalez', 'Harris', 'Clark', 'Lewis', 'Walker', 'Young', 'Allen', 'King',
            ];

            $makePhone = function () use (&$phoneSuffixCounter, $areaCodes, &$usedPhones): string {
                do {
                    $area = $areaCodes[array_rand($areaCodes)];
                    $mid = str_pad((string) random_int(200, 999), 3, '0', STR_PAD_LEFT);
                    $phoneSuffixCounter++;
                    $end = str_pad((string) ($phoneSuffixCounter % 10000), 4, '0', STR_PAD_LEFT);
                    $phone = $area . '-' . $mid . '-' . $end;
                } while (isset($usedPhones[$phone]));
                $usedPhones[$phone] = true;
                return $phone;
            };

            $pickName = function () use ($firstNames, $lastNames): array {
                return [
                    $firstNames[array_rand($firstNames)],
                    $lastNames[array_rand($lastNames)],
                ];
            };

            $prefixFromName = static function (string $first, string $last): string {
                $f = strtoupper(preg_replace('/[^A-Z0-9]/i', '', $first));
                $l = strtoupper(preg_replace('/[^A-Z0-9]/i', '', $last));
                $prefix = substr($f, 0, 2) . substr($l, 0, 2);
                if ($prefix === '') {
                    return 'WF';
                }
                return substr(str_pad($prefix, 2, 'X'), 0, 5);
            };

            $makeAutoPassword = static function (string $first, string $last, string $phone): string {
                $digits = preg_replace('/\D/', '', $phone);
                $last4 = substr($digits, -4);
                $first3First = strtoupper(substr(trim($first), 0, 3));
                $first3Last = strtoupper(substr(trim($last), 0, 3));
                return strtoupper($first3First . $first3Last . str_pad($last4, 4, '0', STR_PAD_LEFT));
            };

            $nextUsername = function (string $prefix, string $suffix, string $type) use ($existingUsernames, &$reservedUsernames): string {
                $safePrefix = preg_quote($prefix, '/');
                $safeSuffix = preg_quote($suffix, '/');
                $pattern = '/^' . $safePrefix . '([0-9]+)' . $safeSuffix . '$/i';

                $maxNum = ($type === 'agent') ? 364 : 100;
                foreach ($existingUsernames as $u) {
                    if (preg_match($pattern, $u, $m) === 1) {
                        $n = (int) ($m[1] ?? 0);
                        if ($n > $maxNum) {
                            $maxNum = $n;
                        }
                    }
                }
                foreach ($reservedUsernames as $u) {
                    if (preg_match($pattern, $u, $m) === 1) {
                        $n = (int) ($m[1] ?? 0);
                        if ($n > $maxNum) {
                            $maxNum = $n;
                        }
                    }
                }

                $candidate = strtoupper($prefix . ($maxNum + 1) . $suffix);
                $reservedUsernames[] = $candidate;
                return $candidate;
            };

            $insertAgent = function (
                string $username,
                string $password,
                string $firstName,
                string $lastName,
                string $role,
                string $createdBy,
                string $createdByModel,
                float $minBet,
                float $maxBet,
                float $creditLimit,
                float $settleLimit
            ) use ($makePhone, $batchTag): string {
                $passwordFields = $this->passwordFields($password);
                $doc = [
                    'username' => strtoupper($username),
                    'phoneNumber' => $makePhone(),
                    'password' => $passwordFields['password'],
                    'passwordCaseInsensitiveHash' => $passwordFields['passwordCaseInsensitiveHash'],
                    'displayPassword' => $password,
                    'fullName' => strtoupper(trim($firstName . ' ' . $lastName)),
                    'role' => $role,
                    'status' => 'active',
                    'balance' => 0.0,
                    'agentBillingRate' => 0.0,
                    'agentBillingStatus' => 'paid',
                    'viewOnly' => false,
                    'defaultMinBet' => $minBet,
                    'defaultMaxBet' => $maxBet,
                    'defaultCreditLimit' => $creditLimit,
                    'defaultSettleLimit' => $settleLimit,
                    'createdBy' => $createdBy,
                    'createdByModel' => $createdByModel,
                    'seedSource' => 'workflow_policy_v2',
                    'seedBatch' => $batchTag,
                    'createdAt' => MongoRepository::nowUtc(),
                    'updatedAt' => MongoRepository::nowUtc(),
                ];
                $id = $this->db->insertOne('agents', $doc);
                if ($role === 'master_agent') {
                    $this->syncMasterAgentCollection(array_merge($doc, ['_id' => $id]));
                }
                return $id;
            };

            $insertPlayer = function (
                string $username,
                string $password,
                string $firstName,
                string $lastName,
                string $agentId,
                float $balance,
                float $minBet,
                float $maxBet,
                float $creditLimit,
                float $settleLimit,
                float $freeplay,
                ?string $referredByUserId = null
            ) use ($makePhone, $batchTag): string {
                $passwordFields = $this->passwordFields($password);
                $doc = [
                    'username' => strtoupper($username),
                    'phoneNumber' => $makePhone(),
                    'password' => $passwordFields['password'],
                    'passwordCaseInsensitiveHash' => $passwordFields['passwordCaseInsensitiveHash'],
                    'displayPassword' => $password,
                    'firstName' => strtoupper($firstName),
                    'lastName' => strtoupper($lastName),
                    'fullName' => strtoupper(trim($firstName . ' ' . $lastName)),
                    'role' => 'user',
                    'status' => 'active',
                    'balance' => $balance,
                    'minBet' => $minBet,
                    'maxBet' => $maxBet,
                    'creditLimit' => $creditLimit,
                    'balanceOwed' => $settleLimit,
                    'freeplayBalance' => $freeplay,
                    'pendingBalance' => 0,
                    'agentId' => $agentId,
                    'createdBy' => $agentId,
                    'createdByModel' => 'Agent',
                    'referredByUserId' => $referredByUserId,
                    'referralBonusGranted' => $referredByUserId !== null ? (random_int(0, 1) === 1) : false,
                    'referralBonusAmount' => 0,
                    'apps' => new stdClass(),
                    'seedSource' => 'workflow_policy_v2',
                    'seedBatch' => $batchTag,
                    'createdAt' => MongoRepository::nowUtc(),
                    'updatedAt' => MongoRepository::nowUtc(),
                ];
                return $this->db->insertOne('users', $doc);
            };

            $allMasters = [];
            for ($i = 1; $i <= $topMasterCount; $i++) {
                [$firstName, $lastName] = $pickName();
                $phoneForPass = $makePhone();
                $username = $nextUsername($prefixFromName($firstName, $lastName), 'MA', 'agent');
                $password = $makeAutoPassword($firstName, $lastName, $phoneForPass);
                $masterId = $insertAgent(
                    $username,
                    $password,
                    $firstName,
                    $lastName,
                    'master_agent',
                    $adminObjectId,
                    'Admin',
                    $baseMinBet,
                    $baseMaxBet,
                    $baseCreditLimit,
                    $baseSettleLimit
                );
                // Override phone in a single write so password formula uses this exact phone.
                $this->db->updateOne('agents', ['_id' => MongoRepository::id($masterId)], ['phoneNumber' => $phoneForPass]);
                $this->syncMasterAgentCollection(array_merge(['_id' => $masterId, 'phoneNumber' => $phoneForPass], $this->db->findOne('agents', ['_id' => MongoRepository::id($masterId)]) ?? []));
                $allMasters[] = [
                    'id' => $masterId,
                    'username' => $username,
                    'firstName' => $firstName,
                    'lastName' => $lastName,
                    'defaults' => [
                        'minBet' => $baseMinBet,
                        'maxBet' => $baseMaxBet,
                        'creditLimit' => $baseCreditLimit,
                        'settleLimit' => $baseSettleLimit,
                    ],
                    'createdByModel' => 'Admin',
                ];
            }

            if (count($allMasters) === 0) {
                Response::json(['message' => 'Could not create top master agents'], 500);
                return;
            }

            $firstMasterObjectId = MongoRepository::id((string) $allMasters[0]['id']);
            for ($i = 1; $i <= $referredMasterCount; $i++) {
                [$firstName, $lastName] = $pickName();
                $phoneForPass = $makePhone();
                $username = $nextUsername($prefixFromName($firstName, $lastName), 'MA', 'agent');
                $password = $makeAutoPassword($firstName, $lastName, $phoneForPass);
                $masterId = $insertAgent(
                    $username,
                    $password,
                    $firstName,
                    $lastName,
                    'master_agent',
                    $firstMasterObjectId,
                    'Agent',
                    $baseMinBet,
                    $baseMaxBet,
                    $baseCreditLimit,
                    $baseSettleLimit
                );
                $this->db->updateOne('agents', ['_id' => MongoRepository::id($masterId)], ['phoneNumber' => $phoneForPass]);
                $this->syncMasterAgentCollection(array_merge(['_id' => $masterId, 'phoneNumber' => $phoneForPass], $this->db->findOne('agents', ['_id' => MongoRepository::id($masterId)]) ?? []));
                $allMasters[] = [
                    'id' => $masterId,
                    'username' => $username,
                    'firstName' => $firstName,
                    'lastName' => $lastName,
                    'defaults' => [
                        'minBet' => $baseMinBet,
                        'maxBet' => $baseMaxBet,
                        'creditLimit' => $baseCreditLimit,
                        'settleLimit' => $baseSettleLimit,
                    ],
                    'createdByModel' => 'Agent',
                    'parentMasterId' => (string) $allMasters[0]['id'],
                ];
            }

            $totalAgents = 0;
            $totalPlayers = 0;
            $totalReferredPlayers = 0;
            foreach ($allMasters as $masterIndex => $master) {
                $masterObjectId = MongoRepository::id((string) $master['id']);
                for ($j = 1; $j <= $agentsPerMaster; $j++) {
                    [$agentFirst, $agentLast] = $pickName();
                    $agentPhone = $makePhone();
                    $agentUsername = $nextUsername((string) $master['username'], '', 'agent');
                    $agentPassword = $makeAutoPassword($agentFirst, $agentLast, $agentPhone);
                    $masterDefaults = is_array($master['defaults'] ?? null) ? $master['defaults'] : [
                        'minBet' => $baseMinBet,
                        'maxBet' => $baseMaxBet,
                        'creditLimit' => $baseCreditLimit,
                        'settleLimit' => $baseSettleLimit,
                    ];
                    $agentMinBet = (float) ($masterDefaults['minBet'] ?? $baseMinBet);
                    $agentMaxBet = (float) ($masterDefaults['maxBet'] ?? $baseMaxBet);
                    $agentCredit = (float) ($masterDefaults['creditLimit'] ?? $baseCreditLimit);
                    $agentSettle = (float) ($masterDefaults['settleLimit'] ?? $baseSettleLimit);
                    $agentId = $insertAgent(
                        $agentUsername,
                        $agentPassword,
                        $agentFirst,
                        $agentLast,
                        'agent',
                        $masterObjectId,
                        'Agent',
                        $agentMinBet,
                        $agentMaxBet,
                        $agentCredit,
                        $agentSettle
                    );
                    $this->db->updateOne('agents', ['_id' => MongoRepository::id($agentId)], ['phoneNumber' => $agentPhone]);
                    $totalAgents++;

                    $agentObjectId = MongoRepository::id($agentId);
                    $playersCreatedForAgent = [];
                    for ($k = 1; $k <= $playersPerAgent; $k++) {
                        [$playerFirst, $playerLast] = $pickName();
                        $playerPhone = $makePhone();
                        $playerUsername = $nextUsername($agentUsername, '', 'player');
                        $playerPassword = $makeAutoPassword($playerFirst, $playerLast, $playerPhone);
                        $playerMinBet = $agentMinBet;
                        $playerMaxBet = $agentMaxBet;
                        $playerCredit = $agentCredit;
                        $playerSettle = $agentSettle;
                        $playerBalance = $basePlayerBalance;
                        $playerFreeplay = $basePlayerFreeplay;

                        $referrerId = null;
                        if ($k > 1 && count($playersCreatedForAgent) > 0 && ($k % 4 === 0)) {
                            $referrerPick = $playersCreatedForAgent[array_rand($playersCreatedForAgent)];
                            $referrerId = MongoRepository::id((string) $referrerPick);
                            $totalReferredPlayers++;
                        }

                        $playerId = $insertPlayer(
                            $playerUsername,
                            $playerPassword,
                            $playerFirst,
                            $playerLast,
                            $agentObjectId,
                            $playerBalance,
                            $playerMinBet,
                            $playerMaxBet,
                            $playerCredit,
                            $playerSettle,
                            $playerFreeplay,
                            $referrerId
                        );
                        $this->db->updateOne('users', ['_id' => MongoRepository::id($playerId)], ['phoneNumber' => $playerPhone]);
                        $playersCreatedForAgent[] = $playerId;
                        $totalPlayers++;
                    }
                }
            }

            Response::json([
                'message' => 'Workflow hierarchy seeded successfully',
                'batchTag' => $batchTag,
                'summary' => [
                    'topMastersCreatedByAdmin' => $topMasterCount,
                    'referredMastersCreatedByFirstMaster' => $referredMasterCount,
                    'totalMasters' => count($allMasters),
                    'agentsPerMaster' => $agentsPerMaster,
                    'totalAgents' => $totalAgents,
                    'playersPerAgent' => $playersPerAgent,
                    'totalPlayers' => $totalPlayers,
                    'playersWithReferrals' => $totalReferredPlayers,
                ],
                'firstMasterUsername' => $allMasters[0]['username'],
            ], 201);
        } catch (Throwable $e) {
            Response::json(['message' => 'Server error seeding workflow hierarchy: ' . $e->getMessage()], 500);
        }
    }

    private function cleanupWorkflowSeed(): void
    {
        try {
            $actor = $this->protect(['admin']);
            if ($actor === null) {
                return;
            }

            $summary = $this->cleanupWorkflowSeedData();
            Response::json([
                'message' => 'Seeded workflow data deleted',
                'summary' => $summary,
            ]);
        } catch (Throwable $e) {
            Response::json(['message' => 'Server error cleaning seeded workflow data: ' . $e->getMessage()], 500);
        }
    }

    private function cleanupWorkflowSeedData(): array
    {
        $legacyAgentQuery = [
            '$or' => [
                ['seedSource' => 'workflow_policy_v2'],
                ['seedSource' => 'workflow_seed'],
                ['fullName' => ['$regex' => '^WORKFLOW ', '$options' => 'i']],
                ['username' => ['$regex' => '^WF[0-9]{6}', '$options' => 'i']],
            ],
        ];
        $legacyUserQuery = [
            '$or' => [
                ['seedSource' => 'workflow_policy_v2'],
                ['seedSource' => 'workflow_seed'],
                ['fullName' => ['$regex' => '^WORKFLOW ', '$options' => 'i']],
                ['username' => ['$regex' => '^WF[0-9]{6}', '$options' => 'i']],
            ],
        ];

        $deletedUsers = 0;
        $deletedAgents = 0;
        $deletedMasterAgentLinks = 0;

        $users = $this->db->findMany('users', $legacyUserQuery, ['projection' => ['_id' => 1]]);
        foreach ($users as $u) {
            $id = (string) ($u['_id'] ?? '');
            if ($id !== '' && preg_match('/^[a-f0-9]{24}$/i', $id) === 1) {
                $this->db->deleteOne('users', ['_id' => MongoRepository::id($id)]);
                $deletedUsers++;
            }
        }

        $agents = $this->db->findMany('agents', $legacyAgentQuery, ['projection' => ['_id' => 1]]);
        foreach ($agents as $a) {
            $id = (string) ($a['_id'] ?? '');
            if ($id !== '' && preg_match('/^[a-f0-9]{24}$/i', $id) === 1) {
                $masterAgentLink = $this->db->findOne('master_agents', ['agentId' => MongoRepository::id($id)], ['projection' => ['_id' => 1]]);
                $this->db->deleteOne('master_agents', ['agentId' => MongoRepository::id($id)]);
                $this->db->deleteOne('agents', ['_id' => MongoRepository::id($id)]);
                if ($masterAgentLink !== null) {
                    $deletedMasterAgentLinks++;
                }
                $deletedAgents++;
            }
        }

        return [
            'usersDeleted' => $deletedUsers,
            'agentsDeleted' => $deletedAgents,
            'masterAgentLinksDeleted' => $deletedMasterAgentLinks,
        ];
    }

    private function updateUserByAdmin(string $id): void
    {
        try {
            $actor = $this->protect(['admin']);
            if ($actor === null) {
                return;
            }

            $user = $this->db->findOne('users', ['_id' => MongoRepository::id($id)]);
            if ($user === null) {
                Response::json(['message' => 'User not found'], 404);
                return;
            }

            $body = Http::jsonBody();
            $updates = ['updatedAt' => MongoRepository::nowUtc()];
            $allowDuplicateRaw = $body['allowDuplicateSave'] ?? ($body['allowDuplicate'] ?? false);
            $allowDuplicateSave = is_bool($allowDuplicateRaw)
                ? $allowDuplicateRaw
                : filter_var((string) $allowDuplicateRaw, FILTER_VALIDATE_BOOLEAN);
            $duplicateWarningPayload = null;
            $incomingFirstName = array_key_exists('firstName', $body) ? strtoupper(trim((string) $body['firstName'])) : strtoupper(trim((string) ($user['firstName'] ?? '')));
            $incomingLastName = array_key_exists('lastName', $body) ? strtoupper(trim((string) $body['lastName'])) : strtoupper(trim((string) ($user['lastName'] ?? '')));
            $incomingPhoneNumber = array_key_exists('phoneNumber', $body) ? trim((string) $body['phoneNumber']) : trim((string) ($user['phoneNumber'] ?? ''));
            $incomingEmail = array_key_exists('email', $body) ? trim((string) $body['email']) : trim((string) ($user['email'] ?? ''));
            $providedFullName = array_key_exists('fullName', $body) ? trim((string) $body['fullName']) : '';
            if ($providedFullName !== '') {
                $incomingFullName = strtoupper($providedFullName);
            } elseif (array_key_exists('firstName', $body) || array_key_exists('lastName', $body)) {
                $incomingFullName = strtoupper(trim($incomingFirstName . ' ' . $incomingLastName));
            } else {
                $incomingFullName = strtoupper(trim((string) ($user['fullName'] ?? '')));
                if ($incomingFullName === '') {
                    $incomingFullName = strtoupper(trim($incomingFirstName . ' ' . $incomingLastName));
                }
            }

            $identityTouched = array_key_exists('firstName', $body)
                || array_key_exists('lastName', $body)
                || array_key_exists('phoneNumber', $body)
                || array_key_exists('fullName', $body);
            $generatedIdentityPassword = $this->generateIdentityPassword(
                $incomingFirstName,
                $incomingLastName,
                $incomingPhoneNumber,
                (string) ($user['username'] ?? '')
            );
            $manualPassword = isset($body['password']) && (string) $body['password'] !== ''
                ? strtoupper(trim((string) $body['password']))
                : '';
            $duplicatePasswordProbe = $generatedIdentityPassword !== '' ? $generatedIdentityPassword : $manualPassword;

            if ($identityTouched || $duplicatePasswordProbe !== '') {
                $duplicatePayload = $identityTouched
                    ? [
                        'firstName' => $incomingFirstName,
                        'lastName' => $incomingLastName,
                        'fullName' => $incomingFullName,
                        'phoneNumber' => $incomingPhoneNumber,
                        'email' => $incomingEmail,
                        'password' => $duplicatePasswordProbe,
                    ]
                    : [
                        'password' => $duplicatePasswordProbe,
                    ];
                $duplicateMatches = $this->findLikelyDuplicatePlayers($duplicatePayload);
                $duplicateMatches = array_values(array_filter($duplicateMatches, static function (array $match) use ($id): bool {
                    return (string) ($match['id'] ?? '') !== $id;
                }));
                if (count($duplicateMatches) > 0) {
                    $duplicateWarningPayload = $this->buildDuplicatePlayerResponse(
                        $incomingFirstName,
                        $incomingLastName,
                        $incomingFullName,
                        $incomingPhoneNumber,
                        $incomingEmail,
                        $duplicateMatches
                    );
                    if (!$allowDuplicateSave) {
                        Response::json($duplicateWarningPayload, 409);
                        return;
                    }
                }
            }

            if (isset($body['phoneNumber']) && trim((string) $body['phoneNumber']) !== '' && (string) $body['phoneNumber'] !== (string) ($user['phoneNumber'] ?? '')) {
                $existingPhone = $this->db->findOne('users', ['phoneNumber' => (string) $body['phoneNumber']]);
                if ($existingPhone !== null && (string) ($existingPhone['_id'] ?? '') !== $id) {
                    if (!$allowDuplicateSave) {
                        Response::json(['message' => 'Phone number already exists'], 409);
                        return;
                    }
                }
                $updates['phoneNumber'] = (string) $body['phoneNumber'];
            }
            if ($identityTouched && $generatedIdentityPassword !== '') {
                $nextPassword = $generatedIdentityPassword;
                $passwordFields = $this->passwordFields($nextPassword);
                $updates['password'] = $passwordFields['password'];
                $updates['passwordCaseInsensitiveHash'] = $passwordFields['passwordCaseInsensitiveHash'];
                $updates['displayPassword'] = $nextPassword;
            } elseif (isset($body['password']) && (string) $body['password'] !== '') {
                $nextPassword = strtoupper(trim((string) $body['password']));
                $passwordFields = $this->passwordFields($nextPassword);
                $updates['password'] = $passwordFields['password'];
                $updates['passwordCaseInsensitiveHash'] = $passwordFields['passwordCaseInsensitiveHash'];
                $updates['displayPassword'] = $nextPassword;
            }
            if (isset($body['firstName'])) {
                $updates['firstName'] = strtoupper(trim((string) $body['firstName']));
            }
            if (isset($body['lastName'])) {
                $updates['lastName'] = strtoupper(trim((string) $body['lastName']));
            }
            if (isset($body['fullName']) && (string) $body['fullName'] !== '') {
                $updates['fullName'] = strtoupper(trim((string) $body['fullName']));
            } elseif (isset($body['firstName']) || isset($body['lastName'])) {
                $f = strtoupper((string) ($body['firstName'] ?? ($user['firstName'] ?? '')));
                $l = strtoupper((string) ($body['lastName'] ?? ($user['lastName'] ?? '')));
                $updates['fullName'] = strtoupper(trim($f . ' ' . $l));
            }

            foreach (['status', 'minBet', 'maxBet', 'creditLimit', 'balanceOwed', 'freeplayBalance'] as $field) {
                if (array_key_exists($field, $body)) {
                    $updates[$field] = $body[$field];
                }
            }
            if (array_key_exists('settings', $body) && is_array($body['settings'])) {
                $existing = is_array($user['settings'] ?? null) ? $user['settings'] : [];
                $updates['settings'] = array_merge($existing, $body['settings']);
            }
            if (array_key_exists('apps', $body) && is_array($body['apps'])) {
                $existing = is_array($user['apps'] ?? null) ? $user['apps'] : [];
                $updates['apps'] = array_merge($existing, $body['apps']);
            }
            if (isset($body['dashboardLayout']) && $body['dashboardLayout'] !== '') {
                $updates['dashboardLayout'] = $body['dashboardLayout'];
            }

            $balanceBefore = null;
            if (array_key_exists('balance', $body) && is_numeric($body['balance'])) {
                $balanceBefore = $this->num($user['balance'] ?? 0);
                $updates['balance'] = max(0, (float) $body['balance']);
            }

            $this->db->beginTransaction();
            try {
                $this->db->updateOne('users', ['_id' => MongoRepository::id($id)], $updates);
                $updated = $this->db->findOne('users', ['_id' => MongoRepository::id($id)]);

                if ($balanceBefore !== null) {
                    $balanceAfter = $this->num($updated['balance'] ?? ($updates['balance'] ?? $balanceBefore));
                    $this->db->insertOne('transactions', [
                        'userId' => MongoRepository::id($id),
                        'adminId' => MongoRepository::id((string) ($actor['_id'] ?? '')),
                        'amount' => abs($balanceAfter - $balanceBefore),
                        'type' => 'adjustment',
                        'status' => 'completed',
                        'balanceBefore' => $balanceBefore,
                        'balanceAfter' => $balanceAfter,
                        'referenceType' => 'Adjustment',
                        'reason' => 'ADMIN_USER_BALANCE_ADJUSTMENT',
                        'description' => 'Admin updated user balance',
                        'createdAt' => MongoRepository::nowUtc(),
                        'updatedAt' => MongoRepository::nowUtc(),
                    ]);
                }
                $this->db->commit();
                if ($balanceBefore !== null) {
                    $this->invalidateHeaderSummaryCache();
                }
            } catch (Throwable $txErr) {
                $this->db->rollback();
                throw $txErr;
            }

            $response = ['message' => 'User updated successfully', 'user' => $updated];
            if (is_array($duplicateWarningPayload)) {
                $response['duplicateWarning'] = $duplicateWarningPayload;
                $response['savedWithDuplicateWarning'] = true;
            }
            Response::json($response);
        } catch (Throwable $e) {
            Response::json(['message' => 'Server error updating user'], 500);
        }
    }

    private function updateUserCredit(string $id): void
    {
        try {
            $actor = $this->protect(['admin', 'agent', 'master_agent', 'super_agent']);
            if ($actor === null) {
                return;
            }

            $user = $this->db->findOne('users', ['_id' => MongoRepository::id($id)]);
            if ($user === null || (($user['role'] ?? 'user') !== 'user')) {
                Response::json(['message' => 'User not found'], 404);
                return;
            }

            $agent = null;
            if (($actor['role'] ?? '') === 'agent') {
                if ((string) ($user['agentId'] ?? '') !== (string) ($actor['_id'] ?? '')) {
                    Response::json(['message' => 'Not authorized to update this user'], 403);
                    return;
                }
                $agent = $this->db->findOne('agents', ['_id' => MongoRepository::id((string) $actor['_id'])]);
                if ($agent === null) {
                    Response::json(['message' => 'Agent account not found'], 404);
                    return;
                }
            }

            $body = Http::jsonBody();
            $requestedType = strtolower(trim((string) ($body['type'] ?? 'adjustment')));
            $txType = in_array($requestedType, ['adjustment', 'deposit', 'withdrawal'], true) ? $requestedType : 'adjustment';
            $txReason = trim((string) ($body['reason'] ?? ''));
            if ($txReason === '') {
                $txReason = 'ADMIN_BALANCE_ADJUSTMENT';
            }
            $txDescription = trim((string) ($body['description'] ?? ''));
            if ($txDescription === '') {
                $txDescription = is_array($agent)
                    ? ('Agent ' . (string) ($agent['username'] ?? '') . ' updated user balance')
                    : 'Admin updated user balance';
            }

            $operationMode = strtolower(trim((string) ($body['operationMode'] ?? 'exact')));
            $requestedAmount = null;
            $requestedDirection = null;
            $nextBalanceTarget = null;
            if ($operationMode === 'transaction') {
                if (!array_key_exists('amount', $body) || !is_numeric($body['amount'])) {
                    Response::json(['message' => 'Amount is required'], 400);
                    return;
                }
                $requestedAmount = round((float) $body['amount'], 2);
                if ($requestedAmount <= 0) {
                    Response::json(['message' => 'Amount must be greater than 0'], 400);
                    return;
                }
                $requestedDirection = $this->resolveBalanceTransactionDirection(
                    $txType,
                    $txReason,
                    (string) ($body['direction'] ?? '')
                );
                if ($requestedDirection === null) {
                    Response::json(['message' => 'Unable to determine transaction direction for this balance update'], 400);
                    return;
                }
            } else {
                if (!array_key_exists('balance', $body) || !is_numeric($body['balance'])) {
                    Response::json(['message' => 'Balance is required'], 400);
                    return;
                }
                $nextBalanceTarget = max(0.0, round((float) $body['balance'], 2));
            }

            $applyDepositFreePlayBonus = true;
            if ($txType === 'deposit' && array_key_exists('applyDepositFreeplayBonus', $body)) {
                $rawApplyDepositFreePlayBonus = $body['applyDepositFreeplayBonus'];
                if (is_bool($rawApplyDepositFreePlayBonus)) {
                    $applyDepositFreePlayBonus = $rawApplyDepositFreePlayBonus;
                } else {
                    $parsedApplyDepositFreePlayBonus = filter_var(
                        (string) $rawApplyDepositFreePlayBonus,
                        FILTER_VALIDATE_BOOLEAN,
                        FILTER_NULL_ON_FAILURE
                    );
                    if ($parsedApplyDepositFreePlayBonus !== null) {
                        $applyDepositFreePlayBonus = $parsedApplyDepositFreePlayBonus;
                    }
                }
            }

            $normalizedReason = strtoupper($txReason);
            // Lifetime +/- should only move for explicit credit/debit adjustments.
            $lifetimeAdjustmentReasons = [
                'ADMIN_CREDIT_ADJUSTMENT',
                'ADMIN_DEBIT_ADJUSTMENT',
                'CASHIER_CREDIT_ADJUSTMENT',
                'CASHIER_DEBIT_ADJUSTMENT',
            ];
            $balanceBefore = 0.0;
            $nextBalance = 0.0;
            $lifetimeAfter = 0.0;
            $pendingBalance = 0.0;
            $updatedFreeplayBalance = $this->num($user['freeplayBalance'] ?? 0);
            $freePlayBonusAmount = 0.0;
            $freePlayBonusPercent = 0.0;
                $freePlayBonusCap = 0.0;
                $freePlayBalanceAfter = $updatedFreeplayBalance;
                $freePlayTransactionDoc = null;
                $referralBonusAward = null;
                $transactionId = '';
                $freePlayTransactionId = '';
                $agentBalanceOut = null;

            $this->db->beginTransaction();
            try {
                $lockedUser = $this->db->findOneForUpdate('users', ['_id' => MongoRepository::id($id)]);
                if ($lockedUser === null || (($lockedUser['role'] ?? 'user') !== 'user')) {
                    $this->db->rollback();
                    Response::json(['message' => 'User not found'], 404);
                    return;
                }
                if (($actor['role'] ?? '') === 'agent' && (string) ($lockedUser['agentId'] ?? '') !== (string) ($actor['_id'] ?? '')) {
                    $this->db->rollback();
                    Response::json(['message' => 'Not authorized to update this user'], 403);
                    return;
                }

                $balanceBefore = $this->num($lockedUser['balance'] ?? 0);
                if ($operationMode === 'transaction') {
                    $diff = $requestedDirection === 'credit' ? $requestedAmount : -$requestedAmount;
                    $nextBalance = round($balanceBefore + $diff, 2);
                } else {
                    $nextBalance = $nextBalanceTarget;
                    $diff = $nextBalance - $balanceBefore;
                }

                $lockedAgent = null;
                $agentBalance = 0.0;
                if (is_array($agent)) {
                    $lockedAgent = $this->db->findOneForUpdate('agents', ['_id' => MongoRepository::id((string) $actor['_id'])]);
                    if ($lockedAgent === null) {
                        $this->db->rollback();
                        Response::json(['message' => 'Agent account not found'], 404);
                        return;
                    }
                    $agentBalance = $this->num($lockedAgent['balance'] ?? 0);
                    if ($diff > 0 && $agentBalance < $diff) {
                        $this->db->rollback();
                        Response::json(['message' => 'Insufficient balance. You need ' . round($diff) . ' but only have ' . round($agentBalance)], 400);
                        return;
                    }
                }

                $lifetimeBefore = $this->num($lockedUser['lifetime'] ?? 0);
                $lifetimeAfter = $lifetimeBefore;
                $shouldAdjustLifetime = $txType === 'adjustment'
                    && in_array($normalizedReason, $lifetimeAdjustmentReasons, true);
                $userUpdates = [
                    'balance' => $nextBalance,
                    'updatedAt' => MongoRepository::nowUtc(),
                ];
                if ($shouldAdjustLifetime) {
                    $lifetimeAfter = $lifetimeBefore + $diff;
                    $userUpdates['lifetime'] = $lifetimeAfter;
                }

                $freePlayBalanceBefore = $this->num($lockedUser['freeplayBalance'] ?? 0);
                $freePlayBalanceAfter = $freePlayBalanceBefore;
                if ($txType === 'deposit' && $diff > 0 && $applyDepositFreePlayBonus) {
                    $bonusConfig = $this->resolveDepositFreePlayBonus($lockedUser, $diff);
                    $freePlayBonusAmount = $bonusConfig['bonusAmount'];
                    $freePlayBonusPercent = $bonusConfig['percent'];
                    $freePlayBonusCap = $bonusConfig['cap'];
                    if ($freePlayBonusAmount > 0) {
                        $freePlayBalanceAfter = $freePlayBalanceBefore + $freePlayBonusAmount;
                        $userUpdates['freeplayBalance'] = $freePlayBalanceAfter;
                        $fpBonusDesc3 = 'Auto free play bonus ' . rtrim(rtrim(number_format($freePlayBonusPercent, 2, '.', ''), '0'), '.') . '% on deposit $' . number_format(abs($diff), 2, '.', '');
                        $referrerIdForDesc3 = trim((string) ($lockedUser['referredByUserId'] ?? ''));
                        if ($referrerIdForDesc3 !== '' && preg_match('/^[a-f0-9]{24}$/i', $referrerIdForDesc3) === 1) {
                            $referrerDoc3 = $this->db->findOne('users', ['_id' => MongoRepository::id($referrerIdForDesc3)], ['projection' => ['username' => 1]]);
                            if ($referrerDoc3 !== null && isset($referrerDoc3['username'])) {
                                $fpBonusDesc3 = 'Auto Freeplay bonus for referral ' . (string) $referrerDoc3['username'];
                            }
                        }
                        $freePlayTransactionDoc = [
                            'userId' => MongoRepository::id($id),
                            'agentId' => isset($lockedUser['agentId']) && preg_match('/^[a-f0-9]{24}$/i', (string) $lockedUser['agentId']) === 1
                                ? MongoRepository::id((string) $lockedUser['agentId'])
                                : null,
                            'adminId' => isset($actor['_id']) ? MongoRepository::id((string) $actor['_id']) : null,
                            'amount' => $freePlayBonusAmount,
                            'type' => 'adjustment',
                            'status' => 'completed',
                            'balanceBefore' => $freePlayBalanceBefore,
                            'balanceAfter' => $freePlayBalanceAfter,
                            'referenceType' => 'FreePlayBonus',
                            'reason' => 'DEPOSIT_FREEPLAY_BONUS',
                            'description' => $fpBonusDesc3,
                            'metadata' => [
                                'depositAmount' => round(abs($diff), 2),
                                'freePlayPercent' => $freePlayBonusPercent,
                                'maxFpCredit' => $freePlayBonusCap,
                            ],
                            'createdAt' => MongoRepository::nowUtc(),
                            'updatedAt' => MongoRepository::nowUtc(),
                        ];
                    }
                }
                $updatedFreeplayBalance = array_key_exists('freeplayBalance', $userUpdates)
                    ? $this->num($userUpdates['freeplayBalance'])
                    : $freePlayBalanceBefore;

                $transactionMetadata = null;
                if ($txType === 'deposit') {
                    $transactionMetadata = [
                        'applyDepositFreeplayBonus' => $applyDepositFreePlayBonus,
                    ];
                    if ($freePlayBonusAmount > 0) {
                        $transactionMetadata['depositFreeplayBonusAmount'] = $freePlayBonusAmount;
                        $transactionMetadata['freePlayPercent'] = $freePlayBonusPercent;
                        $transactionMetadata['maxFpCredit'] = $freePlayBonusCap;
                    } elseif (!$applyDepositFreePlayBonus) {
                        $transactionMetadata['depositFreeplayBonusSuppressed'] = true;
                    }
                }

                $transactionDoc = [
                    'userId' => MongoRepository::id($id),
                    'adminId' => MongoRepository::id((string) ($actor['_id'] ?? '')),
                    'amount' => abs($diff),
                    'type' => $txType,
                    'status' => 'completed',
                    'balanceBefore' => $balanceBefore,
                    'balanceAfter' => $nextBalance,
                    'referenceType' => 'Adjustment',
                    'reason' => $txReason,
                    'description' => $txDescription,
                    'createdAt' => MongoRepository::nowUtc(),
                    'updatedAt' => MongoRepository::nowUtc(),
                ];
                if (is_array($transactionMetadata)) {
                    $transactionDoc['metadata'] = $transactionMetadata;
                }

                if (is_array($lockedAgent)) {
                    $agentBalanceOut = round($agentBalance - $diff, 2);
                    $this->db->updateOne('agents', ['_id' => MongoRepository::id((string) $actor['_id'])], [
                        'balance' => $agentBalanceOut,
                        'updatedAt' => MongoRepository::nowUtc(),
                    ]);
                }

                $this->db->updateOne('users', ['_id' => MongoRepository::id($id)], $userUpdates);
                $transactionId = $this->db->insertOne('transactions', $transactionDoc);
                if (is_array($freePlayTransactionDoc)) {
                    $freePlayTransactionDoc['referenceId'] = MongoRepository::id($transactionId);
                    $freePlayMetadata = is_array($freePlayTransactionDoc['metadata'] ?? null)
                        ? $freePlayTransactionDoc['metadata']
                        : [];
                    $freePlayMetadata['sourceTransactionId'] = $transactionId;
                    $freePlayTransactionDoc['metadata'] = $freePlayMetadata;
                    $freePlayTransactionId = $this->db->insertOne('transactions', $freePlayTransactionDoc);
                }
                if ($txType === 'deposit' && $diff > 0 && $transactionId !== '') {
                    $referralBonusAward = $this->grantReferralBonusForFirstCompletedDeposit(
                        $lockedUser,
                        $transactionId,
                        $diff,
                        $actor
                    );
                }
                $this->db->commit();
                $pendingBalance = $this->num($lockedUser['pendingBalance'] ?? 0);
            } catch (Throwable $txErr) {
                $this->db->rollback();
                throw $txErr;
            }
            $this->invalidateHeaderSummaryCache();

            $resp = [
                'message' => 'User balance updated',
                'user' => [
                    'id' => $id,
                    'balance' => $nextBalance,
                    'pendingBalance' => $pendingBalance,
                    'availableBalance' => max(0, $nextBalance - $pendingBalance),
                    'freeplayBalance' => $updatedFreeplayBalance,
                    'lifetime' => $lifetimeAfter,
                    'lifetimePlusMinus' => $lifetimeAfter,
                ],
                'transaction' => [
                    'id' => $transactionId !== '' ? $transactionId : null,
                    'userId' => $id,
                    'type' => $txType,
                    'reason' => $txReason,
                    'description' => $txDescription,
                    'amount' => abs($diff),
                    'balanceBefore' => $balanceBefore,
                    'balanceAfter' => $nextBalance,
                ],
            ];
            if ($agentBalanceOut !== null) {
                $resp['agentBalance'] = $agentBalanceOut;
            }
            if ($freePlayBonusAmount > 0) {
                $resp['freeplayBonus'] = [
                    'amount' => $freePlayBonusAmount,
                    'percent' => $freePlayBonusPercent,
                    'maxFpCredit' => $freePlayBonusCap,
                    'transactionId' => $freePlayTransactionId !== '' ? $freePlayTransactionId : null,
                ];
            }
            if (is_array($referralBonusAward) && !empty($referralBonusAward['granted'])) {
                $resp['referralBonus'] = $referralBonusAward;
            }
            Response::json($resp);
        } catch (Throwable $e) {
            Response::json(['message' => 'Server error updating user balance', 'details' => $e->getMessage()], 500);
        }
    }

    private function resolveBalanceTransactionDirection(string $txType, string $txReason, string $requestedDirection): ?string
    {
        if ($txType === 'deposit') {
            return 'credit';
        }
        if ($txType === 'withdrawal') {
            return 'debit';
        }

        $direction = strtolower(trim($requestedDirection));
        if (in_array($direction, ['credit', 'debit'], true)) {
            return $direction;
        }

        $normalizedReason = strtoupper(trim($txReason));
        $creditReasons = [
            'ADMIN_CREDIT_ADJUSTMENT',
            'CASHIER_CREDIT_ADJUSTMENT',
            'ADMIN_PROMOTIONAL_CREDIT',
        ];
        $debitReasons = [
            'ADMIN_DEBIT_ADJUSTMENT',
            'CASHIER_DEBIT_ADJUSTMENT',
            'ADMIN_PROMOTIONAL_DEBIT',
        ];
        if (in_array($normalizedReason, $creditReasons, true)) {
            return 'credit';
        }
        if (in_array($normalizedReason, $debitReasons, true)) {
            return 'debit';
        }

        return null;
    }

    private function getUserStats(string $userId): void
    {
        try {
            $actor = $this->protect(['admin', 'agent', 'master_agent', 'super_agent']);
            if ($actor === null) {
                return;
            }

            $foundUser = $this->db->findOne('users', ['_id' => MongoRepository::id($userId)]);
            $role = 'user';
            if ($foundUser === null) {
                $foundUser = $this->db->findOne('agents', ['_id' => MongoRepository::id($userId)]);
                if ($foundUser !== null) {
                    $role = (string) ($foundUser['role'] ?? 'agent');
                }
            }
            if ($foundUser === null) {
                Response::json(['message' => 'User not found'], 404);
                return;
            }

            $creator = null;
            $createdBy = (string) ($foundUser['createdBy'] ?? '');
            $createdByModel = (string) ($foundUser['createdByModel'] ?? '');
            if ($createdBy !== '' && preg_match('/^[a-f0-9]{24}$/i', $createdBy) === 1) {
                if ($createdByModel === 'Admin') {
                    $admin = $this->db->findOne('admins', ['_id' => MongoRepository::id($createdBy)], ['projection' => ['username' => 1]]);
                    if ($admin !== null) {
                        $creator = ['username' => $admin['username'] ?? null, 'role' => 'Admin'];
                    }
                } elseif ($createdByModel === 'Agent') {
                    $agent = $this->db->findOne('agents', ['_id' => MongoRepository::id($createdBy)], ['projection' => ['username' => 1]]);
                    if ($agent !== null) {
                        $creator = ['username' => $agent['username'] ?? null, 'role' => 'Agent'];
                    }
                }
            }

            $agent = null;
            $masterAgent = null;
            $agentId = (string) ($foundUser['agentId'] ?? '');
            if ($agentId !== '' && preg_match('/^[a-f0-9]{24}$/i', $agentId) === 1) {
                $agentDoc = $this->db->findOne('agents', ['_id' => MongoRepository::id($agentId)], ['projection' => ['username' => 1, 'role' => 1, 'createdBy' => 1, 'createdByModel' => 1]]);
                if ($agentDoc !== null) {
                    $agentRole = (string) ($agentDoc['role'] ?? 'agent');
                    $agent = ['username' => $agentDoc['username'] ?? null, 'role' => $agentRole];
                    if (in_array($agentRole, ['master_agent', 'super_agent'], true)) {
                        $masterAgent = [
                            'id' => $agentId,
                            'username' => $agentDoc['username'] ?? null,
                            'role' => $agentRole,
                        ];
                    } else {
                        $parentAgentId = (string) ($agentDoc['createdBy'] ?? '');
                        $parentModel = (string) ($agentDoc['createdByModel'] ?? '');
                        if ($parentModel === 'Agent' && $parentAgentId !== '' && preg_match('/^[a-f0-9]{24}$/i', $parentAgentId) === 1) {
                            $masterDoc = $this->db->findOne('agents', ['_id' => MongoRepository::id($parentAgentId)], ['projection' => ['username' => 1, 'role' => 1]]);
                            if ($masterDoc !== null) {
                                $masterRole = (string) ($masterDoc['role'] ?? '');
                                if (in_array($masterRole, ['master_agent', 'super_agent'], true)) {
                                    $masterAgent = [
                                        'id' => $parentAgentId,
                                        'username' => $masterDoc['username'] ?? null,
                                        'role' => $masterRole,
                                    ];
                                }
                            }
                        }
                    }
                }
            }

            $referredBy = null;
            $referredByUserId = (string) ($foundUser['referredByUserId'] ?? '');
            if ($referredByUserId !== '' && preg_match('/^[a-f0-9]{24}$/i', $referredByUserId) === 1) {
                $ref = $this->db->findOne('users', ['_id' => MongoRepository::id($referredByUserId)], ['projection' => ['username' => 1, 'fullName' => 1, 'firstName' => 1, 'lastName' => 1]]);
                if ($ref !== null) {
                    $referredBy = [
                        'id' => (string) ($ref['_id'] ?? ''),
                        'username' => $ref['username'] ?? null,
                        'fullName' => $ref['fullName'] ?? null,
                        'firstName' => $ref['firstName'] ?? null,
                        'lastName' => $ref['lastName'] ?? null,
                    ];
                }
            }

            $referralStats = [
                'referredCount' => 0,
                'referralBonusGranted' => (bool) ($foundUser['referralBonusGranted'] ?? false),
                'referralBonusAmount' => (float) ($foundUser['referralBonusAmount'] ?? 0),
                'referralBonusGrantedAt' => $foundUser['referralBonusGrantedAt'] ?? null,
                'referralQualifiedDepositAt' => $foundUser['referralQualifiedDepositAt'] ?? null,
            ];
            if ($role === 'user') {
                $referralStats['referredCount'] = $this->db->countDocuments('users', ['referredByUserId' => MongoRepository::id($userId)]);
            }

            $bets = $this->db->findMany('bets', ['userId' => MongoRepository::id($userId)], ['projection' => ['amount' => 1, 'potentialPayout' => 1, 'status' => 1, 'createdAt' => 1]]);
            $casinoRounds = $this->db->findMany('casino_bets', ['userId' => $userId], ['projection' => ['totalWager' => 1, 'totalReturn' => 1, 'netResult' => 1, 'roundStatus' => 1, 'createdAt' => 1]]);
            $updateLastBetDate = static function (?string $current, mixed $candidate): ?string {
                $created = trim((string) $candidate);
                if ($created === '') {
                    return $current;
                }

                if ($current === null || strtotime($created) > strtotime($current)) {
                    return $created;
                }

                return $current;
            };
            $stats = [
                'totalBets' => 0,
                'totalWagered' => 0.0,
                'totalWon' => 0.0,
                'wins' => 0,
                'losses' => 0,
                'voids' => 0,
                'lastBetDate' => null,
                'sportsbook' => [
                    'totalBets' => 0,
                    'totalWagered' => 0.0,
                    'totalWon' => 0.0,
                    'wins' => 0,
                    'losses' => 0,
                    'voids' => 0,
                    'lastBetDate' => null,
                    'netProfit' => 0.0,
                ],
                'casino' => [
                    'totalBets' => 0,
                    'totalWagered' => 0.0,
                    'totalWon' => 0.0,
                    'wins' => 0,
                    'losses' => 0,
                    'voids' => 0,
                    'lastBetDate' => null,
                    'netProfit' => 0.0,
                ],
            ];
            foreach ($bets as $bet) {
                $stats['totalBets']++;
                $stats['sportsbook']['totalBets']++;

                $wager = $this->num($bet['amount'] ?? 0);
                $stats['totalWagered'] += $wager;
                $stats['sportsbook']['totalWagered'] += $wager;

                $status = (string) ($bet['status'] ?? '');
                if ($status === 'won') {
                    $won = $this->num($bet['potentialPayout'] ?? 0);
                    $stats['totalWon'] += $won;
                    $stats['sportsbook']['totalWon'] += $won;
                    $stats['wins']++;
                    $stats['sportsbook']['wins']++;
                } elseif ($status === 'lost') {
                    $stats['losses']++;
                    $stats['sportsbook']['losses']++;
                } elseif ($status === 'void') {
                    $stats['voids']++;
                    $stats['sportsbook']['voids']++;
                }
                $stats['lastBetDate'] = $updateLastBetDate($stats['lastBetDate'], $bet['createdAt'] ?? null);
                $stats['sportsbook']['lastBetDate'] = $updateLastBetDate($stats['sportsbook']['lastBetDate'], $bet['createdAt'] ?? null);
            }

            foreach ($casinoRounds as $round) {
                $wager = $this->num($round['totalWager'] ?? 0);
                $won = $this->num($round['totalReturn'] ?? 0);
                $netResult = $this->num($round['netResult'] ?? ($won - $wager));

                $stats['totalBets']++;
                $stats['casino']['totalBets']++;
                $stats['totalWagered'] += $wager;
                $stats['casino']['totalWagered'] += $wager;
                $stats['totalWon'] += $won;
                $stats['casino']['totalWon'] += $won;

                if (strtolower(trim((string) ($round['roundStatus'] ?? 'settled'))) === 'settled') {
                    if ($netResult > 0) {
                        $stats['wins']++;
                        $stats['casino']['wins']++;
                    } elseif ($netResult < 0) {
                        $stats['losses']++;
                        $stats['casino']['losses']++;
                    } else {
                        $stats['voids']++;
                        $stats['casino']['voids']++;
                    }
                }

                $stats['lastBetDate'] = $updateLastBetDate($stats['lastBetDate'], $round['createdAt'] ?? null);
                $stats['casino']['lastBetDate'] = $updateLastBetDate($stats['casino']['lastBetDate'], $round['createdAt'] ?? null);
            }

            $stats['sportsbook']['netProfit'] = $stats['sportsbook']['totalWon'] - $stats['sportsbook']['totalWagered'];
            $stats['casino']['netProfit'] = $stats['casino']['totalWon'] - $stats['casino']['totalWagered'];
            $stats['netProfit'] = $stats['totalWon'] - $stats['totalWagered'];

            Response::json([
                'user' => [
                    '_id' => (string) ($foundUser['_id'] ?? $userId),
                    'username' => $foundUser['username'] ?? null,
                    'displayPassword' => (($foundUser['displayPassword'] ?? '') !== '' ? strtoupper((string) $foundUser['displayPassword']) : (($foundUser['rawPassword'] ?? '') !== '' ? strtoupper((string) $foundUser['rawPassword']) : null)),
                    'firstName' => $foundUser['firstName'] ?? null,
                    'lastName' => $foundUser['lastName'] ?? null,
                    'fullName' => $foundUser['fullName'] ?? null,
                    'phoneNumber' => $foundUser['phoneNumber'] ?? null,
                    'status' => $foundUser['status'] ?? null,
                    'role' => $role,
                    'agentId' => $agentId !== '' ? $agentId : null,
                    'agentUsername' => $agent['username'] ?? null,
                    'masterAgentId' => $masterAgent['id'] ?? null,
                    'masterAgentUsername' => $masterAgent['username'] ?? null,
                    'balance' => $foundUser['balance'] ?? null,
                    'pendingBalance' => $foundUser['pendingBalance'] ?? 0,
                    'creditLimit' => $foundUser['creditLimit'] ?? null,
                    'balanceOwed' => $foundUser['balanceOwed'] ?? null,
                    'freeplayBalance' => $foundUser['freeplayBalance'] ?? null,
                    'minBet' => $foundUser['minBet'] ?? null,
                    'maxBet' => $foundUser['maxBet'] ?? null,
                    'lifetime' => $this->num($foundUser['lifetime'] ?? 0),
                    'lifetimePlusMinus' => $this->num($foundUser['lifetime'] ?? ($foundUser['lifetimePlusMinus'] ?? 0)),
                    'referredByUserId' => $referredByUserId !== '' ? $referredByUserId : null,
                    'defaultMinBet' => $foundUser['defaultMinBet'] ?? null,
                    'defaultMaxBet' => $foundUser['defaultMaxBet'] ?? null,
                    'defaultCreditLimit' => $foundUser['defaultCreditLimit'] ?? null,
                    'defaultSettleLimit' => $foundUser['defaultSettleLimit'] ?? null,
                    'wagerLimit' => $foundUser['wagerLimit'] ?? $foundUser['maxBet'] ?? null,
                    'settings' => is_array($foundUser['settings'] ?? null) ? $foundUser['settings'] : new stdClass(),
                    'apps' => is_array($foundUser['apps'] ?? null) ? $foundUser['apps'] : new stdClass(),
                    'createdAt' => $foundUser['createdAt'] ?? null,
                    // Commission fields
                    'agentPercent' => isset($foundUser['agentPercent']) ? (float) $foundUser['agentPercent'] : null,
                    'playerRate' => isset($foundUser['playerRate']) ? (float) $foundUser['playerRate'] : null,
                    'hiringAgentPercent' => isset($foundUser['hiringAgentPercent']) ? (float) $foundUser['hiringAgentPercent'] : null,
                    'subAgentPercent' => isset($foundUser['subAgentPercent']) ? (float) $foundUser['subAgentPercent'] : null,
                    'extraSubAgents' => isset($foundUser['extraSubAgents']) && is_array($foundUser['extraSubAgents']) ? $foundUser['extraSubAgents'] : [],
                    'createdByUsername' => $creator['username'] ?? null,
                    'parentAgentId' => $createdBy !== '' ? $createdBy : null,
                    'parentAgentModel' => $createdByModel !== '' ? $createdByModel : null,
                ],
                'creator' => $creator,
                'agent' => $agent,
                'referredBy' => $referredBy,
                'referralStats' => $referralStats,
                'stats' => $stats,
            ]);
        } catch (Throwable $e) {
            Response::json(['message' => 'Server error fetching user stats'], 500);
        }
    }

    private function getIpTracker(): void
    {
        try {
            $actor = $this->protect(['admin', 'agent', 'master_agent', 'super_agent']);
            if ($actor === null) {
                return;
            }
            if (!$this->hasAgentViewPermission($actor, 'ipTracker')) {
                Response::json(['message' => 'IP Tracker access denied by permissions'], 403);
                return;
            }

            $search = (string) ($_GET['search'] ?? '');
            $status = (string) ($_GET['status'] ?? '');
            $limit = isset($_GET['limit']) && is_numeric($_GET['limit']) ? (int) $_GET['limit'] : 200;
            $limit = min($limit, 500);

            $query = [];
            if ($status !== '' && $status !== 'all') {
                $query['status'] = $status;
            }

            $scopedUserIds = $this->getScopedIpUserIds($actor);
            if (is_array($scopedUserIds)) {
                $oids = [];
                foreach ($scopedUserIds as $id) {
                    if (preg_match('/^[a-f0-9]{24}$/i', $id) === 1) {
                        $oids[] = MongoRepository::id($id);
                    }
                }
                $query['userId'] = ['$in' => $oids];
            }

            if ($search !== '') {
                $searchUserIds = [];
                $users = $this->db->findMany('users', ['username' => ['$regex' => $search, '$options' => 'i']], ['projection' => ['_id' => 1]]);
                $agents = $this->db->findMany('agents', ['username' => ['$regex' => $search, '$options' => 'i']], ['projection' => ['_id' => 1]]);
                $admins = $this->db->findMany('admins', ['username' => ['$regex' => $search, '$options' => 'i']], ['projection' => ['_id' => 1]]);
                foreach (array_merge($users, $agents, $admins) as $doc) {
                    $sid = (string) ($doc['_id'] ?? '');
                    if ($sid === '') {
                        continue;
                    }
                    if (is_array($scopedUserIds) && !in_array($sid, $scopedUserIds, true)) {
                        continue;
                    }
                    $searchUserIds[] = MongoRepository::id($sid);
                }
                $query['$or'] = [
                    ['ip' => ['$regex' => $search, '$options' => 'i']],
                    ['userId' => ['$in' => $searchUserIds]],
                ];
            }

            $logs = $this->db->findMany('iplogs', $query, ['sort' => ['lastActive' => -1], 'limit' => $limit]);
            $ownerMap = $this->buildIpOwnerMap($logs);

            $formatted = [];
            foreach ($logs as $log) {
                $uid = (string) ($log['userId'] ?? '');
                $model = (string) ($log['userModel'] ?? 'User');
                $ownerKey = $model . ':' . $uid;
                $owner = $ownerMap[$ownerKey] ?? null;
                $formatted[] = [
                    'id' => (string) ($log['_id'] ?? ''),
                    'ip' => $log['ip'] ?? null,
                    'user' => $owner['username'] ?? 'Unknown',
                    'userId' => $uid !== '' ? $uid : null,
                    'country' => $log['country'] ?? 'Unknown',
                    'city' => $log['city'] ?? 'Unknown',
                    'lastActive' => $log['lastActive'] ?? null,
                    'status' => $log['status'] ?? null,
                    'userAgent' => $log['userAgent'] ?? null,
                    'userModel' => $model,
                    'phoneNumber' => $owner['phoneNumber'] ?? null,
                ];
            }

            Response::json(['logs' => $formatted]);
        } catch (Throwable $e) {
            Response::json(['message' => 'Server error fetching IP tracker'], 500);
        }
    }

    private function blockIp(string $id): void
    {
        $this->setIpStatus($id, 'blocked', 'IP blocked');
    }

    private function unblockIp(string $id): void
    {
        $this->setIpStatus($id, 'active', 'IP unblocked');
    }

    private function whitelistIp(string $id): void
    {
        $this->setIpStatus($id, 'whitelisted', 'IP whitelisted successfully');
    }

    private function setIpStatus(string $id, string $status, string $message): void
    {
        try {
            $actor = $this->protect(['admin', 'agent', 'master_agent', 'super_agent']);
            if ($actor === null) {
                return;
            }
            if (!$this->hasAgentViewPermission($actor, 'ipTracker')) {
                Response::json(['message' => 'IP Tracker access denied by permissions'], 403);
                return;
            }
            if (!$this->canManageIpTracker($actor)) {
                Response::json(['message' => 'IP action denied by permissions'], 403);
                return;
            }

            $log = $this->db->findOne('iplogs', ['_id' => MongoRepository::id($id)]);
            if ($log === null) {
                Response::json(['message' => 'IP record not found'], 404);
                return;
            }

            $scopedUserIds = $this->getScopedIpUserIds($actor);
            $logUserId = (string) ($log['userId'] ?? '');
            if (is_array($scopedUserIds) && !in_array($logUserId, $scopedUserIds, true)) {
                Response::json(['message' => 'Not authorized to manage this IP record'], 403);
                return;
            }

            $updates = [
                'status' => $status,
                'blockedAt' => null,
                'blockedBy' => null,
                'blockedByModel' => null,
                'blockReason' => null,
                'updatedAt' => MongoRepository::nowUtc(),
            ];
            if ($status === 'blocked') {
                $updates['blockedAt'] = MongoRepository::nowUtc();
                $updates['blockedBy'] = MongoRepository::id((string) ($actor['_id'] ?? ''));
                $updates['blockedByModel'] = $this->ownerModelForRole((string) ($actor['role'] ?? 'user'));
            }
            $this->db->updateOne('iplogs', ['_id' => MongoRepository::id($id)], $updates);
            Response::json(['message' => $message, 'id' => $id]);
        } catch (Throwable $e) {
            Response::json(['message' => 'Server error ' . strtolower(str_replace('IP ', '', $message))], 500);
        }
    }

    private function getAdminBets(): void
    {
        try {
            $actor = $this->protect(['admin', 'agent', 'master_agent', 'super_agent']);
            if ($actor === null) {
                return;
            }
            if (!$this->hasAgentViewPermission($actor, 'props')) {
                Response::json(['message' => 'Props / Betting access denied by permissions'], 403);
                return;
            }

            $agentQ = (string) ($_GET['agent'] ?? '');
            $customerQ = (string) ($_GET['customer'] ?? '');
            $typeQ = (string) ($_GET['type'] ?? '');
            $timeQ = (string) ($_GET['time'] ?? '');
            $statusQ = (string) ($_GET['status'] ?? '');
            $sportQ = trim((string) ($_GET['sport'] ?? ''));
            $eventQ = trim((string) ($_GET['event'] ?? ''));
            $marketQ = trim((string) ($_GET['market'] ?? ''));
            $limit = isset($_GET['limit']) && is_numeric($_GET['limit']) ? (int) $_GET['limit'] : 200;
            $limit = min($limit, 500);

            $scopedAgentIds = $this->getScopedAgentIdsForActor($actor);
            $filteredAgentIds = null;
            if ($agentQ !== '') {
                $matchedAgents = $this->db->findMany('agents', ['username' => ['$regex' => $agentQ, '$options' => 'i']], ['projection' => ['_id' => 1]]);
                $ids = [];
                foreach ($matchedAgents as $a) {
                    $aid = (string) ($a['_id'] ?? '');
                    if ($aid !== '') {
                        $ids[] = $aid;
                    }
                }
                if (is_array($scopedAgentIds)) {
                    $ids = array_values(array_filter($ids, static fn($id) => in_array($id, $scopedAgentIds, true)));
                }
                if (count($ids) === 0) {
                    Response::json(['bets' => [], 'totals' => ['risk' => 0, 'toWin' => 0]]);
                    return;
                }
                $filteredAgentIds = $ids;
            }

            $userQuery = ['role' => 'user'];
            if ($customerQ !== '') {
                $userQuery['username'] = ['$regex' => $customerQ, '$options' => 'i'];
            }
            if (is_array($scopedAgentIds)) {
                $oids = [];
                foreach ($scopedAgentIds as $aid) {
                    if (preg_match('/^[a-f0-9]{24}$/i', $aid) === 1) {
                        $oids[] = MongoRepository::id($aid);
                    }
                }
                $userQuery['agentId'] = ['$in' => $oids];
            }
            if (is_array($filteredAgentIds)) {
                $oids = [];
                foreach ($filteredAgentIds as $aid) {
                    if (preg_match('/^[a-f0-9]{24}$/i', $aid) === 1) {
                        $oids[] = MongoRepository::id($aid);
                    }
                }
                $userQuery['agentId'] = ['$in' => $oids];
            }

            $users = $this->db->findMany('users', $userQuery, ['projection' => ['_id' => 1, 'username' => 1, 'agentId' => 1]]);
            if (count($users) === 0) {
                Response::json(['bets' => [], 'totals' => ['risk' => 0, 'toWin' => 0]]);
                return;
            }
            $userIds = [];
            $userMap = [];
            foreach ($users as $u) {
                $uid = (string) ($u['_id'] ?? '');
                if ($uid === '') {
                    continue;
                }
                $userIds[] = MongoRepository::id($uid);
                $userMap[$uid] = $u;
            }

            $betQuery = ['userId' => ['$in' => $userIds]];
            if ($typeQ !== '' && $typeQ !== 'all-types') {
                $betQuery['type'] = $typeQ;
            }
            if ($statusQ !== '' && $statusQ !== 'all-statuses' && $statusQ !== 'all') {
                $betQuery['status'] = $statusQ;
            }
            $startDate = $this->getStartDateFromPeriod($timeQ);
            if ($startDate !== null) {
                $betQuery['createdAt'] = ['$gte' => MongoRepository::utcFromMillis($startDate->getTimestamp() * 1000)];
            }

            $bets = $this->db->findMany('bets', $betQuery, ['sort' => ['createdAt' => -1], 'limit' => $limit]);
            $selectionRowsByBetId = $this->loadSelectionRowsByBetId($bets);
            $matchMap = [];
            $agentMap = [];
            $formatted = [];
            $totalRisk = 0.0;
            $totalToWin = 0.0;

            foreach ($bets as $bet) {
                $betId = (string) ($bet['_id'] ?? '');
                if ($betId === '') {
                    continue;
                }

                $uid = (string) ($bet['userId'] ?? '');
                $user = $userMap[$uid] ?? null;
                $aid = (string) (($user['agentId'] ?? ''));

                if ($aid !== '' && !isset($agentMap[$aid]) && preg_match('/^[a-f0-9]{24}$/i', $aid) === 1) {
                    $agentMap[$aid] = $this->db->findOne('agents', ['_id' => MongoRepository::id($aid)], ['projection' => ['username' => 1]]);
                }

                $selectionRows = $selectionRowsByBetId[$betId] ?? [];
                $enrichedBet = SportsbookBetSupport::enrichBetForResponse($bet, $selectionRows);
                $matchIds = $this->matchIdsForBet($bet, $selectionRows);
                $primaryMatch = null;
                foreach ($matchIds as $mid) {
                    if (!isset($matchMap[$mid]) && preg_match('/^[a-f0-9]{24}$/i', $mid) === 1) {
                        $matchMap[$mid] = $this->db->findOne('matches', ['_id' => MongoRepository::id($mid)], ['projection' => ['homeTeam' => 1, 'awayTeam' => 1, 'sport' => 1, 'status' => 1]]);
                    }
                    if ($primaryMatch === null) {
                        $primaryMatch = $matchMap[$mid] ?? null;
                        if ($primaryMatch !== null) {
                            $primaryMatch['id'] = $mid;
                        }
                    }
                }

                $markets = [];
                foreach ($selectionRows as $row) {
                    $marketType = strtolower((string) ($row['marketType'] ?? ''));
                    if ($marketType !== '') {
                        $markets[$marketType] = true;
                    }
                }

                if ($sportQ !== '') {
                    $matchedSport = false;
                    foreach ($matchIds as $mid) {
                        $sportValue = strtolower((string) (($matchMap[$mid]['sport'] ?? '') ?: ''));
                        if ($sportValue === strtolower($sportQ)) {
                            $matchedSport = true;
                            break;
                        }
                    }
                    if (!$matchedSport) {
                        continue;
                    }
                }

                if ($eventQ !== '') {
                    $haystacks = [(string) ($enrichedBet['description'] ?? '')];
                    foreach ($matchIds as $mid) {
                        $home = (string) ($matchMap[$mid]['homeTeam'] ?? '');
                        $away = (string) ($matchMap[$mid]['awayTeam'] ?? '');
                        $haystacks[] = trim($home . ' vs ' . $away);
                    }
                    $matchedEvent = false;
                    foreach ($haystacks as $haystack) {
                        if ($haystack !== '' && stripos($haystack, $eventQ) !== false) {
                            $matchedEvent = true;
                            break;
                        }
                    }
                    if (!$matchedEvent) {
                        continue;
                    }
                }

                if ($marketQ !== '' && !isset($markets[strtolower($marketQ)])) {
                    continue;
                }

                $risk = SportsbookBetSupport::riskAmount($bet);
                $toWin = $this->num($bet['potentialPayout'] ?? 0);
                $totalRisk += $risk;
                $totalToWin += $toWin;

                $formatted[] = [
                    'id' => $betId,
                    'ticketId' => (string) ($enrichedBet['ticketId'] ?? $betId),
                    'requestId' => $bet['requestId'] ?? null,
                    'userId' => $uid !== '' ? $uid : null,
                    'username' => $user['username'] ?? null,
                    'customer' => $user['username'] ?? null,
                    'agent' => $agentMap[$aid]['username'] ?? 'direct',
                    'amount' => $risk,
                    'odds' => $this->num($enrichedBet['combinedOdds'] ?? ($enrichedBet['odds'] ?? 0)),
                    'combinedOdds' => $this->num($enrichedBet['combinedOdds'] ?? ($enrichedBet['odds'] ?? 0)),
                    'potentialPayout' => $toWin,
                    'type' => $bet['type'] ?? null,
                    'selection' => $bet['selection'] ?? null,
                    'status' => $bet['status'] ?? null,
                    'createdAt' => $bet['createdAt'] ?? null,
                    'accepted' => $bet['createdAt'] ?? null,
                    'description' => $enrichedBet['description'] ?? '',
                    'match' => $primaryMatch !== null ? [
                        'id' => $primaryMatch['id'] ?? null,
                        'homeTeam' => $primaryMatch['homeTeam'] ?? null,
                        'awayTeam' => $primaryMatch['awayTeam'] ?? null,
                        'sport' => $primaryMatch['sport'] ?? null,
                        'status' => $primaryMatch['status'] ?? null,
                    ] : null,
                    'markets' => array_keys($markets),
                    'selections' => $enrichedBet['selections'] ?? [],
                    'risk' => $risk,
                    'toWin' => $toWin,
                ];
            }

            Response::json(['bets' => $formatted, 'totals' => ['risk' => $totalRisk, 'toWin' => $totalToWin, 'count' => count($formatted)]]);
        } catch (Throwable $e) {
            Response::json(['message' => 'Server error fetching bets'], 500);
        }
    }

    private function createAdminBet(): void
    {
        try {
            $actor = $this->protect(['admin', 'agent', 'master_agent', 'super_agent']);
            if ($actor === null) {
                return;
            }
            if (!$this->hasAgentViewPermission($actor, 'props')) {
                Response::json(['message' => 'Props / Betting access denied by permissions'], 403);
                return;
            }
            if (($actor['role'] ?? '') !== 'admin') {
                $enterPerm = $actor['permissions']['enterBettingAdjustments'] ?? true;
                if ($enterPerm === false) {
                    Response::json(['message' => 'Bet creation denied by permissions'], 403);
                    return;
                }
            }

            $body = Http::jsonBody();
            $userId = (string) ($body['userId'] ?? '');
            $matchId = (string) ($body['matchId'] ?? '');
            $amount = $body['amount'] ?? null;
            $odds = $body['odds'] ?? null;
            $type = (string) ($body['type'] ?? '');
            $selection = (string) ($body['selection'] ?? '');

            if ($userId === '' || $matchId === '' || !is_numeric($amount) || !is_numeric($odds) || $type === '' || $selection === '') {
                Response::json(['message' => 'userId, matchId, amount, odds, type, and selection are required'], 400);
                return;
            }

            $status = strtolower(trim((string) ($body['status'] ?? 'pending')));
            if ($status !== '' && $status !== 'pending') {
                Response::json(['message' => 'Admin-created bets must start as pending'], 400);
                return;
            }

            $user = $this->db->findOne('users', ['_id' => MongoRepository::id($userId), 'role' => 'user']);
            if ($user === null) {
                Response::json(['message' => 'User not found'], 404);
                return;
            }

            if (($actor['role'] ?? '') === 'agent' && (string) ($user['agentId'] ?? '') !== (string) ($actor['_id'] ?? '')) {
                Response::json(['message' => 'You can only create bets for your own players'], 403);
                return;
            }
            if (in_array((string) ($actor['role'] ?? ''), ['master_agent', 'super_agent'], true)) {
                $subAgents = $this->db->findMany('agents', ['createdBy' => MongoRepository::id((string) $actor['_id']), 'createdByModel' => 'Agent'], ['projection' => ['_id' => 1]]);
                $allowed = [(string) $actor['_id']];
                foreach ($subAgents as $sa) {
                    $allowed[] = (string) ($sa['_id'] ?? '');
                }
                if (!in_array((string) ($user['agentId'] ?? ''), $allowed, true)) {
                    Response::json(['message' => 'You can only create bets within your hierarchy'], 403);
                    return;
                }
            }

            $match = $this->db->findOne('matches', ['_id' => MongoRepository::id($matchId)]);
            if ($match === null) {
                Response::json(['message' => 'Match not found'], 404);
                return;
            }

            $betAmount = (float) $amount;
            $betOdds = (float) $odds;
            if ($betAmount <= 0 || $betOdds <= 0) {
                Response::json(['message' => 'Amount and odds must be greater than 0'], 400);
                return;
            }

            $userMin = isset($user['minBet']) ? $this->num($user['minBet']) : null;
            $userMax = isset($user['maxBet']) ? $this->num($user['maxBet']) : null;
            if ($userMin !== null && $betAmount < $userMin) {
                Response::json(['message' => 'Minimum bet for this customer is ' . $userMin], 400);
                return;
            }
            if ($userMax !== null && $betAmount > $userMax) {
                Response::json(['message' => 'Maximum bet for this customer is ' . $userMax], 400);
                return;
            }

            $this->db->beginTransaction();
            try {
                $lockedUser = $this->db->findOneForUpdate('users', ['_id' => MongoRepository::id($userId)]);
                if ($lockedUser === null) {
                    $this->db->rollback();
                    Response::json(['message' => 'User not found'], 404);
                    return;
                }

                $balance = $this->num($lockedUser['balance'] ?? 0);
                $pendingBalance = $this->num($lockedUser['pendingBalance'] ?? 0);
                $available = max(0, $balance - $pendingBalance);
                if ($available < $betAmount) {
                    $this->db->rollback();
                    Response::json(['message' => 'Insufficient available balance for this customer'], 400);
                    return;
                }

                $potential = $betAmount * $betOdds;
                $now = MongoRepository::nowUtc();
                $normalizedType = strtolower(str_replace('-', '_', trim($type)));
                $marketType = in_array($normalizedType, ['straight', 'h2h', 'moneyline', 'ml'], true) ? 'h2h' : $normalizedType;
                $doc = [
                    'userId' => MongoRepository::id($userId),
                    'matchId' => MongoRepository::id($matchId),
                    'amount' => $betAmount,
                    'odds' => $betOdds,
                    'type' => $type,
                    'selection' => $selection,
                    'potentialPayout' => $potential,
                    'status' => 'pending',
                    'selections' => [[
                        'matchId' => MongoRepository::id($matchId),
                        'selection' => $selection,
                        'odds' => $betOdds,
                        'marketType' => $marketType,
                        'status' => 'pending',
                        'matchSnapshot' => $match,
                    ]],
                    'matchSnapshot' => $match,
                    'createdAt' => $now,
                    'updatedAt' => $now,
                ];

                $newBalance = $balance - $betAmount;
                $newPendingBalance = $pendingBalance + $betAmount;
                $this->db->updateOne('users', ['_id' => MongoRepository::id($userId)], [
                    'balance' => $newBalance,
                    'pendingBalance' => $newPendingBalance,
                    'updatedAt' => $now,
                ]);

                $id = $this->db->insertOne('bets', $doc);
                $bet = $this->db->findOne('bets', ['_id' => MongoRepository::id($id)]) ?? array_merge($doc, ['_id' => $id]);
                $this->db->insertOne('transactions', [
                    'userId' => MongoRepository::id($userId),
                    'amount' => $betAmount,
                    'type' => 'bet_placed_admin',
                    'status' => 'completed',
                    'balanceBefore' => $balance,
                    'balanceAfter' => $newBalance,
                    'referenceType' => 'Bet',
                    'referenceId' => MongoRepository::id($id),
                    'reason' => 'BET_PLACED_ADMIN',
                    'description' => 'Admin/TicketWriter placed pending bet',
                    'createdBy' => (string) ($actor['_id'] ?? ''),
                    'createdByRole' => (string) ($actor['role'] ?? ''),
                    'createdByUsername' => (string) ($actor['username'] ?? ''),
                    'createdAt' => $now,
                    'updatedAt' => $now,
                ]);
                $this->db->commit();
            } catch (Throwable $txe) {
                $this->db->rollback();
                throw $txe;
            }

            Response::json([
                'message' => 'Bet created',
                'bet' => [
                    'id' => (string) ($bet['_id'] ?? $id),
                    'userId' => (string) ($bet['userId'] ?? $userId),
                    'matchId' => (string) ($bet['matchId'] ?? $matchId),
                    'amount' => $this->num($bet['amount'] ?? $betAmount),
                    'odds' => $this->num($bet['odds'] ?? $betOdds),
                    'potentialPayout' => $this->num($bet['potentialPayout'] ?? $potential),
                    'type' => $bet['type'] ?? $type,
                    'selection' => $bet['selection'] ?? $selection,
                    'status' => $bet['status'] ?? 'pending',
                    'createdAt' => $bet['createdAt'] ?? null,
                ],
            ], 201);
        } catch (Throwable $e) {
            Response::json(['message' => 'Server error creating bet'], 500);
        }
    }

    private function deleteAdminBet(string $id): void
    {
        try {
            $actor = $this->protect(['admin', 'agent', 'master_agent', 'super_agent']);
            if ($actor === null) {
                return;
            }
            if (!$this->hasAgentViewPermission($actor, 'props')) {
                Response::json(['message' => 'Props / Betting access denied by permissions'], 403);
                return;
            }
            if (($actor['role'] ?? '') !== 'admin') {
                $delPerm = $actor['permissions']['deleteTransactions'] ?? true;
                if ($delPerm === false) {
                    Response::json(['message' => 'Bet deletion denied by permissions'], 403);
                    return;
                }
            }

            $this->db->beginTransaction();
            try {
                $bet = $this->db->findOneForUpdate('bets', ['_id' => MongoRepository::id($id)]);
                if ($bet === null) {
                    $this->db->rollback();
                    Response::json(['message' => 'Bet not found'], 404);
                    return;
                }
                if (($bet['status'] ?? '') !== 'pending') {
                    $this->db->rollback();
                    Response::json(['message' => 'Only pending bets can be deleted'], 400);
                    return;
                }

                $userId = (string) ($bet['userId'] ?? '');
                $user = $userId !== '' ? $this->db->findOne('users', ['_id' => MongoRepository::id($userId)], ['projection' => ['_id' => 1, 'agentId' => 1, 'username' => 1, 'balance' => 1, 'pendingBalance' => 1]]) : null;
                if ($user === null) {
                    $this->db->rollback();
                    Response::json(['message' => 'User not found for this bet'], 404);
                    return;
                }
                if (($actor['role'] ?? '') === 'agent' && (string) ($user['agentId'] ?? '') !== (string) ($actor['_id'] ?? '')) {
                    $this->db->rollback();
                    Response::json(['message' => 'You can only delete bets for your own players'], 403);
                    return;
                }
                if (in_array((string) ($actor['role'] ?? ''), ['master_agent', 'super_agent'], true)) {
                    $subAgents = $this->db->findMany('agents', ['createdBy' => MongoRepository::id((string) $actor['_id']), 'createdByModel' => 'Agent'], ['projection' => ['_id' => 1]]);
                    $allowed = [(string) $actor['_id']];
                    foreach ($subAgents as $sa) {
                        $allowed[] = (string) ($sa['_id'] ?? '');
                    }
                    if (!in_array((string) ($user['agentId'] ?? ''), $allowed, true)) {
                        $this->db->rollback();
                        Response::json(['message' => 'You can only delete bets within your hierarchy'], 403);
                        return;
                    }
                }

                $existingDeleted = $this->db->findOne('deletedwagers', ['betId' => MongoRepository::id($id), 'status' => 'deleted']);
                if ($existingDeleted !== null) {
                    $this->db->rollback();
                    Response::json(['message' => 'Bet deletion was already processed'], 409);
                    return;
                }

                $lockedUser = $this->db->findOneForUpdate('users', ['_id' => MongoRepository::id($userId)]);
                if ($lockedUser === null) {
                    $this->db->rollback();
                    Response::json(['message' => 'User not found for this bet'], 404);
                    return;
                }

                $stake = $this->num($bet['amount'] ?? 0);
                $balanceBefore = $this->num($lockedUser['balance'] ?? 0);
                $pendingBefore = $this->num($lockedUser['pendingBalance'] ?? 0);
                $balanceAfter = $balanceBefore + $stake;
                $pendingAfter = max(0, $pendingBefore - $stake);
                $now = MongoRepository::nowUtc();

                $this->db->updateOne('users', ['_id' => MongoRepository::id($userId)], [
                    'balance' => $balanceAfter,
                    'pendingBalance' => $pendingAfter,
                    'updatedAt' => $now,
                ]);

                $sport = 'Unknown';
                $matchId = (string) ($bet['matchId'] ?? '');
                if ($matchId !== '' && preg_match('/^[a-f0-9]{24}$/i', $matchId) === 1) {
                    $match = $this->db->findOne('matches', ['_id' => MongoRepository::id($matchId)], ['projection' => ['sport' => 1]]);
                    $sport = (string) ($match['sport'] ?? 'Unknown');
                }

                $this->db->insertOne('deletedwagers', [
                    'userId' => MongoRepository::id($userId),
                    'betId' => MongoRepository::id($id),
                    'amount' => $stake,
                    'sport' => $sport,
                    'reason' => trim('Deleted by ' . (string) ($actor['role'] ?? '') . ' ' . (string) ($actor['username'] ?? '')),
                    'status' => 'deleted',
                    'deletedAt' => $now,
                    'createdAt' => $now,
                    'updatedAt' => $now,
                ]);

                $this->db->insertOne('transactions', [
                    'userId' => MongoRepository::id($userId),
                    'amount' => $stake,
                    'type' => 'bet_void_admin',
                    'status' => 'completed',
                    'balanceBefore' => $balanceBefore,
                    'balanceAfter' => $balanceAfter,
                    'referenceType' => 'Bet',
                    'referenceId' => MongoRepository::id($id),
                    'reason' => 'BET_VOID_ADMIN',
                    'description' => 'Admin/TicketWriter voided pending bet',
                    'createdBy' => (string) ($actor['_id'] ?? ''),
                    'createdByRole' => (string) ($actor['role'] ?? ''),
                    'createdByUsername' => (string) ($actor['username'] ?? ''),
                    'createdAt' => $now,
                    'updatedAt' => $now,
                ]);

                $selectionRows = $this->db->findMany('betselections', ['betId' => MongoRepository::id($id)], ['projection' => ['_id' => 1]]);
                foreach ($selectionRows as $row) {
                    $selectionId = (string) ($row['_id'] ?? '');
                    if ($selectionId !== '') {
                        $this->db->deleteOne('betselections', ['_id' => MongoRepository::id($selectionId)]);
                    }
                }

                $this->db->deleteOne('bets', ['_id' => MongoRepository::id($id)]);
                $this->db->commit();
                Response::json(['message' => 'Bet deleted successfully', 'id' => $id]);
            } catch (Throwable $txe) {
                $this->db->rollback();
                throw $txe;
            }
        } catch (Throwable $e) {
            Response::json(['message' => 'Server error deleting bet'], 500);
        }
    }

    private function getAgentPerformance(): void
    {
        try {
            $actor = $this->protect(['admin', 'agent', 'master_agent', 'super_agent']);
            if ($actor === null) {
                return;
            }
            if (!$this->hasAgentViewPermission($actor, 'agentPerformance')) {
                Response::json(['message' => 'Agent Performance access denied by permissions'], 403);
                return;
            }

            $period = (string) ($_GET['period'] ?? '30d');
            $startDate = $this->getStartDateFromPeriod($period);
            $activeWindowStart = (new DateTimeImmutable('now'))->modify('-7 days');
            $scopedAgentIds = $this->getScopedAgentIdsForActor($actor);

            $agentQuery = [];
            if (is_array($scopedAgentIds)) {
                $oids = [];
                foreach ($scopedAgentIds as $aid) {
                    if (preg_match('/^[a-f0-9]{24}$/i', $aid) === 1) {
                        $oids[] = MongoRepository::id($aid);
                    }
                }
                $agentQuery['_id'] = ['$in' => $oids];
            }

            $agents = $this->db->findMany('agents', $agentQuery, ['projection' => ['username' => 1, 'status' => 1, 'createdAt' => 1, 'role' => 1]]);
            if (count($agents) === 0) {
                Response::json(['agents' => [], 'summary' => ['revenue' => 0, 'customers' => 0, 'avgWinRate' => 0, 'upAgents' => 0]]);
                return;
            }

            $agentIds = [];
            foreach ($agents as $a) {
                $aid = (string) ($a['_id'] ?? '');
                if ($aid !== '') {
                    $agentIds[] = MongoRepository::id($aid);
                }
            }
            $users = $this->db->findMany('users', ['role' => 'user', 'agentId' => ['$in' => $agentIds]], ['projection' => ['_id' => 1, 'agentId' => 1, 'createdAt' => 1]]);
            $userIds = [];
            $userToAgent = [];
            $agentToCustomers = [];
            foreach ($users as $u) {
                $uid = (string) ($u['_id'] ?? '');
                $aid = (string) ($u['agentId'] ?? '');
                if ($uid === '' || $aid === '') {
                    continue;
                }
                $userIds[] = MongoRepository::id($uid);
                $userToAgent[$uid] = $aid;
                if (!isset($agentToCustomers[$aid])) {
                    $agentToCustomers[$aid] = [];
                }
                $agentToCustomers[$aid][] = $uid;
            }

            $periodQuery = ['userId' => ['$in' => $userIds]];
            if ($startDate !== null) {
                $periodQuery['createdAt'] = ['$gte' => MongoRepository::utcFromMillis($startDate->getTimestamp() * 1000)];
            }
            $periodBets = count($userIds) > 0 ? $this->db->findMany('bets', $periodQuery, ['projection' => ['userId' => 1, 'amount' => 1, 'potentialPayout' => 1, 'status' => 1, 'createdAt' => 1]]) : [];
            $activeWindowBets = count($userIds) > 0 ? $this->db->findMany('bets', [
                'userId' => ['$in' => $userIds],
                'createdAt' => ['$gte' => MongoRepository::utcFromMillis($activeWindowStart->getTimestamp() * 1000)],
            ], ['projection' => ['userId' => 1]]) : [];

            $activeCountByUser = [];
            foreach ($activeWindowBets as $b) {
                $uid = (string) ($b['userId'] ?? '');
                if ($uid !== '') {
                    $activeCountByUser[$uid] = ($activeCountByUser[$uid] ?? 0) + 1;
                }
            }

            $activeCustomerByAgent = [];
            foreach ($users as $u) {
                $uid = (string) ($u['_id'] ?? '');
                $aid = (string) ($u['agentId'] ?? '');
                if ($uid === '' || $aid === '') {
                    continue;
                }
                if (($activeCountByUser[$uid] ?? 0) >= 1) {
                    if (!isset($activeCustomerByAgent[$aid])) {
                        $activeCustomerByAgent[$aid] = [];
                    }
                    $activeCustomerByAgent[$aid][$uid] = true;
                }
            }

            $agentStats = [];
            foreach ($periodBets as $bet) {
                $uid = (string) ($bet['userId'] ?? '');
                $aid = $userToAgent[$uid] ?? null;
                if ($aid === null) {
                    continue;
                }
                if (!isset($activeCustomerByAgent[$aid][$uid])) {
                    continue;
                }
                if (!isset($agentStats[$aid])) {
                    $agentStats[$aid] = ['wagered' => 0.0, 'payouts' => 0.0, 'wins' => 0, 'losses' => 0, 'pending' => 0, 'lastActive' => null];
                }
                $agentStats[$aid]['wagered'] += $this->num($bet['amount'] ?? 0);
                if (($bet['status'] ?? '') === 'won') {
                    $agentStats[$aid]['payouts'] += $this->num($bet['potentialPayout'] ?? 0);
                    $agentStats[$aid]['wins']++;
                } elseif (($bet['status'] ?? '') === 'lost') {
                    $agentStats[$aid]['losses']++;
                } elseif (($bet['status'] ?? '') === 'pending') {
                    $agentStats[$aid]['pending']++;
                }
                $createdAt = (string) ($bet['createdAt'] ?? '');
                if ($createdAt !== '' && (($agentStats[$aid]['lastActive'] ?? null) === null || strtotime($createdAt) > strtotime((string) $agentStats[$aid]['lastActive']))) {
                    $agentStats[$aid]['lastActive'] = $createdAt;
                }
            }

            $formattedAgents = [];
            $totalRevenue = 0.0;
            $totalCustomers = 0;
            $totalWinRate = 0.0;
            $upAgents = 0;
            foreach ($agents as $agent) {
                $aid = (string) ($agent['_id'] ?? '');
                $stat = $agentStats[$aid] ?? ['wagered' => 0.0, 'payouts' => 0.0, 'wins' => 0, 'losses' => 0, 'pending' => 0, 'lastActive' => null];
                $customerCount = isset($activeCustomerByAgent[$aid]) ? count($activeCustomerByAgent[$aid]) : 0;
                $totalCustomerCount = isset($agentToCustomers[$aid]) ? count($agentToCustomers[$aid]) : 0;
                $settled = $stat['wins'] + $stat['losses'];
                $winRate = $settled > 0 ? ($stat['wins'] / $settled) * 100 : 0;
                $revenue = $stat['wagered'] - $stat['payouts'];
                $trend = $winRate >= 52 ? 'up' : ($winRate <= 48 ? 'down' : 'stable');
                if ($trend === 'up') {
                    $upAgents++;
                }
                $tier = $revenue >= 15000 ? 'gold' : ($revenue >= 9000 ? 'silver' : 'bronze');

                $totalRevenue += $revenue;
                $totalCustomers += $customerCount;
                $totalWinRate += $winRate;

                $formattedAgents[] = [
                    'id' => $aid,
                    'name' => $agent['username'] ?? null,
                    'revenue' => $revenue,
                    'customers' => $customerCount,
                    'totalCustomers' => $totalCustomerCount,
                    'settledBets' => $settled,
                    'pendingBets' => $stat['pending'],
                    'winRate' => (float) number_format($winRate, 1, '.', ''),
                    'trend' => $trend,
                    'lastActive' => $stat['lastActive'] ?? ($agent['createdAt'] ?? null),
                    'tier' => $tier,
                ];
            }
            $avgWinRate = count($formattedAgents) > 0 ? $totalWinRate / count($formattedAgents) : 0;
            Response::json([
                'agents' => $formattedAgents,
                'summary' => [
                    'revenue' => $totalRevenue,
                    'customers' => $totalCustomers,
                    'avgWinRate' => (float) number_format($avgWinRate, 1, '.', ''),
                    'upAgents' => $upAgents,
                ],
            ]);
        } catch (Throwable $e) {
            Response::json(['message' => 'Server error fetching agent performance'], 500);
        }
    }

    private function getAgentPerformanceDetails(string $id): void
    {
        try {
            $actor = $this->protect(['admin', 'agent', 'master_agent', 'super_agent']);
            if ($actor === null) {
                return;
            }
            if (!$this->hasAgentViewPermission($actor, 'agentPerformance')) {
                Response::json(['message' => 'Agent Performance access denied by permissions'], 403);
                return;
            }

            $scoped = $this->getScopedAgentIdsForActor($actor);
            if (is_array($scoped) && !in_array($id, $scoped, true)) {
                Response::json(['message' => 'Not authorized to view this agent details'], 403);
                return;
            }

            $period = (string) ($_GET['period'] ?? '30d');
            $startDate = $this->getStartDateFromPeriod($period);
            $activeWindowStart = (new DateTimeImmutable('now'))->modify('-7 days');

            $agent = $this->db->findOne('agents', ['_id' => MongoRepository::id($id)], ['projection' => ['username' => 1, 'status' => 1, 'createdAt' => 1]]);
            if ($agent === null) {
                Response::json(['message' => 'Agent not found'], 404);
                return;
            }

            $users = $this->db->findMany('users', ['role' => 'user', 'agentId' => MongoRepository::id($id)], ['projection' => ['_id' => 1, 'username' => 1, 'createdAt' => 1]]);
            $userIds = [];
            $userMap = [];
            foreach ($users as $u) {
                $uid = (string) ($u['_id'] ?? '');
                if ($uid !== '') {
                    $userIds[] = MongoRepository::id($uid);
                    $userMap[$uid] = $u;
                }
            }

            $periodQuery = ['userId' => ['$in' => $userIds]];
            if ($startDate !== null) {
                $periodQuery['createdAt'] = ['$gte' => MongoRepository::utcFromMillis($startDate->getTimestamp() * 1000)];
            }
            $periodBets = count($userIds) > 0 ? $this->db->findMany('bets', $periodQuery, ['projection' => ['userId' => 1, 'amount' => 1, 'potentialPayout' => 1, 'status' => 1, 'createdAt' => 1, 'type' => 1, 'selection' => 1]]) : [];
            $activeWindowBets = count($userIds) > 0 ? $this->db->findMany('bets', ['userId' => ['$in' => $userIds], 'createdAt' => ['$gte' => MongoRepository::utcFromMillis($activeWindowStart->getTimestamp() * 1000)]], ['projection' => ['userId' => 1]]) : [];

            $activeUserIds = [];
            foreach ($activeWindowBets as $b) {
                $uid = (string) ($b['userId'] ?? '');
                if ($uid !== '') {
                    $activeUserIds[$uid] = true;
                }
            }

            $totalRisk = 0.0;
            $totalPayout = 0.0;
            $wins = 0;
            $losses = 0;
            $pending = 0;
            $lastBetAt = null;
            $topMap = [];
            $recentBets = [];

            foreach ($periodBets as $bet) {
                $uid = (string) ($bet['userId'] ?? '');
                if (!isset($activeUserIds[$uid])) {
                    continue;
                }
                $risk = $this->num($bet['amount'] ?? 0);
                $totalRisk += $risk;
                $status = (string) ($bet['status'] ?? '');
                if ($status === 'won') {
                    $totalPayout += $this->num($bet['potentialPayout'] ?? 0);
                    $wins++;
                } elseif ($status === 'lost') {
                    $losses++;
                } elseif ($status === 'pending') {
                    $pending++;
                }
                $createdAt = (string) ($bet['createdAt'] ?? '');
                if ($createdAt !== '' && ($lastBetAt === null || strtotime($createdAt) > strtotime((string) $lastBetAt))) {
                    $lastBetAt = $createdAt;
                }

                if (!isset($topMap[$uid])) {
                    $topMap[$uid] = ['userId' => $uid, 'bets' => 0, 'risk' => 0.0, 'wins' => 0, 'losses' => 0];
                }
                $topMap[$uid]['bets']++;
                $topMap[$uid]['risk'] += $risk;
                if ($status === 'won') {
                    $topMap[$uid]['wins']++;
                } elseif ($status === 'lost') {
                    $topMap[$uid]['losses']++;
                }

                $recentBets[] = [
                    'id' => (string) ($bet['_id'] ?? ''),
                    'customer' => $userMap[$uid]['username'] ?? 'Unknown',
                    'type' => $bet['type'] ?? null,
                    'selection' => $bet['selection'] ?? null,
                    'risk' => $risk,
                    'toWin' => $this->num($bet['potentialPayout'] ?? 0),
                    'status' => $status,
                    'accepted' => $createdAt !== '' ? $createdAt : null,
                ];
            }

            usort($recentBets, static fn($a, $b) => strtotime((string) ($b['accepted'] ?? '')) <=> strtotime((string) ($a['accepted'] ?? '')));
            $recentBets = array_slice($recentBets, 0, 10);

            $topRows = array_values($topMap);
            usort($topRows, static fn($a, $b) => ($b['risk'] <=> $a['risk']));
            $topRows = array_slice($topRows, 0, 5);
            $topCustomers = [];
            foreach ($topRows as $row) {
                $settled = $row['wins'] + $row['losses'];
                $topCustomers[] = [
                    'userId' => $row['userId'],
                    'username' => $userMap[$row['userId']]['username'] ?? 'Unknown',
                    'bets' => $row['bets'],
                    'risk' => $row['risk'],
                    'winRate' => $settled > 0 ? (float) number_format(($row['wins'] / $settled) * 100, 1, '.', '') : 0,
                ];
            }

            $settledBets = $wins + $losses;
            $winRate = $settledBets > 0 ? ($wins / $settledBets) * 100 : 0;
            $ggr = $totalRisk - $totalPayout;
            $holdPct = $totalRisk > 0 ? ($ggr / $totalRisk) * 100 : 0;
            $avgRisk = count($periodBets) > 0 ? $totalRisk / count($periodBets) : 0;
            $newCustomers = 0;
            if ($startDate !== null) {
                foreach ($users as $u) {
                    $created = (string) ($u['createdAt'] ?? '');
                    if ($created !== '' && strtotime($created) >= $startDate->getTimestamp()) {
                        $newCustomers++;
                    }
                }
            }

            Response::json([
                'agent' => [
                    'id' => $id,
                    'name' => $agent['username'] ?? null,
                    'status' => $agent['status'] ?? null,
                    'createdAt' => $agent['createdAt'] ?? null,
                ],
                'summary' => [
                    'period' => $period,
                    'totalCustomers' => count($users),
                    'activeCustomers' => count($activeUserIds),
                    'newCustomers' => $newCustomers,
                    'betsPlaced' => count($periodBets),
                    'settledBets' => $settledBets,
                    'pendingBets' => $pending,
                    'wins' => $wins,
                    'losses' => $losses,
                    'winRate' => (float) number_format($winRate, 1, '.', ''),
                    'totalRisk' => $totalRisk,
                    'totalPayout' => $totalPayout,
                    'ggr' => $ggr,
                    'holdPct' => (float) number_format($holdPct, 1, '.', ''),
                    'avgRisk' => (int) round($avgRisk),
                    'lastBetAt' => $lastBetAt,
                ],
                'topCustomers' => $topCustomers,
                'recentBets' => $recentBets,
            ]);
        } catch (Throwable $e) {
            Response::json(['message' => 'Server error fetching agent details'], 500);
        }
    }

    private function refreshOdds(): void
    {
        try {
            $actor = $this->protect(['admin']);
            if ($actor === null) {
                return;
            }
            $results = OddsSyncService::updateMatches($this->db, 'admin_refresh');
            Response::json(['message' => 'Odds refreshed successfully', 'results' => $results]);
        } catch (Throwable $e) {
            Response::json(['message' => $e->getMessage() ?: 'Server error refreshing odds'], 500);
        }
    }

    private function fetchOddsManual(): void
    {
        try {
            $actor = $this->protect(['admin']);
            if ($actor === null) {
                return;
            }
            $results = OddsSyncService::updateMatches($this->db, 'admin_manual');
            Response::json(['message' => 'Manual odds fetch completed', 'results' => $results]);
        } catch (Throwable $e) {
            Response::json(['message' => $e->getMessage() ?: 'Server error manual odds fetch'], 500);
        }
    }

    private function clearCache(): void
    {
        try {
            $actor = $this->protect(['admin']);
            if ($actor === null) {
                return;
            }
            $this->invalidateHeaderSummaryCache();
            Response::json(['message' => 'Cache cleared']);
        } catch (Throwable $e) {
            Response::json(['message' => 'Server error clearing cache'], 500);
        }
    }

    private function isPromotionalOrFreePlayTransaction(array $transaction): bool
    {
        $type = strtolower(trim((string) ($transaction['type'] ?? '')));
        if ($type === 'fp_deposit') {
            return true;
        }

        $reason = strtoupper(trim((string) ($transaction['reason'] ?? '')));
        if ($reason !== '' && (str_contains($reason, 'PROMOTIONAL') || str_contains($reason, 'FREEPLAY'))) {
            return true;
        }

        $description = strtolower(trim((string) ($transaction['description'] ?? '')));
        if ($description !== '' && (str_contains($description, 'promotional') || str_contains($description, 'freeplay') || str_contains($description, 'free play'))) {
            return true;
        }

        return false;
    }

    private function isWeeklyActiveTransaction(array $transaction): bool
    {
        $type = strtolower(trim((string) ($transaction['type'] ?? '')));
        if ($type === 'deposit' || $type === 'withdrawal') {
            return false;
        }

        if ($this->isPromotionalOrFreePlayTransaction($transaction)) {
            return false;
        }

        $entrySide = strtoupper(trim((string) ($transaction['entrySide'] ?? '')));
        if ($entrySide === 'CREDIT' || $entrySide === 'DEBIT') {
            return true;
        }

        if ($type === 'adjustment') {
            $beforeRaw = $transaction['balanceBefore'] ?? null;
            $afterRaw = $transaction['balanceAfter'] ?? null;
            if ($beforeRaw !== null && $afterRaw !== null && is_numeric($beforeRaw) && is_numeric($afterRaw)) {
                return abs(((float) $afterRaw) - ((float) $beforeRaw)) > 0.00001;
            }
            return true;
        }

        return in_array($type, [
            'bet_placed',
            'bet_placed_admin',
            'bet_won',
            'bet_refund',
            'bet_lost',
            'casino_bet_debit',
            'casino_bet_credit',
            'credit_adj',
            'debit_adj',
            'credit',
            'debit',
        ], true);
    }

    private function sumSignedTransactions(array $transactions): float
    {
        $sum = 0.0;
        foreach ($transactions as $tx) {
            $sum += $this->getSignedTransactionAmount($tx);
        }
        return $sum;
    }

    private function sumComprehensiveSignedTransactions(array $transactions): float
    {
        $sum = 0.0;
        foreach ($transactions as $tx) {
            $sum += $this->getComprehensiveSignedTransactionAmount($tx);
        }
        return $sum;
    }

    private function getComprehensiveSignedTransactionAmount(array $transaction): float
    {
        $amount = $this->num($transaction['amount'] ?? 0);
        $entrySide = strtoupper(trim((string) ($transaction['entrySide'] ?? '')));
        if ($entrySide === 'DEBIT') {
            return -$amount;
        }
        if ($entrySide === 'CREDIT') {
            return $amount;
        }

        $type = strtolower(trim((string) ($transaction['type'] ?? '')));
        if ($type === 'adjustment') {
            $beforeRaw = $transaction['balanceBefore'] ?? null;
            $afterRaw = $transaction['balanceAfter'] ?? null;
            if ($beforeRaw !== null && $afterRaw !== null && is_numeric($beforeRaw) && is_numeric($afterRaw)) {
                return ((float) $afterRaw) - ((float) $beforeRaw);
            }
        }

        return match ($type) {
            'deposit', 'bet_won', 'bet_refund', 'casino_bet_credit', 'fp_deposit', 'credit', 'credit_adj', 'promotional_credit' => $amount,
            'withdrawal', 'bet_placed', 'bet_placed_admin', 'casino_bet_debit', 'bet_lost', 'debit', 'debit_adj', 'promotional_debit' => -$amount,
            default => 0.0,
        };
    }

    private function getSignedTransactionAmount(array $transaction): float
    {
        $amount = $this->num($transaction['amount'] ?? 0);
        $entrySide = strtoupper(trim((string) ($transaction['entrySide'] ?? '')));
        if ($entrySide === 'DEBIT') {
            return -$amount;
        }
        if ($entrySide === 'CREDIT') {
            return $amount;
        }

        return match ((string) ($transaction['type'] ?? '')) {
            'deposit', 'bet_won', 'bet_refund', 'casino_bet_credit' => $amount,
            'withdrawal', 'bet_placed', 'casino_bet_debit' => -$amount,
            default => 0.0,
        };
    }

    /**
     * @return array{bonusAmount: float, percent: float, cap: float, depositAmount: float}
     */
    private function resolveDepositFreePlayBonus(array $user, float $depositAmount): array
    {
        $normalizedDeposit = round(max(0.0, $depositAmount), 2);
        if ($normalizedDeposit <= 0) {
            return [
                'bonusAmount' => 0.0,
                'percent' => 0.0,
                'cap' => 0.0,
                'depositAmount' => 0.0,
            ];
        }

        $settings = is_array($user['settings'] ?? null) ? $user['settings'] : [];
        $percentSource = $settings['freePlayPercent'] ?? ($user['freePlayPercent'] ?? null);
        $percent = round(max(0.0, $this->numOr($percentSource, 20.0)), 4);
        if ($percent <= 0) {
            return [
                'bonusAmount' => 0.0,
                'percent' => 0.0,
                'cap' => 0.0,
                'depositAmount' => $normalizedDeposit,
            ];
        }

        $rawBonus = round($normalizedDeposit * ($percent / 100), 2);
        if ($rawBonus <= 0) {
            return [
                'bonusAmount' => 0.0,
                'percent' => $percent,
                'cap' => 0.0,
                'depositAmount' => $normalizedDeposit,
            ];
        }

        $capSource = $settings['maxFpCredit'] ?? ($user['maxFpCredit'] ?? null);
        $capRaw = $this->numOr($capSource === null ? 0.0 : $capSource, 0.0);
        $cap = round(max(0.0, $capRaw), 2);
        $unlimited = ($capSource === null || $capRaw <= 0);
        $bonusAmount = (!$unlimited && $cap > 0) ? min($rawBonus, $cap) : $rawBonus;
        $bonusAmount = round(max(0.0, $bonusAmount), 2);

        return [
            'bonusAmount' => $bonusAmount,
            'percent' => $percent,
            'cap' => $cap,
            'depositAmount' => $normalizedDeposit,
        ];
    }

    private function countCompletedDepositTransactionsForUser(string $userId, ?string $excludeTransactionId = null): int
    {
        if ($userId === '' || preg_match('/^[a-f0-9]{24}$/i', $userId) !== 1) {
            return 0;
        }

        $filter = [
            'userId' => MongoRepository::id($userId),
            'type' => 'deposit',
            '$or' => [
                ['status' => 'completed'],
                ['status' => ''],
                ['status' => ['$exists' => false]],
            ],
        ];
        if ($excludeTransactionId !== null && preg_match('/^[a-f0-9]{24}$/i', $excludeTransactionId) === 1) {
            $filter['_id'] = ['$ne' => MongoRepository::id($excludeTransactionId)];
        }

        return $this->db->countDocuments('transactions', $filter);
    }

    /**
     * @param array<string, mixed> $referredUser
     * @param array<string, mixed>|null $actor
     * @return array{granted: bool, amount: float, referrerUserId: ?string, transactionId: ?string}
     */
    private function grantReferralBonusForFirstCompletedDeposit(
        array $referredUser,
        string $depositTransactionId,
        float $depositAmount,
        ?array $actor = null,
        mixed $now = null
    ): array {
        $referredUserId = trim((string) ($referredUser['_id'] ?? ''));
        $referrerUserId = trim((string) ($referredUser['referredByUserId'] ?? ''));
        $normalizedDepositAmount = round(max(0.0, $depositAmount), 2);
        if (
            $referredUserId === ''
            || preg_match('/^[a-f0-9]{24}$/i', $referredUserId) !== 1
            || $referrerUserId === ''
            || preg_match('/^[a-f0-9]{24}$/i', $referrerUserId) !== 1
            || preg_match('/^[a-f0-9]{24}$/i', $depositTransactionId) !== 1
            || $normalizedDepositAmount <= 0
        ) {
            return ['granted' => false, 'amount' => 0.0, 'referrerUserId' => null, 'transactionId' => null];
        }

        if ($this->countCompletedDepositTransactionsForUser($referredUserId, $depositTransactionId) > 0) {
            return ['granted' => false, 'amount' => 0.0, 'referrerUserId' => $referrerUserId, 'transactionId' => null];
        }

        $referrer = $this->db->findOneForUpdate('users', ['_id' => MongoRepository::id($referrerUserId)]);
        if (!$this->isPlayerLikeUserDocument($referrer) || (string) ($referrer['status'] ?? 'active') !== 'active') {
            return ['granted' => false, 'amount' => 0.0, 'referrerUserId' => $referrerUserId, 'transactionId' => null];
        }

        $awardTimestamp = $now ?? MongoRepository::nowUtc();
        $referralBonusAmount = 200.0;
        $freeplayBefore = $this->num($referrer['freeplayBalance'] ?? 0);
        $freeplayAfter = round($freeplayBefore + $referralBonusAmount, 2);

        $this->db->updateOne('users', ['_id' => MongoRepository::id($referrerUserId)], [
            'freeplayBalance' => $freeplayAfter,
            'updatedAt' => $awardTimestamp,
        ]);

        $referralTransactionId = $this->db->insertOne('transactions', [
            'userId' => MongoRepository::id($referrerUserId),
            'agentId' => isset($referrer['agentId']) && preg_match('/^[a-f0-9]{24}$/i', (string) $referrer['agentId']) === 1
                ? MongoRepository::id((string) $referrer['agentId'])
                : null,
            'adminId' => isset($actor['_id']) && preg_match('/^[a-f0-9]{24}$/i', (string) $actor['_id']) === 1
                ? MongoRepository::id((string) $actor['_id'])
                : null,
            'amount' => $referralBonusAmount,
            'type' => 'fp_deposit',
            'status' => 'completed',
            'isFreeplay' => true,
            'balanceBefore' => $freeplayBefore,
            'balanceAfter' => $freeplayAfter,
            'referenceType' => 'ReferralBonus',
            'referenceId' => MongoRepository::id($depositTransactionId),
            'reason' => 'REFERRAL_FREEPLAY_BONUS',
            'description' => 'Referral bonus from ' . (string) ($referredUser['username'] ?? 'user') . ' first deposit',
            'metadata' => [
                'depositAmount' => $normalizedDepositAmount,
                'sourceTransactionId' => $depositTransactionId,
                'sourceDepositTransactionId' => $depositTransactionId,
                'referredUserId' => $referredUserId,
                'referredUsername' => (string) ($referredUser['username'] ?? ''),
                'trigger' => 'first_completed_deposit',
            ],
            'createdAt' => $awardTimestamp,
            'updatedAt' => $awardTimestamp,
        ]);

        $this->db->updateOne('users', ['_id' => MongoRepository::id($referredUserId)], [
            'referralBonusGranted' => true,
            'referralBonusGrantedAt' => $awardTimestamp,
            'referralQualifiedDepositAt' => $awardTimestamp,
            'referralBonusAmount' => $referralBonusAmount,
            'referralBonusSourceDepositId' => $depositTransactionId,
            'updatedAt' => $awardTimestamp,
        ]);

        return [
            'granted' => true,
            'amount' => $referralBonusAmount,
            'referrerUserId' => $referrerUserId,
            'transactionId' => $referralTransactionId,
        ];
    }

    private function getStartDateFromPeriod(string $period): ?DateTimeImmutable
    {
        $now = new DateTimeImmutable('now');
        if ($period === '' || $period === 'all') {
            return null;
        }
        if ($period === 'today') {
            return new DateTimeImmutable('today');
        }
        if ($period === 'this-week' || $period === '7d') {
            return $now->modify('-7 days');
        }
        if ($period === 'this-month' || $period === '30d') {
            return $now->modify('-30 days');
        }
        return null;
    }

    private function normalizeDuplicateText(string $value): string
    {
        $trimmed = trim($value);
        if ($trimmed === '') {
            return '';
        }
        $collapsed = preg_replace('/\s+/', ' ', $trimmed);
        if (!is_string($collapsed)) {
            $collapsed = $trimmed;
        }
        return strtolower(trim($collapsed));
    }

    private function normalizeDuplicatePhone(string $value): string
    {
        $digits = preg_replace('/\D+/', '', $value);
        if (!is_string($digits) || $digits === '') {
            return '';
        }
        if (strlen($digits) > 10) {
            return substr($digits, -10);
        }
        return $digits;
    }

    private function normalizeDuplicateEmail(string $value): string
    {
        return $this->normalizeDuplicateText($value);
    }

    private function normalizeDuplicatePassword(string $value): string
    {
        return strtoupper(trim($value));
    }

    private function normalizedFullNameForDuplicate(array $payload): string
    {
        $fullName = $this->normalizeDuplicateText((string) ($payload['fullName'] ?? ''));
        if ($fullName !== '') {
            return $fullName;
        }

        $first = $this->normalizeDuplicateText((string) ($payload['firstName'] ?? ''));
        $last = $this->normalizeDuplicateText((string) ($payload['lastName'] ?? ''));
        return $this->normalizeDuplicateText(trim($first . ' ' . $last));
    }

    /**
     * @return array<int,array<string,mixed>>
     */
    private function findLikelyDuplicatePlayers(array $payload): array
    {
        $normalizedName = $this->normalizedFullNameForDuplicate($payload);
        $normalizedPhone = $this->normalizeDuplicatePhone((string) ($payload['phoneNumber'] ?? ''));
        $normalizedEmail = $this->normalizeDuplicateEmail((string) ($payload['email'] ?? ''));
        $normalizedPassword = $this->normalizeDuplicatePassword((string) ($payload['password'] ?? ''));

        if ($normalizedName === '' && $normalizedPhone === '' && $normalizedEmail === '' && $normalizedPassword === '') {
            return [];
        }

        $candidateQuery = ['role' => 'user'];
        $or = [];
        if ($normalizedPhone !== '') {
            $digits = preg_split('//', $normalizedPhone, -1, PREG_SPLIT_NO_EMPTY);
            $digitPattern = implode('\D*', $digits ?: []);
            if ($digitPattern !== '') {
                $or[] = ['phoneNumber' => ['$regex' => $digitPattern, '$options' => 'i']];
            }
        }
        if ($normalizedEmail !== '') {
            $or[] = ['email' => ['$regex' => '^' . preg_quote($normalizedEmail, '/') . '$', '$options' => 'i']];
        }
        if ($normalizedName !== '') {
            $namePattern = '^' . str_replace('\ ', '\s+', preg_quote($normalizedName, '/')) . '$';
            $or[] = ['fullName' => ['$regex' => $namePattern, '$options' => 'i']];
        }
        if ($normalizedPassword !== '') {
            $or[] = ['displayPassword' => ['$regex' => '^' . preg_quote($normalizedPassword, '/') . '$', '$options' => 'i']];
        }
        if (count($or) > 0) {
            $candidateQuery['$or'] = $or;
        }

        $candidates = $this->db->findMany('users', $candidateQuery, [
            'projection' => [
                '_id' => 1,
                'username' => 1,
                'firstName' => 1,
                'lastName' => 1,
                'fullName' => 1,
                'phoneNumber' => 1,
                'email' => 1,
                'displayPassword' => 1,
                'agentId' => 1,
                'status' => 1,
            ],
            'sort' => ['createdAt' => -1],
        ]);

        if (count($candidates) === 0) {
            return [];
        }

        $agentIds = [];
        foreach ($candidates as $candidate) {
            $agentId = (string) ($candidate['agentId'] ?? '');
            if ($agentId !== '' && preg_match('/^[a-f0-9]{24}$/i', $agentId) === 1) {
                $agentIds[$agentId] = true;
            }
        }
        $agentMap = [];
        if (count($agentIds) > 0) {
            $agentDocs = $this->db->findMany('agents', [
                '_id' => ['$in' => array_map(static fn (string $id): string => MongoRepository::id($id), array_keys($agentIds))],
            ], ['projection' => ['_id' => 1, 'username' => 1]]);
            foreach ($agentDocs as $agentDoc) {
                $agentDocId = (string) ($agentDoc['_id'] ?? '');
                if ($agentDocId !== '') {
                    $agentMap[$agentDocId] = strtoupper(trim((string) ($agentDoc['username'] ?? '')));
                }
            }
        }

        $matches = [];
        foreach ($candidates as $candidate) {
            $existingName = $this->normalizedFullNameForDuplicate($candidate);
            $existingPhone = $this->normalizeDuplicatePhone((string) ($candidate['phoneNumber'] ?? ''));
            $existingEmail = $this->normalizeDuplicateEmail((string) ($candidate['email'] ?? ''));
            $existingPassword = $this->normalizeDuplicatePassword((string) ($candidate['displayPassword'] ?? ''));

            $matchedByPhone = $normalizedPhone !== '' && $existingPhone !== '' && $normalizedPhone === $existingPhone;
            $matchedByEmail = $normalizedEmail !== '' && $existingEmail !== '' && $normalizedEmail === $existingEmail;
            $matchedByName = $normalizedName !== '' && $existingName !== '' && $normalizedName === $existingName;
            $matchedByPassword = $normalizedPassword !== '' && $existingPassword !== '' && $normalizedPassword === $existingPassword;

            if (!$matchedByPhone && !$matchedByEmail && !$matchedByName && !$matchedByPassword) {
                continue;
            }

            $inputHasContact = $normalizedPhone !== '' || $normalizedEmail !== '';
            $existingHasContact = $existingPhone !== '' || $existingEmail !== '';
            if (!$matchedByPhone && !$matchedByEmail && !$matchedByPassword && $matchedByName && $inputHasContact && $existingHasContact) {
                continue;
            }

            $reasonList = [];
            if ($matchedByPhone) {
                $reasonList[] = 'phone';
            }
            if ($matchedByEmail) {
                $reasonList[] = 'email';
            }
            if ($matchedByName) {
                $reasonList[] = 'name';
            }
            if ($matchedByPassword) {
                $reasonList[] = 'password';
            }

            $groupKeySource = $matchedByPhone
                ? 'phone:' . $existingPhone
                : ($matchedByEmail ? 'email:' . $existingEmail : ($matchedByPassword ? 'password' : 'name:' . $existingName));

            $candidateId = (string) ($candidate['_id'] ?? '');
            $displayFullName = trim((string) ($candidate['fullName'] ?? ''));
            if ($displayFullName === '') {
                $displayFullName = trim((string) ($candidate['firstName'] ?? '') . ' ' . (string) ($candidate['lastName'] ?? ''));
            }
            $agentId = (string) ($candidate['agentId'] ?? '');
            if ($agentId === '' || preg_match('/^[a-f0-9]{24}$/i', $agentId) !== 1) {
                $agentId = '';
            }

            $matches[] = [
                'id' => $candidateId,
                'username' => strtoupper(trim((string) ($candidate['username'] ?? ''))),
                'fullName' => $displayFullName !== '' ? strtoupper($displayFullName) : null,
                'phoneNumber' => trim((string) ($candidate['phoneNumber'] ?? '')) ?: null,
                'email' => trim((string) ($candidate['email'] ?? '')) ?: null,
                'status' => (string) ($candidate['status'] ?? ''),
                'agentId' => $agentId !== '' ? $agentId : null,
                'agentUsername' => $agentId !== '' ? ($agentMap[$agentId] ?? null) : null,
                'matchReasons' => $reasonList,
                'duplicateGroupKey' => $groupKeySource,
            ];
        }

        usort($matches, static function (array $a, array $b): int {
            return strcasecmp((string) ($a['username'] ?? ''), (string) ($b['username'] ?? ''));
        });

        return $matches;
    }

    /**
     * @param array<int,array<string,mixed>> $matches
     */
    private function buildDuplicatePlayerResponse(string $firstName, string $lastName, string $fullName, string $phoneNumber, string $email, array $matches): array
    {
        $normalizedName = $this->normalizeDuplicateText($fullName);
        if ($normalizedName === '') {
            $normalizedName = $this->normalizeDuplicateText(trim($firstName . ' ' . $lastName));
        }
        $normalizedPhone = $this->normalizeDuplicatePhone($phoneNumber);
        $normalizedEmail = $this->normalizeDuplicateEmail($email);

        return [
            'duplicate' => true,
            'code' => 'DUPLICATE_PLAYER',
            'message' => 'Likely duplicate player detected. Review existing accounts before creating a new one.',
            'matchCount' => count($matches),
            'normalized' => [
                'name' => $normalizedName !== '' ? $normalizedName : null,
                'phone' => $normalizedPhone !== '' ? $normalizedPhone : null,
                'email' => $normalizedEmail !== '' ? $normalizedEmail : null,
            ],
            'matches' => $matches,
        ];
    }

    private function existsUsernameOrPhone(string $username, string $phoneNumber): bool
    {
        $normalizedUsername = trim($username);
        $or = [['phoneNumber' => $phoneNumber]];
        if ($normalizedUsername !== '') {
            $or[] = ['username' => strtoupper($normalizedUsername)];
            $or[] = ['username' => strtolower($normalizedUsername)];
            $or[] = ['username' => ['$regex' => '^' . preg_quote($normalizedUsername, '/') . '$', '$options' => 'i']];
        }
        $query = ['$or' => $or];
        return $this->db->findOne('users', $query) !== null
            || $this->db->findOne('admins', $query) !== null
            || $this->db->findOne('agents', $query) !== null;
    }

    private function findExistingAgentByIdentity(string $username, string $phoneNumber): ?array
    {
        $normalizedUsername = trim($username);
        $or = [];

        if ($phoneNumber !== '') {
            $or[] = ['phoneNumber' => $phoneNumber];
        }
        if ($normalizedUsername !== '') {
            $or[] = ['username' => strtoupper($normalizedUsername)];
            $or[] = ['username' => strtolower($normalizedUsername)];
            $or[] = ['username' => ['$regex' => '^' . preg_quote($normalizedUsername, '/') . '$', '$options' => 'i']];
        }
        if (count($or) === 0) {
            return null;
        }

        return $this->db->findOne('agents', ['$or' => $or]);
    }

    private function generateIdentityPassword(string $firstName, string $lastName, string $phoneNumber, string $fallbackUsername = ''): string
    {
        $cleanFirst = preg_replace('/[^A-Z0-9]/', '', strtoupper(trim($firstName)));
        $cleanLast = preg_replace('/[^A-Z0-9]/', '', strtoupper(trim($lastName)));
        $digits = preg_replace('/\D+/', '', $phoneNumber);

        if (!is_string($digits) || $digits === '') {
            return '';
        }

        $last4 = substr($digits, -4);
        if ($last4 === '') {
            return '';
        }

        if (is_string($cleanFirst) && $cleanFirst !== '' && is_string($cleanLast) && $cleanLast !== '') {
            return strtoupper(substr($cleanFirst, 0, 3) . substr($cleanLast, 0, 3) . $last4);
        }

        $fallback = preg_replace('/[^A-Z0-9]/', '', strtoupper(trim($fallbackUsername)));
        if (is_string($fallback) && $fallback !== '') {
            return strtoupper(substr($fallback, 0, 6) . $last4);
        }

        return '';
    }

    private function passwordFields(string $plain): array
    {
        $legacyHash = password_hash($plain, PASSWORD_BCRYPT);
        $caseInsensitiveHash = password_hash(strtolower($plain), PASSWORD_BCRYPT);

        return [
            'password' => is_string($legacyHash) ? $legacyHash : '',
            'passwordCaseInsensitiveHash' => is_string($caseInsensitiveHash) ? $caseInsensitiveHash : '',
        ];
    }

    private function numOr(mixed $value, float $fallback): float
    {
        if ($value === null) {
            return $fallback;
        }
        if (is_numeric($value)) {
            return (float) $value;
        }
        if (is_string($value)) {
            $normalized = trim($value);
            if ($normalized === '') {
                return $fallback;
            }
            // Allow spreadsheet formats like "1,000", "$1,250.50", and "(500)".
            $normalized = str_replace([',', '$', ' '], '', $normalized);
            if (preg_match('/^\((.+)\)$/', $normalized, $m) === 1) {
                $normalized = '-' . $m[1];
            }
            if (is_numeric($normalized)) {
                return (float) $normalized;
            }
        }
        return $fallback;
    }

    private function parseImportNumberOrNull(mixed $value): ?float
    {
        if ($value === null) {
            return null;
        }
        if (is_numeric($value)) {
            return (float) $value;
        }
        if (is_string($value)) {
            $normalized = trim($value);
            if ($normalized === '') {
                return null;
            }
            $normalized = str_replace([',', '$', ' '], '', $normalized);
            if (preg_match('/^\((.+)\)$/', $normalized, $m) === 1) {
                $normalized = '-' . $m[1];
            }
            if (is_numeric($normalized)) {
                return (float) $normalized;
            }
        }
        return null;
    }

    private function toTimestampSeconds(mixed $value): ?int
    {
        if ($value instanceof \DateTimeInterface) {
            return $value->getTimestamp();
        }
        if (is_numeric($value)) {
            $num = (float) $value;
            if ($num > 1000000000000) {
                return (int) floor($num / 1000);
            }
            return (int) $num;
        }
        if (is_string($value) && trim($value) !== '') {
            $ts = strtotime($value);
            return $ts === false ? null : $ts;
        }
        if (is_array($value) && isset($value['$date'])) {
            return $this->toTimestampSeconds($value['$date']);
        }
        return null;
    }

    private function hasAgentViewPermission(array $user, string $key): bool
    {
        if (($user['role'] ?? '') === 'admin') {
            return true;
        }
        $views = is_array($user['permissions']['views'] ?? null) ? $user['permissions']['views'] : [];
        return ($views[$key] ?? true) !== false;
    }

    private function canManageIpTracker(array $user): bool
    {
        if (($user['role'] ?? '') === 'admin') {
            return true;
        }
        $ipPerm = is_array($user['permissions']['ipTracker'] ?? null) ? $user['permissions']['ipTracker'] : [];
        return ($ipPerm['manage'] ?? true) !== false;
    }

    private function getScopedIpUserIds(array $user): ?array
    {
        $role = (string) ($user['role'] ?? '');
        $selfId = (string) ($user['_id'] ?? '');
        if ($role === 'admin') {
            return null;
        }
        if ($role === 'agent') {
            $players = $this->db->findMany('users', ['agentId' => MongoRepository::id($selfId)], ['projection' => ['_id' => 1]]);
            $ids = [$selfId];
            foreach ($players as $p) {
                $ids[] = (string) ($p['_id'] ?? '');
            }
            return array_values(array_filter($ids));
        }
        if ($role === 'master_agent' || $role === 'super_agent') {
            $subAgents = $this->db->findMany('agents', ['createdBy' => MongoRepository::id($selfId), 'createdByModel' => 'Agent'], ['projection' => ['_id' => 1]]);
            $agentIds = [$selfId];
            foreach ($subAgents as $a) {
                $agentIds[] = (string) ($a['_id'] ?? '');
            }
            $agentOids = [];
            foreach ($agentIds as $aid) {
                if ($aid !== '' && preg_match('/^[a-f0-9]{24}$/i', $aid) === 1) {
                    $agentOids[] = MongoRepository::id($aid);
                }
            }
            $players = count($agentOids) > 0
                ? $this->db->findMany('users', ['agentId' => ['$in' => $agentOids]], ['projection' => ['_id' => 1]])
                : [];
            $ids = $agentIds;
            foreach ($players as $p) {
                $ids[] = (string) ($p['_id'] ?? '');
            }
            return array_values(array_filter($ids));
        }
        return [$selfId];
    }

    private function buildIpOwnerMap(array $logs): array
    {
        $userIds = [];
        $agentIds = [];
        $adminIds = [];
        foreach ($logs as $log) {
            $ownerId = (string) ($log['userId'] ?? '');
            if ($ownerId === '' || preg_match('/^[a-f0-9]{24}$/i', $ownerId) !== 1) {
                continue;
            }
            $model = (string) ($log['userModel'] ?? 'User');
            if ($model === 'Admin') {
                $adminIds[] = MongoRepository::id($ownerId);
            } elseif ($model === 'Agent') {
                $agentIds[] = MongoRepository::id($ownerId);
            } else {
                $userIds[] = MongoRepository::id($ownerId);
            }
        }

        $map = [];
        $users = count($userIds) > 0 ? $this->db->findMany('users', ['_id' => ['$in' => $userIds]], ['projection' => ['_id' => 1, 'username' => 1, 'phoneNumber' => 1]]) : [];
        foreach ($users as $u) {
            $map['User:' . (string) ($u['_id'] ?? '')] = $u;
        }
        $agents = count($agentIds) > 0 ? $this->db->findMany('agents', ['_id' => ['$in' => $agentIds]], ['projection' => ['_id' => 1, 'username' => 1, 'phoneNumber' => 1]]) : [];
        foreach ($agents as $a) {
            $map['Agent:' . (string) ($a['_id'] ?? '')] = $a;
        }
        $admins = count($adminIds) > 0 ? $this->db->findMany('admins', ['_id' => ['$in' => $adminIds]], ['projection' => ['_id' => 1, 'username' => 1, 'phoneNumber' => 1]]) : [];
        foreach ($admins as $a) {
            $map['Admin:' . (string) ($a['_id'] ?? '')] = $a;
        }
        return $map;
    }

    private function ownerModelForRole(string $role): string
    {
        if ($role === 'admin') {
            return 'Admin';
        }
        if (in_array($role, ['agent', 'master_agent', 'super_agent'], true)) {
            return 'Agent';
        }
        return 'User';
    }

    private function getScopedAgentIdsForActor(array $actor): ?array
    {
        $role = (string) ($actor['role'] ?? '');
        if ($role === 'admin') {
            return null;
        }
        if ($role === 'agent') {
            return [(string) ($actor['_id'] ?? '')];
        }
        if ($role === 'master_agent' || $role === 'super_agent') {
            $subAgents = $this->db->findMany('agents', ['createdBy' => MongoRepository::id((string) ($actor['_id'] ?? '')), 'createdByModel' => 'Agent'], ['projection' => ['_id' => 1]]);
            $ids = [(string) ($actor['_id'] ?? '')];
            foreach ($subAgents as $a) {
                $ids[] = (string) ($a['_id'] ?? '');
            }
            return array_values(array_filter($ids));
        }
        return [];
    }

    private function startOfWeek(DateTimeImmutable $date): DateTimeImmutable
    {
        $weekday = (int) $date->format('N'); // 1..7, Monday=1
        // Business week: Tuesday 00:00 through Monday 23:59:59.
        $daysFromTuesday = ($weekday + 5) % 7;
        return $date->setTime(0, 0, 0)->modify('-' . $daysFromTuesday . ' days');
    }

    /**
     * @param array<int, array<string, mixed>> $existingNodes
     * @return array<string, mixed>|null
     */
    private function buildUsernameLinkedAgentTreeNode(string $parentUsername, array $existingNodes): ?array
    {
        $normalizedParent = strtoupper(trim($parentUsername));
        if ($normalizedParent === '' || !str_ends_with($normalizedParent, 'MA')) {
            return null;
        }

        $linkedUsername = substr($normalizedParent, 0, -2);
        if ($linkedUsername === '') {
            return null;
        }

        $existingIds = [];
        foreach ($existingNodes as $node) {
            $nodeId = (string) ($node['id'] ?? '');
            if ($nodeId !== '') {
                $existingIds[$nodeId] = true;
            }
        }

        $agent = $this->db->findOne('agents', ['username' => $linkedUsername]);
        if ($agent === null) {
            return null;
        }

        $agentId = (string) ($agent['_id'] ?? '');
        $agentRole = strtolower((string) ($agent['role'] ?? ''));
        if ($agentId === '' || isset($existingIds[$agentId]) || !in_array($agentRole, ['agent', 'master_agent', 'super_agent'], true)) {
            return null;
        }

        return $this->formatAgentTreeAgentNode($agent);
    }

    /**
     * @param array<string, mixed> $agent
     * @return array<string, mixed>
     */
    private function formatAgentTreeAgentNode(array $agent): array
    {
        $agentId = (string) ($agent['_id'] ?? '');
        $username = (string) ($agent['username'] ?? '');

        return [
            'id' => $agentId,
            'username' => $username,
            'role' => $agent['role'] ?? null,
            'nodeType' => 'agent',
            'isDead' => strtoupper($username) === 'DEAD',
            'agentPercent' => isset($agent['agentPercent']) ? (float) $agent['agentPercent'] : null,
            'playerRate' => isset($agent['playerRate']) ? (float) $agent['playerRate'] : null,
            'children' => $this->buildAgentTree($agentId, 'Agent'),
        ];
    }

    // ─── Commission Chain ─────────────────────────────────────────────────────

    /**
     * Walk up the parent chain from a given agent, returning an ordered array
     * [leaf → … → root] each entry: {id, username, role, agentPercent, parentAgentId}.
     * Stops after $maxDepth steps to prevent infinite loops from bad data.
     */
    private function buildUplineChain(string $agentId, int $maxDepth = 15): array
    {
        $chain = [];
        $visited = [];
        $currentId = $agentId;
        $collection = 'agents';

        for ($depth = 0; $depth < $maxDepth; $depth++) {
            if ($currentId === '' || isset($visited[$currentId])) {
                break; // circular reference guard
            }
            $visited[$currentId] = true;

            $doc = $this->db->findOne($collection, ['_id' => MongoRepository::id($currentId)]);
            if ($doc === null) {
                break;
            }

            $chain[] = [
                'id'            => (string) ($doc['_id'] ?? $currentId),
                'username'      => $doc['username'] ?? null,
                'role'          => $doc['role'] ?? null,
                'agentPercent'  => isset($doc['agentPercent']) ? (float) $doc['agentPercent'] : null,
                'playerRate'    => isset($doc['playerRate']) ? (float) $doc['playerRate'] : null,
                'parentAgentId' => isset($doc['createdBy']) ? (string) $doc['createdBy'] : null,
                'parentModel'   => $doc['createdByModel'] ?? null,
            ];

            $parentId    = (string) ($doc['createdBy'] ?? '');
            $parentModel = (string) ($doc['createdByModel'] ?? '');

            if ($parentId === '' || preg_match('/^[a-f0-9]{24}$/i', $parentId) !== 1) {
                break; // no further parent
            }

            // If created by Admin, look up admin record for its agentPercent if any
            if ($parentModel === 'Admin') {
                $adminDoc = $this->db->findOne('admins', ['_id' => MongoRepository::id($parentId)]);
                if ($adminDoc !== null) {
                    $chain[] = [
                        'id'            => (string) ($adminDoc['_id'] ?? $parentId),
                        'username'      => $adminDoc['username'] ?? null,
                        'role'          => 'admin',
                        'agentPercent'  => isset($adminDoc['agentPercent']) ? (float) $adminDoc['agentPercent'] : null,
                        'playerRate'    => null,
                        'parentAgentId' => null,
                        'parentModel'   => null,
                    ];
                }
                break; // admin is always the root
            }

            $currentId  = $parentId;
            $collection = 'agents';
        }

        return $chain; // index 0 = the requested agent, last = root
    }

    /**
     * GET /api/admin/agent/{id}/commission-chain
     * Returns the full upline (leaf → root) and direct downlines for an agent.
     * Also computes the chain total and validation status.
     */
    private function getAgentCommissionChain(string $agentId): void
    {
        try {
            $actor = $this->protect(['admin', 'master_agent', 'super_agent']);
            if ($actor === null) {
                return;
            }
            if (preg_match('/^[a-f0-9]{24}$/i', $agentId) !== 1) {
                Response::json(['message' => 'Invalid agent ID'], 400);
                return;
            }

            // Build upline (current agent is index 0)
            $upline = $this->buildUplineChain($agentId);
            if (count($upline) === 0) {
                Response::json(['message' => 'Agent not found'], 404);
                return;
            }

            // Direct child agents (downlines)
            $childAgents = $this->db->findMany('agents', [
                'createdBy'      => MongoRepository::id($agentId),
                'createdByModel' => 'Agent',
            ], ['sort' => ['username' => 1]]);

            $downlines = [];
            foreach ($childAgents as $child) {
                $downlines[] = [
                    'id'           => (string) ($child['_id'] ?? ''),
                    'username'     => $child['username'] ?? null,
                    'role'         => $child['role'] ?? null,
                    'agentPercent' => isset($child['agentPercent']) ? (float) $child['agentPercent'] : null,
                    'playerRate'   => isset($child['playerRate']) ? (float) $child['playerRate'] : null,
                    'status'       => $child['status'] ?? 'active',
                ];
            }

            // Chain total = sum of agentPercent for every node in the upline
            $chainTotal = 0.0;
            foreach ($upline as $node) {
                if ($node['agentPercent'] !== null) {
                    $chainTotal += $node['agentPercent'];
                }
            }
            $chainTotal = round($chainTotal, 4);

            $isValid = abs($chainTotal - 100.0) < 0.01;

            Response::json([
                'upline'     => $upline,          // [current, parent, grandparent, …, root]
                'downlines'  => $downlines,        // direct children
                'chainTotal' => $chainTotal,
                'isValid'    => $isValid,
                'message'    => $isValid ? 'Chain totals 100%' : "Chain totals {$chainTotal}% (must equal 100%)",
            ]);
        } catch (Throwable $e) {
            Response::json(['message' => 'Server error fetching commission chain'], 500);
        }
    }

    /**
     * POST /api/admin/commission/calculate
     * Body: { agentId: string, amount: number }
     * Returns a distribution breakdown of `amount` across the full upline chain.
     *
     * Example (amount=1000, chain=[ZGN36=50%, CCG365=10%, NJG365=35%, ADMIN365=5%]):
     *   ZGN36 → 500, CCG365 → 100, NJG365 → 350, ADMIN365 → 50
     */
    private function calculateCommissionDistribution(): void
    {
        try {
            $actor = $this->protect(['admin', 'master_agent', 'super_agent']);
            if ($actor === null) {
                return;
            }

            $body    = Http::jsonBody();
            $agentId = trim((string) ($body['agentId'] ?? ''));
            $amount  = isset($body['amount']) && is_numeric($body['amount']) ? (float) $body['amount'] : null;

            if ($agentId === '' || preg_match('/^[a-f0-9]{24}$/i', $agentId) !== 1) {
                Response::json(['message' => 'agentId is required'], 400);
                return;
            }
            if ($amount === null || $amount <= 0) {
                Response::json(['message' => 'amount must be a positive number'], 400);
                return;
            }

            $upline = $this->buildUplineChain($agentId);
            if (count($upline) === 0) {
                Response::json(['message' => 'Agent not found'], 404);
                return;
            }

            // Validate chain first
            $chainTotal = 0.0;
            foreach ($upline as $node) {
                if ($node['agentPercent'] !== null) {
                    $chainTotal += $node['agentPercent'];
                }
            }
            $chainTotal = round($chainTotal, 4);
            $isValid = abs($chainTotal - 100.0) < 0.01;

            // Build distribution
            $distributions = [];
            $allocatedTotal = 0.0;
            $lastIdx = count($upline) - 1;
            foreach ($upline as $idx => $node) {
                $pct   = $node['agentPercent'] ?? 0.0;
                $share = ($idx === $lastIdx)
                    // Give the last node the remainder to avoid floating-point drift
                    ? round($amount - $allocatedTotal, 2)
                    : round($amount * $pct / 100, 2);

                $allocatedTotal += $share;
                $distributions[] = [
                    'id'           => $node['id'],
                    'username'     => $node['username'],
                    'role'         => $node['role'],
                    'agentPercent' => $pct,
                    'amount'       => $share,
                ];
            }

            Response::json([
                'agentId'       => $agentId,
                'amount'        => $amount,
                'chainTotal'    => $chainTotal,
                'isValid'       => $isValid,
                'distributions' => $distributions,
            ]);
        } catch (Throwable $e) {
            Response::json(['message' => 'Server error calculating commission'], 500);
        }
    }

    /**
     * POST /api/admin/commission/validate
     * Body: { nodes: [{id, agentPercent}] }
     * Validates that the submitted percentages sum to exactly 100%
     * and that none are negative or individually > 100.
     */
    private function validateCommissionChain(): void
    {
        try {
            $actor = $this->protect(['admin', 'master_agent', 'super_agent']);
            if ($actor === null) {
                return;
            }

            $body  = Http::jsonBody();
            $nodes = is_array($body['nodes'] ?? null) ? $body['nodes'] : [];

            $errors = [];
            $total  = 0.0;

            foreach ($nodes as $i => $node) {
                $pct = isset($node['agentPercent']) && is_numeric($node['agentPercent'])
                    ? (float) $node['agentPercent']
                    : null;
                $username = $node['username'] ?? "node #{$i}";

                if ($pct === null) {
                    $errors[] = "{$username}: agentPercent is missing";
                    continue;
                }
                if ($pct < 0) {
                    $errors[] = "{$username}: agentPercent cannot be negative";
                }
                if ($pct > 100) {
                    $errors[] = "{$username}: agentPercent cannot exceed 100%";
                }
                $total += $pct;
            }

            $total = round($total, 4);
            $isValid = count($errors) === 0 && abs($total - 100.0) < 0.01;

            if (!$isValid && abs($total - 100.0) >= 0.01) {
                $errors[] = "Chain total is {$total}% — must equal exactly 100%";
            }

            Response::json([
                'isValid'    => $isValid,
                'chainTotal' => $total,
                'errors'     => $errors,
            ]);
        } catch (Throwable $e) {
            Response::json(['message' => 'Server error validating chain'], 500);
        }
    }

    // ─── End Commission Chain ─────────────────────────────────────────────────

    private function buildAgentTree(string $parentId, string $parentModel): array
    {
        $nodes = [];

        $subAgents = $this->db->findMany('agents', [
            'createdBy' => MongoRepository::id($parentId),
            'createdByModel' => $parentModel,
        ], ['sort' => ['username' => 1]]);

        foreach ($subAgents as $agent) {
            $nodes[] = $this->formatAgentTreeAgentNode($agent);
        }

        $playerQuery = [
            'createdBy' => MongoRepository::id($parentId),
            'createdByModel' => $parentModel,
        ];
        if ($parentModel === 'Agent') {
            // Agent trees should always show players assigned to that agent, regardless of who created them.
            $playerQuery = [
                'agentId' => MongoRepository::id($parentId),
                'role' => 'user',
            ];
        }
        $players = $this->db->findMany('users', $playerQuery, ['sort' => ['username' => 1]]);

        foreach ($players as $player) {
            $nodes[] = [
                'id' => (string) ($player['_id'] ?? ''),
                'username' => $player['username'] ?? null,
                'role' => 'player',
                'nodeType' => 'player',
                'children' => [],
            ];
        }

        return $nodes;
    }

    private function syncMasterAgentCollection(array $agent): void
    {
        $id = (string) ($agent['_id'] ?? '');
        if ($id === '' || preg_match('/^[a-f0-9]{24}$/i', $id) !== 1) {
            return;
        }

        $payload = [
            'agentId' => MongoRepository::id($id),
            'username' => strtoupper((string) ($agent['username'] ?? '')),
            'fullName' => (string) ($agent['fullName'] ?? ''),
            'phoneNumber' => (string) ($agent['phoneNumber'] ?? ''),
            'status' => (string) ($agent['status'] ?? 'active'),
            'balance' => $this->num($agent['balance'] ?? 0),
            'balanceOwed' => $this->num($agent['balanceOwed'] ?? 0),
            'defaultMinBet' => $this->num($agent['defaultMinBet'] ?? 0),
            'defaultMaxBet' => $this->num($agent['defaultMaxBet'] ?? 0),
            'defaultCreditLimit' => $this->num($agent['defaultCreditLimit'] ?? 0),
            'defaultSettleLimit' => $this->num($agent['defaultSettleLimit'] ?? 0),
            'createdBy' => isset($agent['createdBy']) && preg_match('/^[a-f0-9]{24}$/i', (string) $agent['createdBy']) === 1
                ? MongoRepository::id((string) $agent['createdBy'])
                : null,
            'createdByModel' => (string) ($agent['createdByModel'] ?? ''),
            'referredByUserId' => isset($agent['referredByUserId']) && preg_match('/^[a-f0-9]{24}$/i', (string) $agent['referredByUserId']) === 1
                ? MongoRepository::id((string) $agent['referredByUserId'])
                : null,
            'syncedAt' => MongoRepository::nowUtc(),
        ];

        $this->db->updateOneUpsert(
            'master_agents',
            ['agentId' => MongoRepository::id($id)],
            $payload,
            ['createdAt' => MongoRepository::nowUtc()]
        );
    }

    private function protect(array $allowedRoles): ?array
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
        $effectiveAllowedRoles = $allowedRoles;
        if (in_array('admin', $allowedRoles, true)) {
            $effectiveAllowedRoles[] = 'master_agent';
            $effectiveAllowedRoles[] = 'super_agent';
        }
        $effectiveAllowedRoles = array_values(array_unique($effectiveAllowedRoles));

        if (!in_array($role, $effectiveAllowedRoles, true)) {
            Response::json(['message' => 'Not authorized'], 403);
            return null;
        }

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

    /**
     * @param array<int, array<string, mixed>> $bets
     * @return array<string, array<int, array<string, mixed>>>
     */
    private function loadSelectionRowsByBetId(array $bets): array
    {
        SportsbookBetSupport::backfillSelectionRowsForBets($this->db, $bets);

        $betIds = [];
        foreach ($bets as $bet) {
            $betId = (string) ($bet['_id'] ?? '');
            if ($betId !== '' && preg_match('/^[a-f0-9]{24}$/i', $betId) === 1) {
                $betIds[] = MongoRepository::id($betId);
            }
        }

        if ($betIds === []) {
            return [];
        }

        $rows = $this->db->findMany('betselections', ['betId' => ['$in' => $betIds]], ['sort' => ['selectionOrder' => 1]]);
        $grouped = [];
        foreach ($rows as $row) {
            $betId = (string) ($row['betId'] ?? '');
            if ($betId === '') {
                continue;
            }
            if (!isset($grouped[$betId])) {
                $grouped[$betId] = [];
            }
            $grouped[$betId][] = $row;
        }

        return $grouped;
    }

    /**
     * @param array<string, mixed> $bet
     * @param array<int, array<string, mixed>> $selectionRows
     * @return array<int, string>
     */
    private function matchIdsForBet(array $bet, array $selectionRows): array
    {
        $matchIds = [];
        foreach ($selectionRows as $row) {
            $matchId = (string) ($row['matchId'] ?? '');
            if ($matchId !== '' && preg_match('/^[a-f0-9]{24}$/i', $matchId) === 1) {
                $matchIds[$matchId] = $matchId;
            }
        }

        if ($matchIds === []) {
            $matchId = (string) ($bet['matchId'] ?? '');
            if ($matchId !== '' && preg_match('/^[a-f0-9]{24}$/i', $matchId) === 1) {
                $matchIds[$matchId] = $matchId;
            }
        }

        return array_values($matchIds);
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

    private function buildAuthPayload(array $user): array
    {
        $balance = $this->num($user['balance'] ?? 0);
        $pendingBalance = $this->num($user['pendingBalance'] ?? 0);
        $availableBalance = max(0, $balance - $pendingBalance);
        $balanceOwed = $this->num($user['balanceOwed'] ?? 0);
        $creditLimit = $this->num($user['creditLimit'] ?? 0);

        return [
            'id' => (string) ($user['_id'] ?? ''),
            'username' => $user['username'] ?? null,
            'phoneNumber' => $user['phoneNumber'] ?? null,
            'balance' => $balance,
            'pendingBalance' => $pendingBalance,
            'availableBalance' => $availableBalance,
            'balanceOwed' => $balanceOwed,
            'creditLimit' => $creditLimit,
            'unlimitedBalance' => (bool) ($user['unlimitedBalance'] ?? false),
            'isSuperAdmin' => (bool) ($user['isSuperAdmin'] ?? false),
            'totalWinnings' => $user['totalWinnings'] ?? 0,
            'role' => $user['role'] ?? 'user',
            'viewOnly' => $user['viewOnly'] ?? null,
            'agentBillingStatus' => $user['agentBillingStatus'] ?? null,
            'dashboardLayout' => $user['dashboardLayout'] ?? null,
            'permissions' => $user['permissions'] ?? null,
            'token' => Jwt::encode([
                'id' => (string) ($user['_id'] ?? ''),
                'role' => (string) ($user['role'] ?? 'user'),
                'agentId' => $user['agentId'] ?? null,
            ], $this->jwtSecret, 8 * 3600),
        ];
    }
}
