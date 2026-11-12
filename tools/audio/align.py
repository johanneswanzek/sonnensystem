# Zeitmarken finden: Sprachabschnitte per VAD, je Abschnitt Text per Whisper, dann Skript und Erkanntes zeichenweise abgleichen
# Braucht: pip install numpy scipy soundfile sherpa-onnx, dazu in work/models/ die Dateien silero_vad.onnx und
# sherpa-onnx-whisper-small/ (beides aus den Releases von github.com/k2-fsa/sherpa-onnx).
import os, sys, re, json, difflib, numpy as np, soundfile as sf, sherpa_onnx
from scipy.signal import resample_poly
ROOT = os.environ.get('SONNENSYSTEM_ROOT') or os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
D = os.path.join(ROOT, 'work', 'models') + os.sep
M = D + 'sherpa-onnx-whisper-small/'
rec = sherpa_onnx.OfflineRecognizer.from_whisper(encoder=M + 'small-encoder.int8.onnx', decoder=M + 'small-decoder.int8.onnx', tokens=M + 'small-tokens.txt', language='de', task='transcribe', num_threads=4)
def norm(s):
    s = s.lower().replace('ß', 'ss')
    return re.sub(r'[^a-zäöü0-9]+', ' ', s).strip()
def load16(path):
    x, sr = sf.read(path, dtype='float32', always_2d=True); x = x.mean(axis=1)
    if sr != 16000: x = resample_poly(x, 16000, sr).astype(np.float32)
    return x
def segments(x):
    cfg = sherpa_onnx.VadModelConfig(); cfg.silero_vad.model = D + 'silero_vad.onnx'
    cfg.silero_vad.min_silence_duration = 0.22; cfg.silero_vad.min_speech_duration = 0.12; cfg.silero_vad.threshold = 0.45; cfg.sample_rate = 16000
    vad = sherpa_onnx.VoiceActivityDetector(cfg, buffer_size_in_seconds=600)
    out = []; w = cfg.silero_vad.window_size
    for i in range(0, len(x) - w + 1, w):
        vad.accept_waveform(x[i:i + w])
        while not vad.empty(): s = vad.front; out.append((s.start / 16000, np.array(s.samples, dtype=np.float32))); vad.pop()
    vad.flush()
    while not vad.empty(): s = vad.front; out.append((s.start / 16000, np.array(s.samples, dtype=np.float32))); vad.pop()
    return out
def align(path, parts, words=None):
    """parts: Liste (Text, Marker oder None). Liefert Dauer, Marker-Zeiten, erkannten Text."""
    x = load16(path); segs = segments(x)
    tr = ''; tmap = []          # je Zeichen des erkannten Texts eine Zeit
    for t0, smp in segs:
        st = rec.create_stream(); st.accept_waveform(16000, smp); rec.decode_stream(st)
        txt = norm(st.result.text) + ' '
        dur = len(smp) / 16000
        for k in range(len(txt)): tmap.append(t0 + dur * k / max(1, len(txt)))
        tr += txt
    script = ''; marks = {}
    for txt, cue in parts:
        if cue: marks[cue] = len(script)
        script += norm(re.sub(r'\[[^\]]*\]', ' ', txt)) + ' '
    sm = difflib.SequenceMatcher(None, script, tr, autojunk=False); blocks = sm.get_matching_blocks()
    starts = [s for s, _ in segs]; cues = {}
    for cue, pos in marks.items():
        # erster übereinstimmender Block ab der Satzanfangsposition
        j = None
        for a, b, n in blocks:
            if n and a + n > pos: j = b + max(0, pos - a); break
        t = tmap[min(j, len(tmap) - 1)] if j is not None else None
        if t is not None:
            near = min(starts, key=lambda s: abs(s - t))
            if abs(near - t) < 0.45: t = near      # Sätze beginnen nach einer Pause: auf den Abschnittsanfang legen
        cues[cue] = None if t is None else round(float(t), 2)
    wt = {}
    for w in (words or []):          # Zeitpunkt einzelner Wörter (erstes Vorkommen im Skript)
        pos = script.find(norm(w)); j = None
        for a, b, n in blocks:
            if pos >= 0 and n and a + n > pos: j = b + max(0, pos - a); break
        wt[w] = None if j is None else round(float(tmap[min(j, len(tmap) - 1)]), 2)
    return {'d': round(len(x) / 16000, 2), 'cues': cues, 'words': wt, 'heard': tr.strip(), 'ratio': round(sm.ratio(), 3), 'gaps': [round(s, 2) for s in starts]}
if __name__ == '__main__':
    spec = json.load(open(sys.argv[1]))
    for k, v in spec.items():
        r = align(v['file'], [tuple(p) for p in v['parts']]); print(k, json.dumps({a: r[a] for a in ('d', 'cues', 'ratio')}, ensure_ascii=False)); print('   ', r['heard'][:300])
