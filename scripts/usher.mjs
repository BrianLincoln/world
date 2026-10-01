// The spirit ushering you into a lit tower (journey enter1): node scripts/usher.mjs <dir> [seed=fjord]
import { chromium } from 'playwright';
import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path';
const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const args = process.argv.slice(2);
const out = args[0] ?? 'shots/usher';
const seed = args.find((a) => a.startsWith('seed='))?.slice(5) ?? 'fjord';
fs.mkdirSync(out, { recursive: true });
const server = http.createServer((req, res) => { const p = decodeURIComponent(new URL(req.url, 'http://x').pathname); const f = path.join(root, 'dist', p === '/' ? 'index.html' : p); if (!fs.existsSync(f)) { res.writeHead(404); res.end(); return; } res.writeHead(200, { 'content-type': f.endsWith('.js') ? 'text/javascript' : f.endsWith('.html') ? 'text/html' : 'application/octet-stream' }); fs.createReadStream(f).pipe(res); });
await new Promise((r) => server.listen(0, r));
const browser = await chromium.launch({ args: ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
page.on('pageerror', (e) => console.log('[pageerror]', e.message));
await page.goto(`http://localhost:${server.address().port}/?seed=${seed}&story=1&fresh=1&journey=enter1&t=15&mobs=0&ui=0&capture=1`);
for (let i = 0; i < 120; i++) { if (await page.evaluate(() => window.__ow?.ready())) break; await page.waitForTimeout(250); }
await page.evaluate(() => { window.__ow.manual(true); window.__ow.advance(30); });
// Stand 8 m out in front of the doorway, a little off to the far side, and let the spirit get there.
await page.evaluate(() => {
  const ow = window.__ow, t = ow.journey().home, b = ow._body;
  const fx = Math.sin(t.yaw), fz = Math.cos(t.yaw), g = t.door.ground;
  const x = g.x + fx * 7 + fz * 1.5, z = g.z + fz * 7 - fx * 1.5;
  b.pos.set(x, ow.height(x, z), z); b.heading = t.yaw + Math.PI; b.vel.set(0, 0, 0);
  ow.advance(600);
});
const views = [[-0.35, 0.12, 6], [-0.9, 0.25, 4]];
let n = 0;
for (const [dy, pitch, dist] of views) {
  for (const k of [0, 30, 20, 20, 40, 60]) {
    await page.evaluate(([dy, pitch, dist, k]) => { const ow = window.__ow, t = ow.journey().home; ow.advance(k); if (dist > 5.5) ow.focusAt(null); else { const sp = ow.journey().spirit.pos; ow.focusAt(sp.x, sp.y + 0.8, sp.z); } ow.view(t.yaw + dy, pitch, dist); ow.advance(1); }, [dy, pitch, dist, k]);
    await page.screenshot({ path: `${out}/${String(n++).padStart(2, '0')}.png` });
  }
}
for (let i = 0; i < 8; i++) console.log(await page.evaluate(() => { const ow = window.__ow, j = ow.journey(), s = j.spirit, t = j.home, b = ow._body.pos; ow.advance(20);
  const fx = Math.sin(t.yaw), fz = Math.cos(t.yaw), rel = (p) => [(p.x - t.door.x) * fz - (p.z - t.door.z) * fx, (p.x - t.door.x) * fx + (p.z - t.door.z) * fz].map((v) => +v.toFixed(1));
  return { sp: rel(s.pos), me: rel(b), usherT: +s.usherT.toFixed(2), h: +(s.heading - t.yaw).toFixed(2), arms: s.arms.map((a) => [a.rotation.x, a.rotation.z].map((v) => +v.toFixed(2))), usher: !!s.want.usher, acts: s.acts.length, dy: +(t.door.y - t.door.ground.y).toFixed(1) }; }));
await browser.close(); server.close();
