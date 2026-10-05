/**
 * Freezes the hand labels plus the classifier inputs into
 * data/labeled-jobs.json, so `npm run eval` runs anywhere (CI too).
 */
import "./load-env";
import { writeFile } from "node:fs/promises";
import { eq } from "drizzle-orm";
import { getDb } from "@/db/client";
import { jobLabels, jobs } from "@/db/schema";
import { labeledSetSchema } from "@/lib/classify/labeled-set";

const rows = await getDb()
  .select({ job: jobs, label: jobLabels })
  .from(jobLabels)
  .innerJoin(jobs, eq(jobs.id, jobLabels.jobId))
  .orderBy(jobLabels.labeledAt);

const labeled = labeledSetSchema.parse(
  rows.map(({ job, label }) => ({
    id: job.id,
    source: job.source,
    title: job.title,
    seniorityLabels: job.seniorityRaw ? job.seniorityRaw.split(", ") : [],
    locations: job.locationRaw ? job.locationRaw.split(" · ") : [],
    timezone:
      job.timezoneMin !== null && job.timezoneMax !== null
        ? { min: job.timezoneMin, max: job.timezoneMax }
        : null,
    description: job.description,
    label: { seniority: label.seniority, acceptsMexico: label.acceptsMexico },
  })),
);

await writeFile("data/labeled-jobs.json", `${JSON.stringify(labeled, null, 2)}\n`);
console.log(`Exported ${labeled.length} labeled jobs to data/labeled-jobs.json`);
