import { readdirSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { adapters } from "@/lib/sources";
import { loadFixture } from "../helpers";

/**
 * Smoke test over real downloaded responses (npm run fixtures:fetch).
 * Most real postings must parse: if this fails, the source changed its API.
 */
describe.each(adapters)("real fixtures: $id", (adapter) => {
  const dir = path.join(__dirname, "..", "fixtures", adapter.id);
  const files = readdirSync(dir).filter((f) => f.endsWith(".json") && !f.endsWith(".sample.json"));

  if (files.length === 0) {
    it.skip("no real fixtures downloaded yet (npm run fixtures:fetch)", () => {});
    return;
  }

  it.each(files)("parses %s", (file) => {
    const { data } = loadFixture<{ data: unknown[] }>(path.join(adapter.id, file));
    let invalid = 0;
    for (const raw of data) {
      try {
        adapter.normalize(raw);
      } catch {
        invalid++;
      }
    }
    expect(data.length).toBeGreaterThan(0);
    expect(invalid / data.length).toBeLessThan(0.05);
  });
});
