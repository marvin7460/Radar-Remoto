import "server-only";
import { count, isNull, sql } from "drizzle-orm";
import type { Db } from "@/db/client";
import { jobLabels, jobs } from "@/db/schema";

/** Target size of the hand-labeled evaluation set. */
export const LABEL_GOAL = 200;

/** A random original posting that hasn't been labeled yet. */
export async function nextJobToLabel(db: Db) {
  const [job] = await db
    .select({
      id: jobs.id,
      source: jobs.source,
      url: jobs.url,
      title: jobs.title,
      company: jobs.company,
      seniorityRaw: jobs.seniorityRaw,
      locationRaw: jobs.locationRaw,
      description: jobs.description,
    })
    .from(jobs)
    .where(
      sql`${isNull(jobs.canonicalJobId)} and ${jobs.id} not in (select ${jobLabels.jobId} from ${jobLabels})`,
    )
    .orderBy(sql`random()`)
    .limit(1);
  return job ?? null;
}

export async function labelCount(db: Db): Promise<number> {
  const [row] = await db.select({ value: count() }).from(jobLabels);
  return row?.value ?? 0;
}
