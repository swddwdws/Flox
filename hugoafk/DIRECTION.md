All source files verified. Here is the locked direction document.

---

# DIE SCHICHT — Vanilla-UI
### Locked direction document · HugoAFK.com launch film · 1080×1920 · 30.000 s · 900 frames · 30 fps

---

## 1 · NAME + STATEMENT

**DIE SCHICHT (Vanilla-UI)**

Thirty seconds of one uninterrupted Minecraft session, recorded from inside the client. A player quits his server at night, his mouse cursor visibly slides off the bottom-right edge of the frame and leaves with him — and for the next 24 seconds the menus, the chat, the inventory, the buttons and the screens keep operating themselves in broad daylight, with no pointer anywhere, until the cursor slides back in at 26.3 s to bookmark the launch. Nothing in this film is a motion-graphics composition: every frame is a game screen. The world is a real first-person Minecraft view with a sky, a horizon, clouds and a crosshair; the interface is vanilla grey chrome with vanilla bevels and vanilla drop shadows; the emphasis is delivered the way the game delivers it — an advancement toast slides in, a slot flashes, a chat line lands, a loading bar steps a notch, a page turns — and never by moving a lens. The information is not narrated over the game; it is spoken *by* the game, in the game's own objects: a server-list row for the brand, a join `/title` for the cloud, three advancement toasts for the harvest, the command-suggestion box under `/` for the sell macro, two identical coordinate lines for the world reset, thumb-reach buttons and touch ripples for the phone, a signed written book for the endorsement, and an oak sign standing in the field carrying the date and the address. One sentence describes the whole film: **the hands leave, the game keeps playing, the hands come back.**

---

## 2 · THE ESCAPE LIST

Self-audit checklist. Every item is a hard fail. Run it against your scene before you submit.

**Ground & world**
- [ ] No isometric voxel diorama floating in a void. **Every world shot shows sky, clouds and a horizon line.**
- [ ] No near-black background as the film's ground. The only black in 900 frames is 2.00–3.00 s (the quit) and the 2-frame screen swaps.
- [ ] No violet/magenta neon on near-black as the base palette.
- [ ] No violet or red used as a **glow, gradient, halo or light source** — anywhere, for any reason.
- [ ] Violet + red together never exceed **5 % of frame area**.

**Type**
- [ ] `FONTS.body` (Inter) appears **zero times** in the film. Same for Space Grotesk, Orbitron, Syne, Unbounded, JetBrains Mono.
- [ ] No centre-locked kinetic headline. `drawKinetic` modes `scale` / `track` / `slam` / `decode` / `flicker` / `blur` are forbidden. Only `type` and `wipe` are used, and only where specified.
- [ ] No `/title` scale-slam. Vanilla `/title` **fades in at a fixed scale** (see §4).
- [ ] No `band()` legibility bars behind headlines. The mandatory 4 px drop shadow does that job.
- [ ] No `glowText()`, no `o.glow` on any `drawText` call.

**Post FX**
- [ ] `FX.flash = 0` for all 900 frames.
- [ ] `FX.rgb = 0` for all 900 frames.
- [ ] `FX.glitch = 0` for all 900 frames.
- [ ] `FX.invert = 0`, `FX.whip = 0`, `FX.blur = 0` for all 900 frames.
- [ ] `FX.bloom` is **exactly 0**, not 0.03 — the engine gate is `> 0.01` and any positive value runs a full-frame blur every frame.
- [ ] `FX.zoom = 1` for all 900 frames. No camera push, drift, dolly or zoom punch.
- [ ] `FX.shake` is raised **exactly twice**, to 2 px for 3 frames, at 14.90 and 16.50.
- [ ] `TL.transitions` is empty. `TL.fx` is a no-op. No `stutter` entry anywhere (it drives `Engine.remapTime`).

**Banned primitives — grep your file for these names**
- [ ] `shockwave` `burst` `Warp` `Particles` `sphereCloud` `constellation` `tunnel` `floorGrid` `speedLines` `lightSweep` `flare` `dot` `glow` `crtCollapse` `phoneFrame` `chromeGradient` `pill` `rings` `brackets`

**Objects**
- [ ] No phone mockup. The phone is expressed as thumb-reach buttons + touch ripples + one Silkscreen header line. Nothing else.
- [ ] No shield, no badge, no seal, no tick. `SPRITES.check` is forbidden for the whole film. `TOKENS.ok #4ADE80` appears nowhere.
- [ ] No final centred logo lockup with the URL underneath. The film's last image is the world.
- [ ] No block cast shadows at golden hour (vanilla has none — only an entity blob shadow).
- [ ] No hand-rolled page-flip animation on the book (vanilla swaps pages instantly).

**Content**
- [ ] No invented numbers: no prices, no player counts, no fps, no ping in ms, no throughput totals, no benchmarks. The only numbers on screen are a live session clock, Minecraft stack counts, fictional world coordinates and the launch date.
- [ ] No claim of Mojang / Microsoft / Minecraft affiliation. The word "Cheat" appears only in the sentence that denies it.
- [ ] `HugoAFK.com` is never presented as a Minecraft server address (see S10).

---

## 3 · PALETTE

Every colour is a named token. Scene files declare them at the top of the shared kit (`MC.C`), never inline.

### 3.1 Sky (the film's only "colour design")

| Token | Hex | Role |
|---|---|---|
| `NACHT_TOP` | `#0A0F28` | night sky, top of frame, 0.00–3.00 |
| `NACHT_HORIZONT` | `#1B2450` | night sky at the horizon line |
| `TAG_TOP` | `#79A6FF` | day sky, top of frame, 3.00–22.00 |
| `TAG_HORIZONT` | `#B9D2FF` | day sky at the horizon line |
| `GOLD_TOP` | `#4E74C8` | golden-hour sky, top, 22.00–30.00 |
| `GOLD_HORIZONT` | `#F3B453` | golden-hour sky at the horizon |
| `GOLD_WASH` | `rgba(255,168,74,0.16)` | global multiply over the world layer, 23.00–30.00 |
| `WOLKE` | `#FFFFFF` @ 0.86 | cloud rects (warm-grey `#E8DCC8` @ 0.86 after 23.00) |
| `WOLKE_KANTE` | `rgba(0,0,0,0.10)` | 6 px bottom edge on every cloud rect |
| `SONNE` | `#FFF3C4` | 78×78 day sun square |
| `SONNE_GOLD` | `#FFE9A8` | 92×92 low sun, 23.00–30.00 |
| `MOND` | `#EDEDF2` | 78×78 moon square, notch filled with `NACHT_TOP` |
| `STERN` | `#FFFFFF` @ 0.55 | 4 px star squares, night only, above y 660 |
| `NEBEL` | = the sky's horizon colour | per-strip fog overlay, ramps 0 → 0.55 at z = 26 |

### 3.2 World (straight out of `tex.png`, never recoloured)

`GRAS #5FA83C` · `ERDE #7A5B3B` · `ACKER #6B4A2C` · `KÜRBIS #D9821B` · `WASSER #3C63C8` · `EICHE #9C7343` · `LAUB #3C762B` · `STEIN #7E7E7E` · `KOPFSTEIN #707070` · `SAND #DBCD9E`

These are documentation values only — the world is drawn with the atlas, and no scene ever fills a block with a flat colour.

**Break-particle colours** (3 fixed hexes per block type, sampled from the atlas):
pumpkin `#D4771C` `#B0681B` `#6C4A1F` · sea pickle `#6E8C2E` `#4C6620` `#33471A` · spawner `#5A6673` `#39424D` `#1E2228` · farmland `#7A5B3B` `#62422A` `#4A3220`

### 3.3 GUI chrome — the dominant surface for ~50 % of the film

| Token | Hex | Role |
|---|---|---|
| `PANEL` | `#C6C6C6` | inventory / GUI panel body |
| `BEVEL_HELL` | `#FFFFFF` | 4 px top + left panel bevel |
| `BEVEL_DUNKEL` | `#555555` | 4 px bottom + right panel bevel |
| `RAHMEN` | `#1B1B1F` | 1 px outer border on every panel and button |
| `SLOT` | `#8B8B8B` | inventory slot fill |
| `SLOT_OBEN` | `#373737` | 2 px slot top + left inset bevel (slots are **inset** — dark on top-left) |
| `SLOT_UNTEN` | `#FFFFFF` | 2 px slot bottom + right bevel |
| `BUTTON` | `#6C6C6C` | button body, normal |
| `BUTTON_HELL` | `#8B8B8B` | button body under the **cursor** hover (0–2 s and 26–28 s only) |
| `BUTTON_KANTE_H` | `#FFFFFF` | 2 px button top + left bevel |
| `BUTTON_KANTE_D` | `#2E2E2E` | 2 px button bottom + right bevel |
| `GEIST` | `rgba(168,85,247,0.30)` | the **ghost press** — fill on any button the bot operates |
| `GEIST_KANTE` | `#A855F7` @ 1.0, 1 px inset | persistent outline on every unattended button |
| `MENU_ERDE` | dirt pattern ×4 + `rgba(0,0,0,0.55)` | the tiled menu background (resolves ≈ `#3A2A18`) |
| `DIM` | `rgba(0,0,0,0.55)` | world dim behind any open GUI (0.60 behind the book) |
| `TOAST_KORPUS` | `#242430` | advancement toast body |
| `TOAST_RAHMEN` | `#0E0E14` | 4 px toast outer border |
| `TOAST_LICHT` | `#4A4A5C` | 3 px toast inner highlight, inset 4 px |
| `KONSOLE` | `rgba(0,0,0,0.62)` | live-console box, S7 |
| `CHAT_BG` | `rgba(0,0,0,0.45)` | vanilla chat backing |
| `FELD_BG` | `rgba(0,0,0,0.85)` | text-field fill, S10 |
| `FELD_KANTE` | `#A0A0A0` | 2 px text-field border |
| `LADEBALKEN_SPUR` | `#2B2B2B` | loading-bar track |
| `LADEBALKEN_FÜLLUNG` | `#57A64E` | loading-bar fill |

### 3.4 Text — Minecraft's own §-codes and nothing else

`WEISS #FFFFFF` (§f) · `GRAU #AAAAAA` (§7) · `GELB #FFFF55` (§e) · `GRÜN #55FF55` (§a) · `ROT #FF5555` (§c) · `GOLD #FFAA00` (§6) · `SCHATTEN #3F3F3F` (the mandatory drop shadow — see §4) · `GUI_TITEL #404040` (panel titles, **no shadow**)

### 3.5 Book, sign, brand

`PERGAMENT #DCC9A0` · `PERGAMENT_KANTE #8C7A56` · `PERGAMENT_FALZ #C4B08A` · `TINTE #3B2E1C` · `TINTE_GRÜN #3F7A2E` · `TINTE_MATT #6B5A3E`
`SCHILD_HOLZ` = `oak_planks` texture · `SCHILD_KANTE #3D2B17` · `SCHILD_TINTE #2B2013`

**Brand, rationed hard.** `AFK_VIOLETT #A855F7` appears only where the game itself would carry it: the bot's shirt (it *is* the `player_shirt` texture — verified in the atlas at `#7B3DBD`, so it costs nothing), the nametag underline, and the 0.30-alpha ghost press. `HUGO_ROT #FF2E2E` is used on **exactly one object in the whole film**: the `BOT STOPPEN` button at 18.5–19.4 s. The logo PNG is the only place both brand colours appear together (S2 server icon, S3 loading banner, S10 form header). Neither colour is ever a glow, a gradient or a light source.

### 3.6 What the background is, second by second

| Window | Background |
|---|---|
| 0.00–2.00 | night world (sky gradient `#0A0F28`→`#1B2450`), dimmed 0.55 behind the pause menu |
| 2.00–3.00 | flat `#000000` |
| 3.00–4.00 | day world (sky gradient `#79A6FF`→`#B9D2FF`) |
| 4.00–7.00 | `MENU_ERDE` tiled dirt (server list → connect → loading) |
| 7.00–11.00 | day world |
| 11.00–13.50 | day world dimmed 0.55 + `PANEL` grey inventory |
| 13.50–15.00 | day world |
| 15.00–16.50 | `MENU_ERDE` tiled dirt (disconnect → loading) |
| 16.50–17.00 | day world |
| 17.00–19.50 | day world dimmed 0.55 + console/stat panel |
| 19.50–20.00 | day world |
| 20.00–23.00 | world dimmed 0.60 + `PERGAMENT`; the light behind shifts day → golden between 22.00 and 23.00 |
| 23.00–26.00 | golden-hour world |
| 26.00–28.00 | `MENU_ERDE` tiled dirt (Vormerken form) |
| 28.00–30.00 | golden-hour world |

The film is never on black except for the one second in which the player quits. That single second is the point.

---

## 4 · TYPOGRAPHY

Three faces. All three are loaded in `render/index.html`. **Inter, Space Grotesk, JetBrains Mono, Orbitron, Syne and Unbounded are loaded but forbidden.**

| Role | Face | `FONTS` key | Weight | Notes |
|---|---|---|---|---|
| Interface / headline | **Silkscreen** | `FONTS.silk` | **700** (the only weight in the TTF) | all `/title` lines, screen titles, buttons, toasts, book ink, sign text |
| Running text | **VT323** | `FONTS.term` | **400 — must be passed explicitly** | chat, console, MOTD, field labels, F3 |
| One-off pixel label | **Press Start 2P** | `FONTS.pixel` | **400 — must be passed explicitly** | used exactly once: `24/7` |

> `drawText` defaults to `weight: 700`. VT323 and Press Start 2P ship weight 400 only; omitting `weight: 400` produces synthetic faux-bold mush. Every VT323 and Press Start 2P call **must** pass `weight: 400`.
> All three faces carry `ÄÖÜäöüß`, `—`, `·` and `…` — verified against the TTFs. No copy restriction.

### 4.1 The rule that makes it specific: **Minecraft's drop shadow**

Every glyph in the film is drawn twice:

```
MC.text(ctx, str, x, y, o):
  drawText(ctx, str, x + 4, y + 4, {...o, color: shade(o.color, 0.25)})   // hard, no blur, no offset variance
  drawText(ctx, str, x,     y,     o)
```

Shadow offset is a flat **4 px right / 4 px down** for sizes 30–52, **6 px** for 68–80, **8 px** for 92–98. Never blurred, never softened, never randomised. This flat hard offset is the single most recognisable property of Minecraft type, and it is what makes a headline read as *"the game said this"* rather than *"an agency set this."*

**Three strings in the film are drawn WITHOUT the shadow**, because that is exactly how the game draws them — and their absence is the tell that someone looked:
1. GUI panel titles (`Inventar`) — `GUI_TITEL #404040`, no shadow, left-aligned.
2. Oak sign text — vanilla sign text carries no shadow.
3. Book ink — vanilla book text is drawn flat on the page.

### 4.2 Alignment follows the game, not the layout

- **Left-aligned:** chat, console, F3, stats, toast text, book ink, field labels and values.
- **Centred:** GUI screen titles, button labels, sign text.
- **Centred large type exists only in the three `/title` moments** (5.00, 7.00, 24.50). That is the only thing Minecraft itself centres.

### 4.3 `/title` behaves like vanilla — it does not slam

Vanilla `/title` fades in at a **fixed scale**, holds, fades out. Therefore:

```
fade in : alpha 0 → 1 over 4 frames (0.133 s), linear.  NO scale change.
hold    : as specified per scene.
fade out: alpha 1 → 0 over 6 frames (0.200 s), linear.
```

No `E.outExpo` scale ramp, no RGB split, no glow, no band. This removes the last structural echo of the rejected film's headline gesture while being *more* vanilla, not less.

### 4.4 Sizes, with measured widths

All widths measured in headless Chromium against the real TTFs. Safe width = **810 px** (x 90..900).

| String | Face / size | Measured | Fits |
|---|---|---|---|
| `BLEIB ONLINE.` | Silkscreen 76 | **731.5** | ✓ 39 px margin/side |
| `AUCH OFFLINE.` | Silkscreen 76 | **750.5** | ✓ 30 px margin/side |
| `IN DER CLOUD.` | Silkscreen 76 | **741.0** | ✓ |
| `DEIN PC DARF AUS SEIN.` | Silkscreen 44 | **726.0** | ✓ |
| `20.09.2026` | Silkscreen 94 | **752.0** | ✓ 29 px margin/side |
| `auf dem HugoSMP` | Silkscreen 46 | **569.3** | ✓ |
| `Spiel pausiert` | Silkscreen 48 | **510.0** | ✓ |
| `Server auswählen` | Silkscreen 44 | **594.0** | ✓ |
| `Verbindung verloren` | Silkscreen 44 | **704.0** | ✓ |
| `Vormerken` | Silkscreen 44 | **352.0** | ✓ |
| `Vom Server trennen` | Silkscreen 36 | **544.5** | ✓ in a 620 px button |
| `Zurück zum Spiel` / `Statistiken` | Silkscreen 36 | 450 / 306 | ✓ |
| `Server beitreten` / `Erneut verbinden` | Silkscreen 36 | 454.5 / 472.5 | ✓ |
| `Zurück zur Serverliste` | Silkscreen 36 | **625.5** | ✓ **needs a 700 px button** |
| `Live-Konsole` / `BOT STOPPEN` / `BOT STARTEN` | Silkscreen 34 | 331.5 / 306 / 301.7 | ✓ in 380 px buttons |
| `Fortschritt erzielt!` | Silkscreen 28 | **416.6** | ✓ toast kicker |
| `Spawner-Loot · 24/7` (widest toast name) | Silkscreen 36 | **544.5** | ✓ |
| `Vom HugoSMP-Team` (widest book line) | Silkscreen 40 | **550.0** | ✓ in a 615 px measure |
| `HugoAFK.com` (sign) | Silkscreen 46 | **425.5** | ✓ on a 560 px board |
| `HugoAFK.com` (form field) | Silkscreen 52 | **481.0** | ✓ |
| `VON DEINEM HANDY` | Silkscreen 44 | **588.5** | ✓ |
| `Bleib online. Auch offline.` (form footer) | Silkscreen 34 | **680.0** | ✓ |
| `[Server] World-Reset in 10 Sekunden.` (widest chat) | VT323 44 | **633.6** | ✓ |
| `Tipp: HugoAFK merkt sich deine Position.` | VT323 44 | **704.0** | ✓ |
| `24/7` | Press Start 2P 30 | **120.0** | ✓ the film's only use of this face |

**Floors.** Nothing load-bearing below **34 px**. The F3 overlay at VT323 30 is *decoration only* and sits outside the safe box (see §5); every fact it carries is also stated at ≥ 40 px somewhere else. Every scene must run a `fit()` pass: measure the string, step the size down 2 px at a time until `measureText ≤ 790`, and log any string that had to shrink.

---

## 5 · LAYOUT SYSTEM

### 5.1 The frame is the game window — full bleed

**Decision, and it is the fix for the winner's floating-HUD problem: the game window is the entire 1080×1920 canvas.** The sky, the ground, the world and the HUD all run to the real frame edges. Every HUD element the game pins to an edge is pinned to the *canvas* edge, exactly as a real 9:16 Minecraft screen recording looks. TikTok's top UI and caption block then partially cover the HUD furniture — which is precisely what every real Minecraft recording on the platform looks like, and is therefore an asset, not a compromise.

The safe area is honoured by a different rule: **all load-bearing content — every GUI panel, every `/title`, every toast, every screen, every chat line the film needs read — lives inside x 90..900 / y 300..1420.** Everything outside that box is authenticity furniture that the viewer may lose without losing a fact.

### 5.2 Screen-space HUD (identical in every frame it appears — owned by `TL.overlay`)

| Element | Position | Detail |
|---|---|---|
| Crosshair | (540, **960**) — true frame centre | two rects 2×18 and 18×2, `#FFFFFF`, `globalCompositeOperation = 'difference'` |
| Hotbar | 9 slots of 92 px, 6 px gaps = **876 px**, x 102..978 | top edge y **1764**, bottom edge y **1856** |
| XP bar | 876×6 at x 102, y **1748** | track `#1B1B1F`, fill `#7CFC00`, level numeral `#7CFC00` with a 2 px black outline centred at (540, 1738) |
| Hearts | 10 × 36 px at 38 px pitch = 372 px, x 102 | row centre y **1712** |
| Hunger | mirrored, right-aligned to x 978 | row centre y **1712** |
| Chat | x **100**, newest line baseline y **1372**, growing upward | 10 lines, 48 px pitch, VT323 44, `CHAT_BG` backing per line; lines fade out over their last 0.3 s |
| F3 overlay | x 40, first line baseline y **150**, 7 lines at 44 px pitch | VT323 30, each on its own `rgba(0,0,0,0.50)` backing rect sized to the text + 6 px |
| Toasts | slide from x 1080, rest with right edge at x **900** → box x 140..900 | stack at y **320 / 480 / 640** |
| First-person arm | pivot (800, 1800), sleeve 150×320 rotated −0.42 rad | `player_shirt` sleeve + `player_skin` hand, bobbing ±9 px @ 0.9 Hz |

**The one deliberate deviation from pixel-exact vanilla placement:** the chat block sits with its newest line at y 1372 instead of just above the hotbar. This is stated openly because it is the only placement in which the chat is readable on TikTok, and the chat carries three load-bearing lines (the sell confirmation, the coordinate proof, the closing line). The band y 1400..1700 between the chat and the HUD is filled by ground texture and the first-person arm, so nothing reads as empty.

### 5.3 GUI geometry (all inside the safe box)

| Screen | Box | Notes |
|---|---|---|
| Pause menu | title y 420; 3 buttons **620×84** at x 230, y 560 / 664 / 768 | world visible behind at `DIM` 0.55 |
| Server list | title y 340; 3 rows **700×150** at x 190, y 420 / 590 / 760; join button 620×84 at x 230, y 1210 | |
| Loading screen | logo width **520** (h 330) at top y 380; `Lade Welt…` y 800; bar **620×28** at (230, 900); tip lines y 990 / 1050 | |
| Inventory | panel **770×880** at (130, 420) | full furniture — see S5 |
| Disconnect screen | title y 620; reason y 700; 2 buttons **700×84** at x 190, y 860 / 970 | wider buttons because `Zurück zur Serverliste` is 625.5 px |
| Control panel | console box x 110..900, y 400..1000; stats y 1040..1140; 2 buttons **380×110** at x 110 / x 510, y 1230 | |
| Book | parchment **700×840** at (190, 400) | ink measure x 275..890 = 615 px |
| Vormerken form | logo width 420 at top y 320; title y 640; 3 fields **700×80** at x 190, y 730 / 880 / 1030; Fertig **700×88** at (190, 1180); footer y 1330 | |

### 5.4 What may bleed outside the safe box

Sky, clouds, sun/moon, ground strips, blocks, the first-person arm, the hotbar, hearts, hunger, the XP bar, the F3 overlay, the lower chat lines when the block is full, and the ground texture below y 1420. **Nothing else.** No word the film needs read ever sits outside x 90..900 / y 300..1420.

### 5.5 The empty middle

The band y 700..1300 in every world shot is deliberately the emptiest region of the frame — it holds the crosshair, the sky and the horizon and nothing else. That is the exact inverse of the rejected film's centre-locked type, and it is also where every GUI panel and `/title` lands, so the two states of the film use the same real estate for opposite purposes.

---

## 6 · CAMERA + MOTION

**There is no camera move in the cinematographic sense in this film.** `FX.zoom` is 1.0 for all 900 frames. `withCamera` is never called with a zoom ≠ 1. There are only two camera behaviours, and both are things a player's hands do.

### 6.1 Mouse-look

The world layer (sky, clouds, ground, blocks) is view-space and translates horizontally when the bot looks around. **Two deliberate pans only:**

| Window | Motion | Easing |
|---|---|---|
| 9.00 → 11.60 | pan **right** across the three farm stations, camX +9.0 blocks | `E.inOutCubic` |
| 23.20 → 24.60 | pan **left** back to the oak sign, camX −5.4 blocks | `E.inOutCubic` |

Plus a constant idle drift of **±1.2 px/s** (a slow sine, period 11 s) so no world frame is ever frozen.

Under it: a **0.85 Hz head-bob** of ±7 px vertical with ±0.35° roll while the bot walks, and a **3-frame downward pitch nudge of 6 px** on every mining swing.

**The HUD never moves with any of this.** It is screen-space and rock solid, drawn by `TL.overlay` so it is bit-identical across all ten scene files. That separation — a moving world under a nailed-down interface — is the single strongest signal that this is a game screen and not a motion-graphics composition.

### 6.2 View mode (F5)

Four third-person shots, all **side-on profile** (`mcPlayer(..., {facing: 'right'})`). `mcPlayer` hard-codes the face onto one visible side and cannot render a back view; profile also reads the walk cycle far better.

| Window | Length | Content |
|---|---|---|
| 3.00–4.00 | 1.00 s | the bot standing at the pumpkin row, swinging, nametag above |
| 16.60–17.00 | 0.40 s | the bot standing on the identical block after the reconnect |
| 25.00–26.00 | 1.00 s | the bot walking left → right toward the oak sign, full walk cycle |
| 28.00–30.00 | 2.00 s | the bot at rest beside the sign, sun lower, idle bob only |

Rules for every F5 shot: the player stands near bottom-centre where the projection disagreement is smallest; feet planted on a strip whose tile pitch matches the model's isometric footprint; a soft `rgba(0,0,0,0.35)` ellipse blob shadow at the feet; **never a mouse-look pan while an F5 shot is on screen.** The 28.00–30.00 shot is the longest and is the one to prototype first.

### 6.3 The motion signature

**The mouse cursor quits the game at 2.00 s and does not come back until 26.30 s.**

- At 2.00 the cursor clicks `Vom Server trennen`. The screen goes flat black on the next frame — and for frames **61–64** the white pixel arrow is still visible on the black, sliding down-right off the frame edge with a 3-position ghost trail at alpha 0.5 / 0.3 / 0.15. Then it is gone. **The absence is staged as a departure, not as a disappearance** — the viewer sees the hands leave.
- For the next 24 seconds every button in the film still gets pressed, every field still gets typed, every screen still gets navigated — with no pointer on it, a `GEIST` `rgba(168,85,247,0.30)` fill where the white hover highlight would be, and a persistent **1 px `#A855F7` inset outline** on every button the bot touches. The outline is what makes the absence legible at a glance.
- At **17.00** the input device changes visibly: a round **touch ripple** (stroked `#FFFFFF` circle, r 20 → 90, alpha 0.5 → 0 over 0.30 s, plus a filled 14 px dot) taps the buttons, and between the two taps at 18.50 and 19.40 the film shows **the travel**: a faint 24 px trailing dot arcing from the first button to the second over 0.25 s. That is how the film says *"from your phone"* without a phone mockup.
- At **26.30** the white arrow slides back in from the bottom-right along the same path it left by, hovers the `AFK-Client` field (whose border turns `#FFFFFF`), and does the last three clicks of the film.

Describable by any viewer in one sentence: *the hands leave, the game keeps playing, the hands come back.*

### 6.4 The no-dead-frame contract

**In every one of the 900 frames, at least one thing must change state within 0.25 s.** The always-available list: a cloud rect moves, a torch flickers at 7 Hz, the session clock ticks, a pumpkin's crack stage advances, a particle falls, a chat line fades, the XP bar creeps, a slot fills, a console line arrives, a loading notch steps, a toast slides, the cursor or a ripple moves, the water surface offsets 2 px. If a beat has none of these, the beat is redesigned, not decorated.

---

## 7 · TRANSITIONS

Cuts are the game's own screen changes and nothing else. Four devices, all vanilla. Every cut lands on an exact multiple of 15 frames (t = k · 0.5 s).

**Devices**

| Device | Duration | Construction |
|---|---|---|
| **A · SCREEN SWAP** | 2 frames | flat `#000000` for 2 frames on the beat, then the new screen is simply there. This is what the game does and it costs nothing. |
| **B · GUI OPEN** | 4 frames | world dims 0 → 0.55 over 4 frames; panel scales 0.94 → 1.00 over the first 3 frames on `E.outExpo` |
| **C · GUI CLOSE** | 3 frames | panel 1.00 → 0.96, dim 0.55 → 0, over the 3 frames **ending on** the stated timecode |
| **D · STRAIGHT CUT** | 1 frame | no ramp at all. Used once. |

**Cut table** — bar.beat at 120 BPM (bar = 2.000 s, beat = 0.500 s; bar 1 beat 1 = t 0.000)

| # | t (s) | frame | bar.beat | Device | From → To | Dur |
|---|---|---|---|---|---|---|
| — | 0.000 | 0 | 1.1 | — | **opens on** the pause menu over the dimmed night world | — |
| 1 | 2.000 | 60 | 2.1 | click + cut to black; cursor exits frames 61–64 | pause menu → black | 1 f + 4 f exit |
| 2 | **3.000** | 90 | 2.3 | **D · STRAIGHT CUT** | black → **day world, identical camera** | 1 f |
| 3 | 4.000 | 120 | 3.1 | A · SCREEN SWAP | world → server list | 2 f |
| 4 | 5.000 | 150 | 3.3 | A · SCREEN SWAP | server list → connect screen | 2 f |
| 5 | 6.000 | 180 | 4.1 | A · SCREEN SWAP | connect → loading screen | 2 f |
| 6 | 7.000 | 210 | 4.3 | A · SCREEN SWAP | loading → world (join) | 2 f |
| — | 8.000 | 240 | 5.1 | *no cut* | scene boundary inside a continuous world shot | — |
| 7 | 11.000 | 330 | 6.3 | B · GUI OPEN | world → inventory | 4 f |
| 8 | 13.500 | 405 | 7.4 | C · GUI CLOSE | inventory → world | 3 f |
| — | 14.000 | 420 | 8.1 | *no cut* | scene boundary inside a continuous world shot | — |
| 9 | 15.000 | 450 | 8.3 | A · SCREEN SWAP | world → disconnect screen | 2 f |
| 10 | 15.500 | 465 | 8.4 | A · SCREEN SWAP | disconnect → loading screen | 2 f |
| 11 | 16.500 | 495 | 9.2 | A · SCREEN SWAP | loading → world (**identical frame to 14.000**) | 2 f |
| 12 | 17.000 | 510 | 9.3 | B · GUI OPEN | world → control panel | 4 f |
| 13 | 19.500 | 585 | 10.4 | C · GUI CLOSE | control panel → world | 3 f |
| 14 | 20.000 | 600 | 11.1 | B · GUI OPEN (dim 0.60) | world → written book | 4 f |
| 15 | 22.400 | 672 | 12.2 | page swap: 2-frame hold + 1 frame of the page edge shifted 6 px | book page 1 → page 2 | 3 f |
| 16 | 23.000 | 690 | 12.3 | C · GUI CLOSE | book → **golden-hour world** | 3 f |
| — | 24.500 | 735 | 13.2 | `/title` fade-in | not a cut | 4 f |
| 17 | 26.000 | 780 | 14.1 | A · SCREEN SWAP | world → Vormerken form | 2 f |
| 18 | 28.000 | 840 | 15.1 | C · GUI CLOSE | form → **golden-hour world (final shot)** | 3 f |
| — | 30.000 | 900 | 16.1 | — | last frame; **no fade to black** | — |

**Scene windows (sum = 30.000 s exactly)**

`S1 0.0–4.0` (4.0) · `S2 4.0–6.0` (2.0) · `S3 6.0–8.0` (2.0) · `S4 8.0–11.0` (3.0) · `S5 11.0–14.0` (3.0) · `S6 14.0–17.0` (3.0) · `S7 17.0–20.0` (3.0) · `S8 20.0–23.0` (3.0) · `S9 23.0–26.0` (3.0) · `S10 26.0–30.0` (4.0)
**4.0 + 2.0 + 2.0 + 3.0 + 3.0 + 3.0 + 3.0 + 3.0 + 3.0 + 4.0 = 30.000 s** · 15 bars.

**Bar downbeats are never marked with a graphic effect.** They are marked with a gameplay event: a pumpkin finishes breaking (crack stage 9, then 14 falling particles), a slot fills with a 2-frame `#FFFFFF` flash, a toast starts its slide, a button depresses, a page turns, the loading bar's green fill jumps a notch. The half-beats between them carry the sixteenth-note events — one console line, one slot, one stack-count tick.

**Explicitly absent from all 900 frames:** white flashes, RGB splits, glitch slices, stutter time-remaps, shockwave rings, whip pans, invert frames, crossfades. `FX.shake` is raised exactly twice, to 2 px for 3 frames, at **14.90** and **16.50** — because a server drop is the one moment the game itself jolts.

**Post chain, dialled almost off:** `FX.bloom = 0` (exactly), `FX.vignette = 0.05`, `FX.scan = 0`, `FX.grain = 0.014`. The vignette and grain are not style — they are dither against H.264 banding on the large flat sky gradient at TikTok's re-encode bitrate. Minecraft screenshots have no bloom and no vignette, and that flatness is instantly visible as a different film.

---

## 8 · SCENE-BY-SCENE

Shared conventions: `MC.text()` = the mandatory double-draw shadow. All timings absolute. Frame = round(t · 30).

---

### S1 · 0.000 – 4.000 · **Feierabend**
**Fact 1 — the player logs off; the farm keeps running.**

**Copy**
Chat (already on screen at frame 0, VT323 44): `[19:04] <Timo> bin weg, bis morgen` (§f, 598.4 px)
Pause menu: `Spiel pausiert` · `Zurück zum Spiel` · `Statistiken` · `Vom Server trennen`
On black: `Timo hat das Spiel verlassen` (§e, VT323 46, 515.2) · `HugoAFK hat das Spiel betreten` (§e, VT323 46, 552)
Nametag: `HugoAFK` · Toast: `Fortschritt erzielt!` / `Schicht übernommen`
Chat at 3.60: `[HugoAFK] Schicht übernommen.` (§7, 510.4)

**Drawn**
Frame 0 is already the differentiator: **vanilla grey GUI chrome over a dimmed night Minecraft world.** Night sky gradient `#0A0F28` → `#1B2450` with the horizon at y 700; `nightSky(count 70)` confined above y 660; a 78×78 `#EDEDF2` moon with a 26×26 `#0A0F28` phase notch at (770, 400); two 24×24 `#FFAA33` torch flames on fence posts flickering at 7 Hz with a 0.22-alpha ground pool. Ground = 26 perspective strips (§10). Three rows of 7 pumpkins at z = 3 / 5 / 7. The whole world sits under `DIM` 0.55. Over it: `Spiel pausiert` (Silkscreen 48, centred, y 420, white + 6 px shadow) and three 620×84 buttons at x 230, y 560 / 664 / 768, labels Silkscreen 36. The white 12×17 pixel cursor is already in motion at frame 0, at (830, 1120), travelling on eased waypoints toward `Vom Server trennen`. HUD as §5.2.

**Because this is a server, the world does not pause behind the menu** — that is the authenticity anchor of the opening and it is also what gives the first 60 frames their motion.

**Motion, beat by beat**
- **0.00–0.25** a pumpkin at z=5 finishes breaking behind the dim: crack stage 9 → 14 falling `#D4771C/#B0681B/#6C4A1F` particles. First event lands inside the first 8 frames.
- **0.50 / 1.00 / 1.50** three more pumpkins break on the beats. Torches flicker throughout. Cursor travels.
- **1.50** the cursor reaches the third button; it takes the vanilla **hover** state (`BUTTON_HELL #8B8B8B` + 2 px white outline).
- **2.00 (bar 2.1)** CLICK: the button depresses 2 px with its bevels swapped; on the next frame the screen is flat `#000000`. Frames 61–64: the cursor slides down-right off the frame edge with a 3-ghost trail. **This is the founding moment of the film's motion signature and it must be legible.**
- **2.05 / 2.55** on black, two chat-styled lines type on at x 130, y 900 and y 970 (VT323 46, §e `#FFFF55`, `drawKinetic 'type'`, 40 chars/s). Nothing else moves.
- **3.00 (bar 2.3) STRAIGHT CUT** to the **identical camera position in full daylight**: sky `#79A6FF` → `#B9D2FF`, three parallax cloud rows, a 78×78 `#FFF3C4` sun at (330, 380). F5 profile: `mcPlayer` at (540, 1240), size 150, facing right, `swing: 1`, with a nametag — `rgba(0,0,0,0.26)` box + VT323 32 white `HugoAFK` — 40 px above the head, plus a `rgba(0,0,0,0.35)` ellipse blob shadow at the feet.
- **3.25 / 3.75** pumpkins break and regrow.
- **3.50** the first advancement toast slides x 1080 → 140 in 0.25 s (`E.outCubic`) and holds: `Fortschritt erzielt!` (Silkscreen 28 `#FFFF55`) / `Schicht übernommen` (Silkscreen 36 white + shadow, 544.5 px), icon = pumpkin `blockIcon` at 88 px.
- **3.60** chat adds `[HugoAFK] Schicht übernommen.`

**Must not be got wrong:** frame 0. It is the TikTok cover frame and it must show, unmistakably and at thumbnail scale, **grey vanilla Minecraft menu chrome over a game world**. If frame 0 reads as "a dark Minecraft scene", the whole escape fails, because that is what the rejected film's frame 0 was.

---

### S2 · 4.000 – 6.000 · **Der Server**
**Fact 2 — brand, claim, what it is.**

**Copy**
`Server auswählen` · row: `HugoAFK` / MOTD `AFK-Client für den HugoSMP` · `Server beitreten` · `Verbinde mit dem Server…`
`/title`: **`BLEIB ONLINE.`** / subtitle **`AUCH OFFLINE.`**

**Drawn**
**4.00** 2-frame black, then Minecraft's multiplayer server list. Background = `MENU_ERDE`. Title `Server auswählen` (Silkscreen 44, white + 4 px shadow, centred, y 340). Three rows 700×150 at x 190, y 420 / 590 / 760; rows 1 and 3 are dimmed placeholders in §7 `#AAAAAA`; **row 2 is HugoAFK and is selected** — a 2 px `#FFFFFF` border and a `#4A4A52` fill. Row 2 carries:
- `IMG.logo` used natively as the **128 px server icon**, drawn 128×81 (aspect 1401:888 held) letterboxed inside the 128×128 icon slot at x 205, y 455.
- Name `HugoAFK` (Silkscreen 44, 264 px) at x 360, y 465.
- MOTD `AFK-Client für den HugoSMP` (VT323 38 `#AAAAAA` weight 400, 395.2 px) at x 360, y 520.
- Five ascending `#55FF55` ping bars (heights 8/14/20/26/32) at x 830.

**Motion**
- **4.50 (beat)** the row highlights and the `Server beitreten` button (620×84 at x 230, y 1210) **presses itself** — 3-frame `GEIST` fill, 1 px `#A855F7` inset outline, label shifted 2 px down. No cursor.
- **5.00 (bar 3.3)** 2-frame black → connect screen: dirt background, `Verbinde mit dem Server…` (VT323 40 `#AAAAAA`, centred, y 380).
- **5.05–5.20** over it the game's own `/title` fades in at fixed scale: `BLEIB ONLINE.` (Silkscreen 76, `#FFFFFF` + 6 px `#3F3F3F` shadow, centred, y 800, **731.5 px**) and subtitle `AUCH OFFLINE.` (Silkscreen 76, `#AAAAAA`, y 910, **750.5 px**).
- **5.20–6.00** holds dead still. The one moment of stillness in the first half, and it earns it because the lines either side of it are pure motion.

**Must not be got wrong:** the `/title` **does not scale**. Alpha only. If it scales, it is the rejected film's headline gesture wearing a pixel font.

---

### S3 · 6.000 – 8.000 · **Die Cloud**
**Fact 3 — it runs in the cloud; your own PC can be off.**

**Copy**
`Lade Welt…` · `Tipp:` (§e) `HugoAFK läuft in der Cloud.` · `Dein eigener PC darf aus sein.` · `HugoSMP · HugoAFK 1.0`
`/title` (server join): **`IN DER CLOUD.`** / subtitle **`DEIN PC DARF AUS SEIN.`**
F3 overlay: `HugoAFK 1.0 (Cloud)` · `Dein PC: aus` (§e) · `Sitzung: 132:04:51` · `Server: HugoSMP` · `XYZ: 148.500 / 71.000 / -302.318` · `Block: 148 71 -302` · `Facing: south (+Z)`

**Drawn**
**6.00 (bar 4.1)** the loading screen — this is where the logo gets its hero moment, framed entirely by the game's own loading chrome so it can never read as a lockup. `MENU_ERDE` background. `IMG.logo` centred at width **520** (h 330), top y 380. `Lade Welt…` (Silkscreen 44, 320 px, centred, y 800). Below it the vanilla loading bar: **620×28 at (230, 900)**, 3 px `#000000` border, `#2B2B2B` track, `#57A64E` fill growing 0 → 1 between 6.05 and 6.90 **in eight visible notch steps on the sixteenths**, so the bar itself carries the beat. Tip lines: `Tipp:` in §e `#FFFF55` then `HugoAFK läuft in der Cloud.` in white (VT323 44, centred, y 990, 580.8 px), and `Dein eigener PC darf aus sein.` (VT323 44 `#AAAAAA`, y 1050, 528 px). `HugoSMP · HugoAFK 1.0` (VT323 32 `#AAAAAA`) at y 1130.

**Motion**
- **7.00 (bar 4.3)** 2-frame black, then back into the day world at the same camera position, first-person, arm bobbing, pumpkins breaking on the eighths.
- **7.02–7.15** the server's **join `/title`** fades in: `IN DER CLOUD.` (Silkscreen 76, white + 6 px shadow, centred, y 780, **741 px**) with subtitle `DEIN PC DARF AUS SEIN.` (Silkscreen 44, `#FFFF55`, y 890, **726 px**). Holds to 7.80, fades out over 6 frames. **This is the promotion of the cloud fact to headline scale — it is the product's core claim and it now lands as loudly as the brand claim.**
- **7.00–7.20** simultaneously the F3 debug overlay toggles on as if the key were pressed: seven VT323 30 lines at x 40 from y 150, pitch 44, each on its own `rgba(0,0,0,0.50)` backing rect sized to the text + 6 px. `Dein PC: aus` is the only line in `#FFFF55`. The `Sitzung:` clock ticks one second per second, derived from `floor(t)`.
- The `XYZ: 148.500 / 71.000 / -302.318` line is planted here, unremarked, so that its reappearance at 16.50 is the proof of the world-reset beat.

**Must not be got wrong:** the logo is drawn once, at the exact 1401:888 ratio, with no blurred copy under it and no glow. And the loading bar must step in **eight discrete notches**, not slide — the notch is the beat.

---

### S4 · 8.000 – 11.000 · **Die Schicht**
**Fact 4 — 24/7 at your farm: sea pickle, pumpkin, spawner drops.**

**Copy**
Toasts: `Fortschritt erzielt!` / `Sea Pickle · 24/7` · `Pumpkin · 24/7` · `Spawner-Loot · 24/7`
Chat: `[HugoAFK] Sea Pickle geerntet` (510.4) · `[HugoAFK] Pumpkin geerntet` (457.6) · `[HugoAFK] Spawner geleert` (440), all §7
Hotbar label: `24/7` (Press Start 2P 30, `#FFFF55`, 120 px) above slot 4 at y 1730

**Drawn**
The shift itself, told as **one continuous mouse-look pan right** from 9.00 to 11.60 on `E.inOutCubic` (camX +9.0 blocks) — the film's principal camera move and the only one in the first half. Every ground strip and every block parallaxes correctly because each strip's pattern offset is `camX · C / z`.

- **Station 1 (visible 8.0–9.2):** a sunken water basin — three strips of the `water` texture with an animated 2 px surface offset — with nine `sea_pickle` sprites, two popping off on the sixteenths.
- **Station 2 (9.2–10.3):** the pumpkin field, farmland rows with furrows, the bot's arm swinging down on every eighth, a pumpkin breaking on 9.0 / 9.5 / 10.0 with crack overlay and 14 particles each.
- **Station 3 (10.3–11.0):** a dark spawner pit — a `spawner`-textured cube in a `cobblestone` frame with `rotten_flesh`, `bone` and `string` sprites arcing out on the sixteenths.

**Motion**
Three advancement toasts slide in on **8.50 / 9.50 / 10.50** and stack at y 320 / 480 / 640 exactly as the game stacks them. Toast box **760×150** at x 140..900: body `#242430`, 4 px `#0E0E14` border, 3 px `#4A4A5C` inner highlight inset 4 px, corners drawn as 12×12 double-bevel squares to mimic the vanilla 9-slice. 88 px icon cell at x+24 (`sea_pickle` sprite, then a pumpkin `blockIcon`, then `spawner`). Kicker Silkscreen 28 `#FFFF55` (416.6 px); name Silkscreen 36 white + shadow (≤ 544.5 px). Each slides x 1080 → 140 in 0.25 s (`E.outCubic`), holds 1.4 s, slides out in 0.20 s.

Hotbar slots 0/1/2 fill with the three items; their stack counts tick up on every eighth (VT323 34 white + shadow, weight 400, bottom-right of the slot). One §7 chat line lands per station.

**Must not be got wrong:** the pan must be *one* continuous move with correct parallax — near rows sweeping fast, the horizon barely moving. If the ground and the blocks pan at the same rate, the shot reads as a sliding wallpaper and the world dies.

---

### S5 · 11.000 – 14.000 · **Inventar voll**
**Fact 5 — the inventory fills up; it sells by itself.**

**Copy**
GUI title `Inventar` · status `Voll` (§c) · chat input `/sell` with the suggestion box `/sell` / `/sellall`
Chat: `[HugoAFK] Inventar voll.` (§c, 422.4) · `[HugoAFK] Inventar verkauft.` (§a, 492.8) · `[HugoAFK] Weiter geht's.` (§7, 422.4)

**Drawn**
**11.00 (bar 6.3)** E is pressed: **GUI OPEN**. Panel **770×880 at (130, 420)**: body `#C6C6C6`, 4 px `#FFFFFF` top/left bevel, 4 px `#555555` bottom/right bevel, 1 px `#1B1B1F` outer border.

**Full vanilla inventory furniture** — this is the beat whose whole argument is *"someone looked"*, so it must be furnished correctly:

| Element | Geometry |
|---|---|
| Title `Inventar` | Silkscreen 34, `#404040`, **left-aligned at x 165, y 462, NO SHADOW** |
| Player preview box | 260×340 recessed box at (165, 490); an `mcPlayer` at size 110 inside, facing right, idle bob. **The one authentic isometric player in the film — this is exactly how the game draws the inventory portrait.** |
| Armour column | 4 slots of 72 px at x 165, y 520 / 598 / 676 / 754 (inside the preview box's left edge) |
| Crafting 2×2 | 4 slots of 70 px, 10 px gap, at x 600 / 680, y 520 / 600 |
| Arrow | 30 px, x 770..800, y 570 |
| Result slot | 70 px at x 815, y 555 |
| Main inventory 9×3 | slots 72 px, 6 px gaps = **696 px**, x 165..861, rows at y 920 / 998 / 1076 |
| Hotbar row | same 9 columns, y 1160 |

Slots use a scene-local `MC.slot()` — `SLOT #8B8B8B` fill, 2 px `#373737` top/left, 2 px `#FFFFFF` bottom/right. **`mcSlot()` from the engine must not be used here**: its hard-coded `rgba(20,20,26,0.82)` fill and inverted bevels read as a black HUD slab on the grey panel.

**Motion**
- **11.00–12.00** the 27 main slots fill **three per sixteenth**, left-to-right, top-to-bottom, like a real bulk deposit — never a scatter. Items: pumpkin, sea_pickle, rotten_flesh, bone, string, gunpowder, emerald. Each landing gets a 2-frame `#FFFFFF` slot flash.
- **12.00 (bar 7.1)** the panel border flashes `#FF5555` for 3 frames and `Voll` (Silkscreen 30, `#FF5555`, 101 px) appears at the panel's top right; the §c chat line lands.
- **12.25** the chat input opens: a full-width `rgba(0,0,0,0.50)` strip 66 px tall with its top edge at y 1340, and `/sell` types itself character by character in VT323 46 white (92 px) at x 110 with the blinking block cursor. **As soon as the `/` is typed, the vanilla command-suggestion box appears above it** — a `rgba(0,0,0,0.75)` box at (110, 1270) listing `/sell` highlighted in `#FFFF55` and `/sellall` in `#AAAAAA`. *That detail is the authenticity anchor of the whole beat.*
- **12.75** ENTER: the slots empty **row by row on the sixteenths**, top row first, each slot blanking with a 2-frame flash. Done by 13.25. A bulk operation, not a trailer arc.
- **13.25 / 13.40** chat: `[HugoAFK] Inventar verkauft.` (§a) then `[HugoAFK] Weiter geht's.` (§7).
- **13.50 (beat 7.4)** GUI CLOSE over the 3 frames ending on 13.50; the world returns with the arm already swinging.

**Must not be got wrong:** no prices, no currency, no coin flight, no rising total. The argument is that the slots empty by themselves. Anything numeric here is an invented claim.

---

### S6 · 14.000 – 17.000 · **World-Reset**
**Fact 6 — it survives a world reset: disconnects, comes back, same spot.**

**Copy**
`[Server] World-Reset in 10 Sekunden.` (§c, VT323 44, 633.6) · `[HugoAFK] Position 148 / 71 / -302` (§7, VT323 44, **598.4**) · `[HugoAFK] Trenne Verbindung.` (§e, 492.8)
Screen: `Verbindung verloren` · `Server wird zurückgesetzt.` · buttons `Zurück zur Serverliste` · `Erneut verbinden`
`Lade Welt…` / `Tipp: HugoAFK merkt sich deine Position.` (VT323 44, 704)
Chat on return: `[HugoAFK] Position 148 / 71 / -302` (**identical string**) · `[HugoAFK] Wieder verbunden.` (§a, 475.2)
Toast: `Fortschritt erzielt!` / `Gleiche Stelle.` (Silkscreen 36, 396)

**Drawn / motion**
- **14.00 (bar 8.1)** in the world. The red server broadcast lands in chat. **On the same frame, the coordinate line `[HugoAFK] Position 148 / 71 / -302` prints directly beneath it at VT323 44 with a 2 px `#FFFF55` box drawn around it.** This is the promoted reset proof: it is 598.4 px wide, at 44 px, inside the safe box, and it is the same string the film will print again 2.6 seconds later. The F3 overlay carries the same numbers in the corner as ambient reinforcement, but the *proof* is in the chat where it can be read on a phone.
- **14.50** `[HugoAFK] Trenne Verbindung.` (§e); the bot's arm stops swinging and drops out of frame over 0.30 s.
- **14.90** `FX.shake = 2` for 3 frames. The only jolt in the film.
- **15.00 (bar 8.3)** 2-frame black → the vanilla disconnect screen: `MENU_ERDE`, `Verbindung verloren` (Silkscreen 44, centred, y 620, 704 px), reason `Server wird zurückgesetzt.` (VT323 40 `#AAAAAA`, centred, y 700, 416 px), and **two 700×84 buttons** at x 190, y 860 / 970 with Silkscreen 36 labels (`Zurück zur Serverliste` 625.5 px, `Erneut verbinden` 472.5 px).
- **15.25** the second button **presses itself** with the `GEIST` flash and the 1 px violet outline — no cursor. *That single unattended button press is the entire product proposition, shown rather than claimed.*
- **15.50 (beat 8.4)** 2-frame black → the loading screen returns: green notch bar filling on the sixteenths, tip `Tipp: HugoAFK merkt sich deine Position.`
- **16.50 (beat 9.2)** `FX.shake = 2` for 3 frames; 2-frame black, then cut back into the world on a frame that is **pixel-identical to 14.000** — same sky, same cloud phase, same `camX`, same pumpkin rows, same block break states. This is an authoring contract: the world draw at 16.50 must be called with the world-clock value it had at 14.00.
- **16.55** the F3 overlay draws back on line by line over 6 frames; the XYZ line now boxed in `#55FF55`. Chat prints `[HugoAFK] Position 148 / 71 / -302` **for the second time**, character-identical, followed by `[HugoAFK] Wieder verbunden.` (§a).
- **16.60–17.00** a 0.40 s F5 profile shot: the bot standing exactly where it stood.
- **16.60** the toast `Gleiche Stelle.` slides in with an `emerald` icon.

**Must not be got wrong:** the two coordinate lines must be **character-for-character identical** and both must be legible. That is precisely how a Minecraft player verifies "same spot", and it is the only proof this beat has.

---

### S7 · 17.000 – 20.000 · **Vom Handy**
**Fact 7 — controlled from your phone: live console, stats, one-click stop.**

**Copy**
Header: **`VON DEINEM HANDY`** (Silkscreen 44, 588.5)
Console: `[System] Bot online` · `[Chat] <Timo> läuft alles?` · `[System] Inventar voll` · `/sell` · `[System] Inventar verkauft` · `[System] Sea Pickle geerntet` · `[System] Bot gestoppt.` · `[System] Bot gestartet.`
Stats: `Status ···· Online` · `Sitzung ···· 132:07:12` · `Farm ···· Pumpkin`
Buttons: `Live-Konsole` · `BOT STOPPEN` → `BOT STARTEN`

**Drawn**
**17.00 (bar 9.3)** the pause menu opens again — but this time it is HugoAFK's control panel. World dims to 0.55 behind. **No mockup, no device body, no bezel, no `phoneFrame()`.** The phone-ness is carried entirely by input and ergonomics.

- Header `VON DEINEM HANDY` at x 110, y 340 — Silkscreen 44 white + shadow. (This replaces the winner's VT323 36 grey line, which was too thin to survive TikTok's encoder and was the only explanatory string in the beat.)
- **Live console:** `rgba(0,0,0,0.62)` box x 110..900, y 400..1000, holding nine VT323 40 lines (weight 400) that scroll upward one new line every 0.25 s, §7 grey `[System]` / `[Chat]` prefixes, white content, `/sell` in §e. The oldest line fades out over its last 0.2 s.
- **Stats strip** y 1040..1140, left-aligned at x 130, VT323 40, in the Minecraft statistics-screen idiom: label, a dotted `#555555` leader, then the value. `Status ···· Online` (value §a), `Sitzung ···· 132:07:12` (ticking), `Farm ···· Pumpkin`. **No totals, no earnings, no counts — live session state only.**
- **Two thumb buttons,** deliberately oversized and bottom-anchored at y 1230 where a thumb reaches: `Live-Konsole` **380×110** in `#6C6C6C` at x 110, and `BOT STOPPEN` **380×110** in **`#FF2E2E`** at x 510. Labels Silkscreen 34. This red button is the single object in the whole film filled with brand red.

**Motion**
- **18.50** a **touch ripple** (stroked `#FFFFFF` circle, r 20 → 90, alpha 0.5 → 0 over 0.30 s, plus a filled 14 px dot) lands on the red button; it depresses, `Status` flips to `Offline` in §7, the console prints `[System] Bot gestoppt.`
- **18.75–19.30** a faint 24 px trailing dot arcs from the red button back toward it — **visible finger travel between taps**, so the input device change is legible rather than implied.
- **19.40** a second ripple: the button re-labels `BOT STARTEN` in `#55FF55`, `Status` returns to `Online`, console prints `[System] Bot gestartet.`
- **19.50 (beat 10.4)** GUI CLOSE over the 3 frames ending on 19.50; back to the world.

**Must not be got wrong:** the change from **ghost press** (every other button in the film) to **finger ripple** (only here) is the entire "from your phone" argument. If the ripples are subtle, the beat says nothing. Ripple stroke width 4 px, and the two taps must be unmistakably a *touch*, not a click.

---

### S8 · 20.000 – 23.000 · **Das Buch**
**Fact 8 — allowed and recommended by the HugoSMP team. No cheat, just AFK.**

**Copy**
Page 1: `Vom HugoSMP-Team` (550) / `erlaubt und` (360) / `empfohlen.` (325) / *(blank line)* / `Kein Cheat.` (330) / `Nur AFK.` (250) — all Silkscreen **40**
Page 2: `— HugoSMP-Team` (Silkscreen 40) / `Schriftlich bestätigt.` (Silkscreen 32, 528) / `Seite 2 von 2` (Silkscreen 24, 234)

**Drawn**
**20.00 (bar 11.1)** GUI OPEN with dim **0.60** and a written book opens: a **700×840 parchment page at (190, 400)**, fill `PERGAMENT #DCC9A0`, 3 px `#8C7A56` border, a 6 px `#C4B08A` spine line inset 40 px from the left, and a faint `rgba(0,0,0,0.06)` vertical gradient along the spine so the page has a fold. Ink is Silkscreen 40 in `TINTE #3B2E1C`, left-aligned at x 275 (measure 615 px), line height 72, **no drop shadow**.

**Motion**
- Lines appear one per beat with `drawKinetic 'type'` at **45 characters per second** — a quill, not a slam: `Vom HugoSMP-Team` at 20.40, `erlaubt und` at 20.90 with **the word `erlaubt` in `TINTE_GRÜN #3F7A2E`**, `empfohlen.` at 21.40, then after a blank line `Kein Cheat.` at 21.90 and `Nur AFK.` at 22.40.
- **22.40 → 23.00 the light behind the book shifts from day to golden hour** — the sky gradient lerps `TAG` → `GOLD` over 18 frames — so that when the book closes the world is already at golden hour and no cut is needed at the scene boundary.
- **22.40 (bar 12.2)** the page turns **the way vanilla turns a page**: a 2-frame hold, the new page simply there, plus one frame of the page edge shifted 6 px. No flip, no curl, no mirrored ink, no shading gradient.
- **23.00 (bar 12.3)** GUI CLOSE over the 3 frames ending on 23.00.

**This beat is calm, not frozen.** The world behind the 0.60 dim keeps living for all three seconds: clouds drift, the leaf canopy sways, a torch flickers, and **the bot is visibly still working behind the parchment**, breaking a pumpkin on 21.00 and 22.00. The bot's arm swing stops (that is the calm), but the frame never stalls. This directly answers the retention risk at second 20 without giving up the alignment to the music's break at 20.5–23.5.

**Must not be got wrong:** there is no badge, no seal, no ring, no tick, no green `#4ADE80` anywhere in this beat. A signed book from the server team is exactly how a Minecraft player understands an official permission, and it is more credible than the badge it replaces.

---

### S9 · 23.000 – 26.000 · **Goldstunde**
**Fact 9 — launch 20.09.2026.**

**Copy**
Oak sign, 4 lines: `HugoAFK` (276) / `startet` (258.8) / `20.09.2026` (368) / `HugoAFK.com` (425.5) — Silkscreen **46**, `SCHILD_TINTE #2B2013`, centred on the board, **no shadow**
`/title`: **`20.09.2026`** (Silkscreen 94, 752) / subtitle `auf dem HugoSMP` (Silkscreen 46, `#FFFF55`, 569.3)

**Drawn**
The film's third and last colour state. Sky `#4E74C8` (top) → `#F3B453` (horizon), a 92×92 `#FFE9A8` sun sitting low at (300, 640), the world layer multiplied by `rgba(255,168,74,0.16)`, clouds warm grey-orange.

**No block cast shadows.** Vanilla has none. Instead: **warm the west-facing faces** — draw `texFace(name, 1)` for the left faces with an extra `rgba(255,168,74,0.18)` fill, and keep only the entity blob shadow under the bot. Fewer draw calls and more Minecraft.

**Motion**
- **23.20–24.60** the camera makes its second and final mouse-look pan, back **left** across the farm on `E.inOutCubic` (camX −5.4 blocks), coming to rest on an **oak sign** on a fence post at the field edge: a **560×300 board** of `oak_planks` texture at (250, 800) with a 3 px `#3D2B17` border and two 40×160 posts below at y 1100..1260.
- Sign lines appear **one per beat** from 23.50 at baselines 840 / 902 / 964 / 1026: `HugoAFK` at 23.50, `startet` at 24.00, `20.09.2026` at 24.50, `HugoAFK.com` at 25.00. **This places the date AND the address inside the world, as an object, before either is ever said as a headline.**
- **24.50–24.63** the `/title` fades in over the top at fixed scale: `20.09.2026` (Silkscreen 94, `#FFFFFF` + 8 px `#3F3F3F` shadow, centred, y 560) with subtitle `auf dem HugoSMP` (Silkscreen 46, `#FFFF55`, y 690). Holds to 25.60, fades out over 6 frames.
- **25.00–26.00** a 1.0 s F5 profile shot: the bot walks left → right toward the sign with a full walk cycle (`mcPlayer walk: 1, stepRate: 4.4`), nametag above, blob shadow beneath, sun sinking 30 px.

**Must not be got wrong:** the rhythm of this beat is carried by the four sign lines landing on 23.50 / 24.00 / 24.50 / 25.00. **The beat is in the world, not in the cut.** If the sign lines are not on the beat, the scene has no pulse and the `/title` has to carry it alone.

---

### S10 · 26.000 – 30.000 · **Vormerken**
**Fact 10 — HugoAFK.com; save the date.**

**Copy**
Screen title `Vormerken` (Silkscreen 44, 352) · field `Server` = `HugoSMP` · field `AFK-Client` = **`HugoAFK.com`** (types itself) · field `Start` = `20.09.2026` · button `Fertig` · footer `Bleib online. Auch offline.` (Silkscreen 34, 680)
Chat, final line: `[HugoAFK] Bis morgen.` (§7, VT323 44, 369.6)

**Drawn — 26.000 to 28.000 (the form)**
**26.00 (bar 14.1)** 2-frame black, then Minecraft's add-server form, **honestly relabelled so it can never imply that HugoAFK.com is a Minecraft address**: the screen is titled `Vormerken` and the fields separate the two things explicitly.

`MENU_ERDE` background. `IMG.logo` centred at width **420** (h 266), top y 320 — framed by the dirt background and the form below it, part of the panel, never a floating lockup. `Vormerken` (Silkscreen 44, white + shadow, centred, y 640).

Three vanilla text fields, each a **700×80 box at x 190**, `rgba(0,0,0,0.85)` fill, 2 px `#A0A0A0` border, label in VT323 34 `#AAAAAA` 30 px above:
- `Server` → `HugoSMP` (VT323 46 white, 128.8) at y 730
- `AFK-Client` → `HugoAFK.com` (**Silkscreen 52 white, 481 px**) at y 880
- `Start` → `20.09.2026` (VT323 46 white, 184) at y 1030

`Fertig` button **700×88 at (190, 1180)**, label Silkscreen 36 (162 px). Footer `Bleib online. Auch offline.` (Silkscreen 34 `#AAAAAA`, centred, y 1330).

**Motion — the hands come back**
- **26.30** the white pixel cursor slides in from the bottom-right along the same path it left by at 2.00, and hovers the `AFK-Client` field, whose border turns `#FFFFFF`.
- **26.40** it clicks; the field takes the caret.
- **26.40–27.10** `HugoAFK.com` **types itself character by character** with the vanilla blinking block cursor — the viewer literally watches the address get entered.
- **27.25** the cursor moves to `Fertig` (vanilla **hover**: `BUTTON_HELL #8B8B8B` + white outline — not the ghost press, because a hand is on it now) and clicks. The button depresses 2 px.
- **27.50** the `20.09.2026` field gets a single one-shot `#FFFF55` border highlight for 0.30 s, then back to grey.
- **28.00 (bar 15.1)** GUI CLOSE over the 3 frames ending on 28.00.

**Drawn — 28.000 to 30.000 (the close)**
The form closes and the film lands back in the world, at golden hour, on its best-looking material: a 2.0 s F5 profile shot of the bot standing beside the oak sign, sun lower than at 25.00, blob shadow long, nametag above, idle bob. The sign carries all four lines including **`20.09.2026`** and **`HugoAFK.com`**. HUD present. Clouds drifting. Session clock ticking in the F3 corner.

- **28.60** the film's last chat line lands: `[HugoAFK] Bis morgen.` (§7) — **the bot answering, 28 seconds later, the human line the film opened with.** Two voices, one bookend. The human speaks exactly twice in the film (frame 0 and 18.60 in the console); the bot speaks throughout.
- **29.00–30.00** nothing moves except the world: clouds, the bot's idle bob, the ticking clock, a torch. **No fade to black.** Frame 899 is a finished, fully legible game frame carrying every fact: the logo (in the previous screen's memory), HugoSMP, HugoAFK.com, 20.09.2026, and the claim.

**Must not be got wrong:** two things. (1) The film must **not** end on grey chrome — a launch film's last frame should be its strongest image, and that is the golden-hour sign. (2) `HugoAFK.com` must never read as a server address; the `Server: HugoSMP` / `AFK-Client: HugoAFK.com` split and the `Vormerken` title are what keep that honest, and they may not be edited away for brevity.

---

## 9 · AUDIO NOTES

The visuals no longer contain a single trailer FX hit, so the score's job changes: **it stops punctuating effects and starts punctuating game events.** Every cue below is a visible on-screen event, so the score and the picture lock without the composer needing to see the render. All timestamps absolute; grid 120 BPM.

### 9.1 Global

- Keep the 120 BPM grid and the existing section map (intro / drop / drive / break / build / outro), because the client will lay "Lights" over it in the TikTok editor and needs the bar lines where he expects them.
- **Remove every riser, whoosh and braam that used to sit before a cut.** There are no whip pans or flash cuts left for them to cover; a riser into a 2-frame black hold sounds like a mistake.
- **Remove the stutter/glitch bed at 12.0 and 15.0.** `Engine.remapTime` is gone with the `stutter` transition entry, so the picture no longer stutters there.
- The film's texture is *interface*, so the sound design should be **short, dry, mid-range and unreverbed** — the vanilla UI vocabulary: the wooden button click, the item-pickup pop, the advancement chime, the level-up chime, the page-turn rustle. Nothing with a long tail. Nothing sub-40 Hz except the one drop at 3.00.

### 9.2 Cue sheet

| t (s) | Event on screen | Cue |
|---|---|---|
| 0.00 | night world, pause menu open | low drone, ~55 Hz, night ambience; two soft mallet notes at 0.50 and 1.50 |
| 0.25 / 0.75 / 1.25 | pumpkins finish breaking behind the dim | three dry wood-break ticks, −18 dB, slightly detuned each time |
| 1.50 | cursor reaches the button (hover) | nothing — silence buys the click |
| **2.00** | **the click; screen to black; cursor exits** | **the vanilla UI click: a 2-frame square blip ~1.2 kHz, dry.** Then the drone cuts to silence in 2 frames. |
| 2.05 / 2.55 | the two chat lines type on black | two short "pop" blips, 3 dB apart |
| 2.85–3.00 | held black | absolute silence — 0.15 s |
| **3.00** | **STRAIGHT CUT night → day** | **the drop.** Impact + sub. This is the film's single biggest hit and it lands on a *cut in the light*, not on a flash. Beat enters: kick on every beat, hats on eighths. |
| 3.50 | first advancement toast slides in | **the vanilla advancement chime** (a bright two-note bell). Use it for every toast in the film — it is the film's signature SFX. |
| 4.00 / 5.00 / 6.00 / 7.00 | four screen swaps | one dry click each, same sample as 2.00 at −6 dB. No whoosh. |
| 4.50 | join button presses itself | the click sample, but **pitched down 2 semitones** — this is the film's "no hands" signature: every unattended press is the click, detuned. |
| 5.05 | `/title` BLEIB ONLINE. fades in | a single warm pad swell, 0.4 s, no impact |
| 6.05–6.90 | loading bar, 8 notches on the 16ths | eight tiny ticks on the sixteenths — the bar *is* the hi-hat for that bar |
| 7.02 | join `/title` IN DER CLOUD. | pad swell + one bell; arpeggio enters underneath |
| 8.50 / 9.50 / 10.50 | three toasts | advancement chime ×3, each a third higher |
| 9.00–11.60 | the mouse-look pan | no swoosh. Let the arp carry it. |
| 11.00 | inventory opens | vanilla chest/inventory open sound |
| 11.00–12.00 | 27 slots fill, 3 per 16th | item-pickup pops on the sixteenths, alternating pan ±20 % |
| 12.00 | `Voll` + red border flash | one dull thud, no reverb |
| 12.25–12.70 | `/sell` types itself | keyboard ticks per character, 40/s |
| 12.75–13.25 | slots empty row by row | four descending "drop" pops on the sixteenths |
| 13.40 | `[HugoAFK] Inventar verkauft.` (§a) | the vanilla **level-up** chime, once, quiet |
| 14.00 | red server broadcast + coordinate line | drums thin to kick only |
| **14.90** | `FX.shake` 2 px, disconnect | short low thud + the beat drops out for 0.4 s |
| 15.00 | disconnect screen | silence except a single sustained tone |
| 15.25 | `Erneut verbinden` presses itself | the detuned click — **loudest instance in the film.** This is the product's core moment. |
| 15.50–16.50 | loading bar again | eight ticks again; the kick returns on 16.00 |
| **16.50** | reconnect, identical frame, `FX.shake` | full beat returns on the downbeat, plus the level-up chime |
| 17.00 | control panel opens | inventory-open sound |
| 17.00–19.50 | console lines scroll, one per 0.25 s | a very quiet click per line — the film's hi-hat for this bar |
| 18.50 | **touch ripple** on `BOT STOPPEN` | a *different* sound from every click so far: a soft, damped **tap** with a short low body. The device change must be audible as well as visible. |
| 19.40 | second ripple, `BOT STARTEN` | the same tap, then the level-up chime |
| **20.50** | (music) break begins, book open at 20.00 | **drums out.** Warm pad chord. |
| 20.40 / 20.90 / 21.40 / 21.90 / 22.40 | five book lines write on | one quill scratch per line, dry, 0.15 s, no pitch |
| 22.40 | page turn | the vanilla page-turn rustle |
| **23.00** | book closes → golden hour | one confirmation ping; pad resolves |
| **23.50** | (music) build begins | kick on eighths |
| 23.50 / 24.00 / 24.50 / 25.00 | four sign lines carve on | four wood taps on the beats — **the build's percussion is the sign** |
| 24.50 | `/title` 20.09.2026 | one bell + sub, no riser |
| 25.00 | kick to sixteenths | — |
| 25.85–26.00 | 0.15 s of silence | hold it exactly |
| **26.00** | Vormerken form appears | **final impact.** Half-time kicks from here. |
| 26.40–27.10 | `HugoAFK.com` types itself | keyboard ticks, 15/s — the most important sound in the last four seconds |
| 27.25 | `Fertig` clicked **by the cursor** | the **original, un-detuned** click sample. The hands are back, and the ear should notice. |
| 28.00 | form closes → the world | one soft whoosh down; music thins to pad + a single arp line |
| 28.60 | `[HugoAFK] Bis morgen.` | one last quiet chat pop |
| 29.00–30.00 | the world holds | pad decays cleanly; **no hard stop, no fade-to-silence cut.** True peak ≤ −1 dBTP. |

### 9.3 The one structural note for the composer

The film has **exactly three loud moments**: 3.00 (night → day), 15.25 (the button that presses itself), 26.00 (the form). Everything else is small, dry and on the grid. If more than three things are loud, the score is fighting a picture that has deliberately given up spectacle.

---

## 10 · IMPLEMENTATION NOTES

### 10.1 Architecture — read this before writing any scene

**One shared kit, loaded before every scene file.** More than half the film is the same six objects redrawn in ten files. `STYLE.md`'s rule ("define helpers at the top of YOUR file, prefixed with your scene id") would produce ten different drop shadows, ten different panels and ten different toasts. That is the single largest quality risk in this direction.

**Integrator task 1 — create `render/scenes/mc_kit.js` and add one `<script>` tag to `render/index.html` immediately before `scenes/__demo.js`.** It defines a single global `MC`:

| Symbol | Purpose |
|---|---|
| `MC.C` | every palette token from §3 |
| `MC.text(ctx, s, x, y, o)` | the mandatory double-draw drop shadow (§4.1) |
| `MC.title(ctx, title, sub, t, t0, hold)` | the vanilla `/title` (alpha only, fixed scale) |
| `MC.world(ctx, t, o)` | sky + clouds + sun/moon + ground strips + fog + horizon silhouette |
| `MC.blocks(ctx, cells, cam)` | the perspective block field (§10.2) |
| `MC.texQuad(ctx, img, p0,p1,p2,p3, n)` | textured general quad by n affine strips — **the one new primitive** |
| `MC.arm(ctx, t, swing, held)` | the first-person arm |
| `MC.panel / MC.button / MC.slot / MC.toast / MC.field / MC.loadingBar / MC.dirtBg` | vanilla GUI chrome |
| `MC.cursor(ctx, x, y, trail)` / `MC.ripple(ctx, x, y, p)` | the motion signature |
| `MC.chat(ctx, lines, t)` / `MC.f3(ctx, t)` / `MC.hud(ctx, t)` | screen-space HUD |
| `MC.break(ctx, x, y, s, stage)` / `MC.particles(ctx, x, y, t, t0, kind)` | crack overlay + break particles |
| `MC.hudMode` | per-frame flag: `0` none · `1` full · `2` behind a GUI (dimmed) |

**Integrator task 2 — `TL.overlay` owns the HUD.** The engine already calls `TLx.overlay(s, t)` after every scene draw (`engine.js`, `Engine.renderFrame`). Set `TL.overlay = (ctx, t) => MC.hud(ctx, t)`. Each scene sets `MC.hudMode` every frame; the overlay reads it. This is what makes "the HUD never moves" a *guarantee* rather than a convention — the crosshair, hotbar, hearts, XP bar, chat and F3 are drawn once, by one function, in identical screen coordinates, in all 900 frames.

**Integrator task 3 — rewrite `render/timeline.js`:**
```
TL windows: 0/4/6/8/11/14/17/20/23/26/30, no `src` remapping on any scene.
TL.transitions = []            // empty. No fade-from-black either — frame 0 is the cover frame.
TL.fx = null                   // (or an empty function). It currently ASSIGNS scan/vignette/grain
                               // AFTER the scene draws and would override every scene's values.
TL.overlay = (ctx, t) => MC.hud(ctx, t);
```
Emptying `transitions` also removes the only `stutter` entry, which disables `Engine.remapTime` — without that, frames 355–360 are time-remapped and the film is not a pure function of `t`.

**Integrator task 4 — `render/tokens.js`:** `fx: { grain: 0.014, vignette: 0.05, scan: 0, bloom: 0, bloomBlur: 0 }`. `resetFX()` merges `TOKENS.fx` on **every frame before the scene draws**, so this is the only place the near-zero post chain can be guaranteed. Scenes must not re-raise it. **`engine.js` is never edited.**

**Integrator task 5 — a render-time assertion.** After `TL.fx`, assert `FX.bloom === 0 && FX.flash === 0 && FX.rgb === 0 && FX.glitch === 0 && FX.invert === 0 && FX.zoom === 1` on every one of the 900 frames, and fail the build otherwise. The escape list in §2 is only real if it is enforced.

### 10.2 The load-bearing trick: the perspective ground

The one thing everything else stands on. **Verified: a judge prototyped exactly this construction and measured 20.7 ms/frame against a 250 ms budget.**

```
Horizon      yH = 700
Focal        C  = 1060            (horizontal px per block at z = 1)
Ground const K  = 1717            (= C · eye height 1.62)
Ground y     y(z) = yH + K/z
Block edge   s(z) = C/z
Screen x     x(wx, z) = 540 + (wx − camX) · C/z
```
Sanity: `y(1.41) = 1920` (bottom of frame) · `y(2.38) = 1420` (safe bottom) · `y(5.72) = 1000` · `y(26) = 766` · `s(4) = 265 px`. Pitch = `atan((960−700)/1060)` = **13.8°** down, which keeps top faces thin.

**Ground:** 26 strips, geometric z spacing `z_k = 1.4 · 1.1189^k`, k = 0..26. Strip k spans `y(z_{k+1})` to `y(z_k)`. Fill each with **one** `fillRect` whose `fillStyle` is `ctx.createPattern(texFace(name, 0, true), 'repeat')` under `ctx.setTransform(sTile, 0, 0, hStrip/16, tx, ty)`, where `sTile = (C/z)/16` and `tx = −(camX · C/z) mod (C/z)`.
- **`flat = true` is mandatory.** `texFace(name, 0)` without it bakes a radial AO vignette into the tile, which then repeats as a dark blob per tile — catastrophic at the near rows where one tile spans 700 px.
- `ctx.imageSmoothingEnabled = false` before every pattern fill (set it inside the helper; `save`/`restore` resets it).
- Build the 26 patterns **once at module top level**, one per texture name. Only the `setTransform` changes per strip.

**Fog + horizon (the highest-value single addition).** Without it the ground reads as horizontal colour bands, not as distance. Per strip beyond z ≥ 6, overlay one extra `fillRect` in the sky's horizon colour at `alpha = clamp((z − 6)/20) · 0.55`. Then draw, at z = 26..30 under the same fog: a low row of `oak_log_side` / `oak_leaves` blocks, two fence posts, and a 16 px hill silhouette band across the full frame width at y 690..706 in the horizon colour mixed 0.70 toward the sky. **Roughly 45 % of the runtime lives in world shots; this pass is what makes them read.**

**Blocks.** Project the 8 corners exactly with the formulas above, then:
- **Front face** (constant depth) projects to an exact axis-aligned rectangle → **one `_face`**, geometrically correct.
- **Top face** is a trapezoid, not a parallelogram. `_face` is affine, so slice it: **6 horizontal strips for z < 6, 3 strips for 6 ≤ z < 12, 1 beyond.** At z = 3 the un-sliced width error is 25 % and reads as wallpaper; at z ≥ 12 it is under 4 % and invisible.
- **Side face** only when `|x − 540| > 300 px`, sliced into **3 vertical strips**. Without it, off-centre blocks read as cardboard cut-outs standing on a sliding floor.
- Painter's order = descending z. One sort per frame.
- The farm never exceeds ~140 visible blocks → ≈ 4 `drawImage` per block ≈ **560 tiny drawImages**, far under budget.

### 10.3 Per-scene primitive map

| Scene | Existing engine primitives | New (in `mc_kit.js`) |
|---|---|---|
| S1 | `nightSky`, `texFace`, `_face`, `blockIcon`, `mcPlayer`, `isoPos` | `MC.world`, `MC.panel/button`, `MC.cursor`, `MC.particles`, `MC.break`, `MC.toast` |
| S2 | `drawImage(IMG.logo)`, `drawText`, `measureText` | `MC.dirtBg`, `MC.field`(row), `MC.button`(ghost), `MC.title` |
| S3 | `drawImage(IMG.logo)` | `MC.loadingBar`, `MC.f3`, `MC.title` |
| S4 | `texFace`, `_face`, `itemIcon`, `pixelSprite`, `mcSlot`(hotbar only) | `MC.blocks`(pan), `MC.toast` ×3, `MC.arm` |
| S5 | `mcPlayer` (inventory portrait), `itemIcon`, `blockIcon` | `MC.panel`, **`MC.slot`** (must replace `mcSlot`), `MC.chatInput`, suggestion box |
| S6 | `drawText`, `measureText` | `MC.dirtBg`, `MC.button`(ghost), `MC.loadingBar`, `MC.f3`, `MC.toast` |
| S7 | `drawText` (VT323 weight 400) | `MC.console`, `MC.statRow`, `MC.button`(thumb), **`MC.ripple`** |
| S8 | `drawKinetic 'type'` | `MC.book`, `MC.pageSwap` |
| S9 | `texFace`, `_face`, `mcPlayer`(walk) | `MC.sign`, `MC.title`, golden-hour face warming |
| S10 | `drawImage(IMG.logo)`, `drawKinetic 'type'` | `MC.dirtBg`, `MC.field` ×3, `MC.button`, `MC.cursor` |

**Verified against `engine.js`, not the API doc:** `texFace`, `_face`, `blockIcon`, `texCube`, `texField`, `isoBox`, `isoPos`, `mcPlayer`, `mcSlot`, `mcHotbar`, `mcChat`, `pixelSprite`, `itemIcon`, `SPRITES`, `shade`, `hash1/2`, `rng`, `noise1`, `IMG`, `TL.overlay` are all top-level globals and directly callable from a scene file. Every texture named in this document exists in `TEX_META.index`. Every sprite named (`sea_pickle`, `rotten_flesh`, `bone`, `string`, `gunpowder`, `emerald`, `spawner`, `pumpkin`) exists in `SPRITES` — note that `ENGINE_API.md`'s sprite list is stale and lists only 9 of 20. `player_shirt` in `tex.png` measures `#7B3DBD` — the bot wears the brand violet for free, with no tint pass.

### 10.4 Render-cost traps across 900 frames

1. **`FX.bloom` must be exactly 0.** The engine gate is `if (fx.bloom > 0.01)`; `0.03` still runs a full-frame `ctx.filter = 'blur(26px) contrast(1.5)'` plus a `drawImage` — about 30 ms on every one of the 900 frames, and it contradicts the flatness rationale.
2. **`pixelSprite` is one `fillRect` per non-transparent pixel.** Ten hearts + ten hunger icons + nine hotbar items is 2000–4000 `fillRect` per frame. **Pre-render every repeated sprite once at module top level** (hearts, hunger, cursor, crosshair, all item icons) into small offscreen canvases via `makeCanvas`, and `drawImage` them.
3. **`createPattern` per frame allocates.** Build all ground patterns once at module top level.
4. **`texFace` caches by `name + level + flat`** — always pass the same `flat` value for the same use, or you double the cache and the memory.
5. **Never call a blurred primitive.** `glow`, `glowText`, `dot`, `flare`, `lightSweep`, `shockwave`, `burst`, `Particles`, `Warp`, `sphereCloud`, `constellation` — every one of them is on the escape list, and most cost a software blur pass. **There must be zero `ctx.filter` calls in the whole film.**
6. **The mandatory drop shadow doubles every text call.** Budget ≤ 40 strings per frame → ≤ 80 `fillText`. Do not add a third pass; the shadow is one extra draw, not an outline.
7. **`drawText` defaults to `weight: 700`.** VT323 and Press Start 2P ship 400 only. Every call must pass `weight: 400` or Chromium synthesises a faux bold and the pixel type turns to mush.
8. **`mcSlot` is unusable on the grey inventory panel** — its hard-coded `rgba(20,20,26,0.82)` fill and `rgba(255,255,255,0.16)` / `rgba(0,0,0,0.5)` bevels are inverted for a vanilla slot on `#C6C6C6`. Use `MC.slot`. `mcSlot` is fine for the dark hotbar.
9. **`mcItem` routes pumpkin / chest / spawner through `blockIcon`** (isometric). That is correct for inventory icons and correct for toasts. Use `itemIcon` for flat sprites.
10. **Determinism.** All cloud x-positions, star field, particle velocities, console line schedule and block-break offsets are built at module top level with `rng(seed)` / `hash2`. The session clock is `floor(t)`-derived. No `Math.random`, no `Date`, no accumulators, no state between frames.
11. **No `xfade` anywhere** — it is the engine's only two-scene-per-frame path and would double the draw cost.
12. **Cost estimate per world frame:** 26 ground fills + 20 fog fills + ≈ 560 block `drawImage` + ≈ 30 cloud/HUD rects + ≤ 80 text calls, with zero full-frame blur. Comfortably inside 250 ms and **markedly cheaper than the rejected version**, whose per-frame bloom pass alone cost ~30 ms.

### 10.5 Build gate — prototype before committing the film

Render exactly four frames and look at them at full resolution before any scene beyond S1 is written:

`t = 0.000` (the cover frame: pause menu chrome over the night world) · `t = 3.000` (the day cut) · `t = 9.500` (mid-pan, off-centre blocks) · `t = 28.500` (the closing F5 shot at golden hour)

Check, in this order: (1) do off-centre blocks still read as blocks, or as flat cut-outs? (2) does the ground read as distance, or as horizontal bands? (3) does the `mcPlayer` in the F5 shot look planted or pasted? (4) is `Spiel pausiert` legible at 28 % scale? If any answer is wrong, fix `MC.world` / `MC.blocks` before ten authors build on top of it.

---

## APPENDIX · Judge fixes applied, and the four rejected

**Applied in full:** frame-0 re-cut to the pause menu · an event inside the first 8 frames · the cursor staged as a visible departure and return · the floating-HUD fix · the cloud fact promoted to a headline-scale `/title` · load-bearing strings raised to ≥ 34 px and the reset proof promoted out of the F3 corner into a 44 px chat line · the phone header raised to Silkscreen 44 and finger travel added · the close rebuilt to end on the golden-hour sign · the `timeline.js` / `tokens.js` integrator step written down · the world prototype made a build gate · F5 re-specified as profile shots · fog + horizon silhouette pass · `flat = true` on the ground · top-face slicing · `FX.bloom = 0` exactly · golden-hour cast shadows cut in favour of warmed west faces · the book page-flip replaced with the vanilla page swap · pixel sprites pre-rendered · full vanilla inventory furniture and a proper toast frame.

**Grafted from runners-up:** the two-voice bookend (KAPITEL 01 — the human speaks twice, the bot answers at 28.60) · the mandatory `fit()` measure pass on every string (SETZKASTEN) · "the instrument does not stop when the ad does" — the world, the clock and the chat keep running to frame 899 with no fade (ENDLOSPAPIER) · one shared drawing kit sanctioned up front so ten authors cannot diverge (BAUPLAN's `drawStation` contract, adapted).

**Rejected, and why:**

1. **"Narrow the control panel to ~640 px with the world visible on both sides so it reads as a portrait window" (S7).** The frame is already 9:16. An inset panel with world showing on both sides is a phone mockup by another name — the exact object the direction bans. Phone-ness stays carried by input (ripples with visible travel), ergonomics (oversized bottom-anchored buttons) and one Silkscreen 44 header.
2. **"Extend the world crop so the hotbar sits at y ≈ 1380."** That parks the HUD directly under TikTok's caption block edge and crowds the safe box's bottom. The full-bleed game window (§5.1) solves the same problem better: the HUD sits at the real frame edges, TikTok's chrome covers it exactly as it covers every real Minecraft recording, and no fact is lost because nothing load-bearing lives there.
3. **"Hand-build a back-view player from `isoBox` for the sign walk."** `mcPlayer` cannot show a back view, but a side-on profile reads the walk cycle better, is authentic, and costs nothing. A 30-line hand-built player is new risk in a film that already carries ten scenes and a new ground renderer.
4. **"Shorten the book to 2 s and hand the second to golden hour."** The retention concern is real but the cause is misdiagnosed: the problem was that the world *froze* behind the parchment, not that the beat was three seconds. The book stays at 20.00–23.00 so it sits inside the score's break at 20.5–23.5, and the fix is applied where it belongs — the world keeps living behind the dim, the bot is visibly still working, and the light shifts to golden hour across 22.40–23.00 so the beat ends on a change rather than a hold.
5. **"Subdivide every block's top face into 8 strips (~2200 drawImages/frame)."** Accepted only for near blocks. The affine error is a function of `1/(z(z+1))`: 25 % at z = 3, under 4 % at z = 12. A global 8× multiplier pays everywhere for a defect that exists in the front two rows. The graded rule (6 / 3 / 1 strips) buys the same image for a fifth of the cost.