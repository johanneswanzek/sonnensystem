// hud/draw – Messmarken: Grundformen auf dem Overlay-Canvas (Linien, Beschriftungen, Maßstäbe).
// Exporte: DIM, FONT, GROUP_T, INK, MARKS, MONO, SUNC, corner, d0, d1, dimension, disc, gauge, hits, label, lightShort, lightTxt, line, nf0, nf1, nf2, nf3, onScreen, rects, rgba, ring, rv, s0, s1, scr, screenDir, side; initDraw
// Hängt ab von: app/camera.js, core/util.js, i18n/index.js, render/scene.js, ui/dom.js, ui/layout.js, core/state.js
// Erzeugt von tools/refactor/split.mjs aus src/sonnensystem.html – bis zum Ende des Umbaus nicht von Hand ändern.

import * as THREE from 'three';
import { S } from '../core/state.js';
import { tmp2 } from '../app/camera.js';
import { TAU, clamp, easeO } from '../core/util.js';
import { LOC, tr } from '../i18n/index.js';
import { camera } from '../render/scene.js';
import { c2 } from '../ui/dom.js';
import { gx } from '../ui/layout.js';

// Belegt in initDraw() (Reihenfolge des Starts, siehe main.js)
let nf0, nf1, nf2, nf3;

/* ---------- Messmarken (2D-Overlay) ---------- */
const INK = '236,232,220', DIM = '144,151,171', SUNC = '243,185,77';
const MONO = '"IBM Plex Mono",ui-monospace,"SF Mono",Menlo,monospace';
const FONT = ['500 9px ' + MONO, '500 13px ' + MONO, '500 9px ' + MONO, '500 10px ' + MONO], LH = [12,17,12,13];
const rgba = (c,a) => 'rgba(' + c + ',' + clamp(a,0,1).toFixed(3) + ')';
const rects = [], proj = new THREE.Vector3(), s0 = {x:0,y:0,z:0}, s1 = {x:0,y:0,z:0};
const MARKS = [0,.25,.5];        // Einblendzeiten der Messmarken innerhalb einer Gruppe
const GROUP_T = 4.8;             // so lange steht eine Gruppe, dann folgt die nächste
function scr(v,out){ proj.copy(v).project(camera); out.x = (proj.x*.5+.5)*S.W; out.y = (-proj.y*.5+.5)*S.H; out.z = proj.z; return out; }
const onScreen = s => s.z > -1 && s.z < 1;
const rv = d => easeO(clamp((S.hudT-d)/.9,0,1));
function lightTxt(au){
  const s = au*499.005;
  if (s < 3600) return Math.floor(s/60) + ' MIN ' + Math.round(s%60) + ' S';
  return Math.floor(s/3600) + ' H ' + Math.round((s%3600)/60) + ' MIN';
}
function lightShort(au){
  const s = Math.round(au*499.005), two = n => (n < 10 ? '0' : '') + n;
  if (s < 3600) return Math.floor(s/60) + ':' + two(s%60) + ' MIN';
  return Math.floor(s/3600) + ':' + two(Math.floor((s%3600)/60)) + ' H';
}
function dims(lines){
  let w = 0, h = 0;
  for (const l of lines) { c2.font = FONT[l[1]]; w = Math.max(w,c2.measureText(l[0]).width); h += LH[l[1]]; }
  return [w,h];
}
function hits(x0,y0,x1,y1){
  for (let q = 0; q < rects.length; q += 4) if (x0 < rects[q+2] && x1 > rects[q] && y0 < rects[q+3] && y1 > rects[q+1]) return true;
  return false;
}
// Textblock: ax/ay = Ausrichtung am Ankerpunkt (0 Anfang, .5 Mitte, 1 Ende); weicht anderen Blöcken vertikal aus
function label(x,y,ax,ay,lines,alpha){
  if (alpha <= .01) return;
  const d = dims(lines), w = d[0], h = d[1];
  const x0 = clamp(x-w*ax,gx,Math.max(gx,S.W-gx-w)), lo = S.topH+4, hi = Math.max(lo,S.H-S.botH-h-2), y0 = clamp(y-h*ay,lo,hi), step = h+7;
  let yy = y0;
  for (const k of [0,-1,1,-2,2]) { const c = clamp(y0+k*step,lo,hi); if (!hits(x0-4,c-3,x0+w+4,c+h+3)) { yy = c; break; } }
  rects.push(x0-4,yy-3,x0+w+4,yy+h+3);
  c2.fillStyle = 'rgba(4,6,12,' + (S.plate*alpha).toFixed(3) + ')'; c2.fillRect(x0-5,yy-3,w+10,h+5);
  c2.textBaseline = 'top'; c2.textAlign = ax > .75 ? 'right' : ax < .25 ? 'left' : 'center';
  const tx = ax > .75 ? x0+w : ax < .25 ? x0 : x0+w/2; let ty = yy;
  for (const l of lines) {
    c2.font = FONT[l[1]];
    c2.fillStyle = l[2] ? rgba(SUNC,alpha) : l[1] === 1 ? rgba(INK,alpha) : l[1] === 3 ? rgba(INK,alpha*.85) : rgba(DIM,alpha);
    c2.fillText(l[0],tx,ty+1); ty += LH[l[1]];
  }
}
function line(x0,y0,x1,y1,c,a,w){ c2.strokeStyle = rgba(c,a); c2.lineWidth = w || 1; c2.beginPath(); c2.moveTo(x0,y0); c2.lineTo(x1,y1); c2.stroke(); }
function disc(x,y,r,c,a){ c2.fillStyle = rgba(c,a); c2.beginPath(); c2.arc(x,y,r,0,TAU); c2.fill(); }
function ring(x,y,r,a0,a1,c,a,w){ c2.strokeStyle = rgba(c,a); c2.lineWidth = w || 1; c2.beginPath(); c2.arc(x,y,r,a0,a1); c2.stroke(); }
// Bogen auf dem Messring für den Anteil f
function gauge(cx,cy,rr,f,p){
  const A = S.hudVis, a0 = -Math.PI/2, a1 = a0+TAU*f*p;
  for (let q = 0; q < 4; q++) { const a = q*Math.PI/2, c = Math.cos(a), s = Math.sin(a); line(cx+c*(rr-3),cy+s*(rr-3),cx+c*(rr+3),cy+s*(rr+3),INK,.4*A*p); }
  ring(cx,cy,rr,a0,a1,SUNC,.95*A,1.6);
  disc(cx+Math.cos(a1)*rr,cy+Math.sin(a1)*rr,2.6,SUNC,A*p);
}
// Eckmarke: kurze Diagonale vom Messring, daran der Textblock
function corner(cx,cy,rr,sx,sy,lines,delay){
  const p = rv(delay); if (p <= 0) return;
  const x0 = cx+sx*.7071*rr, y0 = cy+sy*.7071*rr, x1 = x0+sx*12*p, y1 = y0+sy*12*p;
  line(x0,y0,x1,y1,INK,.5*S.hudVis*p);
  label(x1+sx*4,y1+sy*2,sx > 0 ? 0 : 1,sy > 0 ? 0 : 1,lines,S.hudVis*p);
}
// Seitenmarke entlang einer Bildschirmrichtung: fließende Strichlinie (Licht) oder Pfeil (Bewegung)
function side(cx,cy,rr,dx,dy,lines,delay,kind,glyph){
  const p = rv(delay); if (p <= 0) return;
  const A = S.hudVis*p, r0 = rr+6, r1 = rr+6+28*p, ex = cx+dx*r1, ey = cy+dy*r1;
  if (kind === 'arrow') {
    line(cx+dx*r0,cy+dy*r0,ex,ey,INK,.85*A,1.3);
    const a = Math.atan2(dy,dx);
    line(ex,ey,ex-Math.cos(a-.45)*7,ey-Math.sin(a-.45)*7,INK,.85*A,1.3);
    line(ex,ey,ex-Math.cos(a+.45)*7,ey-Math.sin(a+.45)*7,INK,.85*A,1.3);
  } else {
    c2.setLineDash([3,4]); c2.lineDashOffset = (kind === 'in' ? 1 : -1)*S.clock*22;
    line(cx+dx*r0,cy+dy*r0,ex,ey,SUNC,.9*A,1.3);
    c2.setLineDash([]); c2.lineDashOffset = 0;
    disc(ex,ey,3.2,glyph || SUNC,A); ring(ex,ey,6,0,TAU,glyph || SUNC,.35*A);
  }
  const w = dims(lines)[0], room = dx >= 0 ? S.W-gx-(ex+12) : ex-12-gx;
  if (room >= w && Math.abs(dx) > .45) label(ex+(dx >= 0 ? 12 : -12),ey,dx >= 0 ? 0 : 1,.5,lines,A);
  else if (Math.abs(dx) > .45) label(cx+(dx >= 0 ? rr+6 : -rr-6),ey+(dy > .3 ? 12 : -12),dx >= 0 ? 0 : 1,dy > .3 ? 0 : 1,lines,A);
  else label(ex,ey+(dy > .3 ? 12 : -12),.5,dy > .3 ? 0 : 1,lines,A);
}
// Maßlinie unter dem Körper mit Hilfslinien vom Rand
function dimension(cx,cy,rp,rr,txt,delay){
  const p = rv(delay); if (p <= 0) return 0;
  const A = S.hudVis*p, y = cy+rr+16, hw = rp*p;
  c2.setLineDash([2,4]);
  line(cx-rp,cy,cx-rp,y+4,INK,.22*A); line(cx+rp,cy,cx+rp,y+4,INK,.22*A);
  c2.setLineDash([]);
  line(cx-hw,y,cx+hw,y,INK,.8*A);
  line(cx-hw,y-4,cx-hw,y+4,INK,.8*A); line(cx+hw,y-4,cx+hw,y+4,INK,.8*A);
  label(cx,y+7,.5,0,[[txt,1],[tr('DURCHMESSER'),0]],A);
  return y;
}
function screenDir(base,dirWorld,scale,out){
  scr(base,s0); const bx = s0.x, by = s0.y;
  tmp2.copy(dirWorld).multiplyScalar(scale).add(base); scr(tmp2,s1);
  const dx = s1.x-bx, dy = s1.y-by, l = Math.hypot(dx,dy);
  out.x = l > 0 ? dx/l : 1; out.y = l > 0 ? dy/l : 0; out.l = l;
  return out;
}
const d0 = {x:0,y:0,l:0}, d1 = {x:0,y:0,l:0};

export function initDraw(){
nf0 = new Intl.NumberFormat(LOC,{maximumFractionDigits:0});
nf1 = new Intl.NumberFormat(LOC,{minimumFractionDigits:1,maximumFractionDigits:1});
nf2 = new Intl.NumberFormat(LOC,{minimumFractionDigits:2,maximumFractionDigits:2});
nf3 = new Intl.NumberFormat(LOC,{minimumFractionDigits:3,maximumFractionDigits:3});
}

export { DIM, FONT, GROUP_T, INK, MARKS, MONO, SUNC, corner, d0, d1, dimension, disc, gauge, hits, label, lightShort, lightTxt, line, nf0, nf1, nf2, nf3, onScreen, rects, rgba, ring, rv, s0, s1, scr, screenDir, side };
