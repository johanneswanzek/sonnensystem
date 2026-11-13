# ADR 0003: Zwei Auslieferungen aus einer Quelle (Website und claude.ai-Artefakt)

- Status: angenommen
- Datum: 2026-11-13
- Betrifft: Bau (`npm run build`, `npm run build:artifact`), `tools/artifact/`, `tools/models/`, `public/`

## Kontext

Die Seite wird auf zwei Wegen ausgeliefert, die unterschiedliche Regeln haben:

1. **Website** (https://sonnensystem.johannes-wanzek.de/, GitHub Pages): ein vollständiges Dokument. Es lädt nichts von
   fremden Servern; Bibliotheken, Schriften und Modelle liegen lokal.
2. **claude.ai-Artefakt** (Adresse in `CLAUDE.md`): ein Fragment ohne `<html>`, `<head>` und `<body>`. Artefakte liefern
   keine `.glb`-Dateien aus, daher heißen die Modelle dort `models/<name>.json` (glTF mit eingebetteten Daten, erzeugt von
   `tools/models/embed.mjs`). Schriften kommen von Google Fonts.

Zwei getrennte Codebasen würden auseinanderlaufen. Bis Version 8 entstanden beide aus derselben Datei
`src/sonnensystem.html`; `tools/build.py` (inzwischen entfallen) ersetzte die abweichenden Stellen.

## Entscheidung

Es gibt weiterhin **eine** Quelle und zwei Bauziele:

- `npm run build` erzeugt die Website in `dist/`. Der Bau bricht ab, wenn im Ergebnis noch eine fremde Adresse steht.
- `npm run build:artifact` erzeugt `dist-artifact/sonnensystem.html` als Fragment (Stil und Skript eingebettet,
  three.js mitgebündelt, Schriften von Google Fonts, Modelle als `models/<name>.json`) samt Liste der Begleitdateien (`dist-artifact/begleitdateien.txt`).
- Zur Bauzeit gesetzte Konstanten (`TARGET`, `SITE_CFG`, `MODEL_EXT` in `src/core/target.js`) tragen die wenigen Unterschiede in den Code.
- Die Unterschiede liegen allein im Bau (`tools/artifact/`), nie im Quelltext der Seite.

## Betrachtete Alternativen

- **Nur die Website:** einfacher, aber das Artefakt auf claude.ai entfiele; es ist ein eigener Verbreitungsweg.
- **Nur das Artefakt:** die Seite hätte keine eigene Adresse, keine eigene Domain und müsste ohne lokale Dateien auskommen.
- **Zwei Codebasen:** läuft garantiert auseinander.
- **Weiter Zeichenkettenersetzung wie in `build.py`:** fragil (gesuchte Zeilen müssen genau einmal vorkommen); mit
  Modulen und Vite überflüssig.

## Folgen

- Positiv: Änderungen gelten für beide Wege; die Prüfung „keine fremden Adressen“ schützt die Website.
- Negativ: Der Artefaktbau ist ein zweiter Weg, der bei Änderungen an Bibliotheken, Schriften oder Modellen mitgeprüft
  werden muss; Modelle müssen zusätzlich als JSON erzeugt werden.
- Die Veröffentlichung des Artefakts bleibt ein Handgriff (Fragment plus Begleitdateien `voice/`, `audio/`, `img/` und
  `models/*.json`); eine Automatisierung ist offen.
