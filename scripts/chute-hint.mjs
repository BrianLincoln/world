// The thought on dungeon 1's high stone, how the parachute is opened: node scripts/chute-hint.mjs <dir> [seed=hilda] [touch]
//   Stands you on the high stone and shoots the thought's four frames, then runs you off it and
//   shoots the reminder in the air, then opens the parachute (the thought should go). `touch`: as a
//   phone has it (a finger for the key, and the jump button turning into the parachute's).
// Uses the build in dist/, or in $DIST (run `npx vite build` first).
import { chromium } from 'playwright';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const args = process.argv.slice(2);
const dir = args[0] ?? 'shots/chute-hint';
const seed = args.find((a) => a.startsWith('seed='))?.slice(5) ?? 'hilda';
const touch = args.includes('touch');
fs.mkdirSync(dir, { recursive: true });
const server = http.createServer((req, res) => {
  const p = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  const f = path.join(root, process.env.DIST ?? 'dist', p === '/' ? 'index.html' : p);
  if (!fs.existsSync(f)) { res.writeHead(404); res.end(); return; }
  res.writeHead(200, { 'content-type': f.endsWith('.js') ? 'text/javascript' : f.endsWith('.html') ? 'text/html' : f.endsWith('.css') ? 'text/css' : 'application/octet-stream' });
  fs.createReadStream(f).pipe(res);
});
await new Promise((r) => server.listen(0, r));
const browser = await chromium.launch({ args: ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist'] });
const page = await browser.newPage(touch ? { viewport: { width: 844, height: 390 }, hasTouch: true, isMobile: true, deviceScaleFactor: 2 } : { viewport: { width: 1600, height: 900 } });
page.on('pageerror', (e) => console.log('[pageerror]', e.message));
await page.goto(`http://localhost:${server.address().port}/?seed=${seed}&story=0&t=10&ui=${touch ? 1 : 0}&capture=1&mobs=0&drak=0&dungeon=1&fresh=1`);
for (let i = 0; i < 160; i++) { if (await page.evaluate(() => window.__ow?.ready())) break; await page.waitForTimeout(250); }
await page.waitForTimeout(500);
const tag = touch ? 'touch-' : '';
const shot = async (name) => { await page.screenshot({ path: path.join(dir, tag + name + '.png') }); console.log(tag + name); };
const state = () => page.evaluate(() => { const d = window.__ow.dungeon(); return { mode: window.__ow.mode(), alpha: +d.thought.alpha.toFixed(2), t: +d.thoughtT.toFixed(2), jump: document.querySelector('#touch .jump')?.className ?? null }; });
await page.evaluate(() => {
  const ow = window.__ow, d = ow.dungeon(), L = d.layout, o = L.tops[L.tops.length - 1];
  ow.manual(true);
  d.debugLight();
  d.world(o.x, o.y, o.z, ow._body.pos);
  ow._body.vel.set(0, 0, 0);
  // Facing the far lip, the camera behind and a little above.
  const far = d.world(L.at.farLip[0], 0, L.at.farLip[1]);
  ow._body.heading = Math.atan2(far.x - ow._body.pos.x, far.z - ow._body.pos.z);
  ow._orbit.yaw = ow._body.heading + Math.PI + 0.5; ow._orbit.pitch = 0.3; ow._orbit.targetDistance = 7;
});
const step = (n) => page.evaluate((n) => window.__ow.advance(n), n);
await step(90);
// One loop of the thought is 2.78 s: catch each frame in the middle of its hold.
const loop = 0.7 + 0.36 + 0.42 + 1.3, mids = [0.35, 0.88, 1.27, 2.1];
for (let i = 0; i < 4; i++) {
  for (let f = 0; f < 400; f++) { const s = await state(); if (Math.abs((s.t % loop) - mids[i]) < 0.03) break; await step(1); }
  await shot('stone-' + i);
}
console.log(JSON.stringify(await state()));
// Off it at a run, nothing open.
const key = (code, down) => page.evaluate(([code, down]) => window.dispatchEvent(new KeyboardEvent(down ? 'keydown' : 'keyup', { code })), [code, down]);
await page.evaluate(() => { const ow = window.__ow; ow._orbit.yaw = ow._body.heading + Math.PI; });
await key('KeyW', true);
for (let f = 0; f < 200; f++) { await step(1); if (!(await page.evaluate(() => window.__ow._body.grounded))) break; }
await step(14); await shot('air-a'); console.log(JSON.stringify(await state()));
await step(12); await shot('air-b');
await key('Space', true); await step(2); await key('Space', false);
await step(40); await shot('open'); console.log(JSON.stringify(await state()));
await key('KeyW', false);
await browser.close();
server.close();
