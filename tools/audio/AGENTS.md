# Aufbereitung von Ton (`tools/audio/`) – lokale Regeln

Python-Skripte (`proc.py`, `align.py`, `finalize.py`, `loop.py`, `sfx.py`); sie sind das einzige Python im Projekt. Ablauf, Stimmen, Aufträge und
Aufwand: [`docs/produktion.md`](../../docs/produktion.md). Hintergrund: ADR 0005.

## Harte Regeln

- **Nie bei ElevenLabs erzeugen oder wiederholen ohne ausdrücklichen Auftrag** (Credits). Die Skripte hier erzeugen nichts bei ElevenLabs; sie
  bereiten Rohdateien aus `work/el/` auf. `work/` wird nicht eingecheckt.
- Wer einen Sprecher-Clip neu erzeugt, lässt danach `proc.py` und `finalize.py` laufen, sonst passen Bild und Ton nicht zusammen.
- `finalize.py` schreibt `src/data/voice.<sprache>.json` (`clips`: Dauer und Zeitmarken je Clip, `geo`: Einblendzeiten); von Hand nur ändern,
  wenn auch der Clip dazu passt. Stichworte stehen in allen Sprachen an derselben inhaltlichen Stelle.
- Lautheit: Sprecher −18 LUFS, Musik ungefähr −16 bis −17 LUFS, Effekte je Zielwert (`sfx.py`, `CFG`); Spitzen unter −1 dBFS.
- Werte, die `loop.py` und `sfx.py` drucken (`loop0`, `loop1`, `beat`, `grid0`, Schleifenpunkte), gehören nach `src/audio/tracks.js`.

## Voraussetzungen

`ffmpeg` im Pfad; Python-Pakete je nach Skript (`numpy`, `scipy`, `soundfile`, `pyloudnorm`; Zeitmarken: Silero-VAD und Whisper über sherpa-onnx, Modelle
nach `work/models/`). Genaue Aufrufe in den Kopfkommentaren der Skripte und in `docs/produktion.md`.
