/* s08.js
   s08  20.5–23.5  "Vom HugoSMP-Team erlaubt & empfohlen."
   Der Ruhemoment des Films (Drums raus). Ein Voxel-Schild baut sich aus einzelnen Würfeln auf
   (violett, roter Rand), ein grüner Haken zeichnet sich pixelweise in die Mitte, weiche
   Pulsringe gehen nach außen. Headline vierzeilig ruhig gestaffelt (96 px), Subline bei 22.2.
   Ab 22.8 zieht sich das Siegel zusammen und die Energie steigt wieder (Build für s09).
   Ruhe heißt NICHT Stillstand: ein Glanz wandert permanent um den Rand, Funken lösen sich,
   die Kamera fährt langsam hinein, auf 22.0 und 22.5 sitzt je ein sichtbarer Beat.
   Kein Shake, kein Glitch. Alles ist eine reine Funktion von t (nicht von lt). */

/* ------------------------------------------------------------------ timing */
const s08_T = {
  start: 20.50, end: 23.50,
  build0: 20.50, build1: 20.95,   // Siegel setzt sich auf dem Schnitt zusammen
  ping: 20.90,                    // audio cue ping_ok -> Haken + Pulsring
  check1: 21.15,                  // Haken fertig (~0.25 s)
  l1: 20.80, l2: 21.00, l3: 21.20, l4: 21.60,
  ring2: 22.00,                   // zweiter weicher Pulsring (Beat)
  sub: 22.20,
  chase: 22.50,                   // Glanz-Chase + Funkenschauer (Beat)
  riser: 22.80,                   // audio cue riser -> Siegel zieht sich zusammen
};

/* ------------------------------------------------------------------ helpers */
// shrink a single line only if it would leave the TikTok safe area (defensive; 96 px is the floor)
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
// shortest signed angle difference
function s08_dAng(a, b) { let d = (a - b) % TAU; if (d > Math.PI) d -= TAU; if (d < -Math.PI) d += TAU; return d; }

/* ------------------------------------------------------------------ the seal */
// explicit shield silhouette: rounded flat top, straight flanks, clean 5-step taper to a 3-cube tip
const s08_ROWW = [9, 11, 11, 11, 11, 11, 11, 11, 9, 7, 5, 3];
const s08_NC = 11, s08_NR = s08_ROWW.length;
const s08_DX = 34, s08_DY = 30;        // cell pitch (px)
const s08_CUBE = 15;                   // cube edge -> block box 26 x 30 px
// the whole composition sits 22 px left of CX: the TikTok safe area (x 90..900) is not centred
// on CX, so this keeps ~30 px between the widest headline line and the right rail.
const s08_CX = CX - 22, s08_CY = 488;  // anchor centre (cube mass sits ~0.5*size lower)
const s08_VY = s08_CY + s08_CUBE * 0.5; // optical centre of the seal

// cells: layer 0 = outer rim (red), 1 = inner rim (violet), 9 = hollow interior
const s08_CELLS = (() => {
  const IN = [];
  for (let r = 0; r < s08_NR; r++) {
    IN.push([]);
    const half = (s08_ROWW[r] - 1) / 2;
    for (let c = 0; c < s08_NC; c++) IN[r].push(Math.abs(c - (s08_NC - 1) / 2) <= half + 0.001);
  }
  const inAt = (r, c) => r >= 0 && r < s08_NR && c >= 0 && c < s08_NC && IN[r][c];
  const L = [];
  for (let r = 0; r < s08_NR; r++) {
    L.push([]);
    for (let c = 0; c < s08_NC; c++) L[r].push(!IN[r][c] ? -1 : (!inAt(r - 1, c) || !inAt(r + 1, c) || !inAt(r, c - 1) || !inAt(r, c + 1)) ? 0 : 9);
  }
  // the outer silhouette must be ONE unbroken red ring: first/last cell of every row and column is layer 0
  for (let r = 0; r < s08_NR; r++) {
    let a = -1, b = -1;
    for (let c = 0; c < s08_NC; c++) if (IN[r][c]) { if (a < 0) a = c; b = c; }
    if (a >= 0) { L[r][a] = 0; L[r][b] = 0; }
  }
  for (let c = 0; c < s08_NC; c++) {
    let a = -1, b = -1;
    for (let r = 0; r < s08_NR; r++) if (IN[r][c]) { if (a < 0) a = r; b = r; }
    if (a >= 0) { L[a][c] = 0; L[b][c] = 0; }
  }
  // one violet ring just inside the red one
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
    b.th = Math.atan2(b.y, b.x);                        // angle for the travelling sheen
    b.jit = hash2(b.r * 31 + 5, b.c * 17 + 3);          // per-block variation, deterministic
  });
  out.sort((a, b) => (a.r - b.r) || (a.c - b.c));       // painter order: top rows first
  return { blocks: out, plate: plate, rim: out.filter(b => b.rim) };
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
const s08_CHK_OY = -42, s08_CHK_OX = -3;   // the hollow sits above the seal centre (shield tapers down)

/* ------------------------------------------------------------------ ambience */
const s08_dust = new Particles({
  seed: 808, count: 110, size: [2, 7], vel: { x: 7, y: -26 }, spread: 0.7,
  area: { x0: -90, y0: -90, x1: W + 90, y1: H + 90 }, color: TOKENS.violetHot, alpha: 0.5, drift: 34, twinkle: 1.4,
});
// slow drifting voxel dust (real cubes, low alpha)
const s08_MOTES = (() => {
  const r = rng(4242), o = [];
  for (let i = 0; i < 34; i++) o.push({
    x: 30 + r() * (W - 60), y: r() * H, s: 7 + r() * 15 * (i > 14 ? 1.25 : 0.8), v: 16 + r() * 30,
    a: 0.14 + r() * 0.22, ph: r() * TAU, col: r() < 0.26 ? TOKENS.primary : (r() < 0.4 ? TOKENS.violetHot : TOKENS.secondary),
  });
  return o;
})();
// small voxel sparks that keep detaching from the rim (constant micro-motion in the calm beat)
const s08_SPARKS = (() => {
  const r = rng(1717), o = [];
  for (let i = 0; i < 22; i++) o.push({
    ph: r(), per: 0.72 + r() * 0.55, bi: Math.floor(r() * 997),
    vx: (r() - 0.5) * 130, vy: -52 - r() * 100, s: 6 + r() * 7, sw: r() * TAU,
  });
  return o;
})();
// rising energy streaks for the build (22.8+)
const s08_STREAKS = (() => {
  const r = rng(9081), o = [];
  for (let i = 0; i < 26; i++) o.push({ x: 20 + r() * (W - 40), sp: 620 + r() * 900, len: 90 + r() * 260, w: 1.5 + r() * 3, ph: r(), a: 0.25 + r() * 0.5 });
  return o;
})();

/* the sheen angle: a highlight arc that never stops travelling around the rim.
   Two on-beat "chases" (22.0 / 22.5) briefly speed it up so the calm section has hits. */
function s08_sweep(t) {
  const b = t - 20.5;
  return -(b * 2.30
    + 2.5 * E.outCubic(clamp((t - s08_T.ring2) / 0.55))
    + 3.1 * E.outCubic(clamp((t - s08_T.chase) / 0.45))
    + 5.0 * E.outCubic(clamp((t - s08_T.riser) / 0.60)));
}
// two hologram scan bands travelling down the seal (seal-local y) — the calm beat still has to move
function s08_scanY(t) {
  const per = 1.15, u = (((t - 20.62) % per) + per) % per / per;
  return [-215 + u * 430, -215 + ((u + 0.5) % 1) * 430];
}

/* ------------------------------------------------------------------ draw parts */
function s08_background(ctx, t, energy) {
  // deep violet wash + soft glow behind the seal (breathes, brightens a little into the build)
  const breathe = 0.5 + 0.5 * Math.sin((t - 20.5) * 1.15);
  radialFill(ctx, s08_CX, s08_VY - 40, 760,
    [[0, rgba(TOKENS.secondary, 0.17 + 0.05 * breathe + 0.06 * energy)],
     [0.38, rgba(TOKENS.deepViolet, 0.115 + 0.04 * energy)],
     [1, rgba(TOKENS.deepViolet, 0)]], 'lighter');
  radialFill(ctx, s08_CX, 1780, 1180, [[0, rgba(TOKENS.secondary, 0.15 + 0.07 * energy)], [0.4, rgba(TOKENS.primary, 0.05 + 0.03 * energy)], [1, rgba(TOKENS.primary, 0)]], 'lighter');
  nightSky(ctx, t, { count: 64, seed: 33, color: '#CFC6E8', alpha: 0.22, hMul: 1, drift: true });
  s08_dust.draw(ctx, t + 1.8 * Math.pow(Math.max(0, t - s08_T.riser), 2), { alpha: 0.42 + 0.3 * energy, scale: 1.15 });
  // drifting voxel motes — faded out over the emblem so nothing crosses the seal or the check
  for (const m of s08_MOTES) {
    const y = ((m.y - (t - 18) * m.v * (1 + 2.2 * energy)) % (H + 120) + H + 120) % (H + 120) - 60;
    const x = m.x + Math.sin(t * 0.62 + m.ph) * 26;
    const clear = clamp((Math.hypot(x - s08_CX, (y - s08_VY) * 0.85) - 150) / 90);
    if (clear <= 0.01) continue;
    s08_blk(ctx, x, y, m.s, m.col, { alpha: m.a * clear * (0.62 + 0.38 * Math.sin(t * 1.35 + m.ph)) * (1 + 0.8 * energy) });
  }
}

function s08_seal(ctx, t, k, energy, bob) {
  const A = { x: s08_CX, y: s08_CY + bob };
  // dark plate behind the hollow so the green check stays crisp
  const pa = clamp((t - 20.52) / 0.45) * (0.72 - 0.10 * energy);
  if (pa > 0.01) {
    ctx.save(); ctx.globalAlpha *= pa; ctx.fillStyle = '#150A28';
    const w = s08_DX * k * 1.14, h = s08_DY * k * 1.14;
    ctx.beginPath();
    for (const p of s08_CELLS.plate) ctx.rect(A.x + p.x * k - w / 2, A.y + p.y * k - h / 2 + s08_CUBE * 0.5 * k, w, h);
    ctx.fill();
    ctx.restore();
  }
  // faint violet light inside the hollow before the check lands
  radialFill(ctx, A.x + s08_CHK_OX * k, A.y + s08_CHK_OY * k, 190 * k, [[0, rgba(TOKENS.secondary, 0.16 * clamp((t - 20.5) / 0.5))], [1, rgba(TOKENS.secondary, 0)]], 'lighter');
  // rim glow (one cheap radial, no per-cube blur)
  radialFill(ctx, A.x, s08_VY, 340 * k,
    [[0, rgba(TOKENS.secondary, 0.13 + 0.10 * energy)], [0.55, rgba(TOKENS.secondary, 0.09 + 0.08 * energy)], [1, rgba(TOKENS.secondary, 0)]], 'lighter');

  const spread = s08_T.build1 - 0.34 - s08_T.build0;   // stagger window

  // hologram scaffold: the empty seal outline is already there on the cut, so the first frame
  // of the scene reads as a shape that then materialises block by block
  const ghost = clamp((t - 20.34) / 0.16);
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
    ctx.strokeStyle = rgba(TOKENS.violetHot, 0.95 * ghost);
    ctx.stroke();
    ctx.restore();
  }

  const sw = s08_sweep(t), scanY = s08_scanY(t);
  for (const b of s08_CELLS.blocks) {
    const t0 = s08_T.build0 + spread * (0.15 + 0.85 * b.u) + b.jit * 0.05;
    const p = clamp((t - t0) / 0.34);
    if (p <= 0) continue;
    const e = E.outExpo(p);
    const off = (1 - e) * (46 + 0.30 * b.d);
    const x = A.x + (b.x + b.nx * off) * k;
    const y = A.y + (b.y + b.ny * off) * k - (1 - e) * 40;
    const sz = s08_CUBE * k * lerp(0.42, 1, e);
    // travelling highlight arc + a counter-rotating glint + a scan band
    // (brightness only — the hue stays HUGO red / AFK violet)
    const d = s08_dAng(b.th, sw + (b.rim ? 0 : 0.55));
    const d2 = s08_dAng(b.th, -sw * 0.58 + 2.1);
    const hl = Math.exp(-(d * d) / (b.rim ? 0.17 : 0.30)) + 0.45 * Math.exp(-(d2 * d2) / 0.10);
    const sc = Math.max(Math.exp(-Math.pow((b.y - scanY[0]) / 30, 2)), 0.82 * Math.exp(-Math.pow((b.y - scanY[1]) / 30, 2)));
    const wave = 0.5 + 0.5 * Math.sin((t - 20.6) * 2.1 - b.r * 0.42 + b.c * 0.18);
    const bf = 0.70 + 0.50 * Math.min(hl, 1.2) + 0.44 * sc + 0.12 * wave;   // 0.70 .. 1.66
    const col = b.rim ? TOKENS.primary : TOKENS.secondary;
    s08_blk(ctx, x, y, sz, hl > 0.35 ? s08_mix(col, '#FFFFFF', (b.rim ? 0.13 : 0.15) * clamp((hl - 0.35) / 0.65)) : col, {
      alpha: clamp(p * 2.4),
      outline: b.rim ? s08_mix(TOKENS.primary, '#FFFFFF', 0.22) : TOKENS.violetHot,
      outlineAlpha: (b.rim ? 0.5 : 0.38) * e * (0.72 + 0.40 * Math.min(hl, 1) + 0.35 * sc),
      outlineWidth: 1.5,
      topF: (b.rim ? 1.16 : 1.34) * bf, leftF: (b.rim ? 0.78 : 0.84) * bf, rightF: (b.rim ? 0.50 : 0.57) * bf,
    });
  }
}

// sparks detaching from the rim — keeps the calm frame alive between the typo beats
function s08_sparks(ctx, t, k, energy, bob) {
  const rim = s08_CELLS.rim, n = rim.length;
  const boost = 1 + 2.2 * E.outCubic(clamp((t - s08_T.chase) / 0.30)) * (1 - clamp((t - s08_T.chase) / 1.1)) + 2.6 * energy;
  for (const s of s08_SPARKS) {
    const per = s.per / (0.9 + 0.5 * energy);
    const life = ((t - 20.75) / per + s.ph) % 1;
    if (life < 0 || life > 1) continue;
    const b = rim[s.bi % n];
    const born = t - life * per;
    if (born < s08_T.build1 - 0.15) continue;
    const bx = s08_CX + b.x * k, by = s08_CY + bob + b.y * k;
    const x = bx + (s.vx + b.nx * 70) * life * per * boost * 0.8;
    const y = by + (s.vy * (0.6 + 0.8 * energy) + b.ny * 40) * life * per * boost * 0.8;
    const a = (1 - life) * (1 - life) * (0.72 + 0.30 * energy);
    if (a < 0.02) continue;
    s08_blk(ctx, x, y, s.s * k * (1.05 - 0.45 * life), s.sw > Math.PI ? TOKENS.violetHot : TOKENS.primary, {
      alpha: a, topF: 1.5, leftF: 0.95, rightF: 0.65,
    });
  }
}

function s08_check(ctx, t, k, energy, bob) {
  const p = clamp((t - s08_T.ping) / (s08_T.check1 - s08_T.ping));
  if (p <= 0) return;
  const cx = s08_CX + s08_CHK_OX * k, cy = s08_CY + bob + s08_CHK_OY * k;
  // green halo — pulses on the two calm beats so the centre never sits still
  const halo = 0.15 * p + 0.20 * impulse(t, s08_T.ping + 0.12, 6)
    + 0.09 * impulse(t, s08_T.ring2, 7) + 0.10 * impulse(t, s08_T.chase, 7)
    + 0.03 * Math.sin((t - 20.9) * 2.4) + 0.05 * energy;
  radialFill(ctx, cx, cy, 250 * k, [[0, rgba(TOKENS.ok, Math.max(0, halo))], [0.5, rgba(TOKENS.ok, Math.max(0, halo) * 0.35)], [1, rgba(TOKENS.ok, 0)]], 'lighter');
  ctx.save();
  const glint = ((t - 20.9) * 0.62) % 1.6 - 0.3;   // travelling highlight along the stroke
  for (const q of s08_CHECK) {
    const ta = s08_T.ping + (s08_T.check1 - s08_T.ping) * q.s * 0.94;
    const e = clamp((t - ta) / 0.085);
    if (e <= 0) continue;
    const ee = E.outCubic(e);
    const c = s08_CHK_CELL * k * lerp(1.75, 1.0, ee);
    const g = Math.exp(-Math.pow((q.s - glint) / 0.17, 2));    // 0..1 sheen along the path
    ctx.globalAlpha = clamp(e * 2.6);
    // solid #4ADE80 base so the "verified" green survives the bloom of the build
    ctx.fillStyle = e < 1 ? s08_mix(TOKENS.ok, '#FFFFFF', 0.55 * (1 - ee))
      : (g > 0.04 ? s08_mix(TOKENS.ok, '#D8FFE6', 0.55 * g) : TOKENS.ok);
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
    const y = H + 160 - (((s.ph * span + lt * s.sp * (0.55 + energy)) % span) + span) % span;
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
    // NOTE: never use lt — the engine may call us with lt = 0 during a dissolve.
    const rp = clamp((t - s08_T.riser) / (s08_T.end - s08_T.riser));
    // the riser has to ANSWER on the cue: half of the curve is out-cubic (instant), half accelerates
    const energy = 0.5 * E.outCubic(rp) + 0.5 * rp * rp;
    const camT = t - 20.5;
    const bob = Math.sin(camT * 0.85) * 9 * (1 - energy) + Math.sin(camT * 1.9 + 1.1) * 3.5 * (1 - energy);
    const kBreath = 1 + 0.022 * Math.sin((t - 20.9) * 1.55);
    const k = kBreath * (1 - 0.34 * E.outCubic(clamp((t - s08_T.riser) / 0.62)));   // contracts from 22.8

    FX.bloom = Math.max(FX.bloom, 0.20 + 0.06 * Math.min(energy, 0.8));
    FX.bloomBlur = 30;

    // ---- world layer (slow dolly + drift; text stays untouched so it can't leave the safe area)
    const cam = {
      zoom: 1 + 0.016 * clamp(camT / 2.3) + 0.013 * Math.sin(camT * 0.72) + 0.060 * energy,
      x: Math.sin(camT * 1.35) * 12,
      y: Math.cos(camT * 1.05) * 9 - 20 * energy,
      ox: s08_CX, oy: s08_VY,
    };
    withCamera(ctx, cam, c => {
      s08_background(c, t, energy);
      s08_seal(c, t, k, energy, bob);
      // pulse rings: on the cut, on the ok-ping, on the 22.0 beat and on the riser
      shockwave(c, s08_CX, s08_VY, remap(t, 20.50, 21.10), { radius: 430, color: TOKENS.secondary, width: 10, alpha: 0.40, blur: 8 });
      shockwave(c, s08_CX, s08_VY, remap(t, s08_T.ping + 0.05, s08_T.ping + 0.95), { radius: 620, color: TOKENS.violetHot, width: 12, alpha: 0.42, blur: 6 });
      shockwave(c, s08_CX, s08_VY, remap(t, s08_T.ring2, s08_T.ring2 + 1.05), { radius: 480, color: TOKENS.secondary, width: 9, alpha: 0.30, blur: 8 });
      shockwave(c, s08_CX, s08_VY, remap(t, s08_T.riser, s08_T.riser + 0.55), { radius: 700, color: TOKENS.primary, width: 14, alpha: 0.34, blur: 6 });
      s08_sparks(c, t, k, energy, bob);
      // the seal collapses into a ring of light — hollow in the middle so the green check stays green
      if (energy > 0.001) {
        // a RING of light around the contracting shield, dark in the middle: the red rim and the
        // violet inner ring keep their own colours and the green check does not blow out
        radialFill(c, s08_CX, s08_VY, lerp(190, 380, energy),
          [[0, rgba(TOKENS.violetHot, 0.012 * energy)], [0.40, rgba(TOKENS.violetHot, 0.030 * energy)],
           [0.66, rgba(TOKENS.violetHot, 0.14 * energy)], [1, rgba(TOKENS.secondary, 0)]], 'lighter');
      }
      s08_check(c, t, k, energy, bob);
      s08_riser(c, t, energy);
    });

    // ---- headline: four calm lines at the full 96 px, 'erlaubt' in the ok green
    const hBase = { family: FONTS.body, weight: 800, align: 'center', baseline: 'middle' };
    const L = [
      { s: 'Vom', y: 772, at: s08_T.l1, col: T().text },
      { s: 'HugoSMP-Team', y: 876, at: s08_T.l2, col: T().text },
      { s: 'erlaubt', y: 980, at: s08_T.l3, col: TOKENS.ok },
      { s: '& empfohlen.', y: 1084, at: s08_T.l4, col: T().text },
    ];
    // 96 px per the brief; each line is sized on its own (never the whole block down to the longest
    // line) and the budget keeps ~30 px to the TikTok right rail even with the ±8 px RGB split at 23.5
    for (const ln of L) {
      const p = clamp((t - ln.at) / 0.48);
      if (p <= 0) continue;
      // 96 px is the floor — s08_fit only guards against a copy change that would overflow
      const size = Math.max(96, s08_fit(ctx, ln.s, Object.assign({}, hBase, { size: 96 }), 700));
      const o = Object.assign({}, hBase, {
        size: size, tracking: -0.04 * size, color: ln.col,
        stagger: 0.5, ease: E.outExpo, rise: size * 0.34, blurIn: 7,
      });
      if (ln.col === TOKENS.ok) o.glow = { color: TOKENS.ok, blur: 22 + 10 * energy };
      const y = ln.y - 12 * energy;
      drawKinetic(ctx, ln.s, s08_CX, y, o, p, 'rise');
    }

    // ---- subline
    const ps = clamp((t - s08_T.sub) / 0.50);
    if (ps > 0) {
      const so = { family: FONTS.head, weight: 500, align: 'center', baseline: 'middle', size: 48 };
      so.size = s08_fit(ctx, 'Kein Cheat. Nur AFK.', so, 700, 0.02);
      so.tracking = 0.02 * so.size;
      so.color = rgba(T().text, 0.85);
      so.stagger = 0.45; so.ease = E.outExpo; so.rise = so.size * 0.5;
      // a short hairline draws out from the centre just before the line
      const ph = clamp((t - (s08_T.sub - 0.10)) / 0.45);
      if (ph > 0) {
        ctx.save(); ctx.globalAlpha = 0.55 * clamp(ph * 2);
        hairline(ctx, s08_CX, 1160, s08_CX + 120, 1160, ph, { color: rgba(TOKENS.violetHot, 0.9), glowColor: TOKENS.secondary, width: 2 });
        hairline(ctx, s08_CX, 1160, s08_CX - 120, 1160, ph, { color: rgba(TOKENS.violetHot, 0.9), glowColor: TOKENS.secondary, width: 2 });
        ctx.restore();
      }
      drawKinetic(ctx, 'Kein Cheat. Nur AFK.', s08_CX, 1218 - 10 * energy, so, ps, 'rise');
    }
  },
};
