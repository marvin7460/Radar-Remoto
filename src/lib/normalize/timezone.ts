/** A span of accepted UTC offsets, in hours (UTC-6 → -6). */
export interface TimezoneRange {
  min: number;
  max: number;
}

/** Mexico: UTC-8 (Baja California) to UTC-5 (Quintana Roo); most people live in UTC-6. */
export const MEXICO_TIMEZONES: TimezoneRange = { min: -8, max: -5 };

export function overlaps(a: TimezoneRange, b: TimezoneRange): boolean {
  return a.min <= b.max && a.max >= b.min;
}

/** Standard-time offsets. Uppercase only: "est" is also a word in Spanish. */
const ABBREVIATIONS: Record<string, number> = {
  HST: -10,
  AKST: -9,
  PST: -8,
  PDT: -7,
  MST: -7,
  MDT: -6,
  CST: -6,
  CDT: -5,
  EST: -5,
  EDT: -4,
  AST: -4,
  BRT: -3,
  ART: -3,
  CLT: -4,
  COT: -5,
  PET: -5,
  UYT: -3,
  GMT: 0,
  UTC: 0,
  WET: 0,
  BST: 1,
  WEST: 1,
  CET: 1,
  CEST: 2,
  EET: 2,
  EEST: 3,
  MSK: 3,
  IST: 5.5,
  SGT: 8,
  HKT: 8,
  JST: 9,
  KST: 9,
  AEST: 10,
  AEDT: 11,
  NZST: 12,
};
// Two-letter generic zones ("PT") collide with "part-time", so they need context.
const GENERIC_ZONES: Record<string, number> = { PT: -8, MT: -7, CT: -6, ET: -5 };

const GROUPS: Array<[RegExp, TimezoneRange]> = [
  [
    /\b(?:us|u\.s\.|usa|american|north american)\s+(?:time\s?zones?|hours|business hours)\b/i,
    { min: -8, max: -5 },
  ],
  [/\b(?:americas|latam|latin american?)\s+(?:time\s?zones?|hours)\b/i, { min: -8, max: -3 }],
  [/\b(?:european|europe|eu|emea)\s+(?:time\s?zones?|hours)\b/i, { min: 0, max: 3 }],
  [/\bpacific time\b/i, { min: -8, max: -8 }],
  [/\bmountain time\b/i, { min: -7, max: -7 }],
  [/\bcentral time\b/i, { min: -6, max: -6 }],
  [/\beastern time\b/i, { min: -5, max: -5 }],
];

const OFFSET = /\b(?:UTC|GMT)\s*([+\-−–])\s*(\d{1,2})(?::?([0-5]\d))?/gi;
const TOLERANCE = /(?:±|\+\s*\/\s*-|\+-)\s*(\d{1,2})\s*(?:h\b|hrs?\b|hours?\b|horas?\b)?/i;

/**
 * Extracts the accepted UTC offsets from free text:
 *   "UTC-3 to UTC-8"   → -8..-3
 *   "EST ± 2 hours"    → -7..-3
 *   "US time zones"    → -8..-5
 * Returns null when the text says nothing about time zones.
 */
export function parseTimezoneText(text: string | null | undefined): TimezoneRange | null {
  if (!text) return null;
  const offsets: number[] = [];

  let rest = text.replace(OFFSET, (_match, sign: string, hours: string, minutes?: string) => {
    const value = Number(hours) + (minutes ? Number(minutes) / 60 : 0);
    offsets.push(sign === "+" ? value : -value);
    return " ";
  });
  for (const [pattern, range] of GROUPS) {
    if (pattern.test(rest)) offsets.push(range.min, range.max);
    rest = rest.replace(pattern, " ");
  }
  for (const [abbreviation, offset] of Object.entries(ABBREVIATIONS)) {
    if (new RegExp(`\\b${abbreviation}\\b`).test(rest)) offsets.push(offset);
  }
  for (const [abbreviation, offset] of Object.entries(GENERIC_ZONES)) {
    if (new RegExp(`\\b${abbreviation}\\b\\s*(?:time|hours|tz|zone|±|\\+)`).test(rest)) offsets.push(offset);
  }

  const valid = offsets.filter((offset) => offset >= -12 && offset <= 14);
  if (valid.length === 0) return null;

  const tolerance = Number(TOLERANCE.exec(text)?.[1] ?? 0);
  return { min: Math.min(...valid) - tolerance, max: Math.max(...valid) + tolerance };
}

/**
 * Builds a range from a list of offsets published as data (Himalayas).
 * An (almost) complete list means "any time zone", which is no restriction.
 * Offsets beyond UTC+12 are dropped: Himalayas appends +14 to US-only lists.
 */
export function rangeFromOffsets(offsets: readonly number[]): TimezoneRange | null {
  const usable = offsets.filter((offset) => offset >= -12 && offset <= 12);
  if (usable.length === 0 || new Set(offsets).size >= 24) return null;
  return { min: Math.min(...usable), max: Math.max(...usable) };
}

export function formatTimezoneRange({ min, max }: TimezoneRange): string {
  const label = (offset: number) => {
    if (offset === 0) return "UTC";
    const hours = Math.trunc(Math.abs(offset));
    const minutes = Math.round((Math.abs(offset) - hours) * 60);
    return `UTC${offset < 0 ? "-" : "+"}${hours}${minutes ? `:${String(minutes).padStart(2, "0")}` : ""}`;
  };
  return min === max ? label(min) : `${label(min)} a ${label(max)}`;
}
