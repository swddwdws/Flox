#!/usr/bin/env node
// Deterministic frame renderer: opens render/index.html in headless Chromium and
// writes one PNG per frame. Usage:
//   node tools/render.js --out out/frames [--start 0] [--end 900] [--frames 10,20,30]
//                        [--html dev_world.html]
//                        [--every 30] [--workers 3] [--times 1.5,4.25]
'use strict';
const path = require('path');
const fs = require('fs');
const { chromium } = require('playwright');

const FPS = 30, TOTAL = 900;
const args = {};
for (let i = 2; i < process.argv.length; i++) {
  const a = process.argv[i];
  if (a.startsWith('--')) { const k = a.slice(2); const v = process.argv[i + 1]; if (v && !v.startsWith('--')) { args[k] = v; i++; } else args[k] = true; }
}
const outDir = path.resolve(args.out || 'out/frames');
const workers = parseInt(args.workers || '3', 10);
const html = 'file://' + path.resolve(__dirname, '..', 'render', args.html || 'index.html');

let frames = [];
if (args.frames) frames = args.frames.split(',').map(Number);
else if (args.times) frames = args.times.split(',').map(s => Math.round(parseFloat(s) * FPS + 1e-6));
else {
  const s = parseInt(args.start || '0', 10), e = parseInt(args.end || String(TOTAL), 10), ev = parseInt(args.every || '1', 10);
  for (let f = s; f < e; f += ev) frames.push(f);
}
frames = [...new Set(frames)].filter(f => f >= 0 && f < TOTAL).sort((a, b) => a - b);
fs.mkdirSync(outDir, { recursive: true });

(async () => {
  const t0 = Date.now();
  const browser = await chromium.launch({ args: ['--disable-dev-shm-usage', '--font-render-hinting=none', '--allow-file-access-from-files'] });
  const buckets = Array.from({ length: workers }, () => []);
  frames.forEach((f, i) => buckets[i % workers].push(f));
  let done = 0;
  const total = frames.length;
  await Promise.all(buckets.map(async (bucket, wi) => {
    if (!bucket.length) return;
    const ctx = await browser.newContext({ viewport: { width: 1080, height: 1920 }, deviceScaleFactor: 1 });
    const page = await ctx.newPage();
    page.on('pageerror', e => { console.error('PAGE ERROR', e.message); process.exitCode = 2; });
    page.on('console', m => { if (m.type() === 'error') console.error('CONSOLE', m.text()); });
    await page.goto(html);
    const fontInfo = await page.evaluate(() => window.__ready);
    if (wi === 0) console.log('fonts:', fontInfo);
    for (const f of bucket) {
      const b64 = await page.evaluate(i => window.captureFrame(i), f);
      if (!b64) throw new Error('captureFrame returned nothing for frame ' + f);
      fs.writeFileSync(path.join(outDir, `f${String(f).padStart(4, '0')}.png`), Buffer.from(b64, 'base64'));
      done++;
      if (done % 60 === 0 || done === total) console.log(`${done}/${total} frames  (${((Date.now() - t0) / 1000).toFixed(1)} s)`);
    }
    await ctx.close();
  }));
  await browser.close();
  console.log(`rendered ${total} frames to ${outDir} in ${((Date.now() - t0) / 1000).toFixed(1)} s`);
})().catch(e => { console.error(e); process.exit(1); });
