"use server";

import { redirect } from "next/navigation";
import { getDb } from "@/db/client";
import { consumeLoginToken, emailSchema, requestLoginLink, safeNext } from "@/lib/auth/magic-link";
import { setSessionCookie, signOut } from "@/lib/auth/session";
import { createSender } from "@/lib/email/send";

export async function requestLogin(formData: FormData): Promise<void> {
  const email = emailSchema.safeParse(formData.get("email"));
  const next = safeNext(String(formData.get("next") ?? "")) ?? "/alertas";
  if (!email.success) redirect(`/entrar?error=email&next=${encodeURIComponent(next)}`);

  const db = getDb();
  try {
    await requestLoginLink(db, createSender(db), { email: email.data, next });
  } catch {
    redirect(`/entrar?error=envio&next=${encodeURIComponent(next)}`);
  }
  // Same answer whether or not the email exists, or the rate limit kicked in.
  redirect("/entrar?enviado=1");
}

export async function verifyLogin(formData: FormData): Promise<void> {
  const result = await consumeLoginToken(getDb(), String(formData.get("token") ?? ""));
  if (!result) redirect("/entrar?error=enlace");
  await setSessionCookie(result.sessionId);
  redirect(result.next ?? "/alertas");
}

export async function logout(): Promise<void> {
  await signOut();
  redirect("/");
}
