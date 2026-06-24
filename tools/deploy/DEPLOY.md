# Deploy & Rollback Runbook — bettorplays247.com

Real money, live traffic. The goal of this process is **zero half-served states**
and **rollback in one upload**. Nothing here changes app behaviour — it is purely
the ship/verify/rollback wrapper around the existing `dist/` bundle.

- **Prod:** Hostinger shared hosting, `srv2052.hstgr.io`, cPanel user `u487877829`,
  web root `/home/u487877829/public_html`, domain `https://bettorplays247.com`.
- **Upload mechanism:** manual SFTP / cPanel File Manager (no SSH key configured).
- **The bundle:** the entire root `dist/` directory (built frontend + injected
  `api/` + `php-backend/` + `.env`). That folder's contents map 1:1 onto
  `public_html/`.

---

## 0. Back up the database FIRST (restore point)

Before any deploy that could migrate or touch data, take a snapshot so you have a
one-command restore point. The store is MySQL (tables with a JSON `doc` column).

```bash
php php-backend/scripts/backup-store.php          # core money tables
php php-backend/scripts/backup-store.php --all     # whole database
php php-backend/scripts/backup-store.php --dry-run  # list, write nothing
```

Read-only (only `SHOW`/`SELECT` — it can never affect live bets, balances, or
settlement). Writes a gzipped SQL dump + `MANIFEST.txt` (row counts + sha256) into
the git-ignored `backups/` dir, `0600` perms (the file holds PII + money rows),
keeping the newest 7. Pure PDO — no `mysqldump` binary needed.

**Where to run it:** prod `MYSQL_HOST=127.0.0.1`, so the DB is only reachable
**from the server**. Run this in a cPanel Terminal / one-off job on the host (the
script ships inside the bundle at `php-backend/scripts/`), then download the
`backups/*.sql.gz` locally. If the host offers no shell, use the cPanel/phpMyAdmin
**Export** (Quick, gzipped) as the equivalent fallback — same restore point, just
manual.

**Restore (DESTRUCTIVE — into a recovery DB unless you truly mean prod):**

```bash
gunzip -c backups/<db>__<stamp>.sql.gz | mysql -h HOST -P PORT -u USER -p DBNAME
```

Verify against the manifest's row counts after restoring.

---

## 1. Build a versioned release (local, safe)

```bash
bash tools/deploy/build-release.sh
```

This builds the frontend, packages the backend, runs `php -l` on every backend
file (hard gate), and snapshots the exact bundle to `releases/<id>/bundle/` with a
`MANIFEST.sha256` and `RELEASE.txt`. It advances `releases/CURRENT` /
`releases/PREVIOUS` and keeps the newest 5 releases.

Note the printed `release_id` (e.g. `20260624T120000Z__a1b2c3d`). You need it for
verification.

> Secrets (`.env`, `env.runtime`) are excluded from the snapshot. Env is managed
> on the server and is **not** part of a code rollback.

---

## 2. Upload — zero-downtime ordering

Hashed assets (`/assets/*-<hash>.js|css`) are immutable and long-cached. The live
`index.html` is the only file that points at the *new* hashes. So always:

1. **Upload `dist/assets/` first** (and any other hashed/static files). Old
   `index.html` still references old chunks, so nothing breaks mid-upload.
2. **Upload `dist/api/` and `dist/php-backend/`** (backend code).
3. **Upload `dist/index.html` LAST.** This is the atomic-ish "flip": the moment it
   lands, fresh page loads pick up the new chunks. There is never a window where
   `index.html` points at chunks that aren't on disk yet.

**Even safer (true near-atomic) on cPanel:** upload the new bundle into a sibling
folder `public_html_new/`, then in File Manager do two renames —
`public_html` → `public_html_old`, then `public_html_new` → `public_html`. Two
renames ≈ instant swap, and `public_html_old` is your instant rollback.

Do **not** touch `.env` on the server unless an env var actually changed.

---

## 3. Verify the deploy actually took

```bash
bash tools/deploy/verify-live.sh <release_id>
```

Checks (read-only GETs, never writes): index 200, every live hashed asset 200,
cache headers, API health, and — with a `release_id` — that the **live main bundle
matches the release you just built** (catches "uploaded but stale cache/old files
still serving"). Exit code 0 = good to walk away.

If the build-match check FAILS, the new code is not actually live yet (CDN/browser
cache, or an incomplete upload). Re-check the upload before declaring success.

---

## 4. Rollback

You kept the previous good bundle locally.

```bash
cat releases/PREVIOUS        # the last-known-good release id
ls releases/$(cat releases/PREVIOUS)/bundle/
```

Roll back by **re-uploading `releases/<previous_id>/bundle/`** to `public_html/`
using the same ordering as step 2 (assets first, `index.html` last). Then:

```bash
bash tools/deploy/verify-live.sh $(cat releases/PREVIOUS)
```

If you used the `public_html_old` rename trick in step 2, rollback is even faster:
rename `public_html` → `public_html_bad`, `public_html_old` → `public_html`.

---

## 5. Notes / gotchas

- `releases/` is git-ignored — bundles are local build artifacts, not source, and
  they would otherwise bloat the repo and may carry sensitive built output.
- The older `deploy-phase13.sh` and `verify-deployment.sh` are superseded by these
  tools (the old verifier is pinned to dead chunk hashes). Left in place for
  reference; prefer the scripts above.
- This runbook does not register any cron and does not change the app, the games
  folder, or any pricing/settlement logic.
