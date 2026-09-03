SCENES.__demo = { draw(ctx, lt, t, dur) {
  fillBg(ctx, '#0B0812');
  const S = 84, CY0 = 900;
  const cells = [];
  for (let ix = -4; ix <= 4; ix++) for (let iy = -4; iy <= 4; iy++) {
    const field = iy >= -1 && iy <= 2;
    cells.push({ ix, iy, iz: 0, tex: field ? { top: 'farmland_crop', side: 'dirt' } : { top: 'grass_top', side: 'grass_side' } });
    if (field && (ix + 4) % 3 === 0) cells.push({ ix, iy, iz: 1, tex: { top: 'pumpkin_top', side: 'pumpkin_side' } });
  }
  // a tree at the back
  for (let k = 0; k < 3; k++) cells.push({ ix: -4, iy: -4, iz: 1 + k, tex: { top: 'oak_log_top', side: 'oak_log_side' } });
  for (let dx = -1; dx <= 1; dx++) for (let dy = -1; dy <= 1; dy++) for (let dz = 0; dz < 2; dz++)
    cells.push({ ix: -4 + dx, iy: -4 + dy, iz: 4 + dz, tex: 'oak_leaves' });
  texField(ctx, cells, { cx: CX, cy: CY0, size: S });
  const gp = isoPos(0, -3, 0, { size: S, cx: CX, cy: CY0 });
  mcPlayer(ctx, gp.x, gp.y, { size: S, t: t, walk: 1, facing: 'left', outline: '#1A1208', outlineAlpha: 0.35 });
  const gp2 = isoPos(3, 0, 0, { size: S, cx: CX, cy: CY0 });
  mcPlayer(ctx, gp2.x, gp2.y, { size: S, t: t + 0.4, walk: 0, swing: 1, facing: 'right', held: { top: 'pumpkin_top', side: 'pumpkin_side' } });
  // item comparison row
  const items = ['pumpkin', 'sea_pickle', 'emerald', 'gold_ingot', 'bone', 'string'];
  items.forEach((n, i) => itemIcon(ctx, n, 150 + i * 150, 1500, 8));
  ['pumpkin_top', 'chest', 'spawner'].forEach((n, i) => blockIcon(ctx, n === 'pumpkin_top' ? { top: 'pumpkin_top', side: 'pumpkin_side' } : (n === 'chest' ? { top: 'oak_planks', side: 'chest' } : n), 250 + i * 300, 1700, 120));
} };
