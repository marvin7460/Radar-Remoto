import { eq } from "drizzle-orm";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { Db } from "@/db/client";
import { alertDeliveries, jobs, savedSearches, users, type NewJobRow } from "@/db/schema";
import { deactivateSavedSearch, runDigest } from "@/lib/alerts/digest";
import { createSavedSearch } from "@/lib/alerts/saved-searches";
import { consumeLoginToken, requestLoginLink, userForSession } from "@/lib/auth/magic-link";
import type { Email, Sender } from "@/lib/email/send";
import { createTestDb } from "./test-db";

let db: Db;
let cleanup: () => void;
let outbox: Email[];
const capture: Sender = async (email) => {
  outbox.push(email);
};
const failing: Sender = async () => {
  throw new Error("Resend down");
};

beforeEach(async () => {
  ({ db, cleanup } = await createTestDb());
  outbox = [];
});
afterEach(() => cleanup());

const NOW = new Date("2026-10-05T15:00:00Z");
const minutes = (n: number) => new Date(NOW.getTime() + n * 60_000);
const tokenFrom = (email: Email) => /token=([\w-]+)/.exec(email.text)![1];

describe("magic link", () => {
  it("signs in once with a valid link, creating the user", async () => {
    await requestLoginLink(db, capture, { email: " Ana@Example.com ", next: "/alertas/nueva?q=react" }, NOW);
    expect(outbox).toHaveLength(1);
    expect(outbox[0].to).toBe("ana@example.com");

    const token = tokenFrom(outbox[0]);
    const session = await consumeLoginToken(db, token, minutes(5));
    expect(session).toMatchObject({ next: "/alertas/nueva?q=react" });
    expect(await userForSession(db, session!.sessionId, minutes(6))).toMatchObject({
      email: "ana@example.com",
    });

    // Single use.
    expect(await consumeLoginToken(db, token, minutes(6))).toBeNull();
  });

  it("rejects expired and unknown tokens", async () => {
    await requestLoginLink(db, capture, { email: "ana@example.com" }, NOW);
    expect(await consumeLoginToken(db, tokenFrom(outbox[0]), minutes(16))).toBeNull();
    expect(await consumeLoginToken(db, "made-up-token", NOW)).toBeNull();
  });

  it("drops unsafe redirects and rate-limits links per email", async () => {
    for (let i = 0; i < 5; i++) {
      await requestLoginLink(db, capture, { email: "ana@example.com", next: "https://evil.com" }, minutes(i));
    }
    expect(outbox).toHaveLength(3);
    const session = await consumeLoginToken(db, tokenFrom(outbox[0]), minutes(5));
    expect(session?.next).toBeNull();
  });

  it("reuses the same user on later sign-ins", async () => {
    await requestLoginLink(db, capture, { email: "ana@example.com" }, NOW);
    await consumeLoginToken(db, tokenFrom(outbox[0]), NOW);
    await requestLoginLink(db, capture, { email: "ana@example.com" }, minutes(30));
    await consumeLoginToken(db, tokenFrom(outbox[1]), minutes(30));
    expect(await db.select().from(users)).toHaveLength(1);
  });
});

describe("daily digest", () => {
  let userId: number;
  let nextId = 0;
  const job = (overrides: Partial<NewJobRow>): NewJobRow => {
    nextId++;
    return {
      source: "getonbrd",
      externalId: `job-${nextId}`,
      url: `https://example.com/${nextId}`,
      title: "React Developer",
      company: "Acme",
      seniority: "junior",
      acceptsMexico: "yes",
      technologies: ["React"],
      description: "",
      publishedAt: NOW,
      contentHash: String(nextId),
      firstSeenAt: NOW,
      lastSeenAt: NOW,
      updatedAt: NOW,
      ...overrides,
    };
  };

  beforeEach(async () => {
    [{ id: userId }] = await db
      .insert(users)
      .values({ email: "ana@example.com", createdAt: NOW })
      .returning();
    await createSavedSearch(db, userId, { query: "?q=react&nivel=junior" }, minutes(-60));
  });

  it("sends new matching jobs once, never repeating them", async () => {
    await db
      .insert(jobs)
      .values([
        job({ title: "React Developer Jr" }),
        job({ title: "Senior React Developer", seniority: "senior" }),
        job({ title: "Python Developer", technologies: ["Python"] }),
      ]);

    expect(await runDigest(db, capture, minutes(60))).toMatchObject({ emailsSent: 1, jobsSent: 1 });
    expect(outbox[0].subject).toBe("1 vacante nueva para ti — Radar Remoto");
    expect(outbox[0].text).toContain("React Developer Jr");

    // Same day, nothing new: no second email.
    expect(await runDigest(db, capture, minutes(90))).toMatchObject({ emailsSent: 0 });

    // A new job later only brings that job.
    await db.insert(jobs).values(job({ title: "React Native Junior", firstSeenAt: minutes(120) }));
    await runDigest(db, capture, minutes(24 * 60));
    expect(outbox).toHaveLength(2);
    expect(outbox[1].text).toContain("React Native Junior");
    expect(outbox[1].text).not.toContain("React Developer Jr");
  });

  it("never emails Remotive jobs (their terms forbid it)", async () => {
    await db.insert(jobs).values(job({ source: "remotive", title: "React Developer Jr" }));
    expect(await runDigest(db, capture, minutes(60))).toMatchObject({ emailsSent: 0 });
  });

  it("retries tomorrow when sending fails", async () => {
    await db.insert(jobs).values(job({ title: "React Developer Jr" }));
    expect(await runDigest(db, failing, minutes(60))).toMatchObject({ emailsSent: 0, failed: 1 });
    expect(await db.select().from(alertDeliveries)).toHaveLength(0);

    expect(await runDigest(db, capture, minutes(24 * 60))).toMatchObject({ emailsSent: 1 });
  });

  it("stops after unsubscribing", async () => {
    await db.insert(jobs).values(job({ title: "React Developer Jr" }));
    const [search] = await db.select().from(savedSearches).where(eq(savedSearches.userId, userId));
    await deactivateSavedSearch(db, search.id);
    expect(await runDigest(db, capture, minutes(60))).toMatchObject({ users: 0, emailsSent: 0 });
  });
});
