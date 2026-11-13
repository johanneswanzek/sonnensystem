# Messmarken (`src/hud/`) – lokale Regeln

2D-Overlay auf einem Canvas über der 3D-Ansicht: Beschriftungen, Maßlinien, Maßstäbe. `draw.js` hat die Grundformen (`label`, `line`,
`dimension`, `gauge`, `ring` …), `index.js` `drawHUD` (wählt je Körper), die übrigen Module je ein Thema: `planet.js`, `sun.js`,
`overview.js`, `earth.js` (Ozeane und Kontinente, Aufbau im Schnitt, Wolkenflug), `belt.js`, `base.js` (Stationen der Marsbasis).

## Regeln

- **Maßstab `ui`:** Alles rechnet in Einheiten von `ui` (`src/ui/layout.js`), demselben Faktor wie die CSS-Variable `--u`. `drawHUD` stellt
  `W`, `H`, `topH`, `botH` nach dem Zeichnen zurück; wer sie ändert, muss das ebenfalls tun.
- **Layout:** `measure()` setzt `wide` (Querformat), `topH`/`botH` (freie Fläche) und `guard` (Flächen von Uhr und Titel, denen
  Beschriftungen ausweichen). Beschriftungen müssen `guard` beachten.
- **Einblendungen** hängen an `cue(k)` aus `app/tour.js` (Stichworte aus `src/data/voice.<sprache>.json`); die Zeitpunkte der Namen von
  Ozeanen und Kontinenten stehen unter `geo` in derselben Datei. Nicht an feste Zeiten hängen.
- Beschriftungen der Stationen der Marsbasis erscheinen erst, wenn die Station im Bild ist (`baseHUD`).
- Texte mit `tr('…')`/`fill('…',…)` übersetzen (Schlüssel = deutscher Text, Einträge in `src/i18n/en.json`, `pl.json`); Zahlen mit den
  Formatierern aus `draw.js` (`nf0` … `nf3`), sie folgen `LOC`.
- Polnische und englische Texte sind länger als deutsche: im Querformat und im Hochformat in allen drei Sprachen ansehen.

## Prüfen

`SOFTWARE_GL=1 npm run shots -- --lang=pl 390 760 start focus:4 wait:5000 shot:erde-pl`, dazu `tests/e2e/layout.spec.js`.
