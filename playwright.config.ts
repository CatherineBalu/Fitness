import 'dotenv/config';
import { defineConfig, devices } from '@playwright/test';

const STORAGE_STATE = 'playwright/.auth/user.json';

export default defineConfig({
  testDir: './tests-e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : 3,
  reporter: 'html',
  use: {
    baseURL: 'http://localhost:5173',
    trace: 'on-first-retry',
  },

  projects: [
    {
      name: 'setup',
      testMatch: /auth\.setup\.ts/,
    },
    // Run auth tests immediately after setup so the Clerk session is still fresh.
    // Clerk dev JWTs expire in ~60s; running public tests first (~4 min) kills the session.
    {
      name: 'chromium-auth',
      use: {
        ...devices['Desktop Chrome'],
        storageState: STORAGE_STATE,
      },
      testMatch: /\.auth\.spec\.ts$/,
      dependencies: ['setup'],
    },
    {
      name: 'chromium-public',
      use: { ...devices['Desktop Chrome'] },
      testIgnore: [/auth\.setup\.ts/, /\.auth\.spec\.ts$/],
    },
  ],

  webServer: [
    {
      command: 'bun run dev',
      url: 'http://localhost:3001/',
      cwd: './backend',
      reuseExistingServer: !process.env.CI,
      timeout: 60_000,
    },
    {
      command: 'npm run dev',
      url: 'http://localhost:5173',
      cwd: './frontend',
      reuseExistingServer: !process.env.CI,
      timeout: 60_000,
    },
  ],
});
