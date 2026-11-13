// Kleiner statischer HTTP-Server für die Browsertests (run.js und die E2E-Suite).
//   startServer({base, index}) -> Promise<{origin, close()}>
//   base:  Verzeichnis, aus dem Dateien geliefert werden (public/ bzw. dist/)
//   index: Datei, die für / und /index.html geliefert wird (.test/index.html bzw. dist/index.html)
const fs = require('fs'), http = require('http'), path = require('path');

const ROOT = path.resolve(__dirname, '../..');
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.mp3': 'audio/mpeg', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.glb': 'model/gltf-binary', '.json': 'application/json', '.txt': 'text/plain; charset=utf-8' };

function startServer({ base, index }) {
  const srv = http.createServer((q, r) => {
    let u;
    try { u = decodeURIComponent(q.url.split('?')[0]); } catch (e) { r.writeHead(400); return r.end(); }
    const f = u === '/' || u === '/index.html' ? index : path.join(base, u);
    if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { r.writeHead(404); return r.end(); }
    r.writeHead(200, { 'content-type': TYPES[path.extname(f)] || 'application/octet-stream' });
    if (q.method === 'HEAD') return r.end();
    r.end(fs.readFileSync(f));
  });
  return new Promise(ok => srv.listen(0, '127.0.0.1', () => ok({
    origin: 'http://127.0.0.1:' + srv.address().port,
    close: () => new Promise(res => srv.close(res)),
  })));
}

// Baut die Testseite (.test/) oder dist/ mit Python (Umgebungsvariable PYTHON, unter Windows python, sonst python3).
function build(kind, extra = []) {
  const { spawnSync } = require('child_process');
  const py = process.env.PYTHON || (process.platform === 'win32' ? 'python' : 'python3');
  const r = spawnSync(py, [path.join(ROOT, 'tools/build.py')].concat(kind === 'test' ? ['--test'] : [], extra), { stdio: 'inherit' });
  if (r.status !== 0) throw new Error('build.py ist fehlgeschlagen (' + kind + ')');
}

const targets = {
  test: { base: path.join(ROOT, 'public'), index: path.join(ROOT, '.test/index.html') },
  dist: { base: path.join(ROOT, 'dist'), index: path.join(ROOT, 'dist/index.html') },
};

module.exports = { ROOT, startServer, build, targets };
