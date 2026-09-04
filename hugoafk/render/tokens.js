// Design tokens — derived from the HugoAFK logo (red "HUGO" + violet "AFK" on near-black).
window.TOKENS = {
  bg: '#08060E',           // near-black with a violet tint
  primary: '#FF2E2E',      // HUGO red — energy, hits, headlines' accent
  deepRed: '#B81414',
  secondary: '#A855F7',    // AFK violet — bot / automation
  violetHot: '#C77DFF',
  deepViolet: '#5B21B6',
  accent: '#FF2E2E',       // engine helpers default to accent = brand red
  text: '#F4F1F8',
  muted: '#9C94AE',
  // functional signal colours — used sparingly, never as decoration
  ok: '#4ADE80',           // verified / online / success
  gold: '#FFD24A',         // coins, counts
  fx: { grain: 0.035, vignette: 0.55, scan: 0, bloom: 0.24, bloomBlur: 28 },
};
const BPM = 120, BEAT = 0.5, BAR = 2.0;
// TikTok-safe area: the app overlays the right rail and the bottom caption block.
const TT = { x0: 90, x1: 900, y0: 300, y1: 1420 };
