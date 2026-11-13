@AGENTS.md

# Zusätze für Claude Code

Die Arbeitsanleitung steht in `AGENTS.md` (oben eingebunden) und in den `AGENTS.md` der Unterordner; Architektur in `docs/architecture.md`. Hier steht nur, was Claude Code zusätzlich
braucht.

## Befehle und Unteragenten

- Befehle (`.claude/commands/`): `/pruefen` (lint, Unit, E2E, Bildschirmfotos in beiden Formaten), `/neue-sprache`, `/sprecher-neu` (kostet Credits, nur mit Auftrag),
  `/release`.
- Unteragenten (`.claude/agents/`): `render` (Shader, Szene, Nachbearbeitung, Sichtprüfung), `audio` (Tonmodul und Aufbereitung), `e2e` (Tests), `doku` (Doku, ADR, Glossar).
  Bei Änderungen, die mehrere Bereiche berühren, die Bereiche nacheinander oder getrennt bearbeiten lassen; Schnitte entlang der Ordner halten Diffs klein.
- Erlaubte Projektbefehle stehen in `.claude/settings.json`.

## Arbeitsweise

- Quelltext gezielt lesen: erst `docs/modulkarte.md` oder den Kopfkommentar, dann die Datei. Die größten Module (`src/mars/base.js`, `src/audio/engine.js`) sind lang; mit `Grep` und
  Zeilenbereichen arbeiten statt ganze Dateien zu lesen.
- Bildschirmfotos aus `.shots/` mit dem Lesewerkzeug ansehen und kritisch beurteilen wie ein Art Director; sie entstehen bei jedem Lauf neu (vorher ansehen). Nur wenige,
  gebündelte Läufe, nicht parallel (wenige Prozessorkerne).
- Commit-Texte deutsch nach Conventional Commits (`CONTRIBUTING.md`).
- Keine ElevenLabs-Aufrufe ohne ausdrücklichen Auftrag.

## Fassung als claude.ai-Artefakt

Adresse: https://claude.ai/artifact/KuNTVJioeEebKquH2AEGuk. Bau mit `npm run build:artifact` (Ergebnis `dist-artifact/sonnensystem.html`, ein Fragment ohne `<html>`, `<head>`,
`<body>`). Veröffentlicht wird dieses Fragment mit den Begleitdateien, die `dist-artifact/begleitdateien.txt` auflistet (`voice/` mit `en/` und `pl/`, `audio/`, `img/` aus `public/`
und `models/*.json` aus `.artifact/models/`). Die Modelle als JSON erzeugt `cd tools/models && npm install && node embed.mjs`, weil Artefakte kein `.glb` ausliefern.
Hintergrund: `docs/adr/0003-zwei-auslieferungen.md`.
