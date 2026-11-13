# ADR 0007: Formatierung mit Prettier als eigener Commit nach der Aufteilung

- Status: angenommen (Entscheidung des Orchestrators; die Umsetzung als Commit steht noch aus, Stand: Version 10)
- Datum: 2026-11-13
- Betrifft: `src/`, `tests/`, `package.json` (`format`, `format:check`), `.github/workflows/ci.yml`, `.git-blame-ignore-revs`

## Kontext

Der Code stammt aus einem Monolithen (`src/sonnensystem.html`) und hat sehr lange, dichte Zeilen: viele Anweisungen in einer Zeile,
Zeilenumbrüche nur an Abschnittsgrenzen. Die Aufteilung in Module (ADR 0002) hat das bewusst nicht verändert, damit Diffs nachvollziehbar
bleiben und das Verhalten beweisbar gleich ist. Für den Alltag danach ist diese Dichte ungeeignet:

- **Edit-Werkzeuge:** Ersetzungen verlangen eindeutige Textstellen; bei Zeilen mit vielen Anweisungen sind Treffer entweder nicht eindeutig
  oder die Änderung berührt unbeteiligten Code.
- **Diffs und Reviews:** Eine geänderte Anweisung markiert eine ganze Zeile als geändert.
- **Lesen durch Agenten und Suchindizes (RAG):** Auszüge nach Zeilenbereichen sind groß und enthalten viel Fremdes; Zeilenzahlen in der
  Modulkarte unterschätzen den Umfang.

## Entscheidung

Der Code in `src/` und `tests/` wird mit Prettier formatiert. Die Formatierung geschieht **in genau einem rein mechanischen Commit**
nach der Aufteilung und vor weiteren inhaltlichen Änderungen (`npm run format`); der Commit enthält nichts anderes.

- Der Hash des Commits wird in `.git-blame-ignore-revs` eingetragen, damit `git blame` (mit `blame.ignoreRevsFile` und auf GitHub) die Zeilen
  weiter dem inhaltlichen Urheber zuordnet.
- `npm run format:check` läuft in der CI (`.github/workflows/ci.yml`) und lässt unformatierten Code durchfallen.
- Danach gilt: Formatierung nie im selben Commit wie eine inhaltliche Änderung (siehe `AGENTS.md`).
- Der Nachweis „Verhalten bleibt gleich“ entsteht wie bei der Aufteilung: E2E-Tests grün, Bildschirmfotos vorher und nachher gleich.

## Betrachtete Alternativen

- **Dichte Zeilen behalten:** kein Aufwand, aber die oben genannten Nachteile bleiben dauerhaft.
- **Formatieren im selben Schritt wie die Aufteilung:** der Diff wäre doppelt unlesbar (Verschieben und Umbrechen), die Prüfung „nur verschoben“ unmöglich.
- **Schrittweise formatieren, nur angefasste Dateien:** Mischzustand im Repo, jede Änderung enthält fremde Umbrüche.
- **Nur ESLint-Stilregeln statt Prettier:** kein einheitliches Zeilenbild, mehr Konfiguration.

## Folgen

- Positiv: kurze Zeilen, eindeutige Edit-Stellen, lesbare Diffs, kleinere Auszüge für Agenten; Formatierungsstreit entfällt.
- Negativ: ein großer Commit, der die Zeilennummern aller Dateien ändert (Verweise auf Zeilen in Notizen veralten); Dateien werden länger
  (die Richtgröße von etwa 500 Zeilen je Modul gilt danach neu zu prüfen, siehe „Bekannte technische Schuld“ in `docs/architecture.md`).
- Offen: Prettier-Einstellungen (Zeilenbreite) und der Hash für `.git-blame-ignore-revs` entstehen erst mit dem Commit.
