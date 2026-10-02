// The offering (dungeon 1, slice B): node scripts/offering.mjs <dir> [seed=hilda] [t=10] [sandbox] [play,reload,views]
//   play:   in the story at the ring (?cp=ring), as if the light had just been taken: up on the rockhopper,
//           the ring shutting into a shrine, the light going to it, and the whole of the crow and the
//           giant, a shot every `every` seconds (every=1), W held throughout (it is a cutscene: nothing
//           may move you). Exits 1 if a step failed.
//   reload: a reload at each step (light held, light in the bowl, the giant has it): what a save finds.
//   views:  the giant asleep beforehand, and from the saddle afterwards: the shrine, the giant from three sides.
//   mouth:  the crow going into the giant's mouth, a shot every 0.2 s from the cutscene's own camera; and the open
//           mouth from straight in front and from either side (is the hollow there, is anything in the way).
//   `sandbox`: with the story off (as scripts/dungeon.mjs quest runs): a giant is stood by the ring.
// Uses the build in dist/ (run `npx vite build` first).
import { chromium } from 'playwright';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const args = process.argv.slice(2);
const dir = args[0] ?? 'shots/offering';
const arg = (k, d) => args.find((a) => a.startsWith(k + '='))?.slice(k.length + 1) ?? d;
const seed = arg('seed', 'hilda'), hour = arg('t', ''), every = parseFloat(arg('every', '1'));
const sandbox = args.includes('sandbox');
const kinds = (args.find((a) => /^(play|reload|views|mouth)/.test(a)) ?? 'play').split(',');
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
page.on('console', (m) => { if (!m.text().includes('useProgram') && !m.text().includes('toNonIndexed')) console.log('[page]', m.text().slice(0, 400)); });
page.on('pageerror', (e) => console.log('[pageerror]', e.message));
const base = `seed=${seed}&ui=0&capture=1&drak=0&mobs=0`;
const load = async (q) => {
  await page.goto(`http://localhost:${server.address().port}/?${base}&${q}`);
  for (let i = 0; i < 200; i++) { if (await page.evaluate(() => window.__ow?.ready())) break; await page.waitForTimeout(250); }
  await page.waitForTimeout(600);
};
/** At the ring, the giant asleep beside it, nothing saved. */
const fresh = () => load(sandbox ? `story=0&fresh=1&x=0&z=0${hour ? `&t=${hour}` : '&t=10'}` : 'story=1&fresh=1&cp=ring');
/** The same page again, as a player's reload: the saves as they stand. */
const again = () => load(sandbox ? `story=0&t=${hour || 10}` : 'story=1');
const shot = async (name) => { await page.screenshot({ path: path.join(dir, name + '.png') }); console.log(name); };
const run = (fn, a) => page.evaluate(fn, a);
const step = (n) => run((n) => window.__ow.advance(n), n);
let failed = 0;
const check = (what, ok, more = '') => { console.log(`${ok ? 'ok  ' : 'FAIL'} ${what}${more ? '  ' + more : ''}`); if (!ok) failed++; };
const state = () => run(() => {
  const ow = window.__ow, o = ow.offering(), g = ow.giant(), p = ow._body.pos, s = o.shrineAt;
  return { state: o.state, clock: +o.clock.toFixed(2), busy: o.busy, mode: ow.mode(), sealed: ow.ring().sealed, sealK: +ow.ring().sealK.toFixed(2), fromShrine: +Math.hypot(p.x - s.x, p.z - s.z).toFixed(1), giant: g && { awake: g.awake, mouth: g.mouth, grin: +g.grin.toFixed(2) } };
});
const setup = async () => {
  await fresh();
  if (kinds.includes('views')) {
    // The giant asleep, before any of it: from by the ring, from further back, and from its flank.
    for (const [name, back, turn, dist] of [['front', 16, 0, 14], ['far', -30, 0, 16]]) {
      await run(([back, turn, dist]) => { const ow = window.__ow, g = ow.giant(), d = ow.gen().dungeon; ow.manual(true); const ux = g.centre.x - d.x, uz = g.centre.z - d.z, l = Math.hypot(ux, uz), a = Math.atan2(ux, uz) + turn; ow.teleport(g.centre.x - Math.sin(a) * (l - back), g.centre.z - Math.cos(a) * (l - back)); ow.view(a + Math.PI, -0.22, dist); ow.advance(40); }, [back, turn, dist]);
      await shot(`v-asleep-${name}`);
    }
  }
  if (hour && !sandbox) await run((h) => window.__ow.setHour(h), parseFloat(hour));
  await run(() => { const ow = window.__ow; ow.manual(true); if (!ow.visit()?.route) ow.goToRing(); ow.advance(30); ow.winDungeon(); });
};
/** Hold W the whole time (hands must be off) and step until the light has left your shoulder. Returns frames taken, or -1. */
const untilPlaced = () => run(() => {
  const ow = window.__ow, o = ow.offering();
  window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyW' }));
  let f = 0;
  for (; f < 900 && o.state === 'held'; f++) ow.advance(1);
  return o.state === 'placed' ? f : -1;
});
const keysUp = () => run(() => { for (const code of ['KeyW', 'KeyE']) window.dispatchEvent(new KeyboardEvent('keyup', { code })); });
const where = () => run(() => window.__ow._body.pos.toArray());

if (kinds.includes('play')) {
  await setup();
  const p0 = await where();
  await run(() => window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyW' })));
  // Coming up: the arms, the field closing, the shrine rising. W is held from here to the end.
  let s;
  for (let i = 0; i < 9 && (s = await state()).state === 'held'; i++) { await step(30); await shot(`o-00-up-${i}`); }
  const f = await untilPlaced();
  s = await state();
  check('the ring shut, the shrine came up, and the light left for it by itself', f >= 0 && s.sealed && s.sealK >= 1 && s.state === 'placed' && s.mode === 'ride', JSON.stringify(s));
  const cues = await run(() => window.__ow.offering().cues);
  console.log('cues', JSON.stringify(Object.fromEntries(Object.entries(cues).map(([k, v]) => [k, +v.toFixed(1)]))));
  let n = 0, moved = 0;
  for (let t = 0; t < cues.end + 1; t += every) {
    await step(Math.round(every * 60));
    s = await state();
    await shot(`o-${String(++n).padStart(2, '0')}-t${String(Math.round(s.clock < 0 ? t : s.clock)).padStart(2, '0')}`);
    const p = await where();
    if (s.busy) moved = Math.max(moved, Math.hypot(p[0] - p0[0], p[2] - p0[2]));
  }
  check('hands off from coming up to the end', moved < 0.3, `moved ${moved.toFixed(2)} m with W held`);
  s = await state();
  check('the giant has it: awake, its mouth shut again, smiling', s.state === 'given' && !s.busy && s.giant.awake && s.giant.mouth === 0 && s.giant.grin > 0.4, JSON.stringify(s));
  check('still on the rockhopper when control comes back', s.mode === 'ride', s.mode);
  await keysUp();
  await step(120);
  await shot('o-end');
}

if (kinds.includes('reload')) {
  // Held: reload before the light has left you, and you're by the shrine on the rockhopper; it carries on by itself.
  await setup();
  await step(60);
  await again();
  await run(() => { window.__ow.manual(true); window.__ow.advance(20); });
  let s = await state();
  check('reload with the light held: by the shrine, mounted, ring shut', (s.state === 'held' || s.state === 'placed') && s.mode === 'ride' && s.sealed && s.fromShrine < 8, JSON.stringify(s));
  await shot('r-held');
  const f = await untilPlaced();
  await keysUp();
  check('and it goes on by itself', f >= 0, `frames ${f}`);
  await step(360);
  await shot('r-placed-before');
  // Placed: reload part way through, and it plays again from the light in the bowl.
  await again();
  await run(() => { window.__ow.manual(true); window.__ow.advance(60); });
  s = await state();
  check('reload part way through: it plays again from the light in the bowl', s.state === 'placed' && s.busy && s.mode === 'ride', JSON.stringify(s));
  await shot('r-placed');
  const end = await run(() => window.__ow.offering().cues.end);
  await step(Math.round((end + 2) * 60));
  s = await state();
  check('and runs to the end', s.state === 'given' && !s.busy, JSON.stringify(s));
  // Given: reload, and the giant is awake, its fist shut and cold, the arm down.
  await again();
  await run(() => { const ow = window.__ow; ow.manual(true); ow.advance(30); ow.goToRing(); ow.advance(60); });
  s = await state();
  check('reload after: the giant awake and smiling; the ring a shrine; no light', s.state === 'given' && s.sealed && s.giant?.awake && s.giant.mouth === 0 && s.giant.grin > 0.4, JSON.stringify(s));
  await run(() => { const ow = window.__ow, g = ow.giant(), b = ow._body.pos; ow.view(Math.atan2(b.x - g.centre.x, b.z - g.centre.z), -0.12, 16); ow.advance(30); });
  await shot('r-given');
}

if (kinds.includes('views')) {
  await setup();
  await untilPlaced();
  await keysUp();
  const end = await run(() => window.__ow.offering().cues.end);
  await step(Math.round((end + 4) * 60));
  // From the saddle, as the orbit camera has it, after: the shrine close to, and the giant from three sides.
  await run(() => { const ow = window.__ow; ow.view(ow._body.heading + Math.PI + 0.9, 0.16, 9); ow.advance(20); });
  await shot('v-shrine');
  for (const [i, a] of [0, 0.8, -0.8].entries()) {
    await run((a) => { const ow = window.__ow, g = ow.giant(), b = ow._body.pos; ow.view(Math.atan2(b.x - g.centre.x, b.z - g.centre.z) + a, -0.1, 14); ow.advance(20); }, a);
    await shot(`v-given-${i}`);
  }
  // And from up close under the fist, where a player would go and look.
  await run(() => { const ow = window.__ow, g = ow.giant(), d = ow.gen().dungeon; const ux = g.centre.x - d.x, uz = g.centre.z - d.z, l = Math.hypot(ux, uz); ow.teleport(d.x + (ux / l) * (l - 42), d.z + (uz / l) * (l - 42)); ow.view(Math.atan2(-ux, -uz), -0.3, 16); ow.advance(40); });
  await shot('v-given-under');
}
if (kinds.includes('mouth')) {
  await setup();
  await untilPlaced();
  await keysUp();
  const cues = await run(() => window.__ow.offering().cues);
  const to = async (t) => { const c = (await state()).clock; if (c >= 0 && c < t) await step(Math.round((t - c) * 60)); };
  await to(cues.fly + 0.5);
  // The open mouth from other places (the cutscene's camera put back after).
  for (const [name, k, side, up] of [['front', 4.5, 0, 0], ['left', 4, 22, 4], ['right', 4, -22, 4]]) {
    await run(([k, side, up]) => {
      const ow = window.__ow, o = ow.offering(), g = ow.giant(), v = () => ow._body.pos.clone();
      const at = g.throat(v(), 1), pos = g.throat(v(), k), a = g.facing;
      pos.x += Math.cos(a) * side; pos.z -= Math.sin(a) * side; pos.y += up;
      o._cine ??= o.cinematic;
      o.cinematic = () => ({ pos, at, fov: 30 });
      ow.advance(2);
    }, [k, side, up]);
    await shot(`m-open-${name}`);
  }
  await run(() => { const o = window.__ow.offering(); o.cinematic = o._cine; });
  await to(cues.gone - 2.2);
  for (let i = 0; (await state()).clock < cues.closed + 0.5 && i < 40; i++) { await step(12); await shot(`m-${String(i).padStart(2, '0')}`); }
  await to(cues.smile + 1.5);
  await shot('m-smile');
}
await browser.close(); server.close();
process.exit(failed ? 1 : 0);
