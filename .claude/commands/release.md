---
description: Eine Fassung veröffentlichen – Changelog, Bau, Tests, Push
argument-hint: <Versionsname, z. B. "Version 9">
disable-model-invocation: true
---

Eine Veröffentlichung vorbereiten (`$ARGUMENTS`). Ein Push auf `main` veröffentlicht die Website sofort (GitHub Pages);
deshalb vor dem Push den Auftraggeber fragen, wenn er nicht ausdrücklich zum Veröffentlichen aufgefordert hat.

1. Sauberer Arbeitsbaum (`git status`), Zweig ist aktuell mit `main`.
2. `CHANGELOG.md`: Abschnitt „Unveröffentlicht“ in einen Abschnitt mit Versionsname und Datum umwandeln, neuen leeren
   „Unveröffentlicht“ darüber setzen. Nur belegte Punkte.
3. `npm run lint`, `npm run format:check`, `npm run typecheck`, `npm run test:unit`, `npm run build`, `npm run test:e2e` (mit `SOFTWARE_GL=1`).
4. Gebaute Seite ansehen: `npm run preview`, Bildschirmfotos im Hoch- und Querformat (`/pruefen`). Keine fremden Adressen.
5. Bei Artefakt-Änderungen: `npm run build:artifact` und die Fassung auf claude.ai aktualisieren (Begleitdateien laut `dist-artifact/begleitdateien.txt`; Adresse in `CLAUDE.md`).
6. Commit nach Conventional Commits auf Deutsch, dann Pull Request oder (nach Freigabe) Push auf `main`.
7. Nach dem Lauf der Action die Live-Adresse prüfen: https://sonnensystem.johannes-wanzek.de/
