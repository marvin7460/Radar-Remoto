/** Daily alert emails. Scheduled by .github/workflows/digest.yml at 9:00 Mexico City. */
import "./load-env";
import { getDb } from "@/db/client";
import { runDigest } from "@/lib/alerts/digest";
import { createSender } from "@/lib/email/send";

const db = getDb();
const stats = await runDigest(db, createSender(db));
console.log(stats);
if (stats.failed > 0 && stats.emailsSent === 0) process.exit(1);
