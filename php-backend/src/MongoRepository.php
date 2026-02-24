<?php

declare(strict_types=1);

final class MongoRepository
{
    private PDO $pdo;
    private string $dbName;
    private string $tablePrefix;

    public function __construct(string $_uri, string $dbName)
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
        foreach ($hostCandidates as $candidateHost) {
            $dsn = "mysql:host={$candidateHost};port={$port};dbname={$name};charset=utf8mb4";
            for ($attempt = 1; $attempt <= 3; $attempt++) {
                try {
                    $this->pdo = new PDO($dsn, $user, $pass, $pdoOptions);
                    $lastException = null;
                    break 2;
                } catch (PDOException $e) {
                    $lastException = $e;
                    $errorText = strtolower($e->getMessage());
                    $isNonRetryable = str_contains($errorText, 'sqlstate[hy000] [1045]')
                        || str_contains($errorText, 'max_connections_per_hour')
                        || str_contains($errorText, 'sqlstate[hy000] [1226]');
                    if ($isNonRetryable) {
                        break 2;
                    }
                    if ($attempt < 3) {
                        usleep(250000);
                    }
                }
            }
        }

        if ($lastException instanceof PDOException) {
            throw $lastException;
        }
    }

    public static function isAvailable(): bool
    {
        return extension_loaded('pdo_mysql');
    }

    public function findOne(string $collection, array $filter, array $options = []): ?array
    {
        $items = $this->findMany($collection, $filter, array_merge($options, ['limit' => 1]));
        return $items[0] ?? null;
    }

    public function findMany(string $collection, array $filter, array $options = []): array
    {
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
        return count($this->findMany($collection, $filter));
    }

    public function insertOne(string $collection, array $doc): string
    {
        $table = $this->tableName($collection);
        $this->ensureTable($table);

        $normalized = $this->normalizeForStorage($doc);
        $id = $this->extractId($normalized);
        $normalized['_id'] = $id;

        $stmt = $this->pdo->prepare("INSERT INTO `{$table}` (`mongo_id`, `doc`, `created_at`, `updated_at`) VALUES (:id, :doc, :created_at, :updated_at) ON DUPLICATE KEY UPDATE `doc`=VALUES(`doc`), `created_at`=VALUES(`created_at`), `updated_at`=VALUES(`updated_at`), `migrated_at`=CURRENT_TIMESTAMP");
        $stmt->execute([
            ':id' => $id,
            ':doc' => $this->encodeDoc($normalized),
            ':created_at' => $this->toMysqlDateTime($normalized['createdAt'] ?? null),
            ':updated_at' => $this->toMysqlDateTime($normalized['updatedAt'] ?? null),
        ]);

        return $id;
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

        $id = (string) ($existing['_id'] ?? '');
        if ($id === '') {
            $id = $this->newDocumentId();
            $merged['_id'] = $id;
        }

        $stmt = $this->pdo->prepare("UPDATE `{$table}` SET `doc`=:doc, `created_at`=:created_at, `updated_at`=:updated_at, `migrated_at`=CURRENT_TIMESTAMP WHERE `mongo_id`=:id LIMIT 1");
        $stmt->execute([
            ':id' => $id,
            ':doc' => $this->encodeDoc($merged),
            ':created_at' => $this->toMysqlDateTime($merged['createdAt'] ?? null),
            ':updated_at' => $this->toMysqlDateTime($merged['updatedAt'] ?? null),
        ]);
    }

    public function updateOneUpsert(string $collection, array $filter, array $set, array $setOnInsert = []): void
    {
        $existing = $this->findOne($collection, $filter);
        if ($existing !== null) {
            $this->updateOne($collection, ['_id' => (string) ($existing['_id'] ?? '')], $set);
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

        $existing = $this->findOne($collection, $filter, ['projection' => ['_id' => 1]]);
        $id = (string) ($existing['_id'] ?? '');
        if ($id === '') {
            return 0;
        }

        $stmt = $this->pdo->prepare("DELETE FROM `{$table}` WHERE `mongo_id`=:id LIMIT 1");
        $stmt->execute([':id' => $id]);
        return (int) $stmt->rowCount();
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
`mongo_id` VARCHAR(64) NOT NULL,
`doc` JSON NOT NULL,
`created_at` DATETIME NULL,
`updated_at` DATETIME NULL,
`migrated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
PRIMARY KEY (`mongo_id`),
KEY `idx_created_at` (`created_at`),
KEY `idx_updated_at` (`updated_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci";
        $this->pdo->exec($sql);
    }

    private function readCollection(string $collection): array
    {
        $table = $this->tableName($collection);
        $this->ensureTable($table);

        $rows = $this->pdo->query("SELECT `mongo_id`, `doc` FROM `{$table}`")->fetchAll();
        $docs = [];
        foreach ($rows as $row) {
            $decoded = json_decode((string) ($row['doc'] ?? '{}'), true);
            if (!is_array($decoded)) {
                $decoded = [];
            }
            if (!isset($decoded['_id']) || (string) $decoded['_id'] === '') {
                $decoded['_id'] = (string) ($row['mongo_id'] ?? '');
            }
            $docs[] = $decoded;
        }
        return $docs;
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
        $id = $doc['_id'] ?? null;
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
            if (!in_array('_id', $exclude, true) && isset($doc['_id'])) {
                $out['_id'] = $doc['_id'];
            }
            foreach ($include as $field) {
                if ($field === '_id') {
                    if (isset($doc['_id'])) {
                        $out['_id'] = $doc['_id'];
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
