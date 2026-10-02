// The send-off: node scripts/sendoff.mjs <outdir> [seed=hilda]
//   With a creature home at the stable, the guide looks at a wrecked house, walks you to the edge of the
//   village and points down the giant's trail (the prints bubble, its brave face). Then you leave along the
//   trail (it goes home), come back (it takes you out again), and find the ring (it stops for good).
// Needs a build (npx vite build).
import { chromium } from 'playwright';
import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path';
const root = process.cwd();
const args = process.argv.slice(2);
const out = args[0] ?? 'shots/sendoff';
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
const where = () => ev(() => { const o = window.__ow, st = o.story(), sp = st.spirit, s = st.site; return { stage: o.journey().stage, step: st.step.id, home: Math.round(Math.hypot(sp.pos.x - s.x, sp.pos.z - s.z)), you: Math.round(sp.pos.distanceTo(o.body.pos)), send: o.journey().send, mood: sp.mood, icon: sp.want.icon, pose: sp.want.pose, arrived: sp.arrived }; });
/** The guide, from in front and a little to one side, her out of the picture. */
const close = async (name, d = 3.4) => {
  await ev((d) => { const o = window.__ow, sp = o.story().spirit; o.rig.root.visible = false; o.focusAt(sp.pos.x, sp.pos.y + 0.45, sp.pos.z); o.view(sp.heading + 0.7, 0.08, d); o.advance(2, 1 / 60); }, d);
  await W(100);
  await page.screenshot({ path: `${out}/${name}.png` });
  await ev(() => { const o = window.__ow; o.rig.root.visible = true; o.focusAt(null); });
};
await page.goto(`http://localhost:${server.address().port}/?seed=${seed}&mobs=0&drak=0&capture=1&ui=0&story=1&fresh=1&cp=ranch`);
await ready();
await W(1500);
await ev(() => { const o = window.__ow; o.setHour(11); o.manual(true); o.advance(120, 1 / 60); });
console.log('creature home:', await where());
/** Keep her a few metres behind the guide as it goes (it waits for you otherwise). */
const follow = async (frames) => ev((n) => { const o = window.__ow, sp = o.story().spirit; for (let i = 0; i < n; i += 30) { const h = sp.heading; o.body.pos.set(sp.pos.x - Math.sin(h) * 4, sp.pos.y, sp.pos.z - Math.cos(h) * 4); o.advance(30, 1 / 30); } }, frames);
await ev(() => { const o = window.__ow, j = o.gen().journey.toHome[0]; o.manual(false); o.teleport(j[0], j[1]); });
await ready();
await ev(() => { const o = window.__ow; o.manual(true); });
for (let i = 0; i < 40 && (await where()).send === 'idle'; i++) await ev(() => window.__ow.advance(15, 1 / 30));
await ev(() => window.__ow.advance(40, 1 / 30));
console.log('in the yard a while:', await where());
await close('look', 4.5);
for (let i = 0; i < 20 && (await where()).send !== 'lead'; i++) await ev(() => window.__ow.advance(15, 1 / 30));
await follow(150);
console.log('leading:', await where());
await close('leading', 4);
for (let i = 0; i < 40 && !(await where()).arrived; i++) await follow(90);
await ev(() => window.__ow.advance(120, 1 / 30));
console.log('at the edge:', await where());
await close('face', 2.2);
await close('edge', 5);
// As you see it: her beside it, looking down the trail over its shoulder.
await ev(() => { const o = window.__ow, sp = o.story().spirit, w = sp.want; const h = Math.atan2(w.face.x - sp.pos.x, w.face.z - sp.pos.z); o.body.pos.set(sp.pos.x - Math.sin(h) * 3 + Math.cos(h) * 2, sp.pos.y, sp.pos.z - Math.cos(h) * 3 - Math.sin(h) * 2); o.body.heading = h; o.view(h + Math.PI + 0.25, 0.22, 9); o.advance(60, 1 / 30); });
await W(100);
await page.screenshot({ path: `${out}/seen.png` });
// Off down the trail: it goes home.
await ev(() => { const o = window.__ow, w = o.story().spirit.want; const d = Math.hypot(w.face.x - w.at.x, w.face.z - w.at.z); const x = w.at.x + (w.face.x - w.at.x) / d * 140, z = w.at.z + (w.face.z - w.at.z) / d * 140; o.manual(false); o.teleport(x, z); });
await ready();
await ev(() => { const o = window.__ow; o.manual(true); o.advance(600, 1 / 30); });
console.log('you 140 m down the trail:', await where());
// Back to the yard without the ring found: out again.
await ev(() => { const o = window.__ow, j = o.gen().journey.toHome[0]; o.manual(false); o.teleport(j[0], j[1]); });
await ready();
await ev(() => { const o = window.__ow; o.manual(true); o.advance(450, 1 / 30); });
console.log('home again, 15 s:', await where());
// At the ring: found, and never again.
await ev(() => { const o = window.__ow, d = o.gen().dungeon; o.manual(false); o.teleport(d.x + 30, d.z); });
await ready();
await ev(() => { const o = window.__ow; o.manual(true); o.advance(120, 1 / 30); });
await ev(() => { const o = window.__ow, j = o.gen().journey.toHome[0]; o.manual(false); o.teleport(j[0], j[1]); });
await ready();
await ev(() => { const o = window.__ow; o.manual(true); o.advance(600, 1 / 30); });
console.log('home after the ring, 20 s:', await where());
await browser.close(); server.close();
