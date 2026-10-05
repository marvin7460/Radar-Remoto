import { sql } from "drizzle-orm";
import { index, integer, primaryKey, real, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

export const SENIORITIES = ["junior", "mid", "senior", "unknown"] as const;
export const SALARY_PERIODS = ["hour", "day", "week", "month", "year"] as const;
export const ACCEPTS_MEXICO = ["yes", "no", "unknown"] as const;
export const RUN_STATUSES = ["running", "success", "error", "skipped"] as const;

/**
 * One row per job posting per source. The (source, external_id) pair is the
 * natural key that makes ingestion idempotent.
 */
export const jobs = sqliteTable(
  "jobs",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    source: text("source").notNull(),
    externalId: text("external_id").notNull(),
    url: text("url").notNull(),
    title: text("title").notNull(),
    company: text("company").notNull(),
    seniority: text("seniority", { enum: SENIORITIES }).notNull().default("unknown"),
    seniorityReason: text("seniority_reason"),
    seniorityRaw: text("seniority_raw"),
    locationRaw: text("location_raw"),
    /** Region codes we recognized ("LATAM", "US", "WORLDWIDE"…). */
    allowedRegions: text("allowed_regions", { mode: "json" })
      .$type<string[]>()
      .notNull()
      .default(sql`'[]'`),
    acceptsMexico: text("accepts_mexico", { enum: ACCEPTS_MEXICO }).notNull().default("unknown"),
    eligibilityReason: text("eligibility_reason"),
    timezoneMin: real("timezone_min"),
    timezoneMax: real("timezone_max"),
    salaryMin: real("salary_min"),
    salaryMax: real("salary_max"),
    salaryCurrency: text("salary_currency"),
    salaryPeriod: text("salary_period", { enum: SALARY_PERIODS }),
    /** Full-time monthly equivalent in USD, for sorting and filtering. */
    salaryUsdMonthlyMin: real("salary_usd_monthly_min"),
    salaryUsdMonthlyMax: real("salary_usd_monthly_max"),
    technologies: text("technologies", { mode: "json" })
      .$type<string[]>()
      .notNull()
      .default(sql`'[]'`),
    description: text("description").notNull().default(""),
    publishedAt: integer("published_at", { mode: "timestamp" }).notNull(),
    /** Set when this posting duplicates another one (from another source); null for originals. */
    canonicalJobId: integer("canonical_job_id"),
    contentHash: text("content_hash").notNull(),
    firstSeenAt: integer("first_seen_at", { mode: "timestamp" }).notNull(),
    lastSeenAt: integer("last_seen_at", { mode: "timestamp" }).notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
  },
  (t) => [
    uniqueIndex("jobs_source_external_id_uq").on(t.source, t.externalId),
    index("jobs_published_at_idx").on(t.publishedAt),
    index("jobs_canonical_job_id_idx").on(t.canonicalJobId),
  ],
);

/** Audit log: one row per source per ingestion run. */
export const ingestionRuns = sqliteTable(
  "ingestion_runs",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    source: text("source").notNull(),
    status: text("status", { enum: RUN_STATUSES }).notNull(),
    startedAt: integer("started_at", { mode: "timestamp" }).notNull(),
    finishedAt: integer("finished_at", { mode: "timestamp" }),
    fetched: integer("fetched").notNull().default(0),
    inserted: integer("inserted").notNull().default(0),
    updated: integer("updated").notNull().default(0),
    unchanged: integer("unchanged").notNull().default(0),
    skipped: integer("skipped").notNull().default(0),
    invalid: integer("invalid").notNull().default(0),
    errorMessage: text("error_message"),
  },
  (t) => [index("ingestion_runs_source_started_idx").on(t.source, t.startedAt)],
);

/**
 * Hand labels for measuring the classifiers (precision/recall in the README).
 * "unknown" means the posting itself doesn't say.
 */
export const jobLabels = sqliteTable("job_labels", {
  jobId: integer("job_id")
    .primaryKey()
    .references(() => jobs.id, { onDelete: "cascade" }),
  seniority: text("seniority", { enum: SENIORITIES }).notNull(),
  acceptsMexico: text("accepts_mexico", { enum: ACCEPTS_MEXICO }).notNull(),
  labeledAt: integer("labeled_at", { mode: "timestamp" }).notNull(),
});

/** Daily exchange rates with base USD: `rate` = units of `quote` per 1 USD. */
export const fxRates = sqliteTable(
  "fx_rates",
  {
    date: text("date").notNull(),
    base: text("base").notNull(),
    quote: text("quote").notNull(),
    rate: real("rate").notNull(),
    fetchedAt: integer("fetched_at", { mode: "timestamp" }).notNull(),
  },
  (t) => [primaryKey({ columns: [t.date, t.base, t.quote] })],
);

export type Seniority = (typeof SENIORITIES)[number];
export type SalaryPeriod = (typeof SALARY_PERIODS)[number];
export type AcceptsMexico = (typeof ACCEPTS_MEXICO)[number];
export type JobRow = typeof jobs.$inferSelect;
export type NewJobRow = typeof jobs.$inferInsert;
export type IngestionRun = typeof ingestionRuns.$inferSelect;
export type JobLabel = typeof jobLabels.$inferSelect;
