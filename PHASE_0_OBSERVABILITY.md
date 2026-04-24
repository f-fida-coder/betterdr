# Phase 0 Observability Runbook

## What Was Added
- Runtime request metrics collector (file-backed, lightweight)
- New endpoint: `/api/_php/metrics`
- Enhanced health endpoint: `/api/_php/health`
  - Includes observability runtime summary
  - Includes threshold-based alert list

## Files Changed
- `php-backend/src/RuntimeMetrics.php`
- `php-backend/public/index.php`
- `php-backend/.env`

## Endpoints

### 1) Runtime Metrics
`GET /api/_php/metrics`

Response contains:
- totals: requests, 4xx/5xx, avg, p95, min/max latency
- last5m and last15m aggregates
- topEndpoints list (normalized paths)

Production protection:
- If `METRICS_API_KEY` is set and `APP_ENV=production`, provide header:
  - `X-Metrics-Key: <METRICS_API_KEY>`

### 2) Health + Alerts
`GET /api/_php/health`

Added fields:
- `observability.runtime` (last5m/last15m/totals)
- `observability.thresholds`
- `observability.alerts`

## Alert Threshold Env Vars
Add/update in environment:
- `ALERT_API_P95_MS=700`
- `ALERT_API_5XX_RATE_PERCENT=2`
- `ALERT_ODDS_SYNC_AGE_SECONDS=300`
- `ALERT_WORKER_FAIL_RATE_PERCENT=40`
- `METRICS_API_KEY=` (optional but recommended for production)

## Suggested Initial Thresholds (20k-30k plan)
- API p95 warning: 700 ms
- API 5xx critical: 2%
- Odds sync age critical: 300 s
- Worker fail ratio warning: 40%

## Verification Commands
From project root:

```bash
php -l php-backend/public/index.php
php -l php-backend/src/RuntimeMetrics.php
php -r '$_SERVER["REQUEST_URI"]="/api/_php/metrics"; $_SERVER["REQUEST_METHOD"]="GET"; require "php-backend/public/index.php";'
```

## Next Step (Phase 1)
- Export these metrics to external monitoring (Cloudflare/Datadog/Grafana)
- Add real alert receivers (email/Slack/webhook)
- Add synthetic checks every 60 seconds for `/api/_php/health`
