---
description: Alles prüfen, was „fertig“ verlangt – Lint, Typen, Unit, E2E und Bildschirmfotos in beiden Formaten
allowed-tools: Bash(npm run *), Read
---

Prüfe den aktuellen Stand gemäß „Fertig heißt“ in `AGENTS.md`:

1. `npm run lint`, `npm run format:check`, `npm run typecheck`, `npm run test:unit` nacheinander ausführen und Fehler zusammenfassen.
2. `npm run test:e2e` mit `SOFTWARE_GL=1` (keine Grafikkarte). Konsolenfehler, fremde Adressen und fehlgeschlagene Anfragen melden.
3. Bildschirmfotos erzeugen, in einem Lauf gebündelt und nicht parallel:
   - Hochformat: `npm run shots -- 390 760 start focus:8 wait:6000 shot:saturn`
   - Querformat: `npm run shots -- 1920 1080 pr:.5 start focus:8 wait:8000 shot:saturn-wide`
   - Bei Änderungen an Texten zusätzlich `--lang=en` und `--lang=pl`; bei Änderungen am Bau `npm run build` und `--dist`.
4. Die Bilder in `.shots/` mit Read **ansehen** und kritisch beurteilen (Bildaufbau, Lesbarkeit der Messmarken, Artefakte).
5. Bericht: was grün ist, was nicht, was nicht geprüft werden konnte. Nichts als bestanden melden, was nicht gelaufen ist.

$ARGUMENTS
