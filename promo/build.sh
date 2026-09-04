#!/usr/bin/env bash
# Full pipeline: soundtrack → 900 frames → H.264/AAC MP4 → verification.
#   bash promo/build.sh            (final quality, preset slow)
#   PRESET=medium bash promo/build.sh
set -euo pipefail
cd "$(dirname "$0")"
export NODE_PATH="${NODE_PATH:-$(npm root -g)}"
OUT="${OUT:-Fable_5.1_Promo_iPhone.mp4}"
echo "== 1/4 soundtrack"; python3 audio/compose.py out/audio.wav
echo "== 2/4 frames";     node tools/render.js --out out/frames --start 0 --end 900 --workers "${WORKERS:-3}"
echo "== 3/4 encode";     FRAMES=out/frames AUDIO=out/audio.wav OUT="$OUT" PRESET="${PRESET:-slow}" CRF="${CRF:-18}" bash tools/encode.sh
echo "== 4/4 verify";     bash tools/verify.sh "$OUT"
