/* s06_s07.js
   s06  15.0–17.5  "World-Reset erkannt."   — Warn-HUD, 2-Frame-Glitch, Bot löst sich in Voxel auf,
                                              schwarze Pause mit violettem Ladebalken, Rematerialisierung + Haken
   s07  17.5–20.5  "Steuerung vom Handy."   — Handy fliegt mit 3D-Kippen ein, Live-Konsole (VT323),
                                              Statuszeile ONLINE + Laufzeit, Finger-Tap auf STOPP, Neustart
   Alles ist eine reine Funktion von t. Alle Modul-Namen sind mit s06_s07_ präfixiert.

   NEUINSZENIERUNG (v2): identische Timings, Typo, Farben und Strings — aber ein anderer Blick:
     s06 steht jetzt auf der Terrassenkante einer zweistufigen Hangfarm. Die Beete laufen quer
         zur alten Richtung (Spalten statt Reihen), die Kamera schiebt langsam auf den Bot-Platz
         zu und liegt leicht schief; der Bot steht links der Mitte an der Abbruchkante, rechts
         öffnet sich die tiefer liegende Wiese mit Teich. Der "Gleiche Stelle"-Marker ist ein
         Beacon: Bodenraute + Lichtsäule + gemessenes Schild, an dem auch der Ladebalken hängt.
     s07 hält das Handy schräg (Gierung +0.33, Rolle -0.085) rechts der Mitte; es steigt von
         unten ins Bild statt von rechts. Die Konsole hat eine Statuszeile mit getauschten
         Seiten, einen Aktivitätsstreifen und eine Zeilen-Gutter-Spur. */

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

/* ================================================================== s06 — die HugoSMP-Hangfarm
   Eine echte Minecraft-Welt, jetzt als Terrassenlandschaft quer durchs Bild:
     · links (u = ix-iy <= -1.5) das obere Plateau mit der begrenzten Farm-Parzelle,
       deren Beete als SPALTEN laufen (Stiele, Kürbisse, Wassergraben, Kopfsteinweg)
     · in der Mitte eine mittlere Terrasse, rechts die tiefer liegende Wiese mit Teich,
       zweitem kleinen Kürbisbeet und einem Weg, der über beide Stufen nach vorn führt
     · der AFK-SPIELER (mcPlayer) steht auf dem Kopfsteinweg direkt an der Abbruchkante
   Nachtlook: die Blöcke gehen in eine eigene Ebene, EIN Lichtdurchgang ('source-atop')
   dunkelt die Welt ab und schneidet warme Pfützen um die Fackeln heraus. */

const s06_ISO  = { size: 74, cx: 528, cy: 1194 };       // closer camera than v1 (66 -> 74)
const s06_UMAX = 13, s06_VMAX = 27;                     // visible (ix-iy) / (ix+iy) window
const s06_PT   = { ix: 1, iy: 3 };                      // the reserved tile — screen ≈ (400, 1194)
const s06_CHK  = { x: 664, y: 1054 };                   // where the green check lands (right of the bot)
const s06_PLOT = { x0: -4, x1: 1, y0: 1, y1: 7 };       // the bounded upper farm plot
const s06_PATCH = { x0: 4, x1: 7, y0: 0, y1: 2 };       // the small wild patch on the lower meadow
const s06_POND = { x0: 2, x1: 4, y0: -4, y1: -2 };      // pond on the meadow, right of the terrace

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
// the plot runs in COLUMNS now (constant ix): the furrows cross the frame the other way —
// back path, stems, two dense pumpkin columns, the irrigation channel, then the front path
const s06_ROW = { '-4': 'cobble', '-3': 'crop', '-2': 'soil', '-1': 'soil', '0': 'water', '1': 'cobble' };

/* terrain: two terrace steps that run DOWN the screen (constant ix-iy), so the farm plateau
   holds the left third, a middle terrace carries the path and the meadow drops away right. */
function s06_hAt(ix, iy) {
  if (ix >= s06_PLOT.x0 - 1 && ix <= s06_PLOT.x1 + 1 && iy >= s06_PLOT.y0 - 1 && iy <= s06_PLOT.y1 + 1) return 2;
  const u = ix - iy + (hash2(ix * 7 + 3, iy * 11 + 5) - 0.5) * 1.9;
  return u <= -1.5 ? 2 : u <= 2.5 ? 1 : 0;
}
/* back edge of the world: one ragged screen line at y ≈ 1009 whatever the terrace height,
   rising towards both frame edges (|ix-iy| > 6) so the land reads as a shallow valley and the
   two oaks have somewhere to stand — the rise stays outside every text column. */
function s06_vMin(ix, iy) {
  const u = Math.abs(ix - iy);
  return -5 + 2 * s06_hAt(ix, iy) + Math.round(hash1((ix - iy) * 131 + 17) * 2)
       - Math.min(3, Math.max(0, Math.round((u - 6) * 0.7)));
}
function s06_inWin(ix, iy, m) {
  m = m || 0;
  return Math.abs(ix - iy) <= s06_UMAX + m && ix + iy >= s06_vMin(ix, iy) - m && ix + iy <= s06_VMAX + m;
}
// first tile of a screen column (u = ix-iy) that is inside the window — used to seat the oaks
function s06_backV(u) {
  for (let v = -12; v <= 20; v++) {
    if (((((u + v) % 2) + 2) % 2) !== 0) continue;
    const ix = (u + v) / 2, iy = (v - u) / 2;
    if (v >= s06_vMin(ix, iy)) return v;
  }
  return 0;
}
// tall, compact oaks. Two of them break the horizon far left / far right (x < 200, x > 880),
// i.e. outside every text column; the third frames the lower right corner.
const s06_TREES = [
  { u: -7, back: 0, trunk: 3, R: 1 },                   // oak at the farm's west corner (x ≈ 79)
  { u:  6, back: 0, trunk: 3, R: 1 },                   // oak over the meadow, far right (x ≈ 913)
  { u:  8, back: 4, trunk: 4, R: 1 },                   // foreground oak, right edge
].map(tr => {
  const v = s06_backV(tr.u) + tr.back * 2;
  return { ix: (tr.u + v) / 2, iy: (v - tr.u) / 2, trunk: tr.trunk, R: tr.R };
});
const s06_TORCH = [
  { ix: 1, iy: 1 }, { ix: 1, iy: 4 }, { ix: 1, iy: 7 },  // down the terrace path, past the bot's spot
  { ix: 2, iy: 0 },                                      // at the plot fence
  { ix: 3, iy: 0 }, { ix: 4, iy: 6 },                    // middle terrace
  { ix: 5, iy: -2 }, { ix: 7, iy: 3 },                   // pond edge and meadow
].filter(p => s06_inWin(p.ix, p.iy, 0));
// oak fence: along the back edge of the plot and down its front flank
const s06_FENCE = (() => {
  const o = [];
  for (let ix = -1; ix <= 2; ix++) o.push({ ix: ix, iy: 0 });
  for (let iy = 5; iy <= 8; iy++) o.push({ ix: 2, iy: iy });
  return o.filter(p => s06_inWin(p.ix, p.iy, 0) && !s06_TREES.some(tr => tr.ix === p.ix && tr.iy === p.iy));
})();
const s06_CHEST = { ix: 3, iy: 6 };
// the cobble path leaves the farm across both terrace steps towards the lower right
const s06_ISPATH = (ix, iy) => iy === 7 && ix >= 2 && ix <= 8;

/* ------------------------------------------------- build the world once ---
   One block per flat tile; a column only grows downwards where the terrain really
   steps, and every block covered by (ix+1, iy+1, iz+1) is dropped again. */
const s06_WORLD = (() => {
  const occ = new Set(), K = (a, b, c) => a + '|' + b + '|' + c;
  const solid = [], pumpkins = [], pickles = [];
  const put = (ix, iy, iz, kind) => { const k = K(ix, iy, iz); if (occ.has(k)) return; occ.add(k); solid.push({ ix: ix, iy: iy, iz: iz, kind: kind }); };
  const treeAt = (ix, iy) => { for (const tr of s06_TREES) if (tr.ix === ix && tr.iy === iy) return true; return false; };

  for (let ix = -32; ix <= 32; ix++) for (let iy = -32; iy <= 32; iy++) {
    if (!s06_inWin(ix, iy, 2)) continue;
    const h = s06_hAt(ix, iy);
    const inPlot = ix >= s06_PLOT.x0 && ix <= s06_PLOT.x1 && iy >= s06_PLOT.y0 && iy <= s06_PLOT.y1;
    const inPatch = ix >= s06_PATCH.x0 && ix <= s06_PATCH.x1 && iy >= s06_PATCH.y0 && iy <= s06_PATCH.y1;
    let row = inPlot ? s06_ROW[String(ix)] : null;
    if (!row && s06_ISPATH(ix, iy)) row = 'cobble';                          // the path out of the farm
    if (!row && inPatch) row = 'soil';                                       // the wild patch below
    if (!row && ix >= s06_POND.x0 && ix <= s06_POND.x1 && iy >= s06_POND.y0 && iy <= s06_POND.y1) row = 'water';
    if (!row && ix >= s06_POND.x0 - 1 && ix <= s06_POND.x1 + 1 && iy >= s06_POND.y0 - 1 && iy <= s06_POND.y1 + 1) row = 'sand';
    if (!row && !inPlot && hash2(ix * 13 + 7, iy * 29 + 3) > 0.955) row = 'dirt';
    let kind = 'grass', pump = false;
    if (row && !treeAt(ix, iy)) {
      kind = row;
      if (row === 'soil') {
        // planted on a diagonal checkerboard so every pumpkin stands alone on its farmland
        pump = inPlot ? ((((ix + iy) % 2) + 2) % 2) === 0 && hash2(ix * 9 + 4, iy * 13 + 6) > 0.12
                      : hash2(ix * 9 + 4, iy * 13 + 6) > 0.42;               // scattered on the wild patch
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
  // boulders and bushes on the grass — never inside the farm rows, never on the back edge
  for (let ix = -32; ix <= 32; ix++) for (let iy = -32; iy <= 32; iy++) {
    if (!s06_inWin(ix, iy, 0) || ix + iy < s06_vMin(ix, iy) + 2) continue;
    if (ix >= s06_PLOT.x0 - 1 && ix <= s06_PLOT.x1 + 1 && iy >= s06_PLOT.y0 - 1 && iy <= s06_PLOT.y1 + 1) continue;
    if (s06_ISPATH(ix, iy)) continue;
    const h = s06_hAt(ix, iy);
    if (occ.has(K(ix, iy, h + 1))) continue;
    const hs = hash2(ix * 19 + 101, iy * 23 + 7);
    const front = ix + iy > 11 ? 0.055 : 0.0;                 // a denser foreground field
    if (hs > 0.962 - front) put(ix, iy, h + 1, hs > 0.984 ? 'cobble' : 'stone');
    else if (hs < 0.034 + front) put(ix, iy, h + 1, 'leaves');
  }
  // occlusion cull + painter order (ix + iy + iz ascending)
  const vis = solid
    .filter(b => s06_inWin(b.ix, b.iy, 0) && !occ.has(K(b.ix + 1, b.iy + 1, b.iz + 1)))
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
const s06_LIT = { x0: -220, y0: 460, w: 1560, h: 1500 };
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
    const r = 32 * p.fl, rg = x.createRadialGradient(p.x, p.y, 0, p.x, p.y, r);
    rg.addColorStop(0, 'rgba(0,0,0,0.98)'); rg.addColorStop(0.30, 'rgba(0,0,0,0.66)');
    rg.addColorStop(0.66, 'rgba(0,0,0,0.19)'); rg.addColorStop(1, 'rgba(0,0,0,0)');
    x.fillStyle = rg; x.beginPath(); x.arc(p.x, p.y, r, 0, TAU); x.fill();
  }
  x.globalCompositeOperation = 'lighter';
  for (const p of pts) {
    const r = 36 * p.fl, rg = x.createRadialGradient(p.x, p.y, 0, p.x, p.y, r);
    rg.addColorStop(0, 'rgba(156,64,12,0.52)'); rg.addColorStop(0.42, 'rgba(92,34,6,0.20)');
    rg.addColorStop(1, 'rgba(0,0,0,0)');
    x.fillStyle = rg; x.beginPath(); x.arc(p.x, p.y, r, 0, TAU); x.fill();
  }
  return s06_litC;
}

/* ------------------------------------------------------------ night horizon
   Blocky hills plus a treeline just above the back edge of the terrain (y ≈ 928),
   so the hangfarm sits in a landscape instead of floating in black. */
const s06_FAR = (() => {
  const o = [];
  for (let i = 0; i < 52; i++) {
    const x = hash1(i * 131 + 7) * (W + 260) - 130;
    o.push({ x: Math.round(x), s: 10 + Math.round(hash1(i * 17 + 3) * 15), d: hash1(i * 29 + 11) });
  }
  return o.sort((a, b) => a.d - b.d);
})();
const s06_HILLS = (() => {
  const o = [];
  for (let i = 0; i < 4; i++) o.push({ x: -60 + i * 330 + hash1(i * 37 + 5) * 150, w: 260 + hash1(i * 53 + 9) * 300, h: 52 + hash1(i * 71 + 3) * 54 });
  return o;
})();
function s06_horizon(ctx) {
  const yH = 1000;
  linearFill(ctx, 0, yH - 150, 0, yH + 60, [[0, 'rgba(40,32,80,0)'], [0.6, 'rgba(46,36,92,0.30)'], [1, 'rgba(18,14,40,0)']], [0, yH - 150, W, 210]);
  ctx.save();
  // stepped, blocky hills far behind the farm
  for (let i = 0; i < s06_HILLS.length; i++) {
    const hl = s06_HILLS[i];
    ctx.fillStyle = i % 2 ? '#120F30' : '#0E0C26';
    for (let x = 0; x < hl.w; x += 24) {
      const q = (x - hl.w / 2) / (hl.w / 2);
      const hh = Math.max(0, Math.round(hl.h * (1 - q * q) / 12) * 12);
      if (hh <= 0) continue;
      ctx.fillRect(Math.round(hl.x + x), yH - hh, 25, hh + 8);
    }
  }
  for (const tr of s06_FAR) {
    ctx.fillStyle = tr.d > 0.5 ? '#171341' : '#0D0B26';
    const y = yH - tr.d * 8;
    ctx.fillRect(tr.x - 2, y - tr.s * 0.55, 5, tr.s * 0.6);
    ctx.fillRect(tr.x - tr.s * 0.5, y - tr.s * 1.30, tr.s, tr.s * 0.80);
    ctx.fillRect(tr.x - tr.s * 0.3, y - tr.s * 1.75, tr.s * 0.6, tr.s * 0.55);
  }
  ctx.fillStyle = '#0B0A22'; ctx.fillRect(0, yH, W, 26);
  ctx.restore();
  linearFill(ctx, 0, yH - 20, 0, yH + 110, [[0, 'rgba(66,58,124,0.26)'], [1, 'rgba(20,17,44,0)']], [0, yH - 20, W, 130]);
}

/* ---------------------------------------------------------------- the player
   The AFK player stands on the reserved tile at the terrace edge, faces the drop
   and takes a mining swing whenever he is connected. */
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
  const swing = (t < 15.32 || t > 16.88) && cyc > 1.35 && cyc < 2.15 ? Math.sin((cyc - 1.35) / 0.80 * Math.PI) : 0;
  ctx.save(); ctx.globalAlpha *= a;
  if (wire < 0.5) {                                        // contact shadow
    ctx.save(); ctx.globalAlpha *= 0.45; ctx.fillStyle = '#000000';
    ctx.beginPath(); ctx.ellipse(p.x, p.y + s06_ISO.size * 0.06, s06_ISO.size * 0.36, s06_ISO.size * 0.18, 0, 0, TAU); ctx.fill();
    ctx.restore();
  }
  mcPlayer(ctx, p.x, p.y, {
    size: s06_ISO.size, t: t, walk: 0, swing: swing, facing: 'right', bob: 0.020,
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
   Timing is unchanged (dissolve from 15.40, rematerialise from 16.42); the choreography is new:
   the blocks are torn off UP-RIGHT in a spiral and come back in from the lower left. */
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
  if (t < 16.42) {                                          // torn off up and to the right
    const st = 15.40 + h * 0.18, q = remap(t, st, st + 0.42);
    if (q <= 0) return { dx: 0, dy: 0, sc: 1, a: 1 };
    const e = E.outCubic(q);
    const swirl = Math.sin(q * 4.4 + h * TAU) * 34 * e;
    return { dx: (56 + hx * 168) * e + swirl, dy: -(210 + hy * 200) * e, sc: lerp(1, 0.32, q), a: clamp(1 - q * q * 1.12) };
  }
  const st2 = 16.42 + h * 0.20, q2 = remap(t, st2, st2 + 0.32);   // fly back in from the lower left
  const fade = 1 - clamp(remap(t, 16.60, 16.88));
  const ox = -(120 + hx * 150), oy = 90 + hy * 150;
  if (q2 <= 0) return { dx: ox, dy: oy, sc: 0.4, a: 0 };
  const e2 = E.outCubic(q2);
  return { dx: ox * (1 - e2), dy: oy * (1 - e2), sc: lerp(0.4, 1, e2), a: clamp(q2 * 1.7) * fade };
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
   player's depth: everything behind him, then the player, then everything in front. */
// the bake boxes reach past the frame edges: the camera drifts and rolls, so the baked
// world has to carry a margin on all four sides or a wedge of black creeps in at the edge
const s06_BOXA = { x: -100, y: 340, w: 1280, h: 1580 }, s06_BOXB = { x: -100, y: 860, w: 1280, h: 1060 };
let s06_bakeA = null, s06_bakeB = null;
function s06_bakeWorld() {
  if (s06_bakeA) return;
  s06_bakeA = makeCanvas(s06_BOXA.w, s06_BOXA.h); s06_bakeB = makeCanvas(s06_BOXB.w, s06_BOXB.h);
  const A = s06_bakeA.getContext('2d'), B = s06_bakeB.getContext('2d');
  A.translate(-s06_BOXA.x, -s06_BOXA.y); B.translate(-s06_BOXB.x, -s06_BOXB.y);
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
  // sea pickles growing in the water channel and the pond
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
  ctx.drawImage(s06_bakeA, s06_BOXA.x, s06_BOXA.y);
  s06_player(ctx, t, wire);
  ctx.drawImage(s06_bakeB, s06_BOXB.x, s06_BOXB.y);
  ctx.restore();
}
// violet wireframe version of exactly the same build — the farm stays standing while the bot is gone
function s06_worldWire(ctx, t, wire) {
  const violet = T().secondary, hot = TOKENS.violetHot, O = s06_ISO;
  ctx.save();
  for (const b of s06_WORLD.vis) {
    if (b.kind === 'stone' || b.kind === 'dirt') continue;      // buried body: no wire needed
    const q = isoPos(b.ix, b.iy, b.iz, O);
    // the skeleton is brightest around the bot's terrace and dissolves into the dark at the edges
    const fall = clamp(1 - (Math.hypot((q.x - 450) * 0.80, q.y - 1215) - 320) / 420);
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

/* pumpkin items popping out of the farm — before the reset and again once the bot is back.
   Only the wild patch on the lower meadow pops: it sits in the open right corridor, clear of
   the chat plate (x < 715), of the marker cluster (y < 1150) and of the bot himself. */
const s06_POPS = [15.00, 15.25, 16.98, 17.23, 17.48];
const s06_POPCELLS = (() => {
  const o = s06_WORLD.pumpkins.filter(c => {
    const p = isoPos(c.ix, c.iy, c.iz, s06_ISO);
    return p.x > 700 && p.x < 1010 && p.y > 1200 && p.y < 1560;
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
    const dx = 30 + hash2(k, 3) * 48;                        // the arc now leaves to the RIGHT
    const x0 = g.x, y0 = g.y - s06_ISO.size * 0.55;
    const x = x0 + dx * e, y = y0 - e * 150 + life * life * 30;
    const a = clamp((1 - life) * 1.8) * clamp(life / 0.10) * (1 - wire);
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    for (let t2 = 1; t2 <= 4; t2++) {
      const e2 = E.outCubic(Math.max(0, life - t2 * 0.055));
      dot(ctx, x0 + dx * e2, y0 - e2 * 150, 28 - t2 * 4, '#FFB25A', a * 0.13 / t2);
    }
    dot(ctx, x, y, 50, '#FFB25A', a * 0.26);
    ctx.restore();
    ctx.save(); ctx.globalAlpha *= a;
    ctx.translate(x, y); ctx.rotate((hash2(k, 9) - 0.5) * 0.3 - life * 0.35);
    blockIcon(ctx, s06_TEX.pumpkin, 0, -12, 40);
    ctx.restore();
  }
}

/* ---------------------------------------------------------- "Gleiche Stelle" marker
   The reserved tile is now a proper beacon so the promise reads at a glance:
   ground diamond + corner ticks + a violet light column + a measured, framed label plate
   that the loading bar hangs under during the black pause. All in world space (camera). */
const s06_MARK = { dx: 232, dy: -64, barY: -142, dotY: -192 };   // label / bar offsets from the tile
function s06_markAnchor() { return isoPos(s06_PT.ix, s06_PT.iy, s06_hAt(s06_PT.ix, s06_PT.iy), s06_ISO); }
function s06_markA(t) { return win(t, 15.55, 15.75, 16.62, 16.86); }
function s06_spot(ctx, t) {
  const base = s06_markA(t);
  if (base <= 0.01) return;
  const beat = 0.5 + 0.5 * pulse(t, 0.5, 5, 15.5);
  const O = s06_ISO, p = s06_markAnchor();
  const w = O.size * 0.866, h = O.size * 0.5;
  const dia = (k, close) => {
    ctx.beginPath();
    ctx.moveTo(p.x, p.y - h * k); ctx.lineTo(p.x + w * k, p.y); ctx.lineTo(p.x, p.y + h * k); ctx.lineTo(p.x - w * k, p.y);
    if (close !== false) ctx.closePath();
  };
  ctx.save(); ctx.globalAlpha *= base;

  // the tile itself: a soft violet plate + a rotating dashed ring + a wider quiet ring
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  ctx.fillStyle = rgba(TOKENS.secondary, 0.16 + 0.12 * beat); dia(0.98); ctx.fill();
  dot(ctx, p.x, p.y, O.size * 1.5, TOKENS.secondary, 0.20 + 0.10 * beat);
  ctx.restore();
  ctx.strokeStyle = rgba(TOKENS.violetHot, 0.95); ctx.lineWidth = 3.5;
  ctx.setLineDash([16, 11]); ctx.lineDashOffset = -t * 34; dia(1.0); ctx.stroke();
  ctx.setLineDash([]);
  ctx.strokeStyle = rgba(TOKENS.secondary, 0.34 + 0.24 * beat); ctx.lineWidth = 2; dia(1.42); ctx.stroke();
  // four corner ticks on the diamond's axes
  ctx.strokeStyle = rgba(TOKENS.violetHot, 0.85); ctx.lineWidth = 4; ctx.lineCap = 'round';
  const tick = [[0, -h], [w, 0], [0, h], [-w, 0]];
  for (const [tx, ty] of tick) {
    const nx = tx / (Math.abs(tx) + Math.abs(ty)), ny = ty / (Math.abs(tx) + Math.abs(ty));
    ctx.beginPath();
    ctx.moveTo(p.x + tx * 1.22 - ny * 13, p.y + ty * 1.22 + nx * 13);
    ctx.lineTo(p.x + tx * 1.22 + ny * 13, p.y + ty * 1.22 - nx * 13);
    ctx.stroke();
  }
  ctx.lineCap = 'butt';

  // the light column standing on the tile
  const bh = O.size * 2.0;
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  const bg = ctx.createLinearGradient(0, p.y - bh, 0, p.y);
  bg.addColorStop(0, 'rgba(0,0,0,0)');
  bg.addColorStop(0.55, rgba(TOKENS.secondary, 0.16 + 0.08 * beat));
  bg.addColorStop(1, rgba(TOKENS.violetHot, 0.30 + 0.12 * beat));
  ctx.fillStyle = bg;
  ctx.beginPath();
  ctx.moveTo(p.x - w * 0.34, p.y); ctx.lineTo(p.x + w * 0.34, p.y);
  ctx.lineTo(p.x + w * 0.16, p.y - bh); ctx.lineTo(p.x - w * 0.16, p.y - bh); ctx.closePath(); ctx.fill();
  ctx.fillStyle = rgba(TOKENS.violetHot, 0.30 + 0.14 * beat);
  ctx.fillRect(p.x - 2, p.y - bh, 4, bh);
  // sparks climbing the column
  for (let i = 0; i < 7; i++) {
    const q = (((t - 15.5) * 0.55 + i / 7) % 1 + 1) % 1;
    const sz = 7 - q * 3, a = Math.sin(q * Math.PI) * 0.85;
    ctx.fillStyle = rgba(TOKENS.violetHot, a);
    ctx.fillRect(p.x + Math.sin(q * 5.6 + i) * 13 - sz / 2, p.y - q * bh - sz / 2, sz, sz);
  }
  ctx.restore();

  /* the label plate — measured, framed and connected to the tile by a leader */
  const lo = { size: 26, family: FONTS.silk, weight: 700, align: 'center', tracking: 3 };
  const tw = measureText(ctx, 'GLEICHE STELLE', lo);
  const cxp = p.x + s06_MARK.dx, cyp = p.y + s06_MARK.dy;
  const pw = tw + 46, ph = 50;
  ctx.strokeStyle = rgba(TOKENS.secondary, 0.55); ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(p.x + w * 0.35, p.y - 4); ctx.lineTo(cxp - pw / 2 - 12, cyp); ctx.stroke();
  ctx.fillStyle = 'rgba(6,3,14,0.88)'; roundRect(ctx, cxp - pw / 2, cyp - ph / 2, pw, ph, 5); ctx.fill();
  ctx.strokeStyle = rgba(TOKENS.violetHot, 0.55 + 0.35 * beat); ctx.lineWidth = 2;
  roundRect(ctx, cxp - pw / 2, cyp - ph / 2, pw, ph, 5); ctx.stroke();
  ctx.fillStyle = rgba(TOKENS.violetHot, 0.9);                     // pointer towards the beacon
  ctx.beginPath(); ctx.moveTo(cxp - pw / 2 - 11, cyp); ctx.lineTo(cxp - pw / 2 + 1, cyp - 9); ctx.lineTo(cxp - pw / 2 + 1, cyp + 9); ctx.closePath(); ctx.fill();
  glowText(ctx, 'GLEICHE STELLE', cxp, cyp + 1, Object.assign({ color: TOKENS.violetHot }, lo), 18, 0.35 + 0.25 * beat);
  ctx.restore();
}

/* red warning HUD: a left-anchored chip with brackets + Press Start 2P label;
   calms down once the bot is back */
function s06_s07_warnHud(ctx, t) {
  const p = ez(t, 14.97, 15.26, E.outExpo);
  if (p <= 0.001) return;
  const alarm = 1 - remap(t, 16.42, 16.70);                 // 1 = red alert, 0 = resolved
  const pu = (0.45 + 0.55 * pulse(t, 0.5, 5.5, 15.0)) * alarm + (1 - alarm) * 0.5;
  const bx = 126, by = 320, bw = 636, bh = 128;
  ctx.save();
  ctx.globalAlpha *= clamp(p * 2) * (0.68 + 0.32 * alarm);
  ctx.fillStyle = 'rgba(6,3,10,0.55)'; roundRect(ctx, bx, by, bw, bh, 6); ctx.fill();
  if (alarm > 0.02) {
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha *= (0.16 + 0.22 * pu) * alarm;
    ctx.fillStyle = T().primary; roundRect(ctx, bx, by, bw, bh, 6); ctx.fill(); ctx.restore();
    // hazard stripes packed into the right end of the plate
    ctx.save(); roundRect(ctx, bx, by, bw, bh, 6); ctx.clip();
    ctx.strokeStyle = rgba(T().primary, (0.35 * pu + 0.15) * alarm); ctx.lineWidth = 7;
    for (let k = 0; k < 7; k++) {
      const o = k * 26 - (t * 22 % 26);
      ctx.beginPath(); ctx.moveTo(bx + bw - 168 + o, by + bh); ctx.lineTo(bx + bw - 168 + o + bh, by); ctx.stroke();
    }
    ctx.restore();
    // blinking alarm square at the left edge
    ctx.save(); ctx.globalAlpha *= alarm;
    ctx.fillStyle = rgba(T().primary, 0.35 + 0.65 * pu);
    ctx.fillRect(bx + 26, by + bh / 2 - 13, 26, 26);
    ctx.restore();
  }
  brackets(ctx, bx, by, bw, bh, p, {
    len: 46, width: 5, alpha: (0.55 + 0.45 * pu) * (0.5 + 0.5 * alarm),
    color: alarm > 0.5 ? T().primary : s06_s07_mix(TOKENS.ok, T().primary, alarm * 2),
  });
  const o = {
    size: 44, family: FONTS.pixel, weight: 400, align: 'left', trackF: 0.02,
    color: alarm > 0.02 ? s06_s07_mix('#B8AFC9', s06_s07_mix(T().primary, '#FFFFFF', 0.25 + 0.45 * pu), alarm) : '#B8AFC9',
  };
  o.size = s06_s07_fit(ctx, 'WORLD RESET', o, 430); o.tracking = 0.02 * o.size;
  const lx = bx + 74;
  if (alarm > 0.05) glowText(ctx, 'WORLD RESET', lx, by + bh / 2 + 2, o, 26, 0.45 * pu * alarm);
  else drawText(ctx, 'WORLD RESET', lx, by + bh / 2 + 2, o);
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
  const slide = (1 - E.outCubic(clamp((t - s06_s07_CHAT[lines.length - 1].t) / 0.16))) * 22;
  ctx.save(); ctx.translate(-slide, 0);                       // the log now slides in from the left
  const x = 138, y = 1214, lh = 46;
  ctx.fillStyle = rgba(TOKENS.secondary, 0.55);
  ctx.fillRect(x - 22, y - 12, 4, lines.length * lh + 16);
  mcChat(ctx, x, y, lines, { size: 34, lineHeight: lh, family: FONTS.term, bgColor: 'rgba(5,3,12,0.72)', pad: 12, extraW: 14 });
  ctx.restore();
}

/* violet loading bar during the black pause — it hangs on the marker beacon */
function s06_s07_loading(ctx, t) {
  const a = win(t, 15.92, 16.06, 16.40, 16.52);
  if (a <= 0.01) return;
  const p = clamp(remap(t, 15.94, 16.42) * 1.03);        // linear: the bar must visibly travel
  const anc = s06_markAnchor();
  const cxb = anc.x + s06_MARK.dx, by = anc.y + s06_MARK.barY, th = 14;
  const len = 372, x0 = cxb - len / 2;
  ctx.save(); ctx.globalAlpha *= a;
  progressBar(ctx, cxb, by, len, p, { color: TOKENS.secondary, thickness: th, track: '#FFFFFF' });
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
    ctx.fillRect(cxb - 30 + k * 30 - s / 2, anc.y + s06_MARK.dotY - s / 2, s, s);
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
    nightSky(ctx, t, { count: 110, seed: 57, color: '#CFC6E8', alpha: 0.34 * (1 - dark * 0.8), hMul: 0.52, drift: true });
    radialFill(ctx, 420, 1190, 820,
      [[0, rgba(TOKENS.secondary, (0.11 + 0.05 * pulse(t, 0.5, 6, 15.0)) * worldA)], [0.55, rgba(TOKENS.deepViolet, 0.05 * worldA)], [1, 'rgba(0,0,0,0)']], 'lighter');
    // red alarm wash on the beats of the warning
    const al = (1 - remap(t, 15.30, 15.70)) * (0.35 + 0.65 * pulse(t, 0.5, 5.5, 15.0));
    if (al > 0.01) {
      radialFill(ctx, CX, CY, 1160, [[0.35, 'rgba(0,0,0,0)'], [1, rgba(T().primary, 0.30 * al)]], 'lighter');
    }

    s06_s07_dust(ctx, t, 0.34 * (1 - dark * 0.7));

    /* --- the world: two baked, night-lit canvases with the player between them.
       The camera pushes in on the bot's spot on a slight tilt and drifts up-right. */
    const push = E.inOutCubic(clamp(remap(t, 15.0, 17.5)));
    const cam = {
      zoom: 1.005 + 0.085 * push + 0.030 * impulse(t, 15.40, 6) + 0.020 * impulse(t, 16.42, 5),
      x: lerp(28, -18, push) + 7 * Math.sin((t - 15) * 0.55),
      y: lerp(22, -16, push) + 6 * Math.sin((t - 15) * 0.42 + 1.2),
      rot: -0.021 + 0.004 * Math.sin((t - 15) * 0.7),
      ox: 400, oy: 1194,
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
      c.save(); c.globalAlpha *= Math.min(1, worldA * 3.4); s06_spot(c, t); s06_s07_loading(c, t); c.restore();
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
const s06_s07_PW = 496, s06_s07_PH = 676;               // phone body in px
const s06_s07_OW = 620, s06_s07_OH = 900;               // offscreen size
const s06_s07_PCX = CX + 72, s06_s07_PCY = 1032;        // phone centre: right of the frame's middle
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
  const r = rng(2903), o = [];
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

/* console feed — realistic client log, nothing invented beyond the product's features.
   Same arrival timecodes as before, restaged content (other players, other order). */
const s06_s07_LOG = [
  { t: 17.50, s: '[System] Verbunden.' },
  { t: 17.50, s: '[Chat] <Lena> moin' },
  { t: 17.50, s: '[System] AFK aktiv.' },
  { t: 17.50, s: '[System] Pickle-Farm aktiv.' },
  { t: 17.50, s: '[System] Inventar voll.' },
  { t: 17.50, s: '/sell' },
  { t: 17.74, s: '[System] Inventar verkauft.' },
  { t: 17.99, s: '[Chat] <Tom> alles ok?' },
  { t: 18.24, s: '[System] Spawner geleert.' },
  { t: 18.49, s: '[System] Inventar voll.' },
  { t: 18.74, s: '/sell' },
  { t: 19.06, s: '[System] Bot gestoppt.' },
  { t: 19.60, s: '[System] Bot gestartet.' },
  { t: 19.84, s: '[System] AFK aktiv.' },
  { t: 20.08, s: '[Chat] <Lena> nice' },
  { t: 20.32, s: '[System] Inventar voll.' },
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
// colour split for one console line: {tag, rest, tagC, restC, gut}
function s06_s07_logColor(s) {
  if (s[0] === '/') return { tag: '', rest: s, tagC: '', restC: TOKENS.violetHot, gut: TOKENS.violetHot };
  const i = s.indexOf(']');
  const tag = i > 0 ? s.slice(0, i + 1) : '', rest = i > 0 ? s.slice(i + 1) : s;
  if (s.indexOf('gestoppt') >= 0) return { tag: tag, rest: rest, tagC: rgba(T().primary, 0.75), restC: '#FF7A7A', gut: T().primary };
  if (s.indexOf('gestartet') >= 0) return { tag: tag, rest: rest, tagC: rgba(TOKENS.ok, 0.6), restC: TOKENS.ok, gut: TOKENS.ok };
  if (tag === '[Chat]') return { tag: tag, rest: rest, tagC: rgba(TOKENS.muted, 0.85), restC: '#EDE8F6', gut: TOKENS.muted };
  return { tag: tag, rest: rest, tagC: rgba(TOKENS.secondary, 0.85), restC: rgba(T().text, 0.82), gut: TOKENS.secondary };
}

/* the phone screen (drawn into the offscreen, in phone-local pixels) */
function s06_s07_screen(ctx, x, y, w, h, t) {
  const stopped = t >= s06_s07_STOP && t < s06_s07_START;
  const pad = 12, left = x + pad, right = x + w - pad;

  // screen wash
  linearFill(ctx, x, y, x, y + h, [[0, 'rgba(28,16,52,0.55)'], [0.5, 'rgba(10,7,20,0.2)'], [1, 'rgba(24,10,34,0.5)']], [x, y, w, h]);

  /* status row — runtime on the left, the status lamp on the right (mirrored from v1) */
  const sy = y + 44;
  const dotC = stopped ? '#6B6478' : TOKENS.ok;
  drawText(ctx, s06_s07_hms(s06_s07_uptime(t)), left, sy + 1,
    { size: 26, family: FONTS.mono, weight: 600, color: rgba(T().text, stopped ? 0.4 : 0.82), align: 'left' });
  const lab = stopped ? 'GESTOPPT' : 'ONLINE';
  const lo = { size: 23, family: FONTS.silk, weight: 700, color: stopped ? TOKENS.muted : TOKENS.ok, align: 'right', tracking: 2 };
  drawText(ctx, lab, right, sy + 1, lo);
  const lw = measureText(ctx, lab, lo);
  const dx = right - lw - 20;
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  dot(ctx, dx, sy, 22, dotC, stopped ? 0.28 : 0.5 + 0.28 * pulse(t, 1.0, 3.2, 17.6));
  ctx.restore();
  ctx.fillStyle = dotC; ctx.beginPath(); ctx.arc(dx, sy, 8, 0, TAU); ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.12)'; ctx.fillRect(left, sy + 30, w - pad * 2, 2);

  /* live activity strip — the session statistics, scrolling (no numbers, just motion) */
  const ay = sy + 40, aw = w - pad * 2, bars = 30, bwd = aw / bars;
  for (let i = 0; i < bars; i++) {
    const ph = i - (t - 17.5) * 7.5;
    const nvl = 0.30 + 0.70 * Math.abs(Math.sin(ph * 0.55 + fbm1(ph * 0.22, 5) * 4.2));
    const hgt = (stopped ? 4 : 6 + nvl * 26);
    ctx.fillStyle = stopped ? 'rgba(120,112,140,0.35)' : rgba(i > bars - 4 ? TOKENS.violetHot : TOKENS.secondary, 0.30 + 0.45 * nvl);
    ctx.fillRect(left + i * bwd, ay + 30 - hgt, bwd - 3, hgt);
  }

  /* console feed: newest line at the bottom, older ones scroll up */
  const btnTop = y + h - 158, bh = 86;
  const top = ay + 44, bot = btnTop - 20, lh = 46;
  // VT323 advances at 0.4 em — keep the longest line inside the screen, never below the 36 px floor
  let size = 38;
  while (size > 36 && 27 * 0.4 * size > w - pad * 2 - 14) size -= 0.5;
  ctx.save();
  ctx.beginPath(); ctx.rect(left - 4, top, w - pad * 2 + 8, bot - top); ctx.clip();
  const shown = [];
  for (const l of s06_s07_LOG) if (t >= l.t) shown.push(l);
  const newest = shown.length ? shown[shown.length - 1].t : 0;
  // sub-pixel scroll: the feed eases in the new line and keeps creeping between arrivals
  const slide = (1 - E.outCubic(clamp((t - newest) / 0.22))) * lh - Math.min(6, (t - newest) * 3.2);
  for (let i = shown.length - 1; i >= 0; i--) {
    const yy = bot - 20 - (shown.length - 1 - i) * lh + slide;
    if (yy < top - lh || yy > bot + lh) continue;
    const fade = clamp((yy - top) / 44) * clamp((bot - yy) / 18);
    const c = s06_s07_logColor(shown[i].s);
    const a = fade * (i === shown.length - 1 ? clamp((t - shown[i].t) / 0.12) : 1);
    // row band + coloured gutter tick, so the feed reads as a log, not as loose text
    ctx.globalAlpha = a * 0.5;
    ctx.fillStyle = i % 2 ? 'rgba(255,255,255,0.035)' : 'rgba(0,0,0,0.18)';
    ctx.fillRect(left - 4, yy - lh / 2 + 2, w - pad * 2 + 8, lh - 4);
    ctx.globalAlpha = a;
    ctx.fillStyle = c.gut; ctx.fillRect(left - 2, yy - 13, 4, 26);
    ctx.font = font(size, FONTS.term, 400); ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
    ctx.letterSpacing = '0px';
    let xx = left + 12;
    if (c.tag) { ctx.fillStyle = c.tagC; ctx.fillText(c.tag, xx, yy); xx += ctx.measureText(c.tag).width; }
    ctx.fillStyle = c.restC; ctx.fillText(c.rest, xx, yy);
  }
  // caret — smooth blink so it moves on every frame
  ctx.globalAlpha = 0.35 + 0.45 * (0.5 + 0.5 * Math.sin(t * 9.4));
  ctx.fillStyle = TOKENS.violetHot; ctx.fillRect(left + 12, bot - 8, 16, 5);
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
  const bwd2 = w - pad * 2 - 16, bx = x + w / 2 - bwd2 / 2, by = btnTop;
  const press = win(t, 18.98, 19.03, 19.12, 19.20) + win(t, 19.50, 19.55, 19.62, 19.70);
  const sc = 1 - 0.035 * clamp(press);
  const label = stopped ? 'START' : 'STOPP';
  // green stays a signal, never a surface: while stopped the chrome goes dark violet with a thin ok outline
  const col = stopped ? '#1C1630' : T().primary;
  const edge = stopped ? TOKENS.ok : rgba('#FFFFFF', 0.18);
  ctx.save();
  ctx.translate(x + w / 2, by + bh / 2); ctx.scale(sc, sc); ctx.translate(-(x + w / 2), -(by + bh / 2));
  ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha *= (stopped ? 0.16 : 0.35) + 0.3 * clamp(press);
  dot(ctx, x + w / 2, by + bh / 2, bwd2 * 0.55, stopped ? TOKENS.ok : col, 0.5); ctx.restore();
  ctx.fillStyle = stopped ? col : mixColor(col, '#000000', 0.12 + 0.18 * clamp(press));
  roundRect(ctx, bx, by, bwd2, bh, 15); ctx.fill();
  ctx.strokeStyle = edge; ctx.lineWidth = stopped ? 3 : 2; roundRect(ctx, bx + 1, by + 1, bwd2 - 2, bh - 2, 14); ctx.stroke();
  // power ring on the left of the button, the label stays centred and clear
  const gx = bx + 40, gy = by + bh / 2, gc = stopped ? TOKENS.ok : '#FFF4F4';
  ctx.strokeStyle = rgba(gc, 0.85); ctx.lineWidth = 3.4;
  ctx.beginPath(); ctx.arc(gx, gy, 15, -Math.PI * 0.36, Math.PI * 1.36); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(gx, gy - 21); ctx.lineTo(gx, gy - 5); ctx.stroke();
  drawText(ctx, label, x + w / 2 + 14, by + bh / 2 + 2,
    { size: 46, family: FONTS.body, weight: 800, color: stopped ? TOKENS.ok : '#FFF4F4', align: 'center', tracking: 2 });
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

/* finger tap indicator — the hand now comes in from the lower LEFT */
function s06_s07_finger(ctx, t, P, vBtn) {
  const taps = [{ a: 18.86, c: 19.00, up: 19.22 }, { a: 19.38, c: 19.52, up: 19.74 }];
  for (const tp of taps) {
    if (t < tp.a || t > tp.up + 0.16) continue;
    const app = E.outCubic(remap(t, tp.a, tp.c)), lift = remap(t, tp.up, tp.up + 0.16);
    const off = (1 - app) * 130 + lift * 155;
    // the contact point sits on the button's lower band (bh = 86), so neither the
    // fingertip disc nor its ring ever covers the STOPP / START label
    const pt = s06_s07_map(-off * 0.72 - 6, vBtn + 86 + off * 0.9, P);
    const a = clamp(app * app * 2.2) * (1 - lift);
    ctx.save(); ctx.globalAlpha *= a;
    radialFill(ctx, pt.x, pt.y, 52, [[0, 'rgba(255,255,255,0.22)'], [0.62, 'rgba(255,255,255,0.10)'], [1, 'rgba(255,255,255,0)']]);
    ctx.strokeStyle = 'rgba(255,255,255,0.85)'; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(pt.x, pt.y, 46, 0, TAU); ctx.stroke();
    ctx.restore();
    const r = remap(t, tp.c, tp.c + 0.34);
    if (r > 0 && r < 1) {
      ctx.save(); ctx.globalAlpha *= (1 - r) * 0.55;
      ctx.strokeStyle = '#FFFFFF'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(pt.x, pt.y, 44 + E.outCubic(r) * 92, 0, TAU); ctx.stroke();
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
    nightSky(ctx, t, { count: 60, seed: 128, color: '#CFC6E8', alpha: 0.2, hMul: 1, drift: true });
    s06_s07_dust(ctx, t, 0.4);
    // beat pulse behind the phone (18.0 / 18.5 / 19.0 / 19.5 / 20.0 …)
    const beat = pulse(t, 0.5, 6.5, 17.5);
    radialFill(ctx, s06_s07_PCX, s06_s07_PCY, 780,
      [[0, rgba(TOKENS.secondary, 0.15 + 0.05 * Math.sin((t - 17.5) * 2) + 0.09 * beat)], [0.6, rgba(TOKENS.deepViolet, 0.06 + 0.03 * beat)], [1, 'rgba(0,0,0,0)']], 'lighter');
    // the 17.5 braam: a violet impact ring so the cut lands on a hit, not on a hole
    const imp = 1 - remap(t, 17.50, 17.90);
    if (imp > 0.01) {
      radialFill(ctx, s06_s07_PCX, s06_s07_PCY, 900,
        [[0, rgba(TOKENS.violetHot, 0.30 * imp * imp)], [0.55, rgba(TOKENS.secondary, 0.12 * imp)], [1, 'rgba(0,0,0,0)']], 'lighter');
      shockwave(ctx, s06_s07_PCX, s06_s07_PCY, remap(t, 17.50, 17.92), { radius: 700, color: TOKENS.violetHot, width: 14, alpha: 0.55 });
      speedLines(ctx, t, { count: 22, seed: 41, color: TOKENS.secondary, speed: 1900, dir: -1, alpha: 0.26 * imp * imp });
    }

    lightSweep(ctx, ((t - 17.5) / 2) % 1, { angle: 0.5, width: 560, color: TOKENS.secondary, alpha: 0.075 });

    /* the phone: it rises into frame from below and settles held at an angle */
    const fly = ez(t, 17.50, 17.90, E.outExpo);
    const breath = 1 + 0.014 * Math.sin((t - 17.5) * 1.7);         // never stops moving
    const P = {
      cx: lerp(s06_s07_PCX - 46, s06_s07_PCX, fly) + 6 * Math.sin((t - 17.5) * 0.73),
      cy: lerp(s06_s07_PCY + 180, s06_s07_PCY, fly) + 10 * Math.sin((t - 17.5) * 1.35 + 0.6),
      k: lerp(0.84, 1, fly) * breath,
      yaw: lerp(0.62, 0.33, fly) + 0.05 * Math.sin((t - 17.5) * 1.05),
      roll: lerp(-0.29, -0.100, fly) + 0.018 * Math.sin((t - 17.5) * 0.66 + 1.3),
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
    const N = 34, OW = s06_s07_OW, OH = s06_s07_OH, DW = OW * P.k, DH = OH * P.k;
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
