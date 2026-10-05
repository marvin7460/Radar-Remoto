import "./load-env";
import { migrate } from "drizzle-orm/libsql/migrator";
import { getDb } from "@/db/client";

await migrate(getDb(), { migrationsFolder: "./drizzle" });
console.log("Migrations applied.");
