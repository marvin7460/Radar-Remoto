import type { Db } from "@/db/client";
import { ingestionRuns } from "@/db/schema";
import { getLatestUsdRates, refreshFxRates } from "@/lib/fx/rates";
import type { FetchFn } from "@/lib/http/fetch";
import type { FetchJobsOptions, SourceAdapter } from "@/lib/sources/types";
import { dedupeJobs, type DedupeStats } from "@/lib/dedupe/dedupe-jobs";
import { ingestSource, type IngestStats } from "./ingest-source";
import { budgetBlocker } from "./rate-budget";

export interface RunAllOptions extends FetchJobsOptions {
  fetchFn?: FetchFn;
  now?: () => Date;
}

export type SourceResult = IngestStats | { source: string; status: "skipped"; reason: string };

/**
 * One full ingestion: exchange rates, then every source one after another
 * (not in parallel, to keep the load on each API and on the database
 * predictable), then cross-source duplicate detection.
 * A failing source never stops the rest: `ingestSource` doesn't throw.
 */
export async function runAllSources(
  db: Db,
  adapters: SourceAdapter[],
  { fetchFn = fetch, now = () => new Date(), ...fetchOptions }: RunAllOptions = {},
): Promise<{ sources: SourceResult[]; dedupe: DedupeStats }> {
  await refreshFxRates(db, { fetchFn, now });
  const { rates: usdRates } = await getLatestUsdRates(db);

  const sources: SourceResult[] = [];
  for (const adapter of adapters) {
    const blocker = await budgetBlocker(db, adapter, now());
    if (blocker) {
      await db.insert(ingestionRuns).values({
        source: adapter.id,
        status: "skipped",
        startedAt: now(),
        finishedAt: now(),
        errorMessage: blocker,
      });
      sources.push({ source: adapter.id, status: "skipped", reason: blocker });
      continue;
    }
    sources.push(await ingestSource(db, adapter, { fetchFn, now, usdRates, ...fetchOptions }));
  }

  return { sources, dedupe: await dedupeJobs(db, { now }) };
}
