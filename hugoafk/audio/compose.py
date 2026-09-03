#!/usr/bin/env python3
"""compose.py — synthesised soundtrack for the HugoAFK launch trailer.
120 BPM, 30.0 s, stereo 48 kHz. Nostalgic night intro -> beat drop on the logo ->
driving feature section with pixel blips -> calm trust break -> build -> final drop.
usage: python3 audio/compose.py [out/audio.wav]
"""
import os, sys
import numpy as np
import synth as S

OUT = sys.argv[1] if len(sys.argv) > 1 else os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'out', 'audio.wav')
BPM, DUR = 120, 30.0
BEAT, BAR = 60 / BPM, 240 / BPM
N = S.note


# --- bar-locked cut grid (render/timeline.js): cuts at 3 6 9 12 15 17 20 23 26 ---
# s06 plays its 2.5 s of content in 2.0 s; everything from 17.5 on moves 0.5 s earlier.
def RT(t):
    if t < 17.5: return t                              # s06 plays at 1:1
    if t < 20.5: return 17.5 + (t - 17.5) * (2.5 / 3)  # s07 is compressed instead
    return t - 0.5

music = S.Mix(DUR + 4)   # pads, arp, bass, drone (ducked by the kicks)
drums = S.Mix(DUR + 4)
sfx = S.Mix(DUR + 4)
kick_times = []

def add_kick(t, gain=0.85, f0=150, f1=46, click=0.95):
    drums.add(S.kick(0.6, f0, f1, click=click, seed=int(t * 100) % 97), t, gain=gain); kick_times.append(t)
def add_hat(t, gain=0.26, open_=False, tone=9500, p=0.0):
    drums.add(S.hat(0.05, tone, open_=open_, seed=int(t * 1000) % 89), t, gain=gain, p=p)
def add_snare(t, gain=0.55):
    drums.add(S.snare(0.3, seed=int(t * 100) % 83), t, gain=gain)

# 8-bit style blip (square + fast decay) — the "pixel" voice of the film
def blip8(f, d=0.11, duty=0.5, seed=1):
    x = S.square(f, d, duty) * 0.6 + S.sine(f * 2, d) * 0.2
    return S.bitcrush(x, 7, 2) * S.expdecay(d, d * 0.30) * S.adsr(d, 0.002, 0, 1, d * 0.4)
def blip_up(t, f, gain=0.3, d=0.11, p=0.0):
    sfx.add(S.reverb(blip8(f, d), 1.1, 0.28), t, gain=gain, p=p)

# ------------------------------------------------------------------ foundation
# sub drone: quiet at night, strong from the drop, gone in the silence gap
env = np.interp(np.arange(S.n_of(DUR)) / S.SR,
                [0, 0.25, 2.6, 3.0, 3.05, RT(20.5), RT(20.6), RT(23.5), RT(26.35), RT(26.36), RT(26.5), RT(26.55), 28.8, 29.6, 30],
                [0, .72, .80, .45, 1.0, 1.0, .55, .85, .85, 0, 0, 1.0, .6, 0, 0])
music.add(S.stereo(S.drive(S.drone(N('D1'), DUR, fc=150, lfo=0.2), 1.25) * env), 0.0, gain=0.11)
# night room tone
music.add(S.stereo(S.lowpass(S.noise(DUR, 99, 'pink'), 1400) * np.interp(np.arange(S.n_of(DUR)) / S.SR, [0, 1, RT(26.3), RT(26.4), RT(26.5), 29, 30], [0, 1, 1, 0, 1, 1, 0])), 0, gain=0.007)

# ------------------------------------------------------------------ intro 0-3
# three soft melody notes, nostalgic and open (D - A - F)
for tt, nm, g in ((0.15, 'D4', 0.30), (1.9, 'A4', 0.22), (2.4, 'F4', 0.18)):
    x = S.sine(N(nm), 2.0) * S.adsr(2.0, 0.05, 0.5, 0.35, 1.2) * S.expdecay(2.0, 1.1)
    x[:S.n_of(1.2)] += S.sine(N(nm) * 2, 1.2) * S.expdecay(1.2, 0.25) * 0.18
    sfx.add(S.reverb(S.widen(x, 0.35), 2.6, 0.45), tt, gain=g)
sfx.add(S.reverb(S.sine(N('D2'), 1.6) * S.adsr(1.6, 0.02, 0.3, 0.5, 0.9) * S.expdecay(1.6, 0.8), 2.4, 0.35), 0.0, gain=0.30)
sfx.add(S.reverb(S.highpass(S.noise(0.9, 12), 3000) * np.linspace(1, 0, S.n_of(0.9)) ** 1.6, 1.8, 0.4), 0.0, gain=0.10)
# power-off at 1.0: descending filtered noise + pitch-down sine, then a click
n = S.n_of(0.55); f = 700 * (60 / 700) ** np.linspace(0, 1, n) ** 0.7
po = S.sine(f, 0.55) * np.linspace(1, 0, n) ** 1.4
po += S.sweep_filter(S.noise(0.55, 7), 6000 * (200 / 6000) ** np.linspace(0, 1, n), 'low', 2) * np.linspace(0.8, 0, n) ** 1.2
sfx.add(S.reverb(po, 1.4, 0.3), 1.0, gain=0.55)
sfx.add(S.tick(0.02, 1800, seed=3), 1.0, gain=0.35)
# the bot wakes up: rising violet shimmer before the drop
sfx.add(S.riser(0.9, 200, 2600, 0.55, seed=11) * 0.9, 1.55, gain=0.30)
sfx.add(S.riser(1.4, 120, 5000, 0.7, seed=12), 1.6, gain=0.42)
sfx.add(S.reverse_cymbal(0.7, seed=13), 2.3, gain=0.42)

# ------------------------------------------------------------------ the drop at 3.0
sfx.add(S.sub_drop(1.5, 95, 34), 3.0, gain=0.55)
big = S.braam(3.0, N('D2'), attack=0.05, detune=(0, 6, -6, -1200, 1200, 1907), fc=(300, 3400), drive_amt=2.8, seed=21)
sfx.add(S.reverb(big, 2.8, 0.30, damp=3000), 3.0, gain=0.85)
sfx.add(S.impact(2.4, 52, seed=22), 3.0, gain=0.6)
sfx.add(S.highpass(S.noise(0.22, 5) * S.expdecay(0.22, 0.035), 1800), 3.0, gain=0.45)

# ------------------------------------------------------------------ chords
PAD = [  # (start, end, notes, gain, lowpass, attack)
    (3.0, 6.0, ['D3', 'F3', 'A3', 'D4'], 0.20, 2200, 0.25),
    (6.0, 9.0, ['D3', 'F3', 'A3', 'D4'], 0.27, 2600, 0.30),
    (9.0, 12.0, ['A#2', 'D3', 'F3', 'A#3'], 0.27, 2600, 0.30),
    (12.0, 15.0, ['C3', 'E3', 'G3', 'C4'], 0.27, 2600, 0.30),
    (15.0, RT(17.5), ['A2', 'C3', 'E3', 'A3'], 0.27, 2600, 0.30),
    (RT(17.5), RT(20.5), ['D3', 'F3', 'A3', 'D4'], 0.27, 2600, 0.30),
    (RT(20.5), RT(23.5), ['F3', 'A3', 'C4', 'F4', 'G4'], 0.30, 1500, 0.7),   # the calm trust beat
    (RT(23.5), RT(26.35), ['D3', 'F3', 'A3', 'D4'], 0.20, 2400, 0.35),
    (RT(26.5), 29.8, ['D3', 'F3', 'A3', 'E4', 'D4'], 0.30, 3000, 0.8),   # end card shimmer
]
for i, (a, b, ch, g, fc, att) in enumerate(PAD):
    x = S.pad([N(x) for x in ch], b - a + 1.4, attack=att, release=1.2, fc=fc, detune=7, seed=30 + i)
    if a >= RT(26.5): x = S.highpass(x, 180)
    music.add(x, a, gain=g)

# ------------------------------------------------------------------ arpeggio (the "game" voice)
ARP = ['D4', 'A4', 'D5', 'F5', 'A5', 'F5', 'D5', 'A4']
def arp(start, end, gain=0.15, octave=0, step=0.25):
    t, i = start, 0
    while t < end - 1e-6:
        f = N(ARP[i % len(ARP)]) * 2 ** octave
        music.add(blip8(f, 0.13, 0.35, seed=i) * 0.9, t, gain=gain, p=0.5 * np.sin(i * 0.8))
        t += BEAT * step; i += 1
arp(3.5, 6.0, 0.34)
arp(6.0, 12.0, 0.42)
arp(12.0, RT(17.5), 0.42)
arp(RT(17.5), RT(20.5), 0.40)
arp(RT(23.5), RT(25.0), 0.42)
arp(RT(25.0), RT(26.35), 0.46, octave=1, step=0.125)

# ------------------------------------------------------------------ bass
for a, b, root in ((3.0, 6.0, 'D2'), (6.0, 9.0, 'D2'), (9.0, 12.0, 'A#1'), (12.0, 15.0, 'C2'),
                   (15.0, RT(17.5), 'A1'), (RT(17.5), RT(20.5), 'D2'), (RT(23.5), RT(26.35), 'D2')):
    t, i = a, 0
    while t < b - 1e-6:
        f = N(root) * (2 ** (7 / 12) if i % 8 == 6 else 1)
        x = S.saw(f, BEAT * 0.45) * 0.6 + S.square(f, BEAT * 0.45, 0.5) * 0.3
        x = S.lowpass(x, 750) * S.adsr(BEAT * 0.45, 0.004, 0.08, 0.7, 0.08)
        music.add(S.drive(x, 2.4), t, gain=0.34)
        t += BEAT / 2; i += 1

# ------------------------------------------------------------------ drums
t = 3.0                                        # main groove 3.0 - 20.5
while t < RT(20.5) - 1e-6:
    i = round((t - 3.0) / BEAT)
    add_kick(t, 0.95)
    if i % 2 == 1: add_snare(t, 0.50)
    add_hat(t + BEAT / 2, 0.30, open_=(i % 4 == 3), p=0.25 * (1 if i % 2 else -1))
    if t >= 6.0: add_hat(t, 0.17, tone=11500)
    t += BEAT
# build 23.5 - 26.35: 8ths, then 16ths, hats to 32nds
t = RT(23.5)
while t < RT(25.0) - 1e-6:
    add_kick(t, 0.9); add_hat(t + BEAT / 4, 0.13); t += BEAT / 2
t = RT(25.0)
while t < RT(26.35) - 1e-6:
    add_kick(t, 0.85, 160, 48); t += BEAT / 4
t = RT(25.0); i = 0
while t < 26.35 - 1e-6:
    add_snare(t, 0.14 + 0.40 * (t - RT(25.0)) / 1.35); add_hat(t + BEAT / 16, 0.11, tone=10500, p=0.3 * (1 if i % 2 else -1))
    t += BEAT / 8; i += 1
# end card half-time kicks
for tt in (RT(26.5), RT(27.5), RT(28.5)):
    add_kick(tt, 0.9, 130, 46, 0.5); drums.add(S.boom_tail(1.2, 46) * 0.8, tt, gain=0.3)

# ------------------------------------------------------------------ scene braams / whooshes / cues
def whoosh(t, d=0.35, f0=200, f1=6000, pf=-0.8, pt=0.8, gain=0.4, curve=1.0):
    x = S.whoosh(d, f0, f1, seed=int(t * 100) % 71, curve=curve)
    sfx.add(S.pan(x, np.linspace(pf, pt, len(x))), t, gain=gain)
def braam(t, d=1.8, gain=0.5, root='D2'):
    x = S.braam(d, N(root), attack=0.5, detune=(0, 6, -6, -1200, 1200), fc=(180, 2600), drive_amt=2.3, seed=int(t * 10) % 57)
    sfx.add(S.reverb(x, 2.0, 0.26, damp=3200), t, gain=gain)

for tt in (6.0, 9.0, 12.0, 15.0, RT(17.5)):
    braam(tt, 1.8, 0.42)
    whoosh(tt - 0.35, 0.35, 200, 6000, -0.8, 0.8, 0.38)
    sfx.add(S.kick(0.5, 95, 40, click=0.1, seed=int(tt)), tt, gain=0.35)
# s03 cloud: soft data ticks, then a 24/7 badge blip
for i in range(6):
    sfx.add(S.tick(0.02, 2600 + i * 200, seed=40 + i), 6.6 + i * 0.25, gain=0.12, p=0.4 * ((i % 3) - 1))
blip_up(8.4, N('A5'), 0.26)
# s04 farm: an item pop on every 16th
t, i = 9.25, 0
while t < 11.6:
    blip_up(t, N('D5') * 2 ** ((i % 4) * 2 / 12), 0.10 + 0.02 * (i % 3), 0.08, p=0.5 * np.sin(i * 1.1))
    t += BEAT / 4; i += 1
# s05 sell macro: slot fills, typing, the sell swoosh, confirmation
t, i = 12.1, 0
while t < 12.75:
    sfx.add(S.tick(0.02, 2200 + 260 * i, seed=60 + i), t, gain=0.16); t += BEAT / 4; i += 1
sfx.add(S.glitch_stutter(0.12, N('A5'), seed=61, rate=1 / 32, bpm=BPM), 12.72, gain=0.30)
for i in range(6):
    sfx.add(S.tick(0.015, 1500 + 180 * i, seed=70 + i), 12.85 + i * 0.045, gain=0.16)
whoosh(13.2, 0.4, 5000, 250, 0.5, -0.5, 0.42, 0.7)
for i, nm in enumerate(('D5', 'F5', 'A5')):
    blip_up(13.42 + i * 0.07, N(nm), 0.28, 0.10)
# s06 world reset: alarm, disconnect, waiting ticks, reconnect
for i in range(3):
    sfx.add(S.reverb(blip8(N('A4'), 0.18, 0.5, seed=80 + i), 1.4, 0.35), 15.02 + i * 0.18, gain=0.30)
n = S.n_of(0.5); fdown = 900 * (90 / 900) ** np.linspace(0, 1, n)
sfx.add(S.reverb(S.sine(fdown, 0.5) * np.linspace(1, 0, n) ** 1.3, 1.6, 0.35), RT(15.4), gain=0.42)
sfx.add(S.glitch_stutter(0.3, N('D5'), seed=82, rate=1 / 16, bpm=BPM), RT(15.42), gain=0.30)
for i in range(5):
    sfx.add(S.tick(0.02, 1400, seed=90 + i), 15.95 + i * 0.1, gain=0.12)
n = S.n_of(0.45); fup = 200 * (900 / 200) ** np.linspace(0, 1, n)
sfx.add(S.reverb(S.sine(fup, 0.45) * np.linspace(0, 1, n) ** 0.6 * S.expdecay(0.45, 0.3), 1.8, 0.4), RT(16.4), gain=0.42)
for i, nm in enumerate(('D5', 'A5')):
    blip_up(RT(16.9) + i * 0.09, N(nm), 0.30, 0.12)
# s07 phone: console ticks, a tap, restart confirmation
t, i = RT(17.7), 0
while t < RT(19.0):
    sfx.add(S.tick(0.015, 2000 + 140 * (i % 5), seed=110 + i), t, gain=0.10); t += 0.13; i += 1
sfx.add(S.reverb(blip8(N('F4'), 0.13, 0.25, seed=120), 1.2, 0.3), RT(19.0), gain=0.34)
sfx.add(S.kick(0.35, 110, 55, click=0.2, seed=121), RT(19.0), gain=0.35)
for i, nm in enumerate(('D5', 'A5')):
    blip_up(RT(19.6) + i * 0.08, N(nm), 0.28, 0.11)
# s08 trust break: warm swell, seal assembly ticks, confirmation ping
sfx.add(S.reverse_cymbal(0.9, seed=130), RT(20.1), gain=0.35)
for i in range(8):
    sfx.add(S.tick(0.02, 1700 + 120 * i, seed=140 + i), 20.55 + i * 0.045, gain=0.13, p=0.5 * ((i % 3) - 1))
x = S.sine(N('D5'), 1.8) * S.expdecay(1.8, 0.5) * S.adsr(1.8, 0.004, 0.2, 0.6, 1.0)
x[:S.n_of(1.4)] += S.sine(N('A5'), 1.4) * S.expdecay(1.4, 0.35) * 0.4
sfx.add(S.reverb(S.widen(x, 0.4), 2.6, 0.5), RT(20.9), gain=0.34)
for tt, nm in ((RT(21.2), 'F5'), (RT(21.6), 'A5'), (RT(22.2), 'D5')):
    sfx.add(S.reverb(S.sine(N(nm), 1.2) * S.expdecay(1.2, 0.4) * S.adsr(1.2, 0.005, 0.2, 0.6, 0.6), 2.2, 0.45), tt, gain=0.20)
# s09 build: riser, stutter gates, reverse cymbal, hard silence
nb = S.n_of(2.85); fr = N('A2') * (N('A4') / N('A2')) ** np.linspace(0, 1, nb) ** 1.2
sfx.add(S.sine(fr, 2.85) * np.linspace(0.2, 1, nb) ** 2, RT(23.5), gain=0.24)
sfx.add(S.sweep_filter(S.noise(2.85, 150), 200 * (12000 / 200) ** np.linspace(0, 1, nb) ** 1.5, 'high') * np.linspace(0.1, 1, nb) ** 2.5, RT(23.5), gain=0.42)
for i, tt in enumerate([RT(25.0), RT(25.5), RT(25.75), RT(26.0), RT(26.125), RT(26.25)]):
    sfx.add(S.glitch_stutter(0.2 if tt < 26 else 0.11, N('D5') * 2 ** (i / 12), seed=160 + i, rate=1 / 16 if tt < 26 else 1 / 32, bpm=BPM), tt, gain=0.34 + 0.03 * i)
sfx.add(S.reverse_cymbal(0.85, seed=170), RT(25.5), gain=0.6)
whoosh(RT(23.15), 0.35, 200, 6000, -0.8, 0.8, 0.4)
# s10 end card: final impact, pill thump, sweep shimmer
sfx.add(S.sub_drop(1.4, 95, 34), RT(26.5), gain=0.55)
fin = S.braam(3.4, N('D2'), attack=0.05, detune=(0, 5, -5, -1200, 1200, 1900, 2400), fc=(400, 3600), drive_amt=3.0, seed=180)
sfx.add(S.reverb(fin, 3.2, 0.34, damp=2800), RT(26.5), gain=0.9)
sfx.add(S.impact(2.6, 50, seed=181), RT(26.5), gain=0.6)
sfx.add(S.highpass(S.noise(0.25, 6) * S.expdecay(0.25, 0.04), 1600), RT(26.5), gain=0.45)
for i, nm in enumerate(('D5', 'A5', 'D6')):
    blip_up(RT(26.95) + i * 0.1, N(nm), 0.30, 0.14)
sfx.add(S.reverb(S.highpass(S.noise(1.2, 9), 5000) * np.linspace(1, 0, S.n_of(1.2)) ** 2, 2.2, 0.5), RT(26.5), gain=0.16)
sfx.add(S.kick(0.45, 85, 44, click=0.05, seed=182), RT(27.9), gain=0.38)
sfx.add(S.tick(0.03, 3200, seed=183), RT(27.9), gain=0.18)
sfx.add(S.reverb(S.highpass(S.noise(0.45, 8), 6500) * np.sin(np.pi * np.linspace(0, 1, S.n_of(0.45))) ** 2, 1.6, 0.5), RT(28.6), gain=0.14)
whoosh(RT(28.2), 0.9, 300, 2500, -0.5, 0.5, 0.09)

# ------------------------------------------------------------------ bus processing + master
n_total = S.n_of(DUR)
mus, drm, fx = music.buf[:n_total], drums.buf[:n_total], sfx.buf[:n_total]
env_sc = np.ones(n_total); tt = np.arange(n_total) / S.SR
for k in kick_times:
    i0 = S.n_of(k); seg = tt[i0:i0 + S.n_of(0.35)] - k
    env_sc[i0:i0 + len(seg)] *= 1 - 0.42 * np.exp(-seg / 0.11)
mus = S.reverb(mus * env_sc[:, None], 1.5, 0.12, damp=4200)[:n_total]
mix = mus + drm + fx
mix = mix + 0.6 * S.highpass(mix, 3500, 1) + 0.3 * S.bandpass(mix, 1400, 1.1, 2)   # presence/air shelf
mix = mix - 0.5 * S.lowpass(mix, 95, 2)                                            # low shelf: frees headroom for the mids
# hard silence 26.35-26.5 with 3 ms ramps
a, b = S.n_of(RT(26.35)), S.n_of(RT(26.5)); r = S.n_of(0.003)
gate = np.ones(n_total); gate[a:b] = 0; gate[a - r:a] = np.linspace(1, 0, r); gate[b:b + r] = np.linspace(0, 1, r)
mix *= gate[:, None]
fo = np.interp(tt, [0, 28.6, 29.6, 30], [1, 1, 0, 0]); mix *= fo[:, None]
if os.environ.get('NOMUSIC') == '1':
    # SFX-only variant: no score, no drums — for laying a licensed track over the video
    # inside the TikTok editor (the cuts sit on a 120 BPM grid).
    m2 = fx * 0.85
    m2 = m2 + 0.5 * S.highpass(m2, 3500, 1)
    m2 *= gate[:, None]; m2 *= fo[:, None]
    mix = m2
out = S.master(mix, target_tp=S.db(float(os.environ.get('TP', -4.5)))) * fo[:, None]
out *= gate[:, None]        # re-apply after mastering: the master high-pass rings into the gap
os.makedirs(os.path.dirname(os.path.abspath(OUT)), exist_ok=True)
S.write_wav(OUT, out)
prof = [20 * np.log10(np.sqrt(np.mean(out[i * S.SR:(i + 1) * S.SR] ** 2)) + 1e-9) for i in range(int(DUR))]
print('RMS dBFS/s:', ' '.join('%d:%.0f' % (i, v) for i, v in enumerate(prof)))
print('silence gap %.2f-%.2f peak: %.4f' % (RT(26.35), RT(26.5), float(np.max(np.abs(out[S.n_of(RT(26.35)) + 200:S.n_of(RT(26.5)) - 200])))))
print('overall RMS %.1f dBFS, peak %.3f' % (20 * np.log10(np.sqrt(np.mean(out ** 2))), np.max(np.abs(out))))
