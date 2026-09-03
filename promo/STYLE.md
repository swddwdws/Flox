# Scene contract — "Claude Fable 5.1 — Ich stelle mich vor"

Read `ENGINE_API.md` first. Then implement ONLY your assigned scene(s) in your assigned file under `render/scenes/`.
Never edit `engine.js`, `timeline.js`, `tokens.js`, `index.html`, other scene files or anything under `tools/`.
If you need a helper the engine lacks, write it at the top of YOUR scene file (prefix its name with your scene id, e.g. `s05_ringPath`, to avoid global collisions — all scene files share one global scope).

## Beat grid
BPM 120 → `BEAT = 0.5 s`, `BAR = 2.0 s` (globals). Land visual hits on beats. Absolute time `t` is the reference for everything in the storyboard; local time `lt = t - sceneStart`.

## Look (tokens.js — use `T()` / `TOKENS`)
- `bg #050507` warm near-black · `primary #F5F2EC` warm white (text + hot cores) · `accent #FF8A3D` ember (THE ONLY CHROMA: glows, sweeps, dots, thread, pill, cursor) · `secondary #8A8F9C` ONLY for non-text structure (wireframes, ticks, dot grids at 25–60 % alpha) · `TOKENS.chrome` = gradient stops for the name lockup (`chromeGradient(ctx, y, size, TOKENS.chrome)`).
- Never use any other hue. No cyan, no magenta, no blue. RGB-split artifacts from the engine are the only exception.
- Glows: accent at 10–35 % alpha, `ctx.filter blur(24–60px)` in `'lighter'`. Budget: max 4 blurred full-frame layers per frame. Particles ≤ 3000 per scene.
- The engine adds vignette, grain, scanlines (s04/s05/s09), bloom, and all cut transitions automatically. Do NOT draw full-frame vignettes/grain yourself.

## Typography (exact)
- Headline: `FONTS.body` = Inter, weight 800, tracking `-0.045 * size` px, color primary, centred at `CX`. Sizes/line breaks are fixed per scene (see your brief). Reveal = `drawKinetic(..., 'rise')` (or `drawLines` for two lines) with `stagger ≈ 0.5`, `ease: E.outExpo`; on the downbeat that lands the word add a scale punch `1.06 → 1.0` (`withCamera` around the text centre, `1 + 0.06 * impulse(t, beatTime, 14)`).
- Over a busy background put a legibility band behind headlines: `band(ctx, y, h, 0.6)`.
- Subline: `FONTS.head` = Space Grotesk, weight 500, 46–52 px, tracking `+0.02 * size`, color `rgba(T().primary, 0.8)` — never grey.
- Mono: `FONTS.mono` = JetBrains Mono, weight 500, 44 px, color `rgba(T().primary, 0.8)`, prompts/cursors in accent. `terminal()` helper exists.
- Name lockup (s10/s11): `FONTS.alt` = Syne, weight 800, chrome gradient fill; "5.1" in Inter 800 chrome with the period in accent.
- Safe area: all text inside x 90..990, y 220..1660. Headlines ≥ 112 px, sublines ≥ 44 px.

## Motion language
- Every element enters with motion (rise / slam / wipe / typewriter), never a plain fade unless the brief says so.
- Slam = scale `1.2–1.3 → 1.0` with `E.outExpo` over ~0.15 s plus `FX.rgb = Math.max(FX.rgb, 8 * (1 - p))` for the first 3 frames.
- Kick shake: only where the brief says; use `FX.shake = Math.max(FX.shake, amp * impulse(t, kickTime, 12))`.
- Camera moves are scene-local: wrap your drawing in `withCamera(ctx, {zoom, x, y, rot}, () => {...})`.
- Photosensitivity: no every-frame strobing; flashes ≥ 125 ms apart; only the engine does full-frame flashes (5.0, 7.95, 22.0).

## Engine-owned transitions (do not duplicate)
fade-in 0–0.25 · flash 35 % + punch at 5.0 · white flash 95 % at 7.95 (cut at 8.0) · freeze/rewind stutter 9.75–10.0 + glitch + punch at 10.0 · punch + rgb at 12.0 · stutter 13.75–14.0 + glitch + punch at 14.0 · crossfade 15.75–16.0 · flash 100 % + punch + shake at 22.0 · crossfade 25.6–26.0.
Your scene must look right at its first and last frame (the frame before a cut is visible!). Scenes that crossfade in may be drawn with `lt = 0` for up to 0.4 s before their start.

## Determinism & performance
Pure function of `t`. Instantiate `Particles` / `Warp` / random tables at module top level with fixed seeds. No `Math.random`, no `Date`. Aim for < 250 ms per frame render (check the render log: "rendered N frames in X s").

## Workflow for you
1. Implement your file. 2. Preview: `export NODE_PATH=$(npm root -g) && node tools/render.js --out out/prev_<id> --times <comma list of absolute seconds> --workers 2` then `python3 tools/sheet.py --frames out/prev_<id> --list <frame numbers = round(t*30)> --cols 4 --out out/prev_<id>/sheet.png --scale 0.28`. 3. LOOK at the sheet and at 2–3 single frames at full size (Read the PNGs). 4. Fix anything ugly, overflowing, unreadable or off-brief. Iterate at least twice. Check the very first and very last frame of your scene and a frame right on each beat.
Report back what you implemented, what deviates from the brief and why, and the render time per frame.
