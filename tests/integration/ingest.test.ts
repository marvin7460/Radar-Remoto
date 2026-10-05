import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { eq } from "drizzle-orm";
import { migrate } from "drizzle-orm/libsql/migrator";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createDb, type Db } from "@/db/client";
import { ingestionRuns, jobs } from "@/db/schema";
import { ingestSource } from "@/lib/ingest/ingest-source";
import { runAllSources } from "@/lib/ingest/run-all";
import { getonbrdAdapter } from "@/lib/sources/getonbrd/adapter";
import type { SourceAdapter } from "@/lib/sources/types";
import { fakeFetch, loadFixture } from "../helpers";

const fixture = loadFixture("getonbrd/search-junior.sample.json");
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

const ingest = () =>
  ingestSource(db, getonbrdAdapter, {
    fetchFn: fakeFetch([{ match: () => true, body: fixture }]).fn,
    delayMs: 0,
  });

describe("ingestion", () => {
  it("stores valid remote jobs and counts skipped/invalid ones", async () => {
    const stats = await ingest();

    expect(stats).toMatchObject({ status: "success", fetched: 4, inserted: 2, skipped: 1, invalid: 1 });
    expect(await db.select().from(jobs)).toHaveLength(2);
  });

  it("is idempotent: running twice does not duplicate jobs", async () => {
    await ingest();
    const second = await ingest();

    expect(second).toMatchObject({ inserted: 0, updated: 0, unchanged: 2 });
    expect(await db.select().from(jobs)).toHaveLength(2);
  });

  it("updates only the postings whose content changed", async () => {
    await ingest();
    const [before] = await db.select().from(jobs).where(eq(jobs.externalId, JUNIOR_ID));

    const changed = structuredClone(fixture) as { data: Array<{ id: string; attributes: { max_salary: number } }> };
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

  it("logs every run", async () => {
    await ingest();
    await ingest();

    const runs = await db.select().from(ingestionRuns);
    expect(runs).toHaveLength(2);
    expect(runs.every((r) => r.status === "success" && r.finishedAt !== null)).toBe(true);
  });

  it("keeps going when one source fails and records the error", async () => {
    const broken: SourceAdapter = {
      id: "broken",
      name: "Broken",
      fetchJobs: async () => {
        throw new Error("API down");
      },
      normalize: () => null,
    };
    const okAdapter: SourceAdapter = {
      ...getonbrdAdapter,
      fetchJobs: (_fetchFn, options) =>
        getonbrdAdapter.fetchJobs(fakeFetch([{ match: () => true, body: fixture }]).fn, {
          ...options,
          delayMs: 0,
        }),
    };

    const results = await runAllSources(db, [broken, okAdapter]);

    expect(results.map((r) => r.status)).toEqual(["error", "success"]);
    expect(await db.select().from(jobs)).toHaveLength(2);
    const [failedRun] = await db.select().from(ingestionRuns).limit(1);
    expect(failedRun).toMatchObject({ source: "broken", status: "error", errorMessage: "API down" });
  });
});
