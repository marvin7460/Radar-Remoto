import { hmac, safeEqual } from "@/lib/auth/crypto";
import { authSecret } from "@/lib/config";

/**
 * Unsubscribe links work without signing in: the saved search id plus an
 * HMAC signature, so nobody can unsubscribe someone else by guessing ids.
 */
export function unsubscribeToken(savedSearchId: number, secret = authSecret()): string {
  return `${savedSearchId}.${hmac(secret, `unsubscribe:${savedSearchId}`)}`;
}

export function verifyUnsubscribeToken(token: string, secret = authSecret()): number | null {
  const [id, signature] = token.split(".");
  const savedSearchId = Number(id);
  if (!Number.isSafeInteger(savedSearchId) || savedSearchId <= 0 || !signature) return null;
  return safeEqual(signature, hmac(secret, `unsubscribe:${savedSearchId}`)) ? savedSearchId : null;
}
