# Änderungsprotokoll

Alle nennenswerten Änderungen an „Sonnensystem – eine Kamerafahrt“. Das Format folgt
[Keep a Changelog](https://keepachangelog.com/de/1.1.0/). Versionsnummern sind die Stände des Projekts (Version 7, 8 …),
keine semantischen Versionen.

## [Unveröffentlicht]

Laufende Arbeit an Version 9 und 10 (Stichpunkte, Einzelheiten stehen im Git-Verlauf):

### Hinzugefügt

- Neue Nachbearbeitung, neue Shader und neue Texturen für die Darstellung.
- Neue Marsbasis.
- Neue Musik und neue Effekte.
- E2E-Tests mit Playwright.
- Entscheidungsprotokolle (`docs/adr/`), Beitragsregeln, Issue- und Pull-Request-Vorlagen, CI-Workflow, `AGENTS.md`,
  Glossar und `llms.txt` für die Arbeit mit KI-Agenten.

### Geändert

- Quelltext in ES-Module mit Vite aufgeteilt, three.js r128 aus npm statt als klassisches Skript (ADR 0002).
  Verhalten und Aussehen sollen gleich bleiben.

## [Version 8] – 2026-11-13

### Hinzugefügt

- Die Seite gibt es in Deutsch, Englisch und Polnisch, mit je eigenem Sprecher (ADR 0004).
- Sprachwahl über `?lang=`, gemerkte Wahl und Browsersprache; Knopf oben rechts.
- Titel und Beschreibung je Sprache in `site.json`; erweitertes Latein der Schriften für Polnisch.

## [Version 7] – 2026-11-12

### Hinzugefügt

- Erstveröffentlichung: animierte 3D-Reise durch das Sonnensystem mit Sprecher und Musik (Deutsch) – Planeten an den für das
  Datum berechneten Positionen, Erde mit Nahansicht und Schnitt bis in den Kern, Mars mit Marsbasis, Asteroidengürtel.
- Zwei Auslieferungen aus einer Quelle: Website auf GitHub Pages und Fassung als claude.ai-Artefakt (ADR 0003).
- Browserprüfung mit Bildschirmfotos (`tools/test/run.js`).

[Unveröffentlicht]: https://github.com/johanneswanzek/sonnensystem/compare/main...HEAD
