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

   Every coordinate below is DIRECTION.md §5.2, used exactly as written, with six numbers
   excepted: the crosshair (42 x 6, not 18 x 2), the XP bar (876 x 18 at y 1740, not
   876 x 6 at y 1748) and the level numeral that sits on it. §5.2's crosshair and XP bar
   are vanilla at GUI scale 2 while the rest of the same table — 92 px hotbar slots, a
   876 px XP bar, a 36/38 px heart row — is vanilla at scale ~4.7, and the two elements
   drawn at the wrong scale were the two that stopped reading as the game. The reasoning,
   the measurements and what was checked are under DEVIATIONS at the end of the API
   block; every other number here is the spec.

   Cost (DIRECTION.md §10.4 point 2): ten hearts + ten hunger icons + nine hotbar items
   through pixelSprite would be 2000-4000 fillRect per frame. Every repeated sprite here
   is rasterised ONCE into an offscreen canvas (makeCanvas) and blitted with drawImage:
   hearts, hunger, the mouse arrow at module load; item icons on first use, because
   blockIcon needs IMG.tex which is not decoded yet when this file runs. A full mode-1
   frame is ~30 drawImage + ~70 fillRect + ~57 fillText (the doubled drop shadow is most
   of it, plus the four-offset outline on the XP numeral). Measured in headless Chromium
   over 400 calls: 0.94 ms/frame for the fullest frame this film has (10 chat lines +
   7 F3 lines + 9 items + counts + selection), 1.25 ms in mode 2, against a whole engine
   frame incl. the post chain at 4.7 ms.

   Determinism: nothing in this file reads Math.random, Date or any accumulator. Every
   table is a literal built at module load. The session clock is floor(t)-derived. All
   scene-pushed state is reset to its default at the END of MC.hud(), so a frame can
   never inherit anything from the frame the worker happened to render before it —
   render.js hands out frames interleaved across workers, so that reset is not a nicety.

   Escape list (DIRECTION.md §2): zero ctx.filter, zero shadowBlur, no glow/glowText/
   flare/lightSweep/shockwave/burst/Particles/Warp/constellation/tunnel/floorGrid/
   speedLines/crtCollapse/phoneFrame/chromeGradient/pill/rings/brackets/sphereCloud, no
   FX touched at all.

   Fonts (APPENDIX B1): the interface face is Press Start 2P via MC.ui(size, o) — the
   hotbar stack counts and the XP level numeral — and the running-text face is VT323 via
   MC.tx(size, o) — chat and F3. Both weight 400, always, and both helpers pass it. This
   module contains no other strings. FONTS.silk appears nowhere; sizes carried over from a
   §4.4 Silkscreen figure go through MC.pss(), which divides by 1.31.
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
//                                  count: number|null   drawn bottom-right in the
//                                                       interface face at GEO.countSize,
//                                                       only if > 1 (as vanilla does),
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
//   MC.HUD_GEO   frozen object, all numbers. DIRECTION.md §5.2 throughout, except the
//     crosshair, the XP bar and the level numeral (marked <- below, and argued under
//     DEVIATIONS), plus two keys §5.2 never fixed: hotbarSelW and countSize.
//     crossX 540, crossY 960, crossArm 42, crossThick 6,          <- §5.2 says 18 / 2
//     hotbarX 102, hotbarY 1764, hotbarBottom 1856, hotbarSlot 92, hotbarGap 6,
//     hotbarPitch 98, hotbarW 876, hotbarRight 978,
//     hotbarSelW 6     the white selection frame's width (not to be confused with the
//                      STATE field MC.hotbarSel, which is the selected index). It is
//                      drawn OUTSIDE the slot, so the selected slot's footprint is
//                      104 px and the frame fills the 6 px gap,
//     countSize 26     the stack count, Press Start 2P (1.0 x size per char: a two-digit
//                      count is 52 px, a three-digit one 78 px, in a 92 px slot),
//     xpX 102, xpY 1740, xpW 876, xpH 18, xpFrame 4,              <- §5.2 says y 1748, h 6
//     xpLevelX 540, xpLevelY 1736, xpLevelSize 26, xpLevelOutline 4,
//                      xpLevelY is the numeral's BASELINE (glyphs 1710..1733, i.e. clear
//                      of both the hearts row and the bar), and xpLevelSize is
//                      MC.pss(34) — the §5.2 numeral in the interface face,
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
//     It ALSO clears mc_world's MC.armHidden (APPENDIX B5). That flag is not the HUD's,
//     but it is the same kind of per-frame scene flag as MC.hudMode, and MC.hud is the one
//     function guaranteed to run on every frame of the film — so a scene that opens a GUI,
//     sets MC.armHidden = true and forgets to clear it cannot silently lose the
//     first-person arm for the rest of the film. Set it every frame you want it, and set
//     it BEFORE the MC.arm call: the arm is drawn by the scene, the reset by the overlay.
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
//         life: 8, family: MC.F.txt (VT323), weight: 400, pad: 8}
//     The backing rect is the line's text width + 2*pad, 48 px tall, its top at
//     y - 0.75*size, so consecutive lines tile edge to edge and the ink sits centred in
//     its cell. A ten-line block runs y 907..1386 — inside the safe box, x 100..~812 for
//     the widest line in the film (VT323 44 measures 704 px on `Tipp: HugoAFK merkt sich
//     deine Position.`), so no chat line can leave x 90..900 / y 300..1420.
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
//   · The crosshair is drawn as THREE rects, not two: 6x42 vertical plus two 18x6
//     horizontal stubs either side of it. 'difference' is per draw call, so a single
//     42x6 bar would invert the shared 6x6 centre twice and punch a hole in it.
//   · The XP level numeral is the one string in this file drawn WITHOUT the §4.1 drop
//     shadow. Vanilla outlines it instead, by stamping the string in black at four
//     cardinal offsets and putting the green on top, and that is what this does — five
//     drawText, no MC.text, no strokeText (round joins bevel a pixel face, and a stroke
//     wide enough to read would eat a 3 px stem before the fill lands).
//   · The overlay always draws AFTER the scene, so the F3 block (x 34..~440, y 123..429)
//     sits on top of anything the scene drew there, including a GUI panel — vanilla would
//     put it underneath. The only panel that reaches into it is S5's inventory at
//     (130, 420): its top-left corner meets the last F3 line by ~9 px. If that shows,
//     set MC.f3Reveal = 6 (or MC.f3On = false) while the panel is open.
//   · Nothing load-bearing sits outside the safe box. The chat block stays inside it even
//     at ten lines: backing rects included it runs y 907..1386 and x 100..~812 (the widest
//     line in the film measures 704 px). §5.4 allows the lower chat lines to bleed out;
//     they never have to. Outside the box on purpose (§5.4): hotbar, hearts, hunger, the
//     XP bar and F3 — no fact lives only there.
//   · The chat block and the crosshair share the frame's middle: a full ten-line block
//     reaches y 907, and the crosshair spans y 939..981, so lines 9 and 10 pass behind it
//     (the 'difference' composite turns it light over the CHAT_BG). That is what vanilla
//     does too, and it costs nothing at the line counts the film actually uses — but if a
//     scene wants a clean crosshair with a deep chat, drop a line or set MC.crosshair
//     false for that beat.
//   · A half heart is filled on its LEFT half, a half hunger shank on its RIGHT half.
//     The two bars empty from the centre of the frame outward, so in both cases the
//     filled half is the side the full icons are on and the run of fill stays unbroken.
//     Set MC.hearts = 6.5 / MC.hunger = 4.5 on dev_hud page 2 to see it.
//   · MC.hud never touches FX, never calls ctx.filter, and never allocates a gradient
//     or a pattern.
//
// -----------------------------------------------------------------------------------
// DEVIATIONS FROM §5.2, AND WHY — the numbers below are NOT the ones in the spec
// -----------------------------------------------------------------------------------
//   1 · CROSSHAIR 42 x 6 (§5.2: 18 x 2).
//     §5.2's 2x18 is vanilla's 9x9 crosshair at GUI scale 2. The rest of this HUD is not
//     at scale 2: §5.2's own 92 px hotbar slots, 876 px XP bar and 36/38 px heart row put
//     the film at a GUI scale of ~4.7, where the same 9x9 crosshair is ~42 px across. At
//     18 px it was nearly invisible over the pumpkin field in the gate frame at full
//     resolution and a smudge at 28 %, and the crosshair is the single clearest signal
//     that the viewer is looking through a game's eyes. The bar is 6 px thick rather than
//     the 9 px the gate measurement suggested: all five candidates (18x2, 41x5, 42x6,
//     41x9, 50x6) were rendered over the pumpkin field and compared at 1x and at 28 %,
//     and 9 px reads as a fat plus at full resolution while 6 px stays a crosshair (7:1,
//     against vanilla's 9:1) and still survives the downscale. Checked over the pumpkin
//     field, over sky, and against the light and dark contrast bands on dev_hud page 2.
//     The 'difference' composite of §5.2 is unchanged — the crosshair still inverts
//     against whatever is behind it, which is why it needs no outline.
//   2 · XP BAR 876 x 18 at y 1740, black frame 4 px (§5.2: 876 x 6 at y 1748).
//     Same scale argument: vanilla's 182x5 bar drawn 876 px wide is ~24 px tall, and it is
//     a black-framed trough with the green inside it, not a hairline. At 6 px it read as
//     a progress bar from another film, and at golden hour (gate f0090) the green fill
//     disappeared into the sunlit grass because nothing dark enclosed it. 18 px fills the
//     34 px band between the heart row (icons end y 1730) and the hotbar (y 1764): 10 px
//     of air above, and it stops at y 1758, exactly where the 6 px selection frame starts,
//     so the two never overlap. The colours are unchanged (§5.2 track #1B1B1F, fill
//     #7CFC00); the frame is HUD_C.KANTE.
//   3 · XP LEVEL NUMERAL Press Start 2P 26, baseline y 1736, four-offset outline 4 px
//     (§5.2: '#7CFC00 with a 2 px black outline centred at (540, 1738)').
//     The face is APPENDIX B1. MC.pss(34) = 26 keeps the measured width ("27" = 52 px vs
//     the Silkscreen 34 original's 59.5). The 2 px stroke became a 4 px four-way stamp
//     because that is literally how the game draws this one string, and because a
//     strokeText of any usable width closes up a pixel face at this size.
//   4 · HOTBAR SELECTION FRAME 6 px (was 4 px, unspecified in §5.2).
//     Vanilla's selector is 24x24 around a 20x20 slot: 2 texture px on each side, ~9 px
//     at this scale. 6 px is that, rounded down to exactly the §5.2 slot gap, so the
//     frame fills the gap and never overlaps a neighbouring slot's contents.
   =================================================================================== */

(function () {
  const C = MC.C;
  const R = Math.round;

  /* ---------------------------------------------------------------- 1 · constants */
  const GEO = MC.HUD_GEO = Object.freeze({
    // crosshair: §5.2 says 2 x 18 / 18 x 2. See DEVIATIONS in the API block — the HUD is
    // built at a GUI scale of ~4.7 (92 px hotbar slots), so vanilla's 9x9 crosshair is
    // 42 px across here, not 18.
    crossX: 540, crossY: 960, crossArm: 42, crossThick: 6,
    hotbarX: 102, hotbarY: 1764, hotbarBottom: 1856, hotbarSlot: 92, hotbarGap: 6,
    hotbarPitch: 98, hotbarW: 876, hotbarRight: 978,
    hotbarSelW: 6, countSize: 26,
    // XP bar: §5.2 says 876 x 6 at y 1748. Same scale argument — vanilla's 182x5 bar is
    // ~24 px tall at this width, and the 6 px hairline had no dark frame to hold the green
    // against a sunlit grass field. 18 px is that bar trimmed to end exactly where the
    // hotbar's selection frame begins (y 1758). See DEVIATIONS.
    xpX: 102, xpY: 1740, xpW: 876, xpH: 18, xpFrame: 4,
    xpLevelX: 540, xpLevelY: 1736, xpLevelSize: 26, xpLevelOutline: 4,
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
  /* a half icon: the whole sprite in the empty palette, then the FILLED half painted over
     it. `right` mirrors which half is filled — and it matters. The two bars empty from the
     frame centre outward (hearts from the right, hunger from the left), so the half icon's
     filled side must be the side its full neighbours are on, or the bar shows a gap. */
  function halfCanvas(rows, palFull, palEmpty, cell, split, right) {
    const c = pixCanvas(rows, palEmpty, cell);
    const n = rows[0].length;
    paint(c.getContext('2d'), rows, palFull, cell, right ? split : 0, right ? n : split);
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

  /* the drumstick: meat blob to the upper right, bone pointing down-left. The highlight is
     an arc down the meat's top-left edge, not a stray pixel, and the bone is four px wide
     with its own outline — at 36 px a 2x2 bone stub read as a detached white dot. */
  const HUNGER_ROWS = [
    '...oooo..',
    '..oMMmmo.',
    '.oMMmmmmo',
    '.oMmmmmmo',
    '.ommmmmmo',
    '..ommmmoo',
    '.obbmmoo.',
    'obbbboo..',
    '.oooo....',
  ];
  const HUNGER_PAL = { o: HC.KANTE, m: HC.FLEISCH, M: HC.FLEISCH_LICHT, b: HC.KNOCHEN };
  const HUNGER_LEER_PAL = { o: HC.KANTE, m: HC.HUNGER_LEER, M: HC.HUNGER_LEER, b: HC.HUNGER_LEER };

  const ICON_CELL = GEO.heartSize / 9;   // 4
  const SPR = {
    heart: pixCanvas(HEART_ROWS, HEART_PAL, ICON_CELL),
    heartHalf: halfCanvas(HEART_ROWS, HEART_PAL, HEART_LEER_PAL, ICON_CELL, 5, false),
    heartEmpty: pixCanvas(HEART_ROWS, HEART_LEER_PAL, ICON_CELL),
    hunger: pixCanvas(HUNGER_ROWS, HUNGER_PAL, ICON_CELL),
    hungerHalf: halfCanvas(HUNGER_ROWS, HUNGER_PAL, HUNGER_LEER_PAL, ICON_CELL, 4, true),
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
    ctx.fillRect(x - h, y - a, GEO.crossThick, GEO.crossArm);   // 6 x 42, the whole bar
    ctx.fillRect(x - a, y - h, a - h, GEO.crossThick);          // 18 x 6, left stub
    ctx.fillRect(x + h, y - h, a - h, GEO.crossThick);          // 18 x 6, right stub
    ctx.restore();
  }

  /* ---------------------------------------------------------------- 4 · hotbar */
  function hotbarSlot(ctx, x, y, s, sel) {
    MC.rect(ctx, x, y, s, s, HC.SLOT_BG);
    MC.rect(ctx, x, y, s, 3, HC.SLOT_HELL); MC.rect(ctx, x, y, 3, s, HC.SLOT_HELL);
    MC.rect(ctx, x, y + s - 3, s, 3, HC.SLOT_DUNKEL); MC.rect(ctx, x + s - 3, y, 3, s, HC.SLOT_DUNKEL);
    // the vanilla selector is a frame AROUND the slot, not on it: 6 px of white sitting
    // in the 6 px gap, so the item keeps its full cell (24x24 selector on a 20x20 slot).
    if (sel) {
      const b = GEO.hotbarSelW;
      ctx.strokeStyle = HC.SLOT_WAHL; ctx.lineWidth = b;
      ctx.strokeRect(R(x) - b / 2, R(y) - b / 2, R(s) + b, R(s) + b);
    }
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
        // interface text (APPENDIX B1): Press Start 2P, weight 400, + the §4.1 shadow.
        // PS2P advances 1.0 x size per char, so a 3-digit count is 78 px in a 92 px slot.
        MC.text(ctx, String(it.count), x + s - 8, y + s - 8, MC.ui(GEO.countSize, {
          color: C.WEISS, align: 'right', baseline: 'alphabetic', alpha: it.alpha,
        }));
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
    // vanilla's bar is a black-framed trough with the green inside it, which is the only
    // reason the fill still reads over a sunlit grass field (see f0090). Frame, track, fill.
    const b = GEO.xpFrame, iw = GEO.xpW - 2 * b, ih = GEO.xpH - 2 * b;
    MC.rect(ctx, GEO.xpX, GEO.xpY, GEO.xpW, GEO.xpH, HC.KANTE);
    MC.rect(ctx, GEO.xpX + b, GEO.xpY + b, iw, ih, HC.XP_SPUR);
    if (p > 0) MC.rect(ctx, GEO.xpX + b, GEO.xpY + b, iw * p, ih, HC.XP_FUELLUNG);
    if (xp.level == null) return;
    // The one string in this file drawn WITHOUT the §4.1 drop shadow: vanilla outlines the
    // level numeral instead, by stamping it in black at four cardinal offsets and putting
    // the green on top. Four extra fillText, no stroke — strokeText's round joins would
    // bevel the corners of a pixel face, and at this size a 2 px stroke would eat most of
    // a 3 px stem before the fill lands.
    const s = String(xp.level), d = GEO.xpLevelOutline;
    const o = MC.ui(GEO.xpLevelSize, { align: 'center', baseline: 'alphabetic', color: HC.KANTE });
    drawText(ctx, s, GEO.xpLevelX - d, GEO.xpLevelY, o);
    drawText(ctx, s, GEO.xpLevelX + d, GEO.xpLevelY, o);
    drawText(ctx, s, GEO.xpLevelX, GEO.xpLevelY - d, o);
    drawText(ctx, s, GEO.xpLevelX, GEO.xpLevelY + d, o);
    drawText(ctx, s, GEO.xpLevelX, GEO.xpLevelY, MC.ui(GEO.xpLevelSize, {
      align: 'center', baseline: 'alphabetic', color: HC.XP_FUELLUNG,
    }));
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
    const fam = o.family || MC.F.txt, weight = o.weight || MC.F.w;   // VT323 400 (B1: running text)
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
    const lineOpt = MC.tx(size, { family: fam, weight: weight, align: 'left', baseline: 'alphabetic' });
    for (let i = 0; i < n; i++) {
      const row = vis[vis.length - 1 - i];          // i = 0 -> newest, at yBase
      const y = yBase - i * pitch;
      const L = row.L;
      ctx.save();
      ctx.globalAlpha *= base * row.a;
      if (L.bg !== false || L.box) {
        const w = measureText(ctx, L.text, lineOpt);
        // 0.75: the ink band of a VT323 line (cap top -0.57 em, descender + the 4 px
        // shadow +0.20 em) sits centred in the 48 px cell, and consecutive cells tile
        // edge to edge, which is how vanilla's chat backing reads as one column.
        const bx = R(x - pad), by = R(y - size * 0.75), bw = R(w + pad * 2), bh = R(pitch);
        if (L.bg !== false) MC.rect(ctx, bx, by, bw, bh, C.CHAT_BG);
        if (L.box) { ctx.strokeStyle = L.box; ctx.lineWidth = 2; ctx.strokeRect(bx + 1, by + 1, bw - 2, bh - 2); }
      }
      MC.text(ctx, L.text, x, y, Object.assign({}, lineOpt, { color: L.color || C.WEISS }));
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
    const opt = MC.tx(size, { align: 'left', baseline: 'alphabetic' });   // VT323 400 (B1)
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
      MC.text(ctx, L.text, x, y, Object.assign({}, opt, { color: L.color || C.WEISS }));
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
    // APPENDIX B5's flag lives in mc_world.js but it is the same KIND of thing as
    // MC.hudMode — a per-frame scene flag — and TL.overlay runs MC.hud() after every
    // single frame, so this is the one place in the film that is guaranteed to run. A
    // scene that sets MC.armHidden = true and forgets to clear it would otherwise lose
    // the first-person arm for the remaining 800 frames, silently. Cleared here it
    // behaves exactly like MC.hudMode: set it EVERY frame you want it, and set it before
    // the MC.arm call (the arm is drawn inside the scene, not by the overlay).
    if (typeof MC.armHidden !== 'undefined') MC.armHidden = false;
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
