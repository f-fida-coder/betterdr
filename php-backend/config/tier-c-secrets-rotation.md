# Tier C — Secrets rotation procedure

> **STATUS: REQUIRED. NOT YET DONE.**
> Multiple production secrets are committed in this repo's git history.
> Anyone with read access to the repo (current or former contractors,
> a leaked dev laptop, a misconfigured backup, an old CI artifact) can
> extract them. Rotation must happen before treating these credentials
> as secure.

---

## What's exposed

The following files are tracked in git and contain live production
credentials:

- `.env`
- `.env.production`
- `.env.copy`

Specifically known to be in commits:

| Secret              | Used by                    | Exposure                |
|---------------------|----------------------------|-------------------------|
| `JWT_SECRET`        | All authenticated requests | Forge any user's JWT    |
| `MYSQL_PASSWORD`    | Backend → DB connection    | Direct DB access if reachable |
| `ODDS_API_KEY`      | OddsSyncService            | Drain the paid API quota |
| `RUNDOWN_API_KEY`   | RundownLiveSync            | Drain paid API quota    |
| `RUNDOWN_TICK_SECRET` | Cron-callable rundown tick endpoint | Trigger ticks at will |
| `STRIPE_SECRET_KEY` | PaymentsController         | Issue refunds, list customers |
| `STRIPE_WEBHOOK_SECRET` | PaymentsController     | Forge webhook events    |

---

## Required steps (do in order)

### 1. Rotate every secret with its provider FIRST

Do this BEFORE any git operation. Rotating first means the keys in git
history are dead by the time you push.

- **JWT_SECRET**: generate `openssl rand -hex 32`. Update on the server.
  All currently-issued tokens become invalid (users will need to log in
  again — communicate the maintenance window).
- **MYSQL_PASSWORD**: log in as root, `ALTER USER 'u487877829_bettor_bets'@'%'
  IDENTIFIED BY '<new-password>';`. Update `.env.production` on the
  server. Restart php-fpm.
- **ODDS_API_KEY**: log in to https://the-odds-api.com/, regenerate the
  key, update env on server, kill + restart odds-worker.
- **RUNDOWN_API_KEY**: same flow at https://therundown.io/.
- **RUNDOWN_TICK_SECRET**: regenerate with `openssl rand -hex 32`.
  Update on server AND in your cron config that calls the tick endpoint.
- **STRIPE_SECRET_KEY**: in the Stripe dashboard, roll the key. Stripe
  gives you a 24-hour window where both work — use that to update env
  + restart workers without payment downtime.
- **STRIPE_WEBHOOK_SECRET**: in Stripe dashboard, regenerate the
  webhook signing secret. Update on server. Test that webhooks still
  verify.

For each rotation, smoke-test ONE real flow before moving to the next:
- After JWT rotation: log in, place a small bet, check balance.
- After MYSQL rotation: hit `/api/_php/health`, watch for connection
  errors in logs.
- After Stripe rotation: process a $1 test charge.

### 2. Untrack the env files (after rotation is complete)

The `.gitignore` now lists `.env`, `.env.production`, `.env.copy`. They
remain tracked from earlier commits. Untrack:

```
git rm --cached .env .env.production .env.copy
git commit -m "chore: stop tracking local env files (post-rotation)"
git push
```

This removes them from FUTURE commits. The local files are kept
because `--cached` doesn't delete from the working tree.

### 3. (Optional) Rewrite history to scrub the old secrets

This is destructive. Skip if you don't have a strong need — once
rotated, the old secrets are useless. Only do this if you must satisfy
a compliance requirement that says "no secrets in history".

Use `git filter-repo` (preferred over the deprecated
`git filter-branch`):

```
pip install git-filter-repo
# DRY RUN first — examine output before running for real
git filter-repo --path .env --path .env.production --path .env.copy --invert-paths --dry-run

# When happy:
git filter-repo --path .env --path .env.production --path .env.copy --invert-paths

# Force-push to all remotes (destructive — coordinate with every collaborator)
git push --force --all
git push --force --tags
```

Every collaborator must re-clone or run the filter on their local
clone. Local clones not updated will re-introduce the secrets if they
push.

### 4. Audit deploy artifacts

Even after history is clean, secrets may live in:

- CI/CD logs (search for `MYSQL_PASSWORD`, `JWT_SECRET`, `sk_live_`)
- Old deploy bundles (`scripts/package-prod.sh` packages env files;
  rotate then rebuild)
- Server backups
- Developer laptops with old clones

Document the rotation date so you know which backups predate it.

---

## Going-forward hygiene

1. The `.env` files now live ONLY on the server, generated at deploy
   time from a secrets manager (recommended: AWS Secrets Manager,
   1Password, Doppler, or a self-hosted Vault).

2. Add a CI check that fails the build if a `.env` file appears in any
   commit. Simple example with pre-commit hook:

   ```sh
   #!/bin/sh
   # .git/hooks/pre-commit
   if git diff --cached --name-only | grep -E '^\.env(\.production|\.copy)?$'; then
       echo "ERROR: refusing to commit a tracked .env file"
       exit 1
   fi
   ```

3. Periodically scan the repo with `gitleaks` or similar:
   ```
   brew install gitleaks
   gitleaks detect --source . --verbose
   ```

---

## Rollback

There is no rollback for "rotated secrets". The old keys are
permanently revoked once you ask the provider to roll them. That's
the point.

If a rotation breaks something, the fix is to issue a NEW rotation
(generate a third key) and update env again. Never restore an old key
"because it used to work" — at that point you've leaked it twice.
