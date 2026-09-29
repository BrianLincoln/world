// Tower solidity: drop onto a grid of points over towers from high up, walk
// into them, and check nobody ends up inside rock.
// node scripts/towerland.mjs <dir> [seed=fjord] [towers=0,3,5] [modes=walk,glide,fly] [shots=1]
import { chromium } from 'playwright';
import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path';
const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const args = process.argv.slice(2);
const out = args[0] ?? 'shots/land';
const opt = (k, d) => args.find((a) => a.startsWith(k + '='))?.slice(k.length + 1) ?? d;
const seed = opt('seed', 'fjord');
const towers = opt('towers', '0,3,5').split(',').map(Number);
const modes = opt('modes', 'walk,glide,fly').split(',');
const shots = opt('shots', '1') === '1';
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
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
page.on('pageerror', (e) => console.log('[pageerror]', e.message));
await page.goto(`http://localhost:${server.address().port}/?seed=${seed}&story=0&t=11&mobs=0&fresh=1&ui=0&capture=1&paused=1`);
for (let i = 0; i < 120; i++) { if (await page.evaluate(() => window.__ow?.ready())) break; await page.waitForTimeout(250); }
const idle = async () => { for (let i = 0; i < 60; i++) { if (await page.evaluate(() => window.__ow.ready())) break; await page.waitForTimeout(200); } };
let bad = 0, total = 0;
for (const id of towers) {
  await page.evaluate((id) => { window.__ow.beacons.debugSet(id); window.__ow.goToTower(id); }, id);
  await idle();
  await page.evaluate(() => { window.__ow.manual(true); window.__ow.advance(5); });
  for (const mode of modes) {
    // A grid over the tower from above: drop, and see where the feet end up.
    const res = await page.evaluate(([id, mode]) => {
      const ow = window.__ow, B = ow.beacons, b = ow._body;
      const t = ow.gen().towers.towers[id];
      const top = t.head.y + t.head.sy + 10;
      const rows = [];
      for (let gz = -3; gz <= 3; gz++) for (let gx = -3; gx <= 3; gx++) {
        const x = t.x + gx * 6, z = t.z + gz * 6;
        ow.setMode('fly');
        b.pos.set(x, top, z); b.vel.set(0, 0, 0);
        ow.advance(1);
        b.pos.set(x, top, z); b.vel.set(0, mode === 'fly' ? -30 : -2, 0);
        if (mode !== 'fly') ow.setMode(mode);
        let n = 0;
        for (; n < (mode === 'glide' ? 1400 : 300); n++) {
          if (mode === 'fly') b.vel.set(0, -30, 0);
          ow.advance(1, 1 / 30);
          if (mode === 'fly' ? n > 150 : b.grounded) break;
        }
        const p = b.pos;
        const g = ow.height(p.x, p.z);
        const inRock = B.solidAt(p.clone().setY(p.y + 0.4)) || B.solidAt(p.clone().setY(p.y + 1.2));
        const floor = B.surface(p.x, p.z, p.y + 0.05);
        rows.push({ gx, gz, y: +(p.y - g).toFixed(2), onRock: floor > -1e9 && Math.abs(floor - p.y) < 0.1, inRock, drift: +Math.hypot(p.x - x, p.z - z).toFixed(1), n });
      }
      return rows;
    }, [id, mode]);
    const inRock = res.filter((r) => r.inRock);
    const floating = res.filter((r) => !r.onRock && r.y > (mode === 'fly' ? 0.6 : 0.3));
    total += res.length; bad += inRock.length + floating.length;
    console.log(`tower ${id} ${mode}: ${res.length} drops, ${res.filter((r) => r.onRock).length} on rock, inRock ${inRock.length}, floating ${floating.length}`);
    for (const r of [...inRock, ...floating].slice(0, 6)) console.log('   ', JSON.stringify(r));
  }
  if (shots) {
    // Land on the capstone in front of the head and on the head itself, and look.
    for (const [name, pick] of [['cap', 'slab'], ['head', 'head']]) {
      await page.evaluate(([id, pick]) => {
        const ow = window.__ow, b = ow._body;
        const t = ow.gen().towers.towers[id];
        const s = t[pick];
        const fx = Math.sin(t.yaw), fz = Math.cos(t.yaw);
        const off = pick === 'slab' ? s.sx * 0.45 : 0;
        ow.setMode('fly');
        b.pos.set(s.x + fx * off, t.head.y + t.head.sy + 20, s.z + fz * off);
        ow.advance(1);
        ow.setMode('walk');
        ow.view(t.yaw + 0.6, 0.35, 14);
        for (let i = 0; i < 240 && !b.grounded; i++) ow.advance(1);
        ow.advance(30);
      }, [id, pick]);
      await page.screenshot({ path: `${out}/${seed}-${id}-${name}.png` });
      console.log(`  ${name}:`, await page.evaluate(() => { const B = window.__ow.beacons, p = window.__ow._body.pos; return { grounded: window.__ow._body.grounded, inRock: B.solidAt(p.clone().setY(p.y + 0.5)), overGround: +(p.y - window.__ow.height(p.x, p.z)).toFixed(1) }; }));
    }
  }
  await page.evaluate(() => window.__ow.manual(false));
}
console.log(`TOTAL ${total} drops, ${bad} bad`);
await browser.close(); server.close();
