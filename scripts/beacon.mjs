// Beacon tower shots: node scripts/beacon.mjs <dir> [seed=fjord] [t=16] [tower=3] [shots=face,lit,far,night]
import { chromium } from 'playwright';
import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path';
const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const args = process.argv.slice(2);
const out = args[0] ?? 'shots/beacon';
const opt = (k, d) => args.find((a) => a.startsWith(k + '='))?.slice(k.length + 1) ?? d;
const seed = opt('seed', 'fjord'), hour = opt('t', '16'), tower = +opt('tower', '3');
const shots = opt('shots', 'face,lit,far,night').split(',');
fs.mkdirSync(out, { recursive: true });
const server = http.createServer((req, res) => {
  const p = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  const f = path.join(root, 'dist', p === '/' ? 'index.html' : p);
  if (!fs.existsSync(f)) { res.writeHead(404); res.end(); return; }
  res.writeHead(200, { 'content-type': f.endsWith('.js') ? 'text/javascript' : f.endsWith('.html') ? 'text/html' : 'application/octet-stream' });
  fs.createReadStream(f).pipe(res);
});
await new Promise((r) => server.listen(0, r));
const browser = await chromium.launch({ args: ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: 1600, height: 900 } });
page.on('pageerror', (e) => console.log('[pageerror]', e.message));
page.on('console', (m) => { if (m.type() === 'error') console.log('[console]', m.text().slice(0, 300)); });
await page.goto(`http://localhost:${server.address().port}/?seed=${seed}&story=0&t=${hour}&mobs=0&fresh=1&ui=0&capture=1&paused=1`);
for (let i = 0; i < 120; i++) { if (await page.evaluate(() => window.__ow?.ready())) break; await page.waitForTimeout(250); }
const W = (ms) => page.waitForTimeout(ms);
const idle = async () => { for (let i = 0; i < 60; i++) { if (await page.evaluate(() => window.__ow.ready())) break; await W(200); } await W(500); };
// Frame the head (or a point up the tower) from yaw offset `a`, pitch, distance.
const frame = (id, a, pitch, dist, up = 0) => page.evaluate(([id, a, pitch, dist, up]) => {
  const t = window.__ow.gen().towers.towers[id];
  window.__ow.goToTower(id);
  window.__ow.focusAt(t.head.x, t.head.y - up, t.head.z);
  window.__ow.view(t.yaw + a, pitch, dist);
}, [id, a, pitch, dist, up]);
const set = (w) => page.evaluate((w) => window.__ow.beacons.debugSet(w), w);
for (const s of shots) {
  if (s === 'face') { await set('none'); await frame(tower, 0.12, 0.05, 30); await idle(); await page.screenshot({ path: `${out}/${seed}-face.png` }); }
  if (s === 'lit') { await set(tower); await frame(tower, 0.12, 0.05, 30); await idle(); await W(1500); await page.screenshot({ path: `${out}/${seed}-lit.png` }); }
  if (s === 'far') { await set(tower); await frame(tower, 0.5, 0.08, 120, 18); await idle(); await page.screenshot({ path: `${out}/${seed}-far.png` }); }
  if (s === 'night') { await set(tower); await page.evaluate(() => window.__ow.setHour(22.5)); await frame(tower, 0.35, 0.05, 36, 4); await idle(); await W(800); await page.screenshot({ path: `${out}/${seed}-night.png` }); await page.evaluate((h) => window.__ow.setHour(h), +hour); }
  if (s === 'unlock') {
    // Smash the lock, watch the spirit, walk in, be the head, come out.
    await set('none');
    await page.evaluate((id) => { window.__ow.focusAt(null); window.__ow.goToTower(id); }, tower);
    const t = await page.evaluate((id) => { const t = window.__ow.gen().towers.towers[id]; return { yaw: t.yaw, g: t.door.ground }; }, tower);
    await idle();
    await page.screenshot({ path: `${out}/${seed}-u0-sealed.png` });
    await page.evaluate(([t]) => {
      const fx = Math.sin(t.yaw), fz = Math.cos(t.yaw);
      window.__ow.teleport(t.g.x + fx * 0.3, t.g.z + fz * 0.3);
      window.__ow._body.heading = t.yaw + Math.PI;
      window.__ow.view(t.yaw + 0.7, 0.15, 7);
    }, [t]);
    await W(800);
    console.log('action at lock', await page.evaluate(() => window.__ow.beacons.action('walk')));
    await page.screenshot({ path: `${out}/${seed}-u1-lock.png` });
    await page.keyboard.down('KeyE');
    const t0 = Date.now();
    let broke = false;
    while (Date.now() - t0 < 5000) { if (await page.evaluate(() => window.__ow.beacons.busy)) { broke = true; break; } await W(30); }
    await page.keyboard.up('KeyE');
    console.log('broke', broke, ((Date.now() - t0) / 1000).toFixed(1) + 's');
    const s0 = Date.now();
    for (const [at, name] of [[0.3, 'u2-burst'], [1.2, 'u3-out'], [2.6, 'u4-happy'], [4.3, 'u5-look-up'], [5.3, 'u6-reach'], [7.3, 'u6b-haul'], [9.1, 'u7-over'], [11.0, 'u8-lit'], [12.8, 'u8b-after']]) {
      while ((Date.now() - s0) / 1000 < at) await W(10);
      await page.screenshot({ path: `${out}/${seed}-${name}.png` });
    }
    { const b0 = Date.now(); while (Date.now() - b0 < 20000 && (await page.evaluate(() => window.__ow.beacons.busy))) await W(100); }
    await W(1500);
    // Walk into the doorway.
    await page.evaluate(([t]) => {
      const fx = Math.sin(t.yaw), fz = Math.cos(t.yaw);
      window.__ow.teleport(t.g.x + fx * 7, t.g.z + fz * 7);
      window.__ow.view(t.yaw + 0.3, 0.12, 9);
      window.__ow.lockInput(t.yaw);
    }, [t]);
    await W(600);
    await page.keyboard.down('KeyW');
    const w0 = Date.now();
    while (Date.now() - w0 < 5000 && !(await page.evaluate(() => window.__ow.beacons.busy))) await W(20);
    await page.keyboard.up('KeyW');
    await page.evaluate(() => window.__ow.lockInput(null));
    await W(250); await page.screenshot({ path: `${out}/${seed}-u9-slurp.png` });
    await W(1600); await page.screenshot({ path: `${out}/${seed}-u10-head-view.png` });
    await page.evaluate(() => window.__ow.beacons.look(-500, 60));
    await W(400); await page.screenshot({ path: `${out}/${seed}-u11-look.png` });
    console.log('badge in head', await page.evaluate(() => window.__ow.beacons.action('carried')));
    await page.keyboard.press('KeyE');
    await W(1600); await page.screenshot({ path: `${out}/${seed}-u12-out.png` });
    console.log('out', await page.evaluate(() => ({ busy: window.__ow.beacons.busy, visible: window.__ow.rig.root.visible })));
  }
  if (s === 'free') {
    // The freeing sequence, frame-stepped: break the lock, then frames at set times.
    await set('none');
    await page.evaluate((id) => { window.__ow.focusAt(null); window.__ow.goToTower(id); }, tower);
    const t = await page.evaluate((id) => { const t = window.__ow.gen().towers.towers[id]; return { yaw: t.yaw, g: t.door.ground }; }, tower);
    await page.evaluate(([t]) => {
      const fx = Math.sin(t.yaw), fz = Math.cos(t.yaw);
      window.__ow.teleport(t.g.x + fx * 0.3, t.g.z + fz * 0.3);
      window.__ow._body.heading = t.yaw + Math.PI;
      window.__ow.view(t.yaw + 0.7, 0.15, 7);
    }, [t]);
    await idle();
    await page.evaluate(() => { window.__ow.manual(true); window.__ow.advance(30); window.__ow.beacons.debugBreak(); });
    const times = (opt('at', '0.35,0.6,1.0,1.8,2.6,3.4,4.4,5.0,5.8,6.6,7.4,8.4,9.6,10.6,11.4,12.2,13.0,13.8,14.6,15.4,16.2,17.2,18.6,19.6')).split(',').map(Number);
    let now = 0;
    for (const at of times) {
      const n = Math.max(1, Math.round((at - now) * 60));
      await page.evaluate((n) => window.__ow.advance(n), n);
      now += n / 60;
      await page.screenshot({ path: `${out}/${seed}-f${String(Math.round(at * 10)).padStart(3, '0')}.png` });
      if (opt('dbg', '0') === '1') console.log(at, await page.evaluate(() => { const B = window.__ow.beacons; return { lock: !!B.lock, fly: B.lock?.flyT, id: B.lock?.tower.id, free: B.free?.tower.id, n: B.group.children.length }; }));
    }
    await page.evaluate(() => window.__ow.manual(false));
  }
  if (s === 'travel') {
    // The tower camera and an ember flight: from a lit neighbour of home, look round, aim home, fly, arrive, get out.
    const ids = await page.evaluate(() => { const g = window.__ow.gen().towers; const from = g.home.links[0]; const other = g.towers[from].links.find((i) => i !== 0); return { from, other }; });
    await set('none');
    await page.evaluate(({ from }) => { window.__ow.beacons.debugSet(0); window.__ow.beacons.debugSet(from); window.__ow.beacons.debugEnter(from); }, ids);
    await idle();
    await page.evaluate(() => { window.__ow.manual(true); window.__ow.advance(60); });
    await page.screenshot({ path: `${out}/${seed}-t0-view.png` });
    if (ids.other !== undefined) { await page.evaluate((o) => { window.__ow.beacons.debugLookAt(o); window.__ow.advance(40); }, ids.other); await page.screenshot({ path: `${out}/${seed}-t1-unlit.png` }); }
    await page.evaluate(() => { window.__ow.beacons.debugLookAt(0); window.__ow.beacons.look(40, 0); window.__ow.advance(60); });
    console.log('aim', await page.evaluate(() => ({ aim: window.__ow.beacons.aim?.id, action: window.__ow.beacons.action('carried') })));
    await page.screenshot({ path: `${out}/${seed}-t2-aim-home.png` });
    const dur = await page.evaluate(() => { window.__ow.beacons.act('carried'); return window.__ow.beacons.slurp.dur; });
    console.log('flight', dur);
    let now = 0;
    for (const f of [0.06, 0.15, 0.35, 0.55, 0.75, 0.9, 0.97]) {
      const n = Math.round((f * dur - now) * 60); now += n / 60;
      await page.evaluate((n) => window.__ow.advance(n), n);
      await page.screenshot({ path: `${out}/${seed}-t3-fly-${Math.round(f * 100)}.png` });
    }
    await page.evaluate(() => window.__ow.advance(90));
    console.log('arrived', await page.evaluate(() => ({ inside: window.__ow.beacons.inside?.id, phase: window.__ow.beacons.slurp?.phase })));
    await page.screenshot({ path: `${out}/${seed}-t4-arrived.png` });
    await page.evaluate(() => { window.__ow.beacons.escape(); window.__ow.advance(150); });
    await page.screenshot({ path: `${out}/${seed}-t5-out.png` });
    console.log('out', await page.evaluate(() => ({ busy: window.__ow.beacons.busy, vis: window.__ow.rig.root.visible })));
    await page.evaluate(() => window.__ow.manual(false));
  }
  if (s === 'variety') {
    await set('none');
    for (const id of [1, 2, 4, 6]) { await frame(id, 0.6, 0.1, 150, 22); await idle(); await page.screenshot({ path: `${out}/${seed}-var-${id}.png` }); }
  }
  if (s === 'home') { await set('none'); await frame(0, 0.4, 0.1, 110, 20); await idle(); await page.screenshot({ path: `${out}/${seed}-home.png` }); await set(0); await W(1500); await page.screenshot({ path: `${out}/${seed}-home-lit.png` }); }
  if (s === 'lift') {
    // Walk-up lift, light it on top, walk off the edge and get set down.
    await set('none');
    const t = await page.evaluate((id) => { const t = window.__ow.gen().towers.towers[id]; return { x: t.x, z: t.z, yaw: t.yaw, foot: t.foot, head: t.head }; }, tower);
    await page.evaluate(([t]) => {
      window.__ow.goToTower(0);
      window.__ow.focusAt(null);
      const p = window.__ow.gen().towers.towers[t.id].pad;
      window.__ow.teleport(p.x, p.z);
      window.__ow._body.pos.y = p.y + 0.3;
      window.__ow.view(t.yaw + 0.35, 0.3, 11);
    }, [{ ...t, id: tower }]);
    await W(1200);
    await page.screenshot({ path: `${out}/${seed}-pad.png` });
    console.log('pad action', await page.evaluate(() => window.__ow.beacons.action('walk')));
    await page.keyboard.press('KeyE');
    const shotsAt = [0.12, 0.3, 0.55, 0.85, 1.2, 1.6];
    const t0 = Date.now();
    let k = 0;
    while (Date.now() - t0 < 4000 && k < shotsAt.length) {
      const busy = await page.evaluate(() => window.__ow.beacons.busy);
      if (busy) {
        const s0 = Date.now();
        for (const at of shotsAt) { while ((Date.now() - s0) / 1000 < at) await W(10); await page.screenshot({ path: `${out}/${seed}-lift-${k++}.png` }); }
      }
      await W(20);
    }
    await W(1500);
    await page.screenshot({ path: `${out}/${seed}-top.png` });
    console.log('onTop', await page.evaluate(() => window.__ow.beacons.onTop), 'action', await page.evaluate(() => window.__ow.beacons.action('walk')));
    await page.keyboard.press('KeyE');
    await W(700); await page.screenshot({ path: `${out}/${seed}-lighting.png` });
    await W(2500); await page.screenshot({ path: `${out}/${seed}-lit-top.png` });
    console.log('lit', await page.evaluate((id) => window.__ow.beacons.isLit(id), tower));
    await page.evaluate((y) => window.__ow.lockInput(y + Math.PI), t.yaw);
    await page.keyboard.down('KeyW');
    const d0 = Date.now();
    while (Date.now() - d0 < 5000 && !(await page.evaluate(() => window.__ow.beacons.busy))) await W(20);
    await page.keyboard.up('KeyW');
    await W(500); await page.screenshot({ path: `${out}/${seed}-down-0.png` });
    await W(500); await page.screenshot({ path: `${out}/${seed}-down-1.png` });
    await W(1500); await page.screenshot({ path: `${out}/${seed}-bottom.png` });
    console.log('after', await page.evaluate(() => { const b = window.__ow._body.pos; return [b.x, b.y, b.z].map(Math.round); }));
  }
}
await browser.close(); server.close();
