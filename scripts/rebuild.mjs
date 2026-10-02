// A house being built again, every step of every kind of hut:
//   node scripts/rebuild.mjs <outdir> [seed=hilda] [t=10.5]
//   v<variant>-s<step>.png: from the lane, at about your eye level;
//   v<variant>-s<step>-up.png: from a little above, the other side;
//   sheet.png: all of the first, variants down, steps 0 to 5 across.
// Uses `__ow.house(i, step)`. Needs a build (npx vite build).
import { chromium } from 'playwright';
import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path';
const root = process.cwd(); const out = process.argv[2];
const arg = (k, d) => process.argv.find((a) => a.startsWith(k + '='))?.slice(k.length + 1) ?? d;
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
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
page.on('pageerror', (e) => console.log('[pageerror]', e.message));
const W = (ms) => page.waitForTimeout(ms);
const ev = (f, a) => page.evaluate(f, a);
await page.goto(`http://localhost:${server.address().port}/?seed=${arg('seed', 'hilda')}&story=1&fresh=1&mobs=0&bikes=0&drak=0&capture=1&ui=0&t=${arg('t', '10.5')}`);
for (let i = 0; i < 160; i++) { if (await ev(() => window.__ow?.ready())) break; await W(250); }
await W(1500);
// One house of each kind.
const pick = await ev(() => { const v = window.__ow.village(), got = {}; for (const [i, h] of v.houses.entries()) got[h.plot.variant] ??= i; return got; });
console.log('houses by variant', JSON.stringify(pick));
const look = (i, side, pitch, dist) => ev(([i, side, pitch, dist]) => {
  const o = window.__ow, h = o.village().houses[i], r = h.plot.rot;
  o.rig.root.visible = false;
  o.teleport(h.plot.x + Math.sin(r) * 40, h.plot.z + Math.cos(r) * 40);
  o.focusAt(h.plot.x, h.plot.y + 1.3, h.plot.z); o.view(r + side, pitch, dist);
}, [i, side, pitch, dist]);
for (const [v, i] of Object.entries(pick)) {
  for (let s = 0; s <= 5; s++) {
    const got = await ev(([i, s]) => { const o = window.__ow, r = o.house(i, s), v = o.village(); for (const [k, l] of v.life.entries()) if (v.home[k] === i) l.t = 0.5; return r; }, [i, s]);
    if (got !== s) console.log(`FAIL house ${i} step ${s}: at ${got}`);
    await look(i, 0.55, 0.14, 13); await W(s ? 900 : 3500);
    await page.screenshot({ path: `${out}/v${v}-s${s}.png` });
    await look(i, -0.9, 0.5, 12); await W(500);
    await page.screenshot({ path: `${out}/v${v}-s${s}-up.png` });
  }
  // Standing on it: what's under a foot at the middle of the plot, from high above, at each step.
  const tops = await ev((i) => { const o = window.__ow, v = o.village(), h = v.houses[i], r = []; for (let s = 0; s <= 5; s++) { o.house(i, s); const y = v.surface(h.plot.x, h.plot.z, 1e4, 0.3, 0); r.push(y > -1e9 ? +(y - h.plot.y).toFixed(2) : null); } return r; }, i);
  console.log(`variant ${v} (house ${i}): top under a foot at steps 0..5 (m above the plot): ${JSON.stringify(tops)}`);
}
// The sheet.
const img = (f) => `data:image/png;base64,${fs.readFileSync(`${out}/${f}`).toString('base64')}`;
const rows = Object.keys(pick).map((v) => `<div>${[0, 1, 2, 3, 4, 5].map((s) => `<img src="${img(`v${v}-s${s}.png`)}">`).join('')}</div>`).join('');
const sheet = await browser.newPage({ viewport: { width: 6 * 480, height: Object.keys(pick).length * 270 } });
await sheet.setContent(`<style>body{margin:0;background:#000}div{display:flex}img{width:480px;height:270px}</style>${rows}`);
await sheet.screenshot({ path: `${out}/sheet.png` });
await browser.close(); server.close();
