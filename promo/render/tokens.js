// Design tokens from storyboard.json — single ember accent on warm near-black.
window.TOKENS = {
  bg: '#050507', primary: '#F5F2EC', secondary: '#8A8F9C', accent: '#FF8A3D', text: '#F5F2EC', muted: '#C9C6BF',
  chrome: [[0, '#F5F2EC'], [0.5, '#A9ADB5'], [1, '#F5F2EC']],
  // global post defaults (scenes/timeline may override per frame via FX)
  fx: { grain: 0.03, vignette: 0.6, scan: 0, bloom: 0.2, bloomBlur: 28 },
};
const BPM = 120, BEAT = 0.5, BAR = 2.0;
// headline tracking helper: -0.045em
const trackEm = (size, em) => size * em;
