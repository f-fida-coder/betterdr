# Tier C — Bet-path stored procedure plan

> **STATUS: NOT IMPLEMENTED.** This file is a design + risk document only.
> Do NOT skip the staging + canary steps when this is eventually shipped.
> The bet path moves money. A bad rollout corrupts the ledger.

---

## Goal

Collapse the current "place a casino bet" flow from N round-trips between
PHP and MySQL into ONE stored-procedure call inside ONE transaction.

Current shape (at time of writing) for `POST /api/casino/bet`:

1. SELECT user balance (FOR UPDATE)
2. INSERT casino_bets row (status=pending)
3. INSERT transactions row (DEBIT)
4. UPDATE users.balance, users.pendingBalance
5. (after game outcome) UPDATE casino_bets row (status=won/lost)
6. INSERT transactions row (CREDIT or settlement adjustment)
7. UPDATE users.balance again

Steps 1–4 happen on the request thread. Each is a separate round-trip.
Total time today: ~30–80ms in steady state, sometimes 200ms+ under
contention.

After change: one CALL `place_casino_bet(...)` round-trip, total ~5–15ms.

---

## Why deferred

The bet path is the **most dangerous code in the entire app**. Mistakes
here:

- Double-debit a user (lose customer trust + money)
- Skip a debit (give away free money)
- Race-condition the ledger so DEBIT and CREDIT amounts don't match
- Lock contention storms when many users bet on the same event

A stored procedure done right is faster AND safer than the PHP version.
Done wrong, it silently corrupts data because triggers and procedures
don't surface as cleanly as PHP exceptions.

This is a Tier C item because it requires:

1. A staging environment with production-shape data (not just test data).
2. A regression test suite that exercises the full bet → debit → grade
   → credit cycle for every game type AND every settlement edge case
   (push, void, voided after credit, partial cashout, jackpot).
3. A canary deploy mechanism: route 1% of bets through the new path
   while the other 99% continue on the old path. Compare ledger output.
4. A 30-day soak before tearing out the PHP path.

---

## High-level design

### One procedure per game family

Don't try to make a single mega-procedure that handles every game's
quirks. Make small, well-named procedures the controller calls based
on game slug:

```
place_casino_bet_simple(p_user_id, p_amount, p_game, p_round_data, OUT p_bet_id, OUT p_balance_after)
place_casino_bet_blackjack(p_user_id, p_amount, p_round_data, OUT ...)
place_casino_bet_baccarat(p_user_id, p_bets_json, OUT ...)
settle_casino_bet(p_bet_id, p_outcome, p_payout, OUT p_balance_after)
```

`_simple` covers craps, arabian, jurassic-run, 3card-poker — all the
"single bet, single outcome" games. The card games have multi-round
state and need their own procedure with explicit state transitions.

### Lock discipline

Every procedure starts with the SAME ordering:

```sql
START TRANSACTION;

-- 1. Lock the user row first, always.
SELECT balance, pendingBalance, status, gamblingLimits
  INTO @bal, @pending, @status, @limits
  FROM users WHERE id = p_user_id FOR UPDATE;

-- 2. Validate inside the SP — never trust the caller for limits.
IF @status <> 'active' THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'user_not_active';
END IF;
IF (@bal - @pending) < p_amount THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'insufficient_balance';
END IF;
-- ... per-game min/max checks ...

-- 3. Write the ledger pair atomically.
INSERT INTO casino_bets (...) VALUES (...);
SET p_bet_id = LAST_INSERT_ID();
INSERT INTO transactions (userId, type, amount, ...) VALUES (...);

-- 4. Update balance LAST. Order matters: commit happens after this.
UPDATE users SET pendingBalance = pendingBalance + p_amount WHERE id = p_user_id;

COMMIT;
```

The SIGNAL / SQLSTATE pattern surfaces back to PHP as a PDOException
with a parseable code, so the controller can map them to user-facing
error messages without parsing English strings.

### Idempotency

Every CALL takes a `p_idempotency_key VARCHAR(64)`. The procedure first
checks `SELECT bet_id FROM casino_bets WHERE idempotency_key = ?`; if
a row exists, it returns that bet_id WITHOUT re-charging. This makes
the network-retry case safe: client retries the same key, server
returns the original bet_id, no double-debit.

Requires a UNIQUE index on `casino_bets.idempotency_key`. New column,
nullable for old rows.

---

## Migration plan (when this is eventually done)

### Phase 1 — Build (1–2 weeks)

1. Add `casino_bets.idempotency_key` (nullable, UNIQUE index).
2. Author `place_casino_bet_simple` and `settle_casino_bet`.
3. Author the regression test fixture: full bet→debit→grade→credit
   cycle for craps, arabian, jurassic-run, 3card-poker.
4. Run the test fixture in a loop, 1000 cycles, against staging.
   Diff the resulting ledger row-by-row against the current PHP path
   running the same fixture. They MUST match exactly.

### Phase 2 — Canary (2–4 weeks)

1. Add a feature flag: `CASINO_BET_USE_SP=false` in env.
2. CasinoController checks the flag at the top of the bet handler.
   When false: existing PHP code runs unchanged.
   When true: it CALLs the procedure.
3. Set the flag to `true` for ONE test account first. Place 100 bets
   manually across all game types. Verify ledger correctness.
4. Move to internal staff accounts (5–10 users, 1 week).
5. Move to 1% of production traffic (1 week).
6. Move to 10%, 50%, 100% over 2 more weeks. At each step, compare
   ledger DEBIT/CREDIT sums between SP-path users and PHP-path users
   adjusted for handle. Sums must be identical to the cent.

### Phase 3 — Cleanup (after 30 days at 100%)

1. Remove the PHP code path.
2. Remove the feature flag.
3. Document the SP signatures in this file.

---

## Rollback plan

At any point during canary: flip `CASINO_BET_USE_SP=false`, redeploy.
The next request uses the PHP path. The procedures stay in the database
unused — they cause no harm in dormant state.

If we get to Phase 3 and discover a bug after the PHP path is removed:
that's why we keep the deleted code in git history. Revert the
controller change, redeploy, set flag false. Maximum downtime: one
deploy cycle.

---

## What you DON'T do

- Do not put settlement logic that requires external state (e.g.
  reading from sportsbook match outcomes) inside a stored procedure.
  Those need PHP-level orchestration; settlement is async by nature.
- Do not chain multiple procedures from PHP "for performance". That
  defeats the round-trip elimination — at that point you've just
  pushed PHP into SQL with worse debugging tools.
- Do not put any business logic that varies by environment (test vs
  staging vs prod) inside a procedure. Procedures should be pure data
  movers; the controller decides which one to call.
