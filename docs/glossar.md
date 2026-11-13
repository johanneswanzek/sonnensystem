# Glossar: deutsche Fachbegriffe der Seite und Bezeichner im Code

Diese Tabelle ordnet die Begriffe, die in Doku, Texten und Gesprächen vorkommen, den Namen im Quelltext zu. Bis zur
Aufteilung in Module stehen alle Bezeichner in `src/sonnensystem.html` (Abschnittsmarken `/* ---------- Name ---------- */`);
die Zielmodule stehen in ADR 0002 und `AGENTS.md`. Nicht belegte Zuordnungen sind nicht aufgeführt.

## Ablauf und Inhalt

| Begriff | Bezeichner | Bedeutung |
| --- | --- | --- |
| Halt, Himmelskörper | `BODIES` (Feld), `cur` (Index des aktuellen) | Eintrag je Station der Reise: Index 0 Übersicht, 1 Sonne, 2 Merkur, 3 Venus, 4 Erde, 5 Mars, 6 Asteroidengürtel/Vesta, 7 Jupiter, 8 Saturn, 9 Uranus, 10 Neptun |
| Abschnitt (Kapitel eines Halts) | `stage`, `setStage(n)`, `b.stages` | Erde: 0 Planet, 1 Nahansicht mit Ozeanen und Kontinenten, 2 Aufbau im Schnitt. Mars: 0 Planet, 1 Basis |
| Tour | `tour`, `setTour(on)`, `tourBtn` | automatischer Durchlauf aller Halte und Abschnitte |
| Verweildauer | `dwell`, `DWELL0` (12 s), `tourT` | Zeit, die die Tour an einem Halt bleibt; mit Ton Länge des Clips plus 2,5 s |
| Leiste, Reiter | `rail`, `chip` (`.chip`) | untere Leiste mit einem Knopf je Halt; Fortschritt über `--p` |
| Kurzbeschreibung | `blurb`, `elBlurb` | Text zum Halt; `sr` ist die Fassung für Screenreader (`elSr`, CSS-Klasse `.sr`) |
| Kinomodus | `cine`, Klasse `.cine` | blendet Uhr, Tour-Knopf, Sprache, Beschreibung und Leiste aus |
| Quellen (Dialog) | `credits`, `window.SITE` | Dialog „Quellen und Lizenzen“; `SITE` liefert Impressum und Datenschutz aus `site.json` |
| Bahnmechanik | Abschnitt „Bahnmechanik“, `el` je Körper | Kepler-Bahnen aus Bahnelementen für das angezeigte Datum |

## Ton und Zeitmarken

| Begriff | Bezeichner | Bedeutung |
| --- | --- | --- |
| Tonmodul | `AU` | Web Audio: Musikschleife, Sprecher-Clips, Effekte, Absenken der Musik unter der Stimme |
| Musikschleife | `MUSIC` (`loop0`, `loop1`, `beat`, `grid0`) | Werte stammen von `tools/audio/loop.py` |
| Clip | `narId`, `VOICE[narId]` | ein Sprecher-Clip je Abschnitt: `overview`, `sun`, `mercury`, `venus`, `earth`, `earth_geo`, `earth_core`, `mars`, `mars_base`, `belt`, `jupiter`, `saturn`, `uranus`, `neptune`, `outro` |
| Zeitmarken je Sprache | `VOICE_DE`, `VOICE_EN`, `VOICE_PL`, `VOICE` | Dauer `d` und `cues` je Clip; `VOICE` ist die der gewählten Sprache; geschrieben von `tools/audio/finalize.py` |
| Stichwort | `cue(k)`, Schlüssel in `cues` (z. B. `water`, `hab`, `pad`) | benannte Stelle im Clip, an der im Bild etwas passiert |
| Sprecherzeit | `narT()`, `narStart` | Sekunden seit Beginn des laufenden Clips |
| Namen der Ozeane und Kontinente | `GEO_T_DE`, `GEO_T_EN`, `GEO_T_PL` | Zeitpunkte ihrer Einblendung |
| Sprechertext | `docs/sprechertext.<Sprache>.json` | Abschnitte `[Text, Stichwort]` je Clip |

## Sprachen

| Begriff | Bezeichner | Bedeutung |
| --- | --- | --- |
| Sprache | `LANG` | `de`, `en` oder `pl`; aus `?lang=`, sonst gemerkte Wahl, sonst Browsersprache, sonst Englisch |
| Übersetzungen | `TR` (`TR.en`, `TR.pl`), `tr('…')`, `fill` | Tabelle mit dem deutschen Text als Schlüssel; `fill` setzt Platzhalter `{0}`, `{1}` ein |
| Zahlen- und Datumsformat | `LOC` | `de-DE`, `en-GB`, `pl-PL` |
| Feste Texte im Markup | Attribut `data-t` | werden beim Start übersetzt |
| Sprachwechsel | `setLang(l)` | lädt die Seite neu |

## Darstellung

| Begriff | Bezeichner | Bedeutung |
| --- | --- | --- |
| Oberflächen | `SURF`, `bake` | prozedurale Texturen, auf der Grafikkarte gebacken |
| Marsbasis | `MB` (Szene in Metern), `hgt(x,z)` Gelände | eigene Szene auf der Marsoberfläche; Stationen um die Zentralkuppel bei (0,0) |
| Kamerastützpunkte | `knots`, `OBST` | Ankunft und Abfahrt je Station relativ zu den Stichworten; `OBST` hält die Kamera von Bauten fern |
| Bewegte Dinge | `anim[]` | Funktionen `(t, dt, clk)`: Landefähre, Tankwagen, Rover, Hubschrauber, Astronauten, Bagger, Staubteufel |
| Staub und Dampf | `Puffs`, `puffs.put(…)` | zustandslose Teilchen, Zahl begrenzt |
| Auflösungsregler | `PR` (`PR.v[0]` Weltraum, `PR.v[1]` Marsoberfläche), `govern()` | misst die Bilddauer, senkt bei Rucklern, hebt bei flüssigem Lauf wieder an |
| Desktop-Ausstattung | `DESKTOP` | Maus und große Texturen: größere Schattenkarte, mehr Steine, Überabtastung |
| Szenenwechsel | `trans`, Staubschleier in `frame` | Übergang zwischen Körpern |
| Kamerazielwert | `desired(i, tf)` | Ziel der Kamera für Halt `i` |

## Oberfläche und Messmarken

| Begriff | Bezeichner | Bedeutung |
| --- | --- | --- |
| Maßstab der Oberfläche | CSS-Variable `--u`, `ui` | 1 px auf dem Handy, bis etwa 2 px auf großen Monitoren |
| Layout | `measure()`, `wide`, `topH`, `botH`, `guard` | `wide` = Querformat; `guard` sind Flächen von Uhr und Titel, denen Beschriftungen ausweichen |
| Messmarken (HUD) | `drawHUD`, `planetHUD`, `sunHUD`, `coreHUD`, `beltHUD`, `baseHUD` | 2D-Beschriftungen auf dem Overlay-Canvas |
| Einblendung | Marker über `cue(k)` | Messmarken und Beschriftungen erscheinen zum Stichwort |

## Tests

| Begriff | Bezeichner | Bedeutung |
| --- | --- | --- |
| Prüfhaken | `window.__t`, `window.__mbt`, `window.__clk`, `window.__cam` | nur im Testmodus; Erzählzeit, feste Erzählzeit der Marsbasis, Uhr der bewegten Dinge, freie Kamera |
| Schritte der Bildschirmfotos | `start`, `go`, `focus:N`, `stage:N`, `seek:S`, `mbt:S`, `clk:S`, `cam:…`, `pr:X`, `wait:MS`, `click:`, `key:`, `eval:`, `shot:NAME` | siehe Kopf von `tools/test/run.js` (künftig `npm run shots`) |
