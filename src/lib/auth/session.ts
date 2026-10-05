import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getDb } from "@/db/client";
import { deleteSession, SESSION_TTL_MS, userForSession } from "./magic-link";

const SESSION_COOKIE = "rr_session";

export async function setSessionCookie(sessionId: string): Promise<void> {
  (await cookies()).set(SESSION_COOKIE, sessionId, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    // "lax" so the cookie survives arriving from a link in an email.
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_TTL_MS / 1000,
  });
}

export async function currentUser() {
  const sessionId = (await cookies()).get(SESSION_COOKIE)?.value;
  return sessionId ? userForSession(getDb(), sessionId) : null;
}

/** For pages and actions that need a signed-in user; `next` is where to come back. */
export async function requireUser(next: string) {
  const user = await currentUser();
  if (!user) redirect(`/entrar?next=${encodeURIComponent(next)}`);
  return user;
}

export async function signOut(): Promise<void> {
  const store = await cookies();
  const sessionId = store.get(SESSION_COOKIE)?.value;
  if (sessionId) await deleteSession(getDb(), sessionId);
  store.delete(SESSION_COOKIE);
}
