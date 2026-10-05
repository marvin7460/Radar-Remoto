import { normalizeForMatch } from "@/lib/normalize/text";

/**
 * Trigrams exactly like PostgreSQL's pg_trgm: lowercase alphanumeric words,
 * each padded with two spaces in front and one behind.
 *   "Dev" → {"  d", " de", "dev", "ev "}
 */
export function trigrams(text: string): Set<string> {
  const result = new Set<string>();
  for (const word of normalizeForMatch(text).split(" ").filter(Boolean)) {
    const padded = `  ${word} `;
    for (let i = 0; i + 3 <= padded.length; i++) result.add(padded.slice(i, i + 3));
  }
  return result;
}

/** pg_trgm's similarity(): shared trigrams / distinct trigrams in either string (0..1). */
export function similarity(a: string, b: string): number {
  const left = trigrams(a);
  const right = trigrams(b);
  if (left.size === 0 || right.size === 0) return 0;
  let shared = 0;
  for (const trigram of left) if (right.has(trigram)) shared++;
  return shared / (left.size + right.size - shared);
}

const LEGAL_SUFFIXES =
  /\b(?:s a de c v|sa de cv|s de r l|s de rl|de c v|inc|llc|ltd|limited|corp|corporation|co|company|gmbh|ag|s a|sa|sas|sl|srl|spa|bv|plc|pty|oy|ab)\b/g;

/** "Acme Labs, Inc." and "ACME LABS" both become "acme labs". */
export function companyKey(name: string): string {
  return normalizeForMatch(name).replace(LEGAL_SUFFIXES, " ").replace(/\s+/g, " ").trim();
}

// Words that say nothing about *which* job it is.
const TITLE_NOISE =
  /\b(?:remote|remoto|100|full time|tiempo completo|contract|contractor|freelance|latam|latin america|worldwide|anywhere|hiring|urgent|m f d|f m d|w m d|h m)\b/g;

export function titleKey(title: string): string {
  return normalizeForMatch(title).replace(TITLE_NOISE, " ").replace(/\s+/g, " ").trim();
}

/** Seniority written in the title, to keep "Junior X" and "Senior X" apart. */
export function titleLevel(title: string): "junior" | "mid" | "senior" | null {
  const text = normalizeForMatch(title);
  if (/\b(?:junior|jr|trainee|intern|internship|entry level|practicante|graduate)\b/.test(text))
    return "junior";
  if (/\b(?:semi senior|semisenior|ssr|mid level|mid)\b/.test(text)) return "mid";
  if (/\b(?:senior|sr|lead|principal|staff|head)\b/.test(text)) return "senior";
  return null;
}
