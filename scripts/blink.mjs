// A glimmer's blink out in the world, a frame at a time: node scripts/blink.mjs <dir> [t=21.5]
//   Tames and mounts a glimmer, gallops, presses Space, and shoots every other frame from two frames
//   before the press to her filled out again (`blink-NN`), from the side and a little behind.
// Uses the build in dist/, or in $DIST (run `npx vite build` first).
import { chromium } from 'playwright';
import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path';
const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const dist = path.resolve(root, process.env.DIST ?? 'dist');
const [out = 'shots/blink', t = '21.5'] = process.argv.slice(2);
fs.mkdirSync(out, { recursive: true });
const server = http.createServer((req, res) => {
  const p = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  const f = path.join(dist, p === '/' ? 'index.html' : p);
  if (!fs.existsSync(f)) { res.writeHead(404); res.end(); return; }
  res.writeHead(200, { 'content-type': f.endsWith('.js') ? 'text/javascript' : f.endsWith('.html') ? 'text/html' : f.endsWith('.css') ? 'text/css' : 'application/octet-stream' });
  fs.createReadStream(f).pipe(res);
});
await new Promise((r) => server.listen(0, r));
const browser = await chromium.launch({ args: ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: 1000, height: 700 } });
page.on('pageerror', (e) => console.log('[pageerror]', e.message));
const W = (ms) => page.waitForTimeout(ms);
const ev = (f, a) => page.evaluate(f, a);
await page.goto(`http://localhost:${server.address().port}/?seed=hilda&t=${t}&ui=0&capture=1&paused=1&mobs=0`);
for (let i = 0; i < 120; i++) { if (await ev(() => window.__ow?.ready())) break; await W(250); }
await ev(() => window.__ow.spawnFlock('glimmer', 12, 1)); await W(1500);
await ev(() => window.__ow.tameNearest('glimmer')); await W(2500);
if (!(await ev(() => window.__ow.mountNearest()))) { console.log('could not mount'); process.exit(1); }
await ev(() => window.__ow.lockInput(window.__ow.body.heading + Math.PI));
await page.keyboard.down('KeyS'); await page.keyboard.down('ShiftLeft'); await W(1800);
await ev(() => window.__ow.manual(true));
const view = () => ev(() => { const o = window.__ow; o.view(o.body.heading + Math.PI + 1.0, 0.14, 11); });
for (let f = -2; f <= 44; f++) {
  if (f === 0) await page.keyboard.down('Space');
  if (f === 2) await page.keyboard.up('Space');
  await view();
  await ev(() => window.__ow.advance(1));
  const s = await ev(() => { const o = window.__ow, g = o.rideState(); return { phase: g.phase, speed: g.speed, seen: o.rig.root.visible, x: +o.body.pos.x.toFixed(1), z: +o.body.pos.z.toFixed(1) }; });
  if (f % 2 === 0) await page.screenshot({ path: `${out}/blink-${String(f + 2).padStart(2, '0')}.png` });
  if (f >= -1 && f <= 34) console.log(f, JSON.stringify(s));
}
await browser.close(); server.close();
