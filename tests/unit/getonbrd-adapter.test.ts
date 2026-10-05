import { describe, expect, it } from "vitest";
import { buildSearchUrl, getonbrdAdapter } from "@/lib/sources/getonbrd/adapter";
import { normalizedJobSchema } from "@/lib/sources/types";
import { fakeFetch, loadFixture } from "../helpers";

const fixture = loadFixture<{ data: unknown[] }>("getonbrd/search-junior.sample.json");
const [juniorJob, seniorJob, onSiteJob, brokenJob] = fixture.data;

describe("getonbrd adapter: normalize", () => {
  it("maps a junior remote posting to the common schema", () => {
    const job = getonbrdAdapter.normalize(juniorJob);

    expect(job).not.toBeNull();
    expect(normalizedJobSchema.parse(job)).toEqual(job);
    expect(job).toMatchObject({
      source: "getonbrd",
      externalId: "desarrollador-a-frontend-junior-acme-remote",
      title: "Desarrollador/a Frontend Junior",
      company: "Acme Labs",
      seniority: "junior",
      seniorityRaw: "Junior",
      salaryMin: 1200,
      salaryMax: 1800,
      salaryCurrency: "USD",
      salaryPeriod: "month",
      technologies: ["React", "TypeScript"],
      locationRaw: "fully_remote · Latin America · Remote",
    });
    expect(job!.publishedAt.toISOString()).toBe("2025-10-05T00:00:00.000Z");
  });

  it("strips HTML and decodes entities from the description", () => {
    const job = getonbrdAdapter.normalize(juniorJob)!;
    expect(job.description).toContain("Construir componentes en React");
    expect(job.description).toContain("TypeScript & Tailwind");
    expect(job.description).not.toMatch(/<[^>]+>/);
  });

  it("falls back to slugs when relationships are not expanded", () => {
    const job = getonbrdAdapter.normalize(seniorJob)!;
    expect(job.company).toBe("Globex Corp");
    expect(job.seniority).toBe("senior");
    expect(job.technologies).toEqual(["node-js"]);
    expect(job.salaryCurrency).toBeNull();
    expect(job.salaryPeriod).toBeNull();
  });

  it("discards on-site postings", () => {
    expect(getonbrdAdapter.normalize(onSiteJob)).toBeNull();
  });

  it("throws on malformed postings so the run can count them as invalid", () => {
    expect(() => getonbrdAdapter.normalize(brokenJob)).toThrow();
  });
});

describe("getonbrd adapter: fetchJobs", () => {
  it("builds a search URL with expanded relationships", () => {
    const url = new URL(buildSearchUrl("junior", 2));
    expect(url.searchParams.get("query")).toBe("junior");
    expect(url.searchParams.get("page")).toBe("2");
    expect(JSON.parse(url.searchParams.get("expand")!)).toEqual(["company", "seniority", "tags"]);
  });

  it("deduplicates postings returned by several queries", async () => {
    const { fn, calls } = fakeFetch([{ match: () => true, body: fixture }]);
    const raws = await getonbrdAdapter.fetchJobs(fn, { delayMs: 0 });

    // 4 queries × 1 page each, same 4 postings every time.
    expect(calls).toHaveLength(4);
    expect(raws).toHaveLength(4);
  });

  it("stops paginating when total_pages is reached", async () => {
    const { fn, calls } = fakeFetch([
      { match: () => true, body: { ...fixture, meta: { page: 1, total_pages: 2 } } },
    ]);
    await getonbrdAdapter.fetchJobs(fn, { delayMs: 0 });
    expect(calls).toHaveLength(8);
  });

  it("propagates HTTP errors so the run is marked as failed", async () => {
    const { fn } = fakeFetch([{ match: () => true, body: {}, status: 403 }]);
    await expect(getonbrdAdapter.fetchJobs(fn, { delayMs: 0 })).rejects.toThrow("HTTP 403");
  });
});
