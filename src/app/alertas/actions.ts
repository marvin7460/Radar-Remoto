"use server";

import { redirect } from "next/navigation";
import { refresh } from "next/cache";
import { getDb } from "@/db/client";
import { createSavedSearch, deleteSavedSearch, setSavedSearchActive } from "@/lib/alerts/saved-searches";
import { requireUser } from "@/lib/auth/session";

export async function createAlert(formData: FormData): Promise<void> {
  const query = String(formData.get("query") ?? "");
  const user = await requireUser(`/alertas/nueva${query}`);
  const result = await createSavedSearch(getDb(), user.id, {
    query,
    name: String(formData.get("name") ?? ""),
  });
  redirect(result.ok ? "/alertas?creada=1" : "/alertas?error=limite");
}

export async function toggleAlert(formData: FormData): Promise<void> {
  const user = await requireUser("/alertas");
  await setSavedSearchActive(getDb(), user.id, Number(formData.get("id")), formData.get("active") === "true");
  refresh();
}

export async function deleteAlert(formData: FormData): Promise<void> {
  const user = await requireUser("/alertas");
  await deleteSavedSearch(getDb(), user.id, Number(formData.get("id")));
  refresh();
}
