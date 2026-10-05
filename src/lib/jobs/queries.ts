import { desc } from "drizzle-orm";
import type { Db } from "@/db/client";
import { jobs } from "@/db/schema";

export async function listLatestJobs(db: Db, limit = 50) {
  return db.select().from(jobs).orderBy(desc(jobs.publishedAt)).limit(limit);
}
