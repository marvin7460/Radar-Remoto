import type { JobRow } from "@/db/schema";
import { formatRelativeDate, formatSalary, SENIORITY_LABEL } from "@/lib/format";
import { sourceNames } from "@/lib/sources";

const SENIORITY_STYLE: Record<JobRow["seniority"], string> = {
  junior: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300",
  mid: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300",
  senior: "bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300",
  unknown: "bg-stone-200 text-stone-700 dark:bg-stone-800 dark:text-stone-300",
};

export function JobCard({ job, now }: { job: JobRow; now: Date }) {
  const salary = formatSalary(job);

  return (
    <article className="rounded-xl border border-stone-200 bg-white p-5 shadow-sm dark:border-stone-800 dark:bg-stone-900">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h2 className="text-lg font-semibold leading-snug">
            <a href={job.url} target="_blank" rel="noopener noreferrer" className="hover:underline">
              {job.title}
            </a>
          </h2>
          <p className="text-stone-600 dark:text-stone-400">{job.company}</p>
        </div>
        <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${SENIORITY_STYLE[job.seniority]}`}>
          {SENIORITY_LABEL[job.seniority]}
        </span>
      </div>

      <dl className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-sm text-stone-600 dark:text-stone-400">
        {salary && (
          <div>
            <dt className="sr-only">Sueldo</dt>
            <dd>💰 {salary}</dd>
          </div>
        )}
        {job.locationRaw && (
          <div>
            <dt className="sr-only">Ubicación</dt>
            <dd>🌎 {job.locationRaw}</dd>
          </div>
        )}
        <div>
          <dt className="sr-only">Publicada</dt>
          <dd>
            <time dateTime={job.publishedAt.toISOString()}>{formatRelativeDate(job.publishedAt, now)}</time>
          </dd>
        </div>
      </dl>

      {job.technologies.length > 0 && (
        <ul className="mt-3 flex flex-wrap gap-1.5" aria-label="Tecnologías">
          {job.technologies.slice(0, 8).map((tech) => (
            <li key={tech} className="rounded-md bg-stone-100 px-2 py-0.5 text-xs dark:bg-stone-800">
              {tech}
            </li>
          ))}
        </ul>
      )}

      <p className="mt-4 text-xs text-stone-500">
        Vía{" "}
        <a href={job.url} target="_blank" rel="noopener noreferrer" className="underline">
          {sourceNames[job.source] ?? job.source}
        </a>{" "}
        · ver la vacante original
      </p>
    </article>
  );
}
