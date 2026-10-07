// A dungeon ring's forcefield on the ground: node scripts/ring-field.mjs <dir> [seed=hilda]
// Opens each ring in turn and shoots it from four sides, low, and prints how far out of level
// the ground inside it is. Look for: no ground or grass showing through or over the field.
// Uses the build in dist/, or in $DIST (run `npx vite build` first).
import { chromium } from 'playwright';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const args = process.argv.slice(2);
const dir = args[0] ?? 'shots/ring-field';
const seed = args.find((a) => a.startsWith('seed='))?.slice(5) ?? 'hilda';
fs.mkdirSync(dir, { recursive: true });
const server = http.createServer((req, res) => {
  const p = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  const f = path.join(root, process.env.DIST ?? 'dist', p === '/' ? 'index.html' : p);
  if (!fs.existsSync(f)) { res.writeHead(404); res.end(); return; }
  res.writeHead(200, { 'content-type': f.endsWith('.js') ? 'text/javascript' : f.endsWith('.html') ? 'text/html' : f.endsWith('.css') ? 'text/css' : 'application/octet-stream' });
  fs.createReadStream(f).pipe(res);
});
await new Promise((r) => server.listen(0, r));
const browser = await chromium.launch({ args: ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: 1600, height: 900 } });
page.on('pageerror', (e) => console.log('[pageerror]', e.message));
await page.goto(`http://localhost:${server.address().port}/?seed=${seed}&story=0&t=10&ui=0&capture=1&mobs=0&drak=0&fresh=1`);
for (let i = 0; i < 160; i++) { if (await page.evaluate(() => window.__ow?.ready())) break; await page.waitForTimeout(250); }
await page.waitForTimeout(500);
await page.evaluate(() => window.__ow.manual(true));
for (let n = 0; n < 3; n++) {
  const rough = await page.evaluate((n) => {
    const ow = window.__ow, gen = ow.gen(), d = gen.dungeons[n], R = d.r - 2.4;
    let lo = Infinity, hi = -Infinity;
    for (let x = -R; x <= R; x += 0.5) for (let z = -R; z <= R; z += 0.5) if (x * x + z * z < R * R) { const h = gen.height(d.x + x, d.z + z); lo = Math.min(lo, h); hi = Math.max(hi, h); }
    [ow.ring(), ow.ring2?.(), ow.ring3?.()][n]?.setOpen();
    ow.goToRing(n);
    return +(hi - lo).toFixed(2);
  }, n);
  console.log(`ring ${n + 1}: ground inside is ${rough} m out of level`);
  for (let k = 0; k < 4; k++) {
    await page.evaluate(([n, k]) => {
      const ow = window.__ow, d = ow.gen().dungeons[n], a = k * Math.PI / 2 + 0.4;
      const x = d.x + Math.cos(a) * 17, z = d.z + Math.sin(a) * 17, b = ow._body, o = ow._orbit;
      b.pos.set(x, ow.gen().height(x, z), z);
      b.vel.set(0, 0, 0);
      b.heading = Math.atan2(-Math.cos(a), -Math.sin(a));
      o.yaw = b.heading + Math.PI; o.pitch = 0.16; o.snap();
      ow.advance(k ? 60 : 400);
    }, [n, k]);
    await page.waitForTimeout(k ? 300 : 2500);
    await page.evaluate(() => window.__ow.advance(30));
    await page.screenshot({ path: path.join(dir, `ring${n + 1}-${k}.png`) });
  }
}
await browser.close();
server.close();
