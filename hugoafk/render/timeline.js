// Timeline: scene order, cut times and engine-level transition FX (120 BPM, beat 0.5 s).
const TL = {
  bpm: 120, scenes: [], transitions: [],
  add(id, start, end, extra) { const s = Object.assign({ id, start, end, draw: (ctx, lt, t, dur, sc) => SCENES[id].draw(ctx, lt, t, dur, sc) }, extra || {}); this.scenes.push(s); return s; },
  sceneAt(t) { for (let i = this.scenes.length - 1; i >= 0; i--) { const s = this.scenes[i]; if (t >= s.start && t < s.end) return s; } return t < 0 ? this.scenes[0] : this.scenes[this.scenes.length - 1]; },
  init() {},
  fx(t, fx) {
    // scanlines only in the screen-heavy scenes (console / inventory / build)
    if ((t >= 12 && t < 15) || (t >= 17.5 && t < 20) || (t >= 23 && t < 25.85)) fx.scan = Math.max(fx.scan, 0.035);
    if (t >= 20 && t < 23) { fx.vignette = 0.4; fx.grain = 0.025; }          // calm trust beat
    if (t >= 23 && t < 25.85) fx.grain = lerp(0.035, 0.06, remap(t, 23, 25.7));
    if (t >= 25.85 && t < 26.0) { fx.grain = 0; fx.vignette = 0; fx.scan = 0; }  // hard black hold
  },
};
if (window.__DEMO) { TL.add('__demo', 0.0, 3.0); } else TL.add('s01', 0.0, 3.0);     // Hook: PC aus, Farm läuft weiter
TL.add('s02', 3.0, 6.0);     // Logo-Reveal
TL.add('s03', 6.0, 9.0);     // Cloud
TL.add('s04', 9.0, 12.0);    // 24/7 an der Farm
TL.add('s05', 12.0, 15.0);   // Sell-Makro
// bar-locked from here: the cuts land on 17 / 20 / 23 / 26 so the film breathes in
// 2 s bars at 120 BPM. Scenes keep their own time base via src (see ENGINE_API.md).
TL.add('s06', 15.0, 17.5);                          // full 2.5 s: the reset choreography needs it
TL.add('s07', 17.5, 20.0, { src: [17.5, 20.5] });   // 3.0 s of content in 2.5 s (it holds a lot)
TL.add('s08', 20.0, 23.0, { src: [20.5, 23.5] });
TL.add('s09', 23.0, 26.0, { src: [23.5, 26.5] });
TL.add('s10', 26.0, 30.0, { src: [26.5, 30.5] });   // end card holds half a second longer
TL.transitions.push(
  { at: -0.32, type: 'fade', dur: 0.3 },                                                      // fade from black (frame 0 already visible: TikTok thumbnail)
  { at: 3.0, type: ['flash', 'punch', 'shake'], amount: 0.45, pre: 0, punch: 0.10, shake: 12, decay: 8, color: '#FFFFFF' },
  { at: 6.0, type: ['punch', 'rgb'], punch: 0.05, amount: 10, dur: 0.14, shake: 3 },
  { at: 9.0, type: ['punch', 'rgb'], punch: 0.05, amount: 10, dur: 0.14, shake: 3 },
  { at: 12.0, type: ['stutter', 'glitch', 'punch'], pre: 0.2, amount: 0.6, punch: 0.05, post: 0.1, shake: 3 },
  { at: 15.0, type: ['glitch', 'punch', 'rgb'], amount: 0.7, punch: 0.05, post: 0.15, shake: 4 },
  { at: 17.5, type: ['punch', 'rgb'], punch: 0.05, amount: 10, dur: 0.14, shake: 3 },
  { at: 20.0, type: 'xfade', dur: 0.12 },                                                      // into the calm trust beat
  { at: 23.0, type: ['punch', 'rgb'], punch: 0.06, amount: 8, dur: 0.14, shake: 4 },
  { at: 26.0, type: ['flash', 'punch', 'shake'], amount: 1.0, punch: 0.08, pre: 0, shake: 14, decay: 7, color: '#FFFFFF' },
);
