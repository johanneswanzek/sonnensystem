# Projektnotizen

Animierte 3D-Reise durch das Sonnensystem mit Sprecher und Musik, in Deutsch, Englisch und Polnisch. Quellsprache
der Oberfläche sowie Sprache der Kommentare und der Doku ist Deutsch. Live: https://sonnensystem.johannes-wanzek.de/ (GitHub Pages, Repo
`johanneswanzek/sonnensystem`, Deploy per Action bei Push auf `main`).

## Grundsätze

- **Eine Quelle:** Die ganze Seite steht in `src/sonnensystem.html` (Stil, Markup, Programm). Kein Framework,
  kein Bundler, keine Module. three.js r128 als klassisches Skript (`THREE` global).
- **Zwei Auslieferungen aus derselben Datei:**
  1. Website: `tools/build.py` macht daraus ein vollständiges Dokument und stellt Bibliotheken, Schriften und
     Modelle auf lokale Dateien um. Die Website lädt nichts von fremden Servern; `build.py` bricht ab, wenn
     im Ergebnis noch eine fremde Adresse steht.
  2. claude.ai-Artefakt: Die Datei wird unverändert veröffentlicht. Deshalb hat sie kein `<html>`, `<head>`
     oder `<body>`, lädt three.js von cdnjs/jsdelivr und die Schriften von Google Fonts, und die Modelle
     heißen dort `models/<name>.json` (glTF mit eingebetteten Daten, weil Artefakte kein `.glb` ausliefern;
     `tools/models/embed.mjs` erzeugt sie). `build.py` ersetzt genau diese Stellen; wer sie ändert, muss
     `build.py` anpassen.
- Alle Größen der Oberfläche hängen an der CSS-Variable `--u` (1px auf dem Handy, bis etwa 2px auf großen
  Monitoren), die Messmarken auf dem Overlay-Canvas am selben Faktor `ui`.
- Nach jeder Änderung prüfen: `node tools/test/run.js ...` im Handyformat (390×760) und im Querformat
  (1920×1080), bei Änderungen am Build zusätzlich `--dist`, bei Änderungen an Texten zusätzlich `--lang=en` und `--lang=pl`.

## Befehle

```
python tools/serve.py                      # http://localhost:8080, baut index.html bei jedem Aufruf neu
python tools/build.py [--apache]           # dist/
node tools/test/run.js 390 760 start focus:5 wait:5000 stage:1 wait:8000 mbt:45 wait:2000 shot:landung
node tools/test/run.js --dist 1280 720 go wait:6000 shot:start
```

Für `run.js` einmalig `cd tools/test && npm install && npx playwright install chromium`. Ohne Grafikkarte
`SOFTWARE_GL=1` setzen; dann ist jedes Bild langsam (im Querformat `pr:.5` als ersten Schritt nehmen) und
Wartezeiten sind unzuverlässig. Für die Marsbasis deshalb mit `mbt:S` eine feste Erzählzeit setzen statt mit
`seek` und `wait` zu arbeiten.

## Gliederung von `src/sonnensystem.html`

Die Abschnitte sind mit `/* ---------- Name ---------- */` markiert:

| Abschnitt | Inhalt |
| --- | --- |
| Sprache | `LANG` (aus `?lang=`, sonst letzte Wahl, sonst Browsersprache; unbekannt → Englisch), `TR` (Übersetzungen, Schlüssel ist der deutsche Text), `tr`, `fill`, `setLang` |
| Daten | `BODIES` (Index 0 Übersicht, 1 Sonne, 2 Merkur, 3 Venus, 4 Erde, 5 Mars, 6 Asteroidengürtel/Vesta, 7 Jupiter, 8 Saturn, 9 Uranus, 10 Neptun), `VOICE_DE`/`VOICE_EN`/`VOICE_PL` (Dauer und Zeitmarken je Clip), `VOICE` (die der gewählten Sprache) |
| DOM | Elemente, Übersetzen der festen Texte (`data-t`), Sprachwahl oben rechts, Leiste, Dialog „Quellen“ (`window.SITE` liefert Impressum und Datenschutz) |
| Ton | `AU`: Web Audio, drei Musikstücke als Schleife (`MUSIC`, `TRACKS`), Sprecher-Clips, Effekte als Samples (`SFX`), Absenken von Musik und Effekten unter der Stimme |
| Oberflächen | `SURF`: prozedurale Texturen, auf der Grafikkarte gebacken |
| Bahnmechanik | Kepler-Bahnen aus Bahnelementen für das angezeigte Datum |
| Shader, Szene | Planeten, Ringe, Sterne, Milchstraße, Bahnen, Erde mit Wolken und Schnitt, Sonne mit Korona (`SUN_FS`, `CORONA_FS`); `POST`: Nachbearbeitung |
| Mars-Basis | `MB`: eigene Szene auf der Oberfläche, Einheit Meter |
| Zustand | Auflösungsregler `PR`/`govern`, `measure`, `desired`, `focus`, `setStage`, `narrate` |
| Eingaben | Zeiger, Tastatur (Leertaste, Pfeile, F, M) |
| Messmarken | 2D-Overlay: `planetHUD`, `sunHUD`, `coreHUD`, `beltHUD`, `baseHUD`, `drawHUD` |
| Schleife | `frame`: Kamera, Szenenwechsel mit Staubschleier, Rendern |
| Start | `loadModels`, `boot` |

## Wichtige Zusammenhänge

- **Abschnitte je Körper:** Erde hat 0 Planet, 1 Nahansicht mit Ozeanen und Kontinenten, 2 Aufbau im Schnitt.
  Mars hat 0 Planet, 1 Basis. `setStage(n)` wechselt, die Tour läuft sie der Reihe nach durch.
- **Bild folgt Ton:** `narT()` ist die Sprecherzeit des laufenden Clips, `cue(k)` die Zeitmarke eines
  Stichworts aus `VOICE`. Einblendungen und die Kamerafahrt über die Marsbasis hängen an diesen Marken. Die
  Werte in `VOICE_*` und `GEO_T_*` schreibt `tools/audio/finalize.py`; von Hand nur ändern, wenn auch der Clip dazu passt.
- **Sprachen:** Alle Texte stehen deutsch im Programm; `tr('…')` schlägt sie in `TR` nach, fehlt ein Eintrag, bleibt
  der deutsche Text. Wer einen sichtbaren Text ändert oder ergänzt, muss den Schlüssel in `TR.en` und `TR.pl`
  mitziehen. Texte im Markup tragen `data-t`, `aria-label` wird immer übersetzt. Zahlen und Datum richten sich nach
  `LOC`. Die Clips liegen in `public/voice/` (Deutsch), `public/voice/en/` und `public/voice/pl/`, die Texte dazu
  in `docs/sprechertext.<Sprache>.json`. Ein Sprachwechsel lädt die Seite neu (Website: `?lang=`, Artefakt:
  gemerkte Wahl). Polnisch braucht das erweiterte Latein der Schriften (`public/vendor/fonts/*latin-ext*`).
- **Layout:** `measure()` setzt `ui` (Maßstab), `wide` (Querformat: Uhr und Titel in den Ecken, der Körper
  nutzt die volle Höhe; die Übersicht bleibt über dem Titel), `topH`/`botH` (freie Fläche) und `guard`
  (Flächen von Uhr und Titel, denen Beschriftungen ausweichen). `drawHUD` rechnet in Einheiten von `ui` und
  stellt `W`, `H`, `topH`, `botH` nach dem Zeichnen zurück.
- **Auflösung:** `PR.v[0]` Weltraum, `PR.v[1]` Marsoberfläche, in Bildpunkten je CSS-Pixel. `govern()` misst
  einmal je Sekunde die Bilddauer, senkt bei Rucklern, prüft, ob die Absenkung geholfen hat (sonst nimmt es
  sie zurück), und versucht bei flüssigem Lauf einen Schritt nach oben. `DESKTOP` (Maus, große Texturen)
  schaltet größere Schattenkarte, mehr Steine und Überabtastung auf Monitoren mit einfacher Pixeldichte frei.
- **Marsbasis (`MB`):** Gelände über `hgt(x,z)`, Stationen in Metern um die Zentralkuppel bei (0,0):
  Wohnmodule ringsum, Gewächshäuser (42,12) und (42,22), Solarfeld (−10,95), Reaktoren (300,−250) hinter
  einem Wall, Treibstoffanlage (275,−85), Landeplatz (430,−40), Antenne (62,−72), Hauptpiste bei z = 38.
  Die Kamera fährt über Stützpunkte `knots` (Ankunft und Abfahrt je Station, relativ zu den Stichworten),
  Gier- und Nickwinkel werden getrennt interpoliert, `OBST` hält sie von Bauten fern. Bewegte Dinge hängen
  als Funktionen `(t, dt, clk)` in `anim[]`: Landefähre (zum Stichwort `pad`), Tankwagen, zwei Rover,
  Hubschrauber, laufende Astronauten, Bagger, Staubteufel. Staub und Dampf sind zustandslose Teilchen
  (`Puffs`, `puffs.put(...)`), ihre Zahl ist begrenzt.
  Bild der Marsszene: `haze(m,dust)` hängt an jedes Material (nach `build` per `traverse`, in `addModel` für die Modelle)
  die Luftperspektive `mbAir` aus `MB_GLSL` (Dunst mit Höhenabfall, zur Sonne heller, Werte in `HZ`; vor dem Tonemapping,
  ersetzt den `Fog` der Szene) und optional hellen Staub auf nach oben weisenden Flächen. Der Himmel geht am Horizont in
  dieselbe Dunstfarbe über. Der Boden (`soilDetail`) legt Muster in Weltkoordinaten über die Textur (dunkle Sandfelder mit
  Rippeln, Kies, großflächige Helligkeit) und leitet daraus das Relief ab. Der Schattenbereich folgt der Kamera
  (`fitShadow`, texelgerastert, PCF mit Radius), weiche Flecken (`blob`) verdunkeln den Boden unter Bauten und Fahrzeugen.
  Lichter, Triebwerksstrahl und Sonnenscheibe sind HDR-Werte über 1.
  Bildstimmung (Art-Direction v9): Sonne tief (≈14°, `sunDir`), starkes warmes Streiflicht, schwaches kühles Fülllicht;
  `haze()` halbiert dabei `envMapIntensity` (außer `userData.keepEnv`: Glas, Solarzellen). Dunst erst ab einigen hundert Metern
  (`HZ.mbHzP`), Staubschleier am Boden nur als Akzent. Bauten tragen Canvas-Texturen aus `tech(0|1)` (Paneelfugen, Nieten,
  Orange/Anthrazit-Streifen, Kennungen, Schmutz am Fuß; Leinwand unten = Fuß). Drei Ringe aus Tafelbergen (3,3/4,6/6,2 km)
  bilden den Horizont, `mbAir` stuft sie ab. POST-Parameter der Marsszene in `MB.render`.
- **Ton (`AU`):** Hauptstück `audio/music.mp3` für alle Halte, `music-earth.mp3` für die Erde, `music-mars.mp3` für den
  Mars (beide Abschnitte). `AU.place(i)` (aus `focus`) blendet auf der nächsten Zählzeit des Hauptstücks mit gleicher
  Leistung über (8 Schläge); das Hauptstück läuft stumm weiter und gibt das Raster, die Zusatzstücke starten auf einem
  Schlag und werden nach der Überblendung gestoppt. Effekte laden im Hintergrund nach dem Hauptstück, die Zusatzstücke nur als komprimierte Bytes (`raw`); dekodiert wird erst beim Anflug (`AU.place`), nach dem Zurückblenden wird der Puffer freigegeben (höchstens ein Zusatzstück dekodiert);
  fehlt etwas, läuft das Hauptstück weiter bzw. der alte synthetische Effekt. Effekte (`audio/sfx/*.mp3`, `tools/audio/sfx.py`):
  `playS(name,{group,delay,...})` blendet laufende Effekte derselben Gruppe aus. Flug: whoosh (Höhepunkt in der Flugmitte),
  `AU.flight(dur,'stage'|'dive')` für Kapitelwechsel und Sturzflug, Ankunft: arrive (dazu belt, rings), `AU.boom` = Erdschnitt,
  Landung: in `say` zum Stichwort `pad` geplant (Motor-Ende der Aufnahme bei 8,0 s = Aufsetzen bei pad + 5,6 s), Schleifen
  (sun, mars_wind, base_hum) über `rumble`/`wind`. Knopfklicks: ein Hörer in `AU` (capture). Die Schleifen tragen 0,15 s
  zyklischen Vorlauf (`SFX.loop` = [Anfang, Ende]). `blip` und `ping` bleiben synthetisch. Prüfhaken: `window.__au.st`.
- **Nachbearbeitung (`POST`, Abschnitt Szene):** `POST.render(scene, camera, {lin, exposure, bloom, thr, knee, vig})`
  ersetzt `renderer.render` für beide Szenen. Gezeichnet wird in ein HalfFloat-Ziel (unter WebGL2 mit MSAA, Desktop 4×, Handy 2×, so groß
  wie der Bildspeicher, folgt also `PR`/`setPR` und `measure`), dann Bloom über 4 Stufen (Desktop 6) ab halber
  Auflösung (Hell-Pass mit weichem Knie, Dual-Filter abwärts und aufwärts), zuletzt in einem Schritt Belichtung,
  Tonemapping, Vignette und Korn. Weltraum (`lin:0`): die Shader liefern Werte fürs Display, nur Lichter über 1 laufen
  weich aus; Sonne, Korona, Stadtlichter, Meeresglanz und der Erdkern liefern bewusst Werte über 1 und leuchten dadurch.
  Marsoberfläche (`lin:1`): linear, ACES (wie `THREE.ACESFilmicToneMapping`) und sRGB, Belichtung .95. Ohne
  HalfFloat-Ziele (Probe beim Start) oder unter 0,45 Bildpunkten je CSS-Pixel zeichnet `POST` direkt wie früher;
  `POST.ok` sagt, ob der volle Weg läuft (Glanzsprites der Sonne werden dann schwächer gesetzt).

## Fallstricke

- three.js definiert in seinen Shader-Bausteinen Makros wie `r0`, `r1`, `m0` (`cube_uv_reflection_fragment`).
  Eigene Variablen in `onBeforeCompile` dürfen nicht so heißen, sonst gibt es rätselhafte Syntaxfehler.
- Ton startet nur nach einer Nutzereingabe; deshalb beginnt alles mit dem Knopf „Reise starten“.
- `loadModels` blendet `createImageBitmap` während des Parsens aus, damit der `GLTFLoader` r128 Texturen über
  gewöhnliche Bildelemente lädt; das verhält sich in allen Browsern gleich.
- Beschriftungen der Stationen erscheinen erst, wenn die Station im Bild ist (`baseHUD`).
- Git für Windows: `.gitattributes` hält Textdateien auf LF, sonst ändern sich Prüfsummen und Diffs.

## Medien neu erzeugen

Siehe `docs/produktion.md`: Stimme und Modell bei ElevenLabs, Aufbereitung mit `tools/audio/`, Musikschleife,
Herkunft der Modelle und Karten. Das Erzeugen bei ElevenLabs kostet Credits; nie ohne Auftrag wiederholen.

## Fassung als claude.ai-Artefakt

Adresse: https://claude.ai/artifact/KuNTVJioeEebKquH2AEGuk. Veröffentlicht wird `src/sonnensystem.html`,
dazu als Begleitdateien `voice/` (mit `en/` und `pl/`), `audio/`, `img/` aus `public/` und `models/*.json` aus `.artifact/models/`
(`cd tools/models && npm install && node embed.mjs`).
