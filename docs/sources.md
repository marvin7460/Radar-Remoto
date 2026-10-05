# Data sources

Only official APIs and feeds. Every job links back to the original posting and
shows its source. We do **not** emit Google Jobs (`JobPosting`) structured data.

| Source           | Endpoint                                             | Status     | Terms reviewed | Notes                                                                  |
| ---------------- | ---------------------------------------------------- | ---------- | -------------- | ---------------------------------------------------------------------- |
| Get on Board     | `GET https://www.getonbrd.com/api/v0/search/jobs`    | ✅ phase 1 | ⏳ pending     | LATAM-focused. Salaries are monthly USD. We send 1 request/second max. |
| Himalayas        | `https://himalayas.app/jobs/api`, `/jobs/api/search` | phase 2    | ⏳ pending     | Forbids Google Jobs structured data.                                   |
| Remotive         | —                                                    | phase 2    | ⏳ pending     |                                                                        |
| Remote OK        | —                                                    | phase 2    | ⏳ pending     |                                                                        |
| Jobicy           | —                                                    | phase 2    | ⏳ pending     |                                                                        |
| We Work Remotely | RSS                                                  | phase 2    | ⏳ pending     |                                                                        |

"Pending" means the terms page could not be read from the development sandbox
yet; it must be checked (and this table updated) before the source goes live.

## Politeness rules (all sources)

- Identify ourselves with a `User-Agent` that links to this repo.
- Sequential requests with a delay; exponential backoff on 429/5xx.
- Ingest every 6 hours, never more often.
