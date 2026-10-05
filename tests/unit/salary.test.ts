import { describe, expect, it } from "vitest";
import { parsePeriodLabel, parseSalaryText, toMonthlyUsd } from "@/lib/normalize/salary";

describe("parseSalaryText", () => {
  // Real strings from the Remotive fixture.
  it.each([
    ["$20k -$35k", 20000, 35000, "USD", "year"],
    ["$90k - $105k", 90000, 105000, "USD", "year"],
    ["$90 - $150 /hour", 90, 150, "USD", "hour"],
    ["$35,3k- $52k", 35300, 52000, "USD", "year"],
    ["$10K-$20K", 10000, 20000, "USD", "year"],
    ["OTE $25k - $35k", 25000, 35000, "USD", "year"],
  ])("parses Remotive's %s", (text, min, max, currency, period) => {
    expect(parseSalaryText(text)).toMatchObject({ min, max, currency, period });
  });

  it.each([
    ["USD 1,500/mes", 1500, 1500, "USD", "month", false],
    ["1.500 - 2.000 EUR al mes", 1500, 2000, "EUR", "month", false],
    ["MXN 25,000 mensuales", 25000, 25000, "MXN", "month", false],
    ["70-90k USD per year", 70000, 90000, "USD", "year", false],
    ["€50k–60k", 50000, 60000, "EUR", "year", true],
    ["US$ 3,000 - 4,500", 3000, 4500, "USD", "month", true],
    ["R$ 8.000 por mês", 8000, 8000, "BRL", "month", true],
    ["$45/hr", 45, 45, "USD", "hour", false],
    ["CA$95,000 annually", 95000, 95000, "CAD", "year", false],
  ])("parses %s", (text, min, max, currency, period, periodInferred) => {
    expect(parseSalaryText(text)).toEqual({ min, max, currency, period, periodInferred });
  });

  it("understands open-ended ranges", () => {
    expect(parseSalaryText("Up to $120k")).toMatchObject({ min: null, max: 120000 });
    expect(parseSalaryText("Hasta 2,000 USD al mes")).toMatchObject({
      min: null,
      max: 2000,
      period: "month",
    });
    expect(parseSalaryText("$100k+")).toMatchObject({ min: 100000, max: null });
    expect(parseSalaryText("Desde $1,800 USD")).toMatchObject({ min: 1800, max: null });
  });

  it("ignores 401(k) and percentages", () => {
    expect(parseSalaryText("$80k - $95k + 401(k) + 10% bonus")).toMatchObject({ min: 80000, max: 95000 });
  });

  it("returns null when there is no amount", () => {
    expect(parseSalaryText("")).toBeNull();
    expect(parseSalaryText(null)).toBeNull();
    expect(parseSalaryText("Competitive")).toBeNull();
    expect(parseSalaryText("$0")).toBeNull();
  });
});

describe("parsePeriodLabel", () => {
  it("maps the labels APIs use", () => {
    expect(parsePeriodLabel("annual")).toBe("year");
    expect(parsePeriodLabel("yearly")).toBe("year");
    expect(parsePeriodLabel("Monthly")).toBe("month");
    expect(parsePeriodLabel("hourly")).toBe("hour");
    expect(parsePeriodLabel("biweekly")).toBeNull();
    expect(parsePeriodLabel(null)).toBeNull();
  });
});

describe("toMonthlyUsd", () => {
  const rates = { MXN: 18.1498, EUR: 0.89254 };

  it("converts periods to full-time monthly amounts", () => {
    expect(toMonthlyUsd(60000, "USD", "year", rates)).toBe(5000);
    expect(toMonthlyUsd(1500, "USD", "month", rates)).toBe(1500);
    expect(toMonthlyUsd(30, "USD", "hour", rates)).toBe(5200);
  });

  it("converts currencies with the day's rate", () => {
    expect(toMonthlyUsd(36300, "MXN", "month", rates)).toBe(2000);
    expect(toMonthlyUsd(53552, "EUR", "year", rates)).toBe(5000);
  });

  it("returns null when something is missing", () => {
    expect(toMonthlyUsd(1000, "CLP", "month", rates)).toBeNull();
    expect(toMonthlyUsd(null, "USD", "month", rates)).toBeNull();
    expect(toMonthlyUsd(1000, null, "month", rates)).toBeNull();
  });
});
