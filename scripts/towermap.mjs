// The tower network and each tower's patch (the land nearest it), from above:
//   node scripts/towermap.mjs <out.png> [seed ...]      (serves $DIST)
// Prints, per seed: how many towers, the nearest pair, links per tower, the farthest any
// land in the region is from a tower, and how far the journey's first two towers are.
import { chromium } from 'playwright';
import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path';
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
for (const seed of seeds) {
  const page = await browser.newPage({ viewport: { width: 1000, height: 1000 } });
  page.on('pageerror', (e) => console.log('[pageerror]', e.message));
  await page.goto(`http://localhost:${server.address().port}/?seed=${seed}&story=0&t=11&mobs=0&fresh=1&ui=0&capture=1&paused=1`);
  for (let i = 0; i < 160; i++) { if (await page.evaluate(() => window.__ow?.ready())) break; await page.waitForTimeout(250); }
  const r = await page.evaluate(() => {
    const g = window.__ow.gen(), net = g.towers, T = net.towers, st = g.story, REGION = 5200, N = 800;
    const span = REGION + 600, px = (2 * span) / N;
    const cv = document.createElement('canvas'); cv.id = 'towermap'; cv.width = cv.height = N;
    cv.style.cssText = 'position:fixed;left:0;top:0;z-index:99999';
    document.body.appendChild(cv);
    const c = cv.getContext('2d'), img = c.createImageData(N, N);
    let far = 0, farLand = 0;
    const area = T.map(() => 0);
    for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
      const x = st.x - span + (i + 0.5) * px, z = st.z - span + (j + 0.5) * px;
      let b = 0, bd = Infinity, b2 = Infinity;
      for (let k = 0; k < T.length; k++) { const d = Math.hypot(T[k].x - x, T[k].z - z); if (d < bd) { b2 = bd; bd = d; b = k; } else if (d < b2) b2 = d; }
      const h = g.height(x, z), inR = Math.hypot(x - st.x, z - st.z) <= REGION;
      if (inR) { far = Math.max(far, bd); if (h > 0.5) farLand = Math.max(farLand, bd); area[b] += px * px; }
      // A soft colour per patch; water darker; the border between patches a line.
      const hue = (b * 137.5) % 360, land = h > 0.5;
      const f = (n) => { const k = (n + hue / 30) % 12; return 0.5 - 0.5 * Math.max(-1, Math.min(k - 3, 9 - k, 1)); };
      let col = [f(0), f(8), f(4)].map((v) => (land ? 0.62 + v * 0.3 + Math.min(h, 300) / 1500 : 0.42 + v * 0.18));
      if (b2 - bd < px * 1.6) col = [0.25, 0.2, 0.2];
      if (!inR) col = col.map((v) => v * 0.6);
      const o = (j * N + i) * 4;
      img.data[o] = col[0] * 255; img.data[o + 1] = col[1] * 255; img.data[o + 2] = col[2] * 255; img.data[o + 3] = 255;
    }
    c.putImageData(img, 0, 0);
    const P = (x, z) => [(x - st.x + span) / px, (z - st.z + span) / px];
    c.strokeStyle = 'rgba(60,40,30,0.35)'; c.lineWidth = 1;
    for (const t of T) for (const l of t.links) if (l > t.id) { c.beginPath(); c.moveTo(...P(t.x, t.z)); c.lineTo(...P(T[l].x, T[l].z)); c.stroke(); }
    for (const t of T) { const [x, y] = P(t.x, t.z); c.fillStyle = t.home ? '#e0632a' : '#2a1c16'; c.beginPath(); c.arc(x, y, t.home ? 6 : 4, 0, 7); c.fill(); }
    for (const d of g.dungeons ?? []) { const s = d.ring ?? d; if (s?.x === undefined) continue; const [x, y] = P(s.x, s.z); c.strokeStyle = '#7a2bd0'; c.lineWidth = 2; c.beginPath(); c.arc(x, y, 7, 0, 7); c.stroke(); }
    { const [x, y] = P(st.x, st.z); c.fillStyle = '#fff'; c.fillRect(x - 3, y - 3, 6, 6); }
    let near = Infinity;
    for (const a of T) for (const b of T) if (a.id < b.id) near = Math.min(near, Math.hypot(a.x - b.x, a.z - b.z));
    const links = T.map((t) => t.links.length).sort((a, b) => a - b);
    const ar = area.filter((a) => a > 0).map((a) => Math.sqrt(a / Math.PI)).sort((a, b) => a - b);
    const nx = T[g.journey.next];
    return { towers: T.length, nearestPair: Math.round(near), links: { min: links[0], median: links[links.length >> 1], max: links[links.length - 1] },
      farthestFromATower: Math.round(far), farthestLand: Math.round(farLand), patchRadius: { min: Math.round(ar[0]), median: Math.round(ar[ar.length >> 1]), max: Math.round(ar[ar.length - 1]) },
      home: [Math.round(net.home.x), Math.round(net.home.z)], homeFromCabin: Math.round(Math.hypot(net.home.x - st.x, net.home.z - st.z)),
      journeyNext: nx ? Math.round(Math.hypot(nx.x - net.home.x, nx.z - net.home.z)) : null, ms: Math.round(net.ms) };
  });
  console.log(seed, JSON.stringify(r));
  if (out) await page.locator('#towermap').screenshot({ path: seeds.length > 1 ? out.replace('.png', `-${seed}.png`) : out });
  await page.close();
}
await browser.close(); server.close();
