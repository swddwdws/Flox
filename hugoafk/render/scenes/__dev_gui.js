/* dev harness for mc_gui.js — the module author owns this file. NOT part of the film.
   Render it with:
     NODE_PATH=/opt/node22/lib/node_modules node tools/render.js --html dev_gui.html \
       --out out/dev_gui --times 0,0.25,0.5,0.75,1,1.25,1.5,1.75 --workers 4

   Eight pages, one every 0.25 s, looping — so t = 0..2 shows all eight at the real
   geometry of DIRECTION.md §5.3 with the real German copy of §8, and t = 2..4 shows the
   same eight again at a different animation phase.

     t 0.00  page 0  pause menu (S1) + every button state
     t 0.25  page 1  server list (S2) + the two disconnect buttons (S6)
     t 0.50  page 2  loading screen (S3) + statistics rows
     t 0.75  page 3  control panel (S7): console, stats, thumb buttons
     t 1.00  page 4  inventory (S5): the full MC.inventory furniture + chat input
     t 1.25  page 5  Vormerken form (S10): logo, fields, Fertig, footer
     t 1.50  page 6  the written book (S8); page 2 of the book from t = 2 on
     t 1.75  page 7  the oak sign (S9) + the three-toast stack (S4)

   Every string on these pages is set in the film's own copy, in normal German sentence
   case, in the APPENDIX B1 faces: MC.ui() = Press Start 2P for interface, MC.tx() = VT323
   for running text. FONTS.silk appears nowhere. Sizes taken from §4.4 go through MC.pss().
*/

SCENES.__demo = {
  draw(ctx, lt, t) {
    MC.hudMode = 0;
    const C = MC.C;
    const page = Math.floor(t / 0.25) % 8;
    const p0 = Math.floor(t / 0.25) * 0.25;          // this page's start time

    const sky = (top, hor, ground) => {
      linearFill(ctx, 0, 0, 0, 700, [[0, top], [1, hor]], [0, 0, W, 700]);
      MC.rect(ctx, 0, 700, W, H - 700, ground);
      for (let i = 0; i < 26; i++) MC.rect(ctx, 0, 700 + i * i * 2.6, W, 2, 'rgba(0,0,0,0.10)');
    };
    const night = () => sky(C.NACHT_TOP, C.NACHT_HORIZONT, '#2B2318');
    const day = () => sky(C.TAG_TOP, C.TAG_HORIZONT, '#4E7A2E');
    const tag = s => MC.text(ctx, s, 40, 62, MC.tx(28, { color: C.GRAU, align: 'left' }));

    /* ---------------------------------------------------------- 0 · pause menu */
    if (page === 0) {
      night(); MC.dim(ctx, 0.55);
      tag('page 0 · pause menu 620x84 @ x230 y560/664/768 · button states · PS2P 27');
      MC.screenTitle(ctx, 'Spiel pausiert', 420, { size: MC.pss(48) });
      MC.button(ctx, 230, 560, 620, 84, 'Zurück zum Spiel', {});
      MC.button(ctx, 230, 664, 620, 84, 'Statistiken', {});
      MC.button(ctx, 230, 768, 620, 84, 'Vom Server trennen', { state: (t % 0.25) < 0.125 ? 'hover' : 'pressed' });

      const strip = [
        ['normal', 'Live-Konsole', {}],
        ['hover (cursor)', 'Live-Konsole', { state: 'hover' }],
        ['ghost press (bot)', 'Bot starten', { state: 'ghost' }],
        ['outline only', 'Bot starten', { outline: true }],
        ['pressed', 'Live-Konsole', { state: 'pressed' }],
        ['disabled', 'Statistiken', { state: 'disabled' }],
        ['HUGO_ROT', 'Bot stoppen', { fill: C.HUGO_ROT }],
        ['red + ghost', 'Bot stoppen', { fill: C.HUGO_ROT, state: 'ghost' }],
      ];
      for (let i = 0; i < strip.length; i++) {
        const bx = 110 + (i % 2) * 400, by = 960 + Math.floor(i / 2) * 150;
        MC.button(ctx, bx, by, 380, 110, strip[i][1], Object.assign({ size: MC.pss(34) }, strip[i][2]));
        MC.text(ctx, strip[i][0], bx, by + 132, MC.tx(26, { color: C.GRAU, align: 'left' }));
      }
      MC.loadingBar(ctx, 230, 1560, 560, 28, (t * 0.7) % 1);
      MC.craftArrow(ctx, 830, 1560, 30, {});
      MC.field(ctx, 190, 1650, 700, 80, { label: 'Server', value: 'HugoSMP', t: t });
      // transition devices B and C, side by side
      const go = MC.guiOpen(t, p0 + 0.04), gc = MC.guiClose(t, p0 + 0.22);
      MC.panel(ctx, 130, 1780, 300, 120, { scale: go.scale, title: 'guiOpen' });
      MC.panel(ctx, 620, 1780, 300, 120, { scale: gc.scale, title: 'guiClose' });
      MC.text(ctx, 'dim ' + go.dim.toFixed(2) + ' / ' + gc.dim.toFixed(2), 470, 1760,
        MC.tx(26, { color: C.GRAU, align: 'center' }));
      return;
    }

    /* ---------------------------------------------------------- 1 · server list */
    if (page === 1) {
      MC.dirtBg(ctx, t);
      tag('page 1 · server list: rows 700x150 @ x190 y420/590/760 · disconnect buttons 700x84');
      MC.screenTitle(ctx, 'Server auswählen', 340, {});
      MC.serverRow(ctx, 190, 420, 700, 150, { name: 'Vanilla-Welt', motd: 'Kein Server ausgewählt', dim: true, ping: 0 });
      MC.serverRow(ctx, 190, 590, 700, 150, {
        name: 'HugoAFK', motd: 'AFK-Client für den HugoSMP', img: (typeof IMG !== 'undefined' ? IMG.logo : null),
        selected: true, ping: 5,
      });
      MC.serverRow(ctx, 190, 760, 700, 150, { name: 'Testwelt', motd: 'Offline', dim: true, ping: 0 });
      MC.button(ctx, 230, 1210, 620, 84, 'Server beitreten', { state: (t % 0.5) < 0.25 ? 'ghost' : 'normal', outline: true });
      MC.screenTitle(ctx, 'Verbindung verloren', 1360, {});
      MC.button(ctx, 190, 1440, 700, 84, 'Zurück zur Serverliste', {});
      MC.button(ctx, 190, 1550, 700, 84, 'Erneut verbinden', { state: 'ghost' });
      return;
    }

    /* ---------------------------------------------------------- 2 · loading screen */
    if (page === 2) {
      MC.dirtBg(ctx, t);
      tag('page 2 · loading: logo 520 @ y380 · bar 620x28 @ (230,900) · tips y990/1050 · stats');
      if (typeof IMG !== 'undefined' && IMG.logo) ctx.drawImage(IMG.logo, 280, 380, 520, 330);
      MC.screenTitle(ctx, 'Lade Welt…', 800, {});
      MC.loadingBar(ctx, 230, 900, 620, 28, ((t * 1.3) % 1));
      // tip line: "Tipp:" in §e, the rest in white, the pair centred as one measure
      const o1 = MC.tx(44, { align: 'left' });
      const a = 'Tipp: ', b = 'HugoAFK läuft in der Cloud.';
      const wa = measureText(ctx, a, o1), wb = measureText(ctx, b, o1), x0 = 540 - (wa + wb) / 2;
      MC.text(ctx, a, x0, 990, Object.assign({}, o1, { color: C.GELB }));
      MC.text(ctx, b, x0 + wa, 990, Object.assign({}, o1, { color: C.WEISS }));
      MC.text(ctx, 'Dein eigener PC darf aus sein.', 540, 1050, MC.tx(44, { color: C.GRAU, align: 'center' }));
      MC.text(ctx, 'HugoSMP · HugoAFK 1.0', 540, 1130, MC.tx(32, { color: C.GRAU, align: 'center' }));
      MC.statRow(ctx, 130, 1300, 700, { label: 'Status', value: 'Online', valueColor: C.GRUEN });
      MC.statRow(ctx, 130, 1360, 700, { label: 'Sitzung', value: '132:07:12' });
      MC.statRow(ctx, 130, 1420, 700, { label: 'Farm', value: 'Pumpkin' });
      return;
    }

    /* ---------------------------------------------------------- 3 · control panel */
    if (page === 3) {
      day(); MC.dim(ctx, 0.55);
      tag('page 3 · control panel: console x110..900 y400..1000 · stats 1040/1090/1140 · 380x110 @ y1230');
      MC.screenTitle(ctx, 'Von deinem Handy', 340, { align: 'left', x: 110 });
      const L = [
        '[System] Bot online', '[Chat] <Timo> läuft alles?', '[System] Inventar voll', '/sell',
        '[System] Inventar verkauft', '[System] Sea Pickle geerntet', '[System] Pumpkin geerntet',
        '[System] Spawner geleert', '[System] Inventar voll', '/sell', '[System] Inventar verkauft',
        '[System] Bot gestoppt.', '[System] Bot gestartet.',
      ].map((s, i) => ({ s: s, at: i * 0.06 }));
      MC.console(ctx, 110, 400, 790, 600, L, t);
      MC.statRow(ctx, 130, 1040, 640, { label: 'Status', value: 'Online', valueColor: C.GRUEN });
      MC.statRow(ctx, 130, 1090, 640, { label: 'Sitzung', value: '132:07:12' });
      MC.statRow(ctx, 130, 1140, 640, { label: 'Farm', value: 'Pumpkin' });
      MC.button(ctx, 110, 1230, 380, 110, 'Live-Konsole', { size: MC.pss(34) });
      MC.button(ctx, 510, 1230, 380, 110, 'Bot stoppen', { size: MC.pss(34), fill: C.HUGO_ROT });
      return;
    }

    /* ---------------------------------------------------------- 4 · inventory
       The whole S5 screen through MC.inventory: panel, title, status word, the player
       preview with the portrait in it, the armour column, the offhand slot, the crafting
       2x2 with its arrow and result slot, the 9x3 main grid and the hotbar row. */
    if (page === 4) {
      day(); MC.dim(ctx, 0.55);
      tag('page 4 · inventory 770x880 @ (130,420) · preview 260x340 · armour/offhand/craft · slots 72/6');
      const items = ['pumpkin', 'sea_pickle', 'rotten_flesh', 'bone', 'string', 'gunpowder', 'emerald'];
      const g = MC.inventory(ctx, 130, 420, {
        t: t, status: 'Voll',
        main: i => ({
          item: items[i % items.length], count: 8 + (i % 56),
          flash: (Math.floor(t * 30) % 27 === i) ? 1 : 0,
        }),
        hotbar: i => (i < 3 ? { item: items[i], count: 64, selected: i === 0 } : {}),
        craft: i => (i === 0 ? { item: 'pumpkin', count: 4 } : {}),
        result: { item: 'emerald' },
        off: { item: 'bone' },
      });
      MC.text(ctx, 'preview ' + g.preview.x + ',' + g.preview.y + ' · offhand ' + g.off.x + ',' + g.off.y
        + ' · result ' + g.result.x + ',' + g.result.y, 40, 104, MC.tx(26, { color: C.GRAU, align: 'left' }));
      MC.chatInput(ctx, { text: '/sell', t: t, suggest: ['/sell', '/sellall'], suggestIndex: 0 });
      return;
    }

    /* ---------------------------------------------------------- 5 · Vormerken form */
    if (page === 5) {
      MC.dirtBg(ctx, t);
      tag('page 5 · form: logo 420 @ y320 · fields 700x80 @ y730/880/1030 · Fertig 700x88 @ y1180');
      if (typeof IMG !== 'undefined' && IMG.logo) ctx.drawImage(IMG.logo, 330, 320, 420, 266);
      MC.screenTitle(ctx, 'Vormerken', 640, {});
      MC.field(ctx, 190, 730, 700, 80, { label: 'Server', value: 'HugoSMP', t: t });
      MC.field(ctx, 190, 880, 700, 80, {
        label: 'AFK-Client', value: 'HugoAFK.com', family: MC.F.ui, size: MC.pss(52),
        // first pass through the page: the finished string, so its width can be checked.
        // second pass: the same string typing itself in, so the caret can be checked.
        focused: true, caret: true, t: t, p: (Math.floor(t / 2) % 2 === 0) ? 1 : clamp((t - p0) * 5),
      });
      MC.field(ctx, 190, 1030, 700, 80, { label: 'Start', value: '20.09.2026', t: t, borderColor: (t % 1) > 0.5 ? C.GELB : null });
      MC.button(ctx, 190, 1180, 700, 88, 'Fertig', { state: 'hover' });
      MC.text(ctx, 'Bleib online. Auch offline.', 540, 1330, MC.ui(MC.pss(34), { color: C.GRAU, align: 'center' }));
      return;
    }

    /* ---------------------------------------------------------- 6 · the book */
    if (page === 6) {
      day(); MC.dim(ctx, 0.60);
      tag('page 6 · book 700x840 @ (190,400) · PS2P 31 ink, measure 615 (19 chars), no shadow');
      const sw = MC.pageSwap(ctx, t, p0 + 0.10, { x: 190, y: 400, w: 700, h: 840 });
      const two = (Math.floor(t / 2) % 2) === 1;
      const lines = (two || sw.page === 1) ? [
        { s: '— HugoSMP-Team' },
        { s: 'Schriftlich bestätigt.', size: MC.pss(32) },
        '', '', '',
        { s: 'Seite 2 von 2', size: MC.pss(24), color: C.TINTE_MATT },
      ] : [
        { s: 'Vom HugoSMP-Team' },
        { parts: [{ s: 'erlaubt', color: C.TINTE_GRUEN }, { s: ' und' }] },
        { s: 'empfohlen.' },
        '',
        { s: 'Kein Cheat.' },
        { s: 'Nur AFK.', p: clamp((t % 0.25) * 8) },
      ];
      MC.book(ctx, { x: 190 + sw.dx, y: 400, w: 700, h: 840, lines: lines });
      return;
    }

    /* ---------------------------------------------------------- 7 · sign + toasts */
    day();
    tag('page 7 · toasts 760x150 @ y320/480/640, right edge x900 · sign 560x300 @ (250,800)');
    MC.toast(ctx, t, { t0: p0 - 0.10, slot: 0, name: 'Sea Pickle · 24/7', icon: 'sea_pickle', hold: 999 });
    MC.toast(ctx, t, { t0: 0, slot: 1, name: 'Pumpkin · 24/7', icon: 'pumpkin', hold: 999 });
    MC.toast(ctx, t, { t0: 0, slot: 2, name: 'Spawner-Loot · 24/7', icon: 'spawner', hold: 999 });
    MC.sign(ctx, 250, 800, { lines: ['HugoAFK', 'startet', '20.09.2026', 'HugoAFK.com'] });
  },
};
