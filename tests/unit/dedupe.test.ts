import { describe, expect, it } from "vitest";
import { findDuplicates, type DedupeCandidate } from "@/lib/dedupe/find-duplicates";
import { companyKey, similarity, titleLevel } from "@/lib/dedupe/similarity";

const day = (n: number) => new Date(Date.UTC(2026, 9, n));
let nextId = 1;
const job = (
  source: string,
  title: string,
  company: string,
  published = 1,
  seen = published,
): DedupeCandidate => ({
  id: nextId++,
  source,
  title,
  company,
  publishedAt: day(published),
  firstSeenAt: day(seen),
});

describe("similarity (pg_trgm-compatible)", () => {
  it("matches pg_trgm on known values", () => {
    // SELECT similarity('word', 'two words') → 0.36363637 in PostgreSQL.
    expect(similarity("word", "two words")).toBeCloseTo(0.363636, 5);
    expect(similarity("abc", "abc")).toBe(1);
    expect(similarity("abc", "xyz")).toBe(0);
  });

  it("normalizes company names", () => {
    expect(companyKey("Acme Labs, Inc.")).toBe(companyKey("ACME LABS"));
    expect(companyKey("Grupo Mariposa S.A. de C.V.")).toBe("grupo mariposa");
  });

  it("reads the level in titles", () => {
    expect(titleLevel("Sr. Backend Engineer")).toBe("senior");
    expect(titleLevel("Desarrollador Jr")).toBe("junior");
    expect(titleLevel("Backend Engineer")).toBeNull();
  });
});

describe("findDuplicates", () => {
  it("links the same opening across sources and keeps the first one seen", () => {
    const a = job("getonbrd", "Frontend Developer (React)", "Acme Labs", 1, 1);
    const b = job("remotive", "Front-end Developer - React - Remote", "Acme Labs Inc.", 2, 2);
    const c = job("remoteok", "Frontend Developer React", "ACME LABS", 2, 3);
    expect(findDuplicates([a, b, c])).toEqual(
      new Map([
        [b.id, a.id],
        [c.id, a.id],
      ]),
    );
  });

  it("does not merge different levels, companies, sources or far-apart dates", () => {
    const base = job("getonbrd", "Junior Backend Developer", "Acme");
    const jobs = [
      base,
      job("remotive", "Senior Backend Developer", "Acme"),
      job("remotive", "Junior Backend Developer", "Globex"),
      job("getonbrd", "Junior Backend Developer", "Acme"),
      job("himalayas", "Junior Backend Developer", "Acme", 30 + 15),
    ];
    expect(findDuplicates(jobs).size).toBe(0);
  });

  it("breaks ties with source priority", () => {
    const a = job("remoteok", "Data Engineer", "Initech", 1, 1);
    const b = job("getonbrd", "Data Engineer", "Initech", 1, 1);
    expect(findDuplicates([a, b], { sourcePriority: { getonbrd: 0, remoteok: 5 } })).toEqual(
      new Map([[a.id, b.id]]),
    );
  });
});
