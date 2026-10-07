// How near the giant's prints come to your cabin, per seed: node scripts/cabin-clear.mjs seed1 seed2 ...
//   The nearest sole to the cabin's walls (m, edge to edge; negative: on it) as it comes, on the houses, leaving the
//   yard, on the walk to ring 1 and on both walks on. Fails under 10 m (KEEP in visit.ts), or 4 m for a print on a house.
// Uses the build in $DIST (default dist/).
import { chromium } from 'playwright';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const seeds = process.argv.slice(2);
if (!seeds.length) seeds.push('hilda');
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
  const page = await browser.newPage({ viewport: { width: 600, height: 400 } });
  page.on('pageerror', (e) => console.log('[pageerror]', e.message));
  await page.goto(`http://localhost:${server.address().port}/?seed=${seed}&story=1&fresh=1&ui=0&capture=1&mobs=0&drak=0`);
  for (let i = 0; i < 400; i++) { if (await page.evaluate(() => window.__ow?.ready())) break; await page.waitForTimeout(250); }
  const r = await page.evaluate(() => {
    const ow = window.__ow, s = ow.gen().story, W = 7.4, D = 5.6;
    const legs = { visit: ow.visit()?.route?.falls ?? [], on1: ow.onward(1), on2: ow.onward(2) };
    // The cabin's walls, sampled; a sole as prints.ts draws it (22 m by about 14).
    const pts = [];
    for (let i = 0; i <= 8; i++) for (let j = 0; j <= 6; j++) {
      const lx = (i / 8 - 0.5) * W, lz = (j / 6 - 0.5) * D, c = Math.cos(s.rot), n = Math.sin(s.rot);
      pts.push([s.x + lx * c + lz * n, s.z - lx * n + lz * c]);
    }
    const sdf = (x, z, f) => {
      const px = f.x + Math.sin(f.yaw) * 3.4, pz = f.z + Math.cos(f.yaw) * 3.4, dx = x - px, dz = z - pz, cs = Math.cos(f.yaw), sn = Math.sin(f.yaw);
      const qx = dx * cs - dz * sn, qy = dx * sn + dz * cs, w = 5.9 + 1.6 * Math.min(1, Math.max(0, (qy + 11) / 22));
      return (Math.sqrt(Math.hypot((qx / w) ** 2, (qy / 11) ** 2)) - 1) * 6.5;
    };
    const rt = ow.visit()?.route, out = {};
    const add = (k, g, i) => { if (!out[k] || g < out[k].near) out[k] = { near: +g.toFixed(1), at: i }; };
    for (const [name, falls] of Object.entries(legs)) for (const [i, f] of falls.entries()) {
      let g = Infinity;
      for (const p of pts) g = Math.min(g, sdf(p[0], p[1], f));
      add(name !== 'visit' ? name : i < rt.firstHouse - 1 ? 'coming' : i < rt.lastHouse ? 'house' : i < rt.lastHouse + 4 ? 'yard' : 'walk', g, i);
    }
    return out;
  });
  // (A house by the yard has to be trodden on where it stands: that print can only be moved so far.)
  const bad = Object.entries(r).filter(([k, v]) => v.near < (k === 'house' ? 4 : 10));
  if (bad.length) failed++;
  console.log(seed, Object.entries(r).map(([k, v]) => `${k}: ${v.near} m (${v.at})`).join('  '), bad.length ? 'FAIL ' + bad.map((b) => b[0]) : 'ok');
  await page.close();
}
await browser.close();
server.close();
process.exit(failed ? 1 : 0);
