import type { Metadata } from "next";
import Link from "next/link";
import { requestLogin } from "./actions";

export const metadata: Metadata = { title: "Entrar · Radar Remoto", robots: { index: false } };

const ERRORS: Record<string, string> = {
  email: "Escribe un correo válido.",
  envio: "No pudimos enviar el correo. Intenta de nuevo en unos minutos.",
  enlace: "Ese enlace ya se usó o caducó. Pide uno nuevo.",
};

export default async function SignInPage(props: PageProps<"/entrar">) {
  const params = await props.searchParams;
  const next = typeof params.next === "string" ? params.next : "/alertas";
  const error = typeof params.error === "string" ? ERRORS[params.error] : undefined;

  return (
    <main className="mx-auto w-full max-w-md px-4 py-16">
      <Link href="/" className="text-sm text-stone-500 hover:underline">
        ← Radar Remoto
      </Link>
      <h1 className="mt-4 text-2xl font-bold">Entra para crear alertas</h1>
      {params.enviado ? (
        <p
          className="mt-4 rounded-lg bg-emerald-50 p-4 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-200"
          role="status"
        >
          Listo. Si el correo es válido, te llegará un enlace para entrar. Vale 15 minutos y un solo uso.
        </p>
      ) : (
        <>
          <p className="mt-2 text-stone-600 dark:text-stone-400">
            Sin contraseñas: te mandamos un enlace a tu correo. Las vacantes siempre se pueden ver sin cuenta.
          </p>
          <form action={requestLogin} className="mt-6 space-y-3">
            <input type="hidden" name="next" value={next} />
            <label htmlFor="email" className="block text-sm font-medium">
              Correo
            </label>
            <input
              id="email"
              name="email"
              type="email"
              required
              autoComplete="email"
              className="w-full rounded-lg border border-stone-300 bg-white px-3 py-2 dark:border-stone-700 dark:bg-stone-900"
            />
            {error && (
              <p className="text-sm text-rose-600" role="alert">
                {error}
              </p>
            )}
            <button className="w-full rounded-lg bg-stone-900 px-4 py-2 font-medium text-white dark:bg-stone-100 dark:text-stone-900">
              Enviarme el enlace
            </button>
          </form>
        </>
      )}
    </main>
  );
}
