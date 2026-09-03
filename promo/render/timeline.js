// Timeline: scene order, cut times and engine-level transition FX (from storyboard.json).
const TL = {
  bpm: 120, scenes: [], transitions: [],
  add(id, start, end, extra) { const s = Object.assign({ id, start, end, draw: (ctx, lt, t, dur, sc) => SCENES[id].draw(ctx, lt, t, dur, sc) }, extra || {}); this.scenes.push(s); return s; },
  sceneAt(t) { for (let i = this.scenes.length - 1; i >= 0; i--) { const s = this.scenes[i]; if (t >= s.start && t < s.end) return s; } return t < 0 ? this.scenes[0] : this.scenes[this.scenes.length - 1]; },
  init() {},
  // global per-frame post adjustments by time
  fx(t, fx) {
    const scan = (t >= 8 && t < 12) || (t >= 19 && t < 21.85) ? 0.04 : 0;
    fx.scan = Math.max(fx.scan, scan);
    if (t >= 12 && t < 14) fx.vignette = 0.42;
    if (t >= 16 && t < 19) { fx.vignette = 0.32; fx.grain = 0.02; }
    if (t >= 19 && t < 21.85) fx.grain = lerp(0.03, 0.06, remap(t, 19, 21.5));
    if (t >= 21.85 && t < 22) { fx.grain = 0; fx.vignette = 0; fx.bloom = 0.15; fx.scan = 0; }
  },
};
TL.add('s01', 0, 2);      // Herzschlag / Hallo.
TL.add('s02', 2, 5);      // Ich bin neu.
TL.add('s03', 5, 8);      // Ich denke tief.
TL.add('s04', 8, 10);     // Ich schreibe Code.
TL.add('s05', 10, 12);    // Ich handle.
TL.add('s06', 12, 14);    // Ich behalte den Überblick.
TL.add('s07', 14, 16);    // Ich lebe in Claude Code.
TL.add('s08', 16, 19);    // Ehrlich. Sorgfältig. Sicher.
TL.add('s09', 19, 22);    // Mythos-Klasse. (build)
TL.add('s10', 22, 26);    // Name reveal
TL.add('s11', 26, 30);    // End card
TL.transitions.push(
  { at: 0.0, type: 'fade', dur: 0.25 },                                            // fade from black (in only; d<0 side never happens)
  { at: 5.0, type: ['flash', 'punch'], amount: 0.35, color: '#F5F2EC', shake: 4 },  // hard cut into s03
  { at: 7.95, type: 'flash', amount: 0.95, color: '#F5F2EC' },                      // white flash hides the cut into s04
  { at: 8.0, type: 'punch', amount: 0.05, shake: 3 },
  { at: 10.0, type: ['stutter', 'glitch', 'punch'], pre: 0.25, amount: 0.7, post: 0.12, shake: 3 },
  { at: 12.0, type: ['punch', 'rgb'], amount: 0.06, dur: 0.12, shake: 3 },
  { at: 14.0, type: ['stutter', 'glitch', 'punch'], pre: 0.25, amount: 0.7, post: 0.12, shake: 3 },
  { at: 16.0, type: 'xfade', dur: 0.25 },
  { at: 22.0, type: ['flash', 'punch', 'shake'], amount: 1.0, color: '#F5F2EC', shake: 14, decay: 7 },
  { at: 26.0, type: 'xfade', dur: 0.4 },
);
