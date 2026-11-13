// testing/hooks – Prüfhaken für Tests (window.__t). Nur im Testmodus (vite build --mode test) aufgerufen.
// Exporte: installTestHooks
// Hängt ab von: app/governor.js, app/tour.js, ui/layout.js, core/state.js
// Erzeugt von tools/refactor/split.mjs aus src/sonnensystem.html – bis zum Ende des Umbaus nicht von Hand ändern.

import { S } from '../core/state.js';
import { PR, setPR } from '../app/governor.js';
import { cur, durCur, dwell, focus, setStage, stage, step } from '../app/tour.js';
import { ui, wide } from '../ui/layout.js';

// Prüfhaken für die Tests (window.__t), nur im Testmodus aufgerufen
function installTestHooks(){
  window.__t = {focus, setStage, step, seek: x => { S.narStart = performance.now()-x*1000; }, pr: x => { PR.v = [x,x]; PR.hi = [x,x]; PR.lo = x; PR.fix = true; setPR(); }, get st(){ return {cur,stage,trans: S.trans,surfOn: S.surfOn,veil: S.veil,grp: S.grp,mbT: S.mbT,pr:PR.v[S.surfOn ? 1 : 0],ui,wide,topH: S.topH,botH: S.botH,dwell,durCur}; }, get PR(){ return PR; }};
}

export { installTestHooks };
