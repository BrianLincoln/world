// The tower spirit's arms as it's freed: node scripts/arms.mjs <dir> [seed=fjord] [tower=3]   (DIST=<folder>)
// Frames through the joy, the reach up the tower, the tug and the pull, close on its shoulders.
import { chromium } from 'playwright';
import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path';
const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const args = process.argv.slice(2);
const out = args[0] ?? 'shots/arms';
const opt = (k, d) => args.find((a) => a.startsWith(k + '='))?.slice(k.length + 1) ?? d;
const seed = opt('seed', 'fjord'), tower = +opt('tower', '3');
fs.mkdirSync(out, { recursive: true });
const server = http.createServer((req, res) => {
  const p = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  const f = path.join(path.resolve(root, process.env.DIST ?? 'dist'), p === '/' ? 'index.html' : p);
  if (!fs.existsSync(f)) { res.writeHead(404); res.end(); return; }
  res.writeHead(200, { 'content-type': f.endsWith('.js') ? 'text/javascript' : f.endsWith('.html') ? 'text/html' : 'application/octet-stream' });
  fs.createReadStream(f).pipe(res);
});
await new Promise((r) => server.listen(0, r));
const browser = await chromium.launch({ args: ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
page.on('pageerror', (e) => console.log('[pageerror]', e.message));
await page.goto(`http://localhost:${server.address().port}/?seed=${seed}&story=0&t=16&mobs=0&fresh=1&ui=0&capture=1&paused=1`);
for (let i = 0; i < 120; i++) { if (await page.evaluate(() => window.__ow?.ready())) break; await page.waitForTimeout(250); }
await page.evaluate((id) => {
  const ow = window.__ow;
  ow.goToTower(id);
  const t = ow.gen().towers.towers[id];
  ow.teleport(t.door.ground.x + Math.sin(t.yaw) * 0.3, t.door.ground.z + Math.cos(t.yaw) * 0.3);
  ow.manual(true); ow.advance(30);
  ow.beacons.debugBreak();
}, tower);
// Seconds into the freeing: happy, looking up, arms shooting up, the tug, early and mid pull.
let at = 0;
for (const [name, u] of [['joy', 4.8], ['turn', 6.6], ['reach', 7.1], ['up', 7.8], ['tug', 8.15], ['pull1', 8.9], ['pull2', 9.4]]) {
  const n = Math.round((u - at) * 60); at = u;
  const d = await page.evaluate(([n]) => {
    const ow = window.__ow, B = ow.beacons, sp = B.spirit;
    ow.advance(n - 1);
    // Close on its shoulders, from the side and a little in front.
    const c = ow._cam, s = sp.pos;
    const yaw = sp.yaw + 2.2;
    B.cinematic = () => null;
    ow.focusAt(s.x, s.y + 1.9, s.z); ow.view(yaw, 0.1, 6);
    ow.advance(1);
    // How far each arm's root is from the body's own shoulder point (m): 0 if attached.
    const gap = B.arms.map((a, k) => {
      const l = new (s.constructor)(k ? 0.27 : -0.27, 1.3, 0);
      sp.body.updateWorldMatrix(true, false);
      return +sp.body.localToWorld(l).distanceTo(a.line[0]).toFixed(3);
    });
    return { tilt: +sp.tilt.toFixed(2), gap, vis: B.arms.map((a) => a.group.visible) };
  }, [n]);
  console.log(name, JSON.stringify(d));
  await page.screenshot({ path: `${out}/${seed}-${name}.png` });
}
await browser.close(); server.close();
