// Eine Datei der E2E-Suite laufen lassen, beide Projekte (testseite und dist, soweit die Datei dort vorgesehen ist).
//   npm run test:e2e:file zeit            -> playwright test tests/e2e/zeit.spec.js
//   npm run test:e2e:file zeit -- --project=testseite
// Ohne Grafikkarte: SOFTWARE_GL=1 (und CHROME_PATH für einen vorhandenen Chrome); E2E_NOBUILD=1 nimmt vorhandene Bauten.
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const [name, ...rest] = process.argv.slice(2);
if (!name) { console.error('Aufruf: npm run test:e2e:file <name> [-- weitere Playwright-Optionen]'); process.exit(1); }
const file = 'tests/e2e/' + name.replace(/^tests\/e2e\//, '').replace(/(\.spec)?\.js$/, '') + '.spec.js';
const cli = path.join(ROOT, 'node_modules/@playwright/test/cli.js');
const r = spawnSync(process.execPath, [cli, 'test', file, ...rest], { stdio: 'inherit', cwd: ROOT });
process.exit(r.status ?? 1);
