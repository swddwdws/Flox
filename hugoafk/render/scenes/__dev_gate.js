/* ===================================================================================
   __dev_gate.js — DIRECTION.md §10.5 BUILD GATE. Not part of the film; nothing in the
   film ever loads this file. It exists to prove that mc_world.js + mc_gui.js + mc_hud.js
   hold up TOGETHER before ten scene authors build on top of them.

   Render:
     export NODE_PATH=/opt/node22/lib/node_modules
     node tools/render.js --html dev_gate.html --out out/gate --times 0,1,2,3,4,5,6,7,8 --workers 4

   RE-GATE PASS. Four authors rebuilt the figure + arm (mc_world.js), the atlas
   (tools/textures.py), the interface face + GUI furniture (mc_gui.js) and the HUD
   (mc_hud.js) in parallel, and none of them could edit this file. It was therefore
   testing the wrong things, and in three places it was itself in breach of the direction:
     · G.label was set in FONTS.silk weight 700 — the one surviving APPENDIX B1 violation
       in the whole render/scenes tree that reaches a gate PNG, and it put an ALL-CAPS
       strip along the bottom of every one of them.
     · every interface size here was a §4.4 SILKSCREEN size handed straight to Press Start
       2P, which is 1.31x wider per character — the type came out ~31 % oversized. Every
       one now goes through MC.pss().
     · the copy carried §S7's `VON DEINEM HANDY` / `BOT STOPPEN` in caps. B1 overrides §4:
       copy is written in normal German sentence case and rendered as written.
     · page 4 hand-assembled the inventory out of MC.panel + loose MC.slot calls, so it
       drew a half-empty grey panel and never exercised MC.inventory / MC.portrait.
     · pages 4 and 5 drew MC.arm behind an open GUI (APPENDIX B5).
     · pages 1 and 8 both landed on an exact multiple of the swing period, so MC.armSwing
       returned 0 and the two pages meant to show the swing showed the arm at rest.
     · page 3 stood the bot RIGHT of frame centre facing right, which is geometrically the
       BACK of its head — the one F5 page in the gate never showed the bot's face.

// API:
//   Everything is on the local `G` object; nothing is added to MC. Every function is a
//   pure function of its arguments. The scene is registered as SCENES.__demo, which
//   dev_gate.html's `window.__DEMO = true` hands the whole 30 s to.
//
//   G.PAGES  -> array of {t, ft, name}
//     The gate's page table. Index = the integer second on the dev clock, `ft` = the film
//     time that page reproduces, `name` = what §10.5 calls it.
//        t 0 -> ft  0.000  the cover frame: pause menu chrome over the dimmed night world
//        t 1 -> ft  3.133  the day cut: first-person world, full HUD, arm MID-SWING
//        t 2 -> ft 10.300  mid-pan: off-centre blocks, toast sliding in, chat
//        t 3 -> ft 25.400  golden hour, F5 profile: the bot WALKING toward the oak sign,
//                          face to camera, a near pumpkin cutting across its trailing side
//        t 4 -> ft 11.600  CROSS-CHECK: the furnished MC.inventory vs F3 vs HUD mode 2,
//                          with MC.armHidden proving APPENDIX B5
//        t 5 -> ft 18.600  CROSS-CHECK: control panel vs horizon vs HUD mode 2 (B5 again)
//        t 6 -> ft  9.000  CROSS-CHECK: bare ground, day — the §10.5 Q2 distance test
//        t 7 -> ft 24.000  CROSS-CHECK: bare ground, golden hour
//        t 8 -> ft  9.3125 ARM: mid-swing, holding a block, plus a ghost of the same arm
//                          at drop 0.55 so the S6 exit path is visible in the same still
//
//     WHY PAGE 3 MOVED FROM ft 28.500 TO ft 25.400. §6.2 has four F5 shots and the gate
//     has room for one. 28.500 is the closing shot and the bot is idle there; 25.400 is
//     §6.2's 25.00–26.00 walk, in the same golden-hour world, with the same oak sign in
//     frame. The idle pose is the degenerate case of the walking one (`walk: 0`), so the
//     walk page tests strictly more: the leg scissor, the counter-swinging arms, the
//     nametag clearance and the face. A scene author who wants to see the closing pose
//     changes `walk: 1` to `walk: 0` in G.page3.
//
//   G.farm() -> cell[]
//     The pumpkin farm used by pages 0/1/2/8, in MC.blocks cell form. Three rows of seven
//     pumpkins at z = 3 / 5 / 7 (§S1) on two-block centres, a cobble station well off to
//     the right and a stone one well off to the left (the side-face test), farmland rows
//     behind them, a spawner pit, an oak tree and a chest. ~60 cells.
//
//   G.goldFarm() -> cell[]
//     The sparse golden-hour field for page 3: a few pumpkins and a cobble station, laid
//     out so nothing stands where the sign or the bot does — except the ONE near pumpkin
//     at z 2.9 that deliberately crosses the bot's trailing (right-hand) side, which is
//     the §B4 painter's-order test.
//
//   G.pauseMenu(ctx) -> undefined
//     §5.3's pause menu: `Spiel pausiert` (Press Start 2P MC.pss(48) = 37, centred, y 420)
//     and three 620x84 buttons at x 230, y 560 / 664 / 768 at MC.pss(36) = 27. Draws NO
//     dim — the caller owns that.
//
//   G.label(ctx, s) -> undefined
//     A 52 px black strip along the bottom edge with a VT323 30 caption in it, so a
//     contact sheet of the nine PNGs is self-describing. It is gate furniture and never
//     appears in the film. VT323, not Silkscreen: B1 took Silkscreen out of the tree, and
//     a dev caption in a caps-only face is exactly the tell the amendment is about.
//
//   G.tick(t) -> {page: int, ft: number}
//     Maps the dev clock to a page index and the film time that page reproduces.
   =================================================================================== */

const G = {};

G.PAGES = [
  { t: 0, ft: 0.000, name: 'Cover · Pausenmenü über der gedimmten Nachtwelt' },
  { t: 1, ft: 3.133, name: 'Tag-Schnitt 3.000 · Ego-Ansicht, voller HUD, Arm im Schwung' },
  { t: 2, ft: 10.300, name: 'Pan · Blöcke weit ausser Mitte, Toast, Chat' },
  { t: 3, ft: 25.400, name: 'Goldstunde · F5-Profil, Bot läuft zum Eichenschild' },
  { t: 4, ft: 11.600, name: 'Quertest · Inventar (MC.inventory) vs F3 vs HUD-Modus 2' },
  { t: 5, ft: 18.600, name: 'Quertest · Steuerpanel vs Horizont vs HUD-Modus 2' },
  { t: 6, ft: 9.000, name: 'Nur Boden · Tag — liest der Boden als Distanz?' },
  { t: 7, ft: 24.000, name: 'Nur Boden · Goldstunde' },
  { t: 8, ft: 9.3125, name: 'Arm · Schwung + gehaltener Block + drop-Test' },
];

G.tick = function (t) {
  const p = Math.max(0, Math.min(G.PAGES.length - 1, Math.floor(t + 1e-6)));
  return { page: p, ft: G.PAGES[p].ft };
};

const PK = { top: 'pumpkin_top', side: 'pumpkin_side' };
const LOG = { top: 'oak_log_top', side: 'oak_log_side' };

G.farm = function () {
  const c = [];
  // §S1: three rows of seven pumpkins at z = 3 / 5 / 7. On two-block centres, because at
  // z = 3 one block is 353 px and seven adjacent pumpkins are a wall, not a field.
  for (const z of [3, 5, 7]) for (let i = -6; i <= 6; i += 2) c.push({ x: i, z: z, tex: PK });
  // two more rows further back so the field has depth rather than three ledges
  for (const z of [10, 13.5]) for (let i = -8; i <= 8; i += 2) c.push({ x: i, z: z, tex: PK });
  // the side-face test: two stations that sit well off centre at every camX the gate uses
  for (let i = 3; i <= 5; i++) for (let y = 0; y < 2; y++) c.push({ x: i, z: 4.6, y: y, tex: 'cobblestone' });
  for (let i = -6; i <= -4; i++) c.push({ x: i, z: 4.6, tex: 'stone' });
  // a spawner pit, an oak tree and a chest in the middle distance
  c.push({ x: 8, z: 9.0, tex: 'spawner' });
  c.push({ x: 8, z: 9.0, y: 1, tex: 'cobblestone' });
  for (let y = 0; y < 3; y++) c.push({ x: -7, z: 16, y: y, tex: LOG });
  for (let dx = -1; dx <= 1; dx++) for (let dz = -1; dz <= 1; dz++) c.push({ x: -7 + dx, z: 16 + dz, y: 3, tex: 'oak_leaves' });
  c.push({ x: 4, z: 19, tex: { top: 'oak_planks', side: 'chest' } });
  return c;
};

G.goldFarm = function () {
  const c = [];
  for (const z of [6, 8.5, 11]) for (let i = -6; i <= 6; i += 2) c.push({ x: i, z: z, tex: PK });
  for (let i = -7; i <= -5; i++) c.push({ x: i, z: 5.2, tex: 'cobblestone' });
  for (let y = 0; y < 3; y++) c.push({ x: 7, z: 15, y: y, tex: LOG });
  for (let dx = -1; dx <= 1; dx++) for (let dz = -1; dz <= 1; dz++) c.push({ x: 7 + dx, z: 15 + dz, y: 3, tex: 'oak_leaves' });
  // §B4's real test: ONE pumpkin NEARER than the bot (z 2.9 against the bot's 3.4), placed
  // so its left edge lands at screen x ~862 and it cuts across the bot's trailing side
  // from y 953 down. If the painter's sort is wrong the bot stands in front of it and the
  // mistake is unmissable; if it is right the bot's rear leg and rear arm disappear behind
  // an orange block. Measured off the render, not estimated: at x 0.76 it started at 745
  // and swallowed 80 % of the figure. It sits well right of the sign, so no sign text is
  // covered.
  c.push({ x: 1.08, z: 2.9, tex: PK });
  return c;
};

G.pauseMenu = function (ctx) {
  // §4.4's sizes are SILKSCREEN sizes; B1 makes the interface face Press Start 2P, which
  // is 1.31x wider per character, so every one of them goes through MC.pss().
  MC.screenTitle(ctx, 'Spiel pausiert', 420, { size: MC.pss(48) });
  const labels = ['Zurück zum Spiel', 'Statistiken', 'Vom Server trennen'];
  for (let i = 0; i < 3; i++) {
    MC.button(ctx, 230, 560 + i * 104, 620, 84, labels[i], { size: MC.pss(36) });
  }
};

G.label = function (ctx, s) {
  ctx.save(); ctx.fillStyle = 'rgba(0,0,0,0.72)'; ctx.fillRect(0, 1868, 1080, 52); ctx.restore();
  MC.text(ctx, s, 24, 1902, MC.tx(30, { color: MC.C.WEISS, align: 'left' }));
};

/* ---------------------------------------------------------------------------------- */

SCENES.__demo = {
  draw(ctx, lt, t) {
    const k = G.tick(t), page = k.page, ft = k.ft;

    // APPENDIX B5 is a per-frame flag, like MC.hudMode: MC.hud() clears it at the end of
    // every frame, so a page that wants the arm hidden must set it again on every frame —
    // and must set it BEFORE its MC.arm call (unlike MC.hudMode, which the overlay reads
    // after the scene has finished). Cleared here as well so no page can inherit it.
    MC.armHidden = false;

    if (page === 0) G.page0(ctx, ft);
    else if (page === 1) G.page1(ctx, ft);
    else if (page === 2) G.page2(ctx, ft);
    else if (page === 3) G.page3(ctx, ft);
    else if (page === 4) G.page4(ctx, ft);
    else if (page === 5) G.page5(ctx, ft, t);
    else if (page === 8) G.page7(ctx, ft);
    else G.page6(ctx, ft, page === 7 ? 'gold' : 'tag');

    G.label(ctx, G.PAGES[page].name);
  },
};

/* ============================================================ PAGE 0 · the cover frame
   The single most important still in the project. It must read, at thumbnail scale, as
   GREY VANILLA MINECRAFT MENU CHROME OVER A GAME WORLD — not as "a dark Minecraft scene".
   Order: world -> blocks -> world-space extras -> arm -> DIM 0.55 -> GUI -> (HUD by TL). */
G.page0 = function (ctx, ft) {
  const view = { t: ft, phase: 'nacht', camX: 0, bob: 0 };

  // §S1 puts the moon at (770, 400); APPENDIX B2 moves it to (872, 262) because
  // `Spiel pausiert` is centred at y 420 and the 78 px moon landed on its last letter.
  MC.world(ctx, ft, Object.assign(view, {
    strip: (z) => (z > 4.0 && z < 8.4) ? 'farmland' : 'grass_top',
    moonX: 872, moonY: 262,
  }));
  // The two torches stand at z 4.0 - behind the near pumpkin row at z 3 and in front of
  // the row at z 5 - so they go into MC.blocks' painter's sort as ENTITY CELLS. Drawn
  // before or after the field they would be wrong against one of the two rows.
  const cells0 = G.farm();
  cells0.push({ z: 4.0, draw: (c, _, v) => MC.torch(c, -1.25, 4.0, Object.assign({}, v, { seed: 1 })) });
  cells0.push({ z: 4.0, draw: (c, _, v) => MC.torch(c, 1.35, 4.0, Object.assign({}, v, { seed: 2 })) });
  MC.blocks(ctx, cells0, view);
  MC.withView(ctx, view, c => {
    // §S1 0.00-0.25: a pumpkin at z = 5 finishes breaking behind the dim. First event
    // inside the first eight frames — the no-dead-frame contract starts at frame 0.
    const f = MC.blockFace({ x: 0, z: 5 }, view);
    MC.particles(c, f.cx, f.cy, ft, -0.08, 'pumpkin', { s: f.s });
  });
  MC.arm(ctx, ft, { swing: 0, bob: 1, phase: 'nacht' });

  MC.dim(ctx, 0.55);
  G.pauseMenu(ctx);

  // the HUD lives behind the open screen, and the pointer sits above everything
  MC.hudMode = 2;
  MC.hotbarItems = [
    { slot: 0, item: 'pumpkin', count: 41 },
    { slot: 1, item: 'sea_pickle', count: 12 },
    { slot: 2, item: 'emerald', count: 3 },
  ];
  MC.hotbarSel = 0;
  MC.xp = { level: 27, p: 0.31 };
  MC.chatLines = [{ text: '[19:04] <Timo> bin weg, bis morgen', color: MC.C.WEISS }];
  MC.cursorState = { x: 830, y: 1120, trailStep: [26, 18] };
};

/* ============================================================ PAGE 1 · the 3.000 cut
   Identical camera to page 0, in full daylight, first person, full HUD, arm.
   ft is 3.133, not 3.000: MC.armSwing is sin(PI * frac((t - swingT0) * swingHz)), so at
   t 3.000 with swingHz 2 the phase is exactly 0 and the arm this page exists to show sits
   at dead rest. 3.133 puts it at sin(0.266 PI) = 0.72 of a full chop. */
G.page1 = function (ctx, ft) {
  const view = { t: ft, phase: 'tag', camX: 0, bob: 0 };

  MC.world(ctx, ft, Object.assign(view, {
    strip: (z) => (z > 4.0 && z < 8.4) ? 'farmland' : 'grass_top',
  }));
  const cells = G.farm();
  // one pumpkin mid-break on the near row, so the frame is never dead
  const st = MC.breakStage(ft, 2.75, 0.5);
  for (const c of cells) if (c.x === -2 && c.z === 5) c.crack = st;
  cells.push({ z: 4.0, draw: (c, _, v) => MC.torch(c, -1.25, 4.0, Object.assign({}, v, { seed: 1 })) });
  cells.push({ z: 4.0, draw: (c, _, v) => MC.torch(c, 1.35, 4.0, Object.assign({}, v, { seed: 2 })) });
  MC.blocks(ctx, cells, view);
  MC.withView(ctx, view, c => {
    const f = MC.blockFace({ x: 2, z: 5 }, view);
    MC.particles(c, f.cx, f.cy, ft, 2.82, 'pumpkin', { s: f.s });
  });
  MC.arm(ctx, ft, { swing: 1, swingHz: 2, bob: 1 });

  MC.hudMode = 1;
  MC.hotbarItems = [
    { slot: 0, item: 'pumpkin', count: 41 },
    { slot: 1, item: 'sea_pickle', count: 12 },
    { slot: 2, item: 'emerald', count: 3 },
  ];
  MC.hotbarSel = 0;
  MC.xp = { level: 27, p: 0.34 };
  MC.chatLines = [
    { text: '[19:04] <Timo> bin weg, bis morgen', color: MC.C.WEISS },
    { text: 'Timo hat das Spiel verlassen', color: MC.C.GELB },
    { text: 'HugoAFK hat das Spiel betreten', color: MC.C.GELB },
  ];
};

/* ============================================================ PAGE 2 · mid-pan
   §S4's principal camera move, halfway through: camX +4.5 blocks, head-bob on, blocks
   well off centre on both sides, a toast mid-slide and three chat lines. */
G.page2 = function (ctx, ft) {
  const camX = 9.0 * E.inOutCubic(remap(ft, 9.0, 11.6));
  const view = { t: ft, phase: 'tag', camX: camX, bob: 1 };

  MC.world(ctx, ft, Object.assign(view, {
    strip: (z) => (z > 4.0 && z < 8.4) ? 'farmland' : (z > 11 && z < 15) ? 'water' : 'grass_top',
  }));
  // The field the pan sweeps across, laid out around the camera so that at camX 4.5 there
  // are blocks hard against BOTH frame edges as well as in the middle — that is the whole
  // point of this page. At z 6.2 one block is 171 px, so |i + 0.5| > 1.75 puts a station
  // past the 300 px mark where MC.blocks starts drawing its side face.
  const cells = [];
  for (const z of [3.4, 5.4, 7.4]) for (let i = -6; i <= 6; i += 2) cells.push({ x: camX + i, z: z, tex: PK });
  for (let i = 2; i <= 4; i++) for (let y = 0; y < 2; y++) cells.push({ x: camX + i, z: 6.2, y: y, tex: 'cobblestone' });
  for (let i = -5; i <= -3; i++) cells.push({ x: camX + i, z: 6.2, tex: 'stone' });
  for (const z of [10.5, 14]) for (let i = -8; i <= 8; i += 2) cells.push({ x: camX + i, z: z, tex: PK });
  cells.push({ x: camX + 6, z: 11.5, tex: 'spawner' });
  for (let y = 0; y < 3; y++) cells.push({ x: camX - 7, z: 17, y: y, tex: LOG });
  for (let dx = -1; dx <= 1; dx++) for (let dz = -1; dz <= 1; dz++) cells.push({ x: camX - 7 + dx, z: 17 + dz, y: 3, tex: 'oak_leaves' });
  const st = MC.breakStage(ft, 10.05, 0.5);
  for (const c of cells) if (c.x === camX + 0 && c.z === 5.4) c.crack = st;
  cells.push({ z: 4.0, draw: (c, _, v) => MC.torch(c, camX - 1.2, 4.0, Object.assign({}, v, { seed: 1 })) });
  cells.push({ z: 4.0, draw: (c, _, v) => MC.torch(c, camX + 1.4, 4.0, Object.assign({}, v, { seed: 2 })) });
  MC.blocks(ctx, cells, view);
  MC.withView(ctx, view, c => {
    const f = MC.blockFace({ x: camX - 2, z: 5.4 }, view);
    MC.particles(c, f.cx, f.cy, ft, 10.12, 'pumpkin', { s: f.s });
  });
  MC.arm(ctx, ft, { swing: 1, swingHz: 2, bob: 1 });

  // §S4: three toasts slide in on 8.50 / 9.50 / 10.50 and stack at y 320 / 480 / 640.
  MC.toast(ctx, ft, { t0: 9.50, slot: 0, name: 'Pumpkin · 24/7', icon: 'pumpkin', hold: 1.4 });
  MC.toast(ctx, ft, { t0: 10.22, slot: 1, name: 'Spawner-Loot · 24/7', icon: 'spawner', hold: 1.4 });

  MC.hudMode = 1;
  MC.hotbarItems = [
    { slot: 0, item: 'sea_pickle', count: 18 },
    { slot: 1, item: 'pumpkin', count: 47 },
    { slot: 2, item: 'rotten_flesh', count: 9 },
    { slot: 3, item: 'bone', count: 4, flash: 0.85 },
  ];
  MC.hotbarSel = 1;
  MC.xp = { level: 27, p: 0.44 };
  MC.chatLines = [
    { text: '[HugoAFK] Sea Pickle geerntet', color: MC.C.GRAU },
    { text: '[HugoAFK] Pumpkin geerntet', color: MC.C.GRAU },
    { text: '[HugoAFK] Spawner geleert', color: MC.C.GRAU },
  ];
  // §S4's `24/7`. §4.4 quotes this one string in Press Start 2P at size 30 ALREADY, so it
  // is the one interface size in the film that must NOT go through MC.pss() — it is not a
  // Silkscreen measurement. APPENDIX B3 moves it from §S4's y 1730 (which is inside the
  // heart row, icons y 1694..1730) to y 1664.
  MC.text(ctx, '24/7', MC.hotbarSlotCX(3), 1664, MC.ui(30, { color: MC.C.GELB, align: 'center' }));
};

/* ============================================================ PAGE 3 · the F5 shot
   Golden hour, F5 side-on profile, §6.2's 25.00–26.00 walk toward the oak sign.

   STAGING, and it is a rule every scene author has to plan around: MC.player's face is on
   ONE side of the head and the projection decides whether you can see it. facing 'left'
   shows the face only while the bot stands RIGHT of x 540; facing 'right' only while it
   stands LEFT of it. The old gate stood the bot at wx 0.86 (screen x ~808) facing right,
   which is the back of the skull — the one F5 page in the gate never showed a face, and
   the bot had its back to the sign it was standing beside. It now faces 'left', i.e. into
   the frame, toward the sign it is walking to. */
G.page3 = function (ctx, ft) {
  const view = { t: ft, phase: 'gold', camX: 0, bob: 0 };

  MC.world(ctx, ft, Object.assign(view, { sunY: 0, sunX: 40 }));
  const gold = G.goldFarm();
  gold.push({ z: 6.0, draw: (c, _, v) => MC.torch(c, -3.4, 6.0, Object.assign({}, v, { seed: 3 })) });
  gold.push({
    z: 3.4, draw: c => MC.player(c, 0.86, 3.4, Object.assign({}, view, {
      name: 'HugoAFK', facing: 'left', walk: 1, swing: 0, bob: 0.010, stepRate: 4.4,
    })),
  });
  gold.push({
    z: 3.07, draw: c => {
      // planted: the post feet sit exactly on the ground plane at the sign's own depth
      const q = MC.proj(-0.34, 0, 3.07, MC.camX(view));
      MC.sign(c, Math.round(q[0] - 280), Math.round(q[1] - 460), {
        w: 560, h: 300, postH: 160, postGap: 260,
        lines: ['HugoAFK', 'startet', '20.09.2026', 'HugoAFK.com'],
        tint: 'rgba(255,168,74,0.10)',
      });
    },
  });
  MC.blocks(ctx, gold, view);

  MC.goldWash(ctx, MC.skyOf(view).gold);

  MC.hudMode = 1;
  MC.crosshair = false;                 // vanilla hides the crosshair in third person
  MC.hotbarItems = [
    { slot: 0, item: 'pumpkin', count: 64 },
    { slot: 1, item: 'sea_pickle', count: 31 },
    { slot: 2, item: 'emerald', count: 12 },
  ];
  MC.hotbarSel = 0;
  MC.xp = { level: 28, p: 0.72 };
  MC.f3On = true;
  MC.chatLines = [
    { text: '[HugoAFK] Wieder verbunden.', color: MC.C.GRUEN },
    { text: '[HugoAFK] Bis morgen.', color: MC.C.GRAU },
  ];
};

/* ============================================================ PAGE 4 · cross-check
   S5's inventory at (130, 420) against the F3 block at x 34..440 / y 123..429, with the
   HUD in mode 2 underneath. Two questions: does the overlay's F3 land on the panel, and
   does the FURNISHED panel (mc_gui's MC.inventory: preview box + portrait + armour column
   + offhand + crafting 2x2 + arrow + result) fill the top half instead of leaving a grey
   void? Hand-assembling this screen out of MC.panel and loose MC.slot calls — which is
   what this page used to do — is exactly the mistake §S5 exists to prevent. */
G.page4 = function (ctx, ft) {
  const view = { t: ft, phase: 'tag', camX: 4.5, bob: 0 };
  MC.world(ctx, ft, view);
  MC.blocks(ctx, G.farm(), view);
  // APPENDIX B5: vanilla does not draw the held item behind an open screen. The flag is
  // set BEFORE the call, and the call is left in on purpose — this page is the proof that
  // MC.armHidden actually makes MC.arm a no-op.
  MC.armHidden = true;
  MC.arm(ctx, ft, { swing: 0, bob: 1 });
  MC.dim(ctx, 0.55);

  const items = ['pumpkin', 'sea_pickle', 'rotten_flesh', 'bone', 'string', 'gunpowder', 'emerald'];
  MC.inventory(ctx, 130, 420, {
    t: ft,
    status: 'Voll',
    main: i => ({ item: items[i % 7], count: 1 + ((i * 13 + 5) % 63) }),
    craft: [{ item: 'pumpkin', count: 4 }, null, null, null],
    result: { item: 'emerald', count: 2 },
    off: { item: 'bone' },
  });
  MC.chatInput(ctx, { text: '/sell', p: 1, t: ft, suggest: ['/sell', '/sellall'], suggestIndex: 0 });

  MC.hudMode = 2;
  MC.hudChat = false;
  MC.f3On = true;
  MC.hotbarItems = [{ slot: 0, item: 'pumpkin', count: 64 }];
};

/* ============================================================ PAGE 5 · cross-check
   S7's control panel: does the console box sit across the horizon cleanly, and does the
   dimmed HUD collide with the two thumb buttons at y 1230?
   Copy is in normal German sentence case (B1). §S7 writes these two strings in caps only
   because Silkscreen had no lowercase; nothing here is upper-cased in code. */
G.page5 = function (ctx, ft, t) {
  const view = { t: ft, phase: 'tag', camX: 9.0, bob: 0 };
  MC.world(ctx, ft, view);
  MC.blocks(ctx, G.farm(), view);
  MC.armHidden = true;                                   // APPENDIX B5, as on page 4
  MC.arm(ctx, ft, { swing: 0, bob: 1 });
  MC.dim(ctx, 0.55);

  MC.screenTitle(ctx, 'Von deinem Handy', 340, { size: MC.pss(44), align: 'left', x: 110 });
  MC.console(ctx, 110, 400, 790, 600, [
    '[System] Bot online', '[Chat] <Timo> läuft alles?', '[System] Inventar voll',
    '/sell', '[System] Inventar verkauft', '[System] Sea Pickle geerntet',
    '[System] Bot gestoppt.',
  ], ft);
  MC.statRow(ctx, 130, 1060, 740, { label: 'Status', value: 'Offline', valueColor: MC.C.GRAU });
  MC.statRow(ctx, 130, 1105, 740, { label: 'Sitzung', value: MC.sessionClock(ft) });
  MC.statRow(ctx, 130, 1150, 740, { label: 'Farm', value: 'Pumpkin' });
  MC.button(ctx, 110, 1230, 380, 110, 'Live-Konsole', { size: MC.pss(34), outline: true });
  MC.button(ctx, 510, 1230, 380, 110, 'Bot stoppen', { size: MC.pss(34), fill: MC.C.HUGO_ROT, outline: true });

  MC.hudMode = 2;
  MC.hudChat = false;
  MC.ripples = [{ x: 700, y: 1285, t0: t - 0.16 }];   // MC.hud is handed the TIMELINE clock
  MC.hotbarItems = [{ slot: 0, item: 'pumpkin', count: 64 }];
};

/* ============================================================ PAGE 6/7 · the Q2 test
   Bare ground, nothing on it. DIRECTION.md §10.5 question 2 is "does the ground read as
   distance, or as horizontal bands?", and blocks standing on it hide the answer. */
G.page6 = function (ctx, ft, phase) {
  const view = { t: ft, phase: phase, camX: 0, bob: 0 };
  MC.world(ctx, ft, view);
  if (phase === 'gold') MC.goldWash(ctx, 1);
  MC.hudMode = 0;
};

/* ============================================================ PAGE 8 · the arm options
   MC.arm was rebuilt at the gate and reshaped again at the re-gate, so its three moving
   options get looked at: the mining swing, a held block, and the `drop` slide S6 uses at
   14.50 to take the arm out of frame. G.page7 is the eighth page; the name is a hangover
   from the page table, not a typo.
   ft is 9.3125, not 9.250: with swingHz 4 and swingT0 9.0, t 9.250 gives frac(1.0) = 0 and
   the arm is at dead rest — the page meant to show the swing was showing the rest pose. */
G.page7 = function (ctx, ft) {
  const view = { t: ft, phase: 'tag', camX: 0, bob: 0 };
  MC.world(ctx, ft, view);
  MC.blocks(ctx, G.farm(), view);
  // a half-dropped ghost first, so the S6 exit path is visible in the same still
  MC.arm(ctx, ft, { swing: 0, bob: 1, drop: 0.55, alpha: 0.35 });
  MC.arm(ctx, ft, { swing: 1, swingHz: 4, swingT0: 9.0, bob: 1, held: { top: 'pumpkin_top', side: 'pumpkin_side' } });
  MC.hudMode = 1;
  MC.hotbarItems = [{ slot: 0, item: 'pumpkin', count: 41 }];
};
