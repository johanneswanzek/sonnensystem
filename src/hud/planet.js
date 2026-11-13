// hud/planet – Messmarken eines Planeten und seiner Monde.
// Exporte: planetHUD
// Hängt ab von: app/camera.js, core/util.js, hud/draw.js, i18n/index.js, orbit/kepler.js, render/scene.js, ui/dom.js, ui/layout.js, core/state.js

import { S } from '../core/state.js';
import { tmp } from '../app/camera.js';
import { DEG, TAU } from '../core/util.js';
import {
  FONT,
  INK,
  SUNC,
  corner,
  d0,
  d1,
  dimension,
  disc,
  gauge,
  label,
  lightShort,
  line,
  nf0,
  nf1,
  nf2,
  nf3,
  onScreen,
  rects,
  rgba,
  ring,
  rv,
  s0,
  s1,
  scr,
  screenDir,
  side,
} from './draw.js';
import { tr } from '../i18n/index.js';
import { place } from '../orbit/kepler.js';
import { camera } from '../render/scene.js';
import { c2 } from '../ui/dom.js';
import { gx } from '../ui/layout.js';

// Mondnamen stehen fest in der Ecke unten rechts; eine dünne Leine folgt jedem Mond und läuft hinter der Planetenscheibe durch
function moonTags(b, cx, cy, rr, rp, dist, dt) {
  const p = rv(0.25);
  if (p <= 0 || !b.sats) return;
  const A = S.hudVis * p,
    x0 = Math.min(Math.max(cx + 0.7071 * rr + 16, cx + rp + 16), S.W - gx - 64),
    y0 = cy + 0.7071 * rr + 8;
  c2.font = FONT[3];
  c2.textAlign = 'left';
  c2.textBaseline = 'top';
  b.sats.forEach((s, k) => {
    const ty = y0 + k * 16,
      mx = x0,
      my = ty + 6;
    scr(s.world, s1);
    const hidden =
      !onScreen(s1) || (Math.hypot(s1.x - cx, s1.y - cy) < rp && camera.position.distanceTo(s.world) > dist);
    s.vis += ((hidden ? 0 : 1) - s.vis) * Math.min(1, dt * 6);
    disc(mx, my, 2.4, s.rgb, A);
    c2.fillStyle = rgba(INK, A * 0.9);
    c2.fillText(s.n.toUpperCase(), mx + 8, ty + 1);
    rects.push(mx - 6, ty - 2, mx + 8 + c2.measureText(s.n.toUpperCase()).width + 4, ty + 14);
    if (s.vis > 0.02) {
      // Abschnitt der Leine innerhalb der Planetenscheibe auslassen
      const ex = s1.x - mx,
        ey = s1.y - my,
        fxp = mx - cx,
        fyp = my - cy,
        a = ex * ex + ey * ey,
        bq = 2 * (fxp * ex + fyp * ey),
        cq = fxp * fxp + fyp * fyp - (rp + 3) * (rp + 3),
        dsc = bq * bq - 4 * a * cq;
      let t1 = 2,
        t2 = 2;
      if (dsc > 0 && a > 0) {
        const sq = Math.sqrt(dsc);
        t1 = (-bq - sq) / (2 * a);
        t2 = (-bq + sq) / (2 * a);
      }
      const al = 0.3 * A * s.vis;
      if (t1 > 1 || t2 < 0) line(mx, my, s1.x, s1.y, s.rgb, al);
      else {
        if (t1 > 0) line(mx, my, mx + ex * t1, my + ey * t1, s.rgb, al);
        if (t2 < 1) line(mx + ex * t2, my + ey * t2, s1.x, s1.y, s.rgb, al);
      }
      ring(s1.x, s1.y, 5.5, 0, TAU, s.rgb, 0.75 * A * s.vis);
    }
  });
}

// Die Angaben erscheinen in Gruppen, die sich abwechseln: erst der Körper, dann die Bahn, dann die Monde. A0 = Deckkraft des stehenden Messrings
function planetHUD(b, dt, A0) {
  const A = S.hudVis,
    dist = camera.position.distanceTo(b.pos),
    k = (S.H / (2 * dist * Math.tan((camera.fov * DEG) / 2))) * b.scl;
  scr(b.pos, s0);
  if (!onScreen(s0)) return;
  const cx = s0.x,
    cy = s0.y,
    rp = b.R * k,
    rr = b.fitR * k + 10;
  ring(cx, cy, rr, 0, TAU, INK, 0.14 * A0);

  if (S.grp === 0) {
    dimension(cx, cy, rp, rr, 'Ø ' + nf0.format(b.diam * rv(0)) + ' KM', 0);
    // Rotationsachse und Neigung gegen die Senkrechte zur Bahn
    const p = rv(0.25);
    if (p > 0) {
      screenDir(b.pos, b.axis, b.R, d0);
      if (d0.l > rp * 0.3) {
        const e = rr + 16,
          a = A * p;
        line(
          cx + d0.x * d0.l,
          cy + d0.y * d0.l,
          cx + d0.x * (d0.l + (e - d0.l) * p),
          cy + d0.y * (d0.l + (e - d0.l) * p),
          INK,
          0.75 * a,
          1.2,
        );
        line(cx - d0.x * d0.l, cy - d0.y * d0.l, cx - d0.x * (rr + 5), cy - d0.y * (rr + 5), INK, 0.35 * a);
        tmp.set(0, 1, 0);
        screenDir(b.pos, tmp, b.R, d1);
        const a0 = Math.atan2(d1.y, d1.x),
          a1 = Math.atan2(d0.y, d0.x);
        let da = a1 - a0;
        if (da > Math.PI) da -= TAU;
        if (da < -Math.PI) da += TAU;
        if (Math.abs(da) > 0.04) {
          c2.setLineDash([2, 3]);
          line(
            cx + d1.x * rp * 1.02,
            cy + d1.y * rp * 1.02,
            cx + d1.x * (rr + 10),
            cy + d1.y * (rr + 10),
            INK,
            0.4 * a,
          );
          c2.setLineDash([]);
          c2.strokeStyle = rgba(SUNC, 0.9 * a);
          c2.lineWidth = 1.2;
          c2.beginPath();
          c2.arc(cx, cy, rr + 6, a0, a0 + da * p, da < 0);
          c2.stroke();
        }
        label(
          cx + d0.x * (e + 8),
          cy + d0.y * (e + 8),
          d0.x > 0.35 ? 0 : d0.x < -0.35 ? 1 : 0.5,
          d0.y < -0.35 ? 1 : d0.y > 0.35 ? 0 : 0.5,
          [
            [tr('ACHSNEIGUNG'), 0],
            [(b.tilt < 1 ? nf2 : nf1).format(b.tilt * p) + '°', 1],
          ],
          a,
        );
      }
    }
    corner(
      cx,
      cy,
      rr,
      -1,
      -1,
      b.retro
        ? [
            [tr('ROTATION'), 0],
            [b.day, 1],
            [tr('RÜCKLÄUFIG'), 2],
          ]
        : [
            [tr('ROTATION'), 0],
            [b.day, 1],
          ],
      0.5,
    );
    if (!b.moons && !b.minor)
      corner(
        cx,
        cy,
        rr,
        1,
        -1,
        [
          [tr('MONDE'), 0],
          [tr('KEINE'), 1],
        ],
        0.75,
      );
  } else if (S.grp === 1) {
    // Umlauf seit dem Perihel als Bogen
    gauge(cx, cy, rr, b.frac, rv(0));
    const yr = b.period > 1000;
    corner(
      cx,
      cy,
      rr,
      -1,
      1,
      [
        [tr('UMLAUF SEIT PERIHEL'), 0],
        [
          yr
            ? tr('JAHR ') + nf2.format(((b.frac * b.period) / 365.25) * rv(0)) + ' / ' + nf2.format(b.period / 365.25)
            : tr('TAG ') + nf0.format(b.frac * b.period * rv(0)) + ' / ' + nf0.format(b.period),
          1,
        ],
      ],
      0,
    );
    // Sonnenabstand jetzt, Licht fließt zur Scheibe
    tmp.copy(b.pos).multiplyScalar(-1).normalize();
    screenDir(b.pos, tmp, b.R * 0.7, d0);
    if (d0.l > 3)
      side(
        cx,
        cy,
        rr,
        d0.x,
        d0.y,
        [
          [tr('SONNE'), 0],
          [nf3.format(b.r) + tr(' AE'), 1],
          [tr('LICHT ') + lightShort(b.r), 2],
        ],
        0.25,
        'in',
      );
    // Bahntempo jetzt (Vis-viva-Gleichung)
    place(b, b.E + 0.02, tmp)
      .sub(b.pos)
      .normalize();
    screenDir(b.pos, tmp, b.R * 0.7, d1);
    if (d1.l > 3)
      side(
        cx,
        cy,
        rr,
        d1.x,
        d1.y,
        [
          [tr('BAHNTEMPO'), 0],
          [nf2.format(29.7847 * Math.sqrt(2 / b.r - 1 / b.el.a)) + ' KM/S', 1],
        ],
        0.5,
        'arrow',
      );
  } else {
    corner(
      cx,
      cy,
      rr,
      1,
      -1,
      [
        [tr('BEKANNTE MONDE'), 0],
        [nf0.format(b.moons * rv(0)), 1],
      ],
      0,
    );
    moonTags(b, cx, cy, rr, rp, dist, dt);
  }
}

export { planetHUD };
