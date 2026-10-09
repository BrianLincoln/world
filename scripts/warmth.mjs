// The cold country: node scripts/warmth.mjs <dir> [seed=hilda] [t=9.5] [shots=valley,roll,tower,above,night,light] [tower=id] [at=x,z,yaw,pitch,dist]
//   valley: a valley as it is now and cold; roll: the tower of that patch lit, the warming at seven moments;
//   tower: from that tower's head, its patch lit in a cold country; above: the same from high up (the patch's shape);
//   light: lighting that tower the real way in the cold, a frame a second (the camera, the warmth running out);
//   night: the valley cold at dusk and at night, by a cabin too.
// Serves $DIST (build to your own folder). Sandbox with ?cold=1; `__ow.warmth` is story/warmth.ts.
import { chromium } from 'playwright';
import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path';
const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const args = process.argv.slice(2);
const out = args[0] ?? 'shots/warmth';
const opt = (k, d) => args.find((a) => a.startsWith(k + '='))?.slice(k.length + 1) ?? d;
const seed = opt('seed', 'hilda'), hour = opt('t', '9.5');
const shots = opt('shots', 'valley,roll,tower,above,night').split(',');
const [x, z, yaw, pitch = 0.14, dist = 17] = opt('at', '-1115,-1548,8.21').split(',').map(Number);
fs.mkdirSync(out, { recursive: true });
const server = http.createServer((req, res) => {
  const p = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  const f = path.join(root, process.env.DIST ?? 'dist', p === '/' ? 'index.html' : p);
  if (!fs.existsSync(f)) { res.writeHead(404); res.end(); return; }
  res.writeHead(200, { 'content-type': f.endsWith('.js') ? 'text/javascript' : f.endsWith('.html') ? 'text/html' : f.endsWith('.css') ? 'text/css' : 'application/octet-stream' });
  fs.createReadStream(f).pipe(res);
});
await new Promise((r) => server.listen(0, r));
const browser = await chromium.launch({ args: ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: 1600, height: 900 } });
page.on('pageerror', (e) => console.log('[pageerror]', e.message));
page.on('console', (m) => { if (m.type() === 'error' && !m.text().includes('useProgram')) console.log('[console]', m.text().slice(0, 300)); });
await page.goto(`http://localhost:${server.address().port}/?seed=${seed}&story=0&t=${hour}&mobs=0&fresh=1&ui=0&capture=1&paused=1&cold=1`);
for (let i = 0; i < 120; i++) { if (await page.evaluate(() => window.__ow?.ready())) break; await page.waitForTimeout(250); }
const W = (ms) => page.waitForTimeout(ms);
const ev = (f, a) => page.evaluate(f, a);
const idle = async () => { let ok = 0; for (let i = 0; i < 120 && ok < 4; i++) { ok = (await ev(() => window.__ow.ready())) ? ok + 1 : 0; await W(200); } await W(400); };
const shot = async (name) => { await W(250); await page.screenshot({ path: `${out}/${name}.png` }); console.log(name); };
const cold = (on) => ev((on) => { window.__ow.warmth.force = on; window.__ow.warmth.snap(); }, on);
const here = () => ev(([x, z, yaw, pitch, dist]) => { window.__ow.focusAt(null); window.__ow.teleport(x, z); window.__ow.view(yaw, pitch, dist); }, [x, z, yaw, pitch, dist]);
await ev(() => window.__ow.beacons.debugSet('none'));
await here(); await idle();
const tid = await ev(() => { const o = window.__ow, p = o.pos(); return o.warmth.patch(p.x, p.z).id; });
console.log('patch of tower', tid, 'warm here:', await ev(() => { const o = window.__ow, p = o.pos(); return o.warmth.warmAt(p.x, p.z); }));

if (shots.includes('valley')) {
  await cold(false); await shot('1-valley-now');
  await cold(true); await shot('1-valley-cold');
}
if (shots.includes('roll')) {
  // The tower of this patch is lit: the warming comes across the view. Stepped by hand so the moments are exact.
  await cold(true);
  await ev((id) => { const o = window.__ow; o.manual(true); o.beacons.debugSet('none'); o.advance(2, 1 / 60); o.beacons.debugSet(id); }, tid);
  let t = 0;
  for (const at of [0.5, 1.5, 2.5, 3.5, 5, 7, 12]) {
    await ev((n) => window.__ow.advance(n, 1 / 30), Math.round((at - t) * 30)); t = at;
    await shot(`2-roll-${String(at).padStart(4, '0')}s`);
  }
  await ev(() => window.__ow.manual(false));
}
if (shots.includes('above')) {
  await cold(true);
  await ev((id) => { const o = window.__ow, t = o.gen().towers.towers[id]; o.beacons.debugSet('none'); o.beacons.debugSet(id); o.beacons.state?.get?.(id); o.teleport(t.x + 60, t.z + 60); o.setMode('fly', 520); o.view(0.6, 1.05, 60); }, tid);
  await ev(() => { const o = window.__ow; o.manual(true); o.advance(40, 0.5); o.manual(false); });
  await idle(); await shot('4-above');
  await ev(() => window.__ow.setMode('walk'));
}
if (shots.includes('tower')) {
  await cold(true);
  await ev((id) => { const o = window.__ow; o.beacons.debugSet('none'); o.beacons.debugSet(id); o.goToTower(id); }, tid);
  await idle();
  await ev((id) => { const o = window.__ow; o.beacons.debugEnter(id); o.manual(true); o.advance(60, 0.5); o.manual(false); }, tid);
  await W(1200); await idle();
  for (let k = 0; k < 3; k++) {
    await ev((k) => window.__ow.beacons.look(k ? -700 : 0, 0), k);
    await W(500); await idle();
    await shot(`3-tower-${k}`);
  }
  await cold(false); await shot('3-tower-2-now');
  await ev(() => location.reload()); // (out of the head the simple way)
  for (let i = 0; i < 120; i++) { await W(250); if (await ev(() => window.__ow?.ready())) break; }
}
if (shots.includes('light')) {
  // Lighting a tower in the cold, the real way: the lock broken, the spirit's climb, the warmth running out. A frame a second.
  await cold(true);
  const id = +opt('tower', String(tid));
  await ev((id) => { const o = window.__ow; o.focusAt(null); o.beacons.debugSet('none'); o.goToTower(id); }, id);
  await idle();
  await ev(() => { const o = window.__ow; o.manual(true); o.advance(30, 1 / 30); o.beacons.debugBreak(); });
  for (let i = 0; i < 26; i++) {
    const busy = await ev(() => { const o = window.__ow; o.advance(30, 1 / 30); return o.beacons.busy; });
    await shot(`6-light-${String(i).padStart(2, '0')}`);
    if (!busy) break;
  }
  await ev(() => window.__ow.manual(false));
}
if (shots.includes('face')) {
  // Her face out in the cold and in the warm, close to, from in front.
  await here(); await idle();
  for (const on of [false, true]) {
    await cold(on);
    await ev(() => { const o = window.__ow; o._body.heading = o._orbit.yaw; o.view(o._orbit.yaw, 0.02, 3.4); o.manual(true); o.advance(150, 1 / 30); o.manual(false); });
    await shot(`7-face-${on ? 'cold' : 'warm'}`);
  }
}
if (shots.includes('story')) {
  // In the story, after the giant: the country is cold with no dev switch, and the guide feels it.
  for (const cp of opt('cp', 'ranch,ring').split(',')) {
    await page.goto(`http://localhost:${server.address().port}/?seed=${seed}&fresh=1&cp=${cp}&ui=0&capture=1&mobs=0`);
    for (let i = 0; i < 200; i++) { await W(250); if (await ev(() => window.__ow?.ready())) break; }
    await W(2500); await idle();
    console.log(cp, JSON.stringify(await ev(() => { const o = window.__ow, p = o.pos(), sp = o.story()?.spirit; return { amt: +o.warmth.amt.toFixed(2), warmHere: o.warmth.warmAt(p.x, p.z), share: +o.warmth.share.toFixed(2), chill: o.rig?.chill, spiritChill: sp?.chill, spiritAt: sp ? Math.round(Math.hypot(sp.pos.x - p.x, sp.pos.z - p.z)) : null }; })));
    await shot(`8-story-${cp}`);
  }
}
if (shots.includes('night')) {
  await ev(() => window.__ow.beacons.debugSet('none'));
  await here(); await idle();
  for (const h of [18.4, 20.5, 22.5]) {
    await ev((h) => window.__ow.setHour(h), h);
    await cold(false); await shot(`5-night-${h}-now`);
    await cold(true); await shot(`5-night-${h}-cold`);
  }
  await ev(() => { const o = window.__ow; o.lookAtPoi('cabin', 26, 2.2); o.view(o._orbit.yaw, 0.12, 12); });
  await idle();
  await cold(false); await shot('5-night-cabin-now');
  await cold(true); await shot('5-night-cabin-cold');
}
await browser.close(); server.close();
