import "./load-env";
import { getDb } from "@/db/client";
import { runAllSources } from "@/lib/ingest/run-all";
import { adapters } from "@/lib/sources";

const { sources, dedupe } = await runAllSources(getDb(), adapters);

console.table(
  sources.map((result) =>
    result.status === "skipped"
      ? { source: result.source, status: result.status, note: result.reason }
      : { ...result, error: undefined, note: result.error?.slice(0, 80) ?? "" },
  ),
);
console.log(`Duplicates: ${dedupe.duplicates} of ${dedupe.checked} recent jobs (${dedupe.changed} changed).`);

// Exit non-zero only if *every* source failed, so one flaky API doesn't paint
// the whole scheduled run red while its error is still recorded in the DB.
const attempted = sources.filter((result) => result.status !== "skipped");
if (attempted.length > 0 && attempted.every((result) => result.status === "error")) process.exit(1);
