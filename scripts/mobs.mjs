// Creature shots: node scripts/mobs.mjs <outdir> [floof,crow,lasso,ride,...]
// Needs a build (npx vite build). Tile with scripts/sheet.mjs.
import { chromium } from 'playwright';
import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path';
const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const [out, only, extra = ''] = process.argv.slice(2);
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
const page = await browser.newPage({ viewport: { width: 1200, height: 800 } });
page.on('pageerror', (e) => console.log('[pageerror]', e.message));
page.on('console', (m) => { if (m.type() === 'error' || m.text().startsWith('[mobs]')) console.log('[page]', m.text().slice(0, 400)); });
const K = page.keyboard;
const W = (ms) => page.waitForTimeout(ms);
const ev = (f, a) => page.evaluate(f, a);
const shot = (n) => page.screenshot({ path: `${out}/${n}.png` });
const go = async (q, wild = false) => {
  await page.goto(`http://localhost:${server.address().port}/?${q}&ui=0&capture=1&paused=1${wild ? '' : '&mobs=0'}${extra}`);
  for (let i = 0; i < 120; i++) { if (await ev(() => window.__ow?.ready())) break; await W(250); }
  // Only the creatures we place, so shots are repeatable.
  await W(300);
};
const cam = (yaw, pitch, dist) => ev(([a, b, c]) => window.__ow.view(a, b, c), [yaw, pitch, dist]);
const heading = () => ev(() => window.__ow.body.heading);

const scen = {
  async floof() {
    await go('seed=hilda&t=10');
    await ev(() => window.__ow.spawnFlock('floof', 16, 7));
    const h = await heading();
    await cam(h + Math.PI, -0.18, 11); await W(2500); await shot('floof-flock');
    await cam(h + Math.PI, 0.05, 30); await W(400); await shot('floof-flock-wide');
    // Tame one: it drops to the explorer so we can see the face up close.
    await ev(() => window.__ow.tameNearest('floof')); await W(5000);
    await ev(() => { const m = window.__ow.mobs.tamed[0]; m.leashed = false; m.species.reset(m); });
    await W(2500);
    await ev(() => { const m = window.__ow.mobs.tamed[0]; const b = window.__ow.body; window.__ow.view(Math.atan2(b.pos.x - m.pos.x, b.pos.z - m.pos.z) + 0.55, 0.05, 7); });
    await W(900); await shot('floof-face');
    await ev(() => { const m = window.__ow.mobs.tamed[0]; const b = window.__ow.body; window.__ow.view(Math.atan2(b.pos.x - m.pos.x, b.pos.z - m.pos.z) + 1.4, 0.15, 7); });
    await W(600); await shot('floof-side');
  },
  async crow() {
    await go('seed=hilda&t=10');
    await ev(() => window.__ow.spawnFlock('crow', 11, 6));
    const h = await heading();
    await cam(h + Math.PI - 0.2, 0.02, 7); await W(3000); await shot('crow-ground');
    await cam(h + Math.PI + 1.3, 0.1, 9); await W(600); await shot('crow-ground-side');
    // Startle them.
    // (The camera faces the explorer, so S walks toward the flock.)
    await K.down('KeyS'); await W(1000); await K.up('KeyS');
    await cam(h + Math.PI, -0.3, 12); await W(350); await shot('crow-takeoff');
    await W(900); await shot('crow-fly');
    await cam(h + Math.PI, -0.45, 16); await W(1500); await shot('crow-fly2');
    // Freeze one mid-air and walk round it.
    for (const [n, y, p] of [['air-side', 1.57, 0.05], ['air-front', 0.3, -0.1], ['air-under', 2.4, -0.4]]) {
      await ev(([a, b]) => { const o = window.__ow; const list = [...o.mobs.all()].filter((m) => !m.grounded); if (list[0]) o.inspect([...o.mobs.all()].indexOf(list[0]), a, b, 7); }, [y, p]);
      await W(400); await shot('crow-' + n);
    }
  },
  async crowface() {
    await go('seed=hilda&t=10');
    await ev(() => window.__ow.spawnFlock('crow', 12, 1));
    await ev(() => window.__ow.tameNearest('crow')); await W(4000);
    await ev(() => { const m = window.__ow.mobs.tamed[0]; m.leashed = false; m.species.reset(m); });
    await W(1500);
    await ev(() => { const m = window.__ow.mobs.tamed[0]; const b = window.__ow.body; window.__ow.view(Math.atan2(b.pos.x - m.pos.x, b.pos.z - m.pos.z) + 0.55, 0.08, 6); });
    await W(900); await shot('crow-face');
    await ev(() => { const m = window.__ow.mobs.tamed[0]; const b = window.__ow.body; window.__ow.view(Math.atan2(b.pos.x - m.pos.x, b.pos.z - m.pos.z) + 1.5, 0.1, 6); });
    await W(900); await shot('crow-side');
  },
  async lasso() {
    await go('seed=hilda&t=10');
    await ev(() => window.__ow.spawnFlock('floof', 14, 5));
    const h = await heading();
    await cam(h + Math.PI, -0.12, 9); await W(2500); await shot('lasso-aim');
    await K.press('KeyR'); await W(180); await shot('lasso-throw'); await W(250); await shot('lasso-fly');
    await W(700); await shot('lasso-caught'); await W(1300); await shot('lasso-tamed');
    await K.down('KeyS'); await W(1600); await K.up('KeyS'); await W(300); await shot('lead-walk');
    await cam(h + 0.6, 0.12, 9); await W(400); await shot('lead-walk2');
  },
  async ride() {
    await go('seed=hilda&t=10');
    await ev(() => window.__ow.spawnFlock('floof', 12, 1));
    await ev(() => window.__ow.tameNearest('floof')); await W(3500);
    await ev(() => window.__ow.mountNearest()); await W(500);
    const h = await heading();
    await cam(h + Math.PI + 0.9, 0.1, 9); await W(500); await shot('ride-floof-idle');
    await K.down('Space'); await K.down('KeyW'); await W(1500); await K.up('Space'); await W(1500); await shot('ride-floof-fly');
    await K.up('KeyW');
    await ev(() => window.__ow.dismount()); await W(1200); await shot('ride-floof-off');
  },
  async ridecrow() {
    await go('seed=hilda&t=10');
    await ev(() => window.__ow.spawnFlock('crow', 12, 1));
    await ev(() => window.__ow.tameNearest('crow')); await W(3500);
    await ev(() => window.__ow.mountNearest()); await W(600);
    const h = await heading();
    await cam(h + Math.PI + 1.2, 0.08, 8); await W(500); await shot('ride-crow-idle');
    await K.down('KeyA'); await W(900); await shot('ride-crow-run'); await W(170); await shot('ride-crow-run2');
    await K.press('Space'); await K.down('Space'); await W(1200); await K.up('Space'); await W(600); await shot('ride-crow-fly');
    await K.up('KeyA');
  },
  /** Turntable of a tamed and a wild specimen: front, 3/4, side, back, top, flying. */
  async inspect() {
    await go('seed=hilda&t=10');
    for (const sp of ['crow', 'floof']) {
      await ev((n) => window.__ow.spawnFlock(n, 30, 1), sp);
      await ev((n) => window.__ow.tameNearest(n), sp); await W(2500);
      await ev(() => { for (const m of window.__ow.mobs.tamed) { m.leashed = false; m.species.reset(m); } });
      await W(1500);
      for (const [n, y, p, d] of [['front', 0, 0.05, 5], ['q', 0.8, 0.12, 5], ['side', 1.57, 0.05, 5], ['back', 3.0, 0.2, 5], ['top', 0.6, 0.9, 6]]) {
        await ev(([a, b, c, dd, s]) => window.__ow.inspect(0, a, b, dd, s), [y, p, 0, d, sp]); await W(700); await shot(`${sp}-${n}`);
      }
      await ev(() => { window.__ow.mobs.settings.freeze = false; window.__ow.rig.root.visible = true; window.__ow.setMode('walk'); for (const m of [...window.__ow.mobs.tamed]) { m.pos.y += 0; } });
      await go('seed=hilda&t=10');
    }
  },
  /** Natural spawns: look toward the passing floofs and the roaming crows. */
  async ambient() {
    await go('seed=hilda&t=10', true);
    const look = (sp, mode, pitch, dist) => ev(([sp, mode, pitch, dist]) => {
      const o = window.__ow; const p = o.body.pos;
      const fl = [...o.mobs.flocks.values()].filter((f) => f.species.name === sp && (!mode || f.data.mode === mode));
      if (!fl.length) return 'none';
      const f = fl[0], m = f.members[0];
      o.view(Math.atan2(p.x - m.pos.x, p.z - m.pos.z), pitch, dist);
      return Math.hypot(m.pos.x - p.x, m.pos.z - p.z).toFixed(0) + ' m';
    }, [sp, mode, pitch, dist]);
    await W(14000);
    console.log('[mobs] floofs', await look('floof', null, -0.12, 9)); await W(300); await shot('ambient-floofs');
    console.log('[mobs] crows in flight', await look('crow', 'fly', -0.15, 9)); await W(300); await shot('ambient-crows-fly');
    await W(20000);
    console.log('[mobs] floofs later', await look('floof', null, -0.1, 9)); await W(300); await shot('ambient-floofs2');
    console.log('[mobs] crows later', await look('crow', 'fly', -0.15, 9)); await W(300); await shot('ambient-crows-fly2');
  },
  /** Floofs where they live: overhead, and flocks at 80 m and 150 m (outline weight at distance). */
  async floofsky() {
    await go('seed=hilda&t=10');
    const h = await heading();
    await ev(() => window.__ow.spawnFlock('floof', 40, 8));
    await cam(h + Math.PI, -0.3, 7); await W(2500); await shot('sky-near'); await W(180); await shot('sky-near2');
    await ev(() => { window.__ow.spawnFlock('floof', 80, 8); window.__ow.spawnFlock('floof', 150, 8); });
    await cam(h + Math.PI, -0.14, 8); await W(2500); await shot('sky-far');
    await ev(() => window.__ow.setHour(18.4)); await W(800); await shot('sky-far-dusk');
  },
  async night() {
    await go('seed=hilda&t=22.5');
    await ev(() => { window.__ow.spawnFlock('floof', 14, 5); window.__ow.spawnFlock('crow', 9, 4); });
    const h = await heading();
    await cam(h + Math.PI, -0.1, 12); await W(2500); await shot('night-mobs');
  },
};
for (const [n, f] of Object.entries(scen)) if (!only || only.split(',').includes(n)) { try { await f(); } catch (e) { console.log('[scen]', n, e.message); } }
await browser.close(); server.close();
