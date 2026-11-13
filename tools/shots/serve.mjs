// Liefert die Testseite aus: zuerst .test/ (index.html, assets/), sonst public/. Für Playwright (webServer).
//   node tools/shots/serve.mjs [Port]
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const BASES = [path.join(ROOT, '.test'), path.join(ROOT, 'public')];
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.mp3': 'audio/mpeg', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.glb': 'model/gltf-binary', '.json': 'application/json' };
const port = +process.argv[2] || 4173;
http.createServer((q, r) => {
  const u = decodeURIComponent(q.url.split('?')[0]);
  const rel = u === '/' ? '/index.html' : u;
  const f = BASES.map(b => path.join(b, rel)).find(f => f.startsWith(ROOT) && fs.existsSync(f) && fs.statSync(f).isFile());
  if (!f) { r.writeHead(404); return r.end(); }
  r.writeHead(200, { 'content-type': TYPES[path.extname(f)] || 'application/octet-stream' });
  r.end(fs.readFileSync(f));
}).listen(port, '127.0.0.1', () => console.log('Testseite auf http://127.0.0.1:' + port + '/'));
