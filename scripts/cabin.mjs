// Cabin close-ups, broken and repaired:
//   node scripts/cabin.mjs <outdir> [seed=hilda] [tag=x]
// Needs a build (npx vite build).
import { chromium } from 'playwright';
import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path';
const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const args = process.argv.slice(2);
const out = args[0] ?? 'shots/cabin';
const seed = args.find((a) => a.startsWith('seed='))?.slice(5) ?? 'hilda';
const tag = args.find((a) => a.startsWith('tag='))?.slice(4) ?? '';
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
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
page.on('pageerror', (e) => console.log('[pageerror]', e.message));
page.on('console', (m) => { if (m.type() === 'error') console.log('[page]', m.text().slice(0, 300)); });
const W = (ms) => page.waitForTimeout(ms);
const ev = (f, a) => page.evaluate(f, a);
await page.goto(`http://localhost:${server.address().port}/?seed=${seed}&story=1&fresh=1&mobs=0&capture=1&ui=0&t=11`);
for (let i = 0; i < 160; i++) { if (await ev(() => window.__ow?.ready())) break; await W(250); }
await W(1000);
// Move the explorer out of frame, then orbit the cabin.
const views = [['front', 0.5, 0.2, 13], ['side', 1.4, 0.35, 12], ['back', 3.3, 0.3, 13], ['left', -1.3, 0.2, 11], ['roof', 0.2, 0.75, 12]];
const orbit = async (state) => {
  for (const [n, yaw, pitch, dist] of views) {
    await ev(([yaw, pitch, dist]) => {
      const s = window.__ow.story().site;
      window.__ow.focusAt(s.x, s.y + 2.2, s.z);
      window.__ow.view(s.rot + yaw, pitch, dist);
    }, [yaw, pitch, dist]);
    await W(600);
    await page.screenshot({ path: `${out}/${state}-${n}${tag}.png` });
  }
};
await ev(() => { const s = window.__ow.story().site; window.__ow.teleport(s.x + 30, s.z + 30); });
await W(800);
await orbit('broken');
await ev(() => { const c = window.__ow.story().cabin; for (const id of ['roof', 'door', 'chimney']) c.setBuilt(id); c.light(true); });
await W(2500);
await orbit('fixed');
await browser.close();
server.close();
