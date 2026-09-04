// s07.js — "Ich lebe in Claude Code." (14.0–16.0)
// Minimal terminal, no window chrome: the single 2 px primary hairline at y=700 (x 120..960) that s06 collapsed
// into, a faint rotating 3D point-cloud constellation behind everything (the system lives behind the tool),
// '$ claude' typewriter with a blinking accent block cursor, the model id line with an accent dot, the headline
// slam 'Ich lebe in' / 'Claude Code.', the four words Terminal · Desktop · Web · IDE landing on 8th notes with
// HUD outlines drawing on, then the exhale: kick shake stops, an accent light streak passes right → left, the
// text sinks 40 px and dims to 70 % while the constellation brightens and slows into s08's sphere.
// Everything is a pure function of t. All module-level helpers/constants are prefixed s07_.

const s07_START = 14.0;
const s07_HL_Y = 700, s07_HL_X0 = 120, s07_HL_X1 = 960;   // inherited hairline
const s07_VP = { x: 540, y: 860 };                         // s06 vanishing point = s08 sphere centre
const s07_KICKS = [14.0, 14.5, 15.0, 15.5];
const s07_WORDS = [['Terminal', 14.75], ['Desktop', 15.0], ['Web', 15.25], ['IDE', 15.5]];
const s07_WORD_Y = 1260, s07_WORD_GAP = 22, s07_RECT_PAD = 12, s07_RECT_H = 66;
const s07_MONO = { size: 44, family: FONTS.mono, weight: 500 };
const s07_SUB = { size: 48, family: FONTS.head, weight: 500, tracking: 0.02 * 48 };

// ---- 3D point-cloud constellation (object-space table, rotation-invariant links) ------------------------
const s07_CLOUD = (() => {
  const r = rng(707), N = 150, R = 540;
  const x = new Float32Array(N), y = new Float32Array(N), z = new Float32Array(N), sz = new Float32Array(N), ph = new Float32Array(N);
  for (let i = 0; i < N; i++) {
    const zz = r() * 2 - 1, a = r() * TAU, rr = Math.sqrt(1 - zz * zz);
    const rad = R * lerp(0.5, 1, Math.sqrt(r()));                 // shell-biased cloud
    x[i] = rr * Math.cos(a) * rad; y[i] = rr * Math.sin(a) * rad * 0.9; z[i] = zz * rad;
    sz[i] = 2 + r() * 3.5; ph[i] = r();
  }
  // links: up to 3 nearest neighbours within 230 world px
  const links = [], lph = [];
  for (let i = 0; i < N; i++) {
    const cand = [];
    for (let j = 0; j < N; j++) { if (j === i) continue; const d = Math.hypot(x[i] - x[j], y[i] - y[j], z[i] - z[j]); if (d < 230) cand.push([d, j]); }
    cand.sort((a, b) => a[0] - b[0]);
    for (let k = 0; k < Math.min(3, cand.length); k++) { const j = cand[k][1]; if (j > i || !links.some(l => l[0] === j && l[1] === i)) { links.push([i, j]); lph.push(r()); } }
  }
  return { N, x, y, z, sz, ph, links, lph, px: new Float32Array(N), py: new Float32Array(N), pd: new Float32Array(N), ps: new Float32Array(N) };
})();
// rotation angle: 0.18 rad/s, slowing to 0.05 rad/s over the exhale (analytic integral → continuous)
function s07_theta(lt) {
  if (lt <= 1.6) return 0.18 * lt + 0.6;
  const u = clamp((lt - 1.6) / 0.4);
  return 0.18 * 1.6 + 0.6 + 0.4 * (0.18 * u - 0.065 * u * u) + Math.max(0, lt - 2) * 0.05;
}
function s07_cloud(ctx, t, lt, alpha, P) {
  const C = s07_CLOUD, th = s07_theta(lt), cr = Math.cos(th), sr = Math.sin(th), tilt = 0.45, ct = Math.cos(tilt), st = Math.sin(tilt), f = 1400;
  const cx = s07_VP.x + Math.sin(t * 0.7) * 10, cy = s07_VP.y + Math.cos(t * 0.5) * 8;
  for (let i = 0; i < C.N; i++) {
    const x = C.x[i], y = C.y[i], z = C.z[i];
    const x1 = x * cr - z * sr, z0 = x * sr + z * cr, y1 = y * ct - z0 * st, z1 = y * st + z0 * ct;
    const s = f / (f + z1);
    C.px[i] = cx + x1 * s + (fbm1(t * 0.3 + i * 2.3, i) - .5) * 30;
    C.py[i] = cy + y1 * s + (fbm1(t * 0.27 + i * 1.3, i + 77) - .5) * 30;
    C.pd[i] = clamp((1 - z1 / 540) / 2); C.ps[i] = s;
  }
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  // links (batched into 3 depth buckets → 3 strokes)
  const bk = [[], [], []];
  for (let k = 0; k < C.links.length; k++) { const [i, j] = C.links[k]; const d = (C.pd[i] + C.pd[j]) / 2; bk[Math.min(2, Math.floor(d * 3))].push(k); }
  ctx.lineWidth = 1;
  for (let b = 0; b < 3; b++) {
    if (!bk[b].length) continue;
    ctx.strokeStyle = rgba(P.primary, alpha * (0.35 + 0.65 * (b + 0.5) / 3)); ctx.beginPath();
    for (const k of bk[b]) { const [i, j] = C.links[k]; ctx.moveTo(C.px[i], C.py[i]); ctx.lineTo(C.px[j], C.py[j]); }
    ctx.stroke();
  }
  // travelling pulses on ~30 % of the links
  for (let k = 0; k < C.links.length; k++) {
    if (C.lph[k] > 0.3) continue; const [i, j] = C.links[k]; const u = (t * 0.45 + C.lph[k] * 7) % 1;
    dot(ctx, lerp(C.px[i], C.px[j], u), lerp(C.py[i], C.py[j], u), 5, P.accent, alpha * 2.2 * (0.4 + 0.6 * C.pd[i]));
  }
  // nodes
  for (let i = 0; i < C.N; i++) { const s = C.sz[i] * C.ps[i]; dot(ctx, C.px[i], C.py[i], s * 3, P.primary, alpha * 1.6 * (0.3 + 0.7 * C.pd[i])); }
  ctx.fillStyle = P.primary;
  for (let i = 0; i < C.N; i++) { ctx.globalAlpha = alpha * 3 * (0.3 + 0.7 * C.pd[i]); const s = C.sz[i] * C.ps[i] * 0.5; ctx.beginPath(); ctx.arc(C.px[i], C.py[i], s, 0, TAU); ctx.fill(); }
  ctx.restore();
}

// ---- cached glow layers (content is static → rendered once at half resolution, drawn per frame without filters)
const s07_HALO = makeCanvas(W / 2, H / 2); let s07_haloSize = 0;
function s07_haloCanvas(hopt) {
  if (s07_haloSize === hopt.size) return s07_HALO;
  const o = s07_HALO.getContext('2d'); o.setTransform(1, 0, 0, 1, 0, 0); o.clearRect(0, 0, W / 2, H / 2);
  o.setTransform(0.5, 0, 0, 0.5, 0, 0); o.filter = 'blur(12px)';
  for (const [str, y] of [['Ich lebe in', 1000], ['Claude Code.', 1130]]) drawText(o, str, CX, y, Object.assign({}, hopt, { color: T().accent }));
  o.filter = 'none'; s07_haloSize = hopt.size; return s07_HALO;
}
const s07_HLGLOW = (() => {
  const c = makeCanvas(W / 2, 80), o = c.getContext('2d');
  o.setTransform(0.5, 0, 0, 0.5, 0, 40 - 0.5 * s07_HL_Y);   // y=700 → local 40 (half res)
  o.filter = 'blur(7px)'; o.strokeStyle = rgba(T().accent, 0.5); o.lineWidth = 12; o.lineCap = 'round';
  o.beginPath(); o.moveTo(s07_HL_X0, s07_HL_Y); o.lineTo(s07_HL_X1, s07_HL_Y); o.stroke(); return c;
})();

// ---- HUD rectangle outline that draws on clockwise from the top-left ---------------------------------------
function s07_hudRect(ctx, x, y, w, h, p, alpha, col) {
  if (p <= 0) return;
  const per = 2 * (w + h), e = E.outCubic(clamp(p));
  ctx.save(); ctx.strokeStyle = col; ctx.lineWidth = 1; ctx.globalAlpha *= alpha;
  if (e < 1) ctx.setLineDash([per * e, per]);
  ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + w, y); ctx.lineTo(x + w, y + h); ctx.lineTo(x, y + h); ctx.closePath(); ctx.stroke();
  ctx.setLineDash([]); ctx.restore();
}

// ---- horizontal accent light streak (anisotropic radial gradient: no filter needed) ----------------------
function s07_streak(ctx, x, y, alpha, P) {
  ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha *= alpha;
  ctx.translate(x, y); ctx.scale(1, 130 / 420);
  radialFill(ctx, 0, 0, 420, [[0, rgba(P.primary, 0.75)], [0.12, rgba(P.accent, 0.55)], [0.45, rgba(P.accent, 0.16)], [1, rgba(P.accent, 0)]]);
  ctx.scale(2.2, 0.16);
  radialFill(ctx, 0, 0, 420, [[0, rgba(P.primary, 0.9)], [0.2, rgba(P.accent, 0.5)], [1, rgba(P.accent, 0)]]);
  ctx.restore();
}

SCENES.s07 = {
  draw(ctx, lt, t, dur, sc) {
    const P = T();
    lt = t - s07_START;
    // ---------------- timing scalars
    const ex = E.inOutCubic(remap(t, 15.6, 16.0));                 // exhale 0..1
    let kick = 0; for (const k of s07_KICKS) kick += impulse(t, k, 12);
    let kickShake = 0; for (const k of s07_KICKS) kickShake = Math.max(kickShake, 2 * impulse(t, k, 12));
    FX.shake = Math.max(FX.shake, kickShake * (1 - remap(t, 15.55, 15.65)));   // stops dead at 15.6
    if (lt < 0.1) FX.rgb = Math.max(FX.rgb, 8 * (1 - ez(lt, 0, 0.1, E.outCubic)));   // 3-frame RGB split on the slam
    FX.bloom = Math.max(FX.bloom, 0.2 + 0.1 * impulse(t, 14.0, 8) + 0.06 * ex);
    const sinkY = 40 * ex, dim = lerp(1, 0.7, ex);
    const camZoom = lerp(1.04, 1.0, E.outQuad(clamp(lt / 2))) * (1 + 0.012 * kick * (1 - ex));

    withCamera(ctx, { zoom: camZoom }, () => {
      // ================= background: faint constellation, brightening in the exhale
      s07_cloud(ctx, t, lt, lerp(0.15, 0.38, ex), P);

      // ================= residual converging lines snapping into the hairline (first 0.15 s)
      const snap = ez(lt, 0, 0.15, E.outExpo);
      if (snap < 1) {
        ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.strokeStyle = P.primary; ctx.lineWidth = 1.5; ctx.lineJoin = 'round';
        const scales = [0.92, 0.72, 0.55, 0.4, 0.28, 0.2];
        for (let k = 0; k < scales.length; k++) {
          const s = scales[k], p = clamp(lerp(0.72 - k * 0.05, 1.0, snap) + 0.0);
          const x0 = s07_VP.x - 560 * s, x1 = s07_VP.x + 560 * s, y0 = s07_VP.y - 996 * s, y1 = s07_VP.y + 996 * s;
          const cx0 = lerp(x0, s07_HL_X0, p), cx1 = lerp(x1, s07_HL_X1, p), cy0 = lerp(y0, s07_HL_Y, p), cy1 = lerp(y1, s07_HL_Y, p);
          ctx.globalAlpha = 0.6 * (1 - snap) * (1 - k * 0.1);
          ctx.strokeRect(cx0, cy0, cx1 - cx0, cy1 - cy0);
        }
        ctx.restore();
      }

      // ================= the hairline (y=700, x 120..960) + hot flash at 14.0 + beat sparks
      const hlHot = impulse(t, 14.0, 9);
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      ctx.drawImage(s07_HLGLOW, 0, s07_HL_Y - 80, W, 160);
      ctx.strokeStyle = P.primary; ctx.lineWidth = 2; ctx.lineCap = 'round'; ctx.globalAlpha = lerp(1, 0.85, ex);
      ctx.beginPath(); ctx.moveTo(s07_HL_X0, s07_HL_Y); ctx.lineTo(s07_HL_X1, s07_HL_Y); ctx.stroke();
      ctx.restore();
      if (hlHot > 0.02) {
        ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = hlHot;
        ctx.strokeStyle = rgba(P.primary, 0.9); ctx.lineWidth = 2 + 4 * hlHot; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(s07_HL_X0, s07_HL_Y); ctx.lineTo(s07_HL_X1, s07_HL_Y); ctx.stroke();
        ctx.restore();
        flare(ctx, s07_HL_X0, s07_HL_Y, { color: P.accent, size: 160, intensity: 0.5 * hlHot, streakLen: 2.8, streakThin: 0.03 });
        flare(ctx, s07_HL_X1, s07_HL_Y, { color: P.accent, size: 160, intensity: 0.5 * hlHot, streakLen: 2.8, streakThin: 0.03 });
      }
      for (const k of [14.5, 15.0, 15.5]) {                      // a spark runs along the line on every kick
        const e = remap(t, k, k + 0.4); if (e <= 0 || e >= 1) continue;
        const x = lerp(s07_HL_X0, s07_HL_X1, E.outCubic(e)), a = 1 - e * e;
        ctx.save(); ctx.globalCompositeOperation = 'lighter';
        dot(ctx, x, s07_HL_Y, 26, P.accent, 0.85 * a); dot(ctx, x, s07_HL_Y, 8, P.primary, a);
        ctx.restore();
      }

      // ================= text group: sinks 40 px and dims to 70 % in the exhale
      ctx.save(); ctx.translate(0, sinkY); ctx.globalAlpha *= dim;

      // ---- '$ claude' typewriter at y=780 (14.1 →, 22 ms/char) with blinking accent block cursor
      {
        const y = 780, x0 = s07_HL_X0, cmd = '$ claude', n = cmd.length;
        const typed = t < 14.1 ? 0 : Math.min(n, Math.floor((t - 14.1) / 0.022 + 1e-6) + 1);
        ctx.save(); ctx.font = font(44, FONTS.mono, 500); ctx.textBaseline = 'middle'; ctx.textAlign = 'left';
        let x = x0;
        for (let i = 0; i < typed; i++) {
          const ch = cmd[i]; const w = ctx.measureText(ch).width;
          if (ch !== ' ') { ctx.fillStyle = i === 0 ? P.accent : rgba(P.primary, 0.85); ctx.fillText(ch, x, y); }
          x += w;
        }
        if (t >= 14.1) {
          const done = typed >= n, blinkOn = !done || Math.floor((t - 14.1 - n * 0.022) * 2.4) % 2 === 0;
          if (blinkOn) {
            ctx.save(); ctx.globalCompositeOperation = 'lighter';
            ctx.fillStyle = P.accent; ctx.fillRect(x + (done ? 6 : 2), y - 20, 24, 40);
            dot(ctx, x + (done ? 6 : 2) + 12, y, 30, P.accent, 0.35);
            ctx.restore();
          }
        }
        ctx.restore();
      }

      // ---- model id line at y=850 (14.4 → 14.55): accent dot pops, text slides in from the left
      {
        const e = ez(t, 14.4, 14.55, E.outCubic);
        if (e > 0) {
          const y = 850, dx = 14 * (1 - e);
          const pop = E.outBack(remap(t, 14.4, 14.6));
          ctx.save(); ctx.globalCompositeOperation = 'lighter';
          dot(ctx, s07_HL_X0 + 13, y, 22 * pop, P.accent, 0.45 * e);
          ctx.fillStyle = P.accent; ctx.globalAlpha *= e; ctx.beginPath(); ctx.arc(s07_HL_X0 + 13, y, 7 * pop, 0, TAU); ctx.fill();
          ctx.restore();
          drawText(ctx, 'claude-fable-5-1', s07_HL_X0 + 46 - dx, y, Object.assign({}, s07_MONO, { align: 'left', color: rgba(P.primary, 0.7), alpha: e }));
        }
      }

      // ---- headline 'Ich lebe in' / 'Claude Code.' — slam 1.2 → 1.0 (14.0–14.15) on a legibility band
      {
        let hsz = 120;
        const meas = s => measureText(ctx, s, { size: hsz, family: FONTS.body, weight: 800, tracking: -0.045 * hsz });
        while (hsz > 112 && Math.max(meas('Ich lebe in'), meas('Claude Code.')) > 900) hsz -= 4;
        const hopt = { size: hsz, family: FONTS.body, weight: 800, tracking: -0.045 * hsz, color: P.primary };
        band(ctx, 1065, 440, 0.6);
        const sp = ez(lt, 0, 0.15, E.outExpo);
        const hs = lerp(1.2, 1, sp) * (1 + 0.035 * impulse(t, 14.5, 14)) * (1 + 0.02 * impulse(t, 15.0, 14));
        const lines = [['Ich lebe in', 1000], ['Claude Code.', 1130]];
        withCamera(ctx, { zoom: hs, ox: CX, oy: 1065 }, () => {
          ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha *= 0.2 + 0.12 * kick;
          ctx.drawImage(s07_haloCanvas(hopt), 0, 0, W, H);
          ctx.restore();
          ctx.save(); if (sp < 0.9) ctx.filter = `blur(${((1 - sp) * 6).toFixed(1)}px)`;
          for (const [s, y] of lines) drawText(ctx, s, CX, y, hopt);
          ctx.restore();
        });
      }

      // ---- Terminal · Desktop · Web · IDE on 8th notes with HUD outlines (y=1260)
      {
        const subCol = rgba(P.primary, 0.85);
        const dotW = measureText(ctx, '·', s07_SUB);
        const ww = s07_WORDS.map(w => measureText(ctx, w[0], s07_SUB));
        const total = ww.reduce((a, b) => a + b, 0) + 3 * dotW + 6 * s07_WORD_GAP;
        let x = CX - total / 2;
        for (let k = 0; k < 4; k++) {
          const [word, t0] = s07_WORDS[k], w = ww[k];
          const p = remap(t, t0 - 1 / 30, t0 + 0.18);   // one-frame pre-roll so the word is already moving on its beat frame
          if (p > 0) {
            drawKinetic(ctx, word, x, s07_WORD_Y, Object.assign({ align: 'left', color: subCol, stagger: 0.45, ease: E.outExpo, rise: 22, blurIn: 6 }, s07_SUB), p, 'rise');
            // HUD outline: draws around the word in 80 ms, falls back to 40 % over the next 0.3 s
            const rp = remap(t, t0 - 1 / 30, t0 + 0.06), ra = lerp(1, 0.4, ez(t, t0 + 0.08, t0 + 0.38, E.outCubic));
            s07_hudRect(ctx, x - s07_RECT_PAD, s07_WORD_Y - s07_RECT_H / 2, w + 2 * s07_RECT_PAD, s07_RECT_H, rp, ra, P.primary);
            if (rp > 0 && rp < 1) { const per = 2 * (w + 2 * s07_RECT_PAD + s07_RECT_H), d = per * E.outCubic(rp), rw = w + 2 * s07_RECT_PAD; let hx, hy; const x0 = x - s07_RECT_PAD, y0 = s07_WORD_Y - s07_RECT_H / 2; if (d < rw) { hx = x0 + d; hy = y0; } else if (d < rw + s07_RECT_H) { hx = x0 + rw; hy = y0 + d - rw; } else if (d < 2 * rw + s07_RECT_H) { hx = x0 + rw - (d - rw - s07_RECT_H); hy = y0 + s07_RECT_H; } else { hx = x0; hy = y0 + s07_RECT_H - (d - 2 * rw - s07_RECT_H); } ctx.save(); ctx.globalCompositeOperation = 'lighter'; dot(ctx, hx, hy, 14, P.accent, 0.9); ctx.restore(); }
          }
          x += w + s07_WORD_GAP;
          if (k < 3) {
            const de = ez(t, t0 + 0.1, t0 + 0.2, E.outCubic);   // separator dot 100 ms after each word
            if (de > 0) drawText(ctx, '·', x, s07_WORD_Y, Object.assign({}, s07_SUB, { align: 'left', color: subCol, alpha: de }));
            x += dotW + s07_WORD_GAP;
          }
        }
      }
      ctx.restore();   // text group

      // ================= exhale: accent light streak right → left (15.6–15.9)
      {
        const e = remap(t, 15.6, 15.9);
        if (e > 0 && e < 1) {
          const x = lerp(W + 460, -460, E.inOutQuad(e)), a = Math.sin(e * Math.PI);
          s07_streak(ctx, x, 830 + sinkY * 0.5, 0.35 + 0.65 * a, P);
        }
      }
    });
  }
};
