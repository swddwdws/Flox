/* =====================================================================================
   DIE SCHICHT — S03 · 6.000 – 8.000 · "Die Cloud"        (DIRECTION.md §8, third section)

   Fact 3: it runs in the cloud; your own PC can be off.

   Two screens and one join, and §7's cut table fixes every boundary:

     frames 180–181   device A · two frames of flat #000000                (cut 5, bar 4.1)
     frames 182–209   the vanilla world-loading screen on MENU_ERDE dirt. The logo gets
                      its hero moment INSIDE the game's own loading chrome — it is the
                      thing the loading bar is loading, never a lockup. The bar steps
                      EIGHT discrete notches on the sixteenths and carries the bar's beat.
     frames 210–211   device A · two frames of flat #000000                (cut 6, bar 4.3)
     frames 212–239   the day world, first person, at camX 0 — the same camera the film
                      has been standing on since 3.000. The join /title fades in at fixed
                      scale, the F3 overlay toggles on line by line, and a pumpkin
                      finishes breaking on every eighth.

   THE TWO THINGS §S3 SAYS MUST NOT BE GOT WRONG
     1 · The logo is drawn ONCE, at the exact 1401:888 ratio, with no blurred copy under
         it and no glow. It is one drawImage of IMG.logo. Smoothing is left ON for it and
         only for it: this is a 1401 px artwork coming down to 520, and nearest-neighbour
         on that ratio shreds the 1 px black keylines around the letterforms. Everything
         else on the screen is pixel-snapped and unsmoothed.
     2 · The bar STEPS. p is quantised to k/8 before it ever reaches MC.loadingBar, so the
         green fill jumps 77 px at a time on the sixteenth grid and never slides. The
         notch is the beat — §9.2 scores it as the hi-hat of that bar.

   §6.4, the no-dead-frame contract, beat by beat:
     · loading screen — a notch every 0.125 s from 6.000 to 6.875, and the status tail on
       `Lade Welt` stepping every 5 frames for all 28 frames, so nothing on this screen is
       ever still for more than 0.167 s.
     · world — the arm chopping at 4 Hz, the two torches flickering at 7 Hz, the clouds
       and the idle drift, the crack stage advancing every 0.042 s through each break, 14
       particles per break, the hotbar count ticking with its 2-frame white flash, the F3
       block writing itself on one line per frame, its session clock ticking, the XP creep,
       and the /title's own fade.

   Escape list (§2): nothing outside MC.* and engine.js's measureText/IMG is called; no
   canvas filter, no post-chain value, no banned primitive, no glow, no band. The only
   violet in the scene is the logo's own AFK wordmark, i.e. the artwork itself. Nothing is
   upper-cased in code (APPENDIX B1) and FONTS.silk does not appear. No invented numbers:
   the only figures on screen are the live session clock, Minecraft stack counts and the
   fictional world coordinates §S3 plants here for S06 to prove itself against.

   Determinism: every table below is a literal built once at module load. The frame is a
   pure function of t — no Math.random, no Date, no accumulator, no state across frames.
   ===================================================================================== */
(function () {
  'use strict';

  const C = MC.C;

  /* ------------------------------------------------------------------ 1 · the cut grid
     §7 lands every cut on an exact frame. MC.swap holds flat black for the two frames
     from the timecode; everything else keys off absolute t (§8: "All timings absolute"). */
  const T_LOAD = 6.000;      // cut 5 · A · connect screen -> loading screen   (bar 4.1)
  const T_JOIN = 7.000;      // cut 6 · A · loading screen -> world (join)     (bar 4.3)

  /* ------------------------------------------------------------------ 2 · the bar
     §S3: the fill grows 0 -> 1 "in eight visible notch steps on the sixteenths, so the
     bar itself carries the beat", and §9.2 puts eight ticks on those sixteenths.

     Eight notches on the sixteenth grid of bar 4 are 6.000 / 6.125 / … / 6.875, which is
     what this schedule is: notch k lands on the (k-1)-th sixteenth, so the bar reads 1/8
     on the screen's first visible frame (6.067 — notch 1 falls inside the 2-frame black)
     and is FULL at 6.875, a beat before the join. Filling to 8/8 only at 7.000 would put
     the last notch on the cut itself and the bar would never be seen finished, which
     breaks the one causal link the beat has: the bar completes, therefore the world
     loads. §S3's "between 6.05 and 6.90" is the visible growth, and that is exactly the
     window this covers. */
  const SIXTEENTH = 0.125, NOTCHES = 8;
  const s03_loadP = t =>
    Math.max(0, Math.min(NOTCHES, Math.floor((t - T_LOAD) / SIXTEENTH + 1e-6) + 1)) / NOTCHES;

  /* ------------------------------------------------------------------ 3 · the status tail
     DEVIATION, stated openly. §S3 quotes `Lade Welt…`. Rendered as one static string the
     loading screen has exactly one moving element, the bar, and it stops moving at 6.875
     — the last four frames before the join would be dead, which §6.4 forbids. So the
     ellipsis is live: `Lade Welt` plus a one/two/three-period tail stepping every five
     frames. It is the same device S02 uses two seconds earlier on `Verbinde mit dem
     Server…`, drawn the same way — LEFT-anchored off the widest form, so the sentence is
     optically centred at x 540 and not one pixel of it ever moves sideways as the tail
     grows. DOT_PHASE puts the full tail on the establishing frame (6.067), so the frame
     that has to match §S3's quoted copy is the one that does. */
  const LOAD_TXT = 'Lade Welt';
  const DOTS = ['.', '..', '...'];
  const DOT_STEP = 5 / 30, DOT_PHASE = 2;

  /* ------------------------------------------------------------------ 4 · loading screen
     §5.3: logo width 520 (h 330) at top y 380; `Lade Welt…` y 800; bar 620x28 at
     (230, 900); tip lines y 990 / 1050. §S3 adds the version footer at y 1130. Every one
     of those is inside the safe box x 90..900 / y 300..1420. */
  const LOGO_W = 520, LOGO_Y = 380;
  const LOAD_Y = 800;
  const BAR = { x: 230, y: 900, w: 620, h: 28 };
  const TIP_Y = 990, TIP2_Y = 1050, VER_Y = 1130;

  /* Copy, §S3, in normal German sentence case and rendered as written (APPENDIX B1). */
  const TIP_A = 'Tipp:';                                  // §e — the yellow half
  const TIP_B = 'HugoAFK läuft in der Cloud.';            // §f
  const TIP_2 = 'Dein eigener PC darf aus sein.';         // §7
  const VER = 'HugoSMP · HugoAFK 1.0';                    // §7

  /* ------------------------------------------------------------------ 5 · the join /title
     §4.3 · alpha only, fixed scale, 4 frames in / 6 frames out. §S3 starts the fade at
     7.02 — i.e. inside the 2-frame black, so the title is already a third of the way up
     on the world's first visible frame, exactly as a server's join title behaves while
     the terrain is still fading in.

     DEVIATION, one frame: §S3 holds "to 7.80" and fades out over six frames, which would
     land alpha 0 on t = 8.000 and leave the LAST frame of this scene (239 = 7.9667)
     carrying the title at alpha 0.17 — S04 draws no title, so it would pop off rather
     than fade. The hold therefore ends at 7.7667 and the fade-out is complete on frame
     239. The scene hands over a clean frame; the difference is 1/30 s.

     §4.4 in the interface face (APPENDIX B1): `In der Cloud.` 13 chars at MC.pss(76) = 58
     is 754 px, `Dein PC darf aus sein.` 22 chars at MC.pss(44) = 34 is 748 px — both
     inside the 790 px safe measure, and MC.title runs the mandatory MC.fit pass anyway. */
  const TITLE_T0 = 7.02, TITLE_IN = 4 / 30, TITLE_OUT = 6 / 30;
  const TITLE_GONE = 239 / 30;                                    // 7.96667, S03's last frame
  const TITLE_HOLD = TITLE_GONE - TITLE_OUT - TITLE_IN - TITLE_T0;
  const TITLE_Y = 780, TITLE_SUB_Y = 890;

  /* ------------------------------------------------------------------ 6 · the F3 overlay
     §S3 7.00–7.20: "the F3 debug overlay toggles on as if the key were pressed", seven
     VT323 30 lines at x 40 from y 150. MC.f3's seven defaults ARE §S3's seven lines,
     including `Dein PC: aus` as the only yellow one and the `Sitzung:` clock ticking off
     floor(t) — MC.SESSION_BASE is chosen so t = 7.000 reads exactly 132:04:51. The
     `XYZ: 148.500 / 71.000 / -302.318` line is planted here, unremarked; S06 prints the
     same coordinates twice around the world reset and that is the whole proof of §S6.
     Frames 210..216 reveal lines 1..7, so the block is complete on 7.200 to the frame. */
  const F3_LINES = 7;
  const s03_f3Reveal = t =>
    Math.max(0, Math.min(F3_LINES, Math.floor((t - T_JOIN) * 30 + 1e-6) + 1));

  /* ------------------------------------------------------------------ 7 · the farm
     The same field S01 establishes and stands in front of, unchanged: one continuous
     session at one camera position (camX 0), so the world the join reveals is the world
     the film left at 4.000. Rows on a single even world-x lattice on two-block centres —
     staggering them fills the two farmland lanes that converge toward x 540 and the field
     goes back to being a brown mass. Nearest row at z 4.60, well past the z 4.5 floor
     below which one block fills 400 px and the frame reads as a stack of crates.

     camX is 0 on every frame of this scene, including 7.9667, so S04 inherits the exact
     camera it needs before its 9.000 pan starts. */
  const PK = { top: 'pumpkin_top', side: 'pumpkin_side' };
  const LOG = { top: 'oak_log_top', side: 'oak_log_side' };

  const S03_ROWS = [
    { z: 4.60, from: -6, to: 6 },
    { z: 6.40, from: -6, to: 6 },
    { z: 8.60, from: -8, to: 8 },
    { z: 11.60, from: -8, to: 8 },
    { z: 15.50, from: -12, to: 12 },
    { z: 20.50, from: -14, to: 14 },
  ];

  // grass underfoot, farmland under the near three rows, a grass path, farmland again,
  // grass to the horizon: three visible bands is what turns 30 strips into distance.
  const s03_strip = z => ((z > 3.9 && z < 9.9) || (z > 11.2 && z < 16.8)) ? 'farmland' : 'grass_top';

  const S03_FIELD = (function () {
    const cells = [];
    for (const r of S03_ROWS) for (let x = r.from; x <= r.to; x += 2) cells.push({ x: x, z: r.z, tex: PK });
    for (let y = 0; y < 3; y++) cells.push({ x: -9, z: 18, y: y, tex: LOG });
    for (let dx = -1; dx <= 1; dx++) for (let dz = -1; dz <= 1; dz++) cells.push({ x: -9 + dx, z: 18 + dz, y: 3, tex: 'oak_leaves' });
    for (let y = 0; y < 3; y++) cells.push({ x: 10, z: 24, y: y, tex: LOG });
    for (let dx = -1; dx <= 1; dx++) for (let dz = -1; dz <= 1; dz++) cells.push({ x: 10 + dx, z: 24 + dz, y: 3, tex: 'oak_leaves' });
    return cells;
  })();

  /* ------------------------------------------------------------------ 8 · the breaks
     §S3: "pumpkins breaking on the eighths". An eighth at 120 BPM is 0.250 s, so three
     of them land inside the world half of the scene: 7.25 / 7.50 / 7.75. Each is spread
     to a different part of the frame — left-near, right-middle, centre-near — so the
     three events do not stack on one spot, and the near ones sit low enough that their
     particles do not climb into the /title.

     The first block's crack starts at 6.83, i.e. while the screen is still the loading
     screen: when the world appears at 7.067 the pumpkin is already at stage 5. The
     mining did not stop while the client was on a menu, which is the argument of the
     whole film, and it is also why the world's first visible frame is not a still. */
  const CRACK_DUR = 0.42;    // stages 0..9 run in the 0.42 s before `at`
  const GONE = 0.55;         // the block is absent this long before it regrows
  const DUST = 0.75;         // MC.particles' default life
  const NUDGE = 3 / 30;      // §6.1's 3-frame, 6 px downward pitch nudge per swing

  const S03_BREAKS = [
    { x: -2, z: 4.60, at: 7.25 },
    { x: 2, z: 8.60, at: 7.50 },
    { x: 0, z: 4.60, at: 7.75 },
  ];
  const S03_BREAK_CELLS = S03_BREAKS.map(b => {
    for (const c of S03_FIELD) if (c.x === b.x && c.z === b.z && !c.y) return c;
    return null;
  });

  /* §6.1: the arm chops at 4 Hz and MC.armSwing bottoms out at swingT0 + (k + 0.5)/hz,
     so a phase origin of 7.125 puts the bottom of the chop on 7.25, 7.50 and 7.75 — the
     three frames a pumpkin finishes breaking. The 6 px pitch nudge rides the same three
     timecodes, so the impact is one event, not three that nearly agree. */
  const SWING_HZ = 4, SWING_T0 = 7.125;

  /* ------------------------------------------------------------------ 9 · the HUD state
     One continuous session (§5.2), so the HUD does not reset at a screen change: the chat
     block still carries the four lines S01 left in it, and slot 0 goes on counting up from
     the 43 pumpkins S01 finished on — one per break, each with the vanilla 2-frame white
     slot flash. That flash is the gameplay event on the eighths (§7: bar downbeats are
     marked with a gameplay event, never a graphic effect). */
  const CHAT = [
    { text: '[19:04] <Timo> bin weg, bis morgen', color: C.WEISS, life: Infinity },
    { text: 'Timo hat das Spiel verlassen', color: C.GELB, life: Infinity },
    { text: 'HugoAFK hat das Spiel betreten', color: C.GELB, life: Infinity },
    { text: '[HugoAFK] Schicht übernommen.', color: C.GRAU, life: Infinity },
  ];
  const PUMPKINS_AT_S01_END = 43;

  function s03_hotbar(t) {
    let n = PUMPKINS_AT_S01_END, fl = 0;
    for (const b of S03_BREAKS) {
      if (t >= b.at) n++;
      if (t >= b.at && t < b.at + 2 / 30) fl = 0.85;
    }
    return [
      { slot: 0, item: 'pumpkin', count: n, flash: fl },
      { slot: 1, item: 'sea_pickle', count: 12 },
      { slot: 2, item: 'emerald', count: 3 },
    ];
  }

  /* ================================================================ the loading screen */
  function s03_loading(ctx, t) {
    MC.dirtBg(ctx, t);

    /* §S3, and it is the one thing this beat must not get wrong: ONE drawImage, the
       native 1401:888 held exactly, no second copy under it, no glow, no frame, no
       shadow. It is framed by the game's own loading chrome — dirt above, `Lade Welt`
       and a progress bar below — which is what keeps it a game asset instead of a
       lockup. Smoothing stays ON here (and nowhere else in the file): the artwork is
       1401 px wide coming down to 520 and nearest-neighbour would tear its keylines. */
    if (typeof IMG !== 'undefined' && IMG.logo) {
      const h = LOGO_W * IMG.logo.height / IMG.logo.width;    // 520 x 329.62, exactly 1401:888
      ctx.save();
      ctx.imageSmoothingEnabled = true;
      ctx.drawImage(IMG.logo, Math.round(540 - LOGO_W / 2), LOGO_Y, LOGO_W, h);
      ctx.restore();
    }

    // `Lade Welt` + the live tail, left-anchored off the widest form so it never jitters
    const lo = MC.ui(MC.pss(44), { color: C.WEISS, align: 'left' });
    lo.size = MC.fit(ctx, LOAD_TXT + DOTS[DOTS.length - 1], lo, 790);
    const wide = measureText(ctx, LOAD_TXT + DOTS[DOTS.length - 1], lo);
    const k = (Math.floor((t - T_LOAD) / DOT_STEP + 1e-6) + DOT_PHASE) % DOTS.length;
    MC.text(ctx, LOAD_TXT + DOTS[k], Math.round(540 - wide / 2), LOAD_Y, lo);

    // the vanilla bar: 3 px black frame, #2B2B2B track, #57A64E fill, eight notches
    MC.loadingBar(ctx, BAR.x, BAR.y, BAR.w, BAR.h, s03_loadP(t), { notches: NOTCHES });

    /* The tip, in two colours on one optical line: `Tipp:` in §e and the sentence in §f,
       laid out from the measured width of the whole string so the pair is centred at
       x 540 as one object. */
    const ty = MC.tx(44, { align: 'left' });
    ty.size = MC.fit(ctx, TIP_A + ' ' + TIP_B, ty, 790, 30);
    const tw = measureText(ctx, TIP_A + ' ' + TIP_B, ty);
    const tx0 = Math.round(540 - tw / 2);
    MC.text(ctx, TIP_A, tx0, TIP_Y, Object.assign({}, ty, { color: C.GELB }));
    MC.text(ctx, TIP_B, tx0 + Math.round(measureText(ctx, TIP_A + ' ', ty)), TIP_Y, Object.assign({}, ty, { color: C.WEISS }));

    const t2 = MC.tx(44, { color: C.GRAU, align: 'center' });
    t2.size = MC.fit(ctx, TIP_2, t2, 790, 30);
    MC.text(ctx, TIP_2, 540, TIP2_Y, t2);

    const vo = MC.tx(32, { color: C.GRAU, align: 'center' });
    vo.size = MC.fit(ctx, VER, vo, 790, 24);
    MC.text(ctx, VER, 540, VER_Y, vo);
  }

  /* ================================================================ the world */
  function s03_cells(t) {
    for (const c of S03_BREAK_CELLS) if (c) { c.crack = undefined; c.skip = false; }
    for (let i = 0; i < S03_BREAKS.length; i++) {
      const b = S03_BREAKS[i], c = S03_BREAK_CELLS[i];
      if (!c) continue;
      const st = MC.breakStage(t, b.at - CRACK_DUR, CRACK_DUR);
      if (st >= 0) c.crack = st;
      if (t >= b.at && t < b.at + GONE) c.skip = true;
    }
    const cells = S03_FIELD.slice();
    /* S01's two torches, still standing where the film left them. They are NEARER than
       the first pumpkin row, so they go into the painter's sort as entity cells
       (APPENDIX B4) and the near row cuts across their posts; drawn before or after the
       field they would be in front of or behind all of it. The shared view is spread in
       because MC.torch resolves camX out of its OWN options and defaults it to 0. */
    cells.push({ z: 3.40, draw: (c, _, v) => MC.torch(c, -1.55, 3.40, Object.assign({}, v, { seed: 1 })) });
    cells.push({ z: 3.40, draw: (c, _, v) => MC.torch(c, 1.34, 3.40, Object.assign({}, v, { seed: 2 })) });
    return cells;
  }

  function s03_dust(ctx, t, view) {
    MC.withView(ctx, view, c => {
      for (const b of S03_BREAKS) {
        if (t < b.at || t > b.at + DUST) continue;
        const f = MC.blockFace({ x: b.x, z: b.z }, view);
        if (!f.on) continue;
        MC.particles(c, f.cx, f.cy, t, b.at, 'pumpkin', { s: f.s });
      }
    });
  }

  function s03_world(ctx, t) {
    // §6.1's mining nudge: the view pitches 6 px down for the three frames from each
    // impact. It is the only vertical motion in the shot — the bot is standing at the
    // row, not walking, so there is no head-bob (bob 0). The idle drift stays on.
    let pitch = 0;
    for (const b of S03_BREAKS) if (t >= b.at && t < b.at + NUDGE) pitch = 6;

    const view = { t: t, phase: 'tag', camX: 0, bob: 0, pitch: pitch };
    MC.world(ctx, t, Object.assign(view, { strip: s03_strip }));
    MC.blocks(ctx, s03_cells(t), view);
    s03_dust(ctx, t, view);

    // the viewer's own arm, chopping on the eighths. Bare fist: the bot is punching the
    // pumpkin out, and the silhouette stays simple under the /title.
    MC.arm(ctx, t, { swing: 1, swingHz: SWING_HZ, swingT0: SWING_T0, bob: 1 });

    /* §4.3 · the server's join /title, over the world and under the HUD, which is where
       vanilla puts it. Alpha only, fixed scale — MC.title is the only path allowed. */
    MC.title(ctx, t, {
      t0: TITLE_T0, hold: TITLE_HOLD,
      title: 'In der Cloud.', sub: 'Dein PC darf aus sein.',
      ty: TITLE_Y, sy: TITLE_SUB_Y,
      size: MC.pss(76), subSize: MC.pss(44),
      color: C.WEISS, subColor: C.GELB,
    });

    MC.hudMode = 1;
    MC.chatLines = CHAT;
    MC.hotbarItems = s03_hotbar(t);
    MC.hotbarSel = 0;
    MC.xp = { level: 27 };            // p null = the deterministic creep (§6.4)
    MC.f3On = true;
    MC.f3Reveal = s03_f3Reveal(t);    // 7.00 -> 7.20, one line per frame
  }

  /* ================================================================ */
  SCENES.s03 = {
    draw(ctx, lt, t) {
      MC.hudMode = 0;        // §5.2 — a menu screen carries no HUD. Set EVERY frame.
      MC.armHidden = true;   // APPENDIX B5 — cleared below on the frames the world is up.

      // device A, twice: two frames of flat black and the new screen is simply there
      if (MC.swap(ctx, t, T_LOAD) || MC.swap(ctx, t, T_JOIN)) return;

      if (t < T_JOIN) { s03_loading(ctx, t); return; }

      MC.armHidden = false;
      s03_world(ctx, t);
    },
  };
})();
