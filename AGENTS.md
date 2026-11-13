# AGENTS.md – Arbeitsanleitung für KI-Agenten und Entwickler

Werkzeugneutrale Hauptanleitung für das Repo `johanneswanzek/sonnensystem` (Claude Code, Copilot, Codex, Cursor u. a.).
Sprache von Oberfläche (Quelltext), Kommentaren, Doku und Commit-Texten ist Deutsch.

> Entwurf, Stand Phase 1: Befehle und Modulkarte beschreiben die Zielstruktur aus ADR 0002. Die Modulkarte ist
> noch ein Platzhalter und wird nach dem Merge der Aufteilung ausgefüllt.

## Projekt in drei Sätzen

Animierte 3D-Reise durch das Sonnensystem im Browser (three.js r128, WebGL2) mit Sprecher und Musik in Deutsch, Englisch und
Polnisch. Live unter https://sonnensystem.johannes-wanzek.de/ (GitHub Pages, Deploy per Action bei Push auf `main`); dieselbe
Quelle wird zusätzlich als claude.ai-Artefakt gebaut. Die Seite läuft auf Handys wie auf großen Monitoren; das Bild folgt dem Ton.

## Befehle

```
npm install                      # einmalig; dazu: npx playwright install --with-deps chromium
npm run dev                      # Entwicklungsserver
npm run build                    # Website nach dist/ (bricht bei fremden Adressen ab)
npm run preview                  # gebaute Website ansehen
npm run build:artifact           # claude.ai-Artefakt nach dist-artifact/
npm run lint                     # ESLint
npm run typecheck                # JSDoc-Typen (tsc)
npm run test:unit                # Vitest
npm run test:e2e                 # Playwright
npm run shots -- 390 760 start focus:5 wait:5000 stage:1 wait:8000 mbt:45 wait:2000 shot:landung
```

Bis die Umstellung gemergt ist, gelten die alten Befehle aus `CLAUDE.md` (`python tools/serve.py`, `python tools/build.py`,
`node tools/test/run.js …`). Python wird nur noch für `tools/audio/` gebraucht.

Ohne Grafikkarte `SOFTWARE_GL=1` setzen: jedes Bild ist dann langsam (im Querformat `pr:.5` als ersten Schritt nehmen), und
Wartezeiten sind unzuverlässig. Für die Marsbasis deshalb mit `mbt:S` eine feste Erzählzeit setzen statt `seek` und `wait`.
Bildschirmfotos landen in `.test/shots/`; wenige, gebündelte Läufe, nicht parallel.

## Modulkarte

<!-- PLATZHALTER Phase 2: Modulkarte nach der tatsächlichen Struktur von src/ eintragen
     (Ordner, Zweck, wichtigste Exporte, Abhängigkeitsrichtung). Zielbild in ADR 0002. -->

Bis dahin: Die Seite steht in `src/sonnensystem.html`, gegliedert durch Marken der Form `/* ---------- Name ---------- */`
(Sprache, Daten, DOM, Ton, Oberflächen, Bahnmechanik, Shader/Szene, Mars-Basis, Zustand, Eingaben, Messmarken, Schleife, Start).
Begriffe deutsch ↔ Bezeichner: [`docs/glossar.md`](docs/glossar.md).

## Grundsätze

- **Verhalten bleibt gleich**, wenn eine Änderung nur Struktur betrifft (kein anderes Aussehen, kein anderer Ton).
- **Eine Quelle, zwei Auslieferungen:** Website und claude.ai-Artefakt entstehen aus derselben Quelle (ADR 0003). Die Website lädt nichts
  von fremden Servern; der Bau bricht ab, wenn doch eine fremde Adresse im Ergebnis steht.
- **Handys:** Muss flüssig laufen. Der Auflösungsregler `PR`/`govern()` bleibt wirksam; teure Dinge hängen an `DESKTOP` oder
  werden auf Handys vereinfacht. Fehlt eine WebGL-Erweiterung, darf die Seite nicht brechen (Rückfall auf den einfachen Weg).
- **Größen der Oberfläche** hängen an der CSS-Variable `--u`, Messmarken auf dem Overlay-Canvas am selben Faktor `ui`.
- **Sprachen:** Texte stehen deutsch im Programm; wer einen sichtbaren Text ändert oder ergänzt, zieht Englisch und Polnisch mit
  (ADR 0004). Texte im Markup tragen `data-t`; `aria-label` wird immer übersetzt.
- **Bild folgt Ton:** Einblendungen und Kamerafahrten hängen an Zeitmarken (`cue`), nicht an festen Zeiten (ADR 0005).
- **three.js bleibt r128** (ADR 0001); kein Versionssprung nebenbei.
- Kleine, gezielte Änderungen. Keine Umformatierung bestehenden Codes im selben Commit wie eine inhaltliche Änderung.

## „Fertig“ heißt

1. `npm run lint`, `npm run typecheck`, `npm run test:unit` ohne Fehler.
2. `npm run test:e2e` grün; keine Konsolenfehler, keine fremden Adressen, keine fehlgeschlagenen Anfragen.
3. Sichtprüfung: Bildschirmfotos im Hochformat (390×760) und Querformat (1920×1080) wirklich angesehen und kritisch beurteilt.
   Bei Änderungen am Bau zusätzlich die gebaute Seite; bei Texten zusätzlich `?lang=en` und `?lang=pl`.
4. Doku nachgezogen (diese Datei, `CLAUDE.md`, `docs/`, ADR bei Entscheidungen, `CHANGELOG.md`).
5. Lizenzen eingetragen (siehe unten).

Ausführlich: [`CONTRIBUTING.md`](CONTRIBUTING.md).

## Fallstricke

- three.js definiert in seinen Shader-Bausteinen Makros wie `r0`, `r1`, `m0` (`cube_uv_reflection_fragment`). Eigene Variablen
  in `onBeforeCompile` dürfen nicht so heißen, sonst gibt es rätselhafte Syntaxfehler.
- Ton startet nur nach einer Nutzereingabe; deshalb beginnt alles mit dem Knopf „Reise starten“.
- `loadModels` blendet `createImageBitmap` während des Parsens aus, damit der `GLTFLoader` r128 Texturen über gewöhnliche
  Bildelemente lädt; das verhält sich in allen Browsern gleich.
- Beschriftungen der Stationen auf der Marsbasis erscheinen erst, wenn die Station im Bild ist (`baseHUD`).
- Tonemapping (ACES, sRGB-Ausgabe) gilt nur für die Marsszene; `MB.render` setzt es und stellt es zurück.
- `drawHUD` rechnet in Einheiten von `ui` und stellt `W`, `H`, `topH`, `botH` nach dem Zeichnen zurück.
- Zeitmarken (`VOICE_*`, `GEO_T_*`) schreibt `tools/audio/finalize.py`; von Hand nur ändern, wenn auch der Clip dazu passt.
- Git für Windows: `.gitattributes` hält Textdateien auf LF, sonst ändern sich Prüfsummen und Diffs.
- Artefakt-Fassung: Artefakte liefern kein `.glb` aus; Modelle heißen dort `models/<name>.json` (`tools/models/embed.mjs`).

## Medien, Credits und Lizenzen

- **ElevenLabs kostet Credits.** Sprecher und Musik nie ohne ausdrücklichen Auftrag erzeugen oder wiederholen. Aufbereiten
  vorhandener Rohdateien (`tools/audio/`) ist kostenlos. Ablauf: [`docs/produktion.md`](docs/produktion.md).
- Neues Fremdmaterial nur **gemeinfrei (NASA), CC0 oder CC BY**. Jede neue Datei mit Quelle und Lizenz in
  `public/LIZENZEN.txt` und `docs/produktion.md` eintragen. Nichts mit unklarer Herkunft.
- Bilder: JPEG, höchstens 4096 px Kantenlänge, auf Handys und Ladezeit achten. Heruntergeladenes erst außerhalb des Repos prüfen
  und verkleinern, dann nach `public/img/` übernehmen.
- Prozedural auf der Grafikkarte gebackene Texturen (`SURF`, `bake`) sind erwünscht, wo es keine gute freie Karte gibt.

## Weiterführend

- Entscheidungen: [`docs/adr/`](docs/adr/README.md)
- Inhaltsverzeichnis der Doku: [`docs/README.md`](docs/README.md)
- Beitragen, Commits, Pull Requests: [`CONTRIBUTING.md`](CONTRIBUTING.md)
- Unteragenten und Befehle für Claude Code: `.claude/agents/`, `.claude/commands/`
