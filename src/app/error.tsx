"use client"; // Error boundaries must be Client Components

import { useEffect } from "react";

export default function Error({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-20 text-center">
      <h1 className="text-2xl font-bold">No pudimos cargar las vacantes</h1>
      <p className="mt-2 text-stone-600 dark:text-stone-400">
        Algo falló de nuestro lado. Intenta de nuevo en unos segundos.
      </p>
      <button
        onClick={() => retry()}
        className="mt-6 rounded-lg bg-stone-900 px-4 py-2 text-white hover:bg-stone-700 dark:bg-stone-100 dark:text-stone-900"
      >
        Reintentar
      </button>
    </main>
  );
}
