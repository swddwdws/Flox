/* ===================================================================================
   DIE SCHICHT — shared kit, part 1 of 4: namespace, palette, type.
   Loaded before mc_world.js, mc_gui.js, mc_hud.js and every scene file.

   Why this file exists: more than half the film is the same six objects redrawn in ten
   scene files. If each scene rolled its own drop shadow, panel and toast we would get ten
   slightly different ones, and the illusion "this is one game screen" dies on the first
   cut. Everything shared lives on the single global `MC`. Scene files may define their own
   helpers, but never a second version of anything already here.

   Rules that apply to every file that touches MC:
     - engine.js, and the post chain in tokens.js, are never edited.
     - Nothing on the escape list (DIRECTION.md §2) is ever called. In particular: no
       glow/glowText/dot/flare/shockwave/burst/Particles/Warp/lightSweep/crtCollapse, and
       ZERO ctx.filter calls in the whole film.
     - Every frame is a pure function of t. Build tables with rng(seed)/hash2 at module top
       level; never accumulate state between frames.
   =================================================================================== */
window.MC = window.MC || {};

/* ------------------------------------------------------------------ 1 · palette (§3)
   Documentation values for world blocks are NOT here on purpose — the world is drawn from
   tex.png and no scene ever fills a block with a flat colour. */
MC.C = {
  /* sky (§3.1) */
  NACHT_TOP: '#0A0F28', NACHT_HORIZONT: '#1B2450',
  TAG_TOP: '#79A6FF', TAG_HORIZONT: '#B9D2FF',
  GOLD_TOP: '#4E74C8', GOLD_HORIZONT: '#F3B453',
  GOLD_WASH: 'rgba(255,168,74,0.16)',
  WOLKE: '#FFFFFF', WOLKE_ABEND: '#E8DCC8', WOLKE_A: 0.86, WOLKE_KANTE: 'rgba(0,0,0,0.10)',
  SONNE: '#FFF3C4', SONNE_GOLD: '#FFE9A8', MOND: '#EDEDF2', STERN: 'rgba(255,255,255,0.55)',

  /* GUI chrome (§3.3) — the dominant surface for ~50 % of the film */
  PANEL: '#C6C6C6', BEVEL_HELL: '#FFFFFF', BEVEL_DUNKEL: '#555555', RAHMEN: '#1B1B1F',
  SLOT: '#8B8B8B', SLOT_OBEN: '#373737', SLOT_UNTEN: '#FFFFFF',
  BUTTON: '#6C6C6C', BUTTON_HELL: '#8B8B8B', BUTTON_KANTE_H: '#FFFFFF', BUTTON_KANTE_D: '#2E2E2E',
  GEIST: 'rgba(168,85,247,0.30)', GEIST_KANTE: '#A855F7',
  DIM: 'rgba(0,0,0,0.55)', DIM_BUCH: 'rgba(0,0,0,0.60)',
  TOAST_KORPUS: '#242430', TOAST_RAHMEN: '#0E0E14', TOAST_LICHT: '#4A4A5C',
  KONSOLE: 'rgba(0,0,0,0.62)', CHAT_BG: 'rgba(0,0,0,0.45)',
  FELD_BG: 'rgba(0,0,0,0.85)', FELD_KANTE: '#A0A0A0',
  LADEBALKEN_SPUR: '#2B2B2B', LADEBALKEN_FUELLUNG: '#57A64E',

  /* text — Minecraft's own §-codes and nothing else (§3.4) */
  WEISS: '#FFFFFF', GRAU: '#AAAAAA', GELB: '#FFFF55', GRUEN: '#55FF55',
  ROT: '#FF5555', GOLD: '#FFAA00', GUI_TITEL: '#404040',

  /* book, sign (§3.5) */
  PERGAMENT: '#DCC9A0', PERGAMENT_KANTE: '#8C7A56', PERGAMENT_FALZ: '#C4B08A',
  TINTE: '#3B2E1C', TINTE_GRUEN: '#3F7A2E', TINTE_MATT: '#6B5A3E',
  SCHILD_KANTE: '#3D2B17', SCHILD_TINTE: '#2B2013',

  /* brand, rationed hard (§3.5): violet only where the game itself carries it, red on
     exactly one object in the whole film (the BOT STOPPEN button at 18.5–19.4 s). */
  AFK_VIOLETT: '#A855F7', HUGO_ROT: '#FF2E2E',

  /* break particles: three fixed hexes per block type, sampled from the atlas */
  STAUB: {
    pumpkin: ['#D4771C', '#B0681B', '#6C4A1F'],
    sea_pickle: ['#6E8C2E', '#4C6620', '#33471A'],
    spawner: ['#5A6673', '#39424D', '#1E2228'],
    farmland: ['#7A5B3B', '#62422A', '#4A3220'],
  },
};

/* ------------------------------------------------------------------ 2 · geometry (§5, §10.2) */
MC.SAFE = { x0: 90, x1: 900, y0: 300, y1: 1420 };   // load-bearing content only
MC.YH = 700;              // horizon
MC.FOCAL = 1060;          // horizontal px per block at z = 1
MC.K = 1717;              // ground constant = FOCAL * eye height 1.62
MC.groundY = z => MC.YH + MC.K / z;
MC.blockPx = z => MC.FOCAL / z;
MC.screenX = (wx, z, camX) => 540 + (wx - (camX || 0)) * MC.FOCAL / z;

/* per-frame HUD flag, read by TL.overlay: 0 none · 1 full · 2 behind an open GUI */
MC.hudMode = 0;

/* ------------------------------------------------------------------ 2b · faces (§4, AMENDED)
   BUILD-GATE AMENDMENT. §4 named Silkscreen as the interface face. Rendered at size, the
   TTF turns out to be CAPS ONLY: "HugoAFK.com" comes out "HUGOAFK.COM" and "Spiel pausiert"
   comes out "SPIEL PAUSIERT". Minecraft's own font has lowercase, so an all-caps interface
   is exactly the kind of tell that breaks the illusion — and the product's own name is one
   of the strings it breaks.

   Of the three pixel faces on disk, Press Start 2P and VT323 both carry real lowercase.
   Press Start 2P is therefore the interface face and VT323 stays the running-text face;
   Silkscreen is out of the film.

   Metrics: Press Start 2P advances almost exactly 1.0 x fontsize per character, Silkscreen
   about 0.76. So a string set in Silkscreen at size S needs Press Start 2P at S / 1.31 to
   occupy the same width — every size in §4.4 divides by 1.31. MC.pss() does that for you.
   Both faces ship weight 400 ONLY: drawText defaults to 700, so every call must pass
   weight 400 or Chromium synthesises faux bold and the pixel grid turns to mush. */
MC.F = {
  ui: FONTS.pixel,      // Press Start 2P — titles, buttons, toasts, book, sign, GUI titles
  txt: FONTS.term,      // VT323 — chat, console, F3, MOTD, field labels
  w: 400,               // the ONLY weight either face has
};
MC.pss = s => Math.round(s / 1.31);     // a §4.4 Silkscreen size -> the same width in Press Start 2P
// ready-made option objects; spread and override
MC.ui = (size, o) => Object.assign({ size: size, family: MC.F.ui, weight: 400, color: MC.C.WEISS }, o || {});
MC.tx = (size, o) => Object.assign({ size: size, family: MC.F.txt, weight: 400, color: MC.C.WEISS }, o || {});

/* ------------------------------------------------------------------ 3 · type (§4)
   Every glyph in the film is drawn twice. The shadow is a flat, hard offset — never
   blurred, never softened, never randomised. That single property is what makes a line
   read as "the game said this" instead of "an agency set this".

   Three strings in the whole film are drawn WITHOUT it, because vanilla draws them flat:
   GUI panel titles, oak sign text, and book ink. Pass {shadow: false} for those. */
MC._dark = (c) => (typeof c === 'string' && c[0] === '#') ? shade(c, 0.25) : 'rgba(0,0,0,0.62)';
MC.shadowOffset = size => (size >= 88 ? 8 : size >= 62 ? 6 : 4);

MC.text = function (ctx, str, x, y, o) {
  o = o || {};
  const size = o.size || 44;
  if (o.shadow !== false) {
    const d = MC.shadowOffset(size);
    drawText(ctx, str, x + d, y + d, Object.assign({}, o, { color: MC._dark(o.color || MC.C.WEISS), glow: null, stroke: null }));
  }
  return drawText(ctx, str, x, y, o);
};

/* measure-and-shrink pass. §4.4's 34 px floor was set for Silkscreen; Press Start 2P is
   1.31x wider per character, so the equivalent floor is 26 px. Below that a string is a copy
   problem, not a layout problem, so it is reported loudly rather than silently shrunk. */
MC.fit = function (ctx, str, o, maxW, floor) {
  const f = floor || 26;
  let size = o.size;
  while (size > f && measureText(ctx, str, Object.assign({}, o, { size: size, tracking: (o.trackF || 0) * size })) > maxW) size -= 2;
  if (size <= f && measureText(ctx, str, Object.assign({}, o, { size: size })) > maxW) {
    if (!MC._warned) MC._warned = {};
    if (!MC._warned[str]) { MC._warned[str] = 1; console.warn('MC.fit: "' + str + '" does not fit ' + maxW + 'px at the ' + f + 'px floor'); }
  }
  return size;
};

/* ------------------------------------------------------------------ 4 · /title (§4.3)
   Vanilla /title fades in at a FIXED SCALE, holds, fades out. No scale ramp, no glow, no
   band, no RGB split — that restraint is what removes the last structural echo of the
   rejected film's headline gesture, and it is also simply what the game does.
     in  : alpha 0 -> 1 over 4 frames (0.133 s), linear
     out : alpha 1 -> 0 over 6 frames (0.200 s), linear */
MC.titleAlpha = function (t, t0, hold) {
  const IN = 4 / 30, OUT = 6 / 30;
  if (t < t0) return 0;
  if (t < t0 + IN) return (t - t0) / IN;
  if (t < t0 + IN + hold) return 1;
  if (t < t0 + IN + hold + OUT) return 1 - (t - t0 - IN - hold) / OUT;
  return 0;
};

// o: {t0, hold, title, sub, ty, sy, size, subSize, color, subColor, maxW}
MC.title = function (ctx, t, o) {
  const a = MC.titleAlpha(t, o.t0, o.hold);
  if (a <= 0.001) return 0;
  const maxW = o.maxW || 790;
  ctx.save(); ctx.globalAlpha *= a;
  if (o.title) {
    const opt = MC.ui(o.size || MC.pss(76), { color: o.color || MC.C.WEISS, align: 'center' });
    opt.size = MC.fit(ctx, o.title, opt, maxW);
    MC.text(ctx, o.title, 540, o.ty != null ? o.ty : 820, opt);
  }
  if (o.sub) {
    const opt = MC.ui(o.subSize || MC.pss(44), { color: o.subColor || MC.C.GRAU, align: 'center' });
    opt.size = MC.fit(ctx, o.sub, opt, maxW);
    MC.text(ctx, o.sub, 540, o.sy != null ? o.sy : (o.ty != null ? o.ty + 96 : 916), opt);
  }
  ctx.restore();
  return a;
};

/* ------------------------------------------------------------------ 5 · small shared bits */
// crisp, pixel-snapped rect — everything in a vanilla GUI is on integer pixels
MC.rect = function (ctx, x, y, w, h, fill) { ctx.fillStyle = fill; ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h)); };

// the vanilla raised bevel (panels, buttons): light top+left, dark bottom+right, 1 px frame
MC.bevel = function (ctx, x, y, w, h, o) {
  o = o || {};
  const t = o.width || 4, hi = o.light || MC.C.BEVEL_HELL, lo = o.dark || MC.C.BEVEL_DUNKEL;
  x = Math.round(x); y = Math.round(y); w = Math.round(w); h = Math.round(h);
  MC.rect(ctx, x, y, w, t, hi); MC.rect(ctx, x, y, t, h, hi);
  MC.rect(ctx, x, y + h - t, w, t, lo); MC.rect(ctx, x + w - t, y, t, h, lo);
  if (o.frame !== false) { ctx.strokeStyle = o.frameColor || MC.C.RAHMEN; ctx.lineWidth = 1; ctx.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1); }
};

// the vanilla INSET bevel (inventory slots): dark top+left, light bottom+right
MC.inset = function (ctx, x, y, w, h, o) {
  o = o || {};
  const t = o.width || 2, hi = o.light || MC.C.SLOT_UNTEN, lo = o.dark || MC.C.SLOT_OBEN;
  x = Math.round(x); y = Math.round(y); w = Math.round(w); h = Math.round(h);
  MC.rect(ctx, x, y, w, t, lo); MC.rect(ctx, x, y, t, h, lo);
  MC.rect(ctx, x, y + h - t, w, t, hi); MC.rect(ctx, x + w - t, y, t, h, hi);
};

// nearest-neighbour is mandatory before any pattern/atlas draw; ctx.save/restore resets it
MC.pixel = function (ctx, fn) { ctx.save(); ctx.imageSmoothingEnabled = false; try { fn(ctx); } finally { ctx.restore(); } };

// world dim behind an open GUI
MC.dim = function (ctx, a) { ctx.save(); ctx.fillStyle = 'rgba(0,0,0,1)'; ctx.globalAlpha = a; ctx.fillRect(0, 0, W, H); ctx.restore(); };

// 2-frame flat-black screen swap (transition device A). Returns true while the black holds.
MC.swap = function (ctx, t, at) { if (t >= at && t < at + 2 / 30) { ctx.fillStyle = '#000000'; ctx.fillRect(0, 0, W, H); return true; } return false; };
