// Screenshot + perf harness.
//   node scripts/shots.mjs [--no-build] [--only name,name] [--perf] [--out dir]
// Builds the static site, serves dist/ locally, drives headless Chromium on
// the GPU, and writes PNGs to shots/. Each shot waits until terrain streaming
// is idle so images are complete.
import { chromium } from 'playwright';
import { execSync } from 'node:child_process';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const args = process.argv.slice(2);
const flag = (f) => args.includes(f);
const opt = (f, d) => (args.includes(f) ? args[args.indexOf(f) + 1] : d);
const outDir = path.join(root, opt('--out', 'shots'));
fs.mkdirSync(outDir, { recursive: true });

if (!flag('--no-build')) execSync('npx vite build --logLevel warn', { cwd: root, stdio: 'inherit' });

const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png' };
const server = http.createServer((req, res) => {
  const p = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  let f = path.join(root, 'dist', p === '/' ? 'index.html' : p);
  if (!fs.existsSync(f)) { res.writeHead(404); res.end(); return; }
  res.writeHead(200, { 'content-type': types[path.extname(f)] ?? 'application/octet-stream' });
  fs.createReadStream(f).pipe(res);
});
await new Promise((r) => server.listen(0, r));
const port = server.address().port;

// name, url params, optional setup
const SHOTS = [
  { name: 'meadow-morning', q: 'seed=hilda&t=9.2' },
  { name: 'meadow-noon-wide', q: 'seed=hilda&t=12.5&pitch=0.12&dist=14' },
  { name: 'rose-dawn', q: 'seed=hilda&t=7.1&yaw=2.4' },
  { name: 'coral-dusk', q: 'seed=hilda&t=18.3&yaw=-1.2' },
  { name: 'night', q: 'seed=hilda&t=23&yaw=1.0' },
  { name: 'aerial', q: 'seed=hilda&t=10&mode=fly&y=140&pitch=0.22&dist=30&yaw=2.6' },
  { name: 'seed-fjord', q: 'seed=fjord&t=9.8&yaw=0.3' },
  { name: 'seed-fjord-aerial', q: 'seed=fjord&t=16.4&mode=fly&y=220&pitch=0.25&dist=30&yaw=-2' },
  { name: 'seed-42', q: 'seed=42&t=8.2&yaw=-0.5' },
  { name: 'cabin-day', q: 'seed=hilda&t=10.5&pitch=0.14&dist=12', setup: "window.__ow.lookAtPoi('cabin', 30)" },
  { name: 'cabin-night', q: 'seed=hilda&t=22.5&pitch=0.12&dist=12', setup: "window.__ow.lookAtPoi('cabin', 26, 2.2)" },
  { name: 'tor', q: 'seed=hilda&t=15.5&pitch=0.06&dist=14', setup: "window.__ow.lookAtPoi('tor', 55, null, 6)" },
  { name: 'circle', q: 'seed=hilda&t=14&pitch=0.12&dist=14', setup: "window.__ow.lookAtPoi('circle', 26)" },
  { name: 'erratic', q: 'seed=fjord&t=10.5&pitch=0.1&dist=12', setup: "window.__ow.lookAtPoi('erratic', 30)" },
  { name: 'ui', q: 'seed=hilda&t=11&pitch=0.15&dist=12', ui: true },
  { name: 'vista', q: 'seed=hilda&t=9.8&pitch=0.04&dist=9', setup: 'window.__ow.facePeak()' },
  { name: 'vista-fjord', q: 'seed=fjord&t=17.2&pitch=0.04&dist=9', setup: 'window.__ow.facePeak()' },
  { name: 'vista-42-dawn', q: 'seed=42&t=7.2&pitch=0.04&dist=9', setup: 'window.__ow.facePeak()' },
  { name: 'seed-42-dusk', q: 'seed=42&t=18.6&mode=fly&y=80&pitch=0.15&dist=25&yaw=2.5' },
];
const only = opt('--only', null)?.split(',');

const browser = await chromium.launch({
  args: ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist', ...(flag('--uncapped') ? ['--disable-gpu-vsync', '--disable-frame-rate-limit'] : [])],
});
const page = await browser.newPage({ viewport: { width: 1600, height: 900 }, deviceScaleFactor: 1 });
page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') console.log('[page]', m.type(), m.text().slice(0, 400)); });
page.on('pageerror', (e) => console.log('[pageerror]', e.message));

async function waitReady(timeout = 60000) {
  const t0 = Date.now();
  // Let the quadtree settle: needs a few consecutive idle checks.
  let ok = 0;
  while (Date.now() - t0 < timeout) {
    const r = await page.evaluate(() => window.__ow && window.__ow.ready());
    ok = r ? ok + 1 : 0;
    if (ok >= 4) return true;
    await page.waitForTimeout(250);
  }
  console.log('  (timed out waiting for terrain)');
  return false;
}

let gpuLogged = false;
for (const s of SHOTS) {
  if (only && !only.includes(s.name)) continue;
  const url = `http://localhost:${port}/?${s.q}${s.ui ? '' : '&ui=0'}&paused=1&capture=1`;
  await page.goto(url);
  if (!gpuLogged) {
    const gl = await page.evaluate(() => {
      const c = document.createElement('canvas').getContext('webgl2');
      const e = c.getExtension('WEBGL_debug_renderer_info');
      return e ? c.getParameter(e.UNMASKED_RENDERER_WEBGL) : 'unknown';
    });
    console.log('GPU:', gl);
    gpuLogged = true;
  }
  await page.waitForTimeout(500);
  if (s.setup) { await waitReady(); await page.evaluate(s.setup); await page.waitForTimeout(300); }
  await waitReady();
  await page.waitForTimeout(400);
  const st = await page.evaluate(() => window.__ow.stats());
  await page.screenshot({ path: path.join(outDir, `${s.name}.png`) });
  console.log(`${s.name}: ${(st.tris / 1e6).toFixed(2)}M tris, ${st.calls} calls, ${st.nodes} nodes, ${st.instances} inst, chunk ${st.avgMs.toFixed(1)}ms`);
  if (flag('--kinds')) console.log('   ', Object.entries(st.kinds).map(([k, v]) => `${k}: ${v.inst} inst ${(v.tris / 1e6).toFixed(2)}M`).join(' | '));
}

if (flag('--perf')) {
  // Walk/run/fly through the world and record frame times.
  await page.goto(`http://localhost:${port}/?seed=hilda&t=10&ui=0&paused=1`);
  await waitReady();
  const res = await page.evaluate(async () => {
    const ow = window.__ow;
    const times = [];
    const run = (ms, keys) => new Promise((resolve) => {
      for (const k of keys) window.dispatchEvent(new KeyboardEvent('keydown', { code: k }));
      let last = performance.now();
      const t0 = last;
      const tick = () => {
        const now = performance.now();
        times.push(now - last);
        last = now;
        if (now - t0 < ms) requestAnimationFrame(tick);
        else {
          for (const k of keys) window.dispatchEvent(new KeyboardEvent('keyup', { code: k }));
          resolve();
        }
      };
      requestAnimationFrame(tick);
    });
    await run(6000, ['KeyW', 'ShiftLeft']);
    ow.setMode('fly', 60);
    await run(8000, ['KeyW', 'ShiftLeft']);
    times.sort((a, b) => a - b);
    const avg = times.reduce((a, b) => a + b, 0) / times.length;
    return { frames: times.length, avg, p50: times[times.length >> 1], p95: times[Math.floor(times.length * 0.95)], p99: times[Math.floor(times.length * 0.99)], max: times[times.length - 1], stats: ow.stats() };
  });
  console.log('PERF', JSON.stringify(res, null, 1));
}

await browser.close();
server.close();
