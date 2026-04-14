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
                    'totals'  => ['periodAmount' => 0.0, 'lifetimeAmount' => 0.0],
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
                ], ['projection' => ['id' => 1, 'agentId' => 1, 'createdBy' => 1, 'createdByModel' => 1]]);
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
                $periodAmount = round($cutPct / 100 * $periodNet, 2);
                $ytdAmount = round($cutPct / 100 * $ytdNet, 2);
                $lifetimeAmount = round($cutPct / 100 * $lifetimeNet, 2);
                $totalPeriodAmount += $periodAmount;
                $totalYtdAmount += $ytdAmount;
                $totalLifetimeAmount += $lifetimeAmount;

                $flatAgents[] = [
                    'id'             => $aid,
                    'username'       => $a['username'] ?? null,
                    'myCut'          => $cutPct,
                    'periodNet'      => $periodNet,
                    'ytdNet'         => $ytdNet,
                    'lifetimeNet'    => $lifetimeNet,
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
                    'periodAmount'   => round($totalPeriodAmount, 2),
                    'ytdAmount'      => round($totalYtdAmount, 2),
                    'lifetimeAmount' => round($totalLifetimeAmount, 2),
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
}
