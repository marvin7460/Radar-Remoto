import type { Metadata } from "next";
import { verifyLogin } from "../actions";

export const metadata: Metadata = { title: "Confirmar · Radar Remoto", robots: { index: false } };

/**
 * The emailed link lands here instead of signing in directly: email
 * scanners (Outlook, Gmail) open links to check them, and a GET that burned
 * the single-use token would lock the real user out. A POST needs a human.
 */
export default async function VerifyPage(props: PageProps<"/entrar/verificar">) {
  const { token } = await props.searchParams;

  return (
    <main className="mx-auto w-full max-w-md px-4 py-16 text-center">
      <h1 className="text-2xl font-bold">Confirma que eres tú</h1>
      <form action={verifyLogin} className="mt-6">
        <input type="hidden" name="token" value={typeof token === "string" ? token : ""} />
        <button className="rounded-lg bg-stone-900 px-6 py-2 font-medium text-white dark:bg-stone-100 dark:text-stone-900">
          Entrar a Radar Remoto
        </button>
      </form>
    </main>
  );
}
