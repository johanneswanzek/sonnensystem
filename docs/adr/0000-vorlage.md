# ADR 0000: Vorlage für Entscheidungsprotokolle

- Status: Vorlage (kopieren, nicht ändern)
- Datum: JJJJ-MM-TT
- Betrifft: Bereiche oder Dateien, auf die sich die Entscheidung auswirkt

Dieses Dokument ist die Vorlage für Entscheidungsprotokolle (Architecture Decision Records) im Projekt
„Sonnensystem – eine Kamerafahrt“. Es folgt dem Format MADR (Markdown Architectural Decision Records), auf
Deutsch und gekürzt. Neue Protokolle bekommen die nächste freie vierstellige Nummer und einen sprechenden
Dateinamen, zum Beispiel `0007-webgpu-umstieg.md`, und werden in `docs/adr/README.md` in den Index eingetragen.

Regeln:

- Ein Protokoll hält **eine** Entscheidung fest. Eine spätere Änderung bekommt ein neues Protokoll, das das alte
  ersetzt; im alten wird nur der Status auf „ersetzt durch ADR 000X“ gesetzt.
- Status: `vorgeschlagen`, `angenommen`, `abgelehnt`, `ersetzt durch ADR 000X`.
- Nur belegte Aussagen. Was unbekannt ist, steht als „offen“ da.

---

## Kontext

Welches Problem liegt vor? Welche Kräfte wirken (Anforderungen, Zwänge, Vorgaben)? Zwei bis zehn Sätze.

## Entscheidung

Was wird getan? Ein Absatz, aktiv formuliert („Wir …“).

## Betrachtete Alternativen

- **Alternative A:** kurz, mit dem Grund, warum sie nicht gewählt wurde.
- **Alternative B:** …

## Folgen

- Positiv: …
- Negativ oder Kosten: …
- Offen: Was bleibt zu klären oder nachzuziehen?
