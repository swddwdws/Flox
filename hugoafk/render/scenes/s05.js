/* s05.js
   s05  12.0–15.0  "Inventar voll?" / "Verkauft sich selbst."  — Sell-Makro.
   Minecraft-Inventar (3x9 mcSlot + Hotbar), Slots füllen sich auf Sechzehnteln,
   VOLL-Blitz bei 12.70, '/sell' tippt sich 12.82–13.14, Enter 13.20 (Item-Sog nach
   unten + Münzflug nach oben + Guthaben-Anzeige in Bewegung), grüner Haken 13.40,
   danach läuft das Makro sichtbar weiter (Nachschub auf Achteln → Sechzehnteln →
   Zweiunddreißigsteln, Kamera-Push-in bis zum Schnitt bei 15.0).
   Alles ist eine reine Funktion von t. Alle Modul-Helfer sind mit s05_ präfixiert.

   Geometrie ist bewusst identisch zur Übergabe aus s04 (Slot 84, Pitch 90,
   Raster-Mitten CX + (c-4)*90 / 690,780,870, Panel x120..960 y633..933),
   damit der Schnitt bei 12.0 nahtlos sitzt; das Panel wächst danach nach unten
   und gibt die Hotbar frei. Damit der Schnitt nicht in ein dunkles Loch fällt,
   ist das Raster bei 12.000 bereits zu einem Drittel gefüllt. */

/* ------------------------------------------------------------------ palette */
const s05_C = {
  panel: 'rgba(26,22,40,0.92)',
  slot: 'rgba(46,42,62,0.94)',
  bar: 'rgba(8,6,14,0.72)',
  chat: 'rgba(6,5,11,0.60)',
};

/* ------------------------------------------------------------------ geometry */
const s05_G = { s: 84, gap: 6, pitch: 90, cx: CX, y0: 690, cols: 9, rows: 3 };
const s05_PANEL = { x: 120, y: 633, w: 840, hFrom: 300, hTo: 407 };  // 633..933 -> 633..1040
const s05_HOT = { y: 936, s: 84, gap: 6 };
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
// item icon — the 16x16 sprites want a cell size, 5 px cell ≈ 50 px sichtbares Item im 84er Slot
function s05_icon(ctx, name, x, y, cell, o) {
  if (!SPRITES[name]) return;
  itemIcon(ctx, name, x, y, cell, o);
}

/* ------------------------------------------------------------------ item tables */
/* 27 Rasterslots: 10 sind beim Schnitt (12.000) schon gefüllt — s04 fährt in ein
   bereits angefülltes Inventar hinein, der erste Frame ist damit hell und detailliert.
   Die restlichen 17 landen auf den Sechzehnteln 12.000…12.625, voll bei 12.70.
   Die Hotbar füllt sich dazwischen (32stel-Versatz), also NICHT vorweg. */
function s05_kind(r) {
  const v = r();
  return v < 0.42 ? 'pumpkin' : v < 0.64 ? 'sea_pickle' : v < 0.78 ? 'rotten_flesh' : v < 0.88 ? 'bone' : v < 0.95 ? 'gunpowder' : 'string';
}
const s05_PREFILL = 10;
const s05_BURSTS = [3, 3, 3, 3, 3, 2];        // 17 Slots auf 6 Sechzehnteln
const s05_ITEMS = (() => {
  const out = [], r = rng(505);
  let i = 0;
  for (; i < s05_PREFILL; i++) {               // schon da, wenn die Szene aufmacht
    const p = s05_slotXY(i);
    out.push({ i: i, kind: s05_kind(r), x: p.x, y: p.y, row: p.r, col: p.c, t0: 11.80 + i * 0.012, tOut: 13.20 + (2 - p.r) * 0.022 + p.c * 0.009, wob: r() * 6.283 });
  }
  for (let g = 0; g < s05_BURSTS.length; g++) {
    for (let j = 0; j < s05_BURSTS[g]; j++, i++) {
      const p = s05_slotXY(i);
      out.push({
        i: i, kind: s05_kind(r), x: p.x, y: p.y, row: p.r, col: p.c,
        t0: 12.0 + g * 0.125 + j * 0.020,
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

// Hotbar-Beute: füllt sich auf den 32stel-Zwischenschlägen mit dem Raster,
// der letzte Slot landet 12.6875 — direkt vor dem VOLL-Blitz.
const s05_HOTITEMS = (() => {
  const out = [], r = rng(77);
  const times = [12.0625, 12.1875, 12.1875, 12.3125, 12.4375, 12.4375, 12.5625, 12.6875, 12.6875];
  for (let k = 0; k < 9; k++) {
    out.push({ k: k, kind: s05_kind(r), t0: times[k] + (k % 2) * 0.022, tOut: 13.20 + 0.045 + k * 0.010 });
  }
  return out;
})();

// coins: rise out of the grid after the sale — außen herum, damit sie den
// Textblock (Subline y 520 / Label y 588) nicht durchqueren
const s05_COINS = (() => {
  const out = [], r = rng(9051);
  for (let n = 0; n < 26; n++) {
    const src = s05_slotXY(Math.floor(r() * 3) * 9 + 1 + Math.floor(r() * 7));
    const side = src.x >= CX ? 1 : -1;
    out.push({
      i: n,
      x: src.x + (r() - 0.5) * 50, y: src.y + (r() - 0.5) * 40,
      t0: 13.20 + r() * 0.34, dur: 0.50 + r() * 0.22,
      dx: side * (80 + r() * 140), rise: 150 + r() * 170,
      cell: 3.0 + r() * 1.5, ph: r() * 6.283,
    });
  }
  return out;
})();

/* Nachschub im Tail: das Makro sammelt weiter. Kadenz zieht an
   (Achtel → Sechzehntel → Zweiunddreißigstel), Ziele wandern über alle drei
   Reihen UND die Hotbar, damit das Bild bis zum Schnitt bei 15.0 lebt. */
const s05_REFILL = (() => {
  const out = [], r = rng(707);
  const times = [13.52, 13.64, 13.76, 13.86, 13.96, 14.06, 14.16, 14.26, 14.35, 14.44, 14.53, 14.61, 14.69, 14.76, 14.83, 14.90, 14.95];
  const colOrder = [4, 0, 7, 2, 5, 8, 1, 6, 3];
  const targets = [];
  // interleave rows so the panel fills evenly instead of column by column
  for (const c of colOrder) { targets.push({ g: 9 + c }, { h: c }, { g: c }, { g: 18 + c }); }
  let n = 0;
  for (let ti = 0; ti < times.length; ti++) {
    const many = ti >= 5 ? 2 : 1;                       // zum Schluss zwei gleichzeitig
    for (let m = 0; m < many; m++, n++) {
      const tg = targets[n % targets.length];
      out.push({ g: tg.g, h: tg.h, kind: s05_kind(r), t0: times[ti] + m * 0.030 });
    }
  }
  return out;
})();

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
  const h = lerp(s05_PANEL.hFrom, s05_PANEL.hTo, ez(t, 12.0, 12.14, E.outCubic));
  return { x: s05_PANEL.x, y: s05_PANEL.y, w: s05_PANEL.w, h: h };
}
function s05_panel(ctx, t) {
  const R = s05_panelRect(t);
  // soft violet bed
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  dot(ctx, CX, R.y + R.h * 0.5, 560, TOKENS.secondary, 0.13 + 0.02 * Math.sin((t - 12) * 2.2));
  const red = win(t, s05_FULL_T, s05_FULL_T + 0.05, 13.05, s05_ENTER_T + 0.06);
  if (red > 0.01) dot(ctx, CX, R.y + R.h * 0.5, 520, TOKENS.primary, 0.16 * red);
  const grn = win(t, 13.40, 13.50, 13.9, 14.4);
  if (grn > 0.01) dot(ctx, CX, R.y + R.h * 0.5, 480, TOKENS.ok, 0.09 * grn);
  ctx.restore();

  ctx.save();
  ctx.fillStyle = s05_C.panel; roundRect(ctx, R.x, R.y, R.w, R.h, 12); ctx.fill();
  // border: violett -> rot (voll) -> grün (verkauft), im Tail atmend
  const flash = impulse(t, s05_FULL_T, 9), pulseFull = red * (0.45 + 0.55 * pulse(t, 0.25, 6, s05_FULL_T));
  const ok = win(t, 13.40, 13.48, 13.75, 14.15);
  let col = TOKENS.secondary, a = 0.30 + 0.10 * Math.sin((t - 12) * 3.1);
  if (pulseFull > 0.02) { col = TOKENS.primary; a = lerp(0.30, 0.95, clamp(pulseFull + flash)); }
  if (ok > 0.02) { col = mixColor(TOKENS.secondary, TOKENS.ok, ok); a = lerp(0.30, 0.8, ok); }
  ctx.strokeStyle = rgba(col, a); ctx.lineWidth = 2 + 3 * Math.max(flash, ok * 0.5);
  roundRect(ctx, R.x, R.y, R.w, R.h, 12); ctx.stroke();
  ctx.restore();

  // separator above the hotbar
  const hb = ez(t, 12.0, 12.16, E.outCubic);
  if (hb > 0.01) {
    ctx.save(); ctx.globalAlpha *= hb * 0.5;
    ctx.fillStyle = 'rgba(255,255,255,0.10)'; ctx.fillRect(R.x + 22, 926, R.w - 44, 2);
    ctx.restore();
  }
  return R;
}

/* Füllstands-Schiene über der Panel-Oberkante: 27 Marken, eine pro Slot.
   Sie laufen mit den Slot-Treffern voll (Bewegung 12.0–12.7), gehen beim Verkauf
   aus und kommen mit dem Nachschub zurück — und geben dem sonst leeren Streifen
   zwischen Headline und Panel Struktur (der Schnitt-Glitch bei 12.0 kopiert dort). */
function s05_rail(ctx, t) {
  const y = 606, x0 = 152, x1 = 928, n = 27, step = (x1 - x0) / (n - 1);
  const full = win(t, s05_FULL_T, s05_FULL_T + 0.04, s05_ENTER_T - 0.02, s05_ENTER_T + 0.06);
  const base = mixColor(TOKENS.secondary, TOKENS.primary, full);
  ctx.save();
  ctx.fillStyle = rgba(base, 0.16 + 0.10 * full); ctx.fillRect(x0 - 10, y + 16, x1 - x0 + 20, 2);
  ctx.fillStyle = rgba(base, 0.30 + 0.30 * full); ctx.fillRect(x0 - 10, y + 16, 26, 2); ctx.fillRect(x1 - 16, y + 16, 26, 2);
  for (let i = 0; i < n; i++) {
    const it = s05_ITEMS[i];
    let on = t >= it.t0 && t < it.tOut ? 1 : 0;
    let hit = impulse(t, it.t0, 14);
    for (const rf of s05_REFILL) {
      if (rf.g !== i || t < rf.t0) continue;
      on = 1; hit = Math.max(hit, impulse(t, rf.t0, 14));
    }
    const a = 0.10 + 0.62 * on + 0.55 * hit;
    if (a <= 0.02) continue;
    ctx.fillStyle = rgba(hit > 0.15 ? TOKENS.gold : base, Math.min(1, a));
    const h = 12 + 5 * hit;
    ctx.fillRect(Math.round(x0 + i * step) - 4, y + 14 - h, 9, h);
  }
  ctx.restore();
}

function s05_grid(ctx, t) {
  const s = s05_G.s;
  for (let i = 0; i < 27; i++) {
    const p = s05_slotXY(i);
    mcSlot(ctx, Math.round(p.x - s / 2), Math.round(p.y - s / 2), s, { fill: s05_C.slot });
  }
  // slot flash when an item lands
  ctx.save();
  for (const it of s05_ITEMS) {
    const f = impulse(t, it.t0, 11);
    if (f < 0.03) continue;
    ctx.globalAlpha = f * 0.9;
    ctx.strokeStyle = rgba(TOKENS.gold, 1); ctx.lineWidth = 4;
    ctx.strokeRect(Math.round(it.x - s / 2) + 1.5, Math.round(it.y - s / 2) + 1.5, s - 3, s - 3);
  }
  ctx.restore();

  // "voll" Warnrahmen: pulsiert auf den Achteln, solange /sell getippt wird
  const warn = win(t, s05_FULL_T, s05_FULL_T + 0.04, s05_ENTER_T - 0.02, s05_ENTER_T + 0.05);
  if (warn > 0.01) {
    const beat = 0.45 + 0.55 * pulse(t, 0.25, 7, s05_FULL_T);
    ctx.save();
    ctx.globalAlpha *= warn * (0.30 + 0.55 * beat);
    ctx.strokeStyle = TOKENS.primary; ctx.lineWidth = 3 + 3 * beat;
    ctx.strokeRect(s05_G.cx - 4.5 * s05_G.pitch + 2, s05_G.y0 - 46, 9 * s05_G.pitch - 4, 3 * s05_G.pitch - 4);
    ctx.restore();
  }
}

// nach dem Verkauf: violetter Suchbalken läuft über das Raster (das Makro arbeitet weiter)
function s05_scan(ctx, t) {
  const a = ez(t, 13.45, 13.70, E.outCubic);
  if (a <= 0.01) return;
  const gx0 = s05_G.cx - 4.5 * s05_G.pitch, gw = 9 * s05_G.pitch;
  const q0 = ((t - 13.45) / 0.75) % 1;
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  ctx.beginPath(); ctx.rect(gx0, s05_G.y0 - 45, gw, 3 * s05_G.pitch); ctx.clip();
  // zwei versetzte Bahnen: es ist immer eine mitten im Raster unterwegs
  for (let b = 0; b < 2; b++) {
    const q = (q0 + b * 0.5) % 1, x = gx0 - 130 + q * (gw + 260);
    ctx.save(); ctx.globalAlpha *= a * (b === 0 ? 0.8 : 0.48);
    linearFill(ctx, x - 120, 0, x + 120, 0,
      [[0, rgba(TOKENS.secondary, 0)], [0.5, rgba(TOKENS.violetHot, 0.24)], [1, rgba(TOKENS.secondary, 0)]],
      [x - 120, s05_G.y0 - 45, 240, 3 * s05_G.pitch]);
    ctx.restore();
  }
  ctx.restore();
}

// item inside a slot: pop-in, idle bob, then the downward suck
function s05_gridItems(ctx, t) {
  const R = s05_panelRect(t);
  ctx.save();
  ctx.beginPath(); ctx.rect(R.x + 2, R.y + 2, R.w - 4, 924 - R.y); ctx.clip();
  // Druckwelle: solange das Inventar voll ist, wippen die Items sichtbar (links -> rechts)
  const press = win(t, s05_FULL_T - 0.1, s05_FULL_T + 0.06, s05_ENTER_T - 0.02, s05_ENTER_T + 0.04);
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
      y += Math.sin(t * 2.4 + it.wob) * 2.6 - (1 - pop) * 32;   // fällt sichtbar in den Slot
      const wv = Math.sin((t - s05_FULL_T) * 13 - it.col * 0.62 - it.row * 0.9);
      y -= press * 6 * Math.max(0, wv);
      sc *= 1 + press * 0.06 * wv;
    }
    if (a <= 0.01) continue;
    s05_icon(ctx, it.kind, x, y, 5 * sc, { alpha: a });
  }
  // Nachschub im Tail: das Makro läuft weiter (Raster + Hotbar)
  for (const rf of s05_REFILL) {
    if (t < rf.t0 || rf.g == null) continue;
    const p = s05_slotXY(rf.g), pop = E.outBack(clamp((t - rf.t0) / 0.14));
    s05_icon(ctx, rf.kind, p.x, p.y - (1 - pop) * 28 + Math.sin(t * 2.4 + rf.g) * 2.2, 5 * lerp(1.4, 1, pop), { alpha: clamp((t - rf.t0) / 0.05) });
    const f = impulse(t, rf.t0, 16);
    if (f > 0.03) {
      ctx.save(); ctx.globalAlpha = f * 0.8; ctx.strokeStyle = rgba(TOKENS.gold, 1); ctx.lineWidth = 3;
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

// die ausgewählte Hotbar-Zelle wandert im Tail auf den Achteln weiter
function s05_hotSel(t) {
  if (t < 13.5) return 4;
  return (4 + Math.floor((t - 13.5) / 0.25)) % 9;
}
function s05_hotbar(ctx, t) {
  const dy = (1 - ez(t, 12.0, 12.18, E.outCubic)) * 34;
  ctx.save(); ctx.translate(0, dy);
  // Trägerplatte: hebt die Hotbar optisch vom 3x9-Raster ab
  ctx.fillStyle = 'rgba(255,255,255,0.045)';
  roundRect(ctx, 132, s05_HOT.y - 10, 816, s05_HOT.s + 20, 8); ctx.fill();
  ctx.save();
  ctx.beginPath(); ctx.rect(120, s05_HOT.y - 16, 840, s05_HOT.s + 32); ctx.clip();
  const sel = s05_hotSel(t);
  for (let k = 0; k < 9; k++) {
    const p = s05_hotXY(k);
    mcSlot(ctx, Math.round(p.x - s05_HOT.s / 2), Math.round(p.y - s05_HOT.s / 2), s05_HOT.s, { fill: s05_C.slot });
  }
  { // Auswahlrahmen wandert im Tail auf den Achteln weiter
    const p = s05_hotXY(sel);
    ctx.save();
    ctx.strokeStyle = rgba(TOKENS.text, 0.9); ctx.lineWidth = 4;
    ctx.strokeRect(Math.round(p.x - s05_HOT.s / 2) - 3, Math.round(p.y - s05_HOT.s / 2) - 3, s05_HOT.s + 6, s05_HOT.s + 6);
    ctx.restore();
  }
  for (const h of s05_HOTITEMS) {
    if (t < h.t0) continue;
    const p = s05_hotXY(h.k), pop = E.outBack(clamp((t - h.t0) / 0.13));
    let x = p.x, y = p.y + Math.sin(t * 2.4 + h.k * 1.7) * 2.0 - (1 - pop) * 28, sc = lerp(1.5, 1, pop), al = 1;
    if (t >= h.tOut) {
      const q = clamp((t - h.tOut) / 0.34);
      y += 260 * q * q; sc *= 1 - 0.4 * q; al = 1 - remap(q, 0.45, 1);
    }
    if (al <= 0.01) continue;
    s05_icon(ctx, h.kind, x, y, 4.8 * sc, { alpha: al });
  }
  // Nachschub in der Hotbar
  for (const rf of s05_REFILL) {
    if (t < rf.t0 || rf.h == null) continue;
    const p = s05_hotXY(rf.h), pop = E.outBack(clamp((t - rf.t0) / 0.14));
    s05_icon(ctx, rf.kind, p.x, p.y - (1 - pop) * 26, 4.8 * lerp(1.4, 1, pop), { alpha: clamp((t - rf.t0) / 0.05) });
    const f = impulse(t, rf.t0, 16);
    if (f > 0.03) {
      ctx.save(); ctx.globalAlpha = f * 0.8; ctx.strokeStyle = rgba(TOKENS.gold, 1); ctx.lineWidth = 3;
      ctx.strokeRect(Math.round(p.x - 42) + 1.5, Math.round(p.y - 42) + 1.5, 81, 81); ctx.restore();
    }
  }
  ctx.restore();
  ctx.restore();
}

/* ------------------------------------------------------------------ VOLL
   sitzt als Plakette AUF der Panel-Oberkante, nicht im Raster — so wird keine
   Item-Reihe abgedunkelt und keine Pixel-Letter liegt auf einem Sprite. */
function s05_voll(ctx, t) {
  const a = win(t, s05_FULL_T - 0.005, s05_FULL_T + 0.03, 12.96, 13.12);
  if (a <= 0.01) return;
  const fl = (t - s05_FULL_T) < 0.12 && Math.floor((t - s05_FULL_T) * 30) % 2 === 1 ? 0.4 : 1;
  const pop = E.outBack(clamp((t - s05_FULL_T) / 0.14));
  const sz = 72 * lerp(1.28, 1, pop), y = 598;
  const o = { size: sz, family: FONTS.pixel, weight: 400, color: TOKENS.primary, align: 'center' };
  const w = measureText(ctx, 'VOLL', o);
  ctx.save(); ctx.globalAlpha *= a * fl;
  // eigene Plakette statt Vollbild-Band
  ctx.fillStyle = 'rgba(10,6,16,0.88)';
  roundRect(ctx, CX - w / 2 - 30, y - 52, w + 60, 104, 10); ctx.fill();
  ctx.strokeStyle = rgba(TOKENS.primary, 0.55 + 0.45 * impulse(t, s05_FULL_T, 8)); ctx.lineWidth = 3;
  roundRect(ctx, CX - w / 2 - 30, y - 52, w + 60, 104, 10); ctx.stroke();
  glow(ctx, 26, 0.55, c => drawText(c, 'VOLL', CX, y, o));
  drawText(ctx, 'VOLL', CX, y, o);
  ctx.restore();
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
    // Flugbahn endet deutlich unter dem Textblock (Subline y 520 / Label y 588)
    const a = clamp(q * 6) * (1 - remap(q, 0.6, 1)) * (1 - remap(y, 700, 640));
    if (a <= 0.01) continue;
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = a * 0.5;
    dot(ctx, x, y, c.cell * 14, TOKENS.gold, 0.6); ctx.restore();
    s05_icon(ctx, c.i % 3 === 0 ? 'emerald' : 'gold_ingot', x, y, c.cell * (1 + 0.12 * Math.sin(q * 12 + c.ph)), { alpha: a });
  }
  ctx.restore();
}

/* ------------------------------------------------------------------ Guthaben-Anzeige
   Zeigt ausschließlich Bewegung: ein Segmentbalken füllt sich immer wieder neu
   (jede Füllung = eine Auszahlung), es wird nie ein Betrag behauptet.
   Bewusst keine Ziffern — der Betrag wäre eine erfundene Zahl. */
function s05_meterU(t) {                     // Füllungen seit dem Verkauf (monoton)
  const d = Math.max(0, t - s05_ENTER_T);
  return 2.6 * (1 - Math.exp(-3.4 * d)) + 1.25 * d;
}
function s05_balance(ctx, t) {
  const a = ez(t, s05_ENTER_T, s05_ENTER_T + 0.16, E.outCubic);
  if (a <= 0.01) return;
  const pop = E.outBack(clamp((t - s05_ENTER_T) / 0.24));
  const w = s05_CHIP.w, h = s05_CHIP.h, y = s05_CHIP.y, x = CX - w / 2;
  const jump = impulse(t, s05_ENTER_T, 7);
  const u = s05_meterU(t), frac = u - Math.floor(u), wrap = Math.max(0, 1 - frac * 7);
  ctx.save(); ctx.globalAlpha *= a;
  ctx.translate(CX, y); ctx.scale(lerp(0.86, 1, pop), lerp(0.86, 1, pop)); ctx.translate(-CX, -y + jump * -8);

  ctx.fillStyle = 'rgba(14,11,22,0.88)'; roundRect(ctx, x, y - h / 2, w, h, 10); ctx.fill();
  ctx.strokeStyle = rgba(TOKENS.gold, 0.28 + 0.45 * Math.max(jump, wrap * 0.8)); ctx.lineWidth = 2;
  roundRect(ctx, x, y - h / 2, w, h, 10); ctx.stroke();

  drawText(ctx, 'GUTHABEN', x + 26, y, { size: 22, family: FONTS.silk, weight: 700, color: TOKENS.muted, align: 'left', tracking: 2 });

  // Aufwärts-Pfeil, hüpft bei jeder Füllung
  const ax = x + 200, ay = y - 1 - wrap * 6 + Math.sin(t * 6) * 1.5;
  ctx.save(); ctx.globalAlpha *= 0.75 + 0.25 * Math.max(jump, wrap); ctx.fillStyle = TOKENS.gold;
  ctx.beginPath(); ctx.moveTo(ax, ay - 15); ctx.lineTo(ax + 13, ay + 8); ctx.lineTo(ax - 13, ay + 8); ctx.closePath(); ctx.fill();
  ctx.restore();

  // Segmentbalken: läuft durchgehend voll und beginnt von vorn
  const n = 14, mx0 = x + 232, mw = w - 26 - 232, sw = (mw - (n - 1) * 4) / n, sh = 30;
  ctx.fillStyle = 'rgba(0,0,0,0.45)'; roundRect(ctx, mx0 - 8, y - sh / 2 - 7, mw + 16, sh + 14, 6); ctx.fill();
  const lit = frac * n;
  for (let k = 0; k < n; k++) {
    const on = clamp(lit - k), head = clamp(1 - Math.abs(lit - 0.5 - k));
    const sx = mx0 + k * (sw + 4);
    ctx.fillStyle = rgba(TOKENS.gold, 0.10 + 0.72 * on + 0.28 * head);
    ctx.fillRect(sx, y - sh / 2, sw, sh);
  }
  // Auszahlungs-Blitz am rechten Ende
  if (wrap > 0.02) {
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha *= wrap;
    dot(ctx, mx0 + mw - sw / 2, y, 54, TOKENS.gold, 0.55);
    ctx.restore();
    s05_icon(ctx, 'gold_ingot', mx0 + mw - sw / 2, y, 2.6 * (1 + 0.5 * wrap), { alpha: wrap });
  }
  ctx.restore();
}

/* ------------------------------------------------------------------ Chat */
const s05_TYPE_T = [12.82, 12.90, 12.98, 13.06, 13.14];
function s05_chat(ctx, t) {
  // Eingabezeile (Live-Konsole: liegt die ganze Szene an)
  const inA = ez(t, 11.90, 12.06, E.outCubic);
  if (inA > 0.01) {
    const I = s05_INP, active = t >= 12.78 && t < s05_ENTER_T;
    // Tastenanschlag: jeder getippte Buchstabe blitzt die Zeile an
    let key = 0; for (const tt of s05_TYPE_T) key = Math.max(key, impulse(t, tt, 22));
    ctx.save(); ctx.globalAlpha *= inA * (active ? 1 : 0.8);
    ctx.fillStyle = s05_C.bar; ctx.fillRect(I.x, I.y, I.w, I.h);
    ctx.fillStyle = rgba(TOKENS.text, (active ? 0.16 : 0.08) + 0.35 * key); ctx.fillRect(I.x, I.y, I.w, 2); ctx.fillRect(I.x, I.y + I.h - 2, I.w, 2);
    ctx.fillStyle = rgba(TOKENS.secondary, (active ? 0.55 : 0.25) + 0.45 * key); ctx.fillRect(I.x, I.y, 3 + 3 * key, I.h);
    if (key > 0.02) { ctx.save(); ctx.globalAlpha *= key * 0.16; ctx.fillStyle = TOKENS.violetHot; ctx.fillRect(I.x, I.y, I.w, I.h); ctx.restore(); }
    const enter = impulse(t, s05_ENTER_T, 16);
    if (enter > 0.02) { ctx.save(); ctx.globalAlpha *= enter * 0.16; ctx.fillStyle = TOKENS.text; ctx.fillRect(I.x, I.y, I.w, I.h); ctx.restore(); }
    let n = 0; for (const tt of s05_TYPE_T) if (t >= tt) n++;
    if (t >= s05_ENTER_T + 0.07) n = 0;
    const txt = '/sell'.slice(0, n);
    const o = { size: 44, family: FONTS.term, weight: 400, color: TOKENS.text, align: 'left' };
    const tx = I.x + 52, ty = I.y + I.h / 2 + 2;
    drawText(ctx, '>', I.x + 24, ty, { size: 40, family: FONTS.term, weight: 400, color: rgba(TOKENS.muted, 0.85), align: 'left' });
    if (txt) drawText(ctx, txt, tx, ty, o);
    const cw = measureText(ctx, txt, o);
    const blink = active ? (t - (s05_TYPE_T[Math.max(0, n - 1)] || 12.8)) < 0.10 || Math.floor(t * 4) % 2 === 0 : Math.floor(t * 3) % 2 === 0;
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
    s05_icon(ctx, 'check', L.x + 52, L.y + 100, 5 * (1 + 0.28 * ping));
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    dot(ctx, L.x + 52, L.y + 100, 60 * (1 + ping), TOKENS.ok, 0.30 + 0.4 * ping);
    ctx.restore();
    drawText(ctx, 'Verkauft.', L.x + 100 - (1 - l2) * 20, L.y + 100, { size: 42, family: FONTS.term, weight: 400, color: TOKENS.ok, align: 'left' });
    ctx.restore();
    if (ping > 0.02) shockwave(ctx, L.x + 52, L.y + 100, clamp((t - 13.40) / 0.5), { radius: 240, color: TOKENS.ok, width: 8, alpha: 0.5 });
  }
}

/* ------------------------------------------------------------------ Text-Block */
function s05_text(ctx, t) {
  // Headline 'Inventar voll?' — Slam direkt auf dem Schnitt, steht bis 15.0
  const hOpt = { size: 120, family: FONTS.body, weight: 800, color: TOKENS.text, align: 'center' };
  const hs = s05_fit(ctx, 'Inventar voll?', hOpt, 800);
  band(ctx, 402, 190, 0.5);
  s05_slam(ctx, 'Inventar voll?', CX, 400, Object.assign({}, hOpt, { size: hs, tracking: -0.04 * hs }), t, 11.96, 0.16);
  // Subline 'Verkauft sich selbst.' ab 13.40
  const sp = ez(t, 13.40, 13.78, E.outExpo);
  if (sp > 0.005) {
    const size = 48;
    drawKinetic(ctx, 'Verkauft sich selbst.', CX, 520, {
      size: size, family: FONTS.head, weight: 500, tracking: 0.02 * size,
      color: rgba(TOKENS.text, 0.85), align: 'center', ease: E.outExpo, stagger: 0.5,
    }, sp, 'rise');
  }
  // Pixel-Label 'Sell-Makro' auf dem Schlag 13.5 (VOLL ist da längst weg)
  const lp = ez(t, 13.50, 13.80, E.outCubic);
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

    // Kamera: setzt die Abwärtsfahrt aus s04 weich ab, atmet spürbar,
    // Punch beim Enter, danach ein langsamer Push-in bis zum Schnitt.
    const settle = 1 - ez(t, 12.0, 12.42, E.outCubic);
    const push = ez(t, 13.70, 15.00, E.inOutCubic);
    withCamera(ctx, {
      zoom: 1 + 0.030 * settle + 0.013 * Math.sin((t - 12) * 1.7) + 0.022 * push
        + 0.028 * impulse(t, s05_ENTER_T, 10) + 0.02 * impulse(t, s05_FULL_T, 12),
      y: -18 * settle + 7 * Math.sin((t - 12) * 0.95) - 12 * push,
      ox: CX, oy: 840,
    }, c => {
      s05_floor(c, t);
      s05_panel(c, t);
      s05_rail(c, t);
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
