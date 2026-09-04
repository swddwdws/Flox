/* dev harness for mc_hud.js — the module author owns this file. NOT part of the film.
   Render it with:
     cd /home/user/Flox/hugoafk && export NODE_PATH=/opt/node22/lib/node_modules
     node tools/render.js --html dev_hud.html --out out/dev_hud \
       --times 0,0.3,0.6,1,1.3,1.75,2.2,2.7,3.03,3.1,3.25,3.4,3.85 --workers 4

   Four windows, over a plain mid-grey ground (the world is another author's module):
     0.0-1.0  cold start: chat filling with the real §8 lines, F3 drawing on line by line,
              three hotbar items, full hearts/hunger, the XP creep
     1.0-2.0  everything at once: 9 items + counts, half hearts and half shanks, a boxed
              F3 line, 10 chat lines + one fading out, safe-box guides; from 1.5 the chat
              is switched off and two contrast bands run across y 890..1030 so the
              'difference' crosshair can be judged on a light and on a dark ground
     2.0-3.0  hudMode 2: the pause-menu variant (chat on, as at frame 0 of the film) then
              the inventory variant (chat off)
     3.0-4.0  the motion signature: the cursor exit slide with its 3-ghost trail, both
              touch ripples, the finger-travel puck between them, and the return slide
*/
SCENES.__demo = {
  draw(ctx, lt, t) {
    const C = MC.C, G = MC.HUD_GEO;

    /* ---- plain mid-grey ground (dark enough that the difference crosshair reads) ---- */
    MC.rect(ctx, 0, 0, W, H, '#5A5A5A');

    /* ---- the real German chat from DIRECTION.md §8 ---- */
    const CH = [
      { text: '[19:04] <Timo> bin weg, bis morgen', color: C.WEISS },
      { text: '[HugoAFK] Schicht übernommen.', color: C.GRAU },
      { text: '[HugoAFK] Sea Pickle geerntet', color: C.GRAU },
      { text: '[HugoAFK] Pumpkin geerntet', color: C.GRAU },
      { text: '[HugoAFK] Spawner geleert', color: C.GRAU },
      { text: '[HugoAFK] Inventar voll.', color: C.ROT },
      { text: '[HugoAFK] Inventar verkauft.', color: C.GRUEN },
      { text: '[Server] World-Reset in 10 Sekunden.', color: C.ROT },
      { text: '[HugoAFK] Position 148 / 71 / -302', color: C.GRAU, box: C.GELB },
      { text: '[HugoAFK] Wieder verbunden.', color: C.GRUEN },
    ];
    const lines = CH.map((l, i) => Object.assign({ t0: i * 0.07, life: Infinity }, l));
    lines.push({ text: '[HugoAFK] Bis morgen.', color: C.GRAU, t0: 1.05, life: 0.35 });

    const label = s => MC.text(ctx, s, 40, 1902, {
      size: 26, family: FONTS.silk, weight: 700, color: C.GELB, align: 'left', baseline: 'alphabetic',
    });

    /* ================================================================ 0.0 - 1.0 */
    if (t < 1.0) {
      MC.hudMode = 1;
      MC.chatLines = lines;
      MC.hotbarSel = 0;
      MC.hotbarItems = [
        { slot: 0, item: 'sea_pickle', count: 6 + Math.floor(t * 6) },
        { slot: 1, item: 'pumpkin', count: 12 + Math.floor(t * 9) },
        { slot: 2, item: 'spawner', count: 3 },
      ];
      if (t >= 0.55) { MC.f3On = true; MC.f3Reveal = Math.floor((t - 0.55) * 30) + 1; }
      label('dev_hud 1/4 · Chat fuellt · F3 Zeile fuer Zeile');
      return;
    }

    /* ================================================================ 1.0 - 2.0 */
    if (t < 2.0) {
      MC.hudMode = 1;
      MC.chatLines = lines;
      if (t >= 1.5) {
        // second half: chat off and two contrast bands under the crosshair, so the
        // 'difference' composite can be judged on a light and on a dark ground
        MC.hudChat = false;
        MC.rect(ctx, 0, 890, W, 70, '#C6C6C6');
        MC.rect(ctx, 0, 960, W, 70, '#1E1E1E');
      }
      MC.hearts = 6.5; MC.hunger = 4.5;
      MC.xp = { level: 27, p: 0.62 };
      MC.hotbarSel = 3;
      const names = ['pumpkin', 'sea_pickle', 'rotten_flesh', 'bone', 'string', 'gunpowder', 'emerald', 'chest', 'spawner'];
      MC.hotbarItems = names.map((n, i) => ({
        slot: i, item: n, count: i === 0 ? 1 : (i * 7 + 2),
        flash: (i === 4 && t > 1.40 && t < 1.47) ? 1 : 0,
      }));
      MC.f3On = true;
      MC.f3Lines = [
        'HugoAFK 1.0 (Cloud)',
        { text: 'Dein PC: aus', color: C.GELB },
        'Sitzung: ' + MC.sessionClock(t),
        'Server: HugoSMP',
        { text: 'XYZ: 148.500 / 71.000 / -302.318', color: C.WEISS, box: C.GRUEN },
        'Block: 148 71 -302',
        'Facing: south (+Z)',
      ];
      // safe box x 90..900 / y 300..1420 — nothing load-bearing may leave it
      ctx.save();
      ctx.strokeStyle = '#00E5FF'; ctx.lineWidth = 2;
      ctx.strokeRect(MC.SAFE.x0, MC.SAFE.y0, MC.SAFE.x1 - MC.SAFE.x0, MC.SAFE.y1 - MC.SAFE.y0);
      ctx.restore();
      label('dev_hud 2/4 · voller HUD · Halbherzen · Safe-Box');
      return;
    }

    /* ================================================================ 2.0 - 3.0 */
    if (t < 3.0) {
      MC.dim(ctx, 0.55);
      MC.hudMode = 2;
      MC.chatLines = lines;
      MC.hearts = 3; MC.hunger = 1;
      MC.hotbarItems = [
        { slot: 0, item: 'pumpkin', count: 44 },
        { slot: 1, item: 'sea_pickle', count: 17 },
      ];
      MC.f3On = true;
      if (t < 2.5) {
        // the pause-menu variant: this is the film's frame 0 — chat visible behind the dim
        MC.text(ctx, 'Spiel pausiert', 540, 420, { size: 48, family: FONTS.silk, weight: 700, color: C.WEISS, align: 'center' });
        const labels = ['Zurück zum Spiel', 'Statistiken', 'Vom Server trennen'];
        for (let i = 0; i < 3; i++) {
          const by = 560 + i * 104;
          MC.rect(ctx, 230, by, 620, 84, C.BUTTON);
          MC.bevel(ctx, 230, by, 620, 84, { width: 2, light: C.BUTTON_KANTE_H, dark: C.BUTTON_KANTE_D });
          MC.text(ctx, labels[i], 540, by + 42, { size: 36, family: FONTS.silk, weight: 700, color: C.WEISS, align: 'center' });
        }
        MC.cursorState = { x: 700, y: 790 };
        label('dev_hud 3a/4 · hudMode 2 · Pausemenue · Chat an');
      } else {
        // the inventory variant: a full panel, so the chat is suppressed
        MC.hudChat = false;
        MC.rect(ctx, 130, 420, 770, 880, C.PANEL);
        MC.bevel(ctx, 130, 420, 770, 880, { width: 4 });
        MC.text(ctx, 'Inventar', 165, 462, { size: 34, family: FONTS.silk, weight: 700, color: C.GUI_TITEL, align: 'left', shadow: false });
        label('dev_hud 3b/4 · hudMode 2 · Panel · Chat aus');
      }
      return;
    }

    /* ================================================================ 3.0 - 4.0 */
    MC.hudMode = 1;
    MC.chatLines = lines;
    MC.hotbarItems = [{ slot: 0, item: 'pumpkin', count: 44 }];
    const exit = MC.cursorSlide(t, { t0: 3.00, dur: 4 / 30, from: [540, 810], to: MC.CURSOR_OFF });
    const back = MC.cursorSlide(t, { t0: 3.70, dur: 0.30, from: MC.CURSOR_OFF, to: [400, 920], ease: E.outCubic, hold: true });
    if (exit) MC.cursorState = exit;
    else if (back) MC.cursorState = back;
    MC.ripples = [{ x: 700, y: 1285, t0: 3.20 }, { x: 300, y: 1285, t0: 3.55 }];
    if (t >= 3.28 && t <= 3.53) MC.travelState = { x0: 700, y0: 1285, x1: 300, y1: 1285, p: (t - 3.28) / 0.25 };
    label('dev_hud 4/4 · Zeiger + Geisterspur · Ripples · Weg');
  },
};
