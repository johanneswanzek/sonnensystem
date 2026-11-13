# Sprachen (`src/i18n/`) – lokale Regeln

`index.js` liefert `LANG`, `LANGS`, `LOC`, `tr`, `fill`, `setLang`; `en.json` und `pl.json` sind die Wörterbücher. Hintergrund: ADR 0004.

## Regeln

- **Deutsch ist die Quellsprache.** Alle sichtbaren Texte stehen deutsch im Programm (oder im Markup mit `data-t`); `tr('…')` schlägt sie
  in der Tabelle nach, **Schlüssel ist der deutsche Text**. Fehlt ein Eintrag, bleibt der deutsche Text sichtbar.
- Wer einen sichtbaren Text ändert oder ergänzt, zieht den Schlüssel in `en.json` **und** `pl.json` mit (Änderung des deutschen Textes =
  neuer Schlüssel). `npm run test:unit` (`tests/unit/i18n.test.js`) prüft die Vollständigkeit.
- `aria-label` wird immer übersetzt. Platzhalter `{0}`, `{1}` über `fill`. Zahlen und Datum richten sich nach `LOC` (`de-DE`, `en-GB`, `pl-PL`).
- **Sprachwahl:** `?lang=` → gemerkte Wahl (`localStorage`, Schlüssel `sonnensystem.lang`) → Browsersprache → Englisch. Ein Sprachwechsel lädt
  die Seite neu (Website: `?lang=` in der Adresse, Artefakt: gemerkte Wahl).
- Titel und Beschreibung der Seite je Sprache stehen in `site.json` unter `i18n`.
- Clips liegen in `public/voice/` (Deutsch), `public/voice/en/`, `public/voice/pl/`; die Texte dazu in `docs/sprechertext.<Sprache>.json`; Zeitmarken
  in `src/data/voice.<sprache>.json`.
- Polnisch braucht das erweiterte Latein der Schriften (`public/vendor/fonts/*latin-ext*`).
- Eine weitere Sprache einführen: `/neue-sprache` (`.claude/commands/neue-sprache.md`).

## Prüfen

`npm run test:unit`, `tests/e2e/sprache.spec.js`; Bildschirmfotos mit `--lang=en` und `--lang=pl`.
