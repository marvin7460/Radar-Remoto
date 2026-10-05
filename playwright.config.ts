import { defineConfig, devices } from "@playwright/test";

const PORT = 3100;
export const E2E_ADMIN_TOKEN = "e2e-admin-token-1234567890";

/**
 * End-to-end tests against a production build with a throwaway SQLite file
 * seeded from the real API fixtures (no network). `npm run build` first.
 */
export default defineConfig({
  testDir: "tests/e2e",
  fullyParallel: false,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? "github" : "list",
  use: { baseURL: `http://localhost:${PORT}`, trace: "retain-on-failure", locale: "es-MX" },
  projects: [
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
        // The CI image and the dev sandbox ship their own Chromium.
        launchOptions: process.env.PLAYWRIGHT_CHROMIUM_PATH
          ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_PATH }
          : {},
      },
    },
  ],
  webServer: {
    command: `rm -f e2e.db && npm run db:migrate && npm run db:seed && npx next start -p ${PORT}`,
    url: `http://localhost:${PORT}`,
    reuseExistingServer: false,
    timeout: 120_000,
    env: { TURSO_DATABASE_URL: "file:e2e.db", TURSO_AUTH_TOKEN: "", ADMIN_TOKEN: E2E_ADMIN_TOKEN },
  },
});
