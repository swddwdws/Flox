/* ===================================================================================
   S02 · 4.000 – 6.000 · DER SERVER            DIRECTION.md §8 "S02 · Der Server"
   Fact 2 — brand, claim, what it is.

   Two screens, one cut between them, no cursor anywhere (§6.3: the hands left at 2.00
   and do not come back until 26.30).

     4.000  device A screen swap, 2 frames of flat black          (§7 cut 3)
     4.067  Minecraft's multiplayer server list on MENU_ERDE dirt
     4.100  the client polls HugoAFK: its five ping bars light one at a time, two frames
            apart, and resolve to a solid five just before the beat
     4.500  BEAT 3.1+2 — the row highlights AND the join button presses itself: 3-frame
            GEIST fill, 1 px #A855F7 inset outline, label 2 px down. No pointer.
     4.750  half-beat — the client re-pings the row it just selected (vanilla does this on
            selection): the bars blank and relight 1..5 on successive frames
     5.000  device A screen swap, 2 frames of flat black          (§7 cut 4, bar 3.3)
     5.067  the connect screen: dirt, `Verbinde mit dem Server…` at y 380
     5.050  the game's own /title fades in over it — ALPHA ONLY, fixed scale (§4.3)
     5.183  …and from there the type does not move again. §S2's one moment of stillness.
     6.000  S03 takes the screen (loading screen)

   THE BRAND BEAT IS A SERVER-LIST ROW, NOT A LOCKUP. IMG.logo is the 128 px server icon
   inside that row, letterboxed to 128x81 at the native 1401:888 by MC.serverRow — the same
   image the loading screen (S3) and the form header (S10) use, framed here by the game's
   own chrome so it can never read as an agency lockup.

   §S2 gives the HugoAFK row's furniture as absolute coordinates — icon (205, 455), name
   (360, 465), MOTD (360, 520), ping bars x 830 — which are the offsets of a 700x150 row
   standing at x 190, and it also says in the same paragraph that **row 2** is HugoAFK and
   is selected. Those two statements cannot both be read absolutely: row 2 stands at y 590,
   not 420. The prose wins (row 2, framed by a dim placeholder above and below), and the
   offsets are exactly what MC.serverRow already implements relative to the row, so nothing
   is lost. See `handover` / `deviations` in the report.

   §6.4, the no-dead-frame contract, against §S2's "5.20–6.00 holds dead still": what §S2
   is protecting is the TYPE — no scale ramp, no drift, no kinetic headline. The status
   line is a different object 420 px above it, and the one thing a game screen that is
   waiting on a socket always does is tick its status. So `Verbinde mit dem Server` carries
   a cycling one/two/three-period tail, stepping every 5 frames, left-anchored off the
   widest form so not one pixel of the line ever moves sideways. The /title itself is
   bit-identical from 5.183 to 5.999.

   Escape list (§2): this file calls nothing outside MC.* and engine.js's measureText, sets
   no canvas filter, raises no post-chain value, and names no banned primitive. No string is
   upper-cased in code and Silkscreen is absent. No invented figures: the five-bar signal
   glyph is the game's own, never a millisecond reading, and there is no player count.
   Determinism: no unseeded randomness, no wall clock, no accumulator — every value below
   is a pure function of t off the tables built once, here.
   =================================================================================== */

(function () {
  const C = MC.C;

  /* ---------------------------------------------------------------- timing (§7, §S2) */
  const T_LIST = 4.000;      // cut 3 · A · world -> server list
  const T_SELECT = 4.500;    // the row highlights + the join button presses itself
  const T_REPING = 4.750;    // half-beat · the selected row is re-polled
  const T_CONN = 5.000;      // cut 4 · A · server list -> connect screen (bar 3.3)
  const T_TITLE = 5.050;     // /title fade-in start (full at 5.183)
  const TITLE_HOLD = 1.000;  // long enough that the fade-out never begins inside S02 —
                             // the 6.000 screen swap is what takes the title away

  /* ---------------------------------------------------------------- geometry (§5.3) */
  const ROW = { x: 190, w: 700, h: 150, y: [420, 590, 760] };
  const BTN = { x: 230, y: 1210, w: 620, h: 84 };   // `Server beitreten`, 620x84
  const TITLE_Y = 340;                              // `Server auswählen`, centred
  const STATUS_Y = 380;                             // `Verbinde mit dem Server…`
  const HERO_Y = 800, HERO_SUB_Y = 910;             // the /title lines

  /* ---------------------------------------------------------------- copy (§S2)
     Sentence case, rendered as written (APPENDIX B1). Rows 1 and 3 are dimmed
     placeholders in §7 grey — deliberately dull, deliberately unresolved, so the eye has
     nowhere to go but the middle row. No player counts, no ping figures, no addresses
     (§2: HugoAFK.com is never presented as a Minecraft server address). */
  const ROWS = [
    { name: 'Testwelt', motd: 'Ein Server', dim: true, logo: false },
    { name: 'HugoAFK', motd: 'AFK-Client für den HugoSMP', dim: false, logo: true },
    { name: 'Bauwelt', motd: 'Ein Server', dim: true, logo: false },
  ];

  /* ---------------------------------------------------------------- the ping poll
     MC.serverRow draws five ascending bars and lights `ping` of them; a `dim` row lights
     none, which is exactly what an unresolved entry looks like in the game. So the whole
     poll lives on row 2, and it is the server list's motion:

        4.100 .. 4.367   five bars light, one every two frames -> a solid five
        4.500            the row is chosen and the join button presses itself
        4.750 .. 4.917   the client re-pings the selection: blank, then 1..5 one per frame

     Longest interval between two state changes anywhere in the list section: 0.150 s
     (the end of the 3-frame press at 4.600 to the re-ping at 4.750). §6.4 wants 0.25 s. */
  const PING_T0 = 4.100, PING_STEP = 2 / 30, PING_MAX = 5;
  const REPING_BLANK = 1 / 30, REPING_STEP = 1 / 30;

  function s02_ping(t) {
    if (t >= T_REPING) {
      const n = Math.floor((t - T_REPING - REPING_BLANK) / REPING_STEP + 1e-6) + 1;
      return Math.max(0, Math.min(PING_MAX, n));
    }
    const n = Math.floor((t - PING_T0) / PING_STEP + 1e-6) + 1;
    return Math.max(0, Math.min(PING_MAX, n));
  }

  /* ---------------------------------------------------------------- the status tail
     The connect screen's one live element. Three states, five frames each, so something
     on screen changes every 0.167 s for all 28 frames of the hold. Drawn LEFT-aligned
     from the left edge of the WIDEST form, so the sentence is optically centred at x 540
     and never jitters as the tail grows.
     DOT_PHASE puts the FULL tail on the screen's establishing frame (5.067), so the frame
     that has to match §S2's quoted `Verbinde mit dem Server…` is the one that does. */
  const STATUS = 'Verbinde mit dem Server';
  const DOTS = ['.', '..', '...'];
  const DOT_STEP = 5 / 30, DOT_PHASE = 2;

  /* ================================================================ the server list */
  function s02_serverList(ctx, t) {
    MC.screenTitle(ctx, 'Server auswählen', TITLE_Y);

    const ping = s02_ping(t);
    for (let i = 0; i < 3; i++) {
      const r = ROWS[i];
      MC.serverRow(ctx, ROW.x, ROW.y[i], ROW.w, ROW.h, {
        name: r.name,
        motd: r.motd,
        dim: r.dim,
        img: (r.logo && typeof IMG !== 'undefined') ? IMG.logo : null,
        ping: r.dim ? 0 : ping,
        selected: !r.dim && t >= T_SELECT,        // 2 px #FFFFFF border + #4A4A52 fill
      });
    }

    /* §6.3 · the motion signature. The button carries the persistent 1 px violet inset
       outline for every frame it is on screen, because the bot is the one operating it;
       on the beat it takes the GEIST fill and its label drops 2 px. Nothing hovers it,
       nothing points at it. */
    MC.button(ctx, BTN.x, BTN.y, BTN.w, BTN.h, 'Server beitreten', {
      state: MC.pressed(t, T_SELECT, 3) ? 'ghost' : 'normal',
      outline: true,
    });
  }

  /* ================================================================ the connect screen */
  function s02_connect(ctx, t) {
    const opt = MC.tx(40, { color: C.GRAU, align: 'left' });
    const wide = measureText(ctx, STATUS + DOTS[DOTS.length - 1], opt);
    const k = (Math.floor((t - T_CONN) / DOT_STEP + 1e-6) + DOT_PHASE) % DOTS.length;
    MC.text(ctx, STATUS + DOTS[k], Math.round(540 - wide / 2), STATUS_Y, opt);

    /* Vanilla's connect screen carries exactly one button. The bot never touches it, so
       it is the one button in this scene WITHOUT the violet outline — the contrast is
       what makes the outline on the join button read as a statement rather than a style. */
    MC.button(ctx, BTN.x, BTN.y, BTN.w, BTN.h, 'Abbrechen');

    /* §4.3 · the /title. Alpha only, fixed scale. If it scales it is the rejected film's
       headline gesture wearing a pixel font. MC.title is the only path allowed. */
    MC.title(ctx, t, {
      t0: T_TITLE, hold: TITLE_HOLD,
      title: 'Bleib online.', sub: 'Auch offline.',
      ty: HERO_Y, sy: HERO_SUB_Y,
      size: MC.pss(76), subSize: MC.pss(76),
      color: C.WEISS, subColor: C.GRAU,
    });
  }

  /* ================================================================ */
  SCENES.s02 = {
    draw(ctx, lt, t) {
      MC.hudMode = 0;        // §5.2 — a menu screen carries no HUD. Set EVERY frame.
      MC.armHidden = true;   // APPENDIX B5 — a screen is open for all 60 frames of S02.

      // device A, twice: two frames of flat black and the new screen is simply there
      if (MC.swap(ctx, t, T_LIST) || MC.swap(ctx, t, T_CONN)) return;

      MC.dirtBg(ctx, t);
      if (t < T_CONN) s02_serverList(ctx, t);
      else s02_connect(ctx, t);
    },
  };
})();
