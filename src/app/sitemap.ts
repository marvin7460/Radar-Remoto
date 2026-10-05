import type { MetadataRoute } from "next";
import { getDb } from "@/db/client";
import { appUrl } from "@/lib/config";
import { technologySlug } from "@/lib/normalize/technologies";
import { popularTechnologies } from "@/lib/search/search-jobs";

// Built per request (not at build time): it reads the database.
export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = appUrl();
  const technologies = await popularTechnologies(getDb(), 100);
  return [
    { url: `${base}/`, changeFrequency: "hourly", priority: 1 },
    { url: `${base}/estado`, changeFrequency: "hourly", priority: 0.3 },
    ...technologies.flatMap(({ name }) => {
      const slug = technologySlug(name);
      return slug
        ? [{ url: `${base}/tecnologia/${slug}`, changeFrequency: "daily" as const, priority: 0.7 }]
        : [];
    }),
  ];
}
