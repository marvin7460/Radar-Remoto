import type { Seniority } from "@/db/schema";
import { normalizeForMatch, stripAccents } from "@/lib/normalize/text";

export interface SeniorityResult {
  level: Seniority;
  /** Short Spanish explanation of the rule that decided. */
  reason: string;
}

export interface SeniorityInput {
  title: string;
  /** Seniority as the source labels it ("Entry-level", "Semi Senior"). */
  labels: readonly string[];
  description: string;
}

const LEVEL_WORDS: Array<[Seniority, RegExp]> = [
  [
    "junior",
    /\b(?:junior|jr|entry level|no experience required|sin experiencia|trainee|intern|internship|practicante|becari[oa]|graduate|new grad|early career)\b/,
  ],
  ["mid", /\b(?:mid level|midweight|semi ?senior|ssr|intermediate|mid)\b/],
  [
    "senior",
    /\b(?:senior|sr|expert|lead|principal|staff|manager|director|executive|head|architect|arquitect[oa])\b/,
  ],
];

function levelIn(text: string): { level: Seniority; word: string } | null {
  const normalized = normalizeForMatch(text);
  for (const [level, pattern] of LEVEL_WORDS) {
    const match = pattern.exec(normalized);
    if (match) return { level, word: match[0] };
  }
  return null;
}

// "3+ years", "2-4 years", "0 a 2 años", "5 years of experience", "mínimo 3 años".
const YEARS = /(\d{1,2})\s*(?:\+|(?:-|–|to|a)\s*\d{1,2})?\s*\+?\s*(?:years?|yrs?|anos)\b/g;
const EXPERIENCE_NEARBY = /experien|exp\b|trabajando|working (?:with|as|in)|professional/;
const NO_EXPERIENCE =
  /\b(?:no (?:prior |previous )?experience (?:is )?(?:required|needed|necessary)|sin experiencia|recien egresad[oa]s?|new grads?|fresh graduates?|bootcamp graduates?|primer empleo|first job)\b/;

/** Minimum years of experience the description asks for, if it says so. */
export function requiredYears(description: string): number | null {
  // Keep "+" and "-" (normalizeForMatch would drop them), only fold case and accents.
  const text = stripAccents(description.slice(0, 20_000).toLowerCase());
  for (const match of text.matchAll(YEARS)) {
    const years = Number(match[1]);
    if (years > 15) continue;
    const start = match.index ?? 0;
    const around = text.slice(Math.max(0, start - 60), start + match[0].length + 80);
    if (EXPERIENCE_NEARBY.test(around)) return years;
  }
  return null;
}

/**
 * Rule-based, explainable seniority. Order of trust:
 *   1. the title ("Senior React Developer", "Desarrollador Jr")
 *   2. the source's own label ("Entry-level", "Semi Senior")
 *   3. years of experience in the description (≤2 junior, 3–4 mid, ≥5 senior)
 *   4. explicit "no experience required" phrasing
 * Measured against hand-labeled jobs with `npm run eval`.
 */
export function classifySeniority({ title, labels, description }: SeniorityInput): SeniorityResult {
  const fromTitle = levelIn(title);
  if (fromTitle) return { level: fromTitle.level, reason: `El título dice “${fromTitle.word}”` };

  const fromLabels = levelIn(labels.join(" | "));
  if (fromLabels)
    return { level: fromLabels.level, reason: `La fuente la marca como “${labels.join(", ")}”` };

  const years = requiredYears(description);
  if (years !== null) {
    const level: Seniority = years <= 2 ? "junior" : years <= 4 ? "mid" : "senior";
    return { level, reason: `Pide ${years}+ años de experiencia` };
  }

  if (NO_EXPERIENCE.test(normalizeForMatch(description))) {
    return { level: "junior", reason: "Dice que no se requiere experiencia" };
  }
  return { level: "unknown", reason: "No hay pistas de nivel" };
}
