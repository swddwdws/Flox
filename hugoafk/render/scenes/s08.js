/* s08.js
   s08  20.5–23.5  "Vom HugoSMP-Team erlaubt & empfohlen."
   Der Ruhemoment des Films (Drums raus). Ein Voxel-Siegel baut sich aus einzelnen Würfeln auf
   (violett, roter Rand), ein grüner Haken zeichnet sich pixelweise in die Mitte, ein weicher
   Pulsring geht einmal nach außen. Headline dreizeilig ruhig gestaffelt, Subline bei 22.2.
   Ab 22.8 zieht sich das Siegel zusammen und die Energie steigt wieder (Build für s09).
   Kein Shake, kein Glitch. Alles ist eine reine Funktion von t (nicht von lt — die Engine
   blendet 20.2–20.5 mit lt = 0 in diese Szene über). Alle Modulnamen sind s08_-präfixiert. */

/* ------------------------------------------------------------------ timing */
const s08_T = {
  start: 20.50, end: 23.50,
  build0: 20.25, build1: 20.90,   // Siegel setzt sich zusammen (beginnt schon in der Überblendung)
  ping: 20.90,                    // audio cue ping_ok -> Haken + Pulsring
  check1: 21.15,                  // Haken fertig (~0.25 s)
  l1: 20.80, l2: 21.20, l3: 21.60,
  sub: 22.20,
  riser: 22.80,                   // audio cue riser -> Siegel zieht sich zusammen
};

/* ------------------------------------------------------------------ helpers */
// shrink a line until it fits maxW (keeps the -0.04 em tracking of the style guide)
function s08_fit(ctx, str, o, maxW, trackF) {
  const tf = trackF == null ? -0.04 : trackF;
  let size = o.size;
  for (let k = 0; k < 60 && size > 40; k++) {
    if (measureText(ctx, str, Object.assign({}, o, { size: size, tracking: tf * size })) <= maxW) break;
    size -= 1;
  }
  return size;
}
// hex-safe colour mix — engine mixColor() returns 'rgb(...)', which cube()/shade() parse as black
function s08_mix(h1, h2, f) {
  const a = hexToRgb(h1), b = hexToRgb(h2);
  const h = v => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0');
  return '#' + h(lerp(a[0], b[0], f)) + h(lerp(a[1], b[1], f)) + h(lerp(a[2], b[2], f));
}
// one cube anchored at a screen point (the iso helpers are grid-based, we place in screen space)
function s08_blk(ctx, x, y, size, color, o) {
  return cube(ctx, 0, 0, 0, Object.assign({ size: size, cx: x, cy: y, color: color }, o || {}));
}

/* ------------------------------------------------------------------ the seal */
const s08_NC = 11, s08_NR = 13;        // mask grid
const s08_DX = 36, s08_DY = 32;        // cell pitch (px)
const s08_CUBE = 16;                   // cube edge -> block box 27.7 x 32 px, small gaps
const s08_CX = CX, s08_CY = 510;       // anchor centre (cube mass sits ~0.5*size lower)
const s08_VY = s08_CY + s08_CUBE * 0.5; // optical centre of the seal

// shield silhouette: flat top with rounded corners, straight flanks, tapering point
function s08_halfWidth(v) {
  if (v < -0.80) { const k = (v + 0.80) / 0.20; return 1 - 0.22 * k * k; }
  if (v <= 0.22) return 1;
  const k = (v - 0.22) / 0.78;
  return 1 - Math.pow(k, 1.7);
}
// cells: layer 0 = outer rim (red), 1 = inner rim (violet), 9 = hollow interior
const s08_CELLS = (() => {
  const IN = [];
  for (let r = 0; r < s08_NR; r++) {
    IN.push([]);
    for (let c = 0; c < s08_NC; c++) {
      const u = (c - (s08_NC - 1) / 2) / ((s08_NC - 1) / 2), v = (r - (s08_NR - 1) / 2) / ((s08_NR - 1) / 2);
      IN[r].push(Math.abs(u) <= s08_halfWidth(v) + 0.001);
    }
  }
  const inAt = (r, c) => r >= 0 && r < s08_NR && c >= 0 && c < s08_NC && IN[r][c];
  const L = [];
  for (let r = 0; r < s08_NR; r++) {
    L.push([]);
    for (let c = 0; c < s08_NC; c++) L[r].push(!IN[r][c] ? -1 : (!inAt(r - 1, c) || !inAt(r + 1, c) || !inAt(r, c - 1) || !inAt(r, c + 1)) ? 0 : 9);
  }
  for (let r = 0; r < s08_NR; r++) for (let c = 0; c < s08_NC; c++) {
    if (L[r][c] !== 9) continue;
    const near = [[r - 1, c], [r + 1, c], [r, c - 1], [r, c + 1], [r - 1, c - 1], [r - 1, c + 1], [r + 1, c - 1], [r + 1, c + 1]]
      .some(([a, b]) => a >= 0 && a < s08_NR && b >= 0 && b < s08_NC && L[a][b] === 0);
    if (near) L[r][c] = 1;
  }
  // -> block list in seal-local px
  const out = [], plate = [];
  for (let r = 0; r < s08_NR; r++) for (let c = 0; c < s08_NC; c++) {
    if (L[r][c] < 0) continue;
    const x = (c - (s08_NC - 1) / 2) * s08_DX, y = (r - (s08_NR - 1) / 2) * s08_DY;
    if (L[r][c] === 9) { plate.push({ x: x, y: y }); continue; }
    const d = Math.hypot(x, y * 0.9);
    out.push({ x: x, y: y, rim: L[r][c] === 0, d: d, r: r, c: c });
  }
  const dmax = Math.max.apply(null, out.map(b => b.d));
  out.forEach(b => {
    b.u = b.d / dmax;                                   // 0 = centre, 1 = outermost
    const n = Math.max(1e-3, Math.hypot(b.x, b.y));
    b.nx = b.x / n; b.ny = b.y / n;
    b.jit = hash2(b.r * 31 + 5, b.c * 17 + 3);          // per-block variation, deterministic
  });
  out.sort((a, b) => (a.r - b.r) || (a.c - b.c));       // painter order: top rows first
  return { blocks: out, plate: plate };
})();

/* ------------------------------------------------------------------ the check */
const s08_CHK_W = 14, s08_CHK_H = 10, s08_CHK_CELL = 14;
const s08_CHECK = (() => {
  const P = [[1.8, 5.4], [4.8, 8.4], [11.6, 1.4]];
  const seg = (px, py, ax, ay, bx, by) => {
    const dx = bx - ax, dy = by - ay, l = dx * dx + dy * dy;
    const tt = clamp(((px - ax) * dx + (py - ay) * dy) / l);
    return { t: tt, d: Math.hypot(px - (ax + dx * tt), py - (ay + dy * tt)) };
  };
  const l0 = Math.hypot(P[1][0] - P[0][0], P[1][1] - P[0][1]), l1 = Math.hypot(P[2][0] - P[1][0], P[2][1] - P[1][1]);
  const tot = l0 + l1, px = [];
  for (let r = 0; r < s08_CHK_H; r++) for (let c = 0; c < s08_CHK_W; c++) {
    const x = c + 0.5, y = r + 0.5;
    const a = seg(x, y, P[0][0], P[0][1], P[1][0], P[1][1]), b = seg(x, y, P[1][0], P[1][1], P[2][0], P[2][1]);
    const d = Math.min(a.d, b.d);
    if (d >= 1.45) continue;
    const s = (a.d <= b.d ? a.t * l0 : l0 + b.t * l1) / tot;
    px.push({ x: (c - (s08_CHK_W - 1) / 2) * s08_CHK_CELL, y: (r - (s08_CHK_H - 1) / 2) * s08_CHK_CELL, s: s });
  }
  return px;
})();
const s08_CHK_OY = -16, s08_CHK_OX = -10;   // the hollow sits slightly above the seal centre (shield tapers down)

/* ------------------------------------------------------------------ ambience */
const s08_dust = new Particles({
  seed: 808, count: 90, size: [2, 7], vel: { x: 5, y: -17 }, spread: 0.7,
  area: { x0: -90, y0: -90, x1: W + 90, y1: H + 90 }, color: TOKENS.violetHot, alpha: 0.5, drift: 28, twinkle: 1.1,
});
// slow drifting voxel dust (real cubes, low alpha)
const s08_MOTES = (() => {
  const r = rng(4242), o = [];
  for (let i = 0; i < 30; i++) o.push({
    x: 30 + r() * (W - 60), y: r() * H, s: 7 + r() * 15 * (i > 14 ? 1.25 : 0.8), v: 8 + r() * 18,
    a: 0.14 + r() * 0.22, ph: r() * TAU, col: r() < 0.26 ? TOKENS.primary : (r() < 0.4 ? TOKENS.violetHot : TOKENS.secondary),
  });
  return o;
})();
// rising energy streaks for the build (22.8+)
const s08_STREAKS = (() => {
  const r = rng(9081), o = [];
  for (let i = 0; i < 26; i++) o.push({ x: 20 + r() * (W - 40), sp: 620 + r() * 900, len: 90 + r() * 260, w: 1.5 + r() * 3, ph: r(), a: 0.25 + r() * 0.5 });
  return o;
})();

/* ------------------------------------------------------------------ draw parts */
function s08_background(ctx, t, energy) {
  // deep violet wash + soft glow behind the seal (breathes, brightens into the build)
  const breathe = 0.5 + 0.5 * Math.sin((t - 20.5) * 1.15);
  radialFill(ctx, CX, s08_VY - 40, 760,
    [[0, rgba(TOKENS.secondary, 0.17 + 0.04 * breathe + 0.14 * energy)],
     [0.38, rgba(TOKENS.deepViolet, 0.115 + 0.07 * energy)],
     [1, rgba(TOKENS.deepViolet, 0)]], 'lighter');
  radialFill(ctx, CX, 1780, 1180, [[0, rgba(TOKENS.secondary, 0.15 + 0.12 * energy)], [0.4, rgba(TOKENS.primary, 0.05 + 0.05 * energy)], [1, rgba(TOKENS.primary, 0)]], 'lighter');
  nightSky(ctx, t, { count: 64, seed: 33, color: '#CFC6E8', alpha: 0.22, hMul: 1, drift: true });
  s08_dust.draw(ctx, t + 1.8 * Math.pow(Math.max(0, t - s08_T.riser), 2), { alpha: 0.42 + 0.3 * energy, scale: 1.15 });
  // drifting voxel motes — faded out over the emblem so nothing crosses the seal or the check
  for (const m of s08_MOTES) {
    const y = ((m.y - (t - 18) * m.v * (1 + 2.2 * energy)) % (H + 120) + H + 120) % (H + 120) - 60;
    const x = m.x + Math.sin(t * 0.5 + m.ph) * 16;
    const clear = clamp((Math.hypot(x - s08_CX, (y - s08_VY) * 0.85) - 150) / 90);
    if (clear <= 0.01) continue;
    s08_blk(ctx, x, y, m.s, m.col, { alpha: m.a * clear * (0.7 + 0.3 * Math.sin(t * 0.9 + m.ph)) * (1 + 0.8 * energy) });
  }
}

function s08_seal(ctx, t, k, energy) {
  const A = { x: s08_CX, y: s08_CY + Math.sin((t - 20.5) * 0.85) * 4 * (1 - energy) };
  // dark plate behind the hollow so the green check stays crisp
  const pa = clamp((t - 20.30) / 0.45) * (0.66 - 0.22 * energy);
  if (pa > 0.01) {
    ctx.save(); ctx.globalAlpha *= pa; ctx.fillStyle = '#150A28';
    const w = s08_DX * k * 1.12, h = s08_DY * k * 1.12;
    ctx.beginPath();
    for (const p of s08_CELLS.plate) ctx.rect(A.x + p.x * k - w / 2, A.y + p.y * k - h / 2 + s08_CUBE * 0.5 * k, w, h);
    ctx.fill();
    ctx.restore();
  }
  // faint violet light inside the hollow before the check lands
  radialFill(ctx, A.x + s08_CHK_OX * k, A.y + s08_CHK_OY * k, 190 * k, [[0, rgba(TOKENS.secondary, 0.16 * clamp((t - 20.4) / 0.5))], [1, rgba(TOKENS.secondary, 0)]], 'lighter');
  // rim glow (one cheap radial, no per-cube blur)
  radialFill(ctx, A.x, s08_VY, 340 * k,
    [[0, rgba(TOKENS.secondary, 0.13 + 0.16 * energy)], [0.55, rgba(TOKENS.secondary, 0.09 + 0.12 * energy)], [1, rgba(TOKENS.secondary, 0)]], 'lighter');

  const spread = s08_T.build1 - 0.34 - s08_T.build0;   // stagger window

  // hologram scaffold: the empty seal outline is already there while the blocks fly in,
  // so the 20.2–20.5 crossfade blends into a readable shape instead of an empty glow
  const ghost = clamp((t - 20.14) / 0.16);
  if (ghost > 0 && t < s08_T.build1 + 0.05) {
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.lineWidth = 2.1;
    ctx.beginPath();
    for (const b of s08_CELLS.blocks) {
      const t0 = s08_T.build0 + spread * (0.15 + 0.85 * b.u) + b.jit * 0.05;
      const p = clamp((t - t0) / 0.34);
      if (p > 0.55) continue;
      const gx = A.x + b.x * k, gy = A.y + b.y * k, gw = s08_CUBE * 0.866 * k, gh = s08_CUBE * 0.5 * k;
      ctx.moveTo(gx, gy - gh); ctx.lineTo(gx + gw, gy); ctx.lineTo(gx, gy + gh); ctx.lineTo(gx - gw, gy); ctx.closePath();
    }
    ctx.strokeStyle = rgba(TOKENS.violetHot, 0.72 * ghost);
    ctx.stroke();
    ctx.restore();
  }

  for (const b of s08_CELLS.blocks) {
    const t0 = s08_T.build0 + spread * (0.15 + 0.85 * b.u) + b.jit * 0.05;
    const p = clamp((t - t0) / 0.34);
    if (p <= 0) continue;
    const e = E.outExpo(p);
    const off = (1 - e) * (46 + 0.30 * b.d);
    const x = A.x + (b.x + b.nx * off) * k;
    const y = A.y + (b.y + b.ny * off) * k - (1 - e) * 40;
    const sz = s08_CUBE * k * lerp(0.42, 1, e);
    const col = b.rim ? TOKENS.primary : TOKENS.secondary;
    // a soft travelling shimmer over the rim keeps the calm frame alive
    const sh = b.rim ? 0.08 + 0.30 * Math.pow(Math.max(0, Math.sin((t - 20.6) * 1.9 - b.c * 0.34 - b.r * 0.22)), 2) : 0.06 * Math.max(0, Math.sin((t - 20.6) * 1.9 - b.c * 0.34 - b.r * 0.22));
    s08_blk(ctx, x, y, sz, sh > 0 ? s08_mix(col, '#FFFFFF', sh) : col, {
      alpha: clamp(p * 2.4),
      outline: b.rim ? '#FF8A6B' : TOKENS.violetHot,
      outlineAlpha: (b.rim ? 0.5 : 0.38) * e,
      outlineWidth: 1.5,
      topF: (b.rim ? 1.16 : 1.34) + 0.3 * energy, leftF: b.rim ? 0.76 : 0.82, rightF: b.rim ? 0.48 : 0.55,
    });
  }
}

function s08_check(ctx, t, k, energy) {
  const p = clamp((t - s08_T.ping) / (s08_T.check1 - s08_T.ping));
  if (p <= 0) return;
  const cx = s08_CX + s08_CHK_OX * k, cy = s08_CY + Math.sin((t - 20.5) * 0.85) * 4 * (1 - energy) + s08_CHK_OY * k;
  // green halo (grows with the reveal, small ping flash on the beat)
  const halo = 0.16 * p + 0.20 * impulse(t, s08_T.ping + 0.12, 6) + 0.10 * energy;
  radialFill(ctx, cx, cy, 250 * k, [[0, rgba(TOKENS.ok, halo)], [0.5, rgba(TOKENS.ok, halo * 0.35)], [1, rgba(TOKENS.ok, 0)]], 'lighter');
  ctx.save();
  for (const q of s08_CHECK) {
    const ta = s08_T.ping + (s08_T.check1 - s08_T.ping) * q.s * 0.94;
    const e = clamp((t - ta) / 0.085);
    if (e <= 0) continue;
    const ee = E.outCubic(e);
    const c = s08_CHK_CELL * k * lerp(1.75, 1.0, ee);
    ctx.globalAlpha = clamp(e * 2.6);
    ctx.fillStyle = e < 1 ? s08_mix(TOKENS.ok, '#FFFFFF', 0.55 * (1 - ee)) : TOKENS.ok;
    ctx.fillRect(cx + q.x * k - c / 2, cy + q.y * k - c / 2, Math.ceil(c) + 0.5, Math.ceil(c) + 0.5);
  }
  ctx.restore();
}

function s08_riser(ctx, t, energy) {
  if (energy <= 0.001) return;
  const lt = t - s08_T.riser;
  ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.lineCap = 'round';
  for (const s of s08_STREAKS) {
    const span = H + 500;
    const y = H + 160 - (((s.ph * span + lt * s.sp * (0.35 + energy)) % span) + span) % span;
    const len = s.len * (0.5 + energy);
    ctx.globalAlpha = s.a * energy * 0.55;
    ctx.strokeStyle = s.ph < 0.22 ? TOKENS.primary : TOKENS.violetHot;
    ctx.lineWidth = s.w;
    ctx.beginPath(); ctx.moveTo(s.x, y); ctx.lineTo(s.x, y + len); ctx.stroke();
  }
  ctx.restore();
}

/* ------------------------------------------------------------------ scene */
SCENES.s08 = {
  draw(ctx, lt, t, dur, sc) {
    // NOTE: never use lt — during the 20.2–20.5 crossfade the engine calls us with lt = 0.
    const energy = E.inCubic(clamp((t - s08_T.riser) / (s08_T.end - s08_T.riser)));   // build-up 22.8 -> 23.5
    const kBreath = 1 + 0.012 * Math.sin((t - 20.9) * 1.7);
    const k = kBreath * (1 - 0.34 * E.inOutCubic(clamp((t - s08_T.riser) / 0.70)));    // seal contracts from 22.8

    FX.bloom = Math.max(FX.bloom, 0.20 + 0.16 * energy);
    FX.bloomBlur = 30;

    // ---- world layer (own camera push-in; text stays untouched so it can't leave the safe area)
    withCamera(ctx, { zoom: 1 + 0.055 * energy, y: -18 * energy, ox: CX, oy: s08_VY }, c => {
      s08_background(c, t, energy);
      s08_seal(c, t, k, energy);
      // one soft pulse ring on the ok-ping
      shockwave(c, s08_CX, s08_VY, remap(t, s08_T.ping + 0.05, s08_T.ping + 0.95), { radius: 620, color: TOKENS.violetHot, width: 12, alpha: 0.42, blur: 6 });
      s08_check(c, t, k, energy);
      // the seal collapses into a bright core as the build starts
      if (energy > 0.001) radialFill(c, s08_CX, s08_VY, lerp(120, 330, energy), [[0, rgba(TOKENS.violetHot, 0.30 * energy)], [0.35, rgba(TOKENS.secondary, 0.16 * energy)], [1, rgba(TOKENS.secondary, 0)]], 'lighter');
      s08_riser(c, t, energy);
    });

    // ---- headline: three calm lines, 'erlaubt' in the ok green
    const hBase = { family: FONTS.body, weight: 800, align: 'center', baseline: 'middle' };
    const L = [
      { s: 'Vom HugoSMP-Team', y: 780, at: s08_T.l1, col: T().text },
      { s: 'erlaubt', y: 890, at: s08_T.l2, col: TOKENS.ok },
      { s: '& empfohlen.', y: 1000, at: s08_T.l3, col: T().text },
    ];
    // one common size for the block: the longest line has to stay inside the TikTok safe area
    const hSize = Math.min.apply(null, L.map(ln => s08_fit(ctx, ln.s, Object.assign({}, hBase, { size: 96 }), 704)));
    for (const ln of L) {
      const p = clamp((t - ln.at) / 0.48);
      if (p <= 0) continue;
      const size = hSize;
      const o = Object.assign({}, hBase, {
        size: size, tracking: -0.04 * size, color: ln.col,
        stagger: 0.5, ease: E.outExpo, rise: size * 0.34, blurIn: 7,
      });
      if (ln.col === TOKENS.ok) o.glow = { color: TOKENS.ok, blur: 22 + 14 * energy };
      const y = ln.y - 10 * energy;
      drawKinetic(ctx, ln.s, CX, y, o, p, 'rise');
    }

    // ---- subline
    const ps = clamp((t - s08_T.sub) / 0.50);
    if (ps > 0) {
      const so = { family: FONTS.head, weight: 500, align: 'center', baseline: 'middle', size: 48 };
      so.size = s08_fit(ctx, 'Kein Cheat. Nur AFK.', so, 760, 0.02);
      so.tracking = 0.02 * so.size;
      so.color = rgba(T().text, 0.85);
      so.stagger = 0.45; so.ease = E.outExpo; so.rise = so.size * 0.5;
      // a short hairline draws out from the centre just before the line
      const ph = clamp((t - (s08_T.sub - 0.10)) / 0.45);
      if (ph > 0) {
        ctx.save(); ctx.globalAlpha = 0.55 * clamp(ph * 2);
        hairline(ctx, CX, 1078, CX + 120, 1078, ph, { color: rgba(TOKENS.violetHot, 0.9), glowColor: TOKENS.secondary, width: 2 });
        hairline(ctx, CX, 1078, CX - 120, 1078, ph, { color: rgba(TOKENS.violetHot, 0.9), glowColor: TOKENS.secondary, width: 2 });
        ctx.restore();
      }
      drawKinetic(ctx, 'Kein Cheat. Nur AFK.', CX, 1140 - 8 * energy, so, ps, 'rise');
    }
  },
};
