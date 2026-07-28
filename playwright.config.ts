import { defineConfig, devices } from "@playwright/test";
import "dotenv/config";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  // A single `astro dev` instance struggles under full CPU-core parallelism
  // (observed as an intermittent net::ERR_ABORTED navigation, not a real
  // app bug) — capped so the suite is reliable without needing retries.
  workers: 4,
  retries: 0,
  reporter: [["list"]],
  use: {
    baseURL: "http://localhost:4321",
    trace: "on-first-retry",
  },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
  ],
  webServer: {
    command: "npm run dev -- --port 4321",
    url: "http://localhost:4321",
    reuseExistingServer: !process.env.CI,
    timeout: 30000,
  },
});
