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

/* ================================================================== s06 world */
const s06_s07_ISO = { size: 50, cx: CX, cy: 1125 };   // farm anchor (bot tile 0/0 sits at cy)
const s06_s07_R = 4;                                  // farm half size in blocks
const s06_s07_PROWS = [-3, -1, 1, 3];                 // pumpkin rows
const s06_s07_C = {
  grass: '#3E7C2E', soil: '#63451F', dirt: '#33210E',
  pump: '#CF7716', stem: '#3C8C2C', dead: '#0C0916',
  torch: '#FFB25A', post: '#4A3722',
};
const s06_s07_TORCH = [{ ix: -4, iy: -2 }, { ix: 4, iy: 2 }, { ix: 1, iy: -4 }, { ix: -3, iy: 4 }];
// ground: full top layer + a dirt skirt on the two front edges
const s06_s07_GROUND = (() => {
  const o = [], R = s06_s07_R;
  for (let ix = -R; ix <= R; ix++) for (let iy = -R; iy <= R; iy++) {
    o.push({ ix: ix, iy: iy, iz: 0, c: s06_s07_PROWS.indexOf(iy) >= 0 ? s06_s07_C.soil : s06_s07_C.grass });
    if (ix === R || iy === R) o.push({ ix: ix, iy: iy, iz: -1, c: s06_s07_C.dirt });
  }
  return s06_s07_isoSort(o);
})();
const s06_s07_PUMPS = (() => {
  const o = [], R = s06_s07_R;
  for (const iy of s06_s07_PROWS) for (let ix = -R; ix <= R; ix++) {
    if (((ix + (iy < 0 ? 1 : 0)) % 2 + 2) % 2 !== 0) continue;
    o.push({ ix: ix, iy: iy });
  }
  return s06_s07_isoSort(o.map(c => ({ ix: c.ix, iy: c.iy, iz: 1 })));
})();

/* the bot as a real voxel figure (5 columns × 10 rows, one cube per cell) */
const s06_s07_BOTROWS = [
  '.hhh.',   // head top
  '.hhh.',
  '.hhh.',   // face row
  'attta',   // shoulders + arms
  'attta',
  'attta',
  '.ttt.',   // hips
  '.l.l.',
  '.l.l.',
  '.l.l.',   // feet
];
const s06_s07_BOTPAL = { h: TOKENS.violetHot, t: TOKENS.secondary, a: '#6C2FC4', l: TOKENS.deepViolet };
const s06_s07_BOTVOX = (() => {
  const rows = s06_s07_BOTROWS, R = rows.length, o = [];
  for (let r = 0; r < R; r++) for (let c = 0; c < rows[r].length; c++) {
    const ch = rows[r][c]; if (ch === '.') continue;
    o.push({ j: c - 2, k: R - 1 - r, ch: ch });
  }
  return o;                                   // drawn bottom-up, left-to-right
})();
const s06_s07_U = s06_s07_ISO.size * 0.40;    // voxel edge of the bot (~20 px)
const s06_s07_BOTX = s06_s07_ISO.cx;          // bot stands on tile 0/0
const s06_s07_BOTY = s06_s07_ISO.cy;          // ground surface under the bot

// per-voxel dissolve / rematerialise state — pure function of t
function s06_s07_voxState(i, t) {
  const h = hash1(i * 7 + 3), hx = hash2(i, 11), hy = hash2(i, 29);
  if (t < 15.40) return { dx: 0, dy: 0, sc: 1, a: 1 };
  if (t < 16.42) {                                  // dissolve upward, 15.40 – ~15.97
    const st = 15.40 + h * 0.18, q = remap(t, st, st + 0.42);
    if (q <= 0) return { dx: 0, dy: 0, sc: 1, a: 1 };
    const e = E.outCubic(q);
    return { dx: (hx - 0.5) * 150 * e, dy: -(300 + hy * 190) * e, sc: lerp(1, 0.32, q), a: clamp(1 - q * q * 1.12) };
  }
  const st2 = 16.42 + h * 0.20, q2 = remap(t, st2, st2 + 0.32);   // fly back together
  if (q2 <= 0) return { dx: 0, dy: 0, sc: 1, a: 0 };
  const e2 = E.outCubic(q2);
  return { dx: (hx - 0.5) * 130 * (1 - e2), dy: -(240 + hy * 140) * (1 - e2), sc: lerp(0.4, 1, e2), a: clamp(q2 * 1.7) };
}

function s06_s07_bot(ctx, t) {
  const u = s06_s07_U, bx = s06_s07_BOTX, by = s06_s07_BOTY;
  const bob = Math.sin(t * 2.6) * 3.5 * (t < 15.35 || t > 16.9 ? 1 : 0.2);
  // ground glow under the bot (only while it is actually there)
  let live = 0;
  for (let i = 0; i < s06_s07_BOTVOX.length; i++) live += s06_s07_voxState(i, t).a;
  live /= s06_s07_BOTVOX.length;
  if (live > 0.02) {
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    dot(ctx, bx, by - u * 4, u * 7.5, TOKENS.secondary, 0.20 * live);
    ctx.restore();
  }
  for (let i = 0; i < s06_s07_BOTVOX.length; i++) {
    const v = s06_s07_BOTVOX[i], s = s06_s07_voxState(i, t);
    if (s.a <= 0.01) continue;
    const x = bx + v.j * u + s.dx, y = by - (v.k + 1) * u + bob + s.dy, sz = u * s.sc;
    s06_s07_blk(ctx, x, y, sz, s06_s07_BOTPAL[v.ch], {
      alpha: s.a, topF: 1.3, leftF: 0.86, rightF: 0.6,
      outline: '#180A2E', outlineAlpha: 0.55 * s.a, outlineWidth: 1.6,
    });
    if (s.a < 0.95 && s.a > 0.05) {   // spark on the loose voxels
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      dot(ctx, x, y, sz * 1.5, TOKENS.violetHot, 0.22 * s.a);
      ctx.restore();
    }
  }
  // eyes, only on the intact figure
  const eA = clamp((t < 15.40 ? 1 : 0) + (t > 16.86 ? clamp((t - 16.86) / 0.12) : 0));
  if (eA > 0.02) {
    const y = by - 9 * s06_s07_U + bob;
    ctx.save(); ctx.globalAlpha *= eA; ctx.fillStyle = 'rgba(14,6,26,0.92)';
    ctx.fillRect(Math.round(bx - u * 0.46), Math.round(y + u * 0.30), Math.round(u * 0.26), Math.round(u * 0.26));
    ctx.fillRect(Math.round(bx + u * 0.20), Math.round(y + u * 0.42), Math.round(u * 0.26), Math.round(u * 0.26));
    ctx.restore();
  }
}

/* the farm — solid before the disconnect, violet wireframe while the bot is away */
function s06_s07_farm(ctx, t, wire) {
  const O = s06_s07_ISO, m = O.size * 0.72;
  const oa = 0.2 + wire * 0.6, wc = s06_s07_mix(TOKENS.secondary, TOKENS.violetHot, 0.4);
  // night cast first, then the wireframe fade
  const dead = k => s06_s07_mix(s06_s07_mix(k, '#160C28', 0.36), s06_s07_C.dead, wire * 0.86);
  for (const c of s06_s07_GROUND) {
    cube(ctx, c.ix, c.iy, c.iz, {
      size: O.size, cx: O.cx, cy: O.cy, color: dead(c.c), topF: 1.12, leftF: 0.74, rightF: 0.48,
      outline: wire > 0.05 ? wc : '#101A08', outlineAlpha: wire > 0.05 ? oa : 0.35, outlineWidth: 1.3,
    });
  }
  for (const c of s06_s07_PUMPS) {
    if (c.ix === 0 && c.iy === 0) continue;                     // keep the bot's tile free
    const g = isoPos(c.ix, c.iy, 0, O);
    s06_s07_blk(ctx, g.x, g.y - m, m, dead(s06_s07_C.pump),
      { outline: wire > 0.05 ? wc : '#3A1E06', outlineAlpha: wire > 0.05 ? oa : 0.55, outlineWidth: 1.3 });
    s06_s07_blk(ctx, g.x, g.y - m * 1.3, m * 0.3, dead(s06_s07_C.stem), { alpha: 1 - wire * 0.3 });
  }
  // torches: the only warm light in the night farm (voxel world, not UI)
  for (let i = 0; i < s06_s07_TORCH.length; i++) {
    const c = s06_s07_TORCH[i], g = isoPos(c.ix, c.iy, 0, O), fl = 0.8 + 0.2 * Math.sin(t * 7 + i * 2.1);
    s06_s07_blk(ctx, g.x, g.y - O.size * 0.34, O.size * 0.22, dead(s06_s07_C.post));
    s06_s07_blk(ctx, g.x, g.y - O.size * 0.62, O.size * 0.20, dead(s06_s07_C.torch));
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    dot(ctx, g.x, g.y - O.size * 0.55, O.size * 1.5, s06_s07_C.torch, (0.30 - wire * 0.26) * fl);
    ctx.restore();
  }
}

/* pumpkin items popping out of the farm — before the reset and again once the bot is back */
const s06_s07_POPS = [15.00, 15.25, 16.98, 17.23, 17.48];
// only the front-LEFT pumpkins pop: that corridor is free of the bot (x~540) and the check (x~790)
const s06_s07_POPCELLS = (() => s06_s07_PUMPS.filter(c => c.iy >= 1 && c.ix <= -2))();
function s06_s07_items(ctx, t, wire) {
  if (wire > 0.4) return;
  const O = s06_s07_ISO;
  for (let k = 0; k < s06_s07_POPS.length; k++) {
    const st = s06_s07_POPS[k], life = (t - st) / 0.85;
    if (life <= 0 || life >= 1) continue;
    const cell = s06_s07_POPCELLS[Math.floor(hash1(k * 17 + 5) * s06_s07_POPCELLS.length)];
    if (!cell) continue;
    const g = isoPos(cell.ix, cell.iy, 0, O), e = E.outCubic(life);
    const dx = -(30 + hash2(k, 3) * 48);                             // drift out over the empty left ground
    const x0 = g.x, y0 = g.y - O.size * 1.9;                        // start above the block top
    const x = x0 + dx * e, y = y0 - e * 140 + life * life * 30;     // rise, then a touch of gravity
    const a = clamp((1 - life) * 1.8) * clamp(life / 0.10) * (1 - wire);
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    // short warm trail behind the item (torch light of the voxel world, not UI gold)
    for (let t2 = 1; t2 <= 4; t2++) {
      const e2 = E.outCubic(Math.max(0, life - t2 * 0.055));
      dot(ctx, x0 + dx * e2, y0 - e2 * 140, 28 - t2 * 4, s06_s07_C.torch, a * 0.13 / t2);
    }
    dot(ctx, x, y, 50, s06_s07_C.torch, a * 0.26);
    ctx.restore();
    ctx.save(); ctx.globalAlpha *= a;
    itemIcon(ctx, 'pumpkin', x, y, 4.9, { rotate: (hash2(k, 9) - 0.5) * 0.5 + life * 0.5 });
    ctx.restore();
  }
}

/* the reserved tile: a violet marker on the ground while the bot is gone */
function s06_s07_spot(ctx, t) {
  const a = win(t, 15.55, 15.75, 16.62, 16.86) * (0.5 + 0.5 * pulse(t, 0.5, 5, 15.5));
  if (a <= 0.01) return;
  const O = s06_s07_ISO, p = isoPos(0, 0, 0, O), w = O.size * 0.866, h = O.size * 0.5;
  ctx.save(); ctx.globalAlpha *= a;
  ctx.strokeStyle = TOKENS.violetHot; ctx.lineWidth = 3; ctx.setLineDash([14, 10]); ctx.lineDashOffset = -t * 26;
  ctx.beginPath(); ctx.moveTo(p.x, p.y - h); ctx.lineTo(p.x + w, p.y); ctx.lineTo(p.x, p.y + h); ctx.lineTo(p.x - w, p.y); ctx.closePath(); ctx.stroke();
  ctx.setLineDash([]);
  ctx.save(); ctx.globalCompositeOperation = 'lighter'; dot(ctx, p.x, p.y, O.size * 1.1, TOKENS.secondary, 0.20); ctx.restore();
  // a small pixel label so "same spot" is readable, not just implied
  const ly = p.y - O.size * 1.5 - 8 * Math.sin((t - 15.5) * 2.4);
  ctx.fillStyle = 'rgba(8,4,16,0.72)'; ctx.fillRect(p.x - 92, ly - 20, 184, 40);
  drawText(ctx, 'RESERVIERT', p.x, ly, { size: 24, family: FONTS.silk, weight: 700, color: TOKENS.violetHot, align: 'center', tracking: 2 });
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
  mcChat(ctx, 132, 1198, lines, { size: 36, lineHeight: 48, family: FONTS.term, bgColor: 'rgba(5,3,12,0.68)', pad: 14, extraW: 12 });
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
  const x = 792, y = 1038, sc = E.outBack(p) * (1 + 0.06 * Math.sin((t - 16.9) * 9) * (1 - p));
  ctx.save();
  ctx.globalCompositeOperation = 'lighter'; dot(ctx, x, y, 94 * sc, TOKENS.ok, 0.30 + 0.16 * pulse(t, 0.5, 6, 16.9));
  ctx.restore();
  shockwave(ctx, x, y, remap(t, 16.90, 17.30), { radius: 160, color: TOKENS.ok, width: 8, alpha: 0.7 });
  ctx.save(); ctx.translate(x, y); ctx.scale(sc, sc);
  itemIcon(ctx, 'check', 0, 0, 9);
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

    nightSky(ctx, t, { count: 70, seed: 33, color: '#CFC6E8', alpha: 0.22 * (1 - dark * 0.8), hMul: 0.62, drift: true });
    radialFill(ctx, CX, 1150, 800,
      [[0, rgba(TOKENS.secondary, (0.13 + 0.05 * pulse(t, 0.5, 6, 15.0)) * worldA)], [0.55, rgba(TOKENS.deepViolet, 0.05 * worldA)], [1, 'rgba(0,0,0,0)']], 'lighter');
    // red alarm wash on the beats of the warning
    const al = (1 - remap(t, 15.30, 15.70)) * (0.35 + 0.65 * pulse(t, 0.5, 5.5, 15.0));
    if (al > 0.01) {
      radialFill(ctx, CX, CY, 1160, [[0.35, 'rgba(0,0,0,0)'], [1, rgba(T().primary, 0.30 * al)]], 'lighter');
    }

    s06_s07_dust(ctx, t, 0.4 * (1 - dark * 0.7));

    ctx.save();
    ctx.globalAlpha *= worldA;
    withCamera(ctx, {
      zoom: 1 + 0.026 * Math.sin((t - 15) * 0.85) + 0.035 * impulse(t, 15.40, 6) + 0.022 * impulse(t, 16.42, 5),
      y: -13 * Math.sin((t - 15) * 0.62),
      x: 9 * Math.sin((t - 15) * 0.41 + 1.1),
      rot: 0.004 * Math.sin((t - 15) * 0.5),
      ox: CX, oy: 1130,
    }, c => {
      s06_s07_farm(c, t, wire);
      c.save(); c.globalAlpha = Math.min(1, worldA * 3.4); s06_s07_spot(c, t); c.restore();
      s06_s07_bot(c, t);
      s06_s07_items(c, t, wire);
    });
    ctx.restore();

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

    /* subline — three sentences, 15.5 / 16.4 / 16.9 */
    const subs = [
      { s: 'Trennt sich.', t0: 15.50, y: 752, c: rgba(T().text, 0.85) },
      { s: 'Kommt zurück.', t0: 16.40, y: 808, c: rgba(T().text, 0.85) },
      { s: 'Gleiche Stelle.', t0: 16.90, y: 864, c: TOKENS.violetHot },
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
    const pt = s06_s07_map(off * 0.55, vBtn + off, P);
    const a = clamp(app * app * 2.2) * (1 - lift);
    ctx.save(); ctx.globalAlpha *= a;
    radialFill(ctx, pt.x, pt.y, 60, [[0, 'rgba(255,255,255,0.34)'], [0.62, 'rgba(255,255,255,0.16)'], [1, 'rgba(255,255,255,0)']]);
    ctx.strokeStyle = 'rgba(255,255,255,0.9)'; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(pt.x, pt.y, 54, 0, TAU); ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,0.35)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(pt.x, pt.y, 76, 0, TAU); ctx.stroke();
    ctx.restore();
    const r = remap(t, tp.c, tp.c + 0.34);
    if (r > 0 && r < 1) {
      ctx.save(); ctx.globalAlpha *= (1 - r) * 0.9;
      ctx.strokeStyle = '#FFFFFF'; ctx.lineWidth = 4;
      ctx.beginPath(); ctx.arc(pt.x, pt.y, 52 + E.outCubic(r) * 96, 0, TAU); ctx.stroke();
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
