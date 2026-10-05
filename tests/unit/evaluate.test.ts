import { describe, expect, it } from "vitest";
import { evaluate, report } from "@/lib/classify/evaluate";
import type { LabeledJob } from "@/lib/classify/labeled-set";
import { binaryMetrics, confusionMatrix } from "@/lib/classify/metrics";

describe("binaryMetrics", () => {
  it("computes precision, recall and F1", () => {
    const pairs = [
      { predicted: "junior", actual: "junior" },
      { predicted: "junior", actual: "senior" },
      { predicted: "senior", actual: "junior" },
      { predicted: "junior", actual: "junior" },
      { predicted: "mid", actual: "mid" },
    ];
    expect(binaryMetrics(pairs, "junior")).toMatchObject({
      precision: 2 / 3,
      recall: 2 / 3,
      truePositives: 2,
      falsePositives: 1,
      falseNegatives: 1,
      support: 3,
    });
  });

  it("returns null instead of dividing by zero", () => {
    expect(binaryMetrics([{ predicted: "a", actual: "b" }], "c")).toMatchObject({
      precision: null,
      recall: null,
    });
  });

  it("builds a confusion matrix (rows = actual)", () => {
    const matrix = confusionMatrix(
      [
        { predicted: "yes", actual: "no" },
        { predicted: "yes", actual: "yes" },
      ],
      ["yes", "no"] as const,
    );
    expect(matrix).toEqual({ yes: { yes: 1, no: 0 }, no: { yes: 1, no: 0 } });
  });
});

describe("evaluate", () => {
  const job = (id: number, title: string, label: LabeledJob["label"], locations: string[]): LabeledJob => ({
    id,
    source: "test",
    title,
    seniorityLabels: [],
    locations,
    timezone: null,
    description: "",
    label,
  });

  it("scores the real classifiers and lists misses", () => {
    const result = evaluate([
      job(1, "Junior Frontend Developer", { seniority: "junior", acceptsMexico: "yes" }, ["LATAM"]),
      job(2, "Backend Developer", { seniority: "junior", acceptsMexico: "no" }, ["USA"]),
      job(3, "Senior Engineer", { seniority: "senior", acceptsMexico: "yes" }, ["Worldwide"]),
    ]);
    expect(result.junior).toMatchObject({ precision: 1, recall: 0.5 });
    expect(result.mexicoYes).toMatchObject({ precision: 1, recall: 1 });
    expect(result.errors.junior).toEqual(["#2 Backend Developer — predicted unknown, labeled junior"]);
    expect(report(result, "2026-10-05")).toContain("| Is it junior? | 100.0% | 50.0% |");
  });
});
