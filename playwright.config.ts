import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: './tests', fullyParallel: false,
  use: { baseURL: 'http://127.0.0.1:8081', browserName: 'chromium', viewport: { width: 390, height: 844 } },
  webServer: { command: 'node scripts/serve.cjs', url: 'http://127.0.0.1:8081', reuseExistingServer: true },
});
