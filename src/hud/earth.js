// hud/earth – Messmarken der Erde: Ozeane und Kontinente, Aufbau im Schnitt, Wolkenflug.
// Exporte: cloudFX, coreHUD, geoHUD; initEarth
// Hängt ab von: app/tour.js, core/util.js, hud/draw.js, i18n/index.js, render/canvas-textures.js, render/scene.js, ui/dom.js, ui/layout.js, core/state.js
// Erzeugt von tools/refactor/split.mjs aus src/sonnensystem.html – bis zum Ende des Umbaus nicht von Hand ändern.

import * as THREE from 'three';
import { S } from '../core/state.js';
import { cue, cutS, narT } from '../app/tour.js';
import { DEG, TAU, clamp, easeO, ss } from '../core/util.js';
import { DIM, FONT, INK, MONO, disc, label, line, nf0, onScreen, rgba, ring, s0, s1, scr } from './draw.js';
import { LANG, tr } from '../i18n/index.js';
import { hash } from '../render/canvas-textures.js';
import { camera } from '../render/scene.js';
import { c2 } from '../ui/dom.js';
import { gx } from '../ui/layout.js';
import voiceDe from '../data/voice.de.json';
import voiceEn from '../data/voice.en.json';
import voicePl from '../data/voice.pl.json';

// Flug durch die Wolken: heller Schleier und vorbeiziehende Fetzen, am dichtesten in der Mitte der Fahrt
function cloudFX(k){
  const a = Math.sin(Math.PI*clamp((k-.12)/.76,0,1)); if (a <= 0) return;
  c2.fillStyle = rgba('232,240,250',a*.6); c2.fillRect(0,0,S.W,S.H);
  for (let i = 0; i < 16; i++) {
    const ph = (hash(i,1,99)+k*1.7*(.6+hash(i,2,99)))%1, ang = hash(i,3,99)*TAU, r = ph*ph*Math.max(S.W,S.H)*.95;
    const x = S.W/2+Math.cos(ang)*r, y = S.H/2+Math.sin(ang)*r*.8, sz = 50+ph*280;
    const g = c2.createRadialGradient(x,y,0,x,y,sz);
    g.addColorStop(0,rgba('255,255,255',a*.55*(1-ph*.4))); g.addColorStop(1,'rgba(255,255,255,0)');
    c2.fillStyle = g; c2.fillRect(x-sz,y-sz,2*sz,2*sz);
  }
}
// Name, Breite, Länge, 1 = Ozean, Verzögerung nach dem Stichwort des Sprechers (in der Reihenfolge, in der er sie nennt)
const GEO = [['PAZIFIK',0,-150,1],['ATLANTIK',25,-40,1],['INDISCHER OZEAN',-22,78,1],['NORDPOLARMEER',80,-150,1],['SÜDPOLARMEER',-63,-120,1],
  ['ASIEN',45,90,0],['AFRIKA',5,20,0],['NORDAMERIKA',45,-100,0],['SÜDAMERIKA',-12,-58,0],['ANTARKTIS',-74,40,0],['EUROPA',50,15,0],['AUSTRALIEN',-25,134,0]];
// Sekunden nach dem Stichwort (oceans bzw. continents), zu denen der Sprecher den Namen nennt; Reihenfolge wie in GEO (geschrieben von tools/audio/finalize.py)
const GEO_T_DE = voiceDe.geo;
const GEO_T_EN = voiceEn.geo;
const GEO_T_PL = voicePl.geo;
const gA = new THREE.Vector3(), gB = new THREE.Vector3(), gC = new THREE.Vector3();
function geoHUD(b){
  const A = S.hudVis, t = narT(), dist = camera.position.distanceTo(b.pos), k = S.H/(2*dist*Math.tan(camera.fov*DEG/2));
  scr(b.pos,s0); if (!onScreen(s0)) return;
  const cx = s0.x, cy = s0.y, rr = b.R*k+8, top = -Math.PI/2;
  // Anteile als Bogen: 71 % Wasser, 29 % Land
  const pw = easeO(clamp((t-cue('water'))/1.4,0,1)), pl = easeO(clamp((t-cue('land'))/1.4,0,1));
  ring(cx,cy,rr,0,TAU,INK,.14*A);
  if (pw > 0) { ring(cx,cy,rr,top,top+TAU*.71*pw,'110,170,235',.95*A,1.8); label(gx,S.topL+8,0,0,[[tr('VON WASSER BEDECKT'),0],[nf0.format(71*pw) + ' %',1]],A*pw); }
  if (pl > 0) { ring(cx,cy,rr,top+TAU*.71,top+TAU*(.71+.29*pl),'214,186,130',.95*A,1.8); label(S.W-gx,S.topH+8,1,0,[[tr('LANDFLÄCHE'),0],[nf0.format(29*pl) + ' %',1]],A*pl); }
  b.mesh.updateWorldMatrix(true,false);
  gB.copy(camera.position).sub(b.pos).normalize();
  c2.textAlign = 'center'; c2.textBaseline = 'top';
  for (const g of GEO) {
    const sea = g[3] === 1, p = easeO(clamp((t-cue(sea ? 'oceans' : 'continents')-g[4])/.7,0,1)); if (p <= 0) continue;
    const phi = (g[2]+180)*DEG, th = (90-g[1])*DEG;
    gA.set(-Math.cos(phi)*Math.sin(th),Math.cos(th),Math.sin(phi)*Math.sin(th)).multiplyScalar(b.R*1.012); b.mesh.localToWorld(gA);
    const a = A*p*ss(.1,.38,gC.copy(gA).sub(b.pos).normalize().dot(gB)); if (a <= .01) continue;   // nur auf der zugewandten Seite
    scr(gA,s1);
    const col = sea ? '150,205,250' : INK, y = s1.y-18-6*(1-p);
    c2.font = sea ? '500 9px ' + MONO : '500 11px ' + MONO;
    const w = c2.measureText(g[0]).width;
    c2.fillStyle = 'rgba(4,6,12,' + (.5*a).toFixed(3) + ')'; c2.fillRect(s1.x-w/2-5,y-3,w+10,sea ? 15 : 17);
    c2.fillStyle = rgba(col,a); c2.fillText(g[0],s1.x,y);
    line(s1.x,y+(sea ? 12 : 14),s1.x,s1.y-3,col,.6*a); disc(s1.x,s1.y,2.3,col,a);
  }
}
// Schichten vom Mittelpunkt bis zur Oberfläche: Name, zwei Kennzeilen, mittlerer Radius (Anteil), Farbe, Stichwort, Verzögerung
const LAYERS = [['INNERER KERN',['RADIUS 1.220 KM','FEST · 5.400 °C'],.095,'255,240,190','inner',0],
  ['ÄUSSERER KERN',['2.260 KM DICK','FLÜSSIGES EISEN'],.37,'255,170,50','outer',0],
  ['UNTERER MANTEL',['2.230 KM DICK','BIS 3.700 °C'],.72,'226,84,30','mantle',0],
  ['OBERER MANTEL',['BIS 660 KM TIEFE','ZÄHES GESTEIN'],.935,'250,150,60','mantle',1.4],
  ['KRUSTE',['5 BIS 70 KM DICK','FESTES GESTEIN'],.988,'176,150,126','crust',0]];
function coreHUD(b){
  if (cutS.open < .05) return;
  const A = S.hudVis, t = narT(), dist = camera.position.distanceTo(b.pos), k = S.H/(2*dist*Math.tan(camera.fov*DEG/2));
  scr(b.pos,s0); if (!onScreen(s0)) return;
  const cx = s0.x, cy = s0.y, rp = b.R*k;
  b.mesh.updateWorldMatrix(true,false);
  // Die rechte der beiden Schnittflächen beschriften. Die Ankerpunkte liegen auf einem Strahl schräg nach unten: jede Schicht hat ihre eigene Höhe
  const aA = cutS.c-cutS.open, aB = cutS.c+cutS.open;
  gA.set(Math.cos(aA),0,Math.sin(aA)).multiplyScalar(b.R); b.mesh.localToWorld(gA); scr(gA,s1); const xA = s1.x;
  gA.set(Math.cos(aB),0,Math.sin(aB)).multiplyScalar(b.R); b.mesh.localToWorld(gA); scr(gA,s1);
  const ang = xA > s1.x ? aA : aB, lat = -58*DEG, n = LAYERS.length;
  c2.font = '500 11px ' + MONO; let colW = 0; for (const L of LAYERS) colW = Math.max(colW,c2.measureText(L[0]).width);
  // Spalte rechts neben der Erde, Zeilen in derselben Reihenfolge wie die Schichten: so kreuzt keine Linie eine andere
  const lo = S.topH+8, hi = S.H-S.botH-6, rowH = clamp((hi-lo)/n,15,44), lines = rowH >= 38 ? 2 : rowH >= 26 ? 1 : 0, total = rowH*n;
  const xl = Math.min(S.W-gx-colW, Math.max(cx+rp+34,S.W*.56)), xe = xl-28, y0 = clamp(cy-total*.3,lo,Math.max(lo,hi-total));
  c2.textAlign = 'left'; c2.textBaseline = 'top';
  LAYERS.forEach((L,i) => {
    const p = easeO(clamp((t-cue(L[4])-L[5])/.9,0,1)); if (p <= 0) return;
    const a = A*p, y = y0+i*rowH, my = y+6;
    gA.set(Math.cos(ang)*Math.cos(lat),Math.sin(lat),Math.sin(ang)*Math.cos(lat)).multiplyScalar(b.R*L[2]); b.mesh.localToWorld(gA); scr(gA,s1);
    // waagerecht aus der Schicht heraus, dann ein Knick zur Zeile
    const ex = Math.max(xe,s1.x+6), q1 = clamp(p*2,0,1), q2 = clamp(p*2-1,0,1);
    c2.strokeStyle = rgba(L[3],.8*a); c2.lineWidth = 1; c2.beginPath(); c2.moveTo(s1.x,s1.y); c2.lineTo(s1.x+(ex-s1.x)*q1,s1.y);
    if (q2 > 0) c2.lineTo(ex+(xl-9-ex)*q2,s1.y+(my-s1.y)*q2);
    c2.stroke();
    ring(s1.x,s1.y,3.5,0,TAU,L[3],a); disc(s1.x,s1.y,1.4,L[3],a);
    disc(xl-9,my,2.2,L[3],a*q2);
    c2.fillStyle = 'rgba(4,6,12,' + (.55*a).toFixed(3) + ')'; c2.fillRect(xl-4,y-3,colW+8,15+lines*12);
    c2.font = '500 11px ' + MONO; c2.fillStyle = rgba(INK,a); c2.fillText(L[0],xl,y);
    c2.font = FONT[2]; c2.fillStyle = rgba(DIM,a);
    for (let j = 0; j < lines; j++) c2.fillText(L[1][j],xl,y+14+j*12);
  });
}

export function initEarth(){
GEO.forEach((g,i) => { g[0] = tr(g[0]); g[4] = {de:GEO_T_DE, en:GEO_T_EN, pl:GEO_T_PL}[LANG][i] || 0; });
LAYERS.forEach(L => { L[0] = tr(L[0]); L[1] = L[1].map(tr); });
}

export { cloudFX, coreHUD, geoHUD };
