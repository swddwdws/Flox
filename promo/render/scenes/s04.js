// s04.js — "Ich schreibe Code." (8.0–10.0)
// Three-column JetBrains Mono code stream (inherits s03's 28 px rows / 16 px cells, already scrolling at 900 px/s
// from 7.9) with 16th-note lock-ins, a faint perspective floor grid, the headline slam on a legibility band, a
// typewriter terminal with beat-synced lines (check-mark punch + spark burst at 9.0), an accent light sweep 9.0–9.7,
// and the 9.9–10.0 acceleration to 2500 px/s where the tokens smear into vertical light streaks (6 layered copies)
// plus the exact streak set s05 collapses into its rings. Pure function of t; module-level names are prefixed s04_.

(function () {
  const s04_START = 8.0;
  const s04_NROWS = 150, s04_LH = 28, s04_RH = s04_NROWS * s04_LH, s04_ROW0 = 232;
  const s04_SIZE = 26;
  // column origins match s03's cell regions (cols 7..20 / 24..43 / 47..60 at x = 8 + col*16, glyph centre → left edge -8)
  const s04_COLS = [{ x0: 112, cells: 13, a: 0.13 }, { x0: 384, cells: 19, a: 0.22 }, { x0: 752, cells: 13, a: 0.13 }];
  const s04_BEATS = [8.0, 8.5, 9.0, 9.5];

  // ---------------------------------------------------------------- pseudo-code (no digits anywhere)
  const s04_KW = new Set(['const', 'function', 'return', 'await', 'if', 'else', 'import', 'export', 'type', '=>', 'async', 'try', 'catch', 'from']);
  const s04_ID = ['data', 'ctx', 'run', 'build', 'check', 'ship', 'test', 'plan', 'tool', 'res', 'out', 'cfg', 'node', 'task', 'step', 'diff',
    'patch', 'graph', 'state', 'next', 'prev', 'item', 'scope', 'token', 'model', 'agent', 'file', 'path', 'code', 'args', 'env', 'log',
    'done', 'ok', 'err', 'fn', 'x', 'y', 'k', 'job', 'spec', 'repo', 'tree', 'list', 'hook', 'sync', 'load', 'save', 'emit', 'map', 'key', 'val'];
  const s04_cap = s => s[0].toUpperCase() + s.slice(1);
  const s04_PAT = [
    id => `const ${id()} = await ${id()}(${id()})`,
    id => `const ${id()} = ${id()}(${id()}, ${id()})`,
    id => `if (${id()}) {`,
    id => `if (!${id()}) return`,
    id => `} else {`,
    id => `return ${id()}`,
    id => `return await ${id()}(${id()})`,
    id => `}`,
    id => `import { ${id()} } from "${id()}"`,
    id => `export async function ${id()}(${id()}) {`,
    id => `export function ${id()}() {`,
    id => `type ${s04_cap(id())} = ${s04_cap(id())} | ${s04_cap(id())}`,
    id => `try {`,
    id => `} catch (err) {`,
    id => `const ${id()} = (${id()}) => ${id()}`,
    id => `await ${id()}.${id()}()`,
    id => `export const ${id()} = ${id()}`,
    id => `async ${id()}() {`,
    id => `${id()}.${id()}(${id()})`,
    id => `const ${id()} = ${id()}.${id()}`,
  ];
  // per column: NROWS entries, null = blank row, else {s, kw:[charIndex, word, ...]}
  const s04_LINES = s04_COLS.map((C, ci) => {
    const r = rng(4401 + ci * 17), id = () => s04_ID[Math.floor(r() * s04_ID.length)];
    const rows = new Array(s04_NROWS); let depth = 0;
    for (let i = 0; i < s04_NROWS; i++) {
      if (r() < 0.3 && !(i > 0 && rows[i - 1] === null)) { rows[i] = null; continue; }
      let s = null;
      for (let tries = 0; tries < 12 && s === null; tries++) {
        const cand = s04_PAT[Math.floor(r() * s04_PAT.length)](id);
        const closes = cand.startsWith('}');
        if (closes && depth === 0) continue;
        if (depth >= 3 && cand.endsWith('{')) continue;
        const ind = ' '.repeat(2 * Math.max(0, depth - (closes ? 1 : 0)));
        if (ind.length + cand.length <= C.cells) s = ind + cand;
      }
      if (s === null) s = depth > 0 ? ' '.repeat(2 * (depth - 1)) + '}' : ('return ' + id()).slice(0, C.cells);
      const st = s.trimStart();
      if (st.startsWith('}')) depth = Math.max(0, depth - 1);
      if (st.endsWith('{')) depth++;
      const kw = [], re = /\S+/g; let m;
      while ((m = re.exec(s))) { const w = m[0].replace(/[(){},;"]/g, ''); if (s04_KW.has(w)) kw.push(m.index, w); }
      rows[i] = { s, kw };
    }
    return rows;
  });

  // scroll offset (px) of the stream since s03 started it scrolling at 7.9; 900 px/s, 9.9–10.0 ramps to 2500 px/s
  function s04_off(t) {
    if (t <= 9.9) return 900 * (t - 7.9);
    const d = Math.min(t, 10.0) - 9.9;             // v = 900 + 16000·d  →  ∫ = 900d + 8000d²
    return 1800 + 900 * d + 8000 * d * d + (t > 10 ? 2500 * (t - 10) : 0);
  }
  function s04_rowY(r, t) { let y = s04_ROW0 + s04_LH * r - s04_off(t); return ((y + 300) % s04_RH + s04_RH) % s04_RH - 300; }

  // ---------------------------------------------------------------- lock-ins: one line every 16th (125 ms)
  const s04_LOCK_DUR = 0.41;    // brake 60 ms + hold 200 ms + dissolve 150 ms
  const s04_LOCKS = (() => {
    const r = rng(4477), arr = [];
    for (let k = 0; k < 16; k++) {
      const t0 = s04_START + k * 0.125;
      const col = r() < 0.6 ? 1 : (r() < 0.5 ? 0 : 2);
      const ty = r() < 0.55 ? 290 + r() * 300 : 1450 + r() * 170;   // clear of the headline / terminal bands
      let best = -1, bd = 1e9;
      for (let row = 0; row < s04_NROWS; row++) {
        if (!s04_LINES[col][row]) continue;
        const d = Math.abs(s04_rowY(row, t0) - ty); if (d < bd) { bd = d; best = row; }
      }
      arr.push({ t0, col, row: best, y0: s04_rowY(best, t0) });
    }
    return arr;
  })();

  // ---------------------------------------------------------------- terminal
  const s04_TX = 380;   // block left edge (block of 12 mono chars is centred on CX)
  const s04_TERM = [
    { s: '$ claude', y: 1120, t0: 8.2, typed: true },
    { s: '› Bauen', y: 1200, t0: 8.5 },
    { s: '› Prüfen ✓', y: 1280, t0: 9.0, check: true },
    { s: '› Ausliefern', y: 1360, t0: 9.5 },
  ];

  // ---------------------------------------------------------------- s05 hand-off streaks (same seed/sequence as s05_STREAKS)
  const s04_STREAKS = (() => {
    const r = rng(505), arr = [];
    for (let i = 0; i < 28; i++) arr.push({ x: 70 + r() * 940, y0: r() * H, len: 420 + r() * 520, w: 1 + r() * 1.6, a: 0.45 + r() * 0.45, ring: i % 3, ang: r() * TAU, speed: 2200 + r() * 700 });
    return arr;
  })();

  let s04_cw = 0, s04_cw44 = 0;
  // current y of a locked line: decelerating brake over 60 ms (27 px), then a slow 8 px lift while it dissolves
  function s04_lockY(k, t) {
    const d = t - k.t0, bd = Math.min(d, 0.06);
    return k.y0 - 900 * (bd - bd * bd / 0.12) - 8 * remap(d, 0.26, 0.41);
  }
  // the three-column stream; dy = vertical offset (streak copies), aMul = alpha multiplier, locks = rows currently locked (hidden here;
  // scrolling neighbours within ±16 px of a locked line fade out so two lines never double-print)
  function s04_drawStream(ctx, t, dy, aMul, locks, comp) {
    ctx.save();
    ctx.font = font(s04_SIZE, FONTS.mono, 500); ctx.textBaseline = 'middle'; ctx.textAlign = 'left'; ctx.letterSpacing = '0px';
    if (comp) ctx.globalCompositeOperation = comp;
    if (!s04_cw) s04_cw = ctx.measureText('M').width;
    const off = s04_off(t), PRI = T().primary;
    for (let ci = 0; ci < 3; ci++) {
      const C = s04_COLS[ci], rows = s04_LINES[ci], vis = [];
      for (let r = 0; r < s04_NROWS; r++) {
        const L = rows[r]; if (!L) continue;
        let y = s04_ROW0 + s04_LH * r - off; y = ((y + 300) % s04_RH + s04_RH) % s04_RH - 300;
        if (y < -30 || y > H + 30) continue;
        let hidden = false, near = 1;
        for (const k of locks) {
          if (k.col !== ci) continue;
          if (k.row === r) { hidden = true; break; }
          near = Math.min(near, smoothstep(remap(Math.abs(y - s04_lockY(k, t)), 16, 30)));   // 0 inside ±16 px, 1 beyond 30 px
        }
        if (hidden || near <= 0.01) continue;
        vis.push(L, y + dy, near);
      }
      const a0 = Math.min(1, C.a * aMul), a1 = Math.min(1, C.a * aMul * 0.9);
      ctx.fillStyle = rgba(PRI, a0);
      for (let i = 0; i < vis.length; i += 3) { if (vis[i + 2] < 1) ctx.fillStyle = rgba(PRI, a0 * vis[i + 2]); ctx.fillText(vis[i].s, C.x0, vis[i + 1]); if (vis[i + 2] < 1) ctx.fillStyle = rgba(PRI, a0); }
      ctx.fillStyle = rgba(PRI, a1);    // keywords drawn again on top → brighter
      for (let i = 0; i < vis.length; i += 3) {
        const kw = vis[i].kw; if (!kw.length) continue;
        if (vis[i + 2] < 1) ctx.fillStyle = rgba(PRI, a1 * vis[i + 2]);
        for (let j = 0; j < kw.length; j += 2) ctx.fillText(kw[j + 1], C.x0 + kw[j] * s04_cw, vis[i + 1]);
        if (vis[i + 2] < 1) ctx.fillStyle = rgba(PRI, a1);
      }
    }
    ctx.restore();
  }

  function s04_grid(ctx, t, alpha) {
    floorGrid(ctx, t, { horizon: 380, camH: 295, f: 700, spacing: 96, speed: 120, color: T().secondary, alpha, rows: 60, cols: 8, lineWidth: 1, fade: false });
  }

  // vector check mark (the ✓ of '› Prüfen ✓'), centred at (x,y), 44 px cell
  function s04_check(ctx, x, y, scale, alpha) {
    const P = T();
    ctx.save(); ctx.translate(x, y + 2); ctx.scale(scale, scale); ctx.globalAlpha *= alpha; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    const path = () => { ctx.beginPath(); ctx.moveTo(-14, 1); ctx.lineTo(-4, 12); ctx.lineTo(15, -12); };
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    for (let g = 3; g >= 1; g--) { ctx.strokeStyle = rgba(P.accent, 0.13); ctx.lineWidth = 5 + g * 7; path(); ctx.stroke(); }
    ctx.restore();
    ctx.strokeStyle = P.accent; ctx.lineWidth = 5; path(); ctx.stroke();
    ctx.strokeStyle = rgba(P.primary, 0.85); ctx.lineWidth = 1.6; path(); ctx.stroke();
    ctx.restore();
  }

  SCENES.s04 = {
    draw(ctx, lt, t, dur) {
      const P = T(), PRI = P.primary, ACC = P.accent;
      lt = t - s04_START;
      // ---------------- timing scalars
      let kick = 0; for (const b of s04_BEATS) kick = Math.max(kick, impulse(t, b, 12));
      const sf = remap(t, 9.9, 10.0);                          // streak phase 9.9–10.0
      const textA = 1 - ez(t, 9.88, 10.0, E.inQuad);           // text lets go for the streak hand-off
      const sweep = remap(t, 9.0, 9.7), sweepY = lerp(-320, H + 320, E.inOutQuad(sweep));
      const locks = s04_LOCKS.filter(k => t >= k.t0 && t < k.t0 + s04_LOCK_DUR);
      const beatPulse = 1 + 0.35 * kick;

      // ---------------- engine FX: beat kick shake (2 px), slam micro-shake, rgb on the slam, rgb/bloom into the streaks
      FX.shake = Math.max(FX.shake, 2 * kick, 3 * impulse(t, 8.0, 14));
      FX.rgb = Math.max(FX.rgb, 6 * (1 - remap(lt, 0, 0.1)), 8 * sf);
      FX.bloom = Math.max(FX.bloom, 0.2 + 0.12 * kick + 0.22 * sf + 0.15 * Math.exp(-8 * lt));

      withCamera(ctx, { zoom: 1 + 0.03 * (lt / dur), ox: CX, oy: CY }, () => {
        // ---------------- perspective floor grid (secondary 6 %) + horizon soften
        s04_grid(ctx, t, 0.06 + 0.04 * kick);
        linearFill(ctx, 0, 370, 0, 780, [[0, rgba(P.bg, 1)], [1, rgba(P.bg, 0)]], [0, 370, W, 410]);

        // ---------------- ambient warmth: residual of the 7.95 flash + soft centre glow
        {
          const e = Math.exp(-9 * lt);
          radialFill(ctx, 540, 720, 1100, [[0, rgba(ACC, 0.3 * e)], [0.4, rgba(ACC, 0.11 * e)], [1, rgba(ACC, 0)]], 'lighter');
          radialFill(ctx, 540, 900, 900, [[0, rgba(ACC, 0.06 + 0.05 * kick)], [1, rgba(ACC, 0)]], 'lighter');
        }

        // ---------------- accent light sweep, top → bottom behind everything (9.0–9.7)
        if (sweep > 0 && sweep < 1) {
          ctx.save(); ctx.globalCompositeOperation = 'lighter';
          const g = ctx.createLinearGradient(0, sweepY - 360, 0, sweepY + 360);
          g.addColorStop(0, rgba(ACC, 0)); g.addColorStop(0.3, rgba(ACC, 0.08)); g.addColorStop(0.5, rgba(ACC, 0.3)); g.addColorStop(0.7, rgba(ACC, 0.08)); g.addColorStop(1, rgba(ACC, 0));
          ctx.fillStyle = g; ctx.fillRect(0, sweepY - 360, W, 720);
          // grid lines it crosses brighten
          ctx.beginPath(); ctx.rect(0, sweepY - 150, W, 300); ctx.clip();
          s04_grid(ctx, t, 0.3);
          ctx.restore();
        }

        // ---------------- the code stream (+ 6 layered copies smearing into streaks from 9.9)
        if (sf <= 0) s04_drawStream(ctx, t, 0, beatPulse, locks, null);
        else {
          const gap = 16 * sf;
          for (let k = 0; k < 6; k++) s04_drawStream(ctx, t, k * gap, beatPulse * lerp(1, 0.55, sf) * (k === 0 ? 1 : 0.55), locks, 'lighter');
        }
        // tokens under the sweep brighten
        if (sweep > 0 && sweep < 1) {
          ctx.save(); ctx.beginPath(); ctx.rect(0, sweepY - 150, W, 300); ctx.clip();
          s04_drawStream(ctx, t, 0, 1.6, locks, 'lighter');
          ctx.restore();
        }

        // ---------------- lock-ins: brake to 0 in 60 ms → primary 70 % hold 200 ms → dissolve 150 ms
        if (locks.length) {
          ctx.save(); ctx.font = font(s04_SIZE, FONTS.mono, 500); ctx.textBaseline = 'middle'; ctx.textAlign = 'left';
          for (const k of locks) {
            const d = t - k.t0, L = s04_LINES[k.col][k.row], x0 = s04_COLS[k.col].x0;
            const dis = remap(d, 0.26, 0.41), y = s04_lockY(k, t);                          // decelerating travel (27 px) + lift
            const a = (d < 0.06 ? lerp(1, 0.7, d / 0.06) : 0.7) * (1 - E.inQuad(dis));
            ctx.letterSpacing = (7 * dis).toFixed(1) + 'px';
            if (d < 0.06) { // one faint motion-trail copy while braking (kept short so it never reads as a double print)
              const tr = 1 - d / 0.06; ctx.fillStyle = rgba(PRI, 0.1 * tr);
              ctx.fillText(L.s, x0, y + 10 * tr);
            }
            ctx.fillStyle = rgba(PRI, a); ctx.fillText(L.s, x0, y);
            // accent marker block at the line start (blinks during the hold)
            const mx = x0 + (L.s.length - L.s.trimStart().length) * s04_cw - 20;   // sits at the indented line start
            if (dis < 1 && (d < 0.1 || Math.floor(d * 8) % 2 === 0)) { ctx.fillStyle = rgba(ACC, 0.95 * (1 - dis)); ctx.fillRect(mx, y - 10, 9, 20); }
          }
          ctx.restore();
        }

        // ---------------- headline: slam 1.3 → 1.0 (8.0–8.15) on a legibility band
        if (textA > 0.01) {
          ctx.save(); ctx.globalAlpha *= textA;
          band(ctx, 830, 470, 0.6);
          const sp = ez(lt, 0, 0.15, E.outExpo);
          const hs = lerp(1.3, 1, sp) * (1 + 0.03 * kick);
          let size = 130; const ho = { size, family: FONTS.body, weight: 800, color: PRI, tracking: -0.045 * size };
          const w1 = measureText(ctx, 'Ich schreibe', ho);
          if (w1 > 900) { size = Math.floor(size * 900 / w1); ho.size = size; ho.tracking = -0.045 * size; }
          withCamera(ctx, { zoom: hs, ox: CX, oy: 830 }, () => {
            if (sp < 0.9) { // motion ghosts on the slam (cheaper than a blur filter)
              const gd = (1 - sp) * 16; ctx.save(); ctx.globalAlpha *= 0.35;
              drawText(ctx, 'Ich schreibe', CX, 760 - gd, ho); drawText(ctx, 'Ich schreibe', CX, 760 + gd, ho);
              drawText(ctx, 'Code.', CX, 900 - gd, ho); drawText(ctx, 'Code.', CX, 900 + gd, ho);
              ctx.restore();
            }
            drawText(ctx, 'Ich schreibe', CX, 760, ho);
            drawText(ctx, 'Code.', CX, 900, ho);
          });
          ctx.restore();
        }

        // ---------------- terminal block
        if (t >= 8.2 && textA > 0.01) {
          ctx.save(); ctx.globalAlpha *= textA;
          ctx.font = font(44, FONTS.mono, 500); ctx.textBaseline = 'middle'; ctx.textAlign = 'left'; ctx.letterSpacing = '0px';
          if (!s04_cw44) s04_cw44 = ctx.measureText('M').width;
          const cw = s04_cw44, x0 = s04_TX;
          // growing legibility band
          let bottom = 1120;
          for (let i = 1; i < s04_TERM.length; i++) if (t >= s04_TERM[i].t0 - 0.08) bottom = lerp(bottom, s04_TERM[i].y, ez(t, s04_TERM[i].t0 - 0.08, s04_TERM[i].t0 + 0.04, E.outCubic));
          band(ctx, (1120 + bottom) / 2, bottom - 1120 + 150, 0.5 * ez(t, 8.2, 8.35));
          const mo = { size: 44, family: FONTS.mono, weight: 500, align: 'left' };
          let curX = 0, curY = 0, curSolid = true;
          for (const ln of s04_TERM) {
            if (t < ln.t0) break;
            const d = t - ln.t0;
            if (ln.typed) {
              const n = Math.min(ln.s.length, Math.floor(d / 0.028) + 1);
              for (let i = 0; i < n; i++) { ctx.fillStyle = i === 0 ? ACC : rgba(PRI, 0.85); ctx.fillText(ln.s[i], x0 + i * cw, ln.y); }
              curX = x0 + n * cw + 6; curY = ln.y; curSolid = n < ln.s.length;
            } else {
              // the line IS the beat hit: fully visible on the beat frame, scale slam 1.2 → 1.0 over 120 ms (E.outExpo),
              // 80 ms primary flash on top, then it settles to primary 80 %
              const sp = ez(d, 0, 0.12, E.outExpo), flash = d < 0.08;
              const word = ln.check ? ln.s.slice(2, -2) : ln.s.slice(2);
              const wa = flash ? 1 : 0.8, nch = ln.check ? 10.5 : ln.s.length;
              FX.rgb = Math.max(FX.rgb, 3 * (1 - ez(d, 0, 0.07)));   // subtle 2-frame split; the hit is the scale slam
              withCamera(ctx, { zoom: lerp(1.2, 1, sp), ox: x0 + nch * cw / 2, oy: ln.y }, () => {
                drawText(ctx, '›', x0, ln.y, Object.assign({}, mo, { color: ACC }));
                drawText(ctx, word, x0 + 2 * cw, ln.y, Object.assign({}, mo, { color: rgba(PRI, wa) }));
                if (flash) { // 80 ms primary flash: additive double + accent glow on the prompt
                  ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha *= 0.5 * (1 - d / 0.08);
                  drawText(ctx, word, x0 + 2 * cw, ln.y, Object.assign({}, mo, { color: PRI }));
                  ctx.restore();
                  dot(ctx, x0 + cw * 0.5, ln.y, 44, ACC, 0.55 * (1 - d / 0.08));
                }
                if (ln.check) { // check mark: opaque from the beat frame, punching 1.8 → 1.0
                  const cxk = x0 + 9.5 * cw, cyk = ln.y;
                  const scl = lerp(1.8, 1, ez(d, 0, 0.25, E.outExpo)), imp = impulse(t, ln.t0, 9);
                  dot(ctx, cxk, cyk, 90 * (0.6 + 0.8 * imp), ACC, 0.55 * imp + 0.12);
                  s04_check(ctx, cxk, cyk, scl, 1);
                }
              });
              if (ln.check) {
                const life = remap(d, 0, 0.4);
                if (life > 0 && life < 1) burst(ctx, x0 + 9.5 * cw, ln.y, life, { count: 60, color: ACC, radius: 280, seed: 404, alpha: 0.95 });
              }
              // the cursor stays at the previous line end until the slam has settled (2 frames), then jumps behind the new word
              if (d >= 0.066) { curX = x0 + nch * cw + 6; curY = ln.y; curSolid = d < 0.25; }
              else curSolid = true;
            }
          }
          // accent block cursor after the newest line (solid while typing / just landed, then blinking)
          if (curY && (curSolid || ((t * 2.5) % 1) < 0.6)) { ctx.fillStyle = rgba(ACC, 0.95); ctx.fillRect(curX, curY - 19, cw * 0.6, 38); }
          ctx.restore();
        }

        // ---------------- 9.9–10.0: the streak set s05 inherits (identical seed/sequence), fading in
        if (sf > 0) {
          const sa = E.outQuad(sf);
          ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.lineCap = 'round';
          for (const S of s04_STREAKS) {
            const ys = ((S.y0 + S.speed * (10 - t)) % (H + 800) + (H + 800)) % (H + 800) - 400;
            const len = S.len, al = S.a * sa;
            const g = ctx.createLinearGradient(0, ys - len / 2, 0, ys + len / 2);
            g.addColorStop(0, rgba(PRI, 0)); g.addColorStop(0.5, rgba(PRI, al)); g.addColorStop(1, rgba(PRI, 0));
            ctx.strokeStyle = g; ctx.lineWidth = S.w * 4; ctx.globalAlpha = 0.35;
            ctx.beginPath(); ctx.moveTo(S.x, ys - len / 2); ctx.lineTo(S.x, ys + len / 2); ctx.stroke();
            ctx.lineWidth = S.w; ctx.globalAlpha = 1;
            ctx.beginPath(); ctx.moveTo(S.x, ys - len / 2); ctx.lineTo(S.x, ys + len / 2); ctx.stroke();
          }
          ctx.restore();
        }
      });
    }
  };
})();
