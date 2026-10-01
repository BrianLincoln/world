// The village (giant slice 1, step 3): node scripts/village.mjs <outdir> [seed=hilda] [survey]
//   The lane from above, from the yard and from its far end, by day, at dusk
//   and at night; a house at eye level; a footprint on a house plot for scale.
//   `survey` prints which of forty seeds get a lane, and how many plots.
// Needs a build (npx vite build).
import { chromium } from 'playwright';
import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path';
const root = process.cwd();
const args = process.argv.slice(2);
const out = args[0] ?? 'shots/village';
const seed = args.find((a) => a.startsWith('seed='))?.slice(5) ?? 'hilda';
fs.mkdirSync(out, { recursive: true });
const server = http.createServer((req, res) => {
  const p = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  const f = path.join(root, 'dist', p === '/' ? 'index.html' : p);
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
const settle = async () => { for (let i = 0; i < 80; i++) { await W(200); if (await ev(() => window.__ow.ready())) break; } await W(400); };
await page.goto(`http://localhost:${server.address().port}/?seed=${seed}&story=1&fresh=1&mobs=0&bikes=0&drak=0&capture=1&ui=0&t=10.5&paused=1`);
for (let i = 0; i < 160; i++) { if (await ev(() => window.__ow?.ready())) break; await W(250); }
await W(1000);

if (args.includes('survey')) {
  let none = 0, short = 0, plots = 0, n = 0;
  for (let i = 0; i < 40; i++) {
    const r = await ev((s) => {
      const o = window.__ow;
      o.setSeed(s);
      const st = o.gen().story, v = st.village;
      if (!v) return null;
      let len = 0;
      for (let k = 1; k < v.lane.length; k++) len += Math.hypot(v.lane[k].x - v.lane[k - 1].x, v.lane[k].z - v.lane[k - 1].z);
      return { len: Math.round(len), plots: v.plots.length };
    }, `survey${i}`);
    n++;
    if (!r) none++; else { plots += r.plots; if (r.len < 115) short++; }
    console.log(`survey${i}`, r ? `${r.len} m, ${r.plots} plots` : 'NO LANE');
  }
  console.log(`${n} seeds: ${none} with no lane, ${short} with the short lane, ${(plots / (n - none)).toFixed(1)} plots on average`);
  await browser.close(); server.close();
  process.exit(0);
}

// The guide's house mended and lit: the village as it is just before the giant comes.
const info = await ev(() => {
  const o = window.__ow, st = o.story(), s = st.site, v = s.village;
  for (const id of ['roof', 'door', 'chimney']) st.cabin.setBuilt(id);
  st.cabin.light(true);
  o._orbit.maxDistance = 600;
  if (!v) return null;
  const a = v.lane[0], b = v.lane[v.lane.length - 1];
  window.__lane = { a, b, m: v.lane[Math.floor(v.lane.length / 2)], yaw: Math.atan2(b.x - a.x, b.z - a.z) };
  return { plots: v.plots.length, houses: v.plots.filter((p) => p.house).length };
});
console.log(seed, info ?? 'no village on this seed');
if (!info) { await browser.close(); server.close(); process.exit(0); }
const TIMES = [['day', 10.5], ['dusk', 18.6], ['night', 23]];
const shoot = async (name, times = TIMES) => {
  await settle();
  for (const [tn, h] of times) {
    await ev((h) => window.__ow.setHour(h), h);
    await W(500);
    await page.screenshot({ path: `${out}/${name}-${tn}.png` });
  }
};
// From above and to one side: the whole lane, the cabin at its head.
await ev(() => { const o = window.__ow, L = window.__lane; o.rig.root.visible = false; o.teleport(L.m.x, L.m.z); o.focusAt(L.m.x, o.height(L.m.x, L.m.z) + 2, L.m.z); o.view(L.yaw + 1.1, 0.55, 150); });
await shoot('above');
// Standing in the yard, looking down the lane.
await ev(() => { const o = window.__ow, L = window.__lane; o.rig.root.visible = true; o.focusAt(null); o.teleport(L.a.x + Math.sin(L.yaw) * 6, L.a.z + Math.cos(L.yaw) * 6); o.body.heading = L.yaw; o.view(L.yaw + Math.PI + 0.12, 0.2, 13); });
await shoot('lane');
// From the far end, looking back up it to the cabin.
await ev(() => { const o = window.__ow, L = window.__lane; o.teleport(L.b.x, L.b.z); o.body.heading = L.yaw + Math.PI; o.view(L.yaw - 0.15, 0.24, 16); });
await shoot('back', [['day', 10.5], ['night', 23]]);
// Eye level by each of the three kinds of house.
for (const v of [0, 1, 2]) {
  const ok = await ev((v) => {
    const o = window.__ow, h = o.village().houses.find((q) => q.plot.variant === v);
    if (!h) return false;
    const r = h.plot.rot, fx = Math.sin(r), fz = Math.cos(r);
    o.teleport(h.door.x + fx * 1.6 + fz * 1.8, h.door.z + fz * 1.6 - fx * 1.8);
    o.body.heading = r + Math.PI + 0.5;
    o.view(r + 0.5, 0.14, 9);
    return true;
  }, v);
  if (ok) await shoot(`house-${v}`, [['day', 10.5]]);
}
// A footprint on a house, for scale (nothing is smashed yet: that's the next step).
await ev(() => {
  const o = window.__ow, L = window.__lane, h = o.village().houses[2];
  o.trail.stamp({ x: h.plot.x - Math.sin(L.yaw) * 3.4, z: h.plot.z - Math.cos(L.yaw) * 3.4 }, L.yaw);
  o.rig.root.visible = false;
  o.focusAt(h.plot.x, h.plot.y + 1, h.plot.z);
  o.view(L.yaw + 0.9, 0.7, 55);
});
await shoot('foot', [['day', 10.5]]);
await browser.close(); server.close();
