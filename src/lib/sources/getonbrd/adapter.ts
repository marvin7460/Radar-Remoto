import { fetchJson, sleep } from "@/lib/http/fetch-json";
import { htmlToText } from "@/lib/text/html";
import type { FetchFn, FetchJobsOptions, NormalizedJob, SourceAdapter } from "../types";
import { getonbrdJobSchema, getonbrdSearchResponseSchema } from "./schema";

const BASE_URL = "https://www.getonbrd.com/api/v0/search/jobs";
const SEARCH_QUERIES = ["junior", "trainee", "developer", "desarrollador"];
const PER_PAGE = 50;
const MAX_PAGES_PER_QUERY = 5;
/** Pause between requests: we are guests on a free API. */
const REQUEST_DELAY_MS = 1_000;

/**
 * Get on Board seniority ids. Mapped to our coarse levels; the real junior
 * classifier (phase 3) also reads title and description.
 */
const SENIORITY_BY_ID: Record<string, NormalizedJob["seniority"]> = {
  "1": "junior", // No experience required
  "2": "junior", // Junior
  "3": "mid", // Semi Senior
  "4": "senior", // Senior
  "5": "senior", // Expert
};

export function buildSearchUrl(query: string, page: number): string {
  const params = new URLSearchParams({
    query,
    per_page: String(PER_PAGE),
    page: String(page),
    expand: JSON.stringify(["company", "seniority", "tags"]),
  });
  return `${BASE_URL}?${params}`;
}

function humanizeSlug(slug: string): string {
  return slug.replace(/[-_]+/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export const getonbrdAdapter: SourceAdapter = {
  id: "getonbrd",
  name: "Get on Board",

  async fetchJobs(fetchFn: FetchFn, { delayMs = REQUEST_DELAY_MS }: FetchJobsOptions = {}) {
    const byId = new Map<string, unknown>();
    let first = true;

    for (const query of SEARCH_QUERIES) {
      for (let page = 1; page <= MAX_PAGES_PER_QUERY; page++) {
        if (!first) await sleep(delayMs);
        first = false;

        const body = getonbrdSearchResponseSchema.parse(
          await fetchJson(buildSearchUrl(query, page), { fetchFn }),
        );
        for (const item of body.data) {
          const id = (item as { id?: unknown }).id;
          if (typeof id === "string") byId.set(id, item);
        }
        const totalPages = body.meta?.total_pages ?? 1;
        if (body.data.length === 0 || page >= totalPages) break;
      }
    }
    return [...byId.values()];
  },

  normalize(raw) {
    const job = getonbrdJobSchema.parse(raw);
    const a = job.attributes;

    const isRemote = a.remote === true || (a.remote_modality ?? "").includes("remote");
    if (!isRemote || a.remote_modality === "no_remote") return null;

    const seniorityId = a.seniority?.data?.id;
    const seniorityName = a.seniority?.data?.attributes?.name ?? null;
    const companyData = a.company?.data;
    const company =
      companyData?.attributes?.name ?? (companyData ? humanizeSlug(String(companyData.id)) : null);
    const countries = a.countries ?? [];
    const locationParts = [a.remote_modality, a.remote_zone, countries.join(", ")].filter(Boolean);

    return {
      source: "getonbrd",
      externalId: job.id,
      url: job.links?.public_url ?? `https://www.getonbrd.com/jobs/${job.id}`,
      title: a.title.trim(),
      company: company?.trim() || "Empresa no indicada",
      seniority: seniorityId != null ? (SENIORITY_BY_ID[String(seniorityId)] ?? "unknown") : "unknown",
      seniorityRaw: seniorityName ?? (seniorityId != null ? String(seniorityId) : null),
      locationRaw: locationParts.length ? locationParts.join(" · ") : null,
      allowedRegions: countries,
      timezoneMin: null,
      timezoneMax: null,
      // Get on Board publishes salaries as monthly USD amounts.
      salaryMin: a.min_salary ?? null,
      salaryMax: a.max_salary ?? null,
      salaryCurrency: a.min_salary != null || a.max_salary != null ? "USD" : null,
      salaryPeriod: a.min_salary != null || a.max_salary != null ? "month" : null,
      technologies: (a.tags?.data ?? []).map((t) => t.attributes?.name ?? String(t.id)),
      description: [a.description, a.functions, a.desirable].map(htmlToText).filter(Boolean).join("\n\n"),
      publishedAt: new Date(a.published_at * 1000),
    };
  },
};
