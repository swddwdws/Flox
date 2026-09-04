#!/usr/bin/env bash
# Encode PNG frames + WAV into an iPhone-compatible MP4.
# H.264 High, yuv420p, constant 30 fps, AAC-LC 48 kHz stereo, faststart.
set -euo pipefail
cd "$(dirname "$0")/.."
FF="${FFMPEG:-$(python3 -c 'import imageio_ffmpeg;print(imageio_ffmpeg.get_ffmpeg_exe())')}"
FRAMES="${FRAMES:-out/frames}"
AUDIO="${AUDIO:-out/audio.wav}"
OUT="${OUT:-out/Fable_5.1_Promo_iPhone.mp4}"
PRESET="${PRESET:-slow}"
CRF="${CRF:-18}"
DUR="${DUR:-30}"
if [ -f "$AUDIO" ]; then AIN=(-i "$AUDIO"); AOPT=(-c:a aac -profile:a aac_low -b:a 256k -ar 48000 -ac 2); else AIN=(); AOPT=(-an); fi
"$FF" -y -hide_banner -loglevel warning -stats \
  -framerate 30 -start_number "${START:-0}" -i "$FRAMES/f%04d.png" "${AIN[@]}" \
  -map 0:v:0 $( [ -f "$AUDIO" ] && echo "-map 1:a:0" ) \
  -c:v libx264 -preset "$PRESET" -crf "$CRF" -profile:v high -level 4.1 -pix_fmt yuv420p \
  -x264-params "keyint=60:min-keyint=30:scenecut=40" -maxrate 18M -bufsize 27M \
  -r 30 -fps_mode cfr -vf "format=yuv420p,setsar=1" \
  -colorspace bt709 -color_primaries bt709 -color_trc bt709 -color_range tv \
  "${AOPT[@]}" -t "$DUR" -shortest \
  -movflags +faststart -tag:v avc1 "$OUT"
echo "wrote $OUT ($(stat -c %s "$OUT") bytes)"
