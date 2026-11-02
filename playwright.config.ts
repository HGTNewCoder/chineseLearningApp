import { defineConfig, devices } from '@playwright/test';

const CI = Boolean(process.env.CI);
// Locally, use the installed Chrome instead of downloading Playwright's Chromium.
const channel = CI ? undefined : 'chrome';

export default defineConfig({
  testDir: 'e2e',
  fullyParallel: true,
  forbidOnly: CI,
  retries: CI ? 1 : 0,
  reporter: CI ? [['github'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL: 'http://localhost:4173',
    trace: 'retain-on-failure',
  },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'], channel } },
    { name: 'mobile', use: { ...devices['Pixel 7'], channel } },
  ],
  // Tests run against the production build (`npm run build` first).
  webServer: {
    command: 'npx vite preview --port 4173 --strictPort',
    port: 4173,
    reuseExistingServer: !CI,
  },
});
