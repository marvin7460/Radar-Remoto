/** Public base URL, used in emails ("https://radar-remoto.netlify.app"). */
export function appUrl(): string {
  return (process.env.APP_URL ?? "http://localhost:3000").replace(/\/+$/, "");
}

const DEV_SECRET = "dev-only-secret-change-me-dev-only-secret";

/** Signs unsubscribe links. Must be set (32+ chars) in production. */
export function authSecret(): string {
  const secret = process.env.AUTH_SECRET;
  if (secret && secret.length >= 32) return secret;
  if (process.env.NODE_ENV === "production" && !process.env.CI) {
    throw new Error("AUTH_SECRET must be set to 32+ characters in production");
  }
  return DEV_SECRET;
}

export function emailFrom(): string {
  return process.env.EMAIL_FROM ?? "Radar Remoto <onboarding@resend.dev>";
}
