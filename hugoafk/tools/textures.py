#!/usr/bin/env python3
"""Generate a 16x16 block-texture atlas in the Minecraft style (own artwork, procedurally
drawn: base colour + deterministic per-pixel noise + edge shading), plus a name->tile map."""
from PIL import Image
import json, hashlib, os, sys

HERE = os.path.dirname(os.path.abspath(__file__))
ASSETS = os.path.join(HERE, '..', 'render', 'assets')

TILE = 16

def rnd(x, y, salt):
    h = hashlib.md5(f'{x},{y},{salt}'.encode()).digest()
    return h[0] / 255.0

def mix(c1, c2, t):
    return tuple(round(a + (b - a) * t) for a, b in zip(c1, c2))

def noise_tile(base, spread, salt, shades=4):
    """flat noisy texture like dirt/stone/planks bases"""
    px = []
    for y in range(TILE):
        row = []
        for x in range(TILE):
            v = rnd(x, y, salt)
            step = int(v * shades) / (shades - 1) - 0.5      # -0.5..0.5 quantised
            row.append(tuple(max(0, min(255, round(c + step * spread))) for c in base))
        px.append(row)
    return px

def put(px, x, y, col):
    if 0 <= x < TILE and 0 <= y < TILE: px[y][x] = col

TEX = {}

# ---- dirt / grass / farmland
DIRT = (134, 96, 67)
TEX['dirt'] = noise_tile(DIRT, 46, 'dirt', 5)
GRASS = (91, 153, 63)
TEX['grass_top'] = noise_tile(GRASS, 42, 'grasstop', 5)
side = noise_tile(DIRT, 46, 'grassside', 5)
for y in range(4):                                   # grass overhang on the side face
    for x in range(TILE):
        if y < 2 or rnd(x, y, 'edge') > 0.42:
            side[y][x] = mix(GRASS, (60, 110, 40), rnd(x, y, 'g2') * 0.6)
TEX['grass_side'] = side
farm = noise_tile((122, 84, 52), 34, 'farm', 4)
for y in range(TILE):                                # wet farmland rows
    for x in range(TILE):
        if y % 5 in (2, 3): farm[y][x] = mix(farm[y][x], (74, 47, 25), 0.55)
TEX['farmland'] = farm

# ---- pumpkin
PUMP = (216, 127, 32)
top = noise_tile(PUMP, 22, 'ptop', 4)
for y in range(TILE):
    for x in range(TILE):
        dx, dy = x - 7.5, y - 7.5
        d = (dx * dx + dy * dy) ** 0.5
        # ridges radiate out from the stem like the vanilla texture, not as straight bars
        ang = (int((3.0 + (dy if d < 0.01 else dy / d)) * 4) + int((dx if d < 0.01 else dx / d) * 4)) % 3
        if ang == 0: top[y][x] = mix(top[y][x], (152, 86, 18), 0.42)
        elif ang == 1: top[y][x] = mix(top[y][x], (246, 168, 70), 0.24)
        if d > 6.6: top[y][x] = mix(top[y][x], (118, 62, 12), 0.55)                      # rim
for y in range(6, 10):                                                                    # 4x4 stem
    for x in range(6, 10):
        top[y][x] = mix((126, 104, 44), (92, 74, 30), rnd(x, y, 'stem'))
for x in range(6, 10):
    top[5][x] = mix(top[5][x], (88, 70, 28), 0.5)
    top[10][x] = mix(top[10][x], (74, 58, 22), 0.6)
for y in range(6, 10):
    top[y][5] = mix(top[y][5], (88, 70, 28), 0.5)
    top[y][10] = mix(top[y][10], (74, 58, 22), 0.6)
TEX['pumpkin_top'] = top
sidep = noise_tile(PUMP, 26, 'pside', 4)
for y in range(TILE):
    for x in range(TILE):
        if x % 5 == 0: sidep[y][x] = mix(sidep[y][x], (150, 84, 18), 0.62)              # vertical ridges
        elif x % 5 == 1: sidep[y][x] = mix(sidep[y][x], (245, 165, 66), 0.35)           # highlight next to it
        if y == 0: sidep[y][x] = mix(sidep[y][x], (255, 200, 120), 0.25)
        if y == TILE - 1: sidep[y][x] = mix(sidep[y][x], (90, 50, 12), 0.35)
TEX['pumpkin_side'] = sidep

# ---- spawner cage
cage = noise_tile((36, 42, 50), 22, 'cage', 4)
for y in range(TILE):
    for x in range(TILE):
        onbar = (x % 4 == 0) or (y % 4 == 0) or x in (15,) or y in (15,)
        if onbar: cage[y][x] = mix((92, 104, 118), (58, 68, 80), rnd(x, y, 'bar'))
        else: cage[y][x] = mix((16, 18, 24), (26, 30, 38), rnd(x, y, 'hole'))
TEX['spawner'] = cage

# ---- oak planks / stone
pl = noise_tile((160, 124, 76), 30, 'planks', 4)
for y in range(TILE):
    for x in range(TILE):
        if y % 8 == 0: pl[y][x] = mix(pl[y][x], (96, 70, 38), 0.75)
        if (y // 8) % 2 == 0 and x == 5: pl[y][x] = mix(pl[y][x], (96, 70, 38), 0.6)
        if (y // 8) % 2 == 1 and x == 11: pl[y][x] = mix(pl[y][x], (96, 70, 38), 0.6)
TEX['oak_planks'] = pl
TEX['stone'] = noise_tile((126, 126, 126), 34, 'stone', 5)

# ---- chest front
ch = noise_tile((150, 106, 52), 26, 'chest', 4)
for y in range(TILE):
    for x in range(TILE):
        if y in (0, 15) or x in (0, 15): ch[y][x] = mix(ch[y][x], (78, 52, 22), 0.7)
        if y == 5: ch[y][x] = mix(ch[y][x], (78, 52, 22), 0.8)
        if 6 <= x <= 9 and 4 <= y <= 8: ch[y][x] = mix((60, 60, 66), (36, 36, 42), rnd(x, y, 'latch'))
TEX['chest'] = ch

# ---- iron / obsidian-ish accents used by the bot
TEX['iron_block'] = noise_tile((214, 214, 214), 26, 'ironb', 4)
TEX['violet_block'] = noise_tile((150, 88, 220), 40, 'violet', 5)
TEX['red_block'] = noise_tile((205, 45, 45), 40, 'redb', 5)


# ---- wood / leaves / stone / water / sand  (added for the high-quality world)
log_side = noise_tile((104, 82, 46), 30, 'logside', 4)
for y in range(TILE):
    for x in range(TILE):
        if x in (0, 15): log_side[y][x] = mix(log_side[y][x], (58, 44, 22), 0.7)
        if (x * 7 + y * 3) % 11 == 0: log_side[y][x] = mix(log_side[y][x], (62, 46, 24), 0.55)
TEX['oak_log_side'] = log_side
log_top = noise_tile((150, 118, 68), 26, 'logtop', 4)
for y in range(TILE):
    for x in range(TILE):
        d = max(abs(x - 7.5), abs(y - 7.5))
        if d > 6.2: log_top[y][x] = mix(log_top[y][x], (86, 66, 34), 0.75)
        elif d < 2.0: log_top[y][x] = mix(log_top[y][x], (96, 74, 40), 0.5)
        elif int(d) % 2 == 0: log_top[y][x] = mix(log_top[y][x], (110, 86, 48), 0.35)
TEX['oak_log_top'] = log_top
leaves = noise_tile((58, 118, 42), 48, 'leaves', 6)
for y in range(TILE):
    for x in range(TILE):
        if rnd(x, y, 'leafhole') > 0.86: leaves[y][x] = mix(leaves[y][x], (28, 62, 22), 0.85)
        elif rnd(x, y, 'leaflight') > 0.80: leaves[y][x] = mix(leaves[y][x], (110, 176, 78), 0.6)
TEX['oak_leaves'] = leaves
cob = noise_tile((124, 124, 124), 40, 'cobble', 5)
for y in range(TILE):
    for x in range(TILE):
        cx, cy = (x // 4) * 4 + 2, (y // 4) * 4 + 2
        if abs(x - cx) + abs(y - cy) >= 3: cob[y][x] = mix(cob[y][x], (74, 74, 74), 0.7)
TEX['cobblestone'] = cob
wat = noise_tile((44, 88, 200), 30, 'water', 5)
for y in range(TILE):
    for x in range(TILE):
        if (x + y * 2) % 7 < 2: wat[y][x] = mix(wat[y][x], (92, 140, 236), 0.55)
TEX['water'] = wat
TEX['sand'] = noise_tile((219, 205, 158), 26, 'sand', 4)
# wheat-like crop rows for the farmland tops
crop = noise_tile((122, 84, 52), 30, 'crop', 4)
for y in range(TILE):
    for x in range(TILE):
        if x % 4 in (1, 2) and 2 <= y <= 13:
            crop[y][x] = mix((176, 154, 62), (208, 190, 96), rnd(x, y, 'wheat'))
        if y % 5 in (2, 3): crop[y][x] = mix(crop[y][x], (74, 47, 25), 0.35)
TEX['farmland_crop'] = crop
# player skin / clothing
skin = noise_tile((214, 168, 126), 14, 'skin', 3)
TEX['player_skin'] = skin
face = [row[:] for row in skin]
for (x, y) in [(4, 6), (5, 6), (10, 6), (11, 6)]:
    put(face, x, y, (58, 58, 74))
for (x, y) in [(4, 7), (5, 7), (10, 7), (11, 7)]:
    put(face, x, y, (240, 240, 245))
for x in range(6, 10): put(face, x, 10, (150, 104, 84))
for x in range(2, 14):
    for y in range(0, 4):
        if rnd(x, y, 'hair') > 0.15: put(face, x, y, mix((66, 44, 28), (98, 66, 40), rnd(x, y, 'h2')))
TEX['player_face'] = face
head_side = [row[:] for row in skin]
for x in range(2, 14):
    for y in range(0, 4):
        if rnd(x, y, 'hair2') > 0.12: put(head_side, x, y, mix((66, 44, 28), (98, 66, 40), rnd(x, y, 'h3')))
for x in range(0, 3):
    for y in range(0, 12):
        if rnd(x, y, 'hair3') > 0.25: put(head_side, x, y, mix((66, 44, 28), (92, 62, 38), rnd(x, y, 'h4')))
TEX['player_head_side'] = head_side
TEX['player_shirt'] = noise_tile((124, 62, 190), 30, 'shirt', 4)
TEX['player_pants'] = noise_tile((52, 48, 92), 26, 'pants', 4)
TEX['player_shoe'] = noise_tile((58, 46, 40), 22, 'shoe', 3)

names = list(TEX)
cols = 8
rows = (len(names) + cols - 1) // cols
atlas = Image.new('RGBA', (cols * TILE, rows * TILE), (0, 0, 0, 0))
for i, n in enumerate(names):
    ox, oy = (i % cols) * TILE, (i // cols) * TILE
    for y in range(TILE):
        for x in range(TILE):
            atlas.putpixel((ox + x, oy + y), TEX[n][y][x] + (255,))
atlas.save(os.path.join(ASSETS, 'tex.png'))
idx = {n: i for i, n in enumerate(names)}
open(os.path.join(ASSETS, 'tex_meta.js'), 'w').write(
    'window.TEX_META = ' + json.dumps({'tile': TILE, 'cols': cols, 'rows': rows, 'index': idx}) + ';\n')
if len(sys.argv) > 1:                       # optional 8x preview
    atlas.resize((atlas.size[0] * 8, atlas.size[1] * 8), Image.NEAREST).save(sys.argv[1])
print('atlas', atlas.size, len(names), 'textures:', ', '.join(names))
