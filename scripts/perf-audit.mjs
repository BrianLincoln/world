// Where the frame goes: node scripts/perf-audit.mjs [--only a,b] [--quick] [--json out.json]
// Needs `npx vite build` first. Stands still in several places and seeds and,
// for each, prints:
//   - draw calls and triangles by pass (shadow mask, G-buffer, fullscreen) and
//     by kind (ground, water, each prop kind and LOD, casters, the rest),
//   - the frame time uncapped (median of rAF intervals), and again with one
//     thing switched off at a time (props, each prop kind, ground, the shadow
//     pass, half resolution, FXAA, layer fog, outlines): the difference is
//     what that thing costs,
//   - main-thread time: a whole frame() by hand, and one without drawing.
// Changes nothing in the game; `Q='&mobs=0'` adds URL params as in shots.mjs.
import { chromium } from 'playwright';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const args = process.argv.slice(2);
const flag = (f) => args.includes(f);
const opt = (f, d) => (args.includes(f) ? args[args.indexOf(f) + 1] : d);

const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png' };
const server = http.createServer((req, res) => {
  const p = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  const f = path.join(root, opt('--dist', 'dist'), p === '/' ? 'index.html' : p);
  if (!fs.existsSync(f)) { res.writeHead(404); res.end(); return; }
  res.writeHead(200, { 'content-type': types[path.extname(f)] ?? 'application/octet-stream' });
  fs.createReadStream(f).pipe(res);
});
await new Promise((r) => server.listen(0, r));
const port = server.address().port;

// Stand in the thickest forest within 2 km of the start.
const FOREST = `(() => { const ow = window.__ow, g = ow.gen(); const cx = Math.round(ow._cam.position.x), cz = Math.round(ow._cam.position.z);
  let best = -1, bx = cx, bz = cz;
  for (let z = -2000; z <= 2000; z += 100) for (let x = -2000; x <= 2000; x += 100) {
    let a = 0; for (const [ox, oz] of [[0,0],[80,0],[-80,0],[0,80],[0,-80]]) { const h = g.height(cx+x+ox, cz+z+oz); a += h > 2 ? g.forestDensity(cx+x+ox, cz+z+oz, h) : 0; }
    if (a > best) { best = a; bx = cx + x; bz = cz + z; } }
  ow.teleport(bx, bz); return [bx, bz, best / 5]; })()`;

const PLACES = [
  { name: 'start-hilda', q: 'seed=hilda&t=10' },
  { name: 'start-42', q: 'seed=42&t=10' },
  { name: 'start-fjord', q: 'seed=fjord&t=10' },
  { name: 'forest-hilda', q: 'seed=hilda&t=10', setup: FOREST },
  { name: 'forest-42', q: 'seed=42&t=10', setup: FOREST },
  { name: 'vista-hilda', q: 'seed=hilda&t=9.8&pitch=0.04&dist=9', setup: 'window.__ow.facePeak()' },
  { name: 'high-hilda', q: 'seed=hilda&t=10&mode=fly&y=140&pitch=0.22&dist=30&yaw=2.6' },
  { name: 'high-fjord', q: 'seed=fjord&t=16.4&mode=fly&y=220&pitch=0.25&dist=30&yaw=-2' },
  { name: 'night-hilda', q: 'seed=hilda&t=23&yaw=1.0' },
];
const only = opt('--only', null)?.split(',');

const browser = await chromium.launch({
  args: ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist', '--disable-gpu-vsync', '--disable-frame-rate-limit'],
});
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

/**
 * Frame cost with the GPU's work waited for: frames stepped by hand, each
 * followed by a one-pixel readPixels (gl.finish() doesn't wait in Chrome). (rAF intervals uncapped turned out to measure the
 * compositor as much as the game: the same view read 4.7 or 13 ms depending
 * on whether the canvas had just been resized.) `raf` is that interval, for
 * comparison with shots.mjs --perf.
 */
const frameTime = (ms = 600, raf = false) => page.evaluate(([ms, raf]) => raf ? new Promise((resolve) => {
  const t = [];
  let last = performance.now();
  const t0 = last;
  const tick = () => {
    const now = performance.now();
    t.push(now - last);
    last = now;
    if (now - t0 < ms) requestAnimationFrame(tick);
    else { t.sort((a, b) => a - b); resolve({ med: t[t.length >> 1], lo: t[Math.floor(t.length * 0.1)] }); }
  };
  requestAnimationFrame(tick);
}) : (() => {
  const ow = window.__ow, gl = ow._r.getContext(), t = [], px = new Uint8Array(4);
  const wait = () => { gl.bindFramebuffer(gl.FRAMEBUFFER, null); gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px); };
  ow.manual(true);
  for (let i = 0; i < 6; i++) { ow.advance(1, 1 / 60); wait(); }
  const t0 = performance.now();
  while (performance.now() - t0 < ms) { const a = performance.now(); ow.advance(1, 1 / 60); wait(); t.push(performance.now() - a); }
  ow.manual(false);
  t.sort((a, b) => a - b);
  return { med: t[t.length >> 1], lo: t[Math.floor(t.length * 0.1)] };
})(), [ms, raf]);

/** One frame's draws, by pass and kind. */
const census = () => page.evaluate(() => new Promise((resolve) => {
  const ow = window.__ow, r = ow._r, terrainRoot = ow._terrain.root;
  const out = {};
  const origDirect = r.renderBufferDirect, origRender = r.render;
  let pass = '?', frames = 0;
  r.render = function (scene, camera) {
    if (scene === terrainRoot) frames++;
    pass = camera.isOrthographicCamera ? (scene === terrainRoot ? 'shadow' : 'fullscreen') : (r.getRenderTarget() === ow._p.gbuf ? 'gbuf' : 'overlay');
    return origRender.apply(this, arguments);
  };
  r.renderBufferDirect = function (camera, scene, geometry, material, object) {
    let kind = object.name || material.name || object.type;
    let inTerrain = false;
    for (let o = object; o; o = o.parent) if (o === terrainRoot) inTerrain = true;
    if (inTerrain && object.userData.lod && object.userData.lod !== 'caster') kind += ':' + object.userData.lod;
    if (inTerrain && geometry.isInstancedBufferGeometry && !object.userData.lod) kind += ':far';
    if (!inTerrain && pass === 'gbuf') {
      let top = object; while (top.parent && top.parent !== scene) top = top.parent;
      kind = 'other:' + (top.name || '#' + scene.children.indexOf(top)) + (top !== object && object.name ? '/' + object.name : '') + (object.isInstancedMesh || geometry.isInstancedBufferGeometry ? ' (inst)' : '');
    }
    const key = pass + ' ' + kind;
    const e = (out[key] ??= { calls: 0, tris: 0, inst: 0 });
    const n = (geometry.index ? geometry.index.count : geometry.attributes.position.count) / 3;
    const k = geometry.isInstancedBufferGeometry ? geometry.instanceCount : (object.isInstancedMesh ? object.count : 1);
    e.calls++; e.tris += n * k; e.inst += k;
    return origDirect.apply(this, arguments);
  };
  requestAnimationFrame(() => requestAnimationFrame(() => {
    r.renderBufferDirect = origDirect; r.render = origRender;
    for (const e of Object.values(out)) { e.calls /= frames; e.tris /= frames; e.inst /= frames; }
    // The prop meshes that exist in the drawn nodes (before frustum culling).
    resolve({ draws: out, kinds: ow._terrain.kindStats(), info: { calls: r.info.render.calls, tris: r.info.render.triangles }, nodes: ow._terrain.stats.nodes });
  }));
}));

/** Main-thread ms: a whole frame, and a frame without its drawing. */
const cpu = () => page.evaluate(() => {
  const ow = window.__ow;
  ow.manual(true);
  for (let i = 0; i < 10; i++) ow.advance(1, 1 / 60);
  let t0 = performance.now();
  for (let i = 0; i < 60; i++) ow.advance(1, 1 / 60);
  const full = (performance.now() - t0) / 60;
  t0 = performance.now();
  ow.advance(61, 1 / 60);
  const noDraw = (performance.now() - t0 - full) / 60;
  ow.manual(false);
  return { full, noDraw };
});

// One thing off at a time. `on` / `off` run in the page.
const KINDS = ['trees', 'bushes', 'rocks', 'tufts', 'flowers', 'cabins'];
const mat = (k, v) => `(() => { const K = window.__ow._terrain.kinds.${k}; K.material.visible = ${v}; if (K.caster) K.caster.material.visible = ${v}; })()`;
const TOGGLES = [
  { name: 'no props (and their casters)', off: 'window.__ow._terrain.settings.showProps = false', on: 'window.__ow._terrain.settings.showProps = true' },
  ...(flag('--quick') ? [] : KINDS.map((k) => ({ name: `no ${k}`, off: mat(k, false), on: mat(k, true) }))),
  { name: 'no ground or water', off: 'window.__ow._terrain.settings.showGround = false', on: 'window.__ow._terrain.settings.showGround = true' },
  { name: 'no shadow pass', off: 'window.__ow._shadow.shed = true', on: 'window.__ow._shadow.shed = false' },
  { name: 'half resolution', off: 'window.__ow.post.renderScale = 0.5', on: 'window.__ow.post.renderScale = 1' },
  { name: 'no fxaa', off: 'window.__ow.post.fxaa = false', on: 'window.__ow.post.fxaa = true' },
  { name: 'no layer fog', off: 'window.__ow.post.layeredFog = false', on: 'window.__ow.post.layeredFog = true' },
  { name: 'no outlines', off: 'window.__ow.post.outline = false', on: 'window.__ow.post.outline = true' },
];

const results = [];
for (const s of PLACES) {
  if (only && !only.includes(s.name)) continue;
  await page.goto(`http://localhost:${port}/?${s.q}&ui=0&paused=1&capture=1${process.env.Q ?? ''}`);
  await page.waitForTimeout(500);
  await waitReady();
  let where = null;
  if (s.setup) { where = await page.evaluate(s.setup); await page.waitForTimeout(300); await waitReady(); }
  await page.waitForTimeout(500);
  const c = await census();
  // Other apps share this GPU (a game tab open in a browser doubles every
  // number), so each toggle is three rounds of on / off, and the best of
  // each is kept. `lo` is the 10th percentile of the rAF intervals.
  const ROUNDS = 2;
  let floor = Infinity;
  const tog = [];
  for (const g of flag('--counts') ? [] : TOGGLES) {
    let on = Infinity, off = Infinity;
    for (let k = 0; k < ROUNDS; k++) {
      const a = await frameTime(550);
      if (a.med > 0) on = Math.min(on, a.med);
      await page.evaluate(g.off);
      await page.waitForTimeout(100);
      const f = await frameTime(550);
      if (f.med > 0) off = Math.min(off, f.med);
      await page.evaluate(g.on);
      await page.waitForTimeout(100);
    }
    floor = Math.min(floor, on);
    tog.push({ name: g.name, lo: off, d: off - on, on });
  }
  const b = floor;
  const rafT = flag('--counts') ? { med: 0 } : await frameTime(1500, true);
  const t = flag('--counts') ? { full: 0, noDraw: 0 } : await cpu();

  console.log(`\n== ${s.name}${Array.isArray(where) ? ` at ${where.slice(0, 2).map((v) => v.toFixed(0))}` : ''}`);
  console.log(`frame ${b.toFixed(2)} ms waited for (rAF interval ${rafT.med.toFixed(2)}) | main thread ${t.full.toFixed(2)} ms, of which not drawing ${t.noDraw.toFixed(2)} | ${c.info.calls} calls, ${(c.info.tris / 1e6).toFixed(2)} M tris, ${c.nodes} nodes`);
  const rows = Object.entries(c.draws).sort((a, b2) => b2[1].calls - a[1].calls);
  const passes = {};
  for (const [k, v] of rows) { const p = (passes[k.split(' ')[0]] ??= { calls: 0, tris: 0 }); p.calls += v.calls; p.tris += v.tris; }
  console.log('passes: ' + Object.entries(passes).map(([k, v]) => `${k} ${v.calls} calls ${(v.tris / 1e6).toFixed(2)} M`).join(' | '));
  for (const [k, v] of rows) if (v.calls >= 2 || v.tris > 20000) console.log(`  ${k.padEnd(44)} ${v.calls.toFixed(0).padStart(4)} calls ${(v.tris / 1e6).toFixed(3).padStart(7)} M tris ${v.inst.toFixed(0).padStart(7)} inst`);
  console.log('  before culling: ' + Object.entries(c.kinds).map(([k, v]) => `${k} ${v.inst} inst ${(v.tris / 1e6).toFixed(2)} M`).join(' | '));
  for (const g of tog) console.log(`  ${g.name.padEnd(30)} ${g.lo.toFixed(2)} ms  (${(g.d >= 0 ? '+' : '') + g.d.toFixed(2)} from ${g.on.toFixed(2)})`);
  results.push({ name: s.name, where, frame: b, cpu: t, census: c, toggles: tog });
}
const json = opt('--json', null);
if (json) fs.writeFileSync(json, JSON.stringify(results, null, 1));

await browser.close();
server.close();
