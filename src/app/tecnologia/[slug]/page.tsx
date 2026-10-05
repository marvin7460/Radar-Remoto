import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { JobCard } from "@/components/job-card";
import { getDb } from "@/db/client";
import { technologyBySlug } from "@/lib/normalize/technologies";
import { searchJobs } from "@/lib/search/search-jobs";

export async function generateMetadata(props: PageProps<"/tecnologia/[slug]">): Promise<Metadata> {
  const name = technologyBySlug((await props.params).slug);
  if (!name) return {};
  return {
    title: `Vacantes remotas de ${name} para Latinoamérica · Radar Remoto`,
    description: `Empleos remotos de ${name} que aceptan gente de México y Latinoamérica, actualizados cada 6 horas desde varias bolsas de trabajo.`,
    alternates: { canonical: `/tecnologia/${(await props.params).slug}` },
  };
}

/**
 * Landing page per technology, for search engines and for sharing.
 * Deliberately without JobPosting structured data: Himalayas and Remotive
 * forbid submitting their jobs to Google Jobs.
 */
export default async function TechnologyPage(props: PageProps<"/tecnologia/[slug]">) {
  await connection();
  const { slug } = await props.params;
  const name = technologyBySlug(slug);
  if (!name) notFound();

  const result = await searchJobs(getDb(), { tech: slug, mexico: "probable" });
  const now = new Date();

  return (
    <main className="mx-auto w-full max-w-4xl px-4 py-10">
      <Link href="/" className="text-sm text-stone-500 hover:underline">
        ← Todas las vacantes
      </Link>
      <h1 className="mt-4 text-3xl font-bold">Vacantes remotas de {name}</h1>
      <p className="mt-2 text-stone-600 dark:text-stone-400">
        {result.total.toLocaleString("es-MX")} vacantes de {name} que aceptan gente de México o no lo
        descartan.{" "}
        <Link href={`/?tech=${slug}&nivel=junior`} className="underline">
          Ver solo junior
        </Link>
      </p>
      <ul className="mt-6 space-y-4">
        {result.jobs.map((job) => (
          <li key={job.id}>
            <JobCard job={job} now={now} usdToMxn={result.usdToMxn} />
          </li>
        ))}
      </ul>
      {result.pageCount > 1 && (
        <p className="mt-6 text-sm">
          <Link href={`/?tech=${slug}&mexico=probable&pagina=2`} className="underline">
            Ver más vacantes de {name} →
          </Link>
        </p>
      )}
    </main>
  );
}
