import { defineConfig, devices } from '@playwright/test'

const baseURL = process.env.BASE_URL || 'http://localhost:3000'
const usesExternalBaseURL = !baseURL.includes('localhost') && !baseURL.includes('127.0.0.1')
const chromiumExecutablePath = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH || '/usr/bin/chromium'

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  use: {
    baseURL,
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        launchOptions: {
          executablePath: chromiumExecutablePath,
          args: ['--no-sandbox'],
        },
      },
    },
  ],
  webServer: usesExternalBaseURL
    ? undefined
    : {
        command: 'npm run start',
        url: 'http://localhost:3000',
        reuseExistingServer: !process.env.CI,
        timeout: 120 * 1000,
      },
})
