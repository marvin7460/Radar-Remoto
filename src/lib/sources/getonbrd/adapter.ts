import { z } from "zod";
import { fetchText, sleep, type FetchFn } from "@/lib/http/fetch";
import { htmlToText } from "@/lib/text/html";
import type { FetchJobsOptions, FixtureTarget, SourceAdapter, SourceJob } from "../types";

/**
 * Get on Board — tech jobs in Latin America.
 * Public API, no key: GET https://www.getonbrd.com/api/v0/search/jobs
 * Docs: https://api-doc.getonbrd.com  ·  No published rate limit: we go slow.
 */
const BASE_URL = "https://www.getonbrd.com/api/v0/search/jobs";
const SEARCH_QUERIES = ["junior", "trainee", "developer", "desarrollador"];
const PER_PAGE = 50;
const MAX_PAGES_PER_QUERY = 4;
const REQUEST_DELAY_MS = 1_500;
const EXPAND = ["company", "seniority", "tags", "location_regions", "location_tenants"];

export function buildSearchUrl(query: string, page: number, perPage = PER_PAGE): string {
  const params = new URLSearchParams({
    query,
    per_page: String(perPage),
    page: String(page),
    expand: JSON.stringify(EXPAND),
  });
  return `${BASE_URL}?${params}`;
}

export const getonbrdFixtures: FixtureTarget[] = [
  { file: "getonbrd/search-junior.json", url: buildSearchUrl("junior", 1, 25) },
  { file: "getonbrd/search-developer.json", url: buildSearchUrl("developer", 1, 25) },
];

/** Seniority ids, used when the relationship comes back unexpanded. */
const SENIORITY_NAMES: Record<string, string> = {
  "1": "No experience required",
  "2": "Junior",
  "3": "Semi Senior",
  "4": "Senior",
  "5": "Expert",
};

/**
 * Get on Board's regions are geographic, and it lists Central America
 * separately, so its "North America" means Mexico, the US and Canada.
 */
const REGION_COUNTRIES: Record<string, string[]> = { north_america: ["Mexico", "United States", "Canada"] };

const relationship = z.object({
  id: z.union([z.string(), z.number()]),
  attributes: z.object({ name: z.string().nullish() }).passthrough().optional(),
});
const toOne = z.object({ data: relationship.nullable() }).nullish();
const toMany = z.object({ data: z.array(relationship) }).nullish();

const jobSchema = z.object({
  id: z.string(),
  attributes: z.object({
    title: z.string(),
    description: z.string().nullish(),
    projects: z.string().nullish(),
    functions: z.string().nullish(),
    desirable: z.string().nullish(),
    benefits: z.string().nullish(),
    remote: z.boolean().nullish(),
    remote_modality: z.string().nullish(),
    remote_zone: z.string().nullish(),
    countries: z.array(z.string()).nullish(),
    category_name: z.string().nullish(),
    min_salary: z.number().nullish(),
    max_salary: z.number().nullish(),
    published_at: z.number(),
    seniority: toOne,
    company: toOne,
    tags: toMany,
    location_regions: toMany,
    location_tenants: toMany,
  }),
  links: z.object({ public_url: z.url() }).optional(),
});

const pageSchema = z.object({
  data: z.array(z.unknown()),
  meta: z.object({ total_pages: z.number().optional() }).optional(),
});

type Relationship = z.infer<typeof relationship>;

const humanize = (slug: string) => slug.replace(/[-_]+/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
/** Expanded relationships carry a name; unexpanded ones only a numeric id we can't use. */
const nameOf = (item: Relationship) =>
  item.attributes?.name ?? (typeof item.id === "string" && !/^\d+$/.test(item.id) ? humanize(item.id) : null);

export const getonbrdAdapter: SourceAdapter = {
  id: "getonbrd",
  name: "Get on Board",
  homepage: "https://www.getonbrd.com",
  budget: { maxRunsPerDay: 6, minIntervalMinutes: 60 },

  async fetchJobs(fetchFn: FetchFn, { delayMs = REQUEST_DELAY_MS }: FetchJobsOptions = {}) {
    const byId = new Map<string, unknown>();
    let first = true;
    for (const query of SEARCH_QUERIES) {
      for (let page = 1; page <= MAX_PAGES_PER_QUERY; page++) {
        if (!first) await sleep(delayMs);
        first = false;
        const body = pageSchema.parse(JSON.parse(await fetchText(buildSearchUrl(query, page), { fetchFn })));
        for (const item of body.data) {
          const id = (item as { id?: unknown }).id;
          if (typeof id === "string") byId.set(id, item);
        }
        if (body.data.length === 0 || page >= (body.meta?.total_pages ?? 1)) break;
      }
    }
    return [...byId.values()];
  },

  parsePage(body) {
    return pageSchema.parse(JSON.parse(body)).data;
  },

  mapJob(raw): SourceJob | null {
    const job = jobSchema.parse(raw);
    const a = job.attributes;

    const modality = a.remote_modality ?? (a.remote ? "fully_remote" : "no_remote");
    if (modality !== "fully_remote" && modality !== "remote_local") return null;

    // fully_remote = from anywhere; remote_local = only from the listed regions/countries.
    const locations =
      modality === "fully_remote"
        ? ["Worldwide"]
        : [
            ...(a.location_regions?.data ?? []).flatMap((region) =>
              typeof region.id === "string" && REGION_COUNTRIES[region.id]
                ? REGION_COUNTRIES[region.id]
                : [nameOf(region)].filter((name): name is string => Boolean(name)),
            ),
            ...(a.location_tenants?.data ?? []).map(nameOf).filter((name): name is string => Boolean(name)),
            ...(a.remote_zone ? [a.remote_zone] : []),
          ];

    const seniority = a.seniority?.data;
    const company = a.company?.data;
    const hasSalary = a.min_salary != null || a.max_salary != null;

    return {
      source: "getonbrd",
      externalId: job.id,
      url: job.links?.public_url ?? `https://www.getonbrd.com/jobs/${job.id}`,
      title: a.title.trim(),
      company: (company && nameOf(company)?.trim()) || "Empresa no indicada",
      seniorityLabels: [seniority?.attributes?.name ?? SENIORITY_NAMES[String(seniority?.id)]].filter(
        (label): label is string => Boolean(label),
      ),
      categories: a.category_name ? [a.category_name] : [],
      locations,
      timezoneOffsets: [],
      // Get on Board publishes salaries as gross monthly USD.
      salary: hasSalary
        ? { min: a.min_salary || null, max: a.max_salary || null, currency: "USD", period: "month" }
        : null,
      salaryText: null,
      tags: (a.tags?.data ?? []).map((tag) => tag.attributes?.name ?? String(tag.id)),
      description: [a.projects, a.description, a.functions, a.desirable, a.benefits]
        .map(htmlToText)
        .filter(Boolean)
        .join("\n\n"),
      publishedAt: new Date(a.published_at * 1000),
    };
  },
};
