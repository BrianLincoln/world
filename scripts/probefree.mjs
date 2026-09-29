import { chromium } from 'playwright';
import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path';
const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const server = http.createServer((req, res) => { const p = decodeURIComponent(new URL(req.url, 'http://x').pathname); const f = path.join(root, 'dist', p === '/' ? 'index.html' : p); if (!fs.existsSync(f)) { res.writeHead(404); res.end(); return; } res.writeHead(200, { 'content-type': f.endsWith('.js') ? 'text/javascript' : 'text/html' }); fs.createReadStream(f).pipe(res); });
await new Promise((r) => server.listen(0, r));
const browser = await chromium.launch({ args: ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: 800, height: 450 } });
page.on('pageerror', (e) => console.log('[pageerror]', e.message));
await page.goto(`http://localhost:${server.address().port}/?seed=fjord&story=0&t=16&mobs=0&fresh=1&ui=0&capture=1&paused=1`);
for (let i = 0; i < 120; i++) { if (await page.evaluate(() => window.__ow?.ready())) break; await page.waitForTimeout(250); }
const r = await page.evaluate(() => {
  const ow = window.__ow, B = ow.beacons;
  ow.goToTower(3);
  const t = ow.gen().towers.towers[3];
  const fx = Math.sin(t.yaw), fz = Math.cos(t.yaw);
  ow.teleport(t.door.ground.x + fx * 0.3, t.door.ground.z + fz * 0.3);
  ow.manual(true); ow.advance(30);
  const L = B.lock; B.debugBreak();
  const out = [];
  for (const n of [1, 20, 20, 20, 20, 20, 20]) {
    ow.advance(n === 1 ? 1 : 20);
    const c = ow._cam.position, p = ow._body.pos, cin = B.cinematic();
    out.push({ lockNow: B.lock === L, lockNull: !B.lock, kids: B.group.children.length, padVis: L.padlock.visible, padScale: L.padlock.scale.x, inScene: !!L.group.parent, fly: L.flyT, pad: L.padlock.position.toArray().map(Math.round), same: B.free?.lock === L, cam: c.toArray().map(Math.round), at: cin?.at.toArray().map(Math.round), me: p.toArray().map(Math.round), sp: B.spirit.pos.toArray().map(Math.round) });
  }
  return out;
});
for (const x of r) console.log(JSON.stringify(x));
await page.screenshot({ path: 'shots/probe.png' });
console.log(await page.evaluate(() => window.__ow.beacons.group.children.filter((c) => c.visible && c.type === 'Group').map((c) => c.children.length + ':' + c.position.toArray().map(Math.round))));
await browser.close(); server.close();
