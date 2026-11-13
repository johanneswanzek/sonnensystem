// @ts-check
// core/state – Gemeinsamer veränderlicher Zustand: Variablen, die mehrere Module schreiben (ES-Module erlauben
// Zuweisungen nur im eigenen Modul). Liste in tools/refactor/map.mjs (state); Anfangswerte aus dem Monolithen,
// Werte, die erst beim Start feststehen, setzen die init…()-Funktionen der Besitzer-Module.
// Erzeugt von tools/refactor/split.mjs – bis zum Ende des Umbaus nicht von Hand ändern.

/** @type {Record<string, any>} */
export const S = {
  sunMat: undefined,
  belt: undefined,
  kuiper: undefined,
  pulse: undefined,
  halleyTail: undefined,
  moonTex: undefined,
  milkyTex: null,
  W: 1,
  H: 1,
  topH: 0,
  botH: 0,
  shiftCur: 0,
  topL: 0,
  narStart: 1e15,
  cloudOp: 1,
  roll: 0,
  tStage: 0,
  shiftX: 0,
  shiftXT: 0,
  surfOn: false,
  veil: 0,
  mbT: -3,
  grp: 0,
  grpA: 0,
  grpT: 0,
  pulseT: 0,
  pulseR: 0,
  pulseA: 0,
  pulseHit: null,
  pulseHitT: 9,
  soundMode: 2,
  plate: .36,
  last: 0,
};
