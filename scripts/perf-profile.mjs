// Main-thread profile of the frame, standing still:
//   npx vite build --minify false --outDir dist-prof && node scripts/perf-profile.mjs dist-prof "seed=hilda&t=10" [secs=4]
// Prints self time by function (an unminified build keeps the names) as ms
// per frame, and the share that is three's renderer.
import { chromium } from 'playwright';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const [dir = 'dist', q = 'seed=hilda&t=10', secs = '4'] = process.argv.slice(2);
const server = http.createServer((req, res) => {
  const p = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  const f = path.join(root, dir, p === '/' ? 'index.html' : p);
  if (!fs.existsSync(f)) { res.writeHead(404); res.end(); return; }
  res.writeHead(200, { 'content-type': f.endsWith('.js') ? 'text/javascript' : f.endsWith('.html') ? 'text/html' : f.endsWith('.css') ? 'text/css' : 'application/octet-stream' });
  fs.createReadStream(f).pipe(res);
});
await new Promise((r) => server.listen(0, r));
const browser = await chromium.launch({ args: ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist', '--disable-gpu-vsync', '--disable-frame-rate-limit'] });
const page = await browser.newPage({ viewport: { width: 1600, height: 900 }, deviceScaleFactor: 1 });
page.on('pageerror', (e) => console.log('[pageerror]', e.message));
await page.goto(`http://localhost:${server.address().port}/?${q}&ui=0&paused=1&capture=1`);
for (let i = 0, ok = 0; i < 300 && ok < 4; i++) { ok = (await page.evaluate(() => window.__ow?.ready())) ? ok + 1 : 0; await page.waitForTimeout(250); }
await page.waitForTimeout(1000);
const cdp = await page.context().newCDPSession(page);
await cdp.send('Profiler.enable');
await cdp.send('Profiler.setSamplingInterval', { interval: 100 });
const f0 = await page.evaluate(() => new Promise((r) => { let n = 0; const t0 = performance.now(); const tick = () => { n++; if (performance.now() - t0 < 1000) requestAnimationFrame(tick); else r(n); }; requestAnimationFrame(tick); }));
await page.evaluate(() => { window.__n = 0; const tick = () => { window.__n++; requestAnimationFrame(tick); }; requestAnimationFrame(tick); });
await cdp.send('Profiler.start');
const n0 = await page.evaluate(() => window.__n);
await page.waitForTimeout(+secs * 1000);
const n1 = await page.evaluate(() => window.__n);
const { profile } = await cdp.send('Profiler.stop');
const frames = n1 - n0;
const dt = profile.timeDeltas, self = new Map();
const byId = new Map(profile.nodes.map((n) => [n.id, n]));
let total = 0;
profile.samples.forEach((id, i) => {
  const n = byId.get(id), d = dt[i] / 1000;
  const name = `${n.callFrame.functionName || '(anon)'}:${n.callFrame.lineNumber}`;
  self.set(name, (self.get(name) ?? 0) + d);
  total += d;
});
console.log(`${frames} frames in ${secs}s (${(+secs * 1000 / frames).toFixed(2)} ms each; ${f0} fps before profiling)`);
const rows = [...self.entries()].sort((a, b) => b[1] - a[1]);
for (const [k, v] of rows.slice(0, 45)) console.log(`${(v / frames).toFixed(3).padStart(7)} ms/frame  ${k}`);
await browser.close();
server.close();
