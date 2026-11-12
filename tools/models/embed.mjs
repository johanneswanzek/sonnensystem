// GLB -> glTF als JSON mit eingebetteten Daten (Standardform "glTF Embedded").
// Nur für die Fassung als claude.ai-Artefakt nötig: dort werden .glb-Dateien nicht ausgeliefert, .json schon.
//
//   cd tools/models && npm install && node embed.mjs        -> .artifact/models/*.json
import { NodeIO, Format } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const IN = path.join(ROOT, 'public/models'), OUT = path.join(ROOT, '.artifact/models');
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS);
const MIME = { jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png' };
fs.mkdirSync(OUT, { recursive: true });
for (const n of ['vesta','hdu1','sev','dish','astronaut','rover','heli']) {
  const doc = await io.read(path.join(IN, n + '.glb'));
  const { json, resources } = await io.writeJSON(doc, { format: Format.GLTF, basename: n });
  for (const b of json.buffers || []) { b.uri = 'data:application/octet-stream;base64,' + Buffer.from(resources[b.uri]).toString('base64'); }
  for (const im of json.images || []) if (im.uri) { const ext = im.uri.split('.').pop().toLowerCase(); im.uri = 'data:' + (im.mimeType || MIME[ext]) + ';base64,' + Buffer.from(resources[im.uri]).toString('base64'); }
  const out = JSON.stringify(json);
  fs.writeFileSync(path.join(OUT, n + '.json'), out);
  console.log(n.padEnd(10), (out.length / 1048576).toFixed(2), 'MB', 'buffers', (json.buffers || []).length, 'images', (json.images || []).length, 'ext', (json.extensionsUsed || []).join(','));
}
