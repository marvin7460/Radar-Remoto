import { connection } from "next/server";
import { JobCard } from "@/components/job-card";
import { getDb } from "@/db/client";
import { listLatestJobs } from "@/lib/jobs/queries";

export default async function HomePage() {
  // Jobs change every few hours: render on each request instead of at build time.
  await connection();
  const { jobs, usdToMxn } = await listLatestJobs(getDb());
  const now = new Date();

  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-10">
      <header className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Radar Remoto</h1>
        <p className="mt-2 text-stone-600 dark:text-stone-400">
          Vacantes remotas para desarrolladores junior, reunidas de varias bolsas de trabajo. Siempre te
          llevamos a la publicación original.
        </p>
      </header>

      {jobs.length === 0 ? (
        <p className="rounded-xl border border-dashed border-stone-300 p-8 text-center text-stone-500 dark:border-stone-700">
          Todavía no hay vacantes. La próxima actualización llega en unas horas.
        </p>
      ) : (
        <ul className="space-y-4">
          {jobs.map((job) => (
            <li key={job.id}>
              <JobCard job={job} now={now} usdToMxn={usdToMxn} />
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
