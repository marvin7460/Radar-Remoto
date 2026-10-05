import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import type { Db } from "@/db/client";
import { emailLog, EMAIL_KINDS } from "@/db/schema";
import { emailFrom } from "@/lib/config";

export interface Email {
  to: string;
  subject: string;
  html: string;
  text: string;
  headers?: Record<string, string>;
}

export interface SendMeta {
  kind: (typeof EMAIL_KINDS)[number];
  userId?: number | null;
}

/** Anything that can deliver an email; tests pass a fake. */
export type Sender = (email: Email, meta: SendMeta) => Promise<void>;

const RESEND_URL = "https://api.resend.com/emails";

/**
 * Real delivery through Resend's HTTP API (free tier: 100 emails/day) when
 * RESEND_API_KEY is set; otherwise, outside production, writes the email to
 * .outbox/ so it can be read in development and end-to-end tests.
 * Every attempt is logged in email_log (without content) for the metrics.
 */
export function createSender(db: Db): Sender {
  return async (email, meta) => {
    const log = { kind: meta.kind, userId: meta.userId ?? null, sentAt: new Date() };
    try {
      const apiKey = process.env.RESEND_API_KEY;
      if (apiKey) {
        const res = await fetch(RESEND_URL, {
          method: "POST",
          headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
          body: JSON.stringify({ from: emailFrom(), ...email }),
          signal: AbortSignal.timeout(15_000),
        });
        if (!res.ok) throw new Error(`Resend HTTP ${res.status}: ${(await res.text()).slice(0, 300)}`);
        const { id } = (await res.json()) as { id?: string };
        await db.insert(emailLog).values({ ...log, status: "sent", providerId: id ?? null });
        return;
      }
      if (process.env.NODE_ENV === "production" && !process.env.EMAIL_OUTBOX_DIR) {
        throw new Error("RESEND_API_KEY is not set");
      }
      const dir = process.env.EMAIL_OUTBOX_DIR ?? ".outbox";
      await mkdir(dir, { recursive: true });
      await writeFile(path.join(dir, `${Date.now()}-${meta.kind}.json`), JSON.stringify(email, null, 2));
      await db.insert(emailLog).values({ ...log, status: "logged" });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      await db.insert(emailLog).values({ ...log, status: "error", error: message.slice(0, 500) });
      throw error;
    }
  };
}

const ESCAPES: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;",
};

/** Job titles come from third parties: always escape before putting them in HTML. */
export const escapeHtml = (text: string) => text.replace(/[&<>"']/g, (char) => ESCAPES[char]);
