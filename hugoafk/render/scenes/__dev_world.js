/* dev harness for mc_world.js — the module author owns this file. NOT part of the film.
   NODE_PATH=/opt/node22/lib/node_modules node tools/render.js --html dev_world.html \
     --out out/dev_world --times 0.5,1.5,2.5,3.2,3.8,4.5,5.4,6.5,7.5 --workers 4

   Eight one-second panels:
     0..1 night · 1..2 day · 2..3 golden hour · 3..4 mid-pan (off-centre blocks + head-bob)
     4..5 F5 profile shot · 5..6 crack stages + particles
     6..7 ground only, day (does it read as distance?) · 7..8 ground only, golden hour   */

const DW = {};

// A pumpkin farm laid out the way the projection wants it: at z = 4 one block is 265 px,
// so a near row can only hold four of them. Pumpkins every other block in x AND z, so the
// ground shows between them and each one has to read as a block on its own.
DW.farm = function () {
  const c = [], pk = { top: 'pumpkin_top', side: 'pumpkin_side' };
  for (const z of [4, 6, 8, 10, 12]) for (let i = -8; i <= 8; i += 2) c.push({ x: i, z: z, tex: pk });
  // a two-high cobble wall well off centre — the side-face test
  for (let i = 2; i <= 4; i++) for (let y = 0; y < 2; y++) c.push({ x: i, z: 5.5, y: y, tex: 'cobblestone' });
  for (let i = -5; i <= -3; i++) c.push({ x: i, z: 5.5, tex: 'stone' });
  // an oak tree at mid depth
  for (let y = 0; y < 3; y++) c.push({ x: -6, z: 14, y: y, tex: { top: 'oak_log_top', side: 'oak_log_side' } });
  for (let dx = -1; dx <= 1; dx++) for (let dz = -1; dz <= 1; dz++) c.push({ x: -6 + dx, z: 14 + dz, y: 3, tex: 'oak_leaves' });
  c.push({ x: 7, z: 16, tex: 'spawner' });
  c.push({ x: 3, z: 18, tex: { top: 'oak_planks', side: 'chest' } });
  return c;
};

DW.label = function (ctx, s) {
  ctx.save(); ctx.fillStyle = 'rgba(0,0,0,0.62)'; ctx.fillRect(0, 1836, 1080, 60); ctx.restore();
  MC.text(ctx, s, 30, 1866, { size: 30, family: FONTS.silk, weight: 700, color: MC.C.WEISS, align: 'left' });
};

SCENES.__demo = {
  draw(ctx, lt, t) {
    MC.hudMode = 0;
    const seg = Math.min(7, Math.floor(t)), u = t - seg;

    // one view object per frame, handed to every world call
    const view = { t: t, phase: 'tag', camX: 0, bob: 0 };
    let label = '', cells = DW.farm(), showArm = true, showPlayer = false, ground = true;

    if (seg === 0) { view.phase = 'nacht'; label = 'NACHT · sky + 70 stars + moon + night haze'; }
    else if (seg === 1) { label = 'TAG · arm, blocks, treeline, per-strip fog'; }
    else if (seg === 2) { view.phase = 'gold'; label = 'GOLDSTUNDE · warm side faces + gold wash'; }
    else if (seg === 3) { view.camX = -5 + 10 * E.inOutCubic(u); view.bob = 1; label = 'PAN camX=' + view.camX.toFixed(2) + ' · off-centre blocks + head-bob'; }
    else if (seg === 4) { view.phase = 'gold'; showArm = false; showPlayer = true; label = 'F5 PROFIL · mcPlayer planted, blob shadow, nametag'; }
    else if (seg === 5) { label = 'BRUCH · crack stages 0..9 + break particles'; }
    else if (seg === 6) { cells = []; showArm = false; label = 'BODEN NUR · 30 Streifen + Fog, Tag — liest das als Distanz?'; }
    else { view.phase = 'gold'; cells = []; showArm = false; label = 'BODEN NUR · 30 Streifen + Fog, Goldstunde'; }

    if (seg === 5) {
      // ten stages spread over depth, so all ten are on one frame
      const zs = [2.2, 2.2, 3.0, 3.0, 4.2, 4.2, 6.0, 6.0, 8.5, 8.5];
      const xs = [-1, 0, -2, 1, -3, 2, -4, 3, -5, 4];
      cells = [];
      for (let i = 0; i < 10; i++) cells.push({ x: xs[i], z: zs[i], tex: { top: 'pumpkin_top', side: 'pumpkin_side' }, crack: i });
    }

    // ---- 1 · the world -------------------------------------------------------------
    MC.world(ctx, t, Object.assign(view, {
      tex: 'grass_top',
      strip: (z) => (z > 6.4 && z < 8.2) ? 'farmland' : (z > 13.5 && z < 17) ? 'water' : 'grass_top',
      ground: ground,
    }));

    // ---- 2 · the blocks ------------------------------------------------------------
    MC.blocks(ctx, cells, view);

    // ---- 3 · world-space extras, inside the same view transform ---------------------
    MC.withView(ctx, view, c => {
      if (seg !== 6 && seg !== 7) {
        MC.torch(c, -1.2, 5.0, { t: t, seed: 1 });
        MC.torch(c, 1.4, 5.0, { t: t, seed: 2 });
      }
      if (showPlayer) {
        MC.player(c, 0.4, 3.4, Object.assign({}, view, {
          name: 'HugoAFK', walk: u > 0.5 ? 1 : 0, swing: u > 0.5 ? 0 : 1, facing: 'right', stepRate: 4.4,
        }));
      }
      if (seg === 5) {
        for (let i = 0; i < 3; i++) {
          const f = MC.blockFace({ x: [-1, -3, -5][i], z: [2.2, 4.2, 8.5][i] }, view);
          MC.particles(c, f.cx, f.cy, t, 5.10 + i * 0.16, 'pumpkin', { s: f.s });
        }
      }
      if (seg === 0) {
        const f = MC.blockFace({ x: 0, z: 4 }, view);
        MC.particles(c, f.cx, f.cy, t, 0.30, 'pumpkin', { s: f.s });
      }
    });

    // ---- 4 · the first-person arm (camera-attached, outside the view transform) ------
    if (showArm) MC.arm(ctx, t, { swing: 1, swingHz: 2, phase: view.phase });

    // ---- 5 · golden-hour wash, last over the world ----------------------------------
    MC.goldWash(ctx, MC.skyOf(view).gold);

    DW.label(ctx, label);
  },
};
