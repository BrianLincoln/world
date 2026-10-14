// The map of the one world, from above:   node scripts/worldmap.mjs [out.png]      (serves $DIST; default docs/worldmap.png)
//   Everything built is read from the world itself (the cabin and village, towers, rings, the giant's
//   trail, hands, cabins), so a new ring or tower is on the map the next time this runs. What the game
//   can't know (names, and things decided but not built: zones, crossings, planned places) is kept by
//   hand in docs/worldmap.json. The picture is fitted round all of it at a fixed scale, so it grows as
//   the world's contents do. Prints where things are and how far apart.
// A mock of a shape for the land, for talking about and nothing more (the game isn't touched):
//   node scripts/worldmap.mjs out.png mock=docs/mock/some.json
//   { title, slope, islands: [{ name, pts: [[x, z], ...], r }] }: the land is kept inside each island's
//   shape (a line of points, r metres wide either side) and sinks away outside it, `slope` metres a metre,
//   so high ground reaches further out and the coast isn't a drawn line. The deep (what a sea spirit
//   would turn you back from) is the water more than `deep` metres from any shore.
// To add a kind of thing: collect it in SOURCES (in the page) and give its kind a line in DRAW.
import { chromium } from 'playwright';
import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path';
const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const out = process.argv.slice(2).find((a) => a.endsWith('.png')) ?? path.join(root, 'docs/worldmap.png');
const extra = JSON.parse(fs.readFileSync(path.join(root, 'docs/worldmap.json'), 'utf8'));
const mockArg = process.argv.slice(2).find((a) => a.startsWith('mock='));
if (mockArg) extra.mock = JSON.parse(fs.readFileSync(path.resolve(mockArg.slice(5)), 'utf8'));
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
const page = await browser.newPage({ viewport: { width: 1000, height: 1000 } });
page.on('pageerror', (e) => console.log('[pageerror]', e.message));
await page.goto(`http://localhost:${server.address().port}/?seed=${extra.seed ?? 'hilda'}&story=1&fresh=1&ui=0&capture=1&mobs=0&drak=0`);
for (let i = 0; i < 400; i++) { if (await page.evaluate(() => window.__ow?.ready())) break; await page.waitForTimeout(250); }
page.setDefaultTimeout(600000);
const r = await page.evaluate((extra) => {
  const ow = window.__ow, gen = ow.gen(), st = gen.story, net = gen.towers;
  // ---- What's in the world. Each source gives features: { kind, x, z, r?, pts?, name?, fit? }.
  // (fit: false = drawn if it's in the picture, but the picture isn't stretched to hold it. left / dy: where its name goes.)
  const SOURCES = {
    cabin: () => [{ kind: 'cabin', name: 'the cabin', x: st.x, z: st.z }],
    village: () => (st.village ? [{ kind: 'lane', pts: st.village.lane.map((p) => [p.x, p.z]) }] : []),
    farCabin: () => [{ kind: 'house', name: 'the far cabin', x: st.far.x, z: st.far.z, left: true, dy: 8 }],
    towers: () => net.towers.map((t) => ({ kind: t.home ? 'home' : t.id === gen.journey.next ? 'second' : 'tower', name: t.home ? 'home tower' : t.id === gen.journey.next ? 'second tower' : undefined, x: t.x, z: t.z, dy: t.home ? -13 : 0, links: t.links.filter((l) => l > t.id).map((l) => [net.towers[l].x, net.towers[l].z]) })),
    rides: () => [gen.journey.toHome, gen.journey.toNext].filter((w) => w?.length).map((pts) => ({ kind: 'ride', pts })),
    rings: () => gen.dungeons.map((d, n) => ({ kind: 'ring', n: n + 1, name: `${n + 1}  ${extra.ringNames?.[n] ?? ''}`, x: d.x, z: d.z, r: d.r })),
    ways: () => gen.dungeons.map((d) => ({ kind: 'way', pts: d.way })),
    trail: () => [ow.visit()?.route?.falls ?? [], ...[1, 2, 3, 4, 5, 6, 7, 8].map((leg) => { try { return ow.onward(leg) ?? []; } catch { return []; } })]
      .filter((f, i, all) => f.length && all.indexOf(f) === i).map((f) => ({ kind: 'trail', pts: f.map((p) => [p.x, p.z]) })),
    hands: (box) => { const h = ow.hands?.(); if (!h) return []; const cx = (box[0] + box[2]) / 2, cz = (box[1] + box[3]) / 2; return h.survey(cx, cz, Math.ceil(Math.max(box[2] - box[0], box[3] - box[1]) / 2 / 1100) + 1).map((p) => ({ kind: 'hand', x: p.x, z: p.z, fit: false })); },
    pois: (box) => { const o = []; for (let cx = Math.floor(box[0] / 420); cx <= Math.floor(box[2] / 420); cx++) for (let cz = Math.floor(box[1] / 420); cz <= Math.floor(box[3] / 420); cz++) for (const p of gen.poisInCell(cx, cz)) if ((p.kind === 'cabin' || p.kind === 'circle') && !p.story) o.push({ kind: p.kind === 'cabin' ? 'house' : 'circle', x: p.x, z: p.z, fit: false }); return o; },
  };
  let feats = [];
  for (const k of ['cabin', 'village', 'farCabin', 'towers', 'rides', 'rings', 'ways', 'trail']) feats.push(...SOURCES[k]());
  feats.push(...(extra.features ?? []));
  // ---- The picture is fitted round them.
  let box = [Infinity, Infinity, -Infinity, -Infinity];
  const grow = (x, z, r = 0) => { box = [Math.min(box[0], x - r), Math.min(box[1], z - r), Math.max(box[2], x + r), Math.max(box[3], z + r)]; };
  for (const f of feats) { if (f.fit === false) continue; if (f.pts) for (const p of f.pts) grow(p[0], p[1]); else grow(f.x, f.z, f.r ?? 0); }
  const M = extra.margin ?? 700;
  box = [Math.floor((box[0] - M) / 100) * 100, Math.floor((box[1] - M) / 100) * 100, Math.ceil((box[2] + M) / 100) * 100, Math.ceil((box[3] + M) / 100) * 100];
  for (const k of ['hands', 'pois']) feats.push(...SOURCES[k](box));
  if (extra.mock) for (const s of extra.mock.islands ?? []) if (s.name) { let x = 0, z = 0; for (const p of s.pts) { x += p[0]; z += p[1]; } feats.push({ kind: 'place', name: s.name, x: x / s.pts.length, z: z / s.pts.length, big: true }); }
  let mpp = extra.metresPerPixel ?? 8;
  while ((box[2] - box[0]) / mpp > 4200 || (box[3] - box[1]) / mpp > 4200) mpp *= 1.25;
  const W = Math.round((box[2] - box[0]) / mpp), H = Math.round((box[3] - box[1]) / mpp), PAD = 46, FOOT = 92;
  const cv = document.createElement('canvas'); cv.width = W + PAD * 2; cv.height = H + PAD + FOOT;
  const c = cv.getContext('2d');
  c.fillStyle = '#efe6d0'; c.fillRect(0, 0, cv.width, cv.height);
  // ---- The land: height bands, hill shade, woods, bog, the cold above 200 m, a line every 50 m.
  const hs = new Float32Array(W * H);
  // (A mock: how far outside every island's shape, and the land sunk by that.)
  const mock = extra.mock, isl = mock?.islands ?? [];
  const outside = (x, z) => { let best = Infinity; for (const s of isl) for (let k = 0; k < Math.max(1, s.pts.length - 1); k++) { const a = s.pts[k], b = s.pts[Math.min(s.pts.length - 1, k + 1)], dx = b[0] - a[0], dz = b[1] - a[1], t = Math.max(0, Math.min(1, ((x - a[0]) * dx + (z - a[1]) * dz) / (dx * dx + dz * dz || 1))); best = Math.min(best, Math.hypot(x - a[0] - dx * t, z - a[1] - dz * t) - s.r); } return best; };
  const ground = (x, z) => { const h = gen.height(x, z); if (!mock) return h; const d = outside(x, z); return d <= 0 ? h : Math.max(-60, h - d * (mock.slope ?? 0.2)); };
  for (let j = 0; j < H; j++) for (let i = 0; i < W; i++) hs[j * W + i] = ground(box[0] + (i + 0.5) * mpp, box[1] + (j + 0.5) * mpp);
  // (The deep: water further than `deep` metres from any shore, by a coarse sweep of the grid.)
  const far = new Uint8Array(W * H);
  if (mock) {
    const R = Math.round((mock.deep ?? 150) / mpp), dist = new Float32Array(W * H).fill(1e9);
    for (let k = 0; k < W * H; k++) if (hs[k] >= 0.5) dist[k] = 0;
    for (let j = 0; j < H; j++) for (let i = 0; i < W; i++) { const k = j * W + i; if (i) dist[k] = Math.min(dist[k], dist[k - 1] + 1); if (j) dist[k] = Math.min(dist[k], dist[k - W] + 1); if (i && j) dist[k] = Math.min(dist[k], dist[k - W - 1] + 1.41); if (j && i < W - 1) dist[k] = Math.min(dist[k], dist[k - W + 1] + 1.41); }
    for (let j = H - 1; j >= 0; j--) for (let i = W - 1; i >= 0; i--) { const k = j * W + i; if (i < W - 1) dist[k] = Math.min(dist[k], dist[k + 1] + 1); if (j < H - 1) dist[k] = Math.min(dist[k], dist[k + W] + 1); if (i < W - 1 && j < H - 1) dist[k] = Math.min(dist[k], dist[k + W + 1] + 1.41); if (j < H - 1 && i) dist[k] = Math.min(dist[k], dist[k + W - 1] + 1.41); }
    for (let k = 0; k < W * H; k++) if (dist[k] > R) far[k] = 1;
  }
  const img = c.createImageData(W, H), BANDS = [[226, 214, 168], [214, 204, 154], [203, 191, 142], [192, 176, 134], [181, 163, 132]], COLD = [243, 242, 238];
  let land = 0, cold = 0, top = 0;
  for (let j = 0; j < H; j++) for (let i = 0; i < W; i++) {
    const h = hs[j * W + i], o = (j * W + i) * 4, x = box[0] + (i + 0.5) * mpp, z = box[1] + (j + 0.5) * mpp;
    let col;
    if (h < 0.5) col = far[j * W + i] ? [104, 132, 158] : h < -6 && !mock ? [150, 176, 190] : [170, 194, 203];
    else {
      land++; top = Math.max(top, h);
      const hn = hs[Math.max(0, j - 1) * W + Math.max(0, i - 1)], shade = Math.max(0.78, Math.min(1.14, 1 + ((hn - h) / mpp) * 0.55));
      if (h >= 200) { cold++; col = COLD.map((v) => v * (0.9 + (shade - 1) * 0.6 + 0.1)); }
      else {
        col = BANDS[Math.min(4, Math.floor(h / 40))].slice();
        const f = gen.forestDensity(x, z, h), b = gen.bog(x, z);
        if (f > 0.5) col = [col[0] * 0.68, col[1] * 0.8, col[2] * 0.66];
        if (b > 0.5) col = [col[0] * 0.8 + 20, col[1] * 0.78 + 18, col[2] * 0.9 + 26];
        col = col.map((v) => v * shade);
      }
      const hr = hs[j * W + Math.min(W - 1, i + 1)], hd = hs[Math.min(H - 1, j + 1) * W + i];
      if (Math.floor(h / 50) !== Math.floor(hr / 50) || Math.floor(h / 50) !== Math.floor(hd / 50)) col = col.map((v) => v * 0.88);
      if ((h >= 200) !== (hr >= 200) || (h >= 200) !== (hd >= 200)) col = [150, 160, 186];
    }
    img.data[o] = col[0]; img.data[o + 1] = col[1]; img.data[o + 2] = col[2]; img.data[o + 3] = 255;
  }
  c.putImageData(img, PAD, PAD);
  // ---- A square every kilometre, numbered in world kilometres (so a thing can be placed by them).
  const P = (x, z) => [PAD + (x - box[0]) / mpp, PAD + (z - box[1]) / mpp];
  const FONT = (px, it) => `${it ? 'italic ' : ''}${px}px "EB Garamond", Georgia, serif`;
  c.save(); c.beginPath(); c.rect(PAD, PAD, W, H); c.clip();
  c.strokeStyle = 'rgba(70,50,40,0.13)'; c.lineWidth = 1;
  for (let x = Math.ceil(box[0] / 1000) * 1000; x <= box[2]; x += 1000) { c.beginPath(); c.moveTo(P(x, 0)[0], PAD); c.lineTo(P(x, 0)[0], PAD + H); c.stroke(); }
  for (let z = Math.ceil(box[1] / 1000) * 1000; z <= box[3]; z += 1000) { c.beginPath(); c.moveTo(PAD, P(0, z)[1]); c.lineTo(PAD + W, P(0, z)[1]); c.stroke(); }
  // ---- How each kind is drawn. Lines first, then marks, then names.
  const INK = '#3a2a22', GIANT = '#5b4fa8', RING = '#7a2bd0', WARM = '#d8642a';
  const line = (pts, style, w, dash) => { c.strokeStyle = style; c.lineWidth = w; c.setLineDash(dash ?? []); c.beginPath(); pts.forEach((p, i) => { const q = P(p[0], p[1]); i ? c.lineTo(...q) : c.moveTo(...q); }); c.stroke(); c.setLineDash([]); };
  const dot = (x, z, r, fill, stroke, w = 1.5) => { const q = P(x, z); c.beginPath(); c.arc(q[0], q[1], r, 0, 7); if (fill) { c.fillStyle = fill; c.fill(); } if (stroke) { c.strokeStyle = stroke; c.lineWidth = w; c.stroke(); } };
  const names = [];
  const name = (f, px, dx = 9, col = INK, it = false) => { if (f.name) names.push({ t: f.name, q: P(f.x, f.z), px, dx: f.left ? -dx : dx, dy: f.dy ?? 0, left: f.left, col, it }); };
  const mid = (pts) => { let x = 0, z = 0; for (const p of pts) { x += p[0]; z += p[1]; } return { x: x / pts.length, z: z / pts.length }; };
  const DRAW = {
    zone: (f) => { c.strokeStyle = 'rgba(160,50,40,0.75)'; c.lineWidth = 3; c.setLineDash([14, 8]); c.beginPath(); if (f.pts) { f.pts.forEach((p, i) => { const q = P(p[0], p[1]); i ? c.lineTo(...q) : c.moveTo(...q); }); c.closePath(); } else c.arc(...P(f.x, f.z), f.r / mpp, 0, 7); c.stroke(); c.setLineDash([]); name({ name: f.name, ...(f.pts ? mid(f.pts) : f) }, 30, 0, 'rgba(140,40,30,0.85)', true); },
    links: (f) => { for (const l of f.links ?? []) line([[f.x, f.z], l], 'rgba(90,60,50,0.16)', 1); },
    lane: (f) => line(f.pts, INK, 2.5),
    ride: (f) => line(f.pts, 'rgba(216,100,42,0.8)', 1.6, [5, 4]),
    way: (f) => line(f.pts, 'rgba(60,40,30,0.5)', 1.2),
    trail: (f) => { c.fillStyle = GIANT; for (const p of f.pts) { const q = P(p[0], p[1]); c.fillRect(q[0] - 1.3, q[1] - 1.3, 2.6, 2.6); } },
    line: (f) => { line(f.pts, INK, 2); name({ name: f.name, ...mid(f.pts) }, 15); },
    crossing: (f) => { line(f.pts, '#a02a20', 5); name({ name: f.name, ...mid(f.pts) }, 17, 10, '#a02a20'); },
    circle: (f) => dot(f.x, f.z, 2.2, null, 'rgba(60,40,30,0.55)', 1),
    house: (f) => { const q = P(f.x, f.z); c.fillStyle = f.name ? INK : 'rgba(60,40,30,0.7)'; c.fillRect(q[0] - 2.5, q[1] - 2.5, 5, 5); name(f, 14); },
    hand: (f) => { const q = P(f.x, f.z); c.fillStyle = '#5f7fb0'; c.beginPath(); c.moveTo(q[0], q[1] - 6); c.lineTo(q[0] + 4.5, q[1] + 4); c.lineTo(q[0] - 4.5, q[1] + 4); c.fill(); },
    tower: (f) => dot(f.x, f.z, 3.6, '#fff4d8', INK),
    second: (f) => { dot(f.x, f.z, 5, '#f2c46a', INK, 2); name(f, 14); },
    home: (f) => { dot(f.x, f.z, 6.5, WARM, INK, 2); name(f, 15); },
    ring: (f) => { dot(f.x, f.z, 9, 'rgba(255,255,255,0.75)', RING, 3); name(f, 19, 14, '#4b1a86'); },
    cabin: (f) => { const q = P(f.x, f.z); c.fillStyle = WARM; c.strokeStyle = INK; c.lineWidth = 2; c.beginPath(); c.moveTo(q[0] - 7, q[1] + 6); c.lineTo(q[0] - 7, q[1] - 2); c.lineTo(q[0], q[1] - 9); c.lineTo(q[0] + 7, q[1] - 2); c.lineTo(q[0] + 7, q[1] + 6); c.closePath(); c.fill(); c.stroke(); name(f, 19, 13); },
    place: (f) => name(f, f.big ? 30 : 17, 0, f.big ? 'rgba(140,40,30,0.9)' : INK, true),
    planned: (f) => { dot(f.x, f.z, Math.max(7, (f.r ?? 0) / mpp), null, '#a02a20', 2.5); name(f, 17, 12, '#a02a20', true); },
  };
  const ORDER = ['zone', 'links', 'way', 'ride', 'lane', 'trail', 'line', 'crossing', 'circle', 'house', 'hand', 'tower', 'second', 'home', 'ring', 'cabin', 'place', 'planned'];
  // (In a mock, what would be under the sea isn't drawn, the rings and the cabin apart: they'd be found again.)
  if (mock) for (const f of feats) delete f.links;
  if (mock) feats = feats.filter((f) => f.pts || ['ring', 'cabin', 'place'].includes(f.kind) || ground(f.x, f.z) >= 0.5);
  for (const k of ORDER) for (const f of feats) { if (k === 'links' ? f.links : f.kind === k) DRAW[k](f); }
  const unknown = [...new Set(feats.map((f) => f.kind).filter((k) => !DRAW[k]))];
  c.textBaseline = 'middle'; c.lineJoin = 'round';
  for (const n of names) { c.font = FONT(n.px, n.it); c.textAlign = n.left ? 'right' : n.dx ? 'left' : 'center'; c.strokeStyle = 'rgba(245,238,220,0.9)'; c.lineWidth = 4; c.strokeText(n.t, n.q[0] + n.dx, n.q[1] + n.dy); c.fillStyle = n.col; c.fillText(n.t, n.q[0] + n.dx, n.q[1] + n.dy); }
  c.restore();
  // ---- The frame: kilometre numbers, a scale, what the marks mean.
  c.strokeStyle = INK; c.lineWidth = 2; c.strokeRect(PAD, PAD, W, H);
  c.fillStyle = INK; c.font = FONT(13); c.textBaseline = 'middle';
  c.textAlign = 'center'; for (let x = Math.ceil(box[0] / 1000) * 1000; x <= box[2]; x += 1000) c.fillText(`${x / 1000}`, P(x, 0)[0], PAD - 14);
  c.textAlign = 'right'; for (let z = Math.ceil(box[1] / 1000) * 1000; z <= box[3]; z += 1000) c.fillText(`${z / 1000}`, PAD - 8, P(0, z)[1]);
  c.textAlign = 'left'; c.font = FONT(13, true); c.fillText('x, km →', PAD, 14); c.save(); c.translate(13, PAD + 60); c.rotate(-Math.PI / 2); c.fillText('← z, km', 0, 0); c.restore();
  const fy = PAD + H + 30;
  c.font = FONT(26); c.fillText(mock ? `A mock: ${mock.title ?? ''}` : 'Embla: the world', PAD, fy);
  c.font = FONT(13, true); c.fillText(`seed "${extra.seed ?? 'hilda'}", ${((box[2] - box[0]) / 1000).toFixed(1)} by ${((box[3] - box[1]) / 1000).toFixed(1)} km, ${mpp} m to a pixel`, PAD, fy + 26);
  const sx = PAD + Math.max(330, c.measureText(mock ? `A mock: ${mock.title ?? ''}` : '').width * 2.05 + 30); c.lineWidth = 3; c.beginPath(); c.moveTo(sx, fy); c.lineTo(sx + 1000 / mpp, fy); c.stroke(); c.font = FONT(13); c.fillText('1 km', sx + 1000 / mpp + 8, fy);
  const KEY = [['cabin', 'the cabin'], ['home', 'home tower'], ['tower', 'tower'], ['ring', 'dungeon ring'], ['trail', "the giant's footfalls"], ['way', 'the way to a ring'], ['ride', 'the guided rides'], ['hand', 'stone hand'], ['house', 'a cabin'], ['circle', 'stone circle'], ['cold', 'cold: above 200 m'], ['wood', 'woods'], ['bog', 'bog'], ['planned', 'planned, not built']];
  const k0 = sx + 1000 / mpp + 70; let kx = k0, ky = fy - 8;
  for (const [k, t] of KEY) {
    const wx = box[0] + (kx - PAD + 8) * mpp, wz = box[1] + (ky - PAD) * mpp;
    if (k === 'cold') { c.fillStyle = '#f3f2ee'; c.fillRect(kx, ky - 6, 16, 12); c.strokeStyle = '#96a0ba'; c.lineWidth = 1.5; c.strokeRect(kx, ky - 6, 16, 12); }
    else if (k === 'wood') { c.fillStyle = '#93a468'; c.fillRect(kx, ky - 6, 16, 12); }
    else if (k === 'bog') { c.fillStyle = '#b9b0b4'; c.fillRect(kx, ky - 6, 16, 12); }
    else if (k === 'trail') DRAW.trail({ pts: [0, 5, 10, 15].map((d) => [wx - 8 * mpp + d * mpp, wz]) });
    else if (k === 'way' || k === 'ride') DRAW[k]({ pts: [[wx - 8 * mpp, wz], [wx + 8 * mpp, wz]] });
    else DRAW[k]({ x: wx, z: wz });
    c.fillStyle = INK; c.font = FONT(13); c.textAlign = 'left'; c.fillText(t, kx + 24, ky);
    kx += 34 + c.measureText(t).width + 18;
    if (kx > cv.width - 190) { kx = k0; ky += 24; }
  }
  names.length = 0;
  // ---- And in numbers.
  const d = (a, b) => Math.round(Math.hypot(a.x - b.x, a.z - b.z));
  const rings = gen.dungeons;
  return {
    png: cv.toDataURL('image/png'), unknown,
    box, size: [W, H], mpp, landShare: +(land / (W * H)).toFixed(2), coldShareOfLand: +(cold / Math.max(1, land)).toFixed(3), highest: Math.round(top),
    cabin: [Math.round(st.x), Math.round(st.z)], towers: net.towers.length, towerReach: Math.round(Math.max(...net.towers.map((t) => d(t, st)))),
    rings: rings.map((s, n) => ({ n: n + 1, at: [Math.round(s.x), Math.round(s.z)], h: Math.round(s.y), fromCabin: d(s, st), fromPrev: n ? d(s, rings[n - 1]) : null })),
    hands: feats.filter((f) => f.kind === 'hand').length, cabins: feats.filter((f) => f.kind === 'house').length, circles: feats.filter((f) => f.kind === 'circle').length,
  };
}, extra);
fs.writeFileSync(out, Buffer.from(r.png.split(',')[1], 'base64'));
delete r.png;
if (r.unknown.length) console.log('kinds in docs/worldmap.json with no way to draw them:', r.unknown.join(', '));
delete r.unknown;
console.log(JSON.stringify(r, null, 1));
console.log('->', path.relative(root, out));
await browser.close(); server.close();
