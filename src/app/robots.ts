import type { MetadataRoute } from "next";
import { appUrl } from "@/lib/config";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/admin", "/alertas", "/entrar", "/baja", "/api/", "/r/"],
    },
    sitemap: `${appUrl()}/sitemap.xml`,
  };
}
