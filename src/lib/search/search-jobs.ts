import { and, count, desc, eq, gte, inArray, isNull, lte, or, sql, type SQL } from "drizzle-orm";
import type { Db } from "@/db/client";
import { jobs, type JobRow } from "@/db/schema";
import { listCopies } from "@/lib/dedupe/dedupe-jobs";
import { getLatestUsdRates } from "@/lib/fx/rates";
import { technologyBySlug } from "@/lib/normalize/technologies";
import { buildFtsQuery } from "./fts-query";
import { PAGE_SIZE, TIMEZONE_TOLERANCE_HOURS, type Filters } from "./filters";

/** FTS5 matches considered per search, best first. Plenty for a job board. */
const MAX_MATCHES = 1000;

function filterConditions(filters: Filters, now: Date): SQL[] {
  const conditions: SQL[] = [isNull(jobs.canonicalJobId)];
  if (filters.nivel) conditions.push(eq(jobs.seniority, filters.nivel));
  if (filters.mexico === "si") conditions.push(eq(jobs.acceptsMexico, "yes"));
  if (filters.mexico === "probable") conditions.push(inArray(jobs.acceptsMexico, ["yes", "unknown"]));
  if (filters.tech) {
    const name = technologyBySlug(filters.tech);
    conditions.push(sql`exists (select 1 from json_each(${jobs.technologies}) where value = ${name})`);
  }
  if (filters.sueldo) {
    conditions.push(
      gte(sql`coalesce(${jobs.salaryUsdMonthlyMax}, ${jobs.salaryUsdMonthlyMin})`, filters.sueldo),
    );
  }
  if (filters.zona !== undefined) {
    const zone = filters.zona;
    conditions.push(
      or(
        isNull(jobs.timezoneMin),
        and(
          lte(jobs.timezoneMin, zone + TIMEZONE_TOLERANCE_HOURS),
          gte(jobs.timezoneMax, zone - TIMEZONE_TOLERANCE_HOURS),
        ),
      )!,
    );
  }
  if (filters.dias)
    conditions.push(gte(jobs.publishedAt, new Date(now.getTime() - filters.dias * 86_400_000)));
  return conditions;
}

/**
 * Search + filters + pagination. With text, FTS5 finds and ranks matches
 * (title hits weigh most) and the filters narrow them down; without text,
 * the newest postings come first.
 */
export async function searchJobs(
  db: Db,
  filters: Filters,
  now: Date = new Date(),
  { extraConditions = [], pageSize = PAGE_SIZE }: { extraConditions?: SQL[]; pageSize?: number } = {},
) {
  const page = filters.pagina ?? 1;
  const conditions = [...filterConditions(filters, now), ...extraConditions];
  const ftsQuery = buildFtsQuery(filters.q);

  let rows: JobRow[];
  let total: number;
  if (ftsQuery) {
    const matches = await db.all<{ id: number }>(
      sql`select rowid as id from jobs_fts where jobs_fts match ${ftsQuery} order by rank limit ${MAX_MATCHES}`,
    );
    const order = new Map(matches.map((match, index) => [match.id, index]));
    const filtered = order.size
      ? await db
          .select()
          .from(jobs)
          .where(and(...conditions, inArray(jobs.id, [...order.keys()])))
      : [];
    filtered.sort((a, b) => order.get(a.id)! - order.get(b.id)!);
    total = filtered.length;
    rows = filtered.slice((page - 1) * pageSize, page * pageSize);
  } else {
    const where = and(...conditions);
    const [pageRows, [counted]] = await Promise.all([
      db
        .select()
        .from(jobs)
        .where(where)
        .orderBy(desc(jobs.publishedAt))
        .limit(pageSize)
        .offset((page - 1) * pageSize),
      db.select({ value: count() }).from(jobs).where(where),
    ]);
    rows = pageRows;
    total = counted.value;
  }

  const [copies, fx] = await Promise.all([
    listCopies(
      db,
      rows.map((row) => row.id),
    ),
    getLatestUsdRates(db),
  ]);
  return {
    jobs: rows.map((row) => ({ ...row, copies: copies.filter((copy) => copy.canonicalJobId === row.id) })),
    total,
    page,
    pageCount: Math.max(1, Math.ceil(total / pageSize)),
    usdToMxn: fx.rates.MXN ?? null,
  };
}

export type SearchResult = Awaited<ReturnType<typeof searchJobs>>;
export type JobWithCopies = SearchResult["jobs"][number];

/** Technologies in open original postings, most common first (for the filter menu). */
export async function popularTechnologies(db: Db, limit = 30) {
  return db.all<{ name: string; total: number }>(sql`
    select value as name, count(*) as total
    from ${jobs}, json_each(${jobs.technologies})
    where ${jobs.canonicalJobId} is null
    group by value order by total desc, value limit ${limit}`);
}
