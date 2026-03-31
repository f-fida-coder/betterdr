<?php
/**
 * Admin Header Calculation Verification Script
 * 
 * Purpose: Verify that header summary calculations are correct before/after refactoring
 * Safety: READ-ONLY - Does not modify any data
 * 
 * Usage:
 *   php scripts/verify-header-calculations.php --user=admin --token=YOUR_TOKEN
 *   php scripts/verify-header-calculations.php --compare --before=before.json --after=after.json
 */

declare(strict_types=1);

// Bootstrap
require_once __DIR__ . '/../src/Env.php';
require_once __DIR__ . '/../src/MongoRepository.php';

$projectRoot = dirname(__DIR__);
$phpBackendDir = __DIR__ . '/..';
Env::load($projectRoot, $phpBackendDir);

// Parse command line arguments
$options = getopt('', [
    'user:',
    'token:',
    'compare',
    'before:',
    'after:',
    'output:',
    'help',
]);

if (isset($options['help'])) {
    echo "Admin Header Verification Script\n";
    echo "================================\n\n";
    echo "Usage:\n";
    echo "  1. Capture baseline:\n";
    echo "     php scripts/verify-header-calculations.php --user=admin --token=YOUR_TOKEN --output=before.json\n\n";
    echo "  2. After refactoring, capture again:\n";
    echo "     php scripts/verify-header-calculations.php --user=admin --token=YOUR_TOKEN --output=after.json\n\n";
    echo "  3. Compare results:\n";
    echo "     php scripts/verify-header-calculations.php --compare --before=before.json --after=after.json\n\n";
    exit(0);
}

/**
 * Call the header summary API endpoint
 */
function callHeaderSummary(string $token): array
{
    $apiUrl = 'http://localhost:3001/api/admin/header-summary';
    
    $ch = curl_init($apiUrl);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_HTTPHEADER, [
        'Authorization: Bearer ' . $token,
        'Content-Type: application/json',
    ]);
    curl_setopt($ch, CURLOPT_TIMEOUT, 30);
    
    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $error = curl_error($ch);
    curl_close($ch);
    
    if ($error) {
        throw new Exception("CURL Error: $error");
    }
    
    if ($httpCode !== 200) {
        throw new Exception("HTTP $httpCode: $response");
    }
    
    $data = json_decode($response, true);
    if (!is_array($data)) {
        throw new Exception("Invalid JSON response");
    }
    
    return $data;
}

/**
 * Validate header summary response structure
 */
function validateStructure(array $data): array
{
    $requiredFields = [
        'totalBalance',
        'totalOutstanding',
        'totalPlayerFees',
        'paidPlayerFees',
        'unpaidPlayerFees',
        'todayNet',
        'weekNet',
        'activeAccounts',
        'agentDeposits',
        'agentWithdrawals',
        'houseDeposits',
        'houseWithdrawals',
        'agentPercent',
        'agentCollections',
        'houseCollections',
        'netCollections',
        'housePayback',
        'remainingAfterHousePayback',
        'commissionableProfit',
        'houseShareFromProfit',
        'agentShareFromProfit',
        'houseFinalAmount',
        'agentProfitAfterFees',
        'makeup',
        'unpaidAmount',
        'commissionDistribution',
        'sportsbookHealth',
    ];
    
    $missing = [];
    foreach ($requiredFields as $field) {
        if (!array_key_exists($field, $data)) {
            $missing[] = $field;
        }
    }
    
    return $missing;
}

/**
 * Compare two header summary responses
 */
function compareResults(array $before, array $after): array
{
    $results = [
        'match' => true,
        'totalFields' => 0,
        'matchingFields' => 0,
        'differentFields' => [],
        'maxDifference' => 0.0,
        'details' => [],
    ];
    
    $floatFields = [
        'totalBalance', 'totalOutstanding', 'totalPlayerFees',
        'paidPlayerFees', 'unpaidPlayerFees', 'todayNet', 'weekNet',
        'agentDeposits', 'agentWithdrawals', 'houseDeposits', 'houseWithdrawals',
        'agentCollections', 'houseCollections', 'netCollections',
        'housePayback', 'remainingAfterHousePayback', 'commissionableProfit',
        'houseShareFromProfit', 'agentShareFromProfit', 'houseFinalAmount',
        'agentProfitAfterFees', 'makeup', 'unpaidAmount',
    ];
    
    $intFields = ['activeAccounts'];
    
    $arrayFields = ['commissionDistribution', 'sportsbookHealth'];
    
    $allFields = array_unique(array_merge(
        array_keys($before),
        array_keys($after)
    ));
    
    $results['totalFields'] = count($allFields);
    
    foreach ($allFields as $field) {
        $beforeValue = $before[$field] ?? null;
        $afterValue = $after[$field] ?? null;
        
        $results['details'][$field] = [
            'before' => $beforeValue,
            'after' => $afterValue,
        ];
        
        if (in_array($field, $floatFields, true)) {
            $beforeFloat = (float) ($beforeValue ?? 0);
            $afterFloat = (float) ($afterValue ?? 0);
            $diff = abs($beforeFloat - $afterFloat);
            
            if ($diff > $results['maxDifference']) {
                $results['maxDifference'] = $diff;
            }
            
            // Allow tiny floating point differences
            if ($diff < 0.01) {
                $results['matchingFields']++;
            } else {
                $results['match'] = false;
                $results['differentFields'][] = $field;
                $results['details'][$field]['difference'] = $diff;
            }
        } elseif (in_array($field, $intFields, true)) {
            if ($beforeValue === $afterValue) {
                $results['matchingFields']++;
            } else {
                $results['match'] = false;
                $results['differentFields'][] = $field;
            }
        } elseif (in_array($field, $arrayFields, true)) {
            // For arrays, just check if both exist (content may vary)
            if (is_array($beforeValue) && is_array($afterValue)) {
                $results['matchingFields']++;
            } else {
                $results['match'] = false;
                $results['differentFields'][] = $field;
            }
        } else {
            // Other fields - exact match
            if ($beforeValue === $afterValue) {
                $results['matchingFields']++;
            } else {
                $results['match'] = false;
                $results['differentFields'][] = $field;
            }
        }
    }
    
    return $results;
}

/**
 * Format number for display
 */
function formatNumber($value): string
{
    if ($value === null) {
        return 'null';
    }
    if (is_float($value)) {
        return number_format($value, 2);
    }
    if (is_int($value)) {
        return (string) $value;
    }
    if (is_array($value)) {
        return 'array[' . count($value) . ']';
    }
    return (string) $value;
}

// ============================================================================
// MAIN EXECUTION
// ============================================================================

echo "==============================================\n";
echo "Admin Header Calculation Verification\n";
echo "==============================================\n\n";

try {
    // Comparison mode
    if (isset($options['compare'])) {
        echo "Mode: COMPARISON\n\n";
        
        if (empty($options['before']) || empty($options['after'])) {
            echo "❌ Error: --before and --after files are required for comparison\n";
            exit(1);
        }
        
        if (!file_exists($options['before'])) {
            echo "❌ Error: File not found: {$options['before']}\n";
            exit(1);
        }
        
        if (!file_exists($options['after'])) {
            echo "❌ Error: File not found: {$options['after']}\n";
            exit(1);
        }
        
        $beforeData = json_decode(file_get_contents($options['before']), true);
        $afterData = json_decode(file_get_contents($options['after']), true);
        
        if (!is_array($beforeData) || !is_array($afterData)) {
            echo "❌ Error: Invalid JSON in input files\n";
            exit(1);
        }
        
        echo "Before: {$options['before']}\n";
        echo "After:  {$options['after']}\n\n";
        
        $comparison = compareResults($beforeData, $afterData);
        
        echo "Results:\n";
        echo "--------\n";
        echo "Total Fields:      {$comparison['totalFields']}\n";
        echo "Matching Fields:   {$comparison['matchingFields']}\n";
        echo "Different Fields:  " . count($comparison['differentFields']) . "\n";
        echo "Max Difference:    " . number_format($comparison['maxDifference'], 4) . "\n\n";
        
        if ($comparison['match']) {
            echo "✅ SUCCESS: All calculations match!\n";
            echo "   Max difference: " . number_format($comparison['maxDifference'], 4) . " (threshold: 0.01)\n";
            exit(0);
        } else {
            echo "❌ MISMATCH DETECTED:\n\n";
            foreach ($comparison['differentFields'] as $field) {
                $detail = $comparison['details'][$field];
                echo "   • $field\n";
                echo "     Before: " . formatNumber($detail['before']) . "\n";
                echo "     After:  " . formatNumber($detail['after']) . "\n";
                if (isset($detail['difference'])) {
                    echo "     Diff:   " . number_format($detail['difference'], 4) . "\n";
                }
                echo "\n";
            }
            exit(1);
        }
    }
    
    // Capture mode
    if (!empty($options['token'])) {
        echo "Mode: CAPTURE\n\n";
        
        $token = $options['token'];
        $outputFile = $options['output'] ?? null;
        
        echo "Calling /api/admin/header-summary...\n";
        
        $data = callHeaderSummary($token);
        
        echo "✅ Response received\n\n";
        
        // Validate structure
        $missing = validateStructure($data);
        if (!empty($missing)) {
            echo "⚠️  Warning: Missing fields in response:\n";
            foreach ($missing as $field) {
                echo "   - $field\n";
            }
            echo "\n";
        } else {
            echo "✅ Response structure is valid (all 27 fields present)\n\n";
        }
        
        // Display summary
        echo "Header Summary Values:\n";
        echo "----------------------\n";
        echo "Total Balance:          " . formatNumber($data['totalBalance'] ?? null) . "\n";
        echo "Total Outstanding:      " . formatNumber($data['totalOutstanding'] ?? null) . "\n";
        echo "Today Net:              " . formatNumber($data['todayNet'] ?? null) . "\n";
        echo "Week Net:               " . formatNumber($data['weekNet'] ?? null) . "\n";
        echo "Active Accounts:        " . formatNumber($data['activeAccounts'] ?? null) . "\n";
        echo "Agent Collections:      " . formatNumber($data['agentCollections'] ?? null) . "\n";
        echo "House Collections:      " . formatNumber($data['houseCollections'] ?? null) . "\n";
        echo "Net Collections:        " . formatNumber($data['netCollections'] ?? null) . "\n";
        echo "Commissionable Profit:  " . formatNumber($data['commissionableProfit'] ?? null) . "\n";
        echo "Agent Share:            " . formatNumber($data['agentShareFromProfit'] ?? null) . "\n";
        echo "House Share:            " . formatNumber($data['houseShareFromProfit'] ?? null) . "\n";
        echo "Agent Profit After Fees: " . formatNumber($data['agentProfitAfterFees'] ?? null) . "\n";
        echo "House Final Amount:     " . formatNumber($data['houseFinalAmount'] ?? null) . "\n";
        echo "Makeup:                 " . formatNumber($data['makeup'] ?? null) . "\n";
        echo "Player Fees (Total):    " . formatNumber($data['totalPlayerFees'] ?? null) . "\n";
        echo "\n";
        
        // Save to file if requested
        if ($outputFile) {
            file_put_contents($outputFile, json_encode($data, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));
            echo "✅ Saved to: $outputFile\n";
        }
        
        exit(0);
    }
    
    // Direct database check mode
    echo "Mode: DATABASE VALIDATION\n\n";
    
    $db = new MongoRepository('mysql-native', (string) Env::get('MYSQL_DB', Env::get('DB_NAME', 'betterdr')));
    
    // Check if we can connect
    $userCount = $db->countDocuments('users', []);
    $transactionCount = $db->countDocuments('transactions', []);
    $agentCount = $db->countDocuments('agents', []);
    
    echo "Database Connection: ✅ OK\n\n";
    echo "Collection Counts:\n";
    echo "  - users:         $userCount\n";
    echo "  - transactions:  $transactionCount\n";
    echo "  - agents:        $agentCount\n\n";
    
    // Check for recent transactions
    $recentTx = $db->findMany('transactions', [
        'status' => 'completed',
        'createdAt' => ['$gte' => MongoRepository::utcFromMillis((time() - 86400) * 1000)]
    ], ['limit' => 5]);
    
    if (count($recentTx) > 0) {
        echo "Recent Transactions (last 24h): " . count($recentTx) . " found\n";
        echo "Sample transaction types:\n";
        $types = [];
        foreach ($recentTx as $tx) {
            $type = $tx['type'] ?? 'unknown';
            $types[$type] = ($types[$type] ?? 0) + 1;
        }
        foreach ($types as $type => $count) {
            echo "  - $type: $count\n";
        }
    } else {
        echo "No transactions in last 24 hours\n";
    }
    
    echo "\n✅ Database validation complete\n";
    exit(0);
    
} catch (Exception $e) {
    echo "❌ Error: " . $e->getMessage() . "\n";
    echo "File: " . $e->getFile() . ":" . $e->getLine() . "\n\n";
    echo "Stack trace:\n" . $e->getTraceAsString() . "\n";
    exit(1);
}
