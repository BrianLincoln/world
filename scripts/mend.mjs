// The village mended as dungeons are finished: houses further built, the
// giant's prints filled in, and whoever's home at it with shovels.
//   node scripts/mend.mjs <outdir> [seed=hilda] [t=10.5]
//   d<n>-lane.png: the lane from above after n dungeons (1 to 5);
//   d<n>-dig.png: the print being filled, its heap, and whoever's digging;
//   dig-a..d.png: close on the digging, a few seconds apart;
//   grab-00..11.png: a shovel being taken out of the heap.
// Prints the houses' steps and the prints left. Uses the build in dist/, or in $DIST.
import { chromium } from 'playwright';
import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path';
const root = process.cwd(); const out = process.argv[2];
const arg = (k, d) => process.argv.find((a) => a.startsWith(k + '='))?.slice(k.length + 1) ?? d;
fs.mkdirSync(out, { recursive: true });
const server = http.createServer((req, res) => {
  const p = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  const f = path.resolve(root, process.env.DIST ?? 'dist', p === '/' ? 'index.html' : '.' + p);
  if (!fs.existsSync(f)) { res.writeHead(404); res.end(); return; }
  res.writeHead(200, { 'content-type': f.endsWith('.js') ? 'text/javascript' : f.endsWith('.html') ? 'text/html' : f.endsWith('.css') ? 'text/css' : 'application/octet-stream' });
  fs.createReadStream(f).pipe(res);
});
await new Promise((r) => server.listen(0, r));
const browser = await chromium.launch({ args: ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
page.on('pageerror', (e) => console.log('[pageerror]', e.message));
const W = (ms) => page.waitForTimeout(ms);
const ev = (f, a) => page.evaluate(f, a);
// From after the first dungeon: one spirit home, and everything still to do.
await page.goto(`http://localhost:${server.address().port}/?seed=${arg('seed', 'hilda')}&story=1&fresh=1&cp=ring2&mobs=0&bikes=0&drak=0&capture=1&ui=0&t=${arg('t', '10.5')}`);
for (let i = 0; i < 200; i++) { if (await ev(() => window.__ow?.ready())) break; await W(250); }
await W(2500);
const state = () => ev(() => {
  const o = window.__ow, v = o.village(), P = o.trail.prints;
  const lane = v.site.lane, town = P.list.filter((p) => lane.some((q) => Math.hypot(q.x - p.x, q.z - p.z) < 30));
  return { steps: v.houses.map((h) => h.step), home: v.taken.map((t, k) => (t ? '' : k)).filter((k) => k !== '').join(','), printsLeft: town.filter((p) => P.at(p.x, p.z) === p).length, of: town.length, dig: v.digAt ? [Math.round(v.digAt.pile.x), Math.round(v.digAt.pile.z)] : null, doing: v.life.map((l) => l.doing).join(' ') };
});
for (let d = 1; d <= 5; d++) {
  if (d > 1) await ev((d) => { const o = window.__ow, v = o.village(); if (d <= 4) v.comeHome(d - 1); return o.mend(d); }, d).then((r) => console.log('mend', d, JSON.stringify(r)));
  await ev(() => { const o = window.__ow, v = o.village(), m = v.site.lane[Math.floor(v.site.lane.length / 2)]; o.rig.root.visible = false; o.teleport(m.x, m.z); o.focusAt(m.x, o.height(m.x, m.z) + 1, m.z); o.view(0.6, 0.75, 78); });
  await W(2500);
  console.log(`after ${d}:`, JSON.stringify(await state()));
  await page.screenshot({ path: `${out}/d${d}-lane.png` });
  await ev(() => { const o = window.__ow, v = o.village(), h = v.houses[0], h1 = v.houses[1]; o.focusAt((h.plot.x + h1.plot.x) / 2, h.plot.y + 1, (h.plot.z + h1.plot.z) / 2); o.view(h.plot.rot + 0.5, 0.5, 34); });
  await W(1200);
  await page.screenshot({ path: `${out}/d${d}-houses.png` });
  const dig = await ev(() => { const o = window.__ow, v = o.village(), s = v.digAt; if (!s) return false; for (const [k, l] of v.life.entries()) if (!v.taken[k] && l.doing === 'home') l.t = 0.2; o.focusAt(s.edge.x, s.pile.y + 0.6, s.edge.z); o.view(Math.atan2(s.pile.x - s.into.x, s.pile.z - s.into.z) + 0.9, 0.42, 20); return true; });
  if (!dig) continue;
  await W(4000);
  await page.screenshot({ path: `${out}/d${d}-dig.png` });
  if (d === 3) {
    await ev(() => { const o = window.__ow, s = o.village().digAt; o.focusAt((s.edge.x + s.pile.x) / 2, s.pile.y + 0.5, (s.edge.z + s.pile.z) / 2); o.view(Math.atan2(s.pile.x - s.into.x, s.pile.z - s.into.z) + 1.3, 0.25, 7); });
    for (const n of 'abcd') { await W(1300); await page.screenshot({ path: `${out}/dig-${n}.png` }); }
    console.log('digging:', JSON.stringify(await state()));
    // Picking a shovel up out of the heap: everyone's sent off, and comes back for one.
    await ev(() => { const v = window.__ow.village(); v.dig(v.digAt, v.onToss); for (const [k, l] of v.life.entries()) if (!v.taken[k]) { v.settleHome(k); l.t = 99; v.spirits[k].teleport(v.digSpot(k % 2, false)); v.goDig(k); } });
    for (let n = 0; n < 12; n++) { await W(350); await page.screenshot({ path: `${out}/grab-${String(n).padStart(2, '0')}.png` }); }
  }
}
// Solid: what's underfoot on the heap and on a stack of boards, and a body pushed out of a stack's side.
console.log('solid:', JSON.stringify(await ev(() => {
  const o = window.__ow, v = o.village(), THREE = null, r = {};
  const h = v.houses.find((q) => q.stack);
  if (v.digAt) r.heapTop = +(v.surface(v.digAt.pile.x, v.digAt.pile.z, 1e4, 0.3, 0) - v.digAt.pile.y).toFixed(2);
  if (h) { r.stackTop = +(v.surface(h.stack.x, h.stack.z, 1e4, 0.3, 0) - h.stack.y).toFixed(2); const p = h.stack.clone(); p.y += 0.05; p.x += 0.2; const vel = p.clone().set(0, 0, 0); v.push(p, vel, 0.3); r.pushedOut = +Math.hypot(p.x - h.stack.x, p.z - h.stack.z).toFixed(2); }
  return r;
})));
// Back from away by day: everyone found at a station (nobody on the way to one).
await ev(() => { const o = window.__ow, v = o.village(); o.setHour(11); o.teleport(v.site.lane[0].x + 400, v.site.lane[0].z); });
await W(1500);
await ev(() => { const o = window.__ow, m = o.village().site.lane[0]; o.teleport(m.x + 100, m.z); });
await W(700);
console.log('back by day:', (await state()).doing);
// Night: round the hearth in your cabin (or in their own house, if it's whole).
await ev(() => { const o = window.__ow, v = o.village(); o.setHour(23); o.teleport(v.site.lane[0].x + 400, v.site.lane[0].z); });
await W(1500);
// (For the picture, everyone home sleeps at yours, as if no house were whole yet.)
await ev(() => { const o = window.__ow, v = o.village(), st = o.story(), a = st.anchor('hearthSpot'), s = st.site; for (const h of v.houses) h.smashed = true; o.rig.root.visible = true; o.teleport(a.x, a.z); o.focusAt(a.x, a.y + 0.7, a.z); o.view(s.rot + 0.5, 0.7, 9); });
await ev(() => window.__ow.setHour(23));
await W(4000);
console.log('night:', JSON.stringify(await ev(() => { const v = window.__ow.village(); return v.life.map((l, k) => (v.taken[k] ? '-' : l.doing + (v.spirits[k].group.visible ? '' : '(in)'))).join(' '); })));
await page.screenshot({ path: `${out}/night-hearth.png` });
// And morning: out again.
await ev(() => { window.__ow.setHour(8); });
await W(9000);
console.log('morning:', (await state()).doing);
await browser.close(); server.close();
