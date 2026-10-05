import { and, desc, eq, gt, sql } from "drizzle-orm";
import type { Db } from "@/db/client";
import { fxRates, ingestionRuns } from "@/db/schema";
import type { UsdRates } from "@/lib/normalize/salary";
import { fetchUsdRates } from "./frankfurter";

export const FX_SOURCE = "frankfurter";
/** The ECB publishes once per business day; checking twice a day is plenty. */
const REFRESH_EVERY_MS = 12 * 60 * 60 * 1000;

/**
 * Downloads today's rates unless we already did recently. Logged in
 * ingestion_runs like any source so the status page shows FX health too.
 * Never throws: without fresh rates we keep using the latest stored ones.
 */
export async function refreshFxRates(
  db: Db,
  { fetchFn = fetch, now = () => new Date() } = {},
): Promise<void> {
  const recent = await db
    .select({ id: ingestionRuns.id })
    .from(ingestionRuns)
    .where(
      and(
        eq(ingestionRuns.source, FX_SOURCE),
        eq(ingestionRuns.status, "success"),
        gt(ingestionRuns.startedAt, new Date(now().getTime() - REFRESH_EVERY_MS)),
      ),
    )
    .limit(1);
  if (recent.length > 0) return;

  const startedAt = now();
  try {
    const { date, rates } = await fetchUsdRates(fetchFn);
    const fetchedAt = now();
    const rows = Object.entries(rates).map(([quote, rate]) => ({
      date,
      base: "USD",
      quote,
      rate,
      fetchedAt,
    }));
    await db
      .insert(fxRates)
      .values(rows)
      .onConflictDoUpdate({
        target: [fxRates.date, fxRates.base, fxRates.quote],
        set: { rate: sql`excluded.rate`, fetchedAt },
      });
    await db.insert(ingestionRuns).values({
      source: FX_SOURCE,
      status: "success",
      startedAt,
      finishedAt: now(),
      fetched: rows.length,
      inserted: rows.length,
    });
  } catch (error) {
    await db.insert(ingestionRuns).values({
      source: FX_SOURCE,
      status: "error",
      startedAt,
      finishedAt: now(),
      errorMessage: (error instanceof Error ? error.message : String(error)).slice(0, 2000),
    });
  }
}

/** Latest stored USD rates ({ MXN: 18.15, EUR: 0.89, … }), plus the date they're from. */
export async function getLatestUsdRates(db: Db): Promise<{ date: string | null; rates: UsdRates }> {
  const [latest] = await db
    .select({ date: fxRates.date })
    .from(fxRates)
    .where(eq(fxRates.base, "USD"))
    .orderBy(desc(fxRates.date))
    .limit(1);
  if (!latest) return { date: null, rates: {} };

  const rows = await db
    .select({ quote: fxRates.quote, rate: fxRates.rate })
    .from(fxRates)
    .where(and(eq(fxRates.base, "USD"), eq(fxRates.date, latest.date)));
  return { date: latest.date, rates: Object.fromEntries(rows.map((row) => [row.quote, row.rate])) };
}
