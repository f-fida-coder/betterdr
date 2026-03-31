# Phase 0: Verification Harness - COMPLETE ✅

## What Was Created

**File:** `php-backend/scripts/verify-header-calculations.php`

**Purpose:** Safe, read-only verification tool to ensure refactoring never breaks calculations

---

## How to Use

### Mode 1: Database Validation (Safe Test)

```bash
cd /Users/mac/Desktop/betterdr
php php-backend/scripts/verify-header-calculations.php
```

**What it does:**
- ✅ Connects to database (read-only)
- ✅ Counts collections (users, transactions, agents)
- ✅ Checks recent transactions
- ✅ **Does NOT modify any data**

**Expected Output:**
```
Database Connection: ✅ OK
Collection Counts:
  - users:         256
  - transactions:  216
  - agents:        11
✅ Database validation complete
```

---

### Mode 2: Capture Baseline (Before Refactoring)

```bash
# You need a valid auth token from the admin panel
# Open browser console, copy token from localStorage or network request

php php-backend/scripts/verify-header-calculations.php \
  --token=YOUR_AUTH_TOKEN \
  --output=before.json
```

**What it does:**
- ✅ Calls `/api/admin/header-summary` endpoint
- ✅ Saves full response to `before.json`
- ✅ Displays all 27 metric values
- ✅ Validates response structure

**Example Output:**
```
Header Summary Values:
----------------------
Total Balance:          15,234.50
Total Outstanding:      3,456.00
Today Net:              1,234.00
Week Net:               5,678.00
Active Accounts:        42
Agent Collections:      3,000.00
House Collections:      500.00
...
✅ Saved to: before.json
```

---

### Mode 3: Compare Results (After Refactoring)

```bash
php php-backend/scripts/verify-header-calculations.php \
  --compare \
  --before=before.json \
  --after=after.json
```

**What it does:**
- ✅ Compares all 27 fields
- ✅ Allows tiny floating point differences (< 0.01)
- ✅ Reports any mismatches
- ✅ Returns exit code 0 (success) or 1 (failure)

**Success Output:**
```
Results:
--------
Total Fields:      27
Matching Fields:   27
Different Fields:  0
Max Difference:    0.0000

✅ SUCCESS: All calculations match!
```

**Failure Output:**
```
❌ MISMATCH DETECTED:

   • agentCollections
     Before: 3,000.00
     After:  2,950.00
     Diff:   50.0000

   • weekNet
     Before: 5,678.00
     After:  5,600.00
     Diff:   78.0000
```

---

## Safety Guarantees

### ✅ What This Script Does NOT Do

1. ❌ **Does NOT modify database** - Read-only queries
2. ❌ **Does NOT change any data** - No writes/updates
3. ❌ **Does NOT affect users** - Runs independently
4. ❌ **Does NOT require restart** - Runs alongside site
5. ❌ **Does NOT cache results** - Fresh API calls only

### ✅ What This Script DOES Do

1. ✅ **Validates calculations** - Compares before/after
2. ✅ **Detects regressions** - Flags any differences
3. ✅ **Provides audit trail** - JSON files for review
4. ✅ **Safe to run anytime** - No side effects

---

## Verification Checklist

Before EACH refactoring phase, run:

```bash
# 1. Verify database is accessible
php php-backend/scripts/verify-header-calculations.php

# 2. Capture baseline (if not done)
php php-backend/scripts/verify-header-calculations.php \
  --token=YOUR_TOKEN \
  --output=phase-N-before.json

# 3. After refactoring, capture again
php php-backend/scripts/verify-header-calculations.php \
  --token=YOUR_TOKEN \
  --output=phase-N-after.json

# 4. Compare
php php-backend/scripts/verify-header-calculations.php \
  --compare \
  --before=phase-N-before.json \
  --after=phase-N-after.json
```

**Expected result:** `✅ SUCCESS: All calculations match!`

---

## Troubleshooting

### Error: "CURL Error: Failed to connect"

**Cause:** Backend server not running

**Fix:**
```bash
# Start backend server
node index.js  # or however you start it
```

---

### Error: "HTTP 401: Not authorized"

**Cause:** Token expired or invalid

**Fix:**
1. Open admin panel in browser
2. Open DevTools → Network tab
3. Find any `/api/admin/header-summary` request
4. Copy `Authorization` header value
5. Use that token (remove "Bearer " prefix)

---

### Error: "Invalid JSON in input files"

**Cause:** File is empty or corrupted

**Fix:**
```bash
# Check file contents
cat before.json

# Re-capture if needed
php php-backend/scripts/verify-header-calculations.php \
  --token=YOUR_TOKEN \
  --output=before.json
```

---

## Integration with Git

### Commit Verification Results

```bash
# Add verification results to git (optional)
git add phase-*-before.json phase-*-after.json
git commit -m "Phase N verification - all calculations match"
```

### Rollback Verification

After rollback, verify calculations restored:

```bash
php php-backend/scripts/verify-header-calculations.php \
  --token=YOUR_TOKEN \
  --output=after-rollback.json

php php-backend/scripts/verify-header-calculations.php \
  --compare \
  --before=before-rollback.json \
  --after=after-rollback.json
```

---

## Performance Impact

| Operation | Time | Site Impact |
|-----------|------|-------------|
| Database validation | < 100ms | None |
| Capture baseline | < 500ms | None (separate API call) |
| Compare results | < 50ms | None |

**Safe to run during production hours** ✅

---

## Next Steps

Phase 0 is **COMPLETE**. Ready to proceed with:

- [x] Phase 0: Verification harness ✅
- [ ] Phase 1: Remove debug logging
- [ ] Phase 2: Extract constants
- [ ] Phase 3: Extract empty state method
- [ ] Phase 4: Add error logging
- [ ] Phase 5: Single transaction pass
- [ ] Phase 6: Optimize role resolution

**Before Phase 1:** Run baseline capture to have comparison point

```bash
php php-backend/scripts/verify-header-calculations.php \
  --token=YOUR_TOKEN \
  --output=phase-0-baseline.json
```

---

## Support

If verification script fails:

1. Check PHP version: `php -v` (needs 7.4+)
2. Check file permissions: `ls -la php-backend/scripts/`
3. Check syntax: `php -l php-backend/scripts/verify-header-calculations.php`
4. Review error message in output

**Script is READ-ONLY and SAFE to debug** ✅
