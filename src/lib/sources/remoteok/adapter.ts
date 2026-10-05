import { z } from "zod";
import type { FetchFn } from "@/lib/http/fetch";
import { fixMojibake } from "@/lib/normalize/text";
import { htmlToText } from "@/lib/text/html";
import { fetchSequentially } from "../fetch-pages";
import type { FetchJobsOptions, FixtureTarget, SourceAdapter, SourceJob } from "../types";

/**
 * Remote OK — big remote-only board.
 * Public API: https://remoteok.com/api (first array item is the legal notice).
 * Terms: link back to the job on Remote OK with a followed link (no
 * rel="nofollow") and name "Remote OK" as the source; don't use their logo.
 * Some text arrives double-encoded ("MecÃ¡nico"), so we repair it.
 * Tags are added liberally (a "VP Pricing" job is tagged dev, cloud,
 * salesforce…), so they are not used as categories: the title decides.
 */
export const REMOTEOK_URL = "https://remoteok.com/api";

export const remoteokFixtures: FixtureTarget[] = [{ file: "remoteok/api.json", url: REMOTEOK_URL, keep: 26 }];

const jobSchema = z.object({
  id: z.union([z.string(), z.number()]),
  url: z.url(),
  position: z.string(),
  company: z.string(),
  tags: z.array(z.string()).nullish(),
  location: z.string().nullish(),
  salary_min: z.number().nullish(),
  salary_max: z.number().nullish(),
  description: z.string().nullish(),
  date: z.string(),
});

const LEVEL_TAG = /\b(?:junior|entry|intern|trainee|senior|lead|mid)\b/i;

export const remoteokAdapter: SourceAdapter = {
  id: "remoteok",
  name: "Remote OK",
  homepage: "https://remoteok.com",
  budget: { maxRunsPerDay: 6, minIntervalMinutes: 60 },

  fetchJobs(fetchFn: FetchFn, { delayMs = 0 }: FetchJobsOptions = {}) {
    return fetchSequentially(remoteokAdapter, [REMOTEOK_URL], {
      fetchFn,
      delayMs,
      keyOf: (raw) => String((raw as { id?: unknown }).id),
    });
  },

  parsePage(body) {
    const items = z.array(z.record(z.string(), z.unknown())).parse(JSON.parse(body));
    return items.filter((item) => "id" in item && !("legal" in item));
  },

  mapJob(raw): SourceJob {
    const job = jobSchema.parse(raw);
    const tags = (job.tags ?? []).map(fixMojibake);
    const min = job.salary_min || null;
    const max = job.salary_max || null;
    // Normalizes the host ("remoteOK.com" → "remoteok.com").
    const url = new URL(job.url).toString();

    return {
      source: "remoteok",
      externalId: String(job.id),
      url,
      title: fixMojibake(job.position).trim(),
      company: fixMojibake(job.company).trim(),
      seniorityLabels: tags.filter((tag) => LEVEL_TAG.test(tag)),
      categories: [],
      locations: job.location?.trim() ? [fixMojibake(job.location.trim())] : [],
      timezoneOffsets: [],
      // Remote OK publishes yearly USD amounts; 0 means "not given".
      salary: min || max ? { min, max, currency: "USD", period: "year" } : null,
      salaryText: null,
      tags,
      description: htmlToText(fixMojibake(job.description ?? "")),
      publishedAt: new Date(job.date),
    };
  },
};
