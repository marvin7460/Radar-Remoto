import type { Metadata } from "next";
import Link from "next/link";
import { getDb } from "@/db/client";
import { listSavedSearches, MAX_SAVED_SEARCHES } from "@/lib/alerts/saved-searches";
import { requireUser } from "@/lib/auth/session";
import { logout } from "../entrar/actions";
import { deleteAlert, toggleAlert } from "./actions";

export const metadata: Metadata = { title: "Mis alertas · Radar Remoto", robots: { index: false } };

export default async function AlertsPage(props: PageProps<"/alertas">) {
  const user = await requireUser("/alertas");
  const params = await props.searchParams;
  const searches = await listSavedSearches(getDb(), user.id);

  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-10">
      <div className="flex items-center justify-between gap-4">
        <Link href="/" className="text-sm text-stone-500 hover:underline">
          ← Buscar vacantes
        </Link>
        <form action={logout}>
          <button className="text-sm text-stone-500 hover:underline">Salir ({user.email})</button>
        </form>
      </div>
      <h1 className="mt-4 text-2xl font-bold">Mis alertas</h1>
      <p className="mt-2 text-stone-600 dark:text-stone-400">
        Cada día a las 9:00 (hora de México) te mandamos las vacantes nuevas de tus búsquedas, sin repetir.
      </p>

      {params.creada && (
        <p
          className="mt-4 rounded-lg bg-emerald-50 p-3 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-200"
          role="status"
        >
          Alerta creada.
        </p>
      )}
      {params.error === "limite" && (
        <p className="mt-4 text-rose-600" role="alert">
          Puedes tener hasta {MAX_SAVED_SEARCHES} alertas. Borra alguna para crear otra.
        </p>
      )}

      {searches.length === 0 ? (
        <p className="mt-8 rounded-xl border border-dashed border-stone-300 p-8 text-center text-stone-500 dark:border-stone-700">
          Aún no tienes alertas. Haz una búsqueda y pulsa “Crear alerta con esta búsqueda”.
        </p>
      ) : (
        <ul className="mt-6 space-y-3">
          {searches.map((search) => (
            <li
              key={search.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-stone-200 bg-white p-4 dark:border-stone-800 dark:bg-stone-900"
            >
              <div className="min-w-0">
                <Link href={`/${search.query}`} className="font-medium hover:underline">
                  {search.name}
                </Link>
                <p className="text-xs text-stone-500">{search.active ? "Activa" : "Pausada"}</p>
              </div>
              <div className="flex gap-2 text-sm">
                <form action={toggleAlert}>
                  <input type="hidden" name="id" value={search.id} />
                  <input type="hidden" name="active" value={String(!search.active)} />
                  <button className="rounded-lg px-3 py-1 hover:bg-stone-100 dark:hover:bg-stone-800">
                    {search.active ? "Pausar" : "Reactivar"}
                  </button>
                </form>
                <form action={deleteAlert}>
                  <input type="hidden" name="id" value={search.id} />
                  <button className="rounded-lg px-3 py-1 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950">
                    Borrar
                  </button>
                </form>
              </div>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
