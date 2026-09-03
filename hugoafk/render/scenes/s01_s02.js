// s01_s02.js — s01 "Hook: PC aus" (0.0–3.0) + s02 "Logo-Reveal" (3.0–6.0)
// Everything is a pure function of t. All module level names are prefixed s01_s02_.

/* ------------------------------------------------------------ world data */
const s01_s02_ISO  = { size: 96, cx: CX, cy: 1560 };   // isometric farm anchor
const s01_s02_R    = 4;                                 // farm half size (blocks)
const s01_s02_ROWS = [-3, -1, 1, 3];                    // pumpkin rows
const s01_s02_BOTP = { ix: -1, iy: 1, iz: 1 };          // where the bot stands

const s01_s02_PAL = {   // night-dimmed Minecraft palette (inside the voxel world only)
  dirt:    { color: '#1C1209', top: '#221609', left: '#170E06', right: '#0F0904' },
  grass:   { color: '#1B4015', top: '#204D18', left: '#1E1408', right: '#130C04',
             outline: '#08110A', outlineAlpha: 0.5, outlineWidth: 1.5 },
  soil:    { color: '#2A1D11', top: '#332211', right: '#150D06', left: '#211608',
             outline: '#0A0704', outlineAlpha: 0.5, outlineWidth: 1.5 },
  pumpkin: { color: '#6E3A08', top: '#8A4A0B', left: '#552C05', right: '#351A02',
             outline: '#1A0C01', outlineAlpha: 0.9, outlineWidth: 2 },
};
// violet re-paint of SPRITES.pumpkin — every palette key of the icon must be covered
const s01_s02_PUMPPAL_V = {
  O: '#A855F7', l: '#D7A6FF', o: '#7C3AED', k: '#2B1247',   // body / highlight / shadow / outline
  G: '#C77DFF', g: '#6D28D9',                               // stem
};

const s01_s02_CELLS = (() => {
  const out = [], R = s01_s02_R;
  for (let ix = -R; ix <= R; ix++) for (let iy = -R; iy <= R; iy++) {
    out.push({ ix, iy, iz: -1, kind: 'dirt' });
    out.push({ ix, iy, iz: 0, kind: s01_s02_ROWS.indexOf(iy) >= 0 ? 'soil' : 'grass' });
  }
  for (const iy of s01_s02_ROWS) for (let ix = -R; ix <= R; ix++) {
    if (((ix + (iy < 0 ? 1 : 0)) % 2 + 2) % 2 !== 0) continue;               // every other block, staggered
    if (ix === s01_s02_BOTP.ix && iy === s01_s02_BOTP.iy) continue;          // keep the bot's tile free
    out.push({ ix, iy, iz: 1, kind: 'pumpkin' });
  }
  return out;
})();
const s01_s02_PUMPKINS = s01_s02_CELLS.filter(c => c.kind === 'pumpkin');
// front rows only — used once the copy is up so the pops stay in the lower third
const s01_s02_PUMPKINS_FRONT = s01_s02_PUMPKINS.filter(c => c.ix + c.iy >= 0);
const s01_s02_TORCHES  = [{ ix: -4, iy: -2 }, { ix: 2, iy: 4 }, { ix: 4, iy: -4 }, { ix: -2, iy: -4 }];

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

/* ------------------------------------------------------------- the world */
function s01_s02_worldCubes(ctx, t, wire, revealP, iso) {
  const violet = T().secondary, hot = TOKENS.violetHot, R = s01_s02_R, cells = [];
  for (const c of s01_s02_CELLS) {
    if (wire) {
      const ord = (c.ix + R + c.iy + R) / (4 * R);
      const a = clamp((revealP - ord * 0.5) / 0.5);
      if (a <= 0.02) continue;
      const pl = 0.5 + 0.5 * Math.sin(t * 2.4 + c.ix * 0.8 + c.iy * 0.55);
      const pk = c.kind === 'pumpkin';
      cells.push({
        ix: c.ix, iy: c.iy, iz: c.iz, alpha: a,
        color: '#0B0816', top: '#120C24', left: '#080612', right: '#06040D',
        outline: pk ? hot : violet,
        outlineAlpha: (pk ? 0.9 : 0.4) * a * (0.65 + 0.35 * pl),
        outlineWidth: pk ? 2.4 : 1.5,
      });
    } else {
      cells.push(Object.assign({ ix: c.ix, iy: c.iy, iz: c.iz }, s01_s02_PAL[c.kind]));
    }
  }
  cubeField(ctx, cells, iso || s01_s02_ISO);
}

// blocky player/bot figure standing on the farm (~1.8 blocks tall)
function s01_s02_bot(ctx, t, wire, alpha) {
  const base = isoPos(s01_s02_BOTP.ix, s01_s02_BOTP.iy, s01_s02_BOTP.iz, s01_s02_ISO);
  const u = s01_s02_ISO.size * 0.46;
  const bob = Math.sin(t * 3.2) * u * 0.07;
  const sw = Math.sin(t * 6.4);
  const col = T().secondary, hot = TOKENS.violetHot;
  const parts = [
    [0.5, -0.5, 1, 1, col], [-0.5, 0.5, 1, 1, col],                       // legs
    [0.5, -0.5, 2, 1, col], [-0.5, 0.5, 2, 1, col],                       // hips
    [0.5, -0.5, 3, 1, hot], [-0.5, 0.5, 3, 1, hot],                       // chest
    [1.05, -1.05, 3 + sw * 0.22, 0.9, col], [-1.05, 1.05, 3 - sw * 0.22, 0.9, col], // arms
    [0, 0, 4.05, 1.22, hot],                                              // head
  ];
  ctx.save(); ctx.globalAlpha *= alpha;
  dot(ctx, base.x, base.y - u * 2.2 + bob, u * 4.2, col, wire ? 0.34 : 0.26);
  for (const [lx, ly, lz, sc, c] of parts) {
    const p = isoPos(lx, ly, lz, { size: u, cx: base.x, cy: base.y + bob });
    cube(ctx, 0, 0, 0, {
      size: u * sc, cx: p.x, cy: p.y, color: c,
      topF: wire ? 1.5 : 1.35, leftF: wire ? 0.95 : 0.85, rightF: wire ? 0.66 : 0.58,
      outline: hot, outlineAlpha: wire ? 0.9 : 0.5, outlineWidth: 2,
    });
  }
  ctx.restore();
}

// items popping out of the pumpkins every 16th note.
// cullY (scene-local y): once the copy is up, keep the pops under the text — items
// spawn only from the front rows and fade out before they reach the headline block.
function s01_s02_items(ctx, t, wire, alpha, cullY) {
  const t0 = 0.12, step = 0.25, k1 = Math.floor((t - t0) / step);
  const src = cullY ? s01_s02_PUMPKINS_FRONT : s01_s02_PUMPKINS;
  for (let k = Math.max(0, k1 - 3); k <= k1; k++) {
    const st = t0 + k * step, life = (t - st) / 0.9;
    if (life <= 0 || life >= 1) continue;
    const cell = src[Math.floor(hash1(k * 13 + 5) * src.length)];
    const p = isoPos(cell.ix, cell.iy, 2.05, s01_s02_ISO);
    const e = E.outCubic(life);
    const x = p.x + (hash2(k, 3) - 0.5) * 54, y = p.y - 14 - e * 120;
    let a = clamp((1 - life) * 1.5) * (life < 0.12 ? life / 0.12 : 1) * alpha;
    if (cullY) a *= clamp((y - cullY) / 130);
    if (a <= 0.01) continue;
    dot(ctx, x, y, 50, wire ? TOKENS.violetHot : '#FFB25A', a * 0.40);
    pixelSprite(ctx, x, y, 4.4, SPRITES.pumpkin.rows, wire ? s01_s02_PUMPPAL_V : SPRITES.pumpkin.pal,
      { alpha: a, rotate: (hash2(k, 9) - 0.5) * 0.7 });
  }
}

/* ------------------------------------------------------------ s01 pieces */
const s01_s02_CHAT = [
  { t: -0.45, s: '<Nico> so, ich mach den pc aus', c: '#FFFFFF' },   // already typing at f0 → cover frame carries the hook
  { t: 0.28, s: '<Mira> und deine kürbisfarm?', c: '#FFFFFF' },
  { t: 0.50, s: '<Nico> läuft weiter :)', c: '#FFFFFF' },
  { t: 0.68, s: '[HugoAFK] Bot bleibt online.', c: TOKENS.violetHot },
];
function s01_s02_chat(ctx, t) {
  const lines = [];
  for (const l of s01_s02_CHAT) {
    if (t < l.t) break;
    const n = Math.min(l.s.length, Math.floor((t - l.t) * 62));
    if (n <= 0) continue;
    lines.push({ t: l.s.slice(0, n), c: l.c, a: 1 });
  }
  if (!lines.length) return;
  mcChat(ctx, 112, 330, lines, { size: 40, lineHeight: 54, pad: 14, bgColor: 'rgba(0,0,0,0.5)' });
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
      linearFill(x, 0, 0, 0, H * 0.72,
        [[0, 'rgba(30,18,58,0.95)'], [0.45, 'rgba(16,10,32,0.6)'], [1, 'rgba(8,6,14,0)']],
        [0, 0, W, H * 0.72]);
      nightSky(x, t, { count: 130, seed: 21, alpha: 0.6, hMul: 0.58, drift: true });
      // square minecraft moon
      dot(x, 806, 372, 165, '#9FB4F0', 0.14);
      x.save(); x.globalAlpha = 0.62; x.fillStyle = '#CFD9F5'; x.fillRect(772, 338, 68, 68); x.restore();

      const cam = { zoom: 1.02 + 0.05 * remap(t, 0, 1.0), y: -16 * remap(t, 0, 1.0), ox: CX, oy: 1400 };
      withCamera(x, cam, c => {
        // distant land mass (depth) — dark, hazy
        const far = [], farCol = { color: '#0C0A16', top: '#100E1C', left: '#090711', right: '#07050D' };
        for (let ix = -5; ix <= 5; ix++) for (let iy = -5; iy <= 5; iy++) {
          far.push(Object.assign({ ix, iy, iz: 0 }, farCol));
          const h = hash2(ix + 9, iy + 9);
          if (h > 0.86) { far.push(Object.assign({ ix, iy, iz: 1 }, farCol)); if (h > 0.95) far.push(Object.assign({ ix, iy, iz: 2 }, farCol)); }
        }
        cubeField(c, far, { size: 38, cx: CX - 60, cy: 1130 });
        s01_s02_worldCubes(c, t, false, 1);
        for (const tp of s01_s02_TORCHES) {
          const p = isoPos(tp.ix, tp.iy, 1, s01_s02_ISO);
          const fl = 0.72 + 0.28 * Math.sin(t * 9 + tp.ix * 2.1);
          cube(c, 0, 0, 0, { size: 22, cx: p.x, cy: p.y - 20, color: '#6B4A22' });
          cube(c, 0, 0, 0, { size: 15, cx: p.x, cy: p.y - 42, color: '#FFB347', topF: 1.5, leftF: 1.2, rightF: 1.0 });
          dot(c, p.x, p.y - 46, 120, '#FF9A3C', 0.30 * fl);
        }
        s01_s02_bot(c, t, false, 1);
        s01_s02_items(c, t, false, 1);
      });
      s01_s02_chat(x, t);

      // red power button pulse just before the shutdown
      const pw = win(t, 0.86, 0.94, 0.99, 1.02, E.outBack, E.outQuad);
      if (pw > 0.01) s01_s02_power(x, CX, 960, 78 * (0.85 + 0.15 * pw), pw, 0.6 + 0.4 * Math.sin(t * 40));

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

    nightSky(ctx, t, { count: 60, seed: 21, alpha: 0.22 * remap(t, 1.6, 2.4), hMul: 0.58, drift: true });

    const revealP = ez(t, 1.38, 2.1, E.outCubic);
    const botA = ez(t, 1.30, 1.56, E.outCubic) * (0.82 + 0.18 * Math.sin(t * 7));
    // continuous camera: a slow creep out of the reveal, then the push into the cut —
    // no frame between 1.3 and 3.0 sits still.
    const creep = remap(t, 1.26, 3.0), push = ez(t, 2.30, 3.0, E.inQuad);
    const zoom = 1 + 0.075 * creep + 0.125 * push;
    withCamera(ctx, { zoom, x: 10 * Math.sin((t - 1.3) * 1.4), y: -13 * creep - 16 * push, ox: CX, oy: 1500 }, c => {
      // ground glow so the wireframe does not float in nothing
      radialFill(c, CX, 1520, 700, [[0, rgba(TOKENS.deepViolet, 0.34 * revealP)], [1, 'rgba(0,0,0,0)']], 'lighter');
      s01_s02_worldCubes(c, t, true, revealP);
      s01_s02_bot(c, t, true, botA);
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
  const sx = lerp(-L.w * 0.5, L.w * 1.5, pos);
  const g = x.createLinearGradient(sx - 150, 0, sx + 150, L.h);
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
  seed: 913, count: 80, size: [2, 7], vel: { x: 10, y: -30 },
  area: { x0: -80, y0: -80, x1: W + 80, y1: H + 80 },
  color: '#C77DFF', alpha: 0.45, drift: 44, twinkle: 1.2,
});
const s01_s02_kick = t => t < 3.46 ? 0 : pulse(t, 0.5, 7, 3.5);

// voxel motes rising behind the lockup — the farm's particles carried into the logo
// beat, and the thing that keeps the picture moving between the kicks
const s01_s02_MOTES = (() => {
  const r = rng(2609), out = [];
  for (let i = 0; i < 44; i++) out.push({
    x: 40 + r() * (W - 80), sz: 9 + r() * 20, sp: 62 + r() * 110, ph: r() * 2400,
    sway: 14 + r() * 30, swf: 0.5 + r() * 0.9,
    col: r() < 0.72 ? '#A855F7' : '#C77DFF', a: 0.16 + r() * 0.22,
  });
  return out;
})();
function s01_s02_motes(ctx, t, alpha) {
  if (alpha <= 0.01) return;
  const span = H + 320;
  for (const m of s01_s02_MOTES) {
    const y = H + 160 - (((t * m.sp + m.ph) % span) + span) % span;
    const x = m.x + Math.sin(t * m.swf + m.ph) * m.sway;
    cube(ctx, 0, 0, 0, {
      size: m.sz, cx: x, cy: y, color: m.col, alpha: m.a * alpha,
      topF: 1.35, leftF: 0.8, rightF: 0.52,
    });
  }
}

function s01_s02_grid(ctx, t) {
  const p = ez(t, 4.6, 5.8, E.outCubic);
  if (p <= 0) return;
  const cell = 78, cols = 15, rows = 17, x0 = s01_s02_SCX - cols * cell / 2, y0 = 300;
  ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.lineWidth = 1.4;
  for (let i = 0; i < cols; i++) for (let j = 0; j < rows; j++) {
    const cx = x0 + i * cell + cell / 2, cy = y0 + j * cell + cell / 2;
    const d = Math.hypot(cx - s01_s02_SCX, (cy - s01_s02_LOCKY) * 0.8) / 900;
    const a = clamp((p - d * 0.75) / 0.35);
    if (a <= 0.02) continue;
    const tw = 0.45 + 0.55 * Math.sin(t * 2.6 + i * 0.7 + j * 0.9);
    ctx.strokeStyle = rgba(T().secondary, 0.21 * a * (0.5 + 0.5 * tw));
    ctx.strokeRect(x0 + i * cell + 6, y0 + j * cell + 6, cell - 12, cell - 12);
    if (hash2(i, j) > 0.9) {
      ctx.fillStyle = rgba(TOKENS.violetHot, 0.13 * a * tw);
      ctx.fillRect(x0 + i * cell + 6, y0 + j * cell + 6, cell - 12, cell - 12);
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
    const bgp = 0.16 + 0.07 * k;
    radialFill(ctx, SCX, s01_s02_LOCKY, 900,
      [[0, rgba(TOKENS.deepViolet, bgp)], [0.55, rgba(TOKENS.deepViolet, bgp * 0.35)], [1, 'rgba(0,0,0,0)']], 'lighter');
    radialFill(ctx, SCX, s01_s02_LOCKY - 190, 620,
      [[0, rgba(T().primary, 0.10 + 0.06 * k)], [1, 'rgba(0,0,0,0)']], 'lighter');
    nightSky(ctx, t, { count: 70, seed: 21, alpha: 0.22, hMul: 0.6, drift: true });

    // background camera: a constant slow drift from the impact on, then the push of the
    // last bar — the backdrop is never still between the kicks
    const bdrift = remap(t, 3.2, 4.6), bpush = ez(t, 4.6, 6.0, E.inOutCubic);
    withCamera(ctx, { zoom: 1 + 0.022 * bdrift + 0.05 * bpush, x: 7 * Math.sin((t - 3.2) * 0.85), y: -5 * bdrift - 10 * bpush }, c => {
      s01_s02_grid(c, t);
      s01_s02_motes(c, t, 0.9 * remap(t, 3.16, 3.7));
      // the farm from s01 keeps running behind the logo — violet wireframe horizon
      const fp = ez(t, 4.45, 5.8, E.outCubic);
      if (fp > 0.01) {
        c.save(); c.globalAlpha *= 0.58 * fp;
        radialFill(c, CX, 1920, 760, [[0, rgba(TOKENS.deepViolet, 0.34)], [1, 'rgba(0,0,0,0)']], 'lighter');
        s01_s02_worldCubes(c, t, true, fp, { size: 82, cx: CX, cy: 2075 });
        c.restore();
      }
    });
    s01_s02_dust.draw(ctx, t, { alpha: 0.30 + 0.20 * k, scale: 1 });

    /* -------- shockwave rings */
    const swl = remap(t, HIT, HIT + 0.55);
    if (swl > 0 && swl < 1) {
      shockwave(ctx, SCX, s01_s02_LOCKY, swl, { radius: 1150, color: T().primary, width: 20, alpha: 0.85 });
      shockwave(ctx, SCX, s01_s02_LOCKY, remap(t, HIT + 0.05, HIT + 0.7), { radius: 1300, color: T().secondary, width: 12, alpha: 0.7 });
    }

    /* -------- logo lockup */
    const eH = ez(t, 3.0, HIT, E.outQuint), eA = ez(t, 3.0, HIT, E.outQuint);
    const bnc = t >= HIT ? Math.exp(-13 * (t - HIT)) * Math.sin((t - HIT) * 40) * 11 : 0;
    const dyH = -(1 - eH) * 1000 - bnc;
    const dyA = (1 - eA) * 1000 + bnc;
    const breathe = t > 3.3 ? 0.010 * (1 - Math.cos((t - 3.3) * TAU / 1.6)) : 0;
    const sc = 1 + breathe + 0.028 * k + 0.05 * Math.exp(-16 * Math.max(0, t - HIT)) + 0.03 * ez(t, 5.75, 6.0, E.inQuad);
    const hy = L.y + dyH, ay = L.y + L.M.afk.offsetY * L.s + dyA;

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
    // motion trail while the halves travel
    if (t < HIT) {
      ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.16;
      for (let i = 1; i <= 5; i++) {
        const f = i / 5 * 190;
        ctx.drawImage(IMG.logoHugo, L.x, hy - f, L.M.hugo.w * L.s, L.M.hugo.h * L.s);
        ctx.drawImage(IMG.logoAfk, L.x, ay + f, L.M.afk.w * L.s, L.M.afk.h * L.s);
      }
      ctx.restore();
    }
    ctx.drawImage(IMG.logoHugo, L.x, hy, L.M.hugo.w * L.s, L.M.hugo.h * L.s);
    ctx.drawImage(IMG.logoAfk, L.x, ay, L.M.afk.w * L.s, L.M.afk.h * L.s);

    // one specular sweep across the lockup
    const shp = remap(t, 4.85, 5.45);
    if (shp > 0 && shp < 1) s01_s02_shine(ctx, L, shp, 0.55 * Math.sin(shp * Math.PI));
    ctx.restore();

    /* -------- voxel shard burst (in front) */
    if (t >= HIT && t < HIT + 1.2) {
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      for (let i = 0; i < s01_s02_BURST.length; i++) {
        const b = s01_s02_BURST[i], p = (t - HIT) / b.life;
        if (p >= 1) continue;
        const e = E.outQuint(p), r = b.r0 + b.sp * e;
        const x = SCX + Math.cos(b.ang) * r;
        const y = s01_s02_LOCKY + Math.sin(b.ang) * r * 0.82 - b.rise * 120 * e + 820 * p * p;
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
