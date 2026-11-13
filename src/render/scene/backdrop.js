// render/scene/backdrop – Hintergrund: Sterne und Milchstraße.
// Exporte: buildBackdrop
// Hängt ab von: core/util.js, render/canvas-textures.js, render/post.js, render/scene.js, core/state.js

import * as THREE from 'three';
import { S } from '../../core/state.js';
import { DEG, TAU } from '../../core/util.js';
import { hash } from '../canvas-textures.js';
import { POST } from '../post.js';
import { add, points, scene } from '../scene.js';

function buildBackdrop() {
  // Sterne, dazu das Band der Milchstraße (rund 60° gegen die Ekliptik geneigt)
  scene.add(
    points(
      2400,
      (i, o) => {
        const u = hash(i, 1, 7) * 2 - 1,
          a = hash(i, 2, 7) * TAU,
          s = Math.sqrt(1 - u * u),
          k = 0.2 + 0.8 * Math.pow(hash(i, 3, 7), 3),
          w = hash(i, 4, 7);
        // Farbe nach Spektralklasse: wenige blauweiße, viele gelbliche und orange Sterne
        const t =
          w < 0.12
            ? [0.72, 0.82, 1]
            : w < 0.3
              ? [0.9, 0.94, 1]
              : w < 0.7
                ? [1, 0.95, 0.86]
                : w < 0.9
                  ? [1, 0.85, 0.66]
                  : [1, 0.72, 0.5];
        o[0] = 2000 * s * Math.cos(a);
        o[1] = 2000 * u;
        o[2] = 2000 * s * Math.sin(a);
        o[3] = k * t[0];
        o[4] = k * t[1];
        o[5] = k * t[2];
      },
      1.7,
    ),
  );
  const band = points(
    3600,
    (i, o) => {
      const a = hash(i, 5, 9) * TAU,
        g = (hash(i, 6, 9) + hash(i, 7, 9) + hash(i, 8, 9) - 1.5) * 0.24,
        s = Math.cos(g),
        k = 0.12 + 0.3 * hash(i, 9, 9);
      o[0] = 2000 * s * Math.cos(a);
      o[1] = 2000 * Math.sin(g);
      o[2] = 2000 * s * Math.sin(a);
      o[3] = k;
      o[4] = k * 0.95;
      o[5] = k * 1.1;
    },
    1.2,
  );
  band.rotation.set(60 * DEG, 0, 0.5);
  scene.add(band);
  if (S.milkyTex) {
    const sky = new THREE.Mesh(
      new THREE.SphereGeometry(1900, 64, 32),
      new THREE.MeshBasicMaterial({
        map: S.milkyTex,
        side: THREE.BackSide,
        blending: add,
        transparent: true,
        opacity: 0.075,
        depthWrite: false,
      }),
    );
    sky.rotation.copy(band.rotation);
    sky.renderOrder = -1;
    scene.add(sky);
  }
  scene.add(
    points(
      70,
      (i, o) => {
        const u = hash(i, 11, 3) * 2 - 1,
          a = hash(i, 12, 3) * TAU,
          s = Math.sqrt(1 - u * u),
          w = hash(i, 13, 3);
        const k = POST.ok ? 1.5 : 1; // die hellsten Sterne strahlen leicht über den Bloom
        o[0] = 2000 * s * Math.cos(a);
        o[1] = 2000 * u;
        o[2] = 2000 * s * Math.sin(a);
        o[3] = (0.8 + 0.2 * w) * k;
        o[4] = 0.9 * k;
        o[5] = (1 - 0.25 * w) * k;
      },
      2.6,
    ),
  );
  // Asteroidengürtel (2,1 bis 3,3 AE) und Kuipergürtel (39 bis 50 AE)
  S.belt = points(
    1400,
    (i, o) => {
      const au = 2.1 + (1.2 * (hash(i, 1, 21) + hash(i, 2, 21))) / 2,
        a = hash(i, 3, 21) * TAU,
        r = 10 * Math.pow(au, 0.45),
        k = 0.35 + 0.5 * hash(i, 5, 21);
      o[0] = r * Math.cos(a);
      o[1] = (hash(i, 4, 21) - 0.5) * 0.9;
      o[2] = r * Math.sin(a);
      o[3] = k;
      o[4] = k * 0.95;
      o[5] = k * 0.85;
    },
    1,
    0xffffff,
    0.38,
  );
  scene.add(S.belt);
  S.kuiper = points(
    1800,
    (i, o) => {
      const au = 39 + 11 * hash(i, 1, 31),
        a = hash(i, 3, 31) * TAU,
        r = 10 * Math.pow(au, 0.45),
        k = 0.25 + 0.4 * hash(i, 5, 31);
      o[0] = r * Math.cos(a);
      o[1] = (hash(i, 4, 31) - 0.5) * 5;
      o[2] = r * Math.sin(a);
      o[3] = k * 0.8;
      o[4] = k * 0.9;
      o[5] = k * 1.1;
    },
    1.1,
    0xffffff,
    0.55,
  );
  scene.add(S.kuiper);
}

export { buildBackdrop };
