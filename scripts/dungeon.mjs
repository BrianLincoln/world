// The first dungeon: node scripts/dungeon.mjs <dir> [seed=hilda] [inside,take,leave,quest]
//   inside: stills from round the cave (the ring opened, dropped straight in)
//   take:   the ring taking you down, frame-stepped, and being let down inside
//   leave:  back on the mark: lifted, and put out on the field
// Uses the build in dist/ (run `npx vite build` first).
import { chromium } from 'playwright';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const args = process.argv.slice(2);
const dir = args[0] ?? 'shots/dungeon';
const seed = args.find((a) => a.startsWith('seed='))?.slice(5) ?? 'hilda';
const kinds = (args.find((a) => /^(inside|take|leave|quest)/.test(a)) ?? 'inside,take,leave').split(',');
fs.mkdirSync(dir, { recursive: true });
const server = http.createServer((req, res) => {
  const p = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  const f = path.join(root, 'dist', p === '/' ? 'index.html' : p);
  if (!fs.existsSync(f)) { res.writeHead(404); res.end(); return; }
  res.writeHead(200, { 'content-type': f.endsWith('.js') ? 'text/javascript' : f.endsWith('.html') ? 'text/html' : f.endsWith('.css') ? 'text/css' : 'application/octet-stream' });
  fs.createReadStream(f).pipe(res);
});
await new Promise((r) => server.listen(0, r));
const browser = await chromium.launch({ args: ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: 1600, height: 900 } });
page.on('console', (m) => { if (!m.text().includes('useProgram')) console.log('[page]', m.text().slice(0, 400)); });
page.on('pageerror', (e) => console.log('[pageerror]', e.message));
const load = async (q) => {
  await page.goto(`http://localhost:${server.address().port}/?seed=${seed}&story=0&t=10&ui=0&capture=1&mobs=0&drak=0&${q}`);
  for (let i = 0; i < 160; i++) { if (await page.evaluate(() => window.__ow?.ready())) break; await page.waitForTimeout(250); }
  await page.waitForTimeout(500);
};
const shot = async (name) => { await page.screenshot({ path: path.join(dir, name + '.png') }); console.log(name); };
const step = (n, dt = 1 / 60) => page.evaluate(([n, dt]) => window.__ow.advance(n, dt), [n, dt]);

if (kinds.includes('inside')) {
  await load('dungeon=1');
  await page.evaluate(() => window.__ow.manual(true));
  // [name, plan x, plan z (times the cave's side), camera yaw off "behind you looking on", pitch, dist]
  const views = [
    ['well', 0, 0, 0, 0.1, 12], ['well-up', 4, 3, 2.4, -0.5, 10], ['well-back', 9, 0, Math.PI, 0.16, 12],
    ['hall', 24, 6, 0.2, 0.12, 9], ['grotto', 29, -12, -1.4, 0.16, 8], ['hall2', 44, 4, -0.4, 0.12, 9],
    ['cavern', 60, -3, 0.1, 0.1, 10], ['pool', 72, 2, 0.5, 0.2, 13], ['cavern-far', 92, 6, 0.3, 0.12, 11],
    ['niche', 110, 19, 0.3, 0.14, 8], ['cavern-back', 100, 2, 2.6, 0.14, 12],
  ];
  for (const [name, x, z, yaw, pitch, dist] of views) {
    await page.evaluate(([x, z, yaw, pitch, dist]) => {
      const ow = window.__ow, d = ow.dungeon();
      const side = d.layout.rooms[1].z < 0 ? 1 : -1;
      d.drop(x, z * side);
      ow._body.heading = Math.atan2(Math.cos(d.facing), Math.sin(d.facing));
      ow.view(d.startYaw + yaw * side, pitch, dist);
    }, [x, z, yaw, pitch, dist]);
    await step(40);
    await shot(`in-${name}`);
  }
}

if (kinds.includes('take') || kinds.includes('leave')) {
  await load('');
  await page.evaluate(() => {
    const ow = window.__ow, g = ow.gen().dungeon;
    ow.ring().setOpen();
    ow.goToRing();
    ow.manual(true);
    ow.advance(120);
    // Walk straight at the middle of the ring.
    const b = ow._body;
    ow.lockInput(Math.atan2(b.pos.x - g.x, b.pos.z - g.z));
  });
  await shot('take-00-outside');
  await page.keyboard.down('KeyW');
  let i = 1;
  for (let f = 0; f < 400; f++) {
    await step(1);
    if (await page.evaluate(() => window.__ow.ring().busy)) break;
  }
  if (kinds.includes('take')) {
    // The reach, the hold, the pull, the cut, and being let down.
    for (let f = 0; f < 34; f++) { await step(6); await shot(`take-${String(i++).padStart(2, '0')}`); }
  } else await step(240);
  await page.keyboard.up('KeyW');
  console.log(JSON.stringify(await page.evaluate(() => ({ inside: window.__ow.dungeon()?.inside, busy: window.__ow.dungeon()?.busy, pos: window.__ow.pos() }))));
  if (kinds.includes('leave')) {
    // Off the mark and back on to it.
    await page.evaluate(() => { const ow = window.__ow, d = ow.dungeon(); ow.lockInput(Math.atan2(-Math.cos(d.facing), -Math.sin(d.facing))); });
    await page.keyboard.down('KeyS');
    await step(110);
    await page.keyboard.up('KeyS');
    await shot('leave-00-off');
    await page.keyboard.down('KeyW');
    for (let f = 0; f < 400; f++) { await step(1); if (await page.evaluate(() => window.__ow.dungeon().busy)) break; }
    await page.keyboard.up('KeyW');
    i = 1;
    for (let f = 0; f < 26; f++) { await step(6); await shot(`leave-${String(i++).padStart(2, '0')}`); }
    console.log(JSON.stringify(await page.evaluate(() => ({ inside: window.__ow.dungeon()?.inside, ring: window.__ow.ring().busy, pos: window.__ow.pos(), g: window.__ow.gen().dungeon.y }))));
  }
}
if (kinds.includes('quest')) {
  // The whole of what there is to do: break the rockfall, ride the rockhopper, bound up the ledge, take the light.
  await load('dungeon=1');
  const at = (x, z, yaw, pitch, dist) => page.evaluate(([x, z, yaw, pitch, dist]) => {
    const ow = window.__ow, d = ow.dungeon(), side = d.layout.rooms[1].z < 0 ? 1 : -1;
    const p = d.world(x, d.layout.floor(x, z * side), z * side);
    ow._body.pos.copy(p); ow._body.vel.set(0, 0, 0);
    if (yaw !== undefined) ow.view(yaw * side + Math.atan2(Math.cos(d.facing), Math.sin(d.facing)) + Math.PI, pitch, dist);
  }, [x, z, yaw, pitch, dist]);
  const state = () => page.evaluate(() => { const ow = window.__ow, d = ow.dungeon(), b = ow._body.pos; return { freed: d.freed, taken: d.taken, mode: ow.rideState ? undefined : 0, y: +(b.y - d.origin.y).toFixed(2), goat: d.goat && [+(d.goat.pos.x - d.origin.x).toFixed(1), +(d.goat.pos.y - d.origin.y).toFixed(1), +(d.goat.pos.z - d.origin.z).toFixed(1)] }; });
  await page.evaluate(() => window.__ow.manual(true));
  await at(27.8, -1.9, 1.35, 0.2, 9);
  await step(40);
  await shot('q-00-rockfall');
  console.log(JSON.stringify(await state()));
  await page.keyboard.down('KeyE');
  let n = 0;
  for (let f = 0; f < 240; f++) {
    await step(6);
    if (f % 8 === 3) await shot(`q-01-smash-${n++}`);
    if ((await state()).freed) break;
  }
  await page.keyboard.up('KeyE');
  await step(30); await shot('q-02-freed');
  await step(240); await shot('q-03-out');
  console.log(JSON.stringify(await state()));
  console.log('mounted', await page.evaluate(() => { const ow = window.__ow, g = ow.dungeon().goat; ow._body.pos.copy(g.pos); return ow.mountNearest(); }));
  await step(30); await shot('q-04-riding');
  // To the foot of the ledge, and at it: first without the bound, then with.
  await at(101, 14, 0.5, 0.16, 13);
  await page.evaluate(() => { const ow = window.__ow, d = ow.dungeon(), k = d.layout.shelf, side = 1; const wx = k.dx * Math.cos(d.facing) - k.dz * Math.sin(d.facing), wz = k.dx * Math.sin(d.facing) + k.dz * Math.cos(d.facing); ow.lockInput(Math.atan2(-wx, -wz)); });
  await step(20); await shot('q-05-ledge');
  await page.keyboard.down('KeyW');
  await step(150);
  console.log('ran at it', JSON.stringify(await state()));
  await shot('q-06-stopped');
  await page.keyboard.up('KeyW');
  await at(101, 14);
  await page.keyboard.down('KeyW');
  await step(28);
  await page.keyboard.down('Space'); await step(3); await page.keyboard.up('Space');
  for (let f = 0; f < 6; f++) { await step(9); await shot(`q-07-bound-${f}`); }
  await step(120);
  console.log('bounded', JSON.stringify(await state()));
  for (let f = 0; f < 300 && !(await state()).taken; f++) await step(4);
  await page.keyboard.up('KeyW');
  await step(60); await shot('q-08-light');
  console.log(JSON.stringify(await state()));
}
await browser.close(); server.close();
