// audio/engine – Ton (AU): Web Audio, Musikstück als Schleife, Sprecher-Clips, Effekte, Absenken der Musik unter der Stimme.
// Exporte: AU; initEngine
// Hängt ab von: data/voice.js, i18n/index.js
// Erzeugt von tools/refactor/split.mjs aus src/sonnensystem.html – bis zum Ende des Umbaus nicht von Hand ändern.

import { VOICE } from '../data/voice.js';
import { LANG } from '../i18n/index.js';

// Belegt in initEngine() (Reihenfolge des Starts, siehe main.js)
let AU;

export function initEngine(){
/* ---------- Ton: Musikstück als Schleife, Effekte und Sprecher (Web Audio) ---------- */
AU = (function(){
  let ctx = null, master, music, musicLP, bed, sfx, voiceBus, revIn, dlyIn, duck, rumbleG, windG, noiseBuf;
  let started = false, muted = false, musicOn = true, voiceCur = null, clipsReady = null, track = null, playing = false, t0 = 0;
  const clips = {};
  // Musik: ein Stück mit ruhigem Auftakt, danach läuft der Mittelteil als nahtlose Schleife (32 Takte bei 122 BPM).
  // loop0 und loop1 sind die Schleifenpunkte in Sekunden, grid0 ist der erste Schlag, beat die Schlaglänge.
  const MUSIC = {file:'audio/music.mp3', loop0:51.6048, loop1:114.5659, beat:0.49188, grid0:0.4488}, BEAT = MUSIC.beat;
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
    sfx = ctx.createGain(); sfx.gain.value = .6; sfx.connect(master);
    voiceBus = ctx.createGain(); voiceBus.gain.value = 1.35; voiceBus.connect(master);
    noiseBuf = ctx.createBuffer(1,ctx.sampleRate*2,ctx.sampleRate);
    const nd = noiseBuf.getChannelData(0); for (let i = 0; i < nd.length; i++) nd[i] = Math.random()*2-1;
    // Grollen der Sonne: braunes Rauschen, tief gefiltert
    const bb = ctx.createBuffer(1,ctx.sampleRate*3,ctx.sampleRate), bd = bb.getChannelData(0); let acc = 0;
    for (let i = 0; i < bd.length; i++) { acc = (acc+.02*(Math.random()*2-1))/1.02; bd[i] = acc*3.5; }
    const rs = ctx.createBufferSource(); rs.buffer = bb; rs.loop = true;
    const rl = ctx.createBiquadFilter(); rl.type = 'lowpass'; rl.frequency.value = 160;
    rumbleG = ctx.createGain(); rumbleG.gain.value = 0;
    rs.connect(rl); rl.connect(rumbleG); rumbleG.connect(sfx); rs.start();
    // Wind auf dem Mars: dünn und leise
    const ws = ctx.createBufferSource(); ws.buffer = noiseBuf; ws.loop = true;
    const wf = ctx.createBiquadFilter(); wf.type = 'bandpass'; wf.frequency.value = 380; wf.Q.value = .45;
    windG = ctx.createGain(); windG.gain.value = 0;
    ws.connect(wf); wf.connect(windG); windG.connect(sfx); ws.start();
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
  // Das Stück beginnt mit seinem Auftakt und bleibt dann in der Schleife
  function play(){
    if (!track || playing) return;
    playing = true; t0 = ctx.currentTime+.12;
    music.gain.setValueAtTime(0,ctx.currentTime); music.gain.linearRampToValueAtTime(musicOn ? .8 : 0,t0+2.5);
    const s = ctx.createBufferSource(); s.buffer = track; s.loop = true; s.loopStart = MUSIC.loop0; s.loopEnd = MUSIC.loop1; s.connect(bed); s.start(t0,0);
  }
  function loadMusic(){
    if (track !== null) return;
    track = false;
    decode(MUSIC.file).then(b => { track = b; play(); }).catch(() => { track = null; });
  }
  function hush(){
    if (!voiceCur) return;
    const v = voiceCur; voiceCur = null;
    try { v.g.gain.setTargetAtTime(0,ctx.currentTime,.04); v.src.stop(ctx.currentTime+.25); } catch (e) {}
    duck.gain.setTargetAtTime(1,ctx.currentTime,.4);
  }
  function boom(level){
    const t = ctx.currentTime, o = tone('sine',110,t,1.7); o.frequency.exponentialRampToValueAtTime(34,t+.6);
    const g = ad(t,.006,level,1.4); o.connect(g); g.connect(sfx); send(g,revIn,.5);
    const n = noise(t,.5), f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 700;
    const ng = ad(t,.004,level*.4,.4); n.connect(f); f.connect(ng); ng.connect(sfx); send(ng,revIn,.8);
  }
  return {
    get active(){ return started && !muted; },
    get started(){ return started; },
    // Muss aus einem Tipp heraus aufgerufen werden
    start(){
      if (!init()) return Promise.resolve(false);
      const p = ctx.resume ? ctx.resume() : null; if (p && p.catch) p.catch(() => {});
      started = true; muted = false;
      master.gain.setTargetAtTime(.9,ctx.currentTime,.3);
      loadMusic();
      return loadClips().then(() => true);
    },
    mute(on){
      if (!ctx) return;
      muted = on; if (on) hush();
      master.gain.setTargetAtTime(on ? 0 : .9,ctx.currentTime,.08);
    },
    // Musik allein aus- und einschalten; Sprecher und Effekte bleiben
    music(on){ musicOn = on; if (ctx && playing) music.gain.setTargetAtTime(on ? .8 : 0,ctx.currentTime,.25); },
    pause(on){ if (!ctx || !started) return; try { if (on) ctx.suspend(); else if (!muted) ctx.resume(); } catch (e) {} },
    // Sprecher; liefert die Dauer bis zum Ende in Sekunden (0, wenn nichts gesprochen wird)
    say(id,delay){
      if (!ctx || !started || muted) return 0;
      hush();
      const buf = clips[id]; if (!buf) return 0;
      const t = ctx.currentTime+(delay || 0), src = ctx.createBufferSource(), g = ctx.createGain();
      src.buffer = buf; src.connect(g); g.connect(voiceBus); send(g,revIn,.06);
      src.start(t); voiceCur = {src,g};
      duck.gain.setTargetAtTime(.3,t,.2);
      src.onended = () => { if (voiceCur && voiceCur.src === src) { voiceCur = null; duck.gain.setTargetAtTime(1,ctx.currentTime,.7); } };
      return buf.duration+(delay || 0);
    },
    // Flug: der Filter schließt sich, die Musik klingt wie aus der Ferne, Rauschen zieht vorbei
    flight(dur){
      if (!this.active) return;
      const t = ctx.currentTime;
      bed.gain.cancelScheduledValues(t); bed.gain.setTargetAtTime(.7,t,.3);
      musicLP.frequency.cancelScheduledValues(t); musicLP.frequency.setTargetAtTime(420,t,.45);
      const n = noise(t,dur+.5), f = ctx.createBiquadFilter(); f.type = 'bandpass'; f.Q.value = 1.3;
      f.frequency.setValueAtTime(240,t); f.frequency.exponentialRampToValueAtTime(3000,t+dur*.8); f.frequency.exponentialRampToValueAtTime(500,t+dur+.3);
      const g = ctx.createGain(); g.gain.setValueAtTime(.0001,t); g.gain.exponentialRampToValueAtTime(.22,t+dur*.78); g.gain.exponentialRampToValueAtTime(.0001,t+dur+.4);
      n.connect(f); f.connect(g); g.connect(sfx); send(g,revIn,.5);
    },
    // Ankunft: tiefer Schlag, der Filter öffnet sich auf der nächsten Zählzeit
    arrive(){
      if (!this.active) return;
      const t = ctx.currentTime, tg = t0+MUSIC.grid0, tb = playing ? tg+Math.ceil((t-tg)/BEAT)*BEAT : t;
      bed.gain.cancelScheduledValues(t); bed.gain.setTargetAtTime(1,tb,.1);
      musicLP.frequency.cancelScheduledValues(t); musicLP.frequency.setTargetAtTime(18000,Math.max(t,tb-.2),.12);
      boom(.5);
    },
    boom(){ if (this.active) boom(.7); },
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
    rumble(v){ if (ctx && started) rumbleG.gain.setTargetAtTime(v,ctx.currentTime,.4); },
    wind(v){ if (ctx && started) windG.gain.setTargetAtTime(v*.1,ctx.currentTime,.7); }
  };
})();
}

export { AU };
