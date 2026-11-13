// @ts-check
// core/target – Ziel des Baus als Bauzeit-Konstanten (gesetzt in vite.config.js per define):
//   TARGET     'site' (eigene Website, auch Entwicklung und Test) oder 'artifact' (claude.ai-Artefakt)
//   SITE_CFG   Angaben aus site.json für die Website (Impressum, Datenschutz, Titel je Sprache); im Artefakt undefined
//   MODEL_EXT  Dateiendung der 3D-Modelle: '.glb' auf der Website, '.json' (glTF mit eingebetteten Daten) im Artefakt
// Von Hand gepflegt (tools/refactor/split.mjs lässt diese Datei stehen).

/* global __TARGET__, __SITE__ */
/** @type {'site' | 'artifact'} */
export const TARGET = __TARGET__;
/** @type {{impressum: string, datenschutz: string, i18n: Record<string, {title?: string, description?: string}>} | undefined} */
export const SITE_CFG = __SITE__;
export const MODEL_EXT = TARGET === 'artifact' ? '.json' : '.glb';
