// The sea spirit, played by the keys:   node scripts/sea.mjs <dir> [swim,hag,fly]      (serves $DIST)
//   `bridge` / `bridgehag`: over the strait by its bridge, on foot and riding: the spirit must leave you be all
//   the way, you must stay on the deck, and you must come off it on the south island.
//   `build`: the story, after dungeon 2 (`cp=ring3`): no bridge, its sketch showing; the mill standing and making
//   boards; with wood in your pack at the water's edge it all goes in, the bridge stands, and you walk over.
//   From the home island's south shore, out into the strait beside the causeway: swimming, on the bog hag, and in the
//   air. For each: when the warning began, when it took you, where it set you down (it must be dry ground on
//   the island you left) and how long it all took; and frames of the warning, the arm and the shore after.
import { chromium } from 'playwright';
import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path';
const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const [dir = 'shots/sea', which = 'swim,hag,fly,bridge,bridgehag,build'] = process.argv.slice(2);
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
const CASES = { swim: 'x=105&z=3475', hag: 'x=105&z=3475&ride=boghag', fly: 'x=105&z=3475&ride=moonmoth' };
let failed = 0;
if (which.split(',').includes('build')) {
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  page.on('pageerror', (e) => console.log('[pageerror]', e.message));
  await page.goto(`http://localhost:${server.address().port}/?fresh=1&cp=ring3&mobs=0&ui=0&capture=1`);
  for (let i = 0; i < 400; i++) { if (await page.evaluate(() => window.__ow?.ready() && !!window.__ow.story?.())) break; await page.waitForTimeout(250); }
  const r = {};
  r.start = await page.evaluate(async () => {
    const o = window.__ow; o.manual(true); o.advance(60, 1 / 30);
    const c = o.gen().crossings[0], m = o.mill();
    const before = { bridge: o.bridge(null), filled: o.bridgeWork()?.filled, mill: !!m && m.group.visible, stock: m?.stock };
    // Three minutes of play, and a little: three boards.
    o.advance(3700, 1 / 20); before.stockAfter3min = o.mill()?.stock;
    // To the mill's stack: its boards are yours.
    const g = o.mill().group, a = g.rotation.y; o.teleport(g.position.x + Math.cos(a) * 3.1, g.position.z - Math.sin(a) * 3.1); o.advance(90, 1 / 30);
    before.took = o.story().inv.logs; before.stockLeft = o.mill().stock;
    // To the water's edge with not quite enough, then enough.
    let zs = c.a[1]; while (o.gen().height(c.a[0], zs) > 3.4 && zs < c.b[1]) zs += 2;
    o.teleport(c.a[0], zs - 6); o.view(Math.PI, 0.3, 40); o.story().inv.logs = 60; o.advance(400, 1 / 30);
    before.with60 = { filled: o.bridgeWork().filled, left: o.story().inv.logs, bridge: o.bridge(null) };
    return before;
  });
  await page.screenshot({ path: path.join(dir, 'build-1-sketch.png') });
  r.end = await page.evaluate(() => { const o = window.__ow; o.story().inv.logs = 50; o.advance(300, 1 / 30); return { filled: o.bridgeWork().filled, left: o.story().inv.logs, bridge: o.bridge(null) }; });
  await page.screenshot({ path: path.join(dir, 'build-2-built.png') });
  await page.evaluate(() => { const o = window.__ow, c = o.gen().crossings[0]; o.view(Math.atan2(c.a[0] - c.b[0], c.a[1] - c.b[1]), 0.3, 22); });
  await page.keyboard.down('KeyW');
  let end = null, low = Infinity;
  for (let s = 0; s < 1500; s++) {
    const st = await page.evaluate(() => { const o = window.__ow; o.advance(6, 1 / 30); const p = o.pos(), g = o.gen(); return { phase: o.sea().phase, y: +p.y.toFixed(1), z: Math.round(p.z), ground: g.height(p.x, p.z) }; });
    if (st.ground < 0) low = Math.min(low, st.y);
    if (st.phase !== 'calm' || st.z > 4040) { end = st; break; }
  }
  await page.keyboard.up('KeyW');
  const s0 = r.start, ok = s0.bridge === 0 && s0.mill && s0.stockAfter3min >= 3 && s0.took > 0 && s0.with60.filled === 60 && s0.with60.bridge === 0 && r.end.filled === 100 && r.end.left === 10 && r.end.bridge === 1 && !!end && end.phase === 'calm' && end.z > 4000 && low > 3;
  if (!ok) failed++;
  console.log('build', ok ? 'ok' : 'FAILED', JSON.stringify({ ...r, crossed: end, lowestOverWater: low }));
  await page.close();
}
for (const name of which.split(',').filter((n) => n.startsWith('bridge'))) {
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  page.on('pageerror', (e) => console.log('[pageerror]', e.message));
  await page.goto(`http://localhost:${server.address().port}/?story=0&mobs=0&t=11&ui=0&capture=1&x=105&z=3475${name === 'bridgehag' ? '&ride=boghag' : ''}`);
  for (let i = 0; i < 240; i++) { if (await page.evaluate(() => window.__ow?.ready())) break; await page.waitForTimeout(250); }
  // (Straight down the bridge's own line, whatever the camera was doing.)
  await page.evaluate(() => { const o = window.__ow, c = o.gen().crossings[0]; o.manual(true); o.view(Math.atan2(c.a[0] - c.b[0], c.a[1] - c.b[1]), 0.3, 22); });
  await page.keyboard.down('KeyW');
  let seen = new Set(), low = Infinity, wet = 0, end = null;
  for (let s = 0; s < 1500; s++) {
    const st = await page.evaluate(() => { const o = window.__ow; o.advance(6, 1 / 30); const p = o.pos(), g = o.gen(); return { phase: o.sea().phase, x: +p.x.toFixed(1), y: +p.y.toFixed(1), z: Math.round(p.z), ground: g.height(p.x, p.z) }; });
    seen.add(st.phase);
    if (st.ground < 0) { wet++; low = Math.min(low, st.y); }
    if (wet === 400) await page.screenshot({ path: path.join(dir, `${name}-mid.png`) });
    if (st.z > 4060 || (wet > 20 && st.ground > 3.5)) { end = st; break; }
  }
  const ok = !!end && end.z > 3900 && low > 3 && seen.size === 1;
  if (!ok) failed++;
  console.log(name, ok ? 'ok' : 'FAILED', JSON.stringify({ end, lowestOverWater: low, stepsOverWater: wet, spirit: [...seen] }));
  await page.close();
}
for (const name of which.split(',').filter((n) => !n.startsWith('b'))) {
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  page.on('pageerror', (e) => console.log('[pageerror]', e.message));
  await page.goto(`http://localhost:${server.address().port}/?story=0&mobs=0&t=11&ui=0&capture=1&${CASES[name]}&yaw=3.14&pitch=0.35&dist=26`);
  for (let i = 0; i < 240; i++) { if (await page.evaluate(() => window.__ow?.ready())) break; await page.waitForTimeout(250); }
  await page.evaluate(() => { window.__ow.manual(true); window.__ow.view(Math.PI - 0.6, 0.35, 26); });
  await page.keyboard.down('KeyW');
  if (name === 'fly') { await page.keyboard.down('Space'); await page.evaluate(() => window.__ow.advance(60, 1 / 30)); await page.keyboard.up('Space'); }
  const log = []; let last = 'calm', shot = {}, r = null;
  for (let s = 0; s < 900; s++) {
    const st = await page.evaluate(() => { const o = window.__ow; o.advance(6, 1 / 30); const p = o.pos(), g = o.gen(), q = o.sea(); return { phase: q.phase, dread: +q.dread.toFixed(2), x: Math.round(p.x), y: +p.y.toFixed(1), z: Math.round(p.z), ground: +g.height(p.x, p.z).toFixed(1) }; });
    if (st.phase !== last) { log.push({ t: +(s * 0.2).toFixed(1), ...st }); last = st.phase; }
    const snap = async (k) => { if (!shot[k]) { shot[k] = 1; await page.evaluate(() => window.__ow.advance(1, 1 / 60)); await page.screenshot({ path: path.join(dir, `${name}-${k}.png`) }); } };
    if (st.phase === 'warn' && st.dread > 0.6) await snap('1-warn');
    if (st.phase === 'rise') await snap('2-rise');
    if (st.phase === 'carry') { await snap('3-carry'); if (!shot.mid && log.at(-1).phase === 'carry' && s * 0.2 - log.at(-1).t > 1.2) { shot.mid = 1; await page.screenshot({ path: path.join(dir, `${name}-4-carry.png`) }); } }
    if (st.phase === 'sink' && !r) { await page.keyboard.up('KeyW'); r = await page.evaluate(() => { const o = window.__ow, p = o.pos(), g = o.gen(); return { x: Math.round(p.x), z: Math.round(p.z), ground: +g.height(p.x, p.z).toFixed(1), above: +(p.y - g.height(p.x, p.z)).toFixed(1), deep: o.sea().deep(p.x, p.z) }; }); }
    if (st.phase === 'sink') await snap('5-set');
    if (log.length > 2 && st.phase === 'calm') { await page.evaluate(() => window.__ow.advance(30, 1 / 30)); await snap('6-after'); break; }
  }
  const took = log.find((l) => l.phase === 'rise');
  const ok = !!r && r.ground > 0.8 && !r.deep && r.z < 3700 && Math.abs(r.above) < 3;
  if (!ok) failed++;
  console.log(name, ok ? 'ok' : 'FAILED', JSON.stringify({ tookAt: took && [took.x, took.z, took.y], setDown: r, phases: log.map((l) => `${l.t}s ${l.phase}`) }));
  await page.close();
}
await browser.close(); server.close();
process.exit(failed ? 1 : 0);
