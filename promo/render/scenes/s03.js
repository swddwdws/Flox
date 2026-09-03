// s03.js — "Ich denke tief." (5.0–8.0)
// Reasoning constellation: 900-point 3D sphere flying in on the cut, a glowing thought path around the sphere,
// per-character headline on a legibility band, subline wipe, then a front-node flare + points-to-text-rows morph
// that hands the rows to s04's code stream under the engine's 7.95 white flash.
// Everything is a pure function of t; all tables are seeded at module level (prefixed s03_).

(function () {
  const N = 900, RAD = 620, FOCAL = 1100, SCX = 540, SCY = 840;
  const NPATH = 14;
  const ROT_SPEED = 6 * Math.PI / 180;  // 6 deg/s
  const AXIS = (() => { const v = [0.34, 1, 0.22], l = Math.hypot(...v); return v.map(c => c / l); })();

  const s03_r = rng(3301);
  const s03_norm = v => { const l = Math.hypot(v[0], v[1], v[2]) || 1; return [v[0] / l, v[1] / l, v[2] / l]; };
  // Rodrigues rotation about AXIS by angle a
  function s03_rot(v, a, out) {
    const c = Math.cos(a), s = Math.sin(a), k = AXIS, kd = k[0] * v[0] + k[1] * v[1] + k[2] * v[2];
    const cx = k[1] * v[2] - k[2] * v[1], cy = k[2] * v[0] - k[0] * v[2], cz = k[0] * v[1] - k[1] * v[0];
    out[0] = v[0] * c + cx * s + k[0] * kd * (1 - c);
    out[1] = v[1] * c + cy * s + k[1] * kd * (1 - c);
    out[2] = v[2] * c + cz * s + k[2] * kd * (1 - c);
    return out;
  }

  // ---- base sphere positions (points 0..13 are the thought-path nodes on a great circle) ----
  const bx = new Float32Array(N), by = new Float32Array(N), bz = new Float32Array(N);
  const sx0 = new Float32Array(N), sy0 = new Float32Array(N), sz0 = new Float32Array(N); // fly-in start positions
  const delay = new Float32Array(N), tone = new Float32Array(N);
  // the last node must sit at the front of the sphere at lt = 2.3 (the 7.3 burst): un-rotate its world direction
  const endWorld = s03_norm([0.10, -0.16, -0.98]);
  const b13 = s03_rot(endWorld, -ROT_SPEED * 2.3, [0, 0, 0]);
  const h = [1, 0.25, 0.1], hd = h[0] * b13[0] + h[1] * b13[1] + h[2] * b13[2];
  const u = s03_norm([h[0] - hd * b13[0], h[1] - hd * b13[1], h[2] - hd * b13[2]]);
  const ARC = 165 * Math.PI / 180;
  for (let k = 0; k < NPATH; k++) {
    const ph = -ARC * (NPATH - 1 - k) / (NPATH - 1), c = Math.cos(ph), s = Math.sin(ph);
    bx[k] = (c * b13[0] + s * u[0]) * RAD * 0.985; by[k] = (c * b13[1] + s * u[1]) * RAD * 0.985; bz[k] = (c * b13[2] + s * u[2]) * RAD * 0.985;
  }
  for (let i = NPATH; i < N; i++) {
    // mostly on the shell, some inside
    const z = s03_r() * 2 - 1, a = s03_r() * TAU, rr = Math.sqrt(1 - z * z);
    const rad = RAD * lerp(0.55, 1, Math.cbrt(s03_r()));
    bx[i] = rr * Math.cos(a) * rad; by[i] = rr * Math.sin(a) * rad; bz[i] = z * rad;
  }
  for (let i = 0; i < N; i++) {
    delay[i] = s03_r() * 0.3; tone[i] = s03_r();
    if (s03_r() < 0.7) { // far depth, in front of the camera → expands outward
      sz0[i] = 1800 + s03_r() * 3200; sx0[i] = (s03_r() - 0.5) * 3200; sy0[i] = (s03_r() - 0.5) * 3200;
    } else {            // near depth, outside the frame → flies inward
      const a = s03_r() * TAU, r = 1400 + s03_r() * 700; sz0[i] = -420 + s03_r() * 320; sx0[i] = Math.cos(a) * r; sy0[i] = Math.sin(a) * r;
    }
  }

  // ---- neighbour links (3D distance ≤ 110, rotation-invariant) ----
  const links = [];
  for (let i = 0; i < N; i++) for (let j = i + 1; j < N; j++) {
    const dx = bx[i] - bx[j], dy = by[i] - by[j], dz = bz[i] - bz[j];
    if (dx * dx + dy * dy + dz * dz <= 110 * 110) links.push(i, j);
  }
  const NL = links.length / 2;

  // ---- per-frame scratch (derived from t every frame, never accumulated) ----
  const px = new Float32Array(N), py = new Float32Array(N), pz = new Float32Array(N), ps = new Float32Array(N);
  const qx = new Float32Array(N), qy = new Float32Array(N);
  const tmp = [0, 0, 0];
  // fills X/Y/Z/Sc with projected positions at local time lt (no camera)
  function s03_frame(lt, X, Y, Z, Sc) {
    const ang = ROT_SPEED * lt;
    for (let i = 0; i < N; i++) {
      tmp[0] = bx[i]; tmp[1] = by[i]; tmp[2] = bz[i];
      s03_rot(tmp, ang, tmp);
      const p = ez(lt, delay[i], delay[i] + 0.45, E.outExpo);
      const x = lerp(sx0[i], tmp[0], p), y = lerp(sy0[i], tmp[1], p), z = lerp(sz0[i], tmp[2], p);
      const s = FOCAL / Math.max(60, z + FOCAL);
      X[i] = SCX + x * s; Y[i] = SCY + y * s; if (Z) Z[i] = z; if (Sc) Sc[i] = s;
    }
  }

  // ---- text-row cells (rows every 28 px, columns every 16 px, three "code columns") ----
  const cellX = new Float32Array(N), cellY = new Float32Array(N), cellA = new Float32Array(N);
  {
    const cr = rng(3377), cells = [];
    const regions = [[7, 20, 0.30], [24, 43, 0.52], [47, 60, 0.30]]; // [firstCol, lastCol, alpha]
    // ~30 of the 53 rows carry text (dense word runs read as lines; the others stay empty like blank code lines)
    for (let row = 0; row < 53; row++) {
      const y = 232 + row * 28; if (cr() < 0.42) continue;
      for (const [c0, c1, al] of regions) {
        let c = c0 + Math.floor(cr() * 3);
        while (c <= c1) {
          const len = 3 + Math.floor(cr() * 6);
          if (cr() < 0.8) for (let k = 0; k < len && c + k <= c1; k++) cells.push([8 + (c + k) * 16, y, al]);
          c += len + 1;
        }
      }
    }
    // trim / pad to exactly N cells (seeded)
    while (cells.length > N) cells.splice(Math.floor(cr() * cells.length), 1);
    while (cells.length < N) { const row = Math.floor(cr() * 53), col = 7 + Math.floor(cr() * 54); cells.push([8 + col * 16, 232 + row * 28, 0.3]); }
    cells.sort((a, b) => a[1] - b[1] || a[0] - b[0]);
    // assign: points ranked by projected y at the morph start (lt = 2.3) → rows top to bottom, then by x within a row
    s03_frame(2.3, px, py, pz, ps);
    const order = Array.from({ length: N }, (_, i) => i).sort((a, b) => py[a] - py[b]);
    let k = 0;
    while (k < N) {
      let e = k; while (e < N && cells[e][1] === cells[k][1]) e++;
      const pts = order.slice(k, e).sort((a, b) => px[a] - px[b]);
      for (let j = 0; j < pts.length; j++) { cellX[pts[j]] = cells[k + j][0]; cellY[pts[j]] = cells[k + j][1]; cellA[pts[j]] = cells[k + j][2]; }
      k = e;
    }
  }
  // flare anchor = final path node at the burst (lt = 2.3)
  const FLX = px[NPATH - 1], FLY = py[NPATH - 1];

  const SUB = 'Schritt für Schritt. Bis zum Ende.';

  SCENES.s03 = {
    draw(ctx, lt, t, dur) {
      const TK = T(), PRI = TK.primary, ACC = TK.accent, SEC = TK.secondary;
      const morph = ez(t, 7.3, 7.8, E.inOutCubic);
      const scroll = t > 7.9 ? -900 * (t - 7.9) : 0;
      const zoomIn = ez(t, 7.3, 7.9, E.inCubic) * (1 - ez(t, 7.9, 8.0, E.inCubic));
      const shk = t > 7.75 ? 3 * remap(t, 7.75, 7.85) : 0;
      const cam = {
        zoom: 1 + 0.18 * zoomIn, ox: FLX, oy: FLY,
        x: lerp(-18, 18, lt / dur) + shk * Math.sin(TAU * 8 * t),
        y: shk * Math.cos(TAU * 8 * t + 1.1),
      };

      s03_frame(lt, px, py, pz, ps);
      const flying = lt < 0.9;
      if (flying) s03_frame(Math.max(0, lt - 1 / 30), qx, qy, null, null);

      withCamera(ctx, cam, c => {
        // -- braam bloom on the cut (accent wash + ring, decaying) --
        if (lt < 0.7) {
          const a = 0.14 * Math.exp(-6 * lt);
          radialFill(c, SCX, SCY, 720, [[0, rgba(ACC, a)], [0.5, rgba(ACC, a * 0.35)], [1, rgba(ACC, 0)]], 'lighter');
          shockwave(c, SCX, SCY, remap(lt, 0, 0.6), { radius: 1100, color: ACC, width: 10, alpha: 0.5 });
          // spark core the points shoot out of
          flare(c, SCX, SCY, { color: ACC, size: 90 + 260 * ez(lt, 0, 0.5), intensity: 0.9 * Math.exp(-7 * lt), streakLen: 3.5 });
        }

        // -- neighbour wireframe (secondary 12 %), fades away during the morph --
        const beat = t >= 6 ? pulse(t, 0.5, 9) : 0;               // pulse on every beat from 6.0
        const linkA = 0.12 * (1 + 0.7 * beat) * (1 - morph);
        if (linkA > 0.005) {
          c.save(); c.strokeStyle = rgba(SEC, linkA); c.lineWidth = 1; c.beginPath();
          for (let k = 0; k < NL; k++) {
            const i = links[2 * k], j = links[2 * k + 1];
            if (flying && (lt < delay[i] + 0.4 || lt < delay[j] + 0.4)) continue;
            c.moveTo(px[i], py[i]); c.lineTo(px[j], py[j]);
          }
          c.stroke(); c.restore();
        }

        // -- points: 2–3 px primary 30–70 %, front 15 % with an accent halo; morphing into text cells --
        c.save(); c.globalCompositeOperation = 'lighter';
        const spr = softSprite(PRI), halo = softSprite(ACC);
        for (let i = 0; i < N; i++) {
          const depth = clamp((-pz[i] / RAD + 1) / 2);      // 0 back … 1 front
          const arrive = ez(lt, delay[i], delay[i] + 0.45, E.outExpo);
          let x = px[i], y = py[i];
          if (morph > 0) { x = lerp(x, cellX[i], morph); y = lerp(y, cellY[i] + scroll, morph); }
          if (morph < 1) {
            const hot = 1 - arrive;                                   // in flight → hotter and bigger
            const r = lerp(1.7, 3.2, depth) * (0.85 + 0.3 * tone[i]) * (1 + 1.3 * hot);
            const tw = 0.82 + 0.18 * Math.sin(t * 3.1 + tone[i] * TAU);
            const al = Math.min(1, lerp(0.3, 0.7, depth) * (0.75 + 0.25 * tone[i]) * tw * (1 + 0.35 * beat) + 0.55 * hot) * (1 - morph);
            if (flying && arrive < 0.999) { // short motion trail while in flight (capped at 110 px), accent under a primary core
              let tx = qx[i] - x, ty = qy[i] - y; const tl = Math.hypot(tx, ty); if (tl > 110) { tx *= 110 / tl; ty *= 110 / tl; }
              c.globalAlpha = al * 0.55; c.strokeStyle = ACC; c.lineWidth = 2.5; c.beginPath(); c.moveTo(x + tx, y + ty); c.lineTo(x, y); c.stroke();
              c.globalAlpha = al * 0.6; c.strokeStyle = PRI; c.lineWidth = 1; c.beginPath(); c.moveTo(x + tx * 0.6, y + ty * 0.6); c.lineTo(x, y); c.stroke();
            }
            c.globalAlpha = al; c.drawImage(spr, x - r * 1.6, y - r * 1.6, r * 3.2, r * 3.2);
            const front = clamp((-pz[i] - 330) / 160) * arrive;
            if (front > 0.02) { c.globalAlpha = 0.3 * front * (1 - morph); c.drawImage(halo, x - 14, y - 14, 28, 28); }
          }
          if (morph > 0) { // text-like glyph block
            // glyph-like block: varied width / height per cell so the rows read as blurred mono text, not pixels
            c.globalAlpha = cellA[i] * (0.7 + 0.5 * tone[i]) * morph * (1 + 0.5 * ez(t, 7.9, 8.0)); c.fillStyle = PRI;
            const gw = lerp(3, 6 + 5 * hash1(i * 7 + 1), morph), gh = lerp(3, 11 + 6 * hash1(i * 11 + 3), morph);
            c.fillRect(x - gw / 2, y - gh / 2, gw, gh);
          }
        }
        c.restore();

        // -- thought path: 14 nodes lit every 125 ms from 5.5, glowing accent segments, node flares --
        const pathA = 1 - ez(t, 7.3, 7.7);
        if (t >= 5.5 && pathA > 0.01) {
          const lit = k => 5.5 + k * 0.125;
          c.save(); c.globalAlpha *= pathA;
          // segment geometry (drawn on over 125 ms each; older segments dim to 30 %)
          const seg = [];
          for (let k = 1; k < NPATH; k++) {
            const p = remap(t, lit(k) - 0.125, lit(k)); if (p <= 0) break;
            const e = E.outCubic(p), dim = lerp(1, 0.3, ez(t - lit(k), 0.12, 0.6));
            seg.push([px[k - 1], py[k - 1], lerp(px[k - 1], px[k], e), lerp(py[k - 1], py[k], e), dim, 2 + 1.5 * (1 - e)]);
          }
          // ONE blurred additive pass for the whole path (a blur pass per segment is ~30 ms each in software raster)
          c.save(); c.filter = 'blur(18px)'; c.globalCompositeOperation = 'lighter'; c.globalAlpha *= 0.75; c.strokeStyle = ACC; c.lineCap = 'round'; c.lineWidth = 3.5;
          c.beginPath(); for (const g of seg) { c.moveTo(g[0], g[1]); c.lineTo(g[2], g[3]); } c.stroke(); c.restore();
          // crisp pass with per-segment alpha
          c.save(); c.strokeStyle = ACC; c.lineCap = 'round'; const ga = c.globalAlpha;
          for (const g of seg) { c.globalAlpha = ga * g[4]; c.lineWidth = g[5]; c.beginPath(); c.moveTo(g[0], g[1]); c.lineTo(g[2], g[3]); c.stroke(); }
          c.restore();
          for (let k = 0; k < NPATH; k++) {
            if (t < lit(k)) break;
            const f = impulse(t, lit(k), 6), last = k === NPATH - 1;
            dot(c, px[k], py[k], 4 + 6 * f, PRI, 0.9);
            dot(c, px[k], py[k], 16 + 26 * f, ACC, 0.3 + 0.5 * f);
            if (last) { const pu = 0.5 + 0.5 * Math.sin(TAU * 8 * (t - lit(k))); dot(c, px[k], py[k], 22 + 14 * pu, ACC, 0.5); dot(c, px[k], py[k], 9, PRI, 1); }
          }
          c.restore();
        }

        // -- headline on a legibility band --
        const textA = 1 - ez(t, 7.74, 7.92, E.inQuad);
        const hp1 = remap(t, 5.6, 6.05), hp2 = remap(t, 5.75, 6.2);
        if (hp1 > 0 && textA > 0.01) {
          c.save(); c.globalAlpha *= textA;
          band(c, 1000, 600, 0.6 * clamp(hp1 * 2.5));
          const ho = { size: 150, family: FONTS.body, weight: 800, tracking: -0.045 * 150, color: PRI, stagger: 0.5, ease: E.outExpo };
          drawKinetic(c, 'Ich denke', CX, 880, ho, hp1, 'rise');
          withCamera(c, { zoom: 1 + 0.06 * impulse(t, 6.5, 14), ox: CX, oy: 1040 }, cc => drawKinetic(cc, 'tief.', CX, 1040, ho, hp2, 'rise'));
          // subline wipes left → right 6.6–7.0
          const sp = remap(t, 6.6, 7.0);
          if (sp > 0) {
            let sz = 50; const w = measureText(c, SUB, { size: sz, family: FONTS.head, weight: 500, tracking: 0.02 * sz });
            if (w > 880) sz = Math.max(46, Math.floor(sz * 880 / w));
            drawKinetic(c, SUB, CX, 1160, { size: sz, family: FONTS.head, weight: 500, tracking: 0.02 * sz, color: rgba(PRI, 0.8), ease: E.outCubic }, sp, 'wipe');
          }
          c.restore();
        }

        // -- 7.3 burst: the front node flares, ring + sparks, rising to the 7.95 flash --
        if (t >= 7.3) {
          const life = remap(t, 7.3, 7.85);
          shockwave(c, FLX, FLY, life, { radius: 1000, color: ACC, width: 12, alpha: 0.7 });
          burst(c, FLX, FLY, remap(t, 7.3, 7.9), { count: 70, color: ACC, radius: 420, seed: 33, alpha: 0.9 });
          const R = lerp(60, 260, ez(t, 7.3, 7.9, E.outCubic)) + 600 * ez(t, 7.88, 8.0, E.inQuad);
          const I = lerp(0.55, 1.0, ez(t, 7.3, 7.9)) + 0.5 * ez(t, 7.88, 8.0);
          flare(c, FLX, FLY, { color: ACC, size: R, intensity: I, streakLen: 2.6, ring: false });
          radialFill(c, FLX, FLY, R * 0.5, [[0, rgba(PRI, 0.9 * I)], [0.4, rgba(PRI, 0.35 * I)], [1, rgba(PRI, 0)]], 'lighter');
          const wash = ez(t, 7.75, 8.0, E.inQuad);
          if (wash > 0) radialFill(c, FLX, FLY, 1500, [[0, rgba(ACC, 0.55 * wash)], [0.45, rgba(ACC, 0.25 * wash)], [1, rgba(ACC, 0.05 * wash)]], 'lighter');
        }
      });

      FX.bloom = Math.max(FX.bloom, 0.2 + 0.25 * ez(t, 7.3, 7.95) + 0.15 * Math.exp(-6 * lt));
    }
  };
})();
