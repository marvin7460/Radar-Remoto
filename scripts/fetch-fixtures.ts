/**
 * Downloads one small, real response per source into tests/fixtures so unit
 * tests run offline against real-world payloads.
 *
 *   npm run fixtures:fetch            (locally)
 *   Actions → "Refresh API fixtures"  (from GitHub's runners)
 *
 * One request per target, sequential, with a pause: this stays far below every
 * source's published limits. Responses are trimmed to a few items to keep the
 * repo small. Rate-limit headers are printed so we can document real limits.
 */
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { USER_AGENT } from "@/lib/http/fetch-json";

interface Target {
  file: string;
  url: string;
  /** How many items to keep. */
  keep?: number;
}

const targets: Target[] = [
  {
    file: "getonbrd/search-junior.json",
    url: `https://www.getonbrd.com/api/v0/search/jobs?query=junior&per_page=25&page=1&expand=${encodeURIComponent('["company","seniority","tags"]')}`,
  },
  {
    file: "getonbrd/search-developer.json",
    url: `https://www.getonbrd.com/api/v0/search/jobs?query=developer&per_page=25&page=1&expand=${encodeURIComponent('["company","seniority","tags"]')}`,
  },
  {
    file: "himalayas/search-entry-level.json",
    url: "https://himalayas.app/jobs/api/search?seniority=Entry-level&sort=recent&page=1",
  },
  { file: "himalayas/browse.json", url: "https://himalayas.app/jobs/api?limit=20&offset=0" },
  {
    file: "remotive/software-dev.json",
    url: "https://remotive.com/api/remote-jobs?category=software-dev&limit=25",
  },
  { file: "remoteok/api.json", url: "https://remoteok.com/api", keep: 26 },
  {
    file: "jobicy/engineering.json",
    url: "https://jobicy.com/api/v2/remote-jobs?count=25&industry=engineering",
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
  {
    file: "weworkremotely/programming.xml",
    url: "https://weworkremotely.com/categories/remote-programming-jobs.rss",
  },
  {
    file: "weworkremotely/full-stack.xml",
    url: "https://weworkremotely.com/categories/remote-full-stack-programming-jobs.rss",
  },
  {
    file: "weworkremotely/back-end.xml",
    url: "https://weworkremotely.com/categories/remote-back-end-programming-jobs.rss",
  },
  {
    file: "weworkremotely/front-end.xml",
    url: "https://weworkremotely.com/categories/remote-front-end-programming-jobs.rss",
  },
  {
    file: "frankfurter/v1-latest.json",
    url: "https://api.frankfurter.dev/v1/latest?base=USD&symbols=MXN,EUR,BRL,CAD,GBP",
  },
  {
    file: "frankfurter/v2-latest.json",
    url: "https://api.frankfurter.dev/v2/latest?base=USD&quotes=MXN,EUR,BRL,CAD,GBP",
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

let failures = 0;
for (const [index, target] of targets.entries()) {
  if (index > 0) await new Promise((resolve) => setTimeout(resolve, PAUSE_MS));
  const keep = target.keep ?? DEFAULT_KEEP;
  try {
    const res = await fetch(target.url, {
      headers: { "User-Agent": USER_AGENT, Accept: "application/json, application/rss+xml, */*" },
      signal: AbortSignal.timeout(30_000),
    });
    const limits = [...res.headers].filter(([name]) => /rate|retry|limit/i.test(name));
    console.log(`${res.status} ${target.url}`);
    console.log(`    content-type: ${res.headers.get("content-type")}`);
    for (const [name, value] of limits) console.log(`    ${name}: ${value}`);
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

console.log(`\n${targets.length - failures}/${targets.length} fixtures saved.`);
