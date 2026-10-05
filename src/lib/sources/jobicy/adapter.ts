import { z } from "zod";
import type { FetchFn } from "@/lib/http/fetch";
import { parsePeriodLabel } from "@/lib/normalize/salary";
import { htmlToText } from "@/lib/text/html";
import { fetchSequentially } from "../fetch-pages";
import type { FetchJobsOptions, FixtureTarget, SourceAdapter, SourceJob } from "../types";

/**
 * Jobicy — remote jobs with region filters.
 * Public API: https://github.com/Jobicy/remote-jobs-api
 * Terms: credit Jobicy with a direct link, send applicants to the original
 * job URL, cache responses and don't poll more than once per hour.
 * We only ask for software jobs open to LATAM, Mexico or anywhere.
 */
const BASE_URL = "https://jobicy.com/api/v2/remote-jobs";
const GEOS = ["latam", "mexico", "anywhere"];
const REQUEST_DELAY_MS = 2_000;

export function buildUrl(geo: string, count = 100): string {
  return `${BASE_URL}?${new URLSearchParams({ count: String(count), geo, industry: "engineering" })}`;
}

export const jobicyFixtures: FixtureTarget[] = [{ file: "jobicy/latam.json", url: buildUrl("latam", 25) }];

const jobSchema = z.object({
  id: z.number(),
  url: z.url(),
  jobTitle: z.string(),
  companyName: z.string(),
  jobIndustry: z.array(z.string()).nullish(),
  jobType: z.array(z.string()).nullish(),
  jobGeo: z.string().nullish(),
  jobLevel: z.string().nullish(),
  jobExcerpt: z.string().nullish(),
  jobDescription: z.string().nullish(),
  pubDate: z.string(),
  salaryMin: z.number().nullish(),
  salaryMax: z.number().nullish(),
  salaryCurrency: z.string().nullish(),
  salaryPeriod: z.string().nullish(),
  // Older API versions only had annual amounts.
  annualSalaryMin: z.number().nullish(),
  annualSalaryMax: z.number().nullish(),
});

const pageSchema = z.object({ jobs: z.array(z.unknown()) });

export const jobicyAdapter: SourceAdapter = {
  id: "jobicy",
  name: "Jobicy",
  homepage: "https://jobicy.com",
  budget: { maxRunsPerDay: 8, minIntervalMinutes: 60 },

  fetchJobs(fetchFn: FetchFn, { delayMs = REQUEST_DELAY_MS }: FetchJobsOptions = {}) {
    return fetchSequentially(
      jobicyAdapter,
      GEOS.map((geo) => buildUrl(geo)),
      {
        fetchFn,
        delayMs,
        keyOf: (raw) => String((raw as { id?: unknown }).id),
      },
    );
  },

  parsePage(body) {
    return pageSchema.parse(JSON.parse(body)).jobs;
  },

  mapJob(raw): SourceJob {
    const job = jobSchema.parse(raw);
    const min = job.salaryMin ?? job.annualSalaryMin ?? null;
    const max = job.salaryMax ?? job.annualSalaryMax ?? null;
    const period =
      job.salaryMin != null || job.salaryMax != null ? parsePeriodLabel(job.salaryPeriod) : "year";

    return {
      source: "jobicy",
      externalId: String(job.id),
      url: job.url,
      title: htmlToText(job.jobTitle),
      company: htmlToText(job.companyName),
      seniorityLabels: job.jobLevel ? [job.jobLevel] : [],
      categories: job.jobIndustry ?? [],
      locations: job.jobGeo ? [job.jobGeo] : [],
      timezoneOffsets: [],
      salary:
        min || max
          ? { min: min || null, max: max || null, currency: job.salaryCurrency ?? "USD", period }
          : null,
      salaryText: null,
      tags: [],
      description: htmlToText(job.jobDescription ?? job.jobExcerpt),
      publishedAt: new Date(job.pubDate),
    };
  },
};
