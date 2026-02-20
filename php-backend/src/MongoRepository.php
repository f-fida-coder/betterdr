<?php

declare(strict_types=1);

use MongoDB\BSON\ObjectId;
use MongoDB\BSON\Decimal128;
use MongoDB\BSON\UTCDateTime;
use MongoDB\Driver\BulkWrite;
use MongoDB\Driver\Manager;
use MongoDB\Driver\Query;

final class MongoRepository
{
    private Manager $manager;
    private string $dbName;

    public function __construct(string $uri, string $dbName)
    {
        $this->manager = new Manager($uri);
        $this->dbName = $dbName;
    }

    public static function isAvailable(): bool
    {
        return extension_loaded('mongodb') && class_exists(Manager::class);
    }

    public function findOne(string $collection, array $filter, array $options = []): ?array
    {
        $query = new Query($filter, array_merge(['limit' => 1], $options));
        $cursor = $this->manager->executeQuery($this->dbName . '.' . $collection, $query);
        $docs = $cursor->toArray();
        if (count($docs) === 0) {
            return null;
        }
        return $this->normalizeDoc((array) $docs[0]);
    }

    public function findMany(string $collection, array $filter, array $options = []): array
    {
        $query = new Query($filter, $options);
        $cursor = $this->manager->executeQuery($this->dbName . '.' . $collection, $query);
        $docs = $cursor->toArray();
        $out = [];
        foreach ($docs as $doc) {
            $out[] = $this->normalizeDoc((array) $doc);
        }
        return $out;
    }

    public function countDocuments(string $collection, array $filter): int
    {
        $query = new Query($filter, ['projection' => ['_id' => 1]]);
        $cursor = $this->manager->executeQuery($this->dbName . '.' . $collection, $query);
        $count = 0;
        foreach ($cursor as $_doc) {
            $count++;
        }
        return $count;
    }

    public function insertOne(string $collection, array $doc): string
    {
        $bulk = new BulkWrite();
        $id = $bulk->insert($doc);
        $this->manager->executeBulkWrite($this->dbName . '.' . $collection, $bulk);

        if ($id instanceof ObjectId) {
            return (string) $id;
        }
        return (string) $id;
    }

    public function updateOne(string $collection, array $filter, array $set): void
    {
        $bulk = new BulkWrite();
        $bulk->update($filter, ['$set' => $set], ['multi' => false, 'upsert' => false]);
        $this->manager->executeBulkWrite($this->dbName . '.' . $collection, $bulk);
    }

    public function updateOneUpsert(string $collection, array $filter, array $set, array $setOnInsert = []): void
    {
        $update = ['$set' => $set];
        if ($setOnInsert !== []) {
            $update['$setOnInsert'] = $setOnInsert;
        }
        $bulk = new BulkWrite();
        $bulk->update($filter, $update, ['multi' => false, 'upsert' => true]);
        $this->manager->executeBulkWrite($this->dbName . '.' . $collection, $bulk);
    }

    public function deleteOne(string $collection, array $filter): int
    {
        $bulk = new BulkWrite();
        $bulk->delete($filter, ['limit' => 1]);
        $result = $this->manager->executeBulkWrite($this->dbName . '.' . $collection, $bulk);
        return $result->getDeletedCount();
    }

    public static function oid(string $id): ObjectId
    {
        return new ObjectId($id);
    }

    public static function nowUtc(): UTCDateTime
    {
        return new UTCDateTime((int) (microtime(true) * 1000));
    }

    private function normalizeDoc(array $doc): array
    {
        foreach ($doc as $key => $value) {
            $doc[$key] = $this->normalizeValue($value);
        }
        return $doc;
    }

    private function normalizeValue(mixed $value): mixed
    {
        if ($value instanceof ObjectId) {
            return (string) $value;
        }
        if ($value instanceof UTCDateTime) {
            return $value->toDateTime()->format(DATE_ATOM);
        }
        if ($value instanceof Decimal128) {
            return (string) $value;
        }
        if (is_object($value)) {
            $array = (array) $value;
            $normalized = [];
            foreach ($array as $k => $v) {
                $normalized[$k] = $this->normalizeValue($v);
            }
            return $normalized;
        }
        if (is_array($value)) {
            $normalized = [];
            foreach ($value as $k => $v) {
                $normalized[$k] = $this->normalizeValue($v);
            }
            return $normalized;
        }
        return $value;
    }
}
