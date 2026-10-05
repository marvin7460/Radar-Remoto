import { readFileSync } from "node:fs";
import path from "node:path";

export function loadFixture<T = unknown>(relativePath: string): T {
  return JSON.parse(readFileSync(path.join(__dirname, "fixtures", relativePath), "utf8")) as T;
}

/** A fetch stand-in that serves canned JSON by URL substring and records calls. */
export function fakeFetch(
  routes: Array<{ match: (url: string) => boolean; body: unknown; status?: number }>,
) {
  const calls: string[] = [];
  const fn = (async (input: string | URL | Request) => {
    const url = String(input);
    calls.push(url);
    const route = routes.find((r) => r.match(url));
    if (!route) return new Response("not found", { status: 404 });
    return new Response(JSON.stringify(route.body), {
      status: route.status ?? 200,
      headers: { "Content-Type": "application/json" },
    });
  }) as typeof fetch;
  return { fn, calls };
}
