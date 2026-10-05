import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { migrate } from "drizzle-orm/libsql/migrator";
import { createDb, type Db } from "@/db/client";

/** A fresh, migrated SQLite file. Call the returned cleanup in afterEach. */
export async function createTestDb(): Promise<{ db: Db; cleanup: () => void }> {
  const dir = mkdtempSync(path.join(tmpdir(), "radar-test-"));
  const db = createDb(`file:${path.join(dir, "test.db")}`);
  await migrate(db, { migrationsFolder: "./drizzle" });
  return {
    db,
    cleanup: () => {
      db.$client.close();
      rmSync(dir, { recursive: true, force: true });
    },
  };
}
