// Prüft die herausgelösten Daten: Zeitmarken der Sprecher-Clips und Wörterbücher.
import { describe, expect, it } from 'vitest';
import de from '../../src/data/voice.de.json';
import en from '../../src/data/voice.en.json';
import pl from '../../src/data/voice.pl.json';
import trEn from '../../src/i18n/en.json';
import trPl from '../../src/i18n/pl.json';

const voices = { de, en, pl };

describe('Zeitmarken (voice.<sprache>.json)', () => {
  for (const [lang, v] of Object.entries(voices)) {
    it(`${lang}: gleiche Clips und Stichworte wie Deutsch, Marken aufsteigend und innerhalb des Clips`, () => {
      expect(Object.keys(v.clips)).toEqual(Object.keys(de.clips));
      for (const [id, c] of Object.entries(v.clips)) {
        expect(Object.keys(c.cues)).toEqual(Object.keys(de.clips[id].cues));
        const t = Object.values(c.cues);
        expect([...t].sort((a, b) => a - b)).toEqual(t);
        for (const x of t) expect(x).toBeLessThan(c.d);
      }
    });
    it(`${lang}: Einblendzeiten der Ozeane und Kontinente`, () => {
      expect(v.geo).toHaveLength(12);
      for (const x of v.geo) expect(x).toBeGreaterThanOrEqual(0);
    });
  }
});

describe('Wörterbücher (i18n/*.json)', () => {
  for (const [lang, t] of Object.entries({ en: trEn, pl: trPl })) {
    it(`${lang}: nur Zeichenketten, Platzhalter {n} bleiben erhalten`, () => {
      for (const [k, v] of Object.entries(t)) {
        expect(typeof v).toBe('string');
        const ph = s => (s.match(/\{\d\}/g) || []).sort();
        expect(ph(v)).toEqual(ph(k));
      }
    });
  }
});
