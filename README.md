# Radar Remoto

Remote junior developer jobs open to Latin America, aggregated from several job
boards, cleaned up, and (soon) delivered by email. UI in Spanish.

> 🚧 Work in progress — phase 3 of 5. Full README (architecture, decisions,
> classifier metrics, "How I used AI") lands at the end.

## Run locally

```bash
npm install
cp .env.example .env.local   # leave values empty to use a local SQLite file
npm run db:migrate
npm run ingest               # fetch jobs from the sources (or: npm run db:seed, offline)
npm run dev                  # http://localhost:3000
```

## Checks

```bash
npm run lint
npm run typecheck
npm test                     # unit + integration, fully offline
npm run build
npm run test:e2e             # Playwright, against a build seeded from fixtures
```

## Classifier evaluation

```bash
# 1. Set ADMIN_TOKEN, open /admin and label jobs at /admin/etiquetar (1/2/3/0, s/n/u, Enter)
npm run labels:export        # freezes labels into data/labeled-jobs.json
npm run eval                 # precision/recall → docs/classifier-results.md
```

See [`docs/deploy.md`](docs/deploy.md) to deploy on Netlify + Turso and
[`docs/sources.md`](docs/sources.md) for the data sources.
