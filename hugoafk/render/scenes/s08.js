/* s08.js
   s08  20.5–23.5  "Vom HugoSMP-Team erlaubt & empfohlen."
   Der Ruhemoment des Films (Drums raus) — NEU INSZENIERT.

   Staging (v2): das Siegel steht nicht mehr flach und frontal oben in der Mitte, sondern tief
   und rechts der Textspalte, in die Tiefe gedreht (Drei-Viertel-Ansicht mit sichtbarer
   Materialstärke: eine zweite, dunklere Blocklage hinter dem Rand). Typo unverändert: Headline
   und Subline stehen zentriert auf ihrer Originalachse und ihren Original-y-Werten.
   Aufbau: das Schild WÄCHST von der Spitze nach oben aus einem Lichtpool (Blöcke steigen von
   unten in ihre Position), statt von außen radial zusammenzufliegen.
   Ringe: keine weichen Kreis-Shockwaves mehr, sondern Voxel-Ringe IN der Schildebene — der
   erste sammelt sich auf dem Schnitt nach innen ein (Energie kommt herein), die späteren laufen
   nach außen. Funken lösen sich vom Rand auf die Kamera zu (werden größer statt zu steigen).
   Haken: landet als ZWEI Striche — der kurze Strich fährt von links oben herein, der lange von
   rechts oben, sie rasten unten im Knick ein (Lock-Blitz + Funken).
   Ab 22.8 dreht sich das Siegel frontal, tritt zurück, die Energie steigt (Build für s09).
   Ruhe heißt NICHT Stillstand: ein Lichtband wandert permanent über die Schildebene, Funken
   lösen sich, die Kamera fährt langsam hinein, auf 22.0 und 22.5 sitzt je ein sichtbarer Beat.

   TIMING UNVERÄNDERT (das Audio ist darauf geschnitten): 20.50 Aufbau, 20.90 Ping/Haken beginnt,
   21.15 Haken fertig, Headline 20.80 / 21.00 / 21.20 / 21.60, 22.00 Beat, 22.20 Subline,
   22.50 Beat, 22.80 Riser. Kein Shake, kein Glitch. Alles ist eine reine Funktion von t. */

/* ------------------------------------------------------------------ timing */
const s08_T = {
  start: 20.50, end: 23.50,
  build0: 20.50, build1: 20.95,   // Siegel setzt sich auf dem Schnitt zusammen
  ping: 20.90,                    // audio cue ping_ok -> Haken + Puls
  check1: 21.15,                  // Haken fertig (~0.25 s)
  l1: 20.80, l2: 21.00, l3: 21.20, l4: 21.60,
  ring2: 22.00,                   // zweiter Puls (Beat)
  sub: 22.20,
  chase: 22.50,                   // Lichtband-Chase + Funkenschauer (Beat)
  riser: 22.80,                   // audio cue riser -> Siegel dreht frontal, Energie steigt
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

/* ------------------------------------------------------------------ the stage
   The seal now lives in its own plane, turned away from the camera (yaw) and seen slightly
   from above (tilt). Everything that belongs to the seal — blocks, plate, check, rings,
   sparks — is placed in plane coordinates (u right, v down, w towards the camera) and pushed
   through the same projection, so the whole emblem reads as ONE solid object standing in space. */
const s08_AX = 652, s08_AY = 455;    // the seal stands above the type, right of the axis
const s08_TX = CX - 22;              // the type column keeps the original centred axis
const s08_F = 980;                   // focal length of the three-quarter view
const s08_TILT = 0.17;               // we look slightly down onto it
const s08_DEPTH = 30;                // material thickness of the shield (plane units)

function s08_yaw(t) {
  const base = 0.56 - 0.11 * clamp((t - 20.5) / 2.3);            // it keeps turning very slowly
  const breathe = 0.024 * Math.sin((t - 20.5) * 0.62);
  const front = E.outCubic(clamp((t - s08_T.riser) / 0.62));     // squares up into the build
  return (base + breathe) * (1 - 0.62 * front);
}
function s08_state(t, k, dy) {
  const th = s08_yaw(t);
  return { ct: Math.cos(th), st: Math.sin(th), cp: Math.cos(s08_TILT), sp: Math.sin(s08_TILT), k: k * 1.10, dy: dy };
}
// plane -> screen. Returns the screen point of the block's TOP FACE centre plus its depth scale.
function s08_prj(u, v, w, S) {
  const a = u * S.k, b = v * S.k, c = w * S.k;
  const x1 = a * S.ct + c * S.st;
  const z1 = -a * S.st + c * S.ct;
  const y2 = b * S.cp - z1 * S.sp;
  const z2 = b * S.sp + z1 * S.cp;
  const s = s08_F / (s08_F - z2);
  return { x: s08_AX + x1 * s, y: s08_AY + S.dy + y2 * s, s: s, z: z2 };
}

/* ------------------------------------------------------------------ the seal */
// explicit shield silhouette: rounded flat top, straight flanks, clean 5-step taper to a 3-cube tip
const s08_ROWW = [9, 11, 11, 11, 11, 11, 11, 11, 9, 7, 5, 3];
const s08_NC = 11, s08_NR = s08_ROWW.length;
const s08_DX = 34, s08_DY = 30;        // cell pitch (plane units)
const s08_CUBE = 15;                   // cube edge -> block box 26 x 30 px

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
  // -> block list in seal-plane units
  const out = [], plate = [];
  for (let r = 0; r < s08_NR; r++) for (let c = 0; c < s08_NC; c++) {
    if (L[r][c] < 0) continue;
    const u = (c - (s08_NC - 1) / 2) * s08_DX, v = (r - (s08_NR - 1) / 2) * s08_DY;
    if (L[r][c] === 9) { plate.push({ u: u, v: v }); continue; }
    out.push({ u: u, v: v, rim: L[r][c] === 0, d: Math.hypot(u, v * 0.9), r: r, c: c });
  }
  out.forEach(b => {
    const n = Math.max(1e-3, Math.hypot(b.u, b.v));
    b.nu = b.u / n; b.nv = b.v / n;
    b.jit = hash2(b.r * 31 + 5, b.c * 17 + 3);          // per-block variation, deterministic
    // BUILD ORDER (new): the shield grows out of the light pool from its tip upwards, and
    // inside every row from the middle outwards — never radially from outside in.
    const rowPart = (s08_NR - 1 - b.r) / (s08_NR - 1);
    const colPart = Math.abs(b.c - (s08_NC - 1) / 2) / ((s08_NC - 1) / 2);
    b.bo = clamp(0.80 * rowPart + 0.17 * colPart + 0.03 * b.jit);
  });
  return { blocks: out, plate: plate, rim: out.filter(b => b.rim) };
})();
const s08_SPREAD = 0.25, s08_RISE = 0.20;        // last block starts 20.75, lands on 20.95 = build1
const s08_BLOCK_T0 = b => s08_T.build0 + s08_SPREAD * b.bo;

/* ------------------------------------------------------------------ the check */
const s08_CHK_W = 14, s08_CHK_H = 10, s08_CHK_CELL = 14;
const s08_CHK_P = [[1.8, 5.4], [4.8, 8.4], [11.6, 1.4]];      // free end · junction · free end
const s08_CHECK = (() => {
  const P = s08_CHK_P;
  const seg = (px, py, ax, ay, bx, by) => {
    const dx = bx - ax, dy = by - ay, l = dx * dx + dy * dy;
    const tt = clamp(((px - ax) * dx + (py - ay) * dy) / l);
    return { t: tt, d: Math.hypot(px - (ax + dx * tt), py - (ay + dy * tt)) };
  };
  const l0 = Math.hypot(P[1][0] - P[0][0], P[1][1] - P[0][1]), l1 = Math.hypot(P[2][0] - P[1][0], P[2][1] - P[1][1]);
  const tot = l0 + l1, sA = l0 / tot, px = [];
  for (let r = 0; r < s08_CHK_H; r++) for (let c = 0; c < s08_CHK_W; c++) {
    const x = c + 0.5, y = r + 0.5;
    const a = seg(x, y, P[0][0], P[0][1], P[1][0], P[1][1]), b = seg(x, y, P[1][0], P[1][1], P[2][0], P[2][1]);
    const d = Math.min(a.d, b.d);
    if (d >= 1.45) continue;
    const s = (a.d <= b.d ? a.t * l0 : l0 + b.t * l1) / tot;
    px.push({ u: (c - (s08_CHK_W - 1) / 2) * s08_CHK_CELL, v: (r - (s08_CHK_H - 1) / 2) * s08_CHK_CELL, s: s, arm: s <= sA ? 0 : 1 });
  }
  return px;
})();
const s08_CHK_OU = -3, s08_CHK_OV = -42, s08_CHK_OW = 9;   // the hollow sits above the seal centre
// each arm slides in along its own axis, from beyond its free end, and locks in the knee
const s08_ARM = [
  { dir: [-0.7071, -0.7071], t0: s08_T.ping, t1: s08_T.check1 - 0.05, dist: 132 },  // short stroke, from upper left
  { dir: [0.6970, -0.7171], t0: s08_T.ping + 0.055, t1: s08_T.check1, dist: 168 },  // long stroke, from upper right
];
const s08_KNEE = { u: (s08_CHK_P[1][0] - 7) * s08_CHK_CELL + s08_CHK_OU, v: (s08_CHK_P[1][1] - 5) * s08_CHK_CELL + s08_CHK_OV };
// small voxel burst out of the knee when the two strokes lock
const s08_LOCK = (() => {
  const r = rng(5150), o = [];
  for (let i = 0; i < 9; i++) { const a = r() * TAU; o.push({ du: Math.cos(a) * (90 + r() * 130), dv: Math.sin(a) * (70 + r() * 110) - 30, dw: 40 + r() * 130, s: 5 + r() * 5 }); }
  return o;
})();

/* ------------------------------------------------------------------ ambience */
const s08_dust = new Particles({
  seed: 808, count: 110, size: [2, 7], vel: { x: -12, y: 17 }, spread: 0.7,
  area: { x0: -90, y0: -90, x1: W + 90, y1: H + 90 }, color: TOKENS.violetHot, alpha: 0.5, drift: 30, twinkle: 1.4,
});
// slow drifting voxel dust (real cubes, low alpha) — now sinking instead of rising
const s08_MOTES = (() => {
  const r = rng(4242), o = [];
  for (let i = 0; i < 34; i++) o.push({
    x: 30 + r() * (W - 60), y: r() * H, s: 7 + r() * 15 * (i > 14 ? 1.25 : 0.8), v: 12 + r() * 24,
    a: 0.14 + r() * 0.22, ph: r() * TAU, col: r() < 0.26 ? TOKENS.primary : (r() < 0.4 ? TOKENS.violetHot : TOKENS.secondary),
  });
  return o;
})();
// voxel flakes that keep detaching from the rim TOWARDS the camera (constant micro-motion)
const s08_SPARKS = (() => {
  const r = rng(2411), o = [];
  for (let i = 0; i < 21; i++) o.push({
    ph: r(), per: 0.82 + r() * 0.62, bi: Math.floor(r() * 997),
    du: (r() - 0.5) * 110, dv: 14 + r() * 74, dw: 130 + r() * 200,
    s: 6 + r() * 6, red: r() < 0.45,
  });
  return o;
})();
// rising energy streaks for the build (22.8+)
const s08_STREAKS = (() => {
  const r = rng(9081), o = [];
  for (let i = 0; i < 24; i++) o.push({ x: 20 + r() * (W - 40), sp: 620 + r() * 900, len: 90 + r() * 260, w: 1.5 + r() * 3, ph: r(), a: 0.25 + r() * 0.5 });
  return o;
})();
// voxel pulse rings, all in the seal's own plane. The first one COLLECTS inwards on the cut.
const s08_RINGSPEC = [
  // starts before the cut so the very first frame of the scene already carries the incoming energy
  { at: 20.30, dur: 0.65, r0: 620, r1: 40, n: 28, size: 16, col: TOKENS.violetHot, inward: true, spin: 0.5 },
  { at: s08_T.ping + 0.02, dur: 0.90, r0: 66, r1: 470, n: 24, size: 11, col: TOKENS.violetHot, spin: -0.32 },
  { at: s08_T.ring2, dur: 1.10, r0: 58, r1: 396, n: 16, size: 10, col: TOKENS.secondary, spin: 0.26 },
  { at: s08_T.chase, dur: 0.80, r0: 58, r1: 288, n: 12, size: 9, col: TOKENS.secondary, spin: -0.4 },
  { at: s08_T.riser, dur: 0.72, r0: 78, r1: 620, n: 26, size: 12, col: TOKENS.primary, spin: 0.6 },
];

/* the light band: a soft bar of light that never stops travelling across the shield plane.
   Two on-beat "chases" (22.0 / 22.5) briefly speed it up so the calm section has hits. */
function s08_sweepU(t) {
  const p = (t - 20.40) * 0.40
    + 0.30 * E.outCubic(clamp((t - s08_T.ring2) / 0.50))
    + 0.34 * E.outCubic(clamp((t - s08_T.chase) / 0.42))
    + 0.58 * E.outCubic(clamp((t - s08_T.riser) / 0.60));
  return -360 + (((p % 1) + 1) % 1) * 720;
}
// counter-travelling thin glint
function s08_sweepU2(t) {
  const p = -(t - 20.55) * 0.27 - 0.30 * E.outCubic(clamp((t - s08_T.chase) / 0.5));
  return -360 + (((p % 1) + 1) % 1) * 720;
}
// the diagonal coordinate the light band runs along
const s08_bandC = (u, v) => u + 0.55 * v;

/* ------------------------------------------------------------------ draw parts */
function s08_background(ctx, t, energy) {
  const breathe = 0.5 + 0.5 * Math.sin((t - 20.5) * 1.10);
  // main glow now sits low and right, behind the seal
  radialFill(ctx, s08_AX, s08_AY + 30, 640,
    [[0, rgba(TOKENS.secondary, 0.18 + 0.05 * breathe + 0.06 * energy)],
     [0.40, rgba(TOKENS.deepViolet, 0.11 + 0.04 * energy)],
     [1, rgba(TOKENS.deepViolet, 0)]], 'lighter');
  // a cool pool down in the type column so the bottom of the frame carries weight too
  radialFill(ctx, 402, 1120, 780,
    [[0, rgba(TOKENS.deepViolet, 0.115 + 0.035 * energy)], [0.5, rgba(TOKENS.deepViolet, 0.05)], [1, rgba(TOKENS.deepViolet, 0)]], 'lighter');
  // red bounce from the lower right corner
  radialFill(ctx, 830, 1810, 940, [[0, rgba(TOKENS.primary, 0.075 + 0.035 * energy)], [0.45, rgba(TOKENS.primary, 0.03)], [1, rgba(TOKENS.primary, 0)]], 'lighter');
  nightSky(ctx, t, { count: 64, seed: 33, color: '#CFC6E8', alpha: 0.22, hMul: 1, drift: true });
  s08_dust.draw(ctx, t + 1.8 * Math.pow(Math.max(0, t - s08_T.riser), 2), { alpha: 0.40 + 0.3 * energy, scale: 1.15 });
  // sinking voxel motes — faded out over the emblem so nothing crosses the seal or the check
  for (const m of s08_MOTES) {
    const y = ((m.y + (t - 18) * m.v * (1 + 2.4 * energy)) % (H + 120) + H + 120) % (H + 120) - 60;
    const x = m.x + Math.sin(t * 0.62 + m.ph) * 26;
    const clear = clamp((Math.hypot(x - s08_AX, (y - s08_AY) * 0.85) - 165) / 90);
    if (clear <= 0.01) continue;
    s08_blk(ctx, x, y, m.s, m.col, { alpha: m.a * clear * (0.62 + 0.38 * Math.sin(t * 1.35 + m.ph)) * (1 + 0.8 * energy) });
  }
}

// the pool of light the shield grows out of (20.5–21.0) and the ground-glow it keeps standing in
function s08_pool(ctx, t, S, energy) {
  const born = clamp((t - 20.32) / 0.26), gone = 1 - clamp((t - 21.0) / 0.75) * 0.72;
  const p = s08_prj(0, 190, 0, S);
  const a = (0.40 * born * gone + 0.10 * energy);
  if (a <= 0.005) return;
  ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.translate(p.x, p.y + 26); ctx.scale(1, 0.30);
  radialFill(ctx, 0, 0, 300 * S.k * p.s, [[0, rgba(TOKENS.violetHot, a)], [0.45, rgba(TOKENS.secondary, a * 0.45)], [1, rgba(TOKENS.secondary, 0)]]);
  ctx.restore();
}

// voxel pulse rings travelling in the shield plane
function s08_ringsDraw(ctx, t, S) {
  for (const R of s08_RINGSPEC) {
    const life = (t - R.at) / R.dur;
    if (life <= 0 || life >= 1) continue;
    const e = R.inward ? E.inOutCubic(life) : E.outCubic(life);
    const rad = lerp(R.r0, R.r1, e);
    const a = R.inward ? clamp(life * 4.5) * (1 - clamp((life - 0.55) / 0.45)) : (1 - life) * (1 - life) * 1.25;
    if (a <= 0.01) continue;
    const rot = R.spin * life + R.at;
    for (let i = 0; i < R.n; i++) {
      const ang = (i / R.n) * TAU + rot;
      const p = s08_prj(Math.cos(ang) * rad, Math.sin(ang) * rad * 0.92, 14, S);
      const sz = R.size * S.k * p.s * (R.inward ? lerp(1.15, 0.34, e) : lerp(1.1, 0.45, life));
      s08_blk(ctx, p.x, p.y, sz, R.col, { alpha: clamp(a * (0.56 + 0.28 * Math.sin(ang * 3 + t * 2))), topF: 1.5, leftF: 0.95, rightF: 0.62 });
    }
  }
}

// dark plate behind the hollow so the green check stays crisp
function s08_plate(ctx, t, S, energy) {
  const pa = clamp((t - 20.62) / 0.46) * (0.78 - 0.12 * energy);
  if (pa <= 0.01) return;
  const hw = s08_DX * 0.60, hh = s08_DY * 0.60, oy = s08_CUBE * S.k * 0.5;
  ctx.save(); ctx.globalAlpha *= pa; ctx.fillStyle = '#170B2C';
  ctx.beginPath();
  for (const p of s08_CELLS.plate) {
    const a = s08_prj(p.u - hw, p.v - hh, -4, S), b = s08_prj(p.u + hw, p.v - hh, -4, S),
      c = s08_prj(p.u + hw, p.v + hh, -4, S), d = s08_prj(p.u - hw, p.v + hh, -4, S);
    ctx.moveTo(a.x, a.y + oy); ctx.lineTo(b.x, b.y + oy); ctx.lineTo(c.x, c.y + oy); ctx.lineTo(d.x, d.y + oy); ctx.closePath();
  }
  ctx.fill(); ctx.restore();
  // faint violet light inside the hollow before the check lands
  const h = s08_prj(s08_CHK_OU, s08_CHK_OV, 0, S);
  radialFill(ctx, h.x, h.y, 200 * S.k * h.s, [[0, rgba(TOKENS.secondary, 0.16 * clamp((t - 20.5) / 0.5))], [1, rgba(TOKENS.secondary, 0)]], 'lighter');
}

function s08_seal(ctx, t, S, energy) {
  // rim glow (one cheap radial, no per-cube blur)
  const g = s08_prj(0, 0, 0, S);
  radialFill(ctx, g.x, g.y + s08_CUBE * S.k * 0.5, 350 * S.k,
    [[0, rgba(TOKENS.secondary, 0.13 + 0.10 * energy)], [0.55, rgba(TOKENS.secondary, 0.09 + 0.08 * energy)], [1, rgba(TOKENS.secondary, 0)]], 'lighter');

  const sw = s08_sweepU(t), sw2 = s08_sweepU2(t);
  const items = [];
  for (const b of s08_CELLS.blocks) {
    const p = clamp((t - s08_BLOCK_T0(b)) / s08_RISE);
    if (p <= 0) continue;
    const e = E.outExpo(p);
    // NEW ENTRANCE: the block rises into place from below, inside the shield plane
    const vOff = (1 - e) * (98 + 62 * (1 - b.bo));
    const pr = s08_prj(b.u, b.v + vOff, 0, S);
    items.push({ b: b, p: p, e: e, pr: pr, back: false, z: pr.z });
    if (b.rim) {                                        // material thickness: a darker layer behind
      const pb = s08_prj(b.u, b.v + vOff, -s08_DEPTH, S);
      items.push({ b: b, p: p, e: e, pr: pb, back: true, z: pb.z });
    }
  }
  items.sort((a, z) => a.z - z.z);                      // far side of the turned shield first

  for (const it of items) {
    const b = it.b, pr = it.pr;
    const bc = s08_bandC(b.u, b.v);
    const hl = Math.exp(-Math.pow((bc - sw) / 92, 2)) + 0.45 * Math.exp(-Math.pow((bc - sw2) / 42, 2));
    const dep = clamp(0.5 + pr.z / 150);                 // near side reads brighter than the far side
    const wave = 0.5 + 0.5 * Math.sin((t - 20.6) * 1.9 + (b.u - b.v) * 0.013);
    const sz = s08_CUBE * S.k * pr.s * lerp(0.42, 1, E.outBack(it.p));
    if (it.back) {
      const col = s08_mix(b.rim ? TOKENS.primary : TOKENS.secondary, '#150B24', 0.60);
      s08_blk(ctx, pr.x, pr.y, sz, col, { alpha: clamp(it.p * 2.4) * 0.92, topF: 0.95 + 0.25 * dep, leftF: 0.62, rightF: 0.42 });
      continue;
    }
    const bf = 0.66 + 0.48 * Math.min(hl, 1.2) + 0.19 * dep + 0.10 * wave;
    const col = b.rim ? TOKENS.primary : TOKENS.secondary;
    s08_blk(ctx, pr.x, pr.y, sz, hl > 0.35 ? s08_mix(col, '#FFFFFF', (b.rim ? 0.13 : 0.15) * clamp((hl - 0.35) / 0.65)) : col, {
      alpha: clamp(it.p * 2.4),
      outline: b.rim ? s08_mix(TOKENS.primary, '#FFFFFF', 0.22) : TOKENS.violetHot,
      outlineAlpha: (b.rim ? 0.5 : 0.38) * it.e * (0.72 + 0.40 * Math.min(hl, 1) + 0.30 * dep),
      outlineWidth: 1.5,
      topF: (b.rim ? 1.16 : 1.34) * bf, leftF: (b.rim ? 0.78 : 0.84) * bf, rightF: (b.rim ? 0.50 : 0.57) * bf,
    });
  }
}

// flakes detaching from the rim towards the camera — keeps the calm frame alive between the beats
function s08_sparks(ctx, t, S, energy) {
  const rim = s08_CELLS.rim, n = rim.length;
  const boost = 1 + 1.5 * E.outCubic(clamp((t - s08_T.chase) / 0.30)) * (1 - clamp((t - s08_T.chase) / 1.1)) + 2.0 * energy;
  for (const s of s08_SPARKS) {
    const per = s.per / (0.9 + 0.5 * energy);
    const life = ((t - 20.78) / per + s.ph) % 1;
    if (life < 0 || life > 1) continue;
    const b = rim[s.bi % n];
    if (t - life * per < s08_T.build1 - 0.15) continue;
    const e = E.outCubic(life);
    const p = s08_prj(b.u + (s.du + b.nu * 34) * e, b.v + (s.dv * (0.6 + 0.7 * energy) + b.nv * 26) * e, s.dw * e * boost, S);
    const a = (1 - life) * (1 - life) * (0.72 + 0.30 * energy);
    if (a < 0.02) continue;
    s08_blk(ctx, p.x, p.y, s.s * S.k * p.s * (1.05 - 0.30 * life), s.red ? TOKENS.primary : TOKENS.violetHot, {
      alpha: a, topF: 1.5, leftF: 0.95, rightF: 0.65,
    });
  }
}

/* the tick: two strokes that fly in along their own axes and lock in the knee at 21.15 */
function s08_check(ctx, t, S, energy) {
  if (t < s08_T.ping) return;
  const h = s08_prj(s08_CHK_OU, s08_CHK_OV, s08_CHK_OW, S);
  const lock = impulse(t, s08_T.check1, 9);
  // green halo — pulses on the calm beats so the centre never sits still
  const halo = 0.15 * clamp((t - s08_T.ping) / 0.25) + 0.20 * impulse(t, s08_T.ping + 0.12, 6)
    + 0.09 * lock + 0.09 * impulse(t, s08_T.ring2, 7) + 0.10 * impulse(t, s08_T.chase, 7)
    + 0.03 * Math.sin((t - 20.9) * 2.4) + 0.05 * energy;
  radialFill(ctx, h.x, h.y, 250 * S.k * h.s, [[0, rgba(TOKENS.ok, Math.max(0, halo))], [0.5, rgba(TOKENS.ok, Math.max(0, halo) * 0.35)], [1, rgba(TOKENS.ok, 0)]], 'lighter');

  const sw = s08_sweepU(t);
  const arm = s08_ARM.map(a => {
    const p = clamp((t - a.t0) / (a.t1 - a.t0));
    return { e: E.outExpo(p), p: p };
  });
  ctx.save();
  for (const q of s08_CHECK) {
    const A = s08_ARM[q.arm], a = arm[q.arm];
    if (a.p <= 0) continue;
    const off = (1 - a.e) * A.dist;
    const u = q.u + s08_CHK_OU + A.dir[0] * off, v = q.v + s08_CHK_OV + A.dir[1] * off;
    const pr = s08_prj(u, v, s08_CHK_OW, S);
    const c = s08_CHK_CELL * S.k * pr.s * 1.06;
    const g = Math.exp(-Math.pow((s08_bandC(u, v) - sw) / 70, 2));   // the shield's own light band crosses it
    ctx.globalAlpha = clamp(a.p * 3.0);
    ctx.fillStyle = a.e < 0.999 ? s08_mix(TOKENS.ok, '#D8FFE6', 0.55 * (1 - a.e))
      : (g > 0.04 || lock > 0.02 ? s08_mix(TOKENS.ok, '#D8FFE6', clamp(0.45 * g + 0.38 * lock)) : TOKENS.ok);
    ctx.fillRect(pr.x - c / 2, pr.y - c / 2, Math.ceil(c) + 0.5, Math.ceil(c) + 0.5);
  }
  ctx.restore();

  // the lock: a short flash in the knee plus a few green voxel flakes
  if (t >= s08_T.check1 - 0.02 && t < s08_T.check1 + 0.75) {
    const kp = s08_prj(s08_KNEE.u, s08_KNEE.v, s08_CHK_OW + 6, S);
    if (lock > 0.01) radialFill(ctx, kp.x, kp.y, 170 * S.k * kp.s, [[0, rgba('#D8FFE6', 0.26 * lock)], [0.4, rgba(TOKENS.ok, 0.17 * lock)], [1, rgba(TOKENS.ok, 0)]], 'lighter');
    const life = clamp((t - s08_T.check1) / 0.62);
    if (life > 0 && life < 1) {
      const e = E.outCubic(life);
      for (const f of s08_LOCK) {
        const p = s08_prj(s08_KNEE.u + f.du * e, s08_KNEE.v + f.dv * e, s08_CHK_OW + f.dw * e, S);
        s08_blk(ctx, p.x, p.y, f.s * S.k * p.s * (1 - 0.35 * life), TOKENS.ok, { alpha: (1 - life) * (1 - life) * 0.85, topF: 1.5, leftF: 0.95, rightF: 0.62 });
      }
    }
  }
}

function s08_riser(ctx, t, energy) {
  if (energy <= 0.001) return;
  const lt = t - s08_T.riser;
  ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.lineCap = 'round';
  for (const s of s08_STREAKS) {
    const span = H + 500;
    const y = H + 160 - (((s.ph * span + lt * s.sp * (0.55 + energy)) % span) + span) % span;
    const len = s.len * (0.5 + energy);
    ctx.globalAlpha = s.a * energy * 0.5;
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
    const bob = Math.sin(camT * 0.80) * 8 * (1 - energy) + Math.sin(camT * 1.75 + 0.9) * 3 * (1 - energy) - 34 * energy;
    const kBreath = 1 + 0.020 * Math.sin((t - 20.9) * 1.5);
    const k = kBreath * (1 - 0.17 * E.outCubic(clamp((t - s08_T.riser) / 0.62)));   // steps back from 22.8
    const S = s08_state(t, k, bob);

    FX.bloom = Math.max(FX.bloom, 0.20 + 0.06 * Math.min(energy, 0.8));
    FX.bloomBlur = 30;

    // ---- world layer (slow push towards the seal; text stays untouched so it can't leave the safe area)
    const cam = {
      zoom: 1 + 0.020 * clamp(camT / 2.4) + 0.011 * Math.sin(camT * 0.66) + 0.055 * energy,
      x: Math.sin(camT * 1.15) * 10 - 8 * energy,
      y: Math.cos(camT * 0.92) * 8 - 14 * energy,
      rot: 0.004 * Math.sin(camT * 0.5) - 0.005 * energy,
      ox: s08_AX, oy: s08_AY,
    };
    withCamera(ctx, cam, c => {
      s08_background(c, t, energy);
      s08_pool(c, t, S, energy);
      s08_ringsDraw(c, t, S);
      s08_plate(c, t, S, energy);
      s08_seal(c, t, S, energy);
      // into the build the seal turns frontal and lights up from inside — hollow in the middle so
      // the red rim, the violet inner ring and the green check all keep their own colours
      if (energy > 0.001) {
        const g = s08_prj(0, 0, 0, S);
        radialFill(c, g.x, g.y, lerp(190, 380, energy),
          [[0, rgba(TOKENS.violetHot, 0.012 * energy)], [0.40, rgba(TOKENS.violetHot, 0.030 * energy)],
           [0.66, rgba(TOKENS.violetHot, 0.14 * energy)], [1, rgba(TOKENS.secondary, 0)]], 'lighter');
      }
      s08_check(c, t, S, energy);
      s08_sparks(c, t, S, energy);
      s08_riser(c, t, energy);
    });

    // ---- headline: four calm lines at the full 96 px, on the original centred axis,
    // 'erlaubt' in the ok green
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
      drawKinetic(ctx, ln.s, s08_TX, ln.y - 12 * energy, o, p, 'rise');
    }

    // ---- subline, marked by a short vertical rule that draws downwards next to it
    const ps = clamp((t - s08_T.sub) / 0.50);
    if (ps > 0) {
      const so = { family: FONTS.head, weight: 500, align: 'center', baseline: 'middle', size: 48 };
      so.size = s08_fit(ctx, 'Kein Cheat. Nur AFK.', so, 700, 0.02);
      so.tracking = 0.02 * so.size;
      so.color = rgba(T().text, 0.85);
      so.stagger = 0.45; so.ease = E.outExpo; so.rise = so.size * 0.5;
      const ph = clamp((t - (s08_T.sub - 0.10)) / 0.45);
      if (ph > 0) {
        ctx.save(); ctx.globalAlpha = 0.55 * clamp(ph * 2);
        hairline(ctx, s08_TX, 1160, s08_TX + 120, 1160, ph, { color: rgba(TOKENS.violetHot, 0.9), glowColor: TOKENS.secondary, width: 2 });
        hairline(ctx, s08_TX, 1160, s08_TX - 120, 1160, ph, { color: rgba(TOKENS.violetHot, 0.9), glowColor: TOKENS.secondary, width: 2 });
        ctx.restore();
      }
      drawKinetic(ctx, 'Kein Cheat. Nur AFK.', s08_TX, 1218 - 10 * energy, so, ps, 'rise');
    }
  },
};
