// Does the giant's first walk double back on itself? node scripts/doubleback.mjs [out.png] seed1 seed2 ...
//   The walk in to the village, through it and on to the first ring (`visitRoute`). Per seed, prints
//   near   how close (m) any print comes to another at least 8 steps before it (its own other foot is 29 m off)
//   back   how many prints lie within 60 m of an earlier one trodden the other way
//   turn   the most turning one way (degrees) in any four steps; spun: how many prints end more than 140 of it
//   and fails if any print is back beside its own trail, or it spins on the spot. With a .png, draws the walk round the village
//   from above (out-<seed>.png): prints dark to light as it goes, the lane, the houses, the way.
//   SPAN=<m> draws that much of the land (1100 by default; over 2000, centred between the yard and the ring).
// Uses the build in dist/ (or DIST=<folder>).
import { chromium } from 'playwright';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const args = process.argv.slice(2);
const out = args.find((a) => a.endsWith('.png'));
const seeds = args.filter((a) => !a.endsWith('.png'));
if (!seeds.length) seeds.push('hilda');
if (out) fs.mkdirSync(path.dirname(out), { recursive: true });
const server = http.createServer((req, res) => {
  const p = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  const f = path.join(root, process.env.DIST ?? 'dist', p === '/' ? 'index.html' : p);
  if (!fs.existsSync(f)) { res.writeHead(404); res.end(); return; }
  res.writeHead(200, { 'content-type': f.endsWith('.js') ? 'text/javascript' : f.endsWith('.html') ? 'text/html' : f.endsWith('.css') ? 'text/css' : 'application/octet-stream' });
  fs.createReadStream(f).pipe(res);
});
await new Promise((r) => server.listen(0, r));
const browser = await chromium.launch({ args: ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist'] });
let failed = 0;
for (const seed of seeds) {
  const page = await browser.newPage({ viewport: { width: 1000, height: 1000 } });
  page.on('pageerror', (e) => console.log('[pageerror]', e.message));
  await page.goto(`http://localhost:${server.address().port}/?seed=${seed}&story=1&fresh=1&ui=0&capture=1&mobs=0&drak=0${process.env.SPAN ? `&span=${process.env.SPAN}` : ''}`);
  for (let i = 0; i < 400; i++) { if (await page.evaluate(() => window.__ow?.ready())) break; await page.waitForTimeout(250); }
  const r = await page.evaluate((draw) => {
    const ow = window.__ow, gen = ow.gen(), route = ow.visit()?.route;
    if (!route) return { none: true };
    const falls = route.falls, v = gen.story.village, dg = gen.dungeon;
    const mid = falls.map((f) => [f.x + Math.sin(f.yaw) * 3.4, f.z + Math.cos(f.yaw) * 3.4]);
    let near = Infinity, back = 0, turn = 0, spun = 0;
    for (let i = 0; i < falls.length; i++) {
      let hit = false;
      for (let j = 0; j < i - 7; j++) {
        const d = Math.hypot(mid[i][0] - mid[j][0], mid[i][1] - mid[j][1]);
        near = Math.min(near, d);
        if (d < 60 && Math.cos(falls[i].yaw - falls[j].yaw) < -0.3) hit = true;
      }
      if (hit) back++;
      if (i >= 4) { let t = 0; for (let k = 0; k < 4; k++) { const a = falls[i - k].yaw - falls[i - k - 1].yaw; t += Math.atan2(Math.sin(a), Math.cos(a)); } t = Math.abs(t); turn = Math.max(turn, t); if (t > 2.45) spun++; }
    }
    let png = null;
    if (draw) {
      const yard = v.lane[0], span = +(new URLSearchParams(location.search).get('span') ?? 1100), far = span > 2000, cx = far ? (yard.x + dg.x) / 2 : yard.x, cz = far ? (yard.z + dg.z) / 2 : yard.z, N = 700;
      const c = document.createElement('canvas'); c.width = c.height = N;
      const g = c.getContext('2d'), img = g.createImageData(N, N);
      for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
        const x = cx + (i / N - 0.5) * span, z = cz + (j / N - 0.5) * span, h = gen.height(x, z), k = (j * N + i) * 4;
        const w = h < 0.6 ? [120, 160, 200] : [205 - h * 0.3, 196 - h * 0.3, 150 - h * 0.15];
        img.data.set([w[0], w[1], w[2], 255], k);
      }
      g.putImageData(img, 0, 0);
      const P = (x, z) => [(x - cx) / span * N + N / 2, (z - cz) / span * N + N / 2];
      const line = (pts, col, wd) => { g.strokeStyle = col; g.lineWidth = wd; g.beginPath(); pts.forEach((p, i) => { const q = P(p[0], p[1]); i ? g.lineTo(...q) : g.moveTo(...q); }); g.stroke(); };
      line(dg.way, '#c03', 1);
      line(v.lane.map((p) => [p.x, p.z]), '#fff', 2);
      for (const p of v.plots) if (p.house) { g.fillStyle = '#a52'; g.fillRect(...P(p.x, p.z).map((q) => q - 3), 6, 6); }
      g.fillStyle = '#000'; g.fillRect(...P(gen.story.x, gen.story.z).map((q) => q - 4), 8, 8);
      const home = gen.towers.home; g.fillStyle = '#fa0'; g.fillRect(...P(home.x, home.z).map((q) => q - 4), 8, 8);
      const s = N / span;
      for (const [i, f] of falls.entries()) {
        const t = i / falls.length, q = P(mid[i][0], mid[i][1]);
        g.save(); g.translate(q[0], q[1]); g.rotate(-f.yaw);
        g.fillStyle = `hsl(${250 - t * 250} 70% ${25 + t * 30}%)`;
        g.beginPath(); g.ellipse(0, 0, 4.5 * s, 9 * s, 0, 0, 7); g.fill(); g.restore();
      }
      const st = P(route.start.x, route.start.z); g.strokeStyle = '#000'; g.lineWidth = 2; g.beginPath(); g.arc(st[0], st[1], 8, 0, 7); g.stroke();
      png = c.toDataURL();
    }
    return { falls: falls.length, near: Math.round(near), back, spun, turn: Math.round(turn * 180 / Math.PI), png };
  }, !!out);
  if (r.png) fs.writeFileSync(out.replace('.png', `-${seed}.png`), Buffer.from(r.png.split(',')[1], 'base64'));
  delete r.png;
  if (r.back || r.spun) failed++;
  console.log(seed, JSON.stringify(r));
  await page.close();
}
await browser.close(); server.close();
process.exit(failed ? 1 : 0);
