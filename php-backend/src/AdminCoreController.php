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
        if ($method === 'GET' && $path === '/api/admin/transactions') {
            $this->getTransactionsHistory();
            return true;
        }
        if ($method === 'DELETE' && $path === '/api/admin/transactions') {
            $this->deleteTransactionsHistory();
            return true;
        }
        if ($method === 'GET' && $path === '/api/admin/collections') {
            $this->getCollections();
            return true;
        }
        if ($method === 'POST' && $path === '/api/admin/collections') {
            $this->createCollection();
            return true;
        }
        if ($method === 'POST' && preg_match('#^/api/admin/collections/([a-fA-F0-9]{24})/collect$#', $path, $m) === 1) {
            $this->collectCollection($m[1]);
            return true;
        }
        if ($method === 'GET' && preg_match('#^/api/admin/collections/([a-fA-F0-9]{24})$#', $path, $m) === 1) {
            $this->getCollectionById($m[1]);
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
        if ($method === 'PUT' && preg_match('#^/api/admin/agent/([a-fA-F0-9]{24})$#', $path, $m) === 1) {
            $this->updateAgent($m[1]);
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

        return false;
    }

    private function getUsers(): void
    {
        try {
            $actor = $this->protect(['admin', 'agent', 'master_agent', 'super_agent']);
            if ($actor === null) {
                return;
            }

            $query = ['role' => 'user'];
            if (($actor['role'] ?? '') === 'agent') {
                $query['agentId'] = MongoRepository::id((string) $actor['_id']);
            } elseif (in_array((string) ($actor['role'] ?? ''), ['master_agent', 'super_agent'], true)) {
                $subAgents = $this->db->findMany('agents', ['createdBy' => MongoRepository::id((string) $actor['_id']), 'createdByModel' => 'Agent'], ['projection' => ['_id' => 1]]);
                $ids = [MongoRepository::id((string) $actor['_id'])];
                foreach ($subAgents as $sa) {
                    if (isset($sa['_id']) && is_string($sa['_id']) && preg_match('/^[a-f0-9]{24}$/i', $sa['_id']) === 1) {
                        $ids[] = MongoRepository::id($sa['_id']);
                    }
                }
                $query['agentId'] = ['$in' => $ids];
            }

            $searchQ = trim((string) ($_GET['q'] ?? ''));
            if ($searchQ !== '') {
                $safe = preg_quote($searchQ, '/');
                $query['$or'] = [
                    ['username' => ['$regex' => $safe, '$options' => 'i']],
                    ['phoneNumber' => ['$regex' => $safe, '$options' => 'i']],
                    ['firstName' => ['$regex' => $safe, '$options' => 'i']],
                    ['lastName' => ['$regex' => $safe, '$options' => 'i']],
                    ['fullName' => ['$regex' => $safe, '$options' => 'i']],
                ];
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
                $referrers = $this->db->findMany('users', ['_id' => ['$in' => $referrerObjectIds]], ['projection' => ['username' => 1, 'fullName' => 1]]);
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
                    'availableBalance' => max(0, $balance - $pending),
                    'isActive' => ($betCounts[$uid] ?? 0) >= 2,
                    'createdBy' => $cid !== '' && isset($creatorUserMap[$cid])
                        ? ['username' => $creatorUserMap[$cid]['username'] ?? null, 'role' => $creatorUserMap[$cid]['role'] ?? null]
                        : null,
                    'createdByModel' => $user['createdByModel'] ?? null,
                    'referredByUserId' => $rid !== '' ? $rid : null,
                    'referredByUsername' => $rid !== '' ? ($referrerMap[$rid]['username'] ?? null) : null,
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
                $referrers = $this->db->findMany('users', ['_id' => ['$in' => $referrerObjectIds]], ['projection' => ['username' => 1]]);
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
                    'agentBillingRate' => $billingRate,
                    'agentBillingStatus' => $agent['agentBillingStatus'] ?? null,
                    'viewOnly' => (bool) ($agent['viewOnly'] ?? false) || (($agent['agentBillingStatus'] ?? '') === 'unpaid'),
                    'permissions' => $agent['permissions'] ?? null,
                    'userCount' => $userCount,
                    'subAgentCount' => $subAgentCount,
                    'totalUsersInHierarchy' => $totalUsersInHierarchy,
                    'activeCustomerCount' => $activeCustomerCount,
                    'weeklyCharge' => $billingRate * $activeCustomerCount,
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

                return [
                    'counts' => [
                        'users' => $userCount,
                        'bets' => $betCount,
                        'matches' => $matchCount,
                    ],
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

                $matchUser = [];
                $myUserIds = null;
                if (($actor['role'] ?? '') === 'agent') {
                    $myUsers = $this->db->findMany('users', ['agentId' => MongoRepository::id((string) $actor['_id'])], ['projection' => ['_id' => 1]]);
                    $ids = [];
                    foreach ($myUsers as $u) {
                        $ids[] = MongoRepository::id((string) $u['_id']);
                    }
                    $myUserIds = $ids;
                    $matchUser = ['_id' => ['$in' => $ids]];
                }

                $usersForBalance = $this->db->findMany('users', $matchUser, ['projection' => ['balance' => 1, 'balanceOwed' => 1, 'status' => 1]]);
                $totalBalance = 0.0;
                $userOutstanding = 0.0;
                $activeAccounts = 0;
                foreach ($usersForBalance as $u) {
                    $totalBalance += $this->num($u['balance'] ?? 0);
                    $userOutstanding += $this->num($u['balanceOwed'] ?? 0);
                    if (($u['status'] ?? '') === 'active') {
                        $activeAccounts++;
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
                    'type' => ['$in' => ['bet_placed', 'bet_won']],
                    'createdAt' => ['$gte' => MongoRepository::utcFromMillis($startOfToday->getTimestamp() * 1000)],
                ];
                $txQueryWeek = [
                    'status' => 'completed',
                    'type' => ['$in' => ['bet_placed', 'bet_won']],
                    'createdAt' => ['$gte' => MongoRepository::utcFromMillis($startOfWeek->getTimestamp() * 1000)],
                ];

                if (($actor['role'] ?? '') === 'agent' && is_array($myUserIds)) {
                    $txQueryToday['userId'] = ['$in' => $myUserIds];
                    $txQueryWeek['userId'] = ['$in' => $myUserIds];
                }

                $todayTx = $this->db->findMany('transactions', $txQueryToday, ['projection' => ['amount' => 1, 'type' => 1]]);
                $weekTx = $this->db->findMany('transactions', $txQueryWeek, ['projection' => ['amount' => 1, 'type' => 1]]);

                $todayNetUser = $this->sumSignedTransactions($todayTx);
                $weekNetUser = $this->sumSignedTransactions($weekTx);

                return [
                    'totalBalance' => $totalBalance,
                    'totalOutstanding' => $userOutstanding + $agentOutstanding,
                    'todayNet' => $todayNetUser * -1,
                    'weekNet' => $weekNetUser * -1,
                    'activeAccounts' => $activeAccounts,
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
            if ($suffix !== '' && preg_match('/^[A-Z0-9]+$/', $suffix) !== 1) {
                Response::json(['message' => 'Suffix may only contain letters and numbers'], 400);
                return;
            }
            if (!in_array($type, ['player', 'agent'], true)) {
                Response::json(['message' => 'Invalid type'], 400);
                return;
            }

            $safePrefix = preg_quote($prefix, '/');
            $safeSuffix = preg_quote($suffix, '/');
            $pattern = '/^' . $safePrefix . '(\d+)' . $safeSuffix . '$/i';

            $allDocs = array_merge(
                $this->db->findMany('users', [], ['projection' => ['username' => 1]]),
                $this->db->findMany('agents', [], ['projection' => ['username' => 1]]),
                $this->db->findMany('admins', [], ['projection' => ['username' => 1]])
            );

            $maxNum = ($type === 'agent') ? 246 : 100;
            foreach ($allDocs as $doc) {
                $username = (string) ($doc['username'] ?? '');
                if ($username === '') {
                    continue;
                }
                if (preg_match($pattern, $username, $matches) === 1) {
                    $num = (int) ($matches[1] ?? 0);
                    if ($num > $maxNum) {
                        $maxNum = $num;
                    }
                }
            }

            $nextUsername = strtoupper($prefix . ($maxNum + 1) . $suffix);
            Response::json(['nextUsername' => $nextUsername]);
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
                Response::json(['message' => 'User not found'], 404);
                return;
            }

            if (!$this->canImpersonateTarget($actor, $target)) {
                Response::json(['message' => 'Unauthorized to impersonate this user'], 403);
                return;
            }

            $payload = $this->buildAuthPayload($target['doc']);
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

    private function getAgentTree(): void
    {
        try {
            $actor = $this->protect(['admin', 'agent', 'master_agent', 'super_agent']);
            if ($actor === null) {
                return;
            }

            $tree = $this->buildAgentTree((string) $actor['_id'], (($actor['role'] ?? '') === 'admin') ? 'Admin' : 'Agent');
            Response::json([
                'root' => [
                    'username' => $actor['username'] ?? null,
                    'role' => $actor['role'] ?? null,
                    'id' => (string) ($actor['_id'] ?? ''),
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
            $freeplayBalance = $body['freeplayBalance'] ?? null;
            $note = trim((string) ($body['description'] ?? ''));
            if ($freeplayBalance === null || !is_numeric($freeplayBalance)) {
                Response::json(['message' => 'Freeplay balance is required'], 400);
                return;
            }

            $nextFreeplay = max(0.0, (float) $freeplayBalance);
            $freeplayBefore = $this->num($user['freeplayBalance'] ?? 0);

            $this->db->updateOne('users', ['_id' => MongoRepository::id($userId)], [
                'freeplayBalance' => $nextFreeplay,
                'updatedAt' => MongoRepository::nowUtc(),
            ]);

            $this->db->insertOne('transactions', [
                'userId' => MongoRepository::id($userId),
                'adminId' => isset($actor['_id']) ? MongoRepository::id((string) $actor['_id']) : null,
                'amount' => abs($nextFreeplay - $freeplayBefore),
                'type' => 'adjustment',
                'status' => 'completed',
                'balanceBefore' => $freeplayBefore,
                'balanceAfter' => $nextFreeplay,
                'referenceType' => 'Adjustment',
                'reason' => 'FREEPLAY_ADJUSTMENT',
                'description' => $note !== '' ? $note : ((($actor['role'] ?? '') === 'agent')
                    ? ('Agent ' . (string) ($actor['username'] ?? '') . ' updated freeplay balance')
                    : 'Admin updated freeplay balance'),
                'createdAt' => MongoRepository::nowUtc(),
                'updatedAt' => MongoRepository::nowUtc(),
            ]);

            Response::json([
                'message' => 'Freeplay balance updated',
                'user' => [
                    'id' => $userId,
                    'freeplayBalance' => $nextFreeplay,
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
            $newPassword = (string) ($body['newPassword'] ?? '');
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

            $this->db->updateOne('users', ['_id' => MongoRepository::id($userId)], [
                'password' => password_hash($newPassword, PASSWORD_BCRYPT),
                // WARNING: displayPassword is for admin convenience only.
                // It stores the last set password in plain text.
                'displayPassword' => $newPassword,
                'updatedAt' => MongoRepository::nowUtc(),
            ]);

            Response::json(['message' => 'Password for user ' . (string) ($user['username'] ?? '') . ' has been reset successfully']);
        } catch (Throwable $e) {
            Response::json(['message' => 'Server error resetting user password'], 500);
        }
    }

    private function resetAgentPassword(string $agentId): void
    {
        try {
            $actor = $this->protect(['admin']);
            if ($actor === null) {
                return;
            }

            $body = Http::jsonBody();
            $newPassword = (string) ($body['newPassword'] ?? '');
            if ($newPassword === '' || strlen($newPassword) < 6) {
                Response::json(['message' => 'Password must be at least 6 characters long'], 400);
                return;
            }

            $agent = $this->db->findOne('agents', ['_id' => MongoRepository::id($agentId)]);
            if ($agent === null || (($agent['role'] ?? '') !== 'agent')) {
                Response::json(['message' => 'Agent not found'], 404);
                return;
            }

            $this->db->updateOne('agents', ['_id' => MongoRepository::id($agentId)], [
                'password' => password_hash($newPassword, PASSWORD_BCRYPT),
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
            }
            $end = $start->modify('+7 days');

            $query = ['role' => 'user'];
            if (($actor['role'] ?? '') === 'agent') {
                $query['agentId'] = MongoRepository::id((string) $actor['_id']);
            }

            $users = $this->db->findMany('users', $query, [
                'projection' => ['username' => 1, 'phoneNumber' => 1, 'fullName' => 1, 'balance' => 1, 'pendingBalance' => 1, 'status' => 1, 'createdAt' => 1],
            ]);
            $agentsManagersCount = $this->db->countDocuments('users', ['role' => ['$in' => ['agent', 'admin']]]);

            $userIds = [];
            $userMap = [];
            foreach ($users as $user) {
                $uid = (string) ($user['_id'] ?? '');
                if ($uid !== '' && preg_match('/^[a-f0-9]{24}$/i', $uid) === 1) {
                    $userIds[] = MongoRepository::id($uid);
                    $userMap[$uid] = ['user' => $user, 'daily' => [0, 0, 0, 0, 0, 0, 0]];
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
                ], ['projection' => ['userId' => 1, 'amount' => 1, 'type' => 1, 'createdAt' => 1, 'status' => 1]])
                : [];

            $summaryDaily = [0, 0, 0, 0, 0, 0, 0];
            foreach ($transactions as $tx) {
                $created = $this->toTimestampSeconds($tx['createdAt'] ?? null);
                if ($created === null) {
                    continue;
                }
                $dayIndex = (int) floor(($created - $start->getTimestamp()) / 86400);
                if ($dayIndex < 0 || $dayIndex > 6) {
                    continue;
                }
                $signed = $this->getSignedTransactionAmount($tx);
                $summaryDaily[$dayIndex] += $signed;
                $uid = (string) ($tx['userId'] ?? '');
                if (isset($userMap[$uid])) {
                    $userMap[$uid]['daily'][$dayIndex] += $signed;
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
                $carry = $balance - $weekTotal;

                $customers[] = [
                    'id' => $uid,
                    'username' => $user['username'] ?? null,
                    'name' => (($user['fullName'] ?? '') !== '') ? $user['fullName'] : ($user['username'] ?? null),
                    'phoneNumber' => $user['phoneNumber'] ?? null,
                    'daily' => $daily,
                    'week' => $weekTotal,
                    'carry' => $carry,
                    'balance' => $balance,
                    'pending' => $pending,
                    'status' => $user['status'] ?? null,
                ];
            }

            $totalPlayers = count($users);
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

            $transaction = $this->db->findOne('transactions', ['_id' => MongoRepository::id($transactionId)]);
            if ($transaction === null || (($transaction['status'] ?? '') !== 'pending')) {
                Response::json(['message' => 'Pending transaction not found'], 404);
                return;
            }

            $userId = (string) ($transaction['userId'] ?? '');
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
                Response::json(['message' => 'Not authorized for this transaction'], 403);
                return;
            }

            $amount = $this->num($transaction['amount'] ?? 0);
            $userUpdates = ['updatedAt' => MongoRepository::nowUtc()];

            if (($transaction['type'] ?? '') === 'deposit') {
                $newBalance = $this->num($user['balance'] ?? 0) + $amount;
                $userUpdates['balance'] = $newBalance;

                $minQualifyingPayin = 200;
                $referralBonus = 200;
                if (
                    $amount >= $minQualifyingPayin
                    && isset($user['referredByUserId'])
                    && (string) $user['referredByUserId'] !== ''
                    && !((bool) ($user['referralBonusGranted'] ?? false))
                ) {
                    $referrerId = (string) $user['referredByUserId'];
                    if (preg_match('/^[a-f0-9]{24}$/i', $referrerId) === 1) {
                        $referrer = $this->db->findOne('users', [
                            '_id' => MongoRepository::id($referrerId),
                            'role' => 'user',
                            'status' => 'active',
                        ]);
                        if ($referrer !== null) {
                            $before = $this->num($referrer['freeplayBalance'] ?? 0);
                            $after = $before + $referralBonus;
                            $this->db->updateOne('users', ['_id' => MongoRepository::id($referrerId)], [
                                'freeplayBalance' => $after,
                                'updatedAt' => MongoRepository::nowUtc(),
                            ]);

                            $this->db->insertOne('transactions', [
                                'userId' => MongoRepository::id($referrerId),
                                'agentId' => isset($referrer['agentId']) && preg_match('/^[a-f0-9]{24}$/i', (string) $referrer['agentId']) === 1
                                    ? MongoRepository::id((string) $referrer['agentId'])
                                    : null,
                                'adminId' => isset($actor['_id']) ? MongoRepository::id((string) $actor['_id']) : null,
                                'amount' => $referralBonus,
                                'type' => 'adjustment',
                                'status' => 'completed',
                                'balanceBefore' => $before,
                                'balanceAfter' => $after,
                                'reason' => 'REFERRAL_FREEPLAY_BONUS',
                                'referenceType' => 'Adjustment',
                                'description' => 'Referral bonus from ' . (string) ($user['username'] ?? 'user') . ' qualifying pay-in',
                                'createdAt' => MongoRepository::nowUtc(),
                                'updatedAt' => MongoRepository::nowUtc(),
                            ]);

                            $userUpdates['referralBonusGranted'] = true;
                            $userUpdates['referralBonusGrantedAt'] = MongoRepository::nowUtc();
                            $userUpdates['referralQualifiedDepositAt'] = MongoRepository::nowUtc();
                            $userUpdates['referralBonusAmount'] = $referralBonus;
                        }
                    }
                }
            } elseif (($transaction['type'] ?? '') === 'withdrawal') {
                $newBalance = $this->num($user['balance'] ?? 0) - $amount;
                if ($newBalance < 0) {
                    Response::json(['message' => 'Insufficient balance for withdrawal approval'], 400);
                    return;
                }
                $userUpdates['balance'] = $newBalance;
            }

            $this->db->updateOne('users', ['_id' => MongoRepository::id($userId)], $userUpdates);
            $this->db->updateOne('transactions', ['_id' => MongoRepository::id($transactionId)], [
                'status' => 'completed',
                'updatedAt' => MongoRepository::nowUtc(),
            ]);

            Response::json(['message' => 'Transaction approved', 'transactionId' => $transactionId]);
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
            $bets = $this->db->findMany('bets', [], ['projection' => ['matchId' => 1, 'amount' => 1, 'potentialPayout' => 1, 'status' => 1]]);

            $stats = [];
            foreach ($bets as $bet) {
                $matchId = (string) ($bet['matchId'] ?? '');
                if ($matchId === '') {
                    continue;
                }
                if (!isset($stats[$matchId])) {
                    $stats[$matchId] = ['totalWagered' => 0.0, 'totalPayouts' => 0.0, 'activeBets' => 0];
                }
                $stats[$matchId]['totalWagered'] += $this->num($bet['amount'] ?? 0);
                if (($bet['status'] ?? '') === 'won') {
                    $stats[$matchId]['totalPayouts'] += $this->num($bet['potentialPayout'] ?? 0);
                }
                if (($bet['status'] ?? '') === 'pending') {
                    $stats[$matchId]['activeBets'] += 1;
                }
            }

            $response = [];
            foreach ($matches as $match) {
                $id = (string) ($match['_id'] ?? '');
                $stat = $stats[$id] ?? ['totalWagered' => 0.0, 'totalPayouts' => 0.0, 'activeBets' => 0];
                $response[] = [
                    'id' => $id,
                    'homeTeam' => $match['homeTeam'] ?? null,
                    'awayTeam' => $match['awayTeam'] ?? null,
                    'startTime' => $match['startTime'] ?? null,
                    'status' => $match['status'] ?? null,
                    'sport' => $match['sport'] ?? null,
                    'activeBets' => $stat['activeBets'],
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
            $actor = $this->protect(['admin']);
            if ($actor === null) {
                return;
            }

            $user = (string) ($_GET['user'] ?? '');
            $type = (string) ($_GET['type'] ?? '');
            $status = (string) ($_GET['status'] ?? '');
            $time = (string) ($_GET['time'] ?? '');
            $limit = isset($_GET['limit']) && is_numeric($_GET['limit']) ? (int) $_GET['limit'] : 200;
            $limit = min($limit, 500);

            $query = [];
            if ($type !== '' && $type !== 'all') {
                $query['type'] = $type;
            }
            if ($status !== '' && $status !== 'all') {
                $query['status'] = $status;
            }

            $startDate = $this->getStartDateFromPeriod($time);
            if ($startDate !== null) {
                $query['createdAt'] = ['$gte' => MongoRepository::utcFromMillis($startDate->getTimestamp() * 1000)];
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

            $transactions = $this->db->findMany('transactions', $query, ['sort' => ['createdAt' => -1], 'limit' => $limit]);
            $userMap = [];
            foreach ($transactions as $tx) {
                $uid = (string) ($tx['userId'] ?? '');
                if ($uid !== '' && !isset($userMap[$uid]) && preg_match('/^[a-f0-9]{24}$/i', $uid) === 1) {
                    $u = $this->db->findOne('users', ['_id' => MongoRepository::id($uid)], ['projection' => ['username' => 1, 'phoneNumber' => 1]]);
                    if ($u !== null) {
                        $userMap[$uid] = $u;
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
                    'userId' => $uid !== '' ? $uid : null,
                    'amount' => $this->num($tx['amount'] ?? 0),
                    'date' => $tx['createdAt'] ?? null,
                    'status' => $tx['status'] ?? null,
                    'reason' => $tx['reason'] ?? null,
                    'description' => $tx['description'] ?? null,
                ];
            }

            Response::json(['transactions' => $formatted]);
        } catch (Throwable $e) {
            Response::json(['message' => 'Server error fetching transaction history'], 500);
        }
    }

    private function deleteTransactionsHistory(): void
    {
        try {
            $actor = $this->protect(['admin']);
            if ($actor === null) {
                return;
            }

            $body = Http::jsonBody();
            $ids = is_array($body['ids'] ?? null) ? $body['ids'] : [];
            if (count($ids) === 0) {
                Response::json(['message' => 'Transaction ids are required'], 400);
                return;
            }

            $deleted = 0;
            $skipped = 0;
            foreach ($ids as $idRaw) {
                $id = is_string($idRaw) ? trim($idRaw) : '';
                if ($id === '' || preg_match('/^[a-f0-9]{24}$/i', $id) !== 1) {
                    $skipped++;
                    continue;
                }
                $tx = $this->db->findOne('transactions', ['_id' => MongoRepository::id($id)], ['projection' => ['type' => 1]]);
                if ($tx === null) {
                    $skipped++;
                    continue;
                }

                // Only manual adjustment rows can be removed from Customer Details transactions.
                if ((string) ($tx['type'] ?? '') !== 'adjustment') {
                    $skipped++;
                    continue;
                }

                $deletedCount = $this->db->deleteOne('transactions', ['_id' => MongoRepository::id($id)]);
                if ($deletedCount > 0) {
                    $deleted++;
                } else {
                    $skipped++;
                }
            }

            Response::json([
                'message' => 'Transactions delete completed',
                'deleted' => $deleted,
                'skipped' => $skipped,
            ]);
        } catch (Throwable $e) {
            Response::json(['message' => 'Server error deleting transactions'], 500);
        }
    }

    private function getCollections(): void
    {
        try {
            $actor = $this->protect(['admin']);
            if ($actor === null) {
                return;
            }

            $status = (string) ($_GET['status'] ?? '');
            $user = (string) ($_GET['user'] ?? '');
            $overdue = (string) ($_GET['overdue'] ?? '');
            $limit = isset($_GET['limit']) && is_numeric($_GET['limit']) ? (int) $_GET['limit'] : 200;
            $limit = min($limit, 500);

            $query = [];
            if ($status !== '' && $status !== 'all') {
                $query['status'] = $status;
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

            if ($overdue === '1') {
                $query['dueDate'] = ['$lt' => MongoRepository::utcFromMillis((new DateTimeImmutable('now'))->getTimestamp() * 1000)];
                $query['status'] = ['$ne' => 'collected'];
            }

            $collections = $this->db->findMany('collections', $query, ['sort' => ['createdAt' => -1], 'limit' => $limit]);
            $userMap = [];
            foreach ($collections as $col) {
                $uid = (string) ($col['userId'] ?? '');
                if ($uid !== '' && !isset($userMap[$uid]) && preg_match('/^[a-f0-9]{24}$/i', $uid) === 1) {
                    $u = $this->db->findOne('users', ['_id' => MongoRepository::id($uid)], ['projection' => ['username' => 1, 'phoneNumber' => 1]]);
                    if ($u !== null) {
                        $userMap[$uid] = $u;
                    }
                }
            }

            $formatted = [];
            $totalOutstanding = 0.0;
            foreach ($collections as $col) {
                $uid = (string) ($col['userId'] ?? '');
                $amount = $this->num($col['amount'] ?? 0);
                $statusVal = (string) ($col['status'] ?? '');
                if ($statusVal !== 'collected' && $statusVal !== 'cancelled') {
                    $totalOutstanding += $amount;
                }
                $formatted[] = [
                    'id' => (string) ($col['_id'] ?? ''),
                    'user' => $userMap[$uid]['username'] ?? 'Unknown',
                    'userId' => $uid !== '' ? $uid : null,
                    'amount' => $amount,
                    'dueDate' => $col['dueDate'] ?? null,
                    'status' => $statusVal !== '' ? $statusVal : null,
                    'attempts' => (int) ($col['attempts'] ?? 0),
                    'lastAttemptAt' => $col['lastAttemptAt'] ?? null,
                    'notes' => $col['notes'] ?? null,
                    'createdAt' => $col['createdAt'] ?? null,
                ];
            }

            Response::json(['collections' => $formatted, 'summary' => ['totalOutstanding' => $totalOutstanding]]);
        } catch (Throwable $e) {
            Response::json(['message' => 'Server error fetching collections'], 500);
        }
    }

    private function createCollection(): void
    {
        try {
            $actor = $this->protect(['admin']);
            if ($actor === null) {
                return;
            }

            $body = Http::jsonBody();
            $userId = (string) ($body['userId'] ?? '');
            if ($userId === '' || !array_key_exists('amount', $body) || preg_match('/^[a-f0-9]{24}$/i', $userId) !== 1) {
                Response::json(['message' => 'userId and amount are required'], 400);
                return;
            }

            $user = $this->db->findOne('users', ['_id' => MongoRepository::id($userId)]);
            if ($user === null) {
                Response::json(['message' => 'User not found'], 404);
                return;
            }

            $parsedAmount = $this->num($body['amount']);
            $dueDateInput = $body['dueDate'] ?? null;
            $due = null;
            $status = 'pending';
            if (is_string($dueDateInput) && $dueDateInput !== '') {
                $ts = strtotime($dueDateInput);
                if ($ts !== false) {
                    $due = MongoRepository::utcFromMillis($ts * 1000);
                    if ($ts < time()) {
                        $status = 'overdue';
                    }
                }
            }

            $doc = [
                'userId' => MongoRepository::id($userId),
                'amount' => $parsedAmount,
                'dueDate' => $due,
                'status' => $status,
                'notes' => (isset($body['notes']) && $body['notes'] !== '') ? (string) $body['notes'] : null,
                'createdBy' => MongoRepository::id((string) ($actor['_id'] ?? '')),
                'attempts' => 0,
                'lastAttemptAt' => null,
                'createdAt' => MongoRepository::nowUtc(),
                'updatedAt' => MongoRepository::nowUtc(),
            ];

            $id = $this->db->insertOne('collections', $doc);
            $collection = $this->db->findOne('collections', ['_id' => MongoRepository::id($id)]) ?? array_merge($doc, ['_id' => $id]);
            Response::json([
                'message' => 'Collection created',
                'collection' => [
                    'id' => (string) ($collection['_id'] ?? $id),
                    'userId' => (string) ($collection['userId'] ?? $userId),
                    'amount' => $this->num($collection['amount'] ?? $parsedAmount),
                    'dueDate' => $collection['dueDate'] ?? null,
                    'status' => $collection['status'] ?? $status,
                    'attempts' => (int) ($collection['attempts'] ?? 0),
                    'notes' => $collection['notes'] ?? null,
                    'createdAt' => $collection['createdAt'] ?? null,
                ],
            ], 201);
        } catch (Throwable $e) {
            Response::json(['message' => 'Server error creating collection'], 500);
        }
    }

    private function collectCollection(string $id): void
    {
        try {
            $actor = $this->protect(['admin']);
            if ($actor === null) {
                return;
            }

            $collection = $this->db->findOne('collections', ['_id' => MongoRepository::id($id)]);
            if ($collection === null) {
                Response::json(['message' => 'Collection not found'], 404);
                return;
            }

            $attempts = (int) ($collection['attempts'] ?? 0) + 1;
            $this->db->updateOne('collections', ['_id' => MongoRepository::id($id)], [
                'status' => 'collected',
                'attempts' => $attempts,
                'lastAttemptAt' => MongoRepository::nowUtc(),
                'updatedAt' => MongoRepository::nowUtc(),
            ]);

            Response::json(['message' => 'Collection marked as collected', 'id' => $id]);
        } catch (Throwable $e) {
            Response::json(['message' => 'Server error collecting'], 500);
        }
    }

    private function getCollectionById(string $id): void
    {
        try {
            $actor = $this->protect(['admin']);
            if ($actor === null) {
                return;
            }

            $collection = $this->db->findOne('collections', ['_id' => MongoRepository::id($id)]);
            if ($collection === null) {
                Response::json(['message' => 'Collection not found'], 404);
                return;
            }
            $uid = (string) ($collection['userId'] ?? '');
            $user = ($uid !== '' && preg_match('/^[a-f0-9]{24}$/i', $uid) === 1)
                ? $this->db->findOne('users', ['_id' => MongoRepository::id($uid)], ['projection' => ['username' => 1, 'phoneNumber' => 1]])
                : null;

            Response::json([
                'id' => (string) ($collection['_id'] ?? $id),
                'user' => $user['username'] ?? 'Unknown',
                'userId' => $uid !== '' ? $uid : null,
                'amount' => $this->num($collection['amount'] ?? 0),
                'dueDate' => $collection['dueDate'] ?? null,
                'status' => $collection['status'] ?? null,
                'attempts' => (int) ($collection['attempts'] ?? 0),
                'lastAttemptAt' => $collection['lastAttemptAt'] ?? null,
                'notes' => $collection['notes'] ?? null,
                'createdAt' => $collection['createdAt'] ?? null,
            ]);
        } catch (Throwable $e) {
            Response::json(['message' => 'Server error fetching collection'], 500);
        }
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
                Response::json(['message' => 'Cannot delete user with non-zero balance ($' . number_format($balance, 2, '.', '') . '). Please settle first.'], 400);
                return;
            }
            if ($pending > 0) {
                Response::json(['message' => 'Cannot delete user with pending bets ($' . number_format($pending, 2, '.', '') . ').'], 400);
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
                Response::json(['message' => 'Cannot delete agent with non-zero balance ($' . number_format($balance, 2, '.', '') . '). Settle first.'], 400);
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
            $password = (string) ($body['password'] ?? '');
            $fullName = trim((string) ($body['fullName'] ?? ''));
            $role = (string) ($body['role'] ?? '');
            $parentAgentId = trim((string) ($body['parentAgentId'] ?? $body['agentId'] ?? ''));
            $referredByUserId = trim((string) ($body['referredByUserId'] ?? ''));

            if ($username === '' || $phoneNumber === '' || $password === '') {
                Response::json(['message' => 'Username, phone number, and password are required'], 400);
                return;
            }
            if ($this->existsUsernameOrPhone($username, $phoneNumber)) {
                Response::json(['message' => 'Username or Phone number already exists in the system'], 409);
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

            $referrerObjectId = null;
            if ($referredByUserId !== '') {
                if (preg_match('/^[a-f0-9]{24}$/i', $referredByUserId) !== 1) {
                    Response::json(['message' => 'Invalid referredByUserId'], 400);
                    return;
                }
                $ref = $this->db->findOne('users', ['_id' => MongoRepository::id($referredByUserId), 'role' => 'user']);
                if ($ref === null) {
                    Response::json(['message' => 'Invalid referredByUserId'], 400);
                    return;
                }
                $referrerObjectId = MongoRepository::id($referredByUserId);
            }

            $doc = [
                'username' => strtoupper($username),
                'phoneNumber' => $phoneNumber,
                'password' => password_hash($password, PASSWORD_BCRYPT),
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
                $updates['password'] = password_hash((string) $body['password'], PASSWORD_BCRYPT);
            }
            if (array_key_exists('agentBillingRate', $body) && is_numeric($body['agentBillingRate'])) {
                $updates['agentBillingRate'] = (float) $body['agentBillingRate'];
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
            $password = (string) ($body['password'] ?? '');
            $firstNameRaw = trim((string) ($body['firstName'] ?? ''));
            $lastNameRaw = trim((string) ($body['lastName'] ?? ''));

            if ($username === '' || $phoneNumber === '' || $password === '') {
                Response::json(['message' => 'Username, phone number, and password are required'], 400);
                return;
            }
            if ($firstNameRaw === '' || $lastNameRaw === '') {
                Response::json(['message' => 'First name and last name are required'], 400);
                return;
            }
            if ($this->existsUsernameOrPhone($username, $phoneNumber)) {
                Response::json(['message' => 'Username or phone number already exists in the system'], 409);
                return;
            }

            $assignedAgentId = null;
            if (($actor['role'] ?? '') === 'agent') {
                $assignedAgentId = (string) $actor['_id'];
            } elseif (in_array((string) ($actor['role'] ?? ''), ['master_agent', 'super_agent'], true)) {
                $requested = (string) ($body['agentId'] ?? '');
                if ($requested === '') {
                    $assignedAgentId = (string) $actor['_id'];
                } elseif ($requested === (string) ($actor['_id'] ?? '')) {
                    $assignedAgentId = $requested;
                } elseif (preg_match('/^[a-f0-9]{24}$/i', $requested) === 1) {
                    $sub = $this->db->findOne('agents', [
                        '_id' => MongoRepository::id($requested),
                        'role' => ['$in' => ['agent', 'master_agent', 'super_agent']],
                        'createdBy' => MongoRepository::id((string) $actor['_id']),
                        'createdByModel' => 'Agent',
                    ]);
                    if ($sub === null) {
                        Response::json(['message' => 'You can only assign players to yourself or your direct sub-agents'], 403);
                        return;
                    }
                    $assignedAgentId = $requested;
                    $body['minBet'] = $body['minBet'] ?? ($sub['defaultMinBet'] ?? 25);
                    $body['maxBet'] = $body['maxBet'] ?? ($sub['defaultMaxBet'] ?? 200);
                    $body['creditLimit'] = $body['creditLimit'] ?? ($sub['defaultCreditLimit'] ?? 1000);
                    $body['balanceOwed'] = $body['balanceOwed'] ?? ($sub['defaultSettleLimit'] ?? 0);
                }
            } else {
                $requested = (string) ($body['agentId'] ?? '');
                if ($requested !== '' && preg_match('/^[a-f0-9]{24}$/i', $requested) === 1) {
                    $agent = $this->db->findOne('agents', ['_id' => MongoRepository::id($requested), 'role' => ['$in' => ['agent', 'master_agent', 'super_agent']]]);
                    if ($agent === null) {
                        Response::json(['message' => 'Invalid Agent/Master Agent ID'], 400);
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
                $ref = $this->db->findOne('users', ['_id' => MongoRepository::id($referredByUserId), 'role' => 'user']);
                if ($ref === null) {
                    Response::json(['message' => 'Invalid referredByUserId'], 400);
                    return;
                }
            }

            $firstName = strtoupper($firstNameRaw);
            $lastName = strtoupper($lastNameRaw);
            $fullName = strtoupper(trim((string) ($body['fullName'] ?? '')));
            if ($fullName === '') {
                $fullName = strtoupper(trim(($firstName . ' ' . $lastName)) !== '' ? trim($firstName . ' ' . $lastName) : $username);
            }

            $doc = [
                'username' => strtoupper($username),
                'phoneNumber' => $phoneNumber,
                'password' => password_hash($password, PASSWORD_BCRYPT),
                'firstName' => $firstName,
                'lastName' => $lastName,
                'fullName' => $fullName,
                'role' => 'user',
                'status' => 'active',
                'balance' => $this->numOr($body['balance'] ?? null, 1000),
                'minBet' => $this->numOr($body['minBet'] ?? null, 1),
                'maxBet' => $this->numOr($body['maxBet'] ?? null, 5000),
                'creditLimit' => $this->numOr($body['creditLimit'] ?? null, 1000),
                'balanceOwed' => $this->numOr($body['balanceOwed'] ?? null, 0),
                'freeplayBalance' => $this->numOr($body['freeplayBalance'] ?? null, 200),
                'pendingBalance' => 0,
                'agentId' => ($assignedAgentId !== null && preg_match('/^[a-f0-9]{24}$/i', $assignedAgentId) === 1) ? MongoRepository::id($assignedAgentId) : null,
                'createdBy' => MongoRepository::id((string) ($actor['_id'] ?? '')),
                'createdByModel' => (($actor['role'] ?? '') === 'admin') ? 'Admin' : 'Agent',
                'referredByUserId' => ($referredByUserId !== '' && preg_match('/^[a-f0-9]{24}$/i', $referredByUserId) === 1) ? MongoRepository::id($referredByUserId) : null,
                'referralBonusGranted' => false,
                'referralBonusAmount' => 0,
                'apps' => is_array($body['apps'] ?? null) ? $body['apps'] : new stdClass(),
                'createdAt' => MongoRepository::nowUtc(),
                'updatedAt' => MongoRepository::nowUtc(),
            ];
            $id = $this->db->insertOne('users', $doc);

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
            if (count($rows) === 0) {
                Response::json(['message' => 'No users provided'], 400);
                return;
            }
            if (count($rows) > 500) {
                Response::json(['message' => 'Maximum 500 users per batch'], 400);
                return;
            }

            $actorRole = (string) ($actor['role'] ?? '');
            $actorId = (string) ($actor['_id'] ?? '');
            $createdByModel = ($actorRole === 'admin') ? 'Admin' : 'Agent';
            $now = MongoRepository::nowUtc();

            $errors = [];
            $pendingDocs = [];
            $seenUsernames = [];
            $seenPhones = [];

            foreach ($rows as $idx => $row) {
                $rowNum = $idx + 1;
                $username = strtoupper(trim((string) ($row['username'] ?? '')));
                $phoneNumber = trim((string) ($row['phoneNumber'] ?? ''));
                $password = (string) ($row['password'] ?? '');
                $firstName = strtoupper(trim((string) ($row['firstName'] ?? '')));
                $lastName = strtoupper(trim((string) ($row['lastName'] ?? '')));

                if ($username === '' || $phoneNumber === '' || $password === '') {
                    $errors[] = ['row' => $rowNum, 'username' => $username, 'error' => 'Username, phone number, and password are required'];
                    continue;
                }

                if (isset($seenUsernames[$username]) || isset($seenPhones[$phoneNumber])) {
                    $errors[] = ['row' => $rowNum, 'username' => $username, 'error' => 'Duplicate username or phone number in uploaded file'];
                    continue;
                }
                $seenUsernames[$username] = true;
                $seenPhones[$phoneNumber] = true;

                if ($this->existsUsernameOrPhone($username, $phoneNumber)) {
                    $errors[] = ['row' => $rowNum, 'username' => $username, 'error' => 'Username or phone number already exists'];
                    continue;
                }

                $assignedAgentId = null;
                if ($actorRole === 'agent') {
                    $assignedAgentId = $actorId;
                } elseif (in_array($actorRole, ['master_agent', 'super_agent'], true)) {
                    $reqAgent = trim((string) ($row['agentId'] ?? ''));
                    $assignedAgentId = ($reqAgent !== '' && preg_match('/^[a-f0-9]{24}$/i', $reqAgent) === 1) ? $reqAgent : $actorId;
                } else {
                    $reqAgent = trim((string) ($row['agentId'] ?? ''));
                    if ($reqAgent !== '' && preg_match('/^[a-f0-9]{24}$/i', $reqAgent) === 1) {
                        $assignedAgentId = $reqAgent;
                    }
                }

                $fullName = strtoupper(trim((string) ($row['fullName'] ?? '')));
                if ($fullName === '') {
                    $fullName = trim($firstName . ' ' . $lastName);
                    if ($fullName === '') {
                        $fullName = $username;
                    }
                }

                $pendingDocs[] = [
                    'row' => $rowNum,
                    'username' => $username,
                    'doc' => [
                        'username' => $username,
                        'phoneNumber' => $phoneNumber,
                        'password' => password_hash($password, PASSWORD_BCRYPT),
                        'firstName' => $firstName,
                        'lastName' => $lastName,
                        'fullName' => $fullName,
                        'role' => 'user',
                        'status' => 'active',
                        'balance' => $this->numOr($row['balance'] ?? null, 1000),
                        'minBet' => $this->numOr($row['minBet'] ?? null, 1),
                        'maxBet' => $this->numOr($row['maxBet'] ?? null, 5000),
                        'creditLimit' => $this->numOr($row['creditLimit'] ?? null, 1000),
                        'balanceOwed' => $this->numOr($row['balanceOwed'] ?? null, 0),
                        'freeplayBalance' => $this->numOr($row['freeplayBalance'] ?? null, 200),
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
            if ($errors !== []) {
                Response::json([
                    'message' => 'Bulk create validation failed',
                    'total' => $totalSubmitted,
                    'created' => 0,
                    'failed' => count($errors),
                    'errors' => $errors,
                ], 400);
                return;
            }

            $createdRows = [];
            $this->db->beginTransaction();
            try {
                foreach ($pendingDocs as $entry) {
                    $id = $this->db->insertOne('users', $entry['doc']);
                    $createdRows[] = [
                        'row' => (int) ($entry['row'] ?? 0),
                        'id' => $id,
                        'username' => (string) ($entry['username'] ?? ''),
                    ];
                }
                $this->db->commit();
            } catch (Throwable $rowErr) {
                $this->db->rollback();
                Response::json([
                    'message' => 'Bulk create failed and was rolled back',
                    'total' => $totalSubmitted,
                    'created' => 0,
                    'failed' => $totalSubmitted,
                    'errors' => [[
                        'row' => null,
                        'username' => null,
                        'error' => $rowErr->getMessage(),
                    ]],
                ], 500);
                return;
            }

            Response::json([
                'message' => count($createdRows) . ' user(s) created',
                'total' => $totalSubmitted,
                'created' => count($createdRows),
                'failed' => 0,
                'errors' => [],
                'createdRows' => $createdRows,
            ], 201);
        } catch (Throwable $e) {
            Response::json(['message' => 'Server error during bulk creation: ' . $e->getMessage()], 500);
        }
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

                $maxNum = ($type === 'agent') ? 246 : 100;
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
                $doc = [
                    'username' => strtoupper($username),
                    'phoneNumber' => $makePhone(),
                    'password' => password_hash($password, PASSWORD_BCRYPT),
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
                $doc = [
                    'username' => strtoupper($username),
                    'phoneNumber' => $makePhone(),
                    'password' => password_hash($password, PASSWORD_BCRYPT),
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

    private function cleanupWorkflowSeedData(): void
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

        $users = $this->db->findMany('users', $legacyUserQuery, ['projection' => ['_id' => 1]]);
        foreach ($users as $u) {
            $id = (string) ($u['_id'] ?? '');
            if ($id !== '' && preg_match('/^[a-f0-9]{24}$/i', $id) === 1) {
                $this->db->deleteOne('users', ['_id' => MongoRepository::id($id)]);
            }
        }

        $agents = $this->db->findMany('agents', $legacyAgentQuery, ['projection' => ['_id' => 1]]);
        foreach ($agents as $a) {
            $id = (string) ($a['_id'] ?? '');
            if ($id !== '' && preg_match('/^[a-f0-9]{24}$/i', $id) === 1) {
                $this->db->deleteOne('master_agents', ['agentId' => MongoRepository::id($id)]);
                $this->db->deleteOne('agents', ['_id' => MongoRepository::id($id)]);
            }
        }
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

            if (isset($body['phoneNumber']) && trim((string) $body['phoneNumber']) !== '' && (string) $body['phoneNumber'] !== (string) ($user['phoneNumber'] ?? '')) {
                $existingPhone = $this->db->findOne('users', ['phoneNumber' => (string) $body['phoneNumber']]);
                if ($existingPhone !== null && (string) ($existingPhone['_id'] ?? '') !== $id) {
                    Response::json(['message' => 'Phone number already exists'], 409);
                    return;
                }
                $updates['phoneNumber'] = (string) $body['phoneNumber'];
            }
            if (isset($body['password']) && (string) $body['password'] !== '') {
                $updates['password'] = password_hash((string) $body['password'], PASSWORD_BCRYPT);
            }
            if (isset($body['firstName'])) {
                $updates['firstName'] = (string) $body['firstName'];
            }
            if (isset($body['lastName'])) {
                $updates['lastName'] = (string) $body['lastName'];
            }
            if (isset($body['fullName']) && (string) $body['fullName'] !== '') {
                $updates['fullName'] = (string) $body['fullName'];
            } elseif (isset($body['firstName']) || isset($body['lastName'])) {
                $f = (string) ($body['firstName'] ?? ($user['firstName'] ?? ''));
                $l = (string) ($body['lastName'] ?? ($user['lastName'] ?? ''));
                $updates['fullName'] = trim($f . ' ' . $l);
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

            Response::json(['message' => 'User updated successfully', 'user' => $updated]);
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
            if (!array_key_exists('balance', $body) || !is_numeric($body['balance'])) {
                Response::json(['message' => 'Balance is required'], 400);
                return;
            }

            $nextBalance = max(0, (float) $body['balance']);
            $balanceBefore = $this->num($user['balance'] ?? 0);
            $diff = $nextBalance - $balanceBefore;
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

            if (is_array($agent)) {
                $agentBalance = $this->num($agent['balance'] ?? 0);
                if ($diff > 0 && $agentBalance < $diff) {
                    Response::json(['message' => 'Insufficient balance. You need ' . number_format($diff, 2, '.', '') . ' but only have ' . number_format($agentBalance, 2, '.', '')], 400);
                    return;
                }
                $this->db->updateOne('agents', ['_id' => MongoRepository::id((string) $actor['_id'])], [
                    'balance' => $agentBalance - $diff,
                    'updatedAt' => MongoRepository::nowUtc(),
                ]);
            }

            $this->db->updateOne('users', ['_id' => MongoRepository::id($id)], [
                'balance' => $nextBalance,
                'updatedAt' => MongoRepository::nowUtc(),
            ]);

            $this->db->insertOne('transactions', [
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
            ]);

            $pendingBalance = $this->num($user['pendingBalance'] ?? 0);
            $agentBalanceOut = null;
            if (is_array($agent)) {
                $updatedAgent = $this->db->findOne('agents', ['_id' => MongoRepository::id((string) $actor['_id'])], ['projection' => ['balance' => 1]]);
                $agentBalanceOut = $this->num($updatedAgent['balance'] ?? 0);
            }

            $resp = [
                'message' => 'User balance updated',
                'user' => [
                    'id' => $id,
                    'balance' => $nextBalance,
                    'pendingBalance' => $pendingBalance,
                    'availableBalance' => max(0, $nextBalance - $pendingBalance),
                ],
            ];
            if ($agentBalanceOut !== null) {
                $resp['agentBalance'] = $agentBalanceOut;
            }
            Response::json($resp);
        } catch (Throwable $e) {
            Response::json(['message' => 'Server error updating user balance', 'details' => $e->getMessage()], 500);
        }
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
            $agentId = (string) ($foundUser['agentId'] ?? '');
            if ($agentId !== '' && preg_match('/^[a-f0-9]{24}$/i', $agentId) === 1) {
                $agentDoc = $this->db->findOne('agents', ['_id' => MongoRepository::id($agentId)], ['projection' => ['username' => 1]]);
                if ($agentDoc !== null) {
                    $agent = ['username' => $agentDoc['username'] ?? null];
                }
            }

            $referredBy = null;
            $referredByUserId = (string) ($foundUser['referredByUserId'] ?? '');
            if ($referredByUserId !== '' && preg_match('/^[a-f0-9]{24}$/i', $referredByUserId) === 1) {
                $ref = $this->db->findOne('users', ['_id' => MongoRepository::id($referredByUserId)], ['projection' => ['username' => 1, 'fullName' => 1]]);
                if ($ref !== null) {
                    $referredBy = [
                        'id' => (string) ($ref['_id'] ?? ''),
                        'username' => $ref['username'] ?? null,
                        'fullName' => $ref['fullName'] ?? null,
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
            $stats = [
                'totalBets' => 0,
                'totalWagered' => 0.0,
                'totalWon' => 0.0,
                'wins' => 0,
                'losses' => 0,
                'voids' => 0,
                'lastBetDate' => null,
            ];
            foreach ($bets as $bet) {
                $stats['totalBets']++;
                $stats['totalWagered'] += $this->num($bet['amount'] ?? 0);
                $status = (string) ($bet['status'] ?? '');
                if ($status === 'won') {
                    $stats['totalWon'] += $this->num($bet['potentialPayout'] ?? 0);
                    $stats['wins']++;
                } elseif ($status === 'lost') {
                    $stats['losses']++;
                } elseif ($status === 'void') {
                    $stats['voids']++;
                }
                $created = (string) ($bet['createdAt'] ?? '');
                if ($created !== '' && ($stats['lastBetDate'] === null || strtotime($created) > strtotime((string) $stats['lastBetDate']))) {
                    $stats['lastBetDate'] = $created;
                }
            }
            $stats['netProfit'] = $stats['totalWon'] - $stats['totalWagered'];

            Response::json([
                'user' => [
                    '_id' => (string) ($foundUser['_id'] ?? $userId),
                    'username' => $foundUser['username'] ?? null,
                    'firstName' => $foundUser['firstName'] ?? null,
                    'lastName' => $foundUser['lastName'] ?? null,
                    'fullName' => $foundUser['fullName'] ?? null,
                    'phoneNumber' => $foundUser['phoneNumber'] ?? null,
                    'status' => $foundUser['status'] ?? null,
                    'role' => $role,
                    'agentId' => $agentId !== '' ? $agentId : null,
                    'agentUsername' => $agent['username'] ?? null,
                    'balance' => $foundUser['balance'] ?? null,
                    'pendingBalance' => $foundUser['pendingBalance'] ?? 0,
                    'creditLimit' => $foundUser['creditLimit'] ?? null,
                    'balanceOwed' => $foundUser['balanceOwed'] ?? null,
                    'freeplayBalance' => $foundUser['freeplayBalance'] ?? null,
                    'minBet' => $foundUser['minBet'] ?? null,
                    'maxBet' => $foundUser['maxBet'] ?? null,
                    'referredByUserId' => $referredByUserId !== '' ? $referredByUserId : null,
                    'defaultMinBet' => $foundUser['defaultMinBet'] ?? null,
                    'defaultMaxBet' => $foundUser['defaultMaxBet'] ?? null,
                    'defaultCreditLimit' => $foundUser['defaultCreditLimit'] ?? null,
                    'defaultSettleLimit' => $foundUser['defaultSettleLimit'] ?? null,
                    'createdAt' => $foundUser['createdAt'] ?? null,
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
            $startDate = $this->getStartDateFromPeriod($timeQ);
            if ($startDate !== null) {
                $betQuery['createdAt'] = ['$gte' => MongoRepository::utcFromMillis($startDate->getTimestamp() * 1000)];
            }

            $bets = $this->db->findMany('bets', $betQuery, ['sort' => ['createdAt' => -1], 'limit' => $limit]);
            $matchMap = [];
            $agentMap = [];
            $formatted = [];
            $totalRisk = 0.0;
            $totalToWin = 0.0;

            foreach ($bets as $bet) {
                $uid = (string) ($bet['userId'] ?? '');
                $user = $userMap[$uid] ?? null;
                $aid = (string) (($user['agentId'] ?? ''));

                if ($aid !== '' && !isset($agentMap[$aid]) && preg_match('/^[a-f0-9]{24}$/i', $aid) === 1) {
                    $agentMap[$aid] = $this->db->findOne('agents', ['_id' => MongoRepository::id($aid)], ['projection' => ['username' => 1]]);
                }

                $mid = (string) ($bet['matchId'] ?? '');
                if ($mid !== '' && !isset($matchMap[$mid]) && preg_match('/^[a-f0-9]{24}$/i', $mid) === 1) {
                    $matchMap[$mid] = $this->db->findOne('matches', ['_id' => MongoRepository::id($mid)], ['projection' => ['homeTeam' => 1, 'awayTeam' => 1, 'sport' => 1]]);
                }
                $match = $matchMap[$mid] ?? null;

                $risk = $this->num($bet['amount'] ?? 0);
                $toWin = $this->num($bet['potentialPayout'] ?? 0);
                $totalRisk += $risk;
                $totalToWin += $toWin;

                $formatted[] = [
                    'id' => (string) ($bet['_id'] ?? ''),
                    'userId' => $uid !== '' ? $uid : null,
                    'username' => $user['username'] ?? null,
                    'agent' => $agentMap[$aid]['username'] ?? null,
                    'amount' => $risk,
                    'odds' => $this->num($bet['odds'] ?? 0),
                    'potentialPayout' => $toWin,
                    'type' => $bet['type'] ?? null,
                    'selection' => $bet['selection'] ?? null,
                    'status' => $bet['status'] ?? null,
                    'createdAt' => $bet['createdAt'] ?? null,
                    'match' => $match !== null ? [
                        'id' => $mid,
                        'homeTeam' => $match['homeTeam'] ?? null,
                        'awayTeam' => $match['awayTeam'] ?? null,
                        'sport' => $match['sport'] ?? null,
                    ] : null,
                    'risk' => $risk,
                    'toWin' => $toWin,
                ];
            }

            Response::json(['bets' => $formatted, 'totals' => ['risk' => $totalRisk, 'toWin' => $totalToWin]]);
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
            $status = (string) ($body['status'] ?? 'pending');

            if ($userId === '' || $matchId === '' || !is_numeric($amount) || !is_numeric($odds) || $type === '' || $selection === '') {
                Response::json(['message' => 'userId, matchId, amount, odds, type, and selection are required'], 400);
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

            $potential = $betAmount * $betOdds;
            $doc = [
                'userId' => MongoRepository::id($userId),
                'matchId' => MongoRepository::id($matchId),
                'amount' => $betAmount,
                'odds' => $betOdds,
                'type' => $type,
                'selection' => $selection,
                'potentialPayout' => $potential,
                'status' => $status === '' ? 'pending' : $status,
                'createdAt' => MongoRepository::nowUtc(),
                'updatedAt' => MongoRepository::nowUtc(),
            ];
            $id = $this->db->insertOne('bets', $doc);
            $bet = $this->db->findOne('bets', ['_id' => MongoRepository::id($id)]) ?? array_merge($doc, ['_id' => $id]);

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
                    'status' => $bet['status'] ?? $status,
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

            $bet = $this->db->findOne('bets', ['_id' => MongoRepository::id($id)]);
            if ($bet === null) {
                Response::json(['message' => 'Bet not found'], 404);
                return;
            }
            if (($bet['status'] ?? '') !== 'pending') {
                Response::json(['message' => 'Only pending bets can be deleted'], 400);
                return;
            }

            $userId = (string) ($bet['userId'] ?? '');
            $user = $userId !== '' ? $this->db->findOne('users', ['_id' => MongoRepository::id($userId)], ['projection' => ['agentId' => 1, 'username' => 1]]) : null;
            if (($actor['role'] ?? '') === 'agent' && (string) ($user['agentId'] ?? '') !== (string) ($actor['_id'] ?? '')) {
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
                    Response::json(['message' => 'You can only delete bets within your hierarchy'], 403);
                    return;
                }
            }

            $sport = 'Unknown';
            $matchId = (string) ($bet['matchId'] ?? '');
            if ($matchId !== '' && preg_match('/^[a-f0-9]{24}$/i', $matchId) === 1) {
                $match = $this->db->findOne('matches', ['_id' => MongoRepository::id($matchId)], ['projection' => ['sport' => 1]]);
                $sport = (string) ($match['sport'] ?? 'Unknown');
            }

            $this->db->insertOne('deletedwagers', [
                'userId' => $userId !== '' ? MongoRepository::id($userId) : null,
                'betId' => MongoRepository::id($id),
                'amount' => $this->num($bet['amount'] ?? 0),
                'sport' => $sport,
                'reason' => trim('Deleted by ' . (string) ($actor['role'] ?? '') . ' ' . (string) ($actor['username'] ?? '')),
                'status' => 'deleted',
                'deletedAt' => MongoRepository::nowUtc(),
                'createdAt' => MongoRepository::nowUtc(),
                'updatedAt' => MongoRepository::nowUtc(),
            ]);

            $this->db->deleteOne('bets', ['_id' => MongoRepository::id($id)]);
            Response::json(['message' => 'Bet deleted successfully', 'id' => $id]);
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
                    'avgRisk' => (float) number_format($avgRisk, 2, '.', ''),
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
            $results = OddsSyncService::updateMatches($this->db);
            Response::json(['message' => 'Odds refreshed successfully', 'results' => $results]);
        } catch (Throwable $e) {
            Response::json(['message' => 'Server error refreshing odds'], 500);
        }
    }

    private function fetchOddsManual(): void
    {
        try {
            $actor = $this->protect(['admin']);
            if ($actor === null) {
                return;
            }
            $results = OddsSyncService::updateMatches($this->db);
            Response::json(['message' => 'Manual odds fetch completed', 'results' => $results]);
        } catch (Throwable $e) {
            Response::json(['message' => 'Server error manual odds fetch'], 500);
        }
    }

    private function clearCache(): void
    {
        try {
            $actor = $this->protect(['admin']);
            if ($actor === null) {
                return;
            }
            Response::json(['message' => 'Cache cleared']);
        } catch (Throwable $e) {
            Response::json(['message' => 'Server error clearing cache'], 500);
        }
    }

    private function sumSignedTransactions(array $transactions): float
    {
        $sum = 0.0;
        foreach ($transactions as $tx) {
            $amount = $this->num($tx['amount'] ?? 0);
            $type = (string) ($tx['type'] ?? '');
            if (in_array($type, ['withdrawal', 'bet_placed'], true)) {
                $sum += (-1 * $amount);
            } else {
                $sum += $amount;
            }
        }
        return $sum;
    }

    private function getSignedTransactionAmount(array $transaction): float
    {
        $amount = $this->num($transaction['amount'] ?? 0);
        return match ((string) ($transaction['type'] ?? '')) {
            'deposit', 'bet_won', 'bet_refund' => $amount,
            'withdrawal', 'bet_placed' => -$amount,
            default => 0.0,
        };
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

    private function existsUsernameOrPhone(string $username, string $phoneNumber): bool
    {
        $query = ['$or' => [['username' => $username], ['phoneNumber' => $phoneNumber]]];
        return $this->db->findOne('users', $query) !== null
            || $this->db->findOne('admins', $query) !== null
            || $this->db->findOne('agents', $query) !== null;
    }

    private function numOr(mixed $value, float $fallback): float
    {
        return is_numeric($value) ? (float) $value : $fallback;
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
        $weekday = (int) $date->format('N'); // 1..7
        return $date->setTime(0, 0, 0)->modify('-' . ($weekday - 1) . ' days');
    }

    private function buildAgentTree(string $parentId, string $parentModel): array
    {
        $nodes = [];

        $subAgents = $this->db->findMany('agents', [
            'createdBy' => MongoRepository::id($parentId),
            'createdByModel' => $parentModel,
        ], ['sort' => ['username' => 1]]);

        foreach ($subAgents as $agent) {
            $agentId = (string) ($agent['_id'] ?? '');
            $username = (string) ($agent['username'] ?? '');
            $nodes[] = [
                'id' => $agentId,
                'username' => $username,
                'role' => $agent['role'] ?? null,
                'isDead' => strtoupper($username) === 'DEAD',
                'children' => $this->buildAgentTree($agentId, 'Agent'),
            ];
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
