// The cold up the mountains: node scripts/peaks.mjs <dir> [seed=hilda]
//   Finds the highest ground near the start and looks at it: from the valley, from just under the cold line,
//   from the top, and the top at night. Serves $DIST (build to your own folder).
import { chromium } from 'playwright';
import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path';
const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const args = process.argv.slice(2);
const out = args[0] ?? 'shots/peaks';
const seed = args.find((a) => a.startsWith('seed='))?.slice(5) ?? 'hilda';
fs.mkdirSync(out, { recursive: true });
const server = http.createServer((req, res) => {
  const p = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  const d = process.env.DIST ?? 'dist';
  const f = path.join(path.isAbsolute(d) ? d : path.join(root, d), p === '/' ? 'index.html' : p);
  if (!fs.existsSync(f)) { res.writeHead(404); res.end(); return; }
  res.writeHead(200, { 'content-type': f.endsWith('.js') ? 'text/javascript' : f.endsWith('.html') ? 'text/html' : f.endsWith('.css') ? 'text/css' : 'application/octet-stream' });
  fs.createReadStream(f).pipe(res);
});
await new Promise((r) => server.listen(0, r));
const browser = await chromium.launch({ args: ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: 1600, height: 900 } });
page.on('pageerror', (e) => console.log('[pageerror]', e.message));
page.on('console', (m) => { if (m.type() === 'error' && !m.text().includes('useProgram')) console.log('[console]', m.text().slice(0, 300)); });
await page.goto(`http://localhost:${server.address().port}/?seed=${seed}&story=0&t=9.5&mobs=0&fresh=1&ui=0&capture=1`);
for (let i = 0; i < 120; i++) { if (await page.evaluate(() => window.__ow?.ready())) break; await page.waitForTimeout(250); }
const W = (ms) => page.waitForTimeout(ms);
const ev = (f, a) => page.evaluate(f, a);
const idle = async () => { let ok = 0; for (let i = 0; i < 150 && ok < 4; i++) { ok = (await ev(() => window.__ow.ready())) ? ok + 1 : 0; await W(200); } await W(500); };
const shot = async (name) => { await W(300); await page.screenshot({ path: `${out}/${name}.png` }); console.log(name); };
// The highest ground within 3 km of the start, the way down from it, and how much of the land is above the line.
const spot = await ev(() => {
  const o = window.__ow, g = o.gen(), top = o.post.cold.top;
  let best = { h: -1 }, n = 0, hi = 0;
  for (let x = g.story.x - 3000; x <= g.story.x + 3000; x += 40) for (let z = g.story.z - 3000; z <= g.story.z + 3000; z += 40) {
    const h = g.height(x, z); n++; if (h > top) hi++;
    if (h > best.h) best = { x, z, h };
  }
  // Downhill from the top till the ground is at the line, and on till it's well under.
  const walk = (to) => { let { x, z } = best; for (let i = 0; i < 400 && g.height(x, z) > to; i++) { let b = null; for (let a = 0; a < 16; a++) { const nx = x + Math.cos(a * Math.PI / 8) * 12, nz = z + Math.sin(a * Math.PI / 8) * 12, h = g.height(nx, nz); if (!b || h < b.h) b = { x: nx, z: nz, h }; } x = b.x; z = b.z; } return { x, z, h: g.height(x, z) }; };
  return { best, line: walk(top - 6), low: walk(top - 110), share: hi / n, top };
});
console.log(`cold above ${spot.top} m: ${(spot.share * 100).toFixed(1)}% of the land within 3 km; top ${spot.best.h.toFixed(0)} m at ${spot.best.x},${spot.best.z}`);
const at = async (p, pitch, dist, toward) => {
  await ev(([p, pitch, dist, t]) => { const o = window.__ow; o.focusAt(null); o.teleport(p.x, p.z); o.view(Math.atan2(t.x - p.x, t.z - p.z) + Math.PI, pitch, dist); }, [p, pitch, dist, toward]);
  await idle();
};
// From the air a kilometre off: the mountain as a landmark.
{
  const dx = spot.low.x - spot.best.x, dz = spot.low.z - spot.best.z, l = Math.hypot(dx, dz) || 1;
  const far = { x: spot.best.x + dx / l * 1500, z: spot.best.z + dz / l * 1500 };
  await ev(([p, t]) => { const o = window.__ow; o.focusAt(null); o.teleport(p.x, p.z); o.setMode('fly', 130); o.view(Math.atan2(t.x - p.x, t.z - p.z) + Math.PI, -0.12, 10); }, [far, spot.best]);
  await idle(); await shot('0-far');
  await ev(() => window.__ow.setMode('walk'));
}
await at(spot.low, 0.02, 14, spot.best); await shot('1-from-below');
await at(spot.line, 0.1, 16, spot.best); await shot('2-at-the-line');
await at(spot.best, 0.22, 18, spot.low); await shot('3-top');
console.log('warm at low / line / top:', await ev((s) => [s.low, s.line, s.best].map((p) => window.__ow.warmth?.warmAt?.(p.x, p.z)), spot));
await ev(() => window.__ow.setHour(22.5)); await shot('4-top-night');
await browser.close(); server.close();
