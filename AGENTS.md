# AGENTS.md – Arbeitsanleitung für KI-Agenten und Entwickler

Werkzeugneutrale Hauptanleitung für das Repo `johanneswanzek/sonnensystem` (Claude Code, Copilot, Codex, Cursor u. a.). Sprache von
Oberfläche, Kommentaren, Doku, Issues und Commit-Texten ist Deutsch. Lokale Regeln je Bereich stehen in den `AGENTS.md` der Ordner
(`src/mars/`, `src/audio/`, `src/render/`, `src/hud/`, `src/i18n/`, `tools/audio/`, `tests/`); lies die des Bereichs, den du änderst.

## Projekt in drei Sätzen

Animierte 3D-Reise durch das Sonnensystem im Browser (three.js r128, WebGL2) mit Sprecher, Musik und Effekten in Deutsch, Englisch und
Polnisch: Planeten an berechneten Positionen, ein Flug durch die Wolken der Erde bis in den Kern, eine mögliche Kolonie auf dem Mars, der
Asteroidengürtel. Live unter https://sonnensystem.johannes-wanzek.de/ (GitHub Pages, Deploy per Action bei Push auf `main`); dieselbe Quelle
wird zusätzlich als claude.ai-Artefakt gebaut. Die Seite ist eine statische Vite-Anwendung aus ES-Modulen (`src/`) ohne Framework; das Bild folgt dem Ton.

## Schnellstart

```
npm install                                  # Node >= 20 (.nvmrc); einmalig danach: npx playwright install --with-deps chromium
npm run dev                                  # http://localhost:8080
```

## Befehle (aus `package.json`)

| Befehl | Wirkung |
| --- | --- |
| `npm run dev` / `build` / `preview` | Entwicklungsserver / Website nach `dist/` / gebaute Website ansehen |
| `npm run build:artifact` | claude.ai-Artefakt nach `dist-artifact/` (`sonnensystem.html`, `begleitdateien.txt`) |
| `npm run build:test` | Testseite mit Prüfhaken nach `.test/` |
| `npm run lint` / `typecheck` | ESLint (flat config, `no-undef` hart) / `tsc` (`checkJs` aus, geprüft werden nur Dateien mit `// @ts-check`) |
| `npm run format` / `format:check` | Prettier für `src` und `tests` |
| `npm run test:unit` (`test`) | Vitest, `tests/unit/` |
| `npm run test:e2e` | Playwright, `tests/e2e/`; `test:e2e:file <name>` eine Datei, `-- --project=dist` nur `dist/` |
| `npm run shots -- 390 760 start focus:5 wait:5000 stage:1 wait:8000 mbt:45 wait:2000 shot:landung` | Bildschirmfotos nach `.shots/`; Schritte im Kopf von `tools/shots/run.js` |
| `npm run docs:map` | erzeugt `docs/modulkarte.md` aus dem Quelltext neu (`node tools/docs/modulkarte.mjs --check` prüft, ob sie aktuell ist) |

Python nur für `tools/audio/`. Ohne Grafikkarte `SOFTWARE_GL=1` setzen: jedes Bild ist dann langsam (im Querformat `pr:.5` als ersten Schritt), Wartezeiten
sind unzuverlässig; Läufe nicht parallel, mehrere `shot:`-Schritte in einem Lauf bündeln. Für die Marsbasis `mbt:S` (feste Erzählzeit) statt `seek` und `wait`.

## Modulkarte

Vollständig und aus dem Quelltext erzeugt: [`docs/modulkarte.md`](docs/modulkarte.md). Überblick, Schichten, Datenfluss und „Was ändere ich wo?“:
[`docs/architecture.md`](docs/architecture.md).

| Ordner | Zweck |
| --- | --- |
| `src/main.js` | Einstieg: Stile laden, `init…()` in fester Reihenfolge |
| `src/core/` | `util.js` (Hilfen), `state.js` (gemeinsamer Zustand `S`), `target.js` (`TARGET`, `SITE_CFG`, `MODEL_EXT`), `device.js` (`DESKTOP`) |
| `src/data/` | `bodies.js` (`BODIES`, `SPEEDS`), `voice.js` und `voice.<sprache>.json` (Dauer, Zeitmarken) |
| `src/i18n/` | Sprachwahl, `tr`, `fill`; Wörterbücher `en.json`, `pl.json` |
| `src/orbit/` | `kepler.js`: Bahnmechanik (reine Funktionen) |
| `src/render/` | Renderer, `post.js` (`POST`), `surfaces.js` (`SURF`), `bake.js`, `scene.js`, `scene/` (Sonne, Planeten, Hintergrund, Kleinkörper, Extras), `shaders/` |
| `src/mars/` | `base.js` (`MB`, Marsbasis), `layout.js` (Daten), `shaders.js` |
| `src/audio/` | `engine.js` (`AU`), `tracks.js` (Daten) |
| `src/ui/` | DOM, Layout (`measure`), Eingaben, Leiste, Sprachwahl, Ton- und Vollbildknopf, Dialog „Quellen“ |
| `src/hud/` | Messmarken auf dem Overlay-Canvas, ein Modul je Körper |
| `src/app/` | Tour (`focus`, `setStage`, `narrate`, `narT`, `cue`), Kamera, Auflösungsregler (`govern`), Schleife (`frame`), Start (`boot`) |
| `src/testing/` | Prüfhaken (nur Testmodus) |
| `src/styles/` | CSS je Bereich |
| `tests/`, `tools/shots/` | Unit- und E2E-Tests, Bildschirmfotos |
| `tools/` | `audio/` (Python), `models/`, `artifact/`, `build/`, `docs/`, `shots/` |
| `public/`, `site.json` | statische Dateien (Stimme, Musik, Effekte, Karten, Modelle, Schriften, `.htaccess`); Titel, Adresse, Impressum je Sprache |

**Abhängigkeitsrichtung:** `core`/`orbit` → `data`/`i18n` → `render`/`mars`/`audio` → `ui`/`hud` → `app` → `main.js`. Zyklen zwischen `app`, `hud`, `ui` und
`render` dürfen nur über Funktionen laufen, die erst zur Laufzeit aufgerufen werden, sonst „Zugriff vor der Initialisierung“.

## Was ändere ich wo?

| Aufgabe | Stelle |
| --- | --- |
| Text oder Übersetzung | deutscher Text im Code oder `index.html` (`data-t`); Schlüssel in `src/i18n/en.json` und `pl.json` mitziehen |
| Neuer Halt | `BODIES` in `src/data/bodies.js`, Clip und Zeitmarken, Szene in `src/render/scene/`, Messmarken in `src/hud/`, Übersetzungen, E2E-Test |
| Shader oder Oberfläche eines Planeten | `src/render/shaders/`, `src/render/surfaces.js`, `src/render/scene/planets.js` |
| Marsbasis | `src/mars/` (siehe dortige `AGENTS.md`) |
| Ton oder Effekt | `src/audio/`, Dateien in `public/audio/`, Aufbereitung `tools/audio/` |
| Sprecher neu | `/sprecher-neu`, `docs/produktion.md`; kostet Credits, nur mit Auftrag |
| Messmarken | `src/hud/` |
| Layout, Querformat | `src/ui/layout.js`, `src/styles/layout-wide.css` |
| Auflösung, Leistung | `src/app/governor.js`, `src/core/device.js` |

## Konventionen

- **Gemeinsamer Zustand:** Was mehrere Module schreiben, liegt in `S` (`src/core/state.js`, z. B. `S.surfOn`); Zustand mit klarem Besitzer (`cur`, `stage`,
  `tour`, `dwell` in `app/tour.js`) wird über Funktionen geändert (`focus`, `setStage`, `setTour`). ES-Module erlauben Zuweisungen nur im eigenen Modul.
- **`init…()`-Reihenfolge:** Alles, was beim Laden schon DOM, Renderer oder andere Module braucht, steht in `init…()`-Funktionen, die `src/main.js` in fester Reihenfolge
  aufruft. Neues Modul mit `init…()` an der passenden Stelle in `main.js` eintragen.
- **Bauziel:** `TARGET` (`'site'` oder `'artifact'`) aus `src/core/target.js` zur Bauzeit; nie die Umgebung abfragen. Die Website lädt nichts von fremden Servern, der Bau
  bricht sonst ab (ADR 0003).
- **Testmodus:** `import.meta.env.MODE === 'test'` (`vite build --mode test`) schaltet die Prüfhaken ein (`window.__t`, `__mbt`, `__clk`, `__cam`, `__au`); in der veröffentlichten Seite
  gibt es sie nicht.
- **Handys:** muss flüssig laufen. `PR`/`govern()` bleibt wirksam; teure Dinge hängen an `DESKTOP` oder werden vereinfacht; fehlt eine WebGL-Erweiterung, Rückfall auf den
  einfachen Weg, nie brechen.
- **Größen der Oberfläche** hängen an der CSS-Variable `--u`, Messmarken am selben Faktor `ui`.
- **Sprachen:** Deutsch ist Quellsprache, Übersetzungen mit deutschem Text als Schlüssel (ADR 0004). **Bild folgt Ton:** Einblendungen und Kamerafahrten hängen an `cue(k)` (ADR 0005).
- **three.js bleibt r128** (ADR 0001). Kein Versionssprung nebenbei.
- Jede Quelldatei beginnt mit einem deutschen Kopfkommentar `// ordner/name – Zweck`; die Modulkarte liest ihn. Kleine, gezielte Änderungen; Prettier (`npm run format`) formatiert `src/` und `tests/`; Formatierung nie im selben
  Commit wie eine inhaltliche Änderung (ADR 0007).

## „Fertig“ heißt

1. `npm run lint`, `npm run format:check`, `npm run typecheck`, `npm run test:unit` ohne Fehler.
2. `npm run test:e2e` grün; keine Konsolenfehler, keine fremden Adressen, keine fehlgeschlagenen Anfragen.
3. Sichtprüfung: Bildschirmfotos im Hochformat (390×760) und Querformat (1920×1080) wirklich angesehen und kritisch beurteilt; bei Änderungen am Bau auch `dist/`
   (`npm run build`, `--dist`), bei Texten `--lang=en` und `--lang=pl`.
4. Doku nachgezogen: diese Datei, `docs/`, ADR bei Entscheidungen, `CHANGELOG.md`, Modulkarte (`npm run docs:map`) bei neuen oder umbenannten Modulen.
5. Lizenzen eingetragen (siehe unten).

Ausführlich: [`CONTRIBUTING.md`](CONTRIBUTING.md).

## Fallstricke

- three.js definiert in seinen Shader-Bausteinen Makros wie `r0`, `r1`, `m0` (`cube_uv_reflection_fragment`). Eigene Variablen in `onBeforeCompile` dürfen nicht so heißen, sonst gibt es
  rätselhafte Syntaxfehler.
- Ton startet nur nach einer Nutzereingabe; deshalb beginnt alles mit dem Knopf „Reise starten“.
- `loadModels` (`src/app/boot.js`) blendet `createImageBitmap` während des Parsens aus, damit der `GLTFLoader` r128 Texturen über gewöhnliche Bildelemente lädt; das verhält sich in allen
  Browsern gleich.
- Beschriftungen der Stationen der Marsbasis erscheinen erst, wenn die Station im Bild ist (`baseHUD`).
- Tonemapping macht die Nachbearbeitung `POST` (`src/render/post.js`) für beide Szenen: `MB.render` ruft `POST.render(sc, cam, {lin:1, …})` (ACES, sRGB, Belichtung), die Weltraumszene `POST.render(scene, camera, {…})` ohne `lin` (Werte fürs Display, nur Lichter über 1 laufen weich aus). Ohne HalfFloat-Ziele zeichnet `POST` direkt. `drawHUD` stellt `W`, `H`, `topH`, `botH` nach dem Zeichnen zurück.
- Zeitmarken schreibt `tools/audio/finalize.py`; von Hand nur ändern, wenn auch der Clip dazu passt.
- Artefakt: kein `.glb`; Modelle heißen dort `models/<name>.json` (`tools/models/embed.mjs`, siehe `CLAUDE.md`).
- Git für Windows: `.gitattributes` hält Textdateien auf LF, sonst ändern sich Prüfsummen und Diffs.
- Zyklische Importe: Werte auf oberster Ebene eines Moduls dürfen nicht von einem Zyklus abhängen.

## Medien, Credits und Lizenzen

- **ElevenLabs kostet Credits.** Sprecher, Musik und Effekte nie ohne ausdrücklichen Auftrag erzeugen oder wiederholen. Aufbereiten vorhandener Rohdateien (`tools/audio/`, `work/`) ist kostenlos.
  Ablauf und Aufwand: [`docs/produktion.md`](docs/produktion.md).
- Fremdmaterial nur **gemeinfrei (NASA), CC0 oder CC BY**; jede neue Datei mit Quelle und Lizenz in `public/LIZENZEN.txt` und `docs/produktion.md`. Nichts mit unklarer Herkunft.
- Bilder: JPEG, höchstens 4096 px Kantenlänge, Handys und Ladezeit beachten; Heruntergeladenes zuerst außerhalb des Repos prüfen und verkleinern, dann nach `public/img/`.
- Prozedural gebackene Texturen (`SURF`, `bake`) sind erwünscht, wo es keine gute freie Karte gibt.

## Weiterführend

[`docs/README.md`](docs/README.md) (Inhaltsverzeichnis) · [`docs/architecture.md`](docs/architecture.md) · [`docs/adr/`](docs/adr/README.md) · [`docs/glossar.md`](docs/glossar.md) ·
[`CONTRIBUTING.md`](CONTRIBUTING.md) · `.claude/agents/`, `.claude/commands/` (Claude Code)
