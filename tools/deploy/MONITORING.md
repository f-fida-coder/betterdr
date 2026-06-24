# Uptime & Error Alerting — bettorplays247.com

External, zero-touch monitoring. **No cron, no server changes, no code.** A
third-party service pings the live site from outside and alerts you when it's
down, slow, erroring, or the TLS cert is about to expire. This is the standing
watch; `verify-live.sh` remains the one-shot post-deploy check.

## Why external (not a self-hosted pinger)

A monitor that runs *on the same box/network as the thing it watches* dies with
it — exactly when you need the alert. An outside service also catches DNS, TLS,
nginx, and network-path failures a local check never sees. Free tiers
(UptimeRobot, BetterStack/Better Uptime, HetrixTools, Pingdom) cover everything
below.

---

## Monitors to create

### 1. Frontend up  (the site loads)
- **Type:** HTTP(S), GET
- **URL:** `https://bettorplays247.com/`
- **Expect:** HTTP `200`
- **Keyword (content match):** `bettorplays247`
  - Present in the `<title>`. Catches the "200 but white/blank/hijacked page"
    case a bare status check misses.
- **Interval:** 1 min (or the lowest the free tier allows)

### 2. API + database + feed alive  (the money path works)
- **Type:** HTTP(S), GET
- **URL:** `https://bettorplays247.com/api/matches`
- **Expect:** HTTP `200`
- **Keyword:** *(leave OFF — see note)*
- **Interval:** 1 min

> There is **no `/api/health` endpoint** — it returns `404`. `/api/matches` is
> the best liveness signal: a `200` here means PHP, the MySQL store, and the feed
> path are all working. Do **not** keyword-match `homeTeam` on this monitor — the
> endpoint legitimately returns an empty array `[]` when no games are scheduled
> (e.g. overnight), which would page you for nothing. Use status-only here.

### 3. Data-present (OPTIONAL, business-hours signal)
- Same URL as #2, **keyword:** `homeTeam`.
- Tells you the board has games. Because empty is *valid* off-hours, either:
  - set its alert to "down for > 30–60 min" (a long empty board during a busy
    slate is suspicious, a quiet overnight is not), or
  - only enable it during your main slate windows.
- Treat as informational, not a wake-you-at-3am page.

### 4. TLS certificate expiry
- Most services monitor this automatically for any HTTPS monitor. Confirm it's
  on and set to warn **14–30 days** before expiry. A lapsed cert takes the whole
  site down for every user at once.

---

## Alert settings (avoid flapping, avoid noise)

- **Confirm before alerting:** require **2 consecutive failed checks** (or
  "confirm from multiple locations") before firing — kills false alarms from a
  single dropped packet.
- **Channels:** email **plus** a push channel that reaches you fast — Telegram,
  SMS, or a phone-app push. Email alone is too easy to miss during a live game.
- **Recovery alerts:** on, so you know when it's back.
- **Escalation:** if it's still down after ~5 min, re-notify. On a money platform
  during live games, minutes matter.

## Suggested response when an alert fires

1. Run `bash tools/deploy/verify-live.sh` locally — it pinpoints whether it's the
   frontend, a hashed asset, or the API.
2. If the API is down but the frontend serves, it's PHP/MySQL on the host (check
   cPanel → MySQL / error logs), not the static bundle.
3. If a deploy just went out and the build-match check fails, you likely shipped
   a bad bundle — roll back per `DEPLOY.md` § 4.

---

## Notes

- Purely additive: this repo registers **no cron** and changes **no app code**.
  Setup happens entirely in the monitoring service's dashboard.
- Keep this list in sync if public endpoints change. The two that matter most are
  `/` and `/api/matches`.
- A public **status page** (most services offer one free) is a nice extra — it
  deflects "is the site down?" questions during incidents.
