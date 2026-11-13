// hud/base – Beschriftungen der Stationen der Marsbasis.
// Exporte: baseHUD
// Hängt ab von: core/util.js, data/voice.js, hud/draw.js, mars/base.js, ui/layout.js, core/state.js

import { S } from '../core/state.js';
import { TAU, clamp, easeO, ss } from '../core/util.js';
import { VOICE } from '../data/voice.js';
import { SUNC, disc, label, line, ring, s1 } from './draw.js';
import { MB } from '../mars/base.js';
import { gx } from '../ui/layout.js';

// Mars-Basis: beschriftet wird immer nur die Station, von der gerade die Rede ist
function baseHUD(){
  const L = MB.labels, c = VOICE.mars_base.cues, t = S.mbT;
  S.plate = .72;                     // die Szene ist hell
  for (let i = 0; i < L.length; i++) {
    const l = L[i], t0 = c[l.cue]+.7, t1 = (i+1 < L.length ? c[L[i+1].cue] : c.end)+.4;
    let a = ss(t0,t0+.6,t)*(1-ss(t1,t1+.4,t))*(1-S.veil); if (a <= .01) continue;
    MB.project(l.v,s1); if (s1.z > 1 || s1.z < -1) continue;
    a *= 1-ss(0,60,Math.max(gx+30-s1.x,s1.x-(S.W-gx-30),0)); if (a <= .01) continue;      // erst beschriften, wenn die Station im Bild ist
    const x = clamp(s1.x,30,S.W-30), y = clamp(s1.y,S.topH+64,S.H-S.botH-12), up = 30*easeO(clamp((t-t0)/.7,0,1));
    ring(x,y,5,0,TAU,SUNC,a); disc(x,y,1.8,SUNC,a); line(x,y-6,x,y-up,SUNC,.8*a);
    label(x,y-up-4,.5,1,[[l.n,1],[l.f,3]],a);
  }
  S.plate = .36;
}

export { baseHUD };
