// The chores at a house being built again: sawing at the sawhorse, nailing a
// board up off the ladder, carrying in what lies about (story/village.ts, `chore`).
//   node scripts/chores.mjs <outdir> [seed=hilda] [t=10.5] [only=yard,saw,nail,haul,mill]
//   yard-<i>.png: each yard as it's found; saw-NN / nail-NN / haul-NN: one spirit put to
//   that chore, close up, a frame every 0.4 s; mill-N.png: everyone left to it for a while.
// Prints what each is doing as it goes. Uses the build in dist/, or in $DIST.
import { chromium } from 'playwright';
import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path';
const root = process.cwd(); const out = process.argv[2];
const arg = (k, d) => process.argv.find((a) => a.startsWith(k + '='))?.slice(k.length + 1) ?? d;
const only = arg('only', 'yard,saw,nail,haul,mill').split(',');
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
await page.goto(`http://localhost:${server.address().port}/?seed=${arg('seed', 'hilda')}&story=1&fresh=1&cp=ring2&mobs=0&bikes=0&drak=0&capture=1&ui=0&t=${arg('t', '10.5')}`);
for (let i = 0; i < 200; i++) { if (await ev(() => window.__ow?.ready())) break; await W(250); }
await W(2500);
// Three dungeons done: three home, houses at 4 3 1 0 0.
await ev(() => { const o = window.__ow, v = o.village(); for (const d of [2, 3]) { v.comeHome(d - 1); o.mend(d); } o.rig.root.visible = false; const m = v.site.lane[2]; o.teleport(m.x, m.z); });
await W(2500);
// (A `!` after anyone who's inside a house's walls and not on a ladder: there should never be one.)
const doing = () => ev(() => { const v = window.__ow.village(); const inside = (k) => v.spirits[k].group.visible && !['climb', 'place', 'hammer', 'rest', 'down'].includes(v.life[k].job?.stage) && v.houses.some((h) => { if (h.step < 2) return false; const l = v.local(h, v.spirits[k].pos.x, v.spirits[k].pos.z, {}); return Math.abs(l.x) < h.hw + 0.2 && Math.abs(l.z) < h.hd + 0.2 && !['in', 'inside', 'out'].includes(v.life[k].doing); }); return v.life.map((l, k) => (v.taken[k] ? '-' : (l.job ? `${l.job.kind}:${l.job.stage}@${l.job.yard.i}` : l.doing) + (inside(k) ? '!' : ''))).join(' '); });
console.log('steps:', await ev(() => window.__ow.village().houses.map((h) => h.step).join(' ')), '| yards:', await ev(() => window.__ow.village().yards.map((y) => (y ? (y.ladder ? 'L' + y.climb.map((c) => c.toFixed(2)).join('/') : 'y') : '-')).join(' ')));
/** Everyone else sat at home, and `k` put to `kind` in house `i`'s yard, there already. */
const put = (k, i, kind) => ev(([k, i, kind]) => {
  const v = window.__ow.village(), y = v.yards[i];
  for (const [n, l] of v.life.entries()) if (!v.taken[n]) { v.putDown(n); v.quit(n); v.settleHome(n); l.t = 999; v.spirits[n].teleport(l.spot); }
  const l = v.life[k], s = v.spirits[k];
  l.job = { kind, yard: y, stage: '', t: 0, left: 2, seen: 0, n: 0, thing: null, piece: null };
  if (kind === 'saw') { y.sawyer = k; v.walk(k, 'to', y.sawAt, y.sawFace); }
  else if (kind === 'nail') { y.nailer = k; v.walk(k, 'to', y.fetchAt, y.h.stack); }
  else { const p = v.debris(y, y.h.stack); if (!p) return false; s.teleport(p.pos.clone().add({ x: 3, y: 0, z: 0 })); v.fetch(k, p); }
  s.teleport(s.want.at.clone());
  return true;
}, [k, i, kind]);
/** The camera on `k`, from `yaw` off the way house `i` faces. */
const watch = (k, i, yaw, pitch, dist, up = 0.5) => ev(([k, i, yaw, pitch, dist, up]) => { const o = window.__ow, v = o.village(), s = v.spirits[k], h = v.houses[i]; o.focusAt(s.pos.x, s.pos.y + up, s.pos.z); o.view(h.plot.rot + yaw, pitch, dist); }, [k, i, yaw, pitch, dist, up]);
const frames = async (name, n, k, i, yaw, pitch, dist, ms = 400, up = 0.5) => {
  for (let f = 0; f < n; f++) { await watch(k, i, yaw, pitch, dist, up); await W(ms); await page.screenshot({ path: `${out}/${name}-${String(f).padStart(2, '0')}.png` }); const d = await doing(); if (f % 4 === 0 || d.includes('!')) console.log(name, f, d); }
};
if (only.includes('yard')) {
  for (const i of await ev(() => window.__ow.village().yards.map((y, i) => (y ? i : -1)).filter((i) => i >= 0))) {
    await ev((i) => { const o = window.__ow, h = o.village().houses[i]; o.focusAt(h.plot.x, h.plot.y + 1, h.plot.z); o.view(h.plot.rot + 0.5, 0.45, 15); }, i);
    await W(1200);
    await page.screenshot({ path: `${out}/yard-${i}.png` });
    await ev((i) => { const o = window.__ow, h = o.village().houses[i]; o.focusAt(h.plot.x, h.plot.y + 1, h.plot.z); o.view(h.plot.rot - 1.1, 0.4, 13); }, i);
    await W(600);
    await page.screenshot({ path: `${out}/yard-${i}-b.png` });
  }
}
if (only.includes('saw')) { await put(0, 1, 'saw'); await frames('saw', 26, 0, 1, -0.55, 0.3, 3.6, 400, 0.3); }
if (only.includes('nail')) { await put(1, 1, 'nail'); await frames('nail', 40, 1, 1, -0.75, 0.2, 5.5, 400, 0.6); }
if (only.includes('haul')) {
  if (await put(2, 1, 'haul')) {
    await frames('haul', 6, 2, 1, 0.6, 0.35, 5, 400);
    // (The walk in is long: it's put down near the pile.)
    await ev(() => { const v = window.__ow.village(), s = v.spirits[2], at = s.want.at; s.teleport(at.clone().add({ x: 0, y: 0, z: 0 }).lerp(s.pos, 3.5 / Math.max(3.5, s.pos.distanceTo(at)))); });
    await frames('haul-in', 10, 2, 1, 0.6, 0.35, 6, 400);
  } else console.log('haul: nothing lying about');
}
if (only.includes('mill')) {
  await ev(() => { const o = window.__ow, v = o.village(); for (const [n, l] of v.life.entries()) if (!v.taken[n]) { v.quit(n); v.settleHome(n); l.t = 0.2 + n; } const h = v.houses[1]; o.focusAt(h.plot.x, h.plot.y + 1, h.plot.z); o.view(h.plot.rot + 0.3, 0.5, 24); });
  for (let n = 0; n < 10; n++) { await W(6000); await page.screenshot({ path: `${out}/mill-${n}.png` }); console.log('mill', n, await doing()); }
}
await browser.close(); server.close();
