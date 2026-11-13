# Produktion: Sprecher, Musik, Modelle, Karten

Stand: Version 8 (November 2026, dreisprachig). Dieses Dokument hält fest, womit die Medien entstanden sind und wie man sie
neu erzeugt.

## Sprecher

- **Dienst:** ElevenLabs, Modell `eleven_v4`, Ausgabe `mp3_44100_128`.
- **Stimmen** (aus der Stimmbibliothek von ElevenLabs), jeweils mit dem Sprachkennzeichen der Sprache erzeugt:

  | Sprache | Stimme | Voice-ID | Text |
  | --- | --- | --- | --- |
  | Deutsch | „Helmut“ | `JiW03c2Gt43XNUQAumRP` | [`sprechertext.de.json`](sprechertext.de.json) |
  | Englisch | „Jim Executive – Authoritative, British and Warm“ | `tXxkePQsw0G69D8VeDzp` | [`sprechertext.en.json`](sprechertext.en.json) |
  | Polnisch | „Adam“ | `hIssydxXZ1WuDorjx6Ic` | [`sprechertext.pl.json`](sprechertext.pl.json) |

- **Text:** die drei Dateien oben. Je Clip eine Liste von Abschnitten `[Text, Stichwort]`.
  Ein Stichwort markiert die Stelle, an der in der Seite etwas passiert (Kamerafahrt, Einblendung).
- **Regieanweisungen** stehen im Text in eckigen Klammern: `[warmly]` am Anfang, `[pause]` zwischen den
  Abschnitten, `[long pause]` vor dem Schlussgedanken. Zahlen als Ziffern schreiben („22 Minuten“).
- **Clips:** `overview`, `sun`, `mercury`, `venus`, `earth`, `earth_geo`, `earth_core`, `mars`, `mars_base`,
  `belt`, `jupiter`, `saturn`, `uranus`, `neptune`, `outro`.
- **Aufwand:** Deutsch rund 5.100 Credits (Einleitung in zwei Fassungen), Englisch 4.660, Polnisch 4.483 (je eine Fassung).

So lautet zum Beispiel der Auftrag für die Marsbasis:

> [warmly] Steigen wir hinab. [pause] So könnte sie aussehen: die erste Siedlung auf einer anderen Welt.
> [pause] Im Zentrum liegen die Wohnmodule, durch Tunnel miteinander verbunden. [pause] …

### Aufbereitung

```
python tools/audio/proc.py res1.json overview_a overview_b sun mercury venus earth earth_geo earth_core mars belt jupiter saturn uranus neptune outro
python tools/audio/proc.py res2.json mars_base
python tools/audio/finalize.py

python tools/audio/proc.py --lang en res.en.json overview sun mercury venus earth earth_geo earth_core mars mars_base belt jupiter saturn uranus neptune outro
python tools/audio/finalize.py --lang en          # Polnisch entsprechend mit pl
```

- `proc.py` nimmt die Rohdateien aus `work/el/<Clip>.mp3` (mit `--lang` aus `work/el/<Sprache>/`, Ausgabe dann nach
  `public/voice/<Sprache>/`), kürzt Stille an den Rändern, bringt jeden Clip auf
  −18 LUFS, begrenzt Spitzen weich und schreibt `public/voice/<Clip>.mp3` (96 kbit/s, mono).
- `align.py` findet die Zeitmarken: Sprachabschnitte per Silero-VAD, Text je Abschnitt per Whisper (small,
  über sherpa-onnx), dann zeichenweiser Abgleich mit dem Skript. Die Modelle gehören nach `work/models/`.
- `finalize.py` trägt Dauer und Zeitmarken der Sprache in `src/sonnensystem.html` ein (`VOICE_DE`, `VOICE_EN`,
  `VOICE_PL`), ebenso die Zeitpunkte, zu denen die Namen der Ozeane und Kontinente erscheinen (`GEO_T_*`).
- Die Stichworte (`water`, `hab`, `pad` …) müssen in allen Sprachen an derselben inhaltlichen Stelle stehen; die
  Kamerafahrt rechnet relativ zu ihnen und passt sich so an die Länge jeder Fassung an.

Die Kamerafahrten richten sich nach diesen Marken. Wer einen Clip neu erzeugt, muss `proc.py` und
`finalize.py` laufen lassen, sonst passen Bild und Ton nicht mehr zusammen. Der Ordner `work/` wird nicht
eingecheckt.

## Musik

- **Dienst:** ElevenLabs, Modell `eleven_music_v2_5`, 150 Sekunden, instrumental (2.250 Credits).
- **Auftrag:**

  > Melodic progressive house instrumental at 122 BPM in A minor, cinematic, emotional and full of wonder.
  > A hypnotic, steadily repeating arpeggio played on a soft pipe organ doubled by felt piano is the centre
  > of the track, over wide evolving string and synth pads. Deep round four-on-the-floor kick, warm offbeat
  > sub bass, airy shuffled hi-hats, long reverb and stereo delay, polished modern production. Energy: opens
  > with the arpeggio and pads alone for eight bars, the kick and bass enter, then layers build slowly to a
  > driving but spacious plateau that holds steady until the end. No vocals, no harsh drops, no noisy
  > risers, no sudden breaks.

- **Schleife:** `python tools/audio/loop.py work/el/music_b.mp3 public/audio/music.mp3 8 24 31`
  bestimmt Tempo und Schlagraster, sucht zwei ähnlich klingende Stellen im Abstand ganzer Taktgruppen,
  blendet über, hebt den leisen Auftakt um 8 dB an (bis Sekunde 24, ausgelaufen bei Sekunde 31) und bringt
  das Stück auf −16 LUFS. Die ausgegebenen Werte stehen in der Konstante `MUSIC` der Seite
  (`loop0`, `loop1`, `beat`, `grid0`).

Der ElevenLabs-Flow mit allen Aufträgen heißt „Sonnensystem Kamerafahrt – Sprecher und Musik“
(Flow-ID `xg8wz5tgqyq6Xg6rX8Lw`).

### Musik für Erde und Mars (Version 9)

- **Dienst:** ElevenLabs, Modell `eleven_music_v2_5`, je 130 Sekunden, instrumental (je 1.950 Credits).
- **Erde, Auftrag:**

  > Oceanic deep house instrumental at 122 BPM in A minor. Warm rounded sub bass and a soft four-on-the-floor kick, shuffled closed hi-hats, lush Rhodes electric piano chords with slow chorus, glassy marimba and bell plucks that sparkle like sunlight on water, wide airy pads that swell and recede like tides, gentle filtered ocean-wave noise sweeps and distant whale-song-like synth calls. Deep, immersive, serene and quietly uplifting, like gliding over a blue ocean seen from orbit. Polished modern production, long reverb tails, wide stereo. Energy: opens with pads, waves and Rhodes alone for eight bars, the kick and bass enter, then a steady hypnotic groove that holds until the end. No vocals, no drops, no noisy risers, no sudden breaks.

- **Mars, Auftrag:**

  > Cinematic frontier electronica instrumental at 122 BPM in A minor: the sound of the first human outpost on Mars. Pioneering, determined and quietly hopeful. A restrained analog bass sequence in steady sixteenth notes, dry punchy kick, metallic percussion and mechanical ticks like machinery at work, warm brass-like synth swells, a lonely twangy baritone guitar motif drenched in desert reverb, dusty wind-like noise textures and faint radio blips. It conveys hard work, isolation, vast red desert and human resolve. Polished modern production, wide and spacious. Energy: opens sparse with the bass pulse, wind and guitar for eight bars, drums enter, layers build to a steady determined plateau that holds until the end. No vocals, no harsh drops, no noisy risers, no sudden breaks.

- **Aufbereitung** (beide Stücke haben 122 BPM wie das Hauptstück; die Erde-Datei klingt ab Sekunde 78 aus und wird davor abgeschnitten):

  ```
  python tools/audio/loop.py --from=16 --end=79 --bars=24 work/el/music_earth.mp3 public/audio/music-earth.mp3 14 12 15
  python tools/audio/loop.py --from=60 --end=122 --bars=32,24,16 work/el/music_mars.mp3 public/audio/music-mars.mp3
  ```

  `loop.py` kennt dafür zusätzlich `--from` (frühester Schleifenanfang), `--end` (Quelle abschneiden) und `--bars`
  (erlaubte Schleifenlängen). Der leise Auftakt der Erde wird um bis zu 14 dB angehoben (bis Sekunde 12, ausgelaufen bei 15).
  Werte in `AU`: Erde `loop0` 20,1252, `loop1` 67,3461, `grid0` 0,4499 (24 Takte); Mars `loop0` 83,0884, `loop1` 114,569,
  `grid0` 0,4519 (16 Takte). Beide Stücke beginnen beim Anflug mit ihrem Auftakt (auf einem Schlag des Hauptstücks) und gehen
  danach in die Schleife; Lautheit −17,0 (Erde) und −16,4 LUFS (Mars) nach dem MP3-Kodieren, das Hauptstück misst −17,2.
  Der Mars-Pegel wird im Programm um 0,8 dB gesenkt (`TRACKS.mars.gain`).

## Effekte (Version 9)

- **Dienst:** ElevenLabs, Modell `eleven_text_to_sound_v2`, zusammen 267 Credits, je eine Fassung; die Schleifen mit der Option
  „loop“. Flow-ID wie bisher `xg8wz5tgqyq6Xg6rX8Lw`.
- **Dateien** (`public/audio/sfx/<name>.mp3`, Rohdaten `work/el/sfx/`, Aufbereitung `python tools/audio/sfx.py`):

  | Name | Dauer | Wofür |
  | --- | --- | --- |
  | `whoosh` | 4 s | Vorbeiflug, Flug zwischen Himmelskörpern |
  | `arrive` | 4 s | weicher Ankunftsschlag |
  | `stage` | 3 s | Übergang zum nächsten Kapitel eines Körpers (steigert sich bis zur Ankunft) |
  | `dive` | 6 s | Sturzflug durch Wolken und Atmosphäre: Erde Abschnitt 1, Abstieg zur Marsoberfläche |
  | `cut` | 5 s | Aufschneiden der Erde (Abschnitt 2, Stichwort `open`) |
  | `mars_wind` | 12 s, Schleife | Atmosphäre der Marsoberfläche |
  | `base_hum` | 10 s, Schleife | Maschinenbrummen der Kolonie, leise unter dem Wind |
  | `lander` | 9 s | landende Fähre, zum Stichwort `pad` der Marsbasis |
  | `sun` | 10 s, Schleife | Grollen der Sonne |
  | `belt` | 7 s | Asteroidengürtel bei Ankunft |
  | `rings` | 7 s | Eiskristall-Schimmern bei Ankunft am Saturn |
  | `ui_tick` | 0,5 s | Klick für Knöpfe |
  | `start` | 3 s | Start der Reise |

- **Aufbereitung:** Ränder kürzen, Ein- und Ausblendung, Lautheit je Effekt auf einen Zielwert (−17 bis −24 LUFS, Atmo −25 und
  −31; der Tick auf eine Spitze von −24 dBFS), Spitzen unter −1 dBFS, MP3 mit 96 bis 112 kbit/s. Schleifen werden zyklisch gebaut
  (Überblendung des Schlusses in den Anfang, je 0,15 s Vorlauf und Nachlauf), damit sie unabhängig vom Randverhalten des
  MP3-Dekoders nahtlos laufen (`loopStart`/`loopEnd`).

## 3D-Modelle

Alle Modelle stammen aus dem Archiv „NASA 3D Resources“ und wurden für das Web verkleinert:

| Datei | Inhalt |
| --- | --- |
| `hdu1.glb` | Wohnmodul (Habitat Demonstration Unit) |
| `sev.glb` | Druckrover (Space Exploration Vehicle), Dreiecke reduziert |
| `rover.glb` | Mars-Rover, Dreiecke reduziert |
| `heli.glb` | Mars-Hubschrauber |
| `dish.glb` | Parabolantenne |
| `astronaut.glb` | Raumanzug |
| `vesta.glb` | Asteroid Vesta (Formmodell der Sonde Dawn) |

Kuppel, Gewächshäuser, Solarfeld, Reaktoren, Treibstoffanlage, Landefähre, Tankwagen und alles Übrige auf der
Marsbasis sind im Programm aus einfachen Körpern gebaut.

`tools/models/slim.mjs` hat die beiden größten Modelle reduziert. `tools/models/embed.mjs` wandelt die
GLB-Dateien in glTF-JSON mit eingebetteten Daten um; das braucht nur die Fassung als claude.ai-Artefakt,
weil dort `.glb` nicht ausgeliefert wird.

## Karten

- `earth-day.jpg`, `earth-night.jpg`: Blue Marble und Nachtlichter der NASA.
- `earth-aux.jpg`: Höhen, Wasserflächen und Wolken in den drei Farbkanälen einer Hilfstextur (NASA-Daten).
- `mars.jpg`, `jupiter.jpg`: aus „NASA 3D Resources“, Ordner „Images and Textures“.

Sonne, Merkur, Venus, Saturn, Uranus, Neptun, die Monde und der Marsboden werden im Browser berechnet.

## Schriften und Bibliotheken

- three.js r128 als klassisches Skript (`THREE` global) und der dazugehörige `GLTFLoader`.
- Instrument Serif 400, IBM Plex Sans 400/500, IBM Plex Mono 400/500, jeweils der lateinische Zeichensatz und das
  erweiterte Latein (für Polnisch) als WOFF2 (aus den `@fontsource`-Paketen).
