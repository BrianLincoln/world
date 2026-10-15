// The bridge as a quest (docs/NEXT-bridge.md), played by the keys:   node scripts/bridge.mjs <dir> [cross,shore,reload]
//   cross:  from `cp=offer2`: the short offering, the second homecoming, and then the giant wading the
//           strait (the crossing shot): a frame a second (`cross-*`), and back to you with the guide at
//           the water's edge.
//   shore:  from `cp=shore`: walk down the trail to the guide by the keys (W, steered by the camera), its
//           bridge thought close to, and the ride home (`ride-*`, a frame every half second): bikes out of
//           nowhere, off up the trail, the veil, in along the trail into the village, stopped in the yard.
//   reload: a reload at the shore (put back on the trail by the guide) and after the ride (home).
//   skip:   holding Space through the crossing and through the ride.
// Prints ok/FAIL per step; exits 1 on a failure. Serves $DIST (default dist/).
import { chromium } from 'playwright';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const args = process.argv.slice(2);
const dir = args[0] ?? 'shots/bridge';
const kinds = (args[1] ?? 'cross,shore,reload').split(',');
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
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
page.on('console', (m) => { if (!m.text().includes('useProgram') && !m.text().includes('toNonIndexed')) console.log('[page]', m.text().slice(0, 400)); });
page.on('pageerror', (e) => console.log('[pageerror]', e.message));
const base = () => `http://localhost:${server.address().port}/?ui=0&capture=1&mobs=0`;
const ready = async () => {
  for (let i = 0; i < 400; i++) { if (await page.evaluate(() => window.__ow?.ready() && !!window.__ow.story?.())) break; await page.waitForTimeout(250); }
  await page.waitForTimeout(300);
  await page.evaluate(() => window.__ow.manual(true));
};
const run = (fn, arg) => page.evaluate(fn, arg);
const shot = async (name) => { await page.screenshot({ path: path.join(dir, name + '.png') }); };
let failed = 0;
const check = (what, ok, more = '') => { console.log(`${ok ? 'ok  ' : 'FAIL'} ${what}${more ? '  ' + more : ''}`); if (!ok) failed++; };
/** Step `n` frames at 1/60; under a veil the land is built by workers, which need real time. */
const go = async (n, waiting = () => window.__ow.quest()?.waiting || window.__ow.homecoming2()?.waiting) => {
  while (n > 0) {
    const w = await run(waiting);
    const k = Math.min(n, w ? 3 : 20);
    await run((k) => window.__ow.advance(k), k);
    n -= k;
    if (w) await page.waitForTimeout(80);
  }
};
const st = () => run(() => {
  const ow = window.__ow, q = ow.quest(), g = ow.giant(), b = ow._body, sp = ow.story().spirit, d = ow.gen().dungeons;
  return {
    stage: q?.stage, part: q?.part, clock: +(q?.clock ?? 0).toFixed(1), veil: +(q?.veil ?? 0).toFixed(2), mode: ow.mode(),
    at: [Math.round(b.pos.x), Math.round(b.pos.z)], guide: [Math.round(sp.pos.x), Math.round(sp.pos.z)], riding: !!sp.riding, icon: sp.want.icon,
    giant: g && { steps: +g.steps.toFixed(1), walking: g.walking, y: Math.round(g.centre.y), by3: Math.round(Math.hypot(g.centre.x - d[2].x, g.centre.z - d[2].z)) },
    h2: ow.homecoming2()?.state, settled: ow.homecoming2()?.settled,
  };
});

if (kinds.includes('cross')) {
  await page.goto(`${base()}&fresh=1&cp=offer2`); await ready();
  // The offering and the homecoming: hands off; W held throughout must move nothing.
  await page.keyboard.down('KeyW');
  let s, n = 0, seen = new Set(), wasPart = '';
  for (let i = 0; i < 400; i++) {
    await go(60);
    s = await st();
    if (s.stage === 'cross') {
      seen.add(s.part);
      if (s.part !== wasPart) { console.log('part', s.part, JSON.stringify(s)); wasPart = s.part; }
      await shot(`cross-${String(++n).padStart(2, '0')}-${s.part}`);
    }
    if (s.stage === 'shore' && seen.size) break;
  }
  await page.keyboard.up('KeyW');
  check('the crossing plays after the second homecoming, in its parts', s.stage === 'shore' && ['shots', 'out'].every((p) => seen.has(p)), `${n} frames; ${[...seen].join(' ')}`);
  await go(60);
  s = await st();
  await shot('cross-back');
  check('back to you by the shrine, the guide at the water\'s edge thinking of a bridge', s.stage === 'shore' && s.icon === 'bridge' && s.guide[1] > 3400 && s.at[1] < 3200, JSON.stringify(s));
  // The giant walks on and lies down by the third ring.
  const took = await run(() => { const ow = window.__ow; let f = 0; for (; f < 20000 && !ow.homecoming2().settled; f += 30) ow.advance(30, 1 / 30); return f / 30; });
  s = await st();
  check('the giant goes on and lies down by the third ring', s.settled && s.giant.by3 < 160, `${took.toFixed(0)} s; ${JSON.stringify(s.giant)}`);
}

if (kinds.includes('shore')) {
  await page.goto(`${base()}&fresh=1&cp=shore`); await ready();
  await go(30);
  let s = await st();
  check('at the shore, the guide waits at the water\'s edge', s.stage === 'shore' && s.icon === 'bridge', JSON.stringify(s));
  // Walk to it by the keys: the camera's heading is the way W goes.
  await run(() => { const ow = window.__ow, sp = ow.story().spirit, b = ow._body; const h = Math.atan2(sp.pos.x - b.pos.x, sp.pos.z - b.pos.z); ow.lockInput(h + Math.PI); ow.view(h + Math.PI + 0.5, 0.25, 9); });
  await shot('shore-1-walk');
  await page.keyboard.down('KeyW');
  for (let i = 0; i < 60; i++) {
    await go(10);
    s = await st();
    const near = await run(() => { const ow = window.__ow, sp = ow.story().spirit, b = ow._body; return Math.hypot(sp.pos.x - b.pos.x, sp.pos.z - b.pos.z); });
    if (near < 11 && i % 3 === 0) await shot(`shore-2-near-${i}`);
    if (s.stage !== 'shore') break;
  }
  await page.keyboard.up('KeyW');
  await run(() => window.__ow.lockInput(null));
  check('coming up to it starts the ride', s.stage === 'ride', JSON.stringify(s));
  // The ride: hands off, a frame every half second.
  let n = 0, seen = new Set(), was = '';
  await page.keyboard.down('KeyW');
  for (let i = 0; i < 200; i++) {
    await go(30);
    s = await st();
    if (s.stage !== 'ride') break;
    seen.add(s.part);
    if (s.part !== was) { console.log('part', s.part, JSON.stringify(s)); was = s.part; }
    await shot(`ride-${String(++n).padStart(2, '0')}-${s.part}`);
  }
  await page.keyboard.up('KeyW');
  s = await st();
  await go(60);
  await shot('ride-end');
  const home = await run(() => { const ow = window.__ow, st = ow.story().site, b = ow._body; return Math.round(Math.hypot(b.pos.x - st.x, b.pos.z - st.z)); });
  check('the ride plays through and stops in the yard, on your bike', s.stage === 'mill' && ['hello', 'bikes', 'off', 'cut', 'in', 'stop'].every((p) => seen.has(p)) && s.mode === 'bike' && home < 45, `${[...seen].join(' ')}; ${home} m from the cabin; ${JSON.stringify(s)}`);
}

if (kinds.includes('reload')) {
  await page.goto(`${base()}&fresh=1&cp=shore`); await ready();
  await go(30);
  await page.goto(`${base()}`); await ready();
  await go(60);
  let s = await st();
  await shot('reload-shore');
  const gap = await run(() => { const ow = window.__ow, sp = ow.story().spirit, b = ow._body; return Math.round(Math.hypot(sp.pos.x - b.pos.x, sp.pos.z - b.pos.z)); });
  check('a reload at the shore puts you on the trail by the guide', s.stage === 'shore' && gap < 25 && s.guide[1] > 3400, `${gap} m; ${JSON.stringify(s)}`);
  await page.goto(`${base()}&fresh=1&cp=mill`); await ready();
  await go(30);
  await page.goto(`${base()}`); await ready();
  await go(60);
  s = await st();
  check('a reload after the ride is at home', s.stage === 'mill' && Math.abs(s.at[1] - 350) < 80, JSON.stringify(s));
}
if (kinds.includes('skip')) {
  // Holding Space skips a cutscene: the crossing, as if seen; the ride, as if ridden.
  await page.goto(`${base()}&fresh=1&cp=offer2`); await ready();
  for (let i = 0; i < 300; i++) { await go(60); if ((await st()).part === 'shots') break; }
  await run(() => window.__ow.skip());
  await go(240);
  let s = await st();
  check('skipping the crossing leaves the giant over the water and the guide at the shore', s.stage === 'shore' && s.giant.steps > 50 && s.icon === 'bridge', JSON.stringify(s));
  await run(() => { const ow = window.__ow, sp = ow.story().spirit; ow.teleport(sp.pos.x, sp.pos.z - 4); });
  for (let i = 0; i < 40; i++) { await go(10); if ((await st()).stage === 'ride') break; }
  await go(60);
  await run(() => window.__ow.skip());
  await go(240);
  s = await st();
  await shot('skip-ride');
  check('skipping the ride leaves you on your bike in the yard', s.stage === 'mill' && s.mode === 'bike' && Math.abs(s.at[1] - 360) < 40, JSON.stringify(s));
}
await browser.close(); server.close();
process.exit(failed ? 1 : 0);
