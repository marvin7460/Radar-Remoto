import { z } from "zod";
import { SALARY_PERIODS } from "@/db/schema";
import type { FetchFn } from "@/lib/http/fetch";

/**
 * The common schema every adapter maps its source to. Adapters translate
 * field names and formats but don't interpret: deciding seniority, Mexico
 * eligibility or monthly USD salary happens once, in `normalizeJob`.
 */
export const sourceJobSchema = z.object({
  source: z.string().min(1),
  externalId: z.string().min(1),
  /** The posting on the source's site: we always link back to it. */
  url: z.url(),
  title: z.string().trim().min(1),
  company: z.string().trim().min(1),
  /** Seniority as the source labels it ("Junior", "Entry-level", "Midweight"). */
  seniorityLabels: z.array(z.string()),
  /** The source's own categories ("Programming", "Software Development"). */
  categories: z.array(z.string()),
  /** Where applicants may live, as published: countries, regions or free text. */
  locations: z.array(z.string()),
  /** Accepted UTC offsets, when the source publishes them as data. */
  timezoneOffsets: z.array(z.number()),
  /** Salary when the source gives numbers… */
  salary: z
    .object({
      min: z.number().positive().nullable(),
      max: z.number().positive().nullable(),
      currency: z.string().length(3).nullable(),
      period: z.enum(SALARY_PERIODS).nullable(),
    })
    .nullable(),
  /** …or free text when that's all there is ("$70k - $90k"). */
  salaryText: z.string().nullable(),
  tags: z.array(z.string()),
  description: z.string(),
  publishedAt: z.date(),
});

export type SourceJob = z.infer<typeof sourceJobSchema>;

/** Published usage limits, enforced from the ingestion_runs log. */
export interface RateBudget {
  maxRunsPerDay: number;
  minIntervalMinutes: number;
}

export interface FetchJobsOptions {
  /** Pause between paginated requests. Tests pass 0. */
  delayMs?: number;
}

export interface SourceAdapter<Raw = unknown> {
  /** Stable machine id stored in `jobs.source`. */
  id: string;
  /** Human name shown in the UI ("vía Get on Board"). */
  name: string;
  /** Source home page, for attribution. */
  homepage: string;
  budget: RateBudget;
  /** Downloads raw postings, respecting the source's limits. */
  fetchJobs(fetchFn: FetchFn, options?: FetchJobsOptions): Promise<Raw[]>;
  /** Extracts raw postings from one response body (JSON or RSS). */
  parsePage(body: string): Raw[];
  /**
   * Maps one raw posting to the common schema. Returns null to deliberately
   * discard it (e.g. on-site) and throws if the payload is malformed.
   */
  mapJob(raw: Raw): SourceJob | null;
}

/** One small real request per adapter, saved by `npm run fixtures:fetch`. */
export interface FixtureTarget {
  file: string;
  url: string;
  keep?: number;
}
