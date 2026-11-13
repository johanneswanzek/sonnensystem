# ADR 0001: three.js bleibt die technische Basis (r128, jetzt aus npm)

- Status: angenommen
- Datum: 2026-11-13
- Betrifft: gesamte Darstellung (`render/`, `mars/`, `hud/`), Abhängigkeit `three` in `package.json`

## Kontext

Die Seite „Sonnensystem – eine Kamerafahrt“ ist eine animierte 3D-Reise im Browser, die auf Handys und großen
Monitoren laufen muss. Mit der Qualität der bisherigen Bilder war der Auftraggeber nicht zufrieden; gefragt war,
ob die Engine das Problem ist und ob three.js alles abdeckt, was für eine filmische Weltraum-Dokumentation nötig ist.

Benötigt werden: HDR-Rendern mit Bloom und filmischem Tonemapping, eigene Shader (`ShaderMaterial`,
`onBeforeCompile`), PBR-Materialien, weiche Schatten, Instancing, glTF-Modelle, MSAA auf Renderzielen und ein
flüssiger Lauf auf Handys. Dies alles kann three.js r128 mit WebGL2. Die bisherige Bildqualität war durch fehlende
Nachbearbeitung, einfache Shader und wenige echte Karten begrenzt, nicht durch die Engine.

Die Seite hängt außerdem an Eigenheiten von r128 (Farbverwaltung, Lichtstärken, Shader-Bausteine mit `onBeforeCompile`,
`GLTFLoader` r128). Alle Shader und Materialien sind darauf abgestimmt.

## Entscheidung

three.js bleibt. Die Version bleibt vorerst r128 (`three@0.128.0`), kommt aber aus npm
(`import * as THREE from 'three'`) statt als klassisches Skript. Ein Upgrade auf eine aktuelle Version ist ein
eigener, späterer Schritt mit visueller Abnahme (Bildschirmfotos vorher und nachher, Hoch- und Querformat).

## Betrachtete Alternativen

- **(a) Aktuelles three.js (r17x) mit WebGPU und TSL:** nur noch als ES-Module nutzbar; die geänderte Farbverwaltung
  (seit r152) und die geänderten Lichtstärken (seit r155) verlangen, alle Shader und Materialien neu abzustimmen.
  Ein sichtbarer Gewinn allein durch den Wechsel: keiner. Sinnvoll erst für WebGPU-Effekte wie volumetrische Wolken
  oder Compute-Partikel; durch die Modulstruktur (ADR 0002) ist dieser Schritt jetzt vorbereitet.
- **(b) Babylon.js oder PlayCanvas:** vollwertige Engines mit Editor und Physik, größerer Download, komplettes
  Neuschreiben, kein Qualitätsvorteil für eine shadergetriebene Seite.
- **(c) Unity- oder Unreal-Export:** viele Megabyte Ladezeit, schwach auf Handys, kein DOM-Overlay für die
  Messmarken und die Bedienung.
- **(d) Rohes WebGL oder WebGPU:** Szenegraph, glTF-Lader und Schatten müssten selbst gebaut werden.
- **(e) Vorgerendertes Video:** beste Bildqualität, aber keine Interaktion, keine Live-Positionen der Planeten und
  drei Sprachen mal mehrere Formate.

## Folgen

- Positiv: kein Neuschreiben, bestehende Shader und Materialien bleiben gültig; Qualitätsgewinn kommt aus eigenem
  Code (Nachbearbeitung, bessere Shader, Karten), nicht aus dem Engine-Wechsel.
- Negativ: r128 ist alt und bekommt keine Fehlerkorrekturen mehr; manche neueren Möglichkeiten (WebGPU, TSL) stehen nicht zur Verfügung.
- Dependabot ist so eingestellt, dass er `three` nicht anhebt (`.github/dependabot.yml`, Verweis auf dieses Protokoll).
- Offen: Zeitpunkt und Abnahmekriterien für ein Upgrade; erst festzulegen, wenn ein konkreter WebGPU-Effekt gebraucht wird.
