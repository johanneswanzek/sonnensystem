// Playwright: E2E-Tests unter tests/e2e (Phase B: Suite aus tools/test/e2e übernehmen).
// Die Testseite baut `npm run build:test` (.test/, mit Prüfhaken); ausgeliefert wird sie zusammen mit public/
// von tools/shots/serve.mjs. Ohne Grafikkarte: SOFTWARE_GL=1, CHROME_PATH für einen vorhandenen Chrome.
import { defineConfig } from '@playwright/test';

const args = ['--autoplay-policy=no-user-gesture-required'];
if (process.env.SOFTWARE_GL) args.push('--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist');

export default defineConfig({
  testDir: 'tests/e2e',
  timeout: 10 * 60 * 1000,
  workers: 1,
  retries: 0,
  reporter: [['list']],
  use: {
    baseURL: 'http://127.0.0.1:4173/',
    locale: 'de-DE',
    launchOptions: { executablePath: process.env.CHROME_PATH || undefined, args },
  },
  webServer: {
    command: 'npm run build:test && node tools/shots/serve.mjs 4173',
    url: 'http://127.0.0.1:4173/',
    timeout: 5 * 60 * 1000,
    reuseExistingServer: true,
  },
});
