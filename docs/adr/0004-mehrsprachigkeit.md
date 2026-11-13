# ADR 0004: Mehrsprachigkeit mit Deutsch als Quellsprache

- Status: angenommen (eingeführt mit Version 8)
- Datum: 2026-11-13
- Betrifft: `src/i18n/` (Ziel; bis zur Aufteilung die Abschnitte „Sprache“ und „Daten“ in `src/sonnensystem.html`),
  `public/voice/`, `site.json`, `tools/audio/finalize.py`

## Kontext

Die Seite gibt es in Deutsch, Englisch und Polnisch, mit gesprochenem Text. Die Texte entstehen zuerst auf Deutsch.
Übersetzungen und Sprecher-Clips müssen pflegbar bleiben, auch wenn eine Sprache hinzukommt, und das Bild folgt dem Ton
(ADR 0005), also muss jede Sprache eigene Zeitmarken haben.

## Entscheidung

- **Quellsprache Deutsch.** Alle sichtbaren Texte stehen deutsch im Programm.
- **Übersetzungen als Tabelle**, deren Schlüssel der deutsche Text ist (`TR.en`, `TR.pl`; Ziel: JSON je Sprache,
  `src/i18n/en.json`, `pl.json`). `tr('…')` schlägt nach; fehlt ein Eintrag, bleibt der deutsche Text sichtbar.
  Texte im Markup tragen `data-t`; `aria-label` wird immer übersetzt. Zahlen und Datum richten sich nach `LOC`.
- **Wahl der Sprache** in dieser Reihenfolge: Adressparameter `?lang=` → gemerkte letzte Wahl → Browsersprache →
  Englisch. Alles andere als Deutsch oder Polnisch bekommt Englisch.
- **Sprecher je Sprache** mit eigenen Clips (`public/voice/` für Deutsch, `public/voice/en/`, `public/voice/pl/`)
  und eigenen Zeitmarken (`VOICE_DE`, `VOICE_EN`, `VOICE_PL`, `GEO_T_*`), geschrieben von `tools/audio/finalize.py`.
  Die Stichworte stehen in allen Sprachen an derselben inhaltlichen Stelle.
- **Ein Sprachwechsel lädt die Seite neu** (Website: `?lang=`, Artefakt: gemerkte Wahl). So bleibt der Zustand einfach.
- Titel und Beschreibung der Seite je Sprache stehen in `site.json` unter `i18n`.
- Polnisch braucht das erweiterte Latein der Schriften (`public/vendor/fonts/*latin-ext*`).

## Betrachtete Alternativen

- **Schlüssel wie `intro.title` mit einer Quelldatei je Sprache:** üblich in i18n-Bibliotheken; hier aber mehr
  Indirektion, und der deutsche Text im Programm bleibt dann nicht lesbar. Die Tabelle mit deutschem Text als Schlüssel
  ist für rund 300 Zeichenketten überschaubar.
- **i18n-Bibliothek (z. B. i18next):** zusätzliche Abhängigkeit für wenig Bedarf; keine Mehrzahlregeln nötig, die Texte sind fest.
- **Sprachwechsel ohne Neuladen:** müsste Texte, Clips, Zeitmarken und laufende Kapitel im laufenden Betrieb tauschen;
  fehleranfällig, kein Gewinn für die Besucher.
- **Nur Untertitel statt Sprecher:** verfehlt das Ziel einer erzählten Reise.

## Folgen

- Positiv: Eine neue Sprache ist Daten und Medien, kein Umbau; fehlende Übersetzungen fallen auf Deutsch zurück statt zu brechen.
- Negativ: Wer einen deutschen Text ändert, ändert zugleich den Schlüssel und muss `TR.en` und `TR.pl` mitziehen
  (ein Unit-Test auf Vollständigkeit ist geplant, siehe ADR 0006). Jede Sprache kostet ElevenLabs-Credits für den Sprecher.
- Ablauf für eine weitere Sprache: `.claude/commands/neue-sprache.md` und `docs/produktion.md`.
- Offen: ob die Sprachwahl künftig als Pfad (`/en/`) statt als Parameter adressierbar sein soll.
