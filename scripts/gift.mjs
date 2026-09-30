// The gift moment, frame-stepped: node scripts/gift.mjs <dir> [seed=hilda]
import { chromium } from 'playwright';
import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path';
const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const args = process.argv.slice(2);
const out = args[0] ?? 'shots/gift';
const seed = args.find((a) => a.startsWith('seed='))?.slice(5) ?? 'hilda';
fs.mkdirSync(out, { recursive: true });
const server = http.createServer((req, res) => { const p = decodeURIComponent(new URL(req.url, 'http://x').pathname); const f = path.join(root, 'dist', p === '/' ? 'index.html' : p); if (!fs.existsSync(f)) { res.writeHead(404); res.end(); return; } res.writeHead(200, { 'content-type': f.endsWith('.js') ? 'text/javascript' : f.endsWith('.html') ? 'text/html' : 'application/octet-stream' }); fs.createReadStream(f).pipe(res); });
await new Promise((r) => server.listen(0, r));
const browser = await chromium.launch({ args: ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
page.on('pageerror', (e) => console.log('[pageerror]', e.message));
await page.goto(`http://localhost:${server.address().port}/?seed=${seed}&story=1&fresh=1&journey=gift&t=15&mobs=0&ui=0&capture=1`);
for (let i = 0; i < 120; i++) { if (await page.evaluate(() => window.__ow?.ready())) break; await page.waitForTimeout(250); }
await page.waitForTimeout(2000);
const bikesNear = () => page.evaluate(() => { const st = window.__ow.gen().story; return [...window.__ow.bikes.bikes.values()].filter((k) => Math.hypot(k.pos.x - st.x, k.pos.z - st.z) < 120).map((k) => k.key); });
console.log('bikes near cabin at start', await bikesNear());
await page.evaluate(() => { const ow = window.__ow; ow.manual(true); ow.journeyJump('gift'); ow.advance(2); const sp = ow.story().spirit.pos; const [gx, gz] = ow.gen().journey.toHome[0]; const mx = (sp.x + gx) / 2, mz = (sp.z + gz) / 2; const a = Math.atan2(gx - sp.x, gz - sp.z) + Math.PI / 2; ow.teleport(mx - Math.sin(a) * 5, mz - Math.cos(a) * 5); ow.focusAt(mx, ow.height(mx, mz) + 1.0, mz); ow.view(a, 0.15, 8); });
console.log('bikes near cabin before the gift', await bikesNear());
for (let i = 0; i < 400; i++) { if (await page.evaluate(() => { window.__ow.advance(1); return !!window.__ow.journey().conj; })) break; }
let t = 0;
for (const at of [0.3, 0.9, 1.5, 2.0, 2.3, 2.8, 4]) {
  await page.evaluate((n) => window.__ow.advance(n), Math.round((at - t) * 60)); t = at;
  await page.screenshot({ path: `${out}/${seed}-gift-${String(Math.round(at * 10)).padStart(2, '0')}.png` });
}
console.log('bikes near cabin after gift', await bikesNear(), 'stage', await page.evaluate(() => window.__ow.journey().stage));
await page.evaluate(() => { window.__ow.mountBike(); window.__ow.advance(60 * 5); });
await page.screenshot({ path: `${out}/${seed}-spirit-bike.png` });
console.log('after mount', await bikesNear(), await page.evaluate(() => window.__ow.journey().stage));
await browser.close(); server.close();
