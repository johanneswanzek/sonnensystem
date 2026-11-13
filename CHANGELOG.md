# Änderungsprotokoll

Alle nennenswerten Änderungen an „Sonnensystem – eine Kamerafahrt“. Das Format folgt
[Keep a Changelog](https://keepachangelog.com/de/1.1.0/). Versionsnummern sind die Stände des Projekts (Version 7, 8 …),
keine semantischen Versionen.

## [Unveröffentlicht]

## [Version 10] – 2026-11-13

Umbau der Struktur; Verhalten und Aussehen sollen gleich bleiben.

### Geändert

- Quelltext aus der einen Datei `src/sonnensystem.html` in ES-Module unter `src/` aufgeteilt, mit Vite als Entwicklungsserver und Bauwerkzeug;
  three.js r128 kommt aus npm statt als klassisches Skript (ADR 0001, ADR 0002).
- Übersetzungen und Sprecher-Zeitmarken liegen als JSON je Sprache vor (`src/i18n/`, `src/data/voice.<sprache>.json`).
- Bau mit Node: `npm run build` (Website), `npm run build:artifact` (claude.ai-Artefakt), Pages-Workflow auf Node umgestellt. Python bleibt nur für
  `tools/audio/`; `tools/build.py`, `tools/serve.py`, `tools/test/` und der Monolith `src/sonnensystem.html` entfallen; auch der Workflow `e2e.yml` (die E2E-Suite läuft in `ci.yml`).
- Bildschirmfotos über `npm run shots` (`tools/shots/`) statt `tools/test/run.js`.

### Hinzugefügt

- Unit-Tests mit Vitest (Bahnmechanik, Übersetzungen, Zeitmarken, Prüfung auf fremde Adressen).
- CI-Workflow (`.github/workflows/ci.yml`), Dependabot, Issue- und Pull-Request-Vorlagen, CODEOWNERS.
- Dokumentation für Menschen und KI-Agenten: `AGENTS.md` (mit Anleitungen je Ordner), `docs/architecture.md`, erzeugte Modulkarte
  (`docs/modulkarte.md`), Entscheidungsprotokolle (`docs/adr/`), Glossar, `CONTRIBUTING.md`, `SECURITY.md`, `llms.txt`, Befehle und Unteragenten für Claude Code.
- ESLint (`no-undef` als harte Regel), Typprüfung über JSDoc (`tsc`), Prettier (Formatierung als eigener Commit 3b9d53d, ADR 0007; `.git-blame-ignore-revs`).
- Erzeugte Modulkarte (`npm run docs:map`).

## [Version 9] – 2026-11-13

### Bild

- Neue Nachbearbeitung (`POST`): HDR-Rendern mit MSAA, Bloom, filmisches Tonemapping, Vignette und Korn.
- Neue Sonne mit Korona und Protuberanzen, Milchstraße als gebackener Himmel.
- Erde mit Streulicht und Meeresglanz.
- Neue NASA-Karten für Saturn, Neptun, Phobos und Deimos; Eisriesen und Venus neu gestaltet, Monde mit Relief, Turbulenz der Gasriesen.
- Marsbasis mit neuem Licht (tiefe Sonne, HDR-Lichter), neuem Boden, Luftperspektive, Horizont aus Tafelbergen, mitlaufenden Schatten und Technikdetails an den Bauten.

### Ton

- Eigene Musik für Erde und Mars mit Überblendung auf dem Takt des Hauptstücks.
- 13 Effekte als Samples (Flug, Ankunft, Landung, Atmosphären, Knopfklick und weitere).

### Tests

- E2E-Suite mit Playwright (Zustände, DOM, ARIA, Netz, Konsole).

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
