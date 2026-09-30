// Phase 2 journey playthrough, frame-stepped: node scripts/journey.mjs <dir> [seed=fjord] [from=gift]
import { chromium } from 'playwright';
import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path';
const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const args = process.argv.slice(2);
const out = args[0] ?? 'shots/journey';
const opt = (k, d) => args.find((a) => a.startsWith(k + '='))?.slice(k.length + 1) ?? d;
const seed = opt('seed', 'fjord'), from = opt('from', 'gift');
fs.mkdirSync(out, { recursive: true });
const server = http.createServer((req, res) => { const p = decodeURIComponent(new URL(req.url, 'http://x').pathname); const f = path.join(root, 'dist', p === '/' ? 'index.html' : p); if (!fs.existsSync(f)) { res.writeHead(404); res.end(); return; } res.writeHead(200, { 'content-type': f.endsWith('.js') ? 'text/javascript' : f.endsWith('.html') ? 'text/html' : 'application/octet-stream' }); fs.createReadStream(f).pipe(res); });
await new Promise((r) => server.listen(0, r));
const browser = await chromium.launch({ args: ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
page.on('pageerror', (e) => console.log('[pageerror]', e.message));
page.on('console', (m) => { if (m.type() === 'error') console.log('[console]', m.text().slice(0, 300)); });
await page.goto(`http://localhost:${server.address().port}/?seed=${seed}&story=1&fresh=1&journey=${from}&t=15&mobs=0&ui=0&capture=1`);
for (let i = 0; i < 120; i++) { if (await page.evaluate(() => window.__ow?.ready())) break; await page.waitForTimeout(250); }
const W = (ms) => page.waitForTimeout(ms);
const idle = async () => { for (let i = 0; i < 80; i++) { if (await page.evaluate(() => window.__ow.ready())) break; await W(200); } };
let shot = 0;
const snap = async (name) => { await page.screenshot({ path: `${out}/${String(shot++).padStart(2, '0')}-${name}.png` }); };
const stage = () => page.evaluate(() => window.__ow.journey()?.stage);
const log = async (m) => console.log(m, await stage(), await page.evaluate(() => { const p = window.__ow._body.pos, s = window.__ow.story().spirit.pos; return { me: [p.x, p.y, p.z].map(Math.round), spirit: [s.x, s.y, s.z].map(Math.round), mode: window.__ow.journey() && window.__ow.beacons.busy }; }));
await idle();
await page.evaluate(() => { window.__ow.manual(true); window.__ow.advance(30); });
// Ride a path: the explorer (on the gift bike) follows the polyline at `speed`, camera side-on.
const ride = async (which, name) => {
  const total = await page.evaluate((which) => { const j = window.__ow.gen().journey[which]; let L = 0; for (let i = 1; i < j.length; i++) L += Math.hypot(j[i][0] - j[i - 1][0], j[i][1] - j[i - 1][1]); return L; }, which);
  console.log(which, 'length', Math.round(total));
  let s = 0;
  for (const f of [0.15, 0.45, 0.75, 1.0]) {
    const end = total * f;
    await page.evaluate(([which, s0, end]) => {
      const ow = window.__ow, b = ow._body, j = ow.gen().journey[which];
      const at = (s) => { let i = 0, acc = 0; for (; i < j.length - 1; i++) { const l = Math.hypot(j[i + 1][0] - j[i][0], j[i + 1][1] - j[i][1]); if (acc + l >= s) { const k = (s - acc) / l; return [j[i][0] + (j[i + 1][0] - j[i][0]) * k, j[i][1] + (j[i + 1][1] - j[i][1]) * k]; } acc += l; } return j[j.length - 1]; };
      for (let s = s0; s < end; s += 7 / 60) {
        const [x, z] = at(s), [x2, z2] = at(s + 1);
        b.pos.set(x, ow.height(x, z), z); b.heading = Math.atan2(x2 - x, z2 - z); b.vel.set(Math.sin(b.heading) * 7, 0, Math.cos(b.heading) * 7);
        ow.advance(1);
      }
      ow.view(b.heading + Math.PI * 0.62, 0.22, 11);
      ow.advance(2);
    }, [which, s, end]);
    s = end;
    await idle();
    await page.evaluate(() => window.__ow.advance(2));
    await snap(`${name}-${Math.round(f * 100)}`);
  }
  // Let the spirit get to the end and hop off.
  await page.evaluate(() => { window.__ow._body.vel.set(0, 0, 0); window.__ow.advance(240); });
};
const free = async (id, name) => {
  await page.evaluate((id) => { const ow = window.__ow; ow.dismountBike(); const t = ow.gen().towers.towers[id]; const fx = Math.sin(t.yaw), fz = Math.cos(t.yaw); ow.teleport(t.door.ground.x + fx * 6, t.door.ground.z + fz * 6); ow._body.heading = t.yaw + Math.PI; ow.view(t.yaw + 0.5, 0.18, 13); ow.advance(90); }, id);
  await idle(); await page.evaluate(() => window.__ow.advance(2));
  await snap(`${name}-lock`);
  await log('at lock');
  await page.evaluate((id) => { const ow = window.__ow; const t = ow.gen().towers.towers[id]; const fx = Math.sin(t.yaw), fz = Math.cos(t.yaw); ow.teleport(t.door.ground.x + fx * 0.3, t.door.ground.z + fz * 0.3); ow.advance(40); ow.beacons.debugBreak(); ow.advance(60 * 21); }, id);
  await log('freed');
  await snap(`${name}-lit`);
  await page.evaluate((id) => { const ow = window.__ow; const t = ow.gen().towers.towers[id]; ow.teleport(t.door.ground.x, t.door.ground.z); ow.advance(30); const fx = Math.sin(t.yaw), fz = Math.cos(t.yaw); ow.view(t.yaw + 0.4, 0.15, 10); ow.advance(30); }, id);
  await snap(`${name}-spirit-points-in`);
  // Walk in.
  await page.evaluate((id) => { const ow = window.__ow; const t = ow.gen().towers.towers[id]; const b = t.boulders[1]; const fx = Math.sin(t.yaw), fz = Math.cos(t.yaw); ow.teleport(b.x + fx * b.sx * 0.1, b.z + fz * b.sx * 0.1); ow.advance(60 * 5); }, id);
  await idle(); await page.evaluate(() => window.__ow.advance(2));
  await log('in head');
  await snap(`${name}-head-guided`);
};
await snap('gift');
await log('start');
await page.evaluate(() => { window.__ow.mountBike(); window.__ow.advance(60); });
await log('mounted');
await ride('toHome', 'ride1');
await log('ride1 end');
const ids = await page.evaluate(() => ({ home: 0, next: window.__ow.gen().journey.next }));
await free(ids.home, 'home');
await page.evaluate(() => { window.__ow.beacons.escape(); window.__ow.advance(60 * 2); });
await log('out of home');
await snap('ride2-out');
await page.evaluate(() => { const ow = window.__ow; ow.view(ow._body.heading + 2.6, 0.2, 12); ow.advance(60 * 3); });
await snap('ride2-spirit-boarding');
await page.evaluate(() => { window.__ow.advance(60 * 4); });
await log('spirit on bike?');
await snap('ride2-spirit-waits-on-bike');
await page.evaluate(() => { window.__ow.mountBike(); window.__ow.advance(30); });
await ride('toNext', 'ride2');
await log('ride2 end');
await free(ids.next, 'next');
await page.evaluate(() => { const B = window.__ow.beacons; window.__ow.advance(60); return B.action('carried'); }).then((a) => console.log('badge at next head', a));
await page.evaluate(() => { const B = window.__ow.beacons; if (B.aim) B.act('carried'); window.__ow.advance(60 * 7); });
await log('flew home');
await snap('home-arrived');
await page.evaluate(() => { window.__ow.beacons.escape(); window.__ow.advance(150); });
await log('end');
await browser.close(); server.close();
