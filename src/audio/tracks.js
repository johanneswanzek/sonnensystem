// audio/tracks – Tondaten: Hauptstück (MUSIC, BEAT), Zusatzstücke je Halt (TRACKS), Effekt-Samples (SFX).
// Exporte: BEAT, MUSIC, SFX, TRACKS

// Musik: Hauptstück mit ruhigem Auftakt, danach läuft der Mittelteil als nahtlose Schleife (32 Takte bei 122 BPM).
// loop0 und loop1 sind die Schleifenpunkte in Sekunden, grid0 ist der erste Schlag, beat die Schlaglänge.
const MUSIC = {file:'audio/music.mp3', loop0:51.6048, loop1:114.5659, beat:0.49188, grid0:0.4488}, BEAT = MUSIC.beat;
// Zusatzstücke für Erde und Mars (122 BPM, a-Moll wie das Hauptstück); gain gleicht die Lautheit an das Hauptstück an
const TRACKS = {
  earth:{file:'audio/music-earth.mp3', loop0:20.1252, loop1:67.3461, grid0:0.4499, gain:1},
  mars:{file:'audio/music-mars.mp3', loop0:83.0884, loop1:114.569, grid0:0.4519, gain:.91}
};
// Effekte: rev = Hallanteil; loop = [Anfang, Ende] der Schleife in Sekunden (aus tools/audio/sfx.py, mit je 0,15 s Vorlauf)
const SFX = {whoosh:{rev:.25}, arrive:{rev:.3}, stage:{rev:.2}, dive:{rev:.2}, cut:{rev:.2}, lander:{rev:.12}, belt:{rev:.3}, rings:{rev:.5}, start:{rev:.3}, ui_tick:{rev:0},
  sun:{loop:[.15,9.15]}, mars_wind:{loop:[.15,10.95]}, base_hum:{loop:[.15,9.35]}};

export { BEAT, MUSIC, SFX, TRACKS };
