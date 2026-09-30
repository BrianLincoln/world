// Patting the hearth spirit: node scripts/pat.mjs <outdir> [seed] [warmth] [camYaw]
// Stands the idle spirit in front of the explorer, presses E and steps the
// pat frame by frame from the side. Needs a build.
import { chromium } from 'playwright';
import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path';
const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const [out = 'shots/pat', seed = 'hilda'] = process.argv.slice(2);
fs.mkdirSync(out, { recursive: true });
const server = http.createServer((req, res) => {
  const p = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  const f = path.join(root, 'dist', p === '/' ? 'index.html' : p);
  if (!fs.existsSync(f)) { res.writeHead(404); res.end(); return; }
  res.writeHead(200, { 'content-type': f.endsWith('.js') ? 'text/javascript' : f.endsWith('.html') ? 'text/html' : 'application/octet-stream' });
  fs.createReadStream(f).pipe(res);
});
await new Promise((r) => server.listen(0, r));
const browser = await chromium.launch({ args: ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: 1000, height: 700 } });
const warmth = Number(process.argv[4] ?? 1);
// Camera yaw from the explorer's heading: ~1.7 = from the patting side, ~2.6 = over the shoulder.
const yaw = Number(process.argv[5] ?? 1.7);
await page.goto(`http://localhost:${server.address().port}/?seed=${seed}&story=1&fresh=1&mobs=0&capture=1&ui=1&t=11`);
for (let i = 0; i < 160; i++) { if (await page.evaluate(() => window.__ow?.ready())) break; await page.waitForTimeout(250); }
await page.waitForTimeout(1500);
await page.evaluate(([w, yaw]) => {
  const o = window.__ow; const s = o.story(); s.debugJump('axe');
  const b = o.body.pos; const sp = s.spirit;
  const h = o.body.heading;
  const p = b.clone(); p.x += Math.sin(h) * 1.2; p.z += Math.cos(h) * 1.2; p.y = o.height(p.x, p.z);
  sp.teleport(p); sp.want = { at: p.clone(), face: b.clone(), pose: 'stand', icon: null, lead: false, settled: true };
  sp.holdWarmth = w; sp.cancelActs();
  o.manual(true);
  o.focusAt((b.x + p.x) / 2, p.y + 0.6, (b.z + p.z) / 2);
  o.view(h + yaw, 0.12, 3);
}, [warmth, yaw]);
await page.evaluate(() => window.__ow.advance(60));
await page.screenshot({ path: `${out}/pat-0-offer.png` });
await page.keyboard.press('KeyE');
let t = 0;
for (const [n, at] of [['1-reach', 0.4], ['2-pat', 0.62], ['3-lift', 0.86], ['4-pat', 1.12], ['5-stroke', 1.9], ['6-joy', 2.5], ['7-after', 3.6]]) {
  await page.evaluate((k) => window.__ow.advance(k), Math.round((at - t) * 60));
  t = at;
  await page.screenshot({ path: `${out}/pat-${n}.png` });
}
await browser.close(); server.close();
