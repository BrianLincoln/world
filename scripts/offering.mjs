// The offering (dungeon 1, slice B): node scripts/offering.mjs <dir> [seed=hilda] [t=10] [sandbox] [play,reload,views]
//   play:   in the story at the ring (?cp=ring), as if the light had just been taken: up on the rockhopper,
//           the ring shutting into a shrine, you getting down and taking the light to it, and the whole of the crow and the
//           giant, a shot every `every` seconds (every=1), W held throughout (it is a cutscene: nothing
//           may move you). Exits 1 if a step failed.
//   reload: a reload at each step (light held, light in the bowl, the giant has it): what a save finds.
//   views:  the giant asleep beforehand, and from the saddle afterwards: the shrine, the giant from three sides.
//   mouth:  the crow going into the giant's mouth, a shot every 0.2 s from the cutscene's own camera; and the open
//           mouth from straight in front and from either side (is the hollow there, is anything in the way).
//   claws:  the crow's feet as it takes the light, from beside it: a shot every 3 frames through the snatch (feet out
//           ahead, then back under it with the light in them), then hanging with it and flying up with it.
//   home:   what follows the smile (giant/homecoming.ts, slice C): a crow leaving the giant with a light, the cut
//           to the village (the light set down, the spirit, the guide, the house tidied), the cut back, the giant
//           getting up and walking off; then the walk to the second ring from where you sit and from above, it
//           lying down there, and a reload at each step (before the spirit is home, once it is, the giant
//           walking, the giant settled). `walk=0` skips the long walk (it is put at the end of it).
//   tower:  the tower the ring became: standing and lit afterwards, going up into its head, flying home, a reload.
//   `sandbox`: with the story off (as scripts/dungeon.mjs quest runs): a giant is stood by the ring.
// Uses the build in dist/, or in $DIST (run `npx vite build` first).
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
const kinds = (args.find((a) => /^(play|reload|views|mouth|claws|home|tower)/.test(a)) ?? 'play').split(',');
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
/** Step `n` frames. Under the homecoming's veil the land is being built by the workers, which need real time: a few frames, and a wait. */
const step = async (n) => {
  while (n > 0) {
    const waiting = await run(() => !!window.__ow.homecoming?.()?.waiting);
    const k = waiting ? Math.min(n, 3) : Math.min(n, 30);
    const left = await run(([k, waiting]) => { const ow = window.__ow, h = ow.homecoming?.(); let i = 0; for (; i < k; i++) { ow.advance(1); if (!waiting && h?.waiting) { i++; break; } } return k - i; }, [k, waiting]);
    n -= k - left;
    if (waiting) await page.waitForTimeout(80);
  }
};
let failed = 0;
const check = (what, ok, more = '') => { console.log(`${ok ? 'ok  ' : 'FAIL'} ${what}${more ? '  ' + more : ''}`); if (!ok) failed++; };
const state = () => run(() => {
  const ow = window.__ow, o = ow.offering(), g = ow.giant(), p = ow._body.pos, s = o.shrineAt, h = ow.homecoming();
  return { home: h && { state: h.state, phase: h.phase, clock: +h.clock.toFixed(1), left: h.left, settled: h.settled, veil: +h.veil.toFixed(2) }, state: o.state, clock: +o.clock.toFixed(2), busy: o.busy, mode: ow.mode(), sealed: ow.ring().sealed, sealK: +ow.ring().sealK.toFixed(2), fromShrine: +Math.hypot(p.x - s.x, p.z - s.z).toFixed(1), giant: g && { awake: g.awake, mouth: g.mouth, grin: +g.grin.toFixed(2) } };
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
  check('the ring shut, the shrine came up; you got down, walked to it by yourself, and the light left your mittens', f >= 0 && s.sealed && s.sealK >= 1 && s.state === 'placed' && s.mode === 'walk' && s.fromShrine < 3.3, JSON.stringify(s));
  const p1 = await where();
  const cues = await run(() => window.__ow.offering().cues);
  console.log('cues', JSON.stringify(Object.fromEntries(Object.entries(cues).map(([k, v]) => [k, +v.toFixed(1)]))));
  // (The ground heaves, you run out through the stones, and the tower comes up under the shrine: you stand where you
  // got to from then on.)
  let n = 0, moved = 0, p2 = null, tower = null;
  for (let t = 0; t < cues.end + 1; t += every) {
    await step(Math.round(every * 60));
    s = await state();
    await shot(`o-${String(++n).padStart(2, '0')}-t${String(Math.round(s.clock < 0 ? t : s.clock)).padStart(2, '0')}`);
    const p = await where();
    if (s.clock > cues.up + 0.2 && !p2) { p2 = p; tower = await run(() => { const ow = window.__ow, t = ow.gen().ringTowers[0], o = ow.offering(); return { up: ow.beacons.isUp(t.id), lit: ow.beacons.isLit(t.id), head: t.head.y + t.head.sy - o.shrineAt.y, light: o.lightAt.y - o.shrineAt.y }; }); }
    if (s.busy && p2) moved = Math.max(moved, Math.hypot(p[0] - p2[0], p[2] - p2[2]));
  }
  void p0; void p1;
  check('the tower came up under the shrine, lit, the light on top of it', !!tower && tower.up && tower.lit && tower.light > tower.head, JSON.stringify(tower));
  check('you ran out through the stones to watch it', !!p2 && s.fromShrine > 15 && s.fromShrine < 26, `from the middle ${s.fromShrine}`);
  check('hands off from there to the end', moved < 0.3, `moved ${moved.toFixed(2)} m with W held`);
  s = await state();
  check('the giant has it: awake, its mouth shut again, smiling', s.state === 'given' && !s.busy && s.giant.awake && s.giant.mouth === 0 && s.giant.grin > 0.4, JSON.stringify(s));
  check('on foot before the tower at the end of it', s.mode === 'walk' && s.fromShrine < 26, s.mode);
  check('and it carries straight on: the homecoming has the camera', s.home?.state === 'playing', JSON.stringify(s.home));
  await keysUp();
  await shot('o-end');
}

if (kinds.includes('tower')) {
  // The tower the ring became, afterwards: it stands, lit, the shrine on its head; you can go up into it, and fly home.
  await setup();
  const t = await run(() => {
    const ow = window.__ow, b = ow.beacons, t = ow.gen().ringTowers[0], home = ow.gen().towers.home;
    ow.offering().debug('given');
    b.debugSet(home.id);
    ow.advance(30);
    b.debugEnter(t.id);
    ow.advance(240);
    return { id: t.id, up: b.isUp(t.id), lit: b.isLit(t.id), inside: b.inside?.id, onTop: b.onTop, sees: t.links.length, to: b.targets(t).map((o) => o.id), home: home.id, fromHome: b.targets(home).map((o) => o.id) };
  });
  check('the tower stands, lit, and takes you up into its head', t.up && t.lit && t.inside === t.id && t.onTop, JSON.stringify(t));
  check('you can fly home from it, and to it from home', t.to.includes(t.home) && t.fromHome.includes(t.id), JSON.stringify(t));
  await run(() => { const ow = window.__ow; ow.beacons.escape(); ow.advance(120); });
  await again();
  await run(() => { window.__ow.manual(true); window.__ow.advance(30); });
  const r = await run(() => { const ow = window.__ow, b = ow.beacons, t = ow.gen().ringTowers[0]; return { up: b.isUp(t.id), lit: b.isLit(t.id), light: ow.offering().shrineAt.y, head: t.head.y }; });
  check('a reload finds it standing and lit', r.up && r.lit, JSON.stringify(r));
}

if (kinds.includes('reload')) {
  // Held: reload before the light has left you, and you're by the shrine on the rockhopper; it carries on by itself.
  await setup();
  await step(60);
  await again();
  await run(() => { window.__ow.manual(true); window.__ow.advance(20); });
  let s = await state();
  check('reload with the light held: by the shrine (mounted, until you get down to offer it), ring shut', (s.state === 'held' || s.state === 'placed') && (s.mode === 'ride' || s.mode === 'walk') && s.sealed && s.fromShrine < 8, JSON.stringify(s));
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
  // Given, and nothing after it yet: reload, and you're by the shrine again, the giant awake and smiling; what
  // follows (the homecoming) plays from its start.
  await again();
  await run(() => { const ow = window.__ow; ow.manual(true); ow.advance(20); });
  s = await state();
  // (A page runs real frames before this script takes it over, so how far the homecoming had got when it was
  // reloaded varies: before the spirit was home it plays again from by the shrine; after, it is all done.)
  const before = s.home?.state === 'playing' && s.mode === 'ride' && s.fromShrine < 26, after = s.home?.state === 'done' && s.home.settled && !s.busy;
  check(`reload after the smile: ${after ? 'the spirit was home already, so nothing replays' : 'by the shrine, mounted, and the homecoming plays'}`, s.state === 'given' && s.sealed && (before || after), JSON.stringify(s));
  await shot('r-given');
}

if (kinds.includes('home')) {
  const walk = arg('walk', '1') !== '0';
  const giantNow = () => run(() => { const ow = window.__ow, g = ow.giant(), d = ow.gen().dungeons, b = ow._body.pos; return { sunk: +g.sunk.toFixed(2), steps: +g.steps.toFixed(1), walking: g.walking, dormant: g.dormant, awake: g.awake, grin: g.grin, solid: g.surface(g.centre.x, g.centre.z, 1e4, 1e4) > -1e9, fromRing1: Math.round(Math.hypot(g.centre.x - d[0].x, g.centre.z - d[0].z)), fromRing2: Math.round(Math.hypot(g.centre.x - d[1].x, g.centre.z - d[1].z)), fromYou: Math.round(Math.hypot(g.centre.x - b.x, g.centre.z - b.z)), prints: ow.trail.prints.list.length }; });
  const vil = () => run(() => { const v = window.__ow.village(); return v && { taken: v.taken.filter(Boolean).length, of: v.taken.length, home: !v.taken[0] && v.spirits[0].group.visible, mended: v.mended.length, lights: window.__ow.visit().crows.birds.filter((b) => b.light).length }; });
  /** Look at the giant from where you are, the orbit camera behind you. */
  const lookAtGiant = (dist = 14, pitch = 0.02) => run(([dist, pitch]) => { const ow = window.__ow, g = ow.giant(), b = ow._body.pos; ow.view(Math.atan2(b.x - g.centre.x, b.z - g.centre.z), pitch, dist); ow.advance(2); }, [dist, pitch]);
  await setup();
  await untilPlaced();
  const cues = await run(() => window.__ow.offering().cues);
  await step(Math.round((cues.end - 1.5) * 60));
  // (From where you ran to as the tower came up.)
  const p0 = await where();
  // The smile, and on. W is still held: nothing may move you until it hands you back.
  let s, n = 0, was = '', moved = 0, seen = new Set(), secs = 0;
  const v0 = sandbox ? null : await vil();
  for (let i = 0; i < 400; i++) {
    await step(Math.round(every * 60));
    secs += every;
    s = await state();
    const ph = s.home.state === 'playing' ? s.home.phase : s.home.state;
    seen.add(ph);
    await shot(`h-${String(++n).padStart(2, '0')}-${ph}-${String(Math.round(s.home.clock)).padStart(2, '0')}`);
    const p = await where();
    if (s.home.state === 'playing' || s.busy) moved = Math.max(moved, Math.hypot(p[0] - p0[0], p[2] - p0[2]));
    if (ph !== was) { console.log('phase', ph, JSON.stringify(s.home), sandbox ? '' : JSON.stringify(await vil())); was = ph; }
    if (s.home.state === 'done') break;
  }
  await keysUp();
  console.log(`the homecoming took ${secs.toFixed(0)} s from 1.5 s before the smile's end`);
  check('it ran through every part and handed you back', s.home.state === 'done' && (sandbox ? seen.has('rise') : ['leave', 'village', 'rise'].every((k) => seen.has(k))), [...seen].join(' '));
  check('hands off throughout', moved < 0.3, `moved ${moved.toFixed(2)} m with W held`);
  check('still on foot by the shrine', s.mode === 'walk', s.mode);
  let g = await giantNow();
  check('the giant is up and walking (solid, as it always is now)', g.sunk < 0.05 && g.walking && !g.dormant && g.solid, JSON.stringify(g));
  if (!sandbox) {
    const v = await vil();
    check('one spirit is home, its house not touched, and its crow has no light', v.home && v.taken === v0.taken - 1 && v.mended === 0 && v.lights === v0.lights - 1, `${JSON.stringify(v0)} -> ${JSON.stringify(v)}`);
  }
  // From the saddle, as it's handed back: is the giant in view, and which way are you facing?
  await step(70);
  await shot('h-back-0');
  await step(240);
  await shot('h-back-1');
  await lookAtGiant();
  await shot('h-walking-from-you');
  // Can you ride after it? (W: you move.)
  const a = await where();
  await run(() => window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyW' })));
  await step(120);
  await keysUp();
  const b = await where();
  check('and you can ride again', Math.hypot(b[0] - a[0], b[2] - a[2]) > 3, `${Math.hypot(b[0] - a[0], b[2] - a[2]).toFixed(1)} m in 2 s`);

  if (!sandbox) {
    // A reload while it walks: nothing is replayed. The spirit is home, and the giant is already asleep by the second ring.
    await again();
    await run(() => { window.__ow.manual(true); window.__ow.advance(40); });
    s = await state(); g = await giantNow();
    const v = await vil();
    check('reload while it walks: no replay; spirit home, house mended, giant asleep by the second ring, its prints laid', s.home.state === 'done' && s.home.settled && !s.home.veil && v.home && v.mended === 0 && g.dormant && g.sunk === 1 && g.fromRing2 < 110 && !g.awake, `${JSON.stringify(s.home)} ${JSON.stringify(v)} ${JSON.stringify(g)}`);
    // Where a reload puts you (the cabin's doorstep), and the mended house from the lane.
    await shot('h-reload-spawn');
    await run(() => { const ow = window.__ow, v = ow.village(), h = v.houses[v.home[0]], p = h.plot; ow.teleport(h.door.x + Math.sin(p.rot) * 9 + Math.cos(p.rot) * 3, h.door.z + Math.cos(p.rot) * 9 - Math.sin(p.rot) * 3); ow.view(p.rot + 0.3, 0.2, 9); ow.advance(90); });
    await shot('h-reload-house-0');
    await step(600);
    await shot('h-reload-house-1');
    await step(600);
    await shot('h-reload-house-2');
    // And the first ring without it: the shrine, no giant.
    await run(() => { const ow = window.__ow; ow.goToRing(); ow.advance(60); });
    await shot('h-reload-ring1');
  }

  // The second ring, the giant asleep by it. (After a reload it's there already; `sandbox`, it walks or is put there.)
  if (sandbox) {
    if (walk) {
      for (let i = 0; i < 60; i++) {
        await step(300);
        g = await giantNow();
        if (i % 4 === 0) { await lookAtGiant(16, 0.0); await shot(`h-walk-${String(i).padStart(2, '0')}`); }
        if (!g.walking && g.dormant && g.sunk === 1) break;
      }
      g = await giantNow(); s = await state();
      check('it walked to the second ring and lay down: dormant, sunk, solid again, its eyes shut', s.home.settled && g.dormant && g.sunk === 1 && g.solid && !g.awake && g.fromRing2 < 110, JSON.stringify(g));
      check('and left prints all the way', g.prints >= (await run(() => window.__ow.onward().length)) - 6, `${g.prints} prints`);
    }
  }
  const at2 = async (name) => {
    // From the way in to the second ring, on foot, looking at it; and at the giant from there.
    await run(() => { const ow = window.__ow, d = ow.gen().dungeons[1], g = ow.giant(); const ux = g.centre.x - d.x, uz = g.centre.z - d.z, l = Math.hypot(ux, uz); ow.teleport(d.x - (ux / l) * 30, d.z - (uz / l) * 30); ow.view(Math.atan2(-ux, -uz), 0.1, 16); ow.advance(80); });
    for (let i = 0; i < 30; i++) { await page.waitForTimeout(100); await run(() => window.__ow.advance(3)); if (await run(() => window.__ow.ready())) break; }
    await shot(`${name}-ring2`);
    await run(() => { const ow = window.__ow, d = ow.gen().dungeons[1], g = ow.giant(); const ux = g.centre.x - d.x, uz = g.centre.z - d.z; ow.teleport(d.x, d.z); ow.view(Math.atan2(-ux, -uz) + 0.5, -0.05, 9); ow.advance(40); });
    await shot(`${name}-ring2-giant`);
    const r = await run(() => { const ow = window.__ow, d = ow.gen().dungeons[1], b = ow._body; return { open: ow.ring().open, site: ow.ring().site === d, mode: ow.mode(), y: +(b.pos.y - ow.height(d.x, d.z)).toFixed(1) }; });
    // (The second ring is open once it lies there: the Veil Cave is under it, and standing in its middle takes you down.)
    check('the second ring is open: standing in its middle, it takes you', r.mode === 'carried' && !r.site, JSON.stringify(r));
  };
  await at2('h-settled');
  // Settled: a reload finds the same.
  await again();
  await run(() => { window.__ow.manual(true); window.__ow.advance(40); });
  s = await state(); g = await giantNow();
  check('reload once it has settled: the same', s.home.state === 'done' && s.home.settled && g.dormant && g.sunk === 1 && g.fromRing2 < 110, `${JSON.stringify(s.home)} ${JSON.stringify(g)}`);

  if (!sandbox) {
    // A reload from before the spirit is home (mid-flight): by the shrine again, and it plays from its start.
    await setup();
    await untilPlaced();
    await keysUp();
    await step(Math.round((cues.end + 3) * 60));
    s = await state();
    check('(mid-flight: the crow has left with its light)', s.home.state === 'playing', JSON.stringify(s.home));
    await again();
    await run(() => { window.__ow.manual(true); window.__ow.advance(20); });
    s = await state(); g = await giantNow();
    const v = await vil();
    check('reload before the spirit is home: by the shrine, mounted, and it plays again from its start; nobody home yet', s.home.state === 'playing' && ['leave', 'cutTo', 'village'].includes(s.home.phase) && s.mode === 'ride' && s.fromShrine < 26 && g.dormant && g.fromRing1 < 150 && !v.home, `${JSON.stringify(s.home)} ${JSON.stringify(v)}`);
    await shot('h-reload-before');
    // On to the village, and a reload there, once the spirit stands on its doorstep.
    for (let i = 0; i < 200; i++) { await step(20); if ((await vil()).home) break; }
    await step(60);
    await shot('h-reload-village-before');
    await again();
    await run(() => { window.__ow.manual(true); window.__ow.advance(40); });
    s = await state(); g = await giantNow();
    const v2 = await vil();
    check('reload once the spirit is home: no replay, no veil; spirit home, house mended, giant by the second ring', s.home.state === 'done' && !s.home.veil && v2.home && v2.mended === 0 && g.dormant && g.fromRing2 < 110, `${JSON.stringify(s.home)} ${JSON.stringify(v2)} ${JSON.stringify(g)}`);
  }
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
if (kinds.includes('claws')) {
  await setup();
  await untilPlaced();
  await keysUp();
  const cues = await run(() => window.__ow.offering().cues);
  const to = async (t) => { const c = (await state()).clock; if (c >= 0 && c < t) await step(Math.round((t - c) * 60)); };
  // Beside the crow, a little ahead and below: side on to its legs.
  await run(() => {
    const o = window.__ow.offering(), b = o.crow.birds[0];
    o._cine ??= o.cinematic;
    o.cinematic = () => { const d = b.dir, l = Math.hypot(d.x, d.z) || 1, at = b.pos.clone(); at.y -= 0.8; const pos = at.clone(); pos.x += (-d.z / l) * 9 + (d.x / l) * 2; pos.z += (d.x / l) * 9 + (d.z / l) * 2; pos.y -= 0.3; return { pos, at, fov: 30 }; };
  });
  await to(cues.has - 0.9);
  for (let i = 0; i < 26; i++) { await step(3); await shot(`c-${String(i).padStart(2, '0')}-t${((await state()).clock - cues.has).toFixed(2)}`); }
  await to(cues.has + 2.5); await shot('c-hang');
  await to(cues.fly + 1.2); await shot('c-fly-1');
  await to(cues.fly + 2.6); await shot('c-fly-2');
  await run(() => { const o = window.__ow.offering(); o.cinematic = o._cine; });
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
