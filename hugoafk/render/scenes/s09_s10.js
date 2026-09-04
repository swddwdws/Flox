/* s09_s10.js
   s09  23.5–26.5  "Build: Countdown"
        Rechteckiger Voxel-Korridor (Decke, Boden, zwei Wände) rast auf die Kamera zu — off-axis:
        der Fluchtpunkt sitzt RECHTS OBEN, der Korridor öffnet sich nach links unten und bankt
        langsam weg. Zoom-Punch + Shockwave-Ring auf jedem Kick (Achtel ab 23.5, Sechzehntel ab
        25.0), senkrechter Ladebalken am LINKEN Rand 23.5 -> 26.35, das Datum '20.09.2026' regnet
        23.6–24.0 spaltenweise von oben herein (aus der Mitte nach außen) und bekommt ab 25.0
        eskalierende Glitch-Bursts (senkrechte Achse), 'HugoAFK.com' ab 24.4 (Buchstaben ziehen
        sich zusammen), ab 26.0 Weiß-Wash aus dem Fluchtpunkt, 26.35–26.5 harter Schwarz-Halt mit
        einem einzigen roten Voxel in der Mitte.
   s10  26.5–30.0  "Endkarte"
        Die Engine feuert bei 26.5 Weißblitz + Punch; dahinter steht das volle Logo bereits scharf
        (die beiden Hälften schnappen in 3 Frames zusammen, Landungs-Squash statt reinem Zoom).
        Voxel-Fontäne nach oben-außen mit Schwerkraft, zwei flache Iso-Schockscheiben, danach
        ruhiges Atmen mit Glow-Puls auf den Halbzeit-Kicks (27.5 / 28.5). Licht kommt jetzt von
        links unten (Violett), der rote Akzent liegt oben rechts; unten eine dunkle Voxel-Silhouette
        als Horizont, Staub und Blöcke treiben nach unten-links. Typo und Lockup stehen unverändert:
        HugoAFK.com + roter Unterstrich, 'Ab 20.09.2026', violette CTA-Pill mit Specular-Sweep,
        unten der Claim. Ab 29.2 steht alles still.

   Alles ist eine reine Funktion von t. Alle Modulnamen sind s09_s10_-präfixiert. */

/* ------------------------------------------------------------------ timing */
const s09_s10_T = {
  s09a: 23.50, s09b: 26.50,
  dateA: 23.60, dateB: 24.00,          // Voxel-Ziffern setzen sich zusammen
  site09: 24.40,                       // 'HugoAFK.com' (Silkscreen)
  barA: 23.50, barB: 26.35,            // Ladebalken
  wash: 26.00,                         // Entsättigung Richtung Weiß
  black: 26.35,                        // harter Schwarz-Halt
  // s10
  s10a: 26.50, s10b: 30.00,
  site10: 26.62,                       // 'HugoAFK.com' 92 px — steht, bevor der Unterstrich zeichnet
  underA: 26.90, underB: 27.30,        // Unterstrich von der Mitte nach außen
  sub10: 27.40,                        // 'Ab 20.09.2026'
  pill: 27.90,                         // CTA-Pill
  sweepA: 28.60, sweepB: 29.00,        // Specular-Sweep
  claim: 28.50,                        // 'Bleib online. Auch offline.' — auf dem Halbzeit-Kick
  still: 29.20,                        // ab hier steht alles
};

/* Kicks: Achtel ab 23.5, Sechzehntel ab 25.0 (eskalierend bis 26.25) */
const s09_s10_KICKS = (() => {
  const a = [];
  for (let i = 0; i < 6; i++) a.push({ t: 23.5 + i * 0.25, amp: 0.55 + i * 0.05 });
  for (let i = 0; i < 11; i++) a.push({ t: 25.0 + i * 0.125, amp: 0.72 + i * 0.055 });
  return a;
})();
/* Glitch-Bursts auf dem Datum — eskalierend */
const s09_s10_GLITCH = [
  { t: 25.000, a: 0.30 }, { t: 25.500, a: 0.44 }, { t: 25.750, a: 0.58 },
  { t: 26.000, a: 0.74 }, { t: 26.125, a: 0.88 }, { t: 26.250, a: 1.00 },
];

/* ------------------------------------------------------------------ helpers */
// hex-sicherer Mix — mixColor() liefert 'rgb(...)', das shade()/cube() als Schwarz lesen würden
function s09_s10_mix(h1, h2, f) {
  const a = hexToRgb(h1), b = hexToRgb(h2);
  const h = v => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0');
  return '#' + h(lerp(a[0], b[0], f)) + h(lerp(a[1], b[1], f)) + h(lerp(a[2], b[2], f));
}
// Schriftgröße verkleinern, bis die Zeile in maxW passt (Tracking bleibt proportional)
function s09_s10_fit(ctx, str, o, maxW, trackF) {
  const tf = trackF == null ? -0.04 : trackF;
  let size = o.size;
  for (let k = 0; k < 90 && size > 20; k++) {
    if (measureText(ctx, str, Object.assign({}, o, { size: size, tracking: tf * size })) <= maxW) break;
    size -= 1;
  }
  return size;
}
// billiger Shockwave-Ring (kein blur-Filter -> kein zusätzlicher Full-Frame-Pass).
// o.flat < 1 staucht den Ring zu einer liegenden Scheibe (Iso-Schockwelle).
function s09_s10_ring(ctx, x, y, life, o) {
  if (life <= 0 || life >= 1) return;
  const R = (o.radius || 900) * E.outCubic(life), fl = o.flat ?? 1;
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  ctx.translate(x, y); if (fl !== 1) ctx.scale(1, fl);
  ctx.strokeStyle = o.color || T().primary;
  ctx.globalAlpha = (1 - life) * (o.alpha ?? 0.8);
  ctx.lineWidth = (o.width || 10) * (1 - life * 0.6);
  ctx.beginPath(); ctx.arc(0, 0, R, 0, TAU); ctx.stroke();
  ctx.globalAlpha *= 0.30; ctx.lineWidth = (o.width || 10) * 5 * (1 - life * 0.6);
  ctx.beginPath(); ctx.arc(0, 0, R, 0, TAU); ctx.stroke();
  ctx.restore();
}

/* -------------------------------------------------------- Voxel-Typografie */
/* Text wird einmalig in ein Offscreen-Canvas gerastert und in Blockzellen zerlegt.
   Lazy (nicht auf Modulebene), damit die Webfonts sicher geladen sind. */
const s09_s10_VOXCACHE = new Map();
function s09_s10_voxelText(str, o, pitch) {
  const key = str + '|' + o.size + '|' + o.family + '|' + o.weight + '|' + pitch;
  const hit = s09_s10_VOXCACHE.get(key); if (hit) return hit;
  const cw = 1024, chh = 256;
  const cnv = makeCanvas(cw, chh), x = cnv.getContext('2d', { willReadFrequently: true });
  x.clearRect(0, 0, cw, chh);
  drawText(x, str, cw / 2, chh / 2, Object.assign({}, o, { color: '#FFFFFF', align: 'center', baseline: 'middle' }));
  let L; x.save(); L = layoutChars(x, str, o); x.restore();
  const im = x.getImageData(0, 0, cw, chh).data;
  const cols = Math.floor(cw / pitch), rows = Math.floor(chh / pitch);
  const x0 = cw / 2 - L.width / 2, cells = [];
  let minR = 1e9, maxR = -1e9, minC = 1e9, maxC = -1e9;
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
    let sum = 0, n = 0;
    for (let yy = 1; yy < pitch; yy += 2) for (let xx = 1; xx < pitch; xx += 2) {
      const px = c * pitch + xx, py = r * pitch + yy;
      sum += im[(py * cw + px) * 4 + 3]; n++;
    }
    const cov = sum / (n * 255);
    if (cov < 0.42) continue;
    const px = (c + 0.5) * pitch, py = (r + 0.5) * pitch;
    let ci = 0;
    for (let i = 0; i < L.chars.length; i++) {
      const g = L.chars[i];
      if (px >= x0 + g.x - pitch * 0.6 && px < x0 + g.x + g.w + pitch * 0.6) { ci = i; break; }
      if (px >= x0 + g.x) ci = i;
    }
    minR = Math.min(minR, r); maxR = Math.max(maxR, r);
    minC = Math.min(minC, c); maxC = Math.max(maxC, c);
    cells.push({ x: px - cw / 2, y: py - chh / 2, r: r, c: c, ci: ci, h: hash2(r * 61 + 7, c * 131 + 13), h2: hash2(c * 17 + 3, r * 97 + 41) });
  }
  const out = { cells: cells, pitch: pitch, width: L.width, n: Math.max(1, L.chars.length), r0: minR, r1: maxR, c0: minC, c1: maxC };
  s09_s10_VOXCACHE.set(key, out);
  return out;
}

/* --------------------------------------------------------- s09 Korridor
   Statt eines zentrierten Rings: ein RECHTECKIGER Voxel-Korridor. Die Blöcke sitzen auf
   drei Schalen um einen rechteckigen Querschnitt (Decke, Boden, zwei Wände), jede vierte
   Tiefenbahn ist eine dichtere "Rippe". Der Fluchtpunkt liegt nicht in der Bildmitte,
   sondern rechts über dem Datum — der Korridor öffnet sich diagonal nach links unten. */
const s09_s10_COR = (() => {
  const M = 17, NX = 5, NY = 5, SHELL = [1.00, 1.46, 2.05], DENS = [0.72, 0.50, 0.28];
  const per = [];                                   // Querschnitts-Perimeter, -1..1
  for (let i = 0; i < NX; i++) { const u = -1 + 2 * i / (NX - 1); per.push([u, -1], [u, 1]); }
  for (let j = 1; j < NY - 1; j++) { const v = -1 + 2 * j / (NY - 1); per.push([-1, v], [1, v]); }
  const lanes = [];
  for (let r = 0; r < M; r++) {
    const rib = r % 4 === 0, slots = [];
    for (let sh = 0; sh < SHELL.length; sh++) for (let k = 0; k < per.length; k++) {
      const h = hash2(r * 131 + sh * 17 + 5, k * 79 + 11);
      if (h > DENS[sh] + (rib ? 0.15 : 0)) continue;
      slots.push({
        px: per[k][0] * SHELL[sh] + (hash2(k * 23 + 3, r * 47 + sh) - 0.5) * 0.17,
        py: per[k][1] * SHELL[sh] + (hash2(r * 13 + k, sh * 91 + 7) - 0.5) * 0.17,
        sj: (sh === 0 ? 0.92 : sh === 1 ? 1.14 : 1.44) * (0.74 + hash2(k * 7 + 1, r * 53 + sh * 3) * 0.58),
        zj: (hash2(k * 5 + 2, r * 11 + sh) - 0.5) * 0.038,
        cj: hash2(r * 7 + 1, k * 29 + sh * 13),
        rib: rib,
      });
    }
    slots.sort((a, b) => a.py - b.py);              // Decke zuerst, Boden zuletzt (Iso-Malordnung)
    lanes.push({ u0: r / M, slots: slots });
  }
  return lanes;
})();

// Fluchtpunkt des Korridors — rechts oben, nicht Bildmitte
function s09_s10_vp(t) {
  const tau = t - s09_s10_T.s09a;
  return { x: 676 + 26 * Math.sin(tau * 0.70), y: 592 + 20 * Math.cos(tau * 0.55) };
}

function s09_s10_corridor(ctx, t, energy, vp) {
  const f = 860, ZN = 52, ZF = 3200, LR = Math.log(ZF / ZN);
  const tau = t - s09_s10_T.s09a;
  const ph = 0.34 * tau + 0.195 * tau * tau;        // Tempo steigt über den Build
  const RX = 615, RY = 690;
  const roll = 0.125 * Math.sin(tau * 0.80) + 0.055 * tau;   // der Korridor bankt langsam weg
  const cr = Math.cos(roll), sr = Math.sin(roll);
  const order = [];
  for (const lane of s09_s10_COR) {
    let u = (lane.u0 - ph) % 1; if (u < 0) u += 1;
    order.push({ lane: lane, u: u });
  }
  order.sort((a, b) => b.u - a.u);                  // hinten zuerst
  for (const it of order) {
    const depth = Math.pow(1 - it.u, 1.40);
    const fade = smoothstep(remap(it.u, 0.995, 0.78)) * clamp(remap(it.u, 0.0, 0.075)) * (0.20 + 0.80 * depth);
    if (fade < 0.012) continue;
    for (const sl of it.lane.slots) {
      let u = it.u + sl.zj; if (u < 0.002) u = 0.002; if (u > 0.998) u = 0.998;
      const z = ZN * Math.exp(LR * u), s = f / (z + f);
      const size = 132 * s * sl.sj;
      if (size < 1.4) continue;
      const X = sl.px * RX, Y = sl.py * RY;
      const x = vp.x + (X * cr - Y * sr) * s;
      const y = vp.y + (X * sr + Y * cr) * s;
      if (x < -280 || x > W + 280 || y < -340 || y > H + 340) continue;
      // Farblogik statt Zufall: Boden rot, Decke violett, eine wandernde Bande läuft durch
      const pyn = sl.py / 2.05;
      const mixv = clamp(0.50 + 0.42 * pyn + 0.20 * Math.sin(t * 1.7 + it.u * 9 + sl.px * 2.1) + (sl.cj - 0.5) * 0.26);
      const col = s09_s10_mix(TOKENS.secondary, TOKENS.primary, mixv);
      const al = Math.min(1, fade * (0.80 + 0.20 * energy) * (sl.rib ? 1.14 : 1));
      cube(ctx, 0, 0, 0, {
        size: size, cx: x, cy: y, color: col, alpha: al,
        topF: 1.18 + 0.22 * energy + (sl.rib ? 0.14 : 0), leftF: 0.60, rightF: 0.34,
        outline: size > 18 ? (mixv > 0.5 ? '#FF8A6B' : TOKENS.violetHot) : null,
        outlineAlpha: 0.32 * al, outlineWidth: 1.3,
      });
    }
  }
}

/* Riser-Streifen, die aus dem Fluchtpunkt zur Kamera schießen */
const s09_s10_WARP = new Warp({ seed: 3371, count: 110, color: TOKENS.violetHot, speed: 0.7 });

/* ------------------------------------------------------------ s09 Datum */
const s09_s10_DATE_STR = '20.09.2026';
const s09_s10_DATE_Y = 800;
const s09_s10_PITCH = 8;            // finer raster: the date is the hardest fact in the film

const s09_s10_DATE_TRACK = 0.006;      // leicht positiv: die Ziffern bleiben getrennt
const s09_s10_DATE_MAXW = 780;         // hält das Datum rechts von der Ladebalken-Schiene
function s09_s10_dateOpts(ctx) {
  const base = { family: FONTS.body, weight: 800, align: 'center', baseline: 'middle', size: 130 };
  const size = s09_s10_fit(ctx, s09_s10_DATE_STR, base, s09_s10_DATE_MAXW, s09_s10_DATE_TRACK);
  return Object.assign({}, base, { size: size, tracking: s09_s10_DATE_TRACK * size });
}

/* Ankunft (23.6–24.0): die Ziffern REGNEN spaltenweise von oben herein, von der Mitte nach
   außen; jeder Block zieht beim Fallen eine senkrechte Schliere und rastet hart ein.
   g = Glitch-Stärke 0..1, fr = Framezähler (deterministisch aus t) */
function s09_s10_dateBlocks(ctx, V, cy, t, g, fr, col, dx, dy, alphaMul) {
  const P = V.pitch, bs = P * 0.84;      // kleinere Zellen -> die Punzen von 0/6/9 bleiben offen
  const half = Math.max(1, V.width / 2);
  ctx.save();
  ctx.fillStyle = col;
  for (const cell of V.cells) {
    const key = clamp(Math.abs(cell.x) / half);     // Spaltenreihenfolge: Mitte -> außen
    const t0 = s09_s10_T.dateA + key * (s09_s10_T.dateB - s09_s10_T.dateA - 0.215) + cell.h * 0.075;
    const p = clamp((t - t0) / 0.20);
    if (p <= 0) continue;
    const e = E.outQuint(p);
    let x = CX + cell.x + (1 - e) * (cell.h2 - 0.5) * 26 + dx;
    let y = cy + cell.y - (1 - e) * (340 + cell.h2 * 230) + dy;
    // Glitch versetzt nur die INNEREN Spalten, rastergenau und um genau eine Zelle nach oben
    // oder unten — die waagrechte Ausdehnung der Ziffern bleibt damit immer stehen.
    if (g > 0.02 && cell.c > V.c0 + 1 && cell.c < V.c1 - 1) {
      const colH = hash2(cell.c * 13 + 1, fr * 7 + 3);
      if (colH < 0.075 + 0.13 * g) y += (hash2(cell.c * 29 + 5, fr * 11 + 9) < 0.5 ? -1 : 1) * P;
      const bh = hash2(cell.c * 41 + cell.r * 3, fr * 17 + 21);
      if (bh < 0.03 * g) { y += (hash2(cell.r * 7 + 5, fr * 19 + 2) < 0.5 ? -1 : 1) * P; x += (hash2(cell.c, fr) < 0.5 ? -1 : 1) * P; }
    }
    const s = bs * lerp(0.82, 1, e);
    const hgt = s * lerp(3.6, 1, E.outCubic(p));    // Fall-Schliere nach oben
    const al = clamp(p * 3) * alphaMul * lerp(0.5, 1, e);
    if (al <= 0.02) continue;
    ctx.globalAlpha = al;
    ctx.fillRect(Math.round(x - s / 2), Math.round(y + s / 2 - hgt), Math.ceil(s), Math.ceil(hgt));
  }
  ctx.restore();
}

function s09_s10_dateBevel(ctx, V, cy, t, ink) {
  // feine Blockkanten: obere Lichtkante, untere Schattenkante -> Voxel-Anmutung
  const P = V.pitch, bs = P * 0.84, lw = Math.max(2, Math.round(P * 0.16));
  const half = Math.max(1, V.width / 2);
  ctx.save();
  for (let pass = 0; pass < 2; pass++) {
    ctx.fillStyle = pass === 0 ? `rgba(255,255,255,${0.45 * (1 - (ink || 0))})` : `rgba(24,10,34,${0.42 + 0.30 * (ink || 0)})`;
    ctx.beginPath();
    for (const cell of V.cells) {
      const key = clamp(Math.abs(cell.x) / half);
      const t0 = s09_s10_T.dateA + key * (s09_s10_T.dateB - s09_s10_T.dateA - 0.215) + cell.h * 0.075;
      if (t < t0 + 0.20) continue;                    // erst wenn der Block sitzt
      if (pass === 0 && cell.r === V.r0) continue;    // keine helle Lichtkante auf der obersten Zellreihe
      const x = CX + cell.x - bs / 2, y = cy + cell.y - bs / 2;
      if (pass === 0) ctx.rect(Math.round(x), Math.round(y), Math.ceil(bs), lw);
      else ctx.rect(Math.round(x), Math.round(y + bs - lw), Math.ceil(bs), lw);
    }
    ctx.fill();
  }
  ctx.restore();
}

/* ------------------------------------------------------------ s09 Szene */
SCENES.s09 = {
  draw(ctx, lt, t, dur, sc) {
    /* ---- 26.35–26.5: harter Schwarz-Halt, ein roter Voxel, Stille ---- */
    if (t >= s09_s10_T.black) {
      ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.fillStyle = '#000000'; ctx.fillRect(0, 0, W, H); ctx.restore();
      const a = 1;                                  // steht sofort — harter Schnitt, kein Einblenden
      const bh = t - s09_s10_T.black;
      const sz = 38 * lerp(1.35, 1, E.outExpo(clamp(bh / 0.09))) * (1 + 0.02 * Math.sin(bh * 26));
      radialFill(ctx, CX, CY, 240 + 26 * Math.sin(bh * 22), [[0, rgba(TOKENS.primary, (0.16 + 0.05 * Math.sin(bh * 22)) * a)], [1, rgba(TOKENS.primary, 0)]], 'lighter');
      cube(ctx, 0, 0, 0, {
        size: sz, cx: CX, cy: CY - sz * 0.5, color: TOKENS.primary, alpha: a,
        topF: 1.35, leftF: 0.72, rightF: 0.46, outline: '#FFB0A0', outlineAlpha: 0.5, outlineWidth: 1.5,
      });
      FX.bloom = 0.14; FX.bloomBlur = 22; FX.grain = 0; FX.vignette = 0; FX.scan = 0;
      FX.zoom = 1; FX.rgb = 0; FX.glitch = 0; FX.shake = 0; FX.blur = 0;
      return;
    }

    const energy = clamp((t - s09_s10_T.s09a) / 2.85);
    const eE = E.inQuad(energy);
    const fr = Math.floor(t * FPS + 1e-6);
    const vp = s09_s10_vp(t);

    /* ---- Kicks: Zoom-Punch (+ ganz leichter Shake auf den späten Sechzehnteln) ---- */
    let punch = 0, lastKicks = [];
    for (const k of s09_s10_KICKS) {
      if (t < k.t) break;
      punch = Math.max(punch, k.amp * Math.exp(-15 * (t - k.t)));
      lastKicks.push(k);
    }
    lastKicks = lastKicks.slice(-3);
    FX.zoom *= 1 + 0.034 * punch;
    if (t >= 25.75) FX.shake = Math.max(FX.shake, 4.5 * punch);
    FX.bloom = Math.max(FX.bloom, 0.19 + 0.13 * eE + 0.10 * punch);
    FX.bloomBlur = 30;

    /* ---- Welt: Korridor unter eigener Kamera; der Punch drückt in die Korridorachse ---- */
    withCamera(ctx, { zoom: 1 + 0.10 * punch + 0.05 * eE, ox: vp.x, oy: vp.y }, c => {
      s09_s10_corridor(c, t, energy, vp);
      // dunkler Kern im Fluchtpunkt -> der Korridor bekommt Sog
      radialFill(c, vp.x, vp.y, 480, [[0, rgba('#05030A', 0.90)], [0.45, rgba('#05030A', 0.56)], [1, rgba('#05030A', 0)]]);
      radialFill(c, vp.x, vp.y, 600, [[0, rgba(TOKENS.deepViolet, 0.20 + 0.22 * eE)], [1, rgba(TOKENS.deepViolet, 0)]], 'lighter');
      s09_s10_WARP.draw(c, t - s09_s10_T.s09a, { cx: vp.x, cy: vp.y, speed: 0.45 + 1.5 * eE, alpha: 0.10 + 0.34 * eE, len: 1.4, width: 2.2, color: TOKENS.violetHot });
      // Shockwaves auf den Kicks — flach in die Korridorperspektive gelegt
      for (const k of lastKicks) s09_s10_ring(c, vp.x, vp.y, remap(t, k.t, k.t + 0.42), { radius: 1220, flat: 0.78, color: k.amp > 0.9 ? TOKENS.primary : TOKENS.violetHot, width: 9 + 8 * k.amp, alpha: 0.42 * k.amp });
      // heller Kernblitz auf dem Kick
      radialFill(c, vp.x, vp.y, 520, [[0, rgba(TOKENS.violetHot, 0.26 * punch + 0.05)], [1, rgba(TOKENS.violetHot, 0)]], 'lighter');
    });

    // Abdunklung um die Typo-Zone herum (Lesbarkeit über dem bewegten Korridor)
    ctx.save();
    ctx.globalAlpha = 0.80;
    radialFill(ctx, CX - 20, 862, 590, [[0, rgba('#08060E', 0.95)], [0.5, rgba('#08060E', 0.72)], [1, rgba('#08060E', 0)]]);
    ctx.restore();
    band(ctx, 866, 320, 0.38);

    /* ---- Ladebalken: am LINKEN Rand, füllt von unten nach oben ---- */
    let hy;
    {
      const bx = 120, blen = 1060, by = 860, p = clamp(remap(t, s09_s10_T.barA, s09_s10_T.barB));
      const y0 = by - blen / 2, y1 = by + blen / 2, th = 12;
      ctx.save();
      // Schiene: dunkel, schmal, mit violettem Rand — legt sich nicht als Balken über den Korridor
      ctx.fillStyle = 'rgba(26,12,44,0.55)';
      roundRect(ctx, bx - th / 2 - 5, y0 - 8, th + 10, blen + 16, (th + 10) / 2); ctx.fill();
      ctx.strokeStyle = rgba(TOKENS.secondary, 0.30); ctx.lineWidth = 1.5; ctx.stroke();
      // Teilstriche — nach links aus der Schiene heraus
      ctx.fillStyle = rgba(TOKENS.violetHot, 0.42);
      for (let i = 0; i <= 12; i++) { const tl = i % 4 === 0 ? 12 : 6; ctx.fillRect(bx - th / 2 - 3 - tl, y1 - (i / 12) * blen - 1, tl, 2); }
      // Füllung von unten nach oben
      const L = blen * p; hy = y1 - L;   // hy = Kopf der Füllung
      if (L > 2) {
        const g = ctx.createLinearGradient(0, y1, 0, hy);
        g.addColorStop(0, TOKENS.deepRed); g.addColorStop(0.65, TOKENS.primary); g.addColorStop(1, '#FF8A6B');
        ctx.fillStyle = g; ctx.shadowColor = TOKENS.primary; ctx.shadowBlur = 26;
        roundRect(ctx, bx - th / 2, hy, th, L, th / 2); ctx.fill();
        ctx.shadowBlur = 0;
      }
      ctx.restore();
      // Kopf des Balkens
      dot(ctx, bx, hy, 20 + 8 * punch, TOKENS.primary, 0.9);
      ctx.save(); ctx.fillStyle = '#FFFFFF'; ctx.globalAlpha = 0.95; ctx.fillRect(bx - 13, hy - 2.5, 26, 5); ctx.restore();
    }

    /* ---- ab 26.0 entsättigt die WELT Richtung Weiß — das Licht flutet aus dem Fluchtpunkt
           heraus über den Korridor (Datum + URL liegen darüber) ---- */
    const wash = remap(t, s09_s10_T.wash, s09_s10_T.black);
    if (wash > 0.001) {
      ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.globalCompositeOperation = 'saturation'; ctx.globalAlpha = clamp(wash * 1.15);
      ctx.fillStyle = '#808080'; ctx.fillRect(0, 0, W, H);
      ctx.restore();
      // additives Licht: radial aus dem Fluchtpunkt, wächst über das ganze Bild
      const R = lerp(320, 2300, Math.pow(wash, 0.80));
      radialFill(ctx, vp.x, vp.y, R,
        [[0, `rgba(255,255,255,${clamp(Math.pow(wash, 1.75) * 0.60)})`], [0.55, `rgba(255,255,255,${clamp(Math.pow(wash, 2.2) * 0.30)})`], [1, 'rgba(255,255,255,0)']], 'lighter');
      ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.globalAlpha = clamp(Math.pow(wash, 6) * 0.86);
      ctx.fillStyle = '#FFFFFF'; ctx.fillRect(0, 0, W, H);
      ctx.restore();
      FX.vignette = Math.min(FX.vignette, 0.5 * (1 - wash));
    }
    // Tinte: je heller die Welt wird, desto dunkler werden Datum und URL — sie bleiben immer lesbar
    const ink = smoothstep(clamp(remap(wash, 0.16, 0.62)));
    const inkCol = s09_s10_mix(T().text, '#1B0A28', ink);

    /* ---- Datum: Voxel-Ziffern + eskalierende Glitch-Bursts (senkrechte Achse) ---- */
    const o = s09_s10_dateOpts(ctx);
    const V = s09_s10_voxelText(s09_s10_DATE_STR, o, s09_s10_PITCH);
    let g = 0;
    for (const b of s09_s10_GLITCH) { if (t < b.t) break; g = Math.max(g, b.a * Math.exp(-13 * (t - b.t))); }
    const cy = s09_s10_DATE_Y;
    // Je weiter die Welt ausbleicht, desto ruhiger wird das Datum: es rastet zum Schluss als
    // einziges scharfes Element ein, während drumherum alles zerfällt.
    const gDate = g * (1 - 0.85 * ink);
    // Ganzwort-Stutter: das Datum springt auf den Bursts rastergenau NACH OBEN/UNTEN,
    // bleibt dabei aber als Wort komplett lesbar (statt in Zeilen zu zerfallen).
    const stut = (gDate > 0.35 && hash2(fr * 23 + 5, 91) < 0.45)
      ? (hash2(fr * 31 + 7, 13) < 0.5 ? -1 : 1) * 10 * (1 + Math.floor(gDate * 2)) : 0;
    // Glühen unter den Ziffern
    radialFill(ctx, CX, cy, 470, [[0, rgba(TOKENS.secondary, (0.16 + 0.16 * eE + 0.18 * g) * (1 - ink))], [1, rgba(TOKENS.secondary, 0)]], 'lighter');
    if (gDate > 0.02) {
      const dd = 6 * gDate + 3;                    // Farbversatz jetzt senkrecht
      ctx.save();
      ctx.globalCompositeOperation = ink > 0.5 ? 'source-over' : 'lighter';
      s09_s10_dateBlocks(ctx, V, cy, t, gDate, fr, s09_s10_mix(TOKENS.primary, '#5A0E14', ink), 0, stut - dd, 0.85 * (1 - 0.7 * ink));
      s09_s10_dateBlocks(ctx, V, cy, t, gDate, fr, s09_s10_mix(TOKENS.secondary, '#2E1148', ink), 0, stut + dd, 0.85 * (1 - 0.7 * ink));
      ctx.restore();
    }
    s09_s10_dateBlocks(ctx, V, cy, t, gDate, fr, inkCol, 0, stut, 1);
    if (gDate < 0.25) s09_s10_dateBevel(ctx, V, cy, t, ink);

    /* ---- 'HugoAFK.com' ab 24.4 — fällt von oben herein, aus der Mitte nach außen ---- */
    {
      const p = clamp((t - s09_s10_T.site09) / 0.42);
      if (p > 0) {
        // Space Grotesk statt Silkscreen: 'HugoAFK.com' behält seine Schreibweise (Silkscreen hat keine Kleinbuchstaben)
        const so = { family: FONTS.head, weight: 600, align: 'center', baseline: 'middle', size: 56 };
        so.size = s09_s10_fit(ctx, 'HugoAFK.com', so, 620, 0.05);
        so.tracking = 0.05 * so.size;
        so.color = inkCol;
        so.stagger = 0.44; so.ease = E.outExpo; so.dir = 0; so.rise = so.size * 0.85; so.blurIn = 6;
        if (ink < 0.5) so.glow = { color: TOKENS.violetHot, blur: 18 };
        const jy = gDate > 0.3 ? (hash2(fr * 3 + 1, 77) - 0.5) * 30 * gDate : 0;
        drawKinetic(ctx, 'HugoAFK.com', CX, 940 + jy, so, p, 'drop');
      }
    }

    /* ---- globale Glitch-Bursts ---- */
    if (g > 0.02) {
      // bewusst niedrig: die Engine-Slices dürfen die Ziffern nicht zerschneiden — die Eskalation
      // tragen RGB-Split, Shake, Zoom-Punch, Korridortempo und der Weiß-Wash
      FX.glitch = Math.max(FX.glitch, 0.13 * g);
      FX.rgb = Math.max(FX.rgb, 16 * g * (1 - 0.6 * ink));
      FX.rgbAngle = 1.24;                       // Split läuft jetzt steil diagonal, nicht waagrecht
      FX.glitchSeed = 4517 + fr * 13;
    }

  },
};

/* ================================================================ s10 */

/* Voxel-Fontäne: die Detonation wirft die Blöcke aus der Breite des Lockups nach oben-außen,
   Schwerkraft zieht sie wieder herunter (statt eines symmetrischen Radialbursts). */
const s09_s10_BURST = (() => {
  const r = rng(2610), a = [];
  for (let i = 0; i < 620; i++) {
    const q = r(), sx = (r() - 0.5) * 2;                 // Startposition quer über das Lockup
    const up = 0.30 + r() * 0.70;
    a.push({
      x0: sx * 340, y0: (r() - 0.5) * 150,
      vx: sx * (280 + r() * 620) + (r() - 0.5) * 300,
      vy: -(240 + r() * 1420) * up,
      g: 1500 + r() * 1500,
      sz: 5 + r() * 21,
      rot: r() * TAU, spin: (r() - 0.5) * 8,
      col: q < 0.40 ? TOKENS.primary : q < 0.72 ? TOKENS.secondary : q < 0.9 ? TOKENS.violetHot : '#FFFFFF',
      life: 0.85 + r() * 0.75,
    });
  }
  return a;
})();

/* Hintergrund-Voxel in drei Tiefenschichten, die langsam nach UNTEN-LINKS treiben */
const s09_s10_MOTES = (() => {
  const r = rng(7714), o = [];
  const LAYER = [{ n: 24, s: [7, 14], v: 11, a: [0.10, 0.20] }, { n: 16, s: [15, 27], v: 25, a: [0.14, 0.26] }, { n: 7, s: [34, 62], v: 46, a: [0.07, 0.14] }];
  for (const L of LAYER) for (let i = 0; i < L.n; i++) o.push({
    x: -60 + r() * (W + 120), y: r() * (H + 200), s: lerp(L.s[0], L.s[1], r()),
    v: L.v * (0.8 + r() * 0.5), vx: -L.v * 0.42 * (0.7 + r() * 0.6),
    a: lerp(L.a[0], L.a[1], r()), ph: r() * TAU,
    col: r() < 0.26 ? TOKENS.primary : (r() < 0.55 ? TOKENS.violetHot : TOKENS.secondary),
  });
  return o;
})();
const s09_s10_DUST = new Particles({
  seed: 4402, count: 110, size: [2, 6], vel: { x: -13, y: 17 }, spread: 0.8,
  area: { x0: -80, y0: -80, x1: W + 80, y1: H + 80 }, color: TOKENS.violetHot, alpha: 0.45, drift: 26, twinkle: 1.2,
});

/* dunkle Voxel-Silhouette am unteren Bildrand — ein Voxel-Boden hinter dem Claim.
   'top' ist die Höhe der Deckfläche, damit die Horizontlinie geschlossen bleibt. */
const s09_s10_HORIZON = (() => {
  const r = rng(8461), a = [];
  for (let i = 0; i < 11; i++) a.push({ x: -150 + i * 130 + r() * 26, top: 1776 + r() * 74, s: 104 + r() * 28, hot: r() < 0.28 });
  return a;
})();

/* Logo-Glow einmalig offscreen (per-Frame-blur auf einem großen Bild kostet ~30 ms) */
const s09_s10_LOGO = { w: 760, pad: 96, glow: null, cx: 495 };   // safe-box centre, not frame centre
function s09_s10_logoGlow() {
  if (s09_s10_LOGO.glow) return s09_s10_LOGO.glow;
  const M = IMG.meta, s = s09_s10_LOGO.w / M.full.w, h = M.full.h * s, pad = s09_s10_LOGO.pad;
  const c = makeCanvas(Math.ceil(s09_s10_LOGO.w + pad * 2), Math.ceil(h + pad * 2));
  const x = c.getContext('2d');
  x.filter = 'blur(30px)';
  x.drawImage(IMG.logo, pad, pad, s09_s10_LOGO.w, h);
  x.filter = 'none';
  s09_s10_LOGO.h = h;
  s09_s10_LOGO.glow = c;
  return c;
}

// Bewegung friert ab 29.2 sanft ein — das letzte Bild steht absolut still
function s09_s10_motionTime(t) {
  const s = s09_s10_T.still;
  if (t <= s) return t;
  const k = 3.4;
  return s + (1 - Math.exp(-k * (t - s))) / k;
}

const s09_s10_SITE = 'HugoAFK.com';
const s09_s10_SUB = 'Ab 20.09.2026';
const s09_s10_CTA = 'Jetzt vormerken.';
const s09_s10_CLAIM = 'Bleib online. Auch offline.';

SCENES.s10 = {
  draw(ctx, lt, t, dur, sc) {
    const a = t - s09_s10_T.s10a;                 // 0 .. 3.5
    const tm = s09_s10_motionTime(t);
    const calm = clamp(remap(t, s09_s10_T.still - 0.3, s09_s10_T.still + 0.35));   // 0 -> 1 = alles beruhigt
    const live = 1 - calm;
    // Halbzeit-Kicks
    const k1 = impulse(t, 27.5, 6.5), k2 = impulse(t, 28.5, 6.5);
    const kick = Math.max(k1, k2) * live;

    /* ---- Hintergrund: Licht kommt von LINKS UNTEN (violett), der rote Akzent liegt OBEN
           RECHTS; darüber eine schräge Lichtbahn. Läuft mit der ECHTEN Zeit bis 30.0 weiter;
           nur Typo und Logo kommen ab 29.2 zur Ruhe. */
    const breath = 0.5 + 0.5 * Math.sin((t - 26.5) * 1.75);      // Hintergrund-Atem, nie eingefroren
    const breathT = 0.5 + 0.5 * Math.sin((tm - 26.5) * 1.15);    // Logo-Atem, friert mit der Typo ein
    ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = TOKENS.bg; ctx.fillRect(0, 0, W, H); ctx.restore();
    // Grundlicht links unten
    radialFill(ctx, 190 + Math.sin((t - 26.5) * 0.5) * 40, 1230, 910,
      [[0, rgba(TOKENS.secondary, 0.150 + 0.055 * breath)], [0.42, rgba(TOKENS.deepViolet, 0.085)], [1, rgba(TOKENS.deepViolet, 0)]], 'lighter');
    // roter Akzent oben rechts
    radialFill(ctx, 930, 250 + Math.cos((t - 26.5) * 0.45) * 40, 700,
      [[0, rgba(TOKENS.primary, 0.085 + 0.045 * breath)], [1, rgba(TOKENS.primary, 0)]], 'lighter');
    // Kernlicht direkt hinter dem Lockup (hält das Logo frei)
    radialFill(ctx, s09_s10_LOGO.cx, 700, 470,
      [[0, rgba(TOKENS.violetHot, 0.085 + 0.05 * breath + 0.16 * kick + 0.24 * Math.exp(-5 * Math.max(0, a)))], [1, rgba(TOKENS.violetHot, 0)]], 'lighter');
    // schräge Lichtbahn quer durch das Bild
    lightSweep(ctx, 0.38 + 0.025 * Math.sin((t - 26.5) * 0.6), { angle: -0.60, width: 520, color: TOKENS.violetHot, alpha: 0.055 + 0.02 * breath });
    nightSky(ctx, t, { count: 92, seed: 173, color: '#D8CFF0', alpha: 0.18, hMul: 1, drift: true });
    s09_s10_DUST.draw(ctx, t - 20, { alpha: 0.38, scale: 1.1 });
    for (const m of s09_s10_MOTES) {
      const y = ((m.y + (t - 24) * m.v) % (H + 200) + H + 200) % (H + 200) - 100;
      const x = ((m.x + (t - 24) * m.vx) % (W + 200) + W + 200) % (W + 200) - 100 + Math.sin(t * 0.55 + m.ph) * 18;
      cube(ctx, 0, 0, 0, { size: m.s, cx: x, cy: y, color: m.col, alpha: m.a * (0.7 + 0.3 * Math.sin(t * 0.85 + m.ph)) });
    }
    /* ---- Voxel-Boden unten (außerhalb der Safe Area, weit unter dem Claim) ---- */
    {
      const dx = -9 * (t - 26.5);
      // violetter Dunst genau auf der Horizontlinie
      radialFill(ctx, 470, 1806, 760, [[0, rgba(TOKENS.secondary, 0.085 + 0.025 * breath)], [1, rgba(TOKENS.secondary, 0)]], 'lighter');
      for (const c of s09_s10_HORIZON) {
        const x = c.x + dx;
        for (let k = 0; k < 2; k++) cube(ctx, 0, 0, 0, {
          size: c.s, cx: x, cy: c.top + k * c.s, alpha: 0.72,
          color: c.hot ? '#3A1846' : '#241238',
          topF: k === 0 ? (c.hot ? 2.15 : 1.85) : 1.1, leftF: 0.70, rightF: 0.46,
          outline: k === 0 ? TOKENS.secondary : null, outlineAlpha: 0.22, outlineWidth: 1.2,
        });
      }
    }

    /* ---- Voxel-Fontäne (Detonation) ---- */
    if (a < 1.9) {
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      for (const p of s09_s10_BURST) {
        const age = a;
        const al = clamp(1 - age / p.life) * clamp(age * 30);
        if (al <= 0.01) continue;
        const x = CX + p.x0 + p.vx * age;
        const y = 700 + p.y0 + p.vy * age + 0.5 * p.g * age * age;
        if (x < -60 || x > W + 60 || y < -60 || y > H + 60) continue;
        const s = p.sz * lerp(1.25, 0.55, clamp(age / p.life));
        ctx.save();
        ctx.globalAlpha = al * 0.95;
        ctx.translate(x, y); ctx.rotate(p.rot + p.spin * age);
        ctx.fillStyle = p.col;
        ctx.fillRect(-s / 2, -s / 2, s, s);
        ctx.restore();
      }
      ctx.restore();
      // flache Iso-Schockscheiben statt konzentrischer Kreise
      s09_s10_ring(ctx, CX, 706, remap(t, 26.5, 27.05), { radius: 1250, flat: 0.30, color: TOKENS.violetHot, width: 16, alpha: 0.55 });
      s09_s10_ring(ctx, CX, 706, remap(t, 26.55, 27.25), { radius: 1500, flat: 0.22, color: TOKENS.primary, width: 12, alpha: 0.38 });
    }

    /* ---- Logo: sofort scharf; die beiden Hälften schnappen zusammen, Landungs-Squash ---- */
    {
      const M = IMG.meta, s = s09_s10_LOGO.w / M.full.w, lh = M.full.h * s;
      const gl = s09_s10_logoGlow();
      const set = E.outExpo(clamp(a / 0.46));
      const scl = lerp(1.18, 1, set) * (1 + 0.007 * Math.sin((tm - 26.5) * 1.5) * live) * (1 + 0.022 * kick);
      const squash = 1 + 0.13 * Math.exp(-9 * Math.max(0, a));     // breit landen, dann hoch werden
      const split = 30 * Math.exp(-24 * Math.max(0, a));           // Hugo von oben, AFK von unten
      const cyL = 700;
      ctx.save();
      ctx.translate(s09_s10_LOGO.cx, cyL); ctx.scale(scl * squash, scl / squash); ctx.translate(-s09_s10_LOGO.cx, -cyL);
      // Glow (gecached, additiv)
      const ga = 0.30 + 0.14 * breathT * live + 0.17 * breath * (0.35 + 0.65 * calm) + 0.45 * kick + 0.34 * Math.exp(-7 * Math.max(0, a));
      ctx.save();
      ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = clamp(ga);
      ctx.drawImage(gl, s09_s10_LOGO.cx - s09_s10_LOGO.w / 2 - s09_s10_LOGO.pad, cyL - lh / 2 - s09_s10_LOGO.pad);
      ctx.restore();
      const lx = s09_s10_LOGO.cx - s09_s10_LOGO.w / 2, ly = cyL - lh / 2;
      if (split > 0.4) {
        ctx.drawImage(IMG.logoHugo, lx, ly - split, s09_s10_LOGO.w, M.hugo.h * s);
        ctx.drawImage(IMG.logoAfk, lx, ly + M.afk.offsetY * s + split, s09_s10_LOGO.w, M.afk.h * s);
      } else {
        ctx.drawImage(IMG.logo, lx, ly, s09_s10_LOGO.w, lh);
      }
      ctx.restore();
    }

    /* ---- 'HugoAFK.com' + roter Unterstrich ---- */
    const so = { family: FONTS.body, weight: 800, align: 'center', baseline: 'middle', size: 92 };
    so.size = s09_s10_fit(ctx, s09_s10_SITE, so, 780, -0.04);
    so.tracking = -0.04 * so.size;
    const siteW = measureText(ctx, s09_s10_SITE, so);
    {
      const p = clamp((t - s09_s10_T.site10) / 0.28);
      if (p > 0) {
        const oo = Object.assign({}, so, {
          color: T().text, stagger: 0.40, ease: E.outExpo, dir: 0, rise: so.size * 0.75, blurIn: 8,
          glow: { color: TOKENS.violetHot, blur: 16 + 26 * kick },
        });
        drawKinetic(ctx, s09_s10_SITE, CX, 1090, oo, p, 'drop');
      }
      const up = ez(t, s09_s10_T.underA, s09_s10_T.underB, E.outExpo);
      if (up > 0) {
        const hw = (siteW / 2 + 14) * up, uy = 1144;
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        ctx.fillStyle = rgba(TOKENS.primary, 0.30);
        ctx.fillRect(CX - hw, uy - 7, hw * 2, 20);
        ctx.restore();
        ctx.fillStyle = TOKENS.primary;
        ctx.fillRect(CX - hw, uy, hw * 2, 7);
      }
    }

    /* ---- 'Ab 20.09.2026' — zieht sich unter dem Unterstrich auf ---- */
    {
      const p = clamp((t - s09_s10_T.sub10) / 0.5);
      if (p > 0) {
        const oo = { family: FONTS.head, weight: 500, align: 'center', baseline: 'middle', size: 48 };
        oo.size = s09_s10_fit(ctx, s09_s10_SUB, oo, 700, 0.02);
        oo.tracking = 0.02 * oo.size;
        oo.color = rgba(T().text, 0.85);
        oo.ease = E.outExpo;
        drawKinetic(ctx, s09_s10_SUB, CX, 1202, oo, p, 'wipe');
      }
    }

    /* ---- CTA-Pill mit Specular-Sweep ---- */
    {
      const p = clamp((t - s09_s10_T.pill) / 0.42);
      if (p > 0) {
        const sweep = (t >= s09_s10_T.sweepA && t <= s09_s10_T.sweepB) ? remap(t, s09_s10_T.sweepA, s09_s10_T.sweepB) : -1;
        const py = 1292, dropY = (1 - E.outExpo(clamp(p * 1.15))) * -26;
        const po = { size: 52, family: FONTS.body, weight: 800, color: TOKENS.secondary, textColor: '#170A24', padX: 62, glow: false };
        const pw = measureText(ctx, s09_s10_CTA, po) + po.padX * 2;
        const scP = lerp(0.6, 1, E.outBack(clamp(p)));
        ctx.save(); ctx.translate(0, dropY);
        radialFill(ctx, CX, py, pw * 0.85 * scP,
          [[0, rgba(TOKENS.secondary, 0.30 * clamp(p * 2))], [0.5, rgba(TOKENS.secondary, 0.11 * clamp(p * 2))], [1, rgba(TOKENS.secondary, 0)]], 'lighter');
        pill(ctx, s09_s10_CTA, CX, py, po, p, sweep);
        ctx.restore();
      }
    }

    /* ---- Claim — tippt sich wie eine Konsolenzeile ein ---- */
    {
      const p = clamp((t - s09_s10_T.claim) / 0.45);
      if (p > 0) {
        // Space Grotesk statt Silkscreen: der Claim behält seine Groß-/Kleinschreibung und bleibt lesbar
        const oo = { family: FONTS.head, weight: 500, align: 'center', baseline: 'middle', size: 40 };
        oo.size = s09_s10_fit(ctx, s09_s10_CLAIM, oo, 720, 0.02);
        oo.tracking = 0.02 * oo.size;
        oo.color = rgba(T().text, 0.72);
        oo.ease = E.linear; oo.caret = false;
        drawKinetic(ctx, s09_s10_CLAIM, CX, 1380, oo, p, 'type');
      }
    }

    /* ---- FX: kein Ausblenden, sauberes Standbild am Ende ---- */
    FX.bloom = Math.max(0.22, 0.25 + 0.24 * kick + 0.26 * Math.exp(-8 * Math.max(0, a)));
    FX.bloomBlur = 30;
    FX.vignette = Math.min(FX.vignette, 0.46);
    FX.grain = Math.min(FX.grain, 0.035) * (1 - 0.35 * calm);
    FX.fade = 0;
  },
};
