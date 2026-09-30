// The gift shot, frame-stepped: node scripts/giftshot.mjs <dir> [seed=fjord]
// Frames through the spirit conjuring the bike (the camera is the spirit's),
// then checks it waits while you're inside the cabin.
import { chromium } from 'playwright';
import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path';
const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const args = process.argv.slice(2);
const out = args[0] ?? 'shots/giftshot';
const opt = (k, d) => args.find((a) => a.startsWith(k + '='))?.slice(k.length + 1) ?? d;
const seed = opt('seed', 'fjord');
fs.mkdirSync(out, { recursive: true });
const server = http.createServer((req, res) => { const p = decodeURIComponent(new URL(req.url, 'http://x').pathname); const f = path.join(root, 'dist', p === '/' ? 'index.html' : p); if (!fs.existsSync(f)) { res.writeHead(404); res.end(); return; } res.writeHead(200, { 'content-type': f.endsWith('.js') ? 'text/javascript' : f.endsWith('.html') ? 'text/html' : 'application/octet-stream' }); fs.createReadStream(f).pipe(res); });
await new Promise((r) => server.listen(0, r));
const browser = await chromium.launch({ args: ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
page.on('pageerror', (e) => console.log('[pageerror]', e.message));
await page.goto(`http://localhost:${server.address().port}/?seed=${seed}&story=1&fresh=1&journey=gift&t=15&mobs=0&ui=0&capture=1`);
for (let i = 0; i < 120; i++) { if (await page.evaluate(() => window.__ow?.ready())) break; await page.waitForTimeout(250); }
const state = () => page.evaluate(() => { const j = window.__ow.journey(); return { busy: j.busy, gift: window.__ow.bikes.bikes.has('gift') }; });
let n = 0;
const snap = async (name) => { await page.screenshot({ path: `${out}/${String(n++).padStart(2, '0')}-${name}.png` }); };
await page.evaluate(() => window.__ow.manual(true));
// Inside the cabin: it must wait.
await page.evaluate(() => { const ow = window.__ow, c = ow.gen().story; ow.journeyJump('gift'); ow.teleport(c.x, c.z); ow.advance(60 * 30); });
console.log('inside after 30s', await state());
await snap('inside-waits');
// Out in the yard: the shot.
await page.evaluate(() => { const ow = window.__ow, j = ow.gen().journey.toHome; ow.teleport(j[0][0] + 3, j[0][1] + 3); });
for (let i = 0; i < 12; i++) {
  await page.evaluate(() => window.__ow.advance(30));
  console.log(`t+${(i + 1) * 0.5}s`, await state());
  await snap(`yard-${(i + 1) * 5}`);
}
await browser.close(); server.close();
