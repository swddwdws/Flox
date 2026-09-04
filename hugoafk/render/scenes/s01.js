/* =====================================================================================
   DIE SCHICHT — S01 · 0.000 – 4.000 · "Feierabend"      (DIRECTION.md §8, first section)

   Fact 1: the player logs off; the farm keeps running.

   Three states inside four seconds, and the cut table (§7) fixes every boundary:

     frames   0 – 59   the pause menu over the LIVE night world. Frame 0 is the film's
                       TikTok cover: grey vanilla menu chrome over a game world, with a
                       pumpkin already at crack stage 9 and the mouse already in motion.
     frame       60    the click. `Vom Server trennen` depresses, bevels swapped.
     frames  61 – 89   flat #000000 — the only black in 900 frames. The white arrow is
                       still on it for frames 61–64, sliding down-right off the corner
                       with its ghost trail: the hands are seen to LEAVE (§6.3).
     frames  90 – 119  device D, a straight cut into the identical camera in full
                       daylight, F5 profile, the bot already swinging.

   What this file does NOT do, on purpose:
     · it never calls MC.arm. The pause menu is an open screen (APPENDIX B5) and the day
       beat is a third-person F5 shot, so the first-person limb is wrong in every one of
       the 120 frames. MC.armHidden is set every frame anyway, defensively.
     · it never touches FX, never calls ctx.filter, never raises a glow, and uses no
       primitive on §2's banned list. The only violet in the scene is the bot's own
       player_shirt texture, straight out of the atlas.
     · nothing is upper-cased in code (APPENDIX B1); every interface size goes through
       MC.pss(); every string is drawn through MC.text / MC.* so it carries the §4.1
       drop shadow.

   Determinism: every table below is built once, at module load, out of literals. The
   frame is a pure function of t — no Math.random, no Date, no accumulator, no state
   that survives a frame.
   ===================================================================================== */
(function () {
  'use strict';

  const C = MC.C;

  /* ------------------------------------------------------------------ 1 · the cut grid
     §7 lands every cut on an exact frame, so the scene switches on the frame number and
     not on a float comparison that can land either side of a boundary. */
  const s01_frame = t => Math.floor(t * 30 + 0.5);
  const F_CLICK = 60;      // 2.000 · bar 2.1 · the button depresses
  const F_BLACK = 61;      // 2.033 · "on the next frame the screen is flat #000000"
  const F_DAY = 90;        // 3.000 · bar 2.3 · device D, straight cut into daylight

  const T_EXIT = 61 / 30;  // the cursor exit occupies frames 61..64 exactly

  /* ------------------------------------------------------------------ 2 · the farm
     §S1 asks for three rows of seven pumpkins at z = 3 / 5 / 7. Rendered, a z = 3 row is
     a wall: one block is 353 px across and the frame reads as standing inside a stack of
     orange crates rather than looking down a field. The rows are therefore at 4.6 / 6.4 /
     8.6 on two-block centres — the same three rows, pushed back to where the projection
     shows them receding — with three more rows behind them for depth. The gaps are the
     point: at these depths only two to five blocks of each row are on screen, and the
     farmland between them is what makes the shot read as a FARM. */
  const PK = { top: 'pumpkin_top', side: 'pumpkin_side' };
  const LOG = { top: 'oak_log_top', side: 'oak_log_side' };

  /* Every row sits on the SAME even world-x lattice — deliberately not staggered. Under
     this projection a world-space gap converges toward the vanishing point at x 540, so an
     aligned lattice opens two lanes of bare farmland that narrow with depth, one either
     side of centre. Staggering the rows (the first cut of this file did) fills those lanes
     with the row behind, and the field goes back to being a brown mass. */
  const S01_ROWS = [
    { z: 4.60, from: -6, to: 6 },
    { z: 6.40, from: -6, to: 6 },
    { z: 8.60, from: -8, to: 8 },
    { z: 11.60, from: -8, to: 8 },
    { z: 15.50, from: -12, to: 12 },
    { z: 20.50, from: -14, to: 14 },
  ];

  /* one ground band per pair of rows: grass in the foreground the player stands on,
     farmland under the near three rows, a grass path, farmland again, grass to the
     horizon. Three visible bands is what turns 30 strips into distance. */
  const s01_strip = z => ((z > 3.9 && z < 9.9) || (z > 11.2 && z < 16.8)) ? 'farmland' : 'grass_top';

  /* Built ONCE (§10.4 point 3). Per frame the scene slices it and pushes the entity
     cells; the base objects are only ever written by the break schedule, which rewrites
     every one of them on every frame, so nothing can go stale. */
  const S01_FIELD = (function () {
    const cells = [];
    for (const r of S01_ROWS) for (let x = r.from; x <= r.to; x += 2) cells.push({ x: x, z: r.z, tex: PK });
    // two oak trees in the middle distance, left and right, so the field has something
    // standing in it that is not a pumpkin
    for (let y = 0; y < 3; y++) cells.push({ x: -9, z: 18, y: y, tex: LOG });
    for (let dx = -1; dx <= 1; dx++) for (let dz = -1; dz <= 1; dz++) cells.push({ x: -9 + dx, z: 18 + dz, y: 3, tex: 'oak_leaves' });
    for (let y = 0; y < 3; y++) cells.push({ x: 10, z: 24, y: y, tex: LOG });
    for (let dx = -1; dx <= 1; dx++) for (let dz = -1; dz <= 1; dz++) cells.push({ x: 10 + dx, z: 24 + dz, y: 3, tex: 'oak_leaves' });
    return cells;
  })();

  /* ------------------------------------------------------------------ 3 · the breaks
     §S1's beat map: one pumpkin finishes breaking inside the first eight frames, three
     more on 0.50 / 1.00 / 1.50, two more on 3.25 / 3.75 in daylight — and those two
     regrow. Every one is placed so that its 14 falling particles spawn BELOW y 852 —
     the bottom edge of the button block at x 230..850 — because a break the menu hides is
     a beat the viewer does not get. */
  const S01_BREAKS = [
    // pre-roll: this one broke 0.30 s before the film starts, so frame 0 already has a
    // gap in the second row with its dust still in the air. The cover frame has to look
    // like the middle of something, not like a title card.
    { x: 2, z: 6.40, at: -0.30 },
    { x: 0, z: 4.60, at: 0.04 },     // crack stage 9 on frame 0 — the cover frame's event
    { x: -2, z: 6.40, at: 0.50 },
    { x: 2, z: 6.40, at: 1.00 },
    { x: -2, z: 4.60, at: 1.50 },
    // daylight. The 3.25 break is the near pumpkin standing at the bot's right hand, and
    // its crack is already at stage 4 when the straight cut lands — the mining did not
    // stop while the screen was black, which is the whole argument of the film.
    { x: 0, z: 4.60, at: 3.25 },
    { x: 2, z: 8.60, at: 3.75 },
  ];
  const CRACK_DUR = 0.42;            // crack stages 0..9 run in the 0.42 s before `at`
  const GONE = 0.55;                 // how long the block is absent before it regrows
  const DUST = 0.75;                 // MC.particles' default life

  // resolve each schedule entry to its cell ONCE, so the per-frame pass is six writes.
  // One cell carries two entries (it breaks at 0.04 and again at 3.25), so the per-frame
  // pass clears every break cell first and then applies — otherwise the later entry's
  // "nothing happening" would wipe the earlier one's crack stage.
  const S01_BREAK_CELLS = S01_BREAKS.map(b => {
    for (const c of S01_FIELD) if (c.x === b.x && c.z === b.z && !c.y) return c;
    return null;
  });

  /* ------------------------------------------------------------------ 4 · the cursor
     §S1: "already in motion at frame 0, at (830, 1120), travelling on eased waypoints
     toward `Vom Server trennen`." The path is extended BACKWARDS past t = 0 so the three
     ghosts on the cover frame are honest previous positions rather than a fixed offset —
     the arrow has to look like it is moving in the still, because it is.

     The easing pair per leg is chosen so the speed is continuous at t = 0: the approach
     leg ends fast (inQuad), the first travel leg starts fast (outQuad), and the last two
     legs settle into the button. */
  const S01_PATH = [
    { t0: -0.40, t1: 0.00, a: [968, 1244], b: [830, 1120], e: E.inQuad },
    { t0: 0.00, t1: 0.60, a: [830, 1120], b: [742, 1020], e: E.outQuad },
    { t0: 0.60, t1: 1.16, a: [742, 1020], b: [652, 918], e: E.inOutQuad },
    { t0: 1.16, t1: 1.44, a: [652, 918], b: [596, 856], e: E.inOutQuad },
    { t0: 1.44, t1: 1.70, a: [596, 856], b: [540, 810], e: E.inOutQuad },
  ];
  const CLICK_PT = [540, 810];       // the tip settles on the centre of the third button
  // the third button's rect (§5.3), so the hover state can be read off the POINTER
  // instead of off the clock — a lit button under an arrow that is still 90 px away is
  // the kind of tell the whole film is built to avoid
  const BTN3 = { x0: 230, y0: 768, x1: 850, y1: 852 };

  function s01_cursorAt(t) {
    if (t <= S01_PATH[0].t0) return S01_PATH[0].a.slice();
    for (const L of S01_PATH) {
      if (t >= L.t0 && t < L.t1) {
        const u = L.e((t - L.t0) / (L.t1 - L.t0));
        return [L.a[0] + (L.b[0] - L.a[0]) * u, L.a[1] + (L.b[1] - L.a[1]) * u];
      }
    }
    return CLICK_PT.slice();
  }

  // The legs are timed so the tip crosses y 852 — the button's bottom edge — on frame 45,
  // i.e. §S1's 1.500 exactly: it is still 4 px outside on frame 44 and 1 px inside on
  // frame 45. The hover is then read off the pointer and lights on that frame, and the
  // arrow goes on settling onto the label until 1.70, which is what a hand does.
  const s01_onButton = p => p[0] >= BTN3.x0 && p[0] <= BTN3.x1 && p[1] >= BTN3.y0 && p[1] <= BTN3.y1;

  /* ------------------------------------------------------------------ 5 · the two lines
     on black. §S1 puts them at x 130 / y 900 / y 970 in VT323 46, §e #FFFF55, typing on
     from 2.05 and 2.55.

     DEVIATION, stated openly: §S1 says 40 chars/s. At 40 chars/s the second line — 30
     characters — is still typing at 3.30, i.e. it would be cut off at 40 % by the
     straight cut on 3.000, and `HugoAFK hat das Spiel betreten` is the beat that hands
     the film to the bot. Both lines therefore run at 96 chars/s: line 1 completes on
     frame 71 (2.367), line 2 starts on frame 77 (2.567) and completes on frame 86
     (2.867), leaving §9's 0.15 s of silent held black before the cut. The longest gap
     with no state change anywhere on screen is 0.200 s (frames 71 → 77), inside §6.4's
     0.25 s contract. */
  const CPS = 96;
  const LINE_A = { s: 'Timo hat das Spiel verlassen', t0: 2.05, y: 900 };
  const LINE_B = { s: 'HugoAFK hat das Spiel betreten', t0: 2.55, y: 970 };

  /* The visible result is character-for-character what drawKinetic's 'type' mode draws at
     tracking 0 — it reveals whole glyphs left to right at their natural advances — but it
     goes through MC.text, so the §4.1 double-draw drop shadow lands on it. drawKinetic
     has no shadow pass of its own. */
  function s01_typeOn(ctx, line, t) {
    const n = Math.floor((t - line.t0) * CPS + 1e-6);
    if (n <= 0) return;
    const str = line.s.slice(0, Math.min(line.s.length, n));
    const o = MC.tx(46, { color: C.GELB, align: 'left' });
    o.size = MC.fit(ctx, line.s, o, 770, 30);      // the mandatory §4.4 measure pass
    MC.text(ctx, str, 130, line.y, o);
  }

  /* ------------------------------------------------------------------ 6 · chat (§5.2)
     Arrival order, oldest first. The Timo line is on screen at frame 0 and is pinned;
     the two join lines are the same two strings the black second typed, arriving in the
     chat block the moment the world comes back. */
  const CHAT_NIGHT = [{ text: '[19:04] <Timo> bin weg, bis morgen', color: C.WEISS, life: Infinity }];
  const CHAT_DAY = [
    { text: '[19:04] <Timo> bin weg, bis morgen', color: C.WEISS, life: Infinity },
    { text: 'Timo hat das Spiel verlassen', color: C.GELB, life: Infinity },
    { text: 'HugoAFK hat das Spiel betreten', color: C.GELB, life: Infinity },
    { text: '[HugoAFK] Schicht übernommen.', color: C.GRAU, t0: 3.60, life: Infinity },
  ];

  /* ------------------------------------------------------------------ 7 · the field pass
     Applies the break schedule and returns a fresh array with the entity cells pushed. */
  function s01_cells(t) {
    for (const c of S01_BREAK_CELLS) if (c) { c.crack = undefined; c.skip = false; }
    for (let i = 0; i < S01_BREAKS.length; i++) {
      const b = S01_BREAKS[i], c = S01_BREAK_CELLS[i];
      if (!c) continue;
      const st = MC.breakStage(t, b.at - CRACK_DUR, CRACK_DUR);
      if (st >= 0) c.crack = st;
      if (t >= b.at && t < b.at + GONE) c.skip = true;
    }
    const cells = S01_FIELD.slice();
    // §S1's two torches, on the field's NEAR edge at z 3.40 — in front of the first
    // pumpkin row and of the bot, behind nothing. They go in as ENTITY CELLS (APPENDIX B4)
    // rather than being drawn before or after the field, because at that depth they have
    // to occlude every block and the bot, and the painter's sort is the only thing that
    // can be trusted to keep doing that when a later pass moves something.
    // Placement: screen x ~57 and ~958, i.e. the two posts frame the left and right
    // margins and stay clear of the button block at x 230..850; the flames sit at y ~737,
    // one either side of `Vom Server trennen`; and their 0.22-alpha ground pools fall into
    // the empty grass foreground — the one part of the cover frame with nothing else in
    // it, because APPENDIX B5 takes the first-person arm out of every frame here.
    // The shared view is spread in: MC.torch resolves camX out of its OWN options and
    // defaults it to 0 (mc_world's API block warns about exactly this), so handing it a
    // bare {t} would pin it to the wrong world x the moment anything panned.
    cells.push({ z: 3.40, draw: (c, _, v) => MC.torch(c, -1.55, 3.40, Object.assign({}, v, { seed: 1 })) });
    cells.push({ z: 3.40, draw: (c, _, v) => MC.torch(c, 1.34, 3.40, Object.assign({}, v, { seed: 2 })) });
    return cells;
  }

  function s01_dust(ctx, t, view) {
    MC.withView(ctx, view, c => {
      for (const b of S01_BREAKS) {
        if (t < b.at || t > b.at + DUST) continue;
        const f = MC.blockFace({ x: b.x, z: b.z }, view);
        if (!f.on) continue;
        MC.particles(c, f.cx, f.cy, t, b.at, 'pumpkin', { s: f.s });
      }
    });
  }

  /* ------------------------------------------------------------------ 8 · the hotbar
     One continuous session, so the HUD does not reset at the cut: Timo's hotbar stays on
     screen and the bot simply keeps filling it. §S1's two daylight breaks tick slot 0
     from 41 to 43, each with the vanilla 2-frame white slot flash — that is the gameplay
     event on the 3.25 / 3.75 half-beats. */
  function s01_hotbar(t) {
    let n = 41;
    if (t >= 3.25) n++;
    if (t >= 3.75) n++;
    const fl = ((t >= 3.25 && t < 3.25 + 2 / 30) || (t >= 3.75 && t < 3.75 + 2 / 30)) ? 0.85 : 0;
    return [
      { slot: 0, item: 'pumpkin', count: n, flash: fl },
      { slot: 1, item: 'sea_pickle', count: 12 },
      { slot: 2, item: 'emerald', count: 3 },
    ];
  }

  /* ------------------------------------------------------------------ 9 · the pause menu
     §5.3: title y 420, three 620x84 buttons at x 230, y 560 / 664 / 768. §4.4's sizes are
     Silkscreen measurements and the interface face is Press Start 2P (APPENDIX B1), so
     every one goes through MC.pss(): 48 -> 37, 36 -> 27. */
  const MENU = ['Zurück zum Spiel', 'Statistiken', 'Vom Server trennen'];

  function s01_menu(ctx, fr, hover) {
    MC.screenTitle(ctx, 'Spiel pausiert', 420, { size: MC.pss(48) });
    for (let i = 0; i < 3; i++) {
      let state = 'normal';
      if (i === 2) {
        // the cursor is on screen for this whole beat, so the third button takes the
        // vanilla CURSOR hover (§3.3: BUTTON_HELL + a 2 px white outline) the frame the
        // pointer enters it — never the GEIST ghost, which belongs to the 24 unattended
        // seconds after 2.00.
        if (fr === F_CLICK) state = 'pressed';
        else if (hover) state = 'hover';
      }
      MC.button(ctx, 230, 560 + i * 104, 620, 84, MENU[i], { size: MC.pss(36), state: state });
    }
  }

  /* ==================================================================================== */
  SCENES.s01 = {
    draw(ctx, lt, t, dur, sc) {
      const fr = s01_frame(t);

      // APPENDIX B5. S01 draws no first-person arm in any of its 120 frames — the pause
      // menu is an open screen and the daylight beat is third person — so the flag is set
      // unconditionally. MC.hud() clears it again at the end of every frame.
      MC.armHidden = true;

      /* ---------------------------------------------------------- A · the black second */
      if (fr >= F_BLACK && fr < F_DAY) {
        ctx.fillStyle = '#000000';
        ctx.fillRect(0, 0, W, H);

        if (t >= LINE_A.t0) s01_typeOn(ctx, LINE_A, t);
        if (t >= LINE_B.t0) s01_typeOn(ctx, LINE_B, t);

        // §6.3, the founding moment of the film's motion signature: four frames of the
        // white arrow on the black, sliding down-right off the corner with a 0.50 / 0.30
        // / 0.15 ghost trail, and then the hands are gone for 24 seconds. E.linear is
        // deliberate — it spaces the four arrows evenly along the diagonal, which is what
        // makes them read as one streak instead of a pile on the start point.
        const cur = MC.cursorSlide(t, {
          t0: T_EXIT, dur: 4 / 30, from: CLICK_PT, to: MC.CURSOR_OFF, ease: E.linear,
        });
        if (cur) MC.cursorState = cur;

        MC.hudMode = 0;          // no HUD on the black. Nothing else moves.
        return;
      }

      /* ---------------------------------------------------------- B · the shared world
         One view object per frame, handed to every world call (mc_world's API block is
         explicit that they must all read the same one). The camera does not move in this
         scene: camX 0, no bob, only §6.1's constant idle drift, so the daylight frame at
         3.000 really is "the identical camera position". */
      const night = fr < F_DAY;
      const view = { t: t, phase: night ? 'nacht' : 'tag', camX: 0, bob: 0 };

      MC.world(ctx, t, Object.assign(view, {
        strip: s01_strip,
        // mc_world's night default is haze 0.50. Stacked with the pause menu's mandatory
        // DIM 0.55 it turns the pumpkin field into one brown mass, and at that point the
        // cover frame reads as "a dark Minecraft scene" — precisely the failure §S1 names.
        // 0.22 was picked by rendering frame 0 at 0.50 / 0.34 / 0.22 / 0.14 and looking:
        // it keeps the night night and the torchlit pumpkins orange. Daylight takes 0.
        haze: night ? 0.22 : 0,
        // APPENDIX B2: §S1's moon at (770, 400) lands on the last letters of
        // `Spiel pausiert`, which §5.3 centres at y 420. 872 / 262 clears it and puts the
        // brightest object in the night frame in the top-right quadrant, where nothing
        // else is competing.
        moonX: 872, moonY: 262,
      }));

      const cells = s01_cells(t);

      if (!night) {
        // §6.2's first F5 shot. The bot goes in as an entity cell so the pumpkin rows
        // behind it and the torches in front of it sort correctly against it (B4).
        //
        // Two build-gate corrections to §S1's literal "mcPlayer at (540, 1240), size 150,
        // facing right":
        //   · scale, not size. mc_world's API block measures `size: 150` at this depth as
        //     scale ~0.5 — a doll standing in a full-size field. The bot is drawn at its
        //     true projected size instead: 2.000 blocks at z 4.45 = 476 px, feet on the
        //     ground plane at y 1086, head top y 610, nametag clear of the toast at y 470.
        //   · left of centre. MC.player's face is on ONE side of the head and the
        //     projection decides whether it is visible: `facing: 'right'` shows it only
        //     while the bot stands LEFT of x 540. At world x -0.56 it stands at screen
        //     x ~407, in the left farmland lane, looking into the frame at the pumpkin it
        //     is harvesting — the one that breaks on 3.25, one row behind it at z 4.60.
        // The swing phase is offset a quarter period off the cut (swingT0 3.125, 2 Hz).
        // MC.armSwing is sin(PI * frac((t - swingT0) * hz)), so anchoring it ON a beat
        // parks the arm at DEAD REST on exactly the frames the scene is most looked at —
        // the straight cut at 3.000 and the two breaks at 3.25 / 3.75. The gate hit that
        // trap twice; a quarter period off puts the chop mid-stroke on all three.
        cells.push({
          z: 4.45, draw: (c, _, v) => MC.player(c, -0.56, 4.45, Object.assign({}, v, {
            name: 'HugoAFK', facing: 'right', swing: 1, swingHz: 2, swingT0: 3.125,
            walk: 0, bob: 0.010,
          })),
        });
      }

      MC.blocks(ctx, cells, view);
      s01_dust(ctx, t, view);

      /* ---------------------------------------------------------- C · night: the menu */
      if (night) {
        // The pointer is drawn by MC.hud LAST, above the menu it is clicking (§6.3). Its
        // three ghosts are the path sampled one, two and three frames back — honest
        // previous positions, so the arrow reads as MOVING in the cover still, and the
        // trail is dropped the moment it stops rather than piling three copies on itself.
        const p = s01_cursorAt(t);
        const trail = [];
        for (let k = 1; k <= 3; k++) trail.push(s01_cursorAt(t - k / 30));
        const moving = Math.abs(trail[0][0] - p[0]) + Math.abs(trail[0][1] - p[1]) > 2;

        MC.dim(ctx, 0.55);       // §3.6 — the world stays LIVE behind the dim
        s01_menu(ctx, fr, s01_onButton(p));

        MC.hudMode = 2;
        MC.chatLines = CHAT_NIGHT;
        MC.cursorState = { x: p[0], y: p[1], trail: moving ? trail : null };
      } else {
        /* -------------------------------------------------------- D · day: the F5 beat */
        // §S1 3.50: the first advancement toast. MC.toast is §S4's geometry exactly —
        // 760x150 sliding x 1080 -> 140 in 0.25 s on E.outCubic, resting in stack slot 0
        // at y 320, an 88 px pumpkin block icon in its cell.
        MC.toast(ctx, t, {
          t0: 3.50, slot: 0, name: 'Schicht übernommen', kicker: 'Fortschritt erzielt!',
          icon: 'pumpkin', hold: 1.4,
        });

        MC.hudMode = 1;
        MC.crosshair = false;    // vanilla hides the crosshair in third person
        MC.chatLines = CHAT_DAY;
      }

      MC.hotbarItems = s01_hotbar(t);
      MC.hotbarSel = 0;
      MC.xp = { level: 27 };     // p null = the deterministic creep, one of §6.4's motions
    },
  };
})();
