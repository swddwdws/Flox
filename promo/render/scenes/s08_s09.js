// s08_s09.js — s08 "Ehrlich. Sorgfältig. Sicher." (breath, 16-19 s) and s09 "Mythos-Klasse." (build, 19-22 s)
// One continuous shot: the safety ring + sphere of s08 contract into the glaring core of s09.
const s08_C = { x: 540, y: 860 };
const s08_WORDS = [['Ehrlich.', 16.5, 730], ['Sorgfältig.', 17.0, 870], ['Sicher.', 17.5, 1010]];
const s08_HL = { size: 116, family: FONTS.body, weight: 800, tracking: -0.045 * 116 };
const s08_SUB = { size: 44, family: FONTS.head, weight: 500, tracking: 0 };

function s08_ticks(ctx, cx, cy, r, rot, n, len, col, alpha, width = 1.5) {
  ctx.save(); ctx.strokeStyle = col; ctx.globalAlpha *= alpha; ctx.lineWidth = width; ctx.beginPath();
  for (let i = 0; i < n; i++) { const a = rot + i * TAU / n, c = Math.cos(a), s = Math.sin(a); ctx.moveTo(cx + c * r, cy + s * r); ctx.lineTo(cx + c * (r + len), cy + s * (r + len)); }
  ctx.stroke(); ctx.beginPath(); ctx.arc(cx, cy, r, 0, TAU); ctx.lineWidth = 1; ctx.stroke(); ctx.restore();
}
function s08_ring(ctx, cx, cy, r, alpha = 1, width = 6, haloBlur = 24) {
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  ctx.strokeStyle = rgba(T().accent, 0.85 * alpha); ctx.lineWidth = width * 2.6; ctx.filter = `blur(${haloBlur}px)`; ctx.beginPath(); ctx.arc(cx, cy, r, 0, TAU); ctx.stroke();
  ctx.filter = 'none'; ctx.strokeStyle = rgba(T().primary, alpha); ctx.lineWidth = width; ctx.beginPath(); ctx.arc(cx, cy, r, 0, TAU); ctx.stroke();
  ctx.restore();
}
function s08_underline(ctx, x, y, w, p, col) {
  if (p <= 0) return; const hw = w / 2 * E.outCubic(p);
  ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = col; ctx.filter = 'blur(6px)'; ctx.globalAlpha = 0.7; ctx.fillRect(x - hw, y - 3, hw * 2, 6); ctx.filter = 'none'; ctx.globalAlpha = 1; ctx.fillRect(x - hw, y - 1, hw * 2, 2); ctx.restore();
}

SCENES.s08 = {
  draw(ctx, lt, t, dur) {
    const C = s08_C, acc = T().accent, pri = T().primary; lt = Math.max(0, lt); t = Math.max(16, t);
    const zoom = lerp(1.0, 1.02, lt / 3), drift = Math.sin(t * TAU * 0.2) * 3;
    const tremAmp = lerp(0, 1.6, remap(t, 18.7, 19)), trem = (fbm1(t * 40, 5) - .5) * 2 * tremAmp;
    withCamera(ctx, { zoom, x: drift + trem, y: trem * 0.7 }, () => {
      // protective glow (0.5 Hz breath) brightening into the build
      const gl = 0.12 * (0.8 + 0.2 * Math.sin(t * TAU * 0.5)) + 0.28 * ez(t, 18.5, 19, E.inQuad);
      radialFill(ctx, C.x, C.y, 560, [[0, rgba(acc, gl)], [0.5, rgba(acc, gl * 0.35)], [1, rgba(acc, 0)]], 'lighter');
      // slow elegant light sweep right → left behind the ring (17.8-18.6)
      if (t >= 17.75 && t <= 18.7) lightSweep(ctx, 1 - E.inOutCubic(remap(t, 17.8, 18.6)), { angle: 15 * Math.PI / 180, width: 220, color: acc, alpha: 0.17 });
      // sphere: pulls in 16.0-16.2, contracts 18.5-19.0
      const spread = lerp(1.45, 1, ez(t, 16, 16.25, E.outCubic)), R = lerp(340, 200, ez(t, 18.5, 19, E.inQuad));
      sphereCloud(ctx, t, { cx: C.x, cy: C.y, r: R, count: 170, alpha: 0.32 * clamp(remap(t, 16, 16.15) + 0.4), edgeAlpha: 0.15, rot: t * 0.05, tilt: 0.5, spread, seed: 8 });
      // precision rings (secondary) with 10° ticks, opposite directions, accelerating into the build
      const accel = ez(t, 18.5, 19, E.inExpo) * 9;
      s08_ticks(ctx, C.x, C.y, 300 * lerp(1, 0.88, ez(t, 18.5, 19)), t * 0.08 + accel, 36, 10, T().secondary, 0.25);
      s08_ticks(ctx, C.x, C.y, 430, -t * 0.06 - accel * 0.8, 36, -12, T().secondary, 0.22);
      // main safety ring: lock-in (1.5 → 1, easeOutBack, 0.2 s), brightens with each word, tightens 360 → 300 in the riser
      const lock = E.outBack(remap(t, 16, 16.2)); const r = lerp(360, 300, ez(t, 18.5, 19, E.inQuad)) * lerp(1.5, 1, lock);
      let bright = 0.85; for (const w of s08_WORDS) if (t >= w[1] && t < w[1] + 0.15) bright += 0.2;
      s08_ring(ctx, C.x, C.y, r, Math.min(1, bright) * clamp(lock * 2 + 0.2), 6);
      // single shockwave at the lock-in: 360 → 700 over 0.6 s
      const sw = remap(t, 16.0, 16.6);
      if (sw > 0 && sw < 1) { ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.strokeStyle = rgba(acc, 0.9 * (1 - sw)); ctx.lineWidth = 8 * (1 - sw * 0.6); ctx.filter = 'blur(4px)'; ctx.beginPath(); ctx.arc(C.x, C.y, lerp(360, 700, E.outCubic(sw)), 0, TAU); ctx.stroke(); ctx.restore(); }
      // specular arc travelling around the ring with the sweep
      if (t >= 17.8 && t <= 18.6) { const a0 = lerp(0.4, TAU + 0.4, E.inOutCubic(remap(t, 17.8, 18.6))); ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.strokeStyle = rgba(pri, 0.9); ctx.lineWidth = 9; ctx.filter = 'blur(5px)'; ctx.beginPath(); ctx.arc(C.x, C.y, r, a0, a0 + 0.7); ctx.stroke(); ctx.restore(); }
      // the three words on the three notes, stacked, with underline draw-ons; fine jitter from 18.7
      const jit = tremAmp * 1.2, exitP = E.inQuad(remap(t, 18.85, 19.0));
      ctx.save(); ctx.globalAlpha *= 1 - exitP; ctx.translate(C.x, C.y); ctx.scale(1 - 0.6 * exitP, 1 - 0.6 * exitP); ctx.translate(-C.x, -C.y);
      for (const [w, t0, y] of s08_WORDS) {
        if (t < t0 - 1 / 30) continue; const p = remap(t, t0 - 1 / 30, t0 - 1 / 30 + 0.45);
        const jx = (hash2(Math.floor(t * 30), Math.floor(y)) - .5) * 2 * jit, jy = (hash2(Math.floor(t * 30) + 7, Math.floor(y)) - .5) * 2 * jit;
        drawKinetic(ctx, w, C.x + jx, y + jy, Object.assign({ stagger: 0.6, ease: E.outExpo, rise: 14, blurIn: 8 }, s08_HL), p, 'rise');
        const uw = measureText(ctx, w, s08_HL); s08_underline(ctx, C.x + jx, y + 74 + jy, uw, remap(t, t0 + 0.3, t0 + 0.5), acc);
      }
      // subline and footnote
      drawKinetic(ctx, 'Mit zusätzlichen Sicherheitsmaßnahmen.', C.x, 1300, Object.assign({ color: rgba(pri, 0.8), stagger: 0.4, rise: 16, blurIn: 6 }, s08_SUB), remap(t, 17.8, 18.25), 'rise');
      const fp = ez(t, 18.0, 18.5, E.outCubic);
      if (fp > 0) { drawText(ctx, 'Claude Mythos 5.1:', C.x, 1440, { size: 44, family: FONTS.head, weight: 500, tracking: 0.02 * 44, color: rgba(pri, 0.55 * fp) }); drawText(ctx, 'nur für zugelassene Organisationen.', C.x, 1496, { size: 44, family: FONTS.head, weight: 500, tracking: 0.02 * 44, color: rgba(pri, 0.55 * fp) }); }
      ctx.restore();
    });
  }
};

/* ------------------------------------------------------------------- s09 */
const s09_KICKS = (() => { const k = []; for (let x = 19; x < 20 - 1e-6; x += 0.25) k.push(+x.toFixed(4)); for (let x = 20; x < 21.85 - 1e-6; x += 0.125) k.push(+x.toFixed(4)); return k; })();
const s09_BURSTS = [21.0, 21.25, 21.375, 21.5, 21.625, 21.75];
const s09_HL = { size: 112, family: FONTS.body, weight: 800, tracking: -0.045 * 112 };
const s09_N = 1500, s09_P = (() => { const r = rng(909); const a = new Float32Array(s09_N), T_ = new Float32Array(s09_N), ph = new Float32Array(s09_N), R0 = new Float32Array(s09_N), sz = new Float32Array(s09_N); for (let i = 0; i < s09_N; i++) { a[i] = r() * TAU; T_[i] = 1.2 + r() * 1.4; ph[i] = r(); R0[i] = 1100 + r() * 450; sz[i] = 2 + r() * 4; } return { a, T: T_, ph, R0, sz }; })();
const s09_TXT = makeCanvas(W, 260);
function s09_infall(ctx, t, C) {
  const spr = softSprite(T().accent), speed = lerp(1, 2.4, remap(t, 20.5, 21.85)), P = s09_P;
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  for (let k = 2; k >= 0; k--) { const tt = t - k * 0.034, al = k === 0 ? 0.9 : 0.3;
    for (let i = 0; i < s09_N; i++) { const ph = (((tt - 19) * speed / P.T[i] + P.ph[i]) % 1 + 1) % 1; const r = P.R0[i] * (1 - E.inQuart(ph)); if (r < 40) continue; const x = C.x + Math.cos(P.a[i]) * r, y = C.y + Math.sin(P.a[i]) * r; if (x < -40 || x > W + 40 || y < -40 || y > H + 40) continue; const s = P.sz[i] * (0.6 + 1.2 * ph); ctx.globalAlpha = al * (0.35 + 0.65 * ph); ctx.drawImage(spr, x - s, y - s, s * 2, s * 2); } }
  ctx.restore();
}
function s09_sliceText(ctx, str, x, y, o, t, C) {
  const c = s09_TXT.getContext('2d'); c.clearRect(0, 0, W, 260);
  const lum = s09_BURSTS.some(b => t >= b && t < b + 0.05) ? 1 : 0;
  drawText(c, str, x, 130, Object.assign({}, o, { color: lum ? '#ffffff' : o.color || T().primary }));
  const nS = 6, h = 260 / nS, tear = E.inQuad(remap(t, 21.6, 21.85));
  ctx.save();
  for (let k = 0; k < nS; k++) {
    const asm = E.outExpo(remap(t, 19.0 + k * 0.035, 19.3)); let dx = (k % 2 ? 1 : -1) * 44 * (1 - asm), dy = 0, sc = 1, al = clamp(asm * 3);
    // glitch bursts: extra slice offsets for 2 frames
    for (const b of s09_BURSTS) if (t >= b && t < b + 0.067) dx += (hash2(k, Math.floor(b * 100)) - .5) * 60;
    if (tear > 0) { const sy = y - 130 + k * h + h / 2; dx += (C.x - x) * tear; dy += (C.y - sy) * tear; sc = 1 - 0.65 * tear; al *= 1 - tear; }
    ctx.globalAlpha = al; const dw = W * sc, dh = h * sc;
    ctx.drawImage(s09_TXT, 0, k * h, W, h, x - W / 2 + dx + (W - dw) / 2, y - 130 + k * h + dy + (h - dh) / 2, dw, dh);
  }
  ctx.restore();
}
function s09_sparks(ctx, t, x, yTop, count) {
  const spr = softSprite(T().accent); ctx.save(); ctx.globalCompositeOperation = 'lighter';
  for (let i = 0; i < count; i++) { const life = ((t * (0.8 + hash1(i) * 1.2) + hash1(i * 7)) % 1); const px = x + (hash1(i * 3) - .5) * 60 * life * 3, py = yTop - life * (120 + hash1(i * 5) * 260); const s = 2 + hash1(i * 11) * 3; ctx.globalAlpha = (1 - life) * 0.9; ctx.drawImage(spr, px - s, py - s, s * 2, s * 2); }
  ctx.restore();
}
SCENES.s09 = {
  draw(ctx, lt, t, dur) {
    const C = s08_C, acc = T().accent, pri = T().primary;
    if (t >= 21.85) { // hard black, one accent point, nothing moves
      ctx.fillStyle = acc; ctx.beginPath(); ctx.arc(540, 960, 3, 0, TAU); ctx.fill(); dot(ctx, 540, 960, 16, acc, 0.45); return;
    }
    let lastK = 19; for (const k of s09_KICKS) if (k <= t) lastK = k; const kImp = impulse(t, lastK, 14);
    const push = lerp(1, 1.12, E.inQuad(remap(t, 19, 21.85))), punch = 1 + (t < 20 ? 0.04 : 0.06) * kImp;
    FX.shake = Math.max(FX.shake, lerp(3, 9, remap(t, 19.5, 21.5)) * (0.35 + 0.65 * kImp));
    const roll = t >= 20 ? Math.sin((t - 20) * TAU * 1.3) * 3 * Math.PI / 180 * remap(t, 20, 20.4) : 0;
    // rgb during slice assembly + bursts
    const wash = ez(t, 21.35, 21.85, E.inQuad);
    FX.rgb = Math.max(FX.rgb, 4 * (1 - E.outExpo(remap(t, 19, 19.3))));
    for (const b of s09_BURSTS) if (t >= b && t < b + 0.067) { FX.glitch = Math.max(FX.glitch, wash > 0.5 ? 0.22 : (b >= 21.5 ? 0.45 : 0.75)); if (wash < 0.5) FX.rgb = Math.max(FX.rgb, 10); FX.glitchSeed = Math.floor(b * 1000); } FX.vignette = 0.6 * (1 - wash); FX.bloom = Math.max(FX.bloom, 0.2 + 0.3 * wash);
    withCamera(ctx, { zoom: push * punch, rot: roll }, () => {
      // tilted wireframe grid plane, pulsing accent on kicks
      const inP = ez(t, 19, 19.2, E.outCubic);
      floorGrid(ctx, t, { horizon: 560, camH: 300, spacing: 120, speed: 260 + 400 * remap(t, 20, 21.85), color: mixColor(T().secondary, acc, kImp), alpha: (0.18 + 0.3 * kImp) * inP, rows: 20, cols: 9, lineWidth: 1.5, xScale: 1.2 });
      if (inP < 1) { const cp = E.inCubic(remap(t, 19, 19.2)); sphereCloud(ctx, t, { cx: C.x, cy: C.y, r: lerp(200, 40, cp), count: 170, alpha: 0.32 * (1 - cp), edgeAlpha: 0.15 * (1 - cp), rot: t * 0.05, tilt: 0.5, seed: 8 }); s08_ring(ctx, C.x, C.y, lerp(300, 100, cp), 0.95 * (1 - cp * 0.6), lerp(6, 14, cp)); s08_ticks(ctx, C.x, C.y, lerp(300 * 0.88, 300, cp), t * 0.08 + 9, 36, 10, T().secondary, 0.25 * (1 - cp)); s08_ticks(ctx, C.x, C.y, 430, -t * 0.06 - 7.2, 36, -12, T().secondary, 0.22 * (1 - cp)); }
      // reverse explosion: particles fall inward
      s09_infall(ctx, t, C);
      // precision rings spinning fast with smeared ticks; from 20.0 merge into a vortex
      const spin = lerp(2, 4.5, remap(t, 19, 21)), merge = remap(t, 20, 21);
      for (let k = 0; k < 3; k++) { const r = [300, 360, 430][k] * lerp(1, 0.78, merge), dir = k % 2 ? -1 : 1; for (let s = 3; s >= 0; s--) s08_ticks(ctx, C.x, C.y, r, (t - s * 0.02) * spin * dir * (1 + k * 0.3), 36, 14, pri, (s === 0 ? 0.4 : 0.1) * inP, 1.5); }
      if (merge > 0) { ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.strokeStyle = rgba(acc, 0.15 * merge); ctx.lineWidth = 2; for (let i = 0; i < 12; i++) { const rr = 200 + i * 26; ctx.setLineDash([rr * 0.9, rr * 0.5]); ctx.lineDashOffset = -(t * (i % 2 ? -3 : 3) * (1 + i * 0.1)) * rr; ctx.beginPath(); ctx.arc(C.x, C.y, rr, 0, TAU); ctx.stroke(); } ctx.setLineDash([]); ctx.restore(); }
      // shockwave on every kick
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      for (const k of s09_KICKS) { const l = (t - k) / 0.4; if (l <= 0 || l >= 1) continue; ctx.strokeStyle = rgba(acc, 0.6 * (1 - l)); ctx.lineWidth = 2.5; ctx.beginPath(); ctx.arc(C.x, C.y, lerp(100, 900, E.outCubic(l)), 0, TAU); ctx.stroke(); }
      ctx.restore();
      // glaring core
      const coreR = lerp(100, 200, remap(t, 20, 21)) * (1 + 0.15 * kImp);
      radialFill(ctx, C.x, C.y, coreR * 3.2, [[0, rgba(acc, 0.75)], [0.3, rgba(acc, 0.3)], [1, rgba(acc, 0)]], 'lighter');
      radialFill(ctx, C.x, C.y, coreR, [[0, '#ffffff'], [0.55, pri], [1, rgba(pri, 0)]], 'lighter');
      // progress bar countdown (right edge) with spark stream
      const prog = remap(t, 19, 21.85);
      ctx.save(); ctx.strokeStyle = rgba(pri, 0.6); ctx.lineWidth = 1; ctx.strokeRect(940, 300, 20, 1320); ctx.restore();
      progressBar(ctx, 950, 960, 1316, prog, { vertical: true, thickness: 16, color: acc, track: pri });
      s09_sparks(ctx, t, 950, 1618 - 1316 * prog, Math.floor(lerp(20, 130, prog)));
      // headline assembling by slices on a legibility band; tears into the core at the end
      band(ctx, 1250, 220, 0.6 * (1 - wash));
      s09_sliceText(ctx, 'Mythos-Klasse.', C.x, 1250, s09_HL, t, C);
      // subline typewriter (two lines) with accent cursor; tears with the headline
      const tearA = 1 - E.inQuad(remap(t, 21.6, 21.85));
      const sub = { size: 46, family: FONTS.head, weight: 500, tracking: 0.02 * 46, color: rgba(pri, 0.8 * tearA), caretColor: acc };
      if (t >= 19.4) drawKinetic(ctx, 'Anthropics intelligentestes', C.x, 1360 + (C.y - 1360) * (1 - tearA), sub, remap(t, 19.4, 19.65), 'type');
      if (t >= 19.65) drawKinetic(ctx, 'verfügbares Modell.', C.x, 1416 + (C.y - 1416) * (1 - tearA), sub, remap(t, 19.65, 19.9), 'type');
      // desaturation wash to white (21.35-21.85)
      if (wash > 0) { ctx.save(); ctx.fillStyle = rgba(pri, 0.85 * wash); ctx.fillRect(-200, -200, W + 400, H + 400); ctx.restore(); radialFill(ctx, C.x, C.y, 900, [[0, rgba(pri, 0.9 * wash)], [1, rgba(pri, 0)]], 'lighter'); }
    });
  }
};
