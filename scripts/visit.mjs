// The giant's visit, frame-stepped (giant slice 1, step 4): node scripts/visit.mjs <outdir> [seed=hilda] [t=16.6] [tower] [fine] [after]
//   A frame every 1.5 s of the event, then (`after`) the wrecked lane from above and a reloaded save.
//   `mobs`: with the creatures about (they run from it: mobs/manager.ts `scare`), and what became of them printed.
// Needs a build (npx vite build); DIST=<folder> to serve another than dist/.
import { chromium } from 'playwright';
import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path';
const root = process.cwd();
const args = process.argv.slice(2);
const out = args[0] ?? 'shots/visit';
const seed = args.find((a) => a.startsWith('seed='))?.slice(5) ?? 'hilda';
const hour = args.find((a) => a.startsWith('t='))?.slice(2) ?? '16.6';
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
const page = await browser.newPage({ viewport: { width: 1600, height: 900 } });
page.on('pageerror', (e) => console.log('[pageerror]', e.message));
page.on('console', (m) => { if (m.type() === 'error' && !m.text().includes('useProgram')) console.log('[page]', m.text().slice(0, 400)); });
const W = (ms) => page.waitForTimeout(ms);
const ev = (f, a) => page.evaluate(f, a);
const url = `http://localhost:${server.address().port}/?seed=${seed}&story=1&mobs=${args.includes('mobs') ? 1 : 0}&bikes=${args.includes("tower") ? 1 : 0}&drak=0&capture=1&ui=0`;
await page.goto(`${url}&fresh=1`);
for (let i = 0; i < 160; i++) { if (await ev(() => window.__ow?.ready())) break; await W(250); }
await W(1000);
const info = await ev((h) => {
  const o = window.__ow, st = o.story(), s = st.site;
  for (const id of ['roof', 'door', 'chimney']) st.cabin.setBuilt(id);
  st.cabin.light(true);
  o.setHour(h);
  // By the hearth, where you are when you light it.
  o.teleport(st.cabin.hearthPos.x - Math.cos(s.rot) * 1.6, st.cabin.hearthPos.z + Math.sin(s.rot) * 1.6);
  const v = o.visit();
  return v?.route ? { falls: v.route.falls.length, first: v.route.firstHouse, last: v.route.lastHouse } : null;
}, parseFloat(hour));
console.log(seed, info ?? 'no visit');
if (!info) { await browser.close(); server.close(); process.exit(0); }
// Let the terrain along the lane stream in before anything moves.
for (let i = 0; i < 60; i++) { await W(250); if (await ev(() => window.__ow.ready())) break; }
if (args.includes('tower')) {
  // The real order: jump to the home tower lit, go up into its head, and wait for the giant.
  const got = await ev(async () => {
    const o = window.__ow;
    o.journeyJump('enter1');
    await new Promise((r) => setTimeout(r, 1500));
    o.beacons.debugEnter(0);
    for (let i = 0; i < 200 && o.visit().state === 'idle'; i++) await new Promise((r) => setTimeout(r, 250));
    o.manual(true);
    return { state: o.visit().state, inside: !!o.beacons.inside, stage: o.journey()?.stage };
  });
  console.log('from the tower:', got);
} else
await ev(() => { const o = window.__ow; o.manual(true); o.visit().start(); });
let n = 0;
// (`fine`: a frame every 0.4 s once it has stopped, for the moving shots.)
const fine = args.includes('fine');
let dtShot = fine ? 0.5 : 1.0;
for (let t = 0; t < 120; t += dtShot) {
  const s = await ev((n) => { const o = window.__ow; o.advance(n, 1 / 60); const g = o.giant().centre, fl = [...(o.mobs?.flocks.values() ?? [])]; return { busy: o.visit().busy, steps: +o.giant().steps.toFixed(1), jt: +o.visit().jt.toFixed(1), fled: fl.filter((f) => f.data.gone).map((f) => f.species.name + ' ' + Math.round(Math.hypot(f.centre.x - g.x, f.centre.z - g.z))).join(', '), stay: fl.filter((f) => !f.data.gone).length }; }, Math.round(dtShot * 60));
  await W(80);
  if (fine && s.jt >= 0) dtShot = 0.4;
  console.log(n, (t + dtShot).toFixed(1) + ' s', 'step', s.steps, 'stopped', s.jt, args.includes('mobs') ? `| fled (m from it): ${s.fled || 'none'} | not: ${s.stay}` : '');
  await page.screenshot({ path: `${out}/visit-${String(n++).padStart(3, '0')}.png` });
  if (!s.busy) { console.log('camera handed back after', (t + dtShot).toFixed(1), 's, at step', s.steps); break; }
}
if (args.includes('tower')) {
  const back = await ev(() => { const o = window.__ow; o.advance(90, 1 / 60); return { inside: !!o.beacons.inside, stage: o.journey()?.stage, gone: o.story().giantGone }; });
  await W(200);
  await page.screenshot({ path: `${out}/tower-after.png` });
  console.log('after, back in the head:', back);
}
if (args.includes('trail')) {
  // The long walk to the ring, fast-forwarded; then the trail from high above, the giant asleep at the ring, and the ring itself.
  const end = await ev(() => {
    const o = window.__ow, g = o.giant();
    for (let i = 0; i < 400 && !(g.arrived && g.dormant); i++) o.advance(30, 1 / 20);
    o.advance(240, 1 / 20);
    const r = o.visit().route, dg = o.gen().dungeon, tw = dg.tower >= 0 ? o.gen().towers.towers[dg.tower] : { x: 1e9, z: 1e9 }, st = o.gen().story;
    let len = 0;
    for (let i = r.lastHouse + 1; i < r.falls.length; i++) len += Math.hypot(r.falls[i].x - r.falls[i - 1].x, r.falls[i].z - r.falls[i - 1].z);
    let wet = 0, steep = 0;
    for (let i = r.lastHouse; i < r.falls.length; i++) { const f = r.falls[i]; if (o.height(f.x, f.z) < 1) wet++; if (i && Math.abs(o.height(f.x, f.z) - o.height(r.falls[i - 1].x, r.falls[i - 1].z)) > 9) steep++; }
    window.__t = { dg, mid: r.falls[Math.floor((r.lastHouse + r.falls.length) / 2)], st };
    return { falls: r.falls.length, metres: (r.falls.length - r.lastHouse) * 21, straight: Math.round(Math.hypot(dg.x - st.x, dg.z - st.z)), towerOff: Math.round(Math.min(...r.falls.map((f) => Math.hypot(f.x - tw.x, f.z - tw.z)))), wet, steep, prints: o.trail.prints.list.length, arrived: g.arrived, dormant: g.dormant, ringOpen: o.ring().open };
  });
  console.log('trail:', end);
  const look = async (name, fn, a, hours = [10.5]) => {
    await ev(fn, a);
    for (let i = 0; i < 80; i++) { await W(250); if (await ev(() => window.__ow.ready())) break; }
    for (const h of hours) {
      await ev((h) => { window.__ow.setHour(h); window.__ow.advance(2, 1 / 60); }, h);
      await W(500);
      await page.screenshot({ path: `${out}/${name}${hours.length > 1 ? '-' + h : ''}.png` });
    }
  };
  await look('trail-above', () => { const o = window.__ow, t = window.__t; o._orbit.maxDistance = 4000; o.rig.root.visible = false; o.teleport(t.mid.x, t.mid.z); o.focusAt(t.mid.x, o.height(t.mid.x, t.mid.z), t.mid.z); o.view(Math.atan2(t.st.x - t.dg.x, t.st.z - t.dg.z) + 0.5, 0.7, 620); });
  await look('trail-mid', () => { const o = window.__ow, t = window.__t; o.view(Math.atan2(t.st.x - t.dg.x, t.st.z - t.dg.z) + 0.15, 0.28, 260); });
  await look('ring', () => { const o = window.__ow, t = window.__t, g = o.giant(); o.teleport(t.dg.x, t.dg.z); o.focusAt((t.dg.x + g.centre.x) / 2, t.dg.y + 14, (t.dg.z + g.centre.z) / 2); o.view(Math.atan2(t.dg.x - g.centre.x, t.dg.z - g.centre.z) + 0.6, 0.1, 230); }, null, [10.5, 18.9, 23]);
  await look('ring-close', () => { const o = window.__ow, t = window.__t, g = o.giant(); o.rig.root.visible = true; o.focusAt(null); o.teleport(t.dg.x + 3, t.dg.z + 3); o.view(Math.atan2(t.dg.x - g.centre.x, t.dg.z - g.centre.z), 0.1, 26); });
}
if (args.includes('after')) {
  // What it left: the lane from above, by day and at night.
  await ev(() => { const o = window.__ow; o.advance(60 * 20, 1 / 60); const L = o.story().site.village.lane, m = L[Math.floor(L.length / 2)]; o._orbit.maxDistance = 600; o.rig.root.visible = false; o.focusAt(m.x, o.height(m.x, m.z) + 2, m.z); o.view(Math.atan2(L[L.length - 1].x - L[0].x, L[L.length - 1].z - L[0].z) + 1.1, 0.55, 150); o.advance(2, 1 / 60); });
  await W(300);
  await page.screenshot({ path: `${out}/after-day.png` });
  await ev(() => { const o = window.__ow; o.setHour(23); o.advance(2, 1 / 60); });
  await W(300);
  await page.screenshot({ path: `${out}/after-night.png` });
  // The same from a reloaded save: prints and wreckage come back without a replay.
  await ev(() => { const o = window.__ow; o.story().done = true; o.story().save(); });
  await page.goto(url);
  for (let i = 0; i < 160; i++) { if (await ev(() => window.__ow?.ready())) break; await W(250); }
  await W(1500);
  const back = await ev(() => { const o = window.__ow; const L = o.story().site.village.lane, m = L[Math.floor(L.length / 2)]; o.setHour(16.6); o._orbit.maxDistance = 600; o.rig.root.visible = false; o.focusAt(m.x, o.height(m.x, m.z) + 2, m.z); o.view(Math.atan2(L[L.length - 1].x - L[0].x, L[L.length - 1].z - L[0].z) + 1.1, 0.55, 150); return { state: o.visit().state, prints: o.trail.prints.list.length, smashed: o.village().houses.filter((h) => h.smashed).length }; });
  console.log('reloaded:', back);
  for (let i = 0; i < 60; i++) { await W(250); if (await ev(() => window.__ow.ready())) break; }
  await W(800);
  await page.screenshot({ path: `${out}/after-reload.png` });
}
await browser.close(); server.close();
