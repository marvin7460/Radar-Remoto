# Deploy (Netlify + Turso + GitHub Actions)

Everything below fits in the free plans.

## 1. Database (Turso)

```bash
# Install the CLI: https://docs.turso.tech/cli/installation
turso auth signup                      # or: turso auth login
turso db create radar-remoto
turso db show radar-remoto --url       # → TURSO_DATABASE_URL (libsql://...)
turso db tokens create radar-remoto    # → TURSO_AUTH_TOKEN
```

Apply the schema once from your machine:

```bash
# .env.local with the two values above
npm run db:migrate
npm run ingest   # optional: first load right away
```

## 2. Scheduled ingestion (GitHub Actions)

Repo → Settings → Secrets and variables → Actions → New repository secret:

- `TURSO_DATABASE_URL`
- `TURSO_AUTH_TOKEN`

Then Actions → "Ingest jobs" → Run workflow to test it. After that it runs
every 6 hours on its own.

## 3. Web app (Netlify)

1. https://app.netlify.com → Add new site → Import an existing project → GitHub
   → pick `Radar-Remoto`.
2. Build settings are read from `netlify.toml` (no changes needed).
3. Site configuration → Environment variables → add `TURSO_DATABASE_URL` and
   `TURSO_AUTH_TOKEN`.
4. Deploy. Every push to the production branch redeploys.
