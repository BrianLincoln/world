// The third dungeon, the Moon Hall: node scripts/moth.mjs <dir> [seed=hilda] [inside,quest,reload,story,home3]
//   inside: stills from round the hall as you'd find it (dark), the hint in the floor, a stone's face,
//           and the same with the lamp lit.
//   quest:  the whole of it played with the keys, from the well: the first look at her on her ledge
//           (her wings' stretch: `look-*`);
//           each stone turned to its moon (read off the floor's moons, as a player would); the lamp
//           lighting and her coming down (a frame every half second: `show-*`); getting on; flying up
//           to the ledge the lamp points at; the gallery; the light; the cut and the ring's arms lifting you out; and
//           above ground the ring shutting and the short offering.
//           Prints ok/FAIL per step and the game time it took, and which piece of music was asked for when;
//           exits 1 if a step failed. (How it sounds: scripts/moth-music.mjs.)
//   reload: a reload part way (two stones right), with the lamp lit, and after the light.
//   story:  in the story (`?fresh=1&cp=ring3`, `cp=offer3`).
//   home3:  what follows the third smile (the third `Homecoming`): the crow leaving with a light, the
//           village (the third spirit home), the giant getting up from the third ring, the walk, it lying
//           down by the fourth ring (bare stones), and a reload. `home3 sandbox`: outside the story.
// Uses the build in dist/, or in $DIST (run `npx vite build --outDir <folder>` first). See also moth-plan.mjs.
import { chromium } from 'playwright';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const args = process.argv.slice(2);
const dir = args[0] ?? 'shots/moth';
const seed = args.find((a) => a.startsWith('seed='))?.slice(5) ?? 'hilda';
const kinds = (args.find((a) => /^(inside|quest|reload|story|home3)/.test(a)) ?? 'inside').split(',');
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
  // (Stepped by hand from here on: without this every `advance` leaves another frame loop running, and the page crawls.)
  await page.evaluate(() => window.__ow.manual(true));
  await page.evaluate(bot);
};
const load = async (q) => { await page.goto(`${base()}&story=0&t=10&${q}`); await ready(); };
const shot = async (name) => {
  for (let i = 0; i < 3; i++) {
    try { await page.screenshot({ path: path.join(dir, name + '.png'), timeout: 12000 }); console.log(name); return; }
    catch { const t = await page.evaluate(() => { window.__ow.advance(1); return [window.__ow.mode(), JSON.stringify(window.__ow.hall()?.debug ?? null)]; }); console.log(`(screenshot ${name} timed out, try ${i + 1})`, t.join(' ').slice(0, 300)); }
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
    get d() { return ow.hall(); },
    get L() { return ow.hall().layout; },
    key,
    up() { for (const k of ['KeyW', 'ShiftLeft', 'Space', 'KeyE', 'KeyC']) key(k, false); },
    /** The music asked for, as it changes: [game seconds, piece]. */
    cues: [],
    tick(n = 1) { ow.advance(n); B.frames += n; const m = ow.hall()?.music ?? null; if (m !== (B.cues.at(-1)?.[1] ?? null)) B.cues.push([+(B.frames / 60).toFixed(1), m]); },
    P(p) { return typeof p === 'string' ? B.L.at[p] : p; },
    /** A point of the world, in the plan: [x, z, height]. */
    plan(v) { const d = B.d, dx = v.x - d.origin.x, dz = v.z - d.origin.z, c = Math.cos(d.facing), s = Math.sin(d.facing); return [dx * c + dz * s, -dx * s + dz * c, v.y - d.origin.y]; },
    here() { return B.plan(ow._body.pos); },
    her() { return B.plan(B.d.she.pos); },
    far(p) { const h = B.here(), q = B.P(p); return Math.hypot(h[0] - q[0], h[1] - q[1]); },
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
    /** Walk (or fly) to a place by the keys. `alt`: riding, hold this height of the plan (Space under it, C well over it). */
    go(p, o = {}) {
      const stop = o.stop ?? 1.5, max = (o.max ?? 60) * 60;
      key('KeyW', true); key('ShiftLeft', !!o.sprint);
      let best = B.far(p), since = 0, jink = 0, f = 0;
      for (; f < max && B.far(p) > stop && !(o.until && o.until()); f++) {
        B.aim(p, jink > 0 ? 1.2 * (jink > 40 ? 1 : -1) : 0);
        if (o.alt !== undefined) { const y = B.here()[2]; key('Space', y < o.alt); key('KeyC', y > o.alt + 3); }
        B.tick();
        if (jink > 0) jink--;
        const now = B.far(p);
        if (now < best - 0.3) { best = now; since = 0; } else if (++since > 50 && jink === 0) { jink = 40 + (f % 2) * 40; since = 0; best = now + 2; }
      }
      B.up();
      B.tick(12);
      return { ok: B.far(p) <= stop + 0.5 || !!(o.until && o.until()), secs: +(f / 60).toFixed(1), at: B.here().map((v) => +v.toFixed(1)) };
    },
    /** A press of E. */
    press() { key('KeyE', true); B.tick(3); key('KeyE', false); B.tick(3); },
    /** Until `fn` says so (or `secs` are up). */
    wait(fn, secs = 20) { let f = 0; for (; f < secs * 60 && !fn(); f++) B.tick(); return { ok: !!fn(), secs: +(f / 60).toFixed(1) }; },
  });
}

const info = () => run(() => { const d = window.__ow.hall(); return { ...d.debug, mode: window.__ow.mode(), here: window.__bot.here().map((v) => +v.toFixed(1)), inside: d.inside }; });

if (kinds.includes('inside')) {
  await load('dungeon=3');
  const L = await run(() => { const L = window.__ow.hall().layout; return { ms: window.__ow.hall().buildMs, lanterns: L.lanterns.length, glows: L.glows.length, dials: L.dials, wallCaps: L.wallCaps.length, side: L.side }; });
  console.log('plan', JSON.stringify(L));
  const still = async (name, at, to, pitch = 0.14, dist = 9, off = 0) => { await run(([at, to, pitch, dist, off]) => { window.__bot.put(at, to, pitch, dist, off); window.__bot.tick(40); }, [at, to, pitch, dist, off]); await shot(name); };
  await still('in-01-well', 'well', 'door', 0.2, 11);
  await run(() => { window.__ow.hall().seen = true; });
  await still('in-02-hall-mouth', 'hall', 'lamp', 0.1, 10);
  await still('in-03-lamp-dark', 'lamp', 'under', 0.25, 14);
  await still('in-04-floor-ring', [(await run(() => window.__bot.L.lamp.x)) - 21, 0], 'under', 0.8, 26);
  await still('in-04b-ring-near', [(await run(() => window.__bot.L.lamp.x)) - 13, 3], 'under', 0.6, 9);
  await still('in-04c-hall-tall', 'hall', 'under', -0.42, 26);
  await still('in-05-dial0', 'dial0', [L.dials[0].x, L.dials[0].z], 0.12, 6.5, 0.5);
  await still('in-06-up-at-her', 'under', 'perch', -0.35, 14);
  await still('in-06b-her-from-the-door', 'hall', 'perch', 0.0, 10);
  await run(() => window.__ow.hall().debugSolve(true));
  await run(() => window.__bot.tick(30));
  await still('in-07-solving', 'lamp', 'under', 0.2, 13);
  await run(() => window.__bot.wait(() => window.__ow.hall().debug.show < 0 && window.__ow.hall().debug.glad <= 0, 20));
  await still('in-08-lamp-lit', 'hall', 'under', 0.12, 13);
  await still('in-09-lit-wide', 'dial1', 'under', 0.3, 16, 0.4);
  await still('in-10-floor-lit', [(await run(() => window.__bot.L.lamp.x)) - 21, 0], 'under', 0.8, 26);
  await still('in-11-ledge', 'ledge', 'gallery', 0.14, 10);
  await still('in-12-gallery', 'gallery', 'turn', 0.02, 18);
  await still('in-12b-gallery2', 'turn', 'light', 0.02, 18);
  await still('in-13-loft', 'loft', 'light', 0.14, 9);
}

if (kinds.includes('quest')) {
  await load('dungeon=3&fresh=1');
  // The way in, and the first look at her.
  let r = await run(() => { window.__bot.go('ante', { stop: 3 }); return window.__bot.go('hall', { stop: 2, until: () => window.__ow.hall().debug.look >= 0 }); });
  let d = await info();
  check('walking in, the camera goes up to her', d.look >= 0, JSON.stringify(r));
  // (She stretches her wings while the camera is on her: a frame every 0.4 s.)
  for (let i = 0; i < 8; i++) { await run(() => window.__bot.tick(24)); await shot(i === 4 ? 'q-01-first-look' : `look-${i}`); }
  r = await run(() => window.__bot.wait(() => !window.__ow.hall().busy, 8));
  check('and comes back', r.ok, `${r.secs}s`);
  // The answer, read off the floor.
  await run(() => { window.__bot.go('lamp', { stop: 1.5 }); });
  await shot('q-02-at-the-lamp');
  // Each stone in turn.
  for (let i = 0; i < 4; i++) {
    r = await run((i) => window.__bot.go(`dial${i}`, { stop: 1.2 }), i);
    const t = await run((i) => {
      const B = window.__bot, d = B.d, want = d.layout.dials[i].want;
      let n = 0;
      const offer = d.action('walk');
      while (d.dials[i].n !== want && n < 6) { B.press(); B.tick(40); n++; }
      B.tick(50);
      return { offer, n, k: d.dials[i].k, shows: d.dials[i].n, want };
    }, i);
    check(`stone ${i}: turned to its moon`, r.ok && t.offer === 'hand' && t.shows === t.want && (i === 3 || t.k > 0.9), JSON.stringify({ ...t, walk: r.secs }));
    if (i === 0) await shot('q-03-stone-right');
    if (i === 2) await shot('q-04-three-right');
  }
  d = await info();
  check('all four: the lamp is lit', d.solved && d.show >= 0, `show ${d.show.toFixed(2)}`);
  for (let i = 0; i < 20; i++) {
    await shot(`show-${String(i).padStart(2, '0')}`);
    await run(() => window.__bot.tick(30));
    if ((await info()).show < 0) break;
  }
  r = await run(() => window.__bot.wait(() => window.__ow.hall().mountable, 12));
  d = await info();
  check('she comes down, is glad, and is yours', r.ok && d.yours, `${r.secs}s more`);
  await shot('q-05-yours');
  // Up on to her, and up to the ledge the lamp points at.
  const her = await run(() => window.__bot.her());
  r = await run((her) => window.__bot.go([her[0], her[1]], { stop: 2.4 }), her);
  await run(() => window.__bot.press());
  d = await info();
  check('E by her: on her back', d.mode === 'ride', JSON.stringify(r));
  await shot('q-06-mounted');
  const top = await run(() => window.__bot.L.pulpit.y);
  r = await run((top) => { const B = window.__bot; B.key('Space', true); B.tick(30); return B.go('pulpit', { stop: 2.5, alt: top + 3, max: 60 }); }, top);
  d = await info();
  check('flown up to the ledge', r.ok && d.here[2] > top - 0.5, JSON.stringify(r));
  await shot('q-07-over-the-lip');
  r = await run((top) => { const B = window.__bot; B.go('gallery', { stop: 4, alt: top + 6, max: 40 }); return B.go('turn', { stop: 4, alt: top + 6, max: 40 }); }, top);
  await shot('q-08-gallery');
  r = await run((top) => { const B = window.__bot; B.go('gallery2', { stop: 4, alt: top + 4, max: 40 }); return B.go('light', { stop: 1, alt: top + 0.8, max: 40, until: () => window.__ow.hall().taken }); }, top);
  d = await info();
  check('down the gallery to the light: taken', d.taken, JSON.stringify(r));
  await run(() => window.__bot.tick(90));
  await shot('q-09-the-light');
  console.log('music, by game time:', JSON.stringify(await run(() => { window.__bot.tick(0); return window.__bot.cues; })));
  r = await run(() => window.__bot.wait(() => !window.__ow.hall().inside, 12));
  check('the cut, and out', r.ok, `${r.secs}s`);
  await run(() => window.__ow.advance(30));
  await shot('q-11-lifted-out');
  await run(() => { const ow = window.__ow; for (let f = 0; f < 600 && ow.ring3().busy; f++) ow.advance(1); ow.advance(20); });
  check('above: on her, since you were below', await run(() => window.__ow.mode()) === 'ride');
  await shot('q-12-above');
  const o = await run(() => { const ow = window.__ow; let f = 0; for (; f < 60 * 40 && ow.offering3().state !== 'given'; f++) ow.advance(1); const s = ow.offering3().state; ow.advance(30); const m = ow.hall().she, c = ow.ring3().site, b = ow._body.pos; let up = 0, off = 0; for (let i = 0; i < 300; i++) { ow.advance(1); up = Math.max(up, m.pos.y - ow.height(m.pos.x, m.pos.z)); off = Math.max(off, Math.hypot(m.pos.x - b.x, m.pos.z - b.z)); } return { state: s, secs: +(f / 60).toFixed(1), mode: ow.mode(), mothUp: +up.toFixed(2), mothFromYou: +off.toFixed(1), mothFromShrine: +Math.hypot(m.pos.x - c.x, m.pos.z - c.z).toFixed(1), grounded: m.grounded }; });
  check('above: off her for the offering, as at the other two; she stays down where you got off', o.state === 'given' && o.mode === 'walk' && o.grounded && o.mothUp < 0.3 && o.mothFromShrine > 3.5, JSON.stringify(o));
  await shot('q-13-given');
}

if (kinds.includes('reload')) {
  await load('dungeon=3&fresh=1');
  await run(() => { const d = window.__ow.hall(); d.debugSolve(false); const o = d.dials[0]; o.n = (o.n + 1) % 4; o.turns++; d.act; window.__bot.tick(5); });
  const before = await run(() => window.__ow.hall().dials.map((o) => o.n));
  await run(() => { window.__bot.put('dial3', 'lamp'); window.__bot.press(); window.__bot.tick(60); });
  const mid = await run(() => window.__ow.hall().dials.map((o) => o.n));
  await load('dungeon=3');
  const after = await run(() => window.__ow.hall().dials.map((o) => o.n));
  check('a reload part way keeps the stones as they stood', JSON.stringify(mid) === JSON.stringify(after), `${before} -> ${mid} -> ${after}`);
  await run(() => { window.__ow.hall().debugYours(); window.__bot.tick(30); });
  await load('dungeon=3');
  let d = await info();
  check('a reload with the lamp lit: lit, and she is by it, yours', d.solved && d.yours && d.lampK > 0.99, JSON.stringify({ lampK: d.lampK, her: await run(() => window.__bot.her().map((v) => +v.toFixed(1))) }));
  await run(() => { window.__bot.put('hall', 'lamp', 0.12, 12); window.__bot.tick(40); });
  await shot('r-01-lit-reload');
  await run(() => window.__ow.winDungeon(3));
  await run(() => { const ow = window.__ow; for (let f = 0; f < 60 * 40 && ow.offering3().state !== 'given'; f++) ow.advance(1); ow.advance(60); });
  await load('');
  d = await run(() => ({ ring: window.__ow.ring3().sealed, offer: window.__ow.offering3().state, moth: !!window.__ow.riding() || true }));
  check('a reload after the ending: the ring shut, the offering given', d.ring && d.offer === 'given', JSON.stringify(d));
}

if (kinds.includes('story')) {
  await page.goto(`${base()}&story=1&fresh=1&cp=ring3&t=10`);
  await ready();
  let s = await run(() => ({ open: window.__ow.ring3().open ?? null, giant: !!window.__ow.giant?.(), mode: window.__ow.mode() }));
  console.log('cp=ring3', JSON.stringify(s));
  await run(() => window.__ow.advance(60));
  await shot('s-01-ring3');
  await page.goto(`${base()}&story=1&fresh=1&cp=offer3&t=10`);
  await ready();
  await run(() => window.__ow.advance(240));
  await shot('s-02-offer3');
  s = await run(() => { const ow = window.__ow; let f = 0; for (; f < 60 * 40 && ow.offering3().state !== 'given'; f++) ow.advance(1); ow.advance(60); return { state: ow.offering3().state, secs: f / 60, on: ow.riding()?.species.name }; });
  check('story: the third offering plays through', s.state === 'given', JSON.stringify(s));
  await shot('s-03-given');
}

if (kinds.includes('home3')) {
  const sandbox = args.includes('sandbox');
  if (sandbox) { await load('fresh=1'); await run(() => { const ow = window.__ow; ow.winDungeon(3); ow.advance(30); }); }
  else { await page.goto(`${base()}&story=1&fresh=1&cp=offer3&t=10`); await ready(); }
  const st = () => run(() => { const ow = window.__ow, h = ow.homecoming3(), g = ow.giant(), d = ow.gen().dungeons, v = ow.village(), c = ow.visit()?.crows, p = ow._body.pos; return { state: h.state, phase: h.phase, clock: +h.clock.toFixed(1), left: h.left, settled: h.settled, veil: +h.veil.toFixed(2), offer: ow.offering3().state, mode: ow.mode(), at: [p.x, p.z], home: v ? v.taken.map((t) => (t ? 0 : 1)).join('') : null, lights: c ? c.birds.map((b) => (b.light ? 1 : 0)).join('') : null, giant: g && { walking: g.walking, dormant: g.dormant, awake: g.awake, sunk: +g.sunk.toFixed(2), by3: Math.round(Math.hypot(g.centre.x - d[2].x, g.centre.z - d[2].z)), by4: Math.round(Math.hypot(g.centre.x - d[3].x, g.centre.z - d[3].z)) } }; });
  /** Step frames; under the homecoming's veil the workers need real time. */
  const go = async (n) => { while (n > 0) { const w = await run(() => window.__ow.homecoming3().waiting); const k = Math.min(n, w ? 3 : 20); await run((k) => window.__ow.advance(k), k); n -= k; if (w) await page.waitForTimeout(80); } };
  const end = await run(() => { const ow = window.__ow, o = ow.offering3(); let f = 0; for (; f < 3600 && !(o.clock > o.cues.end - 1.2); f++) ow.advance(1); return o.clock > o.cues.end - 1.2 ? f : -1; });
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
    if (s.state !== 'idle') await shot(`h3-${String(++n).padStart(2, '0')}-${ph}-${String(Math.round(s.clock)).padStart(2, '0')}`);
    if (s.state === 'playing') moved = Math.max(moved, Math.hypot(s.at[0] - p0[0], s.at[1] - p0[1]));
    if (ph !== was) { console.log('phase', ph, JSON.stringify(s)); was = ph; }
    if (s.state === 'done') break;
  }
  await page.keyboard.up('KeyW');
  check('it carries on from the smile through every part and hands you back', s.state === 'done' && (sandbox ? seen.has('rise') : ['leave', 'village', 'rise'].every((k) => seen.has(k))), `${n} s; ${[...seen].join(' ')}`);
  check('hands off throughout, and still on foot by the shrine', moved < 0.3 && s.mode === 'walk', `moved ${moved.toFixed(2)} m with W held; ${s.mode}`);
  check('the giant is up from the third ring and walking', s.left && s.giant.walking && !s.giant.dormant && s.giant.sunk < 0.05, JSON.stringify(s.giant));
  if (!sandbox) check('the third spirit is home too, and its crow carries nothing', s.home.startsWith('111') && s.home.split('1').length - 1 === 3 && s.lights.startsWith('000'), `${s.home} ${s.lights}`);
  await go(200);
  await shot('h3-back');
  // The walk to the fourth ring (game time, stepped), and lying down there.
  const took = await run(() => { const ow = window.__ow; let f = 0; for (; f < 20000 && !ow.homecoming3().settled; f += 30) ow.advance(30, 1 / 30); return f / 30; });
  await run(() => window.__ow.advance(1200));
  s = await st();
  check('it walks to the fourth ring and lies down: a hill again', s.settled && s.giant.dormant && !s.giant.awake && s.giant.sunk === 1 && s.giant.by4 > 30 && s.giant.by4 < 140, `${took.toFixed(0)} s of game time; ${JSON.stringify(s.giant)}`);
  const look4 = async (name) => {
    await run(() => { const ow = window.__ow, d = ow.gen().dungeons[3], g = ow.giant(); const ux = g.centre.x - d.x, uz = g.centre.z - d.z, l = Math.hypot(ux, uz); ow.teleport(d.x - (ux / l) * 34, d.z - (uz / l) * 34); ow.view(Math.atan2(-ux, -uz), 0.1, 16); ow.advance(80); });
    for (let i = 0; i < 40; i++) { await page.waitForTimeout(100); await run(() => window.__ow.advance(3)); if (await run(() => window.__ow.ready())) break; }
    await shot(name);
  };
  await look4('h3-ring4');
  const r = await run(() => { const ow = window.__ow, d = ow.gen().dungeons[3]; ow.teleport(d.x, d.z); ow.advance(120); return { mode: ow.mode(), y: +(ow._body.pos.y - ow.height(d.x, d.z)).toFixed(1) }; });
  check('the fourth ring is bare stones: standing in its middle, nothing takes you', (r.mode === 'walk' || r.mode === 'ride') && Math.abs(r.y) < 2.5, JSON.stringify(r));
  // A reload: nothing replays, and it is there already.
  await page.goto(sandbox ? `${base()}&story=0&t=10` : await run(() => location.href)); await ready();
  await run(() => window.__ow.advance(60));
  s = await st();
  check('a reload replays nothing and finds it asleep by the fourth ring', s.state === 'done' && s.settled && !s.veil && s.offer === 'given' && s.giant.dormant && s.giant.by4 < 140 && (sandbox || s.home.startsWith('111')), JSON.stringify(s));
  await look4('h3-reload-ring4');
}

await browser.close();
server.close();
if (failed) { console.log(`${failed} failed`); process.exit(1); }
