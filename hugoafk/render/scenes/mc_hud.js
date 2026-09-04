/* ===================================================================================
   DIE SCHICHT — shared kit, part 4 of 4: THE SCREEN-SPACE HUD + THE MOTION SIGNATURE.
   Loaded after mc_kit.js / mc_world.js / mc_gui.js, before every scene file.

   This file is the reason the film reads as a game screen. The world under it moves —
   it pans, it bobs, it drifts — and the interface on top of it does not move at all,
   ever, by one pixel. That separation is the whole trick, and it is a guarantee here
   rather than a convention because TL.overlay (timeline.js) draws MC.hud() after every
   scene, so the crosshair, the hotbar, the hearts, the hunger row, the XP bar, the chat
   and the F3 overlay come out of ONE function in identical screen coordinates in all
   900 frames. A scene cannot move them because a scene never draws them.

   Every coordinate below is DIRECTION.md §5.2, used exactly as written.

   Cost (DIRECTION.md §10.4 point 2): ten hearts + ten hunger icons + nine hotbar items
   through pixelSprite would be 2000-4000 fillRect per frame. Every repeated sprite here
   is rasterised ONCE into an offscreen canvas (makeCanvas) and blitted with drawImage:
   hearts, hunger, the mouse arrow at module load; item icons on first use, because
   blockIcon needs IMG.tex which is not decoded yet when this file runs. A full mode-1
   frame is ~30 drawImage + ~60 fillRect + ~54 fillText (the doubled drop shadow is most
   of it). Measured in headless Chromium over 400 calls: 1.5 ms/frame for the fullest
   frame this film has (10 chat lines + 7 F3 lines + 9 items + counts), 1.3 ms in mode 2,
   against a whole engine frame incl. the post chain at 4.7 ms.

   Determinism: nothing in this file reads Math.random, Date or any accumulator. Every
   table is a literal built at module load. The session clock is floor(t)-derived. All
   scene-pushed state is reset to its default at the END of MC.hud(), so a frame can
   never inherit anything from the frame the worker happened to render before it —
   render.js hands out frames interleaved across workers, so that reset is not a nicety.

   Escape list (DIRECTION.md §2): zero ctx.filter, zero shadowBlur, no glow/glowText/
   flare/lightSweep/shockwave/burst/Particles/Warp/constellation/tunnel/floorGrid/
   speedLines/crtCollapse/phoneFrame/chromeGradient/pill/rings/brackets/sphereCloud, no
   FX touched at all. Fonts: Silkscreen 700, VT323 400 (always passed explicitly).
   =================================================================================== */

/* ===================================================================================
// API:
//
//   Everything is on the global MC. Every function is a pure function of its arguments
//   plus the MC.* state listed under STATE. Coordinates are canvas px, 1080x1920.
//
// -----------------------------------------------------------------------------------
// STATE — what a scene pushes into MC to drive the HUD
// -----------------------------------------------------------------------------------
//   Set these in your scene's draw(), EVERY FRAME. MC.hud() resets all of them to the
//   defaults below after it has drawn, so nothing leaks into the next frame. A scene
//   that sets nothing still gets a plausible HUD (full hearts, full hunger, empty
//   hotbar, creeping XP bar, no chat, no F3).
//
//   MC.hudMode      0|1|2       0 = no HUD (menus, screens, black) · 1 = full HUD ·
//                               2 = HUD behind an open GUI: same furniture, no
//                               crosshair, everything multiplied by MC.hudDim.
//                               DEFAULT 0 (declared in mc_kit.js).
//   MC.hudDim       number      alpha for mode 2. DEFAULT 0.50 (the world behind an open
//                               GUI is dimmed 0.55, so the HUD under that dim is ~0.45;
//                               0.50 keeps the frame-0 chat line readable at 28 %).
//   MC.crosshair    bool        DEFAULT true. Set false for every F5 third-person shot —
//                               vanilla hides the crosshair in third person.
//   MC.hudChat      bool        DEFAULT true. false suppresses the chat block without
//                               clearing MC.chatLines (use it when a GUI panel would
//                               collide with the chat, e.g. S5 inventory / S7 console).
//   MC.hotbarItems  array|null  DEFAULT null (nine empty slots). Entries:
//                                 {slot: 0..8,
//                                  item: string|{top,side}|null   sprite or block name,
//                                  count: number|null   drawn bottom-right, only if > 1,
//                                  flash: 0..1          white slot flash, 1 = solid,
//                                  alpha: number = 1}
//   MC.hotbarSel    0..8|null   DEFAULT 0. The white selection frame. null = none.
//   MC.hearts       number      DEFAULT 10. 0..10, halves allowed (7.5 -> a half heart).
//                               Empties from the RIGHT, like vanilla.
//   MC.hunger       number      DEFAULT 10. 0..10, halves allowed. Mirrored: empties
//                               from the LEFT (both bars empty from the frame centre out).
//   MC.xp           obj|null    DEFAULT null -> {level: 27, p: null}. {level: number,
//                               p: 0..1|null}. p null = the deterministic creep
//                               0.18 + t/40 (one of §6.4's always-available motions).
//                               Pass {level: n, p: 0} for an empty bar.
//   MC.chatLines    array|null  DEFAULT null (no chat). See MC.chat for the entry shape.
//   MC.f3On         bool        DEFAULT false. The F3 debug overlay.
//   MC.f3Lines      array|null  DEFAULT null -> the seven default lines (see MC.f3).
//   MC.f3Reveal     int|null    DEFAULT null (all lines). n = draw only the first n lines;
//                               S6 uses it for the line-by-line return at 16.55.
//   MC.cursorState  obj|null    DEFAULT null. {x, y, trail, trailStep, scale, alpha} —
//                               drawn by MC.hud LAST, above everything, in EVERY hudMode
//                               including 0. The pointer is not part of the HUD; putting
//                               it here is what keeps it above the GUI it is clicking.
//   MC.ripples      array|null  DEFAULT null. [{x, y, t0, dur}] touch ripples; each is
//                               drawn with p = (t - t0)/dur, skipped outside 0..1.
//                               dur DEFAULT 0.30. The entry is handed to MC.ripple as its
//                               options object too, so any MC.ripple key (color, width,
//                               r0, r1, a0, size, alpha) can be set on it.
//   MC.travelState  obj|null    DEFAULT null. {x0, y0, x1, y1, p, size, arc, alpha} — the
//                               finger-travel puck between two taps (see MC.touchTravel).
//
// -----------------------------------------------------------------------------------
// GEOMETRY — read-only constants, so scenes can hang things off the HUD
// -----------------------------------------------------------------------------------
//   MC.HUD_GEO   frozen object, all numbers, straight from DIRECTION.md §5.2:
//     crossX 540, crossY 960, crossArm 18, crossThick 2,
//     hotbarX 102, hotbarY 1764, hotbarBottom 1856, hotbarSlot 92, hotbarGap 6,
//     hotbarPitch 98, hotbarW 876, hotbarRight 978,
//     xpX 102, xpY 1748, xpW 876, xpH 6, xpLevelX 540, xpLevelY 1738, xpLevelSize 34,
//     heartX 102, heartY 1712, heartSize 36, heartPitch 38, heartCount 10,
//     hungerRight 978, hungerY 1712, hungerSize 36, hungerPitch 38, hungerCount 10,
//     chatX 100, chatY 1372, chatPitch 48, chatSize 44, chatMax 10, chatFade 0.30,
//     chatLife 8, f3X 40, f3Y 150, f3Pitch 44, f3Size 30,
//     cursorW 12, cursorH 17, cursorScale 4
//   MC.HUD_C     frozen colour table owned by this module (HUD icons come out of the
//     game's icons.png, not out of §3's world/GUI palette). Keys:
//     KANTE #000000 · HERZ #FF0000 · HERZ_LICHT #FF6B6B · HERZ_LEER #3C3C3C ·
//     FLEISCH #C87137 · FLEISCH_LICHT #E39A5B · KNOCHEN #E7E2D6 · HUNGER_LEER #3C3C3C ·
//     SLOT_BG rgba(20,20,26,0.82) · SLOT_HELL rgba(255,255,255,0.16) ·
//     SLOT_DUNKEL rgba(0,0,0,0.50) · SLOT_WAHL #FFFFFF · XP_SPUR #1B1B1F ·
//     XP_FUELLUNG #7CFC00 · F3_BG rgba(0,0,0,0.50) · ZEIGER #FFFFFF · TIPP #FFFFFF
//
//   MC.hotbarSlotX(i)  -> number   left edge x of hotbar slot i (0..8) = 102 + i*98
//   MC.hotbarSlotCX(i) -> number   centre x of hotbar slot i = 148 + i*98
//                                  (S4's `24/7` label sits above slot 3: x 442)
//
// -----------------------------------------------------------------------------------
// DRAWING
// -----------------------------------------------------------------------------------
//   MC.hud(ctx, t) -> undefined
//     THE overlay. timeline.js already calls it after every scene draw; a scene must
//     never call it. Reads MC.hudMode and draws, in this order:
//       crosshair (mode 1 only, 'difference' composite) · hotbar 9x92 px x 102..978,
//       top edge y 1764 · hearts · hunger · XP bar + level numeral · chat · F3 ·
//       then the pointer layer (ripples, travel puck, cursor) which is drawn in every
//       mode, undimmed. Calls MC.hudReset() on the way out.
//
//   MC.hudReset() -> undefined
//     Restores every STATE field above to its default. Called by MC.hud automatically.
//
//   MC.chat(ctx, lines, t, o) -> number   (count of lines actually drawn)
//     The vanilla chat block. x 100, newest line's BASELINE at y 1372, growing upward,
//     10 lines max, 48 px pitch, VT323 44 weight 400 + the mandatory 4 px drop shadow,
//     one CHAT_BG rgba(0,0,0,0.45) backing rect per line sized to that line's text + 8 px
//     padding each side (per line, so a fading line fades its own backing).
//     `lines` is an array in ARRIVAL ORDER, oldest first; it is not sorted. Entries are
//     a plain string, or:
//       {text:   string,
//        color:  hex          = MC.C.WEISS   (use C.GRAU §7, C.GELB §e, C.GRUEN §a,
//                                             C.ROT §c — DIRECTION §3.4),
//        t0:     number|null  = null   arrival time in seconds; null = always visible,
//        life:   number       = 8      seconds visible after t0; Infinity pins the line.
//                                      Ignored when t0 is null,
//        box:    hex|null     = null   2 px box around the backing rect. S6's reset proof
//                                      uses C.GELB at 14.00 and C.GRUEN at 16.55,
//        bg:     bool         = true   false drops the backing rect,
//        alpha:  number       = 1      extra multiplier}
//     Every line fades over its LAST 0.30 s (linear).
//     o: {x: 100, y: 1372, pitch: 48, size: 44, max: 10, alpha: 1, fade: 0.30,
//         life: 8, family: FONTS.term, weight: 400, pad: 8}
//
//   MC.f3(ctx, t, o) -> number   (count of lines drawn)
//     The F3 debug overlay: 7 lines, VT323 30 weight 400 + shadow, x 40, first baseline
//     y 150, 44 px pitch, each on its own rgba(0,0,0,0.50) backing rect sized to the
//     text + 6 px. Decoration only — it sits outside the safe box on purpose (§4.4,
//     §5.4), and every fact in it is also stated at >= 40 px somewhere else.
//     Lines: string or {text, color = C.WEISS, box = null}.
//     Defaults (DIRECTION.md §8 S3, the `Sitzung` clock live off floor(t)):
//       'HugoAFK 1.0 (Cloud)' · 'Dein PC: aus' (C.GELB, the only yellow line) ·
//       'Sitzung: 132:04:51' · 'Server: HugoSMP' ·
//       'XYZ: 148.500 / 71.000 / -302.318' · 'Block: 148 71 -302' · 'Facing: south (+Z)'
//     o: {lines: array|null = MC.f3Lines, n: int|null = MC.f3Reveal (lines to draw),
//         x: 40, y: 150, pitch: 44, size: 30, alpha: 1, pad: 6}
//
//   MC.sessionClock(t, base) -> string   e.g. '132:04:51'
//     H:MM:SS, ticking one second per second off floor(t). base DEFAULT MC.SESSION_BASE
//     = 475484 s, chosen so that t = 7.000 reads exactly '132:04:51' (§8 S3). S7's stats
//     strip should use this so the two clocks can never disagree.
//   MC.SESSION_BASE  number = 475484
//
//   MC.itemSprite(ctx, name, cx, cy, o) -> {w, h}|null
//     One item icon, centred on (cx, cy), from the module's offscreen cache — the cheap
//     path for ANY slot in the film, not just the hotbar (S5 fills 27 inventory slots;
//     going through pixelSprite there would cost ~3000 fillRect per frame).
//     `name` is a SPRITES key (flat 16x16 sprite) or one of the block names 'pumpkin' /
//     'chest' / 'spawner', which render as vanilla isometric block icons through
//     blockIcon(flat: true) exactly like mcItem does; an explicit {top, side} object
//     works too. Returns null while IMG.tex is still undecoded or for an unknown name.
//     o: {slot: number = 92   the box the icon is fitted to; flat sprites get
//                             cell = slot/15 (12 visible sprite px -> 0.8 * slot),
//                             block icons get edge = slot * 0.44,
//         alpha: number = 1}
//
//   MC.cursor(ctx, x, y, o) -> undefined
//     The white 12x17 pixel mouse arrow (white body, 1 px black outline), scale 4 by
//     default = 48x68 px. (x, y) is the ARROW'S TIP — the sprite's top-left pixel — so
//     it is also the click point. Nearest-neighbour, integer-snapped.
//     o: {scale: number = 4, alpha: number = 1,
//         trail: [[x,y],...]|null = null   up to 3 ghost positions, drawn at alpha
//                                          0.50 / 0.30 / 0.15 (§6.3),
//         trailStep: [dx,dy]|null = null   used only when `trail` is null: ghosts at
//                                          (x - dx*k, y - dy*k), k = 1,2,3}
//
//   MC.cursorSlide(t, o) -> {x, y, trail}|null
//     The motion signature's two moves, so the exit at 2.00 and the return at 26.30 use
//     one path helper and cannot disagree. Feed the result straight to MC.cursor, or to
//     MC.cursorState so it draws above the HUD:
//         const c = MC.cursorSlide(t, {t0: 2.033, from: [540, 810], to: MC.CURSOR_OFF});
//         if (c) MC.cursorState = c;
//     The trail is the path itself sampled at t - 1/30, t - 2/30, t - 3/30, so the
//     ghosts are honest previous frames.
//     o: {t0: number   (required), dur: number = 4/30   the window is [t0, t0 + dur), so
//                                4/30 draws exactly four frames: p = 0, .25, .50, .75,
//         from: [x,y], to: [x,y],
//         ease: fn = E.linear    linear spaces the four arrows evenly along the diagonal,
//                                which is what makes the 4-frame exit read as a streak;
//                                E.inCubic piles three of them on the start point. Pass
//                                E.outCubic for the 26.30 return so it decelerates in,
//         hold: bool = false     after the window, keep returning the end point with no
//                                trail (the arrow stays on screen and hovers)}
//     Returns null before t0, and after t0+dur unless hold.
//   MC.CURSOR_OFF  [1300, 2320]   the shared off-frame anchor bottom-right. The cursor
//                                 leaves to it at 2.00 and comes back from it at 26.30, so
//                                 both moves lie on one diagonal. It sits well beyond the
//                                 corner on purpose: over the 4-frame exit only p = 0,
//                                 .25, .50, .75 are ever drawn, and this target is far
//                                 enough out that by p = .75 the arrow's tip (1110, 1942)
//                                 has cleared the frame — the arrow visibly leaves instead
//                                 of stopping short of the edge and vanishing.
//
//   MC.ripple(ctx, x, y, p, o) -> undefined
//     The touch ripple (§6.3, S7 only — this is the whole "from your phone" argument).
//     Stroked circle r 20 -> 90 on E.outCubic, stroke alpha 0.50 -> 0 linear, 4 px wide,
//     plus a filled 14 px white centre mark that fades out by p = 0.63. p outside 0..1
//     draws nothing.
//     o: {color: hex = '#FFFFFF', width: 4, r0: 20, r1: 90, a0: 0.50, size: 14,
//         alpha: 1}
//
//   MC.touchTravel(ctx, x0, y0, x1, y1, p, o) -> undefined
//     The 24 px trailing travel puck between the two taps at 18.50 and 19.40 — visible
//     finger travel, which is how the film says "from your phone" without drawing a
//     phone. A quadratic arc from (x0,y0) to (x1,y1) bowed by `arc` px, the puck at p
//     plus 4 fading ghosts behind it, the whole thing fading in over the first 15 % and
//     out over the last 15 %. p outside 0..1 draws nothing.
//     o: {size: number = 24 (diameter), arc: number = -90 (negative bows upward),
//         color: hex = '#FFFFFF', alpha: number = 0.55, ghosts: int = 4,
//         gap: number = 0.06   (progress between ghosts)}
//
// -----------------------------------------------------------------------------------
// NOTES A SCENE AUTHOR WILL WANT
// -----------------------------------------------------------------------------------
//   · The crosshair is drawn as THREE rects, not two: 2x18 vertical plus two 8x2
//     horizontal stubs either side of it. 'difference' is per draw call, so a single
//     18x2 bar would invert the shared 2x2 centre twice and punch a hole in it.
//   · The XP level numeral is the one string in this file drawn WITHOUT the §4.1 drop
//     shadow: §5.2 specifies '#7CFC00 with a 2 px black outline', which is how vanilla
//     draws it, so it goes through MC.text with {shadow: false, stroke: {...}}.
//   · The overlay always draws AFTER the scene, so the F3 block (x 34..~440, y 123..429)
//     sits on top of anything the scene drew there, including a GUI panel — vanilla would
//     put it underneath. The only panel that reaches into it is S5's inventory at
//     (130, 420): its top-left corner meets the last F3 line by ~9 px. If that shows,
//     set MC.f3Reveal = 6 (or MC.f3On = false) while the panel is open.
//   · Nothing load-bearing sits outside the safe box. Inside x 90..900 / y 300..1420:
//     the chat block (x 100, y 940..1372 when full). Outside it on purpose (§5.4):
//     hotbar, hearts, hunger, XP bar, F3, and the lower chat lines when the block is
//     full. No fact lives only there.
//   · MC.hud never touches FX, never calls ctx.filter, and never allocates a gradient
//     or a pattern.
   =================================================================================== */

(function () {
  const C = MC.C;
  const R = Math.round;

  /* ---------------------------------------------------------------- 1 · constants */
  const GEO = MC.HUD_GEO = Object.freeze({
    crossX: 540, crossY: 960, crossArm: 18, crossThick: 2,
    hotbarX: 102, hotbarY: 1764, hotbarBottom: 1856, hotbarSlot: 92, hotbarGap: 6,
    hotbarPitch: 98, hotbarW: 876, hotbarRight: 978,
    xpX: 102, xpY: 1748, xpW: 876, xpH: 6, xpLevelX: 540, xpLevelY: 1738, xpLevelSize: 34,
    heartX: 102, heartY: 1712, heartSize: 36, heartPitch: 38, heartCount: 10,
    hungerRight: 978, hungerY: 1712, hungerSize: 36, hungerPitch: 38, hungerCount: 10,
    chatX: 100, chatY: 1372, chatPitch: 48, chatSize: 44, chatMax: 10, chatFade: 0.30, chatLife: 8,
    f3X: 40, f3Y: 150, f3Pitch: 44, f3Size: 30,
    cursorW: 12, cursorH: 17, cursorScale: 4,
  });

  /* HUD icon colours. The hearts, the hunger shanks and the arrow come out of the game's
     icons.png, not out of §3's world/GUI palette — but they are still named, never inline. */
  const HC = MC.HUD_C = Object.freeze({
    KANTE: '#000000',
    HERZ: '#FF0000', HERZ_LICHT: '#FF6B6B', HERZ_LEER: '#3C3C3C',
    FLEISCH: '#C87137', FLEISCH_LICHT: '#E39A5B', KNOCHEN: '#E7E2D6', HUNGER_LEER: '#3C3C3C',
    SLOT_BG: 'rgba(20,20,26,0.82)', SLOT_HELL: 'rgba(255,255,255,0.16)',
    SLOT_DUNKEL: 'rgba(0,0,0,0.50)', SLOT_WAHL: '#FFFFFF',
    XP_SPUR: '#1B1B1F', XP_FUELLUNG: '#7CFC00',
    F3_BG: 'rgba(0,0,0,0.50)',
    ZEIGER: '#FFFFFF', TIPP: '#FFFFFF',
  });

  MC.SESSION_BASE = 475484;          // t = 7.000 -> 132:04:51 (§8 S3)
  MC.CURSOR_OFF = [1300, 2320];      // off-frame bottom-right anchor (§6.3)
  const GHOST = [0.50, 0.30, 0.15];  // the 3-position cursor ghost trail (§6.3)

  MC.hotbarSlotX = i => GEO.hotbarX + i * GEO.hotbarPitch;
  MC.hotbarSlotCX = i => GEO.hotbarX + i * GEO.hotbarPitch + GEO.hotbarSlot / 2;

  /* ---------------------------------------------------------------- 2 · sprites
     Everything repeated is rasterised once here and blitted with drawImage afterwards
     (§10.4 point 2). 9x9 matrices at cell 4 -> 36 px, exactly the §5.2 icon size. */
  function paint(x2, rows, pal, cell, c0, c1) {
    for (let r = 0; r < rows.length; r++) {
      const row = rows[r];
      for (let c = c0; c < c1; c++) {
        const ch = row[c];
        if (!ch || ch === '.') continue;
        const col = pal[ch]; if (!col) continue;
        x2.fillStyle = col; x2.fillRect(c * cell, r * cell, cell, cell);
      }
    }
  }
  function pixCanvas(rows, pal, cell) {
    const c = makeCanvas(rows[0].length * cell, rows.length * cell);
    paint(c.getContext('2d'), rows, pal, cell, 0, rows[0].length);
    return c;
  }
  function halfCanvas(rows, palFull, palEmpty, cell, split) {
    const c = pixCanvas(rows, palEmpty, cell);
    paint(c.getContext('2d'), rows, palFull, cell, 0, split);
    return c;
  }

  const HEART_ROWS = [
    '.ooo.ooo.',
    'ohhrorrro',
    'ohhrrrrro',
    'ohrrrrrro',
    '.orrrrro.',
    '..orrro..',
    '...oro...',
    '....o....',
    '.........',
  ];
  const HEART_PAL = { o: HC.KANTE, r: HC.HERZ, h: HC.HERZ_LICHT };
  const HEART_LEER_PAL = { o: HC.KANTE, r: HC.HERZ_LEER, h: HC.HERZ_LEER };

  /* the drumstick: meat blob to the upper right, bone stub pointing down-left */
  const HUNGER_ROWS = [
    '...oooo..',
    '..oMmmmo.',
    '.oMmmmmmo',
    '.ommmmmmo',
    '.ommmmmmo',
    '..ommmmoo',
    '.obbmmoo.',
    'obbbo....',
    '.ooo.....',
  ];
  const HUNGER_PAL = { o: HC.KANTE, m: HC.FLEISCH, M: HC.FLEISCH_LICHT, b: HC.KNOCHEN };
  const HUNGER_LEER_PAL = { o: HC.KANTE, m: HC.HUNGER_LEER, M: HC.HUNGER_LEER, b: HC.HUNGER_LEER };

  const ICON_CELL = GEO.heartSize / 9;   // 4
  const SPR = {
    heart: pixCanvas(HEART_ROWS, HEART_PAL, ICON_CELL),
    heartHalf: halfCanvas(HEART_ROWS, HEART_PAL, HEART_LEER_PAL, ICON_CELL, 5),
    heartEmpty: pixCanvas(HEART_ROWS, HEART_LEER_PAL, ICON_CELL),
    hunger: pixCanvas(HUNGER_ROWS, HUNGER_PAL, ICON_CELL),
    hungerHalf: halfCanvas(HUNGER_ROWS, HUNGER_PAL, HUNGER_LEER_PAL, ICON_CELL, 5),
    hungerEmpty: pixCanvas(HUNGER_ROWS, HUNGER_LEER_PAL, ICON_CELL),
  };

  /* the mouse arrow: 12 wide, 17 tall, white body, 1 px black outline, tip at (0,0) */
  const CURSOR_ROWS = [
    'K...........',
    'KK..........',
    'KwK.........',
    'KwwK........',
    'KwwwK.......',
    'KwwwwK......',
    'KwwwwwK.....',
    'KwwwwwwK....',
    'KwwwwwwwK...',
    'KwwwwwwwwK..',
    'KwwwwwKKKKK.',
    'KwwKwwK.....',
    'KwK.KwwK....',
    'KK..KwwK....',
    'K....KwwK...',
    '.....KwwK...',
    '......KK....',
  ];
  const CURSOR_PAL = { K: HC.KANTE, w: HC.ZEIGER };
  const _cursors = new Map();
  function cursorCanvas(scale) {
    let c = _cursors.get(scale);
    if (!c) { c = pixCanvas(CURSOR_ROWS, CURSOR_PAL, scale); _cursors.set(scale, c); }
    return c;
  }
  cursorCanvas(GEO.cursorScale);   // the film's only scale, built at module load

  /* item icons. blockIcon needs IMG.tex, which is still undecoded while this file runs,
     so these are cached on first use instead of at module load — same guarantee (one
     rasterisation for the whole render), just deferred by one frame. */
  const BLOCK_ICONS = {
    pumpkin: { top: 'pumpkin_top', side: 'pumpkin_side' },
    chest: { top: 'oak_planks', side: 'chest' },
    spawner: { top: 'spawner', side: 'spawner' },
  };
  const _items = new Map();
  function itemCanvas(name, slot) {
    const key = (typeof name === 'string' ? name : (name.top + '|' + name.side)) + '@' + slot;
    if (_items.has(key)) return _items.get(key);
    let c = null;
    const block = (typeof name === 'string') ? BLOCK_ICONS[name] : name;
    if (block) {
      if (!IMG.tex || !IMG.texMeta) return null;              // retry next frame, do not cache
      const s = slot * 0.44, w = Math.ceil(s * 1.732) + 2, h = Math.ceil(s * 2) + 2;
      c = makeCanvas(w, h);
      const x2 = c.getContext('2d');
      blockIcon(x2, block, w / 2, 1 + s * 0.5, s, { flat: true });
    } else if (SPRITES[name]) {
      const sp = SPRITES[name], cell = slot / 15;
      c = makeCanvas(R(sp.rows[0].length * cell), R(sp.rows.length * cell));
      pixelSprite(c.getContext('2d'), 0, 0, cell, sp.rows, sp.pal, { align: 'left', baseline: 'top' });
    }
    _items.set(key, c);
    return c;
  }

  MC.itemSprite = function (ctx, name, cx, cy, o) {
    o = o || {};
    const c = itemCanvas(name, o.slot || GEO.hotbarSlot);
    if (!c) return null;
    MC.pixel(ctx, k => {
      if (o.alpha != null) k.globalAlpha *= o.alpha;
      k.drawImage(c, R(cx - c.width / 2), R(cy - c.height / 2));
    });
    return { w: c.width, h: c.height };
  };

  /* ---------------------------------------------------------------- 3 · crosshair */
  function crosshair(ctx) {
    const x = GEO.crossX, y = GEO.crossY, a = GEO.crossArm / 2, h = GEO.crossThick / 2;
    ctx.save();
    ctx.globalCompositeOperation = 'difference';
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(x - h, y - a, GEO.crossThick, GEO.crossArm);   // 2 x 18
    ctx.fillRect(x - a, y - h, a - h, GEO.crossThick);          // 8 x 2, left stub
    ctx.fillRect(x + h, y - h, a - h, GEO.crossThick);          // 8 x 2, right stub
    ctx.restore();
  }

  /* ---------------------------------------------------------------- 4 · hotbar */
  function hotbarSlot(ctx, x, y, s, sel) {
    MC.rect(ctx, x, y, s, s, HC.SLOT_BG);
    MC.rect(ctx, x, y, s, 3, HC.SLOT_HELL); MC.rect(ctx, x, y, 3, s, HC.SLOT_HELL);
    MC.rect(ctx, x, y + s - 3, s, 3, HC.SLOT_DUNKEL); MC.rect(ctx, x + s - 3, y, 3, s, HC.SLOT_DUNKEL);
    if (sel) { ctx.strokeStyle = HC.SLOT_WAHL; ctx.lineWidth = 4; ctx.strokeRect(x - 2, y - 2, s + 4, s + 4); }
  }

  function hotbar(ctx) {
    const s = GEO.hotbarSlot, y = GEO.hotbarY, sel = MC.hotbarSel;
    for (let i = 0; i < 9; i++) hotbarSlot(ctx, MC.hotbarSlotX(i), y, s, sel === i);
    const items = MC.hotbarItems;
    if (!items) return;
    for (const it of items) {
      if (!it || it.slot == null || it.slot < 0 || it.slot > 8) continue;
      const x = MC.hotbarSlotX(it.slot), cx = x + s / 2, cy = y + s / 2;
      if (it.item) MC.itemSprite(ctx, it.item, cx, cy, { slot: s, alpha: it.alpha });
      if (it.count != null && it.count > 1) {
        MC.text(ctx, String(it.count), x + s - 8, y + s - 12, {
          size: 34, family: FONTS.term, weight: 400, color: C.WEISS,
          align: 'right', baseline: 'alphabetic', alpha: it.alpha,
        });
      }
      if (it.flash) { ctx.save(); ctx.globalAlpha *= clamp(it.flash); MC.rect(ctx, x, y, s, s, '#FFFFFF'); ctx.restore(); }
    }
  }

  /* ---------------------------------------------------------------- 5 · hearts + hunger
     Both bars empty from the centre of the frame outward, exactly like vanilla: hearts
     lose their RIGHTMOST icon first, hunger its LEFTMOST. */
  function iconRow(ctx, n, value, x0, step, top, full, half, empty) {
    for (let i = 0; i < n; i++) {
      const x = R(x0 + i * step);
      const c = value >= i + 1 ? full : (value >= i + 0.5 ? half : empty);
      ctx.drawImage(c, x, top);
    }
  }
  function vitals(ctx) {
    const top = R(GEO.heartY - GEO.heartSize / 2);
    MC.pixel(ctx, k => {
      iconRow(k, GEO.heartCount, MC.hearts, GEO.heartX, GEO.heartPitch, top,
        SPR.heart, SPR.heartHalf, SPR.heartEmpty);
      // mirrored row: index 0 is the RIGHTMOST shank
      const x0 = GEO.hungerRight - GEO.hungerSize;
      iconRow(k, GEO.hungerCount, MC.hunger, x0, -GEO.hungerPitch, top,
        SPR.hunger, SPR.hungerHalf, SPR.hungerEmpty);
    });
  }

  /* ---------------------------------------------------------------- 6 · XP bar */
  function xpBar(ctx, t) {
    const xp = MC.xp || { level: 27, p: null };
    let p = xp.p;
    if (p == null) p = (0.18 + t / 40) % 1;          // the deterministic creep (§6.4)
    p = clamp(p);
    MC.rect(ctx, GEO.xpX, GEO.xpY, GEO.xpW, GEO.xpH, HC.XP_SPUR);
    if (p > 0) MC.rect(ctx, GEO.xpX, GEO.xpY, GEO.xpW * p, GEO.xpH, HC.XP_FUELLUNG);
    if (xp.level == null) return;
    // §5.2: the level numeral is green with a 2 px black outline — vanilla draws it with
    // an outline instead of the §4.1 drop shadow, so this is the one shadowless HUD string.
    MC.text(ctx, String(xp.level), GEO.xpLevelX, GEO.xpLevelY, {
      size: GEO.xpLevelSize, family: FONTS.silk, weight: 700, color: HC.XP_FUELLUNG,
      align: 'center', baseline: 'middle', shadow: false,
      stroke: { width: 2, color: HC.KANTE },
    });
  }

  /* ---------------------------------------------------------------- 7 · chat */
  MC.chat = function (ctx, lines, t, o) {
    if (!lines || !lines.length) return 0;
    o = o || {};
    const x = o.x != null ? o.x : GEO.chatX;
    const yBase = o.y != null ? o.y : GEO.chatY;
    const pitch = o.pitch || GEO.chatPitch;
    const size = o.size || GEO.chatSize;
    const max = o.max || GEO.chatMax;
    const fade = o.fade != null ? o.fade : GEO.chatFade;
    const defLife = o.life != null ? o.life : GEO.chatLife;
    const pad = o.pad != null ? o.pad : 8;
    const fam = o.family || FONTS.term, weight = o.weight || 400;
    const base = o.alpha != null ? o.alpha : 1;

    const vis = [];
    for (const raw of lines) {
      if (!raw) continue;
      const L = (typeof raw === 'string') ? { text: raw } : raw;
      if (!L.text) continue;
      let a = 1;
      if (L.t0 != null) {
        if (t < L.t0) continue;
        const life = L.life != null ? L.life : defLife;
        if (life !== Infinity) {
          const end = L.t0 + life;
          if (t >= end) continue;
          a = clamp((end - t) / fade);
        }
      }
      if (L.alpha != null) a *= L.alpha;
      if (a <= 0.004) continue;
      vis.push({ L, a });
    }
    const n = Math.min(vis.length, max);
    const lineOpt = { size: size, family: fam, weight: weight, align: 'left', baseline: 'alphabetic' };
    for (let i = 0; i < n; i++) {
      const row = vis[vis.length - 1 - i];          // i = 0 -> newest, at yBase
      const y = yBase - i * pitch;
      const L = row.L;
      ctx.save();
      ctx.globalAlpha *= base * row.a;
      if (L.bg !== false || L.box) {
        const w = measureText(ctx, L.text, lineOpt);
        const bx = R(x - pad), by = R(y - size * 0.80), bw = R(w + pad * 2), bh = R(pitch);
        if (L.bg !== false) MC.rect(ctx, bx, by, bw, bh, C.CHAT_BG);
        if (L.box) { ctx.strokeStyle = L.box; ctx.lineWidth = 2; ctx.strokeRect(bx + 1, by + 1, bw - 2, bh - 2); }
      }
      MC.text(ctx, L.text, x, y, Object.assign({ color: L.color || C.WEISS }, lineOpt));
      ctx.restore();
    }
    return n;
  };

  /* ---------------------------------------------------------------- 8 · F3 overlay */
  MC.sessionClock = function (t, base) {
    const total = (base != null ? base : MC.SESSION_BASE) + Math.floor(t);
    const h = Math.floor(total / 3600), m = Math.floor((total % 3600) / 60), s = total % 60;
    return h + ':' + String(m).padStart(2, '0') + ':' + String(s).padStart(2, '0');
  };

  function defaultF3(t) {
    return [
      'HugoAFK 1.0 (Cloud)',
      { text: 'Dein PC: aus', color: C.GELB },
      'Sitzung: ' + MC.sessionClock(t),
      'Server: HugoSMP',
      'XYZ: 148.500 / 71.000 / -302.318',
      'Block: 148 71 -302',
      'Facing: south (+Z)',
    ];
  }

  MC.f3 = function (ctx, t, o) {
    o = o || {};
    const lines = o.lines || MC.f3Lines || defaultF3(t);
    let n = o.n != null ? o.n : MC.f3Reveal;
    n = (n == null) ? lines.length : Math.min(n, lines.length);
    if (n <= 0) return 0;
    const x = o.x != null ? o.x : GEO.f3X;
    const y0 = o.y != null ? o.y : GEO.f3Y;
    const pitch = o.pitch || GEO.f3Pitch;
    const size = o.size || GEO.f3Size;
    const pad = o.pad != null ? o.pad : 6;
    const opt = { size: size, family: FONTS.term, weight: 400, align: 'left', baseline: 'alphabetic' };
    ctx.save();
    if (o.alpha != null) ctx.globalAlpha *= o.alpha;
    for (let i = 0; i < n; i++) {
      const raw = lines[i];
      if (!raw) continue;
      const L = (typeof raw === 'string') ? { text: raw } : raw;
      if (!L.text) continue;
      const y = y0 + i * pitch;
      const w = measureText(ctx, L.text, opt);
      const bx = R(x - pad), by = R(y - size * 0.90), bw = R(w + pad * 2), bh = R(size + pad * 2);
      MC.rect(ctx, bx, by, bw, bh, HC.F3_BG);
      if (L.box) { ctx.strokeStyle = L.box; ctx.lineWidth = 2; ctx.strokeRect(bx + 1, by + 1, bw - 2, bh - 2); }
      MC.text(ctx, L.text, x, y, Object.assign({ color: L.color || C.WEISS }, opt));
    }
    ctx.restore();
    return n;
  };

  /* ---------------------------------------------------------------- 9 · the pointer
     The cursor, the touch ripples and the finger-travel puck. This is DIRECTION §6.3 —
     the hands leave at 2.00, the game keeps playing, the hands come back at 26.30. */
  MC.cursor = function (ctx, x, y, o) {
    o = o || {};
    const c = cursorCanvas(o.scale || GEO.cursorScale);
    const a = o.alpha != null ? o.alpha : 1;
    let trail = o.trail || null;
    if (!trail && o.trailStep) {
      trail = [];
      for (let k = 1; k <= 3; k++) trail.push([x - o.trailStep[0] * k, y - o.trailStep[1] * k]);
    }
    MC.pixel(ctx, k => {
      if (trail) {
        for (let i = 0; i < trail.length && i < 3; i++) {
          const g = trail[i]; if (!g) continue;
          k.globalAlpha = a * GHOST[i];
          k.drawImage(c, R(g[0]), R(g[1]));
        }
      }
      k.globalAlpha = a;
      k.drawImage(c, R(x), R(y));
    });
  };

  MC.cursorSlide = function (t, o) {
    const t0 = o.t0, dur = o.dur != null ? o.dur : 4 / 30;
    const from = o.from || MC.CURSOR_OFF, to = o.to || MC.CURSOR_OFF;
    const ease = o.ease || E.linear;
    if (t < t0 - 1e-6) return null;
    // half-open window [t0, t0 + dur), snapped off the frame boundary so dur = 4/30 covers
    // exactly four frames and never five depending on float rounding.
    if (t >= t0 + dur - 1e-6) {
      return o.hold ? { x: to[0], y: to[1], trail: null } : null;
    }
    const at = u => {
      const e = ease(clamp(u));
      return [from[0] + (to[0] - from[0]) * e, from[1] + (to[1] - from[1]) * e];
    };
    const p = (t - t0) / dur;
    const here = at(p);
    const trail = [];
    // ghosts are the path sampled one, two and three frames back — a ghost from before the
    // slide started is dropped, not clamped onto the start point, so the streak grows.
    for (let k = 1; k <= 3; k++) {
      const u = p - k / 30 / dur;
      if (u < -1e-9) break;
      trail.push(at(u));
    }
    return { x: here[0], y: here[1], trail: trail };
  };

  MC.ripple = function (ctx, x, y, p, o) {
    if (!(p >= 0) || p > 1) return;
    o = o || {};
    const col = o.color || HC.TIPP;
    const r0 = o.r0 != null ? o.r0 : 20, r1 = o.r1 != null ? o.r1 : 90;
    const r = r0 + (r1 - r0) * E.outCubic(p);
    ctx.save();
    if (o.alpha != null) ctx.globalAlpha *= o.alpha;
    ctx.strokeStyle = col; ctx.lineWidth = o.width != null ? o.width : 4;
    ctx.globalAlpha *= (o.a0 != null ? o.a0 : 0.50) * (1 - p);
    ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.stroke();
    ctx.restore();
    const ca = clamp(1 - p * 1.6) * 0.9;
    if (ca > 0.004) {
      ctx.save();
      if (o.alpha != null) ctx.globalAlpha *= o.alpha;
      ctx.globalAlpha *= ca; ctx.fillStyle = col;
      ctx.beginPath(); ctx.arc(x, y, (o.size != null ? o.size : 14) / 2, 0, TAU); ctx.fill();
      ctx.restore();
    }
  };

  MC.touchTravel = function (ctx, x0, y0, x1, y1, p, o) {
    if (!(p >= 0) || p > 1) return;
    o = o || {};
    const arc = o.arc != null ? o.arc : -90;
    const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2 + arc;
    const at = u => {
      const v = 1 - u;
      return [v * v * x0 + 2 * v * u * cx + u * u * x1, v * v * y0 + 2 * v * u * cy + u * u * y1];
    };
    const env = Math.min(1, p / 0.15, (1 - p) / 0.15);
    if (env <= 0.004) return;
    const col = o.color || HC.TIPP;
    const base = (o.alpha != null ? o.alpha : 0.55) * env;
    const rr = (o.size != null ? o.size : 24) / 2;
    const gh = o.ghosts != null ? o.ghosts : 4;
    const gap = o.gap != null ? o.gap : 0.06;
    ctx.save();
    ctx.fillStyle = col;
    for (let k = gh; k >= 0; k--) {
      const u = p - k * gap;
      if (u < 0) continue;
      const q = at(u);
      ctx.globalAlpha = base * (1 - k / (gh + 1)) * (k === 0 ? 1 : 0.7);
      ctx.beginPath(); ctx.arc(q[0], q[1], rr * (1 - k * 0.10), 0, TAU); ctx.fill();
    }
    ctx.restore();
  };

  /* ---------------------------------------------------------------- 10 · the overlay */
  MC.hudReset = function () {
    MC.hudMode = 0;
    MC.hudDim = 0.50;
    MC.crosshair = true;
    MC.hudChat = true;
    MC.hotbarItems = null;
    MC.hotbarSel = 0;
    MC.hearts = 10;
    MC.hunger = 10;
    MC.xp = null;
    MC.chatLines = null;
    MC.f3On = false;
    MC.f3Lines = null;
    MC.f3Reveal = null;
    MC.cursorState = null;
    MC.ripples = null;
    MC.travelState = null;
  };

  MC.hud = function (ctx, t) {
    const mode = MC.hudMode | 0;
    if (mode === 1 || mode === 2) {
      ctx.save();
      if (mode === 2) ctx.globalAlpha *= (MC.hudDim != null ? MC.hudDim : 0.50);
      if (mode === 1 && MC.crosshair !== false) crosshair(ctx);
      hotbar(ctx);
      vitals(ctx);
      xpBar(ctx, t);
      if (MC.hudChat !== false) MC.chat(ctx, MC.chatLines, t);
      if (MC.f3On) MC.f3(ctx, t);
      ctx.restore();
    }
    // the pointer layer is NOT the HUD: it is drawn in every mode, undimmed, on top.
    const rip = MC.ripples;
    if (rip) for (const r of rip) {
      if (!r) continue;
      MC.ripple(ctx, r.x, r.y, (t - r.t0) / (r.dur != null ? r.dur : 0.30), r);
    }
    const tv = MC.travelState;
    if (tv) MC.touchTravel(ctx, tv.x0, tv.y0, tv.x1, tv.y1, tv.p, tv);
    const cs = MC.cursorState;
    if (cs) MC.cursor(ctx, cs.x, cs.y, cs);
    MC.hudReset();
  };

  MC.hudReset();
})();
