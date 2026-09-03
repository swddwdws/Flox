/* engine.js — deterministic Canvas 2D motion engine for the Fable 5.1 promo.
   Everything is a pure function of time t (seconds) so any frame can be rendered
   independently and in parallel. */
'use strict';

const W = 1080, H = 1920, FPS = 30, DURATION = 30, TOTAL_FRAMES = 900;
const CX = W / 2, CY = H / 2;
const SAFE = { x0: 90, x1: 900, y0: 300, y1: 1420 };   // TikTok-safe (right rail + caption block)
const TAU = Math.PI * 2;

/* ------------------------------------------------------------------ math */
const clamp = (v, a = 0, b = 1) => v < a ? a : v > b ? b : v;
const lerp = (a, b, t) => a + (b - a) * t;
const remap = (t, a, b) => clamp((t - a) / (b - a));
const smoothstep = t => { t = clamp(t); return t * t * (3 - 2 * t); };
const E = {
  linear: t => t,
  inQuad: t => t * t, outQuad: t => 1 - (1 - t) * (1 - t), inOutQuad: t => t < .5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2,
  inCubic: t => t * t * t, outCubic: t => 1 - Math.pow(1 - t, 3), inOutCubic: t => t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2,
  inQuart: t => t * t * t * t, outQuart: t => 1 - Math.pow(1 - t, 4), inOutQuart: t => t < .5 ? 8 * t * t * t * t : 1 - Math.pow(-2 * t + 2, 4) / 2,
  inQuint: t => t ** 5, outQuint: t => 1 - Math.pow(1 - t, 5), inOutQuint: t => t < .5 ? 16 * t ** 5 : 1 - Math.pow(-2 * t + 2, 5) / 2,
  inExpo: t => t <= 0 ? 0 : Math.pow(2, 10 * t - 10), outExpo: t => t >= 1 ? 1 : 1 - Math.pow(2, -10 * t),
  inOutExpo: t => t <= 0 ? 0 : t >= 1 ? 1 : t < .5 ? Math.pow(2, 20 * t - 10) / 2 : (2 - Math.pow(2, -20 * t + 10)) / 2,
  inCirc: t => 1 - Math.sqrt(1 - t * t), outCirc: t => Math.sqrt(1 - Math.pow(t - 1, 2)),
  outBack: t => { const c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2); },
  inBack: t => { const c1 = 1.70158, c3 = c1 + 1; return c3 * t * t * t - c1 * t * t; },
  outElastic: t => { const c4 = TAU / 3; return t <= 0 ? 0 : t >= 1 ? 1 : Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * c4) + 1; },
  outBounce: t => { const n1 = 7.5625, d1 = 2.75; if (t < 1 / d1) return n1 * t * t; if (t < 2 / d1) return n1 * (t -= 1.5 / d1) * t + .75; if (t < 2.5 / d1) return n1 * (t -= 2.25 / d1) * t + .9375; return n1 * (t -= 2.625 / d1) * t + .984375; },
};
// eased remap: ez(t, from, to, easing) -> 0..1
const ez = (t, a, b, fn = E.outCubic) => fn(remap(t, a, b));
// symmetric window: rises a..b, holds, falls c..d
const win = (t, a, b, c, d, fi = E.outCubic, fo = E.inCubic) => Math.min(ez(t, a, b, fi), 1 - ez(t, c, d, fo));

/* ------------------------------------------------- deterministic random */
function hash1(n) { n = Math.imul(n ^ (n >>> 16), 0x45d9f3b); n = Math.imul(n ^ (n >>> 16), 0x45d9f3b); n ^= n >>> 16; return (n >>> 0) / 4294967296; }
function hash2(a, b) { return hash1(a * 73856093 ^ b * 19349663); }
function rng(seed) { let a = (seed * 2654435761) >>> 0; return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
function noise1(x, seed = 0) { const i = Math.floor(x), f = x - i, u = f * f * (3 - 2 * f); return lerp(hash2(i, seed), hash2(i + 1, seed), u); }
function fbm1(x, seed = 0, oct = 3) { let s = 0, a = 1, n = 0; for (let k = 0; k < oct; k++) { s += a * noise1(x, seed + k * 13); n += a; x *= 2.03; a *= .5; } return s / n; }
function noise2(x, y, seed = 0) {
  const xi = Math.floor(x), yi = Math.floor(y), fx = x - xi, fy = y - yi, ux = fx * fx * (3 - 2 * fx), uy = fy * fy * (3 - 2 * fy);
  const h = (a, b) => hash1((a * 73856093) ^ (b * 19349663) ^ (seed * 83492791));
  return lerp(lerp(h(xi, yi), h(xi + 1, yi), ux), lerp(h(xi, yi + 1), h(xi + 1, yi + 1), ux), uy);
}
function fbm2(x, y, seed = 0, oct = 3) { let s = 0, a = 1, n = 0; for (let k = 0; k < oct; k++) { s += a * noise2(x, y, seed + k * 7); n += a; x *= 2.02; y *= 2.02; a *= .5; } return s / n; }

/* ------------------------------------------------------------- timing */
const beatLen = bpm => 60 / bpm;
const impulse = (t, t0, decay = 8) => t < t0 ? 0 : Math.exp(-decay * (t - t0));
const pulse = (t, period, decay = 6, offset = 0) => { const ph = (((t - offset) % period) + period) % period; return Math.exp(-decay * ph / period); };
function shake(t, seed, amp, freq = 26) { return { dx: (fbm1(t * freq, seed) - .5) * 2 * amp, dy: (fbm1(t * freq, seed + 7) - .5) * 2 * amp, rot: (fbm1(t * freq, seed + 13) - .5) * 2 * amp * 0.0012 }; }

/* ------------------------------------------------------------- colors */
function hexToRgb(h) { h = h.replace('#', ''); if (h.length === 3) h = h.split('').map(c => c + c).join(''); const n = parseInt(h, 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; }
function rgba(hex, a = 1) { const [r, g, b] = hexToRgb(hex); return `rgba(${r},${g},${b},${a})`; }
function mixColor(h1, h2, t) { const a = hexToRgb(h1), b = hexToRgb(h2); return `rgb(${Math.round(lerp(a[0], b[0], t))},${Math.round(lerp(a[1], b[1], t))},${Math.round(lerp(a[2], b[2], t))})`; }

/* -------------------------------------------------------------- fonts */
const FONTS = { display: 'Unbounded', head: 'Space Grotesk', body: 'Inter', mono: 'JetBrains Mono', tech: 'Orbitron', alt: 'Syne', pixel: 'Press Start 2P', term: 'VT323', silk: 'Silkscreen' };
const font = (size, family = FONTS.body, weight = 700) => `${weight} ${Math.round(size)}px "${family}"`;
function T() { return window.TOKENS || { bg: '#05060a', primary: '#7c5cff', secondary: '#22d3ee', accent: '#ff3d81', text: '#f5f7ff', muted: '#8b90a8' }; }

/* -------------------------------------------------------------- canvas */
function makeCanvas(w = W, h = H) { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; }
function withCamera(ctx, cam, fn) {
  const ox = cam.ox ?? CX, oy = cam.oy ?? CY;
  ctx.save(); ctx.translate(ox + (cam.x || 0), oy + (cam.y || 0)); ctx.rotate(cam.rot || 0); const z = cam.zoom ?? 1; ctx.scale(z, z); ctx.translate(-ox, -oy);
  fn(ctx); ctx.restore();
}
function fillBg(ctx, color) { ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.fillStyle = color || T().bg; ctx.fillRect(0, 0, W, H); ctx.restore(); }
function radialFill(ctx, x, y, r, stops, composite) {
  ctx.save(); if (composite) ctx.globalCompositeOperation = composite;
  const g = ctx.createRadialGradient(x, y, 0, x, y, r); for (const [p, c] of stops) g.addColorStop(p, c);
  ctx.fillStyle = g; ctx.fillRect(x - r, y - r, r * 2, r * 2); ctx.restore();
}
function linearFill(ctx, x0, y0, x1, y1, stops, rect, composite) {
  ctx.save(); if (composite) ctx.globalCompositeOperation = composite;
  const g = ctx.createLinearGradient(x0, y0, x1, y1); for (const [p, c] of stops) g.addColorStop(p, c);
  ctx.fillStyle = g; const [rx, ry, rw, rh] = rect || [0, 0, W, H]; ctx.fillRect(rx, ry, rw, rh); ctx.restore();
}
// draw fn twice: blurred additive halo, then crisp
function glow(ctx, blur, alpha, fn, composite = 'lighter') {
  ctx.save(); ctx.filter = `blur(${blur}px)`; ctx.globalAlpha *= alpha; ctx.globalCompositeOperation = composite; fn(ctx); ctx.restore();
  ctx.save(); fn(ctx); ctx.restore();
}
function roundRect(ctx, x, y, w, h, r) { ctx.beginPath(); ctx.roundRect(x, y, w, h, r); }

/* ---------------------------------------------------------------- text */
function drawText(ctx, str, x, y, o = {}) {
  const size = o.size || 100, fam = o.family || FONTS.body, weight = o.weight || 700, tr = o.tracking || 0;
  if (o.upper) str = str.toUpperCase();
  ctx.save();
  ctx.font = font(size, fam, weight);
  const align = o.align || 'center';
  ctx.textAlign = align; ctx.textBaseline = o.baseline || 'middle';
  ctx.letterSpacing = tr + 'px';
  if (align === 'center') x += tr / 2; else if (align === 'right') x += tr;
  if (o.alpha != null) ctx.globalAlpha *= o.alpha;
  if (o.composite) ctx.globalCompositeOperation = o.composite;
  const fill = o.color || T().text;
  if (o.glow) { ctx.shadowColor = o.glow.color || fill; ctx.shadowBlur = o.glow.blur || 30; }
  if (o.stroke) { ctx.lineWidth = o.stroke.width || 2; ctx.strokeStyle = o.stroke.color || fill; ctx.lineJoin = 'round'; ctx.strokeText(str, x, y); }
  if (!o.strokeOnly) { ctx.fillStyle = fill; ctx.fillText(str, x, y); }
  ctx.restore();
}
function measureText(ctx, str, o = {}) {
  ctx.save(); ctx.font = font(o.size || 100, o.family || FONTS.body, o.weight || 700); ctx.letterSpacing = (o.tracking || 0) + 'px';
  const w = ctx.measureText(o.upper ? str.toUpperCase() : str).width; ctx.restore(); return w;
}
// text with a blurred additive halo + crisp pass
function glowText(ctx, str, x, y, o = {}, blur = 24, alpha = 0.9) {
  glow(ctx, blur, alpha, c => drawText(c, str, x, y, o));
}
function layoutChars(ctx, str, o) {
  ctx.font = font(o.size || 100, o.family || FONTS.body, o.weight || 700);
  ctx.letterSpacing = '0px';
  const tr = o.tracking || 0, arr = []; let x = 0;
  for (const ch of [...str]) { const w = ctx.measureText(ch).width; arr.push({ ch, x, w }); x += w + tr; }
  return { chars: arr, width: Math.max(0, x - tr) };
}
const GLYPHS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789#%&/<>{}[]=+*';
/* Kinetic per-character text. p = 0..1 progress. modes:
   rise | drop | blur | scale | type | flicker | track | decode | slideL | slideR | wipe */
function drawKinetic(ctx, str, x, y, o = {}, p = 1, mode = 'rise') {
  if (o.upper) str = str.toUpperCase();
  ctx.save();
  const L = layoutChars(ctx, str, o);
  const size = o.size || 100, align = o.align || 'center';
  const x0 = align === 'center' ? x - L.width / 2 : align === 'right' ? x - L.width : x;
  ctx.textBaseline = o.baseline || 'middle'; ctx.textAlign = 'left';
  const n = L.chars.length, stag = o.stagger ?? 0.55, span = 1 - stag, ease = o.ease || E.outCubic, dir = o.dir ?? 1;
  const color = o.color || T().text;
  if (o.alpha != null) ctx.globalAlpha *= o.alpha;
  if (o.composite) ctx.globalCompositeOperation = o.composite;
  if (mode === 'wipe') {
    const e = ease(p); ctx.beginPath(); ctx.rect(x0 - size, y - size, (L.width + size * 2) * e, size * 2); ctx.clip();
  }
  for (let i = 0; i < n; i++) {
    const c = L.chars[i]; if (c.ch === ' ') continue;
    const order = dir === 1 ? i : dir === -1 ? n - 1 - i : Math.abs(i - (n - 1) / 2) * 2;
    const st = n > 1 ? clamp(order / (n - 1)) * stag : 0;
    const raw = remap(p, st, st + span), e = ease(raw);
    let ch = c.ch, cx = x0 + c.x, cy = y, alpha = 1, sc = 1, blur = 0, visible = true;
    switch (mode) {
      case 'rise': alpha = e; cy += (1 - e) * (o.rise ?? size * 0.6); if (o.blurIn) blur = (1 - e) * o.blurIn; break;
      case 'drop': alpha = e; cy -= (1 - e) * (o.rise ?? size * 0.6); if (o.blurIn) blur = (1 - e) * o.blurIn; break;
      case 'blur': alpha = e; blur = (1 - e) * size * 0.22; break;
      case 'scale': alpha = clamp(raw * 3); sc = lerp(o.from ?? 2.4, 1, E.outBack(raw)); break;
      case 'type': visible = p * n >= i + 1 || p >= 1; break;
      case 'flicker': visible = raw >= 1 || hash2(i * 131 + 7, Math.floor(p * 90)) < raw * raw; break;
      case 'track': alpha = e; cx += (i - (n - 1) / 2) * (1 - e) * size * (o.spread ?? 0.9); break;
      case 'decode': if (raw < 1) { ch = hash2(i + 1, Math.floor(p * 45) + 3) < raw * 0.5 ? c.ch : GLYPHS[Math.floor(hash2(i * 17 + 1, Math.floor(p * 45)) * GLYPHS.length)]; alpha = 0.55 + 0.45 * raw; } visible = raw > 0; break;
      case 'slideL': alpha = e; cx -= (1 - e) * size * 1.5; break;
      case 'slideR': alpha = e; cx += (1 - e) * size * 1.5; break;
      case 'wipe': default: break;
    }
    if (!visible || alpha <= 0) continue;
    ctx.save();
    ctx.globalAlpha *= alpha;
    if (blur > 0.3) ctx.filter = `blur(${blur.toFixed(1)}px)`;
    ctx.translate(cx + c.w / 2, cy); ctx.scale(sc, sc);
    if (o.glow) { ctx.shadowColor = o.glow.color || color; ctx.shadowBlur = o.glow.blur || 30; }
    if (o.stroke) { ctx.lineWidth = o.stroke.width || 2; ctx.strokeStyle = o.stroke.color || color; ctx.strokeText(ch, -c.w / 2, 0); }
    if (!o.strokeOnly) { ctx.fillStyle = color; ctx.fillText(ch, -c.w / 2, 0); }
    ctx.restore();
  }
  if (mode === 'type' && p > 0 && p < 1 && o.caret !== false) {
    const k = Math.min(n, Math.floor(p * n)); const cxp = k < n ? x0 + L.chars[k].x : x0 + L.width + 4;
    if (o.caretBlink === false || Math.floor(p * n * 1.5) % 3 !== 2) { ctx.fillStyle = o.caretColor || color; ctx.fillRect(cxp, y - size * 0.42, size * 0.55, size * 0.84); }
  }
  ctx.restore();
  return L.width;
}
// multi-line block, each line its own kinetic reveal with a line delay
function drawLines(ctx, lines, x, y, o = {}, p = 1, mode = 'rise') {
  const lh = o.lineHeight || (o.size || 100) * 1.08, delay = o.lineDelay ?? 0.18, n = lines.length;
  const total = 1 + delay * (n - 1);
  lines.forEach((ln, i) => { const lp = remap(p * total, i * delay, i * delay + 1); drawKinetic(ctx, ln, x, y + (i - (n - 1) / 2) * lh, o, lp, mode); });
}

/* ---------------------------------------------------------- sprites/fx */
const _sprites = new Map();
function softSprite(color = '#ffffff', size = 128) {
  const k = color + size; if (_sprites.has(k)) return _sprites.get(k);
  const c = makeCanvas(size, size), x = c.getContext('2d'), g = x.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  g.addColorStop(0, rgba(color, 1)); g.addColorStop(0.25, rgba(color, 0.6)); g.addColorStop(0.6, rgba(color, 0.12)); g.addColorStop(1, rgba(color, 0));
  x.fillStyle = g; x.fillRect(0, 0, size, size); _sprites.set(k, c); return c;
}
function dot(ctx, x, y, r, color, alpha = 1) { const s = softSprite(color); ctx.save(); ctx.globalAlpha *= alpha; ctx.drawImage(s, x - r, y - r, r * 2, r * 2); ctx.restore(); }
// lens flare: core + anamorphic streak + ring
function flare(ctx, x, y, o = {}) {
  const col = o.color || T().accent, I = o.intensity ?? 1, R = o.size || 400;
  ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha *= I;
  radialFill(ctx, x, y, R, [[0, 'rgba(255,255,255,0.95)'], [0.08, rgba(col, 0.7)], [0.3, rgba(col, 0.18)], [1, rgba(col, 0)]]);
  if (o.streak !== false) {
    ctx.save(); ctx.translate(x, y); ctx.scale(1, o.streakThin ?? 0.045); radialFill(ctx, 0, 0, R * (o.streakLen ?? 3.2), [[0, 'rgba(255,255,255,0.9)'], [0.15, rgba(col, 0.55)], [1, rgba(col, 0)]]); ctx.restore();
    ctx.save(); ctx.translate(x, y); ctx.scale(o.streakThin ?? 0.045, 1); radialFill(ctx, 0, 0, R * 0.9, [[0, 'rgba(255,255,255,0.6)'], [0.2, rgba(col, 0.3)], [1, rgba(col, 0)]]); ctx.restore();
  }
  if (o.ring) { ctx.strokeStyle = rgba(col, 0.25); ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(x, y, R * 0.55, 0, TAU); ctx.stroke(); }
  ctx.restore();
}
// diagonal light band sweeping across; pos 0..1 moves it from off-left to off-right
function lightSweep(ctx, pos, o = {}) {
  const ang = o.angle ?? -0.5, w = o.width || 260, col = o.color || '#ffffff', a = o.alpha ?? 0.35;
  const x = lerp(-W * 0.6, W * 1.6, pos);
  ctx.save(); ctx.globalCompositeOperation = o.composite || 'lighter'; ctx.translate(x, CY); ctx.rotate(ang);
  const g = ctx.createLinearGradient(-w / 2, 0, w / 2, 0); g.addColorStop(0, rgba(col, 0)); g.addColorStop(0.5, rgba(col, a)); g.addColorStop(1, rgba(col, 0));
  ctx.fillStyle = g; ctx.fillRect(-w / 2, -H * 1.5, w, H * 3); ctx.restore();
}
// horizontal speed lines
function speedLines(ctx, t, o = {}) {
  const n = o.count || 40, col = o.color || '#ffffff', seed = o.seed || 1, r = rng(seed), sp = o.speed || 3000;
  ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.strokeStyle = rgba(col, o.alpha ?? 0.5); ctx.lineCap = 'round';
  for (let i = 0; i < n; i++) { const y = r() * H, len = 60 + r() * 400, ph = r(), v = sp * (0.5 + r()); const x = ((ph * W * 2 + t * v * (o.dir || -1)) % (W * 2) + W * 2) % (W * 2) - W * 0.5; ctx.lineWidth = 1 + r() * 2; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + len, y); ctx.stroke(); }
  ctx.restore();
}

/* ---------------------------------------------------------- particles */
class Particles {
  constructor(o = {}) {
    this.o = o; const r = rng(o.seed || 1), n = o.count || 200; this.n = n;
    const a = o.area || { x0: -100, y0: -100, x1: W + 100, y1: H + 100 }; this.a = a;
    this.x0 = new Float32Array(n); this.y0 = new Float32Array(n); this.vx = new Float32Array(n); this.vy = new Float32Array(n); this.sz = new Float32Array(n); this.ph = new Float32Array(n); this.br = new Float32Array(n);
    const [smin, smax] = o.size || [2, 6], v = o.vel || { x: 0, y: -40 }, spread = o.spread ?? 0.5;
    for (let i = 0; i < n; i++) { this.x0[i] = a.x0 + r() * (a.x1 - a.x0); this.y0[i] = a.y0 + r() * (a.y1 - a.y0); this.vx[i] = v.x * (1 + (r() - .5) * 2 * spread) + (r() - .5) * 10; this.vy[i] = v.y * (1 + (r() - .5) * 2 * spread); this.sz[i] = lerp(smin, smax, r() ** 2); this.ph[i] = r() * TAU; this.br[i] = 0.4 + r() * 0.6; }
  }
  draw(ctx, t, o = {}) {
    const a = this.a, aw = a.x1 - a.x0, ah = a.y1 - a.y0, col = o.color || this.o.color || '#ffffff', alpha = o.alpha ?? this.o.alpha ?? 0.8, drift = o.drift ?? this.o.drift ?? 30, tw = o.twinkle ?? this.o.twinkle ?? 1.5, spr = softSprite(col), zoom = o.zoom ?? 1;
    ctx.save(); ctx.globalCompositeOperation = o.composite || 'lighter';
    for (let i = 0; i < this.n; i++) {
      let x = this.x0[i] + this.vx[i] * t + (noise1(t * 0.35 + this.ph[i], i) - .5) * drift * 2;
      let y = this.y0[i] + this.vy[i] * t + (noise1(t * 0.3 + this.ph[i] * 2, i + 999) - .5) * drift;
      x = ((x - a.x0) % aw + aw) % aw + a.x0; y = ((y - a.y0) % ah + ah) % ah + a.y0;
      if (zoom !== 1) { x = CX + (x - CX) * zoom; y = CY + (y - CY) * zoom; }
      const s = this.sz[i] * (o.scale ?? 1) * zoom, al = alpha * this.br[i] * (0.65 + 0.35 * Math.sin(t * tw + this.ph[i]));
      ctx.globalAlpha = al; ctx.drawImage(spr, x - s, y - s, s * 2, s * 2);
    }
    ctx.restore();
  }
}
// radial warp field (stars flying toward the camera)
class Warp {
  constructor(o = {}) { this.o = o; const r = rng(o.seed || 7), n = o.count || 300; this.n = n; this.ang = new Float32Array(n); this.z0 = new Float32Array(n); this.sp = new Float32Array(n); for (let i = 0; i < n; i++) { this.ang[i] = r() * TAU; this.z0[i] = r(); this.sp[i] = 0.7 + r() * 0.6; } }
  draw(ctx, t, o = {}) {
    const cx = o.cx ?? CX, cy = o.cy ?? CY, col = o.color || this.o.color || '#ffffff', speed = o.speed ?? this.o.speed ?? 0.5, maxR = o.maxR || 1300, len = o.len ?? 1, alpha = o.alpha ?? 0.9, width = o.width ?? 2.5;
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.lineCap = 'round';
    for (let i = 0; i < this.n; i++) {
      const z = 1 - (((this.z0[i] + t * speed * this.sp[i]) % 1) + 1) % 1; // 1 far → 0 near
      const d = Math.pow(1 - z, 2.4), d2 = Math.pow(1 - clamp(z + 0.012 * speed * len * 8), 2.4);
      const r1 = d * maxR, r2 = d2 * maxR, ca = Math.cos(this.ang[i]), sa = Math.sin(this.ang[i]);
      ctx.globalAlpha = alpha * clamp((1 - z) * 2.5) * (0.4 + 0.6 * hash1(i));
      ctx.strokeStyle = col; ctx.lineWidth = width * (0.3 + d * 2);
      ctx.beginPath(); ctx.moveTo(cx + ca * r1, cy + sa * r1); ctx.lineTo(cx + ca * r2, cy + sa * r2); ctx.stroke();
    }
    ctx.restore();
  }
}
// burst of particles from a point, life 0..1
function burst(ctx, x, y, life, o = {}) {
  const n = o.count || 80, r = rng(o.seed || 3), col = o.color || '#ffffff', R = o.radius || 500, spr = softSprite(col);
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  for (let i = 0; i < n; i++) { const a = r() * TAU, v = 0.3 + r() * 0.7, s = 2 + r() * 6, e = E.outCubic(life) * v; const px = x + Math.cos(a) * e * R, py = y + Math.sin(a) * e * R; ctx.globalAlpha = (1 - life) * (o.alpha ?? 1); const sz = s * (1 - life * 0.5); ctx.drawImage(spr, px - sz, py - sz, sz * 2, sz * 2); }
  ctx.restore();
}

/* ------------------------------------------------------------- 3D-ish */
function project(x, y, z, cam = {}) { const f = cam.f || 900; const s = f / Math.max(1e-3, z + f); return { x: (cam.cx ?? CX) + (x - (cam.x || 0)) * s, y: (cam.cy ?? CY) + (y - (cam.y || 0)) * s, s }; }
// perspective floor grid rushing toward the camera
function floorGrid(ctx, t, o = {}) {
  const hz = o.horizon ?? H * 0.5, camH = o.camH ?? 420, f = o.f ?? 700, sp = o.spacing ?? 220, speed = o.speed ?? 700, col = o.color || T().primary, nz = o.rows ?? 22, nx = o.cols ?? 14, floorY = o.floorY ?? H;
  ctx.save(); ctx.globalCompositeOperation = o.composite || 'lighter'; ctx.lineWidth = o.lineWidth ?? 2; ctx.strokeStyle = col;
  const off = ((t * speed) % sp + sp) % sp;
  const zNear = o.zNear ?? 40, zFar = sp * nz;
  const yAt = z => hz + f * camH / (z + zNear);
  ctx.beginPath();
  for (let k = 0; k <= nz; k++) { const z = k * sp - off + sp; if (z <= 0) continue; const y = yAt(z); if (y > floorY) continue; ctx.moveTo(0, y); ctx.lineTo(W, y); }
  ctx.globalAlpha = (o.alpha ?? 0.6); ctx.stroke();
  // fade lines by distance: overlay gradient toward horizon handled by caller if wanted
  ctx.beginPath();
  for (let i = -nx; i <= nx; i++) { const x0 = CX + i * sp * (o.xScale ?? 1.6); const p0 = { x: CX + (x0 - CX) * f / (zNear + f), y: yAt(0) }, p1 = { x: CX + (x0 - CX) * f / (zFar + f), y: yAt(zFar) }; ctx.moveTo(p0.x, Math.min(p0.y, floorY)); ctx.lineTo(p1.x, p1.y); }
  ctx.stroke();
  if (o.fade !== false) { ctx.globalCompositeOperation = 'source-over'; const g = ctx.createLinearGradient(0, hz, 0, hz + 380); g.addColorStop(0, rgba(o.fadeColor || T().bg, 1)); g.addColorStop(1, rgba(o.fadeColor || T().bg, 0)); ctx.fillStyle = g; ctx.globalAlpha = 1; ctx.fillRect(0, hz - 10, W, 400); }
  ctx.restore();
}
// rectangular tunnel of receding frames
function tunnel(ctx, t, o = {}) {
  const n = o.count ?? 18, sp = o.spacing ?? 260, speed = o.speed ?? 900, col = o.color || T().secondary, f = o.f ?? 600, rw = o.w ?? 1400, rh = o.h ?? 2400, twist = o.twist ?? 0.08, cx = o.cx ?? CX, cy = o.cy ?? CY;
  const off = ((t * speed) % sp + sp) % sp;
  ctx.save(); ctx.globalCompositeOperation = o.composite || 'lighter'; ctx.strokeStyle = col; ctx.lineJoin = 'round';
  for (let k = n; k >= 0; k--) {
    const z = k * sp - off + 20; if (z <= 0) continue; const s = f / (z + f); const a = clamp(1 - z / (n * sp)) * (o.alpha ?? 0.8);
    ctx.save(); ctx.translate(cx, cy); ctx.rotate(Math.sin(t * 0.4 + z * twist * 0.01) * twist * 3 + (o.rot || 0) * z * 0.001); ctx.scale(s, s);
    ctx.globalAlpha = a; ctx.lineWidth = (o.lineWidth ?? 3) / s;
    if (o.round) { ctx.beginPath(); ctx.roundRect(-rw / 2, -rh / 2, rw, rh, 120); ctx.stroke(); } else ctx.strokeRect(-rw / 2, -rh / 2, rw, rh);
    ctx.restore();
  }
  ctx.restore();
}
// HUD ring set
function rings(ctx, cx, cy, t, o = {}) {
  const col = o.color || T().secondary, base = o.radius || 300, n = o.count ?? 4;
  ctx.save(); ctx.globalCompositeOperation = o.composite || 'lighter'; ctx.lineCap = 'butt';
  for (let i = 0; i < n; i++) {
    const r = base + i * (o.gap ?? 42), dir = i % 2 ? -1 : 1, rot = t * (o.speed ?? 0.5) * dir * (1 + i * 0.3) + i;
    ctx.strokeStyle = rgba(col, (o.alpha ?? 0.7) * (1 - i / (n + 1))); ctx.lineWidth = i === 0 ? 3 : 1.5;
    ctx.setLineDash(i % 2 ? [r * 0.25, r * 0.12] : [r * 0.6, r * 0.4, r * 0.1, r * 0.3]); ctx.lineDashOffset = -rot * r;
    ctx.beginPath(); ctx.arc(cx, cy, r, 0, TAU); ctx.stroke();
  }
  ctx.setLineDash([]); ctx.restore();
}
// neural constellation: nodes drifting with noise, edges within radius, pulses along edges
function constellation(ctx, t, o = {}) {
  const n = o.count ?? 60, seed = o.seed ?? 5, r = rng(seed), col = o.color || T().primary, col2 = o.color2 || T().secondary, R = o.link ?? 260, area = o.area || { x0: 80, y0: 300, x1: W - 80, y1: H - 300 }, spread = o.spread ?? 1;
  const pts = [];
  for (let i = 0; i < n; i++) { const bx = area.x0 + r() * (area.x1 - area.x0), by = area.y0 + r() * (area.y1 - area.y0); const x = CX + (bx - CX) * spread + (fbm1(t * 0.25 + i * 3.1, i) - .5) * 160, y = CY + (by - CY) * spread + (fbm1(t * 0.22 + i * 1.7, i + 77) - .5) * 160; pts.push({ x, y, i }); }
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) {
    const a = pts[i], b = pts[j], dx = a.x - b.x, dy = a.y - b.y, d = Math.hypot(dx, dy); if (d > R) continue;
    const al = (1 - d / R) * (o.alpha ?? 0.5); ctx.strokeStyle = rgba(col, al); ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
    const ph = (t * 0.6 + hash2(i, j)) % 1; if (hash2(j, i) < (o.pulses ?? 0.35)) dot(ctx, lerp(a.x, b.x, ph), lerp(a.y, b.y, ph), 5, col2, al * 1.6);
  }
  for (const p of pts) { const s = 3 + 3 * hash1(p.i); dot(ctx, p.x, p.y, s * 3, col, 0.5); ctx.fillStyle = '#fff'; ctx.globalAlpha = 0.9; ctx.beginPath(); ctx.arc(p.x, p.y, s * 0.55, 0, TAU); ctx.fill(); }
  ctx.restore();
  return pts;
}


/* ------------------------------------------------------- UI / motion gfx */
// translucent legibility band behind text
function band(ctx, y, h, alpha = 0.55, color = '#000000') {
  ctx.save(); const g = ctx.createLinearGradient(0, y - h / 2, 0, y + h / 2); g.addColorStop(0, rgba(color, 0)); g.addColorStop(0.2, rgba(color, alpha)); g.addColorStop(0.8, rgba(color, alpha)); g.addColorStop(1, rgba(color, 0)); ctx.fillStyle = g; ctx.fillRect(0, y - h / 2, W, h); ctx.restore();
}
// HUD corner brackets drawing on with progress p
function brackets(ctx, x, y, w, h, p = 1, o = {}) {
  const L = (o.len || 60) * E.outCubic(p), col = o.color || T().accent; ctx.save(); ctx.strokeStyle = col; ctx.lineWidth = o.width || 3; ctx.globalAlpha *= (o.alpha ?? 1) * clamp(p * 3);
  const c = [[x, y, 1, 1], [x + w, y, -1, 1], [x, y + h, 1, -1], [x + w, y + h, -1, -1]];
  for (const [cx, cy, sx, sy] of c) { ctx.beginPath(); ctx.moveTo(cx + sx * L, cy); ctx.lineTo(cx, cy); ctx.lineTo(cx, cy + sy * L); ctx.stroke(); }
  ctx.restore();
}
// expanding shockwave ring, life 0..1
function shockwave(ctx, x, y, life, o = {}) {
  if (life <= 0 || life >= 1) return; const R = (o.radius || 900) * E.outCubic(life), col = o.color || T().accent;
  ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha *= (1 - life) * (o.alpha ?? 0.9); ctx.strokeStyle = col; ctx.lineWidth = (o.width || 14) * (1 - life * 0.7);
  ctx.filter = `blur(${(o.blur ?? 4) + life * 10}px)`; ctx.beginPath(); ctx.arc(x, y, R, 0, TAU); ctx.stroke(); ctx.restore();
}
// vertical chrome gradient fill for text
function chromeGradient(ctx, y, size, stops) {
  const g = ctx.createLinearGradient(0, y - size * 0.55, 0, y + size * 0.55); (stops || [[0, '#ffffff'], [0.45, '#f5f2ec'], [0.5, '#9aa3b2'], [0.55, '#e8ebf1'], [1, '#ffffff']]).forEach(([p, c]) => g.addColorStop(p, c)); return g;
}
// pill button with label; p = scale-in progress; sweep 0..1 moves a specular highlight
function pill(ctx, label, x, y, o = {}, p = 1, sweep = -1) {
  const size = o.size || 52, padX = o.padX || 56, h = o.h || size * 1.9, col = o.color || T().accent, tcol = o.textColor || '#111111';
  const w = measureText(ctx, label, { size, family: o.family || FONTS.body, weight: o.weight || 700, tracking: o.tracking || 0 }) + padX * 2;
  const sc = lerp(0.6, 1, E.outBack(clamp(p)));
  ctx.save(); ctx.globalAlpha *= clamp(p * 2); ctx.translate(x, y); ctx.scale(sc, sc);
  if (o.glow !== false) { ctx.save(); ctx.filter = 'blur(28px)'; ctx.globalAlpha *= 0.55; ctx.fillStyle = col; roundRect(ctx, -w / 2, -h / 2, w, h, h / 2); ctx.fill(); ctx.restore(); }
  ctx.fillStyle = col; roundRect(ctx, -w / 2, -h / 2, w, h, h / 2); ctx.fill();
  if (sweep >= 0 && sweep <= 1) { ctx.save(); roundRect(ctx, -w / 2, -h / 2, w, h, h / 2); ctx.clip(); const sx = lerp(-w, w, sweep); const g = ctx.createLinearGradient(sx - 120, 0, sx + 120, 0); g.addColorStop(0, 'rgba(255,255,255,0)'); g.addColorStop(0.5, 'rgba(255,255,255,0.55)'); g.addColorStop(1, 'rgba(255,255,255,0)'); ctx.fillStyle = g; ctx.fillRect(-w, -h, w * 2, h * 2); ctx.restore(); }
  drawText(ctx, label, 0, 2, { size, family: o.family || FONTS.body, weight: o.weight || 700, color: tcol, tracking: o.tracking || 0 });
  ctx.restore(); return w;
}
// thin progress bar (vertical or horizontal)
function progressBar(ctx, x, y, len, p, o = {}) {
  const col = o.color || T().accent, th = o.thickness || 6, vert = o.vertical; ctx.save();
  ctx.fillStyle = rgba(o.track || '#ffffff', 0.12); if (vert) ctx.fillRect(x - th / 2, y - len / 2, th, len); else ctx.fillRect(x - len / 2, y - th / 2, len, th);
  ctx.fillStyle = col; ctx.shadowColor = col; ctx.shadowBlur = 24; const L = len * clamp(p);
  if (vert) ctx.fillRect(x - th / 2, y + len / 2 - L, th, L); else ctx.fillRect(x - len / 2, y - th / 2, L, th);
  ctx.restore();
}
// hairline that draws on (p) and glows; from (x0,y0) to (x1,y1)
function hairline(ctx, x0, y0, x1, y1, p = 1, o = {}) {
  const col = o.color || T().text, e = (o.ease || E.outExpo)(clamp(p)); ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.lineCap = 'round';
  const ex = lerp(x0, x1, e), ey = lerp(y0, y1, e);
  ctx.strokeStyle = rgba(o.glowColor || T().accent, 0.5); ctx.lineWidth = (o.width || 2) * 6; ctx.filter = 'blur(14px)'; ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(ex, ey); ctx.stroke();
  ctx.filter = 'none'; ctx.strokeStyle = col; ctx.lineWidth = o.width || 2; ctx.globalAlpha *= o.alpha ?? 1; ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(ex, ey); ctx.stroke(); ctx.restore();
}
// pseudo code lines for terminal scenes (deterministic content)
const CODE_LINES = [
  '$ claude "fix the flaky test in auth.spec.ts"',
  '> Lese auth.spec.ts, auth.ts, jest.config.ts …',
  '> Ursache: Race zwischen Token-Refresh und Mock-Timer',
  '  await jest.advanceTimersByTimeAsync(1500);',
  '  expect(session.refreshed).toBe(true);',
  '$ npm test -- auth.spec.ts',
  '  PASS  auth.spec.ts  (12 tests, 0 failed)',
  '> Commit: fix(auth): await timer before refresh assertion',
  '✓ verifiziert · bereit zum Review',
];
function terminal(ctx, x, y, w, lines, p, o = {}) {
  // lines typed sequentially; p = 0..1 overall progress; returns cursor y
  const size = o.size || 40, lh = o.lineHeight || size * 1.5, cps = o.cps || 28, col = o.color || T().text;
  const totalChars = lines.reduce((a, l) => a + l.length, 0) + lines.length * 6; let budget = p * totalChars; let cy = y;
  ctx.save(); ctx.font = font(size, FONTS.mono, o.weight || 500); ctx.textBaseline = 'top'; ctx.textAlign = 'left';
  for (let i = 0; i < lines.length; i++) {
    if (budget <= 0) break; const ln = lines[i]; const k = Math.min(ln.length, Math.floor(budget)); budget -= ln.length + 6;
    const isCmd = ln.startsWith('$'), isOk = ln.startsWith('✓') || ln.includes('PASS'), isNote = ln.startsWith('>');
    ctx.fillStyle = isOk ? (o.okColor || T().accent) : isCmd ? col : isNote ? (o.noteColor || T().muted) : rgba(col, 0.85);
    ctx.fillText(ln.slice(0, k), x, cy);
    if (k < ln.length && budget <= 0 && o.caret !== false) { ctx.fillStyle = o.caretColor || T().accent; ctx.fillRect(x + ctx.measureText(ln.slice(0, k)).width + 4, cy, size * 0.55, size * 1.05); }
    cy += lh;
  }
  ctx.restore(); return cy;
}


// fibonacci point sphere with neighbour edges (edges cached per count/seed), perspective projected
const _sphereCache = new Map();
function sphereCloud(ctx, t, o = {}) {
  const n = o.count ?? 160, R = o.r ?? 340, cx = o.cx ?? CX, cy = o.cy ?? CY, rot = o.rot ?? t * 0.05, tilt = o.tilt ?? 0.45, f = o.f ?? 1400, col = o.color || T().primary, spread = o.spread ?? 1, seed = o.seed ?? 1, alpha = o.alpha ?? 0.3, ea = o.edgeAlpha ?? 0.15, link = o.link ?? 0.42;
  const key = n + ':' + seed + ':' + link; let base = _sphereCache.get(key);
  if (!base) {
    const pts = [], ga = Math.PI * (3 - Math.sqrt(5));
    for (let i = 0; i < n; i++) { const y = 1 - (i / Math.max(1, n - 1)) * 2, rr = Math.sqrt(Math.max(0, 1 - y * y)), th = ga * i + hash1(i * 31 + seed) * 0.5; pts.push([Math.cos(th) * rr, y, Math.sin(th) * rr]); }
    const edges = []; for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) { const d = Math.hypot(pts[i][0] - pts[j][0], pts[i][1] - pts[j][1], pts[i][2] - pts[j][2]); if (d < link) edges.push([i, j]); }
    base = { pts, edges }; _sphereCache.set(key, base);
  }
  const cr = Math.cos(rot), sr = Math.sin(rot), ct = Math.cos(tilt), st = Math.sin(tilt), out = new Array(n);
  for (let i = 0; i < n; i++) { const [x, y, z] = base.pts[i]; const x1 = x * cr - z * sr, z0 = x * sr + z * cr, y1 = y * ct - z0 * st, z1 = y * st + z0 * ct; const s = f / (f + z1 * R * spread); out[i] = { x: cx + x1 * R * spread * s, y: cy + y1 * R * spread * s, d: (1 - z1) / 2, s }; }
  ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.lineWidth = 1;
  if (ea > 0) { ctx.strokeStyle = col; for (const [i, j] of base.edges) { const a = out[i], b = out[j]; ctx.globalAlpha = ea * (0.35 + 0.65 * (a.d + b.d) / 2); ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke(); } }
  const spr = softSprite(col);
  for (const p of out) { const sz = (o.size ?? 3) * (0.5 + p.d) * p.s; ctx.globalAlpha = alpha * (0.3 + 0.7 * p.d); ctx.drawImage(spr, p.x - sz * 2, p.y - sz * 2, sz * 4, sz * 4); }
  ctx.restore(); return out;
}


/* =================================================== voxel / game HUD toolkit
   Everything below is for the blocky Minecraft-flavoured look. Isometric voxel
   coords are (ix, iy, iz) in block units; +ix goes right-down, +iy left-down,
   +iz up. All helpers are pure drawing calls. */
const ISO = { w: 0.866, h: 0.5 };   // half-width / half-height of a unit block
function isoPos(ix, iy, iz, o = {}) {
  const s = o.size ?? 60, cx = o.cx ?? CX, cy = o.cy ?? CY;
  return { x: cx + (ix - iy) * s * ISO.w, y: cy + (ix + iy) * s * ISO.h - iz * s, depth: ix + iy - iz };
}
function shade(hex, f) {  // f<1 darkens, f>1 lightens (clamped)
  const [r, g, b] = hexToRgb(hex);
  const m = v => Math.max(0, Math.min(255, Math.round(v * f)));
  return `rgb(${m(r)},${m(g)},${m(b)})`;
}
// one isometric cube; colour = base hex, faces auto-shaded (top bright, left mid, right dark)
function cube(ctx, ix, iy, iz, o = {}) {
  const s = o.size ?? 60, p = isoPos(ix, iy, iz, o), w = s * ISO.w, h = s * ISO.h, col = o.color || T().primary;
  const a = o.alpha ?? 1; if (a <= 0.004) return;
  ctx.save(); ctx.globalAlpha *= a;
  if (o.composite) ctx.globalCompositeOperation = o.composite;
  const top = o.top || shade(col, o.topF ?? 1.25), left = o.left || shade(col, o.leftF ?? 0.78), right = o.right || shade(col, o.rightF ?? 0.5);
  ctx.beginPath(); ctx.moveTo(p.x, p.y - h); ctx.lineTo(p.x + w, p.y); ctx.lineTo(p.x, p.y + h); ctx.lineTo(p.x - w, p.y); ctx.closePath(); ctx.fillStyle = top; ctx.fill();
  ctx.beginPath(); ctx.moveTo(p.x - w, p.y); ctx.lineTo(p.x, p.y + h); ctx.lineTo(p.x, p.y + h + s); ctx.lineTo(p.x - w, p.y + s); ctx.closePath(); ctx.fillStyle = left; ctx.fill();
  ctx.beginPath(); ctx.moveTo(p.x + w, p.y); ctx.lineTo(p.x, p.y + h); ctx.lineTo(p.x, p.y + h + s); ctx.lineTo(p.x + w, p.y + s); ctx.closePath(); ctx.fillStyle = right; ctx.fill();
  if (o.outline) { ctx.strokeStyle = rgba(o.outline, o.outlineAlpha ?? 0.6); ctx.lineWidth = o.outlineWidth ?? 1.5;
    ctx.beginPath(); ctx.moveTo(p.x, p.y - h); ctx.lineTo(p.x + w, p.y); ctx.lineTo(p.x + w, p.y + s); ctx.lineTo(p.x, p.y + h + s); ctx.lineTo(p.x - w, p.y + s); ctx.lineTo(p.x - w, p.y); ctx.closePath(); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(p.x - w, p.y); ctx.lineTo(p.x, p.y + h); ctx.lineTo(p.x + w, p.y); ctx.moveTo(p.x, p.y + h); ctx.lineTo(p.x, p.y + h + s); ctx.stroke(); }
  ctx.restore(); return p;
}
// a field of cubes: cells = [{ix, iy, iz, color, alpha, size}], drawn back-to-front
function cubeField(ctx, cells, o = {}) {
  const sorted = cells.slice().sort((a, b) => (a.ix + a.iy - (a.iz || 0)) - (b.ix + b.iy - (b.iz || 0)));
  for (const c of sorted) cube(ctx, c.ix, c.iy, c.iz || 0, Object.assign({}, o, c));
}
/* pixel sprite: rows of characters mapped to colours (like a Minecraft item icon).
   pixelSprite(ctx, x, y, 8, ['.rr.', 'rggr'], {r:'#f00', g:'#0f0'})  — '.' / ' ' = transparent */
function pixelSprite(ctx, x, y, cell, rows, palette, o = {}) {
  const w = rows[0].length * cell, h = rows.length * cell, ox = o.align === 'left' ? x : x - w / 2, oy = o.baseline === 'top' ? y : y - h / 2;
  ctx.save(); if (o.alpha != null) ctx.globalAlpha *= o.alpha; if (o.composite) ctx.globalCompositeOperation = o.composite;
  if (o.rotate) { ctx.translate(x, y); ctx.rotate(o.rotate); ctx.translate(-x, -y); }
  for (let r = 0; r < rows.length; r++) for (let c = 0; c < rows[r].length; c++) {
    const ch = rows[r][c]; if (ch === '.' || ch === ' ') continue; const col = palette[ch]; if (!col) continue;
    ctx.fillStyle = col; ctx.fillRect(Math.round(ox + c * cell), Math.round(oy + r * cell), Math.ceil(cell), Math.ceil(cell));
  }
  ctx.restore(); return { w, h, x: ox, y: oy };
}
// ready-made blocky item icons (rows + palette), all 12x12 or 10x10
const SPRITES = {
  pumpkin: { rows: ['..gg......', '.gg.g.....', 'oooooooooo', 'okkokkokoo', 'ooooooooko', 'okkkkkkkoo', 'ookkkkkooo', 'oooooooooo', 'ooooooooko', '.oooooooo.'], pal: { o: '#E08020', k: '#402000', g: '#2E7D32' } },
  emerald: { rows: ['...gg...', '..gEEg..', '.gEEEEg.', 'gEEEEEEg', 'gEEEEEEg', '.gEEEEg.', '..gEEg..', '...gg...'], pal: { E: '#22DD77', g: '#0E8A44' } },
  coin: { rows: ['..cccc..', '.cyyyyc.', 'cyyccyyc', 'cyccccyc', 'cyccccyc', 'cyyccyyc', '.cyyyyc.', '..cccc..'], pal: { c: '#B8860B', y: '#FFD24A' } },
  spawner: { rows: ['ssssssss', 's......s', 's.pppp.s', 's.p..p.s', 's.p..p.s', 's.pppp.s', 's......s', 'ssssssss'], pal: { s: '#3A4048', p: '#8B5CF6' } },
  check: { rows: ['........', '......g.', '.....gg.', 'g...gg..', 'gg.gg...', '.ggg....', '..g.....', '........'], pal: { g: '#4ADE80' } },
  cross: { rows: ['r......r', '.r....r.', '..r..r..', '...rr...', '...rr...', '..r..r..', '.r....r.', 'r......r'], pal: { r: '#EF4444' } },
  creeper: { rows: ['gggggggg', 'gkkggkkg', 'gkkggkkg', 'ggg..ggg', 'gg.kk.gg', 'gg.kk.gg', 'gg.kk.gg', 'ggg..ggg'], pal: { g: '#5BBD5B', k: '#0E2A0E' } },
  heart: { rows: ['.rr..rr.', 'rwwrrwwr', 'rwwwwwwr', 'rwwwwwwr', '.rwwwwr.', '..rwwr..', '...rr...', '........'], pal: { r: '#D62F2F', w: '#FF6B6B' } },
  bolt: { rows: ['...yy...', '..yy....', '.yyyy...', 'yyyyyy..', '...yy...', '..yy....', '.yy.....', 'y.......'], pal: { y: '#FFD24A' } },
};
function itemIcon(ctx, name, x, y, cell, o = {}) { const s = SPRITES[name]; if (!s) return null; return pixelSprite(ctx, x, y, cell, s.rows, s.pal, o); }

/* Minecraft-style HUD */
function mcSlot(ctx, x, y, s, o = {}) {           // one inventory slot (dark, beveled)
  ctx.save(); ctx.globalAlpha *= o.alpha ?? 1;
  ctx.fillStyle = o.fill || 'rgba(20,20,26,0.82)'; ctx.fillRect(x, y, s, s);
  ctx.fillStyle = 'rgba(255,255,255,0.16)'; ctx.fillRect(x, y, s, 3); ctx.fillRect(x, y, 3, s);
  ctx.fillStyle = 'rgba(0,0,0,0.5)'; ctx.fillRect(x, y + s - 3, s, 3); ctx.fillRect(x + s - 3, y, 3, s);
  if (o.selected) { ctx.strokeStyle = o.selColor || '#FFFFFF'; ctx.lineWidth = 4; ctx.strokeRect(x - 3, y - 3, s + 6, s + 6); }
  ctx.restore();
}
function mcHotbar(ctx, cx, y, o = {}) {           // 9-slot hotbar; o.items = [{slot, sprite, count}]
  const s = o.slot ?? 92, gap = o.gap ?? 6, n = o.count ?? 9, total = n * s + (n - 1) * gap, x0 = cx - total / 2;
  ctx.save(); ctx.globalAlpha *= o.alpha ?? 1;
  for (let i = 0; i < n; i++) mcSlot(ctx, x0 + i * (s + gap), y, s, { selected: i === o.selected, selColor: o.selColor });
  for (const it of o.items || []) {
    const x = x0 + it.slot * (s + gap);
    if (it.sprite) itemIcon(ctx, it.sprite, x + s / 2, y + s / 2, s / 14);
    if (it.count != null) drawText(ctx, String(it.count), x + s - 8, y + s - 14, { size: o.countSize ?? 26, family: FONTS.pixel, weight: 400, color: '#FFFFFF', align: 'right', baseline: 'alphabetic' });
  }
  ctx.restore();
}
// chat / console overlay lines with the translucent Minecraft chat background
function mcChat(ctx, x, y, lines, o = {}) {
  const size = o.size ?? 34, lh = o.lineHeight ?? size * 1.45, fam = o.family || FONTS.term, pad = o.pad ?? 10;
  ctx.save(); ctx.globalAlpha *= o.alpha ?? 1;
  ctx.font = font(size, fam, o.weight || 400);
  let maxW = 0; for (const l of lines) maxW = Math.max(maxW, ctx.measureText(typeof l === 'string' ? l : l.t).width);
  if (o.bg !== false) { ctx.fillStyle = o.bgColor || 'rgba(0,0,0,0.55)'; ctx.fillRect(x - pad, y - pad, maxW + pad * 2 + (o.extraW || 0), lines.length * lh + pad * 2 - (lh - size)); }
  ctx.textAlign = 'left'; ctx.textBaseline = 'top';
  lines.forEach((l, i) => {
    const t = typeof l === 'string' ? l : l.t, col = (typeof l === 'object' && l.c) || o.color || '#FFFFFF', a = (typeof l === 'object' && l.a != null) ? l.a : 1;
    if (a <= 0) return; ctx.globalAlpha = (o.alpha ?? 1) * a; ctx.fillStyle = col; ctx.fillText(t, x, y + i * lh);
  });
  ctx.restore();
  return { w: maxW, h: lines.length * lh };
}
// phone frame (rounded, with a notch); returns the inner screen rect
function phoneFrame(ctx, cx, cy, w, o = {}) {
  const h = o.h ?? w * 2.05, r = o.radius ?? w * 0.11, x = cx - w / 2, y = cy - h / 2;
  ctx.save();
  ctx.fillStyle = o.body || '#15131B'; roundRect(ctx, x, y, w, h, r); ctx.fill();
  ctx.strokeStyle = o.edge || rgba(T().primary, 0.5); ctx.lineWidth = o.edgeWidth ?? 4; roundRect(ctx, x, y, w, h, r); ctx.stroke();
  const bw = o.bezel ?? w * 0.045, ix = x + bw, iy = y + bw, iw = w - bw * 2, ih = h - bw * 2;
  ctx.save(); roundRect(ctx, ix, iy, iw, ih, r * 0.8); ctx.clip();
  ctx.fillStyle = o.screen || '#07060B'; ctx.fillRect(ix, iy, iw, ih);
  if (o.draw) o.draw(ctx, ix, iy, iw, ih);
  ctx.restore();
  ctx.fillStyle = o.body || '#15131B'; roundRect(ctx, cx - w * 0.16, y + bw * 0.6, w * 0.32, w * 0.075, w * 0.04); ctx.fill();
  ctx.restore();
  return { x: ix, y: iy, w: iw, h: ih };
}
// CRT power-off: 1 = normal, 0 = fully collapsed. Draws src collapsed to a line + afterglow.
function crtCollapse(ctx, src, p, o = {}) {
  const k = clamp(p); ctx.save(); ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
  if (k > 0.001) {
    const vh = Math.max(2, H * Math.pow(k, 2.2)), vw = W * (0.25 + 0.75 * Math.pow(k, 0.35));
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.filter = `brightness(${1 + (1 - k) * 2})`;
    ctx.drawImage(src, (W - vw) / 2, (H - vh) / 2, vw, vh); ctx.restore();
    if (k < 0.5) { ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = rgba(o.glow || '#FFFFFF', (0.5 - k) * 1.6); ctx.filter = 'blur(10px)'; ctx.fillRect(0, H / 2 - 3, W, 6); ctx.restore(); }
  }
  ctx.restore();
}
// starfield / floating voxel dust behind everything
function nightSky(ctx, t, o = {}) {
  const n = o.count ?? 90, seed = o.seed ?? 21, col = o.color || '#FFFFFF';
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  for (let i = 0; i < n; i++) {
    const x = hash2(i, seed) * W, y = hash2(i + 999, seed) * H * (o.hMul ?? 1), s = 1 + hash1(i * 7 + seed) * 2.5;
    const tw = 0.35 + 0.65 * (0.5 + 0.5 * Math.sin(t * (0.6 + hash1(i) * 1.4) + i));
    ctx.globalAlpha = (o.alpha ?? 0.5) * tw; ctx.fillStyle = col; ctx.fillRect(x, y + (o.drift ? Math.sin(t * 0.3 + i) * 6 : 0), s, s);
  }
  ctx.restore();
}

/* --------------------------------------------------------- post chain */
let _mainCanvas, _mctx, _scene, _sctx, _scene2, _sctx2, _chan = [], _noise = [], _scanPat = null, _tmp;
function ensureChannels(src) {
  const cols = ['#ff0000', '#00ff00', '#0000ff'];
  for (let k = 0; k < 3; k++) { const c = _chan[k], x = c.getContext('2d'); x.globalCompositeOperation = 'source-over'; x.drawImage(src, 0, 0); x.globalCompositeOperation = 'multiply'; x.fillStyle = cols[k]; x.fillRect(0, 0, W, H); }
}
function rgbSplit(ctx, src, amt, ang = 0) {
  ensureChannels(src); const dx = Math.cos(ang) * amt, dy = Math.sin(ang) * amt;
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  ctx.drawImage(_chan[0], dx, dy); ctx.drawImage(_chan[1], 0, 0); ctx.drawImage(_chan[2], -dx, -dy);
  ctx.restore();
}
function glitchSlices(ctx, src, intensity, seed) {
  const r = rng(seed | 0), n = Math.floor(2 + intensity * 16), col = T();
  ctx.save();
  for (let i = 0; i < n; i++) {
    const y = r() * H, h = 4 + r() * r() * 160 * (0.4 + intensity), dx = (r() - .5) * 2 * 260 * intensity * (r() < 0.3 ? 2 : 1);
    ctx.globalCompositeOperation = 'source-over'; ctx.drawImage(src, 0, y, W, h, dx, y, W, h);
    if (r() < 0.35) { ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.7; ctx.drawImage(_chan[r() < .5 ? 0 : 2], 0, y, W, h, dx + (r() - .5) * 60, y, W, h); ctx.globalAlpha = 1; }
    if (r() < 0.25) { ctx.fillStyle = rgba(r() < .5 ? col.secondary : col.accent, 0.25 * intensity); ctx.fillRect(0, y, W, 2 + r() * 6); }
  }
  // block corruption
  const nb = Math.floor(intensity * 6);
  for (let i = 0; i < nb; i++) { const bw = 60 + r() * 400, bh = 20 + r() * 120, sx = r() * (W - bw), sy = r() * (H - bh), tx = sx + (r() - .5) * 400, ty = sy + (r() - .5) * 60; ctx.globalCompositeOperation = 'source-over'; ctx.drawImage(src, sx, sy, bw, bh, tx, ty, bw, bh); }
  ctx.restore();
}
function bloom(ctx, src, blur = 24, alpha = 0.5) {
  ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha *= alpha; ctx.filter = `blur(${blur}px) contrast(1.5) brightness(0.95)`; ctx.drawImage(src, 0, 0); ctx.restore();
}
function scanlines(ctx, alpha = 0.06) { ctx.save(); ctx.globalAlpha = alpha; ctx.fillStyle = _scanPat; ctx.fillRect(0, 0, W, H); ctx.restore(); }
function grain(ctx, amount = 0.06, frame = 0) {
  const tile = _noise[frame % _noise.length]; const ox = -Math.floor(hash1(frame * 3 + 1) * 512), oy = -Math.floor(hash1(frame * 5 + 2) * 512);
  ctx.save(); ctx.globalCompositeOperation = 'overlay'; ctx.globalAlpha = amount * 2.2; ctx.translate(ox, oy); ctx.fillStyle = ctx.createPattern(tile, 'repeat'); ctx.fillRect(0, 0, W - ox, H - oy); ctx.restore();
}
function vignette(ctx, strength = 0.55) {
  ctx.save(); const g = ctx.createRadialGradient(CX, CY, H * 0.22, CX, CY, H * 0.75); g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, `rgba(0,0,0,${strength})`); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H); ctx.restore();
}
function flash(ctx, alpha, color = '#ffffff') { ctx.save(); ctx.globalAlpha = clamp(alpha); ctx.fillStyle = color; ctx.fillRect(0, 0, W, H); ctx.restore(); }

const FX = {};
function resetFX() {
  Object.assign(FX, { zoom: 1, x: 0, y: 0, rot: 0, rgb: 0, rgbAngle: 0, glitch: 0, glitchSeed: 1, bloom: 0.22, bloomBlur: 26, flash: 0, flashColor: '#ffffff', whip: 0, whipDir: 1, grain: 0.05, vignette: 0.5, scan: 0.045, blur: 0, fade: 0, invert: 0, shake: 0 });
  const d = window.TOKENS && window.TOKENS.fx; if (d) Object.assign(FX, d);
}
// transition contributions. tr = {at, type: string|string[], amount?, color?, dir?, dur?}
function applyTransition(tr, t, fx) {
  const at = tr.at, d = t - at, types = Array.isArray(tr.type) ? tr.type : [tr.type];
  for (const ty of types) switch (ty) {
    case 'flash': { const a = tr.amount ?? 0.9, pre = tr.pre ?? 0.07; const v = d < 0 ? (pre > 0 ? ez(t, at - pre, at, E.inQuad) * 0.6 : 0) : Math.exp(-13 * d); if (v * a > fx.flash) { fx.flash = v * a; if (tr.color) fx.flashColor = tr.color; } break; }
    case 'glitch': { const a = tr.amount ?? 1, pre = tr.pre ?? 0.13, post = tr.post ?? 0.27; if (d < -pre || d > post) break; const g = d < 0 ? ez(t, at - pre, at, E.inCubic) : 1 - ez(t, at, at + post, E.outCubic); fx.glitch = Math.max(fx.glitch, g * a); fx.rgb = Math.max(fx.rgb, g * 18 * a); fx.glitchSeed = Math.floor(at * 1000) + 17; break; }
    case 'punch': { if (d >= 0) { fx.zoom *= 1 + (tr.punch ?? tr.amount ?? 0.1) * Math.exp(-9 * d); fx.shake = Math.max(fx.shake, (tr.shake ?? 10) * Math.exp(-7 * d)); } break; }
    case 'punchOut': { if (d >= 0) fx.zoom *= 1 - (tr.amount ?? 0.08) * Math.exp(-9 * d); break; }
    case 'zoom': { const a = tr.amount ?? 0.6, dur = tr.dur ?? 0.3; if (d < 0) { const e = ez(t, at - dur, at, E.inExpo); fx.zoom *= 1 + a * e; fx.blur = Math.max(fx.blur, 14 * ez(t, at - dur, at, E.inQuad)); } else { fx.zoom *= 1 + 0.16 * Math.exp(-8 * d); } break; }
    case 'whip': { const dur = tr.dur ?? 0.16; if (d < -dur || d > dur) break; const s = d < 0 ? ez(t, at - dur, at, E.inQuad) : 1 - ez(t, at, at + dur, E.outQuad); fx.whip = Math.max(fx.whip, s * (tr.amount ?? 120)); fx.whipDir = tr.dir ?? 1; fx.y += -(tr.dir ?? 1) * 90 * s * (d < 0 ? 1 : -1); break; }
    case 'shake': { if (d >= 0) fx.shake = Math.max(fx.shake, (tr.shake ?? tr.amount ?? 22) * Math.exp(-(tr.decay ?? 6) * d)); break; }
    case 'fade': { const dur = tr.dur ?? 0.4; const v = d < 0 ? (tr.inOnly ? 0 : ez(t, at - dur, at, E.inQuad)) : (tr.outOnly ? 0 : 1 - ez(t, at, at + dur, E.outQuad)); fx.fade = Math.max(fx.fade, v); break; }
    case 'invert': { if (d >= 0 && d < (tr.dur ?? 0.07)) fx.invert = 1; break; }
    case 'stutter': { const pre = tr.pre ?? 0.2; if (d >= -pre && d < 0) { fx.rgb = Math.max(fx.rgb, 6); fx.glitch = Math.max(fx.glitch, 0.12); } break; }
    case 'rgb': { const dur = tr.dur ?? 0.25; if (d < -dur || d > dur) break; const s = 1 - Math.abs(d) / dur; fx.rgb = Math.max(fx.rgb, s * (tr.amount ?? 20)); break; }
  }
}
function composite(ctx, src, fx, frame) {
  const sh = fx.shake > 0.05 ? shake(frame / FPS, 99, fx.shake) : { dx: 0, dy: 0, rot: 0 };
  ctx.save();
  ctx.translate(CX + fx.x + sh.dx, CY + fx.y + sh.dy); ctx.rotate(fx.rot + sh.rot); ctx.scale(fx.zoom, fx.zoom); ctx.translate(-CX, -CY);
  if (fx.blur > 0.4) ctx.filter = `blur(${fx.blur.toFixed(1)}px)`;
  if (fx.whip > 1) { const n = 9; ctx.globalAlpha = 1 / n; for (let k = 0; k < n; k++) { const o = (k - (n - 1) / 2) / ((n - 1) / 2) * fx.whip * fx.whipDir; ctx.drawImage(src, 0, o); } ctx.globalAlpha = 1; }
  else if (fx.rgb > 0.4) rgbSplit(ctx, src, fx.rgb, fx.rgbAngle);
  else ctx.drawImage(src, 0, 0);
  if (fx.glitch > 0.01) { if (fx.rgb <= 0.4) ensureChannels(src); glitchSlices(ctx, src, fx.glitch, fx.glitchSeed + frame * 7); }
  if (fx.bloom > 0.01) bloom(ctx, src, fx.bloomBlur, fx.bloom);
  ctx.restore();
  if (fx.scan > 0) scanlines(ctx, fx.scan);
  if (fx.grain > 0) grain(ctx, fx.grain, frame);
  if (fx.vignette > 0) vignette(ctx, fx.vignette);
  if (fx.invert > 0) { ctx.save(); ctx.globalCompositeOperation = 'difference'; ctx.globalAlpha = fx.invert; ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, W, H); ctx.restore(); }
  if (fx.flash > 0.004) flash(ctx, fx.flash, fx.flashColor);
  if (fx.fade > 0.004) { ctx.save(); ctx.globalAlpha = clamp(fx.fade); ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H); ctx.restore(); }
}

/* ------------------------------------------------------------- engine */
const Engine = {
  init(canvas) {
    _mainCanvas = canvas; _mctx = canvas.getContext('2d', { alpha: false });
    _scene = makeCanvas(); _sctx = _scene.getContext('2d', { alpha: false });
    _scene2 = makeCanvas(); _sctx2 = _scene2.getContext('2d', { alpha: false });
    _tmp = makeCanvas();
    _chan = [makeCanvas(), makeCanvas(), makeCanvas()];
    // noise tiles
    _noise = [];
    for (let k = 0; k < 4; k++) { const c = makeCanvas(512, 512), x = c.getContext('2d'), im = x.createImageData(512, 512), r = rng(1000 + k); for (let i = 0; i < im.data.length; i += 4) { const v = 96 + Math.floor(r() * 64) + Math.floor(r() * 64); im.data[i] = im.data[i + 1] = im.data[i + 2] = v; im.data[i + 3] = 255; } x.putImageData(im, 0, 0); _noise.push(c); }
    const sc = makeCanvas(4, 4), sx = sc.getContext('2d'); sx.fillStyle = '#000'; sx.fillRect(0, 0, 4, 4); sx.clearRect(0, 0, 4, 3); _scanPat = _mctx.createPattern(sc, 'repeat');
    { const TLx = (typeof TL !== "undefined") ? TL : window.TL; if (TLx && TLx.init) TLx.init(); }
  },
  remapTime(t) {
    const TLx = (typeof TL !== "undefined") ? TL : window.TL; if (!TLx) return t;
    for (const tr of TLx.transitions || []) { const types = Array.isArray(tr.type) ? tr.type : [tr.type]; if (!types.includes('stutter')) continue; const pre = tr.pre ?? 0.2, at = tr.at; if (t < at - pre || t >= at) continue; const k = Math.floor((t - (at - pre)) * FPS + 1e-6); const offs = tr.pattern || [0, -1, -1, -3, -3, -1, 0, -2]; return Math.max(0, (at - pre) + (k + offs[k % offs.length]) / FPS); }
    return t;
  },
  renderFrame(i) {
    const t0 = i / FPS; resetFX(); const t = Engine.remapTime(t0);
    const s = _sctx; s.setTransform(1, 0, 0, 1, 0, 0); s.globalAlpha = 1; s.globalCompositeOperation = 'source-over'; s.filter = 'none'; s.shadowBlur = 0;
    fillBg(s, T().bg);
    const TLx = (typeof TL !== "undefined") ? TL : window.TL;
    if (TLx) {
      const sc = TLx.sceneAt(t);
      if (sc) { s.save(); try { sc.draw(s, t - sc.start, t, sc.end - sc.start, sc); } finally { s.restore(); } }
      // crossfade into the next scene: draw it on a second canvas and blend
      for (const tr of TLx.transitions || []) {
        const types = Array.isArray(tr.type) ? tr.type : [tr.type]; if (!types.includes('xfade')) continue;
        const dur = tr.dur ?? 0.4; if (t < tr.at - dur || t >= tr.at) continue;
        const next = TLx.sceneAt(tr.at); if (!next || next === sc) continue;
        const s2 = _sctx2; s2.setTransform(1, 0, 0, 1, 0, 0); s2.globalAlpha = 1; s2.globalCompositeOperation = 'source-over'; s2.filter = 'none'; s2.shadowBlur = 0;
        fillBg(s2, T().bg); s2.save(); try { next.draw(s2, 0, t, next.end - next.start, next); } finally { s2.restore(); }
        s.save(); s.globalAlpha = ez(t, tr.at - dur, tr.at, E.inOutQuad); s.drawImage(_scene2, 0, 0); s.restore();
      }
      if (TLx.overlay) { s.save(); TLx.overlay(s, t); s.restore(); }
      for (const tr of TLx.transitions || []) applyTransition(tr, t0, FX);
      if (TLx.fx) TLx.fx(t0, FX);
    }
    const m = _mctx; m.setTransform(1, 0, 0, 1, 0, 0); m.globalAlpha = 1; m.globalCompositeOperation = 'source-over'; m.filter = 'none';
    m.fillStyle = '#000'; m.fillRect(0, 0, W, H);
    composite(m, _scene, FX, i);
  },
  captureFrame(i) { Engine.renderFrame(i); return _mainCanvas.toDataURL('image/png').slice(22); },
};
window.renderFrame = i => Engine.renderFrame(i);
window.captureFrame = i => Engine.captureFrame(i);
