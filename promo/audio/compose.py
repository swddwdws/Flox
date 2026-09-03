#!/usr/bin/env python3
"""compose.py — the full synthesised score for "Claude Fable 5.1 — Ich stelle mich vor".
120 BPM, D minor, 30.0 s, stereo 48 kHz. Follows storyboard.json → music + audio_cues.
usage: python3 audio/compose.py [out/audio.wav]
"""
import os, sys
import numpy as np
import synth as S

OUT = sys.argv[1] if len(sys.argv) > 1 else os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'out', 'audio.wav')
BPM, DUR = 120, 30.0
BEAT, BAR = 60 / BPM, 240 / BPM
N = S.note
D1, D2, D3, D4, D5 = N('D1'), N('D2'), N('D3'), N('D4'), N('D5')

music = S.Mix(DUR + 4)   # pads, arp, bass, drone   (ducked by kicks)
drums = S.Mix(DUR + 4)   # kicks, hats, snares
sfx = S.Mix(DUR + 4)     # braams, whooshes, risers, blips, ticks
kick_times = []

def rng_f(t, base):  # tiny deterministic pitch spread
    return base * 2 ** ((S.np.sin(t * 7.3) * 4) / 1200)

# ------------------------------------------------------------------ foundation
# D1 sub drone, level rising across the film, out by 29.6
drone_env = np.interp(np.arange(S.n_of(DUR)) / S.SR, [0, 0.5, 8, 16, 19, 21.85, 21.86, 22.0, 22.05, 26, 28.8, 29.6, 30], [0, .55, .7, .8, .9, 1.0, 0, 0, 1.0, .7, .5, 0, 0])
drone = S.drone(D1, DUR, fc=150, lfo=0.2) * drone_env
music.add(S.stereo(S.drive(drone, 1.3)), 0.0, gain=0.20)
# faint room tone
music.add(S.stereo(S.lowpass(S.noise(DUR, 99, 'pink'), 1200) * np.interp(np.arange(S.n_of(DUR)) / S.SR, [0, 1, 21.8, 21.85, 22, 29, 30], [0, 1, 1, 0, 1, 1, 0])), 0, gain=0.006)

# heartbeats at 0.0 and 1.0
for tt in (0.0, 1.0):
    sfx.add(S.kick(0.55, 70, 36, click=0.05, punch=0.6, seed=int(tt) + 1), tt, gain=0.9)

# ------------------------------------------------------------------ chords / pads
def chord(names, octave_up=None):
    f = [N(n) for n in names]
    if octave_up: f.append(N(octave_up))
    return f
PAD = [  # (start, end, chord, gain, fc, attack)
    (12.0, 14.0, ['D3', 'F3', 'A3', 'D4'], 0.20, 1800, 0.3),
    (14.0, 16.0, ['A#2', 'D3', 'F3', 'A#3'], 0.20, 1800, 0.3),
    (16.0, 18.0, ['F3', 'A3', 'C4', 'F4'], 0.22, 1300, 0.5),
    (18.0, 21.85, ['C3', 'E3', 'G3', 'C4'], 0.22, 1600, 0.4),
    (22.3, 26.0, ['D3', 'F3', 'A3', 'E4', 'D4'], 0.32, 3200, 0.9),   # shimmer Dm add9
    (26.0, 29.6, ['D3', 'F3', 'A3', 'D4'], 0.18, 1100, 0.8),
]
for i, (a, b, ch, g, fc, att) in enumerate(PAD):
    d = b - a + 1.4
    x = S.pad(chord(ch), d, attack=att, release=1.2, fc=fc, detune=7, seed=20 + i)
    if a >= 22: x = S.highpass(x, 180)
    music.add(x, a, gain=g)

# high sustained A5 string-like note 22.7 -> 26.0
a5 = S.saw(N('A5'), 3.6) * 0.5 + S.sine(N('A5'), 3.6) * 0.5
a5 = S.lowpass(a5, 3000) * S.adsr(3.6, 0.9, 0.2, 0.9, 1.2, 1.5)
music.add(S.reverb(S.widen(a5, 0.4), 2.5, 0.4), 22.7, gain=0.13)

# ------------------------------------------------------------------ arpeggio
ARP = ['D4', 'F4', 'A4', 'C5', 'A4', 'F4', 'D5', 'A4']
def arp(start, end, octave=0, gain_a=0.1, gain_b=0.18, bright_a=0.5, bright_b=1.4):
    n = 0; t = start
    while t < end - 1e-6:
        prog = (t - start) / (end - start)
        f = N(ARP[n % len(ARP)]) * 2 ** octave
        x = S.pluck(f, 0.3, bright=bright_a + (bright_b - bright_a) * prog, seed=30 + n)
        music.add(x, t, gain=gain_a + (gain_b - gain_a) * prog, p=0.6 * np.sin(n * 0.9))
        t += BEAT / 4; n += 1
arp(5.5, 8.0, 0, 0.08, 0.18)
arp(8.0, 16.0, 0, 0.20, 0.24)
arp(20.0, 21.85, 1, 0.20, 0.27, 1.2, 1.6)

# ------------------------------------------------------------------ bass (drive) 8th notes, root of the current chord
BASS_ROOT = [(8.0, 12.0, 'D2'), (12.0, 14.0, 'D2'), (14.0, 16.0, 'A#1'), (19.0, 21.85, 'D2')]
for a, b, root in BASS_ROOT:
    t = a; i = 0
    while t < b - 1e-6:
        f = N(root) * (2 ** (7 / 12) if i % 8 == 6 else 1)
        x = S.saw(f, BEAT * 0.45) * 0.6 + S.square(f, BEAT * 0.45, 0.5) * 0.3
        x = S.lowpass(x, 380) * S.adsr(BEAT * 0.45, 0.004, 0.08, 0.7, 0.08)
        music.add(S.drive(x, 2.0), t, gain=0.36 if a < 19 else 0.42)
        t += BEAT / 2; i += 1

# ------------------------------------------------------------------ drums
def add_kick(t, gain=0.9, f0=140, f1=45, click=0.6):
    drums.add(S.kick(0.6, f0, f1, click=click, seed=int(t * 100) % 97), t, gain=gain); kick_times.append(t)
def add_hat(t, gain=0.16, open_=False, tone=9000, p=0.0):
    drums.add(S.hat(0.05, tone, open_=open_, seed=int(t * 1000) % 89), t, gain=gain, p=p)
def add_snare(t, gain=0.45):
    drums.add(S.snare(0.3, seed=int(t * 100) % 83), t, gain=gain)

# low pulse on beats 1/3 from 4.0, every beat from 6.0 (soft kick)
for tt in (4.0, 5.0):
    add_kick(tt, 0.5, 90, 40, 0.15)
t = 6.0
while t < 8.0 - 1e-6:
    add_kick(t, 0.55, 100, 42, 0.25); t += BEAT
# sparse hats 4.5 -> 5.0, off-8ths 5.25 -> 8.0
for tt in (4.5,):
    add_hat(tt, 0.08)
t = 5.25
while t < 8.0 - 1e-6:
    add_hat(t, 0.11, p=0.2 * (1 if int(t * 2) % 2 else -1)); t += BEAT
# drive 8.0-16.0: kick every beat, snare 2/4 from 10.0, hats every 8th (open on the 4th 8th)
t = 8.0; i = 0
while t < 16.0 - 1e-6:
    add_kick(t, 0.95)
    if t >= 10.0 and i % 2 == 1: add_snare(t, 0.42)
    add_hat(t + BEAT / 2, 0.26, open_=(i % 4 == 3), p=0.25 * (1 if i % 2 else -1))
    if t >= 10.0: add_hat(t, 0.13, tone=11000)
    t += BEAT; i += 1
# breath 16-19: quiet quarter-note ticks, hats return at 1/8 from 18.5
t = 16.0
while t < 18.5 - 1e-6:
    sfx.add(S.tick(0.02, 3000, seed=int(t * 10)), t, gain=0.18, p=0.3 * np.sin(t * 5)); t += BEAT
t = 18.5
while t < 19.0 - 1e-6:
    add_hat(t, 0.08); t += BEAT / 2
# build 19-22
t = 19.0
while t < 20.0 - 1e-6:
    add_kick(t, 0.9); add_hat(t + BEAT / 4, 0.12); t += BEAT / 2
t = 20.0
while t < 21.0 - 1e-6:
    add_kick(t, 0.85, 150, 46); t += BEAT / 4
t = 20.0; i = 0
while t < 21.85 - 1e-6:   # snare-click roll rising
    add_snare(t, 0.12 + 0.35 * (t - 20.0) / 1.85); t += BEAT / 4; i += 1
t = 21.0
while t < 21.85 - 1e-6:
    add_kick(t, 0.8, 160, 48); t += BEAT / 4
t = 21.0
while t < 21.85 - 1e-6:
    add_hat(t + BEAT / 16, 0.12, tone=10000, p=0.3 * (1 if int(t * 16) % 2 else -1)); t += BEAT / 8
# climax half-time kicks with sub swells
for tt in (23.0, 24.0, 25.0):
    add_kick(tt, 0.9, 120, 40, 0.4)
    drums.add(S.boom_tail(1.2, 42) * 0.8, tt, gain=0.5)

# ------------------------------------------------------------------ braams
BRAAMS = [(2.0, 2.6, 0.75, 0.55), (5.0, 2.4, 0.75, 0.5), (8.0, 2.2, 0.8, 0.45), (10.0, 2.2, 0.8, 0.45), (12.0, 2.2, 0.8, 0.45), (14.0, 2.2, 0.8, 0.45)]
for i, (tt, d, g, att) in enumerate(BRAAMS):
    x = S.braam(d, D1 * 2, attack=att, detune=(0, 6, -6, -1200, 1200, 1207), fc=(160, 2400), drive_amt=2.4, seed=5 + i)
    sfx.add(S.reverb(x, 2.2, 0.28, damp=3200), tt, gain=g)
    sfx.add(S.kick(0.5, 90, 38, click=0.1, seed=70 + i), tt, gain=0.4)   # sine sub thump
# the big one at 22.0: sub-drop + braam (3 s tail) + white-noise crack
sfx.add(S.sub_drop(1.4, 90, 30), 22.0, gain=0.8)
big = S.braam(3.6, D1 * 2, attack=0.06, detune=(0, 5, -5, -1200, 1200, 1900, 2400), fc=(400, 3600), drive_amt=3.0, seed=11)
sfx.add(S.reverb(big, 3.4, 0.35, damp=2600), 22.0, gain=1.0)
sfx.add(S.highpass(S.noise(0.25, 3) * S.expdecay(0.25, 0.04), 1500), 22.0, gain=0.6)
sfx.add(S.impact(2.6, 44, seed=12), 22.0, gain=0.7)

# ------------------------------------------------------------------ whooshes / risers / reverse cymbals
def whoosh(t, d=0.35, f0=200, f1=6000, pf=-0.8, pt=0.8, gain=0.4, curve=1.0):
    x = S.whoosh(d, f0, f1, seed=int(t * 100) % 71, curve=curve)
    sfx.add(S.pan(x, np.linspace(pf, pt, len(x))), t, gain=gain)
def rev(t, d=0.4, gain=0.35):
    sfx.add(S.reverse_cymbal(d, seed=int(t * 10) % 61), t, gain=gain)

whoosh(0.3, 0.7, 300, 3000, 0, 0, 0.16)          # airy, with the hairline
rev(1.65, 0.35, 0.3)
whoosh(1.8, 0.35, 200, 6000, -0.8, 0.8, 0.45)      # light sweep at 2.0
whoosh(3.4, 0.8, 250, 5000, -0.7, 0.7, 0.22)       # diagonal streak
rev(4.6, 0.4, 0.4); whoosh(4.65, 0.35, 200, 6000, -0.8, 0.8, 0.45)
whoosh(5.0, 0.45, 6000, 250, 0.8, -0.8, 0.4)       # inward suck
sfx.add(S.riser(0.6, 200, 1800, 0.7, seed=13), 7.4, gain=0.5)
sfx.add(S.impact(1.2, 60, seed=14), 7.95, gain=0.8); sfx.add(S.highpass(S.noise(0.3, 4) * S.expdecay(0.3, 0.05), 2000), 7.95, gain=0.5)
whoosh(9.0, 0.5, 4000, 300, 0, 0, 0.3, 0.8)        # top-to-bottom light sweep
for tt in (9.65, 11.65, 13.65, 15.65):
    whoosh(tt, 0.35, 200, 6000, -0.8 if int(tt) % 4 else 0.8, 0.8 if int(tt) % 4 else -0.8, 0.4)
sfx.add(S.glitch_stutter(0.25, N('D5'), seed=21, rate=1 / 16, bpm=BPM), 9.75, gain=0.45)
sfx.add(S.glitch_stutter(0.25, N('D5'), seed=22, rate=1 / 16, bpm=BPM), 13.75, gain=0.45)
# 11.65 forward whoosh with doppler pitch-down
whoosh(11.65, 0.5, 5000, 200, 0, 0, 0.45, 0.6)
whoosh(12.5, 0.3, 5000, 300, 0.5, -0.5, 0.3)       # thread inward
sfx.add(S.riser(0.55, 300, 2500, 0.6, seed=15), 13.2, gain=0.35)
rev(15.6, 0.4, 0.45); whoosh(15.6, 0.4, 200, 5000, 0.8, -0.8, 0.35)
whoosh(17.8, 0.8, 200, 3500, 0.8, -0.8, 0.22)      # slow wide sweep
sfx.add(S.riser(3.35, 80, 900, 0.75, seed=16) * np.linspace(0.15, 1.0, S.n_of(3.35)) ** 1.5, 18.5, gain=0.55)
# build riser: pitch-rising sine A2->A4 + noise up to 12 kHz
n = S.n_of(2.85); f = N('A2') * (N('A4') / N('A2')) ** np.linspace(0, 1, n) ** 1.2
sfx.add(S.sine(f, 2.85) * np.linspace(0.2, 1, n) ** 2, 19.0, gain=0.25)
sfx.add(S.sweep_filter(S.noise(2.85, 17), 200 * (12000 / 200) ** np.linspace(0, 1, n) ** 1.5, 'high') * np.linspace(0.1, 1, n) ** 2.5, 19.0, gain=0.45)
for i, tt in enumerate([19.5, 20.0, 20.5, 20.75, 21.0, 21.25, 21.375, 21.5, 21.625, 21.75]):
    d = 0.22 if tt < 21 else 0.12
    sfx.add(S.glitch_stutter(d, N('D5') * 2 ** (i / 12), seed=40 + i, rate=1 / 16 if tt < 21 else 1 / 32, bpm=BPM), tt, gain=0.4 + 0.03 * i)
rev(21.0, 0.85, 0.7)
whoosh(22.0, 0.8, 200, 7000, -0.9, 0.9, 0.5)       # reveal sweep
whoosh(25.6, 0.5, 300, 2500, 0, 0, 0.12)
whoosh(28.2, 1.0, 300, 2500, -0.6, 0.6, 0.1)

# ------------------------------------------------------------------ blips, pings, ticks, melody
def ticks(t, n, spacing, gain=0.25):
    for i in range(n):
        sfx.add(S.tick(0.02, 1800 + 700 * ((i * 7) % 5) / 4, seed=100 + i), t + i * spacing, gain=gain, p=0.15 * ((i % 3) - 1))
def ping(t, f, gain=0.3, dur=0.5, rev_mix=0.4):
    x = S.blip(f, dur, seed=int(t * 100) % 53) if dur <= 0.2 else (S.sine(f, dur) * S.expdecay(dur, dur * 0.22) + S.sine(f * 2.01, dur) * S.expdecay(dur, dur * 0.06) * 0.25)
    sfx.add(S.reverb(x, 1.8, rev_mix), t, gain=gain)

sfx.add(S.tick(0.02, 2500, seed=1), 1.0, gain=0.2)          # hat tick as 'H' lands
sfx.add(S.kick(0.4, 80, 40, click=0.1, seed=3), 2.5, gain=0.5)   # 'neu.' punch
sfx.add(S.tick(0.02, 2800, seed=4), 2.9, gain=0.2)
sfx.add(S.kick(0.4, 80, 40, click=0.1, seed=5), 6.5, gain=0.45)  # 'tief.' punch
ticks(8.2, 8, 0.028, 0.2)                                    # '$ claude'
sfx.add(S.kick(0.35, 120, 60, click=0.2, seed=6), 8.5, gain=0.4)
ping(9.0, N('D5'), 0.35, 0.12); ping(9.06, N('A5'), 0.35, 0.14)   # success blip
sfx.add(S.kick(0.35, 120, 60, click=0.2, seed=7), 9.5, gain=0.4)
for i, tt in enumerate([10.0, 10.25, 10.5, 10.75] + [11.0 + k * 0.125 for k in range(5)]):
    sfx.add(S.tick(0.03, 1500 * 2 ** (i / 10), seed=200 + i), tt, gain=0.3)
ping(11.5, N('A5'), 0.4, 0.5, 0.5); add_snare(11.5, 0.3)
ping(12.5, N('D3'), 0.35, 0.6, 0.4)
ticks(14.1, 8, 0.022, 0.2)
for i, tt in enumerate([14.75, 15.0, 15.25, 15.5]):
    ping(tt, N('D5') * 2 ** (i * 2 / 12), 0.3, 0.15)
ping(16.0, 880, 0.35, 0.7, 0.5); sfx.add(S.kick(0.5, 70, 36, click=0.0, seed=8), 16.0, gain=0.45)
for tt, nm in ((16.5, 'D5'), (17.0, 'F5'), (17.5, 'A5')):
    x = S.sine(N(nm), 1.6) * S.adsr(1.6, 0.01, 0.3, 0.5, 1.0) * S.expdecay(1.6, 0.9)
    sfx.add(S.reverb(S.widen(x, 0.3), 2.4, 0.5), tt, gain=0.32)
ticks(23.0, 16, 0.0375, 0.14)
# FM bell D5 at 23.6, piano-like D4 at 26.0
def bell(f, d, ratio=2.4, idx=1.2):
    t_ = S.t_of(d); mod = np.sin(2 * np.pi * f * ratio * t_) * idx * S.expdecay(d, d * 0.15)
    return np.sin(2 * np.pi * f * t_ + mod) * S.expdecay(d, d * 0.25) * S.adsr(d, 0.003, 0, 1, 0.3)
sfx.add(S.reverb(bell(N('D5'), 2.2), 2.5, 0.45), 23.6, gain=0.3)
sfx.add(S.reverb(bell(N('D4'), 2.6, 1.0, 0.9) + bell(N('D5'), 2.6, 3.0, 0.4) * 0.3, 2.8, 0.4), 26.0, gain=0.4)
sfx.add(S.kick(0.5, 70, 38, click=0.0, seed=9), 26.0, gain=0.35)
sfx.add(S.kick(0.45, 80, 42, click=0.05, seed=10), 26.5, gain=0.4); sfx.add(S.tick(0.03, 3500, seed=11), 26.5, gain=0.2)
sfx.add(S.tick(0.02, 3000, seed=12), 27.0, gain=0.12)
sfx.add(S.reverb(S.highpass(S.noise(0.4, 5), 6000) * np.sin(np.pi * np.linspace(0, 1, S.n_of(0.4))) ** 2, 1.5, 0.5), 27.6, gain=0.12)

# ------------------------------------------------------------------ bus processing + master
n_total = S.n_of(DUR)
mus = music.buf[:n_total]; drm = drums.buf[:n_total]; fx = sfx.buf[:n_total]
# sidechain ducking of the music bus by every kick
env = np.ones(n_total); tt = np.arange(n_total) / S.SR
for k in kick_times:
    i0 = S.n_of(k); seg = tt[i0:i0 + S.n_of(0.35)] - k
    env[i0:i0 + len(seg)] *= 1 - 0.45 * np.exp(-seg / 0.11)
mus = mus * env[:, None]
mus = S.reverb(mus, 1.6, 0.12, damp=4000)[:n_total]
mix = mus * 1.0 + drm * 1.0 + fx * 1.0
# gentle presence/air shelf (+~3 dB above 4 kHz) so the mix is not sub-dominated on headphones
mix = mix + 0.45 * S.highpass(mix, 4000, 1)
# hard silence 21.85-22.0 with 3 ms ramps
a, b = S.n_of(21.85), S.n_of(22.0); r = S.n_of(0.003)
gate = np.ones(n_total); gate[a:b] = 0; gate[a - r:a] = np.linspace(1, 0, r); gate[b:b + r] = np.linspace(0, 1, r)
mix *= gate[:, None]
# final fade to silence by 29.6
fo = np.interp(tt, [0, 28.6, 29.6, 30], [1, 1, 0, 0]); mix *= fo[:, None]
out = S.master(mix, target_peak=S.db(-1.0))
out *= fo[:, None]
os.makedirs(os.path.dirname(os.path.abspath(OUT)), exist_ok=True)
S.write_wav(OUT, out)
# loudness profile per second (sanity: escalation, silence gap, clean end)
prof = [20 * np.log10(np.sqrt(np.mean(out[i * S.SR:(i + 1) * S.SR] ** 2)) + 1e-9) for i in range(int(DUR))]
print('RMS dBFS per second:', ' '.join('%d:%.0f' % (i, v) for i, v in enumerate(prof)))
g = out[S.n_of(21.9):S.n_of(21.99)]; print('gap 21.9-21.99 peak: %.4f' % np.max(np.abs(g)))
print('overall RMS %.1f dBFS, peak %.3f' % (20 * np.log10(np.sqrt(np.mean(out ** 2))), np.max(np.abs(out))))
