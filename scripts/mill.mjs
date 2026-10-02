// The village milling about: node scripts/mill.mjs <outdir>
//   in-*/out-*: one goes in at its door and comes out again; chat-*: two meet
//   in the lane and talk (side on); lane-*: left alone for half a minute,
//   with what each is doing printed. Needs a build (npx vite build).
import { chromium } from 'playwright';
import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path';
const root = process.cwd(); const out = process.argv[2];
const server = http.createServer((req, res) => {
  const p = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  const f = path.join(root, 'dist', p === '/' ? 'index.html' : p);
  if (!fs.existsSync(f)) { res.writeHead(404); res.end(); return; }
  res.writeHead(200, { 'content-type': f.endsWith('.js') ? 'text/javascript' : f.endsWith('.html') ? 'text/html' : f.endsWith('.css') ? 'text/css' : 'application/octet-stream' });
  fs.createReadStream(f).pipe(res);
});
await new Promise((r) => server.listen(0, r));
const browser = await chromium.launch({ args: ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
page.on('pageerror', (e) => console.log('[pageerror]', e.message));
const W = (ms) => page.waitForTimeout(ms);
const ev = (f, a) => page.evaluate(f, a);
await page.goto(`http://localhost:${server.address().port}/?seed=hilda&story=1&fresh=1&mobs=0&bikes=0&drak=0&capture=1&ui=0&t=10.5`);
for (let i = 0; i < 160; i++) { if (await ev(() => window.__ow?.ready())) break; await W(250); }
await W(1500);
const cam = (k, dist = 7, side = 0.6) => ev(([k, dist, side]) => {
  const o = window.__ow, v = o.village(), h = v.houses[v.home[k]], r = h.plot.rot;
  o.rig.root.visible = false;
  o.teleport(h.door.x + Math.sin(r) * 30, h.door.z + Math.cos(r) * 30);
  o.focusAt(h.door.x, h.door.y + 0.8, h.door.z); o.view(r + side, 0.16, dist);
}, [k, dist, side]);
const snap = async (name, n, gap = 450) => { for (let i = 0; i < n; i++) { await page.screenshot({ path: `${out}/${name}-${i}.png` }); await W(gap); } };
// In at the door, and out again.
await cam(0); await W(2500);
await ev(() => { const v = window.__ow.village(), h = v.houses[0]; const p = v.world(h, h.doorX, h.hd - 0.85, v.mid.clone()); v.go(0, p, 'in', [h.door.clone(), p]); });
await snap('in', 6, 350);
await ev(() => { window.__ow.village().life[0].t = 0.6; });
await W(500);
await snap('out', 6, 350);
// A chat between housemates... and one in the lane.
await ev(() => { const v = window.__ow.village(); for (const l of v.life) { l.t = 60; l.hailT = 60; } for (const k of [0, 2]) { v.spirits[k].group.visible = true; v.settleHome(k); } v.meet(0, 2); });
await ev(() => { const o = window.__ow, v = o.village(), p = v.spirits[0].want.at; o.focusAt(p.x, p.y + 0.5, p.z); const q = v.spirits[2].want.at; o.focusAt((p.x + q.x) / 2, p.y + 0.5, (p.z + q.z) / 2); o.view(Math.atan2(q.x - p.x, q.z - p.z) + Math.PI / 2, 0.15, 6); });
for (let i = 0; i < 60; i++) { await W(500); if (await ev(() => window.__ow.village().life[0].doing === 'chat')) break; }
await snap('chat', 8, 700);
console.log(await ev(() => window.__ow.village().life.map((l) => l.doing).join(' ')));
// Left alone for a minute: the lane from above.
await ev(() => { const o = window.__ow, v = o.village(); for (const l of v.life) { if (l.doing === 'home') l.t = Math.random() * 6; l.hailT = Math.random() * 6; } const m = v.site.lane[Math.floor(v.site.lane.length / 2)]; o.focusAt(m.x, o.height(m.x, m.z) + 1, m.z); o.view(1, 0.45, 45); });
for (let i = 0; i < 3; i++) { await W(6000); await page.screenshot({ path: `${out}/lane-${i}.png` }); console.log(await ev(() => window.__ow.village().life.map((l) => l.doing).join(' '))); }
await browser.close(); server.close();
