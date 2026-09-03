// s10_s11.js — s10 name reveal (22-26 s) and s11 end card (26-30 s); one continuous world (motes, glow, constellation).
const s10_C = { x: 540, y: 960 };
const s10_MOTES = new Particles({ seed: 1010, count: 400, size: [3, 9], vel: { x: 0, y: -22 }, color: '#FF8A3D', alpha: 0.12, drift: 40, twinkle: 0.8, area: { x0: -60, y0: -60, x1: W + 60, y1: H + 60 } });
const s10_NB = 2400, s10_B = (() => { const r = rng(1022); const a = new Float32Array(s10_NB), v = new Float32Array(s10_NB), sz = new Float32Array(s10_NB); for (let i = 0; i < s10_NB; i++) { a[i] = r() * TAU; v[i] = 0.35 + r() * 0.65; sz[i] = 2 + r() * 3; } return { a, v, sz }; })();
const s10_NAME = { size: 146, family: FONTS.alt, weight: 800 };
const s10_MONO = { size: 44, family: FONTS.mono, weight: 500 };

function s10_burst(ctx, t) {
  const tau = t - 22; if (tau < 0 || tau > 1.6) return;
  const k = 2.5, fade = 1 - ez(t, 22.5, 23.5, E.inQuad), pri = T().primary, spr = softSprite(pri), spr2 = softSprite(T().accent), B = s10_B;
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  for (let j = 2; j >= 0; j--) { const tt = Math.max(0, tau - j * 0.02), al = (j === 0 ? 0.9 : 0.3) * fade;
    for (let i = 0; i < s10_NB; i++) { const d = 2500 * B.v[i] * (1 - Math.exp(-k * tt)) / k; const x = s10_C.x + Math.cos(B.a[i]) * d, y = s10_C.y + Math.sin(B.a[i]) * d; if (x < -20 || x > W + 20 || y < -20 || y > H + 20) continue; const s = B.sz[i] * (1 + tt * 0.5); ctx.globalAlpha = al * (0.4 + 0.6 * B.v[i]); ctx.drawImage(i % 5 ? spr : spr2, x - s, y - s, s * 2, s * 2); } }
  ctx.restore();
}
function s10_rings(ctx, t) {
  const l = remap(t, 22.0, 22.5); if (l <= 0 || l >= 1) return; const R = lerp(0, 1400, E.outCubic(l));
  ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.lineWidth = 3 * (1 - l * 0.5);
  ctx.strokeStyle = rgba(T().primary, 0.9 * (1 - l)); ctx.beginPath(); ctx.arc(s10_C.x, s10_C.y, R, 0, TAU); ctx.stroke();
  ctx.strokeStyle = rgba(T().accent, 0.8 * (1 - l)); ctx.beginPath(); ctx.arc(s10_C.x, s10_C.y, R * 0.8, 0, TAU); ctx.stroke();
  ctx.restore();
}
// chrome text (vertical gradient fill)
function s10_chrome(ctx, str, x, y, o) { drawText(ctx, str, x, y, Object.assign({}, o, { color: chromeGradient(ctx, y, o.size, TOKENS.chrome) })); }
// '5.1' with the period in accent carrying its own glow
function s10_51(ctx, x, y, size, alpha = 1, tracking = 0) {
  const o = { size, family: FONTS.body, weight: 800, tracking: 0, align: 'left' };
  const w5 = measureText(ctx, '5', o), wd = measureText(ctx, '.', o), w1 = measureText(ctx, '1', o), tot = w5 + wd + w1 + tracking * 2;
  let cx = x - tot / 2; ctx.save(); ctx.globalAlpha *= alpha;
  s10_chrome(ctx, '5', cx, y, o); cx += w5 + tracking;
  drawText(ctx, '.', cx, y, Object.assign({}, o, { color: T().accent, glow: { color: T().accent, blur: 22 } })); cx += wd + tracking;
  s10_chrome(ctx, '1', cx, y, o); ctx.restore();
}
// full lockup for s10 in group space (origin = canvas coords), with optional clipped light sweep. beamX in canvas coords.
function s10_lockup(ctx, t, tracking, sweep) {
  const nameO = Object.assign({ tracking }, s10_NAME);
  const drawAll = (mode) => {
    if (mode === 'ghost') ctx.globalAlpha *= 0.18;
    s10_chrome(ctx, 'Claude', 540, 860, nameO); s10_chrome(ctx, 'Fable', 540, 1030, nameO); s10_51(ctx, 540, 1260, 220, 1, tracking * 0.6);
    if (mode === 'beam') { ctx.save(); ctx.globalCompositeOperation = 'lighter'; const st = { stroke: { color: T().accent, width: 2.5 }, strokeOnly: true, glow: { color: T().accent, blur: 18 } }; drawText(ctx, 'Claude', 540, 860, Object.assign({}, nameO, st)); drawText(ctx, 'Fable', 540, 1030, Object.assign({}, nameO, st)); drawText(ctx, '5.1', 540, 1260, Object.assign({ size: 220, family: FONTS.body, weight: 800, tracking: tracking * 0.6 }, st)); ctx.restore(); }
  };
  if (!sweep) { drawAll('full'); return; }
  const th = 12 * Math.PI / 180, bw = 340, bx = sweep.x, cy = 1060;
  const region = (x0, x1, mode) => { ctx.save(); ctx.translate(bx, cy); ctx.rotate(th); ctx.beginPath(); ctx.rect(x0, -3000, x1 - x0, 6000); ctx.clip(); ctx.rotate(-th); ctx.translate(-bx, -cy); drawAll(mode); ctx.restore(); };
  region(-6000, -bw / 2, 'full'); region(-bw / 2, bw / 2, 'beam'); region(bw / 2, 6000, 'ghost');
  // the beam itself
  ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.translate(bx, cy); ctx.rotate(th);
  const g = ctx.createLinearGradient(-bw / 2, 0, bw / 2, 0); g.addColorStop(0, rgba(T().accent, 0)); g.addColorStop(0.45, rgba(T().primary, 0.35)); g.addColorStop(0.5, rgba('#ffffff', 0.5)); g.addColorStop(0.55, rgba(T().primary, 0.35)); g.addColorStop(1, rgba(T().accent, 0));
  ctx.fillStyle = g; ctx.filter = 'blur(28px)'; ctx.fillRect(-bw / 2, -3000, bw, 6000); ctx.restore();
}
function s10_world(ctx, t, tm, o = {}) {
  // shared background: breathing radial glow, faint constellation sphere, motes
  const acc = T().accent, gl = (o.glow ?? 0.12) * (0.75 + 0.25 * Math.sin(t * TAU * 0.25));
  radialFill(ctx, 540, o.gy ?? 1000, 1000, [[0, rgba(acc, gl)], [0.5, rgba(acc, gl * 0.35)], [1, rgba(acc, 0)]], 'lighter');
  if (o.sphere > 0) sphereCloud(ctx, t, { cx: 540, cy: o.sy ?? 960, r: 560, count: 150, alpha: o.sphere, edgeAlpha: o.sphere * 0.45, rot: t * 0.05, tilt: 0.55, seed: 10, size: 2.5 });
  s10_MOTES.draw(ctx, tm, { alpha: 0.13 });
}
SCENES.s10 = {
  draw(ctx, lt, t, dur) {
    const acc = T().accent, pri = T().primary;
    // camera: impact snap 1.30 → 1.0, push-in 1.0 → 1.06 (22.5-25.6) then back; punches on half-time kicks
    let zoom = lerp(1.12, 1.0, E.outExpo(remap(t, 22, 22.15))) * lerp(1, 1.03, E.inOutQuad(remap(t, 22.5, 25.5))) * lerp(1.03, 1.0, E.inOutQuad(remap(t, 25.5, 25.9)));
    for (const k of [23, 24, 25]) { zoom *= 1 + 0.02 * impulse(t, k, 12); const b = remap(t, k, k + 0.4); if (b > 0 && b < 1) FX.bloom = Math.max(FX.bloom, 0.25 + 0.25 * Math.sin(Math.PI * b)); }
    FX.rgb = Math.max(FX.rgb, 12 * (1 - ez(t, 22, 22.25, E.outCubic)));
    const sphereA = 0.18 * ez(t, 22.8, 23.5, E.inOutQuad), sweepP = E.inOutCubic(remap(t, 22.1, 22.9));
    const tracking = lerp(0.06, -0.02, E.outCubic(remap(t, 22.2, 24.0))) * s10_NAME.size;
    const exitP = E.inOutCubic(remap(t, 25.55, 25.9));
    withCamera(ctx, { zoom }, () => {
      s10_world(ctx, t, t, { sphere: sphereA, glow: 0.12 });
      // second faint sweep right → left
      if (t >= 24.6 && t <= 25.4) lightSweep(ctx, 1 - E.inOutCubic(remap(t, 24.6, 25.4)), { angle: 12 * Math.PI / 180, width: 260, color: pri, alpha: 0.08 });
      s10_burst(ctx, t); s10_rings(ctx, t);
      // vertical shockwave beam at the detonation
      const beam = 1 - ez(t, 22, 22.25, E.outCubic); if (beam > 0) { ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = rgba(pri, beam); ctx.filter = 'blur(10px)'; ctx.fillRect(540 - 4 - 40 * beam, -100, 8 + 80 * beam, H + 200); ctx.restore(); }
      // name group (scales to 0.62 and rises at the end)
      const gs = lerp(1, 0.767, exitP), gy = -366.6 * exitP, punch = lerp(1.25, 1, E.outExpo(remap(t, 22, 22.12)));
      withCamera(ctx, { zoom: gs * punch, ox: 540, oy: 1060, y: gy }, () => {
        const halo = lerp(lerp(0.5, 0.25, ez(t, 22, 22.6, E.outCubic)), 0.22, exitP);
        ctx.save(); ctx.filter = 'blur(40px)'; ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = halo; s10_lockup(ctx, t, tracking, null); ctx.restore();
        s10_lockup(ctx, t, tracking, sweepP < 1 ? { x: lerp(-260, 1400, sweepP) } : null);
        // accent underline under 'Fable' (centre outward)
        const up = E.outCubic(remap(t, 22.9, 23.3)) * (1 - E.inQuad(remap(t, 25.55, 25.8))); if (up > 0) { const uw = measureText(ctx, 'Fable', Object.assign({ tracking }, s10_NAME)) * up; ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha *= up; ctx.fillStyle = acc; ctx.filter = 'blur(8px)'; ctx.globalAlpha = 0.7; ctx.fillRect(540 - uw / 2, 1122, uw, 6); ctx.filter = 'none'; ctx.globalAlpha = 1; ctx.fillRect(540 - uw / 2, 1123, uw, 3); ctx.restore(); }
        // lens flare streak on '5.1'
        const fl = 0.2 * win(t, 22.4, 22.9, 24.8, 25.5); if (fl > 0) { ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.translate(540, 1260); ctx.scale(1, 0.05); radialFill(ctx, 0, 0, 520, [[0, rgba(pri, fl * 3)], [0.3, rgba(pri, fl)], [1, rgba(pri, 0)]]); ctx.restore(); }
      });
      // model id + Anthropic (fade out during the exit)
      const fo = 1 - ez(t, 25.55, 25.8, E.inQuad);
      if (t >= 23.0 && fo > 0) drawKinetic(ctx, 'claude-fable-5-1', 540, 1400, Object.assign({ color: rgba(pri, 0.75 * fo), caretColor: acc }, s10_MONO), remap(t, 23.0, 23.6), 'type');
      const ap = ez(t, 23.6, 24.0, E.outCubic); if (ap > 0) drawText(ctx, 'Anthropic', 540, 1490, { size: 50, family: FONTS.head, weight: 500, tracking: lerp(0.5, 0.3, ap) * 50, color: rgba(pri, 0.75 * ap * fo), upper: false });
    });
  }
};

/* ------------------------------------------------------------------- s11 */
SCENES.s11 = {
  draw(ctx, lt, t, dur) {
    const acc = T().accent, pri = T().primary; const real = t; t = Math.max(26, t); const live = real >= 26 - 1e-6;
    const tm = 26 + (t - 26) * 0.6;   // motes at 60 % speed, continuous with s10
    const zoom = lerp(1.0, 1.01, remap(t, 26, 30)) * (1 + 0.03 * impulse(t, 26, 10));
    withCamera(ctx, { zoom }, () => {
      s10_world(ctx, t, tm, { sphere: lerp(0.18, 0.11, remap(t, 26, 27)), glow: lerp(0.12, 0.10, remap(t, 26, 27)), gy: 1000, sy: 960 });
      if (!live) return;
      if (t >= 28.2 && t <= 29.2) lightSweep(ctx, E.inOutCubic(remap(t, 28.2, 29.2)), { angle: 12 * Math.PI / 180, width: 220, color: acc, alpha: 0.07 });
      // lockup
      const nameO = { size: 112, family: FONTS.alt, weight: 800, tracking: -0.02 * 112 };
      const lock = () => { s10_chrome(ctx, 'Claude', 540, 540, nameO); s10_chrome(ctx, 'Fable', 540, 670, nameO); s10_51(ctx, 540, 847, 169, 1, -0.02 * 112 * 0.6); };
      ctx.save(); ctx.filter = 'blur(30px)'; ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.22 + 0.06 * Math.sin(t * TAU * 0.25); lock(); ctx.restore();
      lock();
      drawText(ctx, 'Anthropic', 540, 945 + 10 * (1 - ez(t, 26.0, 26.3)), { size: 44, family: FONTS.head, weight: 500, tracking: 0.3 * 44, color: rgba(pri, 0.75 * ez(t, 26.0, 26.3)) });
      // hairline callback (26.0-26.5), centre outward
      const hp = E.outExpo(remap(t, 26.0, 26.5)); if (hp > 0) { const hw = 260 * hp; ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = acc; ctx.filter = 'blur(8px)'; ctx.globalAlpha = 0.8; ctx.fillRect(540 - hw, 1018, hw * 2, 5); ctx.filter = 'none'; ctx.globalAlpha = 1; ctx.fillRect(540 - hw, 1019, hw * 2, 2); ctx.restore(); }
      // CTA pill (26.5-26.8) with one specular sweep (27.6-28.0)
      if (t >= 26.5) pill(ctx, 'Jetzt in Claude Code.', 540, 1140, { size: 52, family: FONTS.head, weight: 700, padX: 44, h: 120, color: acc, textColor: '#050507' }, remap(t, 26.5, 26.8), t >= 27.6 && t <= 28.0 ? remap(t, 27.6, 28.0) : -1);
      // model id with blinking cursor until 29.0
      const mp = ez(t, 27.0, 27.4, E.outCubic);
      if (mp > 0) { const o = Object.assign({ color: rgba(pri, 0.65 * mp) }, s10_MONO); const w = measureText(ctx, 'claude-fable-5-1', o); drawText(ctx, 'claude-fable-5-1', 540, 1330, o); const on = t >= 29.0 || (Math.floor((t - 27.0) * 2) % 2 === 0); if (on) { ctx.save(); ctx.globalAlpha = mp; ctx.fillStyle = acc; ctx.fillRect(540 + w / 2 + 12, 1330 - 21, 22, 42); ctx.restore(); } }
    });
  }
};
