import { technologyBySlug } from "@/lib/normalize/technologies";
import { parseFilters, type Filters } from "@/lib/search/filters";

const LEVELS = { junior: "Junior", mid: "Semi senior", senior: "Senior" } as const;

/** "?q=react&nivel=junior" → Filters, ignoring pagination. */
export function filtersFromQuery(query: string): Filters {
  const { pagina: _ignored, ...filters } = parseFilters(Object.fromEntries(new URLSearchParams(query)));
  void _ignored;
  return filters;
}

/** Human summary used as a default alert name and in emails: "react · Junior · Acepta México". */
export function describeFilters(filters: Filters): string {
  const parts = [
    filters.q && `“${filters.q}”`,
    filters.nivel && LEVELS[filters.nivel],
    filters.mexico === "si" && "Acepta México",
    filters.mexico === "probable" && "Acepta México o no está claro",
    filters.tech && technologyBySlug(filters.tech),
    filters.sueldo && `USD ${filters.sueldo.toLocaleString("en-US")}+/mes`,
    filters.zona !== undefined && `Zona UTC${filters.zona}`,
  ].filter(Boolean);
  return parts.length > 0 ? parts.join(" · ") : "Todas las vacantes";
}
