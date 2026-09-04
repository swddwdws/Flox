# Promo render engine — API for scene authors

Everything is drawn on a 1080×1920 Canvas 2D (`W`, `H`, `CX`, `CY`) at 30 fps as a **pure function of time**.
A scene module lives in `render/scenes/sNN_name.js` and registers itself:

```js
SCENES.s03 = {
  draw(ctx, lt, t, dur, sc) {
    // lt  = local time since scene start (s), t = absolute time (s), dur = scene length (s)
    // sc  = the timeline entry {id, start, end, ...}
    // ctx = the scene canvas (already filled with TOKENS.bg). Draw everything here.
  }
};
```
Rules: never touch `engine.js`, `timeline.js`, `tokens.js`. Keep all state derivable from `t`/`lt` (create Particles/Warp instances at module top level with fixed seeds, never accumulate state between frames). Keep text inside `SAFE` = x 90..990, y 220..1700. Headlines ≥ 110 px, sublines ≥ 44 px.

## Tokens
`TOKENS` (`T()`): `bg, primary, secondary, accent, text, muted` hex colors; `FONTS.display|head|body|mono|tech|alt` → 'Unbounded' | 'Space Grotesk' | 'Inter' | 'JetBrains Mono' | 'Orbitron' | 'Syne' (all variable weight).

## Math / timing
`clamp(v,a,b)`, `lerp(a,b,t)`, `remap(t,a,b)`→0..1, `smoothstep(t)`, `E.outCubic|outExpo|outQuint|outBack|outElastic|inExpo|inOutCubic|...` easings,
`ez(t, from, to, easing)` → eased 0..1 between two times, `win(t, a, b, c, d)` → rises a..b, holds, falls c..d,
`impulse(t, t0, decay)` (exp decay after t0), `pulse(t, period, decay, offset)` (repeating), `beatLen(bpm)`,
`shake(t, seed, amp)` → {dx,dy,rot}, `hash1(n)`, `hash2(a,b)`, `rng(seed)()`, `noise1(x,seed)`, `fbm1(x,seed,oct)`, `noise2(x,y,seed)`, `fbm2(...)`.
Colors: `rgba(hex, a)`, `mixColor(h1,h2,t)`, `hexToRgb`.

## Text
- `drawText(ctx, str, x, y, {size, family, weight, color, align:'center'|'left'|'right', baseline, tracking, alpha, upper, glow:{color,blur}, stroke:{color,width}, strokeOnly, composite})`
- `measureText(ctx, str, opts)` → width
- `glowText(ctx, str, x, y, opts, blur=24, alpha=0.9)` — blurred additive halo + crisp copy
- `drawKinetic(ctx, str, x, y, opts, p, mode)` — per-character reveal, `p` 0..1. Modes: `rise` `drop` `blur` `scale` `type` `flicker` `track` `decode` `slideL` `slideR` `wipe`. Extra opts: `stagger` (0..1, default .55), `ease`, `dir` (1 | -1 | 0=from center), `from` (scale mode start scale), `spread` (track mode), `caret`, `caretColor`. Returns text width.
- `drawLines(ctx, [lines], x, y, opts, p, mode)` — multi-line block, `opts.lineHeight`, `opts.lineDelay`.
- `chromeGradient(ctx, y, size)` → gradient usable as `color` for a metallic title (`drawText(..., {color: chromeGradient(ctx, y, size)})`).
- `terminal(ctx, x, y, w, lines, p, {size, lineHeight, color, okColor, noteColor, caretColor})` — typewriter terminal block; `CODE_LINES` is a ready-made German/English code session.

## Light & particles
- `dot(ctx,x,y,r,color,alpha)` soft glowing point · `flare(ctx,x,y,{color,size,intensity,streak,streakLen,ring})` lens flare with anamorphic streak
- `lightSweep(ctx, pos 0..1, {angle,width,color,alpha})` diagonal light band across the frame · `speedLines(ctx,t,{count,color,speed,dir})`
- `hairline(ctx,x0,y0,x1,y1,p,{color,width,glowColor})` glowing line that draws on · `shockwave(ctx,x,y,life,{radius,color,width})` expanding ring
- `burst(ctx,x,y,life,{count,color,radius,seed})` particle explosion
- `new Particles({seed,count,size:[min,max],vel:{x,y},area,color,alpha,drift,twinkle})` then `.draw(ctx,t,{color,alpha,zoom,scale})` — drifting glow particles (wraps)
- `new Warp({seed,count,color,speed})` then `.draw(ctx,t,{cx,cy,speed,alpha,len,width})` — radial warp streaks toward the camera
- `radialFill(ctx,x,y,r,[[stop,color],...],composite)`, `linearFill(ctx,x0,y0,x1,y1,stops,rect,composite)`
- `glow(ctx, blur, alpha, fn)` — draws fn twice (blurred additive + crisp)

## Motion graphics / 3D
- `floorGrid(ctx,t,{horizon,camH,spacing,speed,color,alpha,rows,cols})` perspective grid rushing forward
- `tunnel(ctx,t,{count,spacing,speed,color,w,h,round,twist,alpha,lineWidth})` receding frames tunnel
- `rings(ctx,cx,cy,t,{radius,count,gap,speed,color,alpha})` dashed HUD rings · `brackets(ctx,x,y,w,h,p,{len,color,width})` HUD corners
- `constellation(ctx,t,{count,seed,color,color2,link,area,alpha,pulses,spread})` neural graph with travelling pulses (returns node positions)
- `project(x,y,z,{f,cx,cy})` perspective projection · `band(ctx,y,h,alpha)` legibility band · `pill(ctx,label,x,y,opts,p,sweep)` CTA pill · `progressBar(ctx,x,y,len,p,{vertical,color})`
- `withCamera(ctx,{zoom,x,y,rot,ox,oy},fn)` — draw fn under a camera transform (scene-local camera moves)
- `roundRect(ctx,x,y,w,h,r)` path helper · `makeCanvas(w,h)`

## Per-frame post FX (global object `FX`, reset every frame)
Scenes may raise: `FX.glitch` (0..1), `FX.rgb` (px), `FX.bloom` (0..1, default .22), `FX.bloomBlur`, `FX.flash` (0..1) + `FX.flashColor`, `FX.shake` (px), `FX.zoom`, `FX.x/y/rot`, `FX.blur`, `FX.grain` (default .05), `FX.vignette` (default .5), `FX.scan` (default .045), `FX.fade` (to black), `FX.invert`, `FX.whip`.
Use `Math.max(FX.glitch, v)` style so transitions still win.

## Timeline (owned by the integrator)
`TL.add(id, start, end)` and `TL.transitions.push({at, type: ['flash','punch'|'zoom'|'glitch'|'whip'|'shake'|'fade'|'rgb'|'stutter'|'invert'|'punchOut'], amount, color, dir, dur})`. Transition FX are applied automatically around the cut time; scenes only draw their own content.

## Preview
```
cd promo && export NODE_PATH=$(npm root -g)
node tools/render.js --out out/prev_s03 --times 5.1,5.4,6.0,6.8,7.6   # absolute times
python3 tools/sheet.py --frames out/prev_s03 --list 153,162,180,204,228 --cols 5 --out out/prev_s03/sheet.png --scale 0.3
```
Then look at the PNGs (single frames are 1080×1920).

## Added helpers
- `sphereCloud(ctx, t, {cx, cy, r, count, alpha, edgeAlpha, rot, tilt, spread, seed, color, size, link})` — fibonacci point sphere with neighbour edges, perspective projected; returns projected points.
- `drawKinetic` modes `rise`/`drop` accept `opts.rise` (px travel, default 0.6·size) and `opts.blurIn` (px of blur at start).

## Performance notes
- Every `stroke()`/`fill()`/`drawImage()` issued while `ctx.filter = 'blur(...)'` is set costs its own software blur pass (~30 ms at full frame). Inside `glow()` (or any blurred layer) build ONE path and stroke/fill it once; never loop many blurred strokes.
- `flare()` defaults to the accent colour; `SAFE.y1` is 1660.
- `drawKinetic(..., 'type')` caret blinks per typed character; pass `caretBlink: false` for a solid caret.

---

# HugoAFK additions — voxel / Minecraft toolkit

Fonts: `FONTS.pixel` = Press Start 2P (only very short strings — very wide), `FONTS.term` = VT323 (console/chat), `FONTS.silk` = Silkscreen 700 (compact pixel labels). Plus the existing Inter / Space Grotesk / JetBrains Mono / Orbitron / Syne / Unbounded.

## Logo assets (never redraw the logo by hand)
`IMG.logo` (1401×888, full lockup), `IMG.logoHugo` (1401×474, red top part), `IMG.logoAfk` (1401×414, violet bottom part), `IMG.meta` = `{scale:3, full:{w,h,bbox}, hugo:{w,h,bbox,offsetY:0}, afk:{w,h,bbox,offsetY:474}}`.
Draw the full lockup at width `w`:
```js
const M = IMG.meta, s = w / M.full.w;
ctx.drawImage(IMG.logo, x, y, M.full.w * s, M.full.h * s);           // top-left anchored
// or the two halves separately (for a split reveal), same scale, AFK offset by M.afk.offsetY * s:
ctx.drawImage(IMG.logoHugo, x, y, M.hugo.w * s, M.hugo.h * s);
ctx.drawImage(IMG.logoAfk,  x, y + M.afk.offsetY * s, M.afk.w * s, M.afk.h * s);
```
Keep the aspect ratio (1401:888). For a glow, draw the same image blurred underneath with `'lighter'` (cache it on an offscreen canvas if it is static — a per-frame `ctx.filter='blur()'` on a big image costs ~30 ms).

## Isometric voxels
- `isoPos(ix, iy, iz, {size, cx, cy})` → `{x, y, depth}`; +ix right-down, +iy left-down, +iz up.
- `cube(ctx, ix, iy, iz, {size, cx, cy, color, alpha, top, left, right, topF, leftF, rightF, outline, outlineAlpha, outlineWidth, composite})` — one shaded cube.
- `cubeField(ctx, cells, opts)` — `cells = [{ix, iy, iz, color, alpha, size}]`, drawn back-to-front automatically.
- `shade(hex, f)` — darken/lighten a hex colour.

## Pixel sprites & item icons
- `pixelSprite(ctx, x, y, cell, rows, palette, {align, baseline, alpha, rotate, composite})` — rows are strings, `.`/space = transparent.
- `itemIcon(ctx, name, x, y, cell, opts)` with `SPRITES`: `pumpkin, emerald, coin, spawner, check, cross, creeper, heart, bolt`. `cell` ≈ iconSize/8..10.

## Minecraft HUD
- `mcSlot(ctx, x, y, size, {selected, selColor, fill, alpha})`
- `mcHotbar(ctx, cx, y, {slot, gap, count, selected, items:[{slot, sprite, count}], alpha})`
- `mcChat(ctx, x, y, lines, {size, lineHeight, family, color, bg, bgColor, pad, alpha})` — `lines` are strings or `{t, c, a}`.
- `phoneFrame(ctx, cx, cy, w, {h, radius, body, edge, screen, bezel, draw(ctx,x,y,w,h)})` → inner screen rect.
- `crtCollapse(ctx, srcCanvas, p, {glow})` — CRT power-off, p 1→0.
- `nightSky(ctx, t, {count, seed, color, alpha, hMul, drift})`

## Safe area (TikTok)
`SAFE` = x 90..900, y 300..1420. TikTok covers the right rail and the bottom caption block — nothing that must be read may sit outside this box. Headlines ≥ 96 px, sublines ≥ 42 px.


## Scene time remapping
`TL.add(id, start, end, { src: [a, b] })` plays a scene that was authored for the window `[a, b]`
over the destination window `[start, end]`. The engine maps the time linearly and hands the scene
its ORIGINAL time base, so scene code keeps using the absolute seconds it was written with.
Prefer pure shifts (same duration) — a different duration also stretches the scene's internal
beat timing.

## Textured cubes inside cubeField
`cube()` / `cubeField()` accept `tex` (a texture name or `{top, side}`) per cell and draw a real
textured Minecraft block instead of flat shaded faces; `dark: 0..1` dims it for night scenes.
Available textures: grass_top, grass_side, dirt, farmland, pumpkin_top, pumpkin_side, spawner,
oak_planks, stone, chest, iron_block, violet_block, red_block.

---

# High-quality Minecraft world toolkit (second pass)

## Block textures (assets/tex.png)
`dirt, grass_top, grass_side, farmland, farmland_crop, pumpkin_top, pumpkin_side, spawner,
oak_planks, oak_log_side, oak_log_top, oak_leaves, cobblestone, stone, sand, water, chest,
iron_block, violet_block, red_block, player_skin, player_face, player_head_side, player_shirt,
player_pants, player_shoe`

Every textured face is cached per brightness level with baked ambient occlusion (side faces
darken towards the ground, top faces towards their edges), so a field of textured blocks reads
with real depth.

- `blockIcon(ctx, tex, x, y, size, {alpha, height, rotate, outline, ...})` — one isometric block,
  `tex` = `'name'` or `{top, side}` or `{top, left, right}`. (x, y) = centre of the top face.
- `texCube(ctx, ix, iy, iz, {tex, size, cx, cy, ...})` / `texField(ctx, cells, opts)` — blocks in
  isometric block coordinates, drawn back-to-front.
- `cube()` / `cubeField()` also accept `tex` per cell plus `dark: 0..1` (night dimming) and
  `darkColor`.
- `isoBox(ctx, x, y, bw, bd, bh, {size, tex, color, alpha, dark, outline})` — a cuboid of any
  proportions. (x, y) is the TOP-BACK corner. This is what the player model is built from.

## Player character
`mcPlayer(ctx, x, y, {size, t, walk, swing, facing, held, lift, alpha, dark, outline})`
A Minecraft-proportioned player (legs 0–0.75, body 0.75–1.5, head 1.5–2.0 blocks, so two blocks
tall) standing on the block whose TOP FACE is at (x, y) — get that with
`isoPos(ix, iy, iz, {size, cx, cy})`. `walk` 0..1 drives the leg/arm cycle, `swing` 0..1 the
mining swing, `facing` `'left'|'right'` puts the face on that side, `held` draws a small block in
the front hand (e.g. `{top:'pumpkin_top', side:'pumpkin_side'}`).
Draw the player AFTER the blocks behind it and BEFORE the blocks in front of it — split the field
by depth (`ix + iy`) around the player's tile if blocks must occlude it.
