// The second dungeon, the Veil Cave: node scripts/veil.mjs <dir> [seed=hilda] [inside,quest,dash,reload,perf]
//   inside: stills from round the cave as you'd find it, and four with every lantern awake
//   quest:  the whole of it played with the keys, from the well: she watches you arrive; round 1
//           (behind the short veil; walk round its end); round 2 (the next); round 3 (the shut cell beside it:
//           her head through the stone, her back offered), each by following her as she leads
//           (she waits at every veil for you, leaves her prints and her mark in it, and her room is
//           alight when she's behind one); a veil tried on foot; a dash at rock;
//           the ride (into the pocket, three veils down the middle, the amber veil); the light; the
//           way out through the well's wall; and above ground the ring shutting and the short
//           offering. Also the stalls: stand still at each round and she comes for you.
//           Prints ok/FAIL per step and the game time it took; exits 1 if a step failed.
//   dash:   a dash through a veil, a frame at a time (every frame drawn), for the camera.
//   stall:  stand still, stop short, walk the wrong way: she waits where she is (she never comes back for you).
//   arrive: the second ring opening the real way: the first dungeon won, the giant walking there.
//   story:  in the story (`?fresh=1&cp=ring2`, `cp=offer2`): the ring opened where the giant lies, and a
//           second spirit home when the ending is over.
//   home2:  what follows the second smile (the second `Homecoming`): the crow leaving with a light, the
//           village, the giant up and off to the third ring; frames every second (`h2-*`), then the
//           walk, it lying down by the third ring, and a reload. `home2 sandbox`: outside the story.
//   reload: a reload at each stage (before she's found, part way, riding, after the light, after
//           the ending), and what each finds.
//   perf:   frame cost standing in six places, dark and with every lantern lit (add `uncapped`).
// Uses the build in dist/, or in $DIST (run `npx vite build` first). See also veil-plan.mjs.
import { chromium } from 'playwright';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const args = process.argv.slice(2);
const dir = args[0] ?? 'shots/veil';
const seed = args.find((a) => a.startsWith('seed='))?.slice(5) ?? 'hilda';
const kinds = (args.find((a) => /^(inside|quest|dash|stall|reload|story|arrive|home2|perf)/.test(a)) ?? 'inside').split(',');
const uncapped = args.includes('uncapped');
fs.mkdirSync(dir, { recursive: true });
const server = http.createServer((req, res) => {
  const p = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  const f = path.join(root, process.env.DIST ?? 'dist', p === '/' ? 'index.html' : p);
  if (!fs.existsSync(f)) { res.writeHead(404); res.end(); return; }
  res.writeHead(200, { 'content-type': f.endsWith('.js') ? 'text/javascript' : f.endsWith('.html') ? 'text/html' : f.endsWith('.css') ? 'text/css' : 'application/octet-stream' });
  fs.createReadStream(f).pipe(res);
});
await new Promise((r) => server.listen(0, r));
const browser = await chromium.launch({ args: ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist', ...(uncapped ? ['--disable-gpu-vsync', '--disable-frame-rate-limit'] : [])] });
const page = await browser.newPage({ viewport: { width: 1600, height: 900 } });
page.on('console', (m) => { if (!m.text().includes('useProgram') && !m.text().includes('toNonIndexed')) console.log('[page]', m.text().slice(0, 400)); });
page.on('pageerror', (e) => console.log('[pageerror]', e.message));
const base = () => `http://localhost:${server.address().port}/?seed=${seed}&ui=0&capture=1&mobs=0&drak=0`;
const ready = async () => {
  for (let i = 0; i < 240; i++) { if (await page.evaluate(() => window.__ow?.ready())) break; await page.waitForTimeout(250); }
  await page.waitForTimeout(500);
  await page.evaluate(bot);
};
const load = async (q) => { await page.goto(`${base()}&story=0&t=10&${q}`); await ready(); };
const shot = async (name) => { await page.screenshot({ path: path.join(dir, name + '.png') }); console.log(name); };
const step = (n, dt = 1 / 60) => page.evaluate(([n, dt]) => window.__ow.advance(n, dt), [n, dt]);
const run = (fn, arg) => page.evaluate(fn, arg);
let failed = 0;
const check = (what, ok, more = '') => { console.log(`${ok ? 'ok  ' : 'FAIL'} ${what}${more ? '  ' + more : ''}`); if (!ok) failed++; };

/** In the page: a player that works the keys. Places are the plan's (`layout.at` names, or [x, z]). */
function bot() {
  const ow = window.__ow;
  const key = (code, down) => window.dispatchEvent(new KeyboardEvent(down ? 'keydown' : 'keyup', { code }));
  const B = (window.__bot = {
    frames: 0,
    get d() { return ow.cave(); },
    get L() { return ow.cave().layout; },
    key,
    up() { for (const k of ['KeyW', 'ShiftLeft', 'Space', 'KeyE']) key(k, false); },
    tick(n = 1) { ow.advance(n); B.frames += n; },
    P(p) { return typeof p === 'string' ? B.L.at[p] : p; },
    /** A point of the world, in the plan: [x, z, height]. */
    plan(v) { const d = B.d, dx = v.x - d.origin.x, dz = v.z - d.origin.z, c = Math.cos(d.facing), s = Math.sin(d.facing); return [dx * c + dz * s, -dx * s + dz * c, v.y - d.origin.y]; },
    here() { return B.plan(ow._body.pos); },
    her() { return B.plan(B.d.she.pos); },
    far(p) { const h = B.here(), q = B.P(p); return Math.hypot(h[0] - q[0], h[1] - q[1]); },
    toHer() { const h = B.here(), q = B.her(); return Math.hypot(h[0] - q[0], h[1] - q[1]); },
    cell() { const h = B.here(); return B.L.cellAt(h[0], h[1]); },
    herCell() { const h = B.her(); return B.L.cellAt(h[0], h[1]); },
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
    /** Walk (or ride) to a place by the keys. Sidesteps if it stops getting nearer. `until`: stop early when it says so. */
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
    /** Round the ring on foot from the cell you're in to `to`, by the gaps (`east`: by E1; else by W1). */
    walk(to, east = true, o = {}) {
      const ring = ['L1', 'E1', 'E2', 'E3', 'E4', 'F', 'W4', 'W3', 'W2', 'W1'];
      let at = B.cell();
      if (!ring.includes(at)) { const r = B.go('L1', { stop: 6, ...o }); if (!r.ok) return r; at = 'L1'; }
      let secs = 0, guard = 0;
      while (at !== to && guard++ < 12) {
        const nxt = ring[(ring.indexOf(at) + (east ? 1 : ring.length - 1)) % ring.length];
        const g = B.go(`${at}>${nxt}`, { stop: 1.2, ...o });
        secs += g.secs;
        if (!g.ok) return { ...g, stuck: `${at}>${nxt}` };
        const c = B.go(nxt, { stop: 5, ...o });
        secs += c.secs;
        if (o.until && o.until()) break;
        at = nxt;
      }
      return { ok: at === to || !!(o.until && o.until()), secs: +secs.toFixed(1), at: B.here().map((v) => +v.toFixed(1)) };
    },
    /**
     * After her, as a player would go: straight for her while nothing is between you, and round by the
     * gap of whatever veil is (a pocket's veil has none: up to it). Stops `stop` m short of her.
     */
    chase(o = {}) {
      const stop = o.stop ?? 5, max = (o.max ?? 90) * 60;
      let f = 0, best = 1e9, since = 0, jink = 0;
      for (; f < max && !(o.until && o.until()); f++) {
        const me = B.here(), h = B.her(), v = B.L.firstVeil(me[0], me[1], h[0], h[1]);
        // (Not in the room she's in, or the one beside her shut cell: round the ring by its gaps, the shorter way.)
        const ring = ['L1', 'E1', 'E2', 'E3', 'E4', 'F', 'W4', 'W3', 'W2', 'W1'];
        const mine = B.cell(), hers = ring.includes(B.herCell()) ? B.herCell() : B.d.debug.peekCell;
        let to = v && v.v.gap ? v.v.gap : [h[0], h[1]], way = false;
        if (ring.includes(mine) && mine !== hers && v && !(v.v.gap && (v.v.from === mine || v.v.to === mine) && (v.v.from === hers || v.v.to === hers))) {
          const i = ring.indexOf(mine), k = (ring.indexOf(hers) - i + 10) % 10, nxt = ring[(i + (k <= 5 ? 1 : 9)) % 10], g = B.L.at[`${mine}>${nxt}`];
          to = Math.hypot(me[0] - g[0], me[1] - g[1]) > 1.5 ? g : B.L.at[nxt];
          way = true;
        }
        const d = Math.hypot(me[0] - to[0], me[1] - to[1]), move = way || !!(v && v.v.gap) || d > stop;
        key('KeyW', move); key('ShiftLeft', move && !!o.sprint);
        B.aim(to, jink > 0 ? 1.2 * (jink > 40 ? 1 : -1) : 0);
        B.tick();
        if (o.each) o.each();
        if (jink > 0) jink--;
        if (!move) { since = 0; best = 1e9; continue; }
        if (d < best - 0.3) { best = d; since = 0; } else if (++since > 50 && jink === 0) { jink = 40 + (f % 2) * 40; since = 0; best = d + 2; }
      }
      B.up(); B.tick(6);
      return { ok: !!(o.until && o.until()), secs: +(f / 60).toFixed(1), at: B.here().map((v) => +v.toFixed(1)) };
    },
    /** Up on to her: walk up to her and press E. */
    mount() {
      const h = B.her();
      const r = B.go([h[0], h[1]], { stop: 1.7, max: 20 });
      key('KeyE', true); B.tick(2); key('KeyE', false); B.tick(20);
      return { ...r, mode: ow.mode() };
    },
    /**
     * A dash through a veil: ride at it from where you are, square on, and press Space a few metres short.
     * `from`/`to` name the two cells; returns where you ended up.
     */
    dash(from, to, o = {}) {
      const start = B.L.at[`${from}|${to}`], end = B.L.at[`${to}|${from}`];
      const r = B.go(start, { stop: 1.6, max: 30 });
      if (!r.ok) return { ok: false, why: 'never got to the veil', ...r };
      key('KeyW', true); key('ShiftLeft', o.sprint !== false);
      let f = 0, pressed = -1;
      const want = to;
      for (; f < 240; f++) {
        B.aim(end);
        const h = B.here();
        const v = B.L.firstVeil(h[0], h[1], end[0], end[1]);
        const gap = v ? v.t * Math.hypot(end[0] - h[0], end[1] - h[1]) : 0;
        if (pressed < 0 && v && gap < 4.5 && f > 6) { key('Space', true); pressed = f; }
        if (pressed >= 0 && f > pressed + 3) key('Space', false);
        B.tick();
        if (o.each) o.each(f, pressed);
        if (B.cell() === want && pressed >= 0 && f > pressed + 30) break;
      }
      B.up(); B.tick(20);
      return { ok: B.cell() === want, cell: B.cell(), secs: +(f / 60).toFixed(1), at: B.here().map((v) => +v.toFixed(1)), mode: ow.mode() };
    },
  });
}

if (kinds.includes('inside')) {
  await load('dungeon=2&fresh=1');
  await run(() => window.__ow.manual(true));
  // [name, stand at, look toward, pitch, dist, yaw off straight behind, her round (where she is), wake every lantern]
  const views = [
    ['well', 'well', 'door', 0.1, 12, 0, 0], ['well-out', [3, 2], 'out', 0.1, 10, 0, 0],
    ['hall', ['well', 'L1', 0.55], 'L1', 0.1, 9, 0, 1], ['L1', ['well', 'L1', 0.86], 'M2', 0.12, 11, 0, 1], ['L1-amber', 'L1', 'S', 0.1, 11, 0, 1], ['L1-amber-close', ['L1', 'S', 0.4], 'S', 0.06, 9, 0.35, 1],
    ['L1-veil', 'L1', 'M2', 0.1, 12, 0, 1], ['round1', 'seen1', 'spot1', 0.1, 9, 0, 0, false, true], ['round1-close', ['seen1', 'spot1', 0.35], 'spot1', 0.06, 8, 0.3, 0, false, true],
    ['E1-pool', 'E1', 'pool', 0.16, 12, 0, 1], ['E1-middle', 'E1', 'M2', 0.1, 12, 0, 1],
    ['grove', ['E2', 'spot2', 0.1], 'spot2', 0.14, 10, 0, 1], ['grove-close', ['E2', 'spot2', 0.55], 'spot2', 0.12, 7, 0.4, 1],
    ['E3-columns', 'E3', 'columns', 0.12, 12, 0, 2], ['pocket', 'E3', 'spot3', 0.1, 11, 0, 2], ['pocket-close', 'seen3', 'spot3', 0.06, 8, 0.3, 2],
    ['E4', 'E4', 'F', 0.12, 12, 0, 2], ['F', 'F', 'P', 0.1, 13, 0, 2], ['W4', 'W4', 'W3', 0.14, 12, 0, 2], ['W2', 'W2', [-14 + 12.56, 105.7], 0.12, 13, 0, 2], ['W1', 'W1', 'L1', 0.12, 12, 0, 2],
    ['M1', 'M1', 'M2', 0.12, 13, 0, 3], ['P', 'P', 'M1', 0.12, 13, 0, 3], ['S', ['L1|S', 'light', 1.6], 'light', 0.12, 9, 0, 3],
    ['lit-L1', ['well', 'L1', 0.86], 'M2', 0.12, 11, 0, 1, true], ['lit-E1', 'E1', 'pool', 0.16, 12, 0, 1, true], ['lit-E3', 'E3', 'spot3', 0.1, 11, 0, 2, true], ['lit-F', 'F', 'P', 0.1, 13, 0, 2, true],
  ];
  for (const [name, at, to, pitch, dist, off = 0, round = 0, lit = false, hidden = false] of views) {
    await run(([at, to, pitch, dist, off, round, lit, hidden]) => {
      const b = window.__bot, m = (p) => { if (typeof p === 'string') return p; if (p.length === 2) return p; const a = b.L.at[p[0]], c = b.L.at[p[1]]; return [a[0] + (c[0] - a[0]) * p[2], a[1] + (c[1] - a[1]) * p[2]]; };
      b.d.debugLight(lit);
      b.put(m(at), m(to), pitch, dist, off * b.L.side);
      if (b.d.round !== round || hidden) b.d.debugRound(round);
    }, [at, to, pitch, dist, off, round, lit, hidden]);
    await step(70);
    await shot(`in-${name}`);
  }
}


const state = () => run(() => { const b = window.__bot, d = b.d; return { at: b.here().map((v) => +v.toFixed(1)), cell: b.cell(), mode: window.__ow.mode(), round: d.round, play: d.play, her: d.she ? b.herCell() : null, toHer: d.she ? +b.toHer().toFixed(1) : -1, taken: d.taken, secs: Math.round(b.frames / 60) }; });
/** Tick until `fn` (in the page) says so; returns the frames it took, or -1. */
const until = (fn, max = 1200, arg) => run(([src, max, arg]) => { const f = new Function('arg', `return (${src})(arg)`), b = window.__bot; for (let i = 0; i < max; i++) { if (f(arg)) return i; b.tick(); } return f(arg) ? max : -1; }, [fn.toString(), max, arg]);
const cam = (pitch, dist) => run(([pitch, dist]) => { const o = window.__ow._orbit; o.pitch = pitch; o.targetDistance = dist; }, [pitch, dist]);

if (kinds.includes('quest')) {
  // By the ring: the first dungeon done and the giant lying by the second (as a save from there has it).
  await load('fresh=1');
  await run(() => { const ow = window.__ow; ow.firstDone(); ow.goToRing(1); ow.manual(true); ow.advance(120); const g = ow.gen().dungeons[1], b = ow._body; ow.lockInput(Math.atan2(b.pos.x - g.x, b.pos.z - g.z)); });
  await shot('q-00-ring');
  const open = await run(() => { const ow = window.__ow, r = ow.ring2(), g = ow.giant(), d = ow.gen().dungeons[1]; return { open: r.open, sealed: r.sealed, giant: g ? Math.round(Math.hypot(g.centre.x - d.x, g.centre.z - d.z)) : -1, dormant: g?.dormant }; });
  check('the second ring is open, the giant lying by it', open.open && !open.sealed && open.giant > 30 && open.giant < 140, JSON.stringify(open));
  await page.keyboard.down('KeyW');
  for (let f = 0; f < 500; f++) { await step(1); if (await run(() => window.__ow.ring2().busy)) break; }
  for (let f = 0; f < 5; f++) { await step(14); await shot(`q-01-take-${f}`); }
  await page.keyboard.up('KeyW');
  await run(bot);
  for (let f = 0; f < 6; f++) { await step(12); await shot(`q-02-down-${f}`); }
  await until(() => !window.__ow.cave().busy, 400);
  let st = await state();
  check('taken down into the cave, on foot, in the well; she is in the mouth of the way on, watching', st.cell === 'well' && st.mode === 'walk' && st.play === 'watch' && st.round === 0, JSON.stringify(st));
  await cam(0.12, 9);
  await step(20); await shot('q-03-eyes');
  // Look at her close, as she watches.
  await run(() => { const ow = window.__ow, m = ow.cave().she; ow.focusAt(m.pos.x, m.pos.y + 1.1, m.pos.z); ow.view(m.heading + 0.45, 0.06, 4.2); ow.advance(2); });
  await shot('q-03-eyes-close');
  await run(() => { window.__ow.focusAt(null); window.__ow._orbit.targetDistance = 9; });

  // She's off, but not far: she stops in sight, looks back for you, and comes back if you don't come.
  const gone = await until(() => window.__ow.cave().play === 'go', 400);
  check('she sets off by herself', gone >= 0, `after ${(gone / 60).toFixed(1)} s`);
  await until(() => window.__ow.cave().debug.waiting, 900);
  await run(() => window.__bot.tick(50));
  st = await state();
  const dbg = () => run(() => { const d = window.__ow.cave().debug; return { waiting: d.waiting, hidden: +d.hidden.toFixed(2), prints: d.prints, scars: d.scars, stalls: d.stalls }; });
  let dg = await dbg();
  check('she runs to just before the first veil, far ahead, and waits there looking back; her prints lead to her', st.play === 'go' && dg.waiting && st.her === 'L1' && st.toHer > 40 && dg.prints > 40, JSON.stringify({ ...st, ...dg }));
  await shot('q-04-looks-back');
  for (let f = 0; f < 3; f++) { await run(() => window.__bot.tick(24)); await shot(`q-04-bow-${f}`); }

  // On foot a veil is a wall: at the great one in the first cell with everything you have.
  await run(() => window.__bot.go('L1', { stop: 4, sprint: true }));
  await shot('q-05-first-cell');
  const wall = await run(() => {
    const b = window.__bot, L = b.L, v = L.veil('L1-M2'), m = [(v.ax + v.bx) / 2, (v.az + v.bz) / 2];
    b.key('KeyW', true); b.key('ShiftLeft', true);
    for (let f = 0; f < 200; f++) { b.aim('M2'); if (f % 40 === 30) b.key('Space', true); if (f % 40 === 36) b.key('Space', false); b.tick(); }
    b.up(); b.tick(20);
    const h = b.here();
    return { cell: b.cell(), fromVeil: +L.toVeil(v, h[0], h[1]).toFixed(2), side: +L.signed(v, h[0], h[1]).toFixed(2), m };
  });
  check('on foot a veil stops you (a run and jumps at it)', wall.cell === 'L1' && wall.side < 0 && wall.fromVeil < 1.6, JSON.stringify(wall));
  await shot('q-06-veil-stops-you');

  // Round 1: follow her. She waits short of the short veil until you're by her, then goes through it in front of you.
  await cam(0.14, 10);
  let r1 = await run(() => { const b = window.__bot; let brink = 99; const r = b.chase({ sprint: true, stop: 6, until: () => b.d.debug.scars > 0 || b.d.round > 0, each: () => { if (b.d.debug.waiting) brink = Math.min(brink, b.toHer()); } }); b.up(); return { ...r, brink: +brink.toFixed(1), round: b.d.round, play: b.d.play }; });
  check('she waits at the veil until you have her in sight, and goes through it', r1.ok && r1.round === 0 && (await state()).toHer < 48, JSON.stringify({ ...r1, ...(await state()) }));
  await shot('q-07-through-0');
  for (let f = 1; f < 4; f++) { await run(() => window.__bot.tick(16)); await shot(`q-07-through-${f}`); }
  await until(() => window.__ow.cave().play === 'hide', 300);
  await run(() => window.__bot.tick(40));
  st = await state(); dg = await dbg();
  check('she waits in the middle of the room beyond: her mark in the veil, her prints up to it, her room alight', st.play === 'hide' && st.her === 'E1' && (await run(() => window.__bot.L.at.E1.map((v, i) => Math.abs(v - window.__bot.her()[i]) < 0.5).every(Boolean))) && st.round === 0 && dg.scars === 1 && dg.prints > 12 && dg.hidden > 0.85 && (await run(() => { const L = window.__bot.L, p = L.at.spot1; return !L.caps.some((c) => Math.hypot(c.x - p[0], c.z - p[1]) < 5); })), JSON.stringify({ ...st, ...dg }));
  await shot('q-07-glow-behind');
  await run(() => { const b = window.__bot; b.put('seen1', 'spot1', 0.1, 9); b.tick(40); });
  await shot('q-07-glow-behind-square');
  // Round its end by the gap, and up to her.
  r1 = await run(() => { const b = window.__bot; const r = b.chase({ sprint: true, stop: 0.5, max: 40, until: () => b.d.round > 0 || b.d.play === 'found' }); return { ...r, play: b.d.play }; });
  check('round 1: the moment you are in the doorway she is off to the next veil (no heart)', r1.play !== 'found' && (await state()).round === 1 && (await state()).toHer > 12, JSON.stringify(r1));
  for (let f = 0; f < 4; f++) { await run(() => window.__bot.tick(24)); await shot(`q-08-found1-${f}`); }

  // Round 2: on after her round the second veil's end. She waits in the middle of that room until you're in its doorway.
  const w2 = await run(() => { const b = window.__bot; let waited = 0; const r = b.chase({ sprint: true, stop: 7, max: 120, until: () => b.d.round >= 1 && b.herCell() === 'E2', each: () => { if (b.d.debug.waiting) waited++; } }); return { ...r, waited }; });
  st = await state();
  check('at the second veil she runs straight through, no stopping to look, into the room beyond', w2.ok && st.round >= 1 && st.her === 'E2' && w2.waited === 0, JSON.stringify({ ...w2, ...st }));
  await run(() => window.__bot.tick(40));
  await shot('q-09-second-veil');
  // Round 3: in its doorway you see her run to the wall of the shut cell beside it, look back, and go in; and her head
  // comes straight back out through the stone where she went, and stays until you come up to her.
  await cam(0.14, 10);
  const w3 = await run(() => { const b = window.__bot; let shown = 0; const r = b.chase({ sprint: true, stop: 22, max: 120, until: () => b.d.round === 2 && b.d.debug.scars > 0, each: () => { shown = Math.max(shown, b.d.debug.scars); } }); b.up(); for (let f = 0; f < 300 && b.d.play !== 'peek'; f++) b.tick(); b.tick(30); return { ...r, marks: shown }; });
  st = await state(); dg = await dbg();
  check('two veils\' ends on, she goes into the wall in front of you and her head comes back out of it', w3.ok && st.round === 2 && st.cell === 'E2' && st.her === 'M1' && st.toHer > 9 && st.toHer < 40 && w3.marks >= 1 && dg.prints > 10, JSON.stringify({ ...w3, ...st, ...dg }));
  await shot('q-12-pocket');
  await run(() => window.__bot.tick(300));
  check('she stays so, looking at you, until you come up to her', (await state()).play === 'peek', JSON.stringify(await state()));
  await shot('q-12-pocket-waits');
  // Come up to her and she draws her head in and is off inside the shut cells: out again a room further round, twice.
  for (const [n, room, shut] of [[1, 'E3', 'P'], [2, 'E4', 'P']]) {
    const nx = await run((n) => { const b = window.__bot; const r = b.chase({ stop: 3, max: 30, until: () => b.d.debug.peekN === n }); b.up(); let f = 0; for (; f < 600 && b.d.play !== 'peek'; f++) b.tick(); b.tick(30); return { ...r, secs2: +(f / 60).toFixed(1), play: b.d.play, round: b.d.round, peekCell: b.d.debug.peekCell, her: b.herCell(), cell: b.cell() }; }, n);
    check(`come up to her: not yet! her head goes in, and comes out of the wall of the next room round (${room})`, nx.ok && nx.play === 'peek' && nx.round === 2 && nx.peekCell === room && nx.her === shut, JSON.stringify(nx));
    const go = await run((room) => { const b = window.__bot; const r = b.chase({ sprint: true, stop: 16, max: 60, until: () => b.cell() === room && b.toHer() < 22 }); b.tick(20); return { ...r, play: b.d.play, toHer: +b.toHer().toFixed(1) }; }, room);
    check(`round one more veil's end and there she is, her head out of the wall`, go.ok && go.play === 'peek', JSON.stringify(go));
    await shot(`q-12-peek-${n}`);
  }
  // The second lap: come up to her there and she comes out of the wall and away through the next veil; two more
  // rooms; into the wall again, her head out; once more a room on; and there she comes out for good.
  const lap = await run(() => { const b = window.__bot; const a = b.chase({ stop: 3, max: 30, until: () => b.d.debug.lap > 0 }); const out = b.herCell(); const r = b.chase({ sprint: true, stop: 16, max: 180, until: () => b.d.debug.peekN === 3 && b.d.play === 'peek' && b.cell() === 'W4' && b.toHer() < 24 }); b.up(); b.tick(30); return { a: a.ok, out, ...r, cell: b.cell(), her: b.herCell(), lap: b.d.debug.lap, round: b.d.round, scars: b.d.debug.scars, prints: b.d.debug.prints }; });
  check('come up to her the third time: she comes out of the wall and leads on through two more rooms, then into a wall again, her head out', lap.a && lap.ok && lap.cell === 'W4' && lap.her === 'P' && lap.lap === 0 && lap.round === 2 && lap.scars >= 1 && lap.prints > 5, JSON.stringify(lap));
  await shot('q-12-lap2-peek');
  const last = await run(() => { const b = window.__bot; const a = b.chase({ stop: 3, max: 30, until: () => b.d.debug.peekN === 4 }); const r = b.chase({ sprint: true, stop: 16, max: 60, until: () => b.d.play === 'peek' && b.cell() === 'W3' && b.toHer() < 24 }); b.up(); b.tick(20); return { a: a.ok, ...r, play: b.d.play, round: b.d.round }; });
  check('and once more a room on (W3): her head out of the wall, not yet yours', last.a && last.ok && last.play === 'peek' && last.round === 2, JSON.stringify(last));
  const end = await run(() => { const b = window.__bot; const a = b.chase({ stop: 3, max: 30, until: () => b.d.debug.last }); const r = b.chase({ sprint: true, stop: 14, max: 60, until: () => b.d.play === 'hide' && b.cell() === 'W2' && b.toHer() < 20 }); b.up(); const at = b.her(); b.tick(360); const now = b.her(); return { a: a.ok, ...r, play: b.d.play, round: b.d.round, her: b.herCell(), moved: +Math.hypot(now[0] - at[0], now[1] - at[1]).toFixed(2), mid: +Math.hypot(now[0] - b.L.at.W2[0], now[1] - b.L.at.W2[1]).toFixed(1), toHer: +b.toHer().toFixed(1) }; });
  check('the last time she is out and through one more veil, and in the room beyond she is waiting in the middle of it and does not run', end.a && end.ok && end.play === 'hide' && end.round === 2 && end.her === 'W2' && end.moved < 0.1 && end.mid < 1, JSON.stringify(end));
  await shot('q-12-waiting');
  // Come near and she plays, before she's yours: up to you, away again, and once right round you.
  await run(() => { const b = window.__bot; b.chase({ stop: 3, max: 20, until: () => b.d.play === 'tease' }); b.up(); window.__tease = { me: b.here(), near: 99, far: 0, after: 99, turn: 0, was: null, can: false, f: 0 }; });
  await cam(0.3, 13);
  let tease;
  for (let n = 0; n < 16; n++) {
    tease = await run(() => { const b = window.__bot, o = window.__tease; for (let i = 0; i < 24 && b.d.play === 'tease'; i++, o.f++) { b.tick(); const h = b.her(), d = b.toHer(); o.can = o.can || b.d.mountable; if (o.f < 95) o.near = Math.min(o.near, d); else if (o.f < 171) o.far = Math.max(o.far, d); const a = Math.atan2(h[1] - o.me[1], h[0] - o.me[0]); if (o.f > 170 && o.was !== null) o.turn += Math.atan2(Math.sin(a - o.was), Math.cos(a - o.was)); o.was = a; o.after = d; } return { play: b.d.play, round: b.d.round, s: +(o.f / 60).toFixed(1), near: +o.near.toFixed(1), far: +o.far.toFixed(1), turn: +Math.abs(o.turn).toFixed(2), after: +o.after.toFixed(1), can: o.can }; });
    if (tease.play !== 'tease') break;
    await shot(`q-12-tease-${String(n).padStart(2, '0')}`);
  }
  check('come near and she plays first: up to you, away again, once right round you and in', tease.play === 'yours' && tease.round === 3 && tease.near < 3.2 && tease.far > 6 && tease.turn > 5.5 && tease.after < 3.2 && !tease.can && tease.s < 7, JSON.stringify(tease));
  const hearts = await run(() => { const b = window.__bot; let before = 0; b.chase({ stop: 3, max: 30, until: () => b.d.play === 'yours' && b.d.debug.glad > 0, each: () => { before = Math.max(before, b.d.debug.heart); } }); b.up(); let hop = 0, heart = 0; for (let f = 0; f < 70; f++) { b.tick(); hop = Math.max(hop, b.d.she.hop ?? 0); heart = Math.max(heart, b.d.debug.heart); } return { before, hop: +hop.toFixed(2), heart: +heart.toFixed(2), mountable: b.d.mountable }; });
  check('she comes out: then, and only then, a heart over her and she bounces about', hearts.before === 0 && hearts.hop > 0.4 && hearts.heart > 0.8 && !hearts.mountable, JSON.stringify(hearts));
  await shot('q-13-heart');
  await cam(0.08, 7);
  for (let f = 0; f < 4; f++) { await run(() => window.__bot.tick(30)); await shot(`q-13-out-${f}`); }
  await until(() => window.__ow.cave().play === 'yours' && window.__ow.cave().mountable && window.__ow.cave().debug.pose.crouch > 0.93, 900);
  st = await state();
  const offered = await run(() => { const d = window.__ow.cave(); return { mountable: d.mountable, saddled: d.she.stabled, crouch: +d.debug.pose.crouch.toFixed(2) }; });
  check('round 3: her head through the stone, then out, down on her legs, saddled: she offers her back', st.round === 3 && st.play === 'yours' && st.her === 'W2' && offered.mountable && offered.saddled && offered.crouch > 0.9, JSON.stringify({ ...st, ...offered }));
  await run(() => window.__bot.tick(30)); await shot('q-14-offer-0');
  await run(() => { const ow = window.__ow, m = ow.cave().she; ow.focusAt(m.pos.x, m.pos.y + 0.9, m.pos.z); ow.view(m.heading + 0.9, 0.12, 5); ow.advance(2); });
  await shot('q-14-offer-close');
  await run(() => { window.__ow.focusAt(null); window.__ow._orbit.targetDistance = 9; window.__ow.advance(2); });
  const footSecs = st.secs;

  // Up on to her.
  const up = await run(() => window.__bot.mount());
  check('E by her gets you on', up.mode === 'ride', JSON.stringify(up));
  await cam(0.14, 9);
  await step(30); await shot('q-15-riding');

  // A dash at rock costs nothing: she pulls up short and shakes her head.
  const rock = await run(() => {
    window.__bot.walk('E3', false);
    const b = window.__bot, L = b.L, ow = window.__ow, c = L.at.E3, m = L.at.M1, dl = Math.hypot(c[0] - m[0], c[1] - m[1]), u = [(c[0] - m[0]) / dl, (c[1] - m[1]) / dl];
    // Out toward the cave's wall, between the columns and the gap.
    const a = Math.atan2(u[1], u[0]) + 0.55 * L.side, dir = [Math.cos(a), Math.sin(a)], wall = L.rockAhead(c[0], c[1], dir[0], dir[1], 40);
    const from = [c[0] + dir[0] * (wall - 9), c[1] + dir[1] * (wall - 9)], to = [c[0] + dir[0] * (wall + 6), c[1] + dir[1] * (wall + 6)];
    b.go(from, { stop: 1.5, max: 20 });
    b.key('KeyW', true);
    let shook = 0;
    for (let f = 0; f < 90; f++) { b.aim(to); if (f === 20) b.key('Space', true); if (f === 24) b.key('Space', false); b.tick(); shook = Math.max(shook, b.d.debug.pose.shake); if (f === 30) window.__shake = true; }
    b.up(); b.tick(30);
    const h = b.here();
    return { shook: +shook.toFixed(2), phase: ow.gallop().phase, cell: b.cell(), fromRock: +(-L.sdf(h[0], h[1])).toFixed(2), mode: ow.mode() };
  });
  check('Space at rock: no dash, a shake of the head, and she is not in the rock', rock.shook > 0.5 && rock.phase === 0 && rock.cell === 'E3' && rock.fromRock > 0.3 && rock.mode === 'ride', JSON.stringify(rock));
  await shot('q-16-rock');

  // The ride. Into the pocket she showed you; three veils in a row down the middle; out into the first cell.
  const rideFrom = (await state()).secs;
  const hidden = [];
  for (const [from, to] of [['E3', 'P'], ['P', 'M1'], ['M1', 'M2'], ['M2', 'L1']]) {
    await run((f) => { window.__hid = 0; window.__near = 99; window.__seen = false; void f; });
    const r = await run(([from, to]) => {
      const b = window.__bot, ow = window.__ow, L = b.L;
      return b.dash(from, to, { each: () => {
        // Is she hidden from the camera by a veil with no hole in it?
        const c = b.plan(ow._cam.position), h = b.here(), v = L.firstVeil(c[0], c[1], h[0], h[1]);
        if (v) { const p = b.d.debug.pass.find((o) => o.id === v.v.id); if (!p || p.r < 1.2) window.__hid++; }
        window.__near = Math.min(window.__near, ow._cam.position.distanceTo(ow._body.pos));
      } });
    }, [from, to]);
    const cams = await run(() => ({ hiddenFrames: window.__hid, nearest: +window.__near.toFixed(1) }));
    hidden.push(cams.hiddenFrames);
    check(`dash through the veil ${from} | ${to}`, r.ok && r.mode === 'ride' && cams.hiddenFrames <= 2 && cams.nearest > 3, JSON.stringify({ ...r, ...cams }));
    await shot(`q-17-in-${to}`);
  }
  const rideSecs = (await state()).secs - rideFrom;
  // The amber veil: through it, and the light is still ahead (a dash doesn't take it).
  const amber = await run(() => {
    const b = window.__bot, ow = window.__ow, L = b.L;
    let end = null;
    // (Where the dash itself leaves her: the frame her phase runs out.)
    const r = b.dash('L1', 'S', { each: (_f, pressed) => { if (pressed >= 0 && !end && ow.gallop().phase === 0 && b.cell() === 'S') { const h = b.here(); end = { taken: b.d.taken, pastVeil: +L.signed(L.veil('amber'), h[0], h[1]).toFixed(1), toLight: +b.far('light').toFixed(1) }; } } });
    return { ...r, end };
  });
  check('dash through the amber veil: it sets her down past the veil with the light still ahead', amber.ok && amber.cell === 'S' && !!amber.end && !amber.end.taken && amber.end.toLight > 2.5, JSON.stringify(amber));
  await step(20); await shot('q-18-sanctum');
  await run(() => { const b = window.__bot; b.go('light', { stop: 1.2, max: 6, until: () => b.d.taken }); });
  st = await state();
  check('the light is taken', st.taken, JSON.stringify(st));
  // The gladness, then the cut; and the ring's arms lift you out on the surface, as from dungeon 1.
  const t0 = st.secs;
  for (let f = 0; f < 6; f++) { await run(() => window.__bot.tick(40)); await shot(`q-19-glad-${f}`); }
  let moved = 0;
  await run(() => window.__bot.key('KeyA', true));
  for (let f = 0; f < 10 && (await run(() => window.__ow.cave().inside)); f++) await run(() => { const b = window.__bot; for (let i = 0; i < 10 && b.d.inside; i++) b.tick(); });
  const lifted = await run(() => ({ inside: window.__ow.cave().inside, mode: window.__ow.mode(), ring: window.__ow.ring2().busy }));
  check('taken up by the ring: carried, out of the ground', !lifted.inside && lifted.mode === 'carried' && lifted.ring, JSON.stringify(lifted));
  for (let f = 0; f < 14 && (await run(() => window.__ow.ring2().busy)); f++) { await shot(`q-20-out-${String(f).padStart(2, '0')}`); await run(() => window.__bot.tick(10)); }
  await run(() => window.__bot.up());
  await run(() => window.__bot.tick(30));
  const out = await run(() => { const ow = window.__ow, g = ow.gen().dungeons[1], p = ow._body.pos, m = ow.riding(); return { inside: ow.cave().inside, mode: ow.mode(), on: m?.species.name, fromRing: +Math.hypot(p.x - g.x, p.z - g.z).toFixed(1), above: +(p.y - ow.height(p.x, p.z)).toFixed(1) }; });
  check('carried out: on the surface in the ring, on the glimmer', out.inside === false && out.mode === 'ride' && out.on === 'glimmer' && out.fromRing < 8 && Math.abs(out.above) < 1.5, JSON.stringify(out));
  await shot('q-21-surface');
  void moved;

  // Above: the ring shuts into a shrine (a glimmer in stone), a crow takes the light to the giant, it smiles. Hands off, about 20 s.
  const from = await run(() => window.__ow._body.pos.toArray());
  await run(() => window.__bot.key('KeyW', true));
  const offer = () => run(() => { const ow = window.__ow, o = ow.offering2(), g = ow.giant(), p = ow._body.pos; return { state: o.state, busy: o.busy, clock: +o.clock.toFixed(1), mode: ow.mode(), sealed: ow.ring2().sealed, sealK: +ow.ring2().sealK.toFixed(2), mouth: g?.mouth, grin: g ? +g.grin.toFixed(2) : -1, awake: g?.awake, walking: g?.walking, p: [p.x, p.z] }; });
  let o, secs = 0, far = 0, mouth = false, k = 0;
  for (; secs < 40; secs += 1.5) {
    await run(() => window.__bot.tick(90));
    o = await offer();
    // (You get down and walk to the shrine by yourself: from then on, nothing moves you.)
    if (o.state === 'held') { from[0] = o.p[0]; from[2] = o.p[1]; }
    else if (o.busy) far = Math.max(far, Math.hypot(o.p[0] - from[0], o.p[1] - from[2]));
    mouth = mouth || o.mouth > 0;
    await shot(`q-22-offer-${String(k++).padStart(2, '0')}`);
    if (o.state === 'given' && !o.busy) break;
  }
  await run(() => window.__bot.up());
  check('the second ring shut into a shrine and the giant has the light: awake, smiling, its mouth shut', o.state === 'given' && !o.busy && o.sealed && o.sealK >= 1 && o.awake && o.grin > 0.4 && o.mouth === 0 && mouth, JSON.stringify(o));
  check('hands off all through, and it took about 20 s', far < 0.4 && secs + 1.5 >= 16 && secs + 1.5 <= 25, `moved ${far.toFixed(2)} m with W held; ${secs + 1.5} s from coming up (in steps of 1.5)`);
  await run(() => window.__bot.tick(240));
  o = await offer();
  check('the giant does not walk on; you have your hands back, on foot by the shrine', !o.walking && !o.busy && o.mode === 'walk', JSON.stringify(o));
  await shot('q-23-after');
  // Ride off and back over what was the field: it doesn't take you; nor on foot.
  const shut = await run(() => { const ow = window.__ow, b = window.__bot, g = ow.gen().dungeons[1]; b.key('KeyE', true); b.tick(2); b.key('KeyE', false); b.tick(40); const p = ow._body.pos; ow.lockInput(Math.atan2(p.x - g.x, p.z - g.z) + 0.6); b.key('KeyW', true); b.tick(160); ow.lockInput(Math.atan2(p.x - g.x, p.z - g.z) - 2.4); b.tick(160); b.up(); b.tick(60); return { mode: ow.mode(), inside: ow.cave().inside, ring: ow.ring2().busy }; });
  check('the second ring does not take you again', shut.mode === 'walk' && !shut.inside && !shut.ring, JSON.stringify(shut));
  console.log(`played in ${st.secs} s of game time below: ${footSecs} s on foot to getting her (a beeline that knows the way, running), ${rideSecs} s for the four veils of the ride (the going between them included); the ending above ${secs + 1.5} s`);
  void t0; void hidden;
}

if (kinds.includes('dash')) {
  // A dash through a veil with every frame drawn: the camera's part in it.
  await load('dungeon=2&fresh=1');
  await run(() => { const ow = window.__ow, b = window.__bot; ow.manual(true); b.put('E3', 'P'); b.tick(5); b.d.debugYours(); b.tick(40); });
  const up = await run(() => window.__bot.mount());
  check('on her', up.mode === 'ride', JSON.stringify(up));
  for (const [from, to, yawOff] of [['E3', 'P', 0], ['P', 'M1', 0.9]]) {
    await run(([from, to]) => window.__bot.go(window.__bot.L.at[`${from}|${to}`], { stop: 1.4, max: 30 }), [from, to]);
    // (The second with the camera swung round to one side, as it is after a turn.)
    await run(([from, to, yawOff]) => {
      const b = window.__bot, ow = window.__ow, end = b.L.at[`${to}|${from}`];
      b.aim(end);
      const o = ow._orbit; b.tick(1);
      const d = b.d, w = d.world(end[0], 0, end[1]), p = ow._body.pos;
      o.yaw = Math.atan2(-(w.x - p.x), -(w.z - p.z)) + yawOff; o.snap?.();
      window.__dash = { end, f: 0, pressed: -1, yawOff };
      b.key('KeyW', true); b.key('ShiftLeft', true);
    }, [from, to, yawOff]);
    const rows = [];
    for (let f = 0; f < 70; f++) {
      const r = await run(() => {
        const b = window.__bot, ow = window.__ow, D = window.__dash, L = b.L, d = b.d;
        // (Steering, with the camera left where it is.)
        const w = d.world(D.end[0], 0, D.end[1]), p = ow._body.pos;
        ow.lockInput(Math.atan2(-(w.x - p.x), -(w.z - p.z)));
        const h = b.here(), v = L.firstVeil(h[0], h[1], D.end[0], D.end[1]);
        const gap = v ? v.t * Math.hypot(D.end[0] - h[0], D.end[1] - h[1]) : -1;
        if (D.pressed < 0 && v && gap < 4.5 && D.f > 8) { b.key('Space', true); D.pressed = D.f; }
        if (D.pressed >= 0 && D.f > D.pressed + 3) b.key('Space', false);
        b.tick();
        D.f++;
        const c = b.plan(ow._cam.position), h2 = b.here(), between = L.firstVeil(c[0], c[1], h2[0], h2[1]);
        const pass = d.debug.pass[0];
        return { f: D.f, pressed: D.pressed, phase: +ow.gallop().phase.toFixed(2), cell: b.cell(), camDist: +ow._cam.position.distanceTo(ow._body.pos).toFixed(2), between: between ? between.v.id : '', hole: pass ? +pass.r.toFixed(2) : 0, camK: +d.debug.camK.toFixed(2) };
      });
      rows.push(r);
      if (r.pressed >= 0 && r.f >= r.pressed - 2 && r.f <= r.pressed + 44 && (r.f - r.pressed) % 3 === 0) await shot(`dash-${from}-${to}-${String(r.f - r.pressed + 2).padStart(2, '0')}`);
    }
    await run(() => { const b = window.__bot; b.up(); b.tick(30); });
    const pressed = rows.find((r) => r.pressed >= 0)?.pressed ?? -1, after = rows.filter((r) => r.f > pressed);
    const hiddenFrames = after.filter((r) => r.between && r.hole < 1.2).length, jumps = after.slice(1).map((r, i) => Math.abs(r.camDist - after[i].camDist));
    const st = await state();
    console.log(`  ${from} -> ${to}: camera distance by frame from the press: ${after.slice(0, 40).map((r) => r.camDist.toFixed(1)).join(' ')}`);
    console.log(`  veil between camera and you (frames ${after.filter((r) => r.between).map((r) => r.f - pressed).join(',')}); hole radius then: ${after.filter((r) => r.between).map((r) => r.hole).join(' ')}`);
    check(`${from} -> ${to}${yawOff ? ' (camera to one side)' : ''}: through, never hidden behind the veil, and the camera never jumps`, st.cell === to && hiddenFrames <= 1 && Math.max(...jumps) < 1.2 && Math.min(...after.map((r) => r.camDist)) > 3.5, JSON.stringify({ cell: st.cell, hiddenFrames, biggestJump: +Math.max(...jumps).toFixed(2), nearest: Math.min(...after.map((r) => r.camDist)), farthest: Math.max(...after.map((r) => r.camDist)) }));
  }
  // Stopping just past a veil with the camera still behind it: it is drawn through, and the hole shuts.
  const lag = await run(() => {
    const b = window.__bot, ow = window.__ow, L = b.L;
    const start = L.at['M1|M2'], end = L.at['M2|M1'];
    b.go(start, { stop: 1.4, max: 30 });
    b.key('KeyW', true); b.key('ShiftLeft', true);
    let pressed = -1, crossed = -1;
    for (let f = 0; f < 200; f++) {
      b.aim(end);
      const h = b.here(), v = L.firstVeil(h[0], h[1], end[0], end[1]);
      if (pressed < 0 && v && v.t * Math.hypot(end[0] - h[0], end[1] - h[1]) < 4.5 && f > 6) { b.key('Space', true); pressed = f; }
      if (pressed >= 0 && f > pressed + 3) b.key('Space', false);
      b.tick();
      // Pull up the moment she's through.
      if (crossed < 0 && b.cell() === 'M2') { crossed = f; b.key('KeyW', false); b.key('ShiftLeft', false); b.key('KeyS', true); }
      if (crossed >= 0 && f > crossed + 20) b.key('KeyS', false);
      if (crossed >= 0 && f > crossed + 200) break;
    }
    b.up(); b.key('KeyS', false); b.tick(150);
    const c = b.plan(ow._cam.position), h = b.here();
    return { cell: b.cell(), between: !!L.firstVeil(c[0], c[1], h[0], h[1]), pass: b.d.debug.pass.length, fromVeil: +L.toVeil(L.veil('M2-M1'), h[0], h[1]).toFixed(1), camDist: +ow._cam.position.distanceTo(ow._body.pos).toFixed(1) };
  });
  check('pulled up just past a veil: the camera comes through after you and the hole shuts', lag.cell === 'M2' && !lag.between && lag.pass === 0, JSON.stringify(lag));
  await shot('dash-pulled-up');
}

if (kinds.includes('stall')) {
  await load('dungeon=2&fresh=1');
  await run(() => window.__ow.manual(true));
  // Standing still in the well: she runs to the first veil and waits there. She doesn't come back; her prints are the way.
  await until(() => window.__ow.cave().debug.waiting, 1200);
  await run(() => window.__bot.tick(1800));
  let st = await state(), secs = 0;
  const d0 = await run(() => { const d = window.__ow.cave().debug; return { waiting: d.waiting, prints: d.prints, scars: d.scars }; });
  check('stand still for half a minute: she is still waiting at the first veil, her prints alight all the way', st.play === 'go' && d0.waiting && st.her === 'L1' && d0.prints > 40 && d0.scars === 0, JSON.stringify({ ...st, ...d0 }));
  await shot('stall-1-waits-at-the-veil');
  // Come into sight of her and stop: she goes through and waits in the middle of the next room, however long.
  await run(() => { const b = window.__bot; b.chase({ sprint: true, stop: 20, until: () => b.d.debug.scars > 0 }); b.up(); b.tick(1200); });
  st = await state();
  check('stop short of the doorway: she waits in the next room, not found, not back', st.play === 'hide' && st.round === 0 && st.her === 'E1' && st.cell === 'L1', JSON.stringify(st));
  await shot('stall-2-waits-in-the-room');
  // The wrong way round the ring: she still waits; and coming back to her doorway carries on.
  const got = await run(() => { const b = window.__bot; b.walk('W1', false, { sprint: true }); const away = b.d.play; const r = b.chase({ sprint: true, stop: 0.5, max: 300, until: () => b.d.round >= 2 }); return { away, ...r, round: b.d.round }; });
  check('off the wrong way and back: she waited, and following her prints gets to her head out of the wall', got.away === 'hide' && got.round === 2, JSON.stringify(got));
  await run(() => { const b = window.__bot; b.d.debugYours(); b.tick(40); });
  // Yours, and left behind: she comes after you.
  await run(() => { const b = window.__bot; b.put('F', 'P'); });
  secs = await until(() => { const b = window.__bot; return b.d.play === 'yours' && b.toHer() < 6; }, 2400);
  check('walk off and she follows', secs >= 0, `${(secs / 60).toFixed(0)} s to catch you up half the cave away`);
  // Get off her inside a shut cell: she is still there to get back on.
  const inP = await run(() => { const b = window.__bot, ow = window.__ow; b.mount(); const r = b.dash('F', 'P'); b.key('KeyE', true); b.tick(2); b.key('KeyE', false); b.tick(60); const off = ow.mode(); const m = b.mount(); return { r, off, on: m.mode, cell: b.cell() }; });
  check('off her inside the pocket and on again', inP.r.ok && inP.off === 'walk' && inP.on === 'ride' && inP.cell === 'P', JSON.stringify(inP));
}

if (kinds.includes('reload')) {
  const q = 'story=0&t=10';
  const again = async (extra = '') => { await page.goto(`${base()}&${q}${extra}`); await ready(); await run(() => window.__ow.manual(true)); };
  // 1. Before she is found (she has hidden, nothing won): a reload starts the game over from her watching.
  await load('dungeon=2&fresh=1');
  await run(() => window.__ow.manual(true));
  await until(() => window.__ow.cave().play === 'go', 1200);
  await run(() => window.__bot.tick(120));
  await again('&dungeon=2');
  let st = await state();
  check('reload before she is found: round 0, she watches you again', st.round === 0 && (st.play === 'watch' || st.play === 'go'), JSON.stringify(st));
  // 2. Found once: a reload has her hiding in the grove.
  await run(() => { const b = window.__bot; b.d.debugRound(0); b.chase({ sprint: true, stop: 0.5, max: 90, until: () => b.d.play === 'found' || b.d.round > 0 }); });
  await until(() => window.__ow.cave().round === 1, 600);
  await again('&dungeon=2');
  st = await state();
  check('reload after round 1: she is in the mouth of the way on again, to lead you to the grove', st.round === 1 && (st.play === 'watch' || st.play === 'go') && st.her === 'hall', JSON.stringify(st));
  // 3. Riding: a reload has her yours, waiting by the mark in the well, to be got on.
  await run(() => { const b = window.__bot; b.d.debugYours(); b.tick(30); b.mount(); b.tick(60); });
  await again('&dungeon=2');
  st = await state();
  const on = await run(() => { const b = window.__bot; b.tick(30); const m = b.mount(); return { mode: m.mode, saddled: b.d.she.stabled, toWell: +b.far('well').toFixed(1) }; });
  check('reload while riding: she is yours, by the mark in the well, and E gets you on', st.round === 3 && st.play === 'yours' && st.her === 'well' && on.mode === 'ride' && on.saddled, JSON.stringify({ ...st, ...on }));
  await shot('reload-3-yours');
  // 4. After the light: by the shrine on the glimmer with it, and the ending plays.
  await run(() => { window.__ow.winDungeon(2); window.__ow.advance(30); });
  await again();
  let o = await run(() => { const ow = window.__ow, of = ow.offering2(), g = ow.gen().dungeons[1], p = ow._body.pos; ow.advance(20); return { won: ow.ring2().sealed, state: of.state, mode: ow.mode(), on: ow.riding()?.species.name, fromRing: +Math.hypot(p.x - g.x, p.z - g.z).toFixed(1), cave: !!ow.cave() }; });
  check('reload after the light: by the shrine on the glimmer, the ring shut, the light still yours to give', o.won && (o.state === 'held' || o.state === 'placed') && o.mode === 'ride' && o.on === 'glimmer' && o.fromRing < 8, JSON.stringify(o));
  await shot('reload-4-shrine');
  const end = await until(() => window.__ow.offering2().state === 'given' && !window.__ow.offering2().busy, 2400);
  check('and the ending plays from there', end >= 0, `${(end / 60).toFixed(0)} s`);
  // 5. After the ending (the giant up and gone: outside the story that is a few seconds after the smile): nothing
  // replays; the giant is asleep by the third ring, the glimmer waits by the second.
  await until(() => window.__ow.homecoming2().left, 1200);
  await again();
  o = await run(() => { const ow = window.__ow; ow.advance(120); const of = ow.offering2(), g = ow.giant(), s = ow.gen().dungeons[1], s3 = ow.gen().dungeons[2]; const gl = ow._mobs?.tamed?.find((m) => m.species.name === 'glimmer'); return { state: of.state, busy: of.busy, sealed: ow.ring2().sealed, open: ow.ring2().open, awake: g?.awake, dormant: g?.dormant, by3: g ? Math.round(Math.hypot(g.centre.x - s3.x, g.centre.z - s3.z)) : -1, walking: g?.walking, glimmer: gl ? +Math.hypot(gl.pos.x - s.x, gl.pos.z - s.z).toFixed(0) : -1, mode: ow.mode() }; });
  check('reload after the ending: nothing replays; the ring is a shrine, the giant asleep by the third ring, the glimmer waiting by the second', o.state === 'given' && !o.busy && o.sealed && !o.open && !o.awake && o.dormant && o.by3 > 30 && o.by3 < 140 && !o.walking && o.glimmer >= 0 && o.glimmer < 40, JSON.stringify(o));
  await run(() => { window.__ow.goToRing(1); window.__ow.advance(60); });
  await shot('reload-5-after');
}

if (kinds.includes('story')) {
  // In the story: the checkpoint at the second ring, and the one after its dungeon.
  await page.goto(`${base()}&fresh=1&cp=ring2`); await ready();
  let o = await run(() => { const ow = window.__ow; ow.manual(true); ow.advance(60); const r = ow.ring2(), g = ow.giant(), d = ow.gen().dungeons[1], p = ow._body.pos, v = ow.village(); return { open: r.open, giant: g ? Math.round(Math.hypot(g.centre.x - d.x, g.centre.z - d.z)) : -1, fromRing: Math.round(Math.hypot(p.x - d.x, p.z - d.z)), first: ow.ring().sealed, home: v ? v.taken.map((t) => (t ? 0 : 1)).join('') : null, story: !!ow.story() }; });
  check('cp=ring2: by the second ring, open, the giant asleep by it; the first ring a shrine; one spirit home', o.story && o.open && o.first && o.fromRing < 40 && o.giant > 30 && o.giant < 140 && o.home !== null && o.home.split('1').length - 1 === 1, JSON.stringify(o));
  await shot('story-ring2');
  await run(() => { const ow = window.__ow, g = ow.gen().dungeons[1], b = ow._body; ow.lockInput(Math.atan2(b.pos.x - g.x, b.pos.z - g.z)); });
  await page.keyboard.down('KeyW');
  let took = -1;
  for (let f = 0; f < 700; f++) { await step(1); if (await run(() => !!window.__ow.cave()?.inside)) { took = f; break; } }
  await page.keyboard.up('KeyW');
  check('walking on to its field takes you down', took >= 0, `after ${took} frames`);
  await page.goto(`${base()}&fresh=1&cp=offer2`); await ready();
  await run(() => window.__ow.manual(true));
  const end = await until(() => window.__ow.offering2().state === 'given' && !window.__ow.offering2().busy, 2400);
  // (And what follows it: the second homecoming, to the giant on its feet. Under its veil the land needs real time.)
  for (let i = 0; i < 1500 && !(await run(() => window.__ow.homecoming2().state === 'done')); i++) { await run(() => window.__ow.advance(window.__ow.homecoming2().waiting ? 3 : 30)); await page.waitForTimeout(60); }
  o = await run(() => { const ow = window.__ow, v = ow.village(), c = ow.visit()?.crows; ow.advance(30); return { home: v ? v.taken.map((t) => (t ? 0 : 1)).join('') : null, lights: c ? c.birds.map((b) => (b.light ? 1 : 0)).join('') : null, mode: ow.mode(), on: ow.riding()?.species.name }; });
  check('cp=offer2: the ending plays, and a second spirit is home (its crow carries nothing)', end >= 0 && o.home !== null && o.home.startsWith('11') && o.home.split('1').length - 1 === 2 && o.lights.startsWith('00'), `${(end / 60).toFixed(0)} s; ${JSON.stringify(o)}`);
  await shot('story-offer2');
  // (cp was dropped from the address when it loaded: this reload is the save.)
  await page.goto(await run(() => location.href)); await ready();
  o = await run(() => { const ow = window.__ow; ow.manual(true); ow.advance(60); const v = ow.village(), c = ow.visit()?.crows; return { home: v ? v.taken.map((t) => (t ? 0 : 1)).join('') : null, lights: c ? c.birds.map((b) => (b.light ? 1 : 0)).join('') : null, state: ow.offering2().state, busy: ow.offering2().busy }; });
  check('and a reload finds the two of them home, nothing replayed', o.home !== null && o.home.startsWith('11') && o.lights.startsWith('00') && o.state === 'given' && !o.busy, JSON.stringify(o));
}

if (kinds.includes('home2')) {
  const sandbox = args.includes('sandbox');
  if (sandbox) { await load('fresh=1'); await run(() => { const ow = window.__ow; ow.manual(true); ow.winDungeon(2); ow.advance(30); }); }
  else { await page.goto(`${base()}&fresh=1&cp=offer2`); await ready(); await run(() => window.__ow.manual(true)); }
  const st = () => run(() => { const ow = window.__ow, h = ow.homecoming2(), g = ow.giant(), d = ow.gen().dungeons, v = ow.village(), c = ow.visit()?.crows, p = ow._body.pos; return { state: h.state, phase: h.phase, clock: +h.clock.toFixed(1), left: h.left, settled: h.settled, veil: +h.veil.toFixed(2), offer: ow.offering2().state, mode: ow.mode(), at: [p.x, p.z], home: v ? v.taken.map((t) => (t ? 0 : 1)).join('') : null, lights: c ? c.birds.map((b) => (b.light ? 1 : 0)).join('') : null, gone: c ? c.birds.map((b) => (b.gone ? 1 : 0)).join('') : null, giant: g && { walking: g.walking, dormant: g.dormant, awake: g.awake, sunk: +g.sunk.toFixed(2), by2: Math.round(Math.hypot(g.centre.x - d[1].x, g.centre.z - d[1].z)), by3: Math.round(Math.hypot(g.centre.x - d[2].x, g.centre.z - d[2].z)) } }; });
  /** Step frames; under the homecoming's veil the workers need real time. */
  const go = async (n) => { while (n > 0) { const w = await run(() => window.__ow.homecoming2().waiting); const k = Math.min(n, w ? 3 : 20); await run((k) => window.__ow.advance(k), k); n -= k; if (w) await page.waitForTimeout(80); } };
  const end = await until(() => window.__ow.offering2().clock > window.__ow.offering2().cues.end - 1.2, 2400);
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
    if (s.state !== 'idle') await shot(`h2-${String(++n).padStart(2, '0')}-${ph}-${String(Math.round(s.clock)).padStart(2, '0')}`);
    if (s.state === 'playing') moved = Math.max(moved, Math.hypot(s.at[0] - p0[0], s.at[1] - p0[1]));
    if (ph !== was) { console.log('phase', ph, JSON.stringify(s)); was = ph; }
    if (s.state === 'done') break;
  }
  await page.keyboard.up('KeyW');
  check('it carries on from the smile through every part and hands you back', s.state === 'done' && (sandbox ? seen.has('rise') : ['leave', 'village', 'rise'].every((k) => seen.has(k))), `${n} s; ${[...seen].join(' ')}`);
  check('hands off throughout, and still on foot by the shrine', moved < 0.3 && s.mode === 'walk', `moved ${moved.toFixed(2)} m with W held; ${s.mode}`);
  check('the giant is up from the second ring and walking', s.left && s.giant.walking && !s.giant.dormant && s.giant.sunk < 0.05, JSON.stringify(s.giant));
  if (!sandbox) check('the second spirit is home too, and its crow carries nothing', s.home.startsWith('11') && s.home.split('1').length - 1 === 2 && s.lights.startsWith('00'), `${s.home} ${s.lights}`);
  if (!sandbox) check('and both their crows are gone from the giant: the rest still roost with their lights', s.gone.startsWith('11') && s.gone.split('1').length - 1 === 2 && s.lights.slice(2) === '1'.repeat(s.lights.length - 2), `${s.gone} ${s.lights}`);
  await go(200);
  await shot('h2-back');
  // The walk to the third ring (game time, stepped), and lying down there.
  const took = await run(() => { const ow = window.__ow; let f = 0; for (; f < 20000 && !ow.homecoming2().settled; f += 30) ow.advance(30, 1 / 30); return f / 30; });
  await run(() => window.__ow.advance(1200));
  s = await st();
  check('it walks to the third ring and lies down: a hill again', s.settled && s.giant.dormant && !s.giant.awake && s.giant.sunk === 1 && s.giant.by3 > 30 && s.giant.by3 < 140, `${took.toFixed(0)} s of game time; ${JSON.stringify(s.giant)}`);
  const look3 = async (name) => {
    await run(() => { const ow = window.__ow, d = ow.gen().dungeons[2], g = ow.giant(); const ux = g.centre.x - d.x, uz = g.centre.z - d.z, l = Math.hypot(ux, uz); ow.teleport(d.x - (ux / l) * 34, d.z - (uz / l) * 34); ow.view(Math.atan2(-ux, -uz), 0.1, 16); ow.advance(80); });
    for (let i = 0; i < 40; i++) { await page.waitForTimeout(100); await run(() => window.__ow.advance(3)); if (await run(() => window.__ow.ready())) break; }
    await shot(name);
  };
  await look3('h2-ring3');
  const r = await run(() => { const ow = window.__ow, d = ow.gen().dungeons[2]; ow.teleport(d.x, d.z); ow.advance(120); return { mode: ow.mode(), y: +(ow._body.pos.y - ow.height(d.x, d.z)).toFixed(1) }; });
  check('the third ring is bare stones: standing in its middle, nothing takes you', (r.mode === 'walk' || r.mode === 'ride') && Math.abs(r.y) < 2.5, JSON.stringify(r));
  // A reload: nothing replays, and it is there already.
  await page.goto(sandbox ? `${base()}&story=0&t=10` : await run(() => location.href)); await ready();
  await run(() => { window.__ow.manual(true); window.__ow.advance(60); });
  s = await st();
  check('a reload replays nothing and finds it asleep by the third ring', s.state === 'done' && s.settled && !s.veil && s.offer === 'given' && s.giant.dormant && s.giant.by3 < 140 && (sandbox || (s.home.startsWith('11') && s.gone.startsWith('11') && s.gone.split('1').length - 1 === 2)), JSON.stringify(s));
  await look3('h2-reload-ring3');
}

if (kinds.includes('arrive')) {
  // The way the second ring really opens: the first dungeon's light given, the giant gets up, walks to the
  // second ring and lies down, and lets a dark spirit go into it. (Sandbox: no village, so no crow; the walk
  // is about two minutes of game time, stepped here.)
  await load('fresh=1');
  await run(() => { const ow = window.__ow; ow.manual(true); ow.winDungeon(); ow.advance(60); });
  const before = await run(() => ({ open: window.__ow.ring2().open, settled: window.__ow.homecoming().settled }));
  check('before the giant gets there the second ring is bare stones, shut', !before.open && !before.settled, JSON.stringify(before));
  const took = await run(() => { const ow = window.__ow; let f = 0; for (; f < 20000 && !ow.homecoming().settled; f += 30) ow.advance(30, 1 / 30); return f / 30; });
  await run(() => window.__ow.advance(300, 1 / 60));
  const after = await run(() => { const ow = window.__ow, r = ow.ring2(), g = ow.giant(), d = ow.gen().dungeons[1]; return { settled: ow.homecoming().settled, open: r.open, sealed: r.sealed, dormant: g.dormant, giant: Math.round(Math.hypot(g.centre.x - d.x, g.centre.z - d.z)) }; });
  check('the giant walks there, lies down, and the ring opens', after.settled && after.open && !after.sealed && after.dormant && after.giant > 30 && after.giant < 140, `${took.toFixed(0)} s of game time; ${JSON.stringify(after)}`);
  await run(() => { window.__ow.goToRing(1); window.__ow.advance(90); });
  await shot('arrive-ring2-open');
  await page.goto(`${base()}&story=0&t=10`); await ready();
  const again = await run(() => { const ow = window.__ow; ow.manual(true); ow.advance(30); return { open: ow.ring2().open, settled: ow.homecoming().settled }; });
  check('and a reload finds it open', again.open && again.settled, JSON.stringify(again));
}

if (kinds.includes('perf')) {
  await load('dungeon=2&fresh=1');
  const outp = {};
  for (const [name, to] of [['well', 'door'], ['L1', 'M2'], ['E2', 'spot2'], ['E3', 'P'], ['F', 'P'], ['M1', 'M2'], ['W3', 'M1']]) {
    for (const lit of [false, true]) {
      await run(([name, to, lit]) => { const b = window.__bot; b.d.debugLight(lit); b.put(name, to, 0.16, 12); }, [name, to, lit]);
      await page.waitForTimeout(700);
      outp[`${name}${lit ? ' (all lit)' : ''}`] = await run(() => new Promise((res) => {
        const ts = [];
        let last = performance.now();
        const f = () => { const now = performance.now(); ts.push(now - last); last = now; if (ts.length < 240) requestAnimationFrame(f); else { ts.sort((a, b) => a - b); const s = window.__ow.stats(); res({ ms: +(ts.reduce((a, b) => a + b, 0) / ts.length).toFixed(2), p99: +ts[Math.floor(ts.length * 0.99)].toFixed(2), calls: s.calls, tris: s.tris }); } };
        requestAnimationFrame(f);
      }));
    }
  }
  console.log(JSON.stringify({ buildMs: await run(() => window.__ow.cave().buildMs), uncapped, frames: outp }, null, 1));
}
await browser.close(); server.close();
process.exit(failed ? 1 : 0);
