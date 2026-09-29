// Hearth-spirit close-ups: node scripts/spirit.mjs <outdir> [seed]
// Pins the spirit in the open at several warmths and poses and orbits the
// camera round it (the explorer hidden). Needs a build.
import { chromium } from 'playwright';
import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path';
const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const [out = 'shots/spirit', seed = 'hilda', only = ''] = process.argv.slice(2);
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
page.on('pageerror', (e) => console.log('[pageerror]', e.message));
await page.goto(`http://localhost:${server.address().port}/?seed=${seed}&story=1&fresh=1&mobs=0&capture=1&ui=0`);
for (let i = 0; i < 160; i++) { if (await page.evaluate(() => window.__ow?.ready())) break; await page.waitForTimeout(250); }
await page.evaluate(() => {
  const o = window.__ow; const s = o.story(); s.debugJump('axe');
  const b = o.body.pos; const sp = s.spirit;
  const p = b.clone(); p.x += 3; p.z += 3; p.y = o.height(p.x, p.z);
  sp.teleport(p); sp.want = { at: p.clone(), face: null, pose: 'stand', icon: null, lead: false };
  sp.hold = 0; o.rig.root.visible = false; window.__sp = p;
});
const set = (w, pose, yaw, pitch = 0.08, dist = 2.6) => page.evaluate(([w, pose, yaw, pitch, dist]) => {
  const o = window.__ow; const sp = o.story().spirit; const p = window.__sp;
  sp.holdWarmth = w; sp.want.pose = pose; sp.cancelActs();
  o.focusAt(p.x, p.y + 0.42, p.z); o.view(yaw, pitch, dist);
}, [w, pose, yaw, pitch, dist]);
const shots = [
  ['cold-front', 0, 'stand', 0.25], ['cold-shiver', 0, 'shiver', 0.4], ['mid-front', 0.5, 'stand', -0.3], ['warm-front', 1, 'stand', 0.3],
  ['warm-side', 1, 'stand', 1.5], ['warm-back', 1, 'stand', 2.8], ['warm-sit', 1, 'sit', 0.5], ['cold-far', 0, 'stand', 0.6, 0.15, 7],
];
for (const [n, w, pose, yaw, pitch, dist] of shots) {
  if (only && !only.split(',').includes(n)) continue;
  await set(w, pose, yaw, pitch, dist);
  await page.waitForTimeout(900);
  await page.screenshot({ path: `${out}/${n}.png` });
}
if (!only || only.includes('celebrate')) {
  await set(1, 'stand', 0.3, 0.1, 3.2);
  await page.evaluate(() => window.__ow.story().spirit.celebrate());
  await page.waitForTimeout(700);
  await page.screenshot({ path: `${out}/warm-celebrate.png` });
}
await browser.close(); server.close();
