// Zuordnung für den Umbau des Monolithen (tools/refactor/split.mjs): welche Abschnitte und Deklarationen in
// welches Modul gehen, welche Variablen ins Zustandsobjekt S wandern, welche Daten als JSON herausgelöst werden.
//
// Regeln (siehe split.mjs):
// - Jeder Abschnitt `/* ---------- Name ---------- */` hat ein Standardmodul (`sections`, Schlüssel = Anfang des Namens).
// - `decls` ordnet einzelne Deklarationen (Name) oder Anweisungen (`@Anfang des Quelltexts`) einem anderen Modul zu.
// - Anweisungen ohne Namen (Ausdrücke, if, Blöcke) bleiben im Modul der vorangehenden Anweisung desselben Abschnitts.
// - Neue, hier unbekannte Deklarationen landen im Standardmodul ihres Abschnitts; ein neuer Abschnitt ohne Eintrag
//   ist ein Fehler mit Hinweis.
// - `state`: Variablen, die mehrere Module schreiben; sie werden überall zu `S.<name>`. Schreibt ein Modul eine
//   fremde Variable, die hier fehlt, bricht das Skript mit Fundstelle ab (oder nimmt sie mit --auto-state auf).

export const sections = {
  'Kopf': 'core/util.js',                // Hilfsfunktionen vor dem ersten Abschnitt
  'Sprache': 'i18n/index.js',
  'Daten': 'data/bodies.js',
  'DOM': 'ui/dom.js',
  'Ton': 'audio/engine.js',
  'Oberflächen': 'render/surfaces.js',
  'Kleine Canvas-Texturen': 'render/canvas-textures.js',
  'Bahnmechanik': 'orbit/kepler.js',
  'Shader': 'render/shaders/space.js',
  'Nachbearbeitung': 'render/post.js',   // erwarteter neuer Abschnitt (POST); fehlt er, bleibt der Eintrag ungenutzt
  'Szene': 'render/scene.js',
  'Mars-Basis': 'mars/base.js',
  'Zustand': 'app/tour.js',
  'Eingaben': 'ui/controls.js',
  'Messmarken': 'hud/draw.js',
  'Schleife': 'app/loop.js',
  'Start': 'app/boot.js',
};

export const decls = {
  // Daten
  VOICE_DE: 'data/voice.js', VOICE_EN: 'data/voice.js', VOICE_PL: 'data/voice.js', VOICE: 'data/voice.js',
  // DOM: Sprachwahl, Leiste, Quellen-Dialog, Renderer
  langBtn: 'ui/language-menu.js', openLang: 'ui/language-menu.js',
  '@BODIES.forEach((b,i) => {': 'ui/rail.js',
  creditsEl: 'ui/credits.js',
  fail: 'render/renderer.js', renderer: 'render/renderer.js',
  // Oberflächen
  BAKE_VS: 'render/shaders/bake.js', BAKE_LIB: 'render/shaders/bake.js', BAKE_MAIN: 'render/shaders/bake.js', EARTH_GEO: 'render/shaders/bake.js',
  nextFrame: 'render/bake.js', bakeScene: 'render/bake.js', bakeQuad: 'render/bake.js', bake: 'render/bake.js', bakeFlat: 'render/bake.js',
  // Mars-Basis
  MB_GLSL: 'mars/shaders.js', SKY_FS: 'mars/shaders.js', DESKTOP: 'core/device.js',
  // Zustand
  W: 'ui/layout.js', ui: 'ui/layout.js', guard: 'ui/layout.js', measure: 'ui/layout.js',
  PR: 'app/governor.js', setPR: 'app/governor.js', prLimits: 'app/governor.js', govern: 'app/governor.js',
  pos: 'app/camera.js', fromTgt: 'app/camera.js', dPos: 'app/camera.js', desired: 'app/camera.js', camAt: 'app/camera.js', user: 'app/camera.js',
  soundBtn: 'ui/sound.js', SND: 'ui/sound.js', soundMode: 'ui/sound.js', toast: 'ui/sound.js', showSound: 'ui/sound.js', setSound: 'ui/sound.js',
  begin: 'app/tour.js',
  // Eingaben
  fullBtn: 'ui/fullscreen.js', cine: 'ui/fullscreen.js', setCine: 'ui/fullscreen.js', fsElement: 'ui/fullscreen.js', onFs: 'ui/fullscreen.js',
  ptrs: 'ui/controls.js',
  // Messmarken
  moonTags: 'hud/planet.js', planetHUD: 'hud/planet.js',
  sunHUD: 'hud/sun.js', overviewHUD: 'hud/overview.js',
  cloudFX: 'hud/earth.js', GEO: 'hud/earth.js', GEO_T_DE: 'hud/earth.js', GEO_T_EN: 'hud/earth.js', GEO_T_PL: 'hud/earth.js',
  gA: 'hud/earth.js', geoHUD: 'hud/earth.js', LAYERS: 'hud/earth.js', coreHUD: 'hud/earth.js',
  beltHUD: 'hud/belt.js', baseHUD: 'hud/base.js', drawHUD: 'hud/index.js',
  // Start
  installTestHooks: 'testing/hooks.js',
  // Nachbearbeitung (aus Zweig v9-space, Abschnitt Szene)
  POST: 'render/post.js',
  // Szene nach Körpern
  buildBackdrop: 'render/scene/backdrop.js', buildSun: 'render/scene/sun.js', buildPlanet: 'render/scene/planets.js',
  rockGeo: 'render/scene/minor.js', flightRocks: 'render/scene/minor.js', FLIGHT_N: 'render/scene/minor.js', _m4: 'render/scene/minor.js',
  buildMinor: 'render/scene/minor.js', setVesta: 'render/scene/minor.js', scatterFlight: 'render/scene/minor.js',
  buildExtras: 'render/scene/extras.js',
};

// Konstanten, die aus einer IIFE (AU, MB, POST) in ein eigenes Modul wandern: { Besitzer: { Zielmodul: [Namen] } }.
// Nur reine Tabellen und GLSL ohne Bezug auf Variablen der IIFE (split.mjs prüft das und bricht sonst ab).
export const inner = {
  AU: { 'audio/tracks.js': ['MUSIC', 'BEAT', 'TRACKS', 'SFX'] },
  MB: { 'mars/layout.js': ['FLAT', 'OBST', 'HAB', 'AST_YAW', 'ROVER_YAW', 'CRATERS', 'DUST', 'STEAM'] },
  POST: { 'render/shaders/post.js': ['VSQ'] },
};

// Gemeinsamer veränderlicher Zustand: von mehreren Modulen geschrieben (mit --auto-state ermittelt, dann hier festgehalten)
export const state = [
  'milkyTex', 'sunMat', 'belt', 'kuiper', 'pulse', 'halleyTail',
  'H', 'W', 'begun', 'blipI', 'botH', 'camLen', 'clock', 'cloudOp', 'effSpeed', 'grp', 'grpA', 'grpT',
  'hudKey', 'hudT', 'hudVis', 'last', 'lastDay', 'loops', 'mbT', 'moonTex', 'narStart', 'plate', 'pulseA',
  'pulseHit', 'pulseHitT', 'pulseR', 'pulseT', 'roll', 'shiftCur', 'shiftX', 'shiftXT', 'simDays',
  'soundMode', 'surfOn', 'tFocus', 'tStage', 'topH', 'topL', 'tourT', 'trans', 'veil',
];

// Daten, die als JSON herausgelöst werden. `prop`: nur diese Eigenschaft des Objekts (Übersetzungen);
// sonst wird der ganze Anfangswert ersetzt durch `<ident>.<key>`.
export const extract = [
  { decl: 'TR', prop: 'en', file: 'i18n/en.json', ident: 'en' },
  { decl: 'TR', prop: 'pl', file: 'i18n/pl.json', ident: 'pl' },
  { decl: 'VOICE_DE', file: 'data/voice.de.json', key: 'clips', ident: 'voiceDe' },
  { decl: 'VOICE_EN', file: 'data/voice.en.json', key: 'clips', ident: 'voiceEn' },
  { decl: 'VOICE_PL', file: 'data/voice.pl.json', key: 'clips', ident: 'voicePl' },
  { decl: 'GEO_T_DE', file: 'data/voice.de.json', key: 'geo', ident: 'voiceDe' },
  { decl: 'GEO_T_EN', file: 'data/voice.en.json', key: 'geo', ident: 'voiceEn' },
  { decl: 'GEO_T_PL', file: 'data/voice.pl.json', key: 'geo', ident: 'voicePl' },
];

// Textstellen im Monolithen, die vor dem Zerlegen ersetzt werden (je genau ein Vorkommen, sonst Abbruch).
// Sie ersetzen die Zeichenketten-Ersetzungen aus tools/build.py: Prüfhaken nur im Testmodus, Ziel als Bauzeit-Konstante.
const TEST = "import.meta.env.MODE === 'test'";
export const swaps = [
  // Ton: lesender Zustand von AU für die Prüfung der Überblendungen (window.__au.st), nur im Testmodus
  ['  const ease = s => s*s*(3-2*s);', '  const ease = s => s*s*(3-2*s);\n  if (' + TEST + ') window.__au = {get st(){ const n = ctx ? ctx.currentTime : 0; return {shown, want, live:live.length, liveNames:live.map(h => h.grp), ' +
    "lv:{main:lvl('main',n), earth:lvl('earth',n), mars:lvl('mars',n)}, src:{earth:!!tk.earth.src, mars:!!tk.mars.src}, " +
    "buf:{main:!!track, earth:!!tk.earth.buf, mars:!!tk.mars.buf}, raw:{earth:!!tk.earth.raw, mars:!!tk.mars.raw}, smp:Object.keys(smp).length, loops:Object.keys(loops), started, playing}; }};"],
  // Prüfhaken (bisher build.py hooks): window.__t wird in testing/hooks.js gesetzt
  ['boot().catch(err => { console.error(err); fail(); });\n})();\n', 'boot().catch(err => { console.error(err); fail(); });\n' +
    '// Prüfhaken für die Tests (window.__t), nur im Testmodus aufgerufen\n' +
    'function installTestHooks(){\n' +
    '  window.__t = {focus, setStage, step, seek: x => { narStart = performance.now()-x*1000; }, tourEnd: () => { tourT = dwell; }, ' +
    'pr: x => { PR.v = [x,x]; PR.hi = [x,x]; PR.lo = x; PR.fix = true; setPR(); }, ' +
    'get st(){ return {cur,stage,trans,surfOn,veil,grp,mbT,pr:PR.v[surfOn ? 1 : 0],ui,wide,topH,botH,dwell,durCur}; }, get PR(){ return PR; }, ' +
    'get ex(){ return {tour,begun,soundMode,speedIdx,cine,LANG,narId,loops,simDays,dwell,tourT,clock,auStarted:AU.started,auActive:AU.active,speeds:SPEEDS,nBodies:BODIES.length,ids:BODIES.map(b => b.id)}; }};\n' +
    '}\n})();\n'],
  ['boot().catch', 'if (' + TEST + ') installTestHooks();\nboot().catch'],
  ['cam.lookAt(v1.x+Math.sin(v2.x)*cp*50,v1.y+Math.sin(v2.y)*50,v1.z+Math.cos(v2.x)*cp*50);',
   'cam.lookAt(v1.x+Math.sin(v2.x)*cp*50,v1.y+Math.sin(v2.y)*50,v1.z+Math.cos(v2.x)*cp*50); if (' + TEST + ' && window.__cam) { const c = window.__cam; cam.position.set(c[0],c[1],c[2]); cam.lookAt(c[3],c[4],c[5]); }'],
  ['MB.update(mbT,dt,clock,reduced)', 'MB.update(mbT,dt,' + TEST + ' && window.__clk != null ? window.__clk : clock,reduced)'],
  ['if (down) mbT = narT();', 'if (down) mbT = ' + TEST + ' && window.__mbt != null ? window.__mbt : narT();'],
  // Ohne Grafikkarte dauert die volle Desktop-Ausstattung Sekunden je Bild: im Test aus, mit VITE_DESK=1 an
  ['const DESKTOP = !!(window.matchMedia', "const DESKTOP = (!(" + TEST + ") || import.meta.env.VITE_DESK === '1') && !!(window.matchMedia"],
  // Modelle: Website GLB, Artefakt glTF als JSON
  ["L.load('models/' + n + '.json',", "L.load('models/' + n + MODEL_EXT,"],
];

// Ausdrücke `a.b`, die durch einen Bezeichner ersetzt werden, und Bezeichner, die von außen kommen
export const members = { 'window.THREE': 'THREE', 'window.SITE': 'SITE_CFG', 'THREE.GLTFLoader': 'GLTFLoader' };
export const externals = {
  THREE: "import * as THREE from 'three';",
  GLTFLoader: "import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';",
  SITE_CFG: { module: 'core/target.js' },
  MODEL_EXT: { module: 'core/target.js' },
};

// Stil: Aufteilung nach den Kommentaren am Zeilenanfang (Anfang des Kommentars -> Datei). Reihenfolge bleibt.
export const styles = [
  ['/* Layout:', 'base.css'],
  ['/* Auf der hellen Marsoberfläche', 'hud.css'],
  ['/* Sprachwahl', 'language-menu.css'],
  ['/* Schmale Bildschirme', 'rail.css'],
  ['/* Startknopf', 'start.css'],
  ['/* Vollbild', 'fullscreen.css'],
  ['/* Weiter und Zurück', 'nav.css'],
  ['/* Querformat', 'layout-wide.css'],
  ['/* Quellen und Lizenzen', 'dialog.css'],
];

// Kopfkommentare der erzeugten Module (Zweck); Exporte und Abhängigkeiten ergänzt das Skript
export const purpose = {
  'core/util.js': 'Kleine Hilfen: DOM-Abfrage $, Winkel, clamp, Glättung und Easing, reduzierte Bewegung.',
  'core/device.js': 'Geräteklasse: DESKTOP schaltet die teure Ausstattung frei (Maus, große Texturen).',
  'i18n/index.js': 'Sprache: LANG, LOC, Übersetzung tr/fill (Schlüssel ist der deutsche Text), setLang. Wörterbücher in en.json, pl.json.',
  'data/bodies.js': 'Himmelskörper (BODIES) mit Bahnelementen, Monden und Texten; Halley, Szenenradius, Zeitraffer.',
  'data/voice.js': 'Sprecher-Clips je Sprache: Dauer und Zeitmarken (voice.<sprache>.json, geschrieben von tools/audio/finalize.py).',
  'ui/dom.js': 'Elemente der Seite, Übersetzen der festen Texte (data-t, aria-label).',
  'ui/language-menu.js': 'Sprachwahl oben rechts.',
  'ui/rail.js': 'Leiste der Himmelskörper und Beschriftungen in der Szene.',
  'ui/credits.js': 'Dialog „Quellen“, Impressum und Datenschutz (nur Website), Titel und Beschreibung je Sprache.',
  'render/renderer.js': 'WebGL-Renderer und Fehleranzeige, wenn WebGL fehlt.',
  'audio/engine.js': 'Ton (AU): Web Audio, Musikstück als Schleife, Sprecher-Clips, Effekte, Absenken der Musik unter der Stimme.',
  'render/shaders/bake.js': 'GLSL der gebackenen Oberflächen (Rauschen, Höhen, Erde).',
  'render/surfaces.js': 'SURF: prozedurale Oberflächen der Himmelskörper als Shader-Bausteine.',
  'render/bake.js': 'Backen auf der Grafikkarte: Shader in eine Textur rechnen (bake, bakeFlat).',
  'render/canvas-textures.js': 'Kleine Canvas-Texturen: Ringe, Lichtpunkte, Strahlen; Wertrauschen.',
  'orbit/kepler.js': 'Bahnmechanik: Kepler-Bahnen aus Bahnelementen für ein Datum (reine Funktionen).',
  'render/shaders/space.js': 'GLSL der Weltraumszene: Planeten, Wolken, Schnitt, Halo, Sonne, Ringe, Bahnen.',
  'render/post.js': 'Nachbearbeitung (POST): HDR-Ziel mit MSAA, Bloom in Stufen, Belichtung, Tonemapping, Vignette, Korn.',
  'render/scene.js': 'Weltraumszene: Szene, Kamera, gemeinsame Hilfen (Punktwolken, Halo, Bahnlinien, Marker), geteilte Texturen.',
  'mars/shaders.js': 'GLSL der Marsszene: Luftperspektive und Bodendetail (MB_GLSL), Himmel (SKY_FS).',
  'mars/layout.js': 'Feste Daten der Marsbasis: ebene Flächen, Hindernisse der Kamera, Wohnmodule, Dunst (HZ), Krater, Teilchenfarben.',
  'audio/tracks.js': 'Tondaten: Hauptstück (MUSIC, BEAT), Zusatzstücke je Halt (TRACKS), Effekt-Samples (SFX).',
  'render/shaders/post.js': 'GLSL der Nachbearbeitung: Vertex-Shader des Vollbild-Rechtecks.',
  'render/scene/backdrop.js': 'Hintergrund: Sterne und Milchstraße.',
  'render/scene/sun.js': 'Sonne mit Korona, Halo und Strahlen.',
  'render/scene/planets.js': 'Planeten mit Atmosphäre, Wolken, Ringen, Monden und Bahnen.',
  'render/scene/minor.js': 'Kleinkörper: Vesta, Asteroiden des Gürtels und Felsbrocken beim Durchflug.',
  'render/scene/extras.js': 'Zusätze der Szene: Komet Halley, Kuipergürtel, Lichtpuls.',
  'mars/base.js': 'Marsbasis (MB): eigene Szene auf der Oberfläche in Metern – Gelände, Bauten, Fahrzeuge, Kamerafahrt, Teilchen.',
  'app/tour.js': 'Tour: Erzählzeit (narT, cue), focus, setStage, narrate, showInfo, Schritte, Zeitraffer, Beginn.',
  'ui/layout.js': 'Layout: measure() setzt Maßstab ui, Querformat wide, freie Flächen und Schutzzonen.',
  'app/governor.js': 'Auflösungsregler PR/govern: misst die Bilddauer und passt die Renderauflösung an.',
  'app/camera.js': 'Kamera: Sollposition je Körper und Abschnitt (desired), Kamerapfad, Eingriffe des Nutzers.',
  'ui/sound.js': 'Tonknopf, Hinweise (toast), Tonmodus.',
  'ui/controls.js': 'Eingaben: Knöpfe, Tastatur, Zeiger (Ziehen, Kneifen, Rad).',
  'ui/fullscreen.js': 'Vollbild und Kinoansicht.',
  'hud/draw.js': 'Messmarken: Grundformen auf dem Overlay-Canvas (Linien, Beschriftungen, Maßstäbe).',
  'hud/planet.js': 'Messmarken eines Planeten und seiner Monde.',
  'hud/sun.js': 'Messmarken der Sonne.',
  'hud/overview.js': 'Messmarken der Übersicht.',
  'hud/earth.js': 'Messmarken der Erde: Ozeane und Kontinente, Aufbau im Schnitt, Wolkenflug.',
  'hud/belt.js': 'Messmarken des Asteroidengürtels.',
  'hud/base.js': 'Beschriftungen der Stationen der Marsbasis.',
  'hud/index.js': 'drawHUD: zeichnet die Messmarken des aktuellen Körpers.',
  'app/loop.js': 'Schleife frame(): Kamera, Szenenwechsel mit Staubschleier, Rendern.',
  'app/boot.js': 'Start: Karten und Oberflächen vorbereiten, Szene bauen, Modelle nachladen.',
  'testing/hooks.js': 'Prüfhaken für Tests (window.__t). Nur im Testmodus (vite build --mode test) aufgerufen.',
};
