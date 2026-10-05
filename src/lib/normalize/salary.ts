import type { SalaryPeriod } from "@/db/schema";

export interface Salary {
  min: number | null;
  max: number | null;
  currency: string | null;
  period: SalaryPeriod | null;
}

export interface ParsedSalary extends Salary {
  /** True when the period wasn't written and we guessed it from the amount. */
  periodInferred: boolean;
}

// Order matters: specific markers ("US$", "MX$") before the bare "$".
const CURRENCIES: Array<[RegExp, string]> = [
  [/\bus\s?\$|\busd\b|\bus dollars?\b|d[oó]lares?/i, "USD"],
  [/\bmx\s?\$|\bmxn\b|pesos? mexicanos?/i, "MXN"],
  [/\br\$|\bbrl\b|\breais\b/i, "BRL"],
  [/\bca?\$|\bcad\b/i, "CAD"],
  [/\bau?\$|\baud\b/i, "AUD"],
  [/€|\beur\b|\beuros?\b/i, "EUR"],
  [/£|\bgbp\b/i, "GBP"],
  [/\bclp\b/i, "CLP"],
  [/\bcop\b/i, "COP"],
  [/\bars\b/i, "ARS"],
  [/\bpen\b|\bsoles\b/i, "PEN"],
  [/\binr\b|₹/i, "INR"],
  [/\bchf\b/i, "CHF"],
  // A bare "$" on a remote job board almost always means USD.
  [/\$/, "USD"],
];

const PERIODS: Array<[RegExp, SalaryPeriod]> = [
  [/\/\s*(?:h|hr|hour|hora)\b|\bper hour\b|\bhourly\b|\ban hour\b|\bpor hora\b|\bla hora\b/i, "hour"],
  [/\/\s*(?:d|day|d[ií]a)\b|\bper day\b|\bdaily\b|\bpor d[ií]a\b|\bal d[ií]a\b/i, "day"],
  [/\/\s*(?:w|wk|week|semana)\b|\bper week\b|\bweekly\b|\bsemanal(?:es)?\b|\bpor semana\b/i, "week"],
  [
    /\/\s*(?:m|mo|mth|month|mes)\b|\bper month\b|\bmonthly\b|\ba month\b|\bmensual(?:es)?\b|\bpor mes\b|\bal mes\b/i,
    "month",
  ],
  [
    /\/\s*(?:y|yr|year|a[nñ]o)\b|\bper (?:year|annum)\b|\b(?:yearly|annual(?:ly)?|annum)\b|\bp\.\s?a\.?|\banual(?:es)?\b|\b(?:al|por) a[nñ]o\b/i,
    "year",
  ],
];

/** Period labels used by APIs that publish structured salaries. */
const PERIOD_LABELS: Record<string, SalaryPeriod> = {
  hour: "hour",
  hourly: "hour",
  hr: "hour",
  day: "day",
  daily: "day",
  week: "week",
  weekly: "week",
  month: "month",
  monthly: "month",
  year: "year",
  yearly: "year",
  annual: "year",
  annually: "year",
};

export function parsePeriodLabel(label: string | null | undefined): SalaryPeriod | null {
  return label ? (PERIOD_LABELS[label.trim().toLowerCase()] ?? null) : null;
}

/** Rough USD value of one unit, used ONLY to guess a missing period from the amount's size. */
const ROUGH_USD_VALUE: Record<string, number> = {
  USD: 1,
  EUR: 1.1,
  GBP: 1.3,
  CHF: 1.1,
  CAD: 0.72,
  AUD: 0.65,
  MXN: 0.055,
  BRL: 0.19,
  PEN: 0.27,
  INR: 0.012,
  CLP: 0.0011,
  ARS: 0.001,
  COP: 0.00025,
};

/**
 * Parses "1,500", "1.500", "70.5", "35,3": a separator followed by exactly
 * three digits is a thousands separator, anything else is a decimal point.
 */
function parseNumber(raw: string): number {
  const lastDot = raw.lastIndexOf(".");
  const lastComma = raw.lastIndexOf(",");
  if (lastDot !== -1 && lastComma !== -1) {
    const decimal = lastDot > lastComma ? "." : ",";
    const thousands = decimal === "." ? "," : ".";
    return Number(raw.split(thousands).join("").replace(decimal, "."));
  }
  const separator = lastDot !== -1 ? "." : lastComma !== -1 ? "," : null;
  if (!separator) return Number(raw);
  const groups = raw.split(separator);
  const isThousands = groups.length > 2 || groups.slice(1).every((group) => group.length === 3);
  return Number(isThousands ? groups.join("") : groups.join("."));
}

const AMOUNT = /(\d+(?:[.,]\d+)*)\s*(k|mil)?(?![a-z0-9])/gi;
const ONLY_MAX = /\b(?:up to|upto|max(?:imum)?|hasta|até)\b/i;
const ONLY_MIN = /\b(?:from|starting(?: at)?|min(?:imum)?|desde|a partir de)\b|\d\s*k?\s*\+/i;

/**
 * Turns free-text salaries into numbers:
 *   "$70k-$90k"      → 70000–90000 USD / year (period inferred)
 *   "USD 1,500/mes"  → 1500 USD / month
 *   "$35,3k- $52k"   → 35300–52000 USD / year
 * Returns null when there is no usable amount.
 */
export function parseSalaryText(text: string | null | undefined): ParsedSalary | null {
  if (!text) return null;
  const clean = text
    .replace(/[–—−]/g, "-")
    .replace(/401\s*\(?k\)?/gi, " ") // the US retirement plan, not an amount
    .replace(/\d+(?:[.,]\d+)?\s*%/g, " "); // percentages (equity, bonus)

  const amounts = [...clean.matchAll(AMOUNT)]
    .map((match) => ({ value: parseNumber(match[1]) * (match[2] ? 1000 : 1), hasK: Boolean(match[2]) }))
    .filter((amount) => Number.isFinite(amount.value) && amount.value > 0)
    .slice(0, 2);
  if (amounts.length === 0) return null;

  // "70-90k": the k on the upper bound also applies to the lower one.
  if (amounts.length === 2 && !amounts[0].hasK && amounts[1].hasK && amounts[0].value < 1000) {
    amounts[0].value *= 1000;
  }

  let min: number | null;
  let max: number | null;
  if (amounts.length === 2) {
    [min, max] = [amounts[0].value, amounts[1].value].sort((a, b) => a - b);
  } else if (ONLY_MAX.test(clean)) {
    [min, max] = [null, amounts[0].value];
  } else if (ONLY_MIN.test(clean)) {
    [min, max] = [amounts[0].value, null];
  } else {
    min = max = amounts[0].value;
  }

  const currency = CURRENCIES.find(([pattern]) => pattern.test(clean))?.[1] ?? null;
  const statedPeriod = PERIODS.find(([pattern]) => pattern.test(clean))?.[1] ?? null;
  const period = statedPeriod ?? inferPeriod((max ?? min)!, currency);

  return { min, max, currency, period, periodInferred: statedPeriod === null };
}

/** Big numbers are yearly, mid-sized ones monthly, small ones hourly. */
function inferPeriod(amount: number, currency: string | null): SalaryPeriod {
  const usd = amount * (ROUGH_USD_VALUE[currency ?? "USD"] ?? 1);
  if (usd >= 15_000) return "year";
  if (usd >= 400) return "month";
  return "hour";
}

/** Full-time equivalents: 40 h/week, 52 weeks/year. */
const TO_MONTHLY: Record<SalaryPeriod, number> = {
  hour: (40 * 52) / 12,
  day: (5 * 52) / 12,
  week: 52 / 12,
  month: 1,
  year: 1 / 12,
};

/** `usdRates[X]` = how many X one USD buys (Frankfurter's format with base USD). */
export type UsdRates = Readonly<Record<string, number>>;

export function toMonthlyUsd(
  amount: number | null,
  currency: string | null,
  period: SalaryPeriod | null,
  usdRates: UsdRates,
): number | null {
  if (amount === null || currency === null || period === null) return null;
  const rate = currency === "USD" ? 1 : usdRates[currency];
  if (!rate) return null;
  return Math.round((amount * TO_MONTHLY[period]) / rate);
}
