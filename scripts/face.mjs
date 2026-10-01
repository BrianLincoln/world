// The explorer's face in each mood, close up: node scripts/face.mjs <outdir> [seed=hilda] [eyes=round]
//   One frame per mood (none, set, sad, scared), plus one from the usual play distance.
//   `after`: instead, the story once the giant has been: her and the guide in the wrecked village, then her away from it.
// Needs a build (npx vite build).
import { chromium } from 'playwright';
import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path';
const root = process.cwd();
const args = process.argv.slice(2);
const out = args[0] ?? 'shots/face';
const seed = args.find((a) => a.startsWith('seed='))?.slice(5) ?? 'hilda';
const eyes = args.find((a) => a.startsWith('eyes='))?.slice(5) ?? 'dot';
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
const page = await browser.newPage({ viewport: { width: 900, height: 900 } });
page.on('pageerror', (e) => console.log('[pageerror]', e.message));
page.on('console', (m) => { if (m.type() === 'error' && !m.text().includes('useProgram')) console.log('[page]', m.text().slice(0, 400)); });
const W = (ms) => page.waitForTimeout(ms);
const ev = (f, a) => page.evaluate(f, a);
await page.goto(`http://localhost:${server.address().port}/?seed=${seed}&mobs=0&bikes=0&drak=0&capture=1&ui=0&eyes=${eyes}${args.includes('after') ? '&story=1&fresh=1' : '&mood=set'}`);
for (let i = 0; i < 160; i++) { if (await ev(() => window.__ow?.ready())) break; await W(250); }
await W(1000);
if (args.includes('after')) {
  const at = await ev(() => {
    const o = window.__ow, st = o.story(), s = st.site;
    for (const id of ['roof', 'door', 'chimney']) st.cabin.setBuilt(id);
    st.cabin.light(true);
    o.setHour(11);
    st.giantGone = true;
    o.visit()?.restore();
    const L = s.village.lane, p = L[1];
    o.teleport(p.x, p.z);
    o.manual(true);
    o.advance(240, 1 / 60);
    o.view(o.body.heading, -0.02, 2.6);
    o.advance(30, 1 / 60);
    return { x: p.x, z: p.z, mood: o.rig.mood, guide: st.spirit.mood, sp: { x: st.spirit.pos.x, z: st.spirit.pos.z } };
  });
  console.log('in the village:', at);
  await W(100);
  await page.screenshot({ path: `${out}/after-her.png` });
  // The guide, from in front of it.
  await ev(() => { const o = window.__ow, sp = o.story().spirit; o.rig.root.visible = false; o.focusAt(sp.pos.x, sp.pos.y + 0.5, sp.pos.z); o.view(sp.heading, 0.05, 3.2); o.advance(4, 1 / 60); });
  await W(100);
  await page.screenshot({ path: `${out}/after-guide.png` });
  const away = await ev((a) => { const o = window.__ow; o.rig.root.visible = true; o.focusAt(null); o.manual(false); o.teleport(a.x + 220, a.z); return 1; }, at);
  for (let i = 0; i < 80; i++) { await W(250); if (await ev(() => window.__ow.ready())) break; }
  console.log('away:', await ev(() => { const o = window.__ow; o.manual(true); o.advance(200, 1 / 60); o.view(o.body.heading, -0.02, 2.6); o.advance(10, 1 / 60); return o.rig.mood; }));
  await W(100);
  await page.screenshot({ path: `${out}/after-away.png` });
  await browser.close(); server.close(); process.exit(0);
}
await ev(() => { const o = window.__ow; o.setHour(11); o.manual(true); o.rig.holdStill = true; });
for (const [dist, tag] of [[2.4, ''], [7, '-far']]) {
  for (const mood of [null, 'set', 'sad', 'scared']) {
    await ev(([m, d]) => { const o = window.__ow; o.rig.mood = m; o.view(o.body.heading, -0.02, d); o.advance(90, 1 / 60); }, [mood, dist]);
    await W(80);
    await page.screenshot({ path: `${out}/${eyes}-${mood ?? 'none'}${tag}.png` });
  }
}
await browser.close(); server.close();
