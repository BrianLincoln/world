// The wild biomes: node scripts/biomes.mjs <outdir> "name:x,z,yaw,pitch,dist,hour;..."  (seed hilda)
import { chromium } from 'playwright';
import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path';
const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const [out, list, seed = 'hilda'] = process.argv.slice(2);
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
const page = await browser.newPage({ viewport: { width: 1000, height: 650 } });
page.on('pageerror', (e) => console.log('[pageerror]', e.message));
for (const item of list.split(';')) {
  const [name, rest] = item.split(':');
  const [x, z, yaw, pitch, dist, hour] = rest.split(',').map(Number);
  await page.goto(`http://localhost:${server.address().port}/?seed=${seed}&x=${x}&z=${z}&yaw=${yaw}&pitch=${pitch}&dist=${dist}&t=${hour}&ui=0&capture=1&paused=1`);
  for (let i = 0; i < 160; i++) { if (await page.evaluate(() => window.__ow?.ready())) break; await page.waitForTimeout(250); }
  await page.waitForTimeout(2500);
  await page.screenshot({ path: `${out}/${name}.png` });
}
await browser.close(); server.close();
