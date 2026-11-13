// hud/index – drawHUD: zeichnet die Messmarken des aktuellen Körpers.
// Exporte: drawHUD
// Hängt ab von: app/tour.js, audio/engine.js, core/util.js, data/bodies.js, hud/base.js, hud/belt.js, hud/draw.js, hud/earth.js, hud/overview.js, hud/planet.js, hud/sun.js, i18n/index.js, render/scene.js, ui/dom.js, ui/layout.js, core/state.js

import { S } from '../core/state.js';
import { BELT, EARTH, cur, stage } from '../app/tour.js';
import { AU } from '../audio/engine.js';
import { DEG, reduced } from '../core/util.js';
import { BODIES } from '../data/bodies.js';
import { baseHUD } from './base.js';
import { beltHUD } from './belt.js';
import { GROUP_T, MARKS, hits, nf2, onScreen, rects, rgba, s0, s1, scr } from './draw.js';
import { cloudFX, coreHUD, geoHUD } from './earth.js';
import { overviewHUD } from './overview.js';
import { planetHUD } from './planet.js';
import { sunHUD } from './sun.js';
import { tr } from '../i18n/index.js';
import { camera } from '../render/scene.js';
import { c2 } from '../ui/dom.js';
import { dpr, guard, ui } from '../ui/layout.js';

function drawHUD(dt){
  const key = cur+stage*100;
  if (S.hudKey !== key) { S.hudVis = Math.max(0,S.hudVis-dt/.25); if (S.hudVis === 0) { S.hudKey = key; S.grp = 0; S.grpA = 0; S.grpT = 0; S.hudT = reduced ? 10 : 0; S.blipI = 0; } }
  else if (S.trans >= .72) S.hudVis = Math.min(1,S.hudVis+dt/.35);
  else S.hudVis = Math.max(0,S.hudVis-dt/.25);
  // Die Messmarken rechnen in ihrer eigenen Einheit: auf großen Bildschirmen wächst alles um den Faktor ui mit
  const W0 = S.W, H0 = S.H, T0 = S.topH, B0 = S.botH, L0 = S.topL;
  S.W /= ui; S.H /= ui; S.topH /= ui; S.botH /= ui; S.topL /= ui;
  c2.setTransform(dpr*ui,0,0,dpr*ui,0,0); c2.clearRect(0,0,S.W,S.H);
  try {
  if (cur === EARTH && stage === 1 && S.trans < 1) cloudFX(S.trans);
  if (S.surfOn) {                   // auf der Oberfläche: leichte Randabdunklung wie durch ein Objektiv
    const g = c2.createRadialGradient(S.W/2,S.H/2,Math.min(S.W,S.H)*.36,S.W/2,S.H/2,Math.hypot(S.W,S.H)*.56);
    g.addColorStop(0,'rgba(30,12,6,0)'); g.addColorStop(1,'rgba(30,12,6,.36)');
    c2.fillStyle = g; c2.fillRect(0,0,S.W,S.H);
  }
  if (S.veil > .004) {             // Staubschleier über dem Szenenwechsel
    const g = c2.createRadialGradient(S.W/2,S.H*.45,0,S.W/2,S.H*.45,Math.max(S.W,S.H)*.75);
    g.addColorStop(0,rgba('216,164,120',S.veil)); g.addColorStop(1,rgba('146,94,64',S.veil));
    c2.fillStyle = g; c2.fillRect(0,0,S.W,S.H);
  }
  rects.length = 0;
  for (let q = 0; q < guard.length; q++) rects.push(guard[q]/ui);
  if (S.surfOn) baseHUD();
  else {
    if (cur === BELT) beltHUD();
    if (S.hudVis > 0) {
      const hb = S.hudKey%100, hs = Math.floor(S.hudKey/100);
      if (hb === 0) overviewHUD();
      else if (hb === EARTH && hs === 1) geoHUD(BODIES[hb]);
      else if (hb === EARTH && hs === 2) coreHUD(BODIES[hb]);
      else if (hs === 0) {
        // Gruppenwechsel: ausblenden, weiterschalten, einblenden
        const b = BODIES[hb], n = hb === 1 || !b.moons ? 2 : 3, want = S.grpT > GROUP_T ? (S.grp+1)%n : S.grp;
        if (want !== S.grp) { S.grpA = Math.max(0,S.grpA-dt/.3); if (S.grpA === 0) { S.grp = want; S.grpT = 0; S.hudT = reduced ? 10 : 0; S.blipI = 0; } }
        else if (S.hudKey === key && S.trans >= .72) { S.grpA = Math.min(1,S.grpA+dt/.35); S.grpT += dt; S.hudT += dt; }
        while (S.blipI < MARKS.length && S.hudT >= MARKS[S.blipI]) { if (!reduced) AU.blip(S.blipI+S.grp*2); S.blipI++; }
        const A0 = S.hudVis; S.hudVis = A0*S.grpA;
        if (hb === 1) sunHUD(b,A0); else planetHUD(b,dt,A0);
        S.hudVis = A0;
      }
    }
  }
  } finally { S.W = W0; S.H = H0; S.topH = T0; S.botH = B0; S.topL = L0; }
  for (let q = 0; q < rects.length; q++) rects[q] *= ui;
  // Antippbare Namen: fokussierter Körper zuerst, dann von außen nach innen; überlappende entfallen
  let fcx = 0, fcy = 0, frp = 0, fd = 0;
  if (cur >= 1) { const f = BODIES[cur]; scr(f.pos,s1); fcx = s1.x; fcy = s1.y; fd = camera.position.distanceTo(f.pos); frp = f.R*f.scl*S.H/(2*fd*Math.tan(camera.fov*DEG/2)); }
  for (let n = 0; n < BODIES.length; n++) {
    const i = n === 0 ? cur : BODIES.length-n;
    if (i === 0 || (n > 0 && i === cur)) continue;
    const b = BODIES[i], s = b.lbl.style;
    scr(b.pos,s0);
    let show = !S.surfOn && onScreen(s0) && s0.x > 0 && s0.x < S.W-20 && s0.y > S.topH && s0.y < S.H-S.botH+20;
    if (i !== cur && frp && Math.hypot(s0.x-fcx,s0.y-fcy) < frp*1.05 && camera.position.distanceTo(b.pos) > fd) show = false;
    if (i === cur && S.trans > .35) show = false;
    if (show) {
      if (b.r) { const t = nf2.format(b.r) + tr(' AE'); if (t !== b.auTxt) { b.auTxt = t; b.lblSub.textContent = t; b.lw = 0; } }
      if (!b.lw) { b.lw = b.lbl.offsetWidth || 70; b.lh = b.lbl.offsetHeight || 30; }
      // der Name beginnt am Rand der Scheibe, nicht darin
      const x0 = s0.x+Math.max(0,Math.min(70*ui,b.R*b.scl*S.H/(2*camera.position.distanceTo(b.pos)*Math.tan(camera.fov*DEG/2)))-7*ui), y0 = s0.y-b.lh/2;
      if (hits(x0,y0,x0+b.lw,y0+b.lh)) show = false;
      else { rects.push(x0,y0,x0+b.lw,y0+b.lh); s.transform = 'translate(' + x0.toFixed(1) + 'px,' + y0.toFixed(1) + 'px)'; }
    }
    s.visibility = show ? 'visible' : 'hidden';
  }
}

export { drawHUD };
