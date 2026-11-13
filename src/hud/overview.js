// hud/overview – Messmarken der Übersicht.
// Exporte: overviewHUD
// Hängt ab von: app/camera.js, core/util.js, data/bodies.js, hud/draw.js, i18n/index.js, render/scene.js, core/state.js
// Erzeugt von tools/refactor/split.mjs aus src/sonnensystem.html – bis zum Ende des Umbaus nicht von Hand ändern.

import { S } from '../core/state.js';
import { tmp } from '../app/camera.js';
import { TAU } from '../core/util.js';
import { HALLEY } from '../data/bodies.js';
import { SUNC, disc, label, lightTxt, onScreen, ring, s0, s1, scr } from './draw.js';
import { fill, tr } from '../i18n/index.js';
import { camera } from '../render/scene.js';

function overviewHUD(){
  const A = S.hudVis;
  if (S.pulseA > .02) {
    const az = Math.atan2(camera.position.z,camera.position.x);
    tmp.set(Math.cos(az)*S.pulseR,0,Math.sin(az)*S.pulseR); scr(tmp,s0);
    if (onScreen(s0)) {
      const a = A*Math.min(1,S.pulseA*3), lines = [[tr('LICHT AB SONNE'),0],[lightTxt(Math.pow(S.pulseR/10,1/.45)),1]];
      if (S.pulseHit && S.pulseHitT < 1.6) lines.push([fill('{0} ERREICHT',S.pulseHit.name.toUpperCase()),2,1]);
      disc(s0.x,s0.y,2.6,SUNC,a);
      label(s0.x,s0.y+9,.5,0,lines,a);
    }
  }
  scr(HALLEY.pos,s1);
  if (onScreen(s1) && s1.x > 0 && s1.x < S.W) {
    ring(s1.x,s1.y,5,0,TAU,'191,227,255',.6*A);
    label(s1.x+9,s1.y,0,.5,[['1P/HALLEY',3],[tr('PERIHEL 2061'),0]],A*.9);
  }
}

export { overviewHUD };
