import type { Metadata } from "next";
import Link from "next/link";
import { describeFilters, filtersFromQuery } from "@/lib/alerts/describe";
import { requireUser } from "@/lib/auth/session";
import { filtersToQuery } from "@/lib/search/filters";
import { createAlert } from "../actions";

export const metadata: Metadata = { title: "Nueva alerta · Radar Remoto", robots: { index: false } };

export default async function NewAlertPage(props: PageProps<"/alertas/nueva">) {
  const raw = new URLSearchParams(
    Object.entries(await props.searchParams).flatMap(([key, value]) =>
      typeof value === "string" ? [[key, value]] : [],
    ),
  ).toString();
  const filters = filtersFromQuery(raw);
  const query = filtersToQuery(filters);
  await requireUser(`/alertas/nueva${query}`);

  return (
    <main className="mx-auto w-full max-w-md px-4 py-16">
      <Link href={`/${query}`} className="text-sm text-stone-500 hover:underline">
        ← Volver a la búsqueda
      </Link>
      <h1 className="mt-4 text-2xl font-bold">Nueva alerta</h1>
      <p className="mt-2 text-stone-600 dark:text-stone-400">
        Te avisaremos cada mañana de las vacantes nuevas que coincidan con:{" "}
        <strong>{describeFilters(filters)}</strong>
      </p>
      <form action={createAlert} className="mt-6 space-y-3">
        <input type="hidden" name="query" value={query} />
        <label htmlFor="name" className="block text-sm font-medium">
          Nombre de la alerta
        </label>
        <input
          id="name"
          name="name"
          maxLength={80}
          defaultValue={describeFilters(filters)}
          className="w-full rounded-lg border border-stone-300 bg-white px-3 py-2 dark:border-stone-700 dark:bg-stone-900"
        />
        <button className="w-full rounded-lg bg-stone-900 px-4 py-2 font-medium text-white dark:bg-stone-100 dark:text-stone-900">
          Guardar alerta
        </button>
      </form>
    </main>
  );
}
