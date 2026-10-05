import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { Db } from "@/db/client";
import { emailLog, ingestionRuns, jobs, savedSearches, users } from "@/db/schema";
import { recordClick } from "@/lib/metrics/clicks";
import { impactMetrics, sourceHealth } from "@/lib/metrics/status";
import { createTestDb } from "./test-db";

let db: Db;
let cleanup: () => void;
const NOW = new Date();

beforeEach(async () => {
  ({ db, cleanup } = await createTestDb());
  await db.insert(jobs).values({
    source: "getonbrd",
    externalId: "1",
    url: "https://www.getonbrd.com/jobs/1",
    title: "Dev",
    company: "Acme",
    publishedAt: NOW,
    contentHash: "x",
    firstSeenAt: NOW,
    lastSeenAt: NOW,
    updatedAt: NOW,
  });
});
afterEach(() => cleanup());

describe("recordClick", () => {
  it("returns the original URL and counts only known jobs", async () => {
    const [job] = await db.select().from(jobs);
    expect(await recordClick(db, job.id, "email")).toBe("https://www.getonbrd.com/jobs/1");
    expect(await recordClick(db, 9999, "web")).toBeNull();
    expect(await recordClick(db, Number.NaN, "web")).toBeNull();
    expect((await impactMetrics(db, NOW)).clicksLastMonth).toEqual({ web: 0, email: 1 });
  });
});

describe("impactMetrics and sourceHealth", () => {
  it("counts users with active alerts, sent digests and source runs", async () => {
    const [user] = await db.insert(users).values({ email: "a@b.co", createdAt: NOW }).returning();
    await db.insert(savedSearches).values([
      { userId: user.id, name: "a", query: "", createdAt: NOW },
      { userId: user.id, name: "b", query: "", createdAt: NOW },
    ]);
    await db.insert(emailLog).values([
      { kind: "digest", status: "sent", userId: user.id, sentAt: NOW },
      { kind: "login", status: "sent", userId: user.id, sentAt: NOW },
      { kind: "digest", status: "error", userId: user.id, sentAt: NOW },
    ]);
    await db.insert(ingestionRuns).values([
      {
        source: "getonbrd",
        status: "error",
        startedAt: new Date(NOW.getTime() - 60_000),
        errorMessage: "HTTP 503",
      },
      { source: "getonbrd", status: "success", startedAt: NOW, fetched: 40 },
      { source: "getonbrd", status: "skipped", startedAt: new Date(NOW.getTime() + 1000) },
    ]);

    expect(await impactMetrics(db, NOW)).toMatchObject({
      openJobs: 1,
      usersWithAlerts: 1,
      digestEmailsSent: 1,
    });
    const getonbrd = (await sourceHealth(db, NOW)).find((s) => s.source === "getonbrd")!;
    expect(getonbrd).toMatchObject({
      errorsLastWeek: 1,
      addedLastDay: 1,
      last: { status: "success", fetched: 40 },
    });
  });
});
