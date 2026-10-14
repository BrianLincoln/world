// Getting on the gift bike, as you would: node scripts/giftmount.mjs <dir> [seeds=hilda,fjord,...] [from=yard|door|far]
// The gift shot plays out (you in the yard), you walk to the bike by the keys,
// press E and ride off down the path with the camera left as play leaves it.
// Shoots the walk's end and the first two seconds of riding, and prints, per
// frame, whether the cabin stands between the camera and the explorer.
// Uses the build in dist/, or in $DIST.
import { chromium } from 'playwright';
import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path';
const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const args = process.argv.slice(2);
const out = args[0] ?? 'shots/giftmount';
const opt = (k, d) => args.find((a) => a.startsWith(k + '='))?.slice(k.length + 1) ?? d;
const seeds = opt('seeds', 'hilda,fjord,embla,troll').split(',');
const froms = opt('from', 'yard,door,far').split(',');
fs.mkdirSync(out, { recursive: true });
const dist = process.env.DIST ?? 'dist';
const server = http.createServer((req, res) => { const p = decodeURIComponent(new URL(req.url, 'http://x').pathname); const f = path.join(root, dist, p === '/' ? 'index.html' : p); if (!fs.existsSync(f)) { res.writeHead(404); res.end(); return; } res.writeHead(200, { 'content-type': f.endsWith('.js') ? 'text/javascript' : f.endsWith('.html') ? 'text/html' : 'application/octet-stream' }); fs.createReadStream(f).pipe(res); });
await new Promise((r) => server.listen(0, r));
const browser = await chromium.launch({ args: ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist'] });
let bad = 0;
for (const seed of seeds) for (const from of froms) {
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  page.on('pageerror', (e) => console.log('[pageerror]', e.message));
  await page.goto(`http://localhost:${server.address().port}/?seed=${seed}&story=1&fresh=1&journey=gift&t=15&mobs=0&ui=0&capture=1`);
  for (let i = 0; i < 160; i++) { if (await page.evaluate(() => window.__ow?.ready())) break; await page.waitForTimeout(250); }
  await page.evaluate(() => window.__ow.manual(true));
  // Where you are when the spirit sees you: in the yard, out of the door, or coming back from further off.
  await page.evaluate((from) => {
    const ow = window.__ow, st = ow.gen().story, j = ow.gen().journey.toHome;
    ow.journeyJump('gift');
    const [yx, yz] = j[0];
    const ox = yx - st.x, oz = yz - st.z, ol = Math.hypot(ox, oz) || 1;
    if (from === 'yard') ow.teleport(yx + 3, yz + 3);
    else if (from === 'door') ow.teleport(st.x + (ox / ol) * 5, st.z + (oz / ol) * 5);
    else ow.teleport(yx + (ox / ol) * 14 + (oz / ol) * 6, yz + (oz / ol) * 14 - (ox / ol) * 6);
  }, from);
  // The shot, until it hands the camera back.
  let started = false;
  for (let i = 0; i < 60 * 40; i += 30) {
    const s = await page.evaluate(() => { window.__ow.advance(30); return window.__ow.journey().busy; });
    if (s) started = true; else if (started) break;
  }
  await page.evaluate(() => window.__ow.advance(60));
  // Walk to the bike by the keys (steering held to the way to it, the camera left alone).
  const cabinBlocks = () => page.evaluate(() => {
    const ow = window.__ow, cab = ow.story().cabin, cam = ow._cam.position, p = ow.body.pos;
    for (let i = 1; i < 20; i++) { const t = i / 20; if (cab.inside(cam.x + (p.x - cam.x) * t, cam.z + (p.z - cam.z) * t, -0.2) && cam.y + (p.y + 1.2 - cam.y) * t < ow.story().site.y + 5.2) return true; }
    return false;
  });
  for (let i = 0; i < 40; i++) {
    const d = await page.evaluate(() => {
      const ow = window.__ow, k = ow.bikes.bikes.get('gift'), p = ow.body.pos;
      const dx = k.pos.x - p.x, dz = k.pos.z - p.z;
      ow.lockInput(Math.atan2(-dx, -dz));
      return Math.hypot(dx, dz);
    });
    if (d < 1.4) break;
    await page.keyboard.down('KeyW');
    await page.evaluate(() => window.__ow.advance(6));
    await page.keyboard.up('KeyW');
  }
  await page.evaluate(() => { window.__ow.lockInput(null); window.__ow.advance(20); });
  await page.screenshot({ path: `${out}/${seed}-${from}-0-walked.png` });
  await page.keyboard.down('KeyE');
  await page.evaluate(() => window.__ow.advance(2));
  await page.keyboard.up('KeyE');
  await page.evaluate(() => window.__ow.advance(20));
  const on = await page.evaluate(() => window.__ow.journey().stage);
  let hits = 0;
  if (await cabinBlocks()) hits++;
  await page.screenshot({ path: `${out}/${seed}-${from}-1-mounted.png` });
  // Ride off: forward is away from the camera, as you would.
  await page.keyboard.down('KeyW');
  for (let i = 0; i < 4; i++) {
    await page.evaluate(() => window.__ow.advance(30));
    if (await cabinBlocks()) hits++;
    await page.screenshot({ path: `${out}/${seed}-${from}-${i + 2}-ride${(i + 1) * 5}.png` });
  }
  await page.keyboard.up('KeyW');
  console.log(seed, from, 'stage', on, hits ? `CABIN IN THE WAY in ${hits}/5 frames` : 'clear');
  bad += hits ? 1 : 0;
  await page.close();
}
await browser.close(); server.close();
process.exit(bad ? 1 : 0);
