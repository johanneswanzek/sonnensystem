# Aus einem Musikstück eine nahtlose Schleife bauen: Tempo und Schlagraster bestimmen, zwei ähnlich klingende Stellen im Abstand ganzer
# Taktgruppen suchen, davor überblenden. Ausgabe: MP3 und die Schleifenpunkte als JSON.
#
#   python tools/audio/loop.py [--from=S] [--end=S] [--bars=32,24,16] <Quelle.mp3> <Ziel.mp3> [<dB> <bis Sekunde a> <ausgelaufen bei Sekunde b>]
#
# Wahlfrei: --from=S frühester Schleifenanfang, --end=S Quelle dort abschneiden (wenn das Stück vorher ausläuft),
# --bars=… erlaubte Schleifenlängen in Takten (Vorgabe 64,56,48,40,32,24,16).
#
# Die ausgegebenen Werte (loop0, loop1, beat, grid0) gehören in die Konstante MUSIC in src/audio/tracks.js (für Zusatzstücke: TRACKS).
# Die aktuelle Musik entstand mit: loop.py work/el/music_b.mp3 public/audio/music.mp3 8 24 31
# Braucht ffmpeg im Pfad und: pip install numpy scipy soundfile pyloudnorm
import os, sys, json, subprocess, tempfile, numpy as np, soundfile as sf
from scipy.signal import stft, resample_poly
import pyloudnorm as pyln
OPT = dict(a[2:].split('=', 1) for a in sys.argv[1:] if a.startswith('--') and '=' in a)
sys.argv = [a for a in sys.argv if not a.startswith('--')]
src, dst = sys.argv[1], sys.argv[2]
TM, TO = (os.path.join(tempfile.gettempdir(), n) for n in ('_sonnensystem_m.wav', '_sonnensystem_o.wav'))
subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-i', src, '-ar', '44100', '-ac', '2', TM], check=True)
x, sr = sf.read(TM, dtype='float32')
if 'end' in OPT: x = x[:int(float(OPT['end']) * sr)]
if len(sys.argv) > 5:      # leisen Auftakt anheben: Pegel in dB bis Sekunde a, bis Sekunde b läuft die Anhebung aus
    db, ta, tb = float(sys.argv[3]), float(sys.argv[4]), float(sys.argv[5]); tt = np.arange(len(x)) / sr
    x = (x * (10 ** (db * np.clip((tb - tt) / (tb - ta), 0, 1) / 20))[:, None]).astype(np.float32)
mono = x.mean(axis=1); dur = len(mono) / sr
# Einsatzkurve: Zuwachs der Energie je Frequenzband, tiefe Bänder (Kick) stärker gewichtet
m = resample_poly(mono, 1, 4).astype(np.float32); sr2 = sr / 4; hop = 64
f, t, Z = stft(m, fs=sr2, nperseg=512, noverlap=512 - hop, boundary=None); S = np.log1p(40 * np.abs(Z))
flux = np.maximum(0, np.diff(S, axis=1)); w = np.where(f < 180, 3.0, 1.0)[:, None]
env = (flux * w).sum(axis=0); env = env - np.convolve(env, np.ones(43) / 43, mode='same'); env = np.maximum(env, 0); fps = sr2 / hop
# Tempo und Phase: Kamm aus Schlägen über die ganze Länge, feines Raster
best = (0, 120, 0)
for bpm in np.arange(100, 140.001, 0.02):
    per = 60 / bpm * fps
    for ph in np.linspace(0, per, 24, endpoint=False):
        idx = np.round(ph + per * np.arange(int((len(env) - ph) / per))).astype(int)
        sc = env[idx].mean()
        if sc > best[0]: best = (sc, bpm, ph / fps)
_, bpm, phase = best; beat = 60 / bpm
# Feinabgleich der Phase
cands = np.linspace(phase - beat / 24, phase + beat / 24, 41)
def comb(ph):
    idx = np.round((ph + beat * np.arange(int((dur - ph - .1) / beat))) * fps).astype(int); idx = idx[(idx >= 0) & (idx < len(env))]; return env[idx].mean()
phase = float(max(cands, key=comb)) % beat
# Klangbild je Schlag (grobes Spektrum), um ähnliche Stellen zu finden
nb = int((dur - phase) / beat) - 1
def feat(k):
    a = int((phase + k * beat) * fps); b = int((phase + (k + 1) * beat) * fps); return S[:, a:b].mean(axis=1)
F = np.array([feat(k) for k in range(nb)]); F = F - F.mean(axis=0); F /= np.linalg.norm(F, axis=1, keepdims=True) + 1e-9
def sim(a, b, n=8):      # Ähnlichkeit der n Schläge vor und nach zwei Stellen
    ks = [k for k in range(-n, n) if 0 <= a + k < nb and 0 <= b + k < nb]
    return float(np.mean([F[a + k] @ F[b + k] for k in ks]))
opts = []
for bars in [int(b) for b in OPT.get('bars', '64,56,48,40,32,24,16').split(',')]:
    L = bars * 4
    for a in range(16, nb - L - 12, 4):
        if phase + a * beat < max(6, float(OPT.get('from', 0))) or phase + (a + L) * beat > dur - 5: continue
        opts.append((sim(a, a + L) + .0015 * bars, bars, a))
opts.sort(reverse=True); score, bars, a = opts[0]
t0 = phase + a * beat; t1 = t0 + bars * 4 * beat
# Die halbe Sekunde vor dem Schleifenende in die Stelle vor dem Schleifenanfang überblenden; dahinter folgt, was auch auf den Anfang folgt
i0, i1, n = int(round(t0 * sr)), int(round(t1 * sr)), int(.5 * sr)
y = x[:i1].copy(); k = np.linspace(0, 1, n)[:, None]
y[i1 - n:i1] = x[i1 - n:i1] * np.cos(k * np.pi / 2) + x[i0 - n:i0] * np.sin(k * np.pi / 2)
y = np.concatenate([y, x[i0:i0 + int(1.5 * sr)]])
meter = pyln.Meter(sr); y = pyln.normalize.loudness(y, meter.integrated_loudness(y), -16.0); pk = np.abs(y).max()
if pk > .97: y *= .97 / pk
sf.write(TO, y, sr)
subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-i', TO, '-codec:a', 'libmp3lame', '-b:a', '128k', dst], check=True)
# Tonart grob: stärkste Tonklasse im Bass und Dur/Moll-Profil
f2, t2, Z2 = stft(m, fs=sr2, nperseg=8192, noverlap=4096, boundary=None); P = np.abs(Z2).mean(axis=1); chroma = np.zeros(12)
for fi, p in zip(f2, P):
    if 60 < fi < 2000: chroma[int(round(12 * np.log2(fi / 440) + 69)) % 12] += p
maj = np.array([6.35, 2.23, 3.48, 2.33, 4.38, 4.09, 2.52, 5.19, 2.39, 3.66, 2.29, 2.88]); mnr = np.array([6.33, 2.68, 3.52, 5.38, 2.60, 3.53, 2.54, 4.75, 3.98, 2.69, 3.34, 3.17])
keys = [(np.corrcoef(np.roll(pr, k), chroma)[0, 1], k, nm) for k in range(12) for pr, nm in ((maj, 'Dur'), (mnr, 'Moll'))]; kc, kk, kn = max(keys)
names = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'H']
print(json.dumps({'d': round(len(y) / sr, 3), 'bpm': round(float(bpm), 2), 'beat': round(float(beat), 5), 'grid0': round(float(phase), 4), 'loop0': round(float(t0), 4), 'loop1': round(float(t1), 4),
                  'bars': bars, 'sim': round(score, 3), 'key': names[kk] + ' ' + kn, 'keypc': kk, 'minor': kn == 'Moll', 'lufs': -16}))
