// hud/sun – Messmarken der Sonne.
// Exporte: sunHUD
// Hängt ab von: app/camera.js, app/tour.js, core/util.js, data/bodies.js, hud/draw.js, i18n/index.js, render/scene.js, core/state.js

import { S } from '../core/state.js';
import { tmp } from '../app/camera.js';
import { EARTH } from '../app/tour.js';
import { DEG, TAU } from '../core/util.js';
import { BODIES } from '../data/bodies.js';
import {
  INK,
  corner,
  d0,
  dimension,
  disc,
  gauge,
  label,
  lightTxt,
  nf0,
  nf2,
  nf3,
  onScreen,
  ring,
  rv,
  s0,
  scr,
  screenDir,
  side,
} from './draw.js';
import { tr } from '../i18n/index.js';
import { camera } from '../render/scene.js';

function sunHUD(b, A0) {
  const A = S.hudVis,
    dist = camera.position.distanceTo(b.pos),
    k = S.H / (2 * dist * Math.tan((camera.fov * DEG) / 2));
  scr(b.pos, s0);
  if (!onScreen(s0)) return;
  const cx = s0.x,
    cy = s0.y,
    rp = b.R * k,
    rr = rp + 12,
    e = BODIES[EARTH];
  ring(cx, cy, rr, 0, TAU, INK, 0.14 * A0);
  if (S.grp === 0) {
    const y = dimension(cx, cy, rp, rr, 'Ø ' + nf0.format(b.diam * rv(0)) + ' KM', 0),
      p = rv(0.25);
    if (p > 0 && y) {
      // die Erde im selben Maßstab
      disc(cx + rp + 14, y, Math.max(0.9, rp / 109.2), '79,143,214', A * p);
      ring(cx + rp + 14, y, 5, 0, TAU, '79,143,214', 0.4 * A * p);
      label(cx + rp + 14, y - 10, 0.5, 1, [[tr('ERDE IM MASSSTAB'), 3]], A * p);
    }
    corner(
      cx,
      cy,
      rr,
      1,
      -1,
      [
        [tr('OBERFLÄCHE'), 0],
        [nf0.format(5500 * rv(0.5)) + ' °C', 1],
        [tr('KERN 15 MIO. °C'), 0],
      ],
      0.5,
    );
  } else {
    gauge(cx, cy, rr, 0.9986, rv(0));
    corner(
      cx,
      cy,
      rr,
      -1,
      1,
      [
        [tr('ANTEIL AN DER MASSE'), 0],
        [nf2.format(99.86 * rv(0)) + ' %', 1],
        [tr('DES SONNENSYSTEMS'), 0],
      ],
      0,
    );
    corner(
      cx,
      cy,
      rr,
      -1,
      -1,
      [
        [tr('ROTATION AM ÄQUATOR'), 0],
        [tr('25 TAGE'), 1],
        [tr('SPEKTRALKLASSE G2V'), 0],
      ],
      0.25,
    );
    tmp.copy(e.pos).normalize();
    screenDir(b.pos, tmp, b.R * 0.7, d0);
    if (d0.l > 3)
      side(
        cx,
        cy,
        rr,
        d0.x,
        d0.y,
        [
          [tr('LICHT ZUR ERDE'), 0],
          [lightTxt(e.r), 1],
          [nf3.format(e.r) + tr(' AE'), 0],
        ],
        0.5,
        'out',
        '79,143,214',
      );
  }
}

export { sunHUD };
