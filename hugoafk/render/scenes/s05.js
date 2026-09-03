/* s05.js
   s05  12.0–15.0  "Inventar voll?" / "Verkauft sich selbst."  — Sell-Makro.
   Minecraft-Inventar (3x9 mcSlot + Hotbar), Slots füllen sich auf Sechzehnteln,
   VOLL-Blitz bei 12.70, '/sell' tippt sich 12.82–13.14, Enter 13.20 (Item-Sog nach
   unten + Münzflug nach oben + Guthaben-Zähler in Bewegung), grüner Haken 13.40.
   Alles ist eine reine Funktion von t. Alle Modul-Helfer sind mit s05_ präfixiert.

   Geometrie ist bewusst identisch zur Übergabe aus s04 (Slot 84, Pitch 90,
   Raster-Mitten CX + (c-4)*90 / 690,780,870, Panel x120..960 y633..933),
   damit der Schnitt bei 12.0 nahtlos sitzt; das Panel wächst danach nach unten
   und gibt die Hotbar frei. */

/* ------------------------------------------------------------------ palette */
const s05_C = {
  panel: 'rgba(26,22,40,0.92)',
  slot: 'rgba(46,42,62,0.94)',
  slotEmpty: 'rgba(34,30,48,0.94)',
  bar: 'rgba(8,6,14,0.72)',
  chat: 'rgba(6,5,11,0.60)',
};

/* ------------------------------------------------------------------ geometry */
const s05_G = { s: 84, gap: 6, pitch: 90, cx: CX, y0: 690, cols: 9, rows: 3 };
const s05_PANEL = { x: 120, y: 633, w: 840, hFrom: 300, hTo: 407 };  // 633..933 -> 633..1040
const s05_HOT = { y: 936, s: 84, gap: 6, sel: 4 };
const s05_CHIP = { y: 1092, w: 462, h: 76 };
const s05_LOG = { x: 140, y: 1136, w: 540, h: 140 };
const s05_INP = { x: 140, y: 1296, w: 760, h: 72 };

// centre of grid slot index i (row-major, 0..26)
function s05_slotXY(i) {
  const r = Math.floor(i / 9), c = i % 9;
  return { x: s05_G.cx + (c - 4) * s05_G.pitch, y: s05_G.y0 + r * s05_G.pitch, r: r, c: c };
}
function s05_hotXY(k) {
  const total = 9 * s05_HOT.s + 8 * s05_HOT.gap;
  return { x: CX - total / 2 + k * (s05_HOT.s + s05_HOT.gap) + s05_HOT.s / 2, y: s05_HOT.y + s05_HOT.s / 2 };
}

/* ------------------------------------------------------------------ tiny helpers */
// shrink a headline until it fits maxW (keeps the -0.04em tracking of the style guide)
function s05_fit(ctx, str, o, maxW) {
  let size = o.size;
  for (let k = 0; k < 40 && size > 96; k++) {
    if (measureText(ctx, str, Object.assign({}, o, { size: size, tracking: -0.04 * size })) <= maxW) break;
    size -= 2;
  }
  return size;
}
// headline slam: scale 1.18 -> 1.0 (outExpo) + ~3 frames RGB split
function s05_slam(ctx, str, x, y, o, t, t0, dur) {
  const p = clamp((t - t0) / (dur || 0.15));
  if (p <= 0) return;
  const e = E.outExpo(p);
  if (t - t0 < 0.1) FX.rgb = Math.max(FX.rgb, 8 * (1 - e));
  ctx.save();
  ctx.translate(x, y); ctx.scale(lerp(1.18, 1, e), lerp(1.18, 1, e));
  drawText(ctx, str, 0, 0, Object.assign({}, o, { alpha: (o.alpha != null ? o.alpha : 1) * clamp(p * 6) }));
  ctx.restore();
}
// item icon at a target pixel height (sprites are 8 or 10 rows high)
function s05_icon(ctx, name, x, y, px, o) {
  const sp = SPRITES[name]; if (!sp) return;
  itemIcon(ctx, name, x, y, px / sp.rows.length, o);
}
const s05_GLOWC = { pumpkin: '#E08020', sea_pickle: '#8FBF4A', rotten_flesh: '#8A4433', bone: '#E9E5D2', string: '#E9E5D2', gunpowder: '#767676', emerald: '#19C46B', gold_ingot: TOKENS.gold, coin: TOKENS.gold };

/* ------------------------------------------------------------------ item tables */
// 27 slots fill in six bursts on the sixteenths 12.00 … 12.625 (4–5 slots per burst,
// 18 ms micro-stagger inside a burst) — full at ~12.70.
const s05_BURSTS = [5, 5, 5, 4, 4, 4];
const s05_ITEMS = (() => {
  const out = [], r = rng(505);
  let i = 0;
  for (let g = 0; g < s05_BURSTS.length; g++) {
    for (let j = 0; j < s05_BURSTS[g]; j++, i++) {
      const v = r();
      const kind = v < 0.42 ? 'pumpkin' : v < 0.64 ? 'sea_pickle' : v < 0.78 ? 'rotten_flesh' : v < 0.88 ? 'bone' : v < 0.95 ? 'gunpowder' : 'string';
      const p = s05_slotXY(i);
      out.push({
        i: i, kind: kind, x: p.x, y: p.y, row: p.r, col: p.c,
        t0: (g === 0 ? 11.955 : 12.0 + g * 0.125) + j * 0.018,
        // Sog nach unten: untere Reihe zuerst, von links nach rechts
        tOut: 13.20 + (2 - p.r) * 0.022 + p.c * 0.009,
        wob: r() * 6.283,
      });
    }
  }
  return out;
})();
const s05_FULL_T = 12.70;
const s05_ENTER_T = 13.20;

// hotbar loot: pops in over the first three frames, leaves with the sale
const s05_HOTITEMS = (() => {
  const out = [], r = rng(77);
  for (let k = 0; k < 9; k++) {
    const v = r();
    out.push({ k: k, kind: v < 0.38 ? 'pumpkin' : v < 0.62 ? 'sea_pickle' : v < 0.78 ? 'rotten_flesh' : v < 0.88 ? 'bone' : v < 0.95 ? 'gunpowder' : 'string', t0: 12.01 + k * 0.012, tOut: 13.20 + 0.045 + k * 0.010 });
  }
  return out;
})();

// coins: rise out of the grid after the sale
const s05_COINS = (() => {
  const out = [], r = rng(9051);
  for (let n = 0; n < 24; n++) {
    const src = s05_slotXY(Math.floor(r() * 27));
    out.push({
      i: n,
      x: src.x + (r() - 0.5) * 60, y: src.y + (r() - 0.5) * 40,
      t0: 13.20 + r() * 0.34, dur: 0.52 + r() * 0.24,
      dx: (r() - 0.5) * 190, rise: 250 + r() * 190,
      sz: 30 + r() * 16, ph: r() * 6.283,
    });
  }
  return out;
})();

// the macro keeps running: items drop back in during the tail (Achtel-Raster)
const s05_REFILL = [
  { i: 0, kind: 'pumpkin', t0: 13.875 }, { i: 1, kind: 'sea_pickle', t0: 14.125 },
  { i: 2, kind: 'pumpkin', t0: 14.375 }, { i: 3, kind: 'rotten_flesh', t0: 14.50 },
  { i: 4, kind: 'sea_pickle', t0: 14.625 }, { i: 5, kind: 'bone', t0: 14.75 },
  { i: 6, kind: 'pumpkin', t0: 14.875 },
];

/* ------------------------------------------------------------------ Tiefe: dunkle Voxel-Ebene unter dem Panel (reine Deko, unterhalb der Safe-Area) */
const s05_FLOORCELLS = (() => {
  const out = [], r = rng(311);
  for (let ix = 0; ix < 7; ix++) for (let iy = 0; iy < 7; iy++) {
    const v = r();
    out.push({ ix: ix, iy: iy, iz: v < 0.14 ? 1 : 0, color: v < 0.14 ? '#2A2340' : v < 0.55 ? '#221D33' : '#1B1729', ph: r() * 6.283 });
  }
  return out;
})();
function s05_floor(ctx, t) {
  const o = { size: 52, cx: CX, cy: 1690, alpha: 0.55, outline: '#0A0810', outlineAlpha: 0.30 };
  ctx.save(); ctx.globalAlpha *= 0.22;
  cubeField(ctx, s05_FLOORCELLS.map(c => ({ ix: c.ix - 3, iy: c.iy - 3, iz: c.iz, color: c.color })), o);
  ctx.restore();
  // aufsteigende Voxel-Motes
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  for (let i = 0; i < 14; i++) {
    const x = 120 + hash2(i, 5) * 840, sp = 26 + hash2(i, 9) * 34;
    const y = 1880 - (((t - 12) * sp + hash2(i, 3) * 700) % 700);
    ctx.globalAlpha = 0.20 * (1 - remap(y, 1400, 1180));
    ctx.fillStyle = TOKENS.violetHot; ctx.fillRect(x, y, 4, 4);
  }
  ctx.restore();
}

/* ------------------------------------------------------------------ panel + grid */
function s05_panelRect(t) {
  const h = lerp(s05_PANEL.hFrom, s05_PANEL.hTo, ez(t, 12.0, 12.30, E.outCubic));
  return { x: s05_PANEL.x, y: s05_PANEL.y, w: s05_PANEL.w, h: h };
}
function s05_panel(ctx, t) {
  const R = s05_panelRect(t);
  // soft violet bed (cached sprite, no filter)
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  dot(ctx, CX, R.y + R.h * 0.5, 560, TOKENS.secondary, 0.13);
  const red = win(t, s05_FULL_T, s05_FULL_T + 0.05, 13.05, s05_ENTER_T + 0.06);
  if (red > 0.01) dot(ctx, CX, R.y + R.h * 0.5, 520, TOKENS.primary, 0.16 * red);
  const grn = win(t, 13.40, 13.50, 13.9, 14.4);
  if (grn > 0.01) dot(ctx, CX, R.y + R.h * 0.5, 480, TOKENS.ok, 0.09 * grn);
  ctx.restore();

  ctx.save();
  ctx.fillStyle = s05_C.panel; roundRect(ctx, R.x, R.y, R.w, R.h, 12); ctx.fill();
  // border: violet -> rot (voll) -> grün (verkauft)
  const flash = impulse(t, s05_FULL_T, 9), pulseFull = red * (0.45 + 0.55 * pulse(t, 0.5, 5, s05_FULL_T));
  const ok = win(t, 13.40, 13.48, 13.75, 14.15);
  let col = TOKENS.secondary, a = 0.30;
  if (pulseFull > 0.02) { col = TOKENS.primary; a = lerp(0.30, 0.95, clamp(pulseFull + flash)); }
  if (ok > 0.02) { col = mixColor(TOKENS.secondary, TOKENS.ok, ok); a = lerp(0.30, 0.8, ok); }
  ctx.strokeStyle = rgba(col, a); ctx.lineWidth = 2 + 3 * Math.max(flash, ok * 0.5);
  roundRect(ctx, R.x, R.y, R.w, R.h, 12); ctx.stroke();
  ctx.restore();

  // separator above the hotbar
  const hb = ez(t, 12.05, 12.32, E.outCubic);
  if (hb > 0.01) {
    ctx.save(); ctx.globalAlpha *= hb * 0.5;
    ctx.fillStyle = 'rgba(255,255,255,0.10)'; ctx.fillRect(R.x + 22, 926, R.w - 44, 2);
    ctx.restore();
  }
  return R;
}

function s05_grid(ctx, t) {
  const s = s05_G.s;
  for (let i = 0; i < 27; i++) {
    const p = s05_slotXY(i);
    mcSlot(ctx, Math.round(p.x - s / 2), Math.round(p.y - s / 2), s, { fill: t > s05_ENTER_T + 0.5 ? s05_C.slotEmpty : s05_C.slot });
  }
  // slot flash when an item lands
  ctx.save();
  for (const it of s05_ITEMS) {
    const f = impulse(t, it.t0, 16);
    if (f < 0.03) continue;
    ctx.globalAlpha = f * 0.85;
    ctx.strokeStyle = rgba(TOKENS.gold, 1); ctx.lineWidth = 3;
    ctx.strokeRect(Math.round(it.x - s / 2) + 1.5, Math.round(it.y - s / 2) + 1.5, s - 3, s - 3);
  }
  ctx.restore();
}

// nach dem Verkauf: violetter Suchbalken läuft über das leere Raster (das Makro arbeitet weiter)
function s05_scan(ctx, t) {
  const a = ez(t, 13.55, 13.85, E.outCubic);
  if (a <= 0.01) return;
  const gx0 = s05_G.cx - 4.5 * s05_G.pitch, gw = 9 * s05_G.pitch;
  const q = ((t - 13.55) / 1.15) % 1, x = gx0 - 120 + q * (gw + 240);
  ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha *= a * 0.5;
  ctx.beginPath(); ctx.rect(gx0, s05_G.y0 - 45, gw, 3 * s05_G.pitch); ctx.clip();
  linearFill(ctx, x - 110, 0, x + 110, 0,
    [[0, rgba(TOKENS.secondary, 0)], [0.5, rgba(TOKENS.violetHot, 0.22)], [1, rgba(TOKENS.secondary, 0)]],
    [x - 110, s05_G.y0 - 45, 220, 3 * s05_G.pitch]);
  ctx.restore();
}

// item inside a slot: pop-in, idle bob, then the downward suck
function s05_gridItems(ctx, t) {
  const R = s05_panelRect(t);
  ctx.save();
  ctx.beginPath(); ctx.rect(R.x + 2, R.y + 2, R.w - 4, 924 - R.y); ctx.clip();
  for (const it of s05_ITEMS) {
    if (t < it.t0) continue;
    const pop = E.outBack(clamp((t - it.t0) / 0.13));
    let x = it.x, y = it.y, sc = lerp(1.55, 1, pop), a = clamp((t - it.t0) / 0.05);
    if (t >= it.tOut) {
      const q = clamp((t - it.tOut) / 0.38);
      y += 300 * q * q;
      x = lerp(it.x, CX + (it.x - CX) * 0.22, E.inQuad(q));
      sc *= 1 - 0.4 * q; a *= 1 - remap(q, 0.5, 1);
    } else {
      y += Math.sin(t * 2.1 + it.wob) * 2.2;
    }
    if (a <= 0.01) continue;
    s05_icon(ctx, it.kind, x, y, 58 * sc, { alpha: a });
  }
  // Nachschub im Tail: das Makro läuft weiter
  for (const rf of s05_REFILL) {
    if (t < rf.t0) continue;
    const p = s05_slotXY(rf.i), pop = E.outBack(clamp((t - rf.t0) / 0.14));
    s05_icon(ctx, rf.kind, p.x, p.y - (1 - pop) * 26, 58 * lerp(1.4, 1, pop), { alpha: clamp((t - rf.t0) / 0.05) });
    const f = impulse(t, rf.t0, 16);
    if (f > 0.03) {
      ctx.save(); ctx.globalAlpha = f * 0.7; ctx.strokeStyle = rgba(TOKENS.gold, 1); ctx.lineWidth = 3;
      ctx.strokeRect(Math.round(p.x - 42) + 1.5, Math.round(p.y - 42) + 1.5, 81, 81); ctx.restore();
    }
  }
  // Sog: violetter Abwärts-Schleier unter dem Raster
  const sog = win(t, s05_ENTER_T, s05_ENTER_T + 0.06, s05_ENTER_T + 0.30, s05_ENTER_T + 0.55);
  if (sog > 0.01) {
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    linearFill(ctx, 0, 830, 0, 926, [[0, rgba(TOKENS.secondary, 0)], [1, rgba(TOKENS.violetHot, 0.30 * sog)]], [R.x + 4, 830, R.w - 8, 96]);
    ctx.restore();
  }
  ctx.restore();
}

function s05_hotbar(ctx, t) {
  const a = ez(t, 12.03, 12.30, E.outCubic);
  if (a <= 0.01) return;
  const dy = (1 - a) * 46;
  ctx.save(); ctx.globalAlpha *= a; ctx.translate(0, dy);
  // Trägerplatte: hebt die Hotbar optisch vom 3x9-Raster ab
  ctx.fillStyle = 'rgba(255,255,255,0.045)';
  roundRect(ctx, 132, s05_HOT.y - 10, 816, s05_HOT.s + 20, 8); ctx.fill();
  ctx.save();
  ctx.beginPath(); ctx.rect(120, s05_HOT.y - 14, 840, s05_HOT.s + 28); ctx.clip();
  mcHotbar(ctx, CX, s05_HOT.y,{ slot: s05_HOT.s, gap: s05_HOT.gap, count: 9, selected: s05_HOT.sel, selColor: rgba(TOKENS.text, 0.9) });
  for (const h of s05_HOTITEMS) {
    if (t < h.t0) continue;
    const p = s05_hotXY(h.k), pop = E.outBack(clamp((t - h.t0) / 0.13));
    let x = p.x, y = p.y, sc = lerp(1.5, 1, pop), al = 1;
    if (t >= h.tOut) {
      const q = clamp((t - h.tOut) / 0.34);
      y += 260 * q * q; sc *= 1 - 0.4 * q; al = 1 - remap(q, 0.45, 1);
    }
    if (al <= 0.01) continue;
    s05_icon(ctx, h.kind, x, y, 56 * sc, { alpha: al });
  }
  ctx.restore();
  ctx.restore();
}

/* ------------------------------------------------------------------ VOLL */
function s05_voll(ctx, t) {
  const a = win(t, s05_FULL_T - 0.005, s05_FULL_T + 0.03, 12.96, 13.12);
  if (a <= 0.01) return;
  // 2-Frame-Flacker direkt nach dem Blitz
  const fl = (t - s05_FULL_T) < 0.12 && Math.floor((t - s05_FULL_T) * 30) % 2 === 1 ? 0.35 : 1;
  const pop = E.outBack(clamp((t - s05_FULL_T) / 0.14));
  const sz = 76 * lerp(1.35, 1, pop);
  ctx.save(); ctx.globalAlpha *= a * fl;
  band(ctx, 780, 152, 0.66);
  const o = { size: sz, family: FONTS.pixel, weight: 400, color: TOKENS.primary, align: 'center' };
  drawText(ctx, 'VOLL', CX, 780, Object.assign({}, o, { stroke: { color: '#0A0610', width: 10 }, strokeOnly: true }));
  glow(ctx, 26, 0.55, c => drawText(c, 'VOLL', CX, 780, o));
  drawText(ctx, 'VOLL', CX, 780, o);
  ctx.restore();
  // roter Rahmenblitz am Raster
  const f = impulse(t, s05_FULL_T, 11);
  if (f > 0.02) {
    ctx.save(); ctx.globalAlpha *= f;
    ctx.strokeStyle = TOKENS.primary; ctx.lineWidth = 5;
    ctx.strokeRect(s05_G.cx - 4.5 * s05_G.pitch + 1, s05_G.y0 - 45, 9 * s05_G.pitch - 6, 3 * s05_G.pitch - 6);
    ctx.restore();
  }
}

/* ------------------------------------------------------------------ Münzflug */
function s05_coins(ctx, t) {
  ctx.save();
  for (const c of s05_COINS) {
    const q = clamp((t - c.t0) / c.dur);
    if (q <= 0 || q >= 1) continue;
    const e = E.outCubic(q);
    const x = c.x + c.dx * e + Math.sin(q * 7 + c.ph) * 10;
    const y = c.y - c.rise * e;
    const a = clamp(q * 6) * (1 - remap(q, 0.55, 1)) * (1 - remap(y, 660, 500));
    if (a <= 0.01) continue;
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = a * 0.5;
    dot(ctx, x, y, c.sz * 1.1, TOKENS.gold, 0.6); ctx.restore();
    s05_icon(ctx, c.i % 3 === 0 ? 'emerald' : 'gold_ingot', x, y, c.sz * (1 + 0.12 * Math.sin(q * 12 + c.ph)), { alpha: a });
  }
  ctx.restore();
}

/* ------------------------------------------------------------------ Guthaben-Zähler
   Zeigt ausschließlich Bewegung: die Ziffernwalzen laufen durchgehend weiter,
   es wird nie ein konkreter Betrag behauptet. */
function s05_reelSpeed(t) {           // Ziffern pro Sekunde (Walze ganz rechts)
  const d = Math.max(0, t - s05_ENTER_T);
  return 30 * Math.exp(-2.0 * d) + 2.2;
}
function s05_reelPhase(t, f) {        // Integral der Geschwindigkeit
  const d = Math.max(0, t - s05_ENTER_T);
  return f * (30 / 2.0 * (1 - Math.exp(-2.0 * d)) + 2.2 * d);
}
const s05_REELF = [0.10, 0.19, 0.35, 0.62, 1.0];
function s05_balance(ctx, t) {
  const a = ez(t, s05_ENTER_T, s05_ENTER_T + 0.16, E.outCubic);
  if (a <= 0.01) return;
  const pop = E.outBack(clamp((t - s05_ENTER_T) / 0.24));
  const w = s05_CHIP.w, h = s05_CHIP.h, y = s05_CHIP.y, x = CX - w / 2;
  const jump = impulse(t, s05_ENTER_T, 7);
  ctx.save(); ctx.globalAlpha *= a;
  ctx.translate(CX, y); ctx.scale(lerp(0.86, 1, pop), lerp(0.86, 1, pop)); ctx.translate(-CX, -y + jump * -8);

  ctx.fillStyle = 'rgba(14,11,22,0.88)'; roundRect(ctx, x, y - h / 2, w, h, 10); ctx.fill();
  ctx.strokeStyle = rgba(TOKENS.gold, 0.28 + 0.45 * jump); ctx.lineWidth = 2; roundRect(ctx, x, y - h / 2, w, h, 10); ctx.stroke();

  drawText(ctx, 'GUTHABEN', x + 26, y, { size: 22, family: FONTS.silk, weight: 700, color: TOKENS.muted, align: 'left', tracking: 2 });

  // Aufwärts-Pfeil
  const ax = x + 206, ay = y - 1 + Math.sin(t * 6) * 1.5;
  ctx.save(); ctx.globalAlpha *= 0.85 + 0.15 * jump; ctx.fillStyle = TOKENS.gold;
  ctx.beginPath(); ctx.moveTo(ax, ay - 14); ctx.lineTo(ax + 13, ay + 8); ctx.lineTo(ax - 13, ay + 8); ctx.closePath(); ctx.fill();
  ctx.restore();

  // Ziffernwalzen — laufen durchgehend weiter, es steht nie ein Betrag still
  const n = s05_REELF.length, dw = 40, rh = 60, rx0 = x + w - 26 - n * dw;
  const v = s05_reelSpeed(t);
  ctx.fillStyle = 'rgba(0,0,0,0.45)'; roundRect(ctx, rx0 - 10, y - rh / 2, n * dw + 20, rh, 6); ctx.fill();
  ctx.save();
  ctx.beginPath(); ctx.rect(rx0 - 10, y - rh / 2, n * dw + 20, rh); ctx.clip();
  for (let k = 0; k < n; k++) {
    const base = s05_reelPhase(t, s05_REELF[k]), frac = base - Math.floor(base), fl = Math.floor(base);
    const blur = clamp(v * s05_REELF[k] * 2.0, 0, 15);
    const cxk = rx0 + k * dw + dw / 2;
    for (let m = -1; m <= 1; m++) {
      const d = ((fl + m) % 10 + 10) % 10;
      const yy = y + (m - frac) * rh;
      const fade = 1;
      for (let b = -1; b <= 1; b++) {
        drawText(ctx, String(d), cxk, yy + b * blur * 0.5, {
          size: 40, family: FONTS.mono, weight: 600, color: TOKENS.gold, align: 'center',
          alpha: (b === 0 ? 0.95 : 0.24) * fade,
        });
      }
    }
  }
  // obere/untere Abdunklung der Walzenfenster
  linearFill(ctx, 0, y - rh / 2, 0, y - rh / 2 + 22, [[0, 'rgba(12,9,19,0.98)'], [1, 'rgba(12,9,19,0)']], [rx0 - 10, y - rh / 2, n * dw + 20, 22]);
  linearFill(ctx, 0, y + rh / 2 - 22, 0, y + rh / 2, [[0, 'rgba(12,9,19,0)'], [1, 'rgba(12,9,19,0.98)']], [rx0 - 10, y + rh / 2 - 22, n * dw + 20, 22]);
  ctx.restore();
  ctx.restore();
}

/* ------------------------------------------------------------------ Chat */
const s05_TYPE_T = [12.82, 12.90, 12.98, 13.06, 13.14];
function s05_chat(ctx, t) {
  // Eingabezeile (Live-Konsole: liegt die ganze Szene an)
  const inA = ez(t, 11.98, 12.22, E.outCubic);
  if (inA > 0.01) {
    const I = s05_INP, active = t >= 12.78 && t < s05_ENTER_T;
    ctx.save(); ctx.globalAlpha *= inA * (active ? 1 : 0.8);
    ctx.fillStyle = s05_C.bar; ctx.fillRect(I.x, I.y, I.w, I.h);
    ctx.fillStyle = rgba(TOKENS.text, active ? 0.16 : 0.08); ctx.fillRect(I.x, I.y, I.w, 2); ctx.fillRect(I.x, I.y + I.h - 2, I.w, 2);
    ctx.fillStyle = rgba(TOKENS.secondary, active ? 0.55 : 0.25); ctx.fillRect(I.x, I.y, 3, I.h);
    const enter = impulse(t, s05_ENTER_T, 16);
    if (enter > 0.02) { ctx.save(); ctx.globalAlpha *= enter * 0.13; ctx.fillStyle = TOKENS.text; ctx.fillRect(I.x, I.y, I.w, I.h); ctx.restore(); }
    let n = 0; for (const tt of s05_TYPE_T) if (t >= tt) n++;
    if (t >= s05_ENTER_T + 0.07) n = 0;
    const txt = '/sell'.slice(0, n);
    const o = { size: 44, family: FONTS.term, weight: 400, color: TOKENS.text, align: 'left' };
    const tx = I.x + 52, ty = I.y + I.h / 2 + 2;
    drawText(ctx, '>', I.x + 24, ty, { size: 40, family: FONTS.term, weight: 400, color: rgba(TOKENS.muted, 0.85), align: 'left' });
    if (txt) drawText(ctx, txt, tx, ty, o);
    const cw = measureText(ctx, txt, o);
    const blink = active ? (t - (s05_TYPE_T[Math.max(0, n - 1)] || 12.8)) < 0.10 || Math.floor(t * 3.2) % 2 === 0 : Math.floor(t * 2.2) % 2 === 0;
    if (blink) { ctx.fillStyle = rgba(TOKENS.text, active ? 0.9 : 0.55); ctx.fillRect(tx + cw + 4, ty - 22, 20, 44); }
    ctx.restore();
  }

  // Chat-Log
  const l1 = ez(t, s05_ENTER_T + 0.02, s05_ENTER_T + 0.16, E.outCubic);
  const l2 = ez(t, 13.40, 13.54, E.outCubic);
  if (l1 <= 0.01) return;
  const L = s05_LOG;
  ctx.save();
  ctx.globalAlpha *= clamp(l1 * 1.5);
  ctx.fillStyle = s05_C.chat; ctx.fillRect(L.x, L.y, L.w, L.h);
  ctx.fillStyle = rgba(TOKENS.secondary, 0.28); ctx.fillRect(L.x, L.y, 3, L.h);
  ctx.restore();

  ctx.save(); ctx.globalAlpha *= l1;
  drawText(ctx, '/sell', L.x + 26 - (1 - l1) * 24, L.y + 40, { size: 42, family: FONTS.term, weight: 400, color: TOKENS.text, align: 'left', alpha: 0.95 });
  ctx.restore();

  if (l2 > 0.01) {
    const ping = impulse(t, 13.40, 6);
    ctx.save(); ctx.globalAlpha *= l2;
    s05_icon(ctx, 'check', L.x + 48, L.y + 100, 46 * (1 + 0.28 * ping));
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    dot(ctx, L.x + 48, L.y + 100, 60 * (1 + ping), TOKENS.ok, 0.30 + 0.4 * ping);
    ctx.restore();
    drawText(ctx, 'Verkauft.', L.x + 86 - (1 - l2) * 20, L.y + 100, { size: 42, family: FONTS.term, weight: 400, color: TOKENS.ok, align: 'left' });
    ctx.restore();
    if (ping > 0.02) shockwave(ctx, L.x + 48, L.y + 100, clamp((t - 13.40) / 0.5), { radius: 240, color: TOKENS.ok, width: 8, alpha: 0.5 });
  }
}

/* ------------------------------------------------------------------ Text-Block */
function s05_text(ctx, t) {
  // Headline 'Inventar voll?' — Slam bei 12.10, steht bis zum Schnitt
  const hOpt = { size: 120, family: FONTS.body, weight: 800, color: TOKENS.text, align: 'center' };
  const hs = s05_fit(ctx, 'Inventar voll?', hOpt, 800);
  if (t >= 12.08) {
    band(ctx, 402, 190, 0.5);
    s05_slam(ctx, 'Inventar voll?', CX, 400, Object.assign({}, hOpt, { size: hs, tracking: -0.04 * hs }), t, 12.10);
  }
  // Subline 'Verkauft sich selbst.' ab 13.40
  const sp = ez(t, 13.40, 13.78, E.outExpo);
  if (sp > 0.005) {
    const size = 48;
    drawKinetic(ctx, 'Verkauft sich selbst.', CX, 520, {
      size: size, family: FONTS.head, weight: 500, tracking: 0.02 * size,
      color: rgba(TOKENS.text, 0.85), align: 'center', ease: E.outExpo, stagger: 0.5,
    }, sp, 'rise');
  }
  // Pixel-Label 'Sell-Makro' ab 12.85
  const lp = ez(t, 12.85, 13.15, E.outCubic);
  if (lp > 0.005) {
    const o = { size: 26, family: FONTS.silk, weight: 700, color: TOKENS.muted, align: 'center', tracking: 3, alpha: lp * 0.95 };
    const w = measureText(ctx, 'Sell-Makro', o);
    drawText(ctx, 'Sell-Makro', CX, 588 + (1 - lp) * 10, o);
    ctx.save(); ctx.globalAlpha *= lp * 0.5;
    ctx.fillStyle = rgba(TOKENS.secondary, 0.7);
    ctx.fillRect(CX - w / 2 - 34, 587, 20, 2); ctx.fillRect(CX + w / 2 + 14, 587, 20, 2);
    ctx.restore();
  }
}

/* ------------------------------------------------------------------ s05 */
SCENES.s05 = {
  draw(ctx, lt, t) {
    // Hintergrund
    nightSky(ctx, t, { count: 60, seed: 33, color: '#CFC6E8', alpha: 0.16, hMul: 0.55, drift: true });
    radialFill(ctx, CX, 860, 760, [[0, rgba(TOKENS.deepViolet, 0.16)], [0.55, rgba(TOKENS.deepViolet, 0.05)], [1, 'rgba(0,0,0,0)']], 'lighter');

    // Kamera: setzt die Abwärtsfahrt aus s04 weich ab, atmet, Punch beim Enter
    const settle = 1 - ez(t, 12.0, 12.42, E.outCubic);
    withCamera(ctx, {
      zoom: 1 + 0.035 * settle + 0.006 * Math.sin((t - 12) * 1.15) + 0.028 * impulse(t, s05_ENTER_T, 10) + 0.02 * impulse(t, s05_FULL_T, 12),
      y: -20 * settle + 3 * Math.sin((t - 12) * 0.8),
      ox: CX, oy: 840,
    }, c => {
      s05_floor(c, t);
      s05_panel(c, t);
      s05_grid(c, t);
      s05_scan(c, t);
      s05_gridItems(c, t);
      s05_hotbar(c, t);
      s05_voll(c, t);
      s05_coins(c, t);
    });

    s05_balance(ctx, t);
    s05_chat(ctx, t);
    s05_text(ctx, t);

    // Post-FX-Akzente (die Schnitte bei 12.0 / 15.0 macht die Engine)
    FX.shake = Math.max(FX.shake, 7 * impulse(t, s05_FULL_T, 14) + 5 * impulse(t, s05_ENTER_T, 12));
    FX.rgb = Math.max(FX.rgb, 9 * impulse(t, s05_FULL_T, 26) + 6 * impulse(t, s05_ENTER_T, 22));
    FX.glitch = Math.max(FX.glitch, 0.16 * impulse(t, s05_FULL_T, 30));
    FX.bloom = Math.max(FX.bloom, 0.24 + 0.14 * impulse(t, 13.40, 7) + 0.10 * impulse(t, s05_ENTER_T, 9));
  },
};
