import { and, count, desc, eq } from "drizzle-orm";
import type { Db } from "@/db/client";
import { savedSearches } from "@/db/schema";
import { filtersToQuery } from "@/lib/search/filters";
import { describeFilters, filtersFromQuery } from "./describe";

export const MAX_SAVED_SEARCHES = 10;

export async function listSavedSearches(db: Db, userId: number) {
  return db
    .select()
    .from(savedSearches)
    .where(eq(savedSearches.userId, userId))
    .orderBy(desc(savedSearches.createdAt));
}

/** Saves the normalized query (invalid params dropped), at most 10 per user. */
export async function createSavedSearch(
  db: Db,
  userId: number,
  { query, name }: { query: string; name?: string },
  now: Date = new Date(),
) {
  const [{ value: existing }] = await db
    .select({ value: count() })
    .from(savedSearches)
    .where(eq(savedSearches.userId, userId));
  if (existing >= MAX_SAVED_SEARCHES) return { ok: false as const, reason: "limit" as const };

  const filters = filtersFromQuery(query);
  const [saved] = await db
    .insert(savedSearches)
    .values({
      userId,
      query: filtersToQuery(filters),
      name: name?.trim().slice(0, 80) || describeFilters(filters),
      createdAt: now,
    })
    .returning();
  return { ok: true as const, saved };
}

/** Scoped by user: nobody can touch another user's alerts by changing an id. */
export async function setSavedSearchActive(db: Db, userId: number, id: number, active: boolean) {
  await db
    .update(savedSearches)
    .set({ active })
    .where(and(eq(savedSearches.id, id), eq(savedSearches.userId, userId)));
}

export async function deleteSavedSearch(db: Db, userId: number, id: number) {
  await db.delete(savedSearches).where(and(eq(savedSearches.id, id), eq(savedSearches.userId, userId)));
}
