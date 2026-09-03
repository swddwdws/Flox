#!/usr/bin/env bash
# Verify the MP4 meets the iPhone/Photos delivery spec. Exit 1 on any failure.
set -uo pipefail
cd "$(dirname "$0")/.."
FF="${FFMPEG:-$(python3 -c 'import imageio_ffmpeg;print(imageio_ffmpeg.get_ffmpeg_exe())')}"
FP="$(dirname "$FF")/ffprobe-linux-x86_64-v7.0.2"; [ -x "$FP" ] || FP="$(command -v ffprobe || true)"
F="${1:-out/Fable_5.1_Promo_iPhone.mp4}"
fail=0; ok(){ echo "  ok   $1"; }; bad(){ echo "  FAIL $1"; fail=1; }
echo "== $F =="
if [ -n "$FP" ] && [ -x "$FP" ]; then
  "$FP" -v error -show_entries stream=codec_type,codec_name,profile,level,width,height,pix_fmt,r_frame_rate,avg_frame_rate,sample_rate,channels,nb_frames,codec_tag_string -show_entries format=format_name,duration,size,bit_rate -of default=nw=1 "$F"
fi
python3 - "$F" <<'PY'
import struct, sys, subprocess, json, os
f = sys.argv[1]
fail = 0
def ok(m): print('  ok  ', m)
def bad(m):
    global fail; print('  FAIL', m); fail = 1
if not f.lower().endswith('.mp4'): bad('extension is not .mp4')
else: ok('extension .mp4')
# top-level box walk: moov must precede mdat (faststart)
boxes = []
with open(f, 'rb') as fh:
    size = os.path.getsize(f); pos = 0
    while pos + 8 <= size:
        fh.seek(pos); hdr = fh.read(8); bl, bt = struct.unpack('>I4s', hdr); bt = bt.decode('latin1')
        if bl == 1: bl = struct.unpack('>Q', fh.read(8))[0]
        elif bl == 0: bl = size - pos
        boxes.append((bt, pos, bl)); pos += bl
names = [b[0] for b in boxes]
print('  boxes:', ' '.join(f'{n}@{p}' for n, p, _ in boxes))
if 'moov' in names and 'mdat' in names and names.index('moov') < names.index('mdat'): ok('faststart: moov before mdat')
else: bad('moov is not before mdat (faststart missing)')
if names[0] == 'ftyp':
    with open(f, 'rb') as fh:
        fh.seek(boxes[0][1] + 8); d = fh.read(boxes[0][2] - 8)
    major = d[:4].decode('latin1'); compat = [d[i:i+4].decode('latin1') for i in range(8, len(d), 4)]
    print('  ftyp major=%s compatible=%s' % (major, ','.join(compat)))
    if major in ('isom', 'mp42', 'M4V ', 'avc1') or 'mp42' in compat or 'isom' in compat: ok('ftyp brand acceptable for iOS')
    else: bad('unexpected ftyp brand ' + major)
else: bad('first box is not ftyp')
# ffprobe json
ff = os.environ.get('FFMPEG') or subprocess.check_output(['python3', '-c', 'import imageio_ffmpeg;print(imageio_ffmpeg.get_ffmpeg_exe())']).decode().strip()
fp = os.path.join(os.path.dirname(ff), 'ffprobe-linux-x86_64-v7.0.2')
if not os.path.exists(fp):
    # fall back: ffmpeg -i parsing
    out = subprocess.run([ff, '-i', f], capture_output=True, text=True).stderr
    print(out)
    v = 'Video: h264' in out and 'yuv420p' in out and '1080x1920' in out and '30 fps' in out
    a = 'Audio: aac (LC)' in out and '48000 Hz' in out and 'stereo' in out
    (ok if v else bad)('video stream h264/yuv420p/1080x1920/30fps (ffmpeg -i parse)')
    (ok if a else bad)('audio stream aac LC 48 kHz stereo (ffmpeg -i parse)')
else:
    j = json.loads(subprocess.check_output([fp, '-v', 'error', '-show_streams', '-show_format', '-count_frames', '-of', 'json', f]))
    vs = [s for s in j['streams'] if s['codec_type'] == 'video']; as_ = [s for s in j['streams'] if s['codec_type'] == 'audio']
    if len(vs) != 1: bad('expected exactly 1 video stream, got %d' % len(vs))
    if len(as_) != 1: bad('expected exactly 1 audio stream, got %d' % len(as_))
    if vs:
        v = vs[0]
        (ok if v['codec_name'] == 'h264' else bad)('video codec h264 (%s)' % v['codec_name'])
        (ok if v.get('profile') in ('High', 'Main', 'Baseline', 'Constrained Baseline') else bad)('h264 profile %s' % v.get('profile'))
        (ok if int(v.get('level', 0)) <= 51 else bad)('h264 level %s' % v.get('level'))
        (ok if v['pix_fmt'] == 'yuv420p' else bad)('pix_fmt %s' % v['pix_fmt'])
        (ok if (v['width'], v['height']) == (1080, 1920) else bad)('resolution %sx%s' % (v['width'], v['height']))
        (ok if v['r_frame_rate'] == '30/1' and v['avg_frame_rate'] == '30/1' else bad)('frame rate r=%s avg=%s' % (v['r_frame_rate'], v['avg_frame_rate']))
        nf = int(v.get('nb_read_frames', v.get('nb_frames', 0)))
        (ok if 895 <= nf <= 905 else bad)('frame count %d' % nf)
        (ok if v.get('codec_tag_string') == 'avc1' else bad)('codec tag %s' % v.get('codec_tag_string'))
        d = float(v.get('duration', 0)); (ok if 29.5 <= d <= 30.5 else bad)('video duration %.3f s' % d)
    if as_:
        a = as_[0]
        (ok if a['codec_name'] == 'aac' else bad)('audio codec aac (%s)' % a['codec_name'])
        (ok if a.get('profile') == 'LC' else bad)('aac profile %s' % a.get('profile'))
        (ok if a['sample_rate'] == '48000' else bad)('sample rate %s' % a['sample_rate'])
        (ok if a['channels'] == 2 else bad)('channels %s' % a['channels'])
        d = float(a.get('duration', 0)); (ok if 29.5 <= d <= 30.6 else bad)('audio duration %.3f s' % d)
    fm = j['format']
    # decoded audio true peak (4x oversampled) must stay below -1 dBTP; also confirm not silent and no DC offset
    try:
        import numpy as np
        from scipy import signal as sg
        raw = subprocess.run([ff, '-v', 'error', '-i', f, '-map', '0:a:0', '-f', 'f32le', '-ac', '2', '-ar', '48000', '-'], capture_output=True).stdout
        a = np.frombuffer(raw, dtype=np.float32).reshape(-1, 2).astype(np.float64)
        tp = 20 * np.log10(np.max(np.abs(sg.resample_poly(a, 4, 1, axis=0))) + 1e-12); sp = 20 * np.log10(np.max(np.abs(a)) + 1e-12)
        rms = 20 * np.log10(np.sqrt(np.mean(a ** 2)) + 1e-12); dc = float(np.max(np.abs(np.mean(a, axis=0))))
        (ok if tp <= -1.0 else bad)('audio true peak %.2f dBTP (sample peak %.2f dBFS), limit -1.0 dBTP' % (tp, sp))
        (ok if rms > -30 else bad)('audio level rms %.1f dBFS' % rms)
        (ok if dc < 0.01 else bad)('audio DC offset %.4f' % dc)
    except Exception as e:
        bad('audio true-peak check failed: %s' % e)
    (ok if 'mp4' in fm['format_name'] else bad)('container %s' % fm['format_name'])
    print('  size %.1f MB, bitrate %.2f Mbit/s' % (int(fm['size']) / 1e6, int(fm.get('bit_rate', 0)) / 1e6))
sys.exit(fail)
PY
rc=$?
if [ $rc -eq 0 ]; then echo "VERIFY: PASS"; else echo "VERIFY: FAIL"; fi
exit $rc
