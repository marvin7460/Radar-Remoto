/**
 * Loads the saved real API responses (tests/fixtures) into the database
 * through the real ingestion pipeline: handy for local development without
 * network access, and used by the end-to-end tests.
 *   npm run db:seed
 */
import "./load-env";
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { getDb } from "@/db/client";
import { fxRates } from "@/db/schema";
import { dedupeJobs } from "@/lib/dedupe/dedupe-jobs";
import { parseFrankfurterResponse } from "@/lib/fx/frankfurter";
import { ingestSource } from "@/lib/ingest/ingest-source";
import { adapters } from "@/lib/sources";

const FIXTURES = path.join(import.meta.dirname, "..", "tests", "fixtures");
const db = getDb();

const fx = parseFrankfurterResponse(
  JSON.parse(readFileSync(path.join(FIXTURES, "frankfurter/v1-latest.json"), "utf8")),
);
await db
  .insert(fxRates)
  .values(
    Object.entries(fx.rates).map(([quote, rate]) => ({
      date: fx.date,
      base: "USD",
      quote,
      rate,
      fetchedAt: new Date(),
    })),
  )
  .onConflictDoNothing();

for (const adapter of adapters) {
  const dir = path.join(FIXTURES, adapter.id);
  for (const file of readdirSync(dir).filter((f) => /\.(json|xml)$/.test(f) && !f.includes(".sample."))) {
    const body = readFileSync(path.join(dir, file), "utf8");
    const offline = { ...adapter, fetchJobs: async () => adapter.parsePage(body) };
    const stats = await ingestSource(db, offline, { usdRates: fx.rates });
    console.log(
      `${adapter.id}/${file}: ${stats.inserted} new, ${stats.unchanged + stats.updated} known, ${stats.skipped} skipped`,
    );
  }
}
console.log(await dedupeJobs(db));
