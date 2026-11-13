# Dokumentation: Inhaltsverzeichnis

Wann lese ich was? Eine Zeile je Dokument. Zum Einstieg für Agenten gehört außerdem `AGENTS.md` im Wurzelverzeichnis.

## Im Wurzelverzeichnis

- [`README.md`](../README.md): Was die Seite ist, wie man sie startet, baut und veröffentlicht.
- [`AGENTS.md`](../AGENTS.md): Arbeitsanleitung für KI-Agenten und Entwickler: Befehle, Grundsätze, „fertig heißt“, Fallstricke.
- [`CLAUDE.md`](../CLAUDE.md): Zusätze für Claude Code; bis zur Umstellung auf Module noch die ausführliche Projektnotiz.
- [`CONTRIBUTING.md`](../CONTRIBUTING.md): Einrichten, Zweige, Commits, „fertig heißt“, Umgang mit Credits.
- [`CHANGELOG.md`](../CHANGELOG.md): Was sich in welchem Stand geändert hat.
- [`SECURITY.md`](../SECURITY.md): Wie man eine Sicherheitslücke meldet.
- [`llms.txt`](../llms.txt): Kurzer Überblick mit Verweisen für Sprachmodelle und Suchindizes.

## In `docs/`

- [`glossar.md`](glossar.md): Ich lese einen deutschen Fachbegriff (Halt, Abschnitt, Stichwort, Messmarken) und suche den Bezeichner im Code, oder umgekehrt.
- [`produktion.md`](produktion.md): Wie Sprecher, Musik, Modelle und Karten entstanden sind, mit Stimmen, Aufwand, Befehlen und Lizenzen. Lesen vor jeder Medienarbeit.
- `sprechertext.de.json`, `sprechertext.en.json`, `sprechertext.pl.json`: der Sprechertext je Clip mit Stichworten für die Kamerafahrt.
- [`adr/README.md`](adr/README.md): Index der Entscheidungsprotokolle. Lesen, bevor man eine Festlegung ändert.
  - [0001 three.js behalten](adr/0001-three-js-behalten.md): warum die Engine bleibt und warum r128.
  - [0002 ES-Module und Vite](adr/0002-es-module-und-vite.md): warum und wie der Monolith zerlegt wird.
  - [0003 Zwei Auslieferungen](adr/0003-zwei-auslieferungen.md): Website und claude.ai-Artefakt aus einer Quelle.
  - [0004 Mehrsprachigkeit](adr/0004-mehrsprachigkeit.md): Sprachwahl, Übersetzungstabelle, Sprecher je Sprache.
  - [0005 Bild folgt Ton](adr/0005-bild-folgt-ton.md): Zeitmarken aus der Aufnahme steuern das Bild.
  - [0006 Tests](adr/0006-tests.md): E2E, Bildschirmfotos, Unit-Tests.
  - [0000 Vorlage](adr/0000-vorlage.md): Vorlage für neue Protokolle.

## Geplant

- `architecture.md`: Modulkarte, Abhängigkeitsrichtung, Datenfluss, „Was ändere ich wo?“ (wird mit der Aufteilung in Module angelegt; ADR 0002).

## Für Claude Code

- `.claude/commands/`: `/pruefen`, `/neue-sprache`, `/sprecher-neu`, `/release`.
- `.claude/agents/`: Unteragenten `render`, `audio`, `e2e`, `doku`.
