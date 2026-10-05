import { describe, expect, it } from "vitest";
import { normalizeJob } from "@/lib/normalize/normalize-job";
import { himalayasAdapter } from "@/lib/sources/himalayas/adapter";
import { jobicyAdapter } from "@/lib/sources/jobicy/adapter";
import { remoteokAdapter } from "@/lib/sources/remoteok/adapter";
import { remotiveAdapter } from "@/lib/sources/remotive/adapter";
import type { SourceAdapter, SourceJob } from "@/lib/sources/types";
import { weworkremotelyAdapter } from "@/lib/sources/weworkremotely/adapter";
import { loadFixtureText } from "../helpers";

const RATES = { MXN: 18.1498, EUR: 0.89254 };

function mapAll(adapter: SourceAdapter, file: string): SourceJob[] {
  return adapter
    .parsePage(loadFixtureText(file))
    .map((raw) => adapter.mapJob(raw))
    .filter((job): job is SourceJob => job !== null);
}
const byTitle = (jobs: SourceJob[], title: string) => jobs.find((job) => job.title.startsWith(title))!;

describe("himalayas adapter (real fixture)", () => {
  const jobs = mapAll(himalayasAdapter, "himalayas/search-entry-level.json");

  it("maps structured seniority, empty restrictions and time zones", () => {
    const job = byTitle(jobs, "Toast POS Specialist");
    expect(job).toMatchObject({
      company: "micro1",
      seniorityLabels: ["Entry-level", "Mid-level"],
      locations: ["Worldwide"],
      url: "https://himalayas.app/companies/micro1/jobs/toast-pos-specialist",
    });
    expect(job.timezoneOffsets.length).toBeGreaterThan(24);
  });

  it("filters out non-developer roles", () => {
    const result = normalizeJob(byTitle(jobs, "Hebrew Language Transcription Expert"), RATES);
    expect(result.ok).toBe(false);
  });
});

describe("remotive adapter (real fixture)", () => {
  const jobs = mapAll(remotiveAdapter, "remotive/software-dev.json");

  it("keeps the free-text salary and location for the normalizer", () => {
    const job = byTitle(jobs, "Frontend Web Application Developer");
    expect(job).toMatchObject({
      company: "KoboToolbox",
      locations: ["USA, Canada, Argentina, Mexico, Peru"],
    });

    const result = normalizeJob(job, RATES);
    expect(result.ok && result.job).toMatchObject({
      acceptsMexico: "yes",
      eligibilityReason: "Menciona México",
    });
  });

  it("reads timestamps without a zone as UTC", () => {
    expect(byTitle(jobs, "Freelance Copywriter").publishedAt.toISOString()).toBe("2026-10-02T20:01:00.000Z");
  });
});

describe("remoteok adapter (real fixture)", () => {
  const jobs = mapAll(remoteokAdapter, "remoteok/api.json");

  it("skips the legal notice and repairs double-encoded text", () => {
    expect(jobs).toHaveLength(25);
    expect(jobs.some((job) => job.title.startsWith("Mecánico Automotriz"))).toBe(true);
    expect(jobs.every((job) => !/Ã[\u0080-¿]/.test(job.title))).toBe(true);
  });

  it("normalizes the host of links and treats salary 0 as missing", () => {
    const job = jobs[0];
    expect(job.url.startsWith("https://remoteok.com/")).toBe(true);
    expect(job.salary).toBeNull();
  });
});

describe("jobicy adapter (real fixture)", () => {
  const jobs = mapAll(jobicyAdapter, "jobicy/engineering.json");

  it("maps structured salary and geography", () => {
    const job = byTitle(jobs, "1146 - Fullstack Engineer");
    expect(job).toMatchObject({
      company: "GoFasti",
      locations: ["LATAM"],
      salary: { min: 3000, max: 5000, currency: "USD", period: "month" },
    });
    const result = normalizeJob(job, RATES);
    expect(result.ok && result.job).toMatchObject({ acceptsMexico: "yes", salaryUsdMonthlyMax: 5000 });
  });
});

describe("weworkremotely adapter (real fixture)", () => {
  const jobs = mapAll(weworkremotelyAdapter, "weworkremotely/front-end.xml");

  it("splits 'Company: Title' and reads region and skills", () => {
    const job = byTitle(jobs, "Fullstack Web3 Engineer");
    expect(job).toMatchObject({
      company: "bondex",
      locations: ["Remote - Americas"],
      externalId: "bondex-fullstack-web3-engineer-solidity-rust-typescript",
    });
    expect(job.publishedAt.toISOString()).toBe("2026-09-29T19:13:52.000Z");
  });
});
