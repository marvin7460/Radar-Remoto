# Data sources

Only official APIs and feeds. Every job links back to the original posting on
the source and names the source. We never emit Google Jobs (`JobPosting`)
structured data. Terms were reviewed on 2026-10-05 from each source's own docs
or API response.

| Source                                                             | Endpoint we use                                                            | Requests per run  | Budget we enforce          | Key terms                                                                                                                                                          |
| ------------------------------------------------------------------ | -------------------------------------------------------------------------- | ----------------- | -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| [Get on Board](https://api-doc.getonbrd.com)                       | `GET /api/v0/search/jobs` (4 queries × up to 4 pages)                      | ≤ 16, 1.5 s apart | 6 runs/day, ≥ 60 min apart | Public API, no key, no published limit.                                                                                                                            |
| [Himalayas](https://himalayas.app/docs/remote-jobs-api)            | `GET /jobs/api/search?q=…&seniority=Entry-level`                           | ≤ 6, 2 s apart    | 6/day, ≥ 60 min            | Max 20 jobs per request; link back; **don't submit jobs to Google Jobs or other boards**.                                                                          |
| [Jobicy](https://github.com/Jobicy/remote-jobs-api)                | `GET /api/v2/remote-jobs?geo={latam,mexico,anywhere}&industry=engineering` | 3, 2 s apart      | 8/day, ≥ 60 min            | Credit Jobicy with a direct link; applicants go to the original URL; **no polling more than once per hour**.                                                       |
| [Remotive](https://github.com/remotive-com/remote-jobs-api)        | `GET /api/remote-jobs`                                                     | 1                 | **4/day**, ≥ 180 min       | Link back and name Remotive; max 4 requests/day; no reposting to other boards or Google Jobs; **no gating listings behind signups/emails**. Jobs are delayed 24 h. |
| [We Work Remotely](https://weworkremotely.com/remote-job-rss-feed) | 3 category RSS feeds (full-stack, back-end, front-end)                     | 3, 2 s apart      | 6/day, ≥ 60 min            | Public RSS; attribute and link back.                                                                                                                               |
| [Remote OK](https://remoteok.com/api)                              | `GET /api`                                                                 | 1                 | 6/day, ≥ 60 min            | Link back with a _followed_ link (no `nofollow`) and name "Remote OK"; don't use their logo.                                                                       |
| [Frankfurter](https://github.com/lineofflight/frankfurter)         | `GET /v1/latest?base=USD`                                                  | 1                 | every 12 h                 | Free ECB rates, no key. No CLP/COP/ARS/PEN.                                                                                                                        |

Budgets are enforced in code (`src/lib/ingest/rate-budget.ts`) from the
`ingestion_runs` log, so a manual run on top of the schedule can't exceed them.

## Consequences in the product

- **Links** use `rel="noopener"` only: no `noreferrer` (sources should see our
  traffic) and no `nofollow` (Remote OK).
- **Email alerts (phase 4)** will not include Remotive jobs, and no listing
  will ever require an account to be seen (Remotive's signup clause).
- **No `JobPosting` JSON-LD** anywhere (Himalayas, Remotive).

## Data quirks found in real responses

- Remote OK sends some text double-encoded (`MecÃ¡nico`) → `fixMojibake`.
- Remotive ignores the `category` filter and tags some jobs with 40+ technologies.
- Remote OK tags and WWR categories include non-developer roles → title decides.
- Himalayas appends `+14` to US-only time zone lists; offsets > +12 are ignored.
- Himalayas' `offset` pagination is deprecated in favor of `cursor` (search uses `page`).
- Get on Board's `remote_local` jobs list allowed regions/countries only when
  `location_regions`/`location_tenants` are expanded; its "North America"
  region is geographic (includes Mexico).
- We Work Remotely's `country`/`state` often describe the company, not the
  hiring area, so `region` wins.
