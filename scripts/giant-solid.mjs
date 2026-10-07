// The giant solid while it moves: node scripts/giant-solid.mjs <dir> [seed=hilda]
//   Stands a giant walking (`__ow.giantAhead`), then: `head`: sets you down on top of its head, on foot, and lets it
//   walk 12 s: you should still be on the head (prints how far off its crown you end, and shots h-*.png); `rise`:
//   the same on a giant lying down that gets up; `foot`: stands you where its next footfall comes down (you should be
//   shoved clear, not left inside stone); `cost`: ms per frame of the giant's update and of the collision asks, near it.
//   Uses the build in DIST (default dist/).
import { chromium } from 'playwright';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const args = process.argv.slice(2), dir = args[0] ?? 'shots/giant-solid';
const arg = (k, d) => args.find((a) => a.startsWith(k + '='))?.slice(k.length + 1) ?? d;
const dist = path.resolve(root, process.env.DIST ?? 'dist');
fs.mkdirSync(dir, { recursive: true });
const server = http.createServer((req, res) => {
  const p = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  const f = path.join(dist, p === '/' ? 'index.html' : p);
  if (!fs.existsSync(f)) { res.writeHead(404); res.end(); return; }
  res.writeHead(200, { 'content-type': f.endsWith('.js') ? 'text/javascript' : f.endsWith('.html') ? 'text/html' : f.endsWith('.css') ? 'text/css' : 'application/octet-stream' });
  fs.createReadStream(f).pipe(res);
});
await new Promise((r) => server.listen(0, r));
const browser = await chromium.launch({ args: ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist'] });
const open = async () => {
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  page.on('pageerror', (e) => console.log('[pageerror]', e.message));
  await page.goto(`http://localhost:${server.address().port}/?seed=${arg('seed', 'hilda')}&story=0&ui=0&capture=1&drak=0&mobs=0&t=10`);
  for (let i = 0; i < 200; i++) { if (await page.evaluate(() => window.__ow?.ready())) break; await page.waitForTimeout(250); }
  await page.evaluate(() => window.__ow.manual(true));
  return page;
};
/** Set the body down on the giant (a little above: it drops on): on its crown, or with `spot=hump` on top of its hump. */
const spot = arg('spot', 'head');
const onHead = (spot) => { const ow = window.__ow, g = ow.giant(), c = ow.body.pos.clone(); if (spot === 'hump') g.perch(g.trees.length, c).setY(c.y - 1.4); else g.crown(c); ow.setMode('walk'); ow.body.pos.set(c.x, c.y + 0.5, c.z); ow.body.vel.set(0, 0, 0); };
/** How far the body is from the crown (or the hump's top), and whether it's still on the giant's stone. */
const off = (spot) => { const ow = window.__ow, g = ow.giant(), c = ow.body.pos.clone(), b = ow.body.pos; if (spot === 'hump') g.perch(g.trees.length, c).setY(c.y - 1.4); else g.crown(c); return { d: +Math.hypot(c.x - b.x, c.z - b.z).toFixed(2), dy: +(b.y - c.y).toFixed(2), y: +b.y.toFixed(1), onIt: Math.abs(g.surface(b.x, b.z, b.y, 0.6) - b.y) < 0.2 }; };

{ // head: on a walking giant
  const page = await open();
  await page.evaluate(() => { const ow = window.__ow; ow.giantAhead(300, Math.PI / 2, true); ow.advance(120); });
  await page.evaluate(onHead, spot);
  await page.evaluate(() => { const ow = window.__ow; ow.advance(30); ow.view(ow.giant().heading + 2.4, 0.25, 14); });
  const start = await page.evaluate(() => { const p = window.__ow.body.pos; return [p.x, p.z]; });
  console.log('head: start', await page.evaluate(off, spot));
  for (let i = 1; i <= 6; i++) { await page.evaluate(() => window.__ow.advance(120)); await page.screenshot({ path: path.join(dir, `h-${i}.png`) }); }
  const end = await page.evaluate(() => { const p = window.__ow.body.pos; return [p.x, p.z]; });
  console.log('head: after 12 s', await page.evaluate(off, spot), 'carried', Math.hypot(end[0] - start[0], end[1] - start[1]).toFixed(1), 'm');
  // Sticky: walking on it is at half pace (measured on its stone, against the same second on the ground after), and a jump comes off it.
  const local = () => { const ow = window.__ow, g = ow.giant(), v = ow.body.pos.clone(); (g.grip ? v.applyMatrix4(g.grip.inv) : v.set(NaN, 0, 0)); const sc = g.grip ? Math.hypot(...g.grip.fwd.elements.slice(0, 3)) : 1; return [v.x * sc, v.z * sc]; };
  const l0 = await page.evaluate(local);
  await page.keyboard.down('w'); await page.evaluate(() => window.__ow.advance(60)); await page.keyboard.up('w');
  const l1 = await page.evaluate(local);
  console.log('head: walked', Math.hypot(l1[0] - l0[0], l1[1] - l0[1]).toFixed(2), 'm across it in 1 s;', await page.evaluate(off, spot));
  await page.evaluate(() => window.__ow.advance(30));
  await page.keyboard.down('Space');
  const y0 = await page.evaluate(() => { const ow = window.__ow, b = ow.body.pos; let top = 0; for (let i = 0; i < 40; i++) { ow.advance(1); const h = b.y - ow.giant().surface(b.x, b.z, 1e9, 0); top = Math.max(top, h); } return top.toFixed(2); });
  await page.keyboard.up('Space');
  console.log('head: a jump clears it by', y0, 'm; then', await page.evaluate(off, spot));
  await page.close();
}
{ // rise: lying down, it gets up under you
  const page = await open();
  await page.evaluate(() => { const ow = window.__ow; const g = ow.giantAhead(300, 1.2); g.settle(); ow.advance(10); });
  await page.evaluate(onHead, spot);
  await page.evaluate(() => { const ow = window.__ow; ow.advance(60); ow.view(ow.giant().heading + 2.4, 0.2, 16); });
  console.log('rise: asleep', await page.evaluate(off, spot));
  await page.evaluate(() => window.__ow.giant().rise());
  for (let i = 1; i <= 6; i++) { await page.evaluate(() => window.__ow.advance(120)); await page.screenshot({ path: path.join(dir, `r-${i}.png`) }); }
  console.log('rise: up', await page.evaluate(off, spot));
  await page.close();
}
{ // foot: under its next footfall
  const page = await open();
  const r = await page.evaluate(() => {
    const ow = window.__ow, g = ow.giantAhead(300, Math.PI / 2, true);
    ow.advance(60);
    const p = ow.body.pos.clone();
    g.print(4, p);
    ow.teleport(p.x, p.z); ow.setMode('walk');
    const at = [p.x, p.z];
    let worst = 0, moved = 0;
    for (let i = 0; i < 600; i++) {
      ow.advance(1);
      const b = ow.body.pos;
      moved = Math.max(moved, Math.hypot(b.x - at[0], b.z - at[1]));
      // Inside stone: it would still shove you a long way from where the frame left you.
      const q = b.clone(); g.push(q, b.clone().set(0, 0, 0), 0.32);
      if (q.distanceTo(b) > 0.5) worst++;
    }
    return { framesInStone: worst, shoved: +moved.toFixed(1), y: +ow.body.pos.y.toFixed(1), ground: +ow.height(ow.body.pos.x, ow.body.pos.z).toFixed(1) };
  });
  console.log('foot:', r);
  await page.screenshot({ path: path.join(dir, 'f-1.png') });
  await page.close();
}
{ // cost
  const page = await open();
  const r = await page.evaluate(() => {
    const ow = window.__ow, g = ow.giantAhead(300, Math.PI / 2, true);
    ow.advance(120);
    const c = g.crown(ow.body.pos.clone());
    ow.setMode('walk'); ow.body.pos.set(c.x, c.y + 0.5, c.z); ow.body.vel.set(0, 0, 0);
    ow.advance(30);
    const time = (f, n = 600) => { const t = performance.now(); for (let i = 0; i < n; i++) f(i); return +((performance.now() - t) / n).toFixed(4); };
    const b = ow.body, v = b.vel.clone(), p = b.pos.clone();
    return {
      update: time(() => g.update(1 / 600)),
      surface: time(() => { g.update(0); g.surface(b.pos.x, b.pos.z, b.pos.y, 0.6); }),
      push: time(() => { g.update(0); g.push(p.copy(b.pos), v, 0.32); }),
    };
  });
  console.log('cost (ms each, shell rebuilt every time):', r);
  await page.close();
}
await browser.close(); server.close();
