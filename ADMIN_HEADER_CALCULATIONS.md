# Admin Header - Financial Metrics Calculation Reference

## Overview

This document explains how all financial metrics in the admin header are calculated. The calculations are performed in `php-backend/src/AdminCoreController.php` in the `getHeaderSummary()` method.

---

## Core Metrics

### 1. **Total Balance**
```php
$totalBalance = sum(user.balance) for all scoped users
```
- **Admin**: Sum of ALL user balances in the system
- **Agent**: Sum of balances for users under their agentId
- **Master/Super Agent**: Sum of balances for users under their managed agents

---

### 2. **Total Outstanding**
```php
$totalOutstanding = userOutstanding + agentOutstanding
```
- **userOutstanding**: Sum of `balanceOwed` for all scoped users
- **agentOutstanding**: (Admin only) Sum of `balanceOwed` for all agents

---

### 3. **Today Net / Week Net**
```php
$todayNet = sum(signedAmount) for transactions today
$weekNet = sum(signedAmount) for transactions this week
```

**Signed Amount Calculation** (`getComprehensiveSignedTransactionAmount`):
- Uses `entrySide` field if present:
  - `CREDIT` → positive amount
  - `DEBIT` → negative amount
- Otherwise uses transaction type:
  - **Positive**: `deposit`, `bet_won`, `bet_refund`, `casino_bet_credit`, `fp_deposit`, `credit`, `credit_adj`, `promotional_credit`
  - **Negative**: `withdrawal`, `bet_placed`, `bet_placed_admin`, `casino_bet_debit`, `bet_lost`, `debit`, `debit_adj`, `promotional_debit`
  - **Zero**: Everything else

**Excluded from Net** (`shouldExcludeFromNetSummaries`):
- Funding transactions (deposit, withdrawal)
- Promotional/FreePlay transactions

---

### 4. **Active Accounts**
```php
$activeAccounts = count(users with betting activity this week)
```
- Users with transactions that are NOT:
  - Deposits/Withdrawals (funding)
  - Promotional/FreePlay transactions
- Based on actual betting/gaming activity only

---

### 5. **Player Fees**
```php
$feePerPlayer = 4.00  // Fixed $4 per active player
$totalPlayerFees = $activeAccounts * $feePerPlayer
$paidPlayerFees = $activePositive * $feePerPlayer
$unpaidPlayerFees = $activeNonPositive * $feePerPlayer
```
- **activePositive**: Active players with `balance > 0`
- **activeNonPositive**: Active players with `balance <= 0`
- Fee is considered "paid" if player has positive balance

---

## Collection Metrics (Agent vs House)

### 6. **Agent Collections**
```php
$agentCollections = $agentDeposits - $agentWithdrawals
```
- **agentDeposits**: Sum of deposits approved by `approvedByRole = 'agent'`
- **agentWithdrawals**: Sum of withdrawals approved by `approvedByRole = 'agent'`
- Only includes `deposit` and `withdrawal` transaction types
- For older transactions missing `approvedByRole`, resolves from `adminId`:
  - Look up `adminId` in `agents` collection → `'agent'`
  - Look up `adminId` in `admins` collection → `'admin'`

### 7. **House Collections**
```php
$houseCollections = $houseDeposits - $houseWithdrawals
```
- **houseDeposits**: Sum of deposits approved by `approvedByRole = 'admin'`
- **houseWithdrawals**: Sum of withdrawals approved by `approvedByRole = 'admin'`
- Transactions approved by `master_agent` or `super_agent` are **excluded** from both

### 8. **Net Collections**
```php
$netCollections = $agentCollections + $houseCollections
```

---

## Settlement & Commission Metrics

### 9. **Commissionable Profit**
```php
$commissionableProfit = max(0.0, $agentCollections)
```
- Only agent collections are commissionable
- House collections are NOT commissionable
- Zero if agent collections are negative

### 10. **Agent Share From Profit**
```php
if ($agentPercent != null && 0 <= $agentPercent <= 100) {
    $agentShareFromProfit = round($netCollections * $agentPercent / 100, 2)
} else {
    $agentShareFromProfit = $commissionableProfit  // Admin view or no commission set
}
```
- Uses agent's `agentPercent` from their profile
- Applied to **NET collections** (agent + house combined)
- Admin view or missing percent: agent gets full commissionable profit

### 11. **House Share From Profit**
```php
if ($agentPercent != null) {
    $houseShareFromProfit = round($netCollections - $agentShareFromProfit, 2)
} else {
    $houseShareFromProfit = 0.0
}
```
- Remainder after agent's share
- Zero if no agent percent set

### 12. **House Payback**
```php
$housePayback = 0.0  // Always zero in current implementation
```
- Reserved for future use

### 13. **Remaining After House Payback**
```php
$remainingAfterHousePayback = $agentCollections
```
- Currently just equals agent collections

---

## Agent Settlement Metrics

### 14. **Makeup**
```php
$makeup = $netCollections < 0.0 ? $netCollections : 0.0
```
- Negative amount if net collections are negative
- Zero otherwise
- Represents agent's "debt" or negative performance

### 15. **Agent Profit After Fees**
```php
$agentProfitAfterFees = max(0.0, $agentShareFromProfit - $playerFees)
```
- Agent's share minus player fees
- Zero if fees exceed share

### 16. **House Final Amount** (Agent's Settlement Balance)
```php
if ($netCollections >= 0.0) {
    $houseFinalAmount = round(max(0.0, $houseShareFromProfit) + max(0.0, $playerFees), 2)
} else {
    $houseFinalAmount = round(max(0.0, $agentCollections), 2)
}
```
- Positive week: house percentage plus positive player fees
- Negative week: only positive agent-collected money is applied toward makeup

### 17. **Unpaid Amount**
```php
$unpaidAmount = max(0.0, $houseFinalAmount)
```
- Positive portion of house final amount
- Represents amount owed to agent

---

## Commission Distribution (Upline Chain)

For agents in a hierarchy, commission is distributed across the upline chain:

```
Example Chain: [agent(50%), masterAgent(70%), superAgent(95%), HOUSE(5%)]

Distribution:
- Agent earns: 50%
- Master Agent earns: 70% - 50% = 20%
- Super Agent earns: 95% - 70% = 25%
- House earns: 5%
```

**Calculation** (`buildUplineChain`):
1. Build chain from agent up to house
2. Each node earns the **difference** between their percent and the previous node's percent
3. Last node (house) gets the remainder

---

## Key Functions

| Function | File | Purpose |
|----------|------|---------|
| `getHeaderSummary()` | `AdminCoreController.php:965` | Main entry point |
| `buildAgentSettlementSummary()` | `AdminCoreController.php:11214` | Calculate settlement metrics |
| `getComprehensiveSignedTransactionAmount()` | `AdminCoreController.php:9769` | Sign transactions |
| `shouldExcludeFromNetSummaries()` | `AdminCoreController.php:4955` | Filter transactions |
| `buildUplineChain()` | `AdminCoreController.php` | Build commission chain |

---

## Transaction Type Reference

### Included in Net Summaries
- `bet_placed`, `bet_placed_admin`
- `bet_won`, `bet_lost`
- `bet_void`, `bet_refund`
- `casino_bet_credit`, `casino_bet_debit`
- `adjustment` (non-promotional)

### Excluded from Net Summaries
- `deposit`, `withdrawal` (funding)
- `fp_deposit`, `fp_bet_*` (freeplay)
- `FreePlayBonus`, `ReferralBonus` (promotional)
- `DEPOSIT_FREEPLAY_BONUS`

---

## Example Calculation

**Scenario**: Agent with 50% commission, 10 active players (8 positive balance, 2 zero balance)

```
Inputs:
- agentDeposits = $5000
- agentWithdrawals = $2000
- houseDeposits = $1000
- houseWithdrawals = $500
- activeAccounts = 10

Calculations:
- agentCollections = 5000 - 2000 = $3000
- houseCollections = 1000 - 500 = $500
- netCollections = 3000 + 500 = $3500
- commissionableProfit = max(0, 3000) = $3000
- agentShareFromProfit = 3500 * 50% = $1750
- houseShareFromProfit = 3500 - 1750 = $1750
- totalPlayerFees = 10 * $4 = $40
- paidPlayerFees = 8 * $4 = $32
- unpaidPlayerFees = 2 * $4 = $8
- makeup = 0 (net is positive)
- agentProfitAfterFees = max(0, 1750 - 40) = $1710
- houseFinalAmount = 1750 + 40 = $1790
- unpaidAmount = max(0, 1790) = $1790
```

---

## Cache Behavior

Header summary is cached for **15 seconds**:
- Cache key: `header-summary-{role}__{userId}`
- Cleared on: deposit, withdrawal, balance update, user creation

---

## Debug Logging

Collection calculation details are logged:
```php
error_log('COLLECTION_DEBUG actor=' . ...);
```
Check `php-backend/logs/api-errors.log` for:
- `agentDep`, `agentWd`: Agent deposits/withdrawals
- `houseDep`, `houseWd`: House deposits/withdrawals
- `resolved`: Role resolution for old transactions
