// Snow in the cold: node scripts/snow.mjs <dir> [seed=hilda] [at=x,z,yaw,pitch,dist] [amounts=1,12,30,100]
//   A cold valley by day at each amount of snow (`postSettings.cold.snow`), at dusk and night at the second,
//   and what each costs: the frame time uncapped (median of rAF intervals) against none falling.
// Serves $DIST (build to your own folder).
import { chromium } from 'playwright';
import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path';
const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const args = process.argv.slice(2);
const out = args[0] ?? 'shots/snow';
const opt = (k, d) => args.find((a) => a.startsWith(k + '='))?.slice(k.length + 1) ?? d;
const seed = opt('seed', 'hilda');
const amounts = opt('amounts', '1,12,30,100').split(',').map(Number);
const [x, z, yaw, pitch = 0.14, dist = 17] = opt('at', '-1115,-1548,8.21').split(',').map(Number);
fs.mkdirSync(out, { recursive: true });
const server = http.createServer((req, res) => {
  const p = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  const f = path.join(root, process.env.DIST ?? 'dist', p === '/' ? 'index.html' : p);
  if (!fs.existsSync(f)) { res.writeHead(404); res.end(); return; }
  res.writeHead(200, { 'content-type': f.endsWith('.js') ? 'text/javascript' : f.endsWith('.html') ? 'text/html' : f.endsWith('.css') ? 'text/css' : 'application/octet-stream' });
  fs.createReadStream(f).pipe(res);
});
await new Promise((r) => server.listen(0, r));
const browser = await chromium.launch({ args: ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist', '--disable-frame-rate-limit', '--disable-gpu-vsync'] });
const page = await browser.newPage({ viewport: { width: 1600, height: 900 } });
page.on('pageerror', (e) => console.log('[pageerror]', e.message));
page.on('console', (m) => { if (m.type() === 'error' && !m.text().includes('useProgram')) console.log('[console]', m.text().slice(0, 300)); });
await page.goto(`http://localhost:${server.address().port}/?seed=${seed}&story=0&t=9.5&mobs=0&fresh=1&ui=0&capture=1&cold=1`);
for (let i = 0; i < 120; i++) { if (await page.evaluate(() => window.__ow?.ready())) break; await page.waitForTimeout(250); }
const W = (ms) => page.waitForTimeout(ms);
const ev = (f, a) => page.evaluate(f, a);
const idle = async () => { let ok = 0; for (let i = 0; i < 120 && ok < 4; i++) { ok = (await ev(() => window.__ow.ready())) ? ok + 1 : 0; await W(200); } await W(400); };
const shot = async (name) => { await W(300); await page.screenshot({ path: `${out}/${name}.png` }); console.log(name); };
const snow = (n) => ev((n) => { window.__ow.post.cold.snow = n; }, n);
const ms = () => ev(() => new Promise((done) => { const t = []; let last = performance.now(); const f = (now) => { t.push(now - last); last = now; if (t.length < 140) requestAnimationFrame(f); else { t.splice(0, 20); t.sort((a, b) => a - b); done(t[t.length >> 1]); } }; requestAnimationFrame(f); }));
await ev(([x, z, yaw, pitch, dist]) => { const o = window.__ow; o.beacons.debugSet('none'); o.focusAt(null); o.teleport(x, z); o.view(yaw, pitch, dist); }, [x, z, yaw, pitch, dist]);
await idle();
// (Other things use this machine's GPU too: each amount is timed three times, turn about, and the best kept.)
const best = new Map([0, ...amounts].map((n) => [n, Infinity]));
for (let k = 0; k < 3; k++) for (const n of best.keys()) { await snow(n); await W(400); best.set(n, Math.min(best.get(n), await ms())); }
for (const [n, t] of best) console.log(`snow ${n}: ${t.toFixed(2)} ms a frame${n ? ` (+${(t - best.get(0)).toFixed(2)})` : ''}`);
for (const n of amounts) { await snow(n); await shot(`day-${String(n).padStart(3, '0')}`); }
await snow(amounts[1] ?? amounts[0]);
for (const h of [18.4, 22.5]) { await ev((h) => window.__ow.setHour(h), h); await shot(`hour-${h}`); }
await browser.close(); server.close();
