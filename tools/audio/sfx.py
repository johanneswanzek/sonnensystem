# Effekte aus den Rohaufnahmen von ElevenLabs (work/el/sfx/<name>.mp3) für die Seite aufbereiten.
#
#   python tools/audio/sfx.py [Name ...]        ohne Namen: alle; Ausgabe: public/audio/sfx/<name>.mp3
#
# Je Effekt: Stille an den Rändern kürzen, kurze Ein- und Ausblendung gegen Knackser, Lautheit auf einen Zielwert
# (BS.1770, siehe CFG) bringen, Spitzen auf höchstens -1,5 dBFS begrenzen (nach dem MP3-Kodieren bleibt sie unter -1 dBFS).
# Die Zielwerte sind so gewählt, dass im Programm fast überall Verstärkung 1 gilt; die Seite mischt nur noch den Bus.
# Schleifen (sun, mars_wind, base_hum) werden zyklisch gebaut: Der Schluss wird über `x` Sekunden in den Anfang
# überblendet, davor und dahinter steht je `LEAD` Sekunden der zyklischen Fortsetzung. Dadurch ist jedes Fenster von
# der Länge L ab einer Stelle in [0, LEAD] eine nahtlose Schleife, auch wenn ein Dekoder den MP3-Rand verschieden
# beschneidet. Im Programm: loopStart = LEAD, loopEnd = LEAD + L (die Werte druckt dieses Skript).
# Braucht ffmpeg im Pfad und: pip install numpy soundfile pyloudnorm
import os, sys, json, subprocess, tempfile, numpy as np, soundfile as sf
import pyloudnorm as pyln

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..')
SRC = os.path.join(ROOT, 'work', 'el', 'sfx')
DST = os.path.join(ROOT, 'public', 'audio', 'sfx')
LEAD = .15          # Sekunden zyklische Fortsetzung vor und hinter der Schleife
SR = 44100

# lufs: Ziel (integriert) | peak: Ziel der Spitze in dBFS statt Lautheit | fin/fout: Ein-/Ausblendung in s | loop: Überblendung x in s
# mono: Mischung auf einen Kanal | kbps: MP3-Rate | cut: (Anfang, Ende) in Sekunden vom Rohmaterial nehmen
CFG = {
    'whoosh':    dict(lufs=-17, fin=.004, fout=.35, kbps=112),
    'arrive':    dict(lufs=-17, fin=.002, fout=.4,  kbps=112),
    'stage':     dict(lufs=-19, fin=.01,  fout=.18, kbps=112),
    'dive':      dict(lufs=-18, fin=.03,  fout=.5,  kbps=112),
    'cut':       dict(lufs=-17, fin=.01,  fout=.4,  kbps=112),
    'lander':    dict(lufs=-18, fin=.01,  fout=.35, kbps=112),
    'belt':      dict(lufs=-20, fin=.01,  fout=.5,  kbps=112),
    'rings':     dict(lufs=-24, fin=.01,  fout=.5,  kbps=112),
    'start':     dict(lufs=-17, fin=.004, fout=.5,  kbps=112),
    'ui_tick':   dict(peak=-24, fin=.0005, fout=.08, mono=True, kbps=96, cut=(0, .32)),
    'sun':       dict(lufs=-22, loop=1.0, kbps=112),
    'mars_wind': dict(lufs=-25, loop=1.2, kbps=112),
    'base_hum':  dict(lufs=-31, loop=.8, mono=True, kbps=96),
}


def load(path):
    t = os.path.join(tempfile.gettempdir(), '_sonnensystem_sfx.wav')
    subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-i', path, '-ar', str(SR), '-ac', '2', t], check=True)
    x, sr = sf.read(t, dtype='float32')
    return x


def trim(x, thr=-60, keep_head=.003, keep_tail=.04):
    e = np.abs(x).max(axis=1); idx = np.where(e > 10 ** (thr / 20))[0]
    if len(idx) == 0: return x
    a = max(0, idx[0] - int(keep_head * SR)); b = min(len(x), idx[-1] + int(keep_tail * SR))
    return x[a:b]


def fade(x, fin, fout):
    x = x.copy(); n = len(x)
    if fin > 0:
        k = min(n, int(fin * SR)); x[:k] *= np.linspace(0, 1, k)[:, None] ** 2
    if fout > 0:
        k = min(n, int(fout * SR)); x[n - k:] *= (np.linspace(1, 0, k)[:, None]) ** 2
    return x


def cyclic(x, xs):
    """Schleife der Länge L = N - xs mit Überblendung Schluss -> Anfang (gleiche Leistung)."""
    n = len(x); xl = int(xs * SR); L = n - xl
    p = x[:L].copy(); k = np.linspace(0, 1, xl)[:, None]
    p[:xl] = x[:xl] * np.sin(k * np.pi / 2) + x[L:L + xl] * np.cos(k * np.pi / 2)
    return p


def encode(y, dst, kbps, mono):
    t = os.path.join(tempfile.gettempdir(), '_sonnensystem_sfx_o.wav')
    sf.write(t, y, SR)
    subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-i', t, '-ac', '1' if mono else '2', '-codec:a', 'libmp3lame', '-b:a', '%dk' % kbps, dst], check=True)


def main():
    os.makedirs(DST, exist_ok=True)
    names = [a for a in sys.argv[1:]] or list(CFG)
    meter = pyln.Meter(SR); rows = []
    for nm in names:
        c = CFG[nm]; x = load(os.path.join(SRC, nm + '.mp3'))
        if c.get('mono'): x = np.repeat(x.mean(axis=1, keepdims=True), 2, axis=1)
        loop = None
        if 'cut' in c: x = x[int(c['cut'][0] * SR):int(c['cut'][1] * SR)]
        if 'loop' in c:
            p = cyclic(x, c['loop']); L = len(p); body = p
        else:
            x = fade(trim(x), c.get('fin', .005), c.get('fout', .2)); body = x
        if 'peak' in c:
            g = 10 ** ((c['peak'] - 20 * np.log10(np.abs(body).max())) / 20)
        else:
            g = 10 ** ((c['lufs'] - meter.integrated_loudness(body)) / 20)
        pk = np.abs(body).max() * g
        if pk > 10 ** (-1.5 / 20): g *= 10 ** (-1.5 / 20) / pk
        if 'loop' in c:
            lead = int(LEAD * SR); y = np.concatenate([p[-lead:], p, p[:lead]]) * g
            loop = {'lead': LEAD, 'len': round(L / SR, 4)}
        else:
            y = body * g
        dst = os.path.join(DST, nm + '.mp3'); encode(y, dst, c['kbps'], c.get('mono'))
        # Kontrolle am fertigen MP3
        z = load(dst); lu = meter.integrated_loudness(z) if len(z) > .5 * SR else float('nan')
        row = {'name': nm, 'dur': round(len(y) / SR, 2), 'kB': round(os.path.getsize(dst) / 1024), 'lufs': round(float(lu), 1),
               'peak': round(float(20 * np.log10(np.abs(z).max())), 1), 'loop': loop}
        if loop:    # Naht: Sprung beim Übergang Ende -> Anfang im Verhältnis zum üblichen Abstand benachbarter Werte
            b = y[lead:lead + L, 0]; jump = abs(b[0] - b[-1]); typ = np.abs(np.diff(b)).mean()
            row['naht'] = round(float(jump / (typ + 1e-9)), 2)
        rows.append(row); print(json.dumps(row))


main()
