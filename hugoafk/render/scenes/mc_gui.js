/* ===================================================================================
   DIE SCHICHT — shared kit, part 3 of 4: VANILLA GUI CHROME.
   Loaded after mc_kit.js. Everything here hangs off the single global `MC`.
   Owns the grey interface that carries ~50 % of the film (DIRECTION.md §3.3, §4.1,
   §4.2, §4.4, §5.3, §8). Nothing here touches the world, the HUD or FX.

// API:
//   Conventions used by every symbol below
//     · ctx            the scene canvas 2D context
//     · x, y           TOP-LEFT of the object, in canvas px, integer-snapped internally
//     · every text y   is the glyph VERTICAL CENTRE (drawText baseline 'middle'), not a
//                      typographic baseline
//     · every label    goes through MC.text (mandatory 4/6/8 px flat drop shadow) EXCEPT
//                      panel titles, the inventory status word, book ink and sign text,
//                      which vanilla draws flat
//     · o              an options object; every key listed with {type, default}
//     · all colours default to MC.C tokens; pass a hex to override
//     · every function is a pure function of its arguments. No state survives a frame.
//
//   THE FACE — read this before you pass a `size` anywhere (APPENDIX B1)
//     The interface face is PRESS START 2P (MC.F.ui, weight 400) via the helper
//     MC.ui(size, o); the running-text face is VT323 (MC.F.txt, weight 400) via
//     MC.tx(size, o). Silkscreen is out of the film and FONTS.silk appears nowhere in
//     this file. Every default size below is already the converted one.
//
//     Press Start 2P is MONOSPACE at exactly 1.0 em per character — measured, not
//     assumed — so you never have to guess:
//                       width in px  =  size  x  number of characters
//     §4.4's table is in SILKSCREEN sizes and Press Start 2P is 1.31x wider per
//     character, so ANY size taken from §4.4 must go through MC.pss() before it is
//     passed to a function here. MC.pss(44) = 34, MC.pss(36) = 27, MC.pss(34) = 26.
//     Passing a raw §4.4 number produces type ~31 % too big; MC.fit will stop it
//     overflowing its box but the layout will not be the one the direction drew.
//     §4.4's 34 px floor for load-bearing type converts to 26 px, which is MC.fit's
//     default floor. Copy is written in normal German sentence case and rendered as
//     written — nothing here upper-cases anything, and no call passes `upper`.
//
//     Characters that fit, at the defaults, with the drop shadow inside the box:
//       620x84 button (pause menu, join)          21   at size 27
//       700x84 button (disconnect)                24   at size 27
//       700x88 Fertig                             24   at size 27
//       380x110 thumb button (S7)                 13   at size 26
//       centred screen title, 790 px safe measure 23   at size 34
//       toast name (600 px measure)               22   at size 27
//       book ink (615 px measure)                 19   at size 31
//       oak sign (500 px measure)                 14   at size 35
//
//   MC.dirtBg(ctx, t, o)
//     Fills the whole 1080x1920 frame with the vanilla menu background: the `dirt`
//     atlas tile at 4x (64 px tiles) with a baked rgba(0,0,0,0.55) wash (resolves to
//     ~#3A2A18). Pattern + washed tile are built once and cached. `t` is accepted and
//     ignored (vanilla's menu background does not move). o: {alpha: number = 1}.
//     Falls back to a flat #3A2A18 fill if the atlas is not ready.
//
//   MC.panel(ctx, x, y, w, h, o) -> {x, y, w, h}
//     The raised grey GUI panel. 1 px MC.C.RAHMEN outer frame, MC.C.PANEL body, 4 px
//     MC.C.BEVEL_HELL top/left + MC.C.BEVEL_DUNKEL bottom/right bevel (MC.bevel).
//     o: {fill: hex = C.PANEL, light: hex = C.BEVEL_HELL, dark: hex = C.BEVEL_DUNKEL,
//         frameColor: hex = C.RAHMEN   (pass C.ROT for S5's 3-frame full panel flash),
//         bevel: number = 4, alpha: number = 1,
//         scale: number = 1            (about the panel centre; transition device B/C),
//         title: string|null = null    (GUI panel title — SHADOWLESS, C.GUI_TITEL,
//                                       left-aligned, Press Start 2P),
//         titleX: number = 35, titleY: number = 42   (offsets from x, y),
//         titleSize: number = 26  (= MC.pss(34)), titleColor: hex = C.GUI_TITEL}
//
//   MC.button(ctx, x, y, w, h, label, o) -> {x, y, w, h, cx, cy}
//     The vanilla button: 1 px C.RAHMEN frame, body, 2 px C.BUTTON_KANTE_H top/left +
//     C.BUTTON_KANTE_D bottom/right bevel, centred Press Start 2P label + drop shadow,
//     auto-fitted with MC.fit.
//     o: {state: 'normal'|'hover'|'ghost'|'pressed'|'disabled' = 'normal',
//         outline: bool = false     persistent 1 px C.GEIST_KANTE INSET outline; the film
//                                   carries it on every button the bot operates. 'ghost'
//                                   forces it on,
//         outlineColor: hex = C.GEIST_KANTE, outlineWidth: number = 1,
//         fill: hex = null          body override (C.HUGO_ROT for `Bot stoppen` only),
//         labelColor: hex = C.WEISS ('#A0A0A0' when disabled),
//         size: number = 27 (= MC.pss(36)), family: string = MC.F.ui, weight: 400,
//         maxW: number = w - 28, floor: number = 26   (MC.fit measure pass),
//         alpha: number = 1, dy: number = null        (label offset; 2 when pressed/ghost)}
//     States: normal = C.BUTTON body · hover (CURSOR ONLY, 0-2 s and 26-28 s) =
//     C.BUTTON_HELL body + 2 px white outline · ghost (THE FILM'S MOTION SIGNATURE, §6.3)
//     = C.GEIST fill over the body + 1 px violet inset outline + label 2 px down ·
//     pressed = bevels swapped + label 2 px down · disabled = #4E4E4E body, grey label.
//
//   MC.pressed(t, at, frames) -> bool
//     True while t is inside [at, at + frames/30). frames default 3. Convenience for the
//     3-frame ghost press so all ten scenes press for exactly the same duration.
//
//   MC.slot(ctx, x, y, s, o) -> void
//     ONE INSET vanilla slot on grey: C.SLOT #8B8B8B fill, 2 px C.SLOT_OBEN #373737
//     top/left, 2 px C.SLOT_UNTEN #FFFFFF bottom/right (MC.inset). This REPLACES the
//     engine's mcSlot(), whose bevels are inverted and whose fill is a dark HUD slab.
//     o: {fill: hex = C.SLOT, dark: hex = C.SLOT_OBEN, light: hex = C.SLOT_UNTEN,
//         bevel: number = 2,
//         item: string|null = null   a SPRITES key or 'pumpkin'|'chest'|'spawner'
//                                    (those three route through blockIcon, isometric);
//                                    flat sprites are pre-rendered once per (name, cell),
//         itemBox: number = s * 0.78, count: number|string|null = null,
//         countSize: number = 26     (Press Start 2P weight 400, white + the mandatory 4 px
//                                    shadow, bottom-right — the SAME face and size mc_hud
//                                    draws the hotbar's counts in, MC.HUD_GEO.countSize),
//         flash: number = 0          0..1 white overlay (the 2-frame landing flash),
//         flashColor: hex = '#FFFFFF',
//         selected: bool = false     4 px white outline outside the slot,
//         selColor: hex = '#FFFFFF', alpha: number = 1,
//         skip: bool = false         MC.inventory only: leave this cell undrawn}
//
//   MC.invGeom(x, y, o) -> geometry table          (pure data, draws nothing)
//     Every coordinate of the S5 inventory screen, derived from the panel's top-left so a
//     scene can flash a slot, land a particle or anchor a toast on it without re-deriving
//     §5.3. Defaults reproduce §S5 exactly for x = 130, y = 420, w = 770, h = 880.
//     o: {w: 770, h: 880}
//     -> { x, y, w, h,
//          title  : {x, y}                 x+35,  y+42   (165,  462)
//          status : {x, y}                 x+w-35,y+42   (865,  462)   right-aligned
//          preview: {x, y, w, h}           x+35,  y+70,  260x340  (165, 490)
//          armour : [{x, y, s} x4]         x+35,  y+100 +i*78, s 72   (165, 520..754)
//          off    : {x, y, s}              x+307, y+334, s 72        (437, 754)
//          craft  : [{x, y, s} x4]         x+470 +(i%2)*80, y+100 +row*80, s 70 (600/680,
//                                                                              520/600)
//          arrow  : {x, y, w}              x+640, y+150, w 30        (770, 570)
//          result : {x, y, s}              x+685, y+135, s 70        (815, 555)
//          main   : [{x, y, s, col, row} x27]  x+35 +col*78, y+500 +row*78, s 72
//                                                          (165..861, 920/998/1076)
//          hotbar : [{x, y, s, col} x9]    x+35 +col*78, y+740, s 72  (165..861, 1160) }
//     The offhand slot is not in §S5's table; vanilla has one and it sits to the RIGHT of
//     the preview box, bottom-aligned with the boots slot, which is where it is put here.
//
//   MC.inventory(ctx, x, y, o) -> the same geometry table
//     THE WHOLE S5 SCREEN, furnished: panel + title + status word + player preview box
//     with the portrait in it + armour column + offhand + crafting 2x2 + arrow + result
//     slot + the 9x3 main grid + the hotbar row. Draw it INSTEAD of hand-assembling a
//     panel, or the top half of the panel is an empty grey void.
//     o: {w: 770, h: 880, alpha: number = 1,
//         scale: number = 1        about the panel centre — applies to ALL the furniture,
//                                  so pass MC.guiOpen/guiClose's `scale` here, not to
//                                  MC.panel,
//         title: string = 'Inventar'   (null removes it), titleSize: 26, titleColor,
//         status: string|{s, color, size}|null = null    the top-right word, SHADOWLESS,
//                                  default colour C.ROT — S5's `Voll` at 12.00,
//         fill/light/dark/frameColor/bevel                forwarded to MC.panel
//                                  (frameColor: C.ROT is S5's 3-frame panel flash),
//         t: number = 0            film time — drives the portrait's idle bob,
//         portrait: bool|object = true    false removes the figure and leaves the recessed
//                                  box; an object is passed on to MC.portrait,
//         armour / craft / main / hotbar : array of MC.slot options | fn(i) -> options
//                                  | null. Index order: armour top-to-bottom; craft
//                                  left-to-right then top-to-bottom; main and hotbar
//                                  left-to-right, top-to-bottom (main index = row*9+col).
//                                  A missing or null entry still draws the EMPTY slot —
//                                  pass {skip: true} to leave the cell out entirely,
//         off / result : MC.slot options | null           the two single slots,
//         offhand: bool = true, arrow: bool = true}
//
//   MC.portrait(ctx, x, y, w, h, o) -> {x, y, w, h}
//     The inventory's player preview: a recessed C.SLOT box with a FRONT-FACING player
//     elevation standing in it — head from the `player_face` atlas tile at 1:1, sleeves
//     and torso from `player_shirt` (the brand violet, straight out of the atlas), hands
//     `player_skin`, legs `player_pants`, boots `player_shoe`. The figure is built once
//     into a 32x64 offscreen canvas at module level (2 canvas px per skin pixel, so the
//     16x16 face lands unscaled) and blitted at an INTEGER scale, so it is one drawImage
//     per frame and stays on the pixel grid. Vanilla's portrait faces the player, and the
//     face tile is drawn to be seen head-on.
//     THIS IS NOT A SECOND MC.player. MC.player (mc_world.js) is the world-space F5 entity
//     planted on the ground plane, with a blob shadow, a nametag and fog; MC.portrait is
//     flat screen-space GUI furniture and never appears in the world.
//     o: {t: number = 0        drives the idle bob, +/-3 px at 0.55 Hz,
//         bob: number = 1      0 freezes it,
//         area: [x0, w] = [x, w]   the horizontal band the figure is centred in; the
//                              inventory passes the part of the box right of the armour
//                              column,
//         box: bool = true     draw the recessed box,
//         fill: hex = C.SLOT, light: hex = C.SLOT_UNTEN, dark: hex = C.SLOT_OBEN,
//         bevel: number = 2, alpha: number = 1}
//     Draws the box and nothing else if the atlas is not decoded yet.
//
//   MC.toast(ctx, t, o) -> {x, y, w, h, p} | null   (null when off screen)
//     The advancement toast. Box 760x150; slides in from x 1080 and rests with its right
//     edge at x 900 (box x 140..900); stacks at y 320 / 480 / 640. Body C.TOAST_KORPUS,
//     4 px C.TOAST_RAHMEN border, 3 px C.TOAST_LICHT highlight inset 4 px, 12x12
//     double-bevel corner squares (the vanilla 9-slice tell). 88 px icon cell at box+24.
//     o: {t0: number REQUIRED       when the slide-in starts,
//         name: string = ''         Press Start 2P 27 white + shadow, left at box+136,
//         kicker: string = 'Fortschritt erzielt!'   Press Start 2P 21 C.GELB,
//         icon: string|null = null  item/block name, drawn in the 88 px cell,
//         iconDraw: fn(ctx, cx, cy, box)|null = null   custom icon instead,
//         slot: 0|1|2 = 0           y 320 / 480 / 640,
//         y: number = null          explicit top edge, overrides slot,
//         x0: number = 140, w: number = 760, h: number = 150,
//         in: number = 0.25 (E.outCubic), hold: number = 1.4, out: number = 0.20,
//         alpha: number = 1, kickerSize: 21, nameSize: 27}
//
//   MC.field(ctx, x, y, w, h, o) -> {x, y, w, h, textX, caretX}
//     Vanilla text field: C.FELD_BG fill, 2 px C.FELD_KANTE border, optional label 30 px
//     above the box (VT323 34 C.GRAU), value inside at x+20.
//     o: {label: string|null = null, labelSize: 34, labelColor: hex = C.GRAU,
//         value: string = '', size: number = 46, family: string = MC.F.txt,
//         weight: number = 400      both faces ship 400 ONLY — never pass 700,
//                                   S10's `HugoAFK.com` value is the one INTERFACE value
//                                   in the film: pass {family: MC.F.ui, size: MC.pss(52)}
//                                   = size 40, 440 px wide inside the 660 px measure,
//         color: hex = C.WEISS, pad: number = 20,
//         p: number = 1             0..1 typing progress; floor(p * len) chars are shown,
//         caret: bool = false       vanilla blinking block caret after the last character,
//         t: number = 0             film time, drives the 0.5 s caret blink,
//         focused: bool = false     border turns #FFFFFF (the cursor is on it),
//         borderColor: hex = null   overrides both (C.GELB for the one-shot highlight),
//         border: number = 2, fill: hex = C.FELD_BG, alpha: number = 1}
//
//   MC.loadingBar(ctx, x, y, w, h, p, o) -> void
//     The vanilla world-loading bar. 3 px #000000 border, C.LADEBALKEN_SPUR track,
//     C.LADEBALKEN_FUELLUNG fill. p is 0..1 and is QUANTISED to o.notches steps by
//     default — the notch is the beat (§S3), never a slide.
//     o: {notches: number = 8   (0 = smooth), border: number = 3,
//         track: hex = C.LADEBALKEN_SPUR, fill: hex = C.LADEBALKEN_FUELLUNG,
//         frame: hex = '#000000', ticks: bool = false   (2 px notch separators),
//         alpha: number = 1}
//
//   MC.serverRow(ctx, x, y, w, h, o) -> {x, y, w, h}
//     One multiplayer server-list row (default 700x150). 128 px icon box at (x+15, y+11)
//     with the logo letterboxed inside it, name Press Start 2P 34 at (x+170, y+45), MOTD
//     VT323 38 weight 400 at (x+170, y+100), five ascending ping bars (8/14/20/26/32 px,
//     8 px wide, 5 px gaps = 60 px) at x+640 with their bottom edge at y+56.
//     o: {name: string = '', motd: string = '', motd2: string|null = null,
//         img: Image|null = null    e.g. IMG.logo — letterboxed, smoothing left ON,
//         iconFill: hex = '#2A2A2E', fill: hex = 'rgba(0,0,0,0.30)',
//         selected: bool = false    #4A4A52 fill + 2 px #FFFFFF border,
//         dim: bool = false         placeholder row: everything in C.GRAU / #555555,
//         ping: number = 5          0..5 lit bars, pingColor: hex = C.GRUEN,
//         nameSize: 34, motdSize: 38, alpha: number = 1}
//
//   MC.book(ctx, o) -> {x, y, w, h, inkX, measure}
//     The written book on parchment. C.PERGAMENT page, 3 px C.PERGAMENT_KANTE border,
//     6 px C.PERGAMENT_FALZ spine line inset 40 px from the left plus a faint
//     rgba(0,0,0,0.06) fold gradient. Ink is Press Start 2P 31 (= MC.pss(40)) in C.TINTE,
//     LEFT-ALIGNED and SHADOWLESS, first line at y+100, line height 72, measure 615 px
//     — 19 characters per line.
//     o: {x: 190, y: 400, w: 700, h: 840,
//         lines: array = []         each entry is one of
//                                     'plain text'
//                                     {s, color = C.TINTE, size = 31, p = 1}
//                                     {parts: [{s, color}, ...], size = 31, p = 1}
//                                   p is 0..1 type-on progress over that line's characters
//                                   (blank entries and '' are legal spacer lines),
//         size: number = 31, lineHeight: number = 72,
//         inkX: number = 85         ink left inset from x, y0: number = 100,
//         color: hex = C.TINTE, spine: number = 40, alpha: 1, scale: 1}
//
//   MC.pageSwap(ctx, t, at, o) -> {page: 0|1, dx: number}
//     Vanilla swaps a book page INSTANTLY (§2: no hand-rolled page flip). Returns which
//     page to draw and an x offset. t < at + 2/30 -> {page: 0, dx: 0} (the 2-frame hold);
//     the next single frame -> {page: 1, dx: 6} and a 6 px C.PERGAMENT_KANTE sliver is
//     drawn at the page's left edge; after that -> {page: 1, dx: 0}.
//     o: {x: 190, y: 400, w: 700, h: 840, shift: number = 6}
//
//   MC.console(ctx, x, y, w, h, lines, t) -> number   (count of visible entries)
//     The live-console box (S7). C.KONSOLE rgba(0,0,0,0.62) fill, VT323 40 WEIGHT 400,
//     lines fill from the top and scroll up once the box is full; the line about to be
//     pushed out fades over the last 0.2 s before the next arrival.
//     `lines` entries: 'text'  or  {s, at, color}  — in ASCENDING `at` order
//        at    number|undefined   the time the line arrives; entries without `at` are
//                                 always visible (scanning stops at the first future entry)
//        color hex|undefined      overrides the automatic colouring, which is:
//                                 a leading [System] / [Chat] prefix -> C.GRAU, the rest
//                                 C.WEISS · a line starting with '/' -> all C.GELB
//     Geometry: 20 px padding, 60 px line pitch -> 9 lines in the film's 790x600 box.
//
//   MC.statRow(ctx, x, y, w, o) -> void
//     One statistics row: label (left), a leader of 4 px #555555 squares every 14 px, and
//     the value right-aligned at x+w. VT323 40 weight 400, both parts shadowed.
//     o: {label: string = '', value: string = '', size: number = 40,
//         labelColor: hex = C.GRAU, valueColor: hex = C.WEISS,
//         leaderColor: hex = '#555555', leaderStep: 14, leaderSize: 4, alpha: 1}
//
//   MC.sign(ctx, x, y, o) -> {x, y, w, h}
//     The standing oak sign. Board of tiled `oak_planks` (8x = 128 px tiles) with a 3 px
//     C.SCHILD_KANTE border and two 40x160 `oak_log_side` posts below it. Up to four
//     CENTRED, SHADOWLESS Press Start 2P 35 (= MC.pss(46)) lines in C.SCHILD_TINTE at
//     y+40/+102/+164/+226 — 14 characters per line in the 500 px measure.
//     o: {w: 560, h: 300, lines: array of string = [],
//         size: number = 35, y0: number = 40, pitch: number = 62,
//         color: hex = C.SCHILD_TINTE, post: bool = true, postW: 40, postH: 160,
//         postGap: 200        (distance between the two post centres),
//         tileScale: number = 8   (board plank tile = 16 px * tileScale),
//         postTileScale: number = tileScale,
//         tint: css|null = null   flat colour laid over board + posts (golden hour),
//         alpha: number = 1}
//
//   MC.chatInput(ctx, o) -> {y, h, textX, caretX}
//     The vanilla chat input strip: full-width rgba(0,0,0,0.50), 66 px tall, top edge at
//     y 1340, text VT323 46 white weight 400 at x 110 with a blinking block caret. Draws
//     the command-suggestion box too when o.suggest is a non-empty array.
//     o: {y: 1340, h: 66, x: 110, text: '', size: 46, color: C.WEISS,
//         bg: 'rgba(0,0,0,0.50)', p: 1 (type progress), caret: bool = true,
//         t: number = 0 (0.5 s blink), alpha: 1,
//         suggest: array of string = [], suggestIndex: number = 0, suggestY: 1270}
//
//   MC.suggest(ctx, x, y, items, o) -> {x, y, w, h}
//     The command-suggestion box vanilla shows the moment a '/' is typed. rgba(0,0,0,0.75)
//     box, VT323 34 weight 400, the selected entry in C.GELB and the rest in C.GRAU.
//     o: {index: number = 0, size: 34, lineH: 35, pad: 10, w: number|null = auto,
//         bg: 'rgba(0,0,0,0.75)', color: C.GRAU, selColor: C.GELB, alpha: 1}
//
//   MC.screenTitle(ctx, str, y, o) -> number   (the fitted size actually used)
//     A centred vanilla screen title at x 540: Press Start 2P, white + drop shadow, run
//     through MC.fit against the 790 px safe measure.
//     o: {size: 34 (= MC.pss(44)), color: C.WEISS, family: MC.F.ui, weight: 400,
//         maxW: 790, floor: 26, align: 'center', x: 540, alpha: 1, shadow: bool = true}
//     The pause menu's `Spiel pausiert` is §4.4's one bigger title: pass size MC.pss(48)
//     = 37 (518 px wide).
//
//   MC.craftArrow(ctx, x, y, w, o) -> void
//     The vanilla crafting arrow (shaft + stepped head), left-anchored at (x, y) where y
//     is its vertical centre. Shaft thickness is w * 0.2, head length w * 0.45.
//     o: {color: hex = '#8B8B8B', shadow: hex = '#555555', alpha: number = 1}.
//     The film uses w = 30 at x 770, y 570 (inventory, S5) — MC.inventory draws it.
//
//   MC.guiOpen(t, at, o) -> {scale, dim, p, open}
//     Transition device B (§7): world dim 0 -> o.dim over 4 frames from `at`; panel scale
//     0.94 -> 1.00 over the first 3 frames on E.outExpo. o: {dim: number = 0.55,
//     frames: 4, scaleFrames: 3, from: 0.94}. Before `at` it returns the closed state.
//
//   MC.guiClose(t, at, o) -> {scale, dim, p, open}
//     Transition device C (§7): panel 1.00 -> 0.96 and dim o.dim -> 0 over the 3 frames
//     ENDING ON `at`. o: {dim: number = 0.55, frames: 3, to: 0.96}. `open` is false from
//     `at` onward.
//
//   Not defined here (owned elsewhere): MC.cursor, MC.ripple, MC.chat, MC.f3, MC.hud,
//   MC.world, MC.blocks, MC.arm, MC.player, MC.break, MC.particles.
   =================================================================================== */

(function () {
  const C = MC.C;
  const R = MC.rect;

  /* §4.4's sizes are SILKSCREEN sizes and the interface face is now Press Start 2P
     (APPENDIX B1), which is 1.31x wider per character — so every default below is the
     §4.4 number put through MC.pss(). Written out once, here, so that the ten scene files
     and this module cannot drift apart. */
  const SZ = {
    screen: MC.pss(44),      // 34 · centred screen titles (Server auswählen, Vormerken, …)
    button: MC.pss(36),      // 27 · every button label
    panelTitle: MC.pss(34),  // 26 · GUI panel titles (Inventar) — shadowless
    status: MC.pss(30),      // 23 · the inventory status word (Voll)
    kicker: MC.pss(28),      // 21 · toast kicker (Fortschritt erzielt!)
    toastName: MC.pss(36),   // 27 · toast name
    serverName: MC.pss(44),  // 34 · server-list row name
    ink: MC.pss(40),         // 31 · book ink
    sign: MC.pss(46),        // 35 · oak sign lines
  };

  /* ---------------------------------------------------------------- 1 · caches
     §10.4: pre-render every repeated pixel sprite and build every pattern ONCE.
     The atlas is decoded before the first frame is rendered, so these fill on the
     first draw call and never allocate again. */

  const _tiles = new Map();                       // name -> raw 16x16 atlas slice
  function atlasTile(name) {
    if (_tiles.has(name)) return _tiles.get(name);
    if (!(typeof IMG !== 'undefined' && IMG.tex && IMG.texMeta)) return null;
    const M = IMG.texMeta, i = M.index[name];
    if (i == null) return null;
    const T = M.tile, sx = (i % M.cols) * T, sy = Math.floor(i / M.cols) * T;
    const c = makeCanvas(T, T), x = c.getContext('2d');
    x.imageSmoothingEnabled = false;
    x.drawImage(IMG.tex, sx, sy, T, T, 0, 0, T, T);
    _tiles.set(name, c); return c;
  }

  const _pats = new Map();                        // name:scale:wash -> CanvasPattern
  function tilePattern(ctx, name, scale, wash) {
    const key = name + ':' + scale + ':' + (wash || '');
    if (_pats.has(key)) return _pats.get(key);
    const src = atlasTile(name); if (!src) return null;
    const s = src.width * scale, c = makeCanvas(s, s), x = c.getContext('2d');
    x.imageSmoothingEnabled = false;
    x.drawImage(src, 0, 0, s, s);
    if (wash) { x.fillStyle = wash; x.fillRect(0, 0, s, s); }
    const p = ctx.createPattern(c, 'repeat');
    _pats.set(key, p); return p;
  }

  // one tiled fill, phase-aligned to (x, y) so a board's planks start at its corner
  function tileFill(ctx, name, scale, x, y, w, h, wash) {
    const p = tilePattern(ctx, name, scale, wash);
    MC.pixel(ctx, c => {
      if (p) { c.translate(Math.round(x), Math.round(y)); c.fillStyle = p; c.fillRect(0, 0, Math.round(w), Math.round(h)); }
      else { c.fillStyle = '#6B4A2C'; c.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h)); }
    });
  }

  const _spr = new Map();                         // name:cell -> offscreen canvas
  function spriteCanvas(name, cell) {
    const key = name + ':' + cell;
    if (_spr.has(key)) return _spr.get(key);
    const s = (typeof SPRITES !== 'undefined') ? SPRITES[name] : null;
    if (!s) { _spr.set(key, null); return null; }
    const c = makeCanvas(s.rows[0].length * cell, s.rows.length * cell);
    pixelSprite(c.getContext('2d'), 0, 0, cell, s.rows, s.pal, { align: 'left', baseline: 'top' });
    _spr.set(key, c); return c;
  }

  /* One inventory item, drawn the way the game draws one: full blocks isometric, every
     other item as its flat sprite — from a pre-rendered canvas, never per-pixel. */
  function drawItem(ctx, name, cx, cy, box, alpha) {
    if (!name) return;
    const B = (typeof MC_BLOCK_ICONS !== 'undefined') ? MC_BLOCK_ICONS[name] : null;
    if (B && typeof IMG !== 'undefined' && IMG.tex && IMG.texMeta) {
      const s = Math.round(box * 0.5);
      blockIcon(ctx, B, Math.round(cx), Math.round(cy - s * 0.5), s, { flat: true, alpha: alpha });
      return;
    }
    const cell = Math.max(1, Math.floor(box / 16));
    const cv = spriteCanvas(name, cell); if (!cv) return;
    MC.pixel(ctx, c => {
      if (alpha != null) c.globalAlpha *= alpha;
      c.drawImage(cv, Math.round(cx - cv.width / 2), Math.round(cy - cv.height / 2));
    });
  }

  /* The inventory portrait's figure, built ONCE into a 32x64 canvas: 16 skin units wide,
     32 tall (head 8, torso 12, legs 12 — the real model's proportions), at 2 canvas px per
     skin unit so the 16x16 `player_face` tile lands unscaled and the eyes survive. Every
     part is filled with its atlas tile at 1:1 texels, never stretched. Blitted at an
     INTEGER scale, so the whole portrait costs one drawImage per frame. */
  let _fig = null;
  function figureCanvas() {
    if (_fig) return _fig;
    const T = {};
    for (const n of ['player_face', 'player_skin', 'player_shirt', 'player_pants', 'player_shoe']) {
      T[n] = atlasTile(n); if (!T[n]) return null;              // atlas not decoded yet
    }
    const c = makeCanvas(32, 64), x = c.getContext('2d');
    x.imageSmoothingEnabled = false;
    const P = (tile, dx, dy, dw, dh) => {                       // tile the 16x16 at 1:1
      for (let oy = 0; oy < dh; oy += 16) for (let ox = 0; ox < dw; ox += 16) {
        const w = Math.min(16, dw - ox), h = Math.min(16, dh - oy);
        x.drawImage(tile, 0, 0, w, h, dx + ox, dy + oy, w, h);
      }
    };
    P(T.player_shirt, 8, 16, 16, 24);                           // torso
    P(T.player_shirt, 0, 16, 8, 18); P(T.player_skin, 0, 34, 8, 6);    // arm + hand
    P(T.player_shirt, 24, 16, 8, 18); P(T.player_skin, 24, 34, 8, 6);
    P(T.player_pants, 8, 40, 8, 18); P(T.player_shoe, 8, 58, 8, 6);    // leg + boot
    P(T.player_pants, 16, 40, 8, 18); P(T.player_shoe, 16, 58, 8, 6);
    x.drawImage(T.player_face, 8, 0);                           // the head, 1:1
    // In the game the limbs are separate boxes and their side faces do the separating; on
    // a flat elevation that job falls to a flat shade plus a one-SKIN-PIXEL seam (2 canvas
    // px, so it stays on the skin grid) down each limb join. Without them the arms and the
    // torso merge into one violet slab and the legs into one blue one.
    x.fillStyle = 'rgba(0,0,0,0.14)'; x.fillRect(0, 16, 8, 24); x.fillRect(24, 16, 8, 24);
    x.fillStyle = 'rgba(0,0,0,0.10)'; x.fillRect(16, 40, 8, 24);
    x.fillStyle = 'rgba(0,0,0,0.30)';
    x.fillRect(6, 16, 2, 24); x.fillRect(24, 16, 2, 24);        // arm / torso joins
    x.fillRect(14, 40, 2, 24);                                  // between the legs
    _fig = c; return c;
  }

  const A = (ctx, a) => { if (a != null) ctx.globalAlpha *= a; };

  /* ---------------------------------------------------------------- 2 · surfaces */

  MC.dirtBg = function (ctx, t, o) {
    o = o || {};
    const p = tilePattern(ctx, 'dirt', 4, 'rgba(0,0,0,0.55)');
    ctx.save(); A(ctx, o.alpha); ctx.imageSmoothingEnabled = false;
    ctx.fillStyle = p || '#3A2A18';
    ctx.fillRect(0, 0, W, H);
    ctx.restore();
  };

  MC.panel = function (ctx, x, y, w, h, o) {
    o = o || {};
    x = Math.round(x); y = Math.round(y); w = Math.round(w); h = Math.round(h);
    ctx.save(); A(ctx, o.alpha);
    const sc = o.scale != null ? o.scale : 1;
    if (sc !== 1) { const cx = x + w / 2, cy = y + h / 2; ctx.translate(cx, cy); ctx.scale(sc, sc); ctx.translate(-cx, -cy); }
    R(ctx, x, y, w, h, o.frameColor || C.RAHMEN);
    R(ctx, x + 1, y + 1, w - 2, h - 2, o.fill || C.PANEL);
    MC.bevel(ctx, x + 1, y + 1, w - 2, h - 2, {
      width: o.bevel != null ? o.bevel : 4,
      light: o.light || C.BEVEL_HELL, dark: o.dark || C.BEVEL_DUNKEL, frame: false,
    });
    if (o.title) {
      MC.text(ctx, o.title, x + (o.titleX != null ? o.titleX : 35), y + (o.titleY != null ? o.titleY : 42),
        MC.ui(o.titleSize || SZ.panelTitle, { color: o.titleColor || C.GUI_TITEL, align: 'left', shadow: false }));
    }
    ctx.restore();
    return { x: x, y: y, w: w, h: h };
  };

  /* The button. Its five states carry the whole "hands leave / hands come back" argument,
     so they are one function and one function only. */
  MC.button = function (ctx, x, y, w, h, label, o) {
    o = o || {};
    x = Math.round(x); y = Math.round(y); w = Math.round(w); h = Math.round(h);
    const st = o.state || 'normal';
    const isPress = st === 'pressed', isGhost = st === 'ghost', isHover = st === 'hover', isOff = st === 'disabled';
    const body = o.fill || (isOff ? '#4E4E4E' : isHover ? C.BUTTON_HELL : C.BUTTON);
    let hi = isOff ? '#8A8A8A' : C.BUTTON_KANTE_H, lo = isOff ? '#2A2A2A' : C.BUTTON_KANTE_D;
    if (isPress) { const s = hi; hi = lo; lo = s; }
    ctx.save(); A(ctx, o.alpha);
    R(ctx, x, y, w, h, C.RAHMEN);
    R(ctx, x + 1, y + 1, w - 2, h - 2, body);
    MC.bevel(ctx, x + 1, y + 1, w - 2, h - 2, { width: 2, light: hi, dark: lo, frame: false });
    if (isGhost) R(ctx, x + 3, y + 3, w - 6, h - 6, C.GEIST);
    if (isHover) {                                   // vanilla cursor hover: 2 px white ring
      R(ctx, x + 1, y + 1, w - 2, 2, C.BEVEL_HELL); R(ctx, x + 1, y + 1, 2, h - 2, C.BEVEL_HELL);
      R(ctx, x + 1, y + h - 3, w - 2, 2, C.BEVEL_HELL); R(ctx, x + w - 3, y + 1, 2, h - 2, C.BEVEL_HELL);
    }
    if (isGhost || o.outline) {                      // the unattended-button tell (§6.3)
      const lw = o.outlineWidth || 1;
      ctx.strokeStyle = o.outlineColor || C.GEIST_KANTE; ctx.lineWidth = lw;
      ctx.strokeRect(x + 3 + lw / 2, y + 3 + lw / 2, w - 6 - lw, h - 6 - lw);
    }
    if (label) {
      const opt = MC.ui(o.size || SZ.button, {
        color: o.labelColor || (isOff ? '#A0A0A0' : C.WEISS), align: 'center',
      });
      if (o.family) opt.family = o.family;
      if (o.weight) opt.weight = o.weight;
      opt.size = MC.fit(ctx, label, opt, o.maxW != null ? o.maxW : w - 28, o.floor);
      const dy = o.dy != null ? o.dy : ((isPress || isGhost) ? 2 : 0);
      MC.text(ctx, label, x + Math.round(w / 2), y + Math.round(h / 2) + dy, opt);
    }
    ctx.restore();
    return { x: x, y: y, w: w, h: h, cx: x + w / 2, cy: y + h / 2 };
  };

  MC.pressed = function (t, at, frames) { const n = frames == null ? 3 : frames; return t >= at && t < at + n / 30; };

  MC.slot = function (ctx, x, y, s, o) {
    o = o || {};
    x = Math.round(x); y = Math.round(y); s = Math.round(s);
    ctx.save(); A(ctx, o.alpha);
    R(ctx, x, y, s, s, o.fill || C.SLOT);
    MC.inset(ctx, x, y, s, s, { width: o.bevel || 2, dark: o.dark || C.SLOT_OBEN, light: o.light || C.SLOT_UNTEN });
    if (o.item) drawItem(ctx, o.item, x + s / 2, y + s / 2, o.itemBox != null ? o.itemBox : s * 0.78, null);
    if (o.count != null) {
      /* RE-GATE: this was MC.tx (VT323) 34, taken from §S4's pre-B1 copy. mc_hud draws the
         HOTBAR's stack counts in MC.ui (Press Start 2P) at MC.HUD_GEO.countSize = 26, and
         a stack count is interface, not running text — S5 puts both on screen at once (the
         panel's own hotbar row over the dimmed HUD hotbar), so two faces for one object was
         visible in a single frame. One face, one size: PS2P 26. "64" is 52 px, right
         aligned inside a 70 or 72 px slot with the 4 px shadow still clear of the bevel. */
      MC.text(ctx, String(o.count), x + s - 6, y + s - 8,
        MC.ui(o.countSize || 26, { color: C.WEISS, align: 'right', baseline: 'alphabetic' }));
    }
    if (o.flash) { ctx.save(); ctx.globalAlpha *= clamp(o.flash); R(ctx, x, y, s, s, o.flashColor || '#FFFFFF'); ctx.restore(); }
    if (o.selected) { ctx.strokeStyle = o.selColor || '#FFFFFF'; ctx.lineWidth = 4; ctx.strokeRect(x - 2, y - 2, s + 4, s + 4); }
    ctx.restore();
  };

  /* ---------------------------------------------------------------- 3 · the inventory
     §S5's table, as data first and drawing second, because ten scene files need to land
     particles, flashes and toasts on these cells and must not each re-derive §5.3. */

  MC.invGeom = function (x, y, o) {
    o = o || {};
    x = Math.round(x != null ? x : 130); y = Math.round(y != null ? y : 420);
    const w = Math.round((o.w != null ? o.w : 770)), h = Math.round((o.h != null ? o.h : 880));
    const g = {
      x: x, y: y, w: w, h: h,
      title: { x: x + 35, y: y + 42 },
      status: { x: x + w - 35, y: y + 42 },
      preview: { x: x + 35, y: y + 70, w: 260, h: 340 },
      off: { x: x + 307, y: y + 334, s: 72 },
      arrow: { x: x + 640, y: y + 150, w: 30 },
      result: { x: x + 685, y: y + 135, s: 70 },
      armour: [], craft: [], main: [], hotbar: [],
    };
    for (let i = 0; i < 4; i++) g.armour.push({ x: x + 35, y: y + 100 + i * 78, s: 72 });
    for (let i = 0; i < 4; i++) g.craft.push({ x: x + 470 + (i % 2) * 80, y: y + 100 + Math.floor(i / 2) * 80, s: 70 });
    for (let r = 0; r < 3; r++) for (let c = 0; c < 9; c++) g.main.push({ x: x + 35 + c * 78, y: y + 500 + r * 78, s: 72, col: c, row: r });
    for (let c = 0; c < 9; c++) g.hotbar.push({ x: x + 35 + c * 78, y: y + 740, s: 72, col: c });
    return g;
  };

  /* The player preview. Vanilla's portrait looks AT the player, and the atlas's
     `player_face` tile is drawn to be seen head-on, so the figure is a front elevation.
     It is not a second MC.player: MC.player is the world-space F5 entity with a blob
     shadow, a nametag and fog, and none of those belong on a grey panel. */
  MC.portrait = function (ctx, x, y, w, h, o) {
    o = o || {};
    x = Math.round(x); y = Math.round(y); w = Math.round(w); h = Math.round(h);
    ctx.save(); A(ctx, o.alpha);
    if (o.box !== false) {
      R(ctx, x, y, w, h, o.fill || C.SLOT);
      MC.inset(ctx, x, y, w, h, { width: o.bevel || 2, dark: o.dark || C.SLOT_OBEN, light: o.light || C.SLOT_UNTEN });
    }
    const fig = figureCanvas();
    if (fig) {
      const a = o.area || [x, w];
      // integer blit scale only: 32x64 source, so k px per source pixel = 2k px per skin px
      const k = Math.max(1, Math.min(Math.floor((a[1] - 16) / 32), Math.floor((h - 24) / 64)));
      const fw = 32 * k, fh = 64 * k;
      const bob = (o.bob != null ? o.bob : 1) * 3 * Math.sin((Math.PI * 2) * 0.55 * (o.t || 0));
      const fx = Math.round(a[0] + (a[1] - fw) / 2);
      const fy = Math.round(y + (h - fh) / 2 + bob);
      MC.pixel(ctx, c => c.drawImage(fig, fx, fy, fw, fh));
    }
    ctx.restore();
    return { x: x, y: y, w: w, h: h };
  };

  MC.inventory = function (ctx, x, y, o) {
    o = o || {};
    const g = MC.invGeom(x, y, o);
    const pick = (src, i) => {
      if (src == null) return {};
      if (typeof src === 'function') return src(i) || {};
      if (Array.isArray(src)) return src[i] || {};
      return src;
    };
    const bank = (list, src) => {
      for (let i = 0; i < list.length; i++) {
        const q = pick(src, i); if (q.skip) continue;
        MC.slot(ctx, list[i].x, list[i].y, list[i].s, q);
      }
    };
    ctx.save(); A(ctx, o.alpha);
    const sc = o.scale != null ? o.scale : 1;
    if (sc !== 1) {
      const cx = g.x + g.w / 2, cy = g.y + g.h / 2;
      ctx.translate(cx, cy); ctx.scale(sc, sc); ctx.translate(-cx, -cy);
    }
    MC.panel(ctx, g.x, g.y, g.w, g.h, {
      fill: o.fill, light: o.light, dark: o.dark, frameColor: o.frameColor, bevel: o.bevel,
      title: o.title !== undefined ? o.title : 'Inventar',
      titleSize: o.titleSize, titleColor: o.titleColor,
    });
    if (o.status) {
      const st = typeof o.status === 'string' ? { s: o.status } : o.status;
      if (st.s) {
        MC.text(ctx, st.s, g.status.x, g.status.y,
          MC.ui(st.size || SZ.status, { color: st.color || C.ROT, align: 'right', shadow: false }));
      }
    }
    if (o.portrait !== false) {
      MC.portrait(ctx, g.preview.x, g.preview.y, g.preview.w, g.preview.h, Object.assign(
        { t: o.t || 0, area: [g.preview.x + 72, g.preview.w - 72] },
        (o.portrait && typeof o.portrait === 'object') ? o.portrait : {}));
    }
    bank(g.armour, o.armour);
    if (o.offhand !== false) { const q = pick(o.off, 0); if (!q.skip) MC.slot(ctx, g.off.x, g.off.y, g.off.s, q); }
    bank(g.craft, o.craft);
    if (o.arrow !== false) MC.craftArrow(ctx, g.arrow.x, g.arrow.y, g.arrow.w, {});
    { const q = pick(o.result, 0); if (!q.skip) MC.slot(ctx, g.result.x, g.result.y, g.result.s, q); }
    bank(g.main, o.main);
    bank(g.hotbar, o.hotbar);
    ctx.restore();
    return g;
  };

  /* ---------------------------------------------------------------- 4 · toast */

  MC.toast = function (ctx, t, o) {
    o = o || {};
    const IN = o.in != null ? o.in : 0.25, HOLD = o.hold != null ? o.hold : 1.4, OUT = o.out != null ? o.out : 0.20;
    const d = t - o.t0;
    if (d < 0 || d >= IN + HOLD + OUT) return null;
    const w = o.w || 760, h = o.h || 150, x0 = o.x0 != null ? o.x0 : 140;
    const y = Math.round(o.y != null ? o.y : [320, 480, 640][o.slot || 0]);
    let x;
    if (d < IN) x = lerp(W, x0, E.outCubic(d / IN));
    else if (d < IN + HOLD) x = x0;
    else x = lerp(x0, W, E.inCubic((d - IN - HOLD) / OUT));
    x = Math.round(x);

    ctx.save(); A(ctx, o.alpha);
    R(ctx, x, y, w, h, C.TOAST_RAHMEN);                       // 4 px outer border
    R(ctx, x + 4, y + 4, w - 8, 3, C.TOAST_LICHT);            // 3 px inner highlight, inset 4
    R(ctx, x + 4, y + h - 7, w - 8, 3, C.TOAST_LICHT);
    R(ctx, x + 4, y + 4, 3, h - 8, C.TOAST_LICHT);
    R(ctx, x + w - 7, y + 4, 3, h - 8, C.TOAST_LICHT);
    R(ctx, x + 7, y + 7, w - 14, h - 14, C.TOAST_KORPUS);     // body
    // 12x12 double-bevel corner squares — the vanilla 9-slice tell
    const cor = [[x, y], [x + w - 12, y], [x, y + h - 12], [x + w - 12, y + h - 12]];
    for (const q of cor) {
      R(ctx, q[0], q[1], 12, 12, C.TOAST_RAHMEN);       // the 9-slice corner tile ...
      R(ctx, q[0] + 4, q[1] + 4, 4, 4, C.TOAST_LICHT);  // ... with its single lit pixel
    }
    const cy = y + Math.round(h / 2);
    if (o.iconDraw) o.iconDraw(ctx, x + 24 + 44, cy, 88);
    else if (o.icon) drawItem(ctx, o.icon, x + 24 + 44, cy, 88, null);
    const tx = x + 136;
    MC.text(ctx, o.kicker != null ? o.kicker : 'Fortschritt erzielt!', tx, y + 48,
      MC.ui(o.kickerSize || SZ.kicker, { color: C.GELB, align: 'left' }));
    if (o.name) {
      const opt = MC.ui(o.nameSize || SZ.toastName, { color: C.WEISS, align: 'left' });
      opt.size = MC.fit(ctx, o.name, opt, x + w - 24 - tx);
      MC.text(ctx, o.name, tx, y + 100, opt);
    }
    ctx.restore();
    return { x: x, y: y, w: w, h: h, p: clamp(d / IN) };
  };

  /* ---------------------------------------------------------------- 5 · fields, bars */

  MC.field = function (ctx, x, y, w, h, o) {
    o = o || {};
    x = Math.round(x); y = Math.round(y); w = Math.round(w); h = Math.round(h);
    const bw = o.border != null ? o.border : 2;
    const edge = o.borderColor || (o.focused ? '#FFFFFF' : C.FELD_KANTE);
    ctx.save(); A(ctx, o.alpha);
    R(ctx, x, y, w, h, edge);
    R(ctx, x + bw, y + bw, w - bw * 2, h - bw * 2, o.fill || C.FELD_BG);
    if (o.label) {
      MC.text(ctx, o.label, x, y - 30,
        MC.tx(o.labelSize || 34, { color: o.labelColor || C.GRAU, align: 'left' }));
    }
    const pad = o.pad != null ? o.pad : 20;
    const full = o.value || '';
    const p = o.p != null ? o.p : 1;
    const n = p >= 1 ? full.length : Math.floor(p * full.length + 1e-6);
    const shown = full.slice(0, n);
    const cy = y + Math.round(h / 2);
    const size = o.size || 46;
    const opt = { size: size, family: o.family || MC.F.txt, weight: o.weight != null ? o.weight : 400, color: o.color || C.WEISS, align: 'left' };
    if (shown) MC.text(ctx, shown, x + pad, cy, opt);
    const cw = measureText(ctx, shown, opt);
    const caretX = x + pad + cw + 4;
    if (o.caret && Math.floor((o.t || 0) * 2) % 2 === 0) {
      R(ctx, caretX, cy - size * 0.38, size * 0.5, size * 0.76, o.color || C.WEISS);
    }
    ctx.restore();
    return { x: x, y: y, w: w, h: h, textX: x + pad, caretX: caretX };
  };

  MC.loadingBar = function (ctx, x, y, w, h, p, o) {
    o = o || {};
    x = Math.round(x); y = Math.round(y); w = Math.round(w); h = Math.round(h);
    const b = o.border != null ? o.border : 3;
    const n = o.notches != null ? o.notches : 8;
    let v = clamp(p);
    if (n > 0) v = Math.round(v * n) / n;
    ctx.save(); A(ctx, o.alpha);
    R(ctx, x, y, w, h, o.frame || '#000000');
    R(ctx, x + b, y + b, w - b * 2, h - b * 2, o.track || C.LADEBALKEN_SPUR);
    const iw = w - b * 2;
    if (v > 0) R(ctx, x + b, y + b, Math.round(iw * v), h - b * 2, o.fill || C.LADEBALKEN_FUELLUNG);
    if (o.ticks && n > 0) {
      for (let k = 1; k < n; k++) R(ctx, x + b + Math.round(iw * k / n) - 1, y + b, 2, h - b * 2, 'rgba(0,0,0,0.35)');
    }
    ctx.restore();
  };

  MC.serverRow = function (ctx, x, y, w, h, o) {
    o = o || {};
    x = Math.round(x); y = Math.round(y); w = Math.round(w || 700); h = Math.round(h || 150);
    const dim = !!o.dim;
    ctx.save(); A(ctx, o.alpha);
    R(ctx, x, y, w, h, o.selected ? '#4A4A52' : (o.fill || 'rgba(0,0,0,0.30)'));
    if (o.selected) {
      R(ctx, x, y, w, 2, '#FFFFFF'); R(ctx, x, y + h - 2, w, 2, '#FFFFFF');
      R(ctx, x, y, 2, h, '#FFFFFF'); R(ctx, x + w - 2, y, 2, h, '#FFFFFF');
    }
    // 128 px server icon box
    const bx = x + 15, by = y + 11;
    R(ctx, bx - 1, by - 1, 130, 130, C.RAHMEN);
    R(ctx, bx, by, 128, 128, o.iconFill || '#2A2A2E');
    if (o.img) {
      const iw = o.img.width || 1, ih = o.img.height || 1, k = Math.min(128 / iw, 128 / ih);
      const dw = Math.round(iw * k), dh = Math.round(ih * k);
      ctx.drawImage(o.img, bx + Math.round((128 - dw) / 2), by + Math.round((128 - dh) / 2), dw, dh);
    }
    if (o.name) {
      const opt = MC.ui(o.nameSize || SZ.serverName, { color: dim ? C.GRAU : C.WEISS, align: 'left' });
      opt.size = MC.fit(ctx, o.name, opt, w - 185 - 80);
      MC.text(ctx, o.name, x + 170, y + 45, opt);
    }
    if (o.motd) {
      MC.text(ctx, o.motd, x + 170, y + 100,
        MC.tx(o.motdSize || 38, { color: dim ? '#7A7A7A' : C.GRAU, align: 'left' }));
    }
    if (o.motd2) {
      MC.text(ctx, o.motd2, x + 170, y + 140,
        MC.tx(o.motdSize || 38, { color: dim ? '#7A7A7A' : C.GRAU, align: 'left' }));
    }
    // five ascending ping bars: 8 px wide, 5 px gaps, heights 8/14/20/26/32
    const hs = [8, 14, 20, 26, 32], px = x + 640, pb = y + 56;
    const lit = o.ping != null ? o.ping : 5;
    for (let i = 0; i < 5; i++) {
      const on = i < lit && !dim;
      R(ctx, px + i * 13, pb - hs[i], 8, hs[i], on ? (o.pingColor || C.GRUEN) : '#555555');
    }
    ctx.restore();
    return { x: x, y: y, w: w, h: h };
  };

  /* ---------------------------------------------------------------- 6 · book */

  MC.book = function (ctx, o) {
    o = o || {};
    const x = Math.round(o.x != null ? o.x : 190), y = Math.round(o.y != null ? o.y : 400);
    const w = Math.round(o.w || 700), h = Math.round(o.h || 840);
    ctx.save(); A(ctx, o.alpha);
    const sc = o.scale != null ? o.scale : 1;
    if (sc !== 1) { const cx = x + w / 2, cy = y + h / 2; ctx.translate(cx, cy); ctx.scale(sc, sc); ctx.translate(-cx, -cy); }
    R(ctx, x, y, w, h, C.PERGAMENT_KANTE);
    R(ctx, x + 3, y + 3, w - 6, h - 6, C.PERGAMENT);
    const sp = o.spine != null ? o.spine : 40;
    // faint fold: a soft vertical wash either side of the spine line
    const g = ctx.createLinearGradient(x + sp - 26, 0, x + sp + 26, 0);
    g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(0.5, 'rgba(0,0,0,0.06)'); g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g; ctx.fillRect(x + sp - 26, y + 3, 52, h - 6);
    R(ctx, x + sp, y + 3, 6, h - 6, C.PERGAMENT_FALZ);

    const inkX = x + (o.inkX != null ? o.inkX : 85);
    const measure = w - (o.inkX != null ? o.inkX : 85);
    const lh = o.lineHeight || 72, size0 = o.size || SZ.ink;
    let cy = y + (o.y0 != null ? o.y0 : 100);
    for (const ln of (o.lines || [])) {
      if (ln == null || ln === '') { cy += lh; continue; }
      const isObj = typeof ln === 'object';
      const parts = isObj && ln.parts ? ln.parts : [{ s: isObj ? (ln.s || '') : ln, color: (isObj && ln.color) || o.color || C.TINTE }];
      const size = (isObj && ln.size) || size0;
      const p = (isObj && ln.p != null) ? ln.p : 1;
      let total = 0; for (const q of parts) total += q.s.length;
      let budget = p >= 1 ? total : Math.floor(p * total + 1e-6);
      let px = inkX;
      for (const q of parts) {
        if (budget <= 0) break;
        const k = Math.min(q.s.length, budget); budget -= q.s.length;
        const str = q.s.slice(0, k);
        const opt = MC.ui(size, { color: q.color || o.color || C.TINTE, align: 'left', shadow: false });
        MC.text(ctx, str, px, cy, opt);
        px += measureText(ctx, str, opt);
      }
      cy += lh;
    }
    ctx.restore();
    return { x: x, y: y, w: w, h: h, inkX: inkX, measure: measure };
  };

  MC.pageSwap = function (ctx, t, at, o) {
    o = o || {};
    const shift = o.shift != null ? o.shift : 6;
    if (t < at + 2 / 30) return { page: 0, dx: 0 };
    if (t < at + 3 / 30) {
      const x = Math.round(o.x != null ? o.x : 190), y = Math.round(o.y != null ? o.y : 400), h = Math.round(o.h || 840);
      ctx.save(); R(ctx, x, y, shift, h, C.PERGAMENT_KANTE); ctx.restore();
      return { page: 1, dx: shift };
    }
    return { page: 1, dx: 0 };
  };

  /* ---------------------------------------------------------------- 7 · console, stats */

  function consoleParts(s, color) {
    if (color) return [{ s: s, c: color }];
    if (s.charAt(0) === '/') return [{ s: s, c: C.GELB }];
    const i = s.indexOf(']');
    if (s.charAt(0) === '[' && i > 0) return [{ s: s.slice(0, i + 1) + ' ', c: C.GRAU }, { s: s.slice(i + 1).replace(/^\s+/, ''), c: C.WEISS }];
    return [{ s: s, c: C.WEISS }];
  }

  MC.console = function (ctx, x, y, w, h, lines, t) {
    x = Math.round(x); y = Math.round(y); w = Math.round(w); h = Math.round(h);
    const pad = 20, lh = 60, size = 40;
    const cap = Math.max(1, Math.floor((h - pad * 2) / lh));
    const all = lines || [];
    const live = [];
    let nextAt = null;
    for (let i = 0; i < all.length; i++) {
      const e = all[i];
      const at = (e && typeof e === 'object') ? e.at : undefined;
      if (at == null || at <= t) live.push(e);
      else { nextAt = at; break; }
    }
    ctx.save();
    R(ctx, x, y, w, h, C.KONSOLE);
    const start = Math.max(0, live.length - cap);
    const win = live.slice(start);
    for (let i = 0; i < win.length; i++) {
      const e = win[i];
      const s = (e && typeof e === 'object') ? (e.s || '') : String(e);
      const col = (e && typeof e === 'object') ? e.color : null;
      let a = 1;
      if (i === 0 && start > 0 && nextAt != null) a = 1 - clamp((t - (nextAt - 0.2)) / 0.2);
      if (a <= 0.01) continue;
      let px = x + pad;
      const cy = y + pad + i * lh + Math.round(lh / 2);
      for (const q of consoleParts(s, col)) {
        if (!q.s) continue;
        const opt = MC.tx(size, { color: q.c, align: 'left', alpha: a });
        MC.text(ctx, q.s, px, cy, opt);
        px += measureText(ctx, q.s, opt);
      }
    }
    ctx.restore();
    return win.length;
  };

  MC.statRow = function (ctx, x, y, w, o) {
    o = o || {};
    x = Math.round(x); y = Math.round(y); w = Math.round(w);
    const size = o.size || 40;
    const lopt = MC.tx(size, { color: o.labelColor || C.GRAU, align: 'left' });
    const vopt = MC.tx(size, { color: o.valueColor || C.WEISS, align: 'right' });
    ctx.save(); A(ctx, o.alpha);
    const lab = o.label || '', val = o.value || '';
    if (lab) MC.text(ctx, lab, x, y, lopt);
    if (val) MC.text(ctx, val, x + w, y, vopt);
    const x0 = x + measureText(ctx, lab, lopt) + 14;
    const x1 = x + w - measureText(ctx, val, vopt) - 14;
    const step = o.leaderStep || 14, sz = o.leaderSize || 4;
    ctx.fillStyle = o.leaderColor || '#555555';
    for (let px = x0; px < x1 - sz; px += step) ctx.fillRect(Math.round(px), Math.round(y - sz / 2), sz, sz);
    ctx.restore();
  };

  /* ---------------------------------------------------------------- 8 · sign */

  MC.sign = function (ctx, x, y, o) {
    o = o || {};
    x = Math.round(x); y = Math.round(y);
    const w = Math.round(o.w || 560), h = Math.round(o.h || 300);
    const pw = o.postW || 40, ph = o.postH || 160, gap = o.postGap || 200;
    const ts = o.tileScale || 8;
    ctx.save(); A(ctx, o.alpha);
    if (o.post !== false) {
      const cx = x + w / 2;
      for (const s of [-1, 1]) {
        const px = Math.round(cx + s * gap / 2 - pw / 2);
        R(ctx, px, y + h, pw, ph, C.SCHILD_KANTE);
        tileFill(ctx, 'oak_log_side', o.postTileScale || ts, px + 3, y + h, pw - 6, ph - 3);
        if (o.tint) R(ctx, px + 3, y + h, pw - 6, ph - 3, o.tint);
      }
    }
    R(ctx, x, y, w, h, C.SCHILD_KANTE);
    tileFill(ctx, 'oak_planks', ts, x + 3, y + 3, w - 6, h - 6);
    if (o.tint) R(ctx, x + 3, y + 3, w - 6, h - 6, o.tint);
    const lines = o.lines || [], y0 = o.y0 != null ? o.y0 : 40, pitch = o.pitch || 62;
    for (let i = 0; i < Math.min(4, lines.length); i++) {
      const s = lines[i]; if (!s) continue;
      const opt = MC.ui(o.size || SZ.sign, { color: o.color || C.SCHILD_TINTE, align: 'center', shadow: false });
      opt.size = MC.fit(ctx, s, opt, w - 60);
      MC.text(ctx, s, x + Math.round(w / 2), y + y0 + i * pitch, opt);
    }
    ctx.restore();
    return { x: x, y: y, w: w, h: h };
  };

  /* ---------------------------------------------------------------- 9 · chat input */

  MC.suggest = function (ctx, x, y, items, o) {
    o = o || {};
    items = items || [];
    if (!items.length) return null;
    x = Math.round(x); y = Math.round(y);
    const size = o.size || 34, lineH = o.lineH || 35, pad = o.pad != null ? o.pad : 10;
    const opt = MC.tx(size, { align: 'left' });
    let mw = 0; for (const s of items) mw = Math.max(mw, measureText(ctx, s, opt));
    const w = Math.round(o.w || (mw + pad * 2)), h = items.length * lineH;
    ctx.save(); A(ctx, o.alpha);
    R(ctx, x, y, w, h, o.bg || 'rgba(0,0,0,0.75)');
    for (let i = 0; i < items.length; i++) {
      MC.text(ctx, items[i], x + pad, y + i * lineH + Math.round(lineH / 2),
        MC.tx(size, { align: 'left', color: i === (o.index || 0) ? (o.selColor || C.GELB) : (o.color || C.GRAU) }));
    }
    ctx.restore();
    return { x: x, y: y, w: w, h: h };
  };

  MC.chatInput = function (ctx, o) {
    o = o || {};
    const y = Math.round(o.y != null ? o.y : 1340), h = Math.round(o.h || 66), x = Math.round(o.x != null ? o.x : 110);
    const size = o.size || 46, full = o.text || '', p = o.p != null ? o.p : 1;
    const n = p >= 1 ? full.length : Math.floor(p * full.length + 1e-6);
    const shown = full.slice(0, n);
    ctx.save(); A(ctx, o.alpha);
    R(ctx, 0, y, W, h, o.bg || 'rgba(0,0,0,0.50)');
    const cy = y + Math.round(h / 2);
    const opt = MC.tx(size, { color: o.color || C.WEISS, align: 'left' });
    if (shown) MC.text(ctx, shown, x, cy, opt);
    const caretX = x + measureText(ctx, shown, opt) + 4;
    if (o.caret !== false && Math.floor((o.t || 0) * 2) % 2 === 0) {
      R(ctx, caretX, cy - size * 0.38, size * 0.5, size * 0.76, o.color || C.WEISS);
    }
    ctx.restore();
    if (o.suggest && o.suggest.length) {
      MC.suggest(ctx, x, o.suggestY != null ? o.suggestY : 1270, o.suggest, { index: o.suggestIndex || 0, alpha: o.alpha });
    }
    return { y: y, h: h, textX: x, caretX: caretX };
  };

  /* ---------------------------------------------------------------- 10 · odds and ends */

  MC.screenTitle = function (ctx, str, y, o) {
    o = o || {};
    const opt = MC.ui(o.size || SZ.screen, {
      color: o.color || C.WEISS, align: o.align || 'center', alpha: o.alpha,
      shadow: o.shadow !== false,
    });
    if (o.family) opt.family = o.family;
    if (o.weight) opt.weight = o.weight;
    opt.size = MC.fit(ctx, str, opt, o.maxW || 790, o.floor);
    MC.text(ctx, str, o.x != null ? o.x : 540, Math.round(y), opt);
    return opt.size;
  };

  MC.craftArrow = function (ctx, x, y, w, o) {
    o = o || {};
    x = Math.round(x); y = Math.round(y); w = Math.round(w || 30);
    const col = o.color || '#8B8B8B', sh = o.shadow || '#555555';
    const th = Math.max(2, Math.round(w * 0.2));          // shaft thickness
    const hw = Math.round(w * 0.45);                      // head length
    ctx.save(); A(ctx, o.alpha);
    for (const pass of [1, 0]) {
      const c = pass ? sh : col, dx = pass ? 2 : 0, dy = pass ? 2 : 0;
      R(ctx, x + dx, y - th / 2 + dy, w - hw, th, c);
      const steps = Math.max(2, Math.round(hw / 2));
      for (let i = 0; i < steps; i++) {
        const hh = Math.round((th * 1.6) * (1 - i / steps)) + th;
        R(ctx, x + w - hw + i * 2 + dx, y - hh / 2 + dy, 2, hh, c);
      }
    }
    ctx.restore();
  };

  MC.guiOpen = function (t, at, o) {
    o = o || {};
    const D = o.dim != null ? o.dim : 0.55, nf = o.frames || 4, sf = o.scaleFrames || 3, from = o.from != null ? o.from : 0.94;
    const f = (t - at) * 30;
    if (f < 0) return { scale: from, dim: 0, p: 0, open: false };
    const p = clamp(f / nf);
    return { scale: lerp(from, 1, E.outExpo(clamp(f / sf))), dim: D * p, p: p, open: true };
  };

  MC.guiClose = function (t, at, o) {
    o = o || {};
    const D = o.dim != null ? o.dim : 0.55, nf = o.frames || 3, to = o.to != null ? o.to : 0.96;
    const f = (t - (at - nf / 30)) * 30;
    if (f <= 1e-6) return { scale: 1, dim: D, p: 0, open: true };
    if (f >= nf - 1e-6) return { scale: to, dim: 0, p: 1, open: false };
    const p = f / nf;
    return { scale: lerp(1, to, p), dim: D * (1 - p), p: p, open: true };
  };
})();
