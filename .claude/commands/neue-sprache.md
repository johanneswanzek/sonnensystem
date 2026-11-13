---
description: Ablauf für eine weitere Sprache der Seite (Übersetzung, Sprecher, Zeitmarken, Schriften)
argument-hint: <Sprachkürzel, z. B. fr>
---

Eine weitere Sprache (`$ARGUMENTS`) einführen, nach ADR 0004 (`docs/adr/0004-mehrsprachigkeit.md`) und `docs/produktion.md`.
**Der Sprecher kostet ElevenLabs-Credits (je Sprache rund 4.500 bis 5.100): erst fragen und einen ausdrücklichen Auftrag
abwarten, bevor etwas erzeugt wird.** Die übrigen Schritte kosten nichts.

1. Wörterbuch `src/i18n/<Sprache>.json` anlegen: alle Schlüssel (deutsche Texte) aus `src/i18n/en.json` übersetzen,
   inklusive `aria-label`-Texte und Dialog „Quellen“. In `src/i18n/index.js` `LANGS`, Zahlen- und Datumsformat `LOC` und das Wörterbuch ergänzen.
2. Sprachwahl prüfen: `?lang=`, gemerkte Wahl, Browsersprache, Sprachwahl-Knopf (`src/ui/language-menu.js`). Unbekannte Sprachen bleiben bei Englisch.
3. Titel und Beschreibung in `site.json` unter `i18n` ergänzen; `src/data/voice.js` kennt die Sprache und lädt `src/data/voice.<Sprache>.json`.
4. Schriften prüfen: Reicht das Latein? Sonst Zeichensatz (wie `latin-ext` für Polnisch) lokal ergänzen; Lizenz in
   `public/LIZENZEN.txt` und `docs/produktion.md` eintragen.
5. Sprechertext `docs/sprechertext.<Sprache>.json` übersetzen: gleiche Clips und Stichworte, Stichworte an derselben inhaltlichen Stelle.
6. Nach Auftrag: Clips bei ElevenLabs erzeugen (Stimme wählen, Voice-ID in `docs/produktion.md` eintragen), dann
   `python tools/audio/proc.py --lang <Sprache> …` und `python tools/audio/finalize.py --lang <Sprache>` (siehe `/sprecher-neu`).
7. Prüfen: `/pruefen` mit `--lang=<Sprache>` im Hoch- und Querformat; Vollständigkeitstest der Übersetzungen (`npm run test:unit`, `tests/unit/i18n.test.js`) und E2E (`tests/e2e/sprache.spec.js`) anpassen.
8. `CHANGELOG.md`, `README.md`, `AGENTS.md` und das Glossar nachziehen.
