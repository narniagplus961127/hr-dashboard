import { defineConfig, devices } from '@playwright/test';
import { loadEnvFile } from 'node:process';
import { existsSync } from 'node:fs';

if (existsSync('.env.test.local')) loadEnvFile('.env.test.local');

export default defineConfig({
  testDir: './tests',
  fullyParallel: false,
  workers: 1,
  use: { baseURL: 'http://127.0.0.1:5174', trace: 'retain-on-failure' },
  projects: [
    {
      name: 'desktop',
      use: { ...devices['Desktop Chrome'], channel: 'chrome' },
    },
    {
      name: 'mobile',
      use: {
        ...devices['Pixel 7'],
        defaultBrowserType: 'chromium',
        channel: 'chrome',
      },
    },
  ],
  webServer: {
    command: 'npm run dev -- --port 5174 --strictPort',
    url: 'http://127.0.0.1:5174',
    reuseExistingServer: false,
    env: {
      VITE_SUPABASE_URL: process.env.TEST_SUPABASE_URL ?? '',
      VITE_SUPABASE_PUBLISHABLE_KEY:
        process.env.TEST_SUPABASE_PUBLISHABLE_KEY ?? '',
    },
  },
});
