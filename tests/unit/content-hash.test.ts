import { describe, expect, it } from "vitest";
import { contentHash } from "@/lib/ingest/content-hash";
import { getonbrdAdapter } from "@/lib/sources/getonbrd/adapter";
import { loadFixture } from "../helpers";

const job = getonbrdAdapter.mapJob(
  loadFixture<{ data: unknown[] }>("getonbrd/search-junior.sample.json").data[0],
)!;

describe("contentHash", () => {
  it("is stable regardless of key order", () => {
    const reordered = Object.fromEntries(Object.entries(job).reverse()) as typeof job;
    expect(contentHash(reordered)).toBe(contentHash(job));
  });

  it("changes when the published content changes", () => {
    expect(contentHash({ ...job, title: "Otro título" })).not.toBe(contentHash(job));
  });
});
