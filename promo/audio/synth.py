"""synth.py — numpy/scipy sound design toolkit for the Fable 5.1 promo soundtrack.
All generators return float64 arrays (mono 1-D, or stereo shape (n,2)) at SR = 48000.
"""
import numpy as np
from scipy import signal
from scipy.ndimage import maximum_filter1d, minimum_filter1d

SR = 48000

def n_of(dur): return int(round(dur * SR))
def t_of(dur): return np.arange(n_of(dur)) / SR
def db(x): return 10 ** (x / 20)
def midi(n): return 440.0 * 2 ** ((n - 69) / 12)
NOTE = {'C': 0, 'C#': 1, 'Db': 1, 'D': 2, 'D#': 3, 'Eb': 3, 'E': 4, 'F': 5, 'F#': 6, 'Gb': 6, 'G': 7, 'G#': 8, 'Ab': 8, 'A': 9, 'A#': 10, 'Bb': 10, 'B': 11}
def note(name):
    """'A2' -> Hz"""
    i = 1 if name[1] not in '#b' else 2
    return midi(NOTE[name[:i]] + 12 * (int(name[i:]) + 1))

# ----------------------------------------------------------------- oscillators
def _phase(f, dur, phase0=0.0):
    n = n_of(dur)
    if np.isscalar(f):
        ph = (f * np.arange(n) / SR + phase0) % 1.0
        dt = np.full(n, f / SR)
    else:
        f = np.asarray(f, dtype=float)
        if len(f) != n: f = np.interp(np.linspace(0, 1, n), np.linspace(0, 1, len(f)), f)
        ph = (np.cumsum(f) / SR + phase0) % 1.0
        dt = f / SR
    return ph, dt

def sine(f, dur, phase0=0.0):
    ph, _ = _phase(f, dur, phase0); return np.sin(2 * np.pi * ph)

def saw(f, dur, phase0=0.0):
    ph, dt = _phase(f, dur, phase0)
    y = 2 * ph - 1
    m = ph < dt; v = ph[m] / np.maximum(dt[m], 1e-9); y[m] -= v + v - v * v - 1
    m = ph > 1 - dt; v = (ph[m] - 1) / np.maximum(dt[m], 1e-9); y[m] -= v * v + v + v + 1
    return y

def square(f, dur, pw=0.5, phase0=0.0):
    return 0.5 * (saw(f, dur, phase0) - saw(f, dur, (phase0 + pw) % 1.0))

def tri(f, dur, phase0=0.0):
    ph, _ = _phase(f, dur, phase0); return 4 * np.abs(ph - 0.5) - 1

def noise(dur, seed=0, color='white'):
    r = np.random.default_rng(seed); x = r.standard_normal(n_of(dur))
    if color == 'pink':
        b = [0.049922035, -0.095993537, 0.050612699, -0.004408786]; a = [1, -2.494956002, 2.017265875, -0.522189400]
        x = signal.lfilter(b, a, x) * 3.5
    elif color == 'brown':
        x = np.cumsum(x); x = x - np.mean(x); x /= (np.max(np.abs(x)) + 1e-9)
    return x

# ------------------------------------------------------------------ envelopes
def adsr(dur, a=0.01, d=0.1, s=0.7, r=0.2, curve=2.0):
    n = n_of(dur); env = np.zeros(n)
    na, nd, nr = n_of(a), n_of(d), n_of(r)
    ns = max(0, n - na - nd - nr)
    i = 0
    if na: env[i:i + na] = np.linspace(0, 1, na) ** (1 / curve); i += na
    if nd: env[i:i + nd] = 1 - (1 - s) * np.linspace(0, 1, nd) ** (1 / curve); i += nd
    if ns: env[i:i + ns] = s; i += ns
    if nr and i < n: k = min(nr, n - i); env[i:i + k] = s * (1 - np.linspace(0, 1, k)) ** curve
    return env

def expdecay(dur, tau, start=1.0):
    return start * np.exp(-t_of(dur) / tau)

def ramp(dur, a=0.0, b=1.0, curve=1.0):
    return a + (b - a) * np.linspace(0, 1, n_of(dur)) ** curve

def fade(x, fin=0.005, fout=0.01):
    x = x.copy(); n = len(x); ni, no = min(n_of(fin), n // 2), min(n_of(fout), n // 2)
    if ni: x[:ni] *= np.linspace(0, 1, ni)[:, None] if x.ndim == 2 else np.linspace(0, 1, ni)
    if no: x[-no:] *= np.linspace(1, 0, no)[:, None] if x.ndim == 2 else np.linspace(1, 0, no)
    return x

# ------------------------------------------------------------------- filters
def _sos(kind, fc, order=2, q=None):
    fc = float(np.clip(fc, 10, SR / 2 - 100))
    if kind == 'band':
        bw = fc / (q or 1.0); lo, hi = max(10, fc - bw / 2), min(SR / 2 - 100, fc + bw / 2)
        return signal.butter(order, [lo, hi], btype='band', fs=SR, output='sos')
    return signal.butter(order, fc, btype={'low': 'low', 'high': 'high'}[kind], fs=SR, output='sos')

def lowpass(x, fc, order=2): return signal.sosfilt(_sos('low', fc, order), x, axis=0)
def highpass(x, fc, order=2): return signal.sosfilt(_sos('high', fc, order), x, axis=0)
def bandpass(x, fc, q=1.0, order=2): return signal.sosfilt(_sos('band', fc, order, q), x, axis=0)

def sweep_filter(x, fc_curve, kind='low', order=2, block=512, q=None):
    """time-varying filter; fc_curve is an array of cutoff (Hz) per sample (any length, resampled)."""
    n = len(x); fc = np.interp(np.linspace(0, 1, n), np.linspace(0, 1, len(fc_curve)), fc_curve)
    y = np.empty_like(x); zi = None
    for i in range(0, n, block):
        sos = _sos(kind, fc[min(n - 1, i + block // 2)], order, q)
        if zi is None: zi = signal.sosfilt_zi(sos) * x[i]
        y[i:i + block], zi = signal.sosfilt(sos, x[i:i + block], zi=zi)
    return y

def resonant_sweep(x, fc_curve, res=4.0, order=2, block=256):
    """lowpass sweep with a resonant peak: LP + bandpass boost at the cutoff."""
    lp = sweep_filter(x, fc_curve, 'low', order, block)
    bp = sweep_filter(x, fc_curve, 'band', 2, block, q=res)
    return lp + 0.6 * bp

# -------------------------------------------------------------- processing
def drive(x, amt=2.0): return np.tanh(x * amt) / np.tanh(amt)
def bitcrush(x, bits=6, downsample=4):
    q = 2 ** (bits - 1); y = np.round(x * q) / q
    if downsample > 1: y = np.repeat(y[::downsample], downsample)[:len(x)]
    return y
def stereo(x):
    return x if x.ndim == 2 else np.stack([x, x], axis=1)
def pan(x, p=0.0):
    """constant-power pan, p in -1 (L) .. +1 (R). p can be an array (per sample)."""
    x = np.asarray(x); th = (np.asarray(p) + 1) * np.pi / 4
    return np.stack([x * np.cos(th), x * np.sin(th)], axis=1)
def widen(x, amount=0.3, delay=0.012):
    s = stereo(x).copy(); d = n_of(delay)
    s[d:, 1] += amount * s[:-d, 0]; s[d:, 0] += amount * s[:-d, 1] * -0.5
    return s
def delay_fx(x, time=0.375, fb=0.4, mix=0.3, damp=3500, pingpong=True):
    s = stereo(x); n = len(s); d = n_of(time); out = np.zeros((n + d * 8, 2)); out[:n] = s
    buf = s.copy(); acc = np.zeros_like(out)
    for k in range(1, 9):
        buf = lowpass(buf, damp) * fb
        if pingpong: buf = buf[:, ::-1]
        acc[k * d:k * d + n] += buf
    return out * (1 - mix) + acc * mix

_IR_CACHE = {}
def make_ir(decay=2.0, damp=5000, predelay=0.01, seed=11, width=1.0):
    key = (decay, damp, predelay, seed, width)
    if key in _IR_CACHE: return _IR_CACHE[key]
    r = np.random.default_rng(seed); n = n_of(decay * 1.6); t = np.arange(n) / SR
    env = np.exp(-6.91 * t / decay)
    l = r.standard_normal(n) * env; rr = r.standard_normal(n) * env
    m = (l + rr) / 2; s = (l - rr) / 2 * width; l, rr = m + s, m - s
    ir = np.stack([l, rr], axis=1)
    # progressive high damping: split into early/late with different lowpass
    ir = lowpass(ir, damp, 1) * 0.7 + lowpass(ir, damp * 0.35, 1) * 0.6 * (t[:, None] / decay + 0.2)
    ir[:n_of(0.004)] *= np.linspace(0, 1, n_of(0.004))[:, None]
    ir = np.concatenate([np.zeros((n_of(predelay), 2)), ir])
    ir /= np.sqrt(np.sum(ir ** 2, axis=0, keepdims=True)) * 2.2
    _IR_CACHE[key] = ir; return ir
def reverb(x, decay=2.0, mix=0.3, damp=5000, predelay=0.01, seed=11, width=1.0):
    s = stereo(x); ir = make_ir(decay, damp, predelay, seed, width)
    wet = np.stack([signal.fftconvolve(s[:, c], ir[:, c])[:len(s) + len(ir)] for c in range(2)], axis=1)
    out = np.zeros_like(wet); out[:len(s)] = s * (1 - mix); out += wet * mix
    return out
def chorus(x, rate=0.4, depth=0.004, mix=0.5, seed=3):
    n = len(x); t = np.arange(n) / SR
    out = stereo(x).copy()
    for c, ph in enumerate((0.0, np.pi / 2)):
        d = (0.008 + depth * np.sin(2 * np.pi * rate * t + ph)) * SR
        idx = np.arange(n) - d; i0 = np.clip(np.floor(idx).astype(int), 0, n - 1); i1 = np.clip(i0 + 1, 0, n - 1); fr = idx - np.floor(idx)
        src = out[:, c].copy(); wet = src[i0] * (1 - fr) + src[i1] * fr
        out[:, c] = src * (1 - mix) + wet * mix
    return out
def sidechain(x, bpm, depth=0.5, offset=0.0, attack=0.01, release=0.18):
    """pumping envelope locked to quarter notes."""
    n = len(x); t = np.arange(n) / SR; beat = 60 / bpm
    ph = ((t - offset) % beat)
    env = 1 - depth * np.exp(-ph / release) * np.clip(ph / attack, 0, 1)
    return x * (env[:, None] if x.ndim == 2 else env)
def tremolo(x, rate, depth=0.5, shape='sine'):
    t = np.arange(len(x)) / SR
    lfo = 0.5 + 0.5 * np.sin(2 * np.pi * rate * t) if shape == 'sine' else ((t * rate) % 1 < 0.5).astype(float)
    g = 1 - depth * (1 - lfo)
    return x * (g[:, None] if x.ndim == 2 else g)

# -------------------------------------------------------------- instruments
def kick(dur=0.7, f0=170, f1=42, click=0.5, punch=1.0, seed=1):
    t = t_of(dur); f = f1 + (f0 - f1) * np.exp(-t * 22 * punch)
    body = sine(f, dur) * expdecay(dur, 0.16) * 1.0
    sub = sine(f1 * 0.99, dur) * expdecay(dur, 0.32) * 0.6
    cl = highpass(noise(dur, seed) * expdecay(dur, 0.006), 2500) * click * 0.8
    x = drive(body + sub + cl, 1.6)
    return fade(x, 0.0005, 0.02)

def sub_drop(dur=1.4, f0=95, f1=26):
    t = t_of(dur); f = f1 + (f0 - f1) * np.exp(-t * 3.2)
    x = sine(f, dur) * adsr(dur, 0.01, 0.1, 0.9, 0.5) * expdecay(dur, 0.9)
    return drive(x, 1.4)

def hat(dur=0.06, tone=9000, open_=False, seed=2):
    d = 0.35 if open_ else dur
    x = noise(d, seed) * expdecay(d, 0.09 if open_ else 0.012)
    x = highpass(x, tone, 4); x = bandpass(x, tone * 1.3, 0.8) * 2 + x * 0.3
    return fade(x, 0.0005, 0.01)

def snare(dur=0.35, seed=3):
    body = sine(190, dur) * expdecay(dur, 0.05) * 0.7
    nz = bandpass(noise(dur, seed), 3200, 0.5, 2) * expdecay(dur, 0.11)
    return drive(body + nz * 1.4, 1.5)

def clap(dur=0.4, seed=4):
    n = n_of(dur); x = np.zeros(n)
    for k, dt in enumerate([0, 0.011, 0.022, 0.034]):
        i = n_of(dt); seg = bandpass(noise(dur, seed + k), 1800, 0.7) * expdecay(dur, 0.012 if k < 3 else 0.14)
        x[i:] += seg[:n - i]
    return fade(x, 0.0005, 0.02)

def braam(dur=2.6, f=55.0, attack=0.55, detune=(0, 7, -7, 12, 1200), fc=(180, 2600), drive_amt=2.5, seed=5):
    """detuned saw stack with a lowpass swell — the classic trailer horn."""
    x = np.zeros(n_of(dur)); r = np.random.default_rng(seed)
    for c in detune:
        ff = f * 2 ** (c / 1200.0); x += saw(ff, dur, r.random()) * 0.35
        x += square(ff * 0.5, dur, 0.5, r.random()) * 0.12
    env = adsr(dur, attack, 0.3, 0.8, dur - attack - 0.3 - 0.1, 1.5)
    cut = fc[0] + (fc[1] - fc[0]) * np.linspace(0, 1, n_of(dur)) ** 0.7
    x = resonant_sweep(x, cut, res=2.5)
    x = drive(x * env, drive_amt)
    x += sine(f / 2, dur) * env * 0.5
    return fade(x, 0.005, 0.05)

def riser(dur=4.0, f0=90, f1=1400, noise_mix=0.6, seed=6):
    n = n_of(dur); f = f0 * (f1 / f0) ** np.linspace(0, 1, n) ** 1.3
    tone = saw(f, dur) * 0.6 + saw(f * 1.01, dur) * 0.4
    nz = noise(dur, seed)
    cut = 300 + 9000 * np.linspace(0, 1, n) ** 2
    nz = sweep_filter(nz, cut, 'high', 2)
    x = tone * (1 - noise_mix) + nz * noise_mix
    env = np.linspace(0, 1, n) ** 2.2
    x = tremolo(x, 8 + 24 * np.linspace(0, 1, n) ** 2, 0.5) * env
    return fade(x, 0.01, 0.003)

def reverse_cymbal(dur=1.6, seed=7):
    x = highpass(noise(dur, seed), 3000, 2) * np.linspace(0, 1, n_of(dur)) ** 3
    return fade(x, 0.01, 0.002)

def whoosh(dur=0.9, f0=300, f1=5000, seed=8, curve=1.0):
    n = n_of(dur); nz = noise(dur, seed)
    fc = f0 * (f1 / f0) ** np.linspace(0, 1, n) ** curve
    x = sweep_filter(nz, fc, 'band', 2, 256, q=1.2) * 3
    env = np.sin(np.pi * np.linspace(0, 1, n) ** 0.7) ** 1.5
    return fade(x * env, 0.005, 0.02)

def impact(dur=3.0, f=48, seed=9):
    k = kick(0.9, 220, f, click=1.0, punch=1.3, seed=seed) * 1.2
    nz = lowpass(noise(dur, seed + 1), 900) * expdecay(dur, 0.35) * 0.9
    sub = sine(f * 0.5, dur) * expdecay(dur, 0.8) * 0.8
    x = np.zeros(n_of(dur)); x[:len(k)] += k; x += nz + sub
    return drive(x, 1.8)

def glitch_stutter(dur=0.5, base=440.0, seed=10, rate=1 / 32.0, bpm=128):
    r = np.random.default_rng(seed); n = n_of(dur); x = np.zeros(n)
    step = n_of(60 / bpm * 4 * rate)
    i = 0
    while i < n:
        L = int(step * r.choice([0.5, 1, 1, 2])); L = max(64, min(L, n - i))
        f = base * 2 ** (r.integers(-12, 13) / 12)
        seg = square(f, L / SR, 0.5) * 0.6 + noise(L / SR, seed + i) * 0.4
        seg = bitcrush(seg, int(r.integers(4, 8)), int(r.integers(1, 6)))
        seg *= adsr(L / SR, 0.001, 0.0, 1.0, 0.01)
        if r.random() < 0.25: seg *= 0
        x[i:i + L] = seg[:n - i]; i += L
    return highpass(x, 400) * 0.8

def pluck(f, dur=0.4, bright=1.0, seed=12):
    x = saw(f, dur) * 0.6 + square(f, dur, 0.3) * 0.3 + sine(f * 2, dur) * 0.15
    cut = 800 * bright + 5000 * bright * expdecay(dur, 0.06)
    x = sweep_filter(x, cut, 'low', 2, 128)
    return x * expdecay(dur, 0.12) * adsr(dur, 0.002, 0, 1, 0.05)

def pad(freqs, dur, attack=1.2, release=1.5, fc=1400, detune=6, seed=13):
    x = np.zeros(n_of(dur)); r = np.random.default_rng(seed)
    for f in freqs:
        for c in (-detune, 0, detune):
            x += saw(f * 2 ** (c / 1200.0), dur, r.random()) * 0.2
    x = lowpass(x, fc); x *= adsr(dur, attack, 0.2, 0.9, release, 1.5)
    return chorus(x, 0.3, 0.003, 0.5)

def drone(f, dur, fc=160, lfo=0.15):
    x = sine(f, dur) * 0.6 + sine(f * 0.5, dur) * 0.5 + lowpass(saw(f, dur) * 0.4 + saw(f * 1.005, dur) * 0.4, fc)
    t = t_of(dur); x *= 0.75 + 0.25 * np.sin(2 * np.pi * lfo * t)
    return x

def tick(dur=0.02, f=2400, seed=14):
    return fade(bandpass(noise(dur, seed), f, 0.6) * expdecay(dur, 0.004) * 3, 0.0003, 0.004)

def blip(f=1200, dur=0.15, seed=15):
    return sine(f, dur) * expdecay(dur, 0.035) * adsr(dur, 0.001, 0, 1, 0.02) + sine(f * 2, dur) * expdecay(dur, 0.015) * 0.3

def boom_tail(dur=2.5, f=40):
    return sine(f, dur) * expdecay(dur, 0.7) * adsr(dur, 0.005, 0, 1, 0.3)

# ------------------------------------------------------------------- mixer
class Mix:
    def __init__(self, dur):
        self.n = n_of(dur); self.buf = np.zeros((self.n, 2))
    def add(self, x, at, gain=1.0, p=0.0):
        x = np.asarray(x)
        if x.ndim == 1: x = pan(x, p)
        i = n_of(at); j = min(self.n, i + len(x))
        if i < 0: x = x[-i:]; i = 0
        if j <= i: return
        self.buf[i:j] += x[:j - i] * gain
    def add_bus(self, bus, gain=1.0):
        self.buf[:len(bus)] += bus[:self.n] * gain

def true_peak(x, os=4):
    """inter-sample (true) peak via 4x oversampling, linear scale"""
    return float(np.max(np.abs(signal.resample_poly(np.asarray(x, dtype=np.float64), os, 1, axis=0))))

def limiter(x, ceiling=0.79, attack=0.003, release=0.12, os=4):
    """true-peak aware look-ahead limiter: the gain envelope is computed on a 4x oversampled copy."""
    x = np.asarray(x, dtype=np.float64)
    xo = signal.resample_poly(x, os, 1, axis=0)
    peak = np.max(np.abs(xo), axis=1) + 1e-9
    la = n_of(attack) * os
    env = maximum_filter1d(peak, size=2 * la + 1)
    need = np.minimum(1.0, ceiling / env)
    hold = minimum_filter1d(need, size=n_of(release) * os)
    a = np.exp(-1 / (release * SR * os)); g = signal.lfilter([1 - a], [1, -a], hold)
    g = np.minimum(g, need)
    g = g[::os][:len(x)]
    if len(g) < len(x): g = np.concatenate([g, np.full(len(x) - len(g), g[-1])])
    y = x * g[:, None]
    # gentle safety only for the residual overshoot above the ceiling (rare after oversampled detection)
    over = np.abs(y) > ceiling
    y[over] = np.sign(y[over]) * (ceiling + np.tanh((np.abs(y[over]) - ceiling) / ceiling * 4) * ceiling * 0.05)
    return y

def master(x, target_tp=db(-2.0), lowcut=28):
    """DC removal, low cut, true-peak limiting to target_tp (dBTP). Never normalises upward."""
    x = x - np.mean(x, axis=0, keepdims=True)
    x = highpass(x, lowcut, 2)
    x = limiter(x, ceiling=target_tp * 0.94)
    tp = true_peak(x)
    if tp > target_tp: x *= target_tp / tp
    print('master: true peak %.2f dBTP, sample peak %.2f dBFS' % (20 * np.log10(true_peak(x) + 1e-9), 20 * np.log10(np.max(np.abs(x)) + 1e-9)))
    return x

def write_wav(path, x):
    from scipy.io import wavfile
    x = np.clip(np.asarray(x, dtype=np.float32), -1, 1)
    wavfile.write(path, SR, x)
    print('wrote', path, x.shape, 'peak %.3f' % float(np.max(np.abs(x))))
