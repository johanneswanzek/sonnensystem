// app/loop – Schleife frame(): Kamera, Szenenwechsel mit Staubschleier, Rendern.
// Exporte: frame; initLoop
// Hängt ab von: app/camera.js, app/governor.js, app/tour.js, audio/engine.js, core/util.js, data/bodies.js, hud/index.js, i18n/index.js, mars/base.js, orbit/kepler.js, render/renderer.js, render/scene.js, ui/controls.js, ui/dom.js, ui/layout.js, core/state.js
// Erzeugt von tools/refactor/split.mjs aus src/sonnensystem.html – bis zum Ende des Umbaus nicht von Hand ändern.

import { S } from '../core/state.js';
import { camAt, desired, pos, tgt, tmp } from './camera.js';
import { PR, govern, setPR } from './governor.js';
import { BELT, EARTH, MARS, cue, cur, cutS, durCur, dwell, focus, narT, rollDir, setStage, speedIdx, stage, stageCount, tour } from './tour.js';
import { AU } from '../audio/engine.js';
import { DEG, TAU, clamp, easeO, easeQ, reduced, ss } from '../core/util.js';
import { BODIES, HALLEY, SPEEDS } from '../data/bodies.js';
import { drawHUD } from '../hud/index.js';
import { LOC, tr } from '../i18n/index.js';
import { MB } from '../mars/base.js';
import { place, solve } from '../orbit/kepler.js';
import { renderer } from '../render/renderer.js';
import { belt, camera, flightRocks, halleyTail, kuiper, pulse, rays, scene, sunMat } from '../render/scene.js';
import { ptrs } from '../ui/controls.js';
import { app, elDate, elEff } from '../ui/dom.js';
import { shiftTarget } from '../ui/layout.js';

// Belegt in initLoop() (Reihenfolge des Starts, siehe main.js)
let fmt;

function frame(now){
  requestAnimationFrame(frame);
  const raw = (now-S.last)/1000, dt = Math.min(.1,raw); S.last = now;
  const userSpeed = SPEEDS[speedIdx], fb = BODIES[cur], moving = userSpeed > 0;
  if (!reduced || moving) S.clock += dt;

  // In der Nahansicht läuft die Zeit langsamer: der Planet wandert höchstens 6° pro Sekunde, Monde bleiben verfolgbar
  // Im Querschnitt steht die Zeit fast still, sonst wandert die Erde auf ihrer Bahn weiter und der Keil dreht sich aus dem Bild
  // Auf dem Flug durch den Gürtel ebenso, damit die vorausberechnete Bahn durch die Brocken stimmt
  const want = fb.period ? Math.min(userSpeed, fb.period*6/360, fb.cap || 1e9, cur === EARTH && stage === 2 ? .03 : 1e9, cur === BELT && S.trans < 1 ? .4 : 1e9) : userSpeed;
  S.effSpeed += (want-S.effSpeed)*Math.min(1,dt*2.5);
  if (Math.abs(want-S.effSpeed) < .002) S.effSpeed = want;
  S.simDays += S.effSpeed*dt;
  const slowed = moving && want < userSpeed*.95;
  const effTxt = slowed ? tr('Nahansicht: ') + want.toLocaleString(LOC,{maximumFractionDigits:want < .1 ? 2 : 1}) + tr(' Tage/s') : '';
  if (elEff.textContent !== effTxt) elEff.textContent = effTxt;
  const day = Math.floor(S.simDays);
  if (day !== S.lastDay) { S.lastDay = day; elDate.textContent = fmt.format(new Date((S.simDays+10957.5)*864e5)); }

  const camP = camera.position;
  for (let i = 2; i < BODIES.length; i++) {
    const b = BODIES[i];
    place(b, solve(b,S.simDays), b.pos); b.pivot.position.copy(b.pos);
    // In Nahansichten schrumpfen die übrigen Planeten, damit kein Nachbar das Bild füllt
    b.scl += ((cur >= 1 && i !== cur ? Math.min(.4,.5*fb.R/b.R) : 1)-b.scl)*Math.min(1,dt*1.5);
    b.pivot.scale.setScalar(b.scl);
    if (b.ringMat) { b.ringMat.uniforms.R.value = b.R*b.scl; b.mesh.material.uniforms.ringR.value.set(b.R*1.22*b.scl,b.R*2.3*b.scl,1); }
    b.orbit.material.uniforms.head.value = ((b.E/TAU)%1+1)%1;
    b.orbit.material.uniforms.gap.value = b.R*b.scl*1.25/(TAU*b.rMean);
    // Fremde Bahnen, die vor dem betrachteten Planeten verlaufen, blenden in der Nahansicht aus
    const nf = b.orbit.material.uniforms.nearF;
    nf.value += ((cur >= 2 && i !== cur && S.trans > .6 ? S.camLen : .0001)-nf.value)*Math.min(1,dt*3);
    // Die Erde dreht sich im Kapitel Kontinente etwas schneller und hält für den Querschnitt an
    b.spinCur += ((i === EARTH && i === cur && stage ? (stage === 1 ? .23 : 0) : b.spin)-b.spinCur)*Math.min(1,dt*1.6);
    if (moving || (i === cur && stage)) { b.mesh.rotation.y += b.spinCur*dt; if (b.clouds) b.clouds.rotation.y += b.spinCur*1.25*dt; if (b.rocks) b.rocks.rotation.y += .012*dt; }
    if (b.sats) for (const s of b.sats) {
      const a = S.simDays/s.p*TAU+s.ph;
      s.mesh.position.set(b.R*s.a*Math.cos(a),0,-b.R*s.a*Math.sin(a));
      if (moving) s.mesh.rotation.y += .1*dt;
      s.mesh.getWorldPosition(s.world);
    }
    if (b.swarm) {
      const m = b.swarm.material; m.opacity += ((cur === i ? .8 : 0)-m.opacity)*Math.min(1,dt*2);
      b.swarm.visible = m.opacity > .01;
      if (moving) b.swarm.rotation.y += .03*dt;
    }
    b.flash = Math.max(0,b.flash-dt*1.4);
    const far = ss(25,70,camP.distanceTo(b.pos)/b.R), sc = .02*(1+1.6*b.flash)/b.scl;
    b.dot.material.opacity = far; b.dot.scale.set(sc,sc,1); b.dot.visible = far > .01;
  }
  // Erde: Wolken ausdünnen, Keil aufklappen, Schichten zum Stichwort des Sprechers aufleuchten lassen
  {
    const E = BODIES[EARTH], on = cur === EARTH, core = on && stage === 2, nt = narT();
    S.cloudOp += ((on && stage === 1 ? .22 : core ? .1 : 1)-S.cloudOp)*Math.min(1,dt*1.2);
    if (E.clouds) {
      E.clouds.material.uniforms.op.value = S.cloudOp;
      // Wolkenschatten: Versatz zwischen Wolken- und Bodenkugel, Stärke nach Dichte der Wolkendecke
      const sh = (E.mesh.rotation.y-E.clouds.rotation.y)/TAU;
      E.mesh.material.uniforms.cloud.value.set(sh-Math.floor(sh),S.cloudOp);
    }
    const openK = core ? clamp((nt-cue('open'))/2.4,0,1) : 0;
    if (core && openK > 0 && !cutS.set) {           // Keil zur Kamera ausrichten, sobald er sich öffnet
      E.mesh.updateWorldMatrix(true,false); tmp.copy(camera.position); E.mesh.worldToLocal(tmp);
      cutS.c = Math.atan2(tmp.z,tmp.x)+.24; cutS.set = true; AU.boom();      // leicht versetzt, damit der Keil räumlich wirkt
    }
    if (!core) cutS.set = false;
    const target = easeO(openK)*50*DEG;
    cutS.open += (target-cutS.open)*Math.min(1,dt*(target > cutS.open ? 14 : 3.5));
    if (cutS.open < .002 && !core) cutS.open = 0;
    E.cut.set(cutS.c,cutS.open);
    if (E.clouds) E.ccut.set(cutS.c+E.clouds.rotation.y-E.mesh.rotation.y,cutS.open);
    if (E.faces) {
      E.faces[0].rotation.y = -(cutS.c-cutS.open); E.faces[1].rotation.y = -(cutS.c+cutS.open);
      E.faces[0].visible = E.faces[1].visible = cutS.open > .002;
      const lit = E.layerMat.uniforms.lit.value, k = Math.min(1,dt*3);
      ['inner','outer','mantle','crust'].forEach((name,q) => {
        const hit = core && nt >= cue(name), c = 'xyzw'[q];
        lit[c] += ((hit ? 1 : core ? .25 : 0)-lit[c])*k;
        if (hit && !cutS.fired[name]) { cutS.fired[name] = true; if (!reduced) AU.blip(q*2); }
      });
      E.layerMat.uniforms.time.value = S.clock;
    }
  }
  if (moving) BODIES[1].mesh.rotation.y += .01*dt;
  sunMat.uniforms.time.value = S.clock;
  rays[1].material.rotation = S.clock*.012; rays[2].material.rotation = -S.clock*.008;
  const glare = ss(14,40,camP.length());                      // nah an der Sonne würden die Strahlen das Bild verschleiern
  for (const r of rays) r.material.opacity = r.userData.op*glare;
  AU.rumble(.5*(1-ss(10,70,camP.length())));
  belt.rotation.y = S.simDays/1680*TAU; kuiper.rotation.y = S.simDays/100000*TAU;

  // Halley: Schweif zeigt von der Sonne weg und wächst in Sonnennähe
  place(HALLEY, solve(HALLEY,S.simDays), HALLEY.pos);
  HALLEY.orbit.material.uniforms.head.value = ((HALLEY.E/TAU)%1+1)%1;
  HALLEY.dot.position.copy(HALLEY.pos);
  const tl = HALLEY.r < 4.5 ? 7*(1-HALLEY.r/4.5) : 0, tp = halleyTail.geometry.attributes.position;
  tmp.copy(HALLEY.pos).normalize().multiplyScalar(tl).add(HALLEY.pos);
  tp.setXYZ(0,HALLEY.pos.x,HALLEY.pos.y,HALLEY.pos.z); tp.setXYZ(1,tmp.x,tmp.y,tmp.z); tp.needsUpdate = true;
  halleyTail.visible = tl > 0;

  // Lichtring in der Übersicht
  const ov = cur === 0 && S.trans > .6 ? 1 : 0;
  if (!reduced) S.pulseT += dt;
  if (S.pulseT > 12) { S.pulseT = 0; S.pulseHit = null; }
  const pr0 = S.pulseR;
  S.pulseR = 3+54*clamp(S.pulseT/9.5,0,1);
  S.pulseA += ((ov ? ss(0,.6,S.pulseT)*(1-ss(8.6,9.5,S.pulseT)) : 0)-S.pulseA)*Math.min(1,dt*5);
  pulse.scale.set(S.pulseR,1,S.pulseR); pulse.material.opacity = S.pulseA*.75; pulse.visible = S.pulseA > .01;
  S.pulseHitT += dt;
  if (S.pulseA > .2) for (let i = 2; i < BODIES.length; i++) {
    const b = BODIES[i];
    if (pr0 < b.rMean && S.pulseR >= b.rMean) { b.flash = 1; S.pulseHit = b; S.pulseHitT = 0; AU.ping(i-2); }
  }

  if (!reduced) { S.tFocus += dt; S.tStage += dt; }
  if (tour && ptrs.size === 0) {
    S.tourT += dt;
    if (S.tourT >= dwell) {
      if (stage+1 < stageCount(fb)) setStage(stage+1);
      else { const nx = (cur+1)%BODIES.length; if (nx === 0) S.loops++; focus(nx, false); }
    }
    BODIES[cur].chip.style.setProperty('--p', Math.min(1,S.tourT/dwell).toFixed(3));
  }

  // Kamerafahrt; in der Kurve legt sich die Kamera leicht in die Schräglage
  if (S.trans < 1) { S.trans = Math.min(1,S.trans+dt/durCur); if (S.trans === 1) { AU.arrive(); if (flightRocks) flightRocks.visible = false; } }
  desired(cur);
  S.camLen = camAt(S.trans,pos,tgt);
  camera.position.copy(pos); camera.lookAt(tgt);
  S.roll += ((reduced ? 0 : rollDir*.1*Math.sin(Math.PI*easeQ(S.trans)))-S.roll)*Math.min(1,dt*4);
  if (Math.abs(S.roll) > 1e-4) camera.rotateZ(S.roll);

  // Mars-Basis: der Sinkflug endet im Staub, dahinter wechselt die Szene; beim Verlassen ebenso
  const down = cur === MARS && stage === 1, wantSurf = down && S.trans >= 1 && MB.ready;
  if (down) S.mbT = import.meta.env.MODE === 'test' && window.__mbt != null ? window.__mbt : narT();
  if (wantSurf !== S.surfOn) { S.veil = Math.min(1,S.veil+dt/.4); if (S.veil >= 1) { S.surfOn = wantSurf; app.classList.toggle('surf',S.surfOn); PR.hold = 3; PR.slow = PR.fast = 0; PR.chk = PR.up = null; setPR(); } }
  else S.veil = Math.max(down && !S.surfOn ? ss(.45,1,S.trans) : 0, S.veil-dt/1.3);
  AU.wind(S.surfOn ? 1 : 0);

  govern(raw);

  S.shiftCur += (shiftTarget-S.shiftCur)*Math.min(1,dt*4);
  S.shiftX += (S.shiftXT-S.shiftX)*Math.min(1,dt*3);
  if (S.surfOn) { MB.update(S.mbT,dt,import.meta.env.MODE === 'test' && window.__clk != null ? window.__clk : S.clock,reduced); MB.render(S.shiftCur); }
  else { camera.setViewOffset(S.W,S.H,S.shiftX,S.shiftCur,S.W,S.H); renderer.render(scene,camera); }
  drawHUD(dt);
}

export function initLoop(){
/* ---------- Schleife ---------- */
fmt = new Intl.DateTimeFormat(LOC,{day:'2-digit',month:'short',year:'numeric',timeZone:'UTC'});
}

export { frame };
