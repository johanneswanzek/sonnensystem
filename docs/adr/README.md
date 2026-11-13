# Entscheidungsprotokolle (ADR) – Index

Hier stehen die wichtigen Architekturentscheidungen des Projekts „Sonnensystem – eine Kamerafahrt“ im Format MADR
(Kontext, Entscheidung, betrachtete Alternativen, Folgen). Lesen, bevor man eine dieser Festlegungen ändert; ein neues
Protokoll anlegen, wenn eine Entscheidung fällt oder ersetzt wird. Vorlage: [0000-vorlage.md](0000-vorlage.md).

| Nr. | Titel | Status |
| --- | --- | --- |
| [0001](0001-three-js-behalten.md) | three.js bleibt die technische Basis (r128, aus npm) | angenommen |
| [0002](0002-es-module-und-vite.md) | ES-Module und Vite statt einer einzigen HTML-Datei | angenommen, umgesetzt |
| [0003](0003-zwei-auslieferungen.md) | Zwei Auslieferungen aus einer Quelle (Website und claude.ai-Artefakt) | angenommen |
| [0004](0004-mehrsprachigkeit.md) | Mehrsprachigkeit mit Deutsch als Quellsprache | angenommen |
| [0005](0005-bild-folgt-ton.md) | Das Bild folgt dem Ton (Zeitmarken aus der Aufnahme) | angenommen |
| [0006](0006-tests.md) | Teststrategie: E2E, Bildschirmfotos, Unit-Tests | angenommen, umgesetzt |
| [0007](0007-formatierung-mit-prettier.md) | Formatierung mit Prettier als eigener Commit nach der Aufteilung | angenommen, Commit steht aus |

Neue Nummer: die nächste freie vierstellige Zahl, Dateiname `NNNN-kurzer-titel.md`, Eintrag in diese Tabelle.
