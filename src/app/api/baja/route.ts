import { getDb } from "@/db/client";
import { deactivateSavedSearch } from "@/lib/alerts/digest";
import { verifyUnsubscribeToken } from "@/lib/alerts/unsubscribe";

/**
 * One-click unsubscribe (RFC 8058): mail clients POST here when the user
 * presses "Unsubscribe" next to the sender name. GET is never accepted, so
 * link scanners can't unsubscribe anyone.
 */
export async function POST(request: Request) {
  const id = verifyUnsubscribeToken(new URL(request.url).searchParams.get("token") ?? "");
  if (!id) return new Response("Invalid token", { status: 400 });
  await deactivateSavedSearch(getDb(), id);
  return new Response("Unsubscribed", { status: 200 });
}
