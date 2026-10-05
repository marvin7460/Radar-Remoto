import { createHash } from "node:crypto";
import type { NormalizedJob } from "@/lib/sources/types";

/**
 * Fingerprint of everything a user can see about a job. If the hash didn't
 * change, there's nothing to write. Keys are sorted so the hash is stable
 * regardless of object key order.
 */
export function contentHash(job: NormalizedJob): string {
  const entries = Object.entries({ ...job, publishedAt: job.publishedAt.toISOString() }).sort(([a], [b]) =>
    a.localeCompare(b),
  );
  return createHash("sha256").update(JSON.stringify(entries)).digest("hex");
}
