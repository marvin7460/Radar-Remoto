import { and, eq, inArray } from "drizzle-orm";
import type { Db } from "@/db/client";
import { ingestionRuns, jobs, type NewJobRow } from "@/db/schema";
import {
  normalizedJobSchema,
  type FetchFn,
  type FetchJobsOptions,
  type NormalizedJob,
  type SourceAdapter,
} from "@/lib/sources/types";
import { contentHash } from "./content-hash";
import { decideUpsertAction } from "./decide-action";

/** SQLite caps bound parameters per statement; stay well under it. */
const CHUNK_SIZE = 200;

export interface IngestStats {
  source: string;
  status: "success" | "error";
  fetched: number;
  inserted: number;
  updated: number;
  unchanged: number;
  skipped: number;
  invalid: number;
  error?: string;
}

interface IngestOptions extends FetchJobsOptions {
  fetchFn?: FetchFn;
  now?: () => Date;
}

function chunk<T>(items: T[], size = CHUNK_SIZE): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}

/**
 * Runs one adapter end to end and records the run. Never throws: a failing
 * source is logged in `ingestion_runs` so the other sources keep going.
 */
export async function ingestSource(
  db: Db,
  adapter: SourceAdapter,
  { fetchFn = fetch, now = () => new Date(), ...fetchOptions }: IngestOptions = {},
): Promise<IngestStats> {
  const stats: IngestStats = {
    source: adapter.id,
    status: "success",
    fetched: 0,
    inserted: 0,
    updated: 0,
    unchanged: 0,
    skipped: 0,
    invalid: 0,
  };

  const [run] = await db
    .insert(ingestionRuns)
    .values({ source: adapter.id, status: "running", startedAt: now() })
    .returning({ id: ingestionRuns.id });

  try {
    const raws = await adapter.fetchJobs(fetchFn, fetchOptions);
    stats.fetched = raws.length;

    // 1. Normalize + validate. One bad posting must not sink the batch.
    const incoming = new Map<string, NormalizedJob>();
    for (const raw of raws) {
      try {
        const normalized = adapter.normalize(raw);
        if (normalized === null) {
          stats.skipped++;
          continue;
        }
        const job = normalizedJobSchema.parse(normalized);
        incoming.set(job.externalId, job);
      } catch (error) {
        stats.invalid++;
        console.warn(`[${adapter.id}] invalid posting skipped:`, (error as Error).message.slice(0, 300));
      }
    }

    // 2. Look up what we already have for these ids.
    const existing = new Map<string, string>();
    for (const ids of chunk([...incoming.keys()])) {
      const rows = await db
        .select({ externalId: jobs.externalId, contentHash: jobs.contentHash })
        .from(jobs)
        .where(and(eq(jobs.source, adapter.id), inArray(jobs.externalId, ids)));
      for (const row of rows) existing.set(row.externalId, row.contentHash);
    }

    // 3. Decide and write, all in one transaction per source.
    const timestamp = now();
    const unchangedIds: string[] = [];
    await db.transaction(async (tx) => {
      for (const job of incoming.values()) {
        const hash = contentHash(job);
        const action = decideUpsertAction(existing.get(job.externalId), hash);
        const row: NewJobRow = {
          ...job,
          contentHash: hash,
          firstSeenAt: timestamp,
          lastSeenAt: timestamp,
          updatedAt: timestamp,
        };

        if (action === "insert") {
          // onConflict guards against two overlapping runs racing each other.
          await tx
            .insert(jobs)
            .values(row)
            .onConflictDoUpdate({
              target: [jobs.source, jobs.externalId],
              set: { ...job, contentHash: hash, lastSeenAt: timestamp, updatedAt: timestamp },
            });
          stats.inserted++;
        } else if (action === "update") {
          await tx
            .update(jobs)
            .set({ ...job, contentHash: hash, lastSeenAt: timestamp, updatedAt: timestamp })
            .where(and(eq(jobs.source, adapter.id), eq(jobs.externalId, job.externalId)));
          stats.updated++;
        } else {
          unchangedIds.push(job.externalId);
          stats.unchanged++;
        }
      }

      // Still seen today, even if unchanged: lets us expire stale jobs later.
      for (const ids of chunk(unchangedIds)) {
        await tx
          .update(jobs)
          .set({ lastSeenAt: timestamp })
          .where(and(eq(jobs.source, adapter.id), inArray(jobs.externalId, ids)));
      }
    });
  } catch (error) {
    stats.status = "error";
    stats.error = error instanceof Error ? error.message : String(error);
  }

  await db
    .update(ingestionRuns)
    .set({
      status: stats.status,
      finishedAt: now(),
      fetched: stats.fetched,
      inserted: stats.inserted,
      updated: stats.updated,
      unchanged: stats.unchanged,
      skipped: stats.skipped,
      invalid: stats.invalid,
      errorMessage: stats.error?.slice(0, 2000) ?? null,
    })
    .where(eq(ingestionRuns.id, run.id));

  return stats;
}
