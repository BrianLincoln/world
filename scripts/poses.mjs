// Character action shots (drives the keyboard): node scripts/poses.mjs <outdir> [idle,run,jump,glide]
// Needs a build (npx vite build). Tile with scripts/sheet.mjs.
import { chromium } from 'playwright';
import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path';
const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const [out, only] = process.argv.slice(2);
const server = http.createServer((req, res) => {
  const p = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  const f = path.join(root, 'dist', p === '/' ? 'index.html' : p);
  if (!fs.existsSync(f)) { res.writeHead(404); res.end(); return; }
  res.writeHead(200, { 'content-type': f.endsWith('.js') ? 'text/javascript' : f.endsWith('.html') ? 'text/html' : f.endsWith('.css') ? 'text/css' : 'application/octet-stream' });
  fs.createReadStream(f).pipe(res);
});
await new Promise((r) => server.listen(0, r));
const browser = await chromium.launch({ args: ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: 1200, height: 800 } });
page.on('pageerror', (e) => console.log('[pageerror]', e.message));
page.on('console', (m) => { if (m.type()==='error') console.log('[page]', m.text().slice(0, 300)); });
const K = page.keyboard;
const shot = (n) => page.screenshot({ path: `${out}/${n}.png` });
const go = async (q) => {
  await page.goto(`http://localhost:${server.address().port}/?${q}&ui=0&paused=1&capture=1`);
  for (let i = 0; i < 120; i++) { if (await page.evaluate(() => window.__ow?.ready())) break; await page.waitForTimeout(250); }
  await page.waitForTimeout(500);
};
const scen = {
  async idle() { await go('seed=hilda&t=10&pitch=0.08&dist=5.5&yaw=0.2'); await page.waitForTimeout(800); await shot('idle-back');
    await K.down('KeyS'); await page.waitForTimeout(120); await K.up('KeyS'); await page.waitForTimeout(1200); await shot('idle-front'); 
    await K.down('KeyA'); await page.waitForTimeout(120); await K.up('KeyA'); await page.waitForTimeout(1200); await shot('idle-side'); },
  async run() { await go('seed=hilda&t=10&pitch=0.1&dist=7&yaw=0.2');
    await K.down('KeyS'); await page.waitForTimeout(900); await shot('jog-front1'); await page.waitForTimeout(137); await shot('jog-front2');
    await K.down('ShiftLeft'); await page.waitForTimeout(900); await shot('sprint-front1'); await page.waitForTimeout(113); await shot('sprint-front2');
    await K.up('KeyS'); await K.down('KeyA'); await page.waitForTimeout(700); await shot('sprint-side1'); await page.waitForTimeout(90); await shot('sprint-side2');
    await K.up('ShiftLeft'); await page.waitForTimeout(700); await shot('jog-side1'); await page.waitForTimeout(110); await shot('jog-side2');
    await K.down('AltLeft'); await page.waitForTimeout(900); await shot('walk-side1'); await page.waitForTimeout(200); await shot('walk-side2'); await K.up('AltLeft'); await K.up('KeyA'); },
  async jump() { await go('seed=hilda&t=10&pitch=0.1&dist=7&yaw=0.2');
    await K.down('KeyA'); await page.waitForTimeout(600); await K.down('Space'); await page.waitForTimeout(150); await shot('jump-rise');
    await page.waitForTimeout(250); await shot('jump-apex'); await page.waitForTimeout(250); await shot('jump-fall'); await K.up('Space');
    await page.waitForTimeout(90); await shot('jump-land'); await page.waitForTimeout(60); await shot('jump-land2'); await K.up('KeyA'); },
  async glide() { await go('seed=hilda&t=10&pitch=0.15&dist=10&yaw=0.2');
    await page.evaluate(() => { window.__ow.setMode('walk'); window.__ow.body.pos.y += 40; window.__ow.body.grounded = false; });
    await page.waitForTimeout(700); await shot('fall');
    await K.press('Space'); await page.waitForTimeout(100); await shot('glide-open'); await page.waitForTimeout(700); await shot('glide');
    await K.down('KeyA'); await page.waitForTimeout(1200); await shot('glide-turn'); await K.up('KeyA');
    await K.down('KeyW'); await page.waitForTimeout(1500); await shot('glide-back'); await K.up('KeyW'); },
};
for (const [n, f] of Object.entries(scen)) if (!only || only.split(',').includes(n)) await f();
await browser.close(); server.close();
