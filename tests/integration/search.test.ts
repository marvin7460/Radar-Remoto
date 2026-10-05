import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { eq } from "drizzle-orm";
import { migrate } from "drizzle-orm/libsql/migrator";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createDb, type Db } from "@/db/client";
import { jobs, type NewJobRow } from "@/db/schema";
import { popularTechnologies, searchJobs } from "@/lib/search/search-jobs";

let dir: string;
let db: Db;
const NOW = new Date("2026-10-05T12:00:00Z");
const daysAgo = (days: number) => new Date(NOW.getTime() - days * 86_400_000);

let nextId = 0;
function row(overrides: Partial<NewJobRow>): NewJobRow {
  nextId++;
  return {
    source: "test",
    externalId: String(nextId),
    url: `https://example.com/${nextId}`,
    title: "Developer",
    company: "Acme",
    description: "",
    publishedAt: daysAgo(1),
    contentHash: String(nextId),
    firstSeenAt: NOW,
    lastSeenAt: NOW,
    updatedAt: NOW,
    ...overrides,
  };
}

beforeEach(async () => {
  dir = mkdtempSync(path.join(tmpdir(), "radar-search-"));
  db = createDb(`file:${path.join(dir, "test.db")}`);
  await migrate(db, { migrationsFolder: "./drizzle" });
  await db.insert(jobs).values([
    row({
      title: "Desarrollador Frontend Junior",
      company: "Acme México",
      seniority: "junior",
      acceptsMexico: "yes",
      technologies: ["React", "TypeScript"],
      salaryUsdMonthlyMin: 1200,
      salaryUsdMonthlyMax: 1800,
      timezoneMin: -8,
      timezoneMax: -3,
    }),
    row({
      title: "Senior Backend Engineer",
      seniority: "senior",
      acceptsMexico: "no",
      technologies: ["Node.js"],
      description: "We use React on the frontend.",
      salaryUsdMonthlyMin: 8000,
      timezoneMin: 1,
      timezoneMax: 2,
      publishedAt: daysAgo(20),
    }),
    row({ title: "Python Developer", seniority: "mid", acceptsMexico: "unknown", technologies: ["Python"] }),
  ]);
});

afterEach(() => {
  db.$client.close();
  rmSync(dir, { recursive: true, force: true });
});

const titles = async (filters: Parameters<typeof searchJobs>[1]) =>
  (await searchJobs(db, filters, NOW)).jobs.map((job) => job.title);

describe("searchJobs", () => {
  it("lists newest first without a query", async () => {
    expect(await titles({})).toEqual([
      "Desarrollador Frontend Junior",
      "Python Developer",
      "Senior Backend Engineer",
    ]);
  });

  it("ranks title hits above description hits", async () => {
    expect(await titles({ q: "react" })).toEqual([
      "Desarrollador Frontend Junior",
      "Senior Backend Engineer",
    ]);
  });

  it("matches without accents and with Spanish word endings", async () => {
    expect(await titles({ q: "mexico" })).toEqual(["Desarrollador Frontend Junior"]);
    expect(await titles({ q: "desarrolladora" })).toEqual(["Desarrollador Frontend Junior"]);
  });

  it("keeps the search index in sync on update", async () => {
    await db.update(jobs).set({ title: "Kotlin Engineer" }).where(eq(jobs.title, "Python Developer"));
    expect(await titles({ q: "kotlin" })).toEqual(["Kotlin Engineer"]);
    // The old title is gone from the index ("Python" still matches via technologies).
    expect(await titles({ q: "developer" })).toEqual([]);
  });

  it.each([
    [{ nivel: "senior" }, ["Senior Backend Engineer"]],
    [{ mexico: "si" }, ["Desarrollador Frontend Junior"]],
    [{ mexico: "probable" }, ["Desarrollador Frontend Junior", "Python Developer"]],
    [{ tech: "nodejs" }, ["Senior Backend Engineer"]],
    [{ sueldo: 1500 }, ["Desarrollador Frontend Junior", "Senior Backend Engineer"]],
    [{ zona: -6 }, ["Desarrollador Frontend Junior", "Python Developer"]],
    [{ dias: 7 }, ["Desarrollador Frontend Junior", "Python Developer"]],
    [{ q: "developer", nivel: "mid" }, ["Python Developer"]],
  ] as const)("filters %j", async (filters, expected) => {
    expect(await titles(filters)).toEqual(expected);
  });

  it("hides duplicates and paginates", async () => {
    const [original] = await db.select().from(jobs).limit(1);
    await db.insert(jobs).values(row({ title: "Copy", canonicalJobId: original.id }));
    const result = await searchJobs(db, { pagina: 1 }, NOW);
    expect(result).toMatchObject({ total: 3, page: 1, pageCount: 1 });
  });

  it("lists popular technologies", async () => {
    expect((await popularTechnologies(db)).map((t) => t.name)).toEqual([
      "Node.js",
      "Python",
      "React",
      "TypeScript",
    ]);
  });
});
