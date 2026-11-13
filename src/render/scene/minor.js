// render/scene/minor – Kleinkörper: Vesta, Asteroiden des Gürtels und Felsbrocken beim Durchflug.
// Exporte: buildMinor, flightRocks, rockGeo, scatterFlight, setVesta
// Hängt ab von: app/camera.js, app/tour.js, core/util.js, data/bodies.js, orbit/kepler.js, render/canvas-textures.js, render/scene.js, core/state.js
// Erzeugt von tools/refactor/split.mjs aus src/sonnensystem.html – bis zum Ende des Umbaus nicht von Hand ändern.

import * as THREE from 'three';
import { S } from '../../core/state.js';
import { camAt, desired, tmp2 } from '../../app/camera.js';
import { BELT, cur, durCur } from '../../app/tour.js';
import { DEG, TAU } from '../../core/util.js';
import { BODIES } from '../../data/bodies.js';
import { basis } from '../../orbit/kepler.js';
import { hash, vnoise } from '../canvas-textures.js';
import { marker, orbitLine, scene } from '../scene.js';

// Felsbrocken: verformte Kugel mit glatten Normalen
function rockGeo(seed,detail){
  const g = new THREE.SphereGeometry(1,7+3*detail,4+2*detail), p = g.attributes.position, v = new THREE.Vector3();
  for (let i = 0; i < p.count; i++) {
    v.fromBufferAttribute(p,i).normalize();
    const d = .7+.5*vnoise(v.x*1.6+seed,v.y*1.6,v.z*1.6)+.18*vnoise(v.x*5+seed,v.y*5,v.z*5);
    p.setXYZ(i,v.x*d,v.y*d*.82,v.z*d);
  }
  g.computeVertexNormals();
  return g;
}
let flightRocks = null;
const FLIGHT_N = 120;
const _m4 = new THREE.Matrix4(), _q = new THREE.Quaternion(), _e = new THREE.Euler(), _s = new THREE.Vector3(), _p = new THREE.Vector3();
// Asteroid Vesta mit Begleitern; die Kugel ist nur Platzhalter, bis das Formmodell der NASA geladen ist
function buildMinor(b){
  b.m = basis(b.el); b.period = 36525*360/b.el.dL; b.fitR = b.R; b.fill = .42; b.rMean = 10*Math.pow(b.el.a,.45);
  b.axis = new THREE.Vector3(-Math.sin(b.tilt*DEG),Math.cos(b.tilt*DEG),0);
  b.pivot = new THREE.Group(); b.tiltG = new THREE.Group(); b.tiltG.rotation.z = b.tilt*DEG; b.pivot.add(b.tiltG); scene.add(b.pivot);
  b.mesh = new THREE.Mesh(new THREE.SphereGeometry(b.R,48,32), new THREE.MeshLambertMaterial({color:0xb5aea4, map:S.moonTex})); b.tiltG.add(b.mesh);
  const n = 44, rm = new THREE.InstancedMesh(rockGeo(3,1), new THREE.MeshLambertMaterial({color:0x9a9288}), n);
  for (let i = 0; i < n; i++) {
    const a = hash(i,1,61)*TAU, r = b.R*(2.6+9*hash(i,2,61)), sz = b.R*(.03+.1*Math.pow(hash(i,3,61),2));
    _p.set(Math.cos(a)*r,(hash(i,4,61)-.5)*r*.5,Math.sin(a)*r); _e.set(hash(i,5,61)*6,hash(i,6,61)*6,0); _q.setFromEuler(_e); _s.set(sz,sz*(.6+.6*hash(i,7,61)),sz);
    rm.setMatrixAt(i,_m4.compose(_p,_q,_s));
  }
  rm.frustumCulled = false; b.rocks = rm; b.pivot.add(rm);
  b.dot = marker(b.color); b.pivot.add(b.dot);
  b.orbit = orbitLine(b,400,b.color,.14,.8); scene.add(b.orbit);
  flightRocks = new THREE.InstancedMesh(rockGeo(9,1), new THREE.MeshLambertMaterial({color:0x8f877c}), FLIGHT_N);
  flightRocks.frustumCulled = false; flightRocks.visible = false; scene.add(flightRocks);
}
function setVesta(o){
  let geo = null; o.traverse(m => { if (m.isMesh && !geo) geo = m.geometry; });
  if (!geo) return;
  const b = BODIES[BELT];
  geo = geo.clone(); geo.rotateX(-Math.PI/2); geo.computeBoundingBox();
  const c = geo.boundingBox.getCenter(new THREE.Vector3()), sz = geo.boundingBox.getSize(new THREE.Vector3()), k = 2*b.R/Math.max(sz.x,sz.y,sz.z);
  geo.translate(-c.x,-c.y,-c.z); geo.scale(k,k,k); geo.computeVertexNormals();
  b.mesh.geometry.dispose(); b.mesh.geometry = geo; b.mesh.material = new THREE.MeshLambertMaterial({color:0xbab3a9});
}
// Brocken entlang der kommenden Kamerafahrt verteilen, damit der Flug durch sie hindurchführt
function scatterFlight(){
  for (let i = 0; i < FLIGHT_N; i++) {
    const tr = .14+.7*(i+hash(i,1,71))/FLIGHT_N;
    desired(cur,tr*durCur); camAt(tr,_p,tmp2);
    const a = hash(i,2,71)*TAU, r = .8+3.4*hash(i,4,71), sz = (.03+.26*Math.pow(hash(i,5,71),2.4))*(.5+r*.3);
    _p.x += Math.cos(a)*r; _p.y += (hash(i,3,71)-.5)*1.2*r; _p.z += Math.sin(a)*r;
    _e.set(hash(i,6,71)*6,hash(i,7,71)*6,0); _q.setFromEuler(_e); _s.set(sz,sz*.8,sz*(.7+.5*hash(i,8,71)));
    flightRocks.setMatrixAt(i,_m4.compose(_p,_q,_s));
  }
  flightRocks.instanceMatrix.needsUpdate = true; flightRocks.visible = true;
}

export { buildMinor, flightRocks, rockGeo, scatterFlight, setVesta };
