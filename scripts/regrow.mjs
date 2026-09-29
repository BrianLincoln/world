// Harvest regrowth + big-rock rubble check, headless:
//   node scripts/regrow.mjs <outdir> [seed=hudtest]
// Smashes a big boulder (rubble tumbles out), smashes a piece, fells a tree,
// then fast-forwards the harvest clock and screenshots the stump -> sapling
// -> tree and the boulder coming back. Needs a build (npx vite build).
import { chromium } from 'playwright';
import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path';
const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const args = process.argv.slice(2);
const out = args[0] ?? 'shots/regrow';
const seed = args.find((a) => a.startsWith('seed='))?.slice(5) ?? 'hudtest';
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
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
page.on('pageerror', (e) => console.log('[pageerror]', e.message));
page.on('console', (m) => { if (m.type() === 'error') console.log('[page]', m.text().slice(0, 300)); });
const W = (ms) => page.waitForTimeout(ms);
const ev = (f, a) => page.evaluate(f, a);
const shot = (n) => page.screenshot({ path: `${out}/${n}.png` });
await page.goto(`http://localhost:${server.address().port}/?seed=${seed}&story=1&fresh=1&mobs=0&capture=1&ui=0`);
for (let i = 0; i < 160; i++) { if (await ev(() => window.__ow?.ready())) break; await W(250); }
await W(800);
await ev(() => window.__ow.story().debugJump('stones'));
await W(800);
let fail = false;
const check = (ok, msg) => { console.log(ok ? 'ok  ' : 'FAIL', msg); if (!ok) fail = true; };

// ---- a big boulder breaks into rubble
const big = await ev(() => {
  const s = window.__ow.story(), col = s.d.colliders, site = s.site;
  for (let rad = 45; rad < 500; rad += 12) for (let a = 0; a < 6.28; a += 0.25) {
    const h = col.nearestRock(site.x + Math.cos(a) * rad, site.z + Math.sin(a) * rad, 8, Infinity);
    if (h && h.row[3] > 1.7) return { x: h.x, z: h.z, sc: h.row[3] };
  }
  return null;
});
check(!!big, `big boulder found ${JSON.stringify(big)}`);
const stand = async (x, z, dx) => {
  await ev(([x, z]) => window.__ow.teleport(x, z), [x + dx, z]);
  await W(1200);
  await ev(() => window.__ow.view(Math.PI / 2 + 0.7, 0.32, 9));
  await W(500);
};
await stand(big.x, big.z, 0.9 * big.sc + 1.1);
await shot('1-boulder');
await page.keyboard.down('KeyE');
for (let i = 0; i < 40; i++) { await W(250); if (await ev(() => window.__ow.story().rubble.size > 0)) break; }
await W(150);
await shot('2-breaking');
await W(900);
await page.keyboard.up('KeyE');
await shot('3-rubble');
const r1 = await ev(() => { const s = window.__ow.story(); return { rubble: s.rubble.size, inv: s.inv.stones, taken: s.d.harvest.all().map((t) => ({ k: t.kind, big: t.big })) }; });
check(r1.rubble >= 3 && r1.taken.some((t) => t.big), `rubble after big break ${JSON.stringify(r1)}`);

// ---- smash one piece: stones
const inv0 = r1.inv;
const piece = await ev(() => { const r = [...window.__ow.story().rubble.values()][0].rock; return { x: r.pos.x, z: r.pos.z, rad: r.radius }; });
await stand(piece.x, piece.z, piece.rad + 1.0);
await page.keyboard.down('KeyE');
for (let i = 0; i < 30; i++) { await W(250); if (await ev((n) => window.__ow.story().rubble.size < n, r1.rubble)) break; }
await page.keyboard.up('KeyE');
await W(2500);
const r2 = await ev(() => { const s = window.__ow.story(); return { rubble: s.rubble.size, inv: s.inv.stones, smashed: s.d.harvest.all().find((t) => t.big)?.smashed }; });
check(r2.rubble === r1.rubble - 1 && r2.inv > inv0 && r2.smashed === 1 << 0 || r2.smashed > 0, `piece smashed ${JSON.stringify(r2)}`);
await shot('4-piece-smashed');

// ---- saved: reload and the rubble (and what's smashed of it) is still there
await ev(() => window.__ow.story().save());
await page.goto(`http://localhost:${server.address().port}/?seed=${seed}&story=1&mobs=0&capture=1&ui=0`);
for (let i = 0; i < 160; i++) { if (await ev(() => window.__ow?.ready())) break; await W(250); }
await W(800);
const r2b = await ev(() => { const s = window.__ow.story(); return { rubble: s.rubble.size, smashed: s.d.harvest.all().find((t) => t.big)?.smashed, clock: s.d.harvest.clock }; });
check(r2b.rubble === r2.rubble && r2b.smashed === r2.smashed, `after reload ${JSON.stringify(r2b)}`);

// ---- fell a world tree
const tree = await ev(() => {
  const s = window.__ow.story(), col = s.d.colliders, site = s.site;
  for (let rad = 50; rad < 400; rad += 10) for (let a = 0; a < 6.28; a += 0.3) {
    const h = col.nearestTree(site.x + Math.cos(a) * rad, site.z + Math.sin(a) * rad, 6);
    if (!h) continue;
    // A lone tree at the forest edge, so it can be seen.
    let alone = true;
    for (let b = 0; b < 6.28; b += 0.785) { const o = col.nearestTree(h.x + Math.cos(b) * 7, h.z + Math.sin(b) * 7, 6); if (o && Math.hypot(o.x - h.x, o.z - h.z) > 0.5) alone = false; }
    if (alone) return { x: h.x, z: h.z, rad: h.radius };
  }
  return null;
});
await stand(tree.x, tree.z, tree.rad + 1.1);
await page.keyboard.down('KeyE');
for (let i = 0; i < 60; i++) { await W(250); if (await ev(() => window.__ow.story().d.harvest.all().some((t) => t.kind === 'tree'))) break; }
await page.keyboard.up('KeyE');
await W(3000);
check(await ev(() => window.__ow.story().d.harvest.all().some((t) => t.kind === 'tree')), 'tree felled');
// Step back so the stump is in frame.
const look = async (name) => {
  await ev(([x, z]) => { window.__ow.teleport(x + 5, z + 3); }, [tree.x, tree.z]);
  await W(1000);
  await ev(([x, z]) => { const b = window.__ow.body.pos; window.__ow.view(Math.atan2(b.x - x, b.z - z) + 0.35, 0.22, 9); }, [tree.x, tree.z]);
  await W(1600);
  await shot(name);
};
await look('5-stump');

// ---- fast-forward: the harvest clock runs on in-game hours
// Forward h hours (counted), then straight back (a backwards jump isn't), so
// the light stays the same between shots.
const ff = async (h) => {
  for (; h > 0; h -= 11) {
    const k = Math.min(11, h);
    await ev((k) => { const e = window.__ow.story().d.env; e.hour = (e.hour + k) % 24; }, k);
    await W(1100);
    await ev((k) => { const e = window.__ow.story().d.env; e.hour = (e.hour - k + 24) % 24; }, k);
    await W(100);
  }
};
const treeState = () => ev(() => window.__ow.story().d.harvest.all().filter((t) => t.kind === 'tree').map((t) => t.grow));
// Dormant, in view: no sprout.
await ff(11); await W(1500);
check((await treeState())[0] === 0, `in view: no sprout yet ${await treeState()}`);
// Walk away (unseen), let it sprout.
await ev(([x, z]) => window.__ow.teleport(x + 150, z), [tree.x, tree.z]);
await W(2500);
check((await treeState())[0] > 0, `away: sprouted ${await treeState()}`);
for (const [h, name] of [[4, '6-sapling'], [10, '7-young'], [10, '8-growing']]) {
  await ff(h); await W(1300);
  await look(name);
  console.log('   grow', await treeState());
}
for (let i = 0; i < 3; i++) { await ff(8); await W(1300); }
check((await treeState()).length === 0, 'tree fully grown back');
await look('9-grown');
// The boulder: back after ROCK_RETURN, once out of sight.
await ev(([x, z]) => window.__ow.teleport(x + 150, z), [big.x, big.z]);
await W(2500);
const r3 = await ev(() => { const s = window.__ow.story(); return { rocks: s.d.harvest.all().filter((t) => t.kind === 'rock').length, rubble: s.rubble.size }; });
check(r3.rocks === 0 && r3.rubble === 0, `boulder back, rubble gone ${JSON.stringify(r3)}`);
await stand(big.x, big.z, 0.9 * big.sc + 1.1);
await shot('10-boulder-back');
console.log(await ev(() => window.__ow.stats()));
await browser.close();
server.close();
process.exit(fail ? 1 : 0);
