import { createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto";

/** 256 bits of randomness, URL-safe. */
export const randomToken = () => randomBytes(32).toString("base64url");

export const sha256 = (value: string) => createHash("sha256").update(value).digest("hex");

export const hmac = (secret: string, value: string) =>
  createHmac("sha256", secret).update(value).digest("base64url");

export function safeEqual(a: string, b: string): boolean {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  return left.length === right.length && timingSafeEqual(left, right);
}
