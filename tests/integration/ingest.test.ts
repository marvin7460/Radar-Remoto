import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { eq, isNull } from "drizzle-orm";
import { migrate } from "drizzle-orm/libsql/migrator";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createDb, type Db } from "@/db/client";
import { fxRates, ingestionRuns, jobs } from "@/db/schema";
import { getLatestUsdRates } from "@/lib/fx/rates";
import { ingestSource } from "@/lib/ingest/ingest-source";
import { runAllSources } from "@/lib/ingest/run-all";
import { getonbrdAdapter } from "@/lib/sources/getonbrd/adapter";
import type { SourceAdapter, SourceJob } from "@/lib/sources/types";
import { fakeFetch, loadFixture, loadFixtureText } from "../helpers";

const sample = loadFixture("getonbrd/search-junior.sample.json");
const frankfurter = loadFixtureText("frankfurter/v1-latest.json");
const JUNIOR_ID = "desarrollador-a-frontend-junior-acme-remote";

let dir: string;
let db: Db;

// A fresh SQLite file per test: real SQL, real migrations, no network, no Docker.
beforeEach(async () => {
  dir = mkdtempSync(path.join(tmpdir(), "radar-test-"));
  db = createDb(`file:${path.join(dir, "test.db")}`);
  await migrate(db, { migrationsFolder: "./drizzle" });
});

afterEach(() => {
  db.$client.close();
  rmSync(dir, { recursive: true, force: true });
});

const sampleFetch = () => fakeFetch([{ match: () => true, body: sample }]).fn;
const ingest = (now?: () => Date) =>
  ingestSource(db, getonbrdAdapter, { fetchFn: sampleFetch(), delayMs: 0, now });

/** A tiny in-memory source, to test cross-source behavior. */
function fakeSource(id: string, postings: Array<Partial<SourceJob> & { externalId: string }>): SourceAdapter {
  return {
    id,
    name: id,
    homepage: `https://${id}.test`,
    budget: { maxRunsPerDay: 100, minIntervalMinutes: 0 },
    fetchJobs: async () => postings,
    parsePage: () => [],
    mapJob: (raw) => ({
      source: id,
      url: `https://${id}.test/jobs/${(raw as SourceJob).externalId}`,
      title: "Frontend Developer (React)",
      company: "Acme Labs",
      seniorityLabels: [],
      categories: [],
      locations: ["LATAM"],
      timezoneOffsets: [],
      salary: null,
      salaryText: null,
      tags: [],
      description: "",
      publishedAt: new Date("2026-10-01T00:00:00Z"),
      ...(raw as Partial<SourceJob>),
      externalId: (raw as SourceJob).externalId,
    }),
  };
}

describe("ingestSource", () => {
  it("stores valid remote tech jobs and counts skipped/invalid ones", async () => {
    const stats = await ingest();
    expect(stats).toMatchObject({ status: "success", fetched: 4, inserted: 2, skipped: 1, invalid: 1 });

    const [junior] = await db.select().from(jobs).where(eq(jobs.externalId, JUNIOR_ID));
    expect(junior).toMatchObject({
      seniority: "junior",
      acceptsMexico: "yes",
      eligibilityReason: "Menciona México",
      salaryUsdMonthlyMin: 1200,
      technologies: ["React", "TypeScript", "Tailwind CSS"],
    });
  });

  it("is idempotent: running twice does not duplicate or rewrite jobs", async () => {
    await ingest();
    const second = await ingest();
    expect(second).toMatchObject({ inserted: 0, updated: 0, unchanged: 2 });
    expect(await db.select().from(jobs)).toHaveLength(2);
  });

  it("updates only the postings whose content changed", async () => {
    await ingest();
    const [before] = await db.select().from(jobs).where(eq(jobs.externalId, JUNIOR_ID));

    const changed = structuredClone(sample) as {
      data: Array<{ id: string; attributes: { max_salary: number } }>;
    };
    changed.data.find((job) => job.id === JUNIOR_ID)!.attributes.max_salary = 2500;
    const later = new Date(before.updatedAt.getTime() + 60_000);
    const stats = await ingestSource(db, getonbrdAdapter, {
      fetchFn: fakeFetch([{ match: () => true, body: changed }]).fn,
      delayMs: 0,
      now: () => later,
    });

    expect(stats).toMatchObject({ inserted: 0, updated: 1, unchanged: 1 });
    const [after] = await db.select().from(jobs).where(eq(jobs.externalId, JUNIOR_ID));
    expect(after.salaryMax).toBe(2500);
    expect(after.updatedAt).toEqual(later);
    expect(after.firstSeenAt).toEqual(before.firstSeenAt);
  });
});

describe("runAllSources", () => {
  const routes = () =>
    fakeFetch([
      { match: (url) => url.includes("frankfurter"), body: frankfurter },
      { match: () => true, body: sample },
    ]).fn;

  it("keeps going when one source fails and records the error", async () => {
    const broken: SourceAdapter = {
      ...fakeSource("broken", []),
      fetchJobs: async () => {
        throw new Error("API down");
      },
    };
    const { sources } = await runAllSources(db, [broken, getonbrdAdapter], { fetchFn: routes(), delayMs: 0 });

    expect(sources.map((r) => r.status)).toEqual(["error", "success"]);
    expect(await db.select().from(jobs)).toHaveLength(2);
    const [failed] = await db.select().from(ingestionRuns).where(eq(ingestionRuns.source, "broken"));
    expect(failed).toMatchObject({ status: "error", errorMessage: "API down" });
  });

  it("stores the day's exchange rates once", async () => {
    await runAllSources(db, [], { fetchFn: routes() });
    await runAllSources(db, [], { fetchFn: routes() });

    expect(await db.select().from(fxRates)).toHaveLength(5);
    expect((await getLatestUsdRates(db)).rates.MXN).toBeCloseTo(18.1498);
  });

  it("respects each source's rate budget", async () => {
    const limited = { ...getonbrdAdapter, budget: { maxRunsPerDay: 4, minIntervalMinutes: 180 } };
    const start = new Date("2026-10-05T00:00:00Z");
    const at = (hours: number) => () => new Date(start.getTime() + hours * 3_600_000);

    const runs = [];
    for (const hours of [0, 1, 6, 12, 18, 23]) {
      const { sources } = await runAllSources(db, [limited], {
        fetchFn: routes(),
        delayMs: 0,
        now: at(hours),
      });
      runs.push(sources[0].status);
    }
    // 1 h after the first run is too soon; the 5th run in a day is one too many.
    expect(runs).toEqual(["success", "skipped", "success", "success", "success", "skipped"]);
  });

  it("marks cross-source duplicates and stays stable on re-runs", async () => {
    const a = fakeSource("source-a", [{ externalId: "1" }]);
    const b = fakeSource("source-b", [
      { externalId: "x", title: "Front-end Developer - React", company: "Acme Labs Inc." },
    ]);

    const first = await runAllSources(db, [a, b], { fetchFn: routes() });
    expect(first.dedupe).toMatchObject({ duplicates: 1, changed: 1 });

    const originals = await db.select().from(jobs).where(isNull(jobs.canonicalJobId));
    expect(originals.map((job) => job.source)).toEqual(["source-a"]);

    const second = await runAllSources(db, [a, b], { fetchFn: routes() });
    expect(second.dedupe).toMatchObject({ duplicates: 1, changed: 0 });
  });
});
