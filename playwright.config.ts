import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: './tests/smoke',
  timeout: 45_000,
  expect: {
    timeout: 10_000,
  },
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [
    ['list'],
    ['html', { outputFolder: 'playwright-report', open: 'never' }],
  ],
  use: {
    baseURL: 'http://127.0.0.1:3000',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  webServer: {
    command: 'npm run start',
    url: 'http://127.0.0.1:3000/api/health',
    timeout: 120_000,
    reuseExistingServer: false,
    env: {
      DATABASE_URL: 'file:./smoke.db',
      AUTH_SECRET: 'smoke-test-auth-secret-that-is-at-least-32-characters',
      NEXTAUTH_SECRET: 'smoke-test-nextauth-secret-that-is-at-least-32-characters',
      CI: '1',
    },
  },
})
