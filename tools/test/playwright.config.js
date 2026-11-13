// Konfiguration der E2E-Suite.   cd tools/test && npm install && npx playwright install chromium && npm test
//
// Zwei Projekte: "testseite" prüft die Testseite mit Prüfhaken (.test/index.html, siehe hooks() in tools/build.py),
// "dist" prüft das veröffentlichte dist/ ohne Prüfhaken. global-setup.js baut beides und startet die Server.
//
// Umgebung:  CHROME_PATH    eigener Chrome statt des von Playwright mitgebrachten
//            SOFTWARE_GL=1  Software-Rendering für Rechner ohne Grafikkarte (langsam, daher größere Zeitgrenzen)
//            PYTHON         Python-Programm für tools/build.py (Vorgabe: python unter Windows, sonst python3)
const { defineConfig } = require('playwright/test');

const soft = !!process.env.SOFTWARE_GL;
const args = ['--autoplay-policy=no-user-gesture-required'];
if (soft) args.push('--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist');
if (process.getuid && process.getuid() === 0) args.push('--no-sandbox');

module.exports = defineConfig({
  testDir: './e2e',
  globalSetup: require.resolve('./e2e/global-setup.js'),
  workers: 1,                       // eine Seite nach der anderen: Software-Rendering braucht den ganzen Prozessor
  fullyParallel: false,
  retries: 0,
  timeout: soft ? 600000 : 180000,  // je Test; das Laden der Seite dauert ohne Grafikkarte bis zu einer Minute
  expect: { timeout: soft ? 60000 : 15000 },
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    launchOptions: { executablePath: process.env.CHROME_PATH || undefined, args },
    trace: 'off',
  },
  projects: [
    { name: 'testseite', testIgnore: /build\.spec\.js/ },
    // dist/ hat keine Prüfhaken: nur Abläufe, die über DOM, Netz und Konsole prüfbar sind
    { name: 'dist', testMatch: /(lade|start|sprache|build|robust)\.spec\.js/ },
  ],
});
