import type { Metadata } from "next";
import Link from "next/link";
import { appUrl } from "@/lib/config";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(appUrl()),
  title: "Radar Remoto · Vacantes remotas junior para Latinoamérica",
  description:
    "Vacantes remotas para desarrolladores junior que aceptan gente de México y Latinoamérica, reunidas de varias bolsas de trabajo y actualizadas cada 6 horas.",
  openGraph: {
    title: "Radar Remoto",
    description: "Vacantes remotas para desarrolladores junior que aceptan gente de Latinoamérica.",
    locale: "es_MX",
    type: "website",
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="es" className="h-full antialiased">
      <body className="flex min-h-full flex-col">
        <div className="flex-1">{children}</div>
        <footer className="border-t border-stone-200 px-4 py-6 text-center text-xs text-stone-500 dark:border-stone-800">
          Vacantes de Get on Board, Himalayas, Jobicy, Remotive, We Work Remotely y Remote OK, siempre con
          enlace a la publicación original. ·{" "}
          <Link href="/estado" className="underline">
            Estado del sistema
          </Link>{" "}
          ·{" "}
          <a href="https://github.com/marvin7460/Radar-Remoto" className="underline">
            Código
          </a>
        </footer>
      </body>
    </html>
  );
}
