import { and, eq, gt, inArray, ne, notInArray, sql } from "drizzle-orm";
import type { Db } from "@/db/client";
import { alertDeliveries, savedSearches, users, jobs, type JobRow, type SavedSearch } from "@/db/schema";
import type { Sender } from "@/lib/email/send";
import { searchJobs } from "@/lib/search/search-jobs";
import { buildDigestEmail, type DigestSection } from "./digest-email";
import { filtersFromQuery } from "./describe";

/** Sources whose terms forbid using their jobs in exchange for signups/emails. */
export const SOURCES_EXCLUDED_FROM_EMAIL = ["remotive"];
const MAX_JOBS_PER_SEARCH = 10;
/** Resend's free tier is 100/day; leave room for sign-in links. */
export const MAX_EMAILS_PER_RUN = 80;
/** A brand-new alert's first digest looks back one day. */
const FIRST_LOOKBACK_MS = 24 * 60 * 60 * 1000;

export interface DigestStats {
  users: number;
  emailsSent: number;
  jobsSent: number;
  failed: number;
}

async function newJobsFor(db: Db, search: SavedSearch, now: Date): Promise<JobRow[]> {
  const since = search.lastSentAt ?? new Date(search.createdAt.getTime() - FIRST_LOOKBACK_MS);
  const result = await searchJobs(db, filtersFromQuery(search.query), now, {
    pageSize: MAX_JOBS_PER_SEARCH,
    extraConditions: [
      gt(jobs.firstSeenAt, since),
      notInArray(jobs.source, SOURCES_EXCLUDED_FROM_EMAIL),
      sql`${jobs.id} not in (select ${alertDeliveries.jobId} from ${alertDeliveries} where ${alertDeliveries.savedSearchId} = ${search.id})`,
    ],
  });
  return result.jobs;
}

/**
 * The daily email (9:00 Mexico City). One email per user with a section per
 * alert. Deliveries are recorded only after the email went out, so a failure
 * is retried tomorrow, and a second run the same day sends nothing new.
 */
export async function runDigest(db: Db, send: Sender, now: Date = new Date()): Promise<DigestStats> {
  const active = await db
    .select({ search: savedSearches, email: users.email })
    .from(savedSearches)
    .innerJoin(users, eq(users.id, savedSearches.userId))
    .where(eq(savedSearches.active, true));

  const byUser = new Map<number, { email: string; searches: SavedSearch[] }>();
  for (const { search, email } of active) {
    const entry = byUser.get(search.userId) ?? { email, searches: [] };
    entry.searches.push(search);
    byUser.set(search.userId, entry);
  }

  const stats: DigestStats = { users: byUser.size, emailsSent: 0, jobsSent: 0, failed: 0 };
  for (const [userId, { email, searches }] of byUser) {
    if (stats.emailsSent >= MAX_EMAILS_PER_RUN) break;

    // A job matching two alerts of the same user appears only once, in the first.
    const seen = new Set<number>();
    const sections: DigestSection[] = [];
    for (const search of searches) {
      const fresh = (await newJobsFor(db, search, now)).filter((job) => !seen.has(job.id));
      fresh.forEach((job) => seen.add(job.id));
      if (fresh.length > 0) sections.push({ search, jobs: fresh });
    }
    if (sections.length === 0) continue;

    try {
      await send(buildDigestEmail(email, sections), { kind: "digest", userId });
    } catch (error) {
      stats.failed++;
      console.error(`[digest] user ${userId}:`, (error as Error).message);
      continue;
    }

    await db.transaction(async (tx) => {
      for (const { search, jobs: sent } of sections) {
        await tx
          .insert(alertDeliveries)
          .values(sent.map((job) => ({ savedSearchId: search.id, jobId: job.id, sentAt: now })))
          .onConflictDoNothing();
      }
      await tx
        .update(savedSearches)
        .set({ lastSentAt: now })
        .where(
          inArray(
            savedSearches.id,
            searches.map((search) => search.id),
          ),
        );
    });
    stats.emailsSent++;
    stats.jobsSent += seen.size;
  }
  return stats;
}

/** Turns off one alert from an unsubscribe link. */
export async function deactivateSavedSearch(db: Db, savedSearchId: number) {
  const [row] = await db
    .update(savedSearches)
    .set({ active: false })
    .where(and(eq(savedSearches.id, savedSearchId), ne(savedSearches.active, false)))
    .returning({ name: savedSearches.name });
  return row ?? null;
}
