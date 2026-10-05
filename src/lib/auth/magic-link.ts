import { and, count, eq, gt, isNull } from "drizzle-orm";
import { z } from "zod";
import type { Db } from "@/db/client";
import { loginTokens, sessions, users } from "@/db/schema";
import { appUrl } from "@/lib/config";
import { escapeHtml, type Sender } from "@/lib/email/send";
import { randomToken, sha256 } from "./crypto";

const MINUTE = 60_000;
export const TOKEN_TTL_MS = 15 * MINUTE;
export const SESSION_TTL_MS = 30 * 24 * 60 * MINUTE;
/** Protects the 100 emails/day of Resend's free tier from abuse. */
const MAX_LINKS_PER_WINDOW = 3;

/** Normalize first (" Ana@X.com " → "ana@x.com"), then validate. */
export const emailSchema = z.string().trim().toLowerCase().pipe(z.email().max(254));

/** Only same-site paths: never redirect to another domain after login. */
export function safeNext(next: string | null | undefined): string | null {
  return next && next.startsWith("/") && !next.startsWith("//") && !next.startsWith("/\\") ? next : null;
}

/**
 * Emails a single-use sign-in link. Always "succeeds" from the caller's point
 * of view, so the form never reveals whether an email has an account.
 */
export async function requestLoginLink(
  db: Db,
  send: Sender,
  input: { email: string; next?: string | null },
  now: Date = new Date(),
): Promise<{ sent: boolean }> {
  const email = emailSchema.parse(input.email);

  const [{ value: recent }] = await db
    .select({ value: count() })
    .from(loginTokens)
    .where(
      and(eq(loginTokens.email, email), gt(loginTokens.createdAt, new Date(now.getTime() - TOKEN_TTL_MS))),
    );
  if (recent >= MAX_LINKS_PER_WINDOW) return { sent: false };

  const token = randomToken();
  await db.insert(loginTokens).values({
    tokenHash: sha256(token),
    email,
    next: safeNext(input.next),
    createdAt: now,
    expiresAt: new Date(now.getTime() + TOKEN_TTL_MS),
  });

  const link = `${appUrl()}/entrar/verificar?token=${token}`;
  await send(
    {
      to: email,
      subject: "Tu enlace para entrar a Radar Remoto",
      text: `Entra a Radar Remoto con este enlace (vale 15 minutos y un solo uso):\n\n${link}\n\nSi no lo pediste, ignora este correo.`,
      html: `<p>Entra a Radar Remoto con este botón. Vale 15 minutos y un solo uso.</p>
<p><a href="${escapeHtml(link)}" style="display:inline-block;padding:10px 16px;background:#1c1917;color:#fff;border-radius:8px;text-decoration:none">Entrar a Radar Remoto</a></p>
<p style="color:#78716c;font-size:13px">Si no lo pediste, ignora este correo.</p>`,
    },
    { kind: "login" },
  );
  return { sent: true };
}

/**
 * Burns a token (atomically: a second use or a race finds nothing), creates
 * the user on first sign-in and opens a session. Returns the raw session id
 * for the cookie; only its hash is stored.
 */
export async function consumeLoginToken(
  db: Db,
  token: string,
  now: Date = new Date(),
): Promise<{ sessionId: string; userId: number; next: string | null } | null> {
  const [used] = await db
    .update(loginTokens)
    .set({ usedAt: now })
    .where(
      and(
        eq(loginTokens.tokenHash, sha256(token)),
        isNull(loginTokens.usedAt),
        gt(loginTokens.expiresAt, now),
      ),
    )
    .returning({ email: loginTokens.email, next: loginTokens.next });
  if (!used) return null;

  const [user] = await db
    .insert(users)
    .values({ email: used.email, createdAt: now })
    .onConflictDoUpdate({ target: users.email, set: { email: used.email } })
    .returning({ id: users.id });

  const sessionId = randomToken();
  await db.insert(sessions).values({
    idHash: sha256(sessionId),
    userId: user.id,
    createdAt: now,
    expiresAt: new Date(now.getTime() + SESSION_TTL_MS),
  });
  return { sessionId, userId: user.id, next: used.next };
}

export async function userForSession(db: Db, sessionId: string, now: Date = new Date()) {
  const [row] = await db
    .select({ id: users.id, email: users.email })
    .from(sessions)
    .innerJoin(users, eq(users.id, sessions.userId))
    .where(and(eq(sessions.idHash, sha256(sessionId)), gt(sessions.expiresAt, now)))
    .limit(1);
  return row ?? null;
}

export async function deleteSession(db: Db, sessionId: string): Promise<void> {
  await db.delete(sessions).where(eq(sessions.idHash, sha256(sessionId)));
}
