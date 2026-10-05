"use server";

import { redirect } from "next/navigation";
import { getDb } from "@/db/client";
import { deactivateSavedSearch } from "@/lib/alerts/digest";
import { verifyUnsubscribeToken } from "@/lib/alerts/unsubscribe";

export async function unsubscribe(formData: FormData): Promise<void> {
  const id = verifyUnsubscribeToken(String(formData.get("token") ?? ""));
  if (!id) redirect("/baja?error=1");
  await deactivateSavedSearch(getDb(), id);
  redirect("/baja?listo=1");
}
