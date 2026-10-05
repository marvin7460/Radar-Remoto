import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { getDb } from "@/db/client";
import { formatRelativeDate } from "@/lib/format";
import { FX_SOURCE } from "@/lib/fx/rates";
import { duplicateCount, impactMetrics, sourceHealth } from "@/lib/metrics/status";
import { sourceNames } from "@/lib/sources";

export const metadata: Metadata = {
  title: "Estado del sistema · Radar Remoto",
  description:
    "Última actualización de cada fuente de vacantes, errores recientes y métricas de uso de Radar Remoto.",
};

const STATUS_STYLE = {
  success: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300",
  error: "bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300",
} as const;

export default async function StatusPage() {
  await connection();
  const db = getDb();
  const now = new Date();
  const [health, metrics, duplicates] = await Promise.all([
    sourceHealth(db, now),
    impactMetrics(db, now),
    duplicateCount(db),
  ]);

  const stats: Array<[string, number]> = [
    ["Vacantes abiertas", metrics.openJobs],
    ["Duplicados detectados", duplicates],
    ["Personas con alertas", metrics.usersWithAlerts],
    ["Correos enviados (30 días)", metrics.digestEmailsLastMonth],
    ["Clics a vacantes (30 días)", metrics.clicksLastMonth.web + metrics.clicksLastMonth.email],
  ];

  return (
    <main className="mx-auto w-full max-w-4xl px-4 py-10">
      <Link href="/" className="text-sm text-stone-500 hover:underline">
        ← Radar Remoto
      </Link>
      <h1 className="mt-4 text-3xl font-bold">Estado del sistema</h1>
      <p className="mt-2 text-stone-600 dark:text-stone-400">
        Las vacantes se actualizan cada 6 horas. Si una fuente falla, las demás siguen y el error queda aquí.
      </p>

      <dl className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-5">
        {stats.map(([label, value]) => (
          <div
            key={label}
            className="rounded-xl border border-stone-200 bg-white p-4 dark:border-stone-800 dark:bg-stone-900"
          >
            <dt className="text-xs text-stone-500">{label}</dt>
            <dd className="mt-1 text-2xl font-semibold tabular-nums">{value.toLocaleString("es-MX")}</dd>
          </div>
        ))}
      </dl>
      <p className="mt-2 text-xs text-stone-500">
        Métricas sin cookies: contamos clics y correos, nunca personas ni direcciones IP.
      </p>

      <h2 className="mt-10 text-xl font-semibold">Fuentes</h2>
      <div className="mt-3 overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="text-xs text-stone-500">
            <tr>
              <th className="py-2 pr-4 font-medium">Fuente</th>
              <th className="py-2 pr-4 font-medium">Última ingesta</th>
              <th className="py-2 pr-4 font-medium">Resultado</th>
              <th className="py-2 pr-4 font-medium">Nuevas (24 h)</th>
              <th className="py-2 font-medium">Errores (7 días)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-200 dark:divide-stone-800">
            {health.map(({ source, last, errorsLastWeek, addedLastDay }) => (
              <tr key={source}>
                <td className="py-2 pr-4 font-medium">
                  {source === FX_SOURCE ? "Tipo de cambio (Frankfurter)" : (sourceNames[source] ?? source)}
                </td>
                <td className="py-2 pr-4">
                  {last ? (
                    <time dateTime={last.startedAt.toISOString()}>
                      {formatRelativeDate(last.startedAt, now)}
                    </time>
                  ) : (
                    "Nunca"
                  )}
                </td>
                <td className="py-2 pr-4">
                  {last && (
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs ${STATUS_STYLE[last.status as "success" | "error"]}`}
                      title={last.errorMessage ?? undefined}
                    >
                      {last.status === "success" ? `OK · ${last.fetched} leídas` : "Error"}
                    </span>
                  )}
                </td>
                <td className="py-2 pr-4 tabular-nums">{source === FX_SOURCE ? "—" : addedLastDay}</td>
                <td className="py-2 tabular-nums">{errorsLastWeek}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </main>
  );
}
