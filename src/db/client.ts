import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import * as schema from "./schema";

export function createDb(url: string, authToken?: string) {
  const client = createClient({ url, authToken });
  return drizzle({ client, schema });
}

export type Db = ReturnType<typeof createDb>;

let cached: Db | undefined;

/**
 * Lazily creates the app-wide connection so `next build` never needs DB
 * credentials. Falls back to a local SQLite file for development.
 */
export function getDb(): Db {
  cached ??= createDb(
    process.env.TURSO_DATABASE_URL ?? "file:local.db",
    process.env.TURSO_AUTH_TOKEN || undefined,
  );
  return cached;
}
