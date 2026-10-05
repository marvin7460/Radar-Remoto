import { readFileSync } from "node:fs";
import path from "node:path";

export function loadFixtureText(relativePath: string): string {
  return readFileSync(path.join(__dirname, "fixtures", relativePath), "utf8");
}

export function loadFixture<T = unknown>(relativePath: string): T {
  return JSON.parse(loadFixtureText(relativePath)) as T;
}

/** A fetch stand-in that serves canned bodies by URL and records calls. */
export function fakeFetch(
  routes: Array<{ match: (url: string) => boolean; body: unknown; status?: number }>,
) {
  const calls: string[] = [];
  const fn = (async (input: string | URL | Request) => {
    const url = String(input);
    calls.push(url);
    const route = routes.find((r) => r.match(url));
    if (!route) return new Response("not found", { status: 404 });
    const text = typeof route.body === "string" ? route.body : JSON.stringify(route.body);
    return new Response(text, { status: route.status ?? 200 });
  }) as typeof fetch;
  return { fn, calls };
}
