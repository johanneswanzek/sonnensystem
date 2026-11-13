# Beitragen zum Projekt „Sonnensystem – eine Kamerafahrt“

Diese Anleitung gilt für Menschen und für KI-Agenten. Die werkzeugneutrale Arbeitsanleitung für Agenten steht in
[`AGENTS.md`](AGENTS.md). Sprache von Oberfläche (Quelltext), Kommentaren, Doku, Issues und Commits ist Deutsch.

Hinweis zum Stand: Die Befehle unten gelten für die Modulstruktur mit Vite (ADR 0002), die gerade eingeführt wird.
Bis zum Merge des Zweigs `v9-arch` gelten noch `python tools/serve.py` und `node tools/test/run.js` (siehe `CLAUDE.md`).

## Einrichten

Voraussetzungen: Node.js in der Version aus `.nvmrc` (mindestens 20), Git. Python 3 nur für die Medienaufbereitung
in `tools/audio/`.

```
npm install
npx playwright install --with-deps chromium    # einmalig, für E2E und Bildschirmfotos
npm run dev                                    # Entwicklungsserver mit Neuladen
```

Ohne Grafikkarte (Server, Container) vor E2E und Bildschirmfotos `SOFTWARE_GL=1` setzen. Dann ist jedes Bild langsam;
im Querformat als ersten Schritt `pr:.5` nehmen.

## Befehle

| Befehl | Wirkung |
| --- | --- |
| `npm run dev` | Entwicklungsserver |
| `npm run build` | Website nach `dist/` (bricht ab, wenn eine fremde Adresse im Ergebnis steht) |
| `npm run preview` | gebaute Website lokal ansehen |
| `npm run build:artifact` | Fassung als claude.ai-Artefakt nach `dist-artifact/` |
| `npm run lint` | ESLint |
| `npm run typecheck` | Typprüfung (JSDoc, `tsc`) |
| `npm run test:unit` | Unit-Tests (Vitest) |
| `npm run test:e2e` | E2E-Tests (Playwright) |
| `npm run shots -- 390 760 start focus:5 shot:mars` | Bildschirmfotos nach `.test/shots/` |

## Zweige und Commits

- Arbeit geschieht auf einem Zweig (`feature/…`, `fix/…`, `docs/…`), nicht direkt auf `main`. Ein Push auf `main`
  veröffentlicht die Seite (GitHub Pages).
- Commit-Texte nach [Conventional Commits](https://www.conventionalcommits.org/de/v1.0.0/), auf Deutsch:
  `feat: Bloom für die Sonne`, `fix: Beschriftung der Marsbasis springt im Querformat`, `docs: ADR zur Sprachwahl`,
  `test:`, `refactor:`, `chore:`, `build:`, `ci:`. Der erste Satz sagt, was sich ändert, nicht wie.
- Ein Commit, ein Gedanke. Änderungen, die nur umformatieren oder Dateien verschieben, stehen in eigenen Commits.

## „Fertig“ heißt

Eine Änderung ist fertig, wenn alles davon zutrifft (dieselbe Liste steht in der Pull-Request-Vorlage):

1. `npm run lint`, `npm run typecheck` und `npm run test:unit` laufen ohne Fehler.
2. `npm run test:e2e` ist grün; der Lauf meldet keine Konsolenfehler, keine fremden Adressen, keine fehlgeschlagenen Anfragen.
3. Sichtprüfung: Bildschirmfotos im Hochformat (390×760) und im Querformat (1920×1080) angesehen und beurteilt,
   nicht nur erzeugt. Bei Änderungen am Bau zusätzlich die gebaute Seite prüfen (`npm run build`, dann `npm run preview`);
   bei Änderungen an Texten zusätzlich Englisch und Polnisch (`?lang=en`, `?lang=pl`).
4. Doku nachgezogen: `AGENTS.md` und `CLAUDE.md` bei geänderten Befehlen oder Modulen, `docs/` bei geänderter Architektur, ein
   neues ADR bei einer Entscheidung, `CHANGELOG.md` bei sichtbaren Änderungen.
5. Lizenzen eingetragen: Jede neue Karte, jedes Modell, jede Schrift und jede Bibliothek steht mit Quelle und
   Lizenz in `public/LIZENZEN.txt` und `docs/produktion.md`. Erlaubt sind nur gemeinfreie Werke (NASA), CC0 und CC BY.
6. Sichtbare Texte haben Übersetzungen für Englisch und Polnisch (ADR 0004).

## Medien und ElevenLabs-Credits

Sprecher und Musik entstehen bei ElevenLabs und kosten Credits (Deutsch rund 5.100, Englisch 4.660, Polnisch 4.483, Musik 2.250).
**Nie ohne ausdrücklichen Auftrag erzeugen oder wiederholen**, auch nicht „zum Testen“; kein Skript und kein Agent
löst Erzeugungen von selbst aus. Die Aufbereitung vorhandener Rohdateien (`tools/audio/`) kostet nichts. Wer einen Clip neu
erzeugt, muss danach Aufbereitung und Zeitmarken nachziehen (`docs/produktion.md`, ADR 0005).

## Fehler und Wünsche melden

Über die Formulare unter „Issues“ (Fehler, Verbesserung, Inhalt oder Übersetzung). Sicherheitsfragen siehe `SECURITY.md`.
