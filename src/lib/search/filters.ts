import { z } from "zod";
import { technologyBySlug } from "@/lib/normalize/technologies";

export const PAGE_SIZE = 20;
export const TIMEZONE_TOLERANCE_HOURS = 2;

/**
 * Filters live in the URL (?q=react&nivel=junior&mexico=si…) so every search
 * can be bookmarked and shared. Parameter names are Spanish because users see
 * them. Invalid values are ignored instead of erroring.
 */
const fields = {
  q: z.string().trim().min(1).max(100),
  nivel: z.enum(["junior", "mid", "senior"]),
  // si = only "yes"; probable = "yes" or "not clear".
  mexico: z.enum(["si", "probable"]),
  tech: z.string().refine((slug) => technologyBySlug(slug) !== undefined),
  // Minimum monthly salary in USD.
  sueldo: z.coerce.number().int().min(100).max(50_000),
  // The user's UTC offset; matches jobs within ±2 h, or with no time zone rule.
  zona: z.coerce.number().int().min(-12).max(14),
  // Published in the last N days.
  dias: z.coerce.number().refine((days) => [1, 7, 30].includes(days)),
  pagina: z.coerce.number().int().min(1).max(100),
} as const;

export type Filters = { [K in keyof typeof fields]?: z.infer<(typeof fields)[K]> };

type RawParams = Record<string, string | string[] | undefined>;

export function parseFilters(raw: RawParams): Filters {
  const filters: Record<string, unknown> = {};
  for (const [key, schema] of Object.entries(fields)) {
    const value = raw[key];
    const parsed = schema.safeParse(Array.isArray(value) ? value[0] : value);
    if (parsed.success) filters[key] = parsed.data;
  }
  return filters as Filters;
}

/** URL query string for the same filters with some changes (pagination links). */
export function filtersToQuery(filters: Filters, changes: Filters = {}): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries({ ...filters, ...changes })) {
    if (value !== undefined && !(key === "pagina" && value === 1)) params.set(key, String(value));
  }
  const query = params.toString();
  return query ? `?${query}` : "";
}
