// s01_s02.js — "Hallo." (0.0–2.0) + "Ich bin neu." (2.0–5.0)
// Both scenes live in one file because the vertical light-sweep reveal crosses the cut at 2.0:
// the 260 px beam travels x -260 → 1340 from 1.8 to 2.15 (easeInOutCubic); to its right s01 is drawn,
// to its left s02 is drawn (hard clip hidden inside the beam core). Everything is a pure function of the
// absolute time t; seeded tables live at module level (all names prefixed s01_s02_).
// Engine owns: fade from black 0–0.25, flash 35 % + punch at 5.0.

(function () {
  const A = () => T().accent, P = () => T().primary;
  const DEG = Math.PI / 180;
  const HEAD_S01 = 150, HEAD_S02 = 160, DOT_Y = 960;

  /* ------------------------------------------------------------ beam */
  function s01_s02_beamX(t) { return lerp(-260, 1340, E.inOutCubic(remap(t, 1.8, 2.15))); }
  function s01_s02_beam(ctx, t) {
    const bx = s01_s02_beamX(t), fade = 1 - ez(t, 2.11, 2.15, E.inQuad);
    if (fade <= 0) return;
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha *= fade;
    // wide accent halo (ellipse, soft in both axes)
    ctx.save(); ctx.translate(bx, CY); ctx.scale(250, 1500);
    let g = ctx.createRadialGradient(0, 0, 0, 0, 0, 1); g.addColorStop(0, rgba(A(), 0.24)); g.addColorStop(0.55, rgba(A(), 0.08)); g.addColorStop(1, rgba(A(), 0));
    ctx.fillStyle = g; ctx.fillRect(-1, -1, 2, 2); ctx.restore();
    // 260 px beam: primary core → accent edges
    ctx.save(); ctx.translate(bx, CY); ctx.scale(130, 1400);
    g = ctx.createRadialGradient(0, 0, 0, 0, 0, 1); g.addColorStop(0, rgba(P(), 0.95)); g.addColorStop(0.22, rgba(P(), 0.6)); g.addColorStop(0.45, rgba(A(), 0.45)); g.addColorStop(1, rgba(A(), 0));
    ctx.fillStyle = g; ctx.fillRect(-1, -1, 2, 2); ctx.restore();
    // hot hairline core
    ctx.save(); ctx.translate(bx, CY); ctx.scale(14, 1100);
    g = ctx.createRadialGradient(0, 0, 0, 0, 0, 1); g.addColorStop(0, 'rgba(255,255,255,0.9)'); g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g; ctx.fillRect(-1, -1, 2, 2); ctx.restore();
    ctx.restore();
  }

  /* ------------------------------------------------------------- s01 */
  function s01_s02_lineY(t) { return DOT_Y + 60 * E.inOutCubic(remap(t, 1.0, 1.3)); }
  function s01_s02_dotR(t) {
    let r = 3;
    for (const b of [0, 1]) {
      const d = t - b; if (d < 0) continue;
      if (d < 0.12) r += 6 * E.outCubic(d / 0.12); else if (d < 0.32) r += 6 * (1 - E.inOutCubic((d - 0.12) / 0.2));
    }
    return r;
  }
  function s01_s02_drawS01(ctx, t) {
    const cam = { zoom: lerp(1, 1.02, clamp(t / 2)) };
    withCamera(ctx, cam, c => {
      const ly = s01_s02_lineY(t);
      const bright = ez(t, 1.7, 2.0, E.inOutCubic);          // line brightens, dot glow doubles
      const glowMul = 1 + bright;
      const r = s01_s02_dotR(t);

      // heartbeat rings (1 px primary, 35 % → 0, r 0 → 420 over 0.8 s)
      for (const b of [0, 1]) {
        const d = t - b; if (d <= 0 || d >= 0.8) continue;
        const p = d / 0.8, R = 420 * E.outCubic(p);
        c.save(); c.globalAlpha *= 0.35 * (1 - p); c.strokeStyle = P(); c.lineWidth = 1; c.beginPath(); c.arc(CX, DOT_Y, R, 0, TAU); c.stroke();
        // faint accent echo trailing the ring
        c.globalAlpha = 0.18 * (1 - p); c.strokeStyle = A(); c.beginPath(); c.arc(CX, DOT_Y, R * 0.82, 0, TAU); c.stroke();
        c.restore();
      }

      // hairline 0.3–1.0 growing outward in both directions (easeInOutCubic), primary core + accent halo
      const lp = E.inOutCubic(remap(t, 0.3, 1.0));
      if (lp > 0) {
        const xl = lerp(CX, SAFE.x0, lp), xr = lerp(CX, SAFE.x1, lp);
        c.save(); c.globalCompositeOperation = 'lighter'; c.lineCap = 'round';
        c.beginPath(); c.moveTo(xl, ly); c.lineTo(xr, ly);
        c.filter = 'blur(20px)'; c.strokeStyle = rgba(A(), lerp(0.55, 0.9, bright)); c.lineWidth = 14; c.stroke();
        c.filter = 'none';
        const g = c.createLinearGradient(SAFE.x0, 0, SAFE.x1, 0);
        g.addColorStop(0, rgba(A(), 0.55)); g.addColorStop(0.3, rgba(P(), 0.95)); g.addColorStop(0.7, rgba(P(), 0.95)); g.addColorStop(1, rgba(A(), 0.55));
        c.strokeStyle = g; c.lineWidth = 2; c.globalAlpha *= lerp(0.7, 1, bright); c.stroke();
        c.restore();
        // lens-flare tips (120 px) riding the leading ends, fading out once the line is complete
        const tipA = clamp(lp * 4) * (1 - ez(t, 1.0, 1.35, E.inQuad));
        if (tipA > 0.01) {
          flare(c, xl, ly, { size: 60, intensity: 0.5 * tipA, streakLen: 2.6, streakThin: 0.06 });
          flare(c, xr, ly, { size: 60, intensity: 0.5 * tipA, streakLen: 2.6, streakThin: 0.06 });
        }
      }

      // 'Hallo.' per-character rise 1.0–1.7 (rise 40 px, blur 6 → 0), baseline ON the line
      const hp = remap(t, 1.0, 1.7);
      if (hp > 0) {
        drawKinetic(c, 'Hallo.', CX, ly - 3, {
          size: HEAD_S01, family: FONTS.body, weight: 800, tracking: -0.045 * HEAD_S01, color: P(),
          baseline: 'alphabetic', stagger: 0.42, ease: E.outExpo, rise: 40, blurIn: 6,
        }, hp, 'rise');
      }

      // accent dot + soft radial glow (accent 18 %, doubling 1.7–2.0); drawn last so it glows through the glyphs
      const gr = 190 + (r - 3) * 14;
      radialFill(c, CX, DOT_Y, gr, [[0, rgba(A(), 0.18 * glowMul)], [0.35, rgba(A(), 0.07 * glowMul)], [1, rgba(A(), 0)]], 'lighter');
      dot(c, CX, DOT_Y, r * 5, A(), 0.85);
      c.save(); c.globalCompositeOperation = 'lighter'; c.fillStyle = P(); c.beginPath(); c.arc(CX, DOT_Y, r, 0, TAU); c.fill(); c.restore();
    });
  }

  /* ------------------------------------------------------------- s02 */
  // 1500 seeded particles: base position, upward speed (~12 px/s), sine wander, size, alpha
  const PN = 1500, s01_s02_pr = rng(2201);
  const px0 = new Float32Array(PN), py0 = new Float32Array(PN), pvy = new Float32Array(PN), psz = new Float32Array(PN),
    pal = new Float32Array(PN), pph = new Float32Array(PN), pam = new Float32Array(PN), pfr = new Float32Array(PN), pacc = new Float32Array(PN);
  for (let i = 0; i < PN; i++) {
    px0[i] = s01_s02_pr() * W; py0[i] = s01_s02_pr() * H;
    pvy[i] = 12 * (0.7 + 0.6 * s01_s02_pr());
    psz[i] = 1.2 + s01_s02_pr() * 1.3;
    pal[i] = 0.10 + 0.16 * s01_s02_pr();
    pph[i] = s01_s02_pr() * TAU; pam[i] = 6 + 16 * s01_s02_pr(); pfr[i] = 0.25 + 0.45 * s01_s02_pr();
    pacc[i] = 0.55 + 0.9 * s01_s02_pr();
  }
  // pre-cut acceleration 4.5–5.0: extra upward displacement (integral of an easeInCubic speed ramp)
  function s01_s02_accel(t) { const u = remap(t, 4.5, 5.0); return 112 * u * u * u * u; }
  function s01_s02_pPos(i, t, out) {
    let y = py0[i] - pvy[i] * t - s01_s02_accel(t) * pacc[i];
    let x = px0[i] + Math.sin(t * pfr[i] + pph[i]) * pam[i];
    out.x = ((x % W) + W) % W; out.y = ((y % H) + H) % H;
  }
  const s01_s02_p0 = { x: 0, y: 0 }, s01_s02_p1 = { x: 0, y: 0 };

  // diagonal streak 3.4–4.2 (20°, 1400 × 90, accent 25 %) gliding bottom-left → top-right
  function s01_s02_streak(t) {
    const p = E.inOutCubic(remap(t, 3.4, 4.2));
    return { x: lerp(160, 920, p), y: lerp(1560, 420, p), a: win(t, 3.4, 3.55, 4.05, 4.2), ang: -20 * DEG };
  }
  function s01_s02_drawParticles(c, t) {
    const st = s01_s02_streak(t), nx = -Math.sin(st.ang), ny = Math.cos(st.ang), dx = Math.cos(st.ang), dy = Math.sin(st.ang);
    const trail = t > 4.52;
    c.save(); c.globalCompositeOperation = 'lighter'; c.fillStyle = P(); c.strokeStyle = P(); c.lineCap = 'round';
    for (let i = 0; i < PN; i++) {
      s01_s02_pPos(i, t, s01_s02_p0);
      const x = s01_s02_p0.x, y = s01_s02_p0.y;
      let al = pal[i] * (0.8 + 0.2 * Math.sin(t * 1.7 + pph[i]));
      if (st.a > 0) { // brighten within 80 px of the streak
        const rx = x - st.x, ry = y - st.y, d = Math.abs(rx * nx + ry * ny), along = Math.abs(rx * dx + ry * dy);
        if (d < 80 && along < 700) al = lerp(al, 0.6, (1 - d / 80) * st.a * (1 - along / 700 * 0.5));
      }
      const s = psz[i];
      if (trail) {
        s01_s02_pPos(i, t - 2 / FPS, s01_s02_p1);
        const ty = s01_s02_p1.y, len = ty - y;
        if (len > 1.5 && len < H * 0.5) { c.globalAlpha = al * 0.7; c.lineWidth = s; c.beginPath(); c.moveTo(x, ty); c.lineTo(x, y); c.stroke(); }
      }
      c.globalAlpha = al; c.fillRect(x - s / 2, y - s / 2, s, s);
    }
    c.restore();
  }
  function s01_s02_drawStreak(c, t) {
    const st = s01_s02_streak(t); if (st.a <= 0) return;
    c.save(); c.globalCompositeOperation = 'lighter'; c.globalAlpha *= st.a;
    c.translate(st.x, st.y); c.rotate(st.ang);
    c.save(); c.scale(700, 45);
    let g = c.createRadialGradient(0, 0, 0, 0, 0, 1); g.addColorStop(0, rgba(A(), 0.25)); g.addColorStop(0.5, rgba(A(), 0.12)); g.addColorStop(1, rgba(A(), 0));
    c.fillStyle = g; c.fillRect(-1, -1, 2, 2); c.restore();
    c.save(); c.scale(600, 10);
    g = c.createRadialGradient(0, 0, 0, 0, 0, 1); g.addColorStop(0, rgba(P(), 0.22)); g.addColorStop(1, rgba(P(), 0));
    c.fillStyle = g; c.fillRect(-1, -1, 2, 2); c.restore();
    c.restore();
  }

  // headline 'Ich bin' / 'neu.' — already in place, revealed by the beam with a 60 ms accent rim per glyph
  function s01_s02_headline(c, t) {
    const size = HEAD_S02, em = lerp(-0.045, -0.06, E.inCubic(remap(t, 4.5, 5.0))), tr = size * em;
    const bx = t < 2.15 ? s01_s02_beamX(t) : 1e9;
    const lines = [['Ich bin', 880], ['neu.', 1040]];
    for (const [str, y] of lines) {
      c.save();
      if (str === 'neu.') { const sc = lerp(1.08, 1, E.outBack(remap(t, 2.5, 2.72))); c.translate(CX, y); c.scale(sc, sc); c.translate(-CX, -y); }
      const L = layoutChars(c, str, { size, family: FONTS.body, weight: 800, tracking: tr });
      c.font = font(size, FONTS.body, 800); c.textBaseline = 'middle'; c.textAlign = 'left';
      const x0 = CX - L.width / 2;
      for (const ch of L.chars) {
        if (ch.ch === ' ') continue;
        const gx = x0 + ch.x, behind = bx - (gx + ch.w / 2);   // px the beam centre is past this glyph
        if (behind < -ch.w) continue;                          // still ahead of the beam (clipped anyway)
        const rim = clamp(1 - behind / 280);                    // ≈ 60 ms at the beam's speed
        if (rim > 0) { c.fillStyle = A(); c.globalAlpha = 1; c.fillText(ch.ch, gx, y); }
        c.globalAlpha = 1 - rim * 0.92; c.fillStyle = P(); c.fillText(ch.ch, gx, y);
      }
      c.restore();
    }
  }

  const SUB = 'Anthropics neuestes Claude-Modell.', TAG = 'Claude 5 · Mythos-Klasse';
  let s01_s02_subSize = 0;
  function s01_s02_subline(c, t) {
    const sp = E.inOutCubic(remap(t, 2.9, 3.3)); if (sp <= 0) return;
    // fit to 840 px so the s02 camera zoom (1.04) + 12 px drift keeps it inside the 90..990 safe area
    if (!s01_s02_subSize) { let s = 52; while (s > 46 && measureText(c, SUB, { size: s, family: FONTS.head, weight: 500, tracking: 0.02 * s }) > 840) s--; s01_s02_subSize = s; }
    const size = s01_s02_subSize, o = { size, family: FONTS.head, weight: 500, tracking: 0.02 * size, color: rgba(P(), 0.8) };
    const w = measureText(c, SUB, o) + 24, y = 1160;
    c.save(); c.beginPath(); c.rect(CX - w / 2 * sp, y - 50, w * sp, 100); c.clip(); drawText(c, SUB, CX, y, o); c.restore();
    if (sp < 1) { // hot accent edges on the wipe fronts
      for (const sg of [-1, 1]) {
        const ex = CX + sg * w / 2 * sp;
        c.save(); c.globalCompositeOperation = 'lighter'; c.globalAlpha *= 0.8 * (1 - sp * sp);
        c.translate(ex, y); c.scale(14, 60);
        const g = c.createRadialGradient(0, 0, 0, 0, 0, 1); g.addColorStop(0, rgba(P(), 0.9)); g.addColorStop(0.35, rgba(A(), 0.5)); g.addColorStop(1, rgba(A(), 0));
        c.fillStyle = g; c.fillRect(-1, -1, 2, 2); c.restore();
      }
    }
  }
  function s01_s02_tag(c, t) {
    const e = E.outCubic(remap(t, 4.0, 4.3)); if (e <= 0) return;
    const size = 44, tr = 0.12 * size, y = 1260 + 14 * (1 - e);
    c.save(); c.globalAlpha *= e;
    const L = layoutChars(c, TAG, { size, family: FONTS.mono, weight: 500, tracking: tr });
    c.font = font(size, FONTS.mono, 500); c.textBaseline = 'middle'; c.textAlign = 'left';
    const x0 = CX - L.width / 2;
    for (const ch of L.chars) { if (ch.ch === ' ') continue; c.fillStyle = ch.ch === '·' ? A() : rgba(P(), 0.7); c.fillText(ch.ch, x0 + ch.x, y); }
    c.restore();
  }

  function s01_s02_drawS02(ctx, t) {
    const p = clamp((t - 2) / 3);
    const cam = { zoom: lerp(1.02, 1.04, p), x: lerp(-12, 12, p), rot: lerp(0.25, -0.25, p) * DEG };
    withCamera(ctx, cam, c => {
      s01_s02_drawParticles(c, t);
      // warm afterglow the beam leaves behind the headline (braam tail), decaying over ~1 s
      const ag = 0.14 * impulse(t, 2.0, 3.2) * clamp((t - 1.85) * 8);
      if (ag > 0.004) radialFill(c, CX, 960, 720, [[0, rgba(A(), ag)], [0.45, rgba(A(), ag * 0.35)], [1, rgba(A(), 0)]], 'lighter');
      s01_s02_drawStreak(c, t);
      s01_s02_headline(c, t);
      s01_s02_subline(c, t);
      s01_s02_tag(c, t);
    });
  }

  /* ------------------------------------------------------- composite */
  function s01_s02_draw(ctx, t) {
    if (t < 1.8) { s01_s02_drawS01(ctx, t); return; }
    if (t >= 2.15) { s01_s02_drawS02(ctx, t); return; }
    const bx = s01_s02_beamX(t);
    ctx.save(); ctx.beginPath(); ctx.rect(bx, -10, W - bx + 20, H + 20); ctx.clip(); s01_s02_drawS01(ctx, t); ctx.restore();
    ctx.save(); ctx.beginPath(); ctx.rect(-10, -10, bx + 10, H + 20); ctx.clip(); s01_s02_drawS02(ctx, t); ctx.restore();
    s01_s02_beam(ctx, t);
    FX.bloom = Math.max(FX.bloom, 0.32 * win(t, 1.8, 1.9, 2.05, 2.15));
  }
  SCENES.s01 = { draw(ctx, lt, t) { s01_s02_draw(ctx, t); } };
  SCENES.s02 = { draw(ctx, lt, t) { s01_s02_draw(ctx, t); } };
})();
