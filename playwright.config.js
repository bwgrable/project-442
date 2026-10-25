import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: './tests', testMatch: '**/v8.browser.spec.js', fullyParallel: false, workers: 1,
  timeout: 180000, expect: { timeout: 20000 },
  use: { baseURL: 'http://127.0.0.1:4191', viewport: { width: 1440, height: 1080 },
    launchOptions: { executablePath: process.env.CHROMIUM_PATH || '/usr/bin/chromium', args: ['--no-sandbox', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] },
    screenshot: 'only-on-failure', trace: 'retain-on-failure' },
  webServer: { command: 'npm run preview -- --port 4191', url: 'http://127.0.0.1:4191', reuseExistingServer: !process.env.CI },
});
