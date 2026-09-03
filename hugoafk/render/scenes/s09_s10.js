/* s09_s10.js
   s09  23.5–26.5  "Build: Countdown"
        Violett-roter Voxel-Tunnel rast auf die Kamera zu, Zoom-Punch + Shockwave auf jedem Kick
        (Achtel ab 23.5, Sechzehntel ab 25.0), senkrechter Ladebalken 23.5 -> 26.35,
        das Datum '20.09.2026' setzt sich 23.6–24.0 aus Voxel-Ziffern zusammen und bekommt ab 25.0
        eskalierende Glitch-Bursts, 'HugoAFK.com' ab 24.4, ab 26.0 Weiß-Wash,
        26.35–26.5 harter Schwarz-Halt mit einem einzigen roten Voxel in der Mitte.
   s10  26.5–30.0  "Endkarte"
        Die Engine feuert bei 26.5 Weißblitz + Punch; dahinter steht das volle Logo bereits scharf.
        Voxel-Partikel nach außen, Scale-Punch 1.25 -> 1.0, danach ruhiges Atmen mit Glow-Puls auf
        den Halbzeit-Kicks (27.5 / 28.5). Darunter HugoAFK.com + roter Unterstrich, 'Ab 20.09.2026',
        violette CTA-Pill mit Specular-Sweep, unten der Claim. Ab 29.2 steht alles still.

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
// billiger Shockwave-Ring (kein blur-Filter -> kein zusätzlicher Full-Frame-Pass)
function s09_s10_ring(ctx, x, y, life, o) {
  if (life <= 0 || life >= 1) return;
  const R = (o.radius || 900) * E.outCubic(life);
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  ctx.strokeStyle = o.color || T().primary;
  ctx.globalAlpha = (1 - life) * (o.alpha ?? 0.8);
  ctx.lineWidth = (o.width || 10) * (1 - life * 0.6);
  ctx.beginPath(); ctx.arc(x, y, R, 0, TAU); ctx.stroke();
  ctx.globalAlpha *= 0.30; ctx.lineWidth = (o.width || 10) * 5 * (1 - life * 0.6);
  ctx.beginPath(); ctx.arc(x, y, R, 0, TAU); ctx.stroke();
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
  let minR = 1e9, maxR = -1e9;
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
    cells.push({ x: px - cw / 2, y: py - chh / 2, r: r, c: c, ci: ci, h: hash2(r * 61 + 7, c * 131 + 13), h2: hash2(c * 17 + 3, r * 97 + 41) });
  }
  const out = { cells: cells, pitch: pitch, width: L.width, n: Math.max(1, L.chars.length), r0: minR, r1: maxR };
  s09_s10_VOXCACHE.set(key, out);
  return out;
}

/* ------------------------------------------------------------ s09 Tunnel */
const s09_s10_TUN = (() => {
  const M = 16, K = 16, lanes = [];
  for (let r = 0; r < M; r++) {
    const slots = [];
    for (let k = 0; k < K; k++) {
      const h = hash2(r * 37 + 11, k * 91 + 5);
      if (h < 0.34) continue;                       // Lücken -> unregelmäßige, luftige Voxelwand
      slots.push({
        a: k / K * TAU,
        rj: 0.90 + h * 0.30,
        sj: 0.74 + hash2(k * 13 + 7, r * 53 + 3) * 0.66,
        cj: hash2(r * 7 + 1, k * 29 + 9),
        zj: (hash2(k * 5 + 2, r * 11 + 8) - 0.5) * 0.045,
      });
    }
    lanes.push({ u0: r / M, twist: hash1(r * 17 + 3) * TAU, slots: slots, seed: r });
  }
  return lanes;
})();

function s09_s10_tunnel(ctx, t, energy) {
  const f = 900, ZN = 60, ZF = 3400, LR = Math.log(ZF / ZN);
  const tau = t - s09_s10_T.s09a;
  const ph = 0.40 * tau + 0.21 * tau * tau;          // Geschwindigkeit steigt über den Build
  const R = 585, AS = 1.32;
  const order = [];
  for (const lane of s09_s10_TUN) {
    let u = (lane.u0 - ph) % 1; if (u < 0) u += 1;
    order.push({ lane: lane, u: u });
  }
  order.sort((a, b) => b.u - a.u);                   // hinten zuerst
  const tw = t * 0.20;
  for (const it of order) {
    const lane = it.lane;
    // Tiefenabdunklung: hinten fast schwarz, vorn hell -> echter Sog in den Tunnel
    const depth = Math.pow(1 - it.u, 1.35);
    const fade = smoothstep(remap(it.u, 0.995, 0.80)) * clamp(remap(it.u, 0.0, 0.08)) * (0.22 + 0.78 * depth);
    if (fade < 0.012) continue;
    const rot = lane.twist + tw;
    for (const sl of lane.slots) {
      let u = it.u + sl.zj; if (u < 0.002) u = 0.002; if (u > 0.998) u = 0.998;
      const z = ZN * Math.exp(LR * u), s = f / (z + f);
      const size = 128 * s * sl.sj;
      if (size < 1.4) continue;
      const a = sl.a + rot, ca = Math.cos(a), sa = Math.sin(a);
      const m = Math.pow(Math.pow(Math.abs(ca), 4) + Math.pow(Math.abs(sa), 4), -0.25);
      const x = CX + ca * m * R * sl.rj * s;
      const y = CY + sa * m * R * AS * sl.rj * s;
      if (x < -260 || x > W + 260 || y < -320 || y > H + 320) continue;
      const mixv = clamp(sl.cj * 1.35 - 0.20 + 0.26 * Math.sin(t * 1.9 + lane.u0 * 11 + sl.a));
      const col = s09_s10_mix(TOKENS.secondary, TOKENS.primary, mixv);
      const al = fade * (0.82 + 0.18 * energy);
      cube(ctx, 0, 0, 0, {
        size: size, cx: x, cy: y, color: col, alpha: al,
        topF: 1.20 + 0.22 * energy, leftF: 0.60, rightF: 0.34,
        outline: size > 18 ? (mixv > 0.5 ? '#FF8A6B' : TOKENS.violetHot) : null,
        outlineAlpha: 0.34 * al, outlineWidth: 1.3,
      });
    }
  }
}

/* Riser-Streifen, die zur Kamera schießen */
const s09_s10_WARP = new Warp({ seed: 909, count: 110, color: TOKENS.violetHot, speed: 0.7 });

/* ------------------------------------------------------------ s09 Datum */
const s09_s10_DATE_STR = '20.09.2026';
const s09_s10_DATE_Y = 800;
const s09_s10_PITCH = 12;

const s09_s10_DATE_TRACK = 0.006;      // leicht positiv: die Ziffern bleiben getrennt
const s09_s10_DATE_MAXW = 620;         // hält das Datum links von der Ladebalken-Schiene
function s09_s10_dateOpts(ctx) {
  const base = { family: FONTS.body, weight: 800, align: 'center', baseline: 'middle', size: 130 };
  const size = s09_s10_fit(ctx, s09_s10_DATE_STR, base, s09_s10_DATE_MAXW, s09_s10_DATE_TRACK);
  return Object.assign({}, base, { size: size, tracking: s09_s10_DATE_TRACK * size });
}

// g = Glitch-Stärke 0..1, fr = Framezähler (deterministisch aus t)
function s09_s10_dateBlocks(ctx, V, cy, t, g, fr, col, dx, dy, alphaMul) {
  const P = V.pitch, bs = P * 0.84;     // kleinere Zellen -> die Punzen von 0/6/9 bleiben offen
  ctx.save();
  ctx.fillStyle = col;
  for (const cell of V.cells) {
    const t0 = s09_s10_T.dateA + (cell.ci / V.n) * (s09_s10_T.dateB - s09_s10_T.dateA - 0.16) + cell.h * 0.05;
    const p = clamp((t - t0) / 0.17);
    if (p <= 0) continue;
    const e = E.outExpo(p);
    // Anflug aus einer zufälligen Richtung
    const ang = cell.h * TAU, dist = (1 - e) * (90 + cell.h2 * 150);
    let x = CX + cell.x + Math.cos(ang) * dist + dx;
    let y = cy + cell.y + Math.sin(ang) * dist - (1 - e) * 40 + dy;
    // Glitch versetzt nur die INNEREN Zeilen, rastergenau und um max. 3 Zellen ->
    // die Silhouette der Ziffern (Ober- und Unterkante) bleibt immer stehen und lesbar.
    if (g > 0.02 && cell.r > V.r0 + 1 && cell.r < V.r1 - 1) {
      const rowH = hash2(cell.r * 13 + 1, fr * 7 + 3);
      // exakt EINE Zelle Versatz — die Ziffern stottern, zerfallen aber nie
      if (rowH < 0.10 + 0.16 * g) x += (hash2(cell.r * 29 + 5, fr * 11 + 9) < 0.5 ? -1 : 1) * P;
      const bh = hash2(cell.c * 41 + cell.r * 3, fr * 17 + 21);
      if (bh < 0.03 * g) { x += (hash2(cell.c * 7 + 5, fr * 19 + 2) < 0.5 ? -1 : 1) * P; y += (hash2(cell.r, fr) < 0.5 ? -1 : 1) * P; }
    }
    const sc = lerp(2.0, 1, e);
    const s = bs * sc;
    const al = clamp(p * 3) * alphaMul;
    if (al <= 0.02) continue;
    ctx.globalAlpha = al;
    ctx.fillRect(Math.round(x - s / 2), Math.round(y - s / 2), Math.ceil(s), Math.ceil(s));
  }
  ctx.restore();
}

function s09_s10_dateBevel(ctx, V, cy, t, ink) {
  // feine Blockkanten: obere Lichtkante, untere Schattenkante -> Voxel-Anmutung
  const P = V.pitch, bs = P * 0.84, lw = Math.max(2, Math.round(P * 0.16));
  ctx.save();
  for (let pass = 0; pass < 2; pass++) {
    ctx.fillStyle = pass === 0 ? `rgba(255,255,255,${0.45 * (1 - (ink || 0))})` : `rgba(24,10,34,${0.42 + 0.30 * (ink || 0)})`;
    ctx.beginPath();
    for (const cell of V.cells) {
      const t0 = s09_s10_T.dateA + (cell.ci / V.n) * (s09_s10_T.dateB - s09_s10_T.dateA - 0.16) + cell.h * 0.05;
      if (t < t0 + 0.17) continue;                    // erst wenn der Block sitzt
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

    /* ---- Welt: Tunnel unter eigener Kamera (Text bleibt in der Safe Area) ---- */
    withCamera(ctx, { zoom: 1 + 0.10 * punch + 0.05 * eE, ox: CX, oy: CY }, c => {
      s09_s10_tunnel(c, t, energy);
      // schwarzer Kern: der Fluchtpunkt bleibt tief -> der Tunnel bekommt Sog
      radialFill(c, CX, CY, 580, [[0, rgba('#05030A', 0.88)], [0.40, rgba('#05030A', 0.62)], [1, rgba('#05030A', 0)]]);
      radialFill(c, CX, CY, 620, [[0, rgba(TOKENS.deepViolet, 0.20 + 0.22 * eE)], [1, rgba(TOKENS.deepViolet, 0)]], 'lighter');
      s09_s10_WARP.draw(c, t - s09_s10_T.s09a, { cx: CX, cy: CY, speed: 0.45 + 1.5 * eE, alpha: 0.10 + 0.34 * eE, len: 1.4, width: 2.2, color: TOKENS.violetHot });
      // Shockwaves auf den Kicks
      for (const k of lastKicks) s09_s10_ring(c, CX, CY, remap(t, k.t, k.t + 0.42), { radius: 1180, color: k.amp > 0.9 ? TOKENS.primary : TOKENS.violetHot, width: 9 + 8 * k.amp, alpha: 0.42 * k.amp });
      // heller Kernblitz auf dem Kick
      radialFill(c, CX, CY, 520, [[0, rgba(TOKENS.violetHot, 0.26 * punch + 0.05)], [1, rgba(TOKENS.violetHot, 0)]], 'lighter');
    });

    // Abdunklung um die Typo-Zone herum (Lesbarkeit über dem bewegten Tunnel)
    ctx.save();
    ctx.globalAlpha = 0.78;
    radialFill(ctx, CX, 870, 620, [[0, rgba('#08060E', 0.95)], [0.5, rgba('#08060E', 0.72)], [1, rgba('#08060E', 0)]]);
    ctx.restore();
    band(ctx, 866, 320, 0.38);

    /* ---- Ladebalken rechts ---- */
    {
      const bx = 872, blen = 1060, by = 860, p = clamp(remap(t, s09_s10_T.barA, s09_s10_T.barB));
      const y0 = by - blen / 2, y1 = by + blen / 2, th = 12;
      ctx.save();
      // Schiene: dunkel, schmal, mit violettem Rand — legt sich nicht als Balken über den Tunnel
      ctx.fillStyle = 'rgba(26,12,44,0.55)';
      roundRect(ctx, bx - th / 2 - 5, y0 - 8, th + 10, blen + 16, (th + 10) / 2); ctx.fill();
      ctx.strokeStyle = rgba(TOKENS.secondary, 0.30); ctx.lineWidth = 1.5; ctx.stroke();
      // Teilstriche
      ctx.fillStyle = rgba(TOKENS.violetHot, 0.42);
      for (let i = 0; i <= 12; i++) { const tl = i % 4 === 0 ? 12 : 6; ctx.fillRect(bx + th / 2 + 3, y1 - (i / 12) * blen - 1, tl, 2); }
      // Füllung von unten nach oben
      const L = blen * p, hy = y1 - L;   // hy = Kopf der Füllung
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

    /* ---- ab 26.0 entsättigt die WELT Richtung Weiß (Datum + URL liegen darüber) ---- */
    const wash = remap(t, s09_s10_T.wash, s09_s10_T.black);
    if (wash > 0.001) {
      ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.globalCompositeOperation = 'saturation'; ctx.globalAlpha = clamp(wash * 1.15);
      ctx.fillStyle = '#808080'; ctx.fillRect(0, 0, W, H);
      ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = clamp(Math.pow(wash, 2.2) * 0.50);
      ctx.fillStyle = '#FFFFFF'; ctx.fillRect(0, 0, W, H);
      ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = clamp(Math.pow(wash, 6) * 0.84);
      ctx.fillStyle = '#FFFFFF'; ctx.fillRect(0, 0, W, H);
      ctx.restore();
      FX.vignette = Math.min(FX.vignette, 0.5 * (1 - wash));
    }
    // Tinte: je heller die Welt wird, desto dunkler werden Datum und URL — sie bleiben immer lesbar
    const ink = smoothstep(clamp(remap(wash, 0.16, 0.62)));
    const inkCol = s09_s10_mix(T().text, '#1B0A28', ink);

    /* ---- Datum: Voxel-Ziffern + eskalierende Glitch-Bursts ---- */
    const o = s09_s10_dateOpts(ctx);
    const V = s09_s10_voxelText(s09_s10_DATE_STR, o, s09_s10_PITCH);
    let g = 0;
    for (const b of s09_s10_GLITCH) { if (t < b.t) break; g = Math.max(g, b.a * Math.exp(-13 * (t - b.t))); }
    const cy = s09_s10_DATE_Y;
    // Je weiter die Welt ausbleicht, desto ruhiger wird das Datum: es rastet zum Schluss als
    // einziges scharfes Element ein, während drumherum alles zerfällt.
    const gDate = g * (1 - 0.85 * ink);
    // Ganzwort-Stutter: das Datum springt auf den Bursts rastergenau zur Seite,
    // bleibt dabei aber als Wort komplett lesbar (statt in Zeilen zu zerfallen).
    const stut = (gDate > 0.35 && hash2(fr * 23 + 5, 91) < 0.45)
      ? (hash2(fr * 31 + 7, 13) < 0.5 ? -1 : 1) * s09_s10_PITCH * (1 + Math.floor(gDate * 2)) : 0;
    // Glühen unter den Ziffern
    radialFill(ctx, CX, cy, 470, [[0, rgba(TOKENS.secondary, (0.16 + 0.16 * eE + 0.18 * g) * (1 - ink))], [1, rgba(TOKENS.secondary, 0)]], 'lighter');
    if (gDate > 0.02) {
      const dx = 7 * gDate + 3;
      ctx.save();
      ctx.globalCompositeOperation = ink > 0.5 ? 'source-over' : 'lighter';
      s09_s10_dateBlocks(ctx, V, cy, t, gDate, fr, s09_s10_mix(TOKENS.primary, '#5A0E14', ink), stut - dx, 0, 0.85 * (1 - 0.7 * ink));
      s09_s10_dateBlocks(ctx, V, cy, t, gDate, fr, s09_s10_mix(TOKENS.secondary, '#2E1148', ink), stut + dx, 0, 0.85 * (1 - 0.7 * ink));
      ctx.restore();
    }
    s09_s10_dateBlocks(ctx, V, cy, t, gDate, fr, inkCol, stut, 0, 1);
    if (gDate < 0.25) s09_s10_dateBevel(ctx, V, cy, t, ink);

    /* ---- 'HugoAFK.com' ab 24.4 ---- */
    {
      const p = clamp((t - s09_s10_T.site09) / 0.42);
      if (p > 0) {
        // Space Grotesk statt Silkscreen: 'HugoAFK.com' behält seine Schreibweise (Silkscreen hat keine Kleinbuchstaben)
        const so = { family: FONTS.head, weight: 600, align: 'center', baseline: 'middle', size: 56 };
        so.size = s09_s10_fit(ctx, 'HugoAFK.com', so, 620, 0.05);
        so.tracking = 0.05 * so.size;
        so.color = inkCol;
        so.stagger = 0.5; so.ease = E.outExpo; so.rise = so.size * 0.7;
        if (ink < 0.5) so.glow = { color: TOKENS.violetHot, blur: 18 };
        const jx = gDate > 0.3 ? (hash2(fr * 3 + 1, 77) - 0.5) * 34 * gDate : 0;
        drawKinetic(ctx, 'HugoAFK.com', CX + jx, 940, so, p, 'rise');
      }
    }

    /* ---- globale Glitch-Bursts ---- */
    if (g > 0.02) {
      // bewusst niedrig: die Engine-Slices dürfen die Ziffern nicht zerschneiden — die Eskalation
      // tragen RGB-Split, Shake, Zoom-Punch, Tunnel-Tempo und der Weiß-Wash
      FX.glitch = Math.max(FX.glitch, 0.13 * g);
      FX.rgb = Math.max(FX.rgb, 16 * g * (1 - 0.6 * ink));
      FX.glitchSeed = 4517 + fr * 13;
    }

  },
};

/* ================================================================ s10 */

/* Voxel-Detonation */
const s09_s10_BURST = (() => {
  const r = rng(2610), a = [];
  for (let i = 0; i < 620; i++) {
    const q = r();
    a.push({
      ang: r() * TAU,
      v: 240 + r() * 1750,
      sz: 5 + r() * 21,
      rot: r() * TAU, spin: (r() - 0.5) * 7,
      col: q < 0.40 ? TOKENS.primary : q < 0.72 ? TOKENS.secondary : q < 0.9 ? TOKENS.violetHot : '#FFFFFF',
      ay: (r() - 0.5) * 0.5,
      life: 0.85 + r() * 0.65,
    });
  }
  return a;
})();

/* ruhig treibende Hintergrund-Voxel */
const s09_s10_MOTES = (() => {
  const r = rng(1010), o = [];
  for (let i = 0; i < 46; i++) o.push({
    x: 20 + r() * (W - 40), y: r() * H, s: 9 + r() * 19, v: 22 + r() * 46,
    a: 0.15 + r() * 0.22, ph: r() * TAU,
    col: r() < 0.28 ? TOKENS.primary : (r() < 0.55 ? TOKENS.violetHot : TOKENS.secondary),
  });
  return o;
})();
const s09_s10_DUST = new Particles({
  seed: 1015, count: 110, size: [2, 6], vel: { x: 6, y: -20 }, spread: 0.8,
  area: { x0: -80, y0: -80, x1: W + 80, y1: H + 80 }, color: TOKENS.violetHot, alpha: 0.45, drift: 26, twinkle: 1.2,
});

/* Logo-Glow einmalig offscreen (per-Frame-blur auf einem großen Bild kostet ~30 ms) */
const s09_s10_LOGO = { w: 860, pad: 96, glow: null };
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

    /* ---- Hintergrund: violetter Glow-Atem + treibende Voxel ----
       läuft mit der ECHTEN Zeit bis 30.0 weiter; nur Typo und Logo kommen ab 29.2 zur Ruhe. */
    const breath = 0.5 + 0.5 * Math.sin((t - 26.5) * 1.75);      // Hintergrund-Atem, nie eingefroren
    const breathT = 0.5 + 0.5 * Math.sin((tm - 26.5) * 1.15);    // Logo-Atem, friert mit der Typo ein
    ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = TOKENS.bg; ctx.fillRect(0, 0, W, H); ctx.restore();
    radialFill(ctx, CX, 700, 900,
      [[0, rgba(TOKENS.secondary, 0.20 + 0.09 * breath + 0.16 * kick + 0.24 * Math.exp(-5 * Math.max(0, a)))],
       [0.45, rgba(TOKENS.deepViolet, 0.14)], [1, rgba(TOKENS.deepViolet, 0)]], 'lighter');
    radialFill(ctx, CX + Math.sin((t - 26.5) * 0.55) * 130, 1520, 820 + 60 * breath, [[0, rgba(TOKENS.primary, 0.075 + 0.05 * breath)], [1, rgba(TOKENS.primary, 0)]], 'lighter');
    nightSky(ctx, t, { count: 70, seed: 51, color: '#D8CFF0', alpha: 0.20, hMul: 1, drift: true });
    s09_s10_DUST.draw(ctx, t - 20, { alpha: 0.40, scale: 1.1 });
    for (const m of s09_s10_MOTES) {
      const y = ((m.y - (t - 24) * m.v) % (H + 140) + H + 140) % (H + 140) - 70;
      const x = m.x + Math.sin(t * 0.7 + m.ph) * 26;
      cube(ctx, 0, 0, 0, { size: m.s, cx: x, cy: y, color: m.col, alpha: m.a * (0.7 + 0.3 * Math.sin(t * 0.85 + m.ph)) });
    }

    /* ---- Voxel-Detonation ---- */
    if (a < 1.8) {
      const kdec = 1.9;
      ctx.save();
      for (const p of s09_s10_BURST) {
        const age = a;
        const al = clamp(1 - age / p.life) * clamp(age * 30);
        if (al <= 0.01) continue;
        const d = p.v * (1 - Math.exp(-kdec * age)) / kdec;
        const x = CX + Math.cos(p.ang) * d, y = 700 + Math.sin(p.ang) * d * (1 + p.ay * 0.3) + age * age * 40;
        if (x < -60 || x > W + 60 || y < -60 || y > H + 60) continue;
        const s = p.sz * lerp(1.25, 0.55, clamp(age / p.life));
        ctx.save();
        ctx.globalAlpha = al * 0.95;
        ctx.globalCompositeOperation = 'lighter';
        ctx.translate(x, y); ctx.rotate(p.rot + p.spin * age);
        ctx.fillStyle = p.col;
        ctx.fillRect(-s / 2, -s / 2, s, s);
        ctx.restore();
      }
      ctx.restore();
      s09_s10_ring(ctx, CX, 700, remap(t, 26.5, 27.05), { radius: 1250, color: TOKENS.violetHot, width: 16, alpha: 0.55 });
      s09_s10_ring(ctx, CX, 700, remap(t, 26.55, 27.25), { radius: 1400, color: TOKENS.primary, width: 11, alpha: 0.35 });
    }

    /* ---- Logo: sofort scharf, Scale-Punch 1.25 -> 1.0, danach Atmen ---- */
    {
      const M = IMG.meta, s = s09_s10_LOGO.w / M.full.w, lh = M.full.h * s;
      const gl = s09_s10_logoGlow();
      const punchS = lerp(1.25, 1, E.outExpo(clamp(a / 0.5)));
      const scl = punchS * (1 + 0.007 * Math.sin((tm - 26.5) * 1.5) * live) * (1 + 0.022 * kick);
      const cyL = 700;
      ctx.save();
      ctx.translate(CX, cyL); ctx.scale(scl, scl); ctx.translate(-CX, -cyL);
      // Glow (gecached, additiv)
      const ga = 0.30 + 0.14 * breathT * live + 0.17 * breath * (0.35 + 0.65 * calm) + 0.45 * kick + 0.34 * Math.exp(-7 * Math.max(0, a));
      ctx.save();
      ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = clamp(ga);
      ctx.drawImage(gl, CX - s09_s10_LOGO.w / 2 - s09_s10_LOGO.pad, cyL - lh / 2 - s09_s10_LOGO.pad);
      ctx.restore();
      ctx.drawImage(IMG.logo, CX - s09_s10_LOGO.w / 2, cyL - lh / 2, s09_s10_LOGO.w, lh);
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
          color: T().text, stagger: 0.4, ease: E.outExpo, from: 1.5,
          glow: { color: TOKENS.violetHot, blur: 16 + 26 * kick },
        });
        drawKinetic(ctx, s09_s10_SITE, CX, 1090, oo, p, 'scale');
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

    /* ---- 'Ab 20.09.2026' ---- */
    {
      const p = clamp((t - s09_s10_T.sub10) / 0.5);
      if (p > 0) {
        const oo = { family: FONTS.head, weight: 500, align: 'center', baseline: 'middle', size: 48 };
        oo.size = s09_s10_fit(ctx, s09_s10_SUB, oo, 700, 0.02);
        oo.tracking = 0.02 * oo.size;
        oo.color = rgba(T().text, 0.85);
        oo.stagger = 0.45; oo.ease = E.outExpo; oo.rise = oo.size * 0.5;
        drawKinetic(ctx, s09_s10_SUB, CX, 1202, oo, p, 'rise');
      }
    }

    /* ---- CTA-Pill mit Specular-Sweep ---- */
    {
      const p = clamp((t - s09_s10_T.pill) / 0.42);
      if (p > 0) {
        const sweep = (t >= s09_s10_T.sweepA && t <= s09_s10_T.sweepB) ? remap(t, s09_s10_T.sweepA, s09_s10_T.sweepB) : -1;
        const py = 1292;
        const po = { size: 52, family: FONTS.body, weight: 800, color: TOKENS.secondary, textColor: '#170A24', padX: 62, glow: false };
        const pw = measureText(ctx, s09_s10_CTA, po) + po.padX * 2;
        const scP = lerp(0.6, 1, E.outBack(clamp(p)));
        radialFill(ctx, CX, py, pw * 0.85 * scP,
          [[0, rgba(TOKENS.secondary, 0.30 * clamp(p * 2))], [0.5, rgba(TOKENS.secondary, 0.11 * clamp(p * 2))], [1, rgba(TOKENS.secondary, 0)]], 'lighter');
        pill(ctx, s09_s10_CTA, CX, py, po, p, sweep);
      }
    }

    /* ---- Claim ---- */
    {
      const p = clamp((t - s09_s10_T.claim) / 0.45);
      if (p > 0) {
        // Space Grotesk statt Silkscreen: der Claim behält seine Groß-/Kleinschreibung und bleibt lesbar
        const oo = { family: FONTS.head, weight: 500, align: 'center', baseline: 'middle', size: 40 };
        oo.size = s09_s10_fit(ctx, s09_s10_CLAIM, oo, 720, 0.02);
        oo.tracking = 0.02 * oo.size;
        oo.color = rgba(T().text, 0.72);
        oo.stagger = 0.5; oo.ease = E.outExpo; oo.rise = oo.size * 0.8;
        drawKinetic(ctx, s09_s10_CLAIM, CX, 1380, oo, p, 'rise');
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
