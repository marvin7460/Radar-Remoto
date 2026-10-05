import { z } from "zod";
import { fetchText, sleep, type FetchFn } from "@/lib/http/fetch";
import { parsePeriodLabel } from "@/lib/normalize/salary";
import { htmlToText } from "@/lib/text/html";
import type { FetchJobsOptions, FixtureTarget, SourceAdapter, SourceJob } from "../types";

/**
 * Himalayas — remote jobs with structured seniority, countries and time zones.
 * Public API, no key: https://himalayas.app/docs/remote-jobs-api
 * Terms: max 20 jobs per request, link back to Himalayas, and never submit
 * their jobs to Google Jobs or other boards (so: no JobPosting markup).
 */
const SEARCH_URL = "https://himalayas.app/jobs/api/search";
/** Entry-level alone returns mostly non-tech roles, so we search by keyword too. */
const QUERIES = ["developer", "software engineer"];
const MAX_PAGES_PER_QUERY = 3;
const REQUEST_DELAY_MS = 2_000;

export function buildSearchUrl(query: string, page: number): string {
  const params = new URLSearchParams({
    q: query,
    seniority: "Entry-level",
    sort: "recent",
    page: String(page),
  });
  return `${SEARCH_URL}?${params}`;
}

export const himalayasFixtures: FixtureTarget[] = [
  { file: "himalayas/search-developer.json", url: buildSearchUrl("developer", 1) },
];

const jobSchema = z.object({
  guid: z.url(),
  title: z.string(),
  companyName: z.string(),
  excerpt: z.string().nullish(),
  description: z.string().nullish(),
  seniority: z.array(z.string()).nullish(),
  categories: z.array(z.string()).nullish(),
  parentCategories: z.array(z.string()).nullish(),
  locationRestrictions: z.array(z.string()).nullish(),
  timezoneRestrictions: z.array(z.number()).nullish(),
  minSalary: z.number().nullish(),
  maxSalary: z.number().nullish(),
  currency: z.string().nullish(),
  salaryPeriod: z.string().nullish(),
  pubDate: z.number(),
});

const pageSchema = z.object({ jobs: z.array(z.unknown()) });

export const himalayasAdapter: SourceAdapter = {
  id: "himalayas",
  name: "Himalayas",
  homepage: "https://himalayas.app",
  budget: { maxRunsPerDay: 6, minIntervalMinutes: 60 },

  async fetchJobs(fetchFn: FetchFn, { delayMs = REQUEST_DELAY_MS }: FetchJobsOptions = {}) {
    const byGuid = new Map<string, unknown>();
    let first = true;
    for (const query of QUERIES) {
      for (let page = 1; page <= MAX_PAGES_PER_QUERY; page++) {
        if (!first) await sleep(delayMs);
        first = false;
        const jobs = himalayasAdapter.parsePage(await fetchText(buildSearchUrl(query, page), { fetchFn }));
        for (const job of jobs) {
          const guid = (job as { guid?: unknown }).guid;
          if (typeof guid === "string") byGuid.set(guid, job);
        }
        if (jobs.length === 0) break;
      }
    }
    return [...byGuid.values()];
  },

  parsePage(body) {
    return pageSchema.parse(JSON.parse(body)).jobs;
  },

  mapJob(raw): SourceJob {
    const job = jobSchema.parse(raw);
    const restrictions = job.locationRestrictions ?? [];
    const hasSalary = job.minSalary != null || job.maxSalary != null;

    return {
      source: "himalayas",
      externalId: job.guid,
      url: job.guid,
      title: job.title.trim(),
      company: job.companyName.trim(),
      seniorityLabels: job.seniority ?? [],
      categories: [
        ...(job.parentCategories ?? []),
        ...(job.categories ?? []).map((c) => c.replace(/-/g, " ")),
      ],
      // Per Himalayas' docs, no location restrictions means worldwide.
      locations: restrictions.length > 0 ? restrictions : ["Worldwide"],
      timezoneOffsets: job.timezoneRestrictions ?? [],
      salary: hasSalary
        ? {
            min: job.minSalary || null,
            max: job.maxSalary || null,
            currency: job.currency ?? null,
            period: parsePeriodLabel(job.salaryPeriod),
          }
        : null,
      salaryText: null,
      tags: [],
      description: htmlToText(job.description ?? job.excerpt),
      publishedAt: new Date(job.pubDate * 1000),
    };
  },
};
