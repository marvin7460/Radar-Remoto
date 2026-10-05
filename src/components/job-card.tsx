import type { JobRow } from "@/db/schema";
import type { JobWithCopies } from "@/lib/search/search-jobs";
import {
  ACCEPTS_MEXICO_LABEL,
  formatMonthlyMxn,
  formatRelativeDate,
  formatSalary,
  SENIORITY_LABEL,
} from "@/lib/format";
import { sourceNames } from "@/lib/sources";
import { JobLink } from "./job-link";

const SENIORITY_STYLE: Record<JobRow["seniority"], string> = {
  junior: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300",
  mid: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300",
  senior: "bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300",
  unknown: "bg-stone-200 text-stone-700 dark:bg-stone-800 dark:text-stone-300",
};

const MEXICO_STYLE: Record<JobRow["acceptsMexico"], string> = {
  yes: "bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-300",
  no: "bg-stone-200 text-stone-600 line-through dark:bg-stone-800 dark:text-stone-400",
  unknown: "bg-stone-100 text-stone-600 dark:bg-stone-800 dark:text-stone-400",
};

/*
 * Links use rel="noopener" without "noreferrer" or "nofollow": sources ask
 * for followed links and need to see the traffic we send them (Remote OK's
 * terms require it).
 */
function SourceLink({ source, url }: { source: string; url: string }) {
  return (
    <a href={url} target="_blank" rel="noopener" className="underline">
      {sourceNames[source] ?? source}
    </a>
  );
}

export function JobCard({ job, now, usdToMxn }: { job: JobWithCopies; now: Date; usdToMxn: number | null }) {
  const salary = formatSalary(job);
  const salaryMxn = formatMonthlyMxn(job, usdToMxn);

  return (
    <article className="rounded-xl border border-stone-200 bg-white p-5 shadow-sm dark:border-stone-800 dark:bg-stone-900">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <h2 className="text-lg font-semibold leading-snug">
            <JobLink jobId={job.id} href={job.url} className="hover:underline">
              {job.title}
            </JobLink>
          </h2>
          <p className="text-stone-600 dark:text-stone-400">{job.company}</p>
        </div>
        <div className="flex flex-wrap gap-1.5">
          <span
            className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${SENIORITY_STYLE[job.seniority]}`}
            title={job.seniorityReason ?? undefined}
          >
            {SENIORITY_LABEL[job.seniority]}
          </span>
          <span
            className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${MEXICO_STYLE[job.acceptsMexico]}`}
            title={job.eligibilityReason ?? undefined}
          >
            {ACCEPTS_MEXICO_LABEL[job.acceptsMexico]}
          </span>
        </div>
      </div>

      <dl className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-sm text-stone-600 dark:text-stone-400">
        {salary && (
          <div>
            <dt className="sr-only">Sueldo</dt>
            <dd>
              💰 {salary}
              {salaryMxn && job.salaryCurrency !== "MXN" && (
                <span className="text-stone-500"> ({salaryMxn})</span>
              )}
            </dd>
          </div>
        )}
        {job.eligibilityReason && (
          <div>
            <dt className="sr-only">Ubicación</dt>
            <dd>🌎 {job.eligibilityReason}</dd>
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
        Publicada en <SourceLink source={job.source} url={job.url} />
        {job.copies.length > 0 && (
          <>
            {" "}
            · también en{" "}
            {job.copies.map((copy, index) => (
              <span key={copy.url}>
                {index > 0 && ", "}
                <SourceLink source={copy.source} url={copy.url} />
              </span>
            ))}
          </>
        )}
      </p>
    </article>
  );
}
