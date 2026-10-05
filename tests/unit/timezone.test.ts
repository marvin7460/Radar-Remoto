import { describe, expect, it } from "vitest";
import { formatTimezoneRange, parseTimezoneText, rangeFromOffsets } from "@/lib/normalize/timezone";

describe("parseTimezoneText", () => {
  it.each([
    ["UTC-3 to UTC-8", -8, -3],
    ["Between GMT-5 and GMT+1", -5, 1],
    ["GMT-03:00", -3, -3],
    ["UTC−5 (unicode minus)", -5, -5],
    ["UTC+5:30", 5.5, 5.5],
    ["EST ± 2 hours", -7, -3],
    ["CET +/- 3h", -2, 4],
    ["PST to EST", -8, -5],
    ["Must work US time zones", -8, -5],
    ["Overlap with European hours", 0, 3],
    ["Pacific Time", -8, -8],
    ["4 hours overlap with PT time", -8, -8],
  ])("%s → %d..%d", (text, min, max) => {
    expect(parseTimezoneText(text)).toEqual({ min, max });
  });

  it("returns null when time zones aren't mentioned", () => {
    expect(parseTimezoneText("Worldwide")).toBeNull();
    expect(parseTimezoneText("Full-time, PT or FT")).toBeNull();
    expect(parseTimezoneText("Este puesto es remoto")).toBeNull();
    expect(parseTimezoneText(null)).toBeNull();
  });
});

describe("rangeFromOffsets", () => {
  it("drops Himalayas' stray +14 on US-only lists", () => {
    expect(rangeFromOffsets([-10, -9, -8, -7, -6, -5, 14])).toEqual({ min: -10, max: -5 });
  });

  it("treats an almost complete list as no restriction", () => {
    const all = [
      -11, -10, -9.5, -9, -8, -7, -6, -5, -4, -3.5, -3, -2, -1, 0, 1, 2, 3, 3.5, 4, 4.5, 5, 5.5, 6, 7, 8, 9,
      10, 11, 12, 14,
    ];
    expect(rangeFromOffsets(all)).toBeNull();
    expect(rangeFromOffsets([])).toBeNull();
  });
});

describe("formatTimezoneRange", () => {
  it("reads naturally in Spanish", () => {
    expect(formatTimezoneRange({ min: -8, max: -3 })).toBe("UTC-8 a UTC-3");
    expect(formatTimezoneRange({ min: 5.5, max: 5.5 })).toBe("UTC+5:30");
    expect(formatTimezoneRange({ min: 0, max: 2 })).toBe("UTC a UTC+2");
  });
});
