# Marsbasis (`src/mars/`) – lokale Regeln

Gilt für `base.js` (`MB`: Gelände, Bauten, Fahrzeuge, Kamerafahrt, Teilchen), `layout.js` (feste Daten) und `shaders.js` (GLSL).
Übergreifend: [`AGENTS.md`](../../AGENTS.md), [`docs/architecture.md`](../../docs/architecture.md). Die Marsbasis ist eine eigene Szene
auf der Oberfläche, Einheit **Meter**, gezeichnet über `POST.render` mit `lin:1`.

## Aufbau der Szene

- Gelände über `hgt(x,z)`. Stationen in Metern um die Zentralkuppel bei (0,0): Wohnmodule ringsum, Gewächshäuser (42,12) und (42,22),
  Solarfeld (−10,95), Reaktoren (300,−250) hinter einem Wall, Treibstoffanlage (275,−85), Landeplatz (430,−40), Antenne (62,−72),
  Hauptpiste bei z = 38.
- Die Kamera fährt über Stützpunkte `knots` (Ankunft und Abfahrt je Station, **relativ zu den Stichworten** des Clips `mars_base`);
  Gier- und Nickwinkel werden getrennt interpoliert, `OBST` (Daten in `layout.js`) hält sie von Bauten fern.
- Bewegte Dinge hängen als Funktionen `(t, dt, clk)` in `anim[]`: Landefähre (zum Stichwort `pad`), Tankwagen, zwei Rover,
  Hubschrauber, laufende Astronauten, Bagger, Staubteufel. Staub und Dampf sind zustandslose Teilchen (`Puffs`, `puffs.put(...)`), ihre
  Zahl ist begrenzt.
- Beschriftungen der Stationen erscheinen erst, wenn die Station im Bild ist (`baseHUD` in `src/hud/base.js`).

## Bild der Marsszene

- `haze(m,dust)` hängt an jedes Material (nach `build` per `traverse`, in `addModel` für die Modelle) die Luftperspektive `mbAir` aus
  `MB_GLSL` (`shaders.js`): Dunst mit Höhenabfall, zur Sonne heller, Werte in `HZ` (in `base.js`); vor dem Tonemapping, ersetzt den
  `Fog` der Szene. Optional heller Staub auf nach oben weisenden Flächen. Der Himmel geht am Horizont in dieselbe Dunstfarbe über.
- Der Boden (`soilDetail`) legt Muster in Weltkoordinaten über die Textur (dunkle Sandfelder mit Rippeln, Kies, großflächige Helligkeit)
  und leitet daraus das Relief ab.
- Der Schattenbereich folgt der Kamera (`fitShadow`, texelgerastert, PCF mit Radius); weiche Flecken (`blob`) verdunkeln den Boden unter
  Bauten und Fahrzeugen.
- Lichter, Triebwerksstrahl und Sonnenscheibe sind HDR-Werte über 1 (der Bloom macht daraus Glanz).
- **Bildstimmung (Art-Direction v9):** Sonne tief (≈15°, `sunDir`), starkes warmes Streiflicht, schwaches kühles Fülllicht; `haze()`
  halbiert dabei `envMapIntensity` (außer `userData.keepEnv`: Glas, Solarzellen). Dunstdichte und -abnahme in `HZ.mbHzP`. Bauten tragen Canvas-Texturen aus `tech(0|1)` (Paneelfugen, Nieten, Orange/Anthrazit-Streifen,
  Kennungen, Schmutz am Fuß; Leinwand unten = Fuß). Drei Ringe aus Tafelbergen (3,3/4,6/6,2 km) bilden den Horizont, `mbAir` stuft sie ab.
- Die POST-Parameter der Marsszene setzt `MB.render` (`lin:1, exposure:.95, bloom:.26, thr:2, knee:.8, vig:.24`). Tonemapping (ACES, sRGB) macht `POST`
  (`src/render/post.js`) für beide Szenen; die Weltraumszene ruft `POST.render` ohne `lin` auf (`app/loop.js`).

## Regeln und Fallstricke

- Die Kamerafahrt hängt an `cue(k)`, nicht an festen Zeiten. Wer Stichworte oder den Clip `mars_base` ändert, prüft die Fahrt in allen
  drei Sprachen (`--lang=en`, `--lang=pl`). Zeitmarken schreibt `tools/audio/finalize.py` nach `src/data/voice.<sprache>.json`.
- Eigene Variablen in `onBeforeCompile` dürfen nicht `r0`, `r1`, `m0` heißen (Makros von three.js, `cube_uv_reflection_fragment`).
- Modelle laden über `loadModels` (`src/app/boot.js`); das Skript blendet `createImageBitmap` während des Parsens aus, damit der
  `GLTFLoader` r128 Texturen über gewöhnliche Bildelemente lädt. Dateiendung der Modelle: `MODEL_EXT` (`.glb` Website, `.json` Artefakt).
- Teuer ist hier alles an `DESKTOP` (größere Schattenkarte, mehr Steine) zu hängen; `PR.v[1]` regelt die Auflösung der Oberfläche.
- Nur Einheit Meter; Weltraum-Größen und Marsbasis nicht vermischen.

## Prüfen

Bildschirmfotos mit fester Erzählzeit, nicht mit `seek` und `wait` (Software-Rendering ist langsam):
`SOFTWARE_GL=1 npm run shots -- 390 760 start focus:5 wait:5000 stage:1 wait:8000 mbt:45 wait:2000 shot:landung`. Freie Kamera mit
`cam:x,y,z,lx,ly,lz`, Uhr der bewegten Dinge mit `clk:S`. Danach E2E (`tests/e2e/erde-mars.spec.js`).
