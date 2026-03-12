# Arabian Game Manual QA Checklist and Execution Sheet

## 1) Execution Summary

| Metric | Value |
|---|---|
| Total Tests | 40 |
| Passed | 0 |
| Failed | 0 |
| Blocked | 0 |
| Blocker Count | 0 |
| Critical Count | 0 |
| Final GO / NO-GO Decision | NO-GO (default until all Blocker/Critical issues are resolved) |

### Build and Environment

| Field | Value |
|---|---|
| Release / Build Version |  |
| Environment |  |
| QA Engineer |  |
| Execution Date |  |
| Browser(s) |  |
| Device(s) |  |
| API Base URL |  |
| DB Target |  |

### Test Accounts

| Role | Username | Notes |
|---|---|---|
| Player Account 1 |  | Normal cash account |
| Player Account 2 |  | Multi-tab/race validation |
| Admin Account |  | Admin casino records verification |

## 2) Severity Legend

| Severity | Definition | GO/NO-GO Rule |
|---|---|---|
| Blocker | Real-money safety, settlement integrity, or production launch is impossible | Any open Blocker = NO-GO |
| Critical | High-risk money/security/history/admin inconsistency with likely user impact | Any open Critical = NO-GO |
| High | Major functional issue with clear user or operations impact | Fix before production unless explicitly waived |
| Medium | Partial degradation, workaround exists, limited blast radius | Can ship only with explicit acceptance |
| Low | Cosmetic/minor behavior issue | Can ship with backlog ticket |

## 3) Manual QA Execution Sheet

Status values: `PASS` / `FAIL` / `BLOCKED`

| Test ID | Test Name | Steps | Expected Result | Actual Result | Status | Severity | Notes | Screenshot / RoundId Reference |
|---|---|---|---|---|---|---|---|---|
| ARB-LCH-001 | Arabian card appears on Casino | 1. Login player. 2. Open Casino page. 3. Check Lobby and Slots category. | Arabian Game card appears with correct label, image, category, and play action. |  |  | High |  |  |
| ARB-LCH-002 | Arabian card metadata quality | 1. Inspect card badges/limits/provider text. | Card metadata is professional and consistent with other in-house games. |  |  | Medium |  |  |
| ARB-LCH-003 | Launch from casino card | 1. Click Arabian card. 2. Wait for iframe overlay load. | Game launches successfully in overlay; no console/runtime errors. |  |  | High |  |  |
| ARB-LCH-004 | Overlay close button visibility | 1. Launch Arabian. 2. Verify close button position and clickability. | Close button visible, safe-area aware, and functional. |  |  | Medium |  |  |
| ARB-LCH-005 | Close and reopen continuity | 1. Launch game. 2. Close overlay. 3. Reopen Arabian. | Reopen succeeds cleanly with no broken state or stale loading. |  |  | High |  |  |
| ARB-LCH-006 | Launch restriction consistency | 1. Try unsupported direct launch path (if available). 2. Launch via casino page. | Unsupported path is blocked gracefully; supported path works. |  |  | Medium |  |  |
| ARB-SPN-001 | Basic spin flow success | 1. Launch Arabian. 2. Place one valid spin. | Spin starts/ends normally; UI updates with result and balance. |  |  | High |  |  |
| ARB-SPN-002 | Multiple sequential spins | 1. Execute 10 valid spins in sequence. | Every spin settles once; no frozen state or missing result. |  |  | High |  |  |
| ARB-SPN-003 | Insufficient balance handling | 1. Reduce player balance below required wager. 2. Attempt spin. | Spin is blocked with clear error; no negative balance; no round created. |  |  | Critical |  |  |
| ARB-SPN-004 | Min bet enforcement | 1. Attempt below-min spin payload through UI/API proxy. | Request rejected by backend with validation message; no money movement. |  |  | Critical |  |  |
| ARB-SPN-005 | Max bet enforcement | 1. Attempt above-max spin payload through UI/API proxy. | Request rejected by backend with validation message; no money movement. |  |  | Critical |  |  |
| ARB-BAL-001 | Real balance debit on losing spin | 1. Capture wallet before spin. 2. Execute spin with no/low return. 3. Capture wallet after. | `balanceAfter = balanceBefore - wager + return`, math matches exactly. |  |  | Blocker |  |  |
| ARB-BAL-002 | Real balance credit on winning spin | 1. Capture wallet before/after winning spin. | Wallet credit equals backend `totalReturn`; no over-credit or double-credit. |  |  | Blocker |  |  |
| ARB-BAL-003 | UI-wallet-backend sync | 1. Spin once. 2. Compare in-game, header wallet, API `/wallet/balance`. | All balance surfaces converge to same authoritative value. |  |  | Critical |  |  |
| ARB-BAL-004 | Logout/login persistence | 1. Spin. 2. Logout. 3. Login again and relaunch Arabian. | Persisted balance and state are correct after re-authentication. |  |  | High |  |  |
| ARB-FS-001 | Free-spin trigger occurs | 1. Execute spins until free spins are awarded. | Free-spin award appears and backend `freeSpinsAwarded/freeSpinsAfter` are consistent. |  |  | High |  |  |
| ARB-FS-002 | Free-spin no-wager settlement | 1. Start a free-spin round. 2. Check wager fields and transactions. | Free-spin round has `totalWager=0`, no wager debit entry is created. |  |  | Blocker |  |  |
| ARB-FS-003 | Free-spin lock (line/coin) hardening | 1. Trigger free spins at low bet profile. 2. Attempt higher line/coin payload during free spin. | Backend locks free-spin profile to original values; exploit attempt fails/overrides safely. |  |  | Critical |  |  |
| ARB-FS-004 | Free-spin decrement logic | 1. Consume free spins one by one. | Free-spin counters decrement correctly; no negative or skipped states. |  |  | High |  |  |
| ARB-FS-005 | Free-spin completion reset | 1. Exhaust free spins. 2. Spin paid round again. | System exits free-spin mode cleanly and returns to paid-spin behavior. |  |  | High |  |  |
| ARB-IDM-001 | Same requestId replay (API) | 1. Send same Arabian `requestId` twice. | Second response is idempotent, returns same roundId/outcome; no extra debit/credit. |  |  | Blocker |  |  |
| ARB-IDM-002 | Rapid double tap protection | 1. Rapidly tap spin button several times. | Only one active settlement per spin intent; no duplicate rounds. |  |  | Critical |  |  |
| ARB-IDM-003 | Multi-tab concurrency guard | 1. Open same account in 2 tabs. 2. Spin concurrently. | Settlements remain consistent; no wallet drift or double-charge anomalies. |  |  | Critical |  |  |
| ARB-IDM-004 | Crafted payload tamper test | 1. Try forged payout/client result fields via API interceptor. | Backend ignores client settlement claims and uses server-authoritative result only. |  |  | Blocker |  |  |
| ARB-REC-001 | Browser refresh mid-round | 1. Start spin and refresh page mid-round if possible. 2. Reopen game/history. | Settled round remains consistent; no duplicate settlement or lost funds. |  |  | Critical |  |  |
| ARB-REC-002 | Close tab during active round | 1. Start spin. 2. Close tab quickly. 3. Re-login and verify records. | Single authoritative outcome exists; balances and history remain accurate. |  |  | Critical |  |  |
| ARB-REC-003 | Network interruption and reconnect | 1. Spin while throttling/disconnecting network. 2. Reconnect. | Client recovers gracefully; no phantom retries causing duplicate settlement. |  |  | High |  |  |
| ARB-HIS-001 | User history listing | 1. Execute Arabian spins. 2. Open player casino history. | Arabian rows appear with correct wager/return/net/result/time/roundId. |  |  | High |  |  |
| ARB-HIS-002 | User history filters | 1. Filter history by game=Arabian and date range. | Only expected Arabian rows appear; pagination/counts are correct. |  |  | Medium |  |  |
| ARB-HIS-003 | Round detail integrity | 1. Open Arabian round detail. | Detail includes meaningful round data (pattern, winning lines, bonus/free-spin details). |  |  | High |  |  |
| ARB-ADM-001 | Admin casino list visibility | 1. Login admin. 2. Open casino bets table. 3. Filter game=Arabian. | Arabian bets visible and filterable by user/date/result/game. |  |  | Critical |  |  |
| ARB-ADM-002 | Admin round detail quality | 1. Open Arabian bet detail modal/view in admin. | Wager/return/net/status and round details match backend records exactly. |  |  | Critical |  |  |
| ARB-ADM-003 | Admin vs player history consistency | 1. Compare same round in player and admin views. | Core financial and round identifiers match 1:1. |  |  | Critical |  |  |
| ARB-WAL-001 | Wallet transaction labels | 1. Perform paid spin and winning spin. 2. Check wallet transactions. | Labels/source types are correct (`CASINO_ARABIAN_WAGER` / `CASINO_ARABIAN_PAYOUT`). |  |  | High |  |  |
| ARB-WAL-002 | Ledger math integrity | 1. For a selected round, compare casino_bets and transactions entries. | Sum of debit/credit entries matches round wager/return/net exactly. |  |  | Blocker |  |  |
| ARB-MOB-001 | Mobile launch and controls (iOS) | 1. Test on iPhone viewport/device. 2. Launch and play spins. | Controls are visible/touch-friendly; close button safe-area compliant. |  |  | High |  |  |
| ARB-MOB-002 | Mobile launch and controls (Android) | 1. Test on Android viewport/device. 2. Launch and play spins. | No clipped controls or broken interaction; performance acceptable. |  |  | High |  |  |
| ARB-MOB-003 | Orientation change handling | 1. Switch portrait/landscape during and between spins. | Layout remains usable; state and round continuity are preserved. |  |  | High |  |  |
| ARB-PST-001 | Post-deploy smoke: launch + spin | 1. After deploy, launch Arabian on prod/staging. 2. Place one spin. | End-to-end path works with authoritative settlement and correct balances. |  |  | Blocker |  |  |
| ARB-PST-002 | Post-deploy smoke: idempotency replay | 1. Replay same requestId once in deployed environment. | Idempotent replay returns same round without additional money movement. |  |  | Blocker |  |  |
| ARB-PST-003 | Post-deploy smoke: admin visibility | 1. Verify latest Arabian rounds in admin casino table/details. | Deployed admin reflects exact production settlement records. |  |  | Critical |  |  |
| ARB-PST-004 | Post-deploy smoke: wallet reconciliation | 1. Reconcile one deployed round against transactions and history. | Financial reconciliation is exact; no discrepancy across views. |  |  | Blocker |  |  |

## 4) Defect Logging Format (Use for every FAIL)

| Field | Value |
|---|---|
| Defect ID |  |
| Linked Test ID |  |
| Severity |  |
| Environment |  |
| Repro Steps |  |
| Expected |  |
| Actual |  |
| Evidence (Screenshot/Video/Logs/RoundId) |  |
| Owner |  |
| Status |  |

## 5) Final Sign-Off

| Role | Name | Decision | Date | Notes |
|---|---|---|---|---|
| QA Lead |  | GO / NO-GO |  |  |
| Backend Lead |  | GO / NO-GO |  |  |
| Product / Ops |  | GO / NO-GO |  |  |

