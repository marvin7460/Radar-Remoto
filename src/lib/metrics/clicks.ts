import { eq } from "drizzle-orm";
import type { Db } from "@/db/client";
import { jobClicks, jobs } from "@/db/schema";

/**
 * Counts a click on a job: only the job, the channel and the time.
 * No cookies, IPs or user agents, so there's nothing to consent to.
 * Returns the job URL, or null for unknown ids (which aren't counted).
 */
export async function recordClick(db: Db, jobId: number, channel: "web" | "email"): Promise<string | null> {
  if (!Number.isSafeInteger(jobId) || jobId <= 0) return null;
  const [job] = await db.select({ url: jobs.url }).from(jobs).where(eq(jobs.id, jobId)).limit(1);
  if (!job) return null;
  await db.insert(jobClicks).values({ jobId, channel, clickedAt: new Date() });
  return job.url;
}
