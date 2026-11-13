// core/util – Kleine Hilfen: DOM-Abfrage $, Winkel, clamp, Glättung und Easing, reduzierte Bewegung.
// Exporte: $, DEG, TAU, clamp, easeIO, easeO, easeQ, reduced, ss; initUtil

// Belegt in initUtil() (Reihenfolge des Starts, siehe main.js)
let reduced;

const $ = s => document.querySelector(s);
const DEG = Math.PI/180, TAU = Math.PI*2;
const clamp = (x,a,b) => Math.min(b,Math.max(a,x));
const ss = (a,b,x) => { const t = clamp((x-a)/(b-a),0,1); return t*t*(3-2*t); };
const easeIO = t => t < .5 ? 4*t*t*t : 1-Math.pow(-2*t+2,3)/2;
const easeO = t => 1-Math.pow(1-t,3);
const easeQ = t => t*t*t*(t*(6*t-15)+10);      // sehr weicher An- und Auslauf für Kamerafahrten

export function initUtil(){
reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
}

export { $, DEG, TAU, clamp, easeIO, easeO, easeQ, reduced, ss };
