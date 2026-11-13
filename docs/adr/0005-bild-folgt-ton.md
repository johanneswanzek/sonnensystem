# ADR 0005: Das Bild folgt dem Ton (Zeitmarken aus der Aufnahme)

- Status: angenommen
- Datum: 2026-11-13
- Betrifft: Tonmodul (`AU`), Tour (`narrate`, `narT`, `cue`), Marsbasis-Kamerafahrt, `tools/audio/`, `docs/sprechertext.*.json`

## Kontext

Die Seite erzählt mit Sprecher und Musik. Einblendungen (Beschriftungen, Namen der Ozeane und Kontinente) und die
Kamerafahrt über die Marsbasis sollen genau dann geschehen, wenn der Sprecher die Sache nennt. Der Text kommt aus
einer KI-Stimme (ElevenLabs), die Länge und Lage jedes Satzes steht erst nach der Erzeugung fest und unterscheidet
sich je Sprache (ADR 0004).

## Entscheidung

Die Zeitmarken werden aus der fertigen Aufnahme bestimmt und steuern das Bild:

1. Im Sprechertext (`docs/sprechertext.<Sprache>.json`) steht je Clip eine Liste von Abschnitten `[Text, Stichwort]`.
   Ein Stichwort (`water`, `hab`, `pad` …) markiert die Stelle, an der etwas passiert.
2. `tools/audio/align.py` findet die Zeitmarken: Sprachabschnitte per Silero-VAD, Text je Abschnitt per Whisper (small,
   über sherpa-onnx), dann zeichenweiser Abgleich mit dem Skript.
3. `tools/audio/finalize.py` schreibt Dauer und Zeitmarken je Sprache in die Daten der Seite (`VOICE_*`, `GEO_T_*`;
   Ziel: JSON je Sprache unter `src/data/`).
4. Zur Laufzeit liefert `narT()` die Sprecherzeit des laufenden Clips und `cue(k)` die Zeitmarke eines Stichworts.
   Die Kamerafahrt rechnet relativ zu den Stichworten und passt sich so an die Länge jeder Fassung an. Ohne Ton läuft
   ein Kapitel mit Marken trotzdem in voller Länge (die Verweildauer `dwell` richtet sich dann nach der Dauer des Clips).

Von Hand werden Zeitmarken nur geändert, wenn auch der Clip dazu passt. Wer einen Clip neu erzeugt, lässt
`proc.py` und `finalize.py` laufen.

## Betrachtete Alternativen

- **Feste Zeitpunkte von Hand eintragen:** bricht bei jedem neu erzeugten Clip und in jeder Sprache.
- **Sprache Wort für Wort mit Zeitstempeln vom Dienst:** nicht für alle Modelle und Sprachen verfügbar; Prüfung offen.
  Eigene Erkennung ist unabhängig vom Anbieter.
- **Bild unabhängig vom Ton, nur Untertitel:** verliert das Erzählen mit dem Bild.
- **Ton folgt dem Bild (Sprecher in kleinen Satzclips pro Einblendung):** mehr Clips und Credits, hörbare Schnitte.

## Folgen

- Positiv: neue Aufnahmen und neue Sprachen passen sich über die Stichworte an; Kamerafahrt und Text bleiben synchron.
- Negativ: Die Aufbereitung braucht Python mit Modellen (`work/models/`, nicht im Repo) und läuft nur außerhalb des Browsers;
  jeder Clip, der neu erzeugt wird, kostet Credits und verlangt Nacharbeit der Marken.
- Die Stichworte müssen in allen Sprachen an derselben inhaltlichen Stelle stehen.
- Siehe auch `docs/produktion.md` (Abschnitt Sprecher, Aufbereitung).
