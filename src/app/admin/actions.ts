"use server";

import { refresh } from "next/cache";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { getDb } from "@/db/client";
import { ACCEPTS_MEXICO, jobLabels, SENIORITIES } from "@/db/schema";
import { ADMIN_COOKIE, adminToken, requireAdmin, safeEqual, tokenDigest } from "@/lib/admin/auth";

export async function login(formData: FormData): Promise<void> {
  const token = adminToken();
  const given = String(formData.get("token") ?? "");
  if (!token || !safeEqual(tokenDigest(given), tokenDigest(token))) redirect("/admin?error=1");

  (await cookies()).set(ADMIN_COOKIE, tokenDigest(token), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
  redirect("/admin/etiquetar");
}

const labelSchema = z.object({
  jobId: z.coerce.number().int().positive(),
  seniority: z.enum(SENIORITIES),
  acceptsMexico: z.enum(ACCEPTS_MEXICO),
});

export async function saveLabel(input: z.input<typeof labelSchema>): Promise<void> {
  await requireAdmin();
  const label = labelSchema.parse(input);
  await getDb()
    .insert(jobLabels)
    .values({ ...label, labeledAt: new Date() })
    .onConflictDoUpdate({
      target: jobLabels.jobId,
      set: { seniority: label.seniority, acceptsMexico: label.acceptsMexico, labeledAt: new Date() },
    });
  refresh();
}

export async function skipJob(): Promise<void> {
  await requireAdmin();
  refresh();
}
