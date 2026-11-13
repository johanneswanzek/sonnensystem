// Kleiner statischer HTTP-Server und Bau für die E2E-Suite.
//   startServer({bases}) -> Promise<{origin, close()}>   liefert jede Datei aus dem ersten Verzeichnis, das sie hat
//   build('test' | 'dist')                              vite build --mode test (.test/) bzw. vite build (dist/)
const fs = require('fs'), http = require('http'), path = require('path');
const { spawnSync } = require('child_process');

const ROOT = path.resolve(__dirname, '../..');
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.mp3': 'audio/mpeg', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.glb': 'model/gltf-binary', '.json': 'application/json', '.txt': 'text/plain; charset=utf-8' };

function startServer({ bases }) {
  const srv = http.createServer((q, r) => {
    let u;
    try { u = decodeURIComponent(q.url.split('?')[0]); } catch (e) { r.writeHead(400); return r.end(); }
    const rel = u === '/' ? '/index.html' : u;
    const f = bases.map(b => path.join(b, rel)).find(f => f.startsWith(ROOT) && fs.existsSync(f) && fs.statSync(f).isFile());
    if (!f) { r.writeHead(404); return r.end(); }
    r.writeHead(200, { 'content-type': TYPES[path.extname(f)] || 'application/octet-stream' });
    if (q.method === 'HEAD') return r.end();
    r.end(fs.readFileSync(f));
  });
  return new Promise(ok => srv.listen(0, '127.0.0.1', () => ok({
    origin: 'http://127.0.0.1:' + srv.address().port,
    close: () => new Promise(res => srv.close(res)),
  })));
}

// Baut mit Vite (ohne npm-Umweg, damit es unter Windows wie unter Linux gleich läuft)
function build(kind) {
  if (process.env.E2E_NOBUILD && fs.existsSync(path.join(ROOT, kind === 'test' ? '.test' : 'dist', 'index.html'))) return;
  const vite = path.join(ROOT, 'node_modules/vite/bin/vite.js');
  const r = spawnSync(process.execPath, [vite, 'build', '--logLevel', 'warn'].concat(kind === 'test' ? ['--mode', 'test'] : []), { stdio: 'inherit', cwd: ROOT });
  if (r.status !== 0) throw new Error('vite build ist fehlgeschlagen (' + kind + ')');
}

// Testseite: gebautes .test/ (index.html, assets/) und public/ ungebaut; dist/: so, wie es veröffentlicht wird
const targets = {
  test: { bases: [path.join(ROOT, '.test'), path.join(ROOT, 'public')] },
  dist: { bases: [path.join(ROOT, 'dist')] },
};

// Gelieferter Quelltext: index.html und alle Skripte und Stile unter assets/ (für Prüfungen ohne Browser)
function delivered(dir) {
  const d = path.join(ROOT, dir);
  let s = fs.readFileSync(path.join(d, 'index.html'), 'utf8');
  const a = path.join(d, 'assets');
  if (fs.existsSync(a)) for (const f of fs.readdirSync(a).sort()) if (/\.(js|css)$/.test(f)) s += '\n' + fs.readFileSync(path.join(a, f), 'utf8');
  return s;
}

module.exports = { ROOT, startServer, build, targets, delivered };
