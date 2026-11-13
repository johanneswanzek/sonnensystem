// app/governor – Auflösungsregler PR/govern: misst die Bilddauer und passt die Renderauflösung an.
// Exporte: PR, govern, prLimits, setPR
// Hängt ab von: core/device.js, core/util.js, render/renderer.js, core/state.js
// Erzeugt von tools/refactor/split.mjs aus src/sonnensystem.html – bis zum Ende des Umbaus nicht von Hand ändern.

import { S } from '../core/state.js';
import { DESKTOP } from '../core/device.js';
import { clamp } from '../core/util.js';
import { renderer } from '../render/renderer.js';

// Auflösung je Szene (0 Weltraum, 1 Marsoberfläche) in Bildpunkten je CSS-Pixel, zwischen lo und hi. Ein Regler hält die Bildrate und nutzt Reserven.
const PR = {v:[0,0], hi:[1,1], lo:1, t:0, n:0, slow:0, fast:0, hold:3, chk:null, up:null, block:[0,0], back:[20,20], noDown:[0,0], rest:[60,60], fix:false};
const setPR = () => { const v = PR.v[S.surfOn ? 1 : 0]; if (Math.abs(renderer.getPixelRatio()-v) > 1e-4) renderer.setPixelRatio(v); };
function prLimits(){
  if (PR.fix) return;
  const d = window.devicePixelRatio || 1, nat = Math.min(d,2);
  // Monitore mit einfacher Pixeldichte: Überabtastung glättet feine Linien, solange der Bildspeicher überschaubar bleibt
  const over = DESKTOP && d < 1.5 ? Math.min(1.5,Math.sqrt(4.7e6/(S.W*S.H))) : 0;
  PR.hi[0] = Math.max(nat,over); PR.hi[1] = Math.max(Math.min(nat,1.5),over);
  PR.lo = Math.min(1,Math.max(.6,1500/Math.max(S.W,S.H)));          // große Monitore dürfen unter 1 fallen, Handys nicht
  PR.v[0] = clamp(PR.v[0] || nat,PR.lo,PR.hi[0]); PR.v[1] = clamp(PR.v[1] || Math.min(nat,1.5),PR.lo,PR.hi[1]);
}
// Einmal je Sekunde: mittlere Bilddauer prüfen. Zu langsam: Auflösung passend senken. Durchgehend flüssig: einen Schritt nach oben versuchen.
function govern(raw){
  if (raw > 1.5 || document.hidden) { PR.t = 0; PR.n = 0; return; }      // Tabwechsel und lange Ladepausen zählen nicht
  PR.t += raw; PR.n++;
  if (PR.t < 1 || PR.n < 2) return;
  const ft = PR.t/PR.n, k = S.surfOn ? 1 : 0, now = performance.now()/1000, v = PR.v[k];
  PR.t = 0; PR.n = 0;
  if (PR.hold > 0) { PR.hold--; return; }                         // nach einem Wechsel erst einschwingen lassen
  if (PR.fix) return;
  if (PR.chk) {
    // Hat die Absenkung geholfen? Wenn nicht, bremst etwas anderes (Bildschirm mit 30 Hz, Prozessor): zurücknehmen und eine Weile ruhen
    const c = PR.chk; PR.chk = null;
    if (c.k === k && ft > c.ft*(1-.35*(1-c.f*c.f))) { PR.v[k] = c.from; PR.noDown[k] = now+PR.rest[k]; PR.rest[k] = Math.min(900,PR.rest[k]*2); PR.slow = 0; PR.hold = 1; setPR(); return; }
  }
  PR.slow = ft > .0238 ? PR.slow+1 : 0; PR.fast = ft < .0179 ? PR.fast+1 : 0;
  if (PR.slow >= 2 && v > PR.lo+.01 && now > PR.noDown[k]) {
    const nv = Math.max(PR.lo,v*clamp(Math.sqrt(.019/ft),.7,.92));
    if (PR.up && PR.up.k === k) { PR.block[k] = now+PR.back[k]; PR.back[k] = Math.min(600,PR.back[k]*2); }      // der Schritt nach oben war zu viel: so bald nicht wieder
    PR.up = null; PR.chk = {k, ft, f:nv/v, from:v}; PR.v[k] = nv; PR.slow = 0; PR.hold = 1; setPR();
  } else if (PR.fast >= 4 && v < PR.hi[k]-.01 && now > PR.block[k]) {
    PR.up = {k, t:now}; PR.v[k] = Math.min(PR.hi[k],v*1.2); PR.fast = 0; PR.hold = 1; setPR();
  } else if (PR.up && now-PR.up.t > 8) PR.up = null;
}

export { PR, govern, prLimits, setPR };
