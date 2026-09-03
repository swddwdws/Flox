#!/usr/bin/env python3
"""compose_electro.py — original electropop cue in the character of a 120 BPM chorus
section (four-on-the-floor, sidechained pads, 16th arpeggio, bright pluck lead,
clap on 2 and 4, filter riser into the drops). Own composition — no melody, hook or
recording of any existing song is used or reproduced.

Key G# minor, 120 BPM, 30.0 s, cut grid: 3 6 9 12 15 17 20 23 26.
usage: python3 audio/compose_electro.py [out/audio_electro.wav]
"""
import os, sys
import numpy as np
import synth as S

OUT = sys.argv[1] if len(sys.argv) > 1 else os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'out', 'audio_electro.wav')
BPM, DUR = 120, 30.0
BEAT, BAR = 0.5, 2.0
N = S.note
CUTS = [3.0, 6.0, 9.0, 12.0, 15.0, 17.0, 20.0, 23.0, 26.0]
DROP1, BREAK, BUILD, DROP2 = 3.0, 20.0, 23.0, 26.0

music, drums, sfx = S.Mix(DUR + 4), S.Mix(DUR + 4), S.Mix(DUR + 4)
kicks = []

def kick(t, g=1.0):
    drums.add(S.kick(0.55, 155, 48, click=0.9, seed=int(t * 100) % 97), t, gain=g); kicks.append(t)
def clap(t, g=0.5):
    drums.add(S.reverb(S.clap(0.34, seed=int(t * 100) % 83), 1.3, 0.28), t, gain=g)
def hat(t, g=0.22, open_=False, tone=10500, p=0.0):
    drums.add(S.hat(0.05, tone, open_=open_, seed=int(t * 1000) % 89), t, gain=g, p=p)

# ---------------------------------------------------------------- harmony
# G# minor: i (G#m) - VI (E) - III (B) - VII (F#) — one chord per bar, two bars each
PROG = [['G#3', 'B3', 'D#4', 'G#4'], ['E3', 'G#3', 'B3', 'E4'],
        ['B2', 'D#3', 'F#3', 'B3'], ['F#3', 'A#3', 'C#4', 'F#4']]
BASSN = ['G#1', 'E1', 'B1', 'F#1']

def chord_at(t):
    return int(((t - DROP1) // (2 * BAR)) % len(PROG)) if t >= DROP1 else 0

# ---------------------------------------------------------------- sections
# 0-3 intro (filtered, airy), 3-20 chorus energy, 20-23 breakdown, 23-26 build, 26-30 final chorus
def pad_block(a, b, gain, fc, attack=0.35):
    t = a; i = chord_at(a)
    while t < b - 1e-6:
        d = min(2 * BAR, b - t)
        x = S.pad([N(n) for n in PROG[i % 4]], d + 1.4, attack=attack, release=1.3, fc=fc, detune=9, seed=40 + i)
        music.add(S.widen(x, 0.35), t, gain=gain); t += d; i += 1
pad_block(0.0, 3.0, 0.30, 1400, 0.5)
pad_block(3.0, 20.0, 0.30, 2600)
pad_block(20.0, 23.0, 0.34, 1500, 0.8)
pad_block(23.0, 26.0, 0.30, 2800)
pad_block(26.0, 29.6, 0.36, 3400, 0.5)

# airy 16th arpeggio — the signature of this kind of chorus
def arpeggio(a, b, gain, oct_=1, step=0.25, bright=1.2):
    t, i = a, 0
    while t < b - 1e-6:
        ch = PROG[chord_at(t) % 4]
        f = N(ch[i % len(ch)]) * 2 ** oct_
        x = S.pluck(f, 0.26, bright=bright, seed=60 + i)
        music.add(S.reverb(x, 1.6, 0.30), t, gain=gain, p=0.55 * np.sin(i * 0.9))
        t += BEAT * step; i += 1
arpeggio(0.5, 3.0, 0.18, 1, 0.5, 0.9)
arpeggio(3.0, 20.0, 0.20, 1, 0.25, 1.3)
arpeggio(20.0, 23.0, 0.12, 0, 0.5, 0.8)
arpeggio(23.0, 26.0, 0.22, 1, 0.25, 1.5)
arpeggio(26.0, 29.6, 0.22, 1, 0.25, 1.4)

# bright pluck lead: a simple rising motif on the phrase starts (own melody)
LEAD = [('D#5', 0.5), ('F#5', 0.5), ('G#5', 1.0), ('F#5', 0.5), ('D#5', 1.5)]
def lead(at, gain=0.26, oct_=0):
    t = at
    for nm, ln in LEAD:
        x = S.pluck(N(nm) * 2 ** oct_, ln * BEAT + 0.25, bright=1.6, seed=int(t * 50) % 91)
        x = S.reverb(S.widen(x, 0.4), 2.2, 0.42)
        music.add(x, t, gain=gain); t += ln * BEAT
lead(3.0); lead(11.0); lead(26.0, 0.30)

# bass: root on every 8th with a little octave lift
def bass(a, b, gain=0.34):
    t, i = a, 0
    while t < b - 1e-6:
        root = BASSN[chord_at(t) % 4]
        f = N(root) * (2 if i % 8 == 7 else 1)
        x = S.saw(f, BEAT * 0.42) * 0.65 + S.square(f, BEAT * 0.42, 0.5) * 0.3
        x = S.lowpass(x, 800) * S.adsr(BEAT * 0.42, 0.004, 0.07, 0.7, 0.08)
        music.add(S.drive(x, 2.4), t, gain=gain)
        t += BEAT / 2; i += 1
bass(3.0, 20.0); bass(23.0, 26.0); bass(26.0, 29.4)

# ---------------------------------------------------------------- drums
t = DROP1
while t < BREAK - 1e-6:                     # chorus groove
    i = round((t - DROP1) / BEAT)
    kick(t, 1.0)
    if i % 2 == 1: clap(t, 0.5)
    hat(t + BEAT / 2, 0.24, open_=(i % 4 == 3), p=0.25 * (1 if i % 2 else -1))
    hat(t, 0.13, tone=12000)
    t += BEAT
for k in range(6):                          # breakdown: only a soft pulse
    drums.add(S.kick(0.5, 110, 44, click=0.15, seed=k), BREAK + k * BEAT, gain=0.4)
t = BUILD                                   # build: 8ths -> 16ths
while t < 24.5 - 1e-6:
    kick(t, 0.95); hat(t + BEAT / 4, 0.16); t += BEAT / 2
t = 24.5
while t < 25.99 - 1e-6:
    kick(t, 0.9, ); t += BEAT / 4
t, i = 24.5, 0
while t < 25.99 - 1e-6:
    drums.add(S.snare(0.26, seed=100 + i), t, gain=0.14 + 0.34 * (t - 24.5) / 1.5)
    hat(t + BEAT / 16, 0.13, tone=11000, p=0.3 * (1 if i % 2 else -1)); t += BEAT / 8; i += 1
t = DROP2                                   # final chorus
while t < 29.4 - 1e-6:
    i = round((t - DROP2) / BEAT)
    kick(t, 1.0)
    if i % 2 == 1: clap(t, 0.5)
    hat(t + BEAT / 2, 0.24, open_=(i % 4 == 3))
    hat(t, 0.13, tone=12000)
    t += BEAT

# ---------------------------------------------------------------- drops & transitions
def whoosh(t, d=0.35, f0=200, f1=6000, pf=-0.8, pt=0.8, gain=0.34, curve=1.0):
    x = S.whoosh(d, f0, f1, seed=int(t * 100) % 71, curve=curve)
    sfx.add(S.pan(x, np.linspace(pf, pt, len(x))), t, gain=gain)
def impact(t, gain=0.8, sub=True):
    sfx.add(S.reverb(S.impact(2.4, 50, seed=int(t * 10) % 61), 2.6, 0.30), t, gain=gain)
    if sub: sfx.add(S.sub_drop(1.3, 95, 36), t, gain=0.5)
    sfx.add(S.highpass(S.noise(0.22, 5) * S.expdecay(0.22, 0.035), 1800), t, gain=0.35)

# intro riser into the first drop
n = S.n_of(2.6); fr = N('G#2') * (N('G#4') / N('G#2')) ** np.linspace(0, 1, n) ** 1.3
sfx.add(S.sine(fr, 2.6) * np.linspace(0.35, 1, n) ** 1.6, 0.4, gain=0.26)
sfx.add(S.reverb(S.sine(N('G#2'), 1.5) * S.adsr(1.5, 0.02, 0.3, 0.5, 0.9) * S.expdecay(1.5, 0.7), 2.2, 0.35), 0.0, gain=0.30)
sfx.add(S.sweep_filter(S.noise(2.6, 21), 300 * (11000 / 300) ** np.linspace(0, 1, n) ** 1.6, 'high') * np.linspace(0.05, 1, n) ** 3, 0.4, gain=0.36)
sfx.add(S.reverse_cymbal(0.8, seed=22), 2.2, gain=0.42)
impact(DROP1, 0.85)
# every cut gets a whoosh; the section cuts get a soft impact
for c in CUTS:
    whoosh(c - 0.32, 0.32, 220, 6500, -0.8, 0.8, 0.30)
for c in (9.0, 15.0, 20.0):
    sfx.add(S.reverb(S.impact(1.6, 60, seed=int(c)), 2.0, 0.26), c, gain=0.34)
# breakdown swell + build riser + hard silence before the final drop
sfx.add(S.reverse_cymbal(1.1, seed=31), 19.2, gain=0.40)
nb = S.n_of(2.9); fb = N('G#2') * (N('G#4') / N('G#2')) ** np.linspace(0, 1, nb) ** 1.2
sfx.add(S.sine(fb, 2.9) * np.linspace(0.15, 1, nb) ** 2, BUILD, gain=0.22)
sfx.add(S.sweep_filter(S.noise(2.9, 33), 250 * (13000 / 250) ** np.linspace(0, 1, nb) ** 1.5, 'high') * np.linspace(0.08, 1, nb) ** 2.6, BUILD, gain=0.40)
sfx.add(S.reverse_cymbal(0.9, seed=34), 25.1, gain=0.6)
impact(DROP2, 0.95)
sfx.add(S.reverb(S.highpass(S.noise(1.4, 9), 5200) * np.linspace(1, 0, S.n_of(1.4)) ** 2, 2.4, 0.5), DROP2, gain=0.16)

# ---------------------------------------------------------------- master
n_total = S.n_of(DUR)
mus, drm, fx = music.buf[:n_total], drums.buf[:n_total], sfx.buf[:n_total]
tt = np.arange(n_total) / S.SR
# sidechain pump — the defining feel of this style
env = np.ones(n_total)
for k in kicks:
    i0 = S.n_of(k); seg = tt[i0:i0 + S.n_of(0.38)] - k
    env[i0:i0 + len(seg)] *= 1 - 0.55 * np.exp(-seg / 0.13)
mus = S.reverb(mus * env[:, None], 1.7, 0.16, damp=5000)[:n_total]
mix = mus + drm + fx
mix = mix + 0.55 * S.highpass(mix, 3500, 1) + 0.25 * S.bandpass(mix, 1500, 1.1, 2)
mix = mix - 0.45 * S.lowpass(mix, 95, 2)
# 0.12 s of silence right before the final drop
a, b = S.n_of(DROP2 - 0.12), S.n_of(DROP2); r = S.n_of(0.003)
gate = np.ones(n_total); gate[a:b] = 0; gate[a - r:a] = np.linspace(1, 0, r); gate[b:b + r] = np.linspace(0, 1, r)
mix *= gate[:, None]
fo = np.interp(tt, [0, 28.8, 29.7, 30], [1, 1, 0, 0]); mix *= fo[:, None]
out = S.master(mix, target_tp=S.db(float(os.environ.get('TP', -4.5)))) * fo[:, None]
os.makedirs(os.path.dirname(os.path.abspath(OUT)), exist_ok=True)
S.write_wav(OUT, out)
prof = [20 * np.log10(np.sqrt(np.mean(out[i * S.SR:(i + 1) * S.SR] ** 2)) + 1e-9) for i in range(int(DUR))]
print('RMS dBFS/s:', ' '.join('%d:%.0f' % (i, v) for i, v in enumerate(prof)))
print('overall RMS %.1f dBFS, peak %.3f' % (20 * np.log10(np.sqrt(np.mean(out ** 2))), np.max(np.abs(out))))
