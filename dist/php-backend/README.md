# Core PHP Migration Gateway

This directory is the start of the core-PHP backend migration.

Current mode:
- `core PHP` handles request entrypoint at `/api/*`
- `auth` endpoints are natively handled in core PHP via MySQL repository
- `wallet` endpoints are natively handled in core PHP via MySQL repository
- `bets` endpoints are natively handled in core PHP (`/place`, `/my-bets`, `/settle`)
- `betting` rules endpoints are natively handled in core PHP (`/api/betting/rules`, `/api/admin/bet-mode-rules*`)
- `matches` read endpoints are natively handled in core PHP (`GET /api/matches`, `GET /api/matches/:id`)
- `content` and `messages` endpoints are natively handled in core PHP
- `casino` endpoints are natively handled in core PHP
- `agent` endpoints are natively handled in core PHP (including `PUT /api/agent/permissions/:id`)
- `payments` endpoints are native (`POST /api/payments/create-deposit-intent`, `POST /api/payments/webhook`)
- `admin` core dashboard endpoints are native (`/users`, `/agents`, `/stats`, `/system-stats`, `/header-summary`)
- additional `admin` utility endpoints are native (`/next-username/:prefix`, `/agent-tree`, `/impersonate-user/:id`)
- `admin` account-maintenance endpoints are native (`PUT /users/:id/freeplay`, `POST /users/:id/reset-password`, `POST /agents/:id/reset-password`)
- `admin` communication/content endpoints are native (`/messages*`, `/faqs*`, `/manual*`, `/feedback*`)
- `admin` configuration endpoints are native (`/settings`, `/rules*`)
- `admin` operations endpoints are native (`/weekly-figures`, `/pending*`, `/cashier/*`)
- `admin` trading endpoints are native (`/matches*`, `/third-party-limits*`)
- `admin` user status endpoints are native (`/suspend`, `/unsuspend`)
- `admin` history/collections endpoints are native (`/transactions`, `/collections*`, `/deleted-wagers*`)
- `admin` integrations/billing endpoints are native (`/sportsbook-links*`, `/billing/*`)
- `admin` destructive account endpoints are native (`DELETE /users/:id`, `DELETE /agents/:id`)
- `admin` account management endpoints are native (`/create-agent`, `/agent/:id`, `/create-user`, `/users/:id`, `/users/:id/credit`, `/users/:id/stats`)
- `admin` security endpoints are native (`/ip-tracker*`)
- `admin` betting desk endpoints are native (`/bets*`)
- `admin` analytics endpoints are native (`/agent-performance*`)
- `admin` odds utility endpoints are native (`/refresh-odds`, `/fetch-odds`, `/clear-cache`)
- `matches` public odds refresh is native (`POST /api/matches/fetch-odds`)
- `matches` live stream is native (`GET /api/matches/stream`, SSE)
- `debug` emit endpoint is native (`POST /api/debug/emit-match`) with legacy-compatible response shape
- legacy Node fallback forwarding has been removed from the PHP gateway
- API paths and payloads remain unchanged for the frontend

## Environment

Use existing project `.env` plus optional PHP-specific variable:

- `MYSQL_HOST` (default `127.0.0.1`)
- `MYSQL_PORT` (default `3306`)
- `MYSQL_DB` (fallbacks to `DB_NAME`)
- `MYSQL_USER` (default `root`)
- `MYSQL_PASSWORD`
- `MYSQL_TABLE_PREFIX` (optional)
- `JWT_SECRET`
- `VITE_ENABLE_MATCH_STREAM` (default `true`; frontend subscribes to PHP SSE stream)

## PHP prerequisites

- PHP 8+
- `ext-pdo` + `ext-pdo_mysql` enabled for native auth handling

If `ext-pdo_mysql` is not available, the PHP API returns `503`.

## Local run

From project root:

```bash
npm run dev
```

Services:
- Core PHP gateway: `http://localhost:5000`
- PHP odds worker: background process in `npm run dev`
- Frontend Vite: `http://localhost:5173`

Health check:

```bash
curl http://localhost:5000/api/_php/health
```

Route parity check:

```bash
npm run check-php-routes
```

## MongoDB to MySQL data migration

Use the script below to copy all MongoDB collections into MySQL tables (one table per collection, JSON-preserved docs):

```bash
php php-backend/scripts/mongo-to-mysql.php \
  --mysql-host=127.0.0.1 \
  --mysql-port=3306 \
  --mysql-db=sports_betting \
  --mysql-user=root \
  --mysql-pass=YOUR_PASSWORD \
  --drop-existing
```

Useful options:
- `--collections=users,bets,transactions` migrate only specific collections
- `--table-prefix=mongo_` prefix generated MySQL table names
- `--batch-size=500` commit in batches (higher can be faster)

By default, Mongo connection values come from `MONGODB_URI`/`MONGO_URI` and `DB_NAME`.
