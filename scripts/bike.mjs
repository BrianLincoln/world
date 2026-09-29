// Bicycle shots: node scripts/bike.mjs <outdir> [parked,mount,ride,sprint,turn,hop,night,wild,descent,ramp]
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
page.on('console', (m) => { if (m.type() === 'error' || m.text().startsWith('[bike]')) console.log('[page]', m.text().slice(0, 400)); });
const K = page.keyboard;
const W = (ms) => page.waitForTimeout(ms);
const ev = (f, a) => page.evaluate(f, a);
const shot = (n) => page.screenshot({ path: `${out}/${n}.png` });
const go = async (q) => {
  await page.goto(`http://localhost:${server.address().port}/?${q}&ui=0&capture=1&paused=1&mobs=0${extra}`);
  for (let i = 0; i < 120; i++) { if (await ev(() => window.__ow?.ready())) break; await W(250); }
  await W(300);
};
/** Camera relative to the bike's heading: 0 = behind, pi/2 = its left side. */
const around = (rel, pitch, dist) => ev(([a, b, c]) => { const o = window.__ow; o.view(o.body.heading + Math.PI + a, b, c); }, [rel, pitch, dist]);
const mount = async () => { await ev(() => window.__ow.mountBike()); await W(900); };
/** Point the camera behind the bike so W pedals straight on. */
const behind = async () => { await around(0, 0.15, 9); await ev(() => window.__ow.lockInput(window.__ow.body.heading + Math.PI)); };
const log = (tag) => ev((t) => { const o = window.__ow, m = o.bikeMode; console.log(`[bike] ${t} speed ${m.speed.toFixed(2)} lean ${m.lean.toFixed(2)} steer ${m.steer.toFixed(2)} y ${o.body.pos.y.toFixed(2)} grounded ${o.body.grounded}`); }, tag);

const scen = {
  async parked() {
    await go('seed=hilda&t=10');
    for (const [n, side, pitch, dist] of [['parked-side', 0, 0.08, 3.2], ['parked-34', -0.8, 0.2, 3.4], ['parked-front', -1.45, 0.15, 3.2], ['parked-far', 0.3, 0.12, 9]]) {
      await ev(([s, p, d]) => window.__ow.lookAtBike(d, s, p), [side, pitch, dist]);
      await W(700); await shot(n);
    }
  },
  async mount() {
    await go('seed=hilda&t=10');
    await mount();
    await around(Math.PI / 2, 0.08, 6); await W(1200); await shot('mount-stopped');
    await around(Math.PI * 0.8, 0.12, 6); await W(400); await shot('mount-stopped-front');
    await ev(() => window.__ow.dismountBike()); await W(1500);
    await around(Math.PI / 2, 0.1, 6); await W(300); await shot('mount-off');
  },
  async ride() {
    await go('seed=hilda&t=10');
    await mount();
    await behind(); await W(100);
    await K.down('KeyW'); await W(2200); await log('ride');
    await around(Math.PI / 2, 0.04, 4.2); await W(60); await shot('ride-side');
    await W(170); await shot('ride-side2');
    await around(0.5, 0.18, 7); await W(60); await shot('ride-34');
    await K.up('KeyW');
    await W(2500); await log('coast'); await around(Math.PI / 2, 0.04, 4.2); await W(60); await shot('ride-stop');
  },
  async sprint() {
    await go('seed=hilda&t=10');
    await mount();
    await behind(); await W(100);
    await K.down('ShiftLeft'); await K.down('KeyW'); await W(2600); await log('sprint');
    await around(Math.PI / 2 + 0.2, 0.08, 5); await W(60); await shot('sprint-side');
    await around(-0.4, 0.2, 8); await W(60); await shot('sprint-back');
    await K.up('KeyW'); await K.up('ShiftLeft');
  },
  async turn() {
    await go('seed=hilda&t=10');
    await mount();
    await behind(); await W(100);
    await K.down('KeyW'); await W(1800);
    await K.down('KeyA'); await W(700); await log('turn');
    await around(-0.35, 0.15, 7); await W(40); await shot('turn-back');
    await around(Math.PI * 0.85, 0.1, 6); await W(40); await shot('turn-front');
    await K.up('KeyA'); await K.up('KeyW');
  },
  async hop() {
    await go('seed=hilda&t=10');
    await mount();
    await behind(); await W(100);
    await K.down('KeyW'); await W(1800);
    await K.press('Space'); await W(160); await log('hop');
    await around(Math.PI / 2, 0.05, 5); await W(30); await shot('hop-side');
    await K.up('KeyW');
  },
  async night() {
    await go('seed=hilda&t=22.5');
    await ev(() => window.__ow.lookAtBike(4, -1.1, 0.1));
    await W(700); await shot('night-parked');
    await mount(); await behind(); await K.down('KeyW'); await W(1500);
    await around(Math.PI * 0.75, 0.1, 6); await W(40); await shot('night-ride');
    await K.up('KeyW');
  },
  /** Drop the bike near a summit, aim it down the fall line and let it run. */
  async descent() {
    await go('seed=hilda&t=11');
    const info = await ev(() => {
      const o = window.__ow, g = o.gen(), p0 = o.pos();
      // Tallest ground within 3 km, then walk 25 m down its steepest side.
      let best = -1e9, px = 0, pz = 0;
      for (let z = -3000; z <= 3000; z += 60) for (let x = -3000; x <= 3000; x += 60) {
        const h = g.height(p0.x + x, p0.z + z);
        if (h > best) { best = h; px = p0.x + x; pz = p0.z + z; }
      }
      let a0 = 0, drop = -1e9;
      for (let a = 0; a < 6.28; a += 0.1) {
        const d = best - g.height(px + Math.sin(a) * 150, pz + Math.cos(a) * 150);
        if (d > drop) { drop = d; a0 = a; }
      }
      const x = px + Math.sin(a0) * 25, z = pz + Math.cos(a0) * 25;
      const k = o.bikes.bikes.get('start');
      k.pos.set(x, g.height(x, z), z);
      k.heading = a0;
      o.teleport(x, z);
      o.mountBike();
      return { peak: best, drop150: drop, heading: a0 };
    });
    console.log('[bike] descent', JSON.stringify(info));
    for (let i = 0; i < 60; i++) { if (await ev(() => window.__ow.ready())) break; await W(250); }
    await ev(() => window.__ow.lockInput(window.__ow.body.heading + Math.PI));
    await around(0, 0.15, 9); await W(200);
    await K.down('KeyW');
    for (let t = 0; t < 14; t++) {
      await W(1000);
      // Keep aiming down the local fall line.
      await ev(() => {
        const o = window.__ow, g = o.gen(), p = o.body.pos;
        let a0 = o.body.heading, lo = 1e9;
        for (let da = -0.6; da <= 0.6; da += 0.1) {
          const a = o.body.heading + da, h = g.height(p.x + Math.sin(a) * 40, p.z + Math.cos(a) * 40);
          if (h < lo) { lo = h; a0 = a; }
        }
        o.lockInput(a0 + Math.PI);
      });
      await log('t=' + (t + 1));
      if (t === 5 || t === 10) { await around(0.35, 0.12, 9); await W(30); await shot('descent-' + t); }
    }
    await K.up('KeyW');
  },
  /** Ride at a boulder: once untimed, once with Space at the lip. Logs peak height. */
  async ramp() {
    await go('seed=hilda&t=10');
    const setup = () => ev(() => {
      const o = window.__ow, g = o.gen(), C = o._colliders, p0 = o.pos();
      // Scan boulders in the collider cells around here (built on demand).
      for (let dz = -4; dz <= 4; dz++) for (let dx = -4; dx <= 4; dx++) C.prefetch(p0.x + dx * 64, p0.z + dz * 64);
      let best = null;
      for (let pass = 0; pass < 30 && !best; pass++) {
        for (const c of C.cells.values()) {
          const R = c.rocks;
          for (let k = 0; k < R.length; k += 5) {
            const rise = R[k + 4] - 0.278 * R[k + 2];
            if (rise < 0.8 || rise > 1.8) continue;
            const x = R[k], z = R[k + 1];
            for (let a = 0; a < 6.28; a += 0.3) {
              // 18 m of run-in, flat-ish, dry, with nothing else solid in the way.
              const sx = x - Math.sin(a) * 18, sz = z - Math.cos(a) * 18;
              const h0 = g.height(sx, sz), h1 = g.height(x - Math.sin(a) * 3, z - Math.cos(a) * 3);
              if (h0 < 3 || Math.abs(h1 - h0) > 1.2) continue;
              let clear = true;
              for (let t = 1; t < 16 && clear; t += 1) {
                const px = sx + Math.sin(a) * t, pz = sz + Math.cos(a) * t;
                const v = { x: px, y: g.height(px, pz), z: pz }, vv = { x: 0, y: 0, z: 0 };
                const P = new o._body.pos.constructor(v.x, v.y, v.z), V = new o._body.pos.constructor(0, 0, 0);
                C.push(P, V, 0.6, 0);
                if (Math.hypot(P.x - px, P.z - pz) > 1e-3) clear = false;
              }
              if (clear) { best = { x, z, a, sx, sz, rise }; break; }
            }
            if (best) break;
          }
          if (best) break;
        }
        if (!best) for (let dz = -4; dz <= 4; dz++) for (let dx = -4; dx <= 4; dx++) C.prefetch(p0.x + dx * 64, p0.z + dz * 64);
      }
      if (!best) return null;
      if (o.bikeMode && o.body && o._rideBike) {}
      o.dismountBike();
      const k = o.bikes.bikes.get('start');
      k.pos.set(best.sx, g.height(best.sx, best.sz), best.sz);
      k.heading = best.a;
      o.teleport(best.sx, best.sz);
      o.mountBike();
      o.lockInput(best.a + Math.PI);
      o.view(best.a + Math.PI / 2 + 0.25, 0.1, 12);
      return best;
    });
    const run = async (mode) => {
      const info = await setup();
      if (!info) { console.log('[bike] no boulder found'); return; }
      await W(400);
      await K.down('ShiftLeft'); await K.down('KeyW');
      let peak = 0, pressed = false, t0 = Date.now(), shotDone = false;
      while (Date.now() - t0 < 4500) {
        const st = await ev(() => { const o = window.__ow, p = o.body.pos; return { vy: o.body.vel.y, rv: o.bikeMode.rampVy, gv: o.bikeMode.groundVy, lift: p.y - o.gen().height(p.x, p.z), g: o.body.grounded, sp: o.bikeMode.speed }; });
        if (mode === 'timed' && !pressed && st.g && st.lift > 0.25) { await K.press('Space'); pressed = true; }
        if (mode === 'hop' && !pressed && st.sp > 12) { await K.press('Space'); pressed = true; }
        peak = Math.max(peak, st.lift);
        if (st.lift > 0.1 && process.env.TRACE) console.log(JSON.stringify(st, (k, v) => typeof v === 'number' ? +v.toFixed(2) : v));
        await W(16);
        if (mode === 'timed' && !st.g && !shotDone) {
          // Filmstrip of the timed kick.
          await around(Math.PI / 2 + 0.25, 0.05, 10);
          for (let i = 0; i < 7; i++) { await shot('kick-' + i); await W(110); }
          shotDone = true;
        }
        if (!st.g && st.vy < 0.5 && st.lift > 1.2 && !shotDone) { await around(Math.PI / 2 + 0.3, 0.05, 11); await W(20); await shot('ramp-' + mode); shotDone = true; }
      }
      await K.up('KeyW'); await K.up('ShiftLeft');
      console.log('[bike] kick', JSON.stringify(await ev(() => { const k = window.__ow.bikeMode.debugKick; window.__ow.bikeMode.debugKick = null; return k; })));
      console.log(`[bike] ramp ${mode}: rock rise ${info.rise.toFixed(2)} m, peak ${peak.toFixed(2)} m above terrain`);
    };
    await run('plain');
    await run('timed');
    await run('hop');
  },
  /** Find a bike out in the world (not the starter) and frame it. */
  async wild() {
    await go('seed=hilda&t=16');
    const found = await ev(async () => {
      const o = window.__ow;
      const start = o.pos();
      for (let r = 400; r < 6000; r += 350) {
        for (let a = 0; a < 6.28; a += 0.6) {
          o.teleport(start.x + Math.cos(a) * r, start.z + Math.sin(a) * r);
          for (let i = 0; i < 4; i++) await new Promise((res) => requestAnimationFrame(res));
          await new Promise((res) => setTimeout(res, 550));
          const k = [...o.bikes.bikes.values()].find((b) => b.key !== 'start');
          if (k) return { key: k.key, x: k.pos.x, z: k.pos.z, n: o.bikes.bikes.size };
        }
      }
      return null;
    });
    console.log('[bike] wild', JSON.stringify(found));
    if (!found) return;
    await ev(() => window.__ow.lookAtBike(14, 0.5, 0.12));
    for (let i = 0; i < 60; i++) { if (await ev(() => window.__ow.ready())) break; await W(250); }
    await W(800); await shot('wild-far');
    await ev(() => window.__ow.lookAtBike(4, 0.3, 0.12));
    await W(600); await shot('wild-near');
  },
};

for (const name of (only ? only.split(',') : Object.keys(scen))) {
  console.log('--', name);
  await scen[name]();
}
await browser.close(); server.close();
