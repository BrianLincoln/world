// The wilder creatures (src/mobs/beast.ts): node scripts/beasts.mjs <outdir> [names] [scenes]
//   names:  comma list (default: all ten); scenes: look,ride (default both)
// Needs a build (npx vite build). Tile with scripts/sheet.mjs.
import { chromium } from 'playwright';
import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path';
const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const ALL = ['mossback', 'glimmer', 'mudsnoot', 'moonmoth', 'rockhopper', 'boghag', 'brambler', 'wurm', 'stormback', 'lanternhare'];
const [out, names = ALL.join(','), scenes = 'look,ride', extra = ''] = process.argv.slice(2);
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
const page = await browser.newPage({ viewport: { width: 1000, height: 700 } });
page.on('pageerror', (e) => console.log('[pageerror]', e.message));
page.on('console', (m) => { if (m.type() === 'error') console.log('[page]', m.text().slice(0, 400)); });
const W = (ms) => page.waitForTimeout(ms);
const ev = (f, a) => page.evaluate(f, a);
const shot = (n) => page.screenshot({ path: `${out}/${n}.png` });
const go = async (q) => {
  await page.goto(`http://localhost:${server.address().port}/?${q}&ui=0&capture=1&paused=1&mobs=0${extra}`);
  for (let i = 0; i < 120; i++) { if (await ev(() => window.__ow?.ready())) break; await W(250); }
  await W(300);
};

for (const name of names.split(',')) {
  const t = name === 'glimmer' || name === 'moonmoth' ? 21.5 : 10;
  await go(`seed=hilda&t=${t}`);
  await ev((n) => window.__ow.spawnFlock(n, 12, 1), name);
  await W(1500);
  if (scenes.includes('look')) {
    for (const [tag, yaw, pitch, dist] of [['front', 0.6, 0.05, 6.5], ['side', 1.57, 0.08, 7]]) {
      await ev(([n, y, p, d]) => window.__ow.inspect(0, y, p, d, n), [name, yaw, pitch, dist]);
      await W(500); await shot(`${name}-${tag}`);
    }
    await ev(() => { window.__ow.mobs.settings.freeze = false; window.__ow.rig.root.visible = true; window.__ow.setMode('walk'); });
  }
  if (scenes.includes('ride')) {
    await ev((n) => window.__ow.tameNearest(n), name); await W(2500);
    const ok = await ev(() => window.__ow.mountNearest());
    if (!ok) { console.log(name, 'could not mount'); continue; }
    await ev(() => { const b = window.__ow.body; window.__ow.view(b.heading + Math.PI + 0.9, 0.12, 9); });
    await W(700); await shot(`${name}-ride`);
    // Canter away from the camera for a moment.
    await ev(() => window.__ow.lockInput(window.__ow.body.heading + Math.PI));
    await page.keyboard.down('KeyS'); await page.keyboard.down('ShiftLeft'); await W(1600);
    await ev(() => { const b = window.__ow.body; window.__ow.view(b.heading + Math.PI + 1.2, 0.1, 10); });
    await W(250); await shot(`${name}-run`);
    const before = await ev(() => { const o = window.__ow; return { v: Math.hypot(o.body.vel.x, o.body.vel.z).toFixed(1), y: o.body.pos.y.toFixed(1) }; });
    await page.keyboard.press('Space'); await W(250); await shot(`${name}-trick`);
    const after = await ev(() => { const o = window.__ow; const g = o.rideState(); return { v: Math.hypot(o.body.vel.x, o.body.vel.z).toFixed(1), vy: o.body.vel.y.toFixed(1), dy: o.body.pos.y.toFixed(1), g }; });
    console.log(name, 'run', JSON.stringify(before), 'after space', JSON.stringify(after));
    await page.keyboard.up('KeyS'); await page.keyboard.up('ShiftLeft');
    await ev(() => window.__ow.lockInput(null));
  }
}
await browser.close(); server.close();
