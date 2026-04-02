# Admin Header Financial Reference

This document reflects the current settlement logic used by `getHeaderSummary()` in [php-backend/src/AdminCoreController.php](/Users/mac/Desktop/betterdr/php-backend/src/AdminCoreController.php) and `AgentSettlementRules::summarize()` in [php-backend/src/AgentSettlementRules.php](/Users/mac/Desktop/betterdr/php-backend/src/AgentSettlementRules.php).

## Core counters

### Total Balance
```php
$totalBalance = sum(user.balance) for all scoped users
```

### Total Outstanding
```php
$totalOutstanding = userOutstanding + agentOutstanding
```

### Today Net / Week Net
```php
$todayNet = sum(signedAmount) for non-funding, non-promo transactions today
$weekNet = sum(signedAmount) for non-funding, non-promo transactions this week
```

Excluded from these two counters:
- Deposits / withdrawals
- Promotional / freeplay transactions

### Active Accounts
```php
$activeAccounts = count(users with completed weekly transactions that are not deposits, withdrawals, or promo/freeplay)
```

### Player Fees
```php
$feePerPlayer = 4.00
$totalPlayerFees = $activeAccounts * $feePerPlayer
$paidPlayerFees = $activePositive * $feePerPlayer
$unpaidPlayerFees = $activeNonPositive * $feePerPlayer
```

Definitions:
- `activePositive`: active players whose balance is `> 0`
- `activeNonPositive`: active players whose balance is `<= 0`

For lazy previous-week snapshots, the positive/non-positive split is based on each active player's week-ending transaction balance, not today's live balance.

## Collections

### Agent Collections
```php
$agentCollections = $agentDeposits - $agentWithdrawals
```

Includes only player-facing `deposit` / `withdrawal` transactions approved by:
- The logged-in agent
- Their same-person linked `MA` counterpart

### House Collections
```php
$houseCollections = $houseDeposits - $houseWithdrawals
```

Includes player-facing `deposit` / `withdrawal` transactions approved by:
- House / admin
- Any scoped approver outside the logged-in linked pair

### Important exclusion
```php
referenceType === 'AgentFunding'
```

Agent funding transactions are excluded from:
- Agent collections
- House collections
- Net collections
- Makeup

They are applied only as a balance-owed adjustment.

### Net Collections
```php
$netCollections = $agentCollections + $houseCollections
```

This is intentional. Net is not `agent - house`.

## Settlement order

### 1. Pay down previous makeup first
```php
if ($netCollections > 0 && $previousMakeup > 0) {
    $makeupReduction = min($netCollections, $previousMakeup)
    $afterMakeup = $netCollections - $makeupReduction
} elseif ($netCollections > 0) {
    $afterMakeup = $netCollections
} else {
    $afterMakeup = 0
}
```

### 2. Cover fees before profit split
```php
$commissionableProfit = max(0, $afterMakeup - $totalPlayerFees)
```

### 3. Split distributable profit
```php
if ($commissionableProfit > 0 && $agentPercent !== null) {
    $agentSplit = $commissionableProfit * $agentPercent / 100
    $kickToHouse = $commissionableProfit - $agentSplit
} elseif ($commissionableProfit > 0) {
    $agentSplit = $commissionableProfit
    $kickToHouse = 0
} else {
    $agentSplit = 0
    $kickToHouse = 0
}
```

### 4. House Profit
```php
$houseProfit = $commissionableProfit > 0
    ? $kickToHouse + $totalPlayerFees
    : 0
```

### 5. Weekly makeup addition
```php
if ($netCollections <= 0) {
    $weeklyMakeupAddition = abs($netCollections) + $totalPlayerFees
} elseif ($commissionableProfit <= 0) {
    $weeklyMakeupAddition = max(0, $totalPlayerFees - $afterMakeup)
} else {
    $weeklyMakeupAddition = 0
}
```

### 6. Cumulative makeup
```php
$cumulativeMakeup = max(0, $previousMakeup - $makeupReduction + $weeklyMakeupAddition)
```

### 7. Balance owed before funding
```php
if ($commissionableProfit > 0) {
    $balanceOwed = $previousBalanceOwed + $houseProfit - $houseCollections
} else {
    $balanceOwed = $previousBalanceOwed + $agentCollections
}
```

### 8. Funding adjustment
```php
$balanceOwed = $balanceOwed - $fundingAdjustment
```

Where:
- Positive `fundingAdjustment` means the house credited the agent, so the agent owes less
- Negative `fundingAdjustment` means the house debited the agent, so the agent owes more

## Carry-forward

At week boundary, the previous week is snapshotted into `settlement_snapshots`:

```php
closingMakeup
closingBalanceOwed
```

These become:
- next week's `previousMakeup`
- next week's `previousBalanceOwed`

## Commission chain

For upline distribution:

```text
Agent (50%) -> Master Agent (70%) -> Hiring Agent (95%) -> House (5%)
```

Each node receives the differential:
- Agent: `50%`
- Master Agent: `70 - 50 = 20%`
- Hiring Agent: `95 - 70 = 25%`
- House: remainder to `100%`

Same-person `agent` / `MA` pairs are collapsed into one economic node when their percentages match.
