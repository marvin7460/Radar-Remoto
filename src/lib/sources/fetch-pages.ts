import { fetchText, sleep, type FetchFn } from "@/lib/http/fetch";
import type { SourceAdapter } from "./types";

/**
 * Fetches a fixed list of URLs one after another, with a pause in between,
 * and returns all raw postings de-duplicated by `keyOf` (the same job often
 * shows up in several feeds of one source).
 */
export async function fetchSequentially<Raw>(
  adapter: Pick<SourceAdapter<Raw>, "parsePage">,
  urls: Iterable<string>,
  { fetchFn, delayMs, keyOf }: { fetchFn: FetchFn; delayMs: number; keyOf: (raw: Raw) => string | undefined },
): Promise<Raw[]> {
  const byKey = new Map<string, Raw>();
  let first = true;
  for (const url of urls) {
    if (!first) await sleep(delayMs);
    first = false;
    for (const raw of adapter.parsePage(await fetchText(url, { fetchFn }))) {
      const key = keyOf(raw);
      if (key !== undefined && !byKey.has(key)) byKey.set(key, raw);
    }
  }
  return [...byKey.values()];
}
