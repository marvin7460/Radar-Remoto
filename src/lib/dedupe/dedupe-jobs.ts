import { gt, inArray } from "drizzle-orm";
import type { Db } from "@/db/client";
import { jobs } from "@/db/schema";
import { SOURCE_PRIORITY } from "@/lib/sources";
import { findDuplicates } from "./find-duplicates";

/** Duplicates are re-checked for jobs published in this window. */
const WINDOW_DAYS = 60;

export interface DedupeStats {
  checked: number;
  duplicates: number;
  changed: number;
}

/**
 * Marks cross-source duplicates by pointing `canonical_job_id` at the copy we
 * keep. Nothing is deleted, so a wrong match is a one-line fix and every
 * source still gets its link ("también en…"). Only changed rows are written.
 */
export async function dedupeJobs(db: Db, { now = () => new Date() } = {}): Promise<DedupeStats> {
  const since = new Date(now().getTime() - WINDOW_DAYS * 24 * 60 * 60 * 1000);
  const rows = await db
    .select({
      id: jobs.id,
      source: jobs.source,
      title: jobs.title,
      company: jobs.company,
      publishedAt: jobs.publishedAt,
      firstSeenAt: jobs.firstSeenAt,
      canonicalJobId: jobs.canonicalJobId,
    })
    .from(jobs)
    .where(gt(jobs.publishedAt, since));

  const duplicates = findDuplicates(rows, { sourcePriority: SOURCE_PRIORITY });

  // Group the writes by target value: one UPDATE per canonical id.
  const changes = new Map<number | null, number[]>();
  for (const row of rows) {
    const target = duplicates.get(row.id) ?? null;
    if (target === row.canonicalJobId) continue;
    changes.set(target, [...(changes.get(target) ?? []), row.id]);
  }

  let changed = 0;
  await db.transaction(async (tx) => {
    for (const [target, ids] of changes) {
      for (let i = 0; i < ids.length; i += 200) {
        await tx
          .update(jobs)
          .set({ canonicalJobId: target })
          .where(inArray(jobs.id, ids.slice(i, i + 200)));
      }
      changed += ids.length;
    }
  });

  return { checked: rows.length, duplicates: duplicates.size, changed };
}

/** Other sources carrying the same opening, for "también en…" links. */
export async function listCopies(db: Db, canonicalIds: number[]) {
  if (canonicalIds.length === 0) return [];
  return db
    .select({ canonicalJobId: jobs.canonicalJobId, source: jobs.source, url: jobs.url })
    .from(jobs)
    .where(inArray(jobs.canonicalJobId, canonicalIds));
}
