/**
 * Downloads small real responses from each source into tests/fixtures so unit
 * tests run offline against real-world payloads. Run manually:
 *   npm run fixtures:fetch
 */
import { mkdir, writeFile } from "node:fs/promises";
import { fetchJson } from "@/lib/http/fetch-json";
import { buildSearchUrl } from "@/lib/sources/getonbrd/adapter";

const targets = [{ file: "tests/fixtures/getonbrd/search-junior.json", url: buildSearchUrl("junior", 1) }];

for (const { file, url } of targets) {
  const body = await fetchJson(url);
  await mkdir(file.slice(0, file.lastIndexOf("/")), { recursive: true });
  await writeFile(file, JSON.stringify(body, null, 2) + "\n");
  console.log(`saved ${file}`);
}
