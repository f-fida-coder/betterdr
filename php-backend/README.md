# Core PHP Migration Gateway

This directory is the start of the core-PHP backend migration.

Current mode:
- `core PHP` handles request entrypoint at `/api/*`
- `auth` endpoints are natively handled in core PHP when MongoDB extension is available
- `wallet` endpoints are natively handled in core PHP when MongoDB extension is available
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

- `MONGODB_URI` or `MONGO_URI`
- `DB_NAME` (optional, parsed from Mongo URI if omitted)
- `JWT_SECRET`
- `VITE_ENABLE_MATCH_STREAM` (default `true`; frontend subscribes to PHP SSE stream)

## PHP prerequisites

- PHP 8+
- `ext-mongodb` enabled for native auth handling

If `ext-mongodb` is not available, the PHP API returns `503`.

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
