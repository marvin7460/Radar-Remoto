import type { Metadata } from "next";
import { connection } from "next/server";
import { getDb } from "@/db/client";
import { requireAdmin } from "@/lib/admin/auth";
import { LABEL_GOAL, labelCount, nextJobToLabel } from "@/lib/admin/labeling";
import { sourceNames } from "@/lib/sources";
import { LabelForm } from "./label-form";

export const metadata: Metadata = { title: "Etiquetar · Radar Remoto", robots: { index: false } };

export default async function LabelingPage() {
  await connection();
  await requireAdmin();
  const db = getDb();
  const [job, done] = await Promise.all([nextJobToLabel(db), labelCount(db)]);

  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-8">
      <header className="mb-6 flex items-baseline justify-between gap-4">
        <h1 className="text-2xl font-bold">Etiquetar vacantes</h1>
        <p className="text-sm text-stone-500" aria-live="polite">
          {done} de {LABEL_GOAL} etiquetadas
        </p>
      </header>
      <div className="mb-6 h-2 rounded-full bg-stone-200 dark:bg-stone-800">
        <div
          className="h-2 rounded-full bg-emerald-500"
          style={{ width: `${Math.min(100, (done / LABEL_GOAL) * 100)}%` }}
        />
      </div>

      {!job ? (
        <p className="text-stone-500">No quedan vacantes sin etiquetar. Corre otra ingesta para traer más.</p>
      ) : (
        <article className="space-y-4">
          <div>
            <h2 className="text-xl font-semibold">
              <a href={job.url} target="_blank" rel="noopener" className="hover:underline">
                {job.title}
              </a>
            </h2>
            <p className="text-stone-600 dark:text-stone-400">
              {job.company} · {sourceNames[job.source] ?? job.source}
            </p>
            <dl className="mt-2 grid grid-cols-[auto_1fr] gap-x-3 text-sm text-stone-600 dark:text-stone-400">
              <dt className="font-medium">Nivel según la fuente</dt>
              <dd>{job.seniorityRaw ?? "—"}</dd>
              <dt className="font-medium">Ubicación publicada</dt>
              <dd>{job.locationRaw ?? "—"}</dd>
            </dl>
          </div>
          <LabelForm key={job.id} jobId={job.id} />
          <details open className="rounded-lg border border-stone-200 p-4 dark:border-stone-800">
            <summary className="cursor-pointer text-sm font-medium">Descripción</summary>
            <p className="mt-3 max-h-[28rem] overflow-y-auto whitespace-pre-line text-sm leading-relaxed">
              {job.description || "Sin descripción."}
            </p>
          </details>
        </article>
      )}
    </main>
  );
}
