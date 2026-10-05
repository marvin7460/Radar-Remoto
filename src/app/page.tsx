import Link from "next/link";
import { connection } from "next/server";
import { JobCard } from "@/components/job-card";
import { SearchForm } from "@/components/search-form";
import { getDb } from "@/db/client";
import { filtersToQuery, parseFilters } from "@/lib/search/filters";
import { popularTechnologies, searchJobs } from "@/lib/search/search-jobs";

export default async function HomePage(props: PageProps<"/">) {
  // Jobs change every few hours: render on each request instead of at build time.
  await connection();
  const filters = parseFilters(await props.searchParams);
  const db = getDb();
  const [result, technologies] = await Promise.all([searchJobs(db, filters), popularTechnologies(db)]);
  const now = new Date();

  return (
    <main className="mx-auto w-full max-w-4xl px-4 py-10">
      <header className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight">
          <Link href="/">Radar Remoto</Link>
        </h1>
        <p className="mt-2 text-stone-600 dark:text-stone-400">
          Vacantes remotas para desarrolladores, reunidas de Get on Board, Himalayas, Jobicy, Remotive, We
          Work Remotely y Remote OK. Te decimos si aceptan gente desde México y siempre te llevamos a la
          publicación original.
        </p>
      </header>

      <SearchForm filters={filters} technologies={technologies.map((tech) => tech.name)} />

      <p
        className="mb-4 text-sm text-stone-600 dark:text-stone-400"
        aria-live="polite"
        data-testid="result-count"
      >
        {result.total === 1 ? "1 vacante" : `${result.total.toLocaleString("es-MX")} vacantes`}
      </p>

      {result.jobs.length === 0 ? (
        <p className="rounded-xl border border-dashed border-stone-300 p-8 text-center text-stone-500 dark:border-stone-700">
          No encontramos vacantes con esos filtros. Prueba quitando alguno.
        </p>
      ) : (
        <ul className="space-y-4">
          {result.jobs.map((job) => (
            <li key={job.id}>
              <JobCard job={job} now={now} usdToMxn={result.usdToMxn} />
            </li>
          ))}
        </ul>
      )}

      {result.pageCount > 1 && (
        <nav aria-label="Paginación" className="mt-8 flex items-center justify-between text-sm">
          {result.page > 1 ? (
            <Link href={`/${filtersToQuery(filters, { pagina: result.page - 1 })}`} className="underline">
              ← Anteriores
            </Link>
          ) : (
            <span />
          )}
          <span className="text-stone-500">
            Página {result.page} de {result.pageCount}
          </span>
          {result.page < result.pageCount ? (
            <Link href={`/${filtersToQuery(filters, { pagina: result.page + 1 })}`} className="underline">
              Siguientes →
            </Link>
          ) : (
            <span />
          )}
        </nav>
      )}
    </main>
  );
}
