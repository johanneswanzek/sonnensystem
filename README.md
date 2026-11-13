# Sonnensystem – eine Kamerafahrt

Animierte 3D-Reise durch das Sonnensystem im Browser, mit Sprecher und Musik: die Planeten an ihren für das
Datum berechneten Positionen, ein Flug durch die Wolken der Erde bis in ihren Kern, eine mögliche Kolonie auf
dem Mars und der Asteroidengürtel. Läuft auf dem Handy wie auf einem großen Monitor, in Deutsch, Englisch und Polnisch.

**Live:** https://sonnensystem.johannes-wanzek.de/

![Saturn mit Messmarken](public/vorschau.jpg)

## Schnellstart

Es braucht Node.js ab Version 20 (siehe `.nvmrc`) und Git.

```
npm install
npm run dev
```

Dann http://localhost:8080 öffnen. Vite lädt bei jeder Änderung neu. Ein Doppelklick auf `index.html` reicht nicht, weil Browser
Module, Ton, Karten und Modelle nicht von der Festplatte laden. Python 3 wird nur gebraucht, um Sprecher und Musik aufzubereiten
(`tools/audio/`).

Wer mit einem KI-Assistenten arbeitet: Die Arbeitsanleitung steht in [`AGENTS.md`](AGENTS.md), das Inhaltsverzeichnis der Doku in
[`docs/README.md`](docs/README.md).

## Aufbau

```
index.html               Markup der Seite, Einstieg für Vite
src/                     ES-Module (three.js r128 aus npm, kein Framework); Karte aller Module: docs/modulkarte.md
  main.js                  Start: init…()-Funktionen in fester Reihenfolge
  core/ data/ i18n/ orbit/   Zustand und Hilfen, Himmelskörper und Zeitmarken, Sprachen, Bahnmechanik
  render/ mars/ audio/       Weltraumszene mit Nachbearbeitung, Marsbasis, Ton
  ui/ hud/ app/              Bedienung, Messmarken, Tour/Kamera/Schleife
  styles/ testing/           CSS, Prüfhaken (nur Testmodus)
public/                  wird unverändert veröffentlicht
  voice/, audio/           Sprecher (15 Clips je Sprache; voice/en/, voice/pl/), Musik (drei Stücke) und audio/sfx/ (13 Effekte) als MP3
  img/                     Karten von Erde, Mars, Jupiter, Saturn, Neptun und den Marsmonden
  models/                  3D-Modelle (GLB)
  vendor/fonts/            Schriften (lokal, nichts kommt von fremden Servern)
  LIZENZEN.txt, .htaccess  Quellen und Lizenztexte; Einstellungen für einen Apache-Webspace
site.json                Adresse, Titel, Beschreibung, Verweise auf Impressum und Datenschutz
tests/                   unit/ (Vitest) und e2e/ (Playwright)
tools/                   audio/ (Python, Sprecher und Musik), models/, artifact/ (Bau der Artefakt-Fassung), build/, shots/, docs/
docs/                    architecture.md, modulkarte.md, adr/, glossar.md, produktion.md, sprechertext.<Sprache>.json
.github/                 Workflows (CI, Veröffentlichung), Vorlagen, CODEOWNERS, Dependabot
AGENTS.md, CLAUDE.md, .claude/   Anleitung für KI-Agenten
```

## Bauen und veröffentlichen

```
npm run build            # Website -> dist/
npm run preview          # dist/ lokal ansehen
npm run build:artifact   # Fassung als claude.ai-Artefakt -> dist-artifact/
```

**GitHub Pages:** Ein Push auf `main` genügt. Die Action in `.github/workflows/pages.yml` baut mit Node (`npm ci`, `npm run build`) und
veröffentlicht `dist/`. In den Repo-Einstellungen unter *Pages* steht als Quelle „GitHub Actions“ und als eigene Domain
`sonnensystem.johannes-wanzek.de`. Der Bau bricht ab, wenn im Ergebnis eine Adresse eines fremden Servers steht.

**Domain:** Bei STRATO zeigt die Subdomain per CNAME auf `johanneswanzek.github.io`
(Domainverwaltung → Subdomain → DNS → CNAME-Record). Das Zertifikat für HTTPS stellt GitHub aus.

**Eigener Webspace statt GitHub Pages:** `npm run build` ausführen und den Inhalt von `dist/` per SFTP hochladen. Die Seite besteht nur aus
statischen Dateien; die `.htaccess` für einen Apache-Webspace (z. B. STRATO) liegt in `public/` und damit in `dist/`.

**Einstellungen** stehen in `site.json`. Wer dort `impressum` und `datenschutz` einträgt (Adresse oder Pfad),
bekommt die Verweise im Dialog „Quellen“ (letzter Knopf der Leiste unten).

**Artefakt:** `npm run build:artifact` schreibt `dist-artifact/sonnensystem.html` (ein Fragment) und `dist-artifact/begleitdateien.txt`; Einzelheiten in
[`CLAUDE.md`](CLAUDE.md) und ADR 0003.

## Sprachen

Die Seite gibt es in Deutsch, Englisch und Polnisch. Beim ersten Besuch entscheidet die Sprache des Browsers
(alles andere als Deutsch oder Polnisch bekommt Englisch), danach die letzte Wahl über den Knopf oben rechts.
Eine Adresse mit `?lang=de`, `?lang=en` oder `?lang=pl` legt die Sprache fest und eignet sich zum Verlinken.

Alle Texte stehen deutsch im Quelltext; die Übersetzungen liegen in `src/i18n/en.json` und `src/i18n/pl.json` (Schlüssel ist der deutsche Text).
Titel und Beschreibung der Seite je Sprache stehen in `site.json` unter `i18n`. Hintergrund: [`docs/adr/0004-mehrsprachigkeit.md`](docs/adr/0004-mehrsprachigkeit.md).

## Bedienung

| Eingabe | Wirkung |
| --- | --- |
| Leertaste | Tour starten und anhalten |
| Pfeil links, Pfeil rechts | voriger und nächster Halt |
| F | Vollbild |
| M | Ton: Musik und Sprecher, nur Sprecher, aus |
| Ziehen, Mausrad oder zwei Finger | Ansicht drehen und zoomen |

## Testen

```
npm run lint && npm run typecheck && npm run test:unit      # Prüfungen ohne Browser (Kepler, Übersetzungen, Zeitmarken, Bau)
npm run test:e2e                                            # E2E-Suite (Playwright): Testseite mit Prüfhaken und dist/
npm run shots -- 390 760 start focus:8 wait:8000 shot:saturn-handy
```

**E2E-Suite** (`tests/e2e/`): prüft alle Abläufe und Knöpfe der Seite (Laden, Start mit und ohne Ton, Tour, Navigation, Zeitraffer, Ton, Musik,
Vollbild, Sprachen, Dialog „Quellen“, Erde und Mars, Layout, Robustheit ohne WebGL, Bau). Sie prüft Zustände, DOM, ARIA, Netz und Konsole,
keine Bildvergleiche. Jede Anfrage an eine fremde Adresse, jede fehlgeschlagene Anfrage und jeder Konsolenfehler gilt als Fehler. Einmalig
`npx playwright install --with-deps chromium`. Eine Datei: `npm run test:e2e -- tests/e2e/tour.spec.js`; nur `dist/`: `npm run test:e2e:dist`.
Ohne Grafikkarte `SOFTWARE_GL=1` setzen (deutlich langsamer, die Zeitgrenzen wachsen mit); `CHROME_PATH` nimmt einen vorhandenen Chrome.

**Bildschirmfotos** (`tools/shots/run.js`, `npm run shots`): legt Bilder nach `.shots/`.

```
npm run shots -- 390 760 start focus:8 wait:8000 shot:saturn-handy
npm run shots -- 1920 1080 start focus:5 wait:5000 stage:1 wait:8000 mbt:45 wait:2000 shot:mars-landung
npm run shots -- --dist 1280 720 go wait:6000 shot:start      # prüft dist/ so, wie es veröffentlicht wird (vorher npm run build)
npm run shots -- --lang=pl 390 760 start focus:4 wait:5000 shot:erde-polnisch
```

Alle Schritte stehen im Kopf von `tools/shots/run.js`. Jeder Push läuft durch die CI (`.github/workflows/ci.yml`).

## Quellen und Lizenzen

- **Karten und 3D-Modelle:** NASA (Blue Marble, Nachtlichter, Mars, Jupiter, Saturn, Neptun, Phobos, Deimos; Modelle aus „NASA 3D Resources“).
  Die NASA hat dieses Projekt weder geprüft noch unterstützt sie es.
- **Sprecher, Musik und Effekte:** mit künstlicher Intelligenz erzeugt bei ElevenLabs (elevenlabs.io), die Musik mit
  Eleven Music, die Effekte mit Sound Effects.
- **Technik:** three.js r128 (MIT, aus npm). Schriften: Instrument Serif, IBM Plex (SIL Open Font License).

Die vollständigen Angaben und Lizenztexte stehen in [`public/LIZENZEN.txt`](public/LIZENZEN.txt), Einzelheiten
zur Entstehung in [`docs/produktion.md`](docs/produktion.md).

Für den eigenen Quelltext dieses Repos ist bisher keine Lizenz festgelegt.

### Vor einer Veröffentlichung zu prüfen (keine Rechtsberatung)

- **ElevenLabs:** Stimme und Musik dürfen kommerziell nur genutzt werden, wenn sie in einem bezahlten Tarif
  erzeugt wurden. Im kostenlosen Tarif gilt: nicht kommerziell und mit Nennung von „elevenlabs.io“ (für die
  Musik „Eleven Music“) im Titel.
- **NASA-Logo:** Das Wohnmodul trägt in seiner Textur das NASA-Logo, so wie die NASA das Modell
  veröffentlicht hat. Das Logo ist gesondert geschützt; für eine werbliche Nutzung wäre das zu klären.
- **Impressum und Datenschutz:** Für öffentlich erreichbare Seiten in Deutschland in der Regel nötig, sobald
  die Seite nicht rein privat ist. Die Seite selbst setzt keine Cookies und bindet keine fremden Dienste ein.
