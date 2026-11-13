// audio/engine – Ton (AU): Web Audio, Musikstück als Schleife, Sprecher-Clips, Effekte, Absenken der Musik unter der Stimme.
// Exporte: AU; initEngine
// Hängt ab von: audio/tracks.js, data/bodies.js, data/voice.js, i18n/index.js
// Erzeugt von tools/refactor/split.mjs aus src/sonnensystem.html – bis zum Ende des Umbaus nicht von Hand ändern.

import { BEAT, MUSIC, SFX, TRACKS } from './tracks.js';
import { BODIES } from '../data/bodies.js';
import { VOICE } from '../data/voice.js';
import { LANG } from '../i18n/index.js';

// Belegt in initEngine() (Reihenfolge des Starts, siehe main.js)
let AU;

export function initEngine(){
/* ---------- Ton: Musikstücke als Schleife, Effekte als Samples und Sprecher (Web Audio) ---------- */
AU = (function(){
  let ctx = null, master, music, musicLP, bed, sfx, sduck, voiceBus, revIn, dlyIn, duck, rumbleG, windG, noiseBuf, sunG, wsG, humG;
  let started = false, muted = false, musicOn = true, voiceCur = null, clipsReady = null, track = null, playing = false, t0 = 0;
  let want = 'main', shown = 'main', curBody = 0, sweepT = 0, tTick = 0, tStart = 0, sfxReady = null;
  const clips = {}, smp = {}, live = [], loops = {};
  const tk = {main:{g:null, gain:1, lv:{a:1,b:1,t0:0,dur:1}}, earth:{lv:{a:0,b:0,t0:0,dur:1}}, mars:{lv:{a:0,b:0,t0:0,dur:1}}};
  const mtof = m => 440*Math.pow(2,(m-69)/12);

  function impulse(sec){
    const n = Math.floor(ctx.sampleRate*sec), buf = ctx.createBuffer(2,n,ctx.sampleRate);
    for (let c = 0; c < 2; c++) { const d = buf.getChannelData(c); for (let i = 0; i < n; i++) d[i] = (Math.random()*2-1)*Math.pow(1-i/n,2.6); }
    return buf;
  }
  function init(){
    if (ctx) return true;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return false;
    try { if (navigator.audioSession) navigator.audioSession.type = 'playback'; } catch (e) {}   // iOS: auch bei Stummschalter hörbar
    try { ctx = new AC(); } catch (e) { return false; }
    master = ctx.createGain(); master.gain.value = 0;
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -7; comp.knee.value = 8; comp.ratio.value = 3; comp.attack.value = .006; comp.release.value = .2;
    master.connect(comp); comp.connect(ctx.destination);
    const rev = ctx.createConvolver(); rev.buffer = impulse(2.6);
    const revOut = ctx.createGain(); revOut.gain.value = .4; rev.connect(revOut); revOut.connect(master);
    revIn = ctx.createGain(); revIn.connect(rev);
    dlyIn = ctx.createGain();
    const d = ctx.createDelay(1.5), fb = ctx.createGain(), lp = ctx.createBiquadFilter(), dOut = ctx.createGain();
    d.delayTime.value = BEAT*.75; fb.gain.value = .4; lp.type = 'lowpass'; lp.frequency.value = 2600; dOut.gain.value = .4;
    dlyIn.connect(d); d.connect(lp); lp.connect(fb); fb.connect(d); lp.connect(dOut); dOut.connect(master);
    duck = ctx.createGain(); duck.connect(master);                       // senkt die Musik, solange der Sprecher spricht
    musicLP = ctx.createBiquadFilter(); musicLP.type = 'lowpass'; musicLP.frequency.value = 18000; musicLP.Q.value = .7; musicLP.connect(duck);
    music = ctx.createGain(); music.gain.value = 0; music.connect(musicLP);
    bed = ctx.createGain(); bed.connect(music);                          // nimmt die Musik während eines Flugs etwas zurück
    for (const k in tk) { tk[k].g = ctx.createGain(); tk[k].g.gain.value = tk[k].lv.a*(TRACKS[k] ? TRACKS[k].gain : 1); tk[k].g.connect(bed); }
    sduck = ctx.createGain(); sduck.connect(master);                     // senkt die Effekte, solange der Sprecher spricht
    sfx = ctx.createGain(); sfx.gain.value = .6; sfx.connect(sduck);
    voiceBus = ctx.createGain(); voiceBus.gain.value = 1.35; voiceBus.connect(master);
    noiseBuf = ctx.createBuffer(1,ctx.sampleRate*2,ctx.sampleRate);
    const nd = noiseBuf.getChannelData(0); for (let i = 0; i < nd.length; i++) nd[i] = Math.random()*2-1;
    // Grollen der Sonne (Rückfall, bis die Aufnahme geladen ist): braunes Rauschen, tief gefiltert
    const bb = ctx.createBuffer(1,ctx.sampleRate*3,ctx.sampleRate), bd = bb.getChannelData(0); let acc = 0;
    for (let i = 0; i < bd.length; i++) { acc = (acc+.02*(Math.random()*2-1))/1.02; bd[i] = acc*3.5; }
    const rs = ctx.createBufferSource(); rs.buffer = bb; rs.loop = true;
    const rl = ctx.createBiquadFilter(); rl.type = 'lowpass'; rl.frequency.value = 160;
    rumbleG = ctx.createGain(); rumbleG.gain.value = 0;
    rs.connect(rl); rl.connect(rumbleG); rumbleG.connect(sfx); rs.start();
    // Wind auf dem Mars (Rückfall): dünn und leise
    const ws = ctx.createBufferSource(); ws.buffer = noiseBuf; ws.loop = true;
    const wf = ctx.createBiquadFilter(); wf.type = 'bandpass'; wf.frequency.value = 380; wf.Q.value = .45;
    windG = ctx.createGain(); windG.gain.value = 0;
    ws.connect(wf); wf.connect(windG); windG.connect(sfx); ws.start();
    // Schleifen aus Aufnahmen: Sonne, Marswind, Maschinenbrummen der Basis (Pegel setzen rumble und wind)
    sunG = ctx.createGain(); sunG.gain.value = 0; sunG.connect(sfx);
    wsG = ctx.createGain(); wsG.gain.value = 0; wsG.connect(sfx);
    humG = ctx.createGain(); humG.gain.value = 0; humG.connect(sfx);
    return true;
  }
  function noise(t,dur){ const s = ctx.createBufferSource(); s.buffer = noiseBuf; s.loop = true; s.start(t,Math.random()*1.5); s.stop(t+dur); return s; }
  function tone(type,f,t,dur){ const o = ctx.createOscillator(); o.type = type; o.frequency.setValueAtTime(f,t); o.start(t); o.stop(t+dur); return o; }
  function ad(t,a,peak,d){ const g = ctx.createGain(); g.gain.setValueAtTime(.0001,t); g.gain.exponentialRampToValueAtTime(peak,t+a); g.gain.exponentialRampToValueAtTime(.0001,t+a+d); return g; }
  function send(node,bus,amt){ const g = ctx.createGain(); g.gain.value = amt; node.connect(g); g.connect(bus); }
  function decode(url){
    return fetch(url).then(r => { if (!r.ok) throw new Error(url); return r.arrayBuffer(); }).then(b => new Promise((res,rej) => ctx.decodeAudioData(b,res,rej)));
  }
  function loadClips(){
    if (!clipsReady) clipsReady = Promise.all(Object.keys(VOICE).map(id => decode('voice/' + (LANG === 'de' ? '' : LANG + '/') + id + '.mp3').then(buf => { clips[id] = buf; }).catch(() => {})));
    return clipsReady;
  }
  // Effekte im Hintergrund laden; fehlt eine Datei, bleibt der Rückfall (synthetisch oder Stille)
  function loadSfx(names){
    return Promise.all(names.filter(n => !smp[n]).map(n => decode('audio/sfx/' + n + '.mp3').then(b => { smp[n] = b; if (SFX[n].loop) ensureLoop(n); }).catch(() => {})));
  }
  function ensureLoop(n){
    if (!ctx || loops[n] || !smp[n]) return;
    const s = ctx.createBufferSource(); s.buffer = smp[n]; s.loop = true; s.loopStart = SFX[n].loop[0]; s.loopEnd = SFX[n].loop[1];
    s.connect(n === 'sun' ? sunG : n === 'mars_wind' ? wsG : humG); s.start(0,SFX[n].loop[0]); loops[n] = s;
  }
  // Ein Effekt; group: ein neuer Effekt derselben Gruppe blendet den laufenden aus (kein Aufschaukeln beim Weiterklicken)
  function playS(name,o){
    const b = smp[name]; if (!ctx || !b) return null;
    o = o || {}; const t = ctx.currentTime+(o.delay || 0), src = ctx.createBufferSource(), g = ctx.createGain(), gv = o.gain == null ? 1 : o.gain;
    src.buffer = b;
    if (o.fadeIn) { g.gain.setValueAtTime(0,t); g.gain.linearRampToValueAtTime(gv,t+o.fadeIn); } else g.gain.value = gv;
    src.connect(g); g.connect(sfx); if (SFX[name].rev) send(g,revIn,SFX[name].rev);
    const h = {src,g,grp:o.group || name}; live.push(h);
    src.onended = () => { const i = live.indexOf(h); if (i >= 0) live.splice(i,1); try { src.disconnect(); g.disconnect(); } catch (e) {} };
    src.start(t); return h;
  }
  function stopGroup(grp,tc){
    if (!ctx) return;
    const now = ctx.currentTime;
    live.slice().forEach(h => { if (h.grp === grp || grp === '*') { try { h.g.gain.cancelScheduledValues(now); h.g.gain.setTargetAtTime(0,now,tc || .06); h.src.stop(now+(tc || .06)*6); } catch (e) {} } });
  }
  // Musik: Pegel je Stück als Modell (Überblendung mit gleicher Leistung), damit eine neue Überblendung dort ansetzt, wo die alte steht
  const ease = s => s*s*(3-2*s);
  if (import.meta.env.MODE === 'test') window.__au = {get st(){ const n = ctx ? ctx.currentTime : 0; return {shown, want, live:live.length, liveNames:live.map(h => h.grp), lv:{main:lvl('main',n), earth:lvl('earth',n), mars:lvl('mars',n)}, src:{earth:!!tk.earth.src, mars:!!tk.mars.src}, buf:{main:!!track, earth:!!tk.earth.buf, mars:!!tk.mars.buf}, raw:{earth:!!tk.earth.raw, mars:!!tk.mars.raw}, smp:Object.keys(smp).length, loops:Object.keys(loops), started, playing}; }};
  function lvl(k,t){ const m = tk[k].lv; if (t <= m.t0) return m.a; const e = ease(Math.min(1,(t-m.t0)/m.dur)); return Math.sqrt(m.a*m.a+(m.b*m.b-m.a*m.a)*e); }
  function fadeTo(k,b,T,dur){
    const now = ctx.currentTime, a = lvl(k,now), tr = tk[k], gn = TRACKS[k] ? TRACKS[k].gain : 1;
    tr.lv = {a, b, t0:T, dur};
    const p = tr.g.gain; p.cancelScheduledValues(now); p.setValueAtTime(a*gn,now);
    if (a !== b) { const c = new Float32Array(48); for (let i = 0; i < 48; i++) c[i] = gn*Math.sqrt(a*a+(b*b-a*a)*ease(i/47)); p.setValueCurveAtTime(c,T,dur); }
  }
  // Zusatzstücke liegen als komprimierte Bytes bereit (raw) und werden erst beim Anflug dekodiert (buf); höchstens eines ist dekodiert
  function sweep(){
    clearTimeout(sweepT); if (!ctx) return;
    let pend = false;
    ['earth','mars'].forEach(k => { const m = tk[k];
      if (m.src && m.lv.b === 0) { if (ctx.currentTime >= m.lv.t0+m.lv.dur+.1) { try { m.src.stop(); m.src.disconnect(); } catch (e) {} m.src = null; } else pend = true; }
      if (!m.src && m.buf && want !== k) m.buf = null; });      // zurückgeblendet: dekodierten Puffer freigeben
    if (want !== 'main') ensureDecoded(want);
    if (pend) sweepT = setTimeout(sweep,800);
  }
  function ensureDecoded(k){
    const m = tk[k]; if (m.buf || m.dec || !m.raw) return;
    if (tk[k === 'earth' ? 'mars' : 'earth'].buf) return;     // das andere Stück zuerst freigeben (sweep ruft erneut auf)
    m.dec = true;
    new Promise((res,rej) => ctx.decodeAudioData(m.raw.slice(0),res,rej)).then(b => { m.dec = false; m.buf = b; applyPlace(); }).catch(() => { m.dec = false; m.raw = null; });
  }
  // Überblendung zum Stück des Ortes, auf der nächsten Zählzeit des Hauptstücks (alle Stücke 122 BPM, das Hauptstück läuft stumm weiter und gibt das Raster)
  function applyPlace(){
    if (!ctx || !playing || !started) return;
    if (want !== 'main') ensureDecoded(want);
    const target = want !== 'main' && tk[want].buf ? want : 'main';
    if (target === shown) { sweep(); return; }
    shown = target;
    const now = ctx.currentTime, tg = t0+MUSIC.grid0, T = tg+Math.ceil((now+.08-tg)/BEAT)*BEAT, D = 8*BEAT;
    if (target !== 'main' && !tk[target].src) {
      const c = TRACKS[target], s = ctx.createBufferSource();
      s.buffer = tk[target].buf; s.loop = true; s.loopStart = c.loop0; s.loopEnd = c.loop1; s.connect(tk[target].g); s.start(T,c.grid0); tk[target].src = s;
    }
    for (const k in tk) fadeTo(k,k === target ? 1 : 0,T,D);
    sweep();
  }
  function loadTracks(){
    ['earth','mars'].forEach(k => { if (tk[k].rawReq) return; tk[k].rawReq = true;
      fetch(TRACKS[k].file).then(r => { if (!r.ok) throw new Error(k); return r.arrayBuffer(); }).then(b => { tk[k].raw = b; applyPlace(); }).catch(() => {}); });
  }
  // Das Stück beginnt mit seinem Auftakt und bleibt dann in der Schleife
  function play(){
    if (!track || playing) return;
    playing = true; t0 = ctx.currentTime+.12;
    music.gain.setValueAtTime(0,ctx.currentTime); music.gain.linearRampToValueAtTime(musicOn ? .8 : 0,t0+2.5);
    const s = ctx.createBufferSource(); s.buffer = track; s.loop = true; s.loopStart = MUSIC.loop0; s.loopEnd = MUSIC.loop1; s.connect(tk.main.g); s.start(t0,0);
    applyPlace();
  }
  function loadMusic(){
    if (track !== null) return;
    track = false;
    decode(MUSIC.file).then(b => { track = b; play(); return loadSfx(Object.keys(SFX)); }).then(loadTracks).catch(() => { if (!track) track = null; });
  }
  function hush(){
    stopGroup('lander',.15);
    if (!voiceCur) return;
    const v = voiceCur; voiceCur = null;
    try { v.g.gain.setTargetAtTime(0,ctx.currentTime,.04); v.src.stop(ctx.currentTime+.25); } catch (e) {}
    duck.gain.setTargetAtTime(1,ctx.currentTime,.4); sduck.gain.setTargetAtTime(1,ctx.currentTime,.4);
  }
  function boom(level){
    const t = ctx.currentTime, o = tone('sine',110,t,1.7); o.frequency.exponentialRampToValueAtTime(34,t+.6);
    const g = ad(t,.006,level,1.4); o.connect(g); g.connect(sfx); send(g,revIn,.5);
    const n = noise(t,.5), f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 700;
    const ng = ad(t,.004,level*.4,.4); n.connect(f); f.connect(ng); ng.connect(sfx); send(ng,revIn,.8);
  }
  // Klick auf einen Knopf: sehr leiser Tick (ein Hörer für alle Knöpfe; Start und Ton-Knopf ausgenommen)
  document.addEventListener('click', e => {
    const b = e.target && e.target.closest ? e.target.closest('button') : null;
    if (b && b.id !== 'go' && b.id !== 'goQuiet') AU.tick();
  }, true);
  return {
    get active(){ return started && !muted; },
    get started(){ return started; },
    // Muss aus einem Tipp heraus aufgerufen werden
    start(){
      if (!init()) return Promise.resolve(false);
      const p = ctx.resume ? ctx.resume() : null; if (p && p.catch) p.catch(() => {});
      started = true; muted = false; tStart = ctx.currentTime;
      master.gain.setTargetAtTime(.9,ctx.currentTime,.3);
      loadSfx(['start','ui_tick']).then(() => { if (started && !muted && ctx.currentTime-tStart < 6) playS('start',{group:'start'}); });
      loadMusic();
      return loadClips().then(() => true);
    },
    mute(on){
      if (!ctx) return;
      muted = on; if (on) { hush(); stopGroup('*',.05); }
      master.gain.setTargetAtTime(on ? 0 : .9,ctx.currentTime,.08);
    },
    // Musik allein aus- und einschalten; Sprecher und Effekte bleiben
    music(on){ musicOn = on; if (ctx && playing) music.gain.setTargetAtTime(on ? .8 : 0,ctx.currentTime,.25); },
    pause(on){ if (!ctx || !started) return; try { if (on) ctx.suspend(); else if (!muted) ctx.resume(); } catch (e) {} },
    // Ort wechselt (Index in BODIES): Erde und Mars bekommen ihr eigenes Stück, alles andere das Hauptstück
    place(i){
      curBody = i; const id = BODIES[i] && BODIES[i].id;
      want = id === 'earth' ? 'earth' : id === 'mars' ? 'mars' : 'main';
      applyPlace();
    },
    // Sprecher; liefert die Dauer bis zum Ende in Sekunden (0, wenn nichts gesprochen wird)
    say(id,delay){
      if (!ctx || !started || muted) return 0;
      hush();
      const buf = clips[id]; if (!buf) return 0;
      const t = ctx.currentTime+(delay || 0), src = ctx.createBufferSource(), g = ctx.createGain();
      src.buffer = buf; src.connect(g); g.connect(voiceBus); send(g,revIn,.06);
      src.start(t); voiceCur = {src,g};
      duck.gain.setTargetAtTime(.3,t,.2); sduck.gain.setTargetAtTime(.55,t,.2);
      src.onended = () => { if (voiceCur && voiceCur.src === src) { voiceCur = null; duck.gain.setTargetAtTime(1,ctx.currentTime,.7); sduck.gain.setTargetAtTime(1,ctx.currentTime,.7); } };
      // Landung der Fähre: der Motor verstummt beim Aufsetzen (Stichwort pad + 5,6 s); die Aufnahme hat ihr Ende bei 8,0 s
      const pad = VOICE.mars_base && VOICE.mars_base.cues.pad;
      if (id === 'mars_base' && pad != null) playS('lander',{delay:(delay || 0)+pad+5.6-8.0, fadeIn:1.4, group:'lander'});
      return buf.duration+(delay || 0);
    },
    // Flug: der Filter schließt sich, die Musik klingt wie aus der Ferne; kind: 'stage' Kapitelwechsel, 'dive' Sturzflug, sonst Vorbeiflug
    flight(dur,kind){
      if (!this.active) return;
      const t = ctx.currentTime;
      bed.gain.cancelScheduledValues(t); bed.gain.setTargetAtTime(.7,t,.3);
      musicLP.frequency.cancelScheduledValues(t); musicLP.frequency.setTargetAtTime(420,t,.45);
      stopGroup('flight',.08); stopGroup('amb',.3);
      const nm = kind === 'dive' ? 'dive' : kind === 'stage' ? 'stage' : 'whoosh';
      if (smp[nm]) {      // der Höhepunkt der Aufnahme fällt in die Mitte des Flugs, beim Kapitelwechsel auf die Ankunft
        const delay = nm === 'dive' ? 0 : nm === 'stage' ? Math.max(0,dur-2.3) : Math.min(3.5,Math.max(0,dur*.5-.85));
        playS(nm,{delay, group:'flight'}); return;
      }
      const n = noise(t,dur+.5), f = ctx.createBiquadFilter(); f.type = 'bandpass'; f.Q.value = 1.3;
      f.frequency.setValueAtTime(240,t); f.frequency.exponentialRampToValueAtTime(3000,t+dur*.8); f.frequency.exponentialRampToValueAtTime(500,t+dur+.3);
      const g = ctx.createGain(); g.gain.setValueAtTime(.0001,t); g.gain.exponentialRampToValueAtTime(.22,t+dur*.78); g.gain.exponentialRampToValueAtTime(.0001,t+dur+.4);
      n.connect(f); f.connect(g); g.connect(sfx); send(g,revIn,.5);
    },
    // Ankunft: weicher Schlag, der Filter öffnet sich auf der nächsten Zählzeit; Gürtel und Saturn bekommen ihren Klang
    arrive(){
      if (!this.active) return;
      const t = ctx.currentTime, tg = t0+MUSIC.grid0, tb = playing ? tg+Math.ceil((t-tg)/BEAT)*BEAT : t;
      bed.gain.cancelScheduledValues(t); bed.gain.setTargetAtTime(1,tb,.1);
      musicLP.frequency.cancelScheduledValues(t); musicLP.frequency.setTargetAtTime(18000,Math.max(t,tb-.2),.12);
      if (smp.arrive) playS('arrive',{group:'hit'}); else boom(.5);
      const id = BODIES[curBody] && BODIES[curBody].id;
      if (id === 'belt') playS('belt',{delay:.25, group:'amb'});
      else if (id === 'saturn') playS('rings',{delay:.25, group:'amb'});
    },
    // Aufschneiden der Erde
    boom(){ if (!this.active) return; if (smp.cut) playS('cut',{group:'cut'}); else boom(.7); },
    // Klick auf einen Knopf
    tick(){
      if (!this.active || !smp.ui_tick) return;
      const t = performance.now(); if (t-tTick < 40) return; tTick = t;
      if (live.filter(h => h.grp === 'tick').length < 3) playS('ui_tick',{group:'tick'});
    },
    // Leiser Ton, wenn eine Messmarke erscheint
    blip(k){
      if (!this.active) return;
      const t = ctx.currentTime, o = tone('sine',mtof(81+[0,3,7,10,12,15,19,22][k%8]),t,.2), g = ad(t,.003,.028,.1);
      o.connect(g); g.connect(sfx); send(g,dlyIn,.35);
    },
    // Glocke, wenn der Lichtring eine Bahn erreicht
    ping(k){
      if (!this.active) return;
      const t = ctx.currentTime, f = mtof([69,72,74,76,79,81,84,86][k%8]), g = ad(t,.004,.08,1.7);
      tone('sine',f,t,1.8).connect(g); const o2 = tone('sine',f*2.76,t,.6), g2 = ad(t,.002,.3,.5); o2.connect(g2); g2.connect(g);
      g.connect(sfx); send(g,revIn,.7);
    },
    // Sonne: Schleife aus der Aufnahme (Rückfall: braunes Rauschen); die Aufnahme ist so ausgesteuert, dass v = .5 Verstärkung 1 ergibt
    rumble(v){
      if (!ctx || !started) return;
      const n = loops.sun ? 1 : 0, t = ctx.currentTime;
      sunG.gain.setTargetAtTime(v*2*n,t,.4); rumbleG.gain.setTargetAtTime(v*(1-n),t,.4);
    },
    // Marsoberfläche: Wind und Brummen der Basis (Rückfall: Rauschen)
    wind(v){
      if (!ctx || !started) return;
      const n = loops.mars_wind ? 1 : 0, t = ctx.currentTime;
      wsG.gain.setTargetAtTime(v*n,t,.7); humG.gain.setTargetAtTime(loops.base_hum ? v : 0,t,.9); windG.gain.setTargetAtTime(v*.1*(1-n),t,.7);
    }
  };
})();
}

export { AU };
