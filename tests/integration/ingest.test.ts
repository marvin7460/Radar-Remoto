import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
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

    expect(second.inserted).toBe(0);
    expect(second.updated + second.unchanged).toBe(2);
    expect(await db.select().from(jobs)).toHaveLength(2);
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
