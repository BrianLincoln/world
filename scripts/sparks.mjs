// Sparks: node scripts/sparks.mjs <dir> [seed ...]     (serves $DIST)
//   Proves nobody can be stuck: every patch holds what its dearest neighbour costs and more, lighting any
//   tower leaves you better off than before, and the home patch pays for any tower next to it; then plays
//   the worst order (always the dearest tower you can afford next to a lit one) to the last tower.
//   And in the page: a spark shows and is taken in the warm, not in the cold; a sealed tower wants its price.
import { chromium } from 'playwright';
import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path';
const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const args = process.argv.slice(2);
const out = args[0] ?? 'shots/sparks';
const seeds = args.slice(1); if (!seeds.length) seeds.push('hilda');
fs.mkdirSync(out, { recursive: true });
const server = http.createServer((req, res) => {
  const p = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  const f = path.join(root, process.env.DIST ?? 'dist', p === '/' ? 'index.html' : p);
  if (!fs.existsSync(f)) { res.writeHead(404); res.end(); return; }
  res.writeHead(200, { 'content-type': f.endsWith('.js') ? 'text/javascript' : f.endsWith('.html') ? 'text/html' : f.endsWith('.css') ? 'text/css' : 'application/octet-stream' });
  fs.createReadStream(f).pipe(res);
});
await new Promise((r) => server.listen(0, r));
const browser = await chromium.launch({ args: ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist'] });
let failed = 0;
const check = (ok, what) => { console.log(`  ${ok ? 'ok  ' : 'FAIL'} ${what}`); if (!ok) failed++; };
for (const seed of seeds) {
  const page = await browser.newPage({ viewport: { width: 1600, height: 900 } });
  page.on('pageerror', (e) => console.log('[pageerror]', e.message));
  await page.goto(`http://localhost:${server.address().port}/?seed=${seed}&story=0&t=10&mobs=0&fresh=1&ui=0&capture=1&paused=1&cold=1`);
  for (let i = 0; i < 160; i++) { if (await page.evaluate(() => window.__ow?.ready())) break; await page.waitForTimeout(250); }
  const ev = (f, a) => page.evaluate(f, a);
  const r = await ev(() => {
    const o = window.__ow, T = o.gen().towers.towers, S = o.sparks;
    const cost = T.map((t) => S.price(t.id)), have = T.map(() => 0);
    for (const s of S.left) have[s.tower]++;
    const nb = T.map((t) => { const near = T.filter((x) => x !== t).sort((a, b) => Math.hypot(a.x - t.x, a.z - t.z) - Math.hypot(b.x - t.x, b.z - t.z)).slice(0, 6).map((x) => x.id); return [...new Set([...t.links, ...near])]; });
    const short = T.filter((t) => have[t.id] < Math.max(...nb[t.id].map((i) => cost[i])));
    const worse = T.filter((t) => !t.home && have[t.id] - cost[t.id] < 1);
    // The worst order: of the sealed towers next to a lit one, always the dearest you can pay for.
    const lit = new Set([T.find((t) => t.home).id]);
    let purse = have[[...lit][0]], low = purse, stuck = false;
    while (lit.size < T.length) {
      const front = T.filter((t) => !lit.has(t.id) && nb[t.id].some((i) => lit.has(i)));
      if (!front.length) break;
      const can = front.filter((t) => cost[t.id] <= purse).sort((a, b) => cost[b.id] - cost[a.id])[0];
      if (!can) { stuck = true; break; }
      purse += have[can.id] - cost[can.id]; lit.add(can.id); low = Math.min(low, purse);
    }
    return { towers: T.length, sparks: S.total, cost: [Math.min(...cost.filter((c) => c > 0)), Math.max(...cost)], short: short.map((t) => t.id), worse: worse.map((t) => t.id), stuck, lit: lit.size, low, end: purse, home: have[T.find((t) => t.home).id] };
  });
  console.log(seed, JSON.stringify(r));
  check(!r.short.length, 'every patch holds what its dearest neighbour costs');
  check(!r.worse.length, 'lighting any tower leaves you better off');
  check(!r.stuck, `the worst order lights ${r.lit} of ${r.towers} (never fewer than ${r.low} in hand)`);
  // In the page: the nearest spark in the home patch (warm), and one in a cold patch.
  const play = await ev(() => {
    const o = window.__ow, S = o.sparks, W = o.warmth, home = o.gen().towers.home;
    o.beacons.debugSet('none'); o.beacons.setLit(home.id, true); o.manual(true); o.advance(600, 1 / 30);
    const warm = S.left.find((s) => s.tower === home.id), cold = S.left.find((s) => !W.warmAt(s.x, s.z));
    const res = { warmIs: W.warmAt(warm.x, warm.z), before: S.count };
    o.teleport(cold.x, cold.z); o.advance(30, 1 / 30); res.afterCold = S.count;
    o.teleport(warm.x + 5, warm.z + 3); o.focusAt(warm.x, warm.y + 1.2, warm.z); o.view(0.9, 0.12, 9); o.advance(20, 1 / 30);
    return { ...res, at: [warm.x, warm.z] };
  });
  await page.screenshot({ path: `${out}/${seed}-spark.png` });
  const took = await ev(([x, z]) => { const o = window.__ow; o.focusAt(null); o.teleport(x, z); o.advance(30, 1 / 30); return o.sparks.count; }, play.at);
  check(play.warmIs && play.afterCold === play.before, 'a spark in the cold is not there to take');
  check(took === play.before + 1, 'a spark in the warm wakes as you walk up to it, and is yours');
  const gate = await ev(() => {
    const o = window.__ow, S = o.sparks, id = o.gen().journey.next;
    S.give(-99); o.goToTower(id); o.advance(60, 1 / 30);
    const t = o.gen().towers.towers[id], g = t.door.ground, fx = Math.sin(t.yaw), fz = Math.cos(t.yaw);
    o.teleport(g.x + fx * 0.3, g.z + fz * 0.3); o.advance(30, 1 / 30);
    const poor = o.beacons.action('walk');
    S.give(S.price(id)); o.advance(2, 1 / 30);
    const rich = o.beacons.action('walk');
    o.beacons.debugBreak(); o.advance(10, 1 / 30);
    return { price: S.price(id), poor, rich, after: S.count };
  });
  await page.screenshot({ path: `${out}/${seed}-gate.png` });
  check(gate.poor === null && gate.rich === 'pick', `a sealed tower wants its ${gate.price} sparks`);
  check(gate.after === 0, 'and takes them as its lock comes off');
  await page.close();
}
await browser.close(); server.close();
process.exit(failed ? 1 : 0);
