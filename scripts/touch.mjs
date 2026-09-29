// Touch-controls check: a phone-sized, touch-enabled context drives the stick,
// look drag, pinch and buttons with real touch pointers, and screenshots it.
//   node scripts/touch.mjs [--no-build]
import { chromium, devices } from 'playwright';
import { execSync } from 'node:child_process';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
if (!process.argv.includes('--no-build')) execSync('npx vite build --logLevel warn', { cwd: root, stdio: 'inherit' });
const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css' };
const server = http.createServer((req, res) => {
  const p = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  const f = path.join(root, 'dist', p === '/' ? 'index.html' : p);
  if (!fs.existsSync(f)) { res.writeHead(404); res.end(); return; }
  res.writeHead(200, { 'content-type': types[path.extname(f)] ?? 'application/octet-stream' });
  fs.createReadStream(f).pipe(res);
});
await new Promise((r) => server.listen(0, r));
const outDir = path.join(root, 'shots');
fs.mkdirSync(outDir, { recursive: true });

const browser = await chromium.launch({ args: ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist'] });
const ctx = await browser.newContext({ ...devices['iPhone 13'], viewport: { width: 844, height: 390 }, screen: { width: 844, height: 390 } });
const page = await ctx.newPage();
page.on('pageerror', (e) => console.log('pageerror', e.message));
await page.goto(`http://localhost:${server.address().port}/?seed=hilda&t=10`);
for (let ok = 0; ok < 3;) { ok = (await page.evaluate(() => window.__ow?.ready())) ? ok + 1 : 0; await page.waitForTimeout(250); }
await page.waitForTimeout(1200);

const cdp = await ctx.newCDPSession(page);
const touch = (type, points) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: points.map(([x, y, id]) => ({ x, y, id })) });
const info = async () => ({
  pos: await page.evaluate(() => document.getElementById('fps')?.textContent.split('\n')[2]),
  buttons: await page.$$eval('#touch .tbtn', (bs) => bs.filter((b) => !b.hidden).map((b) => b.textContent)),
});
console.log('start', await info());
await page.screenshot({ path: path.join(outDir, 'touch-idle.png') });

// Stick: push forward and hold.
await touch('touchStart', [[120, 300, 1]]);
for (let i = 1; i <= 6; i++) { await touch('touchMove', [[120, 300 - i * 9, 1]]); await page.waitForTimeout(16); }
await page.waitForTimeout(1500);
await page.screenshot({ path: path.join(outDir, 'touch-stick.png') });
console.log('jogging', await info());
// Stick + look drag at the same time.
await touch('touchMove', [[120, 246, 1], [600, 200, 2]]);
for (let i = 1; i <= 10; i++) { await touch('touchMove', [[120, 246, 1], [600 - i * 15, 200, 2]]); await page.waitForTimeout(16); }
await touch('touchEnd', [[120, 246, 1]]);
await touch('touchEnd', []);
await page.waitForTimeout(600);
console.log('after look', await info());
// Follow camera: hold the stick hard right. With the camera following, the
// path curves (you circle); without it, it would be a straight strafe.
const xz = async () => (await info()).pos.split(' · ')[1].split(', ').map(Number);
await touch('touchStart', [[120, 300, 5]]);
for (let i = 1; i <= 6; i++) { await touch('touchMove', [[120 + i * 9, 300, 5]]); await page.waitForTimeout(16); }
const pts = [];
for (let i = 0; i < 5; i++) { pts.push(await xz()); await page.waitForTimeout(700); }
await page.screenshot({ path: path.join(outDir, 'touch-follow.png') });
await touch('touchEnd', []);
const dirs = pts.slice(1).map((p, i) => Math.round((Math.atan2(p[2] - pts[i][2], p[0] - pts[i][0]) * 180) / Math.PI));
console.log('strafe-right travel direction per 0.7s (deg, should turn):', dirs);
await page.waitForTimeout(500);
// Pinch zoom out.
await touch('touchStart', [[520, 200, 3], [640, 200, 4]]);
for (let i = 1; i <= 10; i++) { await touch('touchMove', [[520 + i * 5, 200, 3], [640 - i * 5, 200, 4]]); await page.waitForTimeout(16); }
await touch('touchEnd', []);
await page.waitForTimeout(800);
await page.screenshot({ path: path.join(outDir, 'touch-pinch.png') });
// Jump, then fly.
await page.tap('#touch .jump');
await page.waitForTimeout(250);
await page.screenshot({ path: path.join(outDir, 'touch-jump.png') });
await page.waitForTimeout(800);
await page.tap('#touch .fly');
await page.waitForTimeout(600);
console.log('flying', await info());
await page.screenshot({ path: path.join(outDir, 'touch-fly.png') });
await browser.close();
server.close();
