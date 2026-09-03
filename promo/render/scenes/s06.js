// s06.js — "Ich behalte den Überblick." (12.0–14.0) — context tunnel: 24 rushing 9:16 wireframe frames
// (manual projection, VP (540,860)), a 6000-dot "document" texture on the four walls, star-field warp,
// headline slam, per-character subline, the accent "roter Faden" thread pulled from the vanishing point
// at 12.5 that stays waving under the headline, speed doubling + 6° roll from 13.2, and a collapse of every
// line into the single horizontal hairline (y=700, x 120..960) that s07 inherits.
// Everything is a pure function of t. All module-level helpers/constants are prefixed s06_.

const s06_START = 12.0;
const s06_VP = { x: 540, y: 860 };            // vanishing point
const s06_F = 900;                            // focal length
const s06_HW = 560, s06_HH = 996;             // world half-size of the tunnel cross-section (9:16)
const s06_ZFR = 4320;                         // tunnel depth (24 frames × 180)
const s06_ZDOT = 3400;                        // dot loop depth
const s06_ZTHR = 3000;                        // thread starts this deep (projects onto the VP)
const s06_KICKS = [12.0, 12.5, 13.0, 13.5];
const s06_THR_X0 = 170, s06_THR_X1 = 910, s06_THR_Y = 1060;   // horizontal thread under the headline
const s06_HL_Y = 700, s06_HL_X0 = 120, s06_HL_X1 = 960;       // hairline s07 inherits
const s06_COLL0 = 13.80, s06_COLL1 = 13.95;                    // collapse window (the engine stutter shows t = 13.883 and 13.95 last)
const s06_COLLG = 0.72;                                        // geometry collapse at p = 1: s07 picks the residual lines up at exactly this fraction
const s06_TXT0 = 13.79, s06_TXT1 = 13.87;                      // text blur-and-fade window (fully gone before the collapse frames are shown)

// ---- speed / distance / spacing ------------------------------------------
// 1400 px/s, doubling to 2800 with a 0.25 s ramp from 13.2 (analytic integral → continuous distance)
function s06_speed(t) { return 1400 * (1 + clamp((t - 13.2) / 0.25)); }
function s06_dist(t) {
  const lt = t - s06_START, v0 = 1400, t1 = 1.2, ramp = 0.25;
  let d = v0 * lt;
  if (lt > t1) { const u = Math.min(lt - t1, ramp); d += v0 * u * u / (2 * ramp); if (lt > t1 + ramp) d += v0 * (lt - t1 - ramp); }
  return d + 1234;   // fixed phase offset
}
function s06_spacing(t) { return lerp(180, 90, ez(t, 13.2, 13.75, E.inOutQuad)); }
// frame phase φ = ∫ speed/spacing dt (frames passed) — tabulated after 13.2 where spacing changes
const s06_PHI_N = 600;
const s06_PHI = (() => {
  const arr = new Float32Array(s06_PHI_N + 1); let phi = s06_dist(13.2) / 180; arr[0] = phi; const dt = 0.8 / s06_PHI_N;
  for (let i = 1; i <= s06_PHI_N; i++) { const tm = 13.2 + (i - 0.5) * dt; phi += s06_speed(tm) / s06_spacing(tm) * dt; arr[i] = phi; }
  return arr;
})();
function s06_phase(t) {
  if (t <= 13.2) return s06_dist(t) / 180;
  const u = clamp((t - 13.2) / 0.8) * s06_PHI_N, i = Math.min(s06_PHI_N - 1, Math.floor(u)), f = u - i;
  return lerp(s06_PHI[i], s06_PHI[i + 1], f);
}

// ---- seeded document dots on the four walls ------------------------------
// rows across each wall (every 32 world px), "words" of 2–7 dots every 18 px along z with random gaps
const s06_DOTS = (() => {
  const r = rng(606), rows = [];
  for (let y = -500; y <= 500; y += 32) { rows.push([0, y]); rows.push([1, y]); }   // left / right walls, u = world y
  for (let x = -400; x <= 400; x += 32) { rows.push([2, x]); rows.push([3, x]); }   // top / bottom walls, u = world x
  const per = Math.floor(6000 / rows.length), n = per * rows.length;
  const wx = new Float32Array(n), wy = new Float32Array(n), z0 = new Float32Array(n), br = new Float32Array(n);
  let i = 0;
  for (const [w, uu] of rows) {
    let zz = r() * 400, count = 0;
    while (count < per) {
      const wordLen = 2 + Math.floor(r() * 6);
      for (let k = 0; k < wordLen && count < per; k++) {
        const u = uu + (r() - 0.5) * 5;
        if (w === 0) { wx[i] = -s06_HW; wy[i] = u; } else if (w === 1) { wx[i] = s06_HW; wy[i] = u; }
        else if (w === 2) { wx[i] = u; wy[i] = -s06_HH; } else { wx[i] = u; wy[i] = s06_HH; }
        z0[i] = zz % s06_ZDOT; br[i] = 0.6 + r() * 0.4; zz += 18; i++; count++;
      }
      zz += 40 + r() * 170;
    }
  }
  return { n, wx, wy, z0, br };
})();
// seeded star-field warp (2000 streaks toward the camera, batched into 5 depth buckets → 5 stroke calls)
const s06_WARPN = 2000;
const s06_WARPD = (() => {
  const r = rng(6061), ang = new Float32Array(s06_WARPN), z0 = new Float32Array(s06_WARPN), sp = new Float32Array(s06_WARPN);
  for (let i = 0; i < s06_WARPN; i++) { ang[i] = r() * TAU; z0[i] = r(); sp[i] = 0.7 + r() * 0.6; }
  return { ang, z0, sp };
})();
const s06_WB = 5, s06_WBUF = Array.from({ length: s06_WB }, () => []);
function s06_warp(ctx, tv, o) {
  const cx = o.cx, cy = o.cy, speed = o.speed, maxR = o.maxR, len = o.len, alpha = o.alpha, width = o.width, D = s06_WARPD;
  for (let b = 0; b < s06_WB; b++) s06_WBUF[b].length = 0;
  for (let i = 0; i < s06_WARPN; i++) {
    const z = 1 - (((D.z0[i] + tv * speed * D.sp[i]) % 1) + 1) % 1;                 // 1 far → 0 near
    const d = Math.pow(1 - z, 2.4), d2 = Math.pow(1 - clamp(z + 0.012 * speed * len * 8), 2.4);
    const r1 = d * maxR, r2 = d2 * maxR; if (r2 < 8) continue;
    const ca = Math.cos(D.ang[i]), sa = Math.sin(D.ang[i]);
    s06_WBUF[Math.min(s06_WB - 1, Math.floor(d * s06_WB))].push(cx + ca * r1, cy + sa * r1, cx + ca * r2, cy + sa * r2);
  }
  ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.lineCap = 'round'; ctx.strokeStyle = o.color;
  for (let b = 0; b < s06_WB; b++) {
    const arr = s06_WBUF[b]; if (!arr.length) continue;
    const dm = (b + 0.5) / s06_WB;
    ctx.globalAlpha = alpha * (0.35 + 0.65 * dm); ctx.lineWidth = width * (0.3 + dm * 2);
    ctx.beginPath(); for (let j = 0; j < arr.length; j += 4) { ctx.moveTo(arr[j], arr[j + 1]); ctx.lineTo(arr[j + 2], arr[j + 3]); }
    ctx.stroke();
  }
  ctx.restore();
}
// quarter-resolution offscreen canvases for the accent glow pass (one blur per frame)
const s06_OFF = makeCanvas(W / 4, H / 4), s06_OFFCTX = s06_OFF.getContext('2d');
const s06_OFF2 = makeCanvas(W / 4, H / 4), s06_OFF2CTX = s06_OFF2.getContext('2d');

// ---- the "roter Faden" thread ---------------------------------------------
// 3D part: from the vanishing point (z = ZTHR) snaking forward to (170, 1060) at z = 0
function s06_threadA(z, t, out) {
  const q = clamp(z / s06_ZTHR), s = s06_F / (z + s06_F);
  const wob = (Math.sin(z / 210 + 1.7) * 90 + Math.sin(t * 2.2 + z / 330) * 24) * q * (1 - q);   // gentle: the 3D part crosses the headline block, keep it a clean line
  const xw = -370 * Math.pow(1 - q, 1.35) + wob, yw = 200 * (1 - q);
  out.x = s06_VP.x + xw * s; out.y = s06_VP.y + yw * s; return out;
}
const s06_TA = 28;                                          // polyline samples of the 3D part
const s06_TPX = new Float32Array(s06_TA), s06_TPY = new Float32Array(s06_TA);
const s06_UA = 0.45;                                        // head progress at which the 3D part is complete
function s06_headP(t) { return ez(t, 12.5, 12.8, E.outQuad); }
function s06_buildThread(t) {
  const o = { x: 0, y: 0 };
  for (let i = 0; i < s06_TA; i++) { s06_threadA(s06_ZTHR * (1 - i / (s06_TA - 1)), t, o); s06_TPX[i] = o.x; s06_TPY[i] = o.y; }
}
// distance from (x,y) to the drawn part of the thread (fa = fraction of the 3D part, fb = fraction of the horizontal part)
function s06_threadDist(x, y, fa, fb) {
  let best = 1e9;
  if (fa > 0 && x > s06_THR_X0 - 70 && x < s06_VP.x + 90 && y > s06_VP.y - 70 && y < s06_THR_Y + 70) {
    const segs = fa * (s06_TA - 1), nFull = Math.floor(segs);
    for (let i = 0; i < nFull + 1 && i < s06_TA - 1; i++) {
      const ax = s06_TPX[i], ay = s06_TPY[i]; let bx = s06_TPX[i + 1], by = s06_TPY[i + 1];
      if (i === nFull) { const f = segs - nFull; if (f <= 0) break; bx = lerp(ax, bx, f); by = lerp(ay, by, f); }
      const dx = bx - ax, dy = by - ay, L2 = dx * dx + dy * dy || 1;
      const u = clamp(((x - ax) * dx + (y - ay) * dy) / L2), px = ax + dx * u - x, py = ay + dy * u - y, d = px * px + py * py;
      if (d < best) best = d;
    }
  }
  if (fb > 0 && y > s06_THR_Y - 70 && y < s06_THR_Y + 70) {
    const x1 = s06_THR_X0 + (s06_THR_X1 - s06_THR_X0) * fb, cx = clamp(x, s06_THR_X0, x1), px = cx - x, py = s06_THR_Y - y, d = px * px + py * py;
    if (d < best) best = d;
  }
  return Math.sqrt(best);
}

// ---- tunnel frames --------------------------------------------------------
function s06_frames(ctx, t, lt, lw, alphaMul, color, p, glowPass) {
  const sp = s06_spacing(t), phi = s06_phase(t), frac = phi - Math.floor(phi), n = Math.min(48, Math.ceil(s06_ZFR / sp));
  const boost = 1 - ez(lt, 0, 0.25, E.outCubic);           // s05's rings handing over: near frames bright and thick
  const fadeP = lerp(1, 0.4, p), pg = p * s06_COLLG;
  ctx.lineJoin = 'round';
  for (let k = n; k >= 0; k--) {
    const z = (k - frac) * sp + 8; if (z <= 0) continue;
    const s = s06_F / (z + s06_F);
    const x0 = s06_VP.x - s06_HW * s, y0 = s06_VP.y - s06_HH * s, x1 = s06_VP.x + s06_HW * s, y1 = s06_VP.y + s06_HH * s;
    if (x0 < -40 && x1 > W + 40 && y0 < -40 && y1 > H + 40) continue;   // fully outside the frame
    let a = (0.25 + 0.55 * clamp(1 - z / s06_ZFR)) * alphaMul * lerp(1, 1 - clamp(z / 900), p), w = lw;   // collapse: far frames vanish first, the near ~10 stay alive for s07
    if (boost > 0 && s > 0.5) { const b = boost * clamp((s - 0.5) * 3); a *= 1 + 0.8 * b; w *= 1 + 2.2 * b; }
    ctx.globalAlpha = clamp(a) * fadeP; ctx.lineWidth = (glowPass ? 3 : 1) * w; ctx.strokeStyle = color;
    const cx0 = lerp(x0, s06_HL_X0, pg), cx1 = lerp(x1, s06_HL_X1, pg), cy0 = lerp(y0, s06_HL_Y, pg), cy1 = lerp(y1, s06_HL_Y, pg);
    ctx.strokeRect(cx0, cy0, cx1 - cx0, cy1 - cy0);
  }
  ctx.globalAlpha = 1;
}

// ---- thread drawing --------------------------------------------------------
function s06_thread(ctx, t, hp, p, glowPass, P, core) {
  const fa = clamp(hp / s06_UA), fb = clamp((hp - s06_UA) / (1 - s06_UA));
  const amp = 6 * ez(t, 12.78, 13.05, E.outCubic);
  ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.strokeStyle = core ? rgba(P.primary, 0.55) : P.accent;
  ctx.lineWidth = glowPass ? 9 : core ? 0.8 : 2.2;
  // 3D part (fades and squashes toward the hairline during the collapse); drawn softer than the horizontal part
  if (fa > 0) {
    ctx.lineWidth *= 0.8;
    ctx.globalAlpha = (glowPass ? 0.55 : 0.7) * (1 - p) * (1 - p);
    const segs = fa * (s06_TA - 1), nFull = Math.floor(segs);
    ctx.beginPath(); ctx.moveTo(s06_TPX[0], lerp(s06_TPY[0], s06_HL_Y, p));
    for (let i = 1; i <= nFull && i < s06_TA; i++) ctx.lineTo(s06_TPX[i], lerp(s06_TPY[i], s06_HL_Y, p));
    if (nFull < s06_TA - 1) { const f = segs - nFull; ctx.lineTo(lerp(s06_TPX[nFull], s06_TPX[nFull + 1], f), lerp(lerp(s06_TPY[nFull], s06_TPY[nFull + 1], f), s06_HL_Y, p)); }
    ctx.stroke();
  }
  // horizontal part under the headline, waving 1.5 Hz / 6 px once settled
  if (fb > 0) {
    ctx.lineWidth = glowPass ? 9 : core ? 0.8 : 2.2;
    ctx.globalAlpha = (glowPass ? 0.75 : 0.95) * (1 - p);
    const xa = lerp(s06_THR_X0, s06_HL_X0, p), xb = lerp(s06_THR_X1, s06_HL_X1, p), yb = lerp(s06_THR_Y, s06_HL_Y, p);
    const N = 36, wa = amp * (1 - p);
    ctx.beginPath();
    for (let i = 0; i <= N; i++) {
      const u = i / N * fb, x = lerp(xa, xb, u), y = yb + wa * Math.sin(TAU * 1.5 * t - u * 8.5);
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
}
// screen position of the thread head (for the travelling core)
function s06_headPos(t, hp) {
  const fa = clamp(hp / s06_UA), fb = clamp((hp - s06_UA) / (1 - s06_UA));
  if (fb <= 0) { const u = fa * (s06_TA - 1), i = Math.min(s06_TA - 2, Math.floor(u)), f = u - i; return { x: lerp(s06_TPX[i], s06_TPX[i + 1], f), y: lerp(s06_TPY[i], s06_TPY[i + 1], f) }; }
  return { x: lerp(s06_THR_X0, s06_THR_X1, fb), y: s06_THR_Y };
}

// ---- cached headline halo (t-independent: both lines in accent, blurred 24 px, rendered once per size) ----
const s06_HALO = { size: 0, canvas: null, y0: 760, h: 380 };
function s06_haloCanvas(ctx, hsz, opt, P) {
  if (s06_HALO.size === hsz && s06_HALO.canvas) return s06_HALO.canvas;
  const c = makeCanvas(W, s06_HALO.h), x = c.getContext('2d');
  x.filter = 'blur(24px)';
  drawText(x, 'Ich behalte', CX, 880 - s06_HALO.y0, Object.assign({}, opt, { color: P.accent }));
  drawText(x, 'den Überblick.', CX, 1000 - s06_HALO.y0, Object.assign({}, opt, { color: P.accent }));
  s06_HALO.size = hsz; s06_HALO.canvas = c; return c;
}

SCENES.s06 = {
  draw(ctx, lt, t, dur, sc) {
    const P = T();
    lt = t - s06_START;
    // ---------------- timing scalars
    const dist = s06_dist(t);
    const ramp = ez(t, 13.2, 13.75, E.inOutQuad);             // speed-up / brightness rise
    const p = remap(t, s06_COLL0, s06_COLL1);                 // collapse into the hairline (last frames)
    const textFade = 1 - ez(t, s06_TXT0, s06_TXT1, E.inQuad); // headline/subline blur-and-fade before the collapse (never squashed)
    const hp = s06_headP(t);                                  // thread head progress 0..1
    let kick = 0; for (const k of s06_KICKS) kick += impulse(t, k, 12);
    let kickShake = 0; for (const k of s06_KICKS) kickShake = Math.max(kickShake, 3 * impulse(t, k, 12));
    FX.shake = Math.max(FX.shake, kickShake);
    if (lt < 0.1) FX.rgb = Math.max(FX.rgb, 10 * (1 - ez(lt, 0, 0.1, E.outCubic)));     // 3-frame RGB split on the slam
    FX.bloom = Math.max(FX.bloom, lerp(0.2, 0.34, ramp) * lerp(1, 0.6, p));
    s06_buildThread(t);

    // camera: zoom 1.0 → 1.05 over the scene, tiny kick punches, roll 0 → 6° over 13.2–14.0; snaps back to identity in the collapse
    const camZoom = lerp(lerp(1, 1.05, lt / 2) * (1 + 0.02 * kick), 1, p);
    const camRot = 6 * Math.PI / 180 * ez(t, 13.2, 14.0, E.inOutQuad) * (1 - p);
    const cam = { zoom: camZoom, rot: camRot, ox: s06_VP.x, oy: s06_VP.y };
    const camB = { zoom: camZoom, ox: s06_VP.x, oy: s06_VP.y };   // no roll: the type stays level while the tunnel rolls
    const frameAlpha = (1 + 0.3 * kick) * lerp(1, 1.5, ramp) * lerp(1, 0.45, p);   // capped in the collapse so the hand-over is not blown to white
    const frameLW = lerp(1, 1.6, ramp);

    // ================= layer A: tunnel (under the camera)
    withCamera(ctx, cam, () => {
      // light at the end of the tunnel
      const vpFade = (1 - p);
      radialFill(ctx, s06_VP.x, s06_VP.y, 460, [[0, rgba(P.accent, (0.16 + 0.1 * kick) * vpFade)], [0.45, rgba(P.accent, 0.05 * vpFade)], [1, rgba(P.accent, 0)]], 'lighter');
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      dot(ctx, s06_VP.x, s06_VP.y, 80, P.accent, 0.4 * vpFade);
      dot(ctx, s06_VP.x, s06_VP.y, 22 * (1 + 0.5 * kick), P.primary, 0.7 * vpFade);
      ctx.restore();

      // ---- document dots on the walls (with the thread's brightening wake)
      {
        const D = s06_DOTS, NB = 5, bk = Array.from({ length: NB }, () => []), bright = [[], [], []];
        const dNow = dist, dPast1 = dist - s06_dist(t - 0.27), dPast2 = dist - s06_dist(t - 0.53);
        const hp1 = s06_headP(t - 0.27), hp2 = s06_headP(t - 0.53);
        const fa0 = clamp(hp / s06_UA), fb0 = clamp((hp - s06_UA) / (1 - s06_UA));
        const fa1 = clamp(hp1 / s06_UA), fb1 = clamp((hp1 - s06_UA) / (1 - s06_UA));
        const fa2 = clamp(hp2 / s06_UA), fb2 = clamp((hp2 - s06_UA) / (1 - s06_UA));
        const threadOn = hp > 0;
        const dotAlpha = lerp(1, 1.4, ramp) * Math.pow(1 - p, 1.5), pg = p * s06_COLLG;
        const bandY0 = 790, bandY1 = 1200;                          // headline/subline band: no bright wake inside it
        for (let i = 0; i < D.n; i++) {
          const z = ((D.z0[i] - dNow) % s06_ZDOT + s06_ZDOT) % s06_ZDOT, s = s06_F / (z + s06_F);
          const x = s06_VP.x + D.wx[i] * s, y = s06_VP.y + D.wy[i] * s;
          if (x < -10 || x > W + 10 || y < -10 || y > H + 10) continue;
          const depth = clamp(1 - z / s06_ZDOT), a = (0.25 + 0.2 * depth) * D.br[i];
          const sz = 1.2 + 1.6 * s, yy = lerp(y, s06_HL_Y, pg);
          bk[Math.min(NB - 1, Math.floor(a / 0.45 * NB))].push(x, yy, sz);
          if (!threadOn) continue;
          // wake: nearest approach now and at two past positions (decays over 0.8 s)
          let b = clamp((60 - s06_threadDist(x, y, fa0, fb0)) / 25);
          if (b < 1) {
            const z1 = z + dPast1; if (z1 < s06_ZDOT) { const s1 = s06_F / (z1 + s06_F); b = Math.max(b, 0.66 * clamp((60 - s06_threadDist(s06_VP.x + D.wx[i] * s1, s06_VP.y + D.wy[i] * s1, fa1, fb1)) / 25)); }
            const z2 = z + dPast2; if (z2 < s06_ZDOT && b < 0.66) { const s2 = s06_F / (z2 + s06_F); b = Math.max(b, 0.33 * clamp((60 - s06_threadDist(s06_VP.x + D.wx[i] * s2, s06_VP.y + D.wy[i] * s2, fa2, fb2)) / 25)); }
          }
          if (y > bandY0 && y < bandY1) b = Math.min(b, 0.55);
          if (b > 0.03) bright[Math.min(2, Math.floor(b * 3))].push(x, yy, sz, b);
        }
        ctx.save(); ctx.globalCompositeOperation = 'lighter';
        for (let b = 0; b < NB; b++) {
          const arr = bk[b]; if (!arr.length) continue;
          ctx.fillStyle = rgba(P.secondary, 0.45 * (b + 1) / NB * dotAlpha); ctx.beginPath();
          for (let j = 0; j < arr.length; j += 3) ctx.rect(arr[j], arr[j + 1], arr[j + 2], arr[j + 2]);
          ctx.fill();
        }
        // brightened dots: primary 80% (+ a soft accent halo for the strong ones)
        for (let b = 0; b < 3; b++) {
          const arr = bright[b]; if (!arr.length) continue;
          ctx.fillStyle = rgba(P.primary, 0.8 * (b + 1) / 3 * dotAlpha); ctx.beginPath();
          for (let j = 0; j < arr.length; j += 4) { const s2 = arr[j + 2] * 1.5; ctx.rect(arr[j] - s2 * 0.25, arr[j + 1] - s2 * 0.25, s2, s2); }
          ctx.fill();
          if (b === 2) for (let j = 0; j < arr.length; j += 4) dot(ctx, arr[j] + arr[j + 2] / 2, arr[j + 1] + arr[j + 2] / 2, 9, P.accent, 0.35 * arr[j + 3] * dotAlpha);
        }
        ctx.restore();
      }

      // ---- star-field warp (virtual time = distance, so the doubling is continuous; streak length ∝ speed)
      s06_warp(ctx, dist / 1400, { cx: s06_VP.x, cy: s06_VP.y, speed: 0.5, alpha: lerp(0.45, 0.7, ramp) * (1 - p), len: lerp(1.1, 2.4, ramp), width: 1.5, maxR: 1500, color: P.primary });

      // ---- tunnel frames (crisp)
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      s06_frames(ctx, t, lt, frameLW, frameAlpha, P.primary, p, false);
      ctx.restore();
    });

    // ================= accent glow pass: frames + thread on a half-res offscreen, blurred once
    {
      const o = s06_OFFCTX; o.setTransform(0.25, 0, 0, 0.25, 0, 0); o.globalCompositeOperation = 'source-over'; o.filter = 'none'; o.globalAlpha = 1;
      o.clearRect(0, 0, W, H); o.globalCompositeOperation = 'lighter';
      withCamera(o, cam, () => { s06_frames(o, t, lt, frameLW * 1.4, lerp(0.35, 1.0, ramp) * (1 + 0.5 * kick) * lerp(1, 0.5, p), P.accent, p, true); });
      if (hp > 0) withCamera(o, camB, () => { s06_thread(o, t, hp, p, true, P); });
      const o2 = s06_OFF2CTX; o2.setTransform(1, 0, 0, 1, 0, 0); o2.globalCompositeOperation = 'source-over'; o2.filter = 'none'; o2.globalAlpha = 1;
      o2.clearRect(0, 0, W / 4, H / 4); o2.filter = 'blur(3px)'; o2.drawImage(s06_OFF, 0, 0); o2.filter = 'none';
      ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.85; ctx.drawImage(s06_OFF2, 0, 0, W, H); ctx.restore();
    }

    // ================= layer B: band, thread, text (under the same camera)
    withCamera(ctx, camB, () => {
      band(ctx, 990, 520, lerp(0.6, 0.8, ramp) * textFade);

      // ---- roter Faden (crisp) + travelling head + ping at 12.5 / arrival at 12.8
      if (hp > 0) {
        ctx.save(); ctx.globalCompositeOperation = 'lighter';
        s06_thread(ctx, t, hp, p, false, P);
        s06_thread(ctx, t, hp, p, false, P, true);
        if (hp < 1) {
          const h = s06_headPos(t, hp);
          dot(ctx, h.x, h.y, 34, P.accent, 0.9); dot(ctx, h.x, h.y, 9, P.primary, 1);
        } else {
          const ember = 0.35 + 0.25 * Math.sin(TAU * 1.5 * t);
          dot(ctx, s06_THR_X1, s06_THR_Y + 6 * ez(t, 12.78, 13.05, E.outCubic) * Math.sin(TAU * 1.5 * t - 8.5), 16, P.accent, ember * textFade);
        }
        ctx.restore();
        const ping = impulse(t, 12.5, 10);
        if (ping > 0.02) flare(ctx, s06_VP.x, s06_VP.y, { color: P.accent, size: 260, intensity: 0.8 * ping, streakLen: 2.4, streakThin: 0.03 });
            const arrive = remap(t, 12.8, 13.1);
        if (arrive > 0 && arrive < 1) burst(ctx, s06_THR_X1, s06_THR_Y, arrive, { count: 26, color: P.accent, radius: 110, seed: 6062, alpha: 0.8 });
      }

      // ---- headline "Ich behalte" / "den Überblick." — slam 1.2 → 1.0 (12.0–12.15) with accent text halo
      const HO = { family: FONTS.body, weight: 800, color: P.primary };
      let hsz = 116;
      if (measureText(ctx, 'den Überblick.', { size: hsz, family: FONTS.body, weight: 800, tracking: -0.045 * hsz }) > 900) hsz = 112;
      const hopt = Object.assign({}, HO, { size: hsz, tracking: -0.045 * hsz });
      const sp = ez(lt, 0, 0.15, E.outExpo);
      const hs = lerp(1.2, 1, sp) * (1 + 0.06 * impulse(t, 12.0, 14)) * (1 + 0.025 * impulse(t, 13.0, 14));
      if (textFade > 0.01) {
      ctx.save();
      ctx.globalAlpha = textFade;
      const outBlur = (1 - textFade) * 10;                       // blur-and-fade out (13.79–13.87), the type is never distorted
      withCamera(ctx, { zoom: hs, ox: CX, oy: 940 }, () => {
        const lines = [['Ich behalte', 880], ['den Überblick.', 1000]];
        // accent halo: glyph copy blurred 24 px at 20 %
        ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha *= 0.22 + 0.12 * kick;
        ctx.drawImage(s06_haloCanvas(ctx, hsz, hopt, P), 0, s06_HALO.y0);
        ctx.restore();
        ctx.save(); if (sp < 0.9) ctx.filter = `blur(${((1 - sp) * 6).toFixed(1)}px)`; else if (outBlur > 0.5) ctx.filter = `blur(${outBlur.toFixed(1)}px)`;
        for (const [s, y] of lines) drawText(ctx, s, CX, y, hopt);
        ctx.restore();
      });
      if (outBlur > 0.5) ctx.filter = `blur(${outBlur.toFixed(1)}px)`;
      // ---- subline — per-character rise at y=1100 (12.4–13.0)
      const sub = 'Langer Kontext. Ganze Codebasen.';
      const spp = remap(lt, 0.4, 1.0);
      if (spp > 0) drawKinetic(ctx, sub, CX, 1100, { size: 48, family: FONTS.head, weight: 500, color: rgba(P.primary, 0.8), tracking: 0.02 * 48, stagger: 0.65, ease: E.outExpo, rise: 24 }, spp, 'rise');
      ctx.restore();
      }
    });

    // ================= the hairline s07 inherits (draws in during the collapse; camera is identity by then)
    if (p > 0) {
      ctx.save(); ctx.globalAlpha = E.outCubic(p);
      hairline(ctx, s06_HL_X0, s06_HL_Y, s06_HL_X1, s06_HL_Y, 1, { color: P.primary, width: 2 });
      ctx.restore();
    }
  }
};
