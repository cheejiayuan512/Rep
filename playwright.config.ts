/**
 * Browser tests. These open the real app in Chrome and click through it.
 * `npm test` checks the workout math with no browser. `npm run test:e2e` uses this file.
 *
 * The first run needs a browser: `npx playwright install chromium`
 */
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: 'e2e',
  timeout: 60_000,
  expect: { timeout: 15_000 },
  fullyParallel: false,
  retries: 0,
  use: {
    baseURL: 'http://localhost:8081',
    trace: 'on-first-retry',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: 'npx expo start --web --port 8081',
    url: 'http://localhost:8081',
    reuseExistingServer: true,
    timeout: 180_000,
    env: { EXPO_NO_TELEMETRY: '1' },
  },
});
