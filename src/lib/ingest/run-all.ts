import type { Db } from "@/db/client";
import type { SourceAdapter } from "@/lib/sources/types";
import { ingestSource, type IngestStats } from "./ingest-source";

/**
 * Sources run one after another (not in parallel) to keep the load on the
 * database and on each API predictable. `ingestSource` never throws, so a
 * failing source can't stop the rest.
 */
export async function runAllSources(db: Db, adapters: SourceAdapter[]): Promise<IngestStats[]> {
  const results: IngestStats[] = [];
  for (const adapter of adapters) {
    results.push(await ingestSource(db, adapter));
  }
  return results;
}
