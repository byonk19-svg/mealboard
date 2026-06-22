import { defineConfig, devices } from "@playwright/test";

const port = Number(process.env.PLAYWRIGHT_PORT ?? 3104);
const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? `http://localhost:${port}`;

export default defineConfig({
  expect: {
    timeout: 10_000
  },
  fullyParallel: false,
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] }
    }
  ],
  reporter: [["list"]],
  testDir: "./e2e",
  timeout: 60_000,
  use: {
    baseURL,
    trace: "retain-on-failure"
  },
  webServer: {
    command: `npm run dev -- -p ${port}`,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    url: baseURL
  }
});
