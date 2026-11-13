// render/scene – Weltraumszene: Kamera, Sterne, Sonne, Planeten, Ringe, Monde, Asteroiden, Komet.
// Exporte: belt, blackTex, buildBackdrop, buildExtras, buildMinor, buildPlanet, buildSun, camera, flightRocks, halleyTail, kuiper, pulse, rays, rockGeo, scatterFlight, scene, setVesta, sunMat; initScene
// Hängt ab von: app/camera.js, app/tour.js, core/util.js, data/bodies.js, orbit/kepler.js, render/canvas-textures.js, render/renderer.js, render/shaders/space.js, core/state.js
// Erzeugt von tools/refactor/split.mjs aus src/sonnensystem.html – bis zum Ende des Umbaus nicht von Hand ändern.

import * as THREE from 'three';
import { S } from '../core/state.js';
import { camAt, desired, tmp2 } from '../app/camera.js';
import { BELT, cur, durCur } from '../app/tour.js';
import { DEG, TAU } from '../core/util.js';
import { BODIES, HALLEY } from '../data/bodies.js';
import { basis, place } from '../orbit/kepler.js';
import { hash, radialTex, raysTex, ringTex, vnoise } from './canvas-textures.js';
import { renderer } from './renderer.js';
import { CLOUD_FS, HALO_FS, LAYER_FS, ORBIT_FS, ORBIT_VS, PLANET_FS, RING_FS, SUN_FS, VS } from './shaders/space.js';

// Belegt in initScene() (Reihenfolge des Starts, siehe main.js)
let scene, camera, blackTex, dotTex;

const add = THREE.AdditiveBlending;
let sunMat, rays = [], belt, kuiper, pulse, halleyTail;

function points(n,fn,size,color,opacity){
  const p = new Float32Array(n*3), c = new Float32Array(n*3), o = [0,0,0,1,1,1];
  for (let i = 0; i < n; i++) { fn(i,o); p[i*3] = o[0]; p[i*3+1] = o[1]; p[i*3+2] = o[2]; c[i*3] = o[3]; c[i*3+1] = o[4]; c[i*3+2] = o[5]; }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(p,3));
  g.setAttribute('color', new THREE.BufferAttribute(c,3));
  const m = new THREE.Points(g, new THREE.PointsMaterial({size, sizeAttenuation:false, vertexColors:true, color:color || 0xffffff, transparent:true, opacity:opacity == null ? 1 : opacity, depthWrite:false}));
  m.frustumCulled = false;
  return m;
}
function halo(radius,inner,color,k,self){
  const s = radius/inner;
  return new THREE.Mesh(new THREE.SphereGeometry(radius,64,40), new THREE.ShaderMaterial({
    uniforms:{color:{value:new THREE.Color(color[0],color[1],color[2])}, k:{value:k}, edge:{value:Math.sqrt(1-1/(s*s))}, self:{value:self}},
    vertexShader:VS, fragmentShader:HALO_FS, side:THREE.BackSide, blending:add, transparent:true, depthWrite:false}));
}
function orbitLine(o,N,color,base,trail){
  const pts = new Float32Array((N+1)*3), us = new Float32Array(N+1), v = new THREE.Vector3();
  for (let k = 0; k <= N; k++) { place(o, k/N*TAU, v); pts[k*3] = v.x; pts[k*3+1] = v.y; pts[k*3+2] = v.z; us[k] = k/N; }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pts,3));
  g.setAttribute('u', new THREE.BufferAttribute(us,1));
  const l = new THREE.Line(g, new THREE.ShaderMaterial({
    uniforms:{head:{value:0}, color:{value:new THREE.Color(color)}, base:{value:base}, trail:{value:trail}, gap:{value:.00001}, nearF:{value:.0001}},
    vertexShader:ORBIT_VS, fragmentShader:ORBIT_FS, blending:add, transparent:true, depthWrite:false}));
  l.frustumCulled = false;
  return l;
}
function marker(color){
  const s = new THREE.Sprite(new THREE.SpriteMaterial({map:dotTex, color, sizeAttenuation:false, blending:add, transparent:true, depthWrite:false}));
  s.scale.set(.02,.02,1);
  return s;
}

function buildBackdrop(){
  // Sterne, dazu das Band der Milchstraße (rund 60° gegen die Ekliptik geneigt)
  scene.add(points(2400,(i,o) => {
    const u = hash(i,1,7)*2-1, a = hash(i,2,7)*TAU, s = Math.sqrt(1-u*u), k = .2+.8*Math.pow(hash(i,3,7),3), w = hash(i,4,7);
    o[0] = 2000*s*Math.cos(a); o[1] = 2000*u; o[2] = 2000*s*Math.sin(a); o[3] = k*(.85+.15*w); o[4] = k*.9; o[5] = k*(1-.15*w);
  },1.7));
  const band = points(3600,(i,o) => {
    const a = hash(i,5,9)*TAU, g = (hash(i,6,9)+hash(i,7,9)+hash(i,8,9)-1.5)*.24, s = Math.cos(g), k = .12+.3*hash(i,9,9);
    o[0] = 2000*s*Math.cos(a); o[1] = 2000*Math.sin(g); o[2] = 2000*s*Math.sin(a); o[3] = k; o[4] = k*.95; o[5] = k*1.1;
  },1.2);
  band.rotation.set(60*DEG,0,.5); scene.add(band);
  scene.add(points(70,(i,o) => {
    const u = hash(i,11,3)*2-1, a = hash(i,12,3)*TAU, s = Math.sqrt(1-u*u), w = hash(i,13,3);
    o[0] = 2000*s*Math.cos(a); o[1] = 2000*u; o[2] = 2000*s*Math.sin(a); o[3] = .8+.2*w; o[4] = .9; o[5] = 1-.25*w;
  },2.6));
  // Asteroidengürtel (2,1 bis 3,3 AE) und Kuipergürtel (39 bis 50 AE)
  belt = points(1400,(i,o) => {
    const au = 2.1+1.2*(hash(i,1,21)+hash(i,2,21))/2, a = hash(i,3,21)*TAU, r = 10*Math.pow(au,.45), k = .35+.5*hash(i,5,21);
    o[0] = r*Math.cos(a); o[1] = (hash(i,4,21)-.5)*.9; o[2] = r*Math.sin(a); o[3] = k; o[4] = k*.95; o[5] = k*.85;
  },1,0xffffff,.38);
  scene.add(belt);
  kuiper = points(1800,(i,o) => {
    const au = 39+11*hash(i,1,31), a = hash(i,3,31)*TAU, r = 10*Math.pow(au,.45), k = .25+.4*hash(i,5,31);
    o[0] = r*Math.cos(a); o[1] = (hash(i,4,31)-.5)*5; o[2] = r*Math.sin(a); o[3] = k*.8; o[4] = k*.9; o[5] = k*1.1;
  },1.1,0xffffff,.55);
  scene.add(kuiper);
}

function buildSun(b){
  sunMat = new THREE.ShaderMaterial({uniforms:{time:{value:0}}, vertexShader:VS, fragmentShader:SUN_FS});
  b.mesh = new THREE.Mesh(new THREE.SphereGeometry(b.R,64,48), sunMat);
  b.fitR = b.R;
  scene.add(b.mesh);
  scene.add(halo(b.R*1.55,b.R,[1,.5,.14],1.15,1));
  const glow = new THREE.Sprite(new THREE.SpriteMaterial({map:radialTex([[0,'rgba(255,214,130,.9)'],[.28,'rgba(255,170,60,.42)'],[.55,'rgba(255,130,30,.12)'],[1,'rgba(255,110,20,0)']]), blending:add, depthWrite:false, transparent:true}));
  glow.scale.set(13,13,1); scene.add(glow);
  const wide = new THREE.Sprite(glow.material.clone()); wide.scale.set(27,27,1); wide.userData.op = 1; scene.add(wide); rays.push(wide);
  [1,2].forEach(k => {
    const s = new THREE.Sprite(new THREE.SpriteMaterial({map:raysTex(k), blending:add, depthWrite:false, transparent:true, opacity:k === 1 ? .5 : .35}));
    s.scale.set(30+k*5,30+k*5,1); s.userData.op = k === 1 ? .5 : .35; scene.add(s); rays.push(s);
  });
}

function buildPlanet(b){
  b.m = basis(b.el);
  b.period = 36525*360/b.el.dL;
  b.fitR = b.fitR || b.R; b.fill = b.fill || .42;
  b.rMean = 10*Math.pow(b.el.a,.45);
  b.axis = new THREE.Vector3(-Math.sin(b.tilt*DEG), Math.cos(b.tilt*DEG), 0);
  b.pivot = new THREE.Group(); b.tiltG = new THREE.Group(); b.tiltG.rotation.z = b.tilt*DEG;
  b.pivot.add(b.tiltG); scene.add(b.pivot);
  const at = b.atmo || [0,0,0,0];
  const defs = b.aux ? {EARTH:1} : {};
  b.cut = new THREE.Vector2(0,0); b.ccut = new THREE.Vector2(0,0);
  b.mesh = new THREE.Mesh(new THREE.SphereGeometry(b.R,128,80), new THREE.ShaderMaterial({defines:defs,
    uniforms:{map:{value:b.map}, nmap:{value:b.ntex || blackTex}, aux:{value:b.aux || blackTex}, nightK:{value:b.ntex ? 1 : 0}, specK:{value:b.spec || 0}, bumpK:{value:b.bump || 0}, gas:{value:b.gas || 0},
      texel:{value:b.map.texelStep}, atmo:{value:new THREE.Vector4(at[0],at[1],at[2],at[3])}, cut:{value:b.cut}, cloud:{value:new THREE.Vector2(0,0)},
      center:{value:b.pos}, ringN:{value:b.axis}, ringR:{value:new THREE.Vector3(b.R*1.22,b.R*2.3,b.id === 'saturn' ? 1 : 0)}},
    vertexShader:VS, fragmentShader:PLANET_FS}));
  b.tiltG.add(b.mesh);
  if (b.ctex) {
    b.clouds = new THREE.Mesh(new THREE.SphereGeometry(b.R*1.015,96,64), new THREE.ShaderMaterial({defines:defs,
      uniforms:{map:{value:b.ctex}, op:{value:1}, cut:{value:b.ccut}}, vertexShader:VS, fragmentShader:CLOUD_FS, transparent:true, depthWrite:false}));
    b.tiltG.add(b.clouds);
  }
  if (b.id === 'earth') {
    // Zwei Halbscheiben als Schnittflächen; sie klappen mit dem Keil auf
    b.layerMat = new THREE.ShaderMaterial({uniforms:{time:{value:0}, R:{value:b.R}, lit:{value:new THREE.Vector4(0,0,0,0)}}, vertexShader:VS, fragmentShader:LAYER_FS, side:THREE.DoubleSide});
    const fg = new THREE.CircleGeometry(b.R*.999,128,-Math.PI/2,Math.PI);
    b.faces = [new THREE.Mesh(fg,b.layerMat), new THREE.Mesh(fg,b.layerMat)];
    b.faces.forEach(f => { f.visible = false; b.mesh.add(f); });
  }
  if (b.atmo) b.pivot.add(halo(b.R*1.14,b.R,at,at[3],0));
  if (b.id === 'earth') b.pivot.add(halo(b.R*1.04,b.R,[.6,.8,1],.75,0));      // dünner, heller Saum direkt am Rand
  if (b.id === 'saturn') {
    const inner = b.R*1.22, outer = b.R*2.3, rg = new THREE.RingGeometry(inner,outer,160,1);
    const pa = rg.attributes.position, ua = rg.attributes.uv, v = new THREE.Vector3();
    for (let k = 0; k < pa.count; k++) { v.fromBufferAttribute(pa,k); ua.setXY(k,(v.length()-inner)/(outer-inner),.5); }
    b.ringMat = new THREE.ShaderMaterial({uniforms:{map:{value:ringTex()}, center:{value:b.pos}, R:{value:b.R}},
      vertexShader:VS, fragmentShader:RING_FS, transparent:true, side:THREE.DoubleSide, depthWrite:false});
    const ring = new THREE.Mesh(rg, b.ringMat);
    ring.rotation.x = -Math.PI/2; b.tiltG.add(ring);
  }
  if (b.id === 'uranus') {
    const ring = new THREE.Mesh(new THREE.RingGeometry(b.R*1.94,b.R*1.965,160,1), new THREE.MeshBasicMaterial({color:0x9fb7bd, transparent:true, opacity:.32, side:THREE.DoubleSide, depthWrite:false}));
    ring.rotation.x = -Math.PI/2; b.tiltG.add(ring);
  }
  (b.sats || []).forEach((s,k) => {
    const parent = s.ecl ? b.pivot : b.tiltG;
    s.mesh = new THREE.Mesh(new THREE.SphereGeometry(s.r,32,20), new THREE.MeshLambertMaterial({color:s.c, map:S.moonTex}));
    s.world = new THREE.Vector3(); s.ph = hash(k,3,b.diam)*TAU; s.vis = 0;
    s.rgb = (s.c >> 16 & 255) + ',' + (s.c >> 8 & 255) + ',' + (s.c & 255);
    parent.add(s.mesh);
    const N = 128, pts = new Float32Array(N*3);
    for (let q = 0; q < N; q++) { pts[q*3] = b.R*s.a*Math.cos(q/N*TAU); pts[q*3+2] = b.R*s.a*Math.sin(q/N*TAU); }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pts,3));
    parent.add(new THREE.LineLoop(g, new THREE.LineBasicMaterial({color:s.c, transparent:true, opacity:.22, depthWrite:false})));
  });
  // Jeder weitere bekannte Mond als ein Lichtpunkt
  const extra = b.moons-(b.sats ? b.sats.length : 0);
  if (extra > 0) {
    b.swarm = points(extra,(i,o) => {
      const u = hash(i,1,b.diam)*2-1, a = hash(i,2,b.diam)*TAU, s = Math.sqrt(1-u*u), r = b.R*(2.5+1.6*hash(i,3,b.diam)), k = .5+.5*hash(i,4,b.diam);
      o[0] = r*s*Math.cos(a); o[1] = r*u*.5; o[2] = r*s*Math.sin(a); o[3] = k; o[4] = k; o[5] = k*.92;
    },1.7,0xffffff,0);
    b.swarm.visible = false; b.pivot.add(b.swarm);
  }
  b.dot = marker(b.color); b.pivot.add(b.dot);
  b.orbit = orbitLine(b,400,b.color,.2,1);
  scene.add(b.orbit);
}

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
function buildExtras(){
  HALLEY.m = basis(HALLEY.el); HALLEY.pos = new THREE.Vector3();
  HALLEY.orbit = orbitLine(HALLEY,900,HALLEY.color,.1,.7); scene.add(HALLEY.orbit);
  HALLEY.dot = marker(HALLEY.color); HALLEY.dot.scale.set(.013,.013,1); scene.add(HALLEY.dot);
  const tg = new THREE.BufferGeometry();
  tg.setAttribute('position', new THREE.BufferAttribute(new Float32Array(6),3));
  tg.setAttribute('color', new THREE.BufferAttribute(new Float32Array([.75,.9,1,0,0,0]),3));
  halleyTail = new THREE.Line(tg, new THREE.LineBasicMaterial({vertexColors:true, blending:add, transparent:true, depthWrite:false}));
  halleyTail.frustumCulled = false; scene.add(halleyTail);
  // Lichtring: breitet sich von der Sonne aus
  const N = 256, pts = new Float32Array(N*3);
  for (let q = 0; q < N; q++) { pts[q*3] = Math.cos(q/N*TAU); pts[q*3+2] = Math.sin(q/N*TAU); }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pts,3));
  pulse = new THREE.LineLoop(g, new THREE.LineBasicMaterial({color:0xf3b94d, transparent:true, opacity:0, blending:add, depthWrite:false}));
  pulse.frustumCulled = false; scene.add(pulse);
}

export function initScene(){
/* ---------- Szene ---------- */
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
renderer.setClearColor(0x04060c);
scene = new THREE.Scene();
camera = new THREE.PerspectiveCamera(40,1,.05,5000);
scene.add(new THREE.AmbientLight(0xffffff,.05));
scene.add(new THREE.PointLight(0xfff3dc,1.15,0,0));
blackTex = new THREE.DataTexture(new Uint8Array([0,0,0,255]),1,1,THREE.RGBAFormat); blackTex.needsUpdate = true;
dotTex = radialTex([[0,'rgba(255,255,255,1)'],[.25,'rgba(255,255,255,.55)'],[.6,'rgba(255,255,255,.1)'],[1,'rgba(255,255,255,0)']]);
}

export { belt, blackTex, buildBackdrop, buildExtras, buildMinor, buildPlanet, buildSun, camera, flightRocks, halleyTail, kuiper, pulse, rays, rockGeo, scatterFlight, scene, setVesta, sunMat };
