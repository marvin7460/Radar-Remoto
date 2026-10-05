import { getDb } from "@/db/client";
import { recordClick } from "@/lib/metrics/clicks";

/**
 * Click counter for links in emails: count, then send the reader to the
 * original posting. On the website links point straight at the source (so
 * sources get a real, followed backlink) and clicks are counted with a beacon.
 */
export async function GET(request: Request, { params }: RouteContext<"/r/[id]">) {
  const { id } = await params;
  const via = new URL(request.url).searchParams.get("via") === "email" ? "email" : "web";
  const url = await recordClick(getDb(), Number(id), via);
  if (!url) return new Response("Vacante no encontrada", { status: 404 });
  return Response.redirect(url, 302);
}
