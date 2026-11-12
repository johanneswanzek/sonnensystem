// Dreiecke der beiden größten NASA-Modelle reduzieren (Rover, Druckrover). Wurde einmal auf die Originale angewendet;
// die Ergebnisse liegen in public/models. Zum Wiederholen die Originale nach work/models-src/ legen.
//
//   cd tools/models && npm install && node slim.mjs        -> work/models-slim/*.glb
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { dedup, weld, simplify, prune, join, flatten } from '@gltf-transform/functions';
import { MeshoptSimplifier } from 'meshoptimizer';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const IN = path.join(ROOT, 'work/models-src'), OUT = path.join(ROOT, 'work/models-slim');
fs.mkdirSync(OUT, { recursive: true });
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS);
await MeshoptSimplifier.ready;
const tris = doc => { let n = 0, p2 = 0; for (const m of doc.getRoot().listMeshes()) for (const p of m.listPrimitives()) { p2++; const i = p.getIndices(); n += (i ? i.getCount() : p.getAttribute('POSITION').getCount()) / 3; } return Math.round(n) + ' tris ' + p2 + ' prims'; };
for (const [n, ratio, err] of [['rover', .45, .012], ['sev', .4, .012]]) {
  const doc = await io.read(path.join(IN, n + '.glb'));
  const b = tris(doc);
  await doc.transform(dedup(), flatten(), join(), weld(), simplify({ simplifier: MeshoptSimplifier, ratio, error: err }), prune());
  await io.write(path.join(OUT, n + '.glb'), doc);
  console.log(n, b, '->', tris(doc), (fs.statSync(path.join(OUT, n + '.glb')).size / 1048576).toFixed(2), 'MB');
}
