import "./load-env";
import { getDb } from "@/db/client";
import { runAllSources } from "@/lib/ingest/run-all";
import { adapters } from "@/lib/sources";

const results = await runAllSources(getDb(), adapters);
console.table(results.map(({ error, ...rest }) => ({ ...rest, error: error?.slice(0, 80) ?? "" })));

// Exit non-zero only if *every* source failed, so one flaky API doesn't paint
// the whole scheduled run red while the error is still recorded in the DB.
if (results.length > 0 && results.every((r) => r.status === "error")) process.exit(1);
