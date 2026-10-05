import { createHash } from "node:crypto";
import { NORMALIZER_VERSION } from "@/lib/normalize/normalize-job";
import type { SourceJob } from "@/lib/sources/types";

/**
 * Fingerprint of what the source published, plus the normalizer version.
 * Same hash → nothing to write. Hashing the source data (not our derived
 * fields) keeps daily exchange-rate changes from "changing" every job.
 */
export function contentHash(job: SourceJob): string {
  const entries = Object.entries({ ...job, publishedAt: job.publishedAt.toISOString() }).sort(([a], [b]) =>
    a.localeCompare(b),
  );
  return createHash("sha256")
    .update(JSON.stringify([NORMALIZER_VERSION, entries]))
    .digest("hex");
}
