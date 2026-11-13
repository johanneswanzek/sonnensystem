# Ton (`src/audio/`) – lokale Regeln

Gilt für `engine.js` (`AU`: Web Audio) und `tracks.js` (Daten: `MUSIC`, `BEAT`, `TRACKS`, `SFX`). Die Aufbereitung der Dateien steht in
[`tools/audio/AGENTS.md`](../../tools/audio/AGENTS.md), die Herkunft in [`docs/produktion.md`](../../docs/produktion.md).
**Keine Erzeugung bei ElevenLabs ohne ausdrücklichen Auftrag** (kostet Credits).

## Aufbau

- Hauptstück `audio/music.mp3` für alle Halte, `music-earth.mp3` für die Erde, `music-mars.mp3` für den Mars (beide Abschnitte).
- `AU.place(i)` (aus `focus`) blendet auf der nächsten Zählzeit des Hauptstücks mit gleicher Leistung über (8 Schläge). Das Hauptstück läuft
  stumm weiter und gibt das Raster; die Zusatzstücke starten auf einem Schlag und werden nach der Überblendung gestoppt.
- Effekte laden im Hintergrund nach dem Hauptstück. Zusatzstücke werden nur als komprimierte Bytes (`raw`) geladen; dekodiert wird erst
  beim Anflug (`AU.place`), nach dem Zurückblenden wird der Puffer freigegeben (höchstens ein Zusatzstück dekodiert). Fehlt etwas, läuft
  das Hauptstück weiter bzw. der alte synthetische Effekt.
- Effekte (`public/audio/sfx/*.mp3`, aufbereitet mit `tools/audio/sfx.py`): `playS(name,{group,delay,...})` blendet laufende Effekte
  derselben Gruppe aus. Flug: `whoosh` (Höhepunkt in der Flugmitte), `AU.flight(dur,'stage'|'dive')` für Kapitelwechsel und Sturzflug.
  Ankunft: `arrive` (dazu `belt`, `rings`). `AU.boom` = Erdschnitt. Landung: in `say` zum Stichwort `pad` geplant (Motor-Ende der
  Aufnahme bei 8,0 s = Aufsetzen bei pad + 5,6 s). Schleifen (`sun`, `mars_wind`, `base_hum`) über `rumble`/`wind`. Knopfklicks: ein Hörer
  in `AU` (capture). `blip` und `ping` bleiben synthetisch.
- Musik und Effekte werden unter der Stimme abgesenkt (`duck`).
- Die Schleifen tragen 0,15 s zyklischen Vorlauf (`SFX.loop` = [Anfang, Ende]); die Werte druckt `tools/audio/sfx.py`.
- Prüfhaken: `window.__au.st` (nur Testmodus).

## Fallstricke

- Ton startet nur nach einer Nutzereingabe; deshalb beginnt alles mit dem Knopf „Reise starten“ (`#go`, `#goQuiet`).
- `MUSIC` (`loop0`, `loop1`, `beat`, `grid0`) und `TRACKS` kommen aus `tools/audio/loop.py`; nicht von Hand ändern, wenn die Datei
  nicht neu aufbereitet wurde. Hauptstück und Zusatzstücke haben 122 BPM in a-Moll, damit die Überblendung auf dem Raster klappt.
- Sprecher-Clips je Sprache (`public/voice/`, `en/`, `pl/`) und ihre Zeitmarken (`src/data/voice.<sprache>.json`) gehören zusammen;
  neuer Clip heißt neue Marken (ADR 0005).
- Tonmodus (`S.soundMode`, Taste M): Musik und Sprecher, nur Sprecher, aus.

## Prüfen

`npm run test:e2e:file ton` und `musik` (`tests/e2e/ton.spec.js`, `musik.spec.js`); Hören lässt sich nicht automatisch prüfen.
