/**
 * Downloads one small, real response per source into tests/fixtures so unit
 * tests run offline against real-world payloads. Each adapter declares its
 * own fixture URLs, so fixtures match exactly what the app requests.
 *
 *   npm run fixtures:fetch                     (all targets)
 *   npm run fixtures:fetch -- --only=getonbrd,jobicy   (targets whose file starts with these)
 *   Actions → "Refresh API fixtures"           (from GitHub's runners)
 *
 * Refreshing replaces the frozen responses that adapter tests assert on, so
 * expect to update those expectations: that is how API drift shows up.
 * One request per target, sequential, with a pause: far below every limit.
 */
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { FRANKFURTER_URL } from "@/lib/fx/frankfurter";
import { USER_AGENT } from "@/lib/http/fetch";
import { getonbrdFixtures } from "@/lib/sources/getonbrd/adapter";
import { himalayasFixtures } from "@/lib/sources/himalayas/adapter";
import { jobicyFixtures } from "@/lib/sources/jobicy/adapter";
import { remoteokFixtures } from "@/lib/sources/remoteok/adapter";
import { remotiveFixtures } from "@/lib/sources/remotive/adapter";
import type { FixtureTarget } from "@/lib/sources/types";
import { weworkremotelyFixtures } from "@/lib/sources/weworkremotely/adapter";

const targets: FixtureTarget[] = [
  ...getonbrdFixtures,
  ...himalayasFixtures,
  ...remotiveFixtures,
  ...remoteokFixtures,
  ...jobicyFixtures,
  ...weworkremotelyFixtures,
  { file: "frankfurter/v1-latest.json", url: FRANKFURTER_URL },
  {
    file: "_meta/getonbrd-regions.json",
    url: "https://www.getonbrd.com/api/v0/regions?per_page=100",
    keep: 1000,
  },
  {
    file: "_meta/jobicy-locations.json",
    url: "https://jobicy.com/api/v2/remote-jobs?get=locations",
    keep: 1000,
  },
  {
    file: "_meta/jobicy-industries.json",
    url: "https://jobicy.com/api/v2/remote-jobs?get=industries",
    keep: 1000,
  },
];

const DEFAULT_KEEP = 25;
const PAUSE_MS = 1_500;
const FIXTURES_DIR = path.join(import.meta.dirname, "..", "tests", "fixtures");

function trimJson(body: unknown, keep: number): unknown {
  if (Array.isArray(body)) return body.slice(0, keep);
  if (body && typeof body === "object") {
    const copy: Record<string, unknown> = { ...body };
    for (const key of ["data", "jobs"]) {
      if (Array.isArray(copy[key])) copy[key] = (copy[key] as unknown[]).slice(0, keep);
    }
    return copy;
  }
  return body;
}

function trimRss(xml: string, keep: number): string {
  const first = xml.indexOf("<item>");
  if (first === -1) return xml;
  const items = xml.match(/<item>[\s\S]*?<\/item>/g) ?? [];
  return `${xml.slice(0, first)}${items.slice(0, keep).join("\n")}\n</channel>\n</rss>\n`;
}

// --only=getonbrd,jobicy → targets whose file starts with any of those prefixes.
const only = process.argv
  .find((arg) => arg.startsWith("--only="))
  ?.slice("--only=".length)
  .split(",")
  .filter(Boolean);
const selected = only?.length
  ? targets.filter((t) => only.some((prefix) => t.file.startsWith(prefix)))
  : targets;

let failures = 0;
for (const [index, target] of selected.entries()) {
  if (index > 0) await new Promise((resolve) => setTimeout(resolve, PAUSE_MS));
  const keep = target.keep ?? DEFAULT_KEEP;
  try {
    const res = await fetch(target.url, {
      headers: { "User-Agent": USER_AGENT, Accept: "application/json, application/rss+xml, */*" },
      signal: AbortSignal.timeout(30_000),
    });
    console.log(`${res.status} ${target.url}`);
    for (const [name, value] of res.headers) {
      if (/rate|retry|limit/i.test(name)) console.log(`    ${name}: ${value}`);
    }
    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    const text = await res.text();
    const output = target.file.endsWith(".xml")
      ? trimRss(text, keep)
      : `${JSON.stringify(trimJson(JSON.parse(text), keep), null, 2)}\n`;
    const file = path.join(FIXTURES_DIR, target.file);
    await mkdir(path.dirname(file), { recursive: true });
    await writeFile(file, output);
    console.log(`    saved ${target.file} (${(output.length / 1024).toFixed(1)} KB)`);
  } catch (error) {
    failures++;
    console.error(`    FAILED ${target.file}: ${(error as Error).message}`);
  }
}

console.log(`\n${selected.length - failures}/${selected.length} fixtures saved.`);
