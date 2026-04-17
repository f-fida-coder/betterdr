<?php

declare(strict_types=1);

final class SqlRepository
{
    private PDO $pdo;
    private string $dbName;
    private string $tablePrefix;
    /** @var array<string, bool> */
    private array $columnExistsCache = [];
    /** @var array<string, bool> */
    private array $indexExistsCache = [];

    /** @param string $_dsn Unused legacy parameter (kept for call-site compatibility) */
    public function __construct(string $_dsn, string $dbName)
    {
        $this->dbName = $dbName;
        $this->tablePrefix = (string) Env::get('MYSQL_TABLE_PREFIX', '');

        $host = (string) Env::get('MYSQL_HOST', Env::get('DB_HOST', '127.0.0.1'));
        $port = (int) Env::get('MYSQL_PORT', Env::get('DB_PORT', '3306'));
        $name = (string) Env::get('MYSQL_DB', Env::get('DB_NAME', $dbName !== '' ? $dbName : 'sports_betting'));
        $user = (string) Env::get('MYSQL_USER', Env::get('DB_USER', 'root'));
        $pass = (string) Env::get('MYSQL_PASSWORD', Env::get('DB_PASSWORD', ''));

        $pdoOptions = [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_TIMEOUT => 5,
            PDO::ATTR_PERSISTENT => true,
        ];
        if (defined('Pdo\\Mysql::ATTR_INIT_COMMAND')) {
            $pdoOptions[\Pdo\Mysql::ATTR_INIT_COMMAND] = 'SET NAMES utf8mb4';
        } elseif (defined('PDO::MYSQL_ATTR_INIT_COMMAND')) {
            $pdoOptions[PDO::MYSQL_ATTR_INIT_COMMAND] = 'SET NAMES utf8mb4';
        }

        $hostCandidates = [];

        $rawHostList = (string) Env::get('MYSQL_HOSTS', '');
        if ($rawHostList !== '') {
            foreach (explode(',', $rawHostList) as $listHost) {
                $listHost = trim($listHost);
                if ($listHost !== '') {
                    $hostCandidates[] = $listHost;
                }
            }
        }

        $hostCandidates[] = $host;

        // Shared-hosted MySQL setups often only accept localhost from their own web tier.
        if (!in_array(strtolower($host), ['localhost', '127.0.0.1'], true)) {
            $hostCandidates[] = 'localhost';
            $hostCandidates[] = '127.0.0.1';
        }

        $resolvedHost = gethostbyname($host);
        if (
            is_string($resolvedHost)
            && $resolvedHost !== ''
            && $resolvedHost !== $host
            && filter_var($resolvedHost, FILTER_VALIDATE_IP) !== false
        ) {
            $hostCandidates[] = $resolvedHost;
        }

        $hostCandidates = array_values(array_unique($hostCandidates));

        $lastException = null;
        $attemptedHosts = [];
        foreach ($hostCandidates as $candidateHost) {
            $attemptedHosts[] = $candidateHost;
            $dsn = "mysql:host={$candidateHost};port={$port};dbname={$name};charset=utf8mb4";
            for ($attempt = 1; $attempt <= 3; $attempt++) {
                try {
                    $this->pdo = new PDO($dsn, $user, $pass, $pdoOptions);
                    $lastException = null;
                    break 2;
                } catch (PDOException $e) {
                    $lastException = $e;
                    $errorText = strtolower($e->getMessage());
                    $isAuthError = str_contains($errorText, 'sqlstate[hy000] [1045]');
                    $isQuotaError = str_contains($errorText, 'max_connections_per_hour')
                        || str_contains($errorText, 'sqlstate[hy000] [1226]');
                    if ($isAuthError) {
                        // Credentials/host grants can differ per host candidate.
                        // Stop retrying this host, but continue to the next candidate.
                        break;
                    }
                    if ($isQuotaError) {
                        // Resource limits are account-wide; trying more hosts only burns more attempts.
                        break 2;
                    }
                    if ($attempt < 3) {
                        usleep(250000);
                    }
                }
            }
        }

        if ($lastException instanceof PDOException) {
            $message = $lastException->getMessage();
            if ($attemptedHosts !== []) {
                $message .= ' | hosts tried: ' . implode(', ', $attemptedHosts);
            }
            $lastException = new PDOException($message, (int) $lastException->getCode(), $lastException);
            throw $lastException;
        }
    }

    public static function isAvailable(): bool
    {
        return extension_loaded('pdo_mysql');
    }

    public function beginTransaction(): void
    {
        if (!$this->pdo->inTransaction()) {
            $this->pdo->beginTransaction();
        }
    }

    public function commit(): void
    {
        if ($this->pdo->inTransaction()) {
            $this->pdo->commit();
        }
    }

    public function rollback(): void
    {
        if ($this->pdo->inTransaction()) {
            $this->pdo->rollBack();
        }
    }

    public function acquireNamedLock(string $name, int $timeoutSeconds = 0): bool
    {
        $stmt = $this->pdo->prepare('SELECT GET_LOCK(:name, :timeout) AS `lock_status`');
        $stmt->bindValue(':name', $name, PDO::PARAM_STR);
        $stmt->bindValue(':timeout', max(0, $timeoutSeconds), PDO::PARAM_INT);
        $stmt->execute();

        return (int) $stmt->fetchColumn() === 1;
    }

    public function releaseNamedLock(string $name): bool
    {
        $stmt = $this->pdo->prepare('SELECT RELEASE_LOCK(:name) AS `lock_status`');
        $stmt->bindValue(':name', $name, PDO::PARAM_STR);
        $stmt->execute();

        return (int) $stmt->fetchColumn() === 1;
    }

    public function findOneForUpdate(string $collection, array $filter): ?array
    {
        $table = $this->tableName($collection);
        $this->ensureTable($table);

        $candidateIds = [];
        if (array_key_exists('id', $filter)) {
            $idFilter = $filter['id'];
            if (is_string($idFilter) || is_int($idFilter) || is_float($idFilter)) {
                $id = trim((string) $idFilter);
                if ($id !== '') {
                    $candidateIds[] = $id;
                }
            } elseif (is_array($idFilter) && isset($idFilter['$in']) && is_array($idFilter['$in'])) {
                foreach ($idFilter['$in'] as $inId) {
                    if (is_string($inId) || is_int($inId) || is_float($inId)) {
                        $id = trim((string) $inId);
                        if ($id !== '') {
                            $candidateIds[] = $id;
                        }
                    }
                }
            }
        }

        if ($candidateIds === []) {
            $candidate = $this->findOne($collection, $filter, ['projection' => ['id' => 1]]);
            $candidateId = trim((string) ($candidate['id'] ?? ''));
            if ($candidateId === '') {
                return null;
            }
            $candidateIds[] = $candidateId;
        }

        $candidateIds = array_values(array_unique($candidateIds));
        if ($candidateIds === []) {
            return null;
        }

        if (count($candidateIds) === 1) {
            $stmt = $this->pdo->prepare("SELECT `id`, `doc` FROM `{$table}` WHERE `id` = :id LIMIT 1 FOR UPDATE");
            $stmt->execute([':id' => $candidateIds[0]]);
        } else {
            $placeholders = implode(',', array_fill(0, count($candidateIds), '?'));
            $stmt = $this->pdo->prepare("SELECT `id`, `doc` FROM `{$table}` WHERE `id` IN ({$placeholders}) FOR UPDATE");
            $stmt->execute($candidateIds);
        }

        $rows = $stmt->fetchAll();
        foreach ($rows as $row) {
            $decoded = $this->decodeRow($row);
            if ($decoded !== null && $this->matchesFilter($decoded, $filter)) {
                return $decoded;
            }
        }

        return null;
    }

    public function findOne(string $collection, array $filter, array $options = []): ?array
    {
        $items = $this->findMany($collection, $filter, array_merge($options, ['limit' => 1]));
        return $items[0] ?? null;
    }

    public function findMany(string $collection, array $filter, array $options = []): array
    {
        $sqlDocs = $this->findManyViaSql($collection, $filter, $options);
        if ($sqlDocs !== null) {
            return $sqlDocs;
        }

        $docs = $this->readCollection($collection);

        if ($filter !== []) {
            $docs = array_values(array_filter($docs, fn (array $doc): bool => $this->matchesFilter($doc, $filter)));
        }

        if (isset($options['sort']) && is_array($options['sort'])) {
            $sort = $options['sort'];
            usort($docs, function (array $a, array $b) use ($sort): int {
                foreach ($sort as $field => $dirRaw) {
                    $dir = ((int) $dirRaw) >= 0 ? 1 : -1;
                    $av = $this->firstExtractedValue($a, (string) $field);
                    $bv = $this->firstExtractedValue($b, (string) $field);
                    $cmp = $this->compareValues($av, $bv);
                    if ($cmp !== 0) {
                        return $cmp * $dir;
                    }
                }
                return 0;
            });
        }

        $skip = isset($options['skip']) ? max(0, (int) $options['skip']) : 0;
        $limit = isset($options['limit']) ? max(0, (int) $options['limit']) : 0;

        if ($skip > 0 || $limit > 0) {
            $docs = array_slice($docs, $skip, $limit > 0 ? $limit : null);
        }

        if (isset($options['projection']) && is_array($options['projection']) && $options['projection'] !== []) {
            $docs = array_map(fn (array $doc): array => $this->applyProjection($doc, $options['projection']), $docs);
        }

        return $docs;
    }

    public function countDocuments(string $collection, array $filter): int
    {
        $sqlCount = $this->countDocumentsViaSql($collection, $filter);
        if ($sqlCount !== null) {
            return $sqlCount;
        }

        return count($this->findMany($collection, $filter));
    }

    public function insertOne(string $collection, array $doc): string
    {
        $table = $this->tableName($collection);
        $this->ensureTable($table);

        $normalized = $this->normalizeForStorage($doc);
        $id = $this->extractId($normalized);
        unset($normalized['id']);

        $stmt = $this->pdo->prepare("INSERT INTO `{$table}` (`id`, `doc`, `created_at`, `updated_at`) VALUES (:id, :doc, :created_at, :updated_at) ON DUPLICATE KEY UPDATE `doc`=VALUES(`doc`), `created_at`=VALUES(`created_at`), `updated_at`=VALUES(`updated_at`), `migrated_at`=CURRENT_TIMESTAMP");
        $stmt->execute([
            ':id' => $id,
            ':doc' => $this->encodeDoc($normalized),
            ':created_at' => $this->toMysqlDateTime($normalized['createdAt'] ?? null),
            ':updated_at' => $this->toMysqlDateTime($normalized['updatedAt'] ?? null),
        ]);

        return $id;
    }

    public function insertOneIfAbsent(string $collection, array $doc): bool
    {
        $table = $this->tableName($collection);
        $this->ensureTable($table);

        $normalized = $this->normalizeForStorage($doc);
        $id = $this->extractId($normalized);
        unset($normalized['id']);

        $stmt = $this->pdo->prepare("INSERT IGNORE INTO `{$table}` (`id`, `doc`, `created_at`, `updated_at`) VALUES (:id, :doc, :created_at, :updated_at)");
        $stmt->execute([
            ':id' => $id,
            ':doc' => $this->encodeDoc($normalized),
            ':created_at' => $this->toMysqlDateTime($normalized['createdAt'] ?? null),
            ':updated_at' => $this->toMysqlDateTime($normalized['updatedAt'] ?? null),
        ]);

        return ((int) $stmt->rowCount()) === 1;
    }

    public function updateOne(string $collection, array $filter, array $set): void
    {
        $table = $this->tableName($collection);
        $this->ensureTable($table);

        $existing = $this->findOne($collection, $filter);
        if ($existing === null) {
            return;
        }

        $merged = $existing;
        foreach ($this->normalizeForStorage($set) as $k => $v) {
            $merged[(string) $k] = $v;
        }

        $id = (string) ($existing['id'] ?? '');
        if ($id === '') {
            $id = $this->newDocumentId();
            $merged['id'] = $id;
        }
        unset($merged['id']);

        $stmt = $this->pdo->prepare("UPDATE `{$table}` SET `doc`=:doc, `created_at`=:created_at, `updated_at`=:updated_at, `migrated_at`=CURRENT_TIMESTAMP WHERE `id`=:id LIMIT 1");
        $stmt->execute([
            ':id' => $id,
            ':doc' => $this->encodeDoc($merged),
            ':created_at' => $this->toMysqlDateTime($merged['createdAt'] ?? null),
            ':updated_at' => $this->toMysqlDateTime($merged['updatedAt'] ?? null),
        ]);
    }

    /**
     * Update all documents matching $filter with $set values.
     * Returns the number of documents updated.
     */
    public function updateMany(string $collection, array $filter, array $set): int
    {
        $docs = $this->findMany($collection, $filter, ['projection' => ['id' => 1]]);
        $updated = 0;
        foreach ($docs as $doc) {
            $id = (string) ($doc['id'] ?? '');
            if ($id !== '') {
                $this->updateOne($collection, ['id' => $id], $set);
                $updated++;
            }
        }
        return $updated;
    }

    public function updateOneUpsert(string $collection, array $filter, array $set, array $setOnInsert = []): void
    {
        $existing = $this->findOne($collection, $filter);
        if ($existing !== null) {
            $this->updateOne($collection, ['id' => (string) ($existing['id'] ?? '')], $set);
            return;
        }

        $doc = $this->normalizeForStorage($setOnInsert);
        foreach ($this->normalizeForStorage($set) as $k => $v) {
            $doc[(string) $k] = $v;
        }
        $this->insertOne($collection, $doc);
    }

    public function deleteOne(string $collection, array $filter): int
    {
        $table = $this->tableName($collection);
        $this->ensureTable($table);

        $existing = $this->findOne($collection, $filter, ['projection' => ['id' => 1]]);
        $id = (string) ($existing['id'] ?? '');
        if ($id === '') {
            return 0;
        }

        $stmt = $this->pdo->prepare("DELETE FROM `{$table}` WHERE `id`=:id LIMIT 1");
        $stmt->execute([':id' => $id]);
        return (int) $stmt->rowCount();
    }

    public function deleteMany(string $collection, array $filter, int $maxIterations = 10000): int
    {
        if (count($filter) === 0) {
            throw new \RuntimeException('deleteMany() requires a non-empty filter to prevent accidental full-table wipe');
        }
        $deleted = 0;
        while ($deleted < $maxIterations) {
            $count = $this->deleteOne($collection, $filter);
            if ($count === 0) {
                break;
            }
            $deleted += $count;
        }
        if ($deleted >= $maxIterations) {
            error_log("[SAFETY] deleteMany() hit max iteration limit ({$maxIterations}) on collection={$collection}");
        }
        return $deleted;
    }

    public static function id(mixed $id): string
    {
        $value = trim((string) $id);
        return $value;
    }

    public static function nowUtc(): string
    {
        return gmdate(DATE_ATOM);
    }

    public static function utcFromMillis(int $milliseconds): string
    {
        $seconds = (int) floor($milliseconds / 1000);
        return gmdate(DATE_ATOM, $seconds);
    }

    public function tableNameForCollection(string $collection): string
    {
        return $this->tableName($collection);
    }

    public function tableExists(string $table): bool
    {
        $stmt = $this->pdo->prepare("SELECT 1 FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name = :table LIMIT 1");
        $stmt->execute([':table' => $table]);
        return (bool) $stmt->fetchColumn();
    }

    private function tableName(string $collection): string
    {
        $table = strtolower($collection);
        $table = preg_replace('/[^a-z0-9_]+/i', '_', $table) ?? $table;
        $table = trim($table, '_');
        if ($table === '') {
            $table = 'collection_data';
        }
        if (preg_match('/^[0-9]/', $table) === 1) {
            $table = 'c_' . $table;
        }
        return $this->tablePrefix . $table;
    }

    private function ensureTable(string $table): void
    {
        $sql = "CREATE TABLE IF NOT EXISTS `{$table}` (
`id` VARCHAR(64) NOT NULL,
`doc` JSON NOT NULL,
`created_at` DATETIME NULL,
`updated_at` DATETIME NULL,
`migrated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
PRIMARY KEY (`id`),
KEY `idx_created_at` (`created_at`),
KEY `idx_updated_at` (`updated_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci";
        $this->pdo->exec($sql);
        $this->ensureSpecializedSchema($table);
    }

    private function readCollection(string $collection): array
    {
        $table = $this->tableName($collection);
        $this->ensureTable($table);

        $rows = $this->pdo->query("SELECT `id`, `doc` FROM `{$table}`")->fetchAll();
        $docs = [];
        foreach ($rows as $row) {
            $decoded = $this->decodeRow($row);
            if ($decoded !== null) {
                $docs[] = $decoded;
            }
        }
        return $docs;
    }

    private function findManyViaSql(string $collection, array $filter, array $options): ?array
    {
        if (!$this->supportsSqlReadOptimization($collection)) {
            return null;
        }

        $table = $this->tableName($collection);
        $this->ensureTable($table);

        $compiledWhere = $this->compileSqlWhere($collection, $table, $filter);
        if ($compiledWhere === null) {
            return null;
        }

        $orderSql = $this->compileSqlOrder($collection, $table, $options['sort'] ?? null);
        if ($orderSql === null) {
            return null;
        }

        $limitSql = $this->compileSqlLimit($options);
        $sql = "SELECT `id`, `doc` FROM `{$table}`{$compiledWhere['sql']}{$orderSql}{$limitSql}";

        $stmt = $this->pdo->prepare($sql);
        foreach ($compiledWhere['params'] as $param) {
            $stmt->bindValue($param['name'], $param['value'], $param['type']);
        }
        $stmt->execute();

        $rows = $stmt->fetchAll();
        $docs = [];
        foreach ($rows as $row) {
            $decoded = $this->decodeRow($row);
            if ($decoded !== null) {
                $docs[] = $decoded;
            }
        }

        if (isset($options['projection']) && is_array($options['projection']) && $options['projection'] !== []) {
            $docs = array_map(fn (array $doc): array => $this->applyProjection($doc, $options['projection']), $docs);
        }

        return $docs;
    }

    private function countDocumentsViaSql(string $collection, array $filter): ?int
    {
        if (!$this->supportsSqlReadOptimization($collection)) {
            return null;
        }

        $table = $this->tableName($collection);
        $this->ensureTable($table);

        $compiledWhere = $this->compileSqlWhere($collection, $table, $filter);
        if ($compiledWhere === null) {
            return null;
        }

        $stmt = $this->pdo->prepare("SELECT COUNT(*) FROM `{$table}`{$compiledWhere['sql']}");
        foreach ($compiledWhere['params'] as $param) {
            $stmt->bindValue($param['name'], $param['value'], $param['type']);
        }
        $stmt->execute();

        return (int) $stmt->fetchColumn();
    }

    private function supportsSqlReadOptimization(string $collection): bool
    {
        return in_array($collection, ['casino_bets', 'casino_round_audit', 'transactions', 'casinogames', 'users', 'agents', 'bets', 'betselections', 'matches', 'messages', 'iplogs', 'master_agents', 'admins', 'admin_audit_log', 'rate_limits', 'betrequests', 'betmoderules', 'faqs', 'manualsections', 'feedbacks'], true);
    }

    /**
     * @return array{sql: string, params: array<int, array{name: string, value: mixed, type: int}>}|null
     */
    private function compileSqlWhere(string $collection, string $table, array $filter): ?array
    {
        if ($filter === []) {
            return ['sql' => '', 'params' => []];
        }

        $index = 0;
        $compiled = $this->compileSqlFilterNode($collection, $table, $filter, $index);
        if ($compiled === null) {
            return null;
        }
        if ($compiled['sql'] === '') {
            return ['sql' => '', 'params' => []];
        }

        return ['sql' => ' WHERE ' . $compiled['sql'], 'params' => $compiled['params']];
    }

    /**
     * @return array{sql: string, params: array<int, array{name: string, value: mixed, type: int}>}|null
     */
    private function compileSqlFilterNode(string $collection, string $table, array $filter, int &$index): ?array
    {
        $clauses = [];
        $params = [];

        foreach ($filter as $field => $condition) {
            if (!is_string($field) || $field === '') {
                return null;
            }

            if (in_array($field, ['$or', '$and', '$nor'], true)) {
                $compiled = $this->compileSqlLogicalNode($collection, $table, $field, $condition, $index);
                if ($compiled === null) {
                    return null;
                }
                if ($compiled['sql'] !== '') {
                    $clauses[] = $compiled['sql'];
                    $params = array_merge($params, $compiled['params']);
                }
                continue;
            }

            if (str_starts_with($field, '$')) {
                return null;
            }

            $compiled = $this->compileSqlFieldCondition($collection, $table, $field, $condition, $index);
            if ($compiled === null) {
                return null;
            }
            if ($compiled['sql'] !== '') {
                $clauses[] = $compiled['sql'];
                $params = array_merge($params, $compiled['params']);
            }
        }

        if ($clauses === []) {
            return ['sql' => '', 'params' => []];
        }

        return ['sql' => implode(' AND ', array_map(static fn (string $clause): string => '(' . $clause . ')', $clauses)), 'params' => $params];
    }

    /**
     * @return array{sql: string, params: array<int, array{name: string, value: mixed, type: int}>}|null
     */
    private function compileSqlLogicalNode(string $collection, string $table, string $operator, mixed $condition, int &$index): ?array
    {
        if (!is_array($condition)) {
            return null;
        }

        $parts = [];
        $params = [];

        foreach ($condition as $subFilter) {
            if (!is_array($subFilter)) {
                return null;
            }

            $compiled = $this->compileSqlFilterNode($collection, $table, $subFilter, $index);
            if ($compiled === null) {
                return null;
            }

            if ($compiled['sql'] === '') {
                if ($operator === '$or') {
                    return ['sql' => '1 = 1', 'params' => []];
                }
                if ($operator === '$nor') {
                    return ['sql' => '0 = 1', 'params' => []];
                }
                continue;
            }

            $parts[] = '(' . $compiled['sql'] . ')';
            $params = array_merge($params, $compiled['params']);
        }

        if ($parts === []) {
            if ($operator === '$or') {
                return ['sql' => '0 = 1', 'params' => []];
            }
            return ['sql' => '', 'params' => []];
        }

        if ($operator === '$and') {
            return ['sql' => implode(' AND ', $parts), 'params' => $params];
        }
        if ($operator === '$or') {
            return ['sql' => implode(' OR ', $parts), 'params' => $params];
        }
        if ($operator === '$nor') {
            return ['sql' => 'NOT (' . implode(' OR ', $parts) . ')', 'params' => $params];
        }

        return null;
    }

    /**
     * @return array{sql: string, params: array<int, array{name: string, value: mixed, type: int}>}|null
     */
    private function compileSqlFieldCondition(string $collection, string $table, string $field, mixed $condition, int &$index): ?array
    {
        $spec = $this->sqlFieldSpec($collection, $table, $field);
        if ($spec === null) {
            return null;
        }

        $compareExpr = $this->sqlComparableExpression($spec['expr'], $spec['type']);
        if ($compareExpr === null) {
            return null;
        }

        if (is_array($condition)) {
            if (!$this->hasOperatorKeys($condition)) {
                return null;
            }

            $clauses = [];
            $params = [];

            foreach ($condition as $op => $expected) {
                if ($op === '$options') {
                    continue;
                }

                if ($op === '$in') {
                    if (!is_array($expected)) {
                        return null;
                    }
                    if ($expected === []) {
                        $clauses[] = '0 = 1';
                        continue;
                    }

                    $placeholders = [];
                    foreach ($expected as $inValue) {
                        if ($inValue === null || is_array($inValue) || is_object($inValue)) {
                            return null;
                        }
                        $index++;
                        $paramName = ':w' . $index;
                        $value = $this->sqlComparableValue($inValue, $spec['type']);
                        $placeholders[] = $paramName;
                        $params[] = ['name' => $paramName, 'value' => $value, 'type' => $this->sqlParamType($value)];
                    }
                    $clauses[] = $compareExpr . ' IN (' . implode(', ', $placeholders) . ')';
                    continue;
                }

                if ($op === '$ne') {
                    if ($expected === null || is_array($expected) || is_object($expected)) {
                        return null;
                    }
                    $index++;
                    $paramName = ':w' . $index;
                    $value = $this->sqlComparableValue($expected, $spec['type']);
                    $clauses[] = '(' . $compareExpr . " IS NULL OR {$compareExpr} <> {$paramName})";
                    $params[] = ['name' => $paramName, 'value' => $value, 'type' => $this->sqlParamType($value)];
                    continue;
                }

                if (in_array($op, ['$gt', '$gte', '$lt', '$lte'], true)) {
                    $index++;
                    $paramName = ':w' . $index;
                    $value = $this->sqlComparableValue($expected, $spec['type']);
                    $clauses[] = "{$compareExpr} {$this->sqlOperator($op)} {$paramName}";
                    $params[] = ['name' => $paramName, 'value' => $value, 'type' => $this->sqlParamType($value)];
                    continue;
                }

                if ($op === '$regex') {
                    if ($spec['type'] !== 'string') {
                        return null;
                    }
                    $literal = $this->regexPatternToLikeLiteral((string) $expected);
                    if ($literal === null) {
                        return null;
                    }
                    if ($literal === '') {
                        return ['sql' => '0 = 1', 'params' => []];
                    }

                    $index++;
                    $paramName = ':w' . $index;
                    $pattern = '%' . $this->escapeLikePattern($literal) . '%';
                    $options = (string) ($condition['$options'] ?? '');
                    if (str_contains($options, 'i')) {
                        $clauses[] = 'LOWER(COALESCE(' . $spec['expr'] . ", '')) LIKE LOWER({$paramName}) ESCAPE '\\\\'";
                    } else {
                        $clauses[] = 'COALESCE(' . $spec['expr'] . ", '') LIKE {$paramName} ESCAPE '\\\\'";
                    }
                    $params[] = ['name' => $paramName, 'value' => $pattern, 'type' => PDO::PARAM_STR];
                    continue;
                }

                return null;
            }

            if ($clauses === []) {
                return ['sql' => '', 'params' => []];
            }

            return ['sql' => implode(' AND ', array_map(static fn (string $clause): string => '(' . $clause . ')', $clauses)), 'params' => $params];
        }

        if ($condition === null || is_object($condition)) {
            return null;
        }

        $index++;
        $paramName = ':w' . $index;
        $value = $this->sqlComparableValue($condition, $spec['type']);
        return [
            'sql' => "{$compareExpr} = {$paramName}",
            'params' => [['name' => $paramName, 'value' => $value, 'type' => $this->sqlParamType($value)]],
        ];
    }

    private function compileSqlOrder(string $collection, string $table, mixed $sort): ?string
    {
        if (!is_array($sort) || $sort === []) {
            return '';
        }

        $parts = [];
        foreach ($sort as $field => $dirRaw) {
            if (!is_string($field) || $field === '' || str_starts_with($field, '$') || str_contains($field, '.')) {
                return null;
            }

            $spec = $this->sqlFieldSpec($collection, $table, $field);
            if ($spec === null) {
                return null;
            }

            $expr = $this->sqlComparableExpression($spec['expr'], $spec['type']);
            if ($expr === null) {
                return null;
            }

            $direction = ((int) $dirRaw) >= 0 ? 'ASC' : 'DESC';
            $parts[] = "{$expr} {$direction}";
        }

        return $parts === [] ? '' : ' ORDER BY ' . implode(', ', $parts);
    }

    private function compileSqlLimit(array $options): string
    {
        $skip = isset($options['skip']) ? max(0, (int) $options['skip']) : 0;
        $limit = isset($options['limit']) ? max(0, (int) $options['limit']) : 0;

        if ($limit > 0) {
            $sql = " LIMIT {$limit}";
            if ($skip > 0) {
                $sql .= " OFFSET {$skip}";
            }
            return $sql;
        }

        if ($skip > 0) {
            return " LIMIT 18446744073709551615 OFFSET {$skip}";
        }

        return '';
    }

    /**
     * @return array{expr: string, type: string}|null
     */
    private function sqlFieldSpec(string $collection, string $table, string $field): ?array
    {
        if ($field === 'id') {
            return ['expr' => '`id`', 'type' => 'string'];
        }
        if ($field === 'createdAt') {
            return ['expr' => '`created_at`', 'type' => 'date'];
        }
        if ($field === 'updatedAt') {
            return ['expr' => '`updated_at`', 'type' => 'date'];
        }

        $generatedColumns = [
            'casino_bets' => [
                'userId' => 'j_user_id',
                'username' => 'j_username',
                'roundId' => 'j_round_id',
                'requestId' => 'j_request_id',
                'game' => 'j_game',
                'totalWager' => 'j_total_wager',
                'totalReturn' => 'j_total_return',
                'netResult' => 'j_net_result',
                'roundStatus' => 'j_round_status',
                'result' => 'j_result',
            ],
            'casino_round_audit' => [
                'roundId' => 'j_round_id',
                'userId' => 'j_user_id',
                'game' => 'j_game',
                'action' => 'j_action',
            ],
            'users' => [
                'username' => 'j_username',
                'phoneNumber' => 'j_phone',
                'agentId' => 'j_agent_id',
                'role' => 'j_role',
                'status' => 'j_status',
                'firstName' => 'j_first_name',
                'lastName' => 'j_last_name',
                'fullName' => 'j_full_name',
                'balance' => 'j_balance',
                'creditLimit' => 'j_credit_limit',
                'balanceOwed' => 'j_balance_owed',
                'freeplayBalance' => 'j_freeplay_balance',
                'pendingBalance' => 'j_pending_balance',
                'lifetime' => 'j_lifetime',
                'minBet' => 'j_min_bet',
                'maxBet' => 'j_max_bet',
                'createdBy' => 'j_created_by',
                'createdByModel' => 'j_created_by_model',
            ],
            'admins' => [
                'username' => 'j_username',
                'email' => 'j_email',
                'role' => 'j_role',
                'isSuperAdmin' => 'j_is_super_admin',
                'status' => 'j_status',
                'fullName' => 'j_full_name',
                'phoneNumber' => 'j_phone',
            ],
            'agents' => [
                'username' => 'j_username',
                'phoneNumber' => 'j_phone',
                'createdBy' => 'j_created_by',
                'role' => 'j_role',
                'status' => 'j_status',
                'fullName' => 'j_full_name',
                'balance' => 'j_balance',
                'agentBillingRate' => 'j_billing_rate',
                'agentBillingStatus' => 'j_billing_status',
                'createdByModel' => 'j_created_by_model',
            ],
            'master_agents' => [
                'agentId' => 'j_agent_id',
                'username' => 'j_username',
                'fullName' => 'j_full_name',
                'phoneNumber' => 'j_phone',
                'status' => 'j_status',
                'balance' => 'j_balance',
                'createdBy' => 'j_created_by',
                'createdByModel' => 'j_created_by_model',
            ],
            'bets' => [
                'userId' => 'j_user_id',
                'matchId' => 'j_match_id',
                'status' => 'j_status',
                'type' => 'j_type',
                'ticketId' => 'j_ticket_id',
                'requestId' => 'j_request_id',
                'amount' => 'j_amount',
                'riskAmount' => 'j_risk_amount',
                'potentialPayout' => 'j_potential_payout',
                'combinedOdds' => 'j_combined_odds',
            ],
            'betselections' => [
                'betId' => 'j_bet_id',
                'ticketId' => 'j_ticket_id',
                'userId' => 'j_user_id',
                'matchId' => 'j_match_id',
                'status' => 'j_status',
                'marketType' => 'j_market_type',
                'betType' => 'j_bet_type',
                'selectionOrder' => 'j_selection_order',
                'selection' => 'j_selection',
                'odds' => 'j_odds',
                'point' => 'j_point',
            ],
            'betrequests' => [
                'userId' => 'j_user_id',
                'requestId' => 'j_request_id',
                'status' => 'j_status',
            ],
            'betmoderules' => [
                'mode' => 'j_mode',
                'isActive' => 'j_is_active',
                'minLegs' => 'j_min_legs',
                'maxLegs' => 'j_max_legs',
            ],
            'iplogs' => [
                'ip' => 'j_ip',
                'userId' => 'j_user_id',
                'status' => 'j_status',
                'lastActive' => 'j_last_active',
                'country' => 'j_country',
                'city' => 'j_city',
                'userModel' => 'j_user_model',
            ],
            'matches' => [
                'externalId' => 'j_external_id',
                'status' => 'j_status',
                'sport' => 'j_sport',
                'startTime' => 'j_start_time_dt',
                'lastUpdated' => 'j_last_updated_dt',
                'score.score_home' => 'j_score_home',
                'score.score_away' => 'j_score_away',
                'homeTeam' => 'j_home_team',
                'awayTeam' => 'j_away_team',
            ],
            'messages' => [
                'fromUserId' => 'j_from_user_id',
                'status' => 'j_status',
                'subject' => 'j_subject',
                'read' => 'j_read',
            ],
            'transactions' => [
                'userId' => 'j_user_id',
                'entryGroupId' => 'j_entry_group_id',
                'type' => 'j_type',
                'status' => 'j_status',
                'referenceType' => 'j_reference_type',
                'referenceId' => 'j_reference_id',
                'amount' => 'j_amount',
                'entrySide' => 'j_entry_side',
                'sourceType' => 'j_source_type',
                'reason' => 'j_reason',
            ],
            'admin_audit_log' => [
                'action' => 'j_action',
                'actorId' => 'j_actor_id',
                'actorUsername' => 'j_actor_username',
                'actorRole' => 'j_actor_role',
                'targetId' => 'j_target_id',
                'targetUsername' => 'j_target_username',
            ],
            'rate_limits' => [
                'ip' => 'j_ip',
                'endpoint' => 'j_endpoint',
                'count' => 'j_count',
            ],
            'casinogames' => [
                'slug' => 'j_slug',
                'name' => 'j_name',
                'provider' => 'j_provider',
                'category' => 'j_category',
                'status' => 'j_status',
                'isFeatured' => 'j_is_featured',
                'sortOrder' => 'j_sort_order',
            ],
            'faqs' => [
                'title' => 'j_title',
                'status' => 'j_status',
                'order' => 'j_order',
            ],
            'manualsections' => [
                'title' => 'j_title',
                'status' => 'j_status',
                'order' => 'j_order',
            ],
            'feedbacks' => [
                'userId' => 'j_user_id',
                'subject' => 'j_subject',
                'status' => 'j_status',
            ],
        ];

        if (isset($generatedColumns[$collection][$field])) {
            $column = $generatedColumns[$collection][$field];
            if ($this->columnExists($table, $column)) {
                return ['expr' => "`{$column}`", 'type' => $this->inferSqlFieldType($field)];
            }
        }

        if (preg_match('/^[A-Za-z0-9_.]+$/', $field) !== 1) {
            return null;
        }

        return [
            'expr' => 'JSON_UNQUOTE(JSON_EXTRACT(`doc`, ' . $this->sqlStringLiteral($this->jsonPathForField($field)) . '))',
            'type' => $this->inferSqlFieldType($field),
        ];
    }

    private function inferSqlFieldType(string $field): string
    {
        if (in_array($field, ['amount', 'riskAmount', 'unitStake', 'combinedOdds', 'balanceBefore', 'balanceAfter', 'totalWager', 'totalReturn', 'profit', 'netResult', 'playerTotal', 'bankerTotal', 'latencyMs', 'minBet', 'maxBet', 'sortOrder', 'selectionOrder', 'score.score_home', 'score.score_away'], true)) {
            return 'numeric';
        }
        if (in_array($field, ['isFeatured', 'supportsDemo'], true)) {
            return 'boolean';
        }
        if (in_array($field, ['createdAt', 'updatedAt', 'startTime', 'lastUpdated', 'lastActive'], true)) {
            return 'date';
        }
        return 'string';
    }

    private function sqlComparableExpression(string $expr, string $type): ?string
    {
        if ($type === 'numeric') {
            return "CAST(COALESCE({$expr}, '0') AS DECIMAL(20, 4))";
        }
        if ($type === 'boolean') {
            return "(CASE WHEN LOWER(COALESCE({$expr}, 'false')) IN ('1', 'true') THEN 1 ELSE 0 END)";
        }
        if ($type === 'date') {
            return $expr;
        }
        if ($type === 'string') {
            return $expr;
        }
        return null;
    }

    private function sqlComparableValue(mixed $value, string $type): mixed
    {
        if ($type === 'numeric') {
            return is_numeric($value) ? (float) $value : 0.0;
        }
        if ($type === 'boolean') {
            return $value ? 1 : 0;
        }
        if ($type === 'date') {
            return $this->toMysqlDateTime($value);
        }
        return (string) $value;
    }

    private function sqlOperator(string $op): string
    {
        return match ($op) {
            '$gt' => '>',
            '$gte' => '>=',
            '$lt' => '<',
            '$lte' => '<=',
            default => '=',
        };
    }

    private function sqlParamType(mixed $value): int
    {
        if (is_int($value)) {
            return PDO::PARAM_INT;
        }
        if ($value === null) {
            return PDO::PARAM_NULL;
        }
        return PDO::PARAM_STR;
    }

    private function escapeLikePattern(string $value): string
    {
        return strtr($value, [
            '\\' => '\\\\',
            '%' => '\%',
            '_' => '\_',
        ]);
    }

    private function regexPatternToLikeLiteral(string $pattern): ?string
    {
        if ($pattern === '') {
            return '';
        }

        $literal = '';
        $length = strlen($pattern);
        for ($i = 0; $i < $length; $i++) {
            $char = $pattern[$i];
            if ($char === '\\') {
                if ($i + 1 >= $length) {
                    return null;
                }
                $i++;
                $literal .= $pattern[$i];
                continue;
            }

            if (str_contains('^$.|?*+()[]{}', $char)) {
                return null;
            }

            $literal .= $char;
        }

        return $literal;
    }

    private function jsonPathForField(string $field): string
    {
        $parts = explode('.', $field);
        $path = '$';
        foreach ($parts as $part) {
            $segment = trim($part);
            if ($segment === '') {
                return '$';
            }
            $escaped = str_replace(['\\', '"'], ['\\\\', '\\"'], $segment);
            $path .= '."' . $escaped . '"';
        }
        return $path;
    }

    private function sqlStringLiteral(string $value): string
    {
        return "'" . str_replace(['\\', "'"], ['\\\\', "\\'"], $value) . "'";
    }

    // APCu TTL for positive schema-introspection results. Cross-worker cache
    // so one worker's information_schema lookup warms the result for all 60.
    // Only POSITIVE results are cached: storing a stale "false" would cause
    // ensureSpecializedSchema to attempt an ALTER ADD COLUMN that fails.
    // Nothing in the codebase drops columns/indexes, so positives never go stale.
    private const SCHEMA_APCU_TTL = 300;

    private function columnExists(string $table, string $column): bool
    {
        $cacheKey = $table . '.' . $column;
        if (array_key_exists($cacheKey, $this->columnExistsCache)) {
            return $this->columnExistsCache[$cacheKey];
        }

        $apcuKey = 'schema:col:' . $cacheKey;
        if (function_exists('apcu_enabled') && apcu_enabled()) {
            $success = false;
            $cached = apcu_fetch($apcuKey, $success);
            if ($success && $cached === true) {
                $this->columnExistsCache[$cacheKey] = true;
                return true;
            }
        }

        $stmt = $this->pdo->prepare("SELECT 1 FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = :table AND column_name = :column LIMIT 1");
        $stmt->execute([':table' => $table, ':column' => $column]);
        $exists = (bool) $stmt->fetchColumn();
        $this->columnExistsCache[$cacheKey] = $exists;

        if ($exists && function_exists('apcu_store')) {
            apcu_store($apcuKey, true, self::SCHEMA_APCU_TTL);
        }

        return $exists;
    }

    private function indexExists(string $table, string $index): bool
    {
        $cacheKey = $table . '.' . $index;
        if (array_key_exists($cacheKey, $this->indexExistsCache)) {
            return $this->indexExistsCache[$cacheKey];
        }

        $apcuKey = 'schema:idx:' . $cacheKey;
        if (function_exists('apcu_enabled') && apcu_enabled()) {
            $success = false;
            $cached = apcu_fetch($apcuKey, $success);
            if ($success && $cached === true) {
                $this->indexExistsCache[$cacheKey] = true;
                return true;
            }
        }

        $stmt = $this->pdo->prepare("SELECT 1 FROM information_schema.statistics WHERE table_schema = DATABASE() AND table_name = :table AND index_name = :idx LIMIT 1");
        $stmt->execute([':table' => $table, ':idx' => $index]);
        $exists = (bool) $stmt->fetchColumn();
        $this->indexExistsCache[$cacheKey] = $exists;

        if ($exists && function_exists('apcu_store')) {
            apcu_store($apcuKey, true, self::SCHEMA_APCU_TTL);
        }

        return $exists;
    }

    private function ensureSpecializedSchema(string $table): void
    {
        $collection = $table;
        if ($this->tablePrefix !== '' && str_starts_with($table, $this->tablePrefix)) {
            $collection = substr($table, strlen($this->tablePrefix));
        }

        if ($collection === 'betselections') {
            $columns = [
                'j_bet_id' => "ALTER TABLE `{$table}` ADD COLUMN `j_bet_id` VARCHAR(64) GENERATED ALWAYS AS (JSON_UNQUOTE(JSON_EXTRACT(`doc`, _utf8mb4'$.betId'))) STORED",
                'j_ticket_id' => "ALTER TABLE `{$table}` ADD COLUMN `j_ticket_id` VARCHAR(64) GENERATED ALWAYS AS (JSON_UNQUOTE(JSON_EXTRACT(`doc`, _utf8mb4'$.ticketId'))) STORED",
                'j_user_id' => "ALTER TABLE `{$table}` ADD COLUMN `j_user_id` VARCHAR(64) GENERATED ALWAYS AS (JSON_UNQUOTE(JSON_EXTRACT(`doc`, _utf8mb4'$.userId'))) STORED",
                'j_match_id' => "ALTER TABLE `{$table}` ADD COLUMN `j_match_id` VARCHAR(64) GENERATED ALWAYS AS (JSON_UNQUOTE(JSON_EXTRACT(`doc`, _utf8mb4'$.matchId'))) STORED",
                'j_status' => "ALTER TABLE `{$table}` ADD COLUMN `j_status` VARCHAR(64) GENERATED ALWAYS AS (JSON_UNQUOTE(JSON_EXTRACT(`doc`, _utf8mb4'$.status'))) STORED",
                'j_market_type' => "ALTER TABLE `{$table}` ADD COLUMN `j_market_type` VARCHAR(64) GENERATED ALWAYS AS (JSON_UNQUOTE(JSON_EXTRACT(`doc`, _utf8mb4'$.marketType'))) STORED",
                'j_bet_type' => "ALTER TABLE `{$table}` ADD COLUMN `j_bet_type` VARCHAR(64) GENERATED ALWAYS AS (JSON_UNQUOTE(JSON_EXTRACT(`doc`, _utf8mb4'$.betType'))) STORED",
                'j_selection_order' => "ALTER TABLE `{$table}` ADD COLUMN `j_selection_order` INT GENERATED ALWAYS AS (CAST(COALESCE(NULLIF(NULLIF(JSON_UNQUOTE(JSON_EXTRACT(`doc`, _utf8mb4'$.selectionOrder')), _utf8mb4''), _utf8mb4'null'), _utf8mb4'0') AS SIGNED)) STORED",
            ];
            foreach ($columns as $column => $sql) {
                if (!$this->columnExists($table, $column)) {
                    $this->pdo->exec($sql);
                    $this->columnExistsCache[$table . '.' . $column] = true;
                    if (function_exists('apcu_store')) {
                        apcu_store('schema:col:' . $table . '.' . $column, true, self::SCHEMA_APCU_TTL);
                    }
                }
            }

            $indexes = [
                'idx_betselections_bet_id' => "ALTER TABLE `{$table}` ADD KEY `idx_betselections_bet_id` (`j_bet_id`)",
                'idx_betselections_ticket_id' => "ALTER TABLE `{$table}` ADD KEY `idx_betselections_ticket_id` (`j_ticket_id`)",
                'idx_betselections_user_id' => "ALTER TABLE `{$table}` ADD KEY `idx_betselections_user_id` (`j_user_id`)",
                'idx_betselections_match_id' => "ALTER TABLE `{$table}` ADD KEY `idx_betselections_match_id` (`j_match_id`)",
                'idx_betselections_status' => "ALTER TABLE `{$table}` ADD KEY `idx_betselections_status` (`j_status`)",
                'idx_betselections_match_status' => "ALTER TABLE `{$table}` ADD KEY `idx_betselections_match_status` (`j_match_id`, `j_status`)",
                'idx_betselections_bet_order' => "ALTER TABLE `{$table}` ADD KEY `idx_betselections_bet_order` (`j_bet_id`, `j_selection_order`)",
            ];
            foreach ($indexes as $index => $sql) {
                if (!$this->indexExists($table, $index)) {
                    $this->pdo->exec($sql);
                    $this->indexExistsCache[$table . '.' . $index] = true;
                    if (function_exists('apcu_store')) {
                        apcu_store('schema:idx:' . $table . '.' . $index, true, self::SCHEMA_APCU_TTL);
                    }
                }
            }
            return;
        }

        if ($collection === 'betrequests') {
            $columns = [
                'j_user_id' => "ALTER TABLE `{$table}` ADD COLUMN `j_user_id` VARCHAR(64) GENERATED ALWAYS AS (JSON_UNQUOTE(JSON_EXTRACT(`doc`, _utf8mb4'$.userId'))) STORED",
                'j_request_id' => "ALTER TABLE `{$table}` ADD COLUMN `j_request_id` VARCHAR(128) GENERATED ALWAYS AS (JSON_UNQUOTE(JSON_EXTRACT(`doc`, _utf8mb4'$.requestId'))) STORED",
                'j_status' => "ALTER TABLE `{$table}` ADD COLUMN `j_status` VARCHAR(64) GENERATED ALWAYS AS (JSON_UNQUOTE(JSON_EXTRACT(`doc`, _utf8mb4'$.status'))) STORED",
            ];
            foreach ($columns as $column => $sql) {
                if (!$this->columnExists($table, $column)) {
                    $this->pdo->exec($sql);
                    $this->columnExistsCache[$table . '.' . $column] = true;
                    if (function_exists('apcu_store')) {
                        apcu_store('schema:col:' . $table . '.' . $column, true, self::SCHEMA_APCU_TTL);
                    }
                }
            }

            $indexes = [
                'idx_betrequests_user_request' => "ALTER TABLE `{$table}` ADD KEY `idx_betrequests_user_request` (`j_user_id`, `j_request_id`)",
                'idx_betrequests_status' => "ALTER TABLE `{$table}` ADD KEY `idx_betrequests_status` (`j_status`)",
            ];
            foreach ($indexes as $index => $sql) {
                if (!$this->indexExists($table, $index)) {
                    $this->pdo->exec($sql);
                    $this->indexExistsCache[$table . '.' . $index] = true;
                    if (function_exists('apcu_store')) {
                        apcu_store('schema:idx:' . $table . '.' . $index, true, self::SCHEMA_APCU_TTL);
                    }
                }
            }
        }
    }

    private function decodeRow(array $row): ?array
    {
        $decoded = json_decode((string) ($row['doc'] ?? '{}'), true);
        if (!is_array($decoded)) {
            return null;
        }
        if (!isset($decoded['id']) || (string) $decoded['id'] === '') {
            $decoded['id'] = (string) ($row['id'] ?? '');
        }
        return $decoded;
    }

    private function encodeDoc(array $doc): string
    {
        $json = json_encode($doc, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
        if ($json === false) {
            return '{}';
        }
        return $json;
    }

    private function extractId(array $doc): string
    {
        $id = $doc['id'] ?? null;
        if (is_string($id) && trim($id) !== '') {
            return trim($id);
        }
        if (is_int($id) || is_float($id)) {
            return (string) $id;
        }
        return $this->newDocumentId();
    }

    private function newDocumentId(): string
    {
        return bin2hex(random_bytes(12));
    }

    private function normalizeForStorage(mixed $value): mixed
    {
        if ($value instanceof DateTimeInterface) {
            return $value->setTimezone(new DateTimeZone('UTC'))->format(DATE_ATOM);
        }
        if (is_scalar($value) || $value === null) {
            return $value;
        }
        if (is_array($value)) {
            $out = [];
            foreach ($value as $k => $v) {
                $out[(string) $k] = $this->normalizeForStorage($v);
            }
            return $out;
        }
        if (is_object($value)) {
            $out = [];
            foreach ((array) $value as $k => $v) {
                $out[(string) $k] = $this->normalizeForStorage($v);
            }
            return $out;
        }
        return (string) $value;
    }

    private function matchesFilter(array $doc, array $filter): bool
    {
        foreach ($filter as $key => $condition) {
            if ($key === '$or') {
                if (!is_array($condition) || $condition === []) {
                    return false;
                }
                $matched = false;
                foreach ($condition as $sub) {
                    if (is_array($sub) && $this->matchesFilter($doc, $sub)) {
                        $matched = true;
                        break;
                    }
                }
                if (!$matched) {
                    return false;
                }
                continue;
            }

            if ($key === '$and') {
                if (!is_array($condition)) {
                    return false;
                }
                foreach ($condition as $sub) {
                    if (!is_array($sub) || !$this->matchesFilter($doc, $sub)) {
                        return false;
                    }
                }
                continue;
            }

            if ($key === '$nor') {
                if (!is_array($condition)) {
                    return false;
                }
                foreach ($condition as $sub) {
                    if (is_array($sub) && $this->matchesFilter($doc, $sub)) {
                        return false;
                    }
                }
                continue;
            }

            $values = $this->extractPathValues($doc, (string) $key);
            $exists = $values !== [];
            if (!$this->matchesCondition($values, $exists, $condition)) {
                return false;
            }
        }

        return true;
    }

    private function matchesCondition(array $fieldValues, bool $exists, mixed $condition): bool
    {
        if (is_array($condition) && $this->hasOperatorKeys($condition)) {
            foreach ($condition as $op => $expected) {
                if ($op === '$options') {
                    continue;
                }

                if ($op === '$exists') {
                    if ((bool) $expected !== $exists) {
                        return false;
                    }
                    continue;
                }

                if ($op === '$in') {
                    if (!is_array($expected) || !$this->anyIn($fieldValues, $expected)) {
                        return false;
                    }
                    continue;
                }

                if ($op === '$ne') {
                    if ($this->anyEquals($fieldValues, $expected)) {
                        return false;
                    }
                    continue;
                }

                if ($op === '$gt' || $op === '$gte' || $op === '$lt' || $op === '$lte') {
                    if (!$this->anyCompare($fieldValues, $expected, $op)) {
                        return false;
                    }
                    continue;
                }

                if ($op === '$regex') {
                    $options = is_array($condition) ? (string) ($condition['$options'] ?? '') : '';
                    if (!$this->anyRegex($fieldValues, (string) $expected, $options)) {
                        return false;
                    }
                    continue;
                }

                return false;
            }
            return true;
        }

        return $this->anyEquals($fieldValues, $condition);
    }

    private function hasOperatorKeys(array $arr): bool
    {
        foreach ($arr as $k => $_v) {
            if (is_string($k) && str_starts_with($k, '$')) {
                return true;
            }
        }
        return false;
    }

    private function anyEquals(array $fieldValues, mixed $expected): bool
    {
        if ($fieldValues === []) {
            return false;
        }
        foreach ($fieldValues as $actual) {
            if ($this->valueEquals($actual, $expected)) {
                return true;
            }
            if (is_array($actual)) {
                foreach ($actual as $item) {
                    if ($this->valueEquals($item, $expected)) {
                        return true;
                    }
                }
            }
        }
        return false;
    }

    private function anyIn(array $fieldValues, array $expectedValues): bool
    {
        foreach ($expectedValues as $expected) {
            if ($this->anyEquals($fieldValues, $expected)) {
                return true;
            }
        }
        return false;
    }

    private function anyCompare(array $fieldValues, mixed $expected, string $op): bool
    {
        foreach ($fieldValues as $actual) {
            $cmp = $this->compareValues($actual, $expected);
            if (
                ($op === '$gt' && $cmp > 0)
                || ($op === '$gte' && $cmp >= 0)
                || ($op === '$lt' && $cmp < 0)
                || ($op === '$lte' && $cmp <= 0)
            ) {
                return true;
            }
        }
        return false;
    }

    private function anyRegex(array $fieldValues, string $pattern, string $options = ''): bool
    {
        if ($pattern === '') {
            return false;
        }
        $delim = '#';
        $escaped = str_replace($delim, '\\' . $delim, $pattern);
        $flags = '';
        if (str_contains($options, 'i')) {
            $flags .= 'i';
        }
        $regex = $delim . $escaped . $delim . $flags;

        foreach ($fieldValues as $actual) {
            $text = is_scalar($actual) ? (string) $actual : '';
            if ($text !== '' && @preg_match($regex, $text) === 1) {
                return true;
            }
        }
        return false;
    }

    private function valueEquals(mixed $a, mixed $b): bool
    {
        if ((is_int($a) || is_float($a) || (is_string($a) && is_numeric($a))) && (is_int($b) || is_float($b) || (is_string($b) && is_numeric($b)))) {
            return (float) $a === (float) $b;
        }

        return (string) $a === (string) $b;
    }

    private function compareValues(mixed $a, mixed $b): int
    {
        $ta = $this->toComparableTimestamp($a);
        $tb = $this->toComparableTimestamp($b);
        if ($ta !== null && $tb !== null) {
            return $ta <=> $tb;
        }

        if ((is_int($a) || is_float($a) || (is_string($a) && is_numeric($a))) && (is_int($b) || is_float($b) || (is_string($b) && is_numeric($b)))) {
            return ((float) $a) <=> ((float) $b);
        }

        return strcmp((string) $a, (string) $b);
    }

    private function toComparableTimestamp(mixed $value): ?int
    {
        if ($value instanceof DateTimeInterface) {
            return $value->getTimestamp();
        }
        if (is_int($value) || is_float($value)) {
            $n = (int) $value;
            if ($n > 9999999999) {
                $n = (int) floor($n / 1000);
            }
            return $n;
        }
        if (!is_string($value) || trim($value) === '') {
            return null;
        }
        try {
            $dt = new DateTimeImmutable($value);
            return $dt->getTimestamp();
        } catch (Throwable $_e) {
            return null;
        }
    }

    private function extractPathValues(array $doc, string $path): array
    {
        if ($path === '') {
            return [];
        }
        $parts = explode('.', $path);
        return $this->extractPathValuesRecursive($doc, $parts, 0);
    }

    private function extractPathValuesRecursive(mixed $value, array $parts, int $index): array
    {
        if ($index >= count($parts)) {
            return [$value];
        }

        $part = $parts[$index];
        $results = [];

        if (is_array($value)) {
            if (array_key_exists($part, $value)) {
                $results = array_merge($results, $this->extractPathValuesRecursive($value[$part], $parts, $index + 1));
            }

            if ($this->isListArray($value)) {
                foreach ($value as $item) {
                    if (is_array($item) || is_object($item)) {
                        $results = array_merge($results, $this->extractPathValuesRecursive($item, $parts, $index));
                    }
                }
            }
            return $results;
        }

        if (is_object($value)) {
            return $this->extractPathValuesRecursive((array) $value, $parts, $index);
        }

        return [];
    }

    private function isListArray(array $arr): bool
    {
        if ($arr === []) {
            return true;
        }
        return array_keys($arr) === range(0, count($arr) - 1);
    }

    private function firstExtractedValue(array $doc, string $path): mixed
    {
        $values = $this->extractPathValues($doc, $path);
        return $values[0] ?? null;
    }

    private function applyProjection(array $doc, array $projection): array
    {
        $include = [];
        $exclude = [];

        foreach ($projection as $field => $flag) {
            if ((int) $flag === 1) {
                $include[] = (string) $field;
            } else {
                $exclude[] = (string) $field;
            }
        }

        if ($include !== []) {
            $out = [];
            if (!in_array('id', $exclude, true) && isset($doc['id'])) {
                $out['id'] = $doc['id'];
            }
            foreach ($include as $field) {
                if ($field === 'id') {
                    if (isset($doc['id'])) {
                        $out['id'] = $doc['id'];
                    }
                    continue;
                }
                if (array_key_exists($field, $doc)) {
                    $out[$field] = $doc[$field];
                }
            }
            return $out;
        }

        $out = $doc;
        foreach ($exclude as $field) {
            unset($out[$field]);
        }
        return $out;
    }

    private function toMysqlDateTime(mixed $value): ?string
    {
        if ($value === null || $value === '') {
            return null;
        }
        if ($value instanceof DateTimeInterface) {
            return $value->setTimezone(new DateTimeZone('UTC'))->format('Y-m-d H:i:s');
        }
        if (is_numeric($value)) {
            $ts = (int) $value;
            if ($ts > 9999999999) {
                $ts = (int) floor($ts / 1000);
            }
            return gmdate('Y-m-d H:i:s', $ts);
        }
        if (!is_string($value)) {
            return null;
        }
        try {
            $dt = new DateTimeImmutable($value);
            return $dt->setTimezone(new DateTimeZone('UTC'))->format('Y-m-d H:i:s');
        } catch (Throwable $_e) {
            return null;
        }
    }
}
