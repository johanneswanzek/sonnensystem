# Darstellung der Weltraumszene (`src/render/`) – lokale Regeln

Gilt für `renderer.js`, `post.js` (`POST`), `surfaces.js` (`SURF`), `bake.js`, `canvas-textures.js`, `scene.js`, `scene/` (Sonne, Planeten,
Hintergrund, Kleinkörper, Extras) und `shaders/` (GLSL als Zeichenketten). Marsbasis: [`src/mars/AGENTS.md`](../mars/AGENTS.md).
Maßstab: realistisch, filmisch, ruhig wie eine hochwertige Weltraum-Doku; nicht bunt oder verspielt. three.js bleibt r128 (ADR 0001).

## Nachbearbeitung (`POST`, `post.js`)

- `POST.render(scene, camera, {lin, exposure, bloom, thr, knee, vig})` ersetzt `renderer.render` für beide Szenen.
- Gezeichnet wird in ein HalfFloat-Ziel (unter WebGL2 mit MSAA, Desktop 4×, Handy 2×; so groß wie der Bildspeicher, folgt also `PR`/`setPR`
  und `measure`), dann Bloom über 4 Stufen (Desktop 6) ab halber Auflösung (Hell-Pass mit weichem Knie, Dual-Filter abwärts und aufwärts),
  zuletzt in einem Schritt Belichtung, Tonemapping, Vignette und Korn.
- Weltraum (`lin:0`): die Shader liefern Werte fürs Display, nur Lichter über 1 laufen weich aus. Sonne, Korona, Stadtlichter, Meeresglanz
  und der Erdkern liefern bewusst Werte über 1 und leuchten dadurch.
- Marsoberfläche (`lin:1`): linear, ACES (wie `THREE.ACESFilmicToneMapping`) und sRGB, Belichtung .95.
- Ohne HalfFloat-Ziele (Probe beim Start) oder unter 0,45 Bildpunkten je CSS-Pixel zeichnet `POST` direkt wie früher. `POST.ok` sagt, ob der
  volle Weg läuft (Glanzsprites der Sonne werden dann schwächer gesetzt). Kein Feature darf die Seite brechen, wenn eine Erweiterung fehlt.

## Oberflächen und Karten

- `SURF` (`surfaces.js`): prozedurale Texturen, auf der Grafikkarte gebacken (`bake`, `bakeFlat` in `bake.js`; GLSL in `shaders/bake.js`).
  Karten von Erde, Mars, Jupiter, Saturn, Neptun und den Marsmonden liegen in `public/img/` (NASA, Lizenzen in `public/LIZENZEN.txt`); alle
  anderen Oberflächen werden im Browser berechnet (Übersicht in `docs/produktion.md`, Abschnitt Karten).
- Die Sonne, ihre Korona mit Protuberanzen und der Schnitt durch die Erde sind Shader, die in jedem Bild neu rechnen (`SUN_FS`,
  `CORONA_FS` in `shaders/space.js`).
- Neue Karten nur gemeinfrei (NASA), CC0 oder CC BY; JPEG, höchstens 4096 px; Eintrag in `public/LIZENZEN.txt` und `docs/produktion.md`.

## Fallstricke

- Eigene Variablen in `onBeforeCompile` dürfen nicht `r0`, `r1`, `m0` heißen (Makros in `cube_uv_reflection_fragment`), sonst gibt es
  rätselhafte Syntaxfehler.
- Teure Dinge hängen an `DESKTOP` (`core/device.js`) oder werden auf Handys vereinfacht; der Auflösungsregler `govern()` muss wirksam bleiben.
- Sichtprüfung gehört dazu: Bildschirmfotos im Hochformat (390×760) und Querformat (1920×1080, `pr:.5`), wirklich ansehen.
- Zahlen und Texte der Szene nicht fest verdrahten, wenn sie in `BODIES` stehen.

## Prüfen

`SOFTWARE_GL=1 npm run shots -- 390 760 start focus:8 wait:6000 shot:saturn` und `… 1920 1080 pr:.5 start focus:8 wait:8000 shot:saturn-wide`;
danach `npm run test:e2e`.
