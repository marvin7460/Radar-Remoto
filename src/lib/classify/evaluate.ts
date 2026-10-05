import { ACCEPTS_MEXICO, SENIORITIES } from "@/db/schema";
import { detectEligibility } from "@/lib/normalize/eligibility";
import type { LabeledJob } from "./labeled-set";
import { accuracy, binaryMetrics, confusionMatrix, percent } from "./metrics";
import { classifySeniority } from "./seniority";

/** Runs the current classifiers over the labeled set and scores them. */
export function evaluate(labeled: readonly LabeledJob[]) {
  const seniority = labeled.map((job) => ({
    job,
    predicted: classifySeniority({
      title: job.title,
      labels: job.seniorityLabels,
      description: job.description,
    }).level,
    actual: job.label.seniority,
  }));
  const mexico = labeled.map((job) => ({
    job,
    predicted: detectEligibility(job.locations, job.timezone).acceptsMexico,
    actual: job.label.acceptsMexico,
  }));

  return {
    size: labeled.length,
    junior: binaryMetrics(seniority, "junior"),
    seniorityAccuracy: accuracy(seniority.filter((pair) => pair.actual !== "unknown")),
    seniorityMatrix: confusionMatrix(seniority, SENIORITIES),
    mexicoYes: binaryMetrics(mexico, "yes"),
    mexicoAccuracy: accuracy(mexico.filter((pair) => pair.actual !== "unknown")),
    mexicoMatrix: confusionMatrix(mexico, ACCEPTS_MEXICO),
    errors: {
      junior: seniority.filter((p) => (p.predicted === "junior") !== (p.actual === "junior")).map(describe),
      mexico: mexico.filter((p) => (p.predicted === "yes") !== (p.actual === "yes")).map(describe),
    },
  };
}

const describe = ({ job, predicted, actual }: { job: LabeledJob; predicted: string; actual: string }) =>
  `#${job.id} ${job.title} — predicted ${predicted}, labeled ${actual}`;

function matrixTable<T extends string>(matrix: Record<T, Record<T, number>>, classes: readonly T[]): string {
  const header = `| actual \\ predicted | ${classes.join(" | ")} |\n|---|${classes.map(() => "---:").join("|")}|`;
  const rows = classes.map(
    (actual) => `| **${actual}** | ${classes.map((p) => matrix[actual][p]).join(" | ")} |`,
  );
  return [header, ...rows].join("\n");
}

/** Markdown for README / docs. */
export function report(result: ReturnType<typeof evaluate>, date: string): string {
  const row = (name: string, m: ReturnType<typeof binaryMetrics>) =>
    `| ${name} | ${percent(m.precision)} | ${percent(m.recall)} | ${percent(m.f1)} | ${m.support} |`;
  return `# Classifier results

Hand-labeled set: **${result.size} jobs** (labeled with \`/admin/etiquetar\`, evaluated ${date} with \`npm run eval\`).

| Question | Precision | Recall | F1 | Positives |
|---|---:|---:|---:|---:|
${row("Is it junior?", result.junior)}
${row("Can someone in Mexico apply? (yes)", result.mexicoYes)}

- Seniority accuracy (jobs whose level is stated): ${percent(result.seniorityAccuracy)}
- Mexico accuracy (jobs where it's stated): ${percent(result.mexicoAccuracy)}

## Seniority confusion matrix

${matrixTable(result.seniorityMatrix, SENIORITIES)}

## Mexico confusion matrix

${matrixTable(result.mexicoMatrix, ACCEPTS_MEXICO)}

## Misses to learn from

### Junior
${result.errors.junior.map((e) => `- ${e}`).join("\n") || "- none"}

### Mexico
${result.errors.mexico.map((e) => `- ${e}`).join("\n") || "- none"}
`;
}
