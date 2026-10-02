// Distant trees, before and after a change to their LODs.
//   node scripts/treelod.mjs <outDir> [--dist dist] [stills,edge,motion] [seed=hilda] [q=&lod3=0]
// Needs a build (`npx vite build --outDir <dist>`).
//   stills: the distant-forest shots of shots.mjs (vista, vista-fjord,
//           vista-42-dawn, aerial, seed-fjord-aerial).
//   edge:   a forest edge seen across open ground from 300 m, 600 m and
//           1.2 km, whole frame and a full-resolution crop of the middle.
//   motion: walking, sprinting and flying at that edge and away from it,
//           frames stepped by hand (`__ow.manual`), a crop of each, and the
//           tree LOD census at each frame printed. Tile with sheet.mjs.
// Every still is shot twice from one frozen frame: as built, and
// `<name>-lod2.png` with the far trees (lod 3) drawn as lod 2 instead; compare
// the two with imgdiff.mjs.
// The edge found is written to <outDir>/edge.json; pass `edge=<file>` to use
// one found earlier (so before and after look at the same trees).
import { chromium } from 'playwright';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const args = process.argv.slice(2);
const opt = (f, d) => (args.includes(f) ? args[args.indexOf(f) + 1] : d);
const kv = (k, d) => args.find((a) => a.startsWith(k + '='))?.slice(k.length + 1) ?? d;
const outDir = path.resolve(root, args[0] ?? 'shots/treelod');
const dist = opt('--dist', 'dist');
const what = (args.find((a) => /^(stills|edge|motion)(,|$)/.test(a)) ?? 'stills,edge').split(',');
const seed = kv('seed', 'hilda');
const extra = kv('q', '');
fs.mkdirSync(outDir, { recursive: true });

const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png' };
const server = http.createServer((req, res) => {
  const p = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  const f = path.join(root, dist, p === '/' ? 'index.html' : p);
  if (!fs.existsSync(f)) { res.writeHead(404); res.end(); return; }
  res.writeHead(200, { 'content-type': types[path.extname(f)] ?? 'application/octet-stream' });
  fs.createReadStream(f).pipe(res);
});
await new Promise((r) => server.listen(0, r));
const port = server.address().port;

const browser = await chromium.launch({ args: ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: 1600, height: 900 }, deviceScaleFactor: 1 });
page.on('pageerror', (e) => console.log('[pageerror]', e.message));

async function waitReady(timeout = 90000) {
  const t0 = Date.now();
  let ok = 0;
  while (Date.now() - t0 < timeout) {
    ok = (await page.evaluate(() => window.__ow && window.__ow.ready())) ? ok + 1 : 0;
    if (ok >= 4) return true;
    await page.waitForTimeout(250);
  }
  console.log('  (timed out waiting for terrain)');
  return false;
}
const open = async (q) => {
  await page.goto(`http://localhost:${port}/?${q}&ui=0&paused=1&capture=1${extra}`);
  await page.waitForTimeout(500);
  await waitReady();
};
/** Trees drawn in the visible nodes, by triangles per tree (which says which LOD). */
const census = () => page.evaluate(() => {
  const t = window.__ow._terrain, out = {};
  let inst = 0, tris = 0;
  for (const n of t.visible) for (const c of n.group?.children ?? []) {
    if (c.name !== 'trees' || !c.visible) continue;
    const g = c.geometry, per = (g.index ? g.index.count : g.attributes.position.count) / 3, k = g.instanceCount;
    const key = `${per}t`;
    out[key] = (out[key] ?? 0) + k;
    inst += k; tris += per * k;
  }
  return { inst, tris, by: out };
});
const fmt = (c) => `${c.inst} trees ${(c.tris / 1e6).toFixed(2)} M  ` + Object.entries(c.by).sort((a, b) => parseFloat(b[0]) - parseFloat(a[0])).map(([k, v]) => `${k}:${v}`).join(' ');
const CROP = { x: 400, y: 250, width: 800, height: 400 };
/**
 * The same frozen frame twice: as built (`<name>.png`), and with every far
 * tree (lod 3) drawn as lod 2 instead (`<name>-lod2.png`), so the two differ
 * by the far shape and nothing else.
 */
const SWAP = (to) => page.evaluate((to) => {
  const t = window.__ow._terrain, geos = t.kinds.trees.geos, per = geos.length / 2;
  let n = 0;
  for (const node of t.nodes.values()) for (const c of node.group?.children ?? []) {
    if (c.name !== 'trees') continue;
    const g = c.geometry;
    for (let v = 0; v < 2; v++) {
      const from = geos[v * per + (to === 2 ? 3 : 2)], dst = geos[v * per + to];
      if (g.attributes.position !== from.attributes.position || (to === 3 && !c.userData.was3)) continue;
      c.userData.was3 = true;
      g.index = dst.index;
      for (const k of ['position', 'normal', 'aKind']) g.setAttribute(k, dst.attributes[k]);
      n += g.instanceCount;
    }
  }
  return n;
}, to);
const pair = async (name, crop = false) => {
  await page.evaluate(() => { const ow = window.__ow; if (ow._rig?.root) ow._rig.root.visible = false; ow.manual(true); ow.advance(1, 0); });
  await page.screenshot({ path: path.join(outDir, `${name}.png`) });
  if (crop) await page.screenshot({ path: path.join(outDir, `${name}-crop.png`), clip: CROP });
  const n = await SWAP(2);
  await page.evaluate(() => window.__ow.advance(1, 0));
  await page.screenshot({ path: path.join(outDir, `${name}-lod2.png`) });
  if (crop) await page.screenshot({ path: path.join(outDir, `${name}-lod2-crop.png`), clip: CROP });
  await SWAP(3);
  await page.evaluate(() => window.__ow.manual(false));
  return n;
};

if (what.includes('stills')) {
  const SHOTS = [
    { name: 'vista', q: 'seed=hilda&t=9.8&pitch=0.04&dist=9', setup: 'window.__ow.facePeak()' },
    { name: 'vista-fjord', q: 'seed=fjord&t=17.2&pitch=0.04&dist=9', setup: 'window.__ow.facePeak()' },
    { name: 'vista-42-dawn', q: 'seed=42&t=7.2&pitch=0.04&dist=9', setup: 'window.__ow.facePeak()' },
    { name: 'aerial', q: 'seed=hilda&t=10&mode=fly&y=140&pitch=0.22&dist=30&yaw=2.6' },
    { name: 'seed-fjord', q: 'seed=fjord&t=9.8&yaw=0.3' },
    { name: 'look-up', q: 'seed=hilda&t=16.8&pitch=-0.6&yaw=1.8' },
    { name: 'seed-fjord-aerial', q: 'seed=fjord&t=16.4&mode=fly&y=220&pitch=0.25&dist=30&yaw=-2' },
  ];
  for (const s of SHOTS) {
    await open(s.q);
    if (s.setup) { await page.evaluate(s.setup); await page.waitForTimeout(300); await waitReady(); }
    await page.waitForTimeout(400);
    const st = await page.evaluate(() => window.__ow.stats());
    const c = await census();
    const n = await pair(s.name);
    console.log(`${s.name}: ${(st.tris / 1e6).toFixed(2)} M tris, ${st.calls} calls | ${fmt(c)} | ${n} swapped`);
  }
}

// A forest edge with 1.2 km of open, lower ground in front of it.
const FIND = `(() => { const ow = window.__ow, g = ow.gen(), p0 = ow.body.pos; let best = null;
  const dens = (x, z) => { const h = g.height(x, z); return h > 2 ? g.forestDensity(x, z, h) : 0; };
  for (let z = -3000; z <= 3000; z += 100) for (let x = -3000; x <= 3000; x += 100) {
    const ex = Math.round(p0.x) + x, ez = Math.round(p0.z) + z, eh = g.height(ex, ez);
    if (eh < 3) continue;
    for (let a = 0; a < 6.28; a += 0.3927) {
      const ux = Math.cos(a), uz = Math.sin(a);
      let f = 0; for (let t = 30; t <= 270; t += 40) f += dens(ex + ux * t, ez + uz * t) / 7;
      if (f < 0.55) continue;
      let o = 0, ok = true, wet = 0;
      const ch = Math.max(g.height(ex - ux * 1200, ez - uz * 1200), 0) + 7;
      for (let t = 60; t <= 1200; t += 60) {
        const h = g.height(ex - ux * t, ez - uz * t);
        o += dens(ex - ux * t, ez - uz * t) / 20;
        if (h < 0) wet++;
        if (h > eh + 3 + (ch - eh - 3) * (t / 1200) - 1) ok = false;
      }
      if (!ok || o > 0.06) continue;
      const score = f - o * 4 - wet * 0.01;
      if (!best || score > best.score) best = { x: ex, z: ez, ux, uz, score, f, o, wet };
    } }
  return best; })()`;
let edge = null;
if (what.includes('edge') || what.includes('motion')) {
  const ef = kv('edge', null);
  await open(`seed=${seed}&t=10`);
  if (ef) edge = JSON.parse(fs.readFileSync(ef, 'utf8'));
  else {
    edge = await page.evaluate(FIND);
    if (!edge) { console.log('no forest edge found'); process.exit(1); }
    fs.writeFileSync(path.join(outDir, 'edge.json'), JSON.stringify(edge));
  }
  console.log('edge', JSON.stringify(edge));
}
/** Stand `d` m out from the edge, `up` m over the ground, looking at it. */
const stand = (d, up = 5, zoom = 9) => page.evaluate(([e, d, up, zoom]) => {
  const ow = window.__ow, x = e.x - e.ux * d, z = e.z - e.uz * d;
  ow.teleport(x, z);
  ow.setMode('fly', 0);
  ow.body.pos.y = Math.max(ow.height(x, z), 0) + up;
  ow.view(Math.atan2(-e.ux, -e.uz), 0.03, zoom);
}, [edge, d, up, zoom]);

if (what.includes('edge')) {
  for (const d of [300, 600, 1200]) {
    await stand(d);
    await page.waitForTimeout(400);
    await waitReady();
    await page.waitForTimeout(400);
    const c = await census();
    await pair(`edge-${d}`, true);
    console.log(`edge-${d}: ${fmt(c)}`);
  }
}

if (what.includes('motion')) {
  // name, start distance, the keys held, fly height (0: on foot), seconds, frames kept
  const RUNS = [
    { name: 'walk-in', d: 330, keys: ['KeyW'], secs: 40, n: 12 },
    { name: 'sprint-in', d: 700, keys: ['KeyW', 'ShiftLeft'], secs: 40, n: 12 },
    { name: 'sprint-out', d: 150, keys: ['KeyS', 'ShiftLeft'], secs: 40, n: 12 },
    { name: 'fly-in', d: 1500, keys: ['KeyW', 'ShiftLeft'], fly: 40, secs: 30, n: 16 },
    { name: 'fly-out', d: 100, keys: ['KeyS', 'ShiftLeft'], fly: 40, secs: 30, n: 16 },
  ];
  const only = kv('runs', null)?.split(',');
  for (const r of RUNS) {
    if (only && !only.includes(r.name)) continue;
    const dir = path.join(outDir, r.name);
    fs.mkdirSync(dir, { recursive: true });
    await page.evaluate(() => window.__ow.manual(false));
    await stand(r.d, r.fly ?? 0);
    if (!r.fly) await page.evaluate(() => window.__ow.setMode('walk'));
    await page.waitForTimeout(300);
    await waitReady();
    await page.evaluate(([keys, yaw]) => {
      const ow = window.__ow;
      ow.manual(true);
      ow.lockInput(yaw);
      for (const k of keys) window.dispatchEvent(new KeyboardEvent('keydown', { code: k }));
    }, [r.keys, Math.atan2(-edge.ux, -edge.uz)]);
    const per = Math.round((r.secs * 60) / r.n);
    let last = null;
    for (let i = 0; i <= r.n; i++) {
      // The land streams in on workers, which need real time: step a little, wait for them.
      if (i) for (let k = 0; k < per; k += 6) {
        await page.evaluate((n) => window.__ow.advance(n, 1 / 60), Math.min(6, per - k));
        if (await page.evaluate(() => window.__ow._terrain.busy)) await page.waitForTimeout(30);
      }
      await page.evaluate(() => window.__ow.advance(1, 1 / 60));
      const c = await census();
      const p = await page.evaluate(([e]) => { const b = window.__ow.body.pos; return (e.x - b.x) * e.ux + (e.z - b.z) * e.uz; }, [edge]);
      const f = String(i).padStart(2, '0');
      await page.screenshot({ path: path.join(dir, `${f}.png`) });
      await page.screenshot({ path: path.join(dir, `${f}-crop.png`), clip: CROP });
      // The same frame with the far trees as lod 2, to compare (imgdiff.mjs).
      await SWAP(2);
      await page.evaluate(() => window.__ow.advance(1, 0));
      await page.screenshot({ path: path.join(dir, `${f}-lod2.png`) });
      await SWAP(3);
      const key = JSON.stringify(c.by);
      console.log(`${r.name} ${f}: ${p.toFixed(0)} m out | ${fmt(c)}${last !== null && key !== last ? '   <- changed' : ''}`);
      last = key;
    }
    await page.evaluate((keys) => {
      for (const k of keys) window.dispatchEvent(new KeyboardEvent('keyup', { code: k }));
      window.__ow.lockInput(null);
      window.__ow.manual(false);
    }, r.keys);
  }
}

await browser.close();
server.close();
