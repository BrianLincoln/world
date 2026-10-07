// Dungeon 2's plan (the Veil Cave) from above, and proof that it holds together:
//   node scripts/veil-plan.mjs <out.png> [seed=hilda]
// Draws the plan (rock dark, floor by height, veils as lines: teal, the amber one, the way out;
// posts, glowcaps, lanterns, the named places of `layout.at`) and checks it the way you can move:
//   on foot    veils are walls. Every cell of the ring must be reachable from the well; the three
//              middle cells, the pocket, the warm light and the way out must not be.
//   riding     veils are open. Everything must be reachable.
//   a dash     (`DASH` m, phasing) from anywhere, any way, never crosses two veils; and one made
//              square at a veil from just short of it always ends in open floor, clear of rock.
// It prints the walking loop's length, the ride's, what failed, and exits 1 if anything did.
// Uses the build in dist/, or in $DIST (run `npx vite build` first).
import { chromium } from 'playwright';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const args = process.argv.slice(2);
const out = args.find((a) => a.endsWith('.png')) ?? 'shots/veil/_plan.png';
const seed = args.find((a) => a.startsWith('seed='))?.slice(5) ?? 'hilda';
fs.mkdirSync(path.dirname(out), { recursive: true });
const server = http.createServer((req, res) => {
  const p = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  const f = path.join(root, process.env.DIST ?? 'dist', p === '/' ? 'index.html' : p);
  if (!fs.existsSync(f)) { res.writeHead(404); res.end(); return; }
  res.writeHead(200, { 'content-type': f.endsWith('.js') ? 'text/javascript' : f.endsWith('.html') ? 'text/html' : f.endsWith('.css') ? 'text/css' : 'application/octet-stream' });
  fs.createReadStream(f).pipe(res);
});
await new Promise((r) => server.listen(0, r));
const browser = await chromium.launch({ args: ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: 800, height: 600 } });
page.on('pageerror', (e) => console.log('[pageerror]', e.message));
await page.goto(`http://localhost:${server.address().port}/?seed=${seed}&story=0&t=10&ui=0&capture=1&mobs=0&drak=0&fresh=1&dungeon=2`);
for (let i = 0; i < 240; i++) { if (await page.evaluate(() => window.__ow?.ready())) break; await page.waitForTimeout(250); }
const res = await page.evaluate(() => {
  const d = window.__ow.cave(), L = d.layout, DASH = 10.7;
  const [x0, z0, x1, z1] = L.box, C = 0.5;
  const nx = Math.ceil((x1 - x0) / C), nz = Math.ceil((z1 - z0) / C);
  const free = new Uint8Array(nx * nz), fl = new Float32Array(nx * nz);
  let area = 0;
  const tall = L.solids.filter((o) => o.top > 3);
  for (let j = 0; j < nz; j++) for (let i = 0; i < nx; i++) {
    const x = x0 + i * C, z = z0 + j * C, s = L.sdf(x, z);
    if (s < -0.35 && !tall.some((o) => Math.hypot(x - o.x, z - o.z) < o.r + 0.3)) { free[j * nx + i] = 1; fl[j * nx + i] = L.floor(x, z); }
    if (s < 0) area += C * C;
  }
  const cellOf = ([x, z]) => Math.round((z - z0) / C) * nx + Math.round((x - x0) / C);
  /** Flood from a place; `veils`: they stop you. Returns steps per cell (-1: unreached). */
  const flood = (from, veils) => {
    const dist = new Int32Array(nx * nz).fill(-1);
    const q = [cellOf(L.at[from])];
    dist[q[0]] = 0;
    for (let h = 0; h < q.length; h++) {
      const k = q[h], i = k % nx, j = (k - i) / nx;
      for (const [di, dj] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const a = i + di, b = j + dj, m = b * nx + a;
        if (a < 0 || b < 0 || a >= nx || b >= nz || !free[m] || dist[m] >= 0 || fl[m] - fl[k] > 0.9) continue;
        // (A body half a metre across doesn't fit through a veil's thickness either.)
        if (veils && L.veils.some((v) => L.toVeil(v, x0 + a * C, z0 + b * C) < 0.75)) continue;
        dist[m] = dist[k] + 1;
        q.push(m);
      }
    }
    return dist;
  };
  const names = Object.keys(L.at);
  const foot = flood('well', true), ride = flood('well', false);
  const reached = (dist, n) => { const [x, z] = L.at[n]; for (const [dx, dz] of [[0, 0], [1, 0], [-1, 0], [0, 1], [0, -1]]) if (dist[cellOf([x + dx, z + dz])] >= 0) return true; return false; };
  const fails = [];
  const mustWalk = [...L.cells.filter((c) => c.ring >= 0).map((c) => c.id), ...names.filter((n) => n.includes('>')), 'door', 'spot1', 'spot2', 'seen1', 'seen3', 'pool', 'columns', 'L1|S', 'well|out', 'E3|P', 'F|P', 'L1|M2'];
  const mustNot = ['M1', 'M2', 'P', 'S', 'light', 'out', 'spot3'];
  for (const n of mustWalk) if (!reached(foot, n)) fails.push(`on foot can't reach ${n}`);
  for (const n of mustNot) if (reached(foot, n)) fails.push(`on foot CAN reach ${n}`);
  for (const n of names) if (!reached(ride, n)) fails.push(`riding can't reach ${n}`);

  // The loop on foot, by its cells' middles and its gaps; and the ride down the middle.
  const ringIds = L.cells.filter((c) => c.ring >= 0).sort((a, b) => a.ring - b.ring).map((c) => c.id);
  const len = (pts) => pts.reduce((s, p, i) => (i ? s + Math.hypot(p[0] - pts[i - 1][0], p[1] - pts[i - 1][1]) : 0), 0);
  const loopPts = [];
  ringIds.forEach((id, i) => { const nxt = ringIds[(i + 1) % ringIds.length]; loopPts.push(L.at[id], L.at[`${id}>${nxt}`]); });
  loopPts.push(L.at[ringIds[0]]);
  const loop = len(loopPts);
  const half = len(loopPts.slice(0, loopPts.findIndex((p) => p === L.at.F) + 1));
  const toSpot3 = len([L.at.well, L.at.L1, L.at['L1>E1'], L.at.E1, L.at['E1>E2'], L.at.E2, L.at['E2>E3'], L.at.E3, L.at.seen3]);
  const rideWay = len([L.at['E3|P'], L.at.P, L.at.M1, L.at.M2, L.at.L1, L.at.light]);

  // Dashes. From everywhere, every way: how many veils does a dash cross before rock (or its end) stops it?
  let dashes = 0, two = 0;
  const twoAt = [];
  for (let z = z0; z < z1; z += 2) for (let x = x0; x < x1; x += 2) {
    if (L.sdf(x, z) > -0.6) continue;
    for (let a = 0; a < 24; a++) {
      const dx = Math.cos((a * Math.PI) / 12), dz = Math.sin((a * Math.PI) / 12);
      const reach = Math.min(DASH, L.rockAhead(x, z, dx, dz, DASH + 0.5, 0.45));
      let n = 0;
      for (const v of L.veils) if (L.cross(v, x, z, x + dx * reach, z + dz * reach) >= 0) n++;
      dashes++;
      if (n >= 2) { two++; if (twoAt.length < 6) twoAt.push([Math.round(x), Math.round(z), a * 15]); }
    }
  }
  if (two) fails.push(`${two} dashes cross two veils, e.g. ${JSON.stringify(twoAt)}`);
  // Square at each veil (and up to 15 degrees off), from just short of it, anywhere but its last two metres by a
  // pier: all the way through, and room to stop. (Wider of square or hard by a pier she may meet the pier on the
  // far side; that stops her like any rock, and is counted apart.)
  let square = 0, blocked = 0, wide = 0, wideStopped = 0;
  const blockedAt = [];
  for (const v of L.veils) {
    const ux = (v.bx - v.ax) / v.len, uz = (v.bz - v.az) / v.len;
    for (let u = 0.5; u < v.len; u += 1) {
      const mx = v.ax + ux * u, mz = v.az + uz * u;
      // (Only where the veil shows: its ends are in the rock.)
      if (L.sdf(mx + v.nx * 1.2, mz + v.nz * 1.2) > -0.8 || L.sdf(mx - v.nx * 1.2, mz - v.nz * 1.2) > -0.8) continue;
      const edge = [-2, 2].some((e) => L.sdf(mx + ux * e, mz + uz * e) > -0.5 || tall.some((o) => Math.hypot(mx + ux * e - o.x, mz + uz * e - o.z) < o.r + 0.5));
      // (The way out is only ever taken outward: through it the dungeon is over.)
      for (const sg of v.kind === 2 ? [1] : [1, -1]) for (const off of [-0.5, -0.25, 0, 0.25, 0.5]) for (const back of [1, 2.5]) {
        const a = Math.atan2(v.nz * sg, v.nx * sg) + off, dx = Math.cos(a), dz = Math.sin(a);
        const sx = mx - dx * back, sz = mz - dz * back;
        if (L.sdf(sx, sz) > -0.6) continue;
        // Clear floor for the whole dash and a body's width more.
        const stopped = L.rockAhead(sx, sz, dx, dz, DASH + 1.5, 0.5) < DASH + 1 || tall.some((o) => { const t = Math.max(0, Math.min(DASH + 1, (o.x - sx) * dx + (o.z - sz) * dz)); return Math.hypot(sx + dx * t - o.x, sz + dz * t - o.z) < o.r + 0.5; });
        if (edge || Math.abs(off) > 0.3) { wide++; if (stopped) wideStopped++; continue; }
        square++;
        if (stopped) {
          blocked++;
          if (blockedAt.length < 8) blockedAt.push([v.id, +u.toFixed(1), sg, off]);
        }
      }
    }
  }
  if (blocked) fails.push(`${blocked} dashes made square at a veil run into rock, e.g. ${JSON.stringify(blockedAt)}`);
  const amber = L.veil('amber'), lightPast = L.signed(amber, L.ember.x, L.ember.z);
  if (lightPast < DASH + 1.9) fails.push(`the light is only ${lightPast.toFixed(1)} m past the amber veil: a dash through it takes it`);

  // The picture: 3 px per metre.
  const S = 3, cv = document.createElement('canvas');
  cv.width = (x1 - x0) * S; cv.height = (z1 - z0) * S;
  const g = cv.getContext('2d');
  g.fillStyle = '#0d1c22'; g.fillRect(0, 0, cv.width, cv.height);
  let lo = 1e9, hi = -1e9;
  for (let k = 0; k < nx * nz; k++) if (free[k]) { lo = Math.min(lo, fl[k]); hi = Math.max(hi, fl[k]); }
  for (let j = 0; j < nz; j++) for (let i = 0; i < nx; i++) {
    const k = j * nx + i;
    if (!free[k]) continue;
    const t = (fl[k] - lo) / (hi - lo), c = Math.round(70 + 150 * t);
    g.fillStyle = foot[k] >= 0 ? `rgb(${c * 0.6},${c * 0.85},${c * 0.9})` : ride[k] >= 0 ? `rgb(${c},${c * 0.82},${c * 0.5})` : `rgb(${c},${c * 0.3},${c * 0.3})`;
    g.fillRect(i * C * S, j * C * S, C * S + 0.5, C * S + 0.5);
  }
  const X = (x) => (x - x0) * S, Z = (z) => (z - z0) * S;
  const dot = (x, z, r, col, fill = true) => { g.beginPath(); g.arc(X(x), Z(z), r * S, 0, 7); if (fill) { g.fillStyle = col; g.fill(); } else { g.strokeStyle = col; g.lineWidth = 1.5; g.stroke(); } };
  for (const o of L.stones) dot(o.x, o.z, o.sx * 0.9, '#55808a');
  for (const o of L.spikes) if (!o.down) dot(o.x, o.z, o.r, '#3d6670');
  for (const o of L.posts) dot(o.x, o.z, o.r, '#b9e6e0');
  for (const o of L.caps) dot(o.x, o.z, 0.45, '#7ff0e0');
  for (const o of L.lanterns) dot(o.x, o.z, 0.8, '#ffe14a');
  dot(L.ember.x, L.ember.z, 1.2, '#ff8a2a');
  for (const v of L.veils) { g.strokeStyle = v.kind === 1 ? '#ffa23a' : v.kind === 2 ? '#ffffff' : v.part ? '#9cf7e6' : '#39d8c2'; g.lineWidth = 2.5; g.beginPath(); g.moveTo(X(v.ax), Z(v.az)); g.lineTo(X(v.bx), Z(v.bz)); g.stroke(); }
  g.strokeStyle = '#ffffff55'; g.lineWidth = 1; g.beginPath(); loopPts.forEach((p, i) => (i ? g.lineTo(X(p[0]), Z(p[1])) : g.moveTo(X(p[0]), Z(p[1])))); g.stroke();
  g.font = '11px sans-serif'; g.fillStyle = '#fff';
  for (const n of names) if (!n.includes('>') && !n.includes('|')) g.fillText(n, X(L.at[n][0]) + 4, Z(L.at[n][1]) - 3);
  g.fillStyle = '#888';
  for (let x = Math.ceil(x0 / 20) * 20; x < x1; x += 20) g.fillText(String(x), X(x), 10);
  for (let z = Math.ceil(z0 / 20) * 20; z < z1; z += 20) g.fillText(String(z), 2, Z(z));
  return {
    png: cv.toDataURL('image/png'), fails,
    info: {
      side: L.side, box: L.box, area: Math.round(area), buildMs: d.buildMs, cells: L.cells.length, piers: L.piers.length, posts: L.posts.length,
      veils: { all: L.veils.length, short: L.veils.filter((v) => v.part).length }, lanterns: L.lanterns.length, glows: L.glows.length, stones: L.stones.length, spikes: L.spikes.length, caps: L.caps.length,
      'the loop on foot (m), and at a run (6.2 m/s)': [Math.round(loop), `${Math.round(loop / 6.2)} s`],
      'well to the far end, half way round (m)': Math.round(half + len([L.at.well, L.at.L1])),
      'well to the pocket\'s veil by the east, where you get her (m)': [Math.round(toSpot3), `${Math.round(toSpot3 / 6.2)} s at a run`],
      'the ride: the pocket, the middle, the first cell, the light (m)': [Math.round(rideWay), `${Math.round(rideWay / 9)} s at her canter, ${Math.round(rideWay / 22)} s flat out`],
      'dashes tried from everywhere / crossing two veils': [dashes, two],
      'dashes made square at a veil / run into rock': [square, blocked],
      'dashes at a veil wide of square or hard by a pier / stopped by the pier beyond (harmless)': [wide, wideStopped],
      'the light, past the amber veil (m)': +lightPast.toFixed(1),
      'veil widths that show (m)': Object.fromEntries(L.veils.map((v) => { let n = 0; const ux = (v.bx - v.ax) / v.len, uz = (v.bz - v.az) / v.len; for (let u = 0; u < v.len; u += 0.25) if (L.sdf(v.ax + ux * u, v.az + uz * u) < 0) n++; return [v.id, +(n * 0.25).toFixed(1)]; })),
    },
  };
});
fs.writeFileSync(out, Buffer.from(res.png.split(',')[1], 'base64'));
console.log(JSON.stringify(res.info, null, 1));
for (const f of res.fails) console.log('FAIL', f);
console.log(res.fails.length ? `${res.fails.length} FAILED` : 'ok: on foot the light, the pocket and the middle are out of reach; riding, everything is; no dash crosses two veils or ends in rock');
console.log(out);
await browser.close(); server.close();
process.exit(res.fails.length ? 1 : 0);
