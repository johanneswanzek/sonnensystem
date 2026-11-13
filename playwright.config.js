// E2E-Suite (Playwright), Tests unter tests/e2e/.
//
//   npm run test:e2e                         alle Tests (beide Projekte)
//   npm run test:e2e -- tests/e2e/zeit.spec.js   eine Datei
//   npm run test:e2e:file zeit               dasselbe kürzer (Name ohne .spec.js)
//   npm run test:e2e -- --project=dist       nur die gebaute Website
//
// Zwei Projekte: "testseite" prüft die Testseite mit Prüfhaken (vite build --mode test -> .test/, src/testing/hooks.js),
// "dist" prüft das veröffentlichte dist/ ohne Prüfhaken. tests/e2e/global-setup.js baut beides und startet die Server.
//
// Umgebung (unter Windows mit Grafikkarte nicht nötig):
//   CHROME_PATH    eigener Chrome statt des von Playwright mitgebrachten (npx playwright install chromium)
//   SOFTWARE_GL=1  Software-Rendering für Rechner ohne Grafikkarte (langsam, daher größere Zeitgrenzen)
//   E2E_NOBUILD=1  vorhandene .test/ und dist/ nehmen statt neu zu bauen
import { createRequire } from 'node:module';
import { defineConfig } from '@playwright/test';

const require = createRequire(import.meta.url);
const soft = !!process.env.SOFTWARE_GL;
const args = ['--autoplay-policy=no-user-gesture-required'];
if (soft) args.push('--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist');
if (process.getuid && process.getuid() === 0) args.push('--no-sandbox');

export default defineConfig({
  testDir: 'tests/e2e',
  globalSetup: require.resolve('./tests/e2e/global-setup.js'),
  workers: 1,                       // eine Seite nach der anderen: Software-Rendering braucht den ganzen Prozessor
  fullyParallel: false,
  retries: 0,
  timeout: soft ? 600000 : 180000,  // je Test; das Laden der Seite dauert ohne Grafikkarte bis zu einer Minute
  expect: { timeout: soft ? 60000 : 15000 },
  reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : [['list']],
  use: {
    launchOptions: { executablePath: process.env.CHROME_PATH || undefined, args },
    trace: 'off',
  },
  projects: [
    { name: 'testseite', testIgnore: /build\.spec\.js/ },
    // dist/ hat keine Prüfhaken: nur Abläufe, die über DOM, Netz und Konsole prüfbar sind
    { name: 'dist', testMatch: /(lade|start|sprache|build|robust)\.spec\.js/ },  // musik braucht window.__au.st (nur Testseite)
  ],
});
