import { z } from "zod";
import type { FetchFn } from "@/lib/http/fetch";
import { htmlToText } from "@/lib/text/html";
import { fetchSequentially } from "../fetch-pages";
import type { FetchJobsOptions, FixtureTarget, SourceAdapter, SourceJob } from "../types";

/**
 * Remotive — curated remote jobs.
 * Public API: https://github.com/remotive-com/remote-jobs-api
 * Terms (from the API's own legal notice): link back to Remotive and name it
 * as the source; max 4 requests a day; never submit jobs to other boards or
 * Google Jobs; never gate listings behind a signup or email capture.
 * Jobs arrive with a 24 h delay. The `category` filter is currently ignored
 * by the API, so we filter tech roles ourselves.
 */
export const REMOTIVE_URL = "https://remotive.com/api/remote-jobs?category=software-dev";

export const remotiveFixtures: FixtureTarget[] = [{ file: "remotive/software-dev.json", url: REMOTIVE_URL }];

const jobSchema = z.object({
  id: z.number(),
  url: z.url(),
  title: z.string(),
  company_name: z.string(),
  category: z.string().nullish(),
  tags: z.array(z.string()).nullish(),
  publication_date: z.string(),
  candidate_required_location: z.string().nullish(),
  salary: z.string().nullish(),
  description: z.string().nullish(),
});

const pageSchema = z.object({ jobs: z.array(z.unknown()) });

/** "2026-10-02T20:01:00" has no zone; Remotive's timestamps are UTC. */
const parseUtc = (value: string) => new Date(/[zZ]|[+-]\d\d:?\d\d$/.test(value) ? value : `${value}Z`);

export const remotiveAdapter: SourceAdapter = {
  id: "remotive",
  name: "Remotive",
  homepage: "https://remotive.com",
  budget: { maxRunsPerDay: 4, minIntervalMinutes: 180 },

  fetchJobs(fetchFn: FetchFn, { delayMs = 0 }: FetchJobsOptions = {}) {
    return fetchSequentially(remotiveAdapter, [REMOTIVE_URL], {
      fetchFn,
      delayMs,
      keyOf: (raw) => String((raw as { id?: unknown }).id),
    });
  },

  parsePage(body) {
    return pageSchema.parse(JSON.parse(body)).jobs;
  },

  mapJob(raw): SourceJob {
    const job = jobSchema.parse(raw);
    return {
      source: "remotive",
      externalId: String(job.id),
      url: job.url,
      title: job.title.trim(),
      company: job.company_name.trim(),
      seniorityLabels: [],
      categories: job.category ? [job.category] : [],
      locations: job.candidate_required_location ? [job.candidate_required_location] : [],
      timezoneOffsets: [],
      salary: null,
      salaryText: job.salary || null,
      tags: job.tags ?? [],
      description: htmlToText(job.description),
      publishedAt: parseUtc(job.publication_date),
    };
  },
};
