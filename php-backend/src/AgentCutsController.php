<?php

declare(strict_types=1);

/**
 * Admin-only endpoint that aggregates each downline agent's 5% house cut
 * from real transactions for a selectable period (week / quarter / lifetime).
 *
 * Lives in its own controller to avoid depending on the opcache state of
 * any previously-loaded AgentController bytecode on production PHP hosts.
 */
final class AgentCutsController
{
    private const HOUSE_CUT_PCT = 5.0;
    private const FEE_PER_PLAYER = 4.0;

    private SqlRepository $db;
    private string $jwtSecret;

    public function __construct(SqlRepository $db, string $jwtSecret)
    {
        $this->db = $db;
        $this->jwtSecret = $jwtSecret;
    }

    public function handle(string $method, string $path): bool
    {
        if ($method === 'GET' && $path === '/api/admin/agent-cuts') {
            $this->getAgentCuts();
            return true;
        }
        return false;
    }

    private function getAgentCuts(): void
    {
        try {
            $actor = $this->protectAdminOrMaster();
            if ($actor === null) {
                return;
            }
            $actorRole = strtolower(trim((string) ($actor['role'] ?? '')));
            $actorId = (string) ($actor['id'] ?? '');
            $actorUsername = strtoupper(trim((string) ($actor['username'] ?? '')));
            $actorPercent = ($actorRole === 'admin')
                ? 100.0
                : (isset($actor['agentPercent']) ? (float) $actor['agentPercent'] : null);

            $periodType = strtolower(trim((string) ($_GET['periodType'] ?? 'week')));
            if (!in_array($periodType, ['week', 'quarter', 'yearly', 'lifetime'], true)) {
                $periodType = 'week';
            }

            $tz = new \DateTimeZone('America/Los_Angeles');
            $now = new DateTimeImmutable('now', $tz);
            $periodStart = null;
            $periodEnd = null;
            $periodLabel = '';

            // The second column ("2026") shows year-to-date for the actor's
            // current calendar year. Computed here so the same bounds are
            // reused across all period-tab selections.
            $ytdStart = new DateTimeImmutable($now->format('Y') . '-01-01 00:00:00', $tz);
            $ytdEnd   = $ytdStart->modify('+1 year');
            $ytdLabel = $now->format('Y');

            if ($periodType === 'week') {
                $weekStartRaw = trim((string) ($_GET['weekStart'] ?? ''));
                if ($weekStartRaw !== '' && preg_match('/^\d{4}-\d{2}-\d{2}$/', $weekStartRaw) === 1) {
                    $periodStart = new DateTimeImmutable($weekStartRaw . ' 00:00:00', $tz);
                } else {
                    $weekday = (int) $now->format('N');
                    $daysFromTuesday = ($weekday + 5) % 7;
                    $periodStart = $now->setTime(0, 0, 0)->modify('-' . $daysFromTuesday . ' days');
                }
                $periodEnd = $periodStart->modify('+7 days');
                $periodLabel = $periodStart->format('M j') . ' - ' . $periodStart->modify('+6 days')->format('M j');
            } elseif ($periodType === 'quarter') {
                $quarter = (int) ($_GET['quarter'] ?? (int) ceil(((int) $now->format('n')) / 3));
                if ($quarter < 1 || $quarter > 4) {
                    $quarter = (int) ceil(((int) $now->format('n')) / 3);
                }
                $year = (int) ($_GET['year'] ?? (int) $now->format('Y'));
                $startMonth = (($quarter - 1) * 3) + 1;
                $periodStart = new DateTimeImmutable(sprintf('%04d-%02d-01 00:00:00', $year, $startMonth), $tz);
                $periodEnd = $periodStart->modify('+3 months');
                $periodLabel = 'Q' . $quarter;
            } elseif ($periodType === 'yearly') {
                $year = (int) ($_GET['year'] ?? (int) $now->format('Y'));
                if ($year < 2000 || $year > 2100) {
                    $year = (int) $now->format('Y');
                }
                $periodStart = new DateTimeImmutable(sprintf('%04d-01-01 00:00:00', $year), $tz);
                $periodEnd = $periodStart->modify('+1 year');
                $periodLabel = (string) $year;
            } else {
                // 'lifetime' kept for backwards compat — same as yearly for current year
                $periodStart = $ytdStart;
                $periodEnd   = $ytdEnd;
                $periodLabel = $ytdLabel;
            }

            // 1. Walk the downline tree. For admin we start from all top-level
            //    agents (createdByModel = Admin); for master/super agent we
            //    start from their direct children (createdBy = actorId).
            $allAgents = [];
            $parentMap = []; // childId => parentId (null = top-level for this actor)
            $queue = [];

            if ($actorRole === 'admin') {
                $topLevel = $this->db->findMany('agents', [
                    'createdByModel' => 'Admin',
                ], ['sort' => ['createdAt' => -1]]);
                foreach ($topLevel as $a) {
                    $aid = (string) ($a['id'] ?? '');
                    if ($aid !== '') {
                        $allAgents[$aid] = $a;
                        $parentMap[$aid] = null;
                        $queue[] = $aid;
                    }
                }
            } else {
                // master_agent / super_agent — only their direct downline
                $directChildren = $this->db->findMany('agents', [
                    'createdBy' => SqlRepository::id($actorId),
                    'createdByModel' => 'Agent',
                ], ['sort' => ['createdAt' => -1]]);
                foreach ($directChildren as $a) {
                    $aid = (string) ($a['id'] ?? '');
                    if ($aid !== '') {
                        $allAgents[$aid] = $a;
                        $parentMap[$aid] = $actorId;
                        $queue[] = $aid;
                    }
                }
            }

            while (count($queue) > 0) {
                $currentId = array_shift($queue);
                $role = strtolower(trim((string) ($allAgents[$currentId]['role'] ?? '')));
                if ($role !== 'master_agent' && $role !== 'super_agent') {
                    continue;
                }
                $children = $this->db->findMany('agents', [
                    'createdBy' => SqlRepository::id($currentId),
                    'createdByModel' => 'Agent',
                ], ['sort' => ['createdAt' => -1]]);
                foreach ($children as $child) {
                    $childId = (string) ($child['id'] ?? '');
                    if ($childId !== '' && !isset($allAgents[$childId])) {
                        $allAgents[$childId] = $child;
                        $parentMap[$childId] = $currentId;
                        $queue[] = $childId;
                    }
                }
            }

            // 1b. Compute which direct-child-of-actor each descendant sits under
            //     and that direct child's agentPercent — used to calculate the
            //     cascading cut per downline agent.
            $directChildPctMap = [];
            foreach ($allAgents as $aid => $a) {
                $parent = $parentMap[$aid] ?? null;
                if ($actorRole === 'admin' && $parent === null) {
                    $directChildPctMap[$aid] = isset($a['agentPercent']) ? (float) $a['agentPercent'] : null;
                } elseif ($actorRole !== 'admin' && $parent === $actorId) {
                    $directChildPctMap[$aid] = isset($a['agentPercent']) ? (float) $a['agentPercent'] : null;
                }
            }
            $agentToBranchPct = [];
            foreach (array_keys($allAgents) as $aid) {
                $current = $aid;
                $visited = [];
                while ($current !== null && !isset($visited[$current])) {
                    $visited[$current] = true;
                    if (isset($directChildPctMap[$current])) {
                        $agentToBranchPct[$aid] = $directChildPctMap[$current];
                        break;
                    }
                    $current = $parentMap[$current] ?? null;
                }
            }

            if (count($allAgents) === 0) {
                Response::json([
                    'period'  => ['type' => $periodType, 'label' => $periodLabel],
                    'agents'  => [],
                    'totals'  => ['owedAmount' => 0.0, 'periodAmount' => 0.0, 'ytdAmount' => 0.0, 'lifetimeAmount' => 0.0, 'makeupAmount' => 0.0],
                ]);
                return;
            }

            // 2. Build userId → agentId map
            $allAgentObjectIds = [];
            foreach (array_keys($allAgents) as $aid) {
                if (preg_match('/^[a-f0-9]{24}$/i', $aid) === 1) {
                    $allAgentObjectIds[] = SqlRepository::id($aid);
                }
            }
            $userIdToAgentId = [];
            if (count($allAgentObjectIds) > 0) {
                $allUsers = $this->db->findMany('users', [
                    'role' => 'user',
                    '$or' => [
                        ['agentId' => ['$in' => $allAgentObjectIds]],
                        ['createdBy' => ['$in' => $allAgentObjectIds], 'createdByModel' => 'Agent'],
                    ],
                ], ['projection' => ['id' => 1, 'agentId' => 1, 'createdBy' => 1, 'createdByModel' => 1, 'balance' => 1]]);
                $allAgentIdSet = array_flip(array_keys($allAgents));
                foreach ($allUsers as $u) {
                    $uid = (string) ($u['id'] ?? '');
                    if ($uid === '') continue;
                    $uAgentId = (string) ($u['agentId'] ?? '');
                    if ($uAgentId === '' || !isset($allAgentIdSet[$uAgentId])) {
                        $uAgentId = (string) ($u['createdBy'] ?? '');
                    }
                    if ($uAgentId !== '' && isset($allAgentIdSet[$uAgentId])) {
                        $userIdToAgentId[$uid] = $uAgentId;
                    }
                }
            }

            // 3. Fetch all completed deposit/withdrawal transactions for scoped users
            $periodNetByAgent = [];
            $ytdNetByAgent = [];
            $lifetimeNetByAgent = []; // all-time
            $weeklySettlementByAgent = [];
            if (count($userIdToAgentId) > 0) {
                $userObjectIds = [];
                foreach (array_keys($userIdToAgentId) as $uid) {
                    if (preg_match('/^[a-f0-9]{24}$/i', $uid) === 1) {
                        $userObjectIds[] = SqlRepository::id($uid);
                    }
                }
                if (count($userObjectIds) > 0) {
                    $allTx = $this->db->findMany('transactions', [
                        'status' => 'completed',
                        'userId' => ['$in' => $userObjectIds],
                        'type'   => ['$in' => ['deposit', 'withdrawal']],
                    ], [
                        'projection' => ['userId' => 1, 'type' => 1, 'amount' => 1, 'createdAt' => 1, 'referenceType' => 1],
                    ]);

                    $periodStartMs = $periodStart->getTimestamp() * 1000;
                    $periodEndMs   = $periodEnd->getTimestamp() * 1000;
                    $ytdStartMs    = $ytdStart->getTimestamp() * 1000;
                    $ytdEndMs      = $ytdEnd->getTimestamp() * 1000;

                    foreach ($allTx as $tx) {
                        $refType = trim((string) ($tx['referenceType'] ?? ''));
                        if ($refType === 'AgentFunding') {
                            continue;
                        }
                        $txUserId = (string) ($tx['userId'] ?? '');
                        if ($txUserId === '') continue;
                        $uAgentId = $userIdToAgentId[$txUserId] ?? '';
                        if ($uAgentId === '') continue;

                        $txMs = $this->extractTxMillis($tx['createdAt'] ?? null);
                        if ($txMs === null) continue;

                        $txType = strtolower(trim((string) ($tx['type'] ?? '')));
                        $amt = abs((float) ($tx['amount'] ?? 0));
                        if ($txType === 'withdrawal') {
                            $amt *= -1;
                        }

                        // All-time bucket (Weekly tab's "Lifetime" column)
                        $lifetimeNetByAgent[$uAgentId] = ($lifetimeNetByAgent[$uAgentId] ?? 0.0) + $amt;

                        // Year-to-date bucket (Quarterly tab's "2026" column)
                        if ($txMs >= $ytdStartMs && $txMs < $ytdEndMs) {
                            $ytdNetByAgent[$uAgentId] = ($ytdNetByAgent[$uAgentId] ?? 0.0) + $amt;
                        }

                        // Period bucket (week / quarter / yearly selection)
                        if ($txMs >= $periodStartMs && $txMs < $periodEndMs) {
                            $periodNetByAgent[$uAgentId] = ($periodNetByAgent[$uAgentId] ?? 0.0) + $amt;
                        }
                    }
                }

                if ($periodType === 'week') {
                    $weeklySettlementByAgent = $this->computeWeeklySettlementByAgent(
                        $allAgents,
                        $allUsers,
                        $userIdToAgentId,
                        $periodStart,
                        $periodEnd
                    );
                }
            }

            // 4. Build the flat list (only role=agent). Cut% depends on the
            //    actor's role and position relative to this downline agent:
            //      - admin: fixed 5% (house cut)
            //      - front-line master (same person as agent's MA): full
            //        contract percent
            //      - master_agent: actorPercent - directChildBranchPercent
            $flatAgents = [];
            $totalPeriodAmount = 0.0;
            $totalYtdAmount = 0.0;
            $totalLifetimeAmount = 0.0;
            $totalOwedAmount = 0.0;
            $totalMakeupAmount = 0.0;
            foreach ($allAgents as $aid => $a) {
                $role = strtolower(trim((string) ($a['role'] ?? '')));
                if ($role !== 'agent') continue;

                $aUsername = strtoupper(trim((string) ($a['username'] ?? '')));
                $agentOwnPct = isset($a['agentPercent']) ? (float) $a['agentPercent'] : null;
                $maUsername = $aUsername . 'MA';
                $isFrontLine = $actorRole !== 'admin' && $actorUsername !== '' && $maUsername === $actorUsername;

                if ($actorRole === 'admin') {
                    $cutPct = self::HOUSE_CUT_PCT;
                } elseif ($isFrontLine) {
                    $cutPct = $agentOwnPct;
                } else {
                    $branchPct = $agentToBranchPct[$aid] ?? null;
                    $cutPct = ($actorPercent !== null && $branchPct !== null)
                        ? round($actorPercent - $branchPct, 2)
                        : $agentOwnPct;
                }
                if ($cutPct === null) $cutPct = 0.0;

                $periodNet = round($periodNetByAgent[$aid] ?? 0.0, 2);
                $ytdNet = round($ytdNetByAgent[$aid] ?? 0.0, 2);
                $lifetimeNet = round($lifetimeNetByAgent[$aid] ?? 0.0, 2);
                $settlement = $weeklySettlementByAgent[$aid] ?? [];
                $weeklyCommissionableProfit = round($settlement['commissionableProfit'] ?? 0.0, 2);
                $periodBasis = $periodType === 'week'
                    ? $weeklyCommissionableProfit
                    : $periodNet;
                $periodAmount = round($cutPct / 100 * $periodBasis, 2);
                $ytdAmount = round($cutPct / 100 * $ytdNet, 2);
                $lifetimeAmount = round($cutPct / 100 * $lifetimeNet, 2);
                $owedAmount = round($settlement['owedAmount'] ?? 0.0, 2);
                $makeupAmount = round($settlement['makeupAmount'] ?? 0.0, 2);
                $totalPeriodAmount += $periodAmount;
                $totalYtdAmount += $ytdAmount;
                $totalLifetimeAmount += $lifetimeAmount;
                $totalOwedAmount += $owedAmount;
                $totalMakeupAmount += $makeupAmount;

                $flatAgents[] = [
                    'id'             => $aid,
                    'username'       => $a['username'] ?? null,
                    'myCut'          => $cutPct,
                    'periodNet'      => $periodNet,
                    'ytdNet'         => $ytdNet,
                    'lifetimeNet'    => $lifetimeNet,
                    'owedAmount'     => $owedAmount,
                    'makeupAmount'   => $makeupAmount,
                    'periodAmount'   => $periodAmount,
                    'ytdAmount'      => $ytdAmount,
                    'lifetimeAmount' => $lifetimeAmount,
                ];
            }

            usort($flatAgents, function ($a, $b) {
                $cmp = ($b['lifetimeAmount'] ?? 0) <=> ($a['lifetimeAmount'] ?? 0);
                if ($cmp !== 0) return $cmp;
                return strcasecmp((string) ($a['username'] ?? ''), (string) ($b['username'] ?? ''));
            });

            Response::json([
                'period' => [
                    'type'  => $periodType,
                    'label' => $periodLabel,
                    'start' => $periodStart ? $periodStart->format(DATE_ATOM) : null,
                    'end'   => $periodEnd ? $periodEnd->format(DATE_ATOM) : null,
                ],
                'ytdLabel' => $ytdLabel,
                'agents' => $flatAgents,
                'totals' => [
                    'owedAmount'     => round($totalOwedAmount, 2),
                    'periodAmount'   => round($totalPeriodAmount, 2),
                    'ytdAmount'      => round($totalYtdAmount, 2),
                    'lifetimeAmount' => round($totalLifetimeAmount, 2),
                    'makeupAmount'   => round($totalMakeupAmount, 2),
                ],
            ]);
        } catch (Throwable $e) {
            error_log('[AGENT_CUTS_ERROR] ' . $e->getMessage());
            Response::json(['message' => 'Server error fetching agent cuts'], 500);
        }
    }

    private function protectAdminOrMaster(): ?array
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
        if (!in_array($role, ['admin', 'master_agent', 'super_agent'], true)) {
            Response::json(['message' => 'User role ' . $role . ' is not authorized to access this route'], 403);
            return null;
        }
        $id = (string) ($decoded['id'] ?? '');
        if ($id === '' || preg_match('/^[a-f0-9]{24}$/i', $id) !== 1) {
            Response::json(['message' => 'Not authorized, token failed: invalid user id'], 401);
            return null;
        }
        $collection = $role === 'admin' ? 'admins' : 'agents';
        $actor = $this->db->findOne($collection, ['id' => SqlRepository::id($id)]);
        if ($actor === null) {
            Response::json(['message' => 'Not authorized, user not found'], 403);
            return null;
        }
        if (($actor['status'] ?? '') === 'suspended') {
            Response::json(['message' => 'Not authorized, account suspended'], 403);
            return null;
        }
        // Ensure role from DB is respected in downstream logic
        if (!isset($actor['role']) || $actor['role'] === '') {
            $actor['role'] = $role;
        }
        return $actor;
    }

    private function extractTxMillis($raw): ?int
    {
        if ($raw === null) return null;
        if (is_numeric($raw)) {
            $n = (float) $raw;
            return $n > 1_000_000_000_000 ? (int) $n : (int) ($n * 1000);
        }
        if (is_array($raw)) {
            if (isset($raw['$date'])) return $this->extractTxMillis($raw['$date']);
            if (isset($raw['date']))  return $this->extractTxMillis($raw['date']);
            return null;
        }
        if (is_string($raw) && $raw !== '') {
            try {
                return (new DateTimeImmutable($raw))->getTimestamp() * 1000;
            } catch (Throwable $e) {
                return null;
            }
        }
        return null;
    }

    /**
     * @param array<string, array<string, mixed>> $allAgents
     * @param array<int, array<string, mixed>> $allUsers
     * @param array<string, string> $userIdToAgentId
     * @return array<string, float>
     */
    private function computeWeeklySettlementByAgent(
        array $allAgents,
        array $allUsers,
        array $userIdToAgentId,
        DateTimeImmutable $weekStart,
        DateTimeImmutable $weekEnd
    ): array {
        $settlementByAgent = [];
        if (count($userIdToAgentId) === 0) {
            return $settlementByAgent;
        }

        $usernameToAgentId = [];
        $rowAgentIds = [];
        foreach ($allAgents as $aid => $agent) {
            $username = strtoupper(trim((string) ($agent['username'] ?? '')));
            if ($username !== '') {
                $usernameToAgentId[$username] = $aid;
            }
            if (strtolower(trim((string) ($agent['role'] ?? ''))) === 'agent') {
                $rowAgentIds[$aid] = true;
            }
        }
        if (count($rowAgentIds) === 0) {
            return $settlementByAgent;
        }

        $userObjectIds = [];
        foreach (array_keys($userIdToAgentId) as $uid) {
            if (preg_match('/^[a-f0-9]{24}$/i', $uid) === 1) {
                $userObjectIds[] = SqlRepository::id($uid);
            }
        }
        if (count($userObjectIds) === 0) {
            return $settlementByAgent;
        }

        (new AgentSettlementSnapshotService($this->db))->ensurePreviousWeekSnapshotsForAgentRows(
            $allAgents,
            $userIdToAgentId,
            $weekStart
        );

        $weekTx = $this->db->findMany('transactions', [
            'status' => 'completed',
            'createdAt' => [
                '$gte' => SqlRepository::utcFromMillis($weekStart->getTimestamp() * 1000),
                '$lt' => SqlRepository::utcFromMillis($weekEnd->getTimestamp() * 1000),
            ],
            'userId' => ['$in' => $userObjectIds],
        ], [
            'projection' => [
                'userId' => 1,
                'amount' => 1,
                'type' => 1,
                'entrySide' => 1,
                'reason' => 1,
                'description' => 1,
                'balanceBefore' => 1,
                'balanceAfter' => 1,
                'approvedByRole' => 1,
                'adminId' => 1,
                'referenceType' => 1,
            ],
            'sort' => ['createdAt' => 1],
        ]);

        $userBalanceById = [];
        foreach ($allUsers as $user) {
            $uid = (string) ($user['id'] ?? '');
            if ($uid !== '') {
                $userBalanceById[$uid] = $this->num($user['balance'] ?? 0);
            }
        }

        $missingRoleAdminIds = [];
        $activeUserNetsByAgent = [];
        $weekEndingBalanceByUser = [];
        foreach ($weekTx as $tx) {
            $txType = strtolower(trim((string) ($tx['type'] ?? '')));
            $txUserId = (string) ($tx['userId'] ?? '');
            $agentId = $userIdToAgentId[$txUserId] ?? '';

            if (($txType === 'deposit' || $txType === 'withdrawal') && !$this->isAgentFundingTransaction($tx)) {
                $approverRole = trim((string) ($tx['approvedByRole'] ?? ''));
                if ($approverRole === '') {
                    $aid = (string) ($tx['adminId'] ?? '');
                    if ($aid !== '' && preg_match('/^[a-f0-9]{24}$/i', $aid) === 1) {
                        $missingRoleAdminIds[$aid] = true;
                    }
                }
            }

            if ($agentId !== '' && $this->isWeeklyActiveTransaction($tx)) {
                $signed = $this->getComprehensiveSignedTransactionAmount($tx);
                if (!isset($activeUserNetsByAgent[$agentId])) {
                    $activeUserNetsByAgent[$agentId] = [];
                }
                $activeUserNetsByAgent[$agentId][$txUserId] = ($activeUserNetsByAgent[$agentId][$txUserId] ?? 0.0) + $signed;
                if (array_key_exists('balanceAfter', $tx)) {
                    $weekEndingBalanceByUser[$txUserId] = $this->num($tx['balanceAfter']);
                }
            }
        }

        $resolvedRoles = [];
        if (count($missingRoleAdminIds) > 0) {
            $lookupIds = array_map(static fn (string $id): string => SqlRepository::id($id), array_keys($missingRoleAdminIds));
            $foundAgents = $this->db->findMany('agents', ['id' => ['$in' => $lookupIds]], ['projection' => ['id' => 1, 'role' => 1]]);
            foreach ($foundAgents as $agentDoc) {
                $resolvedRoles[(string) ($agentDoc['id'] ?? '')] = strtolower(trim((string) ($agentDoc['role'] ?? 'agent')));
            }
            $foundAdmins = $this->db->findMany('admins', ['id' => ['$in' => $lookupIds]], ['projection' => ['id' => 1]]);
            foreach ($foundAdmins as $adminDoc) {
                $resolvedRoles[(string) ($adminDoc['id'] ?? '')] = 'admin';
            }
        }

        $linkedApproverIdsByAgent = [];
        foreach (array_keys($rowAgentIds) as $agentId) {
            $linkedApproverIdsByAgent[$agentId] = [$agentId => true];
            $username = strtoupper(trim((string) ($allAgents[$agentId]['username'] ?? '')));
            $linkedUsername = $username !== '' ? ($username . 'MA') : '';
            $linkedId = $linkedUsername !== '' ? ($usernameToAgentId[$linkedUsername] ?? '') : '';
            if ($linkedId !== '' && preg_match('/^[a-f0-9]{24}$/i', $linkedId) === 1) {
                $linkedApproverIdsByAgent[$agentId][$linkedId] = true;
            }
        }

        $agentDepositsByAgent = [];
        $agentWithdrawalsByAgent = [];
        $houseDepositsByAgent = [];
        $houseWithdrawalsByAgent = [];
        foreach ($weekTx as $tx) {
            $txType = strtolower(trim((string) ($tx['type'] ?? '')));
            if ($txType !== 'deposit' && $txType !== 'withdrawal') {
                continue;
            }
            if ($this->isAgentFundingTransaction($tx)) {
                continue;
            }

            $txUserId = (string) ($tx['userId'] ?? '');
            $agentId = $userIdToAgentId[$txUserId] ?? '';
            if ($agentId === '' || !isset($rowAgentIds[$agentId])) {
                continue;
            }

            $approverRole = strtolower(trim((string) ($tx['approvedByRole'] ?? '')));
            if ($approverRole === '') {
                $aid = (string) ($tx['adminId'] ?? '');
                $approverRole = $resolvedRoles[$aid] ?? '';
            }
            $amt = $this->num($tx['amount'] ?? 0);
            $aid = (string) ($tx['adminId'] ?? '');
            $bucket = AgentSettlementRules::classifyScopedApprover(
                $approverRole,
                $aid,
                $linkedApproverIdsByAgent[$agentId] ?? [],
                true
            );

            if ($bucket === 'agent') {
                if ($txType === 'deposit') {
                    $agentDepositsByAgent[$agentId] = ($agentDepositsByAgent[$agentId] ?? 0.0) + $amt;
                } else {
                    $agentWithdrawalsByAgent[$agentId] = ($agentWithdrawalsByAgent[$agentId] ?? 0.0) + $amt;
                }
            } else {
                if ($txType === 'deposit') {
                    $houseDepositsByAgent[$agentId] = ($houseDepositsByAgent[$agentId] ?? 0.0) + $amt;
                } else {
                    $houseWithdrawalsByAgent[$agentId] = ($houseWithdrawalsByAgent[$agentId] ?? 0.0) + $amt;
                }
            }
        }

        $weekStartStr = $weekStart->format('Y-m-d\TH:i:s\Z');
        $priorSnapshots = $this->db->findMany('settlement_snapshots', [
            'agentId' => ['$in' => array_keys($rowAgentIds)],
            'weekStartStr' => ['$lt' => $weekStartStr],
        ], [
            'sort' => ['weekStartStr' => -1],
            'projection' => ['agentId' => 1, 'closingMakeup' => 1, 'closingBalanceOwed' => 1],
        ]);
        $carryForwardByAgent = [];
        foreach ($priorSnapshots as $snapshot) {
            $agentId = (string) ($snapshot['agentId'] ?? '');
            if ($agentId === '' || isset($carryForwardByAgent[$agentId])) {
                continue;
            }
            $carryForwardByAgent[$agentId] = [
                'previousMakeup' => $this->num($snapshot['closingMakeup'] ?? 0),
                'previousBalanceOwed' => $this->num($snapshot['closingBalanceOwed'] ?? 0),
            ];
        }

        foreach (array_keys($rowAgentIds) as $agentId) {
            $activePositive = 0;
            $activeNonPositive = 0;
            $activeUsers = $activeUserNetsByAgent[$agentId] ?? [];
            foreach ($activeUsers as $uid => $net) {
                if (abs($net) <= 0.001) {
                    continue;
                }
                $balance = $weekEndingBalanceByUser[$uid] ?? ($userBalanceById[$uid] ?? 0.0);
                if ($balance > 0) {
                    $activePositive++;
                } else {
                    $activeNonPositive++;
                }
            }

            $carryForward = $carryForwardByAgent[$agentId] ?? [
                'previousMakeup' => 0.0,
                'previousBalanceOwed' => 0.0,
            ];
            $agentPercent = isset($allAgents[$agentId]['agentPercent']) ? (float) $allAgents[$agentId]['agentPercent'] : null;
            $summary = AgentSettlementRules::summarize(
                ($agentDepositsByAgent[$agentId] ?? 0.0) - ($agentWithdrawalsByAgent[$agentId] ?? 0.0),
                ($houseDepositsByAgent[$agentId] ?? 0.0) - ($houseWithdrawalsByAgent[$agentId] ?? 0.0),
                $activePositive * self::FEE_PER_PLAYER,
                $activeNonPositive * self::FEE_PER_PLAYER,
                $agentPercent,
                $carryForward['previousMakeup'],
                $carryForward['previousBalanceOwed']
            );
            $summary = $this->applySettlementBalanceAdjustments($summary, $agentId, $weekStart);
            $fundingAdjustment = $this->getAgentFundingAdjustment($agentId, $weekStart, $weekEnd);
            $summary['balanceOwed'] = round($this->num($summary['balanceOwed'] ?? 0) - $fundingAdjustment, 2);
            $settlementByAgent[$agentId] = [
                'owedAmount' => round($this->num($summary['balanceOwed'] ?? 0), 2),
                'makeupAmount' => round($this->num($summary['cumulativeMakeup'] ?? 0), 2),
                'commissionableProfit' => round($this->num($summary['commissionableProfit'] ?? 0), 2),
            ];
        }

        return $settlementByAgent;
    }

    private function getSettlementBalanceAdjustmentTotal(string $agentId, DateTimeImmutable $weekStart): float
    {
        if ($agentId === '' || preg_match('/^[a-f0-9]{24}$/i', $agentId) !== 1) {
            return 0.0;
        }

        $rows = $this->db->findMany('settlement_adjustments', [
            'agentId' => $agentId,
            'weekStartStr' => $weekStart->format('Y-m-d\TH:i:s\Z'),
        ], [
            'projection' => ['amount' => 1],
        ]);

        $total = 0.0;
        foreach ($rows as $row) {
            $total += $this->num($row['amount'] ?? 0);
        }

        return round($total, 2);
    }

    /**
     * @param array<string, mixed> $summary
     * @return array<string, mixed>
     */
    private function applySettlementBalanceAdjustments(array $summary, string $agentId, DateTimeImmutable $weekStart): array
    {
        $computedBalanceOwed = $this->num($summary['balanceOwed'] ?? 0);
        $balanceAdjustment = $this->getSettlementBalanceAdjustmentTotal($agentId, $weekStart);
        $summary['computedBalanceOwed'] = $computedBalanceOwed;
        $summary['balanceAdjustment'] = $balanceAdjustment;
        $summary['balanceOwed'] = round($computedBalanceOwed + $balanceAdjustment, 2);

        return $summary;
    }

    private function getAgentFundingAdjustment(string $agentId, DateTimeImmutable $weekStart, ?DateTimeImmutable $weekEnd = null): float
    {
        if ($agentId === '' || preg_match('/^[a-f0-9]{24}$/i', $agentId) !== 1) {
            return 0.0;
        }

        $query = [
            'agentId' => SqlRepository::id($agentId),
            'referenceType' => 'AgentFunding',
            'status' => 'completed',
            'createdAt' => ['$gte' => SqlRepository::utcFromMillis($weekStart->getTimestamp() * 1000)],
        ];
        if ($weekEnd instanceof DateTimeImmutable) {
            $query['createdAt']['$lt'] = SqlRepository::utcFromMillis($weekEnd->getTimestamp() * 1000);
        }

        $rows = $this->db->findMany('transactions', $query, [
            'projection' => ['amount' => 1, 'type' => 1, 'entrySide' => 1],
        ]);

        $net = 0.0;
        foreach ($rows as $row) {
            $amt = $this->num($row['amount'] ?? 0);
            $type = strtolower(trim((string) ($row['type'] ?? '')));
            if ($type === 'deposit') {
                $net += $amt;
            } elseif ($type === 'withdrawal') {
                $net -= $amt;
            } else {
                $side = strtoupper(trim((string) ($row['entrySide'] ?? '')));
                if ($side === 'CREDIT') {
                    $net += $amt;
                } elseif ($side === 'DEBIT') {
                    $net -= $amt;
                }
            }
        }

        return round($net, 2);
    }

    private function isAgentFundingTransaction(array $transaction): bool
    {
        return trim((string) ($transaction['referenceType'] ?? '')) === 'AgentFunding';
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

        if ($type === 'adjustment') {
            $reason = strtoupper(trim((string) ($transaction['reason'] ?? '')));
            $explicitCreditDebitReasons = [
                'ADMIN_CREDIT_ADJUSTMENT',
                'ADMIN_DEBIT_ADJUSTMENT',
                'CASHIER_CREDIT_ADJUSTMENT',
                'CASHIER_DEBIT_ADJUSTMENT',
            ];
            if (in_array($reason, $explicitCreditDebitReasons, true)) {
                $beforeRaw = $transaction['balanceBefore'] ?? null;
                $afterRaw = $transaction['balanceAfter'] ?? null;
                if ($beforeRaw !== null && $afterRaw !== null && is_numeric($beforeRaw) && is_numeric($afterRaw)) {
                    return abs(((float) $afterRaw) - ((float) $beforeRaw)) > 0.00001;
                }
                return true;
            }
            if (str_contains($reason, 'ADMIN')) {
                return false;
            }
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

    private function num($value): float
    {
        return is_numeric($value) ? (float) $value : 0.0;
    }
}
