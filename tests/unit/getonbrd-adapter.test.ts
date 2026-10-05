import { describe, expect, it } from "vitest";
import { normalizeJob } from "@/lib/normalize/normalize-job";
import { buildSearchUrl, getonbrdAdapter } from "@/lib/sources/getonbrd/adapter";
import { sourceJobSchema } from "@/lib/sources/types";
import { fakeFetch, loadFixture, loadFixtureText } from "../helpers";

const sample = loadFixture<{ data: unknown[] }>("getonbrd/search-junior.sample.json");
const [juniorJob, seniorJob, onSiteJob, brokenJob] = sample.data;

describe("getonbrd adapter: mapJob", () => {
  it("maps a remote_local posting to the common schema", () => {
    const job = getonbrdAdapter.mapJob(juniorJob)!;

    expect(sourceJobSchema.parse(job)).toEqual(job);
    expect(job).toMatchObject({
      source: "getonbrd",
      externalId: "desarrollador-a-frontend-junior-acme-remote",
      title: "Desarrollador/a Frontend Junior",
      company: "Acme Labs",
      seniorityLabels: ["Junior"],
      categories: ["Programming"],
      salary: { min: 1200, max: 1800, currency: "USD", period: "month" },
      tags: ["React", "TypeScript"],
    });
    // Get on Board's geographic "North America" includes Mexico.
    expect(job.locations).toEqual(["Mexico", "United States", "Canada", "Chile", "Latin America"]);
    expect(job.publishedAt.toISOString()).toBe("2025-10-05T00:00:00.000Z");
  });

  it("treats fully_remote as worldwide and falls back to slugs and seniority ids", () => {
    const job = getonbrdAdapter.mapJob(seniorJob)!;
    expect(job.locations).toEqual(["Worldwide"]);
    expect(job.company).toBe("Globex Corp");
    expect(job.seniorityLabels).toEqual(["Senior"]);
    expect(job.salary).toBeNull();
  });

  it("strips HTML and decodes entities from the description", () => {
    const job = getonbrdAdapter.mapJob(juniorJob)!;
    expect(job.description).toContain("Construir componentes en React");
    expect(job.description).toContain("TypeScript & Tailwind");
    expect(job.description).not.toMatch(/<[^>]+>/);
  });

  it("discards on-site postings and throws on malformed ones", () => {
    expect(getonbrdAdapter.mapJob(onSiteJob)).toBeNull();
    expect(() => getonbrdAdapter.mapJob(brokenJob)).toThrow();
  });

  it("maps real responses", () => {
    const raws = getonbrdAdapter.parsePage(loadFixtureText("getonbrd/search-developer.json"));
    const mapped = raws.map((raw) => getonbrdAdapter.mapJob(raw));
    expect(raws.length).toBeGreaterThan(10);
    // Hybrid and on-site jobs are discarded; every remote one maps cleanly.
    expect(mapped.filter(Boolean).length).toBeGreaterThan(0);
    for (const job of mapped.filter((j) => j !== null))
      expect(() => sourceJobSchema.parse(job)).not.toThrow();
  });
});

describe("getonbrd adapter: real remote_local jobs", () => {
  const jobs = getonbrdAdapter
    .parsePage(loadFixtureText("getonbrd/search-junior.json"))
    .map((raw) => getonbrdAdapter.mapJob(raw))
    .filter((job) => job !== null);

  it("reads allowed countries from expanded locations", () => {
    const job = jobs.find((j) => j.title === "Front-end (Angular Flutter)")!;
    expect(job.locations).toContain("Mexico");
    expect(normalizeJob(job, {})).toMatchObject({
      ok: true,
      job: { seniority: "junior", acceptsMexico: "yes" },
    });
  });
});

describe("getonbrd adapter: fetchJobs", () => {
  it("builds a search URL with expanded relationships", () => {
    const url = new URL(buildSearchUrl("junior", 2));
    expect(url.searchParams.get("query")).toBe("junior");
    expect(url.searchParams.get("page")).toBe("2");
    expect(JSON.parse(url.searchParams.get("expand")!)).toContain("location_regions");
  });

  it("deduplicates postings returned by several queries", async () => {
    const { fn, calls } = fakeFetch([{ match: () => true, body: sample }]);
    const raws = await getonbrdAdapter.fetchJobs(fn, { delayMs: 0 });
    expect(calls).toHaveLength(4);
    expect(raws).toHaveLength(4);
  });

  it("stops paginating when total_pages is reached", async () => {
    const { fn, calls } = fakeFetch([{ match: () => true, body: { ...sample, meta: { total_pages: 2 } } }]);
    await getonbrdAdapter.fetchJobs(fn, { delayMs: 0 });
    expect(calls).toHaveLength(8);
  });

  it("propagates HTTP errors so the run is marked as failed", async () => {
    const { fn } = fakeFetch([{ match: () => true, body: {}, status: 403 }]);
    await expect(getonbrdAdapter.fetchJobs(fn, { delayMs: 0 })).rejects.toThrow("HTTP 403");
  });
});
