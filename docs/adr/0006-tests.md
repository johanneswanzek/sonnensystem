# ADR 0006: Teststrategie – E2E mit Playwright, Bildschirmfotos zur Sichtprüfung, Unit-Tests für reine Logik

- Status: angenommen (Umsetzung in Arbeit; Stand heute: `tools/test/run.js`)
- Datum: 2026-11-13
- Betrifft: `tests/e2e/`, `tests/unit/`, `playwright.config.js`, `tools/shots/`, `.github/workflows/ci.yml`

## Kontext

Die Seite ist ein Bild- und Tonerlebnis; ob eine Szene schön aussieht, entscheidet ein Mensch. Automatisch prüfbar sind
dagegen Zustände, Markup, Bedienbarkeit, Netzverkehr und Fehler. Bisher gab es ein Skript (`tools/test/run.js`), das die
Seite in einem Chrome ohne Fenster steuert, Bildschirmfotos macht und Konsolenfehler, fremde Adressen und
fehlgeschlagene Anfragen meldet. Auf Rechnern ohne Grafikkarte läuft es mit Software-Rendering (`SOFTWARE_GL=1`),
das langsam und bei Wartezeiten unzuverlässig ist. Die Aufteilung in Module (ADR 0002) verlangt einen Nachweis,
dass sich das Verhalten nicht geändert hat.

## Entscheidung

Drei Ebenen:

1. **E2E-Tests mit Playwright** (`npm run test:e2e`, in `tests/e2e/`): prüfen Zustände (Körper, Abschnitt, Tour),
   DOM und ARIA (Knöpfe, Beschriftungen, Sprache), Netz (keine fremden Adressen, keine fehlgeschlagenen Anfragen)
   und Konsole (keine Fehler). **Keine Pixelvergleiche**: Software-Rendering und Treiber machen sie unzuverlässig.
2. **Bildschirmfotos zur Sichtprüfung** (`npm run shots -- <Breite> <Höhe> <Schritte…>`): ein Mensch oder Agent schaut
   sich Hochformat (390×760) und Querformat (1920×1080) an. Die Schritte (`start`, `focus:N`, `stage:N`, `mbt:S`,
   `shot:Name` …) und die Prüfhaken `window.__t`, `__mbt`, `__clk`, `__cam` bleiben so wie in `tools/test/run.js`.
3. **Unit-Tests mit Vitest** (`npm run test:unit`, in `tests/unit/`) für reine Logik: Bahnmechanik, Vollständigkeit der
   Übersetzungen, Zeitmarken, Bauprüfungen.

In der CI läuft Chromium mit Software-Rendering (`SOFTWARE_GL=1`); Wartezeiten sind dort großzügig, und Prüfungen
hängen an Zuständen, nicht an Zeiten (Marsbasis: `mbt:S` statt `seek` und `wait`).

## Betrachtete Alternativen

- **Pixelvergleich (visuelle Regression):** bei Software-Rendering und animierten, zeitabhängigen Bildern instabil;
  erzeugt Fehlalarme und teure Pflege der Referenzbilder.
- **Nur manuelle Prüfung:** trägt bei zwei Auslieferungen, drei Sprachen und zwei Formaten nicht.
- **Cypress oder Puppeteer statt Playwright:** das vorhandene Skript nutzt Playwright; kein Grund zu wechseln.
- **Unit-Tests für Rendering:** die Szene hängt an WebGL; reine Logik lässt sich dagegen ohne Browser prüfen.

## Folgen

- Positiv: Verhalten ist nachweisbar, Fehler und fremde Adressen fallen in der CI auf; die Sichtprüfung bleibt ausdrücklich Menschensache.
- Negativ: E2E im Software-Rendering ist langsam (mehrere Minuten je Lauf) und braucht Geduld bei Zeitabhängigem.
- „Fertig“ heißt auch: Bildschirmfotos in beiden Formaten angesehen (siehe `CONTRIBUTING.md`).
- Offen: Umfang der ersten E2E-Tests und der Unit-Tests richtet sich nach der Umsetzung durch die Zweige `v9-arch` und `v9-e2e`.
