# Scene contract — HugoAFK Launch-Trailer (TikTok 9:16)

Read `ENGINE_API.md` first (engine + the HugoAFK voxel toolkit at the bottom), then `storyboard.json`.
Implement ONLY your assigned scene(s) in your assigned file under `render/scenes/`.
Never edit `engine.js`, `timeline.js`, `tokens.js`, `index.html`, other scene files or anything under `tools/`.
Helpers you need that the engine lacks: define them at the top of YOUR file, prefixed with your scene id (`s05_slotY`) — all scene files share one global scope.

## The product (facts only — never invent numbers, prices, user counts or benchmarks)
HugoAFK is a browser-based AFK client for the German Minecraft server **HugoSMP**. The bot runs in the cloud, so the player's own PC can be switched off. Features: 24/7 AFK at pickle/pumpkin farms and spawners; a sell macro that opens `/sell`, deposits the inventory and confirms when it is full; spawner loot emptied and sold automatically; world-reset detection that disconnects in time and reconnects at the same spot; a live console in the browser (chat, system messages, executed commands); session statistics; German dedicated IPs; control from phone, tablet or PC with a one-click stop.
Claim: **"Bleib online. Auch offline."** · Launch **20.09.2026** on **HugoAFK.com** · **"Vom HugoSMP-Team erlaubt & empfohlen."** (confirmed in writing by the client).
Never claim any affiliation with Mojang, Microsoft or Minecraft. No cheat vocabulary.

## Beat grid
120 BPM → `BEAT = 0.5 s`, `BAR = 2.0 s` (globals). Every hit lands on a beat. `t` = absolute seconds, `lt = t - sceneStart`.

## Look (tokens.js via `T()`)
- `bg #08060E` near-black · `primary #FF2E2E` HUGO red · `secondary #A855F7` AFK violet (`TOKENS.violetHot #C77DFF`) · `text #F4F1F8` · `muted #9C94AE`.
- Functional signals ONLY, small and rare: `TOKENS.ok #4ADE80` (verified / online / success) and `TOKENS.gold #FFD24A` (coins, counts). Grass/pumpkin greens and oranges are allowed **inside the voxel world** (they are the Minecraft world, not UI chrome) — but never for UI, text or glows.
- The engine adds vignette, grain, scanlines, bloom and all cut transitions. Do NOT draw full-frame vignette/grain yourself and do not duplicate engine transitions.

## Typography (exact)
- Headline: Inter (`FONTS.body`) weight 800, tracking `-0.04 * size`, colour `T().text`, centred on `CX`. Sizes per storyboard (96–150 px). Reveal with `drawKinetic(..., 'rise')` (stagger ≈ 0.5, `ease: E.outExpo`) or a slam (scale 1.2→1.0, `E.outExpo`, ~0.15 s, plus `FX.rgb = Math.max(FX.rgb, 8*(1-p))` for the first 3 frames).
- Subline: Space Grotesk (`FONTS.head`) weight 500, 42–52 px, tracking `+0.02*size`, `rgba(T().text, 0.85)`.
- Console/chat: `FONTS.term` (VT323) 36–44 px. Pixel labels: `FONTS.silk` 700 (compact) or `FONTS.pixel` (Press Start 2P) for ≤ 8 characters. Numbers/counters: `FONTS.mono` 600.
- Over busy voxel backgrounds put a legibility band behind headlines: `band(ctx, y, h, 0.6)`.
- **TikTok safe area: x 90..900, y 300..1420.** Nothing readable outside it. Verify the widest line with `measureText` — max 810 px.

## Motion language
Every element enters with motion (slam / rise / pop / typewriter), never a plain fade unless the brief says so. The frame must never be static for more than a few frames: voxels drift, items pop on 16ths, counters tick, the camera breathes (`withCamera`). Kick shake only where the brief asks: `FX.shake = Math.max(FX.shake, amp * impulse(t, kickTime, 12))`.

## Determinism & performance
Pure function of `t`: seeded tables and any `Particles`/`Warp` instances at module top level, no `Math.random`, no `Date`, no state carried between frames. Budget ≈ 250 ms/frame; a full-frame `ctx.filter = 'blur()'` costs ~30 ms per draw call — batch paths and cache static glows on an offscreen canvas.

## Workflow for you
1. Implement your file.
2. Preview: `cd /home/user/Flox/hugoafk && export NODE_PATH=$(npm root -g) && node tools/render.js --out out/prev_<id> --times <absolute seconds: first frame, every beat, key moments, last frame> --workers 2`
   then `python3 tools/sheet.py --frames out/prev_<id> --list <frame numbers = round(t*30)> --cols 4 --out out/prev_<id>/sheet.png --scale 0.28`.
3. LOOK at the sheet and at 2–3 single frames at full resolution (Read the PNGs). Fix overflowing/unreadable text, empty or static frames, wrong colours, anything that reads as a slideshow. Check the render log for `PAGE ERROR` / `CONSOLE` lines.
4. Iterate at least twice. Check the very first and very last frame of your scene and every beat frame.
Report what you implemented, deviations from the brief and why, and the render time per frame.


## Second pass: world quality (this is what the client asked for)
The voxel world must read as a real Minecraft scene, not as coloured cubes:
- Use the TEXTURED blocks (`tex:` on cube/cubeField, `blockIcon`, `texField`) everywhere in the
  world — grass blocks with the grass overhang, dirt sides, farmland with furrows, pumpkins with
  stem and ridges, oak logs and leaves, cobblestone paths, water, sand.
- Build terrain with DEPTH: several block layers (grass on dirt on stone), edges that step, a
  horizon, trees (log + leaf canopy), torches, fences or path blocks — not a single flat plate.
- Put a real PLAYER in the scene with `mcPlayer(...)` — that is the AFK player the product is
  about. Animate it (walk cycle, mining swing, held block) and let it stand ON a block.
- Keep the palette rule for UI/text; the world itself uses its natural Minecraft colours.
- Watch the frame budget: a textured face is one drawImage, so a few hundred blocks are fine, but
  do not exceed ~1200 visible blocks per frame.
