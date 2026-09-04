/* s03_s04.js
   s03  6.0–9.0  "Läuft in der Cloud."   — isometrische Server-Türme, Datenlinien, ausgeschalteter PC, ONLINE-HUD
   s04  9.0–12.0 "24/7 an deiner Farm."  — texturierte HugoSMP-Farm mit AFK-Spieler (mcPlayer),
                                            Item-Bögen in den Inventar-Slot, Kamerafahrt ins Inventar (s05)

   RESTAGING (v2): gleiche Farben, gleiche Typo, gleiche Wörter, gleiche Beats — neue Inszenierung.
   s03: fünf Türme in einer gestaffelten Reihe statt drei Clustern, der tote PC rechts hinten,
        die Datenlinie klettert und springt über die Turmspitzen, ONLINE-Chip links oben,
        24/7-Badge rechts. s04: die Beete laufen jetzt quer (Spalten statt Reihen), der Kanal
        von rechts-hinten nach links-vorn mit Brücke, die Spawner-Ecke in der linken Ecke,
        die Eiche rechts hinten, der Spieler oben auf dem Kopfsteinweg, Inventar-Slot links oben.
   Alles ist eine reine Funktion von t. Alle Modul-Helfer sind mit s03_s04_ / s03_ / s04_ präfixiert. */

/* ------------------------------------------------------------------ palette (voxel world only) */
const s03_s04_C = {
  slate: '#2C2A3C', rack: '#1E1C2B',
  slab: '#221D33', slabEdge: '#171325', cloud: '#2F2850',
  pc: '#454552', pcDark: '#22222B', pcDead: '#572222',
  grass: '#3F7A30', field: '#6A4A2E', pumpkin: '#E08020', stem: '#2E7D32',
  cage: '#4A515C', cageHi: '#657081',
};

/* ------------------------------------------------------------------ tiny helpers */
// shrink a headline until it fits maxW (keeps the -0.04em tracking of the style guide)
function s03_s04_fit(ctx, str, o, maxW) {
  let size = o.size;
  for (let k = 0; k < 30 && size > 96; k++) {
    if (measureText(ctx, str, Object.assign({}, o, { size: size, tracking: -0.04 * size })) <= maxW) break;
    size -= 2;
  }
  return size;
}
// headline slam: scale 1.16 -> 1.0 (outExpo, 0.15 s) + ~3 frames of RGB split.
// The horizontal punch is clamped so that even at peak scale plus the 8 px RGB split the line
// stays inside the TikTok safe area (x 90..900); the vertical punch keeps the full impact.
function s03_s04_slam(ctx, str, x, y, o, t, t0, dur) {
  const p = clamp((t - t0) / (dur || 0.15));
  if (p <= 0) return;
  const e = E.outExpo(p);
  if (t - t0 < 0.1) FX.rgb = Math.max(FX.rgb, 8 * (1 - e));
  const w = measureText(ctx, str, o);
  const sx = lerp(Math.min(1.16, 696 / Math.max(1, w)), 1, e), sy = lerp(1.16, 1, e);
  ctx.save();
  ctx.translate(x, y); ctx.scale(sx, sy);
  drawText(ctx, str, 0, 0, Object.assign({}, o, { alpha: (o.alpha != null ? o.alpha : 1) * clamp(p * 6) }));
  ctx.restore();
}
// hex-safe colour mix: cube()/shade() re-parse the colour as hex, so mixColor's rgb() string
// would come back as black. Everything handed to cube() must go through this.
function s03_s04_mixHex(h1, h2, k) {
  const a = hexToRgb(h1), b = hexToRgb(h2);
  const h = v => Math.round(clamp(v, 0, 255)).toString(16).padStart(2, '0');
  return '#' + h(lerp(a[0], b[0], k)) + h(lerp(a[1], b[1], k)) + h(lerp(a[2], b[2], k));
}
// one cube anchored at a screen point (lets us mix cube sizes inside one iso scene)
function s03_s04_blk(ctx, x, y, size, color, o) {
  return cube(ctx, 0, 0, 0, Object.assign({ size: size, cx: x, cy: y, color: color }, o || {}));
}
// item icon at a given pixel size (the engine sprites are 16x16)
function s03_s04_icon(ctx, name, x, y, px, o) {
  const sp = SPRITES[name]; if (!sp) return;
  itemIcon(ctx, name, x, y, px / sp.rows.length, o);
}
// right-hand face polygon of a cube (dead front panel of the PC)
function s03_s04_faceR(ctx, x, y, s, inset, fill) {
  const w = s * 0.866, h = s * 0.5, i = inset;
  ctx.save(); ctx.beginPath();
  ctx.moveTo(x + i * 0.9, y + h + i * 0.5);
  ctx.lineTo(x + w - i * 0.9, y + i * 0.5);
  ctx.lineTo(x + w - i * 0.9, y + s - i * 0.5);
  ctx.lineTo(x + i * 0.9, y + h + s - i * 0.5);
  ctx.closePath(); ctx.fillStyle = fill; ctx.fill(); ctx.restore();
}
// point on a polyline at normalised arc length s
function s03_s04_pathPt(pts, s) {
  let total = 0; const seg = [];
  for (let i = 1; i < pts.length; i++) { const d = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]); seg.push(d); total += d; }
  let d = clamp(s) * total;
  for (let i = 0; i < seg.length; i++) {
    if (d <= seg[i] || i === seg.length - 1) { const k = seg[i] > 0 ? clamp(d / seg[i]) : 0; return [lerp(pts[i][0], pts[i + 1][0], k), lerp(pts[i][1], pts[i + 1][1], k)]; }
    d -= seg[i];
  }
  return pts[pts.length - 1];
}
function s03_s04_poly(ctx, pts, color, width, alpha) {
  ctx.save(); ctx.globalAlpha *= alpha; ctx.strokeStyle = color; ctx.lineWidth = width; ctx.lineJoin = 'round'; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]); for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]); ctx.stroke(); ctx.restore();
}
// cubic bezier point (the item arcs leave the farm to the right and cross the top of the frame)
function s03_s04_bez3(p, a, c1, c2, b) {
  const u = 1 - p, u2 = u * u, p2 = p * p;
  return [u2 * u * a[0] + 3 * u2 * p * c1[0] + 3 * u * p2 * c2[0] + p2 * p * b[0],
          u2 * u * a[1] + 3 * u2 * p * c1[1] + 3 * u * p2 * c2[1] + p2 * p * b[1]];
}
// soft elliptical ground glow under a voxel island
function s03_s04_groundGlow(ctx, x, y, rx, ry, color, alpha) {
  ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.translate(x, y); ctx.scale(1, ry / rx);
  radialFill(ctx, 0, 0, rx, [[0, rgba(color, alpha)], [0.45, rgba(color, alpha * 0.35)], [1, 'rgba(0,0,0,0)']]);
  ctx.restore();
}

/* ================================================================== s03 — der Serverraum
   Neue Inszenierung: eine lange, flache Plattform quer durchs Bild, darauf FÜNF Racks in einer
   gestaffelten Reihe (kurz – hoch – kurz – hoch – kurz) statt drei Türmen im Cluster.
   Der tote PC steht rechts hinten auf einem abgesetzten Sporn, die Datenlinie läuft von ihm
   nach unten auf den ersten Turmfuss, klettert dort hoch und springt danach von Spitze zu
   Spitze quer über das ganze Bild nach links. */
const s03_ISO = { size: 50, cx: 470, cy: 1400 };

/* ------------------------------------------------------------------ s03: drifting voxel clouds
   Sie liegen ÜBER der Headline (y 250–470) und ziehen jetzt nach LINKS, mit anderen Höhen und
   Grössen als vorher — die obere Bildhälfte bewegt sich also gegen die Kamerafahrt. */
const s03_s04_CLOUDS = (() => {
  const r = rng(9137), out = [], ys = [268, 402, 322, 458, 244];
  for (let i = 0; i < 5; i++) {
    const cells = [], n = 8 + Math.floor(r() * 5);
    for (let k = 0; k < n; k++) cells.push({ ix: Math.floor(r() * 6), iy: Math.floor(r() * 3), iz: r() < 0.30 ? 1 : 0 });
    out.push({ cells: cells, x0: i * 330 + r() * 110, y: ys[i], size: 15 + r() * 9, sp: -(38 + r() * 26), a: 0.46 + r() * 0.18, px: 0.24 + i * 0.15 });
  }
  return out;
})();
function s03_s04_clouds(ctx, t, push) {
  for (const c of s03_s04_CLOUDS) {
    const span = W + 560;
    const x = ((c.x0 + (t - 6) * c.sp) % span + span) % span - 280;
    const y = c.y + push * 38 * c.px;                       // parallax against the camera drift
    cubeField(ctx, c.cells, {
      size: c.size, cx: x, cy: y, color: s03_s04_C.cloud, alpha: c.a,
      topF: 1.85, leftF: 1.05, rightF: 0.72,
      outline: TOKENS.secondary, outlineAlpha: 0.34 * c.a, outlineWidth: 1.2,
    });
  }
}

/* ------------------------------------------------------------------ s03: server towers
   Fünf Racks, aufgereiht auf der Diagonalen ix+iy = 6 (plus eines dahinter), unterschiedlich
   hoch. Sie landen in Kettenrichtung — vom PC weg nach links — auf 5.82 / 6.5 / 7.0 / 7.5 / 8.0,
   also auf demselben Beat-Raster wie vorher (5.82 / 6.5 / 7.0 hatten schon Landungen). */
const s03_s04_TOWERS = [
  { bx: 6, by: 0, h: 8,  seed: 5,  t0: 5.82 },   // rechts, beim toten PC — landet auf dem Schnitt
  { bx: 4, by: 2, h: 5,  seed: 17, t0: 6.50 },
  { bx: 2, by: 2, h: 11, seed: 29, t0: 7.00 },   // hinten Mitte, der höchste
  { bx: 2, by: 4, h: 10, seed: 43, t0: 7.50 },
  { bx: 0, by: 6, h: 6,  seed: 61, t0: 8.00 },   // ganz links, zuletzt
];
const s03_s04_BEATS = [6.50, 7.00, 7.50, 8.00, 8.50];       // rack-wide read/write sweeps
const s03_s04_HITS = [7.00, 7.50, 8.00, 8.50];              // packet release / rings
function s03_s04_sweepAt(t, l, ti) {
  // a read/write head rolls up every rack the whole time, so the racks never sit still …
  const roll = ((t - 6) * 3.8 + ti * 2.3) % 11 - 1.5;
  let s = 0.48 * Math.exp(-Math.pow(l - roll, 2) * 1.0);
  // … and a much faster, brighter sweep fires on every beat
  for (let i = 0; i < s03_s04_BEATS.length; i++) {
    const dt = t - s03_s04_BEATS[i] - ti * 0.05;
    if (dt < 0 || dt > 0.80) continue;
    const pos = dt * 14.0 - 1.2;
    s = Math.max(s, Math.exp(-Math.pow(l - pos, 2) * 0.70) * (1 - dt / 0.80));
  }
  return s;
}
function s03_s04_towers(ctx, t, iso) {
  const leds = [], feet = [], tops = [], hot = TOKENS.violetHot, flashes = [];
  for (let ti = 0; ti < s03_s04_TOWERS.length; ti++) {
    const TW = s03_s04_TOWERS[ti];
    const fp = isoPos(TW.bx + 1, TW.by + 1, -0.65, iso);
    feet.push([fp.x, fp.y]);
    const tp = isoPos(TW.bx + 0.5, TW.by + 0.5, TW.h - 1, iso);
    tops.push([tp.x, tp.y]);
    for (let l = 0; l < TW.h; l++) {
      const t0 = TW.t0 + l * 0.034;
      const app = ez(t, t0, t0 + 0.26, E.outBack);
      if (app <= 0.002) continue;
      const sw = s03_s04_sweepAt(t, l, ti);
      const dz = (1 - app) * 1.1, cells = [];
      const base = (l % 2 === 0) ? s03_s04_C.slate : s03_s04_C.rack;
      const col = sw > 0.01 ? s03_s04_mixHex(base, hot, clamp(sw) * 0.52) : base;
      for (let a = 0; a < 2; a++) for (let b = 0; b < 2; b++) {
        cells.push({ ix: TW.bx + a, iy: TW.by + b, iz: l + dz, color: col, alpha: clamp(app) });
      }
      cubeField(ctx, cells, Object.assign({}, iso, { outline: '#0B0912', outlineAlpha: 0.55, outlineWidth: 1.4 }));
      if (app > 0.8) {
        const p = isoPos(TW.bx + 1, TW.by + 1, l, iso), w = iso.size * 0.866;
        const b1 = clamp(0.18 + 0.82 * pulse(t, 0.5 + hash1(TW.seed * 31 + l) * 1.6, 5, hash1(TW.seed + l * 7) * 2) + sw * 1.4);
        const b2 = clamp(0.18 + 0.82 * pulse(t, 0.5 + hash1(TW.seed * 17 + l * 3) * 1.5, 5, hash1(TW.seed * 5 + l) * 2) + sw * 1.4);
        leds.push([p.x + w * 0.52, p.y + iso.size * 0.46, b1]);
        leds.push([p.x - w * 0.52, p.y + iso.size * 0.46, b2]);
        if (sw > 0.08) flashes.push([p.x, p.y + iso.size * 0.35, sw]);
      }
    }
  }
  // the sweep lights the whole rack row, batched (cached sprite glows, no ctx.filter)
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  for (const f of flashes) dot(ctx, f[0], f[1], 92, hot, 0.30 * f[2]);
  for (const L of leds) dot(ctx, L[0], L[1], 16 + L[2] * 12, hot, 0.20 + 0.58 * L[2]);
  ctx.restore();
  for (const L of leds) { ctx.save(); ctx.globalAlpha = 0.45 + 0.55 * L[2]; ctx.fillStyle = hot; ctx.fillRect(Math.round(L[0] - 4), Math.round(L[1] - 4), 8, 8); ctx.restore(); }
  return { feet: feet, tops: tops };
}

/* drifting data motes — now they slide sideways along the deck instead of rising in a column */
const s03_s04_MOTES = (() => { const r = rng(88), o = []; for (let i = 0; i < 20; i++) o.push({ y: 1180 + r() * 420, x0: r(), sp: 0.10 + r() * 0.16, s: 4 + r() * 6 }); return o; })();
function s03_s04_motes(ctx, t) {
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  for (const m of s03_s04_MOTES) {
    const ph = (m.x0 + (t - 6) * m.sp) % 1;
    const x = lerp(1000, 60, ph), a = Math.sin(Math.PI * ph) * 0.6;
    const y = m.y - Math.sin(ph * 3.1 + m.x0 * 6) * 26;
    dot(ctx, x, y, m.s * 3.4, TOKENS.secondary, a * 0.5);
    ctx.globalAlpha = a; ctx.fillStyle = TOKENS.violetHot; ctx.fillRect(Math.round(x), Math.round(y), m.s, m.s); ctx.globalAlpha = 1;
  }
  ctx.restore();
}

/* ------------------------------------------------------------------ s03: the switched-off PC
   Neu: rechts hinten auf einem abgesetzten Plattform-Sporn, nicht mehr links unten. */
function s03_s04_pcVoxel(ctx, t, iso) {
  const p = ez(t, 5.95, 6.38, E.outBack);
  if (p <= 0.002) return null;
  const anchor = isoPos(7.5, -1.5, 0, iso);
  const s = 56, x = anchor.x, y = anchor.y - s + (1 - p) * 52;
  ctx.save(); ctx.globalAlpha *= clamp(p * 2);
  s03_s04_blk(ctx, x, y + s, s, s03_s04_C.pc, { outline: '#0B0912', outlineAlpha: 0.6, topF: 1.0, leftF: 0.70, rightF: 0.44 });
  s03_s04_blk(ctx, x, y, s, s03_s04_C.pc, { outline: '#0B0912', outlineAlpha: 0.6, topF: 1.0, leftF: 0.70, rightF: 0.44 });
  // dead front panel + dark power dot (the PC is off: no glow anywhere on it)
  s03_s04_faceR(ctx, x, y, s, 8, s03_s04_C.pcDark);
  ctx.fillStyle = s03_s04_C.pcDead; ctx.fillRect(Math.round(x + s * 0.58), Math.round(y + s * 0.42), 6, 6);
  ctx.fillStyle = 'rgba(255,255,255,0.08)'; ctx.fillRect(Math.round(x + s * 0.26), Math.round(y + s * 0.74), 26, 3);
  ctx.restore();
  return { x: x - s * 0.42, y: y + s * 0.72 };
}

/* ------------------------------------------------------------------ s03: uptime counter with rolling digits */
const s03_s04_UPTIME0 = 132 * 3600 + 4 * 60 + 51;   // live session counter, starts at 132:04:51
function s03_s04_hms(sec) {
  const h = Math.floor(sec / 3600), m = Math.floor(sec / 60) % 60, s = sec % 60;
  return String(h).padStart(3, '0') + ':' + String(m).padStart(2, '0') + ':' + String(s).padStart(2, '0');
}
/* Digit tick: the outgoing digit leaves upward while the incoming one arrives from below,
   both in plain white JetBrains Mono and with only a 5 px nudge, so a changing digit can
   never hang below the baseline or read as a rendering fault. */
function s03_s04_digits(ctx, str, prev, frac, xRight, y, o) {
  const cw = measureText(ctx, '0', o), total = str.length * cw;
  const roll = 1 - E.outCubic(clamp(frac / 0.16));
  const co = Object.assign({}, o, { align: 'center' });
  let x = xRight - total;
  for (let i = 0; i < str.length; i++) {
    const ch = str[i], pc = prev ? prev[i] : ch;
    if (pc === ch || roll <= 0.004) {
      drawText(ctx, ch, x + cw / 2, y, co);
    } else {
      drawText(ctx, pc, x + cw / 2, y - (1 - roll) * 5, Object.assign({}, co, { alpha: roll }));
      drawText(ctx, ch, x + cw / 2, y + roll * 5, Object.assign({}, co, { alpha: 1 - roll }));
    }
    x += cw;
  }
}

/* ------------------------------------------------------------------ s03: ONLINE HUD chip
   Neu links oben (vorher rechts oben) — dieselbe Grösse, dieselben Strings, dasselbe Timing. */
function s03_s04_hud(ctx, t) {
  const p = ez(t, 6.06, 6.46, E.outBack);
  if (p <= 0.002) return;
  const w = 336, h = 176, x = 96, y = 318, cx = x + w / 2, cy = y + h / 2, sc = lerp(0.88, 1, p);
  ctx.save(); ctx.globalAlpha *= clamp(p * 2.2);
  ctx.translate(cx, cy); ctx.scale(sc, sc); ctx.translate(-cx, -cy);
  roundRect(ctx, x, y, w, h, 16); ctx.fillStyle = 'rgba(9,7,17,0.94)'; ctx.fill();
  ctx.strokeStyle = rgba(TOKENS.secondary, 0.42); ctx.lineWidth = 2; ctx.stroke();
  const bl = 0.45 + 0.55 * (0.5 + 0.5 * Math.sin(t * 4.4));
  ctx.save(); ctx.globalCompositeOperation = 'lighter'; dot(ctx, x + 38, y + 44, 22, TOKENS.ok, 0.28 + 0.45 * bl); ctx.restore();
  ctx.fillStyle = TOKENS.ok; ctx.beginPath(); ctx.arc(x + 38, y + 44, 9, 0, TAU); ctx.fill();
  drawText(ctx, 'ONLINE', x + 62, y + 45, { size: 27, family: FONTS.silk, weight: 700, color: TOKENS.ok, align: 'left', tracking: 2 });
  ctx.strokeStyle = 'rgba(255,255,255,0.10)'; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(x + 22, y + 78); ctx.lineTo(x + w - 22, y + 78); ctx.stroke();
  drawText(ctx, 'LAUFZEIT', x + 22, y + 103, { size: 19, family: FONTS.silk, weight: 700, color: TOKENS.muted, align: 'left', tracking: 3 });
  const el = Math.max(0, t - 6.0), sec = s03_s04_UPTIME0 + Math.floor(el);
  s03_s04_digits(ctx, s03_s04_hms(sec), s03_s04_hms(sec - 1), el - Math.floor(el), x + w - 22, y + 144,
    { size: 46, family: FONTS.mono, weight: 600, color: TOKENS.text });
  ctx.restore();
}

/* ------------------------------------------------------------------ s03: 24/7 pixel badge
   Neu rechts (vorher links) — gleiches Pop-Timing auf 8.40. */
function s03_s04_badge(ctx, t) {
  const p = ez(t, 8.40, 8.62, E.outBack);
  if (p <= 0.002) return;
  const cx = 770, cy = 1028, size = 38;
  const o = { size: size, family: FONTS.pixel, weight: 400, color: TOKENS.violetHot, align: 'center' };
  const bw = measureText(ctx, '24/7', o) + 62, bh = 94;
  const sc = lerp(0.5, 1, p) * (1 + 0.02 * Math.sin((t - 8.4) * 7));
  FX.bloom = Math.max(FX.bloom, 0.24 + 0.14 * impulse(t, 8.4, 9));
  ctx.save(); ctx.globalAlpha *= clamp(p * 3);
  ctx.translate(cx, cy); ctx.scale(sc, sc); ctx.translate(-cx, -cy);
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  dot(ctx, cx, cy, bw * 0.66, TOKENS.secondary, 0.18 + 0.20 * pulse(t, 1.0, 4, 8.4));
  ctx.restore();
  roundRect(ctx, cx - bw / 2, cy - bh / 2, bw, bh, 8); ctx.fillStyle = 'rgba(12,8,22,0.92)'; ctx.fill();
  ctx.strokeStyle = rgba(TOKENS.violetHot, 0.9); ctx.lineWidth = 3; ctx.stroke();
  drawText(ctx, '24/7', cx, cy + 2, o);
  ctx.restore();
}

/* ------------------------------------------------------------------ s03: the deck
   Ein langes Sechseck-Podest quer durchs Bild (statt der alten Raute), das von hinten nach
   vorn hereinklappt; die Datenwelle läuft jetzt quer hindurch (links -> rechts) statt von
   einem Punkt aus radial — auf demselben Sechzehntel-Raster ab 6.00. */
const s03_DECK = (() => {
  const out = [];
  for (let ix = -1; ix <= 8; ix++) for (let iy = -1; iy <= 8; iy++) {
    const s = ix + iy;
    if (s < 2 || s > 11 || Math.abs(ix - iy) > 8) continue;
    out.push({ ix: ix, iy: iy, edge: (s === 2 || s === 11 || Math.abs(ix - iy) >= 7) });
  }
  // the spur the dead PC stands on, off the back-right edge
  out.push({ ix: 7, iy: -2, edge: true }, { ix: 8, iy: -2, edge: true }, { ix: 8, iy: -1, edge: true });
  return out;
})();
function s03_deck(ctx, t, iso) {
  const cells = [];
  for (const cell of s03_DECK) {
    const s = cell.ix + cell.iy;
    const t0 = 5.86 + (s + 1) * 0.018;
    const a = ez(t, t0, t0 + 0.18, E.outCubic);
    if (a <= 0.002) continue;
    const u = (cell.ix - cell.iy + 9) * 0.5;               // 0..9 across the screen
    let wv = 0;
    for (let k = 0; k < 12; k++) {
      const dt = t - (6.00 + k * 0.25);
      if (dt < 0 || dt > 0.62) continue;
      wv = Math.max(wv, Math.exp(-Math.pow(u - (dt * 17 - 2), 2) * 0.95) * (1 - dt / 0.62));
    }
    const base = cell.edge ? s03_s04_C.slabEdge : s03_s04_C.slab;
    cells.push({
      ix: cell.ix, iy: cell.iy, iz: -1 - (1 - a) * 0.9 + wv * 0.30,
      color: wv > 0.01 ? s03_s04_mixHex(base, TOKENS.violetHot, wv * 0.42) : base, alpha: a,
    });
  }
  cubeField(ctx, cells, Object.assign({}, iso, { topF: 1.5, leftF: 0.85, rightF: 0.6 }));
}

/* ------------------------------------------------------------------ s03: the data chain
   Eine einzige Leitung: toter PC -> Podestkante -> Fuss des ersten Racks -> hoch auf dessen
   Dach -> und von dort in Sprüngen über alle Turmspitzen quer nach links. Jedes Segment
   erscheint genau dann, wenn sein Turm landet. */
const s03_CHAIN_SEG = [
  [5.86, 6.02], [5.96, 6.12], [6.04, 6.32],                  // PC -> Kante -> Fuss -> Dach (Turm 0)
  [6.58, 6.94], [7.08, 7.44], [7.58, 7.94], [8.08, 8.44],    // Dach -> Dach -> Dach -> Dach -> Dach
];
function s03_dataChain(c, t, iso, pc, feet, tops) {
  const spur = isoPos(7.6, -0.4, -0.45, iso);
  const nodes = [[pc.x, pc.y], [spur.x, spur.y], feet[0]];
  for (const p of tops) nodes.push(p);
  const pts = [nodes[0]];
  for (let i = 0; i < nodes.length - 1 && i < s03_CHAIN_SEG.length; i++) {
    const sg = s03_CHAIN_SEG[i];
    const p = ez(t, sg[0], sg[1], E.outCubic);
    if (p <= 0.004) break;
    pts.push([lerp(nodes[i][0], nodes[i + 1][0], p), lerp(nodes[i][1], nodes[i + 1][1], p)]);
  }
  if (pts.length < 2) return;

  c.save(); c.globalCompositeOperation = 'lighter';
  s03_s04_poly(c, pts, rgba(TOKENS.secondary, 0.5), 9, 0.28);
  c.restore();
  s03_s04_poly(c, pts, rgba(TOKENS.violetHot, 0.8), 2.6, 0.85);

  const boost = Math.max(0, t - 8.6);
  const flow = (t - 6) * 0.235 + boost * boost * 1.35;       // integral of the speed ramp
  c.save(); c.globalCompositeOperation = 'lighter';
  for (let k = 0; k < 10; k++) {
    const s = ((flow + k / 10) % 1 + 1) % 1;
    const q = s03_s04_pathPt(pts, s), fade = Math.sin(Math.PI * clamp(s * 1.05));
    dot(c, q[0], q[1], 26, TOKENS.violetHot, 0.62 * fade);
    c.globalAlpha = 0.95 * fade; c.fillStyle = '#F3E9FF';
    c.fillRect(Math.round(q[0] - 5), Math.round(q[1] - 5), 10, 10); c.globalAlpha = 1;
  }
  // one fat packet is released on every beat and races the whole chain
  for (let bi = 0; bi < s03_s04_HITS.length; bi++) {
    const dt = t - s03_s04_HITS[bi];
    if (dt < 0 || dt > 0.85) continue;
    const s = clamp(dt * 1.30), q = s03_s04_pathPt(pts, s), fd = 1 - clamp(remap(s, 0.80, 1));
    dot(c, q[0], q[1], 56, TOKENS.violetHot, 0.55 * fd);
    c.globalAlpha = fd; c.fillStyle = '#FFFFFF';
    c.fillRect(Math.round(q[0] - 8), Math.round(q[1] - 8), 16, 16); c.globalAlpha = 1;
  }
  c.restore();
  // beat events: a ring pops on the roof of the rack that just landed
  for (let bi = 0; bi < s03_s04_HITS.length; bi++) {
    const tb = s03_s04_HITS[bi], life = (t - tb) / 0.55;
    if (life <= 0 || life >= 1) continue;
    const at = bi < 3 ? tops[bi + 2] : [spur.x, spur.y];
    shockwave(c, at[0], at[1], life, { radius: 330, color: TOKENS.violetHot, width: 10, alpha: 0.75 });
  }
}

/* ------------------------------------------------------------------ s03 */
SCENES.s03 = {
  draw(ctx, lt, t) {
    const iso = s03_ISO;
    // a real drift across the whole hold plus a breath, so nothing ever freezes —
    // this time the camera slides LEFT and settles DOWN (the old one went right and up)
    const push = lerp(clamp(remap(t, 6.06, 8.66)), ez(t, 6.06, 8.66, E.inOutCubic), 0.30);
    const breath = Math.sin((t - 6) * 1.5);

    nightSky(ctx, t, { count: 80, seed: 33, color: '#CFC6E8', alpha: 0.30, hMul: 0.85, drift: true });
    radialFill(ctx, iso.cx + 90 - push * 120, 1250 + push * 30, 700 + push * 60, [[0, rgba(TOKENS.secondary, 0.16)], [0.45, rgba(TOKENS.deepViolet, 0.08)], [1, 'rgba(0,0,0,0)']], 'lighter');
    s03_s04_clouds(ctx, t, push);
    s03_s04_groundGlow(ctx, iso.cx + 40, 1620, 470, 130, TOKENS.deepViolet, 0.30 * ez(t, 5.90, 6.25, E.outCubic));

    withCamera(ctx, {
      zoom: lerp(1.005, 1.115, push) * (1 + 0.012 * breath),
      x: lerp(30, -26, push),
      y: lerp(-34, 24, push) + 8 * Math.sin((t - 6) * 0.85),
      rot: lerp(-0.006, 0.003, push),
      ox: iso.cx + 40, oy: 1330,
    }, c => {
      s03_deck(c, t, iso);
      const rack = s03_s04_towers(c, t, iso);
      s03_s04_motes(c, t);
      const pcPort = s03_s04_pcVoxel(c, t, iso);
      if (pcPort) s03_dataChain(c, t, iso, pcPort, rack.feet, rack.tops);
    });

    /* copy — breathes a couple of pixels against the camera so the block is never frozen */
    ctx.save();
    ctx.translate(0, -2.5 * Math.sin((t - 6) * 1.15));
    band(ctx, 748, 430, 0.55);
    const hOpt = { size: 116, family: FONTS.body, weight: 800, color: TOKENS.text, align: 'center' };
    const s1 = s03_s04_fit(ctx, 'Läuft in der', hOpt, 796), s2 = s03_s04_fit(ctx, 'Cloud.', hOpt, 796);
    s03_s04_slam(ctx, 'Läuft in der', CX, 640, Object.assign({}, hOpt, { size: s1, tracking: -0.04 * s1 }), t, 5.97);
    s03_s04_slam(ctx, 'Cloud.', CX, 760, Object.assign({}, hOpt, { size: s2, tracking: -0.04 * s2 }), t, 6.09);
    const sp = ez(t, 6.50, 6.92, E.outExpo);
    if (sp > 0) drawKinetic(ctx, 'Dein PC kann aus sein.', CX, 880,
      { size: 48, family: FONTS.head, weight: 500, color: rgba(TOKENS.text, 0.85), align: 'center', tracking: 0.02 * 48, stagger: 0.5, ease: E.outExpo }, sp, 'rise');
    ctx.restore();

    s03_s04_hud(ctx, t);
    s03_s04_badge(ctx, t);

    // the towers land like blocks — a short kick, nothing more
    FX.shake = Math.max(FX.shake, 4.5 * impulse(t, 7.00, 13) + 4.5 * impulse(t, 7.50, 13) + 3 * impulse(t, 8.00, 13));
    FX.bloom = Math.max(FX.bloom, 0.22 + 0.10 * (impulse(t, 7.00, 8) + impulse(t, 7.50, 8) + impulse(t, 8.00, 8)));
  },
};

/* ================================================================== s04 — die HugoSMP-Farm
   Zweiter Durchgang: eine echte Minecraft-Welt statt bunter Würfel — texturierte Blöcke,
   Gelände mit Tiefe, AFK-Spieler (mcPlayer).

   NEUE ANORDNUNG: die Beete laufen jetzt als SPALTEN (konstantes ix, also von rechts-hinten
   nach links-vorn) statt als Reihen. Von hinten-links nach vorn-rechts:
     ix 0  Grasrand mit Eichenzaun + zwei Fackeln
     ix 1  Ackerland mit SEA PICKLES
     ix 2  Ackerland mit SEA PICKLES
     ix 3  Kopfsteinweg  <- hier steht der AFK-Spieler, oben im Bild
     ix 4  WASSERKANAL (iy 1..7) mit Bohlenbrücke bei iy 3
     ix 5  Ackerland mit Stielen (Brückenkopf aus Kopfstein bei iy 3)
     ix 6  Ackerland mit den KÜRBISSEN
     ix 7  Ackerland mit Stielen
     ix 8  Grasrand vorn
   Die Spawner-Ecke sitzt jetzt in der LINKEN Ecke (ix 0..2 / iy 6..8): erhöhtes Kopfstein-
   Podest, Mauer, Käfig, zwei Kisten. Die Eiche steht hinten RECHTS auf (6,0). */

const s04_ISO = { size: 56, cx: 600, cy: 1202 };
const s04_NX = 9, s04_NY = 9;
const s04_IW = 0.866, s04_IH = 0.5;
const s04_CAGE = { ix: 1, iy: 7 };                 // Spawner-Block (auf dem Podest, iz 2)
const s04_PLAYER = { ix: 3, iy: 1 };
const s04_SLOT = { x: 258, y: 424, s: 112 };       // inventory slot the items fly into (now top-left)
// s05 hand-over geometry (identical numbers to s05_G / s05_PANEL)
const s04_GRID = { s: 84, pitch: 90, cx: CX, y0: 690 };

const s04_isPlinth = (ix, iy) => ix <= 2 && iy >= 6;
const s04_isWater = (ix, iy) => ix === 4 && iy >= 1 && iy <= 7;

const s04_PUMPKINS = [                  // a scattered patch down the ix 6 / 7 columns
  { ix: 6, iy: 1 }, { ix: 6, iy: 3 }, { ix: 6, iy: 4 }, { ix: 6, iy: 6 }, { ix: 6, iy: 7 },
  { ix: 7, iy: 2 }, { ix: 7, iy: 5 },
];
const s04_PICKLES = (() => { const o = []; for (let ix = 1; ix <= 2; ix++) for (let iy = 1; iy <= 5; iy++) o.push({ ix: ix, iy: iy }); return o; })();

/* one item every 0.25 s right through to the dive; the last three fly progressively
   faster so the cadence keeps climbing into the 12.0 cut instead of dying at 11.0 */
const s03_s04_ITEMS = (() => {
  // real HugoSMP AFK loot: pumpkins, sea pickles and spawner drops
  const kinds = ['pumpkin', 'sea_pickle', 'pumpkin', 'rotten_flesh', 'sea_pickle', 'bone', 'pumpkin', 'gunpowder', 'sea_pickle', 'string'];
  const out = []; let np = 0, ns = 0;
  for (let k = 0; k < kinds.length; k++) {
    const t0 = 9.25 + k * 0.25;
    const fl = t0 <= 10.75 ? 0.55 : t0 < 11.25 ? 0.45 : t0 < 11.50 ? 0.32 : 0.22;
    const kind = kinds[k];
    // the pumpkins are picked next to the player first, then further down the row
    const src = kind === 'pumpkin' ? s04_PUMPKINS[(2 + np++ * 3) % s04_PUMPKINS.length]
      : kind === 'sea_pickle' ? s04_PICKLES[(1 + ns++ * 4) % s04_PICKLES.length] : null;
    out.push({ k: k, t0: t0, fl: fl, kind: kind, src: src });
  }
  return out;
})();

function s03_s04_dive(t) { return ez(t, 11.60, 12.00, E.inOutCubic); }
/* Live anchor slot. The slot itself travels to its s05 place FAST (11.58–11.82) and only then
   does the 3x9 grid unfold around it (11.72–11.99) — that ordering is what keeps the panel
   inside the 1080 px frame at every moment of the dive. */
function s03_s04_slotNow(t) {
  const cp = s03_s04_dive(t);
  const mv = ez(t, 11.58, 11.82, E.outCubic);
  const uf = ez(t, 11.72, 11.99, E.outCubic);
  const u2 = uf > 0 ? lerp(0.52, 1, uf) : 0;
  return {
    x: lerp(s04_SLOT.x, s04_GRID.cx, mv),
    y: lerp(s04_SLOT.y, s04_GRID.y0, mv),
    s: lerp(s04_SLOT.s, s04_GRID.s, mv),
    cp: cp, mv: mv, uf: uf, u2: u2,
    pitch: s04_GRID.pitch * u2,
    ns: Math.min(s04_GRID.s, s04_GRID.pitch * u2 - 6),   // neighbour slots never overlap
  };
}

/* ---------------------------------------------------------------- world helpers */
// a cuboid of any proportion, centred on the block column (ix, iy), top face at hTop
function s04_box(ctx, ix, iy, hTop, bw, bd, bh, o) {
  const S = s04_ISO.size, c = isoPos(ix, iy, hTop, s04_ISO);
  const ax = c.x - (S * s04_IW * bw - S * s04_IW * bd) / 2;
  const ay = c.y - (S * s04_IH * bw + S * s04_IH * bd) / 2;
  return isoBox(ctx, ax, ay, bw, bd, bh, Object.assign({ size: S }, o || {}));
}
// build-in: every block drops in on the cut — now from the FRONT corner backwards
function s04_appear(t, d, off) {
  const t0 = 8.72 + ((s04_NX - 1 + s04_NY - 1) - d) * 0.012 + (off || 0);
  return ez(t, t0, t0 + 0.30, E.outBack);
}
// 1 = grown, 0 = just harvested; a crop regrows over ~0.9 s after it was picked
function s04_grown(t, cell) {
  let g = 1;
  for (const it of s03_s04_ITEMS) {
    if (it.src !== cell) continue;
    const dt = t - it.t0;
    if (dt < 0) continue;
    g = Math.min(g, dt < 0.07 ? 1 - dt / 0.07 : clamp(E.outBack(clamp((dt - 0.07) / 0.85))));
  }
  return clamp(g);
}
// a Minecraft item: blocks are drawn as real isometric blocks, everything else as a pixel item
function s04_itemDraw(ctx, kind, x, y, px, o) {
  const sp = SPRITES[kind];
  mcItem(ctx, kind, x, y, px / (sp ? sp.rows.length : 16), o || {});
}
// where a piece of loot is picked
function s04_srcPos(it) {
  if (!it.src) return isoPos(s04_CAGE.ix, s04_CAGE.iy, 3.1, s04_ISO);
  if (it.kind === 'pumpkin') return isoPos(it.src.ix, it.src.iy, 1, s04_ISO);
  return isoPos(it.src.ix, it.src.iy, 0.45, s04_ISO);
}

/* ---------------------------------------------------------------- sky & clouds
   Day-lit: a cool zenith over a warm low sun — the sun now sits on the LEFT, behind the
   spawner corner, and the voxel clouds drift the other way. */
const s04_CLOUDS = (() => {
  const r = rng(5211), out = [];
  for (let i = 0; i < 3; i++) {
    const cells = [], n = 8 + Math.floor(r() * 4);
    for (let k = 0; k < n; k++) cells.push({ ix: Math.floor(r() * 5), iy: Math.floor(r() * 3), iz: r() < 0.3 ? 1 : 0 });
    out.push({ cells: cells, x0: i * 400 + r() * 130, y: 946 + i * 54, size: 14 + r() * 7, sp: -(13 + r() * 13), a: 0.28 + r() * 0.14 });
  }
  return out;
})();
function s04_sky(ctx, t, fade) {
  ctx.save(); ctx.globalAlpha *= fade;
  linearFill(ctx, 0, 700, 0, 1560, [
    [0, 'rgba(30,26,58,0)'], [0.30, 'rgba(44,38,84,0.55)'], [0.62, 'rgba(86,58,92,0.50)'],
    [0.80, 'rgba(112,66,74,0.34)'], [1, 'rgba(20,14,28,0)']], [0, 700, W, 860]);
  radialFill(ctx, 300, 1090, 620, [[0, 'rgba(255,206,132,0.22)'], [0.40, 'rgba(255,150,86,0.09)'], [1, 'rgba(0,0,0,0)']], 'lighter');
  for (const c of s04_CLOUDS) {
    const span = W + 620, x = ((c.x0 + (t - 9) * c.sp) % span + span) % span - 300;
    cubeField(ctx, c.cells, { size: c.size, cx: x, cy: c.y, color: '#CFC8E4', alpha: c.a, topF: 1.28, leftF: 0.94, rightF: 0.70 });
  }
  ctx.restore();
}

/* ---------------------------------------------------------------- the farm world
   Everything (blocks, props, the player) goes into ONE painter list sorted by
   (ix + iy) and then height, so the player is correctly occluded by the rows in front. */
const s04_TREES = [{ ix: 6, iy: 0, h: 4, seed: 3 }];
const s04_CANOPY = (() => {             // compact oak: a ring of leaves and a small cap
  const o = [];
  for (let dx = -1; dx <= 1; dx++) for (let dy = -1; dy <= 1; dy++) if (dx || dy) o.push([dx, dy, 0]);
  o.push([0, 0, 1], [-1, 0, 1], [1, 0, 1], [0, -1, 1], [0, 1, 1]);
  return o;
})();
const s04_FENCE = [1, 3, 5];                      // fence posts down the ix 0 rim (varying iy)
const s04_TORCH = [[0, 1], [0, 5]];
const s04_PROPS = [                               // bushes and loose stones on the grass edges
  { ix: 8, iy: 0, s: 0.80, bush: true }, { ix: 8, iy: 3, s: 0.66, bush: true },
  { ix: 0, iy: 0, s: 0.58, bush: true }, { ix: 6, iy: 8, s: 0.62, bush: true },
  { ix: 8, iy: 6, s: 0.44 }, { ix: 4, iy: 8, s: 0.38 }, { ix: 0, iy: 4, s: 0.46 },
];

function s04_world(ctx, t) {
  const S = s04_ISO.size, L = [], glows = [];
  const add = (ix, iy, iz, fn) => L.push({ k: (ix + iy) * 64 + iz, fn: fn });
  const blk = (ix, iy, iz, tex, o) => cube(ctx, ix, iy, iz, Object.assign({ size: S, cx: s04_ISO.cx, cy: s04_ISO.cy, tex: tex }, o || {}));

  /* ---- terrain plate + the stepped cliff on the two visible edges */
  for (let ix = 0; ix < s04_NX; ix++) for (let iy = 0; iy < s04_NY; iy++) {
    const d = ix + iy, a = s04_appear(t, d);
    if (a <= 0.004) continue;
    const al = clamp(a * 2), drop = (1 - a) * 1.4;
    const plat = s04_isPlinth(ix, iy);                      // spawner corner
    const water = s04_isWater(ix, iy);
    let tex, dark = 0.04;
    if (plat) { tex = ((ix + iy) % 2) ? 'cobblestone' : 'stone'; dark = 0.34; }
    else if (water) { tex = 'water'; dark = 0.0; }
    else if (ix === 3) tex = 'cobblestone';                                        // the walkway
    else if (ix === 5 && iy === 3) tex = 'cobblestone';                             // bridge head
    else if (ix <= 2 && iy >= 1 && iy <= 5) tex = { top: 'farmland', side: 'dirt' };
    else if (ix === 5 && iy >= 1 && iy <= 7) tex = { top: 'farmland_crop', side: 'dirt' };
    else if (ix === 6 && iy >= 1 && iy <= 7) tex = { top: 'farmland', side: 'dirt' };
    else if (ix === 7 && iy >= 2 && iy <= 6) tex = { top: 'farmland_crop', side: 'dirt' };
    else tex = { top: 'grass_top', side: 'grass_side' };
    const bob = water ? -0.11 + 0.024 * Math.sin(t * 2.1 + (iy - ix) * 0.8) : 0;
    add(ix, iy, 0, () => blk(ix, iy, bob - drop, tex, { alpha: al, dark: dark }));
    if (water && ((iy + Math.floor(t * 2)) % 4 === 0)) {
      const p = isoPos(ix, iy, bob, s04_ISO);
      glows.push([p.x, p.y, 34, '#BFE4FF', 0.16 * al]);
    }
    // the cliff: two more layers under the front-right and front-left edge
    if (ix === s04_NX - 1 || iy === s04_NY - 1) {
      add(ix, iy, -1, () => blk(ix, iy, -1 - drop, 'dirt', { alpha: al, dark: 0.14 }));
      add(ix, iy, -2, () => blk(ix, iy, -2 - drop, ((ix + iy) % 3 === 0) ? 'cobblestone' : 'stone', { alpha: al, dark: 0.30 }));
    }
  }

  /* ---- the plank bridge across the canal (ix 4, iy 3) */
  {
    const a = s04_appear(t, 7, 0.22);
    if (a > 0.004) {
      const al = clamp(a * 2), lift = (1 - a) * 1.2;
      add(4, 3, 1, () => {
        s04_box(ctx, 4, 3, 0.22 - lift, 1.55, 0.80, 0.13, { tex: 'oak_planks', alpha: al, dark: 0.12 });
        for (const dy of [-0.42, 0.42]) {
          s04_box(ctx, 4, 3 + dy, 0.62 - lift, 1.55, 0.09, 0.10, { tex: 'oak_log_side', alpha: al, dark: 0.20 });
          for (const dx of [-0.62, 0.62])
            s04_box(ctx, 4 + dx, 3 + dy, 0.66 - lift, 0.13, 0.13, 0.48, { tex: { top: 'oak_log_top', side: 'oak_log_side' }, alpha: al, dark: 0.16 });
        }
      });
    }
  }

  /* ---- pumpkin patch (full blocks, they vanish when harvested and grow back) */
  for (const c of s04_PUMPKINS) {
    const a = s04_appear(t, c.ix + c.iy, 0.20), g = s04_grown(t, c);
    if (a <= 0.004 || g <= 0.02) continue;
    const sz = S * lerp(0.34, 1, g), al = clamp(a * 2);
    add(c.ix, c.iy, 1, () => {
      const p = isoPos(c.ix, c.iy, 0, s04_ISO);
      s03_s04_blk(ctx, p.x, p.y - sz + (1 - a) * 90, sz, '#E08020',
        { alpha: al, tex: { top: 'pumpkin_top', side: 'pumpkin_side' }, dark: 0.0 });
    });
  }

  /* ---- sea pickle patch: little glowing nubs on the farmland */
  for (const c of s04_PICKLES) {
    const a = s04_appear(t, c.ix + c.iy, 0.26), g = s04_grown(t, c);
    if (a <= 0.004 || g <= 0.02) continue;
    const al = clamp(a * 2);
    add(c.ix, c.iy, 1, () => {
      const sway = Math.sin(t * 1.6 + c.iy) * 0.008;
      for (let i = 0; i < 4; i++) {
        const h1 = hash2(c.iy * 5 + i, 41 + c.ix), h2 = hash2(c.iy * 3 + i * 7, 77 + c.ix * 3);
        const ox = -0.26 + 0.52 * h1, oy = -0.26 + 0.52 * h2;
        const m = S * (0.17 + 0.07 * h1) * lerp(0.3, 1, g);
        const p = isoPos(c.ix + ox, c.iy + oy + sway, 0, s04_ISO);
        const y = p.y - m + (1 - a) * 90;
        s03_s04_blk(ctx, p.x, y, m, '#4E7C2A', { alpha: al, topF: 1.45, leftF: 1.0, rightF: 0.70 });
        s03_s04_blk(ctx, p.x, y - m * 0.62, m * 0.55, '#C4DE62', { alpha: al, topF: 1.35, leftF: 1.0, rightF: 0.74 });
      }
      const q = isoPos(c.ix, c.iy, 0.25, s04_ISO);
      glows.push([q.x, q.y, 52, '#C9E86A', 0.13 * al * g]);
    });
  }

  /* ---- the oak on the back-right rim */
  for (const tr of s04_TREES) {
    const a = s04_appear(t, tr.ix + tr.iy, 0.06);
    if (a <= 0.004) continue;
    const al = clamp(a * 2), drop = (1 - a) * 1.8;
    for (let l = 1; l <= tr.h; l++) add(tr.ix, tr.iy, l, () => blk(tr.ix, tr.iy, l - drop, { top: 'oak_log_top', side: 'oak_log_side' }, { alpha: al, dark: 0.10 }));
    for (const [dx, dy, dz] of s04_CANOPY) {
      const ix = tr.ix + dx, iy = tr.iy + dy, iz = tr.h + dz;
      const sway = Math.sin(t * 0.75 + tr.seed + dz * 0.6) * 3.0 * (0.6 + dz * 0.4);
      add(ix, iy, iz, () => {
        const p = isoPos(ix, iy, iz - drop, s04_ISO);
        s03_s04_blk(ctx, p.x + sway, p.y, S, '#3F7A30', { alpha: al * 0.98, tex: 'oak_leaves', dark: 0.03 + 0.12 * (1 - dz) });
      });
    }
  }

  /* ---- oak fence + torches down the back-left rim (ix 0) */
  for (let i = 0; i < s04_FENCE.length; i++) {
    const iy = s04_FENCE[i], a = s04_appear(t, iy, 0.30);
    if (a <= 0.004) continue;
    const al = clamp(a * 2), lift = (1 - a) * 1.2;
    add(0, iy, 1, () => s04_box(ctx, 0, iy, 1 - lift, 0.20, 0.20, 1.0, { tex: { top: 'oak_log_top', side: 'oak_log_side' }, alpha: al, dark: 0.16 }));
    if (i < s04_FENCE.length - 1) {
      add(0, iy + 1, 1, () => {
        s04_box(ctx, 0, iy + 1, 0.86 - lift, 0.10, 2, 0.13, { tex: 'oak_log_side', alpha: al, dark: 0.20 });
        s04_box(ctx, 0, iy + 1, 0.48 - lift, 0.10, 2, 0.13, { tex: 'oak_log_side', alpha: al, dark: 0.24 });
      });
    }
  }
  for (const [ix, iy] of s04_TORCH) {
    const a = s04_appear(t, ix + iy, 0.36);
    if (a <= 0.004) continue;
    const al = clamp(a * 2), fl = 0.72 + 0.28 * Math.sin(t * 9.3 + iy) * Math.sin(t * 3.7 + iy * 2);
    add(ix, iy, 2, () => {
      s04_box(ctx, ix, iy, 1.58, 0.13, 0.13, 0.58, { tex: 'oak_log_side', alpha: al, dark: 0.10 });
      const p = isoPos(ix, iy, 1.62, s04_ISO);
      ctx.save(); ctx.globalAlpha *= al; ctx.fillStyle = '#FFD08A';
      ctx.fillRect(Math.round(p.x - 4), Math.round(p.y - 5), 8, 9); ctx.restore();
      glows.push([p.x, p.y, 88 + fl * 22, '#FFB25A', 0.30 * al * fl]);
      glows.push([p.x, p.y + 40, 150, '#FF9640', 0.10 * al * fl]);
    });
  }

  /* ---- a few bushes and boulders, so the edges are not bare grass */
  for (const b of s04_PROPS) {
    const a = s04_appear(t, b.ix + b.iy, 0.30);
    if (a <= 0.004) continue;
    const al = clamp(a * 2), lift = (1 - a) * 1.4;
    add(b.ix, b.iy, 1, () => {
      const sway = b.bush ? Math.sin(t * 0.9 + b.iy) * 2.2 : 0;
      const p = isoPos(b.ix, b.iy, 1 - lift, s04_ISO), m = S * b.s;
      s03_s04_blk(ctx, p.x + sway, p.y + (S - m), m, '#3F7A30',
        { alpha: al, tex: b.bush ? 'oak_leaves' : 'cobblestone', dark: b.bush ? 0.10 : 0.22 });
    });
  }

  /* ---- the spawner corner (now the LEFT corner): raised cobble plinth, wall, cage, chests */
  const ca = s04_appear(t, 9, 0.24), cal = clamp(ca * 2), cdrop = (1 - ca) * 1.5;
  if (ca > 0.004) {
    for (let ix = 0; ix <= 2; ix++) for (let iy = 6; iy <= 8; iy++)
      add(ix, iy, 1, () => blk(ix, iy, 1 - cdrop, ((ix + iy) % 2 === 0) ? 'cobblestone' : 'stone', { alpha: cal, dark: 0.38 }));
    // the wall that makes the corner a dark corner (along the back-left rim of the plinth)
    for (let iy = 6; iy <= 8; iy++) for (let l = 2; l <= 3; l++) {
      if (l === 3 && iy === 7) continue;                 // a gap in the wall, so it reads as built
      add(0, iy, l, () => blk(0, iy, l - cdrop, ((iy + l) % 2 === 0) ? 'cobblestone' : 'stone', { alpha: cal, dark: 0.52 }));
    }
    // the spawner block itself, with the mob turning in the fire
    add(s04_CAGE.ix, s04_CAGE.iy, 2, () => {
      blk(s04_CAGE.ix, s04_CAGE.iy, 2 - cdrop, 'spawner', { alpha: cal, dark: 0.0 });
      const p = isoPos(s04_CAGE.ix, s04_CAGE.iy, 1.5 - cdrop, s04_ISO);
      const fl = 0.55 + 0.45 * (0.5 + 0.5 * Math.sin(t * 5.4));
      glows.push([p.x, p.y + 10, 70 + fl * 24, '#FF8A2A', 0.34 * cal * fl]);
      glows.push([p.x, p.y, 240, '#C77DFF', 0.10 * cal * fl]);
      const q = isoPos(s04_CAGE.ix, s04_CAGE.iy, 2.62 - cdrop, s04_ISO);
      const m = S * 0.30, sp = Math.sin(t * 2.4), yy = q.y + Math.sin(t * 3.1) * 4;
      s03_s04_blk(ctx, q.x + sp * 7, yy, m, '#5BBD5B',
        { alpha: cal * 0.98, topF: 1.45, leftF: 1.15 + sp * 0.2, rightF: 0.78 - sp * 0.16 });
      s03_s04_blk(ctx, q.x + sp * 7, yy - m * 0.74, m * 0.6, '#2F7D32',
        { alpha: cal * 0.98, topF: 1.5, leftF: 1.1, rightF: 0.74 });
    });
    // iron bars around it
    const post = { tex: 'cobblestone', alpha: cal, dark: 0.42 }, bar = { tex: 'iron_block', alpha: cal, dark: 0.50 };
    for (const [dx, dy] of [[-0.46, -0.46], [0.46, -0.46], [-0.46, 0.46]])
      add(s04_CAGE.ix + dx, s04_CAGE.iy + dy, 3, () => s04_box(ctx, s04_CAGE.ix + dx, s04_CAGE.iy + dy, 2.75 - cdrop, 0.14, 0.14, 1.75, post));
    add(s04_CAGE.ix, s04_CAGE.iy, 3.2, () => {
      s04_box(ctx, s04_CAGE.ix, s04_CAGE.iy - 0.46, 2.75 - cdrop, 1.06, 0.12, 0.12, bar);
      s04_box(ctx, s04_CAGE.ix, s04_CAGE.iy + 0.46, 2.75 - cdrop, 1.06, 0.12, 0.12, bar);
      s04_box(ctx, s04_CAGE.ix - 0.46, s04_CAGE.iy, 2.75 - cdrop, 0.12, 1.06, 0.12, bar);
      s04_box(ctx, s04_CAGE.ix + 0.46, s04_CAGE.iy, 2.75 - cdrop, 0.12, 1.06, 0.12, bar);
    });
    // a torch on the wall so the corner has its own light
    add(1, 6, 3, () => {
      s04_box(ctx, 1, 6, 2.62 - cdrop, 0.14, 0.14, 0.62, { tex: 'oak_log_side', alpha: cal, dark: 0.10 });
      const p = isoPos(1, 6, 2.66 - cdrop, s04_ISO);
      const fl = 0.72 + 0.28 * Math.sin(t * 8.1) * Math.sin(t * 3.3);
      ctx.save(); ctx.globalAlpha *= cal; ctx.fillStyle = '#FFD08A';
      ctx.fillRect(Math.round(p.x - 4), Math.round(p.y - 6), 9, 10); ctx.restore();
      glows.push([p.x, p.y, 96 + fl * 26, '#FFB25A', 0.34 * cal * fl]);
    });
    // two chests on the plinth's open edge, lids ticking whenever spawner loot lands
    for (let i = 0; i < 2; i++) {
      const ix = 2, iy = 6 + i * 2, aa = s04_appear(t, ix + iy, 0.30);
      if (aa <= 0.004) continue;
      const al = clamp(aa * 2), lift = (1 - aa) * 1.4;
      let op = 0; for (const it of s03_s04_ITEMS) if (!it.src) op = Math.max(op, impulse(t, it.t0 + it.fl, 7));
      add(ix, iy, 2, () => {
        s04_box(ctx, ix, iy, 1.56 - lift, 0.84, 0.84, 0.56, { tex: { top: 'oak_planks', side: 'chest' }, alpha: al, dark: 0.30 });
        s04_box(ctx, ix, iy, 1.78 + op * 0.14 - lift, 0.84, 0.84, 0.22, { tex: { top: 'oak_planks', side: 'chest' }, alpha: al, dark: 0.22 });
      });
    }
  }

  /* ---- the AFK player, up on the cobble walkway, harvesting on every sixteenth */
  const pa = ez(t, 8.98, 9.30, E.outCubic);
  if (pa > 0.004) {
    let sw = 0;
    for (const it of s03_s04_ITEMS) sw = Math.max(sw, clamp(1 - Math.abs(t - (it.t0 - 0.05)) / 0.22));
    const walk = clamp(remap(t, 11.10, 11.50)) * 0.85;          // he works his way down the path
    const px = s04_PLAYER.ix, py = s04_PLAYER.iy + walk * 0.9;
    add(px, py, 0.5, () => {
      const p = isoPos(px, py, 0, s04_ISO);
      ctx.save(); ctx.globalAlpha *= clamp(pa * 1.6);
      ctx.save(); ctx.globalCompositeOperation = 'multiply';
      ctx.fillStyle = 'rgba(24,16,30,0.55)'; ctx.beginPath();
      ctx.ellipse(p.x, p.y + 5, S * 0.36, S * 0.18, 0, 0, TAU); ctx.fill(); ctx.restore();
      mcPlayer(ctx, p.x, p.y, {
        size: S, t: t, walk: walk, swing: sw, facing: 'left', lift: (1 - pa) * 1.6,
        held: { top: 'pumpkin_top', side: 'pumpkin_side' },
        outline: '#150E22', outlineAlpha: 0.28, outlineWidth: 1.2,
      });
      // Minecraft name tag over the head — this is the bot that is online for you
      const ny = p.y - S * (2.0 + (1 - pa) * 1.6) - 34;
      const nOpt = { size: 30, family: FONTS.term, weight: 400, color: '#FFFFFF', align: 'center' };
      const nw = measureText(ctx, 'HugoAFK', nOpt);
      ctx.globalAlpha *= 0.92;
      ctx.fillStyle = 'rgba(8,6,14,0.62)';
      ctx.fillRect(Math.round(p.x - nw / 2 - 10), Math.round(ny - 24), Math.round(nw + 20), 32);
      drawText(ctx, 'HugoAFK', p.x, ny, nOpt);
      ctx.restore();
    });
  }

  /* ---- paint back to front */
  L.sort((a, b) => a.k - b.k);
  for (const e of L) e.fn();

  /* ---- one soft sunlight wash over the plot, so the farm reads day-lit and not murky */
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  radialFill(ctx, s04_ISO.cx - 190, s04_ISO.cy + 150, 540,
    [[0, 'rgba(255,214,150,0.075)'], [0.55, 'rgba(255,180,110,0.035)'], [1, 'rgba(0,0,0,0)']]);
  ctx.restore();

  /* ---- all additive light in one pass (torches, spawner fire, pickles, water sparkle) */
  if (glows.length) {
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    for (const g of glows) dot(ctx, g[0], g[1], g[2], g[3], g[4]);
    ctx.restore();
  }
}

/* items popping out of the farm and arcing into the slot.
   NEW PATH: the loot is thrown OUT to the right and UP past the frame's right shoulder, then
   crosses the top of the frame from right to left into the slot in the top-left corner.
   It is dimmed hard while it passes behind the copy band. */
function s03_s04_flyingItems(ctx, t, slot) {
  let count = 0; const landed = [];
  for (const it of s03_s04_ITEMS) {
    if (t >= it.t0 + it.fl) { count++; landed.push(it); continue; }
    const p = remap(t, it.t0, it.t0 + it.fl);
    if (p <= 0) continue;
    const s = s04_srcPos(it);
    const a = [s.x, s.y - 26], b = [slot.x, slot.y];
    const c1 = [a[0] + 300, a[1] - 250], c2 = [935, 455];
    const q0 = s03_s04_bez3(E.inOutQuad(p), a, c1, c2, b);
    // last stretch pulls straight onto the slot centre — an item never docks beside it
    const snap = E.outCubic(clamp(remap(p, 0.60, 1)));
    const q = [lerp(q0[0], b[0], snap), lerp(q0[1], b[1], snap)];
    const px = lerp(46, 94, E.outBack(clamp(p * 3.2))) * lerp(1, 0.62, clamp(remap(p, 0.78, 1)));
    const gc = it.kind === 'sea_pickle' ? '#8FBF4A' : (it.kind === 'rotten_flesh' || it.kind === 'bone' || it.kind === 'string' || it.kind === 'gunpowder') ? TOKENS.violetHot : s03_s04_C.pumpkin;
    // vanish behind the copy band: the sprite hides completely, only its additive comet head
    // stays faintly readable, so nothing ever sits as a dark smudge on the headline
    const hide = win(q[1], 470, 566, 900, 992);
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    dot(ctx, q[0], q[1], px * 0.62, gc, 0.42 * (1 - p * 0.35) * lerp(1, 0.30, hide)); ctx.restore();
    if (hide < 0.985) {
      ctx.save(); ctx.globalAlpha *= 1 - hide;
      s04_itemDraw(ctx, it.kind, q[0], q[1], px, { rotate: (0.5 - p) * 0.55 });
      ctx.restore();
    }
    // pop dust at the source
    const d = impulse(t, it.t0, 14);
    if (d > 0.02) { ctx.save(); ctx.globalCompositeOperation = 'lighter'; dot(ctx, a[0], a[1] + 20, 70 * d, gc, 0.4 * d); ctx.restore(); }
  }
  return { count: count, last: landed.length ? landed[landed.length - 1] : null, landed: landed };
}

/* inventory: one slot until the dive, then it unfolds into the s05 3x9 grid.
   Final geometry is byte-identical to s05 (slot 84, pitch 90, panel 120..960 / 633..933)
   and the top row is handed over already filled, exactly like s05's first frame. */
const s03_s04_FILLORDER = [4, 3, 5, 2, 6, 1, 7, 0, 8];
/* The top row exactly as it stands when the dive ends: column c holds the kind s04 put
   there. s05 opens on this same row, so the 12.0 cut carries the loot over unchanged. */
const s03_s04_HANDOVER = (() => {
  const row = new Array(9).fill(null), n = s03_s04_ITEMS.length;
  for (let i = 0; i < s03_s04_FILLORDER.length; i++) {
    const it = s03_s04_ITEMS[n - 1 - i];
    if (it) row[s03_s04_FILLORDER[i]] = it.kind;
  }
  return row;
})();
function s03_s04_inventory(ctx, t, slot, landed) {
  const u2 = slot.u2, pitch = slot.pitch, ns = slot.ns;
  const slotFill = 'rgba(46,42,62,0.94)';
  const slotA = c => clamp(remap(u2, 0.50 + Math.abs(c - 4) * 0.030, 0.66 + Math.abs(c - 4) * 0.038));
  if (u2 > 0.01) {
    // panel: scaled around the anchor slot, so it can never leave the frame while unfolding
    const pa = ez(t, 11.70, 11.86, E.outCubic);
    ctx.save(); ctx.globalAlpha *= pa;
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    dot(ctx, slot.x, slot.y + pitch, 580 * u2, TOKENS.secondary, 0.24);
    ctx.restore();
    ctx.fillStyle = 'rgba(26,22,40,0.92)';
    roundRect(ctx, slot.x - 420 * u2, slot.y - 57 * u2, 840 * u2, 300 * u2, 12 * u2); ctx.fill();
    ctx.strokeStyle = rgba(TOKENS.secondary, 0.34); ctx.lineWidth = 2; ctx.stroke();
    ctx.restore();
  }
  // the 26 neighbour slots grow out of the anchor
  if (ns > 4) {
    for (let r = 0; r < 3; r++) for (let c = 0; c < 9; c++) {
      if (r === 0 && c === 4) continue;
      const a = clamp(remap(u2, 0.50 + (Math.abs(c - 4) + r * 1.15) * 0.030, 0.66 + (Math.abs(c - 4) + r * 1.15) * 0.038));
      if (a <= 0.004) continue;
      mcSlot(ctx, Math.round(slot.x + (c - 4) * pitch - ns / 2), Math.round(slot.y + r * pitch - ns / 2), ns, { alpha: a, fill: slotFill });
    }
  }
  // the anchor slot pops in on the 9.0 slam instead of just being there
  const ap = ez(t, 8.99, 9.30, E.outBack);
  if (ap <= 0.004) return;
  const asz = slot.s * lerp(1.30, 1, E.outExpo(clamp((t - 8.99) / 0.28)));
  ctx.save(); ctx.globalAlpha *= clamp(ap * 2.4);
  mcSlot(ctx, Math.round(slot.x - asz / 2), Math.round(slot.y - asz / 2), Math.round(asz), { fill: slotFill });
  ctx.restore();

  /* Collected loot. Before the dive the newest item sits in the anchor slot; while the grid
     unfolds the whole haul spills outward into the top row, so s04 hands s05 a filled row
     instead of an empty panel. */
  if (!landed.length) return;
  for (let i = 0; i < s03_s04_FILLORDER.length; i++) {
    const c = s03_s04_FILLORDER[i], it = landed[landed.length - 1 - i];
    if (!it) continue;
    let x = slot.x, y = slot.y, sz = slot.s, al = clamp(ap * 2.4);
    if (i > 0) {
      const a = clamp(remap(slotA(c), 0.55, 0.95));
      if (a <= 0.01) continue;
      x = slot.x + (c - 4) * pitch; sz = ns; al = a;
    }
    const pop = i === 0 ? 1 + 0.22 * impulse(t, it.t0 + it.fl, 13) : lerp(1.25, 1, al);
    ctx.save(); ctx.globalAlpha *= al;
    s04_itemDraw(ctx, it.kind, x, y, sz * 0.95 * pop);
    ctx.restore();
  }
}

/* subline: the three words light up on the eighths 9.5 / 9.75 / 10.0 */
const s03_s04_SUB = [
  { s: 'Pickle', t0: 9.50 }, { s: ' · ', t0: 9.62 },
  { s: 'Pumpkin', t0: 9.75 }, { s: ' · ', t0: 9.87 },
  { s: 'Spawner.', t0: 10.00 },
];
function s03_s04_subline(ctx, t) {
  const size = 46, o = { size: size, family: FONTS.head, weight: 500, tracking: 0.02 * size };
  let total = 0; const ws = [];
  for (const p of s03_s04_SUB) { const w = measureText(ctx, p.s, o); ws.push(w); total += w; }
  let x = CX - total / 2;
  for (let i = 0; i < s03_s04_SUB.length; i++) {
    const p = s03_s04_SUB[i], a = ez(t, p.t0, p.t0 + 0.22, E.outExpo);
    if (a > 0.004) {
      // after the intro the three words keep taking turns on every bar, so the line breathes
      const isWord = i % 2 === 0;
      const cyc = isWord ? pulse(t, 2.0, 6, p.t0 + 2.0) : 0;
      const hit = Math.max(impulse(t, p.t0, 7), cyc * 0.7);
      const opt = {
        size: size, family: FONTS.head, weight: 500, tracking: 0.02 * size, align: 'left',
        color: isWord ? mixColor('#F4F1F8', TOKENS.violetHot, hit * 0.85) : TOKENS.muted,
        alpha: (isWord ? 0.9 : 0.6) * a,
      };
      const yy = 880 + (1 - a) * 18;
      if (isWord && hit > 0.05) {
        ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha *= hit * 0.6;
        drawText(ctx, p.s, x, yy, Object.assign({}, opt, { alpha: 1, color: TOKENS.violetHot, glow: { color: TOKENS.violetHot, blur: 26 } }));
        ctx.restore();
      }
      drawText(ctx, p.s, x, yy, opt);
    }
    x += ws[i];
  }
}

/* counter beside the slot — now on its right, because the slot moved to the left edge */
function s03_s04_slotCounter(ctx, t, slot, count) {
  const a = ez(t, 8.99, 9.32, E.outCubic) * (1 - remap(t, 11.34, 11.56));
  if (a <= 0.004) return;
  let hit = 0;
  for (const it of s03_s04_ITEMS) hit = Math.max(hit, impulse(t, it.t0 + it.fl, 12));
  const x = slot.x + slot.s / 2 + 26, y = slot.y;
  ctx.save(); ctx.globalAlpha *= a;
  drawText(ctx, 'ITEMS', x, y - 36, { size: 21, family: FONTS.silk, weight: 700, color: TOKENS.muted, align: 'left', tracking: 3 });
  drawText(ctx, String(count), x, y + 18, { size: 62 * (1 + 0.13 * hit), family: FONTS.mono, weight: 600, color: mixColor(TOKENS.gold, '#FFFFFF', hit * 0.6), align: 'left' });
  ctx.restore();
  if (hit > 0.02) {
    ctx.save(); ctx.globalAlpha *= hit * a; ctx.strokeStyle = TOKENS.gold; ctx.lineWidth = 4;
    ctx.strokeRect(Math.round(slot.x - slot.s / 2) - 3, Math.round(slot.y - slot.s / 2) - 3, slot.s + 6, slot.s + 6);
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; dot(ctx, slot.x, slot.y, slot.s * 0.8, TOKENS.gold, 0.35 * hit); ctx.restore();
    ctx.restore();
  }
}

/* ------------------------------------------------------------------ s04 */
SCENES.s04 = {
  draw(ctx, lt, t) {
    const slot = s03_s04_slotNow(t), cp = slot.cp;
    const push = ez(t, 9.0, 11.6, E.inOutCubic);

    s04_sky(ctx, t, 1 - cp * 0.85);

    let items = { count: 0, last: null, landed: [] };
    ctx.save();
    // the farm never fades to nothing — it stays as a lit bed behind the inventory
    ctx.globalAlpha *= lerp(1, 0.12, clamp(remap(cp, 0.05, 0.58)));
    withCamera(ctx, {
      // a real push-in that drifts right and rises, instead of the old idle breath
      zoom: lerp(0.965, 1.10, push) * (1 + 0.014 * Math.sin((t - 9) * 0.95 - 0.4)) * lerp(1, 1.9, cp),
      x: lerp(-30, 26, push) + 10 * Math.sin((t - 9) * 0.55),
      y: lerp(34, -30, push) - 8 * Math.sin((t - 9) * 0.72) + lerp(0, 460, cp),
      ox: CX, oy: 1250,
    }, c => {
      s03_s04_groundGlow(c, s04_ISO.cx - 40, 1800, 470, 120, TOKENS.deepViolet, 0.26 * ez(t, 8.90, 9.25, E.outCubic));
      s04_world(c, t);
      items = s03_s04_flyingItems(c, t, slot);
    });
    ctx.restore();

    const ta = 1 - remap(t, 11.28, 11.58);
    if (ta > 0.004) {
      ctx.save(); ctx.globalAlpha *= ta;
      ctx.translate(0, -2.5 * Math.sin((t - 9) * 1.1));
      band(ctx, 748, 430, 0.55);
      const hOpt = { size: 120, family: FONTS.body, weight: 800, color: TOKENS.text, align: 'center' };
      const s1 = s03_s04_fit(ctx, '24/7 an', hOpt, 796), s2 = s03_s04_fit(ctx, 'deiner Farm.', hOpt, 796);
      s03_s04_slam(ctx, '24/7 an', CX, 640, Object.assign({}, hOpt, { size: s1, tracking: -0.04 * s1 }), t, 8.97);
      s03_s04_slam(ctx, 'deiner Farm.', CX, 760, Object.assign({}, hOpt, { size: s2, tracking: -0.04 * s2 }), t, 9.09);
      s03_s04_subline(ctx, t);
      ctx.restore();
    }

    s03_s04_inventory(ctx, t, slot, items.landed);
    s03_s04_slotCounter(ctx, t, slot, items.count);
  },
};
