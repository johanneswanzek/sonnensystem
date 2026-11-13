// Bauprüfung „keine fremde Adresse“ (tools/build/check-foreign.mjs): findet fremde Server, lässt erlaubte stehen.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { foreignUrls } from '../../tools/build/check-foreign.mjs';

const tmp = files => {
  const d = fs.mkdtempSync(path.join(os.tmpdir(), 'fremd-'));
  for (const [f, t] of Object.entries(files)) { fs.mkdirSync(path.dirname(path.join(d, f)), { recursive: true }); fs.writeFileSync(path.join(d, f), t); }
  return d;
};

describe('Prüfung auf fremde Adressen', () => {
  it('meldet Schriften und Bibliotheken von fremden Servern', () => {
    const d = tmp({ 'index.html': '<link href="https://fonts.googleapis.com/css2?family=X">', 'assets/a.js': 'load("https://cdn.jsdelivr.net/npm/three")' });
    expect(foreignUrls(d)).toHaveLength(2);
  });
  it('lässt Namensräume, die eigene Adresse und Binärdateien stehen', () => {
    const d = tmp({ 'index.html': '<svg xmlns="http://www.w3.org/2000/svg"></svg><link rel="canonical" href="https://sonnensystem.johannes-wanzek.de/">', 'img/a.jpg': 'https://example.com' });
    expect(foreignUrls(d)).toEqual([]);
  });
  it('das gebaute dist/ ist sauber (wenn vorhanden)', () => {
    const d = path.resolve(import.meta.dirname, '../../dist');
    if (!fs.existsSync(d)) return;
    expect(foreignUrls(d)).toEqual([]);
  });
});
