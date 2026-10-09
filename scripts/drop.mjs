// The fourth dungeon, the Drop: node scripts/drop.mjs <dir> [seed=hilda] [inside,quest]
//   inside: stills from round it: the well, the lip and the look across to the light, down at the tops
//           (the first lit, then all of them), from the bottom up, the wurm, the far lip, the loft.
//   quest:  the whole of it played with the keys, from the well: the way in and the parachute thought at
//           the lip; a miss on purpose (walking off with nothing open: the wind brings you back, `miss-*`);
//           then every top landed on in turn on the parachute, the pit's floor, the wurm; on to her, round,
//           out along the ledge, up the far face (`climb-*`), over the lip and on to the light; the cut, and out above ground.
//           Prints ok/FAIL per step and the game time it took; exits 1 if a step failed.
//   offer:  the checkpoint after the light (`cp=offer4`): the offering, the wurm in stone.
//   story:  from the dev checkpoint (`?fresh=1&cp=ring4`): the fourth ring takes you down, and with the light lifts you out and shuts.
//   climb:  the wurm on the far face, from several sides.
//   home4:  what follows the fourth smile (the fourth `Homecoming`): the crow leaving with a light, the
//           village, the giant getting up and walking to the fifth ring (bare stones), and a reload.
//           `home4 sandbox`: outside the story.
// Uses the build in dist/, or in $DIST (run `npx vite build --outDir <folder>` first).
import { chromium } from 'playwright';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const args = process.argv.slice(2);
const dir = args[0] ?? 'shots/drop';
const seed = args.find((a) => a.startsWith('seed='))?.slice(5) ?? 'hilda';
const kinds = (args.find((a) => /^(inside|quest|climb|story|offer|home4)/.test(a)) ?? 'inside').split(',');
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
const base = () => `http://localhost:${server.address().port}/?seed=${seed}&ui=0&capture=1&mobs=0&drak=0`;
const ready = async () => {
  for (let i = 0; i < 240; i++) { if (await page.evaluate(() => window.__ow?.ready())) break; await page.waitForTimeout(250); }
  await page.waitForTimeout(500);
  // (Stepped by hand from here on: without this every `advance` leaves another frame loop running.)
  await page.evaluate(() => window.__ow.manual(true));
  await page.evaluate(bot);
};
const load = async (q) => { await page.goto(`${base()}&story=0&t=10&${q}`); await ready(); };
const shot = async (name) => {
  for (let i = 0; i < 3; i++) {
    try { await page.screenshot({ path: path.join(dir, name + '.png'), timeout: 12000 }); console.log(name); return; }
    catch { await page.evaluate(() => window.__ow.advance(1)); console.log(`(screenshot ${name} timed out, try ${i + 1})`); }
  }
};
const run = (fn, arg) => page.evaluate(fn, arg);
let failed = 0;
const check = (what, ok, more = '') => { console.log(`${ok ? 'ok  ' : 'FAIL'} ${what}${more ? '  ' + more : ''}`); if (!ok) failed++; };

/** In the page: a player that works the keys. Places are the plan's (`layout.at` names, or [x, z]). */
function bot() {
  const ow = window.__ow;
  const key = (code, down) => window.dispatchEvent(new KeyboardEvent(down ? 'keydown' : 'keyup', { code }));
  const B = (window.__bot = {
    frames: 0,
    get d() { return ow.chasm(); },
    get L() { return ow.chasm().layout; },
    key,
    up() { for (const k of ['KeyW', 'KeyA', 'KeyD', 'ShiftLeft', 'Space', 'KeyE']) key(k, false); },
    tick(n = 1) { ow.advance(n); B.frames += n; },
    P(p) { return typeof p === 'string' ? B.L.at[p] : p; },
    /** A point of the world, in the plan: [x, z, height]. */
    plan(v) { const d = B.d, dx = v.x - d.origin.x, dz = v.z - d.origin.z, c = Math.cos(d.facing), s = Math.sin(d.facing); return [dx * c + dz * s, -dx * s + dz * c, v.y - d.origin.y]; },
    /** A direction of the world, in the plan. */
    dir(x, z) { const d = B.d, c = Math.cos(d.facing), s = Math.sin(d.facing); return [x * c + z * s, -x * s + z * c]; },
    here() { return B.plan(ow._body.pos); },
    her() { return B.plan(B.d.she.pos); },
    far(p) { const h = B.here(), q = B.P(p); return Math.hypot(h[0] - q[0], h[1] - q[1]); },
    /** Push the stick along a direction of the plan (the camera left where it is). */
    steer(ex, ez) { const d = B.d, c = Math.cos(d.facing), s = Math.sin(d.facing); ow.lockInput(Math.atan2(-(ex * c - ez * s), -(ex * s + ez * c))); },
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
      d.goTo(q);
      const a = d.world(q[0], 0, q[1]), b = d.world(t[0], 0, t[1]);
      const yaw = Math.atan2(a.x - b.x, a.z - b.z);
      ow._body.heading = yaw + Math.PI;
      ow.view(yaw + off, pitch, dist);
    },
    /** Walk to a place by the keys. */
    go(p, o = {}) {
      const stop = o.stop ?? 1.5, max = (o.max ?? 60) * 60;
      key('KeyW', true); key('ShiftLeft', !!o.sprint);
      let best = B.far(p), since = 0, jink = 0, f = 0;
      for (; f < max && B.far(p) > stop && !(o.until && o.until()); f++) {
        B.aim(p, jink > 0 ? 1.2 * (jink > 40 ? 1 : -1) : 0);
        B.tick();
        if (jink > 0) jink--;
        const now = B.far(p);
        if (now < best - 0.3) { best = now; since = 0; } else if (++since > 50 && jink === 0) { jink = 40 + (f % 2) * 40; since = 0; best = now + 2; }
      }
      B.up();
      B.tick(12);
      return { ok: B.far(p) <= stop + 0.5 || !!(o.until && o.until()), secs: +(f / 60).toFixed(1), at: B.here().map((v) => +v.toFixed(1)) };
    },
    air: 0,
    /**
     * Get to top `i` (or, past the last, the pit's floor) from where you stand, by the keys, for up to
     * `frames` frames: walk off toward it, open the parachute, and steer on to it. `chute: false`: never open it.
     * Returns { done, ok }: landed where it meant to, or the wind has it.
     */
    hop(i, frames, o = {}) {
      const d = B.d, L = B.L, top = L.tops[i], T = top.ledge ? B.P('ledge') : [top.x, top.z], b = ow._body;
      for (let f = 0; f < frames; f++) {
        if (d.caught) { B.up(); return { done: true, ok: false, caught: true }; }
        const h = B.here(), dx = T[0] - h[0], dz = T[1] - h[1], dist = Math.hypot(dx, dz) || 1, mode = ow.mode();
        if (b.grounded && mode === 'walk') {
          B.air = 0;
          if (d.target > i) { B.up(); B.tick(10); return { done: true, ok: true }; }
          B.aim(T); key('KeyW', true);
        } else if (mode === 'walk') {
          // Falling: a moment clear of the edge, then one press.
          B.air++;
          if (o.chute !== false && B.air === 20) key('Space', true);
          if (B.air === 23) key('Space', false);
        } else if (mode === 'glide') {
          // Under the canopy: the speed wanted is toward it, slower as it nears; push the stick along what's missing.
          const v = B.dir(b.vel.x, b.vel.z), want = Math.min(9, dist * 0.9), ex = (dx / dist) * want - v[0], ez = (dz / dist) * want - v[1], el = Math.hypot(ex, ez);
          if (el > 0.6) { B.steer(ex / el, ez / el); key('KeyW', true); } else key('KeyW', false);
          const o2 = ow._orbit, yaw = Math.atan2(-(dx * Math.cos(d.facing) - dz * Math.sin(d.facing)), -(dx * Math.sin(d.facing) + dz * Math.cos(d.facing)));
          o2.yaw += Math.atan2(Math.sin(yaw - o2.yaw), Math.cos(yaw - o2.yaw)) * 0.03;
        }
        B.tick();
      }
      return { done: false };
    },
    /** Riding her: turn (a right angle a tap) until she faces (dx, dz) of the plan. */
    turn(dx, dz) {
      const face = () => { const f = B.dir(Math.sin(ow._body.heading), Math.cos(ow._body.heading)); return f[0] * dx + f[1] * dz; };
      for (let k = 0; k < 4 && face() < 0.9; k++) { B.press('KeyD'); B.tick(4); }
      return face() > 0.9;
    },
    /** A press of a key. */
    press(code = 'KeyE') { key(code, true); B.tick(3); key(code, false); B.tick(3); },
    /** Until `fn` says so (or `secs` are up). */
    wait(fn, secs = 20) { let f = 0; for (; f < secs * 60 && !fn(); f++) B.tick(); return { ok: !!fn(), secs: +(f / 60).toFixed(1) }; },
  });
}

const info = () => run(() => { const d = window.__ow.chasm(); return { ...d.debug, mode: window.__ow.mode(), here: window.__bot.here().map((v) => +v.toFixed(1)), inside: d.inside }; });

if (kinds.includes('inside')) {
  await load('dungeon=4&fresh=1');
  const L = await run(() => { const d = window.__ow.chasm(), L = d.layout; return { ms: d.buildMs, lanterns: L.lanterns.length, glows: L.glows.length, tops: L.tops.map((o) => [o.x, o.z, o.r, o.y]), side: L.side, stones: L.stones.length }; });
  console.log('plan', JSON.stringify(L));
  const L2 = await run(() => ({ wurm: window.__bot.L.wurm }));
  const still = async (name, at, to, pitch = 0.14, dist = 9, off = 0) => { await run(([at, to, pitch, dist, off]) => { window.__bot.put(at, to, pitch, dist, off); window.__bot.tick(40); }, [at, to, pitch, dist, off]); await shot(name); };
  await still('in-01-well', 'well', 'door', 0.2, 11);
  await still('in-02-way', 'ante', 'edge', 0.12, 9);
  await still('in-03-lip', 'edge', 'farLip', 0.1, 9);
  await still('in-04-lip-across', 'lip', 'farLip', 0.04, 5);
  await still('in-05-lip-down', 'edge', 'p0', 0.55, 12);
  await still('in-06-on-p0', 'p0', 'p1', 0.45, 11);
  await run(() => window.__ow.chasm().debugDown(1));
  await still('in-07-p0-next-lit', 'p0', 'p1', 0.45, 11);
  await run(() => window.__ow.chasm().debugDown(3));
  await still('in-08-on-p2', 'p2', 'p3', 0.5, 11);
  await still('in-09-p2-up', 'p2', 'p1', -0.4, 12);
  await run(() => window.__ow.chasm().debugDown(6));
  await still('in-10-p5-to-ledge', 'p5', 'ledge', 0.5, 11);
  await run(() => window.__ow.chasm().debugDown());
  await still('in-11-ledge', 'ledge', 'burrow', 0.3, 10);
  await still('in-11b-ledge-end', 'ledge', 'end', 0.3, 10);
  await still('in-11c-ledge-top', 'ledge', 'foot', 1.0, 22);
  await still('in-12-burrow', 'burrow', 'wurm', 0.14, 8);
  await still('in-13-wurm', [L2.wurm.x, L2.wurm.z - 7 * L.side], 'wurm', 0.2, 8);
  await still('in-14-face-up', 'end', 'foot', -0.6, 10);
  await still('in-16-far-lip-back', 'farLip', 'lip', 0.2, 10);
  await still('in-17-loft', 'loft', 'light', 0.14, 8);
}

if (kinds.includes('quest')) {
  await load('dungeon=4&fresh=1');
  let r = await run(() => { window.__bot.go('ante', { stop: 3 }); return window.__bot.go('edge', { stop: 1.5 }); });
  await run(() => window.__bot.tick(50));
  let s = await info();
  check('the way in: at the lip the first lantern is awake, and she thinks of the parachute', r.ok && s.arrived && s.thought > 0.6 && s.target === 0, `${r.secs} s; ${JSON.stringify(s)}`);
  await shot('q-01-lip-thought');

  // A miss on purpose: off the lip with nothing open.
  const t0 = await run(() => window.__bot.frames);
  r = { done: false };
  for (let i = 0; i < 40 && !r.done; i++) r = await run(() => window.__bot.hop(0, 20, { chute: false }));
  check('walking off with nothing open: the wind has you', !!r.caught, JSON.stringify(r));
  for (let i = 0; i < 5; i++) { await run(() => window.__bot.tick(40)); await shot(`miss-${i}`); }
  r = await run(() => window.__bot.wait(() => !window.__ow.chasm().caught && window.__ow._body.grounded && window.__ow.mode() === 'walk', 25));
  s = await info();
  const back = await run(() => window.__bot.far('edge'));
  check('and sets you down back on the lip, the way down to do again', r.ok && back < 14 && s.target === 0 && Math.abs(s.here[2] + 3) < 0.6, `${(((await run(() => window.__bot.frames)) - t0) / 60).toFixed(1)} s from stepping off; ${back.toFixed(1)} m from where you stood; ${JSON.stringify(s)}`);
  await shot('miss-9-set-down');
  check('the thought doesn\'t come again', (await run(() => { window.__bot.tick(60); return window.__ow.chasm().debug.thought; })) < 0.05);

  // Standing a long time on a top: the thought again, until you go on.
  r = { done: false };
  for (let k = 0; k < 60 && !r.done; k++) r = await run(() => window.__bot.hop(0, 45));
  let th = await run(() => { window.__bot.tick(60 * 6); const a = window.__ow.chasm().debug.thought; window.__bot.tick(60 * 8); return [a, window.__ow.chasm().debug.thought]; });
  check('stood 14 s on the first top: nothing at 6 s, then she thinks of the parachute again', !!r.ok && th[0] < 0.05 && th[1] > 0.6, JSON.stringify(th));
  await shot('q-02-hesitate');
  // The way down, top by top.
  const n = await run(() => window.__bot.L.tops.length);
  for (let i = 0; i < n; i++) {
    const f0 = await run(() => window.__bot.frames);
    r = { done: false };
    for (let k = 0; k < 60 && !r.done; k++) { r = await run((i) => window.__bot.hop(i, 45), i); if (k === 3) await shot(`q-hop-${i}`); }
    s = await info();
    check(i < n - 1 ? `top ${i}: landed on` : 'the ledge at the burrow\'s mouth: down', !!r.ok && s.target === i + 1 && (i < n - 1 || s.down), `${(((await run(() => window.__bot.frames)) - f0) / 60).toFixed(1)} s; ${JSON.stringify(r)} ${JSON.stringify(s.here)}`);
    if (!r.ok) break;
  }
  await shot('q-10-down');

  // The wurm.
  r = await run(() => { window.__bot.go('burrow', { stop: 2 }); return window.__bot.go('wurm', { stop: 5, until: () => window.__ow.chasm().debug.glad > 0 }); });
  await run(() => window.__bot.tick(50));
  await shot('q-11-wurm-glad');
  r = await run(() => window.__bot.wait(() => window.__ow.chasm().yours, 8));
  check('she wakes, is glad, and is yours', r.ok, JSON.stringify(await info()));
  r = await run(() => { const B = window.__bot; B.go('wurm', { stop: 2.2, max: 6 }); B.press('KeyE'); B.tick(30); return window.__ow.mode(); });
  check('on to her', r === 'ride', r);
  // Out along the ledge (she lies with her head to the way out, and crawls on by herself): the thought of the wall;
  // its end holds her; a turn to the far face, straight up it, over the lip and on to the light.
  r = await run(() => {
    const B = window.__bot, ow = window.__ow, s = B.L.side;
    ow.view(ow._body.heading + Math.PI, 0.25, 14);
    B.key('KeyW', true);
    const out = B.wait(() => B.here()[1] * s <= 12, 30);
    return { out: out.ok, thought: B.d.debug.thought, here: B.here() };
  });
  check('out of the burrow and along the ledge: she thinks of the wall', r.out && r.thought > 0.6, JSON.stringify(r));
  { const w = await run(() => { const d = window.__ow.chasm(); return { woken: d.woken, lit: d.debug.lit.slice(0, 7), dark: +(d.darkY - d.origin.y).toFixed(0) }; }); check('and the cavern has woken: every lantern of the way down, the dark gone down under the ledge', w.woken && w.lit === '1111111' && w.dark < -150, JSON.stringify(w)); }
  await shot('q-12-ledge-thought');
  r = await run(() => { const B = window.__bot, s = B.L.side; B.tick(60 * 6); const h = B.here(); return { z: +(h[1] * s).toFixed(2), y: +h[2].toFixed(2), mode: window.__ow.mode() }; });
  check('left to crawl on, the ledge\'s end holds her: she doesn\'t go off into the dark', r.mode === 'ride' && r.z > -3.6 && r.z < -2 && Math.abs(r.y + 174.94) < 0.3, JSON.stringify(r));
  await shot('q-12b-ledge-end');
  r = await run(() => window.__bot.turn(1, 0));
  check('turned to the far face', r, JSON.stringify(r));
  const c0 = await run(() => window.__bot.frames);
  for (let i = 0; i < 4; i++) { await run(() => window.__bot.tick(360)); await shot(`climb-${i}`); if ((await info()).here[2] > -4) break; }
  r = await run(() => window.__bot.wait(() => { const h = window.__bot.here(); return h[2] > -3.6 && h[0] > window.__bot.L.at.farLip[0] - 3.5; }, 60));
  s = await info();
  check('up the far face and over the far lip', r.ok && s.mode === 'ride' && s.climbed, `${(((await run(() => window.__bot.frames)) - c0) / 60).toFixed(1)} s; ${JSON.stringify(s.here)}`);
  await shot('q-12c-far-lip');
  r = await run(() => window.__bot.wait(() => window.__ow.chasm().taken, 30));
  check('on to the light: taken', r.ok, JSON.stringify(await info()));
  await run(() => { window.__bot.up(); window.__bot.tick(90); });
  await shot('q-13-light');
  // The cut, and out: you took it mounted, so the ring's arms bring the two of you up together, and you're on her throughout.
  r = await run(() => { const ow = window.__ow; let f = 0; for (; f < 900 && ow.chasm()?.inside; f++) ow.advance(1); return { secs: f / 60, inside: !!ow.chasm()?.inside }; });
  check('the cut', !r.inside, JSON.stringify(r));
  const lift = [];
  for (let i = 0; i < 8; i++) {
    lift.push(await run(() => { const ow = window.__ow, she = ow.chasm().she, d = ow.gen().dungeons[3], b = ow._body.pos; ow.advance(12); return { mode: ow.mode(), on: !!she.ridden && !she.below, by: +she.pos.distanceTo(b).toFixed(2), y: +b.y.toFixed(2), busy: !!ow.ring4().busy, off: +Math.hypot(b.x - d.x, b.z - d.z).toFixed(1) }; }));
    await shot(`q-13b-lift-${i}`);
  }
  check('the ring\'s arms lift the two of you out: on her all the way up, never down off her', lift.every((o) => o.on && o.by < 0.5 && o.off < 8 && (o.mode === 'carried' || o.mode === 'ride')) && lift[0].mode === 'carried' && lift[0].y < lift[lift.length - 1].y - 2 && lift[lift.length - 1].mode === 'ride', JSON.stringify(lift));
  await page.waitForTimeout(1500);
  await run(() => window.__ow.advance(30));
  await shot('q-14-above');
}

if (kinds.includes('story')) {
  // In the story, from the dev checkpoint: by the fourth ring, open; it takes you down; and with the light, back up.
  await page.goto(`${base()}&fresh=1&cp=ring4`); await ready();
  await run(() => window.__ow.advance(60));
  let r = await run(() => { const ow = window.__ow, d = ow.gen().dungeons[3], b = ow._body.pos, g = ow.giant(); return { open: ow.ring4()?.open ?? ow.ring4()?.state ?? null, sealed: ow.ring4()?.sealed, off: +Math.hypot(b.x - d.x, b.z - d.z).toFixed(1), giant: g ? +Math.hypot(g.centre.x - d.x, g.centre.z - d.z).toFixed(0) : null, mode: ow.mode() }; });
  check('cp=ring4: stood by the fourth ring, the giant lying by it', r.off > 5 && r.off < 40 && r.giant !== null && r.giant < 160 && !r.sealed, JSON.stringify(r));
  await page.waitForTimeout(1500);
  await run(() => window.__ow.advance(30));
  await shot('s-01-ring4');
  r = await run(() => {
    const ow = window.__ow, d = ow.gen().dungeons[3], key = (code, down) => window.dispatchEvent(new KeyboardEvent(down ? 'keydown' : 'keyup', { code }));
    key('KeyW', true);
    let f = 0;
    for (; f < 1500 && !ow.chasm()?.inside; f++) { const b = ow._body.pos; ow.lockInput(Math.atan2(-(d.x - b.x), -(d.z - b.z))); ow.advance(1); }
    key('KeyW', false); ow.lockInput(null);
    for (let i = 0; i < 400 && ow.chasm()?.busy; i++) ow.advance(1);
    return { secs: +(f / 60).toFixed(1), inside: !!ow.chasm()?.inside, mode: ow.mode() };
  });
  check('walking into it: taken down into the Drop', r.inside && r.mode === 'walk', JSON.stringify(r));
  await shot('s-02-let-down');
  r = await run(() => {
    const ow = window.__ow, d = ow.chasm();
    d.debugYours(); d.goTo('light');
    let f = 0;
    for (; f < 900 && ow.chasm()?.inside; f++) ow.advance(1);
    ow.advance(240);
    const site = ow.gen().dungeons[3], b = ow._body.pos;
    return { secs: +(f / 60).toFixed(1), mode: ow.mode(), off: +Math.hypot(b.x - site.x, b.z - site.z).toFixed(1), sealed: ow.ring4().sealed, busy: ow.ring4().busy, her: d.she ? { below: !!d.she.below, by: +Math.hypot(d.she.pos.x - b.x, d.she.pos.z - b.z).toFixed(1) } : null };
  });
  check('the light taken: lifted out by the ring, which shuts, the wurm beside you', r.mode === 'walk' && r.off < 8 && r.sealed && !r.busy && r.her && !r.her.below && r.her.by < 8, JSON.stringify(r));
  await page.waitForTimeout(1500);
  await run(() => window.__ow.advance(30));
  await shot('s-03-above');
  await page.goto(await run(() => location.href)); await ready();
  r = await run(() => { const ow = window.__ow; ow.advance(60); const d = ow.gen().dungeons[3], b = ow._body.pos; return { sealed: ow.ring4().sealed, mode: ow.mode(), y: +(b.y - ow.height(b.x, b.z)).toFixed(1), off: +Math.hypot(b.x - d.x, b.z - d.z).toFixed(1) }; });
  check('a reload: the ring stays shut and takes nobody', r.sealed && r.mode !== 'carried', JSON.stringify(r));
}

if (kinds.includes('offer')) {
  // The checkpoint after the light: up by the fourth ring with it, the offering playing, and the shrine a wurm in stone.
  await page.goto(`${base()}&fresh=1&cp=offer4`); await ready();
  let r = await run(() => { const ow = window.__ow; ow.advance(30); return { state: ow.offering4()?.state, busy: !!ow.offering4()?.busy, sealed: ow.ring4()?.sealed, mode: ow.mode() }; });
  check('cp=offer4: up with the light, the offering begun', r.state !== 'given' && r.state !== undefined, JSON.stringify(r));
  for (let i = 0; i < 6; i++) { await run(() => window.__ow.advance(240)); await page.waitForTimeout(400); await shot(`o-${i}`); }
  r = await run(() => { const ow = window.__ow; let f = 0; for (; f < 6000 && ow.offering4().state !== 'given'; f += 30) ow.advance(30); ow.advance(600); return { secs: f / 60, state: ow.offering4().state, busy: !!ow.offering4().busy, sealed: ow.ring4().sealed, mode: ow.mode() }; });
  check('it is given, the ring a shrine, and you have your hands back', r.state === 'given' && r.sealed, JSON.stringify(r));
  await page.waitForTimeout(800);
  await run(() => window.__ow.advance(30));
  await shot('o-9-after');
}

if (kinds.includes('climb')) {
  // Her on the far face, from either side and from out in the pit.
  await load('dungeon=4&fresh=1');
  let r = await run(() => {
    const B = window.__bot, ow = window.__ow;
    B.d.goTo('end'); B.d.debugYours(); B.tick(20);
    B.go(B.her().slice(0, 2), { stop: 2.2, max: 6 }); B.press('KeyE'); B.tick(30);
    ow.view(ow._body.heading + Math.PI, 0.14, 11); B.tick(420);
  });
  // (On the ledge, before the climb: is the ladder's foot in the picture?)
  await shot('climb-foot');
  r = await run(() => {
    const B = window.__bot, ow = window.__ow;
    B.turn(1, 0); B.tick(90);
  });
  await shot('climb-foot-turned');
  r = await run(() => {
    const B = window.__bot, ow = window.__ow;
    B.key('KeyW', true); B.tick(700);
    const c = ow._camera?.position;
    return { mode: ow.mode(), here: B.here(), rider: B.plan(ow._rig.root.position).map((v) => +v.toFixed(2)), shown: ow._rig.root.visible, heading: B.dir(Math.sin(ow._body.heading), Math.cos(ow._body.heading)) };
  });
  console.log(JSON.stringify(r));
  for (const [name, off, pitch] of [['side-a', 1.1, 0.1], ['side-b', -1.1, 0.1], ['behind', 0, 0.3], ['above', 0.5, 0.9]]) {
    await run(([off, pitch]) => { const ow = window.__ow; window.__bot.key('KeyW', false); window.__bot.key('KeyS', true); window.__bot.tick(3); window.__bot.key('KeyS', false); ow.view(ow._body.heading + Math.PI + off, pitch, 9); window.__bot.tick(200); }, [off, pitch]);
    await shot(`climb-${name}`);
  }
  // Along the face: a press is a right angle on the wall. From going up, right is along it to the right; left then is up again; right twice is down.
  const at = () => run(() => { const B = window.__bot, h = B.here(); return [+(h[1] * B.L.side).toFixed(2), +h[2].toFixed(2)]; });
  const go = (code, n = 150) => run(([code, n]) => { const B = window.__bot; if (code) B.press(code); B.tick(n); }, [code, n]);
  await run(() => { const B = window.__bot, ow = window.__ow; ow.view(ow._body.heading + Math.PI, 0.1, 16); B.key('KeyW', true); B.tick(60); });
  // (Left first: she is at the ledge's end, which holds her on the right.)
  const p0 = await at(); await go('KeyA'); const p1 = await at();
  await shot('climb-along');
  await go('KeyD'); const p2 = await at(); await go('KeyD'); const p3 = await at(); await go('KeyD', 60); const p4 = await at(); await go('KeyA', 30); await go('KeyA', 60); const p5 = await at();
  await go(null, 600); const p6 = await at();
  console.log(JSON.stringify({ p0, p1, p2, p3, p4, p5, p6, mode: await run(() => window.__ow.mode()) }));
  const moved = (a, b) => [Math.abs(b[0] - a[0]), b[1] - a[1]];
  const ok = moved(p0, p1)[0] > 3 && Math.abs(moved(p0, p1)[1]) < 0.2 && moved(p1, p2)[1] > 3 && moved(p1, p2)[0] < 0.2 && moved(p2, p3)[0] > 3 && Math.sign(p3[0] - p2[0]) === -Math.sign(p1[0] - p0[0]) && moved(p3, p4)[1] < -1 && moved(p4, p5)[1] > 1
    // (And along it she never leaves the face over the ledge: its end holds her.)
    && p3[0] > -3.3;
  console.log(`  [${ok ? 'ok' : 'FAIL'}] on the face she turns in right angles: along it either way, up, down`);
  if (!ok) process.exitCode = 1;
  // The ladder of lanterns up the face, from out over the pit.
  await run(() => { const B = window.__bot, ow = window.__ow; B.key('KeyW', false); B.key('KeyS', true); B.tick(3); B.key('KeyS', false); ow.view(Math.atan2(-Math.sin(ow._body.heading), -Math.cos(ow._body.heading)), -0.5, 30); B.tick(120); });
  await shot('climb-ladder-up');
  await run(() => { const B = window.__bot, ow = window.__ow; ow.view(ow._orbit?.yaw ?? 0, 0.5, 30); B.tick(47); });
  await shot('climb-ladder-down');
}

if (kinds.includes('home4')) {
  const sandbox = args.includes('sandbox');
  if (sandbox) { await load('fresh=1'); await run(() => { const ow = window.__ow; ow.winDungeon(4); ow.advance(30); }); }
  else { await page.goto(`${base()}&story=1&fresh=1&cp=offer4&t=10`); await ready(); }
  const st = () => run(() => { const ow = window.__ow, h = ow.homecoming4(), g = ow.giant(), d = ow.gen().dungeons, v = ow.village(), c = ow.visit()?.crows, p = ow._body.pos; return { state: h.state, phase: h.phase, clock: +h.clock.toFixed(1), left: h.left, settled: h.settled, veil: +h.veil.toFixed(2), offer: ow.offering4().state, mode: ow.mode(), at: [p.x, p.z], home: v ? v.taken.map((t) => (t ? 0 : 1)).join('') : null, lights: c ? c.birds.map((b) => (b.light ? 1 : 0)).join('') : null, giant: g && { walking: g.walking, dormant: g.dormant, awake: g.awake, sunk: +g.sunk.toFixed(2), by4: Math.round(Math.hypot(g.centre.x - d[3].x, g.centre.z - d[3].z)), by5: Math.round(Math.hypot(g.centre.x - d[4].x, g.centre.z - d[4].z)) } }; });
  /** Step frames; under the homecoming's veil the workers need real time. */
  const go = async (n) => { while (n > 0) { const w = await run(() => window.__ow.homecoming4().waiting); const k = Math.min(n, w ? 3 : 20); await run((k) => window.__ow.advance(k), k); n -= k; if (w) await page.waitForTimeout(80); } };
  const end = await run(() => { const ow = window.__ow, o = ow.offering4(); let f = 0; for (; f < 3600 && !(o.clock > o.cues.end - 1.2); f++) ow.advance(1); return o.clock > o.cues.end - 1.2 ? f : -1; });
  check('the short offering plays', end >= 0);
  const p0 = (await st()).at;
  await page.keyboard.down('KeyW');
  let s, was = '', n = 0, moved = 0;
  const seen = new Set();
  for (let i = 0; i < 90; i++) {
    await go(60);
    s = await st();
    const ph = s.state === 'playing' ? s.phase : s.state;
    seen.add(ph);
    if (s.state !== 'idle') await shot(`h4-${String(++n).padStart(2, '0')}-${ph}-${String(Math.round(s.clock)).padStart(2, '0')}`);
    if (s.state === 'playing') moved = Math.max(moved, Math.hypot(s.at[0] - p0[0], s.at[1] - p0[1]));
    if (ph !== was) { console.log('phase', ph, JSON.stringify(s)); was = ph; }
    if (s.state === 'done') break;
  }
  await page.keyboard.up('KeyW');
  check('it carries on from the smile through every part and hands you back', s.state === 'done' && (sandbox ? seen.has('rise') : ['leave', 'village', 'rise'].every((k) => seen.has(k))), `${n} s; ${[...seen].join(' ')}`);
  check('hands off throughout, and still on foot by the shrine', moved < 0.3 && s.mode === 'walk', `moved ${moved.toFixed(2)} m with W held; ${s.mode}`);
  check('the giant is up from the fourth ring and walking', s.left && s.giant.walking && !s.giant.dormant && s.giant.sunk < 0.05, JSON.stringify(s.giant));
  if (!sandbox) check('the fourth spirit is home too, and its crow carries nothing', s.home.startsWith('1111') && s.home.split('1').length - 1 === 4 && s.lights.startsWith('0000'), `${s.home} ${s.lights}`);
  await go(200);
  await shot('h4-back');
  // The walk to the fifth ring (game time, stepped), and lying down there.
  const took = await run(() => { const ow = window.__ow; let f = 0; for (; f < 20000 && !ow.homecoming4().settled; f += 30) ow.advance(30, 1 / 30); return f / 30; });
  await run(() => window.__ow.advance(1200));
  s = await st();
  check('it walks to the fifth ring and lies down: a hill again', s.settled && s.giant.dormant && !s.giant.awake && s.giant.sunk === 1 && s.giant.by5 > 30 && s.giant.by5 < 140, `${took.toFixed(0)} s of game time; ${JSON.stringify(s.giant)}`);
  const look5 = async (name) => {
    await run(() => { const ow = window.__ow, d = ow.gen().dungeons[4], g = ow.giant(); const ux = g.centre.x - d.x, uz = g.centre.z - d.z, l = Math.hypot(ux, uz); ow.teleport(d.x - (ux / l) * 34, d.z - (uz / l) * 34); ow.view(Math.atan2(-ux, -uz), 0.1, 16); ow.advance(80); });
    for (let i = 0; i < 40; i++) { await page.waitForTimeout(100); await run(() => window.__ow.advance(3)); if (await run(() => window.__ow.ready())) break; }
    await shot(name);
  };
  await look5('h4-ring5');
  const r = await run(() => { const ow = window.__ow, d = ow.gen().dungeons[4]; ow.teleport(d.x, d.z); ow.advance(120); return { mode: ow.mode(), y: +(ow._body.pos.y - ow.height(d.x, d.z)).toFixed(1) }; });
  check('the fifth ring is bare stones: standing in its middle, nothing takes you', (r.mode === 'walk' || r.mode === 'ride') && Math.abs(r.y) < 2.5, JSON.stringify(r));
  // A reload: nothing replays, and it is there already.
  await page.goto(sandbox ? `${base()}&story=0&t=10` : await run(() => location.href)); await ready();
  await run(() => window.__ow.advance(60));
  s = await st();
  check('a reload replays nothing and finds it asleep by the fifth ring', s.state === 'done' && s.settled && !s.veil && s.offer === 'given' && s.giant.dormant && s.giant.by5 < 140 && (sandbox || s.home.startsWith('1111')), JSON.stringify(s));
  await look5('h4-reload-ring5');
}

await browser.close();
server.close();
if (failed) { console.log(`${failed} failed`); process.exit(1); }
