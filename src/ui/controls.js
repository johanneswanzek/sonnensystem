// ui/controls – Eingaben: Knöpfe, Tastatur, Zeiger (Ziehen, Kneifen, Rad).
// Exporte: ptrs; initControls, initControls2
// Hängt ab von: app/camera.js, app/tour.js, audio/engine.js, core/util.js, i18n/index.js, ui/credits.js, ui/dom.js, ui/fullscreen.js, ui/language-menu.js, ui/layout.js, ui/sound.js, core/state.js
// Erzeugt von tools/refactor/split.mjs aus src/sonnensystem.html – bis zum Ende des Umbaus nicht von Hand ändern.

import { S } from '../core/state.js';
import { user } from '../app/camera.js';
import { begin, dwell, setTour, step, tour } from '../app/tour.js';
import { AU } from '../audio/engine.js';
import { $, clamp } from '../core/util.js';
import { tr } from '../i18n/index.js';
import { creditsEl } from './credits.js';
import { app, canvas, startEl, tourBtn } from './dom.js';
import { fullBtn } from './fullscreen.js';
import { langBtn, langMenu, openLang } from './language-menu.js';
import { measure } from './layout.js';
import { setSound, showSound, soundBtn } from './sound.js';

const ptrs = new Map(); let pinch0 = 0, zoom0 = 1;
const pinch = () => { const a = [...ptrs.values()]; return Math.hypot(a[0].x-a[1].x, a[0].y-a[1].y) || 1; };
const drop = e => ptrs.delete(e.pointerId);

export function initControls(){
/* ---------- Eingaben ---------- */
$('#go').addEventListener('click', () => begin(true));
$('#goQuiet').addEventListener('click', () => begin(false));
tourBtn.addEventListener('click', () => { if (!S.begun) { S.begun = true; startEl.hidden = true; measure(); } setTour(!tour); });
soundBtn.addEventListener('click', () => {
  if (!AU.started) AU.start().then(ok => { S.soundMode = ok ? 0 : 2; AU.music(true); showSound(true); });
  else setSound((S.soundMode+1)%3);
});
$('#prev').addEventListener('click', () => step(-1));
$('#next').addEventListener('click', () => step(1));
document.addEventListener('visibilitychange', () => AU.pause(document.hidden));
}

export function initControls2(){
canvas.addEventListener('pointerdown', e => {
  try { canvas.setPointerCapture(e.pointerId); } catch (err) {}
  ptrs.set(e.pointerId,{x:e.clientX,y:e.clientY});
  if (ptrs.size === 2) { pinch0 = pinch(); zoom0 = user.zoom; }
});
canvas.addEventListener('pointermove', e => {
  const p = ptrs.get(e.pointerId); if (!p) return;
  const dx = e.clientX-p.x, dy = e.clientY-p.y; p.x = e.clientX; p.y = e.clientY;
  if (ptrs.size === 1) { user.az += dx*.006; user.el = clamp(user.el+dy*.005,-1.3,1.3); }
  else if (ptrs.size === 2) user.zoom = clamp(zoom0*pinch0/pinch(),.3,4);
  S.tourT = Math.min(S.tourT, dwell-5);
});
canvas.addEventListener('pointerup', drop); canvas.addEventListener('pointercancel', drop);
canvas.addEventListener('wheel', e => {
  e.preventDefault(); user.zoom = clamp(user.zoom*Math.exp(e.deltaY*.0012),.3,4); S.tourT = Math.min(S.tourT, dwell-5);
}, {passive:false});
window.addEventListener('keydown', e => {
  if (e.altKey || e.ctrlKey || e.metaKey || creditsEl.open) return;
  const onBtn = e.target && e.target.closest && e.target.closest('button');
  if (e.key === 'Escape' && !langMenu.hidden) { openLang(false); langBtn.focus(); }
  else if (e.key === 'ArrowRight') step(1);
  else if (e.key === 'ArrowLeft') step(-1);
  else if (e.key === ' ' && !onBtn) { e.preventDefault(); if (S.begun) tourBtn.click(); else begin(true); }
  else if (e.key === 'f' || e.key === 'F') fullBtn.click();
  else if (e.key === 'm' || e.key === 'M') soundBtn.click();
});
if (window.matchMedia && window.matchMedia('(hover:hover)').matches)
  [[tourBtn,'Tour starten oder anhalten · Leertaste'],[soundBtn,'Ton · Taste M'],[fullBtn,'Vollbild · Taste F'],[$('#prev'),'Vorheriger Halt · Pfeil links'],[$('#next'),'Nächster Halt · Pfeil rechts'],[langBtn,'Sprache']].forEach(p => { p[0].title = tr(p[1]); });
if (window.ResizeObserver) new ResizeObserver(measure).observe(app); else window.addEventListener('resize', measure);
}

export { ptrs };
