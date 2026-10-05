import { desc, isNull } from "drizzle-orm";
import type { Db } from "@/db/client";
import { jobs } from "@/db/schema";
import { listCopies } from "@/lib/dedupe/dedupe-jobs";
import { getLatestUsdRates } from "@/lib/fx/rates";

/** Latest original postings (duplicates hidden), with their copies on other sources. */
export async function listLatestJobs(db: Db, limit = 50) {
  const [rows, fx] = await Promise.all([
    db.select().from(jobs).where(isNull(jobs.canonicalJobId)).orderBy(desc(jobs.publishedAt)).limit(limit),
    getLatestUsdRates(db),
  ]);
  const copies = await listCopies(
    db,
    rows.map((row) => row.id),
  );
  return {
    jobs: rows.map((row) => ({ ...row, copies: copies.filter((copy) => copy.canonicalJobId === row.id) })),
    usdToMxn: fx.rates.MXN ?? null,
  };
}

export type JobWithCopies = Awaited<ReturnType<typeof listLatestJobs>>["jobs"][number];
