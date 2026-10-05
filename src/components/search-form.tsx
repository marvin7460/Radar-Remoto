import type { Filters } from "@/lib/search/filters";
import { technologySlug } from "@/lib/normalize/technologies";

const field =
  "w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm dark:border-stone-700 dark:bg-stone-900";

const TIMEZONES = [-8, -7, -6, -5, -4, -3];
const SALARIES = [500, 1000, 1500, 2000, 3000, 5000];

/**
 * Plain GET form: works without JavaScript, and every search is a URL that
 * can be bookmarked or shared.
 */
export function SearchForm({ filters, technologies }: { filters: Filters; technologies: string[] }) {
  return (
    <form method="get" role="search" className="mb-8 space-y-3">
      <div className="flex gap-2">
        <label htmlFor="q" className="sr-only">
          Buscar
        </label>
        <input
          id="q"
          name="q"
          type="search"
          defaultValue={filters.q}
          placeholder="React, Python, desarrollador frontend…"
          className={`${field} flex-1`}
        />
        <button className="rounded-lg bg-stone-900 px-4 py-2 text-sm font-medium text-white hover:bg-stone-700 dark:bg-stone-100 dark:text-stone-900">
          Buscar
        </button>
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        <Select label="Nivel" name="nivel" value={filters.nivel}>
          <option value="">Todos los niveles</option>
          <option value="junior">Junior</option>
          <option value="mid">Semi senior</option>
          <option value="senior">Senior</option>
        </Select>
        <Select label="¿Acepta México?" name="mexico" value={filters.mexico}>
          <option value="">Cualquier ubicación</option>
          <option value="si">Sí acepta México</option>
          <option value="probable">Sí o no está claro</option>
        </Select>
        <Select label="Tecnología" name="tech" value={filters.tech}>
          <option value="">Todas</option>
          {technologies.map((name) => (
            <option key={name} value={technologySlug(name)}>
              {name}
            </option>
          ))}
        </Select>
        <Select label="Sueldo mínimo" name="sueldo" value={filters.sueldo}>
          <option value="">Cualquier sueldo</option>
          {SALARIES.map((usd) => (
            <option key={usd} value={usd}>
              USD {usd.toLocaleString("en-US")}+/mes
            </option>
          ))}
        </Select>
        <Select label="Mi zona horaria" name="zona" value={filters.zona}>
          <option value="">Cualquier horario</option>
          {TIMEZONES.map((offset) => (
            <option key={offset} value={offset}>
              UTC{offset}
              {offset === -6 ? " (CDMX)" : ""}
            </option>
          ))}
        </Select>
        <Select label="Publicada" name="dias" value={filters.dias}>
          <option value="">Cualquier fecha</option>
          <option value="1">Últimas 24 horas</option>
          <option value="7">Última semana</option>
          <option value="30">Último mes</option>
        </Select>
      </div>
    </form>
  );
}

function Select({
  label,
  name,
  value,
  children,
}: {
  label: string;
  name: string;
  value: string | number | undefined;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-stone-600 dark:text-stone-400">{label}</span>
      <select name={name} defaultValue={value ?? ""} className={field}>
        {children}
      </select>
    </label>
  );
}
