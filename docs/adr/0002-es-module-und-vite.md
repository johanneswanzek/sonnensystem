# ADR 0002: ES-Module und Vite statt einer einzigen HTML-Datei

- Status: angenommen und umgesetzt (Zweig `v9-arch`, Version 10)
- Datum: 2026-11-13
- Betrifft: `src/`, `index.html`, `package.json`, Bau (`npm run build`), Tests, Dokumentation

## Kontext

Bis Version 8 stand die ganze Seite in `src/sonnensystem.html`: Stil, Markup und ein großes Skript in einer
Closure, rund 2.800 Zeilen und 210 KB. Ein Python-Skript (`tools/build.py`, inzwischen entfallen) machte daraus per
Zeichenkettenersetzung die Website. Das war für eine Einzeldatei als claude.ai-Artefakt gedacht, trägt aber nicht
mehr:

- Zu groß für gezieltes Lesen, für Menschen wie für KI-Agenten und Suchindizes; Änderungen mehrerer Beteiligter
  kollidieren in derselben Datei.
- Keine ausdrücklichen Abhängigkeiten: alles hängt über die Closure an allem.
- Keine statische Prüfung (Lint, Typen), nur Laufzeitfehler im Browser.
- Der Bau per Ersetzung ist fragil: `build.py` sucht Codezeilen, die genau einmal vorkommen müssen.

## Entscheidung

Der Quelltext wird in kleine, benannte ES-Module mit ausdrücklichen `import`/`export` zerlegt; Vite ist
Entwicklungsserver und Bauwerkzeug.

- `npm run dev`, `npm run build`, `npm run preview`; Node ab Version 20, `package.json` im Wurzelverzeichnis.
- Schnitt entlang der bisherigen Abschnittsmarken (`/* ---------- Name ---------- */`); Richtwert: keine Quelldatei
  über etwa 500 Zeilen (Ausnahmen: reine Daten, einzelne große Shader). Jede Datei beginnt mit einem Kopfkommentar
  (Zweck, wichtigste Exporte, Abhängigkeiten).
- three.js r128 kommt aus npm (siehe ADR 0001).
- JavaScript bleibt JavaScript, mit JSDoc-Typen und `// @ts-check` dort, wo es trägt; `tsconfig.json` mit `allowJs`,
  `checkJs` schrittweise. ESLint (flat config, `no-undef` als harte Regel) und Prettier nur als Prüfung und Format
  für neue Dateien, kein Umformatieren des bestehenden Codes im selben Schritt.
- Gemeinsamer veränderlicher Zustand, den mehrere Module schreiben, liegt in einem Zustandsobjekt
  (`core/state.js`) oder hinter Setter-Funktionen im besitzenden Modul. Reihenfolgeabhängiger Code auf oberster
  Ebene wandert in `init…()`-Funktionen, die `main.js` aufruft.
- Daten wandern aus dem Code: Übersetzungen und Sprecher-Zeitmarken als JSON je Sprache (ADR 0004), Shader als
  eigene Module.
- Prüfhaken für Tests sind ein eigenes Modul, das nur im Testmodus eingebunden wird, statt Zeichenkettenersetzung.
- Python bleibt nur für die Medienaufbereitung in `tools/audio/`; `tools/build.py` und `tools/serve.py` entfallen.
- Das Verhalten bleibt gleich: kein anderes Aussehen, kein anderer Ton. Nachweis durch E2E-Tests und Bildschirmfotos
  vorher und nachher (ADR 0006).

## Betrachtete Alternativen

- **Monolith behalten:** kein Aufwand, aber die oben genannten Probleme wachsen mit jeder Funktion.
- **Teildateien nur zusammenkopieren, ohne Module:** kleinere Dateien, aber weiterhin ein gemeinsamer globaler
  Namensraum ohne ausdrückliche Abhängigkeiten; Lint und Typprüfung fänden nichts.
- **Sofort nach TypeScript umstellen:** beste Prüfung, aber ein Umschreiben von rund 2.800 Zeilen zugleich mit
  der Aufteilung macht Diffs unlesbar und das „Verhalten bleibt gleich“ unbeweisbar. JSDoc mit `checkJs` ist der
  schrittweise Weg; eine spätere Umstellung bleibt möglich.
- **esbuild oder Rollup pur:** möglich; Vite bringt Entwicklungsserver mit Neuladen, Teststruktur (Vitest) und
  Rollup als Bauwerkzeug ohne eigene Konfigurationsarbeit.

## Folgen

- Positiv: gezieltes Lesen und Ändern, ausdrückliche Abhängigkeiten, Lint, Typprüfung und Unit-Tests werden möglich,
  Zweige kollidieren seltener.
- Negativ: Zustand muss umgestellt werden (`S.cur` statt Closure-Variable); Zyklen zwischen Modulen dürfen nur über
  Funktionen laufen, die erst zur Laufzeit aufgerufen werden (sonst Fehler durch Zugriff vor der Initialisierung).
  Entwicklung braucht Node und `npm install`.
- Die Fassung als claude.ai-Artefakt muss aus den Modulen gebaut werden (ADR 0003).
- Die Modulkarte steht in `docs/modulkarte.md` (erzeugt von `tools/docs/modulkarte.mjs`), der Überblick in `docs/architecture.md`.
- Offen: Die großen Closures `MB`, `AU` und `SURF` sind noch je ein Modul; Vorschlag für den nächsten Schnitt in `docs/architecture.md`, Abschnitt „Bekannte technische Schuld“.
- Formatierung des übernommenen, dichten Codes: ADR 0007.
