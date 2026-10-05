import type { Metadata } from "next";
import Link from "next/link";
import { unsubscribe } from "./actions";

export const metadata: Metadata = { title: "Darme de baja · Radar Remoto", robots: { index: false } };

/** Works without signing in, from the link in every email. */
export default async function UnsubscribePage(props: PageProps<"/baja">) {
  const { token, listo, error } = await props.searchParams;

  return (
    <main className="mx-auto w-full max-w-md px-4 py-16 text-center">
      {listo ? (
        <>
          <h1 className="text-2xl font-bold">Listo, ya no te llegará esa alerta</h1>
          <p className="mt-2 text-stone-600 dark:text-stone-400">
            Puedes reactivarla cuando quieras en{" "}
            <Link href="/alertas" className="underline">
              Mis alertas
            </Link>
            .
          </p>
        </>
      ) : error ? (
        <h1 className="text-2xl font-bold">Ese enlace no es válido</h1>
      ) : (
        <>
          <h1 className="text-2xl font-bold">¿Darte de baja de esta alerta?</h1>
          <form action={unsubscribe} className="mt-6">
            <input type="hidden" name="token" value={typeof token === "string" ? token : ""} />
            <button className="rounded-lg bg-stone-900 px-6 py-2 font-medium text-white dark:bg-stone-100 dark:text-stone-900">
              Sí, darme de baja
            </button>
          </form>
        </>
      )}
    </main>
  );
}
