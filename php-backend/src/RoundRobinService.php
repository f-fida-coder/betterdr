<?php

declare(strict_types=1);

/**
 * Round Robin support — combination generator + group status aggregator.
 *
 * Round Robin places ONE user request as N child parlay rows in `bets`,
 * each carrying a `parentGroupId` that points at a `round_robin_groups`
 * row. Children settle independently via the existing parlay flow in
 * BetSettlementService — this service does NOT settle anything itself.
 *
 * IMPORTANT — financial truth lives in the children:
 *   - The group row carries display metadata only (selected sizes, totals,
 *     aggregate status, parlay count).
 *   - Every reader that sums money (commission, weekly figures, agent
 *     reports, wallet limits, settlement) sees the child parlay rows and
 *     gets the correct exposure for free.
 *   - Do NOT include the group row when summing amounts. Don't add a
 *     "synthetic" entry in any aggregation query.
 *
 * REALTIME / NOTIFICATION POLICY (audit-confirmed 2026-05-05):
 *   - There is no per-bet realtime notification path today. RealtimeEventBus
 *     is only used for odds-feed events (OddsSyncService); bet settlement
 *     reaches the client via /auth/me + getMyBets polling
 *     and QueryCache invalidation, not push.
 *   - When/if a realtime per-bet event is added, it MUST be group-aware:
 *     check `parentGroupId` on the bet, and emit ONE event per group
 *     (carrying the recomputed aggregate status), not one event per
 *     child. Otherwise a 50-child Round Robin will fan out 50 events
 *     for what the user perceives as a single ticket.
 *   - Same constraint applies to admin streams, email, and toast
 *     notifications if any of those grow per-bet hooks later.
 */
final class RoundRobinService
{
    /**
     * Generate every nCr combination of $size selections from $selections.
     * Returns an array of selection-arrays, each preserving the original
     * order. Standard lexicographic recursion — N <= 8 so perf is fine.
     *
     * @param array<int, mixed> $selections
     * @return array<int, array<int, mixed>>
     */
    public static function generateCombinations(array $selections, int $size): array
    {
        $n = count($selections);
        if ($size < 1 || $size > $n) {
            return [];
        }

        $values = array_values($selections);
        $result = [];
        $current = [];

        $walk = static function (int $start) use (&$walk, $values, $size, $n, &$current, &$result): void {
            if (count($current) === $size) {
                $result[] = $current;
                return;
            }
            for ($i = $start; $i < $n; $i++) {
                $current[] = $values[$i];
                $walk($i + 1);
                array_pop($current);
            }
        };

        $walk(0);
        return $result;
    }

    /**
     * Total parlay count for the user's chosen sizes — sum of C(n,k) for
     * each selected size k. Used by both the placement validator and the
     * group row's `parlayCount` field.
     *
     * @param array<int, int> $sizes
     */
    public static function combinationCount(int $selectionCount, array $sizes): int
    {
        $total = 0;
        foreach ($sizes as $size) {
            $size = (int) $size;
            if ($size < 2 || $size >= $selectionCount) {
                continue;
            }
            $total += self::nCr($selectionCount, $size);
        }
        return $total;
    }

    public static function nCr(int $n, int $k): int
    {
        if ($k < 0 || $k > $n) return 0;
        if ($k === 0 || $k === $n) return 1;
        $k = min($k, $n - $k);
        $result = 1;
        for ($i = 0; $i < $k; $i++) {
            $result = intdiv($result * ($n - $i), $i + 1);
        }
        return $result;
    }

    /**
     * Recompute the parent group's aggregate status by reading every
     * child bet currently in the DB. Called from BetSettlementService
     * after a child parlay's status changes.
     *
     * Concurrency: a Round Robin's children typically settle from
     * different match-grading events that can run on parallel workers.
     * Two workers finishing simultaneously would otherwise race on the
     * read-then-write here and the later commit could clobber the
     * earlier one's totalPayout / status. We lock the group row with
     * findOneForUpdate inside a short transaction — same pattern
     * BetsController::placeBet and BetSettlementService::settleMatch
     * use to serialize their own balance/bet writes — so the
     * read-aggregate-write block is atomic per group.
     *
     * Aggregate rules:
     *   - Any child still pending  →  group 'pending'
     *   - All non-void children    →  group 'won' / 'lost' / 'partial'
     *   - All children void        →  group 'void' (everyone refunded)
     *   - Voids never contaminate the won/lost split — they're filtered
     *     out before the verdict is computed (see plan §4).
     *
     * Group `totalPayout` = sum of children's `payout` fields. Won
     * children pay their reduced parlay; void children refund stake;
     * lost children contribute zero. This makes the rolled-up display
     * trivially queryable from the group row.
     *
     * @return array<string, mixed>  The new group doc (after update), or [] if not found.
     */
    public static function recomputeGroupStatus(SqlRepository $db, string $groupId): array
    {
        if (preg_match('/^[a-f0-9]{24}$/i', $groupId) !== 1) {
            return [];
        }

        $db->beginTransaction();
        try {
            // Pessimistic lock on the group row. Holds for the few ms it
            // takes to read children + write back the new status. Other
            // concurrent recomputes for the same group queue here and
            // re-read the latest child statuses after we commit, so the
            // last write reflects every child including any that landed
            // mid-transaction.
            $group = $db->findOneForUpdate('round_robin_groups', ['id' => SqlRepository::id($groupId)]);
            if ($group === null) {
                $db->rollback();
                return [];
            }

            $children = $db->findMany('bets', [
                'parentGroupId' => $groupId,
            ], [
                'projection' => ['id' => 1, 'status' => 1, 'payout' => 1, 'potentialPayout' => 1, 'riskAmount' => 1],
            ]);

            $statuses = [];
            $totalPayout = 0.0;
            foreach ($children as $child) {
                if (!is_array($child)) continue;
                $statuses[] = strtolower((string) ($child['status'] ?? 'pending'));
                $payoutField = $child['payout'] ?? null;
                // Won children carry their actual paid amount in `payout`.
                // Void children refund stake → payout = riskAmount. Lost
                // children carry 0. Pending children don't contribute (the
                // `pending` short-circuit below blocks the aggregate from
                // settling anyway).
                $totalPayout += is_numeric($payoutField) ? (float) $payoutField : 0.0;
            }

            $aggregate = self::aggregateStatus($statuses);

            $now = SqlRepository::nowUtc();
            $update = [
                'status' => $aggregate,
                'totalPayout' => round($totalPayout, 2),
                'updatedAt' => $now,
            ];
            if ($aggregate !== 'pending' && empty($group['settledAt'])) {
                $update['settledAt'] = $now;
            }
            $db->updateOne(
                'round_robin_groups',
                ['id' => SqlRepository::id($groupId)],
                $update
            );

            $db->commit();
            return array_merge(is_array($group) ? $group : [], $update);
        } catch (Throwable $e) {
            $db->rollback();
            throw $e;
        }
    }

    /**
     * Pure logic — exposed so unit tests can verify the void-handling
     * matrix without touching the DB. See plan §4.
     *
     * @param array<int, string> $childStatuses
     */
    public static function aggregateStatus(array $childStatuses): string
    {
        if ($childStatuses === []) {
            return 'pending';
        }
        $normalized = array_map(static fn ($s) => strtolower((string) $s), $childStatuses);

        if (in_array('pending', $normalized, true)) {
            return 'pending';
        }

        // Strip voids before deciding won/lost/partial — a single voided
        // child must NEVER turn an otherwise-clean win into 'partial'.
        $nonVoid = array_values(array_filter($normalized, static fn (string $s): bool => $s !== 'void'));
        if ($nonVoid === []) {
            return 'void';
        }

        $allWon = array_reduce($nonVoid, static fn (bool $acc, string $s): bool => $acc && $s === 'won', true);
        if ($allWon) {
            return 'won';
        }
        $allLost = array_reduce($nonVoid, static fn (bool $acc, string $s): bool => $acc && $s === 'lost', true);
        if ($allLost) {
            return 'lost';
        }
        return 'partial';
    }
}
