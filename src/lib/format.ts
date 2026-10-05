import type { JobRow } from "@/db/schema";

const PERIOD_LABEL: Record<NonNullable<JobRow["salaryPeriod"]>, string> = {
  hour: "hora",
  month: "mes",
  year: "año",
};

/** "USD 1,200 – 1,800 / mes", "Desde USD 1,200 / mes" or null when unknown. */
export function formatSalary(
  job: Pick<JobRow, "salaryMin" | "salaryMax" | "salaryCurrency" | "salaryPeriod">,
): string | null {
  const { salaryMin: min, salaryMax: max, salaryCurrency: currency, salaryPeriod: period } = job;
  if (min == null && max == null) return null;

  const n = (value: number) => new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(value);
  const prefix = currency ? `${currency} ` : "";
  const suffix = period ? ` / ${PERIOD_LABEL[period]}` : "";

  if (min != null && max != null && min !== max) return `${prefix}${n(min)} – ${n(max)}${suffix}`;
  if (min != null && max == null) return `Desde ${prefix}${n(min)}${suffix}`;
  if (min == null && max != null) return `Hasta ${prefix}${n(max)}${suffix}`;
  return `${prefix}${n(min!)}${suffix}`;
}

const UNITS: Array<[Intl.RelativeTimeFormatUnit, number]> = [
  ["year", 365 * 24 * 3600],
  ["month", 30 * 24 * 3600],
  ["week", 7 * 24 * 3600],
  ["day", 24 * 3600],
  ["hour", 3600],
  ["minute", 60],
];

/** "hace 3 días", "ayer", "hace 2 horas". */
export function formatRelativeDate(date: Date, now: Date = new Date()): string {
  const seconds = Math.round((date.getTime() - now.getTime()) / 1000);
  const rtf = new Intl.RelativeTimeFormat("es", { numeric: "auto" });
  for (const [unit, size] of UNITS) {
    if (Math.abs(seconds) >= size) return rtf.format(Math.round(seconds / size), unit);
  }
  return "justo ahora";
}

export const SENIORITY_LABEL: Record<JobRow["seniority"], string> = {
  junior: "Junior",
  mid: "Semi senior",
  senior: "Senior",
  unknown: "Nivel no indicado",
};
