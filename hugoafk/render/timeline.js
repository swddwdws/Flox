// Timeline — DIE SCHICHT (Vanilla-UI). See DIRECTION.md §7.
//
// The cuts of this film are the game's own screen changes, drawn by the scenes themselves.
// The engine's transition system is therefore EMPTY on purpose:
//   - no flash, rgb, glitch, punch, whip, xfade
//   - no `stutter` entry, which is what disables Engine.remapTime — without that, frames get
//     time-remapped and the film stops being a pure function of t
//   - no fade-from-black: frame 0 IS the cover frame (the pause menu over the night world)
const TL = {
  bpm: 120, scenes: [], transitions: [],
  add(id, start, end, extra) { const s = Object.assign({ id, start, end, draw: (ctx, lt, t, dur, sc) => SCENES[id].draw(ctx, lt, t, dur, sc) }, extra || {}); this.scenes.push(s); return s; },
  sceneAt(t) { for (let i = this.scenes.length - 1; i >= 0; i--) { const s = this.scenes[i]; if (t >= s.start && t < s.end) return s; } return t < 0 ? this.scenes[0] : this.scenes[this.scenes.length - 1]; },
  init() {},

  // The HUD is owned here, not by the scenes. Drawn once, by one function, in identical screen
  // coordinates, in every frame it appears — that is what makes "the world moves, the interface
  // does not" a guarantee instead of a convention. Scenes set MC.hudMode each frame:
  //   0 = no HUD (menus / screens) · 1 = full HUD · 2 = HUD behind an open GUI (dimmed)
  overlay(ctx, t) { if (typeof MC !== 'undefined' && MC.hud) MC.hud(ctx, t); },

  // Not a look — a build gate. §2's escape list is only real if it is enforced on every frame.
  fx(t, fx) {
    if (fx.bloom !== 0 || fx.flash !== 0 || fx.rgb !== 0 || fx.glitch !== 0 || fx.invert !== 0 || fx.whip !== 0 || fx.blur !== 0 || fx.zoom !== 1) {
      throw new Error('DIRECTION violation at t=' + t.toFixed(3) + ': ' + JSON.stringify({
        bloom: fx.bloom, flash: fx.flash, rgb: fx.rgb, glitch: fx.glitch, invert: fx.invert, whip: fx.whip, blur: fx.blur, zoom: fx.zoom,
      }));
    }
  },
};

// Scene windows — 4+2+2+3+3+3+3+3+3+4 = 30.000 s exactly, 15 bars at 120 BPM.
// No `src` remapping on any scene: every scene's local clock is the film's clock.
// render/dev_*.html set __DEMO to hand the whole 30 s to one module's dev scene.
if (window.__DEMO) { TL.add('__demo', 0.0, 30.0); } else {
TL.add('s01', 0.0, 4.0);    // Feierabend — der Spieler loggt aus
TL.add('s02', 4.0, 6.0);    // Der Server — Serverliste, Marke
TL.add('s03', 6.0, 8.0);    // Die Cloud — Ladescreen, Join
TL.add('s04', 8.0, 11.0);   // Die Schicht — 24/7 an der Farm, drei Toasts
TL.add('s05', 11.0, 14.0);  // Inventar voll — Panel, /sell
TL.add('s06', 14.0, 17.0);  // World-Reset — trennt sich, kommt zurück, gleiche Stelle
TL.add('s07', 17.0, 20.0);  // Vom Handy — Konsole, Statistiken, Stopp/Start
TL.add('s08', 20.0, 23.0);  // Das Buch — vom HugoSMP-Team erlaubt & empfohlen
TL.add('s09', 23.0, 26.0);  // Goldstunde — das Schild mit dem Datum
TL.add('s10', 26.0, 30.0);  // Vormerken — HugoAFK.com
}
