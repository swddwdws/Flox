// s05.js — "Ich handle." (10.0–12.0) — agent loop: light streaks collapse into three tilted 3D rings,
// PLAN/TOOL/RUN/VERIFY label cycle, check mark at 11.5, rings turn frontal and fly past the viewer into s06's tunnel.
// Everything is a pure function of t. All module-level helpers/constants are prefixed s05_.

const s05_START = 10.0;
const s05_RC = { x: 540, y: 760 };           // ring centre (drifts to s06's vanishing point y=860 during the fly-through)
const s05_KICKS = [10.0, 10.5, 11.0, 11.5];
const s05_LABELS = ['PLAN', 'TOOL', 'RUN', 'VERIFY'];
// label events: [time, label index]. Cycle 1 every 8th, cycle 2 every 16th, 11.5 = final VERIFY lock + check mark
const s05_EVENTS = [[10.0, 0], [10.25, 1], [10.5, 2], [10.75, 3], [11.0, 0], [11.125, 1], [11.25, 2], [11.375, 3], [11.5, 3]];
// screen angles of the four labels (12 / 3 / 6 / 9 o'clock)
const s05_LABEL_ANG = [-Math.PI / 2, 0, Math.PI / 2, Math.PI];
// three rings: radius, tilt X / Y / Z (rad), spin (rad/s), precession of the tilt frame (rad/s)
const s05_RINGS = [
  { r: 260, tx: 65 * Math.PI / 180, ty: 0, tz: 0, spin: 0.8, prec: 0.35, seg: 96, fly: 3.0 },
  { r: 340, tx: 0, ty: 40 * Math.PI / 180, tz: 0, spin: -0.6, prec: -0.28, seg: 112, fly: 4.0 },
  { r: 420, tx: 18 * Math.PI / 180, ty: 0, tz: 20 * Math.PI / 180, spin: 1.1, prec: 0.2, seg: 128, fly: 4.6 },
];
// seeded vertical light streaks (the accelerated code stream of s04)
const s05_STREAKS = (() => {
  const r = rng(505), arr = [];
  for (let i = 0; i < 28; i++) {
    arr.push({ x: 70 + r() * 940, y0: r() * H, len: 420 + r() * 520, w: 1 + r() * 1.6, a: 0.45 + r() * 0.45, ring: i % 3, ang: r() * TAU, speed: 2200 + r() * 700 });
  }
  return arr;
})();
const s05_DUST = new Particles({ seed: 5051, count: 160, size: [1.5, 4.5], vel: { x: 0, y: -26 }, area: { x0: 40, y0: 200, x1: W - 40, y1: 1300 }, color: '#FF8A3D', alpha: 0.35, drift: 24, twinkle: 2.2 });
const s05_WARP = new Warp({ seed: 5052, count: 260, color: '#F5F2EC', speed: 1.4 });
// half-resolution offscreen canvas: the ring glow is drawn here once and blitted with a single blur (instead of one blur per stroke)
const s05_OFFS = 0.25;   // offscreen scale (quarter resolution)
const s05_OFF = makeCanvas(W * s05_OFFS, H * s05_OFFS);
const s05_OFFCTX = s05_OFF.getContext('2d');
const s05_OFF2 = makeCanvas(W * s05_OFFS, H * s05_OFFS);
const s05_OFF2CTX = s05_OFF2.getContext('2d');
// cheap soft ring (layered alpha instead of a blur filter) for the 11.5 ping
function s05_softRing(ctx, x, y, life, radius, color, width, alpha) {
  if (life <= 0 || life >= 1) return;
  const R = radius * E.outCubic(life), a = (1 - life) * alpha, w = width * (1 - life * 0.7);
  ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.strokeStyle = color;
  for (let i = 0; i < 4; i++) { ctx.lineWidth = w * (1 + i * 1.6); ctx.globalAlpha = a * (i === 0 ? 0.38 : 0.16 / (i)); ctx.beginPath(); ctx.arc(x, y, R, 0, TAU); ctx.stroke(); }
  ctx.restore();
}

// ---- 3D ring geometry ------------------------------------------------------
// returns projected point {x,y,s} for parametric angle a on ring k at time t.
// tiltAmt 1 → full tilt, 0 → frontal; q 0 → circle, 1 → 9:16 rectangle (morph into s06's tunnel frames); rs = radius scale
function s05_ringPoint(k, a, t, tiltAmt, q, rs, cx, cy) {
  const R = s05_RINGS[k], r = R.r * (typeof rs === 'number' ? rs : rs.base * lerp(1, R.fly, rs.fly));
  let ca = Math.cos(a), sa = Math.sin(a), x = ca * r, y = sa * r;
  if (q > 0) { // ray/rect intersection for a 9:16 frame of similar size
    const hw = r * 0.62, hh = r * 1.10, kx = Math.abs(ca) > 1e-4 ? hw / Math.abs(ca) : 1e9, ky = Math.abs(sa) > 1e-4 ? hh / Math.abs(sa) : 1e9, kk = Math.min(kx, ky);
    x = lerp(x, ca * kk, q); y = lerp(y, sa * kk, q);
  }
  const tx = R.tx * tiltAmt, ty = R.ty * tiltAmt, tz = (R.tz + R.prec * (t - s05_START)) * (1 - q);
  // tilt about X
  let y1 = y * Math.cos(tx), z1 = y * Math.sin(tx);
  // tilt about Y
  let x2 = x * Math.cos(ty) + z1 * Math.sin(ty), z2 = -x * Math.sin(ty) + z1 * Math.cos(ty);
  // rotate about Z (in-plane + precession)
  const c = Math.cos(tz), s = Math.sin(tz);
  const x3 = x2 * c - y1 * s, y3 = x2 * s + y1 * c;
  return project(x3, y3, z2, { f: 900, cx, cy });
}
function s05_rsMul(rs, m) { return typeof rs === 'number' ? rs * m : { base: rs.base * m, fly: rs.fly }; }
function s05_depthAlpha(s) { return clamp(lerp(0.35, 1.0, (s - 0.68) / (1.9 - 0.68))); }

// draw the three rings (lines + ticks + head points). alphaMul scales everything.
// Segments are batched into a few alpha buckets so each ring costs ~12 stroke() calls instead of ~170.
const s05_NB = 6;
function s05_strokeBuckets(ctx, buckets, color, baseAlpha) {
  for (let b = 0; b < s05_NB; b++) {
    const seg = buckets[b]; if (!seg.length) continue;
    ctx.strokeStyle = rgba(color, baseAlpha * (b + 1) / s05_NB); ctx.beginPath();
    for (let i = 0; i < seg.length; i += 4) { ctx.moveTo(seg[i], seg[i + 1]); ctx.lineTo(seg[i + 2], seg[i + 3]); }
    ctx.stroke();
  }
}
function s05_drawRings(ctx, t, tiltAmt, q, rs, cx, cy, alphaMul, lw, tickMul = 1) {
  const P = T();
  for (let k = 0; k < 3; k++) {
    const R = s05_RINGS[k], n = R.seg, spin = R.spin * (t - s05_START);
    const line = Array.from({ length: s05_NB }, () => []), tick = Array.from({ length: s05_NB }, () => []), tickL = Array.from({ length: s05_NB }, () => []);
    // ring line with depth-based alpha
    let prev = s05_ringPoint(k, 0, t, tiltAmt, q, rs, cx, cy);
    for (let i = 1; i <= n; i++) {
      const a = i / n * TAU, p = s05_ringPoint(k, a, t, tiltAmt, q, rs, cx, cy);
      const da = s05_depthAlpha((prev.s + p.s) * 0.5), b = Math.min(s05_NB - 1, Math.floor(da * s05_NB));
      line[b].push(prev.x, prev.y, p.x, p.y);
      prev = p;
    }
    ctx.lineWidth = lw; s05_strokeBuckets(ctx, line, P.primary, 0.6 * alphaMul);
    // 40 tick marks (spin with the ring)
    if (tickMul > 0.01) {
      for (let i = 0; i < 40; i++) {
        const a = i / 40 * TAU + spin, long = i % 10 === 0;
        const p0 = s05_ringPoint(k, a, t, tiltAmt, q, s05_rsMul(rs, 1 - 0.012), cx, cy), p1 = s05_ringPoint(k, a, t, tiltAmt, q, s05_rsMul(rs, long ? 1.045 : 1.028), cx, cy);
        const da = s05_depthAlpha(p0.s), b = Math.min(s05_NB - 1, Math.floor(da * s05_NB));
        (long ? tickL : tick)[b].push(p0.x, p0.y, p1.x, p1.y);
      }
      ctx.lineWidth = Math.max(1, lw * 0.75);
      s05_strokeBuckets(ctx, tick, P.primary, 0.32 * alphaMul * tickMul);
      s05_strokeBuckets(ctx, tickL, P.primary, 0.55 * alphaMul * tickMul);
    }
    // bright head point
    const hp = s05_ringPoint(k, spin, t, tiltAmt, q, rs, cx, cy);
    dot(ctx, hp.x, hp.y, 22 * hp.s, P.accent, 0.8 * alphaMul);
    dot(ctx, hp.x, hp.y, 7 * hp.s, P.primary, 1.0 * alphaMul);
  }
}
// data pulse: 3 trailing dashes along the outer ring (glowPass=true draws the fat soft version for the blurred offscreen)
function s05_drawPulse(ctx, aParam, t, tiltAmt, q, rs, cx, cy, glowPass) {
  const P = T();
  ctx.lineWidth = glowPass ? 16 : 4;
  for (let d = 0; d < 3; d++) {
    const span = 0.22, aa = aParam - d * 0.16;
    ctx.strokeStyle = rgba(P.accent, (glowPass ? 0.8 : 0.95) * (1 - d * 0.3));
    ctx.beginPath();
    for (let i = 0; i <= 10; i++) { const p = s05_ringPoint(2, aa - span + span * i / 10, t, tiltAmt, q, rs, cx, cy); if (i === 0) ctx.moveTo(p.x, p.y); else ctx.lineTo(p.x, p.y); }
    ctx.stroke();
  }
}

// label centres: top/bottom at radius 470, left/right pulled inside the safe area
function s05_labelPos(ctx, i) {
  const size = 44, w = measureText(ctx, s05_LABELS[i], { size, family: FONTS.mono, weight: 500, tracking: 2 });
  if (i === 0) return { x: 540, y: 290, w };
  if (i === 2) return { x: 540, y: 1230, w };
  if (i === 1) return { x: 975 - w / 2, y: 760, w };
  return { x: 105 + w / 2, y: 760, w };
}

SCENES.s05 = {
  draw(ctx, lt, t, dur, sc) {
    const P = T();
    lt = t - s05_START;
    // ---------------- timing scalars
    const collapse = ez(lt, 0, 0.2, E.outCubic);                 // streaks → rings
    const flyP = remap(lt, 1.7, 2.0);                            // 11.7–12.0 fly-through
    const tiltAmt = 1 - ez(lt, 1.7, 1.9, E.inOutCubic);          // rings turn frontal
    const rectQ = ez(lt, 1.75, 2.0, E.inOutQuad);                // circle → 9:16 frame
    const rs = { base: lerp(1.5, 1, collapse), fly: E.inCubic(flyP) };   // per-ring expansion ×3.0 / ×4.0 / ×4.6 during the fly-through
    const rcx = s05_RC.x, rcy = lerp(s05_RC.y, 860, ez(lt, 1.7, 2.0, E.inOutQuad));
    let kick = 0; for (const k of s05_KICKS) kick += impulse(t, k, 14);
    let kickShake = 0; for (const k of s05_KICKS) kickShake = Math.max(kickShake, 3 * impulse(t, k, 12));
    FX.shake = Math.max(FX.shake, kickShake);
    if (lt < 0.1) FX.rgb = Math.max(FX.rgb, 10 * (1 - ez(lt, 0, 0.1, E.outCubic)));   // 3-frame RGB split on the headline slam
    const textFade = 1 - ez(lt, 1.86, 2.0, E.inQuad);
    const hudFade = 1 - ez(lt, 1.8, 2.0, E.inQuad);

    // active label state
    let active = -1, activeT0 = 0, prevIdx = -1, prevT0 = 0, nextIdx = -1, nextT = 0;
    for (let i = 0; i < s05_EVENTS.length; i++) {
      const [et, li] = s05_EVENTS[i];
      if (t >= et - 1e-6) { prevIdx = active; prevT0 = activeT0; active = li; activeT0 = et; nextIdx = i + 1 < s05_EVENTS.length ? s05_EVENTS[i + 1][1] : -1; nextT = i + 1 < s05_EVENTS.length ? s05_EVENTS[i + 1][0] : 12.0; }
    }

    // camera: kick zoom punches, slow roll -1.5 → +1.5 deg, 11.7–12.0 zoom 1.0 → 1.15 through the ring centre
    const camZoom = (1 + 0.03 * kick) * lerp(1, 1.15, E.inQuad(flyP));
    const camRot = lerp(-1.5, 1.5, lt / 2) * Math.PI / 180 * (1 - rectQ);   // unwinds so the final frames are axis-aligned for s06
    withCamera(ctx, { zoom: camZoom, rot: camRot, ox: rcx, oy: rcy }, () => {
      // ---------------- ambient: soft accent glow behind the centre + dust
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      dot(ctx, rcx, rcy, 640, P.accent, 0.22 + 0.12 * kick);
      dot(ctx, rcx, rcy, 300, P.accent, 0.14 + 0.1 * kick);
      ctx.restore();
      s05_DUST.draw(ctx, t, { alpha: 0.35 * hudFade, zoom: 1 + 0.35 * E.inCubic(flyP) });

      // ---------------- HUD guide ring (secondary structure) + label ticks
      if (hudFade > 0.01) {
        ctx.save(); ctx.globalAlpha = hudFade * clamp(collapse * 1.5);
        rings(ctx, rcx, s05_RC.y, t, { radius: 470, count: 1, color: P.secondary, alpha: 0.28, speed: 0.35 });
        ctx.restore();
      }

      // ---------------- light streaks collapsing into the rings (10.0–10.2)
      if (collapse < 1) {
        ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.lineCap = 'round';
        for (const S of s05_STREAKS) {
          const ys = ((S.y0 - S.speed * lt) % (H + 800) + (H + 800)) % (H + 800) - 400;   // scrolling upward
          const tp = s05_ringPoint(S.ring, S.ang, t, 1, 0, rs, rcx, rcy);
          const cxs = lerp(S.x, tp.x, collapse), cys = lerp(ys, tp.y, collapse), len = lerp(S.len, 26, collapse), al = S.a * (1 - collapse * collapse);
          const g = ctx.createLinearGradient(0, cys - len / 2, 0, cys + len / 2);
          g.addColorStop(0, rgba(P.primary, 0)); g.addColorStop(0.5, rgba(P.primary, al)); g.addColorStop(1, rgba(P.primary, 0));
          ctx.strokeStyle = g; ctx.lineWidth = S.w * 4; ctx.globalAlpha = 0.35;
          ctx.beginPath(); ctx.moveTo(cxs, cys - len / 2); ctx.lineTo(cxs, cys + len / 2); ctx.stroke();
          ctx.lineWidth = S.w; ctx.globalAlpha = 1;
          ctx.beginPath(); ctx.moveTo(cxs, cys - len / 2); ctx.lineTo(cxs, cys + len / 2); ctx.stroke();
        }
        ctx.restore();
      }

      // ---------------- forward whoosh during the fly-through
      if (flyP > 0) s05_WARP.draw(ctx, t, { cx: rcx, cy: rcy, speed: 1.4, alpha: 0.4 * E.inQuad(flyP), len: 1.4, width: 1.6, maxR: 1400 });

      // ---------------- data pulse angle (outer ring, from the active label to the next)
      let pulseA = null;
      if (active >= 0 && nextIdx >= 0 && flyP <= 0 && collapse > 0.5) {
        const pp = remap(t, activeT0, nextT), R = s05_RINGS[2];
        let a0 = s05_LABEL_ANG[active], a1 = s05_LABEL_ANG[nextIdx]; if (a1 <= a0) a1 += TAU;
        const aScreen = lerp(a0, a1, E.inOutQuad(pp));
        pulseA = aScreen - R.tz - R.prec * lt;   // undo the in-plane rotations (tilt is small on the outer ring)
      }

      // ---------------- the three rings (with 3-frame alpha trails during the fly-through)
      const ringAlpha = clamp(collapse * 1.4) * (1 + 0.5 * impulse(t, 11.5, 10));
      const lw = lerp(2, 3.2, flyP);
      const tickMul = 1 - ez(lt, 1.72, 1.9, E.inQuad);
      ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.lineCap = 'round';
      if (flyP > 0) {
        for (let k = 3; k >= 1; k--) {
          const tt = t - k / 30, ltt = tt - s05_START; if (ltt < 1.7) continue;
          const fp = remap(ltt, 1.7, 2.0), ta = 1 - ez(ltt, 1.7, 1.9, E.inOutCubic), rq = ez(ltt, 1.75, 2.0, E.inOutQuad), rss = { base: 1, fly: E.inCubic(fp) };
          const ccy = lerp(s05_RC.y, 860, ez(ltt, 1.7, 2.0, E.inOutQuad));
          s05_drawRings(ctx, tt, ta, rq, rss, rcx, ccy, ringAlpha * (0.38 / k), lw * 0.8, 0);
        }
      }
      // glow pass: rings (+ pulse) drawn once on a quarter-res offscreen canvas, blurred there (3.5 px = 14 px effective), blitted once
      {
        const o = s05_OFFCTX; o.setTransform(s05_OFFS, 0, 0, s05_OFFS, 0, 0); o.globalCompositeOperation = 'source-over'; o.filter = 'none'; o.globalAlpha = 1;
        o.clearRect(0, 0, W, H); o.globalCompositeOperation = 'lighter'; o.lineCap = 'round';
        s05_drawRings(o, t, tiltAmt, rectQ, rs, rcx, rcy, ringAlpha, lw * 4, tickMul);
        if (pulseA != null) s05_drawPulse(o, pulseA, t, tiltAmt, rectQ, rs, rcx, rcy, true);
        const o2 = s05_OFF2CTX; o2.setTransform(1, 0, 0, 1, 0, 0); o2.globalCompositeOperation = 'source-over'; o2.filter = 'none'; o2.globalAlpha = 1;
        o2.clearRect(0, 0, W * s05_OFFS, H * s05_OFFS); o2.filter = 'blur(3.5px)'; o2.drawImage(s05_OFF, 0, 0); o2.filter = 'none';
        ctx.save(); ctx.globalAlpha = 0.9; ctx.drawImage(s05_OFF2, 0, 0, W, H); ctx.restore();
      }
      // crisp pass
      s05_drawRings(ctx, t, tiltAmt, rectQ, rs, rcx, rcy, ringAlpha, lw, tickMul);
      if (pulseA != null) {
        s05_drawPulse(ctx, pulseA, t, tiltAmt, rectQ, rs, rcx, rcy, false);
        const hp = s05_ringPoint(2, pulseA, t, tiltAmt, rectQ, rs, rcx, rcy);
        dot(ctx, hp.x, hp.y, 16, P.accent, 0.9); dot(ctx, hp.x, hp.y, 6, P.primary, 1);
      }
      ctx.restore();

      // ---------------- core (pulses on every kick) + check mark at 11.5
      {
        const coreFade = 1 - ez(lt, 1.8, 2.0, E.inQuad);
        const cr = 18 * (1 + 0.7 * kick) * lerp(1, 1.6, E.inQuad(flyP));
        ctx.save(); ctx.globalCompositeOperation = 'lighter';
        dot(ctx, rcx, rcy, cr * 4.5, P.accent, (0.35 + 0.35 * kick) * coreFade);
        dot(ctx, rcx, rcy, cr * 1.9, P.primary, 0.9 * coreFade);
        ctx.fillStyle = rgba(P.primary, coreFade); ctx.beginPath(); ctx.arc(rcx, rcy, cr * 0.5, 0, TAU); ctx.fill();
        ctx.restore();
        // check mark: 2 segments, 140 ms path-length animation, accent, blur 12, plus a bright ping
        if (t >= 11.5) {
          const cp = ez(t, 11.5, 11.64, E.outCubic) * 1;
          const S = 1.9, pts = [[-26 * S, 0], [-8 * S, 17 * S], [30 * S, -22 * S]];
          const L1 = Math.hypot(pts[1][0] - pts[0][0], pts[1][1] - pts[0][1]), L2 = Math.hypot(pts[2][0] - pts[1][0], pts[2][1] - pts[1][1]), Ltot = L1 + L2, drawn = cp * Ltot;
          const punch = 1 + 0.25 * impulse(t, 11.5, 10);
          ctx.save(); ctx.translate(rcx, rcy + 4); ctx.scale(punch, punch); ctx.globalAlpha = coreFade; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
          const checkPath = c => {
            c.beginPath(); c.moveTo(pts[0][0], pts[0][1]);
            if (drawn <= L1) { const f = drawn / L1; c.lineTo(lerp(pts[0][0], pts[1][0], f), lerp(pts[0][1], pts[1][1], f)); }
            else { c.lineTo(pts[1][0], pts[1][1]); const f = clamp((drawn - L1) / L2); c.lineTo(lerp(pts[1][0], pts[2][0], f), lerp(pts[1][1], pts[2][1], f)); }
          };
          ctx.save(); ctx.globalCompositeOperation = 'lighter';
          for (let g = 3; g >= 0; g--) { ctx.strokeStyle = rgba(P.accent, g === 0 ? 0.95 : 0.14); ctx.lineWidth = 7 + g * 11; checkPath(ctx); ctx.stroke(); }
          ctx.restore();
          ctx.strokeStyle = rgba(P.primary, 0.9); ctx.lineWidth = 2.5;
          ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]);
          if (drawn <= L1) { const f = drawn / L1; ctx.lineTo(lerp(pts[0][0], pts[1][0], f), lerp(pts[0][1], pts[1][1], f)); }
          else { ctx.lineTo(pts[1][0], pts[1][1]); const f = clamp((drawn - L1) / L2); ctx.lineTo(lerp(pts[1][0], pts[2][0], f), lerp(pts[1][1], pts[2][1], f)); }
          ctx.stroke();
          ctx.restore();
          // ping
          const ping = impulse(t, 11.5, 9);
          if (ping > 0.02) flare(ctx, rcx, rcy, { color: P.accent, size: 320, intensity: 0.9 * ping, streakLen: 2.6, streakThin: 0.03 });
          s05_softRing(ctx, rcx, rcy, remap(t, 11.5, 11.95), 700, P.accent, 10, 0.7);
        }
      }

      // ---------------- HUD corner brackets (draw on from 10.0–10.15)
      if (hudFade > 0.01) {
        brackets(ctx, 110, 320, 860, 880, ez(lt, 0, 0.15, E.outCubic), { len: 64, color: rgba(P.primary, 0.5 * hudFade), width: 2 });
      }

      // ---------------- legibility band behind the headline
      band(ctx, 1345, 230, 0.6 * textFade);

      // ---------------- labels PLAN / TOOL / RUN / VERIFY
      if (hudFade > 0.01) {
        for (let i = 0; i < 4; i++) {
          const lp = s05_labelPos(ctx, i);
          const isActive = i === active;
          // afterglow: recently deactivated label fades from accent back to idle
          let idleCol = rgba(P.primary, 0.45);
          if (!isActive && i === prevIdx) { const af = 1 - ez(t, activeT0, activeT0 + 0.3, E.outCubic); idleCol = mixColor(P.accent, P.primary, 1 - af * 0.8); }
          if (isActive) {
            // a re-trigger of the same label (VERIFY at 11.375 → 11.5) keeps the lit pill instead of regrowing it
            const growT0 = prevIdx === active ? prevT0 : activeT0;
            const p = ez(t, growT0, growT0 + 0.12, E.outBack);
            const rep = impulse(t, activeT0, 12);
            const sweep = remap(t, activeT0 + 0.05, activeT0 + 0.3);
            // idle text stays visible while the pill is still small (p = 0 exactly on the beat frame → no one-frame gap)
            if (p < 0.3) drawText(ctx, s05_LABELS[i], lp.x, lp.y, { size: 44, family: FONTS.mono, weight: 500, color: idleCol, tracking: 2, alpha: hudFade * clamp(collapse * 2) * (1 - p / 0.3) });
            ctx.save(); ctx.globalAlpha = hudFade; ctx.translate(lp.x, lp.y); ctx.scale(1 + 0.12 * rep, 1 + 0.12 * rep); ctx.translate(-lp.x, -lp.y);
            { const pw = lp.w + 52, gp = clamp(p * 2); ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha *= 0.55 * gp; ctx.translate(lp.x, lp.y); ctx.scale(pw / 72, 1); dot(ctx, 0, 0, 92, P.accent, 1); ctx.restore(); }
            pill(ctx, s05_LABELS[i], lp.x, lp.y, { size: 44, family: FONTS.mono, weight: 600, padX: 26, h: 72, color: P.accent, textColor: '#141210', tracking: 2, glow: false }, p, sweep);
            ctx.restore();
            // 40-particle spark puff
            const life = remap(t, activeT0, activeT0 + 0.38);
            if (life > 0 && life < 1) burst(ctx, lp.x, lp.y, life, { count: 40, color: P.accent, radius: 170, seed: 500 + i * 7 + Math.round(activeT0 * 8), alpha: 0.9 * hudFade });
          } else {
            drawText(ctx, s05_LABELS[i], lp.x, lp.y, { size: 44, family: FONTS.mono, weight: 500, color: idleCol, tracking: 2, alpha: hudFade * clamp(collapse * 2) });
          }
        }
      }

      // ---------------- headline "Ich handle." — slam 1.25 → 1.0 (10.0–10.15)
      if (textFade > 0.01) {
        const sp = ez(lt, 0, 0.15, E.outExpo);
        const hs = lerp(1.25, 1, sp) * (1 + 0.06 * impulse(t, 10.0, 14));
        withCamera(ctx, { zoom: hs, ox: CX, oy: 1330 }, () => {
          ctx.save(); ctx.globalAlpha = textFade;
          const ho = { size: 140, family: FONTS.body, weight: 800, color: P.primary, tracking: -0.045 * 140 };
          if (sp < 0.9) { // motion ghosts on the slam (cheaper than a blur filter)
            const gd = (1 - sp) * 14; ctx.save(); ctx.globalAlpha *= 0.35; drawText(ctx, 'Ich handle.', CX, 1330 - gd, ho); drawText(ctx, 'Ich handle.', CX, 1330 + gd, ho); ctx.restore();
          }
          drawText(ctx, 'Ich handle.', CX, 1330, ho);
          ctx.restore();
        });
        // subline — slide-mask reveal left → right at y=1440 (10.5–10.8)
        const sub = 'Planen. Ausführen. Verifizieren.';
        const so = { size: 48, family: FONTS.head, weight: 500, color: rgba(P.primary, 0.8), tracking: 0.02 * 48 };
        const spp = remap(lt, 0.5, 0.8), se = E.outCubic(spp);
        if (spp > 0) {
          const w = measureText(ctx, sub, so), x0 = CX - w / 2;
          ctx.save(); ctx.globalAlpha = textFade; ctx.translate((1 - se) * -28, 0);
          ctx.beginPath(); ctx.rect(x0 - 20, 1400, (w + 40) * se, 80); ctx.clip();
          drawText(ctx, sub, CX, 1440, so);
          ctx.restore();
          if (spp < 1) { // leading accent edge
            const ex = x0 - 20 + (w + 40) * se + (1 - se) * -28;
            ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = (1 - spp) * textFade;
            ctx.filter = 'blur(6px)'; ctx.fillStyle = P.accent; ctx.fillRect(ex - 6, 1404, 12, 72);
            ctx.filter = 'none'; ctx.fillStyle = P.primary; ctx.fillRect(ex - 1.5, 1408, 3, 64);
            ctx.restore();
          }
        }
      }
    });
  }
};
