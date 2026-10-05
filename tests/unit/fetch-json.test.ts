import { describe, expect, it } from "vitest";
import { fetchJson, HttpError } from "@/lib/http/fetch-json";

function sequence(responses: Array<() => Response>) {
  let i = 0;
  const fn = (async () => responses[Math.min(i++, responses.length - 1)]()) as typeof fetch;
  return { fn, count: () => i };
}

describe("fetchJson", () => {
  it("retries 5xx and 429 with backoff, then succeeds", async () => {
    const { fn, count } = sequence([
      () => new Response("", { status: 503 }),
      () => new Response("", { status: 429 }),
      () => Response.json({ ok: true }),
    ]);
    await expect(fetchJson("https://x.test", { fetchFn: fn, backoffMs: 0 })).resolves.toEqual({ ok: true });
    expect(count()).toBe(3);
  });

  it("does not retry other 4xx errors", async () => {
    const { fn, count } = sequence([() => new Response("", { status: 404 })]);
    await expect(fetchJson("https://x.test", { fetchFn: fn, backoffMs: 0 })).rejects.toBeInstanceOf(
      HttpError,
    );
    expect(count()).toBe(1);
  });

  it("gives up after the configured retries", async () => {
    const { fn, count } = sequence([() => new Response("", { status: 500 })]);
    await expect(fetchJson("https://x.test", { fetchFn: fn, backoffMs: 0, retries: 2 })).rejects.toThrow(
      "HTTP 500",
    );
    expect(count()).toBe(3);
  });
});
