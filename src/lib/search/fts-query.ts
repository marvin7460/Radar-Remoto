import { stripAccents } from "@/lib/normalize/text";

// Longest first. Only applied to long words, and never below 5 letters.
const SUFFIXES = [
  "aciones",
  "adoras",
  "adores",
  "acion",
  "adora",
  "ador",
  "mente",
  "ers",
  "ing",
  "er",
  "as",
  "os",
  "es",
  "a",
  "o",
  "s",
];
const MIN_STEM = 5;
const MAX_TERMS = 8;

/**
 * SQLite FTS5 has no Spanish stemmer, so we trim common endings and search by
 * prefix: "desarrolladora" → "desarroll*" also finds "desarrollador" and
 * "desarrollo"; "developers" → "develop*".
 */
export function lightStem(word: string): string {
  if (word.length < 7) return word;
  for (const suffix of SUFFIXES) {
    if (word.endsWith(suffix) && word.length - suffix.length >= MIN_STEM)
      return word.slice(0, -suffix.length);
  }
  return word;
}

/**
 * Turns whatever the user typed into a safe FTS5 query. Every term is
 * quoted (so FTS5 operators and quotes in the input can't break or inject
 * into the query), prefix-matched, and ANDed:
 *   'React "senior" OR node.js' → '"react"* "senior"* "or"* "node"* "js"*'
 * Returns null when nothing searchable is left.
 */
export function buildFtsQuery(input: string | null | undefined): string | null {
  if (!input) return null;
  const terms = stripAccents(input.toLowerCase())
    .split(/[^a-z0-9]+/)
    .filter((term) => term.length > 0)
    .slice(0, MAX_TERMS)
    .map((term) => `"${lightStem(term)}"*`);
  return terms.length > 0 ? terms.join(" ") : null;
}
