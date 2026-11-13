# Glossar: deutsche Fachbegriffe der Seite und Bezeichner im Code

Diese Tabelle ordnet die Begriffe, die in Doku, Texten und Gesprächen vorkommen, den Namen im Quelltext (`src/`) zu. Die Spalte „Ort“ nennt das
Modul, das den Bezeichner besitzt; die vollständige Liste aller Module steht in [`modulkarte.md`](modulkarte.md), der Überblick in
[`architecture.md`](architecture.md). Zustand, den mehrere Module schreiben, liegt im Objekt `S` (`src/core/state.js`) und wird als `S.<name>` angesprochen.

## Ablauf und Inhalt

| Begriff | Bezeichner | Ort | Bedeutung |
| --- | --- | --- | --- |
| Halt, Himmelskörper | `BODIES` (Feld), `cur` (Index des aktuellen) | `data/bodies.js`, `app/tour.js` | Eintrag je Station der Reise: Index 0 Übersicht, 1 Sonne, 2 Merkur, 3 Venus, 4 Erde, 5 Mars, 6 Asteroidengürtel/Vesta, 7 Jupiter, 8 Saturn, 9 Uranus, 10 Neptun |
| Abschnitt (Kapitel eines Halts) | `stage`, `setStage(n)`, `b.stages`, `stageCount` | `app/tour.js`, `data/bodies.js` | Erde: 0 Planet, 1 Nahansicht mit Ozeanen und Kontinenten, 2 Aufbau im Schnitt. Mars: 0 Planet, 1 Basis |
| Tour | `tour`, `setTour(on)`, `tourBtn` | `app/tour.js`, `ui/dom.js` | automatischer Durchlauf aller Halte und Abschnitte |
| Verweildauer | `dwell`, `DWELL0` (12 s), `S.tourT` | `app/tour.js`, `data/bodies.js` | Zeit, die die Tour an einem Halt bleibt; mit Ton Länge des Clips plus 2,5 s |
| Zeitraffer | `SPEEDS`, `speedIdx`, `setSpeed` | `data/bodies.js`, `app/tour.js` | Tempo der simulierten Zeit; `S.simDays` ist das Datum |
| Leiste, Reiter | `rail`, `chip` (`.chip`), `initRail` | `ui/dom.js`, `ui/rail.js` | untere Leiste mit einem Knopf je Halt; Fortschritt über `--p` |
| Kurzbeschreibung | `blurb`, `elBlurb` | `data/bodies.js`, `ui/dom.js` | Text zum Halt; `sr` ist die Fassung für Screenreader (`elSr`, CSS-Klasse `.sr`) |
| Kinomodus | `cine`, Klasse `.cine` | `ui/fullscreen.js` | blendet Uhr, Tour-Knopf, Sprache, Beschreibung und Leiste aus |
| Quellen (Dialog) | `creditsEl`, `SITE_CFG` | `ui/credits.js`, `core/target.js` | Dialog „Quellen und Lizenzen“; `SITE_CFG` liefert Impressum und Datenschutz aus `site.json` (nur Website) |
| Bahnmechanik | `basis`, `place`, `solve`, `el` je Körper | `orbit/kepler.js`, `data/bodies.js` | Kepler-Bahnen aus Bahnelementen für das angezeigte Datum |
| Bauziel | `TARGET`, `MODEL_EXT` | `core/target.js` | `'site'` (Website, Entwicklung, Test) oder `'artifact'` (claude.ai); zur Bauzeit gesetzt |

## Ton und Zeitmarken

| Begriff | Bezeichner | Ort | Bedeutung |
| --- | --- | --- | --- |
| Tonmodul | `AU` | `audio/engine.js` | Web Audio: Musikschleife, Sprecher-Clips, Effekte, Absenken der Musik unter der Stimme (`duck`) |
| Musikstücke, Effekte (Daten) | `MUSIC`, `BEAT`, `TRACKS`, `SFX` | `audio/tracks.js` | Schleifenpunkte, Zusatzstücke für Erde und Mars, Effekt-Samples |
| Clip | `narId`, `VOICE[narId]` | `app/tour.js`, `data/voice.js` | ein Sprecher-Clip je Abschnitt: `overview`, `sun`, `mercury`, `venus`, `earth`, `earth_geo`, `earth_core`, `mars`, `mars_base`, `belt`, `jupiter`, `saturn`, `uranus`, `neptune`, `outro` |
| Zeitmarken je Sprache | `VOICE`, `voice.<sprache>.json` (`clips`) | `data/voice.js`, `data/` | Dauer `d` und `cues` je Clip; geschrieben von `tools/audio/finalize.py` |
| Stichwort | `cue(k)`, Schlüssel in `cues` (z. B. `water`, `hab`, `pad`) | `app/tour.js` | benannte Stelle im Clip, an der im Bild etwas passiert |
| Sprecherzeit | `narT()`, `S.narStart` | `app/tour.js` | Sekunden seit Beginn des laufenden Clips |
| Namen der Ozeane und Kontinente | `voice.<sprache>.json` (`geo`) | `hud/earth.js` | Zeitpunkte ihrer Einblendung |
| Sprechertext | `docs/sprechertext.<Sprache>.json` | `docs/` | Abschnitte `[Text, Stichwort]` je Clip |
| Tonmodus | `S.soundMode`, `setSound` | `ui/sound.js` | Musik und Sprecher, nur Sprecher, aus (Taste M) |

## Sprachen

| Begriff | Bezeichner | Ort | Bedeutung |
| --- | --- | --- | --- |
| Sprache | `LANG`, `LANGS` | `i18n/index.js` | `de`, `en` oder `pl`; aus `?lang=`, sonst gemerkte Wahl, sonst Browsersprache, sonst Englisch |
| Übersetzungen | `tr('…')`, `fill`, `en.json`, `pl.json` | `i18n/` | Tabelle mit dem deutschen Text als Schlüssel; `fill` setzt Platzhalter `{0}`, `{1}` ein |
| Zahlen- und Datumsformat | `LOC` | `i18n/index.js` | `de-DE`, `en-GB`, `pl-PL` |
| Feste Texte im Markup | Attribut `data-t` | `index.html`, `ui/dom.js` | werden beim Start übersetzt |
| Sprachwechsel | `setLang(l)`, `openLang` | `i18n/index.js`, `ui/language-menu.js` | lädt die Seite neu |

## Darstellung

| Begriff | Bezeichner | Ort | Bedeutung |
| --- | --- | --- | --- |
| Nachbearbeitung | `POST` | `render/post.js` | HDR-Ziel mit MSAA, Bloom, Belichtung, Tonemapping, Vignette, Korn |
| Oberflächen | `SURF`, `bake`, `bakeFlat` | `render/surfaces.js`, `render/bake.js` | prozedurale Texturen, auf der Grafikkarte gebacken |
| Weltraumszene | `scene`, `camera`, `buildPlanet`, `buildSun` | `render/scene.js`, `render/scene/` | Planeten, Sonne mit Korona, Hintergrund (Sterne, Milchstraße), Kleinkörper, Extras |
| Marsbasis | `MB`, `hgt(x,z)` | `mars/base.js` | eigene Szene auf der Marsoberfläche in Metern; Stationen um die Zentralkuppel bei (0,0) |
| Kamerastützpunkte | `knots`, `OBST` | `mars/base.js`, `mars/layout.js` | Ankunft und Abfahrt je Station relativ zu den Stichworten; `OBST` hält die Kamera von Bauten fern |
| Bewegte Dinge | `anim[]` | `mars/base.js` | Funktionen `(t, dt, clk)`: Landefähre, Tankwagen, Rover, Hubschrauber, Astronauten, Bagger, Staubteufel |
| Staub und Dampf | `Puffs`, `puffs.put(…)` | `mars/base.js` | zustandslose Teilchen, Zahl begrenzt |
| Auflösungsregler | `PR` (`PR.v[0]` Weltraum, `PR.v[1]` Marsoberfläche), `govern()`, `setPR` | `app/governor.js` | misst die Bilddauer, senkt bei Rucklern, hebt bei flüssigem Lauf wieder an |
| Desktop-Ausstattung | `DESKTOP` | `core/device.js` | Maus und große Texturen: größere Schattenkarte, mehr Steine, Überabtastung |
| Szenenwechsel | `S.surfOn`, `S.veil`, `S.trans` | `app/loop.js`, `core/state.js` | Übergang zwischen Weltraum und Marsoberfläche mit Staubschleier |
| Kamerasollwert | `desired(i, tf)`, `camAt` | `app/camera.js` | Ziel und Pfad der Kamera für Halt `i` |
| Schleife | `frame` | `app/loop.js` | ein Bild: Zeit, Kamera, Szenenwechsel, Rendern, Messmarken |

## Oberfläche und Messmarken

| Begriff | Bezeichner | Ort | Bedeutung |
| --- | --- | --- | --- |
| Maßstab der Oberfläche | CSS-Variable `--u`, `ui` | `ui/layout.js`, `styles/` | 1 px auf dem Handy, bis etwa 2 px auf großen Monitoren |
| Layout | `measure()`, `wide`, `S.topH`, `S.botH`, `guard` | `ui/layout.js` | `wide` = Querformat; `guard` sind Flächen von Uhr und Titel, denen Beschriftungen ausweichen |
| Messmarken (HUD) | `drawHUD`, `planetHUD`, `sunHUD`, `coreHUD`, `geoHUD`, `beltHUD`, `baseHUD`, `overviewHUD` | `hud/` | 2D-Beschriftungen auf dem Overlay-Canvas; Grundformen in `hud/draw.js` |
| Einblendung | Marker über `cue(k)` | `hud/`, `app/tour.js` | Messmarken und Beschriftungen erscheinen zum Stichwort |

## Tests

| Begriff | Bezeichner | Ort | Bedeutung |
| --- | --- | --- | --- |
| Testmodus | `import.meta.env.MODE === 'test'` | `app/boot.js` | `vite build --mode test`; schaltet die Prüfhaken ein |
| Prüfhaken | `window.__t`, `window.__mbt`, `window.__clk`, `window.__cam`, `window.__au` | `testing/hooks.js`, `app/loop.js`, `mars/base.js`, `audio/engine.js` | Erzählzeit und Zustand lesen und setzen, feste Erzählzeit der Marsbasis, Uhr der bewegten Dinge, freie Kamera, Tonzustand |
| Schritte der Bildschirmfotos | `start`, `go`, `focus:N`, `stage:N`, `seek:S`, `mbt:S`, `clk:S`, `cam:…`, `pr:X`, `wait:MS`, `click:`, `key:`, `eval:`, `shot:NAME` | `tools/shots/run.js` | siehe Kopf der Datei (`npm run shots`) |
