# Sprecher-Clips aufbereiten: Stille an den Rändern kürzen, Lautheit angleichen, als MP3 ablegen; Zeitmarken per Abgleich mit dem Skript.
#
#   python tools/audio/proc.py <Ergebnisname.json> <Clip> [<Clip> ...]
#
# Eingabe: work/el/<Clip>.mp3 (so, wie ElevenLabs sie liefert) und docs/sprechertext.json (Text und Stichworte je Clip).
# Ausgabe: public/voice/<Clip>.mp3, work/wav/<Clip>.wav und work/<Ergebnisname.json> mit Dauer und Zeitmarken.
# Braucht ffmpeg im Pfad und: pip install numpy soundfile pyloudnorm (sowie alles, was align.py braucht).
import sys, json, subprocess, os, tempfile, numpy as np, soundfile as sf, pyloudnorm as pyln
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__))); import align as A
R = A.ROOT + os.sep; TMP = os.path.join(tempfile.gettempdir(), '_sonnensystem_v.wav')
P = json.load(open(R + 'docs/sprechertext.json', encoding='utf-8')); os.makedirs(R + 'public/voice', exist_ok=True); os.makedirs(R + 'work/wav', exist_ok=True)
WORDS = {'earth_geo': ['pazifik', 'atlantik', 'indische', 'eisigen', 'asien', 'afrika', 'nordamerika', 'südamerika', 'antarktis', 'europa', 'australien']}
def prep(src, dst_mp3, dst_wav):
    subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-i', src, '-ac', '1', '-ar', '44100', TMP], check=True)
    x, sr = sf.read(TMP, dtype='float32')
    idx = np.where(np.abs(x) > 0.006)[0]; x = x[max(0, idx[0] - int(.04 * sr)):idx[-1] + int(.25 * sr)]
    x = pyln.normalize.loudness(x, pyln.Meter(sr).integrated_loudness(x), -18.0); pk = np.abs(x).max()
    if pk > .89: x = np.tanh(x / pk * 1.2) / np.tanh(1.2) * .89        # weiche Begrenzung statt hartem Abschneiden
    n = int(.03 * sr); x[-n:] *= np.linspace(1, 0, n)
    sf.write(dst_wav, x, sr)
    subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-i', dst_wav, '-codec:a', 'libmp3lame', '-b:a', '96k', dst_mp3], check=True)
    return len(x) / sr
out = {}
for cid in sys.argv[2:]:
    src = R + 'work/el/' + cid + '.mp3'; key = cid[:-2] if cid in ('overview_a', 'overview_b') else cid
    d = prep(src, R + 'public/voice/' + cid + '.mp3', R + 'work/wav/' + cid + '.wav')
    r = A.align(R + 'work/wav/' + cid + '.wav', [tuple(p) for p in P[key]], WORDS.get(key))
    r['d'] = round(d, 2); out[cid] = r
    print(cid, json.dumps({k: r[k] for k in ('d', 'cues', 'ratio', 'words') if k in r}, ensure_ascii=False), flush=True); print('   ', r['heard'][:240], flush=True)
json.dump(out, open(R + 'work/' + sys.argv[1], 'w', encoding='utf-8'), ensure_ascii=False)
