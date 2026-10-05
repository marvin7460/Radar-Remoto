import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { connection } from "next/server";
import { adminToken, isAdmin } from "@/lib/admin/auth";
import { login } from "./actions";

export const metadata: Metadata = { title: "Admin · Radar Remoto", robots: { index: false } };

export default async function AdminLoginPage(props: PageProps<"/admin">) {
  // ADMIN_TOKEN is read at request time, never baked in at build time.
  await connection();
  if (!adminToken()) notFound();
  if (await isAdmin()) redirect("/admin/etiquetar");
  const { error } = await props.searchParams;

  return (
    <main className="mx-auto w-full max-w-sm px-4 py-20">
      <h1 className="text-2xl font-bold">Acceso de administración</h1>
      <form action={login} className="mt-6 space-y-3">
        <label className="block text-sm font-medium" htmlFor="token">
          Token
        </label>
        <input
          id="token"
          name="token"
          type="password"
          required
          autoComplete="current-password"
          className="w-full rounded-lg border border-stone-300 bg-white px-3 py-2 dark:border-stone-700 dark:bg-stone-900"
        />
        {error && <p className="text-sm text-rose-600">Token incorrecto.</p>}
        <button className="w-full rounded-lg bg-stone-900 px-4 py-2 text-white dark:bg-stone-100 dark:text-stone-900">
          Entrar
        </button>
      </form>
    </main>
  );
}
