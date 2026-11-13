# Tests (`tests/`) – lokale Regeln

Strategie: ADR 0006. Drei Ebenen: Unit-Tests (`tests/unit/`, Vitest), E2E (`tests/e2e/`, Playwright), Bildschirmfotos zur Sichtprüfung
(`tools/shots/`, `npm run shots`).

## Befehle

```
npm run test:unit                       # reine Logik: Kepler, Übersetzungen, Zeitmarken, Prüfung auf fremde Adressen
npm run test:e2e                        # beide Projekte: Testseite (.test/) und dist/
npm run test:e2e -- tests/e2e/zeit.spec.js     # eine Datei; kürzer: npm run test:e2e:file zeit
npm run test:e2e -- --project=dist      # nur die gebaute Website
```

Ohne Grafikkarte `SOFTWARE_GL=1` setzen (Timeouts werden dann größer); `CHROME_PATH` für einen eigenen Chrome; `E2E_NOBUILD=1` nimmt vorhandene
`.test/` und `dist/`. Die Konfiguration steht in `playwright.config.js`, Aufbau und Server in `tests/e2e/global-setup.js` und `server.js`.

## Regeln

- E2E prüft Zustände, DOM, ARIA, Netz (jede Anfrage an eine fremde Adresse gilt als Fehler) und Konsole. **Keine Pixelvergleiche.**
- Tests warten auf Zustände, nicht auf Zeiten; ein Worker, nicht parallel (Software-Rendering braucht den ganzen Prozessor).
- Die Testseite hat Prüfhaken (`window.__t` aus `src/testing/hooks.js`, dazu `__mbt`, `__clk`, `__cam`, `__au`); `dist/` hat sie nicht. Tests, die nur über DOM,
  Netz und Konsole laufen, gehören in das Projekt `dist` (`playwright.config.js`).
- Neue Knöpfe, Tastenkürzel, Sprachen oder Halte brauchen einen E2E-Test; neue Prüfhaken sind nur lesend und kommen in `src/testing/hooks.js`.
- `tests/e2e/` ist CommonJS (`tests/e2e/package.json`), der Rest des Projekts ES-Module.
- Unit-Tests nur für reine Logik; Rendering gehört nicht dazu.
