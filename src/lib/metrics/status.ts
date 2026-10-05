import { and, count, countDistinct, desc, eq, gte, inArray, isNull, sql } from "drizzle-orm";
import type { Db } from "@/db/client";
import { emailLog, ingestionRuns, jobClicks, jobs, savedSearches } from "@/db/schema";
import { FX_SOURCE } from "@/lib/fx/rates";
import { adapters } from "@/lib/sources";

const DAY_MS = 86_400_000;

/** Per source: the latest run, plus recent failures. Feeds the public /estado page. */
export async function sourceHealth(db: Db, now: Date = new Date()) {
  const weekAgo = new Date(now.getTime() - 7 * DAY_MS);
  const ids = [...adapters.map((adapter) => adapter.id), FX_SOURCE];

  return Promise.all(
    ids.map(async (source) => {
      const [last] = await db
        .select()
        .from(ingestionRuns)
        .where(and(eq(ingestionRuns.source, source), inArray(ingestionRuns.status, ["success", "error"])))
        .orderBy(desc(ingestionRuns.startedAt))
        .limit(1);
      const [{ value: errors }] = await db
        .select({ value: count() })
        .from(ingestionRuns)
        .where(
          and(
            eq(ingestionRuns.source, source),
            eq(ingestionRuns.status, "error"),
            gte(ingestionRuns.startedAt, weekAgo),
          ),
        );
      const [{ value: added }] = await db
        .select({ value: count() })
        .from(jobs)
        .where(and(eq(jobs.source, source), gte(jobs.firstSeenAt, new Date(now.getTime() - DAY_MS))));
      return { source, last: last ?? null, errorsLastWeek: errors, addedLastDay: added };
    }),
  );
}

/** Impact numbers for the README, counted without cookies or personal data. */
export async function impactMetrics(db: Db, now: Date = new Date()) {
  const monthAgo = new Date(now.getTime() - 30 * DAY_MS);
  const [[openJobs], [alertUsers], [emails], [emailsMonth], clicks] = await Promise.all([
    db
      .select({ value: count() })
      .from(jobs)
      .where(and(isNull(jobs.canonicalJobId), gte(jobs.lastSeenAt, new Date(now.getTime() - 21 * DAY_MS)))),
    db
      .select({ value: countDistinct(savedSearches.userId) })
      .from(savedSearches)
      .where(eq(savedSearches.active, true)),
    db
      .select({ value: count() })
      .from(emailLog)
      .where(and(eq(emailLog.kind, "digest"), eq(emailLog.status, "sent"))),
    db
      .select({ value: count() })
      .from(emailLog)
      .where(and(eq(emailLog.kind, "digest"), eq(emailLog.status, "sent"), gte(emailLog.sentAt, monthAgo))),
    db
      .select({ channel: jobClicks.channel, value: count() })
      .from(jobClicks)
      .where(gte(jobClicks.clickedAt, monthAgo))
      .groupBy(jobClicks.channel),
  ]);
  const clicksBy = (channel: string) => clicks.find((row) => row.channel === channel)?.value ?? 0;

  return {
    openJobs: openJobs.value,
    usersWithAlerts: alertUsers.value,
    digestEmailsSent: emails.value,
    digestEmailsLastMonth: emailsMonth.value,
    clicksLastMonth: { web: clicksBy("web"), email: clicksBy("email") },
  };
}

/** Postings hidden as duplicates of another source's copy. */
export async function duplicateCount(db: Db) {
  const [{ value }] = await db
    .select({ value: count() })
    .from(jobs)
    .where(sql`${jobs.canonicalJobId} is not null`);
  return value;
}
