// The giant's visit, by ear: when each piece of its music is asked for, in the scene's own time,
// against how long the pieces are; then the same in real time, to see they sound and the loop comes back.
//   node scripts/music.mjs [seed=hilda] [tower] [real]
// Needs a build (npx vite build).
import { chromium } from 'playwright';
import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path';
const root = process.cwd();
const args = process.argv.slice(2);
const seed = args.find((a) => a.startsWith('seed='))?.slice(5) ?? 'hilda';
const server = http.createServer((req, res) => {
  const p = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  const f = path.join(root, 'dist', p === '/' ? 'index.html' : p);
  if (!fs.existsSync(f)) { res.writeHead(404); res.end(); return; }
  res.writeHead(200, { 'content-type': f.endsWith('.js') ? 'text/javascript' : f.endsWith('.html') ? 'text/html' : f.endsWith('.css') ? 'text/css' : f.endsWith('.mp3') ? 'audio/mpeg' : 'application/octet-stream' });
  fs.createReadStream(f).pipe(res);
});
await new Promise((r) => server.listen(0, r));
const browser = await chromium.launch({ args: ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist', '--autoplay-policy=no-user-gesture-required'] });
const page = await browser.newPage({ viewport: { width: 960, height: 540 } });
page.on('pageerror', (e) => console.log('[pageerror]', e.message));
const W = (ms) => page.waitForTimeout(ms);
const ev = (f, a) => page.evaluate(f, a);
await page.goto(`http://localhost:${server.address().port}/?seed=${seed}&story=1&mobs=0&bikes=${args.includes('tower') ? 1 : 0}&drak=0&ui=0&fresh=1`);
for (let i = 0; i < 160; i++) { if (await ev(() => window.__ow?.ready())) break; await W(250); }
await W(1000);
// A gesture, for the AudioContext.
await page.mouse.click(480, 270); await page.keyboard.press('w');
const info = await ev(() => {
  const o = window.__ow, st = o.story(), s = st.site;
  for (const id of ['roof', 'door', 'chimney']) st.cabin.setBuilt(id);
  st.cabin.light(true);
  o.teleport(st.cabin.hearthPos.x - Math.cos(s.rot) * 1.6, st.cabin.hearthPos.z + Math.sin(s.rot) * 1.6);
  const v = o.visit();
  return v?.route ? { falls: v.route.falls.length, first: v.route.firstHouse, last: v.route.lastHouse } : null;
});
console.log(seed, info ?? 'no visit');
if (!info) { await browser.close(); server.close(); process.exit(0); }
for (let i = 0; i < 60; i++) { await W(250); if (await ev(() => window.__ow.ready())) break; }
const real = args.includes('real');
if (args.includes('tower')) {
  await ev(async () => {
    const o = window.__ow;
    o.journeyJump('enter1');
    await new Promise((r) => setTimeout(r, 1500));
    o.beacons.debugEnter(0);
    for (let i = 0; i < 200 && o.visit().state === 'idle'; i++) await new Promise((r) => setTimeout(r, 250));
  });
  if (!real) await ev(() => window.__ow.manual(true));
} else await ev((real) => { const o = window.__ow; if (!real) o.manual(true); o.visit().start(); }, real);
const read = () => { const o = window.__ow, v = o.visit(); return { music: v.music, busy: v.busy, steps: +o.giant().steps.toFixed(2), jt: +v.jt.toFixed(1), levels: o.ambience.levels }; };
let was = null, wasBusy = true;
const t0 = Date.now();
for (let t = 0; t < 150; t += 0.25) {
  const s = real ? (await W(250), await ev(read)) : await ev(new Function(`const o = window.__ow; o.advance(15, 1 / 60); return (${read})();`));
  const at = real ? ((Date.now() - t0) / 1000).toFixed(1) : (t + 0.25).toFixed(2);
  if (s.music !== was) { console.log(at, 's:', s.music, '(step', s.steps, 'stopped', s.jt + ')'); was = s.music; }
  if (wasBusy && !s.busy) { console.log(at, 's: camera handed back'); wasBusy = false; }
  if (real && Math.round(t * 4) % 8 === 0) console.log(' ', at, JSON.stringify(s.levels));
  if (real && !wasBusy && s.levels.warm_field_v3_exploration_loop > 0.5) break;
  if (!real && !wasBusy) break;
}
await browser.close(); server.close();
