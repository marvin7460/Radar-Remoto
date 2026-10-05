import type { NewJobRow } from "@/db/schema";
import type { SourceJob } from "@/lib/sources/types";
import { detectEligibility } from "./eligibility";
import { parseSalaryText, toMonthlyUsd, type Salary, type UsdRates } from "./salary";
import { seniorityFromLabels } from "./seniority";
import { isTechRole } from "./tech-role";
import { detectTechnologies } from "./technologies";
import { parseTimezoneText, rangeFromOffsets } from "./timezone";

/**
 * Bump when the normalization rules change: it is part of the content hash,
 * so the next ingestion re-normalizes every stored job with the new rules.
 */
export const NORMALIZER_VERSION = 2;

export type NormalizedJob = Omit<
  NewJobRow,
  "id" | "contentHash" | "firstSeenAt" | "lastSeenAt" | "updatedAt"
>;

export type NormalizeResult = { ok: true; job: NormalizedJob } | { ok: false; reason: "not_tech" };

function fallbackSeniority(job: SourceJob) {
  const fromLabels = seniorityFromLabels(job.seniorityLabels);
  return fromLabels !== "unknown" ? fromLabels : seniorityFromLabels([job.title]);
}

/**
 * Turns one posting in the common schema into a clean database row:
 * filters non-tech roles, answers "can Mexico apply?", parses salaries
 * into monthly USD, and canonicalizes technologies.
 */
export function normalizeJob(job: SourceJob, usdRates: UsdRates): NormalizeResult {
  if (!isTechRole(job.title, job.categories)) return { ok: false, reason: "not_tech" };

  const timezone =
    job.timezoneOffsets.length > 0
      ? rangeFromOffsets(job.timezoneOffsets)
      : parseTimezoneText(job.locations.join(" · "));
  const eligibility = detectEligibility(job.locations, timezone);

  const parsed = job.salary ?? parseSalaryText(job.salaryText);
  const salary: Salary = parsed
    ? { min: parsed.min, max: parsed.max, currency: parsed.currency, period: parsed.period }
    : { min: null, max: null, currency: null, period: null };

  return {
    ok: true,
    job: {
      source: job.source,
      externalId: job.externalId,
      url: job.url,
      title: job.title,
      company: job.company,
      // Labels from the source win; the title is the fallback ("Senior React Developer").
      // Phase 3 replaces this with the measured classifier.
      seniority: fallbackSeniority(job),
      seniorityRaw: job.seniorityLabels.join(", ") || null,
      locationRaw: job.locations.join(" · ") || null,
      allowedRegions: eligibility.regions,
      acceptsMexico: eligibility.acceptsMexico,
      eligibilityReason: eligibility.reason,
      timezoneMin: timezone?.min ?? null,
      timezoneMax: timezone?.max ?? null,
      salaryMin: salary.min,
      salaryMax: salary.max,
      salaryCurrency: salary.currency,
      salaryPeriod: salary.period,
      salaryUsdMonthlyMin: toMonthlyUsd(salary.min, salary.currency, salary.period, usdRates),
      salaryUsdMonthlyMax: toMonthlyUsd(salary.max, salary.currency, salary.period, usdRates),
      technologies: detectTechnologies(job.tags, job.title, job.description),
      description: job.description,
      publishedAt: job.publishedAt,
    },
  };
}
