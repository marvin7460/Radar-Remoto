import { readdirSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { normalizeJob } from "@/lib/normalize/normalize-job";
import { adapters } from "@/lib/sources";
import { sourceJobSchema } from "@/lib/sources/types";
import { loadFixtureText } from "../helpers";

/**
 * Contract test over every real response we saved. If this fails after a
 * fixtures refresh, the source changed its API.
 */
describe.each(adapters)("real fixtures: $id", (adapter) => {
  const dir = path.join(__dirname, "..", "fixtures", adapter.id);
  const files = readdirSync(dir).filter((f) => /\.(json|xml)$/.test(f) && !f.includes(".sample."));

  it("has at least one real response", () => expect(files.length).toBeGreaterThan(0));

  it.each(files)("parses, maps and normalizes %s", (file) => {
    const raws = adapter.parsePage(loadFixtureText(path.join(adapter.id, file)));
    expect(raws.length).toBeGreaterThan(0);

    let invalid = 0;
    for (const raw of raws) {
      try {
        const job = adapter.mapJob(raw);
        if (job) normalizeJob(sourceJobSchema.parse(job), {});
      } catch {
        invalid++;
      }
    }
    expect(invalid).toBe(0);
  });
});
