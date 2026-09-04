// Design tokens. DIE SCHICHT (v2) draws almost nothing from these — the film's colour lives in
// MC.C (render/scenes/mc_kit.js). What stays here: the two brand hexes (rationed hard, see
// DIRECTION.md §3.5), bg (only ever seen 2.00–3.00 s) and the near-zero post chain.
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
  fx: { grain: 0.014, vignette: 0.05, scan: 0, bloom: 0, bloomBlur: 0 },
};
const BPM = 120, BEAT = 0.5, BAR = 2.0;
// TikTok-safe area: the app overlays the right rail and the bottom caption block.
const TT = { x0: 90, x1: 900, y0: 300, y1: 1420 };
