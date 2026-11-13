---
description: Ablauf für eine weitere Sprache der Seite (Übersetzung, Sprecher, Zeitmarken, Schriften)
argument-hint: <Sprachkürzel, z. B. fr>
---

Eine weitere Sprache (`$ARGUMENTS`) einführen, nach ADR 0004 (`docs/adr/0004-mehrsprachigkeit.md`) und `docs/produktion.md`.
**Der Sprecher kostet ElevenLabs-Credits (je Sprache rund 4.500 bis 5.100): erst fragen und einen ausdrücklichen Auftrag
abwarten, bevor etwas erzeugt wird.** Die übrigen Schritte kosten nichts.

1. Übersetzungstabelle für die Sprache anlegen: alle Schlüssel (deutsche Texte) der englischen Tabelle übersetzen,
   inklusive `aria-label`-Texte und Dialog „Quellen“. Zahlen- und Datumsformat in `LOC` ergänzen.
2. Sprachwahl erweitern: `?lang=`, gemerkte Wahl, Browsersprache, Sprachwahl-Knopf. Unbekannte Sprachen bleiben bei Englisch.
3. Titel und Beschreibung in `site.json` unter `i18n` ergänzen.
4. Schriften prüfen: Reicht das Latein? Sonst Zeichensatz (wie `latin-ext` für Polnisch) lokal ergänzen; Lizenz in
   `public/LIZENZEN.txt` und `docs/produktion.md` eintragen.
5. Sprechertext `docs/sprechertext.<Sprache>.json` übersetzen: gleiche Clips und Stichworte, Stichworte an derselben inhaltlichen Stelle.
6. Nach Auftrag: Clips bei ElevenLabs erzeugen (Stimme wählen, Voice-ID in `docs/produktion.md` eintragen), dann
   `python tools/audio/proc.py --lang <Sprache> …` und `python tools/audio/finalize.py --lang <Sprache>` (siehe `/sprecher-neu`).
7. Prüfen: `/pruefen` mit `--lang=<Sprache>` im Hoch- und Querformat; Vollständigkeitstest der Übersetzungen (`npm run test:unit`).
8. `CHANGELOG.md`, `README.md`, `AGENTS.md` und das Glossar nachziehen.
