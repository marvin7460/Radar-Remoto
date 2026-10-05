import type { AcceptsMexico, JobRow } from "@/db/schema";

const PERIOD_LABEL: Record<NonNullable<JobRow["salaryPeriod"]>, string> = {
  hour: "hora",
  day: "día",
  week: "semana",
  month: "mes",
  year: "año",
};

const amount = (value: number) => new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(value);

function range(min: number | null, max: number | null, prefix: string, suffix: string): string | null {
  if (min == null && max == null) return null;
  if (min != null && max != null && min !== max) return `${prefix}${amount(min)} – ${amount(max)}${suffix}`;
  if (min != null && max == null) return `Desde ${prefix}${amount(min)}${suffix}`;
  if (min == null && max != null) return `Hasta ${prefix}${amount(max)}${suffix}`;
  return `${prefix}${amount(min!)}${suffix}`;
}

/** As published: "USD 1,200 – 1,800 / mes", "Desde EUR 50,000 / año". */
export function formatSalary(
  job: Pick<JobRow, "salaryMin" | "salaryMax" | "salaryCurrency" | "salaryPeriod">,
): string | null {
  const prefix = job.salaryCurrency ? `${job.salaryCurrency} ` : "";
  const suffix = job.salaryPeriod ? ` / ${PERIOD_LABEL[job.salaryPeriod]}` : "";
  return range(job.salaryMin, job.salaryMax, prefix, suffix);
}

/** Monthly equivalent in MXN, for comparing everything in one currency: "≈ MXN 21,800 – 32,700 al mes". */
export function formatMonthlyMxn(
  job: Pick<JobRow, "salaryUsdMonthlyMin" | "salaryUsdMonthlyMax">,
  usdToMxn: number | null,
): string | null {
  if (!usdToMxn) return null;
  const toMxn = (usd: number | null) => (usd == null ? null : Math.round((usd * usdToMxn) / 100) * 100);
  const text = range(toMxn(job.salaryUsdMonthlyMin), toMxn(job.salaryUsdMonthlyMax), "MXN ", " al mes");
  return text && `≈ ${text}`;
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

export const ACCEPTS_MEXICO_LABEL: Record<AcceptsMexico, string> = {
  yes: "Acepta México",
  no: "No acepta México",
  unknown: "¿México? No está claro",
};
