// The bridge as a quest (docs/NEXT-bridge.md), played by the keys:   node scripts/bridge.mjs <dir> [cross,shore,reload]
//   cross:  from `cp=offer2`: the short offering, the second homecoming, and then the giant wading the
//           strait (the crossing shot): a frame a second (`cross-*`), and back to you with the guide at
//           the water's edge.
//   shore:  from `cp=shore`: walk down the trail to the guide by the keys (W, steered by the camera), its
//           bridge thought close to, and the ride home (`ride-*`, a frame every half second): bikes out of
//           nowhere, off up the trail, the veil, in along the trail into the village, stopped in the yard.
//   reload: a reload at the shore (put back on the trail by the guide) and after the ride (home).
//   skip:   holding Space through the crossing and through the ride.
//   mill:   from `cp=mill`: the guide shows the mill's sketch; gather stones and logs and build it by the keys
//           (`mill-*`); then two minutes of the villagers working it (`work-*`: felling, carrying, sawing);
//           its stack is yours; a reload.
//   wagon:  from the mill standing: build the wagon by the keys (`wagon-*`), then its load with nobody helping
//           (`load-*`: how long it takes) and with wood of yours; a reload.
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
page.setDefaultNavigationTimeout(180000);
page.setDefaultTimeout(180000);
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
/**
 * Play the director's phase 4 by the keys until the step is `until`: walk to its goal (steering by the camera's
 * heading), hold E at a tree or a rock while gathering, tap E in the build zone. Frames as it goes when `snap`.
 */
const playSteps = async (until, snap = null, limit = 30000) => {
  let frames = 0, held = { w: false, e: false }, last = null, stuck = 0;
  const key = async (k, on) => { const f = k === 'KeyW' ? 'w' : 'e'; if (held[f] === on) return; held[f] = on; if (on) await page.keyboard.down(k); else await page.keyboard.up(k); };
  while (frames < limit) {
    const g = await run(() => {
      const ow = window.__ow, s = ow.story(), b = ow._body.pos, goal = s.goal(), st = s.step;
      if (!goal) return { step: st.id, kind: st.kind };
      const w = window, now = w.__frames = (w.__frames ?? 0) + 1;
      if (!w.__route || Math.hypot(w.__routeGoal.x - goal.x, w.__routeGoal.z - goal.z) > 0.5 || now - w.__routeT > 40) { w.__route = s.route(b, goal); w.__routeGoal = { x: goal.x, z: goal.z }; w.__routeT = now; }
      while (w.__route.length > 1 && Math.hypot(w.__route[0].x - b.x, w.__route[0].z - b.z) < 0.5) w.__route.shift();
      return { step: st.id, kind: st.kind, goal: { x: goal.x, z: goal.z }, wp: { x: w.__route[0].x, z: w.__route[0].z }, b: { x: b.x, z: b.z }, inv: { ...s.inv } };
    });
    if (g.step === until) break;
    if (process.env.VERBOSE && frames % 600 < 6) console.log('  ', frames, g.step, JSON.stringify(g.b), JSON.stringify(g.goal), JSON.stringify(g.inv));
    if (snap) await snap(g, frames);
    if (!g.goal) { await key('KeyW', false); await key('KeyE', false); await run(() => window.__ow.advance(10)); frames += 10; continue; }
    const dGoal = Math.hypot(g.goal.x - g.b.x, g.goal.z - g.b.z);
    await run((y) => window.__ow.lockInput(y), Math.atan2(-(g.wp.x - g.b.x), -(g.wp.z - g.b.z)));
    const build = g.kind === 'build', gather = g.kind === 'gather';
    const at = dGoal < (build ? 6 : 2.3);
    await key('KeyW', dGoal > (build ? 2.5 : gather ? 1.6 : 0.5));
    await key('KeyE', gather && at);
    if (build && at) await page.keyboard.press('KeyE');
    // (Stuck walking somewhere, a hop; never while swinging at something.)
    if (last && Math.hypot(g.b.x - last.x, g.b.z - last.z) < 0.03 && held.w && !held.e) { if (++stuck > 10) { await page.keyboard.press('Space'); stuck = 0; } } else stuck = 0;
    last = g.b;
    await run(() => window.__ow.advance(6));
    frames += 6;
  }
  await key('KeyW', false); await key('KeyE', false);
  await run(() => window.__ow.lockInput(null));
  return frames;
};
/** Look at (x, y, z) from `dist` m off, `yaw` round and `pitch` up. */
const look = (p, yaw, pitch, dist) => run(([p, yaw, pitch, dist]) => { window.__ow.focusAt(p.x, p.y, p.z); window.__ow.view(yaw, pitch, dist); window.__ow.advance(2); }, [p, yaw, pitch, dist]);
const millSt = () => run(() => { const ow = window.__ow, s = ow.story(), m = s.mill; return { step: s.step.id, built: m.standing, logs: m.logs, stock: m.stock, inv: { ...s.inv }, hands: ow.village().millHands }; });

if (kinds.includes('mill')) {
  await page.goto(`${base()}&fresh=1&cp=mill`); await ready();
  await run(() => window.__ow.setHour(10.5));
  await go(60);
  const yaw0 = await run(() => { const m = window.__ow.story().mill; return m.frame.rot + 0.5; });
  let shotN = 0;
  const seenSteps = new Set();
  const frames = await playSteps('wplot', async (g, f) => {
    if (seenSteps.has(g.step)) return;
    seenSteps.add(g.step);
    console.log('step', g.step, JSON.stringify(g.inv ?? {}));
    await shot(`mill-${String(++shotN).padStart(2, '0')}-${g.step}`);
  });
  let s = await millSt();
  await go(120);
  const m0 = await run(() => { const m = window.__ow.story().mill, c = m.local(0, 0, 1.2); return { x: c.x, y: c.y, z: c.z, rot: m.frame.rot }; });
  await look(m0, m0.rot + 0.55, 0.28, 16);
  await shot('mill-built');
  check('the mill is built by the keys: stones for its footing, logs for its frame and roof', s.built && s.step === 'wplot', `${frames} frames; ${[...seenSteps].join(' ')}; ${JSON.stringify(s)}`);
  // The village at it: two minutes of play, looking round at what they do.
  const watched = new Set();
  for (let i = 0; i < 24; i++) {
    await go(300);
    s = await millSt();
    for (const h of s.hands) {
      const key = `${h.kind}-${h.stage}`;
      if (watched.has(key) || !['chop', 'carry', 'saw', 'toBoards'].includes(h.stage)) continue;
      watched.add(key);
      const p = await run((k) => { const sp = window.__ow.village().spirits[k]; return { x: sp.pos.x, y: sp.pos.y + 0.5, z: sp.pos.z }; }, h.k);
      await look(p, m0.rot + 0.9, 0.22, 4.5);
      await shot(`work-${key}`);
    }
    if (i % 6 === 5) { await look(m0, m0.rot + 0.55, 0.28, 16); await shot(`mill-work-${i}`); }
  }
  s = await millSt();
  await run(() => window.__ow.focusAt(null));
  check('the villagers fell, carry in and saw: boards on the stack', s.stock >= 3 && watched.has('fell-chop') && watched.has('saw-saw'), `${[...watched].join(' ')}; ${JSON.stringify(s)}`);
  // The stack is yours to take.
  const took = await run(() => { const ow = window.__ow, m = ow.story().mill, a = m.stackAt, before = ow.story().inv.logs; ow.teleport(a.x, a.z); ow.advance(90); return { before, after: ow.story().inv.logs, left: m.stock }; });
  check('walking up to the stack, its boards are yours', took.after > took.before, JSON.stringify(took));
  // A reload: the mill stands, with what was on its pile and stack.
  await go(90);
  await page.goto(`${base()}`); await ready();
  await go(60);
  const r = await millSt();
  check('a reload finds the mill standing', r.built && ['wplot', 'wlogs', 'wagon'].includes(r.step), JSON.stringify(r));
}

if (kinds.includes('wagon')) {
  // From the mill standing (`debugJump('wplot')`): the guide shows the wagon; build it by the keys; then the load,
  // with nobody helping (game time, stepped) and then with wood of yours.
  await page.goto(`${base()}&fresh=1&cp=mill`); await ready();
  await run(() => { window.__ow.setHour(10); window.__ow.story().debugJump('wplot'); window.__ow.story().inv.logs = 0; });
  await go(60);
  let shotN = 0;
  const seen = new Set();
  const frames = await playSteps('loading', async (g) => { if (seen.has(g.step)) return; seen.add(g.step); console.log('step', g.step); await shot(`wagon-${String(++shotN).padStart(2, '0')}-${g.step}`); });
  await go(90);
  const wst = () => run(() => { const s = window.__ow.story(), w = s.wagon; return { step: s.step.id, built: w.built, load: w.load, full: w.full, kept: s.millKept, stock: s.mill.stock, inv: s.inv.logs, icon: s.spirit.want.icon, count: s.spirit.want.count }; });
  let s = await wst();
  const w0 = await run(() => { const w = window.__ow.story().wagon, c = w.local(0, 0, 1); return { x: c.x, y: c.y, z: c.z, rot: w.heading }; });
  await look(w0, w0.rot + 2.2, 0.3, 9);
  await shot('wagon-built');
  check('the wagon is built by the keys, and the guide wants it loaded', s.built && s.step === 'loading' && s.icon === 'log' && s.count > 0, `${frames} frames; ${[...seen].join(' ')}; ${JSON.stringify(s)}`);
  // Nobody helping: how long until it's full (game time), with a look now and then.
  await run(() => window.__ow.teleport(window.__ow.story().anchor('millView').x + 8, window.__ow.story().anchor('millView').z + 8));
  let t = 0;
  for (; t < 600 && !(await wst()).full; t += 10) {
    await go(600);
    if (t % 60 === 0) { await look(w0, w0.rot + 2.2 + t * 0.003, 0.3, 11); await shot(`load-${String(t).padStart(3, '0')}`); }
  }
  s = await wst();
  check('the villagers fill it in about four minutes with nobody helping', s.full && t >= 150 && t <= 330, `${t} s; ${JSON.stringify(s)}`);
  await look(w0, w0.rot + 2.2, 0.3, 9);
  await shot('wagon-full');
  // And with your wood: a fresh load, and ten logs walked up to it.
  await run(() => { const s = window.__ow.story(); s.wagon.setLoad(0); s.inv.logs = 10; const a = s.wagon.local(-2, 0); window.__ow.teleport(a.x, a.z); });
  await go(120);
  s = await wst();
  check('wood you bring goes in', s.load >= 10 && s.inv === 0, JSON.stringify(s));
  await page.goto(`${base()}`); await ready();
  await go(60);
  const r = await wst();
  check('a reload keeps the wagon and its load', r.built && r.load >= 10, JSON.stringify(r));
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
