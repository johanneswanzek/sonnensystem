// hud/belt – Messmarken des Asteroidengürtels.
// Exporte: beltHUD
// Hängt ab von: app/tour.js, core/util.js, data/bodies.js, hud/draw.js, ui/layout.js, core/state.js

import { S } from '../core/state.js';
import { BELT, cue, narT } from '../app/tour.js';
import { clamp, easeO, ss } from '../core/util.js';
import { BODIES } from '../data/bodies.js';
import { label } from './draw.js';
import { gx } from '../ui/layout.js';

// Asteroidengürtel: zwei Kennzahlen zum Stichwort des Sprechers, schon während des Flugs; sie weichen, sobald Vesta vorgestellt wird
function beltHUD() {
  const t = narT(),
    out = 1 - ss(cue('vesta') - 0.7, cue('vesta') - 0.1, t),
    f = BODIES[BELT].facts;
  const p1 = easeO(clamp((t - cue('count')) / 0.9, 0, 1)) * out,
    p2 = easeO(clamp((t - cue('mass')) / 0.9, 0, 1)) * out;
  if (p1 > 0.01)
    label(
      gx,
      S.topL + 8,
      0,
      0,
      [
        [f[0][0], 0],
        [f[0][1], 1],
      ],
      p1,
    );
  if (p2 > 0.01)
    label(
      S.W - gx,
      S.topH + 8,
      1,
      0,
      [
        [f[1][0], 0],
        [f[1][1], 1],
      ],
      p2,
    );
}

export { beltHUD };
