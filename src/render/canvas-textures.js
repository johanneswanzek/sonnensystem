// render/canvas-textures – Kleine Canvas-Texturen: Ringe, Lichtpunkte, Strahlen; Wertrauschen.
// Exporte: hash, radialTex, raysTex, ringTex, vnoise
// Hängt ab von: core/util.js

import * as THREE from 'three';
import { TAU, ss } from '../core/util.js';

/* ---------- Kleine Canvas-Texturen ---------- */
function hash(x, y, z) {
  let h = Math.imul(x, 374761393) ^ Math.imul(y, 668265263) ^ Math.imul(z, 1274126177);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}
function vnoise(x, y, z) {
  const xi = Math.floor(x),
    yi = Math.floor(y),
    zi = Math.floor(z);
  let u = x - xi,
    v = y - yi,
    w = z - zi;
  u = u * u * (3 - 2 * u);
  v = v * v * (3 - 2 * v);
  w = w * w * (3 - 2 * w);
  const a = hash(xi, yi, zi),
    b = hash(xi + 1, yi, zi),
    c = hash(xi, yi + 1, zi),
    d = hash(xi + 1, yi + 1, zi);
  const e = hash(xi, yi, zi + 1),
    f = hash(xi + 1, yi, zi + 1),
    g = hash(xi, yi + 1, zi + 1),
    h = hash(xi + 1, yi + 1, zi + 1);
  const x1 = a + (b - a) * u,
    x2 = c + (d - c) * u,
    x3 = e + (f - e) * u,
    x4 = g + (h - g) * u;
  const y1 = x1 + (x2 - x1) * v,
    y2 = x3 + (x4 - x3) * v;
  return y1 + (y2 - y1) * w;
}
function ringTex() {
  const w = 4096,
    c = document.createElement('canvas');
  c.width = w;
  c.height = 4;
  const ctx = c.getContext('2d'),
    img = ctx.createImageData(w, 4),
    d = img.data,
    c1 = [168, 146, 106],
    c2r = [236, 224, 196];
  for (let x = 0; x < w; x++) {
    const r = x / (w - 1),
      n =
        vnoise(r * 70, 1.5, 2.5) * 0.45 +
        vnoise(r * 260, 4.5, 0.5) * 0.27 +
        vnoise(r * 900, 7.5, 3.5) * 0.16 +
        vnoise(r * 2800, 2.5, 9.5) * 0.12;
    let a = 0.42 + 0.58 * n;
    if (r > 0.3 && r < 0.6) a = Math.min(1, a * 1.25); // dichter, heller B-Ring
    if (r < 0.22) a *= 0.25 + r * 1.5; // schwacher C-Ring
    a *= 1 - 0.94 * ss(0.6, 0.615, r) * (1 - ss(0.66, 0.675, r)); // Cassinische Teilung
    a *= 1 - 0.7 * ss(0.9, 0.905, r) * (1 - ss(0.915, 0.92, r)); // Encke-Lücke
    a *= ss(0, 0.03, r) * (1 - ss(0.97, 1, r));
    for (let y = 0; y < 4; y++) {
      const i = (y * w + x) * 4;
      d[i] = c1[0] + (c2r[0] - c1[0]) * n;
      d[i + 1] = c1[1] + (c2r[1] - c1[1]) * n;
      d[i + 2] = c1[2] + (c2r[2] - c1[2]) * n;
      d[i + 3] = a * 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  return new THREE.CanvasTexture(c);
}
function radialTex(stops) {
  const c = document.createElement('canvas');
  c.width = c.height = 256;
  const ctx = c.getContext('2d'),
    g = ctx.createRadialGradient(128, 128, 0, 128, 128, 128);
  stops.forEach(s => g.addColorStop(s[0], s[1]));
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 256, 256);
  return new THREE.CanvasTexture(c);
}
function raysTex(seed) {
  const c = document.createElement('canvas');
  c.width = c.height = 512;
  const ctx = c.getContext('2d');
  ctx.translate(256, 256);
  for (let i = 0; i < 70; i++) {
    const a = hash(i, seed, 1) * TAU,
      len = 110 + hash(i, seed, 2) * 146,
      wd = 0.012 + hash(i, seed, 3) * 0.05;
    const g = ctx.createRadialGradient(0, 0, 20, 0, 0, len);
    g.addColorStop(0, 'rgba(255,200,120,' + (0.1 + hash(i, seed, 4) * 0.22).toFixed(3) + ')');
    g.addColorStop(1, 'rgba(255,160,60,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.arc(0, 0, len, a - wd, a + wd);
    ctx.closePath();
    ctx.fill();
  }
  return new THREE.CanvasTexture(c);
}

export { hash, radialTex, raysTex, ringTex, vnoise };
