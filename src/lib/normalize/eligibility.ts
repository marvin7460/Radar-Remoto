import { PLACES, type Place } from "./places";
import { stripAccents } from "./text";
import { formatTimezoneRange, MEXICO_TIMEZONES, overlaps, type TimezoneRange } from "./timezone";

import type { AcceptsMexico } from "@/db/schema";

export interface Eligibility {
  acceptsMexico: AcceptsMexico;
  /** Codes of the places we recognized, for filters ("LATAM", "US", …). */
  regions: string[];
  /** Short Spanish explanation shown next to the answer. */
  reason: string;
}

// Phrases that describe working hours, not where you must live ("US time zones").
const TIMEZONE_PHRASES =
  /\b(?:us|u\.s\.|usa|american|north american|european|europe|eu|emea|americas|latam)\s+(?:time\s?zones?|hours|business hours)\b|\b(?:UTC|GMT)\s*[+\-−–]\s*\d{1,2}(?::?\d{2})?/gi;
const SPLIT = /[,;/|·•\n]|\s+(?:or|and|y|o|&)\s+/i;

function placesIn(phrase: string): Place[] {
  const text = stripAccents(phrase);
  const found = PLACES.filter((place) => place.patterns.some((pattern) => pattern.test(text)));
  // "Anywhere in the US" means the US: a specific place beats a generic one.
  const specific = found.filter((place) => place.code !== "WORLDWIDE");
  return specific.length > 0 ? specific : found;
}

const labels = (places: Place[]) => [...new Set(places.map((p) => p.label))].slice(0, 3).join(", ");

/**
 * Answers "¿puede aplicar alguien desde México?" from what the posting says
 * about location and time zones. Explicitly open to Mexico (or LATAM, the
 * Americas, the world) wins; then explicit restrictions elsewhere; then time
 * zone compatibility; anything ambiguous stays "unknown" instead of guessing.
 */
export function detectEligibility(locations: readonly string[], timezone: TimezoneRange | null): Eligibility {
  const places = locations
    .flatMap((location) => location.replace(TIMEZONE_PHRASES, " ").split(SPLIT))
    .flatMap((phrase) => placesIn(phrase));
  const unique = [...new Map(places.map((place) => [place.code, place])).values()];
  const regions = unique.map((place) => place.code);

  const includes = unique.filter((p) => p.includesMexico === "yes");
  const maybes = unique.filter((p) => p.includesMexico === "maybe");
  const excludes = unique.filter((p) => p.includesMexico === "no");

  if (includes.length > 0) {
    const best = ["MX", "LATAM", "AMERICAS", "WORLDWIDE"].find((code) => regions.includes(code));
    const reasons: Record<string, string> = {
      MX: "Menciona México",
      LATAM: "Abierta a Latinoamérica",
      AMERICAS: "Abierta a todo el continente americano",
      WORLDWIDE: "Abierta a todo el mundo",
    };
    return { acceptsMexico: "yes", regions, reason: reasons[best!] };
  }
  if (excludes.length > 0 && maybes.length === 0) {
    return { acceptsMexico: "no", regions, reason: `Solo para: ${labels(excludes)}` };
  }
  if (timezone && !overlaps(timezone, MEXICO_TIMEZONES)) {
    return {
      acceptsMexico: "no",
      regions,
      reason: `Pide horario ${formatTimezoneRange(timezone)}, lejos de México`,
    };
  }
  if (maybes.length > 0) {
    return {
      acceptsMexico: "unknown",
      regions,
      reason: "Dice Norteamérica: no queda claro si incluye México",
    };
  }
  if (timezone) {
    return {
      acceptsMexico: "yes",
      regions,
      reason: `Pide horario ${formatTimezoneRange(timezone)}, compatible con México`,
    };
  }
  return { acceptsMexico: "unknown", regions, reason: "No dice desde dónde se puede trabajar" };
}
