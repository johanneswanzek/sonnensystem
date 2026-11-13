// orbit/kepler – Bahnmechanik: Kepler-Bahnen aus Bahnelementen für ein Datum (reine Funktionen).
// Exporte: basis, place, solve
// Hängt ab von: core/util.js

import { DEG, TAU } from '../core/util.js';

/* ---------- Bahnmechanik ---------- */
function basis(el) {
  const w = (el.w - el.O) * DEG,
    O = el.O * DEG,
    I = el.I * DEG;
  const cw = Math.cos(w),
    sw = Math.sin(w),
    cO = Math.cos(O),
    sO = Math.sin(O),
    cI = Math.cos(I),
    sI = Math.sin(I);
  return [
    cw * cO - sw * sO * cI,
    -sw * cO - cw * sO * cI,
    cw * sO + sw * cO * cI,
    -sw * sO + cw * cO * cI,
    sw * sI,
    cw * sI,
  ];
}
// Position aus exzentrischer Anomalie; Ekliptik (x,y,z) -> Szene (x,z,-y); Radius gestaucht mit r^0.45
function place(b, E, out) {
  const el = b.el,
    m = b.m;
  const xp = el.a * (Math.cos(E) - el.e),
    yp = el.a * Math.sqrt(1 - el.e * el.e) * Math.sin(E);
  out.set(m[0] * xp + m[1] * yp, m[4] * xp + m[5] * yp, -(m[2] * xp + m[3] * yp));
  const r = out.length();
  return out.multiplyScalar((10 * Math.pow(r, 0.45)) / r);
}
// Kepler-Gleichung (Newton); setzt b.E, b.frac (Anteil des Umlaufs seit Perihel), b.r (Sonnenabstand in AE)
function solve(b, days) {
  const el = b.el;
  let M = ((el.L + (el.dL * days) / 36525 - el.w) % 360) * DEG;
  M = ((M % TAU) + TAU) % TAU;
  b.frac = M / TAU;
  let m = M > Math.PI ? M - TAU : M;
  const s = m < 0 ? -1 : 1;
  m = Math.abs(m);
  let E = el.e > 0.8 ? Math.PI : m + el.e * Math.sin(m);
  for (let i = 0; i < 14; i++) E -= (E - el.e * Math.sin(E) - m) / (1 - el.e * Math.cos(E));
  E *= s;
  b.E = E;
  b.r = el.a * (1 - el.e * Math.cos(E));
  return E;
}

export { basis, place, solve };
