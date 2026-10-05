import { XMLParser } from "fast-xml-parser";
import { z } from "zod";
import type { FetchFn } from "@/lib/http/fetch";
import { htmlToText } from "@/lib/text/html";
import { fetchSequentially } from "../fetch-pages";
import type { FetchJobsOptions, FixtureTarget, SourceAdapter, SourceJob } from "../types";

/**
 * We Work Remotely — official RSS feeds per category.
 * Terms: the feeds are public; attribute and link back to WWR.
 * The "programming" feed mirrors "full-stack", so we read the three
 * specific developer feeds and de-duplicate by link. Those feeds also carry
 * non-developer roles ("Director, GTM Strategy"), so the category isn't
 * trusted: the title decides. `region` is the hiring rule; `country` and
 * `state` often describe the company, so they're only used without a region.
 */
const FEEDS = ["full-stack-programming", "back-end-programming", "front-end-programming"].map(
  (category) => `https://weworkremotely.com/categories/remote-${category}-jobs.rss`,
);
const REQUEST_DELAY_MS = 2_000;

export const weworkremotelyFixtures: FixtureTarget[] = [
  { file: "weworkremotely/full-stack.xml", url: FEEDS[0] },
  { file: "weworkremotely/back-end.xml", url: FEEDS[1] },
  { file: "weworkremotely/front-end.xml", url: FEEDS[2] },
];

const parser = new XMLParser({
  ignoreAttributes: true,
  parseTagValue: false,
  isArray: (name) => name === "item",
});

const text = z
  .union([z.string(), z.number()])
  .nullish()
  .transform((value) => (value == null ? "" : String(value).trim()));

const itemSchema = z.object({
  title: z.string(),
  link: z.url(),
  region: text,
  country: text,
  state: text,
  skills: text,
  category: text,
  type: text,
  description: text,
  pubDate: z.string(),
});

const feedSchema = z.object({
  rss: z.object({ channel: z.object({ item: z.array(z.unknown()).optional() }) }),
});

/** "🇺🇸 United States of America" → "United States of America". */
const stripFlags = (value: string) => value.replace(/\p{Regional_Indicator}{2}\s*/gu, "").trim();

export const weworkremotelyAdapter: SourceAdapter = {
  id: "weworkremotely",
  name: "We Work Remotely",
  homepage: "https://weworkremotely.com",
  budget: { maxRunsPerDay: 6, minIntervalMinutes: 60 },

  fetchJobs(fetchFn: FetchFn, { delayMs = REQUEST_DELAY_MS }: FetchJobsOptions = {}) {
    return fetchSequentially(weworkremotelyAdapter, FEEDS, {
      fetchFn,
      delayMs,
      keyOf: (raw) => (raw as { link?: string }).link,
    });
  },

  parsePage(body) {
    return feedSchema.parse(parser.parse(body)).rss.channel.item ?? [];
  },

  mapJob(raw): SourceJob {
    const item = itemSchema.parse(raw);
    // Titles look like "Company: Job title".
    const separator = item.title.indexOf(": ");
    const company = separator > 0 ? item.title.slice(0, separator) : "Empresa no indicada";
    const title = separator > 0 ? item.title.slice(separator + 2) : item.title;
    const slug = new URL(item.link).pathname.split("/").filter(Boolean).pop() ?? item.link;

    return {
      source: "weworkremotely",
      externalId: slug,
      url: item.link,
      title: htmlToText(title),
      company: htmlToText(company),
      seniorityLabels: [],
      categories: [],
      locations: item.region ? [item.region] : [stripFlags(item.country), item.state].filter(Boolean),
      timezoneOffsets: [],
      salary: null,
      salaryText: null,
      tags: item.skills ? [item.skills] : [],
      description: htmlToText(item.description),
      publishedAt: new Date(item.pubDate),
    };
  },
};
