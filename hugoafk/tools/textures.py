#!/usr/bin/env python3
"""Generate the 16x16 block-texture atlas for DIE SCHICHT (render/assets/tex.png) plus the
name -> tile map (render/assets/tex_meta.js).

Own artwork in the Minecraft idiom — nothing is traced or downloaded. Every tile is drawn
procedurally: a base colour, a hand-authored structure (ribs, rings, bark, mortar, stalks)
and a deterministic per-pixel noise keyed on md5(x, y, salt), so two runs of this file always
produce a byte-identical PNG.

WRITTEN FOR MAGNIFICATION. In this film a near block fills 300-500 px of a 1080 px frame, so
one texel is 20-30 px across and every tile is under a microscope. Two rules follow, and they
are why this file looks the way it does:

  1 STRUCTURE OVER SPECKLE. A single 1 px dark column reads as a plank seam at 30x, not as a
    pumpkin rib. Structure is authored as whole columns / rings / cells with a light side and
    a shade side, so it still reads as a rounded form when one texel is 30 px tall.

  2 MULTIPLICATIVE NOISE. The old additive noise walked R, G and B by the same absolute
    amount, which drags every colour towards grey — that is what turned the pumpkins into
    tan crates. nz() multiplies instead, so noise changes brightness and never saturation.

Also remember what the renderer does to these pixels before anyone sees them
(engine.js texFace + mc_world.js drawCell):
    top face   level 0  -> +10 % white
    front face level 1  -> 20 % black, plus a baked vertical AO gradient to 26 % at the foot
    side face  level 2  -> 42 % black
A tile that is only just bright enough in this atlas is muddy on the front face and black on
the side face. Everything here is authored with the level-1 dim already in mind.

Usage:  python3 tools/textures.py [preview.png]      (the optional argument writes an 8x
        nearest-neighbour preview of the whole atlas)
"""
from PIL import Image
import json, hashlib, math, os, sys

HERE = os.path.dirname(os.path.abspath(__file__))
ASSETS = os.path.join(HERE, '..', 'render', 'assets')

TILE = 16

# ---------------------------------------------------------------- deterministic helpers
def rnd(x, y, salt):
    """0..1, a pure function of (x, y, salt). No RNG state, no clock — rerunning this file
       must reproduce tex.png byte for byte."""
    h = hashlib.md5(f'{x},{y},{salt}'.encode()).digest()
    return h[0] / 255.0

def clamp(v):
    return max(0, min(255, int(round(v))))

def mul(c, k):
    """scale brightness, keep hue + saturation"""
    return tuple(clamp(v * k) for v in c)

def mix(c1, c2, t):
    return tuple(clamp(a + (b - a) * t) for a, b in zip(c1, c2))

def step(x, y, salt, shades):
    """quantised -0.5 .. +0.5 — quantised because Minecraft textures are painted in a few
       discrete tones per block, not in a continuous gradient."""
    return int(rnd(x, y, salt) * shades) / (shades - 1) - 0.5

def nz(base, amt, salt, shades=4):
    """flat tile with multiplicative quantised noise. `amt` is the full peak-to-peak
       brightness swing (0.30 = +-15 %)."""
    return [[mul(base, 1 + step(x, y, salt, shades) * amt) for x in range(TILE)]
            for y in range(TILE)]

def put(px, x, y, col):
    if 0 <= x < TILE and 0 <= y < TILE:
        px[y][x] = col

def edge(px, k=0.72):
    """1 px darker border — reads as the block's own edge when a face fills 400 px"""
    for i in range(TILE):
        px[0][i] = mul(px[0][i], k)
        px[TILE - 1][i] = mul(px[TILE - 1][i], k)
        px[i][0] = mul(px[i][0], k)
        px[i][TILE - 1] = mul(px[i][TILE - 1], k)

TEX = {}
# NOTE: insertion order IS the atlas order and tex_meta.js indexes by it, and other modules
# cache faces by name. Never add, remove or reorder an entry — only repaint its pixels.

# ---------------------------------------------------------------- dirt / grass / farmland
DIRT = (136, 98, 68)
dirt = nz(DIRT, 0.34, 'dirt', 5)
for y in range(TILE):
    for x in range(TILE):
        if rnd(x, y, 'grit') > 0.88:
            dirt[y][x] = mul(dirt[y][x], 0.76)          # small pebbles / clods
TEX['dirt'] = dirt

GRASS = (94, 164, 60)
grass = nz(GRASS, 0.26, 'grasstop', 5)
for y in range(TILE):
    for x in range(TILE):
        v = rnd(x, y, 'blade')
        if v > 0.87:
            grass[y][x] = mul(grass[y][x], 0.82)        # blade shadows
        elif v < 0.11:
            grass[y][x] = mul(grass[y][x], 1.14)        # sunlit tips
TEX['grass_top'] = grass

# grass_side: dirt with a contiguous grass fringe whose bottom edge is ragged but connected
side = nz(DIRT, 0.34, 'grassside', 5)
GRASS_S = mul(GRASS, 0.94)
for x in range(TILE):
    depth = 3 + (1 if rnd(x, 0, 'fringe') > 0.45 else 0) + (1 if rnd(x, 1, 'fringe2') > 0.80 else 0)
    for y in range(depth):
        side[y][x] = mul(GRASS_S, 1 + step(x, y, 'gs2', 4) * 0.22)
    side[depth][x] = mix(side[depth][x], mul(GRASS_S, 0.70), 0.55)   # the earthy root line
TEX['grass_side'] = side

# farmland: moist tilled earth. Soft furrows every 5 rows — the field's own corduroy, kept
# low-contrast so it does not read as planks at 30x.
FARM = (120, 84, 52)
farm = nz(FARM, 0.26, 'farm', 4)
for y in range(TILE):
    for x in range(TILE):
        if y % 5 in (2, 3):
            farm[y][x] = mix(farm[y][x], (74, 48, 26), 0.42)
        elif y % 5 == 4:
            farm[y][x] = mul(farm[y][x], 1.06)          # the lit crest above each furrow
        if rnd(x, y, 'clod') > 0.90:
            farm[y][x] = mul(farm[y][x], 0.82)
TEX['farmland'] = farm

# ---------------------------------------------------------------- pumpkin
# The product is a pumpkin farm, so these two tiles carry the film.
PUMP = (222, 130, 28)                                   # ~ MC.C.KUERBIS #D9821B
PUMP_S = (231, 136, 29)                                 # the side face is dimmed twice; see below

# --- pumpkin_top: orange flesh, eight soft lobes, and a STEM that has to survive the
# renderer. RE-GATE: the top face is drawn at level 0, which lightens it 10 % toward white,
# and at the film's 13.8 deg down pitch it is only ~60 px tall on a 350 px block. The old
# 4x4 khaki stem came back at (185,148,80) and read as a knot in a plank, which is half of
# why a near pumpkin read as a barrel. The stem is now 6x6, two steps darker, and ringed by
# its own hard shadow, so it survives the lightening and reads as a stem.
top = nz(PUMP, 0.12, 'ptop', 4)
for y in range(TILE):
    for x in range(TILE):
        dx, dy = x - 7.5, y - 7.5
        d = math.hypot(dx, dy)
        rr = 0.5 * (d + max(abs(dx), abs(dy)))          # rounded-square radius
        k = 1.0
        if rr >= 7.2: k *= 0.86                         # outer rim of the block face
        elif rr >= 6.2: k *= 0.96
        # eight soft lobes running out from the stem, the way a pumpkin's ribs do. Kept
        # shallow (1.04 / 0.92) because a hard radial star reads as a sawn log end.
        if rr > 3.4:
            a = math.atan2(dy, dx)
            off = abs(((a * 4 / math.pi) + 8.5) % 1.0 - 0.5)
            if off < 0.14: k *= 0.92
            elif off > 0.40: k *= 1.04
        top[y][x] = mul(top[y][x], k)
# The stem. It was 6x6 with a hard 1 px shadow RING drawn all the way round it in the flesh,
# and at 350 px a bordered dark square in the middle of an orange lid does not read as a stem
# — it reads as a hatch, which is the other half of why a near pumpkin looked like a barrel.
# Vanilla's stem is a small 4x4 nub with no ring at all: it sits ON the flesh, it is not
# inset into it. So: 4x4, lighter, and shaded only on the two far sides the way a raised nub
# catches light from the front-left.
STEM_L, STEM_D = (158, 120, 56), (118, 86, 38)
for y in range(6, 10):
    for x in range(6, 10):
        far = (x >= 8) + (y >= 8)                       # 0 near corner, 2 far corner
        c = mix(STEM_L, STEM_D, 0.10 + 0.30 * far)
        top[y][x] = mul(c, 0.96 + 0.08 * rnd(x, y, 'stem'))
TEX['pumpkin_top'] = top

# --- pumpkin_side: four ROUNDED ribs.
# RE-GATE, and this is the whole of defect 3. The previous profile was
# [0.60, 1.13, 1.00, 0.85] on a period of 4 — a 1.9:1 alternation of four equal-width
# columns. At 22 px per texel on a near block that is not a rib, it is a STAVE: sixteen
# hard vertical bands of alternating tone, which is exactly how a barrel or an oak log is
# painted, and it is why a field of pumpkins read as a field of wooden crates.
# A pumpkin's rib is a rounded lobe, so the profile is now a shallow bell — narrow groove,
# rise, crest, fall — with a 1.35:1 total range instead of 1.9:1. Structure survives, the
# stave read does not. The base is lifted 222 -> 231 because the renderer takes 20 % out of
# the front face and then up to another 26 % in its baked AO ramp; at the old base the foot
# of a 350 px block landed on (131,77,17), which is brown.
RIB = [0.87, 1.02, 1.06, 0.97]                          # groove · rise · crest · fall
sidep = []
for y in range(TILE):
    row = []
    for x in range(TILE):
        k = RIB[x % 4]
        if x % 4 == 0:
            k += 0.03 * rnd(x, y, 'groove')             # the groove wavers a little
        k *= 1 + step(x, y, 'pside', 4) * 0.07
        if y == 0: k *= 1.09                            # top edge catches the light
        elif y == 1: k *= 1.04
        elif y == TILE - 1: k *= 0.84                   # and the foot sits in its own shadow
        elif y == TILE - 2: k *= 0.92
        if rnd(x, y, 'blem') > 0.94: k *= 0.93          # skin blemishes
        row.append(mul(PUMP_S, k))
    sidep.append(row)
TEX['pumpkin_side'] = sidep

# ---------------------------------------------------------------- spawner cage
BAR_L, BAR_D = (104, 116, 130), (62, 72, 86)            # MC.C.STAUB.spawner lives in this range
cage = []
for y in range(TILE):
    row = []
    for x in range(TILE):
        onbar = (x % 4 == 0) or (y % 4 == 0) or x == 15 or y == 15
        if onbar:
            lit = (x % 4 == 0 and y % 4 == 1) or (y % 4 == 0 and x % 4 == 1)
            c = mix(BAR_L, BAR_D, rnd(x, y, 'bar'))
            row.append(mul(c, 1.12 if lit else 1.0))
        else:
            row.append(mix((30, 34, 42), (44, 50, 60), rnd(x, y, 'hole')))
        # interior kept off pure black: level 2 takes another 42 % out of it
    cage.append(row)
TEX['spawner'] = cage

# ---------------------------------------------------------------- oak planks / stone
PLANK = (164, 128, 78)
pl = nz(PLANK, 0.26, 'planks', 4)
for y in range(TILE):
    for x in range(TILE):
        if y % 8 == 0:
            pl[y][x] = mul(pl[y][x], 0.62)              # the seam between two planks
        elif y % 8 == 1:
            pl[y][x] = mul(pl[y][x], 1.08)              # the lit chamfer under it
        if (y // 8) % 2 == 0 and x == 5:
            pl[y][x] = mul(pl[y][x], 0.70)              # staggered butt joints
        if (y // 8) % 2 == 1 and x == 11:
            pl[y][x] = mul(pl[y][x], 0.70)
        if rnd(x, y // 2, 'grain') > 0.84:
            pl[y][x] = mul(pl[y][x], 0.90)              # grain, drawn 2 rows tall
TEX['oak_planks'] = pl

stone = nz((128, 128, 128), 0.24, 'stone', 5)
for y in range(TILE):
    for x in range(TILE):
        v = rnd(x, y, 'speck')
        if v > 0.89: stone[y][x] = mul(stone[y][x], 0.86)
        elif v < 0.10: stone[y][x] = mul(stone[y][x], 1.10)
TEX['stone'] = stone

# ---------------------------------------------------------------- chest front
CHEST = (166, 118, 60)
ch = nz(CHEST, 0.22, 'chest', 4)
for y in range(TILE):
    for x in range(TILE):
        if rnd(x, y // 2, 'chgrain') > 0.86:
            ch[y][x] = mul(ch[y][x], 0.88)
for x in range(TILE):
    ch[4][x] = mul(ch[4][x], 0.60)                      # lid gap
    ch[5][x] = mul(ch[5][x], 1.10)                      # lit edge of the body below it
edge(ch, 0.62)
IRON_L, IRON_D = (136, 136, 146), (78, 78, 88)
for y in range(3, 8):                                   # iron latch plate over the lid gap
    for x in range(6, 10):
        ch[y][x] = mix(IRON_L, IRON_D, ((x - 6) + (y - 3)) / 7.0)
for y in range(6, 8):                                   # keyhole
    for x in range(7, 9):
        ch[y][x] = (26, 24, 28)
TEX['chest'] = ch

# ---------------------------------------------------------------- accent blocks
TEX['iron_block'] = nz((216, 216, 216), 0.14, 'ironb', 4)
TEX['violet_block'] = nz((150, 88, 220), 0.26, 'violet', 5)
TEX['red_block'] = nz((205, 45, 45), 0.26, 'redb', 5)

# ---------------------------------------------------------------- wood / leaves / stone / water / sand
# oak_log_side carries every torch post in the film. The old base was so dark that after the
# renderer's level-1 dim and AO gradient the posts came out near black — burnt poles.
LOG = (152, 118, 66)
log_side = []
for y in range(TILE):
    row = []
    for x in range(TILE):
        k = 0.82 + 0.40 * rnd(x, 0, 'logcol')           # bark runs in vertical bands
        k *= 1 + step(x, y, 'logbark', 4) * 0.14
        if rnd(x, y // 3, 'logdash') > 0.78: k *= 0.80  # bark cracks, 3 rows tall
        if x == 0 or x == 15: k *= 0.74                 # the log's own round-off
        elif x == 1 or x == 14: k *= 0.90
        row.append(mul(LOG, k))
    log_side.append(row)
TEX['oak_log_side'] = log_side

LOGT = (172, 136, 80)
log_top = nz(LOGT, 0.14, 'logtop', 4)
for y in range(TILE):
    for x in range(TILE):
        dx, dy = x - 7.5, y - 7.5
        rr = 0.5 * (math.hypot(dx, dy) + max(abs(dx), abs(dy)))
        if rr > 6.4: k = 0.62                           # bark ring
        elif rr > 5.9: k = 0.78
        elif rr < 1.3: k = 0.82                         # pith
        else: k = 1.06 if int(rr) % 2 == 0 else 0.90    # growth rings
        log_top[y][x] = mul(log_top[y][x], k)
TEX['oak_log_top'] = log_top

LEAF = (62, 122, 44)
leaves = []
for y in range(TILE):
    row = []
    for x in range(TILE):
        k = 0.84 + 0.34 * rnd(x // 2, y // 2, 'clump')  # leaf clusters, then per-leaf noise
        k *= 1 + step(x, y, 'leaves', 5) * 0.18
        v = rnd(x, y, 'leafhole')
        if v > 0.90: k *= 0.52                          # gaps you can see through
        elif v < 0.10: k *= 1.30                        # sunlit leaf
        row.append(mul(LEAF, k))
    leaves.append(row)
TEX['oak_leaves'] = leaves

# cobblestone: real stones with mortar between them, staggered row by row. The old version was
# pure noise and read as grey static at size.
COB = (132, 132, 132)
cob = []
for y in range(TILE):
    row = []
    for x in range(TILE):
        ry = y // 4
        sx = x + (2 if ry % 2 else 0)                   # stagger alternate courses
        rx = sx // 4
        lx, ly = sx % 4, y % 4
        mortar = (lx == 0 or ly == 0)
        if not mortar and (lx == 1 or ly == 1) and rnd(x, y, 'cobjag') > 0.82:
            mortar = True                               # ragged stone outlines
        if mortar and rnd(x, y, 'cobgap') > 0.86:
            mortar = False
        if mortar:
            row.append(mul(COB, 0.52 + 0.10 * rnd(x, y, 'mortar')))
        else:
            k = 0.80 + 0.40 * rnd(rx, ry, 'cobtone')    # each stone its own tone
            if lx == 1 and ly == 1: k *= 1.14           # highlight on the stone's shoulder
            elif lx == 3 or ly == 3: k *= 0.90
            k *= 1 + step(x, y, 'cobpx', 4) * 0.10
            row.append(mul(COB, k))
    cob.append(row)
TEX['cobblestone'] = cob

# water: seamless wave bands (both axes are whole periods of the tile) instead of blue static,
# so the world's 2 px surface offset reads as a moving surface.
WAT = (60, 100, 204)
wat = []
for y in range(TILE):
    row = []
    for x in range(TILE):
        w = math.sin(2 * math.pi * (2 * y) / TILE + 0.9 * math.sin(2 * math.pi * x / TILE))
        k = 1.0 + 0.11 * w
        k *= 1 + step(x, y, 'water', 4) * 0.07
        c = mul(WAT, k)
        if rnd(x, y, 'ripple') > 0.93:
            c = mix(c, (150, 190, 252), 0.55)           # glints on the crests
        row.append(c)
    wat.append(row)
TEX['water'] = wat

sand = nz((222, 208, 162), 0.16, 'sand', 4)
for y in range(TILE):
    for x in range(TILE):
        if rnd(x, y, 'grain2') > 0.90:
            sand[y][x] = mul(sand[y][x], 0.90)
TEX['sand'] = sand

# farmland with a crop on it: the furrowed earth of `farmland` plus wheat stalks that carry a
# darker stem and a lighter grain head, so the rows read as a crop and not as yellow bars.
crop = [row[:] for row in TEX['farmland']]
STALK_D, STALK_L, EAR = (128, 122, 48), (176, 168, 76), (216, 198, 104)
for y in range(TILE):
    for x in range(TILE):
        if x % 4 in (1, 2) and 2 <= y <= 14:
            near_top = y <= 6
            v = rnd(x, y, 'wheat')
            if x % 4 == 1:
                c = mix(STALK_D, STALK_L, v)            # shaded side of the stalk
            else:
                c = mix(STALK_L, EAR, v)                # lit side
            if near_top:
                c = mix(c, EAR, 0.45 if v > 0.4 else 0.20)   # the ear at the top of the stalk
            if y % 3 == 0:
                c = mul(c, 0.86)                        # segment joints, so it is a stalk
            crop[y][x] = c
TEX['farmland_crop'] = crop

# ---------------------------------------------------------------- player skin / clothing
SKIN = (222, 174, 130)
HAIR_D, HAIR_L = (70, 46, 28), (104, 72, 42)
skin = nz(SKIN, 0.08, 'skin', 3)                        # the arm stretches this over 400 px:
TEX['player_skin'] = skin                               # anything noisier reads as dirt

def hair(x, y, salt):
    return mix(HAIR_D, HAIR_L, rnd(x, y, salt))

face = [row[:] for row in skin]
for x in range(TILE):                                   # a solid fringe with a jagged hem —
    d = 4 + (1 if rnd(x, 0, 'fringe_f') > 0.55 else 0)  # holes in the hair read as mange at 300 px
    for y in range(d):
        face[y][x] = hair(x, y, 'h2')
for x in range(TILE):                                   # sideburns down the outer columns
    if x < 2 or x > 13:
        for y in range(4, 9):
            face[y][x] = hair(x, y, 'h2b')
for x in range(2, 7):                                   # brows
    face[5][x] = mul(hair(x, 5, 'brow'), 0.9)
for x in range(9, 14):
    face[5][x] = mul(hair(x, 5, 'brow'), 0.9)
EYE_W, EYE_I = (240, 240, 245), (58, 72, 148)
for y in (6, 7):
    for x in (3, 4): face[y][x] = EYE_W                 # left eye: white outside, iris inside
    for x in (5, 6): face[y][x] = EYE_I
    for x in (9, 10): face[y][x] = EYE_I                # right eye, mirrored
    for x in (11, 12): face[y][x] = EYE_W
for x in range(7, 9):                                   # nose
    face[9][x] = mul(face[9][x], 0.90)
for x in range(6, 10):                                  # mouth
    face[11][x] = mix(face[11][x], (146, 96, 76), 0.85)
for x in range(4, 12):                                  # stubble
    for y in range(12, 14):
        if rnd(x, y, 'beard') > 0.45:
            face[y][x] = mix(face[y][x], HAIR_D, 0.13)
TEX['player_face'] = face

# player_head_side doubles as the TOP of the head in mcPlayer, so it is mostly hair with a
# contiguous boundary; a random hole pattern here is what made the bot look moth-eaten.
head_side = [row[:] for row in skin]
for x in range(TILE):
    d = 10 + (1 if rnd(x, 0, 'hs') > 0.5 else 0) - (1 if rnd(x, 1, 'hs2') > 0.72 else 0)
    if x <= 4:
        d = 13 + (1 if rnd(x, 2, 'hs3') > 0.6 else 0)   # the back of the head
    for y in range(min(d, TILE)):
        head_side[y][x] = hair(x, y, 'h3')
TEX['player_head_side'] = head_side

# #7B3DBD — the bot wears the brand violet for free (DIRECTION §3.5). Low noise: the sleeve is
# stretched across 300 px of the first-person arm in a third of the film's frames.
TEX['player_shirt'] = nz((124, 62, 190), 0.16, 'shirt', 4)
TEX['player_pants'] = nz((62, 60, 112), 0.20, 'pants', 4)
TEX['player_shoe'] = nz((74, 60, 50), 0.18, 'shoe', 3)

# ---------------------------------------------------------------- write the atlas + meta
names = list(TEX)
cols = 8
rows = (len(names) + cols - 1) // cols
atlas = Image.new('RGBA', (cols * TILE, rows * TILE), (0, 0, 0, 0))
for i, n in enumerate(names):
    ox, oy = (i % cols) * TILE, (i // cols) * TILE
    for y in range(TILE):
        for x in range(TILE):
            atlas.putpixel((ox + x, oy + y), tuple(TEX[n][y][x]) + (255,))
atlas.save(os.path.join(ASSETS, 'tex.png'))
idx = {n: i for i, n in enumerate(names)}
open(os.path.join(ASSETS, 'tex_meta.js'), 'w').write(
    'window.TEX_META = ' + json.dumps({'tile': TILE, 'cols': cols, 'rows': rows, 'index': idx}) + ';\n')
if len(sys.argv) > 1:                       # optional 8x preview
    atlas.resize((atlas.size[0] * 8, atlas.size[1] * 8), Image.NEAREST).save(sys.argv[1])
print('atlas', atlas.size, len(names), 'textures:', ', '.join(names))
