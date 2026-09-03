# Claude Fable 5.1 — Promo-Trailer (Hochkant 9:16)

30-sekündiger, vollständig prozedural gerenderter Tech-Trailer, in dem sich Claude Fable 5.1 selbst vorstellt.
Ergebnis: `Fable_5.1_Promo_iPhone.mp4` (1080 × 1920, 30 fps CFR, H.264 High, yuv420p, AAC-LC 48 kHz Stereo, Fast Start).

## Wie es entsteht

| Schritt | Werkzeug | Beschreibung |
|---|---|---|
| Storyboard | `storyboard.json` | 11 Szenen, 120 BPM, Palette, Typografie, Audio-Cues (Jury-Panel aus drei Konzepten) |
| Bild | `render/` | Canvas-2D-Engine (`engine.js`): kinetische Typografie, Partikel, 3D-Projektion, Glitch/RGB-Split/Bloom/Grain/Vignette, beat-synchrone Übergänge. Jede Szene ist eine reine Funktion der Zeit `t`. |
| Frames | `tools/render.js` | Headless Chromium (Playwright) rendert 900 PNG-Einzelbilder parallel |
| Ton | `audio/synth.py`, `audio/compose.py` | Komplett synthetisierter Score (numpy/scipy): Sub-Drone, Braams, Riser, Kicks, Hi-Hats, Arpeggio, Pads, Whooshes, Glitch-Stutter, Sub-Drop, Final Hit |
| Export | `tools/encode.sh` | ffmpeg (libx264 + AAC) mit iPhone-/Fotos-App-kompatiblen Einstellungen |
| Prüfung | `tools/verify.sh` | ffprobe + Box-Walk (moov vor mdat), Codec-/Profil-/Format-Checks |

```bash
pip3 install numpy scipy pillow imageio-ffmpeg   # ffmpeg-Binary kommt über imageio-ffmpeg
bash promo/build.sh                                # ~5 Minuten auf 4 Kernen
```

Vorschau einzelner Zeitpunkte: `node tools/render.js --out out/prev --times 5.2,7.9` und `python3 tools/sheet.py --frames out/prev --list 156,237 --out out/prev/sheet.png`.

Die Fonts (Inter, Space Grotesk, Syne, JetBrains Mono, Orbitron, Unbounded) stehen unter der SIL Open Font License, siehe `render/fonts/LICENSE.txt`.
