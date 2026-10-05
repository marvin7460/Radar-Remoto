import type { Seniority } from "@/db/schema";
import { normalizeForMatch } from "./text";

const LEVELS: Array<[Seniority, RegExp]> = [
  [
    "junior",
    /\b(?:junior|jr|entry level|no experience required|sin experiencia|trainee|intern|internship|practicante|becari[oa]|graduate|new grad)\b/,
  ],
  ["mid", /\b(?:mid level|midweight|mid|semi ?senior|ssr|intermediate|semisenior)\b/],
  ["senior", /\b(?:senior|sr|expert|lead|principal|staff|manager|director|executive|head)\b/],
];

/**
 * Maps the seniority labels a source publishes ("Entry-level", "Semi Senior",
 * "Midweight") to our levels. A posting open to several levels counts as the
 * lowest one: "Entry-level, Mid-level" is good news for a junior.
 * The phase 3 classifier also reads the title and description.
 */
export function seniorityFromLabels(labels: readonly string[]): Seniority {
  const text = labels.map(normalizeForMatch).join(" | ");
  for (const [level, pattern] of LEVELS) if (pattern.test(text)) return level;
  return "unknown";
}
