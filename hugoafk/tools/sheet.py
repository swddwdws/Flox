#!/usr/bin/env python3
"""Contact sheet of rendered frames with timestamps, for visual QA.
usage: sheet.py --frames out/frames --every 15 --cols 5 --out out/sheet.png [--start 0 --end 900] [--scale 0.2]
"""
import argparse, glob, os, re
from PIL import Image, ImageDraw, ImageFont
ap = argparse.ArgumentParser()
ap.add_argument('--frames', default='out/frames'); ap.add_argument('--every', type=int, default=15)
ap.add_argument('--cols', type=int, default=5); ap.add_argument('--out', default='out/sheet.png')
ap.add_argument('--start', type=int, default=0); ap.add_argument('--end', type=int, default=900)
ap.add_argument('--scale', type=float, default=0.2); ap.add_argument('--list', default='')
a = ap.parse_args()
if a.list:
    idx = [int(x) for x in a.list.split(',')]
else:
    idx = list(range(a.start, a.end, a.every))
files = [(i, os.path.join(a.frames, f'f{i:04d}.png')) for i in idx]
files = [(i, f) for i, f in files if os.path.exists(f)]
if not files: raise SystemExit('no frames found')
w, h = int(1080 * a.scale), int(1920 * a.scale)
rows = (len(files) + a.cols - 1) // a.cols
sheet = Image.new('RGB', (a.cols * w, rows * (h + 26)), (20, 20, 20))
d = ImageDraw.Draw(sheet)
try: font = ImageFont.truetype(os.path.join(os.path.dirname(__file__), '..', 'render', 'fonts', 'JetBrainsMono.ttf'), 18)
except Exception: font = ImageFont.load_default()
for n, (i, f) in enumerate(files):
    im = Image.open(f).convert('RGB').resize((w, h), Image.LANCZOS)
    x, y = (n % a.cols) * w, (n // a.cols) * (h + 26)
    sheet.paste(im, (x, y + 26))
    d.text((x + 6, y + 4), f'f{i:04d}  t={i/30:.2f}s', fill=(255, 255, 255), font=font)
os.makedirs(os.path.dirname(a.out) or '.', exist_ok=True)
sheet.save(a.out)
print('wrote', a.out, sheet.size, 'frames:', len(files))
