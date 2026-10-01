// Scripted playthrough of phase 3 (the stable) with real key presses:
//   node scripts/stablerun.mjs <outdir> [seed=hilda] [from=<step>] [--ride] [--no-shots]
// Starts with phase 2 done, walks home to trigger it, then follows the
// director's goal: gathers from world trees and rocks, builds the footing,
// frame, roof and fence, takes the lasso, lassoes the stelk the spirit shows it and leads it in
// through the gate (--ride: climbs on bareback and rides it in). Then reloads the page and checks the save came back.
// Prints the timeline; exits 1 if it doesn't get there. Needs a build.
import { chromium } from 'playwright';
import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path';
const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const args = process.argv.slice(2);
const out = args[0] ?? 'shots/stablerun';
const seed = args.find((a) => a.startsWith('seed='))?.slice(5) ?? 'hilda';
const shots = !args.includes('--no-shots');
const ride = args.includes('--ride');
const from = args.find((a) => a.startsWith('from='))?.slice(5);
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
const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
let page = await ctx.newPage();
const hook = (pg) => {
  pg.on('pageerror', (e) => console.log('[pageerror]', e.message));
  pg.on('console', (m) => { if (m.type() === 'error' && !m.text().includes('useProgram')) console.log('[page]', m.text().slice(0, 300)); });
};
hook(page);
const W = (ms) => page.waitForTimeout(ms);
const ev = (f, a) => page.evaluate(f, a);
const shot = async (n) => { if (shots) await page.screenshot({ path: `${out}/${seed}-${n}.png` }); };
const base = `http://localhost:${server.address().port}/?seed=${seed}&story=1&mobs=0&capture=1&ui=0`;
const load = async (q) => {
  await page.goto(base + q);
  for (let i = 0; i < 160; i++) { if (await ev(() => window.__ow?.ready())) break; await W(250); }
  await W(800);
};
await load(from ? `&fresh=1&stable=${from}` : '&fresh=1&journey=done');

const K = page.keyboard;
let held = false;
const hold = async (on) => { if (on !== held) { held = on; if (on) await K.down('KeyW'); else await K.up('KeyW'); } };
let eHeld = false;
const holdE = async (on) => { if (on !== eHeld) { eHeld = on; if (on) await K.down('KeyE'); else await K.up('KeyE'); } };
const state = () => ev(() => window.__ow.story().state());
/** Walk toward (x, z) for one tick; returns the distance left. */
const steer = async (x, z) => {
  const b = await ev(() => { const p = window.__ow._body.pos; return { x: p.x, z: p.z }; });
  const d = Math.hypot(x - b.x, z - b.z);
  await ev((y) => window.__ow.lockInput(y), Math.atan2(-(x - b.x), -(z - b.z)));
  return d;
};

// Home from the second tower: stand 70 m out from the cabin and walk in.
const cab = await ev(() => { const s = window.__ow.story().site; return { x: s.x, z: s.z }; });
await ev(([x, z]) => window.__ow.teleport(x, z), [cab.x + 70, cab.z]);
await W(1500);
const t0 = Date.now();
const timeline = [];
const log = (s) => { const l = `${((Date.now() - t0) / 1000).toFixed(1)}s ${s}`; timeline.push(l); console.log(l); };
while (!from && Date.now() - t0 < 40000) {
  const st = await state();
  if (st.phase === 'stable') break;
  const d = await steer(cab.x, cab.z);
  await hold(d > 3);
  await W(150);
}
await hold(false);

let last = '';
let lassoed = false, stuckT = 0, lastB = null;
// The bot walks straight at things: if a gather makes no progress for a
// while (a boulder field in the way), it's set down beside its target.
let progT = Date.now(), lastInv = '';
const seen = new Set();
while (Date.now() - t0 < 600000) {
  const st = await state();
  if (st.step !== last) {
    await holdE(false);
    log(`${st.step} inv=${JSON.stringify(st.inv)} ${JSON.stringify(st.parts)}`);
    last = st.step;
    if (!seen.has(st.step)) { seen.add(st.step); await hold(false); await W(1200); await shot(`${String(seen.size).padStart(2, '0')}-${st.step}`); }
  }
  if (st.step === 'ranch') break;
  if (st.step === 'catch' || st.step === 'herd') {
    await hold(false);
    if (!lassoed) {
      // The lesson's stelk grazing out past the gate (the spirit's showing
      // us): walk to within throwing range of it, turn to it and throw.
      for (let i = 0; i < 200; i++) {
        const q = await ev(() => { const q = window.__ow.story().quarry(); return q && { x: q.x, z: q.z }; });
        if (!q) { await W(250); continue; }
        const b = await ev(() => { const p = window.__ow._body.pos; return { x: p.x, z: p.z }; });
        if (Math.hypot(q.x - b.x, q.z - b.z) < 14) break;
        await steer(q.x, q.z);
        await hold(true);
        await W(150);
      }
      await hold(false);
      for (let i = 0; i < 40 && !lassoed; i++) {
        const m = await ev(() => { const q = window.__ow.story().quarry(); return q ? { x: q.x, y: q.y, z: q.z } : null; });
        if (!m) break;
        await ev(([x, y, z]) => { const b = window.__ow._body.pos; window.__ow.view(Math.atan2(b.x - x, b.z - z), 0.12, 6); }, [m.x, m.y, m.z]);
        await W(120);
        await K.press('KeyR');
        await W(2600);
        lassoed = await ev(() => window.__ow.mobs.tamed.some((q) => q.leashed));
      }
      log(`lassoed=${lassoed} rideable=${await ev(() => window.__ow.mobs.tamed.some((q) => q.stabled))}`);
      await shot('lassoed');
      if (!lassoed) break;
      if (ride) {
        await ev(() => window.__ow.mountNearest());
        await W(1500);
        const r = await ev(() => { const m = window.__ow.mobs.tamed.find((q) => q.ridden); return m ? { sp: m.species.name, stabled: m.stabled } : null; });
        log(`bareback=${JSON.stringify(r)}`);
        await shot('bareback');
        if (!r) break;
      }
    }
    // Lead it in through the gate to the middle of the pasture.
    const g = await ev(() => {
      const s = window.__ow.story(), b = window.__ow._body.pos;
      const goal = s.stable.local(0, -2);
      // The first waypoint we aren't already standing on.
      const r = s.route(b, goal);
      const w = r.find((p) => Math.hypot(p.x - b.x, p.z - b.z) > 0.8) ?? r[r.length - 1];
      return { x: w.x, z: w.z };
    });
    const d = await steer(g.x, g.z);
    await hold(d > 0.6);
    await W(120);
    continue;
  }
  const goal = await ev(() => {
    const s = window.__ow.story(), b = window.__ow._body.pos, gl = s.goal();
    if (!gl) return null;
    const r = s.route(b, gl);
    return { x: gl.x, z: gl.z, wx: r[0].x, wz: r[0].z };
  });
  if (!goal) { await hold(false); await W(300); continue; }
  const b = await ev(() => { const p = window.__ow._body.pos; return { x: p.x, z: p.z }; });
  const dGoal = Math.hypot(goal.x - b.x, goal.z - b.z);
  const gather = st.step.startsWith('stones') || st.step.startsWith('logs');
  const inv = JSON.stringify(st.inv) + st.step;
  if (inv !== lastInv) { lastInv = inv; progT = Date.now(); }
  if (gather && Date.now() - progT > 25000) {
    log(`  stuck on the way to ${goal.x.toFixed(0)},${goal.z.toFixed(0)}: set down beside it`);
    await ev(([x, z, bx, bz]) => { const d = Math.hypot(bx - x, bz - z) || 1; window.__ow.teleport(x + ((bx - x) / d) * 3, z + ((bz - z) / d) * 3); }, [goal.x, goal.z, b.x, b.z]);
    progT = Date.now();
  }
  const build = st.step === 'footing' || st.step === 'raise' || st.step === 'fence';
  await steer(goal.wx, goal.wz);
  await hold(dGoal > (build ? 2.5 : 0.6));
  const atGoal = dGoal < (build ? 5 : 2.6);
  await holdE(gather && atGoal);
  if (atGoal && !gather) await K.press('KeyE');
  // Unstick with a hop.
  if (lastB && Math.hypot(b.x - lastB.x, b.z - lastB.z) < 0.05 && held) { if (++stuckT > 12) { await K.press('Space'); stuckT = 0; } } else stuckT = 0;
  lastB = b;
  await W(100);
}
await hold(false); await holdE(false);
await W(2500);
const fin = await ev(() => { const ow = window.__ow; return { ...ow.story().state(), herd: ow.herd()?.count, rideable: ow.mobs.tamed.filter((m) => m.stabled).length }; });
log(`final step=${fin.step} herd=${fin.herd} rideable=${fin.rideable}`);
await shot('zz-home');

// The save: reload and check it all came back.
await load('');
await W(1500);
const back = await ev(() => { const ow = window.__ow, s = ow.story(), st = s.stable; return { step: s.state().step, phase: s.state().phase, lasso: s.hasLasso, herd: ow.herd()?.count, home: ow.mobs.tamed.filter((m) => m.stabled && st.inside(m.pos.x, m.pos.z)).length, parts: s.state().parts }; });
log(`reloaded ${JSON.stringify(back)}`);
const ok = fin.step === 'ranch' && fin.herd >= 1 && back.phase === 'stable' && back.step === 'ranch' && back.lasso && back.herd >= 1 && back.home >= 1;
console.log(ok ? `COMPLETED in ${((Date.now() - t0) / 1000).toFixed(0)}s` : 'DID NOT COMPLETE');
await browser.close(); server.close();
process.exit(ok ? 0 : 1);
