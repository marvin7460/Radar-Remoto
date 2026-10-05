import { describe, expect, it } from "vitest";
import { detectEligibility } from "@/lib/normalize/eligibility";
import { parseTimezoneText } from "@/lib/normalize/timezone";

const check = (location: string, timezone: string | null = null) =>
  detectEligibility(location ? [location] : [], parseTimezoneText(timezone ?? location));

describe("detectEligibility: can someone in Mexico apply?", () => {
  // Real location strings from the Remotive, Jobicy, WWR and Remote OK fixtures.
  it.each([
    "Worldwide",
    "Anywhere in the World",
    "Northern America, LATAM, Europe, APAC",
    "Americas, Europe, Israel",
    "USA, Canada, Argentina, Mexico, Peru",
    "EMEA,  LATAM,  Canada,  USA",
    "Remote - Americas",
    "Mexico City, Mexico - Remote",
    "Latin America Only",
    "Latinoamérica",
    "Remoto desde cualquier parte de México",
  ])("yes: %s", (location) => {
    expect(check(location).acceptsMexico).toBe("yes");
  });

  it.each([
    "USA",
    "USA, Canada, USA timezones",
    "Europe, USA, Canada, APAC",
    "🇺🇸 United States of America",
    "Anywhere in the US",
    "US-only",
    "SIHO - Columbus, IN",
    "Germany",
    "EMEA",
    "Chile",
    "Northern America",
  ])("no: %s", (location) => {
    expect(check(location).acceptsMexico).toBe("no");
  });

  it.each(["", "Remote", "North America Only", "Redwood City"])("unknown: '%s'", (location) => {
    expect(check(location).acceptsMexico).toBe("unknown");
  });

  it("uses time zones when no place is given", () => {
    expect(check("", "UTC-3 to UTC-8")).toMatchObject({
      acceptsMexico: "yes",
      reason: "Pide horario UTC-8 a UTC-3, compatible con México",
    });
    expect(check("", "CET ± 2 hours")).toMatchObject({ acceptsMexico: "no" });
  });

  it("lets an explicit place beat the time zone", () => {
    expect(check("USA", "EST")).toMatchObject({ acceptsMexico: "no", reason: "Solo para: Estados Unidos" });
    expect(check("LATAM", "CET")).toMatchObject({ acceptsMexico: "yes", reason: "Abierta a Latinoamérica" });
  });

  it("does not read 'US time zones' as a US-only restriction", () => {
    expect(check("Remote, US time zones")).toMatchObject({ acceptsMexico: "yes", regions: [] });
  });

  it("returns region codes for filtering", () => {
    expect(check("Northern America, LATAM, Europe, APAC").regions).toEqual([
      "NORTHERN_AMERICA",
      "LATAM",
      "EUROPE",
      "APAC",
    ]);
  });
});
