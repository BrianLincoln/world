// How sparks look: node scripts/spark-look.mjs <dir> [seed]     (serves $DIST)
//   One lying in warm land (day, far off, night), one woken and on its way to the jar (frames), and the HUD's jar as it fills.
import { chromium } from 'playwright';
import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path';
const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const out = process.argv[2] ?? 'shots/spark-look', seed = process.argv[3] ?? 'hilda';
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
for (const [name, t] of [['day', 10], ['night', 23]]) {
  const page = await browser.newPage({ viewport: { width: 1600, height: 900 } });
  page.on('pageerror', (e) => console.log('[pageerror]', e.message));
  await page.goto(`http://localhost:${server.address().port}/?seed=${seed}&story=0&t=${t}&mobs=0&fresh=1&ui=0&capture=1&paused=1&cold=1`);
  for (let i = 0; i < 160; i++) { if (await page.evaluate(() => window.__ow?.ready())) break; await page.waitForTimeout(250); }
  const ev = (f, a) => page.evaluate(f, a);
  const at = await ev(() => {
    const o = window.__ow, S = o.sparks, home = o.gen().towers.home;
    o.beacons.debugSet('none'); o.beacons.setLit(home.id, true); o.manual(true); o.advance(600, 1 / 30);
    const s = S.left.find((q) => q.tower === home.id);
    o.teleport(s.x + 5, s.z + 3); o.focusAt(s.x, s.y + 1.0, s.z); o.view(0.9, 0.12, 8); o.advance(30, 1 / 30);
    return [s.x, s.y, s.z];
  });
  await page.screenshot({ path: `${out}/${name}-1-rest.png` });
  await ev(([x, y, z]) => { const o = window.__ow; o.teleport(x + 60, z + 36); o.focusAt(x, y + 1, z); o.view(0.9, 0.16, 34); o.advance(30, 1 / 30); }, at);
  await page.screenshot({ path: `${out}/${name}-2-far.png` });
  // Walk onto it and watch it go.
  await ev(([x, y, z]) => { const o = window.__ow; o.focusAt(null); o.teleport(x + 2.5, z + 1); o.view(0.9, 0.25, 6.5); o.advance(2, 1 / 30); }, at);
  for (let i = 0; i < 7; i++) {
    await page.screenshot({ path: `${out}/${name}-3-take-${i}.png` });
    await ev(() => window.__ow.advance(6, 1 / 30));
  }
  if (name === 'day') {
    for (const n of [0, 1, 3, 5, 8, 11]) {
      await ev((k) => { const S = window.__ow.sparks; S.give(-99); S.give(k); window.__ow.advance(2, 1 / 30); }, n);
      await page.screenshot({ path: `${out}/hud-${n}.png`, clip: { x: 0, y: 690, width: 240, height: 120 } });
    }
  }
  await page.close();
}
await browser.close(); server.close();
