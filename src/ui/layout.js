// ui/layout – Layout: measure() setzt Maßstab ui, Querformat wide, freie Flächen und Schutzzonen.
// Exporte: availH, dpr, guard, gx, measure, shiftTarget, ui, wide
// Hängt ab von: app/governor.js, app/tour.js, core/util.js, data/bodies.js, render/renderer.js, render/scene.js, ui/dom.js, core/state.js
// Erzeugt von tools/refactor/split.mjs aus src/sonnensystem.html – bis zum Ende des Umbaus nicht von Hand ändern.

import { S } from '../core/state.js';
import { prLimits, setPR } from '../app/governor.js';
import { EARTH, cur, stage } from '../app/tour.js';
import { clamp } from '../core/util.js';
import { BODIES } from '../data/bodies.js';
import { renderer } from '../render/renderer.js';
import { camera } from '../render/scene.js';
import { app, caption, clockEl, elBlurb, elKind, elName, fx, hudEl, hudR, navEl, rail, startEl } from './dom.js';

/* ---------- Zustand ---------- */
let dpr = 1, availH = 1, shiftTarget = 0;
// Maßstab von Bedienelementen und Messmarken (1 auf dem Handy), Querformat, Seitenrand und obere Grenze links (jeweils in Einheiten der Messmarken)
let ui = 1, wide = false, gx = 16;
const guard = [];                 // Querformat: Flächen von Uhr und Titel, denen Beschriftungen ausweichen (Pixel)

function measure(){
  const r = app.getBoundingClientRect();
  S.W = Math.max(1,r.width); S.H = Math.max(1,r.height);
  // Bedienelemente und Messmarken wachsen mit dem Bildschirm
  const u = clamp(Math.min(S.W/900,S.H/700),1,2.2);
  if (Math.abs(u-ui) > .004) { ui = u; app.style.setProperty('--u',ui.toFixed(3) + 'px'); for (const b of BODIES) b.lw = 0; }
  const w = S.W >= 640 && S.H >= 340 && S.W > S.H*1.2;
  if (w !== wide) { wide = w; app.classList.toggle('wide',wide); }
  app.classList.toggle('short',wide && S.H < 560);
  gx = Math.max(16*ui,.024*S.W)/ui;
  const box = el => { const q = el.getBoundingClientRect(); return q.width > 0 && q.height > 0 ? q : null; };
  const fullBot = Math.max(0,r.bottom-(startEl.hidden ? caption : startEl).getBoundingClientRect().top+8);
  // Querformat: Uhr und Titel stehen in den Ecken, der Körper nutzt die ganze Höhe. Die Übersicht bleibt über dem Titel, sonst liefen die Bahnen durch den Text.
  const corners = wide && startEl.hidden && cur !== 0, rl = box(rail), ck = box(clockEl);
  S.topH = wide ? hudR.getBoundingClientRect().bottom-r.top+6*ui : hudEl.offsetHeight;
  S.topL = wide && ck ? ck.bottom-r.top+6*ui : S.topH;
  S.botH = corners ? (rl ? r.bottom-rl.top+10*ui : 22*ui) : fullBot;
  guard.length = 0;
  if (wide) for (const el of corners ? [clockEl,elKind,elName,navEl,elBlurb] : [clockEl]) { const q = box(el); if (q) guard.push(q.left-r.left-8,q.top-r.top-6,q.right-r.left+8,q.bottom-r.top+6); }
  availH = Math.max(120, S.H-S.topH-S.botH);
  shiftTarget = (S.botH-S.topH)/2;
  S.shiftXT = cur === EARTH && stage === 2 && !wide ? Math.min(S.W*.17,150) : 0;     // im Querschnitt rückt die Erde im Hochformat nach links, rechts daneben stehen die Schichten
  prLimits(); setPR();
  renderer.setSize(S.W,S.H,false);
  camera.aspect = S.W/S.H;
  dpr = Math.min(window.devicePixelRatio || 1, 2);
  const fw = Math.round(S.W*dpr), fh = Math.round(S.H*dpr);
  if (fx.width !== fw || fx.height !== fh) { fx.width = fw; fx.height = fh; }
}

export { availH, dpr, guard, gx, measure, shiftTarget, ui, wide };
