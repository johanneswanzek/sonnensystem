---
description: Einen Sprecher-Clip neu erzeugen und die Zeitmarken nachziehen (kostet ElevenLabs-Credits, nur mit Auftrag)
argument-hint: <Clip, z. B. mars_base> [--lang en|pl]
disable-model-invocation: true
---

**Achtung: Das Erzeugen bei ElevenLabs kostet Credits.** Nur ausführen, wenn der Auftraggeber in dieser Sitzung ausdrücklich
den Clip `$ARGUMENTS` neu erzeugen lassen will. Keine Wiederholung „zum Testen“, keine zweite Fassung auf Verdacht.
Ohne ausdrücklichen Auftrag: abbrechen und nachfragen.

Ablauf nach `docs/produktion.md` und ADR 0005:

1. Text des Clips in `docs/sprechertext.<Sprache>.json` prüfen oder ändern (Abschnitte `[Text, Stichwort]`, Regieanweisungen
   in eckigen Klammern, Zahlen als Ziffern). Stichworte müssen in allen Sprachen an derselben inhaltlichen Stelle stehen.
2. Clip einmal erzeugen: ElevenLabs, Modell `eleven_v4`, `mp3_44100_128`, Stimme und Voice-ID der Sprache aus `docs/produktion.md`.
   Rohdatei nach `work/el/<Clip>.mp3` (bei en/pl nach `work/el/<Sprache>/`). `work/` wird nicht eingecheckt.
3. Aufbereiten: `python tools/audio/proc.py [--lang <Sprache>] <ergebnis.json> <Clip>` (Stille kürzen, −18 LUFS, mono 96 kbit/s).
4. Zeitmarken nachziehen: `python tools/audio/finalize.py [--lang <Sprache>]` (nutzt `align.py`; die Modelle liegen in `work/models/`); schreibt `src/data/voice.<Sprache>.json`.
5. Prüfen, dass Bild und Ton zusammenpassen: Kapitel mit `/pruefen` ansehen (Marsbasis mit `mbt:S`), Marken gegenhören.
6. `docs/produktion.md` (Aufwand in Credits) und `CHANGELOG.md` ergänzen.
