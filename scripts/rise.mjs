// The giant getting up, close to: node scripts/rise.mjs <dir> [seed=hilda] [dist=210] [face=1.2]
//   Stands a giant in clear view (`__ow.giantAhead`), lays it down (`settle`), and has it get up (`rise`): a shot
//   every 0.6 s from 150 m off, in the air, three-quarters on. `face`: its heading relative to facing you (0: toward you; 1.57: side on).
//   Then it lies down again (the same, backwards). Uses the build in dist/ (run `npx vite build` first).
import { chromium } from 'playwright';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const args = process.argv.slice(2), dir = args[0] ?? 'shots/rise';
const arg = (k, d) => args.find((a) => a.startsWith(k + '='))?.slice(k.length + 1) ?? d;
fs.mkdirSync(dir, { recursive: true });
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
await page.goto(`http://localhost:${server.address().port}/?seed=${arg('seed', 'hilda')}&story=0&ui=0&capture=1&drak=0&mobs=0&t=10`);
for (let i = 0; i < 200; i++) { if (await page.evaluate(() => window.__ow?.ready())) break; await page.waitForTimeout(250); }
await page.evaluate(([d, f]) => { const ow = window.__ow; ow.manual(true); const g = ow.giantAhead(d, f); g.settle(); const h = g.heading + 1.15, x = g.origin.x + Math.sin(h) * 150, z = g.origin.z + Math.cos(h) * 150; ow.teleport(x, z); ow.setMode('fly', Math.max(26, ow.height(g.origin.x, g.origin.z) + 30 - ow.height(x, z))); ow.view(Math.atan2(x - g.origin.x, z - g.origin.z), 0.0, 5); ow.advance(20); ow._rig.root.visible = false; ow.advance(1); }, [parseFloat(arg('dist', '210')), parseFloat(arg('face', '1.2'))]);
for (let i = 0; i < 30; i++) { await page.waitForTimeout(150); await page.evaluate(() => window.__ow.advance(2)); if (await page.evaluate(() => window.__ow.ready())) break; }
const shot = async (n) => { await page.screenshot({ path: path.join(dir, n + '.png') }); };
await shot('r-00');
await page.evaluate(() => window.__ow.giant().rise());
for (let i = 1; i <= 17; i++) { await page.evaluate(() => window.__ow.advance(36)); await shot(`r-${String(i).padStart(2, '0')}`); }
await page.evaluate(() => { window.__ow.giant().dormant = true; });
for (let i = 1; i <= 8; i++) { await page.evaluate(() => window.__ow.advance(72)); await shot(`d-${String(i).padStart(2, '0')}`); }
await browser.close(); server.close();
