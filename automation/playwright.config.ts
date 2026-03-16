import { defineConfig, devices } from '@playwright/test';


export default defineConfig({
  testDir: './tests',
  timeout: 40_000,
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 2 : undefined,
  reporter: [
    ["list"],
    ["html", { outputFolder: "playwright-report", open: "never" }],
  ],
  use: {
    baseURL: "http://uitestingplayground.com",
    screenshot: "only-on-failure",
    trace: 'on-first-retry',
    viewport: { width: 1280, height: 720 },
    headless: process.env.HEADLESS !== "false",
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
