import { getDb } from "@/db/client";
import { recordClick } from "@/lib/metrics/clicks";

/** Receives navigator.sendBeacon() pings from job links on the website. */
export async function POST(request: Request) {
  const jobId = Number(await request.text());
  await recordClick(getDb(), jobId, "web");
  return new Response(null, { status: 204 });
}
