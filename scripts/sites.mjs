// The dungeon sites and the giant's walks, per seed: node scripts/sites.mjs [out.png] seed1 seed2 ...
//   Prints each seed's sites (where, how far, how long the way), a fingerprint of the first site and of
//   the visit's footfalls (they must not change when a later site is added), how long the search took, and
//   checks the walk on to the second ring: no footfall in water, on a ring or a tower, and where it ends.
//   With a .png, draws them from above (land by height, water, the ways, every footfall, the rings).
// Uses the build in dist/ (run `npx vite build` first).
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
  const f = path.join(root, 'dist', p === '/' ? 'index.html' : p);
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
  await page.goto(`http://localhost:${server.address().port}/?seed=${seed}&story=1&fresh=1&ui=0&capture=1&mobs=0&drak=0`);
  for (let i = 0; i < 400; i++) { if (await page.evaluate(() => window.__ow?.ready())) break; await page.waitForTimeout(250); }
  const r = await page.evaluate((draw) => {
    const ow = window.__ow, gen = ow.gen(), fp = (o) => { let h = 2166136261; for (const c of JSON.stringify(o)) h = Math.imul(h ^ c.charCodeAt(0), 16777619) >>> 0; return h.toString(16); };
    const sites = gen.dungeons ?? [gen.dungeon], yard = gen.story.village.lane[0];
    const len = (w) => w.reduce((s, p, i) => s + (i ? Math.hypot(p[0] - w[i - 1][0], p[1] - w[i - 1][1]) : 0), 0);
    const falls = ow.visit()?.route?.falls ?? [], on = ow.onward ? ow.onward() : [];
    const bad = [];
    let wet = 0;
    for (const [i, f] of on.entries()) {
      const sx = f.x + Math.sin(f.yaw) * 3.4, sz = f.z + Math.cos(f.yaw) * 3.4;
      if (gen.height(sx, sz) < 0.6) wet++;
      for (const [n, s] of sites.entries()) if (Math.hypot(sx - s.x, sz - s.z) < s.r + 12) bad.push(`fall ${i} on ring ${n + 1}`);
      if (gen.towerDist(sx, sz, 200) < 40) bad.push(`fall ${i} on a tower`);
      if (i && Math.hypot(f.x - on[i - 1].x, f.z - on[i - 1].z) > 60) bad.push(`fall ${i} a ${Math.hypot(f.x - on[i - 1].x, f.z - on[i - 1].z).toFixed(0)} m step`);
    }
    let png = null;
    if (draw) {
      const pts = [[yard.x, yard.z], ...sites.map((s) => [s.x, s.z]), ...sites.flatMap((s) => s.way)];
      let x0 = Infinity, z0 = Infinity, x1 = -Infinity, z1 = -Infinity;
      for (const p of pts) { x0 = Math.min(x0, p[0]); z0 = Math.min(z0, p[1]); x1 = Math.max(x1, p[0]); z1 = Math.max(z1, p[1]); }
      const span = Math.max(x1 - x0, z1 - z0) + 300, cx = (x0 + x1) / 2, cz = (z0 + z1) / 2, N = 500;
      const c = document.createElement('canvas'); c.width = c.height = N;
      const g = c.getContext('2d'), img = g.createImageData(N, N);
      for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
        const x = cx + (i / N - 0.5) * span, z = cz + (j / N - 0.5) * span, h = gen.height(x, z), f = h > 0.6 ? gen.forestDensity(x, z, h) : 0, k = (j * N + i) * 4;
        const v = h < 0.6 ? [120, 160, 200] : [200 - f * 70 - h * 0.25, 190 - f * 40 - h * 0.25, 140 - f * 60 - h * 0.1];
        img.data.set([v[0], v[1], v[2], 255], k);
      }
      g.putImageData(img, 0, 0);
      const P = (x, z) => [(x - cx) / span * N + N / 2, (z - cz) / span * N + N / 2];
      for (const [n, s] of sites.entries()) {
        g.strokeStyle = n ? '#c03' : '#333'; g.lineWidth = 1; g.beginPath();
        for (const [i, p] of s.way.entries()) { const q = P(p[0], p[1]); i ? g.lineTo(...q) : g.moveTo(...q); }
        g.stroke();
        g.beginPath(); g.arc(...P(s.x, s.z), s.r / span * N + 2, 0, 7); g.lineWidth = 2; g.stroke();
      }
      for (const [L, col] of [[falls, '#224'], [on, '#c03']]) for (const f of L) { g.fillStyle = col; const q = P(f.x, f.z); g.fillRect(q[0] - 1.5, q[1] - 1.5, 3, 3); }
      g.fillStyle = '#000'; g.fillRect(...P(yard.x, yard.z).map((v) => v - 3), 6, 6);
      for (const t of gen.towers.towers) { g.fillStyle = '#fa0'; g.fillRect(...P(t.x, t.z).map((v) => v - 2), 4, 4); }
      png = c.toDataURL();
    }
    const end = on.length ? on[on.length - 1] : null, s2 = sites[1];
    // A way no route found is a straight line of evenly spaced points (the fallback in worldgen): say so.
    const straight = (w) => { const a = w[0], b = w[w.length - 1], l = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1; return w.every((p) => Math.abs((p[0] - a[0]) * (b[1] - a[1]) - (p[1] - a[1]) * (b[0] - a[0])) / l < 0.01); };
    // (And how much of each way is in water, whoever found it.)
    const wetWay = (w) => w.filter((p) => gen.height(p[0], p[1]) < 0.6).length;
    return {
      first: fp(sites[0]), visit: fp(falls), falls: falls.length, ms: ow.siteSearchMs ? Math.round(ow.siteSearchMs()) : null, each: ow.siteSearchEach?.(),
      sites: sites.map((s, n) => ({ at: [Math.round(s.x), Math.round(s.z), Math.round(s.y)], fromYard: Math.round(Math.hypot(s.x - yard.x, s.z - yard.z)), fromPrev: n ? Math.round(Math.hypot(s.x - sites[n - 1].x, s.z - sites[n - 1].z)) : 0, way: Math.round(len(s.way)), pts: s.way.length, tower: s.tower, fallback: straight(s.way), wetPts: wetWay(s.way) })),
      onward: on.length, wades: wet, endFromRing: end && s2 ? Math.round(Math.hypot(end.x - s2.x, end.z - s2.z)) : null, bad, png,
    };
  }, !!out);
  if (r.png) fs.writeFileSync(out.replace('.png', `-${seed}.png`), Buffer.from(r.png.split(',')[1], 'base64'));
  delete r.png;
  if (r.bad.length || (r.onward && (r.endFromRing < 45 || r.endFromRing > 130))) failed++;
  console.log(seed, JSON.stringify(r));
  await page.close();
}
await browser.close(); server.close();
process.exit(failed ? 1 : 0);
