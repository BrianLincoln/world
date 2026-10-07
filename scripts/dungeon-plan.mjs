// Dungeon 1's plan from above, and whether it holds together:
//   node scripts/dungeon-plan.mjs <out.png> [seed=hilda]
// Draws the plan (floor height as tone, walls dark, lanterns, glowcaps, stepping
// stones, boulders, the named places of `layout.at`) and flood-fills it the way
// you can actually move: on foot (up 2.7 m: a jump and a step), with the
// rockfall shut and then open, and on the rockhopper. It prints what each can
// reach, how far it is, the walkable area, and anything wrong with the hard
// edges (a ledge or the pit's rim cutting through open floor where it shouldn't).
// Uses the build in dist/ (run `npx vite build` first).
import { chromium } from 'playwright';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const args = process.argv.slice(2);
const out = args.find((a) => a.endsWith('.png')) ?? 'shots/dungeon/_plan.png';
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
await page.goto(`http://localhost:${server.address().port}/?seed=${seed}&story=0&t=10&ui=0&capture=1&mobs=0&drak=0&fresh=1&dungeon=1`);
for (let i = 0; i < 160; i++) { if (await page.evaluate(() => window.__ow?.ready())) break; await page.waitForTimeout(250); }
const res = await page.evaluate(() => {
  const d = window.__ow.dungeon(), L = d.layout;
  const [x0, z0, x1, z1] = L.box, C = 0.5;
  const nx = Math.ceil((x1 - x0) / C), nz = Math.ceil((z1 - z0) / C);
  const free = new Uint8Array(nx * nz), fl = new Float32Array(nx * nz);
  let area = 0;
  for (let j = 0; j < nz; j++) for (let i = 0; i < nx; i++) {
    const x = x0 + i * C, z = z0 + j * C;
    if (L.sdf(x, z) < -0.35) { free[j * nx + i] = 1; fl[j * nx + i] = L.floor(x, z); }
    if (L.sdf(x, z) < 0) area += C * C;
  }
  const plug = L.plug.map((p) => p.solid);
  const cellOf = ([x, z]) => Math.round((z - z0) / C) * nx + Math.round((x - x0) / C);
  /** Flood from a place; `climb` m is the most you can go up in a step; returns distance (m) per cell, -1 unreached. */
  const flood = (from, climb, shut) => {
    const dist = new Float32Array(nx * nz).fill(-1);
    const blocked = (k) => { if (!shut) return false; const x = x0 + (k % nx) * C, z = z0 + Math.floor(k / nx) * C; return plug.some((o) => Math.hypot(x - o.x, z - o.z) < o.r); };
    const q = [cellOf(L.at[from])];
    dist[q[0]] = 0;
    for (let h = 0; h < q.length; h++) {
      const k = q[h], i = k % nx, j = (k - i) / nx;
      for (const [di, dj] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const a = i + di, b = j + dj, m = b * nx + a;
        if (a < 0 || b < 0 || a >= nx || b >= nz || !free[m] || dist[m] >= 0 || fl[m] - fl[k] > climb || blocked(m)) continue;
        dist[m] = dist[k] + C;
        q.push(m);
      }
    }
    return dist;
  };
  const names = Object.keys(L.at);
  const reach = (dist) => Object.fromEntries(names.map((n) => [n, Math.round(dist[cellOf(L.at[n])] / 1.2)]));
  const foot = flood('well', 2.7, true), over = flood('farLip', 2.7, true), open = flood('rockfall', 2.7, false), ride = flood('underBalcony', 9, false);
  // Higher ground to parachute from, on the way to the ledge: the tallest floor you can stand on, on foot, within 70 m of its lip.
  const k0 = L.shelves[0];
  let high = -1e9;
  for (let k = 0; k < nx * nz; k++) {
    if (foot[k] < 0 && open[k] < 0) continue;
    const x = x0 + (k % nx) * C, z = z0 + Math.floor(k / nx) * C;
    if (Math.hypot(x - k0.x, z - k0.z) < 70 && L.past(k0, x, z) < 0) high = Math.max(high, fl[k]);
  }
  // Hard edges in the open that shouldn't be: a ledge's side or back, or the pit's rim away from its two lips.
  let bad = 0;
  const rim = [];
  for (let j = 0; j < nz; j++) for (let i = 0; i < nx; i++) {
    const k = j * nx + i;
    if (!free[k]) continue;
    const x = x0 + i * C, z = z0 + j * C;
    for (const K of L.shelves) {
      const u = Math.abs(-(x - K.x) * K.dz + (z - K.z) * K.dx), p = L.past(K, x, z);
      if (p > 0.5 && Math.abs(u - K.w) < 0.5 && L.riseOf(K, x, z) + L.riseOf(K, x + K.dz, z - K.dx) + L.riseOf(K, x - K.dz, z + K.dx) > 0.3) bad++;
    }
    if (Math.abs(L.pitSd(x, z)) < 0.4 && L.sinkOf(x, z) > 0.4) rim.push(Math.min(Math.hypot(x - L.at.lip[0], z - L.at.lip[1]), Math.hypot(x - L.at.farLip[0], z - L.at.farLip[1])));
  }
  const tops = L.tops.map((o, i) => { const p = i ? L.tops[i - 1] : null; return { gap: +(p ? Math.hypot(o.x - p.x, o.z - p.z) - o.r - p.r : L.pit.r - Math.hypot(o.x - L.pit.x, o.z - L.pit.z) - o.r).toFixed(2), r: o.r, up: +(o.top - L.pit.depth).toFixed(2), wall: +(-L.sdf(o.x, o.z) - o.r).toFixed(1) }; });
  const last = L.tops[L.tops.length - 1];
  // The picture: 3 px per metre.
  const S = 3, cv = document.createElement('canvas');
  cv.width = (x1 - x0) * S; cv.height = (z1 - z0) * S;
  const g = cv.getContext('2d');
  g.fillStyle = '#15121f'; g.fillRect(0, 0, cv.width, cv.height);
  let lo = 1e9, hi = -1e9;
  for (let k = 0; k < nx * nz; k++) if (free[k]) { lo = Math.min(lo, fl[k]); hi = Math.max(hi, fl[k]); }
  for (let j = 0; j < nz; j++) for (let i = 0; i < nx; i++) {
    const k = j * nx + i;
    if (!free[k]) continue;
    const t = (fl[k] - lo) / (hi - lo), c = Math.round(60 + 170 * t);
    g.fillStyle = foot[k] >= 0 ? `rgb(${c * 0.75},${c * 0.75},${c})` : over[k] >= 0 ? `rgb(${c * 0.7},${c * 0.9},${c * 0.8})` : open[k] >= 0 ? `rgb(${c},${c * 0.8},${c * 0.7})` : `rgb(${c},${c * 0.9},${c * 0.5})`;
    g.fillRect((x0 + i * C - x0) * S, (z0 + j * C - z0) * S, C * S + 0.5, C * S + 0.5);
  }
  const dot = (x, z, r, col, fill = true) => { g.beginPath(); g.arc((x - x0) * S, (z - z0) * S, r * S, 0, 7); if (fill) { g.fillStyle = col; g.fill(); } else { g.strokeStyle = col; g.lineWidth = 1.5; g.stroke(); } };
  for (const o of L.stones) dot(o.x, o.z, o.sx * 0.9, o.hex ? '#7fa0e0' : '#6d6690');
  for (const o of L.spikes) if (!o.down) dot(o.x, o.z, o.r, '#4d466e');
  for (const o of L.tops) dot(o.x, o.z, o.r, '#ffffff', false);
  for (const p of L.plug) dot(p.solid.x, p.solid.z, p.solid.r, '#e0605a');
  for (const o of L.caps) dot(o.x, o.z, 0.5, '#7fe6ff');
  for (const o of L.lanterns) dot(o.x, o.z, 0.8, '#ffe14a');
  dot(L.ember.x, L.ember.z, 1.2, '#ff8a2a');
  for (const K of L.shelves) { g.strokeStyle = '#ff4fd0'; g.lineWidth = 2; g.beginPath(); g.moveTo((K.x - K.dz * 8 - x0) * S, (K.z + K.dx * 8 - z0) * S); g.lineTo((K.x + K.dz * 8 - x0) * S, (K.z - K.dx * 8 - z0) * S); g.stroke(); }
  g.font = '11px sans-serif'; g.fillStyle = '#fff';
  for (const n of names) g.fillText(n, (L.at[n][0] - x0) * S + 4, (L.at[n][1] - z0) * S - 3);
  // 20 m ticks.
  g.fillStyle = '#888';
  for (let x = Math.ceil(x0 / 20) * 20; x < x1; x += 20) g.fillText(String(x), (x - x0) * S, 10);
  for (let z = Math.ceil(z0 / 20) * 20; z < z1; z += 20) g.fillText(String(z), 2, (z - z0) * S);
  return {
    png: cv.toDataURL('image/png'),
    info: {
      side: L.side, box: L.box, area: Math.round(area), buildMs: d.buildMs, lanterns: L.lanterns.length, glows: L.glows.length, stones: L.stones.length, spikes: L.spikes.length, caps: L.caps.length,
      'on foot from the well (m; -1 = can\'t)': reach(foot), 'on foot from the far lip': reach(over), 'rockfall open, from it': reach(open), 'on the mount, from under the balcony (climb 9 m)': reach(ride),
      ledge: { top: +(L.floor(L.at.ledgeTop[0], L.at.ledgeTop[1])).toFixed(2), foot: +(L.floor(L.at.ledge[0], L.at.ledge[1])).toFixed(2), 'highest floor on foot within 70 m below it': +high.toFixed(2) },
      balcony: { top: +(L.floor(L.at.balcony[0], L.at.balcony[1])).toFixed(2), under: +(L.floor(L.at.underBalcony[0], L.at.underBalcony[1])).toFixed(2) },
      'ledge sides in the open (want 0)': bad, 'pit rim in the open: cells, farthest from a lip (m)': [rim.length, +Math.max(0, ...rim).toFixed(1)],
      tops, 'last hop (m)': +(L.pit.r - Math.hypot(last.x - L.pit.x, last.z - L.pit.z) - last.r).toFixed(2),
    },
  };
});
fs.writeFileSync(out, Buffer.from(res.png.split(',')[1], 'base64'));
console.log(JSON.stringify(res.info, null, 1));
console.log(out);
await browser.close(); server.close();
