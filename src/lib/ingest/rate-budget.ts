import { and, desc, eq, gt, inArray } from "drizzle-orm";
import type { Db } from "@/db/client";
import { ingestionRuns } from "@/db/schema";
import type { SourceAdapter } from "@/lib/sources/types";

const MINUTE = 60_000;
/**
 * GitHub's cron fires a few minutes late at random, so two "daily" runs can
 * land 23 h 50 min apart. The grace keeps that jitter from eating a run.
 */
const DAY_WINDOW_MS = 24 * 60 * MINUTE - 30 * MINUTE;

/**
 * Checks a source's published usage limits against what we actually did,
 * as recorded in ingestion_runs. Returns why we must wait, or null if we can go.
 */
export async function budgetBlocker(db: Db, adapter: SourceAdapter, now: Date): Promise<string | null> {
  const recent = await db
    .select({ startedAt: ingestionRuns.startedAt })
    .from(ingestionRuns)
    .where(
      and(
        eq(ingestionRuns.source, adapter.id),
        inArray(ingestionRuns.status, ["running", "success", "error"]),
        gt(ingestionRuns.startedAt, new Date(now.getTime() - DAY_WINDOW_MS)),
      ),
    )
    .orderBy(desc(ingestionRuns.startedAt));

  const { maxRunsPerDay, minIntervalMinutes } = adapter.budget;
  if (recent.length >= maxRunsPerDay) {
    return `rate budget: max ${maxRunsPerDay} runs per day`;
  }
  const minutesSinceLast = recent[0] ? (now.getTime() - recent[0].startedAt.getTime()) / MINUTE : Infinity;
  if (minutesSinceLast < minIntervalMinutes) {
    return `rate budget: min ${minIntervalMinutes} min between runs (last one ${Math.round(minutesSinceLast)} min ago)`;
  }
  return null;
}
