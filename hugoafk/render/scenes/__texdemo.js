// temporary: textured block demo (rendered via a spare scene id)
SCENES.__texdemo = { draw(ctx, lt, t, dur) {
  fillBg(ctx, '#0B0812');
  // a small farm plot: grass + farmland rows with pumpkins, plus a spawner and a chest
  const cells = [];
  for (let ix = -3; ix <= 3; ix++) for (let iy = -3; iy <= 3; iy++) {
    const farm = (iy % 2 === 0);
    cells.push({ ix, iy, iz: 0, tex: farm ? { top: 'farmland', side: 'dirt' } : { top: 'grass_top', side: 'grass_side' } });
    if (farm && (ix + 3) % 2 === 0) cells.push({ ix, iy, iz: 1, tex: { top: 'pumpkin_top', side: 'pumpkin_side' } });
  }
  texField(ctx, cells, { cx: CX, cy: 700, size: 86 });
  blockIcon(ctx, 'spawner', 300, 1130, 150, { outline: '#000000', outlineAlpha: 0.35 });
  blockIcon(ctx, { top: 'oak_planks', side: 'chest' }, 540, 1130, 150);
  blockIcon(ctx, { top: 'grass_top', side: 'grass_side' }, 780, 1130, 150);
  // item icons for comparison
  const items = ['pumpkin', 'sea_pickle', 'emerald', 'gold_ingot', 'rotten_flesh', 'bone', 'string', 'gunpowder'];
  items.forEach((n, i) => itemIcon(ctx, n, 150 + (i % 4) * 260, 1400 + Math.floor(i / 4) * 200, 9));
  drawText(ctx, 'BLOCKS + ITEMS', CX, 380, { size: 44, family: FONTS.silk, weight: 700, color: T().text });
} };
