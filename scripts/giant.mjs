// Giant shots: node scripts/giant.mjs <outdir> [skyline,walk,close] [query]
//   skyline: standing, at three distances and three times of day (plus night).
//   walk: frame-stepped across the view at the middle distance.
//   close: the face and the body from near by.
// Needs a build (npx vite build).
import { chromium } from 'playwright';
import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path';
const root = process.cwd();
const [out, scenes = 'skyline,walk,close', q = 'seed=hilda'] = process.argv.slice(2);
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
await page.goto(`http://localhost:${server.address().port}/?${q}&t=10&story=0&ui=0&capture=1&mobs=0&paused=1`);
for (let i = 0; i < 120; i++) { if (await ev(() => window.__ow?.ready())) break; await W(250); }
await W(500);
const settle = async () => { for (let i = 0; i < 80; i++) { await W(200); if (await ev(() => window.__ow.ready())) break; } await W(300); };
// A vantage with a view: open, high ground near the start.
const vantage = await ev(() => {
  const o = window.__ow, g = o.gen(), p = o.body.pos;
  let best = -Infinity, at = null;
  for (let z = -1400; z <= 1400; z += 70) for (let x = -1400; x <= 1400; x += 70) {
    const X = p.x + x, Z = p.z + z, h = g.height(X, Z);
    if (h < 8 || h > 70) continue;
    let woods = 0, ring = 0;
    for (let a = 0; a < 6.28; a += 0.785) {
      woods = Math.max(woods, g.forestDensity(X + Math.cos(a) * 40, Z + Math.sin(a) * 40, h), g.forestDensity(X + Math.cos(a) * 110, Z + Math.sin(a) * 110, h));
      ring += g.height(X + Math.cos(a) * 350, Z + Math.sin(a) * 350) / 8;
    }
    if (Math.abs(g.height(X + 20, Z) - h) > 2.5 || Math.abs(g.height(X, Z + 20) - h) > 2.5 || Math.abs(g.height(X - 20, Z) - h) > 2.5 || Math.abs(g.height(X, Z - 20) - h) > 2.5) continue;
    const score = (h - ring) - woods * 80;
    if (score > best) { best = score; at = [X, Z]; }
  }
  if (at) o.teleport(at[0], at[1]);
  // From just over the treetops, the explorer out of shot.
  o.setMode('fly', 24);
  o.rig.root.visible = false;
  return at;
});
console.log('vantage', vantage);
await settle();
const TIMES = [['dawn', 7.1], ['day', 10.5], ['dusk', 18.4], ['night', 23]];
const want = (s) => scenes.split(',').includes(s);

if (want('skyline')) {
  for (const [tag, dist] of [['near', 240], ['mid', 650], ['far', 1600]]) {
    const ok = await ev((d) => { const g = window.__ow.giantAhead(d, 0.5); return !!g; }, dist);
    if (!ok) { console.log('no spot at', dist); continue; }
    await settle();
    for (const [tn, h] of TIMES) {
      await ev((h) => window.__ow.setHour(h), h);
      await W(350);
      await page.screenshot({ path: `${out}/skyline-${tag}-${tn}.png` });
    }
  }
}
if (want('walk')) {
  await ev(() => window.__ow.setHour(10.5));
  await ev(() => { const g = window.__ow.giantAhead(520, Math.PI / 2, true); g.hug = 0; });
  await settle();
  await ev(() => window.__ow.manual(true));
  // It crosses the view; the camera stays put on where it started.
  for (let i = 0; i < 10; i++) {
    await ev(() => window.__ow.advance(42, 1 / 60));
    await W(60);
    await page.screenshot({ path: `${out}/walk-${String(i).padStart(2, '0')}.png` });
  }
  await ev(() => window.__ow.manual(false));
}
if (want('prints')) {
  // It walks off over a rise by the cabin; then look at what it left.
  const info = await ev(() => {
    const o = window.__ow, g = o.gen(), st = g.story;
    // The way out of the yard that climbs most over 250 m, on dry open ground.
    let best = -Infinity, h = 0;
    for (let a = 0; a < 6.28; a += 0.2) {
      let low = Infinity, woods = 0;
      for (let d = 40; d <= 330; d += 20) { const y = g.height(st.x + Math.sin(a) * d, st.z + Math.cos(a) * d); low = Math.min(low, y); woods += g.forestDensity(st.x + Math.sin(a) * d, st.z + Math.cos(a) * d, y); }
      const rise = g.height(st.x + Math.sin(a) * 200, st.z + Math.cos(a) * 200) - g.height(st.x + Math.sin(a) * 60, st.z + Math.cos(a) * 60);
      const score = (low < 2 ? -100 : 0) + Math.min(rise, 25) * 0.3 - woods * 14;
      if (score > best) { best = score; h = a; }
    }
    const x = st.x + Math.sin(h) * 55, z = st.z + Math.cos(h) * 55;
    o.setMode('walk'); o.rig.root.visible = true;
    o.teleport(x + Math.sin(h) * 6 + Math.cos(h) * 24, z + Math.cos(h) * 6 - Math.sin(h) * 24);
    o.body.heading = h;
    o._orbit.maxDistance = 600;
    o.view(h + Math.PI + 0.45, 0.3, 60);
    const gi = o.summonGiant(x, z, h); gi.walking = true;
    return { h, x, z };
  });
  await settle();
  await ev(() => { window.__ow.setHour(10.5); window.__ow.manual(true); window.__ow.advance(60 * 24, 1 / 60); });
  await W(300);
  console.log('prints', await ev(() => window.__ow.trail.prints.list.length));
  for (const [tn, h] of TIMES) {
    await ev((h) => { window.__ow.setHour(h); window.__ow.advance(2, 1 / 60); }, h);
    await W(200);
    await page.screenshot({ path: `${out}/prints-trail-${tn}.png` });
  }
  // From above and to one side: the dotted line going over the rise.
  await ev(() => { const o = window.__ow; const L = o.trail.prints.list; const p = L[2]; o._orbit.maxDistance = 600; o.rig.root.visible = false; o.focusAt(p.x, o.height(p.x, p.z), p.z); o.view(o.giant().heading + Math.PI + 0.9, 0.5, 150); });
  for (const [tn, h] of [['day', 10.5], ['night', 23]]) {
    await ev((h) => { window.__ow.setHour(h); window.__ow.advance(2, 1 / 60); }, h);
    await W(200);
    await page.screenshot({ path: `${out}/prints-above-${tn}.png` });
  }
  // Down in one, for size.
  await ev(() => { const o = window.__ow; const L = o.trail.prints.list; const p = L[L.length - 2]; o.focusAt(null); o.rig.root.visible = true; o.teleport(p.x, p.z); o.view(p.heading + 2.4, 0.38, 24); o.setHour(10.5); o.advance(30, 1 / 60); });
  await W(200);
  await page.screenshot({ path: `${out}/prints-inside.png` });
  await ev(() => { const o = window.__ow; const L = o.trail.prints.list; const p = L[1]; o.teleport(p.x + 14, p.z + 6); o.view(p.heading + 2.0, 0.3, 22); o.advance(30, 1 / 60); });
  await W(200);
  await page.screenshot({ path: `${out}/prints-cool.png` });
  await ev(() => { window.__ow.manual(false); });
}
if (want('gait')) {
  // Walking, from the side: the camera travels with it.
  await ev(() => window.__ow.setHour(10.5));
  await ev(() => { const o = window.__ow; const g = o.giantAhead(260, Math.PI / 2, true); g.hug = 0; o._orbit.maxDistance = 600; o.setMode('fly', 30); });
  await settle();
  await ev(() => window.__ow.manual(true));
  for (let i = 0; i < 12; i++) {
    await ev((i) => { const o = window.__ow; const g = o.giant(); o.advance(22, 1 / 60); o.focusAt(g.centre.x, g.centre.y - 12, g.centre.z); o.view(g.heading + 1.45, 0.04, 230); o.advance(1, 1 / 60); }, i);
    await W(60);
    await page.screenshot({ path: `${out}/gait-${String(i).padStart(2, '0')}.png` });
  }
  await ev(() => { window.__ow.manual(false); window.__ow.focusAt(null); window.__ow.setMode('walk'); });
}
if (want('close')) {
  await ev(() => { window.__ow._orbit.maxDistance = 600; });
  await ev(() => window.__ow.setHour(10.5));
  await ev(() => { window.__ow.giantAhead(150, 0.35); });
  await ev(() => { const o = window.__ow; const g = o.giant(); o.setMode('fly', 30); o.focusAt(g.centre.x, g.centre.y, g.centre.z); o.view(o._cam ? Math.atan2(o.body.pos.x - g.centre.x, o.body.pos.z - g.centre.z) : 0, 0.05, 270); });
  await settle();
  await page.screenshot({ path: `${out}/close-body.png` });
  for (const [tag, yaw] of [['side', 1.5], ['back', 3.0]]) {
    await ev((y) => { const o = window.__ow; const g = o.giant(); o.view(g.heading + y, 0.08, 270); }, yaw);
    await W(500);
    await page.screenshot({ path: `${out}/close-${tag}.png` });
  }
  await ev(() => { const o = window.__ow; const g = o.giant(); o.focusAt(g.centre.x, g.centre.y + 22, g.centre.z); o.view(g.heading + 0.25, -0.05, 70); });
  await W(500);
  await page.screenshot({ path: `${out}/close-face.png` });
  await ev(() => { window.__ow.focusAt(null); });
}
await browser.close(); server.close();
