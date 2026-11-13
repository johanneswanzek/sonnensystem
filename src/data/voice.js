// data/voice – Sprecher-Clips je Sprache: Dauer und Zeitmarken (voice.<sprache>.json, geschrieben von tools/audio/finalize.py).
// Exporte: VOICE; initVoice
// Hängt ab von: i18n/index.js

import { LANG } from '../i18n/index.js';
import voiceDe from './voice.de.json';
import voiceEn from './voice.en.json';
import voicePl from './voice.pl.json';

// Belegt in initVoice() (Reihenfolge des Starts, siehe main.js)
let VOICE;

// Sprecheraufnahmen je Sprache: Länge d in Sekunden und Marker, zu denen Einblendungen und Kamerafahrten starten (geschrieben von tools/audio/finalize.py)
const VOICE_DE = voiceDe.clips;
const VOICE_EN = voiceEn.clips;
const VOICE_PL = voicePl.clips;

export function initVoice() {
  VOICE = { de: VOICE_DE, en: VOICE_EN, pl: VOICE_PL }[LANG];
}

export { VOICE };
