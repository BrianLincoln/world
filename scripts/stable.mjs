// Phase 3 (the stable) shots: node scripts/stable.mjs <outdir> [shot,shot...] [seed]
// Shots: plot, footing, raise, fence, lasso, gift, herd, home, front, aerial, night.
// Each loads a fresh page, jumps to the step (`__ow.stableJump`) and frames it.
import { chromium } from 'playwright';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const [outDir = 'shots/stable', only, seed = 'hilda'] = process.argv.slice(2);
fs.mkdirSync(outDir, { recursive: true });
const server = http.createServer((req, res) => {
  const p = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  const f = path.join(root, 'dist', p === '/' ? 'index.html' : p);
  if (!fs.existsSync(f)) { res.writeHead(404); res.end(); return; }
  res.writeHead(200, { 'content-type': f.endsWith('.js') ? 'text/javascript' : f.endsWith('.html') ? 'text/html' : f.endsWith('.css') ? 'text/css' : 'application/octet-stream' });
  fs.createReadStream(f).pipe(res);
});
await new Promise((r) => server.listen(0, r));
const browser = await chromium.launch({ args: ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist'] });

// Frame the pasture from pasture-local (lx, lz), `up` m above its ground, looking at (tx, tz, ty).
const frame = (lx, lz, up, tx, tz, ty) => `(() => {
  const s = __ow.story(), st = s.stable;
  const eye = st.local(${lx}, ${lz}, ${up}), t = st.local(${tx}, ${tz}, ${ty});
  __ow.focusAt(t.x, t.y, t.z);
  const dx = eye.x - t.x, dz = eye.z - t.z, dy = eye.y - t.y, d = Math.hypot(dx, dy, dz);
  __ow.view(Math.atan2(dx, dz), Math.asin(dy / d), d);
})()`;
// The stable's end of the pasture is at lx = end * 12.5.
const E = `__ow.story().stable.p.end`;
const shots = {
  plot: { step: 'plot', t: 10, js: frame(0, 34, 14, 0, -2, 0) },
  tally: { step: 'ranch', t: 12, herd: true, js: `(() => { const s = __ow.story(), t = s.stable.tallyPos, f = t.clone().add(s.stable.gateOut.clone().sub(s.stable.gate)); __ow.focusAt(t.x, t.y - 0.3, t.z); const dx = f.x - t.x, dz = f.z - t.z; __ow.view(Math.atan2(dx, dz), 0.05, 5); })()` },
  footing: { step: 'footing', t: 10.5, js: `(() => { const e = ${E}; ${frame('-e * 2', '8', '4', 'e * 14', '0', '1')}; })()` },
  raise: { step: 'raise', t: 11, js: `(() => { const e = ${E}; ${frame('-e * 3', '9', '5', 'e * 14', '0', '2')}; })()` },
  fence: { step: 'fence', t: 13, js: frame(-6, 26, 9, 0, 6, 0) },
  lasso: { step: 'lasso', t: 14, wait: 0 },
  gift: { step: 'lasso', t: 14, wait: 3.2 },
  herd: { step: 'herd', t: 15, js: frame(4, 20, 5, 0, 8, 1) },
  front: { step: 'ranch', t: 15.5, herd: true, js: `(() => { const e = ${E}; ${frame('-e * 2', '3', '2.5', 'e * 14', '0', '1.8')}; })()` },
  home: { step: 'ranch', t: 16.5, herd: true, js: frame(-5, 28, 8, 0, 0, 1) },
  aerial: { step: 'ranch', t: 10, herd: true, js: frame(-30, 50, 45, 0, 0, 0) },
  night: { step: 'ranch', t: 22.5, herd: true, js: `(() => { const e = ${E}; ${frame('-e * 4', '10', '4', 'e * 14', '0', '1.5')}; })()` },
};
const list = only ? only.split(',') : Object.keys(shots);
for (const name of list) {
  const s = shots[name];
  const page = await browser.newPage({ viewport: { width: 1600, height: 900 } });
  page.on('pageerror', (e) => console.log('[pageerror]', name, e.message));
  page.on('console', (m) => { if (m.type() === 'error' && !m.text().includes('useProgram')) console.log('[page]', name, m.text().slice(0, 300)); });
  await page.goto(`http://localhost:${server.address().port}/?seed=${seed}&story=1&fresh=1&stable=${s.step}&ui=0&capture=1&mobs=0`);
  for (let i = 0; i < 160; i++) { if (await page.evaluate(() => window.__ow?.ready())) break; await page.waitForTimeout(250); }
  await page.evaluate((t) => { window.__ow.setHour(t); }, s.t);
  if (s.herd) await page.evaluate(() => window.__ow.manual(true));
  if (s.herd) {
    // A mixed herd living here: tame some fresh arrivals and walk them in.
    // HERD='[["glimmer",2],...]' swaps in other kinds.
    const herd = process.env.HERD ? JSON.parse(process.env.HERD) : [['stelk', 4], ['floof', 3], ['crow', 3]];
    await page.evaluate((herd) => {
      const ow = window.__ow;
      for (const [sp, n] of herd) { ow.bringHome(sp, n); ow.advance(2, 1 / 30); }
    }, herd);
    await page.evaluate(() => { window.__ow.manual(true); window.__ow.advance(300, 1 / 30); window.__ow.manual(false); });
  }
  if (s.wait) await page.waitForTimeout(s.wait * 1000);
  if (s.js) await page.evaluate(s.js);
  await page.waitForTimeout(900);
  await page.screenshot({ path: path.join(outDir, `${name}.png`) });
  console.log('shot', name);
  await page.close();
}
await browser.close();
server.close();
