// The lasso lesson and the first creature home (phase 3 catch -> herd -> ranch):
// node scripts/lesson.mjs [outdir=shots/lesson] [seed=hilda]
// Jumps to the catch step, lets the spirit take you out to the lesson's
// stelk and show you how, tames it, leads it in, then watches the praise
// and what the spirit does after.
import { chromium } from 'playwright';
import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path';
const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const [out = 'shots/lesson', seed = 'hilda'] = process.argv.slice(2);
fs.mkdirSync(out, { recursive: true });
const server = http.createServer((req, res) => { const p = decodeURIComponent(new URL(req.url, 'http://x').pathname); const f = path.join(root, 'dist', p === '/' ? 'index.html' : p); if (!fs.existsSync(f)) { res.writeHead(404); res.end(); return; } res.writeHead(200, { 'content-type': f.endsWith('.js') ? 'text/javascript' : f.endsWith('.html') ? 'text/html' : 'application/octet-stream' }); fs.createReadStream(f).pipe(res); });
await new Promise((r) => server.listen(0, r));
const browser = await chromium.launch({ args: ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
page.on('pageerror', (e) => console.log('[pageerror]', e.message));
page.on('console', (m) => { if (m.type() === 'error' && !m.text().includes('useProgram')) console.log('[page]', m.text().slice(0, 300)); });
await page.goto(`http://localhost:${server.address().port}/?seed=${seed}&story=1&fresh=1&stable=catch&ui=0&capture=1`);
for (let i = 0; i < 160; i++) { if (await page.evaluate(() => window.__ow?.ready())) break; await page.waitForTimeout(250); }
const ev = (fn, arg) => page.evaluate(fn, arg);
let n = 0;
const shot = async (name) => { await page.screenshot({ path: `${out}/${String(n++).padStart(2, '0')}-${name}.png` }); };
const info = () => ev(() => {
  const ow = window.__ow, s = ow.story(), sp = s.spirit, q = s.quarry(), b = ow._body.pos;
  return { step: s.state().step, spirit: [sp.pos.x, sp.pos.z].map((v) => +v.toFixed(1)), q: q && [q.x, q.z].map((v) => +v.toFixed(1)), me: [b.x, b.z].map((v) => +v.toFixed(1)), lasso: !!sp.want.lasso, usher: !!sp.want.usher, settled: !!sp.want.settled, acts: sp.acts.map((a) => a.kind), lassoT: +sp.lassoT.toFixed(2), herd: ow.herd()?.count };
});
// A side-on view of the spirit and what it's looking at.
const frame = (dist = 9, side = 1.2, pitch = 0.18) => ev(([dist, side, pitch]) => {
  const ow = window.__ow, s = ow.story(), sp = s.spirit.pos, q = s.quarry() ?? s.stable.gate;
  const mid = sp.clone().lerp(q, 0.4);
  ow.focusAt(mid.x, mid.y + 0.8, mid.z);
  ow.view(Math.atan2(sp.x - q.x, sp.z - q.z) + side, pitch, dist);
}, [dist, side, pitch]);
await ev(() => { window.__ow.setHour(14); window.__ow.manual(true); window.__ow.advance(60, 1 / 30); });
console.log('start', await info());
// Follow the spirit out (stand a few metres behind it as it goes).
for (let i = 0; i < 14; i++) {
  await ev(() => { const ow = window.__ow, s = ow.story(), sp = s.spirit.pos, q = s.quarry(); if (!q) return; const d = sp.clone().sub(q).setY(0).setLength(3.5); ow.teleport(sp.x + d.x, sp.z + d.z); ow.advance(15, 1 / 30); });
}
console.log('out there', await info());
// Catch the lesson at the start of a cycle, then walk through it.
await ev(() => { const ow = window.__ow; for (let i = 0; i < 400 && ow.story().spirit.lassoT % 4.8 > 0.1; i++) ow.advance(1, 1 / 30); });
for (const [t, name] of [[0.3, 'turn'], [1.0, 'twirl'], [1.6, 'twirl2'], [2.1, 'fling'], [2.4, 'fling2'], [3.0, 'now-you']]) {
  await ev((t) => { const ow = window.__ow; for (let i = 0; i < 400 && (ow.story().spirit.lassoT % 4.8) < t; i++) ow.advance(1, 1 / 60); }, t);
  await frame(9, 0.55, 0.12);
  await ev(() => window.__ow.advance(1, 1 / 60));
  await shot(name);
}
await frame(18, 0.35, 0.3);
await ev(() => window.__ow.advance(1, 1 / 60));
await shot('wide');
console.log('lesson', await info());
// Tame it: on your lead now.
await ev(() => { const ow = window.__ow; ow.tameNearest('stelk'); ow.advance(90, 1 / 30); });
console.log('caught', await info());
await ev(() => window.__ow.advance(150, 1 / 30));
await ev(() => { const ow = window.__ow, s = ow.story(), g = s.stable.gate, o = s.stable.gateOut; const d = o.clone().sub(g).setY(0).setLength(6); ow.teleport(g.x + d.x, g.z + d.z); ow.advance(120, 1 / 30); });
console.log('at the gate', await info());
for (const k of [0, 40, 25]) {
  await ev((k) => { const ow = window.__ow, s = ow.story(), g = s.stable.gate, sp = s.spirit.pos; ow.advance(k, 1 / 30); ow.focusAt(g.x, g.y + 0.8, g.z); const o = s.stable.gateOut.clone().sub(g).setY(0).normalize(); ow.view(Math.atan2(o.x, o.z) + 0.5, 0.2, 11); ow.advance(1, 1 / 30); }, k);
  await shot('usher');
}
// Lead it in: through the gate, into the middle.
for (const k of [0.3, -1, -3, -6, -9]) {
  await ev((k) => { const ow = window.__ow, s = ow.story(), g = s.stable.gate, o = s.stable.gateOut; const d = o.clone().sub(g).setY(0).normalize(); ow.teleport(g.x + d.x * k, g.z + d.z * k); ow.advance(25, 1 / 30); }, k);
}
console.log('led in', await info());
// The praise: over to you, then the cheer (shot from in front of it).
await ev(() => { const ow = window.__ow, sp = ow.story().spirit; for (let i = 0; i < 400 && sp.acts[0]?.phase !== 'cheer'; i++) ow.advance(1, 1 / 30); });
console.log('cheer', await info());
let at = 0;
for (const t of [0.2, 0.6, 0.9, 1.3, 1.9, 2.8, 3.8]) {
  await ev((k) => { const ow = window.__ow, s = ow.story(), sp = s.spirit.pos, b = ow._body.pos; ow.advance(Math.max(1, Math.round(k * 30)), 1 / 30); const m = sp.clone().lerp(b, 0.35); ow.focusAt(m.x, m.y + 0.7, m.z); ow.view(Math.atan2(b.x - sp.x, b.z - sp.z) + 0.75, 0.12, 4.5); ow.advance(1, 1 / 30); }, t - at);
  at = t + 1 / 30;
  await shot(`cheer-${t}`);
}
console.log('after', await info());
for (const k of [150, 300, 600, 900]) {
  await ev((k) => { const ow = window.__ow, s = ow.story(), sp = s.spirit.pos; ow.advance(k, 1 / 30); ow.focusAt(sp.x, sp.y + 0.8, sp.z); ow.view(Math.atan2(sp.x - s.stable.gate.x, sp.z - s.stable.gate.z), 0.25, 10); ow.advance(1, 1 / 30); }, k);
  console.log('later', await info());
  await shot('later');
}
await browser.close(); server.close();
