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
   und gibt die Hotbar frei. Die obere Reihe kommt weiterhin aus s03_s04_HANDOVER.

   INSZENIERUNG (v2): Das Raster füllt sich NICHT mehr zeilenweise von links,
   sondern als Diamant von der Mitte nach außen (Wellenfronten um den Mittelslot
   der zweiten Reihe herum); die Hotbar läuft gegenläufig von den beiden Enden
   nach innen und schließt in der Mitte. Der Sog beim Verkauf kollabiert von außen
   nach innen, die Münzen steigen als schmaler Kamin aus der Hotbar auf statt in
   einem breiten Fächer aus dem Raster. Das untere Drittel ist neu gestapelt:
   Eingabezeile direkt unter dem Panel, darunter eine rollende Live-Konsole,
   ganz unten die Guthaben-Schiene, die von der Mitte nach außen füllt. */

/* ------------------------------------------------------------------ palette */
const s05_C = {
  panel: 'rgba(26,22,40,0.92)',
  slot: 'rgba(46,42,62,0.94)',
  bar: 'rgba(8,6,14,0.72)',
  chat: 'rgba(6,5,11,0.60)',
};

/* ------------------------------------------------------------------ geometry
   s05_G / s05_PANEL / s05_HOT sind die Übergabe aus s04 und stehen fest. */
const s05_G = { s: 84, gap: 6, pitch: 90, cx: CX, y0: 690, cols: 9, rows: 3 };
const s05_PANEL = { x: 120, y: 633, w: 840, hFrom: 300, hTo: 407 };  // 633..933 -> 633..1040
const s05_HOT = { y: 936, s: 84, gap: 6 };
// unteres Drittel neu gestapelt: tippen -> Konsole -> Guthaben (vorher umgekehrt)
const s05_INP = { x: 140, y: 1060, w: 760, h: 68 };
const s05_LOG = { x: 140, y: 1144, w: 760, h: 180 };
const s05_CHIP = { y: 1368, w: 700, h: 62 };

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
  if (!SPRITES[name] && !MC_BLOCK_ICONS[name]) return;
  mcItem(ctx, name, x, y, cell, o);
}
// Treffer-Markierung: vier goldene Ecken statt eines vollen Rahmens
function s05_hitMark(ctx, x, y, s, f) {
  if (f < 0.03) return;
  const L = 20 + 10 * f, h = s / 2 + 2 + 3 * f;
  ctx.save();
  ctx.globalAlpha *= Math.min(1, f * 0.95);
  ctx.strokeStyle = rgba(TOKENS.gold, 1); ctx.lineWidth = 4; ctx.lineCap = 'butt';
  ctx.beginPath();
  for (const sx of [-1, 1]) for (const sy of [-1, 1]) {
    ctx.moveTo(x + sx * h, y + sy * h - sy * L); ctx.lineTo(x + sx * h, y + sy * h);
    ctx.lineTo(x + sx * h - sx * L, y + sy * h);
  }
  ctx.stroke();
  ctx.restore();
}

/* ------------------------------------------------------------------ item tables */
/* 27 Rasterslots. Beim Schnitt (12.000) liegt die aus s04 übergebene obere Reihe
   (9 Slots) plus der MITTELSLOT der zweiten Reihe (Index 13) im Panel — das ist
   der Keim, aus dem der Diamant wächst. Die restlichen 17 landen auf denselben
   Sechzehnteln wie bisher (12.000…12.625, Gruppen 3/3/3/3/3/2), aber in
   Wellenfronten um die Mitte statt zeilenweise von links.
   Die Hotbar füllt sich dazwischen auf den 32steln — von außen nach innen. */
function s05_kind(r, ring) {
  const v = r();
  // Kern = Farm-Beute (warm), Rand = Spawner-Beute (kalt) — die Füllung liest sich als Ringe
  if (ring != null && ring <= 1) return v < 0.56 ? 'pumpkin' : v < 0.86 ? 'sea_pickle' : v < 0.94 ? 'bone' : 'gunpowder';
  if (ring != null && ring >= 4) return v < 0.28 ? 'rotten_flesh' : v < 0.54 ? 'bone' : v < 0.74 ? 'gunpowder' : v < 0.90 ? 'string' : 'sea_pickle';
  return v < 0.34 ? 'pumpkin' : v < 0.56 ? 'sea_pickle' : v < 0.74 ? 'rotten_flesh' : v < 0.86 ? 'bone' : v < 0.94 ? 'gunpowder' : 'string';
}
const s05_BURSTS = [3, 3, 3, 3, 3, 2];        // 17 Slots auf 6 Sechzehnteln (unverändert)
/* Wellenfronten um Slot 13 (Reihe 1, Spalte 4): w = |c-4| + (2-r).
   w0 22 | w1 21 23 | w2 12 14 20 24 | w3 11 15 19 25 | w4 10 16 18 26 | w5 9 17 */
const s05_ORDER = [22, 21, 23, 12, 14, 20, 24, 11, 15, 19, 25, 10, 16, 18, 26, 9, 17];
const s05_RING = i => { const p = s05_slotXY(i); return Math.abs(p.c - 4) + (2 - p.r); };

const s05_ITEMS = (() => {
  const out = new Array(27), r = rng(1205);
  const mk = (i, kind, t0) => {
    const p = s05_slotXY(i);
    const dx = p.c - 4, dy = p.r - 1, len = Math.max(1, Math.hypot(dx, dy));
    return {
      i: i, kind: kind, x: p.x, y: p.y, row: p.r, col: p.c, t0: t0,
      // Kollaps beim Verkauf: von außen nach innen (Gegenbewegung zur Füllung)
      tOut: 13.20 + (4 - Math.abs(dx)) * 0.011 + (2 - p.r) * 0.008,
      // Einflug: aus der Rastermitte nach außen in den eigenen Slot
      ex: dx / len, ey: dy / len,
      d: Math.hypot(dx, dy * 1.55), wob: r() * 6.283,
    };
  };
  // obere Reihe: Übergabe aus s04, unverändert
  for (let n = 0; n < 9; n++) {
    const p = s05_slotXY(n);
    out[n] = mk(n, s03_s04_HANDOVER[p.c] || s05_kind(r, 3), 11.80 + n * 0.012);
  }
  // Keim: Mittelslot der zweiten Reihe liegt beim Schnitt schon da
  out[13] = mk(13, s05_kind(r, 0), 11.93);
  let n = 0;
  for (let g = 0; g < s05_BURSTS.length; g++) {
    for (let j = 0; j < s05_BURSTS[g]; j++, n++) {
      const i = s05_ORDER[n];
      out[i] = mk(i, s05_kind(r, s05_RING(i)), 12.0 + g * 0.125 + j * 0.020);
    }
  }
  return out;
})();
const s05_FULL_T = 12.70;
const s05_ENTER_T = 13.20;

/* Hotbar-Beute: dieselben 32stel wie bisher, aber von den beiden Enden nach innen —
   der letzte Slot ist jetzt die MITTE (12.6875), direkt vor dem VOLL-Blitz. */
const s05_HOT_ORDER = [0, 8, 1, 7, 2, 6, 3, 5, 4];
const s05_HOTITEMS = (() => {
  const out = [], r = rng(881);
  const times = [12.0625, 12.1875, 12.1875, 12.3125, 12.4375, 12.4375, 12.5625, 12.6875, 12.6875];
  for (let n = 0; n < 9; n++) {
    const k = s05_HOT_ORDER[n];
    out.push({
      k: k, kind: s05_kind(r, n < 4 ? 4 : n < 7 ? 3 : 1),
      t0: times[n] + (n % 2) * 0.022,
      tOut: 13.20 + 0.045 + (4 - Math.abs(k - 4)) * 0.012,   // außen zuerst, Mitte zuletzt
    });
  }
  return out;
})();
const s05_HOTBY = (() => { const m = new Array(9); for (const h of s05_HOTITEMS) m[h.k] = h; return m; })();

/* Münzen: steigen jetzt als schmaler Kamin aus der HOTBAR auf (dort, wo der Sog
   die Beute hinauszieht) und ziehen sich beim Steigen zur Mitte zusammen —
   statt wie bisher breit aus dem Raster nach außen zu fächern. Zwei geflochtene
   Stränge, damit die Säule lebt. Sie verlöschen weit unter dem Textblock. */
const s05_COINS = (() => {
  const out = [], r = rng(4407);
  for (let n = 0; n < 28; n++) {
    const k = n % 9, p = s05_hotXY(k);
    const strand = (n % 2) ? 1 : -1;
    out.push({
      i: n,
      x: p.x + (r() - 0.5) * 44, y: 984 + (r() - 0.5) * 26,
      t0: 13.21 + r() * 0.52, dur: 0.50 + r() * 0.30,
      sway: strand * (16 + r() * 58),      // Zielversatz um die Mittelachse
      curl: strand * (12 + r() * 16),      // Flechtung
      rise: 244 + r() * 190,               // unterschiedliche Steighöhen -> hohe Säule
      cell: 3.0 + r() * 1.5, ph: r() * 6.283,
    });
  }
  return out;
})();

/* Nachschub im Tail: das Makro sammelt weiter. Kadenz zieht an
   (Achtel → Sechzehntel → Zweiunddreißigstel). Die Ziele laufen jetzt als
   DIAGONALE Wellenfront von der linken Hotbar-Ecke nach rechts oben durch
   Hotbar + alle drei Reihen (vorher: gestreute Spaltenreihenfolge). */
const s05_REFILL = (() => {
  const out = [], r = rng(3311);
  const times = [13.52, 13.64, 13.76, 13.86, 13.96, 14.06, 14.16, 14.26, 14.35, 14.44, 14.53, 14.61, 14.69, 14.76, 14.83, 14.90, 14.95];
  const targets = [];
  for (let key = 0; key <= 11; key++) {
    for (let rw = 3; rw >= 0; rw--) {                 // in jeder Diagonale von unten nach oben
      const c = key - 3 + rw;
      if (c < 0 || c > 8) continue;
      targets.push(rw === 3 ? { h: c } : { g: rw * 9 + c });
    }
  }
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

/* ------------------------------------------------------------------ Tiefe: dunkle Voxel-Ebene unter dem Panel (reine Deko, unterhalb der Safe-Area)
   Neu als abgestufter Riegel statt als quadratische Platte, nach rechts versetzt. */
const s05_FLOORCELLS = (() => {
  const out = [], r = rng(4111);
  for (let ix = 0; ix < 10; ix++) for (let iy = 0; iy < 5; iy++) {
    const v = r();
    const edge = (iy === 0 || iy === 4) ? 1 : 0;
    out.push({ ix: ix, iy: iy, iz: edge && v < 0.6 ? 1 : v < 0.10 ? 1 : 0, color: v < 0.16 ? '#2A2340' : v < 0.58 ? '#221D33' : '#1B1729' });
  }
  return out;
})();
function s05_floor(ctx, t) {
  const o = { size: 48, cx: CX + 60, cy: 1660, alpha: 0.55, outline: '#0A0810', outlineAlpha: 0.30 };
  ctx.save(); ctx.globalAlpha *= 0.22;
  cubeField(ctx, s05_FLOORCELLS.map(c => ({ ix: c.ix - 5, iy: c.iy - 2, iz: c.iz, color: c.color })), o);
  ctx.restore();
  // absinkende Voxel-Motes: fallen jetzt mit dem Sog nach unten statt aufzusteigen
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  for (let i = 0; i < 16; i++) {
    const x = 140 + hash2(i, 12) * 820, sp = 30 + hash2(i, 19) * 40;
    const y = 1120 + (((t - 12) * sp + hash2(i, 5) * 760) % 760);
    ctx.globalAlpha = 0.20 * (1 - remap(y, 1620, 1860));
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

/* Füllstands-Schiene über der Panel-Oberkante. Neu: 36 Marken in VIER Gruppen
   (drei Rasterreihen + Hotbar) statt einer durchgehenden Reihe aus 27 — die
   Schiene spiegelt damit den Panelaufbau und zeigt den Diamanten, der von der
   Mitte nach außen wächst, während die Hotbar-Gruppe von außen nach innen zuläuft. */
function s05_rail(ctx, t) {
  const y = 606, x0 = 152, x1 = 928, gap = 30;
  const span = (x1 - x0 - 3 * gap) / 4, step = span / 8;
  const full = win(t, s05_FULL_T, s05_FULL_T + 0.04, s05_ENTER_T - 0.02, s05_ENTER_T + 0.06);
  const base = mixColor(TOKENS.secondary, TOKENS.primary, full);
  ctx.save();
  for (let g = 0; g < 4; g++) {
    const gx = x0 + g * (span + gap);
    ctx.fillStyle = rgba(base, 0.14 + 0.10 * full);
    ctx.fillRect(gx - 6, y + 16, span + 12, 2);
    for (let k = 0; k < 9; k++) {
      let on = 0, hit = 0;
      if (g < 3) {
        const i = g * 9 + k, it = s05_ITEMS[i];
        on = (t >= it.t0 && t < it.tOut) ? 1 : 0;
        hit = impulse(t, it.t0, 14);
        for (const rf of s05_REFILL) { if (rf.g !== i || t < rf.t0) continue; on = 1; hit = Math.max(hit, impulse(t, rf.t0, 14)); }
      } else {
        const h = s05_HOTBY[k];
        on = (t >= h.t0 && t < h.tOut) ? 1 : 0;
        hit = impulse(t, h.t0, 14);
        for (const rf of s05_REFILL) { if (rf.h !== k || t < rf.t0) continue; on = 1; hit = Math.max(hit, impulse(t, rf.t0, 14)); }
      }
      const a = 0.13 + 0.72 * on + 0.55 * hit;
      if (a <= 0.02) continue;
      ctx.fillStyle = rgba(hit > 0.15 ? TOKENS.gold : on > 0.5 ? mixColor(TOKENS.violetHot, TOKENS.primary, full) : base, Math.min(1, a));
      const hgt = 12 + 5 * hit;
      ctx.fillRect(Math.round(gx + k * step) - 4, y + 14 - hgt, 8, hgt);
    }
  }
  ctx.restore();
}

function s05_grid(ctx, t) {
  const s = s05_G.s;
  for (let i = 0; i < 27; i++) {
    const p = s05_slotXY(i);
    mcSlot(ctx, Math.round(p.x - s / 2), Math.round(p.y - s / 2), s, { fill: s05_C.slot });
  }
  // Treffer: vier goldene Ecken schnappen um den Slot zu (statt Vollrahmen)
  for (const it of s05_ITEMS) s05_hitMark(ctx, it.x, it.y, s, impulse(t, it.t0, 11));

  // "voll" Warnrahmen: zieht sich auf den Achteln um das Raster zusammen
  const warn = win(t, s05_FULL_T, s05_FULL_T + 0.04, s05_ENTER_T - 0.02, s05_ENTER_T + 0.05);
  if (warn > 0.01) {
    const beat = 0.45 + 0.55 * pulse(t, 0.25, 7, s05_FULL_T);
    const gx = s05_G.cx - 4.5 * s05_G.pitch, gy = s05_G.y0 - 46, gw = 9 * s05_G.pitch, gh = 3 * s05_G.pitch;
    ctx.save();
    ctx.globalAlpha *= warn * (0.30 + 0.55 * beat);
    ctx.strokeStyle = TOKENS.primary; ctx.lineWidth = 3 + 3 * beat;
    const inset = 2 + 12 * (1 - beat);
    ctx.strokeRect(gx + inset, gy + inset * 0.5, gw - 2 * inset, gh - inset);
    ctx.globalAlpha *= 0.5;
    ctx.lineWidth = 2; ctx.strokeRect(gx - 8, gy - 6, gw + 16, gh + 12);
    ctx.restore();
  }
}

// nach dem Verkauf: violetter Suchbalken läuft jetzt von unten nach oben durch das Raster
function s05_scan(ctx, t) {
  const a = ez(t, 13.45, 13.70, E.outCubic);
  if (a <= 0.01) return;
  const gx0 = s05_G.cx - 4.5 * s05_G.pitch, gw = 9 * s05_G.pitch;
  const gy0 = s05_G.y0 - 45, gh = 3 * s05_G.pitch;
  const q0 = ((t - 13.45) / 0.85) % 1;
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  ctx.beginPath(); ctx.rect(gx0, gy0, gw, gh); ctx.clip();
  for (let b = 0; b < 2; b++) {
    const q = (q0 + b * 0.5) % 1, y = gy0 + gh + 90 - q * (gh + 180);
    ctx.save(); ctx.globalAlpha *= a * (b === 0 ? 0.8 : 0.48);
    linearFill(ctx, 0, y - 84, 0, y + 84,
      [[0, rgba(TOKENS.secondary, 0)], [0.5, rgba(TOKENS.violetHot, 0.26)], [1, rgba(TOKENS.secondary, 0)]],
      [gx0, y - 84, gw, 168]);
    ctx.restore();
  }
  ctx.restore();
}

// item inside a slot: flies out of the grid centre into its slot, idle bob, then the collapse
function s05_gridItems(ctx, t) {
  const R = s05_panelRect(t);
  ctx.save();
  ctx.beginPath(); ctx.rect(R.x + 2, R.y + 2, R.w - 4, 924 - R.y); ctx.clip();
  // Druckwelle: solange das Inventar voll ist, läuft sie RADIAL aus der Mitte
  const press = win(t, s05_FULL_T - 0.1, s05_FULL_T + 0.06, s05_ENTER_T - 0.02, s05_ENTER_T + 0.04);
  for (const it of s05_ITEMS) {
    if (t < it.t0) continue;
    const pop = E.outBack(clamp((t - it.t0) / 0.13));
    let x = it.x, y = it.y, sc = lerp(1.45, 1, pop), a = clamp(0.42 + (t - it.t0) / 0.045);
    if (t >= it.tOut) {
      // Kollaps: alles fällt zur Hotbar-Mitte hin durch und wird dort abgesaugt
      const q = clamp((t - it.tOut) / 0.38), e = E.inQuad(q);
      y = lerp(it.y, 1010, e * e * 0.9 + e * 0.1);
      x = lerp(it.x, CX, e * 0.85);
      sc *= 1 - 0.55 * q; a *= 1 - remap(q, 0.45, 1);
    } else {
      const fly = (1 - pop) * 46;
      x -= it.ex * fly; y -= it.ey * fly;                       // aus der Mitte nach außen
      y += Math.sin(t * 2.4 + it.wob) * 2.6;
      const wv = Math.sin((t - s05_FULL_T) * 13 - it.d * 1.15);
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
    s05_icon(ctx, rf.kind, p.x, p.y + (1 - pop) * 26 + Math.sin(t * 2.4 + rf.g) * 2.2, 5 * lerp(1.35, 1, pop), { alpha: clamp(0.42 + (t - rf.t0) / 0.045) });
    s05_hitMark(ctx, p.x, p.y, s05_G.s, impulse(t, rf.t0, 16));
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

// die ausgewählte Hotbar-Zelle wandert im Tail auf den Achteln nach außen
function s05_hotSel(t) {
  if (t < 13.5) return 4;
  const n = Math.floor((t - 13.5) / 0.25);
  const walk = [4, 3, 5, 2, 6, 1, 7, 0, 8];
  return walk[n % 9];
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
    // Hotbar-Beute steigt von UNTEN in ihren Slot (Gegenrichtung zum Raster)
    let x = p.x, y = p.y + Math.sin(t * 2.4 + h.k * 1.7) * 2.0 + (1 - pop) * 30, sc = lerp(1.45, 1, pop), al = 1;
    if (t >= h.tOut) {
      const q = clamp((t - h.tOut) / 0.34);
      y += 250 * q * q; x = lerp(p.x, CX, E.inQuad(q) * 0.7); sc *= 1 - 0.5 * q; al = 1 - remap(q, 0.45, 1);
    }
    if (al <= 0.01) continue;
    s05_icon(ctx, h.kind, x, y, 4.8 * sc, { alpha: al });
    s05_hitMark(ctx, p.x, p.y, s05_HOT.s, impulse(t, h.t0, 13));
  }
  // Nachschub in der Hotbar
  for (const rf of s05_REFILL) {
    if (t < rf.t0 || rf.h == null) continue;
    const p = s05_hotXY(rf.h), pop = E.outBack(clamp((t - rf.t0) / 0.14));
    s05_icon(ctx, rf.kind, p.x, p.y + (1 - pop) * 28, 4.8 * lerp(1.35, 1, pop), { alpha: clamp(0.42 + (t - rf.t0) / 0.045) });
    s05_hitMark(ctx, p.x, p.y, s05_HOT.s, impulse(t, rf.t0, 16));
  }
  ctx.restore();
  ctx.restore();
}

/* ------------------------------------------------------------------ VOLL
   sitzt weiter als Plakette AUF der Panel-Oberkante (y 598, Mitte) und auf
   demselben Schlag (12.70) — neu ist die Geste: die Tafel reißt waagerecht auf
   (scaleX 0.34 -> 1) und bekommt HUD-Ecken statt eines runden Kastens. */
function s05_voll(ctx, t) {
  const a = win(t, s05_FULL_T - 0.005, s05_FULL_T + 0.03, 12.96, 13.12);
  if (a <= 0.01) return;
  const fl = (t - s05_FULL_T) < 0.12 && Math.floor((t - s05_FULL_T) * 30) % 2 === 1 ? 0.4 : 1;
  const open = E.outExpo(clamp((t - s05_FULL_T) / 0.13));
  const sz = 72, y = 598;
  const o = { size: sz, family: FONTS.pixel, weight: 400, color: TOKENS.primary, align: 'center' };
  const w = measureText(ctx, 'VOLL', o), bw = w + 92, bh = 104;
  const hit = impulse(t, s05_FULL_T, 8);
  ctx.save(); ctx.globalAlpha *= a * fl;
  ctx.translate(CX, y); ctx.scale(lerp(0.34, 1, open), lerp(0.66, 1, open)); ctx.translate(-CX, -y);
  ctx.fillStyle = 'rgba(10,6,16,0.90)';
  ctx.fillRect(CX - bw / 2, y - bh / 2, bw, bh);
  ctx.fillStyle = rgba(TOKENS.primary, 0.5 + 0.5 * hit);
  ctx.fillRect(CX - bw / 2, y - bh / 2, bw, 5); ctx.fillRect(CX - bw / 2, y + bh / 2 - 5, bw, 5);
  brackets(ctx, CX - bw / 2 - 10, y - bh / 2 - 10, bw + 20, bh + 20, clamp(open * 1.5), { len: 30, color: TOKENS.primary, width: 4, alpha: 0.9 });
  glow(ctx, 26, 0.55, c => drawText(c, 'VOLL', CX, y, o));
  drawText(ctx, 'VOLL', CX, y, o);
  ctx.restore();
}

/* ------------------------------------------------------------------ Münzflug
   Kamin aus der Hotbar nach oben, zwei geflochtene Stränge, die sich beim
   Steigen zur Mittelachse zusammenziehen. */
function s05_coins(ctx, t) {
  const col = ez(t, s05_ENTER_T, s05_ENTER_T + 0.10, E.outCubic) * (1 - ez(t, 13.62, 14.25, E.inCubic));
  if (col > 0.01) {
    // weiche Goldsäule über der Hotbar — kein harter Rechteckrand
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha *= col * 0.34;
    ctx.translate(CX, 940); ctx.scale(0.46, 1.4);
    dot(ctx, 0, 0, 170, TOKENS.gold, 0.30);
    ctx.restore();
  }
  ctx.save();
  for (const c of s05_COINS) {
    const q = clamp((t - c.t0) / c.dur);
    if (q <= 0 || q >= 1) continue;
    const e = E.outCubic(q);
    const x = lerp(c.x, CX + c.sway, e) + Math.sin(q * 6.5 + c.ph) * c.curl;
    const y = c.y - c.rise * e;
    // verlischt weit unter dem Textblock (Subline y 520 / Label y 588)
    const a = clamp(q * 6) * (1 - remap(q, 0.62, 1)) * (1 - remap(y, 748, 664));
    if (a <= 0.01) continue;
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = a * 0.5;
    dot(ctx, x, y, c.cell * 13, TOKENS.gold, 0.6); ctx.restore();
    s05_icon(ctx, c.i % 3 === 0 ? 'emerald' : 'gold_ingot', x, y, c.cell * (1 + 0.12 * Math.sin(q * 12 + c.ph)), { alpha: a });
  }
  ctx.restore();
}

/* ------------------------------------------------------------------ Guthaben-Schiene
   Zeigt ausschließlich Bewegung: ein Segmentbalken füllt sich immer wieder neu
   (jede Füllung = eine Auszahlung), es wird nie ein Betrag behauptet.
   Bewusst keine Ziffern — der Betrag wäre eine erfundene Zahl.
   Neu: sitzt als breite Schiene ganz unten (statt als Chip direkt unter dem
   Panel) und füllt von der MITTE nach außen — dieselbe Geste wie das Raster. */
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
  ctx.translate(0, (1 - pop) * 36 - jump * 6);

  ctx.fillStyle = 'rgba(14,11,22,0.88)'; roundRect(ctx, x, y - h / 2, w, h, 10); ctx.fill();
  ctx.strokeStyle = rgba(TOKENS.gold, 0.26 + 0.45 * Math.max(jump, wrap * 0.8)); ctx.lineWidth = 2;
  roundRect(ctx, x, y - h / 2, w, h, 10); ctx.stroke();

  drawText(ctx, 'GUTHABEN', x + 24, y, { size: 22, family: FONTS.silk, weight: 700, color: TOKENS.muted, align: 'left', tracking: 2 });

  // Aufwärts-Pfeil sitzt jetzt am rechten Ende der Schiene
  const ax = x + w - 30, ay = y - 1 - wrap * 6 + Math.sin(t * 6) * 1.5;
  ctx.save(); ctx.globalAlpha *= 0.75 + 0.25 * Math.max(jump, wrap); ctx.fillStyle = TOKENS.gold;
  ctx.beginPath(); ctx.moveTo(ax, ay - 15); ctx.lineTo(ax + 13, ay + 8); ctx.lineTo(ax - 13, ay + 8); ctx.closePath(); ctx.fill();
  ctx.restore();

  // Segmentbalken: läuft von der Mitte nach außen voll und beginnt von vorn
  const n = 18, mx0 = x + 212, mw = w - 62 - 212, sw = (mw - (n - 1) * 4) / n, sh = 28;
  ctx.fillStyle = 'rgba(0,0,0,0.45)'; roundRect(ctx, mx0 - 8, y - sh / 2 - 7, mw + 16, sh + 14, 6); ctx.fill();
  const reach = frac * (n / 2);
  for (let k = 0; k < n; k++) {
    const d = Math.abs(k + 0.5 - n / 2);
    const on = clamp(reach - d), head = clamp(1 - Math.abs(reach - 0.5 - d));
    const sx = mx0 + k * (sw + 4);
    ctx.fillStyle = rgba(TOKENS.gold, 0.10 + 0.72 * on + 0.28 * head);
    ctx.fillRect(sx, y - sh / 2, sw, sh);
  }
  // Auszahlungs-Blitz an beiden Enden
  if (wrap > 0.02) {
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha *= wrap;
    dot(ctx, mx0 + sw / 2, y, 46, TOKENS.gold, 0.5);
    dot(ctx, mx0 + mw - sw / 2, y, 46, TOKENS.gold, 0.5);
    ctx.restore();
    s05_icon(ctx, 'gold_ingot', mx0 + mw - sw / 2, y, 2.4 * (1 + 0.5 * wrap), { alpha: wrap });
  }
  ctx.restore();
}

/* ------------------------------------------------------------------ Konsole
   Eingabezeile liegt jetzt DIREKT unter dem Panel, das Log darunter und rollt
   (drei sichtbare Zeilen). '/sell' tippt sich unverändert 12.82–13.14,
   Enter 13.20, das Echo '/sell' 13.22, 'Verkauft.' mit Haken auf 13.40. */
const s05_TYPE_T = [12.82, 12.90, 12.98, 13.06, 13.14];
const s05_LOGLINES = [
  { t0: 12.22, s: 'Sell-Makro bereit.', k: 'sys' },
  { t0: 12.70, s: 'Inventar voll.', k: 'warn' },
  { t0: 13.22, s: '/sell', k: 'cmd' },
  { t0: 13.40, s: 'Verkauft.', k: 'ok' },
  { t0: 13.92, s: 'Makro sammelt weiter.', k: 'sys' },
];
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

  // rollendes Log darunter
  const L = s05_LOG, la = ez(t, 12.08, 12.26, E.outCubic);
  if (la <= 0.01) return;
  ctx.save();
  ctx.globalAlpha *= la;
  ctx.fillStyle = s05_C.chat; ctx.fillRect(L.x, L.y, L.w, L.h);
  ctx.fillStyle = rgba(TOKENS.secondary, 0.28); ctx.fillRect(L.x, L.y, 3, L.h);
  drawText(ctx, 'LIVE-KONSOLE', L.x + 20, L.y + 20, { size: 18, family: FONTS.silk, weight: 700, color: rgba(TOKENS.muted, 0.75), align: 'left', tracking: 3 });
  ctx.restore();

  let scroll = 0;
  for (let j = 3; j < s05_LOGLINES.length; j++) scroll += ez(t, s05_LOGLINES[j].t0, s05_LOGLINES[j].t0 + 0.06, E.outCubic);
  const lh = 44, top = L.y + 40;
  const ping = impulse(t, 13.40, 6);

  ctx.save();
  ctx.beginPath(); ctx.rect(L.x, L.y + 40, L.w, L.h - 40); ctx.clip();
  for (let j = 0; j < s05_LOGLINES.length; j++) {
    const li = s05_LOGLINES[j];
    const ap = ez(t, li.t0, li.t0 + 0.12, E.outCubic);
    if (ap <= 0.01) continue;
    const row = j - scroll;
    const y = top + row * lh + 22;
    let al = ap * clamp((row + 0.28) * 3);
    if (al <= 0.01) continue;
    const col = li.k === 'ok' ? TOKENS.ok : li.k === 'warn' ? TOKENS.primary : li.k === 'cmd' ? TOKENS.text : TOKENS.muted;
    let x = L.x + 24 - (1 - ap) * 20;
    if (li.k === 'ok') {
      ctx.save(); ctx.globalAlpha *= al;
      s05_icon(ctx, 'check', x + 16, y, 4.2 * (1 + 0.28 * ping));
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      dot(ctx, x + 16, y, 52 * (1 + ping), TOKENS.ok, 0.26 + 0.4 * ping);
      ctx.restore(); ctx.restore();
      x += 46;
    } else if (li.k !== 'cmd') {
      ctx.save(); ctx.globalAlpha *= al * 0.8;
      ctx.fillStyle = rgba(li.k === 'warn' ? TOKENS.primary : TOKENS.secondary, 0.85);
      ctx.fillRect(x + 4, y - 7, 14, 14);
      ctx.restore();
      x += 32;
    }
    drawText(ctx, li.s, x, y, { size: 40, family: FONTS.term, weight: 400, color: col, align: 'left', alpha: al * (li.k === 'sys' ? 0.9 : 1) });
  }
  ctx.restore();
  if (ping > 0.02) shockwave(ctx, L.x + 40, top + (3 - scroll) * lh + 22, clamp((t - 13.40) / 0.5), { radius: 230, color: TOKENS.ok, width: 8, alpha: 0.45 });
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

    /* Kamera: der Wert bei t = 12.000 ist unverändert (zoom 1.030, y -18) — die
       Übergabe aus s04 sitzt damit weiter bildgenau. Danach eine ANDERE Fahrt:
       statt eines geraden Push-ins am Ende driftet sie langsam seitlich, kippt
       minimal und zieht früher an. */
    const settle = 1 - ez(t, 12.0, 12.42, E.outCubic);
    const push = ez(t, 12.90, 15.00, E.inOutCubic);
    const d = t - 12;
    withCamera(ctx, {
      zoom: 1 + 0.030 * settle + 0.014 * Math.sin(d * 2.05) + 0.026 * push
        + 0.028 * impulse(t, s05_ENTER_T, 10) + 0.02 * impulse(t, s05_FULL_T, 12),
      x: 13 * Math.sin(d * 0.78),
      y: -18 * settle + 9 * Math.sin(d * 1.25) - 15 * push,
      rot: 0.008 * Math.sin(d * 0.9),
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
