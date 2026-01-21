import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './e2e',
  globalSetup: './playwright.global-setup.ts',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : 2,
  reporter: [
    ['html', { outputFolder: 'verification/playwright-report' }],
    ['json', { outputFile: 'verification/test-results.json' }],
    ['list'],
  ],
  timeout: 60000,
  expect: {
    timeout: 10000,
  },
  use: {
    baseURL: process.env.BASE_URL || 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    actionTimeout: 15000,
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: {
    command: process.env.CI ? 'npm run build && npm start' : 'npm run dev',
    url: process.env.BASE_URL || 'http://localhost:3000',
    // CRITICAL FIX (2026-01-21): Must be FALSE to ensure TEST_MODE is applied!
    // When true, Playwright reuses existing server which may not have TEST_MODE set.
    // This caused 5000+ kie.ai API calls ($50) during US-028 testing.
    reuseExistingServer: false,
    timeout: 180000,
    env: {
      // CRITICAL: Prevent real API calls during tests
      TEST_MODE: 'true',
      NODE_ENV: 'test',
    },
  },
})
