import { config } from "dotenv";

// .env.local for local dev; in GitHub Actions the vars come from secrets.
config({ path: ".env.local", quiet: true });
