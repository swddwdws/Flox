/* ===================================================================================
   DIE SCHICHT — shared kit, part 2 of 4: THE WORLD.
   Loaded straight after mc_kit.js, before mc_gui.js / mc_hud.js and every scene file.

   ~45 % of the film's runtime is a world shot. If the world reads as flat horizontal
   colour ridges or as cardboard cut-outs on a sliding floor, the whole direction fails,
   so this file implements DIRECTION.md §10.2 to the letter:

     horizon  yH = 700 · focal C = 1060 px/block at z = 1 · ground K = 1717 (= C · 1.62)
     ground   y(z)  = 700 + 1717/z          block edge  s(z) = 1060/z
     screen   x(wx) = 540 + (wx - camX) * 1060/z
     pitch    atan((960-700)/1060) = 13.8 deg down

   26 ground strips on a geometric z ladder, one pattern fill each; per-strip fog beyond
   z = 6; a hill ridge and a treeline at the horizon; blocks projected through their exact
   8 corners with the top face sliced 6/3/1 by depth and the side face sliced 3 whenever
   the block is far enough off centre to show one.

   The two ENTITIES that carry the film are built out of exactly the same three faces:
   MC.player is a native F5 profile of the bot (engine.js's isometric mcPlayer is NOT used
   — it cannot be planted in a perspective world), and MC.arm is a foreshortened
   first-person limb, wide at the fist and narrow at the elbow.

   Everything is a pure function of t. Cloud, star, hill, tree, crack and particle tables
   are built once, at module load, from rng()/hash2(). No wall clock, no unseeded randomness,
   no state that survives a frame. Nothing on DIRECTION.md §2's list is called, no canvas
   filter is ever set, and no post-chain value is touched — grep this file for §2's names and
   the only survivor is MC.particles, which is the name §10.1 assigns to this module.
   =================================================================================== */

/* ===================================================================================
// API:
//
//   Everything below is on the global MC. Every function is a pure function of its
//   arguments. All lookup tables are built once at module load; nothing is allocated
//   per frame except one sky gradient.
//
// ---------------------------------------------------------------------------------
// THE SHARED VIEW OBJECT — read this first
// ---------------------------------------------------------------------------------
//   MC.world, MC.blocks, MC.player, MC.torch, MC.withView, MC.blockFace and MC.camX ALL
//   read the same option object. Build ONE per frame and hand the same reference to every
//   call, or the sky, the ground, the blocks and the entities will drift apart from each
//   other. MC.arm is the ONE exception — it is camera-attached and takes its own options:
//
//       const view = { t: t, phase: 'tag', camX: 0, bob: 0 };
//       MC.world(ctx, t, view);            // sky + ground + horizon
//       MC.blocks(ctx, cells, view);       // the block field + every entity cell
//       MC.withView(ctx, view, c => { ...world-space extras... });
//       MC.arm(ctx, t, { swing: 1 });      // camera-attached, NOT in the view transform,
//                                          // and NOT drawn at all while a GUI is open —
//                                          // see MC.armHidden (APPENDIX B5) below
//       MC.goldWash(ctx, k);               // last, over everything above
//
//   view keys (all optional):
//     t       number  film clock in seconds. MC.world(ctx,t,o) stamps o.t = t for you,
//                     so if MC.world is called first the others can rely on it.
//     phase   'nacht' | 'tag' | 'gold'                             default 'tag'
//     toGold  0..1    blend `phase` toward golden hour (S8 22.0->23.0)  default 0
//     camX    number  camera x in BLOCKS, not px (+1 = look right one block)  default 0
//     idle    bool    add the constant ±1.2 px/s idle drift (§6.1)   default true
//     bob     0..1    walk head-bob: ±7 px @ 0.85 Hz + ±0.35 deg roll  default 0
//     pitch   number  extra downward view offset in px (the 6 px mining nudge)  default 0
//     haze    0..1    base fog added to every strip / block / tree.
//                     default 0.50 when phase==='nacht', else 0
//     warm    0..1    golden-hour warming on visible side faces.
//                     default = the resolved gold blend (0 by day, 1 at 'gold')
//
// ---------------------------------------------------------------------------------
// MC.texQuad(ctx, img, p0, p1, p2, p3, n)                         -> undefined
// ---------------------------------------------------------------------------------
//   THE one new primitive: a textured GENERAL quad. engine.js's _face() is affine and
//   can only draw a parallelogram, so it cannot draw a perspective trapezoid; this draws
//   the quad as `n` affine slices taken along the v axis, each fitted symmetrically
//   (average of the slice's two u edges) so the residual error is a quarter of the naive
//   "use the top edge" fit, and each slice overlaps the next by 1 px so no hairline seam
//   can open between them.
//     ctx  CanvasRenderingContext2D
//     img  any canvas/image (a texFace() canvas, normally). null/undefined -> no-op.
//     p0   [x,y]  texture (u=0, v=0)      p1 [x,y]  texture (u=1, v=0)
//     p2   [x,y]  texture (u=1, v=1)      p3 [x,y]  texture (u=0, v=1)
//                 i.e. p0->p1 is the u edge, p0->p3 is the v edge; wind them p0,p1,p2,p3
//                 around the quad or it turns inside out.
//     n    int >= 1, number of slices ALONG v. Slicing is along v only — orient the quad
//          so that v runs along the axis the trapezoid narrows on. For an exact result
//          n must divide img.height (this file feeds it 96 px face canvases, so 1/3/6
//          all divide); with a fractional slice the source rows land on sub-texel
//          boundaries and the slices can shift against each other.
//   Sets imageSmoothingEnabled = false for the whole call. Leaves ctx unchanged.
//
// ---------------------------------------------------------------------------------
// projection + view
// ---------------------------------------------------------------------------------
// MC.proj(wx, hy, z, camX)  -> [x, y]
//   The film's projection, exactly §10.2. wx = world x in blocks, hy = height above the
//   ground plane in blocks (0 = the surface the player walks on, 1 = the top of a block
//   resting on it), z = depth in blocks (must be > 0), camX in blocks (default 0).
//
// MC.camX(o) -> number
//   The resolved camera x in blocks: (o.camX||0) + idle drift, using o.t. Use it whenever
//   you need to place something in world space by hand.
//
// MC.idleDrift(t) -> number (blocks)
//   The §6.1 idle drift: a sine of period 11 s whose peak speed is 1.2 px/s at z = 4.
//   Amplitude 0.0079 blocks = ±6 px at the bottom of the frame, ±0.3 px at the horizon.
//
// MC.viewOffset(t, o) -> {dy, rot}
//   The resolved head-bob for the view object o: dy in px (bob + o.pitch), rot in radians.
//
// MC.withView(ctx, o, fn)  -> undefined
//   Applies the same translate/rotate MC.world and MC.blocks use, calls fn(ctx), restores.
//   Wrap ANY extra world-space drawing (particles, crack overlays, signs, entities) in it
//   so it bobs with the world instead of sitting on the world like a sticker.
//
// MC.skyOf(o) -> {top, hor, cloud, gold, night}
//   Resolves phase/toGold into the two sky colours, the cloud colour, the 0..1 gold blend and
//   a night flag. `hor` is also the fog colour — mc_gui / mc_hud and the scenes can read it,
//   e.g. `MC.goldWash(ctx, MC.skyOf(view).gold)`. NOTE: with toGold strictly between 0 and 1
//   the three colours come back as 'rgb(r,g,b)' text, not as a #hex, because they are
//   mixColor() output — fine for fillStyle, but do not hand them to shade().
//
// MC.fogAlpha(z, o) -> 0..1
//   §10.2 exactly: clamp((z-6)/20) * 0.55 + haze, capped at 0.92. The fog every BLOCK, tree
//   and fence post is re-filled with, in the sky's horizon colour. The single highest-value
//   addition in the whole file: without it the world is horizontal colour ridges, not distance.
//   The ground strips carry a second, internal term that closes their fog to a full 1.0
//   by z = 38, because the ground plane — unlike a block — recedes to infinity at the
//   horizon line and has to arrive at the sky colour rather than stop short of it.
//
// MC.Z -> number[31]
//   The ground strips' depth ladder, z_k = 1.4 * 1.1189^k, k = 0..30 (1.400 .. 40.67).
//   Strip k spans y(Z[k+1]) .. y(Z[k]), so there are 30 strips. §10.2's 26 (out to z = 25.94,
//   y = 766) plus four more rungs of the same ladder out to y = 742 — 5-7 px each, four extra
//   fills — because a ground plane that stops at z = 26, where the fog ramp is only 0.55,
//   leaves a hard colour line along the horizon that no amount of treeline hides.
//
// ---------------------------------------------------------------------------------
// MC.world(ctx, t, o)                                             -> undefined
// ---------------------------------------------------------------------------------
//   Sky gradient + stars + sun/moon + three parallax cloud rows + the horizon fill + the
//   hill ridge + the treeline + the 30 ground strips + the per-strip fog, in that order, all
//   inside the view transform. It is the bottom layer: it draws nothing over the HUD and
//   nothing inside a GUI, and it stamps o.t = t on the view object for the calls that follow.
//   o = the shared view object, plus:
//     tex      string  ground texture name          default 'grass_top'
//     strip    fn(z,k) -> texture name, per strip; overrides `tex` when given (S4 uses it
//                      for the water basin). Called once per strip per frame (30x) with the
//                      strip's mid depth and its index k.
//     clouds   bool    draw the three cloud rows    default true
//     stars    bool    draw the 70 night stars      default true (night only anyway)
//     sun      bool    draw the sun / the moon      default true
//     horizon  bool    draw the hill ridge + treeline + the two far fence posts  default true
//                      (42 trees at z 30..50 with short trunks under wide crowns, so the
//                      overlapping canopies read as one distant mass rather than as §10.2's
//                      literal z 26..30 row, which came out as a picket fence; two oak fence
//                      posts at z 21 / 23; a 16 px hill ridge at y 690..706 with blocky bumps
//                      on it, in the horizon colour mixed 0.70 toward the sky)
//     fog      bool    draw the per-strip fog       default true
//     ground   bool    draw the 30 ground strips    default true
//     sunX,sunY   number  offset the day/golden sun in px          default 0, 0
//     moonX,moonY number  absolute moon centre in px               default 770, 400
//   Sun/moon geometry is §3.1 exactly: 78x78 #FFF3C4 day sun at (330,380), 92x92 #FFE9A8
//   golden sun at (300,640), 78x78 #EDEDF2 moon with a 26x26 sky-coloured phase notch.
//
// MC.goldWash(ctx, k)  -> undefined
//   The §3.1 GOLD_WASH: rgba(255,168,74,0.16*k) multiplied over the whole frame. Call it
//   AFTER world + blocks + arm and BEFORE any GUI, dim or HUD. k = 0 is a no-op.
//
// ---------------------------------------------------------------------------------
// MC.blocks(ctx, cells, o)                                        -> undefined
// ---------------------------------------------------------------------------------
//   The perspective block field. One sort per frame, painter's order by descending z.
//   cell = {
//     x     number  world x of the block's LEFT edge in blocks     (required)
//     z     number  depth of the block's NEAR face in blocks       (required, > 1.25)
//     draw  fn(ctx, cell, view)  ENTITY CELL. When present the cell draws NO faces at all: the
//                   callback is invoked instead, at this cell's place in the painter's
//                   sort, already inside the view transform and inside its own save /
//                   restore (globalAlpha is restored for you). Only `z` is required on
//                   such a cell, and it may be <= 1.25. This is how a torch, the bot, the
//                   oak sign, a falling item or any other non-cube thing gets the right
//                   occlusion against the block field:
//                   The third argument is the SAME view object MC.blocks was handed, and
//                   you almost always want to spread it, because MC.torch and MC.player
//                   resolve camX out of their own options and default it to 0:
//                       cells.push({ z: 4.0, draw: (c, _, v) =>
//                         MC.torch(c, -1.25, 4.0, Object.assign({}, v, { seed: 1 })) });
//                   Drawing entities before or after MC.blocks instead puts them behind
//                   EVERY block or in front of EVERY block, and one of those is always
//                   wrong the moment the field has depth on both sides of them.
//     y     number  height of the block's BOTTOM above the ground plane, in blocks.
//                   0 = resting on the ground. default 0
//     tex   string | {top, side, front, left, right}  texture name(s). default 'stone'
//     crack 0..9    draw MC.break at that stage on the front face. default none
//     alpha 0..1    default 1
//     warm  0..1    per-cell override of o.warm
//     skip  bool    truthy -> the cell is not drawn (cheaper than filtering the array)
//   }
//   Faces, per §10.2:
//     front face — constant depth, projects to an EXACT axis-aligned rect: one drawImage.
//                  texFace(name, 1) — mid brightness.
//     top face   — a trapezoid, sliced 6 (z<6) / 3 (6<=z<12) / 1 (z>=12) along depth.
//                  texFace(name, 0) — brightest. Skipped once the top is above eye height
//                  (y+1 >= 1.62), because from 13.8 deg down you no longer see it.
//     side face  — drawn ONLY when |screen centre x - 540| > 300 px, sliced 3 along depth.
//                  texFace(name, 2) — darkest, and transposed so the texture stays upright
//                  while the slicing axis runs along depth. The left face shows on blocks
//                  right of centre, the right face on blocks left of centre. Without this
//                  face, off-centre blocks read as flat cut-outs.
//   Fog: every face is re-filled with the sky's horizon colour at MC.fogAlpha(z, o).
//   Golden hour: the visible side face gets an extra rgba(255,168,74,0.18*warm) — §9's
//   "warm the west-facing faces". There are NO block cast shadows, by direction.
//   o = the shared view object (uses t, camX, idle, bob, pitch, phase, toGold, haze, warm),
//   plus: alpha (0..1, whole field) and fog (bool, default true).
//
// MC.blockFace(cell, o) -> {x, y, w, h, cx, cy, s, z, on, dy}
//   The projected front-face rect of one cell — for placing crack overlays, particles, item
//   pops, sign boards and toast anchors on a block. Coordinates are in VIEW space, i.e. they
//   are what you draw with INSIDE MC.withView (which is where world-space extras belong).
//   Outside the view transform, add `dy` (the resolved head-bob offset); the < 7 px roll is
//   ignored either way. s = the block edge in px at that depth, z = the cell's near depth,
//   on = false when the cell is culled (behind the near plane or off the sides).
//
// ---------------------------------------------------------------------------------
// MC.arm(ctx, t, o)                                               -> undefined
// MC.armHidden  (bool, per-frame flag)
// ---------------------------------------------------------------------------------
//   THE VIEWER'S OWN RIGHT ARM, coming in from the bottom-right corner. A player_shirt
//   sleeve of very nearly constant width, a hard cuff, and a player_skin FIST at the far
//   end that steps out one notch wider than the wrist. On top of that: the inner (left)
//   side face as a sheared strip a flat step darker (that step is what makes the limb a
//   BOX rather than a decal), a knuckle band across the far third of the fist, two grooves
//   running along it for the fingers, and a flat contact shade down the outer edge. Every
//   face is drawn in segments of roughly SQUARE texel aspect, because a 16 px tile pulled
//   over 500 px is vertical smear. Bobs ±9 px at 0.9 Hz. Camera-attached: it is NOT inside
//   the world's view transform, so call it AFTER MC.blocks and BEFORE MC.goldWash / any
//   dim / any GUI.
//   RE-GATE, `taper`: the build-gate default was 0.52, i.e. the limb was barely half as
//   wide at the frame corner as at the fingertips. That silhouette is a spade, not an arm;
//   it also has the foreshortening backwards, because in first person the elbow is the end
//   nearest the eye and the fist is held out in front. Three variants (0.52 / 0.78 / 0.92)
//   were rendered side by side on gate page 8 and the default is now 0.88 — a limb that is
//   almost straight-sided, with the fist a small step wider than the sleeve because a
//   closed hand is.
//   BUILD-GATE DEVIATION from §5.2's literal "pivot (800,1800), sleeve 150x320 at
//   -0.42 rad": at 150 px across on a 1080 px frame the arm is a violet pencil, and at
//   -0.42 rad it enters too steeply to read as the viewer's own limb. Pass
//   w/len/hand/tail/taper/x/y/rot to go back to any other geometry.
//
//   APPENDIX B5 — THE ARM IS NOT DRAWN WHILE A GUI IS OPEN. Vanilla does not draw the
//   held item behind an open screen. Two ways to obey it, and every scene that opens a
//   panel MUST use one of them:
//       MC.armHidden = true;            // per-frame flag, exactly like MC.hudMode
//       MC.arm(ctx, t, { hidden: true });   // or per call
//   Either one makes MC.arm a no-op.
//   RE-GATE: MC.armHidden is now CLEARED FOR YOU at the end of every frame, by
//   MC.hudReset() inside mc_hud's MC.hud() — which TL.overlay runs after every single
//   frame of the film. So it behaves exactly like MC.hudMode: set it on EVERY frame you
//   want the arm gone, and a scene that forgets to clear it cannot silently lose the arm
//   for the remaining 800 frames. The one asymmetry with MC.hudMode: the arm is drawn by
//   the SCENE, not by the overlay, so the flag must be set BEFORE the MC.arm call, not
//   merely somewhere in the frame.
//   o:
//     swing   0..1   mining swing amount                     default 0
//     swingHz number swings per second                       default 2 (S4 uses 4 = eighths)
//     swingT0 number phase origin of the swing, in seconds   default 0
//     bob     0..1   idle bob amount                         default 1
//     drop    0..1   slide the arm out of frame (S6 14.50)   default 0 (1 = 760 px down)
//     hidden  bool   B5: skip the call entirely              default false
//     held    string|{top,side}  block texture in the fist   default none
//     heldSize number fraction of the arm width the held block spans   default 0.48
//     x, y    number pivot (the elbow, off the bottom edge)  default 1000, 1890
//     w       number FIST width in px — the limb's widest    default 252
//     len     number pivot -> fingertips along the arm axis  default 520
//     hand    number length of the bare-skin fist            default 128
//     tail    number sleeve length past the pivot            default 300
//     taper   0..1   limb width at the elbow / at the fist   default 0.88
//     rot     number base rotation in radians                default -0.62
//     alpha   0..1                                            default 1
//     dark    0..1   flat black over the whole arm (night).   default 0, or 0.42 if
//                    o.phase === 'nacht' — so passing the shared view's phase through works
//     phase   only read for that default. NOTE: MC.arm takes its OWN option object, not the
//                    shared view — spreading the view into it would set bob to 0.
//   The fist rests around (700, 1480) and the limb leaves the frame at the bottom-right
//   corner, i.e. inside §5.4's "the band y 1400..1700 is filled by the first-person arm".
//   MC.armSwing(t, o) -> 0..1 returns the same swing phase the arm is using, so a scene
//   can land a crack stage or the 6 px pitch nudge on the exact frame the arm bottoms out.
//
// ---------------------------------------------------------------------------------
// MC.break(ctx, x, y, s, stage, o)                                -> undefined
// ---------------------------------------------------------------------------------
//   The 10-stage crack overlay. (x, y) = the CENTRE of the face, s = its width in px,
//   stage = 0..9 (anything outside that range draws nothing). Ten 16x16 sprites are
//   pre-rendered at module load — six cracks radiating from the centre, each one step
//   longer per stage — so this is a single drawImage.
//   o: {alpha (default 1), h (face height in px, default s)}
//
// MC.breakStage(t, t0, dur) -> -1 | 0..9
//   The stage a block started at t0 and taking dur seconds is on at t. -1 before t0 and
//   after it has broken, so `if (st >= 0) MC.break(...)` is the whole idiom.
//
// ---------------------------------------------------------------------------------
// MC.particles(ctx, x, y, t, t0, kind, o)                         -> undefined
// ---------------------------------------------------------------------------------
//   Break particles from MC.C.STAUB. (x, y) = the centre of the face that broke, t0 = the
//   moment it broke. kind = 'pumpkin' | 'sea_pickle' | 'spawner' | 'farmland' (anything
//   else falls back to 'pumpkin'). 14 square particles pop up and fall under gravity and
//   fade over the last 30 % of their life. Velocities come from a module-level table.
//   o: {count (default 14, max 24), s (block size in px, default 200 — scales spread,
//       particle size and gravity), life (seconds, default 0.75), alpha (default 1),
//       spread (default 1)}
//
// ---------------------------------------------------------------------------------
// MC.player(ctx, wx, z, o)                          -> {x, y, size, top} | null
// ---------------------------------------------------------------------------------
//   THE BOT, as an F5 side-on PROFILE, planted on the ground plane at world (wx, z), and
//   drawn NATIVELY in this file's perspective projection. It does NOT call engine.js's
//   mcPlayer any more: mcPlayer is an isometric construction, and dropping it into a
//   perspective world is what produced a far arm floating detached at chest height, a
//   near hand hanging off the hip as a separate tan box, two legs merged into one dark
//   mass and a head a third too large. Every part is now built from the same three faces
//   MC.blocks draws — an exact near face, one MC.texQuad side face, a top face where one
//   is visible — so the bot sits in the same projection as the blocks around it.
//
//   Vanilla body plan, in skin pixels (16 px = 1 block), exactly as the game models it:
//       legs 12 tall (4 deep x 4 wide) · torso 12 tall (4 deep x 8 wide)
//       arms 12 tall (4 x 4), hung from the shoulder outside the torso · head 8 cubed
//   Total 32 px = 2.000 blocks, head exactly a quarter of the height. (DIRECTION.md says
//   "1.875 blocks (legs 0.75, torso 0.75, head 0.5)"; those three numbers sum to 2.000,
//   which is the real vanilla model, and 2.000 is what is built.) Seen from the side the
//   head is 0.5 deep over a 0.25-deep body, and that overhang is most of the read.
//
//   Call it as an ENTITY CELL of MC.blocks (§B4) so it occludes correctly:
//       cells.push({ z: 3.4, draw: (c, _, v) => MC.player(c, 0.86, 3.4,
//                     Object.assign({}, v, { name: 'HugoAFK', facing: 'right' })) });
//   Spread the shared view into it, as with MC.torch: it resolves camX/idle/t/phase/haze
//   out of its OWN option object. Called bare inside MC.withView it lands in front of (or
//   behind) the whole field.
//
//   WHICH WAY TO FACE IT, AND WHERE TO STAND IT. The face is on ONE side of the head and
//   the geometry decides whether you can see it: the +x face of a box is visible only
//   from x > that face, i.e. only when the bot stands LEFT of the frame centre. So
//       facing 'right' shows the face when the bot is LEFT of x 540,
//       facing 'left'  shows the face when the bot is RIGHT of x 540,
//   and the other placement shows the back of the head (player_head_side, hair mirrored
//   to the correct side). Both are correct Minecraft; only one has eyes in it. §6.2's four
//   F5 shots should be laid out so the bot faces the middle of the frame.
//   o:
//      t      number  the film clock (drives the walk phase and the idle bob)
//      walk   0..1    full walk cycle: legs scissor, arms COUNTER-swing the legs
//      stepRate number steps per second * PI                   default 4.4 (§S9)
//      swing  0..1    mining chop on the near arm
//      swingHz number chops per second                          default 2
//      swingT0 number phase origin of the chop, in seconds      default 0
//                     (the same phase MC.armSwing(t, o) returns, so a scene can land a
//                      crack stage on the frame the bot's arm bottoms out)
//      facing 'right' | 'left'                                  default 'right'
//      bob    number  idle bob amplitude in blocks              default 0.010
//      lift   number  blocks above the ground plane             default 0
//      held   string|{top,side}  block in the near fist         default none
//      scale  number  multiplies every body dimension           default 1 = the exact
//                     projected size, i.e. 2.000 blocks tall at that depth. At z 3.4 that
//                     is 624 px; a scene that wants the bot smaller shrinks `scale`, it
//                     does not move it, because the depth also sets the occlusion.
//      size   number  px per block — an alternative spelling of scale, kept because §S1
//                     says "size 150": scale = size / MC.blockPx(z). Ignored if `scale` is
//                     given. size 150 at z 3.4 is scale 0.48 and reads doll-sized.
//      shadow 0..1    blob shadow alpha, default 0.35; 0 removes it. Its two radii are the
//                     real projected footprint of a 0.68-block disc on the ground plane.
//      alpha  0..1    default 1
//      dark   0..1    flat black over every face                default 0
//      fog    bool    re-fill every face at MC.fogAlpha(z, o)   default true (so the bot
//                     hazes at night exactly like the blocks it stands among)
//      warm   0..1    golden-hour warming on the visible side face. default = the view's
//                     resolved gold blend, same rule as MC.blocks.
//      name   string  nametag, e.g. 'HugoAFK'. Drawn 34 px above the top of the head in
//                     VT323 32 weight 400 white on rgba(0,0,0,0.26). default none
//      camX / idle / phase / toGold / haze — taken from o, i.e. from the shared view
//   Returns {x, y} = the foot point on the ground plane, size = px per block, top = the
//   screen y of the top of the head (for anchoring anything above it). Returns null for
//   z <= 0.2.
//   NOT for §S5's inventory portrait. RE-GATE, and this supersedes what this block said
//   before: mc_gui.js now owns that figure as MC.portrait(ctx, x, y, w, h, o) — a
//   FRONT-FACING flat elevation built from the player_* atlas tiles, drawn for you inside
//   MC.inventory(). Do not call engine.js's mcPlayer for it either: MC.portrait is the one
//   the film uses, and it is the only place a scene should draw the bot in screen space.
//   MC.player is the world-space F5 entity and nothing else.
//
// MC.torch(ctx, wx, z, o)  -> undefined
//   An oak fence post with a torch on it at world (wx, z), flickering at 7 Hz with a
//   0.22-alpha ground pool. The post is drawn from texFace level 0 (the brightest of the
//   three, the same level the ground strips use) in stacked segments of square texel
//   aspect, with a flat shade down its far edge and the per-depth fog on top: at level 1
//   with the baked AO gradient and one tile pulled over 400 px it came out near-black, a
//   burnt pole instead of a lit fence post. Put it in the depth sort as an ENTITY CELL of
//   MC.blocks:
//       cells.push({ z: 4.0, draw: (c, _, v) =>
//         MC.torch(c, -1.25, 4.0, Object.assign({}, v, { seed: 1 })) });
//   A torch at z 4 must be hidden by a block at z 3 and must cover one at z 5, and its
//   ground pool is a translucent ellipse that shows the mistake immediately. Called inside
//   MC.withView instead, it lands in front of (or behind) the WHOLE field.
//   READ THIS: like MC.player, MC.torch resolves the camera out of ITS OWN option object
//   (o.camX, o.idle, o.t) and DEFAULTS camX TO 0. Passing the convenient-looking
//   `{ t: t, seed: 1 }` therefore pins the torch to world x as seen from camX 0, and the
//   moment a scene pans (S4 goes to +9.0 blocks, S9 to -5.4) the torch silently leaves the
//   frame. Always spread the shared view into it.
//   o: {t (required — drives the flicker AND the idle drift),
//       camX (BLOCKS, default 0 — the shared view's camX; see the warning above),
//       idle (bool, default true), h (post height in blocks, default 1.5),
//       size (flame edge in px at z = 5, scaled with the block size, default 24),
//       pool (0..1, ground pool alpha, default 0.22), seed (int, offsets the flicker),
//       fog (bool, default true — the POST takes the per-depth fog, the flame never does,
//            because a torch is a light source and must stay bright through the haze),
//       phase / toGold / haze — read for the fog colour, so spread the shared view}
//
=================================================================================== */

(function () {
  'use strict';
  const C = MC.C;
  const YH = MC.YH, F = MC.FOCAL, K = MC.K, EYE = 1.62;

  /* ---------------------------------------------------------------- projection */
  MC.proj = function (wx, hy, z, camX) {
    const q = F / z;
    return [540 + (wx - (camX || 0)) * q, YH + (EYE - hy) * q];
  };

  // §6.1: ±1.2 px/s, sine of period 11 s. Expressed in blocks so that near rows sweep and
  // the horizon barely moves — the same parallax law as the two scripted pans.
  const IDLE_A = (1.2 * 11 / (Math.PI * 2)) * 4 / F;      // 0.0079 blocks
  MC.idleDrift = t => IDLE_A * Math.sin((Math.PI * 2) * (t || 0) / 11);
  MC.camX = o => ((o && o.camX) || 0) + ((o && o.idle === false) ? 0 : MC.idleDrift(o && o.t));

  // §6.1: 0.85 Hz head-bob, ±7 px vertical, ±0.35 deg roll, while the bot walks.
  MC.viewOffset = function (t, o) {
    o = o || {};
    const b = o.bob || 0, ph = (Math.PI * 2) * 0.85 * t;
    return { dy: -7 * b * Math.sin(ph) + (o.pitch || 0), rot: (0.35 * Math.PI / 180) * b * Math.sin(ph + Math.PI / 2) };
  };

  function pushView(ctx, t, o) {
    const v = MC.viewOffset(t, o);
    ctx.save();
    ctx.translate(540, 960); ctx.rotate(v.rot); ctx.translate(-540, -960 + v.dy);
    ctx.imageSmoothingEnabled = false;
    return v;
  }
  MC.withView = function (ctx, o, fn) {
    o = o || {};
    pushView(ctx, o.t || 0, o);
    try { fn(ctx); } finally { ctx.restore(); }
  };

  /* ---------------------------------------------------------------- sky resolve */
  MC.skyOf = function (o) {
    o = o || {};
    const p = o.phase || 'tag';
    let top, hor, cloud, gold;
    if (p === 'nacht') { top = C.NACHT_TOP; hor = C.NACHT_HORIZONT; cloud = C.WOLKE; gold = 0; }
    else if (p === 'gold') { top = C.GOLD_TOP; hor = C.GOLD_HORIZONT; cloud = C.WOLKE_ABEND; gold = 1; }
    else { top = C.TAG_TOP; hor = C.TAG_HORIZONT; cloud = C.WOLKE; gold = 0; }
    const k = clamp(o.toGold || 0);
    if (k > 0 && p !== 'gold') {
      top = mixColor(top, C.GOLD_TOP, k); hor = mixColor(hor, C.GOLD_HORIZONT, k);
      cloud = mixColor(cloud, C.WOLKE_ABEND, k); gold = k;
    }
    return { top: top, hor: hor, cloud: cloud, gold: gold, night: p === 'nacht' };
  };
  // sky colours can be a hex or an 'rgb(r,g,b)' (mixColor's output); this puts either at an alpha
  function withA(col, a) {
    if (col.charCodeAt(0) === 35) return rgba(col, a);
    return col.replace('rgb(', 'rgba(').replace(')', ',' + a + ')');
  }
  const hazeOf = o => (o && o.haze != null) ? o.haze : ((o && o.phase) === 'nacht' ? 0.50 : 0);
  // §10.2, exactly: objects (blocks, trees, fence posts) fade 0 -> 0.55 between z = 6 and 26.
  MC.fogAlpha = function (z, o) { return Math.min(0.92, clamp((z - 6) / 20) * 0.55 + hazeOf(o)); };
  /* The ground plane is the one surface that recedes to infinity at the horizon line, so its
     fog carries a second term that closes the last 0.45 between z = 16 and z = 38. At the
     last strip (z = 40.7) it is 1.0 and the ground meets the sky with no seam at all. Objects
     do NOT get this term — a tree at z = 40 is at a finite distance and must stay readable. */
  function groundFog(z, o) { return Math.min(1, clamp((z - 6) / 20) * 0.55 + clamp((z - 16) / 22) * 0.45 + hazeOf(o)); }

  /* ------------------------------------------------------- the one new primitive */
  MC.texQuad = function (ctx, img, p0, p1, p2, p3, n) {
    if (!img) return;
    n = Math.max(1, n | 0);
    const IW = img.width, IH = img.height, sh = IH / n;
    ctx.save(); ctx.imageSmoothingEnabled = false;
    for (let i = 0; i < n; i++) {
      const v0 = i / n, v1 = (i + 1) / n;
      const a0x = p0[0] + (p3[0] - p0[0]) * v0, a0y = p0[1] + (p3[1] - p0[1]) * v0;
      const b0x = p1[0] + (p2[0] - p1[0]) * v0, b0y = p1[1] + (p2[1] - p1[1]) * v0;
      const a1x = p0[0] + (p3[0] - p0[0]) * v1, a1y = p0[1] + (p3[1] - p0[1]) * v1;
      const b1x = p1[0] + (p2[0] - p1[0]) * v1, b1y = p1[1] + (p2[1] - p1[1]) * v1;
      // symmetric affine fit: use the mean of the slice's two u edges, centred, which
      // halves the error a "top edge" parallelogram would carry.
      const u0x = b0x - a0x, u0y = b0y - a0y, u1x = b1x - a1x, u1y = b1y - a1y;
      const ux = (u0x + u1x) * 0.5, uy = (u0y + u1y) * 0.5;
      const ox = a0x + (u0x - ux) * 0.5, oy = a0y + (u0y - uy) * 0.5;
      let vx = (a1x - a0x + b1x - b0x) * 0.5, vy = (a1y - a0y + b1y - b0y) * 0.5;
      if (i < n - 1) { const vl = Math.hypot(vx, vy); if (vl > 0.01) { const g = (vl + 1) / vl; vx *= g; vy *= g; } }
      ctx.save();
      ctx.transform(ux / IW, uy / IW, vx / sh, vy / sh, ox, oy);
      ctx.drawImage(img, 0, v0 * IH, IW, sh, 0, 0, IW, sh);
      ctx.restore();
    }
    ctx.restore();
  };

  /* 96x96 nearest-upscaled face canvases. 96 = 16 * 6, so slice counts 1 / 3 / 6 all
     divide it exactly and no slice can land on a sub-texel row. `tp` transposes the tile
     (a reflection across its diagonal) so a side face can be sliced along the depth axis
     while its texture still reads upright on screen. */
  const _hi = new Map();
  function hiFace(name, level, tp, flat, mir) {
    // `flat` defaults to `tp` only because the transposed side faces have always been flat.
    // It is a SEPARATE argument because texFace(name, level>0) bakes a vertical AO gradient
    // into the tile, and anything drawn as several stacked segments (the first-person arm,
    // the bot's limbs, a torch post) restarts that gradient per segment and comes out
    // banded like a staircase.
    // `mir` mirrors the tile across its vertical axis — the bot's head profile needs the
    // hair at the BACK of the skull whichever way it faces.
    if (flat == null) flat = !!tp;
    const key = name + level + (tp ? 't' : '') + (flat ? 'f' : '') + (mir ? 'm' : '');
    let c = _hi.get(key); if (c !== undefined) return c;
    const src = (typeof texFace === 'function') ? texFace(name, level, flat) : null;
    if (!src) { _hi.set(key, null); return null; }
    const S = 6, T = src.width * S;
    c = makeCanvas(T, T); const x = c.getContext('2d'); x.imageSmoothingEnabled = false;
    if (tp) { x.setTransform(0, S, S, 0, 0, 0); x.drawImage(src, 0, 0); }
    else if (mir) { x.setTransform(-S, 0, 0, S, T, 0); x.drawImage(src, 0, 0); }
    else x.drawImage(src, 0, 0, T, T);
    _hi.set(key, c); return c;
  }

  /* ---------------------------------------------------------------- ground patterns
     §10.2: flat = true is mandatory. texFace(name, 0) without it bakes a radial ambient
     shade into the tile which then repeats once per tile — catastrophic at the near rows
     where one tile spans 750 px. Built once per texture name, on first use (IMG.tex is
     not decoded yet at module load), never per frame. */
  const _pat = new Map();
  function groundPattern(ctx, name) {
    let p = _pat.get(name); if (p !== undefined) return p;
    const img = (typeof texFace === 'function') ? texFace(name, 0, true) : null;
    p = img ? ctx.createPattern(img, 'repeat') : null;
    _pat.set(name, p); return p;
  }

  /* §10.2's 26 strips, z_k = 1.4 * 1.1189^k — y(1.4) = 1926 (past the bottom edge),
     y(25.94) = 766 — plus four more rungs of the same ladder out to z = 40.7 (y = 742).
     They are 5-7 px tall each and cost four fills, and they are what lets the ground fade
     all the way into the sky: stopping at z = 26, where the fog ramp is only 0.55, leaves
     a hard green line along the horizon that no amount of treeline hides. */
  MC.Z = (function () { const a = []; for (let k = 0; k <= 30; k++) a.push(1.4 * Math.pow(1.1189, k)); return a; })();

  /* ---------------------------------------------------------------- static tables */
  // 70 stars, 4 px, above y 660 (§S1). Twinkle so the night frames are never frozen.
  const STARS = (function () {
    const R = rng(2101), a = [];
    for (let i = 0; i < 70; i++) a.push({ x: Math.round(R() * 1080), y: Math.round(20 + R() * 620), ph: R() * 6.28, sp: 0.5 + R() * 1.3 });
    return a;
  })();

  // three parallax cloud rows. Each cloud is 1–2 blocky white rects with a 6 px darker
  // bottom edge; rows carry a depth so the pans parallax them correctly against the ground.
  const CLOUD_P = 2100;
  const CLOUDS = (function () {
    const R = rng(5507), rows = [
      { y: 150, h: 30, z: 62, sp: 5.5, n: 5 },
      { y: 268, h: 36, z: 42, sp: 8.5, n: 5 },
      { y: 392, h: 42, z: 27, sp: 13.0, n: 4 },
    ];
    for (const r of rows) {
      r.c = [];
      for (let i = 0; i < r.n; i++) {
        const w = 95 + Math.round(R() * 175);
        const c = { x: Math.round((i + R() * 0.7) * (CLOUD_P / r.n)), w: w, cap: null };
        if (R() > 0.35) c.cap = { dx: Math.round(w * (0.12 + R() * 0.32)), w: Math.round(w * (0.34 + R() * 0.34)), h: Math.round(r.h * 0.7) };
        r.c.push(c);
      }
    }
    return rows;
  })();

  // the horizon: a 16 px ridge at y 690..706 with blocky bumps on it, at a far parallax.
  const HILLS = (function () {
    const R = rng(3311), a = [];
    for (let i = 0; i < 34; i++) a.push({ wx: -40 + i * 2.45, w: 1.6 + R() * 3.0, h: 6 + Math.round(R() * 18) });
    return a;
  })();
  // the treeline: short trunks under wide canopies so the overlapping crowns read as one
  // distant mass, not as a picket fence. z 30..50, all under the same fog as the ground.
  const TREES = (function () {
    const R = rng(9021), a = [];
    for (let i = 0; i < 42; i++) a.push({ wx: -31 + i * 1.48 + (R() - 0.5) * 0.8, z: 30 + R() * 20, h: 2.6 + R() * 2.0, w: 2.0 + R() * 0.7 });
    a.sort((p, q) => q.z - p.z);
    return a;
  })();
  const POSTS = [{ wx: -4.6, z: 21.0 }, { wx: 5.3, z: 23.0 }];

  // ten crack sprites: six cracks radiating from the centre, one step longer per stage.
  const CRACK = (function () {
    const R = rng(4711), br = [];
    for (let b = 0; b < 6; b++) {
      let a = (b / 6) * Math.PI * 2 + (R() - 0.5) * 0.7;
      let px = 8 + Math.cos(a) * 1.1, py = 8 + Math.sin(a) * 1.1;
      const pts = [];
      for (let s = 0; s < 11; s++) { a += (R() - 0.5) * 0.95; px += Math.cos(a); py += Math.sin(a); pts.push([Math.round(px), Math.round(py)]); }
      br.push(pts);
    }
    const out = [];
    for (let k = 0; k < 10; k++) {
      const c = makeCanvas(16, 16), x = c.getContext('2d');
      for (const pts of br) for (let s = 0; s <= k; s++) {
        const p = pts[s]; if (!p || p[0] < 0 || p[0] > 15 || p[1] < 0 || p[1] > 15) continue;
        x.fillStyle = 'rgba(255,255,255,0.16)'; x.fillRect(p[0] + 1, p[1] + 1, 1, 1);
        x.fillStyle = 'rgba(0,0,0,0.66)'; x.fillRect(p[0], p[1], 1, 1);
      }
      out.push(c);
    }
    return out;
  })();

  // break-particle velocities, in blocks and blocks/s
  const PV = (function () {
    const a = [];
    for (let i = 0; i < 24; i++) a.push({
      vx: (hash2(i, 11) - 0.5) * 2.4, vy: -(0.55 + hash2(i, 23) * 1.25),
      sz: 0.045 + hash2(i, 37) * 0.05, ci: Math.floor(hash2(i, 53) * 3), sp: 0.6 + hash2(i, 71) * 0.8,
    });
    return a;
  })();

  /* ================================================================= MC.world */
  MC.world = function (ctx, t, o) {
    o = o || {}; if (o.t == null) o.t = t;
    const sky = MC.skyOf(o), camX = MC.camX(o);
    const fogOn = o.fog !== false;
    pushView(ctx, t, o);
    const A0 = ctx.globalAlpha;                 // never clobber a caller's fade

    /* --- 1 · sky gradient, top -> horizon at y 700 -------------------------------- */
    const g = ctx.createLinearGradient(0, 0, 0, YH);
    g.addColorStop(0, sky.top); g.addColorStop(1, sky.hor);
    ctx.fillStyle = g; ctx.fillRect(-80, -80, 1240, YH + 80);

    /* --- 2 · stars (night only, above y 660) ------------------------------------- */
    if (sky.night && o.stars !== false) {
      ctx.fillStyle = C.STERN;
      for (let i = 0; i < STARS.length; i++) {
        const s = STARS[i];
        ctx.globalAlpha = A0 * (0.55 + 0.45 * Math.sin(t * s.sp + s.ph));
        ctx.fillRect(s.x, s.y, 4, 4);
      }
      ctx.globalAlpha = A0;
    }

    /* --- 3 · sun / moon ---------------------------------------------------------- */
    if (o.sun !== false) {
      const sx = o.sunX || 0, sy = o.sunY || 0;
      if (sky.night) {
        const mx = o.moonX != null ? o.moonX : 770, my = o.moonY != null ? o.moonY : 400;
        ctx.fillStyle = C.MOND; ctx.fillRect(mx - 39, my - 39, 78, 78);
        ctx.fillStyle = mixColor(sky.top, sky.hor, clamp(my / YH));   // the phase notch is sky
        ctx.fillRect(mx + 13, my - 39, 26, 26);
      } else {
        if (sky.gold < 1) { ctx.globalAlpha = A0 * (1 - sky.gold); ctx.fillStyle = C.SONNE; ctx.fillRect(330 - 39 + sx, 380 - 39 + sy, 78, 78); }
        if (sky.gold > 0) { ctx.globalAlpha = A0 * sky.gold; ctx.fillStyle = C.SONNE_GOLD; ctx.fillRect(300 - 46 + sx, 640 - 46 + sy, 92, 92); }
        ctx.globalAlpha = A0;
      }
    }

    /* --- 4 · three parallax cloud rows ------------------------------------------- */
    if (o.clouds !== false) {
      const a = A0 * (C.WOLKE_A || 0.86) * (sky.night ? 0.30 : 1);
      for (let r = 0; r < CLOUDS.length; r++) {
        const row = CLOUDS[r], off = -(t * row.sp) - camX * (F / row.z);
        for (let i = 0; i < row.c.length; i++) {
          const cl = row.c[i];
          for (let rep = -1; rep <= 1; rep++) {
            const X = Math.round(cl.x + rep * CLOUD_P + off);
            if (X > 1120 || X + cl.w < -40) continue;
            ctx.globalAlpha = a; ctx.fillStyle = sky.cloud;
            ctx.fillRect(X, row.y, cl.w, row.h);
            if (cl.cap) ctx.fillRect(X + cl.cap.dx, row.y - cl.cap.h, cl.cap.w, cl.cap.h);
            ctx.globalAlpha = A0; ctx.fillStyle = C.WOLKE_KANTE;
            ctx.fillRect(X, row.y + row.h - 6, cl.w, 6);
            if (cl.cap) ctx.fillRect(X + cl.cap.dx, row.y - 6, cl.cap.w, 6);
          }
        }
      }
      ctx.globalAlpha = A0;
    }

    /* --- 5 · the far ground: everything under the horizon starts as fog ----------- */
    ctx.fillStyle = sky.hor; ctx.fillRect(-80, YH, 1240, 1920 - YH + 80);

    /* --- 6 · hill ridge + treeline + two fence posts, all under the same fog ------ */
    if (o.horizon !== false) {
      const hillCol = mixColor(sky.hor, sky.top, 0.70);
      ctx.fillStyle = hillCol;
      const q40 = F / 40;
      for (let i = 0; i < HILLS.length; i++) {
        const h = HILLS[i], x0 = 540 + (h.wx - camX) * q40, w = h.w * q40;
        if (x0 > 1120 || x0 + w < -40) continue;
        ctx.fillRect(Math.round(x0), 690 - h.h, Math.ceil(w), h.h);
      }
      ctx.fillRect(-80, 690, 1240, 16);
      // the land at the foot of the hills fades into the horizon colour over 82 px, so the
      // ridge sits on ground instead of floating between a lighter sky and a lighter band
      const hg = ctx.createLinearGradient(0, 700, 0, 782);
      hg.addColorStop(0, withA(hillCol, 1)); hg.addColorStop(1, withA(hillCol, 0));
      ctx.fillStyle = hg; ctx.fillRect(-80, 700, 1240, 82);
      drawTreeline(ctx, camX, sky, o, A0);
    }

    /* --- 7 · the 26 ground strips ------------------------------------------------ */
    if (o.ground !== false) {
      const name = o.tex || 'grass_top';
      for (let k = MC.Z.length - 2; k >= 0; k--) {
        const zk = MC.Z[k], zk1 = MC.Z[k + 1];
        const yk = YH + K / zk, yk1 = YH + K / zk1;                 // bottom, top
        if (yk1 > 1960) continue;
        const zm = 2 * zk * zk1 / (zk + zk1);                        // depth at the strip's mid y
        const pat = groundPattern(ctx, o.strip ? o.strip(zm, k) : name);
        if (pat) {
          const a = (F / zm) / 16;                                   // px per texture pixel, across
          const d = (yk - yk1) / (16 * (zk1 - zk));                  // px per texture pixel, along z
          const e = 540 - camX * (F / zm), f = yk + 16 * d * zk;
          ctx.save();
          ctx.transform(a, 0, 0, d, e, f);
          ctx.fillStyle = pat;
          ctx.fillRect((-80 - e) / a, -16 * zk1, (1240) / a, 16 * (zk1 - zk) + 1.2 / d);
          ctx.restore();
        }
        if (fogOn) {
          const fa = groundFog(zm, o);
          if (fa > 0.004) { ctx.globalAlpha = A0 * fa; ctx.fillStyle = sky.hor; ctx.fillRect(-80, yk1, 1240, yk - yk1 + 1.2); ctx.globalAlpha = A0; }
        }
      }
    }
    ctx.restore();
  };

  function drawTreeline(ctx, camX, sky, o, A0) {
    const log = hiFace('oak_log_side', 2), leaf = hiFace('oak_leaves', 2);
    if (!log || !leaf) return;
    const R2 = Math.round;
    for (let i = 0; i < TREES.length; i++) {
      const tr = TREES[i], q = F / tr.z, x0 = 540 + (tr.wx - camX) * q;
      const cw = tr.w * q;
      if (x0 - cw / 2 > 1160 || x0 + cw / 2 < -80) continue;
      const fa = MC.fogAlpha(tr.z, o);
      const gy = YH + EYE * q;
      const ty = YH + (EYE - 1.15) * q;                       // trunk top
      const tw = Math.max(2, R2(0.34 * q));
      ctx.drawImage(log, R2(x0 - tw / 2), R2(ty), tw, Math.max(2, R2(gy - ty)));
      const cy0 = YH + (EYE - tr.h) * q, cy1 = YH + (EYE - 0.85) * q;
      const cx0 = R2(x0 - cw / 2), cwR = Math.max(3, R2(cw));
      ctx.drawImage(leaf, cx0, R2(cy0), cwR, Math.max(3, R2(cy1 - cy0)));
      ctx.globalAlpha = A0 * fa; ctx.fillStyle = sky.hor;
      ctx.fillRect(cx0, R2(cy0), cwR, Math.max(3, R2(gy - cy0)));
      ctx.globalAlpha = A0;
    }
    for (let i = 0; i < POSTS.length; i++) {
      const p = POSTS[i], q = F / p.z, x0 = 540 + (p.wx - camX) * q;
      if (x0 > 1160 || x0 < -80) continue;
      const fa = MC.fogAlpha(p.z, o);
      const gy = YH + EYE * q, ty = YH + (EYE - 1.2) * q, pw = Math.max(2, R2(0.24 * q));
      ctx.drawImage(log, R2(x0), R2(ty), pw, Math.max(2, R2(gy - ty)));
      ctx.globalAlpha = A0 * fa; ctx.fillStyle = sky.hor;
      ctx.fillRect(R2(x0), R2(ty), pw, Math.max(2, R2(gy - ty)));
      ctx.globalAlpha = A0;
    }
  }

  MC.goldWash = function (ctx, k) {
    if (!(k > 0.002)) return;
    ctx.save();
    ctx.globalCompositeOperation = 'multiply';
    ctx.globalAlpha *= clamp(k);
    ctx.fillStyle = C.GOLD_WASH;
    ctx.fillRect(0, 0, 1080, 1920);
    ctx.restore();
  };

  /* ================================================================= MC.blocks */
  function texOf(tex) {
    if (!tex) return { top: 'stone', front: 'stone', left: 'stone', right: 'stone' };
    if (typeof tex === 'string') return { top: tex, front: tex, left: tex, right: tex };
    const side = tex.side || tex.top || 'stone';
    return { top: tex.top || side, front: tex.front || side, left: tex.left || side, right: tex.right || side };
  }

  MC.blocks = function (ctx, cells, o) {
    if (!cells || !cells.length) return;
    o = o || {};
    const t = o.t || 0, camX = MC.camX(o), sky = MC.skyOf(o);
    const fogOn = o.fog !== false, warmBase = o.warm != null ? o.warm : sky.gold;
    const list = [];
    for (let i = 0; i < cells.length; i++) {
      const c = cells[i];
      if (!c || c.skip || !(c.z > 0) || c.z > 44) continue;
      if (!c.draw && !(c.z > 1.25)) continue;
      list.push(c);
    }
    if (!list.length) return;
    list.sort((a, b) => b.z - a.z);                      // painter's order, one sort per frame

    pushView(ctx, t, o);
    if (o.alpha != null) ctx.globalAlpha *= o.alpha;
    const AB = ctx.globalAlpha;
    for (let i = 0; i < list.length; i++) {
      const c = list[i];
      /* An ENTITY cell: no faces, just a callback run at this cell's place in the depth
         sort. Torches, the bot, the oak sign and item pops all have to interleave with the
         block field, and without this every scene has to hand-split its own cell list
         around them -- which is ten chances to get one occlusion wrong. */
      if (typeof c.draw === 'function') {
        ctx.save();
        try { c.draw(ctx, c, o); } finally { ctx.restore(); ctx.globalAlpha = AB; }
        continue;
      }
      drawCell(ctx, c, camX, sky, fogOn, warmBase, o, AB);
    }
    ctx.restore();     // pushView's save also puts globalAlpha back
  };

  function drawCell(ctx, c, camX, sky, fogOn, warmBase, o, AB) {
    const x = c.x, zn = c.z, zf = c.z + 1, y0 = c.y || 0, y1 = y0 + 1;
    const qn = F / zn, qf = F / zf;
    const nl = 540 + (x - camX) * qn, nr = 540 + (x + 1 - camX) * qn;
    if (nr < -120 || nl > 1200) return;
    const fl = 540 + (x - camX) * qf, fr = 540 + (x + 1 - camX) * qf;
    const nTop = YH + (EYE - y1) * qn, nBot = YH + (EYE - y0) * qn;
    const fTop = YH + (EYE - y1) * qf, fBot = YH + (EYE - y0) * qf;
    const tex = texOf(c.tex);
    const fa = fogOn ? MC.fogAlpha(zn, o) : 0;
    const warm = c.warm != null ? c.warm : warmBase;
    const A = AB * (c.alpha != null ? c.alpha : 1);
    if (A !== AB) ctx.globalAlpha = A;

    /* top face — a trapezoid, so slice it along depth. Above eye height you no longer
       see it from a 13.8 deg down pitch, so it is skipped. */
    if (y1 < EYE - 0.02) {
      const n = zn < 6 ? 6 : zn < 12 ? 3 : 1;
      MC.texQuad(ctx, hiFace(tex.top, 0, false, true), [fl, fTop], [fr, fTop], [nr, nTop], [nl, nTop], n);
      if (fa > 0.004) { ctx.globalAlpha = A * fa; ctx.fillStyle = sky.hor; quad(ctx, fl, fTop, fr, fTop, nr, nTop, nl, nTop); ctx.globalAlpha = A; }
    }

    /* side face — only once the block is far enough off centre to actually show one.
       Without it, off-centre blocks read as flat cut-outs standing on a sliding floor. */
    const cx = (nl + nr) * 0.5;
    if (Math.abs(cx - 540) > 300) {
      const left = cx > 540;                              // right of centre -> its LEFT face shows
      const sxn = left ? nl : nr, sxf = left ? fl : fr;
      MC.texQuad(ctx, hiFace(left ? tex.left : tex.right, 2, true, true),
        [sxf, fTop], [sxf, fBot], [sxn, nBot], [sxn, nTop], 3);
      if (warm > 0.004) { ctx.globalAlpha = A * 0.18 * warm; ctx.fillStyle = '#FFA84A'; quad(ctx, sxf, fTop, sxf, fBot, sxn, nBot, sxn, nTop); ctx.globalAlpha = A; }
      if (fa > 0.004) { ctx.globalAlpha = A * fa; ctx.fillStyle = sky.hor; quad(ctx, sxf, fTop, sxf, fBot, sxn, nBot, sxn, nTop); ctx.globalAlpha = A; }
    }

    /* front face — constant depth, so it is an EXACT axis-aligned rect: one drawImage.
       flat = true, like the top and side faces above and like the ground strips in §10.2,
       and for the same reason: texFace bakes a per-TILE ambient-occlusion gradient, which is
       a depth cue in an isometric diorama but a defect here. One tile spans 300-500 px in
       this film, so the gradient repeats as a visible dark ramp down the foot of EVERY block
       — that, more than the atlas, is what made the near pumpkins read as varnished barrels.
       Minecraft shades a face flat by its facing direction and never gradients within one. */
    const img = hiFace(tex.front, 1, false, true);
    const rw = nr - nl + 0.6, rh = nBot - nTop + 0.6;
    if (img) { ctx.imageSmoothingEnabled = false; ctx.drawImage(img, nl, nTop, rw, rh); }
    if (c.crack != null && c.crack >= 0) MC.break(ctx, (nl + nr) * 0.5, (nTop + nBot) * 0.5, nr - nl, c.crack, { h: nBot - nTop });
    if (fa > 0.004) { ctx.globalAlpha = A * fa; ctx.fillStyle = sky.hor; ctx.fillRect(nl, nTop, rw, rh); }
    if (ctx.globalAlpha !== AB) ctx.globalAlpha = AB;
  }

  function quad(ctx, ax, ay, bx, by, cx2, cy2, dx, dy) {
    ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(bx, by); ctx.lineTo(cx2, cy2); ctx.lineTo(dx, dy); ctx.closePath(); ctx.fill();
  }

  MC.blockFace = function (cell, o) {
    o = o || {};
    const camX = MC.camX(o), v = MC.viewOffset(o.t || 0, o);
    const zn = cell.z, q = F / zn, y0 = cell.y || 0;
    const nl = 540 + (cell.x - camX) * q, nr = nl + q;
    const top = YH + (EYE - (y0 + 1)) * q, bot = YH + (EYE - y0) * q;
    const on = zn > 1.25 && zn < 44 && nr > -120 && nl < 1200;
    return {
      x: nl, y: top, w: nr - nl, h: bot - top,
      cx: (nl + nr) * 0.5, cy: (top + bot) * 0.5,
      s: q, z: zn, on: on, dy: v.dy,
    };
  };

  /* ================================================================= MC.arm */
  MC.armSwing = function (t, o) {
    o = o || {};
    const amt = o.swing || 0; if (amt <= 0) return 0;
    const hz = o.swingHz != null ? o.swingHz : 2;
    let p = ((t - (o.swingT0 || 0)) * hz) % 1; if (p < 0) p += 1;
    return Math.sin(Math.PI * p) * amt;
  };

  /* B5 · vanilla does not draw the held item behind an open screen. A scene that opens a
     GUI sets MC.armHidden = true for that frame (or passes {hidden: true}) and every
     MC.arm call becomes a no-op. It is a per-frame flag, not state: mc_hud's
     MC.hudReset() clears it at the end of every frame (TL.overlay runs MC.hud()
     unconditionally), so set it on every frame you want it — and set it BEFORE the MC.arm
     call, because the arm is drawn by the scene and the reset happens afterwards. */
  MC.armHidden = false;

  MC.arm = function (ctx, t, o) {
    o = o || {};
    if (MC.armHidden || o.hidden) return;
    // flat = true on every arm face: the limb is drawn in stacked segments and texFace's
    // baked AO gradient would restart at every one of them.
    const shirtF = hiFace('player_shirt', 1, false, true), skinF = hiFace('player_skin', 1, false, true);
    if (!shirtF || !skinF) return;
    const px = o.x != null ? o.x : 1000, py = o.y != null ? o.y : 1890;
    const W = o.w != null ? o.w : 252;              // the FIST width — the limb's widest point
    const L = o.len != null ? o.len : 520;          // pivot -> fingertips, along the arm axis
    const HAND = o.hand != null ? o.hand : 128;     // the bare-skin fist at the far end
    const TAIL = o.tail != null ? o.tail : 300;     // how far the sleeve runs PAST the pivot
    const TAPER = o.taper != null ? o.taper : 0.88; // limb width at the elbow, as a fraction of W
    const SLV = 0.90;                               // the sleeve is a step thinner than the fist
    const WR = L - HAND, SPAN = L + TAIL;
    /* Foreshortening: the elbow is at the frame corner, nearest the eye, and the fist is
       held out in front, so the limb narrows a little toward the fist... except that the
       fist is a closed hand and steps back out wider than the wrist. Net: a SHALLOW taper.
       RE-GATE: at the build-gate value of 0.52 the limb was half as wide at the corner as
       at the fingertips, and the silhouette that produces is a spade, not an arm — the
       three-variant bake-off on gate page 8 (0.52 / 0.78 / 0.92) settled it at 0.88. */
    const wAt = s => W * (TAPER + (1 - TAPER) * ((s + TAIL) / SPAN));
    const dx = -Math.round(W * 0.22), dy = -Math.round(W * 0.055);  // depth vector, up-left
    const bob = Math.sin((Math.PI * 2) * 0.9 * t) * 9 * (o.bob != null ? o.bob : 1);
    const sw = MC.armSwing(t, o);
    const drop = (o.drop || 0) * 760;
    const rotNow = (o.rot != null ? o.rot : -0.62) - 0.38 * sw;
    ctx.save();
    ctx.imageSmoothingEnabled = false;
    if (o.alpha != null) ctx.globalAlpha *= o.alpha;
    ctx.translate(px, py + bob + drop);
    ctx.rotate(rotNow);
    ctx.translate(0, -30 * sw);

    /* The top of the limb is a TRAPEZOID, so it needs MC.texQuad, not _face. It is drawn in
       stacked segments of roughly square texel aspect (a 16 px tile pulled over 650 px is
       vertical smear), each segment repeating the tile the way a real skin does. */
    function topFace(img, sLo, sHi, kw) {
      if (!img || sHi <= sLo) return;
      const mid = wAt((sLo + sHi) / 2) * kw;
      const n = Math.max(1, Math.round((sHi - sLo) / mid)), st = (sHi - sLo) / n;
      for (let i = 0; i < n; i++) {
        const a = sLo + i * st, b = a + st + (i < n - 1 ? 0.8 : 0);
        const wa = wAt(a) * kw * 0.5, wb = wAt(b) * kw * 0.5;
        MC.texQuad(ctx, img, [-wb, -b], [wb, -b], [wa, -a], [-wa, -a], 3);
      }
    }
    /* The INNER (left) side of the limb, extruded along the depth vector. Both long edges
       are the same slanted line, so every segment is an exact parallelogram -> _face. It is
       drawn from the SAME tile as the top and then knocked back one flat step, because
       texFace level 2 (0.58x) on skin comes out the colour of dark wood, not of a hand. */
    function sideFace(img, sLo, sHi, kw) {
      if (!img || sHi <= sLo) return;
      const n = Math.max(1, Math.round((sHi - sLo) / Math.abs(dx))), st = (sHi - sLo) / n;
      for (let i = 0; i < n; i++) {
        const a = sLo + i * st, b = a + st;
        const wa = wAt(a) * kw * 0.5, wb = wAt(b) * kw * 0.5;
        _face(ctx, img, -wb + dx, -b + dy, -dx, -dy, wb - wa, (b - a) + (i < n - 1 ? 0.8 : 0));
      }
      const wA = wAt(sHi) * kw * 0.5, wB = wAt(sLo) * kw * 0.5;
      ctx.fillStyle = 'rgba(0,0,0,0.28)';
      ctx.beginPath();
      ctx.moveTo(-wA + dx, -sHi + dy); ctx.lineTo(-wA, -sHi);
      ctx.lineTo(-wB, -sLo); ctx.lineTo(-wB + dx, -sLo + dy);
      ctx.closePath(); ctx.fill();
    }
    sideFace(shirtF, -TAIL, WR, SLV);
    sideFace(skinF, WR, L, 1);
    topFace(shirtF, -TAIL, WR, SLV);
    topFace(skinF, WR, L, 1);

    // the outer edge takes a flat contact shade so the limb has a rounded read against the
    // bright ground — a tapered quad, no gradient, no blur.
    const k = W * 0.085;
    ctx.fillStyle = 'rgba(0,0,0,0.15)';
    ctx.beginPath();
    ctx.moveTo(wAt(L) * 0.5, -L); ctx.lineTo(wAt(L) * 0.5 - k, -L);
    ctx.lineTo(wAt(-TAIL) * 0.5 - k, TAIL); ctx.lineTo(wAt(-TAIL) * 0.5, TAIL);
    ctx.closePath(); ctx.fill();
    // the cuff: the fist is a step wider than the sleeve, and it drops a hard shadow on it.
    // That step plus this line is what makes the hand a separate object instead of a tip.
    const hwW = wAt(WR) * 0.5;
    ctx.fillStyle = 'rgba(0,0,0,0.34)'; ctx.fillRect(-hwW, -WR - 3, hwW * 2, 9);
    /* the fist. Two finger grooves running ALONG the limb, because that is how curled
       fingers lie when you look at the back of your own hand, and one knuckle band across
       the far third. RE-GATE: at 0.09 the grooves were invisible and the fist read as a
       blank tan plate; they are flat shades, no gradient and no blur, and they vanish at
       thumbnail scale where the silhouette does the work anyway. */
    const kn = WR + HAND * 0.62;
    ctx.fillStyle = 'rgba(0,0,0,0.13)';
    ctx.beginPath();
    ctx.moveTo(-wAt(L) * 0.5, -L); ctx.lineTo(wAt(L) * 0.5, -L);
    ctx.lineTo(wAt(kn) * 0.5, -kn); ctx.lineTo(-wAt(kn) * 0.5, -kn);
    ctx.closePath(); ctx.fill();
    ctx.fillStyle = 'rgba(0,0,0,0.16)';
    for (const f of [-0.19, 0.19]) {
      const s0 = WR + HAND * 0.18;
      ctx.beginPath();
      ctx.moveTo(f * wAt(L) - 4, -L); ctx.lineTo(f * wAt(L) + 4, -L);
      ctx.lineTo(f * wAt(s0) + 4, -s0); ctx.lineTo(f * wAt(s0) - 4, -s0);
      ctx.closePath(); ctx.fill();
    }
    // the held block sits IN the fist and is counter-rotated most of the way back upright,
    // so it reads as carried rather than as a cube skewered on a stick.
    if (o.held) {
      const hs = Math.round(W * (o.heldSize != null ? o.heldSize : 0.48));
      blockIcon(ctx, o.held, W * 0.12, -(L + hs * 0.45), hs, { flat: true, rotate: -rotNow * 0.7 });
    }
    const dk = o.dark != null ? o.dark : (o.phase === 'nacht' ? 0.42 : 0);
    if (dk > 0.004) {
      ctx.save(); ctx.globalAlpha *= dk; ctx.fillStyle = 'rgba(0,0,0,1)';
      ctx.beginPath();
      ctx.moveTo(-wAt(L) * 0.5 + dx, -L + dy); ctx.lineTo(wAt(L) * 0.5, -L);
      ctx.lineTo(wAt(-TAIL) * 0.5, TAIL); ctx.lineTo(-wAt(-TAIL) * 0.5 + dx, TAIL + dy);
      ctx.closePath(); ctx.fill(); ctx.restore();
    }
    ctx.restore();
  };

  /* ================================================================= break + particles */
  MC.break = function (ctx, x, y, s, stage, o) {
    if (!(stage >= 0) || stage > 9) return;
    o = o || {};
    const img = CRACK[Math.min(9, Math.floor(stage))];
    const h = o.h != null ? o.h : s;
    ctx.save(); ctx.imageSmoothingEnabled = false;
    if (o.alpha != null) ctx.globalAlpha *= o.alpha;
    ctx.drawImage(img, x - s / 2, y - h / 2, s, h);
    ctx.restore();
  };

  MC.breakStage = function (t, t0, dur) {
    if (t < t0 || t >= t0 + dur) return -1;
    return Math.max(0, Math.min(9, Math.floor((t - t0) / dur * 10)));
  };

  MC.particles = function (ctx, x, y, t, t0, kind, o) {
    o = o || {};
    const life = o.life != null ? o.life : 0.75, age = t - t0;
    if (age < 0 || age > life) return;
    const cols = C.STAUB[kind] || C.STAUB.pumpkin;
    const n = Math.min(24, o.count != null ? o.count : 14);
    const s = o.s != null ? o.s : 200, spread = o.spread != null ? o.spread : 1;
    const fade = age > life * 0.7 ? 1 - (age - life * 0.7) / (life * 0.3) : 1;
    ctx.save();
    if (o.alpha != null) ctx.globalAlpha *= o.alpha;
    ctx.globalAlpha *= fade;
    for (let i = 0; i < n; i++) {
      const p = PV[i];
      const px = x + p.vx * spread * s * age * p.sp;
      const py = y + (p.vy * age + 3.0 * age * age) * s * 0.55;
      const sz = Math.max(2, Math.round(p.sz * s));
      ctx.fillStyle = cols[p.ci];
      ctx.fillRect(Math.round(px), Math.round(py), sz, sz);
    }
    ctx.restore();
  };

  /* ================================================================= entities

     THE BOT. engine.js's mcPlayer is an ISOMETRIC construction and this world is a
     PERSPECTIVE one; dropping the first into the second is what produced a detached far
     arm, a tan box hanging off the hip, one dark mass where the legs are and a head a
     third too big. So the figure is built here, natively, out of the same three faces
     MC.blocks draws — near face (constant depth, an exact parallelogram), one side face
     (a trapezoid through MC.texQuad) and a top face where one is visible.

     Vanilla body plan, in skin pixels (16 px = 1 block), seen in F5 PROFILE. The camera
     looks along +z, the bot faces +x, so its shoulder axis runs INTO the screen and what
     you see is the side of the model:
       legs   12 px tall, 4 deep (x), 4 wide (z)      y  0..12
       torso  12 px tall, 4 deep (x), 8 wide (z)      y 12..24
       arms   12 px tall, 4 deep (x), 4 wide (z)      hung from y 24, outside the torso
       head    8 px cubed                             y 24..32
     Total 32 px = 2.000 blocks, and the head is exactly a quarter of the height. From the
     side the head (0.5) therefore overhangs the body (0.25) — that overhang IS the read.

     Limbs swing about the shoulder / hip in the sagittal plane, i.e. about the z axis. At
     constant z the projection is a uniform scale, so that rotation is an exact rotation on
     screen: every limb corner is still projected through MC.proj's own formula.       */
  const PS = {
    skin: 'player_skin', face: 'player_face', side: 'player_head_side',
    shirt: 'player_shirt', pants: 'player_pants', shoe: 'player_shoe',
  };

  MC.player = function (ctx, wx, z, o) {
    o = o || {};
    if (!(z > 0.2)) return null;
    const camX = MC.camX(o), q = F / z, wxc = wx - camX;
    const scale = o.scale != null ? o.scale : (o.size != null ? o.size / q : 1);
    const gx = 540 + wxc * q, gy = YH + EYE * q;
    const out = { x: gx, y: gy, size: q * scale, top: gy };
    if (gx < -900 || gx > 1980 || scale <= 0) return out;

    const t = o.t || 0, U = scale / 16;                 // one skin pixel, in blocks
    const fw = (o.facing || 'right') === 'left' ? -1 : 1;
    const walk = clamp(o.walk || 0);
    const ph = t * (o.stepRate != null ? o.stepRate : 4.4) * Math.PI, sn = Math.sin(ph);
    const sw = MC.armSwing(t, { swing: o.swing || 0, swingHz: o.swingHz != null ? o.swingHz : 2, swingT0: o.swingT0 });
    const lift = (o.lift || 0) * scale
      + ((o.bob != null ? o.bob : 0.010) * Math.sin(t * 1.7 + 0.6) + 0.035 * walk * Math.abs(sn)) * scale;
    const sky = MC.skyOf(o), fogOn = o.fog !== false;
    const warm = o.warm != null ? o.warm : sky.gold;
    const dark = o.dark || 0;

    ctx.save();
    ctx.imageSmoothingEnabled = false;
    if (o.alpha != null) ctx.globalAlpha *= o.alpha;
    const A = ctx.globalAlpha;

    /* --- the blob shadow: the only shadow in the film (§2 bans block cast shadows). Its
       two radii are the real projected footprint of a 0.68-block disc on the ground. */
    const sa = o.shadow != null ? o.shadow : 0.35;
    if (sa > 0.004) {
      const r = 0.34 * scale, zA = Math.max(0.25, z - r), zB = z + r;
      const yA = YH + K / zA, yB = YH + K / zB;
      ctx.save(); ctx.globalAlpha = A * sa; ctx.fillStyle = 'rgba(0,0,0,1)';
      ctx.beginPath(); ctx.ellipse(gx, (yA + yB) / 2, r * q, Math.max(3, (yA - yB) / 2), 0, 0, Math.PI * 2);
      ctx.fill(); ctx.restore();
    }

    /* --- one body box. x = chest-to-back, y = height above the ground, z = depth. -------
       `ang` rotates it about (0, pvy) in the sagittal plane; `dk` is the flat shade the far
       limbs take so they separate from the near ones instead of merging into one mass. */
    function box(x0, x1, ya, yb, za, zb, b) {
      const ang = b.ang || 0, pvy = b.pvy || 0;
      const c = Math.cos(ang), s = Math.sin(ang);
      const R = ang
        ? (x, y) => [c * x - s * (y - pvy), pvy + s * x + c * (y - pvy)]
        : (x, y) => [x, y];
      const zn = z + za, zf = z + zb;
      if (!(zn > 0.2)) return;
      const PJ = (p, zz) => { const k = F / zz; return [540 + (wxc + p[0]) * k, YH + (EYE - p[1]) * k]; };
      const fa = fogOn ? MC.fogAlpha(zn, o) : 0;
      const dk = clamp((b.dk || 0) + dark);
      const TL = R(x0, yb), TR = R(x1, yb), BR = R(x1, ya), BL = R(x0, ya);
      const n0 = PJ(TL, zn), n1 = PJ(TR, zn), n2 = PJ(BR, zn), n3 = PJ(BL, zn);

      /* side face — a trapezoid, so it goes through texQuad, sliced along depth. The
         visible one is whichever x face points at the camera; when that is the face the
         bot is looking along, it carries player_face and you see the profile's cheek. */
      const cxs = (n0[0] + n1[0] + n2[0] + n3[0]) * 0.25;
      const xs = cxs > 540 ? x0 : x1;
      const facingSide = (xs === (fw > 0 ? x1 : x0));
      const sName = typeof b.side === 'string' ? b.side : (facingSide ? b.side.face : b.side.back);
      const s0 = PJ(R(xs, yb), zn), s1 = PJ(R(xs, ya), zn), s2 = PJ(R(xs, ya), zf), s3 = PJ(R(xs, yb), zf);
      MC.texQuad(ctx, hiFace(sName, 2, true), s0, s1, s2, s3, 3);
      if (warm > 0.004) { ctx.globalAlpha = A * 0.18 * warm; ctx.fillStyle = '#FFA84A'; quad(ctx, s0[0], s0[1], s1[0], s1[1], s2[0], s2[1], s3[0], s3[1]); }
      if (dk > 0.004) { ctx.globalAlpha = A * dk; ctx.fillStyle = '#000000'; quad(ctx, s0[0], s0[1], s1[0], s1[1], s2[0], s2[1], s3[0], s3[1]); }
      if (fa > 0.004) { ctx.globalAlpha = A * fa; ctx.fillStyle = sky.hor; quad(ctx, s0[0], s0[1], s1[0], s1[1], s2[0], s2[1], s3[0], s3[1]); }
      ctx.globalAlpha = A;

      /* top face — only where one is actually visible from 13.8 deg down */
      if (b.top && yb < EYE - 0.02) {
        const t0 = PJ(R(x0, yb), zf), t1 = PJ(R(x1, yb), zf), t2 = PJ(R(x1, yb), zn), t3 = PJ(R(x0, yb), zn);
        MC.texQuad(ctx, hiFace(b.top, 0, false, true), t0, t1, t2, t3, 3);
        if (dk > 0.004) { ctx.globalAlpha = A * dk; ctx.fillStyle = '#000000'; quad(ctx, t0[0], t0[1], t1[0], t1[1], t2[0], t2[1], t3[0], t3[1]); }
        if (fa > 0.004) { ctx.globalAlpha = A * fa; ctx.fillStyle = sky.hor; quad(ctx, t0[0], t0[1], t1[0], t1[1], t2[0], t2[1], t3[0], t3[1]); }
        ctx.globalAlpha = A;
      }

      /* near face — constant depth, so it is an exact parallelogram even when the limb is
         swung. Segmented so one skin pixel stays roughly square instead of smearing. */
      const img = hiFace(b.near, 1, false, true, b.mir);
      if (img) {
        const seg = Math.max(1, Math.round((yb - ya) / Math.max(1e-6, x1 - x0)));
        for (let i = 0; i < seg; i++) {
          const u = i / seg;
          const ax = n0[0] + (n3[0] - n0[0]) * u, ay = n0[1] + (n3[1] - n0[1]) * u;
          const bx = n1[0] + (n2[0] - n1[0]) * u, by = n1[1] + (n2[1] - n1[1]) * u;
          let vx = (n3[0] - n0[0]) / seg, vy = (n3[1] - n0[1]) / seg;
          if (i < seg - 1) { const l = Math.hypot(vx, vy); if (l > 0.01) { const g = (l + 0.7) / l; vx *= g; vy *= g; } }
          _face(ctx, img, ax, ay, bx - ax, by - ay, vx, vy);
        }
      }
      /* the near limbs get a flat contact shade down their two long edges. In a profile the
         near arm sits exactly on top of the torso and the near leg exactly on the far one,
         both in the same texture — without this they merge into one slab, which is half of
         what was wrong with the isometric figure this replaced. */
      if (b.edge > 0.004) {
        const ux = n1[0] - n0[0], uy = n1[1] - n0[1], l = Math.hypot(ux, uy);
        if (l > 6) {
          const ew = Math.max(2, Math.round(l * 0.055)), ex = ux / l * ew, ey = uy / l * ew;
          ctx.globalAlpha = A * b.edge; ctx.fillStyle = '#000000';
          quad(ctx, n0[0], n0[1], n0[0] + ex, n0[1] + ey, n3[0] + ex, n3[1] + ey, n3[0], n3[1]);
          quad(ctx, n1[0], n1[1], n1[0] - ex, n1[1] - ey, n2[0] - ex, n2[1] - ey, n2[0], n2[1]);
        }
      }
      if (dk > 0.004) { ctx.globalAlpha = A * dk; ctx.fillStyle = '#000000'; quad(ctx, n0[0], n0[1], n1[0], n1[1], n2[0], n2[1], n3[0], n3[1]); }
      if (fa > 0.004) { ctx.globalAlpha = A * fa; ctx.fillStyle = sky.hor; quad(ctx, n0[0], n0[1], n1[0], n1[1], n2[0], n2[1], n3[0], n3[1]); }
      ctx.globalAlpha = A;
      return { n0: n0, n1: n1, n2: n2, n3: n3 };
    }

    const yF = lift, yHip = lift + 12 * U, yShd = lift + 24 * U, yTop = lift + 32 * U;
    const xB0 = -2 * U, xB1 = 2 * U, xH0 = -4 * U, xH1 = 4 * U;   // body / head depth in x
    // the walk: arms counter-swing the legs, exactly as vanilla does
    const la = 0.62 * walk * sn * fw, aa = 0.52 * walk * sn * fw;
    const aLegN = la, aLegF = -la;
    const aArmF = aa, aArmN = -aa + 1.55 * sw * fw;               // + the mining chop
    const FAR = 0.22, CORE = 0.10, EDGE = 0.24;                   // depth separation shades

    const armBox = (za, zb, ang, dk, ed, top) => {
      box(xB0, xB1, yShd - 8 * U, yShd, za, zb, { near: PS.shirt, side: PS.shirt, top: top ? PS.shirt : null, ang: ang, pvy: yShd, dk: dk, edge: ed });
      box(xB0, xB1, yShd - 12 * U, yShd - 8 * U, za, zb, { near: PS.skin, side: PS.skin, ang: ang, pvy: yShd, dk: dk, edge: ed });
    };
    const legBox = (za, zb, ang, dk, ed) => {
      box(xB0, xB1, yF + 2 * U, yHip, za, zb, { near: PS.pants, side: PS.pants, ang: ang, pvy: yHip, dk: dk, edge: ed });
      box(xB0, xB1, yF, yF + 2 * U, za, zb, { near: PS.shoe, side: PS.shoe, ang: ang, pvy: yHip, dk: dk, edge: ed });
    };

    // painter's order inside the figure: far side first, near limbs last
    armBox(4 * U, 8 * U, aArmF, FAR, 0, false);
    legBox(0, 4 * U, aLegF, FAR, 0);
    box(xB0, xB1, yHip, yShd, -4 * U, 4 * U, { near: PS.shirt, side: PS.shirt, dk: CORE });
    box(xH0, xH1, yShd, yTop, -4 * U, 4 * U, {
      near: PS.side, mir: fw < 0, side: { face: PS.face, back: PS.side }, dk: CORE,
    });
    legBox(-4 * U, 0, aLegN, 0, EDGE);
    armBox(-8 * U, -4 * U, aArmN, 0, EDGE, true);

    /* the held block rides in the near fist, at the fist's own depth and a little forward
       of the body so it never eclipses the torso */
    if (o.held) {
      const c2 = Math.cos(aArmN), s2 = Math.sin(aArmN), hy = yShd - 10 * U;
      const hx = -s2 * (hy - yShd) + 2.5 * U * fw, hy2 = yShd + c2 * (hy - yShd);
      const k = F / Math.max(0.25, z - 6 * U), hs = Math.max(6, 5.5 * U * k);
      blockIcon(ctx, o.held, 540 + (wxc + hx) * k, YH + (EYE - hy2) * k - hs * 0.45, hs, { flat: true });
    }
    ctx.restore();

    const headTop = YH + (EYE - yTop) * (F / Math.max(0.25, z - 4 * U));
    out.top = headTop;
    if (o.name) {
      const ny = headTop - 34;
      const opt = MC.tx(32, { color: C.WEISS, align: 'center' });
      const w = measureText(ctx, o.name, opt);
      ctx.save(); ctx.fillStyle = 'rgba(0,0,0,0.26)';
      ctx.fillRect(Math.round(gx - w / 2 - 10), Math.round(ny - 26), Math.round(w + 20), 42);
      ctx.restore();
      MC.text(ctx, o.name, gx, ny, opt);
    }
    return out;
  };

  MC.torch = function (ctx, wx, z, o) {
    o = o || {};
    const camX = MC.camX(o), q = F / z, t = o.t || 0;
    const x0 = 540 + (wx - camX) * q;
    if (x0 < -160 || x0 > 1240) return;
    const h = o.h != null ? o.h : 1.5;
    const gy = YH + EYE * q, ty = YH + (EYE - h) * q;
    /* THE POST. It was drawn with texFace level 1 and the baked AO gradient, as ONE tile
       pulled over 400 px: 0.8x brightness on a #634E2B bark, darkened again towards the
       foot, with every texel smeared 10:1 vertically. It came out near-black — a burnt
       pole, not a lit fence post. Now: level 0 flat (the brightest of the three, the same
       level the ground strips use), stacked in segments of square texel aspect, with the
       far edge taking a flat side shade so the post still has a round read. */
    const log = hiFace('oak_log_side', 0, false, true);
    const pw = Math.max(3, Math.round(0.22 * q));
    if (log) {
      ctx.save(); ctx.imageSmoothingEnabled = false;
      const px0 = Math.round(x0), ph2 = Math.round(gy - ty), py0 = Math.round(ty);
      const n = Math.max(1, Math.round(ph2 / pw)), st = ph2 / n;
      for (let i = 0; i < n; i++) ctx.drawImage(log, px0, py0 + i * st, pw, st + (i < n - 1 ? 0.8 : 0));
      ctx.fillStyle = 'rgba(0,0,0,0.22)';
      ctx.fillRect(px0 + pw - Math.max(1, Math.round(pw * 0.26)), py0, Math.max(1, Math.round(pw * 0.26)), ph2);
      const fa = (o.fog !== false) ? MC.fogAlpha(z, o) : 0;
      if (fa > 0.004) { ctx.globalAlpha *= fa; ctx.fillStyle = MC.skyOf(o).hor; ctx.fillRect(px0, py0, pw, ph2); }
      ctx.restore();
    }
    const fl = hash1(Math.floor(t * 7) * 37 + (o.seed || 0));
    const fs = Math.max(10, (o.size != null ? o.size : 24) * (q / 212) * (0.88 + fl * 0.26));
    const mx = x0 + pw / 2;
    ctx.save();
    ctx.globalAlpha *= (o.pool != null ? o.pool : 0.22) * (0.8 + fl * 0.4);
    ctx.fillStyle = '#FFAA33';
    ctx.beginPath(); ctx.ellipse(mx, gy, q * 0.40, q * 0.15, 0, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
    ctx.save();
    // the stick the torch is on: a LIT brown, not a charred one — a vanilla torch reads as
    // light wood under a flame, and at 40 px it is the only thing telling you it is a torch
    ctx.fillStyle = '#A9793B';
    ctx.fillRect(Math.round(mx - fs * 0.19), Math.round(ty - fs * 0.60), Math.round(fs * 0.38), Math.round(fs * 0.95));
    ctx.fillStyle = 'rgba(0,0,0,0.24)';
    ctx.fillRect(Math.round(mx + fs * 0.09), Math.round(ty - fs * 0.60), Math.round(fs * 0.10), Math.round(fs * 0.95));
    ctx.globalAlpha *= 0.88 + fl * 0.12;
    ctx.fillStyle = '#FFAA33';
    ctx.fillRect(Math.round(mx - fs / 2), Math.round(ty - fs * 1.25), Math.round(fs), Math.round(fs * 0.8));
    ctx.fillStyle = '#FFE9A8';
    ctx.fillRect(Math.round(mx - fs * 0.26), Math.round(ty - fs * 1.12), Math.round(fs * 0.52), Math.round(fs * 0.46));
    ctx.restore();
  };
})();
