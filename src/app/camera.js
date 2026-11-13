// app/camera – Kamera: Sollposition je Körper und Abschnitt (desired), Kamerapfad, Eingriffe des Nutzers.
// Exporte: camAt, dPos, dTgt, desired, fromOff, fromTgt, pos, tgt, tmp, tmp2, user; initCamera
// Hängt ab von: app/tour.js, core/util.js, data/bodies.js, render/scene.js, ui/layout.js, core/state.js
// Erzeugt von tools/refactor/split.mjs aus src/sonnensystem.html – bis zum Ende des Umbaus nicht von Hand ändern.

import * as THREE from 'three';
import { S } from '../core/state.js';
import { EARTH, MARS, durCur, stage, travel } from './tour.js';
import { DEG, clamp, easeIO, easeO, easeQ, reduced } from '../core/util.js';
import { BODIES, DWELL0, RMAX } from '../data/bodies.js';
import { camera } from '../render/scene.js';
import { availH, wide } from '../ui/layout.js';

const user = {az:0, el:0, zoom:1};
const pos = new THREE.Vector3(0,120,200), tgt = new THREE.Vector3();
const fromTgt = new THREE.Vector3(), fromOff = new THREE.Vector3(0,1,1);
const dPos = new THREE.Vector3(), dTgt = new THREE.Vector3(), dir = new THREE.Vector3(), tmp = new THREE.Vector3(), tmp2 = new THREE.Vector3();

// Wunschpose der Kamera für Ziel i (füllt dPos, dTgt); tf = Zeitpunkt, für den die Pose vorausberechnet wird
function desired(i,tf){
  const b = BODIES[i], tanF = Math.tan(camera.fov*DEG/2), t = tf == null ? S.tFocus : tf, ts = tf == null ? S.tStage : tf;
  let az, el, d;
  if (i === 0) {
    dTgt.set(0,0,0);
    const sinEl = clamp(.85*availH/S.W,.35,.9);
    el = Math.asin(sinEl);
    d = Math.max(RMAX*S.H/(.94*S.W*tanF), RMAX*sinEl*S.H/(.92*availH*tanF));
    az = 1.1+t*.025;
  } else {
    dTgt.copy(b.pos);
    const st = b.stages ? stage : 0, sunAz = Math.atan2(-b.pos.z,-b.pos.x), geo = i === EARTH && st === 1, core = i === EARTH && st === 2;
    d = b.fitR*S.H/((geo ? .8 : core ? (wide ? .62 : .56) : (wide ? Math.min(.68,b.fill*1.2) : b.fill))*Math.min(S.W,availH)*tanF);
    if (i === 1) { d *= 1.1-.1*easeIO(clamp(t/DWELL0,0,1)); az = .6+t*.05; el = (14+3*Math.sin(t*.1))*DEG; }
    else if (geo) { az = sunAz+(12+Math.sin(ts*.13)*7)*DEG; el = (26-34*easeIO(clamp(ts/25,0,1)))*DEG; }     // wie ein Satellit: langsam von Nord nach Süd, die Erde dreht sich darunter weg
    else if (core) { az = sunAz+(30+Math.sin(ts*.2)*6)*DEG; el = (15+2*Math.sin(ts*.13))*DEG; }                // Blick in den aufgeklappten Keil
    else if (i === MARS && st === 1) { d = b.R*1.22; az = sunAz+24*DEG; el = 10*DEG; }                         // Sinkflug auf die Tagseite
    else {
      d *= (1.12-.12*easeIO(clamp(t/DWELL0,0,1)))*(1+.012*Math.sin(t*.23));     // langsame Zufahrt während des Halts
      // Anflug über die Nachtseite, dann Schwenk zum Tag: der Terminator wandert über die Scheibe
      const sweep = reduced ? 0 : 1-easeO(clamp((t-durCur+4.2)/8,0,1));
      az = sunAz+(40+74*sweep+Math.sin(t*.2)*14*(1-sweep))*DEG;
      el = ((b.camEl || 10)+3.5*Math.sin(t*.12)*(1-sweep))*DEG;                  // sanfter Kranschwenk
    }
  }
  az += user.az; el = clamp(el+user.el,-1.45,1.45); d *= user.zoom;
  dPos.set(Math.cos(el)*Math.cos(az), Math.sin(el), Math.cos(el)*Math.sin(az)).multiplyScalar(d).add(dTgt);
}
// Kamera zum Anteil tr der laufenden Fahrt (nach desired): das Ziel schwenkt zuerst, der Abstand wird logarithmisch überblendet, dazwischen ein Bogen nach oben
function camAt(tr,outPos,outTgt){
  const k = easeQ(tr), kt = easeQ(Math.min(1,tr*1.6)), bump = Math.sin(Math.PI*k);
  outTgt.lerpVectors(fromTgt,dTgt,kt);
  tmp.subVectors(dPos,dTgt);
  const l0 = Math.max(.01,fromOff.length()), l1 = Math.max(.01,tmp.length());
  dir.copy(fromOff).divideScalar(l0).lerp(tmp.divideScalar(l1),k);
  dir.y += bump*.4;
  if (dir.lengthSq() < 1e-6) dir.set(0,1,0);
  dir.normalize();
  const len = Math.exp(Math.log(l0)+(Math.log(l1)-Math.log(l0))*k)+bump*travel*.8;
  outPos.copy(outTgt).addScaledVector(dir,len);
  return len;
}

export function initCamera(){
BODIES.forEach(b => { b.pos = new THREE.Vector3(); b.flash = 0; b.scl = 1; b.spinCur = b.spin || 0; });
}

export { camAt, dPos, dTgt, desired, fromOff, fromTgt, pos, tgt, tmp, tmp2, user };
