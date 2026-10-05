import { describe, expect, it } from "vitest";
import { formatMonthlyMxn, formatRelativeDate, formatSalary } from "@/lib/format";

const base = { salaryMin: null, salaryMax: null, salaryCurrency: null, salaryPeriod: null } as const;

describe("formatSalary", () => {
  it("formats a range", () => {
    expect(
      formatSalary({
        ...base,
        salaryMin: 1200,
        salaryMax: 1800,
        salaryCurrency: "USD",
        salaryPeriod: "month",
      }),
    ).toBe("USD 1,200 – 1,800 / mes");
  });

  it("formats open-ended ranges", () => {
    expect(formatSalary({ ...base, salaryMin: 1200, salaryCurrency: "USD", salaryPeriod: "month" })).toBe(
      "Desde USD 1,200 / mes",
    );
    expect(formatSalary({ ...base, salaryMax: 90000, salaryCurrency: "USD", salaryPeriod: "year" })).toBe(
      "Hasta USD 90,000 / año",
    );
  });

  it("returns null when there is no salary", () => {
    expect(formatSalary(base)).toBeNull();
  });
});

describe("formatRelativeDate", () => {
  const now = new Date("2026-10-05T12:00:00Z");

  it("speaks Spanish", () => {
    expect(formatRelativeDate(new Date("2026-10-04T12:00:00Z"), now)).toBe("ayer");
    expect(formatRelativeDate(new Date("2026-10-02T12:00:00Z"), now)).toBe("hace 3 días");
    expect(formatRelativeDate(new Date("2026-10-05T10:00:00Z"), now)).toBe("hace 2 horas");
  });
});

describe("formatMonthlyMxn", () => {
  it("converts the monthly USD equivalent with the latest rate", () => {
    expect(formatMonthlyMxn({ salaryUsdMonthlyMin: 1200, salaryUsdMonthlyMax: 1800 }, 18.1498)).toBe(
      "≈ MXN 21,800 – 32,700 al mes",
    );
    expect(formatMonthlyMxn({ salaryUsdMonthlyMin: 1200, salaryUsdMonthlyMax: 1800 }, null)).toBeNull();
  });
});
