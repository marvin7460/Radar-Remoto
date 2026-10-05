import "server-only";
import { createHash, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { notFound, redirect } from "next/navigation";

export const ADMIN_COOKIE = "rr_admin";

/** The admin area only exists when ADMIN_TOKEN is set (16+ characters). */
export function adminToken(): string | null {
  const token = process.env.ADMIN_TOKEN;
  return token && token.length >= 16 ? token : null;
}

/** The cookie stores a hash, never the token itself. */
export const tokenDigest = (token: string) =>
  createHash("sha256").update(`radar-remoto:${token}`).digest("hex");

export function safeEqual(a: string, b: string): boolean {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  return left.length === right.length && timingSafeEqual(left, right);
}

export async function isAdmin(): Promise<boolean> {
  const token = adminToken();
  if (!token) return false;
  const cookie = (await cookies()).get(ADMIN_COOKIE)?.value;
  return cookie !== undefined && safeEqual(cookie, tokenDigest(token));
}

/** For admin pages and actions: 404 when disabled, login page when signed out. */
export async function requireAdmin(): Promise<void> {
  if (!adminToken()) notFound();
  if (!(await isAdmin())) redirect("/admin");
}
