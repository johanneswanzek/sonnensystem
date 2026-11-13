// Bahnmechanik: Kepler-Gleichung und Lage der Bahnen (reine Funktionen aus src/orbit/kepler.js)
import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { basis, place, solve } from '../../src/orbit/kepler.js';

const earth = { el: { a: 1.00000261, e: .01671123, I: -.00001531, L: 100.46457166, w: 102.93768193, O: 0, dL: 35999.37244981 } };

describe('Kepler', () => {
  it('erfüllt die Kepler-Gleichung', () => {
    for (const days of [0, 100, 1000, 10000]) {
      const b = { el: { ...earth.el } };
      const E = solve(b, days);
      const M = ((b.el.L + b.el.dL * days / 36525 - b.el.w) % 360) * Math.PI / 180;
      const d = E - b.el.e * Math.sin(E) - M;
      expect(Math.abs(Math.atan2(Math.sin(d), Math.cos(d)))).toBeLessThan(1e-9);
      expect(b.frac).toBeGreaterThanOrEqual(0);
      expect(b.frac).toBeLessThan(1);
    }
  });
  it('stark exzentrische Bahn (Halley) konvergiert', () => {
    const b = { el: { a: 17.834, e: .96714, I: 162.26, L: 236.16, w: 169.75, O: 58.42, dL: 478.0 } };
    const E = solve(b, 5000);
    expect(Number.isFinite(E)).toBe(true);
    expect(b.r).toBeGreaterThan(0.5);
  });
  it('place staucht den Abstand mit r^0.45', () => {
    const b = { el: { ...earth.el } }; b.m = basis(b.el);
    const out = place(b, solve(b, 0), new THREE.Vector3());
    expect(out.length()).toBeCloseTo(10 * Math.pow(b.r, .45), 6);
  });
  it('Erde am 1. Januar 2000 nahe dem Perihel: 0,9833 AE', () => {
    const b = { el: { ...earth.el } }; solve(b, 0);
    expect(b.r).toBeCloseTo(0.9833, 3);
  });
  it('nach einer Umlaufzeit steht ein Planet wieder an derselben Stelle (Mars, 686,98 Tage)', () => {
    const mars = { el: { a: 1.52371034, e: .0933941, I: 1.84969142, L: -4.55343205, w: -23.94362959, O: 49.55953891, dL: 19140.30268499 } };
    const a = { el: mars.el }, b = { el: mars.el };
    solve(a, 1000); solve(b, 1000 + 686.98);
    expect(Math.abs(a.frac - b.frac)).toBeLessThan(1e-3);
  });
});
