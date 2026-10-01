// The guide after the giant: node scripts/trudge.mjs <outdir> [seed=hilda]
//   Its walk home from the tower (close, and as you'd see it), then keeping to itself in the village,
//   then the stable beginning once the minutes have passed and you're there. Prints where it is as it goes.
// Needs a build (npx vite build).
import { chromium } from 'playwright';
import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path';
const root = process.cwd();
const args = process.argv.slice(2);
const out = args[0] ?? 'shots/trudge';
const seed = args.find((a) => a.startsWith('seed='))?.slice(5) ?? 'hilda';
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
const ready = async () => { for (let i = 0; i < 160; i++) { if (await ev(() => window.__ow?.ready())) break; await W(250); } };
const where = () => ev(() => { const o = window.__ow, st = o.story(), sp = st.spirit, s = st.site; return { stage: o.journey().stage, step: st.step.id, home: Math.round(Math.hypot(sp.pos.x - s.x, sp.pos.z - s.z)), you: Math.round(sp.pos.distanceTo(o.body.pos)), sullen: sp.sullen, pose: sp.want.pose }; });
/** The guide, from in front and a little to one side, her out of the picture. */
const close = async (name, d = 3.4) => {
  await ev((d) => { const o = window.__ow, sp = o.story().spirit; o.rig.root.visible = false; o.focusAt(sp.pos.x, sp.pos.y + 0.45, sp.pos.z); o.view(sp.heading + 0.7, 0.08, d); o.advance(2, 1 / 60); }, d);
  await W(100);
  await page.screenshot({ path: `${out}/${name}.png` });
  await ev(() => { const o = window.__ow; o.rig.root.visible = true; o.focusAt(null); });
};
await page.goto(`http://localhost:${server.address().port}/?seed=${seed}&mobs=0&drak=0&capture=1&ui=0&story=1&fresh=1&cp=trudge`);
await ready();
await W(1500);
await ev(() => { const o = window.__ow; o.setHour(11); o.manual(true); o.advance(360, 1 / 60); });
console.log('setting off:', await where());
for (const k of [1, 2, 3]) { await close(`walk-${k}`); await ev(() => window.__ow.advance(23, 1 / 60)); }
// As you see it, standing by the tower as it goes.
await ev(() => { const o = window.__ow, sp = o.story().spirit; o.view(Math.atan2(o.body.pos.x - sp.pos.x, o.body.pos.z - sp.pos.z), 0.12, 5); o.advance(4, 1 / 60); });
await W(100);
await page.screenshot({ path: `${out}/walk-seen.png` });
// Leave it to walk (you stay at the tower: past 130 m it makes up ground).
for (let i = 0; i < 40; i++) {
  const w = await ev(() => { const o = window.__ow; o.advance(600, 1 / 30); return o.journey().stage; });
  if (w !== 'trudge') break;
}
console.log('after the walk:', await where());
// Home: stand in the yard and watch it for a while.
await ev(() => { const o = window.__ow, j = o.gen().journey.toHome[0]; o.manual(false); o.teleport(j[0], j[1]); });
await ready();
await ev(() => { const o = window.__ow; o.manual(true); o.advance(120, 1 / 60); });
for (const k of [1, 2, 3]) {
  await ev(() => window.__ow.advance(900, 1 / 30));
  console.log(`keeping to itself ${k}:`, await where());
  await close(`grieve-${k}`, 5.5);
}
// Away: however long, nothing begins.
await ev(() => { const o = window.__ow, s = o.story().site; o.manual(false); o.teleport(s.x + 260, s.z); });
await ready();
await ev(() => { const o = window.__ow; o.manual(true); o.advance(3000, 1 / 15); });
console.log('minutes later, you away:', await where());
await ev(() => { const o = window.__ow, j = o.gen().journey.toHome[0]; o.manual(false); o.teleport(j[0], j[1]); });
await ready();
await ev(() => { const o = window.__ow; o.manual(true); o.advance(240, 1 / 60); });
console.log('and back in the village:', await where());
await close('stable', 5);
await browser.close(); server.close();
