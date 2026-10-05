import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Radar Remoto · Vacantes remotas junior para Latinoamérica",
  description:
    "Vacantes remotas para desarrolladores junior que aceptan gente de Latinoamérica, reunidas de varias bolsas de trabajo.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="es" className="h-full antialiased">
      <body className="flex min-h-full flex-col">{children}</body>
    </html>
  );
}
