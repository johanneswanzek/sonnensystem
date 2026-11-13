// testing/hooks – Prüfhaken für Tests (window.__t). Nur im Testmodus (vite build --mode test) aufgerufen.
// Exporte: installTestHooks
// Hängt ab von: app/governor.js, app/tour.js, audio/engine.js, data/bodies.js, i18n/index.js, ui/fullscreen.js, ui/layout.js, core/state.js

import { S } from '../core/state.js';
import { PR, setPR } from '../app/governor.js';
import { cur, durCur, dwell, focus, narId, setStage, speedIdx, stage, step, tour } from '../app/tour.js';
import { AU } from '../audio/engine.js';
import { BODIES, SPEEDS } from '../data/bodies.js';
import { LANG } from '../i18n/index.js';
import { cine } from '../ui/fullscreen.js';
import { ui, wide } from '../ui/layout.js';

// Prüfhaken für die Tests (window.__t), nur im Testmodus aufgerufen
function installTestHooks() {
  window.__t = {
    focus,
    setStage,
    step,
    seek: x => {
      S.narStart = performance.now() - x * 1000;
    },
    tourEnd: () => {
      S.tourT = dwell;
    },
    pr: x => {
      PR.v = [x, x];
      PR.hi = [x, x];
      PR.lo = x;
      PR.fix = true;
      setPR();
    },
    get st() {
      return {
        cur,
        stage,
        trans: S.trans,
        surfOn: S.surfOn,
        veil: S.veil,
        grp: S.grp,
        mbT: S.mbT,
        pr: PR.v[S.surfOn ? 1 : 0],
        ui,
        wide,
        topH: S.topH,
        botH: S.botH,
        dwell,
        durCur,
      };
    },
    get PR() {
      return PR;
    },
    get ex() {
      return {
        tour,
        begun: S.begun,
        soundMode: S.soundMode,
        speedIdx,
        cine,
        LANG,
        narId,
        loops: S.loops,
        simDays: S.simDays,
        dwell,
        tourT: S.tourT,
        clock: S.clock,
        auStarted: AU.started,
        auActive: AU.active,
        speeds: SPEEDS,
        nBodies: BODIES.length,
        ids: BODIES.map(b => b.id),
      };
    },
  };
}

export { installTestHooks };
