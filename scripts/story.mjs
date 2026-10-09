// Scripted playthrough of the story opening with real key presses:
//   node scripts/story.mjs <outdir> [seed=hilda] [--no-shots] [--hint]
// Walks to whatever the story wants next (the director's goal), steering with
// W and a locked input yaw, so chopping, pickups and deposits all happen the
// way a player would trigger them (by walking into things). Screenshots each
// stage; prints the step timeline and fails if it doesn't reach the end.
// Needs a build (npx vite build).
import { chromium } from 'playwright';
import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path';
const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const args = process.argv.slice(2);
const out = args[0] ?? 'shots/story';
const seed = args.find((a) => a.startsWith('seed='))?.slice(5) ?? 'hilda';
const shots = !args.includes('--no-shots');
const hintTest = args.includes('--hint');
const from = args.find((a) => a.startsWith('from='))?.slice(5);
fs.mkdirSync(out, { recursive: true });
const server = http.createServer((req, res) => {
  const p = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  const f = path.join(root, process.env.DIST ?? 'dist', p === '/' ? 'index.html' : p);
  if (!fs.existsSync(f)) { res.writeHead(404); res.end(); return; }
  res.writeHead(200, { 'content-type': f.endsWith('.js') ? 'text/javascript' : f.endsWith('.html') ? 'text/html' : f.endsWith('.css') ? 'text/css' : 'application/octet-stream' });
  fs.createReadStream(f).pipe(res);
});
await new Promise((r) => server.listen(0, r));
const browser = await chromium.launch({ args: ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
page.on('pageerror', (e) => console.log('[pageerror]', e.message));
page.on('console', (m) => { if (m.type() === 'error') console.log('[page]', m.text().slice(0, 300)); });
const W = (ms) => page.waitForTimeout(ms);
const ev = (f, a) => page.evaluate(f, a);
const shot = async (n) => { if (shots) await page.screenshot({ path: `${out}/${seed}-${n}.png` }); };
await page.goto(`http://localhost:${server.address().port}/?seed=${seed}&story=1&fresh=1&mobs=0&capture=1&ui=0`);
for (let i = 0; i < 160; i++) { if (await ev(() => window.__ow?.ready())) break; await W(250); }
await W(800);
if (from) { await page.evaluate((id) => window.__ow.story().debugJump(id), from); await W(1500); }

const K = page.keyboard;
let held = false;
const hold = async (on) => { if (on !== held) { held = on; if (on) await K.down('KeyW'); else await K.up('KeyW'); } };
/** Camera behind the explorer looking at (x, z). */
const frame = (x, z, pitch = 0.2, dist = 11) => ev(([x, z, p, d]) => {
  const b = window.__ow.body.pos;
  window.__ow.view(Math.atan2(b.x - x, b.z - z), p, d);
}, [x, z, pitch, dist]);

/** Orbit a subject for a still: camera on the explorer's side of it, a little round. */
const look = async (name, x, y, z, side = 0.5, pitch = 0.18, dist = 9, wait = 350) => {
  await ev(([x, y, z, side, pitch, dist]) => {
    const b = window.__ow.body.pos;
    const st = window.__ow.story().site;
    window.__ow.focusAt(x, y, z);
    // From the explorer's side, unless the subject hugs the cabin: then from away from it.
    const nearCab = Math.hypot(x - st.x, z - st.z) < 7 && Math.hypot(x - st.x, z - st.z) > 1;
    const yaw = nearCab ? Math.atan2(x - st.x, z - st.z) : Math.atan2(b.x - x, b.z - z);
    window.__ow.view(yaw + side, pitch, dist);
  }, [x, y, z, side, pitch, dist]);
  await W(wait);
  await shot(name);
  await ev(() => window.__ow.focusAt(null));
};
const S = () => ev(() => { const s = window.__ow.story(); const sp = s.spirit.pos; const c = s.cabin; return { sp: [sp.x, sp.y + 0.5, sp.z], cab: [s.site.x, s.site.y + 2.2, s.site.z], hearth: [c.hearthPos.x, c.hearthPos.y, c.hearthPos.z], chim: [c.parts.chimney.centre.x, c.parts.chimney.centre.y, c.parts.chimney.centre.z], bank: [s.site.bank.x, s.site.y, s.site.bank.z], far: [s.far.pos.x, s.far.pos.y, s.far.pos.z] }; });
const t0 = Date.now();
const timeline = [];
let last = '';
let stuckT = 0, lastPos = null;
let chopping = false;
const seen = new Set();
await shot('00-start');
if (hintTest) {
  // Stand still in the meet step for 25 s: the spirit should come and tug.
  await frame(...(await ev(() => { const s = window.__ow.story().site; return [s.x, s.z]; })), 0.22, 13);
  for (let i = 0; i < 26; i++) {
    await W(1000);
    const st = await ev(() => window.__ow.story().state());
    if (i === 23 || i === 24) await shot(`hint-${i}`);
    if (i % 5 === 0) console.log('idle', i, st.step, st.idle.toFixed(1));
  }
}
while (Date.now() - t0 < 420000) {
  const st = await ev(() => window.__ow.story().state());
  if (st.step !== last) {
    timeline.push(`${((Date.now() - t0) / 1000).toFixed(1)}s ${st.step} hour=${st.hour.toFixed(2)} warmth=${st.warmth.toFixed(2)} inv=${JSON.stringify(st.inv)} ${JSON.stringify(st.parts)}`);
    console.log(timeline[timeline.length - 1]);
    last = st.step;
    // Stage shots.
    await hold(false);
    await W(1200);
    const P = await S();
    if (st.step === 'axe') { await W(900); await look('01-greet', ...P.sp, 0.7, 0.12, 5); }
    if (st.step === 'logs') { await W(2400); const Q = await S(); await look('03-axe-taken', ...Q.sp, 0.8, 0.12, 6); }
    if (st.step === 'repair') { await W(3000); const Q = await S(); await look('05-sketch', ...Q.cab, 0.35, 0.16, 15); await look('05b-spirit-points', ...Q.sp, 1.0, 0.1, 5); }
    if (st.step === 'stones') { await W(2500); await look('06-roof-door-built', ...P.cab, 0.3, 0.18, 15); }
    if (st.step === 'chimney') { await W(3500); const Q = await S(); await look('08-chimney-sketch', ...Q.chim, 0.4, 0.12, 12); }
    if (st.step === 'hearth') { await W(1500); await look('09-chimney-built', ...P.cab, 0.6, 0.18, 16); }
    if (st.step === 'home') { await W(1800); const Q = await S(); await look('11-lit', ...Q.hearth, 0.6, 0.35, 6); await look('11b-lit-outside', ...Q.cab, 0.4, 0.14, 17); }
  }
  if (st.done) break;
  if (st.step === 'home') {
    // The ending: night falls over the lit cabin while the spirit potters.
    const Q = await S();
    if (!seen.has('night') && (await ev(() => window.__ow.story().d.env.hour)) > 20.8) {
      seen.add('night');
      await hold(false);
      await look('12-night-cabin', ...Q.cab, 0.5, 0.12, 18, 600);
      await look('12b-spirit-resting', ...Q.sp, 2.2, 0.05, 4.5);
    }
    await W(500);
    continue;
  }
  // A cached route (re-planned when the goal moves or every few seconds),
  // dropping waypoints as they're reached, the way the spirit walks.
  const g = await ev(() => {
    const s = window.__ow.story(); const b = window.__ow.body.pos; const goal = s.goal();
    if (!goal) return null;
    const w = window;
    const now = performance.now();
    if (!w.__route || Math.hypot(w.__routeGoal.x - goal.x, w.__routeGoal.z - goal.z) > 0.5 || now - w.__routeT > 4000) {
      w.__route = s.route(b, goal); w.__routeGoal = { x: goal.x, z: goal.z }; w.__routeT = now;
    }
    while (w.__route.length > 1 && Math.hypot(w.__route[0].x - b.x, w.__route[0].z - b.z) < 0.5) w.__route.shift();
    const r = w.__route;
    return { goal: { x: goal.x, z: goal.z }, wp: { x: r[0].x, z: r[0].z }, b: { x: b.x, y: b.y, z: b.z }, n: r.length };
  });
  if (!g) { await hold(false); await W(300); continue; }
  if (args.includes('--verbose') && Math.floor((Date.now() - t0) / 5000) !== Math.floor((Date.now() - t0 - 110) / 5000)) {
    console.log('  ', st.step, 'player', g.b.x.toFixed(1), g.b.y.toFixed(2), g.b.z.toFixed(1), 'wp', g.wp.x.toFixed(1), g.wp.z.toFixed(1), 'goal', g.goal.x.toFixed(1), g.goal.z.toFixed(1), 'n', g.n, 'hour', st.hour.toFixed(2), 'held', held);
  }
  const dGoal = Math.hypot(g.goal.x - g.b.x, g.goal.z - g.b.z);
  const dx = g.wp.x - g.b.x, dz = g.wp.z - g.b.z;
  await ev((y) => window.__ow.lockInput(y), Math.atan2(-dx, -dz));
  // Stop at the goal (trees: keep pushing into the trunk; chopping triggers).
  const stopAt = st.step === 'build' || st.step === 'repair' || st.step === 'chimney' ? 1.5 : 0.5;
  await hold(dGoal > stopAt);
  // Everything is the action: tap E at the goal (the repair zone is wider),
  // and hold it at a tree so the swings keep coming.
  const atGoal = dGoal < (st.step === 'repair' || st.step === 'chimney' ? 5 : 2.3);
  const chop = (st.step === 'logs' || st.step === 'stones') && atGoal;
  if (chop !== chopping) { chopping = chop; if (chop) await K.down('KeyE'); else await K.up('KeyE'); }
  if (atGoal && !chop) await K.press('KeyE');
  if (st.step === 'logs' && !seen.has('chop') && dGoal < 1.9) {
    seen.add('chop');
    await W(150);
    const b = g.b;
    await ev(([x, y, z]) => { window.__ow.focusAt(x, y + 1.2, z); const t = window.__ow.story().goal(); window.__ow.view(Math.atan2(x - t.x, z - t.z) + 1.3, 0.1, 5.5); }, [b.x, b.y, b.z]);
    await W(120); await shot('04a-chop');
    await W(260); await shot('04b-chop2');
    await W(2600); await shot('04c-fall');
    await ev(() => window.__ow.focusAt(null));
  }
  if (st.step === 'hearth' && !seen.has('dusk')) {
    seen.add('dusk');
    await hold(false);
    const a = await ev(() => { const s = window.__ow.story(); return { x: s.cabin.hearthPos.x, z: s.cabin.hearthPos.z }; });
    const Q = await S();
    await look('10-hearth-outside', ...Q.cab, 0.5, 0.15, 17, 500);
    await look('10b-hearth', ...Q.sp, 1.2, 0.3, 5, 500);
  }
  // Unstick: a hop if we haven't moved.
  if (lastPos && Math.hypot(g.b.x - lastPos.x, g.b.z - lastPos.z) < 0.05 && held) {
    stuckT += 1;
    if (stuckT > 12) { await K.press('Space'); stuckT = 0; }
  } else stuckT = 0;
  lastPos = g.b;
  await W(100);
}
await hold(false);
const fin = await ev(() => { const s = window.__ow.story(); const b = window.__ow.body.pos; return { ...s.state(), player: { x: b.x, y: b.y, z: b.z }, goal: s.goal(), local: (() => { const c = Math.cos(s.site.rot), n = Math.sin(s.site.rot); const dx = b.x - s.site.x, dz = b.z - s.site.z; return { x: c * dx - n * dz, z: n * dx + c * dz }; })() }; });
console.log('final', JSON.stringify(fin));
console.log(fin.done ? `COMPLETED in ${((Date.now() - t0) / 1000).toFixed(0)}s` : 'DID NOT COMPLETE');
await browser.close(); server.close();
process.exit(fin.done ? 0 : 1);
