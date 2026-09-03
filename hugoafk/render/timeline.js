// Timeline: scene order, cut times and engine-level transition FX (120 BPM, beat 0.5 s).
const TL = {
  bpm: 120, scenes: [], transitions: [],
  add(id, start, end, extra) { const s = Object.assign({ id, start, end, draw: (ctx, lt, t, dur, sc) => SCENES[id].draw(ctx, lt, t, dur, sc) }, extra || {}); this.scenes.push(s); return s; },
  sceneAt(t) { for (let i = this.scenes.length - 1; i >= 0; i--) { const s = this.scenes[i]; if (t >= s.start && t < s.end) return s; } return t < 0 ? this.scenes[0] : this.scenes[this.scenes.length - 1]; },
  init() {},
  fx(t, fx) {
    // scanlines only in the screen-heavy scenes (console / inventory / build)
    if ((t >= 12 && t < 15) || (t >= 17.5 && t < 20.5) || (t >= 23.5 && t < 26.35)) fx.scan = Math.max(fx.scan, 0.035);
    if (t >= 20.5 && t < 23.5) { fx.vignette = 0.4; fx.grain = 0.025; }          // calm trust beat
    if (t >= 23.5 && t < 26.35) fx.grain = lerp(0.035, 0.06, remap(t, 23.5, 26.2));
    if (t >= 26.35 && t < 26.5) { fx.grain = 0; fx.vignette = 0; fx.scan = 0; }  // hard black hold
  },
};
TL.add('s01', 0.0, 3.0);     // Hook: PC aus, Farm läuft weiter
TL.add('s02', 3.0, 6.0);     // Logo-Reveal
TL.add('s03', 6.0, 9.0);     // Cloud
TL.add('s04', 9.0, 12.0);    // 24/7 an der Farm
TL.add('s05', 12.0, 15.0);   // Sell-Makro
TL.add('s06', 15.0, 17.5);   // World-Reset
TL.add('s07', 17.5, 20.5);   // Steuerung vom Handy
TL.add('s08', 20.5, 23.5);   // Erlaubt & empfohlen
TL.add('s09', 23.5, 26.5);   // Build / Countdown
TL.add('s10', 26.5, 30.0);   // Endkarte
TL.transitions.push(
  { at: 0.0, type: 'fade', dur: 0.3 },                                                        // fade from black
  { at: 3.0, type: ['flash', 'punch', 'shake'], amount: 0.9, punch: 0.10, shake: 12, decay: 8, color: '#FFFFFF' },
  { at: 6.0, type: ['punch', 'rgb'], punch: 0.05, amount: 10, dur: 0.14, shake: 3 },
  { at: 9.0, type: ['punch', 'rgb'], punch: 0.05, amount: 10, dur: 0.14, shake: 3 },
  { at: 12.0, type: ['stutter', 'glitch', 'punch'], pre: 0.2, amount: 0.6, punch: 0.05, post: 0.1, shake: 3 },
  { at: 15.0, type: ['glitch', 'punch', 'rgb'], amount: 0.7, punch: 0.05, post: 0.15, shake: 4 },
  { at: 17.5, type: ['punch', 'rgb'], punch: 0.05, amount: 10, dur: 0.14, shake: 3 },
  { at: 20.5, type: 'xfade', dur: 0.3 },                                                      // into the calm trust beat
  { at: 23.5, type: ['punch', 'rgb'], punch: 0.06, amount: 8, dur: 0.14, shake: 4 },
  { at: 26.5, type: ['flash', 'punch', 'shake'], amount: 1.0, punch: 0.08, pre: 0, shake: 14, decay: 7, color: '#FFFFFF' },
);
