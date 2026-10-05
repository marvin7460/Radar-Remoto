/** Scores the classifiers against data/labeled-jobs.json → docs/classifier-results.md */
import { readFile, writeFile } from "node:fs/promises";
import { evaluate, report } from "@/lib/classify/evaluate";
import { labeledSetSchema } from "@/lib/classify/labeled-set";
import { percent } from "@/lib/classify/metrics";

const labeled = labeledSetSchema.parse(JSON.parse(await readFile("data/labeled-jobs.json", "utf8")));
if (labeled.length === 0) {
  console.log("No labeled jobs yet: label some at /admin/etiquetar, then run `npm run labels:export`.");
  process.exit(0);
}

const result = evaluate(labeled);
await writeFile("docs/classifier-results.md", report(result, new Date().toISOString().slice(0, 10)));
console.table({
  "Is it junior?": { precision: percent(result.junior.precision), recall: percent(result.junior.recall) },
  "Mexico: yes": { precision: percent(result.mexicoYes.precision), recall: percent(result.mexicoYes.recall) },
});
console.log(`Evaluated ${result.size} jobs → docs/classifier-results.md`);
