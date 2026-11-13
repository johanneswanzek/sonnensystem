// render/scene/extras – Zusätze der Szene: Komet Halley, Kuipergürtel, Lichtpuls.
// Exporte: buildExtras
// Hängt ab von: core/util.js, data/bodies.js, orbit/kepler.js, render/scene.js, core/state.js
// Erzeugt von tools/refactor/split.mjs aus src/sonnensystem.html – bis zum Ende des Umbaus nicht von Hand ändern.

import * as THREE from 'three';
import { S } from '../../core/state.js';
import { TAU } from '../../core/util.js';
import { HALLEY } from '../../data/bodies.js';
import { basis } from '../../orbit/kepler.js';
import { add, marker, orbitLine, scene } from '../scene.js';

function buildExtras(){
  HALLEY.m = basis(HALLEY.el); HALLEY.pos = new THREE.Vector3();
  HALLEY.orbit = orbitLine(HALLEY,900,HALLEY.color,.1,.7); scene.add(HALLEY.orbit);
  HALLEY.dot = marker(HALLEY.color); HALLEY.dot.scale.set(.013,.013,1); scene.add(HALLEY.dot);
  const tg = new THREE.BufferGeometry();
  tg.setAttribute('position', new THREE.BufferAttribute(new Float32Array(6),3));
  tg.setAttribute('color', new THREE.BufferAttribute(new Float32Array([.75,.9,1,0,0,0]),3));
  S.halleyTail = new THREE.Line(tg, new THREE.LineBasicMaterial({vertexColors:true, blending:add, transparent:true, depthWrite:false}));
  S.halleyTail.frustumCulled = false; scene.add(S.halleyTail);
  // Lichtring: breitet sich von der Sonne aus
  const N = 256, pts = new Float32Array(N*3);
  for (let q = 0; q < N; q++) { pts[q*3] = Math.cos(q/N*TAU); pts[q*3+2] = Math.sin(q/N*TAU); }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pts,3));
  S.pulse = new THREE.LineLoop(g, new THREE.LineBasicMaterial({color:0xf3b94d, transparent:true, opacity:0, blending:add, depthWrite:false}));
  S.pulse.frustumCulled = false; scene.add(S.pulse);
}

export { buildExtras };
