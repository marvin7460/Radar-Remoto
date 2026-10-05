import { describe, expect, it } from "vitest";
import { decideUpsertAction } from "@/lib/ingest/decide-action";

describe("decideUpsertAction", () => {
  it("inserts jobs we have never seen", () => {
    expect(decideUpsertAction(undefined, "abc")).toBe("insert");
  });

  it("updates when the content changed", () => {
    expect(decideUpsertAction("old", "new")).toBe("update");
  });

  it("returns unchanged when the hash is the same", () => {
    expect(decideUpsertAction("same", "same")).toBe("unchanged");
  });
});
