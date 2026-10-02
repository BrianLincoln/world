// The mount's camera in dungeon 1, traced frame by frame:
//   node scripts/dungeon-cam.mjs [seed=hilda] [sprint] [yaw=0.9] [from:to ...]
// Frees and mounts the rockhopper, rides it along each leg (between two of
// `layout.at`'s places; `yaw` puts the camera that far round from straight
// behind, as it is once you've turned a corner) and prints how the camera behaved: its distance to
// the focus, how much that distance and the camera's height jump from frame
// to frame, how often the explorer is hidden, and the body's own height steps.
// Uses the build in dist/ (run `npx vite build` first).
import { chromium } from 'playwright';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const args = process.argv.slice(2);
const seed = args.find((a) => a.startsWith('seed='))?.slice(5) ?? 'hilda';
const sprint = args.includes('sprint');
/** The camera this far round from straight behind (rad): how it is after you've turned a corner. */
const off = +(args.find((a) => a.startsWith('yaw='))?.slice(4) ?? 0);
const legs = args.filter((a) => /^[a-zA-Z]+:[a-zA-Z]+$/.test(a)).map((a) => a.split(':'));
const server = http.createServer((req, res) => {
  const p = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  const f = path.join(root, 'dist', p === '/' ? 'index.html' : p);
  if (!fs.existsSync(f)) { res.writeHead(404); res.end(); return; }
  res.writeHead(200, { 'content-type': f.endsWith('.js') ? 'text/javascript' : f.endsWith('.html') ? 'text/html' : f.endsWith('.css') ? 'text/css' : 'application/octet-stream' });
  fs.createReadStream(f).pipe(res);
});
await new Promise((r) => server.listen(0, r));
const browser = await chromium.launch({ args: ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: 1600, height: 900 } });
page.on('pageerror', (e) => console.log('[pageerror]', e.message));
await page.goto(`http://localhost:${server.address().port}/?seed=${seed}&story=0&t=10&ui=0&capture=1&mobs=0&drak=0&fresh=1&dungeon=1`);
for (let i = 0; i < 160; i++) { if (await page.evaluate(() => window.__ow?.ready())) break; await page.waitForTimeout(250); }
await page.evaluate(() => { const ow = window.__ow; ow.manual(true); ow.advance(10); ow.dungeon().debugFree(); ow.advance(10); });
const run = async ([from, to]) => {
  const [x0, z0, x1, z1] = await page.evaluate(([from, to]) => { const at = window.__ow.dungeon().layout.at; return [...at[from], ...at[to]]; }, [from, to]);
  await page.evaluate(([x0, z0, x1, z1, off]) => {
    const ow = window.__ow, d = ow.dungeon();
    const a = d.world(x0, d.layout.floor(x0, z0), z0), b = d.world(x1, 0, z1);
    const g = d.goat;
    g.pos.copy(a); ow._body.pos.copy(a); ow._body.vel.set(0, 0, 0);
    if (!ow.riding()) ow.mountNearest();
    ow._body.pos.copy(a);
    const yaw = Math.atan2(b.x - a.x, b.z - a.z);
    ow._body.heading = yaw;
    ow.lockInput(yaw + Math.PI);
    // (At whatever zoom the game has left the camera: mounting used to push it out to 12 m.)
    ow.view(yaw + Math.PI + off, 0.14, ow._orbit.targetDistance);
    ow.advance(30);
  }, [x0, z0, x1, z1, off]);
  const len = Math.hypot(x1 - x0, z1 - z0);
  await page.keyboard.down('KeyW');
  if (sprint) await page.keyboard.down('ShiftLeft');
  const rows = [];
  for (let f = 0; f < 900; f++) {
    const r = await page.evaluate(([x0, z0]) => {
      const ow = window.__ow, d = ow.dungeon();
      ow.advance(1);
      const b = ow._body, c = ow._cam.position, o = ow._orbit;
      const dx = b.pos.x - d.origin.x, dz = b.pos.z - d.origin.z, cs = Math.cos(d.facing), sn = Math.sin(d.facing);
      const lx = dx * cs + dz * sn, lz = -dx * sn + dz * cs;
      return { gone: Math.hypot(lx - x0, lz - z0), by: b.pos.y, cy: c.y, cd: Math.hypot(c.x - o.target.x, c.y - o.target.y, c.z - o.target.z), want: o.distance, vis: true, fov: ow._cam.fov };
    }, [x0, z0]);
    rows.push(r);
    if (r.gone > len) break;
  }
  await page.keyboard.up('KeyW');
  if (sprint) await page.keyboard.up('ShiftLeft');
  const d = (k) => rows.slice(1).map((r, i) => Math.abs(r[k] - rows[i][k]));
  const max = (a) => Math.max(...a).toFixed(3), mean = (a) => (a.reduce((s, x) => s + x, 0) / a.length).toFixed(4);
  // Reversals: frames where the camera's distance changes direction (in, out, in): the shake itself.
  let flips = 0, last = 0;
  for (let i = 1; i < rows.length; i++) { const s = Math.sign(Math.round((rows[i].cd - rows[i - 1].cd) * 200)); if (s && last && s !== last) flips++; if (s) last = s; }
  const cds = rows.map((r) => r.cd);
  console.log(JSON.stringify({ leg: `${from}:${to}`, frames: rows.length, camDist: { min: Math.min(...cds).toFixed(2), max: Math.max(...cds).toFixed(2), wanted: rows[rows.length - 1].want.toFixed(1) }, distJump: { max: max(d('cd')), mean: mean(d('cd')) }, distReversals: flips, camYJump: { max: max(d('cy')), mean: mean(d('cy')) }, bodyYJump: { max: max(d('by')) }, fov: [Math.min(...rows.map((r) => r.fov)).toFixed(1), Math.max(...rows.map((r) => r.fov)).toFixed(1)] }));
};
for (const leg of legs.length ? legs : [['out', 'den'], ['den', 'balcony'], ['fork', 'ledge'], ['fork', 'cavern'], ['kink', 'cavern']]) await run(leg);
await browser.close(); server.close();
