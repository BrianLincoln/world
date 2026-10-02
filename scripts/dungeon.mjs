// The first dungeon: node scripts/dungeon.mjs <dir> [seed=hilda] [inside,take,leave,quest,perf]
//   inside: stills from round the cave, as you'd find it (dark, the lanterns near you awake)
//   take:   the ring taking you down, frame-stepped, and being let down inside
//   leave:  back on the mark: lifted, and put out on the field
//   quest:  the whole of it played with the keys, from the well: the wrong way (and failing
//           the ledge on foot, jump and parachute), the long way round, the stepping stones,
//           the rockfall, the ride off the balcony, the bound, the light; then above ground,
//           the ring shutting into a shrine and the cutscene of the crow and the giant taking
//           the light (see also scripts/offering.mjs, which does that part in the story and
//           reloads at each step). Prints what happened and how long it took;
//           exits 1 if a step failed.
//   perf:   frame cost standing in four places with every lantern awake (add `uncapped`)
// Uses the build in dist/ (run `npx vite build` first). See also dungeon-plan.mjs, dungeon-cam.mjs.
import { chromium } from 'playwright';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const args = process.argv.slice(2);
const dir = args[0] ?? 'shots/dungeon';
const seed = args.find((a) => a.startsWith('seed='))?.slice(5) ?? 'hilda';
const kinds = (args.find((a) => /^(inside|take|leave|quest|perf)/.test(a)) ?? 'inside,take,leave').split(',');
const uncapped = args.includes('uncapped');
fs.mkdirSync(dir, { recursive: true });
const server = http.createServer((req, res) => {
  const p = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  const f = path.join(root, 'dist', p === '/' ? 'index.html' : p);
  if (!fs.existsSync(f)) { res.writeHead(404); res.end(); return; }
  res.writeHead(200, { 'content-type': f.endsWith('.js') ? 'text/javascript' : f.endsWith('.html') ? 'text/html' : f.endsWith('.css') ? 'text/css' : 'application/octet-stream' });
  fs.createReadStream(f).pipe(res);
});
await new Promise((r) => server.listen(0, r));
const browser = await chromium.launch({ args: ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist', ...(uncapped ? ['--disable-gpu-vsync', '--disable-frame-rate-limit'] : [])] });
const page = await browser.newPage({ viewport: { width: 1600, height: 900 } });
page.on('console', (m) => { if (!m.text().includes('useProgram') && !m.text().includes('toNonIndexed')) console.log('[page]', m.text().slice(0, 400)); });
page.on('pageerror', (e) => console.log('[pageerror]', e.message));
const load = async (q) => {
  await page.goto(`http://localhost:${server.address().port}/?seed=${seed}&story=0&t=10&ui=0&capture=1&mobs=0&drak=0&${q}`);
  for (let i = 0; i < 160; i++) { if (await page.evaluate(() => window.__ow?.ready())) break; await page.waitForTimeout(250); }
  await page.waitForTimeout(500);
  await page.evaluate(bot);
};
const shot = async (name) => { await page.screenshot({ path: path.join(dir, name + '.png') }); console.log(name); };
const step = (n, dt = 1 / 60) => page.evaluate(([n, dt]) => window.__ow.advance(n, dt), [n, dt]);
let failed = 0;
const check = (what, ok, more = '') => { console.log(`${ok ? 'ok  ' : 'FAIL'} ${what}${more ? '  ' + more : ''}`); if (!ok) failed++; };

/** In the page: a player that works the keys. Places are the plan's (`layout.at` names, or [x, z]). */
function bot() {
  const ow = window.__ow;
  const key = (code, down) => window.dispatchEvent(new KeyboardEvent(down ? 'keydown' : 'keyup', { code }));
  const B = (window.__bot = {
    frames: 0,
    get d() { return ow.dungeon(); },
    get L() { return ow.dungeon().layout; },
    key,
    up() { for (const k of ['KeyW', 'ShiftLeft', 'Space', 'KeyE']) key(k, false); },
    tick(n = 1) { ow.advance(n); B.frames += n; },
    P(p) { return typeof p === 'string' ? B.L.at[p] : p; },
    /** Where you are, in the plan: [x, z, height]. */
    here() {
      const d = B.d, b = ow._body.pos, dx = b.x - d.origin.x, dz = b.z - d.origin.z, c = Math.cos(d.facing), s = Math.sin(d.facing);
      return [dx * c + dz * s, -dx * s + dz * c, b.y - d.origin.y];
    },
    far(p) { const h = B.here(), q = B.P(p); return Math.hypot(h[0] - q[0], h[1] - q[1]); },
    /** Push the stick toward a place (and swing the camera in behind, as a player does). */
    aim(p, off = 0) {
      const d = B.d, q = B.P(p), w = d.world(q[0], 0, q[1]), b = ow._body.pos;
      const yaw = Math.atan2(-(w.x - b.x), -(w.z - b.z)) + off;
      ow.lockInput(yaw);
      const o = ow._orbit;
      o.yaw += Math.atan2(Math.sin(yaw - o.yaw), Math.cos(yaw - o.yaw)) * 0.06;
    },
    /** Stand there (dev), looking toward `to`. */
    put(p, to, pitch = 0.14, dist = 9, off = 0) {
      const d = B.d, q = B.P(p), t = B.P(to ?? p);
      d.world(q[0], B.L.floor(q[0], q[1]), q[1], ow._body.pos);
      ow._body.vel.set(0, 0, 0);
      const a = d.world(q[0], 0, q[1]), b = d.world(t[0], 0, t[1]);
      const yaw = Math.atan2(a.x - b.x, a.z - b.z);
      ow._body.heading = yaw + Math.PI;
      ow.view(yaw + off, pitch, dist);
    },
    /** Walk (or ride) to a place by the keys. Sidesteps if it stops getting nearer. */
    go(p, o = {}) {
      const stop = o.stop ?? 1.5, max = (o.max ?? 60) * 60;
      key('KeyW', true); key('ShiftLeft', !!o.sprint);
      let best = B.far(p), since = 0, jink = 0, f = 0;
      for (; f < max && B.far(p) > stop; f++) {
        B.aim(p, jink > 0 ? 1.2 * (jink > 40 ? 1 : -1) : 0);
        B.tick();
        if (jink > 0) jink--;
        const now = B.far(p);
        if (now < best - 0.3) { best = now; since = 0; } else if (++since > 50 && jink === 0) { jink = 40 + (f % 2) * 40; since = 0; best = now + 2; }
      }
      B.up();
      B.tick(12);
      return { ok: B.far(p) <= stop + 0.5, secs: +(f / 60).toFixed(1), at: B.here().map((v) => +v.toFixed(1)) };
    },
    /**
     * One hop of the stepping stones: back to the near edge for a run-up, run, jump at the edge;
     * `glide`: open the parachute at the top of the jump and let go of it over the far stone.
     * `from`/`to`: an index into `layout.tops`, or -1 for the lip you start from / the far lip.
     */
    hop(from, to, glide, sprint) {
      const L = B.L, T = L.tops, a = from < 0 ? null : T[from], b = to < 0 ? null : T[to];
      const tgt = b ? [b.x, b.z] : L.at.farLip, src = a ? [a.x, a.z] : L.at.lip;
      const dl = Math.hypot(tgt[0] - src[0], tgt[1] - src[1]), ux = (tgt[0] - src[0]) / dl, uz = (tgt[1] - src[1]) / dl;
      if (a) B.go([a.x - ux * (a.r - 0.8), a.z - uz * (a.r - 0.8)], { stop: 0.35, max: 5 });
      else B.go('lip', { stop: 0.6, max: 8 });
      key('KeyW', true); key('ShiftLeft', !!sprint);
      let f = 0, air = false, open = false, done = false;
      for (; f < 600; f++) {
        B.aim(tgt);
        const h = B.here(), body = ow._body;
        if (!air) {
          const edge = a ? a.r - Math.hypot(h[0] - a.x, h[1] - a.z) : L.pitSd(h[0], h[1]);
          if (edge < 0.3) { key('Space', true); air = true; }
        } else if (glide && !open && !done && body.vel.y < 0.3) {
          key('Space', false); B.tick(); key('Space', true); B.tick(); key('Space', false);
          open = true;
        } else if (open && (b ? Math.hypot(h[0] - b.x, h[1] - b.z) < 0.4 + Math.hypot(body.vel.x, body.vel.z) * Math.sqrt(Math.max(0, h[2] - (L.floor(b.x, b.z) + b.top)) / 20) : L.pitSd(h[0], h[1]) > 1.2)) {
          // (Let go where the fall from here, at this speed, comes down on its middle.)
          key('Space', true); B.tick(); key('Space', false);
          key('KeyW', false);
          open = false; done = true;
        }
        B.tick();
        if (air && f > 3 && body.grounded && ow.mode() === 'walk') break;
      }
      B.up();
      B.tick(15);
      const h = B.here(), on = b ? Math.hypot(h[0] - b.x, h[1] - b.z) < b.r + 0.2 && Math.abs(h[2] - L.floor(b.x, b.z) - b.top) < 0.4 : L.pitSd(h[0], h[1]) > 0;
      return { ok: on, secs: +(f / 60).toFixed(1), at: h.map((v) => +v.toFixed(1)) };
    },
  });
}

if (kinds.includes('inside')) {
  await load('dungeon=1&fresh=1');
  await page.evaluate(() => window.__ow.manual(true));
  // [name, stand at, look toward, pitch, dist, yaw off straight behind, wake every lantern first]
  // (A place is one of `layout.at`'s names, or [from, to, t]: that far from one toward another.)
  const views = [
    ['well', 'well', 'fork', 0.1, 12], ['well-door', ['well', 'fork', 0.17], 'fork', 0.12, 9],
    ['fork', ['well', 'fork', 0.85], 'ledge', 0.1, 11], ['fork-balcony', ['underBalcony', 'fork', 0.6], 'balcony', 0.02, 10], ['fork-long', 'fork', 'cavern', 0.12, 10],
    ['wrong-way', ['fork', 'ledge', 0.55], 'sanctum', 0.08, 9], ['ledge', 'ledge', 'sanctum', 0.06, 9],
    ['cavern-mouth', ['fork', 'cavern', 0.55], 'cavern', 0.12, 10], ['cavern', ['cavern', 'fork', 0.3], 'kink', 0.14, 13], ['pool', ['cavern', 'kink', 0.3], 'pool', 0.2, 13],
    ['grotto', ['cavern', 'grotto', 0.86], 'grotto', 0.16, 8], ['kink', 'kink', 'hand', 0.12, 9],
    ['hand', ['kink', 'palm', 0.5], 'palm', 0.08, 14], ['hand-close', ['kink', 'palm', 0.78], 'palm', 0.04, 10, 0.5], ['hand-side', ['tunnelTop', 'palm', 0.45], 'palm', 0.08, 12],
    ['lip', 'lip', 'drop', 0.2, 11], ['lip-side', 'lip', 'drop', 0.3, 14, 0.9], ['pit', 'drop', 'tunnel', 0.14, 12], ['pit-back', ['drop', 'lip', 0.5], 'lip', 0.1, 12], ['tunnel', 'tunnel', 'tunnelTop', 0.12, 8],
    ['far-lip', 'farLip', 'gallery', 0.12, 9], ['gallery', 'gallery', 'nook', 0.14, 13], ['nook', ['gallery', 'nook', 0.86], 'nook', 0.16, 8],
    ['rockfall', 'rockfall', 'den', 0.16, 9, 0.5], ['den', ['rockfall', 'den', 0.75], 'den', 0.16, 9], ['balcony', 'balcony', 'fork', 0.3, 9],
    ['sanctum', ['ledgeTop', 'sanctum', 0.75], 'sanctum', 0.14, 9],
    ['lit-cavern', ['cavern', 'fork', 0.3], 'kink', 0.14, 13, 0, true], ['lit-hand', ['kink', 'palm', 0.5], 'palm', 0.08, 14, 0, true], ['lit-lip', 'lip', 'drop', 0.3, 14, 0.9, true], ['lit-fork', ['well', 'fork', 0.85], 'ledge', 0.1, 11, 0, true],
  ];
  for (const [name, at, to, pitch, dist, off = 0, lit = false] of views) {
    await page.evaluate(([at, to, pitch, dist, off, lit, s]) => {
      const b = window.__bot, m = (p) => { if (typeof p === 'string') return p; const a = b.L.at[p[0]], c = b.L.at[p[1]]; return [a[0] + (c[0] - a[0]) * p[2], a[1] + (c[1] - a[1]) * p[2]]; };
      b.d.debugLight(lit);
      b.put(m(at), m(to), pitch, dist, off * b.L.side);
    }, [at, to, pitch, dist, off, lit]);
    await step(70);
    await shot(`in-${name}`);
  }
}

if (kinds.includes('take') || kinds.includes('leave')) {
  await load('fresh=1');
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
  const t0 = Date.now();
  for (let f = 0; f < 400; f++) {
    await step(1);
    if (await page.evaluate(() => window.__ow.ring().busy)) break;
  }
  if (kinds.includes('take')) {
    // The reach, the hold, the pull, the cut, and being let down.
    for (let f = 0; f < 34; f++) { await step(6); await shot(`take-${String(i++).padStart(2, '0')}`); }
  } else await step(240);
  await page.keyboard.up('KeyW');
  console.log(JSON.stringify(await page.evaluate(() => ({ inside: window.__ow.dungeon()?.inside, busy: window.__ow.dungeon()?.busy, buildMs: window.__ow.dungeon()?.buildMs, pos: window.__ow.pos() }))), `(${Date.now() - t0} ms wall for the take)`);
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
    const end = await page.evaluate(() => ({ inside: window.__ow.dungeon()?.inside, ring: window.__ow.ring().busy, pos: window.__ow.pos(), g: window.__ow.gen().dungeon.y }));
    console.log(JSON.stringify(end));
    check('lifted back out on to the field', end.inside === false);
  }
}

if (kinds.includes('quest')) {
  await load('dungeon=1&fresh=1');
  await page.evaluate(() => window.__ow.manual(true));
  const run = (fn, arg) => page.evaluate(fn, arg);
  const state = () => run(() => { const b = window.__bot, d = b.d; return { at: b.here().map((v) => +v.toFixed(1)), mode: window.__ow.mode(), freed: d.freed, taken: d.taken, lit: d.lit.filter(Boolean).length, secs: Math.round(b.frames / 60) }; });
  const go = async (p, o = {}) => { const r = await run(([p, o]) => window.__bot.go(p, o), [p, o]); check(`to ${p}`, r.ok, JSON.stringify(r)); return r; };
  const cam = (pitch, dist) => run(([pitch, dist]) => { const o = window.__ow._orbit; o.pitch = pitch; o.targetDistance = dist; }, [pitch, dist]);
  await cam(0.14, 9);
  await step(30); await shot('q-00-well');

  // The wrong way first, as the cave invites: up to the ledge, and at it with everything you have on foot.
  await go('fork');
  await shot('q-01-fork');
  await go('ledge', { sprint: true });
  await shot('q-02-ledge');
  const lipY = await run(() => { const L = window.__bot.L; return L.floor(L.at.ledgeTop[0], L.at.ledgeTop[1]); });
  const tried = await run(() => {
    const b = window.__bot, ow = window.__ow;
    let top = -1e9;
    for (const how of ['run', 'jump', 'glide']) {
      b.put('ledge', 'ledgeTop');
      b.tick(10);
      b.key('KeyW', true); b.key('ShiftLeft', true);
      for (let f = 0; f < 150; f++) {
        b.aim('sanctum');
        if (how !== 'run' && f === 38) b.key('Space', true);
        if (how === 'glide' && f === 58) { b.key('Space', false); b.tick(); b.key('Space', true); }
        b.tick();
        top = Math.max(top, b.here()[2]);
      }
      b.up(); b.tick(40);
    }
    return { highest: +top.toFixed(2), ends: b.here().map((v) => +v.toFixed(1)), mode: ow.mode() };
  });
  check('the ledge stops you on foot (run, jump, parachute)', tried.ends[2] < lipY - 3, JSON.stringify({ ...tried, lipY: +lipY.toFixed(2) }));
  await shot('q-03-ledge-failed');

  // Back, and the long way round.
  await go('fork', { sprint: true });
  await go('cavern', { sprint: true });
  await shot('q-04-cavern');
  await go('kink', { sprint: true });
  await go('hand', { sprint: true, max: 40, stop: 8 });
  await shot('q-05-hand');
  await go('overMouth', { sprint: true });
  await go('lip', { stop: 0.8 });
  await cam(0.34, 13);
  await step(20); await shot('q-06-lip');

  // The stepping stones. First a miss, on purpose: off the lip, into the pit, and back up the tunnel.
  const fell = await run(() => { const b = window.__bot; b.key('KeyW', true); for (let f = 0; f < 90; f++) { b.aim('drop'); b.tick(); } b.up(); b.tick(30); return b.here().map((v) => +v.toFixed(1)); });
  const lipFloor = await run(() => { const L = window.__bot.L; return L.floor(L.at.lip[0], L.at.lip[1]); });
  check('walking off the lip lands you in the pit', fell[2] < lipFloor - 4, JSON.stringify(fell));
  await shot('q-07-in-the-pit');
  await go('tunnel', { sprint: true });
  await shot('q-08-tunnel');
  await go('tunnelTop', { sprint: true });
  await go('overMouth', { sprint: true });
  await go('lip', { stop: 0.8 });
  const n = await run(() => window.__bot.L.tops.length);
  for (let i = 0; i <= n; i++) {
    const r = await run(([i, n]) => { const b = window.__bot, T = b.L.tops; const P = b.L.pit, gap = i === 0 ? P.r - Math.hypot(T[0].x - P.x, T[0].z - P.z) - T[0].r : i === n ? P.r - Math.hypot(T[n - 1].x - P.x, T[n - 1].z - P.z) - T[n - 1].r : Math.hypot(T[i].x - T[i - 1].x, T[i].z - T[i - 1].z) - T[i].r - T[i - 1].r; return { gap: +gap.toFixed(1), ...b.hop(i - 1, i === n ? -1 : i, gap > 6, gap > 3.4) }; }, [i, n]);
    check(`hop ${i}${r.gap > 6 ? ' (jump and parachute)' : ''}`, r.ok, JSON.stringify(r));
    if (i === 2 || i === 3) await shot(`q-09-stone-${i}`);
    if (!r.ok) break;
  }
  await cam(0.14, 9);
  await shot('q-10-across');

  // The gallery, the rockfall, the rockhopper.
  await go('gallery', { sprint: true });
  await go('rockfall', { stop: 0.8 });
  await step(20); await shot('q-11-rockfall');
  check('the rockfall is shut', !(await state()).freed);
  await run(() => window.__bot.key('KeyE', true));
  for (let f = 0; f < 240 && !(await state()).freed; f++) { await run(() => window.__bot.tick(6)); if (f % 12 === 5) await shot(`q-12-smash-${(f / 12) | 0}`); }
  await run(() => window.__bot.up());
  for (let k = 0; k < 4; k++) { await run(() => window.__bot.tick(50)); await shot(`q-13-glad-${k}`); }
  check('smashed, and the rockhopper is free', (await state()).freed);
  await shot('q-13-freed');
  // On to it (E, standing by it), through the den, and off the balcony.
  const up = await run(() => {
    const b = window.__bot, ow = window.__ow, g = b.d.goat;
    const p = b.d.layout, gx = g.pos.x - b.d.origin.x, gz = g.pos.z - b.d.origin.z, c = Math.cos(b.d.facing), s = Math.sin(b.d.facing);
    const r = b.go([gx * c + gz * s, -gx * s + gz * c], { stop: 1.6, max: 20 });
    b.key('KeyE', true); b.tick(2); b.key('KeyE', false); b.tick(20);
    return { ...r, mode: ow.mode(), p: !!p };
  });
  check('E by the rockhopper mounts it', up.mode === 'ride', JSON.stringify(up));
  await shot('q-14-riding');
  await go('den', { max: 30 });
  await go('balcony', { max: 30 });
  await shot('q-15-balcony');
  await go('underBalcony', { max: 12, stop: 3 });
  await shot('q-16-dropped');
  await go('fork', { stop: 4 });
  // At the ledge without the bound, then with it.
  await go('ledge', { stop: 3, sprint: true });
  const ran = await run(() => { const b = window.__bot; b.key('KeyW', true); b.key('ShiftLeft', true); for (let f = 0; f < 150; f++) { b.aim('sanctum'); b.tick(); } b.up(); b.tick(20); return b.here().map((v) => +v.toFixed(1)); });
  check('a ridden run at the ledge stays at the bottom', ran[2] < lipY - 3, JSON.stringify(ran));
  await shot('q-17-stopped');
  // Back off for a run-up, and Space seven metres short of the lip.
  await run(() => { const b = window.__bot, L = b.L, k = L.shelves[0]; b.put([k.x - k.dx * 22, k.z - k.dz * 22], 'ledgeTop'); b.tick(5); window.__bound = -1; });
  for (let f = 0; f < 16; f++) {
    await run(() => {
      const b = window.__bot, L = b.L, k = L.shelves[0];
      b.key('KeyW', true); b.key('ShiftLeft', true);
      for (let i = 0; i < 9; i++) {
        b.aim('sanctum');
        const h = b.here();
        if (window.__bound < 0 && L.past(k, h[0], h[1]) > -7) { b.key('Space', true); window.__bound = b.frames; }
        if (window.__bound >= 0 && b.frames > window.__bound + 4) b.key('Space', false);
        b.tick();
      }
    });
    if (f > 6) await shot(`q-18-bound-${f - 7}`);
  }
  await run(() => { const b = window.__bot; b.up(); b.tick(30); });
  const upTop = (await state()).at;
  check('the bound lands on top', upTop[2] > lipY - 1, JSON.stringify(upTop));
  await run(() => { const b = window.__bot, L = b.L; b.go([L.ember.x, L.ember.z], { stop: 1.2, max: 3 }); });
  const end = await state();
  check('the light is taken', end.taken, JSON.stringify(end));
  // The gladness (three hops round, a heart, the lanterns up), the veil, and out on the surface on the rockhopper.
  for (let f = 0; f < 9; f++) { await run(() => window.__bot.tick(36)); await shot(`q-19-glad-${f}`); }
  await run(() => window.__bot.tick(150));
  await shot('q-20-surface');
  const out = await run(() => { const ow = window.__ow, g = ow.gen().dungeon, p = ow._body.pos; return { inside: ow.dungeon().inside, mode: ow.mode(), ring: ow.ring().busy, fromRing: +Math.hypot(p.x - g.x, p.z - g.z).toFixed(1), above: +(p.y - ow.height(p.x, p.z)).toFixed(1) }; });
  check('put out on the surface, on the rockhopper', out.inside === false && out.mode === 'ride' && !out.ring && out.fromRing < 8 && Math.abs(out.above) < 1.5, JSON.stringify(out));
  // The ring shuts behind you: the field closes, the dark spirit goes down with it, a shrine comes up in the middle.
  for (let f = 0; f < 4; f++) { await run(() => window.__bot.tick(55)); await shot(`q-21-shut-${f}`); }
  const offer = () => run(() => { const ow = window.__ow, o = ow.offering(), g = ow.giant(), p = ow._body.pos, c = o.shrineAt; return { state: o.state, busy: o.busy, clock: +o.clock.toFixed(1), mode: ow.mode(), sealed: ow.ring().sealed, sealK: ow.ring().sealK, off: +Math.hypot(p.x - c.x, p.z - c.z).toFixed(1), mouth: g?.mouth, grin: g ? +g.grin.toFixed(2) : -1, awake: g?.awake }; });
  let o = await offer();
  check('the ring has shut into a shrine', o.sealed && o.sealK >= 1 && o.mode === 'ride' && (o.state === 'held' || o.state === 'placed'), JSON.stringify(o));
  // It is a cutscene from here: with W held, the light leaves your shoulder for the bowl by itself.
  const rode = await run(() => {
    const ow = window.__ow, b = window.__bot, of = ow.offering();
    b.key('KeyW', true);
    let f = 0;
    for (; f < 600 && of.state === 'held'; f++) b.tick();
    return { frames: f, state: of.state, mode: ow.mode() };
  });
  check('the light goes to the bowl by itself', rode.state === 'placed' && rode.mode === 'ride', JSON.stringify(rode));
  // The crow, the giant's open mouth, the smile: hands off (W is held all through) until it's done.
  const cues = await run(() => window.__ow.offering().cues);
  const from = await run(() => window.__ow._body.pos.toArray());
  await run(() => window.__bot.key('KeyW', true));
  let seen = { mouth: false }, k = 0, moved = 0;
  for (let t = 0; t < cues.end + 2; t += 2) {
    await run(() => window.__bot.tick(120));
    o = await offer();
    if (o.busy) { const p = await run(() => window.__ow._body.pos.toArray()); moved = Math.max(moved, Math.hypot(p[0] - from[0], p[2] - from[2])); }
    seen = await run((s) => { const g = window.__ow.giant(); return { mouth: s.mouth || g.mouth > 0 }; }, seen);
    await shot(`q-22-offer-${String(k++).padStart(2, '0')}`);
  }
  await run(() => window.__bot.up());
  check('hands off while the crow and the giant have it', moved < 0.3, `moved ${moved.toFixed(2)} m with W held`);
  check('the giant opened its mouth', seen.mouth, JSON.stringify(seen));
  check('the giant has the light: awake, mouth shut, smiling; you are still on the rockhopper', o.state === 'given' && !o.busy && o.mouth === 0 && o.grin > 0.4 && o.awake && o.mode === 'ride', JSON.stringify(o));
  await run(() => window.__bot.tick(90));
  await shot('q-23-after');
  // The dungeon is shut: walking about on what was the field does nothing.
  const shut = await run(() => { const ow = window.__ow, b = window.__bot, g = ow.gen().dungeon; b.key('KeyE', true); b.tick(2); b.key('KeyE', false); b.tick(40); const p = ow._body.pos; ow.lockInput(Math.atan2(p.x - g.x, p.z - g.z) + 0.6); b.key('KeyW', true); b.tick(160); ow.lockInput(Math.atan2(p.x - g.x, p.z - g.z) - 2.4); b.tick(160); b.up(); b.tick(60); return { mode: ow.mode(), inside: ow.dungeon().inside, ring: ow.ring().busy }; });
  check('the ring does not take you again', shut.mode === 'walk' && !shut.inside && !shut.ring, JSON.stringify(shut));
  console.log(`played in ${end.secs} s of game time (a beeline that knows the way, sprinting; the failed tries at the ledge and one fall into the pit included)`);
}

if (kinds.includes('perf')) {
  await load('dungeon=1&fresh=1');
  const out = {};
  for (const [name, to] of [['well', 'fork'], ['fork', 'ledge'], ['cavern', 'kink'], ['hand', 'palm'], ['lip', 'drop'], ['gallery', 'nook']]) {
    for (const lit of [false, true]) {
      await page.evaluate(([name, to, lit]) => { const b = window.__bot; b.d.debugLight(lit); b.put(name, to, 0.16, 12); }, [name, to, lit]);
      await page.waitForTimeout(700);
      out[`${name}${lit ? ' (all lit)' : ''}`] = await page.evaluate(() => new Promise((res) => {
        const ts = [];
        let last = performance.now();
        const f = () => { const now = performance.now(); ts.push(now - last); last = now; if (ts.length < 240) requestAnimationFrame(f); else { ts.sort((a, b) => a - b); const s = window.__ow.stats(); res({ ms: +(ts.reduce((a, b) => a + b, 0) / ts.length).toFixed(2), p99: +ts[Math.floor(ts.length * 0.99)].toFixed(2), calls: s.calls, tris: s.tris }); } };
        requestAnimationFrame(f);
      }));
    }
  }
  console.log(JSON.stringify({ buildMs: await page.evaluate(() => window.__ow.dungeon().buildMs), uncapped, frames: out }, null, 1));
}
await browser.close(); server.close();
process.exit(failed ? 1 : 0);
