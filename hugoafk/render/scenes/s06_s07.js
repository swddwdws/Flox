/* s06_s07.js
   s06  15.0–17.5  "World-Reset erkannt."   — Warn-HUD, 2-Frame-Glitch, Bot löst sich in Voxel auf,
                                              schwarze Pause mit violettem Ladebalken, Rematerialisierung + Haken
   s07  17.5–20.5  "Steuerung vom Handy."   — Handy fliegt mit 3D-Kippen ein, Live-Konsole (VT323),
                                              Statuszeile ONLINE + Laufzeit, Finger-Tap auf STOPP, Neustart
   Alles ist eine reine Funktion von t. Alle Modul-Namen sind mit s06_s07_ präfixiert. */

/* ------------------------------------------------------------------ tiny helpers */
// shrink a line until it fits maxW (keeps the -0.04 em tracking of the style guide)
function s06_s07_fit(ctx, str, o, maxW) {
  let size = o.size;
  for (let k = 0; k < 40 && size > 24; k++) {
    if (measureText(ctx, str, Object.assign({}, o, { size: size, tracking: (o.trackF != null ? o.trackF : -0.04) * size })) <= maxW) break;
    size -= 1.5;
  }
  return size;
}
// headline slam: scale 1.18 -> 1.0 (outExpo, 0.15 s) + ~3 frames of RGB split
function s06_s07_slam(ctx, str, x, y, o, t, t0, dur) {
  const p = clamp((t - t0) / (dur || 0.15));
  if (p <= 0) return;
  const e = E.outExpo(p);
  if (t - t0 < 0.1) FX.rgb = Math.max(FX.rgb, 8 * (1 - e));
  ctx.save();
  ctx.translate(x, y); ctx.scale(lerp(1.18, 1, e), lerp(1.18, 1, e));
  drawText(ctx, str, 0, 0, Object.assign({}, o, { alpha: (o.alpha != null ? o.alpha : 1) * clamp(p * 6) }));
  ctx.restore();
}
// one cube anchored at a screen point (mixes cube sizes inside one iso scene)
function s06_s07_blk(ctx, x, y, size, color, o) {
  return cube(ctx, 0, 0, 0, Object.assign({ size: size, cx: x, cy: y, color: color }, o || {}));
}
// hex-safe colour mix — cube()/rgba() parse hex only, mixColor() returns "rgb(...)"
function s06_s07_mix(h1, h2, k) {
  const a = hexToRgb(h1), b = hexToRgb(h2), h = v => ('0' + Math.round(v).toString(16)).slice(-2);
  return '#' + h(lerp(a[0], b[0], k)) + h(lerp(a[1], b[1], k)) + h(lerp(a[2], b[2], k));
}
// painter order for isometric cells: back to front = (ix + iy + iz) ascending
// (cubeField sorts by ix+iy-iz, which puts stacked blocks in the wrong order — see report)
function s06_s07_isoSort(cells) {
  return cells.slice().sort((a, b) => (a.ix + a.iy + (a.iz || 0)) - (b.ix + b.iy + (b.iz || 0)));
}

/* ================================================================== s06 — die HugoSMP-Nachtfarm
   Zweiter Durchgang: eine echte Minecraft-Welt statt bunter Würfel.
     · Gelände mit Tiefe: Grasplateau der Farm, Hügelstufe dahinter, Wiese davor, die eine
       Blockstufe abfällt — alles aus TEXTURIERTEN Blöcken (gebackenes AO in der Engine)
     · begrenzte Farm-Parzelle: Kürbisreihen auf Ackerland mit Stielen dazwischen,
       ein Wassergraben mit Sea Pickles, zwei Kopfsteinwege, ein Eichenzaun
     · drei Eichen (Stamm + ausgefranste Blätterkrone), Fackeln, eine Kiste, Findlinge
     · der AFK-SPIELER (mcPlayer) steht auf der reservierten Kachel und erntet
   Nachtlook: die Blöcke gehen in eine eigene Ebene, EIN Lichtdurchgang ('source-atop')
   dunkelt die Welt ab und schneidet warme Pfützen um die Fackeln heraus. */

const s06_ISO  = { size: 66, cx: CX, cy: 1200 };
const s06_UMAX = 10, s06_VMIN = -5, s06_VMAX = 23;      // visible (ix-iy) / (ix+iy) window
const s06_PT   = { ix: 4, iy: -1 };                     // the reserved tile — the AFK player's spot
const s06_CHK  = { x: 700, y: 1000 };                   // where the green check lands (left of the player)
const s06_PLOT = { x0: -2, x1: 6, y0: -1, y1: 5 };      // the bounded farm plot

const s06_TEX = {
  grass:   { top: 'grass_top', side: 'grass_side' },
  dirt:    'dirt',
  stone:   'stone',
  cobble:  'cobblestone',
  soil:    { top: 'farmland', side: 'dirt' },
  crop:    { top: 'farmland_crop', side: 'dirt' },
  water:   'water',
  sand:    'sand',
  pumpkin: { top: 'pumpkin_top', side: 'pumpkin_side' },
  log:     { top: 'oak_log_top', side: 'oak_log_side' },
  leaves:  'oak_leaves',
  chest:   { top: 'oak_planks', side: 'chest' },
};
const s06_HOT = { pumpkin: 1, leaves: 1, water: 1, chest: 1 };   // hot violet outline in the wireframe
// what a plot row is made of (iy runs from the back path to the front path)
const s06_ROW = { '-1': 'cobble', '0': 'soil', '1': 'crop', '2': 'water', '3': 'soil', '4': 'crop', '5': 'cobble' };
const s06_PAR = { '0': 0, '3': 1 };                     // pumpkin on every other tile, staggered

// tall, compact oaks — a long visible trunk reads as a tree, a fat canopy just reads as a hill.
// Their canopies are kept off the player's column (ix-iy ≈ 5) so he is never hidden by leaves.
// Two of them stand where their crowns break the horizon line into the night sky (x < 200 and
// x > 880, i.e. outside every text column), which is what makes them read as trees at all.
const s06_TREES = [
  { ix: -3, iy:  4, trunk: 4, R: 1 },                   // hero oak, west edge
  { ix:  4, iy: -3, trunk: 4, R: 1 },                   // hero oak, east of the player
  { ix:  5, iy: 10, trunk: 3, R: 1 },                   // foreground oak, lower left
];
const s06_POND = { x0: -6, x1: -4, y0: 1, y1: 3 };      // a little pond west of the farm
const s06_TORCH = [
  { ix:  1, iy: -1 }, { ix: 6, iy: -1 },                // on the path, flanking the player
  { ix:  0, iy: -2 }, { ix: 5, iy: -2 },                // on the fence behind him
  { ix: -2, iy:  5 }, { ix: -3, iy: 1 },                // the front path and the plot corner
  { ix:  4, iy:  7 }, { ix: -4, iy: -1 },               // the meadow and the path out of the farm
];
// oak fence: along the back edge of the plot and up its left flank
const s06_FENCE = (() => {
  const o = [];
  for (let ix = 0; ix <= 6; ix++) o.push({ ix: ix, iy: -2 });
  for (let iy = 0; iy <= 3; iy++) o.push({ ix: -3, iy: iy });
  return o;
})();
const s06_CHEST = { ix: -1, iy: -2 };
// the cobble path continues out of the farm, back over the rise
const s06_PATHOUT = (() => { const o = []; for (let ix = -6; ix <= -3; ix++) o.push({ ix: ix, iy: -1 }); return o; })();

// terrain height: the farm sits on a grass plain that terraces down at the front
function s06_hAt(ix, iy) {
  if (ix >= s06_PLOT.x0 - 1 && ix <= s06_PLOT.x1 + 1 && iy >= s06_PLOT.y0 - 1 && iy <= s06_PLOT.y1 + 1) return 1;
  const v = ix + iy + (hash2(ix * 7 + 3, iy * 11 + 5) - 0.5) * 2.4;
  if (v <= 9.5) return 1;
  if (v <= 15.0) return 0;
  return -1;
}

/* ------------------------------------------------- build the world once ---
   One block per flat tile; a column only grows downwards where the terrain really
   steps, and every block covered by (ix+1, iy+1, iz+1) is dropped again. */
const s06_WORLD = (() => {
  const occ = new Set(), K = (a, b, c) => a + '|' + b + '|' + c;
  const solid = [], pumpkins = [], pickles = [];
  const put = (ix, iy, iz, kind) => { const k = K(ix, iy, iz); if (occ.has(k)) return; occ.add(k); solid.push({ ix: ix, iy: iy, iz: iz, kind: kind }); };
  const inWin = (ix, iy, m) => Math.abs(ix - iy) <= s06_UMAX + (m || 0) && ix + iy >= s06_VMIN - (m || 0) && ix + iy <= s06_VMAX + (m || 0);
  const treeAt = (ix, iy) => { for (const tr of s06_TREES) if (tr.ix === ix && tr.iy === iy) return true; return false; };

  for (let ix = -32; ix <= 32; ix++) for (let iy = -32; iy <= 32; iy++) {
    if (!inWin(ix, iy, 2)) continue;
    const h = s06_hAt(ix, iy);
    const inPlot = ix >= s06_PLOT.x0 && ix <= s06_PLOT.x1 && iy >= s06_PLOT.y0 && iy <= s06_PLOT.y1;
    let row = inPlot ? s06_ROW[String(iy)] : null;
    if (!row && iy === -1 && ix >= -6 && ix < s06_PLOT.x0) row = 'cobble';   // the path out of the farm
    if (!row && ix >= s06_POND.x0 && ix <= s06_POND.x1 && iy >= s06_POND.y0 && iy <= s06_POND.y1) row = 'water';
    if (!row && ix >= s06_POND.x0 - 1 && ix <= s06_POND.x1 + 1 && iy >= s06_POND.y0 - 1 && iy <= s06_POND.y1 + 1) row = 'sand';
    if (!row && !inPlot && hash2(ix * 13 + 7, iy * 29 + 3) > 0.955) row = 'dirt';
    let kind = 'grass', pump = false;
    if (row && !treeAt(ix, iy)) {
      kind = row;
      if (row === 'soil') {
        pump = (((ix % 2) + 2) % 2) === s06_PAR[String(iy)];
        if (!pump) kind = 'crop';                       // stems between the pumpkins
      }
    }
    put(ix, iy, h, kind);
    const hn = Math.min(s06_hAt(ix + 1, iy + 1), s06_hAt(ix + 1, iy), s06_hAt(ix, iy + 1));
    for (let z = h - 1; z >= hn && z >= h - 3; z--) put(ix, iy, z, z === h - 1 ? 'dirt' : 'stone');
    if (pump) { put(ix, iy, h + 1, 'pumpkin'); pumpkins.push({ ix: ix, iy: iy, iz: h + 1 }); }
    if (kind === 'water' && hash2(ix * 5 + 1, iy * 7 + 9) > 0.44) pickles.push({ ix: ix, iy: iy, iz: h });
  }
  // oak trees: log stem, two wide leaf layers with the corners cut, a cap —
  // a few rim leaves are dropped so the silhouette stays ragged, not a green box
  for (const tr of s06_TREES) {
    const h = s06_hAt(tr.ix, tr.iy), R = tr.R;
    for (let k = 1; k <= tr.trunk; k++) put(tr.ix, tr.iy, h + k, 'log');
    for (const lz of [tr.trunk, tr.trunk + 1]) for (let dx = -R; dx <= R; dx++) for (let dy = -R; dy <= R; dy++) {
      if (R > 1 && Math.abs(dx) === R && Math.abs(dy) === R) continue;
      if (dx === 0 && dy === 0 && lz === tr.trunk) continue;
      const rim = Math.max(Math.abs(dx), Math.abs(dy)) === R;
      if (rim && hash2(tr.ix * 31 + dx, tr.iy * 17 + dy * 7 + lz) < (lz > tr.trunk ? 0.30 : 0.12)) continue;
      put(tr.ix + dx, tr.iy + dy, h + lz, 'leaves');
    }
    for (let dx = -1; dx <= 1; dx++) for (let dy = -1; dy <= 1; dy++) {
      if (Math.abs(dx) + Math.abs(dy) === 2 && hash2(tr.ix + dx * 5, tr.iy + dy * 9) < 0.62) continue;
      put(tr.ix + dx, tr.iy + dy, h + tr.trunk + 2, 'leaves');
    }
  }
  // boulders and bushes on the grass — never inside the farm rows
  for (let ix = -32; ix <= 32; ix++) for (let iy = -32; iy <= 32; iy++) {
    if (!inWin(ix, iy, 0) || ix + iy < -2) continue;   // nothing tall on the back edge (text sits there)
    if (ix >= s06_PLOT.x0 - 1 && ix <= s06_PLOT.x1 + 1 && iy >= s06_PLOT.y0 - 1 && iy <= s06_PLOT.y1 + 1) continue;
    const h = s06_hAt(ix, iy);
    if (occ.has(K(ix, iy, h + 1))) continue;
    const hs = hash2(ix * 19 + 101, iy * 23 + 7);
    if (hs > 0.962) put(ix, iy, h + 1, hs > 0.984 ? 'cobble' : 'stone');
    else if (hs < 0.034) put(ix, iy, h + 1, 'leaves');
  }
  // occlusion cull + painter order (ix + iy + iz ascending)
  const vis = solid
    .filter(b => inWin(b.ix, b.iy, 0) && !occ.has(K(b.ix + 1, b.iy + 1, b.iz + 1)))
    .sort((a, b) => (a.ix + a.iy + a.iz) - (b.ix + b.iy + b.iz));
  return { vis: vis, pumpkins: pumpkins, pickles: pickles };
})();

// a cuboid centred on a block tile, top face at height hTop (block units)
function s06_boxAt(ctx, ix, iy, hTop, bw, bd, bh, o) {
  const s = s06_ISO.size, c = isoPos(ix, iy, hTop, s06_ISO);
  const ax = c.x - (s * ISO.w * bw - s * ISO.w * bd) / 2;
  const ay = c.y - (s * ISO.h * bw + s * ISO.h * bd) / 2;
  return isoBox(ctx, ax, ay, bw, bd, bh, Object.assign({ size: s }, o || {}));
}

/* ONE night pass for the whole world layer: a cool haze that is punched open
   (destination-out) and warmed (lighter) where the torches burn. */
const s06_LIT = { x0: -160, y0: 640, w: 1400, h: 1400 };
let s06_litC = null;
function s06_lightOverlay() {
  const LW = 210, LH = 168;
  if (!s06_litC) s06_litC = makeCanvas(LW, LH);
  const x = s06_litC.getContext('2d');
  x.setTransform(1, 0, 0, 1, 0, 0); x.globalAlpha = 1; x.filter = 'none';
  x.globalCompositeOperation = 'source-over'; x.clearRect(0, 0, LW, LH);
  const g = x.createLinearGradient(0, 0, 0, LH);
  g.addColorStop(0.00, 'rgba(20,24,72,0.86)');        // the crowns that break the horizon
  g.addColorStop(0.15, 'rgba(28,34,94,0.80)');        // moonlit haze in the distance
  g.addColorStop(0.32, 'rgba(22,25,74,0.66)');
  g.addColorStop(0.62, 'rgba(13,14,42,0.52)');
  g.addColorStop(1.00, 'rgba(8,8,26,0.42)');
  x.fillStyle = g; x.fillRect(0, 0, LW, LH);
  const sx = LW / s06_LIT.w, sy = LH / s06_LIT.h, pts = [];
  for (const tr of s06_TORCH) {
    const p = isoPos(tr.ix, tr.iy, s06_hAt(tr.ix, tr.iy) + 0.95, s06_ISO);
    pts.push({ x: (p.x - s06_LIT.x0) * sx, y: (p.y - s06_LIT.y0) * sy, fl: 0.92 });
  }
  x.globalCompositeOperation = 'destination-out';
  for (const p of pts) {
    const r = 34 * p.fl, rg = x.createRadialGradient(p.x, p.y, 0, p.x, p.y, r);
    rg.addColorStop(0, 'rgba(0,0,0,0.98)'); rg.addColorStop(0.30, 'rgba(0,0,0,0.66)');
    rg.addColorStop(0.66, 'rgba(0,0,0,0.19)'); rg.addColorStop(1, 'rgba(0,0,0,0)');
    x.fillStyle = rg; x.beginPath(); x.arc(p.x, p.y, r, 0, TAU); x.fill();
  }
  x.globalCompositeOperation = 'lighter';
  for (const p of pts) {
    const r = 38 * p.fl, rg = x.createRadialGradient(p.x, p.y, 0, p.x, p.y, r);
    rg.addColorStop(0, 'rgba(156,64,12,0.52)'); rg.addColorStop(0.42, 'rgba(92,34,6,0.20)');
    rg.addColorStop(1, 'rgba(0,0,0,0)');
    x.fillStyle = rg; x.beginPath(); x.arc(p.x, p.y, r, 0, TAU); x.fill();
  }
  return s06_litC;
}

/* ------------------------------------------------------------ night horizon
   A blocky treeline just above the back edge of the terrain (y ≈ 980) plus haze,
   so the farm sits in a landscape instead of floating in black. */
const s06_FAR = (() => {
  const o = [];
  for (let i = 0; i < 44; i++) {
    const x = hash1(i * 91 + 13) * (W + 200) - 100;
    o.push({ x: Math.round(x), s: 11 + Math.round(hash1(i * 13 + 5) * 13), d: hash1(i * 7 + 2) });
  }
  return o.sort((a, b) => a.d - b.d);
})();
function s06_horizon(ctx) {
  const yH = 968;
  linearFill(ctx, 0, yH - 130, 0, yH + 60, [[0, 'rgba(40,32,80,0)'], [0.6, 'rgba(46,36,92,0.30)'], [1, 'rgba(18,14,40,0)']], [0, yH - 130, W, 190]);
  ctx.save();
  for (const tr of s06_FAR) {
    ctx.fillStyle = tr.d > 0.5 ? '#151238' : '#0D0B26';
    const y = yH - tr.d * 10;
    ctx.fillRect(tr.x - 2, y - tr.s * 0.55, 5, tr.s * 0.6);
    ctx.fillRect(tr.x - tr.s * 0.5, y - tr.s * 1.30, tr.s, tr.s * 0.80);
    ctx.fillRect(tr.x - tr.s * 0.3, y - tr.s * 1.75, tr.s * 0.6, tr.s * 0.55);
  }
  ctx.fillStyle = '#0B0A22'; ctx.fillRect(0, yH, W, 26);
  ctx.restore();
  linearFill(ctx, 0, yH - 20, 0, yH + 110, [[0, 'rgba(66,58,124,0.26)'], [1, 'rgba(20,17,44,0)']], [0, yH - 20, W, 130]);
}

/* ---------------------------------------------------------------- the player
   The AFK player stands on the reserved tile, idles and takes a mining swing
   whenever he is connected. */
function s06_playerA(t) {                                  // 1 = solid, 0 = gone
  if (t < 15.40) return 1;
  if (t < 16.42) return 1 - clamp(remap(t, 15.40, 15.74));
  return clamp(remap(t, 16.52, 16.86));
}
function s06_player(ctx, t, wire) {
  const a = s06_playerA(t);
  if (a <= 0.01) return;
  const p = isoPos(s06_PT.ix, s06_PT.iy, s06_hAt(s06_PT.ix, s06_PT.iy), s06_ISO);
  const cyc = ((t * 1.0) % 2.6 + 2.6) % 2.6;
  const swing = (t < 15.32 || t > 16.88) && cyc < 0.80 ? Math.sin(cyc / 0.80 * Math.PI) : 0;
  ctx.save(); ctx.globalAlpha *= a;
  if (wire < 0.5) {                                        // contact shadow
    ctx.save(); ctx.globalAlpha *= 0.45; ctx.fillStyle = '#000000';
    ctx.beginPath(); ctx.ellipse(p.x, p.y + s06_ISO.size * 0.06, s06_ISO.size * 0.36, s06_ISO.size * 0.18, 0, 0, TAU); ctx.fill();
    ctx.restore();
  }
  mcPlayer(ctx, p.x, p.y, {
    size: s06_ISO.size, t: t, walk: 0, swing: swing, facing: 'left', bob: 0.020,
    dark: wire > 0.5 ? 0.88 : 0.30,
    outline: wire > 0.5 ? TOKENS.violetHot : '#0A0910',
    outlineAlpha: wire > 0.5 ? 0.85 : 0.34, outlineWidth: wire > 0.5 ? 1.8 : 1.1,
    held: { top: 'pumpkin_top', side: 'pumpkin_side' },
  });
  ctx.restore();
}
// the Minecraft name tag over the AFK player — drawn after the night pass so it stays lit
function s06_nametag(ctx, t) {
  const a = s06_playerA(t);
  if (a <= 0.02) return;
  const p = isoPos(s06_PT.ix, s06_PT.iy, s06_hAt(s06_PT.ix, s06_PT.iy), s06_ISO);
  const y = p.y - s06_ISO.size * 2.92 + Math.sin(t * 1.7 + 0.6) * 3;
  const o = { size: 36, family: FONTS.term, weight: 400, color: '#EDE6F8', align: 'center', baseline: 'middle' };
  const w = measureText(ctx, 'HugoAFK', o);
  ctx.save(); ctx.globalAlpha *= a;
  ctx.fillStyle = 'rgba(4,3,10,0.62)'; ctx.fillRect(p.x - w / 2 - 12, y - 22, w + 24, 43);
  drawText(ctx, 'HugoAFK', p.x, y, o);
  ctx.restore();
}

/* the player crumbling into real Minecraft voxels and flying back together.
   Timing is unchanged: dissolve from 15.40, rematerialise from 16.42. */
const s06_VOX = (() => {
  const r = rng(9127), o = [];
  for (let i = 0; i < 58; i++) {
    const hgt = 0.06 + r() * 1.94;
    const tex = hgt < 0.16 ? 'player_shoe' : hgt < 0.75 ? 'player_pants' : hgt < 1.5 ? 'player_shirt' : 'player_skin';
    const w = hgt < 1.5 ? 0.30 : 0.24;
    o.push({ du: (r() - 0.5) * w * 2, dv: (r() - 0.5) * w * 2, h: hgt, tex: tex });
  }
  return o;
})();
function s06_voxState(i, t) {
  const h = hash1(i * 7 + 3), hx = hash2(i, 11), hy = hash2(i, 29);
  if (t < 15.40) return null;
  if (t < 16.42) {                                          // dissolve upward
    const st = 15.40 + h * 0.18, q = remap(t, st, st + 0.42);
    if (q <= 0) return { dx: 0, dy: 0, sc: 1, a: 1 };
    const e = E.outCubic(q);
    return { dx: (hx - 0.5) * 150 * e, dy: -(300 + hy * 190) * e, sc: lerp(1, 0.32, q), a: clamp(1 - q * q * 1.12) };
  }
  const st2 = 16.42 + h * 0.20, q2 = remap(t, st2, st2 + 0.32);   // fly back together
  const fade = 1 - clamp(remap(t, 16.60, 16.88));
  if (q2 <= 0) return { dx: (hx - 0.5) * 130, dy: -(240 + hy * 140), sc: 0.4, a: 0 };
  const e2 = E.outCubic(q2);
  return { dx: (hx - 0.5) * 130 * (1 - e2), dy: -(240 + hy * 140) * (1 - e2), sc: lerp(0.4, 1, e2), a: clamp(q2 * 1.7) * fade };
}
function s06_voxels(ctx, t) {
  if (t < 15.40) return;
  const S = s06_ISO.size, hb = s06_hAt(s06_PT.ix, s06_PT.iy);
  let live = 0;
  for (let i = 0; i < s06_VOX.length; i++) {
    const v = s06_VOX[i], s = s06_voxState(i, t);
    if (!s || s.a <= 0.012) continue;
    live += s.a;
    const p = isoPos(s06_PT.ix + v.du, s06_PT.iy + v.dv, hb + v.h, s06_ISO);
    const x = p.x + s.dx, y = p.y + s.dy, sz = S * 0.20 * s.sc;
    blockIcon(ctx, v.tex, x, y, sz, { alpha: s.a });
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    dot(ctx, x, y, sz * 2.0, TOKENS.violetHot, 0.20 * s.a);
    ctx.restore();
  }
  if (live > 0.4) {
    const p = isoPos(s06_PT.ix, s06_PT.iy, hb, s06_ISO);
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    dot(ctx, p.x, p.y - S * 0.4, S * 4.2, TOKENS.secondary, 0.16 * clamp(live / 12));
    ctx.restore();
  }
}

/* ---------------------------------------------------------------- props */
function s06_torchPost(ctx, tr, wire) {
  const h = s06_hAt(tr.ix, tr.iy);
  s06_boxAt(ctx, tr.ix, tr.iy, h + 0.95, 0.16, 0.16, 0.95, wire > 0.5
    ? { color: '#0C0818', top: '#160F2A', outline: TOKENS.secondary, outlineAlpha: 0.5, outlineWidth: 1.2 }
    : { tex: { top: 'oak_log_top', side: 'oak_log_side' }, outline: '#120B04', outlineAlpha: 0.4, outlineWidth: 1 });
}
function s06_fencePost(ctx, f, wire) {
  const h = s06_hAt(f.ix, f.iy);
  const o = wire > 0.5
    ? { color: '#0C0818', top: '#160F2A', outline: TOKENS.secondary, outlineAlpha: 0.42, outlineWidth: 1.1 }
    : { tex: { top: 'oak_log_top', side: 'oak_log_side' }, outline: '#120B04', outlineAlpha: 0.4, outlineWidth: 1 };
  s06_boxAt(ctx, f.ix, f.iy, h + 1.0, 0.22, 0.22, 1.0, o);
  s06_boxAt(ctx, f.ix + 0.5, f.iy, h + 0.86, 1.0, 0.10, 0.12, o);
  s06_boxAt(ctx, f.ix + 0.5, f.iy, h + 0.46, 1.0, 0.10, 0.12, o);
}
function s06_chestProp(ctx, wire) {
  const c = s06_CHEST, h = s06_hAt(c.ix, c.iy);
  const o = wire > 0.5
    ? { color: '#0E0A1C', top: '#1A1130', outline: TOKENS.violetHot, outlineAlpha: 0.8, outlineWidth: 1.6 }
    : { tex: s06_TEX.chest, outline: '#120B04', outlineAlpha: 0.4, outlineWidth: 1 };
  s06_boxAt(ctx, c.ix, c.iy, h + 0.72, 0.86, 0.86, 0.72, o);
  s06_boxAt(ctx, c.ix, c.iy, h + 0.98, 0.86, 0.86, 0.26, o);
}
// warm torch flames — drawn AFTER the night pass, so they stay the brightest thing
function s06_flames(ctx, t, k) {
  const S = s06_ISO.size;
  for (const tr of s06_TORCH) {
    const p = isoPos(tr.ix, tr.iy, s06_hAt(tr.ix, tr.iy) + 0.95, s06_ISO);
    const fl = 0.74 + 0.26 * Math.sin(t * 10.5 + tr.ix * 2.1 + tr.iy * 1.3);
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha *= k;
    ctx.fillStyle = '#C46A18'; ctx.fillRect(p.x - S * 0.085, p.y - S * 0.10, S * 0.17, S * 0.13);
    ctx.fillStyle = '#FFE7A8'; ctx.fillRect(p.x - S * 0.055, p.y - S * 0.09 - S * 0.03 * fl, S * 0.11, S * 0.1);
    ctx.restore();
    dot(ctx, p.x, p.y - S * 0.05, S * 2.1, '#FF9A34', 0.17 * fl * k);
    dot(ctx, p.x, p.y - S * 0.05, S * 0.8, '#FFCE88', 0.40 * fl * k);
  }
  for (const w of s06_WORLD.pickles) {                       // sea pickles are a light source too
    const p = isoPos(w.ix, w.iy, w.iz, s06_ISO);
    dot(ctx, p.x, p.y - S * 0.16, S * 0.9, '#C8E86A', 0.20 * k);
  }
}

/* ---------------------------------------------------------------- the world draw
   The terrain never changes, so it is baked ONCE into two canvases, split at the
   player's depth: everything behind him, then the player, then everything in front.
   That turns ~1250 textured faces per frame into two drawImage calls. */
// both canvases are cropped to the band their content really occupies, so the two
// per-frame blits cost about half a full frame instead of two
const s06_BOXA = { y: 650, h: 1280 }, s06_BOXB = { y: 1200, h: 730 };
let s06_bakeA = null, s06_bakeB = null;
function s06_bakeWorld() {
  if (s06_bakeA) return;
  s06_bakeA = makeCanvas(W, s06_BOXA.h); s06_bakeB = makeCanvas(W, s06_BOXB.h);
  const A = s06_bakeA.getContext('2d'), B = s06_bakeB.getContext('2d');
  A.translate(0, -s06_BOXA.y); B.translate(0, -s06_BOXB.y);
  const S = s06_ISO.size, O = s06_ISO;
  const kOf = (ix, iy) => ix + iy + s06_hAt(ix, iy) + 0.5;
  const PK = kOf(s06_PT.ix, s06_PT.iy);
  const cmds = [];
  for (const b of s06_WORLD.vis) {
    const p = isoPos(b.ix, b.iy, b.iz, O);
    if (b.kind === 'leaves') {                               // dimmed, so a canopy never melts into the grass
      cmds.push({ k: b.ix + b.iy + b.iz, v: b.ix + b.iy, f: g => cube(g, b.ix, b.iy, b.iz, { size: S, cx: O.cx, cy: O.cy,
        tex: 'oak_leaves', dark: 0.30, outline: '#050A06', outlineAlpha: 0.40, outlineWidth: 1.2 }) });
      continue;
    }
    const dy = b.kind === 'water' ? S * 0.13 : 0;
    if (b.kind === 'log') {
      cmds.push({ k: b.ix + b.iy + b.iz, v: b.ix + b.iy, f: g => cube(g, b.ix, b.iy, b.iz, { size: S, cx: O.cx, cy: O.cy,
        tex: s06_TEX.log, dark: 0.16, outline: '#0B0703', outlineAlpha: 0.42, outlineWidth: 1.2 }) });
    } else {
      cmds.push({ k: b.ix + b.iy + b.iz, v: b.ix + b.iy, f: g => blockIcon(g, s06_TEX[b.kind], p.x, p.y + dy, S,
        { outline: '#070910', outlineAlpha: 0.26, outlineWidth: 1 }) });
    }
  }
  for (const f of s06_FENCE) cmds.push({ k: kOf(f.ix, f.iy), v: f.ix + f.iy, f: g => s06_fencePost(g, f, 0) });
  for (const tr of s06_TORCH) cmds.push({ k: kOf(tr.ix, tr.iy), v: tr.ix + tr.iy, f: g => s06_torchPost(g, tr, 0) });
  cmds.push({ k: kOf(s06_CHEST.ix, s06_CHEST.iy), v: s06_CHEST.ix + s06_CHEST.iy, f: g => s06_chestProp(g, 0) });
  // sea pickles growing in the water channel
  for (const w of s06_WORLD.pickles) {
    const p = isoPos(w.ix, w.iy, w.iz, O), n = 1 + Math.floor(hash2(w.ix, w.iy) * 3);
    cmds.push({ k: w.ix + w.iy + w.iz + 0.6, v: w.ix + w.iy, f: g => {
      for (let i = 0; i < n; i++) {
        const q1 = hash2(w.ix * 5 + i, w.iy * 7 + 1), q2 = hash2(w.ix * 11 + i, w.iy * 3 + 9);
        pixelSprite(g, p.x + (q1 - 0.5) * S * 0.55, p.y - S * 0.10 + (q2 - 0.5) * S * 0.18,
          S * 0.030, SPRITES.sea_pickle.rows, SPRITES.sea_pickle.pal, { alpha: 0.95 });
      }
    } });
  }
  cmds.sort((p, q) => p.k - q.k);
  // anything at or behind the player's depth row goes into the back canvas
  const PV = s06_PT.ix + s06_PT.iy;
  for (const c of cmds) c.f((c.k <= PK || c.v <= PV) ? A : B);
  // ONE night pass, baked in: a cool haze punched open and warmed around the torches
  const lit = s06_lightOverlay();
  for (const g of [A, B]) {
    g.save(); g.globalCompositeOperation = 'source-atop';
    g.drawImage(lit, s06_LIT.x0, s06_LIT.y0, s06_LIT.w, s06_LIT.h);
    g.restore();
  }
}
function s06_worldTex(ctx, t, wire) {
  s06_bakeWorld();
  ctx.save(); ctx.globalAlpha *= 1 - wire;
  ctx.drawImage(s06_bakeA, 0, s06_BOXA.y);
  s06_player(ctx, t, wire);
  ctx.drawImage(s06_bakeB, 0, s06_BOXB.y);
  ctx.restore();
}
// violet wireframe version of exactly the same build — the farm stays standing while the bot is gone
function s06_worldWire(ctx, t, wire) {
  const violet = T().secondary, hot = TOKENS.violetHot, O = s06_ISO;
  ctx.save();
  for (const b of s06_WORLD.vis) {
    if (b.kind === 'stone' || b.kind === 'dirt') continue;      // buried body: no wire needed
    const q = isoPos(b.ix, b.iy, b.iz, O);
    // the skeleton is brightest around the farm and dissolves into the dark towards the edges
    const fall = clamp(1 - (Math.hypot((q.x - 640) * 0.86, q.y - 1250) - 280) / 360);
    if (fall <= 0.03) continue;
    const pl = 0.5 + 0.5 * Math.sin(t * 2.4 + b.ix * 0.8 + b.iy * 0.55);
    const hotK = s06_HOT[b.kind] === 1;
    cube(ctx, b.ix, b.iy, b.iz, {
      size: O.size, cx: O.cx, cy: O.cy, alpha: wire * fall,
      color: '#0D0918', top: '#1B1136', left: '#0A0716', right: '#07050F',
      outline: hotK ? hot : violet,
      outlineAlpha: (hotK ? 1.0 : 0.5) * wire * fall * (0.68 + 0.32 * pl),
      outlineWidth: hotK ? 2.0 : 1.3,
    });
  }
  ctx.globalAlpha *= wire;
  for (const f of s06_FENCE) s06_fencePost(ctx, f, 1);
  for (const tr of s06_TORCH) s06_torchPost(ctx, tr, 1);
  s06_chestProp(ctx, 1);
  s06_player(ctx, t, 1);
  s06_voxels(ctx, t);
  ctx.restore();
}

/* pumpkin items popping out of the farm — before the reset and again once the bot is back */
const s06_POPS = [15.00, 15.25, 16.98, 17.23, 17.48];
// only pumpkins in the open lower-left corridor pop: clear of the player (x~820),
// of the check (x~792) and of the chat plate
const s06_POPCELLS = (() => {
  const o = s06_WORLD.pumpkins.filter(c => {
    const p = isoPos(c.ix, c.iy, c.iz, s06_ISO);
    return p.x > 230 && p.x < 720 && p.y > 1160 && p.y < 1460;
  });
  return o.length ? o : s06_WORLD.pumpkins;
})();
function s06_items(ctx, t, wire) {
  if (wire > 0.4) return;
  for (let k = 0; k < s06_POPS.length; k++) {
    const st = s06_POPS[k], life = (t - st) / 0.85;
    if (life <= 0 || life >= 1) continue;
    const cell = s06_POPCELLS[Math.floor(hash1(k * 17 + 5) * s06_POPCELLS.length)];
    if (!cell) continue;
    const g = isoPos(cell.ix, cell.iy, cell.iz, s06_ISO), e = E.outCubic(life);
    const dx = -(30 + hash2(k, 3) * 48);
    const x0 = g.x, y0 = g.y - s06_ISO.size * 0.55;
    const x = x0 + dx * e, y = y0 - e * 140 + life * life * 30;
    const a = clamp((1 - life) * 1.8) * clamp(life / 0.10) * (1 - wire);
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    for (let t2 = 1; t2 <= 4; t2++) {
      const e2 = E.outCubic(Math.max(0, life - t2 * 0.055));
      dot(ctx, x0 + dx * e2, y0 - e2 * 140, 28 - t2 * 4, '#FFB25A', a * 0.13 / t2);
    }
    dot(ctx, x, y, 50, '#FFB25A', a * 0.26);
    ctx.restore();
    ctx.save(); ctx.globalAlpha *= a;
    ctx.translate(x, y); ctx.rotate((hash2(k, 9) - 0.5) * 0.3 + life * 0.35);
    blockIcon(ctx, s06_TEX.pumpkin, 0, -12, 40);
    ctx.restore();
  }
}

/* the reserved tile: a dashed violet marker on the ground while the bot is away */
function s06_spot(ctx, t) {
  const a = win(t, 15.55, 15.75, 16.62, 16.86) * (0.5 + 0.5 * pulse(t, 0.5, 5, 15.5));
  if (a <= 0.01) return;
  const O = s06_ISO, p = isoPos(s06_PT.ix, s06_PT.iy, s06_hAt(s06_PT.ix, s06_PT.iy), O);
  const w = O.size * 0.866, h = O.size * 0.5;
  ctx.save(); ctx.globalAlpha *= a;
  ctx.strokeStyle = TOKENS.violetHot; ctx.lineWidth = 3; ctx.setLineDash([14, 10]); ctx.lineDashOffset = -t * 26;
  ctx.beginPath(); ctx.moveTo(p.x, p.y - h); ctx.lineTo(p.x + w, p.y); ctx.lineTo(p.x, p.y + h); ctx.lineTo(p.x - w, p.y); ctx.closePath(); ctx.stroke();
  ctx.setLineDash([]);
  ctx.save(); ctx.globalCompositeOperation = 'lighter'; dot(ctx, p.x, p.y, O.size * 1.3, TOKENS.secondary, 0.24); ctx.restore();
  // a small pixel label so "same spot" is readable, not just implied (kept inside x 90..900)
  // clamped so that even at the camera's widest zoom the plate stays inside x 90..900
  const lx = Math.min(p.x, 772), ly = p.y - O.size * 1.5 - 8 * Math.sin((t - 15.5) * 2.4);
  ctx.fillStyle = 'rgba(8,4,16,0.74)'; ctx.fillRect(lx - 80, ly - 19, 160, 38);
  drawText(ctx, 'GLEICHE STELLE', lx, ly, { size: 21, family: FONTS.silk, weight: 700, color: TOKENS.violetHot, align: 'center', tracking: 2 });
  ctx.restore();
}

/* red warning HUD: brackets + Press Start 2P label; calms down once the bot is back */
function s06_s07_warnHud(ctx, t) {
  const p = ez(t, 14.97, 15.26, E.outExpo);
  if (p <= 0.001) return;
  const alarm = 1 - remap(t, 16.42, 16.70);                 // 1 = red alert, 0 = resolved
  const pu = (0.45 + 0.55 * pulse(t, 0.5, 5.5, 15.0)) * alarm + (1 - alarm) * 0.5;
  const bx = 196, by = 326, bw = 688, bh = 132;
  ctx.save();
  ctx.globalAlpha *= clamp(p * 2) * (0.68 + 0.32 * alarm);
  ctx.fillStyle = 'rgba(6,3,10,0.55)'; roundRect(ctx, bx, by, bw, bh, 6); ctx.fill();
  if (alarm > 0.02) {
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha *= (0.16 + 0.22 * pu) * alarm;
    ctx.fillStyle = T().primary; roundRect(ctx, bx, by, bw, bh, 6); ctx.fill(); ctx.restore();
    // hazard stripes on both ends of the plate
    ctx.save(); roundRect(ctx, bx, by, bw, bh, 6); ctx.clip();
    ctx.strokeStyle = rgba(T().primary, (0.35 * pu + 0.15) * alarm); ctx.lineWidth = 7;
    for (let k = -3; k < 6; k++) {
      const o = k * 26 - (t * 22 % 26);
      ctx.beginPath(); ctx.moveTo(bx + o, by + bh); ctx.lineTo(bx + o + bh, by); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(bx + bw - 118 + o, by + bh); ctx.lineTo(bx + bw - 118 + o + bh, by); ctx.stroke();
    }
    ctx.restore();
  }
  brackets(ctx, bx, by, bw, bh, p, {
    len: 46, width: 5, alpha: (0.55 + 0.45 * pu) * (0.5 + 0.5 * alarm),
    color: alarm > 0.5 ? T().primary : s06_s07_mix(TOKENS.ok, T().primary, alarm * 2),
  });
  const o = {
    size: 44, family: FONTS.pixel, weight: 400, align: 'center', trackF: 0.02,
    color: alarm > 0.02 ? s06_s07_mix('#B8AFC9', s06_s07_mix(T().primary, '#FFFFFF', 0.25 + 0.45 * pu), alarm) : '#B8AFC9',
  };
  o.size = s06_s07_fit(ctx, 'WORLD RESET', o, 500); o.tracking = 0.02 * o.size;
  if (alarm > 0.05) glowText(ctx, 'WORLD RESET', CX, by + bh / 2 + 2, o, 26, 0.45 * pu * alarm);
  else drawText(ctx, 'WORLD RESET', CX, by + bh / 2 + 2, o);
  ctx.restore();
}

/* chat / client log */
const s06_s07_CHAT = [
  { t: 15.05, s: '[HugoAFK] World-Reset erkannt.', c: '#FF6B6B' },
  { t: 15.42, s: '[HugoAFK] Verbindung getrennt.', c: '#E4DCF0' },
  { t: 15.95, s: '[HugoAFK] Warte auf Server', c: TOKENS.violetHot, dots: true },
  { t: 16.45, s: '[HugoAFK] Wieder verbunden. Gleiche Stelle.', c: TOKENS.ok },
];
function s06_s07_chat(ctx, t) {
  const lines = [];
  for (const l of s06_s07_CHAT) {
    if (t < l.t) continue;
    const a = clamp((t - l.t) / 0.16);
    let s = l.s;
    if (l.dots) s += t > 16.44 ? '...' : '.'.repeat(1 + (Math.floor((t - l.t) * 4) % 3));
    lines.push({ t: s, c: l.c, a: a });
  }
  if (!lines.length) return;
  const slide = (1 - E.outCubic(clamp((t - s06_s07_CHAT[lines.length - 1].t) / 0.16))) * 16;
  ctx.save(); ctx.translate(0, slide);
  mcChat(ctx, 132, 1198, lines, { size: 36, lineHeight: 48, family: FONTS.term, bgColor: 'rgba(5,3,12,0.72)', pad: 14, extraW: 12 });
  ctx.restore();
}

/* violet loading bar during the black pause */
function s06_s07_loading(ctx, t) {
  const a = win(t, 15.92, 16.06, 16.40, 16.52);
  if (a <= 0.01) return;
  const p = clamp(remap(t, 15.94, 16.42) * 1.03);        // linear: the bar must visibly travel
  const len = 460, x0 = CX - len / 2, by = 936, th = 14;
  ctx.save(); ctx.globalAlpha *= a;
  progressBar(ctx, CX, by, len, p, { color: TOKENS.secondary, thickness: th, track: '#FFFFFF' });
  // specular highlight running along the filled part
  if (p > 0.02) {
    const hx = x0 - 110 + ((t - 15.94) * 720) % (len + 220);
    ctx.save(); ctx.beginPath(); ctx.rect(x0, by - th / 2, len * p, th); ctx.clip();
    const g = ctx.createLinearGradient(hx - 90, 0, hx + 90, 0);
    g.addColorStop(0, 'rgba(255,255,255,0)'); g.addColorStop(0.5, 'rgba(255,255,255,0.7)'); g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g; ctx.fillRect(x0, by - th / 2, len, th); ctx.restore();
  }
  // leading edge spark
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  dot(ctx, x0 + len * p, by, 40, TOKENS.violetHot, 0.45 + 0.2 * Math.sin(t * 20));
  ctx.restore();
  for (let k = 0; k < 3; k++) {
    const on = 0.25 + 0.75 * Math.max(0, Math.sin((t - 15.95) * 7.4 - k * 0.9));
    ctx.fillStyle = rgba(TOKENS.violetHot, 0.25 + 0.7 * on);
    const s = 12 + 4 * on;
    ctx.fillRect(CX - 30 + k * 30 - s / 2, 974 - s / 2, s, s);
  }
  ctx.restore();
}

/* the green check when the bot is back */
function s06_s07_check(ctx, t) {
  const p = remap(t, 16.88, 17.12);
  if (p <= 0) return;
  const x = s06_CHK.x, y = s06_CHK.y, sc = E.outBack(p) * (1 + 0.06 * Math.sin((t - 16.9) * 9) * (1 - p));
  ctx.save();
  ctx.globalCompositeOperation = 'lighter'; dot(ctx, x, y, 94 * sc, TOKENS.ok, 0.30 + 0.16 * pulse(t, 0.5, 6, 16.9));
  ctx.restore();
  shockwave(ctx, x, y, remap(t, 16.90, 17.30), { radius: 160, color: TOKENS.ok, width: 8, alpha: 0.7 });
  ctx.save(); ctx.translate(x, y); ctx.scale(sc, sc);
  itemIcon(ctx, 'check', 0, 0, 7);
  ctx.restore();
}

/* ------------------------------------------------------------------ s06 */
SCENES.s06 = {
  draw(ctx, lt, t) {
    // 2-frame flicker on the warning and on the disconnect
    if ((t >= 15.199 && t < 15.267) || (t >= 15.399 && t < 15.467)) {
      FX.glitch = Math.max(FX.glitch, 0.85); FX.rgb = Math.max(FX.rgb, 14); FX.glitchSeed = 4211;
    }
    FX.shake = Math.max(FX.shake, 9 * impulse(t, 15.40, 13) + 5 * impulse(t, 16.42, 11));

    const wire = win(t, 15.40, 15.72, 16.44, 16.72);           // farm turns to wireframe
    const dark = win(t, 15.86, 16.02, 16.34, 16.46);           // the black pause
    const worldA = 1 - 0.74 * dark;

    /* --- sky (stays out of the world layer, so the night pass never touches it) */
    linearFill(ctx, 0, 260, 0, 1040,
      [[0, 'rgba(30,22,62,0.0)'], [0.34, 'rgba(30,23,64,0.55)'], [0.72, 'rgba(19,15,44,0.72)'], [1, 'rgba(11,9,28,0.6)']],
      [0, 260, W, 780]);
    nightSky(ctx, t, { count: 110, seed: 33, color: '#CFC6E8', alpha: 0.34 * (1 - dark * 0.8), hMul: 0.52, drift: true });
    radialFill(ctx, CX, 1180, 820,
      [[0, rgba(TOKENS.secondary, (0.11 + 0.05 * pulse(t, 0.5, 6, 15.0)) * worldA)], [0.55, rgba(TOKENS.deepViolet, 0.05 * worldA)], [1, 'rgba(0,0,0,0)']], 'lighter');
    // red alarm wash on the beats of the warning
    const al = (1 - remap(t, 15.30, 15.70)) * (0.35 + 0.65 * pulse(t, 0.5, 5.5, 15.0));
    if (al > 0.01) {
      radialFill(ctx, CX, CY, 1160, [[0.35, 'rgba(0,0,0,0)'], [1, rgba(T().primary, 0.30 * al)]], 'lighter');
    }

    s06_s07_dust(ctx, t, 0.34 * (1 - dark * 0.7));

    /* --- the world: two baked, night-lit canvases with the player between them */
    const cam = {
      zoom: 1.03 + 0.026 * Math.sin((t - 15) * 0.85) + 0.035 * impulse(t, 15.40, 6) + 0.022 * impulse(t, 16.42, 5),
      y: -13 * Math.sin((t - 15) * 0.62),
      x: 9 * Math.sin((t - 15) * 0.41 + 1.1),
      rot: 0.004 * Math.sin((t - 15) * 0.5),
      ox: CX, oy: 1180,
    };
    withCamera(ctx, cam, c => {
      c.save(); c.globalAlpha *= worldA;
      s06_horizon(c);
      if (wire < 0.995) s06_worldTex(c, t, wire);
      if (wire > 0.005) s06_worldWire(c, t, wire);
      s06_flames(c, t, 1 - wire * 0.9);
      if (wire < 0.5) {                                    // warm key light on the player from the path torch
        const pp = isoPos(s06_PT.ix, s06_PT.iy, s06_hAt(s06_PT.ix, s06_PT.iy), s06_ISO);
        c.save(); c.globalCompositeOperation = 'lighter';
        dot(c, pp.x, pp.y - s06_ISO.size * 0.9, s06_ISO.size * 2.4, '#FFB25A', 0.16 * s06_playerA(t) * (1 - wire * 2));
        c.restore();
      }
      s06_voxels(c, t);
      s06_nametag(c, t);
      c.restore();
      c.save(); c.globalAlpha *= Math.min(1, worldA * 3.4); s06_spot(c, t); c.restore();
      c.save(); c.globalAlpha *= worldA; s06_items(c, t, wire); c.restore();
    });

    // violet scanline sweep so the black pause never stands still
    if (dark > 0.05) {
      const sw = ((t - 15.90) * 0.9) % 1, yy = lerp(340, 1400, sw);
      ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha *= dark * 0.5;
      const g = ctx.createLinearGradient(0, yy - 110, 0, yy + 110);
      g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(0.5, rgba(TOKENS.secondary, 0.30)); g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = g; ctx.fillRect(0, yy - 110, W, 220);
      ctx.fillStyle = rgba(TOKENS.violetHot, 0.22); ctx.fillRect(0, yy - 1, W, 2);
      ctx.restore();
    }

    s06_s07_loading(ctx, t);
    s06_s07_check(ctx, t);
    s06_s07_warnHud(ctx, t);

    /* headline — two lines, slam at 15.05 / 15.17 */
    band(ctx, 700, 400, 0.5);
    const hOpt = { size: 104, family: FONTS.body, weight: 800, color: T().text, align: 'center' };
    const s1 = s06_s07_fit(ctx, 'World-Reset', hOpt, 700), s2 = s06_s07_fit(ctx, 'erkannt.', hOpt, 700);
    s06_s07_slam(ctx, 'World-Reset', CX, 548, Object.assign({}, hOpt, { size: s1, tracking: -0.04 * s1 }), t, 15.05);
    s06_s07_slam(ctx, 'erkannt.', CX, 656, Object.assign({}, hOpt, { size: s2, tracking: -0.04 * s2 }), t, 15.17);

    /* subline — three sentences on the bars 15.5 / 16.0 / 16.5, so the payoff line lands
       right after the log confirms it (16.45) and still holds a full bar before the cut */
    const subs = [
      { s: 'Trennt sich.', t0: 15.50, y: 752, c: rgba(T().text, 0.85) },
      { s: 'Kommt zurück.', t0: 16.00, y: 808, c: rgba(T().text, 0.85) },
      { s: 'Gleiche Stelle.', t0: 16.50, y: 864, c: TOKENS.violetHot },
    ];
    for (const s of subs) {
      const p = ez(t, s.t0, s.t0 + 0.34, E.outExpo);
      if (p <= 0) continue;
      const o = { size: 46, family: FONTS.head, weight: 500, color: s.c, align: 'center', tracking: 0.02 * 46, stagger: 0.5, ease: E.outExpo };
      o.size = s06_s07_fit(ctx, s.s, Object.assign({}, o, { trackF: 0.02 }), 700); o.tracking = 0.02 * o.size;
      drawKinetic(ctx, s.s, CX, s.y, o, p, 'rise');
    }

    s06_s07_chat(ctx, t);
  },
};

/* ================================================================== s07 phone */
const s06_s07_PW = 480, s06_s07_PH = 700;               // phone body in px
const s06_s07_OW = 620, s06_s07_OH = 900;               // offscreen size
const s06_s07_PCY = 1060;                               // phone centre on screen (STOPP button lands ~y 1218–1310)
let s06_s07_pc = null, s06_s07_px = null;
function s06_s07_poff() {
  if (!s06_s07_pc) { s06_s07_pc = makeCanvas(s06_s07_OW, s06_s07_OH); s06_s07_px = s06_s07_pc.getContext('2d'); }
  const x = s06_s07_px;
  x.setTransform(1, 0, 0, 1, 0, 0); x.globalAlpha = 1; x.globalCompositeOperation = 'source-over';
  x.filter = 'none'; x.shadowBlur = 0; x.clearRect(0, 0, s06_s07_OW, s06_s07_OH);
  return x;
}

/* slow drifting voxel dust in the background */
const s06_s07_DUST = (() => {
  const r = rng(4711), o = [];
  for (let i = 0; i < 18; i++) o.push({ x: 40 + r() * 1000, y: 200 + r() * 1500, s: 12 + r() * 18, sp: 0.4 + r() * 0.7, ph: r() * TAU });
  return o;
})();
function s06_s07_dust(ctx, t, alpha, tint) {
  ctx.save(); ctx.globalAlpha *= alpha;
  for (let i = 0; i < s06_s07_DUST.length; i++) {
    const d = s06_s07_DUST[i];
    const x = d.x + Math.sin(t * d.sp * 0.8 + d.ph) * 58, y = d.y - t * d.sp * 46 + 950;
    const yy = ((y - 100) % 1900 + 1900) % 1900 + 100;
    const sz = d.s * (1 + 0.16 * Math.sin(t * 1.6 + d.ph));
    s06_s07_blk(ctx, x, yy, sz, tint || TOKENS.secondary, { alpha: 0.16 + 0.12 * Math.sin(t * 1.4 + d.ph), topF: 1.4, leftF: 0.8, rightF: 0.5 });
  }
  ctx.restore();
}

/* console feed — realistic client log, nothing invented beyond the product's features */
const s06_s07_LOG = [
  { t: 17.50, s: '[System] Bot gestartet.' },
  { t: 17.50, s: '[Chat] <Nico> hi' },
  { t: 17.50, s: '[System] AFK aktiv.' },
  { t: 17.50, s: '[System] Inventar voll.' },
  { t: 17.50, s: '/sell' },
  { t: 17.50, s: '[System] Inventar verkauft.' },
  { t: 17.74, s: '[System] Laufzeit 04:12:33' },
  { t: 17.99, s: '[Chat] <Mira> alles gut?' },
  { t: 18.24, s: '[System] Spawner geleert.' },
  { t: 18.49, s: '/sell' },
  { t: 18.74, s: '[System] Inventar verkauft.' },
  { t: 19.06, s: '[System] Bot gestoppt.' },
  { t: 19.60, s: '[System] Bot gestartet.' },
  { t: 19.84, s: '[System] AFK aktiv.' },
  { t: 20.08, s: '[Chat] <Nico> nice' },
  { t: 20.32, s: '[System] Spawner geleert.' },
];
const s06_s07_STOP = 19.06, s06_s07_START = 19.60;
// session runtime: runs in tenths so the counter visibly ticks, freezes while the bot is stopped
function s06_s07_uptime(t) {
  const base = 4 * 3600 + 12 * 60 + 33;
  const run = Math.min(t, s06_s07_STOP) - 17.50 + Math.max(0, t - s06_s07_START);
  return base + clamp(run, 0, 99);
}
function s06_s07_hms(sec) {
  const h = Math.floor(sec / 3600), m = Math.floor(sec / 60) % 60, s = Math.floor(sec) % 60;
  const p = n => (n < 10 ? '0' : '') + n;
  return p(h) + ':' + p(m) + ':' + p(s) + '.' + Math.floor(sec * 10) % 10;
}
// colour split for one console line: {tag, rest, tagC, restC}
function s06_s07_logColor(s) {
  if (s[0] === '/') return { tag: '', rest: s, tagC: '', restC: TOKENS.violetHot };
  const i = s.indexOf(']');
  const tag = i > 0 ? s.slice(0, i + 1) : '', rest = i > 0 ? s.slice(i + 1) : s;
  if (s.indexOf('gestoppt') >= 0) return { tag: tag, rest: rest, tagC: rgba(T().primary, 0.75), restC: '#FF7A7A' };
  if (s.indexOf('gestartet') >= 0) return { tag: tag, rest: rest, tagC: rgba(TOKENS.ok, 0.6), restC: TOKENS.ok };
  if (tag === '[Chat]') return { tag: tag, rest: rest, tagC: rgba(TOKENS.muted, 0.85), restC: '#EDE8F6' };
  return { tag: tag, rest: rest, tagC: rgba(TOKENS.secondary, 0.85), restC: rgba(T().text, 0.82) };
}

/* the phone screen (drawn into the offscreen, in phone-local pixels) */
function s06_s07_screen(ctx, x, y, w, h, t) {
  const stopped = t >= s06_s07_STOP && t < s06_s07_START;
  const pad = 12, left = x + pad, right = x + w - pad;

  // screen wash
  linearFill(ctx, x, y, x, y + h, [[0, 'rgba(28,16,52,0.55)'], [0.5, 'rgba(10,7,20,0.2)'], [1, 'rgba(24,10,34,0.5)']], [x, y, w, h]);

  /* status row */
  const sy = y + 46;
  const dotC = stopped ? '#6B6478' : TOKENS.ok;
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  dot(ctx, left + 11, sy, 22, dotC, stopped ? 0.28 : 0.5 + 0.28 * pulse(t, 1.0, 3.2, 17.6));
  ctx.restore();
  ctx.fillStyle = dotC; ctx.beginPath(); ctx.arc(left + 11, sy, 8, 0, TAU); ctx.fill();
  drawText(ctx, stopped ? 'GESTOPPT' : 'ONLINE', left + 32, sy + 1,
    { size: 23, family: FONTS.silk, weight: 700, color: stopped ? TOKENS.muted : TOKENS.ok, align: 'left', tracking: 2 });
  drawText(ctx, s06_s07_hms(s06_s07_uptime(t)), right, sy + 1,
    { size: 26, family: FONTS.mono, weight: 600, color: rgba(T().text, stopped ? 0.4 : 0.82), align: 'right' });
  ctx.fillStyle = 'rgba(255,255,255,0.12)'; ctx.fillRect(left, sy + 32, w - pad * 2, 2);

  /* console feed: newest line at the bottom, older ones scroll up */
  const btnTop = y + h - 172, bh = 92;
  const top = sy + 46, bot = btnTop - 22, lh = 48;
  // VT323 advances at 0.4 em — keep the longest line inside the screen, never below the 36 px floor
  let size = 38;
  while (size > 36 && 27 * 0.4 * size > w - pad * 2) size -= 0.5;
  ctx.save();
  ctx.beginPath(); ctx.rect(left - 4, top, w - pad * 2 + 8, bot - top); ctx.clip();
  const shown = [];
  for (const l of s06_s07_LOG) if (t >= l.t) shown.push(l);
  const newest = shown.length ? shown[shown.length - 1].t : 0;
  // sub-pixel scroll: the feed eases in the new line and keeps creeping between arrivals
  const slide = (1 - E.outCubic(clamp((t - newest) / 0.22))) * lh - Math.min(6, (t - newest) * 3.2);
  ctx.font = font(size, FONTS.term, 400); ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
  ctx.letterSpacing = '0px';
  for (let i = shown.length - 1; i >= 0; i--) {
    const yy = bot - 22 - (shown.length - 1 - i) * lh + slide;
    if (yy < top - lh || yy > bot + lh) continue;
    const fade = clamp((yy - top) / 46) * clamp((bot - yy) / 18);
    const c = s06_s07_logColor(shown[i].s);
    let xx = left;
    ctx.globalAlpha = fade * (i === shown.length - 1 ? clamp((t - shown[i].t) / 0.12) : 1);
    if (c.tag) { ctx.fillStyle = c.tagC; ctx.fillText(c.tag, xx, yy); xx += ctx.measureText(c.tag).width; }
    ctx.fillStyle = c.restC; ctx.fillText(c.rest, xx, yy);
  }
  // caret — smooth blink so it moves on every frame
  ctx.globalAlpha = 0.35 + 0.45 * (0.5 + 0.5 * Math.sin(t * 9.4));
  ctx.fillStyle = TOKENS.violetHot; ctx.fillRect(left, bot - 10, 16, 5);
  ctx.globalAlpha = 1;
  // a soft violet scan band travelling down the feed keeps the screen alive
  const sc0 = ((t - 17.5) * 0.62) % 1, syy = lerp(top, bot, sc0);
  ctx.globalCompositeOperation = 'lighter';
  const sg = ctx.createLinearGradient(0, syy - 70, 0, syy + 70);
  sg.addColorStop(0, 'rgba(0,0,0,0)'); sg.addColorStop(0.5, rgba(TOKENS.secondary, 0.20)); sg.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = sg; ctx.fillRect(x, syy - 70, w, 140);
  ctx.fillStyle = rgba(TOKENS.violetHot, 0.34); ctx.fillRect(x, syy - 1.5, w, 3);
  ctx.restore();

  /* the one-click control */
  const bw = w - pad * 2 - 24, bx = x + w / 2 - bw / 2, by = btnTop;
  const press = win(t, 18.98, 19.03, 19.12, 19.20) + win(t, 19.50, 19.55, 19.62, 19.70);
  const sc = 1 - 0.035 * clamp(press);
  const label = stopped ? 'START' : 'STOPP';
  // green stays a signal, never a surface: while stopped the chrome goes dark violet with a thin ok outline
  const col = stopped ? '#1C1630' : T().primary;
  const edge = stopped ? TOKENS.ok : rgba('#FFFFFF', 0.18);
  ctx.save();
  ctx.translate(x + w / 2, by + bh / 2); ctx.scale(sc, sc); ctx.translate(-(x + w / 2), -(by + bh / 2));
  ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha *= (stopped ? 0.16 : 0.35) + 0.3 * clamp(press);
  dot(ctx, x + w / 2, by + bh / 2, bw * 0.55, stopped ? TOKENS.ok : col, 0.5); ctx.restore();
  ctx.fillStyle = stopped ? col : mixColor(col, '#000000', 0.12 + 0.18 * clamp(press));
  roundRect(ctx, bx, by, bw, bh, 16); ctx.fill();
  ctx.strokeStyle = edge; ctx.lineWidth = stopped ? 3 : 2; roundRect(ctx, bx + 1, by + 1, bw - 2, bh - 2, 15); ctx.stroke();
  drawText(ctx, label, x + w / 2, by + bh / 2 + 2,
    { size: 48, family: FONTS.body, weight: 800, color: stopped ? TOKENS.ok : '#FFF4F4', align: 'center', tracking: 2 });
  ctx.restore();
  return { bx: bx, by: by + bh / 2 };
}

/* map a phone-local point (u right, v down, relative to the phone centre) to screen */
function s06_s07_map(u, v, P) {
  const s = P.f / (P.f + u * Math.sin(P.yaw));
  const x = u * Math.cos(P.yaw) * s * P.k, y = v * s * P.k;
  const cr = Math.cos(P.roll), sr = Math.sin(P.roll);
  return { x: P.cx + x * cr - y * sr, y: P.cy + x * sr + y * cr, s: s };
}

/* finger tap indicator */
function s06_s07_finger(ctx, t, P, vBtn) {
  const taps = [{ a: 18.86, c: 19.00, up: 19.22 }, { a: 19.38, c: 19.52, up: 19.74 }];
  for (const tp of taps) {
    if (t < tp.a || t > tp.up + 0.16) continue;
    const app = E.outCubic(remap(t, tp.a, tp.c)), lift = remap(t, tp.up, tp.up + 0.16);
    const off = (1 - app) * 120 + lift * 150;
    // the contact point sits on the button's lower band (bh = 92), so neither the
    // fingertip disc nor its ring ever covers the STOPP / START label
    const pt = s06_s07_map(off * 0.55, vBtn + 78 + off, P);
    const a = clamp(app * app * 2.2) * (1 - lift);
    ctx.save(); ctx.globalAlpha *= a;
    radialFill(ctx, pt.x, pt.y, 56, [[0, 'rgba(255,255,255,0.22)'], [0.62, 'rgba(255,255,255,0.10)'], [1, 'rgba(255,255,255,0)']]);
    ctx.strokeStyle = 'rgba(255,255,255,0.85)'; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(pt.x, pt.y, 50, 0, TAU); ctx.stroke();
    ctx.restore();
    const r = remap(t, tp.c, tp.c + 0.34);
    if (r > 0 && r < 1) {
      ctx.save(); ctx.globalAlpha *= (1 - r) * 0.55;
      ctx.strokeStyle = '#FFFFFF'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(pt.x, pt.y, 48 + E.outCubic(r) * 92, 0, TAU); ctx.stroke();
      ctx.restore();
    }
  }
}

/* ------------------------------------------------------------------ s07 */
SCENES.s07 = {
  draw(ctx, lt, t) {
    FX.shake = Math.max(FX.shake, 5 * impulse(t, 19.00, 16) + 3 * impulse(t, 19.52, 16));
    // exit ramp before the 20.5 cut — type lifts off and the phone glow drops
    const outP = E.inOutCubic(clamp(remap(t, 20.30, 20.50)));

    /* backdrop: violet breath + drifting voxel dust */
    nightSky(ctx, t, { count: 60, seed: 91, color: '#CFC6E8', alpha: 0.2, hMul: 1, drift: true });
    s06_s07_dust(ctx, t, 0.4);
    // beat pulse behind the phone (18.0 / 18.5 / 19.0 / 19.5 / 20.0 …)
    const beat = pulse(t, 0.5, 6.5, 17.5);
    radialFill(ctx, CX, s06_s07_PCY, 760,
      [[0, rgba(TOKENS.secondary, 0.15 + 0.05 * Math.sin((t - 17.5) * 2) + 0.09 * beat)], [0.6, rgba(TOKENS.deepViolet, 0.06 + 0.03 * beat)], [1, 'rgba(0,0,0,0)']], 'lighter');
    // the 17.5 braam: a violet impact ring so the cut lands on a hit, not on a hole
    const imp = 1 - remap(t, 17.50, 17.90);
    if (imp > 0.01) {
      radialFill(ctx, CX, s06_s07_PCY, 900,
        [[0, rgba(TOKENS.violetHot, 0.30 * imp * imp)], [0.55, rgba(TOKENS.secondary, 0.12 * imp)], [1, 'rgba(0,0,0,0)']], 'lighter');
      shockwave(ctx, CX, s06_s07_PCY, remap(t, 17.50, 17.92), { radius: 700, color: TOKENS.violetHot, width: 14, alpha: 0.55 });
      speedLines(ctx, t, { count: 22, seed: 17, color: TOKENS.secondary, speed: 1900, dir: 1, alpha: 0.26 * imp * imp });
    }

    lightSweep(ctx, ((t - 17.5) / 2) % 1, { angle: -0.42, width: 620, color: TOKENS.secondary, alpha: 0.075 });

    /* the phone, rendered flat and then mapped with a perspective yaw */
    const fly = ez(t, 17.50, 17.90, E.outExpo);
    const breath = 1 + 0.014 * Math.sin((t - 17.5) * 1.7);         // never stops moving
    const P = {
      cx: lerp(CX + 104, CX, fly) + 7 * Math.sin((t - 17.5) * 0.73),
      cy: lerp(s06_s07_PCY + 44, s06_s07_PCY, fly) + 11 * Math.sin((t - 17.5) * 1.35 + 0.6),
      k: lerp(0.90, 1, fly) * breath,
      yaw: lerp(-0.34, 0, fly) + 0.09 * Math.sin((t - 17.5) * 1.05),
      roll: lerp(0.115, 0, fly) + 0.022 * Math.sin((t - 17.5) * 0.66 + 1.3),
      f: 1250,
    };
    const x = s06_s07_poff();
    let btn = null;
    phoneFrame(x, s06_s07_OW / 2, s06_s07_OH / 2, s06_s07_PW, {
      h: s06_s07_PH, radius: s06_s07_PW * 0.105, body: '#151220',
      edge: rgba(TOKENS.secondary, 0.55), edgeWidth: 4, screen: '#06050C', bezel: s06_s07_PW * 0.042,
      draw: (c, ix, iy, iw, ih) => { btn = s06_s07_screen(c, ix, iy, iw, ih, t); },
    });
    const vBtn = (btn ? btn.by : s06_s07_OH / 2) - s06_s07_OH / 2;

    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    dot(ctx, P.cx, P.cy + s06_s07_PH * 0.50 * P.k, 290 * P.k, TOKENS.secondary, (0.14 + 0.06 * beat) * (1 - outP * 0.85));
    ctx.restore();

    ctx.save();
    ctx.translate(P.cx, P.cy); ctx.rotate(P.roll); ctx.translate(-P.cx, -P.cy);
    const N = 26, OW = s06_s07_OW, OH = s06_s07_OH, DW = OW * P.k, DH = OH * P.k;
    const sn = Math.sin(P.yaw), cs = Math.cos(P.yaw);
    for (let i = 0; i < N; i++) {
      const u0 = -DW / 2 + i * DW / N, u1 = u0 + DW / N, um = (u0 + u1) / 2;
      const s0 = P.f / (P.f + u0 * sn), s1 = P.f / (P.f + u1 * sn), sm = P.f / (P.f + um * sn);
      const dx0 = P.cx + u0 * cs * s0, dx1 = P.cx + u1 * cs * s1, dh = DH * sm;
      ctx.drawImage(s06_s07_pc, i * OW / N, 0, OW / N + 0.8, OH,
        dx0, P.cy - dh / 2, (dx1 - dx0) + 1.2, dh);
    }
    ctx.restore();

    s06_s07_finger(ctx, t, P, vBtn);

    /* type exit: lift and fade the block before the 20.5 cut so the dissolve starts clean */
    ctx.save();
    ctx.globalAlpha *= 1 - outP;
    ctx.translate(0, -46 * outP);

    /* headline — two lines, slam at 17.47 / 17.59 (readable on the very first frame of the cut) */
    band(ctx, 470, 320, 0.5);
    const hOpt = { size: 104, family: FONTS.body, weight: 800, color: T().text, align: 'center' };
    const s1 = s06_s07_fit(ctx, 'Steuerung', hOpt, 700), s2 = s06_s07_fit(ctx, 'vom Handy.', hOpt, 700);
    s06_s07_slam(ctx, 'Steuerung', CX, 400, Object.assign({}, hOpt, { size: s1, tracking: -0.04 * s1 }), t, 17.47);
    s06_s07_slam(ctx, 'vom Handy.', CX, 508, Object.assign({}, hOpt, { size: s2, tracking: -0.04 * s2 }), t, 17.59);

    /* subline — two lines so it stays inside the safe area */
    const subs = ['Live-Konsole · Statistiken', '1-Klick-Stopp.'];
    subs.forEach((s, i) => {
      const p = ez(t, 18.00 + i * 0.14, 18.34 + i * 0.14, E.outExpo);
      if (p <= 0) return;
      const o = { size: 46, family: FONTS.head, weight: 500, color: rgba(T().text, 0.85), align: 'center', stagger: 0.5, ease: E.outExpo };
      o.size = s06_s07_fit(ctx, s, Object.assign({}, o, { trackF: 0.02 }), 700); o.tracking = 0.02 * o.size;
      drawKinetic(ctx, s, CX, 606 + i * 54, o, p, 'rise');
    });
    ctx.restore();
  },
};
