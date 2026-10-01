// Drakitten shots: node scripts/drakitten.mjs <outdir> [land|look|ride] [query]
//   land: a crew rockets in and lands (timed frames + a close-up); look: the three coats side by side.
// Needs a build (npx vite build).
import { chromium } from 'playwright';
import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path';
const root = process.cwd();
const [out, scene = 'land', q = 'seed=hilda&t=10'] = process.argv.slice(2);
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
page.on('console', (m) => { if (m.type() === 'error') console.log('[page]', m.text().slice(0, 300)); });
const W = (ms) => page.waitForTimeout(ms);
const ev = (f, a) => page.evaluate(f, a);
await page.goto(`http://localhost:${server.address().port}/?${q}&ui=0&capture=1&mobs=0`);
for (let i = 0; i < 120; i++) { if (await ev(() => window.__ow?.ready())) break; await W(250); }
await W(500);
const state = () => ev(() => [...window.__ow.mobs.all()].filter((m) => m.species.name === 'drakitten').map((m) => ({ y: +(m.pos.y - window.__ow.height(m.pos.x, m.pos.z)).toFixed(1), v: +m.vel.length().toFixed(1), fl: m.data.s.fl?.phase ?? '-', g: m.grounded })));
if (scene === 'land') {
  await ev(() => window.__ow.drakArrive());
  const pad = await ev(() => { const f = [...window.__ow.mobs.all()].find((m) => m.species.name === 'drakitten').flock; return { x: f.data.spot.x, y: f.data.spot.y, z: f.data.spot.z }; });
  await ev((p) => { window.__ow.focusAt(p.x, p.y + 4, p.z); window.__ow.view(window.__ow.body.heading + Math.PI + 0.6, 0.12, 30); }, pad);
  for (let i = 0; i < 16; i++) {
    await W(900);
    console.log(i, JSON.stringify(await state()));
    await page.screenshot({ path: `${out}/land-${String(i).padStart(2, '0')}.png` });
  }
  await ev((p) => { window.__ow.focusAt(p.x, p.y + 1.2, p.z); window.__ow.view(window.__ow.body.heading + Math.PI + 0.3, 0.1, 9); }, pad);
  await W(600); await page.screenshot({ path: `${out}/landed.png` });
}
if (scene === 'look') {
  await ev(() => window.__ow.spawnFlock('drakitten', 10, 3));
  await ev(() => { const o = window.__ow; const l = [...o.mobs.all()].filter((m) => m.species.name === 'drakitten'); l.forEach((m, i) => { m.species.setCoat(m, i); m.pos.x = l[0].pos.x + (i - 1) * 2.6; m.pos.z = l[0].pos.z; m.heading = o.body.heading + Math.PI; }); });
  await W(1500);
  for (const [tag, yaw, pitch, dist] of [['front', 0.4, 0.05, 7], ['side', 1.5, 0.1, 7], ['back', 2.8, 0.2, 7]]) {
    await ev(([y, p, d]) => window.__ow.inspect(1, y, p, d, 'drakitten'), [yaw, pitch, dist]);
    await W(500); await page.screenshot({ path: `${out}/look-${tag}.png` });
  }
}
if (scene === 'ride') {
  await ev(() => window.__ow.spawnFlock('drakitten', 8, 1));
  await ev(() => { const o = window.__ow; const m = [...o.mobs.all()].find((x) => x.species.name === 'drakitten'); m.species.setCoat(m, 2); });
  await ev(() => window.__ow.tameNearest('drakitten')); await W(2500);
  console.log('mounted', await ev(() => window.__ow.mountNearest()));
  const K = page.keyboard;
  const log = async (tag) => console.log(tag, JSON.stringify(await ev(() => { const o = window.__ow; const b = o.body; return { v: +Math.hypot(b.vel.x, b.vel.z).toFixed(1), h: +(b.pos.y - o.height(b.pos.x, b.pos.z)).toFixed(1), ...o.rideState() }; })));
  await ev(() => { const b = window.__ow.body; window.__ow.lockInput(b.heading + Math.PI); });
  await K.press("Space"); await K.down("Space"); await W(5000); await K.up('Space');
  await log('up');
  await ev(() => { const b = window.__ow.body; window.__ow.view(b.heading + Math.PI + 1.1, 0.1, 10); });
  await page.screenshot({ path: `${out}/ride-fly.png` });
  await K.down('KeyS'); await K.down('ShiftLeft'); await W(1500);
  await log('burn 1.5s');
  await ev(() => { const b = window.__ow.body; window.__ow.view(b.heading + Math.PI + 0.5, 0.15, 11); });
  await W(120); await page.screenshot({ path: `${out}/ride-rocket.png` });
  await W(4200); await log('burn 5.7s');
  await page.screenshot({ path: `${out}/ride-overheat.png` });
  await K.up('ShiftLeft'); await W(1500); await log('coast');
  await K.up('KeyS');
}
await browser.close(); server.close();
