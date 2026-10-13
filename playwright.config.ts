import { defineConfig, devices } from '@playwright/test';
import { assertTestContext, testPorts } from './scripts/lib/test-backend.mjs';

assertTestContext();
const browser = process.env.HR_TEST_BROWSER ?? 'chrome';
if (!['chrome', 'chromium'].includes(browser))
  throw new Error('HR_TEST_BROWSER must be chrome or chromium.');

const frontendPort = Number(
  process.env.HR_TEST_FRONTEND_PORT ?? testPorts.frontend,
);
if (
  !Number.isInteger(frontendPort) ||
  frontendPort < 1024 ||
  frontendPort > 65535
)
  throw new Error('HR_TEST_FRONTEND_PORT must be a valid local port.');

export default defineConfig({
  testDir: './tests',
  fullyParallel: false,
  workers: 1,
  use: {
    baseURL: `http://127.0.0.1:${frontendPort}`,
    trace: 'retain-on-failure',
  },
  projects: [
    {
      name: 'desktop',
      use: {
        ...devices['Desktop Chrome'],
        channel: browser === 'chrome' ? 'chrome' : undefined,
      },
    },
    {
      name: 'mobile',
      use: {
        ...devices['Pixel 7'],
        defaultBrowserType: 'chromium',
        channel: browser === 'chrome' ? 'chrome' : undefined,
      },
    },
  ],
  webServer: {
    command: `npm run dev -- --port ${frontendPort} --strictPort`,
    url: `http://127.0.0.1:${frontendPort}`,
    reuseExistingServer: false,
    env: {
      VITE_SUPABASE_URL: process.env.TEST_SUPABASE_URL ?? '',
      VITE_SUPABASE_PUBLISHABLE_KEY:
        process.env.TEST_SUPABASE_PUBLISHABLE_KEY ?? '',
    },
  },
});
