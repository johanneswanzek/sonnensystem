// render/scene – Weltraumszene: Szene, Kamera, gemeinsame Hilfen (Punktwolken, Halo, Bahnlinien, Marker), geteilte Texturen.
// Exporte: add, blackTex, camera, halo, marker, orbitLine, planetTime, points, rays, rockMat, scene; initScene
// Hängt ab von: core/util.js, orbit/kepler.js, render/canvas-textures.js, render/renderer.js, render/shaders/space.js

import * as THREE from 'three';
import { TAU } from '../core/util.js';
import { place } from '../orbit/kepler.js';
import { radialTex } from './canvas-textures.js';
import { renderer } from './renderer.js';
import { HALO_FS, ORBIT_FS, ORBIT_VS, PLANET_FS, VS } from './shaders/space.js';

// Belegt in initScene() (Reihenfolge des Starts, siehe main.js)
let scene, camera, blackTex, dotTex;

const add = THREE.AdditiveBlending;
let rays = [];

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
// Gemeinsame Uhr der Planetenshader (Turbulenz der Gasriesen)
const planetTime = {value:0};
// Monde und kleine Körper: derselbe Shader wie die Planeten (Relief aus der Höhe in A, weicher Terminator), getönt, ohne Atmosphäre
function rockMat(map,color,bump){
  const z = new THREE.Vector4(0,0,0,0);
  return new THREE.ShaderMaterial({uniforms:{map:{value:map}, nmap:{value:blackTex}, aux:{value:blackTex}, nightK:{value:0}, specK:{value:0}, bumpK:{value:bump}, gas:{value:0},
    texel:{value:map.texelStep || new THREE.Vector2(1/512,1/256)}, atmo:{value:z}, cut:{value:new THREE.Vector2(0,0)}, cloud:{value:new THREE.Vector2(0,0)},
    center:{value:new THREE.Vector3()}, ringN:{value:new THREE.Vector3(0,1,0)}, ringR:{value:new THREE.Vector3(0,0,0)},
    tint:{value:new THREE.Color(color).multiplyScalar(1.15)}, haze:{value:z}, time:planetTime, flow:{value:0}, detail:{value:0}},
    vertexShader:VS, fragmentShader:PLANET_FS});
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

export { add, blackTex, camera, halo, marker, orbitLine, planetTime, points, rays, rockMat, scene };
