import { z } from "zod";
import { SALARY_PERIODS, SENIORITIES } from "@/db/schema";

/**
 * The common shape every source adapter must produce. Validated with Zod so a
 * buggy adapter fails loudly instead of writing garbage to the database.
 */
export const normalizedJobSchema = z.object({
  source: z.string().min(1),
  externalId: z.string().min(1),
  url: z.url(),
  title: z.string().trim().min(1),
  company: z.string().trim().min(1),
  seniority: z.enum(SENIORITIES),
  seniorityRaw: z.string().nullable(),
  locationRaw: z.string().nullable(),
  allowedRegions: z.array(z.string()),
  timezoneMin: z.number().nullable(),
  timezoneMax: z.number().nullable(),
  salaryMin: z.number().nonnegative().nullable(),
  salaryMax: z.number().nonnegative().nullable(),
  salaryCurrency: z.string().length(3).nullable(),
  salaryPeriod: z.enum(SALARY_PERIODS).nullable(),
  technologies: z.array(z.string()),
  description: z.string(),
  publishedAt: z.date(),
});

export type NormalizedJob = z.infer<typeof normalizedJobSchema>;

export type FetchFn = typeof fetch;

export interface FetchJobsOptions {
  /** Pause between paginated requests. Tests pass 0. */
  delayMs?: number;
}

export interface SourceAdapter<Raw = unknown> {
  /** Stable machine id stored in `jobs.source`. */
  id: string;
  /** Human name shown in the UI ("vía Get on Board"). */
  name: string;
  /** Downloads raw postings. Must respect the source's rate limits. */
  fetchJobs(fetchFn: FetchFn, options?: FetchJobsOptions): Promise<Raw[]>;
  /**
   * Maps one raw posting to the common schema. Returns null to deliberately
   * discard it (e.g. not remote) and throws if the payload is malformed.
   */
  normalize(raw: Raw): NormalizedJob | null;
}
