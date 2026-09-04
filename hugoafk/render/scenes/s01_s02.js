// s01_s02.js — s01 "Hook: PC aus" (0.0–3.0) + s02 "Logo-Reveal" (3.0–6.0)
// Everything is a pure function of t. All module level names are prefixed s01_s02_.

/* ===========================================================================
   s01 — a real HugoSMP night farm, built out of textured Minecraft blocks.
   RESTAGED (v2): a lower, closer viewpoint on the same farm, seen from the
   other side — the furrows now run DOWN-LEFT instead of down-right, the field
   is cut by a shoreline at the front-left, and the player stands right of
   centre on the lit main path instead of left of centre.
     · terrain with a BODY: grass on dirt on stone, a raised grass ridge behind
       the field on the right, a two-step drop into a lake at the front-left
       (the cliff faces show the dirt/stone body of the plateau)
     · a bounded farm plot — pumpkin furrows on farmland with stems between
       them, a sea-pickle irrigation channel, two cobblestone paths, an oak
       fence along the BACK edge, a raised stone deck with a chest mid-field
     · three oak trees (log + ragged leaf canopy) — one big one in the near
       foreground at the left, cut by the frame edge — plus the lake, torches
     · the AFK player (mcPlayer) on the main path with a pumpkin in his hand —
       idle bob plus an occasional mining swing, under a HugoAFK name tag
   Night look: the blocks are drawn at full texture brightness into their own
   layer and ONE lighting pass ('source-atop') dims the whole world and carves
   warm pools out of the darkness around the torches. That is far cheaper than
   dimming every block and it is the only way the torches read as THE light.
   =========================================================================== */

const s01_s02_ISO  = { size: 64, cx: 512, cy: 1302 };
const s01_s02_UMAX = 11, s01_s02_VMIN = -15, s01_s02_VMAX = 21;   // visible (ix-iy) / (ix+iy) window
const s01_s02_BOTP = { ix: 3, iy: 1 };                             // the AFK player's tile (on the main path)

const s01_s02_TEX = {
  grass:   { top: 'grass_top', side: 'grass_side' },
  dirt:    'dirt',
  stone:   'stone',
  cobble:  'cobblestone',
  soil:    { top: 'farmland', side: 'dirt' },
  crop:    { top: 'farmland_crop', side: 'dirt' },
  water:   'water',
  sand:    'sand',
  deck:    { top: 'stone', side: 'cobblestone' },
  pumpkin: { top: 'pumpkin_top', side: 'pumpkin_side' },
  log:     { top: 'oak_log_top', side: 'oak_log_side' },
  leaves:  'oak_leaves',
  chest:   'chest',
};
const s01_s02_HOT = { pumpkin: 1, leaves: 1, chest: 1, water: 1 };  // hot violet outline in the wireframe state
const s01_s02_EDGY = { pumpkin: 1, log: 1, leaves: 1, chest: 1, deck: 1, cobble: 1, stone: 1, sand: 1 };

// the farm plot — furrows run along +iy now, so on screen they fall DOWN-LEFT
const s01_s02_PLOT = { x0: -3, x1: 10, y0: -7, y1: 6 };
const s01_s02_DECK = { x0: -4, x1: -3, y0: -4, y1: -3 };           // raised stone deck (sell station), mid-field
const s01_s02_TREES = [
  { ix:  2, iy:  8, trunk: 6, big: 1 },   // near foreground, lower left — cut by the frame
  { ix: -4, iy:  0, trunk: 5, big: 1 },   // mid ground, left of the deck
  { ix:  0, iy: -7, trunk: 3, big: 1 },   // back right, breaking the horizon line
];
// scattered boulders and bushes so the ridge and the shore are not bare planes
const s01_s02_SCATTER = (() => {
  const o = [];
  for (let ix = -14; ix <= 13; ix++) for (let iy = -14; iy <= 13; iy++) {
    const h = hash2(ix * 19 + 101, iy * 23 + 7);
    if (h > 0.965) o.push({ ix, iy, kind: h > 0.985 ? 'cobble' : 'stone' });
    else if (h < 0.016) o.push({ ix, iy, kind: 'leaves' });
  }
  return o;
})();
const s01_s02_CHESTP = { ix: -4, iy: -4, iz: 1 };
// fence along the BACK edge of the plot (a down-right line, against the down-left furrows)
const s01_s02_FENCE = (() => {
  const o = [];
  for (let ix = -8; ix <= 6; ix++) if (ix !== 0) o.push({ ix, iy: -7 });      // skip the tree tile
  return o;
})();

// terrain height — a raised grass ridge sits behind the field on the right and
// the plateau breaks off twice towards the front-left, into the lake. The step
// lines run DOWN-RIGHT, across the down-left furrows.
function s01_s02_hAt(ix, iy) {
  const u = ix - iy, v = ix + iy;
  if (ix >= s01_s02_DECK.x0 && ix <= s01_s02_DECK.x1 && iy >= s01_s02_DECK.y0 && iy <= s01_s02_DECK.y1) return 1;
  const n = (hash2(ix * 7 + 3, iy * 11 + 5) - 0.5) * 2.2;
  const d = v - 0.95 * u + n;                       // grows towards the front-left
  if (d >= 17.6) return -2;                         // lake bed
  if (d >= 12.6) return -1;                         // shore terrace
  if (v + n * 0.5 <= -11 && u >= -1) return 1;      // grass ridge behind the field
  return 0;
}
// what a plot furrow is made of, column by column (keyed by ix — furrows fall down-left)
const s01_s02_ROW = {
  '-3': 'grass', '-2': 'cobble', '-1': 'soil', '0': 'crop', '1': 'soil',
  '2': 'grass', '3': 'cobble', '4': 'soil', '5': 'crop', '6': 'water',
  '7': 'crop', '8': 'soil', '9': 'crop', '10': 'cobble',
};
const s01_s02_PUMPPAR = { '-1': 0, '1': 1, '4': 0, '8': 1 };       // pumpkin on every other tile, staggered

const s01_s02_TORCHES = (() => {
  const raw = [
    { ix: 3, iy: -6 }, { ix: 3, iy: -2 }, { ix: 3, iy: 2 }, { ix: 3, iy: 6 },   // main path
    { ix: -2, iy: -5 }, { ix: -2, iy: 1 }, { ix: -2, iy: 5 },                    // back path
    { ix: 10, iy: 3 },                                                           // front path
    { ix: -3, iy: -4 },                                                          // on the deck
    { ix: 1, iy: 8 },                                                            // on the shore, under the big tree
  ];
  return raw.map(o => ({ ix: o.ix, iy: o.iy, iz: s01_s02_hAt(o.ix, o.iy) }));
})();

/* ------------------------------------------------- build the world once ---
   Columns are filled 4 blocks deep and every block that is exactly covered by
   the block at (ix+1, iy+1, iz+1) is dropped, so flat ground costs one block
   per tile and the field only grows depth where the terrain really steps. */
const s01_s02_WORLD = (() => {
  const occ = new Set(), K = (a, b, c) => a + '|' + b + '|' + c;
  const solid = [], pumpkins = [], pickles = [];
  const put = (ix, iy, iz, kind) => { const k = K(ix, iy, iz); if (occ.has(k)) return; occ.add(k); solid.push({ ix, iy, iz, kind }); };
  const inBox = (ix, iy, b) => ix >= b.x0 && ix <= b.x1 && iy >= b.y0 && iy <= b.y1;
  const treeAt = (ix, iy) => s01_s02_TREES.some(tr => tr.ix === ix && tr.iy === iy);

  for (let ix = -24; ix <= 24; ix++) for (let iy = -24; iy <= 24; iy++) {
    const u = ix - iy, v = ix + iy;
    if (Math.abs(u) > s01_s02_UMAX || v < s01_s02_VMIN || v > s01_s02_VMAX) continue;
    const h = s01_s02_hAt(ix, iy);
    let kind = 'grass', pump = false;
    if (h === 1 && inBox(ix, iy, s01_s02_DECK)) kind = 'deck';
    else if (!treeAt(ix, iy)) {
      const dm = v - 0.95 * u;
      if (h <= -2) kind = hash2(ix * 3 + 61, iy * 5 + 13) > 0.10 ? 'water' : 'sand';
      else if (h === -1) kind = (dm >= 16.4 || hash2(ix * 5 + 17, iy * 7 + 29) > 0.90) ? 'sand' : 'grass';
      else if (inBox(ix, iy, s01_s02_PLOT)) {
        kind = s01_s02_ROW[String(ix)] || 'grass';
        if (kind === 'soil') {
          const par = s01_s02_PUMPPAR[String(ix)];
          pump = (((iy % 2) + 2) % 2) === par &&
            (Math.abs(ix - s01_s02_BOTP.ix) > 1 || Math.abs(iy - s01_s02_BOTP.iy) > 1);
          if (!pump) kind = 'crop';                                // stems between the pumpkins
        }
      }
      // trampled dirt bank one step above the shore terrace
      if (kind === 'grass' && h === 0 && dm >= 11.4) kind = 'dirt';
    }
    put(ix, iy, h, kind);
    put(ix, iy, h - 1, 'dirt');
    put(ix, iy, h - 2, 'stone');
    put(ix, iy, h - 3, 'stone');
    if (pump) { put(ix, iy, h + 1, 'pumpkin'); pumpkins.push({ ix, iy, iz: h + 1 }); }
    if (kind === 'water' && (ix === 6 || hash2(ix * 9 + 5, iy * 13 + 2) > 0.78)) pickles.push({ ix, iy, iz: h });
  }
  // oak trees: a log stem, two wide leaf layers with the corners cut, a cap —
  // a few outer leaves are dropped so the silhouette is ragged, not a green box
  for (const tr of s01_s02_TREES) {
    const h = s01_s02_hAt(tr.ix, tr.iy), R = tr.big ? 2 : 1;
    for (let k = 1; k <= tr.trunk; k++) put(tr.ix, tr.iy, h + k, 'log');
    for (let dx = -R; dx <= R; dx++) for (let dy = -R; dy <= R; dy++) {           // wide ragged layer
      if (Math.abs(dx) + Math.abs(dy) > R + 1 || (dx === 0 && dy === 0)) continue;
      if (Math.abs(dx) + Math.abs(dy) === R + 1 && hash2(tr.ix * 31 + dx, tr.iy * 17 + dy * 7) < 0.34) continue;
      put(tr.ix + dx, tr.iy + dy, h + tr.trunk, 'leaves');
    }
    for (let dx = -1; dx <= 1; dx++) for (let dy = -1; dy <= 1; dy++)              // 3x3
      put(tr.ix + dx, tr.iy + dy, h + tr.trunk + 1, 'leaves');
    for (const [dx, dy] of [[0, 0], [1, 0], [-1, 0], [0, 1], [0, -1]])             // cap
      if (!(dx && hash2(tr.ix * 9 + dx, tr.iy * 5 + dy) < 0.3)) put(tr.ix + dx, tr.iy + dy, h + tr.trunk + 2, 'leaves');
  }
  for (const sc of s01_s02_SCATTER) {
    const u = sc.ix - sc.iy, v = sc.ix + sc.iy;
    if (Math.abs(u) > s01_s02_UMAX || v < s01_s02_VMIN || v > s01_s02_VMAX) continue;
    if (inBox(sc.ix, sc.iy, s01_s02_PLOT) || inBox(sc.ix, sc.iy, s01_s02_DECK)) continue;
    const h = s01_s02_hAt(sc.ix, sc.iy);
    if (h <= -1) continue;                                          // nothing floating in the lake
    if (!occ.has(K(sc.ix, sc.iy, h + 1))) put(sc.ix, sc.iy, h + 1, sc.kind);
  }
  put(s01_s02_CHESTP.ix, s01_s02_CHESTP.iy, s01_s02_CHESTP.iz + 1, 'chest');

  // occlusion cull + correct painter order (ix + iy + iz ascending — a block is
  // hidden exactly when the block one step towards the camera and one up exists)
  const S = s01_s02_ISO.size;
  const vis = solid
    .filter(b => !occ.has(K(b.ix + 1, b.iy + 1, b.iz + 1)))
    .filter(b => {                                                   // screen cull
      const x = s01_s02_ISO.cx + (b.ix - b.iy) * S * 0.866, y = s01_s02_ISO.cy + (b.ix + b.iy) * S * 0.5 - b.iz * S;
      return x > -200 && x < W + 200 && y > 560 && y < H + 200;
    })
    .map(b => Object.assign(b, {
      edge: s01_s02_EDGY[b.kind] === 1,
      rad: Math.min(1, Math.hypot(b.ix - s01_s02_BOTP.ix, b.iy - s01_s02_BOTP.iy) / 17),
    }))
    .sort((a, b) => (a.ix + a.iy + a.iz) - (b.ix + b.iy + b.iz));
  return { vis, pumpkins, pickles };
})();
const s01_s02_PUMPKINS = s01_s02_WORLD.pumpkins.filter(c => c.ix + c.iy >= 0);
// front rows only — used once the copy is up so the item pops stay in the lower third
const s01_s02_PUMPKINS_FRONT = s01_s02_PUMPKINS.filter(c => c.ix + c.iy >= 6);

// violet re-paint of SPRITES.pumpkin — every palette key of the icon must be covered
const s01_s02_PUMPPAL_V = {
  O: '#A855F7', l: '#D7A6FF', o: '#7C3AED', k: '#2B1247',   // body / highlight / shadow / outline
  G: '#C77DFF', g: '#6D28D9',                               // stem
};

/* ------------------------------------------------------------- utilities */
let s01_s02_offC = null, s01_s02_offX = null;
function s01_s02_off() {
  if (!s01_s02_offC) { s01_s02_offC = makeCanvas(W, H); s01_s02_offX = s01_s02_offC.getContext('2d'); }
  const x = s01_s02_offX;
  x.setTransform(1, 0, 0, 1, 0, 0); x.globalAlpha = 1; x.globalCompositeOperation = 'source-over';
  x.filter = 'none'; x.shadowBlur = 0;
  x.fillStyle = T().bg; x.fillRect(0, 0, W, H);
  return { c: s01_s02_offC, x };
}
let s01_s02_wlC = null, s01_s02_wlX = null;
function s01_s02_worldLayer() {                     // transparent layer that carries the world only
  if (!s01_s02_wlC) { s01_s02_wlC = makeCanvas(W, H); s01_s02_wlX = s01_s02_wlC.getContext('2d'); }
  const x = s01_s02_wlX;
  x.setTransform(1, 0, 0, 1, 0, 0); x.globalAlpha = 1; x.globalCompositeOperation = 'source-over';
  x.filter = 'none'; x.clearRect(0, 0, W, H);
  return { c: s01_s02_wlC, x };
}
// shrink a headline until it fits maxW (tracking stays -0.04 * size)
function s01_s02_fit(ctx, str, o, maxW) {
  let s = o.size;
  for (let i = 0; i < 14; i++) {
    const w = measureText(ctx, str, Object.assign({}, o, { size: s, tracking: -0.04 * s }));
    if (w <= maxW) break;
    s *= (maxW / w) * 0.995;
  }
  return s;
}
function s01_s02_head(ctx, str, x, y, size, color, p, mode) {
  const o = { size, family: FONTS.body, weight: 800, tracking: -0.04 * size, color, align: 'center' };
  o.size = s01_s02_fit(ctx, str, o, 700); o.tracking = -0.04 * o.size;   // 700 + slam scale stays inside x 90..900
  drawKinetic(ctx, str, x, y, o, p, mode || 'rise');
}
// a cuboid centred on a block tile, with its top face at height hTop (block units)
function s01_s02_boxAt(ctx, ix, iy, hTop, bw, bd, bh, o, iso) {
  const s = iso.size, c = isoPos(ix, iy, hTop, iso);
  const ax = c.x - (s * ISO.w * bw - s * ISO.w * bd) / 2;
  const ay = c.y - (s * ISO.h * bw + s * ISO.h * bd) / 2;
  return isoBox(ctx, ax, ay, bw, bd, bh, Object.assign({ size: s }, o));
}

/* ------------------------------------------------------- night background */
// blocky, hazy hills far behind the farm — flat fills, so they cost nothing
const s01_s02_HILLS = (() => {
  const sn = (i, seed) => {
    const i0 = Math.floor(i), f = i - i0, s = f * f * (3 - 2 * f);
    return lerp(hash1(i0 * 37 + seed), hash1((i0 + 1) * 37 + seed), s);
  };
  const out = [];
  const conf = [
    { base: 736, amp: 104, step: 26, seed: 63, col: '#161E4C', trees: 1 },
    { base: 792, amp: 74, step: 22, seed: 17, col: '#0B1028', trees: 1 },
  ];
  for (const cf of conf) {
    const cols = [];
    for (let i = -3; i * cf.step - 70 < W + 70; i++) {
      const n = 0.6 * sn(i * 0.17, cf.seed) + 0.4 * sn(i * 0.55, cf.seed + 9);
      cols.push({ x: i * cf.step - 70, w: cf.step + 1, y: cf.base - Math.round(n * cf.amp / 11) * 11 });
    }
    const trees = [];
    if (cf.trees) for (let i = 0; i < 34; i++) {
      const gx = hash1(i * 91 + cf.seed) * (W + 160) - 80;
      const ci = Math.max(0, Math.min(cols.length - 1, Math.round((gx + 70) / cf.step)));
      trees.push({ x: Math.round(gx), y: cols[ci].y, s: 15 + Math.round(hash1(i * 13 + cf.seed) * 14) });
    }
    out.push({ cols, trees, col: cf.col });
  }
  return out;
})();
// drifting blocky Minecraft clouds
const s01_s02_CLOUDS = (() => {
  const out = [];
  for (let i = 0; i < 8; i++) {
    const cells = [], n = 4 + Math.floor(hash1(i * 31 + 5) * 5);
    for (let k = 0; k < n; k++) cells.push({ dx: k, dy: Math.round(hash2(i, k) * 1.9), w: 1 + Math.round(hash2(i + 7, k) * 2) });
    out.push({
      y: 452 + hash1(i * 13 + 2) * 240, sp: -(4 + hash1(i * 17 + 1) * 7),
      cell: 26 + hash1(i * 23 + 4) * 20, ph: hash1(i * 41) * 1600,
      a: 0.045 + hash1(i * 29 + 6) * 0.05, cells,
    });
  }
  return out;
})();
function s01_s02_clouds(ctx, t) {
  ctx.save(); ctx.fillStyle = '#AEBEEC';
  for (const c of s01_s02_CLOUDS) {
    const span = W + 620, x0 = (((t * c.sp + c.ph) % span) + span) % span - 310;
    ctx.globalAlpha = c.a;
    for (const q of c.cells) ctx.fillRect(Math.round(x0 + q.dx * c.cell), Math.round(c.y + q.dy * c.cell * 0.5), q.w * c.cell, Math.round(c.cell * 0.5));
  }
  ctx.restore();
}
function s01_s02_sky(ctx, t) {
  linearFill(ctx, 0, 0, 0, 930,
    [[0, 'rgba(40,25,78,0.98)'], [0.28, 'rgba(25,18,54,0.95)'], [0.62, 'rgba(14,12,34,0.93)'], [0.86, 'rgba(9,9,24,0.92)'], [1, 'rgba(8,8,20,0.7)']],
    [0, 0, W, 930]);
  nightSky(ctx, t, { count: 165, seed: 47, alpha: 0.62, hMul: 0.40, drift: true });
  // square Minecraft moon + halo — now high on the LEFT
  dot(ctx, 244, 336, 226, '#A9BEF5', 0.12);
  dot(ctx, 244, 336, 104, '#CBD8FA', 0.13);
  ctx.save();
  ctx.globalAlpha = 0.84; ctx.fillStyle = '#D9E2F9'; ctx.fillRect(206, 298, 76, 76);
  ctx.globalAlpha = 0.26; ctx.fillStyle = '#94A6D8';
  ctx.fillRect(240, 314, 18, 18); ctx.fillRect(214, 340, 14, 14); ctx.fillRect(252, 348, 12, 12);
  ctx.restore();
  s01_s02_clouds(ctx, t);
  // hazy hill layers + a distant treeline
  for (const L of s01_s02_HILLS) {
    ctx.save(); ctx.fillStyle = L.col;
    for (const tr of L.trees) {
      ctx.fillRect(tr.x - 2, tr.y - tr.s * 0.6, 5, tr.s * 0.7);
      ctx.fillRect(tr.x - tr.s * 0.5, tr.y - tr.s * 1.35, tr.s, tr.s * 0.85);
      ctx.fillRect(tr.x - tr.s * 0.3, tr.y - tr.s * 1.85, tr.s * 0.6, tr.s * 0.6);
    }
    for (const c of L.cols) ctx.fillRect(c.x, c.y, c.w, 1300 - c.y);
    ctx.restore();
  }
  // ground fog on the horizon
  linearFill(ctx, 0, 736, 0, 1006,
    [[0, 'rgba(72,64,132,0)'], [0.42, 'rgba(74,66,136,0.22)'], [1, 'rgba(22,19,44,0)']],
    [0, 736, W, 270]);
}

/* ------------------------------------------------------------ the lighting
   One overlay for the whole world layer: a cool night wash that is punched
   open (destination-out) and warmed (lighter) where the torches burn. */
const s01_s02_LIT = { x0: -280, y0: 660, w: 1660, h: 1420 };
let s01_s02_litC = null;
function s01_s02_lightOverlay(t) {
  const LW = 248, LH = 186;
  if (!s01_s02_litC) s01_s02_litC = makeCanvas(LW, LH);
  const x = s01_s02_litC.getContext('2d');
  x.setTransform(1, 0, 0, 1, 0, 0); x.globalAlpha = 1; x.filter = 'none';
  x.globalCompositeOperation = 'source-over'; x.clearRect(0, 0, LW, LH);
  const g = x.createLinearGradient(0, 0, 0, LH);
  g.addColorStop(0.00, 'rgba(13,16,42,0.94)');       // distance = haze + darkness
  g.addColorStop(0.15, 'rgba(11,13,36,0.89)');
  g.addColorStop(0.46, 'rgba(9,11,30,0.79)');
  g.addColorStop(1.00, 'rgba(6,7,20,0.68)');
  x.fillStyle = g; x.fillRect(0, 0, LW, LH);
  const sx = LW / s01_s02_LIT.w, sy = LH / s01_s02_LIT.h;
  const pts = [];
  for (const tr of s01_s02_TORCHES) {
    const p = isoPos(tr.ix, tr.iy, tr.iz + 0.92, s01_s02_ISO);
    const fl = 0.84 + 0.16 * Math.sin(t * 10.5 + tr.ix * 2.1 + tr.iy * 1.3);
    pts.push({ x: (p.x - s01_s02_LIT.x0) * sx, y: (p.y - s01_s02_LIT.y0) * sy, fl });
  }
  const bp = isoPos(s01_s02_BOTP.ix, s01_s02_BOTP.iy, 1.1, s01_s02_ISO);
  pts.push({ x: (bp.x - s01_s02_LIT.x0) * sx, y: (bp.y - s01_s02_LIT.y0) * sy, fl: 0.9 });
  x.globalCompositeOperation = 'destination-out';
  for (const p of pts) {
    const r = 30 * p.fl;
    const rg = x.createRadialGradient(p.x, p.y, 0, p.x, p.y, r);
    rg.addColorStop(0, 'rgba(0,0,0,0.92)'); rg.addColorStop(0.30, 'rgba(0,0,0,0.55)');
    rg.addColorStop(0.66, 'rgba(0,0,0,0.18)'); rg.addColorStop(1, 'rgba(0,0,0,0)');
    x.fillStyle = rg; x.beginPath(); x.arc(p.x, p.y, r, 0, TAU); x.fill();
  }
  x.globalCompositeOperation = 'lighter';
  for (const p of pts) {
    const r = 33 * p.fl;
    const rg = x.createRadialGradient(p.x, p.y, 0, p.x, p.y, r);
    rg.addColorStop(0, 'rgba(138,54,8,0.44)'); rg.addColorStop(0.42, 'rgba(82,28,4,0.18)');
    rg.addColorStop(1, 'rgba(0,0,0,0)');
    x.fillStyle = rg; x.beginPath(); x.arc(p.x, p.y, r, 0, TAU); x.fill();
  }
  return s01_s02_litC;
}

/* ------------------------------------------------------------- the player */
function s01_s02_player(ctx, t, wire, alpha, iso) {
  const p = isoPos(s01_s02_BOTP.ix, s01_s02_BOTP.iy, 0, iso);
  const cyc = ((t % 2.6) + 2.6) % 2.6;
  const swing = cyc < 0.78 ? Math.sin(cyc / 0.78 * Math.PI) : 0;     // occasional mining swing
  ctx.save(); ctx.globalAlpha *= alpha;
  if (wire) {
    dot(ctx, p.x, p.y - iso.size * 1.0, iso.size * 2.6, T().secondary, 0.34);
    mcPlayer(ctx, p.x, p.y, {
      size: iso.size, t, walk: 0, swing, facing: 'left', bob: 0.020,
      dark: 0.90, outline: TOKENS.violetHot, outlineAlpha: 0.9, outlineWidth: 2,
      held: 'violet_block',
    });
    dot(ctx, p.x, p.y - iso.size * 1.75, iso.size * 0.8, TOKENS.violetHot, 0.26);
  } else {
    dot(ctx, p.x, p.y - iso.size * 1.05, iso.size * 2.0, T().secondary, 0.13);
    ctx.save(); ctx.globalAlpha *= 0.42;                              // contact shadow
    ctx.fillStyle = '#000000';
    ctx.beginPath(); ctx.ellipse(p.x, p.y + iso.size * 0.07, iso.size * 0.36, iso.size * 0.18, 0, 0, TAU); ctx.fill();
    ctx.restore();
    mcPlayer(ctx, p.x, p.y, {
      size: iso.size, t, walk: 0, swing, facing: 'left', bob: 0.020,
      outline: '#0A0910', outlineAlpha: 0.38, outlineWidth: 1.2,
      held: { top: 'pumpkin_top', side: 'pumpkin_side' },
    });
  }
  ctx.restore();
}
// the Minecraft name tag over the bot — drawn after the night pass so it stays lit
function s01_s02_nametag(ctx, alpha, t, iso) {
  if (alpha <= 0.02) return;
  const p = isoPos(s01_s02_BOTP.ix, s01_s02_BOTP.iy, 0, iso);
  const y = p.y - iso.size * 2.66 + Math.sin(t * 1.7 + 0.6) * 3;
  const o = { size: 40, family: FONTS.term, weight: 400, color: TOKENS.violetHot, align: 'center', baseline: 'middle' };
  const w = measureText(ctx, 'HugoAFK', o);
  ctx.save(); ctx.globalAlpha *= alpha;
  ctx.fillStyle = 'rgba(4,3,10,0.62)'; ctx.fillRect(p.x - w / 2 - 14, y - 25, w + 28, 48);
  drawText(ctx, 'HugoAFK', p.x, y, o);
  ctx.restore();
}

const s01_s02_EDGEO = { outline: '#060810', outlineAlpha: 0.34, outlineWidth: 1 };

/* --------------------------------------------------------------- the world */
function s01_s02_torchPost(ctx, tr, wire, iso) {
  s01_s02_boxAt(ctx, tr.ix, tr.iy, tr.iz + 0.92, 0.17, 0.17, 0.92, wire
    ? { color: '#0C0818', top: '#160F2A', outline: T().secondary, outlineAlpha: 0.5, outlineWidth: 1.2 }
    : { tex: { top: 'oak_log_top', side: 'oak_log_side' }, outline: '#120B04', outlineAlpha: 0.4, outlineWidth: 1 }, iso);
}
function s01_s02_fencePost(ctx, f, wire, iso) {
  const o = wire
    ? { color: '#0C0818', top: '#160F2A', outline: T().secondary, outlineAlpha: 0.4, outlineWidth: 1.1 }
    : { tex: { top: 'oak_log_top', side: 'oak_log_side' }, outline: '#120B04', outlineAlpha: 0.4, outlineWidth: 1 };
  const hz = s01_s02_hAt(f.ix, f.iy);
  s01_s02_boxAt(ctx, f.ix, f.iy, hz + 1.0, 0.22, 0.22, 1.0, o, iso);        // post
  s01_s02_boxAt(ctx, f.ix + 0.5, f.iy, hz + 0.86, 1.0, 0.1, 0.12, o, iso);  // top rail towards +ix
  s01_s02_boxAt(ctx, f.ix + 0.5, f.iy, hz + 0.46, 1.0, 0.1, 0.12, o, iso);  // lower rail
}
// terrain + props in painter order, split at the player's depth. Nothing in here
// moves, so both halves are baked into two canvases on the first frame and the
// per-frame cost drops from ~700 textured blocks to two drawImage calls.
function s01_s02_terrainPass(ctx, iso, half) {          // half: -1 = behind the bot, +1 = in front
  const s = iso.size, pv = s01_s02_BOTP.ix + s01_s02_BOTP.iy + 1;
  const props = [];
  for (const tr of s01_s02_TORCHES) props.push({ k: tr.ix + tr.iy + tr.iz, f: c => s01_s02_torchPost(c, tr, false, iso) });
  for (const f of s01_s02_FENCE) props.push({ k: f.ix + f.iy + s01_s02_hAt(f.ix, f.iy), f: c => s01_s02_fencePost(c, f, false, iso) });
  props.sort((a, b) => a.k - b.k);
  let pi = 0;
  for (const b of s01_s02_WORLD.vis) {
    const k = b.ix + b.iy + b.iz;
    while (pi < props.length && props[pi].k <= k) {
      const pr = props[pi++]; if ((pr.k <= pv ? -1 : 1) === half) pr.f(ctx);
    }
    if ((k <= pv ? -1 : 1) !== half) continue;
    const p = isoPos(b.ix, b.iy, b.iz, iso);
    blockIcon(ctx, s01_s02_TEX[b.kind], p.x, p.y, s, b.edge ? s01_s02_EDGEO : undefined);
  }
  while (pi < props.length) { const pr = props[pi++]; if ((pr.k <= pv ? -1 : 1) === half) pr.f(ctx); }
  if (half < 0) return;
  for (const w of s01_s02_WORLD.pickles) {              // sea pickles in the channel and the lake
    const p = isoPos(w.ix, w.iy, w.iz, iso), n = 1 + Math.floor(hash2(w.ix, w.iy) * 3);
    for (let i = 0; i < n; i++) {
      const a = hash2(w.ix * 5 + i, w.iy * 7 + 1), b2 = hash2(w.ix * 11 + i, w.iy * 3 + 9);
      pixelSprite(ctx, p.x + (a - 0.5) * s * 0.55, p.y - s * 0.2 + (b2 - 0.5) * s * 0.18,
        s * 0.028, SPRITES.sea_pickle.rows, SPRITES.sea_pickle.pal, { alpha: 0.95 });
    }
  }
}
const s01_s02_BAKE = { x: -200, y: 560, w: 1500, h: 1580 };
let s01_s02_baked = null;
function s01_s02_bake() {
  if (s01_s02_baked) return s01_s02_baked;
  const B = s01_s02_BAKE, mk = half => {
    const c = makeCanvas(B.w, B.h), x = c.getContext('2d');
    x.translate(-B.x, -B.y); s01_s02_terrainPass(x, s01_s02_ISO, half); return c;
  };
  s01_s02_baked = { back: mk(-1), front: mk(1) };
  return s01_s02_baked;
}
function s01_s02_worldTex(ctx, t, iso) {
  if (iso !== s01_s02_ISO) {                            // uncached path (other projections)
    s01_s02_terrainPass(ctx, iso, -1); s01_s02_player(ctx, t, false, 1, iso); s01_s02_terrainPass(ctx, iso, 1);
    return;
  }
  const B = s01_s02_BAKE, K = s01_s02_bake();
  ctx.drawImage(K.back, B.x, B.y);
  s01_s02_player(ctx, t, false, 1, iso);
  ctx.drawImage(K.front, B.x, B.y);
}
// violet wireframe version of exactly the same build — it now lights up in a RING
// spreading out from the bot: the bot is what is still running, so the farm comes
// back around him instead of sweeping in from the back of the field.
function s01_s02_worldCubes(ctx, t, wire, revealP, iso) {
  iso = iso || s01_s02_ISO;
  if (!wire) { s01_s02_worldTex(ctx, t, iso); return; }
  const violet = T().secondary, hot = TOKENS.violetHot;
  const span = s01_s02_VMAX - s01_s02_VMIN;
  for (const b of s01_s02_WORLD.vis) {
    if (b.kind === 'stone' || b.kind === 'dirt') continue;            // buried body: no wire needed
    const ord = (b.ix + b.iy - s01_s02_VMIN) / span;
    const a = clamp((revealP - b.rad * 0.62) / 0.38) * (0.55 + 0.45 * ord);
    if (a <= 0.02) continue;
    const pl = 0.5 + 0.5 * Math.sin(t * 2.4 - b.ix * 0.55 + b.iy * 0.8);
    const hotK = s01_s02_HOT[b.kind] === 1;
    cube(ctx, b.ix, b.iy, b.iz, {
      size: iso.size, cx: iso.cx, cy: iso.cy, alpha: a,
      color: '#0D0918', top: hotK ? '#2A1750' : '#1B1136', left: hotK ? '#150C28' : '#0A0716', right: '#07050F',
      outline: hotK ? hot : violet,
      outlineAlpha: (hotK ? 1.0 : 0.5) * a * (0.68 + 0.32 * pl),
      outlineWidth: hotK ? 2.6 : 1.3,
    });
  }
  for (const tr of s01_s02_TORCHES) s01_s02_torchPost(ctx, tr, true, iso);
  for (const f of s01_s02_FENCE) s01_s02_fencePost(ctx, f, true, iso);
}

// warm torch flames + their bloom — drawn AFTER the night pass so they stay bright
function s01_s02_flames(ctx, t, iso) {
  const s = iso.size;
  for (const tr of s01_s02_TORCHES) {
    const p = isoPos(tr.ix, tr.iy, tr.iz + 0.92, iso);
    const fl = 0.74 + 0.26 * Math.sin(t * 10.5 + tr.ix * 2.1 + tr.iy * 1.3);
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    ctx.fillStyle = '#C46A18'; ctx.fillRect(p.x - s * 0.085, p.y - s * 0.10, s * 0.17, s * 0.13);
    ctx.fillStyle = '#FFE7A8'; ctx.fillRect(p.x - s * 0.055, p.y - s * 0.09 - s * 0.03 * fl, s * 0.11, s * 0.1);
    ctx.restore();
    dot(ctx, p.x, p.y - s * 0.05, s * 2.7, '#FF9A34', 0.26 * fl);
    dot(ctx, p.x, p.y - s * 0.05, s * 0.85, '#FFCE88', 0.42 * fl);
  }
  for (const w of s01_s02_WORLD.pickles) {   // sea pickles are a light source too
    const p = isoPos(w.ix, w.iy, w.iz, iso);
    dot(ctx, p.x, p.y - s * 0.16, s * 0.85, '#C8E86A', 0.20);
  }
}

// items popping out of the pumpkins every 16th note — they now arc up-LEFT,
// across the furrows, instead of straight up.
// cullY (scene-local y): once the copy is up, keep the pops under the text — items
// spawn only from the front rows and fade out before they reach the headline block.
const s01_s02_DROPS = ['pumpkin', 'sea_pickle', 'emerald', 'pumpkin', 'gold_ingot', 'pumpkin'];
function s01_s02_items(ctx, t, wire, alpha, cullY) {
  const t0 = 0.12, step = 0.25, k1 = Math.floor((t - t0) / step);
  const src = cullY ? s01_s02_PUMPKINS_FRONT : s01_s02_PUMPKINS;
  if (!src.length) return;
  for (let k = Math.max(0, k1 - 3); k <= k1; k++) {
    const st = t0 + k * step, life = (t - st) / 0.9;
    if (life <= 0 || life >= 1) continue;
    const cell = src[Math.floor(hash1(k * 13 + 5) * src.length)];
    const p = isoPos(cell.ix, cell.iy, cell.iz + 1.1, s01_s02_ISO);
    const e = E.outCubic(life);
    const x = p.x - e * 58 + (hash2(k, 3) - 0.5) * 34, y = p.y - 10 - e * 126;
    let a = clamp((1 - life) * 1.5) * (life < 0.12 ? life / 0.12 : 1) * alpha;
    if (cullY) a *= clamp((y - cullY) / 130);
    if (a <= 0.01) continue;
    const sp = wire ? SPRITES.pumpkin : SPRITES[s01_s02_DROPS[k % s01_s02_DROPS.length]];
    dot(ctx, x, y, 46, wire ? TOKENS.violetHot : '#FFB25A', a * 0.38);
    pixelSprite(ctx, x, y, 4.2, sp.rows, wire ? s01_s02_PUMPPAL_V : sp.pal,
      { alpha: a, rotate: (hash2(k, 9) - 0.5) * 0.7 });
  }
}

// fireflies over the farm — the lit frames are never completely still
const s01_s02_FLIES = (() => {
  const r = rng(4407), o = [];
  for (let i = 0; i < 26; i++) o.push({
    x: 20 + r() * 960, y: 980 + r() * 840, ax: 26 + r() * 60, ay: 12 + r() * 30,
    fx: 0.24 + r() * 0.5, fy: 0.3 + r() * 0.6, ph: r() * 9, tw: 0.7 + r() * 1.5,
  });
  return o;
})();
function s01_s02_flies(ctx, t, alpha) {
  for (const f of s01_s02_FLIES) {
    const x = f.x + Math.sin(t * f.fx + f.ph) * f.ax, y = f.y + Math.cos(t * f.fy + f.ph * 1.7) * f.ay;
    const a = alpha * (0.12 + 0.32 * Math.pow(0.5 + 0.5 * Math.sin(t * f.tw + f.ph * 3), 3));
    if (a <= 0.02) continue;
    dot(ctx, x, y, 26, '#FFD07A', a * 0.55);
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = a;
    ctx.fillStyle = '#FFE9B4'; ctx.fillRect(x - 2, y - 2, 4, 4); ctx.restore();
  }
}

/* ------------------------------------------------------------ s01 pieces */
// Secondary content: new chat, same register, same sense — he is switching the PC
// off, she asks about the farm, [HugoAFK] answers that the bot stays online.
const s01_s02_CHAT = [
  { t: -0.62, s: '<Jonas> so, pc geht gleich aus', c: '#FFFFFF' },  // fully typed at f0 → the cover frame carries the whole hook
  { t: 0.16, s: '<Lea> und die kürbisfarm?', c: '#FFFFFF' },
  { t: 0.40, s: '<Jonas> läuft ohne mich :)', c: '#FFFFFF' },
  { t: 0.54, s: '[HugoAFK] Bot bleibt online.', c: TOKENS.violetHot, cps: 105 },   // readable before the 0.92 glitch ramp
];
const s01_s02_CHATY = 336;
let s01_s02_chatX = null;
function s01_s02_chatOrigin(ctx) {            // right-hand block, held inside x 90..900
  if (s01_s02_chatX != null) return s01_s02_chatX;
  const o = { size: 40, family: FONTS.term, weight: 400 };
  let m = 0;
  for (const l of s01_s02_CHAT) m = Math.max(m, measureText(ctx, l.s, o));
  s01_s02_chatX = Math.max(120, Math.min(366, 882 - m));
  return s01_s02_chatX;
}
function s01_s02_chat(ctx, t) {
  const lines = [];
  for (const l of s01_s02_CHAT) {
    if (t < l.t) break;
    const n = Math.min(l.s.length, Math.floor((t - l.t) * (l.cps || 62)));
    if (n <= 0) continue;
    lines.push({ t: l.s.slice(0, n), c: l.c, a: 1 });
  }
  if (!lines.length) return;
  mcChat(ctx, s01_s02_chatOrigin(ctx), s01_s02_CHATY, lines, { size: 40, lineHeight: 54, pad: 14, bgColor: 'rgba(0,0,0,0.5)' });
}
function s01_s02_power(ctx, x, y, r, a, g) {
  ctx.save(); ctx.globalAlpha *= a; ctx.globalCompositeOperation = 'lighter';
  dot(ctx, x, y, r * 2.6, T().primary, 0.55 * g);
  ctx.strokeStyle = '#FF6A6A'; ctx.lineWidth = r * 0.17; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.arc(x, y, r * 0.6, -Math.PI / 2 + 0.6, -Math.PI / 2 - 0.6 + TAU); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(x, y - r * 0.82); ctx.lineTo(x, y - r * 0.14); ctx.stroke();
  ctx.restore();
}

/* ------------------------------------------------------------------ s01 */
SCENES.s01 = {
  draw(ctx, lt, t) {
    const CRT0 = 1.0, CRT1 = 1.26;

    if (t < CRT1) {
      /* ---------- lit night farm (rendered offscreen so the CRT can eat it) */
      const o = s01_s02_off(), x = o.x;
      s01_s02_sky(x, t);

      // the camera trucks LEFT across the field while it settles down onto it
      const cp = remap(t, 0, 1.0);
      const cam = { zoom: 1.02 + 0.038 * cp, x: 24 - 40 * cp, y: 12 - 26 * cp, ox: 660, oy: 1180 };
      const wl = s01_s02_worldLayer();
      withCamera(wl.x, cam, c => {
        s01_s02_worldTex(c, t, s01_s02_ISO);
        c.globalCompositeOperation = 'source-atop';                 // ONE night pass over the whole build
        c.imageSmoothingEnabled = true;
        c.drawImage(s01_s02_lightOverlay(t), s01_s02_LIT.x0, s01_s02_LIT.y0, s01_s02_LIT.w, s01_s02_LIT.h);
      });
      x.drawImage(wl.c, 0, 0);
      // atmospheric haze where the field meets the horizon — pushes the back away
      linearFill(x, 0, 764, 0, 1114,
        [[0, 'rgba(56,52,112,0)'], [0.24, 'rgba(56,52,116,0.17)'], [0.55, 'rgba(38,36,84,0.09)'], [1, 'rgba(18,16,40,0)']],
        [0, 764, W, 350]);
      withCamera(x, cam, c => {
        s01_s02_flames(c, t, s01_s02_ISO);
        s01_s02_flies(c, t, 1);
        s01_s02_nametag(c, 1, t, s01_s02_ISO);
        s01_s02_items(c, t, false, 1);
      });
      s01_s02_chat(x, t);

      // red power button pulse just before the shutdown — now over the field,
      // up and right, where the bot's path leaves the frame
      const pw = win(t, 0.86, 0.94, 0.99, 1.02, E.outBack, E.outQuad);
      if (pw > 0.01) s01_s02_power(x, 706, 968, 78 * (0.85 + 0.15 * pw), pw, 0.6 + 0.4 * Math.sin(t * 40));

      if (t < CRT0) ctx.drawImage(o.c, 0, 0);
      else crtCollapse(ctx, o.c, 1 - remap(t, CRT0, CRT1), { glow: TOKENS.violetHot });

      if (t > 0.9) { FX.rgb = Math.max(FX.rgb, 10 * remap(t, 0.92, 1.02)); FX.glitch = Math.max(FX.glitch, 0.25 * remap(t, 0.94, 1.02)); }
      if (t >= CRT0) { FX.bloom = Math.max(FX.bloom, 0.35); FX.scan = Math.max(FX.scan, 0.12 * (1 - remap(t, CRT0, CRT1))); }
      return;
    }

    /* ---------- black + the bot keeps playing in violet wireframe */
    ctx.save(); ctx.fillStyle = '#000000'; ctx.fillRect(0, 0, W, H); ctx.restore();

    // residual CRT line
    const rl = 1 - remap(t, CRT1, 1.46);
    if (rl > 0.01) {
      ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = rl;
      const lw = W * (0.25 + 0.75 * rl * rl);
      linearFill(ctx, CX - lw / 2, 0, CX + lw / 2, 0,
        [[0, 'rgba(199,125,255,0)'], [0.5, 'rgba(255,255,255,0.95)'], [1, 'rgba(199,125,255,0)']],
        [CX - lw / 2, H / 2 - 2.5, lw, 5], 'lighter');
      ctx.restore();
    }

    nightSky(ctx, t, { count: 72, seed: 47, alpha: 0.30 * remap(t, 1.6, 2.4), hMul: 0.58, drift: true });
    // faint violet aurora above the wireframe world, so the upper third is not dead black
    const aur = remap(t, 1.5, 2.3);
    if (aur > 0.01) {
      radialFill(ctx, CX + 170, 250, 900, [[0, rgba(TOKENS.deepViolet, 0.30 * aur)], [0.58, rgba(TOKENS.deepViolet, 0.11 * aur)], [1, 'rgba(0,0,0,0)']], 'lighter');
      radialFill(ctx, CX - 300, 520, 620, [[0, rgba(T().secondary, 0.11 * aur)], [1, 'rgba(0,0,0,0)']], 'lighter');
    }

    const revealP = ez(t, 1.38, 2.1, E.outCubic);
    const botA = ez(t, 1.30, 1.56, E.outCubic) * (0.82 + 0.18 * Math.sin(t * 7));
    // continuous camera: a slow slide to the left out of the reveal, then the push
    // into the cut — no frame between 1.3 and 3.0 sits still.
    const creep = remap(t, 1.26, 3.0), push = ez(t, 2.30, 3.0, E.inQuad);
    const zoom = 1.02 + 0.06 * creep + 0.14 * push;
    withCamera(ctx, {
      zoom, x: -20 * creep - 26 * push + 7 * Math.sin((t - 1.3) * 1.1),
      y: 9 * creep + 20 * push, ox: 726, oy: 1560,
    }, c => {
      // ground glow so the wireframe does not float in nothing
      radialFill(c, 600, 1500, 720, [[0, rgba(TOKENS.deepViolet, 0.34 * revealP)], [1, 'rgba(0,0,0,0)']], 'lighter');
      s01_s02_worldCubes(c, t, true, revealP);
      s01_s02_player(c, t, true, botA, s01_s02_ISO);
      s01_s02_items(c, t, true, revealP, t > 1.42 ? 1200 : 0);
    });
    // violet motes drifting up out of the farm — keeps the hold alive under the copy
    s01_s02_dust.draw(ctx, t, { alpha: 0.34 * remap(t, 1.27, 1.95), scale: 1 });

    // headlines
    const hp = ez(t, 1.25, 1.55, E.outExpo), sp = ez(t, 1.75, 2.10, E.outExpo);
    const flt = 3.2 * Math.sin((t - 1.3) * 1.7);          // slow float so the copy never freezes
    if (hp > 0) {
      band(ctx, 880, 460, 0.42 * Math.max(hp, sp));
      const slam = 1 + 0.12 * (1 - E.outExpo(remap(t, 1.25, 1.40)));
      ctx.save(); ctx.translate(CX, 740); ctx.scale(slam, slam); ctx.translate(-CX, -740);
      s01_s02_head(ctx, 'PC AUS.', CX, 740 - flt * 0.6, 150, T().text, hp, 'rise');
      ctx.restore();
      if (t < 1.40) FX.rgb = Math.max(FX.rgb, 9 * (1 - remap(t, 1.25, 1.40)));
    }
    if (sp > 0) {
      s01_s02_head(ctx, 'FARM LÄUFT', CX, 905 + flt, 110, TOKENS.violetHot, sp, 'rise');
      s01_s02_head(ctx, 'WEITER.', CX, 1020 + flt * 1.25, 110, TOKENS.violetHot, ez(t, 1.86, 2.20, E.outExpo), 'rise');
    }

    FX.bloom = Math.max(FX.bloom, 0.30);
    if (t > 2.6) FX.rgb = Math.max(FX.rgb, 5 * remap(t, 2.6, 3.0));   // riser into the cut
  },
};

/* ------------------------------------------------------------ s02 pieces */
// The TikTok safe box is x 90..900 — centred on x 495, only 810 px wide. A CX-centred
// lockup would push the last "O" under the right rail once the kick scale hits, so the
// whole s02 block is centred on x 500 and the lockup is 720 px wide:
// measured max red ink = x 881 with breathe + kick punch + sway all at maximum.
const s01_s02_SCX = 500, s01_s02_LOCKW = 720, s01_s02_LOCKY = 780;
function s01_s02_lock() {
  const M = IMG.meta, s = s01_s02_LOCKW / M.full.w, h = M.full.h * s;
  return { s, w: s01_s02_LOCKW, h, x: s01_s02_SCX - s01_s02_LOCKW / 2, y: s01_s02_LOCKY - h / 2, M };
}
// Outer halo only: the logo PNGs carry the letter counters and the gaps between the
// letters as transparent alpha, so a blurred copy sitting behind the sharp logo shines
// straight through them and the wordmark reads as one slab. Punch the silhouette out of
// the blur so the glow can only ever live outside the letterforms.
let s01_s02_glowC = null;
function s01_s02_glowCache() {
  if (s01_s02_glowC) return s01_s02_glowC;
  const L = s01_s02_lock(), pad = 110;
  const c = makeCanvas(Math.ceil(L.w + pad * 2), Math.ceil(L.h + pad * 2)), x = c.getContext('2d');
  x.filter = 'blur(34px)'; x.drawImage(IMG.logo, pad, pad, L.w, L.h);
  x.filter = 'none';
  x.globalCompositeOperation = 'destination-out';
  x.drawImage(IMG.logo, pad, pad, L.w, L.h);
  x.drawImage(IMG.logo, pad, pad, L.w, L.h);          // twice: also clears the antialiased rim
  s01_s02_glowC = { c, pad, w: L.w, h: L.h };
  return s01_s02_glowC;
}
// soft near-black plate in the shape of the lockup — keeps the counters and the seams
// between the letters dark, whatever the backdrop is doing
let s01_s02_matteC = null;
function s01_s02_matteCache() {
  if (s01_s02_matteC) return s01_s02_matteC;
  const L = s01_s02_lock(), pad = 70;
  const c = makeCanvas(Math.ceil(L.w + pad * 2), Math.ceil(L.h + pad * 2)), x = c.getContext('2d');
  x.filter = 'blur(13px)'; x.drawImage(IMG.logo, pad, pad, L.w, L.h);
  x.filter = 'none';
  x.globalCompositeOperation = 'source-in';
  x.fillStyle = '#05040A'; x.fillRect(0, 0, c.width, c.height);
  s01_s02_matteC = { c, pad };
  return s01_s02_matteC;
}
let s01_s02_shineC = null;
function s01_s02_shine(ctx, L, pos, alpha) {
  if (!s01_s02_shineC) s01_s02_shineC = makeCanvas(Math.ceil(L.w), Math.ceil(L.h));
  const c = s01_s02_shineC, x = c.getContext('2d');
  x.setTransform(1, 0, 0, 1, 0, 0); x.globalCompositeOperation = 'source-over'; x.filter = 'none';
  x.clearRect(0, 0, c.width, c.height);
  const sx = lerp(L.w * 1.5, -L.w * 0.5, pos);                 // sweeps right -> left now
  const g = x.createLinearGradient(sx - 150, L.h, sx + 150, 0);
  g.addColorStop(0, 'rgba(255,255,255,0)'); g.addColorStop(0.5, 'rgba(255,255,255,0.85)'); g.addColorStop(1, 'rgba(255,255,255,0)');
  x.fillStyle = g; x.fillRect(0, 0, c.width, c.height);
  x.globalCompositeOperation = 'destination-in'; x.drawImage(IMG.logo, 0, 0, L.w, L.h);
  ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha *= alpha;
  ctx.drawImage(c, L.x, L.y); ctx.restore();
}
// 600 voxel shards flying out of the impact
const s01_s02_BURST = (() => {
  const r = rng(4711), out = [];
  for (let i = 0; i < 600; i++) {
    const cr = r();
    out.push({
      ang: r() * TAU, sp: 160 + r() * 1500, sz: 4 + r() * 16, r0: 60 + r() * 320,
      col: cr < 0.42 ? '#FF2E2E' : cr < 0.8 ? '#A855F7' : '#C77DFF',
      rot: (r() - 0.5) * 7, life: 0.5 + r() * 0.6, rise: r() * 0.5,
    });
  }
  return out;
})();
const s01_s02_dust = new Particles({
  seed: 913, count: 80, size: [2, 7], vel: { x: -24, y: -26 },
  area: { x0: -80, y0: -80, x1: W + 80, y1: H + 80 },
  color: '#C77DFF', alpha: 0.45, drift: 44, twinkle: 1.2,
});
const s01_s02_kick = t => t < 3.46 ? 0 : pulse(t, 0.5, 7, 3.5);

// voxel motes drifting diagonally behind the lockup, in three parallax depth bands — the
// farm's particles carried into the logo beat, and the thing that keeps the picture moving
// between the kicks (this is what fills the 3.3-4.6 hold, where the frame is otherwise empty)
const s01_s02_MOTES = (() => {
  const r = rng(2609), out = [];
  // three parallax depth bands instead of one even scatter: far dust, a mid stream and a few
  // near blocks that only cross the lower third — the diagonal drift reads as a real stream
  const BANDS = [
    { n: 36, sz: [6, 13], sp: [38, 74], a: [0.10, 0.20], sway: [8, 20], lane: [-680, W + 140], yLo: 0.00 },
    { n: 30, sz: [15, 30], sp: [84, 148], a: [0.20, 0.34], sway: [16, 38], lane: [-720, W + 160], yLo: 0.00 },
    { n: 14, sz: [34, 60], sp: [162, 232], a: [0.22, 0.38], sway: [22, 52], lane: [-780, W + 200], yLo: 0.46 },
  ];
  for (let b = 0; b < BANDS.length; b++) {
    const B = BANDS[b];
    for (let i = 0; i < B.n; i++) out.push({
      band: b,
      x: B.lane[0] + r() * (B.lane[1] - B.lane[0]),
      sz: B.sz[0] + r() * (B.sz[1] - B.sz[0]),
      sp: B.sp[0] + r() * (B.sp[1] - B.sp[0]),
      ph: r() * 2400,
      sway: B.sway[0] + r() * (B.sway[1] - B.sway[0]), swf: 0.5 + r() * 0.9,
      col: r() < 0.72 ? '#A855F7' : '#C77DFF',
      a: B.a[0] + r() * (B.a[1] - B.a[0]),
      yLo: B.yLo,
    });
  }
  return out;
})();
function s01_s02_motes(ctx, t, alpha) {
  if (alpha <= 0.01) return;
  const span = H + 340;
  const LX = s01_s02_SCX, LY = s01_s02_LOCKY;
  for (const m of s01_s02_MOTES) {
    const prog = (((t * m.sp + m.ph) % span) + span) % span;    // 0 at the bottom edge
    const y = H + 170 - prog;
    if (y < m.yLo * H) continue;                                // the near band stays low in frame
    const x = m.x + prog * 0.36 + Math.sin(t * m.swf + m.ph) * m.sway;
    if (x < -70 || x > W + 70) continue;
    // nothing heavy sits on the lockup: the bigger the block, the wider it keeps clear of it
    const clear = clamp((Math.hypot((x - LX) / 1.35, y - LY) - 190 - m.sz * 3.4) / 150);
    if (clear <= 0.02) continue;
    cube(ctx, 0, 0, 0, {
      size: m.sz, cx: x, cy: y, color: m.col, alpha: m.a * alpha * clear,
      topF: 1.35, leftF: 0.8, rightF: 0.52,
    });
  }
}

// the "violettes Voxel-Gitter" behind the lockup: an isometric block lattice that
// lights up in a wave running from the lower left to the upper right.
function s01_s02_grid(ctx, t) {
  const p = ez(t, 4.6, 5.8, E.outCubic);
  if (p <= 0) return;
  const c = 84, hw = c * ISO.w, hh = c * ISO.h, gx = s01_s02_SCX + 44, gy = 940;
  ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.lineWidth = 1.5;
  for (let a = -15; a <= 15; a++) for (let b = -15; b <= 15; b++) {
    const cx = gx + (a - b) * hw, cy = gy + (a + b) * hh;
    if (cx < -130 || cx > W + 130 || cy < 200 || cy > H - 90) continue;
    const ord = clamp((cx / W) * 0.55 + (1 - cy / H) * 0.45);
    const al = clamp((p - ord * 0.6) / 0.4);
    if (al <= 0.02) continue;
    const tw = 0.45 + 0.55 * Math.sin(t * 2.6 + a * 0.8 - b * 0.7);
    ctx.strokeStyle = rgba(T().secondary, 0.26 * al * (0.5 + 0.5 * tw));
    ctx.beginPath();
    ctx.moveTo(cx, cy - hh + 5); ctx.lineTo(cx + hw - 9, cy);
    ctx.lineTo(cx, cy + hh - 5); ctx.lineTo(cx - hw + 9, cy); ctx.closePath(); ctx.stroke();
    if (hash2(a + 20, b + 20) > 0.86) {
      ctx.fillStyle = rgba(TOKENS.violetHot, 0.16 * al * tw);
      ctx.fill();
    }
  }
  ctx.restore();
}

/* ------------------------------------------------------------------ s02 */
SCENES.s02 = {
  draw(ctx, lt, t) {
    const L = s01_s02_lock(), k = s01_s02_kick(t), HIT = 3.12;

    /* -------- backdrop */
    const SCX = s01_s02_SCX;
    // the light no longer sits symmetrically on the lockup: a violet pool rakes up from the
    // lower left, the red rim sits high right — the hold reads as a lit stage, not a vignette
    const bgp = 0.16 + 0.07 * k;
    radialFill(ctx, SCX - 230, s01_s02_LOCKY + 400, 1000,
      [[0, rgba(TOKENS.deepViolet, bgp * 1.06)], [0.55, rgba(TOKENS.deepViolet, bgp * 0.34)], [1, 'rgba(0,0,0,0)']], 'lighter');
    radialFill(ctx, SCX + 270, s01_s02_LOCKY - 320, 660,
      [[0, rgba(T().primary, 0.105 + 0.06 * k)], [1, 'rgba(0,0,0,0)']], 'lighter');
    radialFill(ctx, SCX, s01_s02_LOCKY, 430,
      [[0, rgba(TOKENS.deepViolet, bgp * 0.42)], [1, 'rgba(0,0,0,0)']], 'lighter');
    nightSky(ctx, t, { count: 70, seed: 47, alpha: 0.22, hMul: 0.6, drift: true });

    // background camera: a constant slow drift from the impact on, then the push of the
    // last bar — the backdrop is never still between the kicks
    const bdrift = remap(t, 3.2, 4.6), bpush = ez(t, 4.6, 6.0, E.inOutCubic);
    withCamera(ctx, { zoom: 1 + 0.022 * bdrift + 0.05 * bpush, x: -9 * Math.sin((t - 3.2) * 0.85), y: 6 * bdrift + 10 * bpush }, c => {
      s01_s02_grid(c, t);
      s01_s02_motes(c, t, 0.9 * remap(t, 3.16, 3.7));
      // the farm from s01 keeps running behind the logo — violet wireframe horizon
      const fp = ez(t, 4.45, 5.8, E.outCubic);
      if (fp > 0.01) {
        c.save(); c.globalAlpha *= 0.58 * fp;
        radialFill(c, 700, 1980, 780, [[0, rgba(TOKENS.deepViolet, 0.34)], [1, 'rgba(0,0,0,0)']], 'lighter');
        s01_s02_worldCubes(c, t, true, fp, { size: 76, cx: 706, cy: 2036 });
        c.restore();
      }
    });
    s01_s02_dust.draw(ctx, t, { alpha: 0.30 + 0.20 * k, scale: 1 });

    /* -------- shockwave rings (unchanged: the hit the scene is built around) */
    const swl = remap(t, HIT, HIT + 0.55);
    if (swl > 0 && swl < 1) {
      shockwave(ctx, SCX, s01_s02_LOCKY, swl, { radius: 1150, color: T().primary, width: 20, alpha: 0.85 });
      shockwave(ctx, SCX, s01_s02_LOCKY, remap(t, HIT + 0.05, HIT + 0.7), { radius: 1300, color: T().secondary, width: 12, alpha: 0.7 });
    }

    /* -------- logo lockup — the two halves now CLAP together horizontally:
       HUGO comes in from the left, AFK from the right, both from slightly too
       far away (scale 1.16 -> 1.0) and slightly tilted, and they snap flat on
       the same 3.12 frame as before. */
    const e = ez(t, 3.0, HIT, E.outQuint), inv = 1 - e;
    const rec = t >= HIT ? Math.exp(-13 * (t - HIT)) * Math.sin((t - HIT) * 40) * 13 : 0;
    const dxH = -inv * 1220 - rec, dxA = inv * 1220 + rec;
    const dyH = -inv * inv * 130, dyA = inv * inv * 130;
    const rotH = -inv * 0.05, rotA = inv * 0.05;
    const scH = 1 + inv * 0.16;
    const breathe = t > 3.3 ? 0.010 * (1 - Math.cos((t - 3.3) * TAU / 1.6)) : 0;
    const sc = 1 + breathe + 0.028 * k + 0.05 * Math.exp(-16 * Math.max(0, t - HIT)) + 0.03 * ez(t, 5.75, 6.0, E.inQuad);

    const hgH = L.M.hugo.h * L.s, afH = L.M.afk.h * L.s, afY = L.y + L.M.afk.offsetY * L.s;
    const hcx = L.x + L.w / 2, hcy = L.y + hgH / 2, acx = L.x + L.w / 2, acy = afY + afH / 2;
    const half = (img, iy, ih, dx, dy, rot, cxp, cyp, alpha) => {
      ctx.save();
      if (alpha != null) ctx.globalAlpha *= alpha;
      ctx.translate(cxp + dx, cyp + dy); ctx.rotate(rot); ctx.scale(scH, scH); ctx.translate(-cxp, -cyp);
      ctx.drawImage(img, L.x, iy, L.w, ih);
      ctx.restore();
    };

    // slow sway on top of the breathe — the biggest bright object in frame keeps moving
    // between the kicks (amplitude budgeted into the safe-area maths above)
    const swx = t > 3.2 ? 4.0 * Math.sin((t - 3.2) * 1.05) : 0;
    const swy = t > 3.2 ? 6.5 * Math.sin((t - 3.2) * 1.55) : 0;

    ctx.save();
    ctx.translate(SCX + swx, s01_s02_LOCKY + swy); ctx.scale(sc, sc); ctx.translate(-SCX, -s01_s02_LOCKY);

    if (t > 3.04) {
      const app = clamp(remap(t, 3.04, 3.16));
      // halo first — already masked to the outside of the letterforms …
      const G = s01_s02_glowCache();
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = (0.24 + 0.10 * k + 0.18 * Math.exp(-9 * Math.max(0, t - HIT))) * app;
      ctx.drawImage(G.c, L.x - G.pad, L.y - G.pad);
      ctx.restore();
      // … then a tight near-black plate ON TOP of it: the halo can only survive outside
      // the plate's feather, so the counters and the narrow gaps between the letters
      // stay dark and the wordmark reads as letters instead of one red slab.
      const Mt = s01_s02_matteCache();
      ctx.save(); ctx.globalAlpha = 0.88 * app;
      ctx.drawImage(Mt.c, L.x - Mt.pad, L.y - Mt.pad);
      ctx.restore();
    }
    // motion trails along the travel — horizontal now
    const smear = clamp(inv * 4);                    // the trail dies with the travel
    if (t < HIT && smear > 0.01) {
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      for (let i = 1; i <= 5; i++) {
        const f = i / 5 * 240 * smear;
        half(IMG.logoHugo, L.y, hgH, dxH - f, dyH, rotH, hcx, hcy, 0.17 * smear);
        half(IMG.logoAfk, afY, afH, dxA + f, dyA, rotA, acx, acy, 0.17 * smear);
      }
      ctx.restore();
    }
    half(IMG.logoHugo, L.y, hgH, dxH, dyH, rotH, hcx, hcy);
    half(IMG.logoAfk, afY, afH, dxA, dyA, rotA, acx, acy);

    // one specular sweep across the lockup
    const shp = remap(t, 4.85, 5.45);
    if (shp > 0 && shp < 1) s01_s02_shine(ctx, L, shp, 0.55 * Math.sin(shp * Math.PI));
    ctx.restore();

    /* -------- voxel shard burst (in front) — flattened along the clap axis */
    if (t >= HIT && t < HIT + 1.2) {
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      for (let i = 0; i < s01_s02_BURST.length; i++) {
        const b = s01_s02_BURST[i], p = (t - HIT) / b.life;
        if (p >= 1) continue;
        const eb = E.outQuint(p), r = b.r0 + b.sp * eb;
        const x = SCX + Math.cos(b.ang) * r * 1.12;
        const y = s01_s02_LOCKY + Math.sin(b.ang) * r * 0.68 - b.rise * 120 * eb + 820 * p * p;
        const s = b.sz * (1 - p * 0.55);
        ctx.save(); ctx.globalAlpha = 0.9 * Math.pow(1 - p, 1.3);
        ctx.translate(x, y); ctx.rotate(b.rot * p);
        ctx.fillStyle = b.col; ctx.fillRect(-s / 2, -s / 2, s, s);
        ctx.restore();
      }
      ctx.restore();
    }

    /* -------- copy */
    const sub = ez(t, 3.6, 4.0, E.outExpo);
    if (sub > 0) {
      drawKinetic(ctx, 'Bleib online. Auch offline.', SCX, 1120,
        { size: 52, family: FONTS.head, weight: 500, tracking: 0.02 * 52, color: rgba(T().text, 0.88), align: 'center' },
        sub, 'rise');
    }
    const kick = ez(t, 4.3, 4.6, E.outExpo);
    if (kick > 0) {
      const str = 'AFK-Client für den HugoSMP';
      const tr = 0.07;                                 // tighter tracking buys size, not width
      let ks = 42;                                     // fit inside the TikTok-safe box (SCX ± 390)
      for (let i = 0; i < 10; i++) {
        const o = { size: ks, family: FONTS.silk, weight: 700, tracking: tr * ks };
        const w = measureText(ctx, str, o);
        if (w <= 770) break;
        ks *= (770 / w) * 0.995;
      }
      drawKinetic(ctx, str, SCX, 1220,
        { size: ks, family: FONTS.silk, weight: 700, tracking: tr * ks, color: rgba(T().text, 0.72), align: 'center' },
        kick, 'type');
    }

    /* -------- post fx (the timeline already flashes at the 3.0 cut — never stack a
       second flash on top of it, that is what caused the white wash + flicker) */
    if (t < HIT + 0.12) FX.rgb = Math.max(FX.rgb, 9 * (1 - remap(t, HIT, HIT + 0.10)));
    FX.shake = Math.max(FX.shake, 5 * k * (t < 5.9 ? 1 : 0));
    FX.bloom = Math.max(FX.bloom, 0.28);
  },
};
